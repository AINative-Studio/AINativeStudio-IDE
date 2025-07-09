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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvdGVybWluYWxQcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RSxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JELE9BQU8sRUFBdUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUscUJBQXFCLEVBQW9DLE1BQU0sMEJBQTBCLENBQUM7QUFDakksT0FBTyxFQUFFLGtCQUFrQixFQUFF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