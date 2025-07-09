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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc0NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0sK0RBQStELENBQUM7QUFDdEgsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQXlCLHNCQUFzQixFQUFzQixNQUFNLGtDQUFrQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxpQ0FBaUMsRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2xKLE9BQU8sRUFBRSxvQkFBb0IsRUFBNkIsbUJBQW1CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoSixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFnRixNQUFNLG9DQUFvQyxDQUFDO0FB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