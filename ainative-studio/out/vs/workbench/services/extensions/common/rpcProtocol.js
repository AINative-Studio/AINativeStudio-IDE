/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var _a;
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import * as errors from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { transformIncomingURIs } from '../../../../base/common/uriIpc.js';
import { CanceledLazyPromise, LazyPromise } from './lazyPromise.js';
import { getStringIdentifierForProxy, ProxyIdentifier, SerializableObjectWithBuffers } from './proxyIdentifier.js';
function safeStringify(obj, replacer) {
    try {
        return JSON.stringify(obj, replacer);
    }
    catch (err) {
        return 'null';
    }
}
const refSymbolName = '$$ref$$';
const undefinedRef = { [refSymbolName]: -1 };
class StringifiedJsonWithBufferRefs {
    constructor(jsonString, referencedBuffers) {
        this.jsonString = jsonString;
        this.referencedBuffers = referencedBuffers;
    }
}
export function stringifyJsonWithBufferRefs(obj, replacer = null, useSafeStringify = false) {
    const foundBuffers = [];
    const serialized = (useSafeStringify ? safeStringify : JSON.stringify)(obj, (key, value) => {
        if (typeof value === 'undefined') {
            return undefinedRef; // JSON.stringify normally converts 'undefined' to 'null'
        }
        else if (typeof value === 'object') {
            if (value instanceof VSBuffer) {
                const bufferIndex = foundBuffers.push(value) - 1;
                return { [refSymbolName]: bufferIndex };
            }
            if (replacer) {
                return replacer(key, value);
            }
        }
        return value;
    });
    return {
        jsonString: serialized,
        referencedBuffers: foundBuffers
    };
}
export function parseJsonAndRestoreBufferRefs(jsonString, buffers, uriTransformer) {
    return JSON.parse(jsonString, (_key, value) => {
        if (value) {
            const ref = value[refSymbolName];
            if (typeof ref === 'number') {
                return buffers[ref];
            }
            if (uriTransformer && value.$mid === 1 /* MarshalledId.Uri */) {
                return uriTransformer.transformIncoming(value);
            }
        }
        return value;
    });
}
function stringify(obj, replacer) {
    return JSON.stringify(obj, replacer);
}
function createURIReplacer(transformer) {
    if (!transformer) {
        return null;
    }
    return (key, value) => {
        if (value && value.$mid === 1 /* MarshalledId.Uri */) {
            return transformer.transformOutgoing(value);
        }
        return value;
    };
}
export var RequestInitiator;
(function (RequestInitiator) {
    RequestInitiator[RequestInitiator["LocalSide"] = 0] = "LocalSide";
    RequestInitiator[RequestInitiator["OtherSide"] = 1] = "OtherSide";
})(RequestInitiator || (RequestInitiator = {}));
export var ResponsiveState;
(function (ResponsiveState) {
    ResponsiveState[ResponsiveState["Responsive"] = 0] = "Responsive";
    ResponsiveState[ResponsiveState["Unresponsive"] = 1] = "Unresponsive";
})(ResponsiveState || (ResponsiveState = {}));
const noop = () => { };
const _RPCProtocolSymbol = Symbol.for('rpcProtocol');
const _RPCProxySymbol = Symbol.for('rpcProxy');
export class RPCProtocol extends Disposable {
    static { _a = _RPCProtocolSymbol; }
    static { this.UNRESPONSIVE_TIME = 3 * 1000; } // 3s
    constructor(protocol, logger = null, transformer = null) {
        super();
        this[_a] = true;
        this._onDidChangeResponsiveState = this._register(new Emitter());
        this.onDidChangeResponsiveState = this._onDidChangeResponsiveState.event;
        this._protocol = protocol;
        this._logger = logger;
        this._uriTransformer = transformer;
        this._uriReplacer = createURIReplacer(this._uriTransformer);
        this._isDisposed = false;
        this._locals = [];
        this._proxies = [];
        for (let i = 0, len = ProxyIdentifier.count; i < len; i++) {
            this._locals[i] = null;
            this._proxies[i] = null;
        }
        this._lastMessageId = 0;
        this._cancelInvokedHandlers = Object.create(null);
        this._pendingRPCReplies = {};
        this._responsiveState = 0 /* ResponsiveState.Responsive */;
        this._unacknowledgedCount = 0;
        this._unresponsiveTime = 0;
        this._asyncCheckUresponsive = this._register(new RunOnceScheduler(() => this._checkUnresponsive(), 1000));
        this._register(this._protocol.onMessage((msg) => this._receiveOneMessage(msg)));
    }
    dispose() {
        this._isDisposed = true;
        // Release all outstanding promises with a canceled error
        Object.keys(this._pendingRPCReplies).forEach((msgId) => {
            const pending = this._pendingRPCReplies[msgId];
            delete this._pendingRPCReplies[msgId];
            pending.resolveErr(errors.canceled());
        });
        super.dispose();
    }
    drain() {
        if (typeof this._protocol.drain === 'function') {
            return this._protocol.drain();
        }
        return Promise.resolve();
    }
    _onWillSendRequest(req) {
        if (this._unacknowledgedCount === 0) {
            // Since this is the first request we are sending in a while,
            // mark this moment as the start for the countdown to unresponsive time
            this._unresponsiveTime = Date.now() + RPCProtocol.UNRESPONSIVE_TIME;
        }
        this._unacknowledgedCount++;
        if (!this._asyncCheckUresponsive.isScheduled()) {
            this._asyncCheckUresponsive.schedule();
        }
    }
    _onDidReceiveAcknowledge(req) {
        // The next possible unresponsive time is now + delta.
        this._unresponsiveTime = Date.now() + RPCProtocol.UNRESPONSIVE_TIME;
        this._unacknowledgedCount--;
        if (this._unacknowledgedCount === 0) {
            // No more need to check for unresponsive
            this._asyncCheckUresponsive.cancel();
        }
        // The ext host is responsive!
        this._setResponsiveState(0 /* ResponsiveState.Responsive */);
    }
    _checkUnresponsive() {
        if (this._unacknowledgedCount === 0) {
            // Not waiting for anything => cannot say if it is responsive or not
            return;
        }
        if (Date.now() > this._unresponsiveTime) {
            // Unresponsive!!
            this._setResponsiveState(1 /* ResponsiveState.Unresponsive */);
        }
        else {
            // Not (yet) unresponsive, be sure to check again soon
            this._asyncCheckUresponsive.schedule();
        }
    }
    _setResponsiveState(newResponsiveState) {
        if (this._responsiveState === newResponsiveState) {
            // no change
            return;
        }
        this._responsiveState = newResponsiveState;
        this._onDidChangeResponsiveState.fire(this._responsiveState);
    }
    get responsiveState() {
        return this._responsiveState;
    }
    transformIncomingURIs(obj) {
        if (!this._uriTransformer) {
            return obj;
        }
        return transformIncomingURIs(obj, this._uriTransformer);
    }
    getProxy(identifier) {
        const { nid: rpcId, sid } = identifier;
        if (!this._proxies[rpcId]) {
            this._proxies[rpcId] = this._createProxy(rpcId, sid);
        }
        return this._proxies[rpcId];
    }
    _createProxy(rpcId, debugName) {
        const handler = {
            get: (target, name) => {
                if (typeof name === 'string' && !target[name] && name.charCodeAt(0) === 36 /* CharCode.DollarSign */) {
                    target[name] = (...myArgs) => {
                        return this._remoteCall(rpcId, name, myArgs);
                    };
                }
                if (name === _RPCProxySymbol) {
                    return debugName;
                }
                return target[name];
            }
        };
        return new Proxy(Object.create(null), handler);
    }
    set(identifier, value) {
        this._locals[identifier.nid] = value;
        return value;
    }
    assertRegistered(identifiers) {
        for (let i = 0, len = identifiers.length; i < len; i++) {
            const identifier = identifiers[i];
            if (!this._locals[identifier.nid]) {
                throw new Error(`Missing proxy instance ${identifier.sid}`);
            }
        }
    }
    _receiveOneMessage(rawmsg) {
        if (this._isDisposed) {
            return;
        }
        const msgLength = rawmsg.byteLength;
        const buff = MessageBuffer.read(rawmsg, 0);
        const messageType = buff.readUInt8();
        const req = buff.readUInt32();
        switch (messageType) {
            case 1 /* MessageType.RequestJSONArgs */:
            case 2 /* MessageType.RequestJSONArgsWithCancellation */: {
                let { rpcId, method, args } = MessageIO.deserializeRequestJSONArgs(buff);
                if (this._uriTransformer) {
                    args = transformIncomingURIs(args, this._uriTransformer);
                }
                this._receiveRequest(msgLength, req, rpcId, method, args, (messageType === 2 /* MessageType.RequestJSONArgsWithCancellation */));
                break;
            }
            case 3 /* MessageType.RequestMixedArgs */:
            case 4 /* MessageType.RequestMixedArgsWithCancellation */: {
                let { rpcId, method, args } = MessageIO.deserializeRequestMixedArgs(buff);
                if (this._uriTransformer) {
                    args = transformIncomingURIs(args, this._uriTransformer);
                }
                this._receiveRequest(msgLength, req, rpcId, method, args, (messageType === 4 /* MessageType.RequestMixedArgsWithCancellation */));
                break;
            }
            case 5 /* MessageType.Acknowledged */: {
                this._logger?.logIncoming(msgLength, req, 0 /* RequestInitiator.LocalSide */, `ack`);
                this._onDidReceiveAcknowledge(req);
                break;
            }
            case 6 /* MessageType.Cancel */: {
                this._receiveCancel(msgLength, req);
                break;
            }
            case 7 /* MessageType.ReplyOKEmpty */: {
                this._receiveReply(msgLength, req, undefined);
                break;
            }
            case 9 /* MessageType.ReplyOKJSON */: {
                let value = MessageIO.deserializeReplyOKJSON(buff);
                if (this._uriTransformer) {
                    value = transformIncomingURIs(value, this._uriTransformer);
                }
                this._receiveReply(msgLength, req, value);
                break;
            }
            case 10 /* MessageType.ReplyOKJSONWithBuffers */: {
                const value = MessageIO.deserializeReplyOKJSONWithBuffers(buff, this._uriTransformer);
                this._receiveReply(msgLength, req, value);
                break;
            }
            case 8 /* MessageType.ReplyOKVSBuffer */: {
                const value = MessageIO.deserializeReplyOKVSBuffer(buff);
                this._receiveReply(msgLength, req, value);
                break;
            }
            case 11 /* MessageType.ReplyErrError */: {
                let err = MessageIO.deserializeReplyErrError(buff);
                if (this._uriTransformer) {
                    err = transformIncomingURIs(err, this._uriTransformer);
                }
                this._receiveReplyErr(msgLength, req, err);
                break;
            }
            case 12 /* MessageType.ReplyErrEmpty */: {
                this._receiveReplyErr(msgLength, req, undefined);
                break;
            }
            default:
                console.error(`received unexpected message`);
                console.error(rawmsg);
        }
    }
    _receiveRequest(msgLength, req, rpcId, method, args, usesCancellationToken) {
        this._logger?.logIncoming(msgLength, req, 1 /* RequestInitiator.OtherSide */, `receiveRequest ${getStringIdentifierForProxy(rpcId)}.${method}(`, args);
        const callId = String(req);
        let promise;
        let cancel;
        if (usesCancellationToken) {
            const cancellationTokenSource = new CancellationTokenSource();
            args.push(cancellationTokenSource.token);
            promise = this._invokeHandler(rpcId, method, args);
            cancel = () => cancellationTokenSource.cancel();
        }
        else {
            // cannot be cancelled
            promise = this._invokeHandler(rpcId, method, args);
            cancel = noop;
        }
        this._cancelInvokedHandlers[callId] = cancel;
        // Acknowledge the request
        const msg = MessageIO.serializeAcknowledged(req);
        this._logger?.logOutgoing(msg.byteLength, req, 1 /* RequestInitiator.OtherSide */, `ack`);
        this._protocol.send(msg);
        promise.then((r) => {
            delete this._cancelInvokedHandlers[callId];
            const msg = MessageIO.serializeReplyOK(req, r, this._uriReplacer);
            this._logger?.logOutgoing(msg.byteLength, req, 1 /* RequestInitiator.OtherSide */, `reply:`, r);
            this._protocol.send(msg);
        }, (err) => {
            delete this._cancelInvokedHandlers[callId];
            const msg = MessageIO.serializeReplyErr(req, err);
            this._logger?.logOutgoing(msg.byteLength, req, 1 /* RequestInitiator.OtherSide */, `replyErr:`, err);
            this._protocol.send(msg);
        });
    }
    _receiveCancel(msgLength, req) {
        this._logger?.logIncoming(msgLength, req, 1 /* RequestInitiator.OtherSide */, `receiveCancel`);
        const callId = String(req);
        this._cancelInvokedHandlers[callId]?.();
    }
    _receiveReply(msgLength, req, value) {
        this._logger?.logIncoming(msgLength, req, 0 /* RequestInitiator.LocalSide */, `receiveReply:`, value);
        const callId = String(req);
        if (!this._pendingRPCReplies.hasOwnProperty(callId)) {
            return;
        }
        const pendingReply = this._pendingRPCReplies[callId];
        delete this._pendingRPCReplies[callId];
        pendingReply.resolveOk(value);
    }
    _receiveReplyErr(msgLength, req, value) {
        this._logger?.logIncoming(msgLength, req, 0 /* RequestInitiator.LocalSide */, `receiveReplyErr:`, value);
        const callId = String(req);
        if (!this._pendingRPCReplies.hasOwnProperty(callId)) {
            return;
        }
        const pendingReply = this._pendingRPCReplies[callId];
        delete this._pendingRPCReplies[callId];
        let err = undefined;
        if (value) {
            if (value.$isError) {
                err = new Error();
                err.name = value.name;
                err.message = value.message;
                err.stack = value.stack;
            }
            else {
                err = value;
            }
        }
        pendingReply.resolveErr(err);
    }
    _invokeHandler(rpcId, methodName, args) {
        try {
            return Promise.resolve(this._doInvokeHandler(rpcId, methodName, args));
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    _doInvokeHandler(rpcId, methodName, args) {
        const actor = this._locals[rpcId];
        if (!actor) {
            throw new Error('Unknown actor ' + getStringIdentifierForProxy(rpcId));
        }
        const method = actor[methodName];
        if (typeof method !== 'function') {
            throw new Error('Unknown method ' + methodName + ' on actor ' + getStringIdentifierForProxy(rpcId));
        }
        return method.apply(actor, args);
    }
    _remoteCall(rpcId, methodName, args) {
        if (this._isDisposed) {
            return new CanceledLazyPromise();
        }
        let cancellationToken = null;
        if (args.length > 0 && CancellationToken.isCancellationToken(args[args.length - 1])) {
            cancellationToken = args.pop();
        }
        if (cancellationToken && cancellationToken.isCancellationRequested) {
            // No need to do anything...
            return Promise.reject(errors.canceled());
        }
        const serializedRequestArguments = MessageIO.serializeRequestArguments(args, this._uriReplacer);
        const req = ++this._lastMessageId;
        const callId = String(req);
        const result = new LazyPromise();
        const disposable = new DisposableStore();
        if (cancellationToken) {
            disposable.add(cancellationToken.onCancellationRequested(() => {
                const msg = MessageIO.serializeCancel(req);
                this._logger?.logOutgoing(msg.byteLength, req, 0 /* RequestInitiator.LocalSide */, `cancel`);
                this._protocol.send(msg);
            }));
        }
        this._pendingRPCReplies[callId] = new PendingRPCReply(result, disposable);
        this._onWillSendRequest(req);
        const msg = MessageIO.serializeRequest(req, rpcId, methodName, serializedRequestArguments, !!cancellationToken);
        this._logger?.logOutgoing(msg.byteLength, req, 0 /* RequestInitiator.LocalSide */, `request: ${getStringIdentifierForProxy(rpcId)}.${methodName}(`, args);
        this._protocol.send(msg);
        return result;
    }
}
class PendingRPCReply {
    constructor(_promise, _disposable) {
        this._promise = _promise;
        this._disposable = _disposable;
    }
    resolveOk(value) {
        this._promise.resolveOk(value);
        this._disposable.dispose();
    }
    resolveErr(err) {
        this._promise.resolveErr(err);
        this._disposable.dispose();
    }
}
class MessageBuffer {
    static alloc(type, req, messageSize) {
        const result = new MessageBuffer(VSBuffer.alloc(messageSize + 1 /* type */ + 4 /* req */), 0);
        result.writeUInt8(type);
        result.writeUInt32(req);
        return result;
    }
    static read(buff, offset) {
        return new MessageBuffer(buff, offset);
    }
    get buffer() {
        return this._buff;
    }
    constructor(buff, offset) {
        this._buff = buff;
        this._offset = offset;
    }
    static sizeUInt8() {
        return 1;
    }
    static { this.sizeUInt32 = 4; }
    writeUInt8(n) {
        this._buff.writeUInt8(n, this._offset);
        this._offset += 1;
    }
    readUInt8() {
        const n = this._buff.readUInt8(this._offset);
        this._offset += 1;
        return n;
    }
    writeUInt32(n) {
        this._buff.writeUInt32BE(n, this._offset);
        this._offset += 4;
    }
    readUInt32() {
        const n = this._buff.readUInt32BE(this._offset);
        this._offset += 4;
        return n;
    }
    static sizeShortString(str) {
        return 1 /* string length */ + str.byteLength /* actual string */;
    }
    writeShortString(str) {
        this._buff.writeUInt8(str.byteLength, this._offset);
        this._offset += 1;
        this._buff.set(str, this._offset);
        this._offset += str.byteLength;
    }
    readShortString() {
        const strByteLength = this._buff.readUInt8(this._offset);
        this._offset += 1;
        const strBuff = this._buff.slice(this._offset, this._offset + strByteLength);
        const str = strBuff.toString();
        this._offset += strByteLength;
        return str;
    }
    static sizeLongString(str) {
        return 4 /* string length */ + str.byteLength /* actual string */;
    }
    writeLongString(str) {
        this._buff.writeUInt32BE(str.byteLength, this._offset);
        this._offset += 4;
        this._buff.set(str, this._offset);
        this._offset += str.byteLength;
    }
    readLongString() {
        const strByteLength = this._buff.readUInt32BE(this._offset);
        this._offset += 4;
        const strBuff = this._buff.slice(this._offset, this._offset + strByteLength);
        const str = strBuff.toString();
        this._offset += strByteLength;
        return str;
    }
    writeBuffer(buff) {
        this._buff.writeUInt32BE(buff.byteLength, this._offset);
        this._offset += 4;
        this._buff.set(buff, this._offset);
        this._offset += buff.byteLength;
    }
    static sizeVSBuffer(buff) {
        return 4 /* buffer length */ + buff.byteLength /* actual buffer */;
    }
    writeVSBuffer(buff) {
        this._buff.writeUInt32BE(buff.byteLength, this._offset);
        this._offset += 4;
        this._buff.set(buff, this._offset);
        this._offset += buff.byteLength;
    }
    readVSBuffer() {
        const buffLength = this._buff.readUInt32BE(this._offset);
        this._offset += 4;
        const buff = this._buff.slice(this._offset, this._offset + buffLength);
        this._offset += buffLength;
        return buff;
    }
    static sizeMixedArray(arr) {
        let size = 0;
        size += 1; // arr length
        for (let i = 0, len = arr.length; i < len; i++) {
            const el = arr[i];
            size += 1; // arg type
            switch (el.type) {
                case 1 /* ArgType.String */:
                    size += this.sizeLongString(el.value);
                    break;
                case 2 /* ArgType.VSBuffer */:
                    size += this.sizeVSBuffer(el.value);
                    break;
                case 3 /* ArgType.SerializedObjectWithBuffers */:
                    size += this.sizeUInt32; // buffer count
                    size += this.sizeLongString(el.value);
                    for (let i = 0; i < el.buffers.length; ++i) {
                        size += this.sizeVSBuffer(el.buffers[i]);
                    }
                    break;
                case 4 /* ArgType.Undefined */:
                    // empty...
                    break;
            }
        }
        return size;
    }
    writeMixedArray(arr) {
        this._buff.writeUInt8(arr.length, this._offset);
        this._offset += 1;
        for (let i = 0, len = arr.length; i < len; i++) {
            const el = arr[i];
            switch (el.type) {
                case 1 /* ArgType.String */:
                    this.writeUInt8(1 /* ArgType.String */);
                    this.writeLongString(el.value);
                    break;
                case 2 /* ArgType.VSBuffer */:
                    this.writeUInt8(2 /* ArgType.VSBuffer */);
                    this.writeVSBuffer(el.value);
                    break;
                case 3 /* ArgType.SerializedObjectWithBuffers */:
                    this.writeUInt8(3 /* ArgType.SerializedObjectWithBuffers */);
                    this.writeUInt32(el.buffers.length);
                    this.writeLongString(el.value);
                    for (let i = 0; i < el.buffers.length; ++i) {
                        this.writeBuffer(el.buffers[i]);
                    }
                    break;
                case 4 /* ArgType.Undefined */:
                    this.writeUInt8(4 /* ArgType.Undefined */);
                    break;
            }
        }
    }
    readMixedArray() {
        const arrLen = this._buff.readUInt8(this._offset);
        this._offset += 1;
        const arr = new Array(arrLen);
        for (let i = 0; i < arrLen; i++) {
            const argType = this.readUInt8();
            switch (argType) {
                case 1 /* ArgType.String */:
                    arr[i] = this.readLongString();
                    break;
                case 2 /* ArgType.VSBuffer */:
                    arr[i] = this.readVSBuffer();
                    break;
                case 3 /* ArgType.SerializedObjectWithBuffers */: {
                    const bufferCount = this.readUInt32();
                    const jsonString = this.readLongString();
                    const buffers = [];
                    for (let i = 0; i < bufferCount; ++i) {
                        buffers.push(this.readVSBuffer());
                    }
                    arr[i] = new SerializableObjectWithBuffers(parseJsonAndRestoreBufferRefs(jsonString, buffers, null));
                    break;
                }
                case 4 /* ArgType.Undefined */:
                    arr[i] = undefined;
                    break;
            }
        }
        return arr;
    }
}
var SerializedRequestArgumentType;
(function (SerializedRequestArgumentType) {
    SerializedRequestArgumentType[SerializedRequestArgumentType["Simple"] = 0] = "Simple";
    SerializedRequestArgumentType[SerializedRequestArgumentType["Mixed"] = 1] = "Mixed";
})(SerializedRequestArgumentType || (SerializedRequestArgumentType = {}));
class MessageIO {
    static _useMixedArgSerialization(arr) {
        for (let i = 0, len = arr.length; i < len; i++) {
            if (arr[i] instanceof VSBuffer) {
                return true;
            }
            if (arr[i] instanceof SerializableObjectWithBuffers) {
                return true;
            }
            if (typeof arr[i] === 'undefined') {
                return true;
            }
        }
        return false;
    }
    static serializeRequestArguments(args, replacer) {
        if (this._useMixedArgSerialization(args)) {
            const massagedArgs = [];
            for (let i = 0, len = args.length; i < len; i++) {
                const arg = args[i];
                if (arg instanceof VSBuffer) {
                    massagedArgs[i] = { type: 2 /* ArgType.VSBuffer */, value: arg };
                }
                else if (typeof arg === 'undefined') {
                    massagedArgs[i] = { type: 4 /* ArgType.Undefined */ };
                }
                else if (arg instanceof SerializableObjectWithBuffers) {
                    const { jsonString, referencedBuffers } = stringifyJsonWithBufferRefs(arg.value, replacer);
                    massagedArgs[i] = { type: 3 /* ArgType.SerializedObjectWithBuffers */, value: VSBuffer.fromString(jsonString), buffers: referencedBuffers };
                }
                else {
                    massagedArgs[i] = { type: 1 /* ArgType.String */, value: VSBuffer.fromString(stringify(arg, replacer)) };
                }
            }
            return {
                type: 1 /* SerializedRequestArgumentType.Mixed */,
                args: massagedArgs,
            };
        }
        return {
            type: 0 /* SerializedRequestArgumentType.Simple */,
            args: stringify(args, replacer)
        };
    }
    static serializeRequest(req, rpcId, method, serializedArgs, usesCancellationToken) {
        switch (serializedArgs.type) {
            case 0 /* SerializedRequestArgumentType.Simple */:
                return this._requestJSONArgs(req, rpcId, method, serializedArgs.args, usesCancellationToken);
            case 1 /* SerializedRequestArgumentType.Mixed */:
                return this._requestMixedArgs(req, rpcId, method, serializedArgs.args, usesCancellationToken);
        }
    }
    static _requestJSONArgs(req, rpcId, method, args, usesCancellationToken) {
        const methodBuff = VSBuffer.fromString(method);
        const argsBuff = VSBuffer.fromString(args);
        let len = 0;
        len += MessageBuffer.sizeUInt8();
        len += MessageBuffer.sizeShortString(methodBuff);
        len += MessageBuffer.sizeLongString(argsBuff);
        const result = MessageBuffer.alloc(usesCancellationToken ? 2 /* MessageType.RequestJSONArgsWithCancellation */ : 1 /* MessageType.RequestJSONArgs */, req, len);
        result.writeUInt8(rpcId);
        result.writeShortString(methodBuff);
        result.writeLongString(argsBuff);
        return result.buffer;
    }
    static deserializeRequestJSONArgs(buff) {
        const rpcId = buff.readUInt8();
        const method = buff.readShortString();
        const args = buff.readLongString();
        return {
            rpcId: rpcId,
            method: method,
            args: JSON.parse(args)
        };
    }
    static _requestMixedArgs(req, rpcId, method, args, usesCancellationToken) {
        const methodBuff = VSBuffer.fromString(method);
        let len = 0;
        len += MessageBuffer.sizeUInt8();
        len += MessageBuffer.sizeShortString(methodBuff);
        len += MessageBuffer.sizeMixedArray(args);
        const result = MessageBuffer.alloc(usesCancellationToken ? 4 /* MessageType.RequestMixedArgsWithCancellation */ : 3 /* MessageType.RequestMixedArgs */, req, len);
        result.writeUInt8(rpcId);
        result.writeShortString(methodBuff);
        result.writeMixedArray(args);
        return result.buffer;
    }
    static deserializeRequestMixedArgs(buff) {
        const rpcId = buff.readUInt8();
        const method = buff.readShortString();
        const rawargs = buff.readMixedArray();
        const args = new Array(rawargs.length);
        for (let i = 0, len = rawargs.length; i < len; i++) {
            const rawarg = rawargs[i];
            if (typeof rawarg === 'string') {
                args[i] = JSON.parse(rawarg);
            }
            else {
                args[i] = rawarg;
            }
        }
        return {
            rpcId: rpcId,
            method: method,
            args: args
        };
    }
    static serializeAcknowledged(req) {
        return MessageBuffer.alloc(5 /* MessageType.Acknowledged */, req, 0).buffer;
    }
    static serializeCancel(req) {
        return MessageBuffer.alloc(6 /* MessageType.Cancel */, req, 0).buffer;
    }
    static serializeReplyOK(req, res, replacer) {
        if (typeof res === 'undefined') {
            return this._serializeReplyOKEmpty(req);
        }
        else if (res instanceof VSBuffer) {
            return this._serializeReplyOKVSBuffer(req, res);
        }
        else if (res instanceof SerializableObjectWithBuffers) {
            const { jsonString, referencedBuffers } = stringifyJsonWithBufferRefs(res.value, replacer, true);
            return this._serializeReplyOKJSONWithBuffers(req, jsonString, referencedBuffers);
        }
        else {
            return this._serializeReplyOKJSON(req, safeStringify(res, replacer));
        }
    }
    static _serializeReplyOKEmpty(req) {
        return MessageBuffer.alloc(7 /* MessageType.ReplyOKEmpty */, req, 0).buffer;
    }
    static _serializeReplyOKVSBuffer(req, res) {
        let len = 0;
        len += MessageBuffer.sizeVSBuffer(res);
        const result = MessageBuffer.alloc(8 /* MessageType.ReplyOKVSBuffer */, req, len);
        result.writeVSBuffer(res);
        return result.buffer;
    }
    static deserializeReplyOKVSBuffer(buff) {
        return buff.readVSBuffer();
    }
    static _serializeReplyOKJSON(req, res) {
        const resBuff = VSBuffer.fromString(res);
        let len = 0;
        len += MessageBuffer.sizeLongString(resBuff);
        const result = MessageBuffer.alloc(9 /* MessageType.ReplyOKJSON */, req, len);
        result.writeLongString(resBuff);
        return result.buffer;
    }
    static _serializeReplyOKJSONWithBuffers(req, res, buffers) {
        const resBuff = VSBuffer.fromString(res);
        let len = 0;
        len += MessageBuffer.sizeUInt32; // buffer count
        len += MessageBuffer.sizeLongString(resBuff);
        for (const buffer of buffers) {
            len += MessageBuffer.sizeVSBuffer(buffer);
        }
        const result = MessageBuffer.alloc(10 /* MessageType.ReplyOKJSONWithBuffers */, req, len);
        result.writeUInt32(buffers.length);
        result.writeLongString(resBuff);
        for (const buffer of buffers) {
            result.writeBuffer(buffer);
        }
        return result.buffer;
    }
    static deserializeReplyOKJSON(buff) {
        const res = buff.readLongString();
        return JSON.parse(res);
    }
    static deserializeReplyOKJSONWithBuffers(buff, uriTransformer) {
        const bufferCount = buff.readUInt32();
        const res = buff.readLongString();
        const buffers = [];
        for (let i = 0; i < bufferCount; ++i) {
            buffers.push(buff.readVSBuffer());
        }
        return new SerializableObjectWithBuffers(parseJsonAndRestoreBufferRefs(res, buffers, uriTransformer));
    }
    static serializeReplyErr(req, err) {
        const errStr = (err ? safeStringify(errors.transformErrorForSerialization(err), null) : undefined);
        if (typeof errStr !== 'string') {
            return this._serializeReplyErrEmpty(req);
        }
        const errBuff = VSBuffer.fromString(errStr);
        let len = 0;
        len += MessageBuffer.sizeLongString(errBuff);
        const result = MessageBuffer.alloc(11 /* MessageType.ReplyErrError */, req, len);
        result.writeLongString(errBuff);
        return result.buffer;
    }
    static deserializeReplyErrError(buff) {
        const err = buff.readLongString();
        return JSON.parse(err);
    }
    static _serializeReplyErrEmpty(req) {
        return MessageBuffer.alloc(12 /* MessageType.ReplyErrEmpty */, req, 0).buffer;
    }
}
var MessageType;
(function (MessageType) {
    MessageType[MessageType["RequestJSONArgs"] = 1] = "RequestJSONArgs";
    MessageType[MessageType["RequestJSONArgsWithCancellation"] = 2] = "RequestJSONArgsWithCancellation";
    MessageType[MessageType["RequestMixedArgs"] = 3] = "RequestMixedArgs";
    MessageType[MessageType["RequestMixedArgsWithCancellation"] = 4] = "RequestMixedArgsWithCancellation";
    MessageType[MessageType["Acknowledged"] = 5] = "Acknowledged";
    MessageType[MessageType["Cancel"] = 6] = "Cancel";
    MessageType[MessageType["ReplyOKEmpty"] = 7] = "ReplyOKEmpty";
    MessageType[MessageType["ReplyOKVSBuffer"] = 8] = "ReplyOKVSBuffer";
    MessageType[MessageType["ReplyOKJSON"] = 9] = "ReplyOKJSON";
    MessageType[MessageType["ReplyOKJSONWithBuffers"] = 10] = "ReplyOKJSONWithBuffers";
    MessageType[MessageType["ReplyErrError"] = 11] = "ReplyErrError";
    MessageType[MessageType["ReplyErrEmpty"] = 12] = "ReplyErrEmpty";
})(MessageType || (MessageType = {}));
var ArgType;
(function (ArgType) {
    ArgType[ArgType["String"] = 1] = "String";
    ArgType[ArgType["VSBuffer"] = 2] = "VSBuffer";
    ArgType[ArgType["SerializedObjectWithBuffers"] = 3] = "SerializedObjectWithBuffers";
    ArgType[ArgType["Undefined"] = 4] = "Undefined";
})(ArgType || (ArgType = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnBjUHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL3JwY1Byb3RvY29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdoRyxPQUFPLEVBQW1CLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFM0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSwyQkFBMkIsRUFBeUIsZUFBZSxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFNMUksU0FBUyxhQUFhLENBQUMsR0FBUSxFQUFFLFFBQXNDO0lBQ3RFLElBQUksQ0FBQztRQUNKLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQW9DLFFBQVEsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQztBQUNoQyxNQUFNLFlB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