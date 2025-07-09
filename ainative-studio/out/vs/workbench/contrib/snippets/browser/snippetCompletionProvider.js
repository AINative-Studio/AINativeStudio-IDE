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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbXBsZXRpb25Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL3NuaXBwZXRDb21wbGV0aW9uUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQWlCLE1BQU0sbUJBQW1CLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUVySCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUlwRixNQUFNLGlCQUFpQixHQUFHLHFCQUFxQixDQUFDO0FBRWhELGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxp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