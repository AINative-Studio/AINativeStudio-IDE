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
var ColorDetector_1;
import { createCancelablePromise, TimeoutTimer } from '../../../../base/common/async.js';
import { RGBA } from '../../../../base/common/color.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { noBreakWhitespace } from '../../../../base/common/strings.js';
import { DynamicCssRules } from '../../../browser/editorDom.js';
import { Range } from '../../../common/core/range.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { getColors } from './color.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export const ColorDecorationInjectedTextMarker = Object.create({});
let ColorDetector = class ColorDetector extends Disposable {
    static { ColorDetector_1 = this; }
    static { this.ID = 'editor.contrib.colorDetector'; }
    static { this.RECOMPUTE_TIME = 1000; } // ms
    constructor(_editor, _configurationService, _languageFeaturesService, languageFeatureDebounceService) {
        super();
        this._editor = _editor;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._localToDispose = this._register(new DisposableStore());
        this._decorationsIds = [];
        this._colorDatas = new Map();
        this._decoratorLimitReporter = new DecoratorLimitReporter();
        this._colorDecorationClassRefs = this._register(new DisposableStore());
        this._colorDecoratorIds = this._editor.createDecorationsCollection();
        this._ruleFactory = new DynamicCssRules(this._editor);
        this._debounceInformation = languageFeatureDebounceService.for(_languageFeaturesService.colorProvider, 'Document Colors', { min: ColorDetector_1.RECOMPUTE_TIME });
        this._register(_editor.onDidChangeModel(() => {
            this._isColorDecoratorsEnabled = this.isEnabled();
            this.updateColors();
        }));
        this._register(_editor.onDidChangeModelLanguage(() => this.updateColors()));
        this._register(_languageFeaturesService.colorProvider.onDidChange(() => this.updateColors()));
        this._register(_editor.onDidChangeConfiguration((e) => {
            const prevIsEnabled = this._isColorDecoratorsEnabled;
            this._isColorDecoratorsEnabled = this.isEnabled();
            this._defaultColorDecoratorsEnablement = this._editor.getOption(153 /* EditorOption.defaultColorDecorators */);
            const updatedColorDecoratorsSetting = prevIsEnabled !== this._isColorDecoratorsEnabled || e.hasChanged(21 /* EditorOption.colorDecoratorsLimit */);
            const updatedDefaultColorDecoratorsSetting = e.hasChanged(153 /* EditorOption.defaultColorDecorators */);
            if (updatedColorDecoratorsSetting || updatedDefaultColorDecoratorsSetting) {
                if (this._isColorDecoratorsEnabled) {
                    this.updateColors();
                }
                else {
                    this.removeAllDecorations();
                }
            }
        }));
        this._timeoutTimer = null;
        this._computePromise = null;
        this._isColorDecoratorsEnabled = this.isEnabled();
        this._defaultColorDecoratorsEnablement = this._editor.getOption(153 /* EditorOption.defaultColorDecorators */);
        this.updateColors();
    }
    isEnabled() {
        const model = this._editor.getModel();
        if (!model) {
            return false;
        }
        const languageId = model.getLanguageId();
        // handle deprecated settings. [languageId].colorDecorators.enable
        const deprecatedConfig = this._configurationService.getValue(languageId);
        if (deprecatedConfig && typeof deprecatedConfig === 'object') {
            const colorDecorators = deprecatedConfig['colorDecorators']; // deprecatedConfig.valueOf('.colorDecorators.enable');
            if (colorDecorators && colorDecorators['enable'] !== undefined && !colorDecorators['enable']) {
                return colorDecorators['enable'];
            }
        }
        return this._editor.getOption(20 /* EditorOption.colorDecorators */);
    }
    get limitReporter() {
        return this._decoratorLimitReporter;
    }
    static get(editor) {
        return editor.getContribution(this.ID);
    }
    dispose() {
        this.stop();
        this.removeAllDecorations();
        super.dispose();
    }
    updateColors() {
        this.stop();
        if (!this._isColorDecoratorsEnabled) {
            return;
        }
        const model = this._editor.getModel();
        if (!model || !this._languageFeaturesService.colorProvider.has(model)) {
            return;
        }
        this._localToDispose.add(this._editor.onDidChangeModelContent(() => {
            if (!this._timeoutTimer) {
                this._timeoutTimer = new TimeoutTimer();
                this._timeoutTimer.cancelAndSet(() => {
                    this._timeoutTimer = null;
                    this.beginCompute();
                }, this._debounceInformation.get(model));
            }
        }));
        this.beginCompute();
    }
    async beginCompute() {
        this._computePromise = createCancelablePromise(async (token) => {
            const model = this._editor.getModel();
            if (!model) {
                return [];
            }
            const sw = new StopWatch(false);
            const colors = await getColors(this._languageFeaturesService.colorProvider, model, token, this._defaultColorDecoratorsEnablement);
            this._debounceInformation.update(model, sw.elapsed());
            return colors;
        });
        try {
            const colors = await this._computePromise;
            this.updateDecorations(colors);
            this.updateColorDecorators(colors);
            this._computePromise = null;
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    stop() {
        if (this._timeoutTimer) {
            this._timeoutTimer.cancel();
            this._timeoutTimer = null;
        }
        if (this._computePromise) {
            this._computePromise.cancel();
            this._computePromise = null;
        }
        this._localToDispose.clear();
    }
    updateDecorations(colorDatas) {
        const decorations = colorDatas.map(c => ({
            range: {
                startLineNumber: c.colorInfo.range.startLineNumber,
                startColumn: c.colorInfo.range.startColumn,
                endLineNumber: c.colorInfo.range.endLineNumber,
                endColumn: c.colorInfo.range.endColumn
            },
            options: ModelDecorationOptions.EMPTY
        }));
        this._editor.changeDecorations((changeAccessor) => {
            this._decorationsIds = changeAccessor.deltaDecorations(this._decorationsIds, decorations);
            this._colorDatas = new Map();
            this._decorationsIds.forEach((id, i) => this._colorDatas.set(id, colorDatas[i]));
        });
    }
    updateColorDecorators(colorData) {
        this._colorDecorationClassRefs.clear();
        const decorations = [];
        const limit = this._editor.getOption(21 /* EditorOption.colorDecoratorsLimit */);
        for (let i = 0; i < colorData.length && decorations.length < limit; i++) {
            const { red, green, blue, alpha } = colorData[i].colorInfo.color;
            const rgba = new RGBA(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255), alpha);
            const color = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
            const ref = this._colorDecorationClassRefs.add(this._ruleFactory.createClassNameRef({
                backgroundColor: color
            }));
            decorations.push({
                range: {
                    startLineNumber: colorData[i].colorInfo.range.startLineNumber,
                    startColumn: colorData[i].colorInfo.range.startColumn,
                    endLineNumber: colorData[i].colorInfo.range.endLineNumber,
                    endColumn: colorData[i].colorInfo.range.endColumn
                },
                options: {
                    description: 'colorDetector',
                    before: {
                        content: noBreakWhitespace,
                        inlineClassName: `${ref.className} colorpicker-color-decoration`,
                        inlineClassNameAffectsLetterSpacing: true,
                        attachedData: ColorDecorationInjectedTextMarker
                    }
                }
            });
        }
        const limited = limit < colorData.length ? limit : false;
        this._decoratorLimitReporter.update(colorData.length, limited);
        this._colorDecoratorIds.set(decorations);
    }
    removeAllDecorations() {
        this._editor.removeDecorations(this._decorationsIds);
        this._decorationsIds = [];
        this._colorDecoratorIds.clear();
        this._colorDecorationClassRefs.clear();
    }
    getColorData(position) {
        const model = this._editor.getModel();
        if (!model) {
            return null;
        }
        const decorations = model
            .getDecorationsInRange(Range.fromPositions(position, position))
            .filter(d => this._colorDatas.has(d.id));
        if (decorations.length === 0) {
            return null;
        }
        return this._colorDatas.get(decorations[0].id);
    }
    isColorDecoration(decoration) {
        return this._colorDecoratorIds.has(decoration);
    }
};
ColorDetector = ColorDetector_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, ILanguageFeaturesService),
    __param(3, ILanguageFeatureDebounceService)
], ColorDetector);
export { ColorDetector };
export class DecoratorLimitReporter {
    constructor() {
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._computed = 0;
        this._limited = false;
    }
    get computed() {
        return this._computed;
    }
    get limited() {
        return this._limited;
    }
    update(computed, limited) {
        if (computed !== this._computed || limited !== this._limited) {
            this._computed = computed;
            this._limited = limited;
            this._onDidChange.fire();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JEZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2NvbG9yRGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3RELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBK0IsK0JBQStCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuSSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsU0FBUyxFQUFjLE1BQU0sWUFBWSxDQUFDO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxH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