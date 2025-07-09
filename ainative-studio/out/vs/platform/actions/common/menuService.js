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
var PersistedMenuHideState_1, MenuInfo_1;
import { RunOnceScheduler } from '../../../base/common/async.js';
import { DebounceEmitter, Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isIMenuItem, isISubmenuItem, MenuItemAction, MenuRegistry, SubmenuItemAction } from './actions.js';
import { ICommandService } from '../../commands/common/commands.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { Separator, toAction } from '../../../base/common/actions.js';
import { IStorageService } from '../../storage/common/storage.js';
import { removeFastWithoutKeepingOrder } from '../../../base/common/arrays.js';
import { localize } from '../../../nls.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
let MenuService = class MenuService {
    constructor(_commandService, _keybindingService, storageService) {
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._hiddenStates = new PersistedMenuHideState(storageService);
    }
    createMenu(id, contextKeyService, options) {
        return new MenuImpl(id, this._hiddenStates, { emitEventsForSubmenuChanges: false, eventDebounceDelay: 50, ...options }, this._commandService, this._keybindingService, contextKeyService);
    }
    getMenuActions(id, contextKeyService, options) {
        const menu = new MenuImpl(id, this._hiddenStates, { emitEventsForSubmenuChanges: false, eventDebounceDelay: 50, ...options }, this._commandService, this._keybindingService, contextKeyService);
        const actions = menu.getActions(options);
        menu.dispose();
        return actions;
    }
    getMenuContexts(id) {
        const menuInfo = new MenuInfoSnapshot(id, false);
        return new Set([...menuInfo.structureContextKeys, ...menuInfo.preconditionContextKeys, ...menuInfo.toggledContextKeys]);
    }
    resetHiddenStates(ids) {
        this._hiddenStates.reset(ids);
    }
};
MenuService = __decorate([
    __param(0, ICommandService),
    __param(1, IKeybindingService),
    __param(2, IStorageService)
], MenuService);
export { MenuService };
let PersistedMenuHideState = class PersistedMenuHideState {
    static { PersistedMenuHideState_1 = this; }
    static { this._key = 'menu.hiddenCommands'; }
    constructor(_storageService) {
        this._storageService = _storageService;
        this._disposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._ignoreChangeEvent = false;
        this._hiddenByDefaultCache = new Map();
        try {
            const raw = _storageService.get(PersistedMenuHideState_1._key, 0 /* StorageScope.PROFILE */, '{}');
            this._data = JSON.parse(raw);
        }
        catch (err) {
            this._data = Object.create(null);
        }
        this._disposables.add(_storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, PersistedMenuHideState_1._key, this._disposables)(() => {
            if (!this._ignoreChangeEvent) {
                try {
                    const raw = _storageService.get(PersistedMenuHideState_1._key, 0 /* StorageScope.PROFILE */, '{}');
                    this._data = JSON.parse(raw);
                }
                catch (err) {
                    console.log('FAILED to read storage after UPDATE', err);
                }
            }
            this._onDidChange.fire();
        }));
    }
    dispose() {
        this._onDidChange.dispose();
        this._disposables.dispose();
    }
    _isHiddenByDefault(menu, commandId) {
        return this._hiddenByDefaultCache.get(`${menu.id}/${commandId}`) ?? false;
    }
    setDefaultState(menu, commandId, hidden) {
        this._hiddenByDefaultCache.set(`${menu.id}/${commandId}`, hidden);
    }
    isHidden(menu, commandId) {
        const hiddenByDefault = this._isHiddenByDefault(menu, commandId);
        const state = this._data[menu.id]?.includes(commandId) ?? false;
        return hiddenByDefault ? !state : state;
    }
    updateHidden(menu, commandId, hidden) {
        const hiddenByDefault = this._isHiddenByDefault(menu, commandId);
        if (hiddenByDefault) {
            hidden = !hidden;
        }
        const entries = this._data[menu.id];
        if (!hidden) {
            // remove and cleanup
            if (entries) {
                const idx = entries.indexOf(commandId);
                if (idx >= 0) {
                    removeFastWithoutKeepingOrder(entries, idx);
                }
                if (entries.length === 0) {
                    delete this._data[menu.id];
                }
            }
        }
        else {
            // add unless already added
            if (!entries) {
                this._data[menu.id] = [commandId];
            }
            else {
                const idx = entries.indexOf(commandId);
                if (idx < 0) {
                    entries.push(commandId);
                }
            }
        }
        this._persist();
    }
    reset(menus) {
        if (menus === undefined) {
            // reset all
            this._data = Object.create(null);
            this._persist();
        }
        else {
            // reset only for a specific menu
            for (const { id } of menus) {
                if (this._data[id]) {
                    delete this._data[id];
                }
            }
            this._persist();
        }
    }
    _persist() {
        try {
            this._ignoreChangeEvent = true;
            const raw = JSON.stringify(this._data);
            this._storageService.store(PersistedMenuHideState_1._key, raw, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        finally {
            this._ignoreChangeEvent = false;
        }
    }
};
PersistedMenuHideState = PersistedMenuHideState_1 = __decorate([
    __param(0, IStorageService)
], PersistedMenuHideState);
class MenuInfoSnapshot {
    constructor(_id, _collectContextKeysForSubmenus) {
        this._id = _id;
        this._collectContextKeysForSubmenus = _collectContextKeysForSubmenus;
        this._menuGroups = [];
        this._allMenuIds = new Set();
        this._structureContextKeys = new Set();
        this._preconditionContextKeys = new Set();
        this._toggledContextKeys = new Set();
        this.refresh();
    }
    get allMenuIds() {
        return this._allMenuIds;
    }
    get structureContextKeys() {
        return this._structureContextKeys;
    }
    get preconditionContextKeys() {
        return this._preconditionContextKeys;
    }
    get toggledContextKeys() {
        return this._toggledContextKeys;
    }
    refresh() {
        // reset
        this._menuGroups.length = 0;
        this._allMenuIds.clear();
        this._structureContextKeys.clear();
        this._preconditionContextKeys.clear();
        this._toggledContextKeys.clear();
        const menuItems = this._sort(MenuRegistry.getMenuItems(this._id));
        let group;
        for (const item of menuItems) {
            // group by groupId
            const groupName = item.group || '';
            if (!group || group[0] !== groupName) {
                group = [groupName, []];
                this._menuGroups.push(group);
            }
            group[1].push(item);
            // keep keys and submenu ids for eventing
            this._collectContextKeysAndSubmenuIds(item);
        }
        this._allMenuIds.add(this._id);
    }
    _sort(menuItems) {
        // no sorting needed in snapshot
        return menuItems;
    }
    _collectContextKeysAndSubmenuIds(item) {
        MenuInfoSnapshot._fillInKbExprKeys(item.when, this._structureContextKeys);
        if (isIMenuItem(item)) {
            // keep precondition keys for event if applicable
            if (item.command.precondition) {
                MenuInfoSnapshot._fillInKbExprKeys(item.command.precondition, this._preconditionContextKeys);
            }
            // keep toggled keys for event if applicable
            if (item.command.toggled) {
                const toggledExpression = item.command.toggled.condition || item.command.toggled;
                MenuInfoSnapshot._fillInKbExprKeys(toggledExpression, this._toggledContextKeys);
            }
        }
        else if (this._collectContextKeysForSubmenus) {
            // recursively collect context keys from submenus so that this
            // menu fires events when context key changes affect submenus
            MenuRegistry.getMenuItems(item.submenu).forEach(this._collectContextKeysAndSubmenuIds, this);
            this._allMenuIds.add(item.submenu);
        }
    }
    static _fillInKbExprKeys(exp, set) {
        if (exp) {
            for (const key of exp.keys()) {
                set.add(key);
            }
        }
    }
}
let MenuInfo = MenuInfo_1 = class MenuInfo extends MenuInfoSnapshot {
    constructor(_id, _hiddenStates, _collectContextKeysForSubmenus, _commandService, _keybindingService, _contextKeyService) {
        super(_id, _collectContextKeysForSubmenus);
        this._hiddenStates = _hiddenStates;
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._contextKeyService = _contextKeyService;
        this.refresh();
    }
    createActionGroups(options) {
        const result = [];
        for (const group of this._menuGroups) {
            const [id, items] = group;
            let activeActions;
            for (const item of items) {
                if (this._contextKeyService.contextMatchesRules(item.when)) {
                    const isMenuItem = isIMenuItem(item);
                    if (isMenuItem) {
                        this._hiddenStates.setDefaultState(this._id, item.command.id, !!item.isHiddenByDefault);
                    }
                    const menuHide = createMenuHide(this._id, isMenuItem ? item.command : item, this._hiddenStates);
                    if (isMenuItem) {
                        // MenuItemAction
                        const menuKeybinding = createConfigureKeybindingAction(this._commandService, this._keybindingService, item.command.id, item.when);
                        (activeActions ??= []).push(new MenuItemAction(item.command, item.alt, options, menuHide, menuKeybinding, this._contextKeyService, this._commandService));
                    }
                    else {
                        // SubmenuItemAction
                        const groups = new MenuInfo_1(item.submenu, this._hiddenStates, this._collectContextKeysForSubmenus, this._commandService, this._keybindingService, this._contextKeyService).createActionGroups(options);
                        const submenuActions = Separator.join(...groups.map(g => g[1]));
                        if (submenuActions.length > 0) {
                            (activeActions ??= []).push(new SubmenuItemAction(item, menuHide, submenuActions));
                        }
                    }
                }
            }
            if (activeActions && activeActions.length > 0) {
                result.push([id, activeActions]);
            }
        }
        return result;
    }
    _sort(menuItems) {
        return menuItems.sort(MenuInfo_1._compareMenuItems);
    }
    static _compareMenuItems(a, b) {
        const aGroup = a.group;
        const bGroup = b.group;
        if (aGroup !== bGroup) {
            // Falsy groups come last
            if (!aGroup) {
                return 1;
            }
            else if (!bGroup) {
                return -1;
            }
            // 'navigation' group comes first
            if (aGroup === 'navigation') {
                return -1;
            }
            else if (bGroup === 'navigation') {
                return 1;
            }
            // lexical sort for groups
            const value = aGroup.localeCompare(bGroup);
            if (value !== 0) {
                return value;
            }
        }
        // sort on priority - default is 0
        const aPrio = a.order || 0;
        const bPrio = b.order || 0;
        if (aPrio < bPrio) {
            return -1;
        }
        else if (aPrio > bPrio) {
            return 1;
        }
        // sort on titles
        return MenuInfo_1._compareTitles(isIMenuItem(a) ? a.command.title : a.title, isIMenuItem(b) ? b.command.title : b.title);
    }
    static _compareTitles(a, b) {
        const aStr = typeof a === 'string' ? a : a.original;
        const bStr = typeof b === 'string' ? b : b.original;
        return aStr.localeCompare(bStr);
    }
};
MenuInfo = MenuInfo_1 = __decorate([
    __param(3, ICommandService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService)
], MenuInfo);
let MenuImpl = class MenuImpl {
    constructor(id, hiddenStates, options, commandService, keybindingService, contextKeyService) {
        this._disposables = new DisposableStore();
        this._menuInfo = new MenuInfo(id, hiddenStates, options.emitEventsForSubmenuChanges, commandService, keybindingService, contextKeyService);
        // Rebuild this menu whenever the menu registry reports an event for this MenuId.
        // This usually happen while code and extensions are loaded and affects the over
        // structure of the menu
        const rebuildMenuSoon = new RunOnceScheduler(() => {
            this._menuInfo.refresh();
            this._onDidChange.fire({ menu: this, isStructuralChange: true, isEnablementChange: true, isToggleChange: true });
        }, options.eventDebounceDelay);
        this._disposables.add(rebuildMenuSoon);
        this._disposables.add(MenuRegistry.onDidChangeMenu(e => {
            for (const id of this._menuInfo.allMenuIds) {
                if (e.has(id)) {
                    rebuildMenuSoon.schedule();
                    break;
                }
            }
        }));
        // When context keys or storage state changes we need to check if the menu also has changed. However,
        // we only do that when someone listens on this menu because (1) these events are
        // firing often and (2) menu are often leaked
        const lazyListener = this._disposables.add(new DisposableStore());
        const merge = (events) => {
            let isStructuralChange = false;
            let isEnablementChange = false;
            let isToggleChange = false;
            for (const item of events) {
                isStructuralChange = isStructuralChange || item.isStructuralChange;
                isEnablementChange = isEnablementChange || item.isEnablementChange;
                isToggleChange = isToggleChange || item.isToggleChange;
                if (isStructuralChange && isEnablementChange && isToggleChange) {
                    // everything is TRUE, no need to continue iterating
                    break;
                }
            }
            return { menu: this, isStructuralChange, isEnablementChange, isToggleChange };
        };
        const startLazyListener = () => {
            lazyListener.add(contextKeyService.onDidChangeContext(e => {
                const isStructuralChange = e.affectsSome(this._menuInfo.structureContextKeys);
                const isEnablementChange = e.affectsSome(this._menuInfo.preconditionContextKeys);
                const isToggleChange = e.affectsSome(this._menuInfo.toggledContextKeys);
                if (isStructuralChange || isEnablementChange || isToggleChange) {
                    this._onDidChange.fire({ menu: this, isStructuralChange, isEnablementChange, isToggleChange });
                }
            }));
            lazyListener.add(hiddenStates.onDidChange(e => {
                this._onDidChange.fire({ menu: this, isStructuralChange: true, isEnablementChange: false, isToggleChange: false });
            }));
        };
        this._onDidChange = new DebounceEmitter({
            // start/stop context key listener
            onWillAddFirstListener: startLazyListener,
            onDidRemoveLastListener: lazyListener.clear.bind(lazyListener),
            delay: options.eventDebounceDelay,
            merge
        });
        this.onDidChange = this._onDidChange.event;
    }
    getActions(options) {
        return this._menuInfo.createActionGroups(options);
    }
    dispose() {
        this._disposables.dispose();
        this._onDidChange.dispose();
    }
};
MenuImpl = __decorate([
    __param(3, ICommandService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService)
], MenuImpl);
function createMenuHide(menu, command, states) {
    const id = isISubmenuItem(command) ? command.submenu.id : command.id;
    const title = typeof command.title === 'string' ? command.title : command.title.value;
    const hide = toAction({
        id: `hide/${menu.id}/${id}`,
        label: localize('hide.label', 'Hide \'{0}\'', title),
        run() { states.updateHidden(menu, id, true); }
    });
    const toggle = toAction({
        id: `toggle/${menu.id}/${id}`,
        label: title,
        get checked() { return !states.isHidden(menu, id); },
        run() { states.updateHidden(menu, id, !!this.checked); }
    });
    return {
        hide,
        toggle,
        get isHidden() { return !toggle.checked; },
    };
}
export function createConfigureKeybindingAction(commandService, keybindingService, commandId, when = undefined, enabled = true) {
    return toAction({
        id: `configureKeybinding/${commandId}`,
        label: localize('configure keybinding', "Configure Keybinding"),
        enabled,
        run() {
            // Only set the when clause when there is no keybinding
            // It is possible that the action and the keybinding have different when clauses
            const hasKeybinding = !!keybindingService.lookupKeybinding(commandId); // This may only be called inside the `run()` method as it can be expensive on startup. #210529
            const whenValue = !hasKeybinding && when ? when.serialize() : undefined;
            commandService.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}` + (whenValue ? ` +when:${whenValue}` : ''));
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9jb21tb24vbWVudVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBMkcsV0FBVyxFQUFFLGNBQWMsRUFBd0IsY0FBYyxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUUzTyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUF3QixrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pHLE9BQU8sRUFBVyxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFcEUsSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBVztJQU12QixZQUNtQyxlQUFnQyxFQUM3QixrQkFBc0MsRUFDMUQsY0FBK0I7UUFGZCxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDN0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtR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