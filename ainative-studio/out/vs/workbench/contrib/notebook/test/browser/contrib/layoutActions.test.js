/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ToggleCellToolbarPositionAction } from '../../../browser/contrib/layout/layoutActions.js';
suite('Notebook Layout Actions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Toggle Cell Toolbar Position', async function () {
        const action = new ToggleCellToolbarPositionAction();
        // "notebook.cellToolbarLocation": "right"
        assert.deepStrictEqual(action.togglePosition('test-nb', 'right'), {
            default: 'right',
            'test-nb': 'left'
        });
        // "notebook.cellToolbarLocation": "left"
        assert.deepStrictEqual(action.togglePosition('test-nb', 'left'), {
            default: 'left',
            'test-nb': 'right'
        });
        // "notebook.cellToolbarLocation": "hidden"
        assert.deepStrictEqual(action.togglePosition('test-nb', 'hidden'), {
            default: 'hidden',
            'test-nb': 'right'
        });
        // invalid
        assert.deepStrictEqual(action.togglePosition('test-nb', ''), {
            default: 'right',
            'test-nb': 'left'
        });
        // no user config, default value
        assert.deepStrictEqual(action.togglePosition('test-nb', {
            default: 'right'
        }), {
            default: 'right',
            'test-nb': 'left'
        });
        // user config, default to left
        assert.deepStrictEqual(action.togglePosition('test-nb', {
            default: 'left'
        }), {
            default: 'left',
            'test-nb': 'right'
        });
        // user config, default to hidden
        assert.deepStrictEqual(action.togglePosition('test-nb', {
            default: 'hidden'
        }), {
            default: 'hidden',
            'test-nb': 'right'
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9sYXlvdXRBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRW5HLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSztRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLCtCQUErQixFQUFFLENBQUM7UUFFckQsMENBQTBDO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDakUsT0FBTyxFQUFFLE9BQU87WUFDaEIsU0FBUyxFQUFFLE1BQU07U0FDakIsQ0FBQyxDQUFDO1FBRUgseUNBQXlDO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDaEUsT0FBTyxFQUFFLE1BQU07WUFDZixTQUFTLEVBQUUsT0FBTztTQUNsQixDQUFDLENBQUM7UUFFSCwyQ0FBMkM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsRUFBRTtZQUNsRSxPQUFPLEVBQUUsUUFBUTtZQUNqQixTQUFTLEVBQUUsT0FBTztTQUNsQixDQUFDLENBQUM7UUFFSCxVQUFVO1FBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRTtZQUM1RCxPQUFPLEVBQUUsT0FBTztZQUNoQixTQUFTLEVBQUUsTUFBTTtTQUNqQixDQUFDLENBQUM7UUFFSCxnQ0FBZ0M7UUFDaEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRTtZQUN2RCxPQUFPLEVBQUUsT0FBTztTQUNoQixDQUFDLEVBQUU7WUFDSCxPQUFPLEVBQUUsT0FBTztZQUNoQixTQUFTLEVBQUUsTUFBTTtTQUNqQixDQUFDLENBQUM7UUFFSCwrQkFBK0I7UUFDL0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRTtZQUN2RCxPQUFPLEVBQUUsTUFBTTtTQUNmLENBQUMsRUFBRTtZQUNILE9BQU8sRUFBRSxNQUFNO1lBQ2YsU0FBUyxFQUFFLE9BQU87U0FDbEIsQ0FBQyxDQUFDO1FBRUgsaUNBQWlDO1FBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUU7WUFDdkQsT0FBTyxFQUFFLFFBQVE7U0FDakIsQ0FBQyxFQUFFO1lBQ0gsT0FBTyxFQUFFLFFBQVE7WUFDakIsU0FBUyxFQUFFLE9BQU87U0FDbEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9