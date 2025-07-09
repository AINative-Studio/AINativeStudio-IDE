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
var NativeLocalizationWorkbenchContribution_1;
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import * as platform from '../../../../base/common/platform.js';
import { IExtensionManagementService, IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { INotificationService, NeverShowAgainScope } from '../../../../platform/notification/common/notification.js';
import Severity from '../../../../base/common/severity.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { minimumTranslatedStrings } from './minimalTranslations.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { BaseLocalizationWorkbenchContribution } from '../common/localization.contribution.js';
let NativeLocalizationWorkbenchContribution = class NativeLocalizationWorkbenchContribution extends BaseLocalizationWorkbenchContribution {
    static { NativeLocalizationWorkbenchContribution_1 = this; }
    static { this.LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY = 'extensionsAssistant/languagePackSuggestionIgnore'; }
    constructor(notificationService, localeService, productService, storageService, extensionManagementService, galleryService, extensionsWorkbenchService, telemetryService) {
        super();
        this.notificationService = notificationService;
        this.localeService = localeService;
        this.productService = productService;
        this.storageService = storageService;
        this.extensionManagementService = extensionManagementService;
        this.galleryService = galleryService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.telemetryService = telemetryService;
        this.checkAndInstall();
        this._register(this.extensionManagementService.onDidInstallExtensions(e => this.onDidInstallExtensions(e)));
        this._register(this.extensionManagementService.onDidUninstallExtension(e => this.onDidUninstallExtension(e)));
    }
    async onDidInstallExtensions(results) {
        for (const result of results) {
            if (result.operation === 2 /* InstallOperation.Install */ && result.local) {
                await this.onDidInstallExtension(result.local, !!result.context?.extensionsSync);
            }
        }
    }
    async onDidInstallExtension(localExtension, fromSettingsSync) {
        const localization = localExtension.manifest.contributes?.localizations?.[0];
        if (!localization || platform.language === localization.languageId) {
            return;
        }
        const { languageId, languageName } = localization;
        this.notificationService.prompt(Severity.Info, localize('updateLocale', "Would you like to change {0}'s display language to {1} and restart?", this.productService.nameLong, languageName || languageId), [{
                label: localize('changeAndRestart', "Change Language and Restart"),
                run: async () => {
                    await this.localeService.setLocale({
                        id: languageId,
                        label: languageName ?? languageId,
                        extensionId: localExtension.identifier.id,
                        // If settings sync installs the language pack, then we would have just shown the notification so no
                        // need to show the dialog.
                    }, true);
                }
            }], {
            sticky: true,
            neverShowAgain: { id: 'langugage.update.donotask', isSecondary: true, scope: NeverShowAgainScope.APPLICATION }
        });
    }
    async onDidUninstallExtension(_event) {
        if (!await this.isLocaleInstalled(platform.language)) {
            this.localeService.setLocale({
                id: 'en',
                label: 'English'
            });
        }
    }
    async checkAndInstall() {
        const language = platform.language;
        let locale = platform.locale ?? '';
        const languagePackSuggestionIgnoreList = JSON.parse(this.storageService.get(NativeLocalizationWorkbenchContribution_1.LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, '[]'));
        if (!this.galleryService.isEnabled()) {
            return;
        }
        if (!language || !locale || platform.Language.isDefaultVariant()) {
            return;
        }
        if (locale.startsWith(language) || languagePackSuggestionIgnoreList.includes(locale)) {
            return;
        }
        const installed = await this.isLocaleInstalled(locale);
        if (installed) {
            return;
        }
        const fullLocale = locale;
        let tagResult = await this.galleryService.query({ text: `tag:lp-${locale}` }, CancellationToken.None);
        if (tagResult.total === 0) {
            // Trim the locale and try again.
            locale = locale.split('-')[0];
            tagResult = await this.galleryService.query({ text: `tag:lp-${locale}` }, CancellationToken.None);
            if (tagResult.total === 0) {
                return;
            }
        }
        const extensionToInstall = tagResult.total === 1 ? tagResult.firstPage[0] : tagResult.firstPage.find(e => e.publisher === 'MS-CEINTL' && e.name.startsWith('vscode-language-pack'));
        const extensionToFetchTranslationsFrom = extensionToInstall ?? tagResult.firstPage[0];
        if (!extensionToFetchTranslationsFrom.assets.manifest) {
            return;
        }
        const [manifest, translation] = await Promise.all([
            this.galleryService.getManifest(extensionToFetchTranslationsFrom, CancellationToken.None),
            this.galleryService.getCoreTranslation(extensionToFetchTranslationsFrom, locale)
        ]);
        const loc = manifest?.contributes?.localizations?.find(x => locale.startsWith(x.languageId.toLowerCase()));
        const languageName = loc ? (loc.languageName || locale) : locale;
        const languageDisplayName = loc ? (loc.localizedLanguageName || loc.languageName || locale) : locale;
        const translationsFromPack = translation?.contents?.['vs/workbench/contrib/localization/electron-sandbox/minimalTranslations'] ?? {};
        const promptMessageKey = extensionToInstall ? 'installAndRestartMessage' : 'showLanguagePackExtensions';
        const useEnglish = !translationsFromPack[promptMessageKey];
        const translations = {};
        Object.keys(minimumTranslatedStrings).forEach(key => {
            if (!translationsFromPack[key] || useEnglish) {
                translations[key] = minimumTranslatedStrings[key].replace('{0}', () => languageName);
            }
            else {
                translations[key] = `${translationsFromPack[key].replace('{0}', () => languageDisplayName)} (${minimumTranslatedStrings[key].replace('{0}', () => languageName)})`;
            }
        });
        const logUserReaction = (userReaction) => {
            /* __GDPR__
                "languagePackSuggestion:popup" : {
                    "owner": "TylerLeonhardt",
                    "userReaction" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                    "language": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            this.telemetryService.publicLog('languagePackSuggestion:popup', { userReaction, language: locale });
        };
        const searchAction = {
            label: translations['searchMarketplace'],
            run: async () => {
                logUserReaction('search');
                await this.extensionsWorkbenchService.openSearch(`tag:lp-${locale}`);
            }
        };
        const installAndRestartAction = {
            label: translations['installAndRestart'],
            run: async () => {
                logUserReaction('installAndRestart');
                await this.localeService.setLocale({
                    id: locale,
                    label: languageName,
                    extensionId: extensionToInstall?.identifier.id,
                    galleryExtension: extensionToInstall
                    // The user will be prompted if they want to install the language pack before this.
                }, true);
            }
        };
        const promptMessage = translations[promptMessageKey];
        this.notificationService.prompt(Severity.Info, promptMessage, [extensionToInstall ? installAndRestartAction : searchAction,
            {
                label: localize('neverAgain', "Don't Show Again"),
                isSecondary: true,
                run: () => {
                    languagePackSuggestionIgnoreList.push(fullLocale);
                    this.storageService.store(NativeLocalizationWorkbenchContribution_1.LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY, JSON.stringify(languagePackSuggestionIgnoreList), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    logUserReaction('neverShowAgain');
                }
            }], {
            onCancel: () => {
                logUserReaction('cancelled');
            }
        });
    }
    async isLocaleInstalled(locale) {
        const installed = await this.extensionManagementService.getInstalled();
        return installed.some(i => !!i.manifest.contributes?.localizations?.length
            && i.manifest.contributes.localizations.some(l => locale.startsWith(l.languageId.toLowerCase())));
    }
};
NativeLocalizationWorkbenchContribution = NativeLocalizationWorkbenchContribution_1 = __decorate([
    __param(0, INotificationService),
    __param(1, ILocaleService),
    __param(2, IProductService),
    __param(3, IStorageService),
    __param(4, IExtensionManagementService),
    __param(5, IExtensionGalleryService),
    __param(6, IExtensionsWorkbenchService),
    __param(7, ITelemetryService)
], NativeLocalizationWorkbenchContribution);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(NativeLocalizationWorkbenchContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2NhbGl6YXRpb24vZWxlY3Ryb24tc2FuZGJveC9sb2NhbGl6YXRpb24uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQW1DLE1BQU0sa0NBQWtDLENBQUM7QUFFdEgsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsd0JBQXdCLEVBQXlGLE1BQU0sd0VBQXdFLENBQUM7QUFDdE8sT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDckgsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVE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