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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSW5kaWNhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3JlbW90ZUluZGljYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBNEIsTUFBTSxnREFBZ0QsQ0FBQztBQUV4SyxPQUFPLEVBQXNCLGlCQUFpQixFQUE0QyxNQUFNLGtEQUFrRCxDQUFDO0FBQ25KLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFpQixrQkFBa0IsRUFB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