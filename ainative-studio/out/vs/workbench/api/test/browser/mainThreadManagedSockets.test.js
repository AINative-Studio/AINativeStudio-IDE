/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { disposableTimeout, timeout } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { MainThreadManagedSocket } from '../../browser/mainThreadManagedSockets.js';
suite('MainThreadManagedSockets', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    suite('ManagedSocket', () => {
        let extHost;
        let half;
        class ExtHostMock extends mock() {
            constructor() {
                super(...arguments);
                this.onDidFire = new Emitter();
                this.events = [];
            }
            $remoteSocketWrite(socketId, buffer) {
                this.events.push({ socketId, data: buffer.toString() });
                this.onDidFire.fire();
            }
            $remoteSocketDrain(socketId) {
                this.events.push({ socketId, event: 'drain' });
                this.onDidFire.fire();
                return Promise.resolve();
            }
            $remoteSocketEnd(socketId) {
                this.events.push({ socketId, event: 'end' });
                this.onDidFire.fire();
            }
            expectEvent(test, message) {
                if (this.events.some(test)) {
                    return;
                }
                const d = new DisposableStore();
                return new Promise(resolve => {
                    d.add(this.onDidFire.event(() => {
                        if (this.events.some(test)) {
                            return;
                        }
                    }));
                    d.add(disposableTimeout(() => {
                        throw new Error(`Expected ${message} but only had ${JSON.stringify(this.events, null, 2)}`);
                    }, 1000));
                }).finally(() => d.dispose());
            }
        }
        setup(() => {
            extHost = new ExtHostMock();
            half = {
                onClose: new Emitter(),
                onData: new Emitter(),
                onEnd: new Emitter(),
            };
        });
        async function doConnect() {
            const socket = MainThreadManagedSocket.connect(1, extHost, '/hello', 'world=true', '', half);
            await extHost.expectEvent(evt => evt.data && evt.data.startsWith('GET ws://localhost/hello?world=true&skipWebSocketFrames=true HTTP/1.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Key:'), 'websocket open event');
            half.onData.fire(VSBuffer.fromString('Opened successfully ;)\r\n\r\n'));
            return ds.add(await socket);
        }
        test('connects', async () => {
            await doConnect();
        });
        test('includes trailing connection data', async () => {
            const socketProm = MainThreadManagedSocket.connect(1, extHost, '/hello', 'world=true', '', half);
            await extHost.expectEvent(evt => evt.data && evt.data.includes('GET ws://localhost'), 'websocket open event');
            half.onData.fire(VSBuffer.fromString('Opened successfully ;)\r\n\r\nSome trailing data'));
            const socket = ds.add(await socketProm);
            const data = [];
            ds.add(socket.onData(d => data.push(d.toString())));
            await timeout(1); // allow microtasks to flush
            assert.deepStrictEqual(data, ['Some trailing data']);
        });
        test('round trips data', async () => {
            const socket = await doConnect();
            const data = [];
            ds.add(socket.onData(d => data.push(d.toString())));
            socket.write(VSBuffer.fromString('ping'));
            await extHost.expectEvent(evt => evt.data === 'ping', 'expected ping');
            half.onData.fire(VSBuffer.fromString("pong"));
            assert.deepStrictEqual(data, ['pong']);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHcEYsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUV0QyxNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXJELEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzNCLElBQUksT0FBb0IsQ0FBQztRQUN6QixJQUFJLElBQXNCLENBQUM7UUFFM0IsTUFBTSxXQUFZLFNBQVEsSUFBSSxFQUE4QjtZQUE1RDs7Z0JBQ1MsY0FBUyxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7Z0JBQ3hCLFdBQU0sR0FBVSxFQUFFLENBQUM7WUFtQ3BDLENBQUM7WUFqQ1Msa0JBQWtCLENBQUMsUUFBZ0IsRUFBRSxNQUFn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