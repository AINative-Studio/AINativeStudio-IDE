/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import { FileAccess } from '../../../base/common/network.js';
import * as path from '../../../base/common/path.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import * as process from '../../../base/common/process.js';
import { format } from '../../../base/common/strings.js';
import { EnvironmentVariableMutatorType } from '../common/environmentVariable.js';
import { deserializeEnvironmentVariableCollections } from '../common/environmentVariableShared.js';
import { MergedEnvironmentVariableCollection } from '../common/environmentVariableCollection.js';
import { chmod, realpathSync, mkdirSync } from 'fs';
import { promisify } from 'util';
export function getWindowsBuildNumber() {
    const osVersion = (/(\d+)\.(\d+)\.(\d+)/g).exec(os.release());
    let buildNumber = 0;
    if (osVersion && osVersion.length === 4) {
        buildNumber = parseInt(osVersion[3]);
    }
    return buildNumber;
}
/**
 * For a given shell launch config, returns arguments to replace and an optional environment to
 * mixin to the SLC's environment to enable shell integration. This must be run within the context
 * that creates the process to ensure accuracy. Returns undefined if shell integration cannot be
 * enabled.
 */
export async function getShellIntegrationInjection(shellLaunchConfig, options, env, logService, productService, skipStickyBit = false) {
    // Conditionally disable shell integration arg injection
    // - The global setting is disabled
    // - There is no executable (not sure what script to run)
    // - The terminal is used by a feature like tasks or debugging
    const useWinpty = isWindows && (!options.windowsEnableConpty || getWindowsBuildNumber() < 18309);
    if (
    // The global setting is disabled
    !options.shellIntegration.enabled ||
        // There is no executable (so there's no way to determine how to inject)
        !shellLaunchConfig.executable ||
        // It's a feature terminal (tasks, debug), unless it's explicitly being forced
        (shellLaunchConfig.isFeatureTerminal && !shellLaunchConfig.forceShellIntegration) ||
        // The ignoreShellIntegration flag is passed (eg. relaunching without shell integration)
        shellLaunchConfig.ignoreShellIntegration ||
        // Winpty is unsupported
        useWinpty) {
        return undefined;
    }
    const originalArgs = shellLaunchConfig.args;
    const shell = process.platform === 'win32' ? path.basename(shellLaunchConfig.executable).toLowerCase() : path.basename(shellLaunchConfig.executable);
    const appRoot = path.dirname(FileAccess.asFileUri('').fsPath);
    let newArgs;
    const envMixin = {
        'VSCODE_INJECTION': '1'
    };
    if (options.shellIntegration.nonce) {
        envMixin['VSCODE_NONCE'] = options.shellIntegration.nonce;
    }
    if (shellLaunchConfig.shellIntegrationEnvironmentReporting) {
        if (isWindows) {
            const enableWindowsEnvReporting = options.windowsUseConptyDll || options.windowsEnableConpty && getWindowsBuildNumber() >= 22631 && shell !== 'bash.exe';
            if (enableWindowsEnvReporting) {
                envMixin['VSCODE_SHELL_ENV_REPORTING'] = '1';
            }
        }
        else {
            envMixin['VSCODE_SHELL_ENV_REPORTING'] = '1';
        }
    }
    // Windows
    if (isWindows) {
        if (shell === 'pwsh.exe' || shell === 'powershell.exe') {
            if (!originalArgs || arePwshImpliedArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.WindowsPwsh);
            }
            else if (arePwshLoginArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.WindowsPwshLogin);
            }
            if (!newArgs) {
                return undefined;
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot, '');
            envMixin['VSCODE_STABLE'] = productService.quality === 'stable' ? '1' : '0';
            if (options.shellIntegration.suggestEnabled) {
                envMixin['VSCODE_SUGGEST'] = '1';
            }
            return { newArgs, envMixin };
        }
        else if (shell === 'bash.exe') {
            if (!originalArgs || originalArgs.length === 0) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Bash);
            }
            else if (areZshBashFishLoginArgs(originalArgs)) {
                envMixin['VSCODE_SHELL_LOGIN'] = '1';
                addEnvMixinPathPrefix(options, envMixin, shell);
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Bash);
            }
            if (!newArgs) {
                return undefined;
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot);
            envMixin['VSCODE_STABLE'] = productService.quality === 'stable' ? '1' : '0';
            return { newArgs, envMixin };
        }
        logService.warn(`Shell integration cannot be enabled for executable "${shellLaunchConfig.executable}" and args`, shellLaunchConfig.args);
        return undefined;
    }
    // Linux & macOS
    switch (shell) {
        case 'bash': {
            if (!originalArgs || originalArgs.length === 0) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Bash);
            }
            else if (areZshBashFishLoginArgs(originalArgs)) {
                envMixin['VSCODE_SHELL_LOGIN'] = '1';
                addEnvMixinPathPrefix(options, envMixin, shell);
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Bash);
            }
            if (!newArgs) {
                return undefined;
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot);
            envMixin['VSCODE_STABLE'] = productService.quality === 'stable' ? '1' : '0';
            return { newArgs, envMixin };
        }
        case 'fish': {
            if (!originalArgs || originalArgs.length === 0) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Fish);
            }
            else if (areZshBashFishLoginArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.FishLogin);
            }
            else if (originalArgs === shellIntegrationArgs.get(ShellIntegrationExecutable.Fish) || originalArgs === shellIntegrationArgs.get(ShellIntegrationExecutable.FishLogin)) {
                newArgs = originalArgs;
            }
            if (!newArgs) {
                return undefined;
            }
            // On fish, '$fish_user_paths' is always prepended to the PATH, for both login and non-login shells, so we need
            // to apply the path prefix fix always, not only for login shells (see #232291)
            addEnvMixinPathPrefix(options, envMixin, shell);
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot);
            return { newArgs, envMixin };
        }
        case 'pwsh': {
            if (!originalArgs || arePwshImpliedArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Pwsh);
            }
            else if (arePwshLoginArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.PwshLogin);
            }
            if (!newArgs) {
                return undefined;
            }
            if (options.shellIntegration.suggestEnabled) {
                envMixin['VSCODE_SUGGEST'] = '1';
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot, '');
            envMixin['VSCODE_STABLE'] = productService.quality === 'stable' ? '1' : '0';
            return { newArgs, envMixin };
        }
        case 'zsh': {
            if (!originalArgs || originalArgs.length === 0) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Zsh);
            }
            else if (areZshBashFishLoginArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.ZshLogin);
                addEnvMixinPathPrefix(options, envMixin, shell);
            }
            else if (originalArgs === shellIntegrationArgs.get(ShellIntegrationExecutable.Zsh) || originalArgs === shellIntegrationArgs.get(ShellIntegrationExecutable.ZshLogin)) {
                newArgs = originalArgs;
            }
            if (!newArgs) {
                return undefined;
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot);
            // Move .zshrc into $ZDOTDIR as the way to activate the script
            let username;
            try {
                username = os.userInfo().username;
            }
            catch {
                username = 'unknown';
            }
            // Resolve the actual tmp directory so we can set the sticky bit
            const realTmpDir = realpathSync(os.tmpdir());
            const zdotdir = path.join(realTmpDir, `${username}-${productService.applicationName}-zsh`);
            // Set directory permissions using octal notation:
            // - 0o1700:
            // - Sticky bit is set, preventing non-owners from deleting or renaming files within this directory (1)
            // - Owner has full read (4), write (2), execute (1) permissions
            // - Group has no permissions (0)
            // - Others have no permissions (0)
            if (!skipStickyBit) {
                // skip for tests
                try {
                    const chmodAsync = promisify(chmod);
                    await chmodAsync(zdotdir, 0o1700);
                }
                catch (err) {
                    if (err.message.includes('ENOENT')) {
                        try {
                            mkdirSync(zdotdir);
                        }
                        catch (err) {
                            logService.error(`Failed to create zdotdir at ${zdotdir}: ${err}`);
                            return undefined;
                        }
                        try {
                            const chmodAsync = promisify(chmod);
                            await chmodAsync(zdotdir, 0o1700);
                        }
                        catch {
                            logService.error(`Failed to set sticky bit on ${zdotdir}: ${err}`);
                            return undefined;
                        }
                    }
                    logService.error(`Failed to set sticky bit on ${zdotdir}: ${err}`);
                    return undefined;
                }
            }
            envMixin['ZDOTDIR'] = zdotdir;
            const userZdotdir = env?.ZDOTDIR ?? os.homedir() ?? `~`;
            envMixin['USER_ZDOTDIR'] = userZdotdir;
            const filesToCopy = [];
            filesToCopy.push({
                source: path.join(appRoot, 'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-rc.zsh'),
                dest: path.join(zdotdir, '.zshrc')
            });
            filesToCopy.push({
                source: path.join(appRoot, 'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-profile.zsh'),
                dest: path.join(zdotdir, '.zprofile')
            });
            filesToCopy.push({
                source: path.join(appRoot, 'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-env.zsh'),
                dest: path.join(zdotdir, '.zshenv')
            });
            filesToCopy.push({
                source: path.join(appRoot, 'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-login.zsh'),
                dest: path.join(zdotdir, '.zlogin')
            });
            return { newArgs, envMixin, filesToCopy };
        }
    }
    logService.warn(`Shell integration cannot be enabled for executable "${shellLaunchConfig.executable}" and args`, shellLaunchConfig.args);
    return undefined;
}
/**
 * There are a few situations where some directories are added to the beginning of the PATH.
 * 1. On macOS when the profile calls path_helper.
 * 2. For fish terminals, which always prepend "$fish_user_paths" to the PATH.
 *
 * This causes significant problems for the environment variable
 * collection API as the custom paths added to the end will now be somewhere in the middle of
 * the PATH. To combat this, VSCODE_PATH_PREFIX is used to re-apply any prefix after the profile
 * has run. This will cause duplication in the PATH but should fix the issue.
 *
 * See #99878 for more information.
 */
function addEnvMixinPathPrefix(options, envMixin, shell) {
    if ((isMacintosh || shell === 'fish') && options.environmentVariableCollections) {
        // Deserialize and merge
        const deserialized = deserializeEnvironmentVariableCollections(options.environmentVariableCollections);
        const merged = new MergedEnvironmentVariableCollection(deserialized);
        // Get all prepend PATH entries
        const pathEntry = merged.getVariableMap({ workspaceFolder: options.workspaceFolder }).get('PATH');
        const prependToPath = [];
        if (pathEntry) {
            for (const mutator of pathEntry) {
                if (mutator.type === EnvironmentVariableMutatorType.Prepend) {
                    prependToPath.push(mutator.value);
                }
            }
        }
        // Add to the environment mixin to be applied in the shell integration script
        if (prependToPath.length > 0) {
            envMixin['VSCODE_PATH_PREFIX'] = prependToPath.join('');
        }
    }
}
var ShellIntegrationExecutable;
(function (ShellIntegrationExecutable) {
    ShellIntegrationExecutable["WindowsPwsh"] = "windows-pwsh";
    ShellIntegrationExecutable["WindowsPwshLogin"] = "windows-pwsh-login";
    ShellIntegrationExecutable["Pwsh"] = "pwsh";
    ShellIntegrationExecutable["PwshLogin"] = "pwsh-login";
    ShellIntegrationExecutable["Zsh"] = "zsh";
    ShellIntegrationExecutable["ZshLogin"] = "zsh-login";
    ShellIntegrationExecutable["Bash"] = "bash";
    ShellIntegrationExecutable["Fish"] = "fish";
    ShellIntegrationExecutable["FishLogin"] = "fish-login";
})(ShellIntegrationExecutable || (ShellIntegrationExecutable = {}));
const shellIntegrationArgs = new Map();
// The try catch swallows execution policy errors in the case of the archive distributable
shellIntegrationArgs.set(ShellIntegrationExecutable.WindowsPwsh, ['-noexit', '-command', 'try { . \"{0}\\out\\vs\\workbench\\contrib\\terminal\\common\\scripts\\shellIntegration.ps1\" } catch {}{1}']);
shellIntegrationArgs.set(ShellIntegrationExecutable.WindowsPwshLogin, ['-l', '-noexit', '-command', 'try { . \"{0}\\out\\vs\\workbench\\contrib\\terminal\\common\\scripts\\shellIntegration.ps1\" } catch {}{1}']);
shellIntegrationArgs.set(ShellIntegrationExecutable.Pwsh, ['-noexit', '-command', '. "{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.ps1"{1}']);
shellIntegrationArgs.set(ShellIntegrationExecutable.PwshLogin, ['-l', '-noexit', '-command', '. "{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.ps1"']);
shellIntegrationArgs.set(ShellIntegrationExecutable.Zsh, ['-i']);
shellIntegrationArgs.set(ShellIntegrationExecutable.ZshLogin, ['-il']);
shellIntegrationArgs.set(ShellIntegrationExecutable.Bash, ['--init-file', '{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh']);
shellIntegrationArgs.set(ShellIntegrationExecutable.Fish, ['--init-command', 'source "{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.fish"']);
shellIntegrationArgs.set(ShellIntegrationExecutable.FishLogin, ['-l', '--init-command', 'source "{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.fish"']);
const pwshLoginArgs = ['-login', '-l'];
const shLoginArgs = ['--login', '-l'];
const shInteractiveArgs = ['-i', '--interactive'];
const pwshImpliedArgs = ['-nol', '-nologo'];
function arePwshLoginArgs(originalArgs) {
    if (typeof originalArgs === 'string') {
        return pwshLoginArgs.includes(originalArgs.toLowerCase());
    }
    else {
        return originalArgs.length === 1 && pwshLoginArgs.includes(originalArgs[0].toLowerCase()) ||
            (originalArgs.length === 2 &&
                (((pwshLoginArgs.includes(originalArgs[0].toLowerCase())) || pwshLoginArgs.includes(originalArgs[1].toLowerCase())))
                && ((pwshImpliedArgs.includes(originalArgs[0].toLowerCase())) || pwshImpliedArgs.includes(originalArgs[1].toLowerCase())));
    }
}
function arePwshImpliedArgs(originalArgs) {
    if (typeof originalArgs === 'string') {
        return pwshImpliedArgs.includes(originalArgs.toLowerCase());
    }
    else {
        return originalArgs.length === 0 || originalArgs?.length === 1 && pwshImpliedArgs.includes(originalArgs[0].toLowerCase());
    }
}
function areZshBashFishLoginArgs(originalArgs) {
    if (typeof originalArgs !== 'string') {
        originalArgs = originalArgs.filter(arg => !shInteractiveArgs.includes(arg.toLowerCase()));
    }
    return originalArgs === 'string' && shLoginArgs.includes(originalArgs.toLowerCase())
        || typeof originalArgs !== 'string' && originalArgs.length === 1 && shLoginArgs.includes(originalArgs[0].toLowerCase());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9ub2RlL3Rlcm1pbmFsRW52aXJvbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxFQUF1QixXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0YsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFJekQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEYsT0FBTyxFQUFFLHlDQUF5QyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakcsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3BELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFakMsTUFBTSxVQUFVLHFCQUFxQjtJQUNwQyxNQUFNLFNBQVMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzlELElBQUksV0FBVyxHQUFXLENBQUMsQ0FBQztJQUM1QixJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFB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