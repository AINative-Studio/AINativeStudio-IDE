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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as platform from '../../../../base/common/platform.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { connectRemoteAgentExtensionHost } from '../../../../platform/remote/common/remoteAgentConnection.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteSocketFactoryService } from '../../../../platform/remote/common/remoteSocketFactoryService.js';
import { ISignService } from '../../../../platform/sign/common/sign.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isLoggingOnly } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { parseExtensionDevOptions } from './extensionDevOptions.js';
import { UIKind, createMessageOfType, isMessageOfType } from './extensionHostProtocol.js';
let RemoteExtensionHost = class RemoteExtensionHost extends Disposable {
    constructor(runningLocation, _initDataProvider, remoteSocketFactoryService, _contextService, _environmentService, _telemetryService, _logService, _loggerService, _labelService, remoteAuthorityResolverService, _extensionHostDebugService, _productService, _signService) {
        super();
        this.runningLocation = runningLocation;
        this._initDataProvider = _initDataProvider;
        this.remoteSocketFactoryService = remoteSocketFactoryService;
        this._contextService = _contextService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._labelService = _labelService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this._extensionHostDebugService = _extensionHostDebugService;
        this._productService = _productService;
        this._signService = _signService;
        this.pid = null;
        this.startup = 1 /* ExtensionHostStartup.EagerAutoStart */;
        this.extensions = null;
        this._onExit = this._register(new Emitter());
        this.onExit = this._onExit.event;
        this._hasDisconnected = false;
        this.remoteAuthority = this._initDataProvider.remoteAuthority;
        this._protocol = null;
        this._hasLostConnection = false;
        this._terminating = false;
        const devOpts = parseExtensionDevOptions(this._environmentService);
        this._isExtensionDevHost = devOpts.isExtensionDevHost;
    }
    start() {
        const options = {
            commit: this._productService.commit,
            quality: this._productService.quality,
            addressProvider: {
                getAddress: async () => {
                    const { authority } = await this.remoteAuthorityResolverService.resolveAuthority(this._initDataProvider.remoteAuthority);
                    return { connectTo: authority.connectTo, connectionToken: authority.connectionToken };
                }
            },
            remoteSocketFactoryService: this.remoteSocketFactoryService,
            signService: this._signService,
            logService: this._logService,
            ipcLogger: null
        };
        return this.remoteAuthorityResolverService.resolveAuthority(this._initDataProvider.remoteAuthority).then((resolverResult) => {
            const startParams = {
                language: platform.language,
                debugId: this._environmentService.debugExtensionHost.debugId,
                break: this._environmentService.debugExtensionHost.break,
                port: this._environmentService.debugExtensionHost.port,
                env: { ...this._environmentService.debugExtensionHost.env, ...resolverResult.options?.extensionHostEnv },
            };
            const extDevLocs = this._environmentService.extensionDevelopmentLocationURI;
            let debugOk = true;
            if (extDevLocs && extDevLocs.length > 0) {
                // TODO@AW: handles only first path in array
                if (extDevLocs[0].scheme === Schemas.file) {
                    debugOk = false;
                }
            }
            if (!debugOk) {
                startParams.break = false;
            }
            return connectRemoteAgentExtensionHost(options, startParams).then(result => {
                this._register(result);
                const { protocol, debugPort, reconnectionToken } = result;
                const isExtensionDevelopmentDebug = typeof debugPort === 'number';
                if (debugOk && this._environmentService.isExtensionDevelopment && this._environmentService.debugExtensionHost.debugId && debugPort) {
                    this._extensionHostDebugService.attachSession(this._environmentService.debugExtensionHost.debugId, debugPort, this._initDataProvider.remoteAuthority);
                }
                protocol.onDidDispose(() => {
                    this._onExtHostConnectionLost(reconnectionToken);
                });
                protocol.onSocketClose(() => {
                    if (this._isExtensionDevHost) {
                        this._onExtHostConnectionLost(reconnectionToken);
                    }
                });
                // 1) wait for the incoming `ready` event and send the initialization data.
                // 2) wait for the incoming `initialized` event.
                return new Promise((resolve, reject) => {
                    const handle = setTimeout(() => {
                        reject('The remote extension host took longer than 60s to send its ready message.');
                    }, 60 * 1000);
                    const disposable = protocol.onMessage(msg => {
                        if (isMessageOfType(msg, 1 /* MessageType.Ready */)) {
                            // 1) Extension Host is ready to receive messages, initialize it
                            this._createExtHostInitData(isExtensionDevelopmentDebug).then(data => {
                                protocol.send(VSBuffer.fromString(JSON.stringify(data)));
                            });
                            return;
                        }
                        if (isMessageOfType(msg, 0 /* MessageType.Initialized */)) {
                            // 2) Extension Host is initialized
                            clearTimeout(handle);
                            // stop listening for messages here
                            disposable.dispose();
                            // release this promise
                            this._protocol = protocol;
                            resolve(protocol);
                            return;
                        }
                        console.error(`received unexpected message during handshake phase from the extension host: `, msg);
                    });
                });
            });
        });
    }
    _onExtHostConnectionLost(reconnectionToken) {
        if (this._hasLostConnection) {
            // avoid re-entering this method
            return;
        }
        this._hasLostConnection = true;
        if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId) {
            this._extensionHostDebugService.close(this._environmentService.debugExtensionHost.debugId);
        }
        if (this._terminating) {
            // Expected termination path (we asked the process to terminate)
            return;
        }
        this._onExit.fire([0, reconnectionToken]);
    }
    async _createExtHostInitData(isExtensionDevelopmentDebug) {
        const remoteInitData = await this._initDataProvider.getInitData();
        this.extensions = remoteInitData.extensions;
        const workspace = this._contextService.getWorkspace();
        return {
            commit: this._productService.commit,
            version: this._productService.version,
            quality: this._productService.quality,
            parentPid: remoteInitData.pid,
            environment: {
                isExtensionDevelopmentDebug,
                appRoot: remoteInitData.appRoot,
                appName: this._productService.nameLong,
                appHost: this._productService.embedderIdentifier || 'desktop',
                appUriScheme: this._productService.urlProtocol,
                isExtensionTelemetryLoggingOnly: isLoggingOnly(this._productService, this._environmentService),
                appLanguage: platform.language,
                extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
                extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
                globalStorageHome: remoteInitData.globalStorageHome,
                workspaceStorageHome: remoteInitData.workspaceStorageHome,
                extensionLogLevel: this._environmentService.extensionLogLevel
            },
            workspace: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? null : {
                configuration: workspace.configuration,
                id: workspace.id,
                name: this._labelService.getWorkspaceLabel(workspace),
                transient: workspace.transient
            },
            remote: {
                isRemote: true,
                authority: this._initDataProvider.remoteAuthority,
                connectionData: remoteInitData.connectionData
            },
            consoleForward: {
                includeStack: false,
                logNative: Boolean(this._environmentService.debugExtensionHost.debugId)
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
            logsLocation: remoteInitData.extensionHostLogsPath,
            autoStart: (this.startup === 1 /* ExtensionHostStartup.EagerAutoStart */),
            uiKind: platform.isWeb ? UIKind.Web : UIKind.Desktop
        };
    }
    getInspectPort() {
        return undefined;
    }
    enableInspectPort() {
        return Promise.resolve(false);
    }
    async disconnect() {
        if (this._protocol && !this._hasDisconnected) {
            this._protocol.send(createMessageOfType(2 /* MessageType.Terminate */));
            this._protocol.sendDisconnect();
            this._hasDisconnected = true;
            await this._protocol.drain();
        }
    }
    dispose() {
        super.dispose();
        this._terminating = true;
        this.disconnect();
        if (this._protocol) {
            // Send the extension host a request to terminate itself
            // (graceful termination)
            // setTimeout(() => {
            // console.log(`SENDING TERMINATE TO REMOTE EXT HOST!`);
            this._protocol.getSocket().end();
            // this._protocol.drain();
            this._protocol = null;
            // }, 1000);
        }
    }
};
RemoteExtensionHost = __decorate([
    __param(2, IRemoteSocketFactoryService),
    __param(3, IWorkspaceContextService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ITelemetryService),
    __param(6, ILogService),
    __param(7, ILoggerService),
    __param(8, ILabelService),
    __param(9, IRemoteAuthorityResolverService),
    __param(10, IExtensionHostDebugService),
    __param(11, IProductService),
    __param(12, ISignService)
], RemoteExtensionHost);
export { RemoteExtensionHost };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vcmVtb3RlRXh0ZW5zaW9uSG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUloRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUF1RCwrQkFBK0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ25LLE9BQU8sRUFBRSwrQkFBK0IsRUFBeUIsTUFBTSwrREFBK0QsQ0FBQztBQUN2SSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUMvRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlE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