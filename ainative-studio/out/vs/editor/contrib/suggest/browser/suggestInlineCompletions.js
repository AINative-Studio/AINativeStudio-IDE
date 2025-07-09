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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdElubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0SW5saW5lQ29tcGxldGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFJcEYsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDcEUsT0FBTyxFQUF1QyxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2SSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFN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