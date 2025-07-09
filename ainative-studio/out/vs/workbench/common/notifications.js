/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NoOpNotification, Severity, NotificationsFilter, NotificationPriority, isNotificationSource } from '../../platform/notification/common/notification.js';
import { toErrorMessage, isErrorWithActions } from '../../base/common/errorMessage.js';
import { Event, Emitter } from '../../base/common/event.js';
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
import { isCancellationError } from '../../base/common/errors.js';
import { Action } from '../../base/common/actions.js';
import { equals } from '../../base/common/arrays.js';
import { parseLinkedText } from '../../base/common/linkedText.js';
import { mapsStrictEqualIgnoreOrder } from '../../base/common/map.js';
export var NotificationChangeType;
(function (NotificationChangeType) {
    /**
     * A notification was added.
     */
    NotificationChangeType[NotificationChangeType["ADD"] = 0] = "ADD";
    /**
     * A notification changed. Check `detail` property
     * on the event for additional information.
     */
    NotificationChangeType[NotificationChangeType["CHANGE"] = 1] = "CHANGE";
    /**
     * A notification expanded or collapsed.
     */
    NotificationChangeType[NotificationChangeType["EXPAND_COLLAPSE"] = 2] = "EXPAND_COLLAPSE";
    /**
     * A notification was removed.
     */
    NotificationChangeType[NotificationChangeType["REMOVE"] = 3] = "REMOVE";
})(NotificationChangeType || (NotificationChangeType = {}));
export var StatusMessageChangeType;
(function (StatusMessageChangeType) {
    StatusMessageChangeType[StatusMessageChangeType["ADD"] = 0] = "ADD";
    StatusMessageChangeType[StatusMessageChangeType["REMOVE"] = 1] = "REMOVE";
})(StatusMessageChangeType || (StatusMessageChangeType = {}));
export class NotificationHandle extends Disposable {
    constructor(item, onClose) {
        super();
        this.item = item;
        this.onClose = onClose;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.registerListeners();
    }
    registerListeners() {
        // Visibility
        this._register(this.item.onDidChangeVisibility(visible => this._onDidChangeVisibility.fire(visible)));
        // Closing
        Event.once(this.item.onDidClose)(() => {
            this._onDidClose.fire();
            this.dispose();
        });
    }
    get progress() {
        return this.item.progress;
    }
    updateSeverity(severity) {
        this.item.updateSeverity(severity);
    }
    updateMessage(message) {
        this.item.updateMessage(message);
    }
    updateActions(actions) {
        this.item.updateActions(actions);
    }
    close() {
        this.onClose(this.item);
        this.dispose();
    }
}
export class NotificationsModel extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeNotification = this._register(new Emitter());
        this.onDidChangeNotification = this._onDidChangeNotification.event;
        this._onDidChangeStatusMessage = this._register(new Emitter());
        this.onDidChangeStatusMessage = this._onDidChangeStatusMessage.event;
        this._onDidChangeFilter = this._register(new Emitter());
        this.onDidChangeFilter = this._onDidChangeFilter.event;
        this._notifications = [];
        this.filter = {
            global: NotificationsFilter.OFF,
            sources: new Map()
        };
    }
    static { this.NO_OP_NOTIFICATION = new NoOpNotification(); }
    get notifications() { return this._notifications; }
    get statusMessage() { return this._statusMessage; }
    setFilter(filter) {
        let globalChanged = false;
        if (typeof filter.global === 'number') {
            globalChanged = this.filter.global !== filter.global;
            this.filter.global = filter.global;
        }
        let sourcesChanged = false;
        if (filter.sources) {
            sourcesChanged = !mapsStrictEqualIgnoreOrder(this.filter.sources, filter.sources);
            this.filter.sources = filter.sources;
        }
        if (globalChanged || sourcesChanged) {
            this._onDidChangeFilter.fire({
                global: globalChanged ? filter.global : undefined,
                sources: sourcesChanged ? filter.sources : undefined
            });
        }
    }
    addNotification(notification) {
        const item = this.createViewItem(notification);
        if (!item) {
            return NotificationsModel.NO_OP_NOTIFICATION; // return early if this is a no-op
        }
        // Deduplicate
        const duplicate = this.findNotification(item);
        duplicate?.close();
        // Add to list as first entry
        this._notifications.splice(0, 0, item);
        // Events
        this._onDidChangeNotification.fire({ item, index: 0, kind: 0 /* NotificationChangeType.ADD */ });
        // Wrap into handle
        return new NotificationHandle(item, item => this.onClose(item));
    }
    onClose(item) {
        const liveItem = this.findNotification(item);
        if (liveItem && liveItem !== item) {
            liveItem.close(); // item could have been replaced with another one, make sure to close the live item
        }
        else {
            item.close(); // otherwise just close the item that was passed in
        }
    }
    findNotification(item) {
        return this._notifications.find(notification => notification.equals(item));
    }
    createViewItem(notification) {
        const item = NotificationViewItem.create(notification, this.filter);
        if (!item) {
            return undefined;
        }
        // Item Events
        const fireNotificationChangeEvent = (kind, detail) => {
            const index = this._notifications.indexOf(item);
            if (index >= 0) {
                this._onDidChangeNotification.fire({ item, index, kind, detail });
            }
        };
        const itemExpansionChangeListener = item.onDidChangeExpansion(() => fireNotificationChangeEvent(2 /* NotificationChangeType.EXPAND_COLLAPSE */));
        const itemContentChangeListener = item.onDidChangeContent(e => fireNotificationChangeEvent(1 /* NotificationChangeType.CHANGE */, e.kind));
        Event.once(item.onDidClose)(() => {
            itemExpansionChangeListener.dispose();
            itemContentChangeListener.dispose();
            const index = this._notifications.indexOf(item);
            if (index >= 0) {
                this._notifications.splice(index, 1);
                this._onDidChangeNotification.fire({ item, index, kind: 3 /* NotificationChangeType.REMOVE */ });
            }
        });
        return item;
    }
    showStatusMessage(message, options) {
        const item = StatusMessageViewItem.create(message, options);
        if (!item) {
            return Disposable.None;
        }
        // Remember as current status message and fire events
        this._statusMessage = item;
        this._onDidChangeStatusMessage.fire({ kind: 0 /* StatusMessageChangeType.ADD */, item });
        return toDisposable(() => {
            // Only reset status message if the item is still the one we had remembered
            if (this._statusMessage === item) {
                this._statusMessage = undefined;
                this._onDidChangeStatusMessage.fire({ kind: 1 /* StatusMessageChangeType.REMOVE */, item });
            }
        });
    }
}
export function isNotificationViewItem(obj) {
    return obj instanceof NotificationViewItem;
}
export var NotificationViewItemContentChangeKind;
(function (NotificationViewItemContentChangeKind) {
    NotificationViewItemContentChangeKind[NotificationViewItemContentChangeKind["SEVERITY"] = 0] = "SEVERITY";
    NotificationViewItemContentChangeKind[NotificationViewItemContentChangeKind["MESSAGE"] = 1] = "MESSAGE";
    NotificationViewItemContentChangeKind[NotificationViewItemContentChangeKind["ACTIONS"] = 2] = "ACTIONS";
    NotificationViewItemContentChangeKind[NotificationViewItemContentChangeKind["PROGRESS"] = 3] = "PROGRESS";
})(NotificationViewItemContentChangeKind || (NotificationViewItemContentChangeKind = {}));
export class NotificationViewItemProgress extends Disposable {
    constructor() {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._state = Object.create(null);
    }
    get state() {
        return this._state;
    }
    infinite() {
        if (this._state.infinite) {
            return;
        }
        this._state.infinite = true;
        this._state.total = undefined;
        this._state.worked = undefined;
        this._state.done = undefined;
        this._onDidChange.fire();
    }
    done() {
        if (this._state.done) {
            return;
        }
        this._state.done = true;
        this._state.infinite = undefined;
        this._state.total = undefined;
        this._state.worked = undefined;
        this._onDidChange.fire();
    }
    total(value) {
        if (this._state.total === value) {
            return;
        }
        this._state.total = value;
        this._state.infinite = undefined;
        this._state.done = undefined;
        this._onDidChange.fire();
    }
    worked(value) {
        if (typeof this._state.worked === 'number') {
            this._state.worked += value;
        }
        else {
            this._state.worked = value;
        }
        this._state.infinite = undefined;
        this._state.done = undefined;
        this._onDidChange.fire();
    }
}
export class NotificationViewItem extends Disposable {
    static { this.MAX_MESSAGE_LENGTH = 1000; }
    static create(notification, filter) {
        if (!notification || !notification.message || isCancellationError(notification.message)) {
            return undefined; // we need a message to show
        }
        let severity;
        if (typeof notification.severity === 'number') {
            severity = notification.severity;
        }
        else {
            severity = Severity.Info;
        }
        const message = NotificationViewItem.parseNotificationMessage(notification.message);
        if (!message) {
            return undefined; // we need a message to show
        }
        let actions;
        if (notification.actions) {
            actions = notification.actions;
        }
        else if (isErrorWithActions(notification.message)) {
            actions = { primary: notification.message.actions };
        }
        let priority = notification.priority ?? NotificationPriority.DEFAULT;
        if (priority === NotificationPriority.DEFAULT && severity !== Severity.Error) {
            if (filter.global === NotificationsFilter.ERROR) {
                priority = NotificationPriority.SILENT; // filtered globally
            }
            else if (isNotificationSource(notification.source) && filter.sources.get(notification.source.id) === NotificationsFilter.ERROR) {
                priority = NotificationPriority.SILENT; // filtered by source
            }
        }
        return new NotificationViewItem(notification.id, severity, notification.sticky, priority, message, notification.source, notification.progress, actions);
    }
    static parseNotificationMessage(input) {
        let message;
        if (input instanceof Error) {
            message = toErrorMessage(input, false);
        }
        else if (typeof input === 'string') {
            message = input;
        }
        if (!message) {
            return undefined; // we need a message to show
        }
        const raw = message;
        // Make sure message is in the limits
        if (message.length > NotificationViewItem.MAX_MESSAGE_LENGTH) {
            message = `${message.substr(0, NotificationViewItem.MAX_MESSAGE_LENGTH)}...`;
        }
        // Remove newlines from messages as we do not support that and it makes link parsing hard
        message = message.replace(/(\r\n|\n|\r)/gm, ' ').trim();
        // Parse Links
        const linkedText = parseLinkedText(message);
        return { raw, linkedText, original: input };
    }
    constructor(id, _severity, _sticky, _priority, _message, _source, progress, actions) {
        super();
        this.id = id;
        this._severity = _severity;
        this._sticky = _sticky;
        this._priority = _priority;
        this._message = _message;
        this._source = _source;
        this._visible = false;
        this._onDidChangeExpansion = this._register(new Emitter());
        this.onDidChangeExpansion = this._onDidChangeExpansion.event;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        if (progress) {
            this.setProgress(progress);
        }
        this.setActions(actions);
    }
    setProgress(progress) {
        if (progress.infinite) {
            this.progress.infinite();
        }
        else if (progress.total) {
            this.progress.total(progress.total);
            if (progress.worked) {
                this.progress.worked(progress.worked);
            }
        }
    }
    setActions(actions = { primary: [], secondary: [] }) {
        this._actions = {
            primary: Array.isArray(actions.primary) ? actions.primary : [],
            secondary: Array.isArray(actions.secondary) ? actions.secondary : []
        };
        this._expanded = actions.primary && actions.primary.length > 0;
    }
    get canCollapse() {
        return !this.hasActions;
    }
    get expanded() {
        return !!this._expanded;
    }
    get severity() {
        return this._severity;
    }
    get sticky() {
        if (this._sticky) {
            return true; // explicitly sticky
        }
        const hasActions = this.hasActions;
        if ((hasActions && this._severity === Severity.Error) || // notification errors with actions are sticky
            (!hasActions && this._expanded) || // notifications that got expanded are sticky
            (this._progress && !this._progress.state.done) // notifications with running progress are sticky
        ) {
            return true;
        }
        return false; // not sticky
    }
    get priority() {
        return this._priority;
    }
    get hasActions() {
        if (!this._actions) {
            return false;
        }
        if (!this._actions.primary) {
            return false;
        }
        return this._actions.primary.length > 0;
    }
    get hasProgress() {
        return !!this._progress;
    }
    get progress() {
        if (!this._progress) {
            this._progress = this._register(new NotificationViewItemProgress());
            this._register(this._progress.onDidChange(() => this._onDidChangeContent.fire({ kind: 3 /* NotificationViewItemContentChangeKind.PROGRESS */ })));
        }
        return this._progress;
    }
    get message() {
        return this._message;
    }
    get source() {
        return typeof this._source === 'string' ? this._source : (this._source ? this._source.label : undefined);
    }
    get sourceId() {
        return (this._source && typeof this._source !== 'string' && 'id' in this._source) ? this._source.id : undefined;
    }
    get actions() {
        return this._actions;
    }
    get visible() {
        return this._visible;
    }
    updateSeverity(severity) {
        if (severity === this._severity) {
            return;
        }
        this._severity = severity;
        this._onDidChangeContent.fire({ kind: 0 /* NotificationViewItemContentChangeKind.SEVERITY */ });
    }
    updateMessage(input) {
        const message = NotificationViewItem.parseNotificationMessage(input);
        if (!message || message.raw === this._message.raw) {
            return;
        }
        this._message = message;
        this._onDidChangeContent.fire({ kind: 1 /* NotificationViewItemContentChangeKind.MESSAGE */ });
    }
    updateActions(actions) {
        this.setActions(actions);
        this._onDidChangeContent.fire({ kind: 2 /* NotificationViewItemContentChangeKind.ACTIONS */ });
    }
    updateVisibility(visible) {
        if (this._visible !== visible) {
            this._visible = visible;
            this._onDidChangeVisibility.fire(visible);
        }
    }
    expand() {
        if (this._expanded || !this.canCollapse) {
            return;
        }
        this._expanded = true;
        this._onDidChangeExpansion.fire();
    }
    collapse(skipEvents) {
        if (!this._expanded || !this.canCollapse) {
            return;
        }
        this._expanded = false;
        if (!skipEvents) {
            this._onDidChangeExpansion.fire();
        }
    }
    toggle() {
        if (this._expanded) {
            this.collapse();
        }
        else {
            this.expand();
        }
    }
    close() {
        this._onDidClose.fire();
        this.dispose();
    }
    equals(other) {
        if (this.hasProgress || other.hasProgress) {
            return false;
        }
        if (typeof this.id === 'string' || typeof other.id === 'string') {
            return this.id === other.id;
        }
        if (typeof this._source === 'object') {
            if (this._source.label !== other.source || this._source.id !== other.sourceId) {
                return false;
            }
        }
        else if (this._source !== other.source) {
            return false;
        }
        if (this._message.raw !== other.message.raw) {
            return false;
        }
        const primaryActions = (this._actions && this._actions.primary) || [];
        const otherPrimaryActions = (other.actions && other.actions.primary) || [];
        return equals(primaryActions, otherPrimaryActions, (action, otherAction) => (action.id + action.label) === (otherAction.id + otherAction.label));
    }
}
export class ChoiceAction extends Action {
    constructor(id, choice) {
        super(id, choice.label, undefined, true, async () => {
            // Pass to runner
            choice.run();
            // Emit Event
            this._onDidRun.fire();
        });
        this._onDidRun = this._register(new Emitter());
        this.onDidRun = this._onDidRun.event;
        this._keepOpen = !!choice.keepOpen;
        this._menu = !choice.isSecondary && choice.menu ? choice.menu.map((c, index) => new ChoiceAction(`${id}.${index}`, c)) : undefined;
    }
    get menu() {
        return this._menu;
    }
    get keepOpen() {
        return this._keepOpen;
    }
}
class StatusMessageViewItem {
    static create(notification, options) {
        if (!notification || isCancellationError(notification)) {
            return undefined; // we need a message to show
        }
        let message;
        if (notification instanceof Error) {
            message = toErrorMessage(notification, false);
        }
        else if (typeof notification === 'string') {
            message = notification;
        }
        if (!message) {
            return undefined; // we need a message to show
        }
        return { message, options };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL25vdGlmaWNhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFtRixnQkFBZ0IsRUFBRSxRQUFRLEVBQTZELG1CQUFtQixFQUEwRCxvQkFBb0IsRUFBdUIsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxWCxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkYsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBYyxNQUFNLGlDQUFpQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBNkJ0RSxNQUFNLENBQU4sSUFBa0Isc0JBc0JqQjtBQXRCRCxXQUFrQixzQkFBc0I7SUFFdkM7O09BRUc7SUFDSCxpRUFBRyxDQUFBO0lBRUg7OztPQUdHO0lBQ0gsdUVBQU0sQ0FBQTtJQUVOOztPQUVHO0lBQ0gseUZBQWUsQ0FBQTtJQUVmOztPQUVHO0lBQ0gsdUVBQU0sQ0FBQTtBQUNQLENBQUMsRUF0QmlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFzQnZDO0FBMEJELE1BQU0sQ0FB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