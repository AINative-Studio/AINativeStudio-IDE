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
import * as dom from '../../../../base/browser/dom.js';
import { parentOriginHash } from '../../../../base/browser/iframe.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Barrier } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { canceled, onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { COI, FileAccess } from '../../../../base/common/network.js';
import * as platform from '../../../../base/common/platform.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { getNLSLanguage, getNLSMessages } from '../../../../nls.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isLoggingOnly } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { UIKind, createMessageOfType, isMessageOfType } from '../common/extensionHostProtocol.js';
let WebWorkerExtensionHost = class WebWorkerExtensionHost extends Disposable {
    constructor(runningLocation, startup, _initDataProvider, _telemetryService, _contextService, _labelService, _logService, _loggerService, _environmentService, _userDataProfilesService, _productService, _layoutService, _storageService) {
        super();
        this.runningLocation = runningLocation;
        this.startup = startup;
        this._initDataProvider = _initDataProvider;
        this._telemetryService = _telemetryService;
        this._contextService = _contextService;
        this._labelService = _labelService;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._environmentService = _environmentService;
        this._userDataProfilesService = _userDataProfilesService;
        this._productService = _productService;
        this._layoutService = _layoutService;
        this._storageService = _storageService;
        this.pid = null;
        this.remoteAuthority = null;
        this.extensions = null;
        this._onDidExit = this._register(new Emitter());
        this.onExit = this._onDidExit.event;
        this._isTerminating = false;
        this._protocolPromise = null;
        this._protocol = null;
        this._extensionHostLogsLocation = joinPath(this._environmentService.extHostLogsPath, 'webWorker');
    }
    async _getWebWorkerExtensionHostIframeSrc() {
        const suffixSearchParams = new URLSearchParams();
        if (this._environmentService.debugExtensionHost && this._environmentService.debugRenderer) {
            suffixSearchParams.set('debugged', '1');
        }
        COI.addSearchParam(suffixSearchParams, true, true);
        const suffix = `?${suffixSearchParams.toString()}`;
        const iframeModulePath = `vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html`;
        if (platform.isWeb) {
            const webEndpointUrlTemplate = this._productService.webEndpointUrlTemplate;
            const commit = this._productService.commit;
            const quality = this._productService.quality;
            if (webEndpointUrlTemplate && commit && quality) {
                // Try to keep the web worker extension host iframe origin stable by storing it in workspace storage
                const key = 'webWorkerExtensionHostIframeStableOriginUUID';
                let stableOriginUUID = this._storageService.get(key, 1 /* StorageScope.WORKSPACE */);
                if (typeof stableOriginUUID === 'undefined') {
                    stableOriginUUID = generateUuid();
                    this._storageService.store(key, stableOriginUUID, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                }
                const hash = await parentOriginHash(mainWindow.origin, stableOriginUUID);
                const baseUrl = (webEndpointUrlTemplate
                    .replace('{{uuid}}', `v--${hash}`) // using `v--` as a marker to require `parentOrigin`/`salt` verification
                    .replace('{{commit}}', commit)
                    .replace('{{quality}}', quality));
                const res = new URL(`${baseUrl}/out/${iframeModulePath}${suffix}`);
                res.searchParams.set('parentOrigin', mainWindow.origin);
                res.searchParams.set('salt', stableOriginUUID);
                return res.toString();
            }
            console.warn(`The web worker extension host is started in a same-origin iframe!`);
        }
        const relativeExtensionHostIframeSrc = FileAccess.asBrowserUri(iframeModulePath);
        return `${relativeExtensionHostIframeSrc.toString(true)}${suffix}`;
    }
    async start() {
        if (!this._protocolPromise) {
            this._protocolPromise = this._startInsideIframe();
            this._protocolPromise.then(protocol => this._protocol = protocol);
        }
        return this._protocolPromise;
    }
    async _startInsideIframe() {
        const webWorkerExtensionHostIframeSrc = await this._getWebWorkerExtensionHostIframeSrc();
        const emitter = this._register(new Emitter());
        const iframe = document.createElement('iframe');
        iframe.setAttribute('class', 'web-worker-ext-host-iframe');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        iframe.setAttribute('allow', 'usb; serial; hid; cross-origin-isolated;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.display = 'none';
        const vscodeWebWorkerExtHostId = generateUuid();
        iframe.setAttribute('src', `${webWorkerExtensionHostIframeSrc}&vscodeWebWorkerExtHostId=${vscodeWebWorkerExtHostId}`);
        const barrier = new Barrier();
        let port;
        let barrierError = null;
        let barrierHasError = false;
        let startTimeout = null;
        const rejectBarrier = (exitCode, error) => {
            barrierError = error;
            barrierHasError = true;
            onUnexpectedError(barrierError);
            clearTimeout(startTimeout);
            this._onDidExit.fire([81 /* ExtensionHostExitCode.UnexpectedError */, barrierError.message]);
            barrier.open();
        };
        const resolveBarrier = (messagePort) => {
            port = messagePort;
            clearTimeout(startTimeout);
            barrier.open();
        };
        startTimeout = setTimeout(() => {
            console.warn(`The Web Worker Extension Host did not start in 60s, that might be a problem.`);
        }, 60000);
        this._register(dom.addDisposableListener(mainWindow, 'message', (event) => {
            if (event.source !== iframe.contentWindow) {
                return;
            }
            if (event.data.vscodeWebWorkerExtHostId !== vscodeWebWorkerExtHostId) {
                return;
            }
            if (event.data.error) {
                const { name, message, stack } = event.data.error;
                const err = new Error();
                err.message = message;
                err.name = name;
                err.stack = stack;
                return rejectBarrier(81 /* ExtensionHostExitCode.UnexpectedError */, err);
            }
            if (event.data.type === 'vscode.bootstrap.nls') {
                iframe.contentWindow.postMessage({
                    type: event.data.type,
                    data: {
                        workerUrl: FileAccess.asBrowserUri('vs/workbench/api/worker/extensionHostWorkerMain.js').toString(true),
                        fileRoot: globalThis._VSCODE_FILE_ROOT,
                        nls: {
                            messages: getNLSMessages(),
                            language: getNLSLanguage()
                        }
                    }
                }, '*');
                return;
            }
            const { data } = event.data;
            if (barrier.isOpen() || !(data instanceof MessagePort)) {
                console.warn('UNEXPECTED message', event);
                const err = new Error('UNEXPECTED message');
                return rejectBarrier(81 /* ExtensionHostExitCode.UnexpectedError */, err);
            }
            resolveBarrier(data);
        }));
        this._layoutService.mainContainer.appendChild(iframe);
        this._register(toDisposable(() => iframe.remove()));
        // await MessagePort and use it to directly communicate
        // with the worker extension host
        await barrier.wait();
        if (barrierHasError) {
            throw barrierError;
        }
        // Send over message ports for extension API
        const messagePorts = this._environmentService.options?.messagePorts ?? new Map();
        iframe.contentWindow.postMessage({ type: 'vscode.init', data: messagePorts }, '*', [...messagePorts.values()]);
        port.onmessage = (event) => {
            const { data } = event;
            if (!(data instanceof ArrayBuffer)) {
                console.warn('UNKNOWN data received', data);
                this._onDidExit.fire([77, 'UNKNOWN data received']);
                return;
            }
            emitter.fire(VSBuffer.wrap(new Uint8Array(data, 0, data.byteLength)));
        };
        const protocol = {
            onMessage: emitter.event,
            send: vsbuf => {
                const data = vsbuf.buffer.buffer.slice(vsbuf.buffer.byteOffset, vsbuf.buffer.byteOffset + vsbuf.buffer.byteLength);
                port.postMessage(data, [data]);
            }
        };
        return this._performHandshake(protocol);
    }
    async _performHandshake(protocol) {
        // extension host handshake happens below
        // (1) <== wait for: Ready
        // (2) ==> send: init data
        // (3) <== wait for: Initialized
        await Event.toPromise(Event.filter(protocol.onMessage, msg => isMessageOfType(msg, 1 /* MessageType.Ready */)));
        if (this._isTerminating) {
            throw canceled();
        }
        protocol.send(VSBuffer.fromString(JSON.stringify(await this._createExtHostInitData())));
        if (this._isTerminating) {
            throw canceled();
        }
        await Event.toPromise(Event.filter(protocol.onMessage, msg => isMessageOfType(msg, 0 /* MessageType.Initialized */)));
        if (this._isTerminating) {
            throw canceled();
        }
        return protocol;
    }
    dispose() {
        if (this._isTerminating) {
            return;
        }
        this._isTerminating = true;
        this._protocol?.send(createMessageOfType(2 /* MessageType.Terminate */));
        super.dispose();
    }
    getInspectPort() {
        return undefined;
    }
    enableInspectPort() {
        return Promise.resolve(false);
    }
    async _createExtHostInitData() {
        const initData = await this._initDataProvider.getInitData();
        this.extensions = initData.extensions;
        const workspace = this._contextService.getWorkspace();
        const nlsBaseUrl = this._productService.extensionsGallery?.nlsBaseUrl;
        let nlsUrlWithDetails = undefined;
        // Only use the nlsBaseUrl if we are using a language other than the default, English.
        if (nlsBaseUrl && this._productService.commit && !platform.Language.isDefaultVariant()) {
            nlsUrlWithDetails = URI.joinPath(URI.parse(nlsBaseUrl), this._productService.commit, this._productService.version, platform.Language.value());
        }
        return {
            commit: this._productService.commit,
            version: this._productService.version,
            quality: this._productService.quality,
            parentPid: 0,
            environment: {
                isExtensionDevelopmentDebug: this._environmentService.debugRenderer,
                appName: this._productService.nameLong,
                appHost: this._productService.embedderIdentifier ?? (platform.isWeb ? 'web' : 'desktop'),
                appUriScheme: this._productService.urlProtocol,
                appLanguage: platform.language,
                isExtensionTelemetryLoggingOnly: isLoggingOnly(this._productService, this._environmentService),
                extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
                extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
                globalStorageHome: this._userDataProfilesService.defaultProfile.globalStorageHome,
                workspaceStorageHome: this._environmentService.workspaceStorageHome,
                extensionLogLevel: this._environmentService.extensionLogLevel
            },
            workspace: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? undefined : {
                configuration: workspace.configuration || undefined,
                id: workspace.id,
                name: this._labelService.getWorkspaceLabel(workspace),
                transient: workspace.transient
            },
            consoleForward: {
                includeStack: false,
                logNative: this._environmentService.debugRenderer
            },
            extensions: this.extensions.toSnapshot(),
            nlsBaseUrl: nlsUrlWithDetails,
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
            logsLocation: this._extensionHostLogsLocation,
            autoStart: (this.startup === 1 /* ExtensionHostStartup.EagerAutoStart */),
            remote: {
                authority: this._environmentService.remoteAuthority,
                connectionData: null,
                isRemote: false
            },
            uiKind: platform.isWeb ? UIKind.Web : UIKind.Desktop
        };
    }
};
WebWorkerExtensionHost = __decorate([
    __param(3, ITelemetryService),
    __param(4, IWorkspaceContextService),
    __param(5, ILabelService),
    __param(6, ILogService),
    __param(7, ILoggerService),
    __param(8, IBrowserWorkbenchEnvironmentService),
    __param(9, IUserDataProfilesService),
    __param(10, IProductService),
    __param(11, ILayoutService),
    __param(12, IStorageService)
], WebWorkerExtensionHost);
export { WebWorkerExtensionHost };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9icm93c2VyL3dlYldvcmtlckV4dGVuc2lvbkhvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBbUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RGLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FB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