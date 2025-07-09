/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { createTextModel } from '../testTextModel.js';
suite('Editor Model - Model Edit Operation', () => {
    const LINE1 = 'My First Line';
    const LINE2 = '\t\tMy Second Line';
    const LINE3 = '    Third Line';
    const LINE4 = '';
    const LINE5 = '1';
    let model;
    setup(() => {
        const text = LINE1 + '\r\n' +
            LINE2 + '\n' +
            LINE3 + '\n' +
            LINE4 + '\r\n' +
            LINE5;
        model = createTextModel(text);
    });
    teardown(() => {
        model.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
        const range = new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn);
        return {
            range: range,
            text: text,
            forceMoveMarkers: false
        };
    }
    function assertSingleEditOp(singleEditOp, editedLines) {
        const editOp = [singleEditOp];
        const inverseEditOp = model.applyEdits(editOp, true);
        assert.strictEqual(model.getLineCount(), editedLines.length);
        for (let i = 0; i < editedLines.length; i++) {
            assert.strictEqual(model.getLineContent(i + 1), editedLines[i]);
        }
        const originalOp = model.applyEdits(inverseEditOp, true);
        assert.strictEqual(model.getLineCount(), 5);
        assert.strictEqual(model.getLineContent(1), LINE1);
        assert.strictEqual(model.getLineContent(2), LINE2);
        assert.strictEqual(model.getLineContent(3), LINE3);
        assert.strictEqual(model.getLineContent(4), LINE4);
        assert.strictEqual(model.getLineContent(5), LINE5);
        const simplifyEdit = (edit) => {
            return {
                range: edit.range,
                text: edit.text,
                forceMoveMarkers: edit.forceMoveMarkers || false
            };
        };
        assert.deepStrictEqual(originalOp.map(simplifyEdit), editOp.map(simplifyEdit));
    }
    test('Insert inline', () => {
        assertSingleEditOp(createSingleEditOp('a', 1, 1), [
            'aMy First Line',
            LINE2,
            LINE3,
            LINE4,
            LINE5
        ]);
    });
    test('Replace inline/inline 1', () => {
        assertSingleEditOp(createSingleEditOp(' incredibly awesome', 1, 3), [
            'My incredibly awesome First Line',
            LINE2,
            LINE3,
            LINE4,
            LINE5
        ]);
    });
    test('Replace inline/inline 2', () => {
        assertSingleEditOp(createSingleEditOp(' with text at the end.', 1, 14), [
            'My First Line with text at the end.',
            LINE2,
            LINE3,
            LINE4,
            LINE5
        ]);
    });
    test('Replace inline/inline 3', () => {
        assertSingleEditOp(createSingleEditOp('My new First Line.', 1, 1, 1, 14), [
            'My new First Line.',
            LINE2,
            LINE3,
            LINE4,
            LINE5
        ]);
    });
    test('Replace inline/multi line 1', () => {
        assertSingleEditOp(createSingleEditOp('My new First Line.', 1, 1, 3, 15), [
            'My new First Line.',
            LINE4,
            LINE5
        ]);
    });
    test('Replace inline/multi line 2', () => {
        assertSingleEditOp(createSingleEditOp('My new First Line.', 1, 2, 3, 15), [
            'MMy new First Line.',
            LINE4,
            LINE5
        ]);
    });
    test('Replace inline/multi line 3', () => {
        assertSingleEditOp(createSingleEditOp('My new First Line.', 1, 2, 3, 2), [
            'MMy new First Line.   Third Line',
            LINE4,
            LINE5
        ]);
    });
    test('Replace muli line/multi line', () => {
        assertSingleEditOp(createSingleEditOp('1\n2\n3\n4\n', 1, 1), [
            '1',
            '2',
            '3',
            '4',
            LINE1,
            LINE2,
            LINE3,
            LINE4,
            LINE5
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxFZGl0T3BlcmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL21vZGVsRWRpdE9wZXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXRELEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDakQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDO0lBQzlCLE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDO0lBQ25DLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDO0lBQy9CLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNqQixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7SUFFbEIsSUFBSSxLQUFnQixDQUFDO0lBRXJCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLElBQUksR0FDVCxLQUFLLEdBQUcsTUFBTTtZQUNkLEtBQUssR0FBRyxJQUFJO1lBQ1osS0FBSyxHQUFHLElBQUk7WUFDWixLQUFLLEdBQUcsTUFBTTtZQUNkLEtBQUssQ0FBQztRQUNQLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVD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