/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var StringEOL;
(function (StringEOL) {
    StringEOL[StringEOL["Unknown"] = 0] = "Unknown";
    StringEOL[StringEOL["Invalid"] = 3] = "Invalid";
    StringEOL[StringEOL["LF"] = 1] = "LF";
    StringEOL[StringEOL["CRLF"] = 2] = "CRLF";
})(StringEOL || (StringEOL = {}));
export function countEOL(text) {
    let eolCount = 0;
    let firstLineLength = 0;
    let lastLineStart = 0;
    let eol = 0 /* StringEOL.Unknown */;
    for (let i = 0, len = text.length; i < len; i++) {
        const chr = text.charCodeAt(i);
        if (chr === 13 /* CharCode.CarriageReturn */) {
            if (eolCount === 0) {
                firstLineLength = i;
            }
            eolCount++;
            if (i + 1 < len && text.charCodeAt(i + 1) === 10 /* CharCode.LineFeed */) {
                // \r\n... case
                eol |= 2 /* StringEOL.CRLF */;
                i++; // skip \n
            }
            else {
                // \r... case
                eol |= 3 /* StringEOL.Invalid */;
            }
            lastLineStart = i + 1;
        }
        else if (chr === 10 /* CharCode.LineFeed */) {
            // \n... case
            eol |= 1 /* StringEOL.LF */;
            if (eolCount === 0) {
                firstLineLength = i;
            }
            eolCount++;
            lastLineStart = i + 1;
        }
    }
    if (eolCount === 0) {
        firstLineLength = text.length;
    }
    return [eolCount, firstLineLength, text.length - lastLineStart, eol];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW9sQ291bnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9lb2xDb3VudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sQ0FBTixJQUFrQixTQUtqQjtBQUxELFdBQWtCLFNBQVM7SUFDMUIsK0NBQVcsQ0FBQTtJQUNYLCtDQUFXLENBQUE7SUFDWCxxQ0FBTSxDQUFBO0lBQ04seUNBQVEsQ0FBQTtBQUNULENBQUMsRUFMaUIsU0FBUyxLQUFULFNBQVMsUUFLMUI7QUFFRCxNQUFNLFVBQVUsUUFBUSxDQUFDLElBQVk7SUFDcEMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQztJQUN4QixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7SUFDdEIsSUFBSSxHQUFHLDRCQUErQixDQUFDO0lBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNqRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9CLElBQUksR0FBRyxxQ0FBNEIsRUFBRSxDQUFDO1lBQ3JDLElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwQixlQUFlLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLENBQUM7WUFDRCxRQUFRLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLCtCQUFzQixFQUFFLENBQUM7Z0JBQ2pFLGVBQWU7Z0JBQ2YsR0FBRywwQkFBa0IsQ0FBQztnQkFDdEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVO1lBQ2hCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxhQUFhO2dCQUNiLEdBQUcsNkJBQXFCLENBQUM7WUFDMUIsQ0FBQztZQUNELGFBQWEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7YUFBTSxJQUFJLEdBQUcsK0JBQXNCLEVBQUUsQ0FBQztZQUN0QyxhQUFhO1lBQ2IsR0FBRyx3QkFBZ0IsQ0FBQztZQUNwQixJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDcEIsZUFBZSxHQUFHLENBQUMsQ0FBQztZQUNyQixDQUFDO1lBQ0QsUUFBUSxFQUFFLENBQUM7WUFDWCxhQUFhLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUNELElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3BCLGVBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQy9CLENBQUM7SUFDRCxPQUFPLENBQUMsUUFBUSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN0RSxDQUFDIn0=