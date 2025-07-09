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
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { URI } from '../../../base/common/uri.js';
import { IExtensionGalleryService } from '../../extensionManagement/common/extensionManagement.js';
import { IExtensionResourceLoaderService } from '../../extensionResourceLoader/common/extensionResourceLoader.js';
import { LanguagePackBaseService } from '../common/languagePacks.js';
import { ILogService } from '../../log/common/log.js';
let WebLanguagePacksService = class WebLanguagePacksService extends LanguagePackBaseService {
    constructor(extensionResourceLoaderService, extensionGalleryService, logService) {
        super(extensionGalleryService);
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.logService = logService;
    }
    async getBuiltInExtensionTranslationsUri(id, language) {
        const queryTimeout = new CancellationTokenSource();
        setTimeout(() => queryTimeout.cancel(), 1000);
        // First get the extensions that supports the language (there should only be one but just in case let's include more results)
        let result;
        try {
            result = await this.extensionGalleryService.query({
                text: `tag:"lp-${language}"`,
                pageSize: 5
            }, queryTimeout.token);
        }
        catch (err) {
            this.logService.error(err);
            return undefined;
        }
        const languagePackExtensions = result.firstPage.find(e => e.properties.localizedLanguages?.length);
        if (!languagePackExtensions) {
            this.logService.trace(`No language pack found for language ${language}`);
            return undefined;
        }
        // Then get the manifest for that extension
        const manifestTimeout = new CancellationTokenSource();
        setTimeout(() => queryTimeout.cancel(), 1000);
        const manifest = await this.extensionGalleryService.getManifest(languagePackExtensions, manifestTimeout.token);
        // Find the translation from the language pack
        const localization = manifest?.contributes?.localizations?.find(l => l.languageId === language);
        const translation = localization?.translations.find(t => t.id === id);
        if (!translation) {
            this.logService.trace(`No translation found for id '${id}, in ${manifest?.name}`);
            return undefined;
        }
        // get the resource uri and return it
        const uri = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({
            // If translation is defined then manifest should have been defined.
            name: manifest.name,
            publisher: manifest.publisher,
            version: manifest.version
        });
        if (!uri) {
            this.logService.trace('Gallery does not provide extension resources.');
            return undefined;
        }
        return URI.joinPath(uri, translation.path);
    }
    // Web doesn't have a concept of language packs, so we just return an empty array
    getInstalledLanguages() {
        return Promise.resolve([]);
    }
};
WebLanguagePacksService = __decorate([
    __param(0, IExtensionResourceLoaderService),
    __param(1, IExtensionGalleryService),
    __param(2, ILogService)
], WebLanguagePacksService);
export { WebLanguagePacksService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sYW5ndWFnZVBhY2tzL2Jyb3dzZXIvbGFuZ3VhZ2VQYWNrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDbkcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDbEgsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUUvQyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLHVCQUF1QjtJQUNuRSxZQUNtRCw4QkFBK0QsRUFDdkYsdUJBQWlELEVBQzdDLFVBQXVCO1FBRXJELEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBSm1CLG1DQUE4QixHQUE5Qiw4QkFBOEIsQ0FBaUM7UUFFbkYsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUd0RCxDQUFDO0lBRUQsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLEVBQVUsRUFBRSxRQUFnQjtRQUVwRSxNQUFNLFlBQVksR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDbkQsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU5Qyw2SEFBNkg7UUFDN0gsSUFBSSxNQUFNLENBQUM7UUFDWCxJQUFJLENBQUM7WUFD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