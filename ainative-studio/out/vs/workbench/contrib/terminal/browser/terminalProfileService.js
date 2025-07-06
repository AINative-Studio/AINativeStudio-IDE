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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxQcm9maWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSCxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQW1CLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pHLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN4SCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV2RyxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUNwSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFOUQsT0FBTyxFQUFFLG1CQUFtQixF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