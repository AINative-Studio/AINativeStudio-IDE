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
var NotificationsToasts_1;
import './media/notificationsToasts.css';
import { localize } from '../../../../nls.js';
import { dispose, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { addDisposableListener, EventType, Dimension, scheduleAtNextAnimationFrame, isAncestorOfActiveElement, getWindow, $ } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { NotificationsList } from './notificationsList.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { NOTIFICATIONS_TOAST_BORDER, NOTIFICATIONS_BACKGROUND } from '../../../common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Severity, NotificationsFilter, NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IntervalCounter } from '../../../../base/common/async.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { NotificationsToastsVisibleContext } from '../../../common/contextkeys.js';
import { mainWindow } from '../../../../base/browser/window.js';
var ToastVisibility;
(function (ToastVisibility) {
    ToastVisibility[ToastVisibility["HIDDEN_OR_VISIBLE"] = 0] = "HIDDEN_OR_VISIBLE";
    ToastVisibility[ToastVisibility["HIDDEN"] = 1] = "HIDDEN";
    ToastVisibility[ToastVisibility["VISIBLE"] = 2] = "VISIBLE";
})(ToastVisibility || (ToastVisibility = {}));
let NotificationsToasts = class NotificationsToasts extends Themable {
    static { NotificationsToasts_1 = this; }
    static { this.MAX_WIDTH = 450; }
    static { this.MAX_NOTIFICATIONS = 3; }
    static { this.PURGE_TIMEOUT = {
        [Severity.Info]: 15000,
        [Severity.Warning]: 18000,
        [Severity.Error]: 20000
    }; }
    static { this.SPAM_PROTECTION = {
        // Count for the number of notifications over 800ms...
        interval: 800,
        // ...and ensure we are not showing more than MAX_NOTIFICATIONS
        limit: this.MAX_NOTIFICATIONS
    }; }
    get isVisible() { return !!this._isVisible; }
    constructor(container, model, instantiationService, layoutService, themeService, editorGroupService, contextKeyService, lifecycleService, hostService) {
        super(themeService);
        this.container = container;
        this.model = model;
        this.instantiationService = instantiationService;
        this.layoutService = layoutService;
        this.editorGroupService = editorGroupService;
        this.lifecycleService = lifecycleService;
        this.hostService = hostService;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._isVisible = false;
        this.mapNotificationToToast = new Map();
        this.mapNotificationToDisposable = new Map();
        this.addedToastsIntervalCounter = new IntervalCounter(NotificationsToasts_1.SPAM_PROTECTION.interval);
        this.notificationsToastsVisibleContextKey = NotificationsToastsVisibleContext.bindTo(contextKeyService);
        this.registerListeners();
    }
    registerListeners() {
        // Layout
        this._register(this.layoutService.onDidLayoutMainContainer(dimension => this.layout(Dimension.lift(dimension))));
        // Delay some tasks until after we have restored
        // to reduce UI pressure from the startup phase
        this.lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            // Show toast for initial notifications if any
            this.model.notifications.forEach(notification => this.addToast(notification));
            // Update toasts on notification changes
            this._register(this.model.onDidChangeNotification(e => this.onDidChangeNotification(e)));
        });
        // Filter
        this._register(this.model.onDidChangeFilter(({ global, sources }) => {
            if (global === NotificationsFilter.ERROR) {
                this.hide();
            }
            else if (sources) {
                for (const [notification] of this.mapNotificationToToast) {
                    if (typeof notification.sourceId === 'string' && sources.get(notification.sourceId) === NotificationsFilter.ERROR && notification.severity !== Severity.Error && notification.priority !== NotificationPriority.URGENT) {
                        this.removeToast(notification);
                    }
                }
            }
        }));
    }
    onDidChangeNotification(e) {
        switch (e.kind) {
            case 0 /* NotificationChangeType.ADD */:
                return this.addToast(e.item);
            case 3 /* NotificationChangeType.REMOVE */:
                return this.removeToast(e.item);
        }
    }
    addToast(item) {
        if (this.isNotificationsCenterVisible) {
            return; // do not show toasts while notification center is visible
        }
        if (item.priority === NotificationPriority.SILENT) {
            return; // do not show toasts for silenced notifications
        }
        // Optimization: it is possible that a lot of notifications are being
        // added in a very short time. To prevent this kind of spam, we protect
        // against showing too many notifications at once. Since they can always
        // be accessed from the notification center, a user can always get to
        // them later on.
        // (see also https://github.com/microsoft/vscode/issues/107935)
        if (this.addedToastsIntervalCounter.increment() > NotificationsToasts_1.SPAM_PROTECTION.limit) {
            return;
        }
        // Optimization: showing a notification toast can be expensive
        // because of the associated animation. If the renderer is busy
        // doing actual work, the animation can cause a lot of slowdown
        // As such we use `scheduleAtNextAnimationFrame` to push out
        // the toast until the renderer has time to process it.
        // (see also https://github.com/microsoft/vscode/issues/107935)
        const itemDisposables = new DisposableStore();
        this.mapNotificationToDisposable.set(item, itemDisposables);
        itemDisposables.add(scheduleAtNextAnimationFrame(getWindow(this.container), () => this.doAddToast(item, itemDisposables)));
    }
    doAddToast(item, itemDisposables) {
        // Lazily create toasts containers
        let notificationsToastsContainer = this.notificationsToastsContainer;
        if (!notificationsToastsContainer) {
            notificationsToastsContainer = this.notificationsToastsContainer = $('.notifications-toasts');
            this.container.appendChild(notificationsToastsContainer);
        }
        // Make Visible
        notificationsToastsContainer.classList.add('visible');
        // Container
        const notificationToastContainer = $('.notification-toast-container');
        const firstToast = notificationsToastsContainer.firstChild;
        if (firstToast) {
            notificationsToastsContainer.insertBefore(notificationToastContainer, firstToast); // always first
        }
        else {
            notificationsToastsContainer.appendChild(notificationToastContainer);
        }
        // Toast
        const notificationToast = $('.notification-toast');
        notificationToastContainer.appendChild(notificationToast);
        // Create toast with item and show
        const notificationList = this.instantiationService.createInstance(NotificationsList, notificationToast, {
            verticalScrollMode: 2 /* ScrollbarVisibility.Hidden */,
            widgetAriaLabel: (() => {
                if (!item.source) {
                    return localize('notificationAriaLabel', "{0}, notification", item.message.raw);
                }
                return localize('notificationWithSourceAriaLabel', "{0}, source: {1}, notification", item.message.raw, item.source);
            })()
        });
        itemDisposables.add(notificationList);
        const toast = { item, list: notificationList, container: notificationToastContainer, toast: notificationToast };
        this.mapNotificationToToast.set(item, toast);
        // When disposed, remove as visible
        itemDisposables.add(toDisposable(() => this.updateToastVisibility(toast, false)));
        // Make visible
        notificationList.show();
        // Layout lists
        const maxDimensions = this.computeMaxDimensions();
        this.layoutLists(maxDimensions.width);
        // Show notification
        notificationList.updateNotificationsList(0, 0, [item]);
        // Layout container: only after we show the notification to ensure that
        // the height computation takes the content of it into account!
        this.layoutContainer(maxDimensions.height);
        // Re-draw entire item when expansion changes to reveal or hide details
        itemDisposables.add(item.onDidChangeExpansion(() => {
            notificationList.updateNotificationsList(0, 1, [item]);
        }));
        // Handle content changes
        // - actions: re-draw to properly show them
        // - message: update notification height unless collapsed
        itemDisposables.add(item.onDidChangeContent(e => {
            switch (e.kind) {
                case 2 /* NotificationViewItemContentChangeKind.ACTIONS */:
                    notificationList.updateNotificationsList(0, 1, [item]);
                    break;
                case 1 /* NotificationViewItemContentChangeKind.MESSAGE */:
                    if (item.expanded) {
                        notificationList.updateNotificationHeight(item);
                    }
                    break;
            }
        }));
        // Remove when item gets closed
        Event.once(item.onDidClose)(() => {
            this.removeToast(item);
        });
        // Automatically purge non-sticky notifications
        this.purgeNotification(item, notificationToastContainer, notificationList, itemDisposables);
        // Theming
        this.updateStyles();
        // Context Key
        this.notificationsToastsVisibleContextKey.set(true);
        // Animate in
        notificationToast.classList.add('notification-fade-in');
        itemDisposables.add(addDisposableListener(notificationToast, 'transitionend', () => {
            notificationToast.classList.remove('notification-fade-in');
            notificationToast.classList.add('notification-fade-in-done');
        }));
        // Mark as visible
        item.updateVisibility(true);
        // Events
        if (!this._isVisible) {
            this._isVisible = true;
            this._onDidChangeVisibility.fire();
        }
    }
    purgeNotification(item, notificationToastContainer, notificationList, disposables) {
        // Track mouse over item
        let isMouseOverToast = false;
        disposables.add(addDisposableListener(notificationToastContainer, EventType.MOUSE_OVER, () => isMouseOverToast = true));
        disposables.add(addDisposableListener(notificationToastContainer, EventType.MOUSE_OUT, () => isMouseOverToast = false));
        // Install Timers to Purge Notification
        let purgeTimeoutHandle;
        let listener;
        const hideAfterTimeout = () => {
            purgeTimeoutHandle = setTimeout(() => {
                // If the window does not have focus, we wait for the window to gain focus
                // again before triggering the timeout again. This prevents an issue where
                // focussing the window could immediately hide the notification because the
                // timeout was triggered again.
                if (!this.hostService.hasFocus) {
                    if (!listener) {
                        listener = this.hostService.onDidChangeFocus(focus => {
                            if (focus) {
                                hideAfterTimeout();
                            }
                        });
                        disposables.add(listener);
                    }
                }
                // Otherwise...
                else if (item.sticky || // never hide sticky notifications
                    notificationList.hasFocus() || // never hide notifications with focus
                    isMouseOverToast // never hide notifications under mouse
                ) {
                    hideAfterTimeout();
                }
                else {
                    this.removeToast(item);
                }
            }, NotificationsToasts_1.PURGE_TIMEOUT[item.severity]);
        };
        hideAfterTimeout();
        disposables.add(toDisposable(() => clearTimeout(purgeTimeoutHandle)));
    }
    removeToast(item) {
        let focusEditor = false;
        // UI
        const notificationToast = this.mapNotificationToToast.get(item);
        if (notificationToast) {
            const toastHasDOMFocus = isAncestorOfActiveElement(notificationToast.container);
            if (toastHasDOMFocus) {
                focusEditor = !(this.focusNext() || this.focusPrevious()); // focus next if any, otherwise focus editor
            }
            this.mapNotificationToToast.delete(item);
        }
        // Disposables
        const notificationDisposables = this.mapNotificationToDisposable.get(item);
        if (notificationDisposables) {
            dispose(notificationDisposables);
            this.mapNotificationToDisposable.delete(item);
        }
        // Layout if we still have toasts
        if (this.mapNotificationToToast.size > 0) {
            this.layout(this.workbenchDimensions);
        }
        // Otherwise hide if no more toasts to show
        else {
            this.doHide();
            // Move focus back to editor group as needed
            if (focusEditor) {
                this.editorGroupService.activeGroup.focus();
            }
        }
    }
    removeToasts() {
        // Toast
        this.mapNotificationToToast.clear();
        // Disposables
        this.mapNotificationToDisposable.forEach(disposable => dispose(disposable));
        this.mapNotificationToDisposable.clear();
        this.doHide();
    }
    doHide() {
        this.notificationsToastsContainer?.classList.remove('visible');
        // Context Key
        this.notificationsToastsVisibleContextKey.set(false);
        // Events
        if (this._isVisible) {
            this._isVisible = false;
            this._onDidChangeVisibility.fire();
        }
    }
    hide() {
        const focusEditor = this.notificationsToastsContainer ? isAncestorOfActiveElement(this.notificationsToastsContainer) : false;
        this.removeToasts();
        if (focusEditor) {
            this.editorGroupService.activeGroup.focus();
        }
    }
    focus() {
        const toasts = this.getToasts(ToastVisibility.VISIBLE);
        if (toasts.length > 0) {
            toasts[0].list.focusFirst();
            return true;
        }
        return false;
    }
    focusNext() {
        const toasts = this.getToasts(ToastVisibility.VISIBLE);
        for (let i = 0; i < toasts.length; i++) {
            const toast = toasts[i];
            if (toast.list.hasFocus()) {
                const nextToast = toasts[i + 1];
                if (nextToast) {
                    nextToast.list.focusFirst();
                    return true;
                }
                break;
            }
        }
        return false;
    }
    focusPrevious() {
        const toasts = this.getToasts(ToastVisibility.VISIBLE);
        for (let i = 0; i < toasts.length; i++) {
            const toast = toasts[i];
            if (toast.list.hasFocus()) {
                const previousToast = toasts[i - 1];
                if (previousToast) {
                    previousToast.list.focusFirst();
                    return true;
                }
                break;
            }
        }
        return false;
    }
    focusFirst() {
        const toast = this.getToasts(ToastVisibility.VISIBLE)[0];
        if (toast) {
            toast.list.focusFirst();
            return true;
        }
        return false;
    }
    focusLast() {
        const toasts = this.getToasts(ToastVisibility.VISIBLE);
        if (toasts.length > 0) {
            toasts[toasts.length - 1].list.focusFirst();
            return true;
        }
        return false;
    }
    update(isCenterVisible) {
        if (this.isNotificationsCenterVisible !== isCenterVisible) {
            this.isNotificationsCenterVisible = isCenterVisible;
            // Hide all toasts when the notificationcenter gets visible
            if (this.isNotificationsCenterVisible) {
                this.removeToasts();
            }
        }
    }
    updateStyles() {
        this.mapNotificationToToast.forEach(({ toast }) => {
            const backgroundColor = this.getColor(NOTIFICATIONS_BACKGROUND);
            toast.style.background = backgroundColor ? backgroundColor : '';
            const widgetShadowColor = this.getColor(widgetShadow);
            toast.style.boxShadow = widgetShadowColor ? `0 0 8px 2px ${widgetShadowColor}` : '';
            const borderColor = this.getColor(NOTIFICATIONS_TOAST_BORDER);
            toast.style.border = borderColor ? `1px solid ${borderColor}` : '';
        });
    }
    getToasts(state) {
        const notificationToasts = [];
        this.mapNotificationToToast.forEach(toast => {
            switch (state) {
                case ToastVisibility.HIDDEN_OR_VISIBLE:
                    notificationToasts.push(toast);
                    break;
                case ToastVisibility.HIDDEN:
                    if (!this.isToastInDOM(toast)) {
                        notificationToasts.push(toast);
                    }
                    break;
                case ToastVisibility.VISIBLE:
                    if (this.isToastInDOM(toast)) {
                        notificationToasts.push(toast);
                    }
                    break;
            }
        });
        return notificationToasts.reverse(); // from newest to oldest
    }
    layout(dimension) {
        this.workbenchDimensions = dimension;
        const maxDimensions = this.computeMaxDimensions();
        // Hide toasts that exceed height
        if (maxDimensions.height) {
            this.layoutContainer(maxDimensions.height);
        }
        // Layout all lists of toasts
        this.layoutLists(maxDimensions.width);
    }
    computeMaxDimensions() {
        const maxWidth = NotificationsToasts_1.MAX_WIDTH;
        let availableWidth = maxWidth;
        let availableHeight;
        if (this.workbenchDimensions) {
            // Make sure notifications are not exceding available width
            availableWidth = this.workbenchDimensions.width;
            availableWidth -= (2 * 8); // adjust for paddings left and right
            // Make sure notifications are not exceeding available height
            availableHeight = this.workbenchDimensions.height;
            if (this.layoutService.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, mainWindow)) {
                availableHeight -= 22; // adjust for status bar
            }
            if (this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)) {
                availableHeight -= 22; // adjust for title bar
            }
            availableHeight -= (2 * 12); // adjust for paddings top and bottom
        }
        availableHeight = typeof availableHeight === 'number'
            ? Math.round(availableHeight * 0.618) // try to not cover the full height for stacked toasts
            : 0;
        return new Dimension(Math.min(maxWidth, availableWidth), availableHeight);
    }
    layoutLists(width) {
        this.mapNotificationToToast.forEach(({ list }) => list.layout(width));
    }
    layoutContainer(heightToGive) {
        let visibleToasts = 0;
        for (const toast of this.getToasts(ToastVisibility.HIDDEN_OR_VISIBLE)) {
            // In order to measure the client height, the element cannot have display: none
            toast.container.style.opacity = '0';
            this.updateToastVisibility(toast, true);
            heightToGive -= toast.container.offsetHeight;
            let makeVisible = false;
            if (visibleToasts === NotificationsToasts_1.MAX_NOTIFICATIONS) {
                makeVisible = false; // never show more than MAX_NOTIFICATIONS
            }
            else if (heightToGive >= 0) {
                makeVisible = true; // hide toast if available height is too little
            }
            // Hide or show toast based on context
            this.updateToastVisibility(toast, makeVisible);
            toast.container.style.opacity = '';
            if (makeVisible) {
                visibleToasts++;
            }
        }
    }
    updateToastVisibility(toast, visible) {
        if (this.isToastInDOM(toast) === visible) {
            return;
        }
        // Update visibility in DOM
        const notificationsToastsContainer = assertIsDefined(this.notificationsToastsContainer);
        if (visible) {
            notificationsToastsContainer.appendChild(toast.container);
        }
        else {
            toast.container.remove();
        }
        // Update visibility in model
        toast.item.updateVisibility(visible);
    }
    isToastInDOM(toast) {
        return !!toast.container.parentElement;
    }
};
NotificationsToasts = NotificationsToasts_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IThemeService),
    __param(5, IEditorGroupsService),
    __param(6, IContextKeyService),
    __param(7, ILifecycleService),
    __param(8, IHostService)
], NotificationsToasts);
export { NotificationsToasts };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1RvYXN0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnNUb2FzdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBZSxPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLDRCQUE0QixFQUFFLHlCQUF5QixFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNySyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBUyxNQUFNLG1EQUFtRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTlGLE9BQU8sRUFBZSxrQkFBa0IsRUFB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