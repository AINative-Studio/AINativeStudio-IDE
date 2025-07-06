/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileAccess, nodeModulesAsarUnpackedPath, nodeModulesPath } from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { canASAR } from '../../../../amdX.js';
import { Emitter } from '../../../../base/common/event.js';
import { PromiseResult } from '../../../../base/common/observable.js';
export const MODULE_LOCATION_SUBPATH = `@vscode/tree-sitter-wasm/wasm`;
export function getModuleLocation(environmentService) {
    return `${(canASAR && environmentService.isBuilt) ? nodeModulesAsarUnpackedPath : nodeModulesPath}/${MODULE_LOCATION_SUBPATH}`;
}
export class TreeSitterLanguages extends Disposable {
    constructor(_treeSitterImporter, _fileService, _environmentService, _registeredLanguages) {
        super();
        this._treeSitterImporter = _treeSitterImporter;
        this._fileService = _fileService;
        this._environmentService = _environmentService;
        this._registeredLanguages = _registeredLanguages;
        this._languages = new AsyncCache();
        this._onDidAddLanguage = this._register(new Emitter());
        /**
         * If you're looking for a specific language, make sure to check if it already exists with `getLanguage` as it will kick off the process to add it if it doesn't exist.
         */
        this.onDidAddLanguage = this._onDidAddLanguage.event;
    }
    getOrInitLanguage(languageId) {
        if (this._languages.isCached(languageId)) {
            return this._languages.getSyncIfCached(languageId);
        }
        else {
            // kick off adding the language, but don't wait
            this._addLanguage(languageId);
            return undefined;
        }
    }
    async getLanguage(languageId) {
        if (this._languages.isCached(languageId)) {
            return this._languages.getSyncIfCached(languageId);
        }
        else {
            await this._addLanguage(languageId);
            return this._languages.get(languageId);
        }
    }
    async _addLanguage(languageId) {
        const languagePromise = this._languages.get(languageId);
        if (!languagePromise) {
            this._languages.set(languageId, this._fetchLanguage(languageId));
            const language = await this._languages.get(languageId);
            if (!language) {
                return undefined;
            }
            this._onDidAddLanguage.fire({ id: languageId, language });
        }
    }
    async _fetchLanguage(languageId) {
        const grammarName = this._registeredLanguages.get(languageId);
        const languageLocation = this._getLanguageLocation(languageId);
        if (!grammarName || !languageLocation) {
            return undefined;
        }
        const wasmPath = `${languageLocation}/${grammarName}.wasm`;
        const languageFile = await (this._fileService.readFile(FileAccess.asFileUri(wasmPath)));
        const Language = await this._treeSitterImporter.getLanguageClass();
        return Language.load(languageFile.value.buffer);
    }
    _getLanguageLocation(languageId) {
        const grammarName = this._registeredLanguages.get(languageId);
        if (!grammarName) {
            return undefined;
        }
        return getModuleLocation(this._environmentService);
    }
}
class AsyncCache {
    constructor() {
        this._values = new Map();
    }
    set(key, promise) {
        this._values.set(key, new PromiseWithSyncAccess(promise));
    }
    get(key) {
        return this._values.get(key)?.promise;
    }
    getSyncIfCached(key) {
        return this._values.get(key)?.result?.data;
    }
    isCached(key) {
        return this._values.get(key)?.result !== undefined;
    }
}
class PromiseWithSyncAccess {
    /**
     * Returns undefined if the promise did not resolve yet.
     */
    get result() {
        return this._result;
    }
    constructor(promise) {
        this.promise = promise;
        promise.then(result => {
            this._result = new PromiseResult(result, undefined);
        }).catch(e => {
            this._result = new PromiseResult(undefined, e);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckxhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdHJlZVNpdHRlci90cmVlU2l0dGVyTGFuZ3VhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBbUIsVUFBVSxFQUFFLDJCQUEyQixFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRS9ILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV0RSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRywrQkFBK0IsQ0FBQztBQUV2RSxNQUFNLFVBQVUsaUJBQWlCLENBQUMsa0JBQXVDO0lBQ3hFLE9BQU8sR0FBRyxDQUFDLE9BQU8sSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLGVBQWUsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO0FBQ2hJLENBQUM7QUFFRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsVUFBVTtJQVFsRCxZQUE2QixtQkFBd0MsRUFDbkQsWUFBMEIsRUFDMUIsbUJBQXdDLEVBQ3hDLG9CQUF5QztRQUUxRCxLQUFLLEVBQUUsQ0FBQztRQUxvQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQzFCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDeEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFxQjtRQVZuRCxlQUFVLEdBQW9ELElBQUksVUFBVSxFQUFFLENBQUM7UUFDakQsc0JBQWlCLEdBQXVELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzVJOztXQUVHO1FBQ2EscUJBQWdCLEdBQXFELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7SUFRbEgsQ0FBQztJQUVNLGlCQUFpQixDQUFDLFVBQWtCO1FBQzFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3BELENBQUM7YUFBTSxDQUFDO1lBQ1AsK0NBQStDO1lBQy9DLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDOUIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQWtCO1FBQzFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3BELENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEMsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLFVBQWtCO1FBQzVDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFrQjtRQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLFFBQVEsR0FBb0IsR0FBRyxnQkFBZ0IsSUFBSSxXQUFXLE9BQU8sQ0FBQztRQUM1RSxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRU8sb0JBQW9CLENBQUMsVUFBa0I7UUFDOUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVO0lBQWhCO1FBQ2tCLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztJQWlCdEUsQ0FBQztJQWZBLEdBQUcsQ0FBQyxHQUFTLEVBQUUsT0FBbUI7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUkscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUN2QyxDQUFDO0lBRUQsZUFBZSxDQUFDLEdBQVM7UUFDeEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDO0lBQzVDLENBQUM7SUFFRCxRQUFRLENBQUMsR0FBUztRQUNqQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sS0FBSyxTQUFTLENBQUM7SUFDcEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxxQkFBcUI7SUFFMUI7O09BRUc7SUFDSCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztJQUVELFlBQTRCLE9BQW1CO1FBQW5CLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDWixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksYUFBYSxDQUFJLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9