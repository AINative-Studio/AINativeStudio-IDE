/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createHash } from 'crypto';
import { createServer, createConnection } from 'net';
import { tmpdir } from 'os';
import { createDeflateRaw, createInflateRaw } from 'zlib';
import { VSBuffer } from '../../../common/buffer.js';
import { onUnexpectedError } from '../../../common/errors.js';
import { Emitter, Event } from '../../../common/event.js';
import { Disposable } from '../../../common/lifecycle.js';
import { join } from '../../../common/path.js';
import { platform } from '../../../common/platform.js';
import { generateUuid } from '../../../common/uuid.js';
import { IPCServer } from '../common/ipc.js';
import { ChunkStream, Client, Protocol, SocketDiagnostics } from '../common/ipc.net.js';
/**
 * Maximum time to wait for a 'close' event to fire after the socket stream
 * ends. For unix domain sockets, the close event may not fire consistently
 * due to what appears to be a Node.js bug.
 *
 * @see https://github.com/microsoft/vscode/issues/211462#issuecomment-2155471996
 */
const socketEndTimeoutMs = 30_000;
export class NodeSocket {
    traceSocketEvent(type, data) {
        SocketDiagnostics.traceSocketEvent(this.socket, this.debugLabel, type, data);
    }
    constructor(socket, debugLabel = '') {
        this._canWrite = true;
        this.debugLabel = debugLabel;
        this.socket = socket;
        this.traceSocketEvent("created" /* SocketDiagnosticsEventType.Created */, { type: 'NodeSocket' });
        this._errorListener = (err) => {
            this.traceSocketEvent("error" /* SocketDiagnosticsEventType.Error */, { code: err?.code, message: err?.message });
            if (err) {
                if (err.code === 'EPIPE') {
                    // An EPIPE exception at the wrong time can lead to a renderer process crash
                    // so ignore the error since the socket will fire the close event soon anyways:
                    // > https://nodejs.org/api/errors.html#errors_common_system_errors
                    // > EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no
                    // > process to read the data. Commonly encountered at the net and http layers,
                    // > indicative that the remote side of the stream being written to has been closed.
                    return;
                }
                onUnexpectedError(err);
            }
        };
        this.socket.on('error', this._errorListener);
        let endTimeoutHandle;
        this._closeListener = (hadError) => {
            this.traceSocketEvent("close" /* SocketDiagnosticsEventType.Close */, { hadError });
            this._canWrite = false;
            if (endTimeoutHandle) {
                clearTimeout(endTimeoutHandle);
            }
        };
        this.socket.on('close', this._closeListener);
        this._endListener = () => {
            this.traceSocketEvent("nodeEndReceived" /* SocketDiagnosticsEventType.NodeEndReceived */);
            this._canWrite = false;
            endTimeoutHandle = setTimeout(() => socket.destroy(), socketEndTimeoutMs);
        };
        this.socket.on('end', this._endListener);
    }
    dispose() {
        this.socket.off('error', this._errorListener);
        this.socket.off('close', this._closeListener);
        this.socket.off('end', this._endListener);
        this.socket.destroy();
    }
    onData(_listener) {
        const listener = (buff) => {
            this.traceSocketEvent("read" /* SocketDiagnosticsEventType.Read */, buff);
            _listener(VSBuffer.wrap(buff));
        };
        this.socket.on('data', listener);
        return {
            dispose: () => this.socket.off('data', listener)
        };
    }
    onClose(listener) {
        const adapter = (hadError) => {
            listener({
                type: 0 /* SocketCloseEventType.NodeSocketCloseEvent */,
                hadError: hadError,
                error: undefined
            });
        };
        this.socket.on('close', adapter);
        return {
            dispose: () => this.socket.off('close', adapter)
        };
    }
    onEnd(listener) {
        const adapter = () => {
            listener();
        };
        this.socket.on('end', adapter);
        return {
            dispose: () => this.socket.off('end', adapter)
        };
    }
    write(buffer) {
        // return early if socket has been destroyed in the meantime
        if (this.socket.destroyed || !this._canWrite) {
            return;
        }
        // we ignore the returned value from `write` because we would have to cached the data
        // anyways and nodejs is already doing that for us:
        // > https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback
        // > However, the false return value is only advisory and the writable stream will unconditionally
        // > accept and buffer chunk even if it has not been allowed to drain.
        try {
            this.traceSocketEvent("write" /* SocketDiagnosticsEventType.Write */, buffer);
            this.socket.write(buffer.buffer, (err) => {
                if (err) {
                    if (err.code === 'EPIPE') {
                        // An EPIPE exception at the wrong time can lead to a renderer process crash
                        // so ignore the error since the socket will fire the close event soon anyways:
                        // > https://nodejs.org/api/errors.html#errors_common_system_errors
                        // > EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no
                        // > process to read the data. Commonly encountered at the net and http layers,
                        // > indicative that the remote side of the stream being written to has been closed.
                        return;
                    }
                    onUnexpectedError(err);
                }
            });
        }
        catch (err) {
            if (err.code === 'EPIPE') {
                // An EPIPE exception at the wrong time can lead to a renderer process crash
                // so ignore the error since the socket will fire the close event soon anyways:
                // > https://nodejs.org/api/errors.html#errors_common_system_errors
                // > EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no
                // > process to read the data. Commonly encountered at the net and http layers,
                // > indicative that the remote side of the stream being written to has been closed.
                return;
            }
            onUnexpectedError(err);
        }
    }
    end() {
        this.traceSocketEvent("nodeEndSent" /* SocketDiagnosticsEventType.NodeEndSent */);
        this.socket.end();
    }
    drain() {
        this.traceSocketEvent("nodeDrainBegin" /* SocketDiagnosticsEventType.NodeDrainBegin */);
        return new Promise((resolve, reject) => {
            if (this.socket.bufferSize === 0) {
                this.traceSocketEvent("nodeDrainEnd" /* SocketDiagnosticsEventType.NodeDrainEnd */);
                resolve();
                return;
            }
            const finished = () => {
                this.socket.off('close', finished);
                this.socket.off('end', finished);
                this.socket.off('error', finished);
                this.socket.off('timeout', finished);
                this.socket.off('drain', finished);
                this.traceSocketEvent("nodeDrainEnd" /* SocketDiagnosticsEventType.NodeDrainEnd */);
                resolve();
            };
            this.socket.on('close', finished);
            this.socket.on('end', finished);
            this.socket.on('error', finished);
            this.socket.on('timeout', finished);
            this.socket.on('drain', finished);
        });
    }
}
var Constants;
(function (Constants) {
    Constants[Constants["MinHeaderByteSize"] = 2] = "MinHeaderByteSize";
    /**
     * If we need to write a large buffer, we will split it into 256KB chunks and
     * send each chunk as a websocket message. This is to prevent that the sending
     * side is stuck waiting for the entire buffer to be compressed before writing
     * to the underlying socket or that the receiving side is stuck waiting for the
     * entire message to be received before processing the bytes.
     */
    Constants[Constants["MaxWebSocketMessageLength"] = 262144] = "MaxWebSocketMessageLength"; // 256 KB
})(Constants || (Constants = {}));
var ReadState;
(function (ReadState) {
    ReadState[ReadState["PeekHeader"] = 1] = "PeekHeader";
    ReadState[ReadState["ReadHeader"] = 2] = "ReadHeader";
    ReadState[ReadState["ReadBody"] = 3] = "ReadBody";
    ReadState[ReadState["Fin"] = 4] = "Fin";
})(ReadState || (ReadState = {}));
/**
 * See https://tools.ietf.org/html/rfc6455#section-5.2
 */
export class WebSocketNodeSocket extends Disposable {
    get permessageDeflate() {
        return this._flowManager.permessageDeflate;
    }
    get recordedInflateBytes() {
        return this._flowManager.recordedInflateBytes;
    }
    traceSocketEvent(type, data) {
        this.socket.traceSocketEvent(type, data);
    }
    /**
     * Create a socket which can communicate using WebSocket frames.
     *
     * **NOTE**: When using the permessage-deflate WebSocket extension, if parts of inflating was done
     *  in a different zlib instance, we need to pass all those bytes into zlib, otherwise the inflate
     *  might hit an inflated portion referencing a distance too far back.
     *
     * @param socket The underlying socket
     * @param permessageDeflate Use the permessage-deflate WebSocket extension
     * @param inflateBytes "Seed" zlib inflate with these bytes.
     * @param recordInflateBytes Record all bytes sent to inflate
     */
    constructor(socket, permessageDeflate, inflateBytes, recordInflateBytes) {
        super();
        this._onData = this._register(new Emitter());
        this._onClose = this._register(new Emitter());
        this._isEnded = false;
        this._state = {
            state: 1 /* ReadState.PeekHeader */,
            readLen: 2 /* Constants.MinHeaderByteSize */,
            fin: 0,
            compressed: false,
            firstFrameOfMessage: true,
            mask: 0,
            opcode: 0
        };
        this.socket = socket;
        this.traceSocketEvent("created" /* SocketDiagnosticsEventType.Created */, { type: 'WebSocketNodeSocket', permessageDeflate, inflateBytesLength: inflateBytes?.byteLength || 0, recordInflateBytes });
        this._flowManager = this._register(new WebSocketFlowManager(this, permessageDeflate, inflateBytes, recordInflateBytes, this._onData, (data, options) => this._write(data, options)));
        this._register(this._flowManager.onError((err) => {
            // zlib errors are fatal, since we have no idea how to recover
            console.error(err);
            onUnexpectedError(err);
            this._onClose.fire({
                type: 0 /* SocketCloseEventType.NodeSocketCloseEvent */,
                hadError: true,
                error: err
            });
        }));
        this._incomingData = new ChunkStream();
        this._register(this.socket.onData(data => this._acceptChunk(data)));
        this._register(this.socket.onClose(async (e) => {
            // Delay surfacing the close event until the async inflating is done
            // and all data has been emitted
            if (this._flowManager.isProcessingReadQueue()) {
                await Event.toPromise(this._flowManager.onDidFinishProcessingReadQueue);
            }
            this._onClose.fire(e);
        }));
    }
    dispose() {
        if (this._flowManager.isProcessingWriteQueue()) {
            // Wait for any outstanding writes to finish before disposing
            this._register(this._flowManager.onDidFinishProcessingWriteQueue(() => {
                this.dispose();
            }));
        }
        else {
            this.socket.dispose();
            super.dispose();
        }
    }
    onData(listener) {
        return this._onData.event(listener);
    }
    onClose(listener) {
        return this._onClose.event(listener);
    }
    onEnd(listener) {
        return this.socket.onEnd(listener);
    }
    write(buffer) {
        // If we write many logical messages (let's say 1000 messages of 100KB) during a single process tick, we do
        // this thing where we install a process.nextTick timer and group all of them together and we then issue a
        // single WebSocketNodeSocket.write with a 100MB buffer.
        //
        // The first problem is that the actual writing to the underlying node socket will only happen after all of
        // the 100MB have been deflated (due to waiting on zlib flush). The second problem is on the reading side,
        // where we will get a single WebSocketNodeSocket.onData event fired when all the 100MB have arrived,
        // delaying processing the 1000 received messages until all have arrived, instead of processing them as each
        // one arrives.
        //
        // We therefore split the buffer into chunks, and issue a write for each chunk.
        let start = 0;
        while (start < buffer.byteLength) {
            this._flowManager.writeMessage(buffer.slice(start, Math.min(start + 262144 /* Constants.MaxWebSocketMessageLength */, buffer.byteLength)), { compressed: true, opcode: 0x02 /* Binary frame */ });
            start += 262144 /* Constants.MaxWebSocketMessageLength */;
        }
    }
    _write(buffer, { compressed, opcode }) {
        if (this._isEnded) {
            // Avoid ERR_STREAM_WRITE_AFTER_END
            return;
        }
        this.traceSocketEvent("webSocketNodeSocketWrite" /* SocketDiagnosticsEventType.WebSocketNodeSocketWrite */, buffer);
        let headerLen = 2 /* Constants.MinHeaderByteSize */;
        if (buffer.byteLength < 126) {
            headerLen += 0;
        }
        else if (buffer.byteLength < 2 ** 16) {
            headerLen += 2;
        }
        else {
            headerLen += 8;
        }
        const header = VSBuffer.alloc(headerLen);
        // The RSV1 bit indicates a compressed frame
        const compressedFlag = compressed ? 0b01000000 : 0;
        const opcodeFlag = opcode & 0b00001111;
        header.writeUInt8(0b10000000 | compressedFlag | opcodeFlag, 0);
        if (buffer.byteLength < 126) {
            header.writeUInt8(buffer.byteLength, 1);
        }
        else if (buffer.byteLength < 2 ** 16) {
            header.writeUInt8(126, 1);
            let offset = 1;
            header.writeUInt8((buffer.byteLength >>> 8) & 0b11111111, ++offset);
            header.writeUInt8((buffer.byteLength >>> 0) & 0b11111111, ++offset);
        }
        else {
            header.writeUInt8(127, 1);
            let offset = 1;
            header.writeUInt8(0, ++offset);
            header.writeUInt8(0, ++offset);
            header.writeUInt8(0, ++offset);
            header.writeUInt8(0, ++offset);
            header.writeUInt8((buffer.byteLength >>> 24) & 0b11111111, ++offset);
            header.writeUInt8((buffer.byteLength >>> 16) & 0b11111111, ++offset);
            header.writeUInt8((buffer.byteLength >>> 8) & 0b11111111, ++offset);
            header.writeUInt8((buffer.byteLength >>> 0) & 0b11111111, ++offset);
        }
        this.socket.write(VSBuffer.concat([header, buffer]));
    }
    end() {
        this._isEnded = true;
        this.socket.end();
    }
    _acceptChunk(data) {
        if (data.byteLength === 0) {
            return;
        }
        this._incomingData.acceptChunk(data);
        while (this._incomingData.byteLength >= this._state.readLen) {
            if (this._state.state === 1 /* ReadState.PeekHeader */) {
                // peek to see if we can read the entire header
                const peekHeader = this._incomingData.peek(this._state.readLen);
                const firstByte = peekHeader.readUInt8(0);
                const finBit = (firstByte & 0b10000000) >>> 7;
                const rsv1Bit = (firstByte & 0b01000000) >>> 6;
                const opcode = (firstByte & 0b00001111);
                const secondByte = peekHeader.readUInt8(1);
                const hasMask = (secondByte & 0b10000000) >>> 7;
                const len = (secondByte & 0b01111111);
                this._state.state = 2 /* ReadState.ReadHeader */;
                this._state.readLen = 2 /* Constants.MinHeaderByteSize */ + (hasMask ? 4 : 0) + (len === 126 ? 2 : 0) + (len === 127 ? 8 : 0);
                this._state.fin = finBit;
                if (this._state.firstFrameOfMessage) {
                    // if the frame is compressed, the RSV1 bit is set only for the first frame of the message
                    this._state.compressed = Boolean(rsv1Bit);
                }
                this._state.firstFrameOfMessage = Boolean(finBit);
                this._state.mask = 0;
                this._state.opcode = opcode;
                this.traceSocketEvent("webSocketNodeSocketPeekedHeader" /* SocketDiagnosticsEventType.WebSocketNodeSocketPeekedHeader */, { headerSize: this._state.readLen, compressed: this._state.compressed, fin: this._state.fin, opcode: this._state.opcode });
            }
            else if (this._state.state === 2 /* ReadState.ReadHeader */) {
                // read entire header
                const header = this._incomingData.read(this._state.readLen);
                const secondByte = header.readUInt8(1);
                const hasMask = (secondByte & 0b10000000) >>> 7;
                let len = (secondByte & 0b01111111);
                let offset = 1;
                if (len === 126) {
                    len = (header.readUInt8(++offset) * 2 ** 8
                        + header.readUInt8(++offset));
                }
                else if (len === 127) {
                    len = (header.readUInt8(++offset) * 0
                        + header.readUInt8(++offset) * 0
                        + header.readUInt8(++offset) * 0
                        + header.readUInt8(++offset) * 0
                        + header.readUInt8(++offset) * 2 ** 24
                        + header.readUInt8(++offset) * 2 ** 16
                        + header.readUInt8(++offset) * 2 ** 8
                        + header.readUInt8(++offset));
                }
                let mask = 0;
                if (hasMask) {
                    mask = (header.readUInt8(++offset) * 2 ** 24
                        + header.readUInt8(++offset) * 2 ** 16
                        + header.readUInt8(++offset) * 2 ** 8
                        + header.readUInt8(++offset));
                }
                this._state.state = 3 /* ReadState.ReadBody */;
                this._state.readLen = len;
                this._state.mask = mask;
                this.traceSocketEvent("webSocketNodeSocketPeekedHeader" /* SocketDiagnosticsEventType.WebSocketNodeSocketPeekedHeader */, { bodySize: this._state.readLen, compressed: this._state.compressed, fin: this._state.fin, mask: this._state.mask, opcode: this._state.opcode });
            }
            else if (this._state.state === 3 /* ReadState.ReadBody */) {
                // read body
                const body = this._incomingData.read(this._state.readLen);
                this.traceSocketEvent("webSocketNodeSocketReadData" /* SocketDiagnosticsEventType.WebSocketNodeSocketReadData */, body);
                unmask(body, this._state.mask);
                this.traceSocketEvent("webSocketNodeSocketUnmaskedData" /* SocketDiagnosticsEventType.WebSocketNodeSocketUnmaskedData */, body);
                this._state.state = 1 /* ReadState.PeekHeader */;
                this._state.readLen = 2 /* Constants.MinHeaderByteSize */;
                this._state.mask = 0;
                if (this._state.opcode <= 0x02 /* Continuation frame or Text frame or binary frame */) {
                    this._flowManager.acceptFrame(body, this._state.compressed, !!this._state.fin);
                }
                else if (this._state.opcode === 0x09 /* Ping frame */) {
                    // Ping frames could be send by some browsers e.g. Firefox
                    this._flowManager.writeMessage(body, { compressed: false, opcode: 0x0A /* Pong frame */ });
                }
            }
        }
    }
    async drain() {
        this.traceSocketEvent("webSocketNodeSocketDrainBegin" /* SocketDiagnosticsEventType.WebSocketNodeSocketDrainBegin */);
        if (this._flowManager.isProcessingWriteQueue()) {
            await Event.toPromise(this._flowManager.onDidFinishProcessingWriteQueue);
        }
        await this.socket.drain();
        this.traceSocketEvent("webSocketNodeSocketDrainEnd" /* SocketDiagnosticsEventType.WebSocketNodeSocketDrainEnd */);
    }
}
class WebSocketFlowManager extends Disposable {
    get permessageDeflate() {
        return Boolean(this._zlibInflateStream && this._zlibDeflateStream);
    }
    get recordedInflateBytes() {
        if (this._zlibInflateStream) {
            return this._zlibInflateStream.recordedInflateBytes;
        }
        return VSBuffer.alloc(0);
    }
    constructor(_tracer, permessageDeflate, inflateBytes, recordInflateBytes, _onData, _writeFn) {
        super();
        this._tracer = _tracer;
        this._onData = _onData;
        this._writeFn = _writeFn;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this._writeQueue = [];
        this._readQueue = [];
        this._onDidFinishProcessingReadQueue = this._register(new Emitter());
        this.onDidFinishProcessingReadQueue = this._onDidFinishProcessingReadQueue.event;
        this._onDidFinishProcessingWriteQueue = this._register(new Emitter());
        this.onDidFinishProcessingWriteQueue = this._onDidFinishProcessingWriteQueue.event;
        this._isProcessingWriteQueue = false;
        this._isProcessingReadQueue = false;
        if (permessageDeflate) {
            // See https://tools.ietf.org/html/rfc7692#page-16
            // To simplify our logic, we don't negotiate the window size
            // and simply dedicate (2^15) / 32kb per web socket
            this._zlibInflateStream = this._register(new ZlibInflateStream(this._tracer, recordInflateBytes, inflateBytes, { windowBits: 15 }));
            this._zlibDeflateStream = this._register(new ZlibDeflateStream(this._tracer, { windowBits: 15 }));
            this._register(this._zlibInflateStream.onError((err) => this._onError.fire(err)));
            this._register(this._zlibDeflateStream.onError((err) => this._onError.fire(err)));
        }
        else {
            this._zlibInflateStream = null;
            this._zlibDeflateStream = null;
        }
    }
    writeMessage(data, options) {
        this._writeQueue.push({ data, options });
        this._processWriteQueue();
    }
    async _processWriteQueue() {
        if (this._isProcessingWriteQueue) {
            return;
        }
        this._isProcessingWriteQueue = true;
        while (this._writeQueue.length > 0) {
            const { data, options } = this._writeQueue.shift();
            if (this._zlibDeflateStream && options.compressed) {
                const compressedData = await this._deflateMessage(this._zlibDeflateStream, data);
                this._writeFn(compressedData, options);
            }
            else {
                this._writeFn(data, { ...options, compressed: false });
            }
        }
        this._isProcessingWriteQueue = false;
        this._onDidFinishProcessingWriteQueue.fire();
    }
    isProcessingWriteQueue() {
        return (this._isProcessingWriteQueue);
    }
    /**
     * Subsequent calls should wait for the previous `_deflateBuffer` call to complete.
     */
    _deflateMessage(zlibDeflateStream, buffer) {
        return new Promise((resolve, reject) => {
            zlibDeflateStream.write(buffer);
            zlibDeflateStream.flush(data => resolve(data));
        });
    }
    acceptFrame(data, isCompressed, isLastFrameOfMessage) {
        this._readQueue.push({ data, isCompressed, isLastFrameOfMessage });
        this._processReadQueue();
    }
    async _processReadQueue() {
        if (this._isProcessingReadQueue) {
            return;
        }
        this._isProcessingReadQueue = true;
        while (this._readQueue.length > 0) {
            const frameInfo = this._readQueue.shift();
            if (this._zlibInflateStream && frameInfo.isCompressed) {
                // See https://datatracker.ietf.org/doc/html/rfc7692#section-9.2
                // Even if permessageDeflate is negotiated, it is possible
                // that the other side might decide to send uncompressed messages
                // So only decompress messages that have the RSV 1 bit set
                const data = await this._inflateFrame(this._zlibInflateStream, frameInfo.data, frameInfo.isLastFrameOfMessage);
                this._onData.fire(data);
            }
            else {
                this._onData.fire(frameInfo.data);
            }
        }
        this._isProcessingReadQueue = false;
        this._onDidFinishProcessingReadQueue.fire();
    }
    isProcessingReadQueue() {
        return (this._isProcessingReadQueue);
    }
    /**
     * Subsequent calls should wait for the previous `transformRead` call to complete.
     */
    _inflateFrame(zlibInflateStream, buffer, isLastFrameOfMessage) {
        return new Promise((resolve, reject) => {
            // See https://tools.ietf.org/html/rfc7692#section-7.2.2
            zlibInflateStream.write(buffer);
            if (isLastFrameOfMessage) {
                zlibInflateStream.write(VSBuffer.fromByteArray([0x00, 0x00, 0xff, 0xff]));
            }
            zlibInflateStream.flush(data => resolve(data));
        });
    }
}
class ZlibInflateStream extends Disposable {
    get recordedInflateBytes() {
        if (this._recordInflateBytes) {
            return VSBuffer.concat(this._recordedInflateBytes);
        }
        return VSBuffer.alloc(0);
    }
    constructor(_tracer, _recordInflateBytes, inflateBytes, options) {
        super();
        this._tracer = _tracer;
        this._recordInflateBytes = _recordInflateBytes;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this._recordedInflateBytes = [];
        this._pendingInflateData = [];
        this._zlibInflate = createInflateRaw(options);
        this._zlibInflate.on('error', (err) => {
            this._tracer.traceSocketEvent("zlibInflateError" /* SocketDiagnosticsEventType.zlibInflateError */, { message: err?.message, code: err?.code });
            this._onError.fire(err);
        });
        this._zlibInflate.on('data', (data) => {
            this._tracer.traceSocketEvent("zlibInflateData" /* SocketDiagnosticsEventType.zlibInflateData */, data);
            this._pendingInflateData.push(VSBuffer.wrap(data));
        });
        if (inflateBytes) {
            this._tracer.traceSocketEvent("zlibInflateInitialWrite" /* SocketDiagnosticsEventType.zlibInflateInitialWrite */, inflateBytes.buffer);
            this._zlibInflate.write(inflateBytes.buffer);
            this._zlibInflate.flush(() => {
                this._tracer.traceSocketEvent("zlibInflateInitialFlushFired" /* SocketDiagnosticsEventType.zlibInflateInitialFlushFired */);
                this._pendingInflateData.length = 0;
            });
        }
    }
    write(buffer) {
        if (this._recordInflateBytes) {
            this._recordedInflateBytes.push(buffer.clone());
        }
        this._tracer.traceSocketEvent("zlibInflateWrite" /* SocketDiagnosticsEventType.zlibInflateWrite */, buffer);
        this._zlibInflate.write(buffer.buffer);
    }
    flush(callback) {
        this._zlibInflate.flush(() => {
            this._tracer.traceSocketEvent("zlibInflateFlushFired" /* SocketDiagnosticsEventType.zlibInflateFlushFired */);
            const data = VSBuffer.concat(this._pendingInflateData);
            this._pendingInflateData.length = 0;
            callback(data);
        });
    }
}
class ZlibDeflateStream extends Disposable {
    constructor(_tracer, options) {
        super();
        this._tracer = _tracer;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this._pendingDeflateData = [];
        this._zlibDeflate = createDeflateRaw({
            windowBits: 15
        });
        this._zlibDeflate.on('error', (err) => {
            this._tracer.traceSocketEvent("zlibDeflateError" /* SocketDiagnosticsEventType.zlibDeflateError */, { message: err?.message, code: err?.code });
            this._onError.fire(err);
        });
        this._zlibDeflate.on('data', (data) => {
            this._tracer.traceSocketEvent("zlibDeflateData" /* SocketDiagnosticsEventType.zlibDeflateData */, data);
            this._pendingDeflateData.push(VSBuffer.wrap(data));
        });
    }
    write(buffer) {
        this._tracer.traceSocketEvent("zlibDeflateWrite" /* SocketDiagnosticsEventType.zlibDeflateWrite */, buffer.buffer);
        this._zlibDeflate.write(buffer.buffer);
    }
    flush(callback) {
        // See https://zlib.net/manual.html#Constants
        this._zlibDeflate.flush(/*Z_SYNC_FLUSH*/ 2, () => {
            this._tracer.traceSocketEvent("zlibDeflateFlushFired" /* SocketDiagnosticsEventType.zlibDeflateFlushFired */);
            let data = VSBuffer.concat(this._pendingDeflateData);
            this._pendingDeflateData.length = 0;
            // See https://tools.ietf.org/html/rfc7692#section-7.2.1
            data = data.slice(0, data.byteLength - 4);
            callback(data);
        });
    }
}
function unmask(buffer, mask) {
    if (mask === 0) {
        return;
    }
    const cnt = buffer.byteLength >>> 2;
    for (let i = 0; i < cnt; i++) {
        const v = buffer.readUInt32BE(i * 4);
        buffer.writeUInt32BE(v ^ mask, i * 4);
    }
    const offset = cnt * 4;
    const bytesLeft = buffer.byteLength - offset;
    const m3 = (mask >>> 24) & 0b11111111;
    const m2 = (mask >>> 16) & 0b11111111;
    const m1 = (mask >>> 8) & 0b11111111;
    if (bytesLeft >= 1) {
        buffer.writeUInt8(buffer.readUInt8(offset) ^ m3, offset);
    }
    if (bytesLeft >= 2) {
        buffer.writeUInt8(buffer.readUInt8(offset + 1) ^ m2, offset + 1);
    }
    if (bytesLeft >= 3) {
        buffer.writeUInt8(buffer.readUInt8(offset + 2) ^ m1, offset + 2);
    }
}
// Read this before there's any chance it is overwritten
// Related to https://github.com/microsoft/vscode/issues/30624
export const XDG_RUNTIME_DIR = process.env['XDG_RUNTIME_DIR'];
const safeIpcPathLengths = {
    [2 /* Platform.Linux */]: 107,
    [1 /* Platform.Mac */]: 103
};
export function createRandomIPCHandle() {
    const randomSuffix = generateUuid();
    // Windows: use named pipe
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\vscode-ipc-${randomSuffix}-sock`;
    }
    // Mac & Unix: Use socket file
    // Unix: Prefer XDG_RUNTIME_DIR over user data path
    const basePath = process.platform !== 'darwin' && XDG_RUNTIME_DIR ? XDG_RUNTIME_DIR : tmpdir();
    const result = join(basePath, `vscode-ipc-${randomSuffix}.sock`);
    // Validate length
    validateIPCHandleLength(result);
    return result;
}
export function createStaticIPCHandle(directoryPath, type, version) {
    const scope = createHash('sha256').update(directoryPath).digest('hex');
    const scopeForSocket = scope.substr(0, 8);
    // Windows: use named pipe
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\${scopeForSocket}-${version}-${type}-sock`;
    }
    // Mac & Unix: Use socket file
    // Unix: Prefer XDG_RUNTIME_DIR over user data path, unless portable
    // Trim the version and type values for the socket to prevent too large
    // file names causing issues: https://unix.stackexchange.com/q/367008
    const versionForSocket = version.substr(0, 4);
    const typeForSocket = type.substr(0, 6);
    let result;
    if (process.platform !== 'darwin' && XDG_RUNTIME_DIR && !process.env['VSCODE_PORTABLE']) {
        result = join(XDG_RUNTIME_DIR, `vscode-${scopeForSocket}-${versionForSocket}-${typeForSocket}.sock`);
    }
    else {
        result = join(directoryPath, `${versionForSocket}-${typeForSocket}.sock`);
    }
    // Validate length
    validateIPCHandleLength(result);
    return result;
}
function validateIPCHandleLength(handle) {
    const limit = safeIpcPathLengths[platform];
    if (typeof limit === 'number' && handle.length >= limit) {
        // https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
        console.warn(`WARNING: IPC handle "${handle}" is longer than ${limit} chars, try a shorter --user-data-dir`);
    }
}
export class Server extends IPCServer {
    static toClientConnectionEvent(server) {
        const onConnection = Event.fromNodeEventEmitter(server, 'connection');
        return Event.map(onConnection, socket => ({
            protocol: new Protocol(new NodeSocket(socket, 'ipc-server-connection')),
            onDidClientDisconnect: Event.once(Event.fromNodeEventEmitter(socket, 'close'))
        }));
    }
    constructor(server) {
        super(Server.toClientConnectionEvent(server));
        this.server = server;
    }
    dispose() {
        super.dispose();
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
export function serve(hook) {
    return new Promise((c, e) => {
        const server = createServer();
        server.on('error', e);
        server.listen(hook, () => {
            server.removeListener('error', e);
            c(new Server(server));
        });
    });
}
export function connect(hook, clientId) {
    return new Promise((c, e) => {
        const socket = createConnection(hook, () => {
            socket.removeListener('error', e);
            c(Client.fromSocket(new NodeSocket(socket, `ipc-client${clientId}`), clientId));
        });
        socket.once('error', e);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9ub2RlL2lwYy5uZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNwQyxPQUFPLEVBQStCLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBdUMsZ0JBQWdCLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMvQyxPQUFPLEVBQVksUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZELE9BQU8sRUFBeUIsU0FBUyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQVcsUUFBUSxFQUEwQyxpQkFBaUIsRUFBOEIsTUFBTSxzQkFBc0IsQ0FBQztBQUVySzs7Ozs7O0dBTUc7QUFDSCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQztBQUVsQyxNQUFNLE9BQU8sVUFBVTtJQVNmLGdC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QUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFMUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEO0FBRUQsU0FBUyxNQUFNLENBQUMsTUFBZ0IsRUFBRSxJQUFZO0lBQzdDLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2hCLE9BQU87SUFDUixDQUFDO0lBQ0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUM7SUFDcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDdkIsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUM7SUFDN0MsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQztJQUN0QyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUM7SUFDckMsSUFBSSxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDcEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztJ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