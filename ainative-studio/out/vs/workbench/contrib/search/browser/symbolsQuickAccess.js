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
var SymbolsQuickAccessProvider_1;
import { localize } from '../../../../nls.js';
import { PickerQuickAccessProvider, TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { getWorkspaceSymbols } from '../common/search.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Schemas } from '../../../../base/common/network.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { getSelectionSearchString } from '../../../../editor/contrib/find/browser/findController.js';
import { prepareQuery, scoreFuzzy2, pieceToQuery } from '../../../../base/common/fuzzyScorer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let SymbolsQuickAccessProvider = class SymbolsQuickAccessProvider extends PickerQuickAccessProvider {
    static { SymbolsQuickAccessProvider_1 = this; }
    static { this.PREFIX = '#'; }
    static { this.TYPING_SEARCH_DELAY = 200; } // this delay accommodates for the user typing a word and then stops typing to start searching
    static { this.TREAT_AS_GLOBAL_SYMBOL_TYPES = new Set([
        4 /* SymbolKind.Class */,
        9 /* SymbolKind.Enum */,
        0 /* SymbolKind.File */,
        10 /* SymbolKind.Interface */,
        2 /* SymbolKind.Namespace */,
        3 /* SymbolKind.Package */,
        1 /* SymbolKind.Module */
    ]); }
    get defaultFilterValue() {
        // Prefer the word under the cursor in the active editor as default filter
        const editor = this.codeEditorService.getFocusedCodeEditor();
        if (editor) {
            return getSelectionSearchString(editor) ?? undefined;
        }
        return undefined;
    }
    constructor(labelService, openerService, editorService, configurationService, codeEditorService) {
        super(SymbolsQuickAccessProvider_1.PREFIX, {
            canAcceptInBackground: true,
            noResultsPick: {
                label: localize('noSymbolResults', "No matching workspace symbols")
            }
        });
        this.labelService = labelService;
        this.openerService = openerService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        this.delayer = this._register(new ThrottledDelayer(SymbolsQuickAccessProvider_1.TYPING_SEARCH_DELAY));
    }
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            openSideBySideDirection: editorConfig?.openSideBySideDirection
        };
    }
    _getPicks(filter, disposables, token) {
        return this.getSymbolPicks(filter, undefined, token);
    }
    async getSymbolPicks(filter, options, token) {
        return this.delayer.trigger(async () => {
            if (token.isCancellationRequested) {
                return [];
            }
            return this.doGetSymbolPicks(prepareQuery(filter), options, token);
        }, options?.delay);
    }
    async doGetSymbolPicks(query, options, token) {
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
        // Run the workspace symbol query
        const workspaceSymbols = await getWorkspaceSymbols(symbolQuery.original, token);
        if (token.isCancellationRequested) {
            return [];
        }
        const symbolPicks = [];
        // Convert to symbol picks and apply filtering
        const openSideBySideDirection = this.configuration.openSideBySideDirection;
        for (const { symbol, provider } of workspaceSymbols) {
            // Depending on the workspace symbols filter setting, skip over symbols that:
            // - do not have a container
            // - and are not treated explicitly as global symbols (e.g. classes)
            if (options?.skipLocal && !SymbolsQuickAccessProvider_1.TREAT_AS_GLOBAL_SYMBOL_TYPES.has(symbol.kind) && !!symbol.containerName) {
                continue;
            }
            const symbolLabel = symbol.name;
            const symbolLabelWithIcon = `$(${SymbolKinds.toIcon(symbol.kind).id}) ${symbolLabel}`;
            const symbolLabelIconOffset = symbolLabelWithIcon.length - symbolLabel.length;
            // Score by symbol label if searching
            let symbolScore = undefined;
            let symbolMatches = undefined;
            let skipContainerQuery = false;
            if (symbolQuery.original.length > 0) {
                // First: try to score on the entire query, it is possible that
                // the symbol matches perfectly (e.g. searching for "change log"
                // can be a match on a markdown symbol "change log"). In that
                // case we want to skip the container query altogether.
                if (symbolQuery !== query) {
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabelWithIcon, { ...query, values: undefined /* disable multi-query support */ }, 0, symbolLabelIconOffset);
                    if (typeof symbolScore === 'number') {
                        skipContainerQuery = true; // since we consumed the query, skip any container matching
                    }
                }
                // Otherwise: score on the symbol query and match on the container later
                if (typeof symbolScore !== 'number') {
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabelWithIcon, symbolQuery, 0, symbolLabelIconOffset);
                    if (typeof symbolScore !== 'number') {
                        continue;
                    }
                }
            }
            const symbolUri = symbol.location.uri;
            let containerLabel = undefined;
            if (symbolUri) {
                const containerPath = this.labelService.getUriLabel(symbolUri, { relative: true });
                if (symbol.containerName) {
                    containerLabel = `${symbol.containerName} • ${containerPath}`;
                }
                else {
                    containerLabel = containerPath;
                }
            }
            // Score by container if specified and searching
            let containerScore = undefined;
            let containerMatches = undefined;
            if (!skipContainerQuery && containerQuery && containerQuery.original.length > 0) {
                if (containerLabel) {
                    [containerScore, containerMatches] = scoreFuzzy2(containerLabel, containerQuery);
                }
                if (typeof containerScore !== 'number') {
                    continue;
                }
                if (typeof symbolScore === 'number') {
                    symbolScore += containerScore; // boost symbolScore by containerScore
                }
            }
            const deprecated = symbol.tags ? symbol.tags.indexOf(1 /* SymbolTag.Deprecated */) >= 0 : false;
            symbolPicks.push({
                symbol,
                resource: symbolUri,
                score: symbolScore,
                label: symbolLabelWithIcon,
                ariaLabel: symbolLabel,
                highlights: deprecated ? undefined : {
                    label: symbolMatches,
                    description: containerMatches
                },
                description: containerLabel,
                strikethrough: deprecated,
                buttons: [
                    {
                        iconClass: openSideBySideDirection === 'right' ? ThemeIcon.asClassName(Codicon.splitHorizontal) : ThemeIcon.asClassName(Codicon.splitVertical),
                        tooltip: openSideBySideDirection === 'right' ? localize('openToSide', "Open to the Side") : localize('openToBottom', "Open to the Bottom")
                    }
                ],
                trigger: (buttonIndex, keyMods) => {
                    this.openSymbol(provider, symbol, token, { keyMods, forceOpenSideBySide: true });
                    return TriggerAction.CLOSE_PICKER;
                },
                accept: async (keyMods, event) => this.openSymbol(provider, symbol, token, { keyMods, preserveFocus: event.inBackground, forcePinned: event.inBackground }),
            });
        }
        // Sort picks (unless disabled)
        if (!options?.skipSorting) {
            symbolPicks.sort((symbolA, symbolB) => this.compareSymbols(symbolA, symbolB));
        }
        return symbolPicks;
    }
    async openSymbol(provider, symbol, token, options) {
        // Resolve actual symbol to open for providers that can resolve
        let symbolToOpen = symbol;
        if (typeof provider.resolveWorkspaceSymbol === 'function') {
            symbolToOpen = await provider.resolveWorkspaceSymbol(symbol, token) || symbol;
            if (token.isCancellationRequested) {
                return;
            }
        }
        // Open HTTP(s) links with opener service
        if (symbolToOpen.location.uri.scheme === Schemas.http || symbolToOpen.location.uri.scheme === Schemas.https) {
            await this.openerService.open(symbolToOpen.location.uri, { fromUserGesture: true, allowContributedOpeners: true });
        }
        // Otherwise open as editor
        else {
            await this.editorService.openEditor({
                resource: symbolToOpen.location.uri,
                options: {
                    preserveFocus: options?.preserveFocus,
                    pinned: options.keyMods.ctrlCmd || options.forcePinned || this.configuration.openEditorPinned,
                    selection: symbolToOpen.location.range ? Range.collapseToStart(symbolToOpen.location.range) : undefined
                }
            }, options.keyMods.alt || (this.configuration.openEditorPinned && options.keyMods.ctrlCmd) || options?.forceOpenSideBySide ? SIDE_GROUP : ACTIVE_GROUP);
        }
    }
    compareSymbols(symbolA, symbolB) {
        // By score
        if (typeof symbolA.score === 'number' && typeof symbolB.score === 'number') {
            if (symbolA.score > symbolB.score) {
                return -1;
            }
            if (symbolA.score < symbolB.score) {
                return 1;
            }
        }
        // By name
        if (symbolA.symbol && symbolB.symbol) {
            const symbolAName = symbolA.symbol.name.toLowerCase();
            const symbolBName = symbolB.symbol.name.toLowerCase();
            const res = symbolAName.localeCompare(symbolBName);
            if (res !== 0) {
                return res;
            }
        }
        // By kind
        if (symbolA.symbol && symbolB.symbol) {
            const symbolAKind = SymbolKinds.toIcon(symbolA.symbol.kind).id;
            const symbolBKind = SymbolKinds.toIcon(symbolB.symbol.kind).id;
            return symbolAKind.localeCompare(symbolBKind);
        }
        return 0;
    }
};
SymbolsQuickAccessProvider = SymbolsQuickAccessProvider_1 = __decorate([
    __param(0, ILabelService),
    __param(1, IOpenerService),
    __param(2, IEditorService),
    __param(3, IConfigurationService),
    __param(4, ICodeEditorService)
], SymbolsQuickAccessProvider);
export { SymbolsQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9sc1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3N5bWJvbHNRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBMEIseUJBQXlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFHaEosT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUE4QyxNQUFNLHFCQUFxQixDQUFDO0FBQ3RHLE9BQU8sRUFBRSxXQUFXLEVBQXlCLE1BQU0sd0NBQXdDLENBQUM7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQWtCLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSx3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