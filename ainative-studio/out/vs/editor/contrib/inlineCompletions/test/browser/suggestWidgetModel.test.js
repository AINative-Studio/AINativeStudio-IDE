/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { Range } from '../../../../common/core/range.js';
import { IEditorWorkerService } from '../../../../common/services/editorWorker.js';
import { GhostTextContext } from './utils.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { SuggestController } from '../../../suggest/browser/suggestController.js';
import { ISuggestMemoryService } from '../../../suggest/browser/suggestMemory.js';
import { withAsyncTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MockKeybindingService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { InMemoryStorageService, IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import assert from 'assert';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { InlineCompletionsController } from '../../browser/controller/inlineCompletionsController.js';
import { autorun } from '../../../../../base/common/observable.js';
import { setUnexpectedErrorHandler } from '../../../../../base/common/errors.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Suggest Widget Model', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        setUnexpectedErrorHandler(function (err) {
            throw err;
        });
    });
    // This test is skipped because the fix for this causes https://github.com/microsoft/vscode/issues/166023
    test.skip('Active', async () => {
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, }, async ({ editor, editorViewModel, context, model }) => {
            let last = undefined;
            const history = new Array();
            const d = autorun(reader => {
                /** @description debug */
                const selectedSuggestItem = !!model.debugGetSelectedSuggestItem().read(reader);
                if (last !== selectedSuggestItem) {
                    last = selectedSuggestItem;
                    history.push(last);
                }
            });
            context.keyboardType('h');
            const suggestController = editor.getContribution(SuggestController.ID);
            suggestController.triggerSuggest();
            await timeout(1000);
            assert.deepStrictEqual(history.splice(0), [false, true]);
            context.keyboardType('.');
            await timeout(1000);
            // No flicker here
            assert.deepStrictEqual(history.splice(0), []);
            suggestController.cancelSuggestWidget();
            await timeout(1000);
            assert.deepStrictEqual(history.splice(0), [false]);
            d.dispose();
        });
    });
    test('Ghost Text', async () => {
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, suggest: { preview: true } }, async ({ editor, editorViewModel, context, model }) => {
            context.keyboardType('h');
            const suggestController = editor.getContribution(SuggestController.ID);
            suggestController.triggerSuggest();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'h[ello]']);
            context.keyboardType('.');
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['h', 'hello.[hello]']);
            suggestController.cancelSuggestWidget();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['hello.']);
        });
    });
});
const provider = {
    _debugDisplayName: 'test',
    triggerCharacters: ['.'],
    async provideCompletionItems(model, pos) {
        const word = model.getWordAtPosition(pos);
        const range = word
            ? { startLineNumber: 1, startColumn: word.startColumn, endLineNumber: 1, endColumn: word.endColumn }
            : Range.fromPositions(pos);
        return {
            suggestions: [{
                    insertText: 'hello',
                    kind: 18 /* CompletionItemKind.Text */,
                    label: 'hello',
                    range,
                    commitCharacters: ['.'],
                }]
        };
    },
};
async function withAsyncTestCodeEditorAndInlineCompletionsModel(text, options, callback) {
    await runWithFakedTimers({ useFakeTimers: options.fakeClock }, async () => {
        const disposableStore = new DisposableStore();
        try {
            const serviceCollection = new ServiceCollection([ITelemetryService, NullTelemetryService], [ILogService, new NullLogService()], [IStorageService, disposableStore.add(new InMemoryStorageService())], [IKeybindingService, new MockKeybindingService()], [IEditorWorkerService, new class extends mock() {
                    computeWordRanges() {
                        return Promise.resolve({});
                    }
                }], [ISuggestMemoryService, new class extends mock() {
                    memorize() { }
                    select() { return 0; }
                }], [IMenuService, new class extends mock() {
                    createMenu() {
                        return new class extends mock() {
                            constructor() {
                                super(...arguments);
                                this.onDidChange = Event.None;
                            }
                            dispose() { }
                        };
                    }
                }], [ILabelService, new class extends mock() {
                }], [IWorkspaceContextService, new class extends mock() {
                }], [IAccessibilitySignalService, {
                    playSignal: async () => { },
                    isSoundEnabled(signal) { return false; },
                }]);
            if (options.provider) {
                const languageFeaturesService = new LanguageFeaturesService();
                serviceCollection.set(ILanguageFeaturesService, languageFeaturesService);
                disposableStore.add(languageFeaturesService.completionProvider.register({ pattern: '**' }, options.provider));
            }
            await withAsyncTestCodeEditor(text, { ...options, serviceCollection }, async (editor, editorViewModel, instantiationService) => {
                editor.registerAndInstantiateContribution(SnippetController2.ID, SnippetController2);
                editor.registerAndInstantiateContribution(SuggestController.ID, SuggestController);
                editor.registerAndInstantiateContribution(InlineCompletionsController.ID, InlineCompletionsController);
                const model = InlineCompletionsController.get(editor)?.model.get();
                const context = new GhostTextContext(model, editor);
                await callback({ editor, editorViewModel, model, context });
                context.dispose();
            });
        }
        finally {
            disposableStore.dispose();
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL3N1Z2dlc3RXaWRnZXRNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xGLE9BQU8sRUFBdUQsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxSSxPQUFPLEVBQVMsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFF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