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
import { BroadcastDataChannel } from '../../../base/browser/broadcast.js';
import { revive } from '../../../base/common/marshalling.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { reviveProfile, UserDataProfilesService } from '../common/userDataProfile.js';
let BrowserUserDataProfilesService = class BrowserUserDataProfilesService extends UserDataProfilesService {
    constructor(environmentService, fileService, uriIdentityService, logService) {
        super(environmentService, fileService, uriIdentityService, logService);
        this.changesBroadcastChannel = this._register(new BroadcastDataChannel(`${UserDataProfilesService.PROFILES_KEY}.changes`));
        this._register(this.changesBroadcastChannel.onDidReceiveData(changes => {
            try {
                this._profilesObject = undefined;
                const added = changes.added.map(p => reviveProfile(p, this.profilesHome.scheme));
                const removed = changes.removed.map(p => reviveProfile(p, this.profilesHome.scheme));
                const updated = changes.updated.map(p => reviveProfile(p, this.profilesHome.scheme));
                this.updateTransientProfiles(added.filter(a => a.isTransient), removed.filter(a => a.isTransient), updated.filter(a => a.isTransient));
                this._onDidChangeProfiles.fire({
                    added,
                    removed,
                    updated,
                    all: this.profiles
                });
            }
            catch (error) { /* ignore */ }
        }));
    }
    updateTransientProfiles(added, removed, updated) {
        if (added.length) {
            this.transientProfilesObject.profiles.push(...added);
        }
        if (removed.length || updated.length) {
            const allTransientProfiles = this.transientProfilesObject.profiles;
            this.transientProfilesObject.profiles = [];
            for (const profile of allTransientProfiles) {
                if (removed.some(p => profile.id === p.id)) {
                    continue;
                }
                this.transientProfilesObject.profiles.push(updated.find(p => profile.id === p.id) ?? profile);
            }
        }
    }
    getStoredProfiles() {
        try {
            const value = localStorage.getItem(UserDataProfilesService.PROFILES_KEY);
            if (value) {
                return revive(JSON.parse(value));
            }
        }
        catch (error) {
            /* ignore */
            this.logService.error(error);
        }
        return [];
    }
    triggerProfilesChanges(added, removed, updated) {
        super.triggerProfilesChanges(added, removed, updated);
        this.changesBroadcastChannel.postData({ added, removed, updated });
    }
    saveStoredProfiles(storedProfiles) {
        localStorage.setItem(UserDataProfilesService.PROFILES_KEY, JSON.stringify(storedProfiles));
    }
    getStoredProfileAssociations() {
        try {
            const value = localStorage.getItem(UserDataProfilesService.PROFILE_ASSOCIATIONS_KEY);
            if (value) {
                return JSON.parse(value);
            }
        }
        catch (error) {
            /* ignore */
            this.logService.error(error);
        }
        return {};
    }
    saveStoredProfileAssociations(storedProfileAssociations) {
        localStorage.setItem(UserDataProfilesService.PROFILE_ASSOCIATIONS_KEY, JSON.stringify(storedProfileAssociations));
    }
};
BrowserUserDataProfilesService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], BrowserUserDataProfilesService);
export { BrowserUserDataProfilesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQXNFLGFBQWEsRUFBb0QsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUlyTSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLHVCQUF1QjtJQUkxRSxZQUNzQixrQkFBdUMsRUFDOUMsV0FBeUIsRUFDbEIsa0JBQXVDLEVBQy9DLFVBQXVCO1FBRXBDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxvQkFBb0IsQ0FBNEIsR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdEosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxD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