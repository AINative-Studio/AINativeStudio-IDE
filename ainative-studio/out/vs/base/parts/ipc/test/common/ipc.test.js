/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../common/async.js';
import { VSBuffer } from '../../../../common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../common/cancellation.js';
import { canceled } from '../../../../common/errors.js';
import { Emitter, Event } from '../../../../common/event.js';
import { DisposableStore } from '../../../../common/lifecycle.js';
import { isEqual } from '../../../../common/resources.js';
import { URI } from '../../../../common/uri.js';
import { BufferReader, BufferWriter, deserialize, IPCClient, IPCServer, ProxyChannel, serialize } from '../../common/ipc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
class QueueProtocol {
    constructor() {
        this.buffering = true;
        this.buffers = [];
        this._onMessage = new Emitter({
            onDidAddFirstListener: () => {
                for (const buffer of this.buffers) {
                    this._onMessage.fire(buffer);
                }
                this.buffers = [];
                this.buffering = false;
            },
            onDidRemoveLastListener: () => {
                this.buffering = true;
            }
        });
        this.onMessage = this._onMessage.event;
    }
    send(buffer) {
        this.other.receive(buffer);
    }
    receive(buffer) {
        if (this.buffering) {
            this.buffers.push(buffer);
        }
        else {
            this._onMessage.fire(buffer);
        }
    }
}
function createProtocolPair() {
    const one = new QueueProtocol();
    const other = new QueueProtocol();
    one.other = other;
    other.other = one;
    return [one, other];
}
class TestIPCClient extends IPCClient {
    constructor(protocol, id) {
        super(protocol, id);
        this._onDidDisconnect = new Emitter();
        this.onDidDisconnect = this._onDidDisconnect.event;
    }
    dispose() {
        this._onDidDisconnect.fire();
        super.dispose();
    }
}
class TestIPCServer extends IPCServer {
    constructor() {
        const onDidClientConnect = new Emitter();
        super(onDidClientConnect.event);
        this.onDidClientConnect = onDidClientConnect;
    }
    createConnection(id) {
        const [pc, ps] = createProtocolPair();
        const client = new TestIPCClient(pc, id);
        this.onDidClientConnect.fire({
            protocol: ps,
            onDidClientDisconnect: client.onDidDisconnect
        });
        return client;
    }
}
const TestChannelId = 'testchannel';
class TestService {
    constructor() {
        this.disposables = new DisposableStore();
        this._onPong = new Emitter();
        this.onPong = this._onPong.event;
    }
    marco() {
        return Promise.resolve('polo');
    }
    error(message) {
        return Promise.reject(new Error(message));
    }
    neverComplete() {
        return new Promise(_ => { });
    }
    neverCompleteCT(cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(canceled());
        }
        return new Promise((_, e) => this.disposables.add(cancellationToken.onCancellationRequested(() => e(canceled()))));
    }
    buffersLength(buffers) {
        return Promise.resolve(buffers.reduce((r, b) => r + b.buffer.length, 0));
    }
    ping(msg) {
        this._onPong.fire(msg);
    }
    marshall(uri) {
        return Promise.resolve(uri);
    }
    context(context) {
        return Promise.resolve(context);
    }
    dispose() {
        this.disposables.dispose();
    }
}
class TestChannel {
    constructor(service) {
        this.service = service;
    }
    call(_, command, arg, cancellationToken) {
        switch (command) {
            case 'marco': return this.service.marco();
            case 'error': return this.service.error(arg);
            case 'neverComplete': return this.service.neverComplete();
            case 'neverCompleteCT': return this.service.neverCompleteCT(cancellationToken);
            case 'buffersLength': return this.service.buffersLength(arg);
            default: return Promise.reject(new Error('not implemented'));
        }
    }
    listen(_, event, arg) {
        switch (event) {
            case 'onPong': return this.service.onPong;
            default: throw new Error('not implemented');
        }
    }
}
class TestChannelClient {
    get onPong() {
        return this.channel.listen('onPong');
    }
    constructor(channel) {
        this.channel = channel;
    }
    marco() {
        return this.channel.call('marco');
    }
    error(message) {
        return this.channel.call('error', message);
    }
    neverComplete() {
        return this.channel.call('neverComplete');
    }
    neverCompleteCT(cancellationToken) {
        return this.channel.call('neverCompleteCT', undefined, cancellationToken);
    }
    buffersLength(buffers) {
        return this.channel.call('buffersLength', buffers);
    }
    marshall(uri) {
        return this.channel.call('marshall', uri);
    }
    context() {
        return this.channel.call('context');
    }
}
suite('Base IPC', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('createProtocolPair', async function () {
        const [clientProtocol, serverProtocol] = createProtocolPair();
        const b1 = VSBuffer.alloc(0);
        clientProtocol.send(b1);
        const b3 = VSBuffer.alloc(0);
        serverProtocol.send(b3);
        const b2 = await Event.toPromise(serverProtocol.onMessage);
        const b4 = await Event.toPromise(clientProtocol.onMessage);
        assert.strictEqual(b1, b2);
        assert.strictEqual(b3, b4);
    });
    suite('one to one', function () {
        let server;
        let client;
        let service;
        let ipcService;
        setup(function () {
            service = store.add(new TestService());
            const testServer = store.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, new TestChannel(service));
            client = store.add(testServer.createConnection('client1'));
            ipcService = new TestChannelClient(client.getChannel(TestChannelId));
        });
        test('call success', async function () {
            const r = await ipcService.marco();
            return assert.strictEqual(r, 'polo');
        });
        test('call error', async function () {
            try {
                await ipcService.error('nice error');
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert.strictEqual(err.message, 'nice error');
            }
        });
        test('cancel call with cancelled cancellation token', async function () {
            try {
                await ipcService.neverCompleteCT(CancellationToken.Cancelled);
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert(err.message === 'Canceled');
            }
        });
        test('cancel call with cancellation token (sync)', function () {
            const cts = new CancellationTokenSource();
            const promise = ipcService.neverCompleteCT(cts.token).then(_ => assert.fail('should not reach here'), err => assert(err.message === 'Canceled'));
            cts.cancel();
            return promise;
        });
        test('cancel call with cancellation token (async)', function () {
            const cts = new CancellationTokenSource();
            const promise = ipcService.neverCompleteCT(cts.token).then(_ => assert.fail('should not reach here'), err => assert(err.message === 'Canceled'));
            setTimeout(() => cts.cancel());
            return promise;
        });
        test('listen to events', async function () {
            const messages = [];
            store.add(ipcService.onPong(msg => messages.push(msg)));
            await timeout(0);
            assert.deepStrictEqual(messages, []);
            service.ping('hello');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello']);
            service.ping('world');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello', 'world']);
        });
        test('buffers in arrays', async function () {
            const r = await ipcService.buffersLength([VSBuffer.alloc(2), VSBuffer.alloc(3)]);
            return assert.strictEqual(r, 5);
        });
        test('round trips numbers', () => {
            const input = [
                0,
                1,
                -1,
                12345,
                -12345,
                42.6,
                123412341234
            ];
            const writer = new BufferWriter();
            serialize(writer, input);
            assert.deepStrictEqual(deserialize(new BufferReader(writer.buffer)), input);
        });
    });
    suite('one to one (proxy)', function () {
        let server;
        let client;
        let service;
        let ipcService;
        const disposables = new DisposableStore();
        setup(function () {
            service = store.add(new TestService());
            const testServer = disposables.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, ProxyChannel.fromService(service, disposables));
            client = disposables.add(testServer.createConnection('client1'));
            ipcService = ProxyChannel.toService(client.getChannel(TestChannelId));
        });
        teardown(function () {
            disposables.clear();
        });
        test('call success', async function () {
            const r = await ipcService.marco();
            return assert.strictEqual(r, 'polo');
        });
        test('call error', async function () {
            try {
                await ipcService.error('nice error');
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert.strictEqual(err.message, 'nice error');
            }
        });
        test('listen to events', async function () {
            const messages = [];
            disposables.add(ipcService.onPong(msg => messages.push(msg)));
            await timeout(0);
            assert.deepStrictEqual(messages, []);
            service.ping('hello');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello']);
            service.ping('world');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello', 'world']);
        });
        test('marshalling uri', async function () {
            const uri = URI.file('foobar');
            const r = await ipcService.marshall(uri);
            assert.ok(r instanceof URI);
            return assert.ok(isEqual(r, uri));
        });
        test('buffers in arrays', async function () {
            const r = await ipcService.buffersLength([VSBuffer.alloc(2), VSBuffer.alloc(3)]);
            return assert.strictEqual(r, 5);
        });
    });
    suite('one to one (proxy, extra context)', function () {
        let server;
        let client;
        let service;
        let ipcService;
        const disposables = new DisposableStore();
        setup(function () {
            service = store.add(new TestService());
            const testServer = disposables.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, ProxyChannel.fromService(service, disposables));
            client = disposables.add(testServer.createConnection('client1'));
            ipcService = ProxyChannel.toService(client.getChannel(TestChannelId), { context: 'Super Context' });
        });
        teardown(function () {
            disposables.clear();
        });
        test('call extra context', async function () {
            const r = await ipcService.context();
            return assert.strictEqual(r, 'Super Context');
        });
    });
    suite('one to many', function () {
        test('all clients get pinged', async function () {
            const service = store.add(new TestService());
            const channel = new TestChannel(service);
            const server = store.add(new TestIPCServer());
            server.registerChannel('channel', channel);
            let client1GotPinged = false;
            const client1 = store.add(server.createConnection('client1'));
            const ipcService1 = new TestChannelClient(client1.getChannel('channel'));
            store.add(ipcService1.onPong(() => client1GotPinged = true));
            let client2GotPinged = false;
            const client2 = store.add(server.createConnection('client2'));
            const ipcService2 = new TestChannelClient(client2.getChannel('channel'));
            store.add(ipcService2.onPong(() => client2GotPinged = true));
            await timeout(1);
            service.ping('hello');
            await timeout(1);
            assert(client1GotPinged, 'client 1 got pinged');
            assert(client2GotPinged, 'client 2 got pinged');
        });
        test('server gets pings from all clients (broadcast channel)', async function () {
            const server = store.add(new TestIPCServer());
            const client1 = server.createConnection('client1');
            const clientService1 = store.add(new TestService());
            const clientChannel1 = new TestChannel(clientService1);
            client1.registerChannel('channel', clientChannel1);
            const pings = [];
            const channel = server.getChannel('channel', () => true);
            const service = new TestChannelClient(channel);
            store.add(service.onPong(msg => pings.push(msg)));
            await timeout(1);
            clientService1.ping('hello 1');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1']);
            const client2 = server.createConnection('client2');
            const clientService2 = store.add(new TestService());
            const clientChannel2 = new TestChannel(clientService2);
            client2.registerChannel('channel', clientChannel2);
            await timeout(1);
            clientService2.ping('hello 2');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2']);
            client1.dispose();
            clientService1.ping('hello 1');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2']);
            await timeout(1);
            clientService2.ping('hello again 2');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2', 'hello again 2']);
            client2.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvdGVzdC9jb21tb24vaXBjLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEQsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQXlCLFdBQVcsRUFBcUMsU0FBUyxFQUFFLFNBQVMsRUFBa0IsWUFBWSxFQUFFLFNBQVMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3ZNLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNGLE1BQU0sYUFBYTtJQUFuQjtRQUVTLGNBQVMsR0FBRyxJQUFJLENBQUM7UUFDakIsWUFBTyxHQUFlLEVBQUUsQ0FBQztRQUVoQixlQUFVLEdBQUcsSUFBSSxPQUFPLENBQVc7WUFDbkQscUJBQXFCLEVBQUUsR0FBRyxFQUFFO2dCQUMzQixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzlCLENBQUM7Z0JBRUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3hCLENBQUM7WUFDRCx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFTSxjQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7SUFjNUMsQ0FBQztJQVhBLElBQUksQ0FBQyxNQUFnQjtRQUNwQixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRVMsT0FBTyxDQUFDLE1BQWdCO1FBQ2pDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELFNBQVMsa0JBQWtCO0lBQzFCLE1BQU0sR0FBRyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7SUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztJQUNsQyxHQUFHLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNsQixLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUVsQixPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3JCLENBQUM7QUFFRCxNQUFNLGFBQWMsU0FBUSxTQUFpQjtJQUs1QyxZQUFZLFFBQWlDLEVBQUUsRUFBVTtRQUN4RCxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBSkoscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUMvQyxvQkFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7SUFJdkQsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDN0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FDRDtBQUVELE1BQU0sYUFBYyxTQUFRLFNBQWlCO0lBSTVDO1FBQ0MsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBeUIsQ0FBQztRQUNoRSxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDO0lBQzlDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxFQUFVO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGFBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztZQUM1QixRQUFRLEVBQUUsRUFBRTtZQUNaLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxlQUFlO1NBQzdDLENBQUMsQ0FBQztRQUVILE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNEO0FBRUQsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDO0FBY3BDLE1BQU0sV0FBVztJQUFqQjtRQUVrQixnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFcEMsWUFBTyxHQUFHLElBQUksT0FBTyxFQUFVLENBQUM7UUFDeEMsV0FBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBeUN0QyxDQUFDO0lBdkNBLEtBQUs7UUFDSixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFRCxlQUFlLENBQUMsaUJBQW9DO1FBQ25ELElBQUksaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUMvQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBRUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BILENBQUM7SUFFRCxhQUFhLENBQUMsT0FBbUI7UUFDaEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQVc7UUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsUUFBUSxDQUFDLEdBQVE7UUFDaEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxPQUFPLENBQUMsT0FBaUI7UUFDeEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM1QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFdBQVc7SUFFaEIsWUFBb0IsT0FBcUI7UUFBckIsWUFBTyxHQUFQLE9BQU8sQ0FBYztJQUFJLENBQUM7SUFFOUMsSUFBSSxDQUFDLENBQVUsRUFBRSxPQUFlLEVBQUUsR0FBUSxFQUFFLGlCQUFvQztRQUMvRSxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzFDLEtBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QyxLQUFLLGVBQWUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUMxRCxLQUFLLGlCQUFpQixDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQy9FLEtBQUssZUFBZSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3RCxPQUFPLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLENBQVUsRUFBRSxLQUFhLEVBQUUsR0FBUztRQUMxQyxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQzFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxpQkFBaUI7SUFFdEIsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsWUFBb0IsT0FBaUI7UUFBakIsWUFBTyxHQUFQLE9BQU8sQ0FBVTtJQUFJLENBQUM7SUFFMUMsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsZUFBZSxDQUFDLGlCQUFvQztRQUNuRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBbUI7UUFDaEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFFBQVEsQ0FBQyxHQUFRO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsVUFBVSxFQUFFO0lBRWpCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUs7UUFDL0IsTUFBTSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBRTlELE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0IsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdCLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLEVBQUUsR0FBRyxNQUFNLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTNELE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzVCLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLFlBQVksRUFBRTtRQUNuQixJQUFJLE1BQWlCLENBQUM7UUFDdEIsSUFBSSxNQUFpQixDQUFDO1FBQ3RCLElBQUksT0FBb0IsQ0FBQztRQUN6QixJQUFJLFVBQXdCLENBQUM7UUFFN0IsS0FBSyxDQUFDO1lBQ0wsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sR0FBRyxVQUFVLENBQUM7WUFFcEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUVoRSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUMzRCxVQUFVLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDdEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUs7WUFDekIsTUFBTSxDQUFDLEdBQUcsTUFBTSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbkMsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSztZQUN2QixJQUFJLENBQUM7Z0JBQ0osTUFBTSxVQUFVLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNyQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxPQUFPLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN0RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSztZQUMxRCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxVQUFVLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM5RCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxLQUFLLFVBQVUsQ0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRTtZQUNsRCxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFDMUMsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUN6RCxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsRUFDekMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sS0FBSyxVQUFVLENBQUMsQ0FDekMsQ0FBQztZQUVGLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUViLE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDZDQUE2QyxFQUFFO1lBQ25ELE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztZQUMxQyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQ3pELENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUN6QyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxLQUFLLFVBQVUsQ0FBQyxDQUN6QyxDQUFDO1lBRUYsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRS9CLE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUs7WUFDN0IsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFDO1lBRTlCLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWpCLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEIsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFakIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzVDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEIsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFakIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxLQUFLO1lBQzlCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakYsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7WUFDaEMsTUFBTSxLQUFLLEdBQUc7Z0JBQ2IsQ0FBQztnQkFDRCxDQUFDO2dCQUNELENBQUMsQ0FBQztnQkFDRixLQUFLO2dCQUNMLENBQUMsS0FBSztnQkFDTixJQUFJO2dCQUNKLFlBQVk7YUFDWixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsb0JBQW9CLEVBQUU7UUFDM0IsSUFBSSxNQUFpQixDQUFDO1FBQ3RCLElBQUksTUFBaUIsQ0FBQztRQUN0QixJQUFJLE9BQW9CLENBQUM7UUFDekIsSUFBSSxVQUF3QixDQUFDO1FBRTdCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFMUMsS0FBSyxDQUFDO1lBQ0wsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sR0FBRyxVQUFVLENBQUM7WUFFcEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUV0RixNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNqRSxVQUFVLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxRQUFRLENBQUM7WUFDUixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUs7WUFDekIsTUFBTSxDQUFDLEdBQUcsTUFBTSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbkMsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSztZQUN2QixJQUFJLENBQUM7Z0JBQ0osTUFBTSxVQUFVLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNyQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxPQUFPLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN0RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSztZQUM3QixNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7WUFFOUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUQsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFakIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDckMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QixNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqQixNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QixNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqQixNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEtBQUs7WUFDNUIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsR0FBRyxNQUFNLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7WUFDNUIsT0FBTyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxLQUFLO1lBQzlCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakYsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLG1DQUFtQyxFQUFFO1FBQzFDLElBQUksTUFBaUIsQ0FBQztRQUN0QixJQUFJLE1BQWlCLENBQUM7UUFDdEIsSUFBSSxPQUFvQixDQUFDO1FBQ3pCLElBQUksVUFBd0IsQ0FBQztRQUU3QixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRTFDLEtBQUssQ0FBQztZQUNMLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztZQUN2QyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQztZQUN4RCxNQUFNLEdBQUcsVUFBVSxDQUFDO1lBRXBCLE1BQU0sQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFFdEYsTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDakUsVUFBVSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ3JHLENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDO1lBQ1IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUs7WUFDL0IsTUFBTSxDQUFDLEdBQUcsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckMsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGFBQWEsRUFBRTtRQUNwQixJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSztZQUNuQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztZQUM3QyxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUUzQyxJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQztZQUM3QixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzlELE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRTdELElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1lBQzdCLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDOUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDekUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7WUFFN0QsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV0QixNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixNQUFNLENBQUMsZ0JBQWdCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUMsZ0JBQWdCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUNqRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx3REFBd0QsRUFBRSxLQUFLO1lBQ25FLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBRTlDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuRCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztZQUNwRCxNQUFNLGNBQWMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN2RCxPQUFPLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUVuRCxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7WUFDM0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekQsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVsRCxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRS9CLE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUUzQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbkQsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDdkQsT0FBTyxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFFbkQsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUUvQixNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBRXRELE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRS9CLE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFFdEQsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsY0FBYyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUVyQyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztZQUV2RSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=