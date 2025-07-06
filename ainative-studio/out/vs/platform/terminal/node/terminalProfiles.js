/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as cp from 'child_process';
import { Codicon } from '../../../base/common/codicons.js';
import { basename, delimiter, normalize } from '../../../base/common/path.js';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { findExecutable } from '../../../base/node/processes.js';
import { isString } from '../../../base/common/types.js';
import * as pfs from '../../../base/node/pfs.js';
import { enumeratePowerShellInstallations } from '../../../base/node/powershell.js';
import { getWindowsBuildNumber } from './terminalEnvironment.js';
import { dirname, resolve } from 'path';
var Constants;
(function (Constants) {
    Constants["UnixShellsPath"] = "/etc/shells";
})(Constants || (Constants = {}));
let profileSources;
let logIfWslNotInstalled = true;
export function detectAvailableProfiles(profiles, defaultProfile, includeDetectedProfiles, configurationService, shellEnv = process.env, fsProvider, logService, variableResolver, testPwshSourcePaths) {
    fsProvider = fsProvider || {
        existsFile: pfs.SymlinkSupport.existsFile,
        readFile: fs.promises.readFile
    };
    if (isWindows) {
        return detectAvailableWindowsProfiles(includeDetectedProfiles, fsProvider, shellEnv, logService, configurationService.getValue("terminal.integrated.useWslProfiles" /* TerminalSettingId.UseWslProfiles */) !== false, profiles && typeof profiles === 'object' ? { ...profiles } : configurationService.getValue("terminal.integrated.profiles.windows" /* TerminalSettingId.ProfilesWindows */), typeof defaultProfile === 'string' ? defaultProfile : configurationService.getValue("terminal.integrated.defaultProfile.windows" /* TerminalSettingId.DefaultProfileWindows */), testPwshSourcePaths, variableResolver);
    }
    return detectAvailableUnixProfiles(fsProvider, logService, includeDetectedProfiles, profiles && typeof profiles === 'object' ? { ...profiles } : configurationService.getValue(isLinux ? "terminal.integrated.profiles.linux" /* TerminalSettingId.ProfilesLinux */ : "terminal.integrated.profiles.osx" /* TerminalSettingId.ProfilesMacOs */), typeof defaultProfile === 'string' ? defaultProfile : configurationService.getValue(isLinux ? "terminal.integrated.defaultProfile.linux" /* TerminalSettingId.DefaultProfileLinux */ : "terminal.integrated.defaultProfile.osx" /* TerminalSettingId.DefaultProfileMacOs */), testPwshSourcePaths, variableResolver, shellEnv);
}
async function detectAvailableWindowsProfiles(includeDetectedProfiles, fsProvider, shellEnv, logService, useWslProfiles, configProfiles, defaultProfileName, testPwshSourcePaths, variableResolver) {
    // Determine the correct System32 path. We want to point to Sysnative
    // when the 32-bit version of VS Code is running on a 64-bit machine.
    // The reason for this is because PowerShell's important PSReadline
    // module doesn't work if this is not the case. See #27915.
    const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
    const system32Path = `${process.env['windir']}\\${is32ProcessOn64Windows ? 'Sysnative' : 'System32'}`;
    let useWSLexe = false;
    if (getWindowsBuildNumber() >= 16299) {
        useWSLexe = true;
    }
    await initializeWindowsProfiles(testPwshSourcePaths);
    const detectedProfiles = new Map();
    // Add auto detected profiles
    if (includeDetectedProfiles) {
        detectedProfiles.set('PowerShell', {
            source: "PowerShell" /* ProfileSource.Pwsh */,
            icon: Codicon.terminalPowershell,
            isAutoDetected: true
        });
        detectedProfiles.set('Windows PowerShell', {
            path: `${system32Path}\\WindowsPowerShell\\v1.0\\powershell.exe`,
            icon: Codicon.terminalPowershell,
            isAutoDetected: true
        });
        detectedProfiles.set('Git Bash', {
            source: "Git Bash" /* ProfileSource.GitBash */,
            isAutoDetected: true
        });
        detectedProfiles.set('Command Prompt', {
            path: `${system32Path}\\cmd.exe`,
            icon: Codicon.terminalCmd,
            isAutoDetected: true
        });
        detectedProfiles.set('Cygwin', {
            path: [
                { path: `${process.env['HOMEDRIVE']}\\cygwin64\\bin\\bash.exe`, isUnsafe: true },
                { path: `${process.env['HOMEDRIVE']}\\cygwin\\bin\\bash.exe`, isUnsafe: true }
            ],
            args: ['--login'],
            isAutoDetected: true
        });
        detectedProfiles.set('bash (MSYS2)', {
            path: [
                { path: `${process.env['HOMEDRIVE']}\\msys64\\usr\\bin\\bash.exe`, isUnsafe: true },
            ],
            args: ['--login', '-i'],
            // CHERE_INVOKING retains current working directory
            env: { CHERE_INVOKING: '1' },
            icon: Codicon.terminalBash,
            isAutoDetected: true
        });
        const cmderPath = `${process.env['CMDER_ROOT'] || `${process.env['HOMEDRIVE']}\\cmder`}\\vendor\\bin\\vscode_init.cmd`;
        detectedProfiles.set('Cmder', {
            path: `${system32Path}\\cmd.exe`,
            args: ['/K', cmderPath],
            // The path is safe if it was derived from CMDER_ROOT
            requiresPath: process.env['CMDER_ROOT'] ? cmderPath : { path: cmderPath, isUnsafe: true },
            isAutoDetected: true
        });
    }
    applyConfigProfilesToMap(configProfiles, detectedProfiles);
    const resultProfiles = await transformToTerminalProfiles(detectedProfiles.entries(), defaultProfileName, fsProvider, shellEnv, logService, variableResolver);
    if (includeDetectedProfiles && useWslProfiles) {
        try {
            const result = await getWslProfiles(`${system32Path}\\${useWSLexe ? 'wsl' : 'bash'}.exe`, defaultProfileName);
            for (const wslProfile of result) {
                if (!configProfiles || !(wslProfile.profileName in configProfiles)) {
                    resultProfiles.push(wslProfile);
                }
            }
        }
        catch (e) {
            if (logIfWslNotInstalled) {
                logService?.trace('WSL is not installed, so could not detect WSL profiles');
                logIfWslNotInstalled = false;
            }
        }
    }
    return resultProfiles;
}
async function transformToTerminalProfiles(entries, defaultProfileName, fsProvider, shellEnv = process.env, logService, variableResolver) {
    const promises = [];
    for (const [profileName, profile] of entries) {
        promises.push(getValidatedProfile(profileName, profile, defaultProfileName, fsProvider, shellEnv, logService, variableResolver));
    }
    return (await Promise.all(promises)).filter(e => !!e);
}
async function getValidatedProfile(profileName, profile, defaultProfileName, fsProvider, shellEnv = process.env, logService, variableResolver) {
    if (profile === null) {
        return undefined;
    }
    let originalPaths;
    let args;
    let icon = undefined;
    // use calculated values if path is not specified
    if ('source' in profile && !('path' in profile)) {
        const source = profileSources?.get(profile.source);
        if (!source) {
            return undefined;
        }
        originalPaths = source.paths;
        // if there are configured args, override the default ones
        args = profile.args || source.args;
        if (profile.icon) {
            icon = validateIcon(profile.icon);
        }
        else if (source.icon) {
            icon = source.icon;
        }
    }
    else {
        originalPaths = Array.isArray(profile.path) ? profile.path : [profile.path];
        args = isWindows ? profile.args : Array.isArray(profile.args) ? profile.args : undefined;
        icon = validateIcon(profile.icon);
    }
    let paths;
    if (variableResolver) {
        // Convert to string[] for resolve
        const mapped = originalPaths.map(e => typeof e === 'string' ? e : e.path);
        const resolved = await variableResolver(mapped);
        // Convert resolved back to (T | string)[]
        paths = new Array(originalPaths.length);
        for (let i = 0; i < originalPaths.length; i++) {
            if (typeof originalPaths[i] === 'string') {
                paths[i] = resolved[i];
            }
            else {
                paths[i] = {
                    path: resolved[i],
                    isUnsafe: true
                };
            }
        }
    }
    else {
        paths = originalPaths.slice();
    }
    let requiresUnsafePath;
    if (profile.requiresPath) {
        // Validate requiresPath exists
        let actualRequiredPath;
        if (isString(profile.requiresPath)) {
            actualRequiredPath = profile.requiresPath;
        }
        else {
            actualRequiredPath = profile.requiresPath.path;
            if (profile.requiresPath.isUnsafe) {
                requiresUnsafePath = actualRequiredPath;
            }
        }
        const result = await fsProvider.existsFile(actualRequiredPath);
        if (!result) {
            return;
        }
    }
    const validatedProfile = await validateProfilePaths(profileName, defaultProfileName, paths, fsProvider, shellEnv, args, profile.env, profile.overrideName, profile.isAutoDetected, requiresUnsafePath);
    if (!validatedProfile) {
        logService?.debug('Terminal profile not validated', profileName, originalPaths);
        return undefined;
    }
    validatedProfile.isAutoDetected = profile.isAutoDetected;
    validatedProfile.icon = icon;
    validatedProfile.color = profile.color;
    return validatedProfile;
}
function validateIcon(icon) {
    if (typeof icon === 'string') {
        return { id: icon };
    }
    return icon;
}
async function initializeWindowsProfiles(testPwshSourcePaths) {
    if (profileSources && !testPwshSourcePaths) {
        return;
    }
    const [gitBashPaths, pwshPaths] = await Promise.all([getGitBashPaths(), testPwshSourcePaths || getPowershellPaths()]);
    profileSources = new Map();
    profileSources.set("Git Bash" /* ProfileSource.GitBash */, {
        profileName: 'Git Bash',
        paths: gitBashPaths,
        args: ['--login', '-i']
    });
    profileSources.set("PowerShell" /* ProfileSource.Pwsh */, {
        profileName: 'PowerShell',
        paths: pwshPaths,
        icon: Codicon.terminalPowershell
    });
}
async function getGitBashPaths() {
    const gitDirs = new Set();
    // Look for git.exe on the PATH and use that if found. git.exe is located at
    // `<installdir>/cmd/git.exe`. This is not an unsafe location because the git executable is
    // located on the PATH which is only controlled by the user/admin.
    const gitExePath = await findExecutable('git.exe');
    if (gitExePath) {
        const gitExeDir = dirname(gitExePath);
        gitDirs.add(resolve(gitExeDir, '../..'));
    }
    function addTruthy(set, value) {
        if (value) {
            set.add(value);
        }
    }
    // Add common git install locations
    addTruthy(gitDirs, process.env['ProgramW6432']);
    addTruthy(gitDirs, process.env['ProgramFiles']);
    addTruthy(gitDirs, process.env['ProgramFiles(X86)']);
    addTruthy(gitDirs, `${process.env['LocalAppData']}\\Program`);
    const gitBashPaths = [];
    for (const gitDir of gitDirs) {
        gitBashPaths.push(`${gitDir}\\Git\\bin\\bash.exe`, `${gitDir}\\Git\\usr\\bin\\bash.exe`, `${gitDir}\\usr\\bin\\bash.exe` // using Git for Windows SDK
        );
    }
    // Add special installs that don't follow the standard directory structure
    gitBashPaths.push(`${process.env['UserProfile']}\\scoop\\apps\\git\\current\\bin\\bash.exe`);
    gitBashPaths.push(`${process.env['UserProfile']}\\scoop\\apps\\git-with-openssh\\current\\bin\\bash.exe`);
    return gitBashPaths;
}
async function getPowershellPaths() {
    const paths = [];
    // Add all of the different kinds of PowerShells
    for await (const pwshExe of enumeratePowerShellInstallations()) {
        paths.push(pwshExe.exePath);
    }
    return paths;
}
async function getWslProfiles(wslPath, defaultProfileName) {
    const profiles = [];
    const distroOutput = await new Promise((resolve, reject) => {
        // wsl.exe output is encoded in utf16le (ie. A -> 0x4100)
        cp.exec('wsl.exe -l -q', { encoding: 'utf16le', timeout: 1000 }, (err, stdout) => {
            if (err) {
                return reject('Problem occurred when getting wsl distros');
            }
            resolve(stdout);
        });
    });
    if (!distroOutput) {
        return [];
    }
    const regex = new RegExp(/[\r?\n]/);
    const distroNames = distroOutput.split(regex).filter(t => t.trim().length > 0 && t !== '');
    for (const distroName of distroNames) {
        // Skip empty lines
        if (distroName === '') {
            continue;
        }
        // docker-desktop and docker-desktop-data are treated as implementation details of
        // Docker Desktop for Windows and therefore not exposed
        if (distroName.startsWith('docker-desktop')) {
            continue;
        }
        // Create the profile, adding the icon depending on the distro
        const profileName = `${distroName} (WSL)`;
        const profile = {
            profileName,
            path: wslPath,
            args: [`-d`, `${distroName}`],
            isDefault: profileName === defaultProfileName,
            icon: getWslIcon(distroName),
            isAutoDetected: false
        };
        // Add the profile
        profiles.push(profile);
    }
    return profiles;
}
function getWslIcon(distroName) {
    if (distroName.includes('Ubuntu')) {
        return Codicon.terminalUbuntu;
    }
    else if (distroName.includes('Debian')) {
        return Codicon.terminalDebian;
    }
    else {
        return Codicon.terminalLinux;
    }
}
async function detectAvailableUnixProfiles(fsProvider, logService, includeDetectedProfiles, configProfiles, defaultProfileName, testPaths, variableResolver, shellEnv) {
    const detectedProfiles = new Map();
    // Add non-quick launch profiles
    if (includeDetectedProfiles && await fsProvider.existsFile("/etc/shells" /* Constants.UnixShellsPath */)) {
        const contents = (await fsProvider.readFile("/etc/shells" /* Constants.UnixShellsPath */)).toString();
        const profiles = ((testPaths || contents.split('\n'))
            .map(e => {
            const index = e.indexOf('#');
            return index === -1 ? e : e.substring(0, index);
        })
            .filter(e => e.trim().length > 0));
        const counts = new Map();
        for (const profile of profiles) {
            let profileName = basename(profile);
            let count = counts.get(profileName) || 0;
            count++;
            if (count > 1) {
                profileName = `${profileName} (${count})`;
            }
            counts.set(profileName, count);
            detectedProfiles.set(profileName, { path: profile, isAutoDetected: true });
        }
    }
    applyConfigProfilesToMap(configProfiles, detectedProfiles);
    return await transformToTerminalProfiles(detectedProfiles.entries(), defaultProfileName, fsProvider, shellEnv, logService, variableResolver);
}
function applyConfigProfilesToMap(configProfiles, profilesMap) {
    if (!configProfiles) {
        return;
    }
    for (const [profileName, value] of Object.entries(configProfiles)) {
        if (value === null || typeof value !== 'object' || (!('path' in value) && !('source' in value))) {
            profilesMap.delete(profileName);
        }
        else {
            value.icon = value.icon || profilesMap.get(profileName)?.icon;
            profilesMap.set(profileName, value);
        }
    }
}
async function validateProfilePaths(profileName, defaultProfileName, potentialPaths, fsProvider, shellEnv, args, env, overrideName, isAutoDetected, requiresUnsafePath) {
    if (potentialPaths.length === 0) {
        return Promise.resolve(undefined);
    }
    const path = potentialPaths.shift();
    if (path === '') {
        return validateProfilePaths(profileName, defaultProfileName, potentialPaths, fsProvider, shellEnv, args, env, overrideName, isAutoDetected);
    }
    const isUnsafePath = typeof path !== 'string' && path.isUnsafe;
    const actualPath = typeof path === 'string' ? path : path.path;
    const profile = {
        profileName,
        path: actualPath,
        args,
        env,
        overrideName,
        isAutoDetected,
        isDefault: profileName === defaultProfileName,
        isUnsafePath,
        requiresUnsafePath
    };
    // For non-absolute paths, check if it's available on $PATH
    if (basename(actualPath) === actualPath) {
        // The executable isn't an absolute path, try find it on the PATH
        const envPaths = shellEnv.PATH ? shellEnv.PATH.split(delimiter) : undefined;
        const executable = await findExecutable(actualPath, undefined, envPaths, undefined, fsProvider.existsFile);
        if (!executable) {
            return validateProfilePaths(profileName, defaultProfileName, potentialPaths, fsProvider, shellEnv, args);
        }
        profile.path = executable;
        profile.isFromPath = true;
        return profile;
    }
    const result = await fsProvider.existsFile(normalize(actualPath));
    if (result) {
        return profile;
    }
    return validateProfilePaths(profileName, defaultProfileName, potentialPaths, fsProvider, shellEnv, args, env, overrideName, isAutoDetected);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvdGVybWluYWxQcm9maWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNwQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXpELE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUM7QUFDakQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFeEMsSUFBVyxTQUVWO0FBRkQsV0FBVyxTQUFTO0lBQ25CLDJDQUE4QixDQUFBO0FBQy9CLENBQUMsRUFGVSxTQUFTLEtBQVQsU0FBUyxRQUVuQjtBQUVELElBQUksY0FBa0UsQ0FBQztBQUN2RSxJQUFJLG9CQUFvQixHQUFZLElBQUksQ0FBQztBQUV6QyxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLFFBQWlCLEVBQ2pCLGNBQXVC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