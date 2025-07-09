/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { spawn } from 'child_process';
import { chmodSync, existsSync, readFileSync, statSync, truncateSync, unlinkSync } from 'fs';
import { homedir, release, tmpdir } from 'os';
import { Event } from '../../base/common/event.js';
import { isAbsolute, resolve, join, dirname } from '../../base/common/path.js';
import { isMacintosh, isWindows } from '../../base/common/platform.js';
import { randomPort } from '../../base/common/ports.js';
import { whenDeleted, writeFileSync } from '../../base/node/pfs.js';
import { findFreePort } from '../../base/node/ports.js';
import { watchFileContents } from '../../platform/files/node/watcher/nodejs/nodejsWatcherLib.js';
import { buildHelpMessage, buildVersionMessage, NATIVE_CLI_COMMANDS, OPTIONS } from '../../platform/environment/node/argv.js';
import { addArg, parseCLIProcessArgv } from '../../platform/environment/node/argvHelper.js';
import { getStdinFilePath, hasStdinWithoutTty, readFromStdin, stdinDataListener } from '../../platform/environment/node/stdin.js';
import { createWaitMarkerFileSync } from '../../platform/environment/node/wait.js';
import product from '../../platform/product/common/product.js';
import { CancellationTokenSource } from '../../base/common/cancellation.js';
import { isUNC, randomPath } from '../../base/common/extpath.js';
import { Utils } from '../../platform/profiling/common/profiling.js';
import { FileAccess } from '../../base/common/network.js';
import { cwd } from '../../base/common/process.js';
import { addUNCHostToAllowlist } from '../../base/node/unc.js';
import { URI } from '../../base/common/uri.js';
import { DeferredPromise } from '../../base/common/async.js';
function shouldSpawnCliProcess(argv) {
    return !!argv['install-source']
        || !!argv['list-extensions']
        || !!argv['install-extension']
        || !!argv['uninstall-extension']
        || !!argv['update-extensions']
        || !!argv['locate-extension']
        || !!argv['add-mcp']
        || !!argv['telemetry'];
}
export async function main(argv) {
    let args;
    try {
        args = parseCLIProcessArgv(argv);
    }
    catch (err) {
        console.error(err.message);
        return;
    }
    for (const subcommand of NATIVE_CLI_COMMANDS) {
        if (args[subcommand]) {
            if (!product.tunnelApplicationName) {
                console.error(`'${subcommand}' command not supported in ${product.applicationName}`);
                return;
            }
            const env = {
                ...process.env
            };
            // bootstrap-esm.js determines the electron environment based
            // on the following variable. For the server we need to unset
            // it to prevent importing any electron specific modules.
            // Refs https://github.com/microsoft/vscode/issues/221883
            delete env['ELECTRON_RUN_AS_NODE'];
            const tunnelArgs = argv.slice(argv.indexOf(subcommand) + 1); // all arguments behind `tunnel`
            return new Promise((resolve, reject) => {
                let tunnelProcess;
                const stdio = ['ignore', 'pipe', 'pipe'];
                if (process.env['VSCODE_DEV']) {
                    tunnelProcess = spawn('cargo', ['run', '--', subcommand, ...tunnelArgs], { cwd: join(getAppRoot(), 'cli'), stdio, env });
                }
                else {
                    const appPath = process.platform === 'darwin'
                        // ./Contents/MacOS/Electron => ./Contents/Resources/app/bin/code-tunnel-insiders
                        ? join(dirname(dirname(process.execPath)), 'Resources', 'app')
                        : dirname(process.execPath);
                    const tunnelCommand = join(appPath, 'bin', `${product.tunnelApplicationName}${isWindows ? '.exe' : ''}`);
                    tunnelProcess = spawn(tunnelCommand, [subcommand, ...tunnelArgs], { cwd: cwd(), stdio, env });
                }
                tunnelProcess.stdout.pipe(process.stdout);
                tunnelProcess.stderr.pipe(process.stderr);
                tunnelProcess.on('exit', resolve);
                tunnelProcess.on('error', reject);
            });
        }
    }
    // Help
    if (args.help) {
        const executable = `${product.applicationName}${isWindows ? '.exe' : ''}`;
        console.log(buildHelpMessage(product.nameLong, executable, product.version, OPTIONS));
    }
    // Version Info
    else if (args.version) {
        console.log(buildVersionMessage(product.version, product.commit));
    }
    // Shell integration
    else if (args['locate-shell-integration-path']) {
        let file;
        switch (args['locate-shell-integration-path']) {
            // Usage: `[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"`
            case 'bash':
                file = 'shellIntegration-bash.sh';
                break;
            // Usage: `if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }`
            case 'pwsh':
                file = 'shellIntegration.ps1';
                break;
            // Usage: `[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path zsh)"`
            case 'zsh':
                file = 'shellIntegration-rc.zsh';
                break;
            // Usage: `string match -q "$TERM_PROGRAM" "vscode"; and . (code --locate-shell-integration-path fish)`
            case 'fish':
                file = 'shellIntegration.fish';
                break;
            default: throw new Error('Error using --locate-shell-integration-path: Invalid shell type');
        }
        console.log(join(getAppRoot(), 'out', 'vs', 'workbench', 'contrib', 'terminal', 'common', 'scripts', file));
    }
    // Extensions Management
    else if (shouldSpawnCliProcess(args)) {
        // We do not bundle `cliProcessMain.js` into this file because
        // it is rather large and only needed for very few CLI operations.
        // This has the downside that we need to know if we run OSS or
        // built, because our location on disk is different if built.
        let cliProcessMain;
        if (process.env['VSCODE_DEV']) {
            cliProcessMain = './cliProcessMain.js';
        }
        else {
            cliProcessMain = './vs/code/node/cliProcessMain.js';
        }
        const cli = await import(cliProcessMain);
        await cli.main(args);
        return;
    }
    // Write File
    else if (args['file-write']) {
        const argsFile = args._[0];
        if (!argsFile || !isAbsolute(argsFile) || !existsSync(argsFile) || !statSync(argsFile).isFile()) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        let source;
        let target;
        try {
            const argsContents = JSON.parse(readFileSync(argsFile, 'utf8'));
            source = argsContents.source;
            target = argsContents.target;
        }
        catch (error) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        // Windows: set the paths as allowed UNC paths given
        // they are explicitly provided by the user as arguments
        if (isWindows) {
            for (const path of [source, target]) {
                if (typeof path === 'string' && isUNC(path)) {
                    addUNCHostToAllowlist(URI.file(path).authority);
                }
            }
        }
        // Validate
        if (!source || !target || source === target || // make sure source and target are provided and are not the same
            !isAbsolute(source) || !isAbsolute(target) || // make sure both source and target are absolute paths
            !existsSync(source) || !statSync(source).isFile() || // make sure source exists as file
            !existsSync(target) || !statSync(target).isFile() // make sure target exists as file
        ) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        try {
            // Check for readonly status and chmod if so if we are told so
            let targetMode = 0;
            let restoreMode = false;
            if (!!args['file-chmod']) {
                targetMode = statSync(target).mode;
                if (!(targetMode & 0o200 /* File mode indicating writable by owner */)) {
                    chmodSync(target, targetMode | 0o200);
                    restoreMode = true;
                }
            }
            // Write source to target
            const data = readFileSync(source);
            if (isWindows) {
                // On Windows we use a different strategy of saving the file
                // by first truncating the file and then writing with r+ mode.
                // This helps to save hidden files on Windows
                // (see https://github.com/microsoft/vscode/issues/931) and
                // prevent removing alternate data streams
                // (see https://github.com/microsoft/vscode/issues/6363)
                truncateSync(target, 0);
                writeFileSync(target, data, { flag: 'r+' });
            }
            else {
                writeFileSync(target, data);
            }
            // Restore previous mode as needed
            if (restoreMode) {
                chmodSync(target, targetMode);
            }
        }
        catch (error) {
            error.message = `Error using --file-write: ${error.message}`;
            throw error;
        }
    }
    // Just Code
    else {
        const env = {
            ...process.env,
            'ELECTRON_NO_ATTACH_CONSOLE': '1'
        };
        delete env['ELECTRON_RUN_AS_NODE'];
        const processCallbacks = [];
        if (args.verbose) {
            env['ELECTRON_ENABLE_LOGGING'] = '1';
        }
        if (args.verbose || args.status) {
            processCallbacks.push(async (child) => {
                child.stdout?.on('data', (data) => console.log(data.toString('utf8').trim()));
                child.stderr?.on('data', (data) => console.log(data.toString('utf8').trim()));
                await Event.toPromise(Event.fromNodeEventEmitter(child, 'exit'));
            });
        }
        const hasReadStdinArg = args._.some(arg => arg === '-');
        if (hasReadStdinArg) {
            // remove the "-" argument when we read from stdin
            args._ = args._.filter(a => a !== '-');
            argv = argv.filter(a => a !== '-');
        }
        let stdinFilePath;
        if (hasStdinWithoutTty()) {
            // Read from stdin: we require a single "-" argument to be passed in order to start reading from
            // stdin. We do this because there is no reliable way to find out if data is piped to stdin. Just
            // checking for stdin being connected to a TTY is not enough (https://github.com/microsoft/vscode/issues/40351)
            if (hasReadStdinArg) {
                stdinFilePath = getStdinFilePath();
                try {
                    const readFromStdinDone = new DeferredPromise();
                    await readFromStdin(stdinFilePath, !!args.verbose, () => readFromStdinDone.complete());
                    if (!args.wait) {
                        // if `--wait` is not provided, we keep this process alive
                        // for at least as long as the stdin stream is open to
                        // ensure that we read all the data.
                        // the downside is that the Code CLI process will then not
                        // terminate until stdin is closed, but users can always
                        // pass `--wait` to prevent that from happening (this is
                        // actually what we enforced until v1.85.x but then was
                        // changed to not enforce it anymore).
                        // a solution in the future would possibly be to exit, when
                        // the Code process exits. this would require some careful
                        // solution though in case Code is already running and this
                        // is a second instance telling the first instance what to
                        // open.
                        processCallbacks.push(() => readFromStdinDone.p);
                    }
                    // Make sure to open tmp file as editor but ignore it in the "recently open" list
                    addArg(argv, stdinFilePath);
                    addArg(argv, '--skip-add-to-recently-opened');
                    console.log(`Reading from stdin via: ${stdinFilePath}`);
                }
                catch (e) {
                    console.log(`Failed to create file to read via stdin: ${e.toString()}`);
                    stdinFilePath = undefined;
                }
            }
            else {
                // If the user pipes data via stdin but forgot to add the "-" argument, help by printing a message
                // if we detect that data flows into via stdin after a certain timeout.
                processCallbacks.push(_ => stdinDataListener(1000).then(dataReceived => {
                    if (dataReceived) {
                        if (isWindows) {
                            console.log(`Run with '${product.applicationName} -' to read output from another program (e.g. 'echo Hello World | ${product.applicationName} -').`);
                        }
                        else {
                            console.log(`Run with '${product.applicationName} -' to read from stdin (e.g. 'ps aux | grep code | ${product.applicationName} -').`);
                        }
                    }
                }));
            }
        }
        const isMacOSBigSurOrNewer = isMacintosh && release() > '20.0.0';
        // If we are started with --wait create a random temporary file
        // and pass it over to the starting instance. We can use this file
        // to wait for it to be deleted to monitor that the edited file
        // is closed and then exit the waiting process.
        let waitMarkerFilePath;
        if (args.wait) {
            waitMarkerFilePath = createWaitMarkerFileSync(args.verbose);
            if (waitMarkerFilePath) {
                addArg(argv, '--waitMarkerFilePath', waitMarkerFilePath);
            }
            // When running with --wait, we want to continue running CLI process
            // until either:
            // - the wait marker file has been deleted (e.g. when closing the editor)
            // - the launched process terminates (e.g. due to a crash)
            processCallbacks.push(async (child) => {
                let childExitPromise;
                if (isMacOSBigSurOrNewer) {
                    // On Big Sur, we resolve the following promise only when the child,
                    // i.e. the open command, exited with a signal or error. Otherwise, we
                    // wait for the marker file to be deleted or for the child to error.
                    childExitPromise = new Promise(resolve => {
                        // Only resolve this promise if the child (i.e. open) exited with an error
                        child.on('exit', (code, signal) => {
                            if (code !== 0 || signal) {
                                resolve();
                            }
                        });
                    });
                }
                else {
                    // On other platforms, we listen for exit in case the child exits before the
                    // marker file is deleted.
                    childExitPromise = Event.toPromise(Event.fromNodeEventEmitter(child, 'exit'));
                }
                try {
                    await Promise.race([
                        whenDeleted(waitMarkerFilePath),
                        Event.toPromise(Event.fromNodeEventEmitter(child, 'error')),
                        childExitPromise
                    ]);
                }
                finally {
                    if (stdinFilePath) {
                        unlinkSync(stdinFilePath); // Make sure to delete the tmp stdin file if we have any
                    }
                }
            });
        }
        // If we have been started with `--prof-startup` we need to find free ports to profile
        // the main process, the renderer, and the extension host. We also disable v8 cached data
        // to get better profile traces. Last, we listen on stdout for a signal that tells us to
        // stop profiling.
        if (args['prof-startup']) {
            const profileHost = '127.0.0.1';
            const portMain = await findFreePort(randomPort(), 10, 3000);
            const portRenderer = await findFreePort(portMain + 1, 10, 3000);
            const portExthost = await findFreePort(portRenderer + 1, 10, 3000);
            // fail the operation when one of the ports couldn't be acquired.
            if (portMain * portRenderer * portExthost === 0) {
                throw new Error('Failed to find free ports for profiler. Make sure to shutdown all instances of the editor first.');
            }
            const filenamePrefix = randomPath(homedir(), 'prof');
            addArg(argv, `--inspect-brk=${profileHost}:${portMain}`);
            addArg(argv, `--remote-debugging-port=${profileHost}:${portRenderer}`);
            addArg(argv, `--inspect-brk-extensions=${profileHost}:${portExthost}`);
            addArg(argv, `--prof-startup-prefix`, filenamePrefix);
            addArg(argv, `--no-cached-data`);
            writeFileSync(filenamePrefix, argv.slice(-6).join('|'));
            processCallbacks.push(async (_child) => {
                class Profiler {
                    static async start(name, filenamePrefix, opts) {
                        const profiler = await import('v8-inspect-profiler');
                        let session;
                        try {
                            session = await profiler.startProfiling({ ...opts, host: profileHost });
                        }
                        catch (err) {
                            console.error(`FAILED to start profiling for '${name}' on port '${opts.port}'`);
                        }
                        return {
                            async stop() {
                                if (!session) {
                                    return;
                                }
                                let suffix = '';
                                const result = await session.stop();
                                if (!process.env['VSCODE_DEV']) {
                                    // when running from a not-development-build we remove
                                    // absolute filenames because we don't want to reveal anything
                                    // about users. We also append the `.txt` suffix to make it
                                    // easier to attach these files to GH issues
                                    result.profile = Utils.rewriteAbsolutePaths(result.profile, 'piiRemoved');
                                    suffix = '.txt';
                                }
                                writeFileSync(`${filenamePrefix}.${name}.cpuprofile${suffix}`, JSON.stringify(result.profile, undefined, 4));
                            }
                        };
                    }
                }
                try {
                    // load and start profiler
                    const mainProfileRequest = Profiler.start('main', filenamePrefix, { port: portMain });
                    const extHostProfileRequest = Profiler.start('extHost', filenamePrefix, { port: portExthost, tries: 300 });
                    const rendererProfileRequest = Profiler.start('renderer', filenamePrefix, {
                        port: portRenderer,
                        tries: 200,
                        target: function (targets) {
                            return targets.filter(target => {
                                if (!target.webSocketDebuggerUrl) {
                                    return false;
                                }
                                if (target.type === 'page') {
                                    return target.url.indexOf('workbench/workbench.html') > 0 || target.url.indexOf('workbench/workbench-dev.html') > 0;
                                }
                                else {
                                    return true;
                                }
                            })[0];
                        }
                    });
                    const main = await mainProfileRequest;
                    const extHost = await extHostProfileRequest;
                    const renderer = await rendererProfileRequest;
                    // wait for the renderer to delete the marker file
                    await whenDeleted(filenamePrefix);
                    // stop profiling
                    await main.stop();
                    await renderer.stop();
                    await extHost.stop();
                    // re-create the marker file to signal that profiling is done
                    writeFileSync(filenamePrefix, '');
                }
                catch (e) {
                    console.error('Failed to profile startup. Make sure to quit Code first.');
                }
            });
        }
        const options = {
            detached: true,
            env
        };
        if (!args.verbose) {
            options['stdio'] = 'ignore';
        }
        let child;
        if (!isMacOSBigSurOrNewer) {
            if (!args.verbose && args.status) {
                options['stdio'] = ['ignore', 'pipe', 'ignore']; // restore ability to see output when --status is used
            }
            // We spawn process.execPath directly
            child = spawn(process.execPath, argv.slice(2), options);
        }
        else {
            // On Big Sur, we spawn using the open command to obtain behavior
            // similar to if the app was launched from the dock
            // https://github.com/microsoft/vscode/issues/102975
            // The following args are for the open command itself, rather than for VS Code:
            // -n creates a new instance.
            //    Without -n, the open command re-opens the existing instance as-is.
            // -g starts the new instance in the background.
            //    Later, Electron brings the instance to the foreground.
            //    This way, Mac does not automatically try to foreground the new instance, which causes
            //    focusing issues when the new instance only sends data to a previous instance and then closes.
            const spawnArgs = ['-n', '-g'];
            // -a opens the given application.
            spawnArgs.push('-a', process.execPath); // -a: opens a specific application
            if (args.verbose || args.status) {
                spawnArgs.push('--wait-apps'); // `open --wait-apps`: blocks until the launched app is closed (even if they were already running)
                // The open command only allows for redirecting stderr and stdout to files,
                // so we make it redirect those to temp files, and then use a logger to
                // redirect the file output to the console
                for (const outputType of args.verbose ? ['stdout', 'stderr'] : ['stdout']) {
                    // Tmp file to target output to
                    const tmpName = randomPath(tmpdir(), `code-${outputType}`);
                    writeFileSync(tmpName, '');
                    spawnArgs.push(`--${outputType}`, tmpName);
                    // Listener to redirect content to stdout/stderr
                    processCallbacks.push(async (child) => {
                        try {
                            const stream = outputType === 'stdout' ? process.stdout : process.stderr;
                            const cts = new CancellationTokenSource();
                            child.on('close', () => {
                                // We must dispose the token to stop watching,
                                // but the watcher might still be reading data.
                                setTimeout(() => cts.dispose(true), 200);
                            });
                            await watchFileContents(tmpName, chunk => stream.write(chunk), () => { }, cts.token);
                        }
                        finally {
                            unlinkSync(tmpName);
                        }
                    });
                }
            }
            for (const e in env) {
                // Ignore the _ env var, because the open command
                // ignores it anyway.
                // Pass the rest of the env vars in to fix
                // https://github.com/microsoft/vscode/issues/134696.
                if (e !== '_') {
                    spawnArgs.push('--env');
                    spawnArgs.push(`${e}=${env[e]}`);
                }
            }
            spawnArgs.push('--args', ...argv.slice(2)); // pass on our arguments
            if (env['VSCODE_DEV']) {
                // If we're in development mode, replace the . arg with the
                // vscode source arg. Because the OSS app isn't bundled,
                // it needs the full vscode source arg to launch properly.
                const curdir = '.';
                const launchDirIndex = spawnArgs.indexOf(curdir);
                if (launchDirIndex !== -1) {
                    spawnArgs[launchDirIndex] = resolve(curdir);
                }
            }
            // We already passed over the env variables
            // using the --env flags, so we can leave them out here.
            // Also, we don't need to pass env._, which is different from argv._
            child = spawn('open', spawnArgs, { ...options, env: {} });
        }
        return Promise.all(processCallbacks.map(callback => callback(child)));
    }
}
function getAppRoot() {
    return dirname(FileAccess.asFileUri('').fsPath);
}
function eventuallyExit(code) {
    setTimeout(() => process.exit(code), 0);
}
main(process.argv)
    .then(() => eventuallyExit(0))
    .then(null, err => {
    console.error(err.message || err.stack || err);
    eventuallyExit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvbm9kZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFnQixLQUFLLEVBQThCLE1BQU0sZUFBZSxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxNQUFNLElBQUksQ0FBQztBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFFOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRSxPQUFPLEVBQXVCLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlILE9BQU8sRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEksT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkYsT0FBTyxPQUFPLE1BQU0sMENBQTBDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTdELFNBQVMscUJBQXFCLENBQUMsSUFBc0I7SUFDcEQsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1dBQzNCLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7V0FDekIsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztXQUMzQixDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDO1dBQzdCLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUM7V0FDM0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztXQUMxQixDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztXQUNqQixDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pCLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLElBQUksQ0FBQyxJQUFjO0lBQ3hDLElBQUksSUFBc0IsQ0FBQztJQUUzQixJQUFJLENBQUM7UUFDSixJQUFJLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixPQUFPO0lBQ1IsQ0FBQztJQUVELEtBQUssTUFBTSxVQUFVLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUM5QyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDcEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLFVBQVUsOEJBQThCLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO2dCQUNyRixPQUFPO1lBQ1IsQ0FBQztZQUNELE1BQU0sR0FBRyxHQUF3QjtnQkFDaEMsR0FBRyxPQUFPLENBQUMsR0FBRzthQUNkLENBQUM7WUFDRiw2REFBNkQ7WUFDN0QsNkRBQTZEO1lBQzdELHlEQUF5RDtZQUN6RCx5REFBeUQ7WUFDekQsT0FBTyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUVuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0M7WUFDN0YsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDdEMsSUFBSSxhQUEyQixDQUFDO2dCQUNoQyxNQUFNLEtBQUssR0FBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztvQkFDL0IsYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLFVBQVUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDMUgsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUTt3QkFDNUMsaUZBQWlGO3dCQUNqRixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQzt3QkFDOUQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzdCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN6RyxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDLFVBQVUsRUFBRSxHQUFHLFVBQVUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRixDQUFDO2dCQUVELGFBQWEsQ0FBQyxNQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDM0MsYUFBYSxDQUFDLE1BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQyxhQUFhLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDbEMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbkMsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87SUFDUCxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLE1BQU0sVUFBVSxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVELGVBQWU7U0FDVixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELG9CQUFvQjtTQUNmLElBQUksSUFBSSxDQUFDLCtCQUErQixDQUFDLEVBQUUsQ0FBQztRQUNoRCxJQUFJLElBQVksQ0FBQztRQUNqQixRQUFRLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLENBQUM7WUFDL0MsaUdBQWlHO1lBQ2pHLEtBQUssTUFBTTtnQkFBRSxJQUFJLEdBQUcsMEJBQTBCLENBQUM7Z0JBQUMsTUFBTTtZQUN0RCxvR0FBb0c7WUFDcEcsS0FBSyxNQUFNO2dCQUFFLElBQUksR0FBRyxzQkFBc0IsQ0FBQztnQkFBQyxNQUFNO1lBQ2xELGdHQUFnRztZQUNoRyxLQUFLLEtBQUs7Z0JBQUUsSUFBSSxHQUFHLHlCQUF5QixDQUFDO2dCQUFDLE1BQU07WUFDcEQsdUdBQXVHO1lBQ3ZHLEtBQUssTUFBTTtnQkFBRSxJQUFJLEdBQUcsdUJBQXVCLENBQUM7Z0JBQUMsTUFBTTtZQUNuRCxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLGlFQUFpRSxDQUFDLENBQUM7UUFDN0YsQ0FBQztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdHLENBQUM7SUFFRCx3QkFBd0I7U0FDbkIsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBRXRDLDhEQUE4RDtRQUM5RCxrRUFBa0U7UUFDbEUsOERBQThEO1FBQzlELDZEQUE2RDtRQUU3RCxJQUFJLGNBQXNCLENBQUM7UUFDM0IsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDL0IsY0FBYyxHQUFHLHFCQUFxQixDQUFDO1FBQ3hDLENBQUM7YUFBTSxDQUFDO1lBQ1AsY0FBYyxHQUFHLGtDQUFrQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6QyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckIsT0FBTztJQUNSLENBQUM7SUFFRCxhQUFhO1NBQ1IsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNqRyxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELElBQUksTUFBMEIsQ0FBQztRQUMvQixJQUFJLE1BQTBCLENBQUM7UUFDL0IsSUFBSSxDQUFDO1lBQ0osTUFBTSxZQUFZLEdBQXVDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3BHLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO1lBQzdCLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO1FBQzlCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsb0RBQW9EO1FBQ3BELHdEQUF3RDtRQUN4RCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDN0MscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDakQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsV0FBVztRQUNYLElBQ0MsQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxLQUFLLE1BQU0sSUFBTyxnRUFBZ0U7WUFDOUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQU0sc0RBQXNEO1lBQ3RHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLGtDQUFrQztZQUN2RixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBRSxrQ0FBa0M7VUFDcEYsQ0FBQztZQUNGLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBRUosOERBQThEO1lBQzlELElBQUksVUFBVSxHQUFXLENBQUMsQ0FBQztZQUMzQixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7WUFDeEIsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLDRDQUE0QyxDQUFDLEVBQUUsQ0FBQztvQkFDeEUsU0FBUyxDQUFDLE1BQU0sRUFBRSxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUM7b0JBQ3RDLFdBQVcsR0FBRyxJQUFJLENBQUM7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO1lBRUQseUJBQXlCO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsQyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLDREQUE0RDtnQkFDNUQsOERBQThEO2dCQUM5RCw2Q0FBNkM7Z0JBQzdDLDJEQUEyRDtnQkFDM0QsMENBQTBDO2dCQUMxQyx3REFBd0Q7Z0JBQ3hELFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLGFBQWEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGFBQWEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0IsQ0FBQztZQUVELGtDQUFrQztZQUNsQyxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixTQUFTLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQy9CLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixLQUFLLENBQUMsT0FBTyxHQUFHLDZCQUE2QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0QsTUFBTSxLQUFLLENBQUM7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQVk7U0FDUCxDQUFDO1FBQ0wsTUFBTSxHQUFHLEdBQXdCO1lBQ2hDLEdBQUcsT0FBTyxDQUFDLEdBQUc7WUFDZCw0QkFBNEIsRUFBRSxHQUFHO1NBQ2pDLENBQUM7UUFFRixPQUFPLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRW5DLE1BQU0sZ0JBQWdCLEdBQStDLEVBQUUsQ0FBQztRQUV4RSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixHQUFHLENBQUMseUJBQXlCLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDdEMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxLQUFLLEVBQUMsRUFBRTtnQkFDbkMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN0RixLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRXRGLE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDbEUsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDeEQsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixrREFBa0Q7WUFDbEQsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztZQUN2QyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsSUFBSSxhQUFpQyxDQUFDO1FBQ3RDLElBQUksa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1lBRTFCLGdHQUFnRztZQUNoRyxpR0FBaUc7WUFDakcsK0dBQStHO1lBRS9HLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQ3JCLGFBQWEsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUVuQyxJQUFJLENBQUM7b0JBQ0osTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO29CQUN0RCxNQUFNLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDdkYsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFFaEIsMERBQTBEO3dCQUMxRCxzREFBc0Q7d0JBQ3RELG9DQUFvQzt3QkFDcEMsMERBQTBEO3dCQUMxRCx3REFBd0Q7d0JBQ3hELHdEQUF3RDt3QkFDeEQsdURBQXVEO3dCQUN2RCxzQ0FBc0M7d0JBQ3RDLDJEQUEyRDt3QkFDM0QsMERBQTBEO3dCQUMxRCwyREFBMkQ7d0JBQzNELDBEQUEwRDt3QkFDMUQsUUFBUTt3QkFFUixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xELENBQUM7b0JBRUQsaUZBQWlGO29CQUNqRixNQUFNLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUM1QixNQUFNLENBQUMsSUFBSSxFQUFFLCtCQUErQixDQUFDLENBQUM7b0JBRTlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLGFBQWEsRUFBRSxDQUFDLENBQUM7Z0JBQ3pELENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN4RSxhQUFhLEdBQUcsU0FBUyxDQUFDO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUVQLGtHQUFrRztnQkFDbEcsdUVBQXVFO2dCQUN2RSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUU7b0JBQ3RFLElBQUksWUFBWSxFQUFFLENBQUM7d0JBQ2xCLElBQUksU0FBUyxFQUFFLENBQUM7NEJBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLE9BQU8sQ0FBQyxlQUFlLHFFQUFxRSxPQUFPLENBQUMsZUFBZSxPQUFPLENBQUMsQ0FBQzt3QkFDdEosQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxPQUFPLENBQUMsZUFBZSxzREFBc0QsT0FBTyxDQUFDLGVBQWUsT0FBTyxDQUFDLENBQUM7d0JBQ3ZJLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLG9CQUFvQixHQUFHLFdBQVcsSUFBSSxPQUFPLEVBQUUsR0FBRyxRQUFRLENBQUM7UUFFakUsK0RBQStEO1FBQy9ELGtFQUFrRTtRQUNsRSwrREFBK0Q7UUFDL0QsK0NBQStDO1FBQy9DLElBQUksa0JBQXNDLENBQUM7UUFDM0MsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixrQkFBa0IsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUQsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUN4QixNQUFNLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDMUQsQ0FBQztZQUVELG9FQUFvRTtZQUNwRSxnQkFBZ0I7WUFDaEIseUVBQXlFO1lBQ3pFLDBEQUEwRDtZQUMxRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLEtBQUssRUFBQyxFQUFFO2dCQUNuQyxJQUFJLGdCQUFnQixDQUFDO2dCQUNyQixJQUFJLG9CQUFvQixFQUFFLENBQUM7b0JBQzFCLG9FQUFvRTtvQkFDcEUsc0VBQXNFO29CQUN0RSxvRUFBb0U7b0JBQ3BFLGdCQUFnQixHQUFHLElBQUksT0FBTyxDQUFPLE9BQU8sQ0FBQyxFQUFFO3dCQUM5QywwRUFBMEU7d0JBQzFFLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFOzRCQUNqQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7Z0NBQzFCLE9BQU8sRUFBRSxDQUFDOzRCQUNYLENBQUM7d0JBQ0YsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNQLDRFQUE0RTtvQkFDNUUsMEJBQTBCO29CQUMxQixnQkFBZ0IsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDL0UsQ0FBQztnQkFDRCxJQUFJLENBQUM7b0JBQ0osTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNsQixXQUFXLENBQUMsa0JBQW1CLENBQUM7d0JBQ2hDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQzt3QkFDM0QsZ0JBQWdCO3FCQUNoQixDQUFDLENBQUM7Z0JBQ0osQ0FBQzt3QkFBUyxDQUFDO29CQUNWLElBQUksYUFBYSxFQUFFLENBQUM7d0JBQ25CLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLHdEQUF3RDtvQkFDcEYsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsc0ZBQXNGO1FBQ3RGLHlGQUF5RjtRQUN6Rix3RkFBd0Y7UUFDeEYsa0JBQWtCO1FBQ2xCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBQ2hDLE1BQU0sUUFBUSxHQUFHLE1BQU0sWUFBWSxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1RCxNQUFNLFlBQVksR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNoRSxNQUFNLFdBQVcsR0FBRyxNQUFNLFlBQVksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUVuRSxpRUFBaUU7WUFDakUsSUFBSSxRQUFRLEdBQUcsWUFBWSxHQUFHLFdBQVcsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakQsTUFBTSxJQUFJLEtBQUssQ0FBQyxrR0FBa0csQ0FBQyxDQUFDO1lBQ3JILENBQUM7WUFFRCxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFckQsTUFBTSxDQUFDLElBQUksRUFBRSxpQkFBaUIsV0FBVyxJQUFJLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDekQsTUFBTSxDQUFDLElBQUksRUFBRSwyQkFBMkIsV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDdkUsTUFBTSxDQUFDLElBQUksRUFBRSw0QkFBNEIsV0FBVyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDdkUsTUFBTSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUN0RCxNQUFNLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFFakMsYUFBYSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFeEQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxNQUFNLEVBQUMsRUFBRTtnQkFFcEMsTUFBTSxRQUFRO29CQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQVksRUFBRSxjQUFzQixFQUFFLElBQThFO3dCQUN0SSxNQUFNLFFBQVEsR0FBRyxNQUFNLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO3dCQUVyRCxJQUFJLE9BQXlCLENBQUM7d0JBQzlCLElBQUksQ0FBQzs0QkFDSixPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7d0JBQ3pFLENBQUM7d0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQzs0QkFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxJQUFJLGNBQWMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7d0JBQ2pGLENBQUM7d0JBRUQsT0FBTzs0QkFDTixLQUFLLENBQUMsSUFBSTtnQ0FDVCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0NBQ2QsT0FBTztnQ0FDUixDQUFDO2dDQUNELElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztnQ0FDaEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0NBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7b0NBQ2hDLHNEQUFzRDtvQ0FDdEQsOERBQThEO29DQUM5RCwyREFBMkQ7b0NBQzNELDRDQUE0QztvQ0FDNUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztvQ0FDMUUsTUFBTSxHQUFHLE1BQU0sQ0FBQztnQ0FDakIsQ0FBQztnQ0FFRCxhQUFhLENBQUMsR0FBRyxjQUFjLElBQUksSUFBSSxjQUFjLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDOUcsQ0FBQzt5QkFDRCxDQUFDO29CQUNILENBQUM7aUJBQ0Q7Z0JBRUQsSUFBSSxDQUFDO29CQUNKLDBCQUEwQjtvQkFDMUIsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDdEYsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO29CQUMzRyxNQUFNLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRTt3QkFDekUsSUFBSSxFQUFFLFlBQVk7d0JBQ2xCLEtBQUssRUFBRSxHQUFHO3dCQUNWLE1BQU0sRUFBRSxVQUFVLE9BQU87NEJBQ3hCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQ0FDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO29DQUNsQyxPQUFPLEtBQUssQ0FBQztnQ0FDZCxDQUFDO2dDQUNELElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztvQ0FDNUIsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDckgsQ0FBQztxQ0FBTSxDQUFDO29DQUNQLE9BQU8sSUFBSSxDQUFDO2dDQUNiLENBQUM7NEJBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ1AsQ0FBQztxQkFDRCxDQUFDLENBQUM7b0JBRUgsTUFBTSxJQUFJLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQztvQkFDdEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQztvQkFDNUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQztvQkFFOUMsa0RBQWtEO29CQUNsRCxNQUFNLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztvQkFFbEMsaUJBQWlCO29CQUNqQixNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbEIsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3RCLE1BQU0sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUVyQiw2REFBNkQ7b0JBQzdELGFBQWEsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBRW5DLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixPQUFPLENBQUMsS0FBSyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7Z0JBQzNFLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBaUI7WUFDN0IsUUFBUSxFQUFFLElBQUk7WUFDZCxHQUFHO1NBQ0gsQ0FBQztRQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFFBQVEsQ0FBQztRQUM3QixDQUFDO1FBRUQsSUFBSSxLQUFtQixDQUFDO1FBQ3hCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLHNEQUFzRDtZQUN4RyxDQUFDO1lBRUQscUNBQXFDO1lBQ3JDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pELENBQUM7YUFBTSxDQUFDO1lBQ1AsaUVBQWlFO1lBQ2pFLG1EQUFtRDtZQUNuRCxvREFBb0Q7WUFFcEQsK0VBQStFO1lBQy9FLDZCQUE2QjtZQUM3Qix3RUFBd0U7WUFDeEUsZ0RBQWdEO1lBQ2hELDREQUE0RDtZQUM1RCwyRkFBMkY7WUFDM0YsbUdBQW1HO1lBQ25HLE1BQU0sU0FBUyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQy9CLGtDQUFrQztZQUNsQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7WUFFM0UsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGtHQUFrRztnQkFFakksMkVBQTJFO2dCQUMzRSx1RUFBdUU7Z0JBQ3ZFLDBDQUEwQztnQkFDMUMsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUUzRSwrQkFBK0I7b0JBQy9CLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxRQUFRLFVBQVUsRUFBRSxDQUFDLENBQUM7b0JBQzNELGFBQWEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQzNCLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxVQUFVLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFFM0MsZ0RBQWdEO29CQUNoRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLEtBQUssRUFBQyxFQUFFO3dCQUNuQyxJQUFJLENBQUM7NEJBQ0osTUFBTSxNQUFNLEdBQUcsVUFBVSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQzs0QkFFekUsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDOzRCQUMxQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0NBQ3RCLDhDQUE4QztnQ0FDOUMsK0NBQStDO2dDQUMvQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzs0QkFDMUMsQ0FBQyxDQUFDLENBQUM7NEJBQ0gsTUFBTSxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFnQixDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNuRyxDQUFDO2dDQUFTLENBQUM7NEJBQ1YsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUNyQixDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUM7WUFDRixDQUFDO1lBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDckIsaURBQWlEO2dCQUNqRCxxQkFBcUI7Z0JBQ3JCLDBDQUEwQztnQkFDMUMscURBQXFEO2dCQUNyRCxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDZixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN4QixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2xDLENBQUM7WUFDRixDQUFDO1lBRUQsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx3QkFBd0I7WUFFcEUsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsMkRBQTJEO2dCQUMzRCx3REFBd0Q7Z0JBQ3hELDBEQUEwRDtnQkFDMUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDO2dCQUNuQixNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLGNBQWMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUMzQixTQUFTLENBQUMsY0FBYyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3QyxDQUFDO1lBQ0YsQ0FBQztZQUVELDJDQUEyQztZQUMzQyx3REFBd0Q7WUFDeEQsb0VBQW9FO1lBQ3BFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsVUFBVTtJQUNsQixPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxJQUFZO0lBQ25DLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztLQUNoQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzdCLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLENBQUM7SUFDL0MsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDIn0=