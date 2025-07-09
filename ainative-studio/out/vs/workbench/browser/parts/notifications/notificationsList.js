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
import './media/notificationsList.css';
import { localize } from '../../../../nls.js';
import { $, getWindow, isAncestorOfActiveElement, trackFocus } from '../../../../base/browser/dom.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { NOTIFICATIONS_BACKGROUND } from '../../../common/theme.js';
import { NotificationsListDelegate, NotificationRenderer } from './notificationsViewer.js';
import { CopyNotificationMessageAction } from './notificationsActions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { assertAllDefined } from '../../../../base/common/types.js';
import { NotificationFocusedContext } from '../../../common/contextkeys.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { NotificationActionRunner } from './notificationsCommands.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let NotificationsList = class NotificationsList extends Disposable {
    constructor(container, options, instantiationService, contextMenuService) {
        super();
        this.container = container;
        this.options = options;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.viewModel = [];
    }
    show() {
        if (this.isVisible) {
            return; // already visible
        }
        // Lazily create if showing for the first time
        if (!this.list) {
            this.createNotificationsList();
        }
        // Make visible
        this.isVisible = true;
    }
    createNotificationsList() {
        // List Container
        this.listContainer = $('.notifications-list-container');
        const actionRunner = this._register(this.instantiationService.createInstance(NotificationActionRunner));
        // Notification Renderer
        const renderer = this.instantiationService.createInstance(NotificationRenderer, actionRunner);
        // List
        const listDelegate = this.listDelegate = new NotificationsListDelegate(this.listContainer);
        const options = this.options;
        const list = this.list = this._register(this.instantiationService.createInstance((WorkbenchList), 'NotificationsList', this.listContainer, listDelegate, [renderer], {
            ...options,
            setRowLineHeight: false,
            horizontalScrolling: false,
            overrideStyles: {
                listBackground: NOTIFICATIONS_BACKGROUND
            },
            accessibilityProvider: this.instantiationService.createInstance(NotificationAccessibilityProvider, options)
        }));
        // Context menu to copy message
        const copyAction = this._register(this.instantiationService.createInstance(CopyNotificationMessageAction, CopyNotificationMessageAction.ID, CopyNotificationMessageAction.LABEL));
        this._register((list.onContextMenu(e => {
            if (!e.element) {
                return;
            }
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => [copyAction],
                getActionsContext: () => e.element,
                actionRunner
            });
        })));
        // Toggle on double click
        this._register((list.onMouseDblClick(event => event.element.toggle())));
        // Clear focus when DOM focus moves out
        // Use document.hasFocus() to not clear the focus when the entire window lost focus
        // This ensures that when the focus comes back, the notification is still focused
        const listFocusTracker = this._register(trackFocus(list.getHTMLElement()));
        this._register(listFocusTracker.onDidBlur(() => {
            if (getWindow(this.listContainer).document.hasFocus()) {
                list.setFocus([]);
            }
        }));
        // Context key
        NotificationFocusedContext.bindTo(list.contextKeyService);
        // Only allow for focus in notifications, as the
        // selection is too strong over the contents of
        // the notification
        this._register(list.onDidChangeSelection(e => {
            if (e.indexes.length > 0) {
                list.setSelection([]);
            }
        }));
        this.container.appendChild(this.listContainer);
    }
    updateNotificationsList(start, deleteCount, items = []) {
        const [list, listContainer] = assertAllDefined(this.list, this.listContainer);
        const listHasDOMFocus = isAncestorOfActiveElement(listContainer);
        // Remember focus and relative top of that item
        const focusedIndex = list.getFocus()[0];
        const focusedItem = this.viewModel[focusedIndex];
        let focusRelativeTop = null;
        if (typeof focusedIndex === 'number') {
            focusRelativeTop = list.getRelativeTop(focusedIndex);
        }
        // Update view model
        this.viewModel.splice(start, deleteCount, ...items);
        // Update list
        list.splice(start, deleteCount, items);
        list.layout();
        // Hide if no more notifications to show
        if (this.viewModel.length === 0) {
            this.hide();
        }
        // Otherwise restore focus if we had
        else if (typeof focusedIndex === 'number') {
            let indexToFocus = 0;
            if (focusedItem) {
                let indexToFocusCandidate = this.viewModel.indexOf(focusedItem);
                if (indexToFocusCandidate === -1) {
                    indexToFocusCandidate = focusedIndex - 1; // item could have been removed
                }
                if (indexToFocusCandidate < this.viewModel.length && indexToFocusCandidate >= 0) {
                    indexToFocus = indexToFocusCandidate;
                }
            }
            if (typeof focusRelativeTop === 'number') {
                list.reveal(indexToFocus, focusRelativeTop);
            }
            list.setFocus([indexToFocus]);
        }
        // Restore DOM focus if we had focus before
        if (this.isVisible && listHasDOMFocus) {
            list.domFocus();
        }
    }
    updateNotificationHeight(item) {
        const index = this.viewModel.indexOf(item);
        if (index === -1) {
            return;
        }
        const [list, listDelegate] = assertAllDefined(this.list, this.listDelegate);
        list.updateElementHeight(index, listDelegate.getHeight(item));
        list.layout();
    }
    hide() {
        if (!this.isVisible || !this.list) {
            return; // already hidden
        }
        // Hide
        this.isVisible = false;
        // Clear list
        this.list.splice(0, this.viewModel.length);
        // Clear view model
        this.viewModel = [];
    }
    focusFirst() {
        if (!this.list) {
            return; // not created yet
        }
        this.list.focusFirst();
        this.list.domFocus();
    }
    hasFocus() {
        if (!this.listContainer) {
            return false; // not created yet
        }
        return isAncestorOfActiveElement(this.listContainer);
    }
    layout(width, maxHeight) {
        if (this.listContainer && this.list) {
            this.listContainer.style.width = `${width}px`;
            if (typeof maxHeight === 'number') {
                this.list.getHTMLElement().style.maxHeight = `${maxHeight}px`;
            }
            this.list.layout();
        }
    }
    dispose() {
        this.hide();
        super.dispose();
    }
};
NotificationsList = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService)
], NotificationsList);
export { NotificationsList };
let NotificationAccessibilityProvider = class NotificationAccessibilityProvider {
    constructor(_options, _keybindingService, _configurationService) {
        this._options = _options;
        this._keybindingService = _keybindingService;
        this._configurationService = _configurationService;
    }
    getAriaLabel(element) {
        let accessibleViewHint;
        const keybinding = this._keybindingService.lookupKeybinding('editor.action.accessibleView')?.getAriaLabel();
        if (this._configurationService.getValue('accessibility.verbosity.notification')) {
            accessibleViewHint = keybinding ? localize('notificationAccessibleViewHint', "Inspect the response in the accessible view with {0}", keybinding) : localize('notificationAccessibleViewHintNoKb', "Inspect the response in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding");
        }
        if (!element.source) {
            return accessibleViewHint ? localize('notificationAriaLabelHint', "{0}, notification, {1}", element.message.raw, accessibleViewHint) : localize('notificationAriaLabel', "{0}, notification", element.message.raw);
        }
        return accessibleViewHint ? localize('notificationWithSourceAriaLabelHint', "{0}, source: {1}, notification, {2}", element.message.raw, element.source, accessibleViewHint) : localize('notificationWithSourceAriaLabel', "{0}, source: {1}, notification", element.message.raw, element.source);
    }
    getWidgetAriaLabel() {
        return this._options.widgetAriaLabel ?? localize('notificationsList', "Notifications List");
    }
    getRole() {
        return 'dialog'; // https://github.com/microsoft/vscode/issues/82728
    }
};
NotificationAccessibilityProvider = __decorate([
    __param(1, IKeybindingService),
    __param(2, IConfigurationService)
], NotificationAccessibilityProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0xpc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zTGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLCtCQUErQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSx5QkFBeUIsRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFcEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDM0YsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8s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