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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NsaXBib2FyZC9icm93c2VyL2NsaXBib2FyZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0UsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDaEosT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFbEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RDs7OztHQUlHO0FBQ0gsTUFBTSxtQkFBbUIsR0FBRyxnQ0FBZ0MsQ0FBQztBQUV0RCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7O0lBSXRELFlBQ2lCLGFBQThDLEVBQ2pELFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBSHlCLGtCQUFhLEdBQWIsYUFBYSxDQUFn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