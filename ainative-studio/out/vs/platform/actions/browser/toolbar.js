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
import { addDisposableListener, getWindow } from '../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { ToggleMenuAction, ToolBar } from '../../../base/browser/ui/toolbar/toolbar.js';
import { Separator, toAction } from '../../../base/common/actions.js';
import { coalesceInPlace } from '../../../base/common/arrays.js';
import { intersection } from '../../../base/common/collections.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { createActionViewItem, getActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction, SubmenuItemAction } from '../common/actions.js';
import { createConfigureKeybindingAction } from '../common/menuService.js';
import { ICommandService } from '../../commands/common/commands.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IContextMenuService } from '../../contextview/browser/contextView.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IActionViewItemService } from './actionViewItemService.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
export var HiddenItemStrategy;
(function (HiddenItemStrategy) {
    /** This toolbar doesn't support hiding*/
    HiddenItemStrategy[HiddenItemStrategy["NoHide"] = -1] = "NoHide";
    /** Hidden items aren't shown anywhere */
    HiddenItemStrategy[HiddenItemStrategy["Ignore"] = 0] = "Ignore";
    /** Hidden items move into the secondary group */
    HiddenItemStrategy[HiddenItemStrategy["RenderInSecondaryGroup"] = 1] = "RenderInSecondaryGroup";
})(HiddenItemStrategy || (HiddenItemStrategy = {}));
/**
 * The `WorkbenchToolBar` does
 * - support hiding of menu items
 * - lookup keybindings for each actions automatically
 * - send `workbenchActionExecuted`-events for each action
 *
 * See {@link MenuWorkbenchToolBar} for a toolbar that is backed by a menu.
 */
let WorkbenchToolBar = class WorkbenchToolBar extends ToolBar {
    constructor(container, _options, _menuService, _contextKeyService, _contextMenuService, _keybindingService, _commandService, telemetryService) {
        super(container, _contextMenuService, {
            // defaults
            getKeyBinding: (action) => _keybindingService.lookupKeybinding(action.id) ?? undefined,
            // options (override defaults)
            ..._options,
            // mandatory (overide options)
            allowContextMenu: true,
            skipTelemetry: typeof _options?.telemetrySource === 'string',
        });
        this._options = _options;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._commandService = _commandService;
        this._sessionDisposables = this._store.add(new DisposableStore());
        // telemetry logic
        const telemetrySource = _options?.telemetrySource;
        if (telemetrySource) {
            this._store.add(this.actionBar.onDidRun(e => telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: telemetrySource })));
        }
    }
    setActions(_primary, _secondary = [], menuIds) {
        this._sessionDisposables.clear();
        const primary = _primary.slice(); // for hiding and overflow we set some items to undefined
        const secondary = _secondary.slice();
        const toggleActions = [];
        let toggleActionsCheckedCount = 0;
        const extraSecondary = [];
        let someAreHidden = false;
        // unless disabled, move all hidden items to secondary group or ignore them
        if (this._options?.hiddenItemStrategy !== -1 /* HiddenItemStrategy.NoHide */) {
            for (let i = 0; i < primary.length; i++) {
                const action = primary[i];
                if (!(action instanceof MenuItemAction) && !(action instanceof SubmenuItemAction)) {
                    // console.warn(`Action ${action.id}/${action.label} is not a MenuItemAction`);
                    continue;
                }
                if (!action.hideActions) {
                    continue;
                }
                // collect all toggle actions
                toggleActions.push(action.hideActions.toggle);
                if (action.hideActions.toggle.checked) {
                    toggleActionsCheckedCount++;
                }
                // hidden items move into overflow or ignore
                if (action.hideActions.isHidden) {
                    someAreHidden = true;
                    primary[i] = undefined;
                    if (this._options?.hiddenItemStrategy !== 0 /* HiddenItemStrategy.Ignore */) {
                        extraSecondary[i] = action;
                    }
                }
            }
        }
        // count for max
        if (this._options?.overflowBehavior !== undefined) {
            const exemptedIds = intersection(new Set(this._options.overflowBehavior.exempted), Iterable.map(primary, a => a?.id));
            const maxItems = this._options.overflowBehavior.maxItems - exemptedIds.size;
            let count = 0;
            for (let i = 0; i < primary.length; i++) {
                const action = primary[i];
                if (!action) {
                    continue;
                }
                count++;
                if (exemptedIds.has(action.id)) {
                    continue;
                }
                if (count >= maxItems) {
                    primary[i] = undefined;
                    extraSecondary[i] = action;
                }
            }
        }
        // coalesce turns Array<IAction|undefined> into IAction[]
        coalesceInPlace(primary);
        coalesceInPlace(extraSecondary);
        super.setActions(primary, Separator.join(extraSecondary, secondary));
        // add context menu for toggle and configure keybinding actions
        if (toggleActions.length > 0 || primary.length > 0) {
            this._sessionDisposables.add(addDisposableListener(this.getElement(), 'contextmenu', e => {
                const event = new StandardMouseEvent(getWindow(this.getElement()), e);
                const action = this.getItemAction(event.target);
                if (!(action)) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                const primaryActions = [];
                // -- Configure Keybinding Action --
                if (action instanceof MenuItemAction && action.menuKeybinding) {
                    primaryActions.push(action.menuKeybinding);
                }
                else if (!(action instanceof SubmenuItemAction || action instanceof ToggleMenuAction)) {
                    // only enable the configure keybinding action for actions that support keybindings
                    const supportsKeybindings = !!this._keybindingService.lookupKeybinding(action.id);
                    primaryActions.push(createConfigureKeybindingAction(this._commandService, this._keybindingService, action.id, undefined, supportsKeybindings));
                }
                // -- Hide Actions --
                if (toggleActions.length > 0) {
                    let noHide = false;
                    // last item cannot be hidden when using ignore strategy
                    if (toggleActionsCheckedCount === 1 && this._options?.hiddenItemStrategy === 0 /* HiddenItemStrategy.Ignore */) {
                        noHide = true;
                        for (let i = 0; i < toggleActions.length; i++) {
                            if (toggleActions[i].checked) {
                                toggleActions[i] = toAction({
                                    id: action.id,
                                    label: action.label,
                                    checked: true,
                                    enabled: false,
                                    run() { }
                                });
                                break; // there is only one
                            }
                        }
                    }
                    // add "hide foo" actions
                    if (!noHide && (action instanceof MenuItemAction || action instanceof SubmenuItemAction)) {
                        if (!action.hideActions) {
                            // no context menu for MenuItemAction instances that support no hiding
                            // those are fake actions and need to be cleaned up
                            return;
                        }
                        primaryActions.push(action.hideActions.hide);
                    }
                    else {
                        primaryActions.push(toAction({
                            id: 'label',
                            label: localize('hide', "Hide"),
                            enabled: false,
                            run() { }
                        }));
                    }
                }
                const actions = Separator.join(primaryActions, toggleActions);
                // add "Reset Menu" action
                if (this._options?.resetMenu && !menuIds) {
                    menuIds = [this._options.resetMenu];
                }
                if (someAreHidden && menuIds) {
                    actions.push(new Separator());
                    actions.push(toAction({
                        id: 'resetThisMenu',
                        label: localize('resetThisMenu', "Reset Menu"),
                        run: () => this._menuService.resetHiddenStates(menuIds)
                    }));
                }
                if (actions.length === 0) {
                    return;
                }
                this._contextMenuService.showContextMenu({
                    getAnchor: () => event,
                    getActions: () => actions,
                    // add context menu actions (iff appicable)
                    menuId: this._options?.contextMenu,
                    menuActionOptions: { renderShortTitle: true, ...this._options?.menuOptions },
                    skipTelemetry: typeof this._options?.telemetrySource === 'string',
                    contextKeyService: this._contextKeyService,
                });
            }));
        }
    }
};
WorkbenchToolBar = __decorate([
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingService),
    __param(6, ICommandService),
    __param(7, ITelemetryService)
], WorkbenchToolBar);
export { WorkbenchToolBar };
/**
 * A {@link WorkbenchToolBar workbench toolbar} that is purely driven from a {@link MenuId menu}-identifier.
 *
 * *Note* that Manual updates via `setActions` are NOT supported.
 */
let MenuWorkbenchToolBar = class MenuWorkbenchToolBar extends WorkbenchToolBar {
    constructor(container, menuId, options, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService, actionViewService, instaService) {
        super(container, {
            resetMenu: menuId,
            ...options,
            actionViewItemProvider: (action, opts) => {
                let provider = actionViewService.lookUp(menuId, action instanceof SubmenuItemAction ? action.item.submenu.id : action.id);
                if (!provider) {
                    provider = options?.actionViewItemProvider;
                }
                const viewItem = provider?.(action, opts);
                if (viewItem) {
                    return viewItem;
                }
                return createActionViewItem(instaService, action, opts);
            }
        }, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService);
        this._onDidChangeMenuItems = this._store.add(new Emitter());
        this.onDidChangeMenuItems = this._onDidChangeMenuItems.event;
        // update logic
        const menu = this._store.add(menuService.createMenu(menuId, contextKeyService, { emitEventsForSubmenuChanges: true, eventDebounceDelay: options?.eventDebounceDelay }));
        const updateToolbar = () => {
            const { primary, secondary } = getActionBarActions(menu.getActions(options?.menuOptions), options?.toolbarOptions?.primaryGroup, options?.toolbarOptions?.shouldInlineSubmenu, options?.toolbarOptions?.useSeparatorsInPrimaryActions);
            container.classList.toggle('has-no-actions', primary.length === 0 && secondary.length === 0);
            super.setActions(primary, secondary);
        };
        this._store.add(menu.onDidChange(() => {
            updateToolbar();
            this._onDidChangeMenuItems.fire(this);
        }));
        this._store.add(actionViewService.onDidChange(e => {
            if (e === menuId) {
                updateToolbar();
            }
        }));
        updateToolbar();
    }
    /**
     * @deprecated The WorkbenchToolBar does not support this method because it works with menus.
     */
    setActions() {
        throw new BugIndicatingError('This toolbar is populated from a menu.');
    }
};
MenuWorkbenchToolBar = __decorate([
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, ICommandService),
    __param(8, ITelemetryService),
    __param(9, IActionViewItemService),
    __param(10, IInstantiationService)
], MenuWorkbenchToolBar);
export { MenuWorkbenchToolBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2Jyb3dzZXIvdG9vbGJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RyxPQUFPLEVBQVcsU0FBUyxFQUFpQixRQUFRLEVBQXVFLE1BQU0saUNBQWlDLENBQUM7QUFDbkssT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekYsT0FBTyxFQUFzQixZQUFZLEVBQVUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDbkgsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDM0Us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