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
import * as cp from 'child_process';
import { memoize } from '../../../base/common/decorators.js';
import { FileAccess } from '../../../base/common/network.js';
import * as path from '../../../base/common/path.js';
import * as env from '../../../base/common/platform.js';
import { sanitizeProcessEnvironment } from '../../../base/common/processes.js';
import * as pfs from '../../../base/node/pfs.js';
import * as processes from '../../../base/node/processes.js';
import * as nls from '../../../nls.js';
import { DEFAULT_TERMINAL_OSX } from '../common/externalTerminal.js';
const TERMINAL_TITLE = nls.localize('console.title', "VS Code Console");
class ExternalTerminalService {
    async getDefaultTerminalForPlatforms() {
        return {
            windows: WindowsExternalTerminalService.getDefaultTerminalWindows(),
            linux: await LinuxExternalTerminalService.getDefaultTerminalLinuxReady(),
            osx: 'xterm'
        };
    }
}
export class WindowsExternalTerminalService extends ExternalTerminalService {
    static { this.CMD = 'cmd.exe'; }
    openTerminal(configuration, cwd) {
        return this.spawnTerminal(cp, configuration, processes.getWindowsShell(), cwd);
    }
    spawnTerminal(spawner, configuration, command, cwd) {
        const exec = configuration.windowsExec || WindowsExternalTerminalService.getDefaultTerminalWindows();
        // Make the drive letter uppercase on Windows (see #9448)
        if (cwd && cwd[1] === ':') {
            cwd = cwd[0].toUpperCase() + cwd.substr(1);
        }
        // cmder ignores the environment cwd and instead opts to always open in %USERPROFILE%
        // unless otherwise specified
        const basename = path.basename(exec, '.exe').toLowerCase();
        if (basename === 'cmder') {
            spawner.spawn(exec, cwd ? [cwd] : undefined);
            return Promise.resolve(undefined);
        }
        const cmdArgs = ['/c', 'start', '/wait'];
        if (exec.indexOf(' ') >= 0) {
            // The "" argument is the window title. Without this, exec doesn't work when the path
            // contains spaces. #6590
            // Title is Execution Path. #220129
            cmdArgs.push(exec);
        }
        cmdArgs.push(exec);
        // Add starting directory parameter for Windows Terminal (see #90734)
        if (basename === 'wt') {
            cmdArgs.push('-d .');
        }
        return new Promise((c, e) => {
            const env = getSanitizedEnvironment(process);
            const child = spawner.spawn(command, cmdArgs, { cwd, env, detached: true });
            child.on('error', e);
            child.on('exit', () => c());
        });
    }
    async runInTerminal(title, dir, args, envVars, settings) {
        const exec = 'windowsExec' in settings && settings.windowsExec ? settings.windowsExec : WindowsExternalTerminalService.getDefaultTerminalWindows();
        const wt = await WindowsExternalTerminalService.getWtExePath();
        return new Promise((resolve, reject) => {
            const title = `"${dir} - ${TERMINAL_TITLE}"`;
            const command = `"${args.join('" "')}" & pause`; // use '|' to only pause on non-zero exit code
            // merge environment variables into a copy of the process.env
            const env = Object.assign({}, getSanitizedEnvironment(process), envVars);
            // delete environment variables that have a null value
            Object.keys(env).filter(v => env[v] === null).forEach(key => delete env[key]);
            const options = {
                cwd: dir,
                env: env,
                windowsVerbatimArguments: true
            };
            let spawnExec;
            let cmdArgs;
            if (path.basename(exec, '.exe') === 'wt') {
                // Handle Windows Terminal specially; -d to set the cwd and run a cmd.exe instance
                // inside it
                spawnExec = exec;
                cmdArgs = ['-d', '.', WindowsExternalTerminalService.CMD, '/c', command];
            }
            else if (wt) {
                // prefer to use the window terminal to spawn if it's available instead
                // of start, since that allows ctrl+c handling (#81322)
                spawnExec = wt;
                cmdArgs = ['-d', '.', exec, '/c', command];
            }
            else {
                spawnExec = WindowsExternalTerminalService.CMD;
                cmdArgs = ['/c', 'start', title, '/wait', exec, '/c', `"${command}"`];
            }
            const cmd = cp.spawn(spawnExec, cmdArgs, options);
            cmd.on('error', err => {
                reject(improveError(err));
            });
            resolve(undefined);
        });
    }
    static getDefaultTerminalWindows() {
        if (!WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS) {
            const isWoW64 = !!process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
            WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS = `${process.env.windir ? process.env.windir : 'C:\\Windows'}\\${isWoW64 ? 'Sysnative' : 'System32'}\\cmd.exe`;
        }
        return WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS;
    }
    static async getWtExePath() {
        try {
            return await processes.findExecutable('wt');
        }
        catch {
            return undefined;
        }
    }
}
__decorate([
    memoize
], WindowsExternalTerminalService, "getWtExePath", null);
export class MacExternalTerminalService extends ExternalTerminalService {
    static { this.OSASCRIPT = '/usr/bin/osascript'; } // osascript is the AppleScript interpreter on OS X
    openTerminal(configuration, cwd) {
        return this.spawnTerminal(cp, configuration, cwd);
    }
    runInTerminal(title, dir, args, envVars, settings) {
        const terminalApp = settings.osxExec || DEFAULT_TERMINAL_OSX;
        return new Promise((resolve, reject) => {
            if (terminalApp === DEFAULT_TERMINAL_OSX || terminalApp === 'iTerm.app') {
                // On OS X we launch an AppleScript that creates (or reuses) a Terminal window
                // and then launches the program inside that window.
                const script = terminalApp === DEFAULT_TERMINAL_OSX ? 'TerminalHelper' : 'iTermHelper';
                const scriptpath = FileAccess.asFileUri(`vs/workbench/contrib/externalTerminal/node/${script}.scpt`).fsPath;
                const osaArgs = [
                    scriptpath,
                    '-t', title || TERMINAL_TITLE,
                    '-w', dir,
                ];
                for (const a of args) {
                    osaArgs.push('-a');
                    osaArgs.push(a);
                }
                if (envVars) {
                    // merge environment variables into a copy of the process.env
                    const env = Object.assign({}, getSanitizedEnvironment(process), envVars);
                    for (const key in env) {
                        const value = env[key];
                        if (value === null) {
                            osaArgs.push('-u');
                            osaArgs.push(key);
                        }
                        else {
                            osaArgs.push('-e');
                            osaArgs.push(`${key}=${value}`);
                        }
                    }
                }
                let stderr = '';
                const osa = cp.spawn(MacExternalTerminalService.OSASCRIPT, osaArgs);
                osa.on('error', err => {
                    reject(improveError(err));
                });
                osa.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                osa.on('exit', (code) => {
                    if (code === 0) { // OK
                        resolve(undefined);
                    }
                    else {
                        if (stderr) {
                            const lines = stderr.split('\n', 1);
                            reject(new Error(lines[0]));
                        }
                        else {
                            reject(new Error(nls.localize('mac.terminal.script.failed', "Script '{0}' failed with exit code {1}", script, code)));
                        }
                    }
                });
            }
            else {
                reject(new Error(nls.localize('mac.terminal.type.not.supported', "'{0}' not supported", terminalApp)));
            }
        });
    }
    spawnTerminal(spawner, configuration, cwd) {
        const terminalApp = configuration.osxExec || DEFAULT_TERMINAL_OSX;
        return new Promise((c, e) => {
            const args = ['-a', terminalApp];
            if (cwd) {
                args.push(cwd);
            }
            const env = getSanitizedEnvironment(process);
            const child = spawner.spawn('/usr/bin/open', args, { cwd, env });
            child.on('error', e);
            child.on('exit', () => c());
        });
    }
}
export class LinuxExternalTerminalService extends ExternalTerminalService {
    static { this.WAIT_MESSAGE = nls.localize('press.any.key', "Press any key to continue..."); }
    openTerminal(configuration, cwd) {
        return this.spawnTerminal(cp, configuration, cwd);
    }
    runInTerminal(title, dir, args, envVars, settings) {
        const execPromise = settings.linuxExec ? Promise.resolve(settings.linuxExec) : LinuxExternalTerminalService.getDefaultTerminalLinuxReady();
        return new Promise((resolve, reject) => {
            const termArgs = [];
            //termArgs.push('--title');
            //termArgs.push(`"${TERMINAL_TITLE}"`);
            execPromise.then(exec => {
                if (exec.indexOf('gnome-terminal') >= 0) {
                    termArgs.push('-x');
                }
                else {
                    termArgs.push('-e');
                }
                termArgs.push('bash');
                termArgs.push('-c');
                const bashCommand = `${quote(args)}; echo; read -p "${LinuxExternalTerminalService.WAIT_MESSAGE}" -n1;`;
                termArgs.push(`''${bashCommand}''`); // wrapping argument in two sets of ' because node is so "friendly" that it removes one set...
                // merge environment variables into a copy of the process.env
                const env = Object.assign({}, getSanitizedEnvironment(process), envVars);
                // delete environment variables that have a null value
                Object.keys(env).filter(v => env[v] === null).forEach(key => delete env[key]);
                const options = {
                    cwd: dir,
                    env: env
                };
                let stderr = '';
                const cmd = cp.spawn(exec, termArgs, options);
                cmd.on('error', err => {
                    reject(improveError(err));
                });
                cmd.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                cmd.on('exit', (code) => {
                    if (code === 0) { // OK
                        resolve(undefined);
                    }
                    else {
                        if (stderr) {
                            const lines = stderr.split('\n', 1);
                            reject(new Error(lines[0]));
                        }
                        else {
                            reject(new Error(nls.localize('linux.term.failed', "'{0}' failed with exit code {1}", exec, code)));
                        }
                    }
                });
            });
        });
    }
    static async getDefaultTerminalLinuxReady() {
        if (!LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY) {
            if (!env.isLinux) {
                LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY = Promise.resolve('xterm');
            }
            else {
                const isDebian = await pfs.Promises.exists('/etc/debian_version');
                LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY = new Promise(r => {
                    if (isDebian) {
                        r('x-terminal-emulator');
                    }
                    else if (process.env.DESKTOP_SESSION === 'gnome' || process.env.DESKTOP_SESSION === 'gnome-classic') {
                        r('gnome-terminal');
                    }
                    else if (process.env.DESKTOP_SESSION === 'kde-plasma') {
                        r('konsole');
                    }
                    else if (process.env.COLORTERM) {
                        r(process.env.COLORTERM);
                    }
                    else if (process.env.TERM) {
                        r(process.env.TERM);
                    }
                    else {
                        r('xterm');
                    }
                });
            }
        }
        return LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY;
    }
    spawnTerminal(spawner, configuration, cwd) {
        const execPromise = configuration.linuxExec ? Promise.resolve(configuration.linuxExec) : LinuxExternalTerminalService.getDefaultTerminalLinuxReady();
        return new Promise((c, e) => {
            execPromise.then(exec => {
                const env = getSanitizedEnvironment(process);
                const child = spawner.spawn(exec, [], { cwd, env });
                child.on('error', e);
                child.on('exit', () => c());
            });
        });
    }
}
function getSanitizedEnvironment(process) {
    const env = { ...process.env };
    sanitizeProcessEnvironment(env);
    return env;
}
/**
 * tries to turn OS errors into more meaningful error messages
 */
function improveError(err) {
    if ('errno' in err && err['errno'] === 'ENOENT' && 'path' in err && typeof err['path'] === 'string') {
        return new Error(nls.localize('ext.term.app.not.found', "can't find terminal application '{0}'", err['path']));
    }
    return err;
}
/**
 * Quote args if necessary and combine into a space separated string.
 */
function quote(args) {
    let r = '';
    for (const a of args) {
        if (a.indexOf(' ') >= 0) {
            r += '"' + a + '"';
        }
        else {
            r += a;
        }
        r += ' ';
    }
    return r;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZXJuYWxUZXJtaW5hbC9ub2RlL2V4dGVybmFsVGVybWluYWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEtBQUssR0FBRyxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9FLE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUM7QUFDakQsT0FBTyxLQUFLLFNBQVMsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxvQkFBb0IsRUFBNkUsTUFBTSwrQkFBK0IsQ0FBQztBQUdoSixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBRXhFLE1BQWUsdUJBQXVCO0lBR3JDLEtBQUssQ0FBQyw4QkFBOEI7UUFDbkMsT0FBTztZQUNOLE9BQU8sRUFBRSw4QkFBOEIsQ0FBQyx5QkFBeUIsRUFBRTtZQUNuRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQyw0QkFBNEIsRUFBRTtZQUN4RSxHQUFHLEVBQUUsT0FBTztTQUNaLENBQUM7SUFDSCxDQUFDO0NBQ0Q7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