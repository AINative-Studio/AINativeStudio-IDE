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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVDb21wYXRpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi90aGVtZUNvbXBhdGliaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sS0FBSyxhQUFhLE1BQU0sb0RBQW9ELENBQUM7QUFFcEYsT0FBTyxLQUFLLG1CQUFtQixNQUFNLHVEQUF1RCxDQUFDO0FBRTdGLE1BQU0sdUJBQXVCLEdBQXNDLEVBQUUsQ0FBQztBQUN0RSxTQUFTLGlCQUFpQixDQUFDLFNBQWlCLEVBQUUsT0FBZTtJQUM1RCxJQUFJLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZix1QkFBdUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ3BELENBQUM7SUFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUFDLFdBQW1DLEVBQUUsTUFBb0U7SUFDeEksS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNoQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDL0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFB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