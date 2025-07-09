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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9ub2RlL3Rlcm1pbmFsUHJvZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6RCxPQUFPLEtBQUssR0FBRyxNQUFNLDJCQUEyQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBSXBGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRWpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBRXhDLElBQVcsU0FFVjtBQUZELFdBQVcsU0FBUztJQUNuQiwyQ0FBOEIsQ0FBQTtBQUMvQixDQUFDLEVBRlUsU0FBUyxLQUFULFNBQVMsUUFFbkI7QUFFRCxJQUFJLGNBQWtFLENBQUM7QUFDdkUsSUFBSSxvQkFBb0IsR0FBWSxJQUFJLENBQUM7QUFFekMsTUFBTSxVQUFVLHVCQUF1QixDQUN0QyxRQUFpQixFQUNqQixjQUF1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