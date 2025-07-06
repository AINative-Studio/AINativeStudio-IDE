/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TerminalProcess_1;
import * as fs from 'fs';
import { exec } from 'child_process';
import { timeout } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import * as path from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { findExecutable } from '../../../base/node/processes.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ILogService, LogLevel } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ChildProcessMonitor } from './childProcessMonitor.js';
import { getShellIntegrationInjection, getWindowsBuildNumber } from './terminalEnvironment.js';
import { WindowsShellHelper } from './windowsShellHelper.js';
import { spawn } from 'node-pty';
import { chunkInput } from '../common/terminalProcess.js';
var ShutdownConstants;
(function (ShutdownConstants) {
    /**
     * The amount of ms that must pass between data events after exit is queued before the actual
     * kill call is triggered. This data flush mechanism works around an [issue in node-pty][1]
     * where not all data is flushed which causes problems for task problem matchers. Additionally
     * on Windows under conpty, killing a process while data is being output will cause the [conhost
     * flush to hang the pty host][2] because [conhost should be hosted on another thread][3].
     *
     * [1]: https://github.com/Tyriar/node-pty/issues/72
     * [2]: https://github.com/microsoft/vscode/issues/71966
     * [3]: https://github.com/microsoft/node-pty/pull/415
     */
    ShutdownConstants[ShutdownConstants["DataFlushTimeout"] = 250] = "DataFlushTimeout";
    /**
     * The maximum ms to allow after dispose is called because forcefully killing the process.
     */
    ShutdownConstants[ShutdownConstants["MaximumShutdownTime"] = 5000] = "MaximumShutdownTime";
})(ShutdownConstants || (ShutdownConstants = {}));
var Constants;
(function (Constants) {
    /**
     * The minimum duration between kill and spawn calls on Windows/conpty as a mitigation for a
     * hang issue. See:
     * - https://github.com/microsoft/vscode/issues/71966
     * - https://github.com/microsoft/vscode/issues/117956
     * - https://github.com/microsoft/vscode/issues/121336
     */
    Constants[Constants["KillSpawnThrottleInterval"] = 250] = "KillSpawnThrottleInterval";
    /**
     * The amount of time to wait when a call is throttled beyond the exact amount, this is used to
     * try prevent early timeouts causing a kill/spawn call to happen at double the regular
     * interval.
     */
    Constants[Constants["KillSpawnSpacingDuration"] = 50] = "KillSpawnSpacingDuration";
    /**
     * How long to wait between chunk writes.
     */
    Constants[Constants["WriteInterval"] = 5] = "WriteInterval";
})(Constants || (Constants = {}));
const posixShellTypeMap = new Map([
    ['bash', "bash" /* PosixShellType.Bash */],
    ['csh', "csh" /* PosixShellType.Csh */],
    ['fish', "fish" /* PosixShellType.Fish */],
    ['ksh', "ksh" /* PosixShellType.Ksh */],
    ['sh', "sh" /* PosixShellType.Sh */],
    ['zsh', "zsh" /* PosixShellType.Zsh */]
]);
const generalShellTypeMap = new Map([
    ['pwsh', "pwsh" /* GeneralShellType.PowerShell */],
    ['powershell', "pwsh" /* GeneralShellType.PowerShell */],
    ['python', "python" /* GeneralShellType.Python */],
    ['julia', "julia" /* GeneralShellType.Julia */],
    ['nu', "nu" /* GeneralShellType.NuShell */],
    ['node', "node" /* GeneralShellType.Node */],
]);
let TerminalProcess = class TerminalProcess extends Disposable {
    static { TerminalProcess_1 = this; }
    static { this._lastKillOrStart = 0; }
    get exitMessage() { return this._exitMessage; }
    get currentTitle() { return this._windowsShellHelper?.shellTitle || this._currentTitle; }
    get shellType() { return isWindows ? this._windowsShellHelper?.shellType : posixShellTypeMap.get(this._currentTitle) || generalShellTypeMap.get(this._currentTitle); }
    get hasChildProcesses() { return this._childProcessMonitor?.hasChildProcesses || false; }
    constructor(shellLaunchConfig, cwd, cols, rows, env, 
    /**
     * environment used for `findExecutable`
     */
    _executableEnv, _options, _logService, _productService) {
        super();
        this.shellLaunchConfig = shellLaunchConfig;
        this._executableEnv = _executableEnv;
        this._options = _options;
        this._logService = _logService;
        this._productService = _productService;
        this.id = 0;
        this.shouldPersist = false;
        this._properties = {
            cwd: '',
            initialCwd: '',
            fixedDimensions: { cols: undefined, rows: undefined },
            title: '',
            shellType: undefined,
            hasChildProcesses: true,
            resolvedShellLaunchConfig: {},
            overrideDimensions: undefined,
            failedShellIntegrationActivation: false,
            usedShellIntegrationInjection: undefined
        };
        this._currentTitle = '';
        this._titleInterval = null;
        this._writeQueue = [];
        this._isPtyPaused = false;
        this._unacknowledgedCharCount = 0;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        let name;
        if (isWindows) {
            name = path.basename(this.shellLaunchConfig.executable || '');
        }
        else {
            // Using 'xterm-256color' here helps ensure that the majority of Linux distributions will use a
            // color prompt as defined in the default ~/.bashrc file.
            name = 'xterm-256color';
        }
        this._initialCwd = cwd;
        this._properties["initialCwd" /* ProcessPropertyType.InitialCwd */] = this._initialCwd;
        this._properties["cwd" /* ProcessPropertyType.Cwd */] = this._initialCwd;
        const useConpty = this._options.windowsEnableConpty && process.platform === 'win32' && getWindowsBuildNumber() >= 18309;
        const useConptyDll = useConpty && this._options.windowsUseConptyDll;
        this._ptyOptions = {
            name,
            cwd,
            // TODO: When node-pty is updated this cast can be removed
            env: env,
            cols,
            rows,
            useConpty,
            useConptyDll,
            // This option will force conpty to not redraw the whole viewport on launch
            conptyInheritCursor: useConpty && !!shellLaunchConfig.initialText
        };
        // Delay resizes to avoid conpty not respecting very early resize calls
        if (isWindows) {
            if (useConpty && cols === 0 && rows === 0 && this.shellLaunchConfig.executable?.endsWith('Git\\bin\\bash.exe')) {
                this._delayedResizer = new DelayedResizer();
                this._register(this._delayedResizer.onTrigger(dimensions => {
                    this._delayedResizer?.dispose();
                    this._delayedResizer = undefined;
                    if (dimensions.cols && dimensions.rows) {
                        this.resize(dimensions.cols, dimensions.rows);
                    }
                }));
            }
            // WindowsShellHelper is used to fetch the process title and shell type
            this.onProcessReady(e => {
                this._windowsShellHelper = this._register(new WindowsShellHelper(e.pid));
                this._register(this._windowsShellHelper.onShellTypeChanged(e => this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: e })));
                this._register(this._windowsShellHelper.onShellNameChanged(e => this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: e })));
            });
        }
        this._register(toDisposable(() => {
            if (this._titleInterval) {
                clearInterval(this._titleInterval);
                this._titleInterval = null;
            }
        }));
    }
    async start() {
        const results = await Promise.all([this._validateCwd(), this._validateExecutable()]);
        const firstError = results.find(r => r !== undefined);
        if (firstError) {
            return firstError;
        }
        let injection;
        if (this._options.shellIntegration.enabled) {
            injection = await getShellIntegrationInjection(this.shellLaunchConfig, this._options, this._ptyOptions.env, this._logService, this._productService);
            if (injection) {
                this._onDidChangeProperty.fire({ type: "usedShellIntegrationInjection" /* ProcessPropertyType.UsedShellIntegrationInjection */, value: true });
                if (injection.envMixin) {
                    for (const [key, value] of Object.entries(injection.envMixin)) {
                        this._ptyOptions.env ||= {};
                        this._ptyOptions.env[key] = value;
                    }
                }
                if (injection.filesToCopy) {
                    for (const f of injection.filesToCopy) {
                        try {
                            await fs.promises.mkdir(path.dirname(f.dest), { recursive: true });
                            await fs.promises.copyFile(f.source, f.dest);
                        }
                        catch {
                            // Swallow error, this should only happen when multiple users are on the same
                            // machine. Since the shell integration scripts rarely change, plus the other user
                            // should be using the same version of the server in this case, assume the script is
                            // fine if copy fails and swallow the error.
                        }
                    }
                }
            }
            else {
                this._onDidChangeProperty.fire({ type: "failedShellIntegrationActivation" /* ProcessPropertyType.FailedShellIntegrationActivation */, value: true });
            }
        }
        try {
            await this.setupPtyProcess(this.shellLaunchConfig, this._ptyOptions, injection);
            if (injection?.newArgs) {
                return { injectedArgs: injection.newArgs };
            }
            return undefined;
        }
        catch (err) {
            this._logService.trace('node-pty.node-pty.IPty#spawn native exception', err);
            return { message: `A native exception occurred during launch (${err.message})` };
        }
    }
    async _validateCwd() {
        try {
            const result = await fs.promises.stat(this._initialCwd);
            if (!result.isDirectory()) {
                return { message: localize('launchFail.cwdNotDirectory', "Starting directory (cwd) \"{0}\" is not a directory", this._initialCwd.toString()) };
            }
        }
        catch (err) {
            if (err?.code === 'ENOENT') {
                return { message: localize('launchFail.cwdDoesNotExist', "Starting directory (cwd) \"{0}\" does not exist", this._initialCwd.toString()) };
            }
        }
        this._onDidChangeProperty.fire({ type: "initialCwd" /* ProcessPropertyType.InitialCwd */, value: this._initialCwd });
        return undefined;
    }
    async _validateExecutable() {
        const slc = this.shellLaunchConfig;
        if (!slc.executable) {
            throw new Error('IShellLaunchConfig.executable not set');
        }
        const cwd = slc.cwd instanceof URI ? slc.cwd.path : slc.cwd;
        const envPaths = (slc.env && slc.env.PATH) ? slc.env.PATH.split(path.delimiter) : undefined;
        const executable = await findExecutable(slc.executable, cwd, envPaths, this._executableEnv);
        if (!executable) {
            return { message: localize('launchFail.executableDoesNotExist', "Path to shell executable \"{0}\" does not exist", slc.executable) };
        }
        try {
            const result = await fs.promises.stat(executable);
            if (!result.isFile() && !result.isSymbolicLink()) {
                return { message: localize('launchFail.executableIsNotFileOrSymlink', "Path to shell executable \"{0}\" is not a file or a symlink", slc.executable) };
            }
            // Set the executable explicitly here so that node-pty doesn't need to search the
            // $PATH too.
            slc.executable = executable;
        }
        catch (err) {
            if (err?.code === 'EACCES') {
                // Swallow
            }
            else {
                throw err;
            }
        }
        return undefined;
    }
    async setupPtyProcess(shellLaunchConfig, options, shellIntegrationInjection) {
        const args = shellIntegrationInjection?.newArgs || shellLaunchConfig.args || [];
        await this._throttleKillSpawn();
        this._logService.trace('node-pty.IPty#spawn', shellLaunchConfig.executable, args, options);
        const ptyProcess = spawn(shellLaunchConfig.executable, args, options);
        this._ptyProcess = ptyProcess;
        this._childProcessMonitor = this._register(new ChildProcessMonitor(ptyProcess.pid, this._logService));
        this._childProcessMonitor.onDidChangeHasChildProcesses(value => this._onDidChangeProperty.fire({ type: "hasChildProcesses" /* ProcessPropertyType.HasChildProcesses */, value }));
        this._processStartupComplete = new Promise(c => {
            this.onProcessReady(() => c());
        });
        ptyProcess.onData(data => {
            // Handle flow control
            this._unacknowledgedCharCount += data.length;
            if (!this._isPtyPaused && this._unacknowledgedCharCount > 100000 /* FlowControlConstants.HighWatermarkChars */) {
                this._logService.trace(`Flow control: Pause (${this._unacknowledgedCharCount} > ${100000 /* FlowControlConstants.HighWatermarkChars */})`);
                this._isPtyPaused = true;
                ptyProcess.pause();
            }
            // Refire the data event
            this._logService.trace('node-pty.IPty#onData', data);
            this._onProcessData.fire(data);
            if (this._closeTimeout) {
                this._queueProcessExit();
            }
            this._windowsShellHelper?.checkShell();
            this._childProcessMonitor?.handleOutput();
        });
        ptyProcess.onExit(e => {
            this._exitCode = e.exitCode;
            this._queueProcessExit();
        });
        this._sendProcessId(ptyProcess.pid);
        this._setupTitlePolling(ptyProcess);
    }
    _setupTitlePolling(ptyProcess) {
        // Send initial timeout async to give event listeners a chance to init
        setTimeout(() => this._sendProcessTitle(ptyProcess));
        // Setup polling for non-Windows, for Windows `process` doesn't change
        if (!isWindows) {
            this._titleInterval = setInterval(() => {
                if (this._currentTitle !== ptyProcess.process) {
                    this._sendProcessTitle(ptyProcess);
                }
            }, 200);
        }
    }
    // Allow any trailing data events to be sent before the exit event is sent.
    // See https://github.com/Tyriar/node-pty/issues/72
    _queueProcessExit() {
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('TerminalProcess#_queueProcessExit', new Error().stack?.replace(/^Error/, ''));
        }
        if (this._closeTimeout) {
            clearTimeout(this._closeTimeout);
        }
        this._closeTimeout = setTimeout(() => {
            this._closeTimeout = undefined;
            this._kill();
        }, 250 /* ShutdownConstants.DataFlushTimeout */);
    }
    async _kill() {
        // Wait to kill to process until the start up code has run. This prevents us from firing a process exit before a
        // process start.
        await this._processStartupComplete;
        if (this._store.isDisposed) {
            return;
        }
        // Attempt to kill the pty, it may have already been killed at this
        // point but we want to make sure
        try {
            if (this._ptyProcess) {
                await this._throttleKillSpawn();
                this._logService.trace('node-pty.IPty#kill');
                this._ptyProcess.kill();
            }
        }
        catch (ex) {
            // Swallow, the pty has already been killed
        }
        this._onProcessExit.fire(this._exitCode || 0);
        this.dispose();
    }
    async _throttleKillSpawn() {
        // Only throttle on Windows/conpty
        if (!isWindows || !('useConpty' in this._ptyOptions) || !this._ptyOptions.useConpty) {
            return;
        }
        // Don't throttle when using conpty.dll as it seems to have been fixed in later versions
        if (this._ptyOptions.useConptyDll) {
            return;
        }
        // Use a loop to ensure multiple calls in a single interval space out
        while (Date.now() - TerminalProcess_1._lastKillOrStart < 250 /* Constants.KillSpawnThrottleInterval */) {
            this._logService.trace('Throttling kill/spawn call');
            await timeout(250 /* Constants.KillSpawnThrottleInterval */ - (Date.now() - TerminalProcess_1._lastKillOrStart) + 50 /* Constants.KillSpawnSpacingDuration */);
        }
        TerminalProcess_1._lastKillOrStart = Date.now();
    }
    _sendProcessId(pid) {
        this._onProcessReady.fire({
            pid,
            cwd: this._initialCwd,
            windowsPty: this.getWindowsPty()
        });
    }
    _sendProcessTitle(ptyProcess) {
        if (this._store.isDisposed) {
            return;
        }
        // HACK: The node-pty API can return undefined somehow https://github.com/microsoft/vscode/issues/222323
        this._currentTitle = (ptyProcess.process ?? '');
        this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: this._currentTitle });
        // If fig is installed it may change the title of the process
        let sanitizedTitle = this.currentTitle.replace(/ \(figterm\)$/g, '');
        // Ensure any prefixed path is removed so that the executable name since we use this to
        // detect the shell type
        if (!isWindows) {
            sanitizedTitle = path.basename(sanitizedTitle);
        }
        if (sanitizedTitle.toLowerCase().startsWith('python')) {
            this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: "python" /* GeneralShellType.Python */ });
        }
        else if (sanitizedTitle.toLowerCase().startsWith('julia')) {
            this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: "julia" /* GeneralShellType.Julia */ });
        }
        else {
            const shellTypeValue = posixShellTypeMap.get(sanitizedTitle) || generalShellTypeMap.get(sanitizedTitle);
            this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: shellTypeValue });
        }
    }
    shutdown(immediate) {
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('TerminalProcess#shutdown', new Error().stack?.replace(/^Error/, ''));
        }
        // don't force immediate disposal of the terminal processes on Windows as an additional
        // mitigation for https://github.com/microsoft/vscode/issues/71966 which causes the pty host
        // to become unresponsive, disconnecting all terminals across all windows.
        if (immediate && !isWindows) {
            this._kill();
        }
        else {
            if (!this._closeTimeout && !this._store.isDisposed) {
                this._queueProcessExit();
                // Allow a maximum amount of time for the process to exit, otherwise force kill it
                setTimeout(() => {
                    if (this._closeTimeout && !this._store.isDisposed) {
                        this._closeTimeout = undefined;
                        this._kill();
                    }
                }, 5000 /* ShutdownConstants.MaximumShutdownTime */);
            }
        }
    }
    input(data, isBinary = false) {
        if (this._store.isDisposed || !this._ptyProcess) {
            return;
        }
        this._writeQueue.push(...chunkInput(data).map(e => {
            return { isBinary, data: e };
        }));
        this._startWrite();
    }
    async processBinary(data) {
        this.input(data, true);
    }
    async refreshProperty(type) {
        switch (type) {
            case "cwd" /* ProcessPropertyType.Cwd */: {
                const newCwd = await this.getCwd();
                if (newCwd !== this._properties.cwd) {
                    this._properties.cwd = newCwd;
                    this._onDidChangeProperty.fire({ type: "cwd" /* ProcessPropertyType.Cwd */, value: this._properties.cwd });
                }
                return newCwd;
            }
            case "initialCwd" /* ProcessPropertyType.InitialCwd */: {
                const initialCwd = await this.getInitialCwd();
                if (initialCwd !== this._properties.initialCwd) {
                    this._properties.initialCwd = initialCwd;
                    this._onDidChangeProperty.fire({ type: "initialCwd" /* ProcessPropertyType.InitialCwd */, value: this._properties.initialCwd });
                }
                return initialCwd;
            }
            case "title" /* ProcessPropertyType.Title */:
                return this.currentTitle;
            default:
                return this.shellType;
        }
    }
    async updateProperty(type, value) {
        if (type === "fixedDimensions" /* ProcessPropertyType.FixedDimensions */) {
            this._properties.fixedDimensions = value;
        }
    }
    _startWrite() {
        // Don't write if it's already queued of is there is nothing to write
        if (this._writeTimeout !== undefined || this._writeQueue.length === 0) {
            return;
        }
        this._doWrite();
        // Don't queue more writes if the queue is empty
        if (this._writeQueue.length === 0) {
            this._writeTimeout = undefined;
            return;
        }
        // Queue the next write
        this._writeTimeout = setTimeout(() => {
            this._writeTimeout = undefined;
            this._startWrite();
        }, 5 /* Constants.WriteInterval */);
    }
    _doWrite() {
        const object = this._writeQueue.shift();
        this._logService.trace('node-pty.IPty#write', object.data);
        if (object.isBinary) {
            this._ptyProcess.write(Buffer.from(object.data, 'binary'));
        }
        else {
            this._ptyProcess.write(object.data);
        }
        this._childProcessMonitor?.handleInput();
    }
    resize(cols, rows) {
        if (this._store.isDisposed) {
            return;
        }
        if (typeof cols !== 'number' || typeof rows !== 'number' || isNaN(cols) || isNaN(rows)) {
            return;
        }
        // Ensure that cols and rows are always >= 1, this prevents a native
        // exception in winpty.
        if (this._ptyProcess) {
            cols = Math.max(cols, 1);
            rows = Math.max(rows, 1);
            // Delay resize if needed
            if (this._delayedResizer) {
                this._delayedResizer.cols = cols;
                this._delayedResizer.rows = rows;
                return;
            }
            this._logService.trace('node-pty.IPty#resize', cols, rows);
            try {
                this._ptyProcess.resize(cols, rows);
            }
            catch (e) {
                // Swallow error if the pty has already exited
                this._logService.trace('node-pty.IPty#resize exception ' + e.message);
                if (this._exitCode !== undefined &&
                    e.message !== 'ioctl(2) failed, EBADF' &&
                    e.message !== 'Cannot resize a pty that has already exited') {
                    throw e;
                }
            }
        }
    }
    clearBuffer() {
        this._ptyProcess?.clear();
    }
    acknowledgeDataEvent(charCount) {
        // Prevent lower than 0 to heal from errors
        this._unacknowledgedCharCount = Math.max(this._unacknowledgedCharCount - charCount, 0);
        this._logService.trace(`Flow control: Ack ${charCount} chars (unacknowledged: ${this._unacknowledgedCharCount})`);
        if (this._isPtyPaused && this._unacknowledgedCharCount < 5000 /* FlowControlConstants.LowWatermarkChars */) {
            this._logService.trace(`Flow control: Resume (${this._unacknowledgedCharCount} < ${5000 /* FlowControlConstants.LowWatermarkChars */})`);
            this._ptyProcess?.resume();
            this._isPtyPaused = false;
        }
    }
    clearUnacknowledgedChars() {
        this._unacknowledgedCharCount = 0;
        this._logService.trace(`Flow control: Cleared all unacknowledged chars, forcing resume`);
        if (this._isPtyPaused) {
            this._ptyProcess?.resume();
            this._isPtyPaused = false;
        }
    }
    async setUnicodeVersion(version) {
        // No-op
    }
    getInitialCwd() {
        return Promise.resolve(this._initialCwd);
    }
    async getCwd() {
        if (isMacintosh) {
            // From Big Sur (darwin v20) there is a spawn blocking thread issue on Electron,
            // this is fixed in VS Code's internal Electron.
            // https://github.com/Microsoft/vscode/issues/105446
            return new Promise(resolve => {
                if (!this._ptyProcess) {
                    resolve(this._initialCwd);
                    return;
                }
                this._logService.trace('node-pty.IPty#pid');
                exec('lsof -OPln -p ' + this._ptyProcess.pid + ' | grep cwd', { env: { ...process.env, LANG: 'en_US.UTF-8' } }, (error, stdout, stderr) => {
                    if (!error && stdout !== '') {
                        resolve(stdout.substring(stdout.indexOf('/'), stdout.length - 1));
                    }
                    else {
                        this._logService.error('lsof did not run successfully, it may not be on the $PATH?', error, stdout, stderr);
                        resolve(this._initialCwd);
                    }
                });
            });
        }
        if (isLinux) {
            if (!this._ptyProcess) {
                return this._initialCwd;
            }
            this._logService.trace('node-pty.IPty#pid');
            try {
                return await fs.promises.readlink(`/proc/${this._ptyProcess.pid}/cwd`);
            }
            catch (error) {
                return this._initialCwd;
            }
        }
        return this._initialCwd;
    }
    getWindowsPty() {
        return isWindows ? {
            backend: 'useConpty' in this._ptyOptions && this._ptyOptions.useConpty ? 'conpty' : 'winpty',
            buildNumber: getWindowsBuildNumber()
        } : undefined;
    }
};
TerminalProcess = TerminalProcess_1 = __decorate([
    __param(7, ILogService),
    __param(8, IProductService)
], TerminalProcess);
export { TerminalProcess };
/**
 * Tracks the latest resize event to be trigger at a later point.
 */
class DelayedResizer extends Disposable {
    get onTrigger() { return this._onTrigger.event; }
    constructor() {
        super();
        this._onTrigger = this._register(new Emitter());
        this._timeout = setTimeout(() => {
            this._onTrigger.fire({ rows: this.rows, cols: this.cols });
        }, 1000);
        this._register(toDisposable(() => clearTimeout(this._timeout)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS90ZXJtaW5hbFByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxFQUF1QixPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxxQkFBcUIsRUFBb0MsTUFBTSwwQkFBMEIsQ0FBQztBQUNqSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUs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