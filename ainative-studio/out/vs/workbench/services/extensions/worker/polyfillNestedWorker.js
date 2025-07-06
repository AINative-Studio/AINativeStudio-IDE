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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9seWZpbGxOZXN0ZWRXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy93b3JrZXIvcG9seWZpbGxOZXN0ZWRXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFNBQVMsWUFBWSxDQUFDLFNBQWlCO0lBRWxFLE1BQU0sUUFBUSxHQUFrQixDQUFDLEtBQVksRUFBUSxFQUFFO1FBQ3RELG9CQUFvQjtRQUNwQixVQUFVLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXBELFdBQVc7UUFDWCxNQUFNLElBQUksR0FBK0IsS0FBTSxDQUFDLElBQUksQ0FBQztRQUVyRCxjQUFjO1FBQ2QsWUFBWTtRQUNaLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUU7WUFDbkMsYUFBYSxFQUFFO2dCQUNkLEtBQUssQ0FBQyxJQUFTLEVBQUUsaUJBQXVCO29CQUN2QyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO2dCQUMzQyxDQUFDO2FBQ0Q7WUFDRCxXQUFXLEVBQUU7Z0JBQ1osR0FBRztvQkFDRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ3ZCLENBQUM7Z0JBQ0QsR0FBRyxDQUFDLEtBQTBCO29CQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDeEIsQ0FBQzthQUNEO1lBQ0QsZUFBZTtTQUNmLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDdEMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUs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