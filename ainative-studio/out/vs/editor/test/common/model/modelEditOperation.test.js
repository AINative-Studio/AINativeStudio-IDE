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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxFZGl0T3BlcmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9tb2RlbEVkaXRPcGVyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV0RCxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztJQUM5QixNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQztJQUNuQyxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQztJQUMvQixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDakIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0lBRWxCLElBQUksS0FBZ0IsQ0FBQztJQUVyQixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxJQUFJLEdBQ1QsS0FBSyxHQUFHLE1BQU07WUFDZCxLQUFLLEdBQUcsSUFBSTtZQUNaLEtBQUssR0FBRyxJQUFJO1lBQ1osS0FBSyxHQUFHLE1BQU07WUFDZCxLQUFLLENBQUM7UUFDUCxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztJQUVILHVD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