/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../editor/common/config/editorOptions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import * as colorRegistry from '../../../../platform/theme/common/colorRegistry.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
let WebviewThemeDataProvider = class WebviewThemeDataProvider extends Disposable {
    constructor(_themeService, _configurationService) {
        super();
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._cachedWebViewThemeData = undefined;
        this._onThemeDataChanged = this._register(new Emitter());
        this.onThemeDataChanged = this._onThemeDataChanged.event;
        this._register(this._themeService.onDidColorThemeChange(() => {
            this._reset();
        }));
        const webviewConfigurationKeys = ['editor.fontFamily', 'editor.fontWeight', 'editor.fontSize', 'accessibility.underlineLinks'];
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (webviewConfigurationKeys.some(key => e.affectsConfiguration(key))) {
                this._reset();
            }
        }));
    }
    getTheme() {
        return this._themeService.getColorTheme();
    }
    getWebviewThemeData() {
        if (!this._cachedWebViewThemeData) {
            const configuration = this._configurationService.getValue('editor');
            const editorFontFamily = configuration.fontFamily || EDITOR_FONT_DEFAULTS.fontFamily;
            const editorFontWeight = configuration.fontWeight || EDITOR_FONT_DEFAULTS.fontWeight;
            const editorFontSize = configuration.fontSize || EDITOR_FONT_DEFAULTS.fontSize;
            const linkUnderlines = this._configurationService.getValue('accessibility.underlineLinks');
            const theme = this._themeService.getColorTheme();
            const exportedColors = colorRegistry.getColorRegistry().getColors().reduce((colors, entry) => {
                const color = theme.getColor(entry.id);
                if (color) {
                    colors['vscode-' + entry.id.replace('.', '-')] = color.toString();
                }
                return colors;
            }, {});
            const styles = {
                'vscode-font-family': DEFAULT_FONT_FAMILY,
                'vscode-font-weight': 'normal',
                'vscode-font-size': '13px',
                'vscode-editor-font-family': editorFontFamily,
                'vscode-editor-font-weight': editorFontWeight,
                'vscode-editor-font-size': editorFontSize + 'px',
                'text-link-decoration': linkUnderlines ? 'underline' : 'none',
                ...exportedColors
            };
            const activeTheme = ApiThemeClassName.fromTheme(theme);
            this._cachedWebViewThemeData = { styles, activeTheme, themeLabel: theme.label, themeId: theme.settingsId };
        }
        return this._cachedWebViewThemeData;
    }
    _reset() {
        this._cachedWebViewThemeData = undefined;
        this._onThemeDataChanged.fire();
    }
};
WebviewThemeDataProvider = __decorate([
    __param(0, IWorkbenchThemeService),
    __param(1, IConfigurationService)
], WebviewThemeDataProvider);
export { WebviewThemeDataProvider };
var ApiThemeClassName;
(function (ApiThemeClassName) {
    ApiThemeClassName["light"] = "vscode-light";
    ApiThemeClassName["dark"] = "vscode-dark";
    ApiThemeClassName["highContrast"] = "vscode-high-contrast";
    ApiThemeClassName["highContrastLight"] = "vscode-high-contrast-light";
})(ApiThemeClassName || (ApiThemeClassName = {}));
(function (ApiThemeClassName) {
    function fromTheme(theme) {
        switch (theme.type) {
            case ColorScheme.LIGHT: return ApiThemeClassName.light;
            case ColorScheme.DARK: return ApiThemeClassName.dark;
            case ColorScheme.HIGH_CONTRAST_DARK: return ApiThemeClassName.highContrast;
            case ColorScheme.HIGH_CONTRAST_LIGHT: return ApiThemeClassName.highContrastLight;
        }
    }
    ApiThemeClassName.fromTheme = fromTheme;
})(ApiThemeClassName || (ApiThemeClassName = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9icm93c2VyL3RoZW1laW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFrQixNQUFNLG1EQUFtRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sS0FBSyxhQUFhLE1BQU0sb0RBQW9ELENBQUM7QUFDcEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pFLE9BQU8sRUFBd0Isc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQVVqSCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFPdkQsWUFDeUIsYUFBc0QsRUFDdkQscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBSGlDLGtCQUFhLEdBQWIsYUFBYSxDQUF3QjtRQUN0QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBUDdFLDRCQUF1QixHQUFpQyxTQUFTLENBQUM7UUFFekQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDM0QsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQztRQVFuRSxJQUFJLENBQUMsU0FBUyxDQUFDLElB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