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
var RemoteStatusIndicator_1;
import * as nls from '../../../../nls.js';
import { IRemoteAgentService, remoteConnectionLatencyMeasurer } from '../../../services/remote/common/remoteAgentService.js';
import { RunOnceScheduler, retry } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { MenuId, IMenuService, MenuItemAction, MenuRegistry, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../base/common/network.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { PlatformToString, isWeb, platform } from '../../../../base/common/platform.js';
import { truncate } from '../../../../base/common/strings.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { getRemoteName } from '../../../../platform/remote/common/remoteHosts.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { getCodiconAriaLabel } from '../../../../base/common/iconLabels.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ReloadWindowAction } from '../../../browser/actions/windowActions.js';
import { EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, IExtensionGalleryService, IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionsWorkbenchService, LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID } from '../../extensions/common/extensions.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { RemoteNameContext, VirtualWorkspaceContext } from '../../../common/contextkeys.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { infoIcon } from '../../extensions/browser/extensionsIcons.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let RemoteStatusIndicator = class RemoteStatusIndicator extends Disposable {
    static { RemoteStatusIndicator_1 = this; }
    static { this.ID = 'workbench.contrib.remoteStatusIndicator'; }
    static { this.REMOTE_ACTIONS_COMMAND_ID = 'workbench.action.remote.showMenu'; }
    static { this.CLOSE_REMOTE_COMMAND_ID = 'workbench.action.remote.close'; }
    static { this.SHOW_CLOSE_REMOTE_COMMAND_ID = !isWeb; } // web does not have a "Close Remote" command
    static { this.INSTALL_REMOTE_EXTENSIONS_ID = 'workbench.action.remote.extensions'; }
    static { this.REMOTE_STATUS_LABEL_MAX_LENGTH = 40; }
    static { this.REMOTE_CONNECTION_LATENCY_SCHEDULER_DELAY = 60 * 1000; }
    static { this.REMOTE_CONNECTION_LATENCY_SCHEDULER_FIRST_RUN_DELAY = 10 * 1000; }
    get remoteExtensionMetadata() {
        if (!this._remoteExtensionMetadata) {
            const remoteExtensionTips = { ...this.productService.remoteExtensionTips, ...this.productService.virtualWorkspaceExtensionTips };
            this._remoteExtensionMetadata = Object.values(remoteExtensionTips).filter(value => value.startEntry !== undefined).map(value => {
                return {
                    id: value.extensionId,
                    installed: false,
                    friendlyName: value.friendlyName,
                    isPlatformCompatible: false,
                    dependencies: [],
                    helpLink: value.startEntry?.helpLink ?? '',
                    startConnectLabel: value.startEntry?.startConnectLabel ?? '',
                    startCommand: value.startEntry?.startCommand ?? '',
                    priority: value.startEntry?.priority ?? 10,
                    supportedPlatforms: value.supportedPlatforms
                };
            });
            this.remoteExtensionMetadata.sort((ext1, ext2) => ext1.priority - ext2.priority);
        }
        return this._remoteExtensionMetadata;
    }
    get remoteAuthority() {
        return this.environmentService.remoteAuthority;
    }
    constructor(statusbarService, environmentService, labelService, contextKeyService, menuService, quickInputService, commandService, extensionService, remoteAgentService, remoteAuthorityResolverService, hostService, workspaceContextService, logService, extensionGalleryService, telemetryService, productService, extensionManagementService, extensionsWorkbenchService, dialogService, lifecycleService, openerService, configurationService) {
        super();
        this.statusbarService = statusbarService;
        this.environmentService = environmentService;
        this.labelService = labelService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.extensionService = extensionService;
        this.remoteAgentService = remoteAgentService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.hostService = hostService;
        this.workspaceContextService = workspaceContextService;
        this.logService = logService;
        this.extensionGalleryService = extensionGalleryService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.extensionManagementService = extensionManagementService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.dialogService = dialogService;
        this.lifecycleService = lifecycleService;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.virtualWorkspaceLocation = undefined;
        this.connectionState = undefined;
        this.connectionToken = undefined;
        this.networkState = undefined;
        this.measureNetworkConnectionLatencyScheduler = undefined;
        this.loggedInvalidGroupNames = Object.create(null);
        this._remoteExtensionMetadata = undefined;
        this.remoteMetadataInitialized = false;
        this._onDidChangeEntries = this._register(new Emitter());
        this.onDidChangeEntries = this._onDidChangeEntries.event;
        this.legacyIndicatorMenu = this._register(this.menuService.createMenu(MenuId.StatusBarWindowIndicatorMenu, this.contextKeyService)); // to be removed once migration completed
        this.remoteIndicatorMenu = this._register(this.menuService.createMenu(MenuId.StatusBarRemoteIndicatorMenu, this.contextKeyService));
        this.connectionStateContextKey = new RawContextKey('remoteConnectionState', '').bindTo(this.contextKeyService);
        // Set initial connection state
        if (this.remoteAuthority) {
            this.connectionState = 'initializing';
            this.connectionStateContextKey.set(this.connectionState);
        }
        else {
            this.updateVirtualWorkspaceLocation();
        }
        this.registerActions();
        this.registerListeners();
        this.updateWhenInstalledExtensionsRegistered();
        this.updateRemoteStatusIndicator();
    }
    registerActions() {
        const category = nls.localize2('remote.category', "Remote");
        // Show Remote Menu
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteStatusIndicator_1.REMOTE_ACTIONS_COMMAND_ID,
                    category,
                    title: nls.localize2('remote.showMenu', "Show Remote Menu"),
                    f1: true,
                    keybinding: {
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 45 /* KeyCode.KeyO */,
                    }
                });
                this.run = () => that.showRemoteMenu();
            }
        }));
        // Close Remote Connection
        if (RemoteStatusIndicator_1.SHOW_CLOSE_REMOTE_COMMAND_ID) {
            this._register(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: RemoteStatusIndicator_1.CLOSE_REMOTE_COMMAND_ID,
                        category,
                        title: nls.localize2('remote.close', "Close Remote Connection"),
                        f1: true,
                        precondition: ContextKeyExpr.or(RemoteNameContext, VirtualWorkspaceContext)
                    });
                    this.run = () => that.hostService.openWindow({ forceReuseWindow: true, remoteAuthority: null });
                }
            }));
            if (this.remoteAuthority) {
                MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
                    group: '6_close',
                    command: {
                        id: RemoteStatusIndicator_1.CLOSE_REMOTE_COMMAND_ID,
                        title: nls.localize({ key: 'miCloseRemote', comment: ['&& denotes a mnemonic'] }, "Close Re&&mote Connection")
                    },
                    order: 3.5
                });
            }
        }
        if (this.extensionGalleryService.isEnabled()) {
            this._register(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: RemoteStatusIndicator_1.INSTALL_REMOTE_EXTENSIONS_ID,
                        category,
                        title: nls.localize2('remote.install', "Install Remote Development Extensions"),
                        f1: true
                    });
                    this.run = (accessor, input) => {
                        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                        return extensionsWorkbenchService.openSearch(`@recommended:remotes`);
                    };
                }
            }));
        }
    }
    registerListeners() {
        // Menu changes
        const updateRemoteActions = () => {
            this.remoteMenuActionsGroups = undefined;
            this.updateRemoteStatusIndicator();
        };
        this._register(this.legacyIndicatorMenu.onDidChange(updateRemoteActions));
        this._register(this.remoteIndicatorMenu.onDidChange(updateRemoteActions));
        // Update indicator when formatter changes as it may have an impact on the remote label
        this._register(this.labelService.onDidChangeFormatters(() => this.updateRemoteStatusIndicator()));
        // Update based on remote indicator changes if any
        const remoteIndicator = this.environmentService.options?.windowIndicator;
        if (remoteIndicator && remoteIndicator.onDidChange) {
            this._register(remoteIndicator.onDidChange(() => this.updateRemoteStatusIndicator()));
        }
        // Listen to changes of the connection
        if (this.remoteAuthority) {
            const connection = this.remoteAgentService.getConnection();
            if (connection) {
                this._register(connection.onDidStateChange((e) => {
                    switch (e.type) {
                        case 0 /* PersistentConnectionEventType.ConnectionLost */:
                        case 2 /* PersistentConnectionEventType.ReconnectionRunning */:
                        case 1 /* PersistentConnectionEventType.ReconnectionWait */:
                            this.setConnectionState('reconnecting');
                            break;
                        case 3 /* PersistentConnectionEventType.ReconnectionPermanentFailure */:
                            this.setConnectionState('disconnected');
                            break;
                        case 4 /* PersistentConnectionEventType.ConnectionGain */:
                            this.setConnectionState('connected');
                            break;
                    }
                }));
            }
        }
        else {
            this._register(this.workspaceContextService.onDidChangeWorkbenchState(() => {
                this.updateVirtualWorkspaceLocation();
                this.updateRemoteStatusIndicator();
            }));
        }
        // Online / Offline changes (web only)
        if (isWeb) {
            this._register(Event.any(this._register(new DomEmitter(mainWindow, 'online')).event, this._register(new DomEmitter(mainWindow, 'offline')).event)(() => this.setNetworkState(navigator.onLine ? 'online' : 'offline')));
        }
        this._register(this.extensionService.onDidChangeExtensions(async (result) => {
            for (const ext of result.added) {
                const index = this.remoteExtensionMetadata.findIndex(value => ExtensionIdentifier.equals(value.id, ext.identifier));
                if (index > -1) {
                    this.remoteExtensionMetadata[index].installed = true;
                }
            }
        }));
        this._register(this.extensionManagementService.onDidUninstallExtension(async (result) => {
            const index = this.remoteExtensionMetadata.findIndex(value => ExtensionIdentifier.equals(value.id, result.identifier.id));
            if (index > -1) {
                this.remoteExtensionMetadata[index].installed = false;
            }
        }));
    }
    async initializeRemoteMetadata() {
        if (this.remoteMetadataInitialized) {
            return;
        }
        const currentPlatform = PlatformToString(platform);
        for (let i = 0; i < this.remoteExtensionMetadata.length; i++) {
            const extensionId = this.remoteExtensionMetadata[i].id;
            const supportedPlatforms = this.remoteExtensionMetadata[i].supportedPlatforms;
            const isInstalled = (await this.extensionManagementService.getInstalled()).find(value => ExtensionIdentifier.equals(value.identifier.id, extensionId)) ? true : false;
            this.remoteExtensionMetadata[i].installed = isInstalled;
            if (isInstalled) {
                this.remoteExtensionMetadata[i].isPlatformCompatible = true;
            }
            else if (supportedPlatforms && !supportedPlatforms.includes(currentPlatform)) {
                this.remoteExtensionMetadata[i].isPlatformCompatible = false;
            }
            else {
                this.remoteExtensionMetadata[i].isPlatformCompatible = true;
            }
        }
        this.remoteMetadataInitialized = true;
        this._onDidChangeEntries.fire();
        this.updateRemoteStatusIndicator();
    }
    updateVirtualWorkspaceLocation() {
        this.virtualWorkspaceLocation = getVirtualWorkspaceLocation(this.workspaceContextService.getWorkspace());
    }
    async updateWhenInstalledExtensionsRegistered() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const remoteAuthority = this.remoteAuthority;
        if (remoteAuthority) {
            // Try to resolve the authority to figure out connection state
            (async () => {
                try {
                    const { authority } = await this.remoteAuthorityResolverService.resolveAuthority(remoteAuthority);
                    this.connectionToken = authority.connectionToken;
                    this.setConnectionState('connected');
                }
                catch (error) {
                    this.setConnectionState('disconnected');
                }
            })();
        }
        this.updateRemoteStatusIndicator();
        this.initializeRemoteMetadata();
    }
    setConnectionState(newState) {
        if (this.connectionState !== newState) {
            this.connectionState = newState;
            // simplify context key which doesn't support `connecting`
            if (this.connectionState === 'reconnecting') {
                this.connectionStateContextKey.set('disconnected');
            }
            else {
                this.connectionStateContextKey.set(this.connectionState);
            }
            // indicate status
            this.updateRemoteStatusIndicator();
            // start measuring connection latency once connected
            if (newState === 'connected') {
                this.scheduleMeasureNetworkConnectionLatency();
            }
        }
    }
    scheduleMeasureNetworkConnectionLatency() {
        if (!this.remoteAuthority || // only when having a remote connection
            this.measureNetworkConnectionLatencyScheduler // already scheduled
        ) {
            return;
        }
        this.measureNetworkConnectionLatencyScheduler = this._register(new RunOnceScheduler(() => this.measureNetworkConnectionLatency(), RemoteStatusIndicator_1.REMOTE_CONNECTION_LATENCY_SCHEDULER_DELAY));
        this.measureNetworkConnectionLatencyScheduler.schedule(RemoteStatusIndicator_1.REMOTE_CONNECTION_LATENCY_SCHEDULER_FIRST_RUN_DELAY);
    }
    async measureNetworkConnectionLatency() {
        // Measure latency if we are online
        // but only when the window has focus to prevent constantly
        // waking up the connection to the remote
        if (this.hostService.hasFocus && this.networkState !== 'offline') {
            const measurement = await remoteConnectionLatencyMeasurer.measure(this.remoteAgentService);
            if (measurement) {
                if (measurement.high) {
                    this.setNetworkState('high-latency');
                }
                else if (this.networkState === 'high-latency') {
                    this.setNetworkState('online');
                }
            }
        }
        this.measureNetworkConnectionLatencyScheduler?.schedule();
    }
    setNetworkState(newState) {
        if (this.networkState !== newState) {
            const oldState = this.networkState;
            this.networkState = newState;
            if (newState === 'high-latency') {
                this.logService.warn(`Remote network connection appears to have high latency (${remoteConnectionLatencyMeasurer.latency?.current?.toFixed(2)}ms last, ${remoteConnectionLatencyMeasurer.latency?.average?.toFixed(2)}ms average)`);
            }
            if (this.connectionToken) {
                if (newState === 'online' && oldState === 'high-latency') {
                    this.logNetworkConnectionHealthTelemetry(this.connectionToken, 'good');
                }
                else if (newState === 'high-latency' && oldState === 'online') {
                    this.logNetworkConnectionHealthTelemetry(this.connectionToken, 'poor');
                }
            }
            // update status
            this.updateRemoteStatusIndicator();
        }
    }
    logNetworkConnectionHealthTelemetry(connectionToken, connectionHealth) {
        this.telemetryService.publicLog2('remoteConnectionHealth', {
            remoteName: getRemoteName(this.remoteAuthority),
            reconnectionToken: connectionToken,
            connectionHealth
        });
    }
    validatedGroup(group) {
        if (!group.match(/^(remote|virtualfs)_(\d\d)_(([a-z][a-z0-9+.-]*)_(.*))$/)) {
            if (!this.loggedInvalidGroupNames[group]) {
                this.loggedInvalidGroupNames[group] = true;
                this.logService.warn(`Invalid group name used in "statusBar/remoteIndicator" menu contribution: ${group}. Entries ignored. Expected format: 'remote_$ORDER_$REMOTENAME_$GROUPING or 'virtualfs_$ORDER_$FILESCHEME_$GROUPING.`);
            }
            return false;
        }
        return true;
    }
    getRemoteMenuActions(doNotUseCache) {
        if (!this.remoteMenuActionsGroups || doNotUseCache) {
            this.remoteMenuActionsGroups = this.remoteIndicatorMenu.getActions().filter(a => this.validatedGroup(a[0])).concat(this.legacyIndicatorMenu.getActions());
        }
        return this.remoteMenuActionsGroups;
    }
    updateRemoteStatusIndicator() {
        // Remote Indicator: show if provided via options, e.g. by the web embedder API
        const remoteIndicator = this.environmentService.options?.windowIndicator;
        if (remoteIndicator) {
            let remoteIndicatorLabel = remoteIndicator.label.trim();
            if (!remoteIndicatorLabel.startsWith('$(')) {
                remoteIndicatorLabel = `$(remote) ${remoteIndicatorLabel}`; // ensure the indicator has a codicon
            }
            this.renderRemoteStatusIndicator(truncate(remoteIndicatorLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH), remoteIndicator.tooltip, remoteIndicator.command);
            return;
        }
        // Show for remote windows on the desktop
        if (this.remoteAuthority) {
            const hostLabel = this.labelService.getHostLabel(Schemas.vscodeRemote, this.remoteAuthority) || this.remoteAuthority;
            switch (this.connectionState) {
                case 'initializing':
                    this.renderRemoteStatusIndicator(nls.localize('host.open', "Opening Remote..."), nls.localize('host.open', "Opening Remote..."), undefined, true /* progress */);
                    break;
                case 'reconnecting':
                    this.renderRemoteStatusIndicator(`${nls.localize('host.reconnecting', "Reconnecting to {0}...", truncate(hostLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH))}`, undefined, undefined, true /* progress */);
                    break;
                case 'disconnected':
                    this.renderRemoteStatusIndicator(`$(alert) ${nls.localize('disconnectedFrom', "Disconnected from {0}", truncate(hostLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH))}`);
                    break;
                default: {
                    const tooltip = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
                    const hostNameTooltip = this.labelService.getHostTooltip(Schemas.vscodeRemote, this.remoteAuthority);
                    if (hostNameTooltip) {
                        tooltip.appendMarkdown(hostNameTooltip);
                    }
                    else {
                        tooltip.appendText(nls.localize({ key: 'host.tooltip', comment: ['{0} is a remote host name, e.g. Dev Container'] }, "Editing on {0}", hostLabel));
                    }
                    this.renderRemoteStatusIndicator(`$(remote) ${truncate(hostLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH)}`, tooltip);
                }
            }
            return;
        }
        // Show when in a virtual workspace
        if (this.virtualWorkspaceLocation) {
            // Workspace with label: indicate editing source
            const workspaceLabel = this.labelService.getHostLabel(this.virtualWorkspaceLocation.scheme, this.virtualWorkspaceLocation.authority);
            if (workspaceLabel) {
                const tooltip = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
                const hostNameTooltip = this.labelService.getHostTooltip(this.virtualWorkspaceLocation.scheme, this.virtualWorkspaceLocation.authority);
                if (hostNameTooltip) {
                    tooltip.appendMarkdown(hostNameTooltip);
                }
                else {
                    tooltip.appendText(nls.localize({ key: 'workspace.tooltip', comment: ['{0} is a remote workspace name, e.g. GitHub'] }, "Editing on {0}", workspaceLabel));
                }
                if (!isWeb || this.remoteAuthority) {
                    tooltip.appendMarkdown('\n\n');
                    tooltip.appendMarkdown(nls.localize({ key: 'workspace.tooltip2', comment: ['[features are not available]({1}) is a link. Only translate `features are not available`. Do not change brackets and parentheses or {0}'] }, "Some [features are not available]({0}) for resources located on a virtual file system.", `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`));
                }
                this.renderRemoteStatusIndicator(`$(remote) ${truncate(workspaceLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH)}`, tooltip);
                return;
            }
        }
        this.renderRemoteStatusIndicator(`$(remote)`, nls.localize('noHost.tooltip', "Open a Remote Window"));
        return;
    }
    renderRemoteStatusIndicator(initialText, initialTooltip, command, showProgress) {
        const { text, tooltip, ariaLabel } = this.withNetworkStatus(initialText, initialTooltip, showProgress);
        const properties = {
            name: nls.localize('remoteHost', "Remote Host"),
            kind: this.networkState === 'offline' ? 'offline' : 'remote',
            ariaLabel,
            text,
            showProgress,
            tooltip,
            command: command ?? RemoteStatusIndicator_1.REMOTE_ACTIONS_COMMAND_ID
        };
        if (this.remoteStatusEntry) {
            this.remoteStatusEntry.update(properties);
        }
        else {
            this.remoteStatusEntry = this.statusbarService.addEntry(properties, 'status.host', 0 /* StatusbarAlignment.LEFT */, Number.POSITIVE_INFINITY /* first entry */);
        }
    }
    withNetworkStatus(initialText, initialTooltip, showProgress) {
        let text = initialText;
        let tooltip = initialTooltip;
        let ariaLabel = getCodiconAriaLabel(text);
        function textWithAlert() {
            // `initialText` can have a codicon in the beginning that already
            // indicates some kind of status, or we may have been asked to
            // show progress, where a spinning codicon appears. we only want
            // to replace with an alert icon for when a normal remote indicator
            // is shown.
            if (!showProgress && initialText.startsWith('$(remote)')) {
                return initialText.replace('$(remote)', '$(alert)');
            }
            return initialText;
        }
        switch (this.networkState) {
            case 'offline': {
                const offlineMessage = nls.localize('networkStatusOfflineTooltip', "Network appears to be offline, certain features might be unavailable.");
                text = textWithAlert();
                tooltip = this.appendTooltipLine(tooltip, offlineMessage);
                ariaLabel = `${ariaLabel}, ${offlineMessage}`;
                break;
            }
            case 'high-latency':
                text = textWithAlert();
                tooltip = this.appendTooltipLine(tooltip, nls.localize('networkStatusHighLatencyTooltip', "Network appears to have high latency ({0}ms last, {1}ms average), certain features may be slow to respond.", remoteConnectionLatencyMeasurer.latency?.current?.toFixed(2), remoteConnectionLatencyMeasurer.latency?.average?.toFixed(2)));
                break;
        }
        return { text, tooltip, ariaLabel };
    }
    appendTooltipLine(tooltip, line) {
        let markdownTooltip;
        if (typeof tooltip === 'string') {
            markdownTooltip = new MarkdownString(tooltip, { isTrusted: true, supportThemeIcons: true });
        }
        else {
            markdownTooltip = tooltip ?? new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        }
        if (markdownTooltip.value.length > 0) {
            markdownTooltip.appendMarkdown('\n\n');
        }
        markdownTooltip.appendMarkdown(line);
        return markdownTooltip;
    }
    async installExtension(extensionId, remoteLabel) {
        try {
            await this.extensionsWorkbenchService.install(extensionId, {
                isMachineScoped: false,
                donotIncludePackAndDependencies: false,
                context: { [EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT]: true }
            });
        }
        catch (error) {
            if (!this.lifecycleService.willShutdown) {
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Error,
                    message: nls.localize('unknownSetupError', "An error occurred while setting up {0}. Would you like to try again?", remoteLabel),
                    detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                    primaryButton: nls.localize('retry', "Retry")
                });
                if (confirmed) {
                    return this.installExtension(extensionId, remoteLabel);
                }
            }
            throw error;
        }
    }
    async runRemoteStartCommand(extensionId, startCommand) {
        // check to ensure the extension is installed
        await retry(async () => {
            const ext = await this.extensionService.getExtension(extensionId);
            if (!ext) {
                throw Error('Failed to find installed remote extension');
            }
            return ext;
        }, 300, 10);
        this.commandService.executeCommand(startCommand);
        this.telemetryService.publicLog2('workbenchActionExecuted', {
            id: 'remoteInstallAndRun',
            detail: extensionId,
            from: 'remote indicator'
        });
    }
    showRemoteMenu() {
        const getCategoryLabel = (action) => {
            if (action.item.category) {
                return typeof action.item.category === 'string' ? action.item.category : action.item.category.value;
            }
            return undefined;
        };
        const matchCurrentRemote = () => {
            if (this.remoteAuthority) {
                return new RegExp(`^remote_\\d\\d_${getRemoteName(this.remoteAuthority)}_`);
            }
            else if (this.virtualWorkspaceLocation) {
                return new RegExp(`^virtualfs_\\d\\d_${this.virtualWorkspaceLocation.scheme}_`);
            }
            return undefined;
        };
        const computeItems = () => {
            let actionGroups = this.getRemoteMenuActions(true);
            const items = [];
            const currentRemoteMatcher = matchCurrentRemote();
            if (currentRemoteMatcher) {
                // commands for the current remote go first
                actionGroups = actionGroups.sort((g1, g2) => {
                    const isCurrentRemote1 = currentRemoteMatcher.test(g1[0]);
                    const isCurrentRemote2 = currentRemoteMatcher.test(g2[0]);
                    if (isCurrentRemote1 !== isCurrentRemote2) {
                        return isCurrentRemote1 ? -1 : 1;
                    }
                    // legacy indicator commands go last
                    if (g1[0] !== '' && g2[0] === '') {
                        return -1;
                    }
                    else if (g1[0] === '' && g2[0] !== '') {
                        return 1;
                    }
                    return g1[0].localeCompare(g2[0]);
                });
            }
            let lastCategoryName = undefined;
            for (const actionGroup of actionGroups) {
                let hasGroupCategory = false;
                for (const action of actionGroup[1]) {
                    if (action instanceof MenuItemAction) {
                        if (!hasGroupCategory) {
                            const category = getCategoryLabel(action);
                            if (category !== lastCategoryName) {
                                items.push({ type: 'separator', label: category });
                                lastCategoryName = category;
                            }
                            hasGroupCategory = true;
                        }
                        const label = typeof action.item.title === 'string' ? action.item.title : action.item.title.value;
                        items.push({
                            type: 'item',
                            id: action.item.id,
                            label
                        });
                    }
                }
            }
            const showExtensionRecommendations = this.configurationService.getValue('workbench.remoteIndicator.showExtensionRecommendations');
            if (showExtensionRecommendations && this.extensionGalleryService.isEnabled() && this.remoteMetadataInitialized) {
                const notInstalledItems = [];
                for (const metadata of this.remoteExtensionMetadata) {
                    if (!metadata.installed && metadata.isPlatformCompatible) {
                        // Create Install QuickPick with a help link
                        const label = metadata.startConnectLabel;
                        const buttons = [{
                                iconClass: ThemeIcon.asClassName(infoIcon),
                                tooltip: nls.localize('remote.startActions.help', "Learn More")
                            }];
                        notInstalledItems.push({ type: 'item', id: metadata.id, label: label, buttons: buttons });
                    }
                }
                items.push({
                    type: 'separator', label: nls.localize('remote.startActions.install', 'Install')
                });
                items.push(...notInstalledItems);
            }
            items.push({
                type: 'separator'
            });
            const entriesBeforeConfig = items.length;
            if (RemoteStatusIndicator_1.SHOW_CLOSE_REMOTE_COMMAND_ID) {
                if (this.remoteAuthority) {
                    items.push({
                        type: 'item',
                        id: RemoteStatusIndicator_1.CLOSE_REMOTE_COMMAND_ID,
                        label: nls.localize('closeRemoteConnection.title', 'Close Remote Connection')
                    });
                    if (this.connectionState === 'disconnected') {
                        items.push({
                            type: 'item',
                            id: ReloadWindowAction.ID,
                            label: nls.localize('reloadWindow', 'Reload Window')
                        });
                    }
                }
                else if (this.virtualWorkspaceLocation) {
                    items.push({
                        type: 'item',
                        id: RemoteStatusIndicator_1.CLOSE_REMOTE_COMMAND_ID,
                        label: nls.localize('closeVirtualWorkspace.title', 'Close Remote Workspace')
                    });
                }
            }
            if (items.length === entriesBeforeConfig) {
                items.pop(); // remove the separator again
            }
            return items;
        };
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.placeholder = nls.localize('remoteActions', "Select an option to open a Remote Window");
        quickPick.items = computeItems();
        quickPick.sortByLabel = false;
        quickPick.canSelectMany = false;
        disposables.add(Event.once(quickPick.onDidAccept)((async (_) => {
            const selectedItems = quickPick.selectedItems;
            if (selectedItems.length === 1) {
                const commandId = selectedItems[0].id;
                const remoteExtension = this.remoteExtensionMetadata.find(value => ExtensionIdentifier.equals(value.id, commandId));
                if (remoteExtension) {
                    quickPick.items = [];
                    quickPick.busy = true;
                    quickPick.placeholder = nls.localize('remote.startActions.installingExtension', 'Installing extension... ');
                    try {
                        await this.installExtension(remoteExtension.id, selectedItems[0].label);
                    }
                    catch (error) {
                        return;
                    }
                    finally {
                        quickPick.hide();
                    }
                    await this.runRemoteStartCommand(remoteExtension.id, remoteExtension.startCommand);
                }
                else {
                    this.telemetryService.publicLog2('workbenchActionExecuted', {
                        id: commandId,
                        from: 'remote indicator'
                    });
                    this.commandService.executeCommand(commandId);
                    quickPick.hide();
                }
            }
        })));
        disposables.add(Event.once(quickPick.onDidTriggerItemButton)(async (e) => {
            const remoteExtension = this.remoteExtensionMetadata.find(value => ExtensionIdentifier.equals(value.id, e.item.id));
            if (remoteExtension) {
                await this.openerService.open(URI.parse(remoteExtension.helpLink));
            }
        }));
        // refresh the items when actions change
        disposables.add(this.legacyIndicatorMenu.onDidChange(() => quickPick.items = computeItems()));
        disposables.add(this.remoteIndicatorMenu.onDidChange(() => quickPick.items = computeItems()));
        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
        if (!this.remoteMetadataInitialized) {
            quickPick.busy = true;
            this._register(this.onDidChangeEntries(() => {
                // If quick pick is open, update the quick pick items after initialization.
                quickPick.busy = false;
                quickPick.items = computeItems();
            }));
        }
        quickPick.show();
    }
};
RemoteStatusIndicator = RemoteStatusIndicator_1 = __decorate([
    __param(0, IStatusbarService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, ILabelService),
    __param(3, IContextKeyService),
    __param(4, IMenuService),
    __param(5, IQuickInputService),
    __param(6, ICommandService),
    __param(7, IExtensionService),
    __param(8, IRemoteAgentService),
    __param(9, IRemoteAuthorityResolverService),
    __param(10, IHostService),
    __param(11, IWorkspaceContextService),
    __param(12, ILogService),
    __param(13, IExtensionGalleryService),
    __param(14, ITelemetryService),
    __param(15, IProductService),
    __param(16, IExtensionManagementService),
    __param(17, IExtensionsWorkbenchService),
    __param(18, IDialogService),
    __param(19, ILifecycleService),
    __param(20, IOpenerService),
    __param(21, IConfigurationService)
], RemoteStatusIndicator);
export { RemoteStatusIndicator };
Registry.as(ConfigurationExtensions.Configuration)
    .registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.remoteIndicator.showExtensionRecommendations': {
            type: 'boolean',
            markdownDescription: nls.localize('remote.showExtensionRecommendations', "When enabled, remote extensions recommendations will be shown in the Remote Indicator menu."),
            default: true
        },
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSW5kaWNhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvcmVtb3RlSW5kaWNhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUE0QixNQUFNLGdEQUFnRCxDQUFDO0FBRXhLLE9BQU8sRUFBc0IsaUJBQWlCLEVBQTRDLE1BQU0sa0RBQWtELENBQUM7QUFDbkosT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQWlCLGtCQUFrQixFQUFx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