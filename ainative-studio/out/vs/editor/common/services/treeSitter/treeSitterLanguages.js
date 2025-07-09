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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckxhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3RyZWVTaXR0ZXIvdHJlZVNpdHRlckxhbmd1YWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQW1CLFVBQVUsRUFBRSwyQkFBMkIsRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUvSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFdEUsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsK0JBQStCLENBQUM7QUFFdkUsTUFBTSxVQUFVLGlCQUFpQixDQUFDLGtCQUF1QztJQUN4RSxPQUFPLEdBQUcsQ0FBQyxPQUFPLElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxlQUFlLElBQUksdUJBQXVCLEVBQUUsQ0FBQztBQUNoSSxDQUFDO0FBRUQsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFVBQVU7SUFRbEQsWUFBNkIsbUJBQXdDLEVBQ25ELFlBQTBCLEVBQzFCLG1CQUF3QyxFQUN4QyxvQkFBeUM7UUFFMUQsS0FBSyxFQUFFLENBQUM7UUFMb0Isd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUMxQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLHlCQUFvQixHQUFw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