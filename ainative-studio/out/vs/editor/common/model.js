/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../base/common/objects.js';
/**
 * Vertical Lane in the overview ruler of the editor.
 */
export var OverviewRulerLane;
(function (OverviewRulerLane) {
    OverviewRulerLane[OverviewRulerLane["Left"] = 1] = "Left";
    OverviewRulerLane[OverviewRulerLane["Center"] = 2] = "Center";
    OverviewRulerLane[OverviewRulerLane["Right"] = 4] = "Right";
    OverviewRulerLane[OverviewRulerLane["Full"] = 7] = "Full";
})(OverviewRulerLane || (OverviewRulerLane = {}));
/**
 * Vertical Lane in the glyph margin of the editor.
 */
export var GlyphMarginLane;
(function (GlyphMarginLane) {
    GlyphMarginLane[GlyphMarginLane["Left"] = 1] = "Left";
    GlyphMarginLane[GlyphMarginLane["Center"] = 2] = "Center";
    GlyphMarginLane[GlyphMarginLane["Right"] = 3] = "Right";
})(GlyphMarginLane || (GlyphMarginLane = {}));
/**
 * Position in the minimap to render the decoration.
 */
export var MinimapPosition;
(function (MinimapPosition) {
    MinimapPosition[MinimapPosition["Inline"] = 1] = "Inline";
    MinimapPosition[MinimapPosition["Gutter"] = 2] = "Gutter";
})(MinimapPosition || (MinimapPosition = {}));
/**
 * Section header style.
 */
export var MinimapSectionHeaderStyle;
(function (MinimapSectionHeaderStyle) {
    MinimapSectionHeaderStyle[MinimapSectionHeaderStyle["Normal"] = 1] = "Normal";
    MinimapSectionHeaderStyle[MinimapSectionHeaderStyle["Underlined"] = 2] = "Underlined";
})(MinimapSectionHeaderStyle || (MinimapSectionHeaderStyle = {}));
export var InjectedTextCursorStops;
(function (InjectedTextCursorStops) {
    InjectedTextCursorStops[InjectedTextCursorStops["Both"] = 0] = "Both";
    InjectedTextCursorStops[InjectedTextCursorStops["Right"] = 1] = "Right";
    InjectedTextCursorStops[InjectedTextCursorStops["Left"] = 2] = "Left";
    InjectedTextCursorStops[InjectedTextCursorStops["None"] = 3] = "None";
})(InjectedTextCursorStops || (InjectedTextCursorStops = {}));
/**
 * End of line character preference.
 */
export var EndOfLinePreference;
(function (EndOfLinePreference) {
    /**
     * Use the end of line character identified in the text buffer.
     */
    EndOfLinePreference[EndOfLinePreference["TextDefined"] = 0] = "TextDefined";
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLinePreference[EndOfLinePreference["LF"] = 1] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLinePreference[EndOfLinePreference["CRLF"] = 2] = "CRLF";
})(EndOfLinePreference || (EndOfLinePreference = {}));
/**
 * The default end of line to use when instantiating models.
 */
export var DefaultEndOfLine;
(function (DefaultEndOfLine) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    DefaultEndOfLine[DefaultEndOfLine["LF"] = 1] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    DefaultEndOfLine[DefaultEndOfLine["CRLF"] = 2] = "CRLF";
})(DefaultEndOfLine || (DefaultEndOfLine = {}));
/**
 * End of line character preference.
 */
export var EndOfLineSequence;
(function (EndOfLineSequence) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLineSequence[EndOfLineSequence["LF"] = 0] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLineSequence[EndOfLineSequence["CRLF"] = 1] = "CRLF";
})(EndOfLineSequence || (EndOfLineSequence = {}));
export class TextModelResolvedOptions {
    get originalIndentSize() {
        return this._indentSizeIsTabSize ? 'tabSize' : this.indentSize;
    }
    /**
     * @internal
     */
    constructor(src) {
        this._textModelResolvedOptionsBrand = undefined;
        this.tabSize = Math.max(1, src.tabSize | 0);
        if (src.indentSize === 'tabSize') {
            this.indentSize = this.tabSize;
            this._indentSizeIsTabSize = true;
        }
        else {
            this.indentSize = Math.max(1, src.indentSize | 0);
            this._indentSizeIsTabSize = false;
        }
        this.insertSpaces = Boolean(src.insertSpaces);
        this.defaultEOL = src.defaultEOL | 0;
        this.trimAutoWhitespace = Boolean(src.trimAutoWhitespace);
        this.bracketPairColorizationOptions = src.bracketPairColorizationOptions;
    }
    /**
     * @internal
     */
    equals(other) {
        return (this.tabSize === other.tabSize
            && this._indentSizeIsTabSize === other._indentSizeIsTabSize
            && this.indentSize === other.indentSize
            && this.insertSpaces === other.insertSpaces
            && this.defaultEOL === other.defaultEOL
            && this.trimAutoWhitespace === other.trimAutoWhitespace
            && equals(this.bracketPairColorizationOptions, other.bracketPairColorizationOptions));
    }
    /**
     * @internal
     */
    createChangeEvent(newOpts) {
        return {
            tabSize: this.tabSize !== newOpts.tabSize,
            indentSize: this.indentSize !== newOpts.indentSize,
            insertSpaces: this.insertSpaces !== newOpts.insertSpaces,
            trimAutoWhitespace: this.trimAutoWhitespace !== newOpts.trimAutoWhitespace,
        };
    }
}
export class FindMatch {
    /**
     * @internal
     */
    constructor(range, matches) {
        this._findMatchBrand = undefined;
        this.range = range;
        this.matches = matches;
    }
}
/**
 * Describes the behavior of decorations when typing/editing near their edges.
 * Note: Please do not edit the values, as they very carefully match `DecorationRangeBehavior`
 */
export var TrackedRangeStickiness;
(function (TrackedRangeStickiness) {
    TrackedRangeStickiness[TrackedRangeStickiness["AlwaysGrowsWhenTypingAtEdges"] = 0] = "AlwaysGrowsWhenTypingAtEdges";
    TrackedRangeStickiness[TrackedRangeStickiness["NeverGrowsWhenTypingAtEdges"] = 1] = "NeverGrowsWhenTypingAtEdges";
    TrackedRangeStickiness[TrackedRangeStickiness["GrowsOnlyWhenTypingBefore"] = 2] = "GrowsOnlyWhenTypingBefore";
    TrackedRangeStickiness[TrackedRangeStickiness["GrowsOnlyWhenTypingAfter"] = 3] = "GrowsOnlyWhenTypingAfter";
})(TrackedRangeStickiness || (TrackedRangeStickiness = {}));
/**
 * @internal
 */
export function isITextSnapshot(obj) {
    return (obj && typeof obj.read === 'function');
}
/**
 * @internal
 */
export function isITextModel(obj) {
    return Boolean(obj && obj.uri);
}
export var PositionAffinity;
(function (PositionAffinity) {
    /**
     * Prefers the left most position.
    */
    PositionAffinity[PositionAffinity["Left"] = 0] = "Left";
    /**
     * Prefers the right most position.
    */
    PositionAffinity[PositionAffinity["Right"] = 1] = "Right";
    /**
     * No preference.
    */
    PositionAffinity[PositionAffinity["None"] = 2] = "None";
    /**
     * If the given position is on injected text, prefers the position left of it.
    */
    PositionAffinity[PositionAffinity["LeftOfInjectedText"] = 3] = "LeftOfInjectedText";
    /**
     * If the given position is on injected text, prefers the position right of it.
    */
    PositionAffinity[PositionAffinity["RightOfInjectedText"] = 4] = "RightOfInjectedText";
})(PositionAffinity || (PositionAffinity = {}));
/**
 * @internal
 */
export var ModelConstants;
(function (ModelConstants) {
    ModelConstants[ModelConstants["FIRST_LINE_DETECTION_LENGTH_LIMIT"] = 1000] = "FIRST_LINE_DETECTION_LENGTH_LIMIT";
})(ModelConstants || (ModelConstants = {}));
/**
 * @internal
 */
export class ValidAnnotatedEditOperation {
    constructor(identifier, range, text, forceMoveMarkers, isAutoWhitespaceEdit, _isTracked) {
        this.identifier = identifier;
        this.range = range;
        this.text = text;
        this.forceMoveMarkers = forceMoveMarkers;
        this.isAutoWhitespaceEdit = isAutoWhitespaceEdit;
        this._isTracked = _isTracked;
    }
}
/**
 * @internal
 */
export class SearchData {
    constructor(regex, wordSeparators, simpleSearch) {
        this.regex = regex;
        this.wordSeparators = wordSeparators;
        this.simpleSearch = simpleSearch;
    }
}
/**
 * @internal
 */
export class ApplyEditsResult {
    constructor(reverseEdits, changes, trimAutoWhitespaceLineNumbers) {
        this.reverseEdits = reverseEdits;
        this.changes = changes;
        this.trimAutoWhitespaceLineNumbers = trimAutoWhitespaceLineNumbers;
    }
}
/**
 * @internal
 */
export function shouldSynchronizeModel(model) {
    return (!model.isTooLargeForSyncing() && !model.isForSimpleWidget);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFvQnREOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksaUJBS1g7QUFMRCxXQUFZLGlCQUFpQjtJQUM1Qix5REFBUSxDQUFBO0lBQ1IsNkRBQVUsQ0FBQTtJQUNWLDJEQUFTLENBQUE7SUFDVCx5REFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUxXLGlCQUFpQixLQUFqQixpQkFBaUIsUUFLNUI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGVBSVg7QUFKRCxXQUFZLGVBQWU7SUFDMUIscURBQVEsQ0FBQTtJQUNSLHlEQUFVLENBQUE7SUFDVix1REFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUpXLGVBQWUsS0FBZixlQUFlLFFBSTFCO0FBMEJEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGVBR2pCO0FBSEQsV0FBa0IsZUFBZTtJQUNoQyx5REFBVSxDQUFBO0lBQ1YseURBQVUsQ0FBQTtBQUNYLENBQUMsRUFIaUIsZUFBZSxLQUFmLGVBQWUsUUFHaEM7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQix5QkFHakI7QUFIRCxXQUFrQix5QkFBeUI7SUFDMUMsNkVBQVUsQ0FBQTtJQUNWLHFGQUFjLENBQUE7QUFDZixDQUFDLEVBSGlCLHlCQUF5QixLQUF6Qix5QkFBeUIsUUFHMUM7QUF5T0QsTUFBTSxDQUFOLElBQVksdUJBS1g7QUFMRCxXQUFZLHVCQUF1QjtJQUNsQyxxRUFBSSxDQUFBO0lBQ0osdUVBQUssQ0FBQTtJQUNMLHFFQUFJLENBQUE7SUFDSixxRUFBSSxDQUFBO0FBQ0ws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