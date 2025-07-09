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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL25vdGVib29rU2VhcmNoL25vdGVib29rU2VhcmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUUvRSxPQUFPLEVBQTRELGlDQUFpQyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUssT0FBTyxFQUErRixtQkFBbUIsRUFBRSxjQUFjLEVBQWdCLDBCQUEwQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDMU8sT0FBTyxLQUFLLE1BQU0sTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFckcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFHckcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBVS9GLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBR2pDLFlBQ3VDLGtCQUF1QyxFQUNwQyxxQkFBNkMsRUFDeEQsVUFBdUIsRUFDbEIsZUFBaUMsRUFDNUIsb0JBQTJDLEVBQzFDLHFCQUE2QyxFQUNyRCxhQUE2QixFQUN2QyxvQkFBMkM7UUFQNUIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNwQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBQ3hELGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQzVCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDMUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUNyRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFHOUQsSUFBSSxDQUFDLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUFpQixFQUFFLEtBQW9DLEVBQUUsZ0JBQXdCLEVBQUUsVUFBa0Q7UUFNbkosSUFBSSxLQUFLLENBQUMsSUFBSSwyQkFBbUIsRUFBRSxDQUFDO1lBQ25DLE9BQU87Z0JBQ04sZUFBZSxFQUFFLElBQUksV0FBVyxFQUFFO2dCQUNsQyxZQUFZLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQztvQkFDN0IsUUFBUSxFQUFFLEVBQUU7b0JBQ1osUUFBUSxFQUFFLEtBQUs7b0JBQ2YsT0FBTyxFQUFFLEVBQUU7aUJBQ1gsQ0FBQztnQkFDRixlQUFlLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDO2FBQ25ELENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUM1RCxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckYsTUFBTSxhQUFhLEdBQUcsR0FBc0YsRUFBRTtZQUM3RyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFL0IsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLEtBQUssSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUN4SSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFbEMsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFpQyxRQUFRLENBQUMsQ0FBQyxZQUFZLEVBQUUsZ0NBQWdDLElBQUksS0FBSyxDQUFDO1lBRTFLLElBQUksb0JBQW9CLEdBQXNELE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekcsSUFBSSw0QkFBNEIsRUFBRSxDQUFDO2dCQUNsQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLElBQUksV0FBVyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoTSxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUN4RSxPQUFPO2dCQUNOLFlBQVksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFtQixFQUFFO29CQUMvRCxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBRWhELE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQWtFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BILE1BQU0sV0FBVyxHQUFHLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQzlHLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQzdDLElBQUksVUFBVSxFQUFFLENBQUM7d0JBQ2hCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQzdCLENBQUM7b0JBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLGNBQWMsR0FBRyxXQUFXLElBQUksQ0FBQyxDQUFDO29CQUN4RixPQUFPO3dCQUNOLFFBQVEsRUFBRSxFQUFFO3dCQUNaLFFBQVEsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDO3dCQUNyRSxPQUFPO3FCQUNQLENBQUM7Z0JBQ0gsQ0FBQyxDQUFDO2dCQUNGLGVBQWUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFO29CQUMvQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0MsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLHFCQUFxQixFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUN6SCxPQUFPLElBQUksV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDOUYsQ0FBQyxDQUFDO2FBQ0YsQ0FBQztRQUNILENBQUMsQ0FBQztRQUNGLE1BQU0sY0FBYyxHQUFHLGFBQWEsRUFBRSxDQUFDO1FBQ3ZDLE9BQU87WUFDTixlQUFlLEVBQUUsSUFBSSxXQUFXLENBQUMsa0JBQWtCLENBQUM7WUFDcEQsWUFBWSxFQUFFLGNBQWMsQ0FBQyxZQUFZO1lBQ3pDLGVBQWUsRUFBRSxjQUFjLENBQUMsZUFBZTtTQUMvQyxDQUFDO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBa0IsRUFBRSxhQUFrQyxFQUFFLEtBQXdCO1FBQzNHLE1BQU0sUUFBUSxHQUF1QixRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxjQUFjLEVBQUMsRUFBRTtZQUN4RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN0RSxjQUFjLEVBQUUsY0FBYyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsY0FBYyxFQUFFLDhFQUE4RTtnQkFDeEssTUFBTSxFQUFFLElBQUk7Z0JBQ1osY0FBYyxFQUFFLElBQUk7YUFDcEIsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FDbkMsS0FBSyxFQUNMLEtBQUssQ0FDTCxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNkLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRU8sS0FBSyxDQUFDLHdCQUF3QixDQUFDLFNBQXFCLEVBQUUsWUFBeUIsRUFBRSxLQUF3QjtRQUVoSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzdFLE1BQU0sZUFBZSxHQUF3QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3ZFLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBR3BGLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUV0Qyx1SEFBdUg7WUFDdkgsa0hBQWtIO1lBQ2xILHFJQUFxSTtZQUNySSx5RUFBeUU7WUFDekUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDbEMsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLElBQUksR0FBeUI7Z0JBQ2xDLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixnQkFBZ0IsRUFBRSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUM7YUFDL0MsQ0FBQztZQUVGLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2hFLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLGVBQWUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdkUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGVBQWUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbkQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBR0ssRUFBRSxDQUFDO1FBRXRCLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzdDLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDekIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTt3QkFDcEQsTUFBTSxXQUFXLEdBQUksUUFBNkMsQ0FBQyxPQUFPLElBQUksUUFBMEMsQ0FBQzt3QkFDekgsT0FBTyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQy9CLENBQUMsQ0FBQyxDQUFDO29CQUVILE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDekYsSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDbkIsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ3RFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzs0QkFDakIsT0FBTyxTQUFTLENBQUM7d0JBQ2xCLENBQUM7d0JBQ0QsTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO3dCQUNqRyxPQUFPLE1BQU0sVUFBVSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7b0JBQzlFLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxPQUFPLFNBQVMsQ0FBQztvQkFDbEIsQ0FBQztnQkFDRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDUCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDekIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNwRSxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZELElBQUksUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFcEQsOEVBQThFO1FBQzlFLE1BQU0sYUFBYSxHQUFHLElBQUksV0FBVyxDQUFtQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVySSxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDbkIsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUFJLFNBQVMsQ0FBQyxVQUFVLElBQUksVUFBVSxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDaEUsUUFBUSxHQUFHLElBQUksQ0FBQztnQkFDaEIsTUFBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMvRSxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNsRixVQUFVLEVBQUUsQ0FBQztZQUNkLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxHQUFHLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztRQUV4RSxPQUFPO1lBQ04sT0FBTyxFQUFFLGFBQWE7WUFDdEIsUUFBUTtTQUNSLENBQUM7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLHVCQUF1QixDQUFDLEtBQWlCLEVBQUUsS0FBd0IsRUFBRSxPQUFvQyxFQUFFLFFBQWdCO1FBQ3hJLE1BQU0sWUFBWSxHQUFHLElBQUksV0FBVyxDQUFxQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0SSxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFFckIsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3hCLFNBQVM7WUFDVixDQUFDO1lBQ0QsTUFBTSxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBVSxDQUFDLEdBQUcsQ0FBQztZQUVsQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxTQUFTO1lBQ1YsQ0FBQztZQUVELElBQUksT0FBTyxHQUFHLE1BQU0sTUFBTTtpQkFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFO2dCQUNuQyxLQUFLLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRO2dCQUNwQyxTQUFTLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxXQUFXO2dCQUMzQyxhQUFhLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUFlO2dCQUNuRCxrQkFBa0IsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSx5QkFBeUIsSUFBSSxJQUFJO2dCQUN4RixvQkFBb0IsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSwyQkFBMkIsSUFBSSxJQUFJO2dCQUM1RixnQkFBZ0IsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxxQkFBcUIsSUFBSSxJQUFJO2dCQUNsRixhQUFhLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsc0JBQXNCLElBQUksSUFBSTthQUNoRixFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBR2xDLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNwQixJQUFJLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUN4QyxRQUFRLEdBQUcsSUFBSSxDQUFDO29CQUNoQixPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxDQUFDO2dCQUNELE1BQU0sV0FBVyxHQUFrQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUN0RSxNQUFNLGNBQWMsR0FBRyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDM0YsTUFBTSxjQUFjLEdBQUcsaUNBQWlDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUMvRSxPQUFPO3dCQUNOLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTt3QkFDaEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO3dCQUNsQixjQUFjLEVBQUUsY0FBYzt3QkFDOUIsY0FBYyxFQUFFLGNBQWM7cUJBQzlCLENBQUM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsTUFBTSxTQUFTLEdBQWdDO29CQUM5QyxRQUFRLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxXQUFXO2lCQUN2QyxDQUFDO2dCQUNGLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU87WUFDTixPQUFPLEVBQUUsWUFBWTtZQUNyQixRQUFRO1NBQ1IsQ0FBQztJQUNILENBQUM7SUFHTyx1QkFBdUI7UUFDOUIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLDBCQUEwQixFQUFFLENBQUM7UUFDaEYsT0FBTyxlQUFlO2FBQ3BCLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7YUFDM0IsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUErQixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUN6RSxDQUFDO0NBQ0QsQ0FBQTtBQWhRWSxxQkFBcUI7SUFJL0IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHFCQUFxQixDQUFBO0dBWFgscUJBQXFCLENBZ1FqQyJ9