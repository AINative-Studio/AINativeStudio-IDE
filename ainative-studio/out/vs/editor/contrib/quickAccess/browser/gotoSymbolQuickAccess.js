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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b1N5bWJvbFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3F1aWNrQWNjZXNzL2Jyb3dzZXIvZ290b1N5bWJvbFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUFrQixZQUFZLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRzlELE9BQU8sRUFBOEIsV0FBVyxFQUFhLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDckYsT0FBTyxFQUFFLDJDQUEyQyxFQUFzRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25LLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV4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