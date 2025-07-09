/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LineSequence {
    constructor(trimmedHash, lines) {
        this.trimmedHash = trimmedHash;
        this.lines = lines;
    }
    getElement(offset) {
        return this.trimmedHash[offset];
    }
    get length() {
        return this.trimmedHash.length;
    }
    getBoundaryScore(length) {
        const indentationBefore = length === 0 ? 0 : getIndentation(this.lines[length - 1]);
        const indentationAfter = length === this.lines.length ? 0 : getIndentation(this.lines[length]);
        return 1000 - (indentationBefore + indentationAfter);
    }
    getText(range) {
        return this.lines.slice(range.start, range.endExclusive).join('\n');
    }
    isStronglyEqual(offset1, offset2) {
        return this.lines[offset1] === this.lines[offset2];
    }
}
function getIndentation(str) {
    let i = 0;
    while (i < str.length && (str.charCodeAt(i) === 32 /* CharCode.Space */ || str.charCodeAt(i) === 9 /* CharCode.Tab */)) {
        i++;
    }
    return i;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVNlcXVlbmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9kZWZhdWx0TGluZXNEaWZmQ29tcHV0ZXIvbGluZVNlcXVlbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyxZQUFZO0lBQ3hCLFlBQ2tCLFdBQXFCLEVBQ3JCLEtBQWU7UUFEZixnQkFBVyxHQUFYLFdBQVcsQ0FBVTtRQUNyQixVQUFLLEdBQUwsS0FBSyxDQUFVO0lBQzdCLENBQUM7SUFFTCxVQUFVLENBQUMsTUFBYztRQUN4QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7SUFDaEMsQ0FBQztJQUVELGdCQUFnQixDQUFDLE1BQWM7UUFDOUIsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDL0YsT0FBTyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCxPQUFPLENBQUMsS0FBa0I7UUFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELGVBQWUsQ0FBQyxPQUFlLEVBQUUsT0FBZTtRQUMvQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwRCxDQUFDO0NBQ0Q7QUFFRCxTQUFTLGNBQWMsQ0FBQyxHQUFXO0lBQ2xDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyw0QkFBbUIsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyx5QkFBaUIsQ0FBQyxFQUFFLENBQUM7UUFDdkcsQ0FBQyxFQUFFLENBQUM7SUFDTCxDQUFDO0lBQ0QsT0FBTyxDQUFDLENBQUM7QUFDVixDQUFDIn0=