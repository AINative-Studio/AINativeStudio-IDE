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
import * as cp from 'child_process';
import * as net from 'net';
import { VSBuffer } from '../../base/common/buffer.js';
import { Emitter, Event } from '../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../base/common/lifecycle.js';
import { FileAccess } from '../../base/common/network.js';
import { delimiter, join } from '../../base/common/path.js';
import { isWindows } from '../../base/common/platform.js';
import { removeDangerousEnvVariables } from '../../base/common/processes.js';
import { createRandomIPCHandle, NodeSocket } from '../../base/parts/ipc/node/ipc.net.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ILogService } from '../../platform/log/common/log.js';
import { getResolvedShellEnv } from '../../platform/shell/node/shellEnv.js';
import { IExtensionHostStatusService } from './extensionHostStatusService.js';
import { getNLSConfiguration } from './remoteLanguagePacks.js';
import { IServerEnvironmentService } from './serverEnvironmentService.js';
import { IPCExtHostConnection, SocketExtHostConnection, writeExtHostConnection } from '../../workbench/services/extensions/common/extensionHostEnv.js';
export async function buildUserEnvironment(startParamsEnv = {}, withUserShellEnvironment, language, environmentService, logService, configurationService) {
    const nlsConfig = await getNLSConfiguration(language, environmentService.userDataPath);
    let userShellEnv = {};
    if (withUserShellEnvironment) {
        try {
            userShellEnv = await getResolvedShellEnv(configurationService, logService, environmentService.args, process.env);
        }
        catch (error) {
            logService.error('ExtensionHostConnection#buildUserEnvironment resolving shell environment failed', error);
        }
    }
    const processEnv = process.env;
    const env = {
        ...processEnv,
        ...userShellEnv,
        ...{
            VSCODE_ESM_ENTRYPOINT: 'vs/workbench/api/node/extensionHostProcess',
            VSCODE_HANDLES_UNCAUGHT_ERRORS: 'true',
            VSCODE_NLS_CONFIG: JSON.stringify(nlsConfig)
        },
        ...startParamsEnv
    };
    const binFolder = environmentService.isBuilt ? join(environmentService.appRoot, 'bin') : join(environmentService.appRoot, 'resources', 'server', 'bin-dev');
    const remoteCliBinFolder = join(binFolder, 'remote-cli'); // contains the `code` command that can talk to the remote server
    let PATH = readCaseInsensitive(env, 'PATH');
    if (PATH) {
        PATH = remoteCliBinFolder + delimiter + PATH;
    }
    else {
        PATH = remoteCliBinFolder;
    }
    setCaseInsensitive(env, 'PATH', PATH);
    if (!environmentService.args['without-browser-env-var']) {
        env.BROWSER = join(binFolder, 'helpers', isWindows ? 'browser.cmd' : 'browser.sh'); // a command that opens a browser on the local machine
    }
    removeNulls(env);
    return env;
}
class ConnectionData {
    constructor(socket, initialDataChunk) {
        this.socket = socket;
        this.initialDataChunk = initialDataChunk;
    }
    socketDrain() {
        return this.socket.drain();
    }
    toIExtHostSocketMessage() {
        let skipWebSocketFrames;
        let permessageDeflate;
        let inflateBytes;
        if (this.socket instanceof NodeSocket) {
            skipWebSocketFrames = true;
            permessageDeflate = false;
            inflateBytes = VSBuffer.alloc(0);
        }
        else {
            skipWebSocketFrames = false;
            permessageDeflate = this.socket.permessageDeflate;
            inflateBytes = this.socket.recordedInflateBytes;
        }
        return {
            type: 'VSCODE_EXTHOST_IPC_SOCKET',
            initialDataChunk: this.initialDataChunk.buffer.toString('base64'),
            skipWebSocketFrames: skipWebSocketFrames,
            permessageDeflate: permessageDeflate,
            inflateBytes: inflateBytes.buffer.toString('base64'),
        };
    }
}
let ExtensionHostConnection = class ExtensionHostConnection extends Disposable {
    constructor(_reconnectionToken, remoteAddress, socket, initialDataChunk, _environmentService, _logService, _extensionHostStatusService, _configurationService) {
        super();
        this._reconnectionToken = _reconnectionToken;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._extensionHostStatusService = _extensionHostStatusService;
        this._configurationService = _configurationService;
        this._onClose = new Emitter();
        this.onClose = this._onClose.event;
        this._canSendSocket = (!isWindows || !this._environmentService.args['socket-path']);
        this._disposed = false;
        this._remoteAddress = remoteAddress;
        this._extensionHostProcess = null;
        this._connectionData = new ConnectionData(socket, initialDataChunk);
        this._log(`New connection established.`);
    }
    dispose() {
        this._cleanResources();
        super.dispose();
    }
    get _logPrefix() {
        return `[${this._remoteAddress}][${this._reconnectionToken.substr(0, 8)}][ExtensionHostConnection] `;
    }
    _log(_str) {
        this._logService.info(`${this._logPrefix}${_str}`);
    }
    _logError(_str) {
        this._logService.error(`${this._logPrefix}${_str}`);
    }
    async _pipeSockets(extHostSocket, connectionData) {
        const disposables = new DisposableStore();
        disposables.add(connectionData.socket);
        disposables.add(toDisposable(() => {
            extHostSocket.destroy();
        }));
        const stopAndCleanup = () => {
            disposables.dispose();
        };
        disposables.add(connectionData.socket.onEnd(stopAndCleanup));
        disposables.add(connectionData.socket.onClose(stopAndCleanup));
        disposables.add(Event.fromNodeEventEmitter(extHostSocket, 'end')(stopAndCleanup));
        disposables.add(Event.fromNodeEventEmitter(extHostSocket, 'close')(stopAndCleanup));
        disposables.add(Event.fromNodeEventEmitter(extHostSocket, 'error')(stopAndCleanup));
        disposables.add(connectionData.socket.onData((e) => extHostSocket.write(e.buffer)));
        disposables.add(Event.fromNodeEventEmitter(extHostSocket, 'data')((e) => {
            connectionData.socket.write(VSBuffer.wrap(e));
        }));
        if (connectionData.initialDataChunk.byteLength > 0) {
            extHostSocket.write(connectionData.initialDataChunk.buffer);
        }
    }
    async _sendSocketToExtensionHost(extensionHostProcess, connectionData) {
        // Make sure all outstanding writes have been drained before sending the socket
        await connectionData.socketDrain();
        const msg = connectionData.toIExtHostSocketMessage();
        let socket;
        if (connectionData.socket instanceof NodeSocket) {
            socket = connectionData.socket.socket;
        }
        else {
            socket = connectionData.socket.socket.socket;
        }
        extensionHostProcess.send(msg, socket);
    }
    shortenReconnectionGraceTimeIfNecessary() {
        if (!this._extensionHostProcess) {
            return;
        }
        const msg = {
            type: 'VSCODE_EXTHOST_IPC_REDUCE_GRACE_TIME'
        };
        this._extensionHostProcess.send(msg);
    }
    acceptReconnection(remoteAddress, _socket, initialDataChunk) {
        this._remoteAddress = remoteAddress;
        this._log(`The client has reconnected.`);
        const connectionData = new ConnectionData(_socket, initialDataChunk);
        if (!this._extensionHostProcess) {
            // The extension host didn't even start up yet
            this._connectionData = connectionData;
            return;
        }
        this._sendSocketToExtensionHost(this._extensionHostProcess, connectionData);
    }
    _cleanResources() {
        if (this._disposed) {
            // already called
            return;
        }
        this._disposed = true;
        if (this._connectionData) {
            this._connectionData.socket.end();
            this._connectionData = null;
        }
        if (this._extensionHostProcess) {
            this._extensionHostProcess.kill();
            this._extensionHostProcess = null;
        }
        this._onClose.fire(undefined);
    }
    async start(startParams) {
        try {
            let execArgv = process.execArgv ? process.execArgv.filter(a => !/^--inspect(-brk)?=/.test(a)) : [];
            if (startParams.port && !process.pkg) {
                execArgv = [`--inspect${startParams.break ? '-brk' : ''}=${startParams.port}`];
            }
            const env = await buildUserEnvironment(startParams.env, true, startParams.language, this._environmentService, this._logService, this._configurationService);
            removeDangerousEnvVariables(env);
            let extHostNamedPipeServer;
            if (this._canSendSocket) {
                writeExtHostConnection(new SocketExtHostConnection(), env);
                extHostNamedPipeServer = null;
            }
            else {
                const { namedPipeServer, pipeName } = await this._listenOnPipe();
                writeExtHostConnection(new IPCExtHostConnection(pipeName), env);
                extHostNamedPipeServer = namedPipeServer;
            }
            const opts = {
                env,
                execArgv,
                silent: true
            };
            // Refs https://github.com/microsoft/vscode/issues/189805
            opts.execArgv.unshift('--dns-result-order=ipv4first');
            // Run Extension Host as fork of current process
            const args = ['--type=extensionHost', `--transformURIs`];
            const useHostProxy = this._environmentService.args['use-host-proxy'];
            args.push(`--useHostProxy=${useHostProxy ? 'true' : 'false'}`);
            this._extensionHostProcess = cp.fork(FileAccess.asFileUri('bootstrap-fork').fsPath, args, opts);
            const pid = this._extensionHostProcess.pid;
            this._log(`<${pid}> Launched Extension Host Process.`);
            // Catch all output coming from the extension host process
            this._extensionHostProcess.stdout.setEncoding('utf8');
            this._extensionHostProcess.stderr.setEncoding('utf8');
            const onStdout = Event.fromNodeEventEmitter(this._extensionHostProcess.stdout, 'data');
            const onStderr = Event.fromNodeEventEmitter(this._extensionHostProcess.stderr, 'data');
            this._register(onStdout((e) => this._log(`<${pid}> ${e}`)));
            this._register(onStderr((e) => this._log(`<${pid}><stderr> ${e}`)));
            // Lifecycle
            this._extensionHostProcess.on('error', (err) => {
                this._logError(`<${pid}> Extension Host Process had an error`);
                this._logService.error(err);
                this._cleanResources();
            });
            this._extensionHostProcess.on('exit', (code, signal) => {
                this._extensionHostStatusService.setExitInfo(this._reconnectionToken, { code, signal });
                this._log(`<${pid}> Extension Host Process exited with code: ${code}, signal: ${signal}.`);
                this._cleanResources();
            });
            if (extHostNamedPipeServer) {
                extHostNamedPipeServer.on('connection', (socket) => {
                    extHostNamedPipeServer.close();
                    this._pipeSockets(socket, this._connectionData);
                });
            }
            else {
                const messageListener = (msg) => {
                    if (msg.type === 'VSCODE_EXTHOST_IPC_READY') {
                        this._extensionHostProcess.removeListener('message', messageListener);
                        this._sendSocketToExtensionHost(this._extensionHostProcess, this._connectionData);
                        this._connectionData = null;
                    }
                };
                this._extensionHostProcess.on('message', messageListener);
            }
        }
        catch (error) {
            console.error('ExtensionHostConnection errored');
            if (error) {
                console.error(error);
            }
        }
    }
    _listenOnPipe() {
        return new Promise((resolve, reject) => {
            const pipeName = createRandomIPCHandle();
            const namedPipeServer = net.createServer();
            namedPipeServer.on('error', reject);
            namedPipeServer.listen(pipeName, () => {
                namedPipeServer?.removeListener('error', reject);
                resolve({ pipeName, namedPipeServer });
            });
        });
    }
};
ExtensionHostConnection = __decorate([
    __param(4, IServerEnvironmentService),
    __param(5, ILogService),
    __param(6, IExtensionHostStatusService),
    __param(7, IConfigurationService)
], ExtensionHostConnection);
export { ExtensionHostConnection };
function readCaseInsensitive(env, key) {
    const pathKeys = Object.keys(env).filter(k => k.toLowerCase() === key.toLowerCase());
    const pathKey = pathKeys.length > 0 ? pathKeys[0] : key;
    return env[pathKey];
}
function setCaseInsensitive(env, key, value) {
    const pathKeys = Object.keys(env).filter(k => k.toLowerCase() === key.toLowerCase());
    const pathKey = pathKeys.length > 0 ? pathKeys[0] : key;
    env[pathKey] = value;
}
function removeNulls(env) {
    // Don't delete while iterating the object itself
    for (const key of Object.keys(env)) {
        if (env[key] === null) {
            delete env[key];
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdENvbm5lY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvZXh0ZW5zaW9uSG9zdENvbm5lY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDNUQsT0FBTyxFQUF1QixTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUF1QixNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsbUJB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