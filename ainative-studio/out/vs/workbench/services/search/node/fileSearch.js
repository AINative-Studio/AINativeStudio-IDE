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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvbm9kZS9maWxlU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxZQUFZLE1BQU0sZUFBZSxDQUFDO0FBQzlDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFFeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQy9DLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxLQUFLLGFBQWEsTUFBTSwwQ0FBMEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RCxPQUFPLEVBQXNILGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzNMLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NB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