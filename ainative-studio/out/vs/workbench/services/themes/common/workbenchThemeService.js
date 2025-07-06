/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isBoolean, isString } from '../../../../base/common/types.js';
export const IWorkbenchThemeService = refineServiceDecorator(IThemeService);
export const THEME_SCOPE_OPEN_PAREN = '[';
export const THEME_SCOPE_CLOSE_PAREN = ']';
export const THEME_SCOPE_WILDCARD = '*';
export const themeScopeRegex = /\[(.+?)\]/g;
export var ThemeSettings;
(function (ThemeSettings) {
    ThemeSettings["COLOR_THEME"] = "workbench.colorTheme";
    ThemeSettings["FILE_ICON_THEME"] = "workbench.iconTheme";
    ThemeSettings["PRODUCT_ICON_THEME"] = "workbench.productIconTheme";
    ThemeSettings["COLOR_CUSTOMIZATIONS"] = "workbench.colorCustomizations";
    ThemeSettings["TOKEN_COLOR_CUSTOMIZATIONS"] = "editor.tokenColorCustomizations";
    ThemeSettings["SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS"] = "editor.semanticTokenColorCustomizations";
    ThemeSettings["PREFERRED_DARK_THEME"] = "workbench.preferredDarkColorTheme";
    ThemeSettings["PREFERRED_LIGHT_THEME"] = "workbench.preferredLightColorTheme";
    ThemeSettings["PREFERRED_HC_DARK_THEME"] = "workbench.preferredHighContrastColorTheme";
    ThemeSettings["PREFERRED_HC_LIGHT_THEME"] = "workbench.preferredHighContrastLightColorTheme";
    ThemeSettings["DETECT_COLOR_SCHEME"] = "window.autoDetectColorScheme";
    ThemeSettings["DETECT_HC"] = "window.autoDetectHighContrast";
    ThemeSettings["SYSTEM_COLOR_THEME"] = "window.systemColorTheme";
})(ThemeSettings || (ThemeSettings = {}));
export var ThemeSettingDefaults;
(function (ThemeSettingDefaults) {
    ThemeSettingDefaults["COLOR_THEME_DARK"] = "Default Dark+";
    ThemeSettingDefaults["COLOR_THEME_LIGHT"] = "Default Light Modern";
    ThemeSettingDefaults["COLOR_THEME_HC_DARK"] = "Default High Contrast";
    ThemeSettingDefaults["COLOR_THEME_HC_LIGHT"] = "Default High Contrast Light";
    ThemeSettingDefaults["COLOR_THEME_DARK_OLD"] = "Default Dark Modern";
    ThemeSettingDefaults["COLOR_THEME_LIGHT_OLD"] = "Default Light+";
    ThemeSettingDefaults["FILE_ICON_THEME"] = "vs-seti";
    ThemeSettingDefaults["PRODUCT_ICON_THEME"] = "Default";
})(ThemeSettingDefaults || (ThemeSettingDefaults = {}));
export const COLOR_THEME_DARK_INITIAL_COLORS = {
    'activityBar.activeBorder': '#ffffff',
    'activityBar.background': '#333333',
    'activityBar.border': '#454545',
    'activityBar.foreground': '#ffffff',
    'activityBar.inactiveForeground': '#ffffff66',
    'editorGroup.border': '#444444',
    'editorGroupHeader.tabsBackground': '#252526',
    'editorGroupHeader.tabsBorder': '#252526',
    'statusBar.background': '#007ACC',
    'statusBar.border': '#454545',
    'statusBar.foreground': '#ffffff',
    'statusBar.noFolderBackground': '#68217A',
    'tab.activeBackground': '#2D2D2D',
    'tab.activeBorder': '#ffffff',
    'tab.activeBorderTop': '#007ACC',
    'tab.activeForeground': '#ffffff',
    'tab.border': '#252526',
    'textLink.foreground': '#3794ff',
    'titleBar.activeBackground': '#3C3C3C',
    'titleBar.activeForeground': '#CCCCCC',
    'titleBar.border': '#454545',
    'titleBar.inactiveBackground': '#2C2C2C',
    'titleBar.inactiveForeground': '#999999',
    'welcomePage.tileBackground': '#252526'
};
export const COLOR_THEME_LIGHT_INITIAL_COLORS = {
    'activityBar.activeBorder': '#005FB8',
    'activityBar.background': '#f8f8f8',
    'activityBar.border': '#e5e5e5',
    'activityBar.foreground': '#1f1f1f',
    'activityBar.inactiveForeground': '#616161',
    'editorGroup.border': '#e5e5e5',
    'editorGroupHeader.tabsBackground': '#f8f8f8',
    'editorGroupHeader.tabsBorder': '#e5e5e5',
    'statusBar.background': '#f8f8f8',
    'statusBar.border': '#e5e5e5',
    'statusBar.foreground': '#3b3b3b',
    'statusBar.noFolderBackground': '#f8f8f8',
    'tab.activeBackground': '#ffffff',
    'tab.activeBorder': '#f8f8f8',
    'tab.activeBorderTop': '#005fb8',
    'tab.activeForeground': '#3b3b3b',
    'tab.border': '#e5e5e5',
    'textLink.foreground': '#005fb8',
    'titleBar.activeBackground': '#f8f8f8',
    'titleBar.activeForeground': '#1e1e1e',
    'titleBar.border': '#E5E5E5',
    'titleBar.inactiveBackground': '#f8f8f8',
    'titleBar.inactiveForeground': '#8b949e',
    'welcomePage.tileBackground': '#f3f3f3'
};
export var ExtensionData;
(function (ExtensionData) {
    function toJSONObject(d) {
        return d && { _extensionId: d.extensionId, _extensionIsBuiltin: d.extensionIsBuiltin, _extensionName: d.extensionName, _extensionPublisher: d.extensionPublisher };
    }
    ExtensionData.toJSONObject = toJSONObject;
    function fromJSONObject(o) {
        if (o && isString(o._extensionId) && isBoolean(o._extensionIsBuiltin) && isString(o._extensionName) && isString(o._extensionPublisher)) {
            return { extensionId: o._extensionId, extensionIsBuiltin: o._extensionIsBuiltin, extensionName: o._extensionName, extensionPublisher: o._extensionPublisher };
        }
        return undefined;
    }
    ExtensionData.fromJSONObject = fromJSONObject;
    function fromName(publisher, name, isBuiltin = false) {
        return { extensionPublisher: publisher, extensionId: `${publisher}.${name}`, extensionName: name, extensionIsBuiltin: isBuiltin };
    }
    ExtensionData.fromName = fromName;
})(ExtensionData || (ExtensionData = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vd29ya2JlbmNoVGhlbWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR3BHLE9BQU8sRUFBZSxhQUFhLEVBQXFDLE1BQU0sbURBQW1ELENBQUM7QUFFbEksT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUl2RSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBd0MsYUFBYSxDQUFDLENBQUM7QUFFbkgsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDO0FBQzFDLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQztBQUMzQyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUM7QUFFeEMsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQztBQUU1QyxNQUFNLENBQU4sSUFBWSxhQWdCWDtBQWhCRCxXQUFZLGFBQWE7SUFDeEIscURBQW9DLENBQUE7SUFDcEMsd0RBQXVDLENBQUE7SUFDdkMsa0VBQWlELENBQUE7SUFDakQsdUVBQXNELENBQUE7SUFDdEQsK0VBQThELENBQUE7SUFDOUQsZ0dBQStFLENBQUE7SUFFL0UsMkVBQTBELENBQUE7SUFDMUQsNkVBQTRELENBQUE7SUFDNUQsc0ZBQXFFLENBQUE7SUFDckUsNEZBQTJFLENBQUE7SUFDM0UscUVBQW9ELENBQUE7SUFDcEQsNERBQTJDLENBQUE7SUFFM0MsK0RBQThDLENBQUE7QUFDL0MsQ0FBQyxF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