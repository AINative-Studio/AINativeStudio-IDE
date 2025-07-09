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
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import * as errors from '../../../../../base/common/errors.js';
import { Emitter, Event, PauseableEmitter } from '../../../../../base/common/event.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { INotebookSearchService } from '../../common/notebookSearch.js';
import { ReplacePattern } from '../../../../services/search/common/replace.js';
import { ISearchService } from '../../../../services/search/common/search.js';
import { mergeSearchResultEvents, SearchModelLocation, SEARCH_MODEL_PREFIX } from './searchTreeCommon.js';
import { SearchResultImpl } from './searchResult.js';
let SearchModelImpl = class SearchModelImpl extends Disposable {
    constructor(searchService, telemetryService, configurationService, instantiationService, logService, notebookSearchService) {
        super();
        this.searchService = searchService;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.notebookSearchService = notebookSearchService;
        this._searchQuery = null;
        this._replaceActive = false;
        this._replaceString = null;
        this._replacePattern = null;
        this._preserveCase = false;
        this._startStreamDelay = Promise.resolve();
        this._resultQueue = [];
        this._aiResultQueue = [];
        this._onReplaceTermChanged = this._register(new Emitter());
        this.onReplaceTermChanged = this._onReplaceTermChanged.event;
        this._onSearchResultChanged = this._register(new PauseableEmitter({
            merge: mergeSearchResultEvents
        }));
        this.onSearchResultChanged = this._onSearchResultChanged.event;
        this.currentCancelTokenSource = null;
        this.currentAICancelTokenSource = null;
        this.searchCancelledForNewSearch = false;
        this.aiSearchCancelledForNewSearch = false;
        this.location = SearchModelLocation.PANEL;
        this._searchResult = this.instantiationService.createInstance(SearchResultImpl, this);
        this._register(this._searchResult.onChange((e) => this._onSearchResultChanged.fire(e)));
        this._aiTextResultProviderName = new Lazy(async () => this.searchService.getAIName());
        this._id = SEARCH_MODEL_PREFIX + Date.now().toString();
    }
    id() {
        return this._id;
    }
    async getAITextResultProviderName() {
        const result = await this._aiTextResultProviderName.value;
        if (!result) {
            throw Error('Fetching AI name when no provider present.');
        }
        return result;
    }
    isReplaceActive() {
        return this._replaceActive;
    }
    set replaceActive(replaceActive) {
        this._replaceActive = replaceActive;
    }
    get replacePattern() {
        return this._replacePattern;
    }
    get replaceString() {
        return this._replaceString || '';
    }
    set preserveCase(value) {
        this._preserveCase = value;
    }
    get preserveCase() {
        return this._preserveCase;
    }
    set replaceString(replaceString) {
        this._replaceString = replaceString;
        if (this._searchQuery) {
            this._replacePattern = new ReplacePattern(replaceString, this._searchQuery.contentPattern);
        }
        this._onReplaceTermChanged.fire();
    }
    get searchResult() {
        return this._searchResult;
    }
    async addAIResults(onProgress) {
        if (this.hasAIResults) {
            // already has matches or pending matches
            throw Error('AI results already exist');
        }
        else {
            if (this._searchQuery) {
                return this.aiSearch({ ...this._searchQuery, contentPattern: this._searchQuery.contentPattern.pattern, type: 3 /* QueryType.aiText */ }, onProgress);
            }
            else {
                throw Error('No search query');
            }
        }
    }
    aiSearch(query, onProgress) {
        const searchInstanceID = Date.now().toString();
        const tokenSource = new CancellationTokenSource();
        this.currentAICancelTokenSource = tokenSource;
        const start = Date.now();
        const asyncAIResults = this.searchService.aiTextSearch(query, tokenSource.token, async (p) => {
            this.onSearchProgress(p, searchInstanceID, false, true);
            onProgress?.(p);
        }).finally(() => {
            tokenSource.dispose(true);
        }).then(value => {
            this.onSearchCompleted(value, Date.now() - start, searchInstanceID, true);
            return value;
        }, e => {
            this.onSearchError(e, Date.now() - start, true);
            throw e;
        });
        return asyncAIResults;
    }
    doSearch(query, progressEmitter, searchQuery, searchInstanceID, onProgress, callerToken) {
        const asyncGenerateOnProgress = async (p) => {
            progressEmitter.fire();
            this.onSearchProgress(p, searchInstanceID, false, false);
            onProgress?.(p);
        };
        const syncGenerateOnProgress = (p) => {
            progressEmitter.fire();
            this.onSearchProgress(p, searchInstanceID, true);
            onProgress?.(p);
        };
        const tokenSource = this.currentCancelTokenSource = new CancellationTokenSource(callerToken);
        const notebookResult = this.notebookSearchService.notebookSearch(query, tokenSource.token, searchInstanceID, asyncGenerateOnProgress);
        const textResult = this.searchService.textSearchSplitSyncAsync(searchQuery, tokenSource.token, asyncGenerateOnProgress, notebookResult.openFilesToScan, notebookResult.allScannedFiles);
        const syncResults = textResult.syncResults.results;
        syncResults.forEach(p => { if (p) {
            syncGenerateOnProgress(p);
        } });
        const getAsyncResults = async () => {
            const searchStart = Date.now();
            // resolve async parts of search
            const allClosedEditorResults = await textResult.asyncResults;
            const resolvedNotebookResults = await notebookResult.completeData;
            const searchLength = Date.now() - searchStart;
            const resolvedResult = {
                results: [...allClosedEditorResults.results, ...resolvedNotebookResults.results],
                messages: [...allClosedEditorResults.messages, ...resolvedNotebookResults.messages],
                limitHit: allClosedEditorResults.limitHit || resolvedNotebookResults.limitHit,
                exit: allClosedEditorResults.exit,
                stats: allClosedEditorResults.stats,
            };
            this.logService.trace(`whole search time | ${searchLength}ms`);
            return resolvedResult;
        };
        return {
            asyncResults: getAsyncResults()
                .finally(() => tokenSource.dispose(true)),
            syncResults
        };
    }
    get hasAIResults() {
        return !!(this.searchResult.getCachedSearchComplete(true)) || (!!this.currentAICancelTokenSource && !this.currentAICancelTokenSource.token.isCancellationRequested);
    }
    get hasPlainResults() {
        return !!(this.searchResult.getCachedSearchComplete(false)) || (!!this.currentCancelTokenSource && !this.currentCancelTokenSource.token.isCancellationRequested);
    }
    search(query, onProgress, callerToken) {
        this.cancelSearch(true);
        this._searchQuery = query;
        if (!this.searchConfig.searchOnType) {
            this.searchResult.clear();
        }
        const searchInstanceID = Date.now().toString();
        this._searchResult.query = this._searchQuery;
        const progressEmitter = this._register(new Emitter());
        this._replacePattern = new ReplacePattern(this.replaceString, this._searchQuery.contentPattern);
        // In search on type case, delay the streaming of results just a bit, so that we don't flash the only "local results" fast path
        this._startStreamDelay = new Promise(resolve => setTimeout(resolve, this.searchConfig.searchOnType ? 150 : 0));
        const req = this.doSearch(query, progressEmitter, this._searchQuery, searchInstanceID, onProgress, callerToken);
        const asyncResults = req.asyncResults;
        const syncResults = req.syncResults;
        if (onProgress) {
            syncResults.forEach(p => {
                if (p) {
                    onProgress(p);
                }
            });
        }
        const start = Date.now();
        let event;
        const progressEmitterPromise = new Promise(resolve => {
            event = Event.once(progressEmitter.event)(resolve);
            return event;
        });
        Promise.race([asyncResults, progressEmitterPromise]).finally(() => {
            /* __GDPR__
                "searchResultsFirstRender" : {
                    "owner": "roblourens",
                    "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
                }
            */
            event?.dispose();
            this.telemetryService.publicLog('searchResultsFirstRender', { duration: Date.now() - start });
        });
        try {
            return {
                asyncResults: asyncResults.then(value => {
                    this.onSearchCompleted(value, Date.now() - start, searchInstanceID, false);
                    return value;
                }, e => {
                    this.onSearchError(e, Date.now() - start, false);
                    throw e;
                }),
                syncResults
            };
        }
        finally {
            /* __GDPR__
                "searchResultsFinished" : {
                    "owner": "roblourens",
                    "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
                }
            */
            this.telemetryService.publicLog('searchResultsFinished', { duration: Date.now() - start });
        }
    }
    onSearchCompleted(completed, duration, searchInstanceID, ai) {
        if (!this._searchQuery) {
            throw new Error('onSearchCompleted must be called after a search is started');
        }
        if (ai) {
            this._searchResult.add(this._aiResultQueue, searchInstanceID, true);
            this._aiResultQueue.length = 0;
        }
        else {
            this._searchResult.add(this._resultQueue, searchInstanceID, false);
            this._resultQueue.length = 0;
        }
        this.searchResult.setCachedSearchComplete(completed, ai);
        const options = Object.assign({}, this._searchQuery.contentPattern);
        delete options.pattern;
        const stats = completed && completed.stats;
        const fileSchemeOnly = this._searchQuery.folderQueries.every(fq => fq.folder.scheme === Schemas.file);
        const otherSchemeOnly = this._searchQuery.folderQueries.every(fq => fq.folder.scheme !== Schemas.file);
        const scheme = fileSchemeOnly ? Schemas.file :
            otherSchemeOnly ? 'other' :
                'mixed';
        /* __GDPR__
            "searchResultsShown" : {
                "owner": "roblourens",
                "count" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "fileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "options": { "${inline}": [ "${IPatternInfo}" ] },
                "duration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "type" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
                "scheme" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
                "searchOnTypeEnabled" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        this.telemetryService.publicLog('searchResultsShown', {
            count: this._searchResult.count(),
            fileCount: this._searchResult.fileCount(),
            options,
            duration,
            type: stats && stats.type,
            scheme,
            searchOnTypeEnabled: this.searchConfig.searchOnType
        });
        return completed;
    }
    onSearchError(e, duration, ai) {
        if (errors.isCancellationError(e)) {
            this.onSearchCompleted((ai ? this.aiSearchCancelledForNewSearch : this.searchCancelledForNewSearch)
                ? { exit: 1 /* SearchCompletionExitCode.NewSearchStarted */, results: [], messages: [] }
                : undefined, duration, '', ai);
            if (ai) {
                this.aiSearchCancelledForNewSearch = false;
            }
            else {
                this.searchCancelledForNewSearch = false;
            }
        }
    }
    onSearchProgress(p, searchInstanceID, sync = true, ai = false) {
        const targetQueue = ai ? this._aiResultQueue : this._resultQueue;
        if (p.resource) {
            targetQueue.push(p);
            if (sync) {
                if (targetQueue.length) {
                    this._searchResult.add(targetQueue, searchInstanceID, false, true);
                    targetQueue.length = 0;
                }
            }
            else {
                this._startStreamDelay.then(() => {
                    if (targetQueue.length) {
                        this._searchResult.add(targetQueue, searchInstanceID, ai, true);
                        targetQueue.length = 0;
                    }
                });
            }
        }
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    cancelSearch(cancelledForNewSearch = false) {
        if (this.currentCancelTokenSource) {
            this.searchCancelledForNewSearch = cancelledForNewSearch;
            this.currentCancelTokenSource.cancel();
            return true;
        }
        return false;
    }
    cancelAISearch(cancelledForNewSearch = false) {
        if (this.currentAICancelTokenSource) {
            this.aiSearchCancelledForNewSearch = cancelledForNewSearch;
            this.currentAICancelTokenSource.cancel();
            return true;
        }
        return false;
    }
    clearAiSearchResults() {
        this._aiResultQueue.length = 0;
        // it's not clear all as we are only clearing the AI results
        this._searchResult.aiTextSearchResult.clear(false);
    }
    dispose() {
        this.cancelSearch();
        this.cancelAISearch();
        this.searchResult.dispose();
        super.dispose();
    }
};
SearchModelImpl = __decorate([
    __param(0, ISearchService),
    __param(1, ITelemetryService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, INotebookSearchService)
], SearchModelImpl);
export { SearchModelImpl };
let SearchViewModelWorkbenchService = class SearchViewModelWorkbenchService {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this._searchModel = null;
    }
    get searchModel() {
        if (!this._searchModel) {
            this._searchModel = this.instantiationService.createInstance(SearchModelImpl);
        }
        return this._searchModel;
    }
    set searchModel(searchModel) {
        this._searchModel?.dispose();
        this._searchModel = searchModel;
    }
};
SearchViewModelWorkbenchService = __decorate([
    __param(0, IInstantiationService)
], SearchViewModelWorkbenchService);
export { SearchViewModelWorkbenchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVHJlZU1vZGVsL3NlYXJjaE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RyxPQUFPLEtBQUssTUFBTSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMvRSxPQUFPLEVBQWdILGNBQWMsRUFBcUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvUCxPQUFPLEVBQWdCLHVCQUF1QixFQUFFLG1CQUFtQixFQUErQixtQkFBbUIsRUFBRSxNQUFNLHVCQUF1QixD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