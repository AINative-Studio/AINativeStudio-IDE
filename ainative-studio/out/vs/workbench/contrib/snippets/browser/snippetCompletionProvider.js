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
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { compare, compareSubstring } from '../../../../base/common/strings.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { SnippetParser } from '../../../../editor/contrib/snippet/browser/snippetParser.js';
import { localize } from '../../../../nls.js';
import { ISnippetsService } from './snippets.js';
import { Snippet } from './snippetsFile.js';
import { isPatternInWord } from '../../../../base/common/filters.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
const markSnippetAsUsed = '_snippet.markAsUsed';
CommandsRegistry.registerCommand(markSnippetAsUsed, (accessor, ...args) => {
    const snippetsService = accessor.get(ISnippetsService);
    const [first] = args;
    if (first instanceof Snippet) {
        snippetsService.updateUsageTimestamp(first);
    }
});
export class SnippetCompletion {
    constructor(snippet, range) {
        this.snippet = snippet;
        this.label = { label: snippet.prefix, description: snippet.name };
        this.detail = localize('detail.snippet', "{0} ({1})", snippet.description || snippet.name, snippet.source);
        this.insertText = snippet.codeSnippet;
        this.extensionId = snippet.extensionId;
        this.range = range;
        this.sortText = `${snippet.snippetSource === 3 /* SnippetSource.Extension */ ? 'z' : 'a'}-${snippet.prefix}`;
        this.kind = 27 /* CompletionItemKind.Snippet */;
        this.insertTextRules = 4 /* CompletionItemInsertTextRule.InsertAsSnippet */;
        this.command = { id: markSnippetAsUsed, title: '', arguments: [snippet] };
    }
    resolve() {
        this.documentation = new MarkdownString().appendCodeblock('', SnippetParser.asInsertText(this.snippet.codeSnippet));
        return this;
    }
    static compareByLabel(a, b) {
        return compare(a.label.label, b.label.label);
    }
}
let SnippetCompletionProvider = class SnippetCompletionProvider {
    constructor(_languageService, _snippets, _languageConfigurationService) {
        this._languageService = _languageService;
        this._snippets = _snippets;
        this._languageConfigurationService = _languageConfigurationService;
        this._debugDisplayName = 'snippetCompletions';
        //
    }
    async provideCompletionItems(model, position, context) {
        const sw = new StopWatch();
        // compute all snippet anchors: word starts and every non word character
        const line = position.lineNumber;
        const word = model.getWordAtPosition(position) ?? { startColumn: position.column, endColumn: position.column, word: '' };
        const lineContentLow = model.getLineContent(position.lineNumber).toLowerCase();
        const lineContentWithWordLow = lineContentLow.substring(0, word.startColumn + word.word.length - 1);
        const anchors = this._computeSnippetPositions(model, line, word, lineContentWithWordLow);
        // loop over possible snippets and match them against the anchors
        const columnOffset = position.column - 1;
        const triggerCharacterLow = context.triggerCharacter?.toLowerCase() ?? '';
        const languageId = this._getLanguageIdAtPosition(model, position);
        const languageConfig = this._languageConfigurationService.getLanguageConfiguration(languageId);
        const snippets = new Set(await this._snippets.getSnippets(languageId));
        const suggestions = [];
        for (const snippet of snippets) {
            if (context.triggerKind === 1 /* CompletionTriggerKind.TriggerCharacter */ && !snippet.prefixLow.startsWith(triggerCharacterLow)) {
                // strict -> when having trigger characters they must prefix-match
                continue;
            }
            let candidate;
            for (const anchor of anchors) {
                if (anchor.prefixLow.match(/^\s/) && !snippet.prefixLow.match(/^\s/)) {
                    // only allow whitespace anchor when snippet prefix starts with whitespace too
                    continue;
                }
                if (isPatternInWord(anchor.prefixLow, 0, anchor.prefixLow.length, snippet.prefixLow, 0, snippet.prefixLow.length)) {
                    candidate = anchor;
                    break;
                }
            }
            if (!candidate) {
                continue;
            }
            const pos = candidate.startColumn - 1;
            const prefixRestLen = snippet.prefixLow.length - (columnOffset - pos);
            const endsWithPrefixRest = compareSubstring(lineContentLow, snippet.prefixLow, columnOffset, columnOffset + prefixRestLen, columnOffset - pos);
            const startPosition = position.with(undefined, pos + 1);
            let endColumn = endsWithPrefixRest === 0 ? position.column + prefixRestLen : position.column;
            // First check if there is anything to the right of the cursor
            if (columnOffset < lineContentLow.length) {
                const autoClosingPairs = languageConfig.getAutoClosingPairs();
                const standardAutoClosingPairConditionals = autoClosingPairs.autoClosingPairsCloseSingleChar.get(lineContentLow[columnOffset]);
                // If the character to the right of the cursor is a closing character of an autoclosing pair
                if (standardAutoClosingPairConditionals?.some(p => 
                // and the start position is the opening character of an autoclosing pair
                p.open === lineContentLow[startPosition.column - 1] &&
                    // and the snippet prefix contains the opening and closing pair at its edges
                    snippet.prefix.startsWith(p.open) &&
                    snippet.prefix[snippet.prefix.length - 1] === p.close)) {
                    // Eat the character that was likely inserted because of auto-closing pairs
                    endColumn++;
                }
            }
            const replace = Range.fromPositions({ lineNumber: line, column: candidate.startColumn }, { lineNumber: line, column: endColumn });
            const insert = replace.setEndPosition(line, position.column);
            suggestions.push(new SnippetCompletion(snippet, { replace, insert }));
            snippets.delete(snippet);
        }
        // add remaing snippets when the current prefix ends in whitespace or when line is empty
        // and when not having a trigger character
        if (!triggerCharacterLow && (/\s/.test(lineContentLow[position.column - 2]) /*end in whitespace */ || !lineContentLow /*empty line*/)) {
            for (const snippet of snippets) {
                const insert = Range.fromPositions(position);
                const replace = lineContentLow.indexOf(snippet.prefixLow, columnOffset) === columnOffset ? insert.setEndPosition(position.lineNumber, position.column + snippet.prefixLow.length) : insert;
                suggestions.push(new SnippetCompletion(snippet, { replace, insert }));
            }
        }
        // dismbiguate suggestions with same labels
        this._disambiguateSnippets(suggestions);
        return {
            suggestions,
            duration: sw.elapsed()
        };
    }
    _disambiguateSnippets(suggestions) {
        suggestions.sort(SnippetCompletion.compareByLabel);
        for (let i = 0; i < suggestions.length; i++) {
            const item = suggestions[i];
            let to = i + 1;
            for (; to < suggestions.length && item.label === suggestions[to].label; to++) {
                suggestions[to].label.label = localize('snippetSuggest.longLabel', "{0}, {1}", suggestions[to].label.label, suggestions[to].snippet.name);
            }
            if (to > i + 1) {
                suggestions[i].label.label = localize('snippetSuggest.longLabel', "{0}, {1}", suggestions[i].label.label, suggestions[i].snippet.name);
                i = to;
            }
        }
    }
    resolveCompletionItem(item) {
        return (item instanceof SnippetCompletion) ? item.resolve() : item;
    }
    _computeSnippetPositions(model, line, word, lineContentWithWordLow) {
        const result = [];
        for (let column = 1; column < word.startColumn; column++) {
            const wordInfo = model.getWordAtPosition(new Position(line, column));
            result.push({
                startColumn: column,
                prefixLow: lineContentWithWordLow.substring(column - 1),
                isWord: Boolean(wordInfo)
            });
            if (wordInfo) {
                column = wordInfo.endColumn;
                // the character right after a word is an anchor, always
                result.push({
                    startColumn: wordInfo.endColumn,
                    prefixLow: lineContentWithWordLow.substring(wordInfo.endColumn - 1),
                    isWord: false
                });
            }
        }
        if (word.word.length > 0 || result.length === 0) {
            result.push({
                startColumn: word.startColumn,
                prefixLow: lineContentWithWordLow.substring(word.startColumn - 1),
                isWord: true
            });
        }
        return result;
    }
    _getLanguageIdAtPosition(model, position) {
        // validate the `languageId` to ensure this is a user
        // facing language with a name and the chance to have
        // snippets, else fall back to the outer language
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        let languageId = model.getLanguageIdAtPosition(position.lineNumber, position.column);
        if (!this._languageService.getLanguageName(languageId)) {
            languageId = model.getLanguageId();
        }
        return languageId;
    }
};
SnippetCompletionProvider = __decorate([
    __param(0, ILanguageService),
    __param(1, ISnippetsService),
    __param(2, ILanguageConfigurationService)
], SnippetCompletionProvider);
export { SnippetCompletionProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbXBsZXRpb25Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvc25pcHBldENvbXBsZXRpb25Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBaUIsTUFBTSxtQkFBbUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBRXJILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBSXBGLE1BQU0saUJBQWlCLEdBQUcscUJBQXFCLENBQUM7QUFFaEQsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGlC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