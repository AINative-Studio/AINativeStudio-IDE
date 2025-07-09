/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isThenable } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { FolderQuerySearchTree } from './folderQuerySearchTree.js';
import { DEFAULT_MAX_SEARCH_RESULTS, hasSiblingPromiseFn, excludeToGlobPattern, QueryGlobTester, resolvePatternsForProvider, DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS } from './search.js';
import { TextSearchMatch2 } from './searchExtTypes.js';
export class TextSearchManager {
    constructor(queryProviderPair, fileUtils, processType) {
        this.queryProviderPair = queryProviderPair;
        this.fileUtils = fileUtils;
        this.processType = processType;
        this.collector = null;
        this.isLimitHit = false;
        this.resultCount = 0;
    }
    get query() {
        return this.queryProviderPair.query;
    }
    search(onProgress, token) {
        const folderQueries = this.query.folderQueries || [];
        const tokenSource = new CancellationTokenSource(token);
        return new Promise((resolve, reject) => {
            this.collector = new TextSearchResultsCollector(onProgress);
            let isCanceled = false;
            const onResult = (result, folderIdx) => {
                if (isCanceled) {
                    return;
                }
                if (!this.isLimitHit) {
                    const resultSize = this.resultSize(result);
                    if (result instanceof TextSearchMatch2 && typeof this.query.maxResults === 'number' && this.resultCount + resultSize > this.query.maxResults) {
                        this.isLimitHit = true;
                        isCanceled = true;
                        tokenSource.cancel();
                        result = this.trimResultToSize(result, this.query.maxResults - this.resultCount);
                    }
                    const newResultSize = this.resultSize(result);
                    this.resultCount += newResultSize;
                    const a = result instanceof TextSearchMatch2;
                    if (newResultSize > 0 || !a) {
                        this.collector.add(result, folderIdx);
                    }
                }
            };
            // For each root folder
            this.doSearch(folderQueries, onResult, tokenSource.token).then(result => {
                tokenSource.dispose();
                this.collector.flush();
                resolve({
                    limitHit: this.isLimitHit || result?.limitHit,
                    messages: this.getMessagesFromResults(result),
                    stats: {
                        type: this.processType
                    }
                });
            }, (err) => {
                tokenSource.dispose();
                const errMsg = toErrorMessage(err);
                reject(new Error(errMsg));
            });
        });
    }
    getMessagesFromResults(result) {
        if (!result?.message) {
            return [];
        }
        if (Array.isArray(result.message)) {
            return result.message;
        }
        return [result.message];
    }
    resultSize(result) {
        if (result instanceof TextSearchMatch2) {
            return Array.isArray(result.ranges) ?
                result.ranges.length :
                1;
        }
        else {
            // #104400 context lines shoudn't count towards result count
            return 0;
        }
    }
    trimResultToSize(result, size) {
        return new TextSearchMatch2(result.uri, result.ranges.slice(0, size), result.previewText);
    }
    async doSearch(folderQueries, onResult, token) {
        const folderMappings = new FolderQuerySearchTree(folderQueries, (fq, i) => {
            const queryTester = new QueryGlobTester(this.query, fq);
            return { queryTester, folder: fq.folder, folderIdx: i };
        }, () => true);
        const testingPs = [];
        const progress = {
            report: (result) => {
                if (result.uri === undefined) {
                    throw Error('Text search result URI is undefined. Please check provider implementation.');
                }
                const folderQuery = folderMappings.findQueryFragmentAwareSubstr(result.uri);
                const hasSibling = folderQuery.folder.scheme === Schemas.file ?
                    hasSiblingPromiseFn(() => {
                        return this.fileUtils.readdir(resources.dirname(result.uri));
                    }) :
                    undefined;
                const relativePath = resources.relativePath(folderQuery.folder, result.uri);
                if (relativePath) {
                    // This method is only async when the exclude contains sibling clauses
                    const included = folderQuery.queryTester.includedInQuery(relativePath, path.basename(relativePath), hasSibling);
                    if (isThenable(included)) {
                        testingPs.push(included.then(isIncluded => {
                            if (isIncluded) {
                                onResult(result, folderQuery.folderIdx);
                            }
                        }));
                    }
                    else if (included) {
                        onResult(result, folderQuery.folderIdx);
                    }
                }
            }
        };
        const folderOptions = folderQueries.map(fq => this.getSearchOptionsForFolder(fq));
        const searchOptions = {
            folderOptions,
            maxFileSize: this.query.maxFileSize,
            maxResults: this.query.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS,
            previewOptions: this.query.previewOptions ?? DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS,
            surroundingContext: this.query.surroundingContext ?? 0,
        };
        if ('usePCRE2' in this.query) {
            searchOptions.usePCRE2 = this.query.usePCRE2;
        }
        let result;
        if (this.queryProviderPair.query.type === 3 /* QueryType.aiText */) {
            result = await this.queryProviderPair.provider.provideAITextSearchResults(this.queryProviderPair.query.contentPattern, searchOptions, progress, token);
        }
        else {
            result = await this.queryProviderPair.provider.provideTextSearchResults(patternInfoToQuery(this.queryProviderPair.query.contentPattern), searchOptions, progress, token);
        }
        if (testingPs.length) {
            await Promise.all(testingPs);
        }
        return result;
    }
    getSearchOptionsForFolder(fq) {
        const includes = resolvePatternsForProvider(this.query.includePattern, fq.includePattern);
        let excludePattern = fq.excludePattern?.map(e => ({
            folder: e.folder,
            patterns: resolvePatternsForProvider(this.query.excludePattern, e.pattern)
        }));
        if (!excludePattern || excludePattern.length === 0) {
            excludePattern = [{
                    folder: undefined,
                    patterns: resolvePatternsForProvider(this.query.excludePattern, undefined)
                }];
        }
        const excludes = excludeToGlobPattern(excludePattern);
        const options = {
            folder: URI.from(fq.folder),
            excludes,
            includes,
            useIgnoreFiles: {
                local: !fq.disregardIgnoreFiles,
                parent: !fq.disregardParentIgnoreFiles,
                global: !fq.disregardGlobalIgnoreFiles
            },
            followSymlinks: !fq.ignoreSymlinks,
            encoding: (fq.fileEncoding && this.fileUtils.toCanonicalName(fq.fileEncoding)) ?? '',
        };
        return options;
    }
}
function patternInfoToQuery(patternInfo) {
    return {
        isCaseSensitive: patternInfo.isCaseSensitive || false,
        isRegExp: patternInfo.isRegExp || false,
        isWordMatch: patternInfo.isWordMatch || false,
        isMultiline: patternInfo.isMultiline || false,
        pattern: patternInfo.pattern
    };
}
export class TextSearchResultsCollector {
    constructor(_onResult) {
        this._onResult = _onResult;
        this._currentFolderIdx = -1;
        this._currentFileMatch = null;
        this._batchedCollector = new BatchedCollector(512, items => this.sendItems(items));
    }
    add(data, folderIdx) {
        // Collects TextSearchResults into IInternalFileMatches and collates using BatchedCollector.
        // This is efficient for ripgrep which sends results back one file at a time. It wouldn't be efficient for other search
        // providers that send results in random order. We could do this step afterwards instead.
        if (this._currentFileMatch && (this._currentFolderIdx !== folderIdx || !resources.isEqual(this._currentUri, data.uri))) {
            this.pushToCollector();
            this._currentFileMatch = null;
        }
        if (!this._currentFileMatch) {
            this._currentFolderIdx = folderIdx;
            this._currentFileMatch = {
                resource: data.uri,
                results: []
            };
        }
        this._currentFileMatch.results.push(extensionResultToFrontendResult(data));
    }
    pushToCollector() {
        const size = this._currentFileMatch && this._currentFileMatch.results ?
            this._currentFileMatch.results.length :
            0;
        this._batchedCollector.addItem(this._currentFileMatch, size);
    }
    flush() {
        this.pushToCollector();
        this._batchedCollector.flush();
    }
    sendItems(items) {
        this._onResult(items);
    }
}
function extensionResultToFrontendResult(data) {
    // Warning: result from RipgrepTextSearchEH has fake Range. Don't depend on any other props beyond these...
    if (data instanceof TextSearchMatch2) {
        return {
            previewText: data.previewText,
            rangeLocations: data.ranges.map(r => ({
                preview: {
                    startLineNumber: r.previewRange.start.line,
                    startColumn: r.previewRange.start.character,
                    endLineNumber: r.previewRange.end.line,
                    endColumn: r.previewRange.end.character
                },
                source: {
                    startLineNumber: r.sourceRange.start.line,
                    startColumn: r.sourceRange.start.character,
                    endLineNumber: r.sourceRange.end.line,
                    endColumn: r.sourceRange.end.character
                },
            })),
        };
    }
    else {
        return {
            text: data.text,
            lineNumber: data.lineNumber
        };
    }
}
/**
 * Collects items that have a size - before the cumulative size of collected items reaches START_BATCH_AFTER_COUNT, the callback is called for every
 * set of items collected.
 * But after that point, the callback is called with batches of maxBatchSize.
 * If the batch isn't filled within some time, the callback is also called.
 */
export class BatchedCollector {
    static { this.TIMEOUT = 4000; }
    // After START_BATCH_AFTER_COUNT items have been collected, stop flushing on timeout
    static { this.START_BATCH_AFTER_COUNT = 50; }
    constructor(maxBatchSize, cb) {
        this.maxBatchSize = maxBatchSize;
        this.cb = cb;
        this.totalNumberCompleted = 0;
        this.batch = [];
        this.batchSize = 0;
    }
    addItem(item, size) {
        if (!item) {
            return;
        }
        this.addItemToBatch(item, size);
    }
    addItems(items, size) {
        if (!items) {
            return;
        }
        this.addItemsToBatch(items, size);
    }
    addItemToBatch(item, size) {
        this.batch.push(item);
        this.batchSize += size;
        this.onUpdate();
    }
    addItemsToBatch(item, size) {
        this.batch = this.batch.concat(item);
        this.batchSize += size;
        this.onUpdate();
    }
    onUpdate() {
        if (this.totalNumberCompleted < BatchedCollector.START_BATCH_AFTER_COUNT) {
            // Flush because we aren't batching yet
            this.flush();
        }
        else if (this.batchSize >= this.maxBatchSize) {
            // Flush because the batch is full
            this.flush();
        }
        else if (!this.timeoutHandle) {
            // No timeout running, start a timeout to flush
            this.timeoutHandle = setTimeout(() => {
                this.flush();
            }, BatchedCollector.TIMEOUT);
        }
    }
    flush() {
        if (this.batchSize) {
            this.totalNumberCompleted += this.batchSize;
            this.cb(this.batch);
            this.batch = [];
            this.batchSize = 0;
            if (this.timeoutHandle) {
                clearTimeout(this.timeoutHandle);
                this.timeoutHandle = 0;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vdGV4dFNlYXJjaE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLG1CQUFtQixFQUEyRSxvQkFBb0IsRUFBNkgsZUFBZSxFQUFhLDBCQUEwQixFQUFnQixtQ0FBbUMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNuWixPQUFPLEVBQXVCLGdCQUFnQixFQUE4SSxNQUFNLHFCQUFxQixDQUFDO0FBbUJ4TixNQUFNLE9BQU8saUJBQWlCO0lBTzdCLFlBQW9CLGlCQUFvRSxFQUMvRSxTQUFxQixFQUNyQixXQUFxQztRQUYxQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1EO1FBQy9FLGNBQVMsR0FBVCxTQUFTLENBQVk7UUFDckIsZ0JBQVcsR0FBWCxXQUFXLENBQTBCO1FBUHRDLGNBQVMsR0FBc0MsSUFBSSxDQUFD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