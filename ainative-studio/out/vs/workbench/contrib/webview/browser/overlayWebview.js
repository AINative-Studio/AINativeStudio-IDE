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
import { getWindowById } from '../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../base/browser/fastDomNode.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IWebviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE } from './webview.js';
/**
 * Webview that is absolutely positioned over another element and that can creates and destroys an underlying webview as needed.
 */
let OverlayWebview = class OverlayWebview extends Disposable {
    get window() { return getWindowById(this._windowId, true).window; }
    constructor(initInfo, _layoutService, _webviewService, _baseContextKeyService) {
        super();
        this._layoutService = _layoutService;
        this._webviewService = _webviewService;
        this._baseContextKeyService = _baseContextKeyService;
        this._isFirstLoad = true;
        this._firstLoadPendingMessages = new Set();
        this._webview = this._register(new MutableDisposable());
        this._webviewEvents = this._register(new DisposableStore());
        this._html = '';
        this._initialScrollProgress = 0;
        this._state = undefined;
        this._owner = undefined;
        this._windowId = undefined;
        this._scopedContextKeyService = this._register(new MutableDisposable());
        this._shouldShowFindWidgetOnRestore = false;
        this._isDisposed = false;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidClickLink = this._register(new Emitter());
        this.onDidClickLink = this._onDidClickLink.event;
        this._onDidReload = this._register(new Emitter());
        this.onDidReload = this._onDidReload.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidUpdateState = this._register(new Emitter());
        this.onDidUpdateState = this._onDidUpdateState.event;
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onMissingCsp = this._register(new Emitter());
        this.onMissingCsp = this._onMissingCsp.event;
        this._onDidWheel = this._register(new Emitter());
        this.onDidWheel = this._onDidWheel.event;
        this._onFatalError = this._register(new Emitter());
        this.onFatalError = this._onFatalError.event;
        this.providedViewType = initInfo.providedViewType;
        this.origin = initInfo.origin ?? generateUuid();
        this._title = initInfo.title;
        this._extension = initInfo.extension;
        this._options = initInfo.options;
        this._contentOptions = initInfo.contentOptions;
    }
    get isFocused() {
        return !!this._webview.value?.isFocused;
    }
    dispose() {
        this._isDisposed = true;
        this._container?.domNode.remove();
        this._container = undefined;
        for (const msg of this._firstLoadPendingMessages) {
            msg.resolve(false);
        }
        this._firstLoadPendingMessages.clear();
        this._onDidDispose.fire();
        super.dispose();
    }
    get container() {
        if (this._isDisposed) {
            throw new Error(`OverlayWebview has been disposed`);
        }
        if (!this._container) {
            const node = document.createElement('div');
            node.style.position = 'absolute';
            node.style.overflow = 'hidden';
            this._container = new FastDomNode(node);
            this._container.setVisibility('hidden');
            // Webviews cannot be reparented in the dom as it will destroy their contents.
            // Mount them to a high level node to avoid this.
            this._layoutService.getContainer(this.window).appendChild(node);
        }
        return this._container.domNode;
    }
    claim(owner, targetWindow, scopedContextKeyService) {
        if (this._isDisposed) {
            return;
        }
        const oldOwner = this._owner;
        if (this._windowId !== targetWindow.vscodeWindowId) {
            // moving to a new window
            this.release(oldOwner);
            // since we are moving to a new window, we need to dispose the webview and recreate
            this._webview.clear();
            this._webviewEvents.clear();
            this._container?.domNode.remove();
            this._container = undefined;
        }
        this._owner = owner;
        this._windowId = targetWindow.vscodeWindowId;
        this._show(targetWindow);
        if (oldOwner !== owner) {
            const contextKeyService = (scopedContextKeyService || this._baseContextKeyService);
            // Explicitly clear before creating the new context.
            // Otherwise we create the new context while the old one is still around
            this._scopedContextKeyService.clear();
            this._scopedContextKeyService.value = contextKeyService.createScoped(this.container);
            const wasFindVisible = this._findWidgetVisible?.get();
            this._findWidgetVisible?.reset();
            this._findWidgetVisible = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE.bindTo(contextKeyService);
            this._findWidgetVisible.set(!!wasFindVisible);
            this._findWidgetEnabled?.reset();
            this._findWidgetEnabled = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED.bindTo(contextKeyService);
            this._findWidgetEnabled.set(!!this.options.enableFindWidget);
            this._webview.value?.setContextKeyService(this._scopedContextKeyService.value);
        }
    }
    release(owner) {
        if (this._owner !== owner) {
            return;
        }
        this._scopedContextKeyService.clear();
        this._owner = undefined;
        if (this._container) {
            this._container.setVisibility('hidden');
        }
        if (this._options.retainContextWhenHidden) {
            // https://github.com/microsoft/vscode/issues/157424
            // We need to record the current state when retaining context so we can try to showFind() when showing webview again
            this._shouldShowFindWidgetOnRestore = !!this._findWidgetVisible?.get();
            this.hideFind(false);
        }
        else {
            this._webview.clear();
            this._webviewEvents.clear();
        }
    }
    layoutWebviewOverElement(element, dimension, clippingContainer) {
        if (!this._container || !this._container.domNode.parentElement) {
            return;
        }
        const whenContainerStylesLoaded = this._layoutService.whenContainerStylesLoaded(this.window);
        if (whenContainerStylesLoaded) {
            // In floating windows, we need to ensure that the
            // container is ready for us to compute certain
            // layout related properties.
            whenContainerStylesLoaded.then(() => this.doLayoutWebviewOverElement(element, dimension, clippingContainer));
        }
        else {
            this.doLayoutWebviewOverElement(element, dimension, clippingContainer);
        }
    }
    doLayoutWebviewOverElement(element, dimension, clippingContainer) {
        if (!this._container || !this._container.domNode.parentElement) {
            return;
        }
        const frameRect = element.getBoundingClientRect();
        const containerRect = this._container.domNode.parentElement.getBoundingClientRect();
        const parentBorderTop = (containerRect.height - this._container.domNode.parentElement.clientHeight) / 2.0;
        const parentBorderLeft = (containerRect.width - this._container.domNode.parentElement.clientWidth) / 2.0;
        this._container.setTop(frameRect.top - containerRect.top - parentBorderTop);
        this._container.setLeft(frameRect.left - containerRect.left - parentBorderLeft);
        this._container.setWidth(dimension ? dimension.width : frameRect.width);
        this._container.setHeight(dimension ? dimension.height : frameRect.height);
        if (clippingContainer) {
            const { top, left, right, bottom } = computeClippingRect(frameRect, clippingContainer);
            this._container.domNode.style.clipPath = `polygon(${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px)`;
        }
    }
    _show(targetWindow) {
        if (this._isDisposed) {
            throw new Error('OverlayWebview is disposed');
        }
        if (!this._webview.value) {
            const webview = this._webviewService.createWebviewElement({
                providedViewType: this.providedViewType,
                origin: this.origin,
                title: this._title,
                options: this._options,
                contentOptions: this._contentOptions,
                extension: this.extension,
            });
            this._webview.value = webview;
            webview.state = this._state;
            if (this._scopedContextKeyService.value) {
                this._webview.value.setContextKeyService(this._scopedContextKeyService.value);
            }
            if (this._html) {
                webview.setHtml(this._html);
            }
            if (this._options.tryRestoreScrollPosition) {
                webview.initialScrollProgress = this._initialScrollProgress;
            }
            this._findWidgetEnabled?.set(!!this.options.enableFindWidget);
            webview.mountTo(this.container, targetWindow);
            // Forward events from inner webview to outer listeners
            this._webviewEvents.clear();
            this._webviewEvents.add(webview.onDidFocus(() => { this._onDidFocus.fire(); }));
            this._webviewEvents.add(webview.onDidBlur(() => { this._onDidBlur.fire(); }));
            this._webviewEvents.add(webview.onDidClickLink(x => { this._onDidClickLink.fire(x); }));
            this._webviewEvents.add(webview.onMessage(x => { this._onMessage.fire(x); }));
            this._webviewEvents.add(webview.onMissingCsp(x => { this._onMissingCsp.fire(x); }));
            this._webviewEvents.add(webview.onDidWheel(x => { this._onDidWheel.fire(x); }));
            this._webviewEvents.add(webview.onDidReload(() => { this._onDidReload.fire(); }));
            this._webviewEvents.add(webview.onFatalError(x => { this._onFatalError.fire(x); }));
            this._webviewEvents.add(webview.onDidScroll(x => {
                this._initialScrollProgress = x.scrollYPercentage;
                this._onDidScroll.fire(x);
            }));
            this._webviewEvents.add(webview.onDidUpdateState(state => {
                this._state = state;
                this._onDidUpdateState.fire(state);
            }));
            if (this._isFirstLoad) {
                this._firstLoadPendingMessages.forEach(async (msg) => {
                    msg.resolve(await webview.postMessage(msg.message, msg.transfer));
                });
            }
            this._isFirstLoad = false;
            this._firstLoadPendingMessages.clear();
        }
        // https://github.com/microsoft/vscode/issues/157424
        if (this.options.retainContextWhenHidden && this._shouldShowFindWidgetOnRestore) {
            this.showFind(false);
            // Reset
            this._shouldShowFindWidgetOnRestore = false;
        }
        this._container?.setVisibility('visible');
    }
    setHtml(html) {
        this._html = html;
        this._withWebview(webview => webview.setHtml(html));
    }
    setTitle(title) {
        this._title = title;
        this._withWebview(webview => webview.setTitle(title));
    }
    get initialScrollProgress() { return this._initialScrollProgress; }
    set initialScrollProgress(value) {
        this._initialScrollProgress = value;
        this._withWebview(webview => webview.initialScrollProgress = value);
    }
    get state() { return this._state; }
    set state(value) {
        this._state = value;
        this._withWebview(webview => webview.state = value);
    }
    get extension() { return this._extension; }
    set extension(value) {
        this._extension = value;
        this._withWebview(webview => webview.extension = value);
    }
    get options() { return this._options; }
    set options(value) { this._options = { customClasses: this._options.customClasses, ...value }; }
    get contentOptions() { return this._contentOptions; }
    set contentOptions(value) {
        this._contentOptions = value;
        this._withWebview(webview => webview.contentOptions = value);
    }
    set localResourcesRoot(resources) {
        this._withWebview(webview => webview.localResourcesRoot = resources);
    }
    async postMessage(message, transfer) {
        if (this._webview.value) {
            return this._webview.value.postMessage(message, transfer);
        }
        if (this._isFirstLoad) {
            let resolve;
            const p = new Promise(r => resolve = r);
            this._firstLoadPendingMessages.add({ message, transfer, resolve: resolve });
            return p;
        }
        return false;
    }
    focus() { this._webview.value?.focus(); }
    reload() { this._webview.value?.reload(); }
    selectAll() { this._webview.value?.selectAll(); }
    copy() { this._webview.value?.copy(); }
    paste() { this._webview.value?.paste(); }
    cut() { this._webview.value?.cut(); }
    undo() { this._webview.value?.undo(); }
    redo() { this._webview.value?.redo(); }
    showFind(animated = true) {
        if (this._webview.value) {
            this._webview.value.showFind(animated);
            this._findWidgetVisible?.set(true);
        }
    }
    hideFind(animated = true) {
        this._findWidgetVisible?.reset();
        this._webview.value?.hideFind(animated);
    }
    runFindAction(previous) { this._webview.value?.runFindAction(previous); }
    _withWebview(f) {
        if (this._webview.value) {
            f(this._webview.value);
        }
    }
    windowDidDragStart() {
        this._webview.value?.windowDidDragStart();
    }
    windowDidDragEnd() {
        this._webview.value?.windowDidDragEnd();
    }
    setContextKeyService(contextKeyService) {
        this._webview.value?.setContextKeyService(contextKeyService);
    }
};
OverlayWebview = __decorate([
    __param(1, IWorkbenchLayoutService),
    __param(2, IWebviewService),
    __param(3, IContextKeyService)
], OverlayWebview);
export { OverlayWebview };
function computeClippingRect(frameRect, clipper) {
    const rootRect = clipper.getBoundingClientRect();
    const top = Math.max(rootRect.top - frameRect.top, 0);
    const right = Math.max(frameRect.width - (frameRect.right - rootRect.right), 0);
    const bottom = Math.max(frameRect.height - (frameRect.bottom - rootRect.bottom), 0);
    const left = Math.max(rootRect.left - frameRect.left, 0);
    return { top, right, bottom, left };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheVdlYnZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvb3ZlcmxheVdlYnZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFhLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV0RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFlLGtCQUFrQixFQUE0QixNQUFNLHNEQUFzRCxDQUFDO0FBRWpJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVGLE9BQU8sRUFBOEMsZUFBZSxFQUFFLDhDQUE4QyxFQUFFLDhDQUE4QyxFQUFvSCxNQUFNLGNBQWMsQ0FBQztBQUU3Uzs7R0FFRztBQUNJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVO0lBbUI3QyxJQUFZLE1BQU0sS0FBSyxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFhM0UsWUFDQyxRQUF5QixFQUNBLGNBQXdELEVBQ2hFLGVBQWlELEVBQzlDLHNCQUEyRDtRQUUvRSxLQUFLLEVBQUUsQ0FBQztRQUprQyxtQkFBYyxHQUFkLGNBQWMsQ0FBeUI7UUFDL0Msb0JBQWUsR0FBZixlQUFlLENB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