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
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { distinct } from '../../../../base/common/arrays.js';
import { Queue, RunOnceScheduler, raceTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { canceled } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, dispose } from '../../../../base/common/lifecycle.js';
import { mixin } from '../../../../base/common/objects.js';
import * as platform from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ICustomEndpointTelemetryService, ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { RawDebugSession } from './rawDebugSession.js';
import { IDebugService, VIEWLET_ID, isFrameDeemphasized } from '../common/debug.js';
import { ExpressionContainer, MemoryRegion, Thread } from '../common/debugModel.js';
import { Source } from '../common/debugSource.js';
import { filterExceptionsFromTelemetry } from '../common/debugUtils.js';
import { ReplModel } from '../common/replModel.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { isDefined } from '../../../../base/common/types.js';
import { ITestService } from '../../testing/common/testService.js';
import { ITestResultService } from '../../testing/common/testResultService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
const TRIGGERED_BREAKPOINT_MAX_DELAY = 1500;
let DebugSession = class DebugSession {
    constructor(id, _configuration, root, model, options, debugService, telemetryService, hostService, configurationService, paneCompositeService, workspaceContextService, productService, notificationService, lifecycleService, uriIdentityService, instantiationService, customEndpointTelemetryService, workbenchEnvironmentService, logService, testService, testResultService, accessibilityService) {
        this.id = id;
        this._configuration = _configuration;
        this.root = root;
        this.model = model;
        this.debugService = debugService;
        this.telemetryService = telemetryService;
        this.hostService = hostService;
        this.configurationService = configurationService;
        this.paneCompositeService = paneCompositeService;
        this.workspaceContextService = workspaceContextService;
        this.productService = productService;
        this.notificationService = notificationService;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.customEndpointTelemetryService = customEndpointTelemetryService;
        this.workbenchEnvironmentService = workbenchEnvironmentService;
        this.logService = logService;
        this.testService = testService;
        this.accessibilityService = accessibilityService;
        this.initialized = false;
        this.sources = new Map();
        this.threads = new Map();
        this.threadIds = [];
        this.cancellationMap = new Map();
        this.rawListeners = new DisposableStore();
        this.globalDisposables = new DisposableStore();
        this.stoppedDetails = [];
        this.statusQueue = this.rawListeners.add(new ThreadStatusScheduler());
        this._onDidChangeState = new Emitter();
        this._onDidEndAdapter = new Emitter();
        this._onDidLoadedSource = new Emitter();
        this._onDidCustomEvent = new Emitter();
        this._onDidProgressStart = new Emitter();
        this._onDidProgressUpdate = new Emitter();
        this._onDidProgressEnd = new Emitter();
        this._onDidInvalidMemory = new Emitter();
        this._onDidChangeREPLElements = new Emitter();
        this._onDidChangeName = new Emitter();
        this._options = options || {};
        this.parentSession = this._options.parentSession;
        if (this.hasSeparateRepl()) {
            this.repl = new ReplModel(this.configurationService);
        }
        else {
            this.repl = this.parentSession.repl;
        }
        const toDispose = this.globalDisposables;
        const replListener = toDispose.add(new MutableDisposable());
        replListener.value = this.repl.onDidChangeElements((e) => this._onDidChangeREPLElements.fire(e));
        if (lifecycleService) {
            toDispose.add(lifecycleService.onWillShutdown(() => {
                this.shutdown();
                dispose(toDispose);
            }));
        }
        // Cast here, it's not possible to reference a hydrated result in this code path.
        this.correlatedTestRun = options?.testRun
            ? testResultService.getResult(options.testRun.runId)
            : this.parentSession?.correlatedTestRun;
        if (this.correlatedTestRun) {
            // Listen to the test completing because the user might have taken the cancel action rather than stopping the session.
            toDispose.add(this.correlatedTestRun.onComplete(() => this.terminate()));
        }
        const compoundRoot = this._options.compoundRoot;
        if (compoundRoot) {
            toDispose.add(compoundRoot.onDidSessionStop(() => this.terminate()));
        }
        this.passFocusScheduler = new RunOnceScheduler(() => {
            // If there is some session or thread that is stopped pass focus to it
            if (this.debugService.getModel().getSessions().some(s => s.state === 2 /* State.Stopped */) || this.getAllThreads().some(t => t.stopped)) {
                if (typeof this.lastContinuedThreadId === 'number') {
                    const thread = this.debugService.getViewModel().focusedThread;
                    if (thread && thread.threadId === this.lastContinuedThreadId && !thread.stopped) {
                        const toFocusThreadId = this.getStoppedDetails()?.threadId;
                        const toFocusThread = typeof toFocusThreadId === 'number' ? this.getThread(toFocusThreadId) : undefined;
                        this.debugService.focusStackFrame(undefined, toFocusThread);
                    }
                }
                else {
                    const session = this.debugService.getViewModel().focusedSession;
                    if (session && session.getId() === this.getId() && session.state !== 2 /* State.Stopped */) {
                        this.debugService.focusStackFrame(undefined);
                    }
                }
            }
        }, 800);
        const parent = this._options.parentSession;
        if (parent) {
            toDispose.add(parent.onDidEndAdapter(() => {
                // copy the parent repl and get a new detached repl for this child, and
                // remove its parent, if it's still running
                if (!this.hasSeparateRepl() && this.raw?.isInShutdown === false) {
                    this.repl = this.repl.clone();
                    replListener.value = this.repl.onDidChangeElements((e) => this._onDidChangeREPLElements.fire(e));
                    this.parentSession = undefined;
                }
            }));
        }
    }
    getId() {
        return this.id;
    }
    setSubId(subId) {
        this._subId = subId;
    }
    getMemory(memoryReference) {
        return new MemoryRegion(memoryReference, this);
    }
    get subId() {
        return this._subId;
    }
    get configuration() {
        return this._configuration.resolved;
    }
    get unresolvedConfiguration() {
        return this._configuration.unresolved;
    }
    get lifecycleManagedByParent() {
        return !!this._options.lifecycleManagedByParent;
    }
    get compact() {
        return !!this._options.compact;
    }
    get saveBeforeRestart() {
        return this._options.saveBeforeRestart ?? !this._options?.parentSession;
    }
    get compoundRoot() {
        return this._options.compoundRoot;
    }
    get suppressDebugStatusbar() {
        return this._options.suppressDebugStatusbar ?? false;
    }
    get suppressDebugToolbar() {
        return this._options.suppressDebugToolbar ?? false;
    }
    get suppressDebugView() {
        return this._options.suppressDebugView ?? false;
    }
    get autoExpandLazyVariables() {
        // This tiny helper avoids converting the entire debug model to use service injection
        const screenReaderOptimized = this.accessibilityService.isScreenReaderOptimized();
        const value = this.configurationService.getValue('debug').autoExpandLazyVariables;
        return value === 'auto' && screenReaderOptimized || value === 'on';
    }
    setConfiguration(configuration) {
        this._configuration = configuration;
    }
    getLabel() {
        const includeRoot = this.workspaceContextService.getWorkspace().folders.length > 1;
        return includeRoot && this.root ? `${this.name} (${resources.basenameOrAuthority(this.root.uri)})` : this.name;
    }
    setName(name) {
        this._name = name;
        this._onDidChangeName.fire(name);
    }
    get name() {
        return this._name || this.configuration.name;
    }
    get state() {
        if (!this.initialized) {
            return 1 /* State.Initializing */;
        }
        if (!this.raw) {
            return 0 /* State.Inactive */;
        }
        const focusedThread = this.debugService.getViewModel().focusedThread;
        if (focusedThread && focusedThread.session === this) {
            return focusedThread.stopped ? 2 /* State.Stopped */ : 3 /* State.Running */;
        }
        if (this.getAllThreads().some(t => t.stopped)) {
            return 2 /* State.Stopped */;
        }
        return 3 /* State.Running */;
    }
    get capabilities() {
        return this.raw ? this.raw.capabilities : Object.create(null);
    }
    //---- events
    get onDidChangeState() {
        return this._onDidChangeState.event;
    }
    get onDidEndAdapter() {
        return this._onDidEndAdapter.event;
    }
    get onDidChangeReplElements() {
        return this._onDidChangeREPLElements.event;
    }
    get onDidChangeName() {
        return this._onDidChangeName.event;
    }
    //---- DAP events
    get onDidCustomEvent() {
        return this._onDidCustomEvent.event;
    }
    get onDidLoadedSource() {
        return this._onDidLoadedSource.event;
    }
    get onDidProgressStart() {
        return this._onDidProgressStart.event;
    }
    get onDidProgressUpdate() {
        return this._onDidProgressUpdate.event;
    }
    get onDidProgressEnd() {
        return this._onDidProgressEnd.event;
    }
    get onDidInvalidateMemory() {
        return this._onDidInvalidMemory.event;
    }
    //---- DAP requests
    /**
     * create and initialize a new debug adapter for this session
     */
    async initialize(dbgr) {
        if (this.raw) {
            // if there was already a connection make sure to remove old listeners
            await this.shutdown();
        }
        try {
            const debugAdapter = await dbgr.createDebugAdapter(this);
            this.raw = this.instantiationService.createInstance(RawDebugSession, debugAdapter, dbgr, this.id, this.configuration.name);
            await this.raw.start();
            this.registerListeners();
            await this.raw.initialize({
                clientID: 'vscode',
                clientName: this.productService.nameLong,
                adapterID: this.configuration.type,
                pathFormat: 'path',
                linesStartAt1: true,
                columnsStartAt1: true,
                supportsVariableType: true, // #8858
                supportsVariablePaging: true, // #9537
                supportsRunInTerminalRequest: true, // #10574
                locale: platform.language, // #169114
                supportsProgressReporting: true, // #92253
                supportsInvalidatedEvent: true, // #106745
                supportsMemoryReferences: true, //#129684
                supportsArgsCanBeInterpretedByShell: true, // #149910
                supportsMemoryEvent: true, // #133643
                supportsStartDebuggingRequest: true,
                supportsANSIStyling: true,
            });
            this.initialized = true;
            this._onDidChangeState.fire();
            this.rememberedCapabilities = this.raw.capabilities;
            this.debugService.setExceptionBreakpointsForSession(this, (this.raw && this.raw.capabilities.exceptionBreakpointFilters) || []);
            this.debugService.getModel().registerBreakpointModes(this.configuration.type, this.raw.capabilities.breakpointModes || []);
        }
        catch (err) {
            this.initialized = true;
            this._onDidChangeState.fire();
            await this.shutdown();
            throw err;
        }
    }
    /**
     * launch or attach to the debuggee
     */
    async launchOrAttach(config) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'launch or attach'));
        }
        if (this.parentSession && this.parentSession.state === 0 /* State.Inactive */) {
            throw canceled();
        }
        // __sessionID only used for EH debugging (but we add it always for now...)
        config.__sessionId = this.getId();
        try {
            await this.raw.launchOrAttach(config);
        }
        catch (err) {
            this.shutdown();
            throw err;
        }
    }
    /**
     * Terminate any linked test run.
     */
    cancelCorrelatedTestRun() {
        if (this.correlatedTestRun && !this.correlatedTestRun.completedAt) {
            this.didTerminateTestRun = true;
            this.testService.cancelTestRun(this.correlatedTestRun.id);
        }
    }
    /**
     * terminate the current debug adapter session
     */
    async terminate(restart = false) {
        if (!this.raw) {
            // Adapter went down but it did not send a 'terminated' event, simulate like the event has been sent
            this.onDidExitAdapter();
        }
        this.cancelAllRequests();
        if (this._options.lifecycleManagedByParent && this.parentSession) {
            await this.parentSession.terminate(restart);
        }
        else if (this.correlatedTestRun && !this.correlatedTestRun.completedAt && !this.didTerminateTestRun) {
            this.cancelCorrelatedTestRun();
        }
        else if (this.raw) {
            if (this.raw.capabilities.supportsTerminateRequest && this._configuration.resolved.request === 'launch') {
                await this.raw.terminate(restart);
            }
            else {
                await this.raw.disconnect({ restart, terminateDebuggee: true });
            }
        }
        if (!restart) {
            this._options.compoundRoot?.sessionStopped();
        }
    }
    /**
     * end the current debug adapter session
     */
    async disconnect(restart = false, suspend = false) {
        if (!this.raw) {
            // Adapter went down but it did not send a 'terminated' event, simulate like the event has been sent
            this.onDidExitAdapter();
        }
        this.cancelAllRequests();
        if (this._options.lifecycleManagedByParent && this.parentSession) {
            await this.parentSession.disconnect(restart, suspend);
        }
        else if (this.raw) {
            // TODO terminateDebuggee should be undefined by default?
            await this.raw.disconnect({ restart, terminateDebuggee: false, suspendDebuggee: suspend });
        }
        if (!restart) {
            this._options.compoundRoot?.sessionStopped();
        }
    }
    /**
     * restart debug adapter session
     */
    async restart() {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'restart'));
        }
        this.cancelAllRequests();
        if (this._options.lifecycleManagedByParent && this.parentSession) {
            await this.parentSession.restart();
        }
        else {
            await this.raw.restart({ arguments: this.configuration });
        }
    }
    async sendBreakpoints(modelUri, breakpointsToSend, sourceModified) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'breakpoints'));
        }
        if (!this.raw.readyForBreakpoints) {
            return Promise.resolve(undefined);
        }
        const rawSource = this.getRawSource(modelUri);
        if (breakpointsToSend.length && !rawSource.adapterData) {
            rawSource.adapterData = breakpointsToSend[0].adapterData;
        }
        // Normalize all drive letters going out from vscode to debug adapters so we are consistent with our resolving #43959
        if (rawSource.path) {
            rawSource.path = normalizeDriveLetter(rawSource.path);
        }
        const response = await this.raw.setBreakpoints({
            source: rawSource,
            lines: breakpointsToSend.map(bp => bp.sessionAgnosticData.lineNumber),
            breakpoints: breakpointsToSend.map(bp => bp.toDAP()),
            sourceModified
        });
        if (response?.body) {
            const data = new Map();
            for (let i = 0; i < breakpointsToSend.length; i++) {
                data.set(breakpointsToSend[i].getId(), response.body.breakpoints[i]);
            }
            this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
        }
    }
    async sendFunctionBreakpoints(fbpts) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'function breakpoints'));
        }
        if (this.raw.readyForBreakpoints) {
            const response = await this.raw.setFunctionBreakpoints({ breakpoints: fbpts.map(bp => bp.toDAP()) });
            if (response?.body) {
                const data = new Map();
                for (let i = 0; i < fbpts.length; i++) {
                    data.set(fbpts[i].getId(), response.body.breakpoints[i]);
                }
                this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
            }
        }
    }
    async sendExceptionBreakpoints(exbpts) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'exception breakpoints'));
        }
        if (this.raw.readyForBreakpoints) {
            const args = this.capabilities.supportsExceptionFilterOptions ? {
                filters: [],
                filterOptions: exbpts.map(exb => {
                    if (exb.condition) {
                        return { filterId: exb.filter, condition: exb.condition };
                    }
                    return { filterId: exb.filter };
                })
            } : { filters: exbpts.map(exb => exb.filter) };
            const response = await this.raw.setExceptionBreakpoints(args);
            if (response?.body && response.body.breakpoints) {
                const data = new Map();
                for (let i = 0; i < exbpts.length; i++) {
                    data.set(exbpts[i].getId(), response.body.breakpoints[i]);
                }
                this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
            }
        }
    }
    dataBytesBreakpointInfo(address, bytes) {
        if (this.raw?.capabilities.supportsDataBreakpointBytes === false) {
            throw new Error(localize('sessionDoesNotSupporBytesBreakpoints', "Session does not support breakpoints with bytes"));
        }
        return this._dataBreakpointInfo({ name: address, bytes, asAddress: true });
    }
    dataBreakpointInfo(name, variablesReference) {
        return this._dataBreakpointInfo({ name, variablesReference });
    }
    async _dataBreakpointInfo(args) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'data breakpoints info'));
        }
        if (!this.raw.readyForBreakpoints) {
            throw new Error(localize('sessionNotReadyForBreakpoints', "Session is not ready for breakpoints"));
        }
        const response = await this.raw.dataBreakpointInfo(args);
        return response?.body;
    }
    async sendDataBreakpoints(dataBreakpoints) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'data breakpoints'));
        }
        if (this.raw.readyForBreakpoints) {
            const converted = await Promise.all(dataBreakpoints.map(async (bp) => {
                try {
                    const dap = await bp.toDAP(this);
                    return { dap, bp };
                }
                catch (e) {
                    return { bp, message: e.message };
                }
            }));
            const response = await this.raw.setDataBreakpoints({ breakpoints: converted.map(d => d.dap).filter(isDefined) });
            if (response?.body) {
                const data = new Map();
                let i = 0;
                for (const dap of converted) {
                    if (!dap.dap) {
                        data.set(dap.bp.getId(), dap.message);
                    }
                    else if (i < response.body.breakpoints.length) {
                        data.set(dap.bp.getId(), response.body.breakpoints[i++]);
                    }
                }
                this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
            }
        }
    }
    async sendInstructionBreakpoints(instructionBreakpoints) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'instruction breakpoints'));
        }
        if (this.raw.readyForBreakpoints) {
            const response = await this.raw.setInstructionBreakpoints({ breakpoints: instructionBreakpoints.map(ib => ib.toDAP()) });
            if (response?.body) {
                const data = new Map();
                for (let i = 0; i < instructionBreakpoints.length; i++) {
                    data.set(instructionBreakpoints[i].getId(), response.body.breakpoints[i]);
                }
                this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
            }
        }
    }
    async breakpointsLocations(uri, lineNumber) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'breakpoints locations'));
        }
        const source = this.getRawSource(uri);
        const response = await this.raw.breakpointLocations({ source, line: lineNumber });
        if (!response || !response.body || !response.body.breakpoints) {
            return [];
        }
        const positions = response.body.breakpoints.map(bp => ({ lineNumber: bp.line, column: bp.column || 1 }));
        return distinct(positions, p => `${p.lineNumber}:${p.column}`);
    }
    getDebugProtocolBreakpoint(breakpointId) {
        return this.model.getDebugProtocolBreakpoint(breakpointId, this.getId());
    }
    customRequest(request, args) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", request));
        }
        return this.raw.custom(request, args);
    }
    stackTrace(threadId, startFrame, levels, token) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stackTrace'));
        }
        const sessionToken = this.getNewCancellationToken(threadId, token);
        return this.raw.stackTrace({ threadId, startFrame, levels }, sessionToken);
    }
    async exceptionInfo(threadId) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'exceptionInfo'));
        }
        const response = await this.raw.exceptionInfo({ threadId });
        if (response) {
            return {
                id: response.body.exceptionId,
                description: response.body.description,
                breakMode: response.body.breakMode,
                details: response.body.details
            };
        }
        return undefined;
    }
    scopes(frameId, threadId) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'scopes'));
        }
        const token = this.getNewCancellationToken(threadId);
        return this.raw.scopes({ frameId }, token);
    }
    variables(variablesReference, threadId, filter, start, count) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'variables'));
        }
        const token = threadId ? this.getNewCancellationToken(threadId) : undefined;
        return this.raw.variables({ variablesReference, filter, start, count }, token);
    }
    evaluate(expression, frameId, context, location) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'evaluate'));
        }
        return this.raw.evaluate({ expression, frameId, context, line: location?.line, column: location?.column, source: location?.source });
    }
    async restartFrame(frameId, threadId) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'restartFrame'));
        }
        await this.raw.restartFrame({ frameId }, threadId);
    }
    setLastSteppingGranularity(threadId, granularity) {
        const thread = this.getThread(threadId);
        if (thread) {
            thread.lastSteppingGranularity = granularity;
        }
    }
    async next(threadId, granularity) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'next'));
        }
        this.setLastSteppingGranularity(threadId, granularity);
        await this.raw.next({ threadId, granularity });
    }
    async stepIn(threadId, targetId, granularity) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stepIn'));
        }
        this.setLastSteppingGranularity(threadId, granularity);
        await this.raw.stepIn({ threadId, targetId, granularity });
    }
    async stepOut(threadId, granularity) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stepOut'));
        }
        this.setLastSteppingGranularity(threadId, granularity);
        await this.raw.stepOut({ threadId, granularity });
    }
    async stepBack(threadId, granularity) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stepBack'));
        }
        this.setLastSteppingGranularity(threadId, granularity);
        await this.raw.stepBack({ threadId, granularity });
    }
    async continue(threadId) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'continue'));
        }
        await this.raw.continue({ threadId });
    }
    async reverseContinue(threadId) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'reverse continue'));
        }
        await this.raw.reverseContinue({ threadId });
    }
    async pause(threadId) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'pause'));
        }
        await this.raw.pause({ threadId });
    }
    async terminateThreads(threadIds) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'terminateThreads'));
        }
        await this.raw.terminateThreads({ threadIds });
    }
    setVariable(variablesReference, name, value) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'setVariable'));
        }
        return this.raw.setVariable({ variablesReference, name, value });
    }
    setExpression(frameId, expression, value) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'setExpression'));
        }
        return this.raw.setExpression({ expression, value, frameId });
    }
    gotoTargets(source, line, column) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'gotoTargets'));
        }
        return this.raw.gotoTargets({ source, line, column });
    }
    goto(threadId, targetId) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'goto'));
        }
        return this.raw.goto({ threadId, targetId });
    }
    loadSource(resource) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'loadSource')));
        }
        const source = this.getSourceForUri(resource);
        let rawSource;
        if (source) {
            rawSource = source.raw;
        }
        else {
            // create a Source
            const data = Source.getEncodedDebugData(resource);
            rawSource = { path: data.path, sourceReference: data.sourceReference };
        }
        return this.raw.source({ sourceReference: rawSource.sourceReference || 0, source: rawSource });
    }
    async getLoadedSources() {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'getLoadedSources')));
        }
        const response = await this.raw.loadedSources({});
        if (response?.body && response.body.sources) {
            return response.body.sources.map(src => this.getSource(src));
        }
        else {
            return [];
        }
    }
    async completions(frameId, threadId, text, position, token) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'completions')));
        }
        const sessionCancelationToken = this.getNewCancellationToken(threadId, token);
        return this.raw.completions({
            frameId,
            text,
            column: position.column,
            line: position.lineNumber,
        }, sessionCancelationToken);
    }
    async stepInTargets(frameId) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stepInTargets')));
        }
        const response = await this.raw.stepInTargets({ frameId });
        return response?.body.targets;
    }
    async cancel(progressId) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'cancel')));
        }
        return this.raw.cancel({ progressId });
    }
    async disassemble(memoryReference, offset, instructionOffset, instructionCount) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'disassemble')));
        }
        const response = await this.raw.disassemble({ memoryReference, offset, instructionOffset, instructionCount, resolveSymbols: true });
        return response?.body?.instructions;
    }
    readMemory(memoryReference, offset, count) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'readMemory')));
        }
        return this.raw.readMemory({ count, memoryReference, offset });
    }
    writeMemory(memoryReference, offset, data, allowPartial) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'disassemble')));
        }
        return this.raw.writeMemory({ memoryReference, offset, allowPartial, data });
    }
    async resolveLocationReference(locationReference) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'locations'));
        }
        const location = await this.raw.locations({ locationReference });
        if (!location?.body) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'locations'));
        }
        const source = this.getSource(location.body.source);
        return { column: 1, ...location.body, source };
    }
    //---- threads
    getThread(threadId) {
        return this.threads.get(threadId);
    }
    getAllThreads() {
        const result = [];
        this.threadIds.forEach((threadId) => {
            const thread = this.threads.get(threadId);
            if (thread) {
                result.push(thread);
            }
        });
        return result;
    }
    clearThreads(removeThreads, reference = undefined) {
        if (reference !== undefined && reference !== null) {
            const thread = this.threads.get(reference);
            if (thread) {
                thread.clearCallStack();
                thread.stoppedDetails = undefined;
                thread.stopped = false;
                if (removeThreads) {
                    this.threads.delete(reference);
                }
            }
        }
        else {
            this.threads.forEach(thread => {
                thread.clearCallStack();
                thread.stoppedDetails = undefined;
                thread.stopped = false;
            });
            if (removeThreads) {
                this.threads.clear();
                this.threadIds = [];
                ExpressionContainer.allValues.clear();
            }
        }
    }
    getStoppedDetails() {
        return this.stoppedDetails.length >= 1 ? this.stoppedDetails[0] : undefined;
    }
    rawUpdate(data) {
        this.threadIds = [];
        data.threads.forEach(thread => {
            this.threadIds.push(thread.id);
            if (!this.threads.has(thread.id)) {
                // A new thread came in, initialize it.
                this.threads.set(thread.id, new Thread(this, thread.name, thread.id));
            }
            else if (thread.name) {
                // Just the thread name got updated #18244
                const oldThread = this.threads.get(thread.id);
                if (oldThread) {
                    oldThread.name = thread.name;
                }
            }
        });
        this.threads.forEach(t => {
            // Remove all old threads which are no longer part of the update #75980
            if (this.threadIds.indexOf(t.threadId) === -1) {
                this.threads.delete(t.threadId);
            }
        });
        const stoppedDetails = data.stoppedDetails;
        if (stoppedDetails) {
            // Set the availability of the threads' callstacks depending on
            // whether the thread is stopped or not
            if (stoppedDetails.allThreadsStopped) {
                this.threads.forEach(thread => {
                    thread.stoppedDetails = thread.threadId === stoppedDetails.threadId ? stoppedDetails : { reason: thread.stoppedDetails?.reason };
                    thread.stopped = true;
                    thread.clearCallStack();
                });
            }
            else {
                const thread = typeof stoppedDetails.threadId === 'number' ? this.threads.get(stoppedDetails.threadId) : undefined;
                if (thread) {
                    // One thread is stopped, only update that thread.
                    thread.stoppedDetails = stoppedDetails;
                    thread.clearCallStack();
                    thread.stopped = true;
                }
            }
        }
    }
    waitForTriggeredBreakpoints() {
        if (!this._waitToResume) {
            return;
        }
        return raceTimeout(this._waitToResume, TRIGGERED_BREAKPOINT_MAX_DELAY);
    }
    async fetchThreads(stoppedDetails) {
        if (this.raw) {
            const response = await this.raw.threads();
            if (response?.body && response.body.threads) {
                this.model.rawUpdate({
                    sessionId: this.getId(),
                    threads: response.body.threads,
                    stoppedDetails
                });
            }
        }
    }
    initializeForTest(raw) {
        this.raw = raw;
        this.registerListeners();
    }
    //---- private
    registerListeners() {
        if (!this.raw) {
            return;
        }
        this.rawListeners.add(this.raw.onDidInitialize(async () => {
            aria.status(this.configuration.noDebug
                ? localize('debuggingStartedNoDebug', "Started running without debugging.")
                : localize('debuggingStarted', "Debugging started."));
            const sendConfigurationDone = async () => {
                if (this.raw && this.raw.capabilities.supportsConfigurationDoneRequest) {
                    try {
                        await this.raw.configurationDone();
                    }
                    catch (e) {
                        // Disconnect the debug session on configuration done error #10596
                        this.notificationService.error(e);
                        this.raw?.disconnect({});
                    }
                }
                return undefined;
            };
            // Send all breakpoints
            try {
                await this.debugService.sendAllBreakpoints(this);
            }
            finally {
                await sendConfigurationDone();
                await this.fetchThreads();
            }
        }));
        const statusQueue = this.statusQueue;
        this.rawListeners.add(this.raw.onDidStop(event => this.handleStop(event.body)));
        this.rawListeners.add(this.raw.onDidThread(event => {
            statusQueue.cancel([event.body.threadId]);
            if (event.body.reason === 'started') {
                // debounce to reduce threadsRequest frequency and improve performance
                if (!this.fetchThreadsScheduler) {
                    this.fetchThreadsScheduler = new RunOnceScheduler(() => {
                        this.fetchThreads();
                    }, 100);
                    this.rawListeners.add(this.fetchThreadsScheduler);
                }
                if (!this.fetchThreadsScheduler.isScheduled()) {
                    this.fetchThreadsScheduler.schedule();
                }
            }
            else if (event.body.reason === 'exited') {
                this.model.clearThreads(this.getId(), true, event.body.threadId);
                const viewModel = this.debugService.getViewModel();
                const focusedThread = viewModel.focusedThread;
                this.passFocusScheduler.cancel();
                if (focusedThread && event.body.threadId === focusedThread.threadId) {
                    // De-focus the thread in case it was focused
                    this.debugService.focusStackFrame(undefined, undefined, viewModel.focusedSession, { explicit: false });
                }
            }
        }));
        this.rawListeners.add(this.raw.onDidTerminateDebugee(async (event) => {
            aria.status(localize('debuggingStopped', "Debugging stopped."));
            if (event.body && event.body.restart) {
                await this.debugService.restartSession(this, event.body.restart);
            }
            else if (this.raw) {
                await this.raw.disconnect({ terminateDebuggee: false });
            }
        }));
        this.rawListeners.add(this.raw.onDidContinued(event => {
            const allThreads = event.body.allThreadsContinued !== false;
            statusQueue.cancel(allThreads ? undefined : [event.body.threadId]);
            const threadId = allThreads ? undefined : event.body.threadId;
            if (typeof threadId === 'number') {
                this.stoppedDetails = this.stoppedDetails.filter(sd => sd.threadId !== threadId);
                const tokens = this.cancellationMap.get(threadId);
                this.cancellationMap.delete(threadId);
                tokens?.forEach(t => t.dispose(true));
            }
            else {
                this.stoppedDetails = [];
                this.cancelAllRequests();
            }
            this.lastContinuedThreadId = threadId;
            // We need to pass focus to other sessions / threads with a timeout in case a quick stop event occurs #130321
            this.passFocusScheduler.schedule();
            this.model.clearThreads(this.getId(), false, threadId);
            this._onDidChangeState.fire();
        }));
        const outputQueue = new Queue();
        this.rawListeners.add(this.raw.onDidOutput(async (event) => {
            const outputSeverity = event.body.category === 'stderr' ? Severity.Error : event.body.category === 'console' ? Severity.Warning : Severity.Info;
            // When a variables event is received, execute immediately to obtain the variables value #126967
            if (event.body.variablesReference) {
                const source = event.body.source && event.body.line ? {
                    lineNumber: event.body.line,
                    column: event.body.column ? event.body.column : 1,
                    source: this.getSource(event.body.source)
                } : undefined;
                const container = new ExpressionContainer(this, undefined, event.body.variablesReference, generateUuid());
                const children = container.getChildren();
                // we should put appendToRepl into queue to make sure the logs to be displayed in correct order
                // see https://github.com/microsoft/vscode/issues/126967#issuecomment-874954269
                outputQueue.queue(async () => {
                    const resolved = await children;
                    // For single logged variables, try to use the output if we can so
                    // present a better (i.e. ANSI-aware) representation of the output
                    if (resolved.length === 1) {
                        this.appendToRepl({ output: event.body.output, expression: resolved[0], sev: outputSeverity, source }, event.body.category === 'important');
                        return;
                    }
                    resolved.forEach((child) => {
                        // Since we can not display multiple trees in a row, we are displaying these variables one after the other (ignoring their names)
                        child.name = null;
                        this.appendToRepl({ output: '', expression: child, sev: outputSeverity, source }, event.body.category === 'important');
                    });
                });
                return;
            }
            outputQueue.queue(async () => {
                if (!event.body || !this.raw) {
                    return;
                }
                if (event.body.category === 'telemetry') {
                    // only log telemetry events from debug adapter if the debug extension provided the telemetry key
                    // and the user opted in telemetry
                    const telemetryEndpoint = this.raw.dbgr.getCustomTelemetryEndpoint();
                    if (telemetryEndpoint && this.telemetryService.telemetryLevel !== 0 /* TelemetryLevel.NONE */) {
                        // __GDPR__TODO__ We're sending events in the name of the debug extension and we can not ensure that those are declared correctly.
                        let data = event.body.data;
                        if (!telemetryEndpoint.sendErrorTelemetry && event.body.data) {
                            data = filterExceptionsFromTelemetry(event.body.data);
                        }
                        this.customEndpointTelemetryService.publicLog(telemetryEndpoint, event.body.output, data);
                    }
                    return;
                }
                // Make sure to append output in the correct order by properly waiting on preivous promises #33822
                const source = event.body.source && event.body.line ? {
                    lineNumber: event.body.line,
                    column: event.body.column ? event.body.column : 1,
                    source: this.getSource(event.body.source)
                } : undefined;
                if (event.body.group === 'start' || event.body.group === 'startCollapsed') {
                    const expanded = event.body.group === 'start';
                    this.repl.startGroup(this, event.body.output || '', expanded, source);
                    return;
                }
                if (event.body.group === 'end') {
                    this.repl.endGroup();
                    if (!event.body.output) {
                        // Only return if the end event does not have additional output in it
                        return;
                    }
                }
                if (typeof event.body.output === 'string') {
                    this.appendToRepl({ output: event.body.output, sev: outputSeverity, source }, event.body.category === 'important');
                }
            });
        }));
        this.rawListeners.add(this.raw.onDidBreakpoint(event => {
            const id = event.body && event.body.breakpoint ? event.body.breakpoint.id : undefined;
            const breakpoint = this.model.getBreakpoints().find(bp => bp.getIdFromAdapter(this.getId()) === id);
            const functionBreakpoint = this.model.getFunctionBreakpoints().find(bp => bp.getIdFromAdapter(this.getId()) === id);
            const dataBreakpoint = this.model.getDataBreakpoints().find(dbp => dbp.getIdFromAdapter(this.getId()) === id);
            const exceptionBreakpoint = this.model.getExceptionBreakpoints().find(excbp => excbp.getIdFromAdapter(this.getId()) === id);
            if (event.body.reason === 'new' && event.body.breakpoint.source && event.body.breakpoint.line) {
                const source = this.getSource(event.body.breakpoint.source);
                const bps = this.model.addBreakpoints(source.uri, [{
                        column: event.body.breakpoint.column,
                        enabled: true,
                        lineNumber: event.body.breakpoint.line,
                    }], false);
                if (bps.length === 1) {
                    const data = new Map([[bps[0].getId(), event.body.breakpoint]]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
            }
            if (event.body.reason === 'removed') {
                if (breakpoint) {
                    this.model.removeBreakpoints([breakpoint]);
                }
                if (functionBreakpoint) {
                    this.model.removeFunctionBreakpoints(functionBreakpoint.getId());
                }
                if (dataBreakpoint) {
                    this.model.removeDataBreakpoints(dataBreakpoint.getId());
                }
            }
            if (event.body.reason === 'changed') {
                if (breakpoint) {
                    if (!breakpoint.column) {
                        event.body.breakpoint.column = undefined;
                    }
                    const data = new Map([[breakpoint.getId(), event.body.breakpoint]]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
                if (functionBreakpoint) {
                    const data = new Map([[functionBreakpoint.getId(), event.body.breakpoint]]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
                if (dataBreakpoint) {
                    const data = new Map([[dataBreakpoint.getId(), event.body.breakpoint]]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
                if (exceptionBreakpoint) {
                    const data = new Map([[exceptionBreakpoint.getId(), event.body.breakpoint]]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
            }
        }));
        this.rawListeners.add(this.raw.onDidLoadedSource(event => {
            this._onDidLoadedSource.fire({
                reason: event.body.reason,
                source: this.getSource(event.body.source)
            });
        }));
        this.rawListeners.add(this.raw.onDidCustomEvent(event => {
            this._onDidCustomEvent.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidProgressStart(event => {
            this._onDidProgressStart.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidProgressUpdate(event => {
            this._onDidProgressUpdate.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidProgressEnd(event => {
            this._onDidProgressEnd.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidInvalidateMemory(event => {
            this._onDidInvalidMemory.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidInvalidated(async (event) => {
            const areas = event.body.areas || ['all'];
            // If invalidated event only requires to update variables or watch, do that, otherwise refetch threads https://github.com/microsoft/vscode/issues/106745
            if (areas.includes('threads') || areas.includes('stacks') || areas.includes('all')) {
                this.cancelAllRequests();
                this.model.clearThreads(this.getId(), true);
                const details = this.stoppedDetails;
                this.stoppedDetails.length = 1;
                await Promise.all(details.map(d => this.handleStop(d)));
            }
            const viewModel = this.debugService.getViewModel();
            if (viewModel.focusedSession === this) {
                viewModel.updateViews();
            }
        }));
        this.rawListeners.add(this.raw.onDidExitAdapter(event => this.onDidExitAdapter(event)));
    }
    async handleStop(event) {
        this.passFocusScheduler.cancel();
        this.stoppedDetails.push(event);
        // do this very eagerly if we have hitBreakpointIds, since it may take a
        // moment for breakpoints to set and we want to do our best to not miss
        // anything
        if (event.hitBreakpointIds) {
            this._waitToResume = this.enableDependentBreakpoints(event.hitBreakpointIds);
        }
        this.statusQueue.run(this.fetchThreads(event).then(() => event.threadId === undefined ? this.threadIds : [event.threadId]), async (threadId, token) => {
            const hasLotsOfThreads = event.threadId === undefined && this.threadIds.length > 10;
            // If the focus for the current session is on a non-existent thread, clear the focus.
            const focusedThread = this.debugService.getViewModel().focusedThread;
            const focusedThreadDoesNotExist = focusedThread !== undefined && focusedThread.session === this && !this.threads.has(focusedThread.threadId);
            if (focusedThreadDoesNotExist) {
                this.debugService.focusStackFrame(undefined, undefined);
            }
            const thread = typeof threadId === 'number' ? this.getThread(threadId) : undefined;
            if (thread) {
                // Call fetch call stack twice, the first only return the top stack frame.
                // Second retrieves the rest of the call stack. For performance reasons #25605
                // Second call is only done if there's few threads that stopped in this event.
                const promises = this.model.refreshTopOfCallstack(thread, /* fetchFullStack= */ !hasLotsOfThreads);
                const focus = async () => {
                    if (focusedThreadDoesNotExist || (!event.preserveFocusHint && thread.getCallStack().length)) {
                        const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
                        if (!focusedStackFrame || focusedStackFrame.thread.session === this) {
                            // Only take focus if nothing is focused, or if the focus is already on the current session
                            const preserveFocus = !this.configurationService.getValue('debug').focusEditorOnBreak;
                            await this.debugService.focusStackFrame(undefined, thread, undefined, { preserveFocus });
                        }
                        if (thread.stoppedDetails && !token.isCancellationRequested) {
                            if (thread.stoppedDetails.reason === 'breakpoint' && this.configurationService.getValue('debug').openDebug === 'openOnDebugBreak' && !this.suppressDebugView) {
                                await this.paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
                            }
                            if (this.configurationService.getValue('debug').focusWindowOnBreak && !this.workbenchEnvironmentService.extensionTestsLocationURI) {
                                const activeWindow = getActiveWindow();
                                if (!activeWindow.document.hasFocus()) {
                                    await this.hostService.focus(mainWindow, { force: true /* Application may not be active */ });
                                }
                            }
                        }
                    }
                };
                await promises.topCallStack;
                if (!event.hitBreakpointIds) { // if hitBreakpointIds are present, this is handled earlier on
                    this._waitToResume = this.enableDependentBreakpoints(thread);
                }
                if (token.isCancellationRequested) {
                    return;
                }
                focus();
                await promises.wholeCallStack;
                if (token.isCancellationRequested) {
                    return;
                }
                const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
                if (!focusedStackFrame || isFrameDeemphasized(focusedStackFrame)) {
                    // The top stack frame can be deemphesized so try to focus again #68616
                    focus();
                }
            }
            this._onDidChangeState.fire();
        });
    }
    async enableDependentBreakpoints(hitBreakpointIdsOrThread) {
        let breakpoints;
        if (Array.isArray(hitBreakpointIdsOrThread)) {
            breakpoints = this.model.getBreakpoints().filter(bp => hitBreakpointIdsOrThread.includes(bp.getIdFromAdapter(this.id)));
        }
        else {
            const frame = hitBreakpointIdsOrThread.getTopStackFrame();
            if (frame === undefined) {
                return;
            }
            if (hitBreakpointIdsOrThread.stoppedDetails && hitBreakpointIdsOrThread.stoppedDetails.reason !== 'breakpoint') {
                return;
            }
            breakpoints = this.getBreakpointsAtPosition(frame.source.uri, frame.range.startLineNumber, frame.range.endLineNumber, frame.range.startColumn, frame.range.endColumn);
        }
        // find the current breakpoints
        // check if the current breakpoints are dependencies, and if so collect and send the dependents to DA
        const urisToResend = new Set();
        this.model.getBreakpoints({ triggeredOnly: true, enabledOnly: true }).forEach(bp => {
            breakpoints.forEach(cbp => {
                if (bp.enabled && bp.triggeredBy === cbp.getId()) {
                    bp.setSessionDidTrigger(this.getId());
                    urisToResend.add(bp.uri.toString());
                }
            });
        });
        const results = [];
        urisToResend.forEach((uri) => results.push(this.debugService.sendBreakpoints(URI.parse(uri), undefined, this)));
        return Promise.all(results);
    }
    getBreakpointsAtPosition(uri, startLineNumber, endLineNumber, startColumn, endColumn) {
        return this.model.getBreakpoints({ uri: uri }).filter(bp => {
            if (bp.lineNumber < startLineNumber || bp.lineNumber > endLineNumber) {
                return false;
            }
            if (bp.column && (bp.column < startColumn || bp.column > endColumn)) {
                return false;
            }
            return true;
        });
    }
    onDidExitAdapter(event) {
        this.initialized = true;
        this.model.setBreakpointSessionData(this.getId(), this.capabilities, undefined);
        this.shutdown();
        this._onDidEndAdapter.fire(event);
    }
    // Disconnects and clears state. Session can be initialized again for a new connection.
    shutdown() {
        this.rawListeners.clear();
        if (this.raw) {
            // Send out disconnect and immediatly dispose (do not wait for response) #127418
            this.raw.disconnect({});
            this.raw.dispose();
            this.raw = undefined;
        }
        this.fetchThreadsScheduler?.dispose();
        this.fetchThreadsScheduler = undefined;
        this.passFocusScheduler.cancel();
        this.passFocusScheduler.dispose();
        this.model.clearThreads(this.getId(), true);
        this._onDidChangeState.fire();
    }
    dispose() {
        this.cancelAllRequests();
        this.rawListeners.dispose();
        this.globalDisposables.dispose();
    }
    //---- sources
    getSourceForUri(uri) {
        return this.sources.get(this.uriIdentityService.asCanonicalUri(uri).toString());
    }
    getSource(raw) {
        let source = new Source(raw, this.getId(), this.uriIdentityService, this.logService);
        const uriKey = source.uri.toString();
        const found = this.sources.get(uriKey);
        if (found) {
            source = found;
            // merge attributes of new into existing
            source.raw = mixin(source.raw, raw);
            if (source.raw && raw) {
                // Always take the latest presentation hint from adapter #42139
                source.raw.presentationHint = raw.presentationHint;
            }
        }
        else {
            this.sources.set(uriKey, source);
        }
        return source;
    }
    getRawSource(uri) {
        const source = this.getSourceForUri(uri);
        if (source) {
            return source.raw;
        }
        else {
            const data = Source.getEncodedDebugData(uri);
            return { name: data.name, path: data.path, sourceReference: data.sourceReference };
        }
    }
    getNewCancellationToken(threadId, token) {
        const tokenSource = new CancellationTokenSource(token);
        const tokens = this.cancellationMap.get(threadId) || [];
        tokens.push(tokenSource);
        this.cancellationMap.set(threadId, tokens);
        return tokenSource.token;
    }
    cancelAllRequests() {
        this.cancellationMap.forEach(tokens => tokens.forEach(t => t.dispose(true)));
        this.cancellationMap.clear();
    }
    // REPL
    getReplElements() {
        return this.repl.getReplElements();
    }
    hasSeparateRepl() {
        return !this.parentSession || this._options.repl !== 'mergeWithParent';
    }
    removeReplExpressions() {
        this.repl.removeReplExpressions();
    }
    async addReplExpression(stackFrame, expression) {
        await this.repl.addReplExpression(this, stackFrame, expression);
        // Evaluate all watch expressions and fetch variables again since repl evaluation might have changed some.
        this.debugService.getViewModel().updateViews();
    }
    appendToRepl(data, isImportant) {
        this.repl.appendToRepl(this, data);
        if (isImportant) {
            this.notificationService.notify({ message: data.output.toString(), severity: data.sev, source: this.name });
        }
    }
};
DebugSession = __decorate([
    __param(5, IDebugService),
    __param(6, ITelemetryService),
    __param(7, IHostService),
    __param(8, IConfigurationService),
    __param(9, IPaneCompositePartService),
    __param(10, IWorkspaceContextService),
    __param(11, IProductService),
    __param(12, INotificationService),
    __param(13, ILifecycleService),
    __param(14, IUriIdentityService),
    __param(15, IInstantiationService),
    __param(16, ICustomEndpointTelemetryService),
    __param(17, IWorkbenchEnvironmentService),
    __param(18, ILogService),
    __param(19, ITestService),
    __param(20, ITestResultService),
    __param(21, IAccessibilityService)
], DebugSession);
export { DebugSession };
/**
 * Keeps track of events for threads, and cancels any previous operations for
 * a thread when the thread goes into a new state. Currently, the operations a thread has are:
 *
 * - started
 * - stopped
 * - continue
 * - exited
 *
 * In each case, the new state preempts the old state, so we don't need to
 * queue work, just cancel old work. It's up to the caller to make sure that
 * no UI effects happen at the point when the `token` is cancelled.
 */
export class ThreadStatusScheduler extends Disposable {
    constructor() {
        super(...arguments);
        /**
         * An array of set of thread IDs. When a 'stopped' event is encountered, the
         * editor refreshes its thread IDs. In the meantime, the thread may change
         * state it again. So the editor puts a Set into this array when it starts
         * the refresh, and checks it after the refresh is finished, to see if
         * any of the threads it looked up should now be invalidated.
         */
        this.pendingCancellations = [];
        /**
         * Cancellation tokens for currently-running operations on threads.
         */
        this.threadOps = this._register(new DisposableMap());
    }
    /**
     * Runs the operation.
     * If thread is undefined it affects all threads.
     */
    async run(threadIdsP, operation) {
        const cancelledWhileLookingUpThreads = new Set();
        this.pendingCancellations.push(cancelledWhileLookingUpThreads);
        const threadIds = await threadIdsP;
        // Now that we got our threads,
        // 1. Remove our pending set, and
        // 2. Cancel any slower callers who might also have found this thread
        for (let i = 0; i < this.pendingCancellations.length; i++) {
            const s = this.pendingCancellations[i];
            if (s === cancelledWhileLookingUpThreads) {
                this.pendingCancellations.splice(i, 1);
                break;
            }
            else {
                for (const threadId of threadIds) {
                    s.add(threadId);
                }
            }
        }
        if (cancelledWhileLookingUpThreads.has(undefined)) {
            return;
        }
        await Promise.all(threadIds.map(threadId => {
            if (cancelledWhileLookingUpThreads.has(threadId)) {
                return;
            }
            this.threadOps.get(threadId)?.cancel();
            const cts = new CancellationTokenSource();
            this.threadOps.set(threadId, cts);
            return operation(threadId, cts.token);
        }));
    }
    /**
     * Cancels all ongoing state operations on the given threads.
     * If threads is undefined it cancel all threads.
     */
    cancel(threadIds) {
        if (!threadIds) {
            for (const [_, op] of this.threadOps) {
                op.cancel();
            }
            this.threadOps.clearAndDisposeAll();
            for (const s of this.pendingCancellations) {
                s.add(undefined);
            }
        }
        else {
            for (const threadId of threadIds) {
                this.threadOps.get(threadId)?.cancel();
                this.threadOps.deleteAndDispose(threadId);
                for (const s of this.pendingCancellations) {
                    s.add(threadId);
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1Nlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0ksT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUs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