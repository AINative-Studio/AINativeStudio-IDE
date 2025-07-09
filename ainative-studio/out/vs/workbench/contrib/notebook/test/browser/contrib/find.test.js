/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../editor/common/core/range.js';
import { FindMatch, ValidAnnotatedEditOperation } from '../../../../../../editor/common/model.js';
import { USUAL_WORD_SEPARATORS } from '../../../../../../editor/common/core/wordHelper.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { FindReplaceState } from '../../../../../../editor/contrib/find/browser/findState.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CellFindMatchModel, FindModel } from '../../../browser/contrib/find/findModel.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { TestCell, withTestNotebook } from '../testNotebookEditor.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('Notebook Find', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationValue = {
        value: USUAL_WORD_SEPARATORS
    };
    const configurationService = new class extends TestConfigurationService {
        inspect() {
            return configurationValue;
        }
    }();
    const setupEditorForTest = (editor, viewModel) => {
        editor.changeModelDecorations = (callback) => {
            return callback({
                deltaDecorations: (oldDecorations, newDecorations) => {
                    const ret = [];
                    newDecorations.forEach(dec => {
                        const cell = viewModel.viewCells.find(cell => cell.handle === dec.ownerId);
                        const decorations = cell?.deltaModelDecorations([], dec.decorations) ?? [];
                        if (decorations.length > 0) {
                            ret.push({ ownerId: dec.ownerId, decorations: decorations });
                        }
                    });
                    return ret;
                }
            });
        };
    };
    test('Update find matches basics', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            assert.strictEqual(model.findMatches.length, 2);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            assert.strictEqual(editor.textModel.length, 3);
            const found2 = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            editor.textModel.applyEdits([{
                    editType: 1 /* CellEditType.Replace */, index: 3, count: 0, cells: [
                        disposables.add(new TestCell(viewModel.viewType, 3, '# next paragraph 1', 'markdown', CellKind.Code, [], accessor.get(ILanguageService))),
                    ]
                }], true, undefined, () => undefined, undefined, true);
            await found2;
            assert.strictEqual(editor.textModel.length, 4);
            assert.strictEqual(model.findMatches.length, 3);
            assert.strictEqual(model.currentMatch, 1);
        });
    });
    test('Update find matches basics 2', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.3', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            setupEditorForTest(editor, viewModel);
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            // find matches is not necessarily find results
            assert.strictEqual(model.findMatches.length, 4);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 2);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 3);
            const found2 = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            editor.textModel.applyEdits([{
                    editType: 1 /* CellEditType.Replace */, index: 2, count: 1, cells: []
                }], true, undefined, () => undefined, undefined, true);
            await found2;
            assert.strictEqual(model.findMatches.length, 3);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: true });
            assert.strictEqual(model.currentMatch, 3);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 2);
        });
    });
    test('Update find matches basics 3', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.3', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            setupEditorForTest(editor, viewModel);
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            // find matches is not necessarily find results
            assert.strictEqual(model.findMatches.length, 4);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: true });
            assert.strictEqual(model.currentMatch, 4);
            const found2 = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            editor.textModel.applyEdits([{
                    editType: 1 /* CellEditType.Replace */, index: 2, count: 1, cells: []
                }], true, undefined, () => undefined, undefined, true);
            await found2;
            assert.strictEqual(model.findMatches.length, 3);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: true });
            assert.strictEqual(model.currentMatch, 3);
            model.find({ previous: true });
            assert.strictEqual(model.currentMatch, 2);
        });
    });
    test('Update find matches, #112748', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.3', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            setupEditorForTest(editor, viewModel);
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            // find matches is not necessarily find results
            assert.strictEqual(model.findMatches.length, 4);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            model.find({ previous: false });
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 3);
            const found2 = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            viewModel.viewCells[1].textBuffer.applyEdits([
                new ValidAnnotatedEditOperation(null, new Range(1, 1, 1, 14), '', false, false, false)
            ], false, true);
            // cell content updates, recompute
            model.research();
            await found2;
            assert.strictEqual(model.currentMatch, 1);
        });
    });
    test('Reset when match not found, #127198', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            assert.strictEqual(model.findMatches.length, 2);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            assert.strictEqual(editor.textModel.length, 3);
            const found2 = new Promise(resolve => disposables.add(state.onFindReplaceStateChange(e => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ searchString: '3' }, true);
            await found2;
            assert.strictEqual(model.currentMatch, -1);
            assert.strictEqual(model.findMatches.length, 0);
        });
    });
    test('CellFindMatchModel', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['print(1)', 'typescript', CellKind.Code, [], {}],
        ], async (editor) => {
            const mdCell = editor.cellAt(0);
            const mdModel = new CellFindMatchModel(mdCell, 0, [], []);
            assert.strictEqual(mdModel.length, 0);
            mdModel.contentMatches.push(new FindMatch(new Range(1, 1, 1, 2), []));
            assert.strictEqual(mdModel.length, 1);
            mdModel.webviewMatches.push({
                index: 0,
                searchPreviewInfo: {
                    line: '',
                    range: {
                        start: 0,
                        end: 0,
                    }
                }
            }, {
                index: 1,
                searchPreviewInfo: {
                    line: '',
                    range: {
                        start: 0,
                        end: 0,
                    }
                }
            });
            assert.strictEqual(mdModel.length, 3);
            assert.strictEqual(mdModel.getMatch(0), mdModel.contentMatches[0]);
            assert.strictEqual(mdModel.getMatch(1), mdModel.webviewMatches[0]);
            assert.strictEqual(mdModel.getMatch(2), mdModel.webviewMatches[1]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL2ZpbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQWUsMkJBQTJCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQXVCLE1BQU0sa0VBQWtFLENBQUM7QUFDOUgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFFNUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRzNGLE9BQU8sRUFBZ0IsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXRHLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsTUFBTSxrQkFBa0IsR0FBNkI7UUFDcEQsS0FBSyxFQUFFLHFCQUFxQjtLQUM1QixDQUFDO0lBQ0YsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEtBQU0sU0FBUSx3QkFBd0I7UUFDN0QsT0FBTztZQUNmLE9BQU8sa0JBQWtCLENBQUM7UUFDM0IsQ0FBQztLQUNELEVBQUUsQ0FBQztJQUVKLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxNQUE2QixFQUFFLFNBQTRCLEVBQUUsRUFBRTtRQUMxRixNQUFNLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUM1QyxPQUFPLFFBQVEsQ0FBQztnQkFDZixnQkFBZ0IsRUFBRSxDQUFDLGNBQXVDLEVBQUUsY0FBNEMsRUFBRSxFQUFFO29CQUMzRyxNQUFNLEdBQUcsR0FBNEIsRUFBRSxDQUFDO29CQUN4QyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO3dCQUM1QixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUMzRSxNQUFNLFdBQVcsR0FBRyxJQUFJLEVBQUUscUJBQXFCLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBRTNFLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzs0QkFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO3dCQUM5RCxDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFDO29CQUVILE9BQU8sR0FBRyxDQUFDO2dCQUNaLENBQUM7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7SUFDSCxDQUFDLENBQUM7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSztRQUN2QyxNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNwRCxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ3BELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzFDLFFBQVEsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUMzRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLEVBQXVCLENBQUMsQ0FBQztZQUMzRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqRyxNQUFNLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBVSxPQUFPLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNoRyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDTCxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3pDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUMsTUFBTSxLQUFLLENBQUM7WUFDWixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUxQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRS9DLE1BQU0sTUFBTSxHQUFHLElBQUksT0FBTyxDQUFVLE9BQU8sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pHLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFBQyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNMLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQzVCLFFBQVEsOEJBQXNCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRTt3QkFDMUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7cUJBQ3pJO2lCQUNELENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkQsTUFBTSxNQUFNLENBQUM7WUFDYixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSztRQUN6QyxNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDdEQsQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNwRCxFQUNELEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUMxQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDdEMsUUFBUSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQzNELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsRUFBdUIsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pHLE1BQU0sS0FBSyxHQUFHLElBQUksT0FBTyxDQUFVLE9BQU8sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2hHLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFBQyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNMLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyxNQUFNLEtBQUssQ0FBQztZQUNaLCtDQUErQztZQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBVSxPQUFPLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNqRyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDTCxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUM1QixRQUFRLDhCQUFzQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtpQkFDN0QsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2RCxNQUFNLE1BQU0sQ0FBQztZQUNiLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4QkFBOEIsRUFBRSxLQUFLO1FBQ3pDLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDdEQsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ3BELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN0QyxRQUFRLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDM0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUF1QixDQUFDLENBQUM7WUFDM0UsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakcsTUFBTSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQVUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDaEcsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxDQUFDO1lBQ1osK0NBQStDO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQVUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDakcsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDNUIsUUFBUSw4QkFBc0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUU7aUJBQzdELENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkQsTUFBTSxNQUFNLENBQUM7WUFDYixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4QkFBOEIsRUFBRSxLQUFLO1FBQ3pDLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDdEQsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ3BELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN0QyxRQUFRLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDM0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUF1QixDQUFDLENBQUM7WUFDM0UsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakcsTUFBTSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQVUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDaEcsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxDQUFDO1lBQ1osK0NBQStDO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNoQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDaEMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBVSxPQUFPLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNqRyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQTBCLENBQUMsVUFBVSxDQUFDO2dCQUM3RCxJQUFJLDJCQUEyQixDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7YUFDdEYsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDaEIsa0NBQWtDO1lBQ2xDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNqQixNQUFNLE1BQU0sQ0FBQztZQUNiLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUs7UUFDaEQsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDcEQsQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNwRCxFQUNELEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUMxQyxRQUFRLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDM0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUF1QixDQUFDLENBQUM7WUFDM0UsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakcsTUFBTSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQVUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDaEcsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxDQUFDO1lBQ1osTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUvQyxNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBVSxPQUFPLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNqRyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDTCxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sTUFBTSxDQUFDO1lBQ2IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUs7UUFDL0IsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDakQsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDaEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV0QyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztnQkFDM0IsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsaUJBQWlCLEVBQUU7b0JBQ2xCLElBQUksRUFBRSxFQUFFO29CQUNSLEtBQUssRUFBRTt3QkFDTixLQUFLLEVBQUUsQ0FBQzt3QkFDUixHQUFHLEVBQUUsQ0FBQztxQkFDTjtpQkFDRDthQUNELEVBQUU7Z0JBQ0YsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsaUJBQWlCLEVBQUU7b0JBQ2xCLElBQUksRUFBRSxFQUFFO29CQUNSLEtBQUssRUFBRTt3QkFDTixLQUFLLEVBQUUsQ0FBQzt3QkFDUixHQUFHLEVBQUUsQ0FBQztxQkFDTjtpQkFDRDthQUNELENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==