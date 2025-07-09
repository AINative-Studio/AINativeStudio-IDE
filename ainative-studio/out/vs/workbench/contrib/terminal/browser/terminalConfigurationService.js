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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../editor/common/config/editorOptions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { DEFAULT_BOLD_FONT_WEIGHT, DEFAULT_FONT_WEIGHT, DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, MAXIMUM_FONT_WEIGHT, MINIMUM_FONT_WEIGHT, MINIMUM_LETTER_SPACING, TERMINAL_CONFIG_SECTION } from '../common/terminal.js';
import { isMacintosh } from '../../../../base/common/platform.js';
// #region TerminalConfigurationService
let TerminalConfigurationService = class TerminalConfigurationService extends Disposable {
    get config() { return this._config; }
    get onConfigChanged() { return this._onConfigChanged.event; }
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._onConfigChanged = new Emitter();
        this._fontMetrics = this._register(new TerminalFontMetrics(this, this._configurationService));
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration(TERMINAL_CONFIG_SECTION)) {
                this._updateConfig();
            }
        }));
    }
    setPanelContainer(panelContainer) { return this._fontMetrics.setPanelContainer(panelContainer); }
    configFontIsMonospace() { return this._fontMetrics.configFontIsMonospace(); }
    getFont(w, xtermCore, excludeDimensions) { return this._fontMetrics.getFont(w, xtermCore, excludeDimensions); }
    _updateConfig() {
        const configValues = { ...this._configurationService.getValue(TERMINAL_CONFIG_SECTION) };
        configValues.fontWeight = this._normalizeFontWeight(configValues.fontWeight, DEFAULT_FONT_WEIGHT);
        configValues.fontWeightBold = this._normalizeFontWeight(configValues.fontWeightBold, DEFAULT_BOLD_FONT_WEIGHT);
        this._config = configValues;
        this._onConfigChanged.fire();
    }
    _normalizeFontWeight(input, defaultWeight) {
        if (input === 'normal' || input === 'bold') {
            return input;
        }
        return clampInt(input, MINIMUM_FONT_WEIGHT, MAXIMUM_FONT_WEIGHT, defaultWeight);
    }
};
TerminalConfigurationService = __decorate([
    __param(0, IConfigurationService)
], TerminalConfigurationService);
export { TerminalConfigurationService };
// #endregion TerminalConfigurationService
// #region TerminalFontMetrics
var FontConstants;
(function (FontConstants) {
    FontConstants[FontConstants["MinimumFontSize"] = 6] = "MinimumFontSize";
    FontConstants[FontConstants["MaximumFontSize"] = 100] = "MaximumFontSize";
})(FontConstants || (FontConstants = {}));
export class TerminalFontMetrics extends Disposable {
    constructor(_terminalConfigurationService, _configurationService) {
        super();
        this._terminalConfigurationService = _terminalConfigurationService;
        this._configurationService = _configurationService;
        this.linuxDistro = 1 /* LinuxDistro.Unknown */;
        this._register(toDisposable(() => this._charMeasureElement?.remove()));
    }
    setPanelContainer(panelContainer) {
        this._panelContainer = panelContainer;
    }
    configFontIsMonospace() {
        const fontSize = 15;
        const fontFamily = this._terminalConfigurationService.config.fontFamily || this._configurationService.getValue('editor').fontFamily || EDITOR_FONT_DEFAULTS.fontFamily;
        const iRect = this._getBoundingRectFor('i', fontFamily, fontSize);
        const wRect = this._getBoundingRectFor('w', fontFamily, fontSize);
        // Check for invalid bounds, there is no reason to believe the font is not monospace
        if (!iRect || !wRect || !iRect.width || !wRect.width) {
            return true;
        }
        return iRect.width === wRect.width;
    }
    /**
     * Gets the font information based on the terminal.integrated.fontFamily
     * terminal.integrated.fontSize, terminal.integrated.lineHeight configuration properties
     */
    getFont(w, xtermCore, excludeDimensions) {
        const editorConfig = this._configurationService.getValue('editor');
        let fontFamily = this._terminalConfigurationService.config.fontFamily || editorConfig.fontFamily || EDITOR_FONT_DEFAULTS.fontFamily || 'monospace';
        let fontSize = clampInt(this._terminalConfigurationService.config.fontSize, 6 /* FontConstants.MinimumFontSize */, 100 /* FontConstants.MaximumFontSize */, EDITOR_FONT_DEFAULTS.fontSize);
        // Work around bad font on Fedora/Ubuntu
        if (!this._terminalConfigurationService.config.fontFamily) {
            if (this.linuxDistro === 2 /* LinuxDistro.Fedora */) {
                fontFamily = '\'DejaVu Sans Mono\'';
            }
            if (this.linuxDistro === 3 /* LinuxDistro.Ubuntu */) {
                fontFamily = '\'Ubuntu Mono\'';
                // Ubuntu mono is somehow smaller, so set fontSize a bit larger to get the same perceived size.
                fontSize = clampInt(fontSize + 2, 6 /* FontConstants.MinimumFontSize */, 100 /* FontConstants.MaximumFontSize */, EDITOR_FONT_DEFAULTS.fontSize);
            }
        }
        // Always fallback to monospace, otherwise a proportional font may become the default
        fontFamily += ', monospace';
        // Always fallback to AppleBraille on macOS, otherwise braille will render with filled and
        // empty circles in all 8 positions, instead of just filled circles
        // See https://github.com/microsoft/vscode/issues/174521
        if (isMacintosh) {
            fontFamily += ', AppleBraille';
        }
        const letterSpacing = this._terminalConfigurationService.config.letterSpacing ? Math.max(Math.floor(this._terminalConfigurationService.config.letterSpacing), MINIMUM_LETTER_SPACING) : DEFAULT_LETTER_SPACING;
        const lineHeight = this._terminalConfigurationService.config.lineHeight ? Math.max(this._terminalConfigurationService.config.lineHeight, 1) : DEFAULT_LINE_HEIGHT;
        if (excludeDimensions) {
            return {
                fontFamily,
                fontSize,
                letterSpacing,
                lineHeight
            };
        }
        // Get the character dimensions from xterm if it's available
        if (xtermCore?._renderService?._renderer.value) {
            const cellDims = xtermCore._renderService.dimensions.css.cell;
            if (cellDims?.width && cellDims?.height) {
                return {
                    fontFamily,
                    fontSize,
                    letterSpacing,
                    lineHeight,
                    charHeight: cellDims.height / lineHeight,
                    charWidth: cellDims.width - Math.round(letterSpacing) / w.devicePixelRatio
                };
            }
        }
        // Fall back to measuring the font ourselves
        return this._measureFont(w, fontFamily, fontSize, letterSpacing, lineHeight);
    }
    _createCharMeasureElementIfNecessary() {
        if (!this._panelContainer) {
            throw new Error('Cannot measure element when terminal is not attached');
        }
        // Create charMeasureElement if it hasn't been created or if it was orphaned by its parent
        if (!this._charMeasureElement || !this._charMeasureElement.parentElement) {
            this._charMeasureElement = document.createElement('div');
            this._panelContainer.appendChild(this._charMeasureElement);
        }
        return this._charMeasureElement;
    }
    _getBoundingRectFor(char, fontFamily, fontSize) {
        let charMeasureElement;
        try {
            charMeasureElement = this._createCharMeasureElementIfNecessary();
        }
        catch {
            return undefined;
        }
        const style = charMeasureElement.style;
        style.display = 'inline-block';
        style.fontFamily = fontFamily;
        style.fontSize = fontSize + 'px';
        style.lineHeight = 'normal';
        charMeasureElement.innerText = char;
        const rect = charMeasureElement.getBoundingClientRect();
        style.display = 'none';
        return rect;
    }
    _measureFont(w, fontFamily, fontSize, letterSpacing, lineHeight) {
        const rect = this._getBoundingRectFor('X', fontFamily, fontSize);
        // Bounding client rect was invalid, use last font measurement if available.
        if (this._lastFontMeasurement && (!rect || !rect.width || !rect.height)) {
            return this._lastFontMeasurement;
        }
        this._lastFontMeasurement = {
            fontFamily,
            fontSize,
            letterSpacing,
            lineHeight,
            charWidth: 0,
            charHeight: 0
        };
        if (rect && rect.width && rect.height) {
            this._lastFontMeasurement.charHeight = Math.ceil(rect.height);
            // Char width is calculated differently for DOM and the other renderer types. Refer to
            // how each renderer updates their dimensions in xterm.js
            if (this._terminalConfigurationService.config.gpuAcceleration === 'off') {
                this._lastFontMeasurement.charWidth = rect.width;
            }
            else {
                const deviceCharWidth = Math.floor(rect.width * w.devicePixelRatio);
                const deviceCellWidth = deviceCharWidth + Math.round(letterSpacing);
                const cssCellWidth = deviceCellWidth / w.devicePixelRatio;
                this._lastFontMeasurement.charWidth = cssCellWidth - Math.round(letterSpacing) / w.devicePixelRatio;
            }
        }
        return this._lastFontMeasurement;
    }
}
// #endregion TerminalFontMetrics
// #region Utils
function clampInt(source, minimum, maximum, fallback) {
    let r = parseInt(source, 10);
    if (isNaN(r)) {
        return fallback;
    }
    if (typeof minimum === 'number') {
        r = Math.max(minimum, r);
    }
    if (typeof maximum === 'number') {
        r = Math.min(maximum, r);
    }
    return r;
}
// #endregion Utils
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsQ29uZmlndXJhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSxtREFBbUQsQ0FBQztBQUM5RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUduRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQXNDLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLHVCQUF1QixFQUFzQixNQUFNLHVCQUF1QixDQUFDO0FBQ3RSLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVsRSx1Q0FBdUM7QUFFaEMsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO0lBTTNELElBQUksTUFBTSxLQUFLLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFHckMsSUFBSSxlQUFlLEtBQWtCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFFMUUsWUFDd0IscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBRmdDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFKcEUscUJB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