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
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IExtensionManagementService, IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { shuffle } from '../../../../base/common/arrays.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ExeBasedRecommendations } from './exeBasedRecommendations.js';
import { WorkspaceRecommendations } from './workspaceRecommendations.js';
import { FileBasedRecommendations } from './fileBasedRecommendations.js';
import { KeymapRecommendations } from './keymapRecommendations.js';
import { LanguageRecommendations } from './languageRecommendations.js';
import { ConfigBasedRecommendations } from './configBasedRecommendations.js';
import { IExtensionRecommendationNotificationService } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { WebRecommendations } from './webRecommendations.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RemoteRecommendations } from './remoteRecommendations.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { IUserDataInitializationService } from '../../../services/userData/browser/userDataInit.js';
import { isString } from '../../../../base/common/types.js';
let ExtensionRecommendationsService = class ExtensionRecommendationsService extends Disposable {
    constructor(instantiationService, lifecycleService, galleryService, telemetryService, environmentService, extensionManagementService, extensionRecommendationsManagementService, extensionRecommendationNotificationService, extensionsWorkbenchService, remoteExtensionsScannerService, userDataInitializationService) {
        super();
        this.lifecycleService = lifecycleService;
        this.galleryService = galleryService;
        this.telemetryService = telemetryService;
        this.environmentService = environmentService;
        this.extensionManagementService = extensionManagementService;
        this.extensionRecommendationsManagementService = extensionRecommendationsManagementService;
        this.extensionRecommendationNotificationService = extensionRecommendationNotificationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.remoteExtensionsScannerService = remoteExtensionsScannerService;
        this.userDataInitializationService = userDataInitializationService;
        this._onDidChangeRecommendations = this._register(new Emitter());
        this.onDidChangeRecommendations = this._onDidChangeRecommendations.event;
        this.workspaceRecommendations = this._register(instantiationService.createInstance(WorkspaceRecommendations));
        this.fileBasedRecommendations = this._register(instantiationService.createInstance(FileBasedRecommendations));
        this.configBasedRecommendations = this._register(instantiationService.createInstance(ConfigBasedRecommendations));
        this.exeBasedRecommendations = this._register(instantiationService.createInstance(ExeBasedRecommendations));
        this.keymapRecommendations = this._register(instantiationService.createInstance(KeymapRecommendations));
        this.webRecommendations = this._register(instantiationService.createInstance(WebRecommendations));
        this.languageRecommendations = this._register(instantiationService.createInstance(LanguageRecommendations));
        this.remoteRecommendations = this._register(instantiationService.createInstance(RemoteRecommendations));
        if (!this.isEnabled()) {
            this.sessionSeed = 0;
            this.activationPromise = Promise.resolve();
            return;
        }
        this.sessionSeed = +new Date();
        // Activation
        this.activationPromise = this.activate();
        this._register(this.extensionManagementService.onDidInstallExtensions(e => this.onDidInstallExtensions(e)));
    }
    async activate() {
        try {
            await Promise.allSettled([
                this.remoteExtensionsScannerService.whenExtensionsReady(),
                this.userDataInitializationService.whenInitializationFinished(),
                this.lifecycleService.when(3 /* LifecyclePhase.Restored */)
            ]);
        }
        catch (error) { /* ignore */ }
        // activate all recommendations
        await Promise.all([
            this.workspaceRecommendations.activate(),
            this.configBasedRecommendations.activate(),
            this.fileBasedRecommendations.activate(),
            this.keymapRecommendations.activate(),
            this.languageRecommendations.activate(),
            this.webRecommendations.activate(),
            this.remoteRecommendations.activate()
        ]);
        this._register(Event.any(this.workspaceRecommendations.onDidChangeRecommendations, this.configBasedRecommendations.onDidChangeRecommendations, this.extensionRecommendationsManagementService.onDidChangeIgnoredRecommendations)(() => this._onDidChangeRecommendations.fire()));
        this.promptWorkspaceRecommendations();
    }
    isEnabled() {
        return this.galleryService.isEnabled() && !this.environmentService.isExtensionDevelopment;
    }
    async activateProactiveRecommendations() {
        await Promise.all([this.exeBasedRecommendations.activate(), this.configBasedRecommendations.activate()]);
    }
    getAllRecommendationsWithReason() {
        /* Activate proactive recommendations */
        this.activateProactiveRecommendations();
        const output = Object.create(null);
        const allRecommendations = [
            ...this.configBasedRecommendations.recommendations,
            ...this.exeBasedRecommendations.recommendations,
            ...this.fileBasedRecommendations.recommendations,
            ...this.workspaceRecommendations.recommendations,
            ...this.keymapRecommendations.recommendations,
            ...this.languageRecommendations.recommendations,
            ...this.webRecommendations.recommendations,
        ];
        for (const { extension, reason } of allRecommendations) {
            if (isString(extension) && this.isExtensionAllowedToBeRecommended(extension)) {
                output[extension.toLowerCase()] = reason;
            }
        }
        return output;
    }
    async getConfigBasedRecommendations() {
        await this.configBasedRecommendations.activate();
        return {
            important: this.toExtensionIds(this.configBasedRecommendations.importantRecommendations),
            others: this.toExtensionIds(this.configBasedRecommendations.otherRecommendations)
        };
    }
    async getOtherRecommendations() {
        await this.activationPromise;
        await this.activateProactiveRecommendations();
        const recommendations = [
            ...this.configBasedRecommendations.otherRecommendations,
            ...this.exeBasedRecommendations.otherRecommendations,
            ...this.webRecommendations.recommendations
        ];
        const extensionIds = this.toExtensionIds(recommendations);
        shuffle(extensionIds, this.sessionSeed);
        return extensionIds;
    }
    async getImportantRecommendations() {
        await this.activateProactiveRecommendations();
        const recommendations = [
            ...this.fileBasedRecommendations.importantRecommendations,
            ...this.configBasedRecommendations.importantRecommendations,
            ...this.exeBasedRecommendations.importantRecommendations,
        ];
        const extensionIds = this.toExtensionIds(recommendations);
        shuffle(extensionIds, this.sessionSeed);
        return extensionIds;
    }
    getKeymapRecommendations() {
        return this.toExtensionIds(this.keymapRecommendations.recommendations);
    }
    getLanguageRecommendations() {
        return this.toExtensionIds(this.languageRecommendations.recommendations);
    }
    getRemoteRecommendations() {
        return this.toExtensionIds(this.remoteRecommendations.recommendations);
    }
    async getWorkspaceRecommendations() {
        if (!this.isEnabled()) {
            return [];
        }
        await this.workspaceRecommendations.activate();
        const result = [];
        for (const { extension } of this.workspaceRecommendations.recommendations) {
            if (isString(extension)) {
                if (!result.includes(extension.toLowerCase()) && this.isExtensionAllowedToBeRecommended(extension)) {
                    result.push(extension.toLowerCase());
                }
            }
            else {
                result.push(extension);
            }
        }
        return result;
    }
    async getExeBasedRecommendations(exe) {
        await this.exeBasedRecommendations.activate();
        const { important, others } = exe ? this.exeBasedRecommendations.getRecommendations(exe)
            : { important: this.exeBasedRecommendations.importantRecommendations, others: this.exeBasedRecommendations.otherRecommendations };
        return { important: this.toExtensionIds(important), others: this.toExtensionIds(others) };
    }
    getFileBasedRecommendations() {
        return this.toExtensionIds(this.fileBasedRecommendations.recommendations);
    }
    onDidInstallExtensions(results) {
        for (const e of results) {
            if (e.source && !URI.isUri(e.source) && e.operation === 2 /* InstallOperation.Install */) {
                const extRecommendations = this.getAllRecommendationsWithReason() || {};
                const recommendationReason = extRecommendations[e.source.identifier.id.toLowerCase()];
                if (recommendationReason) {
                    /* __GDPR__
                        "extensionGallery:install:recommendations" : {
                            "owner": "sandy081",
                            "recommendationReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                            "${include}": [
                                "${GalleryExtensionTelemetryData}"
                            ]
                        }
                    */
                    this.telemetryService.publicLog('extensionGallery:install:recommendations', { ...e.source.telemetryData, recommendationReason: recommendationReason.reasonId });
                }
            }
        }
    }
    toExtensionIds(recommendations) {
        const extensionIds = [];
        for (const { extension } of recommendations) {
            if (isString(extension) && this.isExtensionAllowedToBeRecommended(extension) && !extensionIds.includes(extension.toLowerCase())) {
                extensionIds.push(extension.toLowerCase());
            }
        }
        return extensionIds;
    }
    isExtensionAllowedToBeRecommended(extensionId) {
        return !this.extensionRecommendationsManagementService.ignoredRecommendations.includes(extensionId.toLowerCase());
    }
    async promptWorkspaceRecommendations() {
        const installed = await this.extensionsWorkbenchService.queryLocal();
        const allowedRecommendations = [
            ...this.workspaceRecommendations.recommendations,
            ...this.configBasedRecommendations.importantRecommendations.filter(recommendation => !recommendation.whenNotInstalled || recommendation.whenNotInstalled.every(id => installed.every(local => !areSameExtensions(local.identifier, { id }))))
        ]
            .map(({ extension }) => extension)
            .filter(extension => !isString(extension) || this.isExtensionAllowedToBeRecommended(extension));
        if (allowedRecommendations.length) {
            await this._registerP(timeout(5000));
            await this.extensionRecommendationNotificationService.promptWorkspaceRecommendations(allowedRecommendations);
        }
    }
    _registerP(o) {
        this._register(toDisposable(() => o.cancel()));
        return o;
    }
};
ExtensionRecommendationsService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILifecycleService),
    __param(2, IExtensionGalleryService),
    __param(3, ITelemetryService),
    __param(4, IEnvironmentService),
    __param(5, IExtensionManagementService),
    __param(6, IExtensionIgnoredRecommendationsService),
    __param(7, IExtensionRecommendationNotificationService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IRemoteExtensionsScannerService),
    __param(10, IUserDataInitializationService)
], ExtensionRecommendationsService);
export { ExtensionRecommendationsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSx3QkFBd0IsRUFBNEMsTUFBTSx3RUFBd0UsQ0FBQztBQUN6TCxPQUFPLEVBQW1FLHVDQUF1QyxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDek0sT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFrQixpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ25FLE9BQU8sRUFB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