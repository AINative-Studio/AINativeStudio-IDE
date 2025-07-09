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
import { localize } from '../../../../nls.js';
import { Language, LANGUAGE_DEFAULT } from '../../../../base/common/platform.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IActiveLanguagePackService, ILocaleService } from '../common/locale.js';
import { IHostService } from '../../host/browser/host.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ILogService } from '../../../../platform/log/common/log.js';
const localeStorage = new class LocaleStorage {
    static { this.LOCAL_STORAGE_LOCALE_KEY = 'vscode.nls.locale'; }
    static { this.LOCAL_STORAGE_EXTENSION_ID_KEY = 'vscode.nls.languagePackExtensionId'; }
    setLocale(locale) {
        localStorage.setItem(LocaleStorage.LOCAL_STORAGE_LOCALE_KEY, locale);
        this.doSetLocaleToCookie(locale);
    }
    doSetLocaleToCookie(locale) {
        document.cookie = `${LocaleStorage.LOCAL_STORAGE_LOCALE_KEY}=${locale};path=/;max-age=3153600000`;
    }
    clearLocale() {
        localStorage.removeItem(LocaleStorage.LOCAL_STORAGE_LOCALE_KEY);
        this.doClearLocaleToCookie();
    }
    doClearLocaleToCookie() {
        document.cookie = `${LocaleStorage.LOCAL_STORAGE_LOCALE_KEY}=;path=/;max-age=0`;
    }
    setExtensionId(extensionId) {
        localStorage.setItem(LocaleStorage.LOCAL_STORAGE_EXTENSION_ID_KEY, extensionId);
    }
    getExtensionId() {
        return localStorage.getItem(LocaleStorage.LOCAL_STORAGE_EXTENSION_ID_KEY);
    }
    clearExtensionId() {
        localStorage.removeItem(LocaleStorage.LOCAL_STORAGE_EXTENSION_ID_KEY);
    }
};
let WebLocaleService = class WebLocaleService {
    constructor(dialogService, hostService, productService) {
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.productService = productService;
    }
    async setLocale(languagePackItem, _skipDialog = false) {
        const locale = languagePackItem.id;
        if (locale === Language.value() || (!locale && Language.value() === navigator.language.toLowerCase())) {
            return;
        }
        if (locale) {
            localeStorage.setLocale(locale);
            if (languagePackItem.extensionId) {
                localeStorage.setExtensionId(languagePackItem.extensionId);
            }
        }
        else {
            localeStorage.clearLocale();
            localeStorage.clearExtensionId();
        }
        const restartDialog = await this.dialogService.confirm({
            type: 'info',
            message: localize('relaunchDisplayLanguageMessage', "To change the display language, {0} needs to reload", this.productService.nameLong),
            detail: localize('relaunchDisplayLanguageDetail', "Press the reload button to refresh the page and set the display language to {0}.", languagePackItem.label),
            primaryButton: localize({ key: 'reload', comment: ['&& denotes a mnemonic character'] }, "&&Reload"),
        });
        if (restartDialog.confirmed) {
            this.hostService.restart();
        }
    }
    async clearLocalePreference() {
        localeStorage.clearLocale();
        localeStorage.clearExtensionId();
        if (Language.value() === navigator.language.toLowerCase()) {
            return;
        }
        const restartDialog = await this.dialogService.confirm({
            type: 'info',
            message: localize('clearDisplayLanguageMessage', "To change the display language, {0} needs to reload", this.productService.nameLong),
            detail: localize('clearDisplayLanguageDetail', "Press the reload button to refresh the page and use your browser's language."),
            primaryButton: localize({ key: 'reload', comment: ['&& denotes a mnemonic character'] }, "&&Reload"),
        });
        if (restartDialog.confirmed) {
            this.hostService.restart();
        }
    }
};
WebLocaleService = __decorate([
    __param(0, IDialogService),
    __param(1, IHostService),
    __param(2, IProductService)
], WebLocaleService);
export { WebLocaleService };
let WebActiveLanguagePackService = class WebActiveLanguagePackService {
    constructor(galleryService, logService) {
        this.galleryService = galleryService;
        this.logService = logService;
    }
    async getExtensionIdProvidingCurrentLocale() {
        const language = Language.value();
        if (language === LANGUAGE_DEFAULT) {
            return undefined;
        }
        const extensionId = localeStorage.getExtensionId();
        if (extensionId) {
            return extensionId;
        }
        if (!this.galleryService.isEnabled()) {
            return undefined;
        }
        try {
            const tagResult = await this.galleryService.query({ text: `tag:lp-${language}` }, CancellationToken.None);
            // Only install extensions that are published by Microsoft and start with vscode-language-pack for extra certainty
            const extensionToInstall = tagResult.firstPage.find(e => e.publisher === 'MS-CEINTL' && e.name.startsWith('vscode-language-pack'));
            if (extensionToInstall) {
                localeStorage.setExtensionId(extensionToInstall.identifier.id);
                return extensionToInstall.identifier.id;
            }
            // TODO: If a non-Microsoft language pack is installed, we should prompt the user asking if they want to install that.
            // Since no such language packs exist yet, we can wait until that happens to implement this.
        }
        catch (e) {
            // Best effort
            this.logService.error(e);
        }
        return undefined;
    }
};
WebActiveLanguagePackService = __decorate([
    __param(0, IExtensionGalleryService),
    __param(1, ILogService)
], WebActiveLanguagePackService);
registerSingleton(ILocaleService, WebLocaleService, 1 /* InstantiationType.Delayed */);
registerSingleton(IActiveLanguagePackService, WebActiveLanguagePackService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbG9jYWxpemF0aW9uL2Jyb3dzZXIvbG9jYWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVoRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDakYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDbEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXJFLE1BQU0sYUFBYSxHQUFHLElBQUksTUFBTSxhQUFhO2FBRXBCLDZCQUF3QixHQUFHLG1CQUFtQixDQUFDO2FBQy9DLG1DQUE4QixHQUFHLG9DQUFvQyxDQUFDO0lBRTlGLFNBQVMsQ0FBQyxNQUFjO1FBQ3ZCLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxtQkFB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