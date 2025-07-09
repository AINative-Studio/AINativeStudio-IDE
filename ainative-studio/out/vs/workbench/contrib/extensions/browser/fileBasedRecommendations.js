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
import { ExtensionRecommendations } from './extensionRecommendations.js';
import { IExtensionIgnoredRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { localize } from '../../../../nls.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename, extname } from '../../../../base/common/resources.js';
import { match } from '../../../../base/common/glob.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IExtensionRecommendationNotificationService } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { distinct } from '../../../../base/common/arrays.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
const promptedRecommendationsStorageKey = 'fileBasedRecommendations/promptedRecommendations';
const recommendationsStorageKey = 'extensionsAssistant/recommendations';
const milliSecondsInADay = 1000 * 60 * 60 * 24;
let FileBasedRecommendations = class FileBasedRecommendations extends ExtensionRecommendations {
    get recommendations() {
        const recommendations = [];
        [...this.fileBasedRecommendations.keys()]
            .sort((a, b) => {
            if (this.fileBasedRecommendations.get(a).recommendedTime === this.fileBasedRecommendations.get(b).recommendedTime) {
                if (this.fileBasedImportantRecommendations.has(a)) {
                    return -1;
                }
                if (this.fileBasedImportantRecommendations.has(b)) {
                    return 1;
                }
            }
            return this.fileBasedRecommendations.get(a).recommendedTime > this.fileBasedRecommendations.get(b).recommendedTime ? -1 : 1;
        })
            .forEach(extensionId => {
            recommendations.push({
                extension: extensionId,
                reason: {
                    reasonId: 1 /* ExtensionRecommendationReason.File */,
                    reasonText: localize('fileBasedRecommendation', "This extension is recommended based on the files you recently opened.")
                }
            });
        });
        return recommendations;
    }
    get importantRecommendations() {
        return this.recommendations.filter(e => this.fileBasedImportantRecommendations.has(e.extension));
    }
    get otherRecommendations() {
        return this.recommendations.filter(e => !this.fileBasedImportantRecommendations.has(e.extension));
    }
    constructor(extensionsWorkbenchService, modelService, languageService, productService, storageService, extensionRecommendationNotificationService, extensionIgnoredRecommendationsService, workspaceContextService) {
        super();
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.storageService = storageService;
        this.extensionRecommendationNotificationService = extensionRecommendationNotificationService;
        this.extensionIgnoredRecommendationsService = extensionIgnoredRecommendationsService;
        this.workspaceContextService = workspaceContextService;
        this.recommendationsByPattern = new Map();
        this.fileBasedRecommendations = new Map();
        this.fileBasedImportantRecommendations = new Set();
        this.fileOpenRecommendations = {};
        if (productService.extensionRecommendations) {
            for (const [extensionId, recommendation] of Object.entries(productService.extensionRecommendations)) {
                if (recommendation.onFileOpen) {
                    this.fileOpenRecommendations[extensionId.toLowerCase()] = recommendation.onFileOpen;
                }
            }
        }
    }
    async doActivate() {
        if (isEmptyObject(this.fileOpenRecommendations)) {
            return;
        }
        await this.extensionsWorkbenchService.whenInitialized;
        const cachedRecommendations = this.getCachedRecommendations();
        const now = Date.now();
        // Retire existing recommendations if they are older than a week or are not part of this.productService.extensionTips anymore
        Object.entries(cachedRecommendations).forEach(([key, value]) => {
            const diff = (now - value) / milliSecondsInADay;
            if (diff <= 7 && this.fileOpenRecommendations[key]) {
                this.fileBasedRecommendations.set(key.toLowerCase(), { recommendedTime: value });
            }
        });
        this._register(this.modelService.onModelAdded(model => this.onModelAdded(model)));
        this.modelService.getModels().forEach(model => this.onModelAdded(model));
    }
    onModelAdded(model) {
        const uri = model.uri.scheme === Schemas.vscodeNotebookCell ? CellUri.parse(model.uri)?.notebook : model.uri;
        if (!uri) {
            return;
        }
        const supportedSchemes = distinct([Schemas.untitled, Schemas.file, Schemas.vscodeRemote, ...this.workspaceContextService.getWorkspace().folders.map(folder => folder.uri.scheme)]);
        if (!uri || !supportedSchemes.includes(uri.scheme)) {
            return;
        }
        // re-schedule this bit of the operation to be off the critical path - in case glob-match is slow
        disposableTimeout(() => this.promptImportantRecommendations(uri, model), 0, this._store);
    }
    /**
     * Prompt the user to either install the recommended extension for the file type in the current editor model
     * or prompt to search the marketplace if it has extensions that can support the file type
     */
    promptImportantRecommendations(uri, model, extensionRecommendations) {
        if (model.isDisposed()) {
            return;
        }
        const pattern = extname(uri).toLowerCase();
        extensionRecommendations = extensionRecommendations ?? this.recommendationsByPattern.get(pattern) ?? this.fileOpenRecommendations;
        const extensionRecommendationEntries = Object.entries(extensionRecommendations);
        if (extensionRecommendationEntries.length === 0) {
            return;
        }
        const processedPathGlobs = new Map();
        const installed = this.extensionsWorkbenchService.local;
        const recommendationsByPattern = {};
        const matchedRecommendations = {};
        const unmatchedRecommendations = {};
        let listenOnLanguageChange = false;
        const languageId = model.getLanguageId();
        for (const [extensionId, conditions] of extensionRecommendationEntries) {
            const conditionsByPattern = [];
            const matchedConditions = [];
            const unmatchedConditions = [];
            for (const condition of conditions) {
                let languageMatched = false;
                let pathGlobMatched = false;
                const isLanguageCondition = !!condition.languages;
                const isFileContentCondition = !!condition.contentPattern;
                if (isLanguageCondition || isFileContentCondition) {
                    conditionsByPattern.push(condition);
                }
                if (isLanguageCondition) {
                    if (condition.languages.includes(languageId)) {
                        languageMatched = true;
                    }
                }
                if (condition.pathGlob) {
                    const pathGlob = condition.pathGlob;
                    if (processedPathGlobs.get(pathGlob) ?? match(condition.pathGlob, uri.with({ fragment: '' }).toString())) {
                        pathGlobMatched = true;
                    }
                    processedPathGlobs.set(pathGlob, pathGlobMatched);
                }
                let matched = languageMatched || pathGlobMatched;
                // If the resource has pattern (extension) and not matched, then we don't need to check the other conditions
                if (pattern && !matched) {
                    continue;
                }
                if (matched && condition.whenInstalled) {
                    if (!condition.whenInstalled.every(id => installed.some(local => areSameExtensions({ id }, local.identifier)))) {
                        matched = false;
                    }
                }
                if (matched && condition.whenNotInstalled) {
                    if (installed.some(local => condition.whenNotInstalled?.some(id => areSameExtensions({ id }, local.identifier)))) {
                        matched = false;
                    }
                }
                if (matched && isFileContentCondition) {
                    if (!model.findMatches(condition.contentPattern, false, true, false, null, false).length) {
                        matched = false;
                    }
                }
                if (matched) {
                    matchedConditions.push(condition);
                    conditionsByPattern.pop();
                }
                else {
                    if (isLanguageCondition || isFileContentCondition) {
                        unmatchedConditions.push(condition);
                        if (isLanguageCondition) {
                            listenOnLanguageChange = true;
                        }
                    }
                }
            }
            if (matchedConditions.length) {
                matchedRecommendations[extensionId] = matchedConditions;
            }
            if (unmatchedConditions.length) {
                unmatchedRecommendations[extensionId] = unmatchedConditions;
            }
            if (conditionsByPattern.length) {
                recommendationsByPattern[extensionId] = conditionsByPattern;
            }
        }
        if (pattern) {
            this.recommendationsByPattern.set(pattern, recommendationsByPattern);
        }
        if (Object.keys(unmatchedRecommendations).length) {
            if (listenOnLanguageChange) {
                const disposables = new DisposableStore();
                disposables.add(model.onDidChangeLanguage(() => {
                    // re-schedule this bit of the operation to be off the critical path - in case glob-match is slow
                    disposableTimeout(() => {
                        if (!disposables.isDisposed) {
                            this.promptImportantRecommendations(uri, model, unmatchedRecommendations);
                            disposables.dispose();
                        }
                    }, 0, disposables);
                }));
                disposables.add(model.onWillDispose(() => disposables.dispose()));
            }
        }
        if (Object.keys(matchedRecommendations).length) {
            this.promptFromRecommendations(uri, model, matchedRecommendations);
        }
    }
    promptFromRecommendations(uri, model, extensionRecommendations) {
        let isImportantRecommendationForLanguage = false;
        const importantRecommendations = new Set();
        const fileBasedRecommendations = new Set();
        for (const [extensionId, conditions] of Object.entries(extensionRecommendations)) {
            for (const condition of conditions) {
                fileBasedRecommendations.add(extensionId);
                if (condition.important) {
                    importantRecommendations.add(extensionId);
                    this.fileBasedImportantRecommendations.add(extensionId);
                }
                if (condition.languages) {
                    isImportantRecommendationForLanguage = true;
                }
            }
        }
        // Update file based recommendations
        for (const recommendation of fileBasedRecommendations) {
            const filedBasedRecommendation = this.fileBasedRecommendations.get(recommendation) || { recommendedTime: Date.now(), sources: [] };
            filedBasedRecommendation.recommendedTime = Date.now();
            this.fileBasedRecommendations.set(recommendation, filedBasedRecommendation);
        }
        this.storeCachedRecommendations();
        if (this.extensionRecommendationNotificationService.hasToIgnoreRecommendationNotifications()) {
            return;
        }
        const language = model.getLanguageId();
        const languageName = this.languageService.getLanguageName(language);
        if (importantRecommendations.size &&
            this.promptRecommendedExtensionForFileType(languageName && isImportantRecommendationForLanguage && language !== PLAINTEXT_LANGUAGE_ID ? localize('languageName', "the {0} language", languageName) : basename(uri), language, [...importantRecommendations])) {
            return;
        }
    }
    promptRecommendedExtensionForFileType(name, language, recommendations) {
        recommendations = this.filterIgnoredOrNotAllowed(recommendations);
        if (recommendations.length === 0) {
            return false;
        }
        recommendations = this.filterInstalled(recommendations, this.extensionsWorkbenchService.local)
            .filter(extensionId => this.fileBasedImportantRecommendations.has(extensionId));
        const promptedRecommendations = language !== PLAINTEXT_LANGUAGE_ID ? this.getPromptedRecommendations()[language] : undefined;
        if (promptedRecommendations) {
            recommendations = recommendations.filter(extensionId => promptedRecommendations.includes(extensionId));
        }
        if (recommendations.length === 0) {
            return false;
        }
        this.promptImportantExtensionsInstallNotification(recommendations, name, language);
        return true;
    }
    async promptImportantExtensionsInstallNotification(extensions, name, language) {
        try {
            const result = await this.extensionRecommendationNotificationService.promptImportantExtensionsInstallNotification({ extensions, name, source: 1 /* RecommendationSource.FILE */ });
            if (result === "reacted" /* RecommendationsNotificationResult.Accepted */) {
                this.addToPromptedRecommendations(language, extensions);
            }
        }
        catch (error) { /* Ignore */ }
    }
    getPromptedRecommendations() {
        return JSON.parse(this.storageService.get(promptedRecommendationsStorageKey, 0 /* StorageScope.PROFILE */, '{}'));
    }
    addToPromptedRecommendations(language, extensions) {
        const promptedRecommendations = this.getPromptedRecommendations();
        promptedRecommendations[language] = distinct([...(promptedRecommendations[language] ?? []), ...extensions]);
        this.storageService.store(promptedRecommendationsStorageKey, JSON.stringify(promptedRecommendations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    filterIgnoredOrNotAllowed(recommendationsToSuggest) {
        const ignoredRecommendations = [...this.extensionIgnoredRecommendationsService.ignoredRecommendations, ...this.extensionRecommendationNotificationService.ignoredRecommendations];
        return recommendationsToSuggest.filter(id => !ignoredRecommendations.includes(id));
    }
    filterInstalled(recommendationsToSuggest, installed) {
        const installedExtensionsIds = installed.reduce((result, i) => {
            if (i.enablementState !== 1 /* EnablementState.DisabledByExtensionKind */) {
                result.add(i.identifier.id.toLowerCase());
            }
            return result;
        }, new Set());
        return recommendationsToSuggest.filter(id => !installedExtensionsIds.has(id.toLowerCase()));
    }
    getCachedRecommendations() {
        let storedRecommendations = JSON.parse(this.storageService.get(recommendationsStorageKey, 0 /* StorageScope.PROFILE */, '[]'));
        if (Array.isArray(storedRecommendations)) {
            storedRecommendations = storedRecommendations.reduce((result, id) => { result[id] = Date.now(); return result; }, {});
        }
        const result = {};
        Object.entries(storedRecommendations).forEach(([key, value]) => {
            if (typeof value === 'number') {
                result[key.toLowerCase()] = value;
            }
        });
        return result;
    }
    storeCachedRecommendations() {
        const storedRecommendations = {};
        this.fileBasedRecommendations.forEach((value, key) => storedRecommendations[key] = value.recommendedTime);
        this.storageService.store(recommendationsStorageKey, JSON.stringify(storedRecommendations), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
};
FileBasedRecommendations = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, IProductService),
    __param(4, IStorageService),
    __param(5, IExtensionRecommendationNotificationService),
    __param(6, IExtensionIgnoredRecommendationsService),
    __param(7, IWorkspaceContextService)
], FileBasedRecommendations);
export { FileBasedRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUJhc2VkUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9maWxlQmFzZWRSZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFrQyxNQUFNLCtCQUErQixDQUFDO0FBRXpHLE9BQU8sRUFBaUMsdUNBQXVDLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN2SyxPQUFPLEVBQUUsMkJBQTJCLEVBQWMsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFnQixlQUFlLEVBQWlCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBSXhGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLDJDQUEyQyxFQUEyRCxNQUFNLGtGQUFrRixDQUFDO0FBQ3hNLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFF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