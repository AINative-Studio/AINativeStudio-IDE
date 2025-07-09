/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { AsyncIterableObject, DeferredPromise } from '../../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { SetMap } from '../../../../../base/common/map.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { SingleOffsetEdit } from '../../../../common/core/offsetEdit.js';
import { OffsetRange } from '../../../../common/core/offsetRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { fixBracketsInLine } from '../../../../common/model/bracketPairsTextModelPart/fixBrackets.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { SnippetParser, Text } from '../../../snippet/browser/snippetParser.js';
import { getReadonlyEmptyArray } from '../utils.js';
export async function provideInlineCompletions(registry, positionOrRange, model, context, baseToken = CancellationToken.None, languageConfigurationService) {
    const requestUuid = generateUuid();
    const tokenSource = new CancellationTokenSource(baseToken);
    const token = tokenSource.token;
    const contextWithUuid = { ...context, requestUuid: requestUuid };
    const defaultReplaceRange = positionOrRange instanceof Position ? getDefaultRange(positionOrRange, model) : positionOrRange;
    const providers = registry.all(model);
    const multiMap = new SetMap();
    for (const provider of providers) {
        if (provider.groupId) {
            multiMap.add(provider.groupId, provider);
        }
    }
    function getPreferredProviders(provider) {
        if (!provider.yieldsToGroupIds) {
            return [];
        }
        const result = [];
        for (const groupId of provider.yieldsToGroupIds || []) {
            const providers = multiMap.get(groupId);
            for (const p of providers) {
                result.push(p);
            }
        }
        return result;
    }
    const states = new Map();
    const seen = new Set();
    function findPreferredProviderCircle(provider, stack) {
        stack = [...stack, provider];
        if (seen.has(provider)) {
            return stack;
        }
        seen.add(provider);
        try {
            const preferred = getPreferredProviders(provider);
            for (const p of preferred) {
                const c = findPreferredProviderCircle(p, stack);
                if (c) {
                    return c;
                }
            }
        }
        finally {
            seen.delete(provider);
        }
        return undefined;
    }
    function queryProviderOrPreferredProvider(provider) {
        const state = states.get(provider);
        if (state) {
            return state;
        }
        const circle = findPreferredProviderCircle(provider, []);
        if (circle) {
            onUnexpectedExternalError(new Error(`Inline completions: cyclic yield-to dependency detected.`
                + ` Path: ${circle.map(s => s.toString ? s.toString() : ('' + s)).join(' -> ')}`));
        }
        const deferredPromise = new DeferredPromise();
        states.set(provider, deferredPromise.p);
        (async () => {
            if (!circle) {
                const preferred = getPreferredProviders(provider);
                for (const p of preferred) {
                    const result = await queryProviderOrPreferredProvider(p);
                    if (result && result.inlineCompletions.items.length > 0) {
                        // Skip provider
                        return undefined;
                    }
                }
            }
            return query(provider);
        })().then(c => deferredPromise.complete(c), e => deferredPromise.error(e));
        return deferredPromise.p;
    }
    async function query(provider) {
        let result;
        try {
            if (positionOrRange instanceof Position) {
                result = await provider.provideInlineCompletions(model, positionOrRange, contextWithUuid, token);
            }
            else {
                result = await provider.provideInlineEditsForRange?.(model, positionOrRange, contextWithUuid, token);
            }
        }
        catch (e) {
            onUnexpectedExternalError(e);
            return undefined;
        }
        if (!result) {
            return undefined;
        }
        const list = new InlineCompletionList(result, provider);
        runWhenCancelled(token, () => list.removeRef());
        return list;
    }
    const inlineCompletionLists = AsyncIterableObject.fromPromisesResolveOrder(providers.map(queryProviderOrPreferredProvider));
    if (token.isCancellationRequested) {
        tokenSource.dispose(true);
        // result has been disposed before we could call addRef! So we have to discard everything.
        return new InlineCompletionProviderResult([], new Set(), []);
    }
    const result = await addRefAndCreateResult(contextWithUuid, inlineCompletionLists, defaultReplaceRange, model, languageConfigurationService);
    tokenSource.dispose(true); // This disposes results that are not referenced.
    return result;
}
/** If the token does not leak, this will not leak either. */
function runWhenCancelled(token, callback) {
    if (token.isCancellationRequested) {
        callback();
        return Disposable.None;
    }
    else {
        const listener = token.onCancellationRequested(() => {
            listener.dispose();
            callback();
        });
        return { dispose: () => listener.dispose() };
    }
}
// TODO: check cancellation token!
async function addRefAndCreateResult(context, inlineCompletionLists, defaultReplaceRange, model, languageConfigurationService) {
    // for deduplication
    const itemsByHash = new Map();
    let shouldStop = false;
    const lists = [];
    for await (const completions of inlineCompletionLists) {
        if (!completions) {
            continue;
        }
        completions.addRef();
        lists.push(completions);
        for (const item of completions.inlineCompletions.items) {
            if (!context.includeInlineEdits && (item.isInlineEdit || item.showInlineEditMenu)) {
                continue;
            }
            if (!context.includeInlineCompletions && !(item.isInlineEdit || item.showInlineEditMenu)) {
                continue;
            }
            const inlineCompletionItem = InlineCompletionItem.from(item, completions, defaultReplaceRange, model, languageConfigurationService);
            itemsByHash.set(inlineCompletionItem.hash(), inlineCompletionItem);
            // Stop after first visible inline completion
            if (!(item.isInlineEdit || item.showInlineEditMenu) && context.triggerKind === InlineCompletionTriggerKind.Automatic) {
                const minifiedEdit = inlineCompletionItem.toSingleTextEdit().removeCommonPrefix(new TextModelText(model));
                if (!minifiedEdit.isEmpty) {
                    shouldStop = true;
                }
            }
        }
        if (shouldStop) {
            break;
        }
    }
    return new InlineCompletionProviderResult(Array.from(itemsByHash.values()), new Set(itemsByHash.keys()), lists);
}
export class InlineCompletionProviderResult {
    constructor(
    /**
     * Free of duplicates.
     */
    completions, hashs, providerResults) {
        this.completions = completions;
        this.hashs = hashs;
        this.providerResults = providerResults;
    }
    has(item) {
        return this.hashs.has(item.hash());
    }
    // TODO: This is not complete as it does not take the textmodel into account
    isEmpty() {
        return this.completions.length === 0
            || this.completions.every(c => c.range.isEmpty() && c.insertText.length === 0);
    }
    dispose() {
        for (const result of this.providerResults) {
            result.removeRef();
        }
    }
}
/**
 * A ref counted pointer to the computed `InlineCompletions` and the `InlineCompletionsProvider` that
 * computed them.
 */
export class InlineCompletionList {
    constructor(inlineCompletions, provider) {
        this.inlineCompletions = inlineCompletions;
        this.provider = provider;
        this.refCount = 1;
    }
    addRef() {
        this.refCount++;
    }
    removeRef() {
        this.refCount--;
        if (this.refCount === 0) {
            this.provider.freeInlineCompletions(this.inlineCompletions);
        }
    }
}
export class InlineCompletionItem {
    static from(inlineCompletion, source, defaultReplaceRange, textModel, languageConfigurationService) {
        let insertText;
        let snippetInfo;
        let range = inlineCompletion.range ? Range.lift(inlineCompletion.range) : defaultReplaceRange;
        if (typeof inlineCompletion.insertText === 'string') {
            insertText = inlineCompletion.insertText;
            if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
                insertText = closeBrackets(insertText, range.getStartPosition(), textModel, languageConfigurationService);
                // Modify range depending on if brackets are added or removed
                const diff = insertText.length - inlineCompletion.insertText.length;
                if (diff !== 0) {
                    range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
                }
            }
            snippetInfo = undefined;
        }
        else if ('snippet' in inlineCompletion.insertText) {
            const preBracketCompletionLength = inlineCompletion.insertText.snippet.length;
            if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
                inlineCompletion.insertText.snippet = closeBrackets(inlineCompletion.insertText.snippet, range.getStartPosition(), textModel, languageConfigurationService);
                // Modify range depending on if brackets are added or removed
                const diff = inlineCompletion.insertText.snippet.length - preBracketCompletionLength;
                if (diff !== 0) {
                    range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
                }
            }
            const snippet = new SnippetParser().parse(inlineCompletion.insertText.snippet);
            if (snippet.children.length === 1 && snippet.children[0] instanceof Text) {
                insertText = snippet.children[0].value;
                snippetInfo = undefined;
            }
            else {
                insertText = snippet.toString();
                snippetInfo = {
                    snippet: inlineCompletion.insertText.snippet,
                    range: range
                };
            }
        }
        else {
            assertNever(inlineCompletion.insertText);
        }
        return new InlineCompletionItem(insertText, inlineCompletion.command, inlineCompletion.shownCommand, inlineCompletion.action, range, insertText, snippetInfo, Range.lift(inlineCompletion.showRange) ?? undefined, inlineCompletion.additionalTextEdits || getReadonlyEmptyArray(), inlineCompletion, source);
    }
    static { this.ID = 1; }
    constructor(filterText, command, 
    /** @deprecated. Use handleItemDidShow */
    shownCommand, action, range, insertText, snippetInfo, cursorShowRange, additionalTextEdits, 
    /**
     * A reference to the original inline completion this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
    */
    sourceInlineCompletion, 
    /**
     * A reference to the original inline completion list this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
    */
    source, id = `InlineCompletion:${InlineCompletionItem.ID++}`) {
        this.filterText = filterText;
        this.command = command;
        this.shownCommand = shownCommand;
        this.action = action;
        this.range = range;
        this.insertText = insertText;
        this.snippetInfo = snippetInfo;
        this.cursorShowRange = cursorShowRange;
        this.additionalTextEdits = additionalTextEdits;
        this.sourceInlineCompletion = sourceInlineCompletion;
        this.source = source;
        this.id = id;
        this._didCallShow = false;
    }
    get isInlineEdit() {
        return this.sourceInlineCompletion.isInlineEdit;
    }
    get didShow() {
        return this._didCallShow;
    }
    markAsShown() {
        this._didCallShow = true;
    }
    withRangeInsertTextAndFilterText(updatedRange, updatedInsertText, updatedFilterText) {
        return new InlineCompletionItem(updatedFilterText, this.command, this.shownCommand, this.action, updatedRange, updatedInsertText, this.snippetInfo, this.cursorShowRange, this.additionalTextEdits, this.sourceInlineCompletion, this.source, this.id);
    }
    hash() {
        return JSON.stringify({ insertText: this.insertText, range: this.range.toString() });
    }
    toSingleTextEdit() {
        return new SingleTextEdit(this.range, this.insertText);
    }
}
function getDefaultRange(position, model) {
    const word = model.getWordAtPosition(position);
    const maxColumn = model.getLineMaxColumn(position.lineNumber);
    // By default, always replace up until the end of the current line.
    // This default might be subject to change!
    return word
        ? new Range(position.lineNumber, word.startColumn, position.lineNumber, maxColumn)
        : Range.fromPositions(position, position.with(undefined, maxColumn));
}
function closeBrackets(text, position, model, languageConfigurationService) {
    const currentLine = model.getLineContent(position.lineNumber);
    const edit = SingleOffsetEdit.replace(new OffsetRange(position.column - 1, currentLine.length), text);
    const proposedLineTokens = model.tokenization.tokenizeLinesAt(position.lineNumber, [edit.apply(currentLine)]);
    const textTokens = proposedLineTokens?.[0].sliceZeroCopy(edit.getRangeAfterApply());
    if (!textTokens) {
        return text;
    }
    const fixedText = fixBracketsInLine(textTokens, languageConfigurationService);
    return fixedText;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZUlubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvcHJvdmlkZUlubGluZUNvbXBsZXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXJFLE9BQU8sRUFBcUksMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUdqTixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0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