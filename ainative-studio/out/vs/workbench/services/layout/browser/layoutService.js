/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { isMacintosh, isNative, isWeb } from '../../../../base/common/platform.js';
import { isAuxiliaryWindow } from '../../../../base/browser/window.js';
import { getMenuBarVisibility, hasCustomTitlebar, hasNativeTitlebar } from '../../../../platform/window/common/window.js';
import { isFullscreen, isWCOEnabled } from '../../../../base/browser/browser.js';
export const IWorkbenchLayoutService = refineServiceDecorator(ILayoutService);
export var Parts;
(function (Parts) {
    Parts["TITLEBAR_PART"] = "workbench.parts.titlebar";
    Parts["BANNER_PART"] = "workbench.parts.banner";
    Parts["ACTIVITYBAR_PART"] = "workbench.parts.activitybar";
    Parts["SIDEBAR_PART"] = "workbench.parts.sidebar";
    Parts["PANEL_PART"] = "workbench.parts.panel";
    Parts["AUXILIARYBAR_PART"] = "workbench.parts.auxiliarybar";
    Parts["EDITOR_PART"] = "workbench.parts.editor";
    Parts["STATUSBAR_PART"] = "workbench.parts.statusbar";
})(Parts || (Parts = {}));
export var ZenModeSettings;
(function (ZenModeSettings) {
    ZenModeSettings["SHOW_TABS"] = "zenMode.showTabs";
    ZenModeSettings["HIDE_LINENUMBERS"] = "zenMode.hideLineNumbers";
    ZenModeSettings["HIDE_STATUSBAR"] = "zenMode.hideStatusBar";
    ZenModeSettings["HIDE_ACTIVITYBAR"] = "zenMode.hideActivityBar";
    ZenModeSettings["CENTER_LAYOUT"] = "zenMode.centerLayout";
    ZenModeSettings["FULLSCREEN"] = "zenMode.fullScreen";
    ZenModeSettings["RESTORE"] = "zenMode.restore";
    ZenModeSettings["SILENT_NOTIFICATIONS"] = "zenMode.silentNotifications";
})(ZenModeSettings || (ZenModeSettings = {}));
export var LayoutSettings;
(function (LayoutSettings) {
    LayoutSettings["ACTIVITY_BAR_LOCATION"] = "workbench.activityBar.location";
    LayoutSettings["EDITOR_TABS_MODE"] = "workbench.editor.showTabs";
    LayoutSettings["EDITOR_ACTIONS_LOCATION"] = "workbench.editor.editorActionsLocation";
    LayoutSettings["COMMAND_CENTER"] = "window.commandCenter";
    LayoutSettings["LAYOUT_ACTIONS"] = "workbench.layoutControl.enabled";
})(LayoutSettings || (LayoutSettings = {}));
export var ActivityBarPosition;
(function (ActivityBarPosition) {
    ActivityBarPosition["DEFAULT"] = "default";
    ActivityBarPosition["TOP"] = "top";
    ActivityBarPosition["BOTTOM"] = "bottom";
    ActivityBarPosition["HIDDEN"] = "hidden";
})(ActivityBarPosition || (ActivityBarPosition = {}));
export var EditorTabsMode;
(function (EditorTabsMode) {
    EditorTabsMode["MULTIPLE"] = "multiple";
    EditorTabsMode["SINGLE"] = "single";
    EditorTabsMode["NONE"] = "none";
})(EditorTabsMode || (EditorTabsMode = {}));
export var EditorActionsLocation;
(function (EditorActionsLocation) {
    EditorActionsLocation["DEFAULT"] = "default";
    EditorActionsLocation["TITLEBAR"] = "titleBar";
    EditorActionsLocation["HIDDEN"] = "hidden";
})(EditorActionsLocation || (EditorActionsLocation = {}));
export var Position;
(function (Position) {
    Position[Position["LEFT"] = 0] = "LEFT";
    Position[Position["RIGHT"] = 1] = "RIGHT";
    Position[Position["BOTTOM"] = 2] = "BOTTOM";
    Position[Position["TOP"] = 3] = "TOP";
})(Position || (Position = {}));
export function isHorizontal(position) {
    return position === 2 /* Position.BOTTOM */ || position === 3 /* Position.TOP */;
}
export var PanelOpensMaximizedOptions;
(function (PanelOpensMaximizedOptions) {
    PanelOpensMaximizedOptions[PanelOpensMaximizedOptions["ALWAYS"] = 0] = "ALWAYS";
    PanelOpensMaximizedOptions[PanelOpensMaximizedOptions["NEVER"] = 1] = "NEVER";
    PanelOpensMaximizedOptions[PanelOpensMaximizedOptions["REMEMBER_LAST"] = 2] = "REMEMBER_LAST";
})(PanelOpensMaximizedOptions || (PanelOpensMaximizedOptions = {}));
export function positionToString(position) {
    switch (position) {
        case 0 /* Position.LEFT */: return 'left';
        case 1 /* Position.RIGHT */: return 'right';
        case 2 /* Position.BOTTOM */: return 'bottom';
        case 3 /* Position.TOP */: return 'top';
        default: return 'bottom';
    }
}
const positionsByString = {
    [positionToString(0 /* Position.LEFT */)]: 0 /* Position.LEFT */,
    [positionToString(1 /* Position.RIGHT */)]: 1 /* Position.RIGHT */,
    [positionToString(2 /* Position.BOTTOM */)]: 2 /* Position.BOTTOM */,
    [positionToString(3 /* Position.TOP */)]: 3 /* Position.TOP */
};
export function positionFromString(str) {
    return positionsByString[str];
}
function panelOpensMaximizedSettingToString(setting) {
    switch (setting) {
        case 0 /* PanelOpensMaximizedOptions.ALWAYS */: return 'always';
        case 1 /* PanelOpensMaximizedOptions.NEVER */: return 'never';
        case 2 /* PanelOpensMaximizedOptions.REMEMBER_LAST */: return 'preserve';
        default: return 'preserve';
    }
}
const panelOpensMaximizedByString = {
    [panelOpensMaximizedSettingToString(0 /* PanelOpensMaximizedOptions.ALWAYS */)]: 0 /* PanelOpensMaximizedOptions.ALWAYS */,
    [panelOpensMaximizedSettingToString(1 /* PanelOpensMaximizedOptions.NEVER */)]: 1 /* PanelOpensMaximizedOptions.NEVER */,
    [panelOpensMaximizedSettingToString(2 /* PanelOpensMaximizedOptions.REMEMBER_LAST */)]: 2 /* PanelOpensMaximizedOptions.REMEMBER_LAST */
};
export function panelOpensMaximizedFromString(str) {
    return panelOpensMaximizedByString[str];
}
export function isMultiWindowPart(part) {
    return part === "workbench.parts.editor" /* Parts.EDITOR_PART */ ||
        part === "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */ ||
        part === "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */;
}
export function shouldShowCustomTitleBar(configurationService, window, menuBarToggled) {
    if (!hasCustomTitlebar(configurationService)) {
        return false;
    }
    const inFullscreen = isFullscreen(window);
    const nativeTitleBarEnabled = hasNativeTitlebar(configurationService);
    if (!isWeb) {
        const showCustomTitleBar = configurationService.getValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */);
        if (showCustomTitleBar === "never" /* CustomTitleBarVisibility.NEVER */ && nativeTitleBarEnabled || showCustomTitleBar === "windowed" /* CustomTitleBarVisibility.WINDOWED */ && inFullscreen) {
            return false;
        }
    }
    if (!isTitleBarEmpty(configurationService)) {
        return true;
    }
    // Hide custom title bar when native title bar enabled and custom title bar is empty
    if (nativeTitleBarEnabled) {
        return false;
    }
    // macOS desktop does not need a title bar when full screen
    if (isMacintosh && isNative) {
        return !inFullscreen;
    }
    // non-fullscreen native must show the title bar
    if (isNative && !inFullscreen) {
        return true;
    }
    // if WCO is visible, we have to show the title bar
    if (isWCOEnabled() && !inFullscreen) {
        return true;
    }
    // remaining behavior is based on menubar visibility
    const menuBarVisibility = !isAuxiliaryWindow(window) ? getMenuBarVisibility(configurationService) : 'hidden';
    switch (menuBarVisibility) {
        case 'classic':
            return !inFullscreen || !!menuBarToggled;
        case 'compact':
        case 'hidden':
            return false;
        case 'toggle':
            return !!menuBarToggled;
        case 'visible':
            return true;
        default:
            return isWeb ? false : !inFullscreen || !!menuBarToggled;
    }
}
function isTitleBarEmpty(configurationService) {
    // with the command center enabled, we should always show
    if (configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */)) {
        return false;
    }
    // with the activity bar on top, we should always show
    const activityBarPosition = configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
    if (activityBarPosition === "top" /* ActivityBarPosition.TOP */ || activityBarPosition === "bottom" /* ActivityBarPosition.BOTTOM */) {
        return false;
    }
    // with the editor actions on top, we should always show
    const editorActionsLocation = configurationService.getValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */);
    const editorTabsMode = configurationService.getValue("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */);
    if (editorActionsLocation === "titleBar" /* EditorActionsLocation.TITLEBAR */ || editorActionsLocation === "default" /* EditorActionsLocation.DEFAULT */ && editorTabsMode === "none" /* EditorTabsMode.NONE */) {
        return false;
    }
    // with the layout actions on top, we should always show
    if (configurationService.getValue("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */)) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sYXlvdXQvYnJvd3Nlci9sYXlvdXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRXBHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUl0RixPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RSxPQUFPLEVBQTZDLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDckssT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUlqRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxzQkFBc0IsQ0FBMEMsY0FBYyxDQUFDLENBQUM7QUFFdkgsTUFBTSxDQUFOLElBQWtCLEtBU2pCO0FBVEQsV0FBa0IsS0FBSztJQUN0QixtREFBMEMsQ0FBQTtJQUMxQywrQ0FBc0MsQ0FBQTtJQUN0Qyx5REFBZ0QsQ0FBQTtJQUNoRCxpREFBd0MsQ0FBQTtJQUN4Qyw2Q0FBb0MsQ0FBQTtJQUNwQywyREFBa0QsQ0FBQTtJQUNsRCwrQ0FBc0MsQ0FBQTtJQUN0QyxxREFBNEMsQ0FBQTtBQUM3QyxDQUFDLEVBVGlCLEtBQUssS0FBTCxLQUFLLFFBU3RCO0FBRUQsTUFBTSxDQUFOLElBQWtCLGVBU2pCO0FBVEQsV0FBa0IsZUFBZTtJQUNoQyxpREFBOEIsQ0FBQTtJQUM5QiwrREFB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