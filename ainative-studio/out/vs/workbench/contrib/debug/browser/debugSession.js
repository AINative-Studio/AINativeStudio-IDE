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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdTZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEYsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNJLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsUUFBUSxFQUFF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