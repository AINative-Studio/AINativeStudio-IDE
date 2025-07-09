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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3dvcmtiZW5jaFRoZW1lU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUdwRyxPQUFPLEVBQWUsYUFBYSxFQUFxQyxNQUFNLG1EQUFtRCxDQUFDO0FBRWxJLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJdkUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsc0JBQXNCLENBQXdDLGFBQWEsQ0FBQyxDQUFDO0FBRW5ILE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQztBQUMxQyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxHQUFHLENBQUM7QUFDM0MsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBRXhDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUM7QUFFNUMsTUFBTSxDQUFOLElBQVksYUFnQlg7QUFoQkQsV0FBWSxhQUFhO0lBQ3hCLHFEQUFvQyxDQUFBO0lBQ3BDLHdEQUF1QyxDQUFBO0lBQ3ZDLGtFQUFpRCxDQUFBO0lBQ2pELHVFQUFzRCxDQUFBO0lBQ3RELCtFQUE4RCxDQUFBO0lBQzlELGdHQUErRSxDQUFBO0lBRS9FLDJFQUEwRCxDQUFBO0lBQzFELDZFQUE0RCxDQUFBO0lBQzVELHNGQUFxRSxDQUFBO0lBQ3JFLDRGQUEyRSxDQUFBO0lBQzNFLHFFQUFvRCxDQUFBO0lBQ3BELDREQUEyQyxDQUFBO0lBRTNDLCtEQUE4QyxDQUFBO0FBQy9DLENBQUMs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