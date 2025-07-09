/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { resolveWorkbenchCommonProperties } from '../../browser/workbenchCommonProperties.js';
import { InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Browser Telemetry - common properties', function () {
    const commit = (undefined);
    const version = (undefined);
    let testStorageService;
    teardown(() => {
        testStorageService.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testStorageService = new InMemoryStorageService();
    });
    test('mixes in additional properties', async function () {
        const resolveCommonTelemetryProperties = () => {
            return {
                'userId': '1'
            };
        };
        const props = resolveWorkbenchCommonProperties(testStorageService, commit, version, false, undefined, undefined, false, resolveCommonTelemetryProperties);
        assert.ok('commitHash' in props);
        assert.ok('sessionID' in props);
        assert.ok('timestamp' in props);
        assert.ok('common.platform' in props);
        assert.ok('common.timesincesessionstart' in props);
        assert.ok('common.sequence' in props);
        assert.ok('version' in props);
        assert.ok('common.firstSessionDate' in props, 'firstSessionDate');
        assert.ok('common.lastSessionDate' in props, 'lastSessionDate');
        assert.ok('common.isNewSession' in props, 'isNewSession');
        assert.ok('common.machineId' in props, 'machineId');
        assert.strictEqual(props['userId'], '1');
    });
    test('mixes in additional dyanmic properties', async function () {
        let i = 1;
        const resolveCommonTelemetryProperties = () => {
            return Object.defineProperties({}, {
                'userId': {
                    get: () => {
                        return i++;
                    },
                    enumerable: true
                }
            });
        };
        const props = resolveWorkbenchCommonProperties(testStorageService, commit, version, false, undefined, undefined, false, resolveCommonTelemetryProperties);
        assert.strictEqual(props['userId'], 1);
        const props2 = resolveWorkbenchCommonProperties(testStorageService, commit, version, false, undefined, undefined, false, resolveCommonTelemetryProperties);
        assert.strictEqual(props2['userId'], 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZWxlbWV0cnkvdGVzdC9icm93c2VyL2NvbW1vblByb3BlcnRpZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDM0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLHVDQUF1QyxFQUFFO0lBRTlDLE1BQU0sTUFBTSxHQUFXLENBQUMsU0FBUyxDQUFFLENBQUM7SUFDcEMsTUFBTSxPQUFPLEdBQVcsQ0FBQyxTQUFTLENBQUUsQ0FBQztJQUNyQyxJQUFJLGtCQUEwQyxDQUFDO0lBRS9DLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGtCQUFrQixHQUFHLElBQUksc0JBQXNCLEVBQUUsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLO1FBQzNDLE1BQU0sZ0NBQWdDLEdBQUcsR0FBRyxFQUFFO1lBQzdDLE9BQU87Z0JBQ04sUUFBUSxFQUFFLEdBQUc7YUFDYixDQUFDO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsTUFBTSxLQUFLLEdBQUcsZ0NBQWdDLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztRQUUxSixNQUFNLENBQUMsRUFBRSxDQUFDLFlBQVksSUFBSSxLQUFLLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixJQUFJLEtBQUssQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxFQUFFLENBQUMsOEJBQThCLElBQUksS0FBSyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsRUFBRSxDQUFDLHlCQUF5QixJQUFJLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsd0JBQXdCLElBQUksS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsSUFBSSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsSUFBSSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSztRQUNuRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDVixNQUFNLGdDQUFnQyxHQUFHLEdBQUcsRUFBRTtZQUM3QyxPQUFPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2xDLFFBQVEsRUFBRTtvQkFDVCxHQUFHLEVBQUUsR0FBRyxFQUFFO3dCQUNULE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osQ0FBQztvQkFDRCxVQUFVLEVBQUUsSUFBSTtpQkFDaEI7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7UUFFRixNQUFNLEtBQUssR0FBRyxnQ0FBZ0MsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQzFKLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxDQUFDLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7UUFDM0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9