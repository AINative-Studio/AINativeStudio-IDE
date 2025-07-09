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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL3Rlc3Qvbm9kZS9pcGMubmV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMxQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3RDLE9BQU8sRUFBZSxPQUFPLEVBQUUsWUFBWSxFQUFrQixNQUFNLEtBQUssQ0FBQztBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUYsT0FBTyxFQUFrQixrQkFBa0IsRUFBRSxRQUFRLEVBQW1FLE1BQU0seUJBQXlCLENBQUM7QUFDeEosT0FBTyxFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3RILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRixNQUFN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LENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFD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