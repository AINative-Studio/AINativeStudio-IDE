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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TGF5b3V0L2xpbmVQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBTixJQUFrQixnQkFRakI7QUFSRCxXQUFrQixnQkFBZ0I7SUFDakMseUVBQWlCLENBQUE7SUFDakIseUVBQWlCLENBQUE7SUFDakIsdUVBQWdCLENBQUE7SUFFaEIsbUZBQTBCLENBQUE7SUFDMUIsbUZBQTBCLENBQUE7SUFDMUIsaUZBQXlCLENBQUE7QUFDMUIsQ0FBQyxFQVJpQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBUWpDO0FBRUQsTUFBTSxPQUFPLFFBQVE7SUFHcEI7SUFDQzs7T0FFRztJQUNhLFFBQWdCLEVBQ2hCLElBQVksRUFDWixRQUFnQixFQUNoQixXQUFvQjtRQUhwQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLGdCQUFXLEdBQVgsV0FBVyxDQUFTO1FBVHJDLG1CQUFjLEdBQVMsU0FBUyxDQUFDO0lBVTdCLENBQUM7SUFFRSxZQUFZO1FBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSw4Q0FBc0MsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRU0sYUFBYTtRQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsNkNBQXFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUUsQ0FBQztDQUNEIn0=