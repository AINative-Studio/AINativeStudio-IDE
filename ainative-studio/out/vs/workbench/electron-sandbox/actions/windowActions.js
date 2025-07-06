/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/actions.css';
import { URI } from '../../../base/common/uri.js';
import { localize, localize2 } from '../../../nls.js';
import { ApplyZoomTarget, MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL, applyZoom } from '../../../platform/window/electron-sandbox/window.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { getZoomLevel } from '../../../base/browser/browser.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { getIconClasses } from '../../../editor/common/services/getIconClasses.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier } from '../../../platform/workspace/common/workspace.js';
import { Action2, MenuId } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { getActiveWindow } from '../../../base/browser/dom.js';
import { isOpenedAuxiliaryWindow } from '../../../platform/window/common/window.js';
export class CloseWindowAction extends Action2 {
    static { this.ID = 'workbench.action.closeWindow'; }
    constructor() {
        super({
            id: CloseWindowAction.ID,
            title: {
                ...localize2('closeWindow', "Close Window"),
                mnemonicTitle: localize({ key: 'miCloseWindow', comment: ['&& denotes a mnemonic'] }, "Clos&&e Window"),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 53 /* KeyCode.KeyW */ },
                linux: { primary: 512 /* KeyMod.Alt */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 53 /* KeyCode.KeyW */] },
                win: { primary: 512 /* KeyMod.Alt */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 53 /* KeyCode.KeyW */] }
            },
            menu: {
                id: MenuId.MenubarFileMenu,
                group: '6_close',
                order: 4
            }
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        return nativeHostService.closeWindow({ targetWindowId: getActiveWindow().vscodeWindowId });
    }
}
class BaseZoomAction extends Action2 {
    static { this.ZOOM_LEVEL_SETTING_KEY = 'window.zoomLevel'; }
    static { this.ZOOM_PER_WINDOW_SETTING_KEY = 'window.zoomPerWindow'; }
    constructor(desc) {
        super(desc);
    }
    async setZoomLevel(accessor, levelOrReset) {
        const configurationService = accessor.get(IConfigurationService);
        let target;
        if (configurationService.getValue(BaseZoomAction.ZOOM_PER_WINDOW_SETTING_KEY) !== false) {
            target = ApplyZoomTarget.ACTIVE_WINDOW;
        }
        else {
            target = ApplyZoomTarget.ALL_WINDOWS;
        }
        let level;
        if (typeof levelOrReset === 'number') {
            level = Math.round(levelOrReset); // prevent fractional zoom levels
        }
        else {
            // reset to 0 when we apply to all windows
            if (target === ApplyZoomTarget.ALL_WINDOWS) {
                level = 0;
            }
            // otherwise, reset to the default zoom level
            else {
                const defaultLevel = configurationService.getValue(BaseZoomAction.ZOOM_LEVEL_SETTING_KEY);
                if (typeof defaultLevel === 'number') {
                    level = defaultLevel;
                }
                else {
                    level = 0;
                }
            }
        }
        if (level > MAX_ZOOM_LEVEL || level < MIN_ZOOM_LEVEL) {
            return; // https://github.com/microsoft/vscode/issues/48357
        }
        if (target === ApplyZoomTarget.ALL_WINDOWS) {
            await configurationService.updateValue(BaseZoomAction.ZOOM_LEVEL_SETTING_KEY, level);
        }
        applyZoom(level, target);
    }
}
export class ZoomInAction extends BaseZoomAction {
    constructor() {
        super({
            id: 'workbench.action.zoomIn',
            title: {
                ...localize2('zoomIn', "Zoom In"),
                mnemonicTitle: localize({ key: 'miZoomIn', comment: ['&& denotes a mnemonic'] }, "&&Zoom In"),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 86 /* KeyCode.Equal */, 2048 /* KeyMod.CtrlCmd */ | 109 /* KeyCode.NumpadAdd */]
            },
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '5_zoom',
                order: 1
            }
        });
    }
    run(accessor) {
        return super.setZoomLevel(accessor, getZoomLevel(getActiveWindow()) + 1);
    }
}
export class ZoomOutAction extends BaseZoomAction {
    constructor() {
        super({
            id: 'workbench.action.zoomOut',
            title: {
                ...localize2('zoomOut', "Zoom Out"),
                mnemonicTitle: localize({ key: 'miZoomOut', comment: ['&& denotes a mnemonic'] }, "&&Zoom Out"),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 88 /* KeyCode.Minus */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 88 /* KeyCode.Minus */, 2048 /* KeyMod.CtrlCmd */ | 111 /* KeyCode.NumpadSubtract */],
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 88 /* KeyCode.Minus */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 111 /* KeyCode.NumpadSubtract */]
                }
            },
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '5_zoom',
                order: 2
            }
        });
    }
    run(accessor) {
        return super.setZoomLevel(accessor, getZoomLevel(getActiveWindow()) - 1);
    }
}
export class ZoomResetAction extends BaseZoomAction {
    constructor() {
        super({
            id: 'workbench.action.zoomReset',
            title: {
                ...localize2('zoomReset', "Reset Zoom"),
                mnemonicTitle: localize({ key: 'miZoomReset', comment: ['&& denotes a mnemonic'] }, "&&Reset Zoom"),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 98 /* KeyCode.Numpad0 */
            },
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '5_zoom',
                order: 3
            }
        });
    }
    run(accessor) {
        return super.setZoomLevel(accessor, true);
    }
}
class BaseSwitchWindow extends Action2 {
    constructor(desc) {
        super(desc);
        this.closeWindowAction = {
            iconClass: ThemeIcon.asClassName(Codicon.removeClose),
            tooltip: localize('close', "Close Window")
        };
        this.closeDirtyWindowAction = {
            iconClass: 'dirty-window ' + ThemeIcon.asClassName(Codicon.closeDirty),
            tooltip: localize('close', "Close Window"),
            alwaysVisible: true
        };
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const keybindingService = accessor.get(IKeybindingService);
        const modelService = accessor.get(IModelService);
        const languageService = accessor.get(ILanguageService);
        const nativeHostService = accessor.get(INativeHostService);
        const currentWindowId = getActiveWindow().vscodeWindowId;
        const windows = await nativeHostService.getWindows({ includeAuxiliaryWindows: true });
        const mainWindows = new Set();
        const mapMainWindowToAuxiliaryWindows = new Map();
        for (const window of windows) {
            if (isOpenedAuxiliaryWindow(window)) {
                let auxiliaryWindows = mapMainWindowToAuxiliaryWindows.get(window.parentId);
                if (!auxiliaryWindows) {
                    auxiliaryWindows = new Set();
                    mapMainWindowToAuxiliaryWindows.set(window.parentId, auxiliaryWindows);
                }
                auxiliaryWindows.add(window);
            }
            else {
                mainWindows.add(window);
            }
        }
        function isWindowPickItem(candidate) {
            const windowPickItem = candidate;
            return typeof windowPickItem?.windowId === 'number';
        }
        const picks = [];
        for (const window of mainWindows) {
            const auxiliaryWindows = mapMainWindowToAuxiliaryWindows.get(window.id);
            if (mapMainWindowToAuxiliaryWindows.size > 0) {
                picks.push({ type: 'separator', label: auxiliaryWindows ? localize('windowGroup', "window group") : undefined });
            }
            const resource = window.filename ? URI.file(window.filename) : isSingleFolderWorkspaceIdentifier(window.workspace) ? window.workspace.uri : isWorkspaceIdentifier(window.workspace) ? window.workspace.configPath : undefined;
            const fileKind = window.filename ? FileKind.FILE : isSingleFolderWorkspaceIdentifier(window.workspace) ? FileKind.FOLDER : isWorkspaceIdentifier(window.workspace) ? FileKind.ROOT_FOLDER : FileKind.FILE;
            const pick = {
                windowId: window.id,
                label: window.title,
                ariaLabel: window.dirty ? localize('windowDirtyAriaLabel', "{0}, window with unsaved changes", window.title) : window.title,
                iconClasses: getIconClasses(modelService, languageService, resource, fileKind),
                description: (currentWindowId === window.id) ? localize('current', "Current Window") : undefined,
                buttons: currentWindowId !== window.id ? window.dirty ? [this.closeDirtyWindowAction] : [this.closeWindowAction] : undefined
            };
            picks.push(pick);
            if (auxiliaryWindows) {
                for (const auxiliaryWindow of auxiliaryWindows) {
                    const pick = {
                        windowId: auxiliaryWindow.id,
                        label: auxiliaryWindow.title,
                        iconClasses: getIconClasses(modelService, languageService, auxiliaryWindow.filename ? URI.file(auxiliaryWindow.filename) : undefined, FileKind.FILE),
                        description: (currentWindowId === auxiliaryWindow.id) ? localize('current', "Current Window") : undefined,
                        buttons: [this.closeWindowAction]
                    };
                    picks.push(pick);
                }
            }
        }
        const pick = await quickInputService.pick(picks, {
            contextKey: 'inWindowsPicker',
            activeItem: (() => {
                for (let i = 0; i < picks.length; i++) {
                    const pick = picks[i];
                    if (isWindowPickItem(pick) && pick.windowId === currentWindowId) {
                        let nextPick = picks[i + 1]; // try to select next window unless it's a separator
                        if (isWindowPickItem(nextPick)) {
                            return nextPick;
                        }
                        nextPick = picks[i + 2]; // otherwise try to select the next window after the separator
                        if (isWindowPickItem(nextPick)) {
                            return nextPick;
                        }
                    }
                }
                return undefined;
            })(),
            placeHolder: localize('switchWindowPlaceHolder', "Select a window to switch to"),
            quickNavigate: this.isQuickNavigate() ? { keybindings: keybindingService.lookupKeybindings(this.desc.id) } : undefined,
            hideInput: this.isQuickNavigate(),
            onDidTriggerItemButton: async (context) => {
                await nativeHostService.closeWindow({ targetWindowId: context.item.windowId });
                context.removeItem();
            }
        });
        if (pick) {
            nativeHostService.focusWindow({ targetWindowId: pick.windowId });
        }
    }
}
export class SwitchWindowAction extends BaseSwitchWindow {
    constructor() {
        super({
            id: 'workbench.action.switchWindow',
            title: localize2('switchWindow', 'Switch Window...'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 53 /* KeyCode.KeyW */ }
            }
        });
    }
    isQuickNavigate() {
        return false;
    }
}
export class QuickSwitchWindowAction extends BaseSwitchWindow {
    constructor() {
        super({
            id: 'workbench.action.quickSwitchWindow',
            title: localize2('quickSwitchWindow', 'Quick Switch Window...'),
            f1: false // hide quick pickers from command palette to not confuse with the other entry that shows a input field
        });
    }
    isQuickNavigate() {
        return true;
    }
}
function canRunNativeTabsHandler(accessor) {
    if (!isMacintosh) {
        return false;
    }
    const configurationService = accessor.get(IConfigurationService);
    return configurationService.getValue('window.nativeTabs') === true;
}
export const NewWindowTabHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).newWindowTab();
};
export const ShowPreviousWindowTabHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).showPreviousWindowTab();
};
export const ShowNextWindowTabHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).showNextWindowTab();
};
export const MoveWindowTabToNewWindowHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).moveWindowTabToNewWindow();
};
export const MergeWindowTabsHandlerHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).mergeAllWindowTabs();
};
export const ToggleWindowTabsBarHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).toggleWindowTabsBar();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9lbGVjdHJvbi1zYW5kYm94L2FjdGlvbnMvd2luZG93QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHFCQUFxQixDQUFDO0FBQzdCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNqSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQXFELE1BQU0sbURBQW1ELENBQUM7QUFDMUksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBR25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7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