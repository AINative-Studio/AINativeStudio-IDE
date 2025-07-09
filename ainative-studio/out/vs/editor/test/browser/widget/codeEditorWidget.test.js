/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { withTestCodeEditor } from '../testCodeEditor.js';
suite('CodeEditorWidget', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('onDidChangeModelDecorations', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            let invoked = false;
            disposables.add(editor.onDidChangeModelDecorations((e) => {
                invoked = true;
            }));
            viewModel.model.deltaDecorations([], [{ range: new Range(1, 1, 1, 1), options: { description: 'test' } }]);
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('onDidChangeModelLanguage', () => {
        withTestCodeEditor('', {}, (editor, viewModel, instantiationService) => {
            const languageService = instantiationService.get(ILanguageService);
            const disposables = new DisposableStore();
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            let invoked = false;
            disposables.add(editor.onDidChangeModelLanguage((e) => {
                invoked = true;
            }));
            viewModel.model.setLanguage('testMode');
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('onDidChangeModelLanguageConfiguration', () => {
        withTestCodeEditor('', {}, (editor, viewModel, instantiationService) => {
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const languageService = instantiationService.get(ILanguageService);
            const disposables = new DisposableStore();
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            viewModel.model.setLanguage('testMode');
            let invoked = false;
            disposables.add(editor.onDidChangeModelLanguageConfiguration((e) => {
                invoked = true;
            }));
            disposables.add(languageConfigurationService.register('testMode', {
                brackets: [['(', ')']]
            }));
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('onDidChangeModelContent', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            let invoked = false;
            disposables.add(editor.onDidChangeModelContent((e) => {
                invoked = true;
            }));
            viewModel.type('hello', 'test');
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('onDidChangeModelOptions', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            let invoked = false;
            disposables.add(editor.onDidChangeModelOptions((e) => {
                invoked = true;
            }));
            viewModel.model.updateOptions({
                tabSize: 3
            });
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('issue #145872 - Model change events are emitted before the selection updates', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            let observedSelection = null;
            disposables.add(editor.onDidChangeModelContent((e) => {
                observedSelection = editor.getSelection();
            }));
            viewModel.type('hello', 'test');
            assert.deepStrictEqual(observedSelection, new Selection(1, 6, 1, 6));
            disposables.dispose();
        });
    });
    test('monaco-editor issue #2774 - Wrong order of events onDidChangeModelContent and onDidChangeCursorSelection on redo', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            const calls = [];
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            viewModel.type('a', 'test');
            viewModel.model.undo();
            viewModel.model.redo();
            assert.deepStrictEqual(calls, [
                'contentchange(a, 0, 0)',
                'cursorchange(1, 2)',
                'contentchange(, 0, 1)',
                'cursorchange(1, 1)',
                'contentchange(a, 0, 0)',
                'cursorchange(1, 2)'
            ]);
            disposables.dispose();
        });
    });
    test('issue #146174: Events delivered out of order when adding decorations in content change listener (1 of 2)', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            const calls = [];
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`listener1 - contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`listener1 - cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`listener2 - contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`listener2 - cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            viewModel.type('a', 'test');
            assert.deepStrictEqual(calls, ([
                'listener1 - contentchange(a, 0, 0)',
                'listener2 - contentchange(a, 0, 0)',
                'listener1 - cursorchange(1, 2)',
                'listener2 - cursorchange(1, 2)',
            ]));
            disposables.dispose();
        });
    });
    test('issue #146174: Events delivered out of order when adding decorations in content change listener (2 of 2)', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            const calls = [];
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`listener1 - contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
                editor.changeDecorations((changeAccessor) => {
                    changeAccessor.deltaDecorations([], [{ range: new Range(1, 1, 1, 1), options: { description: 'test' } }]);
                });
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`listener1 - cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`listener2 - contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`listener2 - cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            viewModel.type('a', 'test');
            assert.deepStrictEqual(calls, ([
                'listener1 - contentchange(a, 0, 0)',
                'listener2 - contentchange(a, 0, 0)',
                'listener1 - cursorchange(1, 2)',
                'listener2 - cursorchange(1, 2)',
            ]));
            disposables.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvcldpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvd2lkZ2V0L2NvZGVFZGl0b3JXaWRnZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDM0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFMUQsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUU5Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNoRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBRTFDLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNwQixXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUN4RCxPQUFPLEdBQUcsSUFB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