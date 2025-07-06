"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repository = exports.GitStatusParser = exports.Git = exports.GitError = void 0;
exports.findGit = findGit;
exports.parseGitmodules = parseGitmodules;
exports.parseGitRemotes = parseGitRemotes;
exports.parseGitCommits = parseGitCommits;
exports.parseLsTree = parseLsTree;
exports.parseLsFiles = parseLsFiles;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const cp = __importStar(require("child_process"));
const url_1 = require("url");
const which_1 = __importDefault(require("which"));
const events_1 = require("events");
const filetype = __importStar(require("file-type"));
const util_1 = require("./util");
const vscode_1 = require("vscode");
const byline = __importStar(require("byline"));
const string_decoder_1 = require("string_decoder");
// https://github.com/microsoft/vscode/issues/65693
const MAX_CLI_LENGTH = 30000;
function parseVersion(raw) {
    return raw.replace(/^git version /, '');
}
function findSpecificGit(path, onValidate) {
    return new Promise((c, e) => {
        if (!onValidate(path)) {
            return e(new Error(`Path "${path}" is invalid.`));
        }
        const buffers = [];
        const child = cp.spawn(path, ['--version']);
        child.stdout.on('data', (b) => buffers.push(b));
        child.on('error', cpErrorHandler(e));
        child.on('close', code => code ? e(new Error(`Not found. Code: ${code}`)) : c({ path, version: parseVersion(Buffer.concat(buffers).toString('utf8').trim()) }));
    });
}
function findGitDarwin(onValidate) {
    return new Promise((c, e) => {
        cp.exec('which git', (err, gitPathBuffer) => {
            if (err) {
                return e(new Error(`Executing "which git" failed: ${err.message}`));
            }
            const path = gitPathBuffer.toString().trim();
            function getVersion(path) {
                if (!onValidate(path)) {
                    return e(new Error(`Path "${path}" is invalid.`));
                }
                // make sure git executes
                cp.exec('git --version', (err, stdout) => {
                    if (err) {
                        return e(new Error(`Executing "git --version" failed: ${err.message}`));
                    }
                    return c({ path, version: parseVersion(stdout.trim()) });
                });
            }
            if (path !== '/usr/bin/git') {
                return getVersion(path);
            }
            // must check if XCode is installed
            cp.exec('xcode-select -p', (err) => {
                if (err && err.code === 2) {
                    // git is not installed, and launching /usr/bin/git
                    // will prompt the user to install it
                    return e(new Error('Executing "xcode-select -p" failed with error code 2.'));
                }
                getVersion(path);
            });
        });
    });
}
function findSystemGitWin32(base, onValidate) {
    if (!base) {
        return Promise.reject('Not found');
    }
    return findSpecificGit(path.join(base, 'Git', 'cmd', 'git.exe'), onValidate);
}
async function findGitWin32InPath(onValidate) {
    const path = await (0, which_1.default)('git.exe');
    return findSpecificGit(path, onValidate);
}
function findGitWin32(onValidate) {
    return findSystemGitWin32(process.env['ProgramW6432'], onValidate)
        .then(undefined, () => findSystemGitWin32(process.env['ProgramFiles(x86)'], onValidate))
        .then(undefined, () => findSystemGitWin32(process.env['ProgramFiles'], onValidate))
        .then(undefined, () => findSystemGitWin32(path.join(process.env['LocalAppData'], 'Programs'), onValidate))
        .then(undefined, () => findGitWin32InPath(onValidate));
}
async function findGit(hints, onValidate, logger) {
    for (const hint of hints) {
        try {
            return await findSpecificGit(hint, onValidate);
        }
        catch (err) {
            // noop
            logger.info(`Unable to find git on the PATH: "${hint}". Error: ${err.message}`);
        }
    }
    try {
        switch (process.platform) {
            case 'darwin': return await findGitDarwin(onValidate);
            case 'win32': return await findGitWin32(onValidate);
            default: return await findSpecificGit('git', onValidate);
        }
    }
    catch (err) {
        // noop
        logger.warn(`Unable to find git. Error: ${err.message}`);
    }
    throw new Error('Git installation not found.');
}
function cpErrorHandler(cb) {
    return err => {
        if (/ENOENT/.test(err.message)) {
            err = new GitError({
                error: err,
                message: 'Failed to execute git (ENOENT)',
                gitErrorCode: "NotAGitRepository" /* GitErrorCodes.NotAGitRepository */
            });
        }
        cb(err);
    };
}
async function exec(child, cancellationToken) {
    if (!child.stdout || !child.stderr) {
        throw new GitError({ message: 'Failed to get stdout or stderr from git process.' });
    }
    if (cancellationToken && cancellationToken.isCancellationRequested) {
        throw new vscode_1.CancellationError();
    }
    const disposables = [];
    const once = (ee, name, fn) => {
        ee.once(name, fn);
        disposables.push((0, util_1.toDisposable)(() => ee.removeListener(name, fn)));
    };
    const on = (ee, name, fn) => {
        ee.on(name, fn);
        disposables.push((0, util_1.toDisposable)(() => ee.removeListener(name, fn)));
    };
    let result = Promise.all([
        new Promise((c, e) => {
            once(child, 'error', cpErrorHandler(e));
            once(child, 'exit', c);
        }),
        new Promise(c => {
            const buffers = [];
            on(child.stdout, 'data', (b) => buffers.push(b));
            once(child.stdout, 'close', () => c(Buffer.concat(buffers)));
        }),
        new Promise(c => {
            const buffers = [];
            on(child.stderr, 'data', (b) => buffers.push(b));
            once(child.stderr, 'close', () => c(Buffer.concat(buffers).toString('utf8')));
        })
    ]);
    if (cancellationToken) {
        const cancellationPromise = new Promise((_, e) => {
            (0, util_1.onceEvent)(cancellationToken.onCancellationRequested)(() => {
                try {
                    child.kill();
                }
                catch (err) {
                    // noop
                }
                e(new vscode_1.CancellationError());
            });
        });
        result = Promise.race([result, cancellationPromise]);
    }
    try {
        const [exitCode, stdout, stderr] = await result;
        return { exitCode, stdout, stderr };
    }
    finally {
        (0, util_1.dispose)(disposables);
    }
}
class GitError extends Error {
    constructor(data) {
        super(data.error?.message || data.message || 'Git error');
        this.error = data.error;
        this.stdout = data.stdout;
        this.stderr = data.stderr;
        this.exitCode = data.exitCode;
        this.gitErrorCode = data.gitErrorCode;
        this.gitCommand = data.gitCommand;
        this.gitArgs = data.gitArgs;
    }
    toString() {
        let result = this.message + ' ' + JSON.stringify({
            exitCode: this.exitCode,
            gitErrorCode: this.gitErrorCode,
            gitCommand: this.gitCommand,
            stdout: this.stdout,
            stderr: this.stderr
        }, null, 2);
        if (this.error) {
            result += this.error.stack;
        }
        return result;
    }
}
exports.GitError = GitError;
function getGitErrorCode(stderr) {
    if (/Another git process seems to be running in this repository|If no other git process is currently running/.test(stderr)) {
        return "RepositoryIsLocked" /* GitErrorCodes.RepositoryIsLocked */;
    }
    else if (/Authentication failed/i.test(stderr)) {
        return "AuthenticationFailed" /* GitErrorCodes.AuthenticationFailed */;
    }
    else if (/Not a git repository/i.test(stderr)) {
        return "NotAGitRepository" /* GitErrorCodes.NotAGitRepository */;
    }
    else if (/bad config file/.test(stderr)) {
        return "BadConfigFile" /* GitErrorCodes.BadConfigFile */;
    }
    else if (/cannot make pipe for command substitution|cannot create standard input pipe/.test(stderr)) {
        return "CantCreatePipe" /* GitErrorCodes.CantCreatePipe */;
    }
    else if (/Repository not found/.test(stderr)) {
        return "RepositoryNotFound" /* GitErrorCodes.RepositoryNotFound */;
    }
    else if (/unable to access/.test(stderr)) {
        return "CantAccessRemote" /* GitErrorCodes.CantAccessRemote */;
    }
    else if (/branch '.+' is not fully merged/.test(stderr)) {
        return "BranchNotFullyMerged" /* GitErrorCodes.BranchNotFullyMerged */;
    }
    else if (/Couldn\'t find remote ref/.test(stderr)) {
        return "NoRemoteReference" /* GitErrorCodes.NoRemoteReference */;
    }
    else if (/A branch named '.+' already exists/.test(stderr)) {
        return "BranchAlreadyExists" /* GitErrorCodes.BranchAlreadyExists */;
    }
    else if (/'.+' is not a valid branch name/.test(stderr)) {
        return "InvalidBranchName" /* GitErrorCodes.InvalidBranchName */;
    }
    else if (/Please,? commit your changes or stash them/.test(stderr)) {
        return "DirtyWorkTree" /* GitErrorCodes.DirtyWorkTree */;
    }
    return undefined;
}
// https://github.com/microsoft/vscode/issues/89373
// https://github.com/git-for-windows/git/issues/2478
function sanitizePath(path) {
    return path.replace(/^([a-z]):\\/i, (_, letter) => `${letter.toUpperCase()}:\\`);
}
function sanitizeRelativePath(from, to) {
    return path.isAbsolute(to) ? (0, util_1.relativePath)(from, to).replace(/\\/g, '/') : to;
}
const COMMIT_FORMAT = '%H%n%aN%n%aE%n%at%n%ct%n%P%n%D%n%B';
const STASH_FORMAT = '%H%n%P%n%gd%n%gs';
class Git {
    get onOutput() { return this._onOutput; }
    constructor(options) {
        this.commandsToLog = [];
        this._onOutput = new events_1.EventEmitter();
        this.path = options.gitPath;
        this.version = options.version;
        this.userAgent = options.userAgent;
        this.env = options.env || {};
        const onConfigurationChanged = (e) => {
            if (e !== undefined && !e.affectsConfiguration('git.commandsToLog')) {
                return;
            }
            const config = vscode_1.workspace.getConfiguration('git');
            this.commandsToLog = config.get('commandsToLog', []);
        };
        vscode_1.workspace.onDidChangeConfiguration(onConfigurationChanged, this);
        onConfigurationChanged();
    }
    compareGitVersionTo(version) {
        return util_1.Versions.compare(util_1.Versions.fromString(this.version), util_1.Versions.fromString(version));
    }
    open(repositoryRoot, repositoryRootRealPath, dotGit, logger) {
        return new Repository(this, repositoryRoot, repositoryRootRealPath, dotGit, logger);
    }
    async init(repository, options = {}) {
        const args = ['init'];
        if (options.defaultBranch && options.defaultBranch !== '' && this.compareGitVersionTo('2.28.0') !== -1) {
            args.push('-b', options.defaultBranch);
        }
        await this.exec(repository, args);
    }
    async clone(url, options, cancellationToken) {
        const baseFolderName = decodeURI(url).replace(/[\/]+$/, '').replace(/^.*[\/\\]/, '').replace(/\.git$/, '') || 'repository';
        let folderName = baseFolderName;
        let folderPath = path.join(options.parentPath, folderName);
        let count = 1;
        while (count < 20 && await new Promise(c => (0, fs_1.exists)(folderPath, c))) {
            folderName = `${baseFolderName}-${count++}`;
            folderPath = path.join(options.parentPath, folderName);
        }
        await (0, util_1.mkdirp)(options.parentPath);
        const onSpawn = (child) => {
            const decoder = new string_decoder_1.StringDecoder('utf8');
            const lineStream = new byline.LineStream({ encoding: 'utf8' });
            child.stderr.on('data', (buffer) => lineStream.write(decoder.write(buffer)));
            let totalProgress = 0;
            let previousProgress = 0;
            lineStream.on('data', (line) => {
                let match = null;
                if (match = /Counting objects:\s*(\d+)%/i.exec(line)) {
                    totalProgress = Math.floor(parseInt(match[1]) * 0.1);
                }
                else if (match = /Compressing objects:\s*(\d+)%/i.exec(line)) {
                    totalProgress = 10 + Math.floor(parseInt(match[1]) * 0.1);
                }
                else if (match = /Receiving objects:\s*(\d+)%/i.exec(line)) {
                    totalProgress = 20 + Math.floor(parseInt(match[1]) * 0.4);
                }
                else if (match = /Resolving deltas:\s*(\d+)%/i.exec(line)) {
                    totalProgress = 60 + Math.floor(parseInt(match[1]) * 0.4);
                }
                if (totalProgress !== previousProgress) {
                    options.progress.report({ increment: totalProgress - previousProgress });
                    previousProgress = totalProgress;
                }
            });
        };
        try {
            const command = ['clone', url.includes(' ') ? encodeURI(url) : url, folderPath, '--progress'];
            if (options.recursive) {
                command.push('--recursive');
            }
            if (options.ref) {
                command.push('--branch', options.ref);
            }
            await this.exec(options.parentPath, command, {
                cancellationToken,
                env: { 'GIT_HTTP_USER_AGENT': this.userAgent },
                onSpawn,
            });
        }
        catch (err) {
            if (err.stderr) {
                err.stderr = err.stderr.replace(/^Cloning.+$/m, '').trim();
                err.stderr = err.stderr.replace(/^ERROR:\s+/, '').trim();
            }
            throw err;
        }
        return folderPath;
    }
    async getRepositoryRoot(pathInsidePossibleRepository) {
        const result = await this.exec(pathInsidePossibleRepository, ['rev-parse', '--show-toplevel']);
        // Keep trailing spaces which are part of the directory name
        const repositoryRootPath = path.normalize(result.stdout.trimStart().replace(/[\r\n]+$/, ''));
        // Handle symbolic links and UNC paths
        // Git 2.31 added the `--path-format` flag to rev-parse which
        // allows us to get the relative path of the repository root
        if (!(0, util_1.pathEquals)(pathInsidePossibleRepository, repositoryRootPath) &&
            !(0, util_1.isDescendant)(repositoryRootPath, pathInsidePossibleRepository) &&
            !(0, util_1.isDescendant)(pathInsidePossibleRepository, repositoryRootPath) &&
            this.compareGitVersionTo('2.31.0') !== -1) {
            const relativePathResult = await this.exec(pathInsidePossibleRepository, ['rev-parse', '--path-format=relative', '--show-toplevel',]);
            return path.resolve(pathInsidePossibleRepository, relativePathResult.stdout.trimStart().replace(/[\r\n]+$/, ''));
        }
        if (util_1.isWindows) {
            // On Git 2.25+ if you call `rev-parse --show-toplevel` on a mapped drive, instead of getting the mapped
            // drive path back, you get the UNC path for the mapped drive. So we will try to normalize it back to the
            // mapped drive path, if possible
            const repoUri = vscode_1.Uri.file(repositoryRootPath);
            const pathUri = vscode_1.Uri.file(pathInsidePossibleRepository);
            if (repoUri.authority.length !== 0 && pathUri.authority.length === 0) {
                const match = /^[\/]?([a-zA-Z])[:\/]/.exec(pathUri.path);
                if (match !== null) {
                    const [, letter] = match;
                    try {
                        const networkPath = await new Promise(resolve => fs_1.realpath.native(`${letter}:\\`, { encoding: 'utf8' }, (err, resolvedPath) => resolve(err !== null ? undefined : resolvedPath)));
                        if (networkPath !== undefined) {
                            // If the repository is at the root of the mapped drive then we
                            // have to append `\` (ex: D:\) otherwise the path is not valid.
                            const isDriveRoot = (0, util_1.pathEquals)(repoUri.fsPath, networkPath);
                            return path.normalize(repoUri.fsPath.replace(networkPath, `${letter.toLowerCase()}:${isDriveRoot || networkPath.endsWith('\\') ? '\\' : ''}`));
                        }
                    }
                    catch { }
                }
                return path.normalize(pathUri.fsPath);
            }
        }
        return repositoryRootPath;
    }
    async getRepositoryDotGit(repositoryPath) {
        const result = await this.exec(repositoryPath, ['rev-parse', '--git-dir', '--git-common-dir']);
        let [dotGitPath, commonDotGitPath] = result.stdout.split('\n').map(r => r.trim());
        if (!path.isAbsolute(dotGitPath)) {
            dotGitPath = path.join(repositoryPath, dotGitPath);
        }
        dotGitPath = path.normalize(dotGitPath);
        if (commonDotGitPath) {
            if (!path.isAbsolute(commonDotGitPath)) {
                commonDotGitPath = path.join(repositoryPath, commonDotGitPath);
            }
            commonDotGitPath = path.normalize(commonDotGitPath);
            return { path: dotGitPath, commonPath: commonDotGitPath !== dotGitPath ? commonDotGitPath : undefined };
        }
        return { path: dotGitPath };
    }
    async exec(cwd, args, options = {}) {
        options = (0, util_1.assign)({ cwd }, options || {});
        return await this._exec(args, options);
    }
    async exec2(args, options = {}) {
        return await this._exec(args, options);
    }
    stream(cwd, args, options = {}) {
        options = (0, util_1.assign)({ cwd }, options || {});
        const child = this.spawn(args, options);
        if (options.log !== false) {
            const startTime = Date.now();
            child.on('exit', (_) => {
                this.log(`> git ${args.join(' ')} [${Date.now() - startTime}ms]${child.killed ? ' (cancelled)' : ''}\n`);
            });
        }
        return child;
    }
    async _exec(args, options = {}) {
        const child = this.spawn(args, options);
        options.onSpawn?.(child);
        if (options.input) {
            child.stdin.end(options.input, 'utf8');
        }
        const startExec = Date.now();
        let bufferResult;
        try {
            bufferResult = await exec(child, options.cancellationToken);
        }
        catch (ex) {
            if (ex instanceof vscode_1.CancellationError) {
                this.log(`> git ${args.join(' ')} [${Date.now() - startExec}ms] (cancelled)\n`);
            }
            throw ex;
        }
        if (options.log !== false) {
            // command
            this.log(`> git ${args.join(' ')} [${Date.now() - startExec}ms]\n`);
            // stdout
            if (bufferResult.stdout.length > 0 && args.find(a => this.commandsToLog.includes(a))) {
                this.log(`${bufferResult.stdout}\n`);
            }
            // stderr
            if (bufferResult.stderr.length > 0) {
                this.log(`${bufferResult.stderr}\n`);
            }
        }
        const result = {
            exitCode: bufferResult.exitCode,
            stdout: bufferResult.stdout.toString('utf8'),
            stderr: bufferResult.stderr
        };
        if (bufferResult.exitCode) {
            return Promise.reject(new GitError({
                message: 'Failed to execute git',
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                gitErrorCode: getGitErrorCode(result.stderr),
                gitCommand: args[0],
                gitArgs: args
            }));
        }
        return result;
    }
    spawn(args, options = {}) {
        if (!this.path) {
            throw new Error('git could not be found in the system.');
        }
        if (!options) {
            options = {};
        }
        if (!options.stdio && !options.input) {
            options.stdio = ['ignore', null, null]; // Unless provided, ignore stdin and leave default streams for stdout and stderr
        }
        options.env = (0, util_1.assign)({}, process.env, this.env, options.env || {}, {
            VSCODE_GIT_COMMAND: args[0],
            LC_ALL: 'en_US.UTF-8',
            LANG: 'en_US.UTF-8',
            GIT_PAGER: 'cat'
        });
        const cwd = this.getCwd(options);
        if (cwd) {
            options.cwd = sanitizePath(cwd);
        }
        return cp.spawn(this.path, args, options);
    }
    getCwd(options) {
        const cwd = options.cwd;
        if (typeof cwd === 'undefined' || typeof cwd === 'string') {
            return cwd;
        }
        if (cwd.protocol === 'file:') {
            return (0, url_1.fileURLToPath)(cwd);
        }
        return undefined;
    }
    log(output) {
        this._onOutput.emit('log', output);
    }
    async mergeFile(options) {
        const args = ['merge-file', '-p', options.input1Path, options.basePath, options.input2Path];
        if (options.diff3) {
            args.push('--diff3');
        }
        else {
            args.push('--no-diff3');
        }
        try {
            const result = await this.exec(os.homedir(), args);
            return result.stdout;
        }
        catch (err) {
            if (typeof err.stdout === 'string') {
                // The merge had conflicts, stdout still contains the merged result (with conflict markers)
                return err.stdout;
            }
            else {
                throw err;
            }
        }
    }
    async addSafeDirectory(repositoryPath) {
        await this.exec(os.homedir(), ['config', '--global', '--add', 'safe.directory', repositoryPath]);
        return;
    }
}
exports.Git = Git;
class GitConfigParser {
    static parse(raw) {
        const config = { sections: [] };
        let section = { name: 'DEFAULT', properties: {} };
        const addSection = (section) => {
            if (!section) {
                return;
            }
            config.sections.push(section);
        };
        for (const line of raw.split(GitConfigParser._lineSeparator)) {
            // Section
            const sectionMatch = line.match(GitConfigParser._sectionRegex);
            if (sectionMatch?.length === 3) {
                addSection(section);
                section = { name: sectionMatch[1], subSectionName: sectionMatch[2]?.replaceAll('"', ''), properties: {} };
                continue;
            }
            // Property
            const propertyMatch = line.match(GitConfigParser._propertyRegex);
            if (propertyMatch?.length === 3 && !Object.keys(section.properties).includes(propertyMatch[1])) {
                section.properties[propertyMatch[1]] = propertyMatch[2];
            }
        }
        addSection(section);
        return config.sections;
    }
}
GitConfigParser._lineSeparator = /\r?\n/;
GitConfigParser._propertyRegex = /^\s*(\w+)\s*=\s*"?([^"]+)"?$/;
GitConfigParser._sectionRegex = /^\s*\[\s*([^\]]+?)\s*(\"[^"]+\")*\]\s*$/;
class GitStatusParser {
    constructor() {
        this.lastRaw = '';
        this.result = [];
    }
    get status() {
        return this.result;
    }
    update(raw) {
        let i = 0;
        let nextI;
        raw = this.lastRaw + raw;
        while ((nextI = this.parseEntry(raw, i)) !== undefined) {
            i = nextI;
        }
        this.lastRaw = raw.substr(i);
    }
    parseEntry(raw, i) {
        if (i + 4 >= raw.length) {
            return;
        }
        let lastIndex;
        const entry = {
            x: raw.charAt(i++),
            y: raw.charAt(i++),
            rename: undefined,
            path: ''
        };
        // space
        i++;
        if (entry.x === 'R' || entry.y === 'R' || entry.x === 'C') {
            lastIndex = raw.indexOf('\0', i);
            if (lastIndex === -1) {
                return;
            }
            entry.rename = raw.substring(i, lastIndex);
            i = lastIndex + 1;
        }
        lastIndex = raw.indexOf('\0', i);
        if (lastIndex === -1) {
            return;
        }
        entry.path = raw.substring(i, lastIndex);
        // If path ends with slash, it must be a nested git repo
        if (entry.path[entry.path.length - 1] !== '/') {
            this.result.push(entry);
        }
        return lastIndex + 1;
    }
}
exports.GitStatusParser = GitStatusParser;
function parseGitmodules(raw) {
    const result = [];
    for (const submoduleSection of GitConfigParser.parse(raw).filter(s => s.name === 'submodule')) {
        if (submoduleSection.subSectionName && submoduleSection.properties['path'] && submoduleSection.properties['url']) {
            result.push({
                name: submoduleSection.subSectionName,
                path: submoduleSection.properties['path'],
                url: submoduleSection.properties['url']
            });
        }
    }
    return result;
}
function parseGitRemotes(raw) {
    const remotes = [];
    for (const remoteSection of GitConfigParser.parse(raw).filter(s => s.name === 'remote')) {
        if (remoteSection.subSectionName) {
            remotes.push({
                name: remoteSection.subSectionName,
                fetchUrl: remoteSection.properties['url'],
                pushUrl: remoteSection.properties['pushurl'] ?? remoteSection.properties['url'],
                isReadOnly: false
            });
        }
    }
    return remotes;
}
const commitRegex = /([0-9a-f]{40})\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)(?:\n([^]*?))?(?:\x00)(?:\n((?:.*)files? changed(?:.*))$)?/gm;
function parseGitCommits(data) {
    const commits = [];
    let ref;
    let authorName;
    let authorEmail;
    let authorDate;
    let commitDate;
    let parents;
    let refNames;
    let message;
    let shortStat;
    let match;
    do {
        match = commitRegex.exec(data);
        if (match === null) {
            break;
        }
        [, ref, authorName, authorEmail, authorDate, commitDate, parents, refNames, message, shortStat] = match;
        if (message[message.length - 1] === '\n') {
            message = message.substr(0, message.length - 1);
        }
        // Stop excessive memory usage by using substr -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
        commits.push({
            hash: ` ${ref}`.substr(1),
            message: ` ${message}`.substr(1),
            parents: parents ? parents.split(' ') : [],
            authorDate: new Date(Number(authorDate) * 1000),
            authorName: ` ${authorName}`.substr(1),
            authorEmail: ` ${authorEmail}`.substr(1),
            commitDate: new Date(Number(commitDate) * 1000),
            refNames: refNames.split(',').map(s => s.trim()),
            shortStat: shortStat ? parseGitDiffShortStat(shortStat) : undefined
        });
    } while (true);
    return commits;
}
const diffShortStatRegex = /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/;
function parseGitDiffShortStat(data) {
    const matches = data.trim().match(diffShortStatRegex);
    if (!matches) {
        return { files: 0, insertions: 0, deletions: 0 };
    }
    const [, files, insertions = undefined, deletions = undefined] = matches;
    return { files: parseInt(files), insertions: parseInt(insertions ?? '0'), deletions: parseInt(deletions ?? '0') };
}
function parseLsTree(raw) {
    return raw.split('\n')
        .filter(l => !!l)
        .map(line => /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(line))
        .filter(m => !!m)
        .map(([, mode, type, object, size, file]) => ({ mode, type, object, size, file }));
}
function parseLsFiles(raw) {
    return raw.split('\n')
        .filter(l => !!l)
        .map(line => /^(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(line))
        .filter(m => !!m)
        .map(([, mode, object, stage, file]) => ({ mode, object, stage, file }));
}
const stashRegex = /([0-9a-f]{40})\n(.*)\nstash@{(\d+)}\n(WIP\s)*on([^:]+):(.*)(?:\x00)/gmi;
function parseGitStashes(raw) {
    const result = [];
    let match, hash, parents, index, wip, branchName, description;
    do {
        match = stashRegex.exec(raw);
        if (match === null) {
            break;
        }
        [, hash, parents, index, wip, branchName, description] = match;
        result.push({
            hash,
            parents: parents.split(' '),
            index: parseInt(index),
            branchName: branchName.trim(),
            description: wip ? `WIP (${description.trim()})` : description.trim()
        });
    } while (true);
    return result;
}
function parseGitChanges(repositoryRoot, raw) {
    let index = 0;
    const result = [];
    const segments = raw.trim().split('\x00').filter(s => s);
    segmentsLoop: while (index < segments.length - 1) {
        const change = segments[index++];
        const resourcePath = segments[index++];
        if (!change || !resourcePath) {
            break;
        }
        const originalUri = vscode_1.Uri.file(path.isAbsolute(resourcePath) ? resourcePath : path.join(repositoryRoot, resourcePath));
        let uri = originalUri;
        let renameUri = originalUri;
        let status = 7 /* Status.UNTRACKED */;
        // Copy or Rename status comes with a number (ex: 'R100').
        // We don't need the number, we use only first character of the status.
        switch (change[0]) {
            case 'A':
                status = 1 /* Status.INDEX_ADDED */;
                break;
            case 'M':
                status = 5 /* Status.MODIFIED */;
                break;
            case 'D':
                status = 6 /* Status.DELETED */;
                break;
            // Rename contains two paths, the second one is what the file is renamed/copied to.
            case 'R': {
                if (index >= segments.length) {
                    break;
                }
                const newPath = segments[index++];
                if (!newPath) {
                    break;
                }
                status = 3 /* Status.INDEX_RENAMED */;
                uri = renameUri = vscode_1.Uri.file(path.isAbsolute(newPath) ? newPath : path.join(repositoryRoot, newPath));
                break;
            }
            default:
                // Unknown status
                break segmentsLoop;
        }
        result.push({ status, uri, originalUri, renameUri });
    }
    return result;
}
function parseGitBlame(data) {
    const lineSeparator = /\r?\n/;
    const commitRegex = /^([0-9a-f]{40})/gm;
    const blameInformation = new Map();
    let commitHash = undefined;
    let authorName = undefined;
    let authorEmail = undefined;
    let authorTime = undefined;
    let message = undefined;
    let startLineNumber = undefined;
    let endLineNumber = undefined;
    for (const line of data.split(lineSeparator)) {
        // Commit
        const commitMatch = line.match(commitRegex);
        if (!commitHash && commitMatch) {
            const segments = line.split(' ');
            commitHash = commitMatch[0];
            startLineNumber = Number(segments[2]);
            endLineNumber = Number(segments[2]) + Number(segments[3]) - 1;
        }
        // Commit properties
        if (commitHash && line.startsWith('author ')) {
            authorName = line.substring('author '.length);
        }
        if (commitHash && line.startsWith('author-mail ')) {
            authorEmail = line.substring('author-mail <'.length, line.length - 1);
        }
        if (commitHash && line.startsWith('author-time ')) {
            authorTime = Number(line.substring('author-time '.length)) * 1000;
        }
        if (commitHash && line.startsWith('summary ')) {
            message = line.substring('summary '.length);
        }
        // Commit end
        if (commitHash && startLineNumber && endLineNumber && line.startsWith('filename ')) {
            const existingCommit = blameInformation.get(commitHash);
            if (existingCommit) {
                existingCommit.ranges.push({ startLineNumber, endLineNumber });
                blameInformation.set(commitHash, existingCommit);
            }
            else {
                blameInformation.set(commitHash, {
                    hash: commitHash, authorName, authorEmail, authorDate: authorTime, subject: message, ranges: [{ startLineNumber, endLineNumber }]
                });
            }
            commitHash = authorName = authorEmail = authorTime = message = startLineNumber = endLineNumber = undefined;
        }
    }
    return Array.from(blameInformation.values());
}
const REFS_FORMAT = '%(refname)%00%(objectname)%00%(*objectname)';
const REFS_WITH_DETAILS_FORMAT = `${REFS_FORMAT}%00%(parent)%00%(*parent)%00%(authorname)%00%(*authorname)%00%(committerdate:unix)%00%(*committerdate:unix)%00%(subject)%00%(*subject)`;
function parseRefs(data) {
    const refRegex = /^(refs\/[^\0]+)\0([0-9a-f]{40})\0([0-9a-f]{40})?(?:\0(.*))?$/gm;
    const headRegex = /^refs\/heads\/([^ ]+)$/;
    const remoteHeadRegex = /^refs\/remotes\/([^/]+)\/([^ ]+)$/;
    const tagRegex = /^refs\/tags\/([^ ]+)$/;
    const statusRegex = /\[(?:ahead ([0-9]+))?[,\s]*(?:behind ([0-9]+))?]|\[gone]/;
    let ref;
    let commitHash;
    let tagCommitHash;
    let details;
    let commitParents;
    let tagCommitParents;
    let commitSubject;
    let tagCommitSubject;
    let authorName;
    let tagAuthorName;
    let committerDate;
    let tagCommitterDate;
    let status;
    const refs = [];
    let match;
    let refMatch;
    do {
        match = refRegex.exec(data);
        if (match === null) {
            break;
        }
        [, ref, commitHash, tagCommitHash, details] = match;
        [commitParents, tagCommitParents, authorName, tagAuthorName, committerDate, tagCommitterDate, commitSubject, tagCommitSubject, status] = details?.split('\0') ?? [];
        const parents = tagCommitParents || commitParents;
        const subject = tagCommitSubject || commitSubject;
        const author = tagAuthorName || authorName;
        const date = tagCommitterDate || committerDate;
        const commitDetails = parents && subject && author && date
            ? {
                hash: commitHash,
                message: subject,
                parents: parents.split(' '),
                authorName: author,
                commitDate: date ? new Date(Number(date) * 1000) : undefined,
            } : undefined;
        if (refMatch = headRegex.exec(ref)) {
            const [, aheadCount, behindCount] = statusRegex.exec(status) ?? [];
            const ahead = status ? aheadCount ? Number(aheadCount) : 0 : undefined;
            const behind = status ? behindCount ? Number(behindCount) : 0 : undefined;
            refs.push({ name: refMatch[1], commit: commitHash, commitDetails, ahead, behind, type: 0 /* RefType.Head */ });
        }
        else if (refMatch = remoteHeadRegex.exec(ref)) {
            const name = `${refMatch[1]}/${refMatch[2]}`;
            refs.push({ name, remote: refMatch[1], commit: commitHash, commitDetails, type: 1 /* RefType.RemoteHead */ });
        }
        else if (refMatch = tagRegex.exec(ref)) {
            refs.push({ name: refMatch[1], commit: tagCommitHash ?? commitHash, commitDetails, type: 2 /* RefType.Tag */ });
        }
    } while (true);
    return refs;
}
class Repository {
    constructor(_git, repositoryRoot, repositoryRootRealPath, dotGit, logger) {
        this._git = _git;
        this.repositoryRoot = repositoryRoot;
        this.repositoryRootRealPath = repositoryRootRealPath;
        this.dotGit = dotGit;
        this.logger = logger;
        this._isUsingRefTable = false;
    }
    get git() {
        return this._git;
    }
    get root() {
        return this.repositoryRoot;
    }
    get rootRealPath() {
        return this.repositoryRootRealPath;
    }
    async exec(args, options = {}) {
        return await this.git.exec(this.repositoryRoot, args, options);
    }
    stream(args, options = {}) {
        return this.git.stream(this.repositoryRoot, args, options);
    }
    spawn(args, options = {}) {
        return this.git.spawn(args, options);
    }
    async config(command, scope, key, value = null, options = {}) {
        const args = ['config', `--${command}`];
        if (scope) {
            args.push(`--${scope}`);
        }
        args.push(key);
        if (value) {
            args.push(value);
        }
        try {
            const result = await this.exec(args, options);
            return result.stdout.trim();
        }
        catch (err) {
            this.logger.warn(`[Git][config] git config failed: ${err.message}`);
            return '';
        }
    }
    async getConfigs(scope) {
        const args = ['config'];
        if (scope) {
            args.push('--' + scope);
        }
        args.push('-l');
        const result = await this.exec(args);
        const lines = result.stdout.trim().split(/\r|\r\n|\n/);
        return lines.map(entry => {
            const equalsIndex = entry.indexOf('=');
            return { key: entry.substr(0, equalsIndex), value: entry.substr(equalsIndex + 1) };
        });
    }
    async log(options) {
        const spawnOptions = {};
        const args = ['log', `--format=${COMMIT_FORMAT}`, '-z'];
        if (options?.shortStats) {
            args.push('--shortstat');
            if (this._git.compareGitVersionTo('2.31') !== -1) {
                args.push('--diff-merges=first-parent');
            }
        }
        if (options?.reverse) {
            args.push('--reverse', '--ancestry-path');
        }
        if (options?.sortByAuthorDate) {
            args.push('--author-date-order');
        }
        if (options?.range) {
            args.push(options.range);
        }
        else {
            args.push(`-n${options?.maxEntries ?? 32}`);
        }
        if (options?.author) {
            args.push(`--author="${options.author}"`);
        }
        if (typeof options?.maxParents === 'number') {
            args.push(`--max-parents=${options.maxParents}`);
        }
        if (typeof options?.skip === 'number') {
            args.push(`--skip=${options.skip}`);
        }
        if (options?.refNames) {
            args.push('--topo-order');
            args.push('--decorate=full');
            // In order to avoid hitting the command line limit due to large number of reference
            // names (can happen when the `all` filter is used in the Source Control Graph view),
            // we are passing the reference names via stdin.
            spawnOptions.input = options.refNames.join('\n');
            args.push('--stdin');
        }
        if (options?.path) {
            args.push('--', options.path);
        }
        const result = await this.exec(args, spawnOptions);
        if (result.exitCode) {
            // An empty repo
            return [];
        }
        return parseGitCommits(result.stdout);
    }
    async logFile(uri, options) {
        const args = ['log', `--format=${COMMIT_FORMAT}`, '-z'];
        if (options?.maxEntries && !options?.reverse) {
            args.push(`-n${options.maxEntries}`);
        }
        if (options?.hash) {
            // If we are reversing, we must add a range (with HEAD) because we are using --ancestry-path for better reverse walking
            if (options?.reverse) {
                args.push('--reverse', '--ancestry-path', `${options.hash}..HEAD`);
            }
            else {
                args.push(options.hash);
            }
        }
        if (options?.shortStats) {
            args.push('--shortstat');
        }
        if (options?.sortByAuthorDate) {
            args.push('--author-date-order');
        }
        if (options?.follow) {
            args.push('--follow');
        }
        args.push('--', uri.fsPath);
        try {
            const result = await this.exec(args);
            if (result.exitCode) {
                // No file history, e.g. a new file or untracked
                return [];
            }
            return parseGitCommits(result.stdout);
        }
        catch (err) {
            // Repository has no commits yet
            if (/does not have any commits yet/.test(err.stderr)) {
                return [];
            }
            throw err;
        }
    }
    async reflog(ref, pattern) {
        const args = ['reflog', ref, `--grep-reflog=${pattern}`];
        const result = await this.exec(args);
        if (result.exitCode) {
            return [];
        }
        return result.stdout.split('\n')
            .filter(entry => !!entry);
    }
    async buffer(ref, filePath) {
        const relativePath = sanitizeRelativePath(this.repositoryRoot, filePath);
        const child = this.stream(['show', '--textconv', `${ref}:${relativePath}`]);
        if (!child.stdout) {
            return Promise.reject('Can\'t open file from git');
        }
        const { exitCode, stdout, stderr } = await exec(child);
        if (exitCode) {
            const err = new GitError({
                message: 'Could not show object.',
                exitCode
            });
            if (/exists on disk, but not in/.test(stderr)) {
                err.gitErrorCode = "WrongCase" /* GitErrorCodes.WrongCase */;
            }
            return Promise.reject(err);
        }
        return stdout;
    }
    async getObjectDetails(treeish, path) {
        if (!treeish || treeish === ':1' || treeish === ':2' || treeish === ':3') { // index
            const elements = await this.lsfiles(path);
            if (elements.length === 0) {
                throw new GitError({ message: 'Path not known by git', gitErrorCode: "UnknownPath" /* GitErrorCodes.UnknownPath */ });
            }
            const { mode, object } = treeish !== ''
                ? elements.find(e => e.stage === treeish.substring(1)) ?? elements[0]
                : elements[0];
            const catFile = await this.exec(['cat-file', '-s', object]);
            const size = parseInt(catFile.stdout);
            return { mode, object, size };
        }
        const elements = await this.lstree(treeish, path);
        if (elements.length === 0) {
            throw new GitError({ message: 'Path not known by git', gitErrorCode: "UnknownPath" /* GitErrorCodes.UnknownPath */ });
        }
        const { mode, object, size } = elements[0];
        return { mode, object, size: parseInt(size) || 0 };
    }
    async lstree(treeish, path, options) {
        const args = ['ls-tree', '-l'];
        if (options?.recursive) {
            args.push('-r');
        }
        args.push(treeish);
        if (path) {
            args.push('--', sanitizeRelativePath(this.repositoryRoot, path));
        }
        const { stdout } = await this.exec(args);
        return parseLsTree(stdout);
    }
    async lsfiles(path) {
        const args = ['ls-files', '--stage'];
        const relativePath = sanitizeRelativePath(this.repositoryRoot, path);
        if (relativePath) {
            args.push('--', relativePath);
        }
        const { stdout } = await this.exec(args);
        return parseLsFiles(stdout);
    }
    async getGitFilePath(ref, filePath) {
        const elements = ref
            ? await this.lstree(ref, undefined, { recursive: true })
            : await this.lsfiles(this.repositoryRoot);
        const relativePathLowercase = sanitizeRelativePath(this.repositoryRoot, filePath).toLowerCase();
        const element = elements.find(file => file.file.toLowerCase() === relativePathLowercase);
        if (!element) {
            throw new GitError({
                message: `Git relative path not found. Was looking for ${relativePathLowercase} among ${JSON.stringify(elements.map(({ file }) => file), null, 2)}`,
            });
        }
        return path.join(this.repositoryRoot, element.file);
    }
    async detectObjectType(object) {
        const child = await this.stream(['show', '--textconv', object]);
        const buffer = await (0, util_1.readBytes)(child.stdout, 4100);
        try {
            child.kill();
        }
        catch (err) {
            // noop
        }
        const encoding = (0, util_1.detectUnicodeEncoding)(buffer);
        let isText = true;
        if (encoding !== "utf16be" /* Encoding.UTF16be */ && encoding !== "utf16le" /* Encoding.UTF16le */) {
            for (let i = 0; i < buffer.length; i++) {
                if (buffer.readInt8(i) === 0) {
                    isText = false;
                    break;
                }
            }
        }
        if (!isText) {
            const result = await filetype.fromBuffer(buffer);
            if (!result) {
                return { mimetype: 'application/octet-stream' };
            }
            else {
                return { mimetype: result.mime };
            }
        }
        if (encoding) {
            return { mimetype: 'text/plain', encoding };
        }
        else {
            // TODO@JOAO: read the setting OUTSIDE!
            return { mimetype: 'text/plain' };
        }
    }
    async apply(patch, reverse) {
        const args = ['apply', patch];
        if (reverse) {
            args.push('-R');
        }
        try {
            await this.exec(args);
        }
        catch (err) {
            if (/patch does not apply/.test(err.stderr)) {
                err.gitErrorCode = "PatchDoesNotApply" /* GitErrorCodes.PatchDoesNotApply */;
            }
            throw err;
        }
    }
    async diff(cached = false) {
        const args = ['diff'];
        if (cached) {
            args.push('--cached');
        }
        const result = await this.exec(args);
        return result.stdout;
    }
    async diffWithHEAD(path) {
        if (!path) {
            return await this.diffFiles(false);
        }
        const args = ['diff', '--', sanitizeRelativePath(this.repositoryRoot, path)];
        const result = await this.exec(args);
        return result.stdout;
    }
    async diffWith(ref, path) {
        if (!path) {
            return await this.diffFiles(false, ref);
        }
        const args = ['diff', ref, '--', sanitizeRelativePath(this.repositoryRoot, path)];
        const result = await this.exec(args);
        return result.stdout;
    }
    async diffIndexWithHEAD(path) {
        if (!path) {
            return await this.diffFiles(true);
        }
        const args = ['diff', '--cached', '--', sanitizeRelativePath(this.repositoryRoot, path)];
        const result = await this.exec(args);
        return result.stdout;
    }
    async diffIndexWith(ref, path) {
        if (!path) {
            return await this.diffFiles(true, ref);
        }
        const args = ['diff', '--cached', ref, '--', sanitizeRelativePath(this.repositoryRoot, path)];
        const result = await this.exec(args);
        return result.stdout;
    }
    async diffBlobs(object1, object2) {
        const args = ['diff', object1, object2];
        const result = await this.exec(args);
        return result.stdout;
    }
    async diffBetween(ref1, ref2, path) {
        const range = `${ref1}...${ref2}`;
        if (!path) {
            return await this.diffFiles(false, range);
        }
        const args = ['diff', range, '--', sanitizeRelativePath(this.repositoryRoot, path)];
        const result = await this.exec(args);
        return result.stdout.trim();
    }
    async diffBetweenShortStat(ref1, ref2) {
        const args = ['diff', '--shortstat', `${ref1}...${ref2}`];
        const result = await this.exec(args);
        if (result.exitCode) {
            return { files: 0, insertions: 0, deletions: 0 };
        }
        return parseGitDiffShortStat(result.stdout.trim());
    }
    async diffFiles(cached, ref) {
        const args = ['diff', '--name-status', '-z', '--diff-filter=ADMR'];
        if (cached) {
            args.push('--cached');
        }
        if (ref) {
            args.push(ref);
        }
        const gitResult = await this.exec(args);
        if (gitResult.exitCode) {
            return [];
        }
        return parseGitChanges(this.repositoryRoot, gitResult.stdout);
    }
    async diffTrees(treeish1, treeish2, options) {
        const args = ['diff-tree', '-r', '--name-status', '-z', '--diff-filter=ADMR'];
        if (options?.similarityThreshold) {
            args.push(`--find-renames=${options.similarityThreshold}%`);
        }
        args.push(treeish1);
        if (treeish2) {
            args.push(treeish2);
        }
        const gitResult = await this.exec(args);
        if (gitResult.exitCode) {
            return [];
        }
        return parseGitChanges(this.repositoryRoot, gitResult.stdout);
    }
    async getMergeBase(ref1, ref2, ...refs) {
        try {
            const args = ['merge-base'];
            if (refs.length !== 0) {
                args.push('--octopus');
                args.push(...refs);
            }
            args.push(ref1, ref2);
            const result = await this.exec(args);
            return result.stdout.trim();
        }
        catch (err) {
            return undefined;
        }
    }
    async hashObject(data) {
        const args = ['hash-object', '-w', '--stdin'];
        const result = await this.exec(args, { input: data });
        return result.stdout.trim();
    }
    async add(paths, opts) {
        const args = ['add'];
        if (opts && opts.update) {
            args.push('-u');
        }
        else {
            args.push('-A');
        }
        if (paths && paths.length) {
            for (const chunk of (0, util_1.splitInChunks)(paths.map(p => sanitizeRelativePath(this.repositoryRoot, p)), MAX_CLI_LENGTH)) {
                await this.exec([...args, '--', ...chunk]);
            }
        }
        else {
            await this.exec([...args, '--', '.']);
        }
    }
    async rm(paths) {
        const args = ['rm', '--'];
        if (!paths || !paths.length) {
            return;
        }
        args.push(...paths.map(p => sanitizeRelativePath(this.repositoryRoot, p)));
        await this.exec(args);
    }
    async stage(path, data) {
        const relativePath = sanitizeRelativePath(this.repositoryRoot, path);
        const child = this.stream(['hash-object', '--stdin', '-w', '--path', relativePath], { stdio: [null, null, null] });
        child.stdin.end(data);
        const { exitCode, stdout } = await exec(child);
        const hash = stdout.toString('utf8');
        if (exitCode) {
            throw new GitError({
                message: 'Could not hash object.',
                exitCode: exitCode
            });
        }
        const treeish = await this.getCommit('HEAD').then(() => 'HEAD', () => '');
        let mode;
        let add = '';
        try {
            const details = await this.getObjectDetails(treeish, path);
            mode = details.mode;
        }
        catch (err) {
            if (err.gitErrorCode !== "UnknownPath" /* GitErrorCodes.UnknownPath */) {
                throw err;
            }
            mode = '100644';
            add = '--add';
        }
        await this.exec(['update-index', add, '--cacheinfo', mode, hash, relativePath]);
    }
    async checkout(treeish, paths, opts = Object.create(null)) {
        const args = ['checkout', '-q'];
        if (opts.track) {
            args.push('--track');
        }
        if (opts.detached) {
            args.push('--detach');
        }
        if (treeish) {
            args.push(treeish);
        }
        try {
            if (paths && paths.length > 0) {
                for (const chunk of (0, util_1.splitInChunks)(paths.map(p => sanitizeRelativePath(this.repositoryRoot, p)), MAX_CLI_LENGTH)) {
                    await this.exec([...args, '--', ...chunk]);
                }
            }
            else {
                await this.exec(args);
            }
        }
        catch (err) {
            if (/Please,? commit your changes or stash them/.test(err.stderr || '')) {
                err.gitErrorCode = "DirtyWorkTree" /* GitErrorCodes.DirtyWorkTree */;
                err.gitTreeish = treeish;
            }
            else if (/You are on a branch yet to be born/.test(err.stderr || '')) {
                err.gitErrorCode = "BranchNotYetBorn" /* GitErrorCodes.BranchNotYetBorn */;
            }
            throw err;
        }
    }
    async commit(message, opts = Object.create(null)) {
        const args = ['commit', '--quiet'];
        const options = {};
        if (message) {
            options.input = message;
            args.push('--allow-empty-message', '--file', '-');
        }
        if (opts.verbose) {
            args.push('--verbose');
        }
        if (opts.all) {
            args.push('--all');
        }
        if (opts.amend) {
            args.push('--amend');
        }
        if (!opts.useEditor) {
            if (!message) {
                if (opts.amend) {
                    args.push('--no-edit');
                }
                else {
                    options.input = '';
                    args.push('--file', '-');
                }
            }
            args.push('--allow-empty-message');
        }
        if (opts.signoff) {
            args.push('--signoff');
        }
        if (opts.signCommit) {
            args.push('-S');
        }
        if (opts.empty) {
            args.push('--allow-empty');
        }
        if (opts.noVerify) {
            args.push('--no-verify');
        }
        if (opts.requireUserConfig ?? true) {
            // Stops git from guessing at user/email
            args.splice(0, 0, '-c', 'user.useConfigOnly=true');
        }
        try {
            await this.exec(args, options);
        }
        catch (commitErr) {
            await this.handleCommitError(commitErr);
        }
    }
    async rebaseAbort() {
        await this.exec(['rebase', '--abort']);
    }
    async rebaseContinue() {
        const args = ['rebase', '--continue'];
        try {
            await this.exec(args, { env: { GIT_EDITOR: 'true' } });
        }
        catch (commitErr) {
            await this.handleCommitError(commitErr);
        }
    }
    async handleCommitError(commitErr) {
        if (/not possible because you have unmerged files/.test(commitErr.stderr || '')) {
            commitErr.gitErrorCode = "UnmergedChanges" /* GitErrorCodes.UnmergedChanges */;
            throw commitErr;
        }
        else if (/Aborting commit due to empty commit message/.test(commitErr.stderr || '')) {
            commitErr.gitErrorCode = "EmptyCommitMessage" /* GitErrorCodes.EmptyCommitMessage */;
            throw commitErr;
        }
        try {
            await this.exec(['config', '--get-all', 'user.name']);
        }
        catch (err) {
            err.gitErrorCode = "NoUserNameConfigured" /* GitErrorCodes.NoUserNameConfigured */;
            throw err;
        }
        try {
            await this.exec(['config', '--get-all', 'user.email']);
        }
        catch (err) {
            err.gitErrorCode = "NoUserEmailConfigured" /* GitErrorCodes.NoUserEmailConfigured */;
            throw err;
        }
        throw commitErr;
    }
    async branch(name, checkout, ref) {
        const args = checkout ? ['checkout', '-q', '-b', name, '--no-track'] : ['branch', '-q', name];
        if (ref) {
            args.push(ref);
        }
        await this.exec(args);
    }
    async deleteBranch(name, force) {
        const args = ['branch', force ? '-D' : '-d', name];
        await this.exec(args);
    }
    async renameBranch(name) {
        const args = ['branch', '-m', name];
        await this.exec(args);
    }
    async move(from, to) {
        const args = ['mv', from, to];
        await this.exec(args);
    }
    async setBranchUpstream(name, upstream) {
        const args = ['branch', '--set-upstream-to', upstream, name];
        await this.exec(args);
    }
    async deleteRef(ref) {
        const args = ['update-ref', '-d', ref];
        await this.exec(args);
    }
    async merge(ref) {
        const args = ['merge', ref];
        try {
            await this.exec(args);
        }
        catch (err) {
            if (/^CONFLICT /m.test(err.stdout || '')) {
                err.gitErrorCode = "Conflict" /* GitErrorCodes.Conflict */;
            }
            throw err;
        }
    }
    async mergeAbort() {
        await this.exec(['merge', '--abort']);
    }
    async tag(options) {
        let args = ['tag'];
        if (options.message) {
            args = [...args, '-a', options.name, '-m', options.message];
        }
        else {
            args = [...args, options.name];
        }
        if (options.ref) {
            args.push(options.ref);
        }
        await this.exec(args);
    }
    async deleteTag(name) {
        const args = ['tag', '-d', name];
        await this.exec(args);
    }
    async deleteRemoteRef(remoteName, refName, options) {
        const args = ['push', remoteName, '--delete'];
        if (options?.force) {
            args.push('--force');
        }
        args.push(refName);
        await this.exec(args);
    }
    async clean(paths) {
        const pathsByGroup = (0, util_1.groupBy)(paths.map(sanitizePath), p => path.dirname(p));
        const groups = Object.keys(pathsByGroup).map(k => pathsByGroup[k]);
        const limiter = new util_1.Limiter(5);
        const promises = [];
        const args = ['clean', '-f', '-q'];
        for (const paths of groups) {
            for (const chunk of (0, util_1.splitInChunks)(paths.map(p => sanitizeRelativePath(this.repositoryRoot, p)), MAX_CLI_LENGTH)) {
                promises.push(limiter.queue(() => this.exec([...args, '--', ...chunk])));
            }
        }
        await Promise.all(promises);
    }
    async undo() {
        await this.exec(['clean', '-fd']);
        try {
            await this.exec(['checkout', '--', '.']);
        }
        catch (err) {
            if (/did not match any file\(s\) known to git\./.test(err.stderr || '')) {
                return;
            }
            throw err;
        }
    }
    async reset(treeish, hard = false) {
        const args = ['reset', hard ? '--hard' : '--soft', treeish];
        await this.exec(args);
    }
    async revert(treeish, paths) {
        const result = await this.exec(['branch']);
        let args;
        // In case there are no branches, we must use rm --cached
        if (!result.stdout) {
            args = ['rm', '--cached', '-r'];
        }
        else {
            args = ['reset', '-q', treeish];
        }
        try {
            if (paths && paths.length > 0) {
                for (const chunk of (0, util_1.splitInChunks)(paths.map(p => sanitizeRelativePath(this.repositoryRoot, p)), MAX_CLI_LENGTH)) {
                    await this.exec([...args, '--', ...chunk]);
                }
            }
            else {
                await this.exec([...args, '--', '.']);
            }
        }
        catch (err) {
            // In case there are merge conflicts to be resolved, git reset will output
            // some "needs merge" data. We try to get around that.
            if (/([^:]+: needs merge\n)+/m.test(err.stdout || '')) {
                return;
            }
            throw err;
        }
    }
    async addRemote(name, url) {
        const args = ['remote', 'add', name, url];
        await this.exec(args);
    }
    async removeRemote(name) {
        const args = ['remote', 'remove', name];
        await this.exec(args);
    }
    async renameRemote(name, newName) {
        const args = ['remote', 'rename', name, newName];
        await this.exec(args);
    }
    async fetch(options = {}) {
        const args = ['fetch'];
        const spawnOptions = {
            cancellationToken: options.cancellationToken,
            env: { 'GIT_HTTP_USER_AGENT': this.git.userAgent }
        };
        if (options.remote) {
            args.push(options.remote);
            if (options.ref) {
                args.push(options.ref);
            }
        }
        else if (options.all) {
            args.push('--all');
        }
        if (options.prune) {
            args.push('--prune');
        }
        if (typeof options.depth === 'number') {
            args.push(`--depth=${options.depth}`);
        }
        if (options.silent) {
            spawnOptions.env['VSCODE_GIT_FETCH_SILENT'] = 'true';
        }
        try {
            await this.exec(args, spawnOptions);
        }
        catch (err) {
            if (/No remote repository specified\./.test(err.stderr || '')) {
                err.gitErrorCode = "NoRemoteRepositorySpecified" /* GitErrorCodes.NoRemoteRepositorySpecified */;
            }
            else if (/Could not read from remote repository/.test(err.stderr || '')) {
                err.gitErrorCode = "RemoteConnectionError" /* GitErrorCodes.RemoteConnectionError */;
            }
            else if (/! \[rejected\].*\(non-fast-forward\)/m.test(err.stderr || '')) {
                // The local branch has outgoing changes and it cannot be fast-forwarded.
                err.gitErrorCode = "BranchFastForwardRejected" /* GitErrorCodes.BranchFastForwardRejected */;
            }
            throw err;
        }
    }
    async fetchTags(options) {
        const args = ['fetch'];
        const spawnOptions = {
            env: { 'GIT_HTTP_USER_AGENT': this.git.userAgent }
        };
        args.push(options.remote);
        for (const tag of options.tags) {
            args.push(`refs/tags/${tag}:refs/tags/${tag}`);
        }
        if (options.force) {
            args.push('--force');
        }
        await this.exec(args, spawnOptions);
    }
    async pull(rebase, remote, branch, options = {}) {
        const args = ['pull'];
        if (options.tags) {
            args.push('--tags');
        }
        if (options.unshallow) {
            args.push('--unshallow');
        }
        // --auto-stash option is only available `git pull --merge` starting with git 2.27.0
        if (options.autoStash && this._git.compareGitVersionTo('2.27.0') !== -1) {
            args.push('--autostash');
        }
        if (rebase) {
            args.push('-r');
        }
        if (remote && branch) {
            args.push(remote);
            args.push(branch);
        }
        try {
            await this.exec(args, {
                cancellationToken: options.cancellationToken,
                env: { 'GIT_HTTP_USER_AGENT': this.git.userAgent }
            });
        }
        catch (err) {
            if (/^CONFLICT \([^)]+\): \b/m.test(err.stdout || '')) {
                err.gitErrorCode = "Conflict" /* GitErrorCodes.Conflict */;
            }
            else if (/Please tell me who you are\./.test(err.stderr || '')) {
                err.gitErrorCode = "NoUserNameConfigured" /* GitErrorCodes.NoUserNameConfigured */;
            }
            else if (/Could not read from remote repository/.test(err.stderr || '')) {
                err.gitErrorCode = "RemoteConnectionError" /* GitErrorCodes.RemoteConnectionError */;
            }
            else if (/Pull(?:ing)? is not possible because you have unmerged files|Cannot pull with rebase: You have unstaged changes|Your local changes to the following files would be overwritten|Please, commit your changes before you can merge/i.test(err.stderr)) {
                err.stderr = err.stderr.replace(/Cannot pull with rebase: You have unstaged changes/i, 'Cannot pull with rebase, you have unstaged changes');
                err.gitErrorCode = "DirtyWorkTree" /* GitErrorCodes.DirtyWorkTree */;
            }
            else if (/cannot lock ref|unable to update local ref/i.test(err.stderr || '')) {
                err.gitErrorCode = "CantLockRef" /* GitErrorCodes.CantLockRef */;
            }
            else if (/cannot rebase onto multiple branches/i.test(err.stderr || '')) {
                err.gitErrorCode = "CantRebaseMultipleBranches" /* GitErrorCodes.CantRebaseMultipleBranches */;
            }
            else if (/! \[rejected\].*\(would clobber existing tag\)/m.test(err.stderr || '')) {
                err.gitErrorCode = "TagConflict" /* GitErrorCodes.TagConflict */;
            }
            throw err;
        }
    }
    async rebase(branch, options = {}) {
        const args = ['rebase'];
        args.push(branch);
        try {
            await this.exec(args, options);
        }
        catch (err) {
            if (/^CONFLICT \([^)]+\): \b/m.test(err.stdout || '')) {
                err.gitErrorCode = "Conflict" /* GitErrorCodes.Conflict */;
            }
            else if (/cannot rebase onto multiple branches/i.test(err.stderr || '')) {
                err.gitErrorCode = "CantRebaseMultipleBranches" /* GitErrorCodes.CantRebaseMultipleBranches */;
            }
            throw err;
        }
    }
    async push(remote, name, setUpstream = false, followTags = false, forcePushMode, tags = false) {
        const args = ['push'];
        if (forcePushMode === 1 /* ForcePushMode.ForceWithLease */ || forcePushMode === 2 /* ForcePushMode.ForceWithLeaseIfIncludes */) {
            args.push('--force-with-lease');
            if (forcePushMode === 2 /* ForcePushMode.ForceWithLeaseIfIncludes */ && this._git.compareGitVersionTo('2.30') !== -1) {
                args.push('--force-if-includes');
            }
        }
        else if (forcePushMode === 0 /* ForcePushMode.Force */) {
            args.push('--force');
        }
        if (setUpstream) {
            args.push('-u');
        }
        if (followTags) {
            args.push('--follow-tags');
        }
        if (tags) {
            args.push('--tags');
        }
        if (remote) {
            args.push(remote);
        }
        if (name) {
            args.push(name);
        }
        try {
            await this.exec(args, { env: { 'GIT_HTTP_USER_AGENT': this.git.userAgent } });
        }
        catch (err) {
            if (/^error: failed to push some refs to\b/m.test(err.stderr || '')) {
                if (forcePushMode === 1 /* ForcePushMode.ForceWithLease */ && /! \[rejected\].*\(stale info\)/m.test(err.stderr || '')) {
                    err.gitErrorCode = "ForcePushWithLeaseRejected" /* GitErrorCodes.ForcePushWithLeaseRejected */;
                }
                else if (forcePushMode === 2 /* ForcePushMode.ForceWithLeaseIfIncludes */ && /! \[rejected\].*\(remote ref updated since checkout\)/m.test(err.stderr || '')) {
                    err.gitErrorCode = "ForcePushWithLeaseIfIncludesRejected" /* GitErrorCodes.ForcePushWithLeaseIfIncludesRejected */;
                }
                else {
                    err.gitErrorCode = "PushRejected" /* GitErrorCodes.PushRejected */;
                }
            }
            else if (/Permission.*denied/.test(err.stderr || '')) {
                err.gitErrorCode = "PermissionDenied" /* GitErrorCodes.PermissionDenied */;
            }
            else if (/Could not read from remote repository/.test(err.stderr || '')) {
                err.gitErrorCode = "RemoteConnectionError" /* GitErrorCodes.RemoteConnectionError */;
            }
            else if (/^fatal: The current branch .* has no upstream branch/.test(err.stderr || '')) {
                err.gitErrorCode = "NoUpstreamBranch" /* GitErrorCodes.NoUpstreamBranch */;
            }
            throw err;
        }
    }
    async cherryPick(commitHash) {
        try {
            await this.exec(['cherry-pick', commitHash]);
        }
        catch (err) {
            if (/The previous cherry-pick is now empty, possibly due to conflict resolution./.test(err.stderr ?? '')) {
                // Abort cherry-pick
                await this.cherryPickAbort();
                err.gitErrorCode = "CherryPickEmpty" /* GitErrorCodes.CherryPickEmpty */;
            }
            else {
                // Conflict during cherry-pick
                err.gitErrorCode = "CherryPickConflict" /* GitErrorCodes.CherryPickConflict */;
            }
            throw err;
        }
    }
    async cherryPickAbort() {
        await this.exec(['cherry-pick', '--abort']);
    }
    async blame(path) {
        try {
            const args = ['blame', '--', sanitizeRelativePath(this.repositoryRoot, path)];
            const result = await this.exec(args);
            return result.stdout.trim();
        }
        catch (err) {
            if (/^fatal: no such path/.test(err.stderr || '')) {
                err.gitErrorCode = "NoPathFound" /* GitErrorCodes.NoPathFound */;
            }
            throw err;
        }
    }
    async blame2(path, ref) {
        try {
            const args = ['blame', '--root', '--incremental'];
            if (ref) {
                args.push(ref);
            }
            args.push('--', sanitizeRelativePath(this.repositoryRoot, path));
            const result = await this.exec(args);
            return parseGitBlame(result.stdout.trim());
        }
        catch (err) {
            return undefined;
        }
    }
    async createStash(message, includeUntracked, staged) {
        try {
            const args = ['stash', 'push'];
            if (includeUntracked) {
                args.push('-u');
            }
            if (staged) {
                args.push('-S');
            }
            if (message) {
                args.push('-m', message);
            }
            await this.exec(args);
        }
        catch (err) {
            if (/No local changes to save/.test(err.stderr || '')) {
                err.gitErrorCode = "NoLocalChanges" /* GitErrorCodes.NoLocalChanges */;
            }
            throw err;
        }
    }
    async popStash(index) {
        const args = ['stash', 'pop'];
        await this.popOrApplyStash(args, index);
    }
    async applyStash(index) {
        const args = ['stash', 'apply'];
        await this.popOrApplyStash(args, index);
    }
    async popOrApplyStash(args, index) {
        try {
            if (typeof index === 'number') {
                args.push(`stash@{${index}}`);
            }
            await this.exec(args);
        }
        catch (err) {
            if (/No stash found/.test(err.stderr || '')) {
                err.gitErrorCode = "NoStashFound" /* GitErrorCodes.NoStashFound */;
            }
            else if (/error: Your local changes to the following files would be overwritten/.test(err.stderr || '')) {
                err.gitErrorCode = "LocalChangesOverwritten" /* GitErrorCodes.LocalChangesOverwritten */;
            }
            else if (/^CONFLICT/m.test(err.stdout || '')) {
                err.gitErrorCode = "StashConflict" /* GitErrorCodes.StashConflict */;
            }
            throw err;
        }
    }
    async dropStash(index) {
        const args = ['stash'];
        if (typeof index === 'number') {
            args.push('drop');
            args.push(`stash@{${index}}`);
        }
        else {
            args.push('clear');
        }
        try {
            await this.exec(args);
        }
        catch (err) {
            if (/No stash found/.test(err.stderr || '')) {
                err.gitErrorCode = "NoStashFound" /* GitErrorCodes.NoStashFound */;
            }
            throw err;
        }
    }
    async showStash(index) {
        const args = ['stash', 'show', `stash@{${index}}`, '--name-status', '-z', '-u'];
        try {
            const result = await this.exec(args);
            if (result.exitCode) {
                return [];
            }
            return parseGitChanges(this.repositoryRoot, result.stdout.trim());
        }
        catch (err) {
            if (/No stash found/.test(err.stderr || '')) {
                return undefined;
            }
            throw err;
        }
    }
    async getStatus(opts) {
        if (opts?.cancellationToken && opts?.cancellationToken.isCancellationRequested) {
            throw new vscode_1.CancellationError();
        }
        const disposables = [];
        const env = { GIT_OPTIONAL_LOCKS: '0' };
        const args = ['status', '-z'];
        if (opts?.untrackedChanges === 'hidden') {
            args.push('-uno');
        }
        else {
            args.push('-uall');
        }
        if (opts?.ignoreSubmodules) {
            args.push('--ignore-submodules');
        }
        // --find-renames option is only available starting with git 2.18.0
        if (opts?.similarityThreshold && opts.similarityThreshold !== 50 && this._git.compareGitVersionTo('2.18.0') !== -1) {
            args.push(`--find-renames=${opts.similarityThreshold}%`);
        }
        const child = this.stream(args, { env });
        let result = new Promise((c, e) => {
            const parser = new GitStatusParser();
            const onClose = (exitCode) => {
                if (exitCode !== 0) {
                    const stderr = stderrData.join('');
                    return e(new GitError({
                        message: 'Failed to execute git',
                        stderr,
                        exitCode,
                        gitErrorCode: getGitErrorCode(stderr),
                        gitCommand: 'status',
                        gitArgs: args
                    }));
                }
                c({ status: parser.status, statusLength: parser.status.length, didHitLimit: false });
            };
            const limit = opts?.limit ?? 10000;
            const onStdoutData = (raw) => {
                parser.update(raw);
                if (limit !== 0 && parser.status.length > limit) {
                    child.removeListener('close', onClose);
                    child.stdout.removeListener('data', onStdoutData);
                    child.kill();
                    c({ status: parser.status.slice(0, limit), statusLength: parser.status.length, didHitLimit: true });
                }
            };
            child.stdout.setEncoding('utf8');
            child.stdout.on('data', onStdoutData);
            const stderrData = [];
            child.stderr.setEncoding('utf8');
            child.stderr.on('data', raw => stderrData.push(raw));
            child.on('error', cpErrorHandler(e));
            child.on('close', onClose);
        });
        if (opts?.cancellationToken) {
            const cancellationPromise = new Promise((_, e) => {
                disposables.push((0, util_1.onceEvent)(opts.cancellationToken.onCancellationRequested)(() => {
                    try {
                        child.kill();
                    }
                    catch (err) {
                        // noop
                    }
                    e(new vscode_1.CancellationError());
                }));
            });
            result = Promise.race([result, cancellationPromise]);
        }
        try {
            const { status, statusLength, didHitLimit } = await result;
            return { status, statusLength, didHitLimit };
        }
        finally {
            (0, util_1.dispose)(disposables);
        }
    }
    async getHEADRef() {
        let HEAD;
        try {
            HEAD = await this.getHEAD();
            if (HEAD.name) {
                // Branch
                HEAD = await this.getBranch(HEAD.name);
                // Upstream commit
                if (HEAD && HEAD.upstream) {
                    const ref = HEAD.upstream.remote !== '.'
                        ? `refs/remotes/${HEAD.upstream.remote}/${HEAD.upstream.name}`
                        : `refs/heads/${HEAD.upstream.name}`;
                    const commit = await this.revParse(ref);
                    HEAD = { ...HEAD, upstream: { ...HEAD.upstream, commit } };
                }
            }
            else if (HEAD.commit) {
                // Tag || Commit
                const tags = await this.getRefs({ pattern: 'refs/tags' });
                const tag = tags.find(tag => tag.commit === HEAD.commit);
                if (tag) {
                    HEAD = { ...HEAD, name: tag.name, type: 2 /* RefType.Tag */ };
                }
            }
        }
        catch (err) {
            // noop
        }
        return HEAD;
    }
    async getHEAD() {
        if (!this._isUsingRefTable) {
            try {
                // Attempt to parse the HEAD file
                const result = await this.getHEADFS();
                // Git 2.45 adds support for a new reference storage backend called "reftable", promising
                // faster lookups, reads, and writes for repositories with any number of references. For
                // backwards compatibility the `.git/HEAD` file contains `ref: refs/heads/.invalid`. More
                // details are available at https://git-scm.com/docs/reftable
                if (result.name === '.invalid') {
                    this._isUsingRefTable = true;
                    this.logger.warn(`[Git][getHEAD] Failed to parse HEAD file: Repository is using reftable format.`);
                }
                else {
                    return result;
                }
            }
            catch (err) {
                this.logger.warn(`[Git][getHEAD] Failed to parse HEAD file: ${err.message}`);
            }
        }
        try {
            // Fallback to using git to determine HEAD
            const result = await this.exec(['symbolic-ref', '--short', 'HEAD']);
            if (!result.stdout) {
                throw new Error('Not in a branch');
            }
            return { name: result.stdout.trim(), commit: undefined, type: 0 /* RefType.Head */ };
        }
        catch (err) { }
        // Detached HEAD
        const result = await this.exec(['rev-parse', 'HEAD']);
        if (!result.stdout) {
            throw new Error('Error parsing HEAD');
        }
        return { name: undefined, commit: result.stdout.trim(), type: 0 /* RefType.Head */ };
    }
    async getHEADFS() {
        const raw = await fs_1.promises.readFile(path.join(this.dotGit.path, 'HEAD'), 'utf8');
        // Branch
        const branchMatch = raw.match(/^ref: refs\/heads\/(?<name>.*)$/m);
        if (branchMatch?.groups?.name) {
            return { name: branchMatch.groups.name, commit: undefined, type: 0 /* RefType.Head */ };
        }
        // Detached
        const commitMatch = raw.match(/^(?<commit>[0-9a-f]{40})$/m);
        if (commitMatch?.groups?.commit) {
            return { name: undefined, commit: commitMatch.groups.commit, type: 0 /* RefType.Head */ };
        }
        throw new Error(`Unable to parse HEAD file. HEAD file contents: ${raw}.`);
    }
    async findTrackingBranches(upstreamBranch) {
        const result = await this.exec(['for-each-ref', '--format', '%(refname:short)%00%(upstream:short)', 'refs/heads']);
        return result.stdout.trim().split('\n')
            .map(line => line.trim().split('\0'))
            .filter(([_, upstream]) => upstream === upstreamBranch)
            .map(([ref]) => ({ name: ref, type: 0 /* RefType.Head */ }));
    }
    async getRefs(query, cancellationToken) {
        if (cancellationToken && cancellationToken.isCancellationRequested) {
            throw new vscode_1.CancellationError();
        }
        const args = ['for-each-ref'];
        if (query.count) {
            args.push(`--count=${query.count}`);
        }
        if (query.sort && query.sort !== 'alphabetically') {
            args.push('--sort', `-${query.sort}`);
        }
        if (query.includeCommitDetails) {
            const format = this._git.compareGitVersionTo('1.9.0') !== -1
                ? `${REFS_WITH_DETAILS_FORMAT}%00%(upstream:track)`
                : REFS_WITH_DETAILS_FORMAT;
            args.push('--format', format);
        }
        else {
            args.push('--format', REFS_FORMAT);
        }
        if (query.pattern) {
            const patterns = Array.isArray(query.pattern) ? query.pattern : [query.pattern];
            for (const pattern of patterns) {
                args.push(pattern.startsWith('refs/') ? pattern : `refs/${pattern}`);
            }
        }
        if (query.contains) {
            args.push('--contains', query.contains);
        }
        const result = await this.exec(args, { cancellationToken });
        return parseRefs(result.stdout);
    }
    async getRemoteRefs(remote, opts) {
        if (opts?.cancellationToken && opts?.cancellationToken.isCancellationRequested) {
            throw new vscode_1.CancellationError();
        }
        const args = ['ls-remote'];
        if (opts?.heads) {
            args.push('--heads');
        }
        if (opts?.tags) {
            args.push('--tags');
        }
        args.push(remote);
        const result = await this.exec(args, { cancellationToken: opts?.cancellationToken });
        const fn = (line) => {
            let match;
            if (match = /^([0-9a-f]{40})\trefs\/heads\/([^ ]+)$/.exec(line)) {
                return { name: match[1], commit: match[2], type: 0 /* RefType.Head */ };
            }
            else if (match = /^([0-9a-f]{40})\trefs\/tags\/([^ ]+)$/.exec(line)) {
                return { name: match[2], commit: match[1], type: 2 /* RefType.Tag */ };
            }
            return null;
        };
        return result.stdout.split('\n')
            .filter(line => !!line)
            .map(fn)
            .filter(ref => !!ref);
    }
    async getStashes() {
        const result = await this.exec(['stash', 'list', `--format=${STASH_FORMAT}`, '-z']);
        return parseGitStashes(result.stdout.trim());
    }
    async getRemotes() {
        const remotes = [];
        try {
            // Attempt to parse the config file
            remotes.push(...await this.getRemotesFS());
            if (remotes.length === 0) {
                this.logger.info('[Git][getRemotes] No remotes found in the git config file');
            }
        }
        catch (err) {
            this.logger.warn(`[Git][getRemotes] Error: ${err.message}`);
            // Fallback to using git to get the remotes
            remotes.push(...await this.getRemotesGit());
        }
        for (const remote of remotes) {
            // https://github.com/microsoft/vscode/issues/45271
            remote.isReadOnly = remote.pushUrl === undefined || remote.pushUrl === 'no_push';
        }
        return remotes;
    }
    async getRemotesFS() {
        const raw = await fs_1.promises.readFile(path.join(this.dotGit.commonPath ?? this.dotGit.path, 'config'), 'utf8');
        return parseGitRemotes(raw);
    }
    async getRemotesGit() {
        const remotes = [];
        const result = await this.exec(['remote', '--verbose']);
        const lines = result.stdout.trim().split('\n').filter(l => !!l);
        for (const line of lines) {
            const parts = line.split(/\s/);
            const [name, url, type] = parts;
            let remote = remotes.find(r => r.name === name);
            if (!remote) {
                remote = { name, isReadOnly: false };
                remotes.push(remote);
            }
            if (/fetch/i.test(type)) {
                remote.fetchUrl = url;
            }
            else if (/push/i.test(type)) {
                remote.pushUrl = url;
            }
            else {
                remote.fetchUrl = url;
                remote.pushUrl = url;
            }
        }
        return remotes;
    }
    async getBranch(name) {
        if (name === 'HEAD') {
            return this.getHEAD();
        }
        const args = ['for-each-ref'];
        let supportsAheadBehind = true;
        if (this._git.compareGitVersionTo('1.9.0') === -1) {
            args.push('--format=%(refname)%00%(upstream:short)%00%(objectname)');
            supportsAheadBehind = false;
        }
        else if (this._git.compareGitVersionTo('2.16.0') === -1) {
            args.push('--format=%(refname)%00%(upstream:short)%00%(objectname)%00%(upstream:track)');
        }
        else {
            args.push('--format=%(refname)%00%(upstream:short)%00%(objectname)%00%(upstream:track)%00%(upstream:remotename)%00%(upstream:remoteref)');
        }
        // On Windows and macOS ref names are case insensitive so we add --ignore-case
        // to handle the scenario where the user switched to a branch with incorrect
        // casing
        if (this.git.compareGitVersionTo('2.12') !== -1 && (util_1.isWindows || util_1.isMacintosh)) {
            args.push('--ignore-case');
        }
        if (/^refs\/(heads|remotes)\//i.test(name)) {
            args.push(name);
        }
        else {
            args.push(`refs/heads/${name}`, `refs/remotes/${name}`);
        }
        const result = await this.exec(args);
        const branches = result.stdout.trim().split('\n').map(line => {
            let [branchName, upstream, ref, status, remoteName, upstreamRef] = line.trim().split('\0');
            if (branchName.startsWith('refs/heads/')) {
                branchName = branchName.substring(11);
                const index = upstream.indexOf('/');
                let ahead;
                let behind;
                const match = /\[(?:ahead ([0-9]+))?[,\s]*(?:behind ([0-9]+))?]|\[gone]/.exec(status);
                if (match) {
                    [, ahead, behind] = match;
                }
                return {
                    type: 0 /* RefType.Head */,
                    name: branchName,
                    upstream: upstream !== '' && status !== '[gone]' ? {
                        name: upstreamRef ? upstreamRef.substring(11) : upstream.substring(index + 1),
                        remote: remoteName ? remoteName : upstream.substring(0, index)
                    } : undefined,
                    commit: ref || undefined,
                    ahead: Number(ahead) || 0,
                    behind: Number(behind) || 0,
                };
            }
            else if (branchName.startsWith('refs/remotes/')) {
                branchName = branchName.substring(13);
                const index = branchName.indexOf('/');
                return {
                    type: 1 /* RefType.RemoteHead */,
                    name: branchName.substring(index + 1),
                    remote: branchName.substring(0, index),
                    commit: ref,
                };
            }
            else {
                return undefined;
            }
        }).filter((b) => !!b);
        if (branches.length) {
            const [branch] = branches;
            if (!supportsAheadBehind && branch.upstream) {
                try {
                    const result = await this.exec(['rev-list', '--left-right', '--count', `${branch.name}...${branch.upstream.remote}/${branch.upstream.name}`]);
                    const [ahead, behind] = result.stdout.trim().split('\t');
                    branch.ahead = Number(ahead) || 0;
                    branch.behind = Number(behind) || 0;
                }
                catch { }
            }
            return branch;
        }
        this.logger.warn(`[Git][getBranch] No such branch: ${name}`);
        return Promise.reject(new Error(`No such branch: ${name}.`));
    }
    async getDefaultBranch(remoteName) {
        const result = await this.exec(['symbolic-ref', '--short', `refs/remotes/${remoteName}/HEAD`]);
        if (!result.stdout || result.stderr) {
            throw new Error('No default branch');
        }
        return this.getBranch(result.stdout.trim());
    }
    // TODO: Support core.commentChar
    stripCommitMessageComments(message) {
        return message.replace(/^\s*#.*$\n?/gm, '').trim();
    }
    async getSquashMessage() {
        const squashMsgPath = path.join(this.repositoryRoot, '.git', 'SQUASH_MSG');
        try {
            const raw = await fs_1.promises.readFile(squashMsgPath, 'utf8');
            return this.stripCommitMessageComments(raw);
        }
        catch {
            return undefined;
        }
    }
    async getMergeMessage() {
        const mergeMsgPath = path.join(this.repositoryRoot, '.git', 'MERGE_MSG');
        try {
            const raw = await fs_1.promises.readFile(mergeMsgPath, 'utf8');
            return this.stripCommitMessageComments(raw);
        }
        catch {
            return undefined;
        }
    }
    async getCommitTemplate() {
        try {
            const result = await this.exec(['config', '--get', 'commit.template']);
            if (!result.stdout) {
                return '';
            }
            // https://github.com/git/git/blob/3a0f269e7c82aa3a87323cb7ae04ac5f129f036b/path.c#L612
            const homedir = os.homedir();
            let templatePath = result.stdout.trim()
                .replace(/^~([^\/]*)\//, (_, user) => `${user ? path.join(path.dirname(homedir), user) : homedir}/`);
            if (!path.isAbsolute(templatePath)) {
                templatePath = path.join(this.repositoryRoot, templatePath);
            }
            const raw = await fs_1.promises.readFile(templatePath, 'utf8');
            return this.stripCommitMessageComments(raw);
        }
        catch (err) {
            return '';
        }
    }
    async getCommit(ref) {
        const result = await this.exec(['show', '-s', '--decorate=full', '--shortstat', `--format=${COMMIT_FORMAT}`, '-z', ref, '--']);
        const commits = parseGitCommits(result.stdout);
        if (commits.length === 0) {
            return Promise.reject('bad commit format');
        }
        return commits[0];
    }
    async revList(ref1, ref2) {
        const result = await this.exec(['rev-list', `${ref1}..${ref2}`]);
        if (result.stderr) {
            return [];
        }
        return result.stdout.trim().split('\n');
    }
    async revParse(ref) {
        try {
            const result = await fs_1.promises.readFile(path.join(this.dotGit.path, ref), 'utf8');
            return result.trim();
        }
        catch (err) {
            this.logger.warn(`[Git][revParse] Unable to read file: ${err.message}`);
        }
        try {
            const result = await this.exec(['rev-parse', ref]);
            if (result.stderr) {
                return undefined;
            }
            return result.stdout.trim();
        }
        catch (err) {
            return undefined;
        }
    }
    async updateSubmodules(paths) {
        const args = ['submodule', 'update'];
        for (const chunk of (0, util_1.splitInChunks)(paths.map(p => sanitizeRelativePath(this.repositoryRoot, p)), MAX_CLI_LENGTH)) {
            await this.exec([...args, '--', ...chunk]);
        }
    }
    async getSubmodules() {
        const gitmodulesPath = path.join(this.root, '.gitmodules');
        try {
            const gitmodulesRaw = await fs_1.promises.readFile(gitmodulesPath, 'utf8');
            return parseGitmodules(gitmodulesRaw);
        }
        catch (err) {
            if (/ENOENT/.test(err.message)) {
                return [];
            }
            throw err;
        }
    }
}
exports.Repository = Repository;
//# sourceMappingURL=git.js.map