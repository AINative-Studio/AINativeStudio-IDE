/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { toExtensionData, shouldSerializeBuffersForPostMessage } from './extHostWebview.js';
import { ViewBadge } from './extHostTypeConverters.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as extHostTypes from './extHostTypes.js';
/* eslint-disable local/code-no-native-private */
class ExtHostWebviewView extends Disposable {
    #handle;
    #proxy;
    #viewType;
    #webview;
    #isDisposed;
    #isVisible;
    #title;
    #description;
    #badge;
    constructor(handle, proxy, viewType, title, webview, isVisible) {
        super();
        this.#isDisposed = false;
        this.#onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this.#onDidChangeVisibility.event;
        this.#onDidDispose = this._register(new Emitter());
        this.onDidDispose = this.#onDidDispose.event;
        this.#viewType = viewType;
        this.#title = title;
        this.#handle = handle;
        this.#proxy = proxy;
        this.#webview = webview;
        this.#isVisible = isVisible;
    }
    dispose() {
        if (this.#isDisposed) {
            return;
        }
        this.#isDisposed = true;
        this.#onDidDispose.fire();
        this.#webview.dispose();
        super.dispose();
    }
    #onDidChangeVisibility;
    #onDidDispose;
    get title() {
        this.assertNotDisposed();
        return this.#title;
    }
    set title(value) {
        this.assertNotDisposed();
        if (this.#title !== value) {
            this.#title = value;
            this.#proxy.$setWebviewViewTitle(this.#handle, value);
        }
    }
    get description() {
        this.assertNotDisposed();
        return this.#description;
    }
    set description(value) {
        this.assertNotDisposed();
        if (this.#description !== value) {
            this.#description = value;
            this.#proxy.$setWebviewViewDescription(this.#handle, value);
        }
    }
    get visible() { return this.#isVisible; }
    get webview() { return this.#webview; }
    get viewType() { return this.#viewType; }
    /* internal */ _setVisible(visible) {
        if (visible === this.#isVisible || this.#isDisposed) {
            return;
        }
        this.#isVisible = visible;
        this.#onDidChangeVisibility.fire();
    }
    get badge() {
        this.assertNotDisposed();
        return this.#badge;
    }
    set badge(badge) {
        this.assertNotDisposed();
        if (badge?.value === this.#badge?.value &&
            badge?.tooltip === this.#badge?.tooltip) {
            return;
        }
        this.#badge = ViewBadge.from(badge);
        this.#proxy.$setWebviewViewBadge(this.#handle, badge);
    }
    show(preserveFocus) {
        this.assertNotDisposed();
        this.#proxy.$show(this.#handle, !!preserveFocus);
    }
    assertNotDisposed() {
        if (this.#isDisposed) {
            throw new Error('Webview is disposed');
        }
    }
}
export class ExtHostWebviewViews {
    constructor(mainContext, _extHostWebview) {
        this._extHostWebview = _extHostWebview;
        this._viewProviders = new Map();
        this._webviewViews = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWebviewViews);
    }
    registerWebviewViewProvider(extension, viewType, provider, webviewOptions) {
        if (this._viewProviders.has(viewType)) {
            throw new Error(`View provider for '${viewType}' already registered`);
        }
        this._viewProviders.set(viewType, { provider, extension });
        this._proxy.$registerWebviewViewProvider(toExtensionData(extension), viewType, {
            retainContextWhenHidden: webviewOptions?.retainContextWhenHidden,
            serializeBuffersForPostMessage: shouldSerializeBuffersForPostMessage(extension),
        });
        return new extHostTypes.Disposable(() => {
            this._viewProviders.delete(viewType);
            this._proxy.$unregisterWebviewViewProvider(viewType);
        });
    }
    async $resolveWebviewView(webviewHandle, viewType, title, state, cancellation) {
        const entry = this._viewProviders.get(viewType);
        if (!entry) {
            throw new Error(`No view provider found for '${viewType}'`);
        }
        const { provider, extension } = entry;
        const webview = this._extHostWebview.createNewWebview(webviewHandle, { /* todo */}, extension);
        const revivedView = new ExtHostWebviewView(webviewHandle, this._proxy, viewType, title, webview, true);
        this._webviewViews.set(webviewHandle, revivedView);
        await provider.resolveWebviewView(revivedView, { state }, cancellation);
    }
    async $onDidChangeWebviewViewVisibility(webviewHandle, visible) {
        const webviewView = this.getWebviewView(webviewHandle);
        webviewView._setVisible(visible);
    }
    async $disposeWebviewView(webviewHandle) {
        const webviewView = this.getWebviewView(webviewHandle);
        this._webviewViews.delete(webviewHandle);
        webviewView.dispose();
        this._extHostWebview.deleteWebview(webviewHandle);
    }
    getWebviewView(handle) {
        const entry = this._webviewViews.get(handle);
        if (!entry) {
            throw new Error('No webview found');
        }
        return entry;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFdlYnZpZXdWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0QsT0FBTyxFQUFtQyxlQUFlLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM3SCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFdkQsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFDO0FBRWxELGlEQUFpRDtBQUVqRCxNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFFakMsT0FBTyxDQUFnQztJQUN2QyxNQUFNLENBQThDO0lBRXBELFNBQVMsQ0FBUztJQUNsQixRQUFRLENBQWlCO0lBRWxDLFdBQVcsQ0FBUztJQUNwQixVQUFVLENBQVU7SUFDcEIsTUFBTSxDQUFxQjtJQUMzQixZQUFZLENBQXFCO0lBQ2pDLE1BQU0sQ0FBK0I7SUFFckMsWUFDQyxNQUFxQyxFQUNyQyxLQUFrRCxFQUNsRCxRQUFnQixFQUNoQixLQUF5QixFQUN6QixPQUF1QixFQUN2QixTQUFrQjtRQUVsQixLQUFLLEVBQUUsQ0FBQztRQWRULGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBcUNYLDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ3RELDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxL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