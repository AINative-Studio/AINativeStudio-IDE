/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { NotificationsModel, NotificationViewItem } from '../../common/notifications.js';
import { Action } from '../../../base/common/actions.js';
import { Severity, NotificationsFilter, NotificationPriority } from '../../../platform/notification/common/notification.js';
import { createErrorWithActions } from '../../../base/common/errorMessage.js';
import { NotificationService } from '../../services/notification/common/notificationService.js';
import { TestStorageService } from './workbenchTestServices.js';
import { timeout } from '../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
suite('Notifications', () => {
    const disposables = new DisposableStore();
    const noFilter = { global: NotificationsFilter.OFF, sources: new Map() };
    teardown(() => {
        disposables.clear();
    });
    test('Items', () => {
        // Invalid
        assert.ok(!NotificationViewItem.create({ severity: Severity.Error, message: '' }, noFilter));
        assert.ok(!NotificationViewItem.create({ severity: Severity.Error, message: null }, noFilter));
        // Duplicates
        const item1 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        const item2 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        const item3 = NotificationViewItem.create({ severity: Severity.Info, message: 'Info Message' }, noFilter);
        const item4 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message', source: 'Source' }, noFilter);
        const item5 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message', actions: { primary: [disposables.add(new Action('id', 'label'))] } }, noFilter);
        const item6 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message', actions: { primary: [disposables.add(new Action('id', 'label'))] }, progress: { infinite: true } }, noFilter);
        assert.strictEqual(item1.equals(item1), true);
        assert.strictEqual(item2.equals(item2), true);
        assert.strictEqual(item3.equals(item3), true);
        assert.strictEqual(item4.equals(item4), true);
        assert.strictEqual(item5.equals(item5), true);
        assert.strictEqual(item1.equals(item2), true);
        assert.strictEqual(item1.equals(item3), false);
        assert.strictEqual(item1.equals(item4), false);
        assert.strictEqual(item1.equals(item5), false);
        const itemId1 = NotificationViewItem.create({ id: 'same', message: 'Info Message', severity: Severity.Info }, noFilter);
        const itemId2 = NotificationViewItem.create({ id: 'same', message: 'Error Message', severity: Severity.Error }, noFilter);
        assert.strictEqual(itemId1.equals(itemId2), true);
        assert.strictEqual(itemId1.equals(item3), false);
        // Progress
        assert.strictEqual(item1.hasProgress, false);
        assert.strictEqual(item6.hasProgress, true);
        // Message Box
        assert.strictEqual(item5.canCollapse, false);
        assert.strictEqual(item5.expanded, true);
        // Events
        let called = 0;
        disposables.add(item1.onDidChangeExpansion(() => {
            called++;
        }));
        item1.expand();
        item1.expand();
        item1.collapse();
        item1.collapse();
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidChangeContent(e => {
            if (e.kind === 3 /* NotificationViewItemContentChangeKind.PROGRESS */) {
                called++;
            }
        }));
        item1.progress.infinite();
        item1.progress.done();
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidChangeContent(e => {
            if (e.kind === 1 /* NotificationViewItemContentChangeKind.MESSAGE */) {
                called++;
            }
        }));
        item1.updateMessage('message update');
        called = 0;
        disposables.add(item1.onDidChangeContent(e => {
            if (e.kind === 0 /* NotificationViewItemContentChangeKind.SEVERITY */) {
                called++;
            }
        }));
        item1.updateSeverity(Severity.Error);
        called = 0;
        disposables.add(item1.onDidChangeContent(e => {
            if (e.kind === 2 /* NotificationViewItemContentChangeKind.ACTIONS */) {
                called++;
            }
        }));
        item1.updateActions({ primary: [disposables.add(new Action('id2', 'label'))] });
        assert.strictEqual(called, 1);
        called = 0;
        disposables.add(item1.onDidChangeVisibility(e => {
            called++;
        }));
        item1.updateVisibility(true);
        item1.updateVisibility(false);
        item1.updateVisibility(false);
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidClose(() => {
            called++;
        }));
        item1.close();
        assert.strictEqual(called, 1);
        // Error with Action
        const item7 = NotificationViewItem.create({ severity: Severity.Error, message: createErrorWithActions('Hello Error', [disposables.add(new Action('id', 'label'))]) }, noFilter);
        assert.strictEqual(item7.actions.primary.length, 1);
        // Filter
        const item8 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, { global: NotificationsFilter.OFF, sources: new Map() });
        assert.strictEqual(item8.priority, NotificationPriority.DEFAULT);
        const item9 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, { global: NotificationsFilter.ERROR, sources: new Map() });
        assert.strictEqual(item9.priority, NotificationPriority.DEFAULT);
        const item10 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message' }, { global: NotificationsFilter.ERROR, sources: new Map() });
        assert.strictEqual(item10.priority, NotificationPriority.SILENT);
        const sources = new Map();
        sources.set('test.source', NotificationsFilter.ERROR);
        const item11 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message', source: 'test.source' }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item11.priority, NotificationPriority.DEFAULT);
        const item12 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message', source: { id: 'test.source', label: 'foo' } }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item12.priority, NotificationPriority.SILENT);
        const item13 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message', source: { id: 'test.source2', label: 'foo' } }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item13.priority, NotificationPriority.DEFAULT);
        for (const item of [item1, item2, item3, item4, item5, item6, itemId1, itemId2, item7, item8, item9, item10, item11, item12, item13]) {
            item.close();
        }
    });
    test('Items - does not fire changed when message did not change (content, severity)', async () => {
        const item1 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        let fired = false;
        disposables.add(item1.onDidChangeContent(() => {
            fired = true;
        }));
        item1.updateMessage('Error Message');
        await timeout(0);
        assert.ok(!fired, 'Expected onDidChangeContent to not be fired');
        item1.updateSeverity(Severity.Error);
        await timeout(0);
        assert.ok(!fired, 'Expected onDidChangeContent to not be fired');
        for (const item of [item1]) {
            item.close();
        }
    });
    test('Model', () => {
        const model = disposables.add(new NotificationsModel());
        let lastNotificationEvent;
        disposables.add(model.onDidChangeNotification(e => {
            lastNotificationEvent = e;
        }));
        let lastStatusMessageEvent;
        disposables.add(model.onDidChangeStatusMessage(e => {
            lastStatusMessageEvent = e;
        }));
        const item1 = { severity: Severity.Error, message: 'Error Message', actions: { primary: [disposables.add(new Action('id', 'label'))] } };
        const item2 = { severity: Severity.Warning, message: 'Warning Message', source: 'Some Source' };
        const item2Duplicate = { severity: Severity.Warning, message: 'Warning Message', source: 'Some Source' };
        const item3 = { severity: Severity.Info, message: 'Info Message' };
        const item1Handle = model.addNotification(item1);
        assert.strictEqual(lastNotificationEvent.item.severity, item1.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item1.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        item1Handle.updateMessage('Different Error Message');
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 1 /* NotificationViewItemContentChangeKind.MESSAGE */);
        item1Handle.updateSeverity(Severity.Warning);
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 0 /* NotificationViewItemContentChangeKind.SEVERITY */);
        item1Handle.updateActions({ primary: [], secondary: [] });
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 2 /* NotificationViewItemContentChangeKind.ACTIONS */);
        item1Handle.progress.infinite();
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 3 /* NotificationViewItemContentChangeKind.PROGRESS */);
        const item2Handle = model.addNotification(item2);
        assert.strictEqual(lastNotificationEvent.item.severity, item2.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        const item3Handle = model.addNotification(item3);
        assert.strictEqual(lastNotificationEvent.item.severity, item3.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item3.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        assert.strictEqual(model.notifications.length, 3);
        let called = 0;
        disposables.add(item1Handle.onDidClose(() => {
            called++;
        }));
        item1Handle.close();
        assert.strictEqual(called, 1);
        assert.strictEqual(model.notifications.length, 2);
        assert.strictEqual(lastNotificationEvent.item.severity, Severity.Warning);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), 'Different Error Message');
        assert.strictEqual(lastNotificationEvent.index, 2);
        assert.strictEqual(lastNotificationEvent.kind, 3 /* NotificationChangeType.REMOVE */);
        const item2DuplicateHandle = model.addNotification(item2Duplicate);
        assert.strictEqual(model.notifications.length, 2);
        assert.strictEqual(lastNotificationEvent.item.severity, item2Duplicate.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2Duplicate.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        item2Handle.close();
        assert.strictEqual(model.notifications.length, 1);
        assert.strictEqual(lastNotificationEvent.item.severity, item2Duplicate.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2Duplicate.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 3 /* NotificationChangeType.REMOVE */);
        model.notifications[0].expand();
        assert.strictEqual(lastNotificationEvent.item.severity, item3.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item3.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 2 /* NotificationChangeType.EXPAND_COLLAPSE */);
        const disposable = model.showStatusMessage('Hello World');
        assert.strictEqual(model.statusMessage.message, 'Hello World');
        assert.strictEqual(lastStatusMessageEvent.item.message, model.statusMessage.message);
        assert.strictEqual(lastStatusMessageEvent.kind, 0 /* StatusMessageChangeType.ADD */);
        disposable.dispose();
        assert.ok(!model.statusMessage);
        assert.strictEqual(lastStatusMessageEvent.kind, 1 /* StatusMessageChangeType.REMOVE */);
        const disposable2 = model.showStatusMessage('Hello World 2');
        const disposable3 = model.showStatusMessage('Hello World 3');
        assert.strictEqual(model.statusMessage.message, 'Hello World 3');
        disposable2.dispose();
        assert.strictEqual(model.statusMessage.message, 'Hello World 3');
        disposable3.dispose();
        assert.ok(!model.statusMessage);
        item2DuplicateHandle.close();
        item3Handle.close();
    });
    test('Service', async () => {
        const service = disposables.add(new NotificationService(disposables.add(new TestStorageService())));
        let addNotificationCount = 0;
        let notification;
        disposables.add(service.onDidAddNotification(n => {
            addNotificationCount++;
            notification = n;
        }));
        service.info('hello there');
        assert.strictEqual(addNotificationCount, 1);
        assert.strictEqual(notification.message, 'hello there');
        assert.strictEqual(notification.priority, NotificationPriority.DEFAULT);
        assert.strictEqual(notification.source, undefined);
        service.model.notifications[0].close();
        let notificationHandle = service.notify({ message: 'important message', severity: Severity.Warning });
        assert.strictEqual(addNotificationCount, 2);
        assert.strictEqual(notification.message, 'important message');
        assert.strictEqual(notification.severity, Severity.Warning);
        let removeNotificationCount = 0;
        disposables.add(service.onDidRemoveNotification(n => {
            removeNotificationCount++;
            notification = n;
        }));
        notificationHandle.close();
        assert.strictEqual(removeNotificationCount, 1);
        assert.strictEqual(notification.message, 'important message');
        notificationHandle = service.notify({ priority: NotificationPriority.SILENT, message: 'test', severity: Severity.Ignore });
        assert.strictEqual(addNotificationCount, 3);
        assert.strictEqual(notification.message, 'test');
        assert.strictEqual(notification.priority, NotificationPriority.SILENT);
        notificationHandle.close();
        assert.strictEqual(removeNotificationCount, 2);
        notificationHandle.close();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2NvbW1vbi9ub3RpZmljYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBcUssTUFBTSwrQkFBK0IsQ0FBQztBQUM1UCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekQsT0FBTyxFQUFpQixRQUFRLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMzSSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXBFLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBRTNCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsTUFBTSxRQUFRLEdBQXlCLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxDQUFDO0lBRS9GLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMs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