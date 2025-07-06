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
import { Codicon } from '../../../../base/common/codicons.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { getUriClasses, getColorClass, createColorStyleElement } from './terminalIcon.js';
import { configureTerminalProfileIcon } from './terminalIcons.js';
import * as nls from '../../../../nls.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITerminalProfileResolverService, ITerminalProfileService } from '../common/terminal.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { basename } from '../../../../base/common/path.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
let TerminalProfileQuickpick = class TerminalProfileQuickpick {
    constructor(_terminalProfileService, _terminalProfileResolverService, _configurationService, _quickInputService, _themeService, _notificationService) {
        this._terminalProfileService = _terminalProfileService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._configurationService = _configurationService;
        this._quickInputService = _quickInputService;
        this._themeService = _themeService;
        this._notificationService = _notificationService;
    }
    async showAndGetResult(type) {
        const platformKey = await this._terminalProfileService.getPlatformKey();
        const profilesKey = "terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey;
        const result = await this._createAndShow(type);
        const defaultProfileKey = `${"terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */}${platformKey}`;
        if (!result) {
            return;
        }
        if (type === 'setDefault') {
            if ('command' in result.profile) {
                return; // Should never happen
            }
            else if ('id' in result.profile) {
                // extension contributed profile
                await this._configurationService.updateValue(defaultProfileKey, result.profile.title, 2 /* ConfigurationTarget.USER */);
                return {
                    config: {
                        extensionIdentifier: result.profile.extensionIdentifier,
                        id: result.profile.id,
                        title: result.profile.title,
                        options: {
                            color: result.profile.color,
                            icon: result.profile.icon
                        }
                    },
                    keyMods: result.keyMods
                };
            }
            // Add the profile to settings if necessary
            if ('isAutoDetected' in result.profile) {
                const profilesConfig = await this._configurationService.getValue(profilesKey);
                if (typeof profilesConfig === 'object') {
                    const newProfile = {
                        path: result.profile.path
                    };
                    if (result.profile.args) {
                        newProfile.args = result.profile.args;
                    }
                    profilesConfig[result.profile.profileName] = this._createNewProfileConfig(result.profile);
                    await this._configurationService.updateValue(profilesKey, profilesConfig, 2 /* ConfigurationTarget.USER */);
                }
            }
            // Set the default profile
            await this._configurationService.updateValue(defaultProfileKey, result.profileName, 2 /* ConfigurationTarget.USER */);
        }
        else if (type === 'createInstance') {
            if ('id' in result.profile) {
                return {
                    config: {
                        extensionIdentifier: result.profile.extensionIdentifier,
                        id: result.profile.id,
                        title: result.profile.title,
                        options: {
                            icon: result.profile.icon,
                            color: result.profile.color,
                        }
                    },
                    keyMods: result.keyMods
                };
            }
            else {
                return { config: result.profile, keyMods: result.keyMods };
            }
        }
        // for tests
        return 'profileName' in result.profile ? result.profile.profileName : result.profile.title;
    }
    async _createAndShow(type) {
        const platformKey = await this._terminalProfileService.getPlatformKey();
        const profiles = this._terminalProfileService.availableProfiles;
        const profilesKey = "terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey;
        const defaultProfileName = this._terminalProfileService.getDefaultProfileName();
        let keyMods;
        const options = {
            placeHolder: type === 'createInstance' ? nls.localize('terminal.integrated.selectProfileToCreate', "Select the terminal profile to create") : nls.localize('terminal.integrated.chooseDefaultProfile', "Select your default terminal profile"),
            onDidTriggerItemButton: async (context) => {
                // Get the user's explicit permission to use a potentially unsafe path
                if (!await this._isProfileSafe(context.item.profile)) {
                    return;
                }
                if ('command' in context.item.profile) {
                    return;
                }
                if ('id' in context.item.profile) {
                    return;
                }
                const configProfiles = this._configurationService.getValue("terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey);
                const existingProfiles = !!configProfiles ? Object.keys(configProfiles) : [];
                const name = await this._quickInputService.input({
                    prompt: nls.localize('enterTerminalProfileName', "Enter terminal profile name"),
                    value: context.item.profile.profileName,
                    validateInput: async (input) => {
                        if (existingProfiles.includes(input)) {
                            return nls.localize('terminalProfileAlreadyExists', "A terminal profile already exists with that name");
                        }
                        return undefined;
                    }
                });
                if (!name) {
                    return;
                }
                const newConfigValue = {
                    ...configProfiles,
                    [name]: this._createNewProfileConfig(context.item.profile)
                };
                await this._configurationService.updateValue(profilesKey, newConfigValue, 2 /* ConfigurationTarget.USER */);
            },
            onKeyMods: mods => keyMods = mods
        };
        // Build quick pick items
        const quickPickItems = [];
        const configProfiles = profiles.filter(e => !e.isAutoDetected);
        const autoDetectedProfiles = profiles.filter(e => e.isAutoDetected);
        if (configProfiles.length > 0) {
            quickPickItems.push({ type: 'separator', label: nls.localize('terminalProfiles', "profiles") });
            quickPickItems.push(...this._sortProfileQuickPickItems(configProfiles.map(e => this._createProfileQuickPickItem(e)), defaultProfileName));
        }
        quickPickItems.push({ type: 'separator', label: nls.localize('ICreateContributedTerminalProfileOptions', "contributed") });
        const contributedProfiles = [];
        for (const contributed of this._terminalProfileService.contributedProfiles) {
            let icon;
            if (typeof contributed.icon === 'string') {
                if (contributed.icon.startsWith('$(')) {
                    icon = ThemeIcon.fromString(contributed.icon);
                }
                else {
                    icon = ThemeIcon.fromId(contributed.icon);
                }
            }
            if (!icon || !getIconRegistry().getIcon(icon.id)) {
                icon = this._terminalProfileResolverService.getDefaultIcon();
            }
            const uriClasses = getUriClasses(contributed, this._themeService.getColorTheme().type, true);
            const colorClass = getColorClass(contributed);
            const iconClasses = [];
            if (uriClasses) {
                iconClasses.push(...uriClasses);
            }
            if (colorClass) {
                iconClasses.push(colorClass);
            }
            contributedProfiles.push({
                label: `$(${icon.id}) ${contributed.title}`,
                profile: {
                    extensionIdentifier: contributed.extensionIdentifier,
                    title: contributed.title,
                    icon: contributed.icon,
                    id: contributed.id,
                    color: contributed.color
                },
                profileName: contributed.title,
                iconClasses
            });
        }
        if (contributedProfiles.length > 0) {
            quickPickItems.push(...this._sortProfileQuickPickItems(contributedProfiles, defaultProfileName));
        }
        if (autoDetectedProfiles.length > 0) {
            quickPickItems.push({ type: 'separator', label: nls.localize('terminalProfiles.detected', "detected") });
            quickPickItems.push(...this._sortProfileQuickPickItems(autoDetectedProfiles.map(e => this._createProfileQuickPickItem(e)), defaultProfileName));
        }
        const colorStyleDisposable = createColorStyleElement(this._themeService.getColorTheme());
        const result = await this._quickInputService.pick(quickPickItems, options);
        colorStyleDisposable.dispose();
        if (!result) {
            return undefined;
        }
        if (!await this._isProfileSafe(result.profile)) {
            return undefined;
        }
        if (keyMods) {
            result.keyMods = keyMods;
        }
        return result;
    }
    _createNewProfileConfig(profile) {
        const result = { path: profile.path };
        if (profile.args) {
            result.args = profile.args;
        }
        if (profile.env) {
            result.env = profile.env;
        }
        return result;
    }
    async _isProfileSafe(profile) {
        const isUnsafePath = 'isUnsafePath' in profile && profile.isUnsafePath;
        const requiresUnsafePath = 'requiresUnsafePath' in profile && profile.requiresUnsafePath;
        if (!isUnsafePath && !requiresUnsafePath) {
            return true;
        }
        // Get the user's explicit permission to use a potentially unsafe path
        return await new Promise(r => {
            const unsafePaths = [];
            if (isUnsafePath) {
                unsafePaths.push(profile.path);
            }
            if (requiresUnsafePath) {
                unsafePaths.push(requiresUnsafePath);
            }
            // Notify about unsafe path(s). At the time of writing, multiple unsafe paths isn't
            // possible so the message is optimized for a single path.
            const handle = this._notificationService.prompt(Severity.Warning, nls.localize('unsafePathWarning', 'This terminal profile uses a potentially unsafe path that can be modified by another user: {0}. Are you sure you want to use it?', `"${unsafePaths.join(',')}"`), [{
                    label: nls.localize('yes', 'Yes'),
                    run: () => r(true)
                }, {
                    label: nls.localize('cancel', 'Cancel'),
                    run: () => r(false)
                }]);
            handle.onDidClose(() => r(false));
        });
    }
    _createProfileQuickPickItem(profile) {
        const buttons = [{
                iconClass: ThemeIcon.asClassName(configureTerminalProfileIcon),
                tooltip: nls.localize('createQuickLaunchProfile', "Configure Terminal Profile")
            }];
        const icon = (profile.icon && ThemeIcon.isThemeIcon(profile.icon)) ? profile.icon : Codicon.terminal;
        const label = `$(${icon.id}) ${profile.profileName}`;
        const friendlyPath = profile.isFromPath ? basename(profile.path) : profile.path;
        const colorClass = getColorClass(profile);
        const iconClasses = [];
        if (colorClass) {
            iconClasses.push(colorClass);
        }
        if (profile.args) {
            if (typeof profile.args === 'string') {
                return { label, description: `${profile.path} ${profile.args}`, profile, profileName: profile.profileName, buttons, iconClasses };
            }
            const argsString = profile.args.map(e => {
                if (e.includes(' ')) {
                    return `"${e.replace(/"/g, '\\"')}"`; // CodeQL [SM02383] js/incomplete-sanitization This is only used as a label on the UI so this isn't a problem
                }
                return e;
            }).join(' ');
            return { label, description: `${friendlyPath} ${argsString}`, profile, profileName: profile.profileName, buttons, iconClasses };
        }
        return { label, description: friendlyPath, profile, profileName: profile.profileName, buttons, iconClasses };
    }
    _sortProfileQuickPickItems(items, defaultProfileName) {
        return items.sort((a, b) => {
            if (b.profileName === defaultProfileName) {
                return 1;
            }
            if (a.profileName === defaultProfileName) {
                return -1;
            }
            return a.profileName.localeCompare(b.profileName);
        });
    }
};
TerminalProfileQuickpick = __decorate([
    __param(0, ITerminalProfileService),
    __param(1, ITerminalProfileResolverService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, IThemeService),
    __param(5, INotificationService)
], TerminalProfileQuickpick);
export { TerminalProfileQuickpick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlUXVpY2twaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFByb2ZpbGVRdWlja3BpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsa0JBQWtCLEVBQWtGLE1BQU0sc0RBQXNELENBQUM7QUFFMUssT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMxRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNsRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLCtCQUErQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFJbkcsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7SUFDcEMsWUFDMkMsdUJBQWdELEVBQ3hDLCtCQUFnRSxFQUMxRSxxQkFB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