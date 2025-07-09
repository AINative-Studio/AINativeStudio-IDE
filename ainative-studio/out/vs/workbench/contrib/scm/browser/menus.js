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
import { equals } from '../../../../base/common/arrays.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import './media/scm.css';
import { localize } from '../../../../nls.js';
import { getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ISCMService } from '../common/scm.js';
function actionEquals(a, b) {
    return a.id === b.id;
}
let SCMTitleMenu = class SCMTitleMenu {
    get actions() { return this._actions; }
    get secondaryActions() { return this._secondaryActions; }
    constructor(menuService, contextKeyService) {
        this._actions = [];
        this._secondaryActions = [];
        this._onDidChangeTitle = new Emitter();
        this.onDidChangeTitle = this._onDidChangeTitle.event;
        this.disposables = new DisposableStore();
        this.menu = menuService.createMenu(MenuId.SCMTitle, contextKeyService);
        this.disposables.add(this.menu);
        this.menu.onDidChange(this.updateTitleActions, this, this.disposables);
        this.updateTitleActions();
    }
    updateTitleActions() {
        const { primary, secondary } = getActionBarActions(this.menu.getActions({ shouldForwardArgs: true }));
        if (equals(primary, this._actions, actionEquals) && equals(secondary, this._secondaryActions, actionEquals)) {
            return;
        }
        this._actions = primary;
        this._secondaryActions = secondary;
        this._onDidChangeTitle.fire();
    }
    dispose() {
        this.disposables.dispose();
    }
};
SCMTitleMenu = __decorate([
    __param(0, IMenuService),
    __param(1, IContextKeyService)
], SCMTitleMenu);
export { SCMTitleMenu };
class SCMMenusItem {
    get resourceFolderMenu() {
        if (!this._resourceFolderMenu) {
            this._resourceFolderMenu = this.menuService.createMenu(MenuId.SCMResourceFolderContext, this.contextKeyService);
        }
        return this._resourceFolderMenu;
    }
    constructor(contextKeyService, menuService) {
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
    }
    getResourceGroupMenu(resourceGroup) {
        if (typeof resourceGroup.contextValue === 'undefined') {
            if (!this.genericResourceGroupMenu) {
                this.genericResourceGroupMenu = this.menuService.createMenu(MenuId.SCMResourceGroupContext, this.contextKeyService);
            }
            return this.genericResourceGroupMenu;
        }
        if (!this.contextualResourceGroupMenus) {
            this.contextualResourceGroupMenus = new Map();
        }
        let item = this.contextualResourceGroupMenus.get(resourceGroup.contextValue);
        if (!item) {
            const contextKeyService = this.contextKeyService.createOverlay([['scmResourceGroupState', resourceGroup.contextValue]]);
            const menu = this.menuService.createMenu(MenuId.SCMResourceGroupContext, contextKeyService);
            item = {
                menu, dispose() {
                    menu.dispose();
                }
            };
            this.contextualResourceGroupMenus.set(resourceGroup.contextValue, item);
        }
        return item.menu;
    }
    getResourceMenu(resource) {
        if (typeof resource.contextValue === 'undefined') {
            if (!this.genericResourceMenu) {
                this.genericResourceMenu = this.menuService.createMenu(MenuId.SCMResourceContext, this.contextKeyService);
            }
            return this.genericResourceMenu;
        }
        if (!this.contextualResourceMenus) {
            this.contextualResourceMenus = new Map();
        }
        let item = this.contextualResourceMenus.get(resource.contextValue);
        if (!item) {
            const contextKeyService = this.contextKeyService.createOverlay([['scmResourceState', resource.contextValue]]);
            const menu = this.menuService.createMenu(MenuId.SCMResourceContext, contextKeyService);
            item = {
                menu, dispose() {
                    menu.dispose();
                }
            };
            this.contextualResourceMenus.set(resource.contextValue, item);
        }
        return item.menu;
    }
    dispose() {
        this.genericResourceGroupMenu?.dispose();
        this.genericResourceMenu?.dispose();
        this._resourceFolderMenu?.dispose();
        if (this.contextualResourceGroupMenus) {
            dispose(this.contextualResourceGroupMenus.values());
            this.contextualResourceGroupMenus.clear();
            this.contextualResourceGroupMenus = undefined;
        }
        if (this.contextualResourceMenus) {
            dispose(this.contextualResourceMenus.values());
            this.contextualResourceMenus.clear();
            this.contextualResourceMenus = undefined;
        }
    }
}
let SCMRepositoryMenus = class SCMRepositoryMenus {
    get repositoryContextMenu() {
        if (!this._repositoryContextMenu) {
            this._repositoryContextMenu = this.menuService.createMenu(MenuId.SCMSourceControl, this.contextKeyService);
            this.disposables.add(this._repositoryContextMenu);
        }
        return this._repositoryContextMenu;
    }
    constructor(provider, contextKeyService, instantiationService, menuService) {
        this.provider = provider;
        this.menuService = menuService;
        this.resourceGroupMenusItems = new Map();
        this.disposables = new DisposableStore();
        this.contextKeyService = contextKeyService.createOverlay([
            ['scmProvider', provider.contextValue],
            ['scmProviderRootUri', provider.rootUri?.toString()],
            ['scmProviderHasRootUri', !!provider.rootUri],
        ]);
        const serviceCollection = new ServiceCollection([IContextKeyService, this.contextKeyService]);
        instantiationService = instantiationService.createChild(serviceCollection, this.disposables);
        this.titleMenu = instantiationService.createInstance(SCMTitleMenu);
        this.disposables.add(this.titleMenu);
        this.repositoryMenu = menuService.createMenu(MenuId.SCMSourceControlInline, this.contextKeyService);
        this.disposables.add(this.repositoryMenu);
        provider.onDidChangeResourceGroups(this.onDidChangeResourceGroups, this, this.disposables);
        this.onDidChangeResourceGroups();
    }
    getResourceGroupMenu(group) {
        return this.getOrCreateResourceGroupMenusItem(group).getResourceGroupMenu(group);
    }
    getResourceMenu(resource) {
        return this.getOrCreateResourceGroupMenusItem(resource.resourceGroup).getResourceMenu(resource);
    }
    getResourceFolderMenu(group) {
        return this.getOrCreateResourceGroupMenusItem(group).resourceFolderMenu;
    }
    getOrCreateResourceGroupMenusItem(group) {
        let result = this.resourceGroupMenusItems.get(group);
        if (!result) {
            const contextKeyService = this.contextKeyService.createOverlay([
                ['scmResourceGroup', group.id],
                ['multiDiffEditorEnableViewChanges', group.multiDiffEditorEnableViewChanges],
            ]);
            result = new SCMMenusItem(contextKeyService, this.menuService);
            this.resourceGroupMenusItems.set(group, result);
        }
        return result;
    }
    onDidChangeResourceGroups() {
        for (const resourceGroup of this.resourceGroupMenusItems.keys()) {
            if (!this.provider.groups.includes(resourceGroup)) {
                this.resourceGroupMenusItems.get(resourceGroup)?.dispose();
                this.resourceGroupMenusItems.delete(resourceGroup);
            }
        }
    }
    dispose() {
        this.disposables.dispose();
        this.resourceGroupMenusItems.forEach(item => item.dispose());
    }
};
SCMRepositoryMenus = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService),
    __param(3, IMenuService)
], SCMRepositoryMenus);
export { SCMRepositoryMenus };
let SCMMenus = class SCMMenus {
    constructor(scmService, instantiationService) {
        this.instantiationService = instantiationService;
        this.disposables = new DisposableStore();
        this.repositoryMenuDisposables = new DisposableStore();
        this.menus = new Map();
        this.titleMenu = instantiationService.createInstance(SCMTitleMenu);
        scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposables);
        // Duplicate the `SCMTitle` menu items to the `SCMSourceControlInline` menu. We do this
        // so that menu items can be independently hidden/shown in the "Source Control" and the
        // "Source Control Repositories" views.
        this.disposables.add(Event.runAndSubscribe(MenuRegistry.onDidChangeMenu, e => {
            if (e && !e.has(MenuId.SCMTitle)) {
                return;
            }
            this.repositoryMenuDisposables.clear();
            for (const menuItem of MenuRegistry.getMenuItems(MenuId.SCMTitle)) {
                this.repositoryMenuDisposables.add(MenuRegistry.appendMenuItem(MenuId.SCMSourceControlInline, menuItem));
            }
        }));
    }
    onDidRemoveRepository(repository) {
        const menus = this.menus.get(repository.provider);
        menus?.dispose();
        this.menus.delete(repository.provider);
    }
    getRepositoryMenus(provider) {
        let result = this.menus.get(provider);
        if (!result) {
            const menus = this.instantiationService.createInstance(SCMRepositoryMenus, provider);
            const dispose = () => {
                menus.dispose();
                this.menus.delete(provider);
            };
            result = { menus, dispose };
            this.menus.set(provider, result);
        }
        return result.menus;
    }
    dispose() {
        this.disposables.dispose();
    }
};
SCMMenus = __decorate([
    __param(0, ISCMService),
    __param(1, IInstantiationService)
], SCMMenus);
export { SCMMenus };
MenuRegistry.appendMenuItem(MenuId.SCMResourceContext, {
    title: localize('miShare', "Share"),
    submenu: MenuId.SCMResourceContextShare,
    group: '45_share',
    order: 3,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvbWVudXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RixPQUFPLGlCQUFpQixDQUFDO0FBQ3pCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN0RyxPQUFPLEVBQVMsWUFBWSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMzRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFPLEVBQWlHLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRTlJLFNBQVMsWUFBWSxDQUFDLENBQVUsRUFBRSxDQUFVO0lBQzNDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3RCLENBQUM7QUFFTSxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFZO0lBR3hCLElBQUksT0FBTyxLQUFnQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFD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