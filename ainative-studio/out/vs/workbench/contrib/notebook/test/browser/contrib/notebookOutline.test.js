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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tPdXRsaW5lLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXZGLE9BQU8sRUFBa0IsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDeEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsUUFBUSxFQUFvQyxNQUFNLG1DQUFtQyxDQUFDO0FBRS9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUU5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUV0SSxLQUFLLENBQUMsa0JBQWtCLEVBQUU7SUFFekIsSUFBSSxXQUE0QixDQUFDO0lBQ2pDLElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxhQUFzQixDQUFDO0lBRTNCLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUV0Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixhQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLG9CQUFvQixHQUFHLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlELG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUFrQjtTQUFJLENBQUMsQ0FBQztRQUN2RixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDbEYsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9FLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUFpQjtZQUFuQzs7Z0JBQ2xDLDZCQUF3QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFJaEQsQ0FBQztZQUhTLGdCQUFnQjtnQkFDeEIsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUNqRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFHSCxLQUFLLFVBQVUsbUJBQW1CLENBQ2pDLEtBQStHLEVBQy9HLE1BQXFCLEVBQ3JCLFFBQTRFO1FBRzVFLE9BQU8sZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLDhCQUE4QixDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUNELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUF1QjtnQkFBekM7O29CQUlyQixxQkFBZ0IsR0FBZ0IsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDM0MseUJBQW9CLEdBQTJDLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ3BGLENBQUM7Z0JBTFMsVUFBVTtvQkFDbEIsT0FBTyxNQUFNLENBQUM7Z0JBQ2YsQ0FBQzthQUdELENBQUM7WUFHRixNQUFNLHVCQUF1QixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBUSxDQUFDO1lBQ3hHLHVCQUF1QixDQUFDLFlBQVksR0FBRyxLQUFLLElBQUksRUFBRSxHQUFHLGFBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0Usb0JBQW9CLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLHVCQUF1QixDQUFDLENBQUM7WUFFakYsTUFBTSxPQUFPLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXBKLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFDLENBQUM7WUFDMUIsT0FBTyxRQUFRLENBQUMsT0FBOEIsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVKLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUs7UUFDbEIsTUFBTSxtQkFBbUIsQ0FBQyxFQUFFLHFDQUE2QixPQUFPLENBQUMsRUFBRTtZQUNsRSxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsS0FBSztRQUMxQyxNQUFNLG1CQUFtQixDQUFDO1lBQ3pCLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDMUMscUNBQTZCLE9BQU8sQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxZQUFZLG1CQUFtQixDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM3RyxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sbUJBQW1CLENBQUM7WUFDekIsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDeEMscUNBQTZCLE9BQU8sQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxZQUFZLG1CQUFtQixDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUs7UUFDbkQsTUFBTSxtQkFBbUIsQ0FBQztZQUN6QixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUNuQyxxQ0FBNkIsT0FBTyxDQUFDLEVBQUU7WUFDdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLFlBQVksbUJBQW1CLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25HLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsQ0FBQztZQUN6QixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUM5QixxQ0FBNkIsT0FBTyxDQUFDLEVBQUU7WUFDdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLFlBQVksbUJBQW1CLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzFHLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsQ0FBQztZQUN6QixDQUFDLGtCQUFrQixFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQzNDLHFDQUE2QixPQUFPLENBQUMsRUFBRTtZQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1RixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM5RyxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sbUJBQW1CLENBQUM7WUFDekIsQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUNyRCxxQ0FBNkIsT0FBTyxDQUFDLEVBQUU7WUFDdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLFlBQVksbUJBQW1CLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDekgsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLG1CQUFtQixDQUFDO1lBQ3pCLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDN0MscUNBQTZCLE9BQU8sQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxZQUFZLG1CQUFtQixDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEtBQUs7UUFDN0MsT0FBTyxNQUFNLG1CQUFtQixDQUFDO1lBQ2hDLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ3JDLHFDQUE2QixPQUFPLENBQUMsRUFBRTtZQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1RixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEcsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvREFBb0QsRUFBRSxLQUFLO1FBQy9ELE1BQU0sbUJBQW1CLENBQUM7WUFDekIsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDdkMscUNBQTZCLE9BQU8sQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxZQUFZLG1CQUFtQixDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqRyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEcsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLG1CQUFtQixDQUFDO1lBQ3pCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ2hDLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQy9CLHFDQUE2QixPQUFPLENBQUMsRUFBRTtZQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1RixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xHLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSztRQUN0RCxNQUFNLG1CQUFtQixDQUFDO1lBQ3pCLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQ3pDLG1DQUEyQixPQUFPLENBQUMsRUFBRTtZQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9