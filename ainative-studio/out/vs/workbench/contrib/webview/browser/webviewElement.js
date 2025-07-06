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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvd2Vidmlld0VsZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBMEIsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztB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