/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Color, RGBA } from '../../../../base/common/color.js';
import { getColorPresentations } from './color.js';
import { ColorPickerModel } from './colorPickerModel.js';
import { Range } from '../../../common/core/range.js';
export var ColorPickerWidgetType;
(function (ColorPickerWidgetType) {
    ColorPickerWidgetType["Hover"] = "hover";
    ColorPickerWidgetType["Standalone"] = "standalone";
})(ColorPickerWidgetType || (ColorPickerWidgetType = {}));
export async function createColorHover(editorModel, colorInfo, provider) {
    const originalText = editorModel.getValueInRange(colorInfo.range);
    const { red, green, blue, alpha } = colorInfo.color;
    const rgba = new RGBA(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255), alpha);
    const color = new Color(rgba);
    const colorPresentations = await getColorPresentations(editorModel, colorInfo, provider, CancellationToken.None);
    const model = new ColorPickerModel(color, [], 0);
    model.colorPresentations = colorPresentations || [];
    model.guessColorPresentation(color, originalText);
    return {
        range: Range.lift(colorInfo.range),
        model,
        provider
    };
}
export function updateEditorModel(editor, range, model) {
    const textEdits = [];
    const edit = model.presentation.textEdit ?? { range, text: model.presentation.label, forceMoveMarkers: false };
    textEdits.push(edit);
    if (model.presentation.additionalTextEdits) {
        textEdits.push(...model.presentation.additionalTextEdits);
    }
    const replaceRange = Range.lift(edit.range);
    const trackedRange = editor.getModel()._setTrackedRange(null, replaceRange, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */);
    editor.executeEdits('colorpicker', textEdits);
    editor.pushUndoStop();
    return editor.getModel()._getTrackedRange(trackedRange) ?? replaceRange;
}
export async function updateColorPresentations(editorModel, colorPickerModel, color, range, colorHover) {
    const colorPresentations = await getColorPresentations(editorModel, {
        range: range,
        color: {
            red: color.rgba.r / 255,
            green: color.rgba.g / 255,
            blue: color.rgba.b / 255,
            alpha: color.rgba.a
        }
    }, colorHover.provider, CancellationToken.None);
    colorPickerModel.colorPresentations = colorPresentations || [];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJQYXJ0aWNpcGFudFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvY29sb3JQaWNrZXJQYXJ0aWNpcGFudFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFLL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxNQUFNLENBQU4sSUFBa0IscUJBR2pCO0FBSEQsV0FBa0IscUJBQXFCO0lBQ3RDLHdDQUFlLENBQUE7SUFDZixrREFBeUIsQ0FBQTtBQUMxQixDQUFDLEVBSGlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFHdEM7QUFRRCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUFDLFdBQXVCLEVBQUUsU0FBNEIsRUFBRSxRQUErQjtJQUM1SCxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztJQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsRUFBRSxJ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