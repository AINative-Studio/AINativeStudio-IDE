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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uSG9zdE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdqRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDM0ksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxN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