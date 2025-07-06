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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlcm5hbFRlcm1pbmFsL25vZGUvZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JELE9BQU8sS0FBSyxHQUFHLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0UsT0FBTyxLQUFLLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRCxPQUFPLEtBQUssU0FBUyxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLG9CQUFvQixFQUE2RSxNQUFNLCtCQUErQixDQUFDO0FBR2hKLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFFeEUsTUFBZSx1QkFBdUI7SUFHckMsS0FBSyxDQUFDLDhCQUE4QjtRQUNuQyxPQUFPO1lBQ04sT0FBTyxFQUFFLDhCQUE4QixDQUFDLHlCQUF5QixFQUFFO1lBQ25FLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDLDRCQUE0QixFQUFFO1lBQ3hFLEdBQUcsRUFBRSxPQUFPO1NBQ1osQ0FBQztJQUNILENBQUM7Q0FDRDtB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