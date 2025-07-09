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
var NavigableContainerManager_1;
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { WorkbenchListFocusContextKey, WorkbenchListScrollAtBottomContextKey, WorkbenchListScrollAtTopContextKey } from '../../../platform/list/browser/listService.js';
import { combinedDisposable, toDisposable, Disposable } from '../../../base/common/lifecycle.js';
import { registerWorkbenchContribution2 } from '../../common/contributions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
function handleFocusEventsGroup(group, handler, onPartFocusChange) {
    const focusedIndices = new Set();
    return combinedDisposable(...group.map((events, index) => combinedDisposable(events.onDidFocus(() => {
        onPartFocusChange?.(index, 'focus');
        if (!focusedIndices.size) {
            handler(true);
        }
        focusedIndices.add(index);
    }), events.onDidBlur(() => {
        onPartFocusChange?.(index, 'blur');
        focusedIndices.delete(index);
        if (!focusedIndices.size) {
            handler(false);
        }
    }))));
}
const NavigableContainerFocusedContextKey = new RawContextKey('navigableContainerFocused', false);
let NavigableContainerManager = class NavigableContainerManager {
    static { NavigableContainerManager_1 = this; }
    static { this.ID = 'workbench.contrib.navigableContainerManager'; }
    constructor(contextKeyService, logService, configurationService) {
        this.logService = logService;
        this.configurationService = configurationService;
        this.containers = new Set();
        this.focused = NavigableContainerFocusedContextKey.bindTo(contextKeyService);
        NavigableContainerManager_1.INSTANCE = this;
    }
    dispose() {
        this.containers.clear();
        this.focused.reset();
        NavigableContainerManager_1.INSTANCE = undefined;
    }
    get debugEnabled() {
        return this.configurationService.getValue('workbench.navigibleContainer.enableDebug');
    }
    log(msg, ...args) {
        if (this.debugEnabled) {
            this.logService.debug(msg, ...args);
        }
    }
    static register(container) {
        const instance = this.INSTANCE;
        if (!instance) {
            return Disposable.None;
        }
        instance.containers.add(container);
        instance.log('NavigableContainerManager.register', container.name);
        return combinedDisposable(handleFocusEventsGroup(container.focusNotifiers, (isFocus) => {
            if (isFocus) {
                instance.log('NavigableContainerManager.focus', container.name);
                instance.focused.set(true);
                instance.lastContainer = container;
            }
            else {
                instance.log('NavigableContainerManager.blur', container.name, instance.lastContainer?.name);
                if (instance.lastContainer === container) {
                    instance.focused.set(false);
                    instance.lastContainer = undefined;
                }
            }
        }, (index, event) => {
            instance.log('NavigableContainerManager.partFocusChange', container.name, index, event);
        }), toDisposable(() => {
            instance.containers.delete(container);
            instance.log('NavigableContainerManager.unregister', container.name, instance.lastContainer?.name);
            if (instance.lastContainer === container) {
                instance.focused.set(false);
                instance.lastContainer = undefined;
            }
        }));
    }
    static getActive() {
        return this.INSTANCE?.lastContainer;
    }
};
NavigableContainerManager = NavigableContainerManager_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILogService),
    __param(2, IConfigurationService)
], NavigableContainerManager);
export function registerNavigableContainer(container) {
    return NavigableContainerManager.register(container);
}
registerWorkbenchContribution2(NavigableContainerManager.ID, NavigableContainerManager, 1 /* WorkbenchPhase.BlockStartup */);
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'widgetNavigation.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(NavigableContainerFocusedContextKey, ContextKeyExpr.or(WorkbenchListFocusContextKey?.negate(), WorkbenchListScrollAtTopContextKey)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
    handler: () => {
        const activeContainer = NavigableContainerManager.getActive();
        activeContainer?.focusPreviousWidget();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'widgetNavigation.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(NavigableContainerFocusedContextKey, ContextKeyExpr.or(WorkbenchListFocusContextKey?.negate(), WorkbenchListScrollAtBottomContextKey)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
    handler: () => {
        const activeContainer = NavigableContainerManager.getActive();
        activeContainer?.focusNextWidget();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lkZ2V0TmF2aWdhdGlvbkNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvd2lkZ2V0TmF2aWdhdGlvbkNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25JLE9BQU8sRUFBb0IsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUscUNBQXFDLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUV4SyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFlLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlHLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUEwQmhHLFNBQVMsc0JBQXNCLENBQUMsS0FBZ0MsRUFBRSxPQUFtQyxFQUFFLGlCQUEwRDtJQUNoSyxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQ3pDLE9BQU8sa0JBQWtCLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQzNFLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ3RCLGlCQUFpQixFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3BD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