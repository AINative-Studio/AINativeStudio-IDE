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
import * as DOM from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { BaseActionViewItem } from '../../../base/browser/ui/actionbar/actionViewItems.js';
import { DropdownMenuActionViewItem } from '../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { MenuEntryActionViewItem } from './menuEntryActionViewItem.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { INotificationService } from '../../notification/common/notification.js';
import { IThemeService } from '../../theme/common/themeService.js';
import { IContextMenuService } from '../../contextview/browser/contextView.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
let DropdownWithPrimaryActionViewItem = class DropdownWithPrimaryActionViewItem extends BaseActionViewItem {
    get onDidChangeDropdownVisibility() {
        return this._dropdown.onDidChangeVisibility;
    }
    constructor(primaryAction, dropdownAction, dropdownMenuActions, className, _options, _contextMenuProvider, _keybindingService, _notificationService, _contextKeyService, _themeService, _accessibilityService) {
        super(null, primaryAction, { hoverDelegate: _options?.hoverDelegate });
        this._options = _options;
        this._contextMenuProvider = _contextMenuProvider;
        this._container = null;
        this._dropdownContainer = null;
        this._primaryAction = new MenuEntryActionViewItem(primaryAction, { hoverDelegate: _options?.hoverDelegate }, _keybindingService, _notificationService, _contextKeyService, _themeService, _contextMenuProvider, _accessibilityService);
        if (_options?.actionRunner) {
            this._primaryAction.actionRunner = _options.actionRunner;
        }
        this._dropdown = new DropdownMenuActionViewItem(dropdownAction, dropdownMenuActions, this._contextMenuProvider, {
            menuAsChild: _options?.menuAsChild ?? true,
            classNames: className ? ['codicon', 'codicon-chevron-down', className] : ['codicon', 'codicon-chevron-down'],
            actionRunner: this._options?.actionRunner,
            keybindingProvider: this._options?.getKeyBinding ?? (action => _keybindingService.lookupKeybinding(action.id)),
            hoverDelegate: _options?.hoverDelegate,
            skipTelemetry: _options?.skipTelemetry,
        });
    }
    set actionRunner(actionRunner) {
        super.actionRunner = actionRunner;
        this._primaryAction.actionRunner = actionRunner;
        this._dropdown.actionRunner = actionRunner;
    }
    setActionContext(newContext) {
        super.setActionContext(newContext);
        this._primaryAction.setActionContext(newContext);
        this._dropdown.setActionContext(newContext);
    }
    render(container) {
        this._container = container;
        super.render(this._container);
        this._container.classList.add('monaco-dropdown-with-primary');
        const primaryContainer = DOM.$('.action-container');
        primaryContainer.role = 'button';
        primaryContainer.ariaDisabled = String(!this.action.enabled);
        this._primaryAction.render(DOM.append(this._container, primaryContainer));
        this._dropdownContainer = DOM.$('.dropdown-action-container');
        this._dropdown.render(DOM.append(this._container, this._dropdownContainer));
        this._register(DOM.addDisposableListener(primaryContainer, DOM.EventType.KEY_DOWN, (e) => {
            if (!this.action.enabled) {
                return;
            }
            const event = new StandardKeyboardEvent(e);
            if (event.equals(17 /* KeyCode.RightArrow */)) {
                this._primaryAction.element.tabIndex = -1;
                this._dropdown.focus();
                event.stopPropagation();
            }
        }));
        this._register(DOM.addDisposableListener(this._dropdownContainer, DOM.EventType.KEY_DOWN, (e) => {
            if (!this.action.enabled) {
                return;
            }
            const event = new StandardKeyboardEvent(e);
            if (event.equals(15 /* KeyCode.LeftArrow */)) {
                this._primaryAction.element.tabIndex = 0;
                this._dropdown.setFocusable(false);
                this._primaryAction.element?.focus();
                event.stopPropagation();
            }
        }));
        this.updateEnabled();
    }
    focus(fromRight) {
        if (fromRight) {
            this._dropdown.focus();
        }
        else {
            this._primaryAction.element.tabIndex = 0;
            this._primaryAction.element.focus();
        }
    }
    blur() {
        this._primaryAction.element.tabIndex = -1;
        this._dropdown.blur();
        this._container.blur();
    }
    setFocusable(focusable) {
        if (focusable) {
            this._primaryAction.element.tabIndex = 0;
        }
        else {
            this._primaryAction.element.tabIndex = -1;
            this._dropdown.setFocusable(false);
        }
    }
    updateEnabled() {
        const disabled = !this.action.enabled;
        this.element?.classList.toggle('disabled', disabled);
    }
    update(dropdownAction, dropdownMenuActions, dropdownIcon) {
        this._dropdown.dispose();
        this._dropdown = new DropdownMenuActionViewItem(dropdownAction, dropdownMenuActions, this._contextMenuProvider, {
            menuAsChild: this._options?.menuAsChild ?? true,
            classNames: ['codicon', dropdownIcon || 'codicon-chevron-down'],
            actionRunner: this._options?.actionRunner,
            hoverDelegate: this._options?.hoverDelegate,
            keybindingProvider: this._options?.getKeyBinding
        });
        if (this._dropdownContainer) {
            this._dropdown.render(this._dropdownContainer);
        }
    }
    showDropdown() {
        this._dropdown.show();
    }
    dispose() {
        this._primaryAction.dispose();
        this._dropdown.dispose();
        super.dispose();
    }
};
DropdownWithPrimaryActionViewItem = __decorate([
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, INotificationService),
    __param(8, IContextKeyService),
    __param(9, IThemeService),
    __param(10, IAccessibilityService)
], DropdownWithPrimaryActionViewItem);
export { DropdownWithPrimaryActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd25XaXRoUHJpbWFyeUFjdGlvblZpZXdJdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvYnJvd3Nlci9kcm9wZG93bldpdGhQcmltYXJ5QWN0aW9uVmlld0l0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRSxPQUFPLEVBQWtCLGtCQUFrQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDM0csT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFLekcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBVzdFLElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWtDLFNBQVEsa0JBQWtCO0lBTXhFLElBQUksNkJBQTZCO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQztJQUM3QyxDQUFDO0lBRUQsWUFDQyxhQUE2QixFQUM3QixjQUF1QixF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