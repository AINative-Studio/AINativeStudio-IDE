/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../../base/common/arrays.js';
import { createCancelablePromise } from '../../../../base/common/async.js';
import { canceled } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { compareItemsByFuzzyScore, prepareQuery } from '../../../../base/common/fuzzyScorer.js';
import { revive } from '../../../../base/common/marshalling.js';
import { basename, dirname, join, sep } from '../../../../base/common/path.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import { ByteSize } from '../../../../platform/files/common/files.js';
import { DEFAULT_MAX_SEARCH_RESULTS, isFilePatternMatch } from '../common/search.js';
import { Engine as FileSearchEngine } from './fileSearch.js';
import { TextSearchEngineAdapter } from './textSearchAdapter.js';
export class SearchService {
    static { this.BATCH_SIZE = 512; }
    constructor(processType = 'searchProcess', getNumThreads) {
        this.processType = processType;
        this.getNumThreads = getNumThreads;
        this.caches = Object.create(null);
    }
    fileSearch(config) {
        let promise;
        const query = reviveQuery(config);
        const emitter = new Emitter({
            onDidAddFirstListener: () => {
                promise = createCancelablePromise(async (token) => {
                    const numThreads = await this.getNumThreads?.();
                    return this.doFileSearchWithEngine(FileSearchEngine, query, p => emitter.fire(p), token, SearchService.BATCH_SIZE, numThreads);
                });
                promise.then(c => emitter.fire(c), err => emitter.fire({ type: 'error', error: { message: err.message, stack: err.stack } }));
            },
            onDidRemoveLastListener: () => {
                promise.cancel();
            }
        });
        return emitter.event;
    }
    textSearch(rawQuery) {
        let promise;
        const query = reviveQuery(rawQuery);
        const emitter = new Emitter({
            onDidAddFirstListener: () => {
                promise = createCancelablePromise(token => {
                    return this.ripgrepTextSearch(query, p => emitter.fire(p), token);
                });
                promise.then(c => emitter.fire(c), err => emitter.fire({ type: 'error', error: { message: err.message, stack: err.stack } }));
            },
            onDidRemoveLastListener: () => {
                promise.cancel();
            }
        });
        return emitter.event;
    }
    async ripgrepTextSearch(config, progressCallback, token) {
        config.maxFileSize = this.getPlatformFileLimits().maxFileSize;
        const numThreads = await this.getNumThreads?.();
        const engine = new TextSearchEngineAdapter(config, numThreads);
        return engine.search(token, progressCallback, progressCallback);
    }
    getPlatformFileLimits() {
        return {
            maxFileSize: 16 * ByteSize.GB
        };
    }
    doFileSearch(config, numThreads, progressCallback, token) {
        return this.doFileSearchWithEngine(FileSearchEngine, config, progressCallback, token, SearchService.BATCH_SIZE, numThreads);
    }
    doFileSearchWithEngine(EngineClass, config, progressCallback, token, batchSize = SearchService.BATCH_SIZE, threads) {
        let resultCount = 0;
        const fileProgressCallback = progress => {
            if (Array.isArray(progress)) {
                resultCount += progress.length;
                progressCallback(progress.map(m => this.rawMatchToSearchItem(m)));
            }
            else if (progress.relativePath) {
                resultCount++;
                progressCallback(this.rawMatchToSearchItem(progress));
            }
            else {
                progressCallback(progress);
            }
        };
        if (config.sortByScore) {
            let sortedSearch = this.trySortedSearchFromCache(config, fileProgressCallback, token);
            if (!sortedSearch) {
                const walkerConfig = config.maxResults ? Object.assign({}, config, { maxResults: null }) : config;
                const engine = new EngineClass(walkerConfig, threads);
                sortedSearch = this.doSortedSearch(engine, config, progressCallback, fileProgressCallback, token);
            }
            return new Promise((c, e) => {
                sortedSearch.then(([result, rawMatches]) => {
                    const serializedMatches = rawMatches.map(rawMatch => this.rawMatchToSearchItem(rawMatch));
                    this.sendProgress(serializedMatches, progressCallback, batchSize);
                    c(result);
                }, e);
            });
        }
        const engine = new EngineClass(config, threads);
        return this.doSearch(engine, fileProgressCallback, batchSize, token).then(complete => {
            return {
                limitHit: complete.limitHit,
                type: 'success',
                stats: {
                    detailStats: complete.stats,
                    type: this.processType,
                    fromCache: false,
                    resultCount,
                    sortingTime: undefined
                },
                messages: []
            };
        });
    }
    rawMatchToSearchItem(match) {
        return { path: match.base ? join(match.base, match.relativePath) : match.relativePath };
    }
    doSortedSearch(engine, config, progressCallback, fileProgressCallback, token) {
        const emitter = new Emitter();
        let allResultsPromise = createCancelablePromise(token => {
            let results = [];
            const innerProgressCallback = progress => {
                if (Array.isArray(progress)) {
                    results = progress;
                }
                else {
                    fileProgressCallback(progress);
                    emitter.fire(progress);
                }
            };
            return this.doSearch(engine, innerProgressCallback, -1, token)
                .then(result => {
                return [result, results];
            });
        });
        let cache;
        if (config.cacheKey) {
            cache = this.getOrCreateCache(config.cacheKey);
            const cacheRow = {
                promise: allResultsPromise,
                event: emitter.event,
                resolved: false
            };
            cache.resultsToSearchCache[config.filePattern || ''] = cacheRow;
            allResultsPromise.then(() => {
                cacheRow.resolved = true;
            }, err => {
                delete cache.resultsToSearchCache[config.filePattern || ''];
            });
            allResultsPromise = this.preventCancellation(allResultsPromise);
        }
        return allResultsPromise.then(([result, results]) => {
            const scorerCache = cache ? cache.scorerCache : Object.create(null);
            const sortSW = (typeof config.maxResults !== 'number' || config.maxResults > 0) && StopWatch.create(false);
            return this.sortResults(config, results, scorerCache, token)
                .then(sortedResults => {
                // sortingTime: -1 indicates a "sorted" search that was not sorted, i.e. populating the cache when quickaccess is opened.
                // Contrasting with findFiles which is not sorted and will have sortingTime: undefined
                const sortingTime = sortSW ? sortSW.elapsed() : -1;
                return [{
                        type: 'success',
                        stats: {
                            detailStats: result.stats,
                            sortingTime,
                            fromCache: false,
                            type: this.processType,
                            resultCount: sortedResults.length
                        },
                        messages: result.messages,
                        limitHit: result.limitHit || typeof config.maxResults === 'number' && results.length > config.maxResults
                    }, sortedResults];
            });
        });
    }
    getOrCreateCache(cacheKey) {
        const existing = this.caches[cacheKey];
        if (existing) {
            return existing;
        }
        return this.caches[cacheKey] = new Cache();
    }
    trySortedSearchFromCache(config, progressCallback, token) {
        const cache = config.cacheKey && this.caches[config.cacheKey];
        if (!cache) {
            return undefined;
        }
        const cached = this.getResultsFromCache(cache, config.filePattern || '', progressCallback, token);
        if (cached) {
            return cached.then(([result, results, cacheStats]) => {
                const sortSW = StopWatch.create(false);
                return this.sortResults(config, results, cache.scorerCache, token)
                    .then(sortedResults => {
                    const sortingTime = sortSW.elapsed();
                    const stats = {
                        fromCache: true,
                        detailStats: cacheStats,
                        type: this.processType,
                        resultCount: results.length,
                        sortingTime
                    };
                    return [
                        {
                            type: 'success',
                            limitHit: result.limitHit || typeof config.maxResults === 'number' && results.length > config.maxResults,
                            stats,
                            messages: [],
                        },
                        sortedResults
                    ];
                });
            });
        }
        return undefined;
    }
    sortResults(config, results, scorerCache, token) {
        // we use the same compare function that is used later when showing the results using fuzzy scoring
        // this is very important because we are also limiting the number of results by config.maxResults
        // and as such we want the top items to be included in this result set if the number of items
        // exceeds config.maxResults.
        const query = prepareQuery(config.filePattern || '');
        const compare = (matchA, matchB) => compareItemsByFuzzyScore(matchA, matchB, query, true, FileMatchItemAccessor, scorerCache);
        const maxResults = typeof config.maxResults === 'number' ? config.maxResults : DEFAULT_MAX_SEARCH_RESULTS;
        return arrays.topAsync(results, compare, maxResults, 10000, token);
    }
    sendProgress(results, progressCb, batchSize) {
        if (batchSize && batchSize > 0) {
            for (let i = 0; i < results.length; i += batchSize) {
                progressCb(results.slice(i, i + batchSize));
            }
        }
        else {
            progressCb(results);
        }
    }
    getResultsFromCache(cache, searchValue, progressCallback, token) {
        const cacheLookupSW = StopWatch.create(false);
        // Find cache entries by prefix of search value
        const hasPathSep = searchValue.indexOf(sep) >= 0;
        let cachedRow;
        for (const previousSearch in cache.resultsToSearchCache) {
            // If we narrow down, we might be able to reuse the cached results
            if (searchValue.startsWith(previousSearch)) {
                if (hasPathSep && previousSearch.indexOf(sep) < 0 && previousSearch !== '') {
                    continue; // since a path character widens the search for potential more matches, require it in previous search too
                }
                const row = cache.resultsToSearchCache[previousSearch];
                cachedRow = {
                    promise: this.preventCancellation(row.promise),
                    event: row.event,
                    resolved: row.resolved
                };
                break;
            }
        }
        if (!cachedRow) {
            return null;
        }
        const cacheLookupTime = cacheLookupSW.elapsed();
        const cacheFilterSW = StopWatch.create(false);
        const listener = cachedRow.event(progressCallback);
        if (token) {
            token.onCancellationRequested(() => {
                listener.dispose();
            });
        }
        return cachedRow.promise.then(([complete, cachedEntries]) => {
            if (token && token.isCancellationRequested) {
                throw canceled();
            }
            // Pattern match on results
            const results = [];
            const normalizedSearchValueLowercase = prepareQuery(searchValue).normalizedLowercase;
            for (const entry of cachedEntries) {
                // Check if this entry is a match for the search value
                if (!isFilePatternMatch(entry, normalizedSearchValueLowercase)) {
                    continue;
                }
                results.push(entry);
            }
            return [complete, results, {
                    cacheWasResolved: cachedRow.resolved,
                    cacheLookupTime,
                    cacheFilterTime: cacheFilterSW.elapsed(),
                    cacheEntryCount: cachedEntries.length
                }];
        });
    }
    doSearch(engine, progressCallback, batchSize, token) {
        return new Promise((c, e) => {
            let batch = [];
            token?.onCancellationRequested(() => engine.cancel());
            engine.search((match) => {
                if (match) {
                    if (batchSize) {
                        batch.push(match);
                        if (batchSize > 0 && batch.length >= batchSize) {
                            progressCallback(batch);
                            batch = [];
                        }
                    }
                    else {
                        progressCallback(match);
                    }
                }
            }, (progress) => {
                progressCallback(progress);
            }, (error, complete) => {
                if (batch.length) {
                    progressCallback(batch);
                }
                if (error) {
                    progressCallback({ message: 'Search finished. Error: ' + error.message });
                    e(error);
                }
                else {
                    progressCallback({ message: 'Search finished. Stats: ' + JSON.stringify(complete.stats) });
                    c(complete);
                }
            });
        });
    }
    clearCache(cacheKey) {
        delete this.caches[cacheKey];
        return Promise.resolve(undefined);
    }
    /**
     * Return a CancelablePromise which is not actually cancelable
     * TODO@rob - Is this really needed?
     */
    preventCancellation(promise) {
        return new class {
            get [Symbol.toStringTag]() { return this.toString(); }
            cancel() {
                // Do nothing
            }
            then(resolve, reject) {
                return promise.then(resolve, reject);
            }
            catch(reject) {
                return this.then(undefined, reject);
            }
            finally(onFinally) {
                return promise.finally(onFinally);
            }
        };
    }
}
class Cache {
    constructor() {
        this.resultsToSearchCache = Object.create(null);
        this.scorerCache = Object.create(null);
    }
}
const FileMatchItemAccessor = new class {
    getItemLabel(match) {
        return basename(match.relativePath); // e.g. myFile.txt
    }
    getItemDescription(match) {
        return dirname(match.relativePath); // e.g. some/path/to/file
    }
    getItemPath(match) {
        return match.relativePath; // e.g. some/path/to/file/myFile.txt
    }
};
function reviveQuery(rawQuery) {
    return {
        ...rawQuery, // TODO
        ...{
            folderQueries: rawQuery.folderQueries && rawQuery.folderQueries.map(reviveFolderQuery),
            extraFileResources: rawQuery.extraFileResources && rawQuery.extraFileResources.map(components => URI.revive(components))
        }
    };
}
function reviveFolderQuery(rawFolderQuery) {
    return revive(rawFolderQuery);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3U2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL25vZGUvcmF3U2VhcmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx3QkFBd0IsRUFBbUMsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakksT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLDBCQUEwQixFQUF1VSxrQkFBa0IsRUFBYyxNQUFNLHFCQUFxQixDQUFDO0FBQ3RhLE9BQU8sRUFBRSxNQUFNLElBQUksZ0JBQWdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUtqRSxNQUFNLE9BQU8sYUFBYTthQUVELGVBQVUsR0FBRyxHQUFHLEFB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