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
import * as arrays from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { autorunIterableDelta } from '../../../../base/common/observableInternal/autorun.js';
import { WellDefinedPrefixTree } from '../../../../base/common/prefixTree.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { StoredValue } from './storedValue.js';
import { TestId } from './testId.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { ITestProfileService } from './testProfileService.js';
import { ITestService } from './testService.js';
export const ITestingContinuousRunService = createDecorator('testingContinuousRunService');
let TestingContinuousRunService = class TestingContinuousRunService extends Disposable {
    get lastRunProfileIds() {
        return this.lastRun.get(new Set());
    }
    constructor(testService, storageService, contextKeyService, testProfileService) {
        super();
        this.testService = testService;
        this.testProfileService = testProfileService;
        this.changeEmitter = new Emitter();
        this.running = new WellDefinedPrefixTree();
        this.onDidChange = this.changeEmitter.event;
        const isGloballyOn = TestingContextKeys.isContinuousModeOn.bindTo(contextKeyService);
        this._register(this.onDidChange(() => {
            isGloballyOn.set(!!this.running.root.value);
        }));
        this.lastRun = this._register(new StoredValue({
            key: 'lastContinuousRunProfileIds',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
            serialization: {
                deserialize: v => new Set(JSON.parse(v)),
                serialize: v => JSON.stringify([...v])
            },
        }, storageService));
        this._register(toDisposable(() => {
            for (const cts of this.running.values()) {
                cts.handle.dispose();
            }
        }));
    }
    /** @inheritdoc */
    isSpecificallyEnabledFor(testId) {
        return this.running.size > 0 && this.running.hasKey(TestId.fromString(testId).path);
    }
    /** @inheritdoc */
    isEnabledForAParentOf(testId) {
        return !!this.running.root.value || (this.running.size > 0 && this.running.hasKeyOrParent(TestId.fromString(testId).path));
    }
    /** @inheritdoc */
    isEnabledForProfile({ profileId, controllerId }) {
        for (const node of this.running.values()) {
            if (node.profiles.get().some(p => p.profileId === profileId && p.controllerId === controllerId)) {
                return true;
            }
        }
        return false;
    }
    /** @inheritdoc */
    isEnabledForAChildOf(testId) {
        return !!this.running.root.value || (this.running.size > 0 && this.running.hasKeyOrChildren(TestId.fromString(testId).path));
    }
    /** @inheritdoc */
    isEnabled() {
        return !!this.running.root.value || this.running.size > 0;
    }
    /** @inheritdoc */
    start(profiles, testId) {
        const store = new DisposableStore();
        let actualProfiles;
        if (profiles instanceof Array) {
            actualProfiles = observableValue('crProfiles', profiles);
        }
        else {
            // restart the continuous run when default profiles change, if we were
            // asked to run for a group
            const getRelevant = () => this.testProfileService.getGroupDefaultProfiles(profiles)
                .filter(p => p.supportsContinuousRun && (!testId || TestId.root(testId) === p.controllerId));
            actualProfiles = observableValue('crProfiles', getRelevant());
            store.add(this.testProfileService.onDidChange(() => {
                if (ref.autoSetDefault) {
                    const newRelevant = getRelevant();
                    if (!arrays.equals(newRelevant, actualProfiles.get())) {
                        actualProfiles.set(getRelevant(), undefined);
                    }
                }
            }));
        }
        const path = testId ? TestId.fromString(testId).path : [];
        const ref = { profiles: actualProfiles, handle: store, path, autoSetDefault: typeof profiles === 'number' };
        // If we're already running this specific test, then add the profile and turn
        // off the auto-addition of bitset-based profiles.
        const existing = this.running.find(path);
        if (existing) {
            store.dispose();
            ref.autoSetDefault = existing.autoSetDefault = false;
            existing.profiles.set([...new Set([...actualProfiles.get(), ...existing.profiles.get()])], undefined);
            this.changeEmitter.fire(testId);
            return;
        }
        this.running.insert(path, ref);
        const cancellationStores = new DisposableMap();
        store.add(toDisposable(() => {
            for (const cts of cancellationStores.values()) {
                cts.cancel();
            }
            cancellationStores.dispose();
        }));
        store.add(autorunIterableDelta(reader => actualProfiles.read(reader), ({ addedValues, removedValues }) => {
            for (const profile of addedValues) {
                const cts = new CancellationTokenSource();
                this.testService.startContinuousRun({
                    continuous: true,
                    group: profile.group,
                    targets: [{
                            testIds: [testId ?? profile.controllerId],
                            controllerId: profile.controllerId,
                            profileId: profile.profileId
                        }],
                }, cts.token);
                cancellationStores.set(profile, cts);
            }
            for (const profile of removedValues) {
                cancellationStores.get(profile)?.cancel();
                cancellationStores.deleteAndDispose(profile);
            }
            this.lastRun.store(new Set([...cancellationStores.keys()].map(p => p.profileId)));
        }));
        this.changeEmitter.fire(testId);
    }
    /** Stops a continuous run for the profile across all test items that are running it. */
    stopProfile({ profileId, controllerId }) {
        const toDelete = [];
        for (const node of this.running.values()) {
            const profs = node.profiles.get();
            const filtered = profs.filter(p => p.profileId !== profileId || p.controllerId !== controllerId);
            if (filtered.length === profs.length) {
                continue;
            }
            else if (filtered.length === 0) {
                toDelete.push(node);
            }
            else {
                node.profiles.set(filtered, undefined);
            }
        }
        for (let i = toDelete.length - 1; i >= 0; i--) {
            toDelete[i].handle.dispose();
            this.running.delete(toDelete[i].path);
        }
        this.changeEmitter.fire(undefined);
    }
    /** @inheritdoc */
    stop(testId) {
        const cancellations = [...this.running.deleteRecursive(testId ? TestId.fromString(testId).path : [])];
        // deleteRecursive returns a BFS order, reverse it so children are cancelled before parents
        for (let i = cancellations.length - 1; i >= 0; i--) {
            cancellations[i].handle.dispose();
        }
        this.changeEmitter.fire(testId);
    }
};
TestingContinuousRunService = __decorate([
    __param(0, ITestService),
    __param(1, IStorageService),
    __param(2, IContextKeyService),
    __param(3, ITestProfileService)
], TestingContinuousRunService);
export { TestingContinuousRunService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRpbnVvdXNSdW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdGluZ0NvbnRpbnVvdXNSdW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSCxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FB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