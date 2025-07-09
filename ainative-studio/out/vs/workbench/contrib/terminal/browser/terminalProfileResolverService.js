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
import { Schemas } from '../../../../base/common/network.js';
import { env } from '../../../../base/common/process.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { OS } from '../../../../base/common/platform.js';
import { ITerminalLogService } from '../../../../platform/terminal/common/terminal.js';
import { ITerminalProfileService } from '../common/terminal.js';
import * as path from '../../../../base/common/path.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { debounce } from '../../../../base/common/decorators.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isUriComponents } from '../../../../platform/terminal/common/terminalProfiles.js';
import { ITerminalInstanceService } from './terminal.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
const generatedProfileName = 'Generated';
/*
 * Resolves terminal shell launch config and terminal profiles for the given operating system,
 * environment, and user configuration.
 */
export class BaseTerminalProfileResolverService extends Disposable {
    get defaultProfileName() { return this._defaultProfileName; }
    constructor(_context, _configurationService, _configurationResolverService, _historyService, _logService, _terminalProfileService, _workspaceContextService, _remoteAgentService) {
        super();
        this._context = _context;
        this._configurationService = _configurationService;
        this._configurationResolverService = _configurationResolverService;
        this._historyService = _historyService;
        this._logService = _logService;
        this._terminalProfileService = _terminalProfileService;
        this._workspaceContextService = _workspaceContextService;
        this._remoteAgentService = _remoteAgentService;
        this._iconRegistry = getIconRegistry();
        if (this._remoteAgentService.getConnection()) {
            this._remoteAgentService.getEnvironment().then(env => this._primaryBackendOs = env?.os || OS);
        }
        else {
            this._primaryBackendOs = OS;
        }
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.defaultProfile.windows" /* TerminalSettingId.DefaultProfileWindows */) ||
                e.affectsConfiguration("terminal.integrated.defaultProfile.osx" /* TerminalSettingId.DefaultProfileMacOs */) ||
                e.affectsConfiguration("terminal.integrated.defaultProfile.linux" /* TerminalSettingId.DefaultProfileLinux */)) {
                this._refreshDefaultProfileName();
            }
        }));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles(() => this._refreshDefaultProfileName()));
    }
    async _refreshDefaultProfileName() {
        if (this._primaryBackendOs) {
            this._defaultProfileName = (await this.getDefaultProfile({
                remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority,
                os: this._primaryBackendOs
            }))?.profileName;
        }
    }
    resolveIcon(shellLaunchConfig, os) {
        if (shellLaunchConfig.icon) {
            shellLaunchConfig.icon = this._getCustomIcon(shellLaunchConfig.icon) || this.getDefaultIcon();
            return;
        }
        if (shellLaunchConfig.customPtyImplementation) {
            shellLaunchConfig.icon = this.getDefaultIcon();
            return;
        }
        if (shellLaunchConfig.executable) {
            return;
        }
        const defaultProfile = this._getUnresolvedRealDefaultProfile(os);
        if (defaultProfile) {
            shellLaunchConfig.icon = defaultProfile.icon;
        }
        if (!shellLaunchConfig.icon) {
            shellLaunchConfig.icon = this.getDefaultIcon();
        }
    }
    getDefaultIcon(resource) {
        return this._iconRegistry.getIcon(this._configurationService.getValue("terminal.integrated.tabs.defaultIcon" /* TerminalSettingId.TabsDefaultIcon */, { resource })) || Codicon.terminal;
    }
    async resolveShellLaunchConfig(shellLaunchConfig, options) {
        // Resolve the shell and shell args
        let resolvedProfile;
        if (shellLaunchConfig.executable) {
            resolvedProfile = await this._resolveProfile({
                path: shellLaunchConfig.executable,
                args: shellLaunchConfig.args,
                profileName: generatedProfileName,
                isDefault: false
            }, options);
        }
        else {
            resolvedProfile = await this.getDefaultProfile(options);
        }
        shellLaunchConfig.executable = resolvedProfile.path;
        shellLaunchConfig.args = resolvedProfile.args;
        if (resolvedProfile.env) {
            if (shellLaunchConfig.env) {
                shellLaunchConfig.env = { ...shellLaunchConfig.env, ...resolvedProfile.env };
            }
            else {
                shellLaunchConfig.env = resolvedProfile.env;
            }
        }
        // Verify the icon is valid, and fallback correctly to the generic terminal id if there is
        // an issue
        const resource = shellLaunchConfig === undefined || typeof shellLaunchConfig.cwd === 'string' ? undefined : shellLaunchConfig.cwd;
        shellLaunchConfig.icon = this._getCustomIcon(shellLaunchConfig.icon)
            || this._getCustomIcon(resolvedProfile.icon)
            || this.getDefaultIcon(resource);
        // Override the name if specified
        if (resolvedProfile.overrideName) {
            shellLaunchConfig.name = resolvedProfile.profileName;
        }
        // Apply the color
        shellLaunchConfig.color = shellLaunchConfig.color
            || resolvedProfile.color
            || this._configurationService.getValue("terminal.integrated.tabs.defaultColor" /* TerminalSettingId.TabsDefaultColor */, { resource });
        // Resolve useShellEnvironment based on the setting if it's not set
        if (shellLaunchConfig.useShellEnvironment === undefined) {
            shellLaunchConfig.useShellEnvironment = this._configurationService.getValue("terminal.integrated.inheritEnv" /* TerminalSettingId.InheritEnv */);
        }
    }
    async getDefaultShell(options) {
        return (await this.getDefaultProfile(options)).path;
    }
    async getDefaultShellArgs(options) {
        return (await this.getDefaultProfile(options)).args || [];
    }
    async getDefaultProfile(options) {
        return this._resolveProfile(await this._getUnresolvedDefaultProfile(options), options);
    }
    getEnvironment(remoteAuthority) {
        return this._context.getEnvironment(remoteAuthority);
    }
    _getCustomIcon(icon) {
        if (!icon) {
            return undefined;
        }
        if (typeof icon === 'string') {
            return ThemeIcon.fromId(icon);
        }
        if (ThemeIcon.isThemeIcon(icon)) {
            return icon;
        }
        if (URI.isUri(icon) || isUriComponents(icon)) {
            return URI.revive(icon);
        }
        if (typeof icon === 'object' && 'light' in icon && 'dark' in icon) {
            const castedIcon = icon;
            if ((URI.isUri(castedIcon.light) || isUriComponents(castedIcon.light)) && (URI.isUri(castedIcon.dark) || isUriComponents(castedIcon.dark))) {
                return { light: URI.revive(castedIcon.light), dark: URI.revive(castedIcon.dark) };
            }
        }
        return undefined;
    }
    async _getUnresolvedDefaultProfile(options) {
        // If automation shell is allowed, prefer that
        if (options.allowAutomationShell) {
            const automationShellProfile = this._getUnresolvedAutomationShellProfile(options);
            if (automationShellProfile) {
                return automationShellProfile;
            }
        }
        // Return the real default profile if it exists and is valid, wait for profiles to be ready
        // if the window just opened
        await this._terminalProfileService.profilesReady;
        const defaultProfile = this._getUnresolvedRealDefaultProfile(options.os);
        if (defaultProfile) {
            return this._setIconForAutomation(options, defaultProfile);
        }
        // If there is no real default profile, create a fallback default profile based on the shell
        // and shellArgs settings in addition to the current environment.
        return this._setIconForAutomation(options, await this._getUnresolvedFallbackDefaultProfile(options));
    }
    _setIconForAutomation(options, profile) {
        if (options.allowAutomationShell) {
            const profileClone = deepClone(profile);
            profileClone.icon = Codicon.tools;
            return profileClone;
        }
        return profile;
    }
    _getUnresolvedRealDefaultProfile(os) {
        return this._terminalProfileService.getDefaultProfile(os);
    }
    async _getUnresolvedFallbackDefaultProfile(options) {
        const executable = await this._context.getDefaultSystemShell(options.remoteAuthority, options.os);
        // Try select an existing profile to fallback to, based on the default system shell, only do
        // this when it is NOT a local terminal in a remote window where the front and back end OS
        // differs (eg. Windows -> WSL, Mac -> Linux)
        if (options.os === OS) {
            let existingProfile = this._terminalProfileService.availableProfiles.find(e => path.parse(e.path).name === path.parse(executable).name);
            if (existingProfile) {
                if (options.allowAutomationShell) {
                    existingProfile = deepClone(existingProfile);
                    existingProfile.icon = Codicon.tools;
                }
                return existingProfile;
            }
        }
        // Finally fallback to a generated profile
        let args;
        if (options.os === 2 /* OperatingSystem.Macintosh */ && path.parse(executable).name.match(/(zsh|bash)/)) {
            // macOS should launch a login shell by default
            args = ['--login'];
        }
        else {
            // Resolve undefined to []
            args = [];
        }
        const icon = this._guessProfileIcon(executable);
        return {
            profileName: generatedProfileName,
            path: executable,
            args,
            icon,
            isDefault: false
        };
    }
    _getUnresolvedAutomationShellProfile(options) {
        const automationProfile = this._configurationService.getValue(`terminal.integrated.automationProfile.${this._getOsKey(options.os)}`);
        if (this._isValidAutomationProfile(automationProfile, options.os)) {
            automationProfile.icon = this._getCustomIcon(automationProfile.icon) || Codicon.tools;
            return automationProfile;
        }
        return undefined;
    }
    async _resolveProfile(profile, options) {
        const env = await this._context.getEnvironment(options.remoteAuthority);
        if (options.os === 1 /* OperatingSystem.Windows */) {
            // Change Sysnative to System32 if the OS is Windows but NOT WoW64. It's
            // safe to assume that this was used by accident as Sysnative does not
            // exist and will break the terminal in non-WoW64 environments.
            const isWoW64 = !!env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
            const windir = env.windir;
            if (!isWoW64 && windir) {
                const sysnativePath = path.join(windir, 'Sysnative').replace(/\//g, '\\').toLowerCase();
                if (profile.path && profile.path.toLowerCase().indexOf(sysnativePath) === 0) {
                    profile.path = path.join(windir, 'System32', profile.path.substr(sysnativePath.length + 1));
                }
            }
            // Convert / to \ on Windows for convenience
            if (profile.path) {
                profile.path = profile.path.replace(/\//g, '\\');
            }
        }
        // Resolve path variables
        const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot(options.remoteAuthority ? Schemas.vscodeRemote : Schemas.file);
        const lastActiveWorkspace = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
        profile.path = await this._resolveVariables(profile.path, env, lastActiveWorkspace);
        // Resolve args variables
        if (profile.args) {
            if (typeof profile.args === 'string') {
                profile.args = await this._resolveVariables(profile.args, env, lastActiveWorkspace);
            }
            else {
                profile.args = await Promise.all(profile.args.map(arg => this._resolveVariables(arg, env, lastActiveWorkspace)));
            }
        }
        return profile;
    }
    async _resolveVariables(value, env, lastActiveWorkspace) {
        try {
            value = await this._configurationResolverService.resolveWithEnvironment(env, lastActiveWorkspace, value);
        }
        catch (e) {
            this._logService.error(`Could not resolve shell`, e);
        }
        return value;
    }
    _getOsKey(os) {
        switch (os) {
            case 3 /* OperatingSystem.Linux */: return 'linux';
            case 2 /* OperatingSystem.Macintosh */: return 'osx';
            case 1 /* OperatingSystem.Windows */: return 'windows';
        }
    }
    _guessProfileIcon(shell) {
        const file = path.parse(shell).name;
        switch (file) {
            case 'bash':
                return Codicon.terminalBash;
            case 'pwsh':
            case 'powershell':
                return Codicon.terminalPowershell;
            case 'tmux':
                return Codicon.terminalTmux;
            case 'cmd':
                return Codicon.terminalCmd;
            default:
                return undefined;
        }
    }
    _isValidAutomationProfile(profile, os) {
        if (profile === null || profile === undefined || typeof profile !== 'object') {
            return false;
        }
        if ('path' in profile && typeof profile.path === 'string') {
            return true;
        }
        return false;
    }
}
__decorate([
    debounce(200)
], BaseTerminalProfileResolverService.prototype, "_refreshDefaultProfileName", null);
let BrowserTerminalProfileResolverService = class BrowserTerminalProfileResolverService extends BaseTerminalProfileResolverService {
    constructor(configurationResolverService, configurationService, historyService, logService, terminalInstanceService, terminalProfileService, workspaceContextService, remoteAgentService) {
        super({
            getDefaultSystemShell: async (remoteAuthority, os) => {
                const backend = await terminalInstanceService.getBackend(remoteAuthority);
                if (!remoteAuthority || !backend) {
                    // Just return basic values, this is only for serverless web and wouldn't be used
                    return os === 1 /* OperatingSystem.Windows */ ? 'pwsh' : 'bash';
                }
                return backend.getDefaultSystemShell(os);
            },
            getEnvironment: async (remoteAuthority) => {
                const backend = await terminalInstanceService.getBackend(remoteAuthority);
                if (!remoteAuthority || !backend) {
                    return env;
                }
                return backend.getEnvironment();
            }
        }, configurationService, configurationResolverService, historyService, logService, terminalProfileService, workspaceContextService, remoteAgentService);
    }
};
BrowserTerminalProfileResolverService = __decorate([
    __param(0, IConfigurationResolverService),
    __param(1, IConfigurationService),
    __param(2, IHistoryService),
    __param(3, ITerminalLogService),
    __param(4, ITerminalInstanceService),
    __param(5, ITerminalProfileService),
    __param(6, IWorkspaceContextService),
    __param(7, IRemoteAgentService)
], BrowserTerminalProfileResolverService);
export { BrowserTerminalProfileResolverService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxQcm9maWxlUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFvQixNQUFNLG9EQUFvRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQXdDLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9GLE9BQU8sRUFBc0IsbUJBQW1CLEVBQXFELE1BQU0sa0RBQWtELENBQUM7QUFDOUosT0FBTyxFQUFxRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ25JLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQWlCLE1BQU0sbURBQW1ELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxT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