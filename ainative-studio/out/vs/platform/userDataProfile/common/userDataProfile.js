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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS9jb21tb24vdXNlckRhdGFQcm9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLEdBQUcsRUFBVSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQXVCLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUEyQixpQ0FBaUMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXhJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHNCQUFz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