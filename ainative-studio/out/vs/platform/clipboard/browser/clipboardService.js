/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BrowserClipboardService_1;
import { isSafari, isWebkitWebView } from '../../../base/browser/browser.js';
import { $, addDisposableListener, getActiveDocument, getActiveWindow, isHTMLElement, onDidRegisterWindow } from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
import { ILogService } from '../../log/common/log.js';
/**
 * Custom mime type used for storing a list of uris in the clipboard.
 *
 * Requires support for custom web clipboards https://github.com/w3c/clipboard-apis/pull/175
 */
const vscodeResourcesMime = 'application/vnd.code.resources';
let BrowserClipboardService = class BrowserClipboardService extends Disposable {
    static { BrowserClipboardService_1 = this; }
    constructor(layoutService, logService) {
        super();
        this.layoutService = layoutService;
        this.logService = logService;
        this.mapTextToType = new Map(); // unsupported in web (only in-memory)
        this.findText = ''; // unsupported in web (only in-memory)
        this.resources = []; // unsupported in web (only in-memory)
        this.resourcesStateHash = undefined;
        if (isSafari || isWebkitWebView) {
            this.installWebKitWriteTextWorkaround();
        }
        // Keep track of copy operations to reset our set of
        // copied resources: since we keep resources in memory
        // and not in the clipboard, we have to invalidate
        // that state when the user copies other data.
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(addDisposableListener(window.document, 'copy', () => this.clearResourcesState()));
        }, { window: mainWindow, disposables: this._store }));
    }
    async readImage() {
        try {
            const clipboardItems = await navigator.clipboard.read();
            const clipboardItem = clipboardItems[0];
            const supportedImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/tiff', 'image/bmp'];
            const mimeType = supportedImageTypes.find(type => clipboardItem.types.includes(type));
            if (mimeType) {
                const blob = await clipboardItem.getType(mimeType);
                const buffer = await blob.arrayBuffer();
                return new Uint8Array(buffer);
            }
            else {
                console.error('No supported image type found in the clipboard');
            }
        }
        catch (error) {
            console.error('Error reading image from clipboard:', error);
        }
        // Return an empty Uint8Array if no image is found or an error occurs
        return new Uint8Array(0);
    }
    // In Safari, it has the following note:
    //
    // "The request to write to the clipboard must be triggered during a user gesture.
    // A call to clipboard.write or clipboard.writeText outside the scope of a user
    // gesture(such as "click" or "touch" event handlers) will result in the immediate
    // rejection of the promise returned by the API call."
    // From: https://webkit.org/blog/10855/async-clipboard-api/
    //
    // Since extensions run in a web worker, and handle gestures in an asynchronous way,
    // they are not classified by Safari as "in response to a user gesture" and will reject.
    //
    // This function sets up some handlers to work around that behavior.
    installWebKitWriteTextWorkaround() {
        const handler = () => {
            const currentWritePromise = new DeferredPromise();
            // Cancel the previous promise since we just created a new one in response to this new event
            if (this.webKitPendingClipboardWritePromise && !this.webKitPendingClipboardWritePromise.isSettled) {
                this.webKitPendingClipboardWritePromise.cancel();
            }
            this.webKitPendingClipboardWritePromise = currentWritePromise;
            // The ctor of ClipboardItem allows you to pass in a promise that will resolve to a string.
            // This allows us to pass in a Promise that will either be cancelled by another event or
            // resolved with the contents of the first call to this.writeText.
            // see https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem/ClipboardItem#parameters
            getActiveWindow().navigator.clipboard.write([new ClipboardItem({
                    'text/plain': currentWritePromise.p,
                })]).catch(async (err) => {
                if (!(err instanceof Error) || err.name !== 'NotAllowedError' || !currentWritePromise.isRejected) {
                    this.logService.error(err);
                }
            });
        };
        this._register(Event.runAndSubscribe(this.layoutService.onDidAddContainer, ({ container, disposables }) => {
            disposables.add(addDisposableListener(container, 'click', handler));
            disposables.add(addDisposableListener(container, 'keydown', handler));
        }, { container: this.layoutService.mainContainer, disposables: this._store }));
    }
    async writeText(text, type) {
        // Clear resources given we are writing text
        this.clearResourcesState();
        // With type: only in-memory is supported
        if (type) {
            this.mapTextToType.set(type, text);
            return;
        }
        if (this.webKitPendingClipboardWritePromise) {
            // For Safari, we complete this Promise which allows the call to `navigator.clipboard.write()`
            // above to resolve and successfully copy to the clipboard. If we let this continue, Safari
            // would throw an error because this call stack doesn't appear to originate from a user gesture.
            return this.webKitPendingClipboardWritePromise.complete(text);
        }
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            return await getActiveWindow().navigator.clipboard.writeText(text);
        }
        catch (error) {
            console.error(error);
        }
        // Fallback to textarea and execCommand solution
        this.fallbackWriteText(text);
    }
    fallbackWriteText(text) {
        const activeDocument = getActiveDocument();
        const activeElement = activeDocument.activeElement;
        const textArea = activeDocument.body.appendChild($('textarea', { 'aria-hidden': true }));
        textArea.style.height = '1px';
        textArea.style.width = '1px';
        textArea.style.position = 'absolute';
        textArea.value = text;
        textArea.focus();
        textArea.select();
        activeDocument.execCommand('copy');
        if (isHTMLElement(activeElement)) {
            activeElement.focus();
        }
        textArea.remove();
    }
    async readText(type) {
        // With type: only in-memory is supported
        if (type) {
            return this.mapTextToType.get(type) || '';
        }
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            return await getActiveWindow().navigator.clipboard.readText();
        }
        catch (error) {
            console.error(error);
        }
        return '';
    }
    async readFindText() {
        return this.findText;
    }
    async writeFindText(text) {
        this.findText = text;
    }
    static { this.MAX_RESOURCE_STATE_SOURCE_LENGTH = 1000; }
    async writeResources(resources) {
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            await getActiveWindow().navigator.clipboard.write([
                new ClipboardItem({
                    [`web ${vscodeResourcesMime}`]: new Blob([
                        JSON.stringify(resources.map(x => x.toJSON()))
                    ], {
                        type: vscodeResourcesMime
                    })
                })
            ]);
            // Continue to write to the in-memory clipboard as well.
            // This is needed because some browsers allow the paste but then can't read the custom resources.
        }
        catch (error) {
            // Noop
        }
        if (resources.length === 0) {
            this.clearResourcesState();
        }
        else {
            this.resources = resources;
            this.resourcesStateHash = await this.computeResourcesStateHash();
        }
    }
    async readResources() {
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            const items = await getActiveWindow().navigator.clipboard.read();
            for (const item of items) {
                if (item.types.includes(`web ${vscodeResourcesMime}`)) {
                    const blob = await item.getType(`web ${vscodeResourcesMime}`);
                    const resources = JSON.parse(await blob.text()).map(x => URI.from(x));
                    return resources;
                }
            }
        }
        catch (error) {
            // Noop
        }
        const resourcesStateHash = await this.computeResourcesStateHash();
        if (this.resourcesStateHash !== resourcesStateHash) {
            this.clearResourcesState(); // state mismatch, resources no longer valid
        }
        return this.resources;
    }
    async computeResourcesStateHash() {
        if (this.resources.length === 0) {
            return undefined; // no resources, no hash needed
        }
        // Resources clipboard is managed in-memory only and thus
        // fails to invalidate when clipboard data is changing.
        // As such, we compute the hash of the current clipboard
        // and use that to later validate the resources clipboard.
        const clipboardText = await this.readText();
        return hash(clipboardText.substring(0, BrowserClipboardService_1.MAX_RESOURCE_STATE_SOURCE_LENGTH));
    }
    async hasResources() {
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            const items = await getActiveWindow().navigator.clipboard.read();
            for (const item of items) {
                if (item.types.includes(`web ${vscodeResourcesMime}`)) {
                    return true;
                }
            }
        }
        catch (error) {
            // Noop
        }
        return this.resources.length > 0;
    }
    clearInternalState() {
        this.clearResourcesState();
    }
    clearResourcesState() {
        this.resources = [];
        this.resourcesStateHash = undefined;
    }
};
BrowserClipboardService = BrowserClipboardService_1 = __decorate([
    __param(0, ILayoutService),
    __param(1, ILogService)
], BrowserClipboardService);
export { BrowserClipboardService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jbGlwYm9hcmQvYnJvd3Nlci9jbGlwYm9hcmRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2hKLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEQ7Ozs7R0FJRztBQUNILE1BQU0sbUJBQW1CLEdBQUcsZ0NBQWdDLENBQUM7QUFFdEQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVOztJQUl0RCxZQUNpQixhQUE4QyxFQUNqRCxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQztRQUh5QixrQkFBYSxHQUFiLGFBQWEsQ0FB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