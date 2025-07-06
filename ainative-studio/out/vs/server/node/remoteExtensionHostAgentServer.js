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
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as net from 'net';
import { performance } from 'perf_hooks';
import * as url from 'url';
import { VSBuffer } from '../../base/common/buffer.js';
import { isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler } from '../../base/common/errors.js';
import { isEqualOrParent } from '../../base/common/extpath.js';
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { connectionTokenQueryName, FileAccess, getServerProductSegment, Schemas } from '../../base/common/network.js';
import { dirname, join } from '../../base/common/path.js';
import * as perf from '../../base/common/performance.js';
import * as platform from '../../base/common/platform.js';
import { createRegExp, escapeRegExpCharacters } from '../../base/common/strings.js';
import { URI } from '../../base/common/uri.js';
import { generateUuid } from '../../base/common/uuid.js';
import { getOSReleaseInfo } from '../../base/node/osReleaseInfo.js';
import { findFreePort } from '../../base/node/ports.js';
import { addUNCHostToAllowlist, disableUNCAccessRestrictions } from '../../base/node/unc.js';
import { PersistentProtocol } from '../../base/parts/ipc/common/ipc.net.js';
import { NodeSocket, WebSocketNodeSocket } from '../../base/parts/ipc/node/ipc.net.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../platform/log/common/log.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { ExtensionHostConnection } from './extensionHostConnection.js';
import { ManagementConnection } from './remoteExtensionManagement.js';
import { determineServerConnectionToken, requestHasValidConnectionToken as httpRequestHasValidConnectionToken, ServerConnectionTokenParseError } from './serverConnectionToken.js';
import { IServerEnvironmentService } from './serverEnvironmentService.js';
import { setupServerServices } from './serverServices.js';
import { serveError, serveFile, WebClientServer } from './webClientServer.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SHUTDOWN_TIMEOUT = 5 * 60 * 1000;
let RemoteExtensionHostAgentServer = class RemoteExtensionHostAgentServer extends Disposable {
    constructor(_socketServer, _connectionToken, _vsdaMod, hasWebClient, serverBasePath, _environmentService, _productService, _logService, _instantiationService) {
        super();
        this._socketServer = _socketServer;
        this._connectionToken = _connectionToken;
        this._vsdaMod = _vsdaMod;
        this._environmentService = _environmentService;
        this._productService = _productService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._webEndpointOriginChecker = WebEndpointOriginChecker.create(this._productService);
        if (serverBasePath !== undefined && serverBasePath.charCodeAt(serverBasePath.length - 1) === 47 /* CharCode.Slash */) {
            // Remove trailing slash from base path
            serverBasePath = serverBasePath.substring(0, serverBasePath.length - 1);
        }
        this._serverBasePath = serverBasePath; // undefined or starts with a slash
        this._serverProductPath = `/${getServerProductSegment(_productService)}`; // starts with a slash
        this._extHostConnections = Object.create(null);
        this._managementConnections = Object.create(null);
        this._allReconnectionTokens = new Set();
        this._webClientServer = (hasWebClient
            ? this._instantiationService.createInstance(WebClientServer, this._connectionToken, serverBasePath ?? '/', this._serverProductPath)
            : null);
        this._logService.info(`Extension host agent started.`);
        this._waitThenShutdown(true);
    }
    async handleRequest(req, res) {
        // Only serve GET requests
        if (req.method !== 'GET') {
            return serveError(req, res, 405, `Unsupported method ${req.method}`);
        }
        if (!req.url) {
            return serveError(req, res, 400, `Bad request.`);
        }
        const parsedUrl = url.parse(req.url, true);
        let pathname = parsedUrl.pathname;
        if (!pathname) {
            return serveError(req, res, 400, `Bad request.`);
        }
        // Serve from both '/' and serverBasePath
        if (this._serverBasePath !== undefined && pathname.startsWith(this._serverBasePath)) {
            pathname = pathname.substring(this._serverBasePath.length) || '/';
        }
        // for now accept all paths, with or without server product path
        if (pathname.startsWith(this._serverProductPath) && pathname.charCodeAt(this._serverProductPath.length) === 47 /* CharCode.Slash */) {
            pathname = pathname.substring(this._serverProductPath.length);
        }
        // Version
        if (pathname === '/version') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            return void res.end(this._productService.commit || '');
        }
        // Delay shutdown
        if (pathname === '/delay-shutdown') {
            this._delayShutdown();
            res.writeHead(200);
            return void res.end('OK');
        }
        if (!httpRequestHasValidConnectionToken(this._connectionToken, req, parsedUrl)) {
            // invalid connection token
            return serveError(req, res, 403, `Forbidden.`);
        }
        if (pathname === '/vscode-remote-resource') {
            // Handle HTTP requests for resources rendered in the rich client (images, fonts, etc.)
            // These resources could be files shipped with extensions or even workspace files.
            const desiredPath = parsedUrl.query['path'];
            if (typeof desiredPath !== 'string') {
                return serveError(req, res, 400, `Bad request.`);
            }
            let filePath;
            try {
                filePath = URI.from({ scheme: Schemas.file, path: desiredPath }).fsPath;
            }
            catch (err) {
                return serveError(req, res, 400, `Bad request.`);
            }
            const responseHeaders = Object.create(null);
            if (this._environmentService.isBuilt) {
                if (isEqualOrParent(filePath, this._environmentService.builtinExtensionsPath, !platform.isLinux)
                    || isEqualOrParent(filePath, this._environmentService.extensionsPath, !platform.isLinux)) {
                    responseHeaders['Cache-Control'] = 'public, max-age=31536000';
                }
            }
            // Allow cross origin requests from the web worker extension host
            responseHeaders['Vary'] = 'Origin';
            const requestOrigin = req.headers['origin'];
            if (requestOrigin && this._webEndpointOriginChecker.matches(requestOrigin)) {
                responseHeaders['Access-Control-Allow-Origin'] = requestOrigin;
            }
            return serveFile(filePath, 1 /* CacheControl.ETAG */, this._logService, req, res, responseHeaders);
        }
        // workbench web UI
        if (this._webClientServer) {
            this._webClientServer.handle(req, res, parsedUrl, pathname);
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return void res.end('Not found');
    }
    handleUpgrade(req, socket) {
        let reconnectionToken = generateUuid();
        let isReconnection = false;
        let skipWebSocketFrames = false;
        if (req.url) {
            const query = url.parse(req.url, true).query;
            if (typeof query.reconnectionToken === 'string') {
                reconnectionToken = query.reconnectionToken;
            }
            if (query.reconnection === 'true') {
                isReconnection = true;
            }
            if (query.skipWebSocketFrames === 'true') {
                skipWebSocketFrames = true;
            }
        }
        if (req.headers['upgrade'] === undefined || req.headers['upgrade'].toLowerCase() !== 'websocket') {
            socket.end('HTTP/1.1 400 Bad Request');
            return;
        }
        // https://tools.ietf.org/html/rfc6455#section-4
        const requestNonce = req.headers['sec-websocket-key'];
        const hash = crypto.createHash('sha1'); // CodeQL [SM04514] SHA1 must be used here to respect the WebSocket protocol specification
        hash.update(requestNonce + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
        const responseNonce = hash.digest('base64');
        const responseHeaders = [
            `HTTP/1.1 101 Switching Protocols`,
            `Upgrade: websocket`,
            `Connection: Upgrade`,
            `Sec-WebSocket-Accept: ${responseNonce}`
        ];
        // See https://tools.ietf.org/html/rfc7692#page-12
        let permessageDeflate = false;
        if (!skipWebSocketFrames && !this._environmentService.args['disable-websocket-compression'] && req.headers['sec-websocket-extensions']) {
            const websocketExtensionOptions = Array.isArray(req.headers['sec-websocket-extensions']) ? req.headers['sec-websocket-extensions'] : [req.headers['sec-websocket-extensions']];
            for (const websocketExtensionOption of websocketExtensionOptions) {
                if (/\b((server_max_window_bits)|(server_no_context_takeover)|(client_no_context_takeover))\b/.test(websocketExtensionOption)) {
                    // sorry, the server does not support zlib parameter tweaks
                    continue;
                }
                if (/\b(permessage-deflate)\b/.test(websocketExtensionOption)) {
                    permessageDeflate = true;
                    responseHeaders.push(`Sec-WebSocket-Extensions: permessage-deflate`);
                    break;
                }
                if (/\b(x-webkit-deflate-frame)\b/.test(websocketExtensionOption)) {
                    permessageDeflate = true;
                    responseHeaders.push(`Sec-WebSocket-Extensions: x-webkit-deflate-frame`);
                    break;
                }
            }
        }
        socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
        // Never timeout this socket due to inactivity!
        socket.setTimeout(0);
        // Disable Nagle's algorithm
        socket.setNoDelay(true);
        // Finally!
        if (skipWebSocketFrames) {
            this._handleWebSocketConnection(new NodeSocket(socket, `server-connection-${reconnectionToken}`), isReconnection, reconnectionToken);
        }
        else {
            this._handleWebSocketConnection(new WebSocketNodeSocket(new NodeSocket(socket, `server-connection-${reconnectionToken}`), permessageDeflate, null, true), isReconnection, reconnectionToken);
        }
    }
    handleServerError(err) {
        this._logService.error(`Error occurred in server`);
        this._logService.error(err);
    }
    // Eventually cleanup
    _getRemoteAddress(socket) {
        let _socket;
        if (socket instanceof NodeSocket) {
            _socket = socket.socket;
        }
        else {
            _socket = socket.socket.socket;
        }
        return _socket.remoteAddress || `<unknown>`;
    }
    async _rejectWebSocketConnection(logPrefix, protocol, reason) {
        const socket = protocol.getSocket();
        this._logService.error(`${logPrefix} ${reason}.`);
        const errMessage = {
            type: 'error',
            reason: reason
        };
        protocol.sendControl(VSBuffer.fromString(JSON.stringify(errMessage)));
        protocol.dispose();
        await socket.drain();
        socket.dispose();
    }
    /**
     * NOTE: Avoid using await in this method!
     * The problem is that await introduces a process.nextTick due to the implicit Promise.then
     * This can lead to some bytes being received and interpreted and a control message being emitted before the next listener has a chance to be registered.
     */
    _handleWebSocketConnection(socket, isReconnection, reconnectionToken) {
        const remoteAddress = this._getRemoteAddress(socket);
        const logPrefix = `[${remoteAddress}][${reconnectionToken.substr(0, 8)}]`;
        const protocol = new PersistentProtocol({ socket });
        const validator = this._vsdaMod ? new this._vsdaMod.validator() : null;
        const signer = this._vsdaMod ? new this._vsdaMod.signer() : null;
        let State;
        (function (State) {
            State[State["WaitingForAuth"] = 0] = "WaitingForAuth";
            State[State["WaitingForConnectionType"] = 1] = "WaitingForConnectionType";
            State[State["Done"] = 2] = "Done";
            State[State["Error"] = 3] = "Error";
        })(State || (State = {}));
        let state = 0 /* State.WaitingForAuth */;
        const rejectWebSocketConnection = (msg) => {
            state = 3 /* State.Error */;
            listener.dispose();
            this._rejectWebSocketConnection(logPrefix, protocol, msg);
        };
        const listener = protocol.onControlMessage((raw) => {
            if (state === 0 /* State.WaitingForAuth */) {
                let msg1;
                try {
                    msg1 = JSON.parse(raw.toString());
                }
                catch (err) {
                    return rejectWebSocketConnection(`Malformed first message`);
                }
                if (msg1.type !== 'auth') {
                    return rejectWebSocketConnection(`Invalid first message`);
                }
                if (this._connectionToken.type === 2 /* ServerConnectionTokenType.Mandatory */ && !this._connectionToken.validate(msg1.auth)) {
                    return rejectWebSocketConnection(`Unauthorized client refused: auth mismatch`);
                }
                // Send `sign` request
                let signedData = generateUuid();
                if (signer) {
                    try {
                        signedData = signer.sign(msg1.data);
                    }
                    catch (e) {
                    }
                }
                let someText = generateUuid();
                if (validator) {
                    try {
                        someText = validator.createNewMessage(someText);
                    }
                    catch (e) {
                    }
                }
                const signRequest = {
                    type: 'sign',
                    data: someText,
                    signedData: signedData
                };
                protocol.sendControl(VSBuffer.fromString(JSON.stringify(signRequest)));
                state = 1 /* State.WaitingForConnectionType */;
            }
            else if (state === 1 /* State.WaitingForConnectionType */) {
                let msg2;
                try {
                    msg2 = JSON.parse(raw.toString());
                }
                catch (err) {
                    return rejectWebSocketConnection(`Malformed second message`);
                }
                if (msg2.type !== 'connectionType') {
                    return rejectWebSocketConnection(`Invalid second message`);
                }
                if (typeof msg2.signedData !== 'string') {
                    return rejectWebSocketConnection(`Invalid second message field type`);
                }
                const rendererCommit = msg2.commit;
                const myCommit = this._productService.commit;
                if (rendererCommit && myCommit) {
                    // Running in the built version where commits are defined
                    if (rendererCommit !== myCommit) {
                        return rejectWebSocketConnection(`Client refused: version mismatch`);
                    }
                }
                let valid = false;
                if (!validator) {
                    valid = true;
                }
                else if (this._connectionToken.validate(msg2.signedData)) {
                    // web client
                    valid = true;
                }
                else {
                    try {
                        valid = validator.validate(msg2.signedData) === 'ok';
                    }
                    catch (e) {
                    }
                }
                if (!valid) {
                    if (this._environmentService.isBuilt) {
                        return rejectWebSocketConnection(`Unauthorized client refused`);
                    }
                    else {
                        this._logService.error(`${logPrefix} Unauthorized client handshake failed but we proceed because of dev mode.`);
                    }
                }
                // We have received a new connection.
                // This indicates that the server owner has connectivity.
                // Therefore we will shorten the reconnection grace period for disconnected connections!
                for (const key in this._managementConnections) {
                    const managementConnection = this._managementConnections[key];
                    managementConnection.shortenReconnectionGraceTimeIfNecessary();
                }
                for (const key in this._extHostConnections) {
                    const extHostConnection = this._extHostConnections[key];
                    extHostConnection.shortenReconnectionGraceTimeIfNecessary();
                }
                state = 2 /* State.Done */;
                listener.dispose();
                this._handleConnectionType(remoteAddress, logPrefix, protocol, socket, isReconnection, reconnectionToken, msg2);
            }
        });
    }
    async _handleConnectionType(remoteAddress, _logPrefix, protocol, socket, isReconnection, reconnectionToken, msg) {
        const logPrefix = (msg.desiredConnectionType === 1 /* ConnectionType.Management */
            ? `${_logPrefix}[ManagementConnection]`
            : msg.desiredConnectionType === 2 /* ConnectionType.ExtensionHost */
                ? `${_logPrefix}[ExtensionHostConnection]`
                : _logPrefix);
        if (msg.desiredConnectionType === 1 /* ConnectionType.Management */) {
            // This should become a management connection
            if (isReconnection) {
                // This is a reconnection
                if (!this._managementConnections[reconnectionToken]) {
                    if (!this._allReconnectionTokens.has(reconnectionToken)) {
                        // This is an unknown reconnection token
                        return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown reconnection token (never seen)`);
                    }
                    else {
                        // This is a connection that was seen in the past, but is no longer valid
                        return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown reconnection token (seen before)`);
                    }
                }
                protocol.sendControl(VSBuffer.fromString(JSON.stringify({ type: 'ok' })));
                const dataChunk = protocol.readEntireBuffer();
                protocol.dispose();
                this._managementConnections[reconnectionToken].acceptReconnection(remoteAddress, socket, dataChunk);
            }
            else {
                // This is a fresh connection
                if (this._managementConnections[reconnectionToken]) {
                    // Cannot have two concurrent connections using the same reconnection token
                    return this._rejectWebSocketConnection(logPrefix, protocol, `Duplicate reconnection token`);
                }
                protocol.sendControl(VSBuffer.fromString(JSON.stringify({ type: 'ok' })));
                const con = new ManagementConnection(this._logService, reconnectionToken, remoteAddress, protocol);
                this._socketServer.acceptConnection(con.protocol, con.onClose);
                this._managementConnections[reconnectionToken] = con;
                this._allReconnectionTokens.add(reconnectionToken);
                con.onClose(() => {
                    delete this._managementConnections[reconnectionToken];
                });
            }
        }
        else if (msg.desiredConnectionType === 2 /* ConnectionType.ExtensionHost */) {
            // This should become an extension host connection
            const startParams0 = msg.args || { language: 'en' };
            const startParams = await this._updateWithFreeDebugPort(startParams0);
            if (startParams.port) {
                this._logService.trace(`${logPrefix} - startParams debug port ${startParams.port}`);
            }
            this._logService.trace(`${logPrefix} - startParams language: ${startParams.language}`);
            this._logService.trace(`${logPrefix} - startParams env: ${JSON.stringify(startParams.env)}`);
            if (isReconnection) {
                // This is a reconnection
                if (!this._extHostConnections[reconnectionToken]) {
                    if (!this._allReconnectionTokens.has(reconnectionToken)) {
                        // This is an unknown reconnection token
                        return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown reconnection token (never seen)`);
                    }
                    else {
                        // This is a connection that was seen in the past, but is no longer valid
                        return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown reconnection token (seen before)`);
                    }
                }
                protocol.sendPause();
                protocol.sendControl(VSBuffer.fromString(JSON.stringify(startParams.port ? { debugPort: startParams.port } : {})));
                const dataChunk = protocol.readEntireBuffer();
                protocol.dispose();
                this._extHostConnections[reconnectionToken].acceptReconnection(remoteAddress, socket, dataChunk);
            }
            else {
                // This is a fresh connection
                if (this._extHostConnections[reconnectionToken]) {
                    // Cannot have two concurrent connections using the same reconnection token
                    return this._rejectWebSocketConnection(logPrefix, protocol, `Duplicate reconnection token`);
                }
                protocol.sendPause();
                protocol.sendControl(VSBuffer.fromString(JSON.stringify(startParams.port ? { debugPort: startParams.port } : {})));
                const dataChunk = protocol.readEntireBuffer();
                protocol.dispose();
                const con = this._instantiationService.createInstance(ExtensionHostConnection, reconnectionToken, remoteAddress, socket, dataChunk);
                this._extHostConnections[reconnectionToken] = con;
                this._allReconnectionTokens.add(reconnectionToken);
                con.onClose(() => {
                    con.dispose();
                    delete this._extHostConnections[reconnectionToken];
                    this._onDidCloseExtHostConnection();
                });
                con.start(startParams);
            }
        }
        else if (msg.desiredConnectionType === 3 /* ConnectionType.Tunnel */) {
            const tunnelStartParams = msg.args;
            this._createTunnel(protocol, tunnelStartParams);
        }
        else {
            return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown initial data received`);
        }
    }
    async _createTunnel(protocol, tunnelStartParams) {
        const remoteSocket = protocol.getSocket().socket;
        const dataChunk = protocol.readEntireBuffer();
        protocol.dispose();
        remoteSocket.pause();
        const localSocket = await this._connectTunnelSocket(tunnelStartParams.host, tunnelStartParams.port);
        if (dataChunk.byteLength > 0) {
            localSocket.write(dataChunk.buffer);
        }
        localSocket.on('end', () => remoteSocket.end());
        localSocket.on('close', () => remoteSocket.end());
        localSocket.on('error', () => remoteSocket.destroy());
        remoteSocket.on('end', () => localSocket.end());
        remoteSocket.on('close', () => localSocket.end());
        remoteSocket.on('error', () => localSocket.destroy());
        localSocket.pipe(remoteSocket);
        remoteSocket.pipe(localSocket);
    }
    _connectTunnelSocket(host, port) {
        return new Promise((c, e) => {
            const socket = net.createConnection({
                host: host,
                port: port,
                autoSelectFamily: true
            }, () => {
                socket.removeListener('error', e);
                socket.pause();
                c(socket);
            });
            socket.once('error', e);
        });
    }
    _updateWithFreeDebugPort(startParams) {
        if (typeof startParams.port === 'number') {
            return findFreePort(startParams.port, 10 /* try 10 ports */, 5000 /* try up to 5 seconds */).then(freePort => {
                startParams.port = freePort;
                return startParams;
            });
        }
        // No port clear debug configuration.
        startParams.debugId = undefined;
        startParams.port = undefined;
        startParams.break = undefined;
        return Promise.resolve(startParams);
    }
    async _onDidCloseExtHostConnection() {
        if (!this._environmentService.args['enable-remote-auto-shutdown']) {
            return;
        }
        this._cancelShutdown();
        const hasActiveExtHosts = !!Object.keys(this._extHostConnections).length;
        if (!hasActiveExtHosts) {
            console.log('Last EH closed, waiting before shutting down');
            this._logService.info('Last EH closed, waiting before shutting down');
            this._waitThenShutdown();
        }
    }
    _waitThenShutdown(initial = false) {
        if (!this._environmentService.args['enable-remote-auto-shutdown']) {
            return;
        }
        if (this._environmentService.args['remote-auto-shutdown-without-delay'] && !initial) {
            this._shutdown();
        }
        else {
            this.shutdownTimer = setTimeout(() => {
                this.shutdownTimer = undefined;
                this._shutdown();
            }, SHUTDOWN_TIMEOUT);
        }
    }
    _shutdown() {
        const hasActiveExtHosts = !!Object.keys(this._extHostConnections).length;
        if (hasActiveExtHosts) {
            console.log('New EH opened, aborting shutdown');
            this._logService.info('New EH opened, aborting shutdown');
            return;
        }
        else {
            console.log('Last EH closed, shutting down');
            this._logService.info('Last EH closed, shutting down');
            this.dispose();
            process.exit(0);
        }
    }
    /**
     * If the server is in a shutdown timeout, cancel it and start over
     */
    _delayShutdown() {
        if (this.shutdownTimer) {
            console.log('Got delay-shutdown request while in shutdown timeout, delaying');
            this._logService.info('Got delay-shutdown request while in shutdown timeout, delaying');
            this._cancelShutdown();
            this._waitThenShutdown();
        }
    }
    _cancelShutdown() {
        if (this.shutdownTimer) {
            console.log('Cancelling previous shutdown timeout');
            this._logService.info('Cancelling previous shutdown timeout');
            clearTimeout(this.shutdownTimer);
            this.shutdownTimer = undefined;
        }
    }
};
RemoteExtensionHostAgentServer = __decorate([
    __param(5, IServerEnvironmentService),
    __param(6, IProductService),
    __param(7, ILogService),
    __param(8, IInstantiationService)
], RemoteExtensionHostAgentServer);
export async function createServer(address, args, REMOTE_DATA_FOLDER) {
    const connectionToken = await determineServerConnectionToken(args);
    if (connectionToken instanceof ServerConnectionTokenParseError) {
        console.warn(connectionToken.message);
        process.exit(1);
    }
    // setting up error handlers, first with console.error, then, once available, using the log service
    function initUnexpectedErrorHandler(handler) {
        setUnexpectedErrorHandler(err => {
            // See https://github.com/microsoft/vscode-remote-release/issues/6481
            // In some circumstances, console.error will throw an asynchronous error. This asynchronous error
            // will end up here, and then it will be logged again, thus creating an endless asynchronous loop.
            // Here we try to break the loop by ignoring EPIPE errors that include our own unexpected error handler in the stack.
            if (isSigPipeError(err) && err.stack && /unexpectedErrorHandler/.test(err.stack)) {
                return;
            }
            handler(err);
        });
    }
    const unloggedErrors = [];
    initUnexpectedErrorHandler((error) => {
        unloggedErrors.push(error);
        console.error(error);
    });
    let didLogAboutSIGPIPE = false;
    process.on('SIGPIPE', () => {
        // See https://github.com/microsoft/vscode-remote-release/issues/6543
        // We would normally install a SIGPIPE listener in bootstrap-node.js
        // But in certain situations, the console itself can be in a broken pipe state
        // so logging SIGPIPE to the console will cause an infinite async loop
        if (!didLogAboutSIGPIPE) {
            didLogAboutSIGPIPE = true;
            onUnexpectedError(new Error(`Unexpected SIGPIPE`));
        }
    });
    const disposables = new DisposableStore();
    const { socketServer, instantiationService } = await setupServerServices(connectionToken, args, REMOTE_DATA_FOLDER, disposables);
    // Set the unexpected error handler after the services have been initialized, to avoid having
    // the telemetry service overwrite our handler
    instantiationService.invokeFunction((accessor) => {
        const logService = accessor.get(ILogService);
        unloggedErrors.forEach(error => logService.error(error));
        unloggedErrors.length = 0;
        initUnexpectedErrorHandler((error) => logService.error(error));
    });
    // On Windows, configure the UNC allow list based on settings
    instantiationService.invokeFunction((accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        if (platform.isWindows) {
            if (configurationService.getValue('security.restrictUNCAccess') === false) {
                disableUNCAccessRestrictions();
            }
            else {
                addUNCHostToAllowlist(configurationService.getValue('security.allowedUNCHosts'));
            }
        }
    });
    //
    // On Windows, exit early with warning message to users about potential security issue
    // if there is node_modules folder under home drive or Users folder.
    //
    instantiationService.invokeFunction((accessor) => {
        const logService = accessor.get(ILogService);
        if (platform.isWindows && process.env.HOMEDRIVE && process.env.HOMEPATH) {
            const homeDirModulesPath = join(process.env.HOMEDRIVE, 'node_modules');
            const userDir = dirname(join(process.env.HOMEDRIVE, process.env.HOMEPATH));
            const userDirModulesPath = join(userDir, 'node_modules');
            if (fs.existsSync(homeDirModulesPath) || fs.existsSync(userDirModulesPath)) {
                const message = `

*
* !!!! Server terminated due to presence of CVE-2020-1416 !!!!
*
* Please remove the following directories and re-try
* ${homeDirModulesPath}
* ${userDirModulesPath}
*
* For more information on the vulnerability https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-1416
*

`;
                logService.warn(message);
                console.warn(message);
                process.exit(0);
            }
        }
    });
    const vsdaMod = instantiationService.invokeFunction((accessor) => {
        const logService = accessor.get(ILogService);
        const hasVSDA = fs.existsSync(join(FileAccess.asFileUri('').fsPath, '../node_modules/vsda'));
        if (hasVSDA) {
            try {
                return require('vsda');
            }
            catch (err) {
                logService.error(err);
            }
        }
        return null;
    });
    let serverBasePath = args['server-base-path'];
    if (serverBasePath && !serverBasePath.startsWith('/')) {
        serverBasePath = `/${serverBasePath}`;
    }
    const hasWebClient = fs.existsSync(FileAccess.asFileUri(`vs/code/browser/workbench/workbench.html`).fsPath);
    if (hasWebClient && address && typeof address !== 'string') {
        // ships the web ui!
        const queryPart = (connectionToken.type !== 0 /* ServerConnectionTokenType.None */ ? `?${connectionTokenQueryName}=${connectionToken.value}` : '');
        console.log(`Web UI available at http://localhost${address.port === 80 ? '' : `:${address.port}`}${serverBasePath ?? ''}${queryPart}`);
    }
    const remoteExtensionHostAgentServer = instantiationService.createInstance(RemoteExtensionHostAgentServer, socketServer, connectionToken, vsdaMod, hasWebClient, serverBasePath);
    perf.mark('code/server/ready');
    const currentTime = performance.now();
    const vscodeServerStartTime = global.vscodeServerStartTime;
    const vscodeServerListenTime = global.vscodeServerListenTime;
    const vscodeServerCodeLoadedTime = global.vscodeServerCodeLoadedTime;
    instantiationService.invokeFunction(async (accessor) => {
        const telemetryService = accessor.get(ITelemetryService);
        telemetryService.publicLog2('serverStart', {
            startTime: vscodeServerStartTime,
            startedTime: vscodeServerListenTime,
            codeLoadedTime: vscodeServerCodeLoadedTime,
            readyTime: currentTime
        });
        if (platform.isLinux) {
            const logService = accessor.get(ILogService);
            const releaseInfo = await getOSReleaseInfo(logService.error.bind(logService));
            if (releaseInfo) {
                telemetryService.publicLog2('serverPlatformInfo', {
                    platformId: releaseInfo.id,
                    platformVersionId: releaseInfo.version_id,
                    platformIdLike: releaseInfo.id_like
                });
            }
        }
    });
    if (args['print-startup-performance']) {
        let output = '';
        output += `Start-up time: ${vscodeServerListenTime - vscodeServerStartTime}\n`;
        output += `Code loading time: ${vscodeServerCodeLoadedTime - vscodeServerStartTime}\n`;
        output += `Initialized time: ${currentTime - vscodeServerStartTime}\n`;
        output += `\n`;
        console.log(output);
    }
    return remoteExtensionHostAgentServer;
}
class WebEndpointOriginChecker {
    static create(productService) {
        const webEndpointUrlTemplate = productService.webEndpointUrlTemplate;
        const commit = productService.commit;
        const quality = productService.quality;
        if (!webEndpointUrlTemplate || !commit || !quality) {
            return new WebEndpointOriginChecker(null);
        }
        const uuid = generateUuid();
        const exampleUrl = new URL(webEndpointUrlTemplate
            .replace('{{uuid}}', uuid)
            .replace('{{commit}}', commit)
            .replace('{{quality}}', quality));
        const exampleOrigin = exampleUrl.origin;
        const originRegExpSource = (escapeRegExpCharacters(exampleOrigin)
            .replace(uuid, '[a-zA-Z0-9\\-]+'));
        try {
            const originRegExp = createRegExp(`^${originRegExpSource}$`, true, { matchCase: false });
            return new WebEndpointOriginChecker(originRegExp);
        }
        catch (err) {
            return new WebEndpointOriginChecker(null);
        }
    }
    constructor(_originRegExp) {
        this._originRegExp = _originRegExp;
    }
    matches(origin) {
        if (!this._originRegExp) {
            return false;
        }
        return this._originRegExp.test(origin);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50U2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50U2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRXpCLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDO0FBQzNCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXZELE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsVUFBVSxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RILE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxLQUFLLElBQUksTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEtBQUssUUFBUSxNQUFNLCtCQUErQixDQUFDO0FBQzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNw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