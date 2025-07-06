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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbm90aWZpY2F0aW9uL2NvbW1vbi9ub3RpZmljYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sWUFBWSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxNQUFNLEtBQVEsUUFBUSxHQUFHLFlBQVksQ0FBQztBQUV0QyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUM7QUFJakcsTUFBTSxDQUFOLElBQVksb0JBZ0JYO0FBaEJELFdBQVksb0JBQW9CO0lBRS9COztPQUVHO0lBQ0gscUVBQU8sQ0FBQTtJQUVQOztPQUVHO0lBQ0gsbUVBQU0sQ0FBQTtJQUVOOztPQUVHO0lBQ0gsbUVBQU0sQ0FBQTtBQUNQLENBQUMsRUFoQlcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQWdCL0I7QUF5QkQsTUFBTSxDQUFOLElBQVksbUJBa0JYO0FBbEJELFdBQVksbUJBQW1CO0lBRTlCOztPQUVHO0lBQ0gsdUVBQVMsQ0FBQTtJQUVUOzs7T0FHRztJQUNILG1FQUFPLENBQUE7SUFFUDs7O09BR0c7SUFDSCwyRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQWxCVyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBa0I5QjtBQW9DRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsS0FBYztJQUNsRCxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ1gsTUFBTSxTQUFTLEdBQUcsS0FBNEIsQ0FBQztRQUUvQyxPQUFPLE9BQU8sU0FBUyxDQUFDLEVBQUUsS0FBSyxRQUFRLElBQUksT0FBTyxTQUFTLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQztJQUNoRixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBdU5ELE1BQU0sQ0FBTixJQUFZLG1CQVdYO0FBWEQsV0FBWSxtQkFBbUI7SUFFOUI7O09BRUc7SUFDSCwyREFBRyxDQUFBO0lBRUg7O01BRUU7SUFDRiwrREFBSyxDQUFBO0FBQ04sQ0FBQyxFQVhXLG1CQUFtQixLQUFuQixtQkFBbUIsUUFXOUI7QUEwR0QsTUFBTSxPQUFPLGdCQUFnQjtJQUE3QjtRQUVVLGFBQVEsR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBRTlCLGVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3hCLDBCQUFxQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFPN0MsQ0FBQztJQUxBLGNBQWMsQ0FBQyxRQUFrQixJQUFVLENBQUM7SUFDNUMsYUFBYSxDQUFDLE9BQTRCLElBQVUsQ0FBQztJQUNyRCxhQUFhLENBQUMsT0FBOEIsSUFBVSxDQUFDO0lBRXZELEtBQUssS0FBVyxDQUFDO0NBQ2pCO0FBRUQsTUFBTSxPQUFPLFlBQVk7SUFDeEIsUUFBUSxLQUFXLENBQUM7SUFDcEIsSUFBSSxLQUFXLENBQUM7SUFDaEIsS0FBSyxDQUFDLEtBQWEsSUFBVSxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxLQUFhLElBQVUsQ0FBQztDQUMvQiJ9