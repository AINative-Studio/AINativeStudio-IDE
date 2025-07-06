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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZVRoZW1lU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBYSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRixPQUFPLEVBQW1CLFVBQVUsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRTVILE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFtQixVQUFVLEVBQWtCLE1BQU0saURBQWlELENBQUM7QUFDakksT0FBTyxFQUFFLFVBQVUsSUFBSSxpQkFBaUIsRUFBd0YsTUFBTSxnREFBZ0QsQ0FBQztBQUN2TCxPQUFPLEVBQWUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsY0FBYyxF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