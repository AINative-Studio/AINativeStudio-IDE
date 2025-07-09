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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL2VkaXRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUluRTs7O0VBR0U7QUFDRixNQUFNLE9BQU8sYUFBYTtJQUN6QixZQUNpQixLQUFnQixFQUNoQixRQUFrQjtRQURsQixVQUFLLEdBQUwsS0FBSyxDQUFXO1FBQ2hCLGFBQVEsR0FBUixRQUFRLENBQVU7SUFDL0IsQ0FBQztJQUVFLE1BQU0sQ0FBQyxLQUFvQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVNLE9BQU8sQ0FBQyxjQUFzQjtRQUNwQyxPQUFPLElBQUksU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFNBQVM7SUFDckIsWUFDaUIsS0FBWSxFQUNaLE9BQWU7UUFEZixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osWUFBTyxHQUFQLE9BQU8sQ0FBUTtJQUM1QixDQUFDO0lBRUUsTUFBTSxDQUFDLEtBQWdCO1FBQzdCLE9BQU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDckYsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFNBQVM7SUFDckIsWUFBNEIsS0FBK0I7UUFBL0IsVUFBSyxHQUFMLEtBQUssQ0FBMEI7SUFBSSxDQUFDO0lBRXpELE9BQU8sQ0FBQyxjQUFzQjtRQUNwQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDM0IsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLHNCQUFzQixJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUN0RCxPQUFPO29CQUNOLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7b0JBQy9FLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2lCQUM1QyxDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLE9BQU87b0JBQ04sS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDL0QsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztpQkFDM0IsQ0FBQztZQUNILENBQUM7WUFFRCxPQUFPO2dCQUNOLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7Z0JBQy9HLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2FBQzVDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9