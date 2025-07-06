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
import { Action } from '../../../../base/common/actions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { RunOnceScheduler, raceTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isErrorWithActions } from '../../../../base/common/errorMessage.js';
import * as errors from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { deepClone, equals } from '../../../../base/common/objects.js';
import severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { VIEWLET_ID as EXPLORER_VIEWLET_ID } from '../../files/common/files.js';
import { ITestService } from '../../testing/common/testService.js';
import { CALLSTACK_VIEW_ID, CONTEXT_BREAKPOINTS_EXIST, CONTEXT_DEBUG_STATE, CONTEXT_DEBUG_TYPE, CONTEXT_DEBUG_UX, CONTEXT_DISASSEMBLY_VIEW_FOCUS, CONTEXT_HAS_DEBUGGED, CONTEXT_IN_DEBUG_MODE, DEBUG_MEMORY_SCHEME, DEBUG_SCHEME, REPL_VIEW_ID, VIEWLET_ID, debuggerDisabledMessage, getStateLabel } from '../common/debug.js';
import { DebugCompoundRoot } from '../common/debugCompoundRoot.js';
import { Breakpoint, DataBreakpoint, DebugModel, FunctionBreakpoint, InstructionBreakpoint } from '../common/debugModel.js';
import { Source } from '../common/debugSource.js';
import { DebugStorage } from '../common/debugStorage.js';
import { DebugTelemetry } from '../common/debugTelemetry.js';
import { getExtensionHostDebugSession, saveAllBeforeDebugStart } from '../common/debugUtils.js';
import { ViewModel } from '../common/debugViewModel.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import { AdapterManager } from './debugAdapterManager.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL } from './debugCommands.js';
import { ConfigurationManager } from './debugConfigurationManager.js';
import { DebugMemoryFileSystemProvider } from './debugMemory.js';
import { DebugSession } from './debugSession.js';
import { DebugTaskRunner } from './debugTaskRunner.js';
let DebugService = class DebugService {
    constructor(editorService, paneCompositeService, viewsService, viewDescriptorService, notificationService, dialogService, layoutService, contextService, contextKeyService, lifecycleService, instantiationService, extensionService, fileService, configurationService, extensionHostDebugService, activityService, commandService, quickInputService, workspaceTrustRequestService, uriIdentityService, testService) {
        this.editorService = editorService;
        this.paneCompositeService = paneCompositeService;
        this.viewsService = viewsService;
        this.viewDescriptorService = viewDescriptorService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.layoutService = layoutService;
        this.contextService = contextService;
        this.contextKeyService = contextKeyService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.extensionHostDebugService = extensionHostDebugService;
        this.activityService = activityService;
        this.commandService = commandService;
        this.quickInputService = quickInputService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.uriIdentityService = uriIdentityService;
        this.testService = testService;
        this.restartingSessions = new Set();
        this.disposables = new DisposableStore();
        this.initializing = false;
        this.sessionCancellationTokens = new Map();
        this.haveDoneLazySetup = false;
        this.breakpointsToSendOnResourceSaved = new Set();
        this._onDidChangeState = new Emitter();
        this._onDidNewSession = new Emitter();
        this._onWillNewSession = new Emitter();
        this._onDidEndSession = new Emitter();
        this.adapterManager = this.instantiationService.createInstance(AdapterManager, {
            onDidNewSession: this.onDidNewSession,
            configurationManager: () => this.configurationManager,
        });
        this.disposables.add(this.adapterManager);
        this.configurationManager = this.instantiationService.createInstance(ConfigurationManager, this.adapterManager);
        this.disposables.add(this.configurationManager);
        this.debugStorage = this.disposables.add(this.instantiationService.createInstance(DebugStorage));
        this.chosenEnvironments = this.debugStorage.loadChosenEnvironments();
        this.model = this.instantiationService.createInstance(DebugModel, this.debugStorage);
        this.telemetry = this.instantiationService.createInstance(DebugTelemetry, this.model);
        this.viewModel = new ViewModel(contextKeyService);
        this.taskRunner = this.instantiationService.createInstance(DebugTaskRunner);
        this.disposables.add(this.fileService.onDidFilesChange(e => this.onFileChanges(e)));
        this.disposables.add(this.lifecycleService.onWillShutdown(this.dispose, this));
        this.disposables.add(this.extensionHostDebugService.onAttachSession(event => {
            const session = this.model.getSession(event.sessionId, true);
            if (session) {
                // EH was started in debug mode -> attach to it
                session.configuration.request = 'attach';
                session.configuration.port = event.port;
                session.setSubId(event.subId);
                this.launchOrAttachToSession(session);
            }
        }));
        this.disposables.add(this.extensionHostDebugService.onTerminateSession(event => {
            const session = this.model.getSession(event.sessionId);
            if (session && session.subId === event.subId) {
                session.disconnect();
            }
        }));
        this.disposables.add(this.viewModel.onDidFocusStackFrame(() => {
            this.onStateChange();
        }));
        this.disposables.add(this.viewModel.onDidFocusSession((session) => {
            this.onStateChange();
            if (session) {
                this.setExceptionBreakpointFallbackSession(session.getId());
            }
        }));
        this.disposables.add(Event.any(this.adapterManager.onDidRegisterDebugger, this.configurationManager.onDidSelectConfiguration)(() => {
            const debugUxValue = (this.state !== 0 /* State.Inactive */ || (this.configurationManager.getAllConfigurations().length > 0 && this.adapterManager.hasEnabledDebuggers())) ? 'default' : 'simple';
            this.debugUx.set(debugUxValue);
            this.debugStorage.storeDebugUxState(debugUxValue);
        }));
        this.disposables.add(this.model.onDidChangeCallStack(() => {
            const numberOfSessions = this.model.getSessions().filter(s => !s.parentSession).length;
            this.activity?.dispose();
            if (numberOfSessions > 0) {
                const viewContainer = this.viewDescriptorService.getViewContainerByViewId(CALLSTACK_VIEW_ID);
                if (viewContainer) {
                    this.activity = this.activityService.showViewContainerActivity(viewContainer.id, { badge: new NumberBadge(numberOfSessions, n => n === 1 ? nls.localize('1activeSession', "1 active session") : nls.localize('nActiveSessions', "{0} active sessions", n)) });
                }
            }
        }));
        this.disposables.add(editorService.onDidActiveEditorChange(() => {
            this.contextKeyService.bufferChangeEvents(() => {
                if (editorService.activeEditor === DisassemblyViewInput.instance) {
                    this.disassemblyViewFocus.set(true);
                }
                else {
                    // This key can be initialized a tick after this event is fired
                    this.disassemblyViewFocus?.reset();
                }
            });
        }));
        this.disposables.add(this.lifecycleService.onBeforeShutdown(() => {
            for (const editor of editorService.editors) {
                // Editors will not be valid on window reload, so close them.
                if (editor.resource?.scheme === DEBUG_MEMORY_SCHEME) {
                    editor.dispose();
                }
            }
        }));
        this.disposables.add(extensionService.onWillStop(evt => {
            evt.veto(this.model.getSessions().length > 0, nls.localize('active debug session', 'A debug session is still running that would terminate.'));
        }));
        this.initContextKeys(contextKeyService);
    }
    initContextKeys(contextKeyService) {
        queueMicrotask(() => {
            contextKeyService.bufferChangeEvents(() => {
                this.debugType = CONTEXT_DEBUG_TYPE.bindTo(contextKeyService);
                this.debugState = CONTEXT_DEBUG_STATE.bindTo(contextKeyService);
                this.hasDebugged = CONTEXT_HAS_DEBUGGED.bindTo(contextKeyService);
                this.inDebugMode = CONTEXT_IN_DEBUG_MODE.bindTo(contextKeyService);
                this.debugUx = CONTEXT_DEBUG_UX.bindTo(contextKeyService);
                this.debugUx.set(this.debugStorage.loadDebugUxState());
                this.breakpointsExist = CONTEXT_BREAKPOINTS_EXIST.bindTo(contextKeyService);
                // Need to set disassemblyViewFocus here to make it in the same context as the debug event handlers
                this.disassemblyViewFocus = CONTEXT_DISASSEMBLY_VIEW_FOCUS.bindTo(contextKeyService);
            });
            const setBreakpointsExistContext = () => this.breakpointsExist.set(!!(this.model.getBreakpoints().length || this.model.getDataBreakpoints().length || this.model.getFunctionBreakpoints().length));
            setBreakpointsExistContext();
            this.disposables.add(this.model.onDidChangeBreakpoints(() => setBreakpointsExistContext()));
        });
    }
    getModel() {
        return this.model;
    }
    getViewModel() {
        return this.viewModel;
    }
    getConfigurationManager() {
        return this.configurationManager;
    }
    getAdapterManager() {
        return this.adapterManager;
    }
    sourceIsNotAvailable(uri) {
        this.model.sourceIsNotAvailable(uri);
    }
    dispose() {
        this.disposables.dispose();
    }
    //---- state management
    get state() {
        const focusedSession = this.viewModel.focusedSession;
        if (focusedSession) {
            return focusedSession.state;
        }
        return this.initializing ? 1 /* State.Initializing */ : 0 /* State.Inactive */;
    }
    get initializingOptions() {
        return this._initializingOptions;
    }
    startInitializingState(options) {
        if (!this.initializing) {
            this.initializing = true;
            this._initializingOptions = options;
            this.onStateChange();
        }
    }
    endInitializingState() {
        if (this.initializing) {
            this.initializing = false;
            this._initializingOptions = undefined;
            this.onStateChange();
        }
    }
    cancelTokens(id) {
        if (id) {
            const token = this.sessionCancellationTokens.get(id);
            if (token) {
                token.cancel();
                this.sessionCancellationTokens.delete(id);
            }
        }
        else {
            this.sessionCancellationTokens.forEach(t => t.cancel());
            this.sessionCancellationTokens.clear();
        }
    }
    onStateChange() {
        const state = this.state;
        if (this.previousState !== state) {
            this.contextKeyService.bufferChangeEvents(() => {
                this.debugState.set(getStateLabel(state));
                this.inDebugMode.set(state !== 0 /* State.Inactive */);
                // Only show the simple ux if debug is not yet started and if no launch.json exists
                const debugUxValue = ((state !== 0 /* State.Inactive */ && state !== 1 /* State.Initializing */) || (this.adapterManager.hasEnabledDebuggers() && this.configurationManager.selectedConfiguration.name)) ? 'default' : 'simple';
                this.debugUx.set(debugUxValue);
                this.debugStorage.storeDebugUxState(debugUxValue);
            });
            this.previousState = state;
            this._onDidChangeState.fire(state);
        }
    }
    get onDidChangeState() {
        return this._onDidChangeState.event;
    }
    get onDidNewSession() {
        return this._onDidNewSession.event;
    }
    get onWillNewSession() {
        return this._onWillNewSession.event;
    }
    get onDidEndSession() {
        return this._onDidEndSession.event;
    }
    lazySetup() {
        if (!this.haveDoneLazySetup) {
            // Registering fs providers is slow
            // https://github.com/microsoft/vscode/issues/159886
            this.disposables.add(this.fileService.registerProvider(DEBUG_MEMORY_SCHEME, this.disposables.add(new DebugMemoryFileSystemProvider(this))));
            this.haveDoneLazySetup = true;
        }
    }
    //---- life cycle management
    /**
     * main entry point
     * properly manages compounds, checks for errors and handles the initializing state.
     */
    async startDebugging(launch, configOrName, options, saveBeforeStart = !options?.parentSession) {
        const message = options && options.noDebug ? nls.localize('runTrust', "Running executes build tasks and program code from your workspace.") : nls.localize('debugTrust', "Debugging executes build tasks and program code from your workspace.");
        const trust = await this.workspaceTrustRequestService.requestWorkspaceTrust({ message });
        if (!trust) {
            return false;
        }
        this.lazySetup();
        this.startInitializingState(options);
        this.hasDebugged.set(true);
        try {
            // make sure to save all files and that the configuration is up to date
            await this.extensionService.activateByEvent('onDebug');
            if (saveBeforeStart) {
                await saveAllBeforeDebugStart(this.configurationService, this.editorService);
            }
            await this.extensionService.whenInstalledExtensionsRegistered();
            let config;
            let compound;
            if (!configOrName) {
                configOrName = this.configurationManager.selectedConfiguration.name;
            }
            if (typeof configOrName === 'string' && launch) {
                config = launch.getConfiguration(configOrName);
                compound = launch.getCompound(configOrName);
            }
            else if (typeof configOrName !== 'string') {
                config = configOrName;
            }
            if (compound) {
                // we are starting a compound debug, first do some error checking and than start each configuration in the compound
                if (!compound.configurations) {
                    throw new Error(nls.localize({ key: 'compoundMustHaveConfigurations', comment: ['compound indicates a "compounds" configuration item', '"configurations" is an attribute and should not be localized'] }, "Compound must have \"configurations\" attribute set in order to start multiple configurations."));
                }
                if (compound.preLaunchTask) {
                    const taskResult = await this.taskRunner.runTaskAndCheckErrors(launch?.workspace || this.contextService.getWorkspace(), compound.preLaunchTask);
                    if (taskResult === 0 /* TaskRunResult.Failure */) {
                        this.endInitializingState();
                        return false;
                    }
                }
                if (compound.stopAll) {
                    options = { ...options, compoundRoot: new DebugCompoundRoot() };
                }
                const values = await Promise.all(compound.configurations.map(configData => {
                    const name = typeof configData === 'string' ? configData : configData.name;
                    if (name === compound.name) {
                        return Promise.resolve(false);
                    }
                    let launchForName;
                    if (typeof configData === 'string') {
                        const launchesContainingName = this.configurationManager.getLaunches().filter(l => !!l.getConfiguration(name));
                        if (launchesContainingName.length === 1) {
                            launchForName = launchesContainingName[0];
                        }
                        else if (launch && launchesContainingName.length > 1 && launchesContainingName.indexOf(launch) >= 0) {
                            // If there are multiple launches containing the configuration give priority to the configuration in the current launch
                            launchForName = launch;
                        }
                        else {
                            throw new Error(launchesContainingName.length === 0 ? nls.localize('noConfigurationNameInWorkspace', "Could not find launch configuration '{0}' in the workspace.", name)
                                : nls.localize('multipleConfigurationNamesInWorkspace', "There are multiple launch configurations '{0}' in the workspace. Use folder name to qualify the configuration.", name));
                        }
                    }
                    else if (configData.folder) {
                        const launchesMatchingConfigData = this.configurationManager.getLaunches().filter(l => l.workspace && l.workspace.name === configData.folder && !!l.getConfiguration(configData.name));
                        if (launchesMatchingConfigData.length === 1) {
                            launchForName = launchesMatchingConfigData[0];
                        }
                        else {
                            throw new Error(nls.localize('noFolderWithName', "Can not find folder with name '{0}' for configuration '{1}' in compound '{2}'.", configData.folder, configData.name, compound.name));
                        }
                    }
                    return this.createSession(launchForName, launchForName.getConfiguration(name), options);
                }));
                const result = values.every(success => !!success); // Compound launch is a success only if each configuration launched successfully
                this.endInitializingState();
                return result;
            }
            if (configOrName && !config) {
                const message = !!launch ? nls.localize('configMissing', "Configuration '{0}' is missing in 'launch.json'.", typeof configOrName === 'string' ? configOrName : configOrName.name) :
                    nls.localize('launchJsonDoesNotExist', "'launch.json' does not exist for passed workspace folder.");
                throw new Error(message);
            }
            const result = await this.createSession(launch, config, options);
            this.endInitializingState();
            return result;
        }
        catch (err) {
            // make sure to get out of initializing state, and propagate the result
            this.notificationService.error(err);
            this.endInitializingState();
            return Promise.reject(err);
        }
    }
    /**
     * gets the debugger for the type, resolves configurations by providers, substitutes variables and runs prelaunch tasks
     */
    async createSession(launch, config, options) {
        // We keep the debug type in a separate variable 'type' so that a no-folder config has no attributes.
        // Storing the type in the config would break extensions that assume that the no-folder case is indicated by an empty config.
        let type;
        if (config) {
            type = config.type;
        }
        else {
            // a no-folder workspace has no launch.config
            config = Object.create(null);
        }
        if (options && options.noDebug) {
            config.noDebug = true;
        }
        else if (options && typeof options.noDebug === 'undefined' && options.parentSession && options.parentSession.configuration.noDebug) {
            config.noDebug = true;
        }
        const unresolvedConfig = deepClone(config);
        let guess;
        let activeEditor;
        if (!type) {
            activeEditor = this.editorService.activeEditor;
            if (activeEditor && activeEditor.resource) {
                const chosen = this.chosenEnvironments[activeEditor.resource.toString()];
                if (chosen) {
                    type = chosen.type;
                    if (chosen.dynamicLabel) {
                        const dyn = await this.configurationManager.getDynamicConfigurationsByType(chosen.type);
                        const found = dyn.find(d => d.label === chosen.dynamicLabel);
                        if (found) {
                            launch = found.launch;
                            Object.assign(config, found.config);
                        }
                    }
                }
            }
            if (!type) {
                guess = await this.adapterManager.guessDebugger(false);
                if (guess) {
                    type = guess.debugger.type;
                    if (guess.withConfig) {
                        launch = guess.withConfig.launch;
                        Object.assign(config, guess.withConfig.config);
                    }
                }
            }
        }
        const initCancellationToken = new CancellationTokenSource();
        const sessionId = generateUuid();
        this.sessionCancellationTokens.set(sessionId, initCancellationToken);
        const configByProviders = await this.configurationManager.resolveConfigurationByProviders(launch && launch.workspace ? launch.workspace.uri : undefined, type, config, initCancellationToken.token);
        // a falsy config indicates an aborted launch
        if (configByProviders && configByProviders.type) {
            try {
                let resolvedConfig = await this.substituteVariables(launch, configByProviders);
                if (!resolvedConfig) {
                    // User cancelled resolving of interactive variables, silently return
                    return false;
                }
                if (initCancellationToken.token.isCancellationRequested) {
                    // User cancelled, silently return
                    return false;
                }
                const workspace = launch?.workspace || this.contextService.getWorkspace();
                const taskResult = await this.taskRunner.runTaskAndCheckErrors(workspace, resolvedConfig.preLaunchTask);
                if (taskResult === 0 /* TaskRunResult.Failure */) {
                    return false;
                }
                const cfg = await this.configurationManager.resolveDebugConfigurationWithSubstitutedVariables(launch && launch.workspace ? launch.workspace.uri : undefined, resolvedConfig.type, resolvedConfig, initCancellationToken.token);
                if (!cfg) {
                    if (launch && type && cfg === null && !initCancellationToken.token.isCancellationRequested) { // show launch.json only for "config" being "null".
                        await launch.openConfigFile({ preserveFocus: true, type }, initCancellationToken.token);
                    }
                    return false;
                }
                resolvedConfig = cfg;
                const dbg = this.adapterManager.getDebugger(resolvedConfig.type);
                if (!dbg || (configByProviders.request !== 'attach' && configByProviders.request !== 'launch')) {
                    let message;
                    if (configByProviders.request !== 'attach' && configByProviders.request !== 'launch') {
                        message = configByProviders.request ? nls.localize('debugRequestNotSupported', "Attribute '{0}' has an unsupported value '{1}' in the chosen debug configuration.", 'request', configByProviders.request)
                            : nls.localize('debugRequesMissing', "Attribute '{0}' is missing from the chosen debug configuration.", 'request');
                    }
                    else {
                        message = resolvedConfig.type ? nls.localize('debugTypeNotSupported', "Configured debug type '{0}' is not supported.", resolvedConfig.type) :
                            nls.localize('debugTypeMissing', "Missing property 'type' for the chosen launch configuration.");
                    }
                    const actionList = [];
                    actionList.push(new Action('installAdditionalDebuggers', nls.localize({ key: 'installAdditionalDebuggers', comment: ['Placeholder is the debug type, so for example "node", "python"'] }, "Install {0} Extension", resolvedConfig.type), undefined, true, async () => this.commandService.executeCommand('debug.installAdditionalDebuggers', resolvedConfig?.type)));
                    await this.showError(message, actionList);
                    return false;
                }
                if (!dbg.enabled) {
                    await this.showError(debuggerDisabledMessage(dbg.type), []);
                    return false;
                }
                const result = await this.doCreateSession(sessionId, launch?.workspace, { resolved: resolvedConfig, unresolved: unresolvedConfig }, options);
                if (result && guess && activeEditor && activeEditor.resource) {
                    // Remeber user choice of environment per active editor to make starting debugging smoother #124770
                    this.chosenEnvironments[activeEditor.resource.toString()] = { type: guess.debugger.type, dynamicLabel: guess.withConfig?.label };
                    this.debugStorage.storeChosenEnvironments(this.chosenEnvironments);
                }
                return result;
            }
            catch (err) {
                if (err && err.message) {
                    await this.showError(err.message);
                }
                else if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                    await this.showError(nls.localize('noFolderWorkspaceDebugError', "The active file can not be debugged. Make sure it is saved and that you have a debug extension installed for that file type."));
                }
                if (launch && !initCancellationToken.token.isCancellationRequested) {
                    await launch.openConfigFile({ preserveFocus: true }, initCancellationToken.token);
                }
                return false;
            }
        }
        if (launch && type && configByProviders === null && !initCancellationToken.token.isCancellationRequested) { // show launch.json only for "config" being "null".
            await launch.openConfigFile({ preserveFocus: true, type }, initCancellationToken.token);
        }
        return false;
    }
    /**
     * instantiates the new session, initializes the session, registers session listeners and reports telemetry
     */
    async doCreateSession(sessionId, root, configuration, options) {
        const session = this.instantiationService.createInstance(DebugSession, sessionId, configuration, root, this.model, options);
        if (options?.startedByUser && this.model.getSessions().some(s => s.getLabel() === session.getLabel()) && configuration.resolved.suppressMultipleSessionWarning !== true) {
            // There is already a session with the same name, prompt user #127721
            const result = await this.dialogService.confirm({ message: nls.localize('multipleSession', "'{0}' is already running. Do you want to start another instance?", session.getLabel()) });
            if (!result.confirmed) {
                return false;
            }
        }
        this.model.addSession(session);
        // since the Session is now properly registered under its ID and hooked, we can announce it
        // this event doesn't go to extensions
        this._onWillNewSession.fire(session);
        const openDebug = this.configurationService.getValue('debug').openDebug;
        // Open debug viewlet based on the visibility of the side bar and openDebug setting. Do not open for 'run without debug'
        if (!configuration.resolved.noDebug && (openDebug === 'openOnSessionStart' || (openDebug !== 'neverOpen' && this.viewModel.firstSessionStart)) && !session.suppressDebugView) {
            await this.paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
        }
        try {
            await this.launchOrAttachToSession(session);
            const internalConsoleOptions = session.configuration.internalConsoleOptions || this.configurationService.getValue('debug').internalConsoleOptions;
            if (internalConsoleOptions === 'openOnSessionStart' || (this.viewModel.firstSessionStart && internalConsoleOptions === 'openOnFirstSessionStart')) {
                this.viewsService.openView(REPL_VIEW_ID, false);
            }
            this.viewModel.firstSessionStart = false;
            const showSubSessions = this.configurationService.getValue('debug').showSubSessionsInToolBar;
            const sessions = this.model.getSessions();
            const shownSessions = showSubSessions ? sessions : sessions.filter(s => !s.parentSession);
            if (shownSessions.length > 1) {
                this.viewModel.setMultiSessionView(true);
            }
            // since the initialized response has arrived announce the new Session (including extensions)
            this._onDidNewSession.fire(session);
            return true;
        }
        catch (error) {
            if (errors.isCancellationError(error)) {
                // don't show 'canceled' error messages to the user #7906
                return false;
            }
            // Show the repl if some error got logged there #5870
            if (session && session.getReplElements().length > 0) {
                this.viewsService.openView(REPL_VIEW_ID, false);
            }
            if (session.configuration && session.configuration.request === 'attach' && session.configuration.__autoAttach) {
                // ignore attach timeouts in auto attach mode
                return false;
            }
            const errorMessage = error instanceof Error ? error.message : error;
            if (error.showUser !== false) {
                // Only show the error when showUser is either not defined, or is true #128484
                await this.showError(errorMessage, isErrorWithActions(error) ? error.actions : []);
            }
            return false;
        }
    }
    async launchOrAttachToSession(session, forceFocus = false) {
        // register listeners as the very first thing!
        this.registerSessionListeners(session);
        const dbgr = this.adapterManager.getDebugger(session.configuration.type);
        try {
            await session.initialize(dbgr);
            await session.launchOrAttach(session.configuration);
            const launchJsonExists = !!session.root && !!this.configurationService.getValue('launch', { resource: session.root.uri });
            await this.telemetry.logDebugSessionStart(dbgr, launchJsonExists);
            if (forceFocus || !this.viewModel.focusedSession || (session.parentSession === this.viewModel.focusedSession && session.compact)) {
                await this.focusStackFrame(undefined, undefined, session);
            }
        }
        catch (err) {
            if (this.viewModel.focusedSession === session) {
                await this.focusStackFrame(undefined);
            }
            return Promise.reject(err);
        }
    }
    registerSessionListeners(session) {
        const listenerDisposables = new DisposableStore();
        this.disposables.add(listenerDisposables);
        const sessionRunningScheduler = listenerDisposables.add(new RunOnceScheduler(() => {
            // Do not immediatly defocus the stack frame if the session is running
            if (session.state === 3 /* State.Running */ && this.viewModel.focusedSession === session) {
                this.viewModel.setFocus(undefined, this.viewModel.focusedThread, session, false);
            }
        }, 200));
        listenerDisposables.add(session.onDidChangeState(() => {
            if (session.state === 3 /* State.Running */ && this.viewModel.focusedSession === session) {
                sessionRunningScheduler.schedule();
            }
            if (session === this.viewModel.focusedSession) {
                this.onStateChange();
            }
        }));
        listenerDisposables.add(this.onDidEndSession(e => {
            if (e.session === session) {
                this.disposables.delete(listenerDisposables);
            }
        }));
        listenerDisposables.add(session.onDidEndAdapter(async (adapterExitEvent) => {
            if (adapterExitEvent) {
                if (adapterExitEvent.error) {
                    this.notificationService.error(nls.localize('debugAdapterCrash', "Debug adapter process has terminated unexpectedly ({0})", adapterExitEvent.error.message || adapterExitEvent.error.toString()));
                }
                this.telemetry.logDebugSessionStop(session, adapterExitEvent);
            }
            // 'Run without debugging' mode VSCode must terminate the extension host. More details: #3905
            const extensionDebugSession = getExtensionHostDebugSession(session);
            if (extensionDebugSession && extensionDebugSession.state === 3 /* State.Running */ && extensionDebugSession.configuration.noDebug) {
                this.extensionHostDebugService.close(extensionDebugSession.getId());
            }
            if (session.configuration.postDebugTask) {
                const root = session.root ?? this.contextService.getWorkspace();
                try {
                    await this.taskRunner.runTask(root, session.configuration.postDebugTask);
                }
                catch (err) {
                    this.notificationService.error(err);
                }
            }
            this.endInitializingState();
            this.cancelTokens(session.getId());
            if (this.configurationService.getValue('debug').closeReadonlyTabsOnEnd) {
                const editorsToClose = this.editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */).filter(({ editor }) => {
                    return editor.resource?.scheme === DEBUG_SCHEME && session.getId() === Source.getEncodedDebugData(editor.resource).sessionId;
                });
                this.editorService.closeEditors(editorsToClose);
            }
            this._onDidEndSession.fire({ session, restart: this.restartingSessions.has(session) });
            const focusedSession = this.viewModel.focusedSession;
            if (focusedSession && focusedSession.getId() === session.getId()) {
                const { session, thread, stackFrame } = getStackFrameThreadAndSessionToFocus(this.model, undefined, undefined, undefined, focusedSession);
                this.viewModel.setFocus(stackFrame, thread, session, false);
            }
            if (this.model.getSessions().length === 0) {
                this.viewModel.setMultiSessionView(false);
                if (this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) && this.configurationService.getValue('debug').openExplorerOnEnd) {
                    this.paneCompositeService.openPaneComposite(EXPLORER_VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
                }
                // Data breakpoints that can not be persisted should be cleared when a session ends
                const dataBreakpoints = this.model.getDataBreakpoints().filter(dbp => !dbp.canPersist);
                dataBreakpoints.forEach(dbp => this.model.removeDataBreakpoints(dbp.getId()));
                if (this.configurationService.getValue('debug').console.closeOnEnd) {
                    const debugConsoleContainer = this.viewDescriptorService.getViewContainerByViewId(REPL_VIEW_ID);
                    if (debugConsoleContainer && this.viewsService.isViewContainerVisible(debugConsoleContainer.id)) {
                        this.viewsService.closeViewContainer(debugConsoleContainer.id);
                    }
                }
            }
            this.model.removeExceptionBreakpointsForSession(session.getId());
            // session.dispose(); TODO@roblourens
        }));
    }
    async restartSession(session, restartData) {
        if (session.saveBeforeRestart) {
            await saveAllBeforeDebugStart(this.configurationService, this.editorService);
        }
        const isAutoRestart = !!restartData;
        const runTasks = async () => {
            if (isAutoRestart) {
                // Do not run preLaunch and postDebug tasks for automatic restarts
                return Promise.resolve(1 /* TaskRunResult.Success */);
            }
            const root = session.root || this.contextService.getWorkspace();
            await this.taskRunner.runTask(root, session.configuration.preRestartTask);
            await this.taskRunner.runTask(root, session.configuration.postDebugTask);
            const taskResult1 = await this.taskRunner.runTaskAndCheckErrors(root, session.configuration.preLaunchTask);
            if (taskResult1 !== 1 /* TaskRunResult.Success */) {
                return taskResult1;
            }
            return this.taskRunner.runTaskAndCheckErrors(root, session.configuration.postRestartTask);
        };
        const extensionDebugSession = getExtensionHostDebugSession(session);
        if (extensionDebugSession) {
            const taskResult = await runTasks();
            if (taskResult === 1 /* TaskRunResult.Success */) {
                this.extensionHostDebugService.reload(extensionDebugSession.getId());
            }
            return;
        }
        // Read the configuration again if a launch.json has been changed, if not just use the inmemory configuration
        let needsToSubstitute = false;
        let unresolved;
        const launch = session.root ? this.configurationManager.getLaunch(session.root.uri) : undefined;
        if (launch) {
            unresolved = launch.getConfiguration(session.configuration.name);
            if (unresolved && !equals(unresolved, session.unresolvedConfiguration)) {
                unresolved.noDebug = session.configuration.noDebug;
                needsToSubstitute = true;
            }
        }
        let resolved = session.configuration;
        if (launch && needsToSubstitute && unresolved) {
            const initCancellationToken = new CancellationTokenSource();
            this.sessionCancellationTokens.set(session.getId(), initCancellationToken);
            const resolvedByProviders = await this.configurationManager.resolveConfigurationByProviders(launch.workspace ? launch.workspace.uri : undefined, unresolved.type, unresolved, initCancellationToken.token);
            if (resolvedByProviders) {
                resolved = await this.substituteVariables(launch, resolvedByProviders);
                if (resolved && !initCancellationToken.token.isCancellationRequested) {
                    resolved = await this.configurationManager.resolveDebugConfigurationWithSubstitutedVariables(launch && launch.workspace ? launch.workspace.uri : undefined, resolved.type, resolved, initCancellationToken.token);
                }
            }
            else {
                resolved = resolvedByProviders;
            }
        }
        if (resolved) {
            session.setConfiguration({ resolved, unresolved });
        }
        session.configuration.__restart = restartData;
        const doRestart = async (fn) => {
            this.restartingSessions.add(session);
            let didRestart = false;
            try {
                didRestart = (await fn()) !== false;
            }
            catch (e) {
                didRestart = false;
                throw e;
            }
            finally {
                this.restartingSessions.delete(session);
                // we previously may have issued an onDidEndSession with restart: true,
                // assuming the adapter exited (in `registerSessionListeners`). But the
                // restart failed, so emit the final termination now.
                if (!didRestart) {
                    this._onDidEndSession.fire({ session, restart: false });
                }
            }
        };
        for (const breakpoint of this.model.getBreakpoints({ triggeredOnly: true })) {
            breakpoint.setSessionDidTrigger(session.getId(), false);
        }
        // For debug sessions spawned by test runs, cancel the test run and stop
        // the session, then start the test run again; tests have no notion of restarts.
        if (session.correlatedTestRun) {
            if (!session.correlatedTestRun.completedAt) {
                session.cancelCorrelatedTestRun();
                await Event.toPromise(session.correlatedTestRun.onComplete);
                // todo@connor4312 is there any reason to wait for the debug session to
                // terminate? I don't think so, test extension should already handle any
                // state conflicts...
            }
            this.testService.runResolvedTests(session.correlatedTestRun.request);
            return;
        }
        if (session.capabilities.supportsRestartRequest) {
            const taskResult = await runTasks();
            if (taskResult === 1 /* TaskRunResult.Success */) {
                await doRestart(async () => {
                    await session.restart();
                    return true;
                });
            }
            return;
        }
        const shouldFocus = !!this.viewModel.focusedSession && session.getId() === this.viewModel.focusedSession.getId();
        return doRestart(async () => {
            // If the restart is automatic  -> disconnect, otherwise -> terminate #55064
            if (isAutoRestart) {
                await session.disconnect(true);
            }
            else {
                await session.terminate(true);
            }
            return new Promise((c, e) => {
                setTimeout(async () => {
                    const taskResult = await runTasks();
                    if (taskResult !== 1 /* TaskRunResult.Success */) {
                        return c(false);
                    }
                    if (!resolved) {
                        return c(false);
                    }
                    try {
                        await this.launchOrAttachToSession(session, shouldFocus);
                        this._onDidNewSession.fire(session);
                        c(true);
                    }
                    catch (error) {
                        e(error);
                    }
                }, 300);
            });
        });
    }
    async stopSession(session, disconnect = false, suspend = false) {
        if (session) {
            return disconnect ? session.disconnect(undefined, suspend) : session.terminate();
        }
        const sessions = this.model.getSessions();
        if (sessions.length === 0) {
            this.taskRunner.cancel();
            // User might have cancelled starting of a debug session, and in some cases the quick pick is left open
            await this.quickInputService.cancel();
            this.endInitializingState();
            this.cancelTokens(undefined);
        }
        return Promise.all(sessions.map(s => disconnect ? s.disconnect(undefined, suspend) : s.terminate()));
    }
    async substituteVariables(launch, config) {
        const dbg = this.adapterManager.getDebugger(config.type);
        if (dbg) {
            let folder = undefined;
            if (launch && launch.workspace) {
                folder = launch.workspace;
            }
            else {
                const folders = this.contextService.getWorkspace().folders;
                if (folders.length === 1) {
                    folder = folders[0];
                }
            }
            try {
                return await dbg.substituteVariables(folder, config);
            }
            catch (err) {
                this.showError(err.message, undefined, !!launch?.getConfiguration(config.name));
                return undefined; // bail out
            }
        }
        return Promise.resolve(config);
    }
    async showError(message, errorActions = [], promptLaunchJson = true) {
        const configureAction = new Action(DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL, undefined, true, () => this.commandService.executeCommand(DEBUG_CONFIGURE_COMMAND_ID));
        // Don't append the standard command if id of any provided action indicates it is a command
        const actions = errorActions.filter((action) => action.id.endsWith('.command')).length > 0 ?
            errorActions :
            [...errorActions, ...(promptLaunchJson ? [configureAction] : [])];
        await this.dialogService.prompt({
            type: severity.Error,
            message,
            buttons: actions.map(action => ({
                label: action.label,
                run: () => action.run()
            })),
            cancelButton: true
        });
    }
    //---- focus management
    async focusStackFrame(_stackFrame, _thread, _session, options) {
        const { stackFrame, thread, session } = getStackFrameThreadAndSessionToFocus(this.model, _stackFrame, _thread, _session);
        if (stackFrame) {
            const editor = await stackFrame.openInEditor(this.editorService, options?.preserveFocus ?? true, options?.sideBySide, options?.pinned);
            if (editor) {
                if (editor.input === DisassemblyViewInput.instance) {
                    // Go to address is invoked via setFocus
                }
                else {
                    const control = editor.getControl();
                    if (stackFrame && isCodeEditor(control) && control.hasModel()) {
                        const model = control.getModel();
                        const lineNumber = stackFrame.range.startLineNumber;
                        if (lineNumber >= 1 && lineNumber <= model.getLineCount()) {
                            const lineContent = control.getModel().getLineContent(lineNumber);
                            aria.alert(nls.localize({ key: 'debuggingPaused', comment: ['First placeholder is the file line content, second placeholder is the reason why debugging is stopped, for example "breakpoint", third is the stack frame name, and last is the line number.'] }, "{0}, debugging paused {1}, {2}:{3}", lineContent, thread && thread.stoppedDetails ? `, reason ${thread.stoppedDetails.reason}` : '', stackFrame.source ? stackFrame.source.name : '', stackFrame.range.startLineNumber));
                        }
                    }
                }
            }
        }
        if (session) {
            this.debugType.set(session.configuration.type);
        }
        else {
            this.debugType.reset();
        }
        this.viewModel.setFocus(stackFrame, thread, session, !!options?.explicit);
    }
    //---- watches
    addWatchExpression(name) {
        const we = this.model.addWatchExpression(name);
        if (!name) {
            this.viewModel.setSelectedExpression(we, false);
        }
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    renameWatchExpression(id, newName) {
        this.model.renameWatchExpression(id, newName);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    moveWatchExpression(id, position) {
        this.model.moveWatchExpression(id, position);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    removeWatchExpressions(id) {
        this.model.removeWatchExpressions(id);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    //---- breakpoints
    canSetBreakpointsIn(model) {
        return this.adapterManager.canSetBreakpointsIn(model);
    }
    async enableOrDisableBreakpoints(enable, breakpoint) {
        if (breakpoint) {
            this.model.setEnablement(breakpoint, enable);
            this.debugStorage.storeBreakpoints(this.model);
            if (breakpoint instanceof Breakpoint) {
                await this.makeTriggeredBreakpointsMatchEnablement(enable, breakpoint);
                await this.sendBreakpoints(breakpoint.originalUri);
            }
            else if (breakpoint instanceof FunctionBreakpoint) {
                await this.sendFunctionBreakpoints();
            }
            else if (breakpoint instanceof DataBreakpoint) {
                await this.sendDataBreakpoints();
            }
            else if (breakpoint instanceof InstructionBreakpoint) {
                await this.sendInstructionBreakpoints();
            }
            else {
                await this.sendExceptionBreakpoints();
            }
        }
        else {
            this.model.enableOrDisableAllBreakpoints(enable);
            this.debugStorage.storeBreakpoints(this.model);
            await this.sendAllBreakpoints();
        }
        this.debugStorage.storeBreakpoints(this.model);
    }
    async addBreakpoints(uri, rawBreakpoints, ariaAnnounce = true) {
        const breakpoints = this.model.addBreakpoints(uri, rawBreakpoints);
        if (ariaAnnounce) {
            breakpoints.forEach(bp => aria.status(nls.localize('breakpointAdded', "Added breakpoint, line {0}, file {1}", bp.lineNumber, uri.fsPath)));
        }
        // In some cases we need to store breakpoints before we send them because sending them can take a long time
        // And after sending them because the debug adapter can attach adapter data to a breakpoint
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendBreakpoints(uri);
        this.debugStorage.storeBreakpoints(this.model);
        return breakpoints;
    }
    async updateBreakpoints(uri, data, sendOnResourceSaved) {
        this.model.updateBreakpoints(data);
        this.debugStorage.storeBreakpoints(this.model);
        if (sendOnResourceSaved) {
            this.breakpointsToSendOnResourceSaved.add(uri);
        }
        else {
            await this.sendBreakpoints(uri);
            this.debugStorage.storeBreakpoints(this.model);
        }
    }
    async removeBreakpoints(id) {
        const breakpoints = this.model.getBreakpoints();
        const toRemove = breakpoints.filter(bp => !id || bp.getId() === id);
        // note: using the debugger-resolved uri for aria to reflect UI state
        toRemove.forEach(bp => aria.status(nls.localize('breakpointRemoved', "Removed breakpoint, line {0}, file {1}", bp.lineNumber, bp.uri.fsPath)));
        const urisToClear = new Set(toRemove.map(bp => bp.originalUri.toString()));
        this.model.removeBreakpoints(toRemove);
        this.unlinkTriggeredBreakpoints(breakpoints, toRemove).forEach(uri => urisToClear.add(uri.toString()));
        this.debugStorage.storeBreakpoints(this.model);
        await Promise.all([...urisToClear].map(uri => this.sendBreakpoints(URI.parse(uri))));
    }
    setBreakpointsActivated(activated) {
        this.model.setBreakpointsActivated(activated);
        return this.sendAllBreakpoints();
    }
    async addFunctionBreakpoint(opts, id) {
        this.model.addFunctionBreakpoint(opts ?? { name: '' }, id);
        // If opts not provided, sending the breakpoint is handled by a later to call to `updateFunctionBreakpoint`
        if (opts) {
            this.debugStorage.storeBreakpoints(this.model);
            await this.sendFunctionBreakpoints();
            this.debugStorage.storeBreakpoints(this.model);
        }
    }
    async updateFunctionBreakpoint(id, update) {
        this.model.updateFunctionBreakpoint(id, update);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendFunctionBreakpoints();
    }
    async removeFunctionBreakpoints(id) {
        this.model.removeFunctionBreakpoints(id);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendFunctionBreakpoints();
    }
    async addDataBreakpoint(opts) {
        this.model.addDataBreakpoint(opts);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
        this.debugStorage.storeBreakpoints(this.model);
    }
    async updateDataBreakpoint(id, update) {
        this.model.updateDataBreakpoint(id, update);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
    }
    async removeDataBreakpoints(id) {
        this.model.removeDataBreakpoints(id);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
    }
    async addInstructionBreakpoint(opts) {
        this.model.addInstructionBreakpoint(opts);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendInstructionBreakpoints();
        this.debugStorage.storeBreakpoints(this.model);
    }
    async removeInstructionBreakpoints(instructionReference, offset) {
        this.model.removeInstructionBreakpoints(instructionReference, offset);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendInstructionBreakpoints();
    }
    setExceptionBreakpointFallbackSession(sessionId) {
        this.model.setExceptionBreakpointFallbackSession(sessionId);
        this.debugStorage.storeBreakpoints(this.model);
    }
    setExceptionBreakpointsForSession(session, filters) {
        this.model.setExceptionBreakpointsForSession(session.getId(), filters);
        this.debugStorage.storeBreakpoints(this.model);
    }
    async setExceptionBreakpointCondition(exceptionBreakpoint, condition) {
        this.model.setExceptionBreakpointCondition(exceptionBreakpoint, condition);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendExceptionBreakpoints();
    }
    async sendAllBreakpoints(session) {
        const setBreakpointsPromises = distinct(this.model.getBreakpoints(), bp => bp.originalUri.toString())
            .map(bp => this.sendBreakpoints(bp.originalUri, false, session));
        // If sending breakpoints to one session which we know supports the configurationDone request, can make all requests in parallel
        if (session?.capabilities.supportsConfigurationDoneRequest) {
            await Promise.all([
                ...setBreakpointsPromises,
                this.sendFunctionBreakpoints(session),
                this.sendDataBreakpoints(session),
                this.sendInstructionBreakpoints(session),
                this.sendExceptionBreakpoints(session),
            ]);
        }
        else {
            await Promise.all(setBreakpointsPromises);
            await this.sendFunctionBreakpoints(session);
            await this.sendDataBreakpoints(session);
            await this.sendInstructionBreakpoints(session);
            // send exception breakpoints at the end since some debug adapters may rely on the order - this was the case before
            // the configurationDone request was introduced.
            await this.sendExceptionBreakpoints(session);
        }
    }
    /**
     * Removes the condition of triggered breakpoints that depended on
     * breakpoints in `removedBreakpoints`. Returns the URIs of resources that
     * had their breakpoints changed in this way.
     */
    unlinkTriggeredBreakpoints(allBreakpoints, removedBreakpoints) {
        const affectedUris = [];
        for (const removed of removedBreakpoints) {
            for (const existing of allBreakpoints) {
                if (!removedBreakpoints.includes(existing) && existing.triggeredBy === removed.getId()) {
                    this.model.updateBreakpoints(new Map([[existing.getId(), { triggeredBy: undefined }]]));
                    affectedUris.push(existing.originalUri);
                }
            }
        }
        return affectedUris;
    }
    async makeTriggeredBreakpointsMatchEnablement(enable, breakpoint) {
        if (enable) {
            /** If the breakpoint is being enabled, also ensure its triggerer is enabled */
            if (breakpoint.triggeredBy) {
                const trigger = this.model.getBreakpoints().find(bp => breakpoint.triggeredBy === bp.getId());
                if (trigger && !trigger.enabled) {
                    await this.enableOrDisableBreakpoints(enable, trigger);
                }
            }
        }
        /** Makes its triggeree states match the state of this breakpoint */
        await Promise.all(this.model.getBreakpoints()
            .filter(bp => bp.triggeredBy === breakpoint.getId() && bp.enabled !== enable)
            .map(bp => this.enableOrDisableBreakpoints(enable, bp)));
    }
    async sendBreakpoints(modelUri, sourceModified = false, session) {
        const breakpointsToSend = this.model.getBreakpoints({ originalUri: modelUri, enabledOnly: true });
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (!s.configuration.noDebug) {
                const sessionBps = breakpointsToSend.filter(bp => !bp.triggeredBy || bp.getSessionDidTrigger(s.getId()));
                await s.sendBreakpoints(modelUri, sessionBps, sourceModified);
            }
        });
    }
    async sendFunctionBreakpoints(session) {
        const breakpointsToSend = this.model.getFunctionBreakpoints().filter(fbp => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsFunctionBreakpoints && !s.configuration.noDebug) {
                await s.sendFunctionBreakpoints(breakpointsToSend);
            }
        });
    }
    async sendDataBreakpoints(session) {
        const breakpointsToSend = this.model.getDataBreakpoints().filter(fbp => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsDataBreakpoints && !s.configuration.noDebug) {
                await s.sendDataBreakpoints(breakpointsToSend);
            }
        });
    }
    async sendInstructionBreakpoints(session) {
        const breakpointsToSend = this.model.getInstructionBreakpoints().filter(fbp => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsInstructionBreakpoints && !s.configuration.noDebug) {
                await s.sendInstructionBreakpoints(breakpointsToSend);
            }
        });
    }
    sendExceptionBreakpoints(session) {
        return sendToOneOrAllSessions(this.model, session, async (s) => {
            const enabledExceptionBps = this.model.getExceptionBreakpointsForSession(s.getId()).filter(exb => exb.enabled);
            if (s.capabilities.supportsConfigurationDoneRequest && (!s.capabilities.exceptionBreakpointFilters || s.capabilities.exceptionBreakpointFilters.length === 0)) {
                // Only call `setExceptionBreakpoints` as specified in dap protocol #90001
                return;
            }
            if (!s.configuration.noDebug) {
                await s.sendExceptionBreakpoints(enabledExceptionBps);
            }
        });
    }
    onFileChanges(fileChangesEvent) {
        const toRemove = this.model.getBreakpoints().filter(bp => fileChangesEvent.contains(bp.originalUri, 2 /* FileChangeType.DELETED */));
        if (toRemove.length) {
            this.model.removeBreakpoints(toRemove);
        }
        const toSend = [];
        for (const uri of this.breakpointsToSendOnResourceSaved) {
            if (fileChangesEvent.contains(uri, 0 /* FileChangeType.UPDATED */)) {
                toSend.push(uri);
            }
        }
        for (const uri of toSend) {
            this.breakpointsToSendOnResourceSaved.delete(uri);
            this.sendBreakpoints(uri, true);
        }
    }
    async runTo(uri, lineNumber, column) {
        let breakpointToRemove;
        let threadToContinue = this.getViewModel().focusedThread;
        const addTempBreakPoint = async () => {
            const bpExists = !!(this.getModel().getBreakpoints({ column, lineNumber, uri }).length);
            if (!bpExists) {
                const addResult = await this.addAndValidateBreakpoints(uri, lineNumber, column);
                if (addResult.thread) {
                    threadToContinue = addResult.thread;
                }
                if (addResult.breakpoint) {
                    breakpointToRemove = addResult.breakpoint;
                }
            }
            return { threadToContinue, breakpointToRemove };
        };
        const removeTempBreakPoint = (state) => {
            if (state === 2 /* State.Stopped */ || state === 0 /* State.Inactive */) {
                if (breakpointToRemove) {
                    this.removeBreakpoints(breakpointToRemove.getId());
                }
                return true;
            }
            return false;
        };
        await addTempBreakPoint();
        if (this.state === 0 /* State.Inactive */) {
            // If no session exists start the debugger
            const { launch, name, getConfig } = this.getConfigurationManager().selectedConfiguration;
            const config = await getConfig();
            const configOrName = config ? Object.assign(deepClone(config), {}) : name;
            const listener = this.onDidChangeState(state => {
                if (removeTempBreakPoint(state)) {
                    listener.dispose();
                }
            });
            await this.startDebugging(launch, configOrName, undefined, true);
        }
        if (this.state === 2 /* State.Stopped */) {
            const focusedSession = this.getViewModel().focusedSession;
            if (!focusedSession || !threadToContinue) {
                return;
            }
            const listener = threadToContinue.session.onDidChangeState(() => {
                if (removeTempBreakPoint(focusedSession.state)) {
                    listener.dispose();
                }
            });
            await threadToContinue.continue();
        }
    }
    async addAndValidateBreakpoints(uri, lineNumber, column) {
        const debugModel = this.getModel();
        const viewModel = this.getViewModel();
        const breakpoints = await this.addBreakpoints(uri, [{ lineNumber, column }], false);
        const breakpoint = breakpoints?.[0];
        if (!breakpoint) {
            return { breakpoint: undefined, thread: viewModel.focusedThread };
        }
        // If the breakpoint was not initially verified, wait up to 2s for it to become so.
        // Inherently racey if multiple sessions can verify async, but not solvable...
        if (!breakpoint.verified) {
            let listener;
            await raceTimeout(new Promise(resolve => {
                listener = debugModel.onDidChangeBreakpoints(() => {
                    if (breakpoint.verified) {
                        resolve();
                    }
                });
            }), 2000);
            listener.dispose();
        }
        // Look at paused threads for sessions that verified this bp. Prefer, in order:
        let Score;
        (function (Score) {
            /** The focused thread */
            Score[Score["Focused"] = 0] = "Focused";
            /** Any other stopped thread of a session that verified the bp */
            Score[Score["Verified"] = 1] = "Verified";
            /** Any thread that verified and paused in the same file */
            Score[Score["VerifiedAndPausedInFile"] = 2] = "VerifiedAndPausedInFile";
            /** The focused thread if it verified the breakpoint */
            Score[Score["VerifiedAndFocused"] = 3] = "VerifiedAndFocused";
        })(Score || (Score = {}));
        let bestThread = viewModel.focusedThread;
        let bestScore = 0 /* Score.Focused */;
        for (const sessionId of breakpoint.sessionsThatVerified) {
            const session = debugModel.getSession(sessionId);
            if (!session) {
                continue;
            }
            const threads = session.getAllThreads().filter(t => t.stopped);
            if (bestScore < 3 /* Score.VerifiedAndFocused */) {
                if (viewModel.focusedThread && threads.includes(viewModel.focusedThread)) {
                    bestThread = viewModel.focusedThread;
                    bestScore = 3 /* Score.VerifiedAndFocused */;
                }
            }
            if (bestScore < 2 /* Score.VerifiedAndPausedInFile */) {
                const pausedInThisFile = threads.find(t => {
                    const top = t.getTopStackFrame();
                    return top && this.uriIdentityService.extUri.isEqual(top.source.uri, uri);
                });
                if (pausedInThisFile) {
                    bestThread = pausedInThisFile;
                    bestScore = 2 /* Score.VerifiedAndPausedInFile */;
                }
            }
            if (bestScore < 1 /* Score.Verified */) {
                bestThread = threads[0];
                bestScore = 2 /* Score.VerifiedAndPausedInFile */;
            }
        }
        return { thread: bestThread, breakpoint };
    }
};
DebugService = __decorate([
    __param(0, IEditorService),
    __param(1, IPaneCompositePartService),
    __param(2, IViewsService),
    __param(3, IViewDescriptorService),
    __param(4, INotificationService),
    __param(5, IDialogService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IWorkspaceContextService),
    __param(8, IContextKeyService),
    __param(9, ILifecycleService),
    __param(10, IInstantiationService),
    __param(11, IExtensionService),
    __param(12, IFileService),
    __param(13, IConfigurationService),
    __param(14, IExtensionHostDebugService),
    __param(15, IActivityService),
    __param(16, ICommandService),
    __param(17, IQuickInputService),
    __param(18, IWorkspaceTrustRequestService),
    __param(19, IUriIdentityService),
    __param(20, ITestService)
], DebugService);
export { DebugService };
export function getStackFrameThreadAndSessionToFocus(model, stackFrame, thread, session, avoidSession) {
    if (!session) {
        if (stackFrame || thread) {
            session = stackFrame ? stackFrame.thread.session : thread.session;
        }
        else {
            const sessions = model.getSessions();
            const stoppedSession = sessions.find(s => s.state === 2 /* State.Stopped */);
            // Make sure to not focus session that is going down
            session = stoppedSession || sessions.find(s => s !== avoidSession && s !== avoidSession?.parentSession) || (sessions.length ? sessions[0] : undefined);
        }
    }
    if (!thread) {
        if (stackFrame) {
            thread = stackFrame.thread;
        }
        else {
            const threads = session ? session.getAllThreads() : undefined;
            const stoppedThread = threads && threads.find(t => t.stopped);
            thread = stoppedThread || (threads && threads.length ? threads[0] : undefined);
        }
    }
    if (!stackFrame && thread) {
        stackFrame = thread.getTopStackFrame();
    }
    return { session, thread, stackFrame };
}
async function sendToOneOrAllSessions(model, session, send) {
    if (session) {
        await send(session);
    }
    else {
        await Promise.all(model.getSessions().map(s => send(s)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBYyxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFM0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUs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