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
import { Emitter } from '../../../../base/common/event.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions, IExtensionFeaturesManagementService } from './extensionFeatures.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { isBoolean } from '../../../../base/common/types.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { localize } from '../../../../nls.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { equals } from '../../../../base/common/objects.js';
const FEATURES_STATE_KEY = 'extension.features.state';
let ExtensionFeaturesManagementService = class ExtensionFeaturesManagementService extends Disposable {
    constructor(storageService, dialogService, extensionService) {
        super();
        this.storageService = storageService;
        this.dialogService = dialogService;
        this.extensionService = extensionService;
        this._onDidChangeEnablement = this._register(new Emitter());
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this._onDidChangeAccessData = this._register(new Emitter());
        this.onDidChangeAccessData = this._onDidChangeAccessData.event;
        this.extensionFeaturesState = new Map();
        this.registry = Registry.as(Extensions.ExtensionFeaturesRegistry);
        this.extensionFeaturesState = this.loadState();
        this.garbageCollectOldRequests();
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, FEATURES_STATE_KEY, this._store)(e => this.onDidStorageChange(e)));
    }
    isEnabled(extension, featureId) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            return false;
        }
        const isDisabled = this.getExtensionFeatureState(extension, featureId)?.disabled;
        if (isBoolean(isDisabled)) {
            return !isDisabled;
        }
        const defaultExtensionAccess = feature.access.extensionsList?.[extension._lower];
        if (isBoolean(defaultExtensionAccess)) {
            return defaultExtensionAccess;
        }
        return !feature.access.requireUserConsent;
    }
    setEnablement(extension, featureId, enabled) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            throw new Error(`No feature with id '${featureId}'`);
        }
        const featureState = this.getAndSetIfNotExistsExtensionFeatureState(extension, featureId);
        if (featureState.disabled !== !enabled) {
            featureState.disabled = !enabled;
            this._onDidChangeEnablement.fire({ extension, featureId, enabled });
            this.saveState();
        }
    }
    getEnablementData(featureId) {
        const result = [];
        const feature = this.registry.getExtensionFeature(featureId);
        if (feature) {
            for (const [extension, featuresStateMap] of this.extensionFeaturesState) {
                const featureState = featuresStateMap.get(featureId);
                if (featureState?.disabled !== undefined) {
                    result.push({ extension: new ExtensionIdentifier(extension), enabled: !featureState.disabled });
                }
            }
        }
        return result;
    }
    async getAccess(extension, featureId, justification) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            return false;
        }
        const featureState = this.getAndSetIfNotExistsExtensionFeatureState(extension, featureId);
        if (featureState.disabled) {
            return false;
        }
        if (featureState.disabled === undefined) {
            let enabled = true;
            if (feature.access.requireUserConsent) {
                const extensionDescription = this.extensionService.extensions.find(e => ExtensionIdentifier.equals(e.identifier, extension));
                const confirmationResult = await this.dialogService.confirm({
                    title: localize('accessExtensionFeature', "Access '{0}' Feature", feature.label),
                    message: localize('accessExtensionFeatureMessage', "'{0}' extension would like to access the '{1}' feature.", extensionDescription?.displayName ?? extension._lower, feature.label),
                    detail: justification ?? feature.description,
                    custom: true,
                    primaryButton: localize('allow', "Allow"),
                    cancelButton: localize('disallow', "Don't Allow"),
                });
                enabled = confirmationResult.confirmed;
            }
            this.setEnablement(extension, featureId, enabled);
            if (!enabled) {
                return false;
            }
        }
        const accessTime = new Date();
        featureState.accessData.current = {
            accessTimes: [accessTime].concat(featureState.accessData.current?.accessTimes ?? []),
            lastAccessed: accessTime,
            status: featureState.accessData.current?.status
        };
        featureState.accessData.accessTimes = (featureState.accessData.accessTimes ?? []).concat(accessTime);
        this.saveState();
        this._onDidChangeAccessData.fire({ extension, featureId, accessData: featureState.accessData });
        return true;
    }
    getAllAccessDataForExtension(extension) {
        const result = new Map();
        const extensionState = this.extensionFeaturesState.get(extension._lower);
        if (extensionState) {
            for (const [featureId, featureState] of extensionState) {
                result.set(featureId, featureState.accessData);
            }
        }
        return result;
    }
    getAccessData(extension, featureId) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            return;
        }
        return this.getExtensionFeatureState(extension, featureId)?.accessData;
    }
    setStatus(extension, featureId, status) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            throw new Error(`No feature with id '${featureId}'`);
        }
        const featureState = this.getAndSetIfNotExistsExtensionFeatureState(extension, featureId);
        featureState.accessData.current = {
            accessTimes: featureState.accessData.current?.accessTimes ?? [],
            lastAccessed: featureState.accessData.current?.lastAccessed ?? new Date(),
            status
        };
        this._onDidChangeAccessData.fire({ extension, featureId, accessData: this.getAccessData(extension, featureId) });
    }
    getExtensionFeatureState(extension, featureId) {
        return this.extensionFeaturesState.get(extension._lower)?.get(featureId);
    }
    getAndSetIfNotExistsExtensionFeatureState(extension, featureId) {
        let extensionState = this.extensionFeaturesState.get(extension._lower);
        if (!extensionState) {
            extensionState = new Map();
            this.extensionFeaturesState.set(extension._lower, extensionState);
        }
        let featureState = extensionState.get(featureId);
        if (!featureState) {
            featureState = { accessData: { accessTimes: [] } };
            extensionState.set(featureId, featureState);
        }
        return featureState;
    }
    onDidStorageChange(e) {
        if (e.external) {
            const oldState = this.extensionFeaturesState;
            this.extensionFeaturesState = this.loadState();
            for (const extensionId of distinct([...oldState.keys(), ...this.extensionFeaturesState.keys()])) {
                const extension = new ExtensionIdentifier(extensionId);
                const oldExtensionFeaturesState = oldState.get(extensionId);
                const newExtensionFeaturesState = this.extensionFeaturesState.get(extensionId);
                for (const featureId of distinct([...oldExtensionFeaturesState?.keys() ?? [], ...newExtensionFeaturesState?.keys() ?? []])) {
                    const isEnabled = this.isEnabled(extension, featureId);
                    const wasEnabled = !oldExtensionFeaturesState?.get(featureId)?.disabled;
                    if (isEnabled !== wasEnabled) {
                        this._onDidChangeEnablement.fire({ extension, featureId, enabled: isEnabled });
                    }
                    const newAccessData = this.getAccessData(extension, featureId);
                    const oldAccessData = oldExtensionFeaturesState?.get(featureId)?.accessData;
                    if (!equals(newAccessData, oldAccessData)) {
                        this._onDidChangeAccessData.fire({ extension, featureId, accessData: newAccessData ?? { accessTimes: [] } });
                    }
                }
            }
        }
    }
    loadState() {
        let data = {};
        const raw = this.storageService.get(FEATURES_STATE_KEY, 0 /* StorageScope.PROFILE */, '{}');
        try {
            data = JSON.parse(raw);
        }
        catch (e) {
            // ignore
        }
        const result = new Map();
        for (const extensionId in data) {
            const extensionFeatureState = new Map();
            const extensionFeatures = data[extensionId];
            for (const featureId in extensionFeatures) {
                const extensionFeature = extensionFeatures[featureId];
                extensionFeatureState.set(featureId, {
                    disabled: extensionFeature.disabled,
                    accessData: {
                        accessTimes: (extensionFeature.accessTimes ?? []).map(time => new Date(time)),
                    }
                });
            }
            result.set(extensionId.toLowerCase(), extensionFeatureState);
        }
        return result;
    }
    saveState() {
        const data = {};
        this.extensionFeaturesState.forEach((extensionState, extensionId) => {
            const extensionFeatures = {};
            extensionState.forEach((featureState, featureId) => {
                extensionFeatures[featureId] = {
                    disabled: featureState.disabled,
                    accessTimes: featureState.accessData.accessTimes.map(time => time.getTime()),
                };
            });
            data[extensionId] = extensionFeatures;
        });
        this.storageService.store(FEATURES_STATE_KEY, JSON.stringify(data), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    garbageCollectOldRequests() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        let modified = false;
        for (const [, featuresStateMap] of this.extensionFeaturesState) {
            for (const [, featureState] of featuresStateMap) {
                const originalLength = featureState.accessData.accessTimes.length;
                featureState.accessData.accessTimes = featureState.accessData.accessTimes.filter(accessTime => accessTime > thirtyDaysAgo);
                if (featureState.accessData.accessTimes.length !== originalLength) {
                    modified = true;
                }
            }
        }
        if (modified) {
            this.saveState();
        }
    }
};
ExtensionFeaturesManagementService = __decorate([
    __param(0, IStorageService),
    __param(1, IDialogService),
    __param(2, IExtensionService)
], ExtensionFeaturesManagementService);
registerSingleton(IExtensionFeaturesManagementService, ExtensionFeaturesManagementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRmVhdHVyZXNNYW5hZ2VtZXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25GZWF0dXJlc01hbmFnZW1ldFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsVUFBVSxFQUErQixtQ0FBbUMsRUFBOEIsTUFBTSx3QkFBd0IsQ0FBQztBQUNsSixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQU81RCxNQUFNLGtCQUFrQixHQUFHLDBCQUEwQixDQUFD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