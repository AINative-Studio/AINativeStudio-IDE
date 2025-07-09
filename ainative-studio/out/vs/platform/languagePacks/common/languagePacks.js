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
import { Disposable } from '../../../base/common/lifecycle.js';
import { language } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { IExtensionGalleryService } from '../../extensionManagement/common/extensionManagement.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export function getLocale(extension) {
    return extension.tags.find(t => t.startsWith('lp-'))?.split('lp-')[1];
}
export const ILanguagePackService = createDecorator('languagePackService');
let LanguagePackBaseService = class LanguagePackBaseService extends Disposable {
    constructor(extensionGalleryService) {
        super();
        this.extensionGalleryService = extensionGalleryService;
    }
    async getAvailableLanguages() {
        const timeout = new CancellationTokenSource();
        setTimeout(() => timeout.cancel(), 1000);
        let result;
        try {
            result = await this.extensionGalleryService.query({
                text: 'category:"language packs"',
                pageSize: 20
            }, timeout.token);
        }
        catch (_) {
            // This method is best effort. So, we ignore any errors.
            return [];
        }
        const languagePackExtensions = result.firstPage.filter(e => e.properties.localizedLanguages?.length && e.tags.some(t => t.startsWith('lp-')));
        const allFromMarketplace = languagePackExtensions.map(lp => {
            const languageName = lp.properties.localizedLanguages?.[0];
            const locale = getLocale(lp);
            const baseQuickPick = this.createQuickPickItem(locale, languageName, lp);
            return {
                ...baseQuickPick,
                extensionId: lp.identifier.id,
                galleryExtension: lp
            };
        });
        allFromMarketplace.push(this.createQuickPickItem('en', 'English'));
        return allFromMarketplace;
    }
    createQuickPickItem(locale, languageName, languagePack) {
        const label = languageName ?? locale;
        let description;
        if (label !== locale) {
            description = `(${locale})`;
        }
        if (locale.toLowerCase() === language.toLowerCase()) {
            description ??= '';
            description += localize('currentDisplayLanguage', " (Current)");
        }
        if (languagePack?.installCount) {
            description ??= '';
            const count = languagePack.installCount;
            let countLabel;
            if (count > 1000000) {
                countLabel = `${Math.floor(count / 100000) / 10}M`;
            }
            else if (count > 1000) {
                countLabel = `${Math.floor(count / 1000)}K`;
            }
            else {
                countLabel = String(count);
            }
            description += ` $(cloud-download) ${countLabel}`;
        }
        return {
            id: locale,
            label,
            description
        };
    }
};
LanguagePackBaseService = __decorate([
    __param(0, IExtensionGalleryService)
], LanguagePackBaseService);
export { LanguagePackBaseService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sYW5ndWFnZVBhY2tzL2NvbW1vbi9sYW5ndWFnZVBhY2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSx3QkFBd0IsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsTUFBTSxVQUFVLFNBQVMsQ0FBQyxTQUE0QjtJQUNyRCxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RSxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDO0FBYzFGLElBQWUsdUJBQXVCLEdBQXRDLE1BQWUsdUJBQXdCLFNBQVEsVUFBVTtJQUcvRCxZQUF5RCx1QkFBaUQ7UUFDekcsS0FBSyxFQUFFLENBQUM7UUFEZ0QsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtJQUUxRyxDQUFDO0lBTUQsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQixNQUFNLE9B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