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
import { isFirefox } from '../../../../base/browser/browser.js';
import { addDisposableListener, EventType, getWindowById } from '../../../../base/browser/dom.js';
import { parentOriginHash } from '../../../../base/browser/iframe.js';
import { promiseWithResolvers, ThrottledDelayer } from '../../../../base/common/async.js';
import { streamToBuffer } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { COI } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { ITunnelService } from '../../../../platform/tunnel/common/tunnel.js';
import { WebviewPortMappingManager } from '../../../../platform/webview/common/webviewPortMapping.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { decodeAuthority, webviewGenericCspSource, webviewRootResourceAuthority } from '../common/webview.js';
import { loadLocalResource, WebviewResourceResponse } from './resourceLoading.js';
import { areWebviewContentOptionsEqual } from './webview.js';
import { WebviewFindWidget } from './webviewFindWidget.js';
var WebviewState;
(function (WebviewState) {
    let Type;
    (function (Type) {
        Type[Type["Initializing"] = 0] = "Initializing";
        Type[Type["Ready"] = 1] = "Ready";
    })(Type = WebviewState.Type || (WebviewState.Type = {}));
    class Initializing {
        constructor(pendingMessages) {
            this.pendingMessages = pendingMessages;
            this.type = 0 /* Type.Initializing */;
        }
    }
    WebviewState.Initializing = Initializing;
    WebviewState.Ready = { type: 1 /* Type.Ready */ };
})(WebviewState || (WebviewState = {}));
const webviewIdContext = 'webviewId';
let WebviewElement = class WebviewElement extends Disposable {
    get window() { return typeof this._windowId === 'number' ? getWindowById(this._windowId)?.window : undefined; }
    get platform() { return 'browser'; }
    get element() { return this._element; }
    get isFocused() {
        if (!this._focused) {
            return false;
        }
        // code window is only available after the webview is mounted.
        if (!this.window) {
            return false;
        }
        if (this.window.document.activeElement && this.window.document.activeElement !== this.element) {
            // looks like https://github.com/microsoft/vscode/issues/132641
            // where the focus is actually not in the `<iframe>`
            return false;
        }
        return true;
    }
    constructor(initInfo, webviewThemeDataProvider, configurationService, contextMenuService, notificationService, _environmentService, _fileService, _logService, _remoteAuthorityResolverService, _tunnelService, instantiationService, _accessibilityService) {
        super();
        this.webviewThemeDataProvider = webviewThemeDataProvider;
        this._environmentService = _environmentService;
        this._fileService = _fileService;
        this._logService = _logService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._tunnelService = _tunnelService;
        this._accessibilityService = _accessibilityService;
        this.id = generateUuid();
        this._windowId = undefined;
        this._expectedServiceWorkerVersion = 4; // Keep this in sync with the version in service-worker.js
        this._state = new WebviewState.Initializing([]);
        this._resourceLoadingCts = this._register(new CancellationTokenSource());
        this._focusDelayer = this._register(new ThrottledDelayer(50));
        this._onDidHtmlChange = this._register(new Emitter());
        this.onDidHtmlChange = this._onDidHtmlChange.event;
        this._messageHandlers = new Map();
        this.checkImeCompletionState = true;
        this._disposed = false;
        this._onMissingCsp = this._register(new Emitter());
        this.onMissingCsp = this._onMissingCsp.event;
        this._onDidClickLink = this._register(new Emitter());
        this.onDidClickLink = this._onDidClickLink.event;
        this._onDidReload = this._register(new Emitter());
        this.onDidReload = this._onDidReload.event;
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidWheel = this._register(new Emitter());
        this.onDidWheel = this._onDidWheel.event;
        this._onDidUpdateState = this._register(new Emitter());
        this.onDidUpdateState = this._onDidUpdateState.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onFatalError = this._register(new Emitter());
        this.onFatalError = this._onFatalError.event;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._hasAlertedAboutMissingCsp = false;
        this._hasFindResult = this._register(new Emitter());
        this.hasFindResult = this._hasFindResult.event;
        this._onDidStopFind = this._register(new Emitter());
        this.onDidStopFind = this._onDidStopFind.event;
        this.providedViewType = initInfo.providedViewType;
        this.origin = initInfo.origin ?? this.id;
        this._options = initInfo.options;
        this.extension = initInfo.extension;
        this._content = {
            html: '',
            title: initInfo.title,
            options: initInfo.contentOptions,
            state: undefined
        };
        this._portMappingManager = this._register(new WebviewPortMappingManager(() => this.extension?.location, () => this._content.options.portMapping || [], this._tunnelService));
        this._element = this._createElement(initInfo.options, initInfo.contentOptions);
        this._register(this.on('no-csp-found', () => {
            this.handleNoCspFound();
        }));
        this._register(this.on('did-click-link', ({ uri }) => {
            this._onDidClickLink.fire(uri);
        }));
        this._register(this.on('onmessage', ({ message, transfer }) => {
            this._onMessage.fire({ message, transfer });
        }));
        this._register(this.on('did-scroll', ({ scrollYPercentage }) => {
            this._onDidScroll.fire({ scrollYPercentage });
        }));
        this._register(this.on('do-reload', () => {
            this.reload();
        }));
        this._register(this.on('do-update-state', (state) => {
            this.state = state;
            this._onDidUpdateState.fire(state);
        }));
        this._register(this.on('did-focus', () => {
            this.handleFocusChange(true);
        }));
        this._register(this.on('did-blur', () => {
            this.handleFocusChange(false);
        }));
        this._register(this.on('did-scroll-wheel', (event) => {
            this._onDidWheel.fire(event);
        }));
        this._register(this.on('did-find', ({ didFind }) => {
            this._hasFindResult.fire(didFind);
        }));
        this._register(this.on('fatal-error', (e) => {
            notificationService.error(localize('fatalErrorMessage', "Error loading webview: {0}", e.message));
            this._onFatalError.fire({ message: e.message });
        }));
        this._register(this.on('did-keydown', (data) => {
            // Electron: workaround for https://github.com/electron/electron/issues/14258
            // We have to detect keyboard events in the <webview> and dispatch them to our
            // keybinding service because these events do not bubble to the parent window anymore.
            this.handleKeyEvent('keydown', data);
        }));
        this._register(this.on('did-keyup', (data) => {
            this.handleKeyEvent('keyup', data);
        }));
        this._register(this.on('did-context-menu', (data) => {
            if (!this.element) {
                return;
            }
            if (!this._contextKeyService) {
                return;
            }
            const elementBox = this.element.getBoundingClientRect();
            const contextKeyService = this._contextKeyService.createOverlay([
                ...Object.entries(data.context),
                [webviewIdContext, this.providedViewType],
            ]);
            contextMenuService.showContextMenu({
                menuId: MenuId.WebviewContext,
                menuActionOptions: { shouldForwardArgs: true },
                contextKeyService,
                getActionsContext: () => ({ ...data.context, webview: this.providedViewType }),
                getAnchor: () => ({
                    x: elementBox.x + data.clientX,
                    y: elementBox.y + data.clientY
                })
            });
            this._send('set-context-menu-visible', { visible: true });
        }));
        this._register(this.on('load-resource', async (entry) => {
            try {
                // Restore the authority we previously encoded
                const authority = decodeAuthority(entry.authority);
                const uri = URI.from({
                    scheme: entry.scheme,
                    authority: authority,
                    path: decodeURIComponent(entry.path), // This gets re-encoded
                    query: entry.query ? decodeURIComponent(entry.query) : entry.query,
                });
                this.loadResource(entry.id, uri, entry.ifNoneMatch);
            }
            catch (e) {
                this._send('did-load-resource', {
                    id: entry.id,
                    status: 404,
                    path: entry.path,
                });
            }
        }));
        this._register(this.on('load-localhost', (entry) => {
            this.localLocalhost(entry.id, entry.origin);
        }));
        this._register(Event.runAndSubscribe(webviewThemeDataProvider.onThemeDataChanged, () => this.style()));
        this._register(_accessibilityService.onDidChangeReducedMotion(() => this.style()));
        this._register(_accessibilityService.onDidChangeScreenReaderOptimized(() => this.style()));
        this._register(contextMenuService.onDidHideContextMenu(() => this._send('set-context-menu-visible', { visible: false })));
        this._confirmBeforeClose = configurationService.getValue('window.confirmBeforeClose');
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('window.confirmBeforeClose')) {
                this._confirmBeforeClose = configurationService.getValue('window.confirmBeforeClose');
                this._send('set-confirm-before-close', this._confirmBeforeClose);
            }
        }));
        this._register(this.on('drag-start', () => {
            this._startBlockingIframeDragEvents();
        }));
        this._register(this.on('drag', (event) => {
            this.handleDragEvent('drag', event);
        }));
        if (initInfo.options.enableFindWidget) {
            this._webviewFindWidget = this._register(instantiationService.createInstance(WebviewFindWidget, this));
        }
    }
    dispose() {
        this._disposed = true;
        this.element?.remove();
        this._element = undefined;
        this._messagePort = undefined;
        if (this._state.type === 0 /* WebviewState.Type.Initializing */) {
            for (const message of this._state.pendingMessages) {
                message.resolve(false);
            }
            this._state.pendingMessages = [];
        }
        this._onDidDispose.fire();
        this._resourceLoadingCts.dispose(true);
        super.dispose();
    }
    setContextKeyService(contextKeyService) {
        this._contextKeyService = contextKeyService;
    }
    postMessage(message, transfer) {
        return this._send('message', { message, transfer });
    }
    async _send(channel, data, _createElement = []) {
        if (this._state.type === 0 /* WebviewState.Type.Initializing */) {
            const { promise, resolve } = promiseWithResolvers();
            this._state.pendingMessages.push({ channel, data, transferable: _createElement, resolve });
            return promise;
        }
        else {
            return this.doPostMessage(channel, data, _createElement);
        }
    }
    _createElement(options, _contentOptions) {
        // Do not start loading the webview yet.
        // Wait the end of the ctor when all listeners have been hooked up.
        const element = document.createElement('iframe');
        element.name = this.id;
        element.className = `webview ${options.customClasses || ''}`;
        element.sandbox.add('allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-pointer-lock', 'allow-downloads');
        const allowRules = ['cross-origin-isolated', 'autoplay'];
        if (!isFirefox) {
            allowRules.push('clipboard-read', 'clipboard-write');
        }
        element.setAttribute('allow', allowRules.join('; '));
        element.style.border = 'none';
        element.style.width = '100%';
        element.style.height = '100%';
        element.focus = () => {
            this._doFocus();
        };
        return element;
    }
    _initElement(encodedWebviewOrigin, extension, options, targetWindow) {
        // The extensionId and purpose in the URL are used for filtering in js-debug:
        const params = {
            id: this.id,
            origin: this.origin,
            swVersion: String(this._expectedServiceWorkerVersion),
            extensionId: extension?.id.value ?? '',
            platform: this.platform,
            'vscode-resource-base-authority': webviewRootResourceAuthority,
            parentOrigin: targetWindow.origin,
        };
        if (this._options.disableServiceWorker) {
            params.disableServiceWorker = 'true';
        }
        if (this._environmentService.remoteAuthority) {
            params.remoteAuthority = this._environmentService.remoteAuthority;
        }
        if (options.purpose) {
            params.purpose = options.purpose;
        }
        COI.addSearchParam(params, true, true);
        const queryString = new URLSearchParams(params).toString();
        // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1754872
        const fileName = isFirefox ? 'index-no-csp.html' : 'index.html';
        this.element.setAttribute('src', `${this.webviewContentEndpoint(encodedWebviewOrigin)}/${fileName}?${queryString}`);
    }
    mountTo(element, targetWindow) {
        if (!this.element) {
            return;
        }
        this._windowId = targetWindow.vscodeWindowId;
        this._encodedWebviewOriginPromise = parentOriginHash(targetWindow.origin, this.origin).then(id => this._encodedWebviewOrigin = id);
        this._encodedWebviewOriginPromise.then(encodedWebviewOrigin => {
            if (!this._disposed) {
                this._initElement(encodedWebviewOrigin, this.extension, this._options, targetWindow);
            }
        });
        this._registerMessageHandler(targetWindow);
        if (this._webviewFindWidget) {
            element.appendChild(this._webviewFindWidget.getDomNode());
        }
        for (const eventName of [EventType.MOUSE_DOWN, EventType.MOUSE_MOVE, EventType.DROP]) {
            this._register(addDisposableListener(element, eventName, () => {
                this._stopBlockingIframeDragEvents();
            }));
        }
        for (const node of [element, targetWindow]) {
            this._register(addDisposableListener(node, EventType.DRAG_END, () => {
                this._stopBlockingIframeDragEvents();
            }));
        }
        element.id = this.id; // This is used by aria-flow for accessibility order
        element.appendChild(this.element);
    }
    _registerMessageHandler(targetWindow) {
        const subscription = this._register(addDisposableListener(targetWindow, 'message', (e) => {
            if (!this._encodedWebviewOrigin || e?.data?.target !== this.id) {
                return;
            }
            if (e.origin !== this._webviewContentOrigin(this._encodedWebviewOrigin)) {
                console.log(`Skipped renderer receiving message due to mismatched origins: ${e.origin} ${this._webviewContentOrigin}`);
                return;
            }
            if (e.data.channel === 'webview-ready') {
                if (this._messagePort) {
                    return;
                }
                this._logService.debug(`Webview(${this.id}): webview ready`);
                this._messagePort = e.ports[0];
                this._messagePort.onmessage = (e) => {
                    const handlers = this._messageHandlers.get(e.data.channel);
                    if (!handlers) {
                        console.log(`No handlers found for '${e.data.channel}'`);
                        return;
                    }
                    handlers?.forEach(handler => handler(e.data.data, e));
                };
                this.element?.classList.add('ready');
                if (this._state.type === 0 /* WebviewState.Type.Initializing */) {
                    this._state.pendingMessages.forEach(({ channel, data, resolve }) => resolve(this.doPostMessage(channel, data)));
                }
                this._state = WebviewState.Ready;
                subscription.dispose();
            }
        }));
    }
    _startBlockingIframeDragEvents() {
        if (this.element) {
            this.element.style.pointerEvents = 'none';
        }
    }
    _stopBlockingIframeDragEvents() {
        if (this.element) {
            this.element.style.pointerEvents = 'auto';
        }
    }
    webviewContentEndpoint(encodedWebviewOrigin) {
        const webviewExternalEndpoint = this._environmentService.webviewExternalEndpoint;
        if (!webviewExternalEndpoint) {
            throw new Error(`'webviewExternalEndpoint' has not been configured. Webviews will not work!`);
        }
        const endpoint = webviewExternalEndpoint.replace('{{uuid}}', encodedWebviewOrigin);
        if (endpoint[endpoint.length - 1] === '/') {
            return endpoint.slice(0, endpoint.length - 1);
        }
        return endpoint;
    }
    _webviewContentOrigin(encodedWebviewOrigin) {
        const uri = URI.parse(this.webviewContentEndpoint(encodedWebviewOrigin));
        return uri.scheme + '://' + uri.authority.toLowerCase();
    }
    doPostMessage(channel, data, transferable = []) {
        if (this.element && this._messagePort) {
            this._messagePort.postMessage({ channel, args: data }, transferable);
            return true;
        }
        return false;
    }
    on(channel, handler) {
        let handlers = this._messageHandlers.get(channel);
        if (!handlers) {
            handlers = new Set();
            this._messageHandlers.set(channel, handlers);
        }
        handlers.add(handler);
        return toDisposable(() => {
            this._messageHandlers.get(channel)?.delete(handler);
        });
    }
    handleNoCspFound() {
        if (this._hasAlertedAboutMissingCsp) {
            return;
        }
        this._hasAlertedAboutMissingCsp = true;
        if (this.extension?.id) {
            if (this._environmentService.isExtensionDevelopment) {
                this._onMissingCsp.fire(this.extension.id);
            }
        }
    }
    reload() {
        this.doUpdateContent(this._content);
        const subscription = this._register(this.on('did-load', () => {
            this._onDidReload.fire();
            subscription.dispose();
        }));
    }
    setHtml(html) {
        this.doUpdateContent({ ...this._content, html });
        this._onDidHtmlChange.fire(html);
    }
    setTitle(title) {
        this._content = { ...this._content, title };
        this._send('set-title', title);
    }
    set contentOptions(options) {
        this._logService.debug(`Webview(${this.id}): will update content options`);
        if (areWebviewContentOptionsEqual(options, this._content.options)) {
            this._logService.debug(`Webview(${this.id}): skipping content options update`);
            return;
        }
        this.doUpdateContent({ ...this._content, options });
    }
    set localResourcesRoot(resources) {
        this._content = {
            ...this._content,
            options: { ...this._content.options, localResourceRoots: resources }
        };
    }
    set state(state) {
        this._content = { ...this._content, state };
    }
    set initialScrollProgress(value) {
        this._send('initial-scroll-position', value);
    }
    doUpdateContent(newContent) {
        this._logService.debug(`Webview(${this.id}): will update content`);
        this._content = newContent;
        const allowScripts = !!this._content.options.allowScripts;
        this._send('content', {
            contents: this._content.html,
            title: this._content.title,
            options: {
                allowMultipleAPIAcquire: !!this._content.options.allowMultipleAPIAcquire,
                allowScripts: allowScripts,
                allowForms: this._content.options.allowForms ?? allowScripts, // For back compat, we allow forms by default when scripts are enabled
            },
            state: this._content.state,
            cspSource: webviewGenericCspSource,
            confirmBeforeClose: this._confirmBeforeClose,
        });
    }
    style() {
        let { styles, activeTheme, themeLabel, themeId } = this.webviewThemeDataProvider.getWebviewThemeData();
        if (this._options.transformCssVariables) {
            styles = this._options.transformCssVariables(styles);
        }
        const reduceMotion = this._accessibilityService.isMotionReduced();
        const screenReader = this._accessibilityService.isScreenReaderOptimized();
        this._send('styles', { styles, activeTheme, themeId, themeLabel, reduceMotion, screenReader });
    }
    handleFocusChange(isFocused) {
        this._focused = isFocused;
        if (isFocused) {
            this._onDidFocus.fire();
        }
        else {
            this._onDidBlur.fire();
        }
    }
    handleKeyEvent(type, event) {
        // Create a fake KeyboardEvent from the data provided
        const emulatedKeyboardEvent = new KeyboardEvent(type, event);
        // Force override the target
        Object.defineProperty(emulatedKeyboardEvent, 'target', {
            get: () => this.element,
        });
        // And re-dispatch
        this.window?.dispatchEvent(emulatedKeyboardEvent);
    }
    handleDragEvent(type, event) {
        // Create a fake DragEvent from the data provided
        const emulatedDragEvent = new DragEvent(type, event);
        // Force override the target
        Object.defineProperty(emulatedDragEvent, 'target', {
            get: () => this.element,
        });
        // And re-dispatch
        this.window?.dispatchEvent(emulatedDragEvent);
    }
    windowDidDragStart() {
        // Webview break drag and dropping around the main window (no events are generated when you are over them)
        // Work around this by disabling pointer events during the drag.
        // https://github.com/electron/electron/issues/18226
        this._startBlockingIframeDragEvents();
    }
    windowDidDragEnd() {
        this._stopBlockingIframeDragEvents();
    }
    selectAll() {
        this.execCommand('selectAll');
    }
    copy() {
        this.execCommand('copy');
    }
    paste() {
        this.execCommand('paste');
    }
    cut() {
        this.execCommand('cut');
    }
    undo() {
        this.execCommand('undo');
    }
    redo() {
        this.execCommand('redo');
    }
    execCommand(command) {
        if (this.element) {
            this._send('execCommand', command);
        }
    }
    async loadResource(id, uri, ifNoneMatch) {
        try {
            const result = await loadLocalResource(uri, {
                ifNoneMatch,
                roots: this._content.options.localResourceRoots || [],
            }, this._fileService, this._logService, this._resourceLoadingCts.token);
            switch (result.type) {
                case WebviewResourceResponse.Type.Success: {
                    const buffer = await this.streamToBuffer(result.stream);
                    return this._send('did-load-resource', {
                        id,
                        status: 200,
                        path: uri.path,
                        mime: result.mimeType,
                        data: buffer,
                        etag: result.etag,
                        mtime: result.mtime
                    }, [buffer]);
                }
                case WebviewResourceResponse.Type.NotModified: {
                    return this._send('did-load-resource', {
                        id,
                        status: 304, // not modified
                        path: uri.path,
                        mime: result.mimeType,
                        mtime: result.mtime
                    });
                }
                case WebviewResourceResponse.Type.AccessDenied: {
                    return this._send('did-load-resource', {
                        id,
                        status: 401, // unauthorized
                        path: uri.path,
                    });
                }
            }
        }
        catch {
            // noop
        }
        return this._send('did-load-resource', {
            id,
            status: 404,
            path: uri.path,
        });
    }
    async streamToBuffer(stream) {
        const vsBuffer = await streamToBuffer(stream);
        return vsBuffer.buffer.buffer;
    }
    async localLocalhost(id, origin) {
        const authority = this._environmentService.remoteAuthority;
        const resolveAuthority = authority ? await this._remoteAuthorityResolverService.resolveAuthority(authority) : undefined;
        const redirect = resolveAuthority ? await this._portMappingManager.getRedirect(resolveAuthority.authority, origin) : undefined;
        return this._send('did-load-localhost', {
            id,
            origin,
            location: redirect
        });
    }
    focus() {
        this._doFocus();
        // Handle focus change programmatically (do not rely on event from <webview>)
        this.handleFocusChange(true);
    }
    _doFocus() {
        if (!this.element) {
            return;
        }
        try {
            this.element.contentWindow?.focus();
        }
        catch {
            // noop
        }
        // Workaround for https://github.com/microsoft/vscode/issues/75209
        // Focusing the inner webview is async so for a sequence of actions such as:
        //
        // 1. Open webview
        // 1. Show quick pick from command palette
        //
        // We end up focusing the webview after showing the quick pick, which causes
        // the quick pick to instantly dismiss.
        //
        // Workaround this by debouncing the focus and making sure we are not focused on an input
        // when we try to re-focus.
        this._focusDelayer.trigger(async () => {
            if (!this.isFocused || !this.element) {
                return;
            }
            if (this.window?.document.activeElement && this.window.document.activeElement !== this.element && this.window.document.activeElement?.tagName !== 'BODY') {
                return;
            }
            // It is possible for the webview to be contained in another window
            // that does not have focus. As such, also focus the body of the
            // webview's window to ensure it is properly receiving keyboard focus.
            this.window?.document.body?.focus();
            this._send('focus', undefined);
        });
    }
    /**
     * Webviews expose a stateful find API.
     * Successive calls to find will move forward or backward through onFindResults
     * depending on the supplied options.
     *
     * @param value The string to search for. Empty strings are ignored.
     */
    find(value, previous) {
        if (!this.element) {
            return;
        }
        this._send('find', { value, previous });
    }
    updateFind(value) {
        if (!value || !this.element) {
            return;
        }
        this._send('find', { value });
    }
    stopFind(keepSelection) {
        if (!this.element) {
            return;
        }
        this._send('find-stop', { clearSelection: !keepSelection });
        this._onDidStopFind.fire();
    }
    showFind(animated = true) {
        this._webviewFindWidget?.reveal(undefined, animated);
    }
    hideFind(animated = true) {
        this._webviewFindWidget?.hide(animated);
    }
    runFindAction(previous) {
        this._webviewFindWidget?.find(previous);
    }
};
WebviewElement = __decorate([
    __param(2, IConfigurationService),
    __param(3, IContextMenuService),
    __param(4, INotificationService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IFileService),
    __param(7, ILogService),
    __param(8, IRemoteAuthorityResolverService),
    __param(9, ITunnelService),
    __param(10, IInstantiationService),
    __param(11, IAccessibilityService)
], WebviewElement);
export { WebviewElement };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9icm93c2VyL3dlYnZpZXdFbGVtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBR3RFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQTBCLE1BQU0sbUNBQW1DLENBQUM7QUFDM0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7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