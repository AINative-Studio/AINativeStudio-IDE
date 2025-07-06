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
var AbstractGotoSymbolQuickAccessProvider_1;
import { DeferredPromise } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { pieceToQuery, prepareQuery, scoreFuzzy2 } from '../../../../base/common/fuzzyScorer.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { format, trim } from '../../../../base/common/strings.js';
import { Range } from '../../../common/core/range.js';
import { SymbolKinds, getAriaLabelForSymbol } from '../../../common/languages.js';
import { IOutlineModelService } from '../../documentSymbols/browser/outlineModel.js';
import { AbstractEditorNavigationQuickAccessProvider } from './editorNavigationQuickAccess.js';
import { localize } from '../../../../nls.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { findLast } from '../../../../base/common/arraysFind.js';
let AbstractGotoSymbolQuickAccessProvider = class AbstractGotoSymbolQuickAccessProvider extends AbstractEditorNavigationQuickAccessProvider {
    static { AbstractGotoSymbolQuickAccessProvider_1 = this; }
    static { this.PREFIX = '@'; }
    static { this.SCOPE_PREFIX = ':'; }
    static { this.PREFIX_BY_CATEGORY = `${this.PREFIX}${this.SCOPE_PREFIX}`; }
    constructor(_languageFeaturesService, _outlineModelService, options = Object.create(null)) {
        super(options);
        this._languageFeaturesService = _languageFeaturesService;
        this._outlineModelService = _outlineModelService;
        this.options = options;
        this.options.canAcceptInBackground = true;
    }
    provideWithoutTextEditor(picker) {
        this.provideLabelPick(picker, localize('cannotRunGotoSymbolWithoutEditor', "To go to a symbol, first open a text editor with symbol information."));
        return Disposable.None;
    }
    provideWithTextEditor(context, picker, token, runOptions) {
        const editor = context.editor;
        const model = this.getModel(editor);
        if (!model) {
            return Disposable.None;
        }
        // Provide symbols from model if available in registry
        if (this._languageFeaturesService.documentSymbolProvider.has(model)) {
            return this.doProvideWithEditorSymbols(context, model, picker, token, runOptions);
        }
        // Otherwise show an entry for a model without registry
        // But give a chance to resolve the symbols at a later
        // point if possible
        return this.doProvideWithoutEditorSymbols(context, model, picker, token);
    }
    doProvideWithoutEditorSymbols(context, model, picker, token) {
        const disposables = new DisposableStore();
        // Generic pick for not having any symbol information
        this.provideLabelPick(picker, localize('cannotRunGotoSymbolWithoutSymbolProvider', "The active text editor does not provide symbol information."));
        // Wait for changes to the registry and see if eventually
        // we do get symbols. This can happen if the picker is opened
        // very early after the model has loaded but before the
        // language registry is ready.
        // https://github.com/microsoft/vscode/issues/70607
        (async () => {
            const result = await this.waitForLanguageSymbolRegistry(model, disposables);
            if (!result || token.isCancellationRequested) {
                return;
            }
            disposables.add(this.doProvideWithEditorSymbols(context, model, picker, token));
        })();
        return disposables;
    }
    provideLabelPick(picker, label) {
        picker.items = [{ label, index: 0, kind: 14 /* SymbolKind.String */ }];
        picker.ariaLabel = label;
    }
    async waitForLanguageSymbolRegistry(model, disposables) {
        if (this._languageFeaturesService.documentSymbolProvider.has(model)) {
            return true;
        }
        const symbolProviderRegistryPromise = new DeferredPromise();
        // Resolve promise when registry knows model
        const symbolProviderListener = disposables.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => {
            if (this._languageFeaturesService.documentSymbolProvider.has(model)) {
                symbolProviderListener.dispose();
                symbolProviderRegistryPromise.complete(true);
            }
        }));
        // Resolve promise when we get disposed too
        disposables.add(toDisposable(() => symbolProviderRegistryPromise.complete(false)));
        return symbolProviderRegistryPromise.p;
    }
    doProvideWithEditorSymbols(context, model, picker, token, runOptions) {
        const editor = context.editor;
        const disposables = new DisposableStore();
        // Goto symbol once picked
        disposables.add(picker.onDidAccept(event => {
            const [item] = picker.selectedItems;
            if (item && item.range) {
                this.gotoLocation(context, { range: item.range.selection, keyMods: picker.keyMods, preserveFocus: event.inBackground });
                runOptions?.handleAccept?.(item, event.inBackground);
                if (!event.inBackground) {
                    picker.hide();
                }
            }
        }));
        // Goto symbol side by side if enabled
        disposables.add(picker.onDidTriggerItemButton(({ item }) => {
            if (item && item.range) {
                this.gotoLocation(context, { range: item.range.selection, keyMods: picker.keyMods, forceSideBySide: true });
                picker.hide();
            }
        }));
        // Resolve symbols from document once and reuse this
        // request for all filtering and typing then on
        const symbolsPromise = this.getDocumentSymbols(model, token);
        // Set initial picks and update on type
        const picksCts = disposables.add(new MutableDisposable());
        const updatePickerItems = async (positionToEnclose) => {
            // Cancel any previous ask for picks and busy
            picksCts?.value?.cancel();
            picker.busy = false;
            // Create new cancellation source for this run
            picksCts.value = new CancellationTokenSource();
            // Collect symbol picks
            picker.busy = true;
            try {
                const query = prepareQuery(picker.value.substr(AbstractGotoSymbolQuickAccessProvider_1.PREFIX.length).trim());
                const items = await this.doGetSymbolPicks(symbolsPromise, query, undefined, picksCts.value.token, model);
                if (token.isCancellationRequested) {
                    return;
                }
                if (items.length > 0) {
                    picker.items = items;
                    if (positionToEnclose && query.original.length === 0) {
                        const candidate = findLast(items, item => Boolean(item.type !== 'separator' && item.range && Range.containsPosition(item.range.decoration, positionToEnclose)));
                        if (candidate) {
                            picker.activeItems = [candidate];
                        }
                    }
                }
                else {
                    if (query.original.length > 0) {
                        this.provideLabelPick(picker, localize('noMatchingSymbolResults', "No matching editor symbols"));
                    }
                    else {
                        this.provideLabelPick(picker, localize('noSymbolResults', "No editor symbols"));
                    }
                }
            }
            finally {
                if (!token.isCancellationRequested) {
                    picker.busy = false;
                }
            }
        };
        disposables.add(picker.onDidChangeValue(() => updatePickerItems(undefined)));
        updatePickerItems(editor.getSelection()?.getPosition());
        // Reveal and decorate when active item changes
        disposables.add(picker.onDidChangeActive(() => {
            const [item] = picker.activeItems;
            if (item && item.range) {
                // Reveal
                editor.revealRangeInCenter(item.range.selection, 0 /* ScrollType.Smooth */);
                // Decorate
                this.addDecorations(editor, item.range.decoration);
            }
        }));
        return disposables;
    }
    async doGetSymbolPicks(symbolsPromise, query, options, token, model) {
        const symbols = await symbolsPromise;
        if (token.isCancellationRequested) {
            return [];
        }
        const filterBySymbolKind = query.original.indexOf(AbstractGotoSymbolQuickAccessProvider_1.SCOPE_PREFIX) === 0;
        const filterPos = filterBySymbolKind ? 1 : 0;
        // Split between symbol and container query
        let symbolQuery;
        let containerQuery;
        if (query.values && query.values.length > 1) {
            symbolQuery = pieceToQuery(query.values[0]); // symbol: only match on first part
            containerQuery = pieceToQuery(query.values.slice(1)); // container: match on all but first parts
        }
        else {
            symbolQuery = query;
        }
        // Convert to symbol picks and apply filtering
        let buttons;
        const openSideBySideDirection = this.options?.openSideBySideDirection?.();
        if (openSideBySideDirection) {
            buttons = [{
                    iconClass: openSideBySideDirection === 'right' ? ThemeIcon.asClassName(Codicon.splitHorizontal) : ThemeIcon.asClassName(Codicon.splitVertical),
                    tooltip: openSideBySideDirection === 'right' ? localize('openToSide', "Open to the Side") : localize('openToBottom', "Open to the Bottom")
                }];
        }
        const filteredSymbolPicks = [];
        for (let index = 0; index < symbols.length; index++) {
            const symbol = symbols[index];
            const symbolLabel = trim(symbol.name);
            const symbolLabelWithIcon = `$(${SymbolKinds.toIcon(symbol.kind).id}) ${symbolLabel}`;
            const symbolLabelIconOffset = symbolLabelWithIcon.length - symbolLabel.length;
            let containerLabel = symbol.containerName;
            if (options?.extraContainerLabel) {
                if (containerLabel) {
                    containerLabel = `${options.extraContainerLabel} • ${containerLabel}`;
                }
                else {
                    containerLabel = options.extraContainerLabel;
                }
            }
            let symbolScore = undefined;
            let symbolMatches = undefined;
            let containerScore = undefined;
            let containerMatches = undefined;
            if (query.original.length > filterPos) {
                // First: try to score on the entire query, it is possible that
                // the symbol matches perfectly (e.g. searching for "change log"
                // can be a match on a markdown symbol "change log"). In that
                // case we want to skip the container query altogether.
                let skipContainerQuery = false;
                if (symbolQuery !== query) {
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabelWithIcon, { ...query, values: undefined /* disable multi-query support */ }, filterPos, symbolLabelIconOffset);
                    if (typeof symbolScore === 'number') {
                        skipContainerQuery = true; // since we consumed the query, skip any container matching
                    }
                }
                // Otherwise: score on the symbol query and match on the container later
                if (typeof symbolScore !== 'number') {
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabelWithIcon, symbolQuery, filterPos, symbolLabelIconOffset);
                    if (typeof symbolScore !== 'number') {
                        continue;
                    }
                }
                // Score by container if specified
                if (!skipContainerQuery && containerQuery) {
                    if (containerLabel && containerQuery.original.length > 0) {
                        [containerScore, containerMatches] = scoreFuzzy2(containerLabel, containerQuery);
                    }
                    if (typeof containerScore !== 'number') {
                        continue;
                    }
                    if (typeof symbolScore === 'number') {
                        symbolScore += containerScore; // boost symbolScore by containerScore
                    }
                }
            }
            const deprecated = symbol.tags && symbol.tags.indexOf(1 /* SymbolTag.Deprecated */) >= 0;
            filteredSymbolPicks.push({
                index,
                kind: symbol.kind,
                score: symbolScore,
                label: symbolLabelWithIcon,
                ariaLabel: getAriaLabelForSymbol(symbol.name, symbol.kind),
                description: containerLabel,
                highlights: deprecated ? undefined : {
                    label: symbolMatches,
                    description: containerMatches
                },
                range: {
                    selection: Range.collapseToStart(symbol.selectionRange),
                    decoration: symbol.range
                },
                uri: model.uri,
                symbolName: symbolLabel,
                strikethrough: deprecated,
                buttons
            });
        }
        // Sort by score
        const sortedFilteredSymbolPicks = filteredSymbolPicks.sort((symbolA, symbolB) => filterBySymbolKind ?
            this.compareByKindAndScore(symbolA, symbolB) :
            this.compareByScore(symbolA, symbolB));
        // Add separator for types
        // - @  only total number of symbols
        // - @: grouped by symbol kind
        let symbolPicks = [];
        if (filterBySymbolKind) {
            let lastSymbolKind = undefined;
            let lastSeparator = undefined;
            let lastSymbolKindCounter = 0;
            function updateLastSeparatorLabel() {
                if (lastSeparator && typeof lastSymbolKind === 'number' && lastSymbolKindCounter > 0) {
                    lastSeparator.label = format(NLS_SYMBOL_KIND_CACHE[lastSymbolKind] || FALLBACK_NLS_SYMBOL_KIND, lastSymbolKindCounter);
                }
            }
            for (const symbolPick of sortedFilteredSymbolPicks) {
                // Found new kind
                if (lastSymbolKind !== symbolPick.kind) {
                    // Update last separator with number of symbols we found for kind
                    updateLastSeparatorLabel();
                    lastSymbolKind = symbolPick.kind;
                    lastSymbolKindCounter = 1;
                    // Add new separator for new kind
                    lastSeparator = { type: 'separator' };
                    symbolPicks.push(lastSeparator);
                }
                // Existing kind, keep counting
                else {
                    lastSymbolKindCounter++;
                }
                // Add to final result
                symbolPicks.push(symbolPick);
            }
            // Update last separator with number of symbols we found for kind
            updateLastSeparatorLabel();
        }
        else if (sortedFilteredSymbolPicks.length > 0) {
            symbolPicks = [
                { label: localize('symbols', "symbols ({0})", filteredSymbolPicks.length), type: 'separator' },
                ...sortedFilteredSymbolPicks
            ];
        }
        return symbolPicks;
    }
    compareByScore(symbolA, symbolB) {
        if (typeof symbolA.score !== 'number' && typeof symbolB.score === 'number') {
            return 1;
        }
        else if (typeof symbolA.score === 'number' && typeof symbolB.score !== 'number') {
            return -1;
        }
        if (typeof symbolA.score === 'number' && typeof symbolB.score === 'number') {
            if (symbolA.score > symbolB.score) {
                return -1;
            }
            else if (symbolA.score < symbolB.score) {
                return 1;
            }
        }
        if (symbolA.index < symbolB.index) {
            return -1;
        }
        else if (symbolA.index > symbolB.index) {
            return 1;
        }
        return 0;
    }
    compareByKindAndScore(symbolA, symbolB) {
        const kindA = NLS_SYMBOL_KIND_CACHE[symbolA.kind] || FALLBACK_NLS_SYMBOL_KIND;
        const kindB = NLS_SYMBOL_KIND_CACHE[symbolB.kind] || FALLBACK_NLS_SYMBOL_KIND;
        // Sort by type first if scoped search
        const result = kindA.localeCompare(kindB);
        if (result === 0) {
            return this.compareByScore(symbolA, symbolB);
        }
        return result;
    }
    async getDocumentSymbols(document, token) {
        const model = await this._outlineModelService.getOrCreate(document, token);
        return token.isCancellationRequested ? [] : model.asListOfDocumentSymbols();
    }
};
AbstractGotoSymbolQuickAccessProvider = AbstractGotoSymbolQuickAccessProvider_1 = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IOutlineModelService)
], AbstractGotoSymbolQuickAccessProvider);
export { AbstractGotoSymbolQuickAccessProvider };
// #region NLS Helpers
const FALLBACK_NLS_SYMBOL_KIND = localize('property', "properties ({0})");
const NLS_SYMBOL_KIND_CACHE = {
    [5 /* SymbolKind.Method */]: localize('method', "methods ({0})"),
    [11 /* SymbolKind.Function */]: localize('function', "functions ({0})"),
    [8 /* SymbolKind.Constructor */]: localize('_constructor', "constructors ({0})"),
    [12 /* SymbolKind.Variable */]: localize('variable', "variables ({0})"),
    [4 /* SymbolKind.Class */]: localize('class', "classes ({0})"),
    [22 /* SymbolKind.Struct */]: localize('struct', "structs ({0})"),
    [23 /* SymbolKind.Event */]: localize('event', "events ({0})"),
    [24 /* SymbolKind.Operator */]: localize('operator', "operators ({0})"),
    [10 /* SymbolKind.Interface */]: localize('interface', "interfaces ({0})"),
    [2 /* SymbolKind.Namespace */]: localize('namespace', "namespaces ({0})"),
    [3 /* SymbolKind.Package */]: localize('package', "packages ({0})"),
    [25 /* SymbolKind.TypeParameter */]: localize('typeParameter', "type parameters ({0})"),
    [1 /* SymbolKind.Module */]: localize('modules', "modules ({0})"),
    [6 /* SymbolKind.Property */]: localize('property', "properties ({0})"),
    [9 /* SymbolKind.Enum */]: localize('enum', "enumerations ({0})"),
    [21 /* SymbolKind.EnumMember */]: localize('enumMember', "enumeration members ({0})"),
    [14 /* SymbolKind.String */]: localize('string', "strings ({0})"),
    [0 /* SymbolKind.File */]: localize('file', "files ({0})"),
    [17 /* SymbolKind.Array */]: localize('array', "arrays ({0})"),
    [15 /* SymbolKind.Number */]: localize('number', "numbers ({0})"),
    [16 /* SymbolKind.Boolean */]: localize('boolean', "booleans ({0})"),
    [18 /* SymbolKind.Object */]: localize('object', "objects ({0})"),
    [19 /* SymbolKind.Key */]: localize('key', "keys ({0})"),
    [7 /* SymbolKind.Field */]: localize('field', "fields ({0})"),
    [13 /* SymbolKind.Constant */]: localize('constant', "constants ({0})")
};
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b1N5bWJvbFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcXVpY2tBY2Nlc3MvYnJvd3Nlci9nb3RvU3ltYm9sUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQWtCLFlBQVksRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakgsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakksT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHOUQsT0FBTyxFQUE4QixXQUFXLEVBQWEscUJBQXFCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsMkNBQTJDLEVBQXNFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkssT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXhG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