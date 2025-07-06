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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc1ZpZXdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsU0FBUyxFQUFrQixNQUFNLDhDQUE4QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUEwQixTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUF5QixvQkFBb0IsRUFBK0QsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUssT0FBTyxFQUFFLHVCQUF1QixFQUFFLHdCQUF3QixFQUFFLDBCQUEwQixFQUFFLDJCQUEyQixFQUFFLE1B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