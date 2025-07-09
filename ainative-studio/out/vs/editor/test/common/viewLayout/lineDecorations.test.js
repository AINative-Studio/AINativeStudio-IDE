/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { DecorationSegment, LineDecoration, LineDecorationsNormalizer } from '../../../common/viewLayout/lineDecorations.js';
import { InlineDecoration } from '../../../common/viewModel.js';
suite('Editor ViewLayout - ViewLineParts', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Bug 9827:Overlapping inline decorations can cause wrong inline class to be applied', () => {
        const result = LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 11, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */)
        ]);
        assert.deepStrictEqual(result, [
            new DecorationSegment(0, 1, 'c1', 0),
            new DecorationSegment(2, 2, 'c2 c1', 0),
            new DecorationSegment(3, 9, 'c1', 0),
        ]);
    });
    test('issue #3462: no whitespace shown at the end of a decorated line', () => {
        const result = LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(15, 21, 'mtkw', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(20, 21, 'inline-folded', 0 /* InlineDecorationType.Regular */),
        ]);
        assert.deepStrictEqual(result, [
            new DecorationSegment(14, 18, 'mtkw', 0),
            new DecorationSegment(19, 19, 'mtkw inline-folded', 0)
        ]);
    });
    test('issue #3661: Link decoration bleeds to next line when wrapping', () => {
        const result = LineDecoration.filter([
            new InlineDecoration(new Range(2, 12, 3, 30), 'detected-link', 0 /* InlineDecorationType.Regular */)
        ], 3, 12, 500);
        assert.deepStrictEqual(result, [
            new LineDecoration(12, 30, 'detected-link', 0 /* InlineDecorationType.Regular */),
        ]);
    });
    test('issue #37401: Allow both before and after decorations on empty line', () => {
        const result = LineDecoration.filter([
            new InlineDecoration(new Range(4, 1, 4, 2), 'before', 1 /* InlineDecorationType.Before */),
            new InlineDecoration(new Range(4, 0, 4, 1), 'after', 2 /* InlineDecorationType.After */),
        ], 4, 1, 500);
        assert.deepStrictEqual(result, [
            new LineDecoration(1, 2, 'before', 1 /* InlineDecorationType.Before */),
            new LineDecoration(0, 1, 'after', 2 /* InlineDecorationType.After */),
        ]);
    });
    test('ViewLineParts', () => {
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 2, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */)
        ]), [
            new DecorationSegment(0, 0, 'c1', 0),
            new DecorationSegment(2, 2, 'c2', 0)
        ]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 3, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */)
        ]), [
            new DecorationSegment(0, 1, 'c1', 0),
            new DecorationSegment(2, 2, 'c2', 0)
        ]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */)
        ]), [
            new DecorationSegment(0, 1, 'c1', 0),
            new DecorationSegment(2, 2, 'c1 c2', 0)
        ]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1*', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */)
        ]), [
            new DecorationSegment(0, 1, 'c1 c1*', 0),
            new DecorationSegment(2, 2, 'c1 c1* c2', 0)
        ]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1*', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1**', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */)
        ]), [
            new DecorationSegment(0, 1, 'c1 c1* c1**', 0),
            new DecorationSegment(2, 2, 'c1 c1* c1** c2', 0)
        ]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1*', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1**', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2*', 0 /* InlineDecorationType.Regular */)
        ]), [
            new DecorationSegment(0, 1, 'c1 c1* c1**', 0),
            new DecorationSegment(2, 2, 'c1 c1* c1** c2 c2*', 0)
        ]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1*', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1**', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 5, 'c2*', 0 /* InlineDecorationType.Regular */)
        ]), [
            new DecorationSegment(0, 1, 'c1 c1* c1**', 0),
            new DecorationSegment(2, 2, 'c1 c1* c1** c2 c2*', 0),
            new DecorationSegment(3, 3, 'c2*', 0)
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3ZpZXdMYXlvdXQvbGluZURlY29yYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0gsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLDhCQUE4QixDQUFDO0FBRXRGLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFFL0MsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsb0ZBQW9GLEVBQUUsR0FBRyxFQUFFO1FBRS9GLE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRTtZQUNwRixJQUFJLGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksdUNBQStCO1lBQzdELElBQUksY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSx1Q0FBK0I7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDOUIsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDcEMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENB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