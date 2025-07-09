/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { formatCellDuration } from '../../../browser/contrib/cellStatusBar/executionStatusBarItemController.js';
suite('notebookBrowser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('formatCellDuration', function () {
        assert.strictEqual(formatCellDuration(0, false), '0.0s');
        assert.strictEqual(formatCellDuration(0), '0ms');
        assert.strictEqual(formatCellDuration(10, false), '0.0s');
        assert.strictEqual(formatCellDuration(10), '10ms');
        assert.strictEqual(formatCellDuration(100, false), '0.1s');
        assert.strictEqual(formatCellDuration(100), '100ms');
        assert.strictEqual(formatCellDuration(200, false), '0.2s');
        assert.strictEqual(formatCellDuration(200), '200ms');
        assert.strictEqual(formatCellDuration(3300), '3.3s');
        assert.strictEqual(formatCellDuration(180000), '3m 0.0s');
        assert.strictEqual(formatCellDuration(189412), '3m 9.4s');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0aW9uU3RhdHVzQmFySXRlbS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL2V4ZWN1dGlvblN0YXR1c0Jhckl0ZW0udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFFaEgsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==