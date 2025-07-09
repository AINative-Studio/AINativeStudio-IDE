/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { loadKeyTargets, TARGET_KEY } from '../../storage/common/storage.js';
export class ProfileStorageChangesListenerChannel extends Disposable {
    constructor(storageMainService, userDataProfilesService, logService) {
        super();
        this.storageMainService = storageMainService;
        this.userDataProfilesService = userDataProfilesService;
        this.logService = logService;
        const disposable = this._register(new MutableDisposable());
        this._onDidChange = this._register(new Emitter({
            // Start listening to profile storage changes only when someone is listening
            onWillAddFirstListener: () => disposable.value = this.registerStorageChangeListeners(),
            // Stop listening to profile storage changes when no one is listening
            onDidRemoveLastListener: () => disposable.value = undefined
        }));
    }
    registerStorageChangeListeners() {
        this.logService.debug('ProfileStorageChangesListenerChannel#registerStorageChangeListeners');
        const disposables = new DisposableStore();
        disposables.add(Event.debounce(this.storageMainService.applicationStorage.onDidChangeStorage, (keys, e) => {
            if (keys) {
                keys.push(e.key);
            }
            else {
                keys = [e.key];
            }
            return keys;
        }, 100)(keys => this.onDidChangeApplicationStorage(keys)));
        disposables.add(Event.debounce(this.storageMainService.onDidChangeProfileStorage, (changes, e) => {
            if (!changes) {
                changes = new Map();
            }
            let profileChanges = changes.get(e.profile.id);
            if (!profileChanges) {
                changes.set(e.profile.id, profileChanges = { profile: e.profile, keys: [], storage: e.storage });
            }
            profileChanges.keys.push(e.key);
            return changes;
        }, 100)(keys => this.onDidChangeProfileStorage(keys)));
        return disposables;
    }
    onDidChangeApplicationStorage(keys) {
        const targetChangedProfiles = keys.includes(TARGET_KEY) ? [this.userDataProfilesService.defaultProfile] : [];
        const profileStorageValueChanges = [];
        keys = keys.filter(key => key !== TARGET_KEY);
        if (keys.length) {
            const keyTargets = loadKeyTargets(this.storageMainService.applicationStorage.storage);
            profileStorageValueChanges.push({ profile: this.userDataProfilesService.defaultProfile, changes: keys.map(key => ({ key, scope: 0 /* StorageScope.PROFILE */, target: keyTargets[key] })) });
        }
        this.triggerEvents(targetChangedProfiles, profileStorageValueChanges);
    }
    onDidChangeProfileStorage(changes) {
        const targetChangedProfiles = [];
        const profileStorageValueChanges = new Map();
        for (const [profileId, profileChanges] of changes.entries()) {
            if (profileChanges.keys.includes(TARGET_KEY)) {
                targetChangedProfiles.push(profileChanges.profile);
            }
            const keys = profileChanges.keys.filter(key => key !== TARGET_KEY);
            if (keys.length) {
                const keyTargets = loadKeyTargets(profileChanges.storage.storage);
                profileStorageValueChanges.set(profileId, { profile: profileChanges.profile, changes: keys.map(key => ({ key, scope: 0 /* StorageScope.PROFILE */, target: keyTargets[key] })) });
            }
        }
        this.triggerEvents(targetChangedProfiles, [...profileStorageValueChanges.values()]);
    }
    triggerEvents(targetChanges, valueChanges) {
        if (targetChanges.length || valueChanges.length) {
            this._onDidChange.fire({ valueChanges, targetChanges });
        }
    }
    listen(_, event, arg) {
        switch (event) {
            case 'onDidChange': return this._onDidChange.event;
        }
        throw new Error(`[ProfileStorageChangesListenerChannel] Event not found: ${event}`);
    }
    async call(_, command) {
        throw new Error(`Call not found: ${command}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvZWxlY3Ryb24tbWFpbi91c2VyRGF0YVByb2ZpbGVTdG9yYWdlSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUloSCxPQUFPLEVBQUUsY0FBYyxFQUFnQixVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQU0zRixNQUFNLE9BQU8sb0NBQXFDLFNBQVEsVUFBVTtJQUluRSxZQUNrQixrQkFBdUMsRUFDdkMsdUJBQWlELEVBQ2pELFVBQXVCO1FBRXhDLEtBQUssRUFBRSxDQUFDO1FBSlMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN2Qyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ2pELGVBQVUsR0FBVixVQUFVLENBQWE7UUFHeEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFlLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQzdDO1lBQ0MsNEVBQTRFO1lBQzVFLHNCQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixFQUFFO1lBQ3RGLHFFQUFxRTtZQUNyRSx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLFNBQVM7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