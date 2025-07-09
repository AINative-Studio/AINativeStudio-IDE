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
import { ButtonBar } from '../../../base/browser/ui/button/button.js';
import { createInstantHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { ActionRunner, SubmenuAction } from '../../../base/common/actions.js';
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { localize } from '../../../nls.js';
import { getActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction } from '../common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IContextMenuService } from '../../contextview/browser/contextView.js';
import { IHoverService } from '../../hover/browser/hover.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
let WorkbenchButtonBar = class WorkbenchButtonBar extends ButtonBar {
    constructor(container, _options, _contextMenuService, _keybindingService, telemetryService, _hoverService) {
        super(container);
        this._options = _options;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._store = new DisposableStore();
        this._updateStore = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._actionRunner = this._store.add(new ActionRunner());
        if (_options?.telemetrySource) {
            this._actionRunner.onDidRun(e => {
                telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: _options.telemetrySource });
            }, undefined, this._store);
        }
    }
    dispose() {
        this._onDidChange.dispose();
        this._updateStore.dispose();
        this._store.dispose();
        super.dispose();
    }
    update(actions, secondary) {
        const conifgProvider = this._options?.buttonConfigProvider ?? (() => ({ showLabel: true }));
        this._updateStore.clear();
        this.clear();
        // Support instamt hover between buttons
        const hoverDelegate = this._updateStore.add(createInstantHoverDelegate());
        for (let i = 0; i < actions.length; i++) {
            const secondary = i > 0;
            const actionOrSubmenu = actions[i];
            let action;
            let btn;
            if (actionOrSubmenu instanceof SubmenuAction && actionOrSubmenu.actions.length > 0) {
                const [first, ...rest] = actionOrSubmenu.actions;
                action = first;
                btn = this.addButtonWithDropdown({
                    secondary: conifgProvider(action, i)?.isSecondary ?? secondary,
                    actionRunner: this._actionRunner,
                    actions: rest,
                    contextMenuProvider: this._contextMenuService,
                    ariaLabel: action.label,
                    supportIcons: true,
                });
            }
            else {
                action = actionOrSubmenu;
                btn = this.addButton({
                    secondary: conifgProvider(action, i)?.isSecondary ?? secondary,
                    ariaLabel: action.label,
                    supportIcons: true,
                });
            }
            btn.enabled = action.enabled;
            btn.checked = action.checked ?? false;
            btn.element.classList.add('default-colors');
            const showLabel = conifgProvider(action, i)?.showLabel ?? true;
            if (showLabel) {
                btn.label = action.label;
            }
            else {
                btn.element.classList.add('monaco-text-button');
            }
            if (conifgProvider(action, i)?.showIcon) {
                if (action instanceof MenuItemAction && ThemeIcon.isThemeIcon(action.item.icon)) {
                    if (!showLabel) {
                        btn.icon = action.item.icon;
                    }
                    else {
                        // this is REALLY hacky but combining a codicon and normal text is ugly because
                        // the former define a font which doesn't work for text
                        btn.label = `$(${action.item.icon.id}) ${action.label}`;
                    }
                }
                else if (action.class) {
                    btn.element.classList.add(...action.class.split(' '));
                }
            }
            const kb = this._keybindingService.lookupKeybinding(action.id);
            let tooltip;
            if (kb) {
                tooltip = localize('labelWithKeybinding', "{0} ({1})", action.tooltip || action.label, kb.getLabel());
            }
            else {
                tooltip = action.tooltip || action.label;
            }
            this._updateStore.add(this._hoverService.setupManagedHover(hoverDelegate, btn.element, tooltip));
            this._updateStore.add(btn.onDidClick(async () => {
                this._actionRunner.run(action);
            }));
        }
        if (secondary.length > 0) {
            const btn = this.addButton({
                secondary: true,
                ariaLabel: localize('moreActions', "More Actions")
            });
            btn.icon = Codicon.dropDownButton;
            btn.element.classList.add('default-colors', 'monaco-text-button');
            btn.enabled = true;
            this._updateStore.add(this._hoverService.setupManagedHover(hoverDelegate, btn.element, localize('moreActions', "More Actions")));
            this._updateStore.add(btn.onDidClick(async () => {
                this._contextMenuService.showContextMenu({
                    getAnchor: () => btn.element,
                    getActions: () => secondary,
                    actionRunner: this._actionRunner,
                    onHide: () => btn.element.setAttribute('aria-expanded', 'false')
                });
                btn.element.setAttribute('aria-expanded', 'true');
            }));
        }
        this._onDidChange.fire(this);
    }
};
WorkbenchButtonBar = __decorate([
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, ITelemetryService),
    __param(5, IHoverService)
], WorkbenchButtonBar);
export { WorkbenchButtonBar };
let MenuWorkbenchButtonBar = class MenuWorkbenchButtonBar extends WorkbenchButtonBar {
    constructor(container, menuId, options, menuService, contextKeyService, contextMenuService, keybindingService, telemetryService, hoverService) {
        super(container, options, contextMenuService, keybindingService, telemetryService, hoverService);
        const menu = menuService.createMenu(menuId, contextKeyService);
        this._store.add(menu);
        const update = () => {
            this.clear();
            const actions = getActionBarActions(menu.getActions(options?.menuOptions), options?.toolbarOptions?.primaryGroup);
            super.update(actions.primary, actions.secondary);
        };
        this._store.add(menu.onDidChange(update));
        update();
    }
    dispose() {
        super.dispose();
    }
    update(_actions) {
        throw new Error('Use Menu or WorkbenchButtonBar');
    }
};
MenuWorkbenchButtonBar = __decorate([
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, ITelemetryService),
    __param(8, IHoverService)
], MenuWorkbenchButtonBar);
export { MenuWorkbenchButtonBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV0dG9uYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvYnJvd3Nlci9idXR0b25iYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBVyxNQUFNLDJDQUEyQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxZQUFZLEVBQTBCLGFBQWEsRUFBdUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzSyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRW5FLE9BQU8sRUFBVSxZQUFZLEVBQUUsY0FBYyxFQUFzQixNQUFNLHNCQUFzQixDQUFDO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQWFqRSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFNBQVM7SUFVaEQsWUFDQyxTQUFzQixFQUNMLFFBQWdELEVBQzVDLG1CQUF5RCxFQUMxRCxrQkFBdUQsRUFDeEQsZ0JBQW1DLEVBQ3ZDLGFBQTZDO1FBRTVELEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQU5BLGFBQVEsR0FBUixRQUFRLENBQXdDO1FBQzNCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDekMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUUzQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQWQxQyxXQUFNLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMvQixpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFHdkMsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQzNDLGdCQUFXLEdBQWdCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBYTNELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELElBQUksUUFBUSxFQUFFLGVBQWUsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUMvQixnQkFBZ0IsQ0FBQyxVQUFVLENBQzFCLHlCQUF5QixFQUN6QixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGVBQWdCLEVBQUUsQ0FDcEQsQ0FBQztZQUNILENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQWtCLEVBQUUsU0FBb0I7UUFFOUMsTUFBTSxjQUFjLEdBQTBCLElBQUksQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVuSCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUViLHdDQUF3QztRQUN4QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQUM7UUFFMUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUV6QyxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxJQUFJLE1BQWUsQ0FBQztZQUNwQixJQUFJLEdBQVksQ0FBQztZQUVqQixJQUFJLGVBQWUsWUFBWSxhQUFhLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BGLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDO2dCQUNqRCxNQUFNLEdBQW1CLEtBQUssQ0FBQztnQkFDL0IsR0FBRyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztvQkFDaEMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxJQUFJLFNBQVM7b0JBQzlELFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYTtvQkFDaEMsT0FBTyxFQUFFLElBQUk7b0JBQ2IsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtvQkFDN0MsU0FBUyxFQUFFLE1BQU0sQ0FBQyxLQUFLO29CQUN2QixZQUFZLEVBQUUsSUFBSTtpQkFDbEIsQ0FBQyxDQUFDO1lBQ0osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sR0FBRyxlQUFlLENBQUM7Z0JBQ3pCLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNwQixTQUFTLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLElBQUksU0FBUztvQkFDOUQsU0FBUyxFQUFFLE1BQU0sQ0FBQyxLQUFLO29CQUN2QixZQUFZLEVBQUUsSUFBSTtpQkFDbEIsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVELEdBQUcsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUM3QixHQUFHLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDO1lBQ3RDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxJQUFJLElBQUksQ0FBQztZQUMvRCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLEdBQUcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUMxQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDakQsQ0FBQztZQUNELElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxNQUFNLFlBQVksY0FBYyxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNqRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQzdCLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCwrRUFBK0U7d0JBQy9FLHVEQUF1RDt3QkFDdkQsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3pELENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDekIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsQ0FBQztZQUNGLENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELElBQUksT0FBZSxDQUFDO1lBQ3BCLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQ1IsT0FBTyxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZHLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQzFDLENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDakcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDL0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFFMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDMUIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsU0FBUyxFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDO2FBQ2xELENBQUMsQ0FBQztZQUVILEdBQUcsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQztZQUNsQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUVsRSxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pJLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQy9DLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7b0JBQ3hDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTztvQkFDNUIsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7b0JBQzNCLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYTtvQkFDaEMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUM7aUJBQ2hFLENBQUMsQ0FBQztnQkFDSCxHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0NBQ0QsQ0FBQTtBQXZJWSxrQkFBa0I7SUFhNUIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7R0FoQkgsa0JBQWtCLENBdUk5Qjs7QUFRTSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLGtCQUFrQjtJQUU3RCxZQUNDLFNBQXNCLEVBQ3RCLE1BQWMsRUFDZCxPQUFtRCxFQUNyQyxXQUF5QixFQUNuQixpQkFBcUMsRUFDcEMsa0JBQXVDLEVBQ3hDLGlCQUFxQyxFQUN0QyxnQkFBbUMsRUFDdkMsWUFBMkI7UUFFMUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFakcsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0QixNQUFNLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFFbkIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRWIsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQ2xDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUNyQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FDckMsQ0FBQztZQUVGLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sRUFBRSxDQUFDO0lBQ1YsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVRLE1BQU0sQ0FBQyxRQUFtQjtRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNELENBQUE7QUF4Q1ksc0JBQXNCO0lBTWhDLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtHQVhILHNCQUFzQixDQXdDbEMifQ==