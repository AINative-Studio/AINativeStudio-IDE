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
var NotificationRenderer_1, NotificationTemplateRenderer_1;
import { clearNode, addDisposableListener, EventType, EventHelper, $, isEventLike } from '../../../../base/browser/dom.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ButtonBar } from '../../../../base/browser/ui/button/button.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ActionRunner, Separator, toAction } from '../../../../base/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { dispose, DisposableStore, Disposable } from '../../../../base/common/lifecycle.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { NotificationViewItem, ChoiceAction } from '../../../common/notifications.js';
import { ClearNotificationAction, ExpandNotificationAction, CollapseNotificationAction, ConfigureNotificationAction } from './notificationsActions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { INotificationService, NotificationsFilter, Severity, isNotificationSource } from '../../../../platform/notification/common/notification.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { Gesture, EventType as GestureEventType } from '../../../../base/browser/touch.js';
import { Event } from '../../../../base/common/event.js';
import { defaultButtonStyles, defaultProgressBarStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
export class NotificationsListDelegate {
    static { this.ROW_HEIGHT = 42; }
    static { this.LINE_HEIGHT = 22; }
    constructor(container) {
        this.offsetHelper = this.createOffsetHelper(container);
    }
    createOffsetHelper(container) {
        return container.appendChild($('.notification-offset-helper'));
    }
    getHeight(notification) {
        if (!notification.expanded) {
            return NotificationsListDelegate.ROW_HEIGHT; // return early if there are no more rows to show
        }
        // First row: message and actions
        let expandedHeight = NotificationsListDelegate.ROW_HEIGHT;
        // Dynamic height: if message overflows
        const preferredMessageHeight = this.computePreferredHeight(notification);
        const messageOverflows = NotificationsListDelegate.LINE_HEIGHT < preferredMessageHeight;
        if (messageOverflows) {
            const overflow = preferredMessageHeight - NotificationsListDelegate.LINE_HEIGHT;
            expandedHeight += overflow;
        }
        // Last row: source and buttons if we have any
        if (notification.source || isNonEmptyArray(notification.actions && notification.actions.primary)) {
            expandedHeight += NotificationsListDelegate.ROW_HEIGHT;
        }
        // If the expanded height is same as collapsed, unset the expanded state
        // but skip events because there is no change that has visual impact
        if (expandedHeight === NotificationsListDelegate.ROW_HEIGHT) {
            notification.collapse(true /* skip events, no change in height */);
        }
        return expandedHeight;
    }
    computePreferredHeight(notification) {
        // Prepare offset helper depending on toolbar actions count
        let actions = 0;
        if (!notification.hasProgress) {
            actions++; // close
        }
        if (notification.canCollapse) {
            actions++; // expand/collapse
        }
        if (isNonEmptyArray(notification.actions && notification.actions.secondary)) {
            actions++; // secondary actions
        }
        this.offsetHelper.style.width = `${450 /* notifications container width */ - (10 /* padding */ + 30 /* severity icon */ + (actions * 30) /* actions */ - (Math.max(actions - 1, 0) * 4) /* less padding for actions > 1 */)}px`;
        // Render message into offset helper
        const renderedMessage = NotificationMessageRenderer.render(notification.message);
        this.offsetHelper.appendChild(renderedMessage);
        // Compute height
        const preferredHeight = Math.max(this.offsetHelper.offsetHeight, this.offsetHelper.scrollHeight);
        // Always clear offset helper after use
        clearNode(this.offsetHelper);
        return preferredHeight;
    }
    getTemplateId(element) {
        if (element instanceof NotificationViewItem) {
            return NotificationRenderer.TEMPLATE_ID;
        }
        throw new Error('unknown element type: ' + element);
    }
}
class NotificationMessageRenderer {
    static render(message, actionHandler) {
        const messageContainer = $('span');
        for (const node of message.linkedText.nodes) {
            if (typeof node === 'string') {
                messageContainer.appendChild(document.createTextNode(node));
            }
            else {
                let title = node.title;
                if (!title && node.href.startsWith('command:')) {
                    title = localize('executeCommand', "Click to execute command '{0}'", node.href.substr('command:'.length));
                }
                else if (!title) {
                    title = node.href;
                }
                const anchor = $('a', { href: node.href, title, tabIndex: 0 }, node.label);
                if (actionHandler) {
                    const handleOpen = (e) => {
                        if (isEventLike(e)) {
                            EventHelper.stop(e, true);
                        }
                        actionHandler.callback(node.href);
                    };
                    const onClick = actionHandler.toDispose.add(new DomEmitter(anchor, EventType.CLICK)).event;
                    const onKeydown = actionHandler.toDispose.add(new DomEmitter(anchor, EventType.KEY_DOWN)).event;
                    const onSpaceOrEnter = Event.chain(onKeydown, $ => $.filter(e => {
                        const event = new StandardKeyboardEvent(e);
                        return event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */);
                    }));
                    actionHandler.toDispose.add(Gesture.addTarget(anchor));
                    const onTap = actionHandler.toDispose.add(new DomEmitter(anchor, GestureEventType.Tap)).event;
                    Event.any(onClick, onTap, onSpaceOrEnter)(handleOpen, null, actionHandler.toDispose);
                }
                messageContainer.appendChild(anchor);
            }
        }
        return messageContainer;
    }
}
let NotificationRenderer = class NotificationRenderer {
    static { NotificationRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'notification'; }
    constructor(actionRunner, contextMenuService, instantiationService, notificationService) {
        this.actionRunner = actionRunner;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
    }
    get templateId() {
        return NotificationRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.toDispose = new DisposableStore();
        // Container
        data.container = $('.notification-list-item');
        // Main Row
        data.mainRow = $('.notification-list-item-main-row');
        // Icon
        data.icon = $('.notification-list-item-icon.codicon');
        // Message
        data.message = $('.notification-list-item-message');
        // Toolbar
        const that = this;
        const toolbarContainer = $('.notification-list-item-toolbar-container');
        data.toolbar = new ActionBar(toolbarContainer, {
            ariaLabel: localize('notificationActions', "Notification Actions"),
            actionViewItemProvider: (action, options) => {
                if (action instanceof ConfigureNotificationAction) {
                    return data.toDispose.add(new DropdownMenuActionViewItem(action, {
                        getActions() {
                            const actions = [];
                            const source = { id: action.notification.sourceId, label: action.notification.source };
                            if (isNotificationSource(source)) {
                                const isSourceFiltered = that.notificationService.getFilter(source) === NotificationsFilter.ERROR;
                                actions.push(toAction({
                                    id: source.id,
                                    label: isSourceFiltered ? localize('turnOnNotifications', "Turn On All Notifications from '{0}'", source.label) : localize('turnOffNotifications', "Turn Off Info and Warning Notifications from '{0}'", source.label),
                                    run: () => that.notificationService.setFilter({ ...source, filter: isSourceFiltered ? NotificationsFilter.OFF : NotificationsFilter.ERROR })
                                }));
                                if (action.notification.actions?.secondary?.length) {
                                    actions.push(new Separator());
                                }
                            }
                            if (Array.isArray(action.notification.actions?.secondary)) {
                                actions.push(...action.notification.actions.secondary);
                            }
                            return actions;
                        },
                    }, this.contextMenuService, {
                        ...options,
                        actionRunner: this.actionRunner,
                        classNames: action.class
                    }));
                }
                return undefined;
            },
            actionRunner: this.actionRunner
        });
        data.toDispose.add(data.toolbar);
        // Details Row
        data.detailsRow = $('.notification-list-item-details-row');
        // Source
        data.source = $('.notification-list-item-source');
        // Buttons Container
        data.buttonsContainer = $('.notification-list-item-buttons-container');
        container.appendChild(data.container);
        // the details row appears first in order for better keyboard access to notification buttons
        data.container.appendChild(data.detailsRow);
        data.detailsRow.appendChild(data.source);
        data.detailsRow.appendChild(data.buttonsContainer);
        // main row
        data.container.appendChild(data.mainRow);
        data.mainRow.appendChild(data.icon);
        data.mainRow.appendChild(data.message);
        data.mainRow.appendChild(toolbarContainer);
        // Progress: below the rows to span the entire width of the item
        data.progress = new ProgressBar(container, defaultProgressBarStyles);
        data.toDispose.add(data.progress);
        // Renderer
        data.renderer = this.instantiationService.createInstance(NotificationTemplateRenderer, data, this.actionRunner);
        data.toDispose.add(data.renderer);
        return data;
    }
    renderElement(notification, index, data) {
        data.renderer.setInput(notification);
    }
    disposeTemplate(templateData) {
        dispose(templateData.toDispose);
    }
};
NotificationRenderer = NotificationRenderer_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IInstantiationService),
    __param(3, INotificationService)
], NotificationRenderer);
export { NotificationRenderer };
let NotificationTemplateRenderer = class NotificationTemplateRenderer extends Disposable {
    static { NotificationTemplateRenderer_1 = this; }
    static { this.SEVERITIES = [Severity.Info, Severity.Warning, Severity.Error]; }
    constructor(template, actionRunner, openerService, instantiationService, keybindingService, contextMenuService, hoverService) {
        super();
        this.template = template;
        this.actionRunner = actionRunner;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.inputDisposables = this._register(new DisposableStore());
        if (!NotificationTemplateRenderer_1.closeNotificationAction) {
            NotificationTemplateRenderer_1.closeNotificationAction = instantiationService.createInstance(ClearNotificationAction, ClearNotificationAction.ID, ClearNotificationAction.LABEL);
            NotificationTemplateRenderer_1.expandNotificationAction = instantiationService.createInstance(ExpandNotificationAction, ExpandNotificationAction.ID, ExpandNotificationAction.LABEL);
            NotificationTemplateRenderer_1.collapseNotificationAction = instantiationService.createInstance(CollapseNotificationAction, CollapseNotificationAction.ID, CollapseNotificationAction.LABEL);
        }
    }
    setInput(notification) {
        this.inputDisposables.clear();
        this.render(notification);
    }
    render(notification) {
        // Container
        this.template.container.classList.toggle('expanded', notification.expanded);
        this.inputDisposables.add(addDisposableListener(this.template.container, EventType.MOUSE_UP, e => {
            if (e.button === 1 /* Middle Button */) {
                // Prevent firing the 'paste' event in the editor textarea - #109322
                EventHelper.stop(e, true);
            }
        }));
        this.inputDisposables.add(addDisposableListener(this.template.container, EventType.AUXCLICK, e => {
            if (!notification.hasProgress && e.button === 1 /* Middle Button */) {
                EventHelper.stop(e, true);
                notification.close();
            }
        }));
        // Severity Icon
        this.renderSeverity(notification);
        // Message
        const messageCustomHover = this.inputDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.template.message, ''));
        const messageOverflows = this.renderMessage(notification, messageCustomHover);
        // Secondary Actions
        this.renderSecondaryActions(notification, messageOverflows);
        // Source
        const sourceCustomHover = this.inputDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.template.source, ''));
        this.renderSource(notification, sourceCustomHover);
        // Buttons
        this.renderButtons(notification);
        // Progress
        this.renderProgress(notification);
        // Label Change Events that we can handle directly
        // (changes to actions require an entire redraw of
        // the notification because it has an impact on
        // epxansion state)
        this.inputDisposables.add(notification.onDidChangeContent(event => {
            switch (event.kind) {
                case 0 /* NotificationViewItemContentChangeKind.SEVERITY */:
                    this.renderSeverity(notification);
                    break;
                case 3 /* NotificationViewItemContentChangeKind.PROGRESS */:
                    this.renderProgress(notification);
                    break;
                case 1 /* NotificationViewItemContentChangeKind.MESSAGE */:
                    this.renderMessage(notification, messageCustomHover);
                    break;
            }
        }));
    }
    renderSeverity(notification) {
        // first remove, then set as the codicon class names overlap
        NotificationTemplateRenderer_1.SEVERITIES.forEach(severity => {
            if (notification.severity !== severity) {
                this.template.icon.classList.remove(...ThemeIcon.asClassNameArray(this.toSeverityIcon(severity)));
            }
        });
        this.template.icon.classList.add(...ThemeIcon.asClassNameArray(this.toSeverityIcon(notification.severity)));
    }
    renderMessage(notification, customHover) {
        clearNode(this.template.message);
        this.template.message.appendChild(NotificationMessageRenderer.render(notification.message, {
            callback: link => this.openerService.open(URI.parse(link), { allowCommands: true }),
            toDispose: this.inputDisposables
        }));
        const messageOverflows = notification.canCollapse && !notification.expanded && this.template.message.scrollWidth > this.template.message.clientWidth;
        customHover.update(messageOverflows ? this.template.message.textContent + '' : '');
        return messageOverflows;
    }
    renderSecondaryActions(notification, messageOverflows) {
        const actions = [];
        // Secondary Actions
        if (isNonEmptyArray(notification.actions?.secondary)) {
            const configureNotificationAction = this.instantiationService.createInstance(ConfigureNotificationAction, ConfigureNotificationAction.ID, ConfigureNotificationAction.LABEL, notification);
            actions.push(configureNotificationAction);
            this.inputDisposables.add(configureNotificationAction);
        }
        // Expand / Collapse
        let showExpandCollapseAction = false;
        if (notification.canCollapse) {
            if (notification.expanded) {
                showExpandCollapseAction = true; // allow to collapse an expanded message
            }
            else if (notification.source) {
                showExpandCollapseAction = true; // allow to expand to details row
            }
            else if (messageOverflows) {
                showExpandCollapseAction = true; // allow to expand if message overflows
            }
        }
        if (showExpandCollapseAction) {
            actions.push(notification.expanded ? NotificationTemplateRenderer_1.collapseNotificationAction : NotificationTemplateRenderer_1.expandNotificationAction);
        }
        // Close (unless progress is showing)
        if (!notification.hasProgress) {
            actions.push(NotificationTemplateRenderer_1.closeNotificationAction);
        }
        this.template.toolbar.clear();
        this.template.toolbar.context = notification;
        actions.forEach(action => this.template.toolbar.push(action, { icon: true, label: false, keybinding: this.getKeybindingLabel(action) }));
    }
    renderSource(notification, sourceCustomHover) {
        if (notification.expanded && notification.source) {
            this.template.source.textContent = localize('notificationSource', "Source: {0}", notification.source);
            sourceCustomHover.update(notification.source);
        }
        else {
            this.template.source.textContent = '';
            sourceCustomHover.update('');
        }
    }
    renderButtons(notification) {
        clearNode(this.template.buttonsContainer);
        const primaryActions = notification.actions ? notification.actions.primary : undefined;
        if (notification.expanded && isNonEmptyArray(primaryActions)) {
            const that = this;
            const actionRunner = this.inputDisposables.add(new class extends ActionRunner {
                async runAction(action) {
                    // Run action
                    that.actionRunner.run(action, notification);
                    // Hide notification (unless explicitly prevented)
                    if (!(action instanceof ChoiceAction) || !action.keepOpen) {
                        notification.close();
                    }
                }
            }());
            const buttonToolbar = this.inputDisposables.add(new ButtonBar(this.template.buttonsContainer));
            for (let i = 0; i < primaryActions.length; i++) {
                const action = primaryActions[i];
                const options = {
                    title: true, // assign titles to buttons in case they overflow
                    secondary: i > 0,
                    ...defaultButtonStyles
                };
                const dropdownActions = action instanceof ChoiceAction ? action.menu : undefined;
                const button = this.inputDisposables.add(dropdownActions ?
                    buttonToolbar.addButtonWithDropdown({
                        ...options,
                        contextMenuProvider: this.contextMenuService,
                        actions: dropdownActions,
                        actionRunner
                    }) :
                    buttonToolbar.addButton(options));
                button.label = action.label;
                this.inputDisposables.add(button.onDidClick(e => {
                    if (e) {
                        EventHelper.stop(e, true);
                    }
                    actionRunner.run(action);
                }));
            }
        }
    }
    renderProgress(notification) {
        // Return early if the item has no progress
        if (!notification.hasProgress) {
            this.template.progress.stop().hide();
            return;
        }
        // Infinite
        const state = notification.progress.state;
        if (state.infinite) {
            this.template.progress.infinite().show();
        }
        // Total / Worked
        else if (typeof state.total === 'number' || typeof state.worked === 'number') {
            if (typeof state.total === 'number' && !this.template.progress.hasTotal()) {
                this.template.progress.total(state.total);
            }
            if (typeof state.worked === 'number') {
                this.template.progress.setWorked(state.worked).show();
            }
        }
        // Done
        else {
            this.template.progress.done().hide();
        }
    }
    toSeverityIcon(severity) {
        switch (severity) {
            case Severity.Warning:
                return Codicon.warning;
            case Severity.Error:
                return Codicon.error;
        }
        return Codicon.info;
    }
    getKeybindingLabel(action) {
        const keybinding = this.keybindingService.lookupKeybinding(action.id);
        return keybinding ? keybinding.getLabel() : null;
    }
};
NotificationTemplateRenderer = NotificationTemplateRenderer_1 = __decorate([
    __param(2, IOpenerService),
    __param(3, IInstantiationService),
    __param(4, IKeybindingService),
    __param(5, IContextMenuService),
    __param(6, IHoverService)
], NotificationTemplateRenderer);
export { NotificationTemplateRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnNWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0gsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFNBQVMsRUFBa0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBMEIsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBeUIsb0JBQW9CLEVBQStELFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFLLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSx3QkFBd0IsRUFBRSwwQkFBMEIsRUFBRSwyQkFBMkIsRUFBRSxN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