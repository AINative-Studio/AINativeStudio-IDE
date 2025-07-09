/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Position } from '../../../../common/core/position.js';
import { getSecondaryEdits } from '../../browser/model/inlineCompletionsModel.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { Range } from '../../../../common/core/range.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('inlineCompletionModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getSecondaryEdits - basic', async function () {
        const textModel = createTextModel([
            'function fib(',
            'function fib('
        ].join('\n'));
        const positions = [
            new Position(1, 14),
            new Position(2, 14)
        ];
        const primaryEdit = new SingleTextEdit(new Range(1, 1, 1, 14), 'function fib() {');
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(secondaryEdits, [new SingleTextEdit(new Range(2, 14, 2, 14), ') {')]);
        textModel.dispose();
    });
    test('getSecondaryEdits - cursor not on same line as primary edit 1', async function () {
        const textModel = createTextModel([
            'function fib(',
            '',
            'function fib(',
            ''
        ].join('\n'));
        const positions = [
            new Position(2, 1),
            new Position(4, 1)
        ];
        const primaryEdit = new SingleTextEdit(new Range(1, 1, 2, 1), [
            'function fib() {',
            '	return 0;',
            '}'
        ].join('\n'));
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(secondaryEdits, [new SingleTextEdit(new Range(4, 1, 4, 1), [
                '	return 0;',
                '}'
            ].join('\n'))]);
        textModel.dispose();
    });
    test('getSecondaryEdits - cursor not on same line as primary edit 2', async function () {
        const textModel = createTextModel([
            'class A {',
            '',
            'class B {',
            '',
            'function f() {}'
        ].join('\n'));
        const positions = [
            new Position(2, 1),
            new Position(4, 1)
        ];
        const primaryEdit = new SingleTextEdit(new Range(1, 1, 2, 1), [
            'class A {',
            '	public x: number = 0;',
            '   public y: number = 0;',
            '}'
        ].join('\n'));
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(secondaryEdits, [new SingleTextEdit(new Range(4, 1, 4, 1), [
                '	public x: number = 0;',
                '   public y: number = 0;',
                '}'
            ].join('\n'))]);
        textModel.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL3Rlc3QvYnJvd3Nlci9pbmxpbmVDb21wbGV0aW9uc01vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBRW5DLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUs7UUFFdEMsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDO1lBQ2pDLGVBQWU7WUFDZixlQUFlO1NBQ2YsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNkLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkIsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNuQixDQUFDO1FBQ0YsTUFBTSxXQUFXLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFL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