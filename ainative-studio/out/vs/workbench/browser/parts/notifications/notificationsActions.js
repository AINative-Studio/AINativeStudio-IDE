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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGtDQUFrQyxDQUFDO0FBRTFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLDBCQUEwQixFQUFFLG9DQUFvQyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbE8sT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsNkNBQTZDLENBQUMsQ0FBQyxDQUFDO0FBQzNJLE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyx5QkFBeUIsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsaURBQWlELENBQUMsQ0FBQyxD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