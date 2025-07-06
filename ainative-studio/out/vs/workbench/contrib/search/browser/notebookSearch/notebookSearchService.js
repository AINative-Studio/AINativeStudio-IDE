var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ResourceSet, ResourceMap } from '../../../../../base/common/map.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { contentMatchesToTextSearchMatches, webviewMatchesToTextSearchMatches } from './searchNotebookHelpers.js';
import { pathIncludedInQuery, ISearchService, DEFAULT_MAX_SEARCH_RESULTS } from '../../../../services/search/common/search.js';
import * as arrays from '../../../../../base/common/arrays.js';
import { isNumber } from '../../../../../base/common/types.js';
import { IEditorResolverService } from '../../../../services/editor/common/editorResolverService.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { QueryBuilder } from '../../../../services/search/common/queryBuilder.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
let NotebookSearchService = class NotebookSearchService {
    constructor(uriIdentityService, notebookEditorService, logService, notebookService, configurationService, editorResolverService, searchService, instantiationService) {
        this.uriIdentityService = uriIdentityService;
        this.notebookEditorService = notebookEditorService;
        this.logService = logService;
        this.notebookService = notebookService;
        this.configurationService = configurationService;
        this.editorResolverService = editorResolverService;
        this.searchService = searchService;
        this.queryBuilder = instantiationService.createInstance(QueryBuilder);
    }
    notebookSearch(query, token, searchInstanceID, onProgress) {
        if (query.type !== 2 /* QueryType.Text */) {
            return {
                openFilesToScan: new ResourceSet(),
                completeData: Promise.resolve({
                    messages: [],
                    limitHit: false,
                    results: [],
                }),
                allScannedFiles: Promise.resolve(new ResourceSet()),
            };
        }
        const localNotebookWidgets = this.getLocalNotebookWidgets();
        const localNotebookFiles = localNotebookWidgets.map(widget => widget.viewModel.uri);
        const getAllResults = () => {
            const searchStart = Date.now();
            const localResultPromise = this.getLocalNotebookResults(query, token ?? CancellationToken.None, localNotebookWidgets, searchInstanceID);
            const searchLocalEnd = Date.now();
            const experimentalNotebooksEnabled = this.configurationService.getValue('search').experimental?.closedNotebookRichContentResults ?? false;
            let closedResultsPromise = Promise.resolve(undefined);
            if (experimentalNotebooksEnabled) {
                closedResultsPromise = this.getClosedNotebookResults(query, new ResourceSet(localNotebookFiles, uri => this.uriIdentityService.extUri.getComparisonKey(uri)), token ?? CancellationToken.None);
            }
            const promise = Promise.all([localResultPromise, closedResultsPromise]);
            return {
                completeData: promise.then((resolvedPromise) => {
                    const openNotebookResult = resolvedPromise[0];
                    const closedNotebookResult = resolvedPromise[1];
                    const resolved = resolvedPromise.filter((e) => !!e);
                    const resultArray = [...openNotebookResult.results.values(), ...closedNotebookResult?.results.values() ?? []];
                    const results = arrays.coalesce(resultArray);
                    if (onProgress) {
                        results.forEach(onProgress);
                    }
                    this.logService.trace(`local notebook search time | ${searchLocalEnd - searchStart}ms`);
                    return {
                        messages: [],
                        limitHit: resolved.reduce((prev, cur) => prev || cur.limitHit, false),
                        results,
                    };
                }),
                allScannedFiles: promise.then(resolvedPromise => {
                    const openNotebookResults = resolvedPromise[0];
                    const closedNotebookResults = resolvedPromise[1];
                    const results = arrays.coalesce([...openNotebookResults.results.keys(), ...closedNotebookResults?.results.keys() ?? []]);
                    return new ResourceSet(results, uri => this.uriIdentityService.extUri.getComparisonKey(uri));
                })
            };
        };
        const promiseResults = getAllResults();
        return {
            openFilesToScan: new ResourceSet(localNotebookFiles),
            completeData: promiseResults.completeData,
            allScannedFiles: promiseResults.allScannedFiles
        };
    }
    async doesFileExist(includes, folderQueries, token) {
        const promises = includes.map(async (includePattern) => {
            const query = this.queryBuilder.file(folderQueries.map(e => e.folder), {
                includePattern: includePattern.startsWith('/') ? includePattern : '**/' + includePattern, // todo: find cleaner way to ensure that globs match all appropriate filetypes
                exists: true,
                onlyFileScheme: true,
            });
            return this.searchService.fileSearch(query, token).then((ret) => {
                return !!ret.limitHit;
            });
        });
        return Promise.any(promises);
    }
    async getClosedNotebookResults(textQuery, scannedFiles, token) {
        const userAssociations = this.editorResolverService.getAllUserAssociations();
        const allPriorityInfo = new Map();
        const contributedNotebookTypes = this.notebookService.getContributedNotebookTypes();
        userAssociations.forEach(association => {
            // we gather the editor associations here, but cannot check them until we actually have the files that the glob matches
            // this is because longer patterns take precedence over shorter ones, and even if there is a user association that
            // specifies the exact same glob as a contributed notebook type, there might be another user association that is longer/more specific
            // that still matches the path and should therefore take more precedence.
            if (!association.filenamePattern) {
                return;
            }
            const info = {
                isFromSettings: true,
                filenamePatterns: [association.filenamePattern]
            };
            const existingEntry = allPriorityInfo.get(association.viewType);
            if (existingEntry) {
                allPriorityInfo.set(association.viewType, existingEntry.concat(info));
            }
            else {
                allPriorityInfo.set(association.viewType, [info]);
            }
        });
        const promises = [];
        contributedNotebookTypes.forEach((notebook) => {
            if (notebook.selectors.length > 0) {
                promises.push((async () => {
                    const includes = notebook.selectors.map((selector) => {
                        const globPattern = selector.include || selector;
                        return globPattern.toString();
                    });
                    const isInWorkspace = await this.doesFileExist(includes, textQuery.folderQueries, token);
                    if (isInWorkspace) {
                        const canResolve = await this.notebookService.canResolve(notebook.id);
                        if (!canResolve) {
                            return undefined;
                        }
                        const serializer = (await this.notebookService.withNotebookDataProvider(notebook.id)).serializer;
                        return await serializer.searchInNotebooks(textQuery, token, allPriorityInfo);
                    }
                    else {
                        return undefined;
                    }
                })());
            }
        });
        const start = Date.now();
        const searchComplete = arrays.coalesce(await Promise.all(promises));
        const results = searchComplete.flatMap(e => e.results);
        let limitHit = searchComplete.some(e => e.limitHit);
        // results are already sorted with high priority first, filter out duplicates.
        const uniqueResults = new ResourceMap(uri => this.uriIdentityService.extUri.getComparisonKey(uri));
        let numResults = 0;
        for (const result of results) {
            if (textQuery.maxResults && numResults >= textQuery.maxResults) {
                limitHit = true;
                break;
            }
            if (!scannedFiles.has(result.resource) && !uniqueResults.has(result.resource)) {
                uniqueResults.set(result.resource, result.cellResults.length > 0 ? result : null);
                numResults++;
            }
        }
        const end = Date.now();
        this.logService.trace(`query: ${textQuery.contentPattern.pattern}`);
        this.logService.trace(`closed notebook search time | ${end - start}ms`);
        return {
            results: uniqueResults,
            limitHit
        };
    }
    async getLocalNotebookResults(query, token, widgets, searchID) {
        const localResults = new ResourceMap(uri => this.uriIdentityService.extUri.getComparisonKey(uri));
        let limitHit = false;
        for (const widget of widgets) {
            if (!widget.hasModel()) {
                continue;
            }
            const askMax = (isNumber(query.maxResults) ? query.maxResults : DEFAULT_MAX_SEARCH_RESULTS) + 1;
            const uri = widget.viewModel.uri;
            if (!pathIncludedInQuery(query, uri.fsPath)) {
                continue;
            }
            let matches = await widget
                .find(query.contentPattern.pattern, {
                regex: query.contentPattern.isRegExp,
                wholeWord: query.contentPattern.isWordMatch,
                caseSensitive: query.contentPattern.isCaseSensitive,
                includeMarkupInput: query.contentPattern.notebookInfo?.isInNotebookMarkdownInput ?? true,
                includeMarkupPreview: query.contentPattern.notebookInfo?.isInNotebookMarkdownPreview ?? true,
                includeCodeInput: query.contentPattern.notebookInfo?.isInNotebookCellInput ?? true,
                includeOutput: query.contentPattern.notebookInfo?.isInNotebookCellOutput ?? true,
            }, token, false, true, searchID);
            if (matches.length) {
                if (askMax && matches.length >= askMax) {
                    limitHit = true;
                    matches = matches.slice(0, askMax - 1);
                }
                const cellResults = matches.map(match => {
                    const contentResults = contentMatchesToTextSearchMatches(match.contentMatches, match.cell);
                    const webviewResults = webviewMatchesToTextSearchMatches(match.webviewMatches);
                    return {
                        cell: match.cell,
                        index: match.index,
                        contentResults: contentResults,
                        webviewResults: webviewResults,
                    };
                });
                const fileMatch = {
                    resource: uri, cellResults: cellResults
                };
                localResults.set(uri, fileMatch);
            }
            else {
                localResults.set(uri, null);
            }
        }
        return {
            results: localResults,
            limitHit
        };
    }
    getLocalNotebookWidgets() {
        const notebookWidgets = this.notebookEditorService.retrieveAllExistingWidgets();
        return notebookWidgets
            .map(widget => widget.value)
            .filter((val) => !!val && val.hasModel());
    }
};
NotebookSearchService = __decorate([
    __param(0, IUriIdentityService),
    __param(1, INotebookEditorService),
    __param(2, ILogService),
    __param(3, INotebookService),
    __param(4, IConfigurationService),
    __param(5, IEditorResolverService),
    __param(6, ISearchService),
    __param(7, IInstantiationService)
], NotebookSearchService);
export { NotebookSearchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9ub3RlYm9va1NlYXJjaC9ub3RlYm9va1NlYXJjaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFL0UsT0FBTyxFQUE0RCxpQ0FBaUMsRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVLLE9BQU8sRUFBK0YsbUJBQW1CLEVBQUUsY0FBYyxFQUFnQiwwQkFBMEIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzFPLE9BQU8sS0FBSyxNQUFNLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRXJHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBR3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNsRixPQUFPLEVBQUUs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