/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import minimist from 'minimist';
import * as net from 'net';
import { ProcessTimeRunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { isCancellationError, isSigPipeError, onUnexpectedError } from '../../../base/common/errors.js';
import * as performance from '../../../base/common/performance.js';
import { realpath } from '../../../base/node/extpath.js';
import { Promises } from '../../../base/node/pfs.js';
import { BufferedEmitter, PersistentProtocol } from '../../../base/parts/ipc/common/ipc.net.js';
import { NodeSocket, WebSocketNodeSocket } from '../../../base/parts/ipc/node/ipc.net.js';
import { boolean } from '../../../editor/common/config/editorOptions.js';
import product from '../../../platform/product/common/product.js';
import { ExtensionHostMain } from '../common/extensionHostMain.js';
import { createURITransformer } from './uriTransformer.js';
import { readExtHostConnection } from '../../services/extensions/common/extensionHostEnv.js';
import { createMessageOfType, isMessageOfType } from '../../services/extensions/common/extensionHostProtocol.js';
import '../common/extHost.common.services.js';
import './extHost.node.services.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// workaround for https://github.com/microsoft/vscode/issues/85490
// remove --inspect-port=0 after start so that it doesn't trigger LSP debugging
(function removeInspectPort() {
    for (let i = 0; i < process.execArgv.length; i++) {
        if (process.execArgv[i] === '--inspect-port=0') {
            process.execArgv.splice(i, 1);
            i--;
        }
    }
})();
const args = minimist(process.argv.slice(2), {
    boolean: [
        'transformURIs',
        'skipWorkspaceStorageLock'
    ],
    string: [
        'useHostProxy' // 'true' | 'false' | undefined
    ]
});
// With Electron 2.x and node.js 8.x the "natives" module
// can cause a native crash (see https://github.com/nodejs/node/issues/19891 and
// https://github.com/electron/electron/issues/10905). To prevent this from
// happening we essentially blocklist this module from getting loaded in any
// extension by patching the node require() function.
(function () {
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function (request) {
        if (request === 'natives') {
            throw new Error('Either the extension or an NPM dependency is using the [unsupported "natives" node module](https://go.microsoft.com/fwlink/?linkid=871887).');
        }
        return originalLoad.apply(this, arguments);
    };
})();
// custom process.exit logic...
const nativeExit = process.exit.bind(process);
const nativeOn = process.on.bind(process);
function patchProcess(allowExit) {
    process.exit = function (code) {
        if (allowExit) {
            nativeExit(code);
        }
        else {
            const err = new Error('An extension called process.exit() and this was prevented.');
            console.warn(err.stack);
        }
    };
    // override Electron's process.crash() method
    process.crash = function () {
        const err = new Error('An extension called process.crash() and this was prevented.');
        console.warn(err.stack);
    };
    // Set ELECTRON_RUN_AS_NODE environment variable for extensions that use
    // child_process.spawn with process.execPath and expect to run as node process
    // on the desktop.
    // Refs https://github.com/microsoft/vscode/issues/151012#issuecomment-1156593228
    process.env['ELECTRON_RUN_AS_NODE'] = '1';
    process.on = function (event, listener) {
        if (event === 'uncaughtException') {
            const actualListener = listener;
            listener = function (...args) {
                try {
                    return actualListener.apply(undefined, args);
                }
                catch {
                    // DO NOT HANDLE NOR PRINT the error here because this can and will lead to
                    // more errors which will cause error handling to be reentrant and eventually
                    // overflowing the stack. Do not be sad, we do handle and annotate uncaught
                    // errors properly in 'extensionHostMain'
                }
            };
        }
        nativeOn(event, listener);
    };
}
// This calls exit directly in case the initialization is not finished and we need to exit
// Otherwise, if initialization completed we go to extensionHostMain.terminate()
let onTerminate = function (reason) {
    nativeExit();
};
function _createExtHostProtocol() {
    const extHostConnection = readExtHostConnection(process.env);
    if (extHostConnection.type === 3 /* ExtHostConnectionType.MessagePort */) {
        return new Promise((resolve, reject) => {
            const withPorts = (ports) => {
                const port = ports[0];
                const onMessage = new BufferedEmitter();
                port.on('message', (e) => onMessage.fire(VSBuffer.wrap(e.data)));
                port.on('close', () => {
                    onTerminate('renderer closed the MessagePort');
                });
                port.start();
                resolve({
                    onMessage: onMessage.event,
                    send: message => port.postMessage(message.buffer)
                });
            };
            process.parentPort.on('message', (e) => withPorts(e.ports));
        });
    }
    else if (extHostConnection.type === 2 /* ExtHostConnectionType.Socket */) {
        return new Promise((resolve, reject) => {
            let protocol = null;
            const timer = setTimeout(() => {
                onTerminate('VSCODE_EXTHOST_IPC_SOCKET timeout');
            }, 60000);
            const reconnectionGraceTime = 10800000 /* ProtocolConstants.ReconnectionGraceTime */;
            const reconnectionShortGraceTime = 300000 /* ProtocolConstants.ReconnectionShortGraceTime */;
            const disconnectRunner1 = new ProcessTimeRunOnceScheduler(() => onTerminate('renderer disconnected for too long (1)'), reconnectionGraceTime);
            const disconnectRunner2 = new ProcessTimeRunOnceScheduler(() => onTerminate('renderer disconnected for too long (2)'), reconnectionShortGraceTime);
            process.on('message', (msg, handle) => {
                if (msg && msg.type === 'VSCODE_EXTHOST_IPC_SOCKET') {
                    // Disable Nagle's algorithm. We also do this on the server process,
                    // but nodejs doesn't document if this option is transferred with the socket
                    handle.setNoDelay(true);
                    const initialDataChunk = VSBuffer.wrap(Buffer.from(msg.initialDataChunk, 'base64'));
                    let socket;
                    if (msg.skipWebSocketFrames) {
                        socket = new NodeSocket(handle, 'extHost-socket');
                    }
                    else {
                        const inflateBytes = VSBuffer.wrap(Buffer.from(msg.inflateBytes, 'base64'));
                        socket = new WebSocketNodeSocket(new NodeSocket(handle, 'extHost-socket'), msg.permessageDeflate, inflateBytes, false);
                    }
                    if (protocol) {
                        // reconnection case
                        disconnectRunner1.cancel();
                        disconnectRunner2.cancel();
                        protocol.beginAcceptReconnection(socket, initialDataChunk);
                        protocol.endAcceptReconnection();
                        protocol.sendResume();
                    }
                    else {
                        clearTimeout(timer);
                        protocol = new PersistentProtocol({ socket, initialChunk: initialDataChunk });
                        protocol.sendResume();
                        protocol.onDidDispose(() => onTerminate('renderer disconnected'));
                        resolve(protocol);
                        // Wait for rich client to reconnect
                        protocol.onSocketClose(() => {
                            // The socket has closed, let's give the renderer a certain amount of time to reconnect
                            disconnectRunner1.schedule();
                        });
                    }
                }
                if (msg && msg.type === 'VSCODE_EXTHOST_IPC_REDUCE_GRACE_TIME') {
                    if (disconnectRunner2.isScheduled()) {
                        // we are disconnected and already running the short reconnection timer
                        return;
                    }
                    if (disconnectRunner1.isScheduled()) {
                        // we are disconnected and running the long reconnection timer
                        disconnectRunner2.schedule();
                    }
                }
            });
            // Now that we have managed to install a message listener, ask the other side to send us the socket
            const req = { type: 'VSCODE_EXTHOST_IPC_READY' };
            process.send?.(req);
        });
    }
    else {
        const pipeName = extHostConnection.pipeName;
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(pipeName, () => {
                socket.removeListener('error', reject);
                const protocol = new PersistentProtocol({ socket: new NodeSocket(socket, 'extHost-renderer') });
                protocol.sendResume();
                resolve(protocol);
            });
            socket.once('error', reject);
            socket.on('close', () => {
                onTerminate('renderer closed the socket');
            });
        });
    }
}
async function createExtHostProtocol() {
    const protocol = await _createExtHostProtocol();
    return new class {
        constructor() {
            this._onMessage = new BufferedEmitter();
            this.onMessage = this._onMessage.event;
            this._terminating = false;
            this._protocolListener = protocol.onMessage((msg) => {
                if (isMessageOfType(msg, 2 /* MessageType.Terminate */)) {
                    this._terminating = true;
                    this._protocolListener.dispose();
                    onTerminate('received terminate message from renderer');
                }
                else {
                    this._onMessage.fire(msg);
                }
            });
        }
        send(msg) {
            if (!this._terminating) {
                protocol.send(msg);
            }
        }
        async drain() {
            if (protocol.drain) {
                return protocol.drain();
            }
        }
    };
}
function connectToRenderer(protocol) {
    return new Promise((c) => {
        // Listen init data message
        const first = protocol.onMessage(raw => {
            first.dispose();
            const initData = JSON.parse(raw.toString());
            const rendererCommit = initData.commit;
            const myCommit = product.commit;
            if (rendererCommit && myCommit) {
                // Running in the built version where commits are defined
                if (rendererCommit !== myCommit) {
                    nativeExit(55 /* ExtensionHostExitCode.VersionMismatch */);
                }
            }
            if (initData.parentPid) {
                // Kill oneself if one's parent dies. Much drama.
                let epermErrors = 0;
                setInterval(function () {
                    try {
                        process.kill(initData.parentPid, 0); // throws an exception if the main process doesn't exist anymore.
                        epermErrors = 0;
                    }
                    catch (e) {
                        if (e && e.code === 'EPERM') {
                            // Even if the parent process is still alive,
                            // some antivirus software can lead to an EPERM error to be thrown here.
                            // Let's terminate only if we get 3 consecutive EPERM errors.
                            epermErrors++;
                            if (epermErrors >= 3) {
                                onTerminate(`parent process ${initData.parentPid} does not exist anymore (3 x EPERM): ${e.message} (code: ${e.code}) (errno: ${e.errno})`);
                            }
                        }
                        else {
                            onTerminate(`parent process ${initData.parentPid} does not exist anymore: ${e.message} (code: ${e.code}) (errno: ${e.errno})`);
                        }
                    }
                }, 1000);
                // In certain cases, the event loop can become busy and never yield
                // e.g. while-true or process.nextTick endless loops
                // So also use the native node module to do it from a separate thread
                let watchdog;
                try {
                    watchdog = require('native-watchdog');
                    watchdog.start(initData.parentPid);
                }
                catch (err) {
                    // no problem...
                    onUnexpectedError(err);
                }
            }
            // Tell the outside that we are initialized
            protocol.send(createMessageOfType(0 /* MessageType.Initialized */));
            c({ protocol, initData });
        });
        // Tell the outside that we are ready to receive messages
        protocol.send(createMessageOfType(1 /* MessageType.Ready */));
    });
}
async function startExtensionHostProcess() {
    // Print a console message when rejection isn't handled within N seconds. For details:
    // see https://nodejs.org/api/process.html#process_event_unhandledrejection
    // and https://nodejs.org/api/process.html#process_event_rejectionhandled
    const unhandledPromises = [];
    process.on('unhandledRejection', (reason, promise) => {
        unhandledPromises.push(promise);
        setTimeout(() => {
            const idx = unhandledPromises.indexOf(promise);
            if (idx >= 0) {
                promise.catch(e => {
                    unhandledPromises.splice(idx, 1);
                    if (!isCancellationError(e)) {
                        console.warn(`rejected promise not handled within 1 second: ${e}`);
                        if (e && e.stack) {
                            console.warn(`stack trace: ${e.stack}`);
                        }
                        if (reason) {
                            onUnexpectedError(reason);
                        }
                    }
                });
            }
        }, 1000);
    });
    process.on('rejectionHandled', (promise) => {
        const idx = unhandledPromises.indexOf(promise);
        if (idx >= 0) {
            unhandledPromises.splice(idx, 1);
        }
    });
    // Print a console message when an exception isn't handled.
    process.on('uncaughtException', function (err) {
        if (!isSigPipeError(err)) {
            onUnexpectedError(err);
        }
    });
    performance.mark(`code/extHost/willConnectToRenderer`);
    const protocol = await createExtHostProtocol();
    performance.mark(`code/extHost/didConnectToRenderer`);
    const renderer = await connectToRenderer(protocol);
    performance.mark(`code/extHost/didWaitForInitData`);
    const { initData } = renderer;
    // setup things
    patchProcess(!!initData.environment.extensionTestsLocationURI); // to support other test frameworks like Jasmin that use process.exit (https://github.com/microsoft/vscode/issues/37708)
    initData.environment.useHostProxy = args.useHostProxy !== undefined ? args.useHostProxy !== 'false' : undefined;
    initData.environment.skipWorkspaceStorageLock = boolean(args.skipWorkspaceStorageLock, false);
    // host abstraction
    const hostUtils = new class NodeHost {
        constructor() {
            this.pid = process.pid;
        }
        exit(code) { nativeExit(code); }
        fsExists(path) { return Promises.exists(path); }
        fsRealpath(path) { return realpath(path); }
    };
    // Attempt to load uri transformer
    let uriTransformer = null;
    if (initData.remote.authority && args.transformURIs) {
        uriTransformer = createURITransformer(initData.remote.authority);
    }
    const extensionHostMain = new ExtensionHostMain(renderer.protocol, initData, hostUtils, uriTransformer);
    // rewrite onTerminate-function to be a proper shutdown
    onTerminate = (reason) => extensionHostMain.terminate(reason);
}
startExtensionHostProcess().catch((err) => console.log(err));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dGVuc2lvbkhvc3RQcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUVoQyxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQztBQUMzQixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXhHLE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUM7QUFFbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFxQixNQUFNLDJDQUEyQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekUsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFXLE1BQU0sZ0NBQWdDLENBQUM7QUFFNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDM0QsT0FBTyxFQUF5QixxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3BILE9B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