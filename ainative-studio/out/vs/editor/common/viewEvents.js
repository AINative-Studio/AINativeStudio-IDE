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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0V2ZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdFdmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFXaEcsTUFBTSxDQUFOLElBQWtCLGFBbUJqQjtBQW5CRCxXQUFrQixhQUFhO0lBQzlCLGlGQUFvQixDQUFBO0lBQ3BCLDZFQUFrQixDQUFBO0lBQ2xCLHlGQUF3QixDQUFBO0lBQ3hCLHFGQUFzQixDQUFBO0lBQ3RCLHFGQUFzQixDQUFBO0lBQ3RCLCtEQUFXLENBQUE7SUFDWCx5RUFBZ0IsQ0FBQTtJQUNoQix5R0FBZ0MsQ0FBQTtJQUNoQyxxRkFBc0IsQ0FBQTtJQUN0Qix5RUFBZ0IsQ0FBQTtJQUNoQiwwRUFBZ0IsQ0FBQTtJQUNoQiw0RUFBaUIsQ0FBQTtJQUNqQixzRkFBc0IsQ0FBQTtJQUN0Qiw0RUFBaUIsQ0FBQTtJQUNqQiwwRUFBZ0IsQ0FBQTtJQUNoQiw0RUFBaUIsQ0FBQTtJQUNqQix3RkFBdUIsQ0FBQTtJQUN2QiwwRUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBbkJpQixhQUFhLEtBQWIsYUFBYSxRQW1COUI7QUFFRCxNQUFNLE9BQU8seUJBQXlCO0lBRXJDO1FBRGdCLFNBQUksOENBQXNDO0lBQzFDLENBQUM7Q0FDakI7QUFFRCxNQUFNLE9BQU8sdUJBQXVCO0lBRW5DO1FBRGdCLFNBQUksNENBQW9DO0lBQ3hDLENBQUM7Q0FDakI7QUFFRCxNQUFNLE9BQU8sNkJBQTZCO0lBTXpDLFlBQVksTUFBaUM7UUFKN0IsU0FBSSxrREFBMEM7UUFLN0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJQUVNLFVBQVUsQ0FBQyxFQUFnQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVB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