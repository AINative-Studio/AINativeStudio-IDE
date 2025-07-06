/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './bootstrap-server.js'; // this MUST come before other imports as it changes global state
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import * as readline from 'readline';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import { devInjectNodeModuleLookupPath, removeGlobalNodeJsModuleLookupPaths } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { product } from './bootstrap-meta.js';
import * as perf from './vs/base/common/performance.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
perf.mark('code/server/start');
globalThis.vscodeServerStartTime = performance.now();
// Do a quick parse to determine if a server or the cli needs to be started
const parsedArgs = minimist(process.argv.slice(2), {
    boolean: ['start-server', 'list-extensions', 'print-ip-address', 'help', 'version', 'accept-server-license-terms', 'update-extensions'],
    string: ['install-extension', 'install-builtin-extension', 'uninstall-extension', 'locate-extension', 'socket-path', 'host', 'port', 'compatibility'],
    alias: { help: 'h', version: 'v' }
});
['host', 'port', 'accept-server-license-terms'].forEach(e => {
    if (!parsedArgs[e]) {
        const envValue = process.env[`VSCODE_SERVER_${e.toUpperCase().replace('-', '_')}`];
        if (envValue) {
            parsedArgs[e] = envValue;
        }
    }
});
const extensionLookupArgs = ['list-extensions', 'locate-extension'];
const extensionInstallArgs = ['install-extension', 'install-builtin-extension', 'uninstall-extension', 'update-extensions'];
const shouldSpawnCli = parsedArgs.help || parsedArgs.version || extensionLookupArgs.some(a => !!parsedArgs[a]) || (extensionInstallArgs.some(a => !!parsedArgs[a]) && !parsedArgs['start-server']);
const nlsConfiguration = await resolveNLSConfiguration({ userLocale: 'en', osLocale: 'en', commit: product.commit, userDataPath: '', nlsMetadataPath: __dirname });
if (shouldSpawnCli) {
    loadCode(nlsConfiguration).then((mod) => {
        mod.spawnCli();
    });
}
else {
    let _remoteExtensionHostAgentServer = null;
    let _remoteExtensionHostAgentServerPromise = null;
    const getRemoteExtensionHostAgentServer = () => {
        if (!_remoteExtensionHostAgentServerPromise) {
            _remoteExtensionHostAgentServerPromise = loadCode(nlsConfiguration).then(async (mod) => {
                const server = await mod.createServer(address);
                _remoteExtensionHostAgentServer = server;
                return server;
            });
        }
        return _remoteExtensionHostAgentServerPromise;
    };
    if (Array.isArray(product.serverLicense) && product.serverLicense.length) {
        console.log(product.serverLicense.join('\n'));
        if (product.serverLicensePrompt && parsedArgs['accept-server-license-terms'] !== true) {
            if (hasStdinWithoutTty()) {
                console.log('To accept the license terms, start the server with --accept-server-license-terms');
                process.exit(1);
            }
            try {
                const accept = await prompt(product.serverLicensePrompt);
                if (!accept) {
                    process.exit(1);
                }
            }
            catch (e) {
                console.log(e);
                process.exit(1);
            }
        }
    }
    let firstRequest = true;
    let firstWebSocket = true;
    let address = null;
    const server = http.createServer(async (req, res) => {
        if (firstRequest) {
            firstRequest = false;
            perf.mark('code/server/firstRequest');
        }
        const remoteExtensionHostAgentServer = await getRemoteExtensionHostAgentServer();
        return remoteExtensionHostAgentServer.handleRequest(req, res);
    });
    server.on('upgrade', async (req, socket) => {
        if (firstWebSocket) {
            firstWebSocket = false;
            perf.mark('code/server/firstWebSocket');
        }
        const remoteExtensionHostAgentServer = await getRemoteExtensionHostAgentServer();
        // @ts-ignore
        return remoteExtensionHostAgentServer.handleUpgrade(req, socket);
    });
    server.on('error', async (err) => {
        const remoteExtensionHostAgentServer = await getRemoteExtensionHostAgentServer();
        return remoteExtensionHostAgentServer.handleServerError(err);
    });
    const host = sanitizeStringArg(parsedArgs['host']) || (parsedArgs['compatibility'] !== '1.63' ? 'localhost' : undefined);
    const nodeListenOptions = (parsedArgs['socket-path']
        ? { path: sanitizeStringArg(parsedArgs['socket-path']) }
        : { host, port: await parsePort(host, sanitizeStringArg(parsedArgs['port'])) });
    server.listen(nodeListenOptions, async () => {
        let output = Array.isArray(product.serverGreeting) && product.serverGreeting.length ? `\n\n${product.serverGreeting.join('\n')}\n\n` : ``;
        if (typeof nodeListenOptions.port === 'number' && parsedArgs['print-ip-address']) {
            const ifaces = os.networkInterfaces();
            Object.keys(ifaces).forEach(function (ifname) {
                ifaces[ifname]?.forEach(function (iface) {
                    if (!iface.internal && iface.family === 'IPv4') {
                        output += `IP Address: ${iface.address}\n`;
                    }
                });
            });
        }
        address = server.address();
        if (address === null) {
            throw new Error('Unexpected server address');
        }
        output += `Server bound to ${typeof address === 'string' ? address : `${address.address}:${address.port} (${address.family})`}\n`;
        // Do not change this line. VS Code looks for this in the output.
        output += `Extension host agent listening on ${typeof address === 'string' ? address : address.port}\n`;
        console.log(output);
        perf.mark('code/server/started');
        globalThis.vscodeServerListenTime = performance.now();
        await getRemoteExtensionHostAgentServer();
    });
    process.on('exit', () => {
        server.close();
        if (_remoteExtensionHostAgentServer) {
            _remoteExtensionHostAgentServer.dispose();
        }
    });
}
function sanitizeStringArg(val) {
    if (Array.isArray(val)) { // if an argument is passed multiple times, minimist creates an array
        val = val.pop(); // take the last item
    }
    return typeof val === 'string' ? val : undefined;
}
/**
 * If `--port` is specified and describes a single port, connect to that port.
 *
 * If `--port`describes a port range
 * then find a free port in that range. Throw error if no
 * free port available in range.
 *
 * In absence of specified ports, connect to port 8000.
 */
async function parsePort(host, strPort) {
    if (strPort) {
        let range;
        if (strPort.match(/^\d+$/)) {
            return parseInt(strPort, 10);
        }
        else if (range = parseRange(strPort)) {
            const port = await findFreePort(host, range.start, range.end);
            if (port !== undefined) {
                return port;
            }
            // Remote-SSH extension relies on this exact port error message, treat as an API
            console.warn(`--port: Could not find free port in range: ${range.start} - ${range.end} (inclusive).`);
            process.exit(1);
        }
        else {
            console.warn(`--port "${strPort}" is not a valid number or range. Ranges must be in the form 'from-to' with 'from' an integer larger than 0 and not larger than 'end'.`);
            process.exit(1);
        }
    }
    return 8000;
}
function parseRange(strRange) {
    const match = strRange.match(/^(\d+)-(\d+)$/);
    if (match) {
        const start = parseInt(match[1], 10), end = parseInt(match[2], 10);
        if (start > 0 && start <= end && end <= 65535) {
            return { start, end };
        }
    }
    return undefined;
}
/**
 * Starting at the `start` port, look for a free port incrementing
 * by 1 until `end` inclusive. If no free port is found, undefined is returned.
 */
async function findFreePort(host, start, end) {
    const testPort = (port) => {
        return new Promise((resolve) => {
            const server = http.createServer();
            server.listen(port, host, () => {
                server.close();
                resolve(true);
            }).on('error', () => {
                resolve(false);
            });
        });
    };
    for (let port = start; port <= end; port++) {
        if (await testPort(port)) {
            return port;
        }
    }
    return undefined;
}
async function loadCode(nlsConfiguration) {
    // required for `bootstrap-esm` to pick up NLS messages
    process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfiguration);
    // See https://github.com/microsoft/vscode-remote-release/issues/6543
    // We would normally install a SIGPIPE listener in bootstrap-node.js
    // But in certain situations, the console itself can be in a broken pipe state
    // so logging SIGPIPE to the console will cause an infinite async loop
    process.env['VSCODE_HANDLES_SIGPIPE'] = 'true';
    if (process.env['VSCODE_DEV']) {
        // When running out of sources, we need to load node modules from remote/node_modules,
        // which are compiled against nodejs, not electron
        process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'] = process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'] || path.join(__dirname, '..', 'remote', 'node_modules');
        devInjectNodeModuleLookupPath(process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH']);
    }
    else {
        delete process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'];
    }
    // Remove global paths from the node module lookup (node.js only)
    removeGlobalNodeJsModuleLookupPaths();
    // Bootstrap ESM
    await bootstrapESM();
    // Load Server
    return import('./vs/server/node/server.main.js');
}
function hasStdinWithoutTty() {
    try {
        return !process.stdin.isTTY; // Via https://twitter.com/MylesBorins/status/782009479382626304
    }
    catch (error) {
        // Windows workaround for https://github.com/nodejs/node/issues/11656
    }
    return false;
}
function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve, reject) => {
        rl.question(question + ' ', async function (data) {
            rl.close();
            const str = data.toString().trim().toLowerCase();
            if (str === '' || str === 'y' || str === 'yes') {
                resolve(true);
            }
            else if (str === 'n' || str === 'no') {
                resolve(false);
            }
            else {
                process.stdout.write('\nInvalid Response. Answer either yes (y, yes) or no (n, no)\n');
                resolve(await prompt(question));
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLW1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJzZXJ2ZXItbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHVCQUF1QixDQUFDLENBQUMsaUVBQWlFO0FBQ2pHLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBRTdCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUNwQyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG1DQUFtQyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDekcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2xELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBSXhELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUUvRCxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDOUIsVUFBa0IsQ0FBQyxxQkFBcUIsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFOUQsMkVBQTJF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