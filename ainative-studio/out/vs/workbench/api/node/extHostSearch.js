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
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import * as pfs from '../../../base/node/pfs.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostConfiguration } from '../common/extHostConfiguration.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { ExtHostSearch, reviveQuery } from '../common/extHostSearch.js';
import { IURITransformerService } from '../common/extHostUriTransformerService.js';
import { isSerializedFileMatch } from '../../services/search/common/search.js';
import { SearchService } from '../../services/search/node/rawSearchService.js';
import { RipgrepSearchProvider } from '../../services/search/node/ripgrepSearchProvider.js';
import { OutputChannel } from '../../services/search/node/ripgrepSearchUtils.js';
import { NativeTextSearchManager } from '../../services/search/node/textSearchManager.js';
let NativeExtHostSearch = class NativeExtHostSearch extends ExtHostSearch {
    constructor(extHostRpc, initData, _uriTransformer, configurationService, _logService) {
        super(extHostRpc, _uriTransformer, _logService);
        this.configurationService = configurationService;
        this._pfs = pfs; // allow extending for tests
        this._internalFileSearchHandle = -1;
        this._internalFileSearchProvider = null;
        this._registeredEHSearchProvider = false;
        this._disposables = new DisposableStore();
        this.isDisposed = false;
        this.getNumThreads = this.getNumThreads.bind(this);
        this.getNumThreadsCached = this.getNumThreadsCached.bind(this);
        this.handleConfigurationChanged = this.handleConfigurationChanged.bind(this);
        const outputChannel = new OutputChannel('RipgrepSearchUD', this._logService);
        this._disposables.add(this.registerTextSearchProvider(Schemas.vscodeUserData, new RipgrepSearchProvider(outputChannel, this.getNumThreadsCached)));
        if (initData.remote.isRemote && initData.remote.authority) {
            this._registerEHSearchProviders();
        }
        configurationService.getConfigProvider().then(provider => {
            if (this.isDisposed) {
                return;
            }
            this._disposables.add(provider.onDidChangeConfiguration(this.handleConfigurationChanged));
        });
    }
    handleConfigurationChanged(event) {
        if (!event.affectsConfiguration('search')) {
            return;
        }
        this._numThreadsPromise = undefined;
    }
    async getNumThreads() {
        const configProvider = await this.configurationService.getConfigProvider();
        const numThreads = configProvider.getConfiguration('search').get('ripgrep.maxThreads');
        return numThreads;
    }
    async getNumThreadsCached() {
        if (!this._numThreadsPromise) {
            this._numThreadsPromise = this.getNumThreads();
        }
        return this._numThreadsPromise;
    }
    dispose() {
        this.isDisposed = true;
        this._disposables.dispose();
    }
    $enableExtensionHostSearch() {
        this._registerEHSearchProviders();
    }
    _registerEHSearchProviders() {
        if (this._registeredEHSearchProvider) {
            return;
        }
        this._registeredEHSearchProvider = true;
        const outputChannel = new OutputChannel('RipgrepSearchEH', this._logService);
        this._disposables.add(this.registerTextSearchProvider(Schemas.file, new RipgrepSearchProvider(outputChannel, this.getNumThreadsCached)));
        this._disposables.add(this.registerInternalFileSearchProvider(Schemas.file, new SearchService('fileSearchProvider', this.getNumThreadsCached)));
    }
    registerInternalFileSearchProvider(scheme, provider) {
        const handle = this._handlePool++;
        this._internalFileSearchProvider = provider;
        this._internalFileSearchHandle = handle;
        this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._internalFileSearchProvider = null;
            this._proxy.$unregisterProvider(handle);
        });
    }
    $provideFileSearchResults(handle, session, rawQuery, token) {
        const query = reviveQuery(rawQuery);
        if (handle === this._internalFileSearchHandle) {
            const start = Date.now();
            return this.doInternalFileSearch(handle, session, query, token).then(result => {
                const elapsed = Date.now() - start;
                this._logService.debug(`Ext host file search time: ${elapsed}ms`);
                return result;
            });
        }
        return super.$provideFileSearchResults(handle, session, rawQuery, token);
    }
    async doInternalFileSearchWithCustomCallback(rawQuery, token, handleFileMatch) {
        const onResult = (ev) => {
            if (isSerializedFileMatch(ev)) {
                ev = [ev];
            }
            if (Array.isArray(ev)) {
                handleFileMatch(ev.map(m => URI.file(m.path)));
                return;
            }
            if (ev.message) {
                this._logService.debug('ExtHostSearch', ev.message);
            }
        };
        if (!this._internalFileSearchProvider) {
            throw new Error('No internal file search handler');
        }
        const numThreads = await this.getNumThreadsCached();
        return this._internalFileSearchProvider.doFileSearch(rawQuery, numThreads, onResult, token);
    }
    async doInternalFileSearch(handle, session, rawQuery, token) {
        return this.doInternalFileSearchWithCustomCallback(rawQuery, token, (data) => {
            this._proxy.$handleFileMatch(handle, session, data);
        });
    }
    $clearCache(cacheKey) {
        this._internalFileSearchProvider?.clearCache(cacheKey);
        return super.$clearCache(cacheKey);
    }
    createTextSearchManager(query, provider) {
        return new NativeTextSearchManager(query, provider, undefined, 'textSearchProvider');
    }
};
NativeExtHostSearch = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IURITransformerService),
    __param(3, IExtHostConfiguration),
    __param(4, ILogService)
], NativeExtHostSearch);
export { NativeExtHostSearch };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdFNlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxLQUFLLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNuRixPQUFPLEVBQWtGLHFCQUFxQixFQUFjLE1BQU0sd0NBQXdDLENBQUM7QUFFM0ssT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUduRixJ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