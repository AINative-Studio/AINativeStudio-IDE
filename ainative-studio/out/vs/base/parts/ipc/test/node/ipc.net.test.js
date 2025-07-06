/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import sinon from 'sinon';
import { EventEmitter } from 'events';
import { connect, createServer } from 'net';
import { tmpdir } from 'os';
import { Barrier, timeout } from '../../../../common/async.js';
import { VSBuffer } from '../../../../common/buffer.js';
import { Emitter, Event } from '../../../../common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../common/lifecycle.js';
import { PersistentProtocol, Protocol } from '../../common/ipc.net.js';
import { createRandomIPCHandle, createStaticIPCHandle, NodeSocket, WebSocketNodeSocket } from '../../node/ipc.net.js';
import { flakySuite } from '../../../../test/common/testUtils.js';
import { runWithFakedTimers } from '../../../../test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
class MessageStream extends Disposable {
    constructor(x) {
        super();
        this._currentComplete = null;
        this._messages = [];
        this._register(x.onMessage(data => {
            this._messages.push(data);
            this._trigger();
        }));
    }
    _trigger() {
        if (!this._currentComplete) {
            return;
        }
        if (this._messages.length === 0) {
            return;
        }
        const complete = this._currentComplete;
        const msg = this._messages.shift();
        this._currentComplete = null;
        complete(msg);
    }
    waitForOne() {
        return new Promise((complete) => {
            this._currentComplete = complete;
            this._trigger();
        });
    }
}
class EtherStream extends EventEmitter {
    constructor(_ether, _name) {
        super();
        this._ether = _ether;
        this._name = _name;
    }
    write(data, cb) {
        if (!Buffer.isBuffer(data)) {
            throw new Error(`Invalid data`);
        }
        this._ether.write(this._name, data);
        return true;
    }
    destroy() {
    }
}
class Ether {
    get a() {
        return this._a;
    }
    get b() {
        return this._b;
    }
    constructor(_wireLatency = 0) {
        this._wireLatency = _wireLatency;
        this._a = new EtherStream(this, 'a');
        this._b = new EtherStream(this, 'b');
        this._ab = [];
        this._ba = [];
    }
    write(from, data) {
        setTimeout(() => {
            if (from === 'a') {
                this._ab.push(data);
            }
            else {
                this._ba.push(data);
            }
            setTimeout(() => this._deliver(), 0);
        }, this._wireLatency);
    }
    _deliver() {
        if (this._ab.length > 0) {
            const data = Buffer.concat(this._ab);
            this._ab.length = 0;
            this._b.emit('data', data);
            setTimeout(() => this._deliver(), 0);
            return;
        }
        if (this._ba.length > 0) {
            const data = Buffer.concat(this._ba);
            this._ba.length = 0;
            this._a.emit('data', data);
            setTimeout(() => this._deliver(), 0);
            return;
        }
    }
}
suite('IPC, Socket Protocol', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let ether;
    setup(() => {
        ether = new Ether();
    });
    test('read/write', async () => {
        const a = new Protocol(new NodeSocket(ether.a));
        const b = new Protocol(new NodeSocket(ether.b));
        const bMessages = new MessageStream(b);
        a.send(VSBuffer.fromString('foobarfarboo'));
        const msg1 = await bMessages.waitForOne();
        assert.strictEqual(msg1.toString(), 'foobarfarboo');
        const buffer = VSBuffer.alloc(1);
        buffer.writeUInt8(123, 0);
        a.send(buffer);
        const msg2 = await bMessages.waitForOne();
        assert.strictEqual(msg2.readUInt8(0), 123);
        bMessages.dispose();
        a.dispose();
        b.dispose();
    });
    test('read/write, object data', async () => {
        const a = new Protocol(new NodeSocket(ether.a));
        const b = new Protocol(new NodeSocket(ether.b));
        const bMessages = new MessageStream(b);
        const data = {
            pi: Math.PI,
            foo: 'bar',
            more: true,
            data: 'Hello World'.split('')
        };
        a.send(VSBuffer.fromString(JSON.stringify(data)));
        const msg = await bMessages.waitForOne();
        assert.deepStrictEqual(JSON.parse(msg.toString()), data);
        bMessages.dispose();
        a.dispose();
        b.dispose();
    });
    test('issue #211462: destroy socket after end timeout', async () => {
        const socket = new EventEmitter();
        Object.assign(socket, { destroy: () => socket.emit('close') });
        const protocol = ds.add(new Protocol(new NodeSocket(socket)));
        const disposed = sinon.stub();
        const timers = sinon.useFakeTimers();
        ds.add(toDisposable(() => timers.restore()));
        ds.add(protocol.onDidDispose(disposed));
        socket.emit('end');
        assert.ok(!disposed.called);
        timers.tick(29_999);
        assert.ok(!disposed.called);
        timers.tick(1);
        assert.ok(disposed.called);
    });
});
suite('PersistentProtocol reconnection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('acks get piggybacked with messages', async () => {
        const ether = new Ether();
        const a = new PersistentProtocol({ socket: new NodeSocket(ether.a) });
        const aMessages = new MessageStream(a);
        const b = new PersistentProtocol({ socket: new NodeSocket(ether.b) });
        const bMessages = new MessageStream(b);
        a.send(VSBuffer.fromString('a1'));
        assert.strictEqual(a.unacknowledgedCount, 1);
        assert.strictEqual(b.unacknowledgedCount, 0);
        a.send(VSBuffer.fromString('a2'));
        assert.strictEqual(a.unacknowledgedCount, 2);
        assert.strictEqual(b.unacknowledgedCount, 0);
        a.send(VSBuffer.fromString('a3'));
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 0);
        const a1 = await bMessages.waitForOne();
        assert.strictEqual(a1.toString(), 'a1');
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 0);
        const a2 = await bMessages.waitForOne();
        assert.strictEqual(a2.toString(), 'a2');
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 0);
        const a3 = await bMessages.waitForOne();
        assert.strictEqual(a3.toString(), 'a3');
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 0);
        b.send(VSBuffer.fromString('b1'));
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 1);
        const b1 = await aMessages.waitForOne();
        assert.strictEqual(b1.toString(), 'b1');
        assert.strictEqual(a.unacknowledgedCount, 0);
        assert.strictEqual(b.unacknowledgedCount, 1);
        a.send(VSBuffer.fromString('a4'));
        assert.strictEqual(a.unacknowledgedCount, 1);
        assert.strictEqual(b.unacknowledgedCount, 1);
        const b2 = await bMessages.waitForOne();
        assert.strictEqual(b2.toString(), 'a4');
        assert.strictEqual(a.unacknowledgedCount, 1);
        assert.strictEqual(b.unacknowledgedCount, 0);
        aMessages.dispose();
        bMessages.dispose();
        a.dispose();
        b.dispose();
    });
    test('ack gets sent after a while', async () => {
        await runWithFakedTimers({ useFakeTimers: true, maxTaskCount: 100 }, async () => {
            const loadEstimator = {
                hasHighLoad: () => false
            };
            const ether = new Ether();
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator });
            const bMessages = new MessageStream(b);
            // send one message A -> B
            a.send(VSBuffer.fromString('a1'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            const a1 = await bMessages.waitForOne();
            assert.strictEqual(a1.toString(), 'a1');
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // wait for ack to arrive B -> A
            await timeout(2 * 2000 /* ProtocolConstants.AcknowledgeTime */);
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 0);
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
    test('messages that are never written to a socket should not cause an ack timeout', async () => {
        await runWithFakedTimers({
            useFakeTimers: true,
            useSetImmediate: true,
            maxTaskCount: 1000
        }, async () => {
            // Date.now() in fake timers starts at 0, which is very inconvenient
            // since we want to test exactly that a certain field is not initialized with Date.now()
            // As a workaround we wait such that Date.now() starts producing more realistic values
            await timeout(60 * 60 * 1000);
            const loadEstimator = {
                hasHighLoad: () => false
            };
            const ether = new Ether();
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator, sendKeepAlive: false });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator, sendKeepAlive: false });
            const bMessages = new MessageStream(b);
            // send message a1 before reconnection to get _recvAckCheck() scheduled
            a.send(VSBuffer.fromString('a1'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // read message a1 at B
            const a1 = await bMessages.waitForOne();
            assert.strictEqual(a1.toString(), 'a1');
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // send message b1 to send the ack for a1
            b.send(VSBuffer.fromString('b1'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 1);
            // read message b1 at A to receive the ack for a1
            const b1 = await aMessages.waitForOne();
            assert.strictEqual(b1.toString(), 'b1');
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 1);
            // begin reconnection
            aSocket.dispose();
            const aSocket2 = new NodeSocket(ether.a);
            a.beginAcceptReconnection(aSocket2, null);
            let timeoutListenerCalled = false;
            const socketTimeoutListener = a.onSocketTimeout(() => {
                timeoutListenerCalled = true;
            });
            // send message 2 during reconnection
            a.send(VSBuffer.fromString('a2'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 1);
            // wait for scheduled _recvAckCheck() to execute
            await timeout(2 * 20000 /* ProtocolConstants.TimeoutTime */);
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 1);
            assert.strictEqual(timeoutListenerCalled, false);
            a.endAcceptReconnection();
            assert.strictEqual(timeoutListenerCalled, false);
            await timeout(2 * 20000 /* ProtocolConstants.TimeoutTime */);
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 0);
            assert.strictEqual(timeoutListenerCalled, false);
            socketTimeoutListener.dispose();
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
    test('acks are always sent after a reconnection', async () => {
        await runWithFakedTimers({
            useFakeTimers: true,
            useSetImmediate: true,
            maxTaskCount: 1000
        }, async () => {
            const loadEstimator = {
                hasHighLoad: () => false
            };
            const wireLatency = 1000;
            const ether = new Ether(wireLatency);
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator });
            const bMessages = new MessageStream(b);
            // send message a1 to have something unacknowledged
            a.send(VSBuffer.fromString('a1'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // read message a1 at B
            const a1 = await bMessages.waitForOne();
            assert.strictEqual(a1.toString(), 'a1');
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // wait for B to send an ACK message,
            // but resume before A receives it
            await timeout(2000 /* ProtocolConstants.AcknowledgeTime */ + wireLatency / 2);
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // simulate complete reconnection
            aSocket.dispose();
            bSocket.dispose();
            const ether2 = new Ether(wireLatency);
            const aSocket2 = new NodeSocket(ether2.a);
            const bSocket2 = new NodeSocket(ether2.b);
            b.beginAcceptReconnection(bSocket2, null);
            b.endAcceptReconnection();
            a.beginAcceptReconnection(aSocket2, null);
            a.endAcceptReconnection();
            // wait for quite some time
            await timeout(2 * 2000 /* ProtocolConstants.AcknowledgeTime */ + wireLatency);
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 0);
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
    test('onSocketTimeout is emitted at most once every 20s', async () => {
        await runWithFakedTimers({
            useFakeTimers: true,
            useSetImmediate: true,
            maxTaskCount: 1000
        }, async () => {
            const loadEstimator = {
                hasHighLoad: () => false
            };
            const ether = new Ether();
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator });
            const bMessages = new MessageStream(b);
            // never receive acks
            b.pauseSocketWriting();
            // send message a1 to have something unacknowledged
            a.send(VSBuffer.fromString('a1'));
            // wait for the first timeout to fire
            await Event.toPromise(a.onSocketTimeout);
            let timeoutFiredAgain = false;
            const timeoutListener = a.onSocketTimeout(() => {
                timeoutFiredAgain = true;
            });
            // send more messages
            a.send(VSBuffer.fromString('a2'));
            a.send(VSBuffer.fromString('a3'));
            // wait for 10s
            await timeout(20000 /* ProtocolConstants.TimeoutTime */ / 2);
            assert.strictEqual(timeoutFiredAgain, false);
            timeoutListener.dispose();
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
    test('writing can be paused', async () => {
        await runWithFakedTimers({ useFakeTimers: true, maxTaskCount: 100 }, async () => {
            const loadEstimator = {
                hasHighLoad: () => false
            };
            const ether = new Ether();
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator });
            const bMessages = new MessageStream(b);
            // send one message A -> B
            a.send(VSBuffer.fromString('a1'));
            const a1 = await bMessages.waitForOne();
            assert.strictEqual(a1.toString(), 'a1');
            // ask A to pause writing
            b.sendPause();
            // send a message B -> A
            b.send(VSBuffer.fromString('b1'));
            const b1 = await aMessages.waitForOne();
            assert.strictEqual(b1.toString(), 'b1');
            // send a message A -> B (this should be blocked at A)
            a.send(VSBuffer.fromString('a2'));
            // wait a long time and check that not even acks are written
            await timeout(2 * 2000 /* ProtocolConstants.AcknowledgeTime */);
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 1);
            // ask A to resume writing
            b.sendResume();
            // check that B receives message
            const a2 = await bMessages.waitForOne();
            assert.strictEqual(a2.toString(), 'a2');
            // wait a long time and check that acks are written
            await timeout(2 * 2000 /* ProtocolConstants.AcknowledgeTime */);
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 0);
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
});
flakySuite('IPC, create handle', () => {
    test('createRandomIPCHandle', async () => {
        return testIPCHandle(createRandomIPCHandle());
    });
    test('createStaticIPCHandle', async () => {
        return testIPCHandle(createStaticIPCHandle(tmpdir(), 'test', '1.64.0'));
    });
    function testIPCHandle(handle) {
        return new Promise((resolve, reject) => {
            const pipeName = createRandomIPCHandle();
            const server = createServer();
            server.on('error', () => {
                return new Promise(() => server.close(() => reject()));
            });
            server.listen(pipeName, () => {
                server.removeListener('error', reject);
                return new Promise(() => {
                    server.close(() => resolve());
                });
            });
        });
    }
});
suite('WebSocketNodeSocket', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    function toUint8Array(data) {
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i];
        }
        return result;
    }
    function fromUint8Array(data) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i];
        }
        return result;
    }
    function fromCharCodeArray(data) {
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data[i]);
        }
        return result;
    }
    class FakeNodeSocket extends Disposable {
        traceSocketEvent(type, data) {
        }
        constructor() {
            super();
            this._onData = new Emitter();
            this.onData = this._onData.event;
            this._onClose = new Emitter();
            this.onClose = this._onClose.event;
            this.writtenData = [];
        }
        write(data) {
            this.writtenData.push(data);
        }
        fireData(data) {
            this._onData.fire(VSBuffer.wrap(toUint8Array(data)));
        }
    }
    async function testReading(frames, permessageDeflate) {
        const disposables = new DisposableStore();
        const socket = new FakeNodeSocket();
        const webSocket = disposables.add(new WebSocketNodeSocket(socket, permessageDeflate, null, false));
        const barrier = new Barrier();
        let remainingFrameCount = frames.length;
        let receivedData = '';
        disposables.add(webSocket.onData((buff) => {
            receivedData += fromCharCodeArray(fromUint8Array(buff.buffer));
            remainingFrameCount--;
            if (remainingFrameCount === 0) {
                barrier.open();
            }
        }));
        for (let i = 0; i < frames.length; i++) {
            socket.fireData(frames[i]);
        }
        await barrier.wait();
        disposables.dispose();
        return receivedData;
    }
    test('A single-frame unmasked text message', async () => {
        const frames = [
            [0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f] // contains "Hello"
        ];
        const actual = await testReading(frames, false);
        assert.deepStrictEqual(actual, 'Hello');
    });
    test('A single-frame masked text message', async () => {
        const frames = [
            [0x81, 0x85, 0x37, 0xfa, 0x21, 0x3d, 0x7f, 0x9f, 0x4d, 0x51, 0x58] // contains "Hello"
        ];
        const actual = await testReading(frames, false);
        assert.deepStrictEqual(actual, 'Hello');
    });
    test('A fragmented unmasked text message', async () => {
        // contains "Hello"
        const frames = [
            [0x01, 0x03, 0x48, 0x65, 0x6c], // contains "Hel"
            [0x80, 0x02, 0x6c, 0x6f], // contains "lo"
        ];
        const actual = await testReading(frames, false);
        assert.deepStrictEqual(actual, 'Hello');
    });
    suite('compression', () => {
        test('A single-frame compressed text message', async () => {
            // contains "Hello"
            const frames = [
                [0xc1, 0x07, 0xf2, 0x48, 0xcd, 0xc9, 0xc9, 0x07, 0x00], // contains "Hello"
            ];
            const actual = await testReading(frames, true);
            assert.deepStrictEqual(actual, 'Hello');
        });
        test('A fragmented compressed text message', async () => {
            // contains "Hello"
            const frames = [
                [0x41, 0x03, 0xf2, 0x48, 0xcd],
                [0x80, 0x04, 0xc9, 0xc9, 0x07, 0x00]
            ];
            const actual = await testReading(frames, true);
            assert.deepStrictEqual(actual, 'Hello');
        });
        test('A single-frame non-compressed text message', async () => {
            const frames = [
                [0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f] // contains "Hello"
            ];
            const actual = await testReading(frames, true);
            assert.deepStrictEqual(actual, 'Hello');
        });
        test('A single-frame compressed text message followed by a single-frame non-compressed text message', async () => {
            const frames = [
                [0xc1, 0x07, 0xf2, 0x48, 0xcd, 0xc9, 0xc9, 0x07, 0x00], // contains "Hello"
                [0x81, 0x05, 0x77, 0x6f, 0x72, 0x6c, 0x64] // contains "world"
            ];
            const actual = await testReading(frames, true);
            assert.deepStrictEqual(actual, 'Helloworld');
        });
    });
    test('Large buffers are split and sent in chunks', async () => {
        let receivingSideOnDataCallCount = 0;
        let receivingSideTotalBytes = 0;
        const receivingSideSocketClosedBarrier = new Barrier();
        const server = await listenOnRandomPort((socket) => {
            // stop the server when the first connection is received
            server.close();
            const webSocketNodeSocket = new WebSocketNodeSocket(new NodeSocket(socket), true, null, false);
            ds.add(webSocketNodeSocket.onData((data) => {
                receivingSideOnDataCallCount++;
                receivingSideTotalBytes += data.byteLength;
            }));
            ds.add(webSocketNodeSocket.onClose(() => {
                webSocketNodeSocket.dispose();
                receivingSideSocketClosedBarrier.open();
            }));
        });
        const socket = connect({
            host: '127.0.0.1',
            port: server.address().port
        });
        const buff = generateRandomBuffer(1 * 1024 * 1024);
        const webSocketNodeSocket = new WebSocketNodeSocket(new NodeSocket(socket), true, null, false);
        webSocketNodeSocket.write(buff);
        await webSocketNodeSocket.drain();
        webSocketNodeSocket.dispose();
        await receivingSideSocketClosedBarrier.wait();
        assert.strictEqual(receivingSideTotalBytes, buff.byteLength);
        assert.strictEqual(receivingSideOnDataCallCount, 4);
    });
    test('issue #194284: ping/pong opcodes are supported', async () => {
        const disposables = new DisposableStore();
        const socket = new FakeNodeSocket();
        const webSocket = disposables.add(new WebSocketNodeSocket(socket, false, null, false));
        let receivedData = '';
        disposables.add(webSocket.onData((buff) => {
            receivedData += fromCharCodeArray(fromUint8Array(buff.buffer));
        }));
        // A single-frame non-compressed text message that contains "Hello"
        socket.fireData([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        // A ping message that contains "data"
        socket.fireData([0x89, 0x04, 0x64, 0x61, 0x74, 0x61]);
        // Another single-frame non-compressed text message that contains "Hello"
        socket.fireData([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        assert.strictEqual(receivedData, 'HelloHello');
        assert.deepStrictEqual(socket.writtenData.map(x => fromUint8Array(x.buffer)), [
            // A pong message that contains "data"
            [0x8A, 0x04, 0x64, 0x61, 0x74, 0x61]
        ]);
        disposables.dispose();
        return receivedData;
    });
    function generateRandomBuffer(size) {
        const buff = VSBuffer.alloc(size);
        for (let i = 0; i < size; i++) {
            buff.writeUInt8(Math.floor(256 * Math.random()), i);
        }
        return buff;
    }
    function listenOnRandomPort(handler) {
        return new Promise((resolve, reject) => {
            const server = createServer(handler).listen(0);
            server.on('listening', () => {
                resolve(server);
            });
            server.on('error', (err) => {
                reject(err);
            });
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvdGVzdC9ub2RlL2lwYy5uZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQzFCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDdEMsT0FBTyxFQUFlLE9BQU8sRUFBRSxZQUFZLEVBQWtCLE1BQU0sS0FBSyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM1RixPQUFPLEVBQWtCLGtCQUFrQixFQUFFLFFBQVEsRUFBbUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN4SixPQUFPLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdEgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNGLE1BQU0sYUFBYyxTQUFRLFVBQVU7SUFLckMsWUFBWSxDQUFnQztRQUMzQyxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLFFBQVE7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQ3ZDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFHLENBQUM7UUFFcEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztRQUM3QixRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDZixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksT0FBTyxDQUFXLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDekMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQztZQUNqQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFdBQVksU0FBUSxZQUFZO0lBQ3JDLFlBQ2tCLE1BQWEsRUFDYixLQUFnQjtRQUVqQyxLQUFLLEVBQUUsQ0FBQztRQUhTLFdBQU0sR0FBTixNQUFNLENBQU87UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFXO0lBR2xDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBWSxFQUFFLEVBQWE7UUFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE9BQU87SUFDUCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLEtBQUs7SUFRVixJQUFXLENBQUM7UUFDWCxPQUFZLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVELElBQVcsQ0FBQztRQUNYLE9BQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRUQsWUFDa0IsZUFBZSxDQUFDO1FBQWhCLGlCQUFZLEdBQVosWUFBWSxDQUFJO1FBRWpDLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2QsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDZixDQUFDO0lBRU0sS0FBSyxDQUFDLElBQWUsRUFBRSxJQUFZO1FBQ3pDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixJQUFJLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JCLENBQUM7WUFFRCxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVPLFFBQVE7UUFFZixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNwQixJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDM0IsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMzQixVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLE9BQU87UUFDUixDQUFDO0lBRUYsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUVsQyxNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXJELElBQUksS0FBWSxDQUFDO0lBRWpCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUNyQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFFN0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFcEQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2YsTUFBTSxJQUFJLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRTNDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztJQUdILElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUUxQyxNQUFNLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2QyxNQUFNLElBQUksR0FBRztZQUNaLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNYLEdBQUcsRUFBRSxLQUFLO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7U0FDN0IsQ0FBQztRQUVGLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLEdBQUcsR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFekQsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0lBSUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xFLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0QsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXhFLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5QixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFckMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUV4QyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZixNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1QixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUU3Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0RSxNQUFNLFNBQVMsR0FBRyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsTUFBTSxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsTUFBTSxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsTUFBTSxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsTUFBTSxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7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