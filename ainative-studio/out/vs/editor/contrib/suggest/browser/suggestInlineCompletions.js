/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { FuzzyScore } from '../../../../base/common/filters.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, RefCountedDisposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Range } from '../../../common/core/range.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { CompletionModel, LineContext } from './completionModel.js';
import { CompletionOptions, provideSuggestionItems, QuickSuggestionsOptions } from './suggest.js';
import { ISuggestMemoryService } from './suggestMemory.js';
import { SuggestModel } from './suggestModel.js';
import { WordDistance } from './wordDistance.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
class SuggestInlineCompletion {
    constructor(range, insertText, filterText, additionalTextEdits, command, action, completion) {
        this.range = range;
        this.insertText = insertText;
        this.filterText = filterText;
        this.additionalTextEdits = additionalTextEdits;
        this.command = command;
        this.action = action;
        this.completion = completion;
    }
}
let InlineCompletionResults = class InlineCompletionResults extends RefCountedDisposable {
    constructor(model, line, word, completionModel, completions, _suggestMemoryService) {
        super(completions.disposable);
        this.model = model;
        this.line = line;
        this.word = word;
        this.completionModel = completionModel;
        this._suggestMemoryService = _suggestMemoryService;
    }
    canBeReused(model, line, word) {
        return this.model === model // same model
            && this.line === line
            && this.word.word.length > 0
            && this.word.startColumn === word.startColumn && this.word.endColumn < word.endColumn // same word
            && this.completionModel.getIncompleteProvider().size === 0; // no incomplete results
    }
    get items() {
        const result = [];
        // Split items by preselected index. This ensures the memory-selected item shows first and that better/worst
        // ranked items are before/after
        const { items } = this.completionModel;
        const selectedIndex = this._suggestMemoryService.select(this.model, { lineNumber: this.line, column: this.word.endColumn + this.completionModel.lineContext.characterCountDelta }, items);
        const first = Iterable.slice(items, selectedIndex);
        const second = Iterable.slice(items, 0, selectedIndex);
        let resolveCount = 5;
        for (const item of Iterable.concat(first, second)) {
            if (item.score === FuzzyScore.Default) {
                // skip items that have no overlap
                continue;
            }
            const range = new Range(item.editStart.lineNumber, item.editStart.column, item.editInsertEnd.lineNumber, item.editInsertEnd.column + this.completionModel.lineContext.characterCountDelta // end PLUS character delta
            );
            const insertText = item.completion.insertTextRules && (item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */)
                ? { snippet: item.completion.insertText }
                : item.completion.insertText;
            result.push(new SuggestInlineCompletion(range, insertText, item.filterTextLow ?? item.labelLow, item.completion.additionalTextEdits, item.completion.command, item.completion.action, item));
            // resolve the first N suggestions eagerly
            if (resolveCount-- >= 0) {
                item.resolve(CancellationToken.None);
            }
        }
        return result;
    }
};
InlineCompletionResults = __decorate([
    __param(5, ISuggestMemoryService)
], InlineCompletionResults);
let SuggestInlineCompletions = class SuggestInlineCompletions extends Disposable {
    constructor(_languageFeatureService, _clipboardService, _suggestMemoryService, _editorService) {
        super();
        this._languageFeatureService = _languageFeatureService;
        this._clipboardService = _clipboardService;
        this._suggestMemoryService = _suggestMemoryService;
        this._editorService = _editorService;
        this._store.add(_languageFeatureService.inlineCompletionsProvider.register('*', this));
    }
    async provideInlineCompletions(model, position, context, token) {
        if (context.selectedSuggestionInfo) {
            return;
        }
        let editor;
        for (const candidate of this._editorService.listCodeEditors()) {
            if (candidate.getModel() === model) {
                editor = candidate;
                break;
            }
        }
        if (!editor) {
            return;
        }
        const config = editor.getOption(94 /* EditorOption.quickSuggestions */);
        if (QuickSuggestionsOptions.isAllOff(config)) {
            // quick suggest is off (for this model/language)
            return;
        }
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        const lineTokens = model.tokenization.getLineTokens(position.lineNumber);
        const tokenType = lineTokens.getStandardTokenType(lineTokens.findTokenIndexAtOffset(Math.max(position.column - 1 - 1, 0)));
        if (QuickSuggestionsOptions.valueFor(config, tokenType) !== 'inline') {
            // quick suggest is off (for this token)
            return undefined;
        }
        // We consider non-empty leading words and trigger characters. The latter only
        // when no word is being typed (word characters superseed trigger characters)
        let wordInfo = model.getWordAtPosition(position);
        let triggerCharacterInfo;
        if (!wordInfo?.word) {
            triggerCharacterInfo = this._getTriggerCharacterInfo(model, position);
        }
        if (!wordInfo?.word && !triggerCharacterInfo) {
            // not at word, not a trigger character
            return;
        }
        // ensure that we have word information and that we are at the end of a word
        // otherwise we stop because we don't want to do quick suggestions inside words
        if (!wordInfo) {
            wordInfo = model.getWordUntilPosition(position);
        }
        if (wordInfo.endColumn !== position.column) {
            return;
        }
        let result;
        const leadingLineContents = model.getValueInRange(new Range(position.lineNumber, 1, position.lineNumber, position.column));
        if (!triggerCharacterInfo && this._lastResult?.canBeReused(model, position.lineNumber, wordInfo)) {
            // reuse a previous result iff possible, only a refilter is needed
            // TODO@jrieken this can be improved further and only incomplete results can be updated
            // console.log(`REUSE with ${wordInfo.word}`);
            const newLineContext = new LineContext(leadingLineContents, position.column - this._lastResult.word.endColumn);
            this._lastResult.completionModel.lineContext = newLineContext;
            this._lastResult.acquire();
            result = this._lastResult;
        }
        else {
            // refesh model is required
            const completions = await provideSuggestionItems(this._languageFeatureService.completionProvider, model, position, new CompletionOptions(undefined, SuggestModel.createSuggestFilter(editor).itemKind, triggerCharacterInfo?.providers), triggerCharacterInfo && { triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */, triggerCharacter: triggerCharacterInfo.ch }, token);
            let clipboardText;
            if (completions.needsClipboard) {
                clipboardText = await this._clipboardService.readText();
            }
            const completionModel = new CompletionModel(completions.items, position.column, new LineContext(leadingLineContents, 0), WordDistance.None, editor.getOption(123 /* EditorOption.suggest */), editor.getOption(117 /* EditorOption.snippetSuggestions */), { boostFullMatch: false, firstMatchCanBeWeak: false }, clipboardText);
            result = new InlineCompletionResults(model, position.lineNumber, wordInfo, completionModel, completions, this._suggestMemoryService);
        }
        this._lastResult = result;
        return result;
    }
    handleItemDidShow(_completions, item) {
        item.completion.resolve(CancellationToken.None);
    }
    freeInlineCompletions(result) {
        result.release();
    }
    _getTriggerCharacterInfo(model, position) {
        const ch = model.getValueInRange(Range.fromPositions({ lineNumber: position.lineNumber, column: position.column - 1 }, position));
        const providers = new Set();
        for (const provider of this._languageFeatureService.completionProvider.all(model)) {
            if (provider.triggerCharacters?.includes(ch)) {
                providers.add(provider);
            }
        }
        if (providers.size === 0) {
            return undefined;
        }
        return { providers, ch };
    }
};
SuggestInlineCompletions = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IClipboardService),
    __param(2, ISuggestMemoryService),
    __param(3, ICodeEditorService)
], SuggestInlineCompletions);
export { SuggestInlineCompletions };
registerEditorFeature(SuggestInlineCompletions);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdElubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3N1Z2dlc3RJbmxpbmVDb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUlwRixPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNwRSxPQUFPLEVBQXVDLGlCQUFpQixFQUFFLHNCQUFzQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3ZJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDakQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0s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