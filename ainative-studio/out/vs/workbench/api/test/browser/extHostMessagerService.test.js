/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MainThreadMessageService } from '../../browser/mainThreadMessageService.js';
import { NoOpNotification } from '../../../../platform/notification/common/notification.js';
import { mock } from '../../../../base/test/common/mock.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestExtensionService } from '../../../test/common/workbenchTestServices.js';
const emptyCommandService = {
    _serviceBrand: undefined,
    onWillExecuteCommand: () => Disposable.None,
    onDidExecuteCommand: () => Disposable.None,
    executeCommand: (commandId, ...args) => {
        return Promise.resolve(undefined);
    }
};
const emptyNotificationService = new class {
    constructor() {
        this.onDidAddNotification = Event.None;
        this.onDidRemoveNotification = Event.None;
        this.onDidChangeFilter = Event.None;
    }
    notify(...args) {
        throw new Error('not implemented');
    }
    info(...args) {
        throw new Error('not implemented');
    }
    warn(...args) {
        throw new Error('not implemented');
    }
    error(...args) {
        throw new Error('not implemented');
    }
    prompt(severity, message, choices, options) {
        throw new Error('not implemented');
    }
    status(message, options) {
        return Disposable.None;
    }
    setFilter() {
        throw new Error('not implemented');
    }
    getFilter(source) {
        throw new Error('not implemented');
    }
    getFilters() {
        throw new Error('not implemented');
    }
    removeFilter(sourceId) {
        throw new Error('not implemented');
    }
};
class EmptyNotificationService {
    constructor(withNotify) {
        this.withNotify = withNotify;
        this.filter = false;
        this.onDidAddNotification = Event.None;
        this.onDidRemoveNotification = Event.None;
        this.onDidChangeFilter = Event.None;
    }
    notify(notification) {
        this.withNotify(notification);
        return new NoOpNotification();
    }
    info(message) {
        throw new Error('Method not implemented.');
    }
    warn(message) {
        throw new Error('Method not implemented.');
    }
    error(message) {
        throw new Error('Method not implemented.');
    }
    prompt(severity, message, choices, options) {
        throw new Error('Method not implemented');
    }
    status(message, options) {
        return Disposable.None;
    }
    setFilter() {
        throw new Error('Method not implemented.');
    }
    getFilter(source) {
        throw new Error('Method not implemented.');
    }
    getFilters() {
        throw new Error('Method not implemented.');
    }
    removeFilter(sourceId) {
        throw new Error('Method not implemented.');
    }
}
suite('ExtHostMessageService', function () {
    test('propagte handle on select', async function () {
        const service = new MainThreadMessageService(null, new EmptyNotificationService(notification => {
            assert.strictEqual(notification.actions.primary.length, 1);
            queueMicrotask(() => notification.actions.primary[0].run());
        }), emptyCommandService, new TestDialogService(), new TestExtensionService());
        const handle = await service.$showMessage(1, 'h', {}, [{ handle: 42, title: 'a thing', isCloseAffordance: true }]);
        assert.strictEqual(handle, 42);
        service.dispose();
    });
    suite('modal', () => {
        test('calls dialog service', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new class extends mock() {
                prompt({ type, message, buttons, cancelButton }) {
                    assert.strictEqual(type, 1);
                    assert.strictEqual(message, 'h');
                    assert.strictEqual(buttons.length, 1);
                    assert.strictEqual(cancelButton.label, 'Cancel');
                    return Promise.resolve({ result: buttons[0].run({ checkboxChecked: false }) });
                }
            }, new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [{ handle: 42, title: 'a thing', isCloseAffordance: false }]);
            assert.strictEqual(handle, 42);
            service.dispose();
        });
        test('returns undefined when cancelled', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new class extends mock() {
                prompt(prompt) {
                    return Promise.resolve({ result: prompt.cancelButton.run({ checkboxChecked: false }) });
                }
            }, new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [{ handle: 42, title: 'a thing', isCloseAffordance: false }]);
            assert.strictEqual(handle, undefined);
            service.dispose();
        });
        test('hides Cancel button when not needed', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new class extends mock() {
                prompt({ type, message, buttons, cancelButton }) {
                    assert.strictEqual(buttons.length, 0);
                    assert.ok(cancelButton);
                    return Promise.resolve({ result: cancelButton.run({ checkboxChecked: false }) });
                }
            }, new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [{ handle: 42, title: 'a thing', isCloseAffordance: true }]);
            assert.strictEqual(handle, 42);
            service.dispose();
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lc3NhZ2VyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RNZXNzYWdlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFckYsT0FBTyxFQUF1QyxnQkFBZ0IsRUFBNEosTUFBTSwwREFBMEQsQ0FBQztBQUUzUixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUVyRixNQUFNLG1CQUFtQixHQUFvQjtJQUM1QyxhQUFhLEVBQUUsU0FBUztJQUN4QixvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtJQUMzQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtJQUMxQyxjQUFjLEVBQUUsQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBVyxFQUFnQixFQUFFO1FBQ25FLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuQyxDQUFDO0NBQ0QsQ0FBQztBQUVGLE1B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