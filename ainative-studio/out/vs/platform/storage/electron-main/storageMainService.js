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
import { URI } from '../../../base/common/uri.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { AbstractStorageService, isProfileUsingDefaultStorage } from '../common/storage.js';
import { ApplicationStorageMain, ProfileStorageMain, InMemoryStorageMain, WorkspaceStorageMain } from './storageMain.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { Schemas } from '../../../base/common/network.js';
//#region Storage Main Service (intent: make application, profile and workspace storage accessible to windows from main process)
export const IStorageMainService = createDecorator('storageMainService');
let StorageMainService = class StorageMainService extends Disposable {
    constructor(logService, environmentService, userDataProfilesService, lifecycleMainService, fileService, uriIdentityService) {
        super();
        this.logService = logService;
        this.environmentService = environmentService;
        this.userDataProfilesService = userDataProfilesService;
        this.lifecycleMainService = lifecycleMainService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.shutdownReason = undefined;
        this._onDidChangeProfileStorage = this._register(new Emitter());
        this.onDidChangeProfileStorage = this._onDidChangeProfileStorage.event;
        //#endregion
        //#region Profile Storage
        this.mapProfileToStorage = new Map();
        //#endregion
        //#region Workspace Storage
        this.mapWorkspaceToStorage = new Map();
        this.applicationStorage = this._register(this.createApplicationStorage());
        this.registerListeners();
    }
    getStorageOptions() {
        return {
            useInMemoryStorage: !!this.environmentService.extensionTestsLocationURI // no storage during extension tests!
        };
    }
    registerListeners() {
        // Application Storage: Warmup when any window opens
        (async () => {
            await this.lifecycleMainService.when(3 /* LifecycleMainPhase.AfterWindowOpen */);
            this.applicationStorage.init();
        })();
        this._register(this.lifecycleMainService.onWillLoadWindow(e => {
            // Profile Storage: Warmup when related window with profile loads
            if (e.window.profile) {
                this.profileStorage(e.window.profile).init();
            }
            // Workspace Storage: Warmup when related window with workspace loads
            if (e.workspace) {
                this.workspaceStorage(e.workspace).init();
            }
        }));
        // All Storage: Close when shutting down
        this._register(this.lifecycleMainService.onWillShutdown(e => {
            this.logService.trace('storageMainService#onWillShutdown()');
            // Remember shutdown reason
            this.shutdownReason = e.reason;
            // Application Storage
            e.join('applicationStorage', this.applicationStorage.close());
            // Profile Storage(s)
            for (const [, profileStorage] of this.mapProfileToStorage) {
                e.join('profileStorage', profileStorage.close());
            }
            // Workspace Storage(s)
            for (const [, workspaceStorage] of this.mapWorkspaceToStorage) {
                e.join('workspaceStorage', workspaceStorage.close());
            }
        }));
        // Prepare storage location as needed
        this._register(this.userDataProfilesService.onWillCreateProfile(e => {
            e.join((async () => {
                if (!(await this.fileService.exists(e.profile.globalStorageHome))) {
                    await this.fileService.createFolder(e.profile.globalStorageHome);
                }
            })());
        }));
        // Close the storage of the profile that is being removed
        this._register(this.userDataProfilesService.onWillRemoveProfile(e => {
            const storage = this.mapProfileToStorage.get(e.profile.id);
            if (storage) {
                e.join(storage.close());
            }
        }));
    }
    createApplicationStorage() {
        this.logService.trace(`StorageMainService: creating application storage`);
        const applicationStorage = new ApplicationStorageMain(this.getStorageOptions(), this.userDataProfilesService, this.logService, this.fileService);
        this._register(Event.once(applicationStorage.onDidCloseStorage)(() => {
            this.logService.trace(`StorageMainService: closed application storage`);
        }));
        return applicationStorage;
    }
    profileStorage(profile) {
        if (isProfileUsingDefaultStorage(profile)) {
            return this.applicationStorage; // for profiles using default storage, use application storage
        }
        let profileStorage = this.mapProfileToStorage.get(profile.id);
        if (!profileStorage) {
            this.logService.trace(`StorageMainService: creating profile storage (${profile.name})`);
            profileStorage = this._register(this.createProfileStorage(profile));
            this.mapProfileToStorage.set(profile.id, profileStorage);
            const listener = this._register(profileStorage.onDidChangeStorage(e => this._onDidChangeProfileStorage.fire({
                ...e,
                storage: profileStorage,
                profile
            })));
            this._register(Event.once(profileStorage.onDidCloseStorage)(() => {
                this.logService.trace(`StorageMainService: closed profile storage (${profile.name})`);
                this.mapProfileToStorage.delete(profile.id);
                listener.dispose();
            }));
        }
        return profileStorage;
    }
    createProfileStorage(profile) {
        if (this.shutdownReason === 2 /* ShutdownReason.KILL */) {
            // Workaround for native crashes that we see when
            // SQLite DBs are being created even after shutdown
            // https://github.com/microsoft/vscode/issues/143186
            return new InMemoryStorageMain(this.logService, this.fileService);
        }
        return new ProfileStorageMain(profile, this.getStorageOptions(), this.logService, this.fileService);
    }
    workspaceStorage(workspace) {
        let workspaceStorage = this.mapWorkspaceToStorage.get(workspace.id);
        if (!workspaceStorage) {
            this.logService.trace(`StorageMainService: creating workspace storage (${workspace.id})`);
            workspaceStorage = this._register(this.createWorkspaceStorage(workspace));
            this.mapWorkspaceToStorage.set(workspace.id, workspaceStorage);
            this._register(Event.once(workspaceStorage.onDidCloseStorage)(() => {
                this.logService.trace(`StorageMainService: closed workspace storage (${workspace.id})`);
                this.mapWorkspaceToStorage.delete(workspace.id);
            }));
        }
        return workspaceStorage;
    }
    createWorkspaceStorage(workspace) {
        if (this.shutdownReason === 2 /* ShutdownReason.KILL */) {
            // Workaround for native crashes that we see when
            // SQLite DBs are being created even after shutdown
            // https://github.com/microsoft/vscode/issues/143186
            return new InMemoryStorageMain(this.logService, this.fileService);
        }
        return new WorkspaceStorageMain(workspace, this.getStorageOptions(), this.logService, this.environmentService, this.fileService);
    }
    //#endregion
    isUsed(path) {
        const pathUri = URI.file(path);
        for (const storage of [this.applicationStorage, ...this.mapProfileToStorage.values(), ...this.mapWorkspaceToStorage.values()]) {
            if (!storage.path) {
                continue;
            }
            if (this.uriIdentityService.extUri.isEqualOrParent(URI.file(storage.path), pathUri)) {
                return true;
            }
        }
        return false;
    }
};
StorageMainService = __decorate([
    __param(0, ILogService),
    __param(1, IEnvironmentService),
    __param(2, IUserDataProfilesMainService),
    __param(3, ILifecycleMainService),
    __param(4, IFileService),
    __param(5, IUriIdentityService)
], StorageMainService);
export { StorageMainService };
//#endregion
//#region Application Main Storage Service (intent: use application storage from main process)
export const IApplicationStorageMainService = createDecorator('applicationStorageMainService');
let ApplicationStorageMainService = class ApplicationStorageMainService extends AbstractStorageService {
    constructor(userDataProfilesService, storageMainService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.storageMainService = storageMainService;
        this.whenReady = this.storageMainService.applicationStorage.whenInit;
    }
    doInitialize() {
        // application storage is being initialized as part
        // of the first window opening, so we do not trigger
        // it here but can join it
        return this.storageMainService.applicationStorage.whenInit;
    }
    getStorage(scope) {
        if (scope === -1 /* StorageScope.APPLICATION */) {
            return this.storageMainService.applicationStorage.storage;
        }
        return undefined; // any other scope is unsupported from main process
    }
    getLogDetails(scope) {
        if (scope === -1 /* StorageScope.APPLICATION */) {
            return this.userDataProfilesService.defaultProfile.globalStorageHome.with({ scheme: Schemas.file }).fsPath;
        }
        return undefined; // any other scope is unsupported from main process
    }
    shouldFlushWhenIdle() {
        return false; // not needed here, will be triggered from any window that is opened
    }
    switch() {
        throw new Error('Migrating storage is unsupported from main process');
    }
    switchToProfile() {
        throw new Error('Switching storage profile is unsupported from main process');
    }
    switchToWorkspace() {
        throw new Error('Switching storage workspace is unsupported from main process');
    }
    hasScope() {
        throw new Error('Main process is never profile or workspace scoped');
    }
};
ApplicationStorageMainService = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IStorageMainService)
], ApplicationStorageMainService);
export { ApplicationStorageMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvZWxlY3Ryb24tbWFpbi9zdG9yYWdlTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFzQyxNQUFNLHVEQUF1RCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsNEJBQTRCLEVBQWdELE1BQU0sc0JBQXNCLENBQUM7QUFDMUksT0FBTyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFxQyxvQkFBb0IsRUFBdUIsTUFBTSxrQkFBa0IsQ0FBQztBQUNqTCxPQUFPLEVBQW9CLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0csT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFB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