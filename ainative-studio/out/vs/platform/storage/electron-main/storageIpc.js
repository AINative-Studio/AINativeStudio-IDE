/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { reviveIdentifier } from '../../workspace/common/workspace.js';
export class StorageDatabaseChannel extends Disposable {
    static { this.STORAGE_CHANGE_DEBOUNCE_TIME = 100; }
    constructor(logService, storageMainService) {
        super();
        this.logService = logService;
        this.storageMainService = storageMainService;
        this.onDidChangeApplicationStorageEmitter = this._register(new Emitter());
        this.mapProfileToOnDidChangeProfileStorageEmitter = new Map();
        this.registerStorageChangeListeners(storageMainService.applicationStorage, this.onDidChangeApplicationStorageEmitter);
    }
    //#region Storage Change Events
    registerStorageChangeListeners(storage, emitter) {
        // Listen for changes in provided storage to send to listeners
        // that are listening. Use a debouncer to reduce IPC traffic.
        this._register(Event.debounce(storage.onDidChangeStorage, (prev, cur) => {
            if (!prev) {
                prev = [cur];
            }
            else {
                prev.push(cur);
            }
            return prev;
        }, StorageDatabaseChannel.STORAGE_CHANGE_DEBOUNCE_TIME)(events => {
            if (events.length) {
                emitter.fire(this.serializeStorageChangeEvents(events, storage));
            }
        }));
    }
    serializeStorageChangeEvents(events, storage) {
        const changed = new Map();
        const deleted = new Set();
        events.forEach(event => {
            const existing = storage.get(event.key);
            if (typeof existing === 'string') {
                changed.set(event.key, existing);
            }
            else {
                deleted.add(event.key);
            }
        });
        return {
            changed: Array.from(changed.entries()),
            deleted: Array.from(deleted.values())
        };
    }
    listen(_, event, arg) {
        switch (event) {
            case 'onDidChangeStorage': {
                const profile = arg.profile ? revive(arg.profile) : undefined;
                // Without profile: application scope
                if (!profile) {
                    return this.onDidChangeApplicationStorageEmitter.event;
                }
                // With profile: profile scope for the profile
                let profileStorageChangeEmitter = this.mapProfileToOnDidChangeProfileStorageEmitter.get(profile.id);
                if (!profileStorageChangeEmitter) {
                    profileStorageChangeEmitter = this._register(new Emitter());
                    this.registerStorageChangeListeners(this.storageMainService.profileStorage(profile), profileStorageChangeEmitter);
                    this.mapProfileToOnDidChangeProfileStorageEmitter.set(profile.id, profileStorageChangeEmitter);
                }
                return profileStorageChangeEmitter.event;
            }
        }
        throw new Error(`Event not found: ${event}`);
    }
    //#endregion
    async call(_, command, arg) {
        const profile = arg.profile ? revive(arg.profile) : undefined;
        const workspace = reviveIdentifier(arg.workspace);
        // Get storage to be ready
        const storage = await this.withStorageInitialized(profile, workspace);
        // handle call
        switch (command) {
            case 'getItems': {
                return Array.from(storage.items.entries());
            }
            case 'updateItems': {
                const items = arg;
                if (items.insert) {
                    for (const [key, value] of items.insert) {
                        storage.set(key, value);
                    }
                }
                items.delete?.forEach(key => storage.delete(key));
                break;
            }
            case 'optimize': {
                return storage.optimize();
            }
            case 'isUsed': {
                const path = arg.payload;
                if (typeof path === 'string') {
                    return this.storageMainService.isUsed(path);
                }
            }
            default:
                throw new Error(`Call not found: ${command}`);
        }
    }
    async withStorageInitialized(profile, workspace) {
        let storage;
        if (workspace) {
            storage = this.storageMainService.workspaceStorage(workspace);
        }
        else if (profile) {
            storage = this.storageMainService.profileStorage(profile);
        }
        else {
            storage = this.storageMainService.applicationStorage;
        }
        try {
            await storage.init();
        }
        catch (error) {
            this.logService.error(`StorageIPC#init: Unable to init ${workspace ? 'workspace' : profile ? 'profile' : 'application'} storage due to ${error}`);
        }
        return storage;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdG9yYWdlL2VsZWN0cm9uLW1haW4vc3RvcmFnZUlwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFPN0QsT0FBTyxFQUFFLGdCQUFnQixFQUEyQixNQUFNLHFDQUFxQyxDQUFDO0FBRWhHLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO2FBRTdCLGlDQUE0QixHQUFHLEdBQUcsQUFBTixDQUFPO0lBTTNELFlBQ2tCLFVBQXVCLEVBQ3ZCLGtCQUF1QztRQUV4RCxLQUFLLEVBQUUsQ0FBQztRQUhTLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDdkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQU54Qyx5Q0FBb0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFpQyxDQUFDLENBQUM7UUFFcEcsaURBQTRDLEdBQUcsSUFBSSxHQUFHLEVBQW1FLENBQUM7UUFRMUksSUFBSSxDQUFDLDhCQUE4QixDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBQ3ZILENBQUM7SUFFRCwrQkFBK0I7SUFFdkIsOEJBQThCLENBQUMsT0FBcUIsRUFBRSxPQUErQztRQUU1Ryw4REFBOEQ7UUFDOUQsNkRBQTZEO1FBRTdELElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsa0JB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