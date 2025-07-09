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
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import * as cssValue from '../../../../base/browser/cssValue.js';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { debounce, memoize } from '../../../../base/common/decorators.js';
import { DynamicListEventMultiplexer, Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ITerminalLogService, TerminalExitReason, TerminalLocation, TitleEventSource } from '../../../../platform/terminal/common/terminal.js';
import { formatMessageForTerminal } from '../../../../platform/terminal/common/terminalStrings.js';
import { iconForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { VirtualWorkspaceContext } from '../../../common/contextkeys.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, ITerminalService } from './terminal.js';
import { getCwdForSplit } from './terminalActions.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { getColorStyleContent, getUriClasses } from './terminalIcon.js';
import { TerminalProfileQuickpick } from './terminalProfileQuickpick.js';
import { getInstanceFromResource, getTerminalUri, parseTerminalUri } from './terminalUri.js';
import { ITerminalProfileService, TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { columnToEditorGroup } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { AUX_WINDOW_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { XtermTerminal } from './xterm/xtermTerminal.js';
import { TerminalInstance } from './terminalInstance.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { TerminalCapabilityStore } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { mark } from '../../../../base/common/performance.js';
import { DetachedTerminal } from './detachedTerminal.js';
import { createInstanceCapabilityEventMultiplexer } from './terminalEvents.js';
import { mainWindow } from '../../../../base/browser/window.js';
let TerminalService = class TerminalService extends Disposable {
    get isProcessSupportRegistered() { return !!this._processSupportContextKey.get(); }
    get connectionState() { return this._connectionState; }
    get whenConnected() { return this._whenConnected.p; }
    get restoredGroupCount() { return this._restoredGroupCount; }
    get instances() {
        return this._terminalGroupService.instances.concat(this._terminalEditorService.instances).concat(this._backgroundedTerminalInstances);
    }
    /** Gets all non-background terminals. */
    get foregroundInstances() {
        return this._terminalGroupService.instances.concat(this._terminalEditorService.instances);
    }
    get detachedInstances() {
        return this._detachedXterms;
    }
    getReconnectedTerminals(reconnectionOwner) {
        return this._reconnectedTerminals.get(reconnectionOwner);
    }
    get defaultLocation() { return this._terminalConfigurationService.config.defaultLocation === "editor" /* TerminalLocationString.Editor */ ? TerminalLocation.Editor : TerminalLocation.Panel; }
    get activeInstance() {
        // Check if either an editor or panel terminal has focus and return that, regardless of the
        // value of _activeInstance. This avoids terminals created in the panel for example stealing
        // the active status even when it's not focused.
        for (const activeHostTerminal of this._hostActiveTerminals.values()) {
            if (activeHostTerminal?.hasFocus) {
                return activeHostTerminal;
            }
        }
        // Fallback to the last recorded active terminal if neither have focus
        return this._activeInstance;
    }
    get onDidCreateInstance() { return this._onDidCreateInstance.event; }
    get onDidChangeInstanceDimensions() { return this._onDidChangeInstanceDimensions.event; }
    get onDidRegisterProcessSupport() { return this._onDidRegisterProcessSupport.event; }
    get onDidChangeConnectionState() { return this._onDidChangeConnectionState.event; }
    get onDidRequestStartExtensionTerminal() { return this._onDidRequestStartExtensionTerminal.event; }
    get onDidDisposeInstance() { return this._onDidDisposeInstance.event; }
    get onDidFocusInstance() { return this._onDidFocusInstance.event; }
    get onDidChangeActiveInstance() { return this._onDidChangeActiveInstance.event; }
    get onDidChangeInstances() { return this._onDidChangeInstances.event; }
    get onDidChangeInstanceCapability() { return this._onDidChangeInstanceCapability.event; }
    get onDidChangeActiveGroup() { return this._onDidChangeActiveGroup.event; }
    // Lazily initialized events that fire when the specified event fires on _any_ terminal
    // TODO: Batch events
    get onAnyInstanceData() { return this._register(this.createOnInstanceEvent(instance => Event.map(instance.onData, data => ({ instance, data })))).event; }
    get onAnyInstanceDataInput() { return this._register(this.createOnInstanceEvent(e => Event.map(e.onDidInputData, () => e, e.store))).event; }
    get onAnyInstanceIconChange() { return this._register(this.createOnInstanceEvent(e => e.onIconChanged)).event; }
    get onAnyInstanceMaximumDimensionsChange() { return this._register(this.createOnInstanceEvent(e => Event.map(e.onMaximumDimensionsChanged, () => e, e.store))).event; }
    get onAnyInstancePrimaryStatusChange() { return this._register(this.createOnInstanceEvent(e => Event.map(e.statusList.onDidChangePrimaryStatus, () => e, e.store))).event; }
    get onAnyInstanceProcessIdReady() { return this._register(this.createOnInstanceEvent(e => e.onProcessIdReady)).event; }
    get onAnyInstanceSelectionChange() { return this._register(this.createOnInstanceEvent(e => e.onDidChangeSelection)).event; }
    get onAnyInstanceTitleChange() { return this._register(this.createOnInstanceEvent(e => e.onTitleChanged)).event; }
    get onAnyInstanceShellTypeChanged() { return this._register(this.createOnInstanceEvent(e => Event.map(e.onDidChangeShellType, () => e))).event; }
    get onAnyInstanceAddedCapabilityType() { return this._register(this.createOnInstanceEvent(e => e.capabilities.onDidAddCapabilityType)).event; }
    constructor(_contextKeyService, _lifecycleService, _logService, _dialogService, _instantiationService, _remoteAgentService, _viewsService, _configurationService, _terminalConfigService, _environmentService, _terminalConfigurationService, _terminalEditorService, _terminalGroupService, _terminalInstanceService, _editorGroupsService, _terminalProfileService, _extensionService, _notificationService, _workspaceContextService, _commandService, _keybindingService, _timerService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._lifecycleService = _lifecycleService;
        this._logService = _logService;
        this._dialogService = _dialogService;
        this._instantiationService = _instantiationService;
        this._remoteAgentService = _remoteAgentService;
        this._viewsService = _viewsService;
        this._configurationService = _configurationService;
        this._terminalConfigService = _terminalConfigService;
        this._environmentService = _environmentService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        this._terminalInstanceService = _terminalInstanceService;
        this._editorGroupsService = _editorGroupsService;
        this._terminalProfileService = _terminalProfileService;
        this._extensionService = _extensionService;
        this._notificationService = _notificationService;
        this._workspaceContextService = _workspaceContextService;
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._timerService = _timerService;
        this._hostActiveTerminals = new Map();
        this._detachedXterms = new Set();
        this._isShuttingDown = false;
        this._backgroundedTerminalInstances = [];
        this._backgroundedTerminalDisposables = new Map();
        this._connectionState = 0 /* TerminalConnectionState.Connecting */;
        this._whenConnected = new DeferredPromise();
        this._restoredGroupCount = 0;
        this._reconnectedTerminals = new Map();
        this._onDidCreateInstance = this._register(new Emitter());
        this._onDidChangeInstanceDimensions = this._register(new Emitter());
        this._onDidRegisterProcessSupport = this._register(new Emitter());
        this._onDidChangeConnectionState = this._register(new Emitter());
        this._onDidRequestStartExtensionTerminal = this._register(new Emitter());
        // ITerminalInstanceHost events
        this._onDidDisposeInstance = this._register(new Emitter());
        this._onDidFocusInstance = this._register(new Emitter());
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this._onDidChangeInstances = this._register(new Emitter());
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        // Terminal view events
        this._onDidChangeActiveGroup = this._register(new Emitter());
        // the below avoids having to poll routinely.
        // we update detected profiles when an instance is created so that,
        // for example, we detect if you've installed a pwsh
        this._register(this.onDidCreateInstance(() => this._terminalProfileService.refreshAvailableProfiles()));
        this._forwardInstanceHostEvents(this._terminalGroupService);
        this._forwardInstanceHostEvents(this._terminalEditorService);
        this._register(this._terminalGroupService.onDidChangeActiveGroup(this._onDidChangeActiveGroup.fire, this._onDidChangeActiveGroup));
        this._register(this._terminalInstanceService.onDidCreateInstance(instance => {
            this._initInstanceListeners(instance);
            this._onDidCreateInstance.fire(instance);
        }));
        // Hide the panel if there are no more instances, provided that VS Code is not shutting
        // down. When shutting down the panel is locked in place so that it is restored upon next
        // launch.
        this._register(this._terminalGroupService.onDidChangeActiveInstance(instance => {
            if (!instance && !this._isShuttingDown && this._terminalConfigService.config.hideOnLastClosed) {
                this._terminalGroupService.hidePanel();
            }
            if (instance?.shellType) {
                this._terminalShellTypeContextKey.set(instance.shellType.toString());
            }
            else if (!instance || !(instance.shellType)) {
                this._terminalShellTypeContextKey.reset();
            }
        }));
        this._handleInstanceContextKeys();
        this._terminalShellTypeContextKey = TerminalContextKeys.shellType.bindTo(this._contextKeyService);
        this._processSupportContextKey = TerminalContextKeys.processSupported.bindTo(this._contextKeyService);
        this._processSupportContextKey.set(!isWeb || this._remoteAgentService.getConnection() !== null);
        this._terminalHasBeenCreated = TerminalContextKeys.terminalHasBeenCreated.bindTo(this._contextKeyService);
        this._terminalCountContextKey = TerminalContextKeys.count.bindTo(this._contextKeyService);
        this._terminalEditorActive = TerminalContextKeys.terminalEditorActive.bindTo(this._contextKeyService);
        this._register(this.onDidChangeActiveInstance(instance => {
            this._terminalEditorActive.set(!!instance?.target && instance.target === TerminalLocation.Editor);
        }));
        this._register(_lifecycleService.onBeforeShutdown(async (e) => e.veto(this._onBeforeShutdown(e.reason), 'veto.terminal')));
        this._register(_lifecycleService.onWillShutdown(e => this._onWillShutdown(e)));
        this._initializePrimaryBackend();
        // Create async as the class depends on `this`
        timeout(0).then(() => this._register(this._instantiationService.createInstance(TerminalEditorStyle, mainWindow.document.head)));
    }
    async showProfileQuickPick(type, cwd) {
        const quickPick = this._instantiationService.createInstance(TerminalProfileQuickpick);
        const result = await quickPick.showAndGetResult(type);
        if (!result) {
            return;
        }
        if (typeof result === 'string') {
            return;
        }
        const keyMods = result.keyMods;
        if (type === 'createInstance') {
            const activeInstance = this.getDefaultInstanceHost().activeInstance;
            let instance;
            if (result.config && 'id' in result?.config) {
                await this.createContributedTerminalProfile(result.config.extensionIdentifier, result.config.id, {
                    icon: result.config.options?.icon,
                    color: result.config.options?.color,
                    location: !!(keyMods?.alt && activeInstance) ? { splitActiveTerminal: true } : this.defaultLocation
                });
                return;
            }
            else if (result.config && 'profileName' in result.config) {
                if (keyMods?.alt && activeInstance) {
                    // create split, only valid if there's an active instance
                    instance = await this.createTerminal({ location: { parentTerminal: activeInstance }, config: result.config, cwd });
                }
                else {
                    instance = await this.createTerminal({ location: this.defaultLocation, config: result.config, cwd });
                }
            }
            if (instance && this.defaultLocation !== TerminalLocation.Editor) {
                this._terminalGroupService.showPanel(true);
                this.setActiveInstance(instance);
                return instance;
            }
        }
        return undefined;
    }
    async _initializePrimaryBackend() {
        mark('code/terminal/willGetTerminalBackend');
        this._primaryBackend = await this._terminalInstanceService.getBackend(this._environmentService.remoteAuthority);
        mark('code/terminal/didGetTerminalBackend');
        const enableTerminalReconnection = this._terminalConfigurationService.config.enablePersistentSessions;
        // Connect to the extension host if it's there, set the connection state to connected when
        // it's done. This should happen even when there is no extension host.
        this._connectionState = 0 /* TerminalConnectionState.Connecting */;
        const isPersistentRemote = !!this._environmentService.remoteAuthority && enableTerminalReconnection;
        if (this._primaryBackend) {
            this._register(this._primaryBackend.onDidRequestDetach(async (e) => {
                const instanceToDetach = this.getInstanceFromResource(getTerminalUri(e.workspaceId, e.instanceId));
                if (instanceToDetach) {
                    const persistentProcessId = instanceToDetach?.persistentProcessId;
                    if (persistentProcessId && !instanceToDetach.shellLaunchConfig.isFeatureTerminal && !instanceToDetach.shellLaunchConfig.customPtyImplementation) {
                        if (instanceToDetach.target === TerminalLocation.Editor) {
                            this._terminalEditorService.detachInstance(instanceToDetach);
                        }
                        else {
                            this._terminalGroupService.getGroupForInstance(instanceToDetach)?.removeInstance(instanceToDetach);
                        }
                        await instanceToDetach.detachProcessAndDispose(TerminalExitReason.User);
                        await this._primaryBackend?.acceptDetachInstanceReply(e.requestId, persistentProcessId);
                    }
                    else {
                        // will get rejected without a persistentProcessId to attach to
                        await this._primaryBackend?.acceptDetachInstanceReply(e.requestId, undefined);
                    }
                }
            }));
        }
        mark('code/terminal/willReconnect');
        let reconnectedPromise;
        if (isPersistentRemote) {
            reconnectedPromise = this._reconnectToRemoteTerminals();
        }
        else if (enableTerminalReconnection) {
            reconnectedPromise = this._reconnectToLocalTerminals();
        }
        else {
            reconnectedPromise = Promise.resolve();
        }
        reconnectedPromise.then(async () => {
            this._setConnected();
            mark('code/terminal/didReconnect');
            mark('code/terminal/willReplay');
            const instances = await this._reconnectedTerminalGroups?.then(groups => groups.map(e => e.terminalInstances).flat()) ?? [];
            await Promise.all(instances.map(e => new Promise(r => Event.once(e.onProcessReplayComplete)(r))));
            mark('code/terminal/didReplay');
            mark('code/terminal/willGetPerformanceMarks');
            await Promise.all(Array.from(this._terminalInstanceService.getRegisteredBackends()).map(async (backend) => {
                this._timerService.setPerformanceMarks(backend.remoteAuthority === undefined ? 'localPtyHost' : 'remotePtyHost', await backend.getPerformanceMarks());
                backend.setReady();
            }));
            mark('code/terminal/didGetPerformanceMarks');
            this._whenConnected.complete();
        });
    }
    getPrimaryBackend() {
        return this._primaryBackend;
    }
    _forwardInstanceHostEvents(host) {
        this._register(host.onDidChangeInstances(this._onDidChangeInstances.fire, this._onDidChangeInstances));
        this._register(host.onDidDisposeInstance(this._onDidDisposeInstance.fire, this._onDidDisposeInstance));
        this._register(host.onDidChangeActiveInstance(instance => this._evaluateActiveInstance(host, instance)));
        this._register(host.onDidFocusInstance(instance => {
            this._onDidFocusInstance.fire(instance);
            this._evaluateActiveInstance(host, instance);
        }));
        this._register(host.onDidChangeInstanceCapability((instance) => {
            this._onDidChangeInstanceCapability.fire(instance);
        }));
        this._hostActiveTerminals.set(host, undefined);
    }
    _evaluateActiveInstance(host, instance) {
        // Track the latest active terminal for each host so that when one becomes undefined, the
        // TerminalService's active terminal is set to the last active terminal from the other host.
        // This means if the last terminal editor is closed such that it becomes undefined, the last
        // active group's terminal will be used as the active terminal if available.
        this._hostActiveTerminals.set(host, instance);
        if (instance === undefined) {
            for (const active of this._hostActiveTerminals.values()) {
                if (active) {
                    instance = active;
                }
            }
        }
        this._activeInstance = instance;
        this._onDidChangeActiveInstance.fire(instance);
    }
    setActiveInstance(value) {
        // If this was a hideFromUser terminal created by the API this was triggered by show,
        // in which case we need to create the terminal group
        if (value.shellLaunchConfig.hideFromUser) {
            this._showBackgroundTerminal(value);
        }
        if (value.target === TerminalLocation.Editor) {
            this._terminalEditorService.setActiveInstance(value);
        }
        else {
            this._terminalGroupService.setActiveInstance(value);
        }
    }
    async focusInstance(instance) {
        if (instance.target === TerminalLocation.Editor) {
            return this._terminalEditorService.focusInstance(instance);
        }
        return this._terminalGroupService.focusInstance(instance);
    }
    async focusActiveInstance() {
        if (!this._activeInstance) {
            return;
        }
        return this.focusInstance(this._activeInstance);
    }
    async createContributedTerminalProfile(extensionIdentifier, id, options) {
        await this._extensionService.activateByEvent(`onTerminalProfile:${id}`);
        const profileProvider = this._terminalProfileService.getContributedProfileProvider(extensionIdentifier, id);
        if (!profileProvider) {
            this._notificationService.error(`No terminal profile provider registered for id "${id}"`);
            return;
        }
        try {
            await profileProvider.createContributedTerminalProfile(options);
            this._terminalGroupService.setActiveInstanceByIndex(this._terminalGroupService.instances.length - 1);
            await this._terminalGroupService.activeInstance?.focusWhenReady();
        }
        catch (e) {
            this._notificationService.error(e.message);
        }
    }
    async safeDisposeTerminal(instance) {
        // Confirm on kill in the editor is handled by the editor input
        if (instance.target !== TerminalLocation.Editor &&
            instance.hasChildProcesses &&
            (this._terminalConfigurationService.config.confirmOnKill === 'panel' || this._terminalConfigurationService.config.confirmOnKill === 'always')) {
            const veto = await this._showTerminalCloseConfirmation(true);
            if (veto) {
                return;
            }
        }
        return new Promise(r => {
            Event.once(instance.onExit)(() => r());
            instance.dispose(TerminalExitReason.User);
        });
    }
    _setConnected() {
        this._connectionState = 1 /* TerminalConnectionState.Connected */;
        this._onDidChangeConnectionState.fire();
        this._logService.trace('Pty host ready');
    }
    async _reconnectToRemoteTerminals() {
        const remoteAuthority = this._environmentService.remoteAuthority;
        if (!remoteAuthority) {
            return;
        }
        const backend = await this._terminalInstanceService.getBackend(remoteAuthority);
        if (!backend) {
            return;
        }
        mark('code/terminal/willGetTerminalLayoutInfo');
        const layoutInfo = await backend.getTerminalLayoutInfo();
        mark('code/terminal/didGetTerminalLayoutInfo');
        backend.reduceConnectionGraceTime();
        mark('code/terminal/willRecreateTerminalGroups');
        await this._recreateTerminalGroups(layoutInfo);
        mark('code/terminal/didRecreateTerminalGroups');
        // now that terminals have been restored,
        // attach listeners to update remote when terminals are changed
        this._attachProcessLayoutListeners();
        this._logService.trace('Reconnected to remote terminals');
    }
    async _reconnectToLocalTerminals() {
        const localBackend = await this._terminalInstanceService.getBackend();
        if (!localBackend) {
            return;
        }
        mark('code/terminal/willGetTerminalLayoutInfo');
        const layoutInfo = await localBackend.getTerminalLayoutInfo();
        mark('code/terminal/didGetTerminalLayoutInfo');
        if (layoutInfo && layoutInfo.tabs.length > 0) {
            mark('code/terminal/willRecreateTerminalGroups');
            this._reconnectedTerminalGroups = this._recreateTerminalGroups(layoutInfo);
            mark('code/terminal/didRecreateTerminalGroups');
        }
        // now that terminals have been restored,
        // attach listeners to update local state when terminals are changed
        this._attachProcessLayoutListeners();
        this._logService.trace('Reconnected to local terminals');
    }
    _recreateTerminalGroups(layoutInfo) {
        const groupPromises = [];
        let activeGroup;
        if (layoutInfo) {
            for (const tabLayout of layoutInfo.tabs) {
                const terminalLayouts = tabLayout.terminals.filter(t => t.terminal && t.terminal.isOrphan);
                if (terminalLayouts.length) {
                    this._restoredGroupCount += terminalLayouts.length;
                    const promise = this._recreateTerminalGroup(tabLayout, terminalLayouts);
                    groupPromises.push(promise);
                    if (tabLayout.isActive) {
                        activeGroup = promise;
                    }
                    const activeInstance = this.instances.find(t => t.shellLaunchConfig.attachPersistentProcess?.id === tabLayout.activePersistentProcessId);
                    if (activeInstance) {
                        this.setActiveInstance(activeInstance);
                    }
                }
            }
            if (layoutInfo.tabs.length) {
                activeGroup?.then(group => this._terminalGroupService.activeGroup = group);
            }
        }
        return Promise.all(groupPromises).then(result => result.filter(e => !!e));
    }
    async _recreateTerminalGroup(tabLayout, terminalLayouts) {
        let lastInstance;
        for (const terminalLayout of terminalLayouts) {
            const attachPersistentProcess = terminalLayout.terminal;
            if (this._lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */ && attachPersistentProcess.type === 'Task') {
                continue;
            }
            mark(`code/terminal/willRecreateTerminal/${attachPersistentProcess.id}-${attachPersistentProcess.pid}`);
            lastInstance = this.createTerminal({
                config: { attachPersistentProcess },
                location: lastInstance ? { parentTerminal: lastInstance } : TerminalLocation.Panel
            });
            lastInstance.then(() => mark(`code/terminal/didRecreateTerminal/${attachPersistentProcess.id}-${attachPersistentProcess.pid}`));
        }
        const group = lastInstance?.then(instance => {
            const g = this._terminalGroupService.getGroupForInstance(instance);
            g?.resizePanes(tabLayout.terminals.map(terminal => terminal.relativeSize));
            return g;
        });
        return group;
    }
    _attachProcessLayoutListeners() {
        this._register(this.onDidChangeActiveGroup(() => this._saveState()));
        this._register(this.onDidChangeActiveInstance(() => this._saveState()));
        this._register(this.onDidChangeInstances(() => this._saveState()));
        // The state must be updated when the terminal is relaunched, otherwise the persistent
        // terminal ID will be stale and the process will be leaked.
        this._register(this.onAnyInstanceProcessIdReady(() => this._saveState()));
        this._register(this.onAnyInstanceTitleChange(instance => this._updateTitle(instance)));
        this._register(this.onAnyInstanceIconChange(e => this._updateIcon(e.instance, e.userInitiated)));
    }
    _handleInstanceContextKeys() {
        const terminalIsOpenContext = TerminalContextKeys.isOpen.bindTo(this._contextKeyService);
        const updateTerminalContextKeys = () => {
            terminalIsOpenContext.set(this.instances.length > 0);
            this._terminalCountContextKey.set(this.instances.length);
        };
        this._register(this.onDidChangeInstances(() => updateTerminalContextKeys()));
    }
    async getActiveOrCreateInstance(options) {
        const activeInstance = this.activeInstance;
        // No instance, create
        if (!activeInstance) {
            return this.createTerminal();
        }
        // Active instance, ensure accepts input
        if (!options?.acceptsInput || activeInstance.xterm?.isStdinDisabled !== true) {
            return activeInstance;
        }
        // Active instance doesn't accept input, create and focus
        const instance = await this.createTerminal();
        this.setActiveInstance(instance);
        await this.revealActiveTerminal();
        return instance;
    }
    async revealTerminal(source, preserveFocus) {
        if (source.target === TerminalLocation.Editor) {
            await this._terminalEditorService.revealActiveEditor(preserveFocus);
        }
        else {
            await this._terminalGroupService.showPanel();
        }
    }
    async revealActiveTerminal(preserveFocus) {
        const instance = this.activeInstance;
        if (!instance) {
            return;
        }
        await this.revealTerminal(instance, preserveFocus);
    }
    setEditable(instance, data) {
        if (!data) {
            this._editable = undefined;
        }
        else {
            this._editable = { instance: instance, data };
        }
        const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        const isEditing = this.isEditable(instance);
        pane?.terminalTabbedView?.setEditable(isEditing);
    }
    isEditable(instance) {
        return !!this._editable && (this._editable.instance === instance || !instance);
    }
    getEditableData(instance) {
        return this._editable && this._editable.instance === instance ? this._editable.data : undefined;
    }
    requestStartExtensionTerminal(proxy, cols, rows) {
        // The initial request came from the extension host, no need to wait for it
        return new Promise(callback => {
            this._onDidRequestStartExtensionTerminal.fire({ proxy, cols, rows, callback });
        });
    }
    _onBeforeShutdown(reason) {
        // Never veto on web as this would block all windows from being closed. This disables
        // process revive as we can't handle it on shutdown.
        if (isWeb) {
            this._isShuttingDown = true;
            return false;
        }
        return this._onBeforeShutdownAsync(reason);
    }
    async _onBeforeShutdownAsync(reason) {
        if (this.instances.length === 0) {
            // No terminal instances, don't veto
            return false;
        }
        // Persist terminal _buffer state_, note that even if this happens the dirty terminal prompt
        // still shows as that cannot be revived
        try {
            this._shutdownWindowCount = await this._nativeDelegate?.getWindowCount();
            const shouldReviveProcesses = this._shouldReviveProcesses(reason);
            if (shouldReviveProcesses) {
                // Attempt to persist the terminal state but only allow 2000ms as we can't block
                // shutdown. This can happen when in a remote workspace but the other side has been
                // suspended and is in the process of reconnecting, the message will be put in a
                // queue in this case for when the connection is back up and running. Aborting the
                // process is preferable in this case.
                await Promise.race([
                    this._primaryBackend?.persistTerminalState(),
                    timeout(2000)
                ]);
            }
            // Persist terminal _processes_
            const shouldPersistProcesses = this._terminalConfigurationService.config.enablePersistentSessions && reason === 3 /* ShutdownReason.RELOAD */;
            if (!shouldPersistProcesses) {
                const hasDirtyInstances = ((this._terminalConfigurationService.config.confirmOnExit === 'always' && this.foregroundInstances.length > 0) ||
                    (this._terminalConfigurationService.config.confirmOnExit === 'hasChildProcesses' && this.foregroundInstances.some(e => e.hasChildProcesses)));
                if (hasDirtyInstances) {
                    return this._onBeforeShutdownConfirmation(reason);
                }
            }
        }
        catch (err) {
            // Swallow as exceptions should not cause a veto to prevent shutdown
            this._logService.warn('Exception occurred during terminal shutdown', err);
        }
        this._isShuttingDown = true;
        return false;
    }
    setNativeDelegate(nativeDelegate) {
        this._nativeDelegate = nativeDelegate;
    }
    _shouldReviveProcesses(reason) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions) {
            return false;
        }
        switch (this._terminalConfigurationService.config.persistentSessionReviveProcess) {
            case 'onExit': {
                // Allow on close if it's the last window on Windows or Linux
                if (reason === 1 /* ShutdownReason.CLOSE */ && (this._shutdownWindowCount === 1 && !isMacintosh)) {
                    return true;
                }
                return reason === 4 /* ShutdownReason.LOAD */ || reason === 2 /* ShutdownReason.QUIT */;
            }
            case 'onExitAndWindowClose': return reason !== 3 /* ShutdownReason.RELOAD */;
            default: return false;
        }
    }
    async _onBeforeShutdownConfirmation(reason) {
        // veto if configured to show confirmation and the user chose not to exit
        const veto = await this._showTerminalCloseConfirmation();
        if (!veto) {
            this._isShuttingDown = true;
        }
        return veto;
    }
    _onWillShutdown(e) {
        // Don't touch processes if the shutdown was a result of reload as they will be reattached
        const shouldPersistTerminals = this._terminalConfigurationService.config.enablePersistentSessions && e.reason === 3 /* ShutdownReason.RELOAD */;
        for (const instance of [...this._terminalGroupService.instances, ...this._backgroundedTerminalInstances]) {
            if (shouldPersistTerminals && instance.shouldPersist) {
                instance.detachProcessAndDispose(TerminalExitReason.Shutdown);
            }
            else {
                instance.dispose(TerminalExitReason.Shutdown);
            }
        }
        // Clear terminal layout info only when not persisting
        if (!shouldPersistTerminals && !this._shouldReviveProcesses(e.reason)) {
            this._primaryBackend?.setTerminalLayoutInfo(undefined);
        }
    }
    _saveState() {
        // Avoid saving state when shutting down as that would override process state to be revived
        if (this._isShuttingDown) {
            return;
        }
        if (!this._terminalConfigurationService.config.enablePersistentSessions) {
            return;
        }
        const tabs = this._terminalGroupService.groups.map(g => g.getLayoutInfo(g === this._terminalGroupService.activeGroup));
        const state = { tabs };
        this._primaryBackend?.setTerminalLayoutInfo(state);
    }
    _updateTitle(instance) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions || !instance || !instance.persistentProcessId || !instance.title || instance.isDisposed) {
            return;
        }
        if (instance.staticTitle) {
            this._primaryBackend?.updateTitle(instance.persistentProcessId, instance.staticTitle, TitleEventSource.Api);
        }
        else {
            this._primaryBackend?.updateTitle(instance.persistentProcessId, instance.title, instance.titleSource);
        }
    }
    _updateIcon(instance, userInitiated) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions || !instance || !instance.persistentProcessId || !instance.icon || instance.isDisposed) {
            return;
        }
        this._primaryBackend?.updateIcon(instance.persistentProcessId, userInitiated, instance.icon, instance.color);
    }
    refreshActiveGroup() {
        this._onDidChangeActiveGroup.fire(this._terminalGroupService.activeGroup);
    }
    getInstanceFromId(terminalId) {
        let bgIndex = -1;
        this._backgroundedTerminalInstances.forEach((terminalInstance, i) => {
            if (terminalInstance.instanceId === terminalId) {
                bgIndex = i;
            }
        });
        if (bgIndex !== -1) {
            return this._backgroundedTerminalInstances[bgIndex];
        }
        try {
            return this.instances[this._getIndexFromId(terminalId)];
        }
        catch {
            return undefined;
        }
    }
    getInstanceFromIndex(terminalIndex) {
        return this.instances[terminalIndex];
    }
    getInstanceFromResource(resource) {
        return getInstanceFromResource(this.instances, resource);
    }
    isAttachedToTerminal(remoteTerm) {
        return this.instances.some(term => term.processId === remoteTerm.pid);
    }
    moveToEditor(source, group) {
        if (source.target === TerminalLocation.Editor) {
            return;
        }
        const sourceGroup = this._terminalGroupService.getGroupForInstance(source);
        if (!sourceGroup) {
            return;
        }
        sourceGroup.removeInstance(source);
        this._terminalEditorService.openEditor(source, group ? { viewColumn: group } : undefined);
    }
    moveIntoNewEditor(source) {
        this.moveToEditor(source, AUX_WINDOW_GROUP);
    }
    async moveToTerminalView(source, target, side) {
        if (URI.isUri(source)) {
            source = this.getInstanceFromResource(source);
        }
        if (!source) {
            return;
        }
        this._terminalEditorService.detachInstance(source);
        if (source.target !== TerminalLocation.Editor) {
            await this._terminalGroupService.showPanel(true);
            return;
        }
        source.target = TerminalLocation.Panel;
        let group;
        if (target) {
            group = this._terminalGroupService.getGroupForInstance(target);
        }
        if (!group) {
            group = this._terminalGroupService.createGroup();
        }
        group.addInstance(source);
        this.setActiveInstance(source);
        await this._terminalGroupService.showPanel(true);
        if (target && side) {
            const index = group.terminalInstances.indexOf(target) + (side === 'after' ? 1 : 0);
            group.moveInstance(source, index, side);
        }
        // Fire events
        this._onDidChangeInstances.fire();
        this._onDidChangeActiveGroup.fire(this._terminalGroupService.activeGroup);
    }
    _initInstanceListeners(instance) {
        const instanceDisposables = new DisposableStore();
        instanceDisposables.add(instance.onDimensionsChanged(() => {
            this._onDidChangeInstanceDimensions.fire(instance);
            if (this._terminalConfigurationService.config.enablePersistentSessions && this.isProcessSupportRegistered) {
                this._saveState();
            }
        }));
        instanceDisposables.add(instance.onDidFocus(this._onDidChangeActiveInstance.fire, this._onDidChangeActiveInstance));
        instanceDisposables.add(instance.onRequestAddInstanceToGroup(async (e) => await this._addInstanceToGroup(instance, e)));
        const disposeListener = this._register(instance.onDisposed(() => {
            instanceDisposables.dispose();
            this._store.delete(disposeListener);
        }));
    }
    async _addInstanceToGroup(instance, e) {
        const terminalIdentifier = parseTerminalUri(e.uri);
        if (terminalIdentifier.instanceId === undefined) {
            return;
        }
        let sourceInstance = this.getInstanceFromResource(e.uri);
        // Terminal from a different window
        if (!sourceInstance) {
            const attachPersistentProcess = await this._primaryBackend?.requestDetachInstance(terminalIdentifier.workspaceId, terminalIdentifier.instanceId);
            if (attachPersistentProcess) {
                sourceInstance = await this.createTerminal({ config: { attachPersistentProcess }, resource: e.uri });
                this._terminalGroupService.moveInstance(sourceInstance, instance, e.side);
                return;
            }
        }
        // View terminals
        sourceInstance = this._terminalGroupService.getInstanceFromResource(e.uri);
        if (sourceInstance) {
            this._terminalGroupService.moveInstance(sourceInstance, instance, e.side);
            return;
        }
        // Terminal editors
        sourceInstance = this._terminalEditorService.getInstanceFromResource(e.uri);
        if (sourceInstance) {
            this.moveToTerminalView(sourceInstance, instance, e.side);
            return;
        }
        return;
    }
    registerProcessSupport(isSupported) {
        if (!isSupported) {
            return;
        }
        this._processSupportContextKey.set(isSupported);
        this._onDidRegisterProcessSupport.fire();
    }
    // TODO: Remove this, it should live in group/editor servioce
    _getIndexFromId(terminalId) {
        let terminalIndex = -1;
        this.instances.forEach((terminalInstance, i) => {
            if (terminalInstance.instanceId === terminalId) {
                terminalIndex = i;
            }
        });
        if (terminalIndex === -1) {
            throw new Error(`Terminal with ID ${terminalId} does not exist (has it already been disposed?)`);
        }
        return terminalIndex;
    }
    async _showTerminalCloseConfirmation(singleTerminal) {
        let message;
        const foregroundInstances = this.foregroundInstances;
        if (foregroundInstances.length === 1 || singleTerminal) {
            message = nls.localize('terminalService.terminalCloseConfirmationSingular', "Do you want to terminate the active terminal session?");
        }
        else {
            message = nls.localize('terminalService.terminalCloseConfirmationPlural', "Do you want to terminate the {0} active terminal sessions?", foregroundInstances.length);
        }
        const { confirmed } = await this._dialogService.confirm({
            type: 'warning',
            message,
            primaryButton: nls.localize({ key: 'terminate', comment: ['&& denotes a mnemonic'] }, "&&Terminate")
        });
        return !confirmed;
    }
    getDefaultInstanceHost() {
        if (this.defaultLocation === TerminalLocation.Editor) {
            return this._terminalEditorService;
        }
        return this._terminalGroupService;
    }
    async getInstanceHost(location) {
        if (location) {
            if (location === TerminalLocation.Editor) {
                return this._terminalEditorService;
            }
            else if (typeof location === 'object') {
                if ('viewColumn' in location) {
                    return this._terminalEditorService;
                }
                else if ('parentTerminal' in location) {
                    return (await location.parentTerminal).target === TerminalLocation.Editor ? this._terminalEditorService : this._terminalGroupService;
                }
            }
            else {
                return this._terminalGroupService;
            }
        }
        return this;
    }
    async createTerminal(options) {
        // Await the initialization of available profiles as long as this is not a pty terminal or a
        // local terminal in a remote workspace as profile won't be used in those cases and these
        // terminals need to be launched before remote connections are established.
        if (this._terminalProfileService.availableProfiles.length === 0) {
            const isPtyTerminal = options?.config && 'customPtyImplementation' in options.config;
            const isLocalInRemoteTerminal = this._remoteAgentService.getConnection() && URI.isUri(options?.cwd) && options?.cwd.scheme === Schemas.vscodeFileResource;
            if (!isPtyTerminal && !isLocalInRemoteTerminal) {
                if (this._connectionState === 0 /* TerminalConnectionState.Connecting */) {
                    mark(`code/terminal/willGetProfiles`);
                }
                await this._terminalProfileService.profilesReady;
                if (this._connectionState === 0 /* TerminalConnectionState.Connecting */) {
                    mark(`code/terminal/didGetProfiles`);
                }
            }
        }
        const config = options?.config || this._terminalProfileService.getDefaultProfile();
        const shellLaunchConfig = config && 'extensionIdentifier' in config ? {} : this._terminalInstanceService.convertProfileToShellLaunchConfig(config || {});
        // Get the contributed profile if it was provided
        const contributedProfile = options?.skipContributedProfileCheck ? undefined : await this._getContributedProfile(shellLaunchConfig, options);
        const splitActiveTerminal = typeof options?.location === 'object' && 'splitActiveTerminal' in options.location ? options.location.splitActiveTerminal : typeof options?.location === 'object' ? 'parentTerminal' in options.location : false;
        await this._resolveCwd(shellLaunchConfig, splitActiveTerminal, options);
        // Launch the contributed profile
        // If it's a custom pty implementation, we did not await the profiles ready, so
        // we cannot launch the contributed profile and doing so would cause an error
        if (!shellLaunchConfig.customPtyImplementation && contributedProfile) {
            const resolvedLocation = await this.resolveLocation(options?.location);
            let location;
            if (splitActiveTerminal) {
                location = resolvedLocation === TerminalLocation.Editor ? { viewColumn: SIDE_GROUP } : { splitActiveTerminal: true };
            }
            else {
                location = typeof options?.location === 'object' && 'viewColumn' in options.location ? options.location : resolvedLocation;
            }
            await this.createContributedTerminalProfile(contributedProfile.extensionIdentifier, contributedProfile.id, {
                icon: contributedProfile.icon,
                color: contributedProfile.color,
                location,
                cwd: shellLaunchConfig.cwd,
            });
            const instanceHost = resolvedLocation === TerminalLocation.Editor ? this._terminalEditorService : this._terminalGroupService;
            const instance = instanceHost.instances[instanceHost.instances.length - 1];
            await instance?.focusWhenReady();
            this._terminalHasBeenCreated.set(true);
            return instance;
        }
        if (!shellLaunchConfig.customPtyImplementation && !this.isProcessSupportRegistered) {
            throw new Error('Could not create terminal when process support is not registered');
        }
        if (shellLaunchConfig.hideFromUser) {
            const instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Panel);
            this._backgroundedTerminalInstances.push(instance);
            this._backgroundedTerminalDisposables.set(instance.instanceId, [
                instance.onDisposed(this._onDidDisposeInstance.fire, this._onDidDisposeInstance)
            ]);
            this._terminalHasBeenCreated.set(true);
            return instance;
        }
        this._evaluateLocalCwd(shellLaunchConfig);
        const location = await this.resolveLocation(options?.location) || this.defaultLocation;
        const parent = await this._getSplitParent(options?.location);
        this._terminalHasBeenCreated.set(true);
        if (parent) {
            return this._splitTerminal(shellLaunchConfig, location, parent);
        }
        return this._createTerminal(shellLaunchConfig, location, options);
    }
    async _getContributedProfile(shellLaunchConfig, options) {
        if (options?.config && 'extensionIdentifier' in options.config) {
            return options.config;
        }
        return this._terminalProfileService.getContributedDefaultProfile(shellLaunchConfig);
    }
    async createDetachedTerminal(options) {
        const ctor = await TerminalInstance.getXtermConstructor(this._keybindingService, this._contextKeyService);
        const xterm = this._instantiationService.createInstance(XtermTerminal, ctor, {
            cols: options.cols,
            rows: options.rows,
            xtermColorProvider: options.colorProvider,
            capabilities: options.capabilities || new TerminalCapabilityStore(),
        });
        if (options.readonly) {
            xterm.raw.attachCustomKeyEventHandler(() => false);
        }
        const instance = new DetachedTerminal(xterm, options, this._instantiationService);
        this._detachedXterms.add(instance);
        const l = xterm.onDidDispose(() => {
            this._detachedXterms.delete(instance);
            l.dispose();
        });
        return instance;
    }
    async _resolveCwd(shellLaunchConfig, splitActiveTerminal, options) {
        const cwd = shellLaunchConfig.cwd;
        if (!cwd) {
            if (options?.cwd) {
                shellLaunchConfig.cwd = options.cwd;
            }
            else if (splitActiveTerminal && options?.location) {
                let parent = this.activeInstance;
                if (typeof options.location === 'object' && 'parentTerminal' in options.location) {
                    parent = await options.location.parentTerminal;
                }
                if (!parent) {
                    throw new Error('Cannot split without an active instance');
                }
                shellLaunchConfig.cwd = await getCwdForSplit(parent, this._workspaceContextService.getWorkspace().folders, this._commandService, this._terminalConfigService);
            }
        }
    }
    _splitTerminal(shellLaunchConfig, location, parent) {
        let instance;
        // Use the URI from the base instance if it exists, this will correctly split local terminals
        if (typeof shellLaunchConfig.cwd !== 'object' && typeof parent.shellLaunchConfig.cwd === 'object') {
            shellLaunchConfig.cwd = URI.from({
                scheme: parent.shellLaunchConfig.cwd.scheme,
                authority: parent.shellLaunchConfig.cwd.authority,
                path: shellLaunchConfig.cwd || parent.shellLaunchConfig.cwd.path
            });
        }
        if (location === TerminalLocation.Editor || parent.target === TerminalLocation.Editor) {
            instance = this._terminalEditorService.splitInstance(parent, shellLaunchConfig);
        }
        else {
            const group = this._terminalGroupService.getGroupForInstance(parent);
            if (!group) {
                throw new Error(`Cannot split a terminal without a group (instanceId: ${parent.instanceId}, title: ${parent.title})`);
            }
            shellLaunchConfig.parentTerminalId = parent.instanceId;
            instance = group.split(shellLaunchConfig);
        }
        this._addToReconnected(instance);
        return instance;
    }
    _addToReconnected(instance) {
        if (!instance.reconnectionProperties?.ownerId) {
            return;
        }
        const reconnectedTerminals = this._reconnectedTerminals.get(instance.reconnectionProperties.ownerId);
        if (reconnectedTerminals) {
            reconnectedTerminals.push(instance);
        }
        else {
            this._reconnectedTerminals.set(instance.reconnectionProperties.ownerId, [instance]);
        }
    }
    _createTerminal(shellLaunchConfig, location, options) {
        let instance;
        const editorOptions = this._getEditorOptions(options?.location);
        if (location === TerminalLocation.Editor) {
            instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Editor);
            this._terminalEditorService.openEditor(instance, editorOptions);
        }
        else {
            // TODO: pass resource?
            const group = this._terminalGroupService.createGroup(shellLaunchConfig);
            instance = group.terminalInstances[0];
        }
        this._addToReconnected(instance);
        return instance;
    }
    async resolveLocation(location) {
        if (location && typeof location === 'object') {
            if ('parentTerminal' in location) {
                // since we don't set the target unless it's an editor terminal, this is necessary
                const parentTerminal = await location.parentTerminal;
                return !parentTerminal.target ? TerminalLocation.Panel : parentTerminal.target;
            }
            else if ('viewColumn' in location) {
                return TerminalLocation.Editor;
            }
            else if ('splitActiveTerminal' in location) {
                // since we don't set the target unless it's an editor terminal, this is necessary
                return !this._activeInstance?.target ? TerminalLocation.Panel : this._activeInstance?.target;
            }
        }
        return location;
    }
    async _getSplitParent(location) {
        if (location && typeof location === 'object' && 'parentTerminal' in location) {
            return location.parentTerminal;
        }
        else if (location && typeof location === 'object' && 'splitActiveTerminal' in location) {
            return this.activeInstance;
        }
        return undefined;
    }
    _getEditorOptions(location) {
        if (location && typeof location === 'object' && 'viewColumn' in location) {
            location.viewColumn = columnToEditorGroup(this._editorGroupsService, this._configurationService, location.viewColumn);
            return location;
        }
        return undefined;
    }
    _evaluateLocalCwd(shellLaunchConfig) {
        // Add welcome message and title annotation for local terminals launched within remote or
        // virtual workspaces
        if (typeof shellLaunchConfig.cwd !== 'string' && shellLaunchConfig.cwd?.scheme === Schemas.file) {
            if (VirtualWorkspaceContext.getValue(this._contextKeyService)) {
                shellLaunchConfig.initialText = formatMessageForTerminal(nls.localize('localTerminalVirtualWorkspace', "This shell is open to a {0}local{1} folder, NOT to the virtual folder", '\x1b[3m', '\x1b[23m'), { excludeLeadingNewLine: true, loudFormatting: true });
                shellLaunchConfig.type = 'Local';
            }
            else if (this._remoteAgentService.getConnection()) {
                shellLaunchConfig.initialText = formatMessageForTerminal(nls.localize('localTerminalRemote', "This shell is running on your {0}local{1} machine, NOT on the connected remote machine", '\x1b[3m', '\x1b[23m'), { excludeLeadingNewLine: true, loudFormatting: true });
                shellLaunchConfig.type = 'Local';
            }
        }
    }
    _showBackgroundTerminal(instance) {
        const index = this._backgroundedTerminalInstances.indexOf(instance);
        if (index === -1) {
            return;
        }
        this._backgroundedTerminalInstances.splice(this._backgroundedTerminalInstances.indexOf(instance), 1);
        const disposables = this._backgroundedTerminalDisposables.get(instance.instanceId);
        if (disposables) {
            dispose(disposables);
        }
        this._backgroundedTerminalDisposables.delete(instance.instanceId);
        this._terminalGroupService.createGroup(instance);
        // Make active automatically if it's the first instance
        if (this.instances.length === 1) {
            this._terminalGroupService.setActiveInstanceByIndex(0);
        }
        this._onDidChangeInstances.fire();
    }
    async setContainers(panelContainer, terminalContainer) {
        this._terminalConfigurationService.setPanelContainer(panelContainer);
        this._terminalGroupService.setContainer(terminalContainer);
    }
    getEditingTerminal() {
        return this._editingTerminal;
    }
    setEditingTerminal(instance) {
        this._editingTerminal = instance;
    }
    createOnInstanceEvent(getEvent) {
        return new DynamicListEventMultiplexer(this.instances, this.onDidCreateInstance, this.onDidDisposeInstance, getEvent);
    }
    createOnInstanceCapabilityEvent(capabilityId, getEvent) {
        return createInstanceCapabilityEventMultiplexer(this.instances, this.onDidCreateInstance, this.onDidDisposeInstance, capabilityId, getEvent);
    }
};
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceData", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceDataInput", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceIconChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceMaximumDimensionsChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstancePrimaryStatusChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceProcessIdReady", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceSelectionChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceTitleChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceShellTypeChanged", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceAddedCapabilityType", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_saveState", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_updateTitle", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_updateIcon", null);
TerminalService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILifecycleService),
    __param(2, ITerminalLogService),
    __param(3, IDialogService),
    __param(4, IInstantiationService),
    __param(5, IRemoteAgentService),
    __param(6, IViewsService),
    __param(7, IConfigurationService),
    __param(8, ITerminalConfigurationService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, ITerminalConfigurationService),
    __param(11, ITerminalEditorService),
    __param(12, ITerminalGroupService),
    __param(13, ITerminalInstanceService),
    __param(14, IEditorGroupsService),
    __param(15, ITerminalProfileService),
    __param(16, IExtensionService),
    __param(17, INotificationService),
    __param(18, IWorkspaceContextService),
    __param(19, ICommandService),
    __param(20, IKeybindingService),
    __param(21, ITimerService)
], TerminalService);
export { TerminalService };
let TerminalEditorStyle = class TerminalEditorStyle extends Themable {
    constructor(container, _terminalService, _themeService, _terminalProfileService, _editorService) {
        super(_themeService);
        this._terminalService = _terminalService;
        this._themeService = _themeService;
        this._terminalProfileService = _terminalProfileService;
        this._editorService = _editorService;
        this._registerListeners();
        this._styleElement = domStylesheets.createStyleSheet(container);
        this._register(toDisposable(() => this._styleElement.remove()));
        this.updateStyles();
    }
    _registerListeners() {
        this._register(this._terminalService.onAnyInstanceIconChange(() => this.updateStyles()));
        this._register(this._terminalService.onDidCreateInstance(() => this.updateStyles()));
        this._register(this._editorService.onDidActiveEditorChange(() => {
            if (this._editorService.activeEditor instanceof TerminalEditorInput) {
                this.updateStyles();
            }
        }));
        this._register(this._editorService.onDidCloseEditor(() => {
            if (this._editorService.activeEditor instanceof TerminalEditorInput) {
                this.updateStyles();
            }
        }));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles(() => this.updateStyles()));
    }
    updateStyles() {
        super.updateStyles();
        const colorTheme = this._themeService.getColorTheme();
        // TODO: add a rule collector to avoid duplication
        let css = '';
        const productIconTheme = this._themeService.getProductIconTheme();
        // Add icons
        for (const instance of this._terminalService.instances) {
            const icon = instance.icon;
            if (!icon) {
                continue;
            }
            let uri = undefined;
            if (icon instanceof URI) {
                uri = icon;
            }
            else if (icon instanceof Object && 'light' in icon && 'dark' in icon) {
                uri = colorTheme.type === ColorScheme.LIGHT ? icon.light : icon.dark;
            }
            const iconClasses = getUriClasses(instance, colorTheme.type);
            if (uri instanceof URI && iconClasses && iconClasses.length > 1) {
                css += (cssValue.inline `.monaco-workbench .terminal-tab.${cssValue.className(iconClasses[0])}::before
					{content: ''; background-image: ${cssValue.asCSSUrl(uri)};}`);
            }
            if (ThemeIcon.isThemeIcon(icon)) {
                const iconRegistry = getIconRegistry();
                const iconContribution = iconRegistry.getIcon(icon.id);
                if (iconContribution) {
                    const def = productIconTheme.getIcon(iconContribution);
                    if (def) {
                        css += cssValue.inline `.monaco-workbench .terminal-tab.codicon-${cssValue.className(icon.id)}::before
							{content: ${cssValue.stringValue(def.fontCharacter)} !important; font-family: ${cssValue.stringValue(def.font?.id ?? 'codicon')} !important;}`;
                    }
                }
            }
        }
        // Add colors
        const iconForegroundColor = colorTheme.getColor(iconForeground);
        if (iconForegroundColor) {
            css += cssValue.inline `.monaco-workbench .show-file-icons .file-icon.terminal-tab::before { color: ${iconForegroundColor}; }`;
        }
        css += getColorStyleContent(colorTheme, true);
        this._styleElement.textContent = css;
    }
};
TerminalEditorStyle = __decorate([
    __param(1, ITerminalService),
    __param(2, IThemeService),
    __param(3, ITerminalProfileService),
    __param(4, IEditorService)
], TerminalEditorStyle);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxjQUFjLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxLQUFLLFFBQVEsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQWdDLE1BQU0sa0NBQWtDLENBQUM7QUFDN0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0s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