/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IAccessibleViewService, AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibilitySignalService, AccessibilitySignal } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IListService, WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { getNotificationFromContext } from './notificationsCommands.js';
import { NotificationFocusedContext } from '../../../common/contextkeys.js';
export class NotificationAccessibleView {
    constructor() {
        this.priority = 90;
        this.name = 'notifications';
        this.when = NotificationFocusedContext;
        this.type = "view" /* AccessibleViewType.View */;
    }
    getProvider(accessor) {
        const accessibleViewService = accessor.get(IAccessibleViewService);
        const listService = accessor.get(IListService);
        const commandService = accessor.get(ICommandService);
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        function getProvider() {
            const notification = getNotificationFromContext(listService);
            if (!notification) {
                return;
            }
            commandService.executeCommand('notifications.showList');
            let notificationIndex;
            const list = listService.lastFocusedList;
            if (list instanceof WorkbenchList) {
                notificationIndex = list.indexOf(notification);
            }
            if (notificationIndex === undefined) {
                return;
            }
            function focusList() {
                commandService.executeCommand('notifications.showList');
                if (list && notificationIndex !== undefined) {
                    list.domFocus();
                    try {
                        list.setFocus([notificationIndex]);
                    }
                    catch { }
                }
            }
            function getContentForNotification() {
                const notification = getNotificationFromContext(listService);
                const message = notification?.message.original.toString();
                if (!notification) {
                    return;
                }
                return notification.source ? localize('notification.accessibleViewSrc', '{0} Source: {1}', message, notification.source) : localize('notification.accessibleView', '{0}', message);
            }
            const content = getContentForNotification();
            if (!content) {
                return;
            }
            notification.onDidClose(() => accessibleViewService.next());
            return new AccessibleContentProvider("notification" /* AccessibleViewProviderId.Notification */, { type: "view" /* AccessibleViewType.View */ }, () => content, () => focusList(), 'accessibility.verbosity.notification', undefined, getActionsFromNotification(notification, accessibilitySignalService), () => {
                if (!list) {
                    return;
                }
                focusList();
                list.focusNext();
                return getContentForNotification();
            }, () => {
                if (!list) {
                    return;
                }
                focusList();
                list.focusPrevious();
                return getContentForNotification();
            });
        }
        return getProvider();
    }
}
function getActionsFromNotification(notification, accessibilitySignalService) {
    let actions = undefined;
    if (notification.actions) {
        actions = [];
        if (notification.actions.primary) {
            actions.push(...notification.actions.primary);
        }
        if (notification.actions.secondary) {
            actions.push(...notification.actions.secondary);
        }
    }
    if (actions) {
        for (const action of actions) {
            action.class = ThemeIcon.asClassName(Codicon.bell);
            const initialAction = action.run;
            action.run = () => {
                initialAction();
                notification.close();
            };
        }
    }
    const manageExtension = actions?.find(a => a.label.includes('Manage Extension'));
    if (manageExtension) {
        manageExtension.class = ThemeIcon.asClassName(Codicon.gear);
    }
    if (actions) {
        actions.push({
            id: 'clearNotification', label: localize('clearNotification', "Clear Notification"), tooltip: localize('clearNotification', "Clear Notification"), run: () => {
                notification.close();
                accessibilitySignalService.playSignal(AccessibilitySignal.clear);
            }, enabled: true, class: ThemeIcon.asClassName(Codicon.clearAll)
        });
    }
    return actions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uQWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25BY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsc0JBQXNCLEVBQWdELHlCQUF5QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFL0ssT0FBTyxFQUFFLDJCQUEyQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDbEosT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRW5GLE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDL0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDeEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHNUUsTUFBTSxPQUFPLDBCQUEwQjtJQUF2QztRQUNVLGFBQVEsR0FBRyxFQUFFLENBQUM7UUFDZCxTQUFJLEdBQUcsZUFBZSxDQUFDO1FBQ3ZCLFNBQUksR0FBRywwQkFBMEIsQ0FBQztRQUNsQyxTQUFJLHdDQUEyQjtJQXlFekMsQ0FBQztJQXhFQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENB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