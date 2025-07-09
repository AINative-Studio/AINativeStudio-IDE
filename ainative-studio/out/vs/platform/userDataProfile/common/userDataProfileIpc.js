/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { reviveProfile } from './userDataProfile.js';
import { transformIncomingURIs, transformOutgoingURIs } from '../../../base/common/uriIpc.js';
export class RemoteUserDataProfilesServiceChannel {
    constructor(service, getUriTransformer) {
        this.service = service;
        this.getUriTransformer = getUriTransformer;
    }
    listen(context, event) {
        const uriTransformer = this.getUriTransformer(context);
        switch (event) {
            case 'onDidChangeProfiles': return Event.map(this.service.onDidChangeProfiles, e => {
                return {
                    all: e.all.map(p => transformOutgoingURIs({ ...p }, uriTransformer)),
                    added: e.added.map(p => transformOutgoingURIs({ ...p }, uriTransformer)),
                    removed: e.removed.map(p => transformOutgoingURIs({ ...p }, uriTransformer)),
                    updated: e.updated.map(p => transformOutgoingURIs({ ...p }, uriTransformer))
                };
            });
        }
        throw new Error(`Invalid listen ${event}`);
    }
    async call(context, command, args) {
        const uriTransformer = this.getUriTransformer(context);
        switch (command) {
            case 'createProfile': {
                const profile = await this.service.createProfile(args[0], args[1], args[2]);
                return transformOutgoingURIs({ ...profile }, uriTransformer);
            }
            case 'updateProfile': {
                let profile = reviveProfile(transformIncomingURIs(args[0], uriTransformer), this.service.profilesHome.scheme);
                profile = await this.service.updateProfile(profile, args[1]);
                return transformOutgoingURIs({ ...profile }, uriTransformer);
            }
            case 'removeProfile': {
                const profile = reviveProfile(transformIncomingURIs(args[0], uriTransformer), this.service.profilesHome.scheme);
                return this.service.removeProfile(profile);
            }
        }
        throw new Error(`Invalid call ${command}`);
    }
}
export class UserDataProfilesService extends Disposable {
    get defaultProfile() { return this.profiles[0]; }
    get profiles() { return this._profiles; }
    constructor(profiles, profilesHome, channel) {
        super();
        this.profilesHome = profilesHome;
        this.channel = channel;
        this._profiles = [];
        this._onDidChangeProfiles = this._register(new Emitter());
        this.onDidChangeProfiles = this._onDidChangeProfiles.event;
        this._profiles = profiles.map(profile => reviveProfile(profile, this.profilesHome.scheme));
        this._register(this.channel.listen('onDidChangeProfiles')(e => {
            const added = e.added.map(profile => reviveProfile(profile, this.profilesHome.scheme));
            const removed = e.removed.map(profile => reviveProfile(profile, this.profilesHome.scheme));
            const updated = e.updated.map(profile => reviveProfile(profile, this.profilesHome.scheme));
            this._profiles = e.all.map(profile => reviveProfile(profile, this.profilesHome.scheme));
            this._onDidChangeProfiles.fire({ added, removed, updated, all: this.profiles });
        }));
        this.onDidResetWorkspaces = this.channel.listen('onDidResetWorkspaces');
    }
    async createNamedProfile(name, options, workspaceIdentifier) {
        const result = await this.channel.call('createNamedProfile', [name, options, workspaceIdentifier]);
        return reviveProfile(result, this.profilesHome.scheme);
    }
    async createProfile(id, name, options, workspaceIdentifier) {
        const result = await this.channel.call('createProfile', [id, name, options, workspaceIdentifier]);
        return reviveProfile(result, this.profilesHome.scheme);
    }
    async createTransientProfile(workspaceIdentifier) {
        const result = await this.channel.call('createTransientProfile', [workspaceIdentifier]);
        return reviveProfile(result, this.profilesHome.scheme);
    }
    async setProfileForWorkspace(workspaceIdentifier, profile) {
        await this.channel.call('setProfileForWorkspace', [workspaceIdentifier, profile]);
    }
    removeProfile(profile) {
        return this.channel.call('removeProfile', [profile]);
    }
    async updateProfile(profile, updateOptions) {
        const result = await this.channel.call('updateProfile', [profile, updateOptions]);
        return reviveProfile(result, this.profilesHome.scheme);
    }
    resetWorkspaces() {
        return this.channel.call('resetWorkspaces');
    }
    cleanUp() {
        return this.channel.call('cleanUp');
    }
    cleanUpTransientProfiles() {
        return this.channel.call('cleanUpTransientProfiles');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS9jb21tb24vdXNlckRhdGFQcm9maWxlSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRy9ELE9BQU8sRUFBOEgsYUFBYSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFakwsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRS9HLE1BQU0sT0FBTyxvQ0FBb0M7SUFFaEQsWUFDa0IsT0FBaUMsRUFDakMsaUJBQTJEO1FBRDNELFlBQU8sR0FBUCxPQUFPLENBQTBCO1FBQ2pDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMEM7SUFDekUsQ0FBQztJQUVMLE1BQU0sQ0FBQyxPQUFZLEVBQUUsS0FBYTtRQUNqQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkQsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUsscUJBQXFCLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQWlELElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2xJLE9BQU87b0JBQ04sR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO29C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