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
import * as fs from 'fs';
import { createHash } from 'crypto';
import { equals } from '../../../base/common/arrays.js';
import { Queue } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { join } from '../../../base/common/path.js';
import { Promises } from '../../../base/node/pfs.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { IExtensionGalleryService, IExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../extensionManagement/common/extensionManagementUtil.js';
import { ILogService } from '../../log/common/log.js';
import { LanguagePackBaseService } from '../common/languagePacks.js';
import { URI } from '../../../base/common/uri.js';
let NativeLanguagePackService = class NativeLanguagePackService extends LanguagePackBaseService {
    constructor(extensionManagementService, environmentService, extensionGalleryService, logService) {
        super(extensionGalleryService);
        this.extensionManagementService = extensionManagementService;
        this.logService = logService;
        this.cache = this._register(new LanguagePacksCache(environmentService, logService));
        this.extensionManagementService.registerParticipant({
            postInstall: async (extension) => {
                return this.postInstallExtension(extension);
            },
            postUninstall: async (extension) => {
                return this.postUninstallExtension(extension);
            }
        });
    }
    async getBuiltInExtensionTranslationsUri(id, language) {
        const packs = await this.cache.getLanguagePacks();
        const pack = packs[language];
        if (!pack) {
            this.logService.warn(`No language pack found for ${language}`);
            return undefined;
        }
        const translation = pack.translations[id];
        return translation ? URI.file(translation) : undefined;
    }
    async getInstalledLanguages() {
        const languagePacks = await this.cache.getLanguagePacks();
        const languages = Object.keys(languagePacks).map(locale => {
            const languagePack = languagePacks[locale];
            const baseQuickPick = this.createQuickPickItem(locale, languagePack.label);
            return {
                ...baseQuickPick,
                extensionId: languagePack.extensions[0].extensionIdentifier.id,
            };
        });
        languages.push(this.createQuickPickItem('en', 'English'));
        languages.sort((a, b) => a.label.localeCompare(b.label));
        return languages;
    }
    async postInstallExtension(extension) {
        if (extension && extension.manifest && extension.manifest.contributes && extension.manifest.contributes.localizations && extension.manifest.contributes.localizations.length) {
            this.logService.info('Adding language packs from the extension', extension.identifier.id);
            await this.update();
        }
    }
    async postUninstallExtension(extension) {
        const languagePacks = await this.cache.getLanguagePacks();
        if (Object.keys(languagePacks).some(language => languagePacks[language] && languagePacks[language].extensions.some(e => areSameExtensions(e.extensionIdentifier, extension.identifier)))) {
            this.logService.info('Removing language packs from the extension', extension.identifier.id);
            await this.update();
        }
    }
    async update() {
        const [current, installed] = await Promise.all([this.cache.getLanguagePacks(), this.extensionManagementService.getInstalled()]);
        const updated = await this.cache.update(installed);
        return !equals(Object.keys(current), Object.keys(updated));
    }
};
NativeLanguagePackService = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, INativeEnvironmentService),
    __param(2, IExtensionGalleryService),
    __param(3, ILogService)
], NativeLanguagePackService);
export { NativeLanguagePackService };
let LanguagePacksCache = class LanguagePacksCache extends Disposable {
    constructor(environmentService, logService) {
        super();
        this.logService = logService;
        this.languagePacks = {};
        this.languagePacksFilePath = join(environmentService.userDataPath, 'languagepacks.json');
        this.languagePacksFileLimiter = new Queue();
    }
    getLanguagePacks() {
        // if queue is not empty, fetch from disk
        if (this.languagePacksFileLimiter.size || !this.initializedCache) {
            return this.withLanguagePacks()
                .then(() => this.languagePacks);
        }
        return Promise.resolve(this.languagePacks);
    }
    update(extensions) {
        return this.withLanguagePacks(languagePacks => {
            Object.keys(languagePacks).forEach(language => delete languagePacks[language]);
            this.createLanguagePacksFromExtensions(languagePacks, ...extensions);
        }).then(() => this.languagePacks);
    }
    createLanguagePacksFromExtensions(languagePacks, ...extensions) {
        for (const extension of extensions) {
            if (extension && extension.manifest && extension.manifest.contributes && extension.manifest.contributes.localizations && extension.manifest.contributes.localizations.length) {
                this.createLanguagePacksFromExtension(languagePacks, extension);
            }
        }
        Object.keys(languagePacks).forEach(languageId => this.updateHash(languagePacks[languageId]));
    }
    createLanguagePacksFromExtension(languagePacks, extension) {
        const extensionIdentifier = extension.identifier;
        const localizations = extension.manifest.contributes && extension.manifest.contributes.localizations ? extension.manifest.contributes.localizations : [];
        for (const localizationContribution of localizations) {
            if (extension.location.scheme === Schemas.file && isValidLocalization(localizationContribution)) {
                let languagePack = languagePacks[localizationContribution.languageId];
                if (!languagePack) {
                    languagePack = {
                        hash: '',
                        extensions: [],
                        translations: {},
                        label: localizationContribution.localizedLanguageName ?? localizationContribution.languageName
                    };
                    languagePacks[localizationContribution.languageId] = languagePack;
                }
                const extensionInLanguagePack = languagePack.extensions.filter(e => areSameExtensions(e.extensionIdentifier, extensionIdentifier))[0];
                if (extensionInLanguagePack) {
                    extensionInLanguagePack.version = extension.manifest.version;
                }
                else {
                    languagePack.extensions.push({ extensionIdentifier, version: extension.manifest.version });
                }
                for (const translation of localizationContribution.translations) {
                    languagePack.translations[translation.id] = join(extension.location.fsPath, translation.path);
                }
            }
        }
    }
    updateHash(languagePack) {
        if (languagePack) {
            const md5 = createHash('md5'); // CodeQL [SM04514] Used to create an hash for language pack extension version, which is not a security issue
            for (const extension of languagePack.extensions) {
                md5.update(extension.extensionIdentifier.uuid || extension.extensionIdentifier.id).update(extension.version); // CodeQL [SM01510] The extension UUID is not sensitive info and is not manually created by a user
            }
            languagePack.hash = md5.digest('hex');
        }
    }
    withLanguagePacks(fn = () => null) {
        return this.languagePacksFileLimiter.queue(() => {
            let result = null;
            return fs.promises.readFile(this.languagePacksFilePath, 'utf8')
                .then(undefined, err => err.code === 'ENOENT' ? Promise.resolve('{}') : Promise.reject(err))
                .then(raw => { try {
                return JSON.parse(raw);
            }
            catch (e) {
                return {};
            } })
                .then(languagePacks => { result = fn(languagePacks); return languagePacks; })
                .then(languagePacks => {
                for (const language of Object.keys(languagePacks)) {
                    if (!languagePacks[language]) {
                        delete languagePacks[language];
                    }
                }
                this.languagePacks = languagePacks;
                this.initializedCache = true;
                const raw = JSON.stringify(this.languagePacks);
                this.logService.debug('Writing language packs', raw);
                return Promises.writeFile(this.languagePacksFilePath, raw);
            })
                .then(() => result, error => this.logService.error(error));
        });
    }
};
LanguagePacksCache = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ILogService)
], LanguagePacksCache);
function isValidLocalization(localization) {
    if (typeof localization.languageId !== 'string') {
        return false;
    }
    if (!Array.isArray(localization.translations) || localization.translations.length === 0) {
        return false;
    }
    for (const translation of localization.translations) {
        if (typeof translation.id !== 'string') {
            return false;
        }
        if (typeof translation.path !== 'string') {
            return false;
        }
    }
    if (localization.languageName && typeof localization.languageName !== 'string') {
        return false;
    }
    if (localization.localizedLanguageName && typeof localization.localizedLanguageName !== 'string') {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sYW5ndWFnZVBhY2tzL25vZGUvbGFuZ3VhZ2VQYWNrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx3QkFBd0IsRUFBd0IsMkJBQTJCLEVBQW1CLE1BQU0seURBQXlELENBQUM7QUFDdkssT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXRELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN4RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFZM0MsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSx1QkFBdUI7SUFHckUsWUFD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