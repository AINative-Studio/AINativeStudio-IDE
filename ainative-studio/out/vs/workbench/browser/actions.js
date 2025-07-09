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
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { Emitter } from '../../base/common/event.js';
import { IMenuService, SubmenuItemAction } from '../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../platform/contextkey/common/contextkey.js';
import { getActionBarActions } from '../../platform/actions/browser/menuEntryActionViewItem.js';
class MenuActions extends Disposable {
    get primaryActions() { return this._primaryActions; }
    get secondaryActions() { return this._secondaryActions; }
    constructor(menuId, options, menuService, contextKeyService) {
        super();
        this.options = options;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._primaryActions = [];
        this._secondaryActions = [];
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.disposables = this._register(new DisposableStore());
        this.menu = this._register(menuService.createMenu(menuId, contextKeyService));
        this._register(this.menu.onDidChange(() => this.updateActions()));
        this.updateActions();
    }
    updateActions() {
        this.disposables.clear();
        const newActions = getActionBarActions(this.menu.getActions(this.options));
        this._primaryActions = newActions.primary;
        this._secondaryActions = newActions.secondary;
        this.disposables.add(this.updateSubmenus([...this._primaryActions, ...this._secondaryActions], {}));
        this._onDidChange.fire();
    }
    updateSubmenus(actions, submenus) {
        const disposables = new DisposableStore();
        for (const action of actions) {
            if (action instanceof SubmenuItemAction && !submenus[action.item.submenu.id]) {
                const menu = submenus[action.item.submenu.id] = disposables.add(this.menuService.createMenu(action.item.submenu, this.contextKeyService));
                disposables.add(menu.onDidChange(() => this.updateActions()));
                disposables.add(this.updateSubmenus(action.actions, submenus));
            }
        }
        return disposables;
    }
}
let CompositeMenuActions = class CompositeMenuActions extends Disposable {
    constructor(menuId, contextMenuId, options, contextKeyService, menuService) {
        super();
        this.menuId = menuId;
        this.contextMenuId = contextMenuId;
        this.options = options;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.menuActions = this._register(new MenuActions(menuId, this.options, menuService, contextKeyService));
        this._register(this.menuActions.onDidChange(() => this._onDidChange.fire()));
    }
    getPrimaryActions() {
        return this.menuActions.primaryActions;
    }
    getSecondaryActions() {
        return this.menuActions.secondaryActions;
    }
    getContextMenuActions() {
        if (this.contextMenuId) {
            const menu = this.menuService.getMenuActions(this.contextMenuId, this.contextKeyService, this.options);
            return getActionBarActions(menu).secondary;
        }
        return [];
    }
};
CompositeMenuActions = __decorate([
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], CompositeMenuActions);
export { CompositeMenuActions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sRUFBVSxZQUFZLEVBQVMsaUJBQWlCLEVBQXNCLE1BQU0sMENBQTBDLENBQUM7QUFDOUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFaEcsTUFBTSxXQUFZLFNBQVEsVUFBVTtJQUtuQyxJQUFJLGNBQWMsS0FBSyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBR3JELElBQUksZ0JBQWdCLEtBQUssT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBT3pELFlBQ0MsTUFBYyxFQUNHLE9BQXVDLEVBQ3ZDLFdBQXlCLEVBQ3pCLGlCQUFxQztRQUV0RCxLQUFLLEVBQUUsQ0FBQztRQUpTLFlBQU8sR0FBUCxPQUFPLENBQWdDO1FBQ3ZDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3pCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFmL0Msb0JBQWUsR0FBYyxFQUFFLENBQUM7UUFHaEMsc0JBQWlCLEdBQWMsRUFBRSxDQUFDO1FBR3pCLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDM0QsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFD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