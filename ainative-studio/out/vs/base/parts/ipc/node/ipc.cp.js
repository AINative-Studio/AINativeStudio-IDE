/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fork } from 'child_process';
import { createCancelablePromise, Delayer } from '../../../common/async.js';
import { VSBuffer } from '../../../common/buffer.js';
import { CancellationToken } from '../../../common/cancellation.js';
import { isRemoteConsoleLog, log } from '../../../common/console.js';
import * as errors from '../../../common/errors.js';
import { Emitter, Event } from '../../../common/event.js';
import { dispose, toDisposable } from '../../../common/lifecycle.js';
import { deepClone } from '../../../common/objects.js';
import { createQueuedSender } from '../../../node/processes.js';
import { removeDangerousEnvVariables } from '../../../common/processes.js';
import { ChannelClient as IPCClient, ChannelServer as IPCServer } from '../common/ipc.js';
/**
 * This implementation doesn't perform well since it uses base64 encoding for buffers.
 * We should move all implementations to use named ipc.net, so we stop depending on cp.fork.
 */
export class Server extends IPCServer {
    constructor(ctx) {
        super({
            send: r => {
                try {
                    process.send?.(r.buffer.toString('base64'));
                }
                catch (e) { /* not much to do */ }
            },
            onMessage: Event.fromNodeEventEmitter(process, 'message', msg => VSBuffer.wrap(Buffer.from(msg, 'base64')))
        }, ctx);
        process.once('disconnect', () => this.dispose());
    }
}
export class Client {
    constructor(modulePath, options) {
        this.modulePath = modulePath;
        this.options = options;
        this.activeRequests = new Set();
        this.channels = new Map();
        this._onDidProcessExit = new Emitter();
        this.onDidProcessExit = this._onDidProcessExit.event;
        const timeout = options && options.timeout ? options.timeout : 60000;
        this.disposeDelayer = new Delayer(timeout);
        this.child = null;
        this._client = null;
    }
    getChannel(channelName) {
        const that = this;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            call(command, arg, cancellationToken) {
                return that.requestPromise(channelName, command, arg, cancellationToken);
            },
            listen(event, arg) {
                return that.requestEvent(channelName, event, arg);
            }
        };
    }
    requestPromise(channelName, name, arg, cancellationToken = CancellationToken.None) {
        if (!this.disposeDelayer) {
            return Promise.reject(new Error('disposed'));
        }
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(errors.canceled());
        }
        this.disposeDelayer.cancel();
        const channel = this.getCachedChannel(channelName);
        const result = createCancelablePromise(token => channel.call(name, arg, token));
        const cancellationTokenListener = cancellationToken.onCancellationRequested(() => result.cancel());
        const disposable = toDisposable(() => result.cancel());
        this.activeRequests.add(disposable);
        result.finally(() => {
            cancellationTokenListener.dispose();
            this.activeRequests.delete(disposable);
            if (this.activeRequests.size === 0 && this.disposeDelayer) {
                this.disposeDelayer.trigger(() => this.disposeClient());
            }
        });
        return result;
    }
    requestEvent(channelName, name, arg) {
        if (!this.disposeDelayer) {
            return Event.None;
        }
        this.disposeDelayer.cancel();
        let listener;
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                const channel = this.getCachedChannel(channelName);
                const event = channel.listen(name, arg);
                listener = event(emitter.fire, emitter);
                this.activeRequests.add(listener);
            },
            onDidRemoveLastListener: () => {
                this.activeRequests.delete(listener);
                listener.dispose();
                if (this.activeRequests.size === 0 && this.disposeDelayer) {
                    this.disposeDelayer.trigger(() => this.disposeClient());
                }
            }
        });
        return emitter.event;
    }
    get client() {
        if (!this._client) {
            const args = this.options && this.options.args ? this.options.args : [];
            const forkOpts = Object.create(null);
            forkOpts.env = { ...deepClone(process.env), 'VSCODE_PARENT_PID': String(process.pid) };
            if (this.options && this.options.env) {
                forkOpts.env = { ...forkOpts.env, ...this.options.env };
            }
            if (this.options && this.options.freshExecArgv) {
                forkOpts.execArgv = [];
            }
            if (this.options && typeof this.options.debug === 'number') {
                forkOpts.execArgv = ['--nolazy', '--inspect=' + this.options.debug];
            }
            if (this.options && typeof this.options.debugBrk === 'number') {
                forkOpts.execArgv = ['--nolazy', '--inspect-brk=' + this.options.debugBrk];
            }
            if (forkOpts.execArgv === undefined) {
                forkOpts.execArgv = process.execArgv // if not set, the forked process inherits the execArgv of the parent process
                    .filter(a => !/^--inspect(-brk)?=/.test(a)) // --inspect and --inspect-brk can not be inherited as the port would conflict
                    .filter(a => !a.startsWith('--vscode-')); // --vscode-* arguments are unsupported by node.js and thus need to remove
            }
            removeDangerousEnvVariables(forkOpts.env);
            this.child = fork(this.modulePath, args, forkOpts);
            const onMessageEmitter = new Emitter();
            const onRawMessage = Event.fromNodeEventEmitter(this.child, 'message', msg => msg);
            const rawMessageDisposable = onRawMessage(msg => {
                // Handle remote console logs specially
                if (isRemoteConsoleLog(msg)) {
                    log(msg, `IPC Library: ${this.options.serverName}`);
                    return;
                }
                // Anything else goes to the outside
                onMessageEmitter.fire(VSBuffer.wrap(Buffer.from(msg, 'base64')));
            });
            const sender = this.options.useQueue ? createQueuedSender(this.child) : this.child;
            const send = (r) => this.child && this.child.connected && sender.send(r.buffer.toString('base64'));
            const onMessage = onMessageEmitter.event;
            const protocol = { send, onMessage };
            this._client = new IPCClient(protocol);
            const onExit = () => this.disposeClient();
            process.once('exit', onExit);
            this.child.on('error', err => console.warn('IPC "' + this.options.serverName + '" errored with ' + err));
            this.child.on('exit', (code, signal) => {
                process.removeListener('exit', onExit); // https://github.com/electron/electron/issues/21475
                rawMessageDisposable.dispose();
                this.activeRequests.forEach(r => dispose(r));
                this.activeRequests.clear();
                if (code !== 0 && signal !== 'SIGTERM') {
                    console.warn('IPC "' + this.options.serverName + '" crashed with exit code ' + code + ' and signal ' + signal);
                }
                this.disposeDelayer?.cancel();
                this.disposeClient();
                this._onDidProcessExit.fire({ code, signal });
            });
        }
        return this._client;
    }
    getCachedChannel(name) {
        let channel = this.channels.get(name);
        if (!channel) {
            channel = this.client.getChannel(name);
            this.channels.set(name, channel);
        }
        return channel;
    }
    disposeClient() {
        if (this._client) {
            if (this.child) {
                this.child.kill();
                this.child = null;
            }
            this._client = null;
            this.channels.clear();
        }
    }
    dispose() {
        this._onDidProcessExit.dispose();
        this.disposeDelayer?.cancel();
        this.disposeDelayer = undefined;
        this.disposeClient();
        this.activeRequests.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmNwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL25vZGUvaXBjLmNwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZ0IsSUFBSSxFQUFlLE1BQU0sZUFBZSxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JFLE9BQU8sS0FBSyxNQUFNLE1BQU0sMkJBQTJCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxJQUFJLFNBQVMsRUFBRSxhQUFhLElBQUksU0FBUyxFQUE0QixNQUFNLGtCQUFrQixDQUFDO0FBRXBIOzs7R0FHRztBQUVILE1BQU0sT0FBTyxNQUFnQyxTQUFRLFNBQW1CO0lBQ3ZFLFlBQVksR0FBYTtRQUN4QixLQUFLLENBQUM7WUFDTCxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQ1Qs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