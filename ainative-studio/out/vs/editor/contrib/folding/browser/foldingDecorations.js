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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvZm9sZGluZ0RlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUc5RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDM0ksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxNQUFNLGNBQWMsR0FBRyxhQUFhLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMseUJBQXlCLEVBQUUsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLCtHQUErRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDblcsYUFBYSxDQUFDLGtDQUFrQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJ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