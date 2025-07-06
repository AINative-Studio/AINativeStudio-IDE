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
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { HIDE_NOTIFICATIONS_CENTER, SHOW_NOTIFICATIONS_CENTER } from './notificationsCommands.js';
import { localize } from '../../../../nls.js';
import { INotificationService, NotificationsFilter } from '../../../../platform/notification/common/notification.js';
let NotificationsStatus = class NotificationsStatus extends Disposable {
    constructor(model, statusbarService, notificationService) {
        super();
        this.model = model;
        this.statusbarService = statusbarService;
        this.notificationService = notificationService;
        this.newNotificationsCount = 0;
        this.isNotificationsCenterVisible = false;
        this.isNotificationsToastsVisible = false;
        this.updateNotificationsCenterStatusItem();
        if (model.statusMessage) {
            this.doSetStatusMessage(model.statusMessage);
        }
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.model.onDidChangeNotification(e => this.onDidChangeNotification(e)));
        this._register(this.model.onDidChangeStatusMessage(e => this.onDidChangeStatusMessage(e)));
        this._register(this.notificationService.onDidChangeFilter(() => this.updateNotificationsCenterStatusItem()));
    }
    onDidChangeNotification(e) {
        // Consider a notification as unread as long as it only
        // appeared as toast and not in the notification center
        if (!this.isNotificationsCenterVisible) {
            if (e.kind === 0 /* NotificationChangeType.ADD */) {
                this.newNotificationsCount++;
            }
            else if (e.kind === 3 /* NotificationChangeType.REMOVE */ && this.newNotificationsCount > 0) {
                this.newNotificationsCount--;
            }
        }
        // Update in status bar
        this.updateNotificationsCenterStatusItem();
    }
    updateNotificationsCenterStatusItem() {
        // Figure out how many notifications have progress only if neither
        // toasts are visible nor center is visible. In that case we still
        // want to give a hint to the user that something is running.
        let notificationsInProgress = 0;
        if (!this.isNotificationsCenterVisible && !this.isNotificationsToastsVisible) {
            for (const notification of this.model.notifications) {
                if (notification.hasProgress) {
                    notificationsInProgress++;
                }
            }
        }
        // Show the status bar entry depending on do not disturb setting
        let statusProperties = {
            name: localize('status.notifications', "Notifications"),
            text: `${notificationsInProgress > 0 || this.newNotificationsCount > 0 ? '$(bell-dot)' : '$(bell)'}`,
            ariaLabel: localize('status.notifications', "Notifications"),
            command: this.isNotificationsCenterVisible ? HIDE_NOTIFICATIONS_CENTER : SHOW_NOTIFICATIONS_CENTER,
            tooltip: this.getTooltip(notificationsInProgress),
            showBeak: this.isNotificationsCenterVisible
        };
        if (this.notificationService.getFilter() === NotificationsFilter.ERROR) {
            statusProperties = {
                ...statusProperties,
                text: `${notificationsInProgress > 0 || this.newNotificationsCount > 0 ? '$(bell-slash-dot)' : '$(bell-slash)'}`,
                ariaLabel: localize('status.doNotDisturb', "Do Not Disturb"),
                tooltip: localize('status.doNotDisturbTooltip', "Do Not Disturb Mode is Enabled")
            };
        }
        if (!this.notificationsCenterStatusItem) {
            this.notificationsCenterStatusItem = this.statusbarService.addEntry(statusProperties, 'status.notifications', 1 /* StatusbarAlignment.RIGHT */, Number.NEGATIVE_INFINITY /* last entry */);
        }
        else {
            this.notificationsCenterStatusItem.update(statusProperties);
        }
    }
    getTooltip(notificationsInProgress) {
        if (this.isNotificationsCenterVisible) {
            return localize('hideNotifications', "Hide Notifications");
        }
        if (this.model.notifications.length === 0) {
            return localize('zeroNotifications', "No Notifications");
        }
        if (notificationsInProgress === 0) {
            if (this.newNotificationsCount === 0) {
                return localize('noNotifications', "No New Notifications");
            }
            if (this.newNotificationsCount === 1) {
                return localize('oneNotification', "1 New Notification");
            }
            return localize({ key: 'notifications', comment: ['{0} will be replaced by a number'] }, "{0} New Notifications", this.newNotificationsCount);
        }
        if (this.newNotificationsCount === 0) {
            return localize({ key: 'noNotificationsWithProgress', comment: ['{0} will be replaced by a number'] }, "No New Notifications ({0} in progress)", notificationsInProgress);
        }
        if (this.newNotificationsCount === 1) {
            return localize({ key: 'oneNotificationWithProgress', comment: ['{0} will be replaced by a number'] }, "1 New Notification ({0} in progress)", notificationsInProgress);
        }
        return localize({ key: 'notificationsWithProgress', comment: ['{0} and {1} will be replaced by a number'] }, "{0} New Notifications ({1} in progress)", this.newNotificationsCount, notificationsInProgress);
    }
    update(isCenterVisible, isToastsVisible) {
        let updateNotificationsCenterStatusItem = false;
        if (this.isNotificationsCenterVisible !== isCenterVisible) {
            this.isNotificationsCenterVisible = isCenterVisible;
            this.newNotificationsCount = 0; // Showing the notification center resets the unread counter to 0
            updateNotificationsCenterStatusItem = true;
        }
        if (this.isNotificationsToastsVisible !== isToastsVisible) {
            this.isNotificationsToastsVisible = isToastsVisible;
            updateNotificationsCenterStatusItem = true;
        }
        // Update in status bar as needed
        if (updateNotificationsCenterStatusItem) {
            this.updateNotificationsCenterStatusItem();
        }
    }
    onDidChangeStatusMessage(e) {
        const statusItem = e.item;
        switch (e.kind) {
            // Show status notification
            case 0 /* StatusMessageChangeType.ADD */:
                this.doSetStatusMessage(statusItem);
                break;
            // Hide status notification (if its still the current one)
            case 1 /* StatusMessageChangeType.REMOVE */:
                if (this.currentStatusMessage && this.currentStatusMessage[0] === statusItem) {
                    dispose(this.currentStatusMessage[1]);
                    this.currentStatusMessage = undefined;
                }
                break;
        }
    }
    doSetStatusMessage(item) {
        const message = item.message;
        const showAfter = item.options && typeof item.options.showAfter === 'number' ? item.options.showAfter : 0;
        const hideAfter = item.options && typeof item.options.hideAfter === 'number' ? item.options.hideAfter : -1;
        // Dismiss any previous
        if (this.currentStatusMessage) {
            dispose(this.currentStatusMessage[1]);
        }
        // Create new
        let statusMessageEntry;
        let showHandle = setTimeout(() => {
            statusMessageEntry = this.statusbarService.addEntry({
                name: localize('status.message', "Status Message"),
                text: message,
                ariaLabel: message
            }, 'status.message', 0 /* StatusbarAlignment.LEFT */, Number.NEGATIVE_INFINITY /* last entry */);
            showHandle = null;
        }, showAfter);
        // Dispose function takes care of timeouts and actual entry
        let hideHandle;
        const statusMessageDispose = {
            dispose: () => {
                if (showHandle) {
                    clearTimeout(showHandle);
                }
                if (hideHandle) {
                    clearTimeout(hideHandle);
                }
                statusMessageEntry?.dispose();
            }
        };
        if (hideAfter > 0) {
            hideHandle = setTimeout(() => statusMessageDispose.dispose(), hideAfter);
        }
        // Remember as current status message
        this.currentStatusMessage = [item, statusMessageDispose];
    }
};
NotificationsStatus = __decorate([
    __param(1, IStatusbarService),
    __param(2, INotificationService)
], NotificationsStatus);
export { NotificationsStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1N0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc1N0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQWdFLE1BQU0sa0RBQWtELENBQUM7QUFDbkosT0FBTyxFQUFFLFVBQVUsRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4RixPQUFPLEVBQUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFOUcsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBVWxELFlBQ2tCLEtBQTBCLEVBQ3hCLGdCQUFvRCxFQUNqRCxtQkFBMEQ7UUFFaEYsS0FBSyxFQUFFLENBQUM7UUFKUyxVQUFLLEdBQUwsS0FBSyxDQUFxQjtRQUNQLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDaEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQVZ6RSwwQkFBcUIsR0FBRyxDQUFDLENBQUM7UUFJMUIsaUNBQTRCLEdBQVksS0FBSyxDQUFDO1FBQzlDLGlDQUE0QixHQUFZLEtBQUssQ0FBQztRQVNyRCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsQ0FBQztRQUUzQyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLGFBQWEs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