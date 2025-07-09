/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { localize } from '../../../../nls.js';
import { editorSelectionBackground, iconForeground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
const foldBackground = registerColor('editor.foldBackground', { light: transparent(editorSelectionBackground, 0.3), dark: transparent(editorSelectionBackground, 0.3), hcDark: null, hcLight: null }, localize('foldBackgroundBackground', "Background color behind folded ranges. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor('editor.foldPlaceholderForeground', { light: '#808080', dark: '#808080', hcDark: null, hcLight: null }, localize('collapsedTextColor', "Color of the collapsed text after the first line of a folded range."));
registerColor('editorGutter.foldingControlForeground', iconForeground, localize('editorGutter.foldingControlForeground', 'Color of the folding control in the editor gutter.'));
export const foldingExpandedIcon = registerIcon('folding-expanded', Codicon.chevronDown, localize('foldingExpandedIcon', 'Icon for expanded ranges in the editor glyph margin.'));
export const foldingCollapsedIcon = registerIcon('folding-collapsed', Codicon.chevronRight, localize('foldingCollapsedIcon', 'Icon for collapsed ranges in the editor glyph margin.'));
export const foldingManualCollapsedIcon = registerIcon('folding-manual-collapsed', foldingCollapsedIcon, localize('foldingManualCollapedIcon', 'Icon for manually collapsed ranges in the editor glyph margin.'));
export const foldingManualExpandedIcon = registerIcon('folding-manual-expanded', foldingExpandedIcon, localize('foldingManualExpandedIcon', 'Icon for manually expanded ranges in the editor glyph margin.'));
const foldedBackgroundMinimap = { color: themeColorFromId(foldBackground), position: 1 /* MinimapPosition.Inline */ };
const collapsed = localize('linesCollapsed', "Click to expand the range.");
const expanded = localize('linesExpanded', "Click to collapse the range.");
export class FoldingDecorationProvider {
    static { this.COLLAPSED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-collapsed-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingCollapsedIcon),
    }); }
    static { this.COLLAPSED_HIGHLIGHTED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-collapsed-highlighted-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        className: 'folded-background',
        minimap: foldedBackgroundMinimap,
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingCollapsedIcon)
    }); }
    static { this.MANUALLY_COLLAPSED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-manually-collapsed-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingManualCollapsedIcon)
    }); }
    static { this.MANUALLY_COLLAPSED_HIGHLIGHTED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-manually-collapsed-highlighted-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        className: 'folded-background',
        minimap: foldedBackgroundMinimap,
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingManualCollapsedIcon)
    }); }
    static { this.NO_CONTROLS_COLLAPSED_RANGE_DECORATION = ModelDecorationOptions.register({
        description: 'folding-no-controls-range-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
    }); }
    static { this.NO_CONTROLS_COLLAPSED_HIGHLIGHTED_RANGE_DECORATION = ModelDecorationOptions.register({
        description: 'folding-no-controls-range-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        className: 'folded-background',
        minimap: foldedBackgroundMinimap,
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
    }); }
    static { this.EXPANDED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-expanded-visual-decoration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        isWholeLine: true,
        firstLineDecorationClassName: 'alwaysShowFoldIcons ' + ThemeIcon.asClassName(foldingExpandedIcon),
        linesDecorationsTooltip: expanded,
    }); }
    static { this.EXPANDED_AUTO_HIDE_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-expanded-auto-hide-visual-decoration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        isWholeLine: true,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingExpandedIcon),
        linesDecorationsTooltip: expanded,
    }); }
    static { this.MANUALLY_EXPANDED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-manually-expanded-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        isWholeLine: true,
        firstLineDecorationClassName: 'alwaysShowFoldIcons ' + ThemeIcon.asClassName(foldingManualExpandedIcon),
        linesDecorationsTooltip: expanded,
    }); }
    static { this.MANUALLY_EXPANDED_AUTO_HIDE_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-manually-expanded-auto-hide-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        isWholeLine: true,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingManualExpandedIcon),
        linesDecorationsTooltip: expanded,
    }); }
    static { this.NO_CONTROLS_EXPANDED_RANGE_DECORATION = ModelDecorationOptions.register({
        description: 'folding-no-controls-range-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        isWholeLine: true
    }); }
    static { this.HIDDEN_RANGE_DECORATION = ModelDecorationOptions.register({
        description: 'folding-hidden-range-decoration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
    }); }
    constructor(editor) {
        this.editor = editor;
        this.showFoldingControls = 'mouseover';
        this.showFoldingHighlights = true;
    }
    getDecorationOption(isCollapsed, isHidden, isManual) {
        if (isHidden) { // is inside another collapsed region
            return FoldingDecorationProvider.HIDDEN_RANGE_DECORATION;
        }
        if (this.showFoldingControls === 'never') {
            if (isCollapsed) {
                return this.showFoldingHighlights ? FoldingDecorationProvider.NO_CONTROLS_COLLAPSED_HIGHLIGHTED_RANGE_DECORATION : FoldingDecorationProvider.NO_CONTROLS_COLLAPSED_RANGE_DECORATION;
            }
            return FoldingDecorationProvider.NO_CONTROLS_EXPANDED_RANGE_DECORATION;
        }
        if (isCollapsed) {
            return isManual ?
                (this.showFoldingHighlights ? FoldingDecorationProvider.MANUALLY_COLLAPSED_HIGHLIGHTED_VISUAL_DECORATION : FoldingDecorationProvider.MANUALLY_COLLAPSED_VISUAL_DECORATION)
                : (this.showFoldingHighlights ? FoldingDecorationProvider.COLLAPSED_HIGHLIGHTED_VISUAL_DECORATION : FoldingDecorationProvider.COLLAPSED_VISUAL_DECORATION);
        }
        else if (this.showFoldingControls === 'mouseover') {
            return isManual ? FoldingDecorationProvider.MANUALLY_EXPANDED_AUTO_HIDE_VISUAL_DECORATION : FoldingDecorationProvider.EXPANDED_AUTO_HIDE_VISUAL_DECORATION;
        }
        else {
            return isManual ? FoldingDecorationProvider.MANUALLY_EXPANDED_VISUAL_DECORATION : FoldingDecorationProvider.EXPANDED_VISUAL_DECORATION;
        }
    }
    changeDecorations(callback) {
        return this.editor.changeDecorations(callback);
    }
    removeDecorations(decorationIds) {
        this.editor.removeDecorations(decorationIds);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZvbGRpbmcvYnJvd3Nlci9mb2xkaW5nRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMzSSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMseUJBQXlCLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsK0dBQStHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNuVyxhQUFhLENBQUMsa0NBQWtDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksRUFB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