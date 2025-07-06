/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var LinePartMetadata;
(function (LinePartMetadata) {
    LinePartMetadata[LinePartMetadata["IS_WHITESPACE"] = 1] = "IS_WHITESPACE";
    LinePartMetadata[LinePartMetadata["PSEUDO_BEFORE"] = 2] = "PSEUDO_BEFORE";
    LinePartMetadata[LinePartMetadata["PSEUDO_AFTER"] = 4] = "PSEUDO_AFTER";
    LinePartMetadata[LinePartMetadata["IS_WHITESPACE_MASK"] = 1] = "IS_WHITESPACE_MASK";
    LinePartMetadata[LinePartMetadata["PSEUDO_BEFORE_MASK"] = 2] = "PSEUDO_BEFORE_MASK";
    LinePartMetadata[LinePartMetadata["PSEUDO_AFTER_MASK"] = 4] = "PSEUDO_AFTER_MASK";
})(LinePartMetadata || (LinePartMetadata = {}));
export class LinePart {
    constructor(
    /**
     * last char index of this token (not inclusive).
     */
    endIndex, type, metadata, containsRTL) {
        this.endIndex = endIndex;
        this.type = type;
        this.metadata = metadata;
        this.containsRTL = containsRTL;
        this._linePartBrand = undefined;
    }
    isWhitespace() {
        return (this.metadata & 1 /* LinePartMetadata.IS_WHITESPACE_MASK */ ? true : false);
    }
    isPseudoAfter() {
        return (this.metadata & 4 /* LinePartMetadata.PSEUDO_AFTER_MASK */ ? true : false);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld0xheW91dC9saW5lUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQU4sSUFBa0IsZ0JBUWpCO0FBUkQsV0FBa0IsZ0JBQWdCO0lBQ2pDLHlFQUFpQixDQUFBO0lBQ2pCLHlFQUFpQixDQUFBO0lBQ2pCLHVFQUFnQixDQUFBO0lBRWhCLG1GQUEwQixDQUFBO0lBQzFCLG1GQUEwQixDQUFBO0lBQzFCLGlGQUF5QixDQUFBO0FBQzFCLENBQUMsRUFSaUIsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQVFqQztBQUVELE1BQU0sT0FBTyxRQUFRO0lBR3BCO0lBQ0M7O09BRUc7SUFDYSxRQUFnQixFQUNoQixJQUFZLEVBQ1osUUFBZ0IsRUFDaEIsV0FBb0I7UUFIcEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNoQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNoQixnQkFBVyxHQUFYLFdBQVcsQ0FBUztRQVRyQyxtQkFBYyxHQUFTLFNBQVMsQ0FBQztJQVU3QixDQUFDO0lBRUUsWUFBWTtRQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsOENBQXNDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVNLGFBQWE7UUFDbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLDZDQUFxQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVFLENBQUM7Q0FDRCJ9