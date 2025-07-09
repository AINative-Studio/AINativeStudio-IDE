/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { isMessageOfType, createMessageOfType } from '../../services/extensions/common/extensionHostProtocol.js';
import { ExtensionHostMain } from '../common/extensionHostMain.js';
import { NestedWorker } from '../../services/extensions/worker/polyfillNestedWorker.js';
import * as path from '../../../base/common/path.js';
import * as performance from '../../../base/common/performance.js';
import '../common/extHost.common.services.js';
import './extHost.worker.services.js';
import { FileAccess } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
const nativeClose = self.close.bind(self);
self.close = () => console.trace(`'close' has been blocked`);
const nativePostMessage = postMessage.bind(self);
self.postMessage = () => console.trace(`'postMessage' has been blocked`);
function shouldTransformUri(uri) {
    // In principle, we could convert any URI, but we have concerns
    // that parsing https URIs might end up decoding escape characters
    // and result in an unintended transformation
    return /^(file|vscode-remote):/i.test(uri);
}
const nativeFetch = fetch.bind(self);
function patchFetching(asBrowserUri) {
    self.fetch = async function (input, init) {
        if (input instanceof Request) {
            // Request object - massage not supported
            return nativeFetch(input, init);
        }
        if (shouldTransformUri(String(input))) {
            input = (await asBrowserUri(URI.parse(String(input)))).toString(true);
        }
        return nativeFetch(input, init);
    };
    self.XMLHttpRequest = class extends XMLHttpRequest {
        open(method, url, async, username, password) {
            (async () => {
                if (shouldTransformUri(url.toString())) {
                    url = (await asBrowserUri(URI.parse(url.toString()))).toString(true);
                }
                super.open(method, url, async ?? true, username, password);
            })();
        }
    };
}
self.importScripts = () => { throw new Error(`'importScripts' has been blocked`); };
// const nativeAddEventListener = addEventListener.bind(self);
self.addEventListener = () => console.trace(`'addEventListener' has been blocked`);
self['AMDLoader'] = undefined;
self['NLSLoaderPlugin'] = undefined;
self['define'] = undefined;
self['require'] = undefined;
self['webkitRequestFileSystem'] = undefined;
self['webkitRequestFileSystemSync'] = undefined;
self['webkitResolveLocalFileSystemSyncURL'] = undefined;
self['webkitResolveLocalFileSystemURL'] = undefined;
if (self.Worker) {
    // make sure new Worker(...) always uses blob: (to maintain current origin)
    const _Worker = self.Worker;
    Worker = function (stringUrl, options) {
        if (/^file:/i.test(stringUrl.toString())) {
            stringUrl = FileAccess.uriToBrowserUri(URI.parse(stringUrl.toString())).toString(true);
        }
        else if (/^vscode-remote:/i.test(stringUrl.toString())) {
            // Supporting transformation of vscode-remote URIs requires an async call to the main thread,
            // but we cannot do this call from within the embedded Worker, and the only way out would be
            // to use templating instead of a function in the web api (`resourceUriProvider`)
            throw new Error(`Creating workers from remote extensions is currently not supported.`);
        }
        // IMPORTANT: bootstrapFn is stringified and injected as worker blob-url. Because of that it CANNOT
        // have dependencies on other functions or variables. Only constant values are supported. Due to
        // that logic of FileAccess.asBrowserUri had to be copied, see `asWorkerBrowserUrl` (below).
        const bootstrapFnSource = (function bootstrapFn(workerUrl) {
            function asWorkerBrowserUrl(url) {
                if (typeof url === 'string' || url instanceof URL) {
                    return String(url).replace(/^file:\/\//i, 'vscode-file://vscode-app');
                }
                return url;
            }
            const nativeFetch = fetch.bind(self);
            self.fetch = function (input, init) {
                if (input instanceof Request) {
                    // Request object - massage not supported
                    return nativeFetch(input, init);
                }
                return nativeFetch(asWorkerBrowserUrl(input), init);
            };
            self.XMLHttpRequest = class extends XMLHttpRequest {
                open(method, url, async, username, password) {
                    return super.open(method, asWorkerBrowserUrl(url), async ?? true, username, password);
                }
            };
            const nativeImportScripts = importScripts.bind(self);
            self.importScripts = (...urls) => {
                nativeImportScripts(...urls.map(asWorkerBrowserUrl));
            };
            nativeImportScripts(workerUrl);
        }).toString();
        const js = `(${bootstrapFnSource}('${stringUrl}'))`;
        options = options || {};
        options.name = `${name} -> ${options.name || path.basename(stringUrl.toString())}`;
        const blob = new Blob([js], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        return new _Worker(blobUrl, options);
    };
}
else {
    self.Worker = class extends NestedWorker {
        constructor(stringOrUrl, options) {
            super(nativePostMessage, stringOrUrl, { name: path.basename(stringOrUrl.toString()), ...options });
        }
    };
}
//#endregion ---
const hostUtil = new class {
    constructor() {
        this.pid = undefined;
    }
    exit(_code) {
        nativeClose();
    }
};
class ExtensionWorker {
    constructor() {
        const channel = new MessageChannel();
        const emitter = new Emitter();
        let terminating = false;
        // send over port2, keep port1
        nativePostMessage(channel.port2, [channel.port2]);
        channel.port1.onmessage = event => {
            const { data } = event;
            if (!(data instanceof ArrayBuffer)) {
                console.warn('UNKNOWN data received', data);
                return;
            }
            const msg = VSBuffer.wrap(new Uint8Array(data, 0, data.byteLength));
            if (isMessageOfType(msg, 2 /* MessageType.Terminate */)) {
                // handle terminate-message right here
                terminating = true;
                onTerminate('received terminate message from renderer');
                return;
            }
            // emit non-terminate messages to the outside
            emitter.fire(msg);
        };
        this.protocol = {
            onMessage: emitter.event,
            send: vsbuf => {
                if (!terminating) {
                    const data = vsbuf.buffer.buffer.slice(vsbuf.buffer.byteOffset, vsbuf.buffer.byteOffset + vsbuf.buffer.byteLength);
                    channel.port1.postMessage(data, [data]);
                }
            }
        };
    }
}
function connectToRenderer(protocol) {
    return new Promise(resolve => {
        const once = protocol.onMessage(raw => {
            once.dispose();
            const initData = JSON.parse(raw.toString());
            protocol.send(createMessageOfType(0 /* MessageType.Initialized */));
            resolve({ protocol, initData });
        });
        protocol.send(createMessageOfType(1 /* MessageType.Ready */));
    });
}
let onTerminate = (reason) => nativeClose();
function isInitMessage(a) {
    return !!a && typeof a === 'object' && a.type === 'vscode.init' && a.data instanceof Map;
}
export function create() {
    performance.mark(`code/extHost/willConnectToRenderer`);
    const res = new ExtensionWorker();
    return {
        onmessage(message) {
            if (!isInitMessage(message)) {
                return; // silently ignore foreign messages
            }
            connectToRenderer(res.protocol).then(data => {
                performance.mark(`code/extHost/didWaitForInitData`);
                const extHostMain = new ExtensionHostMain(data.protocol, data.initData, hostUtil, null, message.data);
                patchFetching(uri => extHostMain.asBrowserUri(uri));
                onTerminate = (reason) => extHostMain.terminate(reason);
            });
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3dvcmtlci9leHRlbnNpb25Ib3N0V29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBZSxtQkFBbUIsRUFBMEIsTUFBTSwyREFBMkQsQ0FBQztBQUN0SixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDeEYsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFDO0FBRW5FLE9BQU8sc0NBQXNDLENBQUM7QUFDOUMsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBcUJsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQyxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUU3RCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakQsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLEVBQUUs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