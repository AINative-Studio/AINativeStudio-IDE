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
import { hash } from '../../../base/common/hash.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { basename, joinPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService, toFileOperationResult } from '../../files/common/files.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { Promises } from '../../../base/common/async.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { isString } from '../../../base/common/types.js';
export var ProfileResourceType;
(function (ProfileResourceType) {
    ProfileResourceType["Settings"] = "settings";
    ProfileResourceType["Keybindings"] = "keybindings";
    ProfileResourceType["Snippets"] = "snippets";
    ProfileResourceType["Prompts"] = "prompts";
    ProfileResourceType["Tasks"] = "tasks";
    ProfileResourceType["Extensions"] = "extensions";
    ProfileResourceType["GlobalState"] = "globalState";
})(ProfileResourceType || (ProfileResourceType = {}));
export function isUserDataProfile(thing) {
    const candidate = thing;
    return !!(candidate && typeof candidate === 'object'
        && typeof candidate.id === 'string'
        && typeof candidate.isDefault === 'boolean'
        && typeof candidate.name === 'string'
        && URI.isUri(candidate.location)
        && URI.isUri(candidate.globalStorageHome)
        && URI.isUri(candidate.settingsResource)
        && URI.isUri(candidate.keybindingsResource)
        && URI.isUri(candidate.tasksResource)
        && URI.isUri(candidate.snippetsHome)
        && URI.isUri(candidate.promptsHome)
        && URI.isUri(candidate.extensionsResource));
}
export const IUserDataProfilesService = createDecorator('IUserDataProfilesService');
export function reviveProfile(profile, scheme) {
    return {
        id: profile.id,
        isDefault: profile.isDefault,
        name: profile.name,
        icon: profile.icon,
        location: URI.revive(profile.location).with({ scheme }),
        globalStorageHome: URI.revive(profile.globalStorageHome).with({ scheme }),
        settingsResource: URI.revive(profile.settingsResource).with({ scheme }),
        keybindingsResource: URI.revive(profile.keybindingsResource).with({ scheme }),
        tasksResource: URI.revive(profile.tasksResource).with({ scheme }),
        snippetsHome: URI.revive(profile.snippetsHome).with({ scheme }),
        promptsHome: URI.revive(profile.promptsHome).with({ scheme }),
        extensionsResource: URI.revive(profile.extensionsResource).with({ scheme }),
        cacheHome: URI.revive(profile.cacheHome).with({ scheme }),
        useDefaultFlags: profile.useDefaultFlags,
        isTransient: profile.isTransient,
        workspaces: profile.workspaces?.map(w => URI.revive(w)),
    };
}
export function toUserDataProfile(id, name, location, profilesCacheHome, options, defaultProfile) {
    return {
        id,
        name,
        location,
        isDefault: false,
        icon: options?.icon,
        globalStorageHome: defaultProfile && options?.useDefaultFlags?.globalState ? defaultProfile.globalStorageHome : joinPath(location, 'globalStorage'),
        settingsResource: defaultProfile && options?.useDefaultFlags?.settings ? defaultProfile.settingsResource : joinPath(location, 'settings.json'),
        keybindingsResource: defaultProfile && options?.useDefaultFlags?.keybindings ? defaultProfile.keybindingsResource : joinPath(location, 'keybindings.json'),
        tasksResource: defaultProfile && options?.useDefaultFlags?.tasks ? defaultProfile.tasksResource : joinPath(location, 'tasks.json'),
        snippetsHome: defaultProfile && options?.useDefaultFlags?.snippets ? defaultProfile.snippetsHome : joinPath(location, 'snippets'),
        promptsHome: defaultProfile && options?.useDefaultFlags?.prompts ? defaultProfile.promptsHome : joinPath(location, 'prompts'),
        extensionsResource: defaultProfile && options?.useDefaultFlags?.extensions ? defaultProfile.extensionsResource : joinPath(location, 'extensions.json'),
        cacheHome: joinPath(profilesCacheHome, id),
        useDefaultFlags: options?.useDefaultFlags,
        isTransient: options?.transient,
        workspaces: options?.workspaces,
    };
}
let UserDataProfilesService = class UserDataProfilesService extends Disposable {
    static { this.PROFILES_KEY = 'userDataProfiles'; }
    static { this.PROFILE_ASSOCIATIONS_KEY = 'profileAssociations'; }
    get defaultProfile() { return this.profiles[0]; }
    get profiles() { return [...this.profilesObject.profiles, ...this.transientProfilesObject.profiles]; }
    constructor(environmentService, fileService, uriIdentityService, logService) {
        super();
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._onDidChangeProfiles = this._register(new Emitter());
        this.onDidChangeProfiles = this._onDidChangeProfiles.event;
        this._onWillCreateProfile = this._register(new Emitter());
        this.onWillCreateProfile = this._onWillCreateProfile.event;
        this._onWillRemoveProfile = this._register(new Emitter());
        this.onWillRemoveProfile = this._onWillRemoveProfile.event;
        this._onDidResetWorkspaces = this._register(new Emitter());
        this.onDidResetWorkspaces = this._onDidResetWorkspaces.event;
        this.profileCreationPromises = new Map();
        this.transientProfilesObject = {
            profiles: [],
            emptyWindows: new Map()
        };
        this.profilesHome = joinPath(this.environmentService.userRoamingDataHome, 'profiles');
        this.profilesCacheHome = joinPath(this.environmentService.cacheHome, 'CachedProfilesData');
    }
    init() {
        this._profilesObject = undefined;
    }
    get profilesObject() {
        if (!this._profilesObject) {
            const defaultProfile = this.createDefaultProfile();
            const profiles = [defaultProfile];
            try {
                for (const storedProfile of this.getStoredProfiles()) {
                    if (!storedProfile.name || !isString(storedProfile.name) || !storedProfile.location) {
                        this.logService.warn('Skipping the invalid stored profile', storedProfile.location || storedProfile.name);
                        continue;
                    }
                    profiles.push(toUserDataProfile(basename(storedProfile.location), storedProfile.name, storedProfile.location, this.profilesCacheHome, { icon: storedProfile.icon, useDefaultFlags: storedProfile.useDefaultFlags }, defaultProfile));
                }
            }
            catch (error) {
                this.logService.error(error);
            }
            const emptyWindows = new Map();
            if (profiles.length) {
                try {
                    const profileAssociaitions = this.getStoredProfileAssociations();
                    if (profileAssociaitions.workspaces) {
                        for (const [workspacePath, profileId] of Object.entries(profileAssociaitions.workspaces)) {
                            const workspace = URI.parse(workspacePath);
                            const profile = profiles.find(p => p.id === profileId);
                            if (profile) {
                                const workspaces = profile.workspaces ? profile.workspaces.slice(0) : [];
                                workspaces.push(workspace);
                                profile.workspaces = workspaces;
                            }
                        }
                    }
                    if (profileAssociaitions.emptyWindows) {
                        for (const [windowId, profileId] of Object.entries(profileAssociaitions.emptyWindows)) {
                            const profile = profiles.find(p => p.id === profileId);
                            if (profile) {
                                emptyWindows.set(windowId, profile);
                            }
                        }
                    }
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
            this._profilesObject = { profiles, emptyWindows };
        }
        return this._profilesObject;
    }
    createDefaultProfile() {
        const defaultProfile = toUserDataProfile('__default__profile__', localize('defaultProfile', "Default"), this.environmentService.userRoamingDataHome, this.profilesCacheHome);
        return { ...defaultProfile, extensionsResource: this.getDefaultProfileExtensionsLocation() ?? defaultProfile.extensionsResource, isDefault: true };
    }
    async createTransientProfile(workspaceIdentifier) {
        const namePrefix = `Temp`;
        const nameRegEx = new RegExp(`${escapeRegExpCharacters(namePrefix)}\\s(\\d+)`);
        let nameIndex = 0;
        for (const profile of this.profiles) {
            const matches = nameRegEx.exec(profile.name);
            const index = matches ? parseInt(matches[1]) : 0;
            nameIndex = index > nameIndex ? index : nameIndex;
        }
        const name = `${namePrefix} ${nameIndex + 1}`;
        return this.createProfile(hash(generateUuid()).toString(16), name, { transient: true }, workspaceIdentifier);
    }
    async createNamedProfile(name, options, workspaceIdentifier) {
        return this.createProfile(hash(generateUuid()).toString(16), name, options, workspaceIdentifier);
    }
    async createProfile(id, name, options, workspaceIdentifier) {
        const profile = await this.doCreateProfile(id, name, options, workspaceIdentifier);
        return profile;
    }
    async doCreateProfile(id, name, options, workspaceIdentifier) {
        if (!isString(name) || !name) {
            throw new Error('Name of the profile is mandatory and must be of type `string`');
        }
        let profileCreationPromise = this.profileCreationPromises.get(name);
        if (!profileCreationPromise) {
            profileCreationPromise = (async () => {
                try {
                    const existing = this.profiles.find(p => p.id === id || (!p.isTransient && !options?.transient && p.name === name));
                    if (existing) {
                        throw new Error(`Profile with ${name} name already exists`);
                    }
                    const workspace = workspaceIdentifier ? this.getWorkspace(workspaceIdentifier) : undefined;
                    if (URI.isUri(workspace)) {
                        options = { ...options, workspaces: [workspace] };
                    }
                    const profile = toUserDataProfile(id, name, joinPath(this.profilesHome, id), this.profilesCacheHome, options, this.defaultProfile);
                    await this.fileService.createFolder(profile.location);
                    const joiners = [];
                    this._onWillCreateProfile.fire({
                        profile,
                        join(promise) {
                            joiners.push(promise);
                        }
                    });
                    await Promises.settled(joiners);
                    if (workspace && !URI.isUri(workspace)) {
                        this.updateEmptyWindowAssociation(workspace, profile, !!profile.isTransient);
                    }
                    this.updateProfiles([profile], [], []);
                    return profile;
                }
                finally {
                    this.profileCreationPromises.delete(name);
                }
            })();
            this.profileCreationPromises.set(name, profileCreationPromise);
        }
        return profileCreationPromise;
    }
    async updateProfile(profile, options) {
        const profilesToUpdate = [];
        for (const existing of this.profiles) {
            let profileToUpdate;
            if (profile.id === existing.id) {
                if (!existing.isDefault) {
                    profileToUpdate = toUserDataProfile(existing.id, options.name ?? existing.name, existing.location, this.profilesCacheHome, {
                        icon: options.icon === null ? undefined : options.icon ?? existing.icon,
                        transient: options.transient ?? existing.isTransient,
                        useDefaultFlags: options.useDefaultFlags ?? existing.useDefaultFlags,
                        workspaces: options.workspaces ?? existing.workspaces,
                    }, this.defaultProfile);
                }
                else if (options.workspaces) {
                    profileToUpdate = existing;
                    profileToUpdate.workspaces = options.workspaces;
                }
            }
            else if (options.workspaces) {
                const workspaces = existing.workspaces?.filter(w1 => !options.workspaces?.some(w2 => this.uriIdentityService.extUri.isEqual(w1, w2)));
                if (existing.workspaces?.length !== workspaces?.length) {
                    profileToUpdate = existing;
                    profileToUpdate.workspaces = workspaces;
                }
            }
            if (profileToUpdate) {
                profilesToUpdate.push(profileToUpdate);
            }
        }
        if (!profilesToUpdate.length) {
            if (profile.isDefault) {
                throw new Error('Cannot update default profile');
            }
            throw new Error(`Profile '${profile.name}' does not exist`);
        }
        this.updateProfiles([], [], profilesToUpdate);
        const updatedProfile = this.profiles.find(p => p.id === profile.id);
        if (!updatedProfile) {
            throw new Error(`Profile '${profile.name}' was not updated`);
        }
        return updatedProfile;
    }
    async removeProfile(profileToRemove) {
        if (profileToRemove.isDefault) {
            throw new Error('Cannot remove default profile');
        }
        const profile = this.profiles.find(p => p.id === profileToRemove.id);
        if (!profile) {
            throw new Error(`Profile '${profileToRemove.name}' does not exist`);
        }
        const joiners = [];
        this._onWillRemoveProfile.fire({
            profile,
            join(promise) {
                joiners.push(promise);
            }
        });
        try {
            await Promise.allSettled(joiners);
        }
        catch (error) {
            this.logService.error(error);
        }
        this.updateProfiles([], [profile], []);
        try {
            await this.fileService.del(profile.cacheHome, { recursive: true });
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
    }
    async setProfileForWorkspace(workspaceIdentifier, profileToSet) {
        const profile = this.profiles.find(p => p.id === profileToSet.id);
        if (!profile) {
            throw new Error(`Profile '${profileToSet.name}' does not exist`);
        }
        const workspace = this.getWorkspace(workspaceIdentifier);
        if (URI.isUri(workspace)) {
            const workspaces = profile.workspaces ? [...profile.workspaces] : [];
            if (!workspaces.some(w => this.uriIdentityService.extUri.isEqual(w, workspace))) {
                workspaces.push(workspace);
                await this.updateProfile(profile, { workspaces });
            }
        }
        else {
            this.updateEmptyWindowAssociation(workspace, profile, false);
            this.updateStoredProfiles(this.profiles);
        }
    }
    unsetWorkspace(workspaceIdentifier, transient = false) {
        const workspace = this.getWorkspace(workspaceIdentifier);
        if (URI.isUri(workspace)) {
            const currentlyAssociatedProfile = this.getProfileForWorkspace(workspaceIdentifier);
            if (currentlyAssociatedProfile) {
                this.updateProfile(currentlyAssociatedProfile, { workspaces: currentlyAssociatedProfile.workspaces?.filter(w => !this.uriIdentityService.extUri.isEqual(w, workspace)) });
            }
        }
        else {
            this.updateEmptyWindowAssociation(workspace, undefined, transient);
            this.updateStoredProfiles(this.profiles);
        }
    }
    async resetWorkspaces() {
        this.transientProfilesObject.emptyWindows.clear();
        this.profilesObject.emptyWindows.clear();
        for (const profile of this.profiles) {
            profile.workspaces = undefined;
        }
        this.updateProfiles([], [], this.profiles);
        this._onDidResetWorkspaces.fire();
    }
    async cleanUp() {
        if (await this.fileService.exists(this.profilesHome)) {
            const stat = await this.fileService.resolve(this.profilesHome);
            await Promise.all((stat.children || [])
                .filter(child => child.isDirectory && this.profiles.every(p => !this.uriIdentityService.extUri.isEqual(p.location, child.resource)))
                .map(child => this.fileService.del(child.resource, { recursive: true })));
        }
    }
    async cleanUpTransientProfiles() {
        const unAssociatedTransientProfiles = this.transientProfilesObject.profiles.filter(p => !this.isProfileAssociatedToWorkspace(p));
        await Promise.allSettled(unAssociatedTransientProfiles.map(p => this.removeProfile(p)));
    }
    getProfileForWorkspace(workspaceIdentifier) {
        const workspace = this.getWorkspace(workspaceIdentifier);
        return URI.isUri(workspace)
            ? this.profiles.find(p => p.workspaces?.some(w => this.uriIdentityService.extUri.isEqual(w, workspace)))
            : (this.profilesObject.emptyWindows.get(workspace) ?? this.transientProfilesObject.emptyWindows.get(workspace));
    }
    getWorkspace(workspaceIdentifier) {
        if (isSingleFolderWorkspaceIdentifier(workspaceIdentifier)) {
            return workspaceIdentifier.uri;
        }
        if (isWorkspaceIdentifier(workspaceIdentifier)) {
            return workspaceIdentifier.configPath;
        }
        return workspaceIdentifier.id;
    }
    isProfileAssociatedToWorkspace(profile) {
        if (profile.workspaces?.length) {
            return true;
        }
        if ([...this.profilesObject.emptyWindows.values()].some(windowProfile => this.uriIdentityService.extUri.isEqual(windowProfile.location, profile.location))) {
            return true;
        }
        if ([...this.transientProfilesObject.emptyWindows.values()].some(windowProfile => this.uriIdentityService.extUri.isEqual(windowProfile.location, profile.location))) {
            return true;
        }
        return false;
    }
    updateProfiles(added, removed, updated) {
        const allProfiles = [...this.profiles, ...added];
        const transientProfiles = this.transientProfilesObject.profiles;
        this.transientProfilesObject.profiles = [];
        const profiles = [];
        for (let profile of allProfiles) {
            // removed
            if (removed.some(p => profile.id === p.id)) {
                for (const windowId of [...this.profilesObject.emptyWindows.keys()]) {
                    if (profile.id === this.profilesObject.emptyWindows.get(windowId)?.id) {
                        this.profilesObject.emptyWindows.delete(windowId);
                    }
                }
                continue;
            }
            if (!profile.isDefault) {
                profile = updated.find(p => profile.id === p.id) ?? profile;
                const transientProfile = transientProfiles.find(p => profile.id === p.id);
                if (profile.isTransient) {
                    this.transientProfilesObject.profiles.push(profile);
                }
                else {
                    if (transientProfile) {
                        // Move the empty window associations from the transient profile to the persisted profile
                        for (const [windowId, p] of this.transientProfilesObject.emptyWindows.entries()) {
                            if (profile.id === p.id) {
                                this.transientProfilesObject.emptyWindows.delete(windowId);
                                this.profilesObject.emptyWindows.set(windowId, profile);
                                break;
                            }
                        }
                    }
                }
            }
            if (profile.workspaces?.length === 0) {
                profile.workspaces = undefined;
            }
            profiles.push(profile);
        }
        this.updateStoredProfiles(profiles);
        this.triggerProfilesChanges(added, removed, updated);
    }
    triggerProfilesChanges(added, removed, updated) {
        this._onDidChangeProfiles.fire({ added, removed, updated, all: this.profiles });
    }
    updateEmptyWindowAssociation(windowId, newProfile, transient) {
        // Force transient if the new profile to associate is transient
        transient = newProfile?.isTransient ? true : transient;
        if (transient) {
            if (newProfile) {
                this.transientProfilesObject.emptyWindows.set(windowId, newProfile);
            }
            else {
                this.transientProfilesObject.emptyWindows.delete(windowId);
            }
        }
        else {
            // Unset the transiet association if any
            this.transientProfilesObject.emptyWindows.delete(windowId);
            if (newProfile) {
                this.profilesObject.emptyWindows.set(windowId, newProfile);
            }
            else {
                this.profilesObject.emptyWindows.delete(windowId);
            }
        }
    }
    updateStoredProfiles(profiles) {
        const storedProfiles = [];
        const workspaces = {};
        const emptyWindows = {};
        for (const profile of profiles) {
            if (profile.isTransient) {
                continue;
            }
            if (!profile.isDefault) {
                storedProfiles.push({ location: profile.location, name: profile.name, icon: profile.icon, useDefaultFlags: profile.useDefaultFlags });
            }
            if (profile.workspaces) {
                for (const workspace of profile.workspaces) {
                    workspaces[workspace.toString()] = profile.id;
                }
            }
        }
        for (const [windowId, profile] of this.profilesObject.emptyWindows.entries()) {
            emptyWindows[windowId.toString()] = profile.id;
        }
        this.saveStoredProfileAssociations({ workspaces, emptyWindows });
        this.saveStoredProfiles(storedProfiles);
        this._profilesObject = undefined;
    }
    getStoredProfiles() { return []; }
    saveStoredProfiles(storedProfiles) { throw new Error('not implemented'); }
    getStoredProfileAssociations() { return {}; }
    saveStoredProfileAssociations(storedProfileAssociations) { throw new Error('not implemented'); }
    getDefaultProfileExtensionsLocation() { return undefined; }
};
UserDataProfilesService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], UserDataProfilesService);
export { UserDataProfilesService };
export class InMemoryUserDataProfilesService extends UserDataProfilesService {
    constructor() {
        super(...arguments);
        this.storedProfiles = [];
        this.storedProfileAssociations = {};
    }
    getStoredProfiles() { return this.storedProfiles; }
    saveStoredProfiles(storedProfiles) { this.storedProfiles = storedProfiles; }
    getStoredProfileAssociations() { return this.storedProfileAssociations; }
    saveStoredProfileAssociations(storedProfileAssociations) { this.storedProfileAssociations = storedProfileAssociations; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL2NvbW1vbi91c2VyRGF0YVByb2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFVLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBdUIsWUFBWSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQTJCLGlDQUFpQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFeEksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsc0JBQXNC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