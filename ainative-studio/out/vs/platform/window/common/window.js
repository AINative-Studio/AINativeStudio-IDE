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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvdy9jb21tb24vd2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBYWhGLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHO0lBQ2hDLEtBQUssRUFBRSxHQUFHO0lBQ1YseUJBQXlCLEVBQUUsR0FBRztJQUM5QixNQUFNLEVBQUUsR0FBRztDQUNYLENBQUM7QUFvRUYsTUFBTSxVQUFVLHVCQUF1QixDQUFDLFNBQXFEO0lBQzVGLE9BQU8sT0FBUSxTQUFvQyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUM7QUFDM0UsQ0FBQztBQXNCRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsU0FBMEI7SUFDM0QsT0FBTyxDQUFDLENBQUUsU0FBOEIsQ0FBQyxZQUFZLENBQUM7QUFDdkQsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsU0FBMEI7SUFDeEQsT0FBTyxDQUFDLENBQUUsU0FBMkIsQ0FBQyxTQUFTLENBQUM7QUFDakQsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZLENBQUMsU0FBMEI7SUFDdEQsT0FBTyxDQUFDLENBQUUsU0FBeUIsQ0FBQyxPQUFPLENBQUM7QUFDN0MsQ0FBQztBQUlELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxvQkFBMkM7SUFDL0UsTUFBTSxxQkFBcUIsR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3RFLE1BQU0saUJBQWlCLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFnQywwQkFBMEIsQ0FBQyxDQUFDO0lBRW5ILElBQUksaUJBQWlCLEtBQUssU0FBUyxJQUFJLENB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