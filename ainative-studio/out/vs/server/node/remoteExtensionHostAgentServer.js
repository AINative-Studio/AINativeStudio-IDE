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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50U2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3JlbW90ZUV4dGVuc2lvbkhvc3RBZ2VudFNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUV6QixPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQztBQUMzQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLFVBQVUsRUFBRSx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0SCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzFELE9BQU8sS0FBSyxJQUFJLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxLQUFLLFFBQVEsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFD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