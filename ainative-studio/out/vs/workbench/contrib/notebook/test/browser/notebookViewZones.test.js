/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NotebookCellsLayout } from '../../browser/view/notebookCellListView.js';
import { FoldingModel } from '../../browser/viewModel/foldingModel.js';
import { CellKind } from '../../common/notebookCommon.js';
import { createNotebookCellList, setupInstantiationService, withTestNotebook } from './testNotebookEditor.js';
suite('NotebookRangeMap', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty', () => {
        const rangeMap = new NotebookCellsLayout();
        assert.strictEqual(rangeMap.size, 0);
        assert.strictEqual(rangeMap.count, 0);
    });
    const one = { size: 1 };
    const two = { size: 2 };
    const three = { size: 3 };
    const five = { size: 5 };
    const ten = { size: 10 };
    test('length & count', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [one]);
        assert.strictEqual(rangeMap.size, 1);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('length & count #2', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [one, one, one, one, one]);
        assert.strictEqual(rangeMap.size, 5);
        assert.strictEqual(rangeMap.count, 5);
    });
    test('length & count #3', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [five]);
        assert.strictEqual(rangeMap.size, 5);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('length & count #4', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 25);
        assert.strictEqual(rangeMap.count, 5);
    });
    test('insert', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 25);
        assert.strictEqual(rangeMap.count, 5);
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 50);
        assert.strictEqual(rangeMap.count, 10);
        rangeMap.splice(5, 0, [ten, ten]);
        assert.strictEqual(rangeMap.size, 70);
        assert.strictEqual(rangeMap.count, 12);
        rangeMap.splice(12, 0, [{ size: 200 }]);
        assert.strictEqual(rangeMap.size, 270);
        assert.strictEqual(rangeMap.count, 13);
    });
    test('delete', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [five, five, five, five, five,
            five, five, five, five, five,
            five, five, five, five, five,
            five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 100);
        assert.strictEqual(rangeMap.count, 20);
        rangeMap.splice(10, 5);
        assert.strictEqual(rangeMap.size, 75);
        assert.strictEqual(rangeMap.count, 15);
        rangeMap.splice(0, 1);
        assert.strictEqual(rangeMap.size, 70);
        assert.strictEqual(rangeMap.count, 14);
        rangeMap.splice(1, 13);
        assert.strictEqual(rangeMap.size, 5);
        assert.strictEqual(rangeMap.count, 1);
        rangeMap.splice(1, 1);
        assert.strictEqual(rangeMap.size, 5);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('insert & delete', () => {
        const rangeMap = new NotebookCellsLayout();
        assert.strictEqual(rangeMap.size, 0);
        assert.strictEqual(rangeMap.count, 0);
        rangeMap.splice(0, 0, [one]);
        assert.strictEqual(rangeMap.size, 1);
        assert.strictEqual(rangeMap.count, 1);
        rangeMap.splice(0, 1);
        assert.strictEqual(rangeMap.size, 0);
        assert.strictEqual(rangeMap.count, 0);
    });
    test('insert & delete #2', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [one, one, one, one, one,
            one, one, one, one, one]);
        rangeMap.splice(2, 6);
        assert.strictEqual(rangeMap.count, 4);
        assert.strictEqual(rangeMap.size, 4);
    });
    test('insert & delete #3', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [one, one, one, one, one,
            one, one, one, one, one,
            two, two, two, two, two,
            two, two, two, two, two]);
        rangeMap.splice(8, 4);
        assert.strictEqual(rangeMap.count, 16);
        assert.strictEqual(rangeMap.size, 24);
    });
    test('insert & delete #4', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [one, one, one, one, one,
            one, one, one, one, one,
            two, two, two, two, two,
            two, two, two, two, two]);
        rangeMap.splice(5, 0, [three, three, three, three, three]);
        assert.strictEqual(rangeMap.count, 25);
        assert.strictEqual(rangeMap.size, 45);
        rangeMap.splice(4, 7);
        assert.strictEqual(rangeMap.count, 18);
        assert.strictEqual(rangeMap.size, 28);
    });
    suite('indexAt, positionAt', () => {
        test('empty', () => {
            const rangeMap = new NotebookCellsLayout();
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(10), 0);
            assert.strictEqual(rangeMap.indexAt(-1), -1);
            assert.strictEqual(rangeMap.positionAt(0), -1);
            assert.strictEqual(rangeMap.positionAt(10), -1);
            assert.strictEqual(rangeMap.positionAt(-1), -1);
        });
        test('simple', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [one]);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 1);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), -1);
        });
        test('simple #2', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [ten]);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(5), 0);
            assert.strictEqual(rangeMap.indexAt(9), 0);
            assert.strictEqual(rangeMap.indexAt(10), 1);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), -1);
        });
        test('insert', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [one, one, one, one, one, one, one, one, one, one]);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 1);
            assert.strictEqual(rangeMap.indexAt(5), 5);
            assert.strictEqual(rangeMap.indexAt(9), 9);
            assert.strictEqual(rangeMap.indexAt(10), 10);
            assert.strictEqual(rangeMap.indexAt(11), 10);
            rangeMap.splice(10, 0, [one, one, one, one, one, one, one, one, one, one]);
            assert.strictEqual(rangeMap.indexAt(10), 10);
            assert.strictEqual(rangeMap.indexAt(19), 19);
            assert.strictEqual(rangeMap.indexAt(20), 20);
            assert.strictEqual(rangeMap.indexAt(21), 20);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), 1);
            assert.strictEqual(rangeMap.positionAt(19), 19);
            assert.strictEqual(rangeMap.positionAt(20), -1);
        });
        test('delete', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [one, one, one, one, one, one, one, one, one, one]);
            rangeMap.splice(2, 6);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 1);
            assert.strictEqual(rangeMap.indexAt(3), 3);
            assert.strictEqual(rangeMap.indexAt(4), 4);
            assert.strictEqual(rangeMap.indexAt(5), 4);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), 1);
            assert.strictEqual(rangeMap.positionAt(3), 3);
            assert.strictEqual(rangeMap.positionAt(4), -1);
        });
        test('delete #2', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [ten, ten, ten, ten, ten, ten, ten, ten, ten, ten]);
            rangeMap.splice(2, 6);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 0);
            assert.strictEqual(rangeMap.indexAt(30), 3);
            assert.strictEqual(rangeMap.indexAt(40), 4);
            assert.strictEqual(rangeMap.indexAt(50), 4);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), 10);
            assert.strictEqual(rangeMap.positionAt(2), 20);
            assert.strictEqual(rangeMap.positionAt(3), 30);
            assert.strictEqual(rangeMap.positionAt(4), -1);
        });
    });
});
suite('NotebookRangeMap with top padding', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty', () => {
        const rangeMap = new NotebookCellsLayout(10);
        assert.strictEqual(rangeMap.size, 10);
        assert.strictEqual(rangeMap.count, 0);
    });
    const one = { size: 1 };
    const five = { size: 5 };
    const ten = { size: 10 };
    test('length & count', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [one]);
        assert.strictEqual(rangeMap.size, 11);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('length & count #2', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [one, one, one, one, one]);
        assert.strictEqual(rangeMap.size, 15);
        assert.strictEqual(rangeMap.count, 5);
    });
    test('length & count #3', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [five]);
        assert.strictEqual(rangeMap.size, 15);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('length & count #4', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 35);
        assert.strictEqual(rangeMap.count, 5);
    });
    test('insert', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 35);
        assert.strictEqual(rangeMap.count, 5);
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 60);
        assert.strictEqual(rangeMap.count, 10);
        rangeMap.splice(5, 0, [ten, ten]);
        assert.strictEqual(rangeMap.size, 80);
        assert.strictEqual(rangeMap.count, 12);
        rangeMap.splice(12, 0, [{ size: 200 }]);
        assert.strictEqual(rangeMap.size, 280);
        assert.strictEqual(rangeMap.count, 13);
    });
    suite('indexAt, positionAt', () => {
        test('empty', () => {
            const rangeMap = new NotebookCellsLayout(10);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(10), 0);
            assert.strictEqual(rangeMap.indexAt(-1), -1);
            assert.strictEqual(rangeMap.positionAt(0), -1);
            assert.strictEqual(rangeMap.positionAt(10), -1);
            assert.strictEqual(rangeMap.positionAt(-1), -1);
        });
        test('simple', () => {
            const rangeMap = new NotebookCellsLayout(10);
            rangeMap.splice(0, 0, [one]);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 0);
            assert.strictEqual(rangeMap.indexAt(10), 0);
            assert.strictEqual(rangeMap.indexAt(11), 1);
            assert.strictEqual(rangeMap.positionAt(0), 10);
            assert.strictEqual(rangeMap.positionAt(1), -1);
        });
    });
});
suite('NotebookRangeMap with whitesspaces', () => {
    let testDisposables;
    let instantiationService;
    let config;
    teardown(() => {
        testDisposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testDisposables = new DisposableStore();
        instantiationService = setupInstantiationService(testDisposables);
        config = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, config);
    });
    test('simple', () => {
        const rangeMap = new NotebookCellsLayout(0);
        rangeMap.splice(0, 0, [{ size: 479 }, { size: 163 }, { size: 182 }, { size: 106 }, { size: 106 }, { size: 106 }, { size: 87 }]);
        const start = rangeMap.indexAt(650);
        const end = rangeMap.indexAfter(650 + 890 - 1);
        assert.strictEqual(start, 2);
        assert.strictEqual(end, 7);
        rangeMap.insertWhitespace('1', 0, 18);
        assert.strictEqual(rangeMap.indexAt(650), 1);
    });
    test('Whitespace CRUD', async function () {
        const twenty = { size: 20 };
        const rangeMap = new NotebookCellsLayout(0);
        rangeMap.splice(0, 0, [twenty, twenty, twenty]);
        rangeMap.insertWhitespace('0', 0, 5);
        rangeMap.insertWhitespace('1', 0, 5);
        assert.strictEqual(rangeMap.indexAt(0), 0);
        assert.strictEqual(rangeMap.indexAt(1), 0);
        assert.strictEqual(rangeMap.indexAt(10), 0);
        assert.strictEqual(rangeMap.indexAt(11), 0);
        assert.strictEqual(rangeMap.indexAt(21), 0);
        assert.strictEqual(rangeMap.indexAt(31), 1);
        assert.strictEqual(rangeMap.positionAt(0), 10);
        assert.strictEqual(rangeMap.getWhitespacePosition('0'), 0);
        assert.strictEqual(rangeMap.getWhitespacePosition('1'), 5);
        assert.strictEqual(rangeMap.positionAt(0), 10);
        assert.strictEqual(rangeMap.positionAt(1), 30);
        rangeMap.changeOneWhitespace('0', 0, 10);
        assert.strictEqual(rangeMap.getWhitespacePosition('0'), 0);
        assert.strictEqual(rangeMap.getWhitespacePosition('1'), 10);
        assert.strictEqual(rangeMap.positionAt(0), 15);
        assert.strictEqual(rangeMap.positionAt(1), 35);
        rangeMap.removeWhitespace('1');
        assert.strictEqual(rangeMap.getWhitespacePosition('0'), 0);
        assert.strictEqual(rangeMap.positionAt(0), 10);
        assert.strictEqual(rangeMap.positionAt(1), 30);
    });
    test('Whitespace with editing', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}]
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones(accessor => {
                const id = accessor.addZone({
                    afterModelPosition: 1,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 70);
                assert.strictEqual(cellList.getElementTop(2), 170);
                const textModel = editor.textModel;
                textModel.applyEdits([
                    { editType: 1 /* CellEditType.Replace */, index: 0, count: 1, cells: [] },
                ], true, undefined, () => undefined, undefined, true);
                assert.strictEqual(cellList.getElementTop(0), 20);
                assert.strictEqual(cellList.getElementTop(1), 120);
                assert.strictEqual(cellList.getElementTop(2), 170);
                accessor.removeZone(id);
            });
        });
    });
    test('Multiple Whitespaces', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}]
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones(accessor => {
                const first = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(first);
                const second = accessor.addZone({
                    afterModelPosition: 3,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(second);
                assert.strictEqual(cellList.scrollHeight, 390);
                assert.strictEqual(cellList.getElementTop(0), 20);
                assert.strictEqual(cellList.getElementTop(1), 70);
                assert.strictEqual(cellList.getElementTop(2), 170);
                assert.strictEqual(cellList.getElementTop(3), 240);
                accessor.removeZone(first);
                assert.strictEqual(cellList.scrollHeight, 370);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 50);
                assert.strictEqual(cellList.getElementTop(2), 150);
                assert.strictEqual(cellList.getElementTop(3), 220);
                accessor.removeZone(second);
                assert.strictEqual(cellList.scrollHeight, 350);
                assert.strictEqual(cellList.getElementTop(3), 200);
            });
        });
    });
    test('Multiple Whitespaces 2', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}]
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones(accessor => {
                const first = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(first);
                const second = accessor.addZone({
                    afterModelPosition: 1,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(second);
                assert.strictEqual(cellList.scrollHeight, 390);
                assert.strictEqual(cellList._getView().getWhitespacePosition(first), 0);
                assert.strictEqual(cellList._getView().getWhitespacePosition(second), 70);
                accessor.removeZone(first);
                accessor.removeZone(second);
            });
        });
    });
    test('Multiple Whitespaces 3', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}]
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones(accessor => {
                const first = accessor.addZone({
                    afterModelPosition: 1,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(first);
                const second = accessor.addZone({
                    afterModelPosition: 2,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(second);
                assert.strictEqual(cellList.scrollHeight, 390);
                assert.strictEqual(cellList._getView().getWhitespacePosition(first), 50);
                assert.strictEqual(cellList._getView().getWhitespacePosition(second), 170);
                accessor.removeZone(first);
                accessor.removeZone(second);
            });
        });
    });
    // test('Multiple Whitespaces 4', async function () {
    // 	await withTestNotebook(
    // 		[
    // 			['# header a', 'markdown', CellKind.Markup, [], {}],
    // 			['var b = 1;', 'javascript', CellKind.Code, [], {}],
    // 			['# header b', 'markdown', CellKind.Markup, [], {}],
    // 			['var b = 2;', 'javascript', CellKind.Code, [], {}],
    // 			['# header c', 'markdown', CellKind.Markup, [], {}]
    // 		],
    // 		async (editor, viewModel, disposables) => {
    // 			viewModel.restoreEditorViewState({
    // 				editingCells: [false, false, false, false, false],
    // 				cellLineNumberStates: {},
    // 				editorViewStates: [null, null, null, null, null],
    // 				cellTotalHeights: [50, 100, 50, 100, 50],
    // 				collapsedInputCells: {},
    // 				collapsedOutputCells: {},
    // 			});
    // 			const cellList = createNotebookCellList(instantiationService, disposables);
    // 			disposables.add(cellList);
    // 			cellList.attachViewModel(viewModel);
    // 			// render height 210, it can render 3 full cells and 1 partial cell
    // 			cellList.layout(210, 100);
    // 			assert.strictEqual(cellList.scrollHeight, 350);
    // 			cellList.changeViewZones(accessor => {
    // 				const first = accessor.addZone({
    // 					afterModelPosition: 1,
    // 					heightInPx: 20,
    // 					domNode: document.createElement('div')
    // 				});
    // 				accessor.layoutZone(first);
    // 				const second = accessor.addZone({
    // 					afterModelPosition: 1,
    // 					heightInPx: 20,
    // 					domNode: document.createElement('div')
    // 				});
    // 				accessor.layoutZone(second);
    // 				const third = accessor.addZone({
    // 					afterModelPosition: 2,
    // 					heightInPx: 20,
    // 					domNode: document.createElement('div')
    // 				});
    // 				accessor.layoutZone(second);
    // 				assert.strictEqual(cellList.scrollHeight, 410);
    // 				assert.strictEqual(cellList._getView().getWhitespacePosition(first), 50);
    // 				assert.strictEqual(cellList._getView().getWhitespacePosition(second), 70);
    // 				assert.strictEqual(cellList._getView().getWhitespacePosition(third), 190);
    // 				accessor.removeZone(first);
    // 				accessor.removeZone(second);
    // 				accessor.removeZone(third);
    // 			});
    // 		});
    // });
    test('Whitespace with folding support', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}]
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones(accessor => {
                const id = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                assert.strictEqual(cellList.getElementTop(0), 20);
                assert.strictEqual(cellList.getElementTop(1), 70);
                assert.strictEqual(cellList.getElementTop(2), 170);
                assert.strictEqual(cellList.getElementTop(3), 220);
                assert.strictEqual(cellList.getElementTop(4), 320);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
            cellList.changeViewZones(accessor => {
                const id = accessor.addZone({
                    afterModelPosition: 1,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 70);
                assert.strictEqual(cellList.getElementTop(2), 170);
                assert.strictEqual(cellList.getElementTop(3), 220);
                assert.strictEqual(cellList.getElementTop(4), 320);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
            // Whitespace should be hidden if it's after the header in a folding region
            cellList.changeViewZones(accessor => {
                const id = accessor.addZone({
                    afterModelPosition: 3,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                const foldingModel = disposables.add(new FoldingModel());
                foldingModel.attachViewModel(viewModel);
                foldingModel.applyMemento([{ start: 2, end: 3 }]);
                viewModel.updateFoldingRanges(foldingModel.regions);
                assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                    { start: 3, end: 3 }
                ]);
                cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
                assert.strictEqual(cellList.scrollHeight, 250);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 50);
                assert.strictEqual(cellList.getElementTop(2), 150);
                assert.strictEqual(cellList.getElementTop(3), 200);
                cellList.setHiddenAreas([], true);
                assert.strictEqual(cellList.scrollHeight, 370);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
            // Whitespace should not be hidden if it's after the last cell in a folding region
            cellList.changeViewZones(accessor => {
                const id = accessor.addZone({
                    afterModelPosition: 4,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                const foldingModel = disposables.add(new FoldingModel());
                foldingModel.attachViewModel(viewModel);
                foldingModel.applyMemento([{ start: 2, end: 3 }]);
                viewModel.updateFoldingRanges(foldingModel.regions);
                assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                    { start: 3, end: 3 }
                ]);
                cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
                assert.strictEqual(cellList.scrollHeight, 270);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 50);
                assert.strictEqual(cellList.getElementTop(2), 150);
                assert.strictEqual(cellList.getElementTop(3), 220);
                cellList.setHiddenAreas([], true);
                assert.strictEqual(cellList.scrollHeight, 370);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
            // Whitespace move when previous folding regions fold
            cellList.changeViewZones(accessor => {
                const id = accessor.addZone({
                    afterModelPosition: 4,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                const foldingModel = disposables.add(new FoldingModel());
                foldingModel.attachViewModel(viewModel);
                foldingModel.applyMemento([{ start: 0, end: 1 }]);
                viewModel.updateFoldingRanges(foldingModel.regions);
                assert.deepStrictEqual(viewModel.getHiddenRanges(), [
                    { start: 1, end: 1 }
                ]);
                cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
                assert.strictEqual(cellList.scrollHeight, 270);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 50);
                assert.strictEqual(cellList.getElementTop(2), 100);
                assert.strictEqual(cellList.getElementTop(3), 220);
                cellList.setHiddenAreas([], true);
                assert.strictEqual(cellList.scrollHeight, 370);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
        });
    });
    test('Whitespace with multiple viewzones at same position', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}]
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones(accessor => {
                const first = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(first);
                assert.strictEqual(cellList.scrollHeight, 370);
                const second = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div')
                });
                accessor.layoutZone(second);
                assert.strictEqual(cellList.scrollHeight, 390);
                assert.strictEqual(cellList.getElementTop(0), 40);
                assert.strictEqual(cellList.getElementTop(1), 90);
                assert.strictEqual(cellList.getElementTop(2), 190);
                assert.strictEqual(cellList.getElementTop(3), 240);
                assert.strictEqual(cellList.getElementTop(4), 340);
                accessor.removeZone(first);
                assert.strictEqual(cellList.scrollHeight, 370);
                accessor.removeZone(second);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3Wm9uZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tWaWV3Wm9uZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBRXpILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQWdCLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTlHLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFFOUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ3hCLE1BQU0sR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ3hCLE1BQU0sS0FBSyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQzFCLE1BQU0sSUFBSSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ3pCLE1BQU0sR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDO0lBRXpCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sUUFBUSxHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUMzQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sUUFBUSxHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUMzQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV2QyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXZDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJO1lBQ2xELElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJO1lBQzVCLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJO1lBQzVCLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFdkMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV2QyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXZDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUMzQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRztZQUM3QyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzQixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFDM0MsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7WUFDN0MsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7WUFDdkIsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7WUFDdkIsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0IsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO1lBQzdDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO1lBQ3ZCLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO1lBQ3ZCLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNCLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFdEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDakMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtZQUN0QixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDM0MsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFN0MsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUNuQixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDM0MsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMxRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV0QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7WUFDdEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUMsTUFBTSxDQUFD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RSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sUUFBUSxHQUFHLElBQUksbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0MsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ25CLE1BQU0sUUFBUSxHQUFHLElBQUksbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0MsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0QyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJ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LENBQUMsQ0FBQztRQUVoSSxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsS0FBSztRQUM1QixNQUFNLE1BQU0sR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUU1QixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNoRCxRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUvQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsRUFB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