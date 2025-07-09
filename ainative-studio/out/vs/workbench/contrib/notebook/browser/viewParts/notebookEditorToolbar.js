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
import * as DOM from '../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { DomScrollableElement } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { ToolBar } from '../../../../../base/browser/ui/toolbar/toolbar.js';
import { Separator } from '../../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { MenuEntryActionViewItem, SubmenuEntryActionViewItem } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction, SubmenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { SELECT_KERNEL_ID } from '../controller/coreActions.js';
import { NOTEBOOK_EDITOR_ID, NotebookSetting } from '../../common/notebookCommon.js';
import { NotebooKernelActionViewItem } from './notebookKernelView.js';
import { ActionViewWithLabel, UnifiedSubmenuActionView } from '../view/cellParts/cellActionView.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { disposableTimeout } from '../../../../../base/common/async.js';
import { WorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { WorkbenchHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
export var RenderLabel;
(function (RenderLabel) {
    RenderLabel[RenderLabel["Always"] = 0] = "Always";
    RenderLabel[RenderLabel["Never"] = 1] = "Never";
    RenderLabel[RenderLabel["Dynamic"] = 2] = "Dynamic";
})(RenderLabel || (RenderLabel = {}));
export function convertConfiguration(value) {
    switch (value) {
        case true:
            return RenderLabel.Always;
        case false:
            return RenderLabel.Never;
        case 'always':
            return RenderLabel.Always;
        case 'never':
            return RenderLabel.Never;
        case 'dynamic':
            return RenderLabel.Dynamic;
    }
}
const ICON_ONLY_ACTION_WIDTH = 21;
const TOGGLE_MORE_ACTION_WIDTH = 21;
const ACTION_PADDING = 8;
class WorkbenchAlwaysLabelStrategy {
    constructor(notebookEditor, editorToolbar, goToMenu, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.editorToolbar = editorToolbar;
        this.goToMenu = goToMenu;
        this.instantiationService = instantiationService;
    }
    actionProvider(action, options) {
        if (action.id === SELECT_KERNEL_ID) {
            //	this is being disposed by the consumer
            return this.instantiationService.createInstance(NotebooKernelActionViewItem, action, this.notebookEditor, options);
        }
        if (action instanceof MenuItemAction) {
            return this.instantiationService.createInstance(ActionViewWithLabel, action, { hoverDelegate: options.hoverDelegate });
        }
        if (action instanceof SubmenuItemAction && action.item.submenu.id === MenuId.NotebookCellExecuteGoTo.id) {
            return this.instantiationService.createInstance(UnifiedSubmenuActionView, action, { hoverDelegate: options.hoverDelegate }, true, {
                getActions: () => {
                    return this.goToMenu.getActions().find(([group]) => group === 'navigation/execute')?.[1] ?? [];
                }
            }, this.actionProvider.bind(this));
        }
        return undefined;
    }
    calculateActions(leftToolbarContainerMaxWidth) {
        const initialPrimaryActions = this.editorToolbar.primaryActions;
        const initialSecondaryActions = this.editorToolbar.secondaryActions;
        const actionOutput = workbenchCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth);
        return {
            primaryActions: actionOutput.primaryActions.map(a => a.action),
            secondaryActions: actionOutput.secondaryActions
        };
    }
}
class WorkbenchNeverLabelStrategy {
    constructor(notebookEditor, editorToolbar, goToMenu, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.editorToolbar = editorToolbar;
        this.goToMenu = goToMenu;
        this.instantiationService = instantiationService;
    }
    actionProvider(action, options) {
        if (action.id === SELECT_KERNEL_ID) {
            //	this is being disposed by the consumer
            return this.instantiationService.createInstance(NotebooKernelActionViewItem, action, this.notebookEditor, options);
        }
        if (action instanceof MenuItemAction) {
            return this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate });
        }
        if (action instanceof SubmenuItemAction) {
            if (action.item.submenu.id === MenuId.NotebookCellExecuteGoTo.id) {
                return this.instantiationService.createInstance(UnifiedSubmenuActionView, action, { hoverDelegate: options.hoverDelegate }, false, {
                    getActions: () => {
                        return this.goToMenu.getActions().find(([group]) => group === 'navigation/execute')?.[1] ?? [];
                    }
                }, this.actionProvider.bind(this));
            }
            else {
                return this.instantiationService.createInstance(SubmenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate });
            }
        }
        return undefined;
    }
    calculateActions(leftToolbarContainerMaxWidth) {
        const initialPrimaryActions = this.editorToolbar.primaryActions;
        const initialSecondaryActions = this.editorToolbar.secondaryActions;
        const actionOutput = workbenchCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth);
        return {
            primaryActions: actionOutput.primaryActions.map(a => a.action),
            secondaryActions: actionOutput.secondaryActions
        };
    }
}
class WorkbenchDynamicLabelStrategy {
    constructor(notebookEditor, editorToolbar, goToMenu, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.editorToolbar = editorToolbar;
        this.goToMenu = goToMenu;
        this.instantiationService = instantiationService;
    }
    actionProvider(action, options) {
        if (action.id === SELECT_KERNEL_ID) {
            //	this is being disposed by the consumer
            return this.instantiationService.createInstance(NotebooKernelActionViewItem, action, this.notebookEditor, options);
        }
        const a = this.editorToolbar.primaryActions.find(a => a.action.id === action.id);
        if (!a || a.renderLabel) {
            if (action instanceof MenuItemAction) {
                return this.instantiationService.createInstance(ActionViewWithLabel, action, { hoverDelegate: options.hoverDelegate });
            }
            if (action instanceof SubmenuItemAction && action.item.submenu.id === MenuId.NotebookCellExecuteGoTo.id) {
                return this.instantiationService.createInstance(UnifiedSubmenuActionView, action, { hoverDelegate: options.hoverDelegate }, true, {
                    getActions: () => {
                        return this.goToMenu.getActions().find(([group]) => group === 'navigation/execute')?.[1] ?? [];
                    }
                }, this.actionProvider.bind(this));
            }
            return undefined;
        }
        else {
            if (action instanceof MenuItemAction) {
                this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate });
            }
            if (action instanceof SubmenuItemAction) {
                if (action.item.submenu.id === MenuId.NotebookCellExecuteGoTo.id) {
                    return this.instantiationService.createInstance(UnifiedSubmenuActionView, action, { hoverDelegate: options.hoverDelegate }, false, {
                        getActions: () => {
                            return this.goToMenu.getActions().find(([group]) => group === 'navigation/execute')?.[1] ?? [];
                        }
                    }, this.actionProvider.bind(this));
                }
                else {
                    return this.instantiationService.createInstance(SubmenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate });
                }
            }
            return undefined;
        }
    }
    calculateActions(leftToolbarContainerMaxWidth) {
        const initialPrimaryActions = this.editorToolbar.primaryActions;
        const initialSecondaryActions = this.editorToolbar.secondaryActions;
        const actionOutput = workbenchDynamicCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth);
        return {
            primaryActions: actionOutput.primaryActions.map(a => a.action),
            secondaryActions: actionOutput.secondaryActions
        };
    }
}
let NotebookEditorWorkbenchToolbar = class NotebookEditorWorkbenchToolbar extends Disposable {
    get primaryActions() {
        return this._primaryActions;
    }
    get secondaryActions() {
        return this._secondaryActions;
    }
    set visible(visible) {
        if (this._visible !== visible) {
            this._visible = visible;
            this._onDidChangeVisibility.fire(visible);
        }
    }
    get useGlobalToolbar() {
        return this._useGlobalToolbar;
    }
    constructor(notebookEditor, contextKeyService, notebookOptions, domNode, instantiationService, configurationService, contextMenuService, menuService, editorService, keybindingService, experimentService) {
        super();
        this.notebookEditor = notebookEditor;
        this.contextKeyService = contextKeyService;
        this.notebookOptions = notebookOptions;
        this.domNode = domNode;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.editorService = editorService;
        this.keybindingService = keybindingService;
        this.experimentService = experimentService;
        this._useGlobalToolbar = false;
        this._renderLabel = RenderLabel.Always;
        this._visible = false;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._dimension = null;
        this._primaryActions = [];
        this._secondaryActions = [];
        this._buildBody();
        this._register(Event.debounce(this.editorService.onDidActiveEditorChange, (last, _current) => last, 200)(this._updatePerEditorChange, this));
        this._registerNotebookActionsToolbar();
        this._register(DOM.addDisposableListener(this.domNode, DOM.EventType.CONTEXT_MENU, e => {
            const event = new StandardMouseEvent(DOM.getWindow(this.domNode), e);
            this.contextMenuService.showContextMenu({
                menuId: MenuId.NotebookToolbarContext,
                getAnchor: () => event,
            });
        }));
    }
    _buildBody() {
        this._notebookTopLeftToolbarContainer = document.createElement('div');
        this._notebookTopLeftToolbarContainer.classList.add('notebook-toolbar-left');
        this._leftToolbarScrollable = new DomScrollableElement(this._notebookTopLeftToolbarContainer, {
            vertical: 2 /* ScrollbarVisibility.Hidden */,
            horizontal: 3 /* ScrollbarVisibility.Visible */,
            horizontalScrollbarSize: 3,
            useShadows: false,
            scrollYToX: true
        });
        this._register(this._leftToolbarScrollable);
        DOM.append(this.domNode, this._leftToolbarScrollable.getDomNode());
        this._notebookTopRightToolbarContainer = document.createElement('div');
        this._notebookTopRightToolbarContainer.classList.add('notebook-toolbar-right');
        DOM.append(this.domNode, this._notebookTopRightToolbarContainer);
    }
    _updatePerEditorChange() {
        if (this.editorService.activeEditorPane?.getId() === NOTEBOOK_EDITOR_ID) {
            const notebookEditor = this.editorService.activeEditorPane.getControl();
            if (notebookEditor === this.notebookEditor) {
                // this is the active editor
                this._showNotebookActionsinEditorToolbar();
                return;
            }
        }
    }
    _registerNotebookActionsToolbar() {
        this._notebookGlobalActionsMenu = this._register(this.menuService.createMenu(this.notebookEditor.creationOptions.menuIds.notebookToolbar, this.contextKeyService));
        this._executeGoToActionsMenu = this._register(this.menuService.createMenu(MenuId.NotebookCellExecuteGoTo, this.contextKeyService));
        this._useGlobalToolbar = this.notebookOptions.getDisplayOptions().globalToolbar;
        this._renderLabel = this._convertConfiguration(this.configurationService.getValue(NotebookSetting.globalToolbarShowLabel));
        this._updateStrategy();
        const context = {
            ui: true,
            notebookEditor: this.notebookEditor,
            source: 'notebookToolbar'
        };
        const actionProvider = (action, options) => {
            if (action.id === SELECT_KERNEL_ID) {
                // this is being disposed by the consumer
                return this.instantiationService.createInstance(NotebooKernelActionViewItem, action, this.notebookEditor, options);
            }
            if (this._renderLabel !== RenderLabel.Never) {
                const a = this._primaryActions.find(a => a.action.id === action.id);
                if (a && a.renderLabel) {
                    return action instanceof MenuItemAction ? this.instantiationService.createInstance(ActionViewWithLabel, action, { hoverDelegate: options.hoverDelegate }) : undefined;
                }
                else {
                    return action instanceof MenuItemAction ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate }) : undefined;
                }
            }
            else {
                return action instanceof MenuItemAction ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate }) : undefined;
            }
        };
        // Make sure both toolbars have the same hover delegate for instant hover to work
        // Due to the elements being further apart than normal toolbars, the default time limit is to short and has to be increased
        const hoverDelegate = this._register(this.instantiationService.createInstance(WorkbenchHoverDelegate, 'element', { instantHover: true }, {}));
        hoverDelegate.setInstantHoverTimeLimit(600);
        const leftToolbarOptions = {
            hiddenItemStrategy: 1 /* HiddenItemStrategy.RenderInSecondaryGroup */,
            resetMenu: MenuId.NotebookToolbar,
            actionViewItemProvider: (action, options) => {
                return this._strategy.actionProvider(action, options);
            },
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id),
            renderDropdownAsChildElement: true,
            hoverDelegate
        };
        this._notebookLeftToolbar = this.instantiationService.createInstance(WorkbenchToolBar, this._notebookTopLeftToolbarContainer, leftToolbarOptions);
        this._register(this._notebookLeftToolbar);
        this._notebookLeftToolbar.context = context;
        this._notebookRightToolbar = new ToolBar(this._notebookTopRightToolbarContainer, this.contextMenuService, {
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id),
            actionViewItemProvider: actionProvider,
            renderDropdownAsChildElement: true,
            hoverDelegate
        });
        this._register(this._notebookRightToolbar);
        this._notebookRightToolbar.context = context;
        this._showNotebookActionsinEditorToolbar();
        let dropdownIsVisible = false;
        let deferredUpdate;
        this._register(this._notebookGlobalActionsMenu.onDidChange(() => {
            if (dropdownIsVisible) {
                deferredUpdate = () => this._showNotebookActionsinEditorToolbar();
                return;
            }
            if (this.notebookEditor.isVisible) {
                this._showNotebookActionsinEditorToolbar();
            }
        }));
        this._register(this._notebookLeftToolbar.onDidChangeDropdownVisibility(visible => {
            dropdownIsVisible = visible;
            if (deferredUpdate && !visible) {
                setTimeout(() => {
                    deferredUpdate?.();
                }, 0);
                deferredUpdate = undefined;
            }
        }));
        this._register(this.notebookOptions.onDidChangeOptions(e => {
            if (e.globalToolbar !== undefined) {
                this._useGlobalToolbar = this.notebookOptions.getDisplayOptions().globalToolbar;
                this._showNotebookActionsinEditorToolbar();
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.globalToolbarShowLabel)) {
                this._renderLabel = this._convertConfiguration(this.configurationService.getValue(NotebookSetting.globalToolbarShowLabel));
                this._updateStrategy();
                const oldElement = this._notebookLeftToolbar.getElement();
                oldElement.remove();
                this._notebookLeftToolbar.dispose();
                this._notebookLeftToolbar = this.instantiationService.createInstance(WorkbenchToolBar, this._notebookTopLeftToolbarContainer, leftToolbarOptions);
                this._register(this._notebookLeftToolbar);
                this._notebookLeftToolbar.context = context;
                this._showNotebookActionsinEditorToolbar();
                return;
            }
        }));
        if (this.experimentService) {
            this.experimentService.getTreatment('nbtoolbarineditor').then(treatment => {
                if (treatment === undefined) {
                    return;
                }
                if (this._useGlobalToolbar !== treatment) {
                    this._useGlobalToolbar = treatment;
                    this._showNotebookActionsinEditorToolbar();
                }
            });
        }
    }
    _updateStrategy() {
        switch (this._renderLabel) {
            case RenderLabel.Always:
                this._strategy = new WorkbenchAlwaysLabelStrategy(this.notebookEditor, this, this._executeGoToActionsMenu, this.instantiationService);
                break;
            case RenderLabel.Never:
                this._strategy = new WorkbenchNeverLabelStrategy(this.notebookEditor, this, this._executeGoToActionsMenu, this.instantiationService);
                break;
            case RenderLabel.Dynamic:
                this._strategy = new WorkbenchDynamicLabelStrategy(this.notebookEditor, this, this._executeGoToActionsMenu, this.instantiationService);
                break;
        }
    }
    _convertConfiguration(value) {
        switch (value) {
            case true:
                return RenderLabel.Always;
            case false:
                return RenderLabel.Never;
            case 'always':
                return RenderLabel.Always;
            case 'never':
                return RenderLabel.Never;
            case 'dynamic':
                return RenderLabel.Dynamic;
        }
    }
    _showNotebookActionsinEditorToolbar() {
        // when there is no view model, just ignore.
        if (!this.notebookEditor.hasModel()) {
            this._deferredActionUpdate?.dispose();
            this._deferredActionUpdate = undefined;
            this.visible = false;
            return;
        }
        if (this._deferredActionUpdate) {
            return;
        }
        if (!this._useGlobalToolbar) {
            this.domNode.style.display = 'none';
            this._deferredActionUpdate = undefined;
            this.visible = false;
        }
        else {
            this._deferredActionUpdate = disposableTimeout(async () => {
                await this._setNotebookActions();
                this.visible = true;
                this._deferredActionUpdate?.dispose();
                this._deferredActionUpdate = undefined;
            }, 50);
        }
    }
    async _setNotebookActions() {
        const groups = this._notebookGlobalActionsMenu.getActions({ shouldForwardArgs: true, renderShortTitle: true });
        this.domNode.style.display = 'flex';
        const primaryLeftGroups = groups.filter(group => /^navigation/.test(group[0]));
        const primaryActions = [];
        primaryLeftGroups.sort((a, b) => {
            if (a[0] === 'navigation') {
                return 1;
            }
            if (b[0] === 'navigation') {
                return -1;
            }
            return 0;
        }).forEach((group, index) => {
            primaryActions.push(...group[1]);
            if (index < primaryLeftGroups.length - 1) {
                primaryActions.push(new Separator());
            }
        });
        const primaryRightGroup = groups.find(group => /^status/.test(group[0]));
        const primaryRightActions = primaryRightGroup ? primaryRightGroup[1] : [];
        const secondaryActions = groups.filter(group => !/^navigation/.test(group[0]) && !/^status/.test(group[0])).reduce((prev, curr) => { prev.push(...curr[1]); return prev; }, []);
        this._notebookLeftToolbar.setActions([], []);
        this._primaryActions = primaryActions.map(action => ({
            action: action,
            size: (action instanceof Separator ? 1 : 0),
            renderLabel: true,
            visible: true
        }));
        this._notebookLeftToolbar.setActions(primaryActions, secondaryActions);
        this._secondaryActions = secondaryActions;
        this._notebookRightToolbar.setActions(primaryRightActions, []);
        this._secondaryActions = secondaryActions;
        if (this._dimension && this._dimension.width >= 0 && this._dimension.height >= 0) {
            this._cacheItemSizes(this._notebookLeftToolbar);
        }
        this._computeSizes();
    }
    _cacheItemSizes(toolbar) {
        for (let i = 0; i < toolbar.getItemsLength(); i++) {
            const action = toolbar.getItemAction(i);
            if (action && action.id !== 'toolbar.toggle.more') {
                const existing = this._primaryActions.find(a => a.action.id === action.id);
                if (existing) {
                    existing.size = toolbar.getItemWidth(i);
                }
            }
        }
    }
    _computeSizes() {
        const toolbar = this._notebookLeftToolbar;
        const rightToolbar = this._notebookRightToolbar;
        if (toolbar && rightToolbar && this._dimension && this._dimension.height >= 0 && this._dimension.width >= 0) {
            // compute size only if it's visible
            if (this._primaryActions.length === 0 && toolbar.getItemsLength() !== this._primaryActions.length) {
                this._cacheItemSizes(this._notebookLeftToolbar);
            }
            if (this._primaryActions.length === 0) {
                return;
            }
            const kernelWidth = (rightToolbar.getItemsLength() ? rightToolbar.getItemWidth(0) : 0) + ACTION_PADDING;
            const leftToolbarContainerMaxWidth = this._dimension.width - kernelWidth - (ACTION_PADDING + TOGGLE_MORE_ACTION_WIDTH) - ( /** toolbar left margin */ACTION_PADDING) - ( /** toolbar right margin */ACTION_PADDING);
            const calculatedActions = this._strategy.calculateActions(leftToolbarContainerMaxWidth);
            this._notebookLeftToolbar.setActions(calculatedActions.primaryActions, calculatedActions.secondaryActions);
        }
    }
    layout(dimension) {
        this._dimension = dimension;
        if (!this._useGlobalToolbar) {
            this.domNode.style.display = 'none';
        }
        else {
            this.domNode.style.display = 'flex';
        }
        this._computeSizes();
    }
    dispose() {
        this._notebookLeftToolbar.context = undefined;
        this._notebookRightToolbar.context = undefined;
        this._notebookLeftToolbar.dispose();
        this._notebookRightToolbar.dispose();
        this._notebookLeftToolbar = null;
        this._notebookRightToolbar = null;
        this._deferredActionUpdate?.dispose();
        this._deferredActionUpdate = undefined;
        super.dispose();
    }
};
NotebookEditorWorkbenchToolbar = __decorate([
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, IContextMenuService),
    __param(7, IMenuService),
    __param(8, IEditorService),
    __param(9, IKeybindingService),
    __param(10, IWorkbenchAssignmentService)
], NotebookEditorWorkbenchToolbar);
export { NotebookEditorWorkbenchToolbar };
export function workbenchCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth) {
    return actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, false);
}
export function workbenchDynamicCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth) {
    if (initialPrimaryActions.length === 0) {
        return { primaryActions: [], secondaryActions: initialSecondaryActions };
    }
    // find true length of array, add 1 for each primary actions, ignoring an item when size = 0
    const visibleActionLength = initialPrimaryActions.filter(action => action.size !== 0).length;
    // step 1: try to fit all primary actions
    const totalWidthWithLabels = initialPrimaryActions.map(action => action.size).reduce((a, b) => a + b, 0) + (visibleActionLength - 1) * ACTION_PADDING;
    if (totalWidthWithLabels <= leftToolbarContainerMaxWidth) {
        initialPrimaryActions.forEach(action => {
            action.renderLabel = true;
        });
        return actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, false);
    }
    // step 2: check if they fit without labels
    if ((visibleActionLength * ICON_ONLY_ACTION_WIDTH + (visibleActionLength - 1) * ACTION_PADDING) > leftToolbarContainerMaxWidth) {
        initialPrimaryActions.forEach(action => { action.renderLabel = false; });
        return actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, true);
    }
    // step 3: render as many actions as possible with labels, rest without.
    let sum = 0;
    let lastActionWithLabel = -1;
    for (let i = 0; i < initialPrimaryActions.length; i++) {
        sum += initialPrimaryActions[i].size + ACTION_PADDING;
        if (initialPrimaryActions[i].action instanceof Separator) {
            // find group separator
            const remainingItems = initialPrimaryActions.slice(i + 1).filter(action => action.size !== 0); // todo: need to exclude size 0 items from this
            const newTotalSum = sum + (remainingItems.length === 0 ? 0 : (remainingItems.length * ICON_ONLY_ACTION_WIDTH + (remainingItems.length - 1) * ACTION_PADDING));
            if (newTotalSum <= leftToolbarContainerMaxWidth) {
                lastActionWithLabel = i;
            }
        }
        else {
            continue;
        }
    }
    // icons only don't fit either
    if (lastActionWithLabel < 0) {
        initialPrimaryActions.forEach(action => { action.renderLabel = false; });
        return actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, true);
    }
    // render labels for the actions that have space
    initialPrimaryActions.slice(0, lastActionWithLabel + 1).forEach(action => { action.renderLabel = true; });
    initialPrimaryActions.slice(lastActionWithLabel + 1).forEach(action => { action.renderLabel = false; });
    return {
        primaryActions: initialPrimaryActions,
        secondaryActions: initialSecondaryActions
    };
}
function actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, iconOnly) {
    const renderActions = [];
    const overflow = [];
    let currentSize = 0;
    let nonZeroAction = false;
    let containerFull = false;
    if (initialPrimaryActions.length === 0) {
        return { primaryActions: [], secondaryActions: initialSecondaryActions };
    }
    for (let i = 0; i < initialPrimaryActions.length; i++) {
        const actionModel = initialPrimaryActions[i];
        const itemSize = iconOnly ? (actionModel.size === 0 ? 0 : ICON_ONLY_ACTION_WIDTH) : actionModel.size;
        // if two separators in a row, ignore the second
        if (actionModel.action instanceof Separator && renderActions.length > 0 && renderActions[renderActions.length - 1].action instanceof Separator) {
            continue;
        }
        // if a separator is the first nonZero action, ignore it
        if (actionModel.action instanceof Separator && !nonZeroAction) {
            continue;
        }
        if (currentSize + itemSize <= leftToolbarContainerMaxWidth && !containerFull) {
            currentSize += ACTION_PADDING + itemSize;
            renderActions.push(actionModel);
            if (itemSize !== 0) {
                nonZeroAction = true;
            }
            if (actionModel.action instanceof Separator) {
                nonZeroAction = false;
            }
        }
        else {
            containerFull = true;
            if (itemSize === 0) { // size 0 implies a hidden item, keep in primary to allow for Workbench to handle visibility
                renderActions.push(actionModel);
            }
            else {
                if (actionModel.action instanceof Separator) { // never push a separator to overflow
                    continue;
                }
                overflow.push(actionModel.action);
            }
        }
    }
    for (let i = (renderActions.length - 1); i > 0; i--) {
        const temp = renderActions[i];
        if (temp.size === 0) {
            continue;
        }
        if (temp.action instanceof Separator) {
            renderActions.splice(i, 1);
        }
        break;
    }
    if (renderActions.length && renderActions[renderActions.length - 1].action instanceof Separator) {
        renderActions.pop();
    }
    if (overflow.length !== 0) {
        overflow.push(new Separator());
    }
    if (iconOnly) {
        // if icon only mode, don't render both (+ code) and (+ markdown) buttons. remove of markdown action
        const markdownIndex = renderActions.findIndex(a => a.action.id === 'notebook.cell.insertMarkdownCellBelow');
        if (markdownIndex !== -1) {
            renderActions.splice(markdownIndex, 1);
        }
    }
    return {
        primaryActions: renderActions,
        secondaryActions: [...overflow, ...initialSecondaryActions]
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JUb29sYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld1BhcnRzL25vdGVib29rRWRpdG9yVG9vbGJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RSxPQUFPLEVBQVcsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFFbEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDekksT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGdC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