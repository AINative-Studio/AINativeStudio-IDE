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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxpemF0aW9uL2VsZWN0cm9uLXNhbmRib3gvbG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBRXRILE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLHdCQUF3QixFQUF5RixNQUFNLHdFQUF3RSxDQUFDO0FBQ3RPLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3JILE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFB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