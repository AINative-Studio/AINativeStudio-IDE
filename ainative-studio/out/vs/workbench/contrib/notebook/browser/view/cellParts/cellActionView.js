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
import * as types from '../../../../../../base/common/types.js';
import { EventType as TouchEventType } from '../../../../../../base/browser/touch.js';
import { getDefaultHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { MenuEntryActionViewItem, SubmenuEntryActionViewItem } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuItemAction } from '../../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
export class CodiconActionViewItem extends MenuEntryActionViewItem {
    updateLabel() {
        if (this.options.label && this.label) {
            DOM.reset(this.label, ...renderLabelWithIcons(this._commandAction.label ?? ''));
        }
    }
}
export class ActionViewWithLabel extends MenuEntryActionViewItem {
    render(container) {
        super.render(container);
        container.classList.add('notebook-action-view-item');
        this._actionLabel = document.createElement('a');
        container.appendChild(this._actionLabel);
        this.updateLabel();
    }
    updateLabel() {
        if (this._actionLabel) {
            this._actionLabel.classList.add('notebook-label');
            this._actionLabel.innerText = this._action.label;
        }
    }
}
let UnifiedSubmenuActionView = class UnifiedSubmenuActionView extends SubmenuEntryActionViewItem {
    constructor(action, options, _renderLabel, subActionProvider, subActionViewItemProvider, _keybindingService, _contextMenuService, _themeService, _hoverService) {
        super(action, { ...options, hoverDelegate: options?.hoverDelegate ?? getDefaultHoverDelegate('element') }, _keybindingService, _contextMenuService, _themeService);
        this._renderLabel = _renderLabel;
        this.subActionProvider = subActionProvider;
        this.subActionViewItemProvider = subActionViewItemProvider;
        this._hoverService = _hoverService;
    }
    render(container) {
        super.render(container);
        container.classList.add('notebook-action-view-item');
        container.classList.add('notebook-action-view-item-unified');
        this._actionLabel = document.createElement('a');
        container.appendChild(this._actionLabel);
        this._hover = this._register(this._hoverService.setupManagedHover(this.options.hoverDelegate ?? getDefaultHoverDelegate('element'), this._actionLabel, ''));
        this.updateLabel();
        for (const event of [DOM.EventType.CLICK, DOM.EventType.MOUSE_DOWN, TouchEventType.Tap]) {
            this._register(DOM.addDisposableListener(container, event, e => this.onClick(e, true)));
        }
    }
    onClick(event, preserveFocus = false) {
        DOM.EventHelper.stop(event, true);
        const context = types.isUndefinedOrNull(this._context) ? this.options?.useEventAsContext ? event : { preserveFocus } : this._context;
        this.actionRunner.run(this._primaryAction ?? this._action, context);
    }
    updateLabel() {
        const actions = this.subActionProvider.getActions();
        if (this._actionLabel) {
            const primaryAction = actions[0];
            this._primaryAction = primaryAction;
            if (primaryAction && primaryAction instanceof MenuItemAction) {
                const element = this.element;
                if (element && primaryAction.item.icon && ThemeIcon.isThemeIcon(primaryAction.item.icon)) {
                    const iconClasses = ThemeIcon.asClassNameArray(primaryAction.item.icon);
                    // remove all classes started with 'codicon-'
                    element.classList.forEach((cl) => {
                        if (cl.startsWith('codicon-')) {
                            element.classList.remove(cl);
                        }
                    });
                    element.classList.add(...iconClasses);
                }
                if (this._renderLabel) {
                    this._actionLabel.classList.add('notebook-label');
                    this._actionLabel.innerText = this._action.label;
                    this._hover?.update(primaryAction.tooltip.length ? primaryAction.tooltip : primaryAction.label);
                }
            }
            else {
                if (this._renderLabel) {
                    this._actionLabel.classList.add('notebook-label');
                    this._actionLabel.innerText = this._action.label;
                    this._hover?.update(this._action.tooltip.length ? this._action.tooltip : this._action.label);
                }
            }
        }
    }
};
UnifiedSubmenuActionView = __decorate([
    __param(5, IKeybindingService),
    __param(6, IContextMenuService),
    __param(7, IThemeService),
    __param(8, IHoverService)
], UnifiedSubmenuActionView);
export { UnifiedSubmenuActionView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEFjdGlvblZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsQWN0aW9uVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFDO0FBQzdELE9BQU8sS0FBSyxLQUFLLE1BQU0sd0NBQXdDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd0RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUMxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkUsT0FBTyxFQUFtQyx1QkFBdUIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQzdLLE9BQU8sRUFBRSxjQUFjLEVBQXFCLE1BQU0sc0RBQXNELENBQUM7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXhGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRixNQUFNLE9BQU8scUJBQXNCLFNBQVEsdUJBQXVCO0lBRTlDLFdBQVc7UUFDN0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENB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