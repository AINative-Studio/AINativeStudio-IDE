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
import './media/remoteViewlet.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { URI } from '../../../../base/common/uri.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { FilterViewPaneContainer } from '../../../browser/parts/views/viewsViewlet.js';
import { VIEWLET_ID } from './remoteExplorer.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions, IViewDescriptorService } from '../../../common/views.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { ReloadWindowAction } from '../../../browser/actions/windowActions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { SwitchRemoteViewItem } from './explorerViewItems.js';
import { isStringArray } from '../../../../base/common/types.js';
import { IRemoteExplorerService } from '../../../services/remote/common/remoteExplorerService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import * as icons from './remoteIcons.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { getRemoteName } from '../../../../platform/remote/common/remoteHosts.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWalkthroughsService } from '../../welcomeGettingStarted/browser/gettingStartedService.js';
import { Schemas } from '../../../../base/common/network.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
class HelpTreeVirtualDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return 'HelpItemTemplate';
    }
}
class HelpTreeRenderer {
    constructor() {
        this.templateId = 'HelpItemTemplate';
    }
    renderTemplate(container) {
        container.classList.add('remote-help-tree-node-item');
        const icon = dom.append(container, dom.$('.remote-help-tree-node-item-icon'));
        const parent = container;
        return { parent, icon };
    }
    renderElement(element, index, templateData, height) {
        const container = templateData.parent;
        dom.append(container, templateData.icon);
        templateData.icon.classList.add(...element.element.iconClasses);
        const labelContainer = dom.append(container, dom.$('.help-item-label'));
        labelContainer.innerText = element.element.label;
    }
    disposeTemplate(templateData) {
    }
}
class HelpDataSource {
    hasChildren(element) {
        return element instanceof HelpModel;
    }
    getChildren(element) {
        if (element instanceof HelpModel && element.items) {
            return element.items;
        }
        return [];
    }
}
class HelpModel {
    constructor(viewModel, openerService, quickInputService, commandService, remoteExplorerService, environmentService, workspaceContextService, walkthroughsService) {
        this.viewModel = viewModel;
        this.openerService = openerService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.remoteExplorerService = remoteExplorerService;
        this.environmentService = environmentService;
        this.workspaceContextService = workspaceContextService;
        this.walkthroughsService = walkthroughsService;
        this.updateItems();
        viewModel.onDidChangeHelpInformation(() => this.updateItems());
    }
    createHelpItemValue(info, infoKey) {
        return new HelpItemValue(this.commandService, this.walkthroughsService, info.extensionDescription, (typeof info.remoteName === 'string') ? [info.remoteName] : info.remoteName, info.virtualWorkspace, info[infoKey]);
    }
    updateItems() {
        const helpItems = [];
        const getStarted = this.viewModel.helpInformation.filter(info => info.getStarted);
        if (getStarted.length) {
            const helpItemValues = getStarted.map((info) => this.createHelpItemValue(info, 'getStarted'));
            const getStartedHelpItem = this.items?.find(item => item.icon === icons.getStartedIcon) ?? new GetStartedHelpItem(icons.getStartedIcon, nls.localize('remote.help.getStarted', "Get Started"), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService, this.commandService);
            getStartedHelpItem.values = helpItemValues;
            helpItems.push(getStartedHelpItem);
        }
        const documentation = this.viewModel.helpInformation.filter(info => info.documentation);
        if (documentation.length) {
            const helpItemValues = documentation.map((info) => this.createHelpItemValue(info, 'documentation'));
            const documentationHelpItem = this.items?.find(item => item.icon === icons.documentationIcon) ?? new HelpItem(icons.documentationIcon, nls.localize('remote.help.documentation', "Read Documentation"), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            documentationHelpItem.values = helpItemValues;
            helpItems.push(documentationHelpItem);
        }
        const issues = this.viewModel.helpInformation.filter(info => info.issues);
        if (issues.length) {
            const helpItemValues = issues.map((info) => this.createHelpItemValue(info, 'issues'));
            const reviewIssuesHelpItem = this.items?.find(item => item.icon === icons.reviewIssuesIcon) ?? new HelpItem(icons.reviewIssuesIcon, nls.localize('remote.help.issues', "Review Issues"), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            reviewIssuesHelpItem.values = helpItemValues;
            helpItems.push(reviewIssuesHelpItem);
        }
        if (helpItems.length) {
            const helpItemValues = this.viewModel.helpInformation.map(info => this.createHelpItemValue(info, 'reportIssue'));
            const issueReporterItem = this.items?.find(item => item.icon === icons.reportIssuesIcon) ?? new IssueReporterItem(icons.reportIssuesIcon, nls.localize('remote.help.report', "Report Issue"), helpItemValues, this.quickInputService, this.environmentService, this.commandService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            issueReporterItem.values = helpItemValues;
            helpItems.push(issueReporterItem);
        }
        if (helpItems.length) {
            this.items = helpItems;
        }
    }
}
class HelpItemValue {
    constructor(commandService, walkthroughService, extensionDescription, remoteAuthority, virtualWorkspace, urlOrCommandOrId) {
        this.commandService = commandService;
        this.walkthroughService = walkthroughService;
        this.extensionDescription = extensionDescription;
        this.remoteAuthority = remoteAuthority;
        this.virtualWorkspace = virtualWorkspace;
        this.urlOrCommandOrId = urlOrCommandOrId;
    }
    get description() {
        return this.getUrl().then(() => this._description);
    }
    get url() {
        return this.getUrl();
    }
    async getUrl() {
        if (this._url === undefined) {
            if (typeof this.urlOrCommandOrId === 'string') {
                const url = URI.parse(this.urlOrCommandOrId);
                if (url.authority) {
                    this._url = this.urlOrCommandOrId;
                }
                else {
                    const urlCommand = this.commandService.executeCommand(this.urlOrCommandOrId).then((result) => {
                        // if executing this command times out, cache its value whenever it eventually resolves
                        this._url = result;
                        return this._url;
                    });
                    // We must be defensive. The command may never return, meaning that no help at all is ever shown!
                    const emptyString = new Promise(resolve => setTimeout(() => resolve(''), 500));
                    this._url = await Promise.race([urlCommand, emptyString]);
                }
            }
            else if (this.urlOrCommandOrId?.id) {
                try {
                    const walkthroughId = `${this.extensionDescription.id}#${this.urlOrCommandOrId.id}`;
                    const walkthrough = await this.walkthroughService.getWalkthrough(walkthroughId);
                    this._description = walkthrough.title;
                    this._url = walkthroughId;
                }
                catch { }
            }
        }
        if (this._url === undefined) {
            this._url = '';
        }
        return this._url;
    }
}
class HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService) {
        this.icon = icon;
        this.label = label;
        this.values = values;
        this.quickInputService = quickInputService;
        this.environmentService = environmentService;
        this.remoteExplorerService = remoteExplorerService;
        this.workspaceContextService = workspaceContextService;
        this.iconClasses = [];
        this.iconClasses.push(...ThemeIcon.asClassNameArray(icon));
        this.iconClasses.push('remote-help-tree-node-item-icon');
    }
    async getActions() {
        return (await Promise.all(this.values.map(async (value) => {
            return {
                label: value.extensionDescription.displayName || value.extensionDescription.identifier.value,
                description: await value.description ?? await value.url,
                url: await value.url,
                extensionDescription: value.extensionDescription
            };
        }))).filter(item => item.description);
    }
    async handleClick() {
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (remoteAuthority) {
            for (let i = 0; i < this.remoteExplorerService.targetType.length; i++) {
                if (remoteAuthority.startsWith(this.remoteExplorerService.targetType[i])) {
                    for (const value of this.values) {
                        if (value.remoteAuthority) {
                            for (const authority of value.remoteAuthority) {
                                if (remoteAuthority.startsWith(authority)) {
                                    await this.takeAction(value.extensionDescription, await value.url);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        else {
            const virtualWorkspace = getVirtualWorkspaceLocation(this.workspaceContextService.getWorkspace())?.scheme;
            if (virtualWorkspace) {
                for (let i = 0; i < this.remoteExplorerService.targetType.length; i++) {
                    for (const value of this.values) {
                        if (value.virtualWorkspace && value.remoteAuthority) {
                            for (const authority of value.remoteAuthority) {
                                if (this.remoteExplorerService.targetType[i].startsWith(authority) && virtualWorkspace.startsWith(value.virtualWorkspace)) {
                                    await this.takeAction(value.extensionDescription, await value.url);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        if (this.values.length > 1) {
            const actions = await this.getActions();
            if (actions.length) {
                const action = await this.quickInputService.pick(actions, { placeHolder: nls.localize('pickRemoteExtension', "Select url to open") });
                if (action) {
                    await this.takeAction(action.extensionDescription, action.url);
                }
            }
        }
        else {
            await this.takeAction(this.values[0].extensionDescription, await this.values[0].url);
        }
    }
}
class GetStartedHelpItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, openerService, remoteExplorerService, workspaceContextService, commandService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.openerService = openerService;
        this.commandService = commandService;
    }
    async takeAction(extensionDescription, urlOrWalkthroughId) {
        if ([Schemas.http, Schemas.https].includes(URI.parse(urlOrWalkthroughId).scheme)) {
            this.openerService.open(urlOrWalkthroughId, { allowCommands: true });
            return;
        }
        this.commandService.executeCommand('workbench.action.openWalkthrough', urlOrWalkthroughId);
    }
}
class HelpItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, openerService, remoteExplorerService, workspaceContextService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.openerService = openerService;
    }
    async takeAction(extensionDescription, url) {
        await this.openerService.open(URI.parse(url), { allowCommands: true });
    }
}
class IssueReporterItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, commandService, openerService, remoteExplorerService, workspaceContextService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.commandService = commandService;
        this.openerService = openerService;
    }
    async getActions() {
        return Promise.all(this.values.map(async (value) => {
            return {
                label: value.extensionDescription.displayName || value.extensionDescription.identifier.value,
                description: '',
                url: await value.url,
                extensionDescription: value.extensionDescription
            };
        }));
    }
    async takeAction(extensionDescription, url) {
        if (!url) {
            await this.commandService.executeCommand('workbench.action.openIssueReporter', [extensionDescription.identifier.value]);
        }
        else {
            await this.openerService.open(URI.parse(url));
        }
    }
}
let HelpPanel = class HelpPanel extends ViewPane {
    static { this.ID = '~remote.helpPanel'; }
    static { this.TITLE = nls.localize2('remote.help', "Help and feedback"); }
    constructor(viewModel, options, keybindingService, contextMenuService, contextKeyService, configurationService, instantiationService, viewDescriptorService, openerService, quickInputService, commandService, remoteExplorerService, environmentService, themeService, hoverService, workspaceContextService, walkthroughsService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.viewModel = viewModel;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.remoteExplorerService = remoteExplorerService;
        this.environmentService = environmentService;
        this.workspaceContextService = workspaceContextService;
        this.walkthroughsService = walkthroughsService;
    }
    renderBody(container) {
        super.renderBody(container);
        container.classList.add('remote-help');
        const treeContainer = document.createElement('div');
        treeContainer.classList.add('remote-help-content');
        container.appendChild(treeContainer);
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'RemoteHelp', treeContainer, new HelpTreeVirtualDelegate(), [new HelpTreeRenderer()], new HelpDataSource(), {
            accessibilityProvider: {
                getAriaLabel: (item) => {
                    return item.label;
                },
                getWidgetAriaLabel: () => nls.localize('remotehelp', "Remote Help")
            }
        });
        const model = new HelpModel(this.viewModel, this.openerService, this.quickInputService, this.commandService, this.remoteExplorerService, this.environmentService, this.workspaceContextService, this.walkthroughsService);
        this.tree.setInput(model);
        this._register(Event.debounce(this.tree.onDidOpen, (last, event) => event, 75, true)(e => {
            e.element?.handleClick();
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
};
HelpPanel = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IContextKeyService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IViewDescriptorService),
    __param(8, IOpenerService),
    __param(9, IQuickInputService),
    __param(10, ICommandService),
    __param(11, IRemoteExplorerService),
    __param(12, IWorkbenchEnvironmentService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, IWorkspaceContextService),
    __param(16, IWalkthroughsService)
], HelpPanel);
class HelpPanelDescriptor {
    constructor(viewModel) {
        this.id = HelpPanel.ID;
        this.name = HelpPanel.TITLE;
        this.canToggleVisibility = true;
        this.hideByDefault = false;
        this.group = 'help@50';
        this.order = -10;
        this.ctorDescriptor = new SyncDescriptor(HelpPanel, [viewModel]);
    }
}
let RemoteViewPaneContainer = class RemoteViewPaneContainer extends FilterViewPaneContainer {
    constructor(layoutService, telemetryService, contextService, storageService, configurationService, instantiationService, themeService, contextMenuService, extensionService, remoteExplorerService, viewDescriptorService, logService) {
        super(VIEWLET_ID, remoteExplorerService.onDidChangeTargetType, configurationService, layoutService, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService, viewDescriptorService, logService);
        this.remoteExplorerService = remoteExplorerService;
        this.helpPanelDescriptor = new HelpPanelDescriptor(this);
        this.helpInformation = [];
        this._onDidChangeHelpInformation = new Emitter();
        this.onDidChangeHelpInformation = this._onDidChangeHelpInformation.event;
        this.hasRegisteredHelpView = false;
        this.addConstantViewDescriptors([this.helpPanelDescriptor]);
        this._register(this.remoteSwitcher = this.instantiationService.createInstance(SwitchRemoteViewItem));
        this.remoteExplorerService.onDidChangeHelpInformation(extensions => {
            this._setHelpInformation(extensions);
        });
        this._setHelpInformation(this.remoteExplorerService.helpInformation);
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        this.remoteSwitcher.createOptionItems(viewsRegistry.getViews(this.viewContainer));
        this._register(viewsRegistry.onViewsRegistered(e => {
            const remoteViews = [];
            for (const view of e) {
                if (view.viewContainer.id === VIEWLET_ID) {
                    remoteViews.push(...view.views);
                }
            }
            if (remoteViews.length > 0) {
                this.remoteSwitcher.createOptionItems(remoteViews);
            }
        }));
        this._register(viewsRegistry.onViewsDeregistered(e => {
            if (e.viewContainer.id === VIEWLET_ID) {
                this.remoteSwitcher.removeOptionItems(e.views);
            }
        }));
    }
    _setHelpInformation(extensions) {
        const helpInformation = [];
        for (const extension of extensions) {
            this._handleRemoteInfoExtensionPoint(extension, helpInformation);
        }
        this.helpInformation = helpInformation;
        this._onDidChangeHelpInformation.fire();
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        if (this.helpInformation.length && !this.hasRegisteredHelpView) {
            const view = viewsRegistry.getView(this.helpPanelDescriptor.id);
            if (!view) {
                viewsRegistry.registerViews([this.helpPanelDescriptor], this.viewContainer);
            }
            this.hasRegisteredHelpView = true;
        }
        else if (this.hasRegisteredHelpView) {
            viewsRegistry.deregisterViews([this.helpPanelDescriptor], this.viewContainer);
            this.hasRegisteredHelpView = false;
        }
    }
    _handleRemoteInfoExtensionPoint(extension, helpInformation) {
        if (!isProposedApiEnabled(extension.description, 'contribRemoteHelp')) {
            return;
        }
        if (!extension.value.documentation && !extension.value.getStarted && !extension.value.issues) {
            return;
        }
        helpInformation.push({
            extensionDescription: extension.description,
            getStarted: extension.value.getStarted,
            documentation: extension.value.documentation,
            reportIssue: extension.value.reportIssue,
            issues: extension.value.issues,
            remoteName: extension.value.remoteName,
            virtualWorkspace: extension.value.virtualWorkspace
        });
    }
    getFilterOn(viewDescriptor) {
        return isStringArray(viewDescriptor.remoteAuthority) ? viewDescriptor.remoteAuthority[0] : viewDescriptor.remoteAuthority;
    }
    setFilter(viewDescriptor) {
        this.remoteExplorerService.targetType = isStringArray(viewDescriptor.remoteAuthority) ? viewDescriptor.remoteAuthority : [viewDescriptor.remoteAuthority];
    }
    getTitle() {
        const title = nls.localize('remote.explorer', "Remote Explorer");
        return title;
    }
};
RemoteViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IContextMenuService),
    __param(8, IExtensionService),
    __param(9, IRemoteExplorerService),
    __param(10, IViewDescriptorService),
    __param(11, ILogService)
], RemoteViewPaneContainer);
Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: nls.localize2('remote.explorer', "Remote Explorer"),
    ctorDescriptor: new SyncDescriptor(RemoteViewPaneContainer),
    hideIfEmpty: true,
    viewOrderDelegate: {
        getOrder: (group) => {
            if (!group) {
                return;
            }
            let matches = /^targets@(\d+)$/.exec(group);
            if (matches) {
                return -1000;
            }
            matches = /^details(@(\d+))?$/.exec(group);
            if (matches) {
                return -500 + Number(matches[2]);
            }
            matches = /^help(@(\d+))?$/.exec(group);
            if (matches) {
                return -10;
            }
            return;
        }
    },
    icon: icons.remoteExplorerViewIcon,
    order: 4
}, 0 /* ViewContainerLocation.Sidebar */);
let RemoteMarkers = class RemoteMarkers {
    constructor(remoteAgentService, timerService) {
        remoteAgentService.getEnvironment().then(remoteEnv => {
            if (remoteEnv) {
                timerService.setPerformanceMarks('server', remoteEnv.marks);
            }
        });
    }
};
RemoteMarkers = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ITimerService)
], RemoteMarkers);
export { RemoteMarkers };
class VisibleProgress {
    get lastReport() {
        return this._lastReport;
    }
    constructor(progressService, location, initialReport, buttons, onDidCancel) {
        this.location = location;
        this._isDisposed = false;
        this._lastReport = initialReport;
        this._currentProgressPromiseResolve = null;
        this._currentProgress = null;
        this._currentTimer = null;
        const promise = new Promise((resolve) => this._currentProgressPromiseResolve = resolve);
        progressService.withProgress({ location: location, buttons: buttons }, (progress) => { if (!this._isDisposed) {
            this._currentProgress = progress;
        } return promise; }, (choice) => onDidCancel(choice, this._lastReport));
        if (this._lastReport) {
            this.report();
        }
    }
    dispose() {
        this._isDisposed = true;
        if (this._currentProgressPromiseResolve) {
            this._currentProgressPromiseResolve();
            this._currentProgressPromiseResolve = null;
        }
        this._currentProgress = null;
        if (this._currentTimer) {
            this._currentTimer.dispose();
            this._currentTimer = null;
        }
    }
    report(message) {
        if (message) {
            this._lastReport = message;
        }
        if (this._lastReport && this._currentProgress) {
            this._currentProgress.report({ message: this._lastReport });
        }
    }
    startTimer(completionTime) {
        this.stopTimer();
        this._currentTimer = new ReconnectionTimer(this, completionTime);
    }
    stopTimer() {
        if (this._currentTimer) {
            this._currentTimer.dispose();
            this._currentTimer = null;
        }
    }
}
class ReconnectionTimer {
    constructor(parent, completionTime) {
        this._parent = parent;
        this._completionTime = completionTime;
        this._renderInterval = dom.disposableWindowInterval(mainWindow, () => this._render(), 1000);
        this._render();
    }
    dispose() {
        this._renderInterval.dispose();
    }
    _render() {
        const remainingTimeMs = this._completionTime - Date.now();
        if (remainingTimeMs < 0) {
            return;
        }
        const remainingTime = Math.ceil(remainingTimeMs / 1000);
        if (remainingTime === 1) {
            this._parent.report(nls.localize('reconnectionWaitOne', "Attempting to reconnect in {0} second...", remainingTime));
        }
        else {
            this._parent.report(nls.localize('reconnectionWaitMany', "Attempting to reconnect in {0} seconds...", remainingTime));
        }
    }
}
/**
 * The time when a prompt is shown to the user
 */
const DISCONNECT_PROMPT_TIME = 40 * 1000; // 40 seconds
let RemoteAgentConnectionStatusListener = class RemoteAgentConnectionStatusListener extends Disposable {
    constructor(remoteAgentService, progressService, dialogService, commandService, quickInputService, logService, environmentService, telemetryService) {
        super();
        this._reloadWindowShown = false;
        const connection = remoteAgentService.getConnection();
        if (connection) {
            let quickInputVisible = false;
            this._register(quickInputService.onShow(() => quickInputVisible = true));
            this._register(quickInputService.onHide(() => quickInputVisible = false));
            let visibleProgress = null;
            let reconnectWaitEvent = null;
            let disposableListener = null;
            function showProgress(location, buttons, initialReport = null) {
                if (visibleProgress) {
                    visibleProgress.dispose();
                    visibleProgress = null;
                }
                if (!location) {
                    location = quickInputVisible ? 15 /* ProgressLocation.Notification */ : 20 /* ProgressLocation.Dialog */;
                }
                return new VisibleProgress(progressService, location, initialReport, buttons.map(button => button.label), (choice, lastReport) => {
                    // Handle choice from dialog
                    if (typeof choice !== 'undefined' && buttons[choice]) {
                        buttons[choice].callback();
                    }
                    else {
                        if (location === 20 /* ProgressLocation.Dialog */) {
                            visibleProgress = showProgress(15 /* ProgressLocation.Notification */, buttons, lastReport);
                        }
                        else {
                            hideProgress();
                        }
                    }
                });
            }
            function hideProgress() {
                if (visibleProgress) {
                    visibleProgress.dispose();
                    visibleProgress = null;
                }
            }
            let reconnectionToken = '';
            let lastIncomingDataTime = 0;
            let reconnectionAttempts = 0;
            const reconnectButton = {
                label: nls.localize('reconnectNow', "Reconnect Now"),
                callback: () => {
                    reconnectWaitEvent?.skipWait();
                }
            };
            const reloadButton = {
                label: nls.localize('reloadWindow', "Reload Window"),
                callback: () => {
                    telemetryService.publicLog2('remoteReconnectionReload', {
                        remoteName: getRemoteName(environmentService.remoteAuthority),
                        reconnectionToken: reconnectionToken,
                        millisSinceLastIncomingData: Date.now() - lastIncomingDataTime,
                        attempt: reconnectionAttempts
                    });
                    commandService.executeCommand(ReloadWindowAction.ID);
                }
            };
            // Possible state transitions:
            // ConnectionGain      -> ConnectionLost
            // ConnectionLost      -> ReconnectionWait, ReconnectionRunning
            // ReconnectionWait    -> ReconnectionRunning
            // ReconnectionRunning -> ConnectionGain, ReconnectionPermanentFailure
            connection.onDidStateChange((e) => {
                visibleProgress?.stopTimer();
                if (disposableListener) {
                    disposableListener.dispose();
                    disposableListener = null;
                }
                switch (e.type) {
                    case 0 /* PersistentConnectionEventType.ConnectionLost */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = 0;
                        telemetryService.publicLog2('remoteConnectionLost', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                        });
                        if (visibleProgress || e.millisSinceLastIncomingData > DISCONNECT_PROMPT_TIME) {
                            if (!visibleProgress) {
                                visibleProgress = showProgress(null, [reconnectButton, reloadButton]);
                            }
                            visibleProgress.report(nls.localize('connectionLost', "Connection Lost"));
                        }
                        break;
                    case 1 /* PersistentConnectionEventType.ReconnectionWait */:
                        if (visibleProgress) {
                            reconnectWaitEvent = e;
                            visibleProgress = showProgress(null, [reconnectButton, reloadButton]);
                            visibleProgress.startTimer(Date.now() + 1000 * e.durationSeconds);
                        }
                        break;
                    case 2 /* PersistentConnectionEventType.ReconnectionRunning */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteReconnectionRunning', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt
                        });
                        if (visibleProgress || e.millisSinceLastIncomingData > DISCONNECT_PROMPT_TIME) {
                            visibleProgress = showProgress(null, [reloadButton]);
                            visibleProgress.report(nls.localize('reconnectionRunning', "Disconnected. Attempting to reconnect..."));
                            // Register to listen for quick input is opened
                            disposableListener = quickInputService.onShow(() => {
                                // Need to move from dialog if being shown and user needs to type in a prompt
                                if (visibleProgress && visibleProgress.location === 20 /* ProgressLocation.Dialog */) {
                                    visibleProgress = showProgress(15 /* ProgressLocation.Notification */, [reloadButton], visibleProgress.lastReport);
                                }
                            });
                        }
                        break;
                    case 3 /* PersistentConnectionEventType.ReconnectionPermanentFailure */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteReconnectionPermanentFailure', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt,
                            handled: e.handled
                        });
                        hideProgress();
                        if (e.handled) {
                            logService.info(`Error handled: Not showing a notification for the error.`);
                            console.log(`Error handled: Not showing a notification for the error.`);
                        }
                        else if (!this._reloadWindowShown) {
                            this._reloadWindowShown = true;
                            dialogService.confirm({
                                type: Severity.Error,
                                message: nls.localize('reconnectionPermanentFailure', "Cannot reconnect. Please reload the window."),
                                primaryButton: nls.localize({ key: 'reloadWindow.dialog', comment: ['&& denotes a mnemonic'] }, "&&Reload Window")
                            }).then(result => {
                                if (result.confirmed) {
                                    commandService.executeCommand(ReloadWindowAction.ID);
                                }
                            });
                        }
                        break;
                    case 4 /* PersistentConnectionEventType.ConnectionGain */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteConnectionGain', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt
                        });
                        hideProgress();
                        break;
                }
            });
        }
    }
};
RemoteAgentConnectionStatusListener = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IProgressService),
    __param(2, IDialogService),
    __param(3, ICommandService),
    __param(4, IQuickInputService),
    __param(5, ILogService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, ITelemetryService)
], RemoteAgentConnectionStatusListener);
export { RemoteAgentConnectionStatusListener };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3JlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFCQUFxQixD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