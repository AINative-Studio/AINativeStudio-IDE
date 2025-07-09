/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
    isBefore(other) { return false; }
    isBeforeOrEqual(other) { return false; }
    isAfter(other) { return false; }
    isAfterOrEqual(other) { return false; }
    isEqual(other) { return false; }
    compareTo(other) { return 0; }
    translate(_, _2) { return new Position(0, 0); }
    with(_) { return new Position(0, 0); }
}
export class Range {
    constructor(startLine, startCol, endLine, endCol) {
        this.isEmpty = false;
        this.isSingleLine = false;
        this.start = new Position(startLine, startCol);
        this.end = new Position(endLine, endCol);
    }
    contains(positionOrRange) { return false; }
    isEqual(other) { return false; }
    intersection(range) { return undefined; }
    union(other) { return new Range(0, 0, 0, 0); }
    with(_) { return new Range(0, 0, 0, 0); }
}
/**
 * The main match information for a {@link TextSearchResult2}.
 */
export class TextSearchMatch2 {
    /**
     * @param uri The uri for the matching document.
     * @param ranges The ranges associated with this match.
     * @param previewText The text that is used to preview the match. The highlighted range in `previewText` is specified in `ranges`.
     */
    constructor(uri, ranges, previewText) {
        this.uri = uri;
        this.ranges = ranges;
        this.previewText = previewText;
    }
}
/**
 * The potential context information for a {@link TextSearchResult2}.
 */
export class TextSearchContext2 {
    /**
     * @param uri The uri for the matching document.
     * @param text The line of context text.
     * @param lineNumber The line number of this line of context.
     */
    constructor(uri, text, lineNumber) {
        this.uri = uri;
        this.text = text;
        this.lineNumber = lineNumber;
    }
}
/**
 * Options for following search.exclude and files.exclude settings.
 */
export var ExcludeSettingOptions;
(function (ExcludeSettingOptions) {
    /*
     * Don't use any exclude settings.
     */
    ExcludeSettingOptions[ExcludeSettingOptions["None"] = 1] = "None";
    /*
     * Use:
     * - files.exclude setting
     */
    ExcludeSettingOptions[ExcludeSettingOptions["FilesExclude"] = 2] = "FilesExclude";
    /*
     * Use:
     * - files.exclude setting
     * - search.exclude setting
     */
    ExcludeSettingOptions[ExcludeSettingOptions["SearchAndFilesExclude"] = 3] = "SearchAndFilesExclude";
})(ExcludeSettingOptions || (ExcludeSettingOptions = {}));
export var TextSearchCompleteMessageType;
(function (TextSearchCompleteMessageType) {
    TextSearchCompleteMessageType[TextSearchCompleteMessageType["Information"] = 1] = "Information";
    TextSearchCompleteMessageType[TextSearchCompleteMessageType["Warning"] = 2] = "Warning";
})(TextSearchCompleteMessageType || (TextSearchCompleteMessageType = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vc2VhcmNoRXh0VHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxPQUFPLFFBQVE7SUFDcEIsWUFBcUIsSUFBWSxFQUFXLFNBQWlCO1FBQXhDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxjQUFTLEdBQVQsU0FBUyxDQUFRO0lBQUksQ0FBQztJQUVsRSxRQUFRLENBQUMsS0FBZSxJQUFhLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNwRCxlQUFlLENBQUMsS0FBZSxJQUFhLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMzRCxPQUFPLENBQUMsS0FBZSxJQUFhLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNuRCxjQUFjLENBQUMsS0FBZSxJQUFhLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMxRCxPQUFPLENBQUMsS0FBZSxJQUFhLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNuRCxTQUFTLENBQUMsS0FBZSxJQUFZLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUdoRCxTQUFTLENBQUMsQ0FBTyxFQUFFLEVBQVEsSUFBYyxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHckUsSUFBSSxDQUFDLENBQU0sSUFBYyxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDckQ7QUFFRCxNQUFNLE9BQU8sS0FBSztJQUlqQixZQUFZLFNBQWlCLEVBQUUsUUFBZ0IsRUFBRSxPQUFlLEVBQUUsTUFBYztRQUtoRixZQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ2hCLGlCQUFZLEdBQUcsS0FBSyxDQUFDO1FBTHBCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFJRCxRQUFRLENBQUMsZUFBaUMsSUFBYSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDdEUsT0FBTyxDQUFDLEtBQVksSUFBYSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEQsWUFBWSxDQUFDLEtBQVksSUFBdUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ25FLEtBQUssQ0FBQyxLQUFZLElBQVcsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFJNUQsSUFBSSxDQUFDLENBQU0sSUFBVyxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNyRDtBQWlQRDs7R0FFRztBQUNILE1BQU0sT0FBTyxnQkFBZ0I7SUFDNUI7Ozs7T0FJRztJQUNILFlBQ1EsR0FBUSxFQUNSLE1BQXFELEVBQ3JELFdBQW1CO1FBRm5CLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUErQztRQUNyRCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtJQUFJLENBQUM7Q0FFaEM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFDOUI7Ozs7T0FJRztJQUNILFlBQ1EsR0FBUSxFQUNSLElBQVksRUFDWixVQUFrQjtRQUZsQixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLGVBQVUsR0FBVixVQUFVLENBQVE7SUFBSSxDQUFDO0NBQy9CO0FBcUtEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVkscUJBZ0JYO0FBaEJELFdBQVkscUJBQXFCO0lBQ2hDOztPQUVHO0lBQ0gsaUVBQVEsQ0FBQTtJQUNSOzs7T0FHRztJQUNILGlGQUFnQixDQUFBO0lBQ2hCOzs7O09BSUc7SUFDSCxtR0FBeUIsQ0FBQTtBQUMxQixDQUFDLEVBaEJXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFnQmhDO0FBRUQsTUFBTSxDQUFOLElBQVksNkJBR1g7QUFIRCxXQUFZLDZCQUE2QjtJQUN4QywrRkFBZSxDQUFBO0lBQ2YsdUZBQVcsQ0FBQTtBQUNaLENBQUMsRUFIVyw2QkFBNkIsS0FBN0IsNkJBQTZCLFFBR3hDIn0=