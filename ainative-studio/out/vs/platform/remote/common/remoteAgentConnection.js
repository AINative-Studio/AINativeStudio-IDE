/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise, promiseWithResolvers } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { isCancellationError, onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { RemoteAuthorities } from '../../../base/common/network.js';
import * as performance from '../../../base/common/performance.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { Client, PersistentProtocol } from '../../../base/parts/ipc/common/ipc.net.js';
import { RemoteAuthorityResolverError } from './remoteAuthorityResolver.js';
const RECONNECT_TIMEOUT = 30 * 1000 /* 30s */;
export var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["Management"] = 1] = "Management";
    ConnectionType[ConnectionType["ExtensionHost"] = 2] = "ExtensionHost";
    ConnectionType[ConnectionType["Tunnel"] = 3] = "Tunnel";
})(ConnectionType || (ConnectionType = {}));
function connectionTypeToString(connectionType) {
    switch (connectionType) {
        case 1 /* ConnectionType.Management */:
            return 'Management';
        case 2 /* ConnectionType.ExtensionHost */:
            return 'ExtensionHost';
        case 3 /* ConnectionType.Tunnel */:
            return 'Tunnel';
    }
}
function createTimeoutCancellation(millis) {
    const source = new CancellationTokenSource();
    setTimeout(() => source.cancel(), millis);
    return source.token;
}
function combineTimeoutCancellation(a, b) {
    if (a.isCancellationRequested || b.isCancellationRequested) {
        return CancellationToken.Cancelled;
    }
    const source = new CancellationTokenSource();
    a.onCancellationRequested(() => source.cancel());
    b.onCancellationRequested(() => source.cancel());
    return source.token;
}
class PromiseWithTimeout {
    get didTimeout() {
        return (this._state === 'timedout');
    }
    constructor(timeoutCancellationToken) {
        this._state = 'pending';
        this._disposables = new DisposableStore();
        ({ promise: this.promise, resolve: this._resolvePromise, reject: this._rejectPromise } = promiseWithResolvers());
        if (timeoutCancellationToken.isCancellationRequested) {
            this._timeout();
        }
        else {
            this._disposables.add(timeoutCancellationToken.onCancellationRequested(() => this._timeout()));
        }
    }
    registerDisposable(disposable) {
        if (this._state === 'pending') {
            this._disposables.add(disposable);
        }
        else {
            disposable.dispose();
        }
    }
    _timeout() {
        if (this._state !== 'pending') {
            return;
        }
        this._disposables.dispose();
        this._state = 'timedout';
        this._rejectPromise(this._createTimeoutError());
    }
    _createTimeoutError() {
        const err = new Error('Time limit reached');
        err.code = 'ETIMEDOUT';
        err.syscall = 'connect';
        return err;
    }
    resolve(value) {
        if (this._state !== 'pending') {
            return;
        }
        this._disposables.dispose();
        this._state = 'resolved';
        this._resolvePromise(value);
    }
    reject(err) {
        if (this._state !== 'pending') {
            return;
        }
        this._disposables.dispose();
        this._state = 'rejected';
        this._rejectPromise(err);
    }
}
function readOneControlMessage(protocol, timeoutCancellationToken) {
    const result = new PromiseWithTimeout(timeoutCancellationToken);
    result.registerDisposable(protocol.onControlMessage(raw => {
        const msg = JSON.parse(raw.toString());
        const error = getErrorFromMessage(msg);
        if (error) {
            result.reject(error);
        }
        else {
            result.resolve(msg);
        }
    }));
    return result.promise;
}
function createSocket(logService, remoteSocketFactoryService, connectTo, path, query, debugConnectionType, debugLabel, timeoutCancellationToken) {
    const result = new PromiseWithTimeout(timeoutCancellationToken);
    const sw = StopWatch.create(false);
    logService.info(`Creating a socket (${debugLabel})...`);
    performance.mark(`code/willCreateSocket/${debugConnectionType}`);
    remoteSocketFactoryService.connect(connectTo, path, query, debugLabel).then((socket) => {
        if (result.didTimeout) {
            performance.mark(`code/didCreateSocketError/${debugConnectionType}`);
            logService.info(`Creating a socket (${debugLabel}) finished after ${sw.elapsed()} ms, but this is too late and has timed out already.`);
            socket?.dispose();
        }
        else {
            performance.mark(`code/didCreateSocketOK/${debugConnectionType}`);
            logService.info(`Creating a socket (${debugLabel}) was successful after ${sw.elapsed()} ms.`);
            result.resolve(socket);
        }
    }, (err) => {
        performance.mark(`code/didCreateSocketError/${debugConnectionType}`);
        logService.info(`Creating a socket (${debugLabel}) returned an error after ${sw.elapsed()} ms.`);
        logService.error(err);
        result.reject(err);
    });
    return result.promise;
}
function raceWithTimeoutCancellation(promise, timeoutCancellationToken) {
    const result = new PromiseWithTimeout(timeoutCancellationToken);
    promise.then((res) => {
        if (!result.didTimeout) {
            result.resolve(res);
        }
    }, (err) => {
        if (!result.didTimeout) {
            result.reject(err);
        }
    });
    return result.promise;
}
async function connectToRemoteExtensionHostAgent(options, connectionType, args, timeoutCancellationToken) {
    const logPrefix = connectLogPrefix(options, connectionType);
    options.logService.trace(`${logPrefix} 1/6. invoking socketFactory.connect().`);
    let socket;
    try {
        socket = await createSocket(options.logService, options.remoteSocketFactoryService, options.connectTo, RemoteAuthorities.getServerRootPath(), `reconnectionToken=${options.reconnectionToken}&reconnection=${options.reconnectionProtocol ? 'true' : 'false'}`, connectionTypeToString(connectionType), `renderer-${connectionTypeToString(connectionType)}-${options.reconnectionToken}`, timeoutCancellationToken);
    }
    catch (error) {
        options.logService.error(`${logPrefix} socketFactory.connect() failed or timed out. Error:`);
        options.logService.error(error);
        throw error;
    }
    options.logService.trace(`${logPrefix} 2/6. socketFactory.connect() was successful.`);
    let protocol;
    let ownsProtocol;
    if (options.reconnectionProtocol) {
        options.reconnectionProtocol.beginAcceptReconnection(socket, null);
        protocol = options.reconnectionProtocol;
        ownsProtocol = false;
    }
    else {
        protocol = new PersistentProtocol({ socket });
        ownsProtocol = true;
    }
    options.logService.trace(`${logPrefix} 3/6. sending AuthRequest control message.`);
    const message = await raceWithTimeoutCancellation(options.signService.createNewMessage(generateUuid()), timeoutCancellationToken);
    const authRequest = {
        type: 'auth',
        auth: options.connectionToken || '00000000000000000000',
        data: message.data
    };
    protocol.sendControl(VSBuffer.fromString(JSON.stringify(authRequest)));
    try {
        const msg = await readOneControlMessage(protocol, combineTimeoutCancellation(timeoutCancellationToken, createTimeoutCancellation(10000)));
        if (msg.type !== 'sign' || typeof msg.data !== 'string') {
            const error = new Error('Unexpected handshake message');
            error.code = 'VSCODE_CONNECTION_ERROR';
            throw error;
        }
        options.logService.trace(`${logPrefix} 4/6. received SignRequest control message.`);
        const isValid = await raceWithTimeoutCancellation(options.signService.validate(message, msg.signedData), timeoutCancellationToken);
        if (!isValid) {
            const error = new Error('Refused to connect to unsupported server');
            error.code = 'VSCODE_CONNECTION_ERROR';
            throw error;
        }
        const signed = await raceWithTimeoutCancellation(options.signService.sign(msg.data), timeoutCancellationToken);
        const connTypeRequest = {
            type: 'connectionType',
            commit: options.commit,
            signedData: signed,
            desiredConnectionType: connectionType
        };
        if (args) {
            connTypeRequest.args = args;
        }
        options.logService.trace(`${logPrefix} 5/6. sending ConnectionTypeRequest control message.`);
        protocol.sendControl(VSBuffer.fromString(JSON.stringify(connTypeRequest)));
        return { protocol, ownsProtocol };
    }
    catch (error) {
        if (error && error.code === 'ETIMEDOUT') {
            options.logService.error(`${logPrefix} the handshake timed out. Error:`);
            options.logService.error(error);
        }
        if (error && error.code === 'VSCODE_CONNECTION_ERROR') {
            options.logService.error(`${logPrefix} received error control message when negotiating connection. Error:`);
            options.logService.error(error);
        }
        if (ownsProtocol) {
            safeDisposeProtocolAndSocket(protocol);
        }
        throw error;
    }
}
async function connectToRemoteExtensionHostAgentAndReadOneMessage(options, connectionType, args, timeoutCancellationToken) {
    const startTime = Date.now();
    const logPrefix = connectLogPrefix(options, connectionType);
    const { protocol, ownsProtocol } = await connectToRemoteExtensionHostAgent(options, connectionType, args, timeoutCancellationToken);
    const result = new PromiseWithTimeout(timeoutCancellationToken);
    result.registerDisposable(protocol.onControlMessage(raw => {
        const msg = JSON.parse(raw.toString());
        const error = getErrorFromMessage(msg);
        if (error) {
            options.logService.error(`${logPrefix} received error control message when negotiating connection. Error:`);
            options.logService.error(error);
            if (ownsProtocol) {
                safeDisposeProtocolAndSocket(protocol);
            }
            result.reject(error);
        }
        else {
            options.reconnectionProtocol?.endAcceptReconnection();
            options.logService.trace(`${logPrefix} 6/6. handshake finished, connection is up and running after ${logElapsed(startTime)}!`);
            result.resolve({ protocol, firstMessage: msg });
        }
    }));
    return result.promise;
}
async function doConnectRemoteAgentManagement(options, timeoutCancellationToken) {
    const { protocol } = await connectToRemoteExtensionHostAgentAndReadOneMessage(options, 1 /* ConnectionType.Management */, undefined, timeoutCancellationToken);
    return { protocol };
}
async function doConnectRemoteAgentExtensionHost(options, startArguments, timeoutCancellationToken) {
    const { protocol, firstMessage } = await connectToRemoteExtensionHostAgentAndReadOneMessage(options, 2 /* ConnectionType.ExtensionHost */, startArguments, timeoutCancellationToken);
    const debugPort = firstMessage && firstMessage.debugPort;
    return { protocol, debugPort };
}
async function doConnectRemoteAgentTunnel(options, startParams, timeoutCancellationToken) {
    const startTime = Date.now();
    const logPrefix = connectLogPrefix(options, 3 /* ConnectionType.Tunnel */);
    const { protocol } = await connectToRemoteExtensionHostAgent(options, 3 /* ConnectionType.Tunnel */, startParams, timeoutCancellationToken);
    options.logService.trace(`${logPrefix} 6/6. handshake finished, connection is up and running after ${logElapsed(startTime)}!`);
    return protocol;
}
async function resolveConnectionOptions(options, reconnectionToken, reconnectionProtocol) {
    const { connectTo, connectionToken } = await options.addressProvider.getAddress();
    return {
        commit: options.commit,
        quality: options.quality,
        connectTo,
        connectionToken: connectionToken,
        reconnectionToken: reconnectionToken,
        reconnectionProtocol: reconnectionProtocol,
        remoteSocketFactoryService: options.remoteSocketFactoryService,
        signService: options.signService,
        logService: options.logService
    };
}
export async function connectRemoteAgentManagement(options, remoteAuthority, clientId) {
    return createInitialConnection(options, async (simpleOptions) => {
        const { protocol } = await doConnectRemoteAgentManagement(simpleOptions, CancellationToken.None);
        return new ManagementPersistentConnection(options, remoteAuthority, clientId, simpleOptions.reconnectionToken, protocol);
    });
}
export async function connectRemoteAgentExtensionHost(options, startArguments) {
    return createInitialConnection(options, async (simpleOptions) => {
        const { protocol, debugPort } = await doConnectRemoteAgentExtensionHost(simpleOptions, startArguments, CancellationToken.None);
        return new ExtensionHostPersistentConnection(options, startArguments, simpleOptions.reconnectionToken, protocol, debugPort);
    });
}
/**
 * Will attempt to connect 5 times. If it fails 5 consecutive times, it will give up.
 */
async function createInitialConnection(options, connectionFactory) {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1;; attempt++) {
        try {
            const reconnectionToken = generateUuid();
            const simpleOptions = await resolveConnectionOptions(options, reconnectionToken, null);
            const result = await connectionFactory(simpleOptions);
            return result;
        }
        catch (err) {
            if (attempt < MAX_ATTEMPTS) {
                options.logService.error(`[remote-connection][attempt ${attempt}] An error occurred in initial connection! Will retry... Error:`);
                options.logService.error(err);
            }
            else {
                options.logService.error(`[remote-connection][attempt ${attempt}]  An error occurred in initial connection! It will be treated as a permanent error. Error:`);
                options.logService.error(err);
                PersistentConnection.triggerPermanentFailure(0, 0, RemoteAuthorityResolverError.isHandled(err));
                throw err;
            }
        }
    }
}
export async function connectRemoteAgentTunnel(options, tunnelRemoteHost, tunnelRemotePort) {
    const simpleOptions = await resolveConnectionOptions(options, generateUuid(), null);
    const protocol = await doConnectRemoteAgentTunnel(simpleOptions, { host: tunnelRemoteHost, port: tunnelRemotePort }, CancellationToken.None);
    return protocol;
}
function sleep(seconds) {
    return createCancelablePromise(token => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, seconds * 1000);
            token.onCancellationRequested(() => {
                clearTimeout(timeout);
                resolve();
            });
        });
    });
}
export var PersistentConnectionEventType;
(function (PersistentConnectionEventType) {
    PersistentConnectionEventType[PersistentConnectionEventType["ConnectionLost"] = 0] = "ConnectionLost";
    PersistentConnectionEventType[PersistentConnectionEventType["ReconnectionWait"] = 1] = "ReconnectionWait";
    PersistentConnectionEventType[PersistentConnectionEventType["ReconnectionRunning"] = 2] = "ReconnectionRunning";
    PersistentConnectionEventType[PersistentConnectionEventType["ReconnectionPermanentFailure"] = 3] = "ReconnectionPermanentFailure";
    PersistentConnectionEventType[PersistentConnectionEventType["ConnectionGain"] = 4] = "ConnectionGain";
})(PersistentConnectionEventType || (PersistentConnectionEventType = {}));
export class ConnectionLostEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.type = 0 /* PersistentConnectionEventType.ConnectionLost */;
    }
}
export class ReconnectionWaitEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData, durationSeconds, cancellableTimer) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.durationSeconds = durationSeconds;
        this.cancellableTimer = cancellableTimer;
        this.type = 1 /* PersistentConnectionEventType.ReconnectionWait */;
    }
    skipWait() {
        this.cancellableTimer.cancel();
    }
}
export class ReconnectionRunningEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData, attempt) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.attempt = attempt;
        this.type = 2 /* PersistentConnectionEventType.ReconnectionRunning */;
    }
}
export class ConnectionGainEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData, attempt) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.attempt = attempt;
        this.type = 4 /* PersistentConnectionEventType.ConnectionGain */;
    }
}
export class ReconnectionPermanentFailureEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData, attempt, handled) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.attempt = attempt;
        this.handled = handled;
        this.type = 3 /* PersistentConnectionEventType.ReconnectionPermanentFailure */;
    }
}
export class PersistentConnection extends Disposable {
    static triggerPermanentFailure(millisSinceLastIncomingData, attempt, handled) {
        this._permanentFailure = true;
        this._permanentFailureMillisSinceLastIncomingData = millisSinceLastIncomingData;
        this._permanentFailureAttempt = attempt;
        this._permanentFailureHandled = handled;
        this._instances.forEach(instance => instance._gotoPermanentFailure(this._permanentFailureMillisSinceLastIncomingData, this._permanentFailureAttempt, this._permanentFailureHandled));
    }
    static debugTriggerReconnection() {
        this._instances.forEach(instance => instance._beginReconnecting());
    }
    static debugPauseSocketWriting() {
        this._instances.forEach(instance => instance._pauseSocketWriting());
    }
    static { this._permanentFailure = false; }
    static { this._permanentFailureMillisSinceLastIncomingData = 0; }
    static { this._permanentFailureAttempt = 0; }
    static { this._permanentFailureHandled = false; }
    static { this._instances = []; }
    get _isPermanentFailure() {
        return this._permanentFailure || PersistentConnection._permanentFailure;
    }
    constructor(_connectionType, _options, reconnectionToken, protocol, _reconnectionFailureIsFatal) {
        super();
        this._connectionType = _connectionType;
        this._options = _options;
        this.reconnectionToken = reconnectionToken;
        this.protocol = protocol;
        this._reconnectionFailureIsFatal = _reconnectionFailureIsFatal;
        this._onDidStateChange = this._register(new Emitter());
        this.onDidStateChange = this._onDidStateChange.event;
        this._permanentFailure = false;
        this._isReconnecting = false;
        this._isDisposed = false;
        this._onDidStateChange.fire(new ConnectionGainEvent(this.reconnectionToken, 0, 0));
        this._register(protocol.onSocketClose((e) => {
            const logPrefix = commonLogPrefix(this._connectionType, this.reconnectionToken, true);
            if (!e) {
                this._options.logService.info(`${logPrefix} received socket close event.`);
            }
            else if (e.type === 0 /* SocketCloseEventType.NodeSocketCloseEvent */) {
                this._options.logService.info(`${logPrefix} received socket close event (hadError: ${e.hadError}).`);
                if (e.error) {
                    this._options.logService.error(e.error);
                }
            }
            else {
                this._options.logService.info(`${logPrefix} received socket close event (wasClean: ${e.wasClean}, code: ${e.code}, reason: ${e.reason}).`);
                if (e.event) {
                    this._options.logService.error(e.event);
                }
            }
            this._beginReconnecting();
        }));
        this._register(protocol.onSocketTimeout((e) => {
            const logPrefix = commonLogPrefix(this._connectionType, this.reconnectionToken, true);
            this._options.logService.info(`${logPrefix} received socket timeout event (unacknowledgedMsgCount: ${e.unacknowledgedMsgCount}, timeSinceOldestUnacknowledgedMsg: ${e.timeSinceOldestUnacknowledgedMsg}, timeSinceLastReceivedSomeData: ${e.timeSinceLastReceivedSomeData}).`);
            this._beginReconnecting();
        }));
        PersistentConnection._instances.push(this);
        this._register(toDisposable(() => {
            const myIndex = PersistentConnection._instances.indexOf(this);
            if (myIndex >= 0) {
                PersistentConnection._instances.splice(myIndex, 1);
            }
        }));
        if (this._isPermanentFailure) {
            this._gotoPermanentFailure(PersistentConnection._permanentFailureMillisSinceLastIncomingData, PersistentConnection._permanentFailureAttempt, PersistentConnection._permanentFailureHandled);
        }
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
    async _beginReconnecting() {
        // Only have one reconnection loop active at a time.
        if (this._isReconnecting) {
            return;
        }
        try {
            this._isReconnecting = true;
            await this._runReconnectingLoop();
        }
        finally {
            this._isReconnecting = false;
        }
    }
    async _runReconnectingLoop() {
        if (this._isPermanentFailure || this._isDisposed) {
            // no more attempts!
            return;
        }
        const logPrefix = commonLogPrefix(this._connectionType, this.reconnectionToken, true);
        this._options.logService.info(`${logPrefix} starting reconnecting loop. You can get more information with the trace log level.`);
        this._onDidStateChange.fire(new ConnectionLostEvent(this.reconnectionToken, this.protocol.getMillisSinceLastIncomingData()));
        const TIMES = [0, 5, 5, 10, 10, 10, 10, 10, 30];
        let attempt = -1;
        do {
            attempt++;
            const waitTime = (attempt < TIMES.length ? TIMES[attempt] : TIMES[TIMES.length - 1]);
            try {
                if (waitTime > 0) {
                    const sleepPromise = sleep(waitTime);
                    this._onDidStateChange.fire(new ReconnectionWaitEvent(this.reconnectionToken, this.protocol.getMillisSinceLastIncomingData(), waitTime, sleepPromise));
                    this._options.logService.info(`${logPrefix} waiting for ${waitTime} seconds before reconnecting...`);
                    try {
                        await sleepPromise;
                    }
                    catch { } // User canceled timer
                }
                if (this._isPermanentFailure) {
                    this._options.logService.error(`${logPrefix} permanent failure occurred while running the reconnecting loop.`);
                    break;
                }
                // connection was lost, let's try to re-establish it
                this._onDidStateChange.fire(new ReconnectionRunningEvent(this.reconnectionToken, this.protocol.getMillisSinceLastIncomingData(), attempt + 1));
                this._options.logService.info(`${logPrefix} resolving connection...`);
                const simpleOptions = await resolveConnectionOptions(this._options, this.reconnectionToken, this.protocol);
                this._options.logService.info(`${logPrefix} connecting to ${simpleOptions.connectTo}...`);
                await this._reconnect(simpleOptions, createTimeoutCancellation(RECONNECT_TIMEOUT));
                this._options.logService.info(`${logPrefix} reconnected!`);
                this._onDidStateChange.fire(new ConnectionGainEvent(this.reconnectionToken, this.protocol.getMillisSinceLastIncomingData(), attempt + 1));
                break;
            }
            catch (err) {
                if (err.code === 'VSCODE_CONNECTION_ERROR') {
                    this._options.logService.error(`${logPrefix} A permanent error occurred in the reconnecting loop! Will give up now! Error:`);
                    this._options.logService.error(err);
                    this._onReconnectionPermanentFailure(this.protocol.getMillisSinceLastIncomingData(), attempt + 1, false);
                    break;
                }
                if (attempt > 360) {
                    // ReconnectionGraceTime is 3hrs, with 30s between attempts that yields a maximum of 360 attempts
                    this._options.logService.error(`${logPrefix} An error occurred while reconnecting, but it will be treated as a permanent error because the reconnection grace time has expired! Will give up now! Error:`);
                    this._options.logService.error(err);
                    this._onReconnectionPermanentFailure(this.protocol.getMillisSinceLastIncomingData(), attempt + 1, false);
                    break;
                }
                if (RemoteAuthorityResolverError.isTemporarilyNotAvailable(err)) {
                    this._options.logService.info(`${logPrefix} A temporarily not available error occurred while trying to reconnect, will try again...`);
                    this._options.logService.trace(err);
                    // try again!
                    continue;
                }
                if ((err.code === 'ETIMEDOUT' || err.code === 'ENETUNREACH' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') && err.syscall === 'connect') {
                    this._options.logService.info(`${logPrefix} A network error occurred while trying to reconnect, will try again...`);
                    this._options.logService.trace(err);
                    // try again!
                    continue;
                }
                if (isCancellationError(err)) {
                    this._options.logService.info(`${logPrefix} A promise cancelation error occurred while trying to reconnect, will try again...`);
                    this._options.logService.trace(err);
                    // try again!
                    continue;
                }
                if (err instanceof RemoteAuthorityResolverError) {
                    this._options.logService.error(`${logPrefix} A RemoteAuthorityResolverError occurred while trying to reconnect. Will give up now! Error:`);
                    this._options.logService.error(err);
                    this._onReconnectionPermanentFailure(this.protocol.getMillisSinceLastIncomingData(), attempt + 1, RemoteAuthorityResolverError.isHandled(err));
                    break;
                }
                this._options.logService.error(`${logPrefix} An unknown error occurred while trying to reconnect, since this is an unknown case, it will be treated as a permanent error! Will give up now! Error:`);
                this._options.logService.error(err);
                this._onReconnectionPermanentFailure(this.protocol.getMillisSinceLastIncomingData(), attempt + 1, false);
                break;
            }
        } while (!this._isPermanentFailure && !this._isDisposed);
    }
    _onReconnectionPermanentFailure(millisSinceLastIncomingData, attempt, handled) {
        if (this._reconnectionFailureIsFatal) {
            PersistentConnection.triggerPermanentFailure(millisSinceLastIncomingData, attempt, handled);
        }
        else {
            this._gotoPermanentFailure(millisSinceLastIncomingData, attempt, handled);
        }
    }
    _gotoPermanentFailure(millisSinceLastIncomingData, attempt, handled) {
        this._onDidStateChange.fire(new ReconnectionPermanentFailureEvent(this.reconnectionToken, millisSinceLastIncomingData, attempt, handled));
        safeDisposeProtocolAndSocket(this.protocol);
    }
    _pauseSocketWriting() {
        this.protocol.pauseSocketWriting();
    }
}
export class ManagementPersistentConnection extends PersistentConnection {
    constructor(options, remoteAuthority, clientId, reconnectionToken, protocol) {
        super(1 /* ConnectionType.Management */, options, reconnectionToken, protocol, /*reconnectionFailureIsFatal*/ true);
        this.client = this._register(new Client(protocol, {
            remoteAuthority: remoteAuthority,
            clientId: clientId
        }, options.ipcLogger));
    }
    async _reconnect(options, timeoutCancellationToken) {
        await doConnectRemoteAgentManagement(options, timeoutCancellationToken);
    }
}
export class ExtensionHostPersistentConnection extends PersistentConnection {
    constructor(options, startArguments, reconnectionToken, protocol, debugPort) {
        super(2 /* ConnectionType.ExtensionHost */, options, reconnectionToken, protocol, /*reconnectionFailureIsFatal*/ false);
        this._startArguments = startArguments;
        this.debugPort = debugPort;
    }
    async _reconnect(options, timeoutCancellationToken) {
        await doConnectRemoteAgentExtensionHost(options, this._startArguments, timeoutCancellationToken);
    }
}
function safeDisposeProtocolAndSocket(protocol) {
    try {
        protocol.acceptDisconnect();
        const socket = protocol.getSocket();
        protocol.dispose();
        socket.dispose();
    }
    catch (err) {
        onUnexpectedError(err);
    }
}
function getErrorFromMessage(msg) {
    if (msg && msg.type === 'error') {
        const error = new Error(`Connection error: ${msg.reason}`);
        error.code = 'VSCODE_CONNECTION_ERROR';
        return error;
    }
    return null;
}
function stringRightPad(str, len) {
    while (str.length < len) {
        str += ' ';
    }
    return str;
}
function _commonLogPrefix(connectionType, reconnectionToken) {
    return `[remote-connection][${stringRightPad(connectionTypeToString(connectionType), 13)}][${reconnectionToken.substr(0, 5)}…]`;
}
function commonLogPrefix(connectionType, reconnectionToken, isReconnect) {
    return `${_commonLogPrefix(connectionType, reconnectionToken)}[${isReconnect ? 'reconnect' : 'initial'}]`;
}
function connectLogPrefix(options, connectionType) {
    return `${commonLogPrefix(connectionType, options.reconnectionToken, !!options.reconnectionProtocol)}[${options.connectTo}]`;
}
function logElapsed(startTime) {
    return `${Date.now() - startTime} ms`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRDb25uZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9jb21tb24vcmVtb3RlQWdlbnRDb25uZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BFLE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsTUFBTSxFQUFXLGtCQUFrQixFQUF3QixNQUFNLDJDQUEyQyxDQUFDO0FBR3RILE9BQU8sRUFBRSw0QkFBNEIsRUFBb0IsTUFBTSw4QkFBOEIsQ0FBQztBQUk5RixNQUFNLGlCQUFpQixHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBRTlDLE1BQU0sQ0FBTixJQUFrQixjQUlq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