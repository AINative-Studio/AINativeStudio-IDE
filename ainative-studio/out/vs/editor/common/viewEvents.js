/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ViewEventType;
(function (ViewEventType) {
    ViewEventType[ViewEventType["ViewCompositionStart"] = 0] = "ViewCompositionStart";
    ViewEventType[ViewEventType["ViewCompositionEnd"] = 1] = "ViewCompositionEnd";
    ViewEventType[ViewEventType["ViewConfigurationChanged"] = 2] = "ViewConfigurationChanged";
    ViewEventType[ViewEventType["ViewCursorStateChanged"] = 3] = "ViewCursorStateChanged";
    ViewEventType[ViewEventType["ViewDecorationsChanged"] = 4] = "ViewDecorationsChanged";
    ViewEventType[ViewEventType["ViewFlushed"] = 5] = "ViewFlushed";
    ViewEventType[ViewEventType["ViewFocusChanged"] = 6] = "ViewFocusChanged";
    ViewEventType[ViewEventType["ViewLanguageConfigurationChanged"] = 7] = "ViewLanguageConfigurationChanged";
    ViewEventType[ViewEventType["ViewLineMappingChanged"] = 8] = "ViewLineMappingChanged";
    ViewEventType[ViewEventType["ViewLinesChanged"] = 9] = "ViewLinesChanged";
    ViewEventType[ViewEventType["ViewLinesDeleted"] = 10] = "ViewLinesDeleted";
    ViewEventType[ViewEventType["ViewLinesInserted"] = 11] = "ViewLinesInserted";
    ViewEventType[ViewEventType["ViewRevealRangeRequest"] = 12] = "ViewRevealRangeRequest";
    ViewEventType[ViewEventType["ViewScrollChanged"] = 13] = "ViewScrollChanged";
    ViewEventType[ViewEventType["ViewThemeChanged"] = 14] = "ViewThemeChanged";
    ViewEventType[ViewEventType["ViewTokensChanged"] = 15] = "ViewTokensChanged";
    ViewEventType[ViewEventType["ViewTokensColorsChanged"] = 16] = "ViewTokensColorsChanged";
    ViewEventType[ViewEventType["ViewZonesChanged"] = 17] = "ViewZonesChanged";
})(ViewEventType || (ViewEventType = {}));
export class ViewCompositionStartEvent {
    constructor() {
        this.type = 0 /* ViewEventType.ViewCompositionStart */;
    }
}
export class ViewCompositionEndEvent {
    constructor() {
        this.type = 1 /* ViewEventType.ViewCompositionEnd */;
    }
}
export class ViewConfigurationChangedEvent {
    constructor(source) {
        this.type = 2 /* ViewEventType.ViewConfigurationChanged */;
        this._source = source;
    }
    hasChanged(id) {
        return this._source.hasChanged(id);
    }
}
export class ViewCursorStateChangedEvent {
    constructor(selections, modelSelections, reason) {
        this.selections = selections;
        this.modelSelections = modelSelections;
        this.reason = reason;
        this.type = 3 /* ViewEventType.ViewCursorStateChanged */;
    }
}
export class ViewDecorationsChangedEvent {
    constructor(source) {
        this.type = 4 /* ViewEventType.ViewDecorationsChanged */;
        if (source) {
            this.affectsMinimap = source.affectsMinimap;
            this.affectsOverviewRuler = source.affectsOverviewRuler;
            this.affectsGlyphMargin = source.affectsGlyphMargin;
            this.affectsLineNumber = source.affectsLineNumber;
        }
        else {
            this.affectsMinimap = true;
            this.affectsOverviewRuler = true;
            this.affectsGlyphMargin = true;
            this.affectsLineNumber = true;
        }
    }
}
export class ViewFlushedEvent {
    constructor() {
        this.type = 5 /* ViewEventType.ViewFlushed */;
        // Nothing to do
    }
}
export class ViewFocusChangedEvent {
    constructor(isFocused) {
        this.type = 6 /* ViewEventType.ViewFocusChanged */;
        this.isFocused = isFocused;
    }
}
export class ViewLanguageConfigurationEvent {
    constructor() {
        this.type = 7 /* ViewEventType.ViewLanguageConfigurationChanged */;
    }
}
export class ViewLineMappingChangedEvent {
    constructor() {
        this.type = 8 /* ViewEventType.ViewLineMappingChanged */;
        // Nothing to do
    }
}
export class ViewLinesChangedEvent {
    constructor(
    /**
     * The first line that has changed.
     */
    fromLineNumber, 
    /**
     * The number of lines that have changed.
     */
    count) {
        this.fromLineNumber = fromLineNumber;
        this.count = count;
        this.type = 9 /* ViewEventType.ViewLinesChanged */;
    }
}
export class ViewLinesDeletedEvent {
    constructor(fromLineNumber, toLineNumber) {
        this.type = 10 /* ViewEventType.ViewLinesDeleted */;
        this.fromLineNumber = fromLineNumber;
        this.toLineNumber = toLineNumber;
    }
}
export class ViewLinesInsertedEvent {
    constructor(fromLineNumber, toLineNumber) {
        this.type = 11 /* ViewEventType.ViewLinesInserted */;
        this.fromLineNumber = fromLineNumber;
        this.toLineNumber = toLineNumber;
    }
}
export var VerticalRevealType;
(function (VerticalRevealType) {
    VerticalRevealType[VerticalRevealType["Simple"] = 0] = "Simple";
    VerticalRevealType[VerticalRevealType["Center"] = 1] = "Center";
    VerticalRevealType[VerticalRevealType["CenterIfOutsideViewport"] = 2] = "CenterIfOutsideViewport";
    VerticalRevealType[VerticalRevealType["Top"] = 3] = "Top";
    VerticalRevealType[VerticalRevealType["Bottom"] = 4] = "Bottom";
    VerticalRevealType[VerticalRevealType["NearTop"] = 5] = "NearTop";
    VerticalRevealType[VerticalRevealType["NearTopIfOutsideViewport"] = 6] = "NearTopIfOutsideViewport";
})(VerticalRevealType || (VerticalRevealType = {}));
export class ViewRevealRangeRequestEvent {
    constructor(
    /**
     * Source of the call that caused the event.
     */
    source, 
    /**
     * Reduce the revealing to a minimum (e.g. avoid scrolling if the bounding box is visible and near the viewport edge).
     */
    minimalReveal, 
    /**
     * Range to be reavealed.
     */
    range, 
    /**
     * Selections to be revealed.
     */
    selections, 
    /**
     * The vertical reveal strategy.
     */
    verticalType, 
    /**
     * If true: there should be a horizontal & vertical revealing.
     * If false: there should be just a vertical revealing.
     */
    revealHorizontal, 
    /**
     * The scroll type.
     */
    scrollType) {
        this.source = source;
        this.minimalReveal = minimalReveal;
        this.range = range;
        this.selections = selections;
        this.verticalType = verticalType;
        this.revealHorizontal = revealHorizontal;
        this.scrollType = scrollType;
        this.type = 12 /* ViewEventType.ViewRevealRangeRequest */;
    }
}
export class ViewScrollChangedEvent {
    constructor(source) {
        this.type = 13 /* ViewEventType.ViewScrollChanged */;
        this.scrollWidth = source.scrollWidth;
        this.scrollLeft = source.scrollLeft;
        this.scrollHeight = source.scrollHeight;
        this.scrollTop = source.scrollTop;
        this.scrollWidthChanged = source.scrollWidthChanged;
        this.scrollLeftChanged = source.scrollLeftChanged;
        this.scrollHeightChanged = source.scrollHeightChanged;
        this.scrollTopChanged = source.scrollTopChanged;
    }
}
export class ViewThemeChangedEvent {
    constructor(theme) {
        this.theme = theme;
        this.type = 14 /* ViewEventType.ViewThemeChanged */;
    }
}
export class ViewTokensChangedEvent {
    constructor(ranges) {
        this.type = 15 /* ViewEventType.ViewTokensChanged */;
        this.ranges = ranges;
    }
}
export class ViewTokensColorsChangedEvent {
    constructor() {
        this.type = 16 /* ViewEventType.ViewTokensColorsChanged */;
        // Nothing to do
    }
}
export class ViewZonesChangedEvent {
    constructor() {
        this.type = 17 /* ViewEventType.ViewZonesChanged */;
        // Nothing to do
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0V2ZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3RXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLE1BQU0sQ0FBTixJQUFrQixhQW1CakI7QUFuQkQsV0FBa0IsYUFBYTtJQUM5QixpRkFBb0IsQ0FBQTtJQUNwQiw2RUFBa0IsQ0FBQTtJQUNsQix5RkFBd0IsQ0FBQTtJQUN4QixxRkFBc0IsQ0FBQTtJQUN0QixxRkFBc0IsQ0FBQTtJQUN0QiwrREFBVyxDQUFBO0lBQ1gseUVBQWdCLENBQUE7SUFDaEIseUdBQWdDLENBQUE7SUFDaEMscUZBQXNCLENBQUE7SUFDdEIseUVBQWdCLENBQUE7SUFDaEIsMEVBQWdCLENBQUE7SUFDaEIsNEVBQWlCLENBQUE7SUFDakIsc0ZBQXNCLENBQUE7SUFDdEIsNEVBQWlCLENBQUE7SUFDakIsMEVBQWdCLENBQUE7SUFDaEIsNEVBQWlCLENBQUE7SUFDakIsd0ZBQXVCLENBQUE7SUFDdkIsMEVBQWdCLENBQUE7QUFDakIsQ0FBQyxFQW5CaUIsYUFBYSxLQUFiLGFBQWEsUUFtQjlCO0FBRUQsTUFBTSxPQUFPLHlCQUF5QjtJQUVyQztRQURnQixTQUFJLDhDQUFzQztJQUMxQyxDQUFDO0NBQ2pCO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUVuQztRQURnQixTQUFJLDRDQUFvQztJQUN4QyxDQUFDO0NBQ2pCO0FBRUQsTUFBTSxPQUFPLDZCQUE2QjtJQU16QyxZQUFZLE1BQWlDO1FBSjdCLFNBQUksa0RBQTBDO1FBSzdELElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxVQUFVLENBQUMsRUFBZ0I7UUFDakMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FB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