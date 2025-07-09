/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ThemeSettings } from '../common/workbenchThemeService.js';
import { COLOR_THEME_CONFIGURATION_SETTINGS_TAG, formatSettingAsLink } from '../common/themeConfiguration.js';
import { isLinux } from '../../../../base/common/platform.js';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    properties: {
        [ThemeSettings.SYSTEM_COLOR_THEME]: {
            type: 'string',
            enum: ['default', 'auto', 'light', 'dark'],
            enumDescriptions: [
                localize('window.systemColorTheme.default', "Native widget colors match the system colors."),
                localize('window.systemColorTheme.auto', "Use light native widget colors for light color themes and dark for dark color themes."),
                localize('window.systemColorTheme.light', "Use light native widget colors."),
                localize('window.systemColorTheme.dark', "Use dark native widget colors."),
            ],
            markdownDescription: localize({ key: 'window.systemColorTheme', comment: ['{0} and {1} will become links to other settings.'] }, "Set the color mode for native UI elements such as native dialogs, menus and title bar. Even if your OS is configured in light color mode, you can select a dark system color theme for the window. You can also configure to automatically adjust based on the {0} setting.\n\nNote: This setting is ignored when {1} is enabled.", formatSettingAsLink(ThemeSettings.COLOR_THEME), formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
            default: 'default',
            included: !isLinux,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2VsZWN0cm9uLXNhbmRib3gvdGhlbWVzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFzQixNQUFNLG9FQUFvRSxDQUFDO0FBQ3ZLLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN6RyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxVQUFVLEVBQUU7UUFDWCxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ25DLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO1lBQzFDLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMsaUNBQWlDLEVBQUUsK0NBQStDLENBQUM7Z0JBQzVGLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSx1RkFBdUYsQ0FBQztnQkFDakksUUFBUSxDQUFDLCtCQUErQixFQUFFLGlDQUFpQyxDQUFDO2dCQUM1RSxRQUFRLENBQUMsOEJBQThCLEVBQUUsZ0NBQWdDLENBQUM7YUFDMUU7WUFDRCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUMsa0RBQWtELENBQUMsRUFBRSxFQUFFLG1VQUFtVSxFQUFFLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUM3aUIsT0FBTyxFQUFFLFNBQVM7WUFDbEIsUUFBUSxFQUFFLENBQUMsT0FBTztZQUNsQixLQUFLLHdDQUFnQztZQUNyQyxJQUFJLEVBQUUsQ0FBQyxzQ0FBc0MsQ0FBQztTQUM5QztLQUNEO0NBQ0QsQ0FBQyxDQUFDIn0=