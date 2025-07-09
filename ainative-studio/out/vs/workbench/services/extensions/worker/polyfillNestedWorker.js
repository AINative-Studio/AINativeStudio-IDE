/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const _bootstrapFnSource = (function _bootstrapFn(workerUrl) {
    const listener = (event) => {
        // uninstall handler
        globalThis.removeEventListener('message', listener);
        // get data
        const port = event.data;
        // postMessage
        // onmessage
        Object.defineProperties(globalThis, {
            'postMessage': {
                value(data, transferOrOptions) {
                    port.postMessage(data, transferOrOptions);
                }
            },
            'onmessage': {
                get() {
                    return port.onmessage;
                },
                set(value) {
                    port.onmessage = value;
                }
            }
            // todo onerror
        });
        port.addEventListener('message', msg => {
            globalThis.dispatchEvent(new MessageEvent('message', { data: msg.data, ports: msg.ports ? [...msg.ports] : undefined }));
        });
        port.start();
        // fake recursively nested worker
        globalThis.Worker = class {
            constructor() { throw new TypeError('Nested workers from within nested worker are NOT supported.'); }
        };
        // load module
        importScripts(workerUrl);
    };
    globalThis.addEventListener('message', listener);
}).toString();
export class NestedWorker extends EventTarget {
    constructor(nativePostMessage, stringOrUrl, options) {
        super();
        this.onmessage = null;
        this.onmessageerror = null;
        this.onerror = null;
        // create bootstrap script
        const bootstrap = `((${_bootstrapFnSource})('${stringOrUrl}'))`;
        const blob = new Blob([bootstrap], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const channel = new MessageChannel();
        const id = blobUrl; // works because blob url is unique, needs ID pool otherwise
        const msg = {
            type: '_newWorker',
            id,
            port: channel.port2,
            url: blobUrl,
            options,
        };
        nativePostMessage(msg, [channel.port2]);
        // worker-impl: functions
        this.postMessage = channel.port1.postMessage.bind(channel.port1);
        this.terminate = () => {
            const msg = {
                type: '_terminateWorker',
                id
            };
            nativePostMessage(msg);
            URL.revokeObjectURL(blobUrl);
            channel.port1.close();
            channel.port2.close();
        };
        // worker-impl: events
        Object.defineProperties(this, {
            'onmessage': {
                get() {
                    return channel.port1.onmessage;
                },
                set(value) {
                    channel.port1.onmessage = value;
                }
            },
            'onmessageerror': {
                get() {
                    return channel.port1.onmessageerror;
                },
                set(value) {
                    channel.port1.onmessageerror = value;
                }
            },
            // todo onerror
        });
        channel.port1.addEventListener('messageerror', evt => {
            const msgEvent = new MessageEvent('messageerror', { data: evt.data });
            this.dispatchEvent(msgEvent);
        });
        channel.port1.addEventListener('message', evt => {
            const msgEvent = new MessageEvent('message', { data: evt.data });
            this.dispatchEvent(msgEvent);
        });
        channel.port1.start();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9seWZpbGxOZXN0ZWRXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvd29ya2VyL3BvbHlmaWxsTmVzdGVkV29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBUWhHLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxTQUFTLFlBQVksQ0FBQyxTQUFpQjtJQUVsRSxNQUFNLFFBQVEsR0FBa0IsQ0FBQyxLQUFZLEVBQVEsRUFBRTtRQUN0RCxvQkFBb0I7UUFDcEIsVUFBVSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVwRCxXQUFXO1FBQ1gsTUFBTSxJQUFJLEdBQStCLEtBQU0sQ0FBQyxJQUFJLENBQUM7UUFFckQsY0FBYztRQUNkLFlBQVk7UUFDWixNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFO1lBQ25DLGFBQWEsRUFBRTtnQkFDZCxLQUFLLENBQUMsSUFBUyxFQUFFLGlCQUF1QjtvQkFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztnQkFDM0MsQ0FBQzthQUNEO1lBQ0QsV0FBVyxFQUFFO2dCQUNaLEdBQUc7b0JBQ0YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUN2QixDQUFDO2dCQUNELEdBQUcsQ0FBQyxLQUEwQjtvQkFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3hCLENBQUM7YUFDRDtZQUNELGVBQWU7U0FDZixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3RDLFVBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFF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