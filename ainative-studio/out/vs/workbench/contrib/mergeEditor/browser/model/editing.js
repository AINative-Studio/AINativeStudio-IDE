/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../../base/common/arrays.js';
import { Range } from '../../../../../editor/common/core/range.js';
/**
 * Represents an edit, expressed in whole lines:
 * At (before) {@link LineRange.startLineNumber}, delete {@link LineRange.lineCount} many lines and insert {@link newLines}.
*/
export class LineRangeEdit {
    constructor(range, newLines) {
        this.range = range;
        this.newLines = newLines;
    }
    equals(other) {
        return this.range.equals(other.range) && equals(this.newLines, other.newLines);
    }
    toEdits(modelLineCount) {
        return new LineEdits([this]).toEdits(modelLineCount);
    }
}
export class RangeEdit {
    constructor(range, newText) {
        this.range = range;
        this.newText = newText;
    }
    equals(other) {
        return Range.equalsRange(this.range, other.range) && this.newText === other.newText;
    }
}
export class LineEdits {
    constructor(edits) {
        this.edits = edits;
    }
    toEdits(modelLineCount) {
        return this.edits.map((e) => {
            if (e.range.endLineNumberExclusive <= modelLineCount) {
                return {
                    range: new Range(e.range.startLineNumber, 1, e.range.endLineNumberExclusive, 1),
                    text: e.newLines.map(s => s + '\n').join(''),
                };
            }
            if (e.range.startLineNumber === 1) {
                return {
                    range: new Range(1, 1, modelLineCount, Number.MAX_SAFE_INTEGER),
                    text: e.newLines.join('\n'),
                };
            }
            return {
                range: new Range(e.range.startLineNumber - 1, Number.MAX_SAFE_INTEGER, modelLineCount, Number.MAX_SAFE_INTEGER),
                text: e.newLines.map(s => '\n' + s).join(''),
            };
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbW9kZWwvZWRpdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBSW5FOzs7RUFHRTtBQUNGLE1BQU0sT0FBTyxhQUFhO0lBQ3pCLFlBQ2lCLEtBQWdCLEVBQ2hCLFFBQWtCO1FBRGxCLFVBQUssR0FBTCxLQUFLLENBQVc7UUFDaEIsYUFBUSxHQUFSLFFBQVEsQ0FBVTtJQUMvQixDQUFDO0lBRUUsTUFBTSxDQUFDLEtBQW9CO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRU0sT0FBTyxDQUFDLGNBQXNCO1FBQ3BDLE9BQU8sSUFBSSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUNyQixZQUNpQixLQUFZLEVBQ1osT0FBZTtRQURmLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixZQUFPLEdBQVAsT0FBTyxDQUFRO0lBQzVCLENBQUM7SUFFRSxNQUFNLENBQUMsS0FBZ0I7UUFDN0IsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQztJQUNyRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUNyQixZQUE0QixLQUErQjtRQUEvQixVQUFLLEdBQUwsS0FBSyxDQUEwQjtJQUFJLENBQUM7SUFFekQsT0FBTyxDQUFDLGNBQXNCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMzQixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3RELE9BQU87b0JBQ04sS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztvQkFDL0UsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7aUJBQzVDLENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsT0FBTztvQkFDTixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDO29CQUMvRCxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2lCQUMzQixDQUFDO1lBQ0gsQ0FBQztZQUVELE9BQU87Z0JBQ04sS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDL0csSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7YUFDNUMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIn0=