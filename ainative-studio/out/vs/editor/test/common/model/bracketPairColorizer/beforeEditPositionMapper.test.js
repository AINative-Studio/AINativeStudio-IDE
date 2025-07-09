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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyQ29sb3JpemVyL2JlZm9yZUVkaXRQb3NpdGlvbk1hcHBlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxpR0FBaUcsQ0FBQztBQUN6SixPQUFPLEVBQVUsY0FBYyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUVoSyxLQUFLLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO0lBRS9ELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxDQUFDLGVBQWUsQ0FDckIsT0FBTyxDQUNOO1lBQ0MsWUFBWTtTQUNaLEVBQ0Q7WUFDQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1NBQ2xELENBQ0QsRUFDRDtZQUNDLDZCQUE2QixFQUFFLFdBQVc7WUFFMUMsZ0NBQWdDLEVBQUUsdUJBQXVCO1lBQ3pELGdDQUFnQyxFQUFFLGtCQUFr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