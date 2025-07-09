/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../common/core/range.js';
import { getLineRangeMapping, RangeMapping } from '../../../common/diff/rangeMapping.js';
import { OffsetRange } from '../../../common/core/offsetRange.js';
import { LinesSliceCharSequence } from '../../../common/diff/defaultLinesDiffComputer/linesSliceCharSequence.js';
import { MyersDiffAlgorithm } from '../../../common/diff/defaultLinesDiffComputer/algorithms/myersDiffAlgorithm.js';
import { DynamicProgrammingDiffing } from '../../../common/diff/defaultLinesDiffComputer/algorithms/dynamicProgrammingDiffing.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ArrayText } from '../../../common/core/textEdit.js';
suite('myers', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('1', () => {
        const s1 = new LinesSliceCharSequence(['hello world'], new Range(1, 1, 1, Number.MAX_SAFE_INTEGER), true);
        const s2 = new LinesSliceCharSequence(['hallo welt'], new Range(1, 1, 1, Number.MAX_SAFE_INTEGER), true);
        const a = true ? new MyersDiffAlgorithm() : new DynamicProgrammingDiffing();
        a.compute(s1, s2);
    });
});
suite('lineRangeMapping', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Simple', () => {
        assert.deepStrictEqual(getLineRangeMapping(new RangeMapping(new Range(2, 1, 3, 1), new Range(2, 1, 2, 1)), new ArrayText([
            'const abc = "helloworld".split("");',
            '',
            ''
        ]), new ArrayText([
            'const asciiLower = "helloworld".split("");',
            ''
        ])).toString(), "{[2,3)->[2,2)}");
    });
    test('Empty Lines', () => {
        assert.deepStrictEqual(getLineRangeMapping(new RangeMapping(new Range(2, 1, 2, 1), new Range(2, 1, 4, 1)), new ArrayText([
            '',
            '',
        ]), new ArrayText([
            '',
            '',
            '',
            '',
        ])).toString(), "{[2,2)->[2,4)}");
    });
});
suite('LinesSliceCharSequence', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const sequence = new LinesSliceCharSequence([
        'line1: foo',
        'line2: fizzbuzz',
        'line3: barr',
        'line4: hello world',
        'line5: bazz',
    ], new Range(2, 1, 5, 1), true);
    test('translateOffset', () => {
        assert.deepStrictEqual({ result: OffsetRange.ofLength(sequence.length).map(offset => sequence.translateOffset(offset).toString()) }, ({
            result: [
                "(2,1)", "(2,2)", "(2,3)", "(2,4)", "(2,5)", "(2,6)", "(2,7)", "(2,8)", "(2,9)", "(2,10)", "(2,11)",
                "(2,12)", "(2,13)", "(2,14)", "(2,15)", "(2,16)",
                "(3,1)", "(3,2)", "(3,3)", "(3,4)", "(3,5)", "(3,6)", "(3,7)", "(3,8)", "(3,9)", "(3,10)", "(3,11)", "(3,12)",
                "(4,1)", "(4,2)", "(4,3)", "(4,4)", "(4,5)", "(4,6)", "(4,7)", "(4,8)", "(4,9)",
                "(4,10)", "(4,11)", "(4,12)", "(4,13)", "(4,14)", "(4,15)", "(4,16)", "(4,17)",
                "(4,18)", "(4,19)"
            ]
        }));
    });
    test('extendToFullLines', () => {
        assert.deepStrictEqual({ result: sequence.getText(sequence.extendToFullLines(new OffsetRange(20, 25))) }, ({ result: "line3: barr\n" }));
        assert.deepStrictEqual({ result: sequence.getText(sequence.extendToFullLines(new OffsetRange(20, 45))) }, ({ result: "line3: barr\nline4: hello world\n" }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3Qvbm9kZS9kaWZmaW5nL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNqSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUNwSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1RkFBdUYsQ0FBQztBQUNsSSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFN0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7SUFDbkIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtRQUNkLE1BQU0sRUFBRSxHQUFHLElBQUksc0JBQXNCLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRyxNQUFNLEVBQUUsR0FB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