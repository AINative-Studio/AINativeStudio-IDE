/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../../base/common/color.js';
import * as colorRegistry from '../../../../platform/theme/common/colorRegistry.js';
import * as editorColorRegistry from '../../../../editor/common/core/editorColorRegistry.js';
const settingToColorIdMapping = {};
function addSettingMapping(settingId, colorId) {
    let colorIds = settingToColorIdMapping[settingId];
    if (!colorIds) {
        settingToColorIdMapping[settingId] = colorIds = [];
    }
    colorIds.push(colorId);
}
export function convertSettings(oldSettings, result) {
    for (const rule of oldSettings) {
        result.textMateRules.push(rule);
        if (!rule.scope) {
            const settings = rule.settings;
            if (!settings) {
                rule.settings = {};
            }
            else {
                for (const settingKey in settings) {
                    const key = settingKey;
                    const mappings = settingToColorIdMapping[key];
                    if (mappings) {
                        const colorHex = settings[key];
                        if (typeof colorHex === 'string') {
                            const color = Color.fromHex(colorHex);
                            for (const colorId of mappings) {
                                result.colors[colorId] = color;
                            }
                        }
                    }
                    if (key !== 'foreground' && key !== 'background' && key !== 'fontStyle') {
                        delete settings[key];
                    }
                }
            }
        }
    }
}
addSettingMapping('background', colorRegistry.editorBackground);
addSettingMapping('foreground', colorRegistry.editorForeground);
addSettingMapping('selection', colorRegistry.editorSelectionBackground);
addSettingMapping('inactiveSelection', colorRegistry.editorInactiveSelection);
addSettingMapping('selectionHighlightColor', colorRegistry.editorSelectionHighlight);
addSettingMapping('findMatchHighlight', colorRegistry.editorFindMatchHighlight);
addSettingMapping('currentFindMatchHighlight', colorRegistry.editorFindMatch);
addSettingMapping('hoverHighlight', colorRegistry.editorHoverHighlight);
addSettingMapping('wordHighlight', 'editor.wordHighlightBackground'); // inlined to avoid editor/contrib dependenies
addSettingMapping('wordHighlightStrong', 'editor.wordHighlightStrongBackground');
addSettingMapping('findRangeHighlight', colorRegistry.editorFindRangeHighlight);
addSettingMapping('findMatchHighlight', 'peekViewResult.matchHighlightBackground');
addSettingMapping('referenceHighlight', 'peekViewEditor.matchHighlightBackground');
addSettingMapping('lineHighlight', editorColorRegistry.editorLineHighlight);
addSettingMapping('rangeHighlight', editorColorRegistry.editorRangeHighlight);
addSettingMapping('caret', editorColorRegistry.editorCursorForeground);
addSettingMapping('invisibles', editorColorRegistry.editorWhitespaces);
addSettingMapping('guide', editorColorRegistry.editorIndentGuide1);
addSettingMapping('activeGuide', editorColorRegistry.editorActiveIndentGuide1);
const ansiColorMap = ['ansiBlack', 'ansiRed', 'ansiGreen', 'ansiYellow', 'ansiBlue', 'ansiMagenta', 'ansiCyan', 'ansiWhite',
    'ansiBrightBlack', 'ansiBrightRed', 'ansiBrightGreen', 'ansiBrightYellow', 'ansiBrightBlue', 'ansiBrightMagenta', 'ansiBrightCyan', 'ansiBrightWhite'
];
for (const color of ansiColorMap) {
    addSettingMapping(color, 'terminal.' + color);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVDb21wYXRpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3RoZW1lQ29tcGF0aWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxLQUFLLGFBQWEsTUFBTSxvREFBb0QsQ0FBQztBQUVwRixPQUFPLEtBQUssbUJBQW1CLE1BQU0sdURBQXVELENBQUM7QUFFN0YsTUFBTSx1QkFBdUIsR0FBc0MsRUFBRSxDQUFDO0FBQ3RFLFNBQVMsaUJBQWlCLENBQUMsU0FBaUIsRUFBRSxPQUFlO0lBQzVELElBQUksUUFBUSxHQUFHLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxHQUFHLFFBQVEsR0FBRyxFQUFFLENBQUM7SUFDcEQsQ0FBQztJQUNELFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsV0FBbUMsRUFBRSxNQUFvRTtJQUN4SSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUMvQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENB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