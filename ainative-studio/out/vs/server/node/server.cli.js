/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as url from 'url';
import * as cp from 'child_process';
import * as http from 'http';
import { cwd } from '../../base/common/process.js';
import { dirname, extname, resolve, join } from '../../base/common/path.js';
import { parseArgs, buildHelpMessage, buildVersionMessage, OPTIONS } from '../../platform/environment/node/argv.js';
import { createWaitMarkerFileSync } from '../../platform/environment/node/wait.js';
import { hasStdinWithoutTty, getStdinFilePath, readFromStdin } from '../../platform/environment/node/stdin.js';
import { DeferredPromise } from '../../base/common/async.js';
import { FileAccess } from '../../base/common/network.js';
const isSupportedForCmd = (optionId) => {
    switch (optionId) {
        case 'user-data-dir':
        case 'extensions-dir':
        case 'export-default-configuration':
        case 'install-source':
        case 'enable-smoke-test-driver':
        case 'extensions-download-dir':
        case 'builtin-extensions-dir':
        case 'telemetry':
            return false;
        default:
            return true;
    }
};
const isSupportedForPipe = (optionId) => {
    switch (optionId) {
        case 'version':
        case 'help':
        case 'folder-uri':
        case 'file-uri':
        case 'add':
        case 'diff':
        case 'merge':
        case 'wait':
        case 'goto':
        case 'reuse-window':
        case 'new-window':
        case 'status':
        case 'install-extension':
        case 'uninstall-extension':
        case 'update-extensions':
        case 'list-extensions':
        case 'force':
        case 'do-not-include-pack-dependencies':
        case 'show-versions':
        case 'category':
        case 'verbose':
        case 'remote':
        case 'locate-shell-integration-path':
            return true;
        default:
            return false;
    }
};
const cliPipe = process.env['VSCODE_IPC_HOOK_CLI'];
const cliCommand = process.env['VSCODE_CLIENT_COMMAND'];
const cliCommandCwd = process.env['VSCODE_CLIENT_COMMAND_CWD'];
const cliRemoteAuthority = process.env['VSCODE_CLI_AUTHORITY'];
const cliStdInFilePath = process.env['VSCODE_STDIN_FILE_PATH'];
export async function main(desc, args) {
    if (!cliPipe && !cliCommand) {
        console.log('Command is only available in WSL or inside a Visual Studio Code terminal.');
        return;
    }
    // take the local options and remove the ones that don't apply
    const options = { ...OPTIONS, gitCredential: { type: 'string' }, openExternal: { type: 'boolean' } };
    const isSupported = cliCommand ? isSupportedForCmd : isSupportedForPipe;
    for (const optionId in OPTIONS) {
        const optId = optionId;
        if (!isSupported(optId)) {
            delete options[optId];
        }
    }
    if (cliPipe) {
        options['openExternal'] = { type: 'boolean' };
    }
    const errorReporter = {
        onMultipleValues: (id, usedValue) => {
            console.error(`Option '${id}' can only be defined once. Using value ${usedValue}.`);
        },
        onEmptyValue: (id) => {
            console.error(`Ignoring option '${id}': Value must not be empty.`);
        },
        onUnknownOption: (id) => {
            console.error(`Ignoring option '${id}': not supported for ${desc.executableName}.`);
        },
        onDeprecatedOption: (deprecatedOption, message) => {
            console.warn(`Option '${deprecatedOption}' is deprecated: ${message}`);
        }
    };
    const parsedArgs = parseArgs(args, options, errorReporter);
    const mapFileUri = cliRemoteAuthority ? mapFileToRemoteUri : (uri) => uri;
    const verbose = !!parsedArgs['verbose'];
    if (parsedArgs.help) {
        console.log(buildHelpMessage(desc.productName, desc.executableName, desc.version, options));
        return;
    }
    if (parsedArgs.version) {
        console.log(buildVersionMessage(desc.version, desc.commit));
        return;
    }
    if (parsedArgs['locate-shell-integration-path']) {
        let file;
        switch (parsedArgs['locate-shell-integration-path']) {
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
        return;
    }
    if (cliPipe) {
        if (parsedArgs['openExternal']) {
            await openInBrowser(parsedArgs['_'], verbose);
            return;
        }
    }
    let remote = parsedArgs.remote;
    if (remote === 'local' || remote === 'false' || remote === '') {
        remote = null; // null represent a local window
    }
    const folderURIs = (parsedArgs['folder-uri'] || []).map(mapFileUri);
    parsedArgs['folder-uri'] = folderURIs;
    const fileURIs = (parsedArgs['file-uri'] || []).map(mapFileUri);
    parsedArgs['file-uri'] = fileURIs;
    const inputPaths = parsedArgs['_'];
    let hasReadStdinArg = false;
    for (const input of inputPaths) {
        if (input === '-') {
            hasReadStdinArg = true;
        }
        else {
            translatePath(input, mapFileUri, folderURIs, fileURIs);
        }
    }
    parsedArgs['_'] = [];
    let readFromStdinPromise;
    let stdinFilePath;
    if (hasReadStdinArg && hasStdinWithoutTty()) {
        try {
            stdinFilePath = cliStdInFilePath;
            if (!stdinFilePath) {
                stdinFilePath = getStdinFilePath();
                const readFromStdinDone = new DeferredPromise();
                await readFromStdin(stdinFilePath, verbose, () => readFromStdinDone.complete()); // throws error if file can not be written
                if (!parsedArgs.wait) {
                    // if `--wait` is not provided, we keep this process alive
                    // for at least as long as the stdin stream is open to
                    // ensure that we read all the data.
                    readFromStdinPromise = readFromStdinDone.p;
                }
            }
            // Make sure to open tmp file
            translatePath(stdinFilePath, mapFileUri, folderURIs, fileURIs);
            // Ignore adding this to history
            parsedArgs['skip-add-to-recently-opened'] = true;
            console.log(`Reading from stdin via: ${stdinFilePath}`);
        }
        catch (e) {
            console.log(`Failed to create file to read via stdin: ${e.toString()}`);
        }
    }
    if (parsedArgs.extensionDevelopmentPath) {
        parsedArgs.extensionDevelopmentPath = parsedArgs.extensionDevelopmentPath.map(p => mapFileUri(pathToURI(p).href));
    }
    if (parsedArgs.extensionTestsPath) {
        parsedArgs.extensionTestsPath = mapFileUri(pathToURI(parsedArgs['extensionTestsPath']).href);
    }
    const crashReporterDirectory = parsedArgs['crash-reporter-directory'];
    if (crashReporterDirectory !== undefined && !crashReporterDirectory.match(/^([a-zA-Z]:[\\\/])/)) {
        console.log(`The crash reporter directory '${crashReporterDirectory}' must be an absolute Windows path (e.g. c:/crashes)`);
        return;
    }
    if (cliCommand) {
        if (parsedArgs['install-extension'] !== undefined || parsedArgs['uninstall-extension'] !== undefined || parsedArgs['list-extensions'] || parsedArgs['update-extensions']) {
            const cmdLine = [];
            parsedArgs['install-extension']?.forEach(id => cmdLine.push('--install-extension', id));
            parsedArgs['uninstall-extension']?.forEach(id => cmdLine.push('--uninstall-extension', id));
            ['list-extensions', 'force', 'show-versions', 'category'].forEach(opt => {
                const value = parsedArgs[opt];
                if (value !== undefined) {
                    cmdLine.push(`--${opt}=${value}`);
                }
            });
            if (parsedArgs['update-extensions']) {
                cmdLine.push('--update-extensions');
            }
            const childProcess = cp.fork(FileAccess.asFileUri('server-main').fsPath, cmdLine, { stdio: 'inherit' });
            childProcess.on('error', err => console.log(err));
            return;
        }
        const newCommandline = [];
        for (const key in parsedArgs) {
            const val = parsedArgs[key];
            if (typeof val === 'boolean') {
                if (val) {
                    newCommandline.push('--' + key);
                }
            }
            else if (Array.isArray(val)) {
                for (const entry of val) {
                    newCommandline.push(`--${key}=${entry.toString()}`);
                }
            }
            else if (val) {
                newCommandline.push(`--${key}=${val.toString()}`);
            }
        }
        if (remote !== null) {
            newCommandline.push(`--remote=${remote || cliRemoteAuthority}`);
        }
        const ext = extname(cliCommand);
        if (ext === '.bat' || ext === '.cmd') {
            const processCwd = cliCommandCwd || cwd();
            if (verbose) {
                console.log(`Invoking: cmd.exe /C ${cliCommand} ${newCommandline.join(' ')} in ${processCwd}`);
            }
            cp.spawn('cmd.exe', ['/C', cliCommand, ...newCommandline], {
                stdio: 'inherit',
                cwd: processCwd
            });
        }
        else {
            const cliCwd = dirname(cliCommand);
            const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
            newCommandline.unshift('resources/app/out/cli.js');
            if (verbose) {
                console.log(`Invoking: cd "${cliCwd}" && ELECTRON_RUN_AS_NODE=1 "${cliCommand}" "${newCommandline.join('" "')}"`);
            }
            if (runningInWSL2()) {
                if (verbose) {
                    console.log(`Using pipes for output.`);
                }
                const childProcess = cp.spawn(cliCommand, newCommandline, { cwd: cliCwd, env, stdio: ['inherit', 'pipe', 'pipe'] });
                childProcess.stdout.on('data', data => process.stdout.write(data));
                childProcess.stderr.on('data', data => process.stderr.write(data));
            }
            else {
                cp.spawn(cliCommand, newCommandline, { cwd: cliCwd, env, stdio: 'inherit' });
            }
        }
    }
    else {
        if (parsedArgs.status) {
            await sendToPipe({
                type: 'status'
            }, verbose).then((res) => {
                console.log(res);
            }).catch(e => {
                console.error('Error when requesting status:', e);
            });
            return;
        }
        if (parsedArgs['install-extension'] !== undefined || parsedArgs['uninstall-extension'] !== undefined || parsedArgs['list-extensions'] || parsedArgs['update-extensions']) {
            await sendToPipe({
                type: 'extensionManagement',
                list: parsedArgs['list-extensions'] ? { showVersions: parsedArgs['show-versions'], category: parsedArgs['category'] } : undefined,
                install: asExtensionIdOrVSIX(parsedArgs['install-extension']),
                uninstall: asExtensionIdOrVSIX(parsedArgs['uninstall-extension']),
                force: parsedArgs['force']
            }, verbose).then((res) => {
                console.log(res);
            }).catch(e => {
                console.error('Error when invoking the extension management command:', e);
            });
            return;
        }
        let waitMarkerFilePath = undefined;
        if (parsedArgs['wait']) {
            if (!fileURIs.length) {
                console.log('At least one file must be provided to wait for.');
                return;
            }
            waitMarkerFilePath = createWaitMarkerFileSync(verbose);
        }
        await sendToPipe({
            type: 'open',
            fileURIs,
            folderURIs,
            diffMode: parsedArgs.diff,
            mergeMode: parsedArgs.merge,
            addMode: parsedArgs.add,
            removeMode: parsedArgs.remove,
            gotoLineMode: parsedArgs.goto,
            forceReuseWindow: parsedArgs['reuse-window'],
            forceNewWindow: parsedArgs['new-window'],
            waitMarkerFilePath,
            remoteAuthority: remote
        }, verbose).catch(e => {
            console.error('Error when invoking the open command:', e);
        });
        if (waitMarkerFilePath) {
            await waitForFileDeleted(waitMarkerFilePath);
        }
        if (readFromStdinPromise) {
            await readFromStdinPromise;
        }
        if (waitMarkerFilePath && stdinFilePath) {
            try {
                fs.unlinkSync(stdinFilePath);
            }
            catch (e) {
                //ignore
            }
        }
    }
}
function runningInWSL2() {
    if (!!process.env['WSL_DISTRO_NAME']) {
        try {
            return cp.execSync('uname -r', { encoding: 'utf8' }).includes('-microsoft-');
        }
        catch (_e) {
            // Ignore
        }
    }
    return false;
}
async function waitForFileDeleted(path) {
    while (fs.existsSync(path)) {
        await new Promise(res => setTimeout(res, 1000));
    }
}
async function openInBrowser(args, verbose) {
    const uris = [];
    for (const location of args) {
        try {
            if (/^[a-z-]+:\/\/.+/.test(location)) {
                uris.push(url.parse(location).href);
            }
            else {
                uris.push(pathToURI(location).href);
            }
        }
        catch (e) {
            console.log(`Invalid url: ${location}`);
        }
    }
    if (uris.length) {
        await sendToPipe({
            type: 'openExternal',
            uris
        }, verbose).catch(e => {
            console.error('Error when invoking the open external command:', e);
        });
    }
}
function sendToPipe(args, verbose) {
    if (verbose) {
        console.log(JSON.stringify(args, null, '  '));
    }
    return new Promise((resolve, reject) => {
        const message = JSON.stringify(args);
        if (!cliPipe) {
            console.log('Message ' + message);
            resolve('');
            return;
        }
        const opts = {
            socketPath: cliPipe,
            path: '/',
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json'
            }
        };
        const req = http.request(opts, res => {
            if (res.headers['content-type'] !== 'application/json') {
                reject('Error in response: Invalid content type: Expected \'application/json\', is: ' + res.headers['content-type']);
                return;
            }
            const chunks = [];
            res.setEncoding('utf8');
            res.on('data', chunk => {
                chunks.push(chunk);
            });
            res.on('error', (err) => fatal('Error in response.', err));
            res.on('end', () => {
                const content = chunks.join('');
                try {
                    const obj = JSON.parse(content);
                    if (res.statusCode === 200) {
                        resolve(obj);
                    }
                    else {
                        reject(obj);
                    }
                }
                catch (e) {
                    reject('Error in response: Unable to parse response as JSON: ' + content);
                }
            });
        });
        req.on('error', (err) => fatal('Error in request.', err));
        req.write(message);
        req.end();
    });
}
function asExtensionIdOrVSIX(inputs) {
    return inputs?.map(input => /\.vsix$/i.test(input) ? pathToURI(input).href : input);
}
function fatal(message, err) {
    console.error('Unable to connect to VS Code server: ' + message);
    console.error(err);
    process.exit(1);
}
const preferredCwd = process.env.PWD || cwd(); // prefer process.env.PWD as it does not follow symlinks
function pathToURI(input) {
    input = input.trim();
    input = resolve(preferredCwd, input);
    return url.pathToFileURL(input);
}
function translatePath(input, mapFileUri, folderURIS, fileURIS) {
    const url = pathToURI(input);
    const mappedUri = mapFileUri(url.href);
    try {
        const stat = fs.lstatSync(fs.realpathSync(input));
        if (stat.isFile()) {
            fileURIS.push(mappedUri);
        }
        else if (stat.isDirectory()) {
            folderURIS.push(mappedUri);
        }
        else if (input === '/dev/null') {
            // handle /dev/null passed to us by external tools such as `git difftool`
            fileURIS.push(mappedUri);
        }
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            fileURIS.push(mappedUri);
        }
        else {
            console.log(`Problem accessing file ${input}. Ignoring file`, e);
        }
    }
}
function mapFileToRemoteUri(uri) {
    return uri.replace(/^file:\/\//, 'vscode-remote://' + cliRemoteAuthority);
}
function getAppRoot() {
    return dirname(FileAccess.asFileUri('').fsPath);
}
const [, , productName, version, commit, executableName, ...remainingArgs] = process.argv;
main({ productName, version, commit, executableName }, remainingArgs).then(null, err => {
    console.error(err.message || err.stack || err);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmNsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9zZXJ2ZXIuY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDO0FBQzNCLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQXFDLE1BQU0seUNBQXlDLENBQUM7QUFFdkosT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFxQjFELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxRQUFnQyxFQUFFLEVBQUU7SUFDOUQsUUFBUSxRQUFRLEVBQUUsQ0FBQztRQUNsQixLQUFLLGVBQWUsQ0FBQztRQUNyQixLQUFLLGdCQUFnQixDQUFDO1FBQ3RCLEtBQUssOEJBQThCLENBQUM7UUFDcEMsS0FBSyxnQkFBZ0IsQ0FBQztRQUN0QixL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