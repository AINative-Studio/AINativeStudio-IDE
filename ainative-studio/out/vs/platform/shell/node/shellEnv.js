/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { spawn } from 'child_process';
import { basename } from '../../../base/common/path.js';
import { localize } from '../../../nls.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { CancellationError, isCancellationError } from '../../../base/common/errors.js';
import { isWindows, OS } from '../../../base/common/platform.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { getSystemShell } from '../../../base/node/shell.js';
import { isLaunchedFromCli } from '../../environment/node/argvHelper.js';
import { Promises } from '../../../base/common/async.js';
import { clamp } from '../../../base/common/numbers.js';
let unixShellEnvPromise = undefined;
/**
 * Resolves the shell environment by spawning a shell. This call will cache
 * the shell spawning so that subsequent invocations use that cached result.
 *
 * Will throw an error if:
 * - we hit a timeout of `MAX_SHELL_RESOLVE_TIME`
 * - any other error from spawning a shell to figure out the environment
 */
export async function getResolvedShellEnv(configurationService, logService, args, env) {
    // Skip if --force-disable-user-env
    if (args['force-disable-user-env']) {
        logService.trace('resolveShellEnv(): skipped (--force-disable-user-env)');
        return {};
    }
    // Skip on windows
    else if (isWindows) {
        logService.trace('resolveShellEnv(): skipped (Windows)');
        return {};
    }
    // Skip if running from CLI already
    else if (isLaunchedFromCli(env) && !args['force-user-env']) {
        logService.trace('resolveShellEnv(): skipped (VSCODE_CLI is set)');
        return {};
    }
    // Otherwise resolve (macOS, Linux)
    else {
        if (isLaunchedFromCli(env)) {
            logService.trace('resolveShellEnv(): running (--force-user-env)');
        }
        else {
            logService.trace('resolveShellEnv(): running (macOS/Linux)');
        }
        // Call this only once and cache the promise for
        // subsequent calls since this operation can be
        // expensive (spawns a process).
        if (!unixShellEnvPromise) {
            unixShellEnvPromise = Promises.withAsyncBody(async (resolve, reject) => {
                const cts = new CancellationTokenSource();
                let timeoutValue = 10000; // default to 10 seconds
                const configuredTimeoutValue = configurationService.getValue('application.shellEnvironmentResolutionTimeout');
                if (typeof configuredTimeoutValue === 'number') {
                    timeoutValue = clamp(configuredTimeoutValue, 1, 120) * 1000 /* convert from seconds */;
                }
                // Give up resolving shell env after some time
                const timeout = setTimeout(() => {
                    cts.dispose(true);
                    reject(new Error(localize('resolveShellEnvTimeout', "Unable to resolve your shell environment in a reasonable time. Please review your shell configuration and restart.")));
                }, timeoutValue);
                // Resolve shell env and handle errors
                try {
                    resolve(await doResolveUnixShellEnv(logService, cts.token));
                }
                catch (error) {
                    if (!isCancellationError(error) && !cts.token.isCancellationRequested) {
                        reject(new Error(localize('resolveShellEnvError', "Unable to resolve your shell environment: {0}", toErrorMessage(error))));
                    }
                    else {
                        resolve({});
                    }
                }
                finally {
                    clearTimeout(timeout);
                    cts.dispose();
                }
            });
        }
        return unixShellEnvPromise;
    }
}
async function doResolveUnixShellEnv(logService, token) {
    const runAsNode = process.env['ELECTRON_RUN_AS_NODE'];
    logService.trace('getUnixShellEnvironment#runAsNode', runAsNode);
    const noAttach = process.env['ELECTRON_NO_ATTACH_CONSOLE'];
    logService.trace('getUnixShellEnvironment#noAttach', noAttach);
    const mark = generateUuid().replace(/-/g, '').substr(0, 12);
    const regex = new RegExp(mark + '({.*})' + mark);
    const env = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        ELECTRON_NO_ATTACH_CONSOLE: '1',
        VSCODE_RESOLVING_ENVIRONMENT: '1'
    };
    logService.trace('getUnixShellEnvironment#env', env);
    const systemShellUnix = await getSystemShell(OS, env);
    logService.trace('getUnixShellEnvironment#shell', systemShellUnix);
    return new Promise((resolve, reject) => {
        if (token.isCancellationRequested) {
            return reject(new CancellationError());
        }
        // handle popular non-POSIX shells
        const name = basename(systemShellUnix);
        let command, shellArgs;
        const extraArgs = '';
        if (/^(?:pwsh|powershell)(?:-preview)?$/.test(name)) {
            // Older versions of PowerShell removes double quotes sometimes so we use "double single quotes" which is how
            // you escape single quotes inside of a single quoted string.
            command = `& '${process.execPath}' ${extraArgs} -p '''${mark}'' + JSON.stringify(process.env) + ''${mark}'''`;
            shellArgs = ['-Login', '-Command'];
        }
        else if (name === 'nu') { // nushell requires ^ before quoted path to treat it as a command
            command = `^'${process.execPath}' ${extraArgs} -p '"${mark}" + JSON.stringify(process.env) + "${mark}"'`;
            shellArgs = ['-i', '-l', '-c'];
        }
        else if (name === 'xonsh') { // #200374: native implementation is shorter
            command = `import os, json; print("${mark}", json.dumps(dict(os.environ)), "${mark}")`;
            shellArgs = ['-i', '-l', '-c'];
        }
        else {
            command = `'${process.execPath}' ${extraArgs} -p '"${mark}" + JSON.stringify(process.env) + "${mark}"'`;
            if (name === 'tcsh' || name === 'csh') {
                shellArgs = ['-ic'];
            }
            else {
                shellArgs = ['-i', '-l', '-c'];
            }
        }
        logService.trace('getUnixShellEnvironment#spawn', JSON.stringify(shellArgs), command);
        const child = spawn(systemShellUnix, [...shellArgs, command], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env
        });
        token.onCancellationRequested(() => {
            child.kill();
            return reject(new CancellationError());
        });
        child.on('error', err => {
            logService.error('getUnixShellEnvironment#errorChildProcess', toErrorMessage(err));
            reject(err);
        });
        const buffers = [];
        child.stdout.on('data', b => buffers.push(b));
        const stderr = [];
        child.stderr.on('data', b => stderr.push(b));
        child.on('close', (code, signal) => {
            const raw = Buffer.concat(buffers).toString('utf8');
            logService.trace('getUnixShellEnvironment#raw', raw);
            const stderrStr = Buffer.concat(stderr).toString('utf8');
            if (stderrStr.trim()) {
                logService.trace('getUnixShellEnvironment#stderr', stderrStr);
            }
            if (code || signal) {
                return reject(new Error(localize('resolveShellEnvExitError', "Unexpected exit code from spawned shell (code {0}, signal {1})", code, signal)));
            }
            const match = regex.exec(raw);
            const rawStripped = match ? match[1] : '{}';
            try {
                const env = JSON.parse(rawStripped);
                if (runAsNode) {
                    env['ELECTRON_RUN_AS_NODE'] = runAsNode;
                }
                else {
                    delete env['ELECTRON_RUN_AS_NODE'];
                }
                if (noAttach) {
                    env['ELECTRON_NO_ATTACH_CONSOLE'] = noAttach;
                }
                else {
                    delete env['ELECTRON_NO_ATTACH_CONSOLE'];
                }
                delete env['VSCODE_RESOLVING_ENVIRONMENT'];
                // https://github.com/microsoft/vscode/issues/22593#issuecomment-336050758
                delete env['XDG_RUNTIME_DIR'];
                logService.trace('getUnixShellEnvironment#result', env);
                resolve(env);
            }
            catch (err) {
                logService.error('getUnixShellEnvironment#errorCaught', toErrorMessage(err));
                reject(err);
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxFbnYuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc2hlbGwvbm9kZS9zaGVsbEVudi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RixPQUFPLEVBQXVCLFNBQVMsRUFBRSxFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFeEQsSUFBSSxtQkFBbUIsR0FBNEMsU0FBUyxDQUFDO0FBRTdFOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUFDLG9CQUEyQyxFQUFFLFVBQXVCLEVBQUUsSUFBc0IsRUFBRSxHQUF3QjtJQUUvSixtQ0FBbUM7SUFDbkMsSUFBSSxJQUFJ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