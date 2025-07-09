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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbm90aWZpY2F0aW9uL2NvbW1vbi9ub3RpZmljYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFzQyxRQUFRLEVBQW1HLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUEwRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3pZLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQTBCLE1BQU0sa0NBQWtDLENBQUM7QUFDNUcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQVcsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUV2RyxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7O0lBWWxELFlBQ2tCLGNBQWdEO1FBRWpFLEtBQUssRUFBRSxDQUFDO1FBRjBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQVR6RCxVQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUV6QywwQkFBcUIsR0FBRyxJQUFJLENBQUMs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