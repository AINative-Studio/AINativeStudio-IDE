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
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { StoredValue } from './storedValue.js';
import { TestId } from './testId.js';
import { testRunProfileBitsetList } from './testTypes.js';
import { TestingContextKeys } from './testingContextKeys.js';
export const ITestProfileService = createDecorator('testProfileService');
/**
 * Gets whether the given profile can be used to run the test.
 */
export const canUseProfileWithTest = (profile, test) => profile.controllerId === test.controllerId && (TestId.isRoot(test.item.extId) || !profile.tag || test.item.tags.includes(profile.tag));
const sorter = (a, b) => {
    if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
};
/**
 * Given a capabilities bitset, returns a map of context keys representing
 * them.
 */
export const capabilityContextKeys = (capabilities) => [
    [TestingContextKeys.hasRunnableTests.key, (capabilities & 2 /* TestRunProfileBitset.Run */) !== 0],
    [TestingContextKeys.hasDebuggableTests.key, (capabilities & 4 /* TestRunProfileBitset.Debug */) !== 0],
    [TestingContextKeys.hasCoverableTests.key, (capabilities & 8 /* TestRunProfileBitset.Coverage */) !== 0],
];
let TestProfileService = class TestProfileService extends Disposable {
    constructor(contextKeyService, storageService) {
        super();
        this.changeEmitter = this._register(new Emitter());
        this.controllerProfiles = new Map();
        /** @inheritdoc */
        this.onDidChange = this.changeEmitter.event;
        storageService.remove('testingPreferredProfiles', 1 /* StorageScope.WORKSPACE */); // cleanup old format
        this.userDefaults = this._register(new StoredValue({
            key: 'testingPreferredProfiles2',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
        }, storageService));
        this.capabilitiesContexts = {
            [2 /* TestRunProfileBitset.Run */]: TestingContextKeys.hasRunnableTests.bindTo(contextKeyService),
            [4 /* TestRunProfileBitset.Debug */]: TestingContextKeys.hasDebuggableTests.bindTo(contextKeyService),
            [8 /* TestRunProfileBitset.Coverage */]: TestingContextKeys.hasCoverableTests.bindTo(contextKeyService),
            [16 /* TestRunProfileBitset.HasNonDefaultProfile */]: TestingContextKeys.hasNonDefaultProfile.bindTo(contextKeyService),
            [32 /* TestRunProfileBitset.HasConfigurable */]: TestingContextKeys.hasConfigurableProfile.bindTo(contextKeyService),
            [64 /* TestRunProfileBitset.SupportsContinuousRun */]: TestingContextKeys.supportsContinuousRun.bindTo(contextKeyService),
        };
        this.refreshContextKeys();
    }
    /** @inheritdoc */
    addProfile(controller, profile) {
        const previousExplicitDefaultValue = this.userDefaults.get()?.[controller.id]?.[profile.profileId];
        const extended = {
            ...profile,
            isDefault: previousExplicitDefaultValue ?? profile.isDefault,
            wasInitiallyDefault: profile.isDefault,
        };
        let record = this.controllerProfiles.get(profile.controllerId);
        if (record) {
            record.profiles.push(extended);
            record.profiles.sort(sorter);
        }
        else {
            record = {
                profiles: [extended],
                controller,
            };
            this.controllerProfiles.set(profile.controllerId, record);
        }
        this.refreshContextKeys();
        this.changeEmitter.fire();
    }
    /** @inheritdoc */
    updateProfile(controllerId, profileId, update) {
        const ctrl = this.controllerProfiles.get(controllerId);
        if (!ctrl) {
            return;
        }
        const profile = ctrl.profiles.find(c => c.controllerId === controllerId && c.profileId === profileId);
        if (!profile) {
            return;
        }
        Object.assign(profile, update);
        ctrl.profiles.sort(sorter);
        // store updates is isDefault as if the user changed it (which they might
        // have through some extension-contributed UI)
        if (update.isDefault !== undefined) {
            const map = deepClone(this.userDefaults.get({}));
            setIsDefault(map, profile, update.isDefault);
            this.userDefaults.store(map);
        }
        this.changeEmitter.fire();
    }
    /** @inheritdoc */
    configure(controllerId, profileId) {
        this.controllerProfiles.get(controllerId)?.controller.configureRunProfile(profileId);
    }
    /** @inheritdoc */
    removeProfile(controllerId, profileId) {
        const ctrl = this.controllerProfiles.get(controllerId);
        if (!ctrl) {
            return;
        }
        if (!profileId) {
            this.controllerProfiles.delete(controllerId);
            this.changeEmitter.fire();
            return;
        }
        const index = ctrl.profiles.findIndex(c => c.profileId === profileId);
        if (index === -1) {
            return;
        }
        ctrl.profiles.splice(index, 1);
        this.refreshContextKeys();
        this.changeEmitter.fire();
    }
    /** @inheritdoc */
    capabilitiesForTest(test) {
        const ctrl = this.controllerProfiles.get(TestId.root(test.extId));
        if (!ctrl) {
            return 0;
        }
        let capabilities = 0;
        for (const profile of ctrl.profiles) {
            if (!profile.tag || test.tags.includes(profile.tag)) {
                capabilities |= capabilities & profile.group ? 16 /* TestRunProfileBitset.HasNonDefaultProfile */ : profile.group;
            }
        }
        return capabilities;
    }
    /** @inheritdoc */
    all() {
        return this.controllerProfiles.values();
    }
    /** @inheritdoc */
    getControllerProfiles(profileId) {
        return this.controllerProfiles.get(profileId)?.profiles ?? [];
    }
    /** @inheritdoc */
    getGroupDefaultProfiles(group, controllerId) {
        const allProfiles = controllerId
            ? (this.controllerProfiles.get(controllerId)?.profiles || [])
            : [...Iterable.flatMap(this.controllerProfiles.values(), c => c.profiles)];
        const defaults = allProfiles.filter(c => c.group === group && c.isDefault);
        // have *some* default profile to run if none are set otherwise
        if (defaults.length === 0) {
            const first = allProfiles.find(p => p.group === group);
            if (first) {
                defaults.push(first);
            }
        }
        return defaults;
    }
    /** @inheritdoc */
    setGroupDefaultProfiles(group, profiles) {
        const next = {};
        for (const ctrl of this.controllerProfiles.values()) {
            next[ctrl.controller.id] = {};
            for (const profile of ctrl.profiles) {
                if (profile.group !== group) {
                    continue;
                }
                setIsDefault(next, profile, profiles.some(p => p.profileId === profile.profileId));
            }
            // When switching a profile, if the controller has a same-named profile in
            // other groups, update those to match the enablement state as well.
            for (const profile of ctrl.profiles) {
                if (profile.group === group) {
                    continue;
                }
                const matching = ctrl.profiles.find(p => p.group === group && p.label === profile.label);
                if (matching) {
                    setIsDefault(next, profile, matching.isDefault);
                }
            }
            ctrl.profiles.sort(sorter);
        }
        this.userDefaults.store(next);
        this.changeEmitter.fire();
    }
    getDefaultProfileForTest(group, test) {
        return this.getControllerProfiles(test.controllerId).find(p => (p.group & group) !== 0 && canUseProfileWithTest(p, test));
    }
    refreshContextKeys() {
        let allCapabilities = 0;
        for (const { profiles } of this.controllerProfiles.values()) {
            for (const profile of profiles) {
                allCapabilities |= allCapabilities & profile.group ? 16 /* TestRunProfileBitset.HasNonDefaultProfile */ : profile.group;
                allCapabilities |= profile.supportsContinuousRun ? 64 /* TestRunProfileBitset.SupportsContinuousRun */ : 0;
            }
        }
        for (const group of testRunProfileBitsetList) {
            this.capabilitiesContexts[group].set((allCapabilities & group) !== 0);
        }
    }
};
TestProfileService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IStorageService)
], TestProfileService);
export { TestProfileService };
const setIsDefault = (map, profile, isDefault) => {
    profile.isDefault = isDefault;
    map[profile.controllerId] ??= {};
    if (profile.isDefault !== profile.wasInitiallyDefault) {
        map[profile.controllerId][profile.profileId] = profile.isDefault;
    }
    else {
        delete map[profile.controllerId][profile.profileId];
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFByb2ZpbGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RQcm9maWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFckMsT0FBTyxFQUFzRSx3QkFBd0IsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzlILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTdELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQW1FOUY7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLE9BQXdCLEVBQUUsSUFBc0IsRUFBRSxFQUFFLENBQ3pGLE9BQU8sQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDLFlBQVks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