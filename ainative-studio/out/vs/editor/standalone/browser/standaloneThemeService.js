/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../base/browser/domStylesheets.js';
import { addMatchMediaChangeListener } from '../../../base/browser/browser.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import { TokenizationRegistry } from '../../common/languages.js';
import { TokenMetadata } from '../../common/encodedTokenAttributes.js';
import { TokenTheme, generateTokensCSSForColorMap } from '../../common/languages/supports/tokenization.js';
import { hc_black, hc_light, vs, vs_dark } from '../common/themes.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { asCssVariableName, Extensions } from '../../../platform/theme/common/colorRegistry.js';
import { Extensions as ThemingExtensions } from '../../../platform/theme/common/themeService.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ColorScheme, isDark, isHighContrast } from '../../../platform/theme/common/theme.js';
import { getIconsStyleSheet, UnthemedProductIconTheme } from '../../../platform/theme/browser/iconsStyleSheet.js';
import { mainWindow } from '../../../base/browser/window.js';
export const VS_LIGHT_THEME_NAME = 'vs';
export const VS_DARK_THEME_NAME = 'vs-dark';
export const HC_BLACK_THEME_NAME = 'hc-black';
export const HC_LIGHT_THEME_NAME = 'hc-light';
const colorRegistry = Registry.as(Extensions.ColorContribution);
const themingRegistry = Registry.as(ThemingExtensions.ThemingContribution);
class StandaloneTheme {
    constructor(name, standaloneThemeData) {
        this.semanticHighlighting = false;
        this.themeData = standaloneThemeData;
        const base = standaloneThemeData.base;
        if (name.length > 0) {
            if (isBuiltinTheme(name)) {
                this.id = name;
            }
            else {
                this.id = base + ' ' + name;
            }
            this.themeName = name;
        }
        else {
            this.id = base;
            this.themeName = base;
        }
        this.colors = null;
        this.defaultColors = Object.create(null);
        this._tokenTheme = null;
    }
    get label() {
        return this.themeName;
    }
    get base() {
        return this.themeData.base;
    }
    notifyBaseUpdated() {
        if (this.themeData.inherit) {
            this.colors = null;
            this._tokenTheme = null;
        }
    }
    getColors() {
        if (!this.colors) {
            const colors = new Map();
            for (const id in this.themeData.colors) {
                colors.set(id, Color.fromHex(this.themeData.colors[id]));
            }
            if (this.themeData.inherit) {
                const baseData = getBuiltinRules(this.themeData.base);
                for (const id in baseData.colors) {
                    if (!colors.has(id)) {
                        colors.set(id, Color.fromHex(baseData.colors[id]));
                    }
                }
            }
            this.colors = colors;
        }
        return this.colors;
    }
    getColor(colorId, useDefault) {
        const color = this.getColors().get(colorId);
        if (color) {
            return color;
        }
        if (useDefault !== false) {
            return this.getDefault(colorId);
        }
        return undefined;
    }
    getDefault(colorId) {
        let color = this.defaultColors[colorId];
        if (color) {
            return color;
        }
        color = colorRegistry.resolveDefaultColor(colorId, this);
        this.defaultColors[colorId] = color;
        return color;
    }
    defines(colorId) {
        return this.getColors().has(colorId);
    }
    get type() {
        switch (this.base) {
            case VS_LIGHT_THEME_NAME: return ColorScheme.LIGHT;
            case HC_BLACK_THEME_NAME: return ColorScheme.HIGH_CONTRAST_DARK;
            case HC_LIGHT_THEME_NAME: return ColorScheme.HIGH_CONTRAST_LIGHT;
            default: return ColorScheme.DARK;
        }
    }
    get tokenTheme() {
        if (!this._tokenTheme) {
            let rules = [];
            let encodedTokensColors = [];
            if (this.themeData.inherit) {
                const baseData = getBuiltinRules(this.themeData.base);
                rules = baseData.rules;
                if (baseData.encodedTokensColors) {
                    encodedTokensColors = baseData.encodedTokensColors;
                }
            }
            // Pick up default colors from `editor.foreground` and `editor.background` if available
            const editorForeground = this.themeData.colors['editor.foreground'];
            const editorBackground = this.themeData.colors['editor.background'];
            if (editorForeground || editorBackground) {
                const rule = { token: '' };
                if (editorForeground) {
                    rule.foreground = editorForeground;
                }
                if (editorBackground) {
                    rule.background = editorBackground;
                }
                rules.push(rule);
            }
            rules = rules.concat(this.themeData.rules);
            if (this.themeData.encodedTokensColors) {
                encodedTokensColors = this.themeData.encodedTokensColors;
            }
            this._tokenTheme = TokenTheme.createFromRawTokenTheme(rules, encodedTokensColors);
        }
        return this._tokenTheme;
    }
    getTokenStyleMetadata(type, modifiers, modelLanguage) {
        // use theme rules match
        const style = this.tokenTheme._match([type].concat(modifiers).join('.'));
        const metadata = style.metadata;
        const foreground = TokenMetadata.getForeground(metadata);
        const fontStyle = TokenMetadata.getFontStyle(metadata);
        return {
            foreground: foreground,
            italic: Boolean(fontStyle & 1 /* FontStyle.Italic */),
            bold: Boolean(fontStyle & 2 /* FontStyle.Bold */),
            underline: Boolean(fontStyle & 4 /* FontStyle.Underline */),
            strikethrough: Boolean(fontStyle & 8 /* FontStyle.Strikethrough */)
        };
    }
    get tokenColorMap() {
        return [];
    }
}
function isBuiltinTheme(themeName) {
    return (themeName === VS_LIGHT_THEME_NAME
        || themeName === VS_DARK_THEME_NAME
        || themeName === HC_BLACK_THEME_NAME
        || themeName === HC_LIGHT_THEME_NAME);
}
function getBuiltinRules(builtinTheme) {
    switch (builtinTheme) {
        case VS_LIGHT_THEME_NAME:
            return vs;
        case VS_DARK_THEME_NAME:
            return vs_dark;
        case HC_BLACK_THEME_NAME:
            return hc_black;
        case HC_LIGHT_THEME_NAME:
            return hc_light;
    }
}
function newBuiltInTheme(builtinTheme) {
    const themeData = getBuiltinRules(builtinTheme);
    return new StandaloneTheme(builtinTheme, themeData);
}
export class StandaloneThemeService extends Disposable {
    constructor() {
        super();
        this._onColorThemeChange = this._register(new Emitter());
        this.onDidColorThemeChange = this._onColorThemeChange.event;
        this._onFileIconThemeChange = this._register(new Emitter());
        this.onDidFileIconThemeChange = this._onFileIconThemeChange.event;
        this._onProductIconThemeChange = this._register(new Emitter());
        this.onDidProductIconThemeChange = this._onProductIconThemeChange.event;
        this._environment = Object.create(null);
        this._builtInProductIconTheme = new UnthemedProductIconTheme();
        this._autoDetectHighContrast = true;
        this._knownThemes = new Map();
        this._knownThemes.set(VS_LIGHT_THEME_NAME, newBuiltInTheme(VS_LIGHT_THEME_NAME));
        this._knownThemes.set(VS_DARK_THEME_NAME, newBuiltInTheme(VS_DARK_THEME_NAME));
        this._knownThemes.set(HC_BLACK_THEME_NAME, newBuiltInTheme(HC_BLACK_THEME_NAME));
        this._knownThemes.set(HC_LIGHT_THEME_NAME, newBuiltInTheme(HC_LIGHT_THEME_NAME));
        const iconsStyleSheet = this._register(getIconsStyleSheet(this));
        this._codiconCSS = iconsStyleSheet.getCSS();
        this._themeCSS = '';
        this._allCSS = `${this._codiconCSS}\n${this._themeCSS}`;
        this._globalStyleElement = null;
        this._styleElements = [];
        this._colorMapOverride = null;
        this.setTheme(VS_LIGHT_THEME_NAME);
        this._onOSSchemeChanged();
        this._register(iconsStyleSheet.onDidChange(() => {
            this._codiconCSS = iconsStyleSheet.getCSS();
            this._updateCSS();
        }));
        addMatchMediaChangeListener(mainWindow, '(forced-colors: active)', () => {
            this._onOSSchemeChanged();
        });
    }
    registerEditorContainer(domNode) {
        if (dom.isInShadowDOM(domNode)) {
            return this._registerShadowDomContainer(domNode);
        }
        return this._registerRegularEditorContainer();
    }
    _registerRegularEditorContainer() {
        if (!this._globalStyleElement) {
            this._globalStyleElement = domStylesheetsJs.createStyleSheet(undefined, style => {
                style.className = 'monaco-colors';
                style.textContent = this._allCSS;
            });
            this._styleElements.push(this._globalStyleElement);
        }
        return Disposable.None;
    }
    _registerShadowDomContainer(domNode) {
        const styleElement = domStylesheetsJs.createStyleSheet(domNode, style => {
            style.className = 'monaco-colors';
            style.textContent = this._allCSS;
        });
        this._styleElements.push(styleElement);
        return {
            dispose: () => {
                for (let i = 0; i < this._styleElements.length; i++) {
                    if (this._styleElements[i] === styleElement) {
                        this._styleElements.splice(i, 1);
                        return;
                    }
                }
            }
        };
    }
    defineTheme(themeName, themeData) {
        if (!/^[a-z0-9\-]+$/i.test(themeName)) {
            throw new Error('Illegal theme name!');
        }
        if (!isBuiltinTheme(themeData.base) && !isBuiltinTheme(themeName)) {
            throw new Error('Illegal theme base!');
        }
        // set or replace theme
        this._knownThemes.set(themeName, new StandaloneTheme(themeName, themeData));
        if (isBuiltinTheme(themeName)) {
            this._knownThemes.forEach(theme => {
                if (theme.base === themeName) {
                    theme.notifyBaseUpdated();
                }
            });
        }
        if (this._theme.themeName === themeName) {
            this.setTheme(themeName); // refresh theme
        }
    }
    getColorTheme() {
        return this._theme;
    }
    setColorMapOverride(colorMapOverride) {
        this._colorMapOverride = colorMapOverride;
        this._updateThemeOrColorMap();
    }
    setTheme(themeName) {
        let theme;
        if (this._knownThemes.has(themeName)) {
            theme = this._knownThemes.get(themeName);
        }
        else {
            theme = this._knownThemes.get(VS_LIGHT_THEME_NAME);
        }
        this._updateActualTheme(theme);
    }
    _updateActualTheme(desiredTheme) {
        if (!desiredTheme || this._theme === desiredTheme) {
            // Nothing to do
            return;
        }
        this._theme = desiredTheme;
        this._updateThemeOrColorMap();
    }
    _onOSSchemeChanged() {
        if (this._autoDetectHighContrast) {
            const wantsHighContrast = mainWindow.matchMedia(`(forced-colors: active)`).matches;
            if (wantsHighContrast !== isHighContrast(this._theme.type)) {
                // switch to high contrast or non-high contrast but stick to dark or light
                let newThemeName;
                if (isDark(this._theme.type)) {
                    newThemeName = wantsHighContrast ? HC_BLACK_THEME_NAME : VS_DARK_THEME_NAME;
                }
                else {
                    newThemeName = wantsHighContrast ? HC_LIGHT_THEME_NAME : VS_LIGHT_THEME_NAME;
                }
                this._updateActualTheme(this._knownThemes.get(newThemeName));
            }
        }
    }
    setAutoDetectHighContrast(autoDetectHighContrast) {
        this._autoDetectHighContrast = autoDetectHighContrast;
        this._onOSSchemeChanged();
    }
    _updateThemeOrColorMap() {
        const cssRules = [];
        const hasRule = {};
        const ruleCollector = {
            addRule: (rule) => {
                if (!hasRule[rule]) {
                    cssRules.push(rule);
                    hasRule[rule] = true;
                }
            }
        };
        themingRegistry.getThemingParticipants().forEach(p => p(this._theme, ruleCollector, this._environment));
        const colorVariables = [];
        for (const item of colorRegistry.getColors()) {
            const color = this._theme.getColor(item.id, true);
            if (color) {
                colorVariables.push(`${asCssVariableName(item.id)}: ${color.toString()};`);
            }
        }
        ruleCollector.addRule(`.monaco-editor, .monaco-diff-editor, .monaco-component { ${colorVariables.join('\n')} }`);
        const colorMap = this._colorMapOverride || this._theme.tokenTheme.getColorMap();
        ruleCollector.addRule(generateTokensCSSForColorMap(colorMap));
        this._themeCSS = cssRules.join('\n');
        this._updateCSS();
        TokenizationRegistry.setColorMap(colorMap);
        this._onColorThemeChange.fire(this._theme);
    }
    _updateCSS() {
        this._allCSS = `${this._codiconCSS}\n${this._themeCSS}`;
        this._styleElements.forEach(styleElement => styleElement.textContent = this._allCSS);
    }
    getFileIconTheme() {
        return {
            hasFileIcons: false,
            hasFolderIcons: false,
            hidesExplorerArrows: false
        };
    }
    getProductIconTheme() {
        return this._builtInProductIconTheme;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3N0YW5kYWxvbmVUaGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRSxPQUFPLEVBQWEsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEYsT0FBTyxFQUFtQixVQUFVLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUU1SCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBbUIsVUFBVSxFQUFrQixNQUFNLGlEQUFpRCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxVQUFVLElBQUksaUJBQWlCLEVBQXdGLE1BQU0sZ0RBQWdELENBQUM7QUFDdkwsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLGNBQWMs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