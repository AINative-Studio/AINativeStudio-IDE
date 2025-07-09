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
import { getRandomElement } from '../../../common/arrays.js';
import { createCancelablePromise, timeout } from '../../../common/async.js';
import { VSBuffer } from '../../../common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../common/cancellation.js';
import { memoize } from '../../../common/decorators.js';
import { CancellationError, ErrorNoTelemetry } from '../../../common/errors.js';
import { Emitter, Event, EventMultiplexer, Relay } from '../../../common/event.js';
import { createSingleCallFunction } from '../../../common/functional.js';
import { DisposableStore, dispose, toDisposable } from '../../../common/lifecycle.js';
import { revive } from '../../../common/marshalling.js';
import * as strings from '../../../common/strings.js';
import { isFunction, isUndefinedOrNull } from '../../../common/types.js';
var RequestType;
(function (RequestType) {
    RequestType[RequestType["Promise"] = 100] = "Promise";
    RequestType[RequestType["PromiseCancel"] = 101] = "PromiseCancel";
    RequestType[RequestType["EventListen"] = 102] = "EventListen";
    RequestType[RequestType["EventDispose"] = 103] = "EventDispose";
})(RequestType || (RequestType = {}));
function requestTypeToStr(type) {
    switch (type) {
        case 100 /* RequestType.Promise */:
            return 'req';
        case 101 /* RequestType.PromiseCancel */:
            return 'cancel';
        case 102 /* RequestType.EventListen */:
            return 'subscribe';
        case 103 /* RequestType.EventDispose */:
            return 'unsubscribe';
    }
}
var ResponseType;
(function (ResponseType) {
    ResponseType[ResponseType["Initialize"] = 200] = "Initialize";
    ResponseType[ResponseType["PromiseSuccess"] = 201] = "PromiseSuccess";
    ResponseType[ResponseType["PromiseError"] = 202] = "PromiseError";
    ResponseType[ResponseType["PromiseErrorObj"] = 203] = "PromiseErrorObj";
    ResponseType[ResponseType["EventFire"] = 204] = "EventFire";
})(ResponseType || (ResponseType = {}));
function responseTypeToStr(type) {
    switch (type) {
        case 200 /* ResponseType.Initialize */:
            return `init`;
        case 201 /* ResponseType.PromiseSuccess */:
            return `reply:`;
        case 202 /* ResponseType.PromiseError */:
        case 203 /* ResponseType.PromiseErrorObj */:
            return `replyErr:`;
        case 204 /* ResponseType.EventFire */:
            return `event:`;
    }
}
var State;
(function (State) {
    State[State["Uninitialized"] = 0] = "Uninitialized";
    State[State["Idle"] = 1] = "Idle";
})(State || (State = {}));
/**
 * @see https://en.wikipedia.org/wiki/Variable-length_quantity
 */
function readIntVQL(reader) {
    let value = 0;
    for (let n = 0;; n += 7) {
        const next = reader.read(1);
        value |= (next.buffer[0] & 0b01111111) << n;
        if (!(next.buffer[0] & 0b10000000)) {
            return value;
        }
    }
}
const vqlZero = createOneByteBuffer(0);
/**
 * @see https://en.wikipedia.org/wiki/Variable-length_quantity
 */
function writeInt32VQL(writer, value) {
    if (value === 0) {
        writer.write(vqlZero);
        return;
    }
    let len = 0;
    for (let v2 = value; v2 !== 0; v2 = v2 >>> 7) {
        len++;
    }
    const scratch = VSBuffer.alloc(len);
    for (let i = 0; value !== 0; i++) {
        scratch.buffer[i] = value & 0b01111111;
        value = value >>> 7;
        if (value > 0) {
            scratch.buffer[i] |= 0b10000000;
        }
    }
    writer.write(scratch);
}
export class BufferReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.pos = 0;
    }
    read(bytes) {
        const result = this.buffer.slice(this.pos, this.pos + bytes);
        this.pos += result.byteLength;
        return result;
    }
}
export class BufferWriter {
    constructor() {
        this.buffers = [];
    }
    get buffer() {
        return VSBuffer.concat(this.buffers);
    }
    write(buffer) {
        this.buffers.push(buffer);
    }
}
var DataType;
(function (DataType) {
    DataType[DataType["Undefined"] = 0] = "Undefined";
    DataType[DataType["String"] = 1] = "String";
    DataType[DataType["Buffer"] = 2] = "Buffer";
    DataType[DataType["VSBuffer"] = 3] = "VSBuffer";
    DataType[DataType["Array"] = 4] = "Array";
    DataType[DataType["Object"] = 5] = "Object";
    DataType[DataType["Int"] = 6] = "Int";
})(DataType || (DataType = {}));
function createOneByteBuffer(value) {
    const result = VSBuffer.alloc(1);
    result.writeUInt8(value, 0);
    return result;
}
const BufferPresets = {
    Undefined: createOneByteBuffer(DataType.Undefined),
    String: createOneByteBuffer(DataType.String),
    Buffer: createOneByteBuffer(DataType.Buffer),
    VSBuffer: createOneByteBuffer(DataType.VSBuffer),
    Array: createOneByteBuffer(DataType.Array),
    Object: createOneByteBuffer(DataType.Object),
    Uint: createOneByteBuffer(DataType.Int),
};
const hasBuffer = (typeof Buffer !== 'undefined');
export function serialize(writer, data) {
    if (typeof data === 'undefined') {
        writer.write(BufferPresets.Undefined);
    }
    else if (typeof data === 'string') {
        const buffer = VSBuffer.fromString(data);
        writer.write(BufferPresets.String);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
    else if (hasBuffer && Buffer.isBuffer(data)) {
        const buffer = VSBuffer.wrap(data);
        writer.write(BufferPresets.Buffer);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
    else if (data instanceof VSBuffer) {
        writer.write(BufferPresets.VSBuffer);
        writeInt32VQL(writer, data.byteLength);
        writer.write(data);
    }
    else if (Array.isArray(data)) {
        writer.write(BufferPresets.Array);
        writeInt32VQL(writer, data.length);
        for (const el of data) {
            serialize(writer, el);
        }
    }
    else if (typeof data === 'number' && (data | 0) === data) {
        // write a vql if it's a number that we can do bitwise operations on
        writer.write(BufferPresets.Uint);
        writeInt32VQL(writer, data);
    }
    else {
        const buffer = VSBuffer.fromString(JSON.stringify(data));
        writer.write(BufferPresets.Object);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
}
export function deserialize(reader) {
    const type = reader.read(1).readUInt8(0);
    switch (type) {
        case DataType.Undefined: return undefined;
        case DataType.String: return reader.read(readIntVQL(reader)).toString();
        case DataType.Buffer: return reader.read(readIntVQL(reader)).buffer;
        case DataType.VSBuffer: return reader.read(readIntVQL(reader));
        case DataType.Array: {
            const length = readIntVQL(reader);
            const result = [];
            for (let i = 0; i < length; i++) {
                result.push(deserialize(reader));
            }
            return result;
        }
        case DataType.Object: return JSON.parse(reader.read(readIntVQL(reader)).toString());
        case DataType.Int: return readIntVQL(reader);
    }
}
export class ChannelServer {
    constructor(protocol, ctx, logger = null, timeoutDelay = 1000) {
        this.protocol = protocol;
        this.ctx = ctx;
        this.logger = logger;
        this.timeoutDelay = timeoutDelay;
        this.channels = new Map();
        this.activeRequests = new Map();
        // Requests might come in for channels which are not yet registered.
        // They will timeout after `timeoutDelay`.
        this.pendingRequests = new Map();
        this.protocolListener = this.protocol.onMessage(msg => this.onRawMessage(msg));
        this.sendResponse({ type: 200 /* ResponseType.Initialize */ });
    }
    registerChannel(channelName, channel) {
        this.channels.set(channelName, channel);
        // https://github.com/microsoft/vscode/issues/72531
        setTimeout(() => this.flushPendingRequests(channelName), 0);
    }
    sendResponse(response) {
        switch (response.type) {
            case 200 /* ResponseType.Initialize */: {
                const msgLength = this.send([response.type]);
                this.logger?.logOutgoing(msgLength, 0, 1 /* RequestInitiator.OtherSide */, responseTypeToStr(response.type));
                return;
            }
            case 201 /* ResponseType.PromiseSuccess */:
            case 202 /* ResponseType.PromiseError */:
            case 204 /* ResponseType.EventFire */:
            case 203 /* ResponseType.PromiseErrorObj */: {
                const msgLength = this.send([response.type, response.id], response.data);
                this.logger?.logOutgoing(msgLength, response.id, 1 /* RequestInitiator.OtherSide */, responseTypeToStr(response.type), response.data);
                return;
            }
        }
    }
    send(header, body = undefined) {
        const writer = new BufferWriter();
        serialize(writer, header);
        serialize(writer, body);
        return this.sendBuffer(writer.buffer);
    }
    sendBuffer(message) {
        try {
            this.protocol.send(message);
            return message.byteLength;
        }
        catch (err) {
            // noop
            return 0;
        }
    }
    onRawMessage(message) {
        const reader = new BufferReader(message);
        const header = deserialize(reader);
        const body = deserialize(reader);
        const type = header[0];
        switch (type) {
            case 100 /* RequestType.Promise */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}: ${header[2]}.${header[3]}`, body);
                return this.onPromise({ type, id: header[1], channelName: header[2], name: header[3], arg: body });
            case 102 /* RequestType.EventListen */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}: ${header[2]}.${header[3]}`, body);
                return this.onEventListen({ type, id: header[1], channelName: header[2], name: header[3], arg: body });
            case 101 /* RequestType.PromiseCancel */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}`);
                return this.disposeActiveRequest({ type, id: header[1] });
            case 103 /* RequestType.EventDispose */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}`);
                return this.disposeActiveRequest({ type, id: header[1] });
        }
    }
    onPromise(request) {
        const channel = this.channels.get(request.channelName);
        if (!channel) {
            this.collectPendingRequest(request);
            return;
        }
        const cancellationTokenSource = new CancellationTokenSource();
        let promise;
        try {
            promise = channel.call(this.ctx, request.name, request.arg, cancellationTokenSource.token);
        }
        catch (err) {
            promise = Promise.reject(err);
        }
        const id = request.id;
        promise.then(data => {
            this.sendResponse({ id, data, type: 201 /* ResponseType.PromiseSuccess */ });
        }, err => {
            if (err instanceof Error) {
                this.sendResponse({
                    id, data: {
                        message: err.message,
                        name: err.name,
                        stack: err.stack ? err.stack.split('\n') : undefined
                    }, type: 202 /* ResponseType.PromiseError */
                });
            }
            else {
                this.sendResponse({ id, data: err, type: 203 /* ResponseType.PromiseErrorObj */ });
            }
        }).finally(() => {
            disposable.dispose();
            this.activeRequests.delete(request.id);
        });
        const disposable = toDisposable(() => cancellationTokenSource.cancel());
        this.activeRequests.set(request.id, disposable);
    }
    onEventListen(request) {
        const channel = this.channels.get(request.channelName);
        if (!channel) {
            this.collectPendingRequest(request);
            return;
        }
        const id = request.id;
        const event = channel.listen(this.ctx, request.name, request.arg);
        const disposable = event(data => this.sendResponse({ id, data, type: 204 /* ResponseType.EventFire */ }));
        this.activeRequests.set(request.id, disposable);
    }
    disposeActiveRequest(request) {
        const disposable = this.activeRequests.get(request.id);
        if (disposable) {
            disposable.dispose();
            this.activeRequests.delete(request.id);
        }
    }
    collectPendingRequest(request) {
        let pendingRequests = this.pendingRequests.get(request.channelName);
        if (!pendingRequests) {
            pendingRequests = [];
            this.pendingRequests.set(request.channelName, pendingRequests);
        }
        const timer = setTimeout(() => {
            console.error(`Unknown channel: ${request.channelName}`);
            if (request.type === 100 /* RequestType.Promise */) {
                this.sendResponse({
                    id: request.id,
                    data: { name: 'Unknown channel', message: `Channel name '${request.channelName}' timed out after ${this.timeoutDelay}ms`, stack: undefined },
                    type: 202 /* ResponseType.PromiseError */
                });
            }
        }, this.timeoutDelay);
        pendingRequests.push({ request, timeoutTimer: timer });
    }
    flushPendingRequests(channelName) {
        const requests = this.pendingRequests.get(channelName);
        if (requests) {
            for (const request of requests) {
                clearTimeout(request.timeoutTimer);
                switch (request.request.type) {
                    case 100 /* RequestType.Promise */:
                        this.onPromise(request.request);
                        break;
                    case 102 /* RequestType.EventListen */:
                        this.onEventListen(request.request);
                        break;
                }
            }
            this.pendingRequests.delete(channelName);
        }
    }
    dispose() {
        if (this.protocolListener) {
            this.protocolListener.dispose();
            this.protocolListener = null;
        }
        dispose(this.activeRequests.values());
        this.activeRequests.clear();
    }
}
export var RequestInitiator;
(function (RequestInitiator) {
    RequestInitiator[RequestInitiator["LocalSide"] = 0] = "LocalSide";
    RequestInitiator[RequestInitiator["OtherSide"] = 1] = "OtherSide";
})(RequestInitiator || (RequestInitiator = {}));
export class ChannelClient {
    constructor(protocol, logger = null) {
        this.protocol = protocol;
        this.isDisposed = false;
        this.state = State.Uninitialized;
        this.activeRequests = new Set();
        this.handlers = new Map();
        this.lastRequestId = 0;
        this._onDidInitialize = new Emitter();
        this.onDidInitialize = this._onDidInitialize.event;
        this.protocolListener = this.protocol.onMessage(msg => this.onBuffer(msg));
        this.logger = logger;
    }
    getChannel(channelName) {
        const that = this;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            call(command, arg, cancellationToken) {
                if (that.isDisposed) {
                    return Promise.reject(new CancellationError());
                }
                return that.requestPromise(channelName, command, arg, cancellationToken);
            },
            listen(event, arg) {
                if (that.isDisposed) {
                    return Event.None;
                }
                return that.requestEvent(channelName, event, arg);
            }
        };
    }
    requestPromise(channelName, name, arg, cancellationToken = CancellationToken.None) {
        const id = this.lastRequestId++;
        const type = 100 /* RequestType.Promise */;
        const request = { id, type, channelName, name, arg };
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(new CancellationError());
        }
        let disposable;
        let disposableWithRequestCancel;
        const result = new Promise((c, e) => {
            if (cancellationToken.isCancellationRequested) {
                return e(new CancellationError());
            }
            const doRequest = () => {
                const handler = response => {
                    switch (response.type) {
                        case 201 /* ResponseType.PromiseSuccess */:
                            this.handlers.delete(id);
                            c(response.data);
                            break;
                        case 202 /* ResponseType.PromiseError */: {
                            this.handlers.delete(id);
                            const error = new Error(response.data.message);
                            error.stack = Array.isArray(response.data.stack) ? response.data.stack.join('\n') : response.data.stack;
                            error.name = response.data.name;
                            e(error);
                            break;
                        }
                        case 203 /* ResponseType.PromiseErrorObj */:
                            this.handlers.delete(id);
                            e(response.data);
                            break;
                    }
                };
                this.handlers.set(id, handler);
                this.sendRequest(request);
            };
            let uninitializedPromise = null;
            if (this.state === State.Idle) {
                doRequest();
            }
            else {
                uninitializedPromise = createCancelablePromise(_ => this.whenInitialized());
                uninitializedPromise.then(() => {
                    uninitializedPromise = null;
                    doRequest();
                });
            }
            const cancel = () => {
                if (uninitializedPromise) {
                    uninitializedPromise.cancel();
                    uninitializedPromise = null;
                }
                else {
                    this.sendRequest({ id, type: 101 /* RequestType.PromiseCancel */ });
                }
                e(new CancellationError());
            };
            disposable = cancellationToken.onCancellationRequested(cancel);
            disposableWithRequestCancel = {
                dispose: createSingleCallFunction(() => {
                    cancel();
                    disposable.dispose();
                })
            };
            this.activeRequests.add(disposableWithRequestCancel);
        });
        return result.finally(() => {
            disposable?.dispose(); // Seen as undefined in tests.
            this.activeRequests.delete(disposableWithRequestCancel);
        });
    }
    requestEvent(channelName, name, arg) {
        const id = this.lastRequestId++;
        const type = 102 /* RequestType.EventListen */;
        const request = { id, type, channelName, name, arg };
        let uninitializedPromise = null;
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                const doRequest = () => {
                    this.activeRequests.add(emitter);
                    this.sendRequest(request);
                };
                if (this.state === State.Idle) {
                    doRequest();
                }
                else {
                    uninitializedPromise = createCancelablePromise(_ => this.whenInitialized());
                    uninitializedPromise.then(() => {
                        uninitializedPromise = null;
                        doRequest();
                    });
                }
            },
            onDidRemoveLastListener: () => {
                if (uninitializedPromise) {
                    uninitializedPromise.cancel();
                    uninitializedPromise = null;
                }
                else {
                    this.activeRequests.delete(emitter);
                    this.sendRequest({ id, type: 103 /* RequestType.EventDispose */ });
                }
            }
        });
        const handler = (res) => emitter.fire(res.data);
        this.handlers.set(id, handler);
        return emitter.event;
    }
    sendRequest(request) {
        switch (request.type) {
            case 100 /* RequestType.Promise */:
            case 102 /* RequestType.EventListen */: {
                const msgLength = this.send([request.type, request.id, request.channelName, request.name], request.arg);
                this.logger?.logOutgoing(msgLength, request.id, 0 /* RequestInitiator.LocalSide */, `${requestTypeToStr(request.type)}: ${request.channelName}.${request.name}`, request.arg);
                return;
            }
            case 101 /* RequestType.PromiseCancel */:
            case 103 /* RequestType.EventDispose */: {
                const msgLength = this.send([request.type, request.id]);
                this.logger?.logOutgoing(msgLength, request.id, 0 /* RequestInitiator.LocalSide */, requestTypeToStr(request.type));
                return;
            }
        }
    }
    send(header, body = undefined) {
        const writer = new BufferWriter();
        serialize(writer, header);
        serialize(writer, body);
        return this.sendBuffer(writer.buffer);
    }
    sendBuffer(message) {
        try {
            this.protocol.send(message);
            return message.byteLength;
        }
        catch (err) {
            // noop
            return 0;
        }
    }
    onBuffer(message) {
        const reader = new BufferReader(message);
        const header = deserialize(reader);
        const body = deserialize(reader);
        const type = header[0];
        switch (type) {
            case 200 /* ResponseType.Initialize */:
                this.logger?.logIncoming(message.byteLength, 0, 0 /* RequestInitiator.LocalSide */, responseTypeToStr(type));
                return this.onResponse({ type: header[0] });
            case 201 /* ResponseType.PromiseSuccess */:
            case 202 /* ResponseType.PromiseError */:
            case 204 /* ResponseType.EventFire */:
            case 203 /* ResponseType.PromiseErrorObj */:
                this.logger?.logIncoming(message.byteLength, header[1], 0 /* RequestInitiator.LocalSide */, responseTypeToStr(type), body);
                return this.onResponse({ type: header[0], id: header[1], data: body });
        }
    }
    onResponse(response) {
        if (response.type === 200 /* ResponseType.Initialize */) {
            this.state = State.Idle;
            this._onDidInitialize.fire();
            return;
        }
        const handler = this.handlers.get(response.id);
        handler?.(response);
    }
    get onDidInitializePromise() {
        return Event.toPromise(this.onDidInitialize);
    }
    whenInitialized() {
        if (this.state === State.Idle) {
            return Promise.resolve();
        }
        else {
            return this.onDidInitializePromise;
        }
    }
    dispose() {
        this.isDisposed = true;
        if (this.protocolListener) {
            this.protocolListener.dispose();
            this.protocolListener = null;
        }
        dispose(this.activeRequests.values());
        this.activeRequests.clear();
    }
}
__decorate([
    memoize
], ChannelClient.prototype, "onDidInitializePromise", null);
/**
 * An `IPCServer` is both a channel server and a routing channel
 * client.
 *
 * As the owner of a protocol, you should extend both this
 * and the `IPCClient` classes to get IPC implementations
 * for your protocol.
 */
export class IPCServer {
    get connections() {
        const result = [];
        this._connections.forEach(ctx => result.push(ctx));
        return result;
    }
    constructor(onDidClientConnect, ipcLogger, timeoutDelay) {
        this.channels = new Map();
        this._connections = new Set();
        this._onDidAddConnection = new Emitter();
        this.onDidAddConnection = this._onDidAddConnection.event;
        this._onDidRemoveConnection = new Emitter();
        this.onDidRemoveConnection = this._onDidRemoveConnection.event;
        this.disposables = new DisposableStore();
        this.disposables.add(onDidClientConnect(({ protocol, onDidClientDisconnect }) => {
            const onFirstMessage = Event.once(protocol.onMessage);
            this.disposables.add(onFirstMessage(msg => {
                const reader = new BufferReader(msg);
                const ctx = deserialize(reader);
                const channelServer = new ChannelServer(protocol, ctx, ipcLogger, timeoutDelay);
                const channelClient = new ChannelClient(protocol, ipcLogger);
                this.channels.forEach((channel, name) => channelServer.registerChannel(name, channel));
                const connection = { channelServer, channelClient, ctx };
                this._connections.add(connection);
                this._onDidAddConnection.fire(connection);
                this.disposables.add(onDidClientDisconnect(() => {
                    channelServer.dispose();
                    channelClient.dispose();
                    this._connections.delete(connection);
                    this._onDidRemoveConnection.fire(connection);
                }));
            }));
        }));
    }
    getChannel(channelName, routerOrClientFilter) {
        const that = this;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            call(command, arg, cancellationToken) {
                let connectionPromise;
                if (isFunction(routerOrClientFilter)) {
                    // when no router is provided, we go random client picking
                    const connection = getRandomElement(that.connections.filter(routerOrClientFilter));
                    connectionPromise = connection
                        // if we found a client, let's call on it
                        ? Promise.resolve(connection)
                        // else, let's wait for a client to come along
                        : Event.toPromise(Event.filter(that.onDidAddConnection, routerOrClientFilter));
                }
                else {
                    connectionPromise = routerOrClientFilter.routeCall(that, command, arg);
                }
                const channelPromise = connectionPromise
                    .then(connection => connection.channelClient.getChannel(channelName));
                return getDelayedChannel(channelPromise)
                    .call(command, arg, cancellationToken);
            },
            listen(event, arg) {
                if (isFunction(routerOrClientFilter)) {
                    return that.getMulticastEvent(channelName, routerOrClientFilter, event, arg);
                }
                const channelPromise = routerOrClientFilter.routeEvent(that, event, arg)
                    .then(connection => connection.channelClient.getChannel(channelName));
                return getDelayedChannel(channelPromise)
                    .listen(event, arg);
            }
        };
    }
    getMulticastEvent(channelName, clientFilter, eventName, arg) {
        const that = this;
        let disposables;
        // Create an emitter which hooks up to all clients
        // as soon as first listener is added. It also
        // disconnects from all clients as soon as the last listener
        // is removed.
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                disposables = new DisposableStore();
                // The event multiplexer is useful since the active
                // client list is dynamic. We need to hook up and disconnection
                // to/from clients as they come and go.
                const eventMultiplexer = new EventMultiplexer();
                const map = new Map();
                const onDidAddConnection = (connection) => {
                    const channel = connection.channelClient.getChannel(channelName);
                    const event = channel.listen(eventName, arg);
                    const disposable = eventMultiplexer.add(event);
                    map.set(connection, disposable);
                };
                const onDidRemoveConnection = (connection) => {
                    const disposable = map.get(connection);
                    if (!disposable) {
                        return;
                    }
                    disposable.dispose();
                    map.delete(connection);
                };
                that.connections.filter(clientFilter).forEach(onDidAddConnection);
                Event.filter(that.onDidAddConnection, clientFilter)(onDidAddConnection, undefined, disposables);
                that.onDidRemoveConnection(onDidRemoveConnection, undefined, disposables);
                eventMultiplexer.event(emitter.fire, emitter, disposables);
                disposables.add(eventMultiplexer);
            },
            onDidRemoveLastListener: () => {
                disposables?.dispose();
                disposables = undefined;
            }
        });
        that.disposables.add(emitter);
        return emitter.event;
    }
    registerChannel(channelName, channel) {
        this.channels.set(channelName, channel);
        for (const connection of this._connections) {
            connection.channelServer.registerChannel(channelName, channel);
        }
    }
    dispose() {
        this.disposables.dispose();
        for (const connection of this._connections) {
            connection.channelClient.dispose();
            connection.channelServer.dispose();
        }
        this._connections.clear();
        this.channels.clear();
        this._onDidAddConnection.dispose();
        this._onDidRemoveConnection.dispose();
    }
}
/**
 * An `IPCClient` is both a channel client and a channel server.
 *
 * As the owner of a protocol, you should extend both this
 * and the `IPCServer` classes to get IPC implementations
 * for your protocol.
 */
export class IPCClient {
    constructor(protocol, ctx, ipcLogger = null) {
        const writer = new BufferWriter();
        serialize(writer, ctx);
        protocol.send(writer.buffer);
        this.channelClient = new ChannelClient(protocol, ipcLogger);
        this.channelServer = new ChannelServer(protocol, ctx, ipcLogger);
    }
    getChannel(channelName) {
        return this.channelClient.getChannel(channelName);
    }
    registerChannel(channelName, channel) {
        this.channelServer.registerChannel(channelName, channel);
    }
    dispose() {
        this.channelClient.dispose();
        this.channelServer.dispose();
    }
}
export function getDelayedChannel(promise) {
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    return {
        call(command, arg, cancellationToken) {
            return promise.then(c => c.call(command, arg, cancellationToken));
        },
        listen(event, arg) {
            const relay = new Relay();
            promise.then(c => relay.input = c.listen(event, arg));
            return relay.event;
        }
    };
}
export function getNextTickChannel(channel) {
    let didTick = false;
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    return {
        call(command, arg, cancellationToken) {
            if (didTick) {
                return channel.call(command, arg, cancellationToken);
            }
            return timeout(0)
                .then(() => didTick = true)
                .then(() => channel.call(command, arg, cancellationToken));
        },
        listen(event, arg) {
            if (didTick) {
                return channel.listen(event, arg);
            }
            const relay = new Relay();
            timeout(0)
                .then(() => didTick = true)
                .then(() => relay.input = channel.listen(event, arg));
            return relay.event;
        }
    };
}
export class StaticRouter {
    constructor(fn) {
        this.fn = fn;
    }
    routeCall(hub) {
        return this.route(hub);
    }
    routeEvent(hub) {
        return this.route(hub);
    }
    async route(hub) {
        for (const connection of hub.connections) {
            if (await Promise.resolve(this.fn(connection.ctx))) {
                return Promise.resolve(connection);
            }
        }
        await Event.toPromise(hub.onDidAddConnection);
        return await this.route(hub);
    }
}
/**
 * Use ProxyChannels to automatically wrapping and unwrapping
 * services to/from IPC channels, instead of manually wrapping
 * each service method and event.
 *
 * Restrictions:
 * - If marshalling is enabled, only `URI` and `RegExp` is converted
 *   automatically for you
 * - Events must follow the naming convention `onUpperCase`
 * - `CancellationToken` is currently not supported
 * - If a context is provided, you can use `AddFirstParameterToFunctions`
 *   utility to signal this in the receiving side type
 */
export var ProxyChannel;
(function (ProxyChannel) {
    function fromService(service, disposables, options) {
        const handler = service;
        const disableMarshalling = options && options.disableMarshalling;
        // Buffer any event that should be supported by
        // iterating over all property keys and finding them
        // However, this will not work for services that
        // are lazy and use a Proxy within. For that we
        // still need to check later (see below).
        const mapEventNameToEvent = new Map();
        for (const key in handler) {
            if (propertyIsEvent(key)) {
                mapEventNameToEvent.set(key, Event.buffer(handler[key], true, undefined, disposables));
            }
        }
        return new class {
            listen(_, event, arg) {
                const eventImpl = mapEventNameToEvent.get(event);
                if (eventImpl) {
                    return eventImpl;
                }
                const target = handler[event];
                if (typeof target === 'function') {
                    if (propertyIsDynamicEvent(event)) {
                        return target.call(handler, arg);
                    }
                    if (propertyIsEvent(event)) {
                        mapEventNameToEvent.set(event, Event.buffer(handler[event], true, undefined, disposables));
                        return mapEventNameToEvent.get(event);
                    }
                }
                throw new ErrorNoTelemetry(`Event not found: ${event}`);
            }
            call(_, command, args) {
                const target = handler[command];
                if (typeof target === 'function') {
                    // Revive unless marshalling disabled
                    if (!disableMarshalling && Array.isArray(args)) {
                        for (let i = 0; i < args.length; i++) {
                            args[i] = revive(args[i]);
                        }
                    }
                    let res = target.apply(handler, args);
                    if (!(res instanceof Promise)) {
                        res = Promise.resolve(res);
                    }
                    return res;
                }
                throw new ErrorNoTelemetry(`Method not found: ${command}`);
            }
        };
    }
    ProxyChannel.fromService = fromService;
    function toService(channel, options) {
        const disableMarshalling = options && options.disableMarshalling;
        return new Proxy({}, {
            get(_target, propKey) {
                if (typeof propKey === 'string') {
                    // Check for predefined values
                    if (options?.properties?.has(propKey)) {
                        return options.properties.get(propKey);
                    }
                    // Dynamic Event
                    if (propertyIsDynamicEvent(propKey)) {
                        return function (arg) {
                            return channel.listen(propKey, arg);
                        };
                    }
                    // Event
                    if (propertyIsEvent(propKey)) {
                        return channel.listen(propKey);
                    }
                    // Function
                    return async function (...args) {
                        // Add context if any
                        let methodArgs;
                        if (options && !isUndefinedOrNull(options.context)) {
                            methodArgs = [options.context, ...args];
                        }
                        else {
                            methodArgs = args;
                        }
                        const result = await channel.call(propKey, methodArgs);
                        // Revive unless marshalling disabled
                        if (!disableMarshalling) {
                            return revive(result);
                        }
                        return result;
                    };
                }
                throw new ErrorNoTelemetry(`Property not found: ${String(propKey)}`);
            }
        });
    }
    ProxyChannel.toService = toService;
    function propertyIsEvent(name) {
        // Assume a property is an event if it has a form of "onSomething"
        return name[0] === 'o' && name[1] === 'n' && strings.isUpperAsciiLetter(name.charCodeAt(2));
    }
    function propertyIsDynamicEvent(name) {
        // Assume a property is a dynamic event (a method that returns an event) if it has a form of "onDynamicSomething"
        return /^onDynamic/.test(name) && strings.isUpperAsciiLetter(name.charCodeAt(9));
    }
})(ProxyChannel || (ProxyChannel = {}));
const colorTables = [
    ['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
    ['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD']
];
function prettyWithoutArrays(data) {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && typeof data === 'object' && typeof data.toString === 'function') {
        const result = data.toString();
        if (result !== '[object Object]') {
            return result;
        }
    }
    return data;
}
function pretty(data) {
    if (Array.isArray(data)) {
        return data.map(prettyWithoutArrays);
    }
    return prettyWithoutArrays(data);
}
function logWithColors(direction, totalLength, msgLength, req, initiator, str, data) {
    data = pretty(data);
    const colorTable = colorTables[initiator];
    const color = colorTable[req % colorTable.length];
    let args = [`%c[${direction}]%c[${String(totalLength).padStart(7, ' ')}]%c[len: ${String(msgLength).padStart(5, ' ')}]%c${String(req).padStart(5, ' ')} - ${str}`, 'color: darkgreen', 'color: grey', 'color: grey', `color: ${color}`];
    if (/\($/.test(str)) {
        args = args.concat(data);
        args.push(')');
    }
    else {
        args.push(data);
    }
    console.log.apply(console, args);
}
export class IPCLogger {
    constructor(_outgoingPrefix, _incomingPrefix) {
        this._outgoingPrefix = _outgoingPrefix;
        this._incomingPrefix = _incomingPrefix;
        this._totalIncoming = 0;
        this._totalOutgoing = 0;
    }
    logOutgoing(msgLength, requestId, initiator, str, data) {
        this._totalOutgoing += msgLength;
        logWithColors(this._outgoingPrefix, this._totalOutgoing, msgLength, requestId, initiator, str, data);
    }
    logIncoming(msgLength, requestId, initiator, str, data) {
        this._totalIncoming += msgLength;
        logWithColors(this._incomingPrefix, this._totalIncoming, msgLength, requestId, initiator, str, data);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2NvbW1vbi9pcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0QsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25HLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RCxPQUFPLEtBQUssT0FBTyxNQUFNLDRCQUE0QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQXVCekUsSUFBVyxXQUtWO0FBTEQsV0FBVyxXQUFXO0lBQ3JCLHFEQUFhLENBQUE7SUFDYixpRUFBbUIsQ0FBQTtJQUNuQiw2REFBaUIsQ0FBQTtJQUNqQiwrREFBa0IsQ0FBQTtBQUNuQixDQUFDLEVBTFUsV0FBVyxLQUFYLFdBQVcsUUFLckI7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQWlCO0lBQzFDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZDtZQUNDLE9BQU8sS0FBSyxDQUFDO1FBQ2Q7WUFDQyxPQUFPLFFBQVEsQ0FBQztRQUNqQjtZQUNDLE9BQU8sV0FBVyxDQUFDO1FBQ3BCO1lBQ0MsT0FBTyxhQUFhLENBQUM7SUFDdkIsQ0FBQztBQUNGLENBQUM7QUFRRCxJQUFXLFlBTVY7QUFORCxXQUFXLFlBQVk7SUFDdEIsNkRBQWdCLENBQUE7SUFDaEIscUVBQW9CLENBQUE7SUFDcEIsaUVBQWtCLENBQUE7SUFDbEIsdUVBQXFCLENBQUE7SUFDckIsMkRBQWUsQ0FBQTtBQUNoQixDQUFDLEVBTlUsWUFBWSxLQUFaLFlBQVksUUFNdEI7QUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQWtCO0lBQzVDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZDtZQUNDLE9BQU8sTUFBTSxDQUFDO1FBQ2Y7WUFDQyxPQUFPLFFBQVEsQ0FBQztRQUNqQix5Q0FBK0I7UUFDL0I7WUFDQyxPQUFPLFdBQVcsQ0FBQztRQUNwQjtZQUNDLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7QUFDRixDQUFDO0FBc0JELElBQUssS0FHSjtBQUhELFdBQUssS0FBSztJQUNULG1EQUFhLENBQUE7SUFDYixpQ0FBSSxDQUFBO0FBQ0wsQ0FBQyxFQUhJLEtBQUssS0FBTCxLQUFLLFFBR1Q7QUEwREQ7O0dBRUc7QUFDSCxTQUFTLFVBQVUsQ0FBQyxNQUFlO0lBQ2xDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUMxQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRXZDOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQUMsTUFBZSxFQUFFLEtBQWE7SUFDcEQsSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDakIsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0QixPQUFPO0lBQ1IsQ0FBQztJQUVELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztJQUNaLEtBQUssSUFBSSxFQUFFLEdBQUcsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUM5QyxHQUFHLEVBQUUsQ0FBQztJQUNQLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNsQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxVQUFVLENBQUM7UUFDdkMsS0FBSyxHQUFHLEtBQUssS0FBSyxDQUFDLENBQUM7UUFDcEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQztRQUNqQyxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQUVELE1BQU0sT0FBTyxZQUFZO0lBSXhCLFlBQW9CLE1BQWdCO1FBQWhCLFdBQU0sR0FBTixNQUFNLENBQVU7UUFGNUIsUUFBRyxHQUFHLENBQUMsQ0FBQztJQUV3QixDQUFDO0lBRXpDLElBQUksQ0FBQyxLQUFhO1FBQ2pCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUM7UUFDOUIsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sWUFBWTtJQUF6QjtRQUVTLFlBQU8sR0FBZSxFQUFFLENBQUM7SUFTbEMsQ0FBQztJQVBBLElBQUksTUFBTTtRQUNULE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFnQjtRQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMzQixDQUFDO0NBQ0Q7QUFFRCxJQUFLLFFBUUo7QUFSRCxXQUFLLFFBQVE7SUFDWixpREFBYSxDQUFBO0lBQ2IsMkNBQVUsQ0FBQTtJQUNWLDJDQUFVLENBQUE7SUFDViwrQ0FBWSxDQUFBO0lBQ1oseUNBQVMsQ0FBQTtJQUNULDJDQUFVLENBQUE7SUFDVixxQ0FBTyxDQUFBO0FBQ1IsQ0FBQyxFQVJJLFFBQVEsS0FBUixRQUFRLFFBUVo7QUFFRCxTQUFTLG1CQUFtQixDQUFDLEtBQWE7SUFDekMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1QixPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLGFBQWEsR0FBRztJQUNyQixTQUFTLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztJQUNsRCxNQUFNLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUM1QyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUM1QyxRQUFRLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztJQUNoRCxLQUFLLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztJQUMxQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUM1QyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztDQUN2QyxDQUFDO0FBR0YsTUFBTSxTQUFTLEdBQUcsQ0FBQyxPQUFPLE1BQU0sS0FBSyxXQUFXLENBQUMsQ0FBQztBQUVsRCxNQUFNLFVBQVUsU0FBUyxDQUFDLE1BQWUsRUFBRSxJQUFTO0lBQ25ELElBQUksT0FBTyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkMsQ0FBQztTQUFNLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDckMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLENBQUM7U0FBTSxJQUFJLFNBQVMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDL0MsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLENBQUM7U0FBTSxJQUFJLElBQUksWUFBWSxRQUFRLEVBQUUsQ0FBQztRQUNyQyxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLENBQUM7U0FBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNoQyxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVuQyxLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3ZCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNGLENBQUM7U0FBTSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM1RCxvRUFBb0U7UUFDcEUsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO1NBQU0sQ0FBQztRQUNQLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLGFBQWEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUFDLE1BQWU7SUFDMUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFekMsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLEtBQUssUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sU0FBUyxDQUFDO1FBQzFDLEtBQUssUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4RSxLQUFLLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3BFLEtBQUssUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMvRCxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsQyxNQUFNLE1BQU0sR0FBVSxFQUFFLENBQUM7WUFFekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLENBQUM7WUFFRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFDRCxLQUFLLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLEtBQUssUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLENBQUM7QUFDRixDQUFDO0FBT0QsTUFBTSxPQUFPLGFBQWE7SUFVekIsWUFBb0IsUUFBaUMsRUFBVSxHQUFhLEVBQVUsU0FBNEIsSUFBSSxFQUFVLGVBQXVCLElBQUk7UUFBdkksYUFBUSxHQUFSLFFBQVEsQ0FBeUI7UUFBVSxRQUFHLEdBQUgsR0FBRyxDQUFVO1FBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBMEI7UUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQVJuSixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQW9DLENBQUM7UUFDdkQsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUd4RCxvRUFBb0U7UUFDcEUsMENBQTBDO1FBQ2xDLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7UUFHN0QsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLG1DQUF5QixFQUFFLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsZUFBZSxDQUFDLFdBQW1CLEVBQUUsT0FBaUM7UUFDckUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXhDLG1EQUFtRDtRQUNuRCxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFTyxZQUFZLENBQUMsUUFBc0I7UUFDMUMsUUFBUSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdkIsc0NBQTRCLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLHNDQUE4QixpQkFBaUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDckcsT0FBTztZQUNSLENBQUM7WUFFRCwyQ0FBaUM7WUFDakMseUNBQStCO1lBQy9CLHNDQUE0QjtZQUM1QiwyQ0FBaUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pFLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsRUFBRSxzQ0FBOEIsaUJBQWlCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUgsT0FBTztZQUNSLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLElBQUksQ0FBQyxNQUFXLEVBQUUsT0FBWSxTQUFTO1FBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEMsU0FBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQixTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVPLFVBQVUsQ0FBQyxPQUFpQjtRQUNuQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QixPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDM0IsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPO1lBQ1AsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FBQyxPQUFpQjtRQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6QyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkMsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQWdCLENBQUM7UUFFdEMsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkO2dCQUNDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxzQ0FBOEIsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2xKLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNwRztnQkFDQyxJQUFJLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsc0NBQThCLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNsSixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDeEc7Z0JBQ0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLHNDQUE4QixHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakgsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0Q7Z0JBQ0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLHNDQUE4QixHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakgsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFTyxTQUFTLENBQUMsT0FBMkI7UUFDNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXZELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwQyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sdUJBQXVCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQzlELElBQUksT0FBcUIsQ0FBQztRQUUxQixJQUFJLENBQUM7WUFDSixPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1RixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFFRCxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBRXRCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSx1Q0FBNkIsRUFBRSxDQUFDLENBQUM7UUFDcEUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ1IsSUFBSSxHQUFHLFlBQVksS0FBSyxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxZQUFZLENBQUM7b0JBQ2pCLEVBQUUsRUFBRSxJQUFJLEVBQUU7d0JBQ1QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO3dCQUNwQixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7d0JBQ2QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO3FCQUNwRCxFQUFFLElBQUkscUNBQTJCO2lCQUNsQyxDQUFDLENBQUM7WUFDSixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksd0NBQThCLEVBQUUsQ0FBQyxDQUFDO1lBQzFFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ2YsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVPLGFBQWEsQ0FBQyxPQUErQjtRQUNwRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdkQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN0QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEUsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxrQ0FBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVoRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxPQUFvQjtRQUNoRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFdkQsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7SUFDRixDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBb0Q7UUFDakYsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXBFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixlQUFlLEdBQUcsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDN0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFFekQsSUFBSSxPQUFPLENBQUMsSUFBSSxrQ0FBd0IsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDO29CQUNqQixFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7b0JBQ2QsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsT0FBTyxDQUFDLFdBQVcscUJBQXFCLElBQUksQ0FBQyxZQUFZLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFO29CQUM1SSxJQUFJLHFDQUEyQjtpQkFDL0IsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFdEIsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU8sb0JBQW9CLENBQUMsV0FBbUI7UUFDL0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdkQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2hDLFlBQVksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBRW5DLFFBQVEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDOUI7d0JBQTBCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUFDLE1BQU07b0JBQ2pFO3dCQUE4QixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFBQyxNQUFNO2dCQUMxRSxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDOUIsQ0FBQztRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM3QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQU4sSUFBa0IsZ0JBR2pCO0FBSEQsV0FBa0IsZ0JBQWdCO0lBQ2pDLGlFQUFhLENBQUE7SUFDYixpRUFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBR2pDO0FBT0QsTUFBTSxPQUFPLGFBQWE7SUFhekIsWUFBb0IsUUFBaUMsRUFBRSxTQUE0QixJQUFJO1FBQW5FLGFBQVEsR0FBUixRQUFRLENBQXlCO1FBWDdDLGVBQVUsR0FBWSxLQUFLLENBQUM7UUFDNUIsVUFBSyxHQUFVLEtBQUssQ0FBQyxhQUFhLENBQUM7UUFDbkMsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBQ3hDLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQztRQUN2QyxrQkFBYSxHQUFXLENBQUMsQ0FBQztRQUlqQixxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQy9DLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztRQUd0RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVELFVBQVUsQ0FBcUIsV0FBbUI7UUFDakQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWxCLG1FQUFtRTtRQUNuRSxPQUFPO1lBQ04sSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFTLEVBQUUsaUJBQXFDO2dCQUNyRSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDckIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRCxDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQzFFLENBQUM7WUFDRCxNQUFNLENBQUMsS0FBYSxFQUFFLEdBQVE7Z0JBQzdCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNyQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLENBQUM7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbkQsQ0FBQztTQUNJLENBQUM7SUFDUixDQUFDO0lBRU8sY0FBYyxDQUFDLFdBQW1CLEVBQUUsSUFBWSxFQUFFLEdBQVMsRUFBRSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJO1FBQzlHLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNoQyxNQUFNLElBQUksZ0NBQXNCLENBQUM7UUFDakMsTUFBTSxPQUFPLEdBQWdCLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBRWxFLElBQUksaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUMvQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUVELElBQUksVUFBdUIsQ0FBQztRQUM1QixJQUFJLDJCQUF3QyxDQUFDO1FBRTdDLE1BQU0sTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ25DLElBQUksaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDL0MsT0FBTyxDQUFDLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDbkMsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRTtnQkFDdEIsTUFBTSxPQUFPLEdBQWEsUUFBUSxDQUFDLEVBQUU7b0JBQ3BDLFFBQVEsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUN2Qjs0QkFDQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDekIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDakIsTUFBTTt3QkFFUCx3Q0FBOEIsQ0FBQyxDQUFDLENBQUM7NEJBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUN6QixNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUN6QyxLQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzs0QkFDL0csS0FBSyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzs0QkFDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUNULE1BQU07d0JBQ1AsQ0FBQzt3QkFDRDs0QkFDQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDekIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDakIsTUFBTTtvQkFDUixDQUFDO2dCQUNGLENBQUMsQ0FBQztnQkFFRixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDO1lBRUYsSUFBSSxvQkFBb0IsR0FBbUMsSUFBSSxDQUFDO1lBQ2hFLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxDQUFDO1lBQ2IsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG9CQUFvQixHQUFHLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7Z0JBQzVFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQzlCLG9CQUFvQixHQUFHLElBQUksQ0FBQztvQkFDNUIsU0FBUyxFQUFFLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxFQUFFO2dCQUNuQixJQUFJLG9CQUFvQixFQUFFLENBQUM7b0JBQzFCLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUM5QixvQkFBb0IsR0FBRyxJQUFJLENBQUM7Z0JBQzdCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUkscUNBQTJCLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRCxDQUFDO2dCQUVELENBQUMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztZQUM1QixDQUFDLENBQUM7WUFFRixVQUFVLEdBQUcsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDL0QsMkJBQTJCLEdBQUc7Z0JBQzdCLE9BQU8sRUFBRSx3QkFBd0IsQ0FBQyxHQUFHLEVBQUU7b0JBQ3RDLE1BQU0sRUFBRSxDQUFDO29CQUNULFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDO2FBQ0YsQ0FBQztZQUVGLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQzFCLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLDhCQUE4QjtZQUNyRCxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLFlBQVksQ0FBQyxXQUFtQixFQUFFLElBQVksRUFBRSxHQUFTO1FBQ2hFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNoQyxNQUFNLElBQUksb0NBQTBCLENBQUM7UUFDckMsTUFBTSxPQUFPLEdBQWdCLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBRWxFLElBQUksb0JBQW9CLEdBQW1DLElBQUksQ0FBQztRQUVoRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTTtZQUNoQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7Z0JBQzVCLE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRTtvQkFDdEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzNCLENBQUMsQ0FBQztnQkFDRixJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUMvQixTQUFTLEVBQUUsQ0FBQztnQkFDYixDQUFDO3FCQUFNLENBQUM7b0JBQ1Asb0JBQW9CLEdBQUcsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztvQkFDNUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTt3QkFDOUIsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO3dCQUM1QixTQUFTLEVBQUUsQ0FBQztvQkFDYixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDO1lBQ0YsQ0FBQztZQUNELHVCQUF1QixFQUFFLEdBQUcsRUFBRTtnQkFDN0IsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO29CQUMxQixvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDOUIsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO2dCQUM3QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxvQ0FBMEIsRUFBRSxDQUFDLENBQUM7Z0JBQzFELENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLEdBQWEsQ0FBQyxHQUFpQixFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFFLEdBQTZCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRS9CLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQztJQUN0QixDQUFDO0lBRU8sV0FBVyxDQUFDLE9BQW9CO1FBQ3ZDLFFBQVEsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLG1DQUF5QjtZQUN6QixzQ0FBNEIsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN4RyxJQUFJLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQUUsc0NBQThCLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLE9BQU8sQ0FBQyxXQUFXLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdEssT0FBTztZQUNSLENBQUM7WUFFRCx5Q0FBK0I7WUFDL0IsdUNBQTZCLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFLHNDQUE4QixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDNUcsT0FBTztZQUNSLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLElBQUksQ0FBQyxNQUFXLEVBQUUsT0FBWSxTQUFTO1FBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEMsU0FBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQixTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVPLFVBQVUsQ0FBQyxPQUFpQjtRQUNuQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QixPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDM0IsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPO1lBQ1AsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO0lBQ0YsQ0FBQztJQUVPLFFBQVEsQ0FBQyxPQUFpQjtRQUNqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6QyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkMsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sSUFBSSxHQUFpQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckMsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkO2dCQUNDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxzQ0FBOEIsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDckcsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFN0MsMkNBQWlDO1lBQ2pDLHlDQUErQjtZQUMvQixzQ0FBNEI7WUFDNUI7Z0JBQ0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLHNDQUE4QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkgsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7SUFDRixDQUFDO0lBRU8sVUFBVSxDQUFDLFFBQXNCO1FBQ3hDLElBQUksUUFBUSxDQUFDLElBQUksc0NBQTRCLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDeEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRS9DLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFHRCxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFTyxlQUFlO1FBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDL0IsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQztRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzlCLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDN0IsQ0FBQztDQUNEO0FBckJBO0lBREMsT0FBTzsyREFHUDtBQStCRjs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFhckIsSUFBSSxXQUFXO1FBQ2QsTUFBTSxNQUFNLEdBQTJCLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNuRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxZQUFZLGtCQUFnRCxFQUFFLFNBQTZCLEVBQUUsWUFBcUI7UUFqQjFHLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztRQUN2RCxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBRXRDLHdCQUFtQixHQUFHLElBQUksT0FBTyxFQUF3QixDQUFDO1FBQ2xFLHVCQUFrQixHQUFnQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBRXpFLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUF3QixDQUFDO1FBQ3JFLDBCQUFxQixHQUFnQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1FBRS9FLGdCQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQVNwRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLEVBQUUsRUFBRTtZQUMvRSxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV0RCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFhLENBQUM7Z0JBRTVDLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUNoRixNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBRTdELElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFFdkYsTUFBTSxVQUFVLEdBQXlCLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FBQztnQkFDL0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBRTFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtvQkFDL0MsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUN4QixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNyQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBV0QsVUFBVSxDQUFxQixXQUFtQixFQUFFLG9CQUF1RjtRQUMxSSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFFbEIsbUVBQW1FO1FBQ25FLE9BQU87WUFDTixJQUFJLENBQUMsT0FBZSxFQUFFLEdBQVMsRUFBRSxpQkFBcUM7Z0JBQ3JFLElBQUksaUJBQTRDLENBQUM7Z0JBRWpELElBQUksVUFBVSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztvQkFDdEMsMERBQTBEO29CQUMxRCxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7b0JBRW5GLGlCQUFpQixHQUFHLFVBQVU7d0JBQzdCLHlDQUF5Qzt3QkFDekMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO3dCQUM3Qiw4Q0FBOEM7d0JBQzlDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztnQkFDakYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGlCQUFpQixHQUFHLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN4RSxDQUFDO2dCQUVELE1BQU0sY0FBYyxHQUFHLGlCQUFpQjtxQkFDdEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUUsVUFBbUMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBRWpHLE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFDO3FCQUN0QyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7WUFDRCxNQUFNLENBQUMsS0FBYSxFQUFFLEdBQVE7Z0JBQzdCLElBQUksVUFBVSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztvQkFDdEMsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDOUUsQ0FBQztnQkFFRCxNQUFNLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUM7cUJBQ3RFLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFFLFVBQW1DLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUVqRyxPQUFPLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztxQkFDdEMsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN0QixDQUFDO1NBQ0ksQ0FBQztJQUNSLENBQUM7SUFFTyxpQkFBaUIsQ0FBcUIsV0FBbUIsRUFBRSxZQUFtRCxFQUFFLFNBQWlCLEVBQUUsR0FBUTtRQUNsSixNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxXQUF3QyxDQUFDO1FBRTdDLGtEQUFrRDtRQUNsRCw4Q0FBOEM7UUFDOUMsNERBQTREO1FBQzVELGNBQWM7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBSTtZQUM5QixzQkFBc0IsRUFBRSxHQUFHLEVBQUU7Z0JBQzVCLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUVwQyxtREFBbUQ7Z0JBQ25ELCtEQUErRDtnQkFDL0QsdUNBQXVDO2dCQUN2QyxNQUFNLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLEVBQUssQ0FBQztnQkFDbkQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQXFDLENBQUM7Z0JBRXpELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxVQUFnQyxFQUFFLEVBQUU7b0JBQy9ELE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNqRSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFJLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDaEQsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUUvQyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDakMsQ0FBQyxDQUFDO2dCQUVGLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxVQUFnQyxFQUFFLEVBQUU7b0JBQ2xFLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBRXZDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDakIsT0FBTztvQkFDUixDQUFDO29CQUVELFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDckIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDeEIsQ0FBQyxDQUFDO2dCQUVGLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNsRSxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQ2hHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQzFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFFM0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ25DLENBQUM7WUFDRCx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7Z0JBQzdCLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDdkIsV0FBVyxHQUFHLFNBQVMsQ0FBQztZQUN6QixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUIsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxlQUFlLENBQUMsV0FBbUIsRUFBRSxPQUFpQztRQUNyRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFeEMsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hFLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFM0IsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxVQUFVLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BDLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0NBQ0Q7QUFFRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLE9BQU8sU0FBUztJQUtyQixZQUFZLFFBQWlDLEVBQUUsR0FBYSxFQUFFLFlBQStCLElBQUk7UUFDaEcsTUFBTSxNQUFNLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQyxTQUFTLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsVUFBVSxDQUFxQixXQUFtQjtRQUNqRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBTSxDQUFDO0lBQ3hELENBQUM7SUFFRCxlQUFlLENBQUMsV0FBbUIsRUFBRSxPQUFpQztRQUNyRSxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDOUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFxQixPQUFtQjtJQUN4RSxtRUFBbUU7SUFDbkUsT0FBTztRQUNOLElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBUyxFQUFFLGlCQUFxQztZQUNyRSxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFJLE9BQU8sRUFBRSxHQUFHLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxNQUFNLENBQUksS0FBYSxFQUFFLEdBQVM7WUFDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQU8sQ0FBQztZQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUNwQixDQUFDO0tBQ0ksQ0FBQztBQUNSLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQXFCLE9BQVU7SUFDaEUsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBRXBCLG1FQUFtRTtJQUNuRSxPQUFPO1FBQ04sSUFBSSxDQUFJLE9BQWUsRUFBRSxHQUFTLEVBQUUsaUJBQXFDO1lBQ3hFLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUN0RCxDQUFDO1lBRUQsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNmLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2lCQUMxQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBSSxPQUFPLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBQ0QsTUFBTSxDQUFJLEtBQWEsRUFBRSxHQUFTO1lBQ2pDLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFJLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN0QyxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUssQ0FBQztZQUU3QixPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNSLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2lCQUMxQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFJLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRTFELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUNwQixDQUFDO0tBQ0ksQ0FBQztBQUNSLENBQUM7QUFFRCxNQUFNLE9BQU8sWUFBWTtJQUV4QixZQUFvQixFQUFpRDtRQUFqRCxPQUFFLEdBQUYsRUFBRSxDQUErQztJQUFJLENBQUM7SUFFMUUsU0FBUyxDQUFDLEdBQTZCO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsVUFBVSxDQUFDLEdBQTZCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUE2QjtRQUNoRCxLQUFLLE1BQU0sVUFBVSxJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMxQyxJQUFJLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUM5QyxPQUFPLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5QixDQUFDO0NBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxNQUFNLEtBQVcsWUFBWSxDQXdKNUI7QUF4SkQsV0FBaUIsWUFBWTtJQWM1QixTQUFnQixXQUFXLENBQVcsT0FBZ0IsRUFBRSxXQUE0QixFQUFFLE9BQXNDO1FBQzNILE1BQU0sT0FBTyxHQUFHLE9BQXFDLENBQUM7UUFDdEQsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDO1FBRWpFLCtDQUErQztRQUMvQyxvREFBb0Q7UUFDcEQsZ0RBQWdEO1FBQ2hELCtDQUErQztRQUMvQyx5Q0FBeUM7UUFDekMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztRQUM5RCxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFtQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMxRyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSTtZQUVWLE1BQU0sQ0FBSSxDQUFVLEVBQUUsS0FBYSxFQUFFLEdBQVE7Z0JBQzVDLE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDakQsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLFNBQXFCLENBQUM7Z0JBQzlCLENBQUM7Z0JBRUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM5QixJQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUNsQyxJQUFJLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ25DLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ2xDLENBQUM7b0JBRUQsSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDNUIsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQW1CLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO3dCQUU3RyxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQWEsQ0FBQztvQkFDbkQsQ0FBQztnQkFDRixDQUFDO2dCQUVELE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxvQkFBb0IsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN6RCxDQUFDO1lBRUQsSUFBSSxDQUFDLENBQVUsRUFBRSxPQUFlLEVBQUUsSUFBWTtnQkFDN0MsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUVsQyxxQ0FBcUM7b0JBQ3JDLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ2hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQ3RDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzNCLENBQUM7b0JBQ0YsQ0FBQztvQkFFRCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDdEMsSUFBSSxDQUFDLENBQUMsR0FBRyxZQUFZLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQy9CLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM1QixDQUFDO29CQUNELE9BQU8sR0FBRyxDQUFDO2dCQUNaLENBQUM7Z0JBRUQsTUFBTSxJQUFJLGdCQUFnQixDQUFDLHFCQUFxQixPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzVELENBQUM7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQTdEZSx3QkFBVyxjQTZEMUIsQ0FBQTtJQWlCRCxTQUFnQixTQUFTLENBQW1CLE9BQWlCLEVBQUUsT0FBb0M7UUFDbEcsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDO1FBRWpFLE9BQU8sSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFO1lBQ3BCLEdBQUcsQ0FBQyxPQUFVLEVBQUUsT0FBb0I7Z0JBQ25DLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBRWpDLDhCQUE4QjtvQkFDOUIsSUFBSSxPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUN2QyxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN4QyxDQUFDO29CQUVELGdCQUFnQjtvQkFDaEIsSUFBSSxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUNyQyxPQUFPLFVBQVUsR0FBUTs0QkFDeEIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQzt3QkFDckMsQ0FBQyxDQUFDO29CQUNILENBQUM7b0JBRUQsUUFBUTtvQkFDUixJQUFJLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUM5QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ2hDLENBQUM7b0JBRUQsV0FBVztvQkFDWCxPQUFPLEtBQUssV0FBVyxHQUFHLElBQVc7d0JBRXBDLHFCQUFxQjt3QkFDckIsSUFBSSxVQUFpQixDQUFDO3dCQUN0QixJQUFJLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDOzRCQUNwRCxVQUFVLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7d0JBQ3pDLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxVQUFVLEdBQUcsSUFBSSxDQUFDO3dCQUNuQixDQUFDO3dCQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7d0JBRXZELHFDQUFxQzt3QkFDckMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7NEJBQ3pCLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUN2QixDQUFDO3dCQUVELE9BQU8sTUFBTSxDQUFDO29CQUNmLENBQUMsQ0FBQztnQkFDSCxDQUFDO2dCQUVELE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyx1QkFBdUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN0RSxDQUFDO1NBQ0QsQ0FBTSxDQUFDO0lBQ1QsQ0FBQztJQWpEZSxzQkFBUyxZQWlEeEIsQ0FBQTtJQUVELFNBQVMsZUFBZSxDQUFDLElBQVk7UUFDcEMsa0VBQWtFO1FBQ2xFLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0YsQ0FBQztJQUVELFNBQVMsc0JBQXNCLENBQUMsSUFBWTtRQUMzQyxpSEFBaUg7UUFDakgsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEYsQ0FBQztBQUNGLENBQUMsRUF4SmdCLFlBQVksS0FBWixZQUFZLFFBd0o1QjtBQUVELE1BQU0sV0FBVyxHQUFHO0lBQ25CLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQztJQUN2RCxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUM7Q0FDdkQsQ0FBQztBQUVGLFNBQVMsbUJBQW1CLENBQUMsSUFBUztJQUNyQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUN6QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDRCxJQUFJLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQzdFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMvQixJQUFJLE1BQU0sS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxJQUFTO0lBQ3hCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxTQUFpQixFQUFFLFdBQW1CLEVBQUUsU0FBaUIsRUFBRSxHQUFXLEVBQUUsU0FBMkIsRUFBRSxHQUFXLEVBQUUsSUFBUztJQUNqSixJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXBCLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMxQyxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNsRCxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sU0FBUyxPQUFPLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxZQUFZLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsVUFBVSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3JCLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDaEIsQ0FBQztTQUFNLENBQUM7UUFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pCLENBQUM7SUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBNkIsQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUlyQixZQUNrQixlQUF1QixFQUN2QixlQUF1QjtRQUR2QixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUN2QixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUxqQyxtQkFBYyxHQUFHLENBQUMsQ0FBQztRQUNuQixtQkFBYyxHQUFHLENBQUMsQ0FBQztJQUt2QixDQUFDO0lBRUUsV0FBVyxDQUFDLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxTQUEyQixFQUFFLEdBQVcsRUFBRSxJQUFVO1FBQzVHLElBQUksQ0FBQyxjQUFjLElBQUksU0FBUyxDQUFDO1FBQ2pDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFFTSxXQUFXLENBQUMsU0FBaUIsRUFBRSxTQUFpQixFQUFFLFNBQTJCLEVBQUUsR0FBVyxFQUFFLElBQVU7UUFDNUcsSUFBSSxDQUFDLGNBQWMsSUFBSSxTQUFTLENBQUM7UUFDakMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEcsQ0FBQztDQUNEIn0=