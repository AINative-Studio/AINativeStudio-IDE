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
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { getColors } from '../color.js';
import { ColorDetector } from '../colorDetector.js';
import { createColorHover, updateColorPresentations, updateEditorModel } from '../colorPickerParticipantUtils.js';
import { ColorPickerWidget } from '../colorPickerWidget.js';
import { Range } from '../../../../common/core/range.js';
import { Dimension } from '../../../../../base/browser/dom.js';
export class StandaloneColorPickerHover {
    constructor(owner, range, model, provider) {
        this.owner = owner;
        this.range = range;
        this.model = model;
        this.provider = provider;
    }
    static fromBaseColor(owner, color) {
        return new StandaloneColorPickerHover(owner, color.range, color.model, color.provider);
    }
}
export class StandaloneColorPickerRenderedParts extends Disposable {
    constructor(editor, context, colorHover, themeService) {
        super();
        const editorModel = editor.getModel();
        const colorPickerModel = colorHover.model;
        this.color = colorHover.model.color;
        this.colorPicker = this._register(new ColorPickerWidget(context.fragment, colorPickerModel, editor.getOption(149 /* EditorOption.pixelRatio */), themeService, "standalone" /* ColorPickerWidgetType.Standalone */));
        this._register(colorPickerModel.onColorFlushed((color) => {
            this.color = color;
        }));
        this._register(colorPickerModel.onDidChangeColor((color) => {
            updateColorPresentations(editorModel, colorPickerModel, color, colorHover.range, colorHover);
        }));
        let editorUpdatedByColorPicker = false;
        this._register(editor.onDidChangeModelContent((e) => {
            if (editorUpdatedByColorPicker) {
                editorUpdatedByColorPicker = false;
            }
            else {
                context.hide();
                editor.focus();
            }
        }));
        updateColorPresentations(editorModel, colorPickerModel, this.color, colorHover.range, colorHover);
    }
}
let StandaloneColorPickerParticipant = class StandaloneColorPickerParticipant {
    constructor(_editor, _themeService) {
        this._editor = _editor;
        this._themeService = _themeService;
        this.hoverOrdinal = 2;
    }
    async createColorHover(defaultColorInfo, defaultColorProvider, colorProviderRegistry) {
        if (!this._editor.hasModel()) {
            return null;
        }
        const colorDetector = ColorDetector.get(this._editor);
        if (!colorDetector) {
            return null;
        }
        const colors = await getColors(colorProviderRegistry, this._editor.getModel(), CancellationToken.None);
        let foundColorInfo = null;
        let foundColorProvider = null;
        for (const colorData of colors) {
            const colorInfo = colorData.colorInfo;
            if (Range.containsRange(colorInfo.range, defaultColorInfo.range)) {
                foundColorInfo = colorInfo;
                foundColorProvider = colorData.provider;
            }
        }
        const colorInfo = foundColorInfo ?? defaultColorInfo;
        const colorProvider = foundColorProvider ?? defaultColorProvider;
        const foundInEditor = !!foundColorInfo;
        const colorHover = StandaloneColorPickerHover.fromBaseColor(this, await createColorHover(this._editor.getModel(), colorInfo, colorProvider));
        return { colorHover, foundInEditor };
    }
    async updateEditorModel(colorHoverData) {
        if (!this._editor.hasModel()) {
            return;
        }
        const colorPickerModel = colorHoverData.model;
        let range = new Range(colorHoverData.range.startLineNumber, colorHoverData.range.startColumn, colorHoverData.range.endLineNumber, colorHoverData.range.endColumn);
        if (this._color) {
            await updateColorPresentations(this._editor.getModel(), colorPickerModel, this._color, range, colorHoverData);
            range = updateEditorModel(this._editor, range, colorPickerModel);
        }
    }
    renderHoverParts(context, hoverParts) {
        if (hoverParts.length === 0 || !this._editor.hasModel()) {
            return undefined;
        }
        this._setMinimumDimensions(context);
        this._renderedParts = new StandaloneColorPickerRenderedParts(this._editor, context, hoverParts[0], this._themeService);
        return this._renderedParts;
    }
    _setMinimumDimensions(context) {
        const minimumHeight = this._editor.getOption(68 /* EditorOption.lineHeight */) + 8;
        context.setMinimumDimensions(new Dimension(302, minimumHeight));
    }
    get _color() {
        return this._renderedParts?.color;
    }
};
StandaloneColorPickerParticipant = __decorate([
    __param(1, IThemeService)
], StandaloneColorPickerParticipant);
export { StandaloneColorPickerParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9zdGFuZGFsb25lQ29sb3JQaWNrZXIvc3RhbmRhbG9uZUNvbG9yUGlja2VyUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUtyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVwRCxPQUFPLEVBQW9DLGdCQUFnQixFQUFFLHdCQUF3QixFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEosT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUvRCxNQUFNLE9BQU8sMEJBQTBCO0lBQ3RDLFlBQ2lCLEtBQXVDLEVBQ3ZDLEtBQVksRUFDWixLQUF1QixFQUN2QixRQUErQjtRQUgvQixVQUFLLEdBQUwsS0FBSyxDQUFrQztRQUN2QyxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFDdkIsYUFBUSxHQUFSLFFBQVEsQ0FBdUI7SUFDNUMsQ0FBQztJQUVFLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBdUMsRUFBRSxLQUFnQjtRQUNwRixPQUFPLElBQUksMEJBQTBCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDeEYsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGtDQUFtQyxTQUFRLFVBQVU7SUFNakUsWUFBWSxNQUF5QixFQUFFLE9BQWtDLEVBQUUsVUFBc0MsRUFBRSxZQUEyQjtRQUM3SSxLQUFLLEVBQUUsQ0FBQztRQUNSLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFFMUMsSUFBSSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsQ0FDdEQsT0FBTyxDQUFDLFFBQVEsRUFDaEIsZ0JBQWdCLEVBQ2hCLE1BQU0sQ0FBQyxTQUFTLG1DQUF5QixFQUN6QyxZQUFZLHNEQUVaLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBWSxFQUFFLEVBQUU7WUFDL0QsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFZLEVBQUUsRUFBRTtZQUNqRSx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUYsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksMEJBQTBCLEdBQUcsS0FBSyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbkQsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO2dCQUNoQywwQkFBMEIsR0FBRyxLQUFLLENBQUM7WUFDcEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDZixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSix3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ25HLENBQUM7Q0FDRDtBQUVNLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWdDO0lBSzVDLFlBQ2tCLE9BQW9CLEVBQ3RCLGFBQTZDO1FBRDNDLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDTCxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUw3QyxpQkFBWSxHQUFXLENBQUMsQ0FBQztJQU1yQyxDQUFDO0lBRUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGdCQUFtQyxFQUFFLG9CQUEyQyxFQUFFLHFCQUFxRTtRQUNwTCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZHLElBQUksY0FBYyxHQUE2QixJQUFJLENBQUM7UUFDcEQsSUFBSSxrQkFBa0IsR0FBaUMsSUFBSSxDQUFDO1FBQzVELEtBQUssTUFBTSxTQUFTLElBQUksTUFBTSxFQUFFLENBQUM7WUFDaEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQztZQUN0QyxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsRSxjQUFjLEdBQUcsU0FBUyxDQUFDO2dCQUMzQixrQkFBa0IsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDO1lBQ3pDLENBQUM7UUFDRixDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsY0FBYyxJQUFJLGdCQUFnQixDQUFDO1FBQ3JELE1BQU0sYUFBYSxHQUFHLGtCQUFrQixJQUFJLG9CQUFvQixDQUFDO1FBQ2pFLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUM7UUFDdkMsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxNQUFNLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDN0ksT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRU0sS0FBSyxDQUFDLGlCQUFpQixDQUFDLGNBQTBDO1FBQ3hFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUM7UUFDOUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsSyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixNQUFNLHdCQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDOUcsS0FBSyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDbEUsQ0FBQztJQUNGLENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxPQUFrQyxFQUFFLFVBQXdDO1FBQ25HLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDekQsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksa0NBQWtDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN2SCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDNUIsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQWtDO1FBQy9ELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxrQ0FBeUIsR0FBRyxDQUFDLENBQUM7UUFDMUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLElBQUksU0FBUyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRCxJQUFZLE1BQU07UUFDakIsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQztJQUNuQyxDQUFDO0NBQ0QsQ0FBQTtBQWhFWSxnQ0FBZ0M7SUFPMUMsV0FBQSxhQUFhLENBQUE7R0FQSCxnQ0FBZ0MsQ0FnRTVDIn0=