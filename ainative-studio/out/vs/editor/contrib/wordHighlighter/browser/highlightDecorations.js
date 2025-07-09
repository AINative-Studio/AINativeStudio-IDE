/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './highlightDecorations.css';
import { OverviewRulerLane } from '../../../common/model.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { DocumentHighlightKind } from '../../../common/languages.js';
import * as nls from '../../../../nls.js';
import { activeContrastBorder, editorSelectionHighlight, minimapSelectionOccurrenceHighlight, overviewRulerSelectionHighlightForeground, registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant, themeColorFromId } from '../../../../platform/theme/common/themeService.js';
const wordHighlightBackground = registerColor('editor.wordHighlightBackground', { dark: '#575757B8', light: '#57575740', hcDark: null, hcLight: null }, nls.localize('wordHighlight', 'Background color of a symbol during read-access, like reading a variable. The color must not be opaque so as not to hide underlying decorations.'), true);
registerColor('editor.wordHighlightStrongBackground', { dark: '#004972B8', light: '#0e639c40', hcDark: null, hcLight: null }, nls.localize('wordHighlightStrong', 'Background color of a symbol during write-access, like writing to a variable. The color must not be opaque so as not to hide underlying decorations.'), true);
registerColor('editor.wordHighlightTextBackground', wordHighlightBackground, nls.localize('wordHighlightText', 'Background color of a textual occurrence for a symbol. The color must not be opaque so as not to hide underlying decorations.'), true);
const wordHighlightBorder = registerColor('editor.wordHighlightBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('wordHighlightBorder', 'Border color of a symbol during read-access, like reading a variable.'));
registerColor('editor.wordHighlightStrongBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('wordHighlightStrongBorder', 'Border color of a symbol during write-access, like writing to a variable.'));
registerColor('editor.wordHighlightTextBorder', wordHighlightBorder, nls.localize('wordHighlightTextBorder', "Border color of a textual occurrence for a symbol."));
const overviewRulerWordHighlightForeground = registerColor('editorOverviewRuler.wordHighlightForeground', '#A0A0A0CC', nls.localize('overviewRulerWordHighlightForeground', 'Overview ruler marker color for symbol highlights. The color must not be opaque so as not to hide underlying decorations.'), true);
const overviewRulerWordHighlightStrongForeground = registerColor('editorOverviewRuler.wordHighlightStrongForeground', '#C0A0C0CC', nls.localize('overviewRulerWordHighlightStrongForeground', 'Overview ruler marker color for write-access symbol highlights. The color must not be opaque so as not to hide underlying decorations.'), true);
const overviewRulerWordHighlightTextForeground = registerColor('editorOverviewRuler.wordHighlightTextForeground', overviewRulerSelectionHighlightForeground, nls.localize('overviewRulerWordHighlightTextForeground', 'Overview ruler marker color of a textual occurrence for a symbol. The color must not be opaque so as not to hide underlying decorations.'), true);
const _WRITE_OPTIONS = ModelDecorationOptions.register({
    description: 'word-highlight-strong',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'wordHighlightStrong',
    overviewRuler: {
        color: themeColorFromId(overviewRulerWordHighlightStrongForeground),
        position: OverviewRulerLane.Center
    },
    minimap: {
        color: themeColorFromId(minimapSelectionOccurrenceHighlight),
        position: 1 /* MinimapPosition.Inline */
    },
});
const _TEXT_OPTIONS = ModelDecorationOptions.register({
    description: 'word-highlight-text',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'wordHighlightText',
    overviewRuler: {
        color: themeColorFromId(overviewRulerWordHighlightTextForeground),
        position: OverviewRulerLane.Center
    },
    minimap: {
        color: themeColorFromId(minimapSelectionOccurrenceHighlight),
        position: 1 /* MinimapPosition.Inline */
    },
});
const _SELECTION_HIGHLIGHT_OPTIONS = ModelDecorationOptions.register({
    description: 'selection-highlight-overview',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'selectionHighlight',
    overviewRuler: {
        color: themeColorFromId(overviewRulerSelectionHighlightForeground),
        position: OverviewRulerLane.Center
    },
    minimap: {
        color: themeColorFromId(minimapSelectionOccurrenceHighlight),
        position: 1 /* MinimapPosition.Inline */
    },
});
const _SELECTION_HIGHLIGHT_OPTIONS_NO_OVERVIEW = ModelDecorationOptions.register({
    description: 'selection-highlight',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'selectionHighlight',
});
const _REGULAR_OPTIONS = ModelDecorationOptions.register({
    description: 'word-highlight',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'wordHighlight',
    overviewRuler: {
        color: themeColorFromId(overviewRulerWordHighlightForeground),
        position: OverviewRulerLane.Center
    },
    minimap: {
        color: themeColorFromId(minimapSelectionOccurrenceHighlight),
        position: 1 /* MinimapPosition.Inline */
    },
});
export function getHighlightDecorationOptions(kind) {
    if (kind === DocumentHighlightKind.Write) {
        return _WRITE_OPTIONS;
    }
    else if (kind === DocumentHighlightKind.Text) {
        return _TEXT_OPTIONS;
    }
    else {
        return _REGULAR_OPTIONS;
    }
}
export function getSelectionHighlightDecorationOptions(hasSemanticHighlights) {
    // Show in overviewRuler only if model has no semantic highlighting
    return (hasSemanticHighlights ? _SELECTION_HIGHLIGHT_OPTIONS_NO_OVERVIEW : _SELECTION_HIGHLIGHT_OPTIONS);
}
registerThemingParticipant((theme, collector) => {
    const selectionHighlight = theme.getColor(editorSelectionHighlight);
    if (selectionHighlight) {
        collector.addRule(`.monaco-editor .selectionHighlight { background-color: ${selectionHighlight.transparent(0.5)}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlnaGxpZ2h0RGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvd29yZEhpZ2hsaWdodGVyL2Jyb3dzZXIvaGlnaGxpZ2h0RGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLEVBQW1CLGlCQUFpQixFQUEwQixNQUFNLDBCQUEwQixDQUFDO0FBQ3RHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHdCQUF3QixFQUFFLG1DQUFtQyxFQUFFLHlDQUF5QyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25OLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWpILE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLGdDQUFnQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLGtKQUFrSixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDalYsYUFBYSxDQUFDLHNDQUFzQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxF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