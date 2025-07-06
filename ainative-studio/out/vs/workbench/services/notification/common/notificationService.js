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
var NotificationService_1;
import { localize } from '../../../../nls.js';
import { INotificationService, Severity, NoOpNotification, NeverShowAgainScope, NotificationsFilter, isNotificationSource } from '../../../../platform/notification/common/notification.js';
import { NotificationsModel, ChoiceAction } from '../../../common/notifications.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Action } from '../../../../base/common/actions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let NotificationService = class NotificationService extends Disposable {
    static { NotificationService_1 = this; }
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this.model = this._register(new NotificationsModel());
        this._onDidAddNotification = this._register(new Emitter());
        this.onDidAddNotification = this._onDidAddNotification.event;
        this._onDidRemoveNotification = this._register(new Emitter());
        this.onDidRemoveNotification = this._onDidRemoveNotification.event;
        this._onDidChangeFilter = this._register(new Emitter());
        this.onDidChangeFilter = this._onDidChangeFilter.event;
        this.mapSourceToFilter = (() => {
            const map = new Map();
            for (const sourceFilter of this.storageService.getObject(NotificationService_1.PER_SOURCE_FILTER_SETTINGS_KEY, -1 /* StorageScope.APPLICATION */, [])) {
                map.set(sourceFilter.id, sourceFilter);
            }
            return map;
        })();
        this.globalFilterEnabled = this.storageService.getBoolean(NotificationService_1.GLOBAL_FILTER_SETTINGS_KEY, -1 /* StorageScope.APPLICATION */, false);
        this.updateFilters();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.model.onDidChangeNotification(e => {
            switch (e.kind) {
                case 0 /* NotificationChangeType.ADD */:
                case 3 /* NotificationChangeType.REMOVE */: {
                    const source = typeof e.item.sourceId === 'string' && typeof e.item.source === 'string' ? { id: e.item.sourceId, label: e.item.source } : e.item.source;
                    const notification = {
                        message: e.item.message.original,
                        severity: e.item.severity,
                        source,
                        priority: e.item.priority
                    };
                    if (e.kind === 0 /* NotificationChangeType.ADD */) {
                        // Make sure to track sources for notifications by registering
                        // them with our do not disturb system which is backed by storage
                        if (isNotificationSource(source)) {
                            if (!this.mapSourceToFilter.has(source.id)) {
                                this.setFilter({ ...source, filter: NotificationsFilter.OFF });
                            }
                            else {
                                this.updateSourceFilter(source);
                            }
                        }
                        this._onDidAddNotification.fire(notification);
                    }
                    if (e.kind === 3 /* NotificationChangeType.REMOVE */) {
                        this._onDidRemoveNotification.fire(notification);
                    }
                    break;
                }
            }
        }));
    }
    //#region Filters
    static { this.GLOBAL_FILTER_SETTINGS_KEY = 'notifications.doNotDisturbMode'; }
    static { this.PER_SOURCE_FILTER_SETTINGS_KEY = 'notifications.perSourceDoNotDisturbMode'; }
    setFilter(filter) {
        if (typeof filter === 'number') {
            if (this.globalFilterEnabled === (filter === NotificationsFilter.ERROR)) {
                return; // no change
            }
            // Store into model and persist
            this.globalFilterEnabled = filter === NotificationsFilter.ERROR;
            this.storageService.store(NotificationService_1.GLOBAL_FILTER_SETTINGS_KEY, this.globalFilterEnabled, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Update model
            this.updateFilters();
            // Events
            this._onDidChangeFilter.fire();
        }
        else {
            const existing = this.mapSourceToFilter.get(filter.id);
            if (existing?.filter === filter.filter && existing.label === filter.label) {
                return; // no change
            }
            // Store into model and persist
            this.mapSourceToFilter.set(filter.id, { id: filter.id, label: filter.label, filter: filter.filter });
            this.saveSourceFilters();
            // Update model
            this.updateFilters();
        }
    }
    getFilter(source) {
        if (source) {
            return this.mapSourceToFilter.get(source.id)?.filter ?? NotificationsFilter.OFF;
        }
        return this.globalFilterEnabled ? NotificationsFilter.ERROR : NotificationsFilter.OFF;
    }
    updateSourceFilter(source) {
        const existing = this.mapSourceToFilter.get(source.id);
        if (!existing) {
            return; // nothing to do
        }
        // Store into model and persist
        if (existing.label !== source.label) {
            this.mapSourceToFilter.set(source.id, { id: source.id, label: source.label, filter: existing.filter });
            this.saveSourceFilters();
        }
    }
    saveSourceFilters() {
        this.storageService.store(NotificationService_1.PER_SOURCE_FILTER_SETTINGS_KEY, JSON.stringify([...this.mapSourceToFilter.values()]), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getFilters() {
        return [...this.mapSourceToFilter.values()];
    }
    updateFilters() {
        this.model.setFilter({
            global: this.globalFilterEnabled ? NotificationsFilter.ERROR : NotificationsFilter.OFF,
            sources: new Map([...this.mapSourceToFilter.values()].map(source => [source.id, source.filter]))
        });
    }
    removeFilter(sourceId) {
        if (this.mapSourceToFilter.delete(sourceId)) {
            // Persist
            this.saveSourceFilters();
            // Update model
            this.updateFilters();
        }
    }
    //#endregion
    info(message) {
        if (Array.isArray(message)) {
            for (const messageEntry of message) {
                this.info(messageEntry);
            }
            return;
        }
        this.model.addNotification({ severity: Severity.Info, message });
    }
    warn(message) {
        if (Array.isArray(message)) {
            for (const messageEntry of message) {
                this.warn(messageEntry);
            }
            return;
        }
        this.model.addNotification({ severity: Severity.Warning, message });
    }
    error(message) {
        if (Array.isArray(message)) {
            for (const messageEntry of message) {
                this.error(messageEntry);
            }
            return;
        }
        this.model.addNotification({ severity: Severity.Error, message });
    }
    notify(notification) {
        const toDispose = new DisposableStore();
        // Handle neverShowAgain option accordingly
        if (notification.neverShowAgain) {
            const scope = this.toStorageScope(notification.neverShowAgain);
            const id = notification.neverShowAgain.id;
            // If the user already picked to not show the notification
            // again, we return with a no-op notification here
            if (this.storageService.getBoolean(id, scope)) {
                return new NoOpNotification();
            }
            const neverShowAgainAction = toDispose.add(new Action('workbench.notification.neverShowAgain', localize('neverShowAgain', "Don't Show Again"), undefined, true, async () => {
                // Close notification
                handle.close();
                // Remember choice
                this.storageService.store(id, true, scope, 0 /* StorageTarget.USER */);
            }));
            // Insert as primary or secondary action
            const actions = {
                primary: notification.actions?.primary || [],
                secondary: notification.actions?.secondary || []
            };
            if (!notification.neverShowAgain.isSecondary) {
                actions.primary = [neverShowAgainAction, ...actions.primary]; // action comes first
            }
            else {
                actions.secondary = [...actions.secondary, neverShowAgainAction]; // actions comes last
            }
            notification.actions = actions;
        }
        // Show notification
        const handle = this.model.addNotification(notification);
        // Cleanup when notification gets disposed
        Event.once(handle.onDidClose)(() => toDispose.dispose());
        return handle;
    }
    toStorageScope(options) {
        switch (options.scope) {
            case NeverShowAgainScope.APPLICATION:
                return -1 /* StorageScope.APPLICATION */;
            case NeverShowAgainScope.PROFILE:
                return 0 /* StorageScope.PROFILE */;
            case NeverShowAgainScope.WORKSPACE:
                return 1 /* StorageScope.WORKSPACE */;
            default:
                return -1 /* StorageScope.APPLICATION */;
        }
    }
    prompt(severity, message, choices, options) {
        // Handle neverShowAgain option accordingly
        if (options?.neverShowAgain) {
            const scope = this.toStorageScope(options.neverShowAgain);
            const id = options.neverShowAgain.id;
            // If the user already picked to not show the notification
            // again, we return with a no-op notification here
            if (this.storageService.getBoolean(id, scope)) {
                return new NoOpNotification();
            }
            const neverShowAgainChoice = {
                label: localize('neverShowAgain', "Don't Show Again"),
                run: () => this.storageService.store(id, true, scope, 0 /* StorageTarget.USER */),
                isSecondary: options.neverShowAgain.isSecondary
            };
            // Insert as primary or secondary action
            if (!options.neverShowAgain.isSecondary) {
                choices = [neverShowAgainChoice, ...choices]; // action comes first
            }
            else {
                choices = [...choices, neverShowAgainChoice]; // actions comes last
            }
        }
        let choiceClicked = false;
        const toDispose = new DisposableStore();
        // Convert choices into primary/secondary actions
        const primaryActions = [];
        const secondaryActions = [];
        choices.forEach((choice, index) => {
            const action = new ChoiceAction(`workbench.dialog.choice.${index}`, choice);
            if (!choice.isSecondary) {
                primaryActions.push(action);
            }
            else {
                secondaryActions.push(action);
            }
            // React to action being clicked
            toDispose.add(action.onDidRun(() => {
                choiceClicked = true;
                // Close notification unless we are told to keep open
                if (!choice.keepOpen) {
                    handle.close();
                }
            }));
            toDispose.add(action);
        });
        // Show notification with actions
        const actions = { primary: primaryActions, secondary: secondaryActions };
        const handle = this.notify({ severity, message, actions, sticky: options?.sticky, priority: options?.priority });
        Event.once(handle.onDidClose)(() => {
            // Cleanup when notification gets disposed
            toDispose.dispose();
            // Indicate cancellation to the outside if no action was executed
            if (options && typeof options.onCancel === 'function' && !choiceClicked) {
                options.onCancel();
            }
        });
        return handle;
    }
    status(message, options) {
        return this.model.showStatusMessage(message, options);
    }
};
NotificationService = NotificationService_1 = __decorate([
    __param(0, IStorageService)
], NotificationService);
export { NotificationService };
registerSingleton(INotificationService, NotificationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9ub3RpZmljYXRpb24vY29tbW9uL25vdGlmaWNhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsb0JBQW9CLEVBQXNDLFFBQVEsRUFBbUcsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQTBFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDelksT0FBTyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBMEIsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBVyxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRXZHLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7SUFZbEQsWUFDa0IsY0FBZ0Q7UUFFakUsS0FBSyxFQUFFLENBQUM7UUFGMEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBVHpELFVBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBRXpDLDBCQUFxQixHQUFHLElBQUksQ0FBQyxT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