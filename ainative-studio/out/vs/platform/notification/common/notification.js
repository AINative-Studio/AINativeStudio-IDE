/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../base/common/event.js';
import BaseSeverity from '../../../base/common/severity.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var Severity = BaseSeverity;
export const INotificationService = createDecorator('notificationService');
export var NotificationPriority;
(function (NotificationPriority) {
    /**
     * Default priority: notification will be visible unless do not disturb mode is enabled.
     */
    NotificationPriority[NotificationPriority["DEFAULT"] = 0] = "DEFAULT";
    /**
     * Silent priority: notification will only be visible from the notifications center.
     */
    NotificationPriority[NotificationPriority["SILENT"] = 1] = "SILENT";
    /**
     * Urgent priority: notification will be visible even when do not disturb mode is enabled.
     */
    NotificationPriority[NotificationPriority["URGENT"] = 2] = "URGENT";
})(NotificationPriority || (NotificationPriority = {}));
export var NeverShowAgainScope;
(function (NeverShowAgainScope) {
    /**
     * Will never show this notification on the current workspace again.
     */
    NeverShowAgainScope[NeverShowAgainScope["WORKSPACE"] = 0] = "WORKSPACE";
    /**
     * Will never show this notification on any workspace of the same
     * profile again.
     */
    NeverShowAgainScope[NeverShowAgainScope["PROFILE"] = 1] = "PROFILE";
    /**
     * Will never show this notification on any workspace across all
     * profiles again.
     */
    NeverShowAgainScope[NeverShowAgainScope["APPLICATION"] = 2] = "APPLICATION";
})(NeverShowAgainScope || (NeverShowAgainScope = {}));
export function isNotificationSource(thing) {
    if (thing) {
        const candidate = thing;
        return typeof candidate.id === 'string' && typeof candidate.label === 'string';
    }
    return false;
}
export var NotificationsFilter;
(function (NotificationsFilter) {
    /**
     * No filter is enabled.
     */
    NotificationsFilter[NotificationsFilter["OFF"] = 0] = "OFF";
    /**
     * All notifications are silent except error notifications.
    */
    NotificationsFilter[NotificationsFilter["ERROR"] = 1] = "ERROR";
})(NotificationsFilter || (NotificationsFilter = {}));
export class NoOpNotification {
    constructor() {
        this.progress = new NoOpProgress();
        this.onDidClose = Event.None;
        this.onDidChangeVisibility = Event.None;
    }
    updateSeverity(severity) { }
    updateMessage(message) { }
    updateActions(actions) { }
    close() { }
}
export class NoOpProgress {
    infinite() { }
    done() { }
    total(value) { }
    worked(value) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9ub3RpZmljYXRpb24vY29tbW9uL25vdGlmaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxZQUFZLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRTlFLE1BQU0sS0FBUSxRQUFRLEdBQUcsWUFBWSxDQUFDO0FBRXRDLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQztBQUlqRyxNQUFNLENBQU4sSUFBWSxvQkFnQlg7QUFoQkQsV0FBWSxvQkFBb0I7SUFFL0I7O09BRUc7SUFDSCxxRUFBTyxDQUFBO0lBRVA7O09BRUc7SUFDSCxtRUFBTSxDQUFBO0lBRU47O09BRUc7SUFDSCxtRUFBTSxDQUFBO0FBQ1AsQ0FBQyxFQWhCVyxvQkFBb0IsS0FBcEIsb0JBQW9CLFFBZ0IvQjtBQXlCRCxNQUFNLENBQU4sSUFBWSxtQkFrQlg7QUFsQkQsV0FBWSxtQkFBbUI7SUFFOUI7O09BRUc7SUFDSCx1RUFBUyxDQUFBO0lBRVQ7OztPQUdHO0lBQ0gsbUVBQU8sQ0FBQTtJQUVQOzs7T0FHRztJQUNILDJFQUFXLENBQUE7QUFDWixDQUFDLEVBbEJXLG1CQUFtQixLQUFuQixtQkFBbUIsUUFrQjlCO0FBb0NELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxLQUFjO0lBQ2xELElBQUksS0FBSyxFQUFFLENBQUM7UUFDWCxNQUFNLFNBQVMsR0FBRyxLQUE0QixDQUFDO1FBRS9DLE9BQU8sT0FBTyxTQUFTLENBQUMsRUFBRSxLQUFLLFFBQVEsSUFBSSxPQUFPLFNBQVMsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDO0lBQ2hGLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUF1TkQsTUFBTSxDQUFOLElBQVksbUJBV1g7QUFYRCxXQUFZLG1CQUFtQjtJQUU5Qjs7T0FFRztJQUNILDJEQUFHLENBQUE7SUFFSDs7TUFFRTtJQUNGLCtEQUFLLENBQUE7QUFDTixDQUFDLEVBWFcsbUJBQW1CLEtBQW5CLG1CQUFtQixRQVc5QjtBQTBHRCxNQUFNLE9BQU8sZ0JBQWdCO0lBQTdCO1FBRVUsYUFBUSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFFOUIsZUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDeEIsMEJBQXFCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQU83QyxDQUFDO0lBTEEsY0FBYyxDQUFDLFFBQWtCLElBQVUsQ0FBQztJQUM1QyxhQUFhLENBQUMsT0FBNEIsSUFBVSxDQUFDO0lBQ3JELGFBQWEsQ0FBQyxPQUE4QixJQUFVLENBQUM7SUFFdkQsS0FBSyxLQUFXLENBQUM7Q0FDakI7QUFFRCxNQUFNLE9BQU8sWUFBWTtJQUN4QixRQUFRLEtBQVcsQ0FBQztJQUNwQixJQUFJLEtBQVcsQ0FBQztJQUNoQixLQUFLLENBQUMsS0FBYSxJQUFVLENBQUM7SUFDOUIsTUFBTSxDQUFDLEtBQWEsSUFBVSxDQUFDO0NBQy9CIn0=