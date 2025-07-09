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
import { Separator, SubmenuAction } from '../../../../base/common/actions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { getZoomFactor } from '../../../../base/browser/browser.js';
import { unmnemonicLabel } from '../../../../base/common/labels.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { popup } from '../../../../base/parts/contextmenu/electron-sandbox/contextmenu.js';
import { hasNativeTitlebar } from '../../../../platform/window/common/window.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextMenuMenuDelegate, ContextMenuService as HTMLContextMenuService } from '../../../../platform/contextview/browser/contextMenuService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { isAnchor } from '../../../../base/browser/ui/contextview/contextview.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let ContextMenuService = class ContextMenuService {
    get onDidShowContextMenu() { return this.impl.onDidShowContextMenu; }
    get onDidHideContextMenu() { return this.impl.onDidHideContextMenu; }
    constructor(notificationService, telemetryService, keybindingService, configurationService, contextViewService, menuService, contextKeyService) {
        // Custom context menu: Linux/Windows if custom title is enabled
        if (!isMacintosh && !hasNativeTitlebar(configurationService)) {
            this.impl = new HTMLContextMenuService(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService);
        }
        // Native context menu: otherwise
        else {
            this.impl = new NativeContextMenuService(notificationService, telemetryService, keybindingService, menuService, contextKeyService);
        }
    }
    dispose() {
        this.impl.dispose();
    }
    showContextMenu(delegate) {
        this.impl.showContextMenu(delegate);
    }
};
ContextMenuService = __decorate([
    __param(0, INotificationService),
    __param(1, ITelemetryService),
    __param(2, IKeybindingService),
    __param(3, IConfigurationService),
    __param(4, IContextViewService),
    __param(5, IMenuService),
    __param(6, IContextKeyService)
], ContextMenuService);
export { ContextMenuService };
let NativeContextMenuService = class NativeContextMenuService extends Disposable {
    constructor(notificationService, telemetryService, keybindingService, menuService, contextKeyService) {
        super();
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._onDidShowContextMenu = this._store.add(new Emitter());
        this.onDidShowContextMenu = this._onDidShowContextMenu.event;
        this._onDidHideContextMenu = this._store.add(new Emitter());
        this.onDidHideContextMenu = this._onDidHideContextMenu.event;
    }
    showContextMenu(delegate) {
        delegate = ContextMenuMenuDelegate.transform(delegate, this.menuService, this.contextKeyService);
        const actions = delegate.getActions();
        if (actions.length) {
            const onHide = createSingleCallFunction(() => {
                delegate.onHide?.(false);
                dom.ModifierKeyEmitter.getInstance().resetKeyStatus();
                this._onDidHideContextMenu.fire();
            });
            const menu = this.createMenu(delegate, actions, onHide);
            const anchor = delegate.getAnchor();
            let x;
            let y;
            let zoom = getZoomFactor(dom.isHTMLElement(anchor) ? dom.getWindow(anchor) : dom.getActiveWindow());
            if (dom.isHTMLElement(anchor)) {
                const elementPosition = dom.getDomNodePagePosition(anchor);
                // When drawing context menus, we adjust the pixel position for native menus using zoom level
                // In areas where zoom is applied to the element or its ancestors, we need to adjust accordingly
                // e.g. The title bar has counter zoom behavior meaning it applies the inverse of zoom level.
                // Window Zoom Level: 1.5, Title Bar Zoom: 1/1.5, Coordinate Multiplier: 1.5 * 1.0 / 1.5 = 1.0
                zoom *= dom.getDomNodeZoomLevel(anchor);
                // Position according to the axis alignment and the anchor alignment:
                // `HORIZONTAL` aligns at the top left or right of the anchor and
                //  `VERTICAL` aligns at the bottom left of the anchor.
                if (delegate.anchorAxisAlignment === 1 /* AnchorAxisAlignment.HORIZONTAL */) {
                    if (delegate.anchorAlignment === 0 /* AnchorAlignment.LEFT */) {
                        x = elementPosition.left;
                        y = elementPosition.top;
                    }
                    else {
                        x = elementPosition.left + elementPosition.width;
                        y = elementPosition.top;
                    }
                    if (!isMacintosh) {
                        const window = dom.getWindow(anchor);
                        const availableHeightForMenu = window.screen.height - y;
                        if (availableHeightForMenu < actions.length * (isWindows ? 45 : 32) /* guess of 1 menu item height */) {
                            // this is a guess to detect whether the context menu would
                            // open to the bottom from this point or to the top. If the
                            // menu opens to the top, make sure to align it to the bottom
                            // of the anchor and not to the top.
                            // this seems to be only necessary for Windows and Linux.
                            y += elementPosition.height;
                        }
                    }
                }
                else {
                    if (delegate.anchorAlignment === 0 /* AnchorAlignment.LEFT */) {
                        x = elementPosition.left;
                        y = elementPosition.top + elementPosition.height;
                    }
                    else {
                        x = elementPosition.left + elementPosition.width;
                        y = elementPosition.top + elementPosition.height;
                    }
                }
                // Shift macOS menus by a few pixels below elements
                // to account for extra padding on top of native menu
                // https://github.com/microsoft/vscode/issues/84231
                if (isMacintosh) {
                    y += 4 / zoom;
                }
            }
            else if (isAnchor(anchor)) {
                x = anchor.x;
                y = anchor.y;
            }
            else {
                // We leave x/y undefined in this case which will result in
                // Electron taking care of opening the menu at the cursor position.
            }
            if (typeof x === 'number') {
                x = Math.floor(x * zoom);
            }
            if (typeof y === 'number') {
                y = Math.floor(y * zoom);
            }
            popup(menu, { x, y, positioningItem: delegate.autoSelectFirstItem ? 0 : undefined, }, () => onHide());
            this._onDidShowContextMenu.fire();
        }
    }
    createMenu(delegate, entries, onHide, submenuIds = new Set()) {
        return coalesce(entries.map(entry => this.createMenuItem(delegate, entry, onHide, submenuIds)));
    }
    createMenuItem(delegate, entry, onHide, submenuIds) {
        // Separator
        if (entry instanceof Separator) {
            return { type: 'separator' };
        }
        // Submenu
        if (entry instanceof SubmenuAction) {
            if (submenuIds.has(entry.id)) {
                console.warn(`Found submenu cycle: ${entry.id}`);
                return undefined;
            }
            return {
                label: unmnemonicLabel(stripIcons(entry.label)).trim(),
                submenu: this.createMenu(delegate, entry.actions, onHide, new Set([...submenuIds, entry.id]))
            };
        }
        // Normal Menu Item
        else {
            let type = undefined;
            if (!!entry.checked) {
                if (typeof delegate.getCheckedActionsRepresentation === 'function') {
                    type = delegate.getCheckedActionsRepresentation(entry);
                }
                else {
                    type = 'checkbox';
                }
            }
            const item = {
                label: unmnemonicLabel(stripIcons(entry.label)).trim(),
                checked: !!entry.checked,
                type,
                enabled: !!entry.enabled,
                click: event => {
                    // To preserve pre-electron-2.x behaviour, we first trigger
                    // the onHide callback and then the action.
                    // Fixes https://github.com/microsoft/vscode/issues/45601
                    onHide();
                    // Run action which will close the menu
                    this.runAction(entry, delegate, event);
                }
            };
            const keybinding = !!delegate.getKeyBinding ? delegate.getKeyBinding(entry) : this.keybindingService.lookupKeybinding(entry.id);
            if (keybinding) {
                const electronAccelerator = keybinding.getElectronAccelerator();
                if (electronAccelerator) {
                    item.accelerator = electronAccelerator;
                }
                else {
                    const label = keybinding.getLabel();
                    if (label) {
                        item.label = `${item.label} [${label}]`;
                    }
                }
            }
            return item;
        }
    }
    async runAction(actionToRun, delegate, event) {
        if (!delegate.skipTelemetry) {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: actionToRun.id, from: 'contextMenu' });
        }
        const context = delegate.getActionsContext ? delegate.getActionsContext(event) : undefined;
        try {
            if (delegate.actionRunner) {
                await delegate.actionRunner.run(actionToRun, context);
            }
            else if (actionToRun.enabled) {
                await actionToRun.run(context);
            }
        }
        catch (error) {
            this.notificationService.error(error);
        }
    }
};
NativeContextMenuService = __decorate([
    __param(0, INotificationService),
    __param(1, ITelemetryService),
    __param(2, IKeybindingService),
    __param(3, IMenuService),
    __param(4, IContextKeyService)
], NativeContextMenuService);
registerSingleton(IContextMenuService, ContextMenuService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb250ZXh0bWVudS9lbGVjdHJvbi1zYW5kYm94L2NvbnRleHRtZW51U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWdGLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1SixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBNEIsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3SSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNqRixPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsSUFBSSxz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