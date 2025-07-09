/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from '../../../../base/common/path.js';
import { StringDecoder } from 'string_decoder';
import * as arrays from '../../../../base/common/arrays.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import * as glob from '../../../../base/common/glob.js';
import * as normalization from '../../../../base/common/normalization.js';
import { isEqualOrParent } from '../../../../base/common/extpath.js';
import * as platform from '../../../../base/common/platform.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import * as strings from '../../../../base/common/strings.js';
import * as types from '../../../../base/common/types.js';
import { Promises } from '../../../../base/node/pfs.js';
import { isFilePatternMatch, hasSiblingFn } from '../common/search.js';
import { spawnRipgrepCmd } from './ripgrepFileSearch.js';
import { prepareQuery } from '../../../../base/common/fuzzyScorer.js';
const killCmds = new Set();
process.on('exit', () => {
    killCmds.forEach(cmd => cmd());
});
export class FileWalker {
    constructor(config) {
        this.normalizedFilePatternLowercase = null;
        this.maxFilesize = null;
        this.isCanceled = false;
        this.fileWalkSW = null;
        this.cmdSW = null;
        this.cmdResultCount = 0;
        this.config = config;
        this.filePattern = config.filePattern || '';
        this.includePattern = config.includePattern && glob.parse(config.includePattern);
        this.maxResults = config.maxResults || null;
        this.exists = !!config.exists;
        this.walkedPaths = Object.create(null);
        this.resultCount = 0;
        this.isLimitHit = false;
        this.directoriesWalked = 0;
        this.filesWalked = 0;
        this.errors = [];
        if (this.filePattern) {
            this.normalizedFilePatternLowercase = config.shouldGlobMatchFilePattern ? null : prepareQuery(this.filePattern).normalizedLowercase;
        }
        this.globalExcludePattern = config.excludePattern && glob.parse(config.excludePattern);
        this.folderExcludePatterns = new Map();
        config.folderQueries.forEach(folderQuery => {
            const folderExcludeExpression = {}; // todo: consider exclude baseURI
            folderQuery.excludePattern?.forEach(excludePattern => {
                Object.assign(folderExcludeExpression, excludePattern.pattern || {}, this.config.excludePattern || {});
            });
            if (!folderQuery.excludePattern?.length) {
                Object.assign(folderExcludeExpression, this.config.excludePattern || {});
            }
            // Add excludes for other root folders
            const fqPath = folderQuery.folder.fsPath;
            config.folderQueries
                .map(rootFolderQuery => rootFolderQuery.folder.fsPath)
                .filter(rootFolder => rootFolder !== fqPath)
                .forEach(otherRootFolder => {
                // Exclude nested root folders
                if (isEqualOrParent(otherRootFolder, fqPath)) {
                    folderExcludeExpression[path.relative(fqPath, otherRootFolder)] = true;
                }
            });
            this.folderExcludePatterns.set(fqPath, new AbsoluteAndRelativeParsedExpression(folderExcludeExpression, fqPath));
        });
    }
    cancel() {
        this.isCanceled = true;
        killCmds.forEach(cmd => cmd());
    }
    walk(folderQueries, extraFiles, numThreads, onResult, onMessage, done) {
        this.fileWalkSW = StopWatch.create(false);
        // Support that the file pattern is a full path to a file that exists
        if (this.isCanceled) {
            return done(null, this.isLimitHit);
        }
        // For each extra file
        extraFiles.forEach(extraFilePath => {
            const basename = path.basename(extraFilePath.fsPath);
            if (this.globalExcludePattern && this.globalExcludePattern(extraFilePath.fsPath, basename)) {
                return; // excluded
            }
            // File: Check for match on file pattern and include pattern
            this.matchFile(onResult, { relativePath: extraFilePath.fsPath /* no workspace relative path */, searchPath: undefined });
        });
        this.cmdSW = StopWatch.create(false);
        // For each root folder
        this.parallel(folderQueries, (folderQuery, rootFolderDone) => {
            this.call(this.cmdTraversal, this, folderQuery, numThreads, onResult, onMessage, (err) => {
                if (err) {
                    const errorMessage = toErrorMessage(err);
                    console.error(errorMessage);
                    this.errors.push(errorMessage);
                    rootFolderDone(err, undefined);
                }
                else {
                    rootFolderDone(null, undefined);
                }
            });
        }, (errors, _result) => {
            this.fileWalkSW.stop();
            const err = errors ? arrays.coalesce(errors)[0] : null;
            done(err, this.isLimitHit);
        });
    }
    parallel(list, fn, callback) {
        const results = new Array(list.length);
        const errors = new Array(list.length);
        let didErrorOccur = false;
        let doneCount = 0;
        if (list.length === 0) {
            return callback(null, []);
        }
        list.forEach((item, index) => {
            fn(item, (error, result) => {
                if (error) {
                    didErrorOccur = true;
                    results[index] = null;
                    errors[index] = error;
                }
                else {
                    results[index] = result;
                    errors[index] = null;
                }
                if (++doneCount === list.length) {
                    return callback(didErrorOccur ? errors : null, results);
                }
            });
        });
    }
    call(fun, that, ...args) {
        try {
            fun.apply(that, args);
        }
        catch (e) {
            args[args.length - 1](e);
        }
    }
    cmdTraversal(folderQuery, numThreads, onResult, onMessage, cb) {
        const rootFolder = folderQuery.folder.fsPath;
        const isMac = platform.isMacintosh;
        const killCmd = () => cmd && cmd.kill();
        killCmds.add(killCmd);
        let done = (err) => {
            killCmds.delete(killCmd);
            done = () => { };
            cb(err);
        };
        let leftover = '';
        const tree = this.initDirectoryTree();
        const ripgrep = spawnRipgrepCmd(this.config, folderQuery, this.config.includePattern, this.folderExcludePatterns.get(folderQuery.folder.fsPath).expression, numThreads);
        const cmd = ripgrep.cmd;
        const noSiblingsClauses = !Object.keys(ripgrep.siblingClauses).length;
        const escapedArgs = ripgrep.rgArgs.args
            .map(arg => arg.match(/^-/) ? arg : `'${arg}'`)
            .join(' ');
        let rgCmd = `${ripgrep.rgDiskPath} ${escapedArgs}\n - cwd: ${ripgrep.cwd}`;
        if (ripgrep.rgArgs.siblingClauses) {
            rgCmd += `\n - Sibling clauses: ${JSON.stringify(ripgrep.rgArgs.siblingClauses)}`;
        }
        onMessage({ message: rgCmd });
        this.cmdResultCount = 0;
        this.collectStdout(cmd, 'utf8', onMessage, (err, stdout, last) => {
            if (err) {
                done(err);
                return;
            }
            if (this.isLimitHit) {
                done();
                return;
            }
            // Mac: uses NFD unicode form on disk, but we want NFC
            const normalized = leftover + (isMac ? normalization.normalizeNFC(stdout || '') : stdout);
            const relativeFiles = normalized.split('\n');
            if (last) {
                const n = relativeFiles.length;
                relativeFiles[n - 1] = relativeFiles[n - 1].trim();
                if (!relativeFiles[n - 1]) {
                    relativeFiles.pop();
                }
            }
            else {
                leftover = relativeFiles.pop() || '';
            }
            if (relativeFiles.length && relativeFiles[0].indexOf('\n') !== -1) {
                done(new Error('Splitting up files failed'));
                return;
            }
            this.cmdResultCount += relativeFiles.length;
            if (noSiblingsClauses) {
                for (const relativePath of relativeFiles) {
                    this.matchFile(onResult, { base: rootFolder, relativePath, searchPath: this.getSearchPath(folderQuery, relativePath) });
                    if (this.isLimitHit) {
                        killCmd();
                        break;
                    }
                }
                if (last || this.isLimitHit) {
                    done();
                }
                return;
            }
            // TODO: Optimize siblings clauses with ripgrep here.
            this.addDirectoryEntries(folderQuery, tree, rootFolder, relativeFiles, onResult);
            if (last) {
                this.matchDirectoryTree(tree, rootFolder, onResult);
                done();
            }
        });
    }
    /**
     * Public for testing.
     */
    spawnFindCmd(folderQuery) {
        const excludePattern = this.folderExcludePatterns.get(folderQuery.folder.fsPath);
        const basenames = excludePattern.getBasenameTerms();
        const pathTerms = excludePattern.getPathTerms();
        const args = ['-L', '.'];
        if (basenames.length || pathTerms.length) {
            args.push('-not', '(', '(');
            for (const basename of basenames) {
                args.push('-name', basename);
                args.push('-o');
            }
            for (const path of pathTerms) {
                args.push('-path', path);
                args.push('-o');
            }
            args.pop();
            args.push(')', '-prune', ')');
        }
        args.push('-type', 'f');
        return childProcess.spawn('find', args, { cwd: folderQuery.folder.fsPath });
    }
    /**
     * Public for testing.
     */
    readStdout(cmd, encoding, cb) {
        let all = '';
        this.collectStdout(cmd, encoding, () => { }, (err, stdout, last) => {
            if (err) {
                cb(err);
                return;
            }
            all += stdout;
            if (last) {
                cb(null, all);
            }
        });
    }
    collectStdout(cmd, encoding, onMessage, cb) {
        let onData = (err, stdout, last) => {
            if (err || last) {
                onData = () => { };
                this.cmdSW?.stop();
            }
            cb(err, stdout, last);
        };
        let gotData = false;
        if (cmd.stdout) {
            // Should be non-null, but #38195
            this.forwardData(cmd.stdout, encoding, onData);
            cmd.stdout.once('data', () => gotData = true);
        }
        else {
            onMessage({ message: 'stdout is null' });
        }
        let stderr;
        if (cmd.stderr) {
            // Should be non-null, but #38195
            stderr = this.collectData(cmd.stderr);
        }
        else {
            onMessage({ message: 'stderr is null' });
        }
        cmd.on('error', (err) => {
            onData(err);
        });
        cmd.on('close', (code) => {
            // ripgrep returns code=1 when no results are found
            let stderrText;
            if (!gotData && (stderrText = this.decodeData(stderr, encoding)) && rgErrorMsgForDisplay(stderrText)) {
                onData(new Error(`command failed with error code ${code}: ${this.decodeData(stderr, encoding)}`));
            }
            else {
                if (this.exists && code === 0) {
                    this.isLimitHit = true;
                }
                onData(null, '', true);
            }
        });
    }
    forwardData(stream, encoding, cb) {
        const decoder = new StringDecoder(encoding);
        stream.on('data', (data) => {
            cb(null, decoder.write(data));
        });
        return decoder;
    }
    collectData(stream) {
        const buffers = [];
        stream.on('data', (data) => {
            buffers.push(data);
        });
        return buffers;
    }
    decodeData(buffers, encoding) {
        const decoder = new StringDecoder(encoding);
        return buffers.map(buffer => decoder.write(buffer)).join('');
    }
    initDirectoryTree() {
        const tree = {
            rootEntries: [],
            pathToEntries: Object.create(null)
        };
        tree.pathToEntries['.'] = tree.rootEntries;
        return tree;
    }
    addDirectoryEntries(folderQuery, { pathToEntries }, base, relativeFiles, onResult) {
        // Support relative paths to files from a root resource (ignores excludes)
        if (relativeFiles.indexOf(this.filePattern) !== -1) {
            this.matchFile(onResult, {
                base,
                relativePath: this.filePattern,
                searchPath: this.getSearchPath(folderQuery, this.filePattern)
            });
        }
        const add = (relativePath) => {
            const basename = path.basename(relativePath);
            const dirname = path.dirname(relativePath);
            let entries = pathToEntries[dirname];
            if (!entries) {
                entries = pathToEntries[dirname] = [];
                add(dirname);
            }
            entries.push({
                base,
                relativePath,
                basename,
                searchPath: this.getSearchPath(folderQuery, relativePath),
            });
        };
        relativeFiles.forEach(add);
    }
    matchDirectoryTree({ rootEntries, pathToEntries }, rootFolder, onResult) {
        const self = this;
        const excludePattern = this.folderExcludePatterns.get(rootFolder);
        const filePattern = this.filePattern;
        function matchDirectory(entries) {
            self.directoriesWalked++;
            const hasSibling = hasSiblingFn(() => entries.map(entry => entry.basename));
            for (let i = 0, n = entries.length; i < n; i++) {
                const entry = entries[i];
                const { relativePath, basename } = entry;
                // Check exclude pattern
                // If the user searches for the exact file name, we adjust the glob matching
                // to ignore filtering by siblings because the user seems to know what they
                // are searching for and we want to include the result in that case anyway
                if (excludePattern.test(relativePath, basename, filePattern !== basename ? hasSibling : undefined)) {
                    continue;
                }
                const sub = pathToEntries[relativePath];
                if (sub) {
                    matchDirectory(sub);
                }
                else {
                    self.filesWalked++;
                    if (relativePath === filePattern) {
                        continue; // ignore file if its path matches with the file pattern because that is already matched above
                    }
                    self.matchFile(onResult, entry);
                }
                if (self.isLimitHit) {
                    break;
                }
            }
        }
        matchDirectory(rootEntries);
    }
    getStats() {
        return {
            cmdTime: this.cmdSW.elapsed(),
            fileWalkTime: this.fileWalkSW.elapsed(),
            directoriesWalked: this.directoriesWalked,
            filesWalked: this.filesWalked,
            cmdResultCount: this.cmdResultCount
        };
    }
    doWalk(folderQuery, relativeParentPath, files, onResult, done) {
        const rootFolder = folderQuery.folder;
        // Execute tasks on each file in parallel to optimize throughput
        const hasSibling = hasSiblingFn(() => files);
        this.parallel(files, (file, clb) => {
            // Check canceled
            if (this.isCanceled || this.isLimitHit) {
                return clb(null);
            }
            // Check exclude pattern
            // If the user searches for the exact file name, we adjust the glob matching
            // to ignore filtering by siblings because the user seems to know what they
            // are searching for and we want to include the result in that case anyway
            const currentRelativePath = relativeParentPath ? [relativeParentPath, file].join(path.sep) : file;
            if (this.folderExcludePatterns.get(folderQuery.folder.fsPath).test(currentRelativePath, file, this.config.filePattern !== file ? hasSibling : undefined)) {
                return clb(null);
            }
            // Use lstat to detect links
            const currentAbsolutePath = [rootFolder.fsPath, currentRelativePath].join(path.sep);
            fs.lstat(currentAbsolutePath, (error, lstat) => {
                if (error || this.isCanceled || this.isLimitHit) {
                    return clb(null);
                }
                // If the path is a link, we must instead use fs.stat() to find out if the
                // link is a directory or not because lstat will always return the stat of
                // the link which is always a file.
                this.statLinkIfNeeded(currentAbsolutePath, lstat, (error, stat) => {
                    if (error || this.isCanceled || this.isLimitHit) {
                        return clb(null);
                    }
                    // Directory: Follow directories
                    if (stat.isDirectory()) {
                        this.directoriesWalked++;
                        // to really prevent loops with links we need to resolve the real path of them
                        return this.realPathIfNeeded(currentAbsolutePath, lstat, (error, realpath) => {
                            if (error || this.isCanceled || this.isLimitHit) {
                                return clb(null);
                            }
                            realpath = realpath || '';
                            if (this.walkedPaths[realpath]) {
                                return clb(null); // escape when there are cycles (can happen with symlinks)
                            }
                            this.walkedPaths[realpath] = true; // remember as walked
                            // Continue walking
                            return Promises.readdir(currentAbsolutePath).then(children => {
                                if (this.isCanceled || this.isLimitHit) {
                                    return clb(null);
                                }
                                this.doWalk(folderQuery, currentRelativePath, children, onResult, err => clb(err || null));
                            }, error => {
                                clb(null);
                            });
                        });
                    }
                    // File: Check for match on file pattern and include pattern
                    else {
                        this.filesWalked++;
                        if (currentRelativePath === this.filePattern) {
                            return clb(null, undefined); // ignore file if its path matches with the file pattern because checkFilePatternRelativeMatch() takes care of those
                        }
                        if (this.maxFilesize && types.isNumber(stat.size) && stat.size > this.maxFilesize) {
                            return clb(null, undefined); // ignore file if max file size is hit
                        }
                        this.matchFile(onResult, {
                            base: rootFolder.fsPath,
                            relativePath: currentRelativePath,
                            searchPath: this.getSearchPath(folderQuery, currentRelativePath),
                        });
                    }
                    // Unwind
                    return clb(null, undefined);
                });
            });
        }, (error) => {
            const filteredErrors = error ? arrays.coalesce(error) : error; // find any error by removing null values first
            return done(filteredErrors && filteredErrors.length > 0 ? filteredErrors[0] : undefined);
        });
    }
    matchFile(onResult, candidate) {
        if (this.isFileMatch(candidate) && (!this.includePattern || this.includePattern(candidate.relativePath, path.basename(candidate.relativePath)))) {
            this.resultCount++;
            if (this.exists || (this.maxResults && this.resultCount > this.maxResults)) {
                this.isLimitHit = true;
            }
            if (!this.isLimitHit) {
                onResult(candidate);
            }
        }
    }
    isFileMatch(candidate) {
        // Check for search pattern
        if (this.filePattern) {
            if (this.filePattern === '*') {
                return true; // support the all-matching wildcard
            }
            if (this.normalizedFilePatternLowercase) {
                return isFilePatternMatch(candidate, this.normalizedFilePatternLowercase);
            }
            else if (this.filePattern) {
                return isFilePatternMatch(candidate, this.filePattern, false);
            }
        }
        // No patterns means we match all
        return true;
    }
    statLinkIfNeeded(path, lstat, clb) {
        if (lstat.isSymbolicLink()) {
            return fs.stat(path, clb); // stat the target the link points to
        }
        return clb(null, lstat); // not a link, so the stat is already ok for us
    }
    realPathIfNeeded(path, lstat, clb) {
        if (lstat.isSymbolicLink()) {
            return fs.realpath(path, (error, realpath) => {
                if (error) {
                    return clb(error);
                }
                return clb(null, realpath);
            });
        }
        return clb(null, path);
    }
    /**
     * If we're searching for files in multiple workspace folders, then better prepend the
     * name of the workspace folder to the path of the file. This way we'll be able to
     * better filter files that are all on the top of a workspace folder and have all the
     * same name. A typical example are `package.json` or `README.md` files.
     */
    getSearchPath(folderQuery, relativePath) {
        if (folderQuery.folderName) {
            return path.join(folderQuery.folderName, relativePath);
        }
        return relativePath;
    }
}
export class Engine {
    constructor(config, numThreads) {
        this.folderQueries = config.folderQueries;
        this.extraFiles = config.extraFileResources || [];
        this.numThreads = numThreads;
        this.walker = new FileWalker(config);
    }
    search(onResult, onProgress, done) {
        this.walker.walk(this.folderQueries, this.extraFiles, this.numThreads, onResult, onProgress, (err, isLimitHit) => {
            done(err, {
                limitHit: isLimitHit,
                stats: this.walker.getStats(),
                messages: [],
            });
        });
    }
    cancel() {
        this.walker.cancel();
    }
}
/**
 * This class exists to provide one interface on top of two ParsedExpressions, one for absolute expressions and one for relative expressions.
 * The absolute and relative expressions don't "have" to be kept separate, but this keeps us from having to path.join every single
 * file searched, it's only used for a text search with a searchPath
 */
class AbsoluteAndRelativeParsedExpression {
    constructor(expression, root) {
        this.expression = expression;
        this.root = root;
        this.init(expression);
    }
    /**
     * Split the IExpression into its absolute and relative components, and glob.parse them separately.
     */
    init(expr) {
        let absoluteGlobExpr;
        let relativeGlobExpr;
        Object.keys(expr)
            .filter(key => expr[key])
            .forEach(key => {
            if (path.isAbsolute(key)) {
                absoluteGlobExpr = absoluteGlobExpr || glob.getEmptyExpression();
                absoluteGlobExpr[key] = expr[key];
            }
            else {
                relativeGlobExpr = relativeGlobExpr || glob.getEmptyExpression();
                relativeGlobExpr[key] = expr[key];
            }
        });
        this.absoluteParsedExpr = absoluteGlobExpr && glob.parse(absoluteGlobExpr, { trimForExclusions: true });
        this.relativeParsedExpr = relativeGlobExpr && glob.parse(relativeGlobExpr, { trimForExclusions: true });
    }
    test(_path, basename, hasSibling) {
        return (this.relativeParsedExpr && this.relativeParsedExpr(_path, basename, hasSibling)) ||
            (this.absoluteParsedExpr && this.absoluteParsedExpr(path.join(this.root, _path), basename, hasSibling));
    }
    getBasenameTerms() {
        const basenameTerms = [];
        if (this.absoluteParsedExpr) {
            basenameTerms.push(...glob.getBasenameTerms(this.absoluteParsedExpr));
        }
        if (this.relativeParsedExpr) {
            basenameTerms.push(...glob.getBasenameTerms(this.relativeParsedExpr));
        }
        return basenameTerms;
    }
    getPathTerms() {
        const pathTerms = [];
        if (this.absoluteParsedExpr) {
            pathTerms.push(...glob.getPathTerms(this.absoluteParsedExpr));
        }
        if (this.relativeParsedExpr) {
            pathTerms.push(...glob.getPathTerms(this.relativeParsedExpr));
        }
        return pathTerms;
    }
}
function rgErrorMsgForDisplay(msg) {
    const lines = msg.trim().split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.startsWith('Error parsing regex')) {
        return firstLine;
    }
    if (firstLine.startsWith('regex parse error')) {
        return strings.uppercaseFirstLetter(lines[lines.length - 1].trim());
    }
    if (firstLine.startsWith('error parsing glob') ||
        firstLine.startsWith('unsupported encoding')) {
        // Uppercase first letter
        return firstLine.charAt(0).toUpperCase() + firstLine.substr(1);
    }
    if (firstLine === `Literal '\\n' not allowed.`) {
        // I won't localize this because none of the Ripgrep error messages are localized
        return `Literal '\\n' currently not supported`;
    }
    if (firstLine.startsWith('Literal ')) {
        // Other unsupported chars
        return firstLine;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL25vZGUvZmlsZVNlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssWUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM5QyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMvQyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sS0FBSyxhQUFhLE1BQU0sMENBQTBDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3JFLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEQsT0FBTyxFQUFzSCxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMzTCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdD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