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
var BrowserStorageService_1;
import { BroadcastDataChannel } from '../../../../base/browser/broadcast.js';
import { isSafari } from '../../../../base/browser/browser.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { IndexedDB } from '../../../../base/browser/indexedDB.js';
import { DeferredPromise, Promises } from '../../../../base/common/async.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { InMemoryStorageDatabase, isStorageItemsChangeEvent, Storage } from '../../../../base/parts/storage/common/storage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractStorageService, isProfileUsingDefaultStorage, IS_NEW_KEY } from '../../../../platform/storage/common/storage.js';
import { isUserDataProfile } from '../../../../platform/userDataProfile/common/userDataProfile.js';
let BrowserStorageService = class BrowserStorageService extends AbstractStorageService {
    static { BrowserStorageService_1 = this; }
    static { this.BROWSER_DEFAULT_FLUSH_INTERVAL = 5 * 1000; } // every 5s because async operations are not permitted on shutdown
    get hasPendingUpdate() {
        return Boolean(this.applicationStorageDatabase?.hasPendingUpdate ||
            this.profileStorageDatabase?.hasPendingUpdate ||
            this.workspaceStorageDatabase?.hasPendingUpdate);
    }
    constructor(workspace, userDataProfileService, logService) {
        super({ flushInterval: BrowserStorageService_1.BROWSER_DEFAULT_FLUSH_INTERVAL });
        this.workspace = workspace;
        this.userDataProfileService = userDataProfileService;
        this.logService = logService;
        this.applicationStoragePromise = new DeferredPromise();
        this.profileStorageDisposables = this._register(new DisposableStore());
        this.profileStorageProfile = this.userDataProfileService.currentProfile;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(e => e.join(this.switchToProfile(e.profile))));
    }
    async doInitialize() {
        // Init storages
        await Promises.settled([
            this.createApplicationStorage(),
            this.createProfileStorage(this.profileStorageProfile),
            this.createWorkspaceStorage()
        ]);
    }
    async createApplicationStorage() {
        const applicationStorageIndexedDB = await IndexedDBStorageDatabase.createApplicationStorage(this.logService);
        this.applicationStorageDatabase = this._register(applicationStorageIndexedDB);
        this.applicationStorage = this._register(new Storage(this.applicationStorageDatabase));
        this._register(this.applicationStorage.onDidChangeStorage(e => this.emitDidChangeValue(-1 /* StorageScope.APPLICATION */, e)));
        await this.applicationStorage.init();
        this.updateIsNew(this.applicationStorage);
        this.applicationStoragePromise.complete({ indexedDb: applicationStorageIndexedDB, storage: this.applicationStorage });
    }
    async createProfileStorage(profile) {
        // First clear any previously associated disposables
        this.profileStorageDisposables.clear();
        // Remember profile associated to profile storage
        this.profileStorageProfile = profile;
        if (isProfileUsingDefaultStorage(this.profileStorageProfile)) {
            // If we are using default profile storage, the profile storage is
            // actually the same as application storage. As such we
            // avoid creating the storage library a second time on
            // the same DB.
            const { indexedDb: applicationStorageIndexedDB, storage: applicationStorage } = await this.applicationStoragePromise.p;
            this.profileStorageDatabase = applicationStorageIndexedDB;
            this.profileStorage = applicationStorage;
            this.profileStorageDisposables.add(this.profileStorage.onDidChangeStorage(e => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
        }
        else {
            const profileStorageIndexedDB = await IndexedDBStorageDatabase.createProfileStorage(this.profileStorageProfile, this.logService);
            this.profileStorageDatabase = this.profileStorageDisposables.add(profileStorageIndexedDB);
            this.profileStorage = this.profileStorageDisposables.add(new Storage(this.profileStorageDatabase));
            this.profileStorageDisposables.add(this.profileStorage.onDidChangeStorage(e => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
            await this.profileStorage.init();
            this.updateIsNew(this.profileStorage);
        }
    }
    async createWorkspaceStorage() {
        const workspaceStorageIndexedDB = await IndexedDBStorageDatabase.createWorkspaceStorage(this.workspace.id, this.logService);
        this.workspaceStorageDatabase = this._register(workspaceStorageIndexedDB);
        this.workspaceStorage = this._register(new Storage(this.workspaceStorageDatabase));
        this._register(this.workspaceStorage.onDidChangeStorage(e => this.emitDidChangeValue(1 /* StorageScope.WORKSPACE */, e)));
        await this.workspaceStorage.init();
        this.updateIsNew(this.workspaceStorage);
    }
    updateIsNew(storage) {
        const firstOpen = storage.getBoolean(IS_NEW_KEY);
        if (firstOpen === undefined) {
            storage.set(IS_NEW_KEY, true);
        }
        else if (firstOpen) {
            storage.set(IS_NEW_KEY, false);
        }
    }
    getStorage(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorage;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorage;
            default:
                return this.workspaceStorage;
        }
    }
    getLogDetails(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorageDatabase?.name;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorageDatabase?.name;
            default:
                return this.workspaceStorageDatabase?.name;
        }
    }
    async switchToProfile(toProfile) {
        if (!this.canSwitchProfile(this.profileStorageProfile, toProfile)) {
            return;
        }
        const oldProfileStorage = assertIsDefined(this.profileStorage);
        const oldItems = oldProfileStorage.items;
        // Close old profile storage but only if this is
        // different from application storage!
        if (oldProfileStorage !== this.applicationStorage) {
            await oldProfileStorage.close();
        }
        // Create new profile storage & init
        await this.createProfileStorage(toProfile);
        // Handle data switch and eventing
        this.switchData(oldItems, assertIsDefined(this.profileStorage), 0 /* StorageScope.PROFILE */);
    }
    async switchToWorkspace(toWorkspace, preserveData) {
        throw new Error('Migrating storage is currently unsupported in Web');
    }
    shouldFlushWhenIdle() {
        // this flush() will potentially cause new state to be stored
        // since new state will only be created while the document
        // has focus, one optimization is to not run this when the
        // document has no focus, assuming that state has not changed
        //
        // another optimization is to not collect more state if we
        // have a pending update already running which indicates
        // that the connection is either slow or disconnected and
        // thus unhealthy.
        return getActiveWindow().document.hasFocus() && !this.hasPendingUpdate;
    }
    close() {
        // Safari: there is an issue where the page can hang on load when
        // a previous session has kept IndexedDB transactions running.
        // The only fix seems to be to cancel any pending transactions
        // (https://github.com/microsoft/vscode/issues/136295)
        //
        // On all other browsers, we keep the databases opened because
        // we expect data to be written when the unload happens.
        if (isSafari) {
            this.applicationStorage?.close();
            this.profileStorageDatabase?.close();
            this.workspaceStorageDatabase?.close();
        }
        // Always dispose to ensure that no timeouts or callbacks
        // get triggered in this phase.
        this.dispose();
    }
    async clear() {
        // Clear key/values
        for (const scope of [-1 /* StorageScope.APPLICATION */, 0 /* StorageScope.PROFILE */, 1 /* StorageScope.WORKSPACE */]) {
            for (const target of [0 /* StorageTarget.USER */, 1 /* StorageTarget.MACHINE */]) {
                for (const key of this.keys(scope, target)) {
                    this.remove(key, scope);
                }
            }
            await this.getStorage(scope)?.whenFlushed();
        }
        // Clear databases
        await Promises.settled([
            this.applicationStorageDatabase?.clear() ?? Promise.resolve(),
            this.profileStorageDatabase?.clear() ?? Promise.resolve(),
            this.workspaceStorageDatabase?.clear() ?? Promise.resolve()
        ]);
    }
    hasScope(scope) {
        if (isUserDataProfile(scope)) {
            return this.profileStorageProfile.id === scope.id;
        }
        return this.workspace.id === scope.id;
    }
};
BrowserStorageService = BrowserStorageService_1 = __decorate([
    __param(2, ILogService)
], BrowserStorageService);
export { BrowserStorageService };
class InMemoryIndexedDBStorageDatabase extends InMemoryStorageDatabase {
    constructor() {
        super(...arguments);
        this.hasPendingUpdate = false;
        this.name = 'in-memory-indexedb-storage';
    }
    async clear() {
        (await this.getItems()).clear();
    }
    dispose() {
        // No-op
    }
}
export class IndexedDBStorageDatabase extends Disposable {
    static async createApplicationStorage(logService) {
        return IndexedDBStorageDatabase.create({ id: 'global', broadcastChanges: true }, logService);
    }
    static async createProfileStorage(profile, logService) {
        return IndexedDBStorageDatabase.create({ id: `global-${profile.id}`, broadcastChanges: true }, logService);
    }
    static async createWorkspaceStorage(workspaceId, logService) {
        return IndexedDBStorageDatabase.create({ id: workspaceId }, logService);
    }
    static async create(options, logService) {
        try {
            const database = new IndexedDBStorageDatabase(options, logService);
            await database.whenConnected;
            return database;
        }
        catch (error) {
            logService.error(`[IndexedDB Storage ${options.id}] create(): ${toErrorMessage(error, true)}`);
            return new InMemoryIndexedDBStorageDatabase();
        }
    }
    static { this.STORAGE_DATABASE_PREFIX = 'vscode-web-state-db-'; }
    static { this.STORAGE_OBJECT_STORE = 'ItemTable'; }
    get hasPendingUpdate() { return !!this.pendingUpdate; }
    constructor(options, logService) {
        super();
        this.logService = logService;
        this._onDidChangeItemsExternal = this._register(new Emitter());
        this.onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;
        this.pendingUpdate = undefined;
        this.name = `${IndexedDBStorageDatabase.STORAGE_DATABASE_PREFIX}${options.id}`;
        this.broadcastChannel = options.broadcastChanges ? this._register(new BroadcastDataChannel(this.name)) : undefined;
        this.whenConnected = this.connect();
        this.registerListeners();
    }
    registerListeners() {
        // Check for storage change events from other
        // windows/tabs via `BroadcastChannel` mechanisms.
        if (this.broadcastChannel) {
            this._register(this.broadcastChannel.onDidReceiveData(data => {
                if (isStorageItemsChangeEvent(data)) {
                    this._onDidChangeItemsExternal.fire(data);
                }
            }));
        }
    }
    async connect() {
        try {
            return await IndexedDB.create(this.name, undefined, [IndexedDBStorageDatabase.STORAGE_OBJECT_STORE]);
        }
        catch (error) {
            this.logService.error(`[IndexedDB Storage ${this.name}] connect() error: ${toErrorMessage(error)}`);
            throw error;
        }
    }
    async getItems() {
        const db = await this.whenConnected;
        function isValid(value) {
            return typeof value === 'string';
        }
        return db.getKeyValues(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, isValid);
    }
    async updateItems(request) {
        // Run the update
        let didUpdate = false;
        this.pendingUpdate = this.doUpdateItems(request);
        try {
            didUpdate = await this.pendingUpdate;
        }
        finally {
            this.pendingUpdate = undefined;
        }
        // Broadcast changes to other windows/tabs if enabled
        // and only if we actually did update storage items.
        if (this.broadcastChannel && didUpdate) {
            const event = {
                changed: request.insert,
                deleted: request.delete
            };
            this.broadcastChannel.postData(event);
        }
    }
    async doUpdateItems(request) {
        // Return early if the request is empty
        const toInsert = request.insert;
        const toDelete = request.delete;
        if ((!toInsert && !toDelete) || (toInsert?.size === 0 && toDelete?.size === 0)) {
            return false;
        }
        const db = await this.whenConnected;
        // Update `ItemTable` with inserts and/or deletes
        await db.runInTransaction(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, 'readwrite', objectStore => {
            const requests = [];
            // Inserts
            if (toInsert) {
                for (const [key, value] of toInsert) {
                    requests.push(objectStore.put(value, key));
                }
            }
            // Deletes
            if (toDelete) {
                for (const key of toDelete) {
                    requests.push(objectStore.delete(key));
                }
            }
            return requests;
        });
        return true;
    }
    async optimize() {
        // not suported in IndexedDB
    }
    async close() {
        const db = await this.whenConnected;
        // Wait for pending updates to having finished
        await this.pendingUpdate;
        // Finally, close IndexedDB
        return db.close();
    }
    async clear() {
        const db = await this.whenConnected;
        await db.runInTransaction(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, 'readwrite', objectStore => objectStore.clear());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3N0b3JhZ2UvYnJvd3Nlci9zdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBd0UsT0FBTyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDck0sT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSw0QkFBNEIsRUFBRSxVQUFVLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDL0osT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLGdFQUFnRSxDQUFDO0FBSTlHLElBQU0scUJBQXFCLEdBQTNCLE1BQU0s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