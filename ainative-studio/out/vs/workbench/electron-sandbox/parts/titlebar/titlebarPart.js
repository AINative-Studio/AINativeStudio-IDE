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
var AuxiliaryNativeTitlebarPart_1;
import { Event } from '../../../../base/common/event.js';
import { getZoomFactor } from '../../../../base/browser/browser.js';
import { $, addDisposableListener, append, EventType, getWindow, getWindowId, hide, show } from '../../../../base/browser/dom.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { isMacintosh, isWindows, isLinux, isBigSurOrNewer } from '../../../../base/common/platform.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { BrowserTitlebarPart as BrowserTitlebarPart, BrowserTitleService } from '../../../browser/parts/titlebar/titlebarPart.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { hasNativeTitlebar, useWindowControlsOverlay, DEFAULT_CUSTOM_TITLEBAR_HEIGHT } from '../../../../platform/window/common/window.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { NativeMenubarControl } from './menubarControl.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { mainWindow } from '../../../../base/browser/window.js';
let NativeTitlebarPart = class NativeTitlebarPart extends BrowserTitlebarPart {
    //#region IView
    get minimumHeight() {
        if (!isMacintosh) {
            return super.minimumHeight;
        }
        return (this.isCommandCenterVisible ? DEFAULT_CUSTOM_TITLEBAR_HEIGHT : this.macTitlebarSize) / (this.preventZoom ? getZoomFactor(getWindow(this.element)) : 1);
    }
    get maximumHeight() { return this.minimumHeight; }
    get macTitlebarSize() {
        if (this.bigSurOrNewer) {
            return 28; // macOS Big Sur increases title bar height
        }
        return 22;
    }
    constructor(id, targetWindow, editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService) {
        super(id, targetWindow, editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService);
        this.nativeHostService = nativeHostService;
        this.bigSurOrNewer = isBigSurOrNewer(environmentService.os.release);
    }
    onMenubarVisibilityChanged(visible) {
        // Hide title when toggling menu bar
        if ((isWindows || isLinux) && this.currentMenubarVisibility === 'toggle' && visible) {
            // Hack to fix issue #52522 with layered webkit-app-region elements appearing under cursor
            if (this.dragRegion) {
                hide(this.dragRegion);
                setTimeout(() => show(this.dragRegion), 50);
            }
        }
        super.onMenubarVisibilityChanged(visible);
    }
    onConfigurationChanged(event) {
        super.onConfigurationChanged(event);
        if (event.affectsConfiguration('window.doubleClickIconToClose')) {
            if (this.appIcon) {
                this.onUpdateAppIconDragBehavior();
            }
        }
    }
    onUpdateAppIconDragBehavior() {
        const setting = this.configurationService.getValue('window.doubleClickIconToClose');
        if (setting && this.appIcon) {
            this.appIcon.style['-webkit-app-region'] = 'no-drag';
        }
        else if (this.appIcon) {
            this.appIcon.style['-webkit-app-region'] = 'drag';
        }
    }
    installMenubar() {
        super.installMenubar();
        if (this.menubar) {
            return;
        }
        if (this.customMenubar) {
            this._register(this.customMenubar.onFocusStateChange(e => this.onMenubarFocusChanged(e)));
        }
    }
    onMenubarFocusChanged(focused) {
        if ((isWindows || isLinux) && this.currentMenubarVisibility !== 'compact' && this.dragRegion) {
            if (focused) {
                hide(this.dragRegion);
            }
            else {
                show(this.dragRegion);
            }
        }
    }
    createContentArea(parent) {
        const result = super.createContentArea(parent);
        const targetWindow = getWindow(parent);
        const targetWindowId = getWindowId(targetWindow);
        // Native menu controller
        if (isMacintosh || hasNativeTitlebar(this.configurationService)) {
            this._register(this.instantiationService.createInstance(NativeMenubarControl));
        }
        // App Icon (Native Windows/Linux)
        if (this.appIcon) {
            this.onUpdateAppIconDragBehavior();
            this._register(addDisposableListener(this.appIcon, EventType.DBLCLICK, (() => {
                this.nativeHostService.closeWindow({ targetWindowId });
            })));
        }
        // Custom Window Controls (Native Windows/Linux)
        if (!hasNativeTitlebar(this.configurationService) && // not for native title bars
            !useWindowControlsOverlay(this.configurationService) && // not when controls are natively drawn
            this.windowControlsContainer) {
            // Minimize
            const minimizeIcon = append(this.windowControlsContainer, $('div.window-icon.window-minimize' + ThemeIcon.asCSSSelector(Codicon.chromeMinimize)));
            this._register(addDisposableListener(minimizeIcon, EventType.CLICK, () => {
                this.nativeHostService.minimizeWindow({ targetWindowId });
            }));
            // Restore
            this.maxRestoreControl = append(this.windowControlsContainer, $('div.window-icon.window-max-restore'));
            this._register(addDisposableListener(this.maxRestoreControl, EventType.CLICK, async () => {
                const maximized = await this.nativeHostService.isMaximized({ targetWindowId });
                if (maximized) {
                    return this.nativeHostService.unmaximizeWindow({ targetWindowId });
                }
                return this.nativeHostService.maximizeWindow({ targetWindowId });
            }));
            // Close
            const closeIcon = append(this.windowControlsContainer, $('div.window-icon.window-close' + ThemeIcon.asCSSSelector(Codicon.chromeClose)));
            this._register(addDisposableListener(closeIcon, EventType.CLICK, () => {
                this.nativeHostService.closeWindow({ targetWindowId });
            }));
            // Resizer
            this.resizer = append(this.rootContainer, $('div.resizer'));
            this._register(Event.runAndSubscribe(this.layoutService.onDidChangeWindowMaximized, ({ windowId, maximized }) => {
                if (windowId === targetWindowId) {
                    this.onDidChangeWindowMaximized(maximized);
                }
            }, { windowId: targetWindowId, maximized: this.layoutService.isWindowMaximized(targetWindow) }));
        }
        // Window System Context Menu
        // See https://github.com/electron/electron/issues/24893
        if (isWindows && !hasNativeTitlebar(this.configurationService)) {
            this._register(this.nativeHostService.onDidTriggerWindowSystemContextMenu(({ windowId, x, y }) => {
                if (targetWindowId !== windowId) {
                    return;
                }
                const zoomFactor = getZoomFactor(getWindow(this.element));
                this.onContextMenu(new MouseEvent(EventType.MOUSE_UP, { clientX: x / zoomFactor, clientY: y / zoomFactor }), MenuId.TitleBarContext);
            }));
        }
        return result;
    }
    onDidChangeWindowMaximized(maximized) {
        if (this.maxRestoreControl) {
            if (maximized) {
                this.maxRestoreControl.classList.remove(...ThemeIcon.asClassNameArray(Codicon.chromeMaximize));
                this.maxRestoreControl.classList.add(...ThemeIcon.asClassNameArray(Codicon.chromeRestore));
            }
            else {
                this.maxRestoreControl.classList.remove(...ThemeIcon.asClassNameArray(Codicon.chromeRestore));
                this.maxRestoreControl.classList.add(...ThemeIcon.asClassNameArray(Codicon.chromeMaximize));
            }
        }
        if (this.resizer) {
            if (maximized) {
                hide(this.resizer);
            }
            else {
                show(this.resizer);
            }
        }
    }
    updateStyles() {
        super.updateStyles();
        // Part container
        if (this.element) {
            if (useWindowControlsOverlay(this.configurationService)) {
                if (!this.cachedWindowControlStyles ||
                    this.cachedWindowControlStyles.bgColor !== this.element.style.backgroundColor ||
                    this.cachedWindowControlStyles.fgColor !== this.element.style.color) {
                    this.nativeHostService.updateWindowControls({
                        targetWindowId: getWindowId(getWindow(this.element)),
                        backgroundColor: this.element.style.backgroundColor,
                        foregroundColor: this.element.style.color
                    });
                }
            }
        }
    }
    layout(width, height) {
        super.layout(width, height);
        if (useWindowControlsOverlay(this.configurationService)) {
            // When the user goes into full screen mode, the height of the title bar becomes 0.
            // Instead, set it back to the default titlebar height for Catalina users
            // so that they can have the traffic lights rendered at the proper offset.
            // Ref https://github.com/microsoft/vscode/issues/159862
            const newHeight = (height > 0 || this.bigSurOrNewer) ? Math.round(height * getZoomFactor(getWindow(this.element))) : this.macTitlebarSize;
            if (newHeight !== this.cachedWindowControlHeight) {
                this.cachedWindowControlHeight = newHeight;
                this.nativeHostService.updateWindowControls({
                    targetWindowId: getWindowId(getWindow(this.element)),
                    height: newHeight
                });
            }
        }
    }
};
NativeTitlebarPart = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, INativeHostService),
    __param(13, IEditorGroupsService),
    __param(14, IEditorService),
    __param(15, IMenuService),
    __param(16, IKeybindingService)
], NativeTitlebarPart);
export { NativeTitlebarPart };
let MainNativeTitlebarPart = class MainNativeTitlebarPart extends NativeTitlebarPart {
    constructor(contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService) {
        super("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow, 'main', contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService);
    }
};
MainNativeTitlebarPart = __decorate([
    __param(0, IContextMenuService),
    __param(1, IConfigurationService),
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, IInstantiationService),
    __param(4, IThemeService),
    __param(5, IStorageService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IContextKeyService),
    __param(8, IHostService),
    __param(9, INativeHostService),
    __param(10, IEditorGroupsService),
    __param(11, IEditorService),
    __param(12, IMenuService),
    __param(13, IKeybindingService)
], MainNativeTitlebarPart);
export { MainNativeTitlebarPart };
let AuxiliaryNativeTitlebarPart = class AuxiliaryNativeTitlebarPart extends NativeTitlebarPart {
    static { AuxiliaryNativeTitlebarPart_1 = this; }
    static { this.COUNTER = 1; }
    get height() { return this.minimumHeight; }
    constructor(container, editorGroupsContainer, mainTitlebar, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService) {
        const id = AuxiliaryNativeTitlebarPart_1.COUNTER++;
        super(`workbench.parts.auxiliaryTitle.${id}`, getWindow(container), editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService);
        this.container = container;
        this.mainTitlebar = mainTitlebar;
    }
    get preventZoom() {
        // Prevent zooming behavior if any of the following conditions are met:
        // 1. Shrinking below the window control size (zoom < 1)
        // 2. No custom items are present in the main title bar
        // The auxiliary title bar never contains any zoomable items itself,
        // but we want to match the behavior of the main title bar.
        return getZoomFactor(getWindow(this.element)) < 1 || !this.mainTitlebar.hasZoomableElements;
    }
};
AuxiliaryNativeTitlebarPart = AuxiliaryNativeTitlebarPart_1 = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, INativeHostService),
    __param(13, IEditorGroupsService),
    __param(14, IEditorService),
    __param(15, IMenuService),
    __param(16, IKeybindingService)
], AuxiliaryNativeTitlebarPart);
export { AuxiliaryNativeTitlebarPart };
export class NativeTitleService extends BrowserTitleService {
    createMainTitlebarPart() {
        return this.instantiationService.createInstance(MainNativeTitlebarPart);
    }
    doCreateAuxiliaryTitlebarPart(container, editorGroupsContainer) {
        return this.instantiationService.createInstance(AuxiliaryNativeTitlebarPart, container, editorGroupsContainer, this.mainPart);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGl0bGViYXJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9lbGVjdHJvbi1zYW5kYm94L3BhcnRzL3RpdGxlYmFyL3RpdGxlYmFyUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUE2QixNQUFNLDREQUE0RCxDQUFDO0FBQzlILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUMxSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixJQUFJLG1CQUFtQixFQUFFLG1CQUFtQixFQUEwQixNQUFNLGlEQUFpRCxDQUFDO0FBQzFKLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxD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