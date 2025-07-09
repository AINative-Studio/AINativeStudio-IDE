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
import * as arrays from '../../../../base/common/arrays.js';
import { DeferredPromise, raceCancellationError } from '../../../../base/common/async.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { randomChance } from '../../../../base/common/numbers.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { isNumber } from '../../../../base/common/types.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { DEFAULT_MAX_SEARCH_RESULTS, deserializeSearchError, FileMatch, isFileMatch, isProgressMessage, pathIncludedInQuery, SEARCH_RESULT_LANGUAGE_ID, SearchErrorCode } from './search.js';
import { getTextSearchMatchWithModelContext, editorMatchesToTextSearchResults } from './searchHelpers.js';
let SearchService = class SearchService extends Disposable {
    constructor(modelService, editorService, telemetryService, logService, extensionService, fileService, uriIdentityService) {
        super();
        this.modelService = modelService;
        this.editorService = editorService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.fileSearchProviders = new Map();
        this.textSearchProviders = new Map();
        this.aiTextSearchProviders = new Map();
        this.deferredFileSearchesByScheme = new Map();
        this.deferredTextSearchesByScheme = new Map();
        this.deferredAITextSearchesByScheme = new Map();
        this.loggedSchemesMissingProviders = new Set();
    }
    registerSearchResultProvider(scheme, type, provider) {
        let list;
        let deferredMap;
        if (type === 0 /* SearchProviderType.file */) {
            list = this.fileSearchProviders;
            deferredMap = this.deferredFileSearchesByScheme;
        }
        else if (type === 1 /* SearchProviderType.text */) {
            list = this.textSearchProviders;
            deferredMap = this.deferredTextSearchesByScheme;
        }
        else if (type === 2 /* SearchProviderType.aiText */) {
            list = this.aiTextSearchProviders;
            deferredMap = this.deferredAITextSearchesByScheme;
        }
        else {
            throw new Error('Unknown SearchProviderType');
        }
        list.set(scheme, provider);
        if (deferredMap.has(scheme)) {
            deferredMap.get(scheme).complete(provider);
            deferredMap.delete(scheme);
        }
        return toDisposable(() => {
            list.delete(scheme);
        });
    }
    async textSearch(query, token, onProgress) {
        const results = this.textSearchSplitSyncAsync(query, token, onProgress);
        const openEditorResults = results.syncResults;
        const otherResults = await results.asyncResults;
        return {
            limitHit: otherResults.limitHit || openEditorResults.limitHit,
            results: [...otherResults.results, ...openEditorResults.results],
            messages: [...otherResults.messages, ...openEditorResults.messages]
        };
    }
    async aiTextSearch(query, token, onProgress) {
        const onProviderProgress = (progress) => {
            // Match
            if (onProgress) { // don't override open editor results
                if (isFileMatch(progress)) {
                    onProgress(progress);
                }
                else {
                    onProgress(progress);
                }
            }
            if (isProgressMessage(progress)) {
                this.logService.debug('SearchService#search', progress.message);
            }
        };
        return this.doSearch(query, token, onProviderProgress);
    }
    async getAIName() {
        const provider = this.getSearchProvider(3 /* QueryType.aiText */).get(Schemas.file);
        return await provider?.getAIName();
    }
    textSearchSplitSyncAsync(query, token, onProgress, notebookFilesToIgnore, asyncNotebookFilesToIgnore) {
        // Get open editor results from dirty/untitled
        const openEditorResults = this.getOpenEditorResults(query);
        if (onProgress) {
            arrays.coalesce([...openEditorResults.results.values()]).filter(e => !(notebookFilesToIgnore && notebookFilesToIgnore.has(e.resource))).forEach(onProgress);
        }
        const syncResults = {
            results: arrays.coalesce([...openEditorResults.results.values()]),
            limitHit: openEditorResults.limitHit ?? false,
            messages: []
        };
        const getAsyncResults = async () => {
            const resolvedAsyncNotebookFilesToIgnore = await asyncNotebookFilesToIgnore ?? new ResourceSet();
            const onProviderProgress = (progress) => {
                if (isFileMatch(progress)) {
                    // Match
                    if (!openEditorResults.results.has(progress.resource) && !resolvedAsyncNotebookFilesToIgnore.has(progress.resource) && onProgress) { // don't override open editor results
                        onProgress(progress);
                    }
                }
                else if (onProgress) {
                    // Progress
                    onProgress(progress);
                }
                if (isProgressMessage(progress)) {
                    this.logService.debug('SearchService#search', progress.message);
                }
            };
            return await this.doSearch(query, token, onProviderProgress);
        };
        return {
            syncResults,
            asyncResults: getAsyncResults()
        };
    }
    fileSearch(query, token) {
        return this.doSearch(query, token);
    }
    schemeHasFileSearchProvider(scheme) {
        return this.fileSearchProviders.has(scheme);
    }
    doSearch(query, token, onProgress) {
        this.logService.trace('SearchService#search', JSON.stringify(query));
        const schemesInQuery = this.getSchemesInQuery(query);
        const providerActivations = [Promise.resolve(null)];
        schemesInQuery.forEach(scheme => providerActivations.push(this.extensionService.activateByEvent(`onSearch:${scheme}`)));
        providerActivations.push(this.extensionService.activateByEvent('onSearch:file'));
        const providerPromise = (async () => {
            await Promise.all(providerActivations);
            await this.extensionService.whenInstalledExtensionsRegistered();
            // Cancel faster if search was canceled while waiting for extensions
            if (token && token.isCancellationRequested) {
                return Promise.reject(new CancellationError());
            }
            const progressCallback = (item) => {
                if (token && token.isCancellationRequested) {
                    return;
                }
                onProgress?.(item);
            };
            const exists = await Promise.all(query.folderQueries.map(query => this.fileService.exists(query.folder)));
            query.folderQueries = query.folderQueries.filter((_, i) => exists[i]);
            let completes = await this.searchWithProviders(query, progressCallback, token);
            completes = arrays.coalesce(completes);
            if (!completes.length) {
                return {
                    limitHit: false,
                    results: [],
                    messages: [],
                };
            }
            return {
                limitHit: completes[0] && completes[0].limitHit,
                stats: completes[0].stats,
                messages: arrays.coalesce(completes.flatMap(i => i.messages)).filter(arrays.uniqueFilter(message => message.type + message.text + message.trusted)),
                results: completes.flatMap((c) => c.results)
            };
        })();
        return token ? raceCancellationError(providerPromise, token) : providerPromise;
    }
    getSchemesInQuery(query) {
        const schemes = new Set();
        query.folderQueries?.forEach(fq => schemes.add(fq.folder.scheme));
        query.extraFileResources?.forEach(extraFile => schemes.add(extraFile.scheme));
        return schemes;
    }
    async waitForProvider(queryType, scheme) {
        const deferredMap = this.getDeferredTextSearchesByScheme(queryType);
        if (deferredMap.has(scheme)) {
            return deferredMap.get(scheme).p;
        }
        else {
            const deferred = new DeferredPromise();
            deferredMap.set(scheme, deferred);
            return deferred.p;
        }
    }
    getSearchProvider(type) {
        switch (type) {
            case 1 /* QueryType.File */:
                return this.fileSearchProviders;
            case 2 /* QueryType.Text */:
                return this.textSearchProviders;
            case 3 /* QueryType.aiText */:
                return this.aiTextSearchProviders;
            default:
                throw new Error(`Unknown query type: ${type}`);
        }
    }
    getDeferredTextSearchesByScheme(type) {
        switch (type) {
            case 1 /* QueryType.File */:
                return this.deferredFileSearchesByScheme;
            case 2 /* QueryType.Text */:
                return this.deferredTextSearchesByScheme;
            case 3 /* QueryType.aiText */:
                return this.deferredAITextSearchesByScheme;
            default:
                throw new Error(`Unknown query type: ${type}`);
        }
    }
    async searchWithProviders(query, onProviderProgress, token) {
        const e2eSW = StopWatch.create(false);
        const searchPs = [];
        const fqs = this.groupFolderQueriesByScheme(query);
        const someSchemeHasProvider = [...fqs.keys()].some(scheme => {
            return this.getSearchProvider(query.type).has(scheme);
        });
        if (query.type === 3 /* QueryType.aiText */ && !someSchemeHasProvider) {
            return [];
        }
        await Promise.all([...fqs.keys()].map(async (scheme) => {
            if (query.onlyFileScheme && scheme !== Schemas.file) {
                return;
            }
            const schemeFQs = fqs.get(scheme);
            let provider = this.getSearchProvider(query.type).get(scheme);
            if (!provider) {
                if (someSchemeHasProvider) {
                    if (!this.loggedSchemesMissingProviders.has(scheme)) {
                        this.logService.warn(`No search provider registered for scheme: ${scheme}. Another scheme has a provider, not waiting for ${scheme}`);
                        this.loggedSchemesMissingProviders.add(scheme);
                    }
                    return;
                }
                else {
                    if (!this.loggedSchemesMissingProviders.has(scheme)) {
                        this.logService.warn(`No search provider registered for scheme: ${scheme}, waiting`);
                        this.loggedSchemesMissingProviders.add(scheme);
                    }
                    provider = await this.waitForProvider(query.type, scheme);
                }
            }
            const oneSchemeQuery = {
                ...query,
                ...{
                    folderQueries: schemeFQs
                }
            };
            const doProviderSearch = () => {
                switch (query.type) {
                    case 1 /* QueryType.File */:
                        return provider.fileSearch(oneSchemeQuery, token);
                    case 2 /* QueryType.Text */:
                        return provider.textSearch(oneSchemeQuery, onProviderProgress, token);
                    default:
                        return provider.textSearch(oneSchemeQuery, onProviderProgress, token);
                }
            };
            searchPs.push(doProviderSearch());
        }));
        return Promise.all(searchPs).then(completes => {
            const endToEndTime = e2eSW.elapsed();
            this.logService.trace(`SearchService#search: ${endToEndTime}ms`);
            completes.forEach(complete => {
                this.sendTelemetry(query, endToEndTime, complete);
            });
            return completes;
        }, err => {
            const endToEndTime = e2eSW.elapsed();
            this.logService.trace(`SearchService#search: ${endToEndTime}ms`);
            const searchError = deserializeSearchError(err);
            this.logService.trace(`SearchService#searchError: ${searchError.message}`);
            this.sendTelemetry(query, endToEndTime, undefined, searchError);
            throw searchError;
        });
    }
    groupFolderQueriesByScheme(query) {
        const queries = new Map();
        query.folderQueries.forEach(fq => {
            const schemeFQs = queries.get(fq.folder.scheme) || [];
            schemeFQs.push(fq);
            queries.set(fq.folder.scheme, schemeFQs);
        });
        return queries;
    }
    sendTelemetry(query, endToEndTime, complete, err) {
        if (!randomChance(5 / 100)) {
            // Noisy events, only send 5% of them
            return;
        }
        const fileSchemeOnly = query.folderQueries.every(fq => fq.folder.scheme === Schemas.file);
        const otherSchemeOnly = query.folderQueries.every(fq => fq.folder.scheme !== Schemas.file);
        const scheme = fileSchemeOnly ? Schemas.file :
            otherSchemeOnly ? 'other' :
                'mixed';
        if (query.type === 1 /* QueryType.File */ && complete && complete.stats) {
            const fileSearchStats = complete.stats;
            if (fileSearchStats.fromCache) {
                const cacheStats = fileSearchStats.detailStats;
                this.telemetryService.publicLog2('cachedSearchComplete', {
                    reason: query._reason,
                    resultCount: fileSearchStats.resultCount,
                    workspaceFolderCount: query.folderQueries.length,
                    endToEndTime: endToEndTime,
                    sortingTime: fileSearchStats.sortingTime,
                    cacheWasResolved: cacheStats.cacheWasResolved,
                    cacheLookupTime: cacheStats.cacheLookupTime,
                    cacheFilterTime: cacheStats.cacheFilterTime,
                    cacheEntryCount: cacheStats.cacheEntryCount,
                    scheme
                });
            }
            else {
                const searchEngineStats = fileSearchStats.detailStats;
                this.telemetryService.publicLog2('searchComplete', {
                    reason: query._reason,
                    resultCount: fileSearchStats.resultCount,
                    workspaceFolderCount: query.folderQueries.length,
                    endToEndTime: endToEndTime,
                    sortingTime: fileSearchStats.sortingTime,
                    fileWalkTime: searchEngineStats.fileWalkTime,
                    directoriesWalked: searchEngineStats.directoriesWalked,
                    filesWalked: searchEngineStats.filesWalked,
                    cmdTime: searchEngineStats.cmdTime,
                    cmdResultCount: searchEngineStats.cmdResultCount,
                    scheme
                });
            }
        }
        else if (query.type === 2 /* QueryType.Text */) {
            let errorType;
            if (err) {
                errorType = err.code === SearchErrorCode.regexParseError ? 'regex' :
                    err.code === SearchErrorCode.unknownEncoding ? 'encoding' :
                        err.code === SearchErrorCode.globParseError ? 'glob' :
                            err.code === SearchErrorCode.invalidLiteral ? 'literal' :
                                err.code === SearchErrorCode.other ? 'other' :
                                    err.code === SearchErrorCode.canceled ? 'canceled' :
                                        'unknown';
            }
            this.telemetryService.publicLog2('textSearchComplete', {
                reason: query._reason,
                workspaceFolderCount: query.folderQueries.length,
                endToEndTime: endToEndTime,
                scheme,
                error: errorType,
            });
        }
    }
    getOpenEditorResults(query) {
        const openEditorResults = new ResourceMap(uri => this.uriIdentityService.extUri.getComparisonKey(uri));
        let limitHit = false;
        if (query.type === 2 /* QueryType.Text */) {
            const canonicalToOriginalResources = new ResourceMap();
            for (const editorInput of this.editorService.editors) {
                const canonical = EditorResourceAccessor.getCanonicalUri(editorInput, { supportSideBySide: SideBySideEditor.PRIMARY });
                const original = EditorResourceAccessor.getOriginalUri(editorInput, { supportSideBySide: SideBySideEditor.PRIMARY });
                if (canonical) {
                    canonicalToOriginalResources.set(canonical, original ?? canonical);
                }
            }
            const models = this.modelService.getModels();
            models.forEach((model) => {
                const resource = model.uri;
                if (!resource) {
                    return;
                }
                if (limitHit) {
                    return;
                }
                const originalResource = canonicalToOriginalResources.get(resource);
                if (!originalResource) {
                    return;
                }
                // Skip search results
                if (model.getLanguageId() === SEARCH_RESULT_LANGUAGE_ID && !(query.includePattern && query.includePattern['**/*.code-search'])) {
                    // TODO: untitled search editors will be excluded from search even when include *.code-search is specified
                    return;
                }
                // Block walkthrough, webview, etc.
                if (originalResource.scheme !== Schemas.untitled && !this.fileService.hasProvider(originalResource)) {
                    return;
                }
                // Exclude files from the git FileSystemProvider, e.g. to prevent open staged files from showing in search results
                if (originalResource.scheme === 'git') {
                    return;
                }
                if (!this.matches(originalResource, query)) {
                    return; // respect user filters
                }
                // Use editor API to find matches
                const askMax = (isNumber(query.maxResults) ? query.maxResults : DEFAULT_MAX_SEARCH_RESULTS) + 1;
                let matches = model.findMatches(query.contentPattern.pattern, false, !!query.contentPattern.isRegExp, !!query.contentPattern.isCaseSensitive, query.contentPattern.isWordMatch ? query.contentPattern.wordSeparators : null, false, askMax);
                if (matches.length) {
                    if (askMax && matches.length >= askMax) {
                        limitHit = true;
                        matches = matches.slice(0, askMax - 1);
                    }
                    const fileMatch = new FileMatch(originalResource);
                    openEditorResults.set(originalResource, fileMatch);
                    const textSearchResults = editorMatchesToTextSearchResults(matches, model, query.previewOptions);
                    fileMatch.results = getTextSearchMatchWithModelContext(textSearchResults, model, query);
                }
                else {
                    openEditorResults.set(originalResource, null);
                }
            });
        }
        return {
            results: openEditorResults,
            limitHit
        };
    }
    matches(resource, query) {
        return pathIncludedInQuery(query, resource.fsPath);
    }
    async clearCache(cacheKey) {
        const clearPs = Array.from(this.fileSearchProviders.values())
            .map(provider => provider && provider.clearCache(cacheKey));
        await Promise.all(clearPs);
    }
};
SearchService = __decorate([
    __param(0, IModelService),
    __param(1, IEditorService),
    __param(2, ITelemetryService),
    __param(3, ILogService),
    __param(4, IExtensionService),
    __param(5, IFileService),
    __param(6, IUriIdentityService)
], SearchService);
export { SearchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9zZWFyY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFn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