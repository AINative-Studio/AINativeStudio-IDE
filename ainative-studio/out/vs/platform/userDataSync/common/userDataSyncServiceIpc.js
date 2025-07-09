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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IUserDataProfilesService, reviveProfile } from '../../userDataProfile/common/userDataProfile.js';
import { UserDataSyncError } from './userDataSync.js';
function reviewSyncResource(syncResource, userDataProfilesService) {
    return { ...syncResource, profile: reviveProfile(syncResource.profile, userDataProfilesService.profilesHome.scheme) };
}
function reviewSyncResourceHandle(syncResourceHandle) {
    return { created: syncResourceHandle.created, uri: URI.revive(syncResourceHandle.uri) };
}
export class UserDataSyncServiceChannel {
    constructor(service, userDataProfilesService, logService) {
        this.service = service;
        this.userDataProfilesService = userDataProfilesService;
        this.logService = logService;
        this.manualSyncTasks = new Map();
        this.onManualSynchronizeResources = new Emitter();
    }
    listen(_, event) {
        switch (event) {
            // sync
            case 'onDidChangeStatus': return this.service.onDidChangeStatus;
            case 'onDidChangeConflicts': return this.service.onDidChangeConflicts;
            case 'onDidChangeLocal': return this.service.onDidChangeLocal;
            case 'onDidChangeLastSyncTime': return this.service.onDidChangeLastSyncTime;
            case 'onSyncErrors': return this.service.onSyncErrors;
            case 'onDidResetLocal': return this.service.onDidResetLocal;
            case 'onDidResetRemote': return this.service.onDidResetRemote;
            // manual sync
            case 'manualSync/onSynchronizeResources': return this.onManualSynchronizeResources.event;
        }
        throw new Error(`[UserDataSyncServiceChannel] Event not found: ${event}`);
    }
    async call(context, command, args) {
        try {
            const result = await this._call(context, command, args);
            return result;
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    async _call(context, command, args) {
        switch (command) {
            // sync
            case '_getInitialData': return Promise.resolve([this.service.status, this.service.conflicts, this.service.lastSyncTime]);
            case 'reset': return this.service.reset();
            case 'resetRemote': return this.service.resetRemote();
            case 'resetLocal': return this.service.resetLocal();
            case 'hasPreviouslySynced': return this.service.hasPreviouslySynced();
            case 'hasLocalData': return this.service.hasLocalData();
            case 'resolveContent': return this.service.resolveContent(URI.revive(args[0]));
            case 'accept': return this.service.accept(reviewSyncResource(args[0], this.userDataProfilesService), URI.revive(args[1]), args[2], args[3]);
            case 'replace': return this.service.replace(reviewSyncResourceHandle(args[0]));
            case 'cleanUpRemoteData': return this.service.cleanUpRemoteData();
            case 'getRemoteActivityData': return this.service.saveRemoteActivityData(URI.revive(args[0]));
            case 'extractActivityData': return this.service.extractActivityData(URI.revive(args[0]), URI.revive(args[1]));
            case 'createManualSyncTask': return this.createManualSyncTask();
        }
        // manual sync
        if (command.startsWith('manualSync/')) {
            const manualSyncTaskCommand = command.substring('manualSync/'.length);
            const manualSyncTaskId = args[0];
            const manualSyncTask = this.getManualSyncTask(manualSyncTaskId);
            args = args.slice(1);
            switch (manualSyncTaskCommand) {
                case 'merge': return manualSyncTask.merge();
                case 'apply': return manualSyncTask.apply().then(() => this.manualSyncTasks.delete(this.createKey(manualSyncTask.id)));
                case 'stop': return manualSyncTask.stop().finally(() => this.manualSyncTasks.delete(this.createKey(manualSyncTask.id)));
            }
        }
        throw new Error('Invalid call');
    }
    getManualSyncTask(manualSyncTaskId) {
        const manualSyncTask = this.manualSyncTasks.get(this.createKey(manualSyncTaskId));
        if (!manualSyncTask) {
            throw new Error(`Manual sync taks not found: ${manualSyncTaskId}`);
        }
        return manualSyncTask;
    }
    async createManualSyncTask() {
        const manualSyncTask = await this.service.createManualSyncTask();
        this.manualSyncTasks.set(this.createKey(manualSyncTask.id), manualSyncTask);
        return manualSyncTask.id;
    }
    createKey(manualSyncTaskId) { return `manualSyncTask-${manualSyncTaskId}`; }
}
let UserDataSyncServiceChannelClient = class UserDataSyncServiceChannelClient extends Disposable {
    get status() { return this._status; }
    get onDidChangeLocal() { return this.channel.listen('onDidChangeLocal'); }
    get conflicts() { return this._conflicts; }
    get lastSyncTime() { return this._lastSyncTime; }
    get onDidResetLocal() { return this.channel.listen('onDidResetLocal'); }
    get onDidResetRemote() { return this.channel.listen('onDidResetRemote'); }
    constructor(userDataSyncChannel, userDataProfilesService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this._status = "uninitialized" /* SyncStatus.Uninitialized */;
        this._onDidChangeStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._conflicts = [];
        this._onDidChangeConflicts = this._register(new Emitter());
        this.onDidChangeConflicts = this._onDidChangeConflicts.event;
        this._lastSyncTime = undefined;
        this._onDidChangeLastSyncTime = this._register(new Emitter());
        this.onDidChangeLastSyncTime = this._onDidChangeLastSyncTime.event;
        this._onSyncErrors = this._register(new Emitter());
        this.onSyncErrors = this._onSyncErrors.event;
        this.channel = {
            call(command, arg, cancellationToken) {
                return userDataSyncChannel.call(command, arg, cancellationToken)
                    .then(null, error => { throw UserDataSyncError.toUserDataSyncError(error); });
            },
            listen(event, arg) {
                return userDataSyncChannel.listen(event, arg);
            }
        };
        this.channel.call('_getInitialData').then(([status, conflicts, lastSyncTime]) => {
            this.updateStatus(status);
            this.updateConflicts(conflicts);
            if (lastSyncTime) {
                this.updateLastSyncTime(lastSyncTime);
            }
            this._register(this.channel.listen('onDidChangeStatus')(status => this.updateStatus(status)));
            this._register(this.channel.listen('onDidChangeLastSyncTime')(lastSyncTime => this.updateLastSyncTime(lastSyncTime)));
        });
        this._register(this.channel.listen('onDidChangeConflicts')(conflicts => this.updateConflicts(conflicts)));
        this._register(this.channel.listen('onSyncErrors')(errors => this._onSyncErrors.fire(errors.map(syncError => ({ ...syncError, error: UserDataSyncError.toUserDataSyncError(syncError.error) })))));
    }
    createSyncTask() {
        throw new Error('not supported');
    }
    async createManualSyncTask() {
        const id = await this.channel.call('createManualSyncTask');
        const that = this;
        const manualSyncTaskChannelClient = new ManualSyncTaskChannelClient(id, {
            async call(command, arg, cancellationToken) {
                return that.channel.call(`manualSync/${command}`, [id, ...(Array.isArray(arg) ? arg : [arg])], cancellationToken);
            },
            listen() {
                throw new Error('not supported');
            }
        });
        return manualSyncTaskChannelClient;
    }
    reset() {
        return this.channel.call('reset');
    }
    resetRemote() {
        return this.channel.call('resetRemote');
    }
    resetLocal() {
        return this.channel.call('resetLocal');
    }
    hasPreviouslySynced() {
        return this.channel.call('hasPreviouslySynced');
    }
    hasLocalData() {
        return this.channel.call('hasLocalData');
    }
    accept(syncResource, resource, content, apply) {
        return this.channel.call('accept', [syncResource, resource, content, apply]);
    }
    resolveContent(resource) {
        return this.channel.call('resolveContent', [resource]);
    }
    cleanUpRemoteData() {
        return this.channel.call('cleanUpRemoteData');
    }
    replace(syncResourceHandle) {
        return this.channel.call('replace', [syncResourceHandle]);
    }
    saveRemoteActivityData(location) {
        return this.channel.call('getRemoteActivityData', [location]);
    }
    extractActivityData(activityDataResource, location) {
        return this.channel.call('extractActivityData', [activityDataResource, location]);
    }
    async updateStatus(status) {
        this._status = status;
        this._onDidChangeStatus.fire(status);
    }
    async updateConflicts(conflicts) {
        // Revive URIs
        this._conflicts = conflicts.map(syncConflict => ({
            syncResource: syncConflict.syncResource,
            profile: reviveProfile(syncConflict.profile, this.userDataProfilesService.profilesHome.scheme),
            conflicts: syncConflict.conflicts.map(r => ({
                ...r,
                baseResource: URI.revive(r.baseResource),
                localResource: URI.revive(r.localResource),
                remoteResource: URI.revive(r.remoteResource),
                previewResource: URI.revive(r.previewResource),
            }))
        }));
        this._onDidChangeConflicts.fire(this._conflicts);
    }
    updateLastSyncTime(lastSyncTime) {
        if (this._lastSyncTime !== lastSyncTime) {
            this._lastSyncTime = lastSyncTime;
            this._onDidChangeLastSyncTime.fire(lastSyncTime);
        }
    }
};
UserDataSyncServiceChannelClient = __decorate([
    __param(1, IUserDataProfilesService)
], UserDataSyncServiceChannelClient);
export { UserDataSyncServiceChannelClient };
class ManualSyncTaskChannelClient extends Disposable {
    constructor(id, channel) {
        super();
        this.id = id;
        this.channel = channel;
    }
    async merge() {
        return this.channel.call('merge');
    }
    async apply() {
        return this.channel.call('apply');
    }
    stop() {
        return this.channel.call('stop');
    }
    dispose() {
        this.channel.call('dispose');
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luY1NlcnZpY2VJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHbEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzFHLE9BQU8sRUFFb0IsaUJBQWlCLEVBQzNDLE1BQU0sbUJBQW1CLENBQUM7QUFJM0IsU0FBUyxrQkFBa0IsQ0FBQyxZQUFtQyxFQUFFLHVCQUFpRDtJQUNqSCxPQUFPLEVBQUUsR0FBRyxZQUFZLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ3ZILENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLGtCQUF1QztJQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0FBQ3pGLENBQUM7QUFFRCxNQUFNLE9BQU8sMEJBQTBCO0lBS3RDLFlBQ2tCLE9BQTZCLEVBQzdCLHVCQUFpRCxFQUNqRCxVQUF1QjtRQUZ2QixZQUFPLEdBQVAsT0FBTyxDQUFzQjtRQUM3Qiw0QkFBdUIsR0FB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