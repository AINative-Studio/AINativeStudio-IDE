/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { setupInstantiationService, withTestNotebook } from '../testNotebookEditor.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { Event } from '../../../../../../base/common/event.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../../../../platform/markers/common/markerService.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { NotebookCellOutline, NotebookOutlineCreator } from '../../../browser/contrib/outline/notebookOutline.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../../../editor/common/services/languageFeaturesService.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { INotebookOutlineEntryFactory, NotebookOutlineEntryFactory } from '../../../browser/viewModel/notebookOutlineEntryFactory.js';
suite('Notebook Outline', function () {
    let disposables;
    let instantiationService;
    let symbolsCached;
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        symbolsCached = false;
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.set(IEditorService, new class extends mock() {
        });
        instantiationService.set(ILanguageFeaturesService, new LanguageFeaturesService());
        instantiationService.set(IMarkerService, disposables.add(new MarkerService()));
        instantiationService.set(IThemeService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidFileIconThemeChange = Event.None;
            }
            getFileIconTheme() {
                return { hasFileIcons: true, hasFolderIcons: true, hidesExplorerArrows: false };
            }
        });
    });
    async function withNotebookOutline(cells, target, callback) {
        return withTestNotebook(cells, async (editor) => {
            if (!editor.hasModel()) {
                assert.ok(false, 'MUST have active text editor');
            }
            const notebookEditorPane = new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeModel = Event.None;
                    this.onDidChangeSelection = Event.None;
                }
                getControl() {
                    return editor;
                }
            };
            const testOutlineEntryFactory = instantiationService.createInstance(NotebookOutlineEntryFactory);
            testOutlineEntryFactory.cacheSymbols = async () => { symbolsCached = true; };
            instantiationService.stub(INotebookOutlineEntryFactory, testOutlineEntryFactory);
            const outline = await instantiationService.createInstance(NotebookOutlineCreator).createOutline(notebookEditorPane, target, CancellationToken.None);
            disposables.add(outline);
            return callback(outline, editor);
        });
    }
    test('basic', async function () {
        await withNotebookOutline([], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements(), []);
        });
    });
    test('special characters in heading', async function () {
        await withNotebookOutline([
            ['# Hellö & Hällo', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'Hellö & Hällo');
        });
        await withNotebookOutline([
            ['# bo<i>ld</i>', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'bold');
        });
    });
    test('Notebook falsely detects "empty cells"', async function () {
        await withNotebookOutline([
            ['  的时代   ', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '的时代');
        });
        await withNotebookOutline([
            ['   ', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'empty cell');
        });
        await withNotebookOutline([
            ['+++++[]{}--)(0  ', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '+++++[]{}--)(0');
        });
        await withNotebookOutline([
            ['+++++[]{}--)(0 Hello **&^ ', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '+++++[]{}--)(0 Hello **&^');
        });
        await withNotebookOutline([
            ['!@#$\n Überschrïft', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '!@#$');
        });
    });
    test('Heading text defines entry label', async function () {
        return await withNotebookOutline([
            ['foo\n # h1', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h1');
        });
    });
    test('Notebook outline ignores markdown headings #115200', async function () {
        await withNotebookOutline([
            ['## h2 \n# h1', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 2);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h2');
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[1].label, 'h1');
        });
        await withNotebookOutline([
            ['## h2', 'md', CellKind.Markup],
            ['# h1', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 2);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h2');
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[1].label, 'h1');
        });
    });
    test('Symbols for goto quickpick are pre-cached', async function () {
        await withNotebookOutline([
            ['a = 1\nb = 2', 'python', CellKind.Code]
        ], 4 /* OutlineTarget.QuickPick */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.strictEqual(symbolsCached, true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va091dGxpbmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFdkYsT0FBTyxFQUFrQixhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQW9DLE1BQU0sbUNBQW1DLENBQUM7QUFFL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2xILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBRTlHLE9BQU8sRUFBRSxpQkFBaUIs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