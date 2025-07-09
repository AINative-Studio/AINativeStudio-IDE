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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { TextOnlyMenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
let SuggestWidgetStatus = class SuggestWidgetStatus {
    constructor(container, _menuId, instantiationService, _menuService, _contextKeyService) {
        this._menuId = _menuId;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._menuDisposables = new DisposableStore();
        this.element = dom.append(container, dom.$('.suggest-status-bar'));
        const actionViewItemProvider = (action => {
            return action instanceof MenuItemAction ? instantiationService.createInstance(TextOnlyMenuEntryActionViewItem, action, { useComma: true }) : undefined;
        });
        this._leftActions = new ActionBar(this.element, { actionViewItemProvider });
        this._rightActions = new ActionBar(this.element, { actionViewItemProvider });
        this._leftActions.domNode.classList.add('left');
        this._rightActions.domNode.classList.add('right');
    }
    dispose() {
        this._menuDisposables.dispose();
        this._leftActions.dispose();
        this._rightActions.dispose();
        this.element.remove();
    }
    show() {
        const menu = this._menuService.createMenu(this._menuId, this._contextKeyService);
        const renderMenu = () => {
            const left = [];
            const right = [];
            for (const [group, actions] of menu.getActions()) {
                if (group === 'left') {
                    left.push(...actions);
                }
                else {
                    right.push(...actions);
                }
            }
            this._leftActions.clear();
            this._leftActions.push(left);
            this._rightActions.clear();
            this._rightActions.push(right);
        };
        this._menuDisposables.add(menu.onDidChange(() => renderMenu()));
        this._menuDisposables.add(menu);
    }
    hide() {
        this._menuDisposables.clear();
    }
};
SuggestWidgetStatus = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMenuService),
    __param(4, IContextKeyService)
], SuggestWidgetStatus);
export { SuggestWidgetStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldFN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvc3VnZ2VzdFdpZGdldFN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQTJCLE1BQU0sb0RBQW9ELENBQUM7QUFFeEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxZQUFZLEVBQVUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFNUYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFRL0IsWUFDQyxTQUFzQixFQUNMLE9BQWUsRUFDVCxvQkFBMkMsRUFDcEQsWUFBa0MsRUFDNUIsa0JBQThDO1FBSGpELFlBQU8sR0FBUCxPQUFPLENBQVE7UUFFVixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUNwQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBUGxELHFCQUFnQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFTekQsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUVuRSxNQUFNLHNCQUFzQixHQUE0QixD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