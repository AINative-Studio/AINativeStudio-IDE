/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from './trustedTypes.js';
import { onUnexpectedError } from '../common/errors.js';
import { COI } from '../common/network.js';
import { URI } from '../common/uri.js';
import { WebWorkerClient } from '../common/worker/webWorker.js';
import { Disposable, toDisposable } from '../common/lifecycle.js';
import { coalesce } from '../common/arrays.js';
import { getNLSLanguage, getNLSMessages } from '../../nls.js';
import { Emitter } from '../common/event.js';
// Reuse the trusted types policy defined from worker bootstrap
// when available.
// Refs https://github.com/microsoft/vscode/issues/222193
let ttPolicy;
if (typeof self === 'object' && self.constructor && self.constructor.name === 'DedicatedWorkerGlobalScope' && globalThis.workerttPolicy !== undefined) {
    ttPolicy = globalThis.workerttPolicy;
}
else {
    ttPolicy = createTrustedTypesPolicy('defaultWorkerFactory', { createScriptURL: value => value });
}
export function createBlobWorker(blobUrl, options) {
    if (!blobUrl.startsWith('blob:')) {
        throw new URIError('Not a blob-url: ' + blobUrl);
    }
    return new Worker(ttPolicy ? ttPolicy.createScriptURL(blobUrl) : blobUrl, { ...options, type: 'module' });
}
function getWorker(descriptor, id) {
    const label = descriptor.label || 'anonymous' + id;
    const monacoEnvironment = globalThis.MonacoEnvironment;
    if (monacoEnvironment) {
        if (typeof monacoEnvironment.getWorker === 'function') {
            return monacoEnvironment.getWorker('workerMain.js', label);
        }
        if (typeof monacoEnvironment.getWorkerUrl === 'function') {
            const workerUrl = monacoEnvironment.getWorkerUrl('workerMain.js', label);
            return new Worker(ttPolicy ? ttPolicy.createScriptURL(workerUrl) : workerUrl, { name: label, type: 'module' });
        }
    }
    const esmWorkerLocation = descriptor.esmModuleLocation;
    if (esmWorkerLocation) {
        const workerUrl = getWorkerBootstrapUrl(label, esmWorkerLocation.toString(true));
        const worker = new Worker(ttPolicy ? ttPolicy.createScriptURL(workerUrl) : workerUrl, { name: label, type: 'module' });
        return whenESMWorkerReady(worker);
    }
    throw new Error(`You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker`);
}
function getWorkerBootstrapUrl(label, workerScriptUrl) {
    if (/^((http:)|(https:)|(file:))/.test(workerScriptUrl) && workerScriptUrl.substring(0, globalThis.origin.length) !== globalThis.origin) {
        // this is the cross-origin case
        // i.e. the webpage is running at a different origin than where the scripts are loaded from
    }
    else {
        const start = workerScriptUrl.lastIndexOf('?');
        const end = workerScriptUrl.lastIndexOf('#', start);
        const params = start > 0
            ? new URLSearchParams(workerScriptUrl.substring(start + 1, ~end ? end : undefined))
            : new URLSearchParams();
        COI.addSearchParam(params, true, true);
        const search = params.toString();
        if (!search) {
            workerScriptUrl = `${workerScriptUrl}#${label}`;
        }
        else {
            workerScriptUrl = `${workerScriptUrl}?${params.toString()}#${label}`;
        }
    }
    // In below blob code, we are using JSON.stringify to ensure the passed
    // in values are not breaking our script. The values may contain string
    // terminating characters (such as ' or ").
    const blob = new Blob([coalesce([
            `/*${label}*/`,
            `globalThis._VSCODE_NLS_MESSAGES = ${JSON.stringify(getNLSMessages())};`,
            `globalThis._VSCODE_NLS_LANGUAGE = ${JSON.stringify(getNLSLanguage())};`,
            `globalThis._VSCODE_FILE_ROOT = ${JSON.stringify(globalThis._VSCODE_FILE_ROOT)};`,
            `const ttPolicy = globalThis.trustedTypes?.createPolicy('defaultWorkerFactory', { createScriptURL: value => value });`,
            `globalThis.workerttPolicy = ttPolicy;`,
            `await import(ttPolicy?.createScriptURL(${JSON.stringify(workerScriptUrl)}) ?? ${JSON.stringify(workerScriptUrl)});`,
            `globalThis.postMessage({ type: 'vscode-worker-ready' });`,
            `/*${label}*/`
        ]).join('')], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}
function whenESMWorkerReady(worker) {
    return new Promise((resolve, reject) => {
        worker.onmessage = function (e) {
            if (e.data.type === 'vscode-worker-ready') {
                worker.onmessage = null;
                resolve(worker);
            }
        };
        worker.onerror = reject;
    });
}
function isPromiseLike(obj) {
    if (typeof obj.then === 'function') {
        return true;
    }
    return false;
}
/**
 * A worker that uses HTML5 web workers so that is has
 * its own global scope and its own thread.
 */
class WebWorker extends Disposable {
    static { this.LAST_WORKER_ID = 0; }
    constructor(descriptorOrWorker) {
        super();
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this.id = ++WebWorker.LAST_WORKER_ID;
        const workerOrPromise = (descriptorOrWorker instanceof Worker
            ? descriptorOrWorker
            : getWorker(descriptorOrWorker, this.id));
        if (isPromiseLike(workerOrPromise)) {
            this.worker = workerOrPromise;
        }
        else {
            this.worker = Promise.resolve(workerOrPromise);
        }
        this.postMessage('-please-ignore-', []); // TODO: Eliminate this extra message
        const errorHandler = (ev) => {
            this._onError.fire(ev);
        };
        this.worker.then((w) => {
            w.onmessage = (ev) => {
                this._onMessage.fire(ev.data);
            };
            w.onmessageerror = (ev) => {
                this._onError.fire(ev);
            };
            if (typeof w.addEventListener === 'function') {
                w.addEventListener('error', errorHandler);
            }
        });
        this._register(toDisposable(() => {
            this.worker?.then(w => {
                w.onmessage = null;
                w.onmessageerror = null;
                w.removeEventListener('error', errorHandler);
                w.terminate();
            });
            this.worker = null;
        }));
    }
    getId() {
        return this.id;
    }
    postMessage(message, transfer) {
        this.worker?.then(w => {
            try {
                w.postMessage(message, transfer);
            }
            catch (err) {
                onUnexpectedError(err);
                onUnexpectedError(new Error(`FAILED to post message to worker`, { cause: err }));
            }
        });
    }
}
export class WebWorkerDescriptor {
    constructor(esmModuleLocation, label) {
        this.esmModuleLocation = esmModuleLocation;
        this.label = label;
    }
}
export function createWebWorker(arg0, arg1) {
    const workerDescriptorOrWorker = (URI.isUri(arg0) ? new WebWorkerDescriptor(arg0, arg1) : arg0);
    return new WebWorkerClient(new WebWorker(workerDescriptorOrWorker));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvd2ViV29ya2VyRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDM0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZDLE9BQU8sRUFBeUMsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkcsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTdDLCtEQUErRDtBQUMvRCxrQkFBa0I7QUFDbEIseURBQXlEO0FBQ3pELElBQUksUUFBcUQsQ0FBQztBQUMxRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLDRCQUE0QixJQUFLLFVBQWtCLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO0lBQ2hLLFFBQVEsR0FBSSxVQUFrQixDQUFDLGNBQWMsQ0FBQztBQUMvQyxDQUFDO0tBQU0sQ0FBQztJQUNQLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyxz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