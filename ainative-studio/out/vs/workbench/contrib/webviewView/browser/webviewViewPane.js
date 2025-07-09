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
var WebviewViewPane_1;
import { addDisposableListener, Dimension, EventType, findParentWithClass, getWindow } from '../../../../base/browser/dom.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane, ViewPaneShowActions } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ExtensionKeyedWebviewOriginStore, IWebviewService } from '../../webview/browser/webview.js';
import { WebviewWindowDragMonitor } from '../../webview/browser/webviewWindowDragMonitor.js';
import { IWebviewViewService } from './webviewViewService.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const storageKeys = {
    webviewState: 'webviewState',
};
let WebviewViewPane = class WebviewViewPane extends ViewPane {
    static { WebviewViewPane_1 = this; }
    static getOriginStore(storageService) {
        this._originStore ??= new ExtensionKeyedWebviewOriginStore('webviewViews.origins', storageService);
        return this._originStore;
    }
    constructor(options, configurationService, contextKeyService, contextMenuService, instantiationService, keybindingService, openerService, hoverService, themeService, viewDescriptorService, activityService, extensionService, progressService, storageService, viewService, webviewService, webviewViewService) {
        super({ ...options, titleMenuId: MenuId.ViewTitle, showActions: ViewPaneShowActions.WhenExpanded }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.activityService = activityService;
        this.extensionService = extensionService;
        this.progressService = progressService;
        this.storageService = storageService;
        this.viewService = viewService;
        this.webviewService = webviewService;
        this.webviewViewService = webviewViewService;
        this._webview = this._register(new MutableDisposable());
        this._webviewDisposables = this._register(new DisposableStore());
        this._activated = false;
        this.activity = this._register(new MutableDisposable());
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this.extensionId = options.fromExtensionId;
        this.defaultTitle = this.title;
        this.memento = new Memento(`webviewView.${this.id}`, storageService);
        this.viewState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this._register(this.onDidChangeBodyVisibility(() => this.updateTreeVisibility()));
        this._register(this.webviewViewService.onNewResolverRegistered(e => {
            if (e.viewType === this.id) {
                // Potentially re-activate if we have a new resolver
                this.updateTreeVisibility();
            }
        }));
        this.updateTreeVisibility();
    }
    dispose() {
        this._onDispose.fire();
        clearTimeout(this._repositionTimeout);
        super.dispose();
    }
    focus() {
        super.focus();
        this._webview.value?.focus();
    }
    renderBody(container) {
        super.renderBody(container);
        this._container = container;
        this._rootContainer = undefined;
        if (!this._resizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                setTimeout(() => {
                    this.layoutWebview();
                }, 0);
            });
            this._register(toDisposable(() => {
                this._resizeObserver.disconnect();
            }));
            this._resizeObserver.observe(container);
        }
    }
    saveState() {
        if (this._webview.value) {
            this.viewState[storageKeys.webviewState] = this._webview.value.state;
        }
        this.memento.saveMemento();
        super.saveState();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.layoutWebview(new Dimension(width, height));
    }
    updateTreeVisibility() {
        if (this.isBodyVisible()) {
            this.activate();
            this._webview.value?.claim(this, getWindow(this.element), undefined);
        }
        else {
            this._webview.value?.release(this);
        }
    }
    activate() {
        if (this._activated) {
            return;
        }
        this._activated = true;
        const origin = this.extensionId ? WebviewViewPane_1.getOriginStore(this.storageService).getOrigin(this.id, this.extensionId) : undefined;
        const webview = this.webviewService.createWebviewOverlay({
            origin,
            providedViewType: this.id,
            title: this.title,
            options: { purpose: "webviewView" /* WebviewContentPurpose.WebviewView */ },
            contentOptions: {},
            extension: this.extensionId ? { id: this.extensionId } : undefined
        });
        webview.state = this.viewState[storageKeys.webviewState];
        this._webview.value = webview;
        if (this._container) {
            this.layoutWebview();
        }
        this._webviewDisposables.add(toDisposable(() => {
            this._webview.value?.release(this);
        }));
        this._webviewDisposables.add(webview.onDidUpdateState(() => {
            this.viewState[storageKeys.webviewState] = webview.state;
        }));
        // Re-dispatch all drag events back to the drop target to support view drag drop
        for (const event of [EventType.DRAG, EventType.DRAG_END, EventType.DRAG_ENTER, EventType.DRAG_LEAVE, EventType.DRAG_START]) {
            this._webviewDisposables.add(addDisposableListener(this._webview.value.container, event, e => {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.dropTargetElement.dispatchEvent(new DragEvent(e.type, e));
            }));
        }
        this._webviewDisposables.add(new WebviewWindowDragMonitor(getWindow(this.element), () => this._webview.value));
        const source = this._webviewDisposables.add(new CancellationTokenSource());
        this.withProgress(async () => {
            await this.extensionService.activateByEvent(`onView:${this.id}`);
            const self = this;
            const webviewView = {
                webview,
                onDidChangeVisibility: this.onDidChangeBodyVisibility,
                onDispose: this.onDispose,
                get title() { return self.setTitle; },
                set title(value) { self.updateTitle(value); },
                get description() { return self.titleDescription; },
                set description(value) { self.updateTitleDescription(value); },
                get badge() { return self.badge; },
                set badge(badge) { self.updateBadge(badge); },
                dispose: () => {
                    // Only reset and clear the webview itself. Don't dispose of the view container
                    this._activated = false;
                    this._webview.clear();
                    this._webviewDisposables.clear();
                },
                show: (preserveFocus) => {
                    this.viewService.openView(this.id, !preserveFocus);
                }
            };
            await this.webviewViewService.resolve(this.id, webviewView, source.token);
        });
    }
    updateTitle(value) {
        this.setTitle = value;
        super.updateTitle(typeof value === 'string' ? value : this.defaultTitle);
    }
    updateBadge(badge) {
        if (this.badge?.value === badge?.value &&
            this.badge?.tooltip === badge?.tooltip) {
            return;
        }
        this.badge = badge;
        if (badge) {
            const activity = {
                badge: new NumberBadge(badge.value, () => badge.tooltip),
                priority: 150
            };
            this.activity.value = this.activityService.showViewActivity(this.id, activity);
        }
    }
    async withProgress(task) {
        return this.progressService.withProgress({ location: this.id, delay: 500 }, task);
    }
    onDidScrollRoot() {
        this.layoutWebview();
    }
    doLayoutWebview(dimension) {
        const webviewEntry = this._webview.value;
        if (!this._container || !webviewEntry) {
            return;
        }
        if (!this._rootContainer || !this._rootContainer.isConnected) {
            this._rootContainer = this.findRootContainer(this._container);
        }
        webviewEntry.layoutWebviewOverElement(this._container, dimension, this._rootContainer);
    }
    layoutWebview(dimension) {
        this.doLayoutWebview(dimension);
        // Temporary fix for https://github.com/microsoft/vscode/issues/110450
        // There is an animation that lasts about 200ms, update the webview positioning once this animation is complete.
        clearTimeout(this._repositionTimeout);
        this._repositionTimeout = setTimeout(() => this.doLayoutWebview(dimension), 200);
    }
    findRootContainer(container) {
        return findParentWithClass(container, 'monaco-scrollable-element') ?? undefined;
    }
};
WebviewViewPane = WebviewViewPane_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IInstantiationService),
    __param(5, IKeybindingService),
    __param(6, IOpenerService),
    __param(7, IHoverService),
    __param(8, IThemeService),
    __param(9, IViewDescriptorService),
    __param(10, IActivityService),
    __param(11, IExtensionService),
    __param(12, IProgressService),
    __param(13, IStorageService),
    __param(14, IViewsService),
    __param(15, IWebviewService),
    __param(16, IWebviewViewService)
], WebviewViewPane);
export { WebviewViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1ZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXdWaWV3L2Jyb3dzZXIvd2Vidmlld1ZpZXdQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNySCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGFB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