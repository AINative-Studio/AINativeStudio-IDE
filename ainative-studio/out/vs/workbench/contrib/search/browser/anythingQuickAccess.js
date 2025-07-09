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
var AnythingQuickAccessProvider_1;
import './media/anythingQuickAccess.css';
import { quickPickItemScorerAccessor, QuickPickItemScorerAccessor, QuickInputHideReason, IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider, TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { prepareQuery, compareItemsByFuzzyScore, scoreItemFuzzy } from '../../../../base/common/fuzzyScorer.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { getOutOfWorkspaceEditorResources, extractRangeFromFilter } from '../common/search.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { untildify } from '../../../../base/common/labels.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { URI } from '../../../../base/common/uri.js';
import { toLocalResource, dirname, basenameOrAuthority } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { DisposableStore, toDisposable, MutableDisposable, Disposable } from '../../../../base/common/lifecycle.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorResourceAccessor, isEditorInput } from '../../../common/editor.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { top } from '../../../../base/common/arrays.js';
import { FileQueryCacheState } from '../common/cacheState.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { Schemas } from '../../../../base/common/network.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { SymbolsQuickAccessProvider } from './symbolsQuickAccess.js';
import { DefaultQuickAccessFilterValue, Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { PickerEditorState } from '../../../browser/quickaccess.js';
import { GotoSymbolQuickAccessProvider } from '../../codeEditor/browser/quickaccess/gotoSymbolQuickAccess.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { Event } from '../../../../base/common/event.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ASK_QUICK_QUESTION_ACTION_ID } from '../../chat/browser/actions/chatQuickInputActions.js';
import { IQuickChatService } from '../../chat/browser/chat.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
function isEditorSymbolQuickPickItem(pick) {
    const candidate = pick;
    return !!candidate?.range && !!candidate.resource;
}
let AnythingQuickAccessProvider = class AnythingQuickAccessProvider extends PickerQuickAccessProvider {
    static { AnythingQuickAccessProvider_1 = this; }
    static { this.PREFIX = ''; }
    static { this.NO_RESULTS_PICK = {
        label: localize('noAnythingResults', "No matching results")
    }; }
    static { this.MAX_RESULTS = 512; }
    static { this.TYPING_SEARCH_DELAY = 200; } // this delay accommodates for the user typing a word and then stops typing to start searching
    static { this.SYMBOL_PICKS_MERGE_DELAY = 200; } // allow some time to merge fast and slow picks to reduce flickering
    get defaultFilterValue() {
        if (this.configuration.preserveInput) {
            return DefaultQuickAccessFilterValue.LAST;
        }
        return undefined;
    }
    constructor(instantiationService, searchService, contextService, pathService, environmentService, fileService, labelService, modelService, languageService, workingCopyService, configurationService, editorService, historyService, filesConfigurationService, textModelService, uriIdentityService, quickInputService, keybindingService, quickChatService, logService, customEditorLabelService) {
        super(AnythingQuickAccessProvider_1.PREFIX, {
            canAcceptInBackground: true,
            noResultsPick: AnythingQuickAccessProvider_1.NO_RESULTS_PICK
        });
        this.instantiationService = instantiationService;
        this.searchService = searchService;
        this.contextService = contextService;
        this.pathService = pathService;
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.labelService = labelService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.workingCopyService = workingCopyService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.historyService = historyService;
        this.filesConfigurationService = filesConfigurationService;
        this.textModelService = textModelService;
        this.uriIdentityService = uriIdentityService;
        this.quickInputService = quickInputService;
        this.keybindingService = keybindingService;
        this.quickChatService = quickChatService;
        this.logService = logService;
        this.customEditorLabelService = customEditorLabelService;
        this.pickState = this._register(new class extends Disposable {
            constructor(provider, instantiationService) {
                super();
                this.provider = provider;
                this.instantiationService = instantiationService;
                this.picker = undefined;
                this.editorViewState = this._register(this.instantiationService.createInstance(PickerEditorState));
                this.scorerCache = Object.create(null);
                this.fileQueryCache = undefined;
                this.lastOriginalFilter = undefined;
                this.lastFilter = undefined;
                this.lastRange = undefined;
                this.lastGlobalPicks = undefined;
                this.isQuickNavigating = undefined;
            }
            set(picker) {
                // Picker for this run
                this.picker = picker;
                Event.once(picker.onDispose)(() => {
                    if (picker === this.picker) {
                        this.picker = undefined; // clear the picker when disposed to not keep it in memory for too long
                    }
                });
                // Caches
                const isQuickNavigating = !!picker.quickNavigate;
                if (!isQuickNavigating) {
                    this.fileQueryCache = this.provider.createFileQueryCache();
                    this.scorerCache = Object.create(null);
                }
                // Other
                this.isQuickNavigating = isQuickNavigating;
                this.lastOriginalFilter = undefined;
                this.lastFilter = undefined;
                this.lastRange = undefined;
                this.lastGlobalPicks = undefined;
                this.editorViewState.reset();
            }
        }(this, this.instantiationService));
        //#region Editor History
        this.labelOnlyEditorHistoryPickAccessor = new QuickPickItemScorerAccessor({ skipDescription: true });
        //#endregion
        //#region File Search
        this.fileQueryDelayer = this._register(new ThrottledDelayer(AnythingQuickAccessProvider_1.TYPING_SEARCH_DELAY));
        this.fileQueryBuilder = this.instantiationService.createInstance(QueryBuilder);
        //#endregion
        //#region Command Center (if enabled)
        this.lazyRegistry = new Lazy(() => Registry.as(Extensions.Quickaccess));
        //#endregion
        //#region Workspace Symbols (if enabled)
        this.workspaceSymbolsQuickAccess = this._register(this.instantiationService.createInstance(SymbolsQuickAccessProvider));
        //#endregion
        //#region Editor Symbols (if narrowing down into a global pick via `@`)
        this.editorSymbolsQuickAccess = this.instantiationService.createInstance(GotoSymbolQuickAccessProvider);
    }
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        const searchConfig = this.configurationService.getValue().search;
        const quickAccessConfig = this.configurationService.getValue().workbench.quickOpen;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            openSideBySideDirection: editorConfig?.openSideBySideDirection,
            includeSymbols: searchConfig?.quickOpen.includeSymbols,
            includeHistory: searchConfig?.quickOpen.includeHistory,
            historyFilterSortOrder: searchConfig?.quickOpen.history.filterSortOrder,
            preserveInput: quickAccessConfig.preserveInput
        };
    }
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // Update the pick state for this run
        this.pickState.set(picker);
        // Add editor decorations for active editor symbol picks
        const editorDecorationsDisposable = disposables.add(new MutableDisposable());
        disposables.add(picker.onDidChangeActive(() => {
            // Clear old decorations
            editorDecorationsDisposable.value = undefined;
            // Add new decoration if editor symbol is active
            const [item] = picker.activeItems;
            if (isEditorSymbolQuickPickItem(item)) {
                editorDecorationsDisposable.value = this.decorateAndRevealSymbolRange(item);
            }
        }));
        // Restore view state upon cancellation if we changed it
        // but only when the picker was closed via explicit user
        // gesture and not e.g. when focus was lost because that
        // could mean the user clicked into the editor directly.
        disposables.add(Event.once(picker.onDidHide)(({ reason }) => {
            if (reason === QuickInputHideReason.Gesture) {
                this.pickState.editorViewState.restore();
            }
        }));
        // Start picker
        disposables.add(super.provide(picker, token, runOptions));
        return disposables;
    }
    decorateAndRevealSymbolRange(pick) {
        const activeEditor = this.editorService.activeEditor;
        if (!this.uriIdentityService.extUri.isEqual(pick.resource, activeEditor?.resource)) {
            return Disposable.None; // active editor needs to be for resource
        }
        const activeEditorControl = this.editorService.activeTextEditorControl;
        if (!activeEditorControl) {
            return Disposable.None; // we need a text editor control to decorate and reveal
        }
        // we must remember our curret view state to be able to restore
        this.pickState.editorViewState.set();
        // Reveal
        activeEditorControl.revealRangeInCenter(pick.range.selection, 0 /* ScrollType.Smooth */);
        // Decorate
        this.addDecorations(activeEditorControl, pick.range.decoration);
        return toDisposable(() => this.clearDecorations(activeEditorControl));
    }
    _getPicks(originalFilter, disposables, token, runOptions) {
        // Find a suitable range from the pattern looking for ":", "#" or ","
        // unless we have the `@` editor symbol character inside the filter
        const filterWithRange = extractRangeFromFilter(originalFilter, [GotoSymbolQuickAccessProvider.PREFIX]);
        // Update filter with normalized values
        let filter;
        if (filterWithRange) {
            filter = filterWithRange.filter;
        }
        else {
            filter = originalFilter;
        }
        // Remember as last range
        this.pickState.lastRange = filterWithRange?.range;
        // If the original filter value has changed but the normalized
        // one has not, we return early with a `null` result indicating
        // that the results should preserve because the range information
        // (:<line>:<column>) does not need to trigger any re-sorting.
        if (originalFilter !== this.pickState.lastOriginalFilter && filter === this.pickState.lastFilter) {
            return null;
        }
        // Remember as last filter
        const lastWasFiltering = !!this.pickState.lastOriginalFilter;
        this.pickState.lastOriginalFilter = originalFilter;
        this.pickState.lastFilter = filter;
        // Remember our pick state before returning new picks
        // unless we are inside an editor symbol filter or result.
        // We can use this state to return back to the global pick
        // when the user is narrowing back out of editor symbols.
        const picks = this.pickState.picker?.items;
        const activePick = this.pickState.picker?.activeItems[0];
        if (picks && activePick) {
            const activePickIsEditorSymbol = isEditorSymbolQuickPickItem(activePick);
            const activePickIsNoResultsInEditorSymbols = activePick === AnythingQuickAccessProvider_1.NO_RESULTS_PICK && filter.indexOf(GotoSymbolQuickAccessProvider.PREFIX) >= 0;
            if (!activePickIsEditorSymbol && !activePickIsNoResultsInEditorSymbols) {
                this.pickState.lastGlobalPicks = {
                    items: picks,
                    active: activePick
                };
            }
        }
        // `enableEditorSymbolSearch`: this will enable local editor symbol
        // search if the filter value includes `@` character. We only want
        // to enable this support though if the user was filtering in the
        // picker because this feature depends on an active item in the result
        // list to get symbols from. If we would simply trigger editor symbol
        // search without prior filtering, you could not paste a file name
        // including the `@` character to open it (e.g. /some/file@path)
        // refs: https://github.com/microsoft/vscode/issues/93845
        return this.doGetPicks(filter, {
            ...runOptions,
            enableEditorSymbolSearch: lastWasFiltering
        }, disposables, token);
    }
    doGetPicks(filter, options, disposables, token) {
        const query = prepareQuery(filter);
        // Return early if we have editor symbol picks. We support this by:
        // - having a previously active global pick (e.g. a file)
        // - the user typing `@` to start the local symbol query
        if (options.enableEditorSymbolSearch) {
            const editorSymbolPicks = this.getEditorSymbolPicks(query, disposables, token);
            if (editorSymbolPicks) {
                return editorSymbolPicks;
            }
        }
        // If we have a known last active editor symbol pick, we try to restore
        // the last global pick to support the case of narrowing out from a
        // editor symbol search back into the global search
        const activePick = this.pickState.picker?.activeItems[0];
        if (isEditorSymbolQuickPickItem(activePick) && this.pickState.lastGlobalPicks) {
            return this.pickState.lastGlobalPicks;
        }
        // Otherwise return normally with history and file/symbol results
        const historyEditorPicks = this.getEditorHistoryPicks(query);
        let picks = new Array();
        if (options.additionPicks) {
            for (const pick of options.additionPicks) {
                if (pick.type === 'separator') {
                    picks.push(pick);
                    continue;
                }
                if (!query.original) {
                    pick.highlights = undefined;
                    picks.push(pick);
                    continue;
                }
                const { score, labelMatch, descriptionMatch } = scoreItemFuzzy(pick, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache);
                if (!score) {
                    continue;
                }
                pick.highlights = {
                    label: labelMatch,
                    description: descriptionMatch
                };
                picks.push(pick);
            }
        }
        if (this.pickState.isQuickNavigating) {
            if (picks.length > 0) {
                picks.push({ type: 'separator', label: localize('recentlyOpenedSeparator', "recently opened") });
            }
            picks = historyEditorPicks;
        }
        else {
            if (options.includeHelp) {
                picks.push(...this.getHelpPicks(query, token, options));
            }
            if (historyEditorPicks.length !== 0) {
                picks.push({ type: 'separator', label: localize('recentlyOpenedSeparator', "recently opened") });
                picks.push(...historyEditorPicks);
            }
        }
        return {
            // Fast picks: help (if included) & editor history
            picks: options.filter ? picks.filter((p) => options.filter?.(p)) : picks,
            // Slow picks: files and symbols
            additionalPicks: (async () => {
                // Exclude any result that is already present in editor history
                const additionalPicksExcludes = new ResourceMap();
                for (const historyEditorPick of historyEditorPicks) {
                    if (historyEditorPick.resource) {
                        additionalPicksExcludes.set(historyEditorPick.resource, true);
                    }
                }
                let additionalPicks = await this.getAdditionalPicks(query, additionalPicksExcludes, this.configuration.includeSymbols, token);
                if (options.filter) {
                    additionalPicks = additionalPicks.filter((p) => options.filter?.(p));
                }
                if (token.isCancellationRequested) {
                    return [];
                }
                return additionalPicks.length > 0 ? [
                    { type: 'separator', label: this.configuration.includeSymbols ? localize('fileAndSymbolResultsSeparator', "file and symbol results") : localize('fileResultsSeparator', "file results") },
                    ...additionalPicks
                ] : [];
            })(),
            // allow some time to merge files and symbols to reduce flickering
            mergeDelay: AnythingQuickAccessProvider_1.SYMBOL_PICKS_MERGE_DELAY
        };
    }
    async getAdditionalPicks(query, excludes, includeSymbols, token) {
        // Resolve file and symbol picks (if enabled)
        const [filePicks, symbolPicks] = await Promise.all([
            this.getFilePicks(query, excludes, token),
            this.getWorkspaceSymbolPicks(query, includeSymbols, token)
        ]);
        if (token.isCancellationRequested) {
            return [];
        }
        // Perform sorting (top results by score)
        const sortedAnythingPicks = top([...filePicks, ...symbolPicks], (anyPickA, anyPickB) => compareItemsByFuzzyScore(anyPickA, anyPickB, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache), AnythingQuickAccessProvider_1.MAX_RESULTS);
        // Perform filtering
        const filteredAnythingPicks = [];
        for (const anythingPick of sortedAnythingPicks) {
            // Always preserve any existing highlights (e.g. from workspace symbols)
            if (anythingPick.highlights) {
                filteredAnythingPicks.push(anythingPick);
            }
            // Otherwise, do the scoring and matching here
            else {
                const { score, labelMatch, descriptionMatch } = scoreItemFuzzy(anythingPick, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache);
                if (!score) {
                    continue;
                }
                anythingPick.highlights = {
                    label: labelMatch,
                    description: descriptionMatch
                };
                filteredAnythingPicks.push(anythingPick);
            }
        }
        return filteredAnythingPicks;
    }
    getEditorHistoryPicks(query) {
        const configuration = this.configuration;
        // Just return all history entries if not searching
        if (!query.normalized) {
            return this.historyService.getHistory().map(editor => this.createAnythingPick(editor, configuration));
        }
        if (!this.configuration.includeHistory) {
            return []; // disabled when searching
        }
        // Perform filtering
        const editorHistoryScorerAccessor = query.containsPathSeparator ? quickPickItemScorerAccessor : this.labelOnlyEditorHistoryPickAccessor; // Only match on label of the editor unless the search includes path separators
        const editorHistoryPicks = [];
        for (const editor of this.historyService.getHistory()) {
            const resource = editor.resource;
            if (!resource) {
                continue;
            }
            const editorHistoryPick = this.createAnythingPick(editor, configuration);
            const { score, labelMatch, descriptionMatch } = scoreItemFuzzy(editorHistoryPick, query, false, editorHistoryScorerAccessor, this.pickState.scorerCache);
            if (!score) {
                continue; // exclude editors not matching query
            }
            editorHistoryPick.highlights = {
                label: labelMatch,
                description: descriptionMatch
            };
            editorHistoryPicks.push(editorHistoryPick);
        }
        // Return without sorting if settings tell to sort by recency
        if (this.configuration.historyFilterSortOrder === 'recency') {
            return editorHistoryPicks;
        }
        // Perform sorting
        return editorHistoryPicks.sort((editorA, editorB) => compareItemsByFuzzyScore(editorA, editorB, query, false, editorHistoryScorerAccessor, this.pickState.scorerCache));
    }
    createFileQueryCache() {
        return new FileQueryCacheState(cacheKey => this.fileQueryBuilder.file(this.contextService.getWorkspace().folders, this.getFileQueryOptions({ cacheKey })), query => this.searchService.fileSearch(query), cacheKey => this.searchService.clearCache(cacheKey), this.pickState.fileQueryCache).load();
    }
    async getFilePicks(query, excludes, token) {
        if (!query.normalized) {
            return [];
        }
        // Absolute path result
        const absolutePathResult = await this.getAbsolutePathFileResult(query, token);
        if (token.isCancellationRequested) {
            return [];
        }
        // Use absolute path result as only results if present
        let fileMatches;
        if (absolutePathResult) {
            if (excludes.has(absolutePathResult)) {
                return []; // excluded
            }
            // Create a single result pick and make sure to apply full
            // highlights to ensure the pick is displayed. Since a
            // ~ might have been used for searching, our fuzzy scorer
            // may otherwise not properly respect the pick as a result
            const absolutePathPick = this.createAnythingPick(absolutePathResult, this.configuration);
            absolutePathPick.highlights = {
                label: [{ start: 0, end: absolutePathPick.label.length }],
                description: absolutePathPick.description ? [{ start: 0, end: absolutePathPick.description.length }] : undefined
            };
            return [absolutePathPick];
        }
        // Otherwise run the file search (with a delayer if cache is not ready yet)
        if (this.pickState.fileQueryCache?.isLoaded) {
            fileMatches = await this.doFileSearch(query, token);
        }
        else {
            fileMatches = await this.fileQueryDelayer.trigger(async () => {
                if (token.isCancellationRequested) {
                    return [];
                }
                return this.doFileSearch(query, token);
            });
        }
        if (token.isCancellationRequested) {
            return [];
        }
        // Filter excludes & convert to picks
        const configuration = this.configuration;
        return fileMatches
            .filter(resource => !excludes.has(resource))
            .map(resource => this.createAnythingPick(resource, configuration));
    }
    async doFileSearch(query, token) {
        const [fileSearchResults, relativePathFileResults] = await Promise.all([
            // File search: this is a search over all files of the workspace using the provided pattern
            this.getFileSearchResults(query, token),
            // Relative path search: we also want to consider results that match files inside the workspace
            // by looking for relative paths that the user typed as query. This allows to return even excluded
            // results into the picker if found (e.g. helps for opening compilation results that are otherwise
            // excluded)
            this.getRelativePathFileResults(query, token)
        ]);
        if (token.isCancellationRequested) {
            return [];
        }
        // Return quickly if no relative results are present
        if (!relativePathFileResults) {
            return fileSearchResults;
        }
        // Otherwise, make sure to filter relative path results from
        // the search results to prevent duplicates
        const relativePathFileResultsMap = new ResourceMap();
        for (const relativePathFileResult of relativePathFileResults) {
            relativePathFileResultsMap.set(relativePathFileResult, true);
        }
        return [
            ...fileSearchResults.filter(result => !relativePathFileResultsMap.has(result)),
            ...relativePathFileResults
        ];
    }
    async getFileSearchResults(query, token) {
        // filePattern for search depends on the number of queries in input:
        // - with multiple: only take the first one and let the filter later drop non-matching results
        // - with single: just take the original in full
        //
        // This enables to e.g. search for "someFile someFolder" by only returning
        // search results for "someFile" and not both that would normally not match.
        //
        let filePattern = '';
        if (query.values && query.values.length > 1) {
            filePattern = query.values[0].original;
        }
        else {
            filePattern = query.original;
        }
        const fileSearchResults = await this.doGetFileSearchResults(filePattern, token);
        if (token.isCancellationRequested) {
            return [];
        }
        // If we detect that the search limit has been hit and we have a query
        // that was composed of multiple inputs where we only took the first part
        // we run another search with the full original query included to make
        // sure we are including all possible results that could match.
        if (fileSearchResults.limitHit && query.values && query.values.length > 1) {
            const additionalFileSearchResults = await this.doGetFileSearchResults(query.original, token);
            if (token.isCancellationRequested) {
                return [];
            }
            // Remember which result we already covered
            const existingFileSearchResultsMap = new ResourceMap();
            for (const fileSearchResult of fileSearchResults.results) {
                existingFileSearchResultsMap.set(fileSearchResult.resource, true);
            }
            // Add all additional results to the original set for inclusion
            for (const additionalFileSearchResult of additionalFileSearchResults.results) {
                if (!existingFileSearchResultsMap.has(additionalFileSearchResult.resource)) {
                    fileSearchResults.results.push(additionalFileSearchResult);
                }
            }
        }
        return fileSearchResults.results.map(result => result.resource);
    }
    doGetFileSearchResults(filePattern, token) {
        const start = Date.now();
        return this.searchService.fileSearch(this.fileQueryBuilder.file(this.contextService.getWorkspace().folders, this.getFileQueryOptions({
            filePattern,
            cacheKey: this.pickState.fileQueryCache?.cacheKey,
            maxResults: AnythingQuickAccessProvider_1.MAX_RESULTS
        })), token).finally(() => {
            this.logService.trace(`QuickAccess fileSearch ${Date.now() - start}ms`);
        });
    }
    getFileQueryOptions(input) {
        return {
            _reason: 'openFileHandler', // used for telemetry - do not change
            extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
            filePattern: input.filePattern || '',
            cacheKey: input.cacheKey,
            maxResults: input.maxResults || 0,
            sortByScore: true
        };
    }
    async getAbsolutePathFileResult(query, token) {
        if (!query.containsPathSeparator) {
            return;
        }
        const userHome = await this.pathService.userHome();
        const detildifiedQuery = untildify(query.original, userHome.scheme === Schemas.file ? userHome.fsPath : userHome.path);
        if (token.isCancellationRequested) {
            return;
        }
        const isAbsolutePathQuery = (await this.pathService.path).isAbsolute(detildifiedQuery);
        if (token.isCancellationRequested) {
            return;
        }
        if (isAbsolutePathQuery) {
            const resource = toLocalResource(await this.pathService.fileURI(detildifiedQuery), this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
            if (token.isCancellationRequested) {
                return;
            }
            try {
                if ((await this.fileService.stat(resource)).isFile) {
                    return resource;
                }
            }
            catch (error) {
                // ignore if file does not exist
            }
        }
        return;
    }
    async getRelativePathFileResults(query, token) {
        if (!query.containsPathSeparator) {
            return;
        }
        // Convert relative paths to absolute paths over all folders of the workspace
        // and return them as results if the absolute paths exist
        const isAbsolutePathQuery = (await this.pathService.path).isAbsolute(query.original);
        if (!isAbsolutePathQuery) {
            const resources = [];
            for (const folder of this.contextService.getWorkspace().folders) {
                if (token.isCancellationRequested) {
                    break;
                }
                const resource = toLocalResource(folder.toResource(query.original), this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
                try {
                    if ((await this.fileService.stat(resource)).isFile) {
                        resources.push(resource);
                    }
                }
                catch (error) {
                    // ignore if file does not exist
                }
            }
            return resources;
        }
        return;
    }
    getHelpPicks(query, token, runOptions) {
        if (query.normalized) {
            return []; // If there's a filter, we don't show the help
        }
        const providers = this.lazyRegistry.value.getQuickAccessProviders()
            .filter(p => p.helpEntries.some(h => h.commandCenterOrder !== undefined))
            .flatMap(provider => provider.helpEntries
            .filter(h => h.commandCenterOrder !== undefined)
            .map(helpEntry => {
            const providerSpecificOptions = {
                ...runOptions,
                includeHelp: provider.prefix === AnythingQuickAccessProvider_1.PREFIX ? false : runOptions?.includeHelp
            };
            const label = helpEntry.commandCenterLabel ?? helpEntry.description;
            return {
                label,
                description: helpEntry.prefix ?? provider.prefix,
                commandCenterOrder: helpEntry.commandCenterOrder,
                keybinding: helpEntry.commandId ? this.keybindingService.lookupKeybinding(helpEntry.commandId) : undefined,
                ariaLabel: localize('helpPickAriaLabel', "{0}, {1}", label, helpEntry.description),
                accept: () => {
                    this.quickInputService.quickAccess.show(provider.prefix, {
                        preserveValue: true,
                        providerOptions: providerSpecificOptions
                    });
                }
            };
        }));
        // TODO: There has to be a better place for this, but it's the first time we are adding a non-quick access provider
        // to the command center, so for now, let's do this.
        if (this.quickChatService.enabled) {
            providers.push({
                label: localize('chat', "Open Quick Chat"),
                commandCenterOrder: 30,
                keybinding: this.keybindingService.lookupKeybinding(ASK_QUICK_QUESTION_ACTION_ID),
                accept: () => this.quickChatService.toggle()
            });
        }
        return providers.sort((a, b) => a.commandCenterOrder - b.commandCenterOrder);
    }
    async getWorkspaceSymbolPicks(query, includeSymbols, token) {
        if (!query.normalized || // we need a value for search for
            !includeSymbols || // we need to enable symbols in search
            this.pickState.lastRange // a range is an indicator for just searching for files
        ) {
            return [];
        }
        // Delegate to the existing symbols quick access
        // but skip local results and also do not score
        return this.workspaceSymbolsQuickAccess.getSymbolPicks(query.original, {
            skipLocal: true,
            skipSorting: true,
            delay: AnythingQuickAccessProvider_1.TYPING_SEARCH_DELAY
        }, token);
    }
    getEditorSymbolPicks(query, disposables, token) {
        const filterSegments = query.original.split(GotoSymbolQuickAccessProvider.PREFIX);
        const filter = filterSegments.length > 1 ? filterSegments[filterSegments.length - 1].trim() : undefined;
        if (typeof filter !== 'string') {
            return null; // we need to be searched for editor symbols via `@`
        }
        const activeGlobalPick = this.pickState.lastGlobalPicks?.active;
        if (!activeGlobalPick) {
            return null; // we need an active global pick to find symbols for
        }
        const activeGlobalResource = activeGlobalPick.resource;
        if (!activeGlobalResource || (!this.fileService.hasProvider(activeGlobalResource) && activeGlobalResource.scheme !== Schemas.untitled)) {
            return null; // we need a resource that we can resolve
        }
        if (activeGlobalPick.label.includes(GotoSymbolQuickAccessProvider.PREFIX) || activeGlobalPick.description?.includes(GotoSymbolQuickAccessProvider.PREFIX)) {
            if (filterSegments.length < 3) {
                return null; // require at least 2 `@` if our active pick contains `@` in label or description
            }
        }
        return this.doGetEditorSymbolPicks(activeGlobalPick, activeGlobalResource, filter, disposables, token);
    }
    async doGetEditorSymbolPicks(activeGlobalPick, activeGlobalResource, filter, disposables, token) {
        // Bring the editor to front to review symbols to go to
        try {
            // we must remember our curret view state to be able to restore
            this.pickState.editorViewState.set();
            // open it
            await this.pickState.editorViewState.openTransientEditor({
                resource: activeGlobalResource,
                options: { preserveFocus: true, revealIfOpened: true, ignoreError: true }
            });
        }
        catch (error) {
            return []; // return if resource cannot be opened
        }
        if (token.isCancellationRequested) {
            return [];
        }
        // Obtain model from resource
        let model = this.modelService.getModel(activeGlobalResource);
        if (!model) {
            try {
                const modelReference = disposables.add(await this.textModelService.createModelReference(activeGlobalResource));
                if (token.isCancellationRequested) {
                    return [];
                }
                model = modelReference.object.textEditorModel;
            }
            catch (error) {
                return []; // return if model cannot be resolved
            }
        }
        // Ask provider for editor symbols
        const editorSymbolPicks = (await this.editorSymbolsQuickAccess.getSymbolPicks(model, filter, { extraContainerLabel: stripIcons(activeGlobalPick.label) }, disposables, token));
        if (token.isCancellationRequested) {
            return [];
        }
        return editorSymbolPicks.map(editorSymbolPick => {
            // Preserve separators
            if (editorSymbolPick.type === 'separator') {
                return editorSymbolPick;
            }
            // Convert editor symbols to anything pick
            return {
                ...editorSymbolPick,
                resource: activeGlobalResource,
                description: editorSymbolPick.description,
                trigger: (buttonIndex, keyMods) => {
                    this.openAnything(activeGlobalResource, { keyMods, range: editorSymbolPick.range?.selection, forceOpenSideBySide: true });
                    return TriggerAction.CLOSE_PICKER;
                },
                accept: (keyMods, event) => this.openAnything(activeGlobalResource, { keyMods, range: editorSymbolPick.range?.selection, preserveFocus: event.inBackground, forcePinned: event.inBackground })
            };
        });
    }
    addDecorations(editor, range) {
        this.editorSymbolsQuickAccess.addDecorations(editor, range);
    }
    clearDecorations(editor) {
        this.editorSymbolsQuickAccess.clearDecorations(editor);
    }
    //#endregion
    //#region Helpers
    createAnythingPick(resourceOrEditor, configuration) {
        const isEditorHistoryEntry = !URI.isUri(resourceOrEditor);
        let resource;
        let label;
        let description = undefined;
        let isDirty = undefined;
        let extraClasses;
        let icon = undefined;
        if (isEditorInput(resourceOrEditor)) {
            resource = EditorResourceAccessor.getOriginalUri(resourceOrEditor);
            label = resourceOrEditor.getName();
            description = resourceOrEditor.getDescription();
            isDirty = resourceOrEditor.isDirty() && !resourceOrEditor.isSaving();
            extraClasses = resourceOrEditor.getLabelExtraClasses();
            icon = resourceOrEditor.getIcon();
        }
        else {
            resource = URI.isUri(resourceOrEditor) ? resourceOrEditor : resourceOrEditor.resource;
            const customLabel = this.customEditorLabelService.getName(resource);
            label = customLabel || basenameOrAuthority(resource);
            description = this.labelService.getUriLabel(!!customLabel ? resource : dirname(resource), { relative: true });
            isDirty = this.workingCopyService.isDirty(resource) && !this.filesConfigurationService.hasShortAutoSaveDelay(resource);
            extraClasses = [];
        }
        const labelAndDescription = description ? `${label} ${description}` : label;
        const iconClassesValue = new Lazy(() => getIconClasses(this.modelService, this.languageService, resource, undefined, icon).concat(extraClasses));
        const buttonsValue = new Lazy(() => {
            const openSideBySideDirection = configuration.openSideBySideDirection;
            const buttons = [];
            // Open to side / below
            buttons.push({
                iconClass: openSideBySideDirection === 'right' ? ThemeIcon.asClassName(Codicon.splitHorizontal) : ThemeIcon.asClassName(Codicon.splitVertical),
                tooltip: openSideBySideDirection === 'right' ?
                    localize({ key: 'openToSide', comment: ['Open this file in a split editor on the left/right side'] }, "Open to the Side") :
                    localize({ key: 'openToBottom', comment: ['Open this file in a split editor on the bottom'] }, "Open to the Bottom")
            });
            // Remove from History
            if (isEditorHistoryEntry) {
                buttons.push({
                    iconClass: isDirty ? ('dirty-anything ' + ThemeIcon.asClassName(Codicon.circleFilled)) : ThemeIcon.asClassName(Codicon.close),
                    tooltip: localize('closeEditor', "Remove from Recently Opened"),
                    alwaysVisible: isDirty
                });
            }
            return buttons;
        });
        return {
            resource,
            label,
            ariaLabel: isDirty ? localize('filePickAriaLabelDirty', "{0} unsaved changes", labelAndDescription) : labelAndDescription,
            description,
            get iconClasses() { return iconClassesValue.value; },
            get buttons() { return buttonsValue.value; },
            trigger: (buttonIndex, keyMods) => {
                switch (buttonIndex) {
                    // Open to side / below
                    case 0:
                        this.openAnything(resourceOrEditor, { keyMods, range: this.pickState.lastRange, forceOpenSideBySide: true });
                        return TriggerAction.CLOSE_PICKER;
                    // Remove from History
                    case 1:
                        if (!URI.isUri(resourceOrEditor)) {
                            this.historyService.removeFromHistory(resourceOrEditor);
                            return TriggerAction.REMOVE_ITEM;
                        }
                }
                return TriggerAction.NO_ACTION;
            },
            accept: (keyMods, event) => this.openAnything(resourceOrEditor, { keyMods, range: this.pickState.lastRange, preserveFocus: event.inBackground, forcePinned: event.inBackground })
        };
    }
    async openAnything(resourceOrEditor, options) {
        // Craft some editor options based on quick access usage
        const editorOptions = {
            preserveFocus: options.preserveFocus,
            pinned: options.keyMods?.ctrlCmd || options.forcePinned || this.configuration.openEditorPinned,
            selection: options.range ? Range.collapseToStart(options.range) : undefined
        };
        const targetGroup = options.keyMods?.alt || (this.configuration.openEditorPinned && options.keyMods?.ctrlCmd) || options.forceOpenSideBySide ? SIDE_GROUP : ACTIVE_GROUP;
        // Restore any view state if the target is the side group
        if (targetGroup === SIDE_GROUP) {
            await this.pickState.editorViewState.restore();
        }
        // Open editor (typed)
        if (isEditorInput(resourceOrEditor)) {
            await this.editorService.openEditor(resourceOrEditor, editorOptions, targetGroup);
        }
        // Open editor (untyped)
        else {
            let resourceEditorInput;
            if (URI.isUri(resourceOrEditor)) {
                resourceEditorInput = {
                    resource: resourceOrEditor,
                    options: editorOptions
                };
            }
            else {
                resourceEditorInput = {
                    ...resourceOrEditor,
                    options: {
                        ...resourceOrEditor.options,
                        ...editorOptions
                    }
                };
            }
            await this.editorService.openEditor(resourceEditorInput, targetGroup);
        }
    }
};
AnythingQuickAccessProvider = AnythingQuickAccessProvider_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, ISearchService),
    __param(2, IWorkspaceContextService),
    __param(3, IPathService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IFileService),
    __param(6, ILabelService),
    __param(7, IModelService),
    __param(8, ILanguageService),
    __param(9, IWorkingCopyService),
    __param(10, IConfigurationService),
    __param(11, IEditorService),
    __param(12, IHistoryService),
    __param(13, IFilesConfigurationService),
    __param(14, ITextModelService),
    __param(15, IUriIdentityService),
    __param(16, IQuickInputService),
    __param(17, IKeybindingService),
    __param(18, IQuickChatService),
    __param(19, ILogService),
    __param(20, ICustomEditorLabelService)
], AnythingQuickAccessProvider);
export { AnythingQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW55dGhpbmdRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9hbnl0aGluZ1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sRUFBK0IsMkJBQTJCLEVBQUUsMkJBQTJCLEVBQTBDLG9CQUFvQixFQUFFLGtCQUFrQixFQUF1QixNQUFNLHNEQUFzRCxDQUFDO0FBQ3BRLE9BQU8sRUFBMEIseUJBQXlCLEVBQUUsYUFBYSxFQUE0QyxNQUFNLDhEQUE4RCxDQUFDO0FBQzFMLE9BQU8sRUFBRSxZQUFZLEVBQWtCLHdCQUF3QixFQUFFLGNBQWMsRUFBb0IsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsSixPQUFPLEVBQTRCLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxzQkFBc0IsRUFBaUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5SCxPQUFPLEVBQUUsY0FBYyxFQUFtQixNQUFNLDJDQUEyQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXND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