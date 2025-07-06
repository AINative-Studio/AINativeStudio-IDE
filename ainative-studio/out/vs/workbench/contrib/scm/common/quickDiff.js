/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Color } from '../../../../base/common/color.js';
import { darken, editorBackground, editorForeground, listInactiveSelectionBackground, opaque, editorErrorForeground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
export const IQuickDiffService = createDecorator('quickDiff');
const editorGutterModifiedBackground = registerColor('editorGutter.modifiedBackground', {
    dark: '#1B81A8', light: '#2090D3', hcDark: '#1B81A8', hcLight: '#2090D3'
}, nls.localize('editorGutterModifiedBackground', "Editor gutter background color for lines that are modified."));
const editorGutterAddedBackground = registerColor('editorGutter.addedBackground', {
    dark: '#487E02', light: '#48985D', hcDark: '#487E02', hcLight: '#48985D'
}, nls.localize('editorGutterAddedBackground', "Editor gutter background color for lines that are added."));
const editorGutterDeletedBackground = registerColor('editorGutter.deletedBackground', editorErrorForeground, nls.localize('editorGutterDeletedBackground', "Editor gutter background color for lines that are deleted."));
export const minimapGutterModifiedBackground = registerColor('minimapGutter.modifiedBackground', editorGutterModifiedBackground, nls.localize('minimapGutterModifiedBackground', "Minimap gutter background color for lines that are modified."));
export const minimapGutterAddedBackground = registerColor('minimapGutter.addedBackground', editorGutterAddedBackground, nls.localize('minimapGutterAddedBackground', "Minimap gutter background color for lines that are added."));
export const minimapGutterDeletedBackground = registerColor('minimapGutter.deletedBackground', editorGutterDeletedBackground, nls.localize('minimapGutterDeletedBackground', "Minimap gutter background color for lines that are deleted."));
export const overviewRulerModifiedForeground = registerColor('editorOverviewRuler.modifiedForeground', transparent(editorGutterModifiedBackground, 0.6), nls.localize('overviewRulerModifiedForeground', 'Overview ruler marker color for modified content.'));
export const overviewRulerAddedForeground = registerColor('editorOverviewRuler.addedForeground', transparent(editorGutterAddedBackground, 0.6), nls.localize('overviewRulerAddedForeground', 'Overview ruler marker color for added content.'));
export const overviewRulerDeletedForeground = registerColor('editorOverviewRuler.deletedForeground', transparent(editorGutterDeletedBackground, 0.6), nls.localize('overviewRulerDeletedForeground', 'Overview ruler marker color for deleted content.'));
export const editorGutterItemGlyphForeground = registerColor('editorGutter.itemGlyphForeground', { dark: editorForeground, light: editorForeground, hcDark: Color.black, hcLight: Color.white }, nls.localize('editorGutterItemGlyphForeground', 'Editor gutter decoration color for gutter item glyphs.'));
export const editorGutterItemBackground = registerColor('editorGutter.itemBackground', { dark: opaque(listInactiveSelectionBackground, editorBackground), light: darken(opaque(listInactiveSelectionBackground, editorBackground), .05), hcDark: Color.white, hcLight: Color.black }, nls.localize('editorGutterItemBackground', 'Editor gutter decoration color for gutter item background. This color should be opaque.'));
export var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["Modify"] = 0] = "Modify";
    ChangeType[ChangeType["Add"] = 1] = "Add";
    ChangeType[ChangeType["Delete"] = 2] = "Delete";
})(ChangeType || (ChangeType = {}));
export function getChangeType(change) {
    if (change.originalEndLineNumber === 0) {
        return ChangeType.Add;
    }
    else if (change.modifiedEndLineNumber === 0) {
        return ChangeType.Delete;
    }
    else {
        return ChangeType.Modify;
    }
}
export function getChangeTypeColor(theme, changeType) {
    switch (changeType) {
        case ChangeType.Modify: return theme.getColor(editorGutterModifiedBackground);
        case ChangeType.Add: return theme.getColor(editorGutterAddedBackground);
        case ChangeType.Delete: return theme.getColor(editorGutterDeletedBackground);
    }
}
export function compareChanges(a, b) {
    let result = a.modifiedStartLineNumber - b.modifiedStartLineNumber;
    if (result !== 0) {
        return result;
    }
    result = a.modifiedEndLineNumber - b.modifiedEndLineNumber;
    if (result !== 0) {
        return result;
    }
    result = a.originalStartLineNumber - b.originalStartLineNumber;
    if (result !== 0) {
        return result;
    }
    return a.originalEndLineNumber - b.originalEndLineNumber;
}
export function getChangeHeight(change) {
    const modified = change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1;
    const original = change.originalEndLineNumber - change.originalStartLineNumber + 1;
    if (change.originalEndLineNumber === 0) {
        return modified;
    }
    else if (change.modifiedEndLineNumber === 0) {
        return original;
    }
    else {
        return modified + original;
    }
}
export function getModifiedEndLineNumber(change) {
    if (change.modifiedEndLineNumber === 0) {
        return change.modifiedStartLineNumber === 0 ? 1 : change.modifiedStartLineNumber;
    }
    else {
        return change.modifiedEndLineNumber;
    }
}
export function lineIntersectsChange(lineNumber, change) {
    // deletion at the beginning of the file
    if (lineNumber === 1 && change.modifiedStartLineNumber === 0 && change.modifiedEndLineNumber === 0) {
        return true;
    }
    return lineNumber >= change.modifiedStartLineNumber && lineNumber <= (change.modifiedEndLineNumber || change.modifiedStartLineNumber);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2NvbW1vbi9xdWlja0RpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUcxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFPN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFDTixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxFQUNuRixxQkFBcUIsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUNqRCxNQUFNLG9EQUFvRCxDQUFDO0FBRTVELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBb0IsV0FBVyxDQUFDLENBQUM7QUFFakYsTUFBTSw4QkFBOEIsR0FBRyxhQUFhLENBQUMsaUNBQWlDLEVBQUU7SUFDdkYsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVM7Q0FDeEUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLDZEQUE2RCxDQUFDLENBQUMsQ0FBQztBQUVsSCxNQUFNLDJCQUEyQixHQUFHLGFBQWEsQ0FBQyw4QkFBOEIsRUFBRTtJQUNqRixJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUztDQUN4RSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsMERBQTBELENBQUMsQ0FBQyxDQUFDO0FB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