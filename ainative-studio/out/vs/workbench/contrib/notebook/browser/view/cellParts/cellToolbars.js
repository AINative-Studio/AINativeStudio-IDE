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
import * as DOM from '../../../../../../base/browser/dom.js';
import { ToolBar } from '../../../../../../base/browser/ui/toolbar/toolbar.js';
import { disposableTimeout } from '../../../../../../base/common/async.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { createActionViewItem, getActionBarActions, MenuEntryActionViewItem } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction } from '../../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { CodiconActionViewItem } from './cellActionView.js';
import { CellOverlayPart } from '../cellPart.js';
import { registerCellToolbarStickyScroll } from './cellToolbarStickyScroll.js';
import { WorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { createInstantHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
let BetweenCellToolbar = class BetweenCellToolbar extends CellOverlayPart {
    constructor(_notebookEditor, _titleToolbarContainer, _bottomCellToolbarContainer, instantiationService, contextMenuService, contextKeyService, menuService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._bottomCellToolbarContainer = _bottomCellToolbarContainer;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
    }
    _initialize() {
        if (this._betweenCellToolbar) {
            return this._betweenCellToolbar;
        }
        const betweenCellToolbar = this._register(new ToolBar(this._bottomCellToolbarContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    if (this._notebookEditor.notebookOptions.getDisplayOptions().insertToolbarAlignment === 'center') {
                        return this.instantiationService.createInstance(CodiconActionViewItem, action, { hoverDelegate: options.hoverDelegate });
                    }
                    else {
                        return this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate });
                    }
                }
                return undefined;
            }
        }));
        this._betweenCellToolbar = betweenCellToolbar;
        const menu = this._register(this.menuService.createMenu(this._notebookEditor.creationOptions.menuIds.cellInsertToolbar, this.contextKeyService));
        const updateActions = () => {
            const actions = getCellToolbarActions(menu);
            betweenCellToolbar.setActions(actions.primary, actions.secondary);
        };
        this._register(menu.onDidChange(() => updateActions()));
        this._register(this._notebookEditor.notebookOptions.onDidChangeOptions((e) => {
            if (e.insertToolbarAlignment) {
                updateActions();
            }
        }));
        updateActions();
        return betweenCellToolbar;
    }
    didRenderCell(element) {
        const betweenCellToolbar = this._initialize();
        if (this._notebookEditor.hasModel()) {
            betweenCellToolbar.context = {
                ui: true,
                cell: element,
                notebookEditor: this._notebookEditor,
                source: 'insertToolbar',
                $mid: 13 /* MarshalledId.NotebookCellActionContext */
            };
        }
        this.updateInternalLayoutNow(element);
    }
    updateInternalLayoutNow(element) {
        const bottomToolbarOffset = element.layoutInfo.bottomToolbarOffset;
        this._bottomCellToolbarContainer.style.transform = `translateY(${bottomToolbarOffset}px)`;
    }
};
BetweenCellToolbar = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IMenuService)
], BetweenCellToolbar);
export { BetweenCellToolbar };
let CellTitleToolbarPart = class CellTitleToolbarPart extends CellOverlayPart {
    get hasActions() {
        if (!this._model) {
            return false;
        }
        return this._model.actions.primary.length
            + this._model.actions.secondary.length
            + this._model.deleteActions.primary.length
            + this._model.deleteActions.secondary.length
            > 0;
    }
    constructor(toolbarContainer, _rootClassDelegate, toolbarId, deleteToolbarId, _notebookEditor, contextKeyService, menuService, instantiationService) {
        super();
        this.toolbarContainer = toolbarContainer;
        this._rootClassDelegate = _rootClassDelegate;
        this.toolbarId = toolbarId;
        this.deleteToolbarId = deleteToolbarId;
        this._notebookEditor = _notebookEditor;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.instantiationService = instantiationService;
        this._onDidUpdateActions = this._register(new Emitter());
        this.onDidUpdateActions = this._onDidUpdateActions.event;
    }
    _initializeModel() {
        if (this._model) {
            return this._model;
        }
        const titleMenu = this._register(this.menuService.createMenu(this.toolbarId, this.contextKeyService));
        const deleteMenu = this._register(this.menuService.createMenu(this.deleteToolbarId, this.contextKeyService));
        const actions = getCellToolbarActions(titleMenu);
        const deleteActions = getCellToolbarActions(deleteMenu);
        this._model = {
            titleMenu,
            actions,
            deleteMenu,
            deleteActions
        };
        return this._model;
    }
    _initialize(model, element) {
        if (this._view) {
            return this._view;
        }
        const hoverDelegate = this._register(createInstantHoverDelegate());
        const toolbar = this._register(this.instantiationService.createInstance(WorkbenchToolBar, this.toolbarContainer, {
            actionViewItemProvider: (action, options) => {
                return createActionViewItem(this.instantiationService, action, options);
            },
            renderDropdownAsChildElement: true,
            hoverDelegate
        }));
        const deleteToolbar = this._register(this.instantiationService.invokeFunction(accessor => createDeleteToolbar(accessor, this.toolbarContainer, hoverDelegate, 'cell-delete-toolbar')));
        if (model.deleteActions.primary.length !== 0 || model.deleteActions.secondary.length !== 0) {
            deleteToolbar.setActions(model.deleteActions.primary, model.deleteActions.secondary);
        }
        this.setupChangeListeners(toolbar, model.titleMenu, model.actions);
        this.setupChangeListeners(deleteToolbar, model.deleteMenu, model.deleteActions);
        this._view = {
            toolbar,
            deleteToolbar
        };
        return this._view;
    }
    prepareRenderCell(element) {
        this._initializeModel();
    }
    didRenderCell(element) {
        const model = this._initializeModel();
        const view = this._initialize(model, element);
        this.cellDisposables.add(registerCellToolbarStickyScroll(this._notebookEditor, element, this.toolbarContainer, { extraOffset: 4, min: -14 }));
        if (this._notebookEditor.hasModel()) {
            const toolbarContext = {
                ui: true,
                cell: element,
                notebookEditor: this._notebookEditor,
                source: 'cellToolbar',
                $mid: 13 /* MarshalledId.NotebookCellActionContext */
            };
            this.updateContext(view, toolbarContext);
        }
    }
    updateContext(view, toolbarContext) {
        view.toolbar.context = toolbarContext;
        view.deleteToolbar.context = toolbarContext;
    }
    setupChangeListeners(toolbar, menu, initActions) {
        // #103926
        let dropdownIsVisible = false;
        let deferredUpdate;
        this.updateActions(toolbar, initActions);
        this._register(menu.onDidChange(() => {
            if (dropdownIsVisible) {
                const actions = getCellToolbarActions(menu);
                deferredUpdate = () => this.updateActions(toolbar, actions);
                return;
            }
            const actions = getCellToolbarActions(menu);
            this.updateActions(toolbar, actions);
        }));
        this._rootClassDelegate.toggle('cell-toolbar-dropdown-active', false);
        this._register(toolbar.onDidChangeDropdownVisibility(visible => {
            dropdownIsVisible = visible;
            this._rootClassDelegate.toggle('cell-toolbar-dropdown-active', visible);
            if (deferredUpdate && !visible) {
                disposableTimeout(() => {
                    deferredUpdate?.();
                }, 0, this._store);
                deferredUpdate = undefined;
            }
        }));
    }
    updateActions(toolbar, actions) {
        const hadFocus = DOM.isAncestorOfActiveElement(toolbar.getElement());
        toolbar.setActions(actions.primary, actions.secondary);
        if (hadFocus) {
            this._notebookEditor.focus();
        }
        if (actions.primary.length || actions.secondary.length) {
            this._rootClassDelegate.toggle('cell-has-toolbar-actions', true);
            this._onDidUpdateActions.fire();
        }
        else {
            this._rootClassDelegate.toggle('cell-has-toolbar-actions', false);
            this._onDidUpdateActions.fire();
        }
    }
};
CellTitleToolbarPart = __decorate([
    __param(5, IContextKeyService),
    __param(6, IMenuService),
    __param(7, IInstantiationService)
], CellTitleToolbarPart);
export { CellTitleToolbarPart };
function getCellToolbarActions(menu) {
    return getActionBarActions(menu.getActions({ shouldForwardArgs: true }), g => /^inline/.test(g));
}
function createDeleteToolbar(accessor, container, hoverDelegate, elementClass) {
    const contextMenuService = accessor.get(IContextMenuService);
    const keybindingService = accessor.get(IKeybindingService);
    const instantiationService = accessor.get(IInstantiationService);
    const toolbar = new ToolBar(container, contextMenuService, {
        getKeyBinding: action => keybindingService.lookupKeybinding(action.id),
        actionViewItemProvider: (action, options) => {
            return createActionViewItem(instantiationService, action, options);
        },
        renderDropdownAsChildElement: true,
        hoverDelegate
    });
    if (elementClass) {
        toolbar.getElement().classList.add(elementClass);
    }
    return toolbar;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFRvb2xiYXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbFRvb2xiYXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRS9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSx3Q0FBd0MsQ0FBQztBQUd4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQThCLE1BQU0sdUVBQXVFLENBQUM7QUFDdkwsT0FBTyxFQUFTLFlBQVksRUFBVSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDakQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFD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