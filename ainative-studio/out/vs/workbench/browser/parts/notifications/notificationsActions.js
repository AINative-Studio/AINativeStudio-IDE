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
import './media/notificationsActions.css';
import { localize } from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { CLEAR_NOTIFICATION, EXPAND_NOTIFICATION, COLLAPSE_NOTIFICATION, CLEAR_ALL_NOTIFICATIONS, HIDE_NOTIFICATIONS_CENTER, TOGGLE_DO_NOT_DISTURB_MODE, TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE } from './notificationsCommands.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
const clearIcon = registerIcon('notifications-clear', Codicon.close, localize('clearIcon', 'Icon for the clear action in notifications.'));
const clearAllIcon = registerIcon('notifications-clear-all', Codicon.clearAll, localize('clearAllIcon', 'Icon for the clear all action in notifications.'));
const hideIcon = registerIcon('notifications-hide', Codicon.chevronDown, localize('hideIcon', 'Icon for the hide action in notifications.'));
const expandIcon = registerIcon('notifications-expand', Codicon.chevronUp, localize('expandIcon', 'Icon for the expand action in notifications.'));
const collapseIcon = registerIcon('notifications-collapse', Codicon.chevronDown, localize('collapseIcon', 'Icon for the collapse action in notifications.'));
const configureIcon = registerIcon('notifications-configure', Codicon.gear, localize('configureIcon', 'Icon for the configure action in notifications.'));
const doNotDisturbIcon = registerIcon('notifications-do-not-disturb', Codicon.bellSlash, localize('doNotDisturbIcon', 'Icon for the mute all action in notifications.'));
let ClearNotificationAction = class ClearNotificationAction extends Action {
    static { this.ID = CLEAR_NOTIFICATION; }
    static { this.LABEL = localize('clearNotification', "Clear Notification"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(clearIcon));
        this.commandService = commandService;
    }
    async run(notification) {
        this.commandService.executeCommand(CLEAR_NOTIFICATION, notification);
    }
};
ClearNotificationAction = __decorate([
    __param(2, ICommandService)
], ClearNotificationAction);
export { ClearNotificationAction };
let ClearAllNotificationsAction = class ClearAllNotificationsAction extends Action {
    static { this.ID = CLEAR_ALL_NOTIFICATIONS; }
    static { this.LABEL = localize('clearNotifications', "Clear All Notifications"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(clearAllIcon));
        this.commandService = commandService;
    }
    async run() {
        this.commandService.executeCommand(CLEAR_ALL_NOTIFICATIONS);
    }
};
ClearAllNotificationsAction = __decorate([
    __param(2, ICommandService)
], ClearAllNotificationsAction);
export { ClearAllNotificationsAction };
let ToggleDoNotDisturbAction = class ToggleDoNotDisturbAction extends Action {
    static { this.ID = TOGGLE_DO_NOT_DISTURB_MODE; }
    static { this.LABEL = localize('toggleDoNotDisturbMode', "Toggle Do Not Disturb Mode"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(doNotDisturbIcon));
        this.commandService = commandService;
    }
    async run() {
        this.commandService.executeCommand(TOGGLE_DO_NOT_DISTURB_MODE);
    }
};
ToggleDoNotDisturbAction = __decorate([
    __param(2, ICommandService)
], ToggleDoNotDisturbAction);
export { ToggleDoNotDisturbAction };
let ToggleDoNotDisturbBySourceAction = class ToggleDoNotDisturbBySourceAction extends Action {
    static { this.ID = TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE; }
    static { this.LABEL = localize('toggleDoNotDisturbModeBySource', "Toggle Do Not Disturb Mode By Source..."); }
    constructor(id, label, commandService) {
        super(id, label);
        this.commandService = commandService;
    }
    async run() {
        this.commandService.executeCommand(TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE);
    }
};
ToggleDoNotDisturbBySourceAction = __decorate([
    __param(2, ICommandService)
], ToggleDoNotDisturbBySourceAction);
export { ToggleDoNotDisturbBySourceAction };
export class ConfigureDoNotDisturbAction extends Action {
    static { this.ID = 'workbench.action.configureDoNotDisturbMode'; }
    static { this.LABEL = localize('configureDoNotDisturbMode', "Configure Do Not Disturb..."); }
    constructor(id, label) {
        super(id, label, ThemeIcon.asClassName(doNotDisturbIcon));
    }
}
let HideNotificationsCenterAction = class HideNotificationsCenterAction extends Action {
    static { this.ID = HIDE_NOTIFICATIONS_CENTER; }
    static { this.LABEL = localize('hideNotificationsCenter', "Hide Notifications"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(hideIcon));
        this.commandService = commandService;
    }
    async run() {
        this.commandService.executeCommand(HIDE_NOTIFICATIONS_CENTER);
    }
};
HideNotificationsCenterAction = __decorate([
    __param(2, ICommandService)
], HideNotificationsCenterAction);
export { HideNotificationsCenterAction };
let ExpandNotificationAction = class ExpandNotificationAction extends Action {
    static { this.ID = EXPAND_NOTIFICATION; }
    static { this.LABEL = localize('expandNotification', "Expand Notification"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(expandIcon));
        this.commandService = commandService;
    }
    async run(notification) {
        this.commandService.executeCommand(EXPAND_NOTIFICATION, notification);
    }
};
ExpandNotificationAction = __decorate([
    __param(2, ICommandService)
], ExpandNotificationAction);
export { ExpandNotificationAction };
let CollapseNotificationAction = class CollapseNotificationAction extends Action {
    static { this.ID = COLLAPSE_NOTIFICATION; }
    static { this.LABEL = localize('collapseNotification', "Collapse Notification"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(collapseIcon));
        this.commandService = commandService;
    }
    async run(notification) {
        this.commandService.executeCommand(COLLAPSE_NOTIFICATION, notification);
    }
};
CollapseNotificationAction = __decorate([
    __param(2, ICommandService)
], CollapseNotificationAction);
export { CollapseNotificationAction };
export class ConfigureNotificationAction extends Action {
    static { this.ID = 'workbench.action.configureNotification'; }
    static { this.LABEL = localize('configureNotification', "More Actions..."); }
    constructor(id, label, notification) {
        super(id, label, ThemeIcon.asClassName(configureIcon));
        this.notification = notification;
    }
}
let CopyNotificationMessageAction = class CopyNotificationMessageAction extends Action {
    static { this.ID = 'workbench.action.copyNotificationMessage'; }
    static { this.LABEL = localize('copyNotification', "Copy Text"); }
    constructor(id, label, clipboardService) {
        super(id, label);
        this.clipboardService = clipboardService;
    }
    run(notification) {
        return this.clipboardService.writeText(notification.message.raw);
    }
};
CopyNotificationMessageAction = __decorate([
    __param(2, IClipboardService)
], CopyNotificationMessageAction);
export { CopyNotificationMessageAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxrQ0FBa0MsQ0FBQztBQUUxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBRSwwQkFBMEIsRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xPLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLDZDQUE2QyxDQUFDLENBQUMsQ0FBQztBQUMzSSxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMseUJBQXlCLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGlEQUFpRCxDQUFDLENB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