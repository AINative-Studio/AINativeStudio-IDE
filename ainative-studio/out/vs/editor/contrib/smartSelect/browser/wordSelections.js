/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLowerAsciiLetter, isUpperAsciiLetter } from '../../../../base/common/strings.js';
import { Range } from '../../../common/core/range.js';
export class WordSelectionRangeProvider {
    constructor(selectSubwords = true) {
        this.selectSubwords = selectSubwords;
    }
    provideSelectionRanges(model, positions) {
        const result = [];
        for (const position of positions) {
            const bucket = [];
            result.push(bucket);
            if (this.selectSubwords) {
                this._addInWordRanges(bucket, model, position);
            }
            this._addWordRanges(bucket, model, position);
            this._addWhitespaceLine(bucket, model, position);
            bucket.push({ range: model.getFullModelRange() });
        }
        return result;
    }
    _addInWordRanges(bucket, model, pos) {
        const obj = model.getWordAtPosition(pos);
        if (!obj) {
            return;
        }
        const { word, startColumn } = obj;
        const offset = pos.column - startColumn;
        let start = offset;
        let end = offset;
        let lastCh = 0;
        // LEFT anchor (start)
        for (; start >= 0; start--) {
            const ch = word.charCodeAt(start);
            if ((start !== offset) && (ch === 95 /* CharCode.Underline */ || ch === 45 /* CharCode.Dash */)) {
                // foo-bar OR foo_bar
                break;
            }
            else if (isLowerAsciiLetter(ch) && isUpperAsciiLetter(lastCh)) {
                // fooBar
                break;
            }
            lastCh = ch;
        }
        start += 1;
        // RIGHT anchor (end)
        for (; end < word.length; end++) {
            const ch = word.charCodeAt(end);
            if (isUpperAsciiLetter(ch) && isLowerAsciiLetter(lastCh)) {
                // fooBar
                break;
            }
            else if (ch === 95 /* CharCode.Underline */ || ch === 45 /* CharCode.Dash */) {
                // foo-bar OR foo_bar
                break;
            }
            lastCh = ch;
        }
        if (start < end) {
            bucket.push({ range: new Range(pos.lineNumber, startColumn + start, pos.lineNumber, startColumn + end) });
        }
    }
    _addWordRanges(bucket, model, pos) {
        const word = model.getWordAtPosition(pos);
        if (word) {
            bucket.push({ range: new Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn) });
        }
    }
    _addWhitespaceLine(bucket, model, pos) {
        if (model.getLineLength(pos.lineNumber) > 0
            && model.getLineFirstNonWhitespaceColumn(pos.lineNumber) === 0
            && model.getLineLastNonWhitespaceColumn(pos.lineNumber) === 0) {
            bucket.push({ range: new Range(pos.lineNumber, 1, pos.lineNumber, model.getLineMaxColumn(pos.lineNumber)) });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZFNlbGVjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc21hcnRTZWxlY3QvYnJvd3Nlci93b3JkU2VsZWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFJdEQsTUFBTSxPQUFPLDBCQUEwQjtJQUV0QyxZQUE2QixpQkFBaUIsSUFBSTtRQUFyQixtQkFBYyxHQUFkLGNBQWMsQ0FBTztJQUFJLENBQUM7SUFFdkQsc0JBQXNCLENBQUMsS0FBaUIsRUFBRSxTQUFxQjtRQUM5RCxNQUFNLE1BQU0sR0FBdUIsRUFBRSxDQUFDO1FBQ3RDLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEMsTUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQztZQUNwQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BCLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNoRCxDQUFDO1lBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxD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