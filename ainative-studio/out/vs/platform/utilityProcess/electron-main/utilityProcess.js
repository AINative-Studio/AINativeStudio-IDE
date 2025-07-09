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
var UtilityProcess_1;
import { MessageChannelMain, app, utilityProcess } from 'electron';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { ILogService } from '../../log/common/log.js';
import { StringDecoder } from 'string_decoder';
import { timeout } from '../../../base/common/async.js';
import { FileAccess } from '../../../base/common/network.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import Severity from '../../../base/common/severity.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { removeDangerousEnvVariables } from '../../../base/common/processes.js';
import { deepClone } from '../../../base/common/objects.js';
import { isWindows } from '../../../base/common/platform.js';
import { isUNCAccessRestrictionsDisabled, getUNCHostAllowlist } from '../../../base/node/unc.js';
function isWindowUtilityProcessConfiguration(config) {
    const candidate = config;
    return typeof candidate.responseWindowId === 'number';
}
let UtilityProcess = class UtilityProcess extends Disposable {
    static { UtilityProcess_1 = this; }
    static { this.ID_COUNTER = 0; }
    static { this.all = new Map(); }
    static getAll() {
        return Array.from(UtilityProcess_1.all.values());
    }
    constructor(logService, telemetryService, lifecycleMainService) {
        super();
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.lifecycleMainService = lifecycleMainService;
        this.id = String(++UtilityProcess_1.ID_COUNTER);
        this._onStdout = this._register(new Emitter());
        this.onStdout = this._onStdout.event;
        this._onStderr = this._register(new Emitter());
        this.onStderr = this._onStderr.event;
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onSpawn = this._register(new Emitter());
        this.onSpawn = this._onSpawn.event;
        this._onExit = this._register(new Emitter());
        this.onExit = this._onExit.event;
        this._onCrash = this._register(new Emitter());
        this.onCrash = this._onCrash.event;
        this.process = undefined;
        this.processPid = undefined;
        this.configuration = undefined;
    }
    log(msg, severity) {
        let logMsg;
        if (this.configuration?.correlationId) {
            logMsg = `[UtilityProcess id: ${this.configuration?.correlationId}, type: ${this.configuration?.type}, pid: ${this.processPid ?? '<none>'}]: ${msg}`;
        }
        else {
            logMsg = `[UtilityProcess type: ${this.configuration?.type}, pid: ${this.processPid ?? '<none>'}]: ${msg}`;
        }
        switch (severity) {
            case Severity.Error:
                this.logService.error(logMsg);
                break;
            case Severity.Warning:
                this.logService.warn(logMsg);
                break;
            case Severity.Info:
                this.logService.trace(logMsg);
                break;
        }
    }
    validateCanStart() {
        if (this.process) {
            this.log('Cannot start utility process because it is already running...', Severity.Error);
            return false;
        }
        return true;
    }
    start(configuration) {
        const started = this.doStart(configuration);
        if (started && configuration.payload) {
            const posted = this.postMessage(configuration.payload);
            if (posted) {
                this.log('payload sent via postMessage()', Severity.Info);
            }
        }
        return started;
    }
    doStart(configuration) {
        if (!this.validateCanStart()) {
            return false;
        }
        this.configuration = configuration;
        const serviceName = `${this.configuration.type}-${this.id}`;
        const modulePath = FileAccess.asFileUri('bootstrap-fork.js').fsPath;
        const args = this.configuration.args ?? [];
        const execArgv = this.configuration.execArgv ?? [];
        const allowLoadingUnsignedLibraries = this.configuration.allowLoadingUnsignedLibraries;
        const respondToAuthRequestsFromMainProcess = this.configuration.respondToAuthRequestsFromMainProcess;
        const stdio = 'pipe';
        const env = this.createEnv(configuration);
        this.log('creating new...', Severity.Info);
        // Fork utility process
        this.process = utilityProcess.fork(modulePath, args, {
            serviceName,
            env,
            execArgv, // !!! Add `--trace-warnings` for node.js tracing !!!
            allowLoadingUnsignedLibraries,
            respondToAuthRequestsFromMainProcess,
            stdio
        });
        // Register to events
        this.registerListeners(this.process, this.configuration, serviceName);
        return true;
    }
    createEnv(configuration) {
        const env = configuration.env ? { ...configuration.env } : { ...deepClone(process.env) };
        // Apply supported environment variables from config
        env['VSCODE_ESM_ENTRYPOINT'] = configuration.entryPoint;
        if (typeof configuration.parentLifecycleBound === 'number') {
            env['VSCODE_PARENT_PID'] = String(configuration.parentLifecycleBound);
        }
        env['VSCODE_CRASH_REPORTER_PROCESS_TYPE'] = configuration.type;
        if (isWindows) {
            if (isUNCAccessRestrictionsDisabled()) {
                env['NODE_DISABLE_UNC_ACCESS_CHECKS'] = '1';
            }
            else {
                env['NODE_UNC_HOST_ALLOWLIST'] = getUNCHostAllowlist().join('\\');
            }
        }
        // Remove any environment variables that are not allowed
        removeDangerousEnvVariables(env);
        // Ensure all values are strings, otherwise the process will not start
        for (const key of Object.keys(env)) {
            env[key] = String(env[key]);
        }
        return env;
    }
    registerListeners(process, configuration, serviceName) {
        // Stdout
        if (process.stdout) {
            const stdoutDecoder = new StringDecoder('utf-8');
            this._register(Event.fromNodeEventEmitter(process.stdout, 'data')(chunk => this._onStdout.fire(typeof chunk === 'string' ? chunk : stdoutDecoder.write(chunk))));
        }
        // Stderr
        if (process.stderr) {
            const stderrDecoder = new StringDecoder('utf-8');
            this._register(Event.fromNodeEventEmitter(process.stderr, 'data')(chunk => this._onStderr.fire(typeof chunk === 'string' ? chunk : stderrDecoder.write(chunk))));
        }
        // Messages
        this._register(Event.fromNodeEventEmitter(process, 'message')(msg => this._onMessage.fire(msg)));
        // Spawn
        this._register(Event.fromNodeEventEmitter(process, 'spawn')(() => {
            this.processPid = process.pid;
            if (typeof process.pid === 'number') {
                UtilityProcess_1.all.set(process.pid, { pid: process.pid, name: isWindowUtilityProcessConfiguration(configuration) ? `${configuration.type} [${configuration.responseWindowId}]` : configuration.type });
            }
            this.log('successfully created', Severity.Info);
            this._onSpawn.fire(process.pid);
        }));
        // Exit
        this._register(Event.fromNodeEventEmitter(process, 'exit')(code => {
            this.log(`received exit event with code ${code}`, Severity.Info);
            // Event
            this._onExit.fire({ pid: this.processPid, code, signal: 'unknown' });
            // Cleanup
            this.onDidExitOrCrashOrKill();
        }));
        // V8 Error
        this._register(Event.fromNodeEventEmitter(process, 'error', (type, location, report) => ({ type, location, report }))(({ type, location, report }) => {
            this.log(`crashed due to ${type} from V8 at ${location}`, Severity.Info);
            let addons = [];
            try {
                const reportJSON = JSON.parse(report);
                addons = reportJSON.sharedObjects
                    .filter((sharedObject) => sharedObject.endsWith('.node'))
                    .map((addon) => {
                    const index = addon.indexOf('extensions') === -1 ? addon.indexOf('node_modules') : addon.indexOf('extensions');
                    return addon.substring(index);
                });
            }
            catch (e) {
                // ignore
            }
            this.telemetryService.publicLog2('utilityprocessv8error', {
                processtype: configuration.type,
                error: type,
                location,
                addons
            });
        }));
        // Child process gone
        this._register(Event.fromNodeEventEmitter(app, 'child-process-gone', (event, details) => ({ event, details }))(({ details }) => {
            if (details.type === 'Utility' && details.name === serviceName) {
                this.log(`crashed with code ${details.exitCode} and reason '${details.reason}'`, Severity.Error);
                this.telemetryService.publicLog2('utilityprocesscrash', {
                    type: configuration.type,
                    reason: details.reason,
                    code: details.exitCode
                });
                // Event
                this._onCrash.fire({ pid: this.processPid, code: details.exitCode, reason: details.reason });
                // Cleanup
                this.onDidExitOrCrashOrKill();
            }
        }));
    }
    once(message, callback) {
        const disposable = this._register(this._onMessage.event(msg => {
            if (msg === message) {
                disposable.dispose();
                callback();
            }
        }));
    }
    postMessage(message, transfer) {
        if (!this.process) {
            return false; // already killed, crashed or never started
        }
        this.process.postMessage(message, transfer);
        return true;
    }
    connect(payload) {
        const { port1: outPort, port2: utilityProcessPort } = new MessageChannelMain();
        this.postMessage(payload, [utilityProcessPort]);
        return outPort;
    }
    enableInspectPort() {
        if (!this.process || typeof this.processPid !== 'number') {
            return false;
        }
        this.log('enabling inspect port', Severity.Info);
        // use (undocumented) _debugProcess feature of node if available
        const processExt = process;
        if (typeof processExt._debugProcess === 'function') {
            processExt._debugProcess(this.processPid);
            return true;
        }
        // not supported...
        return false;
    }
    kill() {
        if (!this.process) {
            return; // already killed, crashed or never started
        }
        this.log('attempting to kill the process...', Severity.Info);
        const killed = this.process.kill();
        if (killed) {
            this.log('successfully killed the process', Severity.Info);
            this.onDidExitOrCrashOrKill();
        }
        else {
            this.log('unable to kill the process', Severity.Warning);
        }
    }
    onDidExitOrCrashOrKill() {
        if (typeof this.processPid === 'number') {
            UtilityProcess_1.all.delete(this.processPid);
        }
        this.process = undefined;
    }
    async waitForExit(maxWaitTimeMs) {
        if (!this.process) {
            return; // already killed, crashed or never started
        }
        this.log('waiting to exit...', Severity.Info);
        await Promise.race([Event.toPromise(this.onExit), timeout(maxWaitTimeMs)]);
        if (this.process) {
            this.log(`did not exit within ${maxWaitTimeMs}ms, will kill it now...`, Severity.Info);
            this.kill();
        }
    }
};
UtilityProcess = UtilityProcess_1 = __decorate([
    __param(0, ILogService),
    __param(1, ITelemetryService),
    __param(2, ILifecycleMainService)
], UtilityProcess);
export { UtilityProcess };
let WindowUtilityProcess = class WindowUtilityProcess extends UtilityProcess {
    constructor(logService, windowsMainService, telemetryService, lifecycleMainService) {
        super(logService, telemetryService, lifecycleMainService);
        this.windowsMainService = windowsMainService;
    }
    start(configuration) {
        const responseWindow = this.windowsMainService.getWindowById(configuration.responseWindowId);
        if (!responseWindow?.win || responseWindow.win.isDestroyed() || responseWindow.win.webContents.isDestroyed()) {
            this.log('Refusing to start utility process because requesting window cannot be found or is destroyed...', Severity.Error);
            return true;
        }
        // Start utility process
        const started = super.doStart(configuration);
        if (!started) {
            return false;
        }
        // Register to window events
        this.registerWindowListeners(responseWindow.win, configuration);
        // Establish & exchange message ports
        const windowPort = this.connect(configuration.payload);
        responseWindow.win.webContents.postMessage(configuration.responseChannel, configuration.responseNonce, [windowPort]);
        return true;
    }
    registerWindowListeners(window, configuration) {
        // If the lifecycle of the utility process is bound to the window,
        // we kill the process if the window closes or changes
        if (configuration.windowLifecycleBound) {
            this._register(Event.filter(this.lifecycleMainService.onWillLoadWindow, e => e.window.win === window)(() => this.kill()));
            this._register(Event.fromNodeEventEmitter(window, 'closed')(() => this.kill()));
        }
    }
};
WindowUtilityProcess = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, ITelemetryService),
    __param(3, ILifecycleMainService)
], WindowUtilityProcess);
export { WindowUtilityProcess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXRpbGl0eVByb2Nlc3MvZWxlY3Ryb24tbWFpbi91dGlsaXR5UHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEwQixrQkFBa0IsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUE0QyxNQUFNLFVBQVUsQ0FBQztBQUNySSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDOUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUs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