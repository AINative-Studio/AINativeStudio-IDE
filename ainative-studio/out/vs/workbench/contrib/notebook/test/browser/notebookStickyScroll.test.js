/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../../editor/common/services/languageFeaturesService.js';
import { NotebookCellOutline } from '../../browser/contrib/outline/notebookOutline.js';
import { computeContent } from '../../browser/viewParts/notebookEditorStickyScroll.js';
import { CellKind } from '../../common/notebookCommon.js';
import { createNotebookCellList, setupInstantiationService, withTestNotebook } from './testNotebookEditor.js';
suite('NotebookEditorStickyScroll', () => {
    let disposables;
    let instantiationService;
    const domNode = document.createElement('div');
    teardown(() => {
        disposables.dispose();
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.set(ILanguageFeaturesService, new LanguageFeaturesService());
    });
    function getOutline(editor) {
        if (!editor.hasModel()) {
            assert.ok(false, 'MUST have active text editor');
        }
        const outline = store.add(instantiationService.createInstance(NotebookCellOutline, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeModel = Event.None;
                this.onDidChangeSelection = Event.None;
            }
            getControl() {
                return editor;
            }
        }, 4 /* OutlineTarget.QuickPick */));
        return outline;
    }
    function nbStickyTestHelper(domNode, notebookEditor, notebookCellList, notebookOutlineEntries, disposables) {
        const output = computeContent(notebookEditor, notebookCellList, notebookOutlineEntries, 0);
        for (const stickyLine of output.values()) {
            disposables.add(stickyLine.line);
        }
        return createStickyTestElement(output.values());
    }
    function createStickyTestElement(stickyLines) {
        const outputElements = [];
        for (const stickyLine of stickyLines) {
            if (stickyLine.rendered) {
                outputElements.unshift(stickyLine.line.element.innerText);
            }
        }
        return outputElements;
    }
    test('test0: should render empty, 	scrollTop at 0', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['## header aa', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}]
        ], async (editor, viewModel) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 8 }, () => false),
                editorViewStates: Array.from({ length: 8 }, () => null),
                cellTotalHeights: Array.from({ length: 8 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = disposables.add(createNotebookCellList(instantiationService, disposables));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(0);
            editor.visibleRanges = [{ start: 0, end: 8 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, disposables);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test1: should render 0->1, 	visible range 3->8', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}], // 0
            ['## header aa', 'markdown', CellKind.Markup, [], {}], // 50
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 100
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 150
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 200
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 250
            ['# header b', 'markdown', CellKind.Markup, [], {}], // 300
            ['var c = 2;', 'javascript', CellKind.Code, [], {}] // 350
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 8 }, () => false),
                editorViewStates: Array.from({ length: 8 }, () => null),
                cellTotalHeights: Array.from({ length: 8 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(175);
            editor.visibleRanges = [{ start: 3, end: 8 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test2: should render 0, 		visible range 6->9 so collapsing next 2 against following section', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}], // 0
            ['## header aa', 'markdown', CellKind.Markup, [], {}], // 50
            ['### header aaa', 'markdown', CellKind.Markup, [], {}], // 100
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 150
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 200
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 250
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 300
            ['# header b', 'markdown', CellKind.Markup, [], {}], // 350
            ['var c = 2;', 'javascript', CellKind.Code, [], {}] // 400
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 9 }, () => false),
                editorViewStates: Array.from({ length: 9 }, () => null),
                cellTotalHeights: Array.from({ length: 9 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(325); // room for a single header
            editor.visibleRanges = [{ start: 6, end: 9 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test3: should render 0->2, 	collapsing against equivalent level header', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}], // 0
            ['## header aa', 'markdown', CellKind.Markup, [], {}], // 50
            ['### header aaa', 'markdown', CellKind.Markup, [], {}], // 100
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 150
            ['### header aab', 'markdown', CellKind.Markup, [], {}], // 200
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 250
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 300
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 350
            ['# header b', 'markdown', CellKind.Markup, [], {}], // 400
            ['var c = 2;', 'javascript', CellKind.Code, [], {}] // 450
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 10 }, () => false),
                editorViewStates: Array.from({ length: 10 }, () => null),
                cellTotalHeights: Array.from({ length: 10 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(175); // room for a single header
            editor.visibleRanges = [{ start: 3, end: 10 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    // outdated/improper behavior
    test('test4: should render 0, 		scrolltop halfway through cell 0', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['## header aa', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}]
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 8 }, () => false),
                editorViewStates: Array.from({ length: 8 }, () => null),
                cellTotalHeights: Array.from({ length: 8 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(50);
            editor.visibleRanges = [{ start: 0, end: 8 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test5: should render 0->2, 	scrolltop halfway through cell 2', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['## header aa', 'markdown', CellKind.Markup, [], {}],
            ['### header aaa', 'markdown', CellKind.Markup, [], {}],
            ['#### header aaaa', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}]
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 10 }, () => false),
                editorViewStates: Array.from({ length: 10 }, () => null),
                cellTotalHeights: Array.from({ length: 10 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(125);
            editor.visibleRanges = [{ start: 2, end: 10 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test6: should render 6->7, 	scrolltop halfway through cell 7', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['## header aa', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['## header bb', 'markdown', CellKind.Markup, [], {}],
            ['### header bbb', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}]
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 10 }, () => false),
                editorViewStates: Array.from({ length: 10 }, () => null),
                cellTotalHeights: Array.from({ length: 10 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(375);
            editor.visibleRanges = [{ start: 7, end: 10 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test7: should render 0->1, 	collapsing against next section', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}], //0
            ['## header aa', 'markdown', CellKind.Markup, [], {}], //50
            ['### header aaa', 'markdown', CellKind.Markup, [], {}], //100
            ['#### header aaaa', 'markdown', CellKind.Markup, [], {}], //150
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], //200
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], //250
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], //300
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], //350
            ['# header b', 'markdown', CellKind.Markup, [], {}], //400
            ['## header bb', 'markdown', CellKind.Markup, [], {}], //450
            ['### header bbb', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}]
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 12 }, () => false),
                editorViewStates: Array.from({ length: 12 }, () => null),
                cellTotalHeights: Array.from({ length: 12 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(350);
            editor.visibleRanges = [{ start: 7, end: 12 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTdGlja3lTY3JvbGwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tTdGlja3lTY3JvbGwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRzNHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBSXZGLE9BQU8sRUFBc0IsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDM0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRzlHLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDeEMsSUFBSSxXQUE0QixDQUFDO0lBQ2pDLElBQUksb0JBQThDLENBQUM7SUFFbkQsTUFBTSxPQUFPLEdBQWdCLFFB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