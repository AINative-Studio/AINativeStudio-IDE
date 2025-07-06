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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGFibGVUZXh0TW9kZWxBdXRvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9lZGl0YWJsZVRleHRNb2RlbEF1dG8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWpGLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQztBQUU3QixLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBRXBDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxNQUFNLENBQUMsZUFBdUIsRUFBRSxXQUFtQixFQUFFLGFBQXFCLEVBQUUsU0FBaUIsRUFBRSxJQUFjO1FBQ3JILE9BQU87WUFDTixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsZUFBZSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsU0FBUyxDQUFDO1lBQ3hFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNyQixnQkFBZ0IsRUFBRSxLQUFLO1NBQ3ZCLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbEIsOEJBQThCLENBQzdCO1lBQ0MsS0FBSztZQUNMLEVBQUU7WUFDRixNQUFNO1lBQ04sRUFBRTtZQUNGLEVBQUU7U0FDRixFQUNEO1lBQ0MsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVB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