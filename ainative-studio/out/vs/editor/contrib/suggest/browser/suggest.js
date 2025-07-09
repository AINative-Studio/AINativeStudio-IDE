/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CancellationError, isCancellationError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { FuzzyScore } from '../../../../base/common/filters.js';
import { DisposableStore, isDisposable } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { SnippetParser } from '../../snippet/browser/snippetParser.js';
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { historyNavigationVisible } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
export const Context = {
    Visible: historyNavigationVisible,
    HasFocusedSuggestion: new RawContextKey('suggestWidgetHasFocusedSuggestion', false, localize('suggestWidgetHasSelection', "Whether any suggestion is focused")),
    DetailsVisible: new RawContextKey('suggestWidgetDetailsVisible', false, localize('suggestWidgetDetailsVisible', "Whether suggestion details are visible")),
    MultipleSuggestions: new RawContextKey('suggestWidgetMultipleSuggestions', false, localize('suggestWidgetMultipleSuggestions', "Whether there are multiple suggestions to pick from")),
    MakesTextEdit: new RawContextKey('suggestionMakesTextEdit', true, localize('suggestionMakesTextEdit', "Whether inserting the current suggestion yields in a change or has everything already been typed")),
    AcceptSuggestionsOnEnter: new RawContextKey('acceptSuggestionOnEnter', true, localize('acceptSuggestionOnEnter', "Whether suggestions are inserted when pressing Enter")),
    HasInsertAndReplaceRange: new RawContextKey('suggestionHasInsertAndReplaceRange', false, localize('suggestionHasInsertAndReplaceRange', "Whether the current suggestion has insert and replace behaviour")),
    InsertMode: new RawContextKey('suggestionInsertMode', undefined, { type: 'string', description: localize('suggestionInsertMode', "Whether the default behaviour is to insert or replace") }),
    CanResolve: new RawContextKey('suggestionCanResolve', false, localize('suggestionCanResolve', "Whether the current suggestion supports to resolve further details")),
};
export const suggestWidgetStatusbarMenu = new MenuId('suggestWidgetStatusBar');
export class CompletionItem {
    constructor(position, completion, container, provider) {
        this.position = position;
        this.completion = completion;
        this.container = container;
        this.provider = provider;
        // validation
        this.isInvalid = false;
        // sorting, filtering
        this.score = FuzzyScore.Default;
        this.distance = 0;
        this.textLabel = typeof completion.label === 'string'
            ? completion.label
            : completion.label?.label;
        // ensure lower-variants (perf)
        this.labelLow = this.textLabel.toLowerCase();
        // validate label
        this.isInvalid = !this.textLabel;
        this.sortTextLow = completion.sortText && completion.sortText.toLowerCase();
        this.filterTextLow = completion.filterText && completion.filterText.toLowerCase();
        this.extensionId = completion.extensionId;
        // normalize ranges
        if (Range.isIRange(completion.range)) {
            this.editStart = new Position(completion.range.startLineNumber, completion.range.startColumn);
            this.editInsertEnd = new Position(completion.range.endLineNumber, completion.range.endColumn);
            this.editReplaceEnd = new Position(completion.range.endLineNumber, completion.range.endColumn);
            // validate range
            this.isInvalid = this.isInvalid
                || Range.spansMultipleLines(completion.range) || completion.range.startLineNumber !== position.lineNumber;
        }
        else {
            this.editStart = new Position(completion.range.insert.startLineNumber, completion.range.insert.startColumn);
            this.editInsertEnd = new Position(completion.range.insert.endLineNumber, completion.range.insert.endColumn);
            this.editReplaceEnd = new Position(completion.range.replace.endLineNumber, completion.range.replace.endColumn);
            // validate ranges
            this.isInvalid = this.isInvalid
                || Range.spansMultipleLines(completion.range.insert) || Range.spansMultipleLines(completion.range.replace)
                || completion.range.insert.startLineNumber !== position.lineNumber || completion.range.replace.startLineNumber !== position.lineNumber
                || completion.range.insert.startColumn !== completion.range.replace.startColumn;
        }
        // create the suggestion resolver
        if (typeof provider.resolveCompletionItem !== 'function') {
            this._resolveCache = Promise.resolve();
            this._resolveDuration = 0;
        }
    }
    // ---- resolving
    get isResolved() {
        return this._resolveDuration !== undefined;
    }
    get resolveDuration() {
        return this._resolveDuration !== undefined ? this._resolveDuration : -1;
    }
    async resolve(token) {
        if (!this._resolveCache) {
            const sub = token.onCancellationRequested(() => {
                this._resolveCache = undefined;
                this._resolveDuration = undefined;
            });
            const sw = new StopWatch(true);
            this._resolveCache = Promise.resolve(this.provider.resolveCompletionItem(this.completion, token)).then(value => {
                Object.assign(this.completion, value);
                this._resolveDuration = sw.elapsed();
            }, err => {
                if (isCancellationError(err)) {
                    // the IPC queue will reject the request with the
                    // cancellation error -> reset cached
                    this._resolveCache = undefined;
                    this._resolveDuration = undefined;
                }
            }).finally(() => {
                sub.dispose();
            });
        }
        return this._resolveCache;
    }
}
export var SnippetSortOrder;
(function (SnippetSortOrder) {
    SnippetSortOrder[SnippetSortOrder["Top"] = 0] = "Top";
    SnippetSortOrder[SnippetSortOrder["Inline"] = 1] = "Inline";
    SnippetSortOrder[SnippetSortOrder["Bottom"] = 2] = "Bottom";
})(SnippetSortOrder || (SnippetSortOrder = {}));
export class CompletionOptions {
    static { this.default = new CompletionOptions(); }
    constructor(snippetSortOrder = 2 /* SnippetSortOrder.Bottom */, kindFilter = new Set(), providerFilter = new Set(), providerItemsToReuse = new Map(), showDeprecated = true) {
        this.snippetSortOrder = snippetSortOrder;
        this.kindFilter = kindFilter;
        this.providerFilter = providerFilter;
        this.providerItemsToReuse = providerItemsToReuse;
        this.showDeprecated = showDeprecated;
    }
}
let _snippetSuggestSupport;
export function getSnippetSuggestSupport() {
    return _snippetSuggestSupport;
}
export function setSnippetSuggestSupport(support) {
    const old = _snippetSuggestSupport;
    _snippetSuggestSupport = support;
    return old;
}
export class CompletionItemModel {
    constructor(items, needsClipboard, durations, disposable) {
        this.items = items;
        this.needsClipboard = needsClipboard;
        this.durations = durations;
        this.disposable = disposable;
    }
}
export async function provideSuggestionItems(registry, model, position, options = CompletionOptions.default, context = { triggerKind: 0 /* languages.CompletionTriggerKind.Invoke */ }, token = CancellationToken.None) {
    const sw = new StopWatch();
    position = position.clone();
    const word = model.getWordAtPosition(position);
    const defaultReplaceRange = word ? new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn) : Range.fromPositions(position);
    const defaultRange = { replace: defaultReplaceRange, insert: defaultReplaceRange.setEndPosition(position.lineNumber, position.column) };
    const result = [];
    const disposables = new DisposableStore();
    const durations = [];
    let needsClipboard = false;
    const onCompletionList = (provider, container, sw) => {
        let didAddResult = false;
        if (!container) {
            return didAddResult;
        }
        for (const suggestion of container.suggestions) {
            if (!options.kindFilter.has(suggestion.kind)) {
                // skip if not showing deprecated suggestions
                if (!options.showDeprecated && suggestion?.tags?.includes(1 /* languages.CompletionItemTag.Deprecated */)) {
                    continue;
                }
                // fill in default range when missing
                if (!suggestion.range) {
                    suggestion.range = defaultRange;
                }
                // fill in default sortText when missing
                if (!suggestion.sortText) {
                    suggestion.sortText = typeof suggestion.label === 'string' ? suggestion.label : suggestion.label.label;
                }
                if (!needsClipboard && suggestion.insertTextRules && suggestion.insertTextRules & 4 /* languages.CompletionItemInsertTextRule.InsertAsSnippet */) {
                    needsClipboard = SnippetParser.guessNeedsClipboard(suggestion.insertText);
                }
                result.push(new CompletionItem(position, suggestion, container, provider));
                didAddResult = true;
            }
        }
        if (isDisposable(container)) {
            disposables.add(container);
        }
        durations.push({
            providerName: provider._debugDisplayName ?? 'unknown_provider', elapsedProvider: container.duration ?? -1, elapsedOverall: sw.elapsed()
        });
        return didAddResult;
    };
    // ask for snippets in parallel to asking "real" providers. Only do something if configured to
    // do so - no snippet filter, no special-providers-only request
    const snippetCompletions = (async () => {
        if (!_snippetSuggestSupport || options.kindFilter.has(27 /* languages.CompletionItemKind.Snippet */)) {
            return;
        }
        // we have items from a previous session that we can reuse
        const reuseItems = options.providerItemsToReuse.get(_snippetSuggestSupport);
        if (reuseItems) {
            reuseItems.forEach(item => result.push(item));
            return;
        }
        if (options.providerFilter.size > 0 && !options.providerFilter.has(_snippetSuggestSupport)) {
            return;
        }
        const sw = new StopWatch();
        const list = await _snippetSuggestSupport.provideCompletionItems(model, position, context, token);
        onCompletionList(_snippetSuggestSupport, list, sw);
    })();
    // add suggestions from contributed providers - providers are ordered in groups of
    // equal score and once a group produces a result the process stops
    // get provider groups, always add snippet suggestion provider
    for (const providerGroup of registry.orderedGroups(model)) {
        // for each support in the group ask for suggestions
        let didAddResult = false;
        await Promise.all(providerGroup.map(async (provider) => {
            // we have items from a previous session that we can reuse
            if (options.providerItemsToReuse.has(provider)) {
                const items = options.providerItemsToReuse.get(provider);
                items.forEach(item => result.push(item));
                didAddResult = didAddResult || items.length > 0;
                return;
            }
            // check if this provider is filtered out
            if (options.providerFilter.size > 0 && !options.providerFilter.has(provider)) {
                return;
            }
            try {
                const sw = new StopWatch();
                const list = await provider.provideCompletionItems(model, position, context, token);
                didAddResult = onCompletionList(provider, list, sw) || didAddResult;
            }
            catch (err) {
                onUnexpectedExternalError(err);
            }
        }));
        if (didAddResult || token.isCancellationRequested) {
            break;
        }
    }
    await snippetCompletions;
    if (token.isCancellationRequested) {
        disposables.dispose();
        return Promise.reject(new CancellationError());
    }
    return new CompletionItemModel(result.sort(getSuggestionComparator(options.snippetSortOrder)), needsClipboard, { entries: durations, elapsed: sw.elapsed() }, disposables);
}
function defaultComparator(a, b) {
    // check with 'sortText'
    if (a.sortTextLow && b.sortTextLow) {
        if (a.sortTextLow < b.sortTextLow) {
            return -1;
        }
        else if (a.sortTextLow > b.sortTextLow) {
            return 1;
        }
    }
    // check with 'label'
    if (a.textLabel < b.textLabel) {
        return -1;
    }
    else if (a.textLabel > b.textLabel) {
        return 1;
    }
    // check with 'type'
    return a.completion.kind - b.completion.kind;
}
function snippetUpComparator(a, b) {
    if (a.completion.kind !== b.completion.kind) {
        if (a.completion.kind === 27 /* languages.CompletionItemKind.Snippet */) {
            return -1;
        }
        else if (b.completion.kind === 27 /* languages.CompletionItemKind.Snippet */) {
            return 1;
        }
    }
    return defaultComparator(a, b);
}
function snippetDownComparator(a, b) {
    if (a.completion.kind !== b.completion.kind) {
        if (a.completion.kind === 27 /* languages.CompletionItemKind.Snippet */) {
            return 1;
        }
        else if (b.completion.kind === 27 /* languages.CompletionItemKind.Snippet */) {
            return -1;
        }
    }
    return defaultComparator(a, b);
}
const _snippetComparators = new Map();
_snippetComparators.set(0 /* SnippetSortOrder.Top */, snippetUpComparator);
_snippetComparators.set(2 /* SnippetSortOrder.Bottom */, snippetDownComparator);
_snippetComparators.set(1 /* SnippetSortOrder.Inline */, defaultComparator);
export function getSuggestionComparator(snippetConfig) {
    return _snippetComparators.get(snippetConfig);
}
CommandsRegistry.registerCommand('_executeCompletionItemProvider', async (accessor, ...args) => {
    const [uri, position, triggerCharacter, maxItemsToResolve] = args;
    assertType(URI.isUri(uri));
    assertType(Position.isIPosition(position));
    assertType(typeof triggerCharacter === 'string' || !triggerCharacter);
    assertType(typeof maxItemsToResolve === 'number' || !maxItemsToResolve);
    const { completionProvider } = accessor.get(ILanguageFeaturesService);
    const ref = await accessor.get(ITextModelService).createModelReference(uri);
    try {
        const result = {
            incomplete: false,
            suggestions: []
        };
        const resolving = [];
        const actualPosition = ref.object.textEditorModel.validatePosition(position);
        const completions = await provideSuggestionItems(completionProvider, ref.object.textEditorModel, actualPosition, undefined, { triggerCharacter: triggerCharacter ?? undefined, triggerKind: triggerCharacter ? 1 /* languages.CompletionTriggerKind.TriggerCharacter */ : 0 /* languages.CompletionTriggerKind.Invoke */ });
        for (const item of completions.items) {
            if (resolving.length < (maxItemsToResolve ?? 0)) {
                resolving.push(item.resolve(CancellationToken.None));
            }
            result.incomplete = result.incomplete || item.container.incomplete;
            result.suggestions.push(item.completion);
        }
        try {
            await Promise.all(resolving);
            return result;
        }
        finally {
            setTimeout(() => completions.disposable.dispose(), 100);
        }
    }
    finally {
        ref.dispose();
    }
});
export function showSimpleSuggestions(editor, provider) {
    editor.getContribution('editor.contrib.suggestController')?.triggerSuggest(new Set().add(provider), undefined, true);
}
export class QuickSuggestionsOptions {
    static isAllOff(config) {
        return config.other === 'off' && config.comments === 'off' && config.strings === 'off';
    }
    static isAllOn(config) {
        return config.other === 'on' && config.comments === 'on' && config.strings === 'on';
    }
    static valueFor(config, tokenType) {
        switch (tokenType) {
            case 1 /* StandardTokenType.Comment */: return config.comments;
            case 2 /* StandardTokenType.String */: return config.strings;
            default: return config.other;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvc3VnZ2VzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBSXRELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVy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