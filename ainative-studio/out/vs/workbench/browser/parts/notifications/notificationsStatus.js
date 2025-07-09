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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1N0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnNTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFnRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25KLE9BQU8sRUFBRSxVQUFVLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTlHLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQVVsRCxZQUNrQixLQUEwQixFQUN4QixnQkFBb0QsRUFDakQsbUJBQTBEO1FBRWhGLEtBQUssRUFBRSxDQUFDO1FBSlMsVUFBSyxHQUFMLEtBQUssQ0FBcUI7UUFDUCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ2hDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFWekUsMEJBQXFCLEdBQUcsQ0FBQyxDQUFDO1FBSTFCLGlDQUE0QixHQUFZLEtBQUssQ0FBQztRQUM5QyxpQ0FBNEIsR0FBWSxLQUFLLENBQUM7UUFTckQsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLENBQUM7UUFFM0MsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxhQUFh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