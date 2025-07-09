/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LinkedList } from '../../../../base/common/linkedList.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
export class BracketSelectionRangeProvider {
    async provideSelectionRanges(model, positions) {
        const result = [];
        for (const position of positions) {
            const bucket = [];
            result.push(bucket);
            const ranges = new Map();
            await new Promise(resolve => BracketSelectionRangeProvider._bracketsRightYield(resolve, 0, model, position, ranges));
            await new Promise(resolve => BracketSelectionRangeProvider._bracketsLeftYield(resolve, 0, model, position, ranges, bucket));
        }
        return result;
    }
    static { this._maxDuration = 30; }
    static { this._maxRounds = 2; }
    static _bracketsRightYield(resolve, round, model, pos, ranges) {
        const counts = new Map();
        const t1 = Date.now();
        while (true) {
            if (round >= BracketSelectionRangeProvider._maxRounds) {
                resolve();
                break;
            }
            if (!pos) {
                resolve();
                break;
            }
            const bracket = model.bracketPairs.findNextBracket(pos);
            if (!bracket) {
                resolve();
                break;
            }
            const d = Date.now() - t1;
            if (d > BracketSelectionRangeProvider._maxDuration) {
                setTimeout(() => BracketSelectionRangeProvider._bracketsRightYield(resolve, round + 1, model, pos, ranges));
                break;
            }
            if (bracket.bracketInfo.isOpeningBracket) {
                const key = bracket.bracketInfo.bracketText;
                // wait for closing
                const val = counts.has(key) ? counts.get(key) : 0;
                counts.set(key, val + 1);
            }
            else {
                const key = bracket.bracketInfo.getOpeningBrackets()[0].bracketText;
                // process closing
                let val = counts.has(key) ? counts.get(key) : 0;
                val -= 1;
                counts.set(key, Math.max(0, val));
                if (val < 0) {
                    let list = ranges.get(key);
                    if (!list) {
                        list = new LinkedList();
                        ranges.set(key, list);
                    }
                    list.push(bracket.range);
                }
            }
            pos = bracket.range.getEndPosition();
        }
    }
    static _bracketsLeftYield(resolve, round, model, pos, ranges, bucket) {
        const counts = new Map();
        const t1 = Date.now();
        while (true) {
            if (round >= BracketSelectionRangeProvider._maxRounds && ranges.size === 0) {
                resolve();
                break;
            }
            if (!pos) {
                resolve();
                break;
            }
            const bracket = model.bracketPairs.findPrevBracket(pos);
            if (!bracket) {
                resolve();
                break;
            }
            const d = Date.now() - t1;
            if (d > BracketSelectionRangeProvider._maxDuration) {
                setTimeout(() => BracketSelectionRangeProvider._bracketsLeftYield(resolve, round + 1, model, pos, ranges, bucket));
                break;
            }
            if (!bracket.bracketInfo.isOpeningBracket) {
                const key = bracket.bracketInfo.getOpeningBrackets()[0].bracketText;
                // wait for opening
                const val = counts.has(key) ? counts.get(key) : 0;
                counts.set(key, val + 1);
            }
            else {
                const key = bracket.bracketInfo.bracketText;
                // opening
                let val = counts.has(key) ? counts.get(key) : 0;
                val -= 1;
                counts.set(key, Math.max(0, val));
                if (val < 0) {
                    const list = ranges.get(key);
                    if (list) {
                        const closing = list.shift();
                        if (list.size === 0) {
                            ranges.delete(key);
                        }
                        const innerBracket = Range.fromPositions(bracket.range.getEndPosition(), closing.getStartPosition());
                        const outerBracket = Range.fromPositions(bracket.range.getStartPosition(), closing.getEndPosition());
                        bucket.push({ range: innerBracket });
                        bucket.push({ range: outerBracket });
                        BracketSelectionRangeProvider._addBracketLeading(model, outerBracket, bucket);
                    }
                }
            }
            pos = bracket.range.getStartPosition();
        }
    }
    static _addBracketLeading(model, bracket, bucket) {
        if (bracket.startLineNumber === bracket.endLineNumber) {
            return;
        }
        // xxxxxxxx {
        //
        // }
        const startLine = bracket.startLineNumber;
        const column = model.getLineFirstNonWhitespaceColumn(startLine);
        if (column !== 0 && column !== bracket.startColumn) {
            bucket.push({ range: Range.fromPositions(new Position(startLine, column), bracket.getEndPosition()) });
            bucket.push({ range: Range.fromPositions(new Position(startLine, 1), bracket.getEndPosition()) });
        }
        // xxxxxxxx
        // {
        //
        // }
        const aboveLine = startLine - 1;
        if (aboveLine > 0) {
            const column = model.getLineFirstNonWhitespaceColumn(aboveLine);
            if (column === bracket.startColumn && column !== model.getLineLastNonWhitespaceColumn(aboveLine)) {
                bucket.push({ range: Range.fromPositions(new Position(aboveLine, column), bracket.getEndPosition()) });
                bucket.push({ range: Range.fromPositions(new Position(aboveLine, 1), bracket.getEndPosition()) });
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFNlbGVjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc21hcnRTZWxlY3QvYnJvd3Nlci9icmFja2V0U2VsZWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUl0RCxNQUFNLE9BQU8sNkJBQTZCO0lBRXpDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxLQUFpQixFQUFFLFNBQXFCO1FBQ3BFLE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUM7UUFFdEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNsQyxNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFcEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUM7WUFDcEQsTUFBTSxJQUFJLE9BQU8sQ0FBTyxPQUFPLENBQUMsRUFBRSxDQUFDLDZCQUE2QixDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzNILE1BQU0sSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkksQ0FBQztR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