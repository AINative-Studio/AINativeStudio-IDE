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
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { isNotificationViewItem } from '../../../common/notifications.js';
import { MenuRegistry, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { IListService, WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { NotificationFocusedContext, NotificationsCenterVisibleContext, NotificationsToastsVisibleContext } from '../../../common/contextkeys.js';
import { INotificationService, NotificationsFilter } from '../../../../platform/notification/common/notification.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
// Center
export const SHOW_NOTIFICATIONS_CENTER = 'notifications.showList';
export const HIDE_NOTIFICATIONS_CENTER = 'notifications.hideList';
const TOGGLE_NOTIFICATIONS_CENTER = 'notifications.toggleList';
// Toasts
export const HIDE_NOTIFICATION_TOAST = 'notifications.hideToasts';
const FOCUS_NOTIFICATION_TOAST = 'notifications.focusToasts';
const FOCUS_NEXT_NOTIFICATION_TOAST = 'notifications.focusNextToast';
const FOCUS_PREVIOUS_NOTIFICATION_TOAST = 'notifications.focusPreviousToast';
const FOCUS_FIRST_NOTIFICATION_TOAST = 'notifications.focusFirstToast';
const FOCUS_LAST_NOTIFICATION_TOAST = 'notifications.focusLastToast';
// Notification
export const COLLAPSE_NOTIFICATION = 'notification.collapse';
export const EXPAND_NOTIFICATION = 'notification.expand';
export const ACCEPT_PRIMARY_ACTION_NOTIFICATION = 'notification.acceptPrimaryAction';
const TOGGLE_NOTIFICATION = 'notification.toggle';
export const CLEAR_NOTIFICATION = 'notification.clear';
export const CLEAR_ALL_NOTIFICATIONS = 'notifications.clearAll';
export const TOGGLE_DO_NOT_DISTURB_MODE = 'notifications.toggleDoNotDisturbMode';
export const TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE = 'notifications.toggleDoNotDisturbModeBySource';
export function getNotificationFromContext(listService, context) {
    if (isNotificationViewItem(context)) {
        return context;
    }
    const list = listService.lastFocusedList;
    if (list instanceof WorkbenchList) {
        let element = list.getFocusedElements()[0];
        if (!isNotificationViewItem(element)) {
            if (list.isDOMFocused()) {
                // the notification list might have received focus
                // via keyboard and might not have a focused element.
                // in that case just return the first element
                // https://github.com/microsoft/vscode/issues/191705
                element = list.element(0);
            }
        }
        if (isNotificationViewItem(element)) {
            return element;
        }
    }
    return undefined;
}
export function registerNotificationCommands(center, toasts, model) {
    // Show Notifications Cneter
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: SHOW_NOTIFICATIONS_CENTER,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */),
        handler: () => {
            toasts.hide();
            center.show();
        }
    });
    // Hide Notifications Center
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: HIDE_NOTIFICATIONS_CENTER,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
        when: NotificationsCenterVisibleContext,
        primary: 9 /* KeyCode.Escape */,
        handler: () => center.hide()
    });
    // Toggle Notifications Center
    CommandsRegistry.registerCommand(TOGGLE_NOTIFICATIONS_CENTER, () => {
        if (center.isVisible) {
            center.hide();
        }
        else {
            toasts.hide();
            center.show();
        }
    });
    // Clear Notification
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLEAR_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: NotificationFocusedContext,
        primary: 20 /* KeyCode.Delete */,
        mac: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */
        },
        handler: (accessor, args) => {
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            const notification = getNotificationFromContext(accessor.get(IListService), args);
            if (notification && !notification.hasProgress) {
                notification.close();
                accessibilitySignalService.playSignal(AccessibilitySignal.clear);
            }
        }
    });
    // Expand Notification
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: EXPAND_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: NotificationFocusedContext,
        primary: 17 /* KeyCode.RightArrow */,
        handler: (accessor, args) => {
            const notification = getNotificationFromContext(accessor.get(IListService), args);
            notification?.expand();
        }
    });
    // Accept Primary Action
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: ACCEPT_PRIMARY_ACTION_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.or(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */,
        handler: (accessor) => {
            const actionRunner = accessor.get(IInstantiationService).createInstance(NotificationActionRunner);
            const notification = getNotificationFromContext(accessor.get(IListService)) || model.notifications.at(0);
            if (!notification) {
                return;
            }
            const primaryAction = notification.actions?.primary ? notification.actions.primary.at(0) : undefined;
            if (!primaryAction) {
                return;
            }
            actionRunner.run(primaryAction, notification);
            notification.close();
            actionRunner.dispose();
        }
    });
    // Collapse Notification
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: COLLAPSE_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: NotificationFocusedContext,
        primary: 15 /* KeyCode.LeftArrow */,
        handler: (accessor, args) => {
            const notification = getNotificationFromContext(accessor.get(IListService), args);
            notification?.collapse();
        }
    });
    // Toggle Notification
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: TOGGLE_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: NotificationFocusedContext,
        primary: 10 /* KeyCode.Space */,
        secondary: [3 /* KeyCode.Enter */],
        handler: accessor => {
            const notification = getNotificationFromContext(accessor.get(IListService));
            notification?.toggle();
        }
    });
    // Hide Toasts
    CommandsRegistry.registerCommand(HIDE_NOTIFICATION_TOAST, accessor => {
        toasts.hide();
    });
    KeybindingsRegistry.registerKeybindingRule({
        id: HIDE_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ - 50, // lower when not focused (e.g. let editor suggest win over this command)
        when: NotificationsToastsVisibleContext,
        primary: 9 /* KeyCode.Escape */
    });
    KeybindingsRegistry.registerKeybindingRule({
        id: HIDE_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100, // higher when focused
        when: ContextKeyExpr.and(NotificationsToastsVisibleContext, NotificationFocusedContext),
        primary: 9 /* KeyCode.Escape */
    });
    // Focus Toasts
    CommandsRegistry.registerCommand(FOCUS_NOTIFICATION_TOAST, () => toasts.focus());
    // Focus Next Toast
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: FOCUS_NEXT_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 18 /* KeyCode.DownArrow */,
        handler: () => {
            toasts.focusNext();
        }
    });
    // Focus Previous Toast
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: FOCUS_PREVIOUS_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 16 /* KeyCode.UpArrow */,
        handler: () => {
            toasts.focusPrevious();
        }
    });
    // Focus First Toast
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: FOCUS_FIRST_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 11 /* KeyCode.PageUp */,
        secondary: [14 /* KeyCode.Home */],
        handler: () => {
            toasts.focusFirst();
        }
    });
    // Focus Last Toast
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: FOCUS_LAST_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 12 /* KeyCode.PageDown */,
        secondary: [13 /* KeyCode.End */],
        handler: () => {
            toasts.focusLast();
        }
    });
    // Clear All Notifications
    CommandsRegistry.registerCommand(CLEAR_ALL_NOTIFICATIONS, () => center.clearAll());
    // Toggle Do Not Disturb Mode
    CommandsRegistry.registerCommand(TOGGLE_DO_NOT_DISTURB_MODE, accessor => {
        const notificationService = accessor.get(INotificationService);
        notificationService.setFilter(notificationService.getFilter() === NotificationsFilter.ERROR ? NotificationsFilter.OFF : NotificationsFilter.ERROR);
    });
    // Configure Do Not Disturb by Source
    CommandsRegistry.registerCommand(TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE, accessor => {
        const notificationService = accessor.get(INotificationService);
        const quickInputService = accessor.get(IQuickInputService);
        const sortedFilters = notificationService.getFilters().sort((a, b) => a.label.localeCompare(b.label));
        const disposables = new DisposableStore();
        const picker = disposables.add(quickInputService.createQuickPick());
        picker.items = sortedFilters.map(source => ({
            id: source.id,
            label: source.label,
            tooltip: `${source.label} (${source.id})`,
            filter: source.filter
        }));
        picker.canSelectMany = true;
        picker.placeholder = localize('selectSources', "Select sources to enable all notifications from");
        picker.selectedItems = picker.items.filter(item => item.filter === NotificationsFilter.OFF);
        picker.show();
        disposables.add(picker.onDidAccept(async () => {
            for (const item of picker.items) {
                notificationService.setFilter({
                    id: item.id,
                    label: item.label,
                    filter: picker.selectedItems.includes(item) ? NotificationsFilter.OFF : NotificationsFilter.ERROR
                });
            }
            picker.hide();
        }));
        disposables.add(picker.onDidHide(() => disposables.dispose()));
    });
    // Commands for Command Palette
    const category = localize2('notifications', 'Notifications');
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: SHOW_NOTIFICATIONS_CENTER, title: localize2('showNotifications', 'Show Notifications'), category } });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: HIDE_NOTIFICATIONS_CENTER, title: localize2('hideNotifications', 'Hide Notifications'), category }, when: NotificationsCenterVisibleContext });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: CLEAR_ALL_NOTIFICATIONS, title: localize2('clearAllNotifications', 'Clear All Notifications'), category } });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: ACCEPT_PRIMARY_ACTION_NOTIFICATION, title: localize2('acceptNotificationPrimaryAction', 'Accept Notification Primary Action'), category } });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: TOGGLE_DO_NOT_DISTURB_MODE, title: localize2('toggleDoNotDisturbMode', 'Toggle Do Not Disturb Mode'), category } });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE, title: localize2('toggleDoNotDisturbModeBySource', 'Toggle Do Not Disturb Mode By Source...'), category } });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: FOCUS_NOTIFICATION_TOAST, title: localize2('focusNotificationToasts', 'Focus Notification Toast'), category }, when: NotificationsToastsVisibleContext });
}
let NotificationActionRunner = class NotificationActionRunner extends ActionRunner {
    constructor(telemetryService, notificationService) {
        super();
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
    }
    async runAction(action, context) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id: action.id, from: 'message' });
        // Run and make sure to notify on any error again
        try {
            await super.runAction(action, context);
        }
        catch (error) {
            this.notificationService.error(error);
        }
    }
};
NotificationActionRunner = __decorate([
    __param(0, ITelemetryService),
    __param(1, INotificationService)
], NotificationActionRunner);
export { NotificationActionRunner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sRUFBeUIsc0JBQXNCLEVBQXNCLE1BQU0sa0NBQWtDLENBQUM7QUFDckgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLGlDQUFpQyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbEosT0FBTyxFQUFFLG9CQUFvQixFQUE2QixtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQWdGLE1BQU0sb0NBQW9DLENBQUM7QUFD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