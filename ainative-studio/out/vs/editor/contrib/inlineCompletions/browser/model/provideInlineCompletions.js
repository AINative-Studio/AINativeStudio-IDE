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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZUlubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9wcm92aWRlSW5saW5lQ29tcGxldGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFckUsT0FBTyxFQUFxSSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR2pOLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RH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