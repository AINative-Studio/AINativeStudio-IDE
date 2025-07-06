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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlnaGxpZ2h0RGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3dvcmRIaWdobGlnaHRlci9icm93c2VyL2hpZ2hsaWdodERlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyxFQUFtQixpQkFBaUIsRUFBMEIsTUFBTSwwQkFBMEIsQ0FBQztBQUN0RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBRSxtQ0FBbUMsRUFBRSx5Q0FBeUMsRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuTixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqSCxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxrSkFBa0osQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2pWLGFBQWEsQ0FBQyxzQ0FBc0MsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVB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