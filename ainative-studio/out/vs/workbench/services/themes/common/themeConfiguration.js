/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { textmateColorsSchemaId, textmateColorGroupSchemaId } from './colorThemeSchema.js';
import { workbenchColorsSchemaId } from '../../../../platform/theme/common/colorRegistry.js';
import { tokenStylingSchemaId } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
import { ThemeSettings, ThemeSettingDefaults } from './workbenchThemeService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
// Configuration: Themes
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const colorThemeSettingEnum = [];
const colorThemeSettingEnumItemLabels = [];
const colorThemeSettingEnumDescriptions = [];
export function formatSettingAsLink(str) {
    return `\`#${str}#\``;
}
export const COLOR_THEME_CONFIGURATION_SETTINGS_TAG = 'colorThemeConfiguration';
const colorThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize({ key: 'colorTheme', comment: ['{0} will become a link to another setting.'] }, "Specifies the color theme used in the workbench when {0} is not enabled.", formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: isWeb ? ThemeSettingDefaults.COLOR_THEME_LIGHT : ThemeSettingDefaults.COLOR_THEME_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', "Theme is unknown or not installed."),
};
const preferredDarkThemeSettingSchema = {
    type: 'string', //
    markdownDescription: nls.localize({ key: 'preferredDarkColorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme when system color mode is dark and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: ThemeSettingDefaults.COLOR_THEME_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', "Theme is unknown or not installed."),
};
const preferredLightThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize({ key: 'preferredLightColorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme when system color mode is light and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: ThemeSettingDefaults.COLOR_THEME_LIGHT,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', "Theme is unknown or not installed."),
};
const preferredHCDarkThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize({ key: 'preferredHCDarkColorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme when in high contrast dark mode and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_HC)),
    default: ThemeSettingDefaults.COLOR_THEME_HC_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', "Theme is unknown or not installed."),
};
const preferredHCLightThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize({ key: 'preferredHCLightColorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme when in high contrast light mode and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_HC)),
    default: ThemeSettingDefaults.COLOR_THEME_HC_LIGHT,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', "Theme is unknown or not installed."),
};
const detectColorSchemeSettingSchema = {
    type: 'boolean',
    markdownDescription: nls.localize({ key: 'detectColorScheme', comment: ['{0} and {1} will become links to other settings.'] }, 'If enabled, will automatically select a color theme based on the system color mode. If the system color mode is dark, {0} is used, else {1}.', formatSettingAsLink(ThemeSettings.PREFERRED_DARK_THEME), formatSettingAsLink(ThemeSettings.PREFERRED_LIGHT_THEME)),
    default: false,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
};
const colorCustomizationsSchema = {
    type: 'object',
    description: nls.localize('workbenchColors', "Overrides colors from the currently selected color theme."),
    allOf: [{ $ref: workbenchColorsSchemaId }],
    default: {},
    defaultSnippets: [{
            body: {}
        }]
};
const fileIconThemeSettingSchema = {
    type: ['string', 'null'],
    default: ThemeSettingDefaults.FILE_ICON_THEME,
    description: nls.localize('iconTheme', "Specifies the file icon theme used in the workbench or 'null' to not show any file icons."),
    enum: [null],
    enumItemLabels: [nls.localize('noIconThemeLabel', 'None')],
    enumDescriptions: [nls.localize('noIconThemeDesc', 'No file icons')],
    errorMessage: nls.localize('iconThemeError', "File icon theme is unknown or not installed.")
};
const productIconThemeSettingSchema = {
    type: ['string', 'null'],
    default: ThemeSettingDefaults.PRODUCT_ICON_THEME,
    description: nls.localize('productIconTheme', "Specifies the product icon theme used."),
    enum: [ThemeSettingDefaults.PRODUCT_ICON_THEME],
    enumItemLabels: [nls.localize('defaultProductIconThemeLabel', 'Default')],
    enumDescriptions: [nls.localize('defaultProductIconThemeDesc', 'Default')],
    errorMessage: nls.localize('productIconThemeError', "Product icon theme is unknown or not installed.")
};
const detectHCSchemeSettingSchema = {
    type: 'boolean',
    default: true,
    markdownDescription: nls.localize({ key: 'autoDetectHighContrast', comment: ['{0} and {1} will become links to other settings.'] }, "If enabled, will automatically change to high contrast theme if the OS is using a high contrast theme. The high contrast theme to use is specified by {0} and {1}.", formatSettingAsLink(ThemeSettings.PREFERRED_HC_DARK_THEME), formatSettingAsLink(ThemeSettings.PREFERRED_HC_LIGHT_THEME)),
    scope: 1 /* ConfigurationScope.APPLICATION */,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
};
const themeSettingsConfiguration = {
    id: 'workbench',
    order: 7.1,
    type: 'object',
    properties: {
        [ThemeSettings.COLOR_THEME]: colorThemeSettingSchema,
        [ThemeSettings.PREFERRED_DARK_THEME]: preferredDarkThemeSettingSchema,
        [ThemeSettings.PREFERRED_LIGHT_THEME]: preferredLightThemeSettingSchema,
        [ThemeSettings.PREFERRED_HC_DARK_THEME]: preferredHCDarkThemeSettingSchema,
        [ThemeSettings.PREFERRED_HC_LIGHT_THEME]: preferredHCLightThemeSettingSchema,
        [ThemeSettings.FILE_ICON_THEME]: fileIconThemeSettingSchema,
        [ThemeSettings.COLOR_CUSTOMIZATIONS]: colorCustomizationsSchema,
        [ThemeSettings.PRODUCT_ICON_THEME]: productIconThemeSettingSchema
    }
};
configurationRegistry.registerConfiguration(themeSettingsConfiguration);
const themeSettingsWindowConfiguration = {
    id: 'window',
    order: 8.1,
    type: 'object',
    properties: {
        [ThemeSettings.DETECT_HC]: detectHCSchemeSettingSchema,
        [ThemeSettings.DETECT_COLOR_SCHEME]: detectColorSchemeSettingSchema,
    }
};
configurationRegistry.registerConfiguration(themeSettingsWindowConfiguration);
function tokenGroupSettings(description) {
    return {
        description,
        $ref: textmateColorGroupSchemaId
    };
}
const themeSpecificSettingKey = '^\\[[^\\]]*(\\]\\s*\\[[^\\]]*)*\\]$';
const tokenColorSchema = {
    type: 'object',
    properties: {
        comments: tokenGroupSettings(nls.localize('editorColors.comments', "Sets the colors and styles for comments")),
        strings: tokenGroupSettings(nls.localize('editorColors.strings', "Sets the colors and styles for strings literals.")),
        keywords: tokenGroupSettings(nls.localize('editorColors.keywords', "Sets the colors and styles for keywords.")),
        numbers: tokenGroupSettings(nls.localize('editorColors.numbers', "Sets the colors and styles for number literals.")),
        types: tokenGroupSettings(nls.localize('editorColors.types', "Sets the colors and styles for type declarations and references.")),
        functions: tokenGroupSettings(nls.localize('editorColors.functions', "Sets the colors and styles for functions declarations and references.")),
        variables: tokenGroupSettings(nls.localize('editorColors.variables', "Sets the colors and styles for variables declarations and references.")),
        textMateRules: {
            description: nls.localize('editorColors.textMateRules', 'Sets colors and styles using textmate theming rules (advanced).'),
            $ref: textmateColorsSchemaId
        },
        semanticHighlighting: {
            description: nls.localize('editorColors.semanticHighlighting', 'Whether semantic highlighting should be enabled for this theme.'),
            deprecationMessage: nls.localize('editorColors.semanticHighlighting.deprecationMessage', 'Use `enabled` in `editor.semanticTokenColorCustomizations` setting instead.'),
            markdownDeprecationMessage: nls.localize({ key: 'editorColors.semanticHighlighting.deprecationMessageMarkdown', comment: ['{0} will become a link to another setting.'] }, 'Use `enabled` in {0} setting instead.', formatSettingAsLink('editor.semanticTokenColorCustomizations')),
            type: 'boolean'
        }
    },
    additionalProperties: false
};
const tokenColorCustomizationSchema = {
    description: nls.localize('editorColors', "Overrides editor syntax colors and font style from the currently selected color theme."),
    default: {},
    allOf: [{ ...tokenColorSchema, patternProperties: { '^\\[': {} } }]
};
const semanticTokenColorSchema = {
    type: 'object',
    properties: {
        enabled: {
            type: 'boolean',
            description: nls.localize('editorColors.semanticHighlighting.enabled', 'Whether semantic highlighting is enabled or disabled for this theme'),
            suggestSortText: '0_enabled'
        },
        rules: {
            $ref: tokenStylingSchemaId,
            description: nls.localize('editorColors.semanticHighlighting.rules', 'Semantic token styling rules for this theme.'),
            suggestSortText: '0_rules'
        }
    },
    additionalProperties: false
};
const semanticTokenColorCustomizationSchema = {
    description: nls.localize('semanticTokenColors', "Overrides editor semantic token color and styles from the currently selected color theme."),
    default: {},
    allOf: [{ ...semanticTokenColorSchema, patternProperties: { '^\\[': {} } }]
};
const tokenColorCustomizationConfiguration = {
    id: 'editor',
    order: 7.2,
    type: 'object',
    properties: {
        [ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS]: tokenColorCustomizationSchema,
        [ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS]: semanticTokenColorCustomizationSchema
    }
};
configurationRegistry.registerConfiguration(tokenColorCustomizationConfiguration);
export function updateColorThemeConfigurationSchemas(themes) {
    // updates enum for the 'workbench.colorTheme` setting
    themes.sort((a, b) => a.label.localeCompare(b.label));
    colorThemeSettingEnum.splice(0, colorThemeSettingEnum.length, ...themes.map(t => t.settingsId));
    colorThemeSettingEnumDescriptions.splice(0, colorThemeSettingEnumDescriptions.length, ...themes.map(t => t.description || ''));
    colorThemeSettingEnumItemLabels.splice(0, colorThemeSettingEnumItemLabels.length, ...themes.map(t => t.label || ''));
    const themeSpecificWorkbenchColors = { properties: {} };
    const themeSpecificTokenColors = { properties: {} };
    const themeSpecificSemanticTokenColors = { properties: {} };
    const workbenchColors = { $ref: workbenchColorsSchemaId, additionalProperties: false };
    const tokenColors = { properties: tokenColorSchema.properties, additionalProperties: false };
    for (const t of themes) {
        // add theme specific color customization ("[Abyss]":{ ... })
        const themeId = `[${t.settingsId}]`;
        themeSpecificWorkbenchColors.properties[themeId] = workbenchColors;
        themeSpecificTokenColors.properties[themeId] = tokenColors;
        themeSpecificSemanticTokenColors.properties[themeId] = semanticTokenColorSchema;
    }
    themeSpecificWorkbenchColors.patternProperties = { [themeSpecificSettingKey]: workbenchColors };
    themeSpecificTokenColors.patternProperties = { [themeSpecificSettingKey]: tokenColors };
    themeSpecificSemanticTokenColors.patternProperties = { [themeSpecificSettingKey]: semanticTokenColorSchema };
    colorCustomizationsSchema.allOf[1] = themeSpecificWorkbenchColors;
    tokenColorCustomizationSchema.allOf[1] = themeSpecificTokenColors;
    semanticTokenColorCustomizationSchema.allOf[1] = themeSpecificSemanticTokenColors;
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration, tokenColorCustomizationConfiguration);
}
export function updateFileIconThemeConfigurationSchemas(themes) {
    fileIconThemeSettingSchema.enum.splice(1, Number.MAX_VALUE, ...themes.map(t => t.settingsId));
    fileIconThemeSettingSchema.enumItemLabels.splice(1, Number.MAX_VALUE, ...themes.map(t => t.label));
    fileIconThemeSettingSchema.enumDescriptions.splice(1, Number.MAX_VALUE, ...themes.map(t => t.description || ''));
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration);
}
export function updateProductIconThemeConfigurationSchemas(themes) {
    productIconThemeSettingSchema.enum.splice(1, Number.MAX_VALUE, ...themes.map(t => t.settingsId));
    productIconThemeSettingSchema.enumItemLabels.splice(1, Number.MAX_VALUE, ...themes.map(t => t.label));
    productIconThemeSettingSchema.enumDescriptions.splice(1, Number.MAX_VALUE, ...themes.map(t => t.description || ''));
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration);
}
const colorSchemeToPreferred = {
    [ColorScheme.DARK]: ThemeSettings.PREFERRED_DARK_THEME,
    [ColorScheme.LIGHT]: ThemeSettings.PREFERRED_LIGHT_THEME,
    [ColorScheme.HIGH_CONTRAST_DARK]: ThemeSettings.PREFERRED_HC_DARK_THEME,
    [ColorScheme.HIGH_CONTRAST_LIGHT]: ThemeSettings.PREFERRED_HC_LIGHT_THEME
};
export class ThemeConfiguration {
    constructor(configurationService, hostColorService) {
        this.configurationService = configurationService;
        this.hostColorService = hostColorService;
    }
    get colorTheme() {
        return this.configurationService.getValue(this.getColorThemeSettingId());
    }
    get fileIconTheme() {
        return this.configurationService.getValue(ThemeSettings.FILE_ICON_THEME);
    }
    get productIconTheme() {
        return this.configurationService.getValue(ThemeSettings.PRODUCT_ICON_THEME);
    }
    get colorCustomizations() {
        return this.configurationService.getValue(ThemeSettings.COLOR_CUSTOMIZATIONS) || {};
    }
    get tokenColorCustomizations() {
        return this.configurationService.getValue(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS) || {};
    }
    get semanticTokenColorCustomizations() {
        return this.configurationService.getValue(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS);
    }
    getPreferredColorScheme() {
        if (this.configurationService.getValue(ThemeSettings.DETECT_HC) && this.hostColorService.highContrast) {
            return this.hostColorService.dark ? ColorScheme.HIGH_CONTRAST_DARK : ColorScheme.HIGH_CONTRAST_LIGHT;
        }
        if (this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            return this.hostColorService.dark ? ColorScheme.DARK : ColorScheme.LIGHT;
        }
        return undefined;
    }
    isDetectingColorScheme() {
        return this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME);
    }
    getColorThemeSettingId() {
        const preferredScheme = this.getPreferredColorScheme();
        return preferredScheme ? colorSchemeToPreferred[preferredScheme] : ThemeSettings.COLOR_THEME;
    }
    async setColorTheme(theme, settingsTarget) {
        await this.writeConfiguration(this.getColorThemeSettingId(), theme.settingsId, settingsTarget);
        return theme;
    }
    async setFileIconTheme(theme, settingsTarget) {
        await this.writeConfiguration(ThemeSettings.FILE_ICON_THEME, theme.settingsId, settingsTarget);
        return theme;
    }
    async setProductIconTheme(theme, settingsTarget) {
        await this.writeConfiguration(ThemeSettings.PRODUCT_ICON_THEME, theme.settingsId, settingsTarget);
        return theme;
    }
    isDefaultColorTheme() {
        const settings = this.configurationService.inspect(this.getColorThemeSettingId());
        return settings && settings.default?.value === settings.value;
    }
    findAutoConfigurationTarget(key) {
        const settings = this.configurationService.inspect(key);
        if (!types.isUndefined(settings.workspaceFolderValue)) {
            return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        }
        else if (!types.isUndefined(settings.workspaceValue)) {
            return 5 /* ConfigurationTarget.WORKSPACE */;
        }
        else if (!types.isUndefined(settings.userRemote)) {
            return 4 /* ConfigurationTarget.USER_REMOTE */;
        }
        return 2 /* ConfigurationTarget.USER */;
    }
    async writeConfiguration(key, value, settingsTarget) {
        if (settingsTarget === undefined || settingsTarget === 'preview') {
            return;
        }
        const settings = this.configurationService.inspect(key);
        if (settingsTarget === 'auto') {
            return this.configurationService.updateValue(key, value);
        }
        if (settingsTarget === 2 /* ConfigurationTarget.USER */) {
            if (value === settings.userValue) {
                return Promise.resolve(undefined); // nothing to do
            }
            else if (value === settings.defaultValue) {
                if (types.isUndefined(settings.userValue)) {
                    return Promise.resolve(undefined); // nothing to do
                }
                value = undefined; // remove configuration from user settings
            }
        }
        else if (settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */ || settingsTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ || settingsTarget === 4 /* ConfigurationTarget.USER_REMOTE */) {
            if (value === settings.value) {
                return Promise.resolve(undefined); // nothing to do
            }
        }
        return this.configurationService.updateValue(key, value, settingsTarget);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3RoZW1lQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUF3RSxNQUFNLG9FQUFvRSxDQUFDO0FBR3pOLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzNGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxhQUFhLEVBQXFMLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFcFEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUd6RSx3QkFBd0I7QUFDeEIsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUV6RyxNQUFNLHFCQUFxQixHQUFhLEVBQUUsQ0FBQztBQUMzQyxNQUFNLCtCQUErQixHQUFhLEVBQUUsQ0FBQztBQUNyRCxNQUFNLGlDQUFpQyxHQUFhLEVBQUUsQ0FBQztBQUV2RCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsR0FBVztJQUM5QyxPQUFPLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDdkIsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLHNDQUFzQyxHQUFHLHlCQUF5QixDQUFDO0FBRWhGLE1BQU0sdUJBQXVCLEdBQWlDO0lBQzdELElBQUksRUFBRSxRQUFRO0lBQ2QsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLENBQUMsNENBQTRDLENBQUMsRUFBRSxFQUFFLDBFQUEwRSxFQUFFLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3JQLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0I7SUFDL0YsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUM7SUFDOUMsSUFBSSxFQUFFLHFCQUFxQjtJQUMzQixnQkFBZ0IsRUFBRSxpQ0FBaUM7SUFDbkQsY0FBYyxFQUFFLCtCQUErQjtJQUMvQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxvQ0FBb0MsQ0FBQztDQUNuRixDQUFDO0FBQ0YsTUFBTSwrQkFBK0IsR0FBaUM7SUFDckUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFO0lBQ2xCLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUMsNENBQTRDLENBQUMsRUFBRSxFQUFFLDhFQUE4RSxFQUFFLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3RRLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxnQkFBZ0I7SUFDOUMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUM7SUFDOUMsSUFBSSxFQUFFLHFCQUFxQjtJQUMzQixnQkFBZ0IsRUFBRSxpQ0FBaUM7SUFDbkQsY0FBYyxFQUFFLCtCQUErQjtJQUMvQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxvQ0FBb0MsQ0FBQztDQUNuRixDQUFDO0FBQ0YsTUFBTSxnQ0FBZ0MsR0FBaUM7SUFDdEUsSUFBSSxFQUFFLFFBQVE7SUFDZCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLDBCQUEwQixFQUFFLE9BQU8sRUFBRSxDQUFDLDRDQUE0QyxDQUFDLEVBQUUsRUFBRSwrRUFBK0UsRUFBRSxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUN4USxPQUFPLEVBQUUsb0JBQW9CLENBQUMsaUJBQWlCO0lBQy9DLElBQUksRUFBRSxDQUFDLHNDQUFzQyxDQUFDO0lBQzlDLElBQUksRUFBRSxxQkFBcUI7SUFDM0IsZ0JBQWdCLEVBQUUsaUNBQWlDO0lBQ25ELGNBQWMsRUFBRSwrQkFBK0I7SUFDL0MsWUFBWSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsb0NBQW9DLENBQUM7Q0FDbkYsQ0FBQztBQUNGLE1BQU0saUNBQWlDLEdBQWlDO0lBQ3ZFLElBQUksRUFBRSxRQUFRO0lBQ2QsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSwyQkFBMkIsRUFBRSxPQUFPLEVBQUUsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUFFLEVBQUUsK0VBQStFLEVBQUUsbUJBQW1CLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQy9QLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxtQkFBbUI7SUFDakQsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUM7SUFDOUMsSUFBSSxFQUFFLHFCQUFxQjtJQUMzQixnQkFBZ0IsRUFBRSxpQ0FBaUM7SUFDbkQsY0FBYyxFQUFFLCtCQUErQjtJQUMvQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxvQ0FBb0MsQ0FBQztDQUNuRixDQUFDO0FBQ0YsTUFBTSxrQ0FBa0MsR0FBaUM7SUFDeEUsSUFBSSxFQUFFLFFBQVE7SUFDZCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLDRCQUE0QixFQUFFLE9BQU8sRUFBRSxDQUFDLDRDQUE0QyxDQUFDLEVBQUUsRUFBRSxnRkFBZ0YsRUFBRSxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDalEsT0FBTyxFQUFFLG9CQUFvQixDQUFDLG9CQUFvQjtJQUNsRCxJQUFJLEVBQUUsQ0FBQyxzQ0FBc0MsQ0FBQztJQUM5QyxJQUFJLEVBQUUscUJBQXFCO0lBQzNCLGdCQUFnQixFQUFFLGlDQUFpQztJQUNuRCxjQUFjLEVBQUUsK0JBQStCO0lBQy9DLFlBQVksRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLG9DQUFvQyxDQUFDO0NBQ25GLENBQUM7QUFDRixNQUFNLDhCQUE4QixHQUFpQztJQUNwRSxJQUFJLEVBQUUsU0FBUztJQUNmLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLENBQUMsa0RBQWtELENBQUMsRUFBRSxFQUFFLDhJQUE4SSxFQUFFLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2pZLE9BQU8sRUFBRSxLQUFLO0lBQ2QsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUM7Q0FDOUMsQ0FBQztBQUVGLE1BQU0seUJBQXlCLEdBQWlDO0lBQy9ELElBQUksRUFBRSxRQUFRO0lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsMkRBQTJELENBQUM7SUFDekcsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztJQUMxQyxPQUFPLEVBQUUsRUFBRTtJQUNYLGVBQWUsRUFBRSxDQUFDO1lBQ2pCLElBQUksRUFBRSxFQUNMO1NBQ0QsQ0FBQztDQUNGLENBQUM7QUFDRixNQUFNLDBCQUEwQixHQUFpQztJQUNoRSxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxlQUFlO0lBQzdDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSwyRkFBMkYsQ0FBQztJQUNuSSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDWixjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFELGdCQUFnQixFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNwRSxZQUFZLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSw4Q0FBOEMsQ0FBQztDQUM1RixDQUFDO0FBQ0YsTUFBTSw2QkFBNkIsR0FBaUM7SUFDbkUsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztJQUN4QixPQUFPLEVBQUUsb0JBQW9CLENBQUMsa0JBQWtCO0lBQ2hELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHdDQUF3QyxDQUFDO0lBQ3ZGLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDO0lBQy9DLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDekUsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzFFLFlBQVksRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGlEQUFpRCxDQUFDO0NBQ3RHLENBQUM7QUFFRixNQUFNLDJCQUEyQixHQUFpQztJQUNqRSxJQUFJLEVBQUUsU0FBUztJQUNmLE9BQU8sRUFBRSxJQUFJO0lBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSx3QkFBd0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyxrREFBa0QsQ0FBQyxFQUFFLEVBQUUsb0tBQW9LLEVBQUUsbUJBQW1CLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsbUJBQW1CLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDbGEsS0FBSyx3Q0FBZ0M7SUFDckMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUM7Q0FDOUMsQ0FBQztBQUVGLE1BQU0sMEJBQTBCLEdBQXVCO0lBQ3RELEVBQUUsRUFBRSxXQUFXO0lBQ2YsS0FBSyxFQUFFLEdBQUc7SUFDVixJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRTtRQUNYLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxFQUFFLHVCQUF1QjtRQUNwRCxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLCtCQUErQjtRQUNyRSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLGdDQUFnQztRQUN2RSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLGlDQUFpQztRQUMxRSxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLGtDQUFrQztRQUM1RSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsRUFBRSwwQkFBMEI7UUFDM0QsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsRUFBRSx5QkFBeUI7UUFDL0QsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsRUFBRSw2QkFBNkI7S0FDakU7Q0FDRCxDQUFDO0FBQ0YscUJBQXFCLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUV4RSxNQUFNLGdDQUFnQyxHQUF1QjtJQUM1RCxFQUFFLEVBQUUsUUFBUTtJQUNaLEtBQUssRUFBRSxHQUFHO0lBQ1YsSUFBSSxFQUFFLFFBQVE7SUFDZCxVQUFVLEVBQUU7UUFDWCxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSwyQkFBMkI7UUFDdEQsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsRUFBRSw4QkFBOEI7S0FDbkU7Q0FDRCxDQUFDO0FBQ0YscUJBQXFCLENBQUMscUJBQXFCLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUU5RSxTQUFTLGtCQUFrQixDQUFDLFdBQW1CO0lBQzlDLE9BQU87UUFDTixXQUFXO1FBQ1gsSUFBSSxFQUFFLDBCQUEwQjtLQUNoQyxDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sdUJBQXVCLEdBQUcscUNBQXFDLENBQUM7QUFFdEUsTUFBTSxnQkFBZ0IsR0FBZ0I7SUFDckMsSUFBSSxFQUFFLFFBQVE7SUFDZCxVQUFVLEVBQUU7UUFDWCxRQUFRLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1FBQzlHLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGtEQUFrRCxDQUFDLENBQUM7UUFDckgsUUFBUSxFQUFFLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsMENBQTBDLENBQUMsQ0FBQztRQUMvRyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxpREFBaUQsQ0FBQyxDQUFDO1FBQ3BILEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGtFQUFrRSxDQUFDLENBQUM7UUFDakksU0FBUyxFQUFFLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsdUVBQXVFLENBQUMsQ0FBQztRQUM5SSxTQUFTLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSx1RUFBdUUsQ0FBQyxDQUFDO1FBQzlJLGFBQWEsRUFBRTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLGlFQUFpRSxDQUFDO1lBQzFILElBQUksRUFBRSxzQkFBc0I7U0FDNUI7UUFDRCxvQkFBb0IsRUFBRTtZQUNyQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxpRUFBaUUsQ0FBQztZQUNqSSxrQkFBa0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNEQUFzRCxFQUFFLDZFQUE2RSxDQUFDO1lBQ3ZLLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsOERBQThELEVBQUUsT0FBTyxFQUFFLENBQUMsNENBQTRDLENBQUMsRUFBRSxFQUFFLHVDQUF1QyxFQUFFLG1CQUFtQixDQUFDLHlDQUF5QyxDQUFDLENBQUM7WUFDblIsSUFBSSxFQUFFLFNBQVM7U0FDZjtLQUNEO0lBQ0Qsb0JBQW9CLEVBQUUsS0FBSztDQUMzQixDQUFDO0FBRUYsTUFBTSw2QkFBNkIsR0FBaUM7SUFDbkUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLHdGQUF3RixDQUFDO0lBQ25JLE9BQU8sRUFBRSxFQUFFO0lBQ1gsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7Q0FDbkUsQ0FBQztBQUVGLE1BQU0sd0JBQXdCLEdBQWdCO0lBQzdDLElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsT0FBTyxFQUFFO1lBQ1IsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsRUFBRSxxRUFBcUUsQ0FBQztZQUM3SSxlQUFlLEVBQUUsV0FBVztTQUM1QjtRQUNELEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxvQkFBb0I7WUFDMUIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMseUNBQXlDLEVBQUUsOENBQThDLENBQUM7WUFDcEgsZUFBZSxFQUFFLFNBQVM7U0FDMUI7S0FDRDtJQUNELG9CQUFvQixFQUFFLEtBQUs7Q0FDM0IsQ0FBQztBQUVGLE1BQU0scUNBQXFDLEdBQWlDO0lBQzNFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDJGQUEyRixDQUFDO0lBQzdJLE9BQU8sRUFBRSxFQUFFO0lBQ1gsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLHdCQUF3QixFQUFFLGlCQUFpQixFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7Q0FDM0UsQ0FBQztBQUVGLE1BQU0sb0NBQW9DLEdBQXVCO0lBQ2hFLEVBQUUsRUFBRSxRQUFRO0lBQ1osS0FBSyxFQUFFLEdBQUc7SUFDVixJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRTtRQUNYLENBQUMsYUFBYSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsNkJBQTZCO1FBQ3pFLENBQUMsYUFBYSxDQUFDLG1DQUFtQyxDQUFDLEVBQUUscUNBQXFDO0tBQzFGO0NBQ0QsQ0FBQztBQUVGLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFFbEYsTUFBTSxVQUFVLG9DQUFvQyxDQUFDLE1BQThCO0lBQ2xGLHNEQUFzRDtJQUN0RCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDdEQscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDaEcsaUNBQWlDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxpQ0FBaUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ILCtCQUErQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsK0JBQStCLENBQUMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUVySCxNQUFNLDRCQUE0QixHQUFnQixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUNyRSxNQUFNLHdCQUF3QixHQUFnQixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUNqRSxNQUFNLGdDQUFnQyxHQUFnQixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUV6RSxNQUFNLGVBQWUsR0FBRyxFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN2RixNQUFNLFdBQVcsR0FBRyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDN0YsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUN4Qiw2REFBNkQ7UUFDN0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUM7UUFDcEMsNEJBQTRCLENBQUMsVUFBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLGVBQWUsQ0FBQztRQUNwRSx3QkFBd0IsQ0FBQyxVQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsV0FBVyxDQUFDO1FBQzVELGdDQUFnQyxDQUFDLFVBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyx3QkFBd0IsQ0FBQztJQUNsRixDQUFDO0lBQ0QsNEJBQTRCLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUM7SUFDaEcsd0JBQXdCLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUM7SUFDeEYsZ0NBQWdDLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQztJQUU3Ryx5QkFBeUIsQ0FBQyxLQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsNEJBQTRCLENBQUM7SUFDbkUsNkJBQTZCLENBQUMsS0FBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLHdCQUF3QixDQUFDO0lBQ25FLHFDQUFxQyxDQUFDLEtBQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxnQ0FBZ0MsQ0FBQztJQUVuRixxQkFBcUIsQ0FBQyxnQ0FBZ0MsQ0FBQywwQkFBMEIsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO0FBQzFILENBQUM7QUFFRCxNQUFNLFVBQVUsdUNBQXVDLENBQUMsTUFBaUM7SUFDeEYsMEJBQTBCLENBQUMsSUFBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUMvRiwwQkFBMEIsQ0FBQyxjQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BHLDBCQUEwQixDQUFDLGdCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFbEgscUJBQXFCLENBQUMsZ0NBQWdDLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUNwRixDQUFDO0FBRUQsTUFBTSxVQUFVLDBDQUEwQyxDQUFDLE1BQW9DO0lBQzlGLDZCQUE2QixDQUFDLElBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDbEcsNkJBQTZCLENBQUMsY0FBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN2Ryw2QkFBNkIsQ0FBQyxnQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRXJILHFCQUFxQixDQUFDLGdDQUFnQyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFDcEYsQ0FBQztBQUVELE1BQU0sc0JBQXNCLEdBQUc7SUFDOUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLG9CQUFvQjtJQUN0RCxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxhQUFhLENBQUMscUJBQXFCO0lBQ3hELENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsYUFBYSxDQUFDLHVCQUF1QjtJQUN2RSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLGFBQWEsQ0FBQyx3QkFBd0I7Q0FDekUsQ0FBQztBQUVGLE1BQU0sT0FBTyxrQkFBa0I7SUFDOUIsWUFBb0Isb0JBQTJDLEVBQVUsZ0JBQXlDO1FBQTlGLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFBVSxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXlCO0lBQ2xILENBQUM7SUFFRCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFTLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7SUFDbEYsQ0FBQztJQUVELElBQVcsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQWdCLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBRUQsSUFBVyxnQkFBZ0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFTLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFRCxJQUFXLG1CQUFtQjtRQUM3QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQXVCLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzRyxDQUFDO0lBRUQsSUFBVyx3QkFBd0I7UUFDbEMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUE0QixhQUFhLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEgsQ0FBQztJQUVELElBQVcsZ0NBQWdDO1FBQzFDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBb0MsYUFBYSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7SUFDakksQ0FBQztJQUVNLHVCQUF1QjtRQUM3QixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2RyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDO1FBQ3RHLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUMzRSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7UUFDMUUsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDdkQsT0FBTyxlQUFlLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDO0lBQzlGLENBQUM7SUFFTSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQTJCLEVBQUUsY0FBa0M7UUFDekYsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEVBQUUsS0FBSyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMvRixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBOEIsRUFBRSxjQUFrQztRQUMvRixNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDL0YsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU0sS0FBSyxDQUFDLG1CQUFtQixDQUFDLEtBQWlDLEVBQUUsY0FBa0M7UUFDckcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEcsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUNsRixPQUFPLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDO0lBQy9ELENBQUM7SUFFTSwyQkFBMkIsQ0FBQyxHQUFXO1FBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztZQUN2RCxvREFBNEM7UUFDN0MsQ0FBQzthQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3hELDZDQUFxQztRQUN0QyxDQUFDO2FBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDcEQsK0NBQXVDO1FBQ3hDLENBQUM7UUFDRCx3Q0FBZ0M7SUFDakMsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFXLEVBQUUsS0FBVSxFQUFFLGNBQWtDO1FBQzNGLElBQUksY0FBYyxLQUFLLFNBQVMsSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEUsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELElBQUksY0FBYyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVELElBQUksY0FBYyxxQ0FBNkIsRUFBRSxDQUFDO1lBQ2pELElBQUksS0FBSyxLQUFLLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1lBQ3BELENBQUM7aUJBQU0sSUFBSSxLQUFLLEtBQUssUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUM1QyxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQzNDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGdCQUFnQjtnQkFDcEQsQ0FBQztnQkFDRCxLQUFLLEdBQUcsU0FBUyxDQUFDLENBQUMsMENBQTBDO1lBQzlELENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxjQUFjLDBDQUFrQyxJQUFJLGNBQWMsaURBQXlDLElBQUksY0FBYyw0Q0FBb0MsRUFBRSxDQUFDO1lBQzlLLElBQUksS0FBSyxLQUFLLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDOUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1lBQ3BELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDMUUsQ0FBQztDQUNEIn0=