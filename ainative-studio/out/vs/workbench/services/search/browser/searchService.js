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
import { IModelService } from '../../../../editor/common/services/model.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ISearchService, TextSearchCompleteMessageType } from '../common/search.js';
import { SearchService } from '../common/searchService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { logOnceWebWorkerWarning } from '../../../../base/common/worker/webWorker.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { createWebWorker } from '../../../../base/browser/webWorkerFactory.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { LocalFileSearchWorkerHost } from '../common/localFileSearchWorkerTypes.js';
import { memoize } from '../../../../base/common/decorators.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { WebFileSystemAccess } from '../../../../platform/files/browser/webFileSystemAccess.js';
import { revive } from '../../../../base/common/marshalling.js';
let RemoteSearchService = class RemoteSearchService extends SearchService {
    constructor(modelService, editorService, telemetryService, logService, extensionService, fileService, instantiationService, uriIdentityService) {
        super(modelService, editorService, telemetryService, logService, extensionService, fileService, uriIdentityService);
        this.instantiationService = instantiationService;
        const searchProvider = this.instantiationService.createInstance(LocalFileSearchWorkerClient);
        this.registerSearchResultProvider(Schemas.file, 0 /* SearchProviderType.file */, searchProvider);
        this.registerSearchResultProvider(Schemas.file, 1 /* SearchProviderType.text */, searchProvider);
    }
};
RemoteSearchService = __decorate([
    __param(0, IModelService),
    __param(1, IEditorService),
    __param(2, ITelemetryService),
    __param(3, ILogService),
    __param(4, IExtensionService),
    __param(5, IFileService),
    __param(6, IInstantiationService),
    __param(7, IUriIdentityService)
], RemoteSearchService);
export { RemoteSearchService };
let LocalFileSearchWorkerClient = class LocalFileSearchWorkerClient extends Disposable {
    constructor(fileService, uriIdentityService) {
        super();
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this._onDidReceiveTextSearchMatch = new Emitter();
        this.onDidReceiveTextSearchMatch = this._onDidReceiveTextSearchMatch.event;
        this.queryId = 0;
        this._worker = null;
    }
    async getAIName() {
        return undefined;
    }
    sendTextSearchMatch(match, queryId) {
        this._onDidReceiveTextSearchMatch.fire({ match, queryId });
    }
    get fileSystemProvider() {
        return this.fileService.getProvider(Schemas.file);
    }
    async cancelQuery(queryId) {
        const proxy = this._getOrCreateWorker().proxy;
        proxy.$cancelQuery(queryId);
    }
    async textSearch(query, onProgress, token) {
        try {
            const queryDisposables = new DisposableStore();
            const proxy = this._getOrCreateWorker().proxy;
            const results = [];
            let limitHit = false;
            await Promise.all(query.folderQueries.map(async (fq) => {
                const queryId = this.queryId++;
                queryDisposables.add(token?.onCancellationRequested(e => this.cancelQuery(queryId)) || Disposable.None);
                const handle = await this.fileSystemProvider.getHandle(fq.folder);
                if (!handle || !WebFileSystemAccess.isFileSystemDirectoryHandle(handle)) {
                    console.error('Could not get directory handle for ', fq);
                    return;
                }
                // force resource to revive using URI.revive.
                // TODO @andrea see why we can't just use `revive()` below. For some reason, (<MarshalledObject>obj).$mid was undefined for result.resource
                const reviveMatch = (result) => ({
                    resource: URI.revive(result.resource),
                    results: revive(result.results)
                });
                queryDisposables.add(this.onDidReceiveTextSearchMatch(e => {
                    if (e.queryId === queryId) {
                        onProgress?.(reviveMatch(e.match));
                    }
                }));
                const ignorePathCasing = this.uriIdentityService.extUri.ignorePathCasing(fq.folder);
                const folderResults = await proxy.$searchDirectory(handle, query, fq, ignorePathCasing, queryId);
                for (const folderResult of folderResults.results) {
                    results.push(revive(folderResult));
                }
                if (folderResults.limitHit) {
                    limitHit = true;
                }
            }));
            queryDisposables.dispose();
            const result = { messages: [], results, limitHit };
            return result;
        }
        catch (e) {
            console.error('Error performing web worker text search', e);
            return {
                results: [],
                messages: [{
                        text: localize('errorSearchText', "Unable to search with Web Worker text searcher"), type: TextSearchCompleteMessageType.Warning
                    }],
            };
        }
    }
    async fileSearch(query, token) {
        try {
            const queryDisposables = new DisposableStore();
            let limitHit = false;
            const proxy = this._getOrCreateWorker().proxy;
            const results = [];
            await Promise.all(query.folderQueries.map(async (fq) => {
                const queryId = this.queryId++;
                queryDisposables.add(token?.onCancellationRequested(e => this.cancelQuery(queryId)) || Disposable.None);
                const handle = await this.fileSystemProvider.getHandle(fq.folder);
                if (!handle || !WebFileSystemAccess.isFileSystemDirectoryHandle(handle)) {
                    console.error('Could not get directory handle for ', fq);
                    return;
                }
                const caseSensitive = this.uriIdentityService.extUri.ignorePathCasing(fq.folder);
                const folderResults = await proxy.$listDirectory(handle, query, fq, caseSensitive, queryId);
                for (const folderResult of folderResults.results) {
                    results.push({ resource: URI.joinPath(fq.folder, folderResult) });
                }
                if (folderResults.limitHit) {
                    limitHit = true;
                }
            }));
            queryDisposables.dispose();
            const result = { messages: [], results, limitHit };
            return result;
        }
        catch (e) {
            console.error('Error performing web worker file search', e);
            return {
                results: [],
                messages: [{
                        text: localize('errorSearchFile', "Unable to search with Web Worker file searcher"), type: TextSearchCompleteMessageType.Warning
                    }],
            };
        }
    }
    async clearCache(cacheKey) {
        if (this.cache?.key === cacheKey) {
            this.cache = undefined;
        }
    }
    _getOrCreateWorker() {
        if (!this._worker) {
            try {
                this._worker = this._register(createWebWorker(FileAccess.asBrowserUri('vs/workbench/services/search/worker/localFileSearchMain.js'), 'LocalFileSearchWorker'));
                LocalFileSearchWorkerHost.setChannel(this._worker, {
                    $sendTextSearchMatch: (match, queryId) => {
                        return this.sendTextSearchMatch(match, queryId);
                    }
                });
            }
            catch (err) {
                logOnceWebWorkerWarning(err);
                throw err;
            }
        }
        return this._worker;
    }
};
__decorate([
    memoize
], LocalFileSearchWorkerClient.prototype, "fileSystemProvider", null);
LocalFileSearchWorkerClient = __decorate([
    __param(0, IFileService),
    __param(1, IUriIdentityService)
], LocalFileSearchWorkerClient);
export { LocalFileSearchWorkerClient };
registerSingleton(ISearchService, RemoteSearchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUF1RixjQUFjLEVBQWtDLDZCQUE2QixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDek0sT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBb0IsdUJBQXVCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUEwQix5QkFBeUIsRUFB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