/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError, transformErrorForSerialization } from '../errors.js';
import { Emitter } from '../event.js';
import { Disposable } from '../lifecycle.js';
import { isWeb } from '../platform.js';
import * as strings from '../strings.js';
const DEFAULT_CHANNEL = 'default';
const INITIALIZE = '$initialize';
let webWorkerWarningLogged = false;
export function logOnceWebWorkerWarning(err) {
    if (!isWeb) {
        // running tests
        return;
    }
    if (!webWorkerWarningLogged) {
        webWorkerWarningLogged = true;
        console.warn('Could not create web worker(s). Falling back to loading web worker code in main thread, which might cause UI freezes. Please see https://github.com/microsoft/monaco-editor#faq');
    }
    console.warn(err.message);
}
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Request"] = 0] = "Request";
    MessageType[MessageType["Reply"] = 1] = "Reply";
    MessageType[MessageType["SubscribeEvent"] = 2] = "SubscribeEvent";
    MessageType[MessageType["Event"] = 3] = "Event";
    MessageType[MessageType["UnsubscribeEvent"] = 4] = "UnsubscribeEvent";
})(MessageType || (MessageType = {}));
class RequestMessage {
    constructor(vsWorker, req, channel, method, args) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.channel = channel;
        this.method = method;
        this.args = args;
        this.type = 0 /* MessageType.Request */;
    }
}
class ReplyMessage {
    constructor(vsWorker, seq, res, err) {
        this.vsWorker = vsWorker;
        this.seq = seq;
        this.res = res;
        this.err = err;
        this.type = 1 /* MessageType.Reply */;
    }
}
class SubscribeEventMessage {
    constructor(vsWorker, req, channel, eventName, arg) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.channel = channel;
        this.eventName = eventName;
        this.arg = arg;
        this.type = 2 /* MessageType.SubscribeEvent */;
    }
}
class EventMessage {
    constructor(vsWorker, req, event) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.event = event;
        this.type = 3 /* MessageType.Event */;
    }
}
class UnsubscribeEventMessage {
    constructor(vsWorker, req) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.type = 4 /* MessageType.UnsubscribeEvent */;
    }
}
class WebWorkerProtocol {
    constructor(handler) {
        this._workerId = -1;
        this._handler = handler;
        this._lastSentReq = 0;
        this._pendingReplies = Object.create(null);
        this._pendingEmitters = new Map();
        this._pendingEvents = new Map();
    }
    setWorkerId(workerId) {
        this._workerId = workerId;
    }
    sendMessage(channel, method, args) {
        const req = String(++this._lastSentReq);
        return new Promise((resolve, reject) => {
            this._pendingReplies[req] = {
                resolve: resolve,
                reject: reject
            };
            this._send(new RequestMessage(this._workerId, req, channel, method, args));
        });
    }
    listen(channel, eventName, arg) {
        let req = null;
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                req = String(++this._lastSentReq);
                this._pendingEmitters.set(req, emitter);
                this._send(new SubscribeEventMessage(this._workerId, req, channel, eventName, arg));
            },
            onDidRemoveLastListener: () => {
                this._pendingEmitters.delete(req);
                this._send(new UnsubscribeEventMessage(this._workerId, req));
                req = null;
            }
        });
        return emitter.event;
    }
    handleMessage(message) {
        if (!message || !message.vsWorker) {
            return;
        }
        if (this._workerId !== -1 && message.vsWorker !== this._workerId) {
            return;
        }
        this._handleMessage(message);
    }
    createProxyToRemoteChannel(channel, sendMessageBarrier) {
        const handler = {
            get: (target, name) => {
                if (typeof name === 'string' && !target[name]) {
                    if (propertyIsDynamicEvent(name)) { // onDynamic...
                        target[name] = (arg) => {
                            return this.listen(channel, name, arg);
                        };
                    }
                    else if (propertyIsEvent(name)) { // on...
                        target[name] = this.listen(channel, name, undefined);
                    }
                    else if (name.charCodeAt(0) === 36 /* CharCode.DollarSign */) { // $...
                        target[name] = async (...myArgs) => {
                            await sendMessageBarrier?.();
                            return this.sendMessage(channel, name, myArgs);
                        };
                    }
                }
                return target[name];
            }
        };
        return new Proxy(Object.create(null), handler);
    }
    _handleMessage(msg) {
        switch (msg.type) {
            case 1 /* MessageType.Reply */:
                return this._handleReplyMessage(msg);
            case 0 /* MessageType.Request */:
                return this._handleRequestMessage(msg);
            case 2 /* MessageType.SubscribeEvent */:
                return this._handleSubscribeEventMessage(msg);
            case 3 /* MessageType.Event */:
                return this._handleEventMessage(msg);
            case 4 /* MessageType.UnsubscribeEvent */:
                return this._handleUnsubscribeEventMessage(msg);
        }
    }
    _handleReplyMessage(replyMessage) {
        if (!this._pendingReplies[replyMessage.seq]) {
            console.warn('Got reply to unknown seq');
            return;
        }
        const reply = this._pendingReplies[replyMessage.seq];
        delete this._pendingReplies[replyMessage.seq];
        if (replyMessage.err) {
            let err = replyMessage.err;
            if (replyMessage.err.$isError) {
                err = new Error();
                err.name = replyMessage.err.name;
                err.message = replyMessage.err.message;
                err.stack = replyMessage.err.stack;
            }
            reply.reject(err);
            return;
        }
        reply.resolve(replyMessage.res);
    }
    _handleRequestMessage(requestMessage) {
        const req = requestMessage.req;
        const result = this._handler.handleMessage(requestMessage.channel, requestMessage.method, requestMessage.args);
        result.then((r) => {
            this._send(new ReplyMessage(this._workerId, req, r, undefined));
        }, (e) => {
            if (e.detail instanceof Error) {
                // Loading errors have a detail property that points to the actual error
                e.detail = transformErrorForSerialization(e.detail);
            }
            this._send(new ReplyMessage(this._workerId, req, undefined, transformErrorForSerialization(e)));
        });
    }
    _handleSubscribeEventMessage(msg) {
        const req = msg.req;
        const disposable = this._handler.handleEvent(msg.channel, msg.eventName, msg.arg)((event) => {
            this._send(new EventMessage(this._workerId, req, event));
        });
        this._pendingEvents.set(req, disposable);
    }
    _handleEventMessage(msg) {
        if (!this._pendingEmitters.has(msg.req)) {
            console.warn('Got event for unknown req');
            return;
        }
        this._pendingEmitters.get(msg.req).fire(msg.event);
    }
    _handleUnsubscribeEventMessage(msg) {
        if (!this._pendingEvents.has(msg.req)) {
            console.warn('Got unsubscribe for unknown req');
            return;
        }
        this._pendingEvents.get(msg.req).dispose();
        this._pendingEvents.delete(msg.req);
    }
    _send(msg) {
        const transfer = [];
        if (msg.type === 0 /* MessageType.Request */) {
            for (let i = 0; i < msg.args.length; i++) {
                if (msg.args[i] instanceof ArrayBuffer) {
                    transfer.push(msg.args[i]);
                }
            }
        }
        else if (msg.type === 1 /* MessageType.Reply */) {
            if (msg.res instanceof ArrayBuffer) {
                transfer.push(msg.res);
            }
        }
        this._handler.sendMessage(msg, transfer);
    }
}
/**
 * Main thread side
 */
export class WebWorkerClient extends Disposable {
    constructor(worker) {
        super();
        this._localChannels = new Map();
        this._remoteChannels = new Map();
        this._worker = worker;
        this._register(this._worker.onMessage((msg) => {
            this._protocol.handleMessage(msg);
        }));
        this._register(this._worker.onError((err) => {
            logOnceWebWorkerWarning(err);
            onUnexpectedError(err);
        }));
        this._protocol = new WebWorkerProtocol({
            sendMessage: (msg, transfer) => {
                this._worker.postMessage(msg, transfer);
            },
            handleMessage: (channel, method, args) => {
                return this._handleMessage(channel, method, args);
            },
            handleEvent: (channel, eventName, arg) => {
                return this._handleEvent(channel, eventName, arg);
            }
        });
        this._protocol.setWorkerId(this._worker.getId());
        // Send initialize message
        this._onModuleLoaded = this._protocol.sendMessage(DEFAULT_CHANNEL, INITIALIZE, [
            this._worker.getId(),
        ]);
        this.proxy = this._protocol.createProxyToRemoteChannel(DEFAULT_CHANNEL, async () => { await this._onModuleLoaded; });
        this._onModuleLoaded.catch((e) => {
            this._onError('Worker failed to load ', e);
        });
    }
    _handleMessage(channelName, method, args) {
        const channel = this._localChannels.get(channelName);
        if (!channel) {
            return Promise.reject(new Error(`Missing channel ${channelName} on main thread`));
        }
        if (typeof channel[method] !== 'function') {
            return Promise.reject(new Error(`Missing method ${method} on main thread channel ${channelName}`));
        }
        try {
            return Promise.resolve(channel[method].apply(channel, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    _handleEvent(channelName, eventName, arg) {
        const channel = this._localChannels.get(channelName);
        if (!channel) {
            throw new Error(`Missing channel ${channelName} on main thread`);
        }
        if (propertyIsDynamicEvent(eventName)) {
            const event = channel[eventName].call(channel, arg);
            if (typeof event !== 'function') {
                throw new Error(`Missing dynamic event ${eventName} on main thread channel ${channelName}.`);
            }
            return event;
        }
        if (propertyIsEvent(eventName)) {
            const event = channel[eventName];
            if (typeof event !== 'function') {
                throw new Error(`Missing event ${eventName} on main thread channel ${channelName}.`);
            }
            return event;
        }
        throw new Error(`Malformed event name ${eventName}`);
    }
    setChannel(channel, handler) {
        this._localChannels.set(channel, handler);
    }
    getChannel(channel) {
        if (!this._remoteChannels.has(channel)) {
            const inst = this._protocol.createProxyToRemoteChannel(channel, async () => { await this._onModuleLoaded; });
            this._remoteChannels.set(channel, inst);
        }
        return this._remoteChannels.get(channel);
    }
    _onError(message, error) {
        console.error(message);
        console.info(error);
    }
}
function propertyIsEvent(name) {
    // Assume a property is an event if it has a form of "onSomething"
    return name[0] === 'o' && name[1] === 'n' && strings.isUpperAsciiLetter(name.charCodeAt(2));
}
function propertyIsDynamicEvent(name) {
    // Assume a property is a dynamic event (a method that returns an event) if it has a form of "onDynamicSomething"
    return /^onDynamic/.test(name) && strings.isUpperAsciiLetter(name.charCodeAt(9));
}
/**
 * Worker side
 */
export class WebWorkerServer {
    constructor(postMessage, requestHandlerFactory) {
        this._localChannels = new Map();
        this._remoteChannels = new Map();
        this._protocol = new WebWorkerProtocol({
            sendMessage: (msg, transfer) => {
                postMessage(msg, transfer);
            },
            handleMessage: (channel, method, args) => this._handleMessage(channel, method, args),
            handleEvent: (channel, eventName, arg) => this._handleEvent(channel, eventName, arg)
        });
        this.requestHandler = requestHandlerFactory(this);
    }
    onmessage(msg) {
        this._protocol.handleMessage(msg);
    }
    _handleMessage(channel, method, args) {
        if (channel === DEFAULT_CHANNEL && method === INITIALIZE) {
            return this.initialize(args[0]);
        }
        const requestHandler = (channel === DEFAULT_CHANNEL ? this.requestHandler : this._localChannels.get(channel));
        if (!requestHandler) {
            return Promise.reject(new Error(`Missing channel ${channel} on worker thread`));
        }
        if (typeof requestHandler[method] !== 'function') {
            return Promise.reject(new Error(`Missing method ${method} on worker thread channel ${channel}`));
        }
        try {
            return Promise.resolve(requestHandler[method].apply(requestHandler, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    _handleEvent(channel, eventName, arg) {
        const requestHandler = (channel === DEFAULT_CHANNEL ? this.requestHandler : this._localChannels.get(channel));
        if (!requestHandler) {
            throw new Error(`Missing channel ${channel} on worker thread`);
        }
        if (propertyIsDynamicEvent(eventName)) {
            const event = requestHandler[eventName].call(requestHandler, arg);
            if (typeof event !== 'function') {
                throw new Error(`Missing dynamic event ${eventName} on request handler.`);
            }
            return event;
        }
        if (propertyIsEvent(eventName)) {
            const event = requestHandler[eventName];
            if (typeof event !== 'function') {
                throw new Error(`Missing event ${eventName} on request handler.`);
            }
            return event;
        }
        throw new Error(`Malformed event name ${eventName}`);
    }
    setChannel(channel, handler) {
        this._localChannels.set(channel, handler);
    }
    getChannel(channel) {
        if (!this._remoteChannels.has(channel)) {
            const inst = this._protocol.createProxyToRemoteChannel(channel);
            this._remoteChannels.set(channel, inst);
        }
        return this._remoteChannels.get(channel);
    }
    async initialize(workerId) {
        this._protocol.setWorkerId(workerId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3dvcmtlci93ZWJXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxhQUFhLENBQUM7QUFDN0MsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLGlCQUFpQixDQUFDO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN2QyxPQUFPLEtBQUssT0FBTyxNQUFNLGVBQWUsQ0FBQztBQUV6QyxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUM7QUFDbEMsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDO0FBU2pDLElBQUksc0JBQXNCLEdBQUcsS0FBSyxDQUFDO0FBQ25DLE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxHQUFRO0lBQy9DLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNaLGdCQUFnQjtRQUNoQixPQUFPO0lBQ1IsQ0FBQztJQUNELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzdCLHNCQUFzQixHQUFHLElBQUksQ0FBQztRQUM5QixPQUFPLENBQUMsSUFBSSxDQUFDLGlMQUFpTCxDQUFDLENBQUM7SUFDak0sQ0FBQztJQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFFRCxJQUFXLFdBTVY7QUFORCxXQUFXLFdBQVc7SUFDckIsbURBQU8sQ0FBQTtJQUNQLCtDQUFLLENBQUE7SUFDTCxpRUFBYyxDQUFBO0lBQ2QsK0NBQUssQ0FBQTtJQUNMLHFFQUFnQixDQUFBO0FB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