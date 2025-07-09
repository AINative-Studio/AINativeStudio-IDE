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
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { Range } from '../../../../common/core/range.js';
import { ColorDetector } from '../colorDetector.js';
import { ColorPickerWidget } from '../colorPickerWidget.js';
import { RenderedHoverParts } from '../../../hover/browser/hoverTypes.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import * as nls from '../../../../../nls.js';
import { createColorHover, updateColorPresentations, updateEditorModel } from '../colorPickerParticipantUtils.js';
import { Dimension } from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
export class ColorHover {
    constructor(owner, range, model, provider) {
        this.owner = owner;
        this.range = range;
        this.model = model;
        this.provider = provider;
        /**
         * Force the hover to always be rendered at this specific range,
         * even in the case of multiple hover parts.
         */
        this.forceShowAtRange = true;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */
            && this.range.startColumn <= anchor.range.startColumn
            && this.range.endColumn >= anchor.range.endColumn);
    }
    static fromBaseColor(owner, color) {
        return new ColorHover(owner, color.range, color.model, color.provider);
    }
}
let HoverColorPickerParticipant = class HoverColorPickerParticipant {
    constructor(_editor, _themeService) {
        this._editor = _editor;
        this._themeService = _themeService;
        this.hoverOrdinal = 2;
    }
    computeSync(_anchor, _lineDecorations, source) {
        return [];
    }
    computeAsync(anchor, lineDecorations, source, token) {
        return AsyncIterableObject.fromPromise(this._computeAsync(anchor, lineDecorations, source));
    }
    async _computeAsync(_anchor, lineDecorations, source) {
        if (!this._editor.hasModel()) {
            return [];
        }
        if (!this._isValidRequest(source)) {
            return [];
        }
        const colorDetector = ColorDetector.get(this._editor);
        if (!colorDetector) {
            return [];
        }
        for (const d of lineDecorations) {
            if (!colorDetector.isColorDecoration(d)) {
                continue;
            }
            const colorData = colorDetector.getColorData(d.range.getStartPosition());
            if (colorData) {
                const colorHover = ColorHover.fromBaseColor(this, await createColorHover(this._editor.getModel(), colorData.colorInfo, colorData.provider));
                return [colorHover];
            }
        }
        return [];
    }
    _isValidRequest(source) {
        const decoratorActivatedOn = this._editor.getOption(154 /* EditorOption.colorDecoratorsActivatedOn */);
        switch (source) {
            case 0 /* HoverStartSource.Mouse */:
                return decoratorActivatedOn === 'hover' || decoratorActivatedOn === 'clickAndHover';
            case 1 /* HoverStartSource.Click */:
                return decoratorActivatedOn === 'click' || decoratorActivatedOn === 'clickAndHover';
            case 2 /* HoverStartSource.Keyboard */:
                return true;
        }
    }
    renderHoverParts(context, hoverParts) {
        const editor = this._editor;
        if (hoverParts.length === 0 || !editor.hasModel()) {
            return new RenderedHoverParts([]);
        }
        const minimumHeight = editor.getOption(68 /* EditorOption.lineHeight */) + 8;
        context.setMinimumDimensions(new Dimension(302, minimumHeight));
        const disposables = new DisposableStore();
        const colorHover = hoverParts[0];
        const editorModel = editor.getModel();
        const model = colorHover.model;
        this._colorPicker = disposables.add(new ColorPickerWidget(context.fragment, model, editor.getOption(149 /* EditorOption.pixelRatio */), this._themeService, "hover" /* ColorPickerWidgetType.Hover */));
        let editorUpdatedByColorPicker = false;
        let range = new Range(colorHover.range.startLineNumber, colorHover.range.startColumn, colorHover.range.endLineNumber, colorHover.range.endColumn);
        disposables.add(model.onColorFlushed(async (color) => {
            await updateColorPresentations(editorModel, model, color, range, colorHover);
            editorUpdatedByColorPicker = true;
            range = updateEditorModel(editor, range, model);
        }));
        disposables.add(model.onDidChangeColor((color) => {
            updateColorPresentations(editorModel, model, color, range, colorHover);
        }));
        disposables.add(editor.onDidChangeModelContent((e) => {
            if (editorUpdatedByColorPicker) {
                editorUpdatedByColorPicker = false;
            }
            else {
                context.hide();
                editor.focus();
            }
        }));
        const renderedHoverPart = {
            hoverPart: ColorHover.fromBaseColor(this, colorHover),
            hoverElement: this._colorPicker.domNode,
            dispose() { disposables.dispose(); }
        };
        return new RenderedHoverParts([renderedHoverPart]);
    }
    getAccessibleContent(hoverPart) {
        return nls.localize('hoverAccessibilityColorParticipant', 'There is a color picker here.');
    }
    handleResize() {
        this._colorPicker?.layout();
    }
    handleHide() {
        this._colorPicker?.dispose();
        this._colorPicker = undefined;
    }
    isColorPickerVisible() {
        return !!this._colorPicker;
    }
};
HoverColorPickerParticipant = __decorate([
    __param(1, IThemeService)
], HoverColorPickerParticipant);
export { HoverColorPickerParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlclBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvaG92ZXJDb2xvclBpY2tlci9ob3ZlckNvbG9yUGlja2VyUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVwRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM1RCxPQUFPLEVBQXlJLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDak4sT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxFQUFvQyxnQkFBZ0IsRUFBRSx3QkFBd0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXBKLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJMUUsTUFBTSxPQUFPLFVBQVU7SUFRdEIsWUFDaUIsS0FBMEMsRUFDMUMsS0FBWSxFQUNaLEtBQXVCLEVBQ3ZCLFFBQStCO1FBSC9CLFVBQUssR0FBTCxLQUFLLENBQXFDO1FBQzFDLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixVQUFLLEdBQUwsS0FBSyxDQUFrQjtRQUN2QixhQUFR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