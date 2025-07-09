/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { SuggestInlineCompletions } from '../../browser/suggestInlineCompletions.js';
import { ISuggestMemoryService } from '../../browser/suggestMemory.js';
import { createCodeEditorServices, instantiateTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
suite('Suggest Inline Completions', function () {
    const disposables = new DisposableStore();
    const services = new ServiceCollection([ISuggestMemoryService, new class extends mock() {
            select() {
                return 0;
            }
        }]);
    let insta;
    let model;
    let editor;
    setup(function () {
        insta = createCodeEditorServices(disposables, services);
        model = createTextModel('he', undefined, undefined, URI.from({ scheme: 'foo', path: 'foo.bar' }));
        editor = instantiateTestCodeEditor(insta, model);
        editor.updateOptions({ quickSuggestions: { comments: 'inline', strings: 'inline', other: 'inline' } });
        insta.invokeFunction(accessor => {
            disposables.add(accessor.get(ILanguageFeaturesService).completionProvider.register({ pattern: '*.bar', scheme: 'foo' }, new class {
                constructor() {
                    this._debugDisplayName = 'test';
                }
                provideCompletionItems(model, position, context, token) {
                    const word = model.getWordUntilPosition(position);
                    const range = new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                    const suggestions = [];
                    suggestions.push({ insertText: 'hello', label: 'hello', range, kind: 5 /* CompletionItemKind.Class */ });
                    suggestions.push({ insertText: 'hell', label: 'hell', range, kind: 5 /* CompletionItemKind.Class */ });
                    suggestions.push({ insertText: 'hey', label: 'hey', range, kind: 27 /* CompletionItemKind.Snippet */ });
                    return { suggestions };
                }
            }));
        });
    });
    teardown(function () {
        disposables.clear();
        model.dispose();
        editor.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    const context = { triggerKind: InlineCompletionTriggerKind.Explicit, selectedSuggestionInfo: undefined, includeInlineCompletions: true, includeInlineEdits: false };
    test('Aggressive inline completions when typing within line #146948', async function () {
        const completions = disposables.add(insta.createInstance(SuggestInlineCompletions));
        {
            // (1,3), end of word -> suggestions
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 3);
            completions.freeInlineCompletions(result);
        }
        {
            // (1,2), middle of word -> NO suggestions
            const result = await completions.provideInlineCompletions(model, new Position(1, 2), context, CancellationToken.None);
            assert.ok(result === undefined);
        }
    });
    test('Snippets show in inline suggestions even though they are turned off #175190', async function () {
        const completions = disposables.add(insta.createInstance(SuggestInlineCompletions));
        {
            // unfiltered
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 3);
            completions.freeInlineCompletions(result);
        }
        {
            // filtered
            editor.updateOptions({ suggest: { showSnippets: false } });
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 2);
            completions.freeInlineCompletions(result);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdElubGluZUNvbXBsZXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvc3VnZ2VzdElubGluZUNvbXBsZXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUEwSCwyQkFBMkIsRUFBa0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUd0TixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUseUJBQXlCLEVBQW1CLE1BQU0sNENBQTRDLENBQUM7QUFDbEksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIs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