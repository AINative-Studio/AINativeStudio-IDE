/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer, encodeBase64 } from '../../../base/common/buffer.js';
import { Emitter, PauseableEmitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { SocketDiagnostics } from '../../../base/parts/ipc/common/ipc.net.js';
export const makeRawSocketHeaders = (path, query, deubgLabel) => {
    // https://tools.ietf.org/html/rfc6455#section-4
    const buffer = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        buffer[i] = Math.round(Math.random() * 256);
    }
    const nonce = encodeBase64(VSBuffer.wrap(buffer));
    const headers = [
        `GET ws://localhost${path}?${query}&skipWebSocketFrames=true HTTP/1.1`,
        `Connection: Upgrade`,
        `Upgrade: websocket`,
        `Sec-WebSocket-Key: ${nonce}`
    ];
    return headers.join('\r\n') + '\r\n\r\n';
};
export const socketRawEndHeaderSequence = VSBuffer.fromString('\r\n\r\n');
/** Should be called immediately after making a ManagedSocket to make it ready for data flow. */
export async function connectManagedSocket(socket, path, query, debugLabel, half) {
    socket.write(VSBuffer.fromString(makeRawSocketHeaders(path, query, debugLabel)));
    const d = new DisposableStore();
    try {
        return await new Promise((resolve, reject) => {
            let dataSoFar;
            d.add(socket.onData(d_1 => {
                if (!dataSoFar) {
                    dataSoFar = d_1;
                }
                else {
                    dataSoFar = VSBuffer.concat([dataSoFar, d_1], dataSoFar.byteLength + d_1.byteLength);
                }
                const index = dataSoFar.indexOf(socketRawEndHeaderSequence);
                if (index === -1) {
                    return;
                }
                resolve(socket);
                // pause data events until the socket consumer is hooked up. We may
                // immediately emit remaining data, but if not there may still be
                // microtasks queued which would fire data into the abyss.
                socket.pauseData();
                const rest = dataSoFar.slice(index + socketRawEndHeaderSequence.byteLength);
                if (rest.byteLength) {
                    half.onData.fire(rest);
                }
            }));
            d.add(socket.onClose(err => reject(err ?? new Error('socket closed'))));
            d.add(socket.onEnd(() => reject(new Error('socket ended'))));
        });
    }
    catch (e) {
        socket.dispose();
        throw e;
    }
    finally {
        d.dispose();
    }
}
export class ManagedSocket extends Disposable {
    constructor(debugLabel, half) {
        super();
        this.debugLabel = debugLabel;
        this.pausableDataEmitter = this._register(new PauseableEmitter());
        this.onData = (...args) => {
            if (this.pausableDataEmitter.isPaused) {
                queueMicrotask(() => this.pausableDataEmitter.resume());
            }
            return this.pausableDataEmitter.event(...args);
        };
        this.didDisposeEmitter = this._register(new Emitter());
        this.onDidDispose = this.didDisposeEmitter.event;
        this.ended = false;
        this._register(half.onData);
        this._register(half.onData.event(data => this.pausableDataEmitter.fire(data)));
        this.onClose = this._register(half.onClose).event;
        this.onEnd = this._register(half.onEnd).event;
    }
    /** Pauses data events until a new listener comes in onData() */
    pauseData() {
        this.pausableDataEmitter.pause();
    }
    /** Flushes data to the socket. */
    drain() {
        return Promise.resolve();
    }
    /** Ends the remote socket. */
    end() {
        this.ended = true;
        this.closeRemote();
    }
    traceSocketEvent(type, data) {
        SocketDiagnostics.traceSocketEvent(this, this.debugLabel, type, data);
    }
    dispose() {
        if (!this.ended) {
            this.closeRemote();
        }
        this.didDisposeEmitter.fire();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlZFNvY2tldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvY29tbW9uL21hbmFnZWRTb2NrZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFTLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRixPQUFPLEVBQTZCLGlCQUFpQixFQUE4QixNQUFNLDJDQUEyQyxDQUFDO0FBRXJJLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLENBQUMsSUFBWSxFQUFFLEtBQWEsRUFBRSxVQUFrQixFQUFFLEVBQUU7SUFDdkYsZ0RBQWdEO0lBQ2hELE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM3QixNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFbEQsTUFBTSxPQUFPLEdBQUc7UUFDZixxQkFBcUIsSUFBSSxJQUFJLEtBQUssb0NBQW9DO1FBQ3RFLHFCQUFxQjtRQUNyQixvQkFBb0I7UUFDcEIsc0JBQXNC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