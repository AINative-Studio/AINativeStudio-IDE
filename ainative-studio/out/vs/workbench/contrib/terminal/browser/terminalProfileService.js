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
import * as arrays from '../../../../base/common/arrays.js';
import * as objects from '../../../../base/common/objects.js';
import { AutoOpenBarrier } from '../../../../base/common/async.js';
import { throttle } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWeb, isWindows, OS } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerTerminalDefaultProfileConfiguration } from '../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { terminalIconsEqual, terminalProfileArgsMatch } from '../../../../platform/terminal/common/terminalProfiles.js';
import { ITerminalInstanceService } from './terminal.js';
import { refreshTerminalActions } from './terminalActions.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { ITerminalContributionService } from '../common/terminalExtensionPoints.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
/*
 * Links TerminalService with TerminalProfileResolverService
 * and keeps the available terminal profiles updated
 */
let TerminalProfileService = class TerminalProfileService extends Disposable {
    get onDidChangeAvailableProfiles() { return this._onDidChangeAvailableProfiles.event; }
    get profilesReady() { return this._profilesReadyPromise; }
    get availableProfiles() {
        if (!this._platformConfigJustRefreshed) {
            this.refreshAvailableProfiles();
        }
        return this._availableProfiles || [];
    }
    get contributedProfiles() {
        const userConfiguredProfileNames = this._availableProfiles?.map(p => p.profileName) || [];
        // Allow a user defined profile to override an extension contributed profile with the same name
        return this._contributedProfiles?.filter(p => !userConfiguredProfileNames.includes(p.title)) || [];
    }
    constructor(_contextKeyService, _configurationService, _terminalContributionService, _extensionService, _remoteAgentService, _environmentService, _terminalInstanceService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._terminalContributionService = _terminalContributionService;
        this._extensionService = _extensionService;
        this._remoteAgentService = _remoteAgentService;
        this._environmentService = _environmentService;
        this._terminalInstanceService = _terminalInstanceService;
        this._contributedProfiles = [];
        this._platformConfigJustRefreshed = false;
        this._refreshTerminalActionsDisposable = this._register(new MutableDisposable());
        this._profileProviders = new Map();
        this._onDidChangeAvailableProfiles = this._register(new Emitter());
        // in web, we don't want to show the dropdown unless there's a web extension
        // that contributes a profile
        this._register(this._extensionService.onDidChangeExtensions(() => this.refreshAvailableProfiles()));
        this._webExtensionContributedProfileContextKey = TerminalContextKeys.webExtensionContributedProfile.bindTo(this._contextKeyService);
        this._updateWebContextKey();
        this._profilesReadyPromise = this._remoteAgentService.getEnvironment()
            .then(() => {
            // Wait up to 20 seconds for profiles to be ready so it's assured that we know the actual
            // default terminal before launching the first terminal. This isn't expected to ever take
            // this long.
            this._profilesReadyBarrier = new AutoOpenBarrier(20000);
            return this._profilesReadyBarrier.wait().then(() => { });
        });
        this.refreshAvailableProfiles();
        this._setupConfigListener();
    }
    async _setupConfigListener() {
        const platformKey = await this.getPlatformKey();
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("terminal.integrated.automationProfile." /* TerminalSettingPrefix.AutomationProfile */ + platformKey) ||
                e.affectsConfiguration("terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */ + platformKey) ||
                e.affectsConfiguration("terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey) ||
                e.affectsConfiguration("terminal.integrated.useWslProfiles" /* TerminalSettingId.UseWslProfiles */)) {
                if (e.source !== 7 /* ConfigurationTarget.DEFAULT */) {
                    // when _refreshPlatformConfig is called within refreshAvailableProfiles
                    // on did change configuration is fired. this can lead to an infinite recursion
                    this.refreshAvailableProfiles();
                    this._platformConfigJustRefreshed = false;
                }
                else {
                    this._platformConfigJustRefreshed = true;
                }
            }
        }));
    }
    getDefaultProfileName() {
        return this._defaultProfileName;
    }
    getDefaultProfile(os) {
        let defaultProfileName;
        if (os) {
            defaultProfileName = this._configurationService.getValue(`${"terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */}${this._getOsKey(os)}`);
            if (!defaultProfileName || typeof defaultProfileName !== 'string') {
                return undefined;
            }
        }
        else {
            defaultProfileName = this._defaultProfileName;
        }
        if (!defaultProfileName) {
            return undefined;
        }
        // IMPORTANT: Only allow the default profile name to find non-auto detected profiles as
        // to avoid unsafe path profiles being picked up.
        return this.availableProfiles.find(e => e.profileName === defaultProfileName && !e.isAutoDetected);
    }
    _getOsKey(os) {
        switch (os) {
            case 3 /* OperatingSystem.Linux */: return 'linux';
            case 2 /* OperatingSystem.Macintosh */: return 'osx';
            case 1 /* OperatingSystem.Windows */: return 'windows';
        }
    }
    refreshAvailableProfiles() {
        this._refreshAvailableProfilesNow();
    }
    async _refreshAvailableProfilesNow() {
        // Profiles
        const profiles = await this._detectProfiles(true);
        const profilesChanged = !arrays.equals(profiles, this._availableProfiles, profilesEqual);
        // Contributed profiles
        const contributedProfilesChanged = await this._updateContributedProfiles();
        // Automation profiles
        const platform = await this.getPlatformKey();
        const automationProfile = this._configurationService.getValue(`${"terminal.integrated.automationProfile." /* TerminalSettingPrefix.AutomationProfile */}${platform}`);
        const automationProfileChanged = !objects.equals(automationProfile, this._automationProfile);
        // Update
        if (profilesChanged || contributedProfilesChanged || automationProfileChanged) {
            this._availableProfiles = profiles;
            this._automationProfile = automationProfile;
            this._onDidChangeAvailableProfiles.fire(this._availableProfiles);
            this._profilesReadyBarrier.open();
            this._updateWebContextKey();
            await this._refreshPlatformConfig(this._availableProfiles);
        }
    }
    async _updateContributedProfiles() {
        const platformKey = await this.getPlatformKey();
        const excludedContributedProfiles = [];
        const configProfiles = this._configurationService.getValue("terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey);
        for (const [profileName, value] of Object.entries(configProfiles)) {
            if (value === null) {
                excludedContributedProfiles.push(profileName);
            }
        }
        const filteredContributedProfiles = Array.from(this._terminalContributionService.terminalProfiles.filter(p => !excludedContributedProfiles.includes(p.title)));
        const contributedProfilesChanged = !arrays.equals(filteredContributedProfiles, this._contributedProfiles, contributedProfilesEqual);
        this._contributedProfiles = filteredContributedProfiles;
        return contributedProfilesChanged;
    }
    getContributedProfileProvider(extensionIdentifier, id) {
        const extMap = this._profileProviders.get(extensionIdentifier);
        return extMap?.get(id);
    }
    async _detectProfiles(includeDetectedProfiles) {
        const primaryBackend = await this._terminalInstanceService.getBackend(this._environmentService.remoteAuthority);
        if (!primaryBackend) {
            return this._availableProfiles || [];
        }
        const platform = await this.getPlatformKey();
        this._defaultProfileName = this._configurationService.getValue(`${"terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */}${platform}`) ?? undefined;
        return primaryBackend.getProfiles(this._configurationService.getValue(`${"terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */}${platform}`), this._defaultProfileName, includeDetectedProfiles);
    }
    _updateWebContextKey() {
        this._webExtensionContributedProfileContextKey.set(isWeb && this._contributedProfiles.length > 0);
    }
    async _refreshPlatformConfig(profiles) {
        const env = await this._remoteAgentService.getEnvironment();
        registerTerminalDefaultProfileConfiguration({ os: env?.os || OS, profiles }, this._contributedProfiles);
        this._refreshTerminalActionsDisposable.value = refreshTerminalActions(profiles);
    }
    async getPlatformKey() {
        const env = await this._remoteAgentService.getEnvironment();
        if (env) {
            return env.os === 1 /* OperatingSystem.Windows */ ? 'windows' : (env.os === 2 /* OperatingSystem.Macintosh */ ? 'osx' : 'linux');
        }
        return isWindows ? 'windows' : (isMacintosh ? 'osx' : 'linux');
    }
    registerTerminalProfileProvider(extensionIdentifier, id, profileProvider) {
        let extMap = this._profileProviders.get(extensionIdentifier);
        if (!extMap) {
            extMap = new Map();
            this._profileProviders.set(extensionIdentifier, extMap);
        }
        extMap.set(id, profileProvider);
        return toDisposable(() => this._profileProviders.delete(id));
    }
    async registerContributedProfile(args) {
        const platformKey = await this.getPlatformKey();
        const profilesConfig = await this._configurationService.getValue(`${"terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */}${platformKey}`);
        if (typeof profilesConfig === 'object') {
            const newProfile = {
                extensionIdentifier: args.extensionIdentifier,
                icon: args.options.icon,
                id: args.id,
                title: args.title,
                color: args.options.color
            };
            profilesConfig[args.title] = newProfile;
        }
        await this._configurationService.updateValue(`${"terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */}${platformKey}`, profilesConfig, 2 /* ConfigurationTarget.USER */);
        return;
    }
    async getContributedDefaultProfile(shellLaunchConfig) {
        // prevents recursion with the MainThreadTerminalService call to create terminal
        // and defers to the provided launch config when an executable is provided
        if (shellLaunchConfig && !shellLaunchConfig.extHostTerminalId && !('executable' in shellLaunchConfig)) {
            const key = await this.getPlatformKey();
            const defaultProfileName = this._configurationService.getValue(`${"terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */}${key}`);
            const contributedDefaultProfile = this.contributedProfiles.find(p => p.title === defaultProfileName);
            return contributedDefaultProfile;
        }
        return undefined;
    }
};
__decorate([
    throttle(2000)
], TerminalProfileService.prototype, "refreshAvailableProfiles", null);
TerminalProfileService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IConfigurationService),
    __param(2, ITerminalContributionService),
    __param(3, IExtensionService),
    __param(4, IRemoteAgentService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, ITerminalInstanceService)
], TerminalProfileService);
export { TerminalProfileService };
function profilesEqual(one, other) {
    return one.profileName === other.profileName &&
        terminalProfileArgsMatch(one.args, other.args) &&
        one.color === other.color &&
        terminalIconsEqual(one.icon, other.icon) &&
        one.isAutoDetected === other.isAutoDetected &&
        one.isDefault === other.isDefault &&
        one.overrideName === other.overrideName &&
        one.path === other.path;
}
function contributedProfilesEqual(one, other) {
    return one.extensionIdentifier === other.extensionIdentifier &&
        one.color === other.color &&
        one.icon === other.icon &&
        one.id === other.id &&
        one.title === other.title;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsUHJvZmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFtQixFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RyxPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDeEgsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdkcsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDcEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTlELE9BQU8sRUFBRSxtQkFBbUIs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