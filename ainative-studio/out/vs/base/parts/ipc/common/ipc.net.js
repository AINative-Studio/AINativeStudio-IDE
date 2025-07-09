/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../common/buffer.js';
import { Emitter } from '../../../common/event.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import { IPCClient } from './ipc.js';
export var SocketDiagnosticsEventType;
(function (SocketDiagnosticsEventType) {
    SocketDiagnosticsEventType["Created"] = "created";
    SocketDiagnosticsEventType["Read"] = "read";
    SocketDiagnosticsEventType["Write"] = "write";
    SocketDiagnosticsEventType["Open"] = "open";
    SocketDiagnosticsEventType["Error"] = "error";
    SocketDiagnosticsEventType["Close"] = "close";
    SocketDiagnosticsEventType["BrowserWebSocketBlobReceived"] = "browserWebSocketBlobReceived";
    SocketDiagnosticsEventType["NodeEndReceived"] = "nodeEndReceived";
    SocketDiagnosticsEventType["NodeEndSent"] = "nodeEndSent";
    SocketDiagnosticsEventType["NodeDrainBegin"] = "nodeDrainBegin";
    SocketDiagnosticsEventType["NodeDrainEnd"] = "nodeDrainEnd";
    SocketDiagnosticsEventType["zlibInflateError"] = "zlibInflateError";
    SocketDiagnosticsEventType["zlibInflateData"] = "zlibInflateData";
    SocketDiagnosticsEventType["zlibInflateInitialWrite"] = "zlibInflateInitialWrite";
    SocketDiagnosticsEventType["zlibInflateInitialFlushFired"] = "zlibInflateInitialFlushFired";
    SocketDiagnosticsEventType["zlibInflateWrite"] = "zlibInflateWrite";
    SocketDiagnosticsEventType["zlibInflateFlushFired"] = "zlibInflateFlushFired";
    SocketDiagnosticsEventType["zlibDeflateError"] = "zlibDeflateError";
    SocketDiagnosticsEventType["zlibDeflateData"] = "zlibDeflateData";
    SocketDiagnosticsEventType["zlibDeflateWrite"] = "zlibDeflateWrite";
    SocketDiagnosticsEventType["zlibDeflateFlushFired"] = "zlibDeflateFlushFired";
    SocketDiagnosticsEventType["WebSocketNodeSocketWrite"] = "webSocketNodeSocketWrite";
    SocketDiagnosticsEventType["WebSocketNodeSocketPeekedHeader"] = "webSocketNodeSocketPeekedHeader";
    SocketDiagnosticsEventType["WebSocketNodeSocketReadHeader"] = "webSocketNodeSocketReadHeader";
    SocketDiagnosticsEventType["WebSocketNodeSocketReadData"] = "webSocketNodeSocketReadData";
    SocketDiagnosticsEventType["WebSocketNodeSocketUnmaskedData"] = "webSocketNodeSocketUnmaskedData";
    SocketDiagnosticsEventType["WebSocketNodeSocketDrainBegin"] = "webSocketNodeSocketDrainBegin";
    SocketDiagnosticsEventType["WebSocketNodeSocketDrainEnd"] = "webSocketNodeSocketDrainEnd";
    SocketDiagnosticsEventType["ProtocolHeaderRead"] = "protocolHeaderRead";
    SocketDiagnosticsEventType["ProtocolMessageRead"] = "protocolMessageRead";
    SocketDiagnosticsEventType["ProtocolHeaderWrite"] = "protocolHeaderWrite";
    SocketDiagnosticsEventType["ProtocolMessageWrite"] = "protocolMessageWrite";
    SocketDiagnosticsEventType["ProtocolWrite"] = "protocolWrite";
})(SocketDiagnosticsEventType || (SocketDiagnosticsEventType = {}));
export var SocketDiagnostics;
(function (SocketDiagnostics) {
    SocketDiagnostics.enableDiagnostics = false;
    SocketDiagnostics.records = [];
    const socketIds = new WeakMap();
    let lastUsedSocketId = 0;
    function getSocketId(nativeObject, label) {
        if (!socketIds.has(nativeObject)) {
            const id = String(++lastUsedSocketId);
            socketIds.set(nativeObject, id);
        }
        return socketIds.get(nativeObject);
    }
    function traceSocketEvent(nativeObject, socketDebugLabel, type, data) {
        if (!SocketDiagnostics.enableDiagnostics) {
            return;
        }
        const id = getSocketId(nativeObject, socketDebugLabel);
        if (data instanceof VSBuffer || data instanceof Uint8Array || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
            const copiedData = VSBuffer.alloc(data.byteLength);
            copiedData.set(data);
            SocketDiagnostics.records.push({ timestamp: Date.now(), id, label: socketDebugLabel, type, buff: copiedData });
        }
        else {
            // data is a custom object
            SocketDiagnostics.records.push({ timestamp: Date.now(), id, label: socketDebugLabel, type, data: data });
        }
    }
    SocketDiagnostics.traceSocketEvent = traceSocketEvent;
})(SocketDiagnostics || (SocketDiagnostics = {}));
export var SocketCloseEventType;
(function (SocketCloseEventType) {
    SocketCloseEventType[SocketCloseEventType["NodeSocketCloseEvent"] = 0] = "NodeSocketCloseEvent";
    SocketCloseEventType[SocketCloseEventType["WebSocketCloseEvent"] = 1] = "WebSocketCloseEvent";
})(SocketCloseEventType || (SocketCloseEventType = {}));
let emptyBuffer = null;
function getEmptyBuffer() {
    if (!emptyBuffer) {
        emptyBuffer = VSBuffer.alloc(0);
    }
    return emptyBuffer;
}
export class ChunkStream {
    get byteLength() {
        return this._totalLength;
    }
    constructor() {
        this._chunks = [];
        this._totalLength = 0;
    }
    acceptChunk(buff) {
        this._chunks.push(buff);
        this._totalLength += buff.byteLength;
    }
    read(byteCount) {
        return this._read(byteCount, true);
    }
    peek(byteCount) {
        return this._read(byteCount, false);
    }
    _read(byteCount, advance) {
        if (byteCount === 0) {
            return getEmptyBuffer();
        }
        if (byteCount > this._totalLength) {
            throw new Error(`Cannot read so many bytes!`);
        }
        if (this._chunks[0].byteLength === byteCount) {
            // super fast path, precisely first chunk must be returned
            const result = this._chunks[0];
            if (advance) {
                this._chunks.shift();
                this._totalLength -= byteCount;
            }
            return result;
        }
        if (this._chunks[0].byteLength > byteCount) {
            // fast path, the reading is entirely within the first chunk
            const result = this._chunks[0].slice(0, byteCount);
            if (advance) {
                this._chunks[0] = this._chunks[0].slice(byteCount);
                this._totalLength -= byteCount;
            }
            return result;
        }
        const result = VSBuffer.alloc(byteCount);
        let resultOffset = 0;
        let chunkIndex = 0;
        while (byteCount > 0) {
            const chunk = this._chunks[chunkIndex];
            if (chunk.byteLength > byteCount) {
                // this chunk will survive
                const chunkPart = chunk.slice(0, byteCount);
                result.set(chunkPart, resultOffset);
                resultOffset += byteCount;
                if (advance) {
                    this._chunks[chunkIndex] = chunk.slice(byteCount);
                    this._totalLength -= byteCount;
                }
                byteCount -= byteCount;
            }
            else {
                // this chunk will be entirely read
                result.set(chunk, resultOffset);
                resultOffset += chunk.byteLength;
                if (advance) {
                    this._chunks.shift();
                    this._totalLength -= chunk.byteLength;
                }
                else {
                    chunkIndex++;
                }
                byteCount -= chunk.byteLength;
            }
        }
        return result;
    }
}
var ProtocolMessageType;
(function (ProtocolMessageType) {
    ProtocolMessageType[ProtocolMessageType["None"] = 0] = "None";
    ProtocolMessageType[ProtocolMessageType["Regular"] = 1] = "Regular";
    ProtocolMessageType[ProtocolMessageType["Control"] = 2] = "Control";
    ProtocolMessageType[ProtocolMessageType["Ack"] = 3] = "Ack";
    ProtocolMessageType[ProtocolMessageType["Disconnect"] = 5] = "Disconnect";
    ProtocolMessageType[ProtocolMessageType["ReplayRequest"] = 6] = "ReplayRequest";
    ProtocolMessageType[ProtocolMessageType["Pause"] = 7] = "Pause";
    ProtocolMessageType[ProtocolMessageType["Resume"] = 8] = "Resume";
    ProtocolMessageType[ProtocolMessageType["KeepAlive"] = 9] = "KeepAlive";
})(ProtocolMessageType || (ProtocolMessageType = {}));
function protocolMessageTypeToString(messageType) {
    switch (messageType) {
        case 0 /* ProtocolMessageType.None */: return 'None';
        case 1 /* ProtocolMessageType.Regular */: return 'Regular';
        case 2 /* ProtocolMessageType.Control */: return 'Control';
        case 3 /* ProtocolMessageType.Ack */: return 'Ack';
        case 5 /* ProtocolMessageType.Disconnect */: return 'Disconnect';
        case 6 /* ProtocolMessageType.ReplayRequest */: return 'ReplayRequest';
        case 7 /* ProtocolMessageType.Pause */: return 'PauseWriting';
        case 8 /* ProtocolMessageType.Resume */: return 'ResumeWriting';
        case 9 /* ProtocolMessageType.KeepAlive */: return 'KeepAlive';
    }
}
export var ProtocolConstants;
(function (ProtocolConstants) {
    ProtocolConstants[ProtocolConstants["HeaderLength"] = 13] = "HeaderLength";
    /**
     * Send an Acknowledge message at most 2 seconds later...
     */
    ProtocolConstants[ProtocolConstants["AcknowledgeTime"] = 2000] = "AcknowledgeTime";
    /**
     * If there is a sent message that has been unacknowledged for 20 seconds,
     * and we didn't see any incoming server data in the past 20 seconds,
     * then consider the connection has timed out.
     */
    ProtocolConstants[ProtocolConstants["TimeoutTime"] = 20000] = "TimeoutTime";
    /**
     * If there is no reconnection within this time-frame, consider the connection permanently closed...
     */
    ProtocolConstants[ProtocolConstants["ReconnectionGraceTime"] = 10800000] = "ReconnectionGraceTime";
    /**
     * Maximal grace time between the first and the last reconnection...
     */
    ProtocolConstants[ProtocolConstants["ReconnectionShortGraceTime"] = 300000] = "ReconnectionShortGraceTime";
    /**
     * Send a message every 5 seconds to avoid that the connection is closed by the OS.
     */
    ProtocolConstants[ProtocolConstants["KeepAliveSendTime"] = 5000] = "KeepAliveSendTime";
})(ProtocolConstants || (ProtocolConstants = {}));
class ProtocolMessage {
    constructor(type, id, ack, data) {
        this.type = type;
        this.id = id;
        this.ack = ack;
        this.data = data;
        this.writtenTime = 0;
    }
    get size() {
        return this.data.byteLength;
    }
}
class ProtocolReader extends Disposable {
    constructor(socket) {
        super();
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._state = {
            readHead: true,
            readLen: 13 /* ProtocolConstants.HeaderLength */,
            messageType: 0 /* ProtocolMessageType.None */,
            id: 0,
            ack: 0
        };
        this._socket = socket;
        this._isDisposed = false;
        this._incomingData = new ChunkStream();
        this._register(this._socket.onData(data => this.acceptChunk(data)));
        this.lastReadTime = Date.now();
    }
    acceptChunk(data) {
        if (!data || data.byteLength === 0) {
            return;
        }
        this.lastReadTime = Date.now();
        this._incomingData.acceptChunk(data);
        while (this._incomingData.byteLength >= this._state.readLen) {
            const buff = this._incomingData.read(this._state.readLen);
            if (this._state.readHead) {
                // buff is the header
                // save new state => next time will read the body
                this._state.readHead = false;
                this._state.readLen = buff.readUInt32BE(9);
                this._state.messageType = buff.readUInt8(0);
                this._state.id = buff.readUInt32BE(1);
                this._state.ack = buff.readUInt32BE(5);
                this._socket.traceSocketEvent("protocolHeaderRead" /* SocketDiagnosticsEventType.ProtocolHeaderRead */, { messageType: protocolMessageTypeToString(this._state.messageType), id: this._state.id, ack: this._state.ack, messageSize: this._state.readLen });
            }
            else {
                // buff is the body
                const messageType = this._state.messageType;
                const id = this._state.id;
                const ack = this._state.ack;
                // save new state => next time will read the header
                this._state.readHead = true;
                this._state.readLen = 13 /* ProtocolConstants.HeaderLength */;
                this._state.messageType = 0 /* ProtocolMessageType.None */;
                this._state.id = 0;
                this._state.ack = 0;
                this._socket.traceSocketEvent("protocolMessageRead" /* SocketDiagnosticsEventType.ProtocolMessageRead */, buff);
                this._onMessage.fire(new ProtocolMessage(messageType, id, ack, buff));
                if (this._isDisposed) {
                    // check if an event listener lead to our disposal
                    break;
                }
            }
        }
    }
    readEntireBuffer() {
        return this._incomingData.read(this._incomingData.byteLength);
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
}
class ProtocolWriter {
    constructor(socket) {
        this._writeNowTimeout = null;
        this._isDisposed = false;
        this._isPaused = false;
        this._socket = socket;
        this._data = [];
        this._totalLength = 0;
        this.lastWriteTime = 0;
    }
    dispose() {
        try {
            this.flush();
        }
        catch (err) {
            // ignore error, since the socket could be already closed
        }
        this._isDisposed = true;
    }
    drain() {
        this.flush();
        return this._socket.drain();
    }
    flush() {
        // flush
        this._writeNow();
    }
    pause() {
        this._isPaused = true;
    }
    resume() {
        this._isPaused = false;
        this._scheduleWriting();
    }
    write(msg) {
        if (this._isDisposed) {
            // ignore: there could be left-over promises which complete and then
            // decide to write a response, etc...
            return;
        }
        msg.writtenTime = Date.now();
        this.lastWriteTime = Date.now();
        const header = VSBuffer.alloc(13 /* ProtocolConstants.HeaderLength */);
        header.writeUInt8(msg.type, 0);
        header.writeUInt32BE(msg.id, 1);
        header.writeUInt32BE(msg.ack, 5);
        header.writeUInt32BE(msg.data.byteLength, 9);
        this._socket.traceSocketEvent("protocolHeaderWrite" /* SocketDiagnosticsEventType.ProtocolHeaderWrite */, { messageType: protocolMessageTypeToString(msg.type), id: msg.id, ack: msg.ack, messageSize: msg.data.byteLength });
        this._socket.traceSocketEvent("protocolMessageWrite" /* SocketDiagnosticsEventType.ProtocolMessageWrite */, msg.data);
        this._writeSoon(header, msg.data);
    }
    _bufferAdd(head, body) {
        const wasEmpty = this._totalLength === 0;
        this._data.push(head, body);
        this._totalLength += head.byteLength + body.byteLength;
        return wasEmpty;
    }
    _bufferTake() {
        const ret = VSBuffer.concat(this._data, this._totalLength);
        this._data.length = 0;
        this._totalLength = 0;
        return ret;
    }
    _writeSoon(header, data) {
        if (this._bufferAdd(header, data)) {
            this._scheduleWriting();
        }
    }
    _scheduleWriting() {
        if (this._writeNowTimeout) {
            return;
        }
        this._writeNowTimeout = setTimeout(() => {
            this._writeNowTimeout = null;
            this._writeNow();
        });
    }
    _writeNow() {
        if (this._totalLength === 0) {
            return;
        }
        if (this._isPaused) {
            return;
        }
        const data = this._bufferTake();
        this._socket.traceSocketEvent("protocolWrite" /* SocketDiagnosticsEventType.ProtocolWrite */, { byteLength: data.byteLength });
        this._socket.write(data);
    }
}
/**
 * A message has the following format:
 * ```
 *     /-------------------------------|------\
 *     |             HEADER            |      |
 *     |-------------------------------| DATA |
 *     | TYPE | ID | ACK | DATA_LENGTH |      |
 *     \-------------------------------|------/
 * ```
 * The header is 9 bytes and consists of:
 *  - TYPE is 1 byte (ProtocolMessageType) - the message type
 *  - ID is 4 bytes (u32be) - the message id (can be 0 to indicate to be ignored)
 *  - ACK is 4 bytes (u32be) - the acknowledged message id (can be 0 to indicate to be ignored)
 *  - DATA_LENGTH is 4 bytes (u32be) - the length in bytes of DATA
 *
 * Only Regular messages are counted, other messages are not counted, nor acknowledged.
 */
export class Protocol extends Disposable {
    constructor(socket) {
        super();
        this._onMessage = new Emitter();
        this.onMessage = this._onMessage.event;
        this._onDidDispose = new Emitter();
        this.onDidDispose = this._onDidDispose.event;
        this._socket = socket;
        this._socketWriter = this._register(new ProtocolWriter(this._socket));
        this._socketReader = this._register(new ProtocolReader(this._socket));
        this._register(this._socketReader.onMessage((msg) => {
            if (msg.type === 1 /* ProtocolMessageType.Regular */) {
                this._onMessage.fire(msg.data);
            }
        }));
        this._register(this._socket.onClose(() => this._onDidDispose.fire()));
    }
    drain() {
        return this._socketWriter.drain();
    }
    getSocket() {
        return this._socket;
    }
    sendDisconnect() {
        // Nothing to do...
    }
    send(buffer) {
        this._socketWriter.write(new ProtocolMessage(1 /* ProtocolMessageType.Regular */, 0, 0, buffer));
    }
}
export class Client extends IPCClient {
    static fromSocket(socket, id) {
        return new Client(new Protocol(socket), id);
    }
    get onDidDispose() { return this.protocol.onDidDispose; }
    constructor(protocol, id, ipcLogger = null) {
        super(protocol, id, ipcLogger);
        this.protocol = protocol;
    }
    dispose() {
        super.dispose();
        const socket = this.protocol.getSocket();
        // should be sent gracefully with a .flush(), but try to send it out as a
        // last resort here if nothing else:
        this.protocol.sendDisconnect();
        this.protocol.dispose();
        socket.end();
    }
}
/**
 * Will ensure no messages are lost if there are no event listeners.
 */
export class BufferedEmitter {
    constructor() {
        this._hasListeners = false;
        this._isDeliveringMessages = false;
        this._bufferedMessages = [];
        this._emitter = new Emitter({
            onWillAddFirstListener: () => {
                this._hasListeners = true;
                // it is important to deliver these messages after this call, but before
                // other messages have a chance to be received (to guarantee in order delivery)
                // that's why we're using here queueMicrotask and not other types of timeouts
                queueMicrotask(() => this._deliverMessages());
            },
            onDidRemoveLastListener: () => {
                this._hasListeners = false;
            }
        });
        this.event = this._emitter.event;
    }
    _deliverMessages() {
        if (this._isDeliveringMessages) {
            return;
        }
        this._isDeliveringMessages = true;
        while (this._hasListeners && this._bufferedMessages.length > 0) {
            this._emitter.fire(this._bufferedMessages.shift());
        }
        this._isDeliveringMessages = false;
    }
    fire(event) {
        if (this._hasListeners) {
            if (this._bufferedMessages.length > 0) {
                this._bufferedMessages.push(event);
            }
            else {
                this._emitter.fire(event);
            }
        }
        else {
            this._bufferedMessages.push(event);
        }
    }
    flushBuffer() {
        this._bufferedMessages = [];
    }
}
class QueueElement {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}
class Queue {
    constructor() {
        this._first = null;
        this._last = null;
    }
    length() {
        let result = 0;
        let current = this._first;
        while (current) {
            current = current.next;
            result++;
        }
        return result;
    }
    peek() {
        if (!this._first) {
            return null;
        }
        return this._first.data;
    }
    toArray() {
        const result = [];
        let resultLen = 0;
        let it = this._first;
        while (it) {
            result[resultLen++] = it.data;
            it = it.next;
        }
        return result;
    }
    pop() {
        if (!this._first) {
            return;
        }
        if (this._first === this._last) {
            this._first = null;
            this._last = null;
            return;
        }
        this._first = this._first.next;
    }
    push(item) {
        const element = new QueueElement(item);
        if (!this._first) {
            this._first = element;
            this._last = element;
            return;
        }
        this._last.next = element;
        this._last = element;
    }
}
class LoadEstimator {
    static { this._HISTORY_LENGTH = 10; }
    static { this._INSTANCE = null; }
    static getInstance() {
        if (!LoadEstimator._INSTANCE) {
            LoadEstimator._INSTANCE = new LoadEstimator();
        }
        return LoadEstimator._INSTANCE;
    }
    constructor() {
        this.lastRuns = [];
        const now = Date.now();
        for (let i = 0; i < LoadEstimator._HISTORY_LENGTH; i++) {
            this.lastRuns[i] = now - 1000 * i;
        }
        setInterval(() => {
            for (let i = LoadEstimator._HISTORY_LENGTH; i >= 1; i--) {
                this.lastRuns[i] = this.lastRuns[i - 1];
            }
            this.lastRuns[0] = Date.now();
        }, 1000);
    }
    /**
     * returns an estimative number, from 0 (low load) to 1 (high load)
     */
    load() {
        const now = Date.now();
        const historyLimit = (1 + LoadEstimator._HISTORY_LENGTH) * 1000;
        let score = 0;
        for (let i = 0; i < LoadEstimator._HISTORY_LENGTH; i++) {
            if (now - this.lastRuns[i] <= historyLimit) {
                score++;
            }
        }
        return 1 - score / LoadEstimator._HISTORY_LENGTH;
    }
    hasHighLoad() {
        return this.load() >= 0.5;
    }
}
/**
 * Same as Protocol, but will actually track messages and acks.
 * Moreover, it will ensure no messages are lost if there are no event listeners.
 */
export class PersistentProtocol {
    get unacknowledgedCount() {
        return this._outgoingMsgId - this._outgoingAckId;
    }
    constructor(opts) {
        this._onControlMessage = new BufferedEmitter();
        this.onControlMessage = this._onControlMessage.event;
        this._onMessage = new BufferedEmitter();
        this.onMessage = this._onMessage.event;
        this._onDidDispose = new BufferedEmitter();
        this.onDidDispose = this._onDidDispose.event;
        this._onSocketClose = new BufferedEmitter();
        this.onSocketClose = this._onSocketClose.event;
        this._onSocketTimeout = new BufferedEmitter();
        this.onSocketTimeout = this._onSocketTimeout.event;
        this._loadEstimator = opts.loadEstimator ?? LoadEstimator.getInstance();
        this._shouldSendKeepAlive = opts.sendKeepAlive ?? true;
        this._isReconnecting = false;
        this._outgoingUnackMsg = new Queue();
        this._outgoingMsgId = 0;
        this._outgoingAckId = 0;
        this._outgoingAckTimeout = null;
        this._incomingMsgId = 0;
        this._incomingAckId = 0;
        this._incomingMsgLastTime = 0;
        this._incomingAckTimeout = null;
        this._lastReplayRequestTime = 0;
        this._lastSocketTimeoutTime = Date.now();
        this._socketDisposables = new DisposableStore();
        this._socket = opts.socket;
        this._socketWriter = this._socketDisposables.add(new ProtocolWriter(this._socket));
        this._socketReader = this._socketDisposables.add(new ProtocolReader(this._socket));
        this._socketDisposables.add(this._socketReader.onMessage(msg => this._receiveMessage(msg)));
        this._socketDisposables.add(this._socket.onClose(e => this._onSocketClose.fire(e)));
        if (opts.initialChunk) {
            this._socketReader.acceptChunk(opts.initialChunk);
        }
        if (this._shouldSendKeepAlive) {
            this._keepAliveInterval = setInterval(() => {
                this._sendKeepAlive();
            }, 5000 /* ProtocolConstants.KeepAliveSendTime */);
        }
        else {
            this._keepAliveInterval = null;
        }
    }
    dispose() {
        if (this._outgoingAckTimeout) {
            clearTimeout(this._outgoingAckTimeout);
            this._outgoingAckTimeout = null;
        }
        if (this._incomingAckTimeout) {
            clearTimeout(this._incomingAckTimeout);
            this._incomingAckTimeout = null;
        }
        if (this._keepAliveInterval) {
            clearInterval(this._keepAliveInterval);
            this._keepAliveInterval = null;
        }
        this._socketDisposables.dispose();
    }
    drain() {
        return this._socketWriter.drain();
    }
    sendDisconnect() {
        if (!this._didSendDisconnect) {
            this._didSendDisconnect = true;
            const msg = new ProtocolMessage(5 /* ProtocolMessageType.Disconnect */, 0, 0, getEmptyBuffer());
            this._socketWriter.write(msg);
            this._socketWriter.flush();
        }
    }
    sendPause() {
        const msg = new ProtocolMessage(7 /* ProtocolMessageType.Pause */, 0, 0, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    sendResume() {
        const msg = new ProtocolMessage(8 /* ProtocolMessageType.Resume */, 0, 0, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    pauseSocketWriting() {
        this._socketWriter.pause();
    }
    getSocket() {
        return this._socket;
    }
    getMillisSinceLastIncomingData() {
        return Date.now() - this._socketReader.lastReadTime;
    }
    beginAcceptReconnection(socket, initialDataChunk) {
        this._isReconnecting = true;
        this._socketDisposables.dispose();
        this._socketDisposables = new DisposableStore();
        this._onControlMessage.flushBuffer();
        this._onSocketClose.flushBuffer();
        this._onSocketTimeout.flushBuffer();
        this._socket.dispose();
        this._lastReplayRequestTime = 0;
        this._lastSocketTimeoutTime = Date.now();
        this._socket = socket;
        this._socketWriter = this._socketDisposables.add(new ProtocolWriter(this._socket));
        this._socketReader = this._socketDisposables.add(new ProtocolReader(this._socket));
        this._socketDisposables.add(this._socketReader.onMessage(msg => this._receiveMessage(msg)));
        this._socketDisposables.add(this._socket.onClose(e => this._onSocketClose.fire(e)));
        this._socketReader.acceptChunk(initialDataChunk);
    }
    endAcceptReconnection() {
        this._isReconnecting = false;
        // After a reconnection, let the other party know (again) which messages have been received.
        // (perhaps the other party didn't receive a previous ACK)
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(3 /* ProtocolMessageType.Ack */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
        // Send again all unacknowledged messages
        const toSend = this._outgoingUnackMsg.toArray();
        for (let i = 0, len = toSend.length; i < len; i++) {
            this._socketWriter.write(toSend[i]);
        }
        this._recvAckCheck();
    }
    acceptDisconnect() {
        this._onDidDispose.fire();
    }
    _receiveMessage(msg) {
        if (msg.ack > this._outgoingAckId) {
            this._outgoingAckId = msg.ack;
            do {
                const first = this._outgoingUnackMsg.peek();
                if (first && first.id <= msg.ack) {
                    // this message has been confirmed, remove it
                    this._outgoingUnackMsg.pop();
                }
                else {
                    break;
                }
            } while (true);
        }
        switch (msg.type) {
            case 0 /* ProtocolMessageType.None */: {
                // N/A
                break;
            }
            case 1 /* ProtocolMessageType.Regular */: {
                if (msg.id > this._incomingMsgId) {
                    if (msg.id !== this._incomingMsgId + 1) {
                        // in case we missed some messages we ask the other party to resend them
                        const now = Date.now();
                        if (now - this._lastReplayRequestTime > 10000) {
                            // send a replay request at most once every 10s
                            this._lastReplayRequestTime = now;
                            this._socketWriter.write(new ProtocolMessage(6 /* ProtocolMessageType.ReplayRequest */, 0, 0, getEmptyBuffer()));
                        }
                    }
                    else {
                        this._incomingMsgId = msg.id;
                        this._incomingMsgLastTime = Date.now();
                        this._sendAckCheck();
                        this._onMessage.fire(msg.data);
                    }
                }
                break;
            }
            case 2 /* ProtocolMessageType.Control */: {
                this._onControlMessage.fire(msg.data);
                break;
            }
            case 3 /* ProtocolMessageType.Ack */: {
                // nothing to do, .ack is handled above already
                break;
            }
            case 5 /* ProtocolMessageType.Disconnect */: {
                this._onDidDispose.fire();
                break;
            }
            case 6 /* ProtocolMessageType.ReplayRequest */: {
                // Send again all unacknowledged messages
                const toSend = this._outgoingUnackMsg.toArray();
                for (let i = 0, len = toSend.length; i < len; i++) {
                    this._socketWriter.write(toSend[i]);
                }
                this._recvAckCheck();
                break;
            }
            case 7 /* ProtocolMessageType.Pause */: {
                this._socketWriter.pause();
                break;
            }
            case 8 /* ProtocolMessageType.Resume */: {
                this._socketWriter.resume();
                break;
            }
            case 9 /* ProtocolMessageType.KeepAlive */: {
                // nothing to do
                break;
            }
        }
    }
    readEntireBuffer() {
        return this._socketReader.readEntireBuffer();
    }
    flush() {
        this._socketWriter.flush();
    }
    send(buffer) {
        const myId = ++this._outgoingMsgId;
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(1 /* ProtocolMessageType.Regular */, myId, this._incomingAckId, buffer);
        this._outgoingUnackMsg.push(msg);
        if (!this._isReconnecting) {
            this._socketWriter.write(msg);
            this._recvAckCheck();
        }
    }
    /**
     * Send a message which will not be part of the regular acknowledge flow.
     * Use this for early control messages which are repeated in case of reconnection.
     */
    sendControl(buffer) {
        const msg = new ProtocolMessage(2 /* ProtocolMessageType.Control */, 0, 0, buffer);
        this._socketWriter.write(msg);
    }
    _sendAckCheck() {
        if (this._incomingMsgId <= this._incomingAckId) {
            // nothink to acknowledge
            return;
        }
        if (this._incomingAckTimeout) {
            // there will be a check in the near future
            return;
        }
        const timeSinceLastIncomingMsg = Date.now() - this._incomingMsgLastTime;
        if (timeSinceLastIncomingMsg >= 2000 /* ProtocolConstants.AcknowledgeTime */) {
            // sufficient time has passed since this message has been received,
            // and no message from our side needed to be sent in the meantime,
            // so we will send a message containing only an ack.
            this._sendAck();
            return;
        }
        this._incomingAckTimeout = setTimeout(() => {
            this._incomingAckTimeout = null;
            this._sendAckCheck();
        }, 2000 /* ProtocolConstants.AcknowledgeTime */ - timeSinceLastIncomingMsg + 5);
    }
    _recvAckCheck() {
        if (this._outgoingMsgId <= this._outgoingAckId) {
            // everything has been acknowledged
            return;
        }
        if (this._outgoingAckTimeout) {
            // there will be a check in the near future
            return;
        }
        if (this._isReconnecting) {
            // do not cause a timeout during reconnection,
            // because messages will not be actually written until `endAcceptReconnection`
            return;
        }
        const oldestUnacknowledgedMsg = this._outgoingUnackMsg.peek();
        const timeSinceOldestUnacknowledgedMsg = Date.now() - oldestUnacknowledgedMsg.writtenTime;
        const timeSinceLastReceivedSomeData = Date.now() - this._socketReader.lastReadTime;
        const timeSinceLastTimeout = Date.now() - this._lastSocketTimeoutTime;
        if (timeSinceOldestUnacknowledgedMsg >= 20000 /* ProtocolConstants.TimeoutTime */
            && timeSinceLastReceivedSomeData >= 20000 /* ProtocolConstants.TimeoutTime */
            && timeSinceLastTimeout >= 20000 /* ProtocolConstants.TimeoutTime */) {
            // It's been a long time since our sent message was acknowledged
            // and a long time since we received some data
            // But this might be caused by the event loop being busy and failing to read messages
            if (!this._loadEstimator.hasHighLoad()) {
                // Trash the socket
                this._lastSocketTimeoutTime = Date.now();
                this._onSocketTimeout.fire({
                    unacknowledgedMsgCount: this._outgoingUnackMsg.length(),
                    timeSinceOldestUnacknowledgedMsg,
                    timeSinceLastReceivedSomeData
                });
                return;
            }
        }
        const minimumTimeUntilTimeout = Math.max(20000 /* ProtocolConstants.TimeoutTime */ - timeSinceOldestUnacknowledgedMsg, 20000 /* ProtocolConstants.TimeoutTime */ - timeSinceLastReceivedSomeData, 20000 /* ProtocolConstants.TimeoutTime */ - timeSinceLastTimeout, 500);
        this._outgoingAckTimeout = setTimeout(() => {
            this._outgoingAckTimeout = null;
            this._recvAckCheck();
        }, minimumTimeUntilTimeout);
    }
    _sendAck() {
        if (this._incomingMsgId <= this._incomingAckId) {
            // nothink to acknowledge
            return;
        }
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(3 /* ProtocolMessageType.Ack */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    _sendKeepAlive() {
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(9 /* ProtocolMessageType.KeepAlive */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9jb21tb24vaXBjLm5ldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDBCQUEwQixDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUF1QyxTQUFTLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFMUUsTUFBTSxDQUFOLElBQWtCLDBCQXVDakI7QUF2Q0QsV0FBa0IsMEJBQTBCO0lBQzNDLGlEQUFtQixDQUFBO0lBQ25CLDJDQUFhLENBQUE7SUFDYiw2Q0FBZSxDQUFBO0lBQ2YsMkNBQWEsQ0FBQTtJQUNiLDZDQUFlLENBQUE7SUFDZiw2Q0FBZSxDQUFBO0lBRWYsMkZBQTZELENBQUE7SUFFN0QsaUVBQW1DLENBQUE7SUFDbkMseURBQTJCLENBQUE7SUFDM0IsK0RBQWlDLENBQUE7SUFDakMsMkRBQTZCLENBQUE7SUFFN0IsbUVBQXFDLENBQUE7SUFDckMsaUVBQW1DLENBQUE7SUFDbkMsaUZBQW1ELENBQUE7SUFDbkQsMkZBQTZELENBQUE7SUFDN0QsbUVBQXFDLENBQUE7SUFDckMsNkVBQStDLENBQUE7SUFDL0MsbUVBQXFDLENBQUE7SUFDckMsaUVBQW1DLENBQUE7SUFDbkMsbUVBQXFDLENBQUE7SUFDckMsNkVBQStDLENBQUE7SUFFL0MsbUZBQXFELENBQUE7SUFDckQsaUdBQW1FLENBQUE7SUFDbkUsNkZBQStELENBQUE7SUFDL0QseUZBQTJELENBQUE7SUFDM0QsaUdBQW1FLENBQUE7SUFDbkUsNkZBQStE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