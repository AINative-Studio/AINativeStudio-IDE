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
import { timeout } from '../../../../base/common/async.js';
import { encodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import * as objects from '../../../../base/common/objects.js';
import * as platform from '../../../../base/common/platform.js';
import { removeDangerousEnvVariables } from '../../../../base/common/processes.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { BufferedEmitter } from '../../../../base/parts/ipc/common/ipc.net.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-sandbox/ipc.mp.js';
import * as nls from '../../../../nls.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { IExtensionHostStarter } from '../../../../platform/extensions/common/extensionHostStarter.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isLoggingOnly } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService, isUntitledWorkspace } from '../../../../platform/workspace/common/workspace.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IShellEnvironmentService } from '../../environment/electron-sandbox/shellEnvironmentService.js';
import { MessagePortExtHostConnection, writeExtHostConnection } from '../common/extensionHostEnv.js';
import { UIKind, isMessageOfType } from '../common/extensionHostProtocol.js';
import { IHostService } from '../../host/browser/host.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { parseExtensionDevOptions } from '../common/extensionDevOptions.js';
export class ExtensionHostProcess {
    get onStdout() {
        return this._extensionHostStarter.onDynamicStdout(this._id);
    }
    get onStderr() {
        return this._extensionHostStarter.onDynamicStderr(this._id);
    }
    get onMessage() {
        return this._extensionHostStarter.onDynamicMessage(this._id);
    }
    get onExit() {
        return this._extensionHostStarter.onDynamicExit(this._id);
    }
    constructor(id, _extensionHostStarter) {
        this._extensionHostStarter = _extensionHostStarter;
        this._id = id;
    }
    start(opts) {
        return this._extensionHostStarter.start(this._id, opts);
    }
    enableInspectPort() {
        return this._extensionHostStarter.enableInspectPort(this._id);
    }
    kill() {
        return this._extensionHostStarter.kill(this._id);
    }
}
let NativeLocalProcessExtensionHost = class NativeLocalProcessExtensionHost {
    constructor(runningLocation, startup, _initDataProvider, _contextService, _notificationService, _nativeHostService, _lifecycleService, _environmentService, _userDataProfilesService, _telemetryService, _logService, _loggerService, _labelService, _extensionHostDebugService, _hostService, _productService, _shellEnvironmentService, _extensionHostStarter) {
        this.runningLocation = runningLocation;
        this.startup = startup;
        this._initDataProvider = _initDataProvider;
        this._contextService = _contextService;
        this._notificationService = _notificationService;
        this._nativeHostService = _nativeHostService;
        this._lifecycleService = _lifecycleService;
        this._environmentService = _environmentService;
        this._userDataProfilesService = _userDataProfilesService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._labelService = _labelService;
        this._extensionHostDebugService = _extensionHostDebugService;
        this._hostService = _hostService;
        this._productService = _productService;
        this._shellEnvironmentService = _shellEnvironmentService;
        this._extensionHostStarter = _extensionHostStarter;
        this.pid = null;
        this.remoteAuthority = null;
        this.extensions = null;
        this._onExit = new Emitter();
        this.onExit = this._onExit.event;
        this._onDidSetInspectPort = new Emitter();
        this._toDispose = new DisposableStore();
        const devOpts = parseExtensionDevOptions(this._environmentService);
        this._isExtensionDevHost = devOpts.isExtensionDevHost;
        this._isExtensionDevDebug = devOpts.isExtensionDevDebug;
        this._isExtensionDevDebugBrk = devOpts.isExtensionDevDebugBrk;
        this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;
        this._terminating = false;
        this._inspectListener = null;
        this._extensionHostProcess = null;
        this._messageProtocol = null;
        this._toDispose.add(this._onExit);
        this._toDispose.add(this._lifecycleService.onWillShutdown(e => this._onWillShutdown(e)));
        this._toDispose.add(this._extensionHostDebugService.onClose(event => {
            if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId === event.sessionId) {
                this._nativeHostService.closeWindow();
            }
        }));
        this._toDispose.add(this._extensionHostDebugService.onReload(event => {
            if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId === event.sessionId) {
                this._hostService.reload();
            }
        }));
    }
    dispose() {
        if (this._terminating) {
            return;
        }
        this._terminating = true;
        this._toDispose.dispose();
    }
    start() {
        if (this._terminating) {
            // .terminate() was called
            throw new CancellationError();
        }
        if (!this._messageProtocol) {
            this._messageProtocol = this._start();
        }
        return this._messageProtocol;
    }
    async _start() {
        const [extensionHostCreationResult, portNumber, processEnv] = await Promise.all([
            this._extensionHostStarter.createExtensionHost(),
            this._tryFindDebugPort(),
            this._shellEnvironmentService.getShellEnv(),
        ]);
        this._extensionHostProcess = new ExtensionHostProcess(extensionHostCreationResult.id, this._extensionHostStarter);
        const env = objects.mixin(processEnv, {
            VSCODE_ESM_ENTRYPOINT: 'vs/workbench/api/node/extensionHostProcess',
            VSCODE_HANDLES_UNCAUGHT_ERRORS: true
        });
        if (this._environmentService.debugExtensionHost.env) {
            objects.mixin(env, this._environmentService.debugExtensionHost.env);
        }
        removeDangerousEnvVariables(env);
        if (this._isExtensionDevHost) {
            // Unset `VSCODE_CODE_CACHE_PATH` when developing extensions because it might
            // be that dependencies, that otherwise would be cached, get modified.
            delete env['VSCODE_CODE_CACHE_PATH'];
        }
        const opts = {
            responseWindowId: this._nativeHostService.windowId,
            responseChannel: 'vscode:startExtensionHostMessagePortResult',
            responseNonce: generateUuid(),
            env,
            // We only detach the extension host on windows. Linux and Mac orphan by default
            // and detach under Linux and Mac create another process group.
            // We detach because we have noticed that when the renderer exits, its child processes
            // (i.e. extension host) are taken down in a brutal fashion by the OS
            detached: !!platform.isWindows,
            execArgv: undefined,
            silent: true
        };
        const inspectHost = '127.0.0.1';
        if (portNumber !== 0) {
            opts.execArgv = [
                '--nolazy',
                (this._isExtensionDevDebugBrk ? '--inspect-brk=' : '--inspect=') + `${inspectHost}:${portNumber}`
            ];
        }
        else {
            opts.execArgv = ['--inspect-port=0'];
        }
        if (this._environmentService.extensionTestsLocationURI) {
            opts.execArgv.unshift('--expose-gc');
        }
        if (this._environmentService.args['prof-v8-extensions']) {
            opts.execArgv.unshift('--prof');
        }
        // Refs https://github.com/microsoft/vscode/issues/189805
        opts.execArgv.unshift('--dns-result-order=ipv4first');
        const onStdout = this._handleProcessOutputStream(this._extensionHostProcess.onStdout, this._toDispose);
        const onStderr = this._handleProcessOutputStream(this._extensionHostProcess.onStderr, this._toDispose);
        const onOutput = Event.any(Event.map(onStdout.event, o => ({ data: `%c${o}`, format: [''] })), Event.map(onStderr.event, o => ({ data: `%c${o}`, format: ['color: red'] })));
        // Debounce all output, so we can render it in the Chrome console as a group
        const onDebouncedOutput = Event.debounce(onOutput, (r, o) => {
            return r
                ? { data: r.data + o.data, format: [...r.format, ...o.format] }
                : { data: o.data, format: o.format };
        }, 100);
        // Print out extension host output
        this._toDispose.add(onDebouncedOutput(output => {
            const inspectorUrlMatch = output.data && output.data.match(/ws:\/\/([^\s]+):(\d+)\/[^\s]+/);
            if (inspectorUrlMatch) {
                const [, host, port] = inspectorUrlMatch;
                if (!this._environmentService.isBuilt && !this._isExtensionDevTestFromCli) {
                    console.log(`%c[Extension Host] %cdebugger inspector at devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${inspectorUrlMatch[1]}`, 'color: blue', 'color:');
                }
                if (!this._inspectListener) {
                    this._inspectListener = { host, port: Number(port) };
                    this._onDidSetInspectPort.fire();
                }
            }
            else {
                if (!this._isExtensionDevTestFromCli) {
                    console.group('Extension Host');
                    console.log(output.data, ...output.format);
                    console.groupEnd();
                }
            }
        }));
        // Lifecycle
        this._toDispose.add(this._extensionHostProcess.onExit(({ code, signal }) => this._onExtHostProcessExit(code, signal)));
        // Notify debugger that we are ready to attach to the process if we run a development extension
        if (portNumber) {
            if (this._isExtensionDevHost && this._isExtensionDevDebug && this._environmentService.debugExtensionHost.debugId) {
                this._extensionHostDebugService.attachSession(this._environmentService.debugExtensionHost.debugId, portNumber);
            }
            this._inspectListener = { port: portNumber, host: inspectHost };
            this._onDidSetInspectPort.fire();
        }
        // Help in case we fail to start it
        let startupTimeoutHandle;
        if (!this._environmentService.isBuilt && !this._environmentService.remoteAuthority || this._isExtensionDevHost) {
            startupTimeoutHandle = setTimeout(() => {
                this._logService.error(`[LocalProcessExtensionHost]: Extension host did not start in 10 seconds (debugBrk: ${this._isExtensionDevDebugBrk})`);
                const msg = this._isExtensionDevDebugBrk
                    ? nls.localize('extensionHost.startupFailDebug', "Extension host did not start in 10 seconds, it might be stopped on the first line and needs a debugger to continue.")
                    : nls.localize('extensionHost.startupFail', "Extension host did not start in 10 seconds, that might be a problem.");
                this._notificationService.prompt(Severity.Warning, msg, [{
                        label: nls.localize('reloadWindow', "Reload Window"),
                        run: () => this._hostService.reload()
                    }], {
                    sticky: true,
                    priority: NotificationPriority.URGENT
                });
            }, 10000);
        }
        // Initialize extension host process with hand shakes
        const protocol = await this._establishProtocol(this._extensionHostProcess, opts);
        await this._performHandshake(protocol);
        clearTimeout(startupTimeoutHandle);
        return protocol;
    }
    /**
     * Find a free port if extension host debugging is enabled.
     */
    async _tryFindDebugPort() {
        if (typeof this._environmentService.debugExtensionHost.port !== 'number') {
            return 0;
        }
        const expected = this._environmentService.debugExtensionHost.port;
        const port = await this._nativeHostService.findFreePort(expected, 10 /* try 10 ports */, 5000 /* try up to 5 seconds */, 2048 /* skip 2048 ports between attempts */);
        if (!this._isExtensionDevTestFromCli) {
            if (!port) {
                console.warn('%c[Extension Host] %cCould not find a free port for debugging', 'color: blue', 'color:');
            }
            else {
                if (port !== expected) {
                    console.warn(`%c[Extension Host] %cProvided debugging port ${expected} is not free, using ${port} instead.`, 'color: blue', 'color:');
                }
                if (this._isExtensionDevDebugBrk) {
                    console.warn(`%c[Extension Host] %cSTOPPED on first line for debugging on port ${port}`, 'color: blue', 'color:');
                }
                else {
                    console.info(`%c[Extension Host] %cdebugger listening on port ${port}`, 'color: blue', 'color:');
                }
            }
        }
        return port || 0;
    }
    _establishProtocol(extensionHostProcess, opts) {
        writeExtHostConnection(new MessagePortExtHostConnection(), opts.env);
        // Get ready to acquire the message port from the shared process worker
        const portPromise = acquirePort(undefined /* we trigger the request via service call! */, opts.responseChannel, opts.responseNonce);
        return new Promise((resolve, reject) => {
            const handle = setTimeout(() => {
                reject('The local extension host took longer than 60s to connect.');
            }, 60 * 1000);
            portPromise.then((port) => {
                this._toDispose.add(toDisposable(() => {
                    // Close the message port when the extension host is disposed
                    port.close();
                }));
                clearTimeout(handle);
                const onMessage = new BufferedEmitter();
                port.onmessage = ((e) => {
                    if (e.data) {
                        onMessage.fire(VSBuffer.wrap(e.data));
                    }
                });
                port.start();
                resolve({
                    onMessage: onMessage.event,
                    send: message => port.postMessage(message.buffer),
                });
            });
            // Now that the message port listener is installed, start the ext host process
            const sw = StopWatch.create(false);
            extensionHostProcess.start(opts).then(({ pid }) => {
                if (pid) {
                    this.pid = pid;
                }
                this._logService.info(`Started local extension host with pid ${pid}.`);
                const duration = sw.elapsed();
                if (platform.isCI) {
                    this._logService.info(`IExtensionHostStarter.start() took ${duration} ms.`);
                }
            }, (err) => {
                // Starting the ext host process resulted in an error
                reject(err);
            });
        });
    }
    _performHandshake(protocol) {
        // 1) wait for the incoming `ready` event and send the initialization data.
        // 2) wait for the incoming `initialized` event.
        return new Promise((resolve, reject) => {
            let timeoutHandle;
            const installTimeoutCheck = () => {
                timeoutHandle = setTimeout(() => {
                    reject('The local extension host took longer than 60s to send its ready message.');
                }, 60 * 1000);
            };
            const uninstallTimeoutCheck = () => {
                clearTimeout(timeoutHandle);
            };
            // Wait 60s for the ready message
            installTimeoutCheck();
            const disposable = protocol.onMessage(msg => {
                if (isMessageOfType(msg, 1 /* MessageType.Ready */)) {
                    // 1) Extension Host is ready to receive messages, initialize it
                    uninstallTimeoutCheck();
                    this._createExtHostInitData().then(data => {
                        // Wait 60s for the initialized message
                        installTimeoutCheck();
                        protocol.send(VSBuffer.fromString(JSON.stringify(data)));
                    });
                    return;
                }
                if (isMessageOfType(msg, 0 /* MessageType.Initialized */)) {
                    // 2) Extension Host is initialized
                    uninstallTimeoutCheck();
                    // stop listening for messages here
                    disposable.dispose();
                    // release this promise
                    resolve();
                    return;
                }
                console.error(`received unexpected message during handshake phase from the extension host: `, msg);
            });
        });
    }
    async _createExtHostInitData() {
        const initData = await this._initDataProvider.getInitData();
        this.extensions = initData.extensions;
        const workspace = this._contextService.getWorkspace();
        return {
            commit: this._productService.commit,
            version: this._productService.version,
            quality: this._productService.quality,
            parentPid: 0,
            environment: {
                isExtensionDevelopmentDebug: this._isExtensionDevDebug,
                appRoot: this._environmentService.appRoot ? URI.file(this._environmentService.appRoot) : undefined,
                appName: this._productService.nameLong,
                appHost: this._productService.embedderIdentifier || 'desktop',
                appUriScheme: this._productService.urlProtocol,
                isExtensionTelemetryLoggingOnly: isLoggingOnly(this._productService, this._environmentService),
                appLanguage: platform.language,
                extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
                extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
                globalStorageHome: this._userDataProfilesService.defaultProfile.globalStorageHome,
                workspaceStorageHome: this._environmentService.workspaceStorageHome,
                extensionLogLevel: this._environmentService.extensionLogLevel
            },
            workspace: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? undefined : {
                configuration: workspace.configuration ?? undefined,
                id: workspace.id,
                name: this._labelService.getWorkspaceLabel(workspace),
                isUntitled: workspace.configuration ? isUntitledWorkspace(workspace.configuration, this._environmentService) : false,
                transient: workspace.transient
            },
            remote: {
                authority: this._environmentService.remoteAuthority,
                connectionData: null,
                isRemote: false
            },
            consoleForward: {
                includeStack: !this._isExtensionDevTestFromCli && (this._isExtensionDevHost || !this._environmentService.isBuilt || this._productService.quality !== 'stable' || this._environmentService.verbose),
                logNative: !this._isExtensionDevTestFromCli && this._isExtensionDevHost
            },
            extensions: this.extensions.toSnapshot(),
            telemetryInfo: {
                sessionId: this._telemetryService.sessionId,
                machineId: this._telemetryService.machineId,
                sqmId: this._telemetryService.sqmId,
                devDeviceId: this._telemetryService.devDeviceId,
                firstSessionDate: this._telemetryService.firstSessionDate,
                msftInternal: this._telemetryService.msftInternal
            },
            logLevel: this._logService.getLevel(),
            loggers: [...this._loggerService.getRegisteredLoggers()],
            logsLocation: this._environmentService.extHostLogsPath,
            autoStart: (this.startup === 1 /* ExtensionHostStartup.EagerAutoStart */),
            uiKind: UIKind.Desktop,
            handle: this._environmentService.window.handle ? encodeBase64(this._environmentService.window.handle) : undefined
        };
    }
    _onExtHostProcessExit(code, signal) {
        if (this._terminating) {
            // Expected termination path (we asked the process to terminate)
            return;
        }
        this._onExit.fire([code, signal]);
    }
    _handleProcessOutputStream(stream, store) {
        let last = '';
        let isOmitting = false;
        const event = new Emitter();
        stream((chunk) => {
            // not a fancy approach, but this is the same approach used by the split2
            // module which is well-optimized (https://github.com/mcollina/split2)
            last += chunk;
            const lines = last.split(/\r?\n/g);
            last = lines.pop();
            // protected against an extension spamming and leaking memory if no new line is written.
            if (last.length > 10_000) {
                lines.push(last);
                last = '';
            }
            for (const line of lines) {
                if (isOmitting) {
                    if (line === "END_NATIVE_LOG" /* NativeLogMarkers.End */) {
                        isOmitting = false;
                    }
                }
                else if (line === "START_NATIVE_LOG" /* NativeLogMarkers.Start */) {
                    isOmitting = true;
                }
                else if (line.length) {
                    event.fire(line + '\n');
                }
            }
        }, undefined, store);
        return event;
    }
    async enableInspectPort() {
        if (!!this._inspectListener) {
            return true;
        }
        if (!this._extensionHostProcess) {
            return false;
        }
        const result = await this._extensionHostProcess.enableInspectPort();
        if (!result) {
            return false;
        }
        await Promise.race([Event.toPromise(this._onDidSetInspectPort.event), timeout(1000)]);
        return !!this._inspectListener;
    }
    getInspectPort() {
        return this._inspectListener ?? undefined;
    }
    _onWillShutdown(event) {
        // If the extension development host was started without debugger attached we need
        // to communicate this back to the main side to terminate the debug session
        if (this._isExtensionDevHost && !this._isExtensionDevTestFromCli && !this._isExtensionDevDebug && this._environmentService.debugExtensionHost.debugId) {
            this._extensionHostDebugService.terminateSession(this._environmentService.debugExtensionHost.debugId);
            event.join(timeout(100 /* wait a bit for IPC to get delivered */), { id: 'join.extensionDevelopment', label: nls.localize('join.extensionDevelopment', "Terminating extension debug session") });
        }
    }
};
NativeLocalProcessExtensionHost = __decorate([
    __param(3, IWorkspaceContextService),
    __param(4, INotificationService),
    __param(5, INativeHostService),
    __param(6, ILifecycleService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, IUserDataProfilesService),
    __param(9, ITelemetryService),
    __param(10, ILogService),
    __param(11, ILoggerService),
    __param(12, ILabelService),
    __param(13, IExtensionHostDebugService),
    __param(14, IHostService),
    __param(15, IProductService),
    __param(16, IShellEnvironmentService),
    __param(17, IExtensionHostStarter)
], NativeLocalProcessExtensionHost);
export { NativeLocalProcessExtensionHost };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxQcm9jZXNzRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2xvY2FsUHJvY2Vzc0V4dGVuc2lvbkhvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3BGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FB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