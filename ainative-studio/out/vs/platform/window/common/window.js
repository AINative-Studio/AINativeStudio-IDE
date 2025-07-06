/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh, isNative, isWeb } from '../../../base/common/platform.js';
export const WindowMinimumSize = {
    WIDTH: 400,
    WIDTH_WITH_VERTICAL_PANEL: 600,
    HEIGHT: 270
};
export function isOpenedAuxiliaryWindow(candidate) {
    return typeof candidate.parentId === 'number';
}
export function isWorkspaceToOpen(uriToOpen) {
    return !!uriToOpen.workspaceUri;
}
export function isFolderToOpen(uriToOpen) {
    return !!uriToOpen.folderUri;
}
export function isFileToOpen(uriToOpen) {
    return !!uriToOpen.fileUri;
}
export function getMenuBarVisibility(configurationService) {
    const nativeTitleBarEnabled = hasNativeTitlebar(configurationService);
    const menuBarVisibility = configurationService.getValue('window.menuBarVisibility');
    if (menuBarVisibility === 'default' || (nativeTitleBarEnabled && menuBarVisibility === 'compact') || (isMacintosh && isNative)) {
        return 'classic';
    }
    else {
        return menuBarVisibility;
    }
}
export var TitleBarSetting;
(function (TitleBarSetting) {
    TitleBarSetting["TITLE_BAR_STYLE"] = "window.titleBarStyle";
    TitleBarSetting["CUSTOM_TITLE_BAR_VISIBILITY"] = "window.customTitleBarVisibility";
})(TitleBarSetting || (TitleBarSetting = {}));
export var TitlebarStyle;
(function (TitlebarStyle) {
    TitlebarStyle["NATIVE"] = "native";
    TitlebarStyle["CUSTOM"] = "custom";
})(TitlebarStyle || (TitlebarStyle = {}));
export var WindowControlsStyle;
(function (WindowControlsStyle) {
    WindowControlsStyle["NATIVE"] = "native";
    WindowControlsStyle["CUSTOM"] = "custom";
    WindowControlsStyle["HIDDEN"] = "hidden";
})(WindowControlsStyle || (WindowControlsStyle = {}));
export var CustomTitleBarVisibility;
(function (CustomTitleBarVisibility) {
    CustomTitleBarVisibility["AUTO"] = "auto";
    CustomTitleBarVisibility["WINDOWED"] = "windowed";
    CustomTitleBarVisibility["NEVER"] = "never";
})(CustomTitleBarVisibility || (CustomTitleBarVisibility = {}));
export function hasCustomTitlebar(configurationService, titleBarStyle) {
    // Returns if it possible to have a custom title bar in the curren session
    // Does not imply that the title bar is visible
    return true;
}
export function hasNativeTitlebar(configurationService, titleBarStyle) {
    if (!titleBarStyle) {
        titleBarStyle = getTitleBarStyle(configurationService);
    }
    return titleBarStyle === "native" /* TitlebarStyle.NATIVE */;
}
export function getTitleBarStyle(configurationService) {
    if (isWeb) {
        return "custom" /* TitlebarStyle.CUSTOM */;
    }
    const configuration = configurationService.getValue('window');
    if (configuration) {
        const useNativeTabs = isMacintosh && configuration.nativeTabs === true;
        if (useNativeTabs) {
            return "native" /* TitlebarStyle.NATIVE */; // native tabs on sierra do not work with custom title style
        }
        const useSimpleFullScreen = isMacintosh && configuration.nativeFullScreen === false;
        if (useSimpleFullScreen) {
            return "native" /* TitlebarStyle.NATIVE */; // simple fullscreen does not work well with custom title style (https://github.com/microsoft/vscode/issues/63291)
        }
        const style = configuration.titleBarStyle;
        if (style === "native" /* TitlebarStyle.NATIVE */ || style === "custom" /* TitlebarStyle.CUSTOM */) {
            return style;
        }
    }
    return "custom" /* TitlebarStyle.CUSTOM */; // default to custom on all OS
}
export function getWindowControlsStyle(configurationService) {
    if (isWeb || isMacintosh || getTitleBarStyle(configurationService) === "native" /* TitlebarStyle.NATIVE */) {
        return "native" /* WindowControlsStyle.NATIVE */; // only supported on Windows/Linux desktop with custom titlebar
    }
    const configuration = configurationService.getValue('window');
    const style = configuration?.controlsStyle;
    if (style === "custom" /* WindowControlsStyle.CUSTOM */ || style === "hidden" /* WindowControlsStyle.HIDDEN */) {
        return style;
    }
    return "native" /* WindowControlsStyle.NATIVE */; // default to native on all OS
}
export const DEFAULT_CUSTOM_TITLEBAR_HEIGHT = 35; // includes space for command center
export function useWindowControlsOverlay(configurationService) {
    if (isWeb) {
        return false; // only supported on desktop instances
    }
    if (hasNativeTitlebar(configurationService)) {
        return false; // only supported when title bar is custom
    }
    if (!isMacintosh) {
        const setting = getWindowControlsStyle(configurationService);
        if (setting === "custom" /* WindowControlsStyle.CUSTOM */ || setting === "hidden" /* WindowControlsStyle.HIDDEN */) {
            return false; // explicitly disabled by choice
        }
    }
    return true; // default
}
export function useNativeFullScreen(configurationService) {
    const windowConfig = configurationService.getValue('window');
    if (!windowConfig || typeof windowConfig.nativeFullScreen !== 'boolean') {
        return true; // default
    }
    if (windowConfig.nativeTabs) {
        return true; // https://github.com/electron/electron/issues/16142
    }
    return windowConfig.nativeFullScreen !== false;
}
/**
 * According to Electron docs: `scale := 1.2 ^ level`.
 * https://github.com/electron/electron/blob/master/docs/api/web-contents.md#contentssetzoomlevellevel
 */
export function zoomLevelToZoomFactor(zoomLevel = 0) {
    return Math.pow(1.2, zoomLevel);
}
export const DEFAULT_WINDOW_SIZE = { width: 1200, height: 800 };
export const DEFAULT_AUX_WINDOW_SIZE = { width: 1024, height: 768 };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93L2NvbW1vbi93aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFhaEYsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUc7SUFDaEMsS0FBSyxFQUFFLEdBQUc7SUFDVix5QkFBeUIsRUFBRSxHQUFHO0lBQzlCLE1BQU0sRUFBRSxHQUFHO0NBQ1gsQ0FBQztBQW9FRixNQUFNLFVBQVUsdUJBQXVCLENBQUMsU0FBcUQ7SUFDNUYsT0FBTyxPQUFRLFNBQW9DLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQztBQUMzRSxDQUFDO0FBc0JELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxTQUEwQjtJQUMzRCxPQUFPLENBQUMsQ0FBRSxTQUE4QixDQUFDLFlBQVksQ0FBQztBQUN2RCxDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxTQUEwQjtJQUN4RCxPQUFPLENBQUMsQ0FBRSxTQUEyQixDQUFDLFNBQVMsQ0FBQztBQUNqRCxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxTQUEwQjtJQUN0RCxPQUFPLENBQUMsQ0FBRSxTQUF5QixDQUFDLE9BQU8sQ0FBQztBQUM3QyxDQUFDO0FBSUQsTUFBTSxVQUFVLG9CQUFvQixDQUFDLG9CQUEyQztJQUMvRSxNQUFNLHFCQUFxQixHQUFHLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDdEUsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQWdDLDBCQUEwQixDQUFDLENBQUM7SUFFbkgsSUFBSSxpQkFBaUIsS0FBSyxTQUFTLElBQUksQ0FB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