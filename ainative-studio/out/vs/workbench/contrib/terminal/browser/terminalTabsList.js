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
import { IListService, WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITerminalConfigurationService, ITerminalGroupService, ITerminalService } from './terminal.js';
import { localize } from '../../../../nls.js';
import * as DOM from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Action } from '../../../../base/common/actions.js';
import { DEFAULT_LABELS_CONTAINER, ResourceLabels } from '../../../browser/labels.js';
import { IDecorationsService } from '../../../services/decorations/common/decorations.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import Severity from '../../../../base/common/severity.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { ElementsDragAndDropData, NativeDragAndDropData } from '../../../../base/browser/ui/list/listView.js';
import { URI } from '../../../../base/common/uri.js';
import { getColorClass, getIconId, getUriClasses } from './terminalIcon.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { CodeDataTransfers, containsDragType, getPathForFile } from '../../../../platform/dnd/browser/dnd.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { getTerminalResourcesFromDragEvent, parseTerminalUri } from './terminalUri.js';
import { getInstanceHoverInfo } from './terminalTooltip.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Emitter } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { getColorForSeverity } from './terminalStatusList.js';
import { TerminalContextActionRunner } from './terminalContextMenu.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
const $ = DOM.$;
export var TerminalTabsListSizes;
(function (TerminalTabsListSizes) {
    TerminalTabsListSizes[TerminalTabsListSizes["TabHeight"] = 22] = "TabHeight";
    TerminalTabsListSizes[TerminalTabsListSizes["NarrowViewWidth"] = 46] = "NarrowViewWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["WideViewMinimumWidth"] = 80] = "WideViewMinimumWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["DefaultWidth"] = 120] = "DefaultWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["MidpointViewWidth"] = 63] = "MidpointViewWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["ActionbarMinimumWidth"] = 105] = "ActionbarMinimumWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["MaximumWidth"] = 500] = "MaximumWidth";
})(TerminalTabsListSizes || (TerminalTabsListSizes = {}));
let TerminalTabList = class TerminalTabList extends WorkbenchList {
    constructor(container, disposableStore, contextKeyService, listService, _configurationService, _terminalService, _terminalGroupService, instantiationService, decorationsService, _themeService, _storageService, lifecycleService, _hoverService) {
        super('TerminalTabsList', container, {
            getHeight: () => 22 /* TerminalTabsListSizes.TabHeight */,
            getTemplateId: () => 'terminal.tabs'
        }, [disposableStore.add(instantiationService.createInstance(TerminalTabsRenderer, container, instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER), () => this.getSelectedElements()))], {
            horizontalScrolling: false,
            supportDynamicHeights: false,
            selectionNavigation: true,
            identityProvider: {
                getId: e => e?.instanceId
            },
            accessibilityProvider: instantiationService.createInstance(TerminalTabsAccessibilityProvider),
            smoothScrolling: _configurationService.getValue('workbench.list.smoothScrolling'),
            multipleSelectionSupport: true,
            paddingBottom: 22 /* TerminalTabsListSizes.TabHeight */,
            dnd: instantiationService.createInstance(TerminalTabsDragAndDrop),
            openOnSingleClick: true
        }, contextKeyService, listService, _configurationService, instantiationService);
        this._configurationService = _configurationService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._themeService = _themeService;
        this._storageService = _storageService;
        this._hoverService = _hoverService;
        const instanceDisposables = [
            this._terminalGroupService.onDidChangeInstances(() => this.refresh()),
            this._terminalGroupService.onDidChangeGroups(() => this.refresh()),
            this._terminalGroupService.onDidShow(() => this.refresh()),
            this._terminalGroupService.onDidChangeInstanceCapability(() => this.refresh()),
            this._terminalService.onAnyInstanceTitleChange(() => this.refresh()),
            this._terminalService.onAnyInstanceIconChange(() => this.refresh()),
            this._terminalService.onAnyInstancePrimaryStatusChange(() => this.refresh()),
            this._terminalService.onDidChangeConnectionState(() => this.refresh()),
            this._themeService.onDidColorThemeChange(() => this.refresh()),
            this._terminalGroupService.onDidChangeActiveInstance(e => {
                if (e) {
                    const i = this._terminalGroupService.instances.indexOf(e);
                    this.setSelection([i]);
                    this.reveal(i);
                }
                this.refresh();
            }),
            this._storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, "terminal.integrated.tabs.showDetailed" /* TerminalStorageKeys.TabsShowDetailed */, this.disposables)(() => this.refresh()),
        ];
        // Dispose of instance listeners on shutdown to avoid extra work and so tabs don't disappear
        // briefly
        this.disposables.add(lifecycleService.onWillShutdown(e => {
            dispose(instanceDisposables);
            instanceDisposables.length = 0;
        }));
        this.disposables.add(toDisposable(() => {
            dispose(instanceDisposables);
            instanceDisposables.length = 0;
        }));
        this.disposables.add(this.onMouseDblClick(async (e) => {
            const focus = this.getFocus();
            if (focus.length === 0) {
                const instance = await this._terminalService.createTerminal({ location: TerminalLocation.Panel });
                this._terminalGroupService.setActiveInstance(instance);
                await instance.focusWhenReady();
            }
            if (this._terminalService.getEditingTerminal()?.instanceId === e.element?.instanceId) {
                return;
            }
            if (this._getFocusMode() === 'doubleClick' && this.getFocus().length === 1) {
                e.element?.focus(true);
            }
        }));
        // on left click, if focus mode = single click, focus the element
        // unless multi-selection is in progress
        this.disposables.add(this.onMouseClick(async (e) => {
            if (this._terminalService.getEditingTerminal()?.instanceId === e.element?.instanceId) {
                return;
            }
            if (e.browserEvent.altKey && e.element) {
                await this._terminalService.createTerminal({ location: { parentTerminal: e.element } });
            }
            else if (this._getFocusMode() === 'singleClick') {
                if (this.getSelection().length <= 1) {
                    e.element?.focus(true);
                }
            }
        }));
        // on right click, set the focus to that element
        // unless multi-selection is in progress
        this.disposables.add(this.onContextMenu(e => {
            if (!e.element) {
                this.setSelection([]);
                return;
            }
            const selection = this.getSelectedElements();
            if (!selection || !selection.find(s => e.element === s)) {
                this.setFocus(e.index !== undefined ? [e.index] : []);
            }
        }));
        this._terminalTabsSingleSelectedContextKey = TerminalContextKeys.tabsSingularSelection.bindTo(contextKeyService);
        this._isSplitContextKey = TerminalContextKeys.splitTerminal.bindTo(contextKeyService);
        this.disposables.add(this.onDidChangeSelection(e => this._updateContextKey()));
        this.disposables.add(this.onDidChangeFocus(() => this._updateContextKey()));
        this.disposables.add(this.onDidOpen(async (e) => {
            const instance = e.element;
            if (!instance) {
                return;
            }
            this._terminalGroupService.setActiveInstance(instance);
            if (!e.editorOptions.preserveFocus) {
                await instance.focusWhenReady();
            }
        }));
        if (!this._decorationsProvider) {
            this._decorationsProvider = this.disposables.add(instantiationService.createInstance(TabDecorationsProvider));
            this.disposables.add(decorationsService.registerDecorationsProvider(this._decorationsProvider));
        }
        this.refresh();
    }
    _getFocusMode() {
        return this._configurationService.getValue("terminal.integrated.tabs.focusMode" /* TerminalSettingId.TabsFocusMode */);
    }
    refresh(cancelEditing = true) {
        if (cancelEditing && this._terminalService.isEditable(undefined)) {
            this.domFocus();
        }
        this.splice(0, this.length, this._terminalGroupService.instances.slice());
    }
    focusHover() {
        const instance = this.getSelectedElements()[0];
        if (!instance) {
            return;
        }
        this._hoverService.showInstantHover({
            ...getInstanceHoverInfo(instance, this._storageService),
            target: this.getHTMLElement(),
            trapFocus: true
        }, true);
    }
    _updateContextKey() {
        this._terminalTabsSingleSelectedContextKey.set(this.getSelectedElements().length === 1);
        const instance = this.getFocusedElements();
        this._isSplitContextKey.set(instance.length > 0 && this._terminalGroupService.instanceIsSplit(instance[0]));
    }
};
TerminalTabList = __decorate([
    __param(2, IContextKeyService),
    __param(3, IListService),
    __param(4, IConfigurationService),
    __param(5, ITerminalService),
    __param(6, ITerminalGroupService),
    __param(7, IInstantiationService),
    __param(8, IDecorationsService),
    __param(9, IThemeService),
    __param(10, IStorageService),
    __param(11, ILifecycleService),
    __param(12, IHoverService)
], TerminalTabList);
export { TerminalTabList };
let TerminalTabsRenderer = class TerminalTabsRenderer extends Disposable {
    constructor(_container, _labels, _getSelection, _instantiationService, _terminalConfigurationService, _terminalService, _terminalGroupService, _hoverService, _keybindingService, _listService, _storageService, _themeService, _contextViewService, _commandService) {
        super();
        this._container = _container;
        this._labels = _labels;
        this._getSelection = _getSelection;
        this._instantiationService = _instantiationService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._hoverService = _hoverService;
        this._keybindingService = _keybindingService;
        this._listService = _listService;
        this._storageService = _storageService;
        this._themeService = _themeService;
        this._contextViewService = _contextViewService;
        this._commandService = _commandService;
        this.templateId = 'terminal.tabs';
    }
    renderTemplate(container) {
        const element = DOM.append(container, $('.terminal-tabs-entry'));
        const context = {};
        const label = this._labels.create(element, {
            supportHighlights: true,
            supportDescriptionHighlights: true,
            supportIcons: true,
            hoverDelegate: {
                delay: 0,
                showHover: options => {
                    return this._hoverService.showDelayedHover({
                        ...options,
                        actions: context.hoverActions,
                        target: element,
                        appearance: {
                            showPointer: true
                        },
                        position: {
                            hoverPosition: this._terminalConfigurationService.config.tabs.location === 'left' ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */
                        }
                    }, { groupId: 'terminal-tabs-list' });
                }
            }
        });
        const actionsContainer = DOM.append(label.element, $('.actions'));
        const actionBar = this._register(new ActionBar(actionsContainer, {
            actionRunner: this._register(new TerminalContextActionRunner()),
            actionViewItemProvider: (action, options) => action instanceof MenuItemAction
                ? this._register(this._instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate }))
                : undefined
        }));
        return {
            element,
            label,
            actionBar,
            context,
            elementDisposables: new DisposableStore(),
        };
    }
    shouldHideText() {
        return this._container ? this._container.clientWidth < 63 /* TerminalTabsListSizes.MidpointViewWidth */ : false;
    }
    shouldHideActionBar() {
        return this._container ? this._container.clientWidth <= 105 /* TerminalTabsListSizes.ActionbarMinimumWidth */ : false;
    }
    renderElement(instance, index, template) {
        const hasText = !this.shouldHideText();
        const group = this._terminalGroupService.getGroupForInstance(instance);
        if (!group) {
            throw new Error(`Could not find group for instance "${instance.instanceId}"`);
        }
        template.element.classList.toggle('has-text', hasText);
        template.element.classList.toggle('is-active', this._terminalGroupService.activeInstance === instance);
        let prefix = '';
        if (group.terminalInstances.length > 1) {
            const terminalIndex = group.terminalInstances.indexOf(instance);
            if (terminalIndex === 0) {
                prefix = `┌ `;
            }
            else if (terminalIndex === group.terminalInstances.length - 1) {
                prefix = `└ `;
            }
            else {
                prefix = `├ `;
            }
        }
        const hoverInfo = getInstanceHoverInfo(instance, this._storageService);
        template.context.hoverActions = hoverInfo.actions;
        const iconId = this._instantiationService.invokeFunction(getIconId, instance);
        const hasActionbar = !this.shouldHideActionBar();
        let label = '';
        if (!hasText) {
            const primaryStatus = instance.statusList.primary;
            // Don't show ignore severity
            if (primaryStatus && primaryStatus.severity > Severity.Ignore) {
                label = `${prefix}$(${primaryStatus.icon?.id || iconId})`;
            }
            else {
                label = `${prefix}$(${iconId})`;
            }
        }
        else {
            this.fillActionBar(instance, template);
            label = prefix;
            // Only add the title if the icon is set, this prevents the title jumping around for
            // example when launching with a ShellLaunchConfig.name and no icon
            if (instance.icon) {
                label += `$(${iconId}) ${instance.title}`;
            }
        }
        if (!hasActionbar) {
            template.actionBar.clear();
        }
        // Kill terminal on middle click
        template.elementDisposables.add(DOM.addDisposableListener(template.element, DOM.EventType.AUXCLICK, e => {
            e.stopImmediatePropagation();
            if (e.button === 1 /*middle*/) {
                this._terminalService.safeDisposeTerminal(instance);
            }
        }));
        const extraClasses = [];
        const colorClass = getColorClass(instance);
        if (colorClass) {
            extraClasses.push(colorClass);
        }
        const uriClasses = getUriClasses(instance, this._themeService.getColorTheme().type);
        if (uriClasses) {
            extraClasses.push(...uriClasses);
        }
        template.label.setResource({
            resource: instance.resource,
            name: label,
            description: hasText ? instance.description : undefined
        }, {
            fileDecorations: {
                colors: true,
                badges: hasText
            },
            title: {
                markdown: hoverInfo.content,
                markdownNotSupportedFallback: undefined
            },
            extraClasses
        });
        const editableData = this._terminalService.getEditableData(instance);
        template.label.element.classList.toggle('editable-tab', !!editableData);
        if (editableData) {
            template.elementDisposables.add(this._renderInputBox(template.label.element.querySelector('.monaco-icon-label-container'), instance, editableData));
            template.actionBar.clear();
        }
    }
    _renderInputBox(container, instance, editableData) {
        const value = instance.title || '';
        const inputBox = new InputBox(container, this._contextViewService, {
            validationOptions: {
                validation: (value) => {
                    const message = editableData.validationMessage(value);
                    if (!message || message.severity !== Severity.Error) {
                        return null;
                    }
                    return {
                        content: message.content,
                        formatContent: true,
                        type: 3 /* MessageType.ERROR */
                    };
                }
            },
            ariaLabel: localize('terminalInputAriaLabel', "Type terminal name. Press Enter to confirm or Escape to cancel."),
            inputBoxStyles: defaultInputBoxStyles
        });
        inputBox.element.style.height = '22px';
        inputBox.value = value;
        inputBox.focus();
        inputBox.select({ start: 0, end: value.length });
        const done = createSingleCallFunction((success, finishEditing) => {
            inputBox.element.style.display = 'none';
            const value = inputBox.value;
            dispose(toDispose);
            inputBox.element.remove();
            if (finishEditing) {
                editableData.onFinish(value, success);
            }
        });
        const showInputBoxNotification = () => {
            if (inputBox.isInputValid()) {
                const message = editableData.validationMessage(inputBox.value);
                if (message) {
                    inputBox.showMessage({
                        content: message.content,
                        formatContent: true,
                        type: message.severity === Severity.Info ? 1 /* MessageType.INFO */ : message.severity === Severity.Warning ? 2 /* MessageType.WARNING */ : 3 /* MessageType.ERROR */
                    });
                }
                else {
                    inputBox.hideMessage();
                }
            }
        };
        showInputBoxNotification();
        const toDispose = [
            inputBox,
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => {
                e.stopPropagation();
                if (e.equals(3 /* KeyCode.Enter */)) {
                    done(inputBox.isInputValid(), true);
                }
                else if (e.equals(9 /* KeyCode.Escape */)) {
                    done(false, true);
                }
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_UP, (e) => {
                showInputBoxNotification();
            }),
            DOM.addDisposableListener(inputBox.inputElement, DOM.EventType.BLUR, () => {
                done(inputBox.isInputValid(), true);
            })
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(instance, index, templateData) {
        templateData.elementDisposables.clear();
        templateData.actionBar.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.label.dispose();
        templateData.actionBar.dispose();
    }
    fillActionBar(instance, template) {
        // If the instance is within the selection, split all selected
        const actions = [
            this._register(new Action("workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */, terminalStrings.split.short, ThemeIcon.asClassName(Codicon.splitHorizontal), true, async () => {
                this._runForSelectionOrInstance(instance, async (e) => {
                    this._terminalService.createTerminal({ location: { parentTerminal: e } });
                });
            })),
        ];
        if (instance.shellLaunchConfig.tabActions) {
            for (const action of instance.shellLaunchConfig.tabActions) {
                actions.push(this._register(new Action(action.id, action.label, action.icon ? ThemeIcon.asClassName(action.icon) : undefined, true, async () => {
                    this._runForSelectionOrInstance(instance, e => this._commandService.executeCommand(action.id, instance));
                })));
            }
        }
        actions.push(this._register(new Action("workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */, terminalStrings.kill.short, ThemeIcon.asClassName(Codicon.trashcan), true, async () => {
            this._runForSelectionOrInstance(instance, e => this._terminalService.safeDisposeTerminal(e));
        })));
        // TODO: Cache these in a way that will use the correct instance
        template.actionBar.clear();
        for (const action of actions) {
            template.actionBar.push(action, { icon: true, label: false, keybinding: this._keybindingService.lookupKeybinding(action.id)?.getLabel() });
        }
    }
    _runForSelectionOrInstance(instance, callback) {
        const selection = this._getSelection();
        if (selection.includes(instance)) {
            for (const s of selection) {
                if (s) {
                    callback(s);
                }
            }
        }
        else {
            callback(instance);
        }
        this._terminalGroupService.focusTabs();
        this._listService.lastFocusedList?.focusNext();
    }
};
TerminalTabsRenderer = __decorate([
    __param(3, IInstantiationService),
    __param(4, ITerminalConfigurationService),
    __param(5, ITerminalService),
    __param(6, ITerminalGroupService),
    __param(7, IHoverService),
    __param(8, IKeybindingService),
    __param(9, IListService),
    __param(10, IStorageService),
    __param(11, IThemeService),
    __param(12, IContextViewService),
    __param(13, ICommandService)
], TerminalTabsRenderer);
let TerminalTabsAccessibilityProvider = class TerminalTabsAccessibilityProvider {
    constructor(_terminalGroupService) {
        this._terminalGroupService = _terminalGroupService;
    }
    getWidgetAriaLabel() {
        return localize('terminal.tabs', "Terminal tabs");
    }
    getAriaLabel(instance) {
        let ariaLabel = '';
        const tab = this._terminalGroupService.getGroupForInstance(instance);
        if (tab && tab.terminalInstances?.length > 1) {
            const terminalIndex = tab.terminalInstances.indexOf(instance);
            ariaLabel = localize({
                key: 'splitTerminalAriaLabel',
                comment: [
                    `The terminal's ID`,
                    `The terminal's title`,
                    `The terminal's split number`,
                    `The terminal group's total split number`
                ]
            }, "Terminal {0} {1}, split {2} of {3}", instance.instanceId, instance.title, terminalIndex + 1, tab.terminalInstances.length);
        }
        else {
            ariaLabel = localize({
                key: 'terminalAriaLabel',
                comment: [
                    `The terminal's ID`,
                    `The terminal's title`
                ]
            }, "Terminal {0} {1}", instance.instanceId, instance.title);
        }
        return ariaLabel;
    }
};
TerminalTabsAccessibilityProvider = __decorate([
    __param(0, ITerminalGroupService)
], TerminalTabsAccessibilityProvider);
let TerminalTabsDragAndDrop = class TerminalTabsDragAndDrop extends Disposable {
    constructor(_terminalService, _terminalGroupService, _listService) {
        super();
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._listService = _listService;
        this._autoFocusDisposable = Disposable.None;
        this._primaryBackend = this._terminalService.getPrimaryBackend();
    }
    getDragURI(instance) {
        if (this._terminalService.getEditingTerminal()?.instanceId === instance.instanceId) {
            return null;
        }
        return instance.resource.toString();
    }
    getDragLabel(elements, originalEvent) {
        return elements.length === 1 ? elements[0].title : undefined;
    }
    onDragLeave() {
        this._autoFocusInstance = undefined;
        this._autoFocusDisposable.dispose();
        this._autoFocusDisposable = Disposable.None;
    }
    onDragStart(data, originalEvent) {
        if (!originalEvent.dataTransfer) {
            return;
        }
        const dndData = data.getData();
        if (!Array.isArray(dndData)) {
            return;
        }
        // Attach terminals type to event
        const terminals = dndData.filter(e => 'instanceId' in e);
        if (terminals.length > 0) {
            originalEvent.dataTransfer.setData("Terminals" /* TerminalDataTransfers.Terminals */, JSON.stringify(terminals.map(e => e.resource.toString())));
        }
    }
    onDragOver(data, targetInstance, targetIndex, targetSector, originalEvent) {
        if (data instanceof NativeDragAndDropData) {
            if (!containsDragType(originalEvent, DataTransfers.FILES, DataTransfers.RESOURCES, "Terminals" /* TerminalDataTransfers.Terminals */, CodeDataTransfers.FILES)) {
                return false;
            }
        }
        const didChangeAutoFocusInstance = this._autoFocusInstance !== targetInstance;
        if (didChangeAutoFocusInstance) {
            this._autoFocusDisposable.dispose();
            this._autoFocusInstance = targetInstance;
        }
        if (!targetInstance && !containsDragType(originalEvent, "Terminals" /* TerminalDataTransfers.Terminals */)) {
            return data instanceof ElementsDragAndDropData;
        }
        if (didChangeAutoFocusInstance && targetInstance) {
            this._autoFocusDisposable = disposableTimeout(() => {
                this._terminalService.setActiveInstance(targetInstance);
                this._autoFocusInstance = undefined;
            }, 500, this._store);
        }
        return {
            feedback: targetIndex ? [targetIndex] : undefined,
            accept: true,
            effect: { type: 1 /* ListDragOverEffectType.Move */, position: "drop-target" /* ListDragOverEffectPosition.Over */ }
        };
    }
    async drop(data, targetInstance, targetIndex, targetSector, originalEvent) {
        this._autoFocusDisposable.dispose();
        this._autoFocusInstance = undefined;
        let sourceInstances;
        const promises = [];
        const resources = getTerminalResourcesFromDragEvent(originalEvent);
        if (resources) {
            for (const uri of resources) {
                const instance = this._terminalService.getInstanceFromResource(uri);
                if (instance) {
                    if (Array.isArray(sourceInstances)) {
                        sourceInstances.push(instance);
                    }
                    else {
                        sourceInstances = [instance];
                    }
                    this._terminalService.moveToTerminalView(instance);
                }
                else if (this._primaryBackend) {
                    const terminalIdentifier = parseTerminalUri(uri);
                    if (terminalIdentifier.instanceId) {
                        promises.push(this._primaryBackend.requestDetachInstance(terminalIdentifier.workspaceId, terminalIdentifier.instanceId));
                    }
                }
            }
        }
        if (promises.length) {
            let processes = await Promise.all(promises);
            processes = processes.filter(p => p !== undefined);
            let lastInstance;
            for (const attachPersistentProcess of processes) {
                lastInstance = await this._terminalService.createTerminal({ config: { attachPersistentProcess } });
            }
            if (lastInstance) {
                this._terminalService.setActiveInstance(lastInstance);
            }
            return;
        }
        if (sourceInstances === undefined) {
            if (!(data instanceof ElementsDragAndDropData)) {
                this._handleExternalDrop(targetInstance, originalEvent);
                return;
            }
            const draggedElement = data.getData();
            if (!draggedElement || !Array.isArray(draggedElement)) {
                return;
            }
            sourceInstances = [];
            for (const e of draggedElement) {
                if ('instanceId' in e) {
                    sourceInstances.push(e);
                }
            }
        }
        if (!targetInstance) {
            this._terminalGroupService.moveGroupToEnd(sourceInstances);
            this._terminalService.setActiveInstance(sourceInstances[0]);
            const targetGroup = this._terminalGroupService.getGroupForInstance(sourceInstances[0]);
            if (targetGroup) {
                const index = this._terminalGroupService.groups.indexOf(targetGroup);
                this._listService.lastFocusedList?.setSelection([index]);
            }
            return;
        }
        this._terminalGroupService.moveGroup(sourceInstances, targetInstance);
        this._terminalService.setActiveInstance(sourceInstances[0]);
        const targetGroup = this._terminalGroupService.getGroupForInstance(sourceInstances[0]);
        if (targetGroup) {
            const index = this._terminalGroupService.groups.indexOf(targetGroup);
            this._listService.lastFocusedList?.setSelection([index]);
        }
    }
    async _handleExternalDrop(instance, e) {
        if (!instance || !e.dataTransfer) {
            return;
        }
        // Check if files were dragged from the tree explorer
        let resource;
        const rawResources = e.dataTransfer.getData(DataTransfers.RESOURCES);
        if (rawResources) {
            resource = URI.parse(JSON.parse(rawResources)[0]);
        }
        const rawCodeFiles = e.dataTransfer.getData(CodeDataTransfers.FILES);
        if (!resource && rawCodeFiles) {
            resource = URI.file(JSON.parse(rawCodeFiles)[0]);
        }
        if (!resource && e.dataTransfer.files.length > 0 && getPathForFile(e.dataTransfer.files[0])) {
            // Check if the file was dragged from the filesystem
            resource = URI.file(getPathForFile(e.dataTransfer.files[0]));
        }
        if (!resource) {
            return;
        }
        this._terminalService.setActiveInstance(instance);
        instance.focus();
        await instance.sendPath(resource, false);
    }
};
TerminalTabsDragAndDrop = __decorate([
    __param(0, ITerminalService),
    __param(1, ITerminalGroupService),
    __param(2, IListService)
], TerminalTabsDragAndDrop);
let TabDecorationsProvider = class TabDecorationsProvider extends Disposable {
    constructor(_terminalService) {
        super();
        this._terminalService = _terminalService;
        this.label = localize('label', "Terminal");
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this._terminalService.onAnyInstancePrimaryStatusChange(e => this._onDidChange.fire([e.resource])));
    }
    provideDecorations(resource) {
        if (resource.scheme !== Schemas.vscodeTerminal) {
            return undefined;
        }
        const instance = this._terminalService.getInstanceFromResource(resource);
        if (!instance) {
            return undefined;
        }
        const primaryStatus = instance?.statusList?.primary;
        if (!primaryStatus?.icon) {
            return undefined;
        }
        return {
            color: getColorForSeverity(primaryStatus.severity),
            letter: primaryStatus.icon,
            tooltip: primaryStatus.tooltip
        };
    }
};
TabDecorationsProvider = __decorate([
    __param(0, ITerminalService)
], TabDecorationsProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUYWJzTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxUYWJzTGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLHFCQUFxQixFQUFxQixnQkFBZ0IsRUFBeUIsTUFBTSxlQUFlLENBQUM7QUFDakosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUUxRyxPQUFPLEVBQW9CLGdCQUFnQixFQUFxQixNQUFNLGtEQUFrRCxDQUFDO0FBQ3pILE9BQU8sRUFB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