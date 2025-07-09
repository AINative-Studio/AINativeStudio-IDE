/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CellKind } from '../../common/notebookCommon.js';
import { setupInstantiationService, withTestNotebook } from './testNotebookEditor.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { FoldingModel, updateFoldingStateAtIndex } from '../../browser/viewModel/foldingModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Notebook Folding', () => {
    let disposables;
    let instantiationService;
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.spy(IUndoRedoService, 'pushElement');
    });
    test('Folding based on markdown cells', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.1', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingController = ds.add(new FoldingModel());
            foldingController.attachViewModel(viewModel);
            assert.strictEqual(foldingController.regions.findRange(1), 0);
            assert.strictEqual(foldingController.regions.findRange(2), 0);
            assert.strictEqual(foldingController.regions.findRange(3), 1);
            assert.strictEqual(foldingController.regions.findRange(4), 1);
            assert.strictEqual(foldingController.regions.findRange(5), 1);
            assert.strictEqual(foldingController.regions.findRange(6), 2);
            assert.strictEqual(foldingController.regions.findRange(7), 2);
        });
    });
    test('Folding not based on code cells', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['# comment 1', 'python', CellKind.Code, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3\n```\n## comment 2\n```', 'markdown', CellKind.Markup, [], {}],
            ['body 4', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.1', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'python', CellKind.Code, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingController = ds.add(new FoldingModel());
            foldingController.attachViewModel(viewModel);
            assert.strictEqual(foldingController.regions.findRange(1), 0);
            assert.strictEqual(foldingController.regions.findRange(2), 0);
            assert.strictEqual(foldingController.regions.findRange(3), 0);
            assert.strictEqual(foldingController.regions.findRange(4), 0);
            assert.strictEqual(foldingController.regions.findRange(5), 0);
            assert.strictEqual(foldingController.regions.findRange(6), 0);
            assert.strictEqual(foldingController.regions.findRange(7), 1);
            assert.strictEqual(foldingController.regions.findRange(8), 1);
        });
    });
    test('Top level header in a cell wins', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.1\n# header3', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingController = ds.add(new FoldingModel());
            foldingController.attachViewModel(viewModel);
            assert.strictEqual(foldingController.regions.findRange(1), 0);
            assert.strictEqual(foldingController.regions.findRange(2), 0);
            assert.strictEqual(foldingController.regions.getEndLineNumber(0), 2);
            assert.strictEqual(foldingController.regions.findRange(3), 1);
            assert.strictEqual(foldingController.regions.findRange(4), 1);
            assert.strictEqual(foldingController.regions.findRange(5), 1);
            assert.strictEqual(foldingController.regions.getEndLineNumber(1), 7);
            assert.strictEqual(foldingController.regions.findRange(6), 2);
            assert.strictEqual(foldingController.regions.findRange(7), 2);
            assert.strictEqual(foldingController.regions.getEndLineNumber(2), 7);
        });
    });
    test('Folding', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.1', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            updateFoldingStateAtIndex(foldingModel, 0, true);
            viewModel.updateFoldingRanges(foldingModel.regions);
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 1, end: 6 }
            ]);
        });
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            updateFoldingStateAtIndex(foldingModel, 2, true);
            viewModel.updateFoldingRanges(foldingModel.regions);
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 3, end: 4 }
            ]);
        });
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            updateFoldingStateAtIndex(foldingModel, 2, true);
            viewModel.updateFoldingRanges(foldingModel.regions);
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 3, end: 6 }
            ]);
        });
    });
    test('Nested Folding', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            updateFoldingStateAtIndex(foldingModel, 0, true);
            viewModel.updateFoldingRanges(foldingModel.regions);
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 1, end: 1 }
            ]);
            updateFoldingStateAtIndex(foldingModel, 5, true);
            updateFoldingStateAtIndex(foldingModel, 2, true);
            viewModel.updateFoldingRanges(foldingModel.regions);
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 1, end: 1 },
                { start: 3, end: 6 }
            ]);
            updateFoldingStateAtIndex(foldingModel, 2, false);
            viewModel.updateFoldingRanges(foldingModel.regions);
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 1, end: 1 },
                { start: 6, end: 6 }
            ]);
            // viewModel.insertCell(7, new TestCell(viewModel.viewType, 7, ['var c = 8;'], 'markdown', CellKind.Code, []), true);
            // assert.deepStrictEqual(viewModel.getHiddenRanges(), [
            // 	{ start: 1, end: 1 },
            // 	{ start: 6, end: 7 }
            // ]);
            // viewModel.insertCell(1, new TestCell(viewModel.viewType, 8, ['var c = 9;'], 'markdown', CellKind.Code, []), true);
            // assert.deepStrictEqual(viewModel.getHiddenRanges(), [
            // 	// the first collapsed range is now expanded as we insert content into it.
            // 	// { start: 1,},
            // 	{ start: 7, end: 8 }
            // ]);
        });
    });
    test('Folding Memento', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            foldingModel.applyMemento([{ start: 2, end: 6 }]);
            viewModel.updateFoldingRanges(foldingModel.regions);
            // Note that hidden ranges !== folding ranges
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 3, end: 6 }
            ]);
        });
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            foldingModel.applyMemento([
                { start: 5, end: 6 },
                { start: 10, end: 11 },
            ]);
            viewModel.updateFoldingRanges(foldingModel.regions);
            // Note that hidden ranges !== folding ranges
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 6, end: 6 },
                { start: 11, end: 11 }
            ]);
        });
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            foldingModel.applyMemento([
                { start: 5, end: 6 },
                { start: 7, end: 11 },
            ]);
            viewModel.updateFoldingRanges(foldingModel.regions);
            // Note that hidden ranges !== folding ranges
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 6, end: 6 },
                { start: 8, end: 11 }
            ]);
        });
    });
    test('View Index', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            foldingModel.applyMemento([{ start: 2, end: 6 }]);
            viewModel.updateFoldingRanges(foldingModel.regions);
            // Note that hidden ranges !== folding ranges
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 3, end: 6 }
            ]);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(1), 2);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(2), 7);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(3), 7);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(4), 7);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(5), 7);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(6), 7);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(7), 8);
        });
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
            ['# header 2.1\n', 'markdown', CellKind.Markup, [], {}],
            ['body 2', 'markdown', CellKind.Markup, [], {}],
            ['body 3', 'markdown', CellKind.Markup, [], {}],
            ['## header 2.2', 'markdown', CellKind.Markup, [], {}],
            ['var e = 7;', 'markdown', CellKind.Markup, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            foldingModel.applyMemento([
                { start: 5, end: 6 },
                { start: 10, end: 11 },
            ]);
            viewModel.updateFoldingRanges(foldingModel.regions);
            // Note that hidden ranges !== folding ranges
            assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                { start: 6, end: 6 },
                { start: 11, end: 11 }
            ]);
            // folding ranges
            // [5, 6]
            // [10, 11]
            assert.strictEqual(viewModel.getNextVisibleCellIndex(4), 5);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(5), 7);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(6), 7);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(9), 10);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(10), 12);
            assert.strictEqual(viewModel.getNextVisibleCellIndex(11), 12);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tGb2xkaW5nLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rRm9sZGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLElBQUksV0FBNEIsQ0FBQztJQUNqQyxJQUFJLG9CQUE4QyxDQUFDO0lBRW5ELFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUV0Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQyxvQkFBb0IsR0FBRyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RCxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDM0QsQ0FB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QUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDN0MsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDL0MsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUMvQyxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDL0MsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUMvQyxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFDRCxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDekIsTUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDaEQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVwRCw2Q0FBNkM7WUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEVBQUU7Z0JBQ25ELEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO2FBQ3BCLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FDRCxDQUFDO1FBRUYsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDN0MsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDL0MsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUMvQyxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDL0MsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUMvQyxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFDRCxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDekIsTUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDaEQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QyxZQUFZLENBQUMsWUFBWSxDQUFDO2dCQUN6QixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtnQkFDcEIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7YUFDdEIsQ0FBQyxDQUFDO1lBRUgsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVwRCw2Q0FBNkM7WUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEVBQUU7Z0JBQ25ELEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO2dCQUNwQixFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTthQUN0QixDQUFDLENBQUM7WUFFSCxpQkFBaUI7WUFDakIsU0FBUztZQUNULFdBQVc7WUFDWCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUU1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvRCxDQUFDLENBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==