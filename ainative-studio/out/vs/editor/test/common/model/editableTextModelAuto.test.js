/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { testApplyEditsWithSyncedModels } from './editableTextModelTestUtils.js';
const GENERATE_TESTS = false;
suite('EditorModel Auto Tests', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, text) {
        return {
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            text: text.join('\n'),
            forceMoveMarkers: false
        };
    }
    test('auto1', () => {
        testApplyEditsWithSyncedModels([
            'ioe',
            '',
            'yjct',
            '',
            '',
        ], [
            editOp(1, 2, 1, 2, ['b', 'r', 'fq']),
            editOp(1, 4, 2, 1, ['', '']),
        ], [
            'ib',
            'r',
            'fqoe',
            '',
            'yjct',
            '',
            '',
        ]);
    });
    test('auto2', () => {
        testApplyEditsWithSyncedModels([
            'f',
            'littnhskrq',
            'utxvsizqnk',
            'lslqz',
            'jxn',
            'gmm',
        ], [
            editOp(1, 2, 1, 2, ['', 'o']),
            editOp(2, 4, 2, 4, ['zaq', 'avb']),
            editOp(2, 5, 6, 2, ['jlr', 'zl', 'j']),
        ], [
            'f',
            'o',
            'litzaq',
            'avbtjlr',
            'zl',
            'jmm',
        ]);
    });
    test('auto3', () => {
        testApplyEditsWithSyncedModels([
            'ofw',
            'qsxmziuvzw',
            'rp',
            'qsnymek',
            'elth',
            'wmgzbwudxz',
            'iwsdkndh',
            'bujlbwb',
            'asuouxfv',
            'xuccnb',
        ], [
            editOp(4, 3, 4, 3, ['']),
        ], [
            'ofw',
            'qsxmziuvzw',
            'rp',
            'qsnymek',
            'elth',
            'wmgzbwudxz',
            'iwsdkndh',
            'bujlbwb',
            'asuouxfv',
            'xuccnb',
        ]);
    });
    test('auto4', () => {
        testApplyEditsWithSyncedModels([
            'fefymj',
            'qum',
            'vmiwxxaiqq',
            'dz',
            'lnqdgorosf',
        ], [
            editOp(1, 3, 1, 5, ['hp']),
            editOp(1, 7, 2, 1, ['kcg', '', 'mpx']),
            editOp(2, 2, 2, 2, ['', 'aw', '']),
            editOp(2, 2, 2, 2, ['vqr', 'mo']),
            editOp(4, 2, 5, 3, ['xyc']),
        ], [
            'fehpmjkcg',
            '',
            'mpxq',
            'aw',
            'vqr',
            'moum',
            'vmiwxxaiqq',
            'dxycqdgorosf',
        ]);
    });
});
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomString(minLength, maxLength) {
    const length = getRandomInt(minLength, maxLength);
    let r = '';
    for (let i = 0; i < length; i++) {
        r += String.fromCharCode(getRandomInt(97 /* CharCode.a */, 122 /* CharCode.z */));
    }
    return r;
}
function generateFile(small) {
    const lineCount = getRandomInt(1, small ? 3 : 10);
    const lines = [];
    for (let i = 0; i < lineCount; i++) {
        lines.push(getRandomString(0, small ? 3 : 10));
    }
    return lines.join('\n');
}
function generateEdits(content) {
    const result = [];
    let cnt = getRandomInt(1, 5);
    let maxOffset = content.length;
    while (cnt > 0 && maxOffset > 0) {
        const offset = getRandomInt(0, maxOffset);
        const length = getRandomInt(0, maxOffset - offset);
        const text = generateFile(true);
        result.push({
            offset: offset,
            length: length,
            text: text
        });
        maxOffset = offset;
        cnt--;
    }
    result.reverse();
    return result;
}
class TestModel {
    static _generateOffsetToPosition(content) {
        const result = [];
        let lineNumber = 1;
        let column = 1;
        for (let offset = 0, len = content.length; offset <= len; offset++) {
            const ch = content.charAt(offset);
            result[offset] = new Position(lineNumber, column);
            if (ch === '\n') {
                lineNumber++;
                column = 1;
            }
            else {
                column++;
            }
        }
        return result;
    }
    constructor() {
        this.initialContent = generateFile(false);
        const edits = generateEdits(this.initialContent);
        const offsetToPosition = TestModel._generateOffsetToPosition(this.initialContent);
        this.edits = [];
        for (const edit of edits) {
            const startPosition = offsetToPosition[edit.offset];
            const endPosition = offsetToPosition[edit.offset + edit.length];
            this.edits.push({
                range: new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column),
                text: edit.text
            });
        }
        this.resultingContent = this.initialContent;
        for (let i = edits.length - 1; i >= 0; i--) {
            this.resultingContent = (this.resultingContent.substring(0, edits[i].offset) +
                edits[i].text +
                this.resultingContent.substring(edits[i].offset + edits[i].length));
        }
    }
    print() {
        let r = [];
        r.push('testApplyEditsWithSyncedModels(');
        r.push('\t[');
        const initialLines = this.initialContent.split('\n');
        r = r.concat(initialLines.map((i) => `\t\t'${i}',`));
        r.push('\t],');
        r.push('\t[');
        r = r.concat(this.edits.map((i) => {
            const text = `['` + i.text.split('\n').join(`', '`) + `']`;
            return `\t\teditOp(${i.range.startLineNumber}, ${i.range.startColumn}, ${i.range.endLineNumber}, ${i.range.endColumn}, ${text}),`;
        }));
        r.push('\t],');
        r.push('\t[');
        const resultLines = this.resultingContent.split('\n');
        r = r.concat(resultLines.map((i) => `\t\t'${i}',`));
        r.push('\t]');
        r.push(');');
        return r.join('\n');
    }
}
if (GENERATE_TESTS) {
    let number = 1;
    while (true) {
        console.log('------BEGIN NEW TEST: ' + number);
        const testModel = new TestModel();
        // console.log(testModel.print());
        console.log('------END NEW TEST: ' + (number++));
        try {
            testApplyEditsWithSyncedModels(testModel.initialContent.split('\n'), testModel.edits, testModel.resultingContent.split('\n'));
            // throw new Error('a');
        }
        catch (err) {
            console.log(err);
            console.log(testModel.print());
            break;
        }
        // break;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGFibGVUZXh0TW9kZWxBdXRvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2VkaXRhYmxlVGV4dE1vZGVsQXV0by50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFakYsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDO0FBRTdCLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFFcEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLE1BQU0sQ0FBQyxlQUF1QixFQUFFLFdBQW1CLEVBQUUsYUFBcUIsRUFBRSxTQUFpQixFQUFFLElBQWM7UUFDckgsT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUM7WUFDeEUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3JCLGdCQUFnQixFQUFFLEtBQUs7U0FDdkIsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQiw4QkFBOEIsQ0FDN0I7WUFDQyxLQUFLO1lBQ0wsRUFBRTtZQUNGLE1BQU07WUFDTixFQUFFO1lBQ0YsRUFBRTtTQUNGLEVBQ0Q7WUFDQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxD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