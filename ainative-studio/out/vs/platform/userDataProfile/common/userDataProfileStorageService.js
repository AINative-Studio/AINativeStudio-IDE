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
import { Disposable, DisposableMap, MutableDisposable, isDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { Storage } from '../../../base/parts/storage/common/storage.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { AbstractStorageService, IStorageService, isProfileUsingDefaultStorage } from '../../storage/common/storage.js';
import { Emitter } from '../../../base/common/event.js';
import { ApplicationStorageDatabaseClient, ProfileStorageDatabaseClient } from '../../storage/common/storageIpc.js';
import { reviveProfile } from './userDataProfile.js';
export const IUserDataProfileStorageService = createDecorator('IUserDataProfileStorageService');
let AbstractUserDataProfileStorageService = class AbstractUserDataProfileStorageService extends Disposable {
    constructor(persistStorages, storageService) {
        super();
        this.storageService = storageService;
        if (persistStorages) {
            this.storageServicesMap = this._register(new DisposableMap());
        }
    }
    async readStorageData(profile) {
        return this.withProfileScopedStorageService(profile, async (storageService) => this.getItems(storageService));
    }
    async updateStorageData(profile, data, target) {
        return this.withProfileScopedStorageService(profile, async (storageService) => this.writeItems(storageService, data, target));
    }
    async withProfileScopedStorageService(profile, fn) {
        if (this.storageService.hasScope(profile)) {
            return fn(this.storageService);
        }
        let storageService = this.storageServicesMap?.get(profile.id);
        if (!storageService) {
            storageService = new StorageService(this.createStorageDatabase(profile));
            this.storageServicesMap?.set(profile.id, storageService);
            try {
                await storageService.initialize();
            }
            catch (error) {
                if (this.storageServicesMap?.has(profile.id)) {
                    this.storageServicesMap.deleteAndDispose(profile.id);
                }
                else {
                    storageService.dispose();
                }
                throw error;
            }
        }
        try {
            const result = await fn(storageService);
            await storageService.flush();
            return result;
        }
        finally {
            if (!this.storageServicesMap?.has(profile.id)) {
                storageService.dispose();
            }
        }
    }
    getItems(storageService) {
        const result = new Map();
        const populate = (target) => {
            for (const key of storageService.keys(0 /* StorageScope.PROFILE */, target)) {
                result.set(key, { value: storageService.get(key, 0 /* StorageScope.PROFILE */), target });
            }
        };
        populate(0 /* StorageTarget.USER */);
        populate(1 /* StorageTarget.MACHINE */);
        return result;
    }
    writeItems(storageService, items, target) {
        storageService.storeAll(Array.from(items.entries()).map(([key, value]) => ({ key, value, scope: 0 /* StorageScope.PROFILE */, target })), true);
    }
};
AbstractUserDataProfileStorageService = __decorate([
    __param(1, IStorageService)
], AbstractUserDataProfileStorageService);
export { AbstractUserDataProfileStorageService };
export class RemoteUserDataProfileStorageService extends AbstractUserDataProfileStorageService {
    constructor(persistStorages, remoteService, userDataProfilesService, storageService, logService) {
        super(persistStorages, storageService);
        this.remoteService = remoteService;
        const channel = remoteService.getChannel('profileStorageListener');
        const disposable = this._register(new MutableDisposable());
        this._onDidChange = this._register(new Emitter({
            // Start listening to profile storage changes only when someone is listening
            onWillAddFirstListener: () => {
                disposable.value = channel.listen('onDidChange')(e => {
                    logService.trace('profile storage changes', e);
                    this._onDidChange.fire({
                        targetChanges: e.targetChanges.map(profile => reviveProfile(profile, userDataProfilesService.profilesHome.scheme)),
                        valueChanges: e.valueChanges.map(e => ({ ...e, profile: reviveProfile(e.profile, userDataProfilesService.profilesHome.scheme) }))
                    });
                });
            },
            // Stop listening to profile storage changes when no one is listening
            onDidRemoveLastListener: () => disposable.value = undefined
        }));
        this.onDidChange = this._onDidChange.event;
    }
    async createStorageDatabase(profile) {
        const storageChannel = this.remoteService.getChannel('storage');
        return isProfileUsingDefaultStorage(profile) ? new ApplicationStorageDatabaseClient(storageChannel) : new ProfileStorageDatabaseClient(storageChannel, profile);
    }
}
class StorageService extends AbstractStorageService {
    constructor(profileStorageDatabase) {
        super({ flushInterval: 100 });
        this.profileStorageDatabase = profileStorageDatabase;
    }
    async doInitialize() {
        const profileStorageDatabase = await this.profileStorageDatabase;
        const profileStorage = new Storage(profileStorageDatabase);
        this._register(profileStorage.onDidChangeStorage(e => {
            this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e);
        }));
        this._register(toDisposable(() => {
            profileStorage.close();
            profileStorage.dispose();
            if (isDisposable(profileStorageDatabase)) {
                profileStorageDatabase.dispose();
            }
        }));
        this.profileStorage = profileStorage;
        return this.profileStorage.init();
    }
    getStorage(scope) {
        return scope === 0 /* StorageScope.PROFILE */ ? this.profileStorage : undefined;
    }
    getLogDetails() { return undefined; }
    async switchToProfile() { }
    async switchToWorkspace() { }
    hasScope() { return false; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL2NvbW1vbi91c2VyRGF0YVByb2ZpbGVTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0gsT0FBTyxFQUE4QixPQUFPLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBeUQsNEJBQTRCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvSyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFHL0QsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDcEgsT0FBTyxFQUE4QyxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQWlCakcsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsZUFBZSxDQUFpQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBNkJ6SCxJQUFlLHFDQUFxQyxHQUFwRCxNQUFlLHFDQUFzQyxTQUFRLFVBQVU7SUFRN0UsWUFDQyxlQUF3QixFQUNZLGNBQStCO1FBRW5FLEtBQUssRUFBRSxDQUFDO1FBRjRCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUduRSxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsU0FB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