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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL2xheW91dEFjdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbkcsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxLQUFLO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUksK0JBQStCLEVBQUUsQ0FBQztRQUVyRCwwQ0FBMEM7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRTtZQUNqRSxPQUFPLEVBQUUsT0FBTztZQUNoQixTQUFTLEVBQUUsTUFBTTtTQUNqQixDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNoRSxPQUFPLEVBQUUsTUFBTTtZQUNmLFNBQVMsRUFBRSxPQUFPO1NBQ2xCLENBQUMsQ0FBQztRQUVILDJDQUEyQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQ2xFLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLFNBQVMsRUFBRSxPQUFPO1NBQ2xCLENBQUMsQ0FBQztRQUVILFVBQVU7UUFDVixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzVELE9BQU8sRUFBRSxPQUFPO1lBQ2hCLFNBQVMsRUFBRSxNQUFNO1NBQ2pCLENBQUMsQ0FBQztRQUVILGdDQUFnQztRQUNoQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFO1lBQ3ZELE9BQU8sRUFBRSxPQUFPO1NBQ2hCLENBQUMsRUFBRTtZQUNILE9BQU8sRUFBRSxPQUFPO1lBQ2hCLFNBQVMsRUFBRSxNQUFNO1NBQ2pCLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFO1lBQ3ZELE9BQU8sRUFBRSxNQUFNO1NBQ2YsQ0FBQyxFQUFFO1lBQ0gsT0FBTyxFQUFFLE1BQU07WUFDZixTQUFTLEVBQUUsT0FBTztTQUNsQixDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRTtZQUN2RCxPQUFPLEVBQUUsUUFBUTtTQUNqQixDQUFDLEVBQUU7WUFDSCxPQUFPLEVBQUUsUUFBUTtZQUNqQixTQUFTLEVBQUUsT0FBTztTQUNsQixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=