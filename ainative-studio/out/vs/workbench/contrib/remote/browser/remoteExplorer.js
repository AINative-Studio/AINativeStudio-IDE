var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../../common/views.js';
import { IRemoteExplorerService, PORT_AUTO_FALLBACK_SETTING, PORT_AUTO_FORWARD_SETTING, PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_HYBRID, PORT_AUTO_SOURCE_SETTING_OUTPUT, PORT_AUTO_SOURCE_SETTING_PROCESS, PortsEnablement, TUNNEL_VIEW_CONTAINER_ID, TUNNEL_VIEW_ID } from '../../../services/remote/common/remoteExplorerService.js';
import { AutoTunnelSource, forwardedPortsFeaturesEnabled, forwardedPortsViewEnabled, makeAddress, mapHasAddressLocalhostOrAllInterfaces, OnPortForward, TunnelCloseReason, TunnelSource } from '../../../services/remote/common/tunnelModel.js';
import { ForwardPortAction, OpenPortInBrowserAction, TunnelPanel, TunnelPanelDescriptor, TunnelViewModel, OpenPortInPreviewAction, openPreviewEnabledContext } from './tunnelView.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { UrlFinder } from './urlFinder.js';
import Severity from '../../../../base/common/severity.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITerminalService } from '../../terminal/browser/terminal.js';
import { IDebugService } from '../../debug/common/debug.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ITunnelService, TunnelPrivacyId } from '../../../../platform/tunnel/common/tunnel.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { portsViewIcon } from './remoteIcons.js';
import { Event } from '../../../../base/common/event.js';
import { IExternalUriOpenerService } from '../../externalUriOpener/common/externalUriOpenerService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { Action } from '../../../../base/common/actions.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const VIEWLET_ID = 'workbench.view.remote';
let ForwardedPortsView = class ForwardedPortsView extends Disposable {
    constructor(contextKeyService, environmentService, remoteExplorerService, tunnelService, activityService, statusbarService) {
        super();
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
        this.activityService = activityService;
        this.statusbarService = statusbarService;
        this.contextKeyListener = this._register(new MutableDisposable());
        this.activityBadge = this._register(new MutableDisposable());
        this.hasPortsInSession = false;
        this._register(Registry.as(Extensions.ViewsRegistry).registerViewWelcomeContent(TUNNEL_VIEW_ID, {
            content: this.environmentService.remoteAuthority ? nls.localize('remoteNoPorts', "No forwarded ports. Forward a port to access your running services locally.\n[Forward a Port]({0})", `command:${ForwardPortAction.INLINE_ID}`)
                : nls.localize('noRemoteNoPorts', "No forwarded ports. Forward a port to access your locally running services over the internet.\n[Forward a Port]({0})", `command:${ForwardPortAction.INLINE_ID}`),
        }));
        this.enableBadgeAndStatusBar();
        this.enableForwardedPortsFeatures();
        if (!this.environmentService.remoteAuthority) {
            this._register(Event.once(this.tunnelService.onTunnelOpened)(() => {
                this.hasPortsInSession = true;
            }));
        }
    }
    async getViewContainer() {
        return Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
            id: TUNNEL_VIEW_CONTAINER_ID,
            title: nls.localize2('ports', "Ports"),
            icon: portsViewIcon,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [TUNNEL_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
            storageId: TUNNEL_VIEW_CONTAINER_ID,
            hideIfEmpty: true,
            order: 5
        }, 1 /* ViewContainerLocation.Panel */);
    }
    async enableForwardedPortsFeatures() {
        this.contextKeyListener.clear();
        const featuresEnabled = !!forwardedPortsFeaturesEnabled.getValue(this.contextKeyService);
        const viewEnabled = !!forwardedPortsViewEnabled.getValue(this.contextKeyService);
        if (featuresEnabled || viewEnabled) {
            // Also enable the view if it isn't already.
            if (!viewEnabled) {
                this.contextKeyService.createKey(forwardedPortsViewEnabled.key, true);
            }
            const viewContainer = await this.getViewContainer();
            const tunnelPanelDescriptor = new TunnelPanelDescriptor(new TunnelViewModel(this.remoteExplorerService, this.tunnelService), this.environmentService);
            const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
            if (viewContainer) {
                this.remoteExplorerService.enablePortsFeatures(!featuresEnabled);
                viewsRegistry.registerViews([tunnelPanelDescriptor], viewContainer);
            }
        }
        else {
            this.contextKeyListener.value = this.contextKeyService.onDidChangeContext(e => {
                if (e.affectsSome(new Set([...forwardedPortsFeaturesEnabled.keys(), ...forwardedPortsViewEnabled.keys()]))) {
                    this.enableForwardedPortsFeatures();
                }
            });
        }
    }
    enableBadgeAndStatusBar() {
        const disposable = Registry.as(Extensions.ViewsRegistry).onViewsRegistered(e => {
            if (e.find(view => view.views.find(viewDescriptor => viewDescriptor.id === TUNNEL_VIEW_ID))) {
                this._register(Event.debounce(this.remoteExplorerService.tunnelModel.onForwardPort, (_last, e) => e, 50)(() => {
                    this.updateActivityBadge();
                    this.updateStatusBar();
                }));
                this._register(Event.debounce(this.remoteExplorerService.tunnelModel.onClosePort, (_last, e) => e, 50)(() => {
                    this.updateActivityBadge();
                    this.updateStatusBar();
                }));
                this.updateActivityBadge();
                this.updateStatusBar();
                disposable.dispose();
            }
        });
    }
    async updateActivityBadge() {
        if (this.remoteExplorerService.tunnelModel.forwarded.size > 0) {
            this.activityBadge.value = this.activityService.showViewActivity(TUNNEL_VIEW_ID, {
                badge: new NumberBadge(this.remoteExplorerService.tunnelModel.forwarded.size, n => n === 1 ? nls.localize('1forwardedPort', "1 forwarded port") : nls.localize('nForwardedPorts', "{0} forwarded ports", n))
            });
        }
        else {
            this.activityBadge.clear();
        }
    }
    updateStatusBar() {
        if (!this.environmentService.remoteAuthority && !this.hasPortsInSession) {
            // We only want to show the ports status bar entry when the user has taken an action that indicates that they might care about it.
            return;
        }
        if (!this.entryAccessor) {
            this._register(this.entryAccessor = this.statusbarService.addEntry(this.entry, 'status.forwardedPorts', 0 /* StatusbarAlignment.LEFT */, 40));
        }
        else {
            this.entryAccessor.update(this.entry);
        }
    }
    get entry() {
        let tooltip;
        const count = this.remoteExplorerService.tunnelModel.forwarded.size + this.remoteExplorerService.tunnelModel.detected.size;
        const text = `${count}`;
        if (count === 0) {
            tooltip = nls.localize('remote.forwardedPorts.statusbarTextNone', "No Ports Forwarded");
        }
        else {
            const allTunnels = Array.from(this.remoteExplorerService.tunnelModel.forwarded.values());
            allTunnels.push(...Array.from(this.remoteExplorerService.tunnelModel.detected.values()));
            tooltip = nls.localize('remote.forwardedPorts.statusbarTooltip', "Forwarded Ports: {0}", allTunnels.map(forwarded => forwarded.remotePort).join(', '));
        }
        return {
            name: nls.localize('status.forwardedPorts', "Forwarded Ports"),
            text: `$(radio-tower) ${text}`,
            ariaLabel: tooltip,
            tooltip,
            command: `${TUNNEL_VIEW_ID}.focus`
        };
    }
};
ForwardedPortsView = __decorate([
    __param(0, IContextKeyService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IRemoteExplorerService),
    __param(3, ITunnelService),
    __param(4, IActivityService),
    __param(5, IStatusbarService)
], ForwardedPortsView);
export { ForwardedPortsView };
let PortRestore = class PortRestore {
    constructor(remoteExplorerService, logService) {
        this.remoteExplorerService = remoteExplorerService;
        this.logService = logService;
        if (!this.remoteExplorerService.tunnelModel.environmentTunnelsSet) {
            Event.once(this.remoteExplorerService.tunnelModel.onEnvironmentTunnelsSet)(async () => {
                await this.restore();
            });
        }
        else {
            this.restore();
        }
    }
    async restore() {
        this.logService.trace('ForwardedPorts: Doing first restore.');
        return this.remoteExplorerService.restore();
    }
};
PortRestore = __decorate([
    __param(0, IRemoteExplorerService),
    __param(1, ILogService)
], PortRestore);
export { PortRestore };
let AutomaticPortForwarding = class AutomaticPortForwarding extends Disposable {
    constructor(terminalService, notificationService, openerService, externalOpenerService, remoteExplorerService, environmentService, contextKeyService, configurationService, debugService, remoteAgentService, tunnelService, hostService, logService, storageService, preferencesService) {
        super();
        this.terminalService = terminalService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.externalOpenerService = externalOpenerService;
        this.remoteExplorerService = remoteExplorerService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.debugService = debugService;
        this.tunnelService = tunnelService;
        this.hostService = hostService;
        this.logService = logService;
        this.storageService = storageService;
        this.preferencesService = preferencesService;
        if (!environmentService.remoteAuthority) {
            return;
        }
        configurationService.whenRemoteConfigurationLoaded().then(() => remoteAgentService.getEnvironment()).then(environment => {
            this.setup(environment);
            this._register(configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(PORT_AUTO_SOURCE_SETTING)) {
                    this.setup(environment);
                }
                else if (e.affectsConfiguration(PORT_AUTO_FALLBACK_SETTING) && !this.portListener) {
                    this.listenForPorts();
                }
            }));
        });
        if (!this.storageService.getBoolean('processPortForwardingFallback', 1 /* StorageScope.WORKSPACE */, true)) {
            this.configurationService.updateValue(PORT_AUTO_FALLBACK_SETTING, 0, 5 /* ConfigurationTarget.WORKSPACE */);
        }
    }
    getPortAutoFallbackNumber() {
        const fallbackAt = this.configurationService.inspect(PORT_AUTO_FALLBACK_SETTING);
        if ((fallbackAt.value !== undefined) && (fallbackAt.value === 0 || (fallbackAt.value !== fallbackAt.defaultValue))) {
            return fallbackAt.value;
        }
        const inspectSource = this.configurationService.inspect(PORT_AUTO_SOURCE_SETTING);
        if (inspectSource.applicationValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.userValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.userLocalValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.userRemoteValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.workspaceFolderValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.workspaceValue === PORT_AUTO_SOURCE_SETTING_PROCESS) {
            return 0;
        }
        return fallbackAt.value ?? 20;
    }
    listenForPorts() {
        let fallbackAt = this.getPortAutoFallbackNumber();
        if (fallbackAt === 0) {
            this.portListener?.dispose();
            return;
        }
        if (this.procForwarder && !this.portListener && (this.configurationService.getValue(PORT_AUTO_SOURCE_SETTING) === PORT_AUTO_SOURCE_SETTING_PROCESS)) {
            this.portListener = this._register(this.remoteExplorerService.tunnelModel.onForwardPort(async () => {
                fallbackAt = this.getPortAutoFallbackNumber();
                if (fallbackAt === 0) {
                    this.portListener?.dispose();
                    return;
                }
                if (Array.from(this.remoteExplorerService.tunnelModel.forwarded.values()).filter(tunnel => tunnel.source.source === TunnelSource.Auto).length > fallbackAt) {
                    await this.configurationService.updateValue(PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_HYBRID);
                    this.notificationService.notify({
                        message: nls.localize('remote.autoForwardPortsSource.fallback', "Over 20 ports have been automatically forwarded. The `process` based automatic port forwarding has been switched to `hybrid` in settings. Some ports may no longer be detected."),
                        severity: Severity.Warning,
                        actions: {
                            primary: [
                                new Action('switchBack', nls.localize('remote.autoForwardPortsSource.fallback.switchBack', "Undo"), undefined, true, async () => {
                                    await this.configurationService.updateValue(PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_PROCESS);
                                    await this.configurationService.updateValue(PORT_AUTO_FALLBACK_SETTING, 0, 5 /* ConfigurationTarget.WORKSPACE */);
                                    this.portListener?.dispose();
                                    this.portListener = undefined;
                                }),
                                new Action('showPortSourceSetting', nls.localize('remote.autoForwardPortsSource.fallback.showPortSourceSetting', "Show Setting"), undefined, true, async () => {
                                    await this.preferencesService.openSettings({
                                        query: 'remote.autoForwardPortsSource'
                                    });
                                })
                            ]
                        }
                    });
                }
            }));
        }
        else {
            this.portListener?.dispose();
            this.portListener = undefined;
        }
    }
    setup(environment) {
        const alreadyForwarded = this.procForwarder?.forwarded;
        const isSwitch = this.outputForwarder || this.procForwarder;
        this.procForwarder?.dispose();
        this.procForwarder = undefined;
        this.outputForwarder?.dispose();
        this.outputForwarder = undefined;
        if (environment?.os !== 3 /* OperatingSystem.Linux */) {
            if (this.configurationService.inspect(PORT_AUTO_SOURCE_SETTING).default?.value !== PORT_AUTO_SOURCE_SETTING_OUTPUT) {
                Registry.as(ConfigurationExtensions.Configuration)
                    .registerDefaultConfigurations([{ overrides: { 'remote.autoForwardPortsSource': PORT_AUTO_SOURCE_SETTING_OUTPUT } }]);
            }
            this.outputForwarder = this._register(new OutputAutomaticPortForwarding(this.terminalService, this.notificationService, this.openerService, this.externalOpenerService, this.remoteExplorerService, this.configurationService, this.debugService, this.tunnelService, this.hostService, this.logService, this.contextKeyService, () => false));
        }
        else {
            const useProc = () => (this.configurationService.getValue(PORT_AUTO_SOURCE_SETTING) === PORT_AUTO_SOURCE_SETTING_PROCESS);
            if (useProc()) {
                this.procForwarder = this._register(new ProcAutomaticPortForwarding(false, alreadyForwarded, !isSwitch, this.configurationService, this.remoteExplorerService, this.notificationService, this.openerService, this.externalOpenerService, this.tunnelService, this.hostService, this.logService, this.contextKeyService));
            }
            else if (this.configurationService.getValue(PORT_AUTO_SOURCE_SETTING) === PORT_AUTO_SOURCE_SETTING_HYBRID) {
                this.procForwarder = this._register(new ProcAutomaticPortForwarding(true, alreadyForwarded, !isSwitch, this.configurationService, this.remoteExplorerService, this.notificationService, this.openerService, this.externalOpenerService, this.tunnelService, this.hostService, this.logService, this.contextKeyService));
            }
            this.outputForwarder = this._register(new OutputAutomaticPortForwarding(this.terminalService, this.notificationService, this.openerService, this.externalOpenerService, this.remoteExplorerService, this.configurationService, this.debugService, this.tunnelService, this.hostService, this.logService, this.contextKeyService, useProc));
        }
        this.listenForPorts();
    }
};
AutomaticPortForwarding = __decorate([
    __param(0, ITerminalService),
    __param(1, INotificationService),
    __param(2, IOpenerService),
    __param(3, IExternalUriOpenerService),
    __param(4, IRemoteExplorerService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IContextKeyService),
    __param(7, IWorkbenchConfigurationService),
    __param(8, IDebugService),
    __param(9, IRemoteAgentService),
    __param(10, ITunnelService),
    __param(11, IHostService),
    __param(12, ILogService),
    __param(13, IStorageService),
    __param(14, IPreferencesService)
], AutomaticPortForwarding);
export { AutomaticPortForwarding };
class OnAutoForwardedAction extends Disposable {
    static { this.NOTIFY_COOL_DOWN = 5000; } // milliseconds
    constructor(notificationService, remoteExplorerService, openerService, externalOpenerService, tunnelService, hostService, logService, contextKeyService) {
        super();
        this.notificationService = notificationService;
        this.remoteExplorerService = remoteExplorerService;
        this.openerService = openerService;
        this.externalOpenerService = externalOpenerService;
        this.tunnelService = tunnelService;
        this.hostService = hostService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.alreadyOpenedOnce = new Set();
        this.lastNotifyTime = new Date();
        this.lastNotifyTime.setFullYear(this.lastNotifyTime.getFullYear() - 1);
    }
    async doAction(tunnels) {
        this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Starting action for ${tunnels[0]?.tunnelRemotePort}`);
        this.doActionTunnels = tunnels;
        const tunnel = await this.portNumberHeuristicDelay();
        this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Heuristic chose ${tunnel?.tunnelRemotePort}`);
        if (tunnel) {
            const allAttributes = await this.remoteExplorerService.tunnelModel.getAttributes([{ port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost }]);
            const attributes = allAttributes?.get(tunnel.tunnelRemotePort)?.onAutoForward;
            this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) onAutoForward action is ${attributes}`);
            switch (attributes) {
                case OnPortForward.OpenBrowserOnce: {
                    if (this.alreadyOpenedOnce.has(tunnel.localAddress)) {
                        break;
                    }
                    this.alreadyOpenedOnce.add(tunnel.localAddress);
                    // Intentionally do not break so that the open browser path can be run.
                }
                case OnPortForward.OpenBrowser: {
                    const address = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                    await OpenPortInBrowserAction.run(this.remoteExplorerService.tunnelModel, this.openerService, address);
                    break;
                }
                case OnPortForward.OpenPreview: {
                    const address = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                    await OpenPortInPreviewAction.run(this.remoteExplorerService.tunnelModel, this.openerService, this.externalOpenerService, address);
                    break;
                }
                case OnPortForward.Silent: break;
                default: {
                    const elapsed = new Date().getTime() - this.lastNotifyTime.getTime();
                    this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) time elapsed since last notification ${elapsed} ms`);
                    if (elapsed > OnAutoForwardedAction.NOTIFY_COOL_DOWN) {
                        await this.showNotification(tunnel);
                    }
                }
            }
        }
    }
    hide(removedPorts) {
        if (this.doActionTunnels) {
            this.doActionTunnels = this.doActionTunnels.filter(value => !removedPorts.includes(value.tunnelRemotePort));
        }
        if (this.lastShownPort && removedPorts.indexOf(this.lastShownPort) >= 0) {
            this.lastNotification?.close();
        }
    }
    async portNumberHeuristicDelay() {
        this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Starting heuristic delay`);
        if (!this.doActionTunnels || this.doActionTunnels.length === 0) {
            return;
        }
        this.doActionTunnels = this.doActionTunnels.sort((a, b) => a.tunnelRemotePort - b.tunnelRemotePort);
        const firstTunnel = this.doActionTunnels.shift();
        // Heuristic.
        if (firstTunnel.tunnelRemotePort % 1000 === 0) {
            this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Heuristic chose tunnel because % 1000: ${firstTunnel.tunnelRemotePort}`);
            this.newerTunnel = firstTunnel;
            return firstTunnel;
            // 9229 is the node inspect port
        }
        else if (firstTunnel.tunnelRemotePort < 10000 && firstTunnel.tunnelRemotePort !== 9229) {
            this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Heuristic chose tunnel because < 10000: ${firstTunnel.tunnelRemotePort}`);
            this.newerTunnel = firstTunnel;
            return firstTunnel;
        }
        this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Waiting for "better" tunnel than ${firstTunnel.tunnelRemotePort}`);
        this.newerTunnel = undefined;
        return new Promise(resolve => {
            setTimeout(() => {
                if (this.newerTunnel) {
                    resolve(undefined);
                }
                else if (this.doActionTunnels?.includes(firstTunnel)) {
                    resolve(firstTunnel);
                }
                else {
                    resolve(undefined);
                }
            }, 3000);
        });
    }
    async basicMessage(tunnel) {
        const properties = await this.remoteExplorerService.tunnelModel.getAttributes([{ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort }], false);
        const label = properties?.get(tunnel.tunnelRemotePort)?.label;
        return nls.localize('remote.tunnelsView.automaticForward', "Your application{0} running on port {1} is available.  ", label ? ` (${label})` : '', tunnel.tunnelRemotePort);
    }
    linkMessage() {
        return nls.localize({ key: 'remote.tunnelsView.notificationLink2', comment: ['[See all forwarded ports]({0}) is a link. Only translate `See all forwarded ports`. Do not change brackets and parentheses or {0}'] }, "[See all forwarded ports]({0})", `command:${TunnelPanel.ID}.focus`);
    }
    async showNotification(tunnel) {
        if (!await this.hostService.hadLastFocus()) {
            return;
        }
        this.lastNotification?.close();
        let message = await this.basicMessage(tunnel);
        const choices = [this.openBrowserChoice(tunnel)];
        if (!isWeb || openPreviewEnabledContext.getValue(this.contextKeyService)) {
            choices.push(this.openPreviewChoice(tunnel));
        }
        if ((tunnel.tunnelLocalPort !== tunnel.tunnelRemotePort) && this.tunnelService.canElevate && this.tunnelService.isPortPrivileged(tunnel.tunnelRemotePort)) {
            // Privileged ports are not on Windows, so it's safe to use "superuser"
            message += nls.localize('remote.tunnelsView.elevationMessage', "You'll need to run as superuser to use port {0} locally.  ", tunnel.tunnelRemotePort);
            choices.unshift(this.elevateChoice(tunnel));
        }
        if (tunnel.privacy === TunnelPrivacyId.Private && isWeb && this.tunnelService.canChangePrivacy) {
            choices.push(this.makePublicChoice(tunnel));
        }
        message += this.linkMessage();
        this.lastNotification = this.notificationService.prompt(Severity.Info, message, choices, { neverShowAgain: { id: 'remote.tunnelsView.autoForwardNeverShow', isSecondary: true } });
        this.lastShownPort = tunnel.tunnelRemotePort;
        this.lastNotifyTime = new Date();
        this.lastNotification.onDidClose(() => {
            this.lastNotification = undefined;
            this.lastShownPort = undefined;
        });
    }
    makePublicChoice(tunnel) {
        return {
            label: nls.localize('remote.tunnelsView.makePublic', "Make Public"),
            run: async () => {
                const oldTunnelDetails = mapHasAddressLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.forwarded, tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                await this.remoteExplorerService.close({ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort }, TunnelCloseReason.Other);
                return this.remoteExplorerService.forward({
                    remote: { host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort },
                    local: tunnel.tunnelLocalPort,
                    name: oldTunnelDetails?.name,
                    elevateIfNeeded: true,
                    privacy: TunnelPrivacyId.Public,
                    source: oldTunnelDetails?.source
                });
            }
        };
    }
    openBrowserChoice(tunnel) {
        const address = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
        return {
            label: OpenPortInBrowserAction.LABEL,
            run: () => OpenPortInBrowserAction.run(this.remoteExplorerService.tunnelModel, this.openerService, address)
        };
    }
    openPreviewChoice(tunnel) {
        const address = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
        return {
            label: OpenPortInPreviewAction.LABEL,
            run: () => OpenPortInPreviewAction.run(this.remoteExplorerService.tunnelModel, this.openerService, this.externalOpenerService, address)
        };
    }
    elevateChoice(tunnel) {
        return {
            // Privileged ports are not on Windows, so it's ok to stick to just "sudo".
            label: nls.localize('remote.tunnelsView.elevationButton', "Use Port {0} as Sudo...", tunnel.tunnelRemotePort),
            run: async () => {
                await this.remoteExplorerService.close({ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort }, TunnelCloseReason.Other);
                const newTunnel = await this.remoteExplorerService.forward({
                    remote: { host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort },
                    local: tunnel.tunnelRemotePort,
                    elevateIfNeeded: true,
                    source: AutoTunnelSource
                });
                if (!newTunnel || (typeof newTunnel === 'string')) {
                    return;
                }
                this.lastNotification?.close();
                this.lastShownPort = newTunnel.tunnelRemotePort;
                this.lastNotification = this.notificationService.prompt(Severity.Info, await this.basicMessage(newTunnel) + this.linkMessage(), [this.openBrowserChoice(newTunnel), this.openPreviewChoice(tunnel)], { neverShowAgain: { id: 'remote.tunnelsView.autoForwardNeverShow', isSecondary: true } });
                this.lastNotification.onDidClose(() => {
                    this.lastNotification = undefined;
                    this.lastShownPort = undefined;
                });
            }
        };
    }
}
class OutputAutomaticPortForwarding extends Disposable {
    constructor(terminalService, notificationService, openerService, externalOpenerService, remoteExplorerService, configurationService, debugService, tunnelService, hostService, logService, contextKeyService, privilegedOnly) {
        super();
        this.terminalService = terminalService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.externalOpenerService = externalOpenerService;
        this.remoteExplorerService = remoteExplorerService;
        this.configurationService = configurationService;
        this.debugService = debugService;
        this.tunnelService = tunnelService;
        this.hostService = hostService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.privilegedOnly = privilegedOnly;
        this.notifier = new OnAutoForwardedAction(notificationService, remoteExplorerService, openerService, externalOpenerService, tunnelService, hostService, logService, contextKeyService);
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(PORT_AUTO_FORWARD_SETTING)) {
                this.tryStartStopUrlFinder();
            }
        }));
        this.portsFeatures = this._register(this.remoteExplorerService.onEnabledPortsFeatures(() => {
            this.tryStartStopUrlFinder();
        }));
        this.tryStartStopUrlFinder();
        if (configurationService.getValue(PORT_AUTO_SOURCE_SETTING) === PORT_AUTO_SOURCE_SETTING_HYBRID) {
            this._register(this.tunnelService.onTunnelClosed(tunnel => this.notifier.hide([tunnel.port])));
        }
    }
    tryStartStopUrlFinder() {
        if (this.configurationService.getValue(PORT_AUTO_FORWARD_SETTING)) {
            this.startUrlFinder();
        }
        else {
            this.stopUrlFinder();
        }
    }
    startUrlFinder() {
        if (!this.urlFinder && (this.remoteExplorerService.portsFeaturesEnabled !== PortsEnablement.AdditionalFeatures)) {
            return;
        }
        this.portsFeatures?.dispose();
        this.urlFinder = this._register(new UrlFinder(this.terminalService, this.debugService));
        this._register(this.urlFinder.onDidMatchLocalUrl(async (localUrl) => {
            if (mapHasAddressLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.detected, localUrl.host, localUrl.port)) {
                return;
            }
            const attributes = (await this.remoteExplorerService.tunnelModel.getAttributes([localUrl]))?.get(localUrl.port);
            if (attributes?.onAutoForward === OnPortForward.Ignore) {
                return;
            }
            if (this.privilegedOnly() && !this.tunnelService.isPortPrivileged(localUrl.port)) {
                return;
            }
            const forwarded = await this.remoteExplorerService.forward({ remote: localUrl, source: AutoTunnelSource }, attributes ?? null);
            if (forwarded && (typeof forwarded !== 'string')) {
                this.notifier.doAction([forwarded]);
            }
        }));
    }
    stopUrlFinder() {
        if (this.urlFinder) {
            this.urlFinder.dispose();
            this.urlFinder = undefined;
        }
    }
}
class ProcAutomaticPortForwarding extends Disposable {
    constructor(unforwardOnly, alreadyAutoForwarded, needsInitialCandidates, configurationService, remoteExplorerService, notificationService, openerService, externalOpenerService, tunnelService, hostService, logService, contextKeyService) {
        super();
        this.unforwardOnly = unforwardOnly;
        this.alreadyAutoForwarded = alreadyAutoForwarded;
        this.needsInitialCandidates = needsInitialCandidates;
        this.configurationService = configurationService;
        this.remoteExplorerService = remoteExplorerService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.externalOpenerService = externalOpenerService;
        this.tunnelService = tunnelService;
        this.hostService = hostService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.autoForwarded = new Set();
        this.notifiedOnly = new Set();
        this.initialCandidates = new Set();
        this.notifier = new OnAutoForwardedAction(notificationService, remoteExplorerService, openerService, externalOpenerService, tunnelService, hostService, logService, contextKeyService);
        alreadyAutoForwarded?.forEach(port => this.autoForwarded.add(port));
        this.initialize();
    }
    get forwarded() {
        return this.autoForwarded;
    }
    async initialize() {
        if (!this.remoteExplorerService.tunnelModel.environmentTunnelsSet) {
            await new Promise(resolve => this.remoteExplorerService.tunnelModel.onEnvironmentTunnelsSet(() => resolve()));
        }
        this._register(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration(PORT_AUTO_FORWARD_SETTING)) {
                await this.startStopCandidateListener();
            }
        }));
        this.portsFeatures = this._register(this.remoteExplorerService.onEnabledPortsFeatures(async () => {
            await this.startStopCandidateListener();
        }));
        this.startStopCandidateListener();
    }
    async startStopCandidateListener() {
        if (this.configurationService.getValue(PORT_AUTO_FORWARD_SETTING)) {
            await this.startCandidateListener();
        }
        else {
            this.stopCandidateListener();
        }
    }
    stopCandidateListener() {
        if (this.candidateListener) {
            this.candidateListener.dispose();
            this.candidateListener = undefined;
        }
    }
    async startCandidateListener() {
        if (this.candidateListener || (this.remoteExplorerService.portsFeaturesEnabled !== PortsEnablement.AdditionalFeatures)) {
            return;
        }
        this.portsFeatures?.dispose();
        // Capture list of starting candidates so we don't auto forward them later.
        await this.setInitialCandidates();
        // Need to check the setting again, since it may have changed while we waited for the initial candidates to be set.
        if (this.configurationService.getValue(PORT_AUTO_FORWARD_SETTING)) {
            this.candidateListener = this._register(this.remoteExplorerService.tunnelModel.onCandidatesChanged(this.handleCandidateUpdate, this));
        }
    }
    async setInitialCandidates() {
        if (!this.needsInitialCandidates) {
            this.logService.debug(`ForwardedPorts: (ProcForwarding) Not setting initial candidates`);
            return;
        }
        let startingCandidates = this.remoteExplorerService.tunnelModel.candidatesOrUndefined;
        if (!startingCandidates) {
            await new Promise(resolve => this.remoteExplorerService.tunnelModel.onCandidatesChanged(() => resolve()));
            startingCandidates = this.remoteExplorerService.tunnelModel.candidates;
        }
        for (const value of startingCandidates) {
            this.initialCandidates.add(makeAddress(value.host, value.port));
        }
        this.logService.debug(`ForwardedPorts: (ProcForwarding) Initial candidates set to ${startingCandidates.map(candidate => candidate.port).join(', ')}`);
    }
    async forwardCandidates() {
        let attributes;
        const allTunnels = [];
        this.logService.trace(`ForwardedPorts: (ProcForwarding) Attempting to forward ${this.remoteExplorerService.tunnelModel.candidates.length} candidates`);
        for (const value of this.remoteExplorerService.tunnelModel.candidates) {
            if (!value.detail) {
                this.logService.trace(`ForwardedPorts: (ProcForwarding) Port ${value.port} missing detail`);
                continue;
            }
            if (!attributes) {
                attributes = await this.remoteExplorerService.tunnelModel.getAttributes(this.remoteExplorerService.tunnelModel.candidates);
            }
            const portAttributes = attributes?.get(value.port);
            const address = makeAddress(value.host, value.port);
            if (this.initialCandidates.has(address) && (portAttributes?.onAutoForward === undefined)) {
                continue;
            }
            if (this.notifiedOnly.has(address) || this.autoForwarded.has(address)) {
                continue;
            }
            const alreadyForwarded = mapHasAddressLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.forwarded, value.host, value.port);
            if (mapHasAddressLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.detected, value.host, value.port)) {
                continue;
            }
            if (portAttributes?.onAutoForward === OnPortForward.Ignore) {
                this.logService.trace(`ForwardedPorts: (ProcForwarding) Port ${value.port} is ignored`);
                continue;
            }
            const forwarded = await this.remoteExplorerService.forward({ remote: value, source: AutoTunnelSource }, portAttributes ?? null);
            if (!alreadyForwarded && forwarded) {
                this.logService.trace(`ForwardedPorts: (ProcForwarding) Port ${value.port} has been forwarded`);
                this.autoForwarded.add(address);
            }
            else if (forwarded) {
                this.logService.trace(`ForwardedPorts: (ProcForwarding) Port ${value.port} has been notified`);
                this.notifiedOnly.add(address);
            }
            if (forwarded && (typeof forwarded !== 'string')) {
                allTunnels.push(forwarded);
            }
        }
        this.logService.trace(`ForwardedPorts: (ProcForwarding) Forwarded ${allTunnels.length} candidates`);
        if (allTunnels.length === 0) {
            return undefined;
        }
        return allTunnels;
    }
    async handleCandidateUpdate(removed) {
        const removedPorts = [];
        let autoForwarded;
        if (this.unforwardOnly) {
            autoForwarded = new Map();
            for (const entry of this.remoteExplorerService.tunnelModel.forwarded.entries()) {
                if (entry[1].source.source === TunnelSource.Auto) {
                    autoForwarded.set(entry[0], entry[1]);
                }
            }
        }
        else {
            autoForwarded = new Map(this.autoForwarded.entries());
        }
        for (const removedPort of removed) {
            const key = removedPort[0];
            let value = removedPort[1];
            const forwardedValue = mapHasAddressLocalhostOrAllInterfaces(autoForwarded, value.host, value.port);
            if (forwardedValue) {
                if (typeof forwardedValue === 'string') {
                    this.autoForwarded.delete(key);
                }
                else {
                    value = { host: forwardedValue.remoteHost, port: forwardedValue.remotePort };
                }
                await this.remoteExplorerService.close(value, TunnelCloseReason.AutoForwardEnd);
                removedPorts.push(value.port);
            }
            else if (this.notifiedOnly.has(key)) {
                this.notifiedOnly.delete(key);
                removedPorts.push(value.port);
            }
            else if (this.initialCandidates.has(key)) {
                this.initialCandidates.delete(key);
            }
        }
        if (this.unforwardOnly) {
            return;
        }
        if (removedPorts.length > 0) {
            await this.notifier.hide(removedPorts);
        }
        const tunnels = await this.forwardCandidates();
        if (tunnels) {
            await this.notifier.doAction(tunnels);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXhwbG9yZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvcmVtb3RlRXhwbG9yZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEcsT0FBTyxFQUFFLFVBQVUsRUFBaUYsTUFBTSwwQkFBMEIsQ0FBQztBQUNySSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsMEJBQTBCLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsK0JBQStCLEVBQUUsK0JBQStCLEVBQUUsZ0NBQWdDLEVBQUUsZUFBZSxFQUFFLHdCQUF3QixFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2xWLE9BQU8sRUFBYyxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSx5QkFBeUIsRUFBRSxXQUFXLEVBQUUscUNBQXFDLEVBQUUsYUFBYSxFQUFVLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BRLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEwsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8s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