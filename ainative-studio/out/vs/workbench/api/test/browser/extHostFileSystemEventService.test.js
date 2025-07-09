/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ExtHostFileSystemEventService } from '../../common/extHostFileSystemEventService.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostFileSystemEventService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('FileSystemWatcher ignore events properties are reversed #26851', function () {
        const protocol = {
            getProxy: () => { return undefined; },
            set: undefined,
            dispose: undefined,
            assertRegistered: undefined,
            drain: undefined
        };
        const watcher1 = new ExtHostFileSystemEventService(protocol, new NullLogService(), undefined).createFileSystemWatcher(undefined, undefined, undefined, '**/somethingInteresting', {});
        assert.strictEqual(watcher1.ignoreChangeEvents, false);
        assert.strictEqual(watcher1.ignoreCreateEvents, false);
        assert.strictEqual(watcher1.ignoreDeleteEvents, false);
        watcher1.dispose();
        const watcher2 = new ExtHostFileSystemEventService(protocol, new NullLogService(), undefined).createFileSystemWatcher(undefined, undefined, undefined, '**/somethingBoring', { ignoreCreateEvents: true, ignoreChangeEvents: true, ignoreDeleteEvents: true });
        assert.strictEqual(watcher2.ignoreChangeEvents, true);
        assert.strictEqual(watcher2.ignoreCreateEvents, true);
        assert.strictEqual(watcher2.ignoreDeleteEvents, true);
        watcher2.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RmlsZVN5c3RlbUV2ZW50U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtJQUUzQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxnRUFBZ0UsRUFBRTtRQUV0RSxNQUFNLFFBQVEsR0FBaUI7WUFDOUIsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLE9BQU8sU0FBVSxDQUFDLENBQUMsQ0FBQztZQUN0QyxHQUFHLEVBQUUsU0FBVTtZQUNmLE9BQU8sRUFBRSxTQUFVO1lBQ25CLGdCQUFnQixFQUFFLFNBQVU7WUFDNUIsS0FBSyxFQUFFLFNBQVU7U0FDakIsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUksNkJBQTZCLENBQUMsUUFBUSxFQUFFLElBQUksY0FBYyxFQUFFLEVBQUUsU0FBVSxDQUFDLENBQUMsdUJBQXVCLENBQUMsU0FBVSxFQUFFLFNBQVUsRUFBRSxTQUFVLEVBQUUseUJBQXlCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUwsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRW5CLE1BQU0sUUFBUSxHQUFHLElBQUksNkJBQTZCLENBQUMsUUFBUSxFQUFFLElBQUksY0FBYyxFQUFFLEVBQUUsU0FBVSxDQUFDLENBQUMsdUJBQXVCLENBQUMsU0FBVSxFQUFFLFNBQVUsRUFBRSxTQUFVLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDblEsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBRUosQ0FBQyxDQUFDLENBQUMifQ==