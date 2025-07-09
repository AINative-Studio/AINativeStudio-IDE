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
var ExtensionHostManager_1;
import { IntervalTimer } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import * as errors from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ExtHostCustomersRegistry } from './extHostCustomers.js';
import { extensionHostKindToString } from './extensionHostKind.js';
import { RPCProtocol } from './rpcProtocol.js';
// Enable to see detailed message communication between window and extension host
const LOG_EXTENSION_HOST_COMMUNICATION = false;
const LOG_USE_COLORS = true;
let ExtensionHostManager = ExtensionHostManager_1 = class ExtensionHostManager extends Disposable {
    get pid() {
        return this._extensionHost.pid;
    }
    get kind() {
        return this._extensionHost.runningLocation.kind;
    }
    get startup() {
        return this._extensionHost.startup;
    }
    get friendyName() {
        return friendlyExtHostName(this.kind, this.pid);
    }
    constructor(extensionHost, initialActivationEvents, _internalExtensionService, _instantiationService, _environmentService, _telemetryService, _logService) {
        super();
        this._internalExtensionService = _internalExtensionService;
        this._instantiationService = _instantiationService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._onDidChangeResponsiveState = this._register(new Emitter());
        this.onDidChangeResponsiveState = this._onDidChangeResponsiveState.event;
        this._hasStarted = false;
        this._cachedActivationEvents = new Map();
        this._resolvedActivationEvents = new Set();
        this._rpcProtocol = null;
        this._customers = [];
        this._extensionHost = extensionHost;
        this.onDidExit = this._extensionHost.onExit;
        const startingTelemetryEvent = {
            time: Date.now(),
            action: 'starting',
            kind: extensionHostKindToString(this.kind)
        };
        this._telemetryService.publicLog2('extensionHostStartup', startingTelemetryEvent);
        this._proxy = this._extensionHost.start().then((protocol) => {
            this._hasStarted = true;
            // Track healthy extension host startup
            const successTelemetryEvent = {
                time: Date.now(),
                action: 'success',
                kind: extensionHostKindToString(this.kind)
            };
            this._telemetryService.publicLog2('extensionHostStartup', successTelemetryEvent);
            return this._createExtensionHostCustomers(this.kind, protocol);
        }, (err) => {
            this._logService.error(`Error received from starting extension host (kind: ${extensionHostKindToString(this.kind)})`);
            this._logService.error(err);
            // Track errors during extension host startup
            const failureTelemetryEvent = {
                time: Date.now(),
                action: 'error',
                kind: extensionHostKindToString(this.kind)
            };
            if (err && err.name) {
                failureTelemetryEvent.errorName = err.name;
            }
            if (err && err.message) {
                failureTelemetryEvent.errorMessage = err.message;
            }
            if (err && err.stack) {
                failureTelemetryEvent.errorStack = err.stack;
            }
            this._telemetryService.publicLog2('extensionHostStartup', failureTelemetryEvent);
            return null;
        });
        this._proxy.then(() => {
            initialActivationEvents.forEach((activationEvent) => this.activateByEvent(activationEvent, 0 /* ActivationKind.Normal */));
            this._register(registerLatencyTestProvider({
                measure: () => this.measure()
            }));
        });
    }
    async disconnect() {
        await this._extensionHost?.disconnect?.();
    }
    dispose() {
        this._extensionHost?.dispose();
        this._rpcProtocol?.dispose();
        for (let i = 0, len = this._customers.length; i < len; i++) {
            const customer = this._customers[i];
            try {
                customer.dispose();
            }
            catch (err) {
                errors.onUnexpectedError(err);
            }
        }
        this._proxy = null;
        super.dispose();
    }
    async measure() {
        const proxy = await this._proxy;
        if (!proxy) {
            return null;
        }
        const latency = await this._measureLatency(proxy);
        const down = await this._measureDown(proxy);
        const up = await this._measureUp(proxy);
        return {
            remoteAuthority: this._extensionHost.remoteAuthority,
            latency,
            down,
            up
        };
    }
    async ready() {
        await this._proxy;
    }
    async _measureLatency(proxy) {
        const COUNT = 10;
        let sum = 0;
        for (let i = 0; i < COUNT; i++) {
            const sw = StopWatch.create();
            await proxy.test_latency(i);
            sw.stop();
            sum += sw.elapsed();
        }
        return (sum / COUNT);
    }
    static _convert(byteCount, elapsedMillis) {
        return (byteCount * 1000 * 8) / elapsedMillis;
    }
    async _measureUp(proxy) {
        const SIZE = 10 * 1024 * 1024; // 10MB
        const buff = VSBuffer.alloc(SIZE);
        const value = Math.ceil(Math.random() * 256);
        for (let i = 0; i < buff.byteLength; i++) {
            buff.writeUInt8(i, value);
        }
        const sw = StopWatch.create();
        await proxy.test_up(buff);
        sw.stop();
        return ExtensionHostManager_1._convert(SIZE, sw.elapsed());
    }
    async _measureDown(proxy) {
        const SIZE = 10 * 1024 * 1024; // 10MB
        const sw = StopWatch.create();
        await proxy.test_down(SIZE);
        sw.stop();
        return ExtensionHostManager_1._convert(SIZE, sw.elapsed());
    }
    _createExtensionHostCustomers(kind, protocol) {
        let logger = null;
        if (LOG_EXTENSION_HOST_COMMUNICATION || this._environmentService.logExtensionHostCommunication) {
            logger = new RPCLogger(kind);
        }
        else if (TelemetryRPCLogger.isEnabled()) {
            logger = new TelemetryRPCLogger(this._telemetryService);
        }
        this._rpcProtocol = new RPCProtocol(protocol, logger);
        this._register(this._rpcProtocol.onDidChangeResponsiveState((responsiveState) => this._onDidChangeResponsiveState.fire(responsiveState)));
        let extensionHostProxy = null;
        let mainProxyIdentifiers = [];
        const extHostContext = {
            remoteAuthority: this._extensionHost.remoteAuthority,
            extensionHostKind: this.kind,
            getProxy: (identifier) => this._rpcProtocol.getProxy(identifier),
            set: (identifier, instance) => this._rpcProtocol.set(identifier, instance),
            dispose: () => this._rpcProtocol.dispose(),
            assertRegistered: (identifiers) => this._rpcProtocol.assertRegistered(identifiers),
            drain: () => this._rpcProtocol.drain(),
            //#region internal
            internalExtensionService: this._internalExtensionService,
            _setExtensionHostProxy: (value) => {
                extensionHostProxy = value;
            },
            _setAllMainProxyIdentifiers: (value) => {
                mainProxyIdentifiers = value;
            },
            //#endregion
        };
        // Named customers
        const namedCustomers = ExtHostCustomersRegistry.getNamedCustomers();
        for (let i = 0, len = namedCustomers.length; i < len; i++) {
            const [id, ctor] = namedCustomers[i];
            try {
                const instance = this._instantiationService.createInstance(ctor, extHostContext);
                this._customers.push(instance);
                this._rpcProtocol.set(id, instance);
            }
            catch (err) {
                this._logService.error(`Cannot instantiate named customer: '${id.sid}'`);
                this._logService.error(err);
                errors.onUnexpectedError(err);
            }
        }
        // Customers
        const customers = ExtHostCustomersRegistry.getCustomers();
        for (const ctor of customers) {
            try {
                const instance = this._instantiationService.createInstance(ctor, extHostContext);
                this._customers.push(instance);
            }
            catch (err) {
                this._logService.error(err);
                errors.onUnexpectedError(err);
            }
        }
        if (!extensionHostProxy) {
            throw new Error(`Missing IExtensionHostProxy!`);
        }
        // Check that no named customers are missing
        this._rpcProtocol.assertRegistered(mainProxyIdentifiers);
        return extensionHostProxy;
    }
    async activate(extension, reason) {
        const proxy = await this._proxy;
        if (!proxy) {
            return false;
        }
        return proxy.activate(extension, reason);
    }
    activateByEvent(activationEvent, activationKind) {
        if (activationKind === 1 /* ActivationKind.Immediate */ && !this._hasStarted) {
            return Promise.resolve();
        }
        if (!this._cachedActivationEvents.has(activationEvent)) {
            this._cachedActivationEvents.set(activationEvent, this._activateByEvent(activationEvent, activationKind));
        }
        return this._cachedActivationEvents.get(activationEvent);
    }
    activationEventIsDone(activationEvent) {
        return this._resolvedActivationEvents.has(activationEvent);
    }
    async _activateByEvent(activationEvent, activationKind) {
        if (!this._proxy) {
            return;
        }
        const proxy = await this._proxy;
        if (!proxy) {
            // this case is already covered above and logged.
            // i.e. the extension host could not be started
            return;
        }
        if (!this._extensionHost.extensions.containsActivationEvent(activationEvent)) {
            this._resolvedActivationEvents.add(activationEvent);
            return;
        }
        await proxy.activateByEvent(activationEvent, activationKind);
        this._resolvedActivationEvents.add(activationEvent);
    }
    async getInspectPort(tryEnableInspector) {
        if (this._extensionHost) {
            if (tryEnableInspector) {
                await this._extensionHost.enableInspectPort();
            }
            const port = this._extensionHost.getInspectPort();
            if (port) {
                return port;
            }
        }
        return undefined;
    }
    async resolveAuthority(remoteAuthority, resolveAttempt) {
        const sw = StopWatch.create(false);
        const prefix = () => `[${extensionHostKindToString(this._extensionHost.runningLocation.kind)}${this._extensionHost.runningLocation.affinity}][resolveAuthority(${getRemoteAuthorityPrefix(remoteAuthority)},${resolveAttempt})][${sw.elapsed()}ms] `;
        const logInfo = (msg) => this._logService.info(`${prefix()}${msg}`);
        const logError = (msg, err = undefined) => this._logService.error(`${prefix()}${msg}`, err);
        logInfo(`obtaining proxy...`);
        const proxy = await this._proxy;
        if (!proxy) {
            logError(`no proxy`);
            return {
                type: 'error',
                error: {
                    message: `Cannot resolve authority`,
                    code: RemoteAuthorityResolverErrorCode.Unknown,
                    detail: undefined
                }
            };
        }
        logInfo(`invoking...`);
        const intervalLogger = new IntervalTimer();
        try {
            intervalLogger.cancelAndSet(() => logInfo('waiting...'), 1000);
            const resolverResult = await proxy.resolveAuthority(remoteAuthority, resolveAttempt);
            intervalLogger.dispose();
            if (resolverResult.type === 'ok') {
                logInfo(`returned ${resolverResult.value.authority.connectTo}`);
            }
            else {
                logError(`returned an error`, resolverResult.error);
            }
            return resolverResult;
        }
        catch (err) {
            intervalLogger.dispose();
            logError(`returned an error`, err);
            return {
                type: 'error',
                error: {
                    message: err.message,
                    code: RemoteAuthorityResolverErrorCode.Unknown,
                    detail: err
                }
            };
        }
    }
    async getCanonicalURI(remoteAuthority, uri) {
        const proxy = await this._proxy;
        if (!proxy) {
            throw new Error(`Cannot resolve canonical URI`);
        }
        return proxy.getCanonicalURI(remoteAuthority, uri);
    }
    async start(extensionRegistryVersionId, allExtensions, myExtensions) {
        const proxy = await this._proxy;
        if (!proxy) {
            return;
        }
        const deltaExtensions = this._extensionHost.extensions.set(extensionRegistryVersionId, allExtensions, myExtensions);
        return proxy.startExtensionHost(deltaExtensions);
    }
    async extensionTestsExecute() {
        const proxy = await this._proxy;
        if (!proxy) {
            throw new Error('Could not obtain Extension Host Proxy');
        }
        return proxy.extensionTestsExecute();
    }
    representsRunningLocation(runningLocation) {
        return this._extensionHost.runningLocation.equals(runningLocation);
    }
    async deltaExtensions(incomingExtensionsDelta) {
        const proxy = await this._proxy;
        if (!proxy) {
            return;
        }
        const outgoingExtensionsDelta = this._extensionHost.extensions.delta(incomingExtensionsDelta);
        if (!outgoingExtensionsDelta) {
            // The extension host already has this version of the extensions.
            return;
        }
        return proxy.deltaExtensions(outgoingExtensionsDelta);
    }
    containsExtension(extensionId) {
        return this._extensionHost.extensions?.containsExtension(extensionId) ?? false;
    }
    async setRemoteEnvironment(env) {
        const proxy = await this._proxy;
        if (!proxy) {
            return;
        }
        return proxy.setRemoteEnvironment(env);
    }
};
ExtensionHostManager = ExtensionHostManager_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ITelemetryService),
    __param(6, ILogService)
], ExtensionHostManager);
export { ExtensionHostManager };
export function friendlyExtHostName(kind, pid) {
    if (pid) {
        return `${extensionHostKindToString(kind)} pid: ${pid}`;
    }
    return `${extensionHostKindToString(kind)}`;
}
const colorTables = [
    ['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
    ['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD']
];
function prettyWithoutArrays(data) {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && typeof data === 'object' && typeof data.toString === 'function') {
        const result = data.toString();
        if (result !== '[object Object]') {
            return result;
        }
    }
    return data;
}
function pretty(data) {
    if (Array.isArray(data)) {
        return data.map(prettyWithoutArrays);
    }
    return prettyWithoutArrays(data);
}
class RPCLogger {
    constructor(_kind) {
        this._kind = _kind;
        this._totalIncoming = 0;
        this._totalOutgoing = 0;
    }
    _log(direction, totalLength, msgLength, req, initiator, str, data) {
        data = pretty(data);
        const colorTable = colorTables[initiator];
        const color = LOG_USE_COLORS ? colorTable[req % colorTable.length] : '#000000';
        let args = [`%c[${extensionHostKindToString(this._kind)}][${direction}]%c[${String(totalLength).padStart(7)}]%c[len: ${String(msgLength).padStart(5)}]%c${String(req).padStart(5)} - ${str}`, 'color: darkgreen', 'color: grey', 'color: grey', `color: ${color}`];
        if (/\($/.test(str)) {
            args = args.concat(data);
            args.push(')');
        }
        else {
            args.push(data);
        }
        console.log.apply(console, args);
    }
    logIncoming(msgLength, req, initiator, str, data) {
        this._totalIncoming += msgLength;
        this._log('Ext \u2192 Win', this._totalIncoming, msgLength, req, initiator, str, data);
    }
    logOutgoing(msgLength, req, initiator, str, data) {
        this._totalOutgoing += msgLength;
        this._log('Win \u2192 Ext', this._totalOutgoing, msgLength, req, initiator, str, data);
    }
}
let TelemetryRPCLogger = class TelemetryRPCLogger {
    static isEnabled() {
        return Math.random() < 0.0001; // 0.01% of users
    }
    constructor(_telemetryService) {
        this._telemetryService = _telemetryService;
        this._pendingRequests = new Map();
    }
    logIncoming(msgLength, req, initiator, str) {
        if (initiator === 0 /* RequestInitiator.LocalSide */ && /^receiveReply(Err)?:/.test(str)) {
            // log the size of reply messages
            const requestStr = this._pendingRequests.get(req) ?? 'unknown_reply';
            this._pendingRequests.delete(req);
            this._telemetryService.publicLog2('extensionhost.incoming', {
                type: `${str} ${requestStr}`,
                length: msgLength
            });
        }
        if (initiator === 1 /* RequestInitiator.OtherSide */ && /^receiveRequest /.test(str)) {
            // incoming request
            this._telemetryService.publicLog2('extensionhost.incoming', {
                type: `${str}`,
                length: msgLength
            });
        }
    }
    logOutgoing(msgLength, req, initiator, str) {
        if (initiator === 0 /* RequestInitiator.LocalSide */ && str.startsWith('request: ')) {
            this._pendingRequests.set(req, str);
            this._telemetryService.publicLog2('extensionhost.outgoing', {
                type: str,
                length: msgLength
            });
        }
    }
};
TelemetryRPCLogger = __decorate([
    __param(0, ITelemetryService)
], TelemetryRPCLogger);
const providers = [];
function registerLatencyTestProvider(provider) {
    providers.push(provider);
    return {
        dispose: () => {
            for (let i = 0; i < providers.length; i++) {
                if (providers[i] === provider) {
                    providers.splice(i, 1);
                    return;
                }
            }
        }
    };
}
function getLatencyTestProviders() {
    return providers.slice(0);
}
registerAction2(class MeasureExtHostLatencyAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.measureExtHostLatency',
            title: nls.localize2('measureExtHostLatency', "Measure Extension Host Latency"),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const measurements = await Promise.all(getLatencyTestProviders().map(provider => provider.measure()));
        editorService.openEditor({ resource: undefined, contents: measurements.map(MeasureExtHostLatencyAction._print).join('\n\n'), options: { pinned: true } });
    }
    static _print(m) {
        if (!m) {
            return '';
        }
        return `${m.remoteAuthority ? `Authority: ${m.remoteAuthority}\n` : ``}Roundtrip latency: ${m.latency.toFixed(3)}ms\nUp: ${MeasureExtHostLatencyAction._printSpeed(m.up)}\nDown: ${MeasureExtHostLatencyAction._printSpeed(m.down)}\n`;
    }
    static _printSpeed(n) {
        if (n <= 1024) {
            return `${n} bps`;
        }
        if (n < 1024 * 1024) {
            return `${(n / 1024).toFixed(1)} kbps`;
        }
        return `${(n / 1024 / 1024).toFixed(1)} Mbps`;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbkhvc3RNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzNJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUs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