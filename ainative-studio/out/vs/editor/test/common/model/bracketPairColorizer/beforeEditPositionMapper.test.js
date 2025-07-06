/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { splitLines } from '../../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { BeforeEditPositionMapper, TextEditInfo } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/beforeEditPositionMapper.js';
import { lengthOfString, lengthToObj, lengthToPosition, toLength } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/length.js';
suite('Bracket Pair Colorizer - BeforeEditPositionMapper', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Single-Line 1', () => {
        assert.deepStrictEqual(compute([
            '0123456789',
        ], [
            new TextEdit(toLength(0, 4), toLength(0, 7), 'xy')
        ]), [
            '0  1  2  3  x  y  7  8  9  ', // The line
            '0  0  0  0  0  0  0  0  0  0  ', // the old line numbers
            '0  1  2  3  4  5  7  8  9  10 ', // the old columns
            '0  0  0  0  0  0  ∞  ∞  ∞  ∞  ', // line count until next change
            '4  3  2  1  0  0  ∞  ∞  ∞  ∞  ', // column count until next change
        ]);
    });
    test('Single-Line 2', () => {
        assert.deepStrictEqual(compute([
            '0123456789',
        ], [
            new TextEdit(toLength(0, 2), toLength(0, 4), 'xxxx'),
            new TextEdit(toLength(0, 6), toLength(0, 6), 'yy')
        ]), [
            '0  1  x  x  x  x  4  5  y  y  6  7  8  9  ',
            '0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  ',
            '0  1  2  3  4  5  4  5  6  7  6  7  8  9  10 ',
            '0  0  0  0  0  0  0  0  0  0  ∞  ∞  ∞  ∞  ∞  ',
            '2  1  0  0  0  0  2  1  0  0  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace 1', () => {
        assert.deepStrictEqual(compute([
            '₀₁₂₃₄₅₆₇₈₉',
            '0123456789',
            '⁰¹²³⁴⁵⁶⁷⁸⁹',
        ], [
            new TextEdit(toLength(0, 3), toLength(1, 3), 'xy'),
        ]), [
            '₀  ₁  ₂  x  y  3  4  5  6  7  8  9  ',
            '0  0  0  0  0  1  1  1  1  1  1  1  1  ',
            '0  1  2  3  4  3  4  5  6  7  8  9  10 ',
            "0  0  0  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ",
            '3  2  1  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            // ------------------
            '⁰  ¹  ²  ³  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '2  2  2  2  2  2  2  2  2  2  2  ',
            '0  1  2  3  4  5  6  7  8  9  10 ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace 2', () => {
        assert.deepStrictEqual(compute([
            '₀₁₂₃₄₅₆₇₈₉',
            '012345678',
            '⁰¹²³⁴⁵⁶⁷⁸⁹',
        ], [
            new TextEdit(toLength(0, 3), toLength(1, 0), 'ab'),
            new TextEdit(toLength(1, 5), toLength(1, 7), 'c'),
        ]), [
            '₀  ₁  ₂  a  b  0  1  2  3  4  c  7  8  ',
            '0  0  0  0  0  1  1  1  1  1  1  1  1  1  ',
            '0  1  2  3  4  0  1  2  3  4  5  7  8  9  ',
            '0  0  0  0  0  0  0  0  0  0  0  ∞  ∞  ∞  ',
            '3  2  1  0  0  5  4  3  2  1  0  ∞  ∞  ∞  ',
            // ------------------
            '⁰  ¹  ²  ³  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '2  2  2  2  2  2  2  2  2  2  2  ',
            '0  1  2  3  4  5  6  7  8  9  10 ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace 3', () => {
        assert.deepStrictEqual(compute([
            '₀₁₂₃₄₅₆₇₈₉',
            '012345678',
            '⁰¹²³⁴⁵⁶⁷⁸⁹',
        ], [
            new TextEdit(toLength(0, 3), toLength(1, 0), 'ab'),
            new TextEdit(toLength(1, 5), toLength(1, 7), 'c'),
            new TextEdit(toLength(1, 8), toLength(2, 4), 'd'),
        ]), [
            '₀  ₁  ₂  a  b  0  1  2  3  4  c  7  d  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '0  0  0  0  0  1  1  1  1  1  1  1  1  2  2  2  2  2  2  2  ',
            '0  1  2  3  4  0  1  2  3  4  5  7  8  4  5  6  7  8  9  10 ',
            '0  0  0  0  0  0  0  0  0  0  0  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '3  2  1  0  0  5  4  3  2  1  0  1  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Insert 1', () => {
        assert.deepStrictEqual(compute([
            '012345678',
        ], [
            new TextEdit(toLength(0, 3), toLength(0, 5), 'a\nb'),
        ]), [
            '0  1  2  a  ',
            '0  0  0  0  0  ',
            '0  1  2  3  4  ',
            '0  0  0  0  0  ',
            '3  2  1  0  0  ',
            // ------------------
            'b  5  6  7  8  ',
            '1  0  0  0  0  0  ',
            '0  5  6  7  8  9  ',
            '0  ∞  ∞  ∞  ∞  ∞  ',
            '0  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Insert 2', () => {
        assert.deepStrictEqual(compute([
            '012345678',
        ], [
            new TextEdit(toLength(0, 3), toLength(0, 5), 'a\nb'),
            new TextEdit(toLength(0, 7), toLength(0, 8), 'x\ny'),
        ]), [
            '0  1  2  a  ',
            '0  0  0  0  0  ',
            '0  1  2  3  4  ',
            '0  0  0  0  0  ',
            '3  2  1  0  0  ',
            // ------------------
            'b  5  6  x  ',
            '1  0  0  0  0  ',
            '0  5  6  7  8  ',
            '0  0  0  0  0  ',
            '0  2  1  0  0  ',
            // ------------------
            'y  8  ',
            '1  0  0  ',
            '0  8  9  ',
            '0  ∞  ∞  ',
            '0  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace/Insert 1', () => {
        assert.deepStrictEqual(compute([
            '₀₁₂₃₄₅₆₇₈₉',
            '012345678',
            '⁰¹²³⁴⁵⁶⁷⁸⁹',
        ], [
            new TextEdit(toLength(0, 3), toLength(1, 1), 'aaa\nbbb'),
        ]), [
            '₀  ₁  ₂  a  a  a  ',
            '0  0  0  0  0  0  0  ',
            '0  1  2  3  4  5  6  ',
            '0  0  0  0  0  0  0  ',
            '3  2  1  0  0  0  0  ',
            // ------------------
            'b  b  b  1  2  3  4  5  6  7  8  ',
            '1  1  1  1  1  1  1  1  1  1  1  1  ',
            '0  1  2  1  2  3  4  5  6  7  8  9  ',
            '0  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '0  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            // ------------------
            '⁰  ¹  ²  ³  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '2  2  2  2  2  2  2  2  2  2  2  ',
            '0  1  2  3  4  5  6  7  8  9  10 ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace/Insert 2', () => {
        assert.deepStrictEqual(compute([
            '₀₁₂₃₄₅₆₇₈₉',
            '012345678',
            '⁰¹²³⁴⁵⁶⁷⁸⁹',
        ], [
            new TextEdit(toLength(0, 3), toLength(1, 1), 'aaa\nbbb'),
            new TextEdit(toLength(1, 5), toLength(1, 5), 'x\ny'),
            new TextEdit(toLength(1, 7), toLength(2, 4), 'k\nl'),
        ]), [
            '₀  ₁  ₂  a  a  a  ',
            '0  0  0  0  0  0  0  ',
            '0  1  2  3  4  5  6  ',
            '0  0  0  0  0  0  0  ',
            '3  2  1  0  0  0  0  ',
            // ------------------
            'b  b  b  1  2  3  4  x  ',
            '1  1  1  1  1  1  1  1  1  ',
            '0  1  2  1  2  3  4  5  6  ',
            '0  0  0  0  0  0  0  0  0  ',
            '0  0  0  4  3  2  1  0  0  ',
            // ------------------
            'y  5  6  k  ',
            '2  1  1  1  1  ',
            '0  5  6  7  8  ',
            '0  0  0  0  0  ',
            '0  2  1  0  0  ',
            // ------------------
            'l  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '2  2  2  2  2  2  2  2  ',
            '0  4  5  6  7  8  9  10 ',
            '0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
});
/** @pure */
function compute(inputArr, edits) {
    const newLines = splitLines(applyLineColumnEdits(inputArr.join('\n'), edits.map(e => ({
        text: e.newText,
        range: Range.fromPositions(lengthToPosition(e.startOffset), lengthToPosition(e.endOffset))
    }))));
    const mapper = new BeforeEditPositionMapper(edits);
    const result = new Array();
    let lineIdx = 0;
    for (const line of newLines) {
        let lineLine = '';
        let colLine = '';
        let lineStr = '';
        let colDist = '';
        let lineDist = '';
        for (let colIdx = 0; colIdx <= line.length; colIdx++) {
            const before = mapper.getOffsetBeforeChange(toLength(lineIdx, colIdx));
            const beforeObj = lengthToObj(before);
            if (colIdx < line.length) {
                lineStr += rightPad(line[colIdx], 3);
            }
            lineLine += rightPad('' + beforeObj.lineCount, 3);
            colLine += rightPad('' + beforeObj.columnCount, 3);
            const distLen = mapper.getDistanceToNextChange(toLength(lineIdx, colIdx));
            if (distLen === null) {
                lineDist += '∞  ';
                colDist += '∞  ';
            }
            else {
                const dist = lengthToObj(distLen);
                lineDist += rightPad('' + dist.lineCount, 3);
                colDist += rightPad('' + dist.columnCount, 3);
            }
        }
        result.push(lineStr);
        result.push(lineLine);
        result.push(colLine);
        result.push(lineDist);
        result.push(colDist);
        lineIdx++;
    }
    return result;
}
export class TextEdit extends TextEditInfo {
    constructor(startOffset, endOffset, newText) {
        super(startOffset, endOffset, lengthOfString(newText));
        this.newText = newText;
    }
}
class PositionOffsetTransformer {
    constructor(text) {
        this.lineStartOffsetByLineIdx = [];
        this.lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < text.length; i++) {
            if (text.charAt(i) === '\n') {
                this.lineStartOffsetByLineIdx.push(i + 1);
            }
        }
    }
    getOffset(position) {
        return this.lineStartOffsetByLineIdx[position.lineNumber - 1] + position.column - 1;
    }
}
function applyLineColumnEdits(text, edits) {
    const transformer = new PositionOffsetTransformer(text);
    const offsetEdits = edits.map(e => {
        const range = Range.lift(e.range);
        return ({
            startOffset: transformer.getOffset(range.getStartPosition()),
            endOffset: transformer.getOffset(range.getEndPosition()),
            text: e.text
        });
    });
    offsetEdits.sort((a, b) => b.startOffset - a.startOffset);
    for (const edit of offsetEdits) {
        text = text.substring(0, edit.startOffset) + edit.text + text.substring(edit.endOffset);
    }
    return text;
}
function rightPad(str, len) {
    while (str.length < len) {
        str += ' ';
    }
    return str;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9icmFja2V0UGFpckNvbG9yaXplci9iZWZvcmVFZGl0UG9zaXRpb25NYXBwZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE1BQU0saUdBQWlHLENBQUM7QUFDekosT0FBTyxFQUFVLGNBQWMsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFFaEssS0FBSyxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtJQUUvRCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE9BQU8sQ0FDTjtZQUNDLFlBQVk7U0FDWixFQUNEO1lBQ0MsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztTQUNsRCxDQUNELEVBQ0Q7WUFDQyw2QkFBNkIsRUFBRSxXQUFXO1lBRTFDLGdDQUFnQyxFQUFFLHVCQUF1QjtZQUN6RCxnQ0FBZ0MsRUFBRSxr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