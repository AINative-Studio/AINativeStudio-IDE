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
var AbstractRuntimeExtensionsEditor_1;
import { $, addDisposableListener, append, clearNode } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { fromNow } from '../../../../base/common/date.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ExtensionIdentifierMap } from '../../../../platform/extensions/common/extensions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { Extensions, IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { DefaultIconPath } from '../../../services/extensionManagement/common/extensionManagement.js';
import { LocalWebWorkerRunningLocation } from '../../../services/extensions/common/extensionRunningLocation.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { errorIcon, warningIcon } from './extensionsIcons.js';
import './media/runtimeExtensionsEditor.css';
let AbstractRuntimeExtensionsEditor = class AbstractRuntimeExtensionsEditor extends EditorPane {
    static { AbstractRuntimeExtensionsEditor_1 = this; }
    static { this.ID = 'workbench.editor.runtimeExtensions'; }
    constructor(group, telemetryService, themeService, contextKeyService, _extensionsWorkbenchService, _extensionService, _notificationService, _contextMenuService, _instantiationService, storageService, _labelService, _environmentService, _clipboardService, _extensionFeaturesManagementService, _hoverService, _menuService) {
        super(AbstractRuntimeExtensionsEditor_1.ID, group, telemetryService, themeService, storageService);
        this.contextKeyService = contextKeyService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._extensionService = _extensionService;
        this._notificationService = _notificationService;
        this._contextMenuService = _contextMenuService;
        this._instantiationService = _instantiationService;
        this._labelService = _labelService;
        this._environmentService = _environmentService;
        this._clipboardService = _clipboardService;
        this._extensionFeaturesManagementService = _extensionFeaturesManagementService;
        this._hoverService = _hoverService;
        this._menuService = _menuService;
        this._list = null;
        this._elements = null;
        this._updateSoon = this._register(new RunOnceScheduler(() => this._updateExtensions(), 200));
        this._register(this._extensionService.onDidChangeExtensionsStatus(() => this._updateSoon.schedule()));
        this._register(this._extensionFeaturesManagementService.onDidChangeAccessData(() => this._updateSoon.schedule()));
        this._updateExtensions();
    }
    async _updateExtensions() {
        this._elements = await this._resolveExtensions();
        this._list?.splice(0, this._list.length, this._elements);
    }
    async _resolveExtensions() {
        // We only deal with extensions with source code!
        await this._extensionService.whenInstalledExtensionsRegistered();
        const extensionsDescriptions = this._extensionService.extensions.filter((extension) => {
            return Boolean(extension.main) || Boolean(extension.browser);
        });
        const marketplaceMap = new ExtensionIdentifierMap();
        const marketPlaceExtensions = await this._extensionsWorkbenchService.queryLocal();
        for (const extension of marketPlaceExtensions) {
            marketplaceMap.set(extension.identifier.id, extension);
        }
        const statusMap = this._extensionService.getExtensionsStatus();
        // group profile segments by extension
        const segments = new ExtensionIdentifierMap();
        const profileInfo = this._getProfileInfo();
        if (profileInfo) {
            let currentStartTime = profileInfo.startTime;
            for (let i = 0, len = profileInfo.deltas.length; i < len; i++) {
                const id = profileInfo.ids[i];
                const delta = profileInfo.deltas[i];
                let extensionSegments = segments.get(id);
                if (!extensionSegments) {
                    extensionSegments = [];
                    segments.set(id, extensionSegments);
                }
                extensionSegments.push(currentStartTime);
                currentStartTime = currentStartTime + delta;
                extensionSegments.push(currentStartTime);
            }
        }
        let result = [];
        for (let i = 0, len = extensionsDescriptions.length; i < len; i++) {
            const extensionDescription = extensionsDescriptions[i];
            let extProfileInfo = null;
            if (profileInfo) {
                const extensionSegments = segments.get(extensionDescription.identifier) || [];
                let extensionTotalTime = 0;
                for (let j = 0, lenJ = extensionSegments.length / 2; j < lenJ; j++) {
                    const startTime = extensionSegments[2 * j];
                    const endTime = extensionSegments[2 * j + 1];
                    extensionTotalTime += (endTime - startTime);
                }
                extProfileInfo = {
                    segments: extensionSegments,
                    totalTime: extensionTotalTime
                };
            }
            result[i] = {
                originalIndex: i,
                description: extensionDescription,
                marketplaceInfo: marketplaceMap.get(extensionDescription.identifier),
                status: statusMap[extensionDescription.identifier.value],
                profileInfo: extProfileInfo || undefined,
                unresponsiveProfile: this._getUnresponsiveProfile(extensionDescription.identifier)
            };
        }
        result = result.filter(element => element.status.activationStarted);
        // bubble up extensions that have caused slowness
        const isUnresponsive = (extension) => extension.unresponsiveProfile === profileInfo;
        const profileTime = (extension) => extension.profileInfo?.totalTime ?? 0;
        const activationTime = (extension) => (extension.status.activationTimes?.codeLoadingTime ?? 0) +
            (extension.status.activationTimes?.activateCallTime ?? 0);
        result = result.sort((a, b) => {
            if (isUnresponsive(a) || isUnresponsive(b)) {
                return +isUnresponsive(b) - +isUnresponsive(a);
            }
            else if (profileTime(a) || profileTime(b)) {
                return profileTime(b) - profileTime(a);
            }
            else if (activationTime(a) || activationTime(b)) {
                return activationTime(b) - activationTime(a);
            }
            return a.originalIndex - b.originalIndex;
        });
        return result;
    }
    createEditor(parent) {
        parent.classList.add('runtime-extensions-editor');
        const TEMPLATE_ID = 'runtimeExtensionElementTemplate';
        const delegate = new class {
            getHeight(element) {
                return 70;
            }
            getTemplateId(element) {
                return TEMPLATE_ID;
            }
        };
        const renderer = {
            templateId: TEMPLATE_ID,
            renderTemplate: (root) => {
                const element = append(root, $('.extension'));
                const iconContainer = append(element, $('.icon-container'));
                const icon = append(iconContainer, $('img.icon'));
                const desc = append(element, $('div.desc'));
                const headerContainer = append(desc, $('.header-container'));
                const header = append(headerContainer, $('.header'));
                const name = append(header, $('div.name'));
                const version = append(header, $('span.version'));
                const msgContainer = append(desc, $('div.msg'));
                const actionbar = new ActionBar(desc);
                actionbar.onDidRun(({ error }) => error && this._notificationService.error(error));
                const timeContainer = append(element, $('.time'));
                const activationTime = append(timeContainer, $('div.activation-time'));
                const profileTime = append(timeContainer, $('div.profile-time'));
                const disposables = [actionbar];
                return {
                    root,
                    element,
                    icon,
                    name,
                    version,
                    actionbar,
                    activationTime,
                    profileTime,
                    msgContainer,
                    disposables,
                    elementDisposables: [],
                };
            },
            renderElement: (element, index, data) => {
                data.elementDisposables = dispose(data.elementDisposables);
                data.root.classList.toggle('odd', index % 2 === 1);
                data.elementDisposables.push(addDisposableListener(data.icon, 'error', () => data.icon.src = element.marketplaceInfo?.iconUrlFallback || DefaultIconPath, { once: true }));
                data.icon.src = element.marketplaceInfo?.iconUrl || DefaultIconPath;
                if (!data.icon.complete) {
                    data.icon.style.visibility = 'hidden';
                    data.icon.onload = () => data.icon.style.visibility = 'inherit';
                }
                else {
                    data.icon.style.visibility = 'inherit';
                }
                data.name.textContent = (element.marketplaceInfo?.displayName || element.description.identifier.value).substr(0, 50);
                data.version.textContent = element.description.version;
                const activationTimes = element.status.activationTimes;
                if (activationTimes) {
                    const syncTime = activationTimes.codeLoadingTime + activationTimes.activateCallTime;
                    data.activationTime.textContent = activationTimes.activationReason.startup ? `Startup Activation: ${syncTime}ms` : `Activation: ${syncTime}ms`;
                }
                else {
                    data.activationTime.textContent = `Activating...`;
                }
                data.actionbar.clear();
                const slowExtensionAction = this._createSlowExtensionAction(element);
                if (slowExtensionAction) {
                    data.actionbar.push(slowExtensionAction, { icon: false, label: true });
                }
                if (isNonEmptyArray(element.status.runtimeErrors)) {
                    const reportExtensionIssueAction = this._createReportExtensionIssueAction(element);
                    if (reportExtensionIssueAction) {
                        data.actionbar.push(reportExtensionIssueAction, { icon: false, label: true });
                    }
                }
                let title;
                if (activationTimes) {
                    const activationId = activationTimes.activationReason.extensionId.value;
                    const activationEvent = activationTimes.activationReason.activationEvent;
                    if (activationEvent === '*') {
                        title = nls.localize({
                            key: 'starActivation',
                            comment: [
                                '{0} will be an extension identifier'
                            ]
                        }, "Activated by {0} on start-up", activationId);
                    }
                    else if (/^workspaceContains:/.test(activationEvent)) {
                        const fileNameOrGlob = activationEvent.substr('workspaceContains:'.length);
                        if (fileNameOrGlob.indexOf('*') >= 0 || fileNameOrGlob.indexOf('?') >= 0) {
                            title = nls.localize({
                                key: 'workspaceContainsGlobActivation',
                                comment: [
                                    '{0} will be a glob pattern',
                                    '{1} will be an extension identifier'
                                ]
                            }, "Activated by {1} because a file matching {0} exists in your workspace", fileNameOrGlob, activationId);
                        }
                        else {
                            title = nls.localize({
                                key: 'workspaceContainsFileActivation',
                                comment: [
                                    '{0} will be a file name',
                                    '{1} will be an extension identifier'
                                ]
                            }, "Activated by {1} because file {0} exists in your workspace", fileNameOrGlob, activationId);
                        }
                    }
                    else if (/^workspaceContainsTimeout:/.test(activationEvent)) {
                        const glob = activationEvent.substr('workspaceContainsTimeout:'.length);
                        title = nls.localize({
                            key: 'workspaceContainsTimeout',
                            comment: [
                                '{0} will be a glob pattern',
                                '{1} will be an extension identifier'
                            ]
                        }, "Activated by {1} because searching for {0} took too long", glob, activationId);
                    }
                    else if (activationEvent === 'onStartupFinished') {
                        title = nls.localize({
                            key: 'startupFinishedActivation',
                            comment: [
                                'This refers to an extension. {0} will be an activation event.'
                            ]
                        }, "Activated by {0} after start-up finished", activationId);
                    }
                    else if (/^onLanguage:/.test(activationEvent)) {
                        const language = activationEvent.substr('onLanguage:'.length);
                        title = nls.localize('languageActivation', "Activated by {1} because you opened a {0} file", language, activationId);
                    }
                    else {
                        title = nls.localize({
                            key: 'workspaceGenericActivation',
                            comment: [
                                '{0} will be an activation event, like e.g. \'language:typescript\', \'debug\', etc.',
                                '{1} will be an extension identifier'
                            ]
                        }, "Activated by {1} on {0}", activationEvent, activationId);
                    }
                }
                else {
                    title = nls.localize('extensionActivating', "Extension is activating...");
                }
                data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.activationTime, title));
                clearNode(data.msgContainer);
                if (this._getUnresponsiveProfile(element.description.identifier)) {
                    const el = $('span', undefined, ...renderLabelWithIcons(` $(alert) Unresponsive`));
                    const extensionHostFreezTitle = nls.localize('unresponsive.title', "Extension has caused the extension host to freeze.");
                    data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), el, extensionHostFreezTitle));
                    data.msgContainer.appendChild(el);
                }
                if (isNonEmptyArray(element.status.runtimeErrors)) {
                    const el = $('span', undefined, ...renderLabelWithIcons(`$(bug) ${nls.localize('errors', "{0} uncaught errors", element.status.runtimeErrors.length)}`));
                    data.msgContainer.appendChild(el);
                }
                if (element.status.messages && element.status.messages.length > 0) {
                    const el = $('span', undefined, ...renderLabelWithIcons(`$(alert) ${element.status.messages[0].message}`));
                    data.msgContainer.appendChild(el);
                }
                let extraLabel = null;
                if (element.status.runningLocation && element.status.runningLocation.equals(new LocalWebWorkerRunningLocation(0))) {
                    extraLabel = `$(globe) web worker`;
                }
                else if (element.description.extensionLocation.scheme === Schemas.vscodeRemote) {
                    const hostLabel = this._labelService.getHostLabel(Schemas.vscodeRemote, this._environmentService.remoteAuthority);
                    if (hostLabel) {
                        extraLabel = `$(remote) ${hostLabel}`;
                    }
                    else {
                        extraLabel = `$(remote) ${element.description.extensionLocation.authority}`;
                    }
                }
                else if (element.status.runningLocation && element.status.runningLocation.affinity > 0) {
                    extraLabel = element.status.runningLocation instanceof LocalWebWorkerRunningLocation
                        ? `$(globe) web worker ${element.status.runningLocation.affinity + 1}`
                        : `$(server-process) local process ${element.status.runningLocation.affinity + 1}`;
                }
                if (extraLabel) {
                    const el = $('span', undefined, ...renderLabelWithIcons(extraLabel));
                    data.msgContainer.appendChild(el);
                }
                const features = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeatures();
                for (const feature of features) {
                    const accessData = this._extensionFeaturesManagementService.getAccessData(element.description.identifier, feature.id);
                    if (accessData) {
                        const status = accessData?.current?.status;
                        if (status) {
                            data.msgContainer.appendChild($('span', undefined, `${feature.label}: `));
                            data.msgContainer.appendChild($('span', undefined, ...renderLabelWithIcons(`$(${status.severity === Severity.Error ? errorIcon.id : warningIcon.id}) ${status.message}`)));
                        }
                        if (accessData?.accessTimes.length > 0) {
                            const element = $('span', undefined, `${nls.localize('requests count', "{0} Usage: {1} Requests", feature.label, accessData.accessTimes.length)}${accessData.current ? nls.localize('session requests count', ", {0} Requests (Session)", accessData.current.accessTimes.length) : ''}`);
                            if (accessData.current) {
                                const title = nls.localize('requests count title', "Last request was {0}.", fromNow(accessData.current.lastAccessed, true, true));
                                data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), element, title));
                            }
                            data.msgContainer.appendChild(element);
                        }
                    }
                }
                if (element.profileInfo) {
                    data.profileTime.textContent = `Profile: ${(element.profileInfo.totalTime / 1000).toFixed(2)}ms`;
                }
                else {
                    data.profileTime.textContent = '';
                }
            },
            disposeTemplate: (data) => {
                data.disposables = dispose(data.disposables);
            }
        };
        this._list = this._instantiationService.createInstance((WorkbenchList), 'RuntimeExtensions', parent, delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            overrideStyles: {
                listBackground: editorBackground
            },
            accessibilityProvider: new class {
                getWidgetAriaLabel() {
                    return nls.localize('runtimeExtensions', "Runtime Extensions");
                }
                getAriaLabel(element) {
                    return element.description.name;
                }
            }
        });
        this._list.splice(0, this._list.length, this._elements || undefined);
        this._list.onContextMenu((e) => {
            if (!e.element) {
                return;
            }
            const actions = [];
            actions.push(new Action('runtimeExtensionsEditor.action.copyId', nls.localize('copy id', "Copy id ({0})", e.element.description.identifier.value), undefined, true, () => {
                this._clipboardService.writeText(e.element.description.identifier.value);
            }));
            const reportExtensionIssueAction = this._createReportExtensionIssueAction(e.element);
            if (reportExtensionIssueAction) {
                actions.push(reportExtensionIssueAction);
            }
            actions.push(new Separator());
            if (e.element.marketplaceInfo) {
                actions.push(new Action('runtimeExtensionsEditor.action.disableWorkspace', nls.localize('disable workspace', "Disable (Workspace)"), undefined, true, () => this._extensionsWorkbenchService.setEnablement(e.element.marketplaceInfo, 10 /* EnablementState.DisabledWorkspace */)));
                actions.push(new Action('runtimeExtensionsEditor.action.disable', nls.localize('disable', "Disable"), undefined, true, () => this._extensionsWorkbenchService.setEnablement(e.element.marketplaceInfo, 9 /* EnablementState.DisabledGlobally */)));
            }
            actions.push(new Separator());
            const menuActions = this._menuService.getMenuActions(MenuId.ExtensionEditorContextMenu, this.contextKeyService);
            actions.push(...getContextMenuActions(menuActions).secondary);
            this._contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions
            });
        });
    }
    layout(dimension) {
        this._list?.layout(dimension.height);
    }
};
AbstractRuntimeExtensionsEditor = AbstractRuntimeExtensionsEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IExtensionService),
    __param(6, INotificationService),
    __param(7, IContextMenuService),
    __param(8, IInstantiationService),
    __param(9, IStorageService),
    __param(10, ILabelService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IClipboardService),
    __param(13, IExtensionFeaturesManagementService),
    __param(14, IHoverService),
    __param(15, IMenuService)
], AbstractRuntimeExtensionsEditor);
export { AbstractRuntimeExtensionsEditor };
export class ShowRuntimeExtensionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.showRuntimeExtensions',
            title: nls.localize2('showRuntimeExtensions', "Show Running Extensions"),
            category: Categories.Developer,
            f1: true,
            menu: {
                id: MenuId.ViewContainerTitle,
                when: ContextKeyExpr.equals('viewContainer', 'workbench.view.extensions'),
                group: '2_enablement',
                order: 3
            }
        });
    }
    async run(accessor) {
        await accessor.get(IEditorService).openEditor(RuntimeExtensionsInput.instance, { pinned: true });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RSdW50aW1lRXh0ZW5zaW9uc0VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvYWJzdHJhY3RSdW50aW1lRXh0ZW5zaW9uc0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBYSxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRzNGLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQXVCLHNCQUFzQixFQUF5QixNQUFNLHNEQUFzRCxDQUFDO0FBQzFJLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsVUFBVSxFQUFFLG1DQUFtQyxFQUE4QixNQUFNLG1FQUFtRSxDQUFDO0FBQ2hLLE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0scUVBQXFFLENBQUM7QUFDdkgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDaEgsT0FBTyxFQUF5QixpQkFBaUIsRUFBcUIsTUFBTSxtREFBbUQsQ0FBQztBQUNoSSxPQUFPLEVBQWMsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzlELE9BQU8scUNBQXFDLENBQUM7QUF5QnRDLElBQWUsK0JBQStCLEdBQTlDLE1BQWUsK0JBQWdDLFNBQVEsVUFBVTs7YUFFaEQsT0FBRSxHQUFXLG9DQUFvQyxBQUEvQyxDQUFnRDtJQU16RSxZQUNDLEtBQW1CLEVBQ0EsZ0JBQW1DLEVBQ3ZDLFlBQTJCLEVBQ0wsaUJBQXFDLEVBQzVCLDJCQUF3RCxFQUNsRSxpQkFBb0MsRUFDakMsb0JBQTBDLEVBQzNDLG1CQUF3QyxFQUNwQyxxQkFBNEMsRUFDckUsY0FBK0IsRUFDaEIsYUFBNEIsRUFDYixtQkFBaUQsRUFDNUQsaUJBQW9DLEVBQ2xCLG1DQUF3RSxFQUM5RixhQUE0QixFQUM3QixZQUEwQjtRQUV6RCxLQUFLLENBQUMsaUNBQStCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFkNUQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUM1QixnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO1FBQ2xFLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDakMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUMzQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3BDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFFdEQsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDYix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQThCO1FBQzVELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDbEIsd0NBQW1DLEdBQW5DLG1DQUFtQyxDQUFxQztRQUM5RixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUM3QixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUl6RCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUN0QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRTdGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLDJCQUEyQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFUyxLQUFLLENBQUMsaUJBQWlCO1FBQ2hDLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNqRCxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCO1FBQy9CLGlEQUFpRDtRQUNqRCxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO1FBQ2pFLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNyRixPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sY0FBYyxHQUFHLElBQUksc0JBQXNCLEVBQWMsQ0FBQztRQUNoRSxNQUFNLHFCQUFxQixHQUFHLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xGLEtBQUssTUFBTSxTQUFTLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMvQyxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUUvRCxzQ0FBc0M7UUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxzQkFBc0IsRUFBWSxDQUFDO1FBRXhELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUMzQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLElBQUksZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQztZQUM3QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMvRCxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVwQyxJQUFJLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUN4QixpQkFBaUIsR0FBRyxFQUFFLENBQUM7b0JBQ3ZCLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7Z0JBQ3JDLENBQUM7Z0JBRUQsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3pDLGdCQUFnQixHQUFHLGdCQUFnQixHQUFHLEtBQUssQ0FBQztnQkFDNUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDMUMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLE1BQU0sR0FBd0IsRUFBRSxDQUFDO1FBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25FLE1BQU0sb0JBQW9CLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdkQsSUFBSSxjQUFjLEdBQXdDLElBQUksQ0FBQztZQUMvRCxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM5RSxJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQztnQkFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNwRSxNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzNDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzdDLGtCQUFrQixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUM3QyxDQUFDO2dCQUNELGNBQWMsR0FBRztvQkFDaEIsUUFBUSxFQUFFLGlCQUFpQjtvQkFDM0IsU0FBUyxFQUFFLGtCQUFrQjtpQkFDN0IsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUc7Z0JBQ1gsYUFBYSxFQUFFLENBQUM7Z0JBQ2hCLFdBQVcsRUFBRSxvQkFBb0I7Z0JBQ2pDLGVBQWUsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQztnQkFDcEUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO2dCQUN4RCxXQUFXLEVBQUUsY0FBYyxJQUFJLFNBQVM7Z0JBQ3hDLG1CQUFtQixFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUM7YUFDbEYsQ0FBQztRQUNILENBQUM7UUFFRCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVwRSxpREFBaUQ7UUFFakQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxTQUE0QixFQUFXLEVBQUUsQ0FDaEUsU0FBUyxDQUFDLG1CQUFtQixLQUFLLFdBQVcsQ0FBQztRQUUvQyxNQUFNLFdBQVcsR0FBRyxDQUFDLFNBQTRCLEVBQVUsRUFBRSxDQUM1RCxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsSUFBSSxDQUFDLENBQUM7UUFFdkMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxTQUE0QixFQUFVLEVBQUUsQ0FDL0QsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxlQUFlLElBQUksQ0FBQyxDQUFDO1lBQ3hELENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFM0QsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0IsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEQsQ0FBQztpQkFBTSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLENBQUM7aUJBQU0sSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QyxDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFUyxZQUFZLENBQUMsTUFBbUI7UUFDekMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUVsRCxNQUFNLFdBQVcsR0FBRyxpQ0FBaUMsQ0FBQztRQUV0RCxNQUFNLFFBQVEsR0FBRyxJQUFJO1lBQ3BCLFNBQVMsQ0FBQyxPQUEwQjtnQkFDbkMsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1lBQ0QsYUFBYSxDQUFDLE9BQTBCO2dCQUN2QyxPQUFPLFdBQVcsQ0FBQztZQUNwQixDQUFDO1NBQ0QsQ0FBQztRQWdCRixNQUFNLFFBQVEsR0FBb0U7WUFDakYsVUFBVSxFQUFFLFdBQVc7WUFDdkIsY0FBYyxFQUFFLENBQUMsSUFBaUIsRUFBaUMsRUFBRTtnQkFDcEUsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBbUIsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFFcEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO2dCQUVsRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUVoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBRW5GLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztnQkFDdkUsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO2dCQUVqRSxNQUFNLFdBQVcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUVoQyxPQUFPO29CQUNOLElBQUk7b0JBQ0osT0FBTztvQkFDUCxJQUFJO29CQUNKLElBQUk7b0JBQ0osT0FBTztvQkFDUCxTQUFTO29CQUNULGNBQWM7b0JBQ2QsV0FBVztvQkFDWCxZQUFZO29CQUNaLFdBQVc7b0JBQ1gsa0JBQWtCLEVBQUUsRUFBRTtpQkFDdEIsQ0FBQztZQUNILENBQUM7WUFFRCxhQUFhLEVBQUUsQ0FBQyxPQUEwQixFQUFFLEtBQWEsRUFBRSxJQUFtQyxFQUFRLEVBQUU7Z0JBRXZHLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBRTNELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFFbkQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxFQUFFLGVBQWUsSUFBSSxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzSyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxFQUFFLE9BQU8sSUFBSSxlQUFlLENBQUM7Z0JBRXBFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO29CQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO2dCQUNqRSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztnQkFDeEMsQ0FBQztnQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsV0FBVyxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3JILElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO2dCQUV2RCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztnQkFDdkQsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDckIsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLENBQUM7b0JBQ3BGLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsZUFBZSxRQUFRLElBQUksQ0FBQztnQkFDaEosQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQztnQkFDbkQsQ0FBQztnQkFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN2QixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDckUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO29CQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ3hFLENBQUM7Z0JBQ0QsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO29CQUNuRCxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDbkYsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO3dCQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQy9FLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLEtBQWEsQ0FBQztnQkFDbEIsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDckIsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQ3hFLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7b0JBQ3pFLElBQUksZUFBZSxLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUM3QixLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQzs0QkFDcEIsR0FBRyxFQUFFLGdCQUFnQjs0QkFDckIsT0FBTyxFQUFFO2dDQUNSLHFDQUFxQzs2QkFDckM7eUJBQ0QsRUFBRSw4QkFBOEIsRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDbEQsQ0FBQzt5QkFBTSxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO3dCQUN4RCxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUMzRSxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7NEJBQzFFLEtBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDO2dDQUNwQixHQUFHLEVBQUUsaUNBQWlDO2dDQUN0QyxPQUFPLEVBQUU7b0NBQ1IsNEJBQTRCO29DQUM1QixxQ0FBcUM7aUNBQ3JDOzZCQUNELEVBQUUsdUVBQXVFLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDO3dCQUMzRyxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7Z0NBQ3BCLEdBQUcsRUFBRSxpQ0FBaUM7Z0NBQ3RDLE9BQU8sRUFBRTtvQ0FDUix5QkFBeUI7b0NBQ3pCLHFDQUFxQztpQ0FDckM7NkJBQ0QsRUFBRSw0REFBNEQsRUFBRSxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7d0JBQ2hHLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxJQUFJLDRCQUE0QixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO3dCQUMvRCxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUN4RSxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQzs0QkFDcEIsR0FBRyxFQUFFLDBCQUEwQjs0QkFDL0IsT0FBTyxFQUFFO2dDQUNSLDRCQUE0QjtnQ0FDNUIscUNBQXFDOzZCQUNyQzt5QkFDRCxFQUFFLDBEQUEwRCxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDcEYsQ0FBQzt5QkFBTSxJQUFJLGVBQWUsS0FBSyxtQkFBbUIsRUFBRSxDQUFDO3dCQUNwRCxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQzs0QkFDcEIsR0FBRyxFQUFFLDJCQUEyQjs0QkFDaEMsT0FBTyxFQUFFO2dDQUNSLCtEQUErRDs2QkFDL0Q7eUJBQ0QsRUFBRSwwQ0FBMEMsRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDOUQsQ0FBQzt5QkFBTSxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQzt3QkFDakQsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQzlELEtBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGdEQUFnRCxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDdEgsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLEtBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDOzRCQUNwQixHQUFHLEVBQUUsNEJBQTRCOzRCQUNqQyxPQUFPLEVBQUU7Z0NBQ1IscUZBQXFGO2dDQUNyRixxQ0FBcUM7NkJBQ3JDO3lCQUNELEVBQUUseUJBQXlCLEVBQUUsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUM5RCxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO2dCQUMzRSxDQUFDO2dCQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBRWpJLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBRTdCLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDbEUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7b0JBQ25GLE1BQU0sdUJBQXVCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxvREFBb0QsQ0FBQyxDQUFDO29CQUN6SCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQztvQkFFbEksSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ25DLENBQUM7Z0JBRUQsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO29CQUNuRCxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLG9CQUFvQixDQUFDLFVBQVUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUscUJBQXFCLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pKLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO2dCQUVELElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNuRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLG9CQUFvQixDQUFDLFlBQVksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUMzRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkMsQ0FBQztnQkFFRCxJQUFJLFVBQVUsR0FBa0IsSUFBSSxDQUFDO2dCQUNyQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbkgsVUFBVSxHQUFHLHFCQUFxQixDQUFDO2dCQUNwQyxDQUFDO3FCQUFNLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNsRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDbEgsSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDZixVQUFVLEdBQUcsYUFBYSxTQUFTLEVBQUUsQ0FBQztvQkFDdkMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFVBQVUsR0FBRyxhQUFhLE9BQU8sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQzdFLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDMUYsVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxZQUFZLDZCQUE2Qjt3QkFDbkYsQ0FBQyxDQUFDLHVCQUF1QixPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFO3dCQUN0RSxDQUFDLENBQUMsbUNBQW1DLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDckYsQ0FBQztnQkFFRCxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQ3JFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO2dCQUVELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQTZCLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3RILEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2hDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN0SCxJQUFJLFVBQVUsRUFBRSxDQUFDO3dCQUNoQixNQUFNLE1BQU0sR0FBRyxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQzt3QkFDM0MsSUFBSSxNQUFNLEVBQUUsQ0FBQzs0QkFDWixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQzFFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxNQUFNLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM1SyxDQUFDO3dCQUNELElBQUksVUFBVSxFQUFFLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQ3hDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwwQkFBMEIsRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDelIsSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7Z0NBQ3hCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dDQUNsSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7NEJBQ3RILENBQUM7NEJBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3hDLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xHLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7Z0JBQ25DLENBQUM7WUFFRixDQUFDO1lBRUQsZUFBZSxFQUFFLENBQUMsSUFBbUMsRUFBUSxFQUFFO2dCQUM5RCxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDOUMsQ0FBQztTQUNELENBQUM7UUFFRixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsQ0FBQSxhQUFnQyxDQUFBLEVBQ3RGLG1CQUFtQixFQUNuQixNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDOUIsd0JBQXdCLEVBQUUsS0FBSztZQUMvQixnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLG1CQUFtQixFQUFFLEtBQUs7WUFDMUIsY0FBYyxFQUFFO2dCQUNmLGNBQWMsRUFBRSxnQkFBZ0I7YUFDaEM7WUFDRCxxQkFBcUIsRUFBRSxJQUFJO2dCQUMxQixrQkFBa0I7b0JBQ2pCLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUNoRSxDQUFDO2dCQUNELFlBQVksQ0FBQyxPQUEwQjtvQkFDdEMsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztnQkFDakMsQ0FBQzthQUNEO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLENBQUM7UUFFckUsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM5QixJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNoQixPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQztZQUU5QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxDQUN0Qix1Q0FBdUMsRUFDdkMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFDaEYsU0FBUyxFQUNULElBQUksRUFDSixHQUFHLEVBQUU7Z0JBQ0osSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBUSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0UsQ0FBQyxDQUNELENBQUMsQ0FBQztZQUVILE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRixJQUFJLDBCQUEwQixFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUMxQyxDQUFDO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFFOUIsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUscUJBQXFCLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQVEsQ0FBQyxlQUFnQiw2Q0FBb0MsQ0FBQyxDQUFDLENBQUM7Z0JBQzdRLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFRLENBQUMsZUFBZ0IsMkNBQW1DLENBQUMsQ0FBQyxDQUFDO1lBQzlPLENBQUM7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQztZQUU5QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDaEgsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLHFCQUFxQixDQUFDLFdBQVcsQ0FBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRS9ELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7Z0JBQ3hDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTTtnQkFDekIsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sTUFBTSxDQUFDLFNBQW9CO1FBQ2pDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDOztBQXhib0IsK0JBQStCO0lBVWxELFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSw0QkFBNEIsQ0FBQTtJQUM1QixZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsbUNBQW1DLENBQUE7SUFDbkMsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLFlBQVksQ0FBQTtHQXhCTywrQkFBK0IsQ0E4YnBEOztBQUVELE1BQU0sT0FBTywyQkFBNEIsU0FBUSxPQUFPO0lBRXZEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdDQUF3QztZQUM1QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSx5QkFBeUIsQ0FBQztZQUN4RSxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7Z0JBQzdCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSwyQkFBMkIsQ0FBQztnQkFDekUsS0FBSyxFQUFFLGNBQWM7Z0JBQ3JCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7Q0FDRCJ9