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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW9sQ291bnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvZW9sQ291bnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLENBQU4sSUFBa0IsU0FLakI7QUFMRCxXQUFrQixTQUFTO0lBQzFCLCtDQUFXLENBQUE7SUFDWCwrQ0FBVyxDQUFBO0lBQ1gscUNBQU0sQ0FBQTtJQUNOLHlDQUFRLENBQUE7QUFDVCxDQUFDLEVBTGlCLFNBQVMsS0FBVCxTQUFTLFFBSzFCO0FBRUQsTUFBTSxVQUFVLFFBQVEsQ0FBQyxJQUFZO0lBQ3BDLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztJQUNqQixJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7SUFDeEIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCLElBQUksR0FBRyw0QkFBK0IsQ0FBQztJQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUvQixJQUFJLEdBQUcscUNBQTRCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDcEIsZUFBZSxHQUFHLENBQUMsQ0FBQztZQUNyQixDQUFDO1lBQ0QsUUFBUSxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQywrQkFBc0IsRUFBRSxDQUFDO2dCQUNqRSxlQUFlO2dCQUNmLEdBQUcsMEJBQWtCLENBQUM7Z0JBQ3RCLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVTtZQUNoQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsYUFBYTtnQkFDYixHQUFHLDZCQUFxQixDQUFDO1lBQzFCLENBQUM7WUFDRCxhQUFhLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixDQUFDO2FBQU0sSUFBSSxHQUFHLCtCQUFzQixFQUFFLENBQUM7WUFDdEMsYUFBYTtZQUNiLEdBQUcsd0JBQWdCLENBQUM7WUFDcEIsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BCLGVBQWUsR0FBRyxDQUFDLENBQUM7WUFDckIsQ0FBQztZQUNELFFBQVEsRUFBRSxDQUFDO1lBQ1gsYUFBYSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFDRCxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNwQixlQUFlLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUMvQixDQUFDO0lBQ0QsT0FBTyxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDdEUsQ0FBQyJ9