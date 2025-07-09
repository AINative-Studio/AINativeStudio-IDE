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
var TunnelPanel_1;
import './media/tunnelView.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService, RawContextKey, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { Event } from '../../../../base/common/event.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { Disposable, toDisposable, dispose, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { IMenuService, MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { createActionViewItem, getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IRemoteExplorerService, TunnelType, TUNNEL_VIEW_ID, TunnelEditId } from '../../../services/remote/common/remoteExplorerService.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { URI } from '../../../../base/common/uri.js';
import { isAllInterfaces, isLocalhost, ITunnelService, TunnelPrivacyId, TunnelProtocol } from '../../../../platform/tunnel/common/tunnel.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { copyAddressIcon, forwardedPortWithoutProcessIcon, forwardedPortWithProcessIcon, forwardPortIcon, labelPortIcon, openBrowserIcon, openPreviewIcon, portsViewIcon, privatePortIcon, stopForwardIcon } from './remoteIcons.js';
import { IExternalUriOpenerService } from '../../externalUriOpener/common/externalUriOpenerService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { STATUS_BAR_REMOTE_ITEM_BACKGROUND } from '../../../common/theme.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { defaultButtonStyles, defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { TunnelCloseReason, TunnelSource, forwardedPortsViewEnabled, makeAddress, mapHasAddressLocalhostOrAllInterfaces, parseAddress } from '../../../services/remote/common/tunnelModel.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
export const openPreviewEnabledContext = new RawContextKey('openPreviewEnabled', false);
class TunnelTreeVirtualDelegate {
    constructor(remoteExplorerService) {
        this.remoteExplorerService = remoteExplorerService;
        this.headerRowHeight = 22;
    }
    getHeight(row) {
        return (row.tunnelType === TunnelType.Add && !this.remoteExplorerService.getEditableData(undefined)) ? 30 : 22;
    }
}
let TunnelViewModel = class TunnelViewModel {
    constructor(remoteExplorerService, tunnelService) {
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
        this._candidates = new Map();
        this.input = {
            label: nls.localize('remote.tunnelsView.addPort', "Add Port"),
            icon: undefined,
            tunnelType: TunnelType.Add,
            hasRunningProcess: false,
            remoteHost: '',
            remotePort: 0,
            processDescription: '',
            tooltipPostfix: '',
            iconTooltip: '',
            portTooltip: '',
            processTooltip: '',
            originTooltip: '',
            privacyTooltip: '',
            source: { source: TunnelSource.User, description: '' },
            protocol: TunnelProtocol.Http,
            privacy: {
                id: TunnelPrivacyId.Private,
                themeIcon: privatePortIcon.id,
                label: nls.localize('tunnelPrivacy.private', "Private")
            },
            strip: () => undefined
        };
        this.model = remoteExplorerService.tunnelModel;
        this.onForwardedPortsChanged = Event.any(this.model.onForwardPort, this.model.onClosePort, this.model.onPortName, this.model.onCandidatesChanged);
    }
    get all() {
        const result = [];
        this._candidates = new Map();
        this.model.candidates.forEach(candidate => {
            this._candidates.set(makeAddress(candidate.host, candidate.port), candidate);
        });
        if ((this.model.forwarded.size > 0) || this.remoteExplorerService.getEditableData(undefined)) {
            result.push(...this.forwarded);
        }
        if (this.model.detected.size > 0) {
            result.push(...this.detected);
        }
        result.push(this.input);
        return result;
    }
    addProcessInfoFromCandidate(tunnelItem) {
        const key = makeAddress(tunnelItem.remoteHost, tunnelItem.remotePort);
        if (this._candidates.has(key)) {
            tunnelItem.processDescription = this._candidates.get(key).detail;
        }
    }
    get forwarded() {
        const forwarded = Array.from(this.model.forwarded.values()).map(tunnel => {
            const tunnelItem = TunnelItem.createFromTunnel(this.remoteExplorerService, this.tunnelService, tunnel);
            this.addProcessInfoFromCandidate(tunnelItem);
            return tunnelItem;
        }).sort((a, b) => {
            if (a.remotePort === b.remotePort) {
                return a.remoteHost < b.remoteHost ? -1 : 1;
            }
            else {
                return a.remotePort < b.remotePort ? -1 : 1;
            }
        });
        return forwarded;
    }
    get detected() {
        return Array.from(this.model.detected.values()).map(tunnel => {
            const tunnelItem = TunnelItem.createFromTunnel(this.remoteExplorerService, this.tunnelService, tunnel, TunnelType.Detected, false);
            this.addProcessInfoFromCandidate(tunnelItem);
            return tunnelItem;
        });
    }
    isEmpty() {
        return (this.detected.length === 0) &&
            ((this.forwarded.length === 0) || (this.forwarded.length === 1 &&
                (this.forwarded[0].tunnelType === TunnelType.Add) && !this.remoteExplorerService.getEditableData(undefined)));
    }
};
TunnelViewModel = __decorate([
    __param(0, IRemoteExplorerService),
    __param(1, ITunnelService)
], TunnelViewModel);
export { TunnelViewModel };
function emptyCell(item) {
    return { label: '', tunnel: item, editId: TunnelEditId.None, tooltip: '' };
}
class IconColumn {
    constructor() {
        this.label = '';
        this.tooltip = '';
        this.weight = 1;
        this.minimumWidth = 40;
        this.maximumWidth = 40;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const icon = row.processDescription ? forwardedPortWithProcessIcon : forwardedPortWithoutProcessIcon;
        let tooltip = '';
        if (row instanceof TunnelItem) {
            tooltip = `${row.iconTooltip} ${row.tooltipPostfix}`;
        }
        return {
            label: '', icon, tunnel: row, editId: TunnelEditId.None, tooltip
        };
    }
}
class PortColumn {
    constructor() {
        this.label = nls.localize('tunnel.portColumn.label', "Port");
        this.tooltip = nls.localize('tunnel.portColumn.tooltip', "The label and remote port number of the forwarded port.");
        this.weight = 1;
        this.templateId = 'actionbar';
    }
    project(row) {
        const isAdd = row.tunnelType === TunnelType.Add;
        const label = row.label;
        let tooltip = '';
        if (row instanceof TunnelItem && !isAdd) {
            tooltip = `${row.portTooltip} ${row.tooltipPostfix}`;
        }
        else {
            tooltip = label;
        }
        return {
            label, tunnel: row, menuId: MenuId.TunnelPortInline,
            editId: row.tunnelType === TunnelType.Add ? TunnelEditId.New : TunnelEditId.Label, tooltip
        };
    }
}
class LocalAddressColumn {
    constructor() {
        this.label = nls.localize('tunnel.addressColumn.label', "Forwarded Address");
        this.tooltip = nls.localize('tunnel.addressColumn.tooltip', "The address that the forwarded port is available at.");
        this.weight = 1;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const label = row.localAddress ?? '';
        let tooltip = label;
        if (row instanceof TunnelItem) {
            tooltip = row.tooltipPostfix;
        }
        return {
            label,
            menuId: MenuId.TunnelLocalAddressInline,
            tunnel: row,
            editId: TunnelEditId.LocalPort,
            tooltip,
            markdownTooltip: label ? LocalAddressColumn.getHoverText(label) : undefined
        };
    }
    static getHoverText(localAddress) {
        return function (configurationService) {
            const editorConf = configurationService.getValue('editor');
            let clickLabel = '';
            if (editorConf.multiCursorModifier === 'ctrlCmd') {
                if (isMacintosh) {
                    clickLabel = nls.localize('portsLink.followLinkAlt.mac', "option + click");
                }
                else {
                    clickLabel = nls.localize('portsLink.followLinkAlt', "alt + click");
                }
            }
            else {
                if (isMacintosh) {
                    clickLabel = nls.localize('portsLink.followLinkCmd', "cmd + click");
                }
                else {
                    clickLabel = nls.localize('portsLink.followLinkCtrl', "ctrl + click");
                }
            }
            const markdown = new MarkdownString('', true);
            const uri = localAddress.startsWith('http') ? localAddress : `http://${localAddress}`;
            return markdown.appendLink(uri, 'Follow link').appendMarkdown(` (${clickLabel})`);
        };
    }
}
class RunningProcessColumn {
    constructor() {
        this.label = nls.localize('tunnel.processColumn.label', "Running Process");
        this.tooltip = nls.localize('tunnel.processColumn.tooltip', "The command line of the process that is using the port.");
        this.weight = 2;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const label = row.processDescription ?? '';
        return { label, tunnel: row, editId: TunnelEditId.None, tooltip: row instanceof TunnelItem ? row.processTooltip : '' };
    }
}
class OriginColumn {
    constructor() {
        this.label = nls.localize('tunnel.originColumn.label', "Origin");
        this.tooltip = nls.localize('tunnel.originColumn.tooltip', "The source that a forwarded port originates from. Can be an extension, user forwarded, statically forwarded, or automatically forwarded.");
        this.weight = 1;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const label = row.source.description;
        const tooltip = `${row instanceof TunnelItem ? row.originTooltip : ''}. ${row instanceof TunnelItem ? row.tooltipPostfix : ''}`;
        return { label, menuId: MenuId.TunnelOriginInline, tunnel: row, editId: TunnelEditId.None, tooltip };
    }
}
class PrivacyColumn {
    constructor() {
        this.label = nls.localize('tunnel.privacyColumn.label', "Visibility");
        this.tooltip = nls.localize('tunnel.privacyColumn.tooltip', "The availability of the forwarded port.");
        this.weight = 1;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const label = row.privacy?.label;
        let tooltip = '';
        if (row instanceof TunnelItem) {
            tooltip = `${row.privacy.label} ${row.tooltipPostfix}`;
        }
        return { label, tunnel: row, icon: { id: row.privacy.themeIcon }, editId: TunnelEditId.None, tooltip };
    }
}
let ActionBarRenderer = class ActionBarRenderer extends Disposable {
    constructor(instantiationService, contextKeyService, menuService, contextViewService, remoteExplorerService, commandService, configurationService) {
        super();
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.contextViewService = contextViewService;
        this.remoteExplorerService = remoteExplorerService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.templateId = 'actionbar';
        this._hoverDelegate = getDefaultHoverDelegate('mouse');
    }
    set actionRunner(actionRunner) {
        this._actionRunner = actionRunner;
    }
    renderTemplate(container) {
        const cell = dom.append(container, dom.$('.ports-view-actionbar-cell'));
        const icon = dom.append(cell, dom.$('.ports-view-actionbar-cell-icon'));
        const label = new IconLabel(cell, {
            supportHighlights: true,
            hoverDelegate: this._hoverDelegate
        });
        const actionsContainer = dom.append(cell, dom.$('.actions'));
        const actionBar = new ActionBar(actionsContainer, {
            actionViewItemProvider: createActionViewItem.bind(undefined, this.instantiationService),
            hoverDelegate: this._hoverDelegate
        });
        return { label, icon, actionBar, container: cell, elementDisposable: Disposable.None };
    }
    renderElement(element, index, templateData) {
        // reset
        templateData.actionBar.clear();
        templateData.icon.className = 'ports-view-actionbar-cell-icon';
        templateData.icon.style.display = 'none';
        templateData.label.setLabel('');
        templateData.label.element.style.display = 'none';
        templateData.container.style.height = '22px';
        if (templateData.button) {
            templateData.button.element.style.display = 'none';
            templateData.button.dispose();
        }
        templateData.container.style.paddingLeft = '0px';
        templateData.elementDisposable.dispose();
        let editableData;
        if (element.editId === TunnelEditId.New && (editableData = this.remoteExplorerService.getEditableData(undefined))) {
            this.renderInputBox(templateData.container, editableData);
        }
        else {
            editableData = this.remoteExplorerService.getEditableData(element.tunnel, element.editId);
            if (editableData) {
                this.renderInputBox(templateData.container, editableData);
            }
            else if ((element.tunnel.tunnelType === TunnelType.Add) && (element.menuId === MenuId.TunnelPortInline)) {
                this.renderButton(element, templateData);
            }
            else {
                this.renderActionBarItem(element, templateData);
            }
        }
    }
    renderButton(element, templateData) {
        templateData.container.style.paddingLeft = '7px';
        templateData.container.style.height = '28px';
        templateData.button = this._register(new Button(templateData.container, defaultButtonStyles));
        templateData.button.label = element.label;
        templateData.button.element.title = element.tooltip;
        this._register(templateData.button.onDidClick(() => {
            this.commandService.executeCommand(ForwardPortAction.INLINE_ID);
        }));
    }
    tunnelContext(tunnel) {
        let context;
        if (tunnel instanceof TunnelItem) {
            context = tunnel.strip();
        }
        if (!context) {
            context = {
                tunnelType: tunnel.tunnelType,
                remoteHost: tunnel.remoteHost,
                remotePort: tunnel.remotePort,
                localAddress: tunnel.localAddress,
                protocol: tunnel.protocol,
                localUri: tunnel.localUri,
                localPort: tunnel.localPort,
                name: tunnel.name,
                closeable: tunnel.closeable,
                source: tunnel.source,
                privacy: tunnel.privacy,
                processDescription: tunnel.processDescription,
                label: tunnel.label
            };
        }
        return context;
    }
    renderActionBarItem(element, templateData) {
        templateData.label.element.style.display = 'flex';
        templateData.label.setLabel(element.label, undefined, {
            title: element.markdownTooltip ?
                { markdown: element.markdownTooltip(this.configurationService), markdownNotSupportedFallback: element.tooltip }
                : element.tooltip,
            extraClasses: element.menuId === MenuId.TunnelLocalAddressInline ? ['ports-view-actionbar-cell-localaddress'] : undefined
        });
        templateData.actionBar.context = this.tunnelContext(element.tunnel);
        templateData.container.style.paddingLeft = '10px';
        const context = [
            ['view', TUNNEL_VIEW_ID],
            [TunnelTypeContextKey.key, element.tunnel.tunnelType],
            [TunnelCloseableContextKey.key, element.tunnel.closeable],
            [TunnelPrivacyContextKey.key, element.tunnel.privacy.id],
            [TunnelProtocolContextKey.key, element.tunnel.protocol]
        ];
        const contextKeyService = this.contextKeyService.createOverlay(context);
        const disposableStore = new DisposableStore();
        templateData.elementDisposable = disposableStore;
        if (element.menuId) {
            const menu = disposableStore.add(this.menuService.createMenu(element.menuId, contextKeyService));
            let actions = getFlatActionBarActions(menu.getActions({ shouldForwardArgs: true }));
            if (actions) {
                const labelActions = actions.filter(action => action.id.toLowerCase().indexOf('label') >= 0);
                if (labelActions.length > 1) {
                    labelActions.sort((a, b) => a.label.length - b.label.length);
                    labelActions.pop();
                    actions = actions.filter(action => labelActions.indexOf(action) < 0);
                }
                templateData.actionBar.push(actions, { icon: true, label: false });
                if (this._actionRunner) {
                    templateData.actionBar.actionRunner = this._actionRunner;
                }
            }
        }
        if (element.icon) {
            templateData.icon.className = `ports-view-actionbar-cell-icon ${ThemeIcon.asClassName(element.icon)}`;
            templateData.icon.title = element.tooltip;
            templateData.icon.style.display = 'inline';
        }
    }
    renderInputBox(container, editableData) {
        // Required for FireFox. The blur event doesn't fire on FireFox when you just mash the "+" button to forward a port.
        if (this.inputDone) {
            this.inputDone(false, false);
            this.inputDone = undefined;
        }
        container.style.paddingLeft = '5px';
        const value = editableData.startingValue || '';
        const inputBox = new InputBox(container, this.contextViewService, {
            ariaLabel: nls.localize('remote.tunnelsView.input', "Press Enter to confirm or Escape to cancel."),
            validationOptions: {
                validation: (value) => {
                    const message = editableData.validationMessage(value);
                    if (!message) {
                        return null;
                    }
                    return {
                        content: message.content,
                        formatContent: true,
                        type: message.severity === Severity.Error ? 3 /* MessageType.ERROR */ : 1 /* MessageType.INFO */
                    };
                }
            },
            placeholder: editableData.placeholder || '',
            inputBoxStyles: defaultInputBoxStyles
        });
        inputBox.value = value;
        inputBox.focus();
        inputBox.select({ start: 0, end: editableData.startingValue ? editableData.startingValue.length : 0 });
        const done = createSingleCallFunction(async (success, finishEditing) => {
            dispose(toDispose);
            if (this.inputDone) {
                this.inputDone = undefined;
            }
            inputBox.element.style.display = 'none';
            const inputValue = inputBox.value;
            if (finishEditing) {
                return editableData.onFinish(inputValue, success);
            }
        });
        this.inputDone = done;
        const toDispose = [
            inputBox,
            dom.addStandardDisposableListener(inputBox.inputElement, dom.EventType.KEY_DOWN, async (e) => {
                if (e.equals(3 /* KeyCode.Enter */)) {
                    e.stopPropagation();
                    if (inputBox.validate() !== 3 /* MessageType.ERROR */) {
                        return done(true, true);
                    }
                    else {
                        return done(false, true);
                    }
                }
                else if (e.equals(9 /* KeyCode.Escape */)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return done(false, true);
                }
            }),
            dom.addDisposableListener(inputBox.inputElement, dom.EventType.BLUR, () => {
                return done(inputBox.validate() !== 3 /* MessageType.ERROR */, true);
            })
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposable.dispose();
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
        templateData.actionBar.dispose();
        templateData.elementDisposable.dispose();
        templateData.button?.dispose();
    }
};
ActionBarRenderer = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IMenuService),
    __param(3, IContextViewService),
    __param(4, IRemoteExplorerService),
    __param(5, ICommandService),
    __param(6, IConfigurationService)
], ActionBarRenderer);
class TunnelItem {
    static createFromTunnel(remoteExplorerService, tunnelService, tunnel, type = TunnelType.Forwarded, closeable) {
        return new TunnelItem(type, tunnel.remoteHost, tunnel.remotePort, tunnel.source, !!tunnel.hasRunningProcess, tunnel.protocol, tunnel.localUri, tunnel.localAddress, tunnel.localPort, closeable === undefined ? tunnel.closeable : closeable, tunnel.name, tunnel.runningProcess, tunnel.pid, tunnel.privacy, remoteExplorerService, tunnelService);
    }
    /**
     * Removes all non-serializable properties from the tunnel
     * @returns A new TunnelItem without any services
     */
    strip() {
        return new TunnelItem(this.tunnelType, this.remoteHost, this.remotePort, this.source, this.hasRunningProcess, this.protocol, this.localUri, this.localAddress, this.localPort, this.closeable, this.name, this.runningProcess, this.pid, this._privacy);
    }
    constructor(tunnelType, remoteHost, remotePort, source, hasRunningProcess, protocol, localUri, localAddress, localPort, closeable, name, runningProcess, pid, _privacy, remoteExplorerService, tunnelService) {
        this.tunnelType = tunnelType;
        this.remoteHost = remoteHost;
        this.remotePort = remotePort;
        this.source = source;
        this.hasRunningProcess = hasRunningProcess;
        this.protocol = protocol;
        this.localUri = localUri;
        this.localAddress = localAddress;
        this.localPort = localPort;
        this.closeable = closeable;
        this.name = name;
        this.runningProcess = runningProcess;
        this.pid = pid;
        this._privacy = _privacy;
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
    }
    get label() {
        if (this.tunnelType === TunnelType.Add && this.name) {
            return this.name;
        }
        const portNumberLabel = (isLocalhost(this.remoteHost) || isAllInterfaces(this.remoteHost))
            ? `${this.remotePort}`
            : `${this.remoteHost}:${this.remotePort}`;
        if (this.name) {
            return `${this.name} (${portNumberLabel})`;
        }
        else {
            return portNumberLabel;
        }
    }
    set processDescription(description) {
        this.runningProcess = description;
    }
    get processDescription() {
        let description = '';
        if (this.runningProcess) {
            if (this.pid && this.remoteExplorerService?.namedProcesses.has(this.pid)) {
                // This is a known process. Give it a friendly name.
                description = this.remoteExplorerService.namedProcesses.get(this.pid);
            }
            else {
                description = this.runningProcess.replace(/\0/g, ' ').trim();
            }
            if (this.pid) {
                description += ` (${this.pid})`;
            }
        }
        else if (this.hasRunningProcess) {
            description = nls.localize('tunnelView.runningProcess.inacessable', "Process information unavailable");
        }
        return description;
    }
    get tooltipPostfix() {
        let information;
        if (this.localAddress) {
            information = nls.localize('remote.tunnel.tooltipForwarded', "Remote port {0}:{1} forwarded to local address {2}. ", this.remoteHost, this.remotePort, this.localAddress);
        }
        else {
            information = nls.localize('remote.tunnel.tooltipCandidate', "Remote port {0}:{1} not forwarded. ", this.remoteHost, this.remotePort);
        }
        return information;
    }
    get iconTooltip() {
        const isAdd = this.tunnelType === TunnelType.Add;
        if (!isAdd) {
            return `${this.processDescription ? nls.localize('tunnel.iconColumn.running', "Port has running process.") :
                nls.localize('tunnel.iconColumn.notRunning', "No running process.")}`;
        }
        else {
            return this.label;
        }
    }
    get portTooltip() {
        const isAdd = this.tunnelType === TunnelType.Add;
        if (!isAdd) {
            return `${this.name ? nls.localize('remote.tunnel.tooltipName', "Port labeled {0}. ", this.name) : ''}`;
        }
        else {
            return '';
        }
    }
    get processTooltip() {
        return this.processDescription ?? '';
    }
    get originTooltip() {
        return this.source.description;
    }
    get privacy() {
        if (this.tunnelService?.privacyOptions) {
            return this.tunnelService?.privacyOptions.find(element => element.id === this._privacy) ??
                {
                    id: '',
                    themeIcon: Codicon.question.id,
                    label: nls.localize('tunnelPrivacy.unknown', "Unknown")
                };
        }
        else {
            return {
                id: TunnelPrivacyId.Private,
                themeIcon: privatePortIcon.id,
                label: nls.localize('tunnelPrivacy.private', "Private")
            };
        }
    }
}
const TunnelTypeContextKey = new RawContextKey('tunnelType', TunnelType.Add, true);
const TunnelCloseableContextKey = new RawContextKey('tunnelCloseable', false, true);
const TunnelPrivacyContextKey = new RawContextKey('tunnelPrivacy', undefined, true);
const TunnelPrivacyEnabledContextKey = new RawContextKey('tunnelPrivacyEnabled', false, true);
const TunnelProtocolContextKey = new RawContextKey('tunnelProtocol', TunnelProtocol.Http, true);
const TunnelViewFocusContextKey = new RawContextKey('tunnelViewFocus', false, nls.localize('tunnel.focusContext', "Whether the Ports view has focus."));
const TunnelViewSelectionKeyName = 'tunnelViewSelection';
// host:port
const TunnelViewSelectionContextKey = new RawContextKey(TunnelViewSelectionKeyName, undefined, true);
const TunnelViewMultiSelectionKeyName = 'tunnelViewMultiSelection';
// host:port[]
const TunnelViewMultiSelectionContextKey = new RawContextKey(TunnelViewMultiSelectionKeyName, undefined, true);
const PortChangableContextKey = new RawContextKey('portChangable', false, true);
const ProtocolChangeableContextKey = new RawContextKey('protocolChangable', true, true);
let TunnelPanel = class TunnelPanel extends ViewPane {
    static { TunnelPanel_1 = this; }
    static { this.ID = TUNNEL_VIEW_ID; }
    static { this.TITLE = nls.localize2('remote.tunnel', "Ports"); }
    constructor(viewModel, options, keybindingService, contextMenuService, contextKeyService, configurationService, instantiationService, viewDescriptorService, openerService, quickInputService, commandService, menuService, themeService, remoteExplorerService, hoverService, tunnelService, contextViewService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.viewModel = viewModel;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.menuService = menuService;
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
        this.contextViewService = contextViewService;
        this.tableDisposables = this._register(new DisposableStore());
        this.isEditing = false;
        // TODO: Should this be removed?
        //@ts-expect-error
        this.titleActions = [];
        this.lastFocus = [];
        this.height = 0;
        this.width = 0;
        this.tunnelTypeContext = TunnelTypeContextKey.bindTo(contextKeyService);
        this.tunnelCloseableContext = TunnelCloseableContextKey.bindTo(contextKeyService);
        this.tunnelPrivacyContext = TunnelPrivacyContextKey.bindTo(contextKeyService);
        this.tunnelPrivacyEnabledContext = TunnelPrivacyEnabledContextKey.bindTo(contextKeyService);
        this.tunnelPrivacyEnabledContext.set(tunnelService.canChangePrivacy);
        this.protocolChangableContextKey = ProtocolChangeableContextKey.bindTo(contextKeyService);
        this.protocolChangableContextKey.set(tunnelService.canChangeProtocol);
        this.tunnelProtocolContext = TunnelProtocolContextKey.bindTo(contextKeyService);
        this.tunnelViewFocusContext = TunnelViewFocusContextKey.bindTo(contextKeyService);
        this.tunnelViewSelectionContext = TunnelViewSelectionContextKey.bindTo(contextKeyService);
        this.tunnelViewMultiSelectionContext = TunnelViewMultiSelectionContextKey.bindTo(contextKeyService);
        this.portChangableContextKey = PortChangableContextKey.bindTo(contextKeyService);
        const overlayContextKeyService = this.contextKeyService.createOverlay([['view', TunnelPanel_1.ID]]);
        const titleMenu = this._register(this.menuService.createMenu(MenuId.TunnelTitle, overlayContextKeyService));
        const updateActions = () => {
            this.titleActions = getFlatActionBarActions(titleMenu.getActions());
            this.updateActions();
        };
        this._register(titleMenu.onDidChange(updateActions));
        updateActions();
        this._register(toDisposable(() => {
            this.titleActions = [];
        }));
        this.registerPrivacyActions();
        this._register(Event.once(this.tunnelService.onAddedTunnelProvider)(() => {
            let updated = false;
            if (this.tunnelPrivacyEnabledContext.get() === false) {
                this.tunnelPrivacyEnabledContext.set(tunnelService.canChangePrivacy);
                updated = true;
            }
            if (this.protocolChangableContextKey.get() === true) {
                this.protocolChangableContextKey.set(tunnelService.canChangeProtocol);
                updated = true;
            }
            if (updated) {
                updateActions();
                this.registerPrivacyActions();
                this.createTable();
                this.table?.layout(this.height, this.width);
            }
        }));
    }
    registerPrivacyActions() {
        for (const privacyOption of this.tunnelService.privacyOptions) {
            const optionId = `remote.tunnel.privacy${privacyOption.id}`;
            CommandsRegistry.registerCommand(optionId, ChangeTunnelPrivacyAction.handler(privacyOption.id));
            MenuRegistry.appendMenuItem(MenuId.TunnelPrivacy, ({
                order: 0,
                command: {
                    id: optionId,
                    title: privacyOption.label,
                    toggled: TunnelPrivacyContextKey.isEqualTo(privacyOption.id)
                }
            }));
        }
    }
    get portCount() {
        return this.remoteExplorerService.tunnelModel.forwarded.size + this.remoteExplorerService.tunnelModel.detected.size;
    }
    createTable() {
        if (!this.panelContainer) {
            return;
        }
        this.tableDisposables.clear();
        dom.clearNode(this.panelContainer);
        const widgetContainer = dom.append(this.panelContainer, dom.$('.customview-tree'));
        widgetContainer.classList.add('ports-view');
        widgetContainer.classList.add('file-icon-themable-tree', 'show-file-icons');
        const actionBarRenderer = new ActionBarRenderer(this.instantiationService, this.contextKeyService, this.menuService, this.contextViewService, this.remoteExplorerService, this.commandService, this.configurationService);
        const columns = [new IconColumn(), new PortColumn(), new LocalAddressColumn(), new RunningProcessColumn()];
        if (this.tunnelService.canChangePrivacy) {
            columns.push(new PrivacyColumn());
        }
        columns.push(new OriginColumn());
        this.table = this.instantiationService.createInstance(WorkbenchTable, 'RemoteTunnels', widgetContainer, new TunnelTreeVirtualDelegate(this.remoteExplorerService), columns, [actionBarRenderer], {
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (item) => {
                    return item.label;
                }
            },
            multipleSelectionSupport: true,
            accessibilityProvider: {
                getAriaLabel: (item) => {
                    if (item instanceof TunnelItem) {
                        return `${item.tooltipPostfix} ${item.portTooltip} ${item.iconTooltip} ${item.processTooltip} ${item.originTooltip} ${this.tunnelService.canChangePrivacy ? item.privacy.label : ''}`;
                    }
                    else {
                        return item.label;
                    }
                },
                getWidgetAriaLabel: () => nls.localize('tunnelView', "Tunnel View")
            },
            openOnSingleClick: true
        });
        const actionRunner = this.tableDisposables.add(new ActionRunner());
        actionBarRenderer.actionRunner = actionRunner;
        this.tableDisposables.add(this.table);
        this.tableDisposables.add(this.table.onContextMenu(e => this.onContextMenu(e, actionRunner)));
        this.tableDisposables.add(this.table.onMouseDblClick(e => this.onMouseDblClick(e)));
        this.tableDisposables.add(this.table.onDidChangeFocus(e => this.onFocusChanged(e)));
        this.tableDisposables.add(this.table.onDidChangeSelection(e => this.onSelectionChanged(e)));
        this.tableDisposables.add(this.table.onDidFocus(() => this.tunnelViewFocusContext.set(true)));
        this.tableDisposables.add(this.table.onDidBlur(() => this.tunnelViewFocusContext.set(false)));
        const rerender = () => this.table?.splice(0, Number.POSITIVE_INFINITY, this.viewModel.all);
        rerender();
        let lastPortCount = this.portCount;
        this.tableDisposables.add(Event.debounce(this.viewModel.onForwardedPortsChanged, (_last, e) => e, 50)(() => {
            const newPortCount = this.portCount;
            if (((lastPortCount === 0) || (newPortCount === 0)) && (lastPortCount !== newPortCount)) {
                this._onDidChangeViewWelcomeState.fire();
            }
            lastPortCount = newPortCount;
            rerender();
        }));
        this.tableDisposables.add(this.table.onMouseClick(e => {
            if (this.hasOpenLinkModifier(e.browserEvent) && this.table) {
                const selection = this.table.getSelectedElements();
                if ((selection.length === 0) ||
                    ((selection.length === 1) && (selection[0] === e.element))) {
                    this.commandService.executeCommand(OpenPortInBrowserAction.ID, e.element);
                }
            }
        }));
        this.tableDisposables.add(this.table.onDidOpen(e => {
            if (!e.element || (e.element.tunnelType !== TunnelType.Forwarded)) {
                return;
            }
            if (e.browserEvent?.type === 'dblclick') {
                this.commandService.executeCommand(LabelTunnelAction.ID);
            }
        }));
        this.tableDisposables.add(this.remoteExplorerService.onDidChangeEditable(e => {
            this.isEditing = !!this.remoteExplorerService.getEditableData(e?.tunnel, e?.editId);
            this._onDidChangeViewWelcomeState.fire();
            if (!this.isEditing) {
                widgetContainer.classList.remove('highlight');
            }
            rerender();
            if (this.isEditing) {
                widgetContainer.classList.add('highlight');
                if (!e) {
                    // When we are in editing mode for a new forward, rather than updating an existing one we need to reveal the input box since it might be out of view.
                    this.table?.reveal(this.table.indexOf(this.viewModel.input));
                }
            }
            else {
                if (e && (e.tunnel.tunnelType !== TunnelType.Add)) {
                    this.table?.setFocus(this.lastFocus);
                }
                this.focus();
            }
        }));
    }
    renderBody(container) {
        super.renderBody(container);
        this.panelContainer = dom.append(container, dom.$('.tree-explorer-viewlet-tree-view'));
        this.createTable();
    }
    shouldShowWelcome() {
        return this.viewModel.isEmpty() && !this.isEditing;
    }
    focus() {
        super.focus();
        this.table?.domFocus();
    }
    onFocusChanged(event) {
        if (event.indexes.length > 0 && event.elements.length > 0) {
            this.lastFocus = [...event.indexes];
        }
        const elements = event.elements;
        const item = elements && elements.length ? elements[0] : undefined;
        if (item) {
            this.tunnelViewSelectionContext.set(makeAddress(item.remoteHost, item.remotePort));
            this.tunnelTypeContext.set(item.tunnelType);
            this.tunnelCloseableContext.set(!!item.closeable);
            this.tunnelPrivacyContext.set(item.privacy.id);
            this.tunnelProtocolContext.set(item.protocol === TunnelProtocol.Https ? TunnelProtocol.Https : TunnelProtocol.Https);
            this.portChangableContextKey.set(!!item.localPort);
        }
        else {
            this.tunnelTypeContext.reset();
            this.tunnelViewSelectionContext.reset();
            this.tunnelCloseableContext.reset();
            this.tunnelPrivacyContext.reset();
            this.tunnelProtocolContext.reset();
            this.portChangableContextKey.reset();
        }
    }
    hasOpenLinkModifier(e) {
        const editorConf = this.configurationService.getValue('editor');
        let modifierKey = false;
        if (editorConf.multiCursorModifier === 'ctrlCmd') {
            modifierKey = e.altKey;
        }
        else {
            if (isMacintosh) {
                modifierKey = e.metaKey;
            }
            else {
                modifierKey = e.ctrlKey;
            }
        }
        return modifierKey;
    }
    onSelectionChanged(event) {
        const elements = event.elements;
        if (elements.length > 1) {
            this.tunnelViewMultiSelectionContext.set(elements.map(element => makeAddress(element.remoteHost, element.remotePort)));
        }
        else {
            this.tunnelViewMultiSelectionContext.set(undefined);
        }
    }
    onContextMenu(event, actionRunner) {
        if ((event.element !== undefined) && !(event.element instanceof TunnelItem)) {
            return;
        }
        event.browserEvent.preventDefault();
        event.browserEvent.stopPropagation();
        const node = event.element;
        if (node) {
            this.table?.setFocus([this.table.indexOf(node)]);
            this.tunnelTypeContext.set(node.tunnelType);
            this.tunnelCloseableContext.set(!!node.closeable);
            this.tunnelPrivacyContext.set(node.privacy.id);
            this.tunnelProtocolContext.set(node.protocol);
            this.portChangableContextKey.set(!!node.localPort);
        }
        else {
            this.tunnelTypeContext.set(TunnelType.Add);
            this.tunnelCloseableContext.set(false);
            this.tunnelPrivacyContext.set(undefined);
            this.tunnelProtocolContext.set(undefined);
            this.portChangableContextKey.set(false);
        }
        this.contextMenuService.showContextMenu({
            menuId: MenuId.TunnelContext,
            menuActionOptions: { shouldForwardArgs: true },
            contextKeyService: this.table?.contextKeyService,
            getAnchor: () => event.anchor,
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, { label: true, keybinding: keybinding.getLabel() });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.table?.domFocus();
                }
            },
            getActionsContext: () => node?.strip(),
            actionRunner
        });
    }
    onMouseDblClick(e) {
        if (!e.element) {
            this.commandService.executeCommand(ForwardPortAction.INLINE_ID);
        }
    }
    layoutBody(height, width) {
        this.height = height;
        this.width = width;
        super.layoutBody(height, width);
        this.table?.layout(height, width);
    }
};
TunnelPanel = TunnelPanel_1 = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IContextKeyService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IViewDescriptorService),
    __param(8, IOpenerService),
    __param(9, IQuickInputService),
    __param(10, ICommandService),
    __param(11, IMenuService),
    __param(12, IThemeService),
    __param(13, IRemoteExplorerService),
    __param(14, IHoverService),
    __param(15, ITunnelService),
    __param(16, IContextViewService)
], TunnelPanel);
export { TunnelPanel };
export class TunnelPanelDescriptor {
    constructor(viewModel, environmentService) {
        this.id = TunnelPanel.ID;
        this.name = TunnelPanel.TITLE;
        this.canToggleVisibility = true;
        this.hideByDefault = false;
        // group is not actually used for views that are not extension contributed. Use order instead.
        this.group = 'details@0';
        // -500 comes from the remote explorer viewOrderDelegate
        this.order = -500;
        this.canMoveView = true;
        this.containerIcon = portsViewIcon;
        this.ctorDescriptor = new SyncDescriptor(TunnelPanel, [viewModel]);
        this.remoteAuthority = environmentService.remoteAuthority ? environmentService.remoteAuthority.split('+')[0] : undefined;
    }
}
function isITunnelItem(item) {
    return item && item.tunnelType && item.remoteHost && item.source;
}
var LabelTunnelAction;
(function (LabelTunnelAction) {
    LabelTunnelAction.ID = 'remote.tunnel.label';
    LabelTunnelAction.LABEL = nls.localize('remote.tunnel.label', "Set Port Label");
    LabelTunnelAction.COMMAND_ID_KEYWORD = 'label';
    function handler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            let tunnelContext;
            if (isITunnelItem(arg)) {
                tunnelContext = arg;
            }
            else {
                const context = accessor.get(IContextKeyService).getContextKeyValue(TunnelViewSelectionKeyName);
                const tunnel = context ? remoteExplorerService.tunnelModel.forwarded.get(context) : undefined;
                if (tunnel) {
                    const tunnelService = accessor.get(ITunnelService);
                    tunnelContext = TunnelItem.createFromTunnel(remoteExplorerService, tunnelService, tunnel);
                }
            }
            if (tunnelContext) {
                const tunnelItem = tunnelContext;
                return new Promise(resolve => {
                    const startingValue = tunnelItem.name ? tunnelItem.name : `${tunnelItem.remotePort}`;
                    remoteExplorerService.setEditable(tunnelItem, TunnelEditId.Label, {
                        onFinish: async (value, success) => {
                            value = value.trim();
                            remoteExplorerService.setEditable(tunnelItem, TunnelEditId.Label, null);
                            const changed = success && (value !== startingValue);
                            if (changed) {
                                await remoteExplorerService.tunnelModel.name(tunnelItem.remoteHost, tunnelItem.remotePort, value);
                            }
                            resolve(changed ? { port: tunnelItem.remotePort, label: value } : undefined);
                        },
                        validationMessage: () => null,
                        placeholder: nls.localize('remote.tunnelsView.labelPlaceholder', "Port label"),
                        startingValue
                    });
                });
            }
            return undefined;
        };
    }
    LabelTunnelAction.handler = handler;
})(LabelTunnelAction || (LabelTunnelAction = {}));
const invalidPortString = nls.localize('remote.tunnelsView.portNumberValid', "Forwarded port should be a number or a host:port.");
const maxPortNumber = 65536;
const invalidPortNumberString = nls.localize('remote.tunnelsView.portNumberToHigh', "Port number must be \u2265 0 and < {0}.", maxPortNumber);
const requiresSudoString = nls.localize('remote.tunnelView.inlineElevationMessage', "May Require Sudo");
const alreadyForwarded = nls.localize('remote.tunnelView.alreadyForwarded', "Port is already forwarded");
export var ForwardPortAction;
(function (ForwardPortAction) {
    ForwardPortAction.INLINE_ID = 'remote.tunnel.forwardInline';
    ForwardPortAction.COMMANDPALETTE_ID = 'remote.tunnel.forwardCommandPalette';
    ForwardPortAction.LABEL = nls.localize2('remote.tunnel.forward', "Forward a Port");
    ForwardPortAction.TREEITEM_LABEL = nls.localize('remote.tunnel.forwardItem', "Forward Port");
    const forwardPrompt = nls.localize('remote.tunnel.forwardPrompt', "Port number or address (eg. 3000 or 10.10.10.10:2000).");
    function validateInput(remoteExplorerService, tunnelService, value, canElevate) {
        const parsed = parseAddress(value);
        if (!parsed) {
            return { content: invalidPortString, severity: Severity.Error };
        }
        else if (parsed.port >= maxPortNumber) {
            return { content: invalidPortNumberString, severity: Severity.Error };
        }
        else if (canElevate && tunnelService.isPortPrivileged(parsed.port)) {
            return { content: requiresSudoString, severity: Severity.Info };
        }
        else if (mapHasAddressLocalhostOrAllInterfaces(remoteExplorerService.tunnelModel.forwarded, parsed.host, parsed.port)) {
            return { content: alreadyForwarded, severity: Severity.Error };
        }
        return null;
    }
    function error(notificationService, tunnelOrError, host, port) {
        if (!tunnelOrError) {
            notificationService.warn(nls.localize('remote.tunnel.forwardError', "Unable to forward {0}:{1}. The host may not be available or that remote port may already be forwarded", host, port));
        }
        else if (typeof tunnelOrError === 'string') {
            notificationService.warn(nls.localize('remote.tunnel.forwardErrorProvided', "Unable to forward {0}:{1}. {2}", host, port, tunnelOrError));
        }
    }
    function inlineHandler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const notificationService = accessor.get(INotificationService);
            const tunnelService = accessor.get(ITunnelService);
            remoteExplorerService.setEditable(undefined, TunnelEditId.New, {
                onFinish: async (value, success) => {
                    remoteExplorerService.setEditable(undefined, TunnelEditId.New, null);
                    let parsed;
                    if (success && (parsed = parseAddress(value))) {
                        remoteExplorerService.forward({
                            remote: { host: parsed.host, port: parsed.port },
                            elevateIfNeeded: true
                        }).then(tunnelOrError => error(notificationService, tunnelOrError, parsed.host, parsed.port));
                    }
                },
                validationMessage: (value) => validateInput(remoteExplorerService, tunnelService, value, tunnelService.canElevate),
                placeholder: forwardPrompt
            });
        };
    }
    ForwardPortAction.inlineHandler = inlineHandler;
    function commandPaletteHandler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const notificationService = accessor.get(INotificationService);
            const viewsService = accessor.get(IViewsService);
            const quickInputService = accessor.get(IQuickInputService);
            const tunnelService = accessor.get(ITunnelService);
            await viewsService.openView(TunnelPanel.ID, true);
            const value = await quickInputService.input({
                prompt: forwardPrompt,
                validateInput: (value) => Promise.resolve(validateInput(remoteExplorerService, tunnelService, value, tunnelService.canElevate))
            });
            let parsed;
            if (value && (parsed = parseAddress(value))) {
                remoteExplorerService.forward({
                    remote: { host: parsed.host, port: parsed.port },
                    elevateIfNeeded: true
                }).then(tunnel => error(notificationService, tunnel, parsed.host, parsed.port));
            }
        };
    }
    ForwardPortAction.commandPaletteHandler = commandPaletteHandler;
})(ForwardPortAction || (ForwardPortAction = {}));
function makeTunnelPicks(tunnels, remoteExplorerService, tunnelService) {
    const picks = tunnels.map(forwarded => {
        const item = TunnelItem.createFromTunnel(remoteExplorerService, tunnelService, forwarded);
        return {
            label: item.label,
            description: item.processDescription,
            tunnel: item
        };
    });
    if (picks.length === 0) {
        picks.push({
            label: nls.localize('remote.tunnel.closeNoPorts', "No ports currently forwarded. Try running the {0} command", ForwardPortAction.LABEL.value)
        });
    }
    return picks;
}
var ClosePortAction;
(function (ClosePortAction) {
    ClosePortAction.INLINE_ID = 'remote.tunnel.closeInline';
    ClosePortAction.COMMANDPALETTE_ID = 'remote.tunnel.closeCommandPalette';
    ClosePortAction.LABEL = nls.localize2('remote.tunnel.close', "Stop Forwarding Port");
    function inlineHandler() {
        return async (accessor, arg) => {
            const contextKeyService = accessor.get(IContextKeyService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            let ports = [];
            const multiSelectContext = contextKeyService.getContextKeyValue(TunnelViewMultiSelectionKeyName);
            if (multiSelectContext) {
                multiSelectContext.forEach(context => {
                    const tunnel = remoteExplorerService.tunnelModel.forwarded.get(context);
                    if (tunnel) {
                        ports?.push(tunnel);
                    }
                });
            }
            else if (isITunnelItem(arg)) {
                ports = [arg];
            }
            else {
                const context = contextKeyService.getContextKeyValue(TunnelViewSelectionKeyName);
                const tunnel = context ? remoteExplorerService.tunnelModel.forwarded.get(context) : undefined;
                if (tunnel) {
                    ports = [tunnel];
                }
            }
            if (!ports || ports.length === 0) {
                return;
            }
            return Promise.all(ports.map(port => remoteExplorerService.close({ host: port.remoteHost, port: port.remotePort }, TunnelCloseReason.User)));
        };
    }
    ClosePortAction.inlineHandler = inlineHandler;
    function commandPaletteHandler() {
        return async (accessor) => {
            const quickInputService = accessor.get(IQuickInputService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const tunnelService = accessor.get(ITunnelService);
            const commandService = accessor.get(ICommandService);
            const picks = makeTunnelPicks(Array.from(remoteExplorerService.tunnelModel.forwarded.values()).filter(tunnel => tunnel.closeable), remoteExplorerService, tunnelService);
            const result = await quickInputService.pick(picks, { placeHolder: nls.localize('remote.tunnel.closePlaceholder', "Choose a port to stop forwarding") });
            if (result && result.tunnel) {
                await remoteExplorerService.close({ host: result.tunnel.remoteHost, port: result.tunnel.remotePort }, TunnelCloseReason.User);
            }
            else if (result) {
                await commandService.executeCommand(ForwardPortAction.COMMANDPALETTE_ID);
            }
        };
    }
    ClosePortAction.commandPaletteHandler = commandPaletteHandler;
})(ClosePortAction || (ClosePortAction = {}));
export var OpenPortInBrowserAction;
(function (OpenPortInBrowserAction) {
    OpenPortInBrowserAction.ID = 'remote.tunnel.open';
    OpenPortInBrowserAction.LABEL = nls.localize('remote.tunnel.open', "Open in Browser");
    function handler() {
        return async (accessor, arg) => {
            let key;
            if (isITunnelItem(arg)) {
                key = makeAddress(arg.remoteHost, arg.remotePort);
            }
            else if (arg.tunnelRemoteHost && arg.tunnelRemotePort) {
                key = makeAddress(arg.tunnelRemoteHost, arg.tunnelRemotePort);
            }
            if (key) {
                const model = accessor.get(IRemoteExplorerService).tunnelModel;
                const openerService = accessor.get(IOpenerService);
                return run(model, openerService, key);
            }
        };
    }
    OpenPortInBrowserAction.handler = handler;
    function run(model, openerService, key) {
        const tunnel = model.forwarded.get(key) || model.detected.get(key);
        if (tunnel) {
            return openerService.open(tunnel.localUri, { allowContributedOpeners: false });
        }
        return Promise.resolve();
    }
    OpenPortInBrowserAction.run = run;
})(OpenPortInBrowserAction || (OpenPortInBrowserAction = {}));
export var OpenPortInPreviewAction;
(function (OpenPortInPreviewAction) {
    OpenPortInPreviewAction.ID = 'remote.tunnel.openPreview';
    OpenPortInPreviewAction.LABEL = nls.localize('remote.tunnel.openPreview', "Preview in Editor");
    function handler() {
        return async (accessor, arg) => {
            let key;
            if (isITunnelItem(arg)) {
                key = makeAddress(arg.remoteHost, arg.remotePort);
            }
            else if (arg.tunnelRemoteHost && arg.tunnelRemotePort) {
                key = makeAddress(arg.tunnelRemoteHost, arg.tunnelRemotePort);
            }
            if (key) {
                const model = accessor.get(IRemoteExplorerService).tunnelModel;
                const openerService = accessor.get(IOpenerService);
                const externalOpenerService = accessor.get(IExternalUriOpenerService);
                return run(model, openerService, externalOpenerService, key);
            }
        };
    }
    OpenPortInPreviewAction.handler = handler;
    async function run(model, openerService, externalOpenerService, key) {
        const tunnel = model.forwarded.get(key) || model.detected.get(key);
        if (tunnel) {
            const remoteHost = tunnel.remoteHost.includes(':') ? `[${tunnel.remoteHost}]` : tunnel.remoteHost;
            const sourceUri = URI.parse(`http://${remoteHost}:${tunnel.remotePort}`);
            const opener = await externalOpenerService.getOpener(tunnel.localUri, { sourceUri }, CancellationToken.None);
            if (opener) {
                return opener.openExternalUri(tunnel.localUri, { sourceUri }, CancellationToken.None);
            }
            return openerService.open(tunnel.localUri);
        }
        return Promise.resolve();
    }
    OpenPortInPreviewAction.run = run;
})(OpenPortInPreviewAction || (OpenPortInPreviewAction = {}));
var OpenPortInBrowserCommandPaletteAction;
(function (OpenPortInBrowserCommandPaletteAction) {
    OpenPortInBrowserCommandPaletteAction.ID = 'remote.tunnel.openCommandPalette';
    OpenPortInBrowserCommandPaletteAction.LABEL = nls.localize('remote.tunnel.openCommandPalette', "Open Port in Browser");
    function handler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const tunnelService = accessor.get(ITunnelService);
            const model = remoteExplorerService.tunnelModel;
            const quickPickService = accessor.get(IQuickInputService);
            const openerService = accessor.get(IOpenerService);
            const commandService = accessor.get(ICommandService);
            const options = [...model.forwarded, ...model.detected].map(value => {
                const tunnelItem = TunnelItem.createFromTunnel(remoteExplorerService, tunnelService, value[1]);
                return {
                    label: tunnelItem.label,
                    description: tunnelItem.processDescription,
                    tunnel: tunnelItem
                };
            });
            if (options.length === 0) {
                options.push({
                    label: nls.localize('remote.tunnel.openCommandPaletteNone', "No ports currently forwarded. Open the Ports view to get started.")
                });
            }
            else {
                options.push({
                    label: nls.localize('remote.tunnel.openCommandPaletteView', "Open the Ports view...")
                });
            }
            const picked = await quickPickService.pick(options, { placeHolder: nls.localize('remote.tunnel.openCommandPalettePick', "Choose the port to open") });
            if (picked && picked.tunnel) {
                return OpenPortInBrowserAction.run(model, openerService, makeAddress(picked.tunnel.remoteHost, picked.tunnel.remotePort));
            }
            else if (picked) {
                return commandService.executeCommand(`${TUNNEL_VIEW_ID}.focus`);
            }
        };
    }
    OpenPortInBrowserCommandPaletteAction.handler = handler;
})(OpenPortInBrowserCommandPaletteAction || (OpenPortInBrowserCommandPaletteAction = {}));
var CopyAddressAction;
(function (CopyAddressAction) {
    CopyAddressAction.INLINE_ID = 'remote.tunnel.copyAddressInline';
    CopyAddressAction.COMMANDPALETTE_ID = 'remote.tunnel.copyAddressCommandPalette';
    CopyAddressAction.INLINE_LABEL = nls.localize('remote.tunnel.copyAddressInline', "Copy Local Address");
    CopyAddressAction.COMMANDPALETTE_LABEL = nls.localize('remote.tunnel.copyAddressCommandPalette', "Copy Forwarded Port Address");
    async function copyAddress(remoteExplorerService, clipboardService, tunnelItem) {
        const address = remoteExplorerService.tunnelModel.address(tunnelItem.remoteHost, tunnelItem.remotePort);
        if (address) {
            await clipboardService.writeText(address.toString());
        }
    }
    function inlineHandler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            let tunnelItem;
            if (isITunnelItem(arg)) {
                tunnelItem = arg;
            }
            else {
                const context = accessor.get(IContextKeyService).getContextKeyValue(TunnelViewSelectionKeyName);
                tunnelItem = context ? remoteExplorerService.tunnelModel.forwarded.get(context) : undefined;
            }
            if (tunnelItem) {
                return copyAddress(remoteExplorerService, accessor.get(IClipboardService), tunnelItem);
            }
        };
    }
    CopyAddressAction.inlineHandler = inlineHandler;
    function commandPaletteHandler() {
        return async (accessor, arg) => {
            const quickInputService = accessor.get(IQuickInputService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const tunnelService = accessor.get(ITunnelService);
            const commandService = accessor.get(ICommandService);
            const clipboardService = accessor.get(IClipboardService);
            const tunnels = Array.from(remoteExplorerService.tunnelModel.forwarded.values()).concat(Array.from(remoteExplorerService.tunnelModel.detected.values()));
            const result = await quickInputService.pick(makeTunnelPicks(tunnels, remoteExplorerService, tunnelService), { placeHolder: nls.localize('remote.tunnel.copyAddressPlaceholdter', "Choose a forwarded port") });
            if (result && result.tunnel) {
                await copyAddress(remoteExplorerService, clipboardService, result.tunnel);
            }
            else if (result) {
                await commandService.executeCommand(ForwardPortAction.COMMANDPALETTE_ID);
            }
        };
    }
    CopyAddressAction.commandPaletteHandler = commandPaletteHandler;
})(CopyAddressAction || (CopyAddressAction = {}));
var ChangeLocalPortAction;
(function (ChangeLocalPortAction) {
    ChangeLocalPortAction.ID = 'remote.tunnel.changeLocalPort';
    ChangeLocalPortAction.LABEL = nls.localize('remote.tunnel.changeLocalPort', "Change Local Address Port");
    function validateInput(tunnelService, value, canElevate) {
        if (!value.match(/^[0-9]+$/)) {
            return { content: nls.localize('remote.tunnelsView.portShouldBeNumber', "Local port should be a number."), severity: Severity.Error };
        }
        else if (Number(value) >= maxPortNumber) {
            return { content: invalidPortNumberString, severity: Severity.Error };
        }
        else if (canElevate && tunnelService.isPortPrivileged(Number(value))) {
            return { content: requiresSudoString, severity: Severity.Info };
        }
        return null;
    }
    function handler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const notificationService = accessor.get(INotificationService);
            const tunnelService = accessor.get(ITunnelService);
            let tunnelContext;
            if (isITunnelItem(arg)) {
                tunnelContext = arg;
            }
            else {
                const context = accessor.get(IContextKeyService).getContextKeyValue(TunnelViewSelectionKeyName);
                const tunnel = context ? remoteExplorerService.tunnelModel.forwarded.get(context) : undefined;
                if (tunnel) {
                    const tunnelService = accessor.get(ITunnelService);
                    tunnelContext = TunnelItem.createFromTunnel(remoteExplorerService, tunnelService, tunnel);
                }
            }
            if (tunnelContext) {
                const tunnelItem = tunnelContext;
                remoteExplorerService.setEditable(tunnelItem, TunnelEditId.LocalPort, {
                    onFinish: async (value, success) => {
                        remoteExplorerService.setEditable(tunnelItem, TunnelEditId.LocalPort, null);
                        if (success) {
                            await remoteExplorerService.close({ host: tunnelItem.remoteHost, port: tunnelItem.remotePort }, TunnelCloseReason.Other);
                            const numberValue = Number(value);
                            const newForward = await remoteExplorerService.forward({
                                remote: { host: tunnelItem.remoteHost, port: tunnelItem.remotePort },
                                local: numberValue,
                                name: tunnelItem.name,
                                elevateIfNeeded: true,
                                source: tunnelItem.source
                            });
                            if (newForward && (typeof newForward !== 'string') && newForward.tunnelLocalPort !== numberValue) {
                                notificationService.warn(nls.localize('remote.tunnel.changeLocalPortNumber', "The local port {0} is not available. Port number {1} has been used instead", value, newForward.tunnelLocalPort ?? newForward.localAddress));
                            }
                        }
                    },
                    validationMessage: (value) => validateInput(tunnelService, value, tunnelService.canElevate),
                    placeholder: nls.localize('remote.tunnelsView.changePort', "New local port")
                });
            }
        };
    }
    ChangeLocalPortAction.handler = handler;
})(ChangeLocalPortAction || (ChangeLocalPortAction = {}));
var ChangeTunnelPrivacyAction;
(function (ChangeTunnelPrivacyAction) {
    function handler(privacyId) {
        return async (accessor, arg) => {
            if (isITunnelItem(arg)) {
                const remoteExplorerService = accessor.get(IRemoteExplorerService);
                await remoteExplorerService.close({ host: arg.remoteHost, port: arg.remotePort }, TunnelCloseReason.Other);
                return remoteExplorerService.forward({
                    remote: { host: arg.remoteHost, port: arg.remotePort },
                    local: arg.localPort,
                    name: arg.name,
                    elevateIfNeeded: true,
                    privacy: privacyId,
                    source: arg.source
                });
            }
            return undefined;
        };
    }
    ChangeTunnelPrivacyAction.handler = handler;
})(ChangeTunnelPrivacyAction || (ChangeTunnelPrivacyAction = {}));
var SetTunnelProtocolAction;
(function (SetTunnelProtocolAction) {
    SetTunnelProtocolAction.ID_HTTP = 'remote.tunnel.setProtocolHttp';
    SetTunnelProtocolAction.ID_HTTPS = 'remote.tunnel.setProtocolHttps';
    SetTunnelProtocolAction.LABEL_HTTP = nls.localize('remote.tunnel.protocolHttp', "HTTP");
    SetTunnelProtocolAction.LABEL_HTTPS = nls.localize('remote.tunnel.protocolHttps', "HTTPS");
    async function handler(arg, protocol, remoteExplorerService, environmentService) {
        if (isITunnelItem(arg)) {
            const attributes = {
                protocol
            };
            const target = environmentService.remoteAuthority ? 4 /* ConfigurationTarget.USER_REMOTE */ : 3 /* ConfigurationTarget.USER_LOCAL */;
            return remoteExplorerService.tunnelModel.configPortsAttributes.addAttributes(arg.remotePort, attributes, target);
        }
    }
    function handlerHttp() {
        return async (accessor, arg) => {
            return handler(arg, TunnelProtocol.Http, accessor.get(IRemoteExplorerService), accessor.get(IWorkbenchEnvironmentService));
        };
    }
    SetTunnelProtocolAction.handlerHttp = handlerHttp;
    function handlerHttps() {
        return async (accessor, arg) => {
            return handler(arg, TunnelProtocol.Https, accessor.get(IRemoteExplorerService), accessor.get(IWorkbenchEnvironmentService));
        };
    }
    SetTunnelProtocolAction.handlerHttps = handlerHttps;
})(SetTunnelProtocolAction || (SetTunnelProtocolAction = {}));
const tunnelViewCommandsWeightBonus = 10; // give our commands a little bit more weight over other default list/tree commands
const isForwardedExpr = TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded);
const isForwardedOrDetectedExpr = ContextKeyExpr.or(isForwardedExpr, TunnelTypeContextKey.isEqualTo(TunnelType.Detected));
const isNotMultiSelectionExpr = TunnelViewMultiSelectionContextKey.isEqualTo(undefined);
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: LabelTunnelAction.ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + tunnelViewCommandsWeightBonus,
    when: ContextKeyExpr.and(TunnelViewFocusContextKey, isForwardedExpr, isNotMultiSelectionExpr),
    primary: 60 /* KeyCode.F2 */,
    mac: {
        primary: 3 /* KeyCode.Enter */
    },
    handler: LabelTunnelAction.handler()
});
CommandsRegistry.registerCommand(ForwardPortAction.INLINE_ID, ForwardPortAction.inlineHandler());
CommandsRegistry.registerCommand(ForwardPortAction.COMMANDPALETTE_ID, ForwardPortAction.commandPaletteHandler());
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: ClosePortAction.INLINE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + tunnelViewCommandsWeightBonus,
    when: ContextKeyExpr.and(TunnelCloseableContextKey, TunnelViewFocusContextKey),
    primary: 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
        secondary: [20 /* KeyCode.Delete */]
    },
    handler: ClosePortAction.inlineHandler()
});
CommandsRegistry.registerCommand(ClosePortAction.COMMANDPALETTE_ID, ClosePortAction.commandPaletteHandler());
CommandsRegistry.registerCommand(OpenPortInBrowserAction.ID, OpenPortInBrowserAction.handler());
CommandsRegistry.registerCommand(OpenPortInPreviewAction.ID, OpenPortInPreviewAction.handler());
CommandsRegistry.registerCommand(OpenPortInBrowserCommandPaletteAction.ID, OpenPortInBrowserCommandPaletteAction.handler());
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: CopyAddressAction.INLINE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + tunnelViewCommandsWeightBonus,
    when: ContextKeyExpr.and(TunnelViewFocusContextKey, isForwardedOrDetectedExpr, isNotMultiSelectionExpr),
    primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
    handler: CopyAddressAction.inlineHandler()
});
CommandsRegistry.registerCommand(CopyAddressAction.COMMANDPALETTE_ID, CopyAddressAction.commandPaletteHandler());
CommandsRegistry.registerCommand(ChangeLocalPortAction.ID, ChangeLocalPortAction.handler());
CommandsRegistry.registerCommand(SetTunnelProtocolAction.ID_HTTP, SetTunnelProtocolAction.handlerHttp());
CommandsRegistry.registerCommand(SetTunnelProtocolAction.ID_HTTPS, SetTunnelProtocolAction.handlerHttps());
MenuRegistry.appendMenuItem(MenuId.CommandPalette, ({
    command: {
        id: ClosePortAction.COMMANDPALETTE_ID,
        title: ClosePortAction.LABEL
    },
    when: forwardedPortsViewEnabled
}));
MenuRegistry.appendMenuItem(MenuId.CommandPalette, ({
    command: {
        id: ForwardPortAction.COMMANDPALETTE_ID,
        title: ForwardPortAction.LABEL
    },
    when: forwardedPortsViewEnabled
}));
MenuRegistry.appendMenuItem(MenuId.CommandPalette, ({
    command: {
        id: CopyAddressAction.COMMANDPALETTE_ID,
        title: CopyAddressAction.COMMANDPALETTE_LABEL
    },
    when: forwardedPortsViewEnabled
}));
MenuRegistry.appendMenuItem(MenuId.CommandPalette, ({
    command: {
        id: OpenPortInBrowserCommandPaletteAction.ID,
        title: OpenPortInBrowserCommandPaletteAction.LABEL
    },
    when: forwardedPortsViewEnabled
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '._open',
    order: 0,
    command: {
        id: OpenPortInBrowserAction.ID,
        title: OpenPortInBrowserAction.LABEL,
    },
    when: ContextKeyExpr.and(isForwardedOrDetectedExpr, isNotMultiSelectionExpr)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '._open',
    order: 1,
    command: {
        id: OpenPortInPreviewAction.ID,
        title: OpenPortInPreviewAction.LABEL,
    },
    when: ContextKeyExpr.and(isForwardedOrDetectedExpr, isNotMultiSelectionExpr)
}));
// The group 0_manage is used by extensions, so try not to change it
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '0_manage',
    order: 1,
    command: {
        id: LabelTunnelAction.ID,
        title: LabelTunnelAction.LABEL,
        icon: labelPortIcon
    },
    when: ContextKeyExpr.and(isForwardedExpr, isNotMultiSelectionExpr)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '2_localaddress',
    order: 0,
    command: {
        id: CopyAddressAction.INLINE_ID,
        title: CopyAddressAction.INLINE_LABEL,
    },
    when: ContextKeyExpr.and(isForwardedOrDetectedExpr, isNotMultiSelectionExpr)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '2_localaddress',
    order: 1,
    command: {
        id: ChangeLocalPortAction.ID,
        title: ChangeLocalPortAction.LABEL,
    },
    when: ContextKeyExpr.and(isForwardedExpr, PortChangableContextKey, isNotMultiSelectionExpr)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '2_localaddress',
    order: 2,
    submenu: MenuId.TunnelPrivacy,
    title: nls.localize('tunnelContext.privacyMenu', "Port Visibility"),
    when: ContextKeyExpr.and(isForwardedExpr, TunnelPrivacyEnabledContextKey)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '2_localaddress',
    order: 3,
    submenu: MenuId.TunnelProtocol,
    title: nls.localize('tunnelContext.protocolMenu', "Change Port Protocol"),
    when: ContextKeyExpr.and(isForwardedExpr, isNotMultiSelectionExpr, ProtocolChangeableContextKey)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '3_forward',
    order: 0,
    command: {
        id: ClosePortAction.INLINE_ID,
        title: ClosePortAction.LABEL,
    },
    when: TunnelCloseableContextKey
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
    group: '3_forward',
    order: 1,
    command: {
        id: ForwardPortAction.INLINE_ID,
        title: ForwardPortAction.LABEL,
    },
}));
MenuRegistry.appendMenuItem(MenuId.TunnelProtocol, ({
    order: 0,
    command: {
        id: SetTunnelProtocolAction.ID_HTTP,
        title: SetTunnelProtocolAction.LABEL_HTTP,
        toggled: TunnelProtocolContextKey.isEqualTo(TunnelProtocol.Http)
    }
}));
MenuRegistry.appendMenuItem(MenuId.TunnelProtocol, ({
    order: 1,
    command: {
        id: SetTunnelProtocolAction.ID_HTTPS,
        title: SetTunnelProtocolAction.LABEL_HTTPS,
        toggled: TunnelProtocolContextKey.isEqualTo(TunnelProtocol.Https)
    }
}));
MenuRegistry.appendMenuItem(MenuId.TunnelPortInline, ({
    group: '0_manage',
    order: 0,
    command: {
        id: ForwardPortAction.INLINE_ID,
        title: ForwardPortAction.TREEITEM_LABEL,
        icon: forwardPortIcon
    },
    when: TunnelTypeContextKey.isEqualTo(TunnelType.Candidate)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelPortInline, ({
    group: '0_manage',
    order: 4,
    command: {
        id: LabelTunnelAction.ID,
        title: LabelTunnelAction.LABEL,
        icon: labelPortIcon
    },
    when: isForwardedExpr
}));
MenuRegistry.appendMenuItem(MenuId.TunnelPortInline, ({
    group: '0_manage',
    order: 5,
    command: {
        id: ClosePortAction.INLINE_ID,
        title: ClosePortAction.LABEL,
        icon: stopForwardIcon
    },
    when: TunnelCloseableContextKey
}));
MenuRegistry.appendMenuItem(MenuId.TunnelLocalAddressInline, ({
    order: -1,
    command: {
        id: CopyAddressAction.INLINE_ID,
        title: CopyAddressAction.INLINE_LABEL,
        icon: copyAddressIcon
    },
    when: isForwardedOrDetectedExpr
}));
MenuRegistry.appendMenuItem(MenuId.TunnelLocalAddressInline, ({
    order: 0,
    command: {
        id: OpenPortInBrowserAction.ID,
        title: OpenPortInBrowserAction.LABEL,
        icon: openBrowserIcon
    },
    when: isForwardedOrDetectedExpr
}));
MenuRegistry.appendMenuItem(MenuId.TunnelLocalAddressInline, ({
    order: 1,
    command: {
        id: OpenPortInPreviewAction.ID,
        title: OpenPortInPreviewAction.LABEL,
        icon: openPreviewIcon
    },
    when: isForwardedOrDetectedExpr
}));
registerColor('ports.iconRunningProcessForeground', STATUS_BAR_REMOTE_ITEM_BACKGROUND, nls.localize('portWithRunningProcess.foreground', "The color of the icon for a port that has an associated running process."));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci90dW5uZWxWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQWtDLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxrQkFBa0IsRUFBZSxhQUFhLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEksT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQWtDLE1BQU0sc0RBQXNELENBQUM7QUFDMUgsT0FBTyxFQUFFLGVBQWUsRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRE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