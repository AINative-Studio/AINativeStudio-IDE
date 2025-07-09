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
import { ModifierKeyEmitter } from '../../../base/browser/dom.js';
import { Separator } from '../../../base/common/actions.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { getFlatContextMenuActions } from '../../actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../actions/common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { INotificationService } from '../../notification/common/notification.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ContextMenuHandler } from './contextMenuHandler.js';
import { IContextViewService } from './contextView.js';
let ContextMenuService = class ContextMenuService extends Disposable {
    get contextMenuHandler() {
        if (!this._contextMenuHandler) {
            this._contextMenuHandler = new ContextMenuHandler(this.contextViewService, this.telemetryService, this.notificationService, this.keybindingService);
        }
        return this._contextMenuHandler;
    }
    constructor(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService) {
        super();
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
        this.contextViewService = contextViewService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._contextMenuHandler = undefined;
        this._onDidShowContextMenu = this._store.add(new Emitter());
        this.onDidShowContextMenu = this._onDidShowContextMenu.event;
        this._onDidHideContextMenu = this._store.add(new Emitter());
        this.onDidHideContextMenu = this._onDidHideContextMenu.event;
    }
    configure(options) {
        this.contextMenuHandler.configure(options);
    }
    // ContextMenu
    showContextMenu(delegate) {
        delegate = ContextMenuMenuDelegate.transform(delegate, this.menuService, this.contextKeyService);
        this.contextMenuHandler.showContextMenu({
            ...delegate,
            onHide: (didCancel) => {
                delegate.onHide?.(didCancel);
                this._onDidHideContextMenu.fire();
            }
        });
        ModifierKeyEmitter.getInstance().resetKeyStatus();
        this._onDidShowContextMenu.fire();
    }
};
ContextMenuService = __decorate([
    __param(0, ITelemetryService),
    __param(1, INotificationService),
    __param(2, IContextViewService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], ContextMenuService);
export { ContextMenuService };
export var ContextMenuMenuDelegate;
(function (ContextMenuMenuDelegate) {
    function is(thing) {
        return thing && thing.menuId instanceof MenuId;
    }
    function transform(delegate, menuService, globalContextKeyService) {
        if (!is(delegate)) {
            return delegate;
        }
        const { menuId, menuActionOptions, contextKeyService } = delegate;
        return {
            ...delegate,
            getActions: () => {
                let target = [];
                if (menuId) {
                    const menu = menuService.getMenuActions(menuId, contextKeyService ?? globalContextKeyService, menuActionOptions);
                    target = getFlatContextMenuActions(menu);
                }
                if (!delegate.getActions) {
                    return target;
                }
                else {
                    return Separator.join(delegate.getActions(), target);
                }
            }
        };
    }
    ContextMenuMenuDelegate.transform = transform;
})(ContextMenuMenuDelegate || (ContextMenuMenuDelegate = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dE1lbnVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbnRleHR2aWV3L2Jyb3dzZXIvY29udGV4dE1lbnVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2xFLE9BQU8sRUFBVyxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUE4QixNQUFNLHlCQUF5QixDQUFDO0FBQ3pGLE9BQU8sRUFBaUQsbUJBQW1CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvRixJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFLakQsSUFBWSxrQkFBa0I7UUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQy9CLElBQUks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