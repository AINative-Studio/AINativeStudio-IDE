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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RGaWxlU3lzdGVtRXZlbnRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTlGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBRTNDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGdFQUFnRSxFQUFFO1FBRXRFLE1BQU0sUUFBUSxHQUFpQjtZQUM5QixRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsT0FBTyxTQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLEdBQUcsRUFBRSxTQUFVO1lBQ2YsT0FBTyxFQUFFLFNBQVU7WUFDbkIsZ0JBQWdCLEVBQUUsU0FBVTtZQUM1QixLQUFLLEVBQUUsU0FBVTtTQUNqQixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSw2QkFBNkIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxjQUFjLEVBQUUsRUFBRSxTQUFVLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFVLEVBQUUsU0FBVSxFQUFFLFNBQVUsRUFBRSx5QkFBeUIsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxTCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSw2QkFBNkIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxjQUFjLEVBQUUsRUFBRSxTQUFVLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFVLEVBQUUsU0FBVSxFQUFFLFNBQVUsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNuUSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0RCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7QUFFSixDQUFDLENBQUMsQ0FBQyJ9