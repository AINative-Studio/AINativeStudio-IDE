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
import { toDisposable } from '../../../base/common/lifecycle.js';
import { MainContext } from './extHost.protocol.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { FileSearchManager } from '../../services/search/common/fileSearchManager.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IURITransformerService } from './extHostUriTransformerService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { URI } from '../../../base/common/uri.js';
import { TextSearchManager } from '../../services/search/common/textSearchManager.js';
import { revive } from '../../../base/common/marshalling.js';
import { OldFileSearchProviderConverter, OldTextSearchProviderConverter } from '../../services/search/common/searchExtConversionTypes.js';
export const IExtHostSearch = createDecorator('IExtHostSearch');
let ExtHostSearch = class ExtHostSearch {
    constructor(extHostRpc, _uriTransformer, _logService) {
        this.extHostRpc = extHostRpc;
        this._uriTransformer = _uriTransformer;
        this._logService = _logService;
        this._proxy = this.extHostRpc.getProxy(MainContext.MainThreadSearch);
        this._handlePool = 0;
        this._textSearchProvider = new Map();
        this._textSearchUsedSchemes = new Set();
        this._aiTextSearchProvider = new Map();
        this._aiTextSearchUsedSchemes = new Set();
        this._fileSearchProvider = new Map();
        this._fileSearchUsedSchemes = new Set();
        this._fileSearchManager = new FileSearchManager();
    }
    _transformScheme(scheme) {
        return this._uriTransformer.transformOutgoingScheme(scheme);
    }
    registerTextSearchProviderOld(scheme, provider) {
        if (this._textSearchUsedSchemes.has(scheme)) {
            throw new Error(`a text search provider for the scheme '${scheme}' is already registered`);
        }
        this._textSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._textSearchProvider.set(handle, new OldTextSearchProviderConverter(provider));
        this._proxy.$registerTextSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._textSearchUsedSchemes.delete(scheme);
            this._textSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    registerTextSearchProvider(scheme, provider) {
        if (this._textSearchUsedSchemes.has(scheme)) {
            throw new Error(`a text search provider for the scheme '${scheme}' is already registered`);
        }
        this._textSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._textSearchProvider.set(handle, provider);
        this._proxy.$registerTextSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._textSearchUsedSchemes.delete(scheme);
            this._textSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    registerAITextSearchProvider(scheme, provider) {
        if (this._aiTextSearchUsedSchemes.has(scheme)) {
            throw new Error(`an AI text search provider for the scheme '${scheme}'is already registered`);
        }
        this._aiTextSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._aiTextSearchProvider.set(handle, provider);
        this._proxy.$registerAITextSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._aiTextSearchUsedSchemes.delete(scheme);
            this._aiTextSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    registerFileSearchProviderOld(scheme, provider) {
        if (this._fileSearchUsedSchemes.has(scheme)) {
            throw new Error(`a file search provider for the scheme '${scheme}' is already registered`);
        }
        this._fileSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._fileSearchProvider.set(handle, new OldFileSearchProviderConverter(provider));
        this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._fileSearchUsedSchemes.delete(scheme);
            this._fileSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    registerFileSearchProvider(scheme, provider) {
        if (this._fileSearchUsedSchemes.has(scheme)) {
            throw new Error(`a file search provider for the scheme '${scheme}' is already registered`);
        }
        this._fileSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._fileSearchProvider.set(handle, provider);
        this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._fileSearchUsedSchemes.delete(scheme);
            this._fileSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    $provideFileSearchResults(handle, session, rawQuery, token) {
        const query = reviveQuery(rawQuery);
        const provider = this._fileSearchProvider.get(handle);
        if (provider) {
            return this._fileSearchManager.fileSearch(query, provider, batch => {
                this._proxy.$handleFileMatch(handle, session, batch.map(p => p.resource));
            }, token);
        }
        else {
            throw new Error('unknown provider: ' + handle);
        }
    }
    async doInternalFileSearchWithCustomCallback(query, token, handleFileMatch) {
        return { messages: [] };
    }
    $clearCache(cacheKey) {
        this._fileSearchManager.clearCache(cacheKey);
        return Promise.resolve(undefined);
    }
    $provideTextSearchResults(handle, session, rawQuery, token) {
        const provider = this._textSearchProvider.get(handle);
        if (!provider || !provider.provideTextSearchResults) {
            throw new Error(`Unknown Text Search Provider ${handle}`);
        }
        const query = reviveQuery(rawQuery);
        const engine = this.createTextSearchManager(query, provider);
        return engine.search(progress => this._proxy.$handleTextMatch(handle, session, progress), token);
    }
    $provideAITextSearchResults(handle, session, rawQuery, token) {
        const provider = this._aiTextSearchProvider.get(handle);
        if (!provider || !provider.provideAITextSearchResults) {
            throw new Error(`Unknown AI Text Search Provider ${handle}`);
        }
        const query = reviveQuery(rawQuery);
        const engine = this.createAITextSearchManager(query, provider);
        return engine.search(progress => this._proxy.$handleTextMatch(handle, session, progress), token);
    }
    $enableExtensionHostSearch() { }
    async $getAIName(handle) {
        const provider = this._aiTextSearchProvider.get(handle);
        if (!provider || !provider.provideAITextSearchResults) {
            return undefined;
        }
        // if the provider is defined, but has no name, use default name
        return provider.name ?? 'AI';
    }
    createTextSearchManager(query, provider) {
        return new TextSearchManager({ query, provider }, {
            readdir: resource => Promise.resolve([]),
            toCanonicalName: encoding => encoding
        }, 'textSearchProvider');
    }
    createAITextSearchManager(query, provider) {
        return new TextSearchManager({ query, provider }, {
            readdir: resource => Promise.resolve([]),
            toCanonicalName: encoding => encoding
        }, 'aiTextSearchProvider');
    }
};
ExtHostSearch = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IURITransformerService),
    __param(2, ILogService)
], ExtHostSearch);
export { ExtHostSearch };
export function reviveQuery(rawQuery) {
    return {
        ...rawQuery, // TODO@rob ???
        ...{
            folderQueries: rawQuery.folderQueries && rawQuery.folderQueries.map(reviveFolderQuery),
            extraFileResources: rawQuery.extraFileResources && rawQuery.extraFileResources.map(components => URI.revive(components))
        }
    };
}
function reviveFolderQuery(rawFolderQuery) {
    return revive(rawFolderQuery);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0U2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RSxPQUFPLEVBQTZDLFdBQVcsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFbEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUV0RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0QsT0FBTyxFQUFFLDhCQUE4QixFQUFFLDhCQUE4QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFXMUksTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsZ0JBQWdCLENBQUMsQ0FBQztBQUV6RSxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFhO0lBZ0J6QixZQUNxQixVQUFzQyxFQUNsQyxlQUFpRCxFQUM1RCxXQUFrQztRQUZuQixlQUFVLEdBQVYsVUFBVSxDQUFvQjtRQUN4QixvQkFBZSxHQUFmLGVBQWUs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