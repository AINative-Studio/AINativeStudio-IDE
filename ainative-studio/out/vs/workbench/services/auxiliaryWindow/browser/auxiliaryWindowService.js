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
var BrowserAuxiliaryWindowService_1;
import { getZoomLevel } from '../../../../base/browser/browser.js';
import { $, Dimension, EventHelper, EventType, ModifierKeyEmitter, addDisposableListener, copyAttributes, createLinkElement, createMetaElement, getActiveWindow, getClientArea, getWindowId, isHTMLElement, position, registerWindow, sharedMutationObserver, trackAttributes } from '../../../../base/browser/dom.js';
import { cloneGlobalStylesheets, isGlobalStylesheet } from '../../../../base/browser/domStylesheets.js';
import { ensureCodeWindow, mainWindow } from '../../../../base/browser/window.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { Barrier } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { mark } from '../../../../base/common/performance.js';
import { isFirefox, isWeb } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DEFAULT_AUX_WINDOW_SIZE, WindowMinimumSize } from '../../../../platform/window/common/window.js';
import { BaseWindow } from '../../../browser/window.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IHostService } from '../../host/browser/host.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
export const IAuxiliaryWindowService = createDecorator('auxiliaryWindowService');
export var AuxiliaryWindowMode;
(function (AuxiliaryWindowMode) {
    AuxiliaryWindowMode[AuxiliaryWindowMode["Maximized"] = 0] = "Maximized";
    AuxiliaryWindowMode[AuxiliaryWindowMode["Normal"] = 1] = "Normal";
    AuxiliaryWindowMode[AuxiliaryWindowMode["Fullscreen"] = 2] = "Fullscreen";
})(AuxiliaryWindowMode || (AuxiliaryWindowMode = {}));
const DEFAULT_AUX_WINDOW_DIMENSIONS = new Dimension(DEFAULT_AUX_WINDOW_SIZE.width, DEFAULT_AUX_WINDOW_SIZE.height);
let AuxiliaryWindow = class AuxiliaryWindow extends BaseWindow {
    constructor(window, container, stylesHaveLoaded, configurationService, hostService, environmentService) {
        super(window, undefined, hostService, environmentService);
        this.window = window;
        this.container = container;
        this.configurationService = configurationService;
        this._onWillLayout = this._register(new Emitter());
        this.onWillLayout = this._onWillLayout.event;
        this._onDidLayout = this._register(new Emitter());
        this.onDidLayout = this._onDidLayout.event;
        this._onBeforeUnload = this._register(new Emitter());
        this.onBeforeUnload = this._onBeforeUnload.event;
        this._onUnload = this._register(new Emitter());
        this.onUnload = this._onUnload.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.whenStylesHaveLoaded = stylesHaveLoaded.wait().then(() => undefined);
        this.registerListeners();
    }
    registerListeners() {
        this._register(addDisposableListener(this.window, EventType.BEFORE_UNLOAD, (e) => this.handleBeforeUnload(e)));
        this._register(addDisposableListener(this.window, EventType.UNLOAD, () => this.handleUnload()));
        this._register(addDisposableListener(this.window, 'unhandledrejection', e => {
            onUnexpectedError(e.reason);
            e.preventDefault();
        }));
        this._register(addDisposableListener(this.window, EventType.RESIZE, () => this.layout()));
        this._register(addDisposableListener(this.container, EventType.SCROLL, () => this.container.scrollTop = 0)); // Prevent container from scrolling (#55456)
        if (isWeb) {
            this._register(addDisposableListener(this.container, EventType.DROP, e => EventHelper.stop(e, true))); // Prevent default navigation on drop
            this._register(addDisposableListener(this.container, EventType.WHEEL, e => e.preventDefault(), { passive: false })); // Prevent the back/forward gestures in macOS
            this._register(addDisposableListener(this.container, EventType.CONTEXT_MENU, e => EventHelper.stop(e, true))); // Prevent native context menus in web
        }
        else {
            this._register(addDisposableListener(this.window.document.body, EventType.DRAG_OVER, (e) => EventHelper.stop(e))); // Prevent drag feedback on <body>
            this._register(addDisposableListener(this.window.document.body, EventType.DROP, (e) => EventHelper.stop(e))); // Prevent default navigation on drop
        }
    }
    handleBeforeUnload(e) {
        // Check for veto from a listening component
        let veto;
        this._onBeforeUnload.fire({
            veto(reason) {
                if (reason) {
                    veto = reason;
                }
            }
        });
        if (veto) {
            this.handleVetoBeforeClose(e, veto);
            return;
        }
        // Check for confirm before close setting
        const confirmBeforeCloseSetting = this.configurationService.getValue('window.confirmBeforeClose');
        const confirmBeforeClose = confirmBeforeCloseSetting === 'always' || (confirmBeforeCloseSetting === 'keyboardOnly' && ModifierKeyEmitter.getInstance().isModifierPressed);
        if (confirmBeforeClose) {
            this.confirmBeforeClose(e);
        }
    }
    handleVetoBeforeClose(e, reason) {
        this.preventUnload(e);
    }
    preventUnload(e) {
        e.preventDefault();
        e.returnValue = localize('lifecycleVeto', "Changes that you made may not be saved. Please check press 'Cancel' and try again.");
    }
    confirmBeforeClose(e) {
        this.preventUnload(e);
    }
    handleUnload() {
        // Event
        this._onUnload.fire();
    }
    layout() {
        // Split layout up into two events so that downstream components
        // have a chance to participate in the beginning or end of the
        // layout phase.
        // This helps to build the auxiliary window in another component
        // in the `onWillLayout` phase and then let other compoments
        // react when the overall layout has finished in `onDidLayout`.
        const dimension = getClientArea(this.window.document.body, DEFAULT_AUX_WINDOW_DIMENSIONS, this.container);
        this._onWillLayout.fire(dimension);
        this._onDidLayout.fire(dimension);
    }
    createState() {
        return {
            bounds: {
                x: this.window.screenX,
                y: this.window.screenY,
                width: this.window.outerWidth,
                height: this.window.outerHeight
            },
            zoomLevel: getZoomLevel(this.window)
        };
    }
    dispose() {
        if (this._store.isDisposed) {
            return;
        }
        this._onWillDispose.fire();
        super.dispose();
    }
};
AuxiliaryWindow = __decorate([
    __param(3, IConfigurationService),
    __param(4, IHostService),
    __param(5, IWorkbenchEnvironmentService)
], AuxiliaryWindow);
export { AuxiliaryWindow };
let BrowserAuxiliaryWindowService = class BrowserAuxiliaryWindowService extends Disposable {
    static { BrowserAuxiliaryWindowService_1 = this; }
    static { this.DEFAULT_SIZE = DEFAULT_AUX_WINDOW_SIZE; }
    static { this.WINDOW_IDS = getWindowId(mainWindow) + 1; } // start from the main window ID + 1
    constructor(layoutService, dialogService, configurationService, telemetryService, hostService, environmentService) {
        super();
        this.layoutService = layoutService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.hostService = hostService;
        this.environmentService = environmentService;
        this._onDidOpenAuxiliaryWindow = this._register(new Emitter());
        this.onDidOpenAuxiliaryWindow = this._onDidOpenAuxiliaryWindow.event;
        this.windows = new Map();
    }
    async open(options) {
        mark('code/auxiliaryWindow/willOpen');
        const targetWindow = await this.openWindow(options);
        if (!targetWindow) {
            throw new Error(localize('unableToOpenWindowError', "Unable to open a new window."));
        }
        // Add a `vscodeWindowId` property to identify auxiliary windows
        const resolvedWindowId = await this.resolveWindowId(targetWindow);
        ensureCodeWindow(targetWindow, resolvedWindowId);
        const containerDisposables = new DisposableStore();
        const { container, stylesLoaded } = this.createContainer(targetWindow, containerDisposables, options);
        const auxiliaryWindow = this.createAuxiliaryWindow(targetWindow, container, stylesLoaded);
        const registryDisposables = new DisposableStore();
        this.windows.set(targetWindow.vscodeWindowId, auxiliaryWindow);
        registryDisposables.add(toDisposable(() => this.windows.delete(targetWindow.vscodeWindowId)));
        const eventDisposables = new DisposableStore();
        Event.once(auxiliaryWindow.onWillDispose)(() => {
            targetWindow.close();
            containerDisposables.dispose();
            registryDisposables.dispose();
            eventDisposables.dispose();
        });
        registryDisposables.add(registerWindow(targetWindow));
        this._onDidOpenAuxiliaryWindow.fire({ window: auxiliaryWindow, disposables: eventDisposables });
        mark('code/auxiliaryWindow/didOpen');
        this.telemetryService.publicLog2('auxiliaryWindowOpen', { bounds: !!options?.bounds });
        return auxiliaryWindow;
    }
    createAuxiliaryWindow(targetWindow, container, stylesLoaded) {
        return new AuxiliaryWindow(targetWindow, container, stylesLoaded, this.configurationService, this.hostService, this.environmentService);
    }
    async openWindow(options) {
        const activeWindow = getActiveWindow();
        const activeWindowBounds = {
            x: activeWindow.screenX,
            y: activeWindow.screenY,
            width: activeWindow.outerWidth,
            height: activeWindow.outerHeight
        };
        const width = Math.max(options?.bounds?.width ?? BrowserAuxiliaryWindowService_1.DEFAULT_SIZE.width, WindowMinimumSize.WIDTH);
        const height = Math.max(options?.bounds?.height ?? BrowserAuxiliaryWindowService_1.DEFAULT_SIZE.height, WindowMinimumSize.HEIGHT);
        let newWindowBounds = {
            x: options?.bounds?.x ?? Math.max(activeWindowBounds.x + activeWindowBounds.width / 2 - width / 2, 0),
            y: options?.bounds?.y ?? Math.max(activeWindowBounds.y + activeWindowBounds.height / 2 - height / 2, 0),
            width,
            height
        };
        if (!options?.bounds && newWindowBounds.x === activeWindowBounds.x && newWindowBounds.y === activeWindowBounds.y) {
            // Offset the new window a bit so that it does not overlap
            // with the active window, unless bounds are provided
            newWindowBounds = {
                ...newWindowBounds,
                x: newWindowBounds.x + 30,
                y: newWindowBounds.y + 30
            };
        }
        const features = coalesce([
            'popup=yes',
            `left=${newWindowBounds.x}`,
            `top=${newWindowBounds.y}`,
            `width=${newWindowBounds.width}`,
            `height=${newWindowBounds.height}`,
            // non-standard properties
            options?.nativeTitlebar ? 'window-native-titlebar=yes' : undefined,
            options?.disableFullscreen ? 'window-disable-fullscreen=yes' : undefined,
            options?.mode === AuxiliaryWindowMode.Maximized ? 'window-maximized=yes' : undefined,
            options?.mode === AuxiliaryWindowMode.Fullscreen ? 'window-fullscreen=yes' : undefined
        ]);
        const auxiliaryWindow = mainWindow.open(isFirefox ? '' /* FF immediately fires an unload event if using about:blank */ : 'about:blank', undefined, features.join(','));
        if (!auxiliaryWindow && isWeb) {
            return (await this.dialogService.prompt({
                type: Severity.Warning,
                message: localize('unableToOpenWindow', "The browser interrupted the opening of a new window. Press 'Retry' to try again."),
                detail: localize('unableToOpenWindowDetail', "To avoid this problem in the future, please ensure to allow popups for this website."),
                buttons: [
                    {
                        label: localize({ key: 'retry', comment: ['&& denotes a mnemonic'] }, "&&Retry"),
                        run: () => this.openWindow(options)
                    }
                ],
                cancelButton: true
            })).result;
        }
        return auxiliaryWindow?.window;
    }
    async resolveWindowId(auxiliaryWindow) {
        return BrowserAuxiliaryWindowService_1.WINDOW_IDS++;
    }
    createContainer(auxiliaryWindow, disposables, options) {
        auxiliaryWindow.document.createElement = function () {
            // Disallow `createElement` because it would create
            // HTML Elements in the "wrong" context and break
            // code that does "instanceof HTMLElement" etc.
            throw new Error('Not allowed to create elements in child window JavaScript context. Always use the main window so that "xyz instanceof HTMLElement" continues to work.');
        };
        this.applyMeta(auxiliaryWindow);
        const { stylesLoaded } = this.applyCSS(auxiliaryWindow, disposables);
        const container = this.applyHTML(auxiliaryWindow, disposables);
        return { stylesLoaded, container };
    }
    applyMeta(auxiliaryWindow) {
        for (const metaTag of ['meta[charset="utf-8"]', 'meta[http-equiv="Content-Security-Policy"]', 'meta[name="viewport"]', 'meta[name="theme-color"]']) {
            const metaElement = mainWindow.document.querySelector(metaTag);
            if (metaElement) {
                const clonedMetaElement = createMetaElement(auxiliaryWindow.document.head);
                copyAttributes(metaElement, clonedMetaElement);
                if (metaTag === 'meta[http-equiv="Content-Security-Policy"]') {
                    const content = clonedMetaElement.getAttribute('content');
                    if (content) {
                        clonedMetaElement.setAttribute('content', content.replace(/(script-src[^\;]*)/, `script-src 'none'`));
                    }
                }
            }
        }
        const originalIconLinkTag = mainWindow.document.querySelector('link[rel="icon"]');
        if (originalIconLinkTag) {
            const icon = createLinkElement(auxiliaryWindow.document.head);
            copyAttributes(originalIconLinkTag, icon);
        }
    }
    applyCSS(auxiliaryWindow, disposables) {
        mark('code/auxiliaryWindow/willApplyCSS');
        const mapOriginalToClone = new Map();
        const stylesLoaded = new Barrier();
        stylesLoaded.wait().then(() => mark('code/auxiliaryWindow/didLoadCSSStyles'));
        const pendingLinksDisposables = disposables.add(new DisposableStore());
        let pendingLinksToSettle = 0;
        function onLinkSettled() {
            if (--pendingLinksToSettle === 0) {
                pendingLinksDisposables.dispose();
                stylesLoaded.open();
            }
        }
        function cloneNode(originalNode) {
            if (isGlobalStylesheet(originalNode)) {
                return; // global stylesheets are handled by `cloneGlobalStylesheets` below
            }
            const clonedNode = auxiliaryWindow.document.head.appendChild(originalNode.cloneNode(true));
            if (originalNode.tagName.toLowerCase() === 'link') {
                pendingLinksToSettle++;
                pendingLinksDisposables.add(addDisposableListener(clonedNode, 'load', onLinkSettled));
                pendingLinksDisposables.add(addDisposableListener(clonedNode, 'error', onLinkSettled));
            }
            mapOriginalToClone.set(originalNode, clonedNode);
        }
        // Clone all style elements and stylesheet links from the window to the child window
        // and keep track of <link> elements to settle to signal that styles have loaded
        // Increment pending links right from the beginning to ensure we only settle when
        // all style related nodes have been cloned.
        pendingLinksToSettle++;
        try {
            for (const originalNode of mainWindow.document.head.querySelectorAll('link[rel="stylesheet"], style')) {
                cloneNode(originalNode);
            }
        }
        finally {
            onLinkSettled();
        }
        // Global stylesheets in <head> are cloned in a special way because the mutation
        // observer is not firing for changes done via `style.sheet` API. Only text changes
        // can be observed.
        disposables.add(cloneGlobalStylesheets(auxiliaryWindow));
        // Listen to new stylesheets as they are being added or removed in the main window
        // and apply to child window (including changes to existing stylesheets elements)
        disposables.add(sharedMutationObserver.observe(mainWindow.document.head, disposables, { childList: true, subtree: true })(mutations => {
            for (const mutation of mutations) {
                if (mutation.type !== 'childList' || // only interested in added/removed nodes
                    mutation.target.nodeName.toLowerCase() === 'title' || // skip over title changes that happen frequently
                    mutation.target.nodeName.toLowerCase() === 'script' || // block <script> changes that are unsupported anyway
                    mutation.target.nodeName.toLowerCase() === 'meta' // do not observe <meta> elements for now
                ) {
                    continue;
                }
                for (const node of mutation.addedNodes) {
                    // <style>/<link> element was added
                    if (isHTMLElement(node) && (node.tagName.toLowerCase() === 'style' || node.tagName.toLowerCase() === 'link')) {
                        cloneNode(node);
                    }
                    // text-node was changed, try to apply to our clones
                    else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
                        const clonedNode = mapOriginalToClone.get(node.parentNode);
                        if (clonedNode) {
                            clonedNode.textContent = node.textContent;
                        }
                    }
                }
                for (const node of mutation.removedNodes) {
                    const clonedNode = mapOriginalToClone.get(node);
                    if (clonedNode) {
                        clonedNode.parentNode?.removeChild(clonedNode);
                        mapOriginalToClone.delete(node);
                    }
                }
            }
        }));
        mark('code/auxiliaryWindow/didApplyCSS');
        return { stylesLoaded };
    }
    applyHTML(auxiliaryWindow, disposables) {
        mark('code/auxiliaryWindow/willApplyHTML');
        // Create workbench container and apply classes
        const container = $('div', { role: 'application' });
        position(container, 0, 0, 0, 0, 'relative');
        container.style.display = 'flex';
        container.style.height = '100%';
        container.style.flexDirection = 'column';
        auxiliaryWindow.document.body.append(container);
        // Track attributes
        disposables.add(trackAttributes(mainWindow.document.documentElement, auxiliaryWindow.document.documentElement));
        disposables.add(trackAttributes(mainWindow.document.body, auxiliaryWindow.document.body));
        disposables.add(trackAttributes(this.layoutService.mainContainer, container, ['class'])); // only class attribute
        mark('code/auxiliaryWindow/didApplyHTML');
        return container;
    }
    getWindow(windowId) {
        return this.windows.get(windowId);
    }
};
BrowserAuxiliaryWindowService = BrowserAuxiliaryWindowService_1 = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, IDialogService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, IHostService),
    __param(5, IWorkbenchEnvironmentService)
], BrowserAuxiliaryWindowService);
export { BrowserAuxiliaryWindowService };
registerSingleton(IAuxiliaryWindowService, BrowserAuxiliaryWindowService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXV4aWxpYXJ5V2luZG93L2Jyb3dzZXIvYXV4aWxpYXJ5V2luZG93U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZULE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBYyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLElBQUksRUFB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