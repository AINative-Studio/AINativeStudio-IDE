/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { UnchangedRegion } from '../../../browser/widget/diffEditor/diffEditorViewModel.js';
import { LineRange } from '../../../common/core/lineRange.js';
import { DetailedLineRangeMapping } from '../../../common/diff/rangeMapping.js';
suite('DiffEditorWidget2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('UnchangedRegion', () => {
        function serialize(regions) {
            return regions.map(r => `${r.originalUnchangedRange} - ${r.modifiedUnchangedRange}`);
        }
        test('Everything changed', () => {
            assert.deepStrictEqual(serialize(UnchangedRegion.fromDiffs([new DetailedLineRangeMapping(new LineRange(1, 10), new LineRange(1, 10), [])], 10, 10, 3, 3)), []);
        });
        test('Nothing changed', () => {
            assert.deepStrictEqual(serialize(UnchangedRegion.fromDiffs([], 10, 10, 3, 3)), [
                "[1,11) - [1,11)"
            ]);
        });
        test('Change in the middle', () => {
            assert.deepStrictEqual(serialize(UnchangedRegion.fromDiffs([new DetailedLineRangeMapping(new LineRange(50, 60), new LineRange(50, 60), [])], 100, 100, 3, 3)), ([
                '[1,47) - [1,47)',
                '[63,101) - [63,101)'
            ]));
        });
        test('Change at the end', () => {
            assert.deepStrictEqual(serialize(UnchangedRegion.fromDiffs([new DetailedLineRangeMapping(new LineRange(99, 100), new LineRange(100, 100), [])], 100, 100, 3, 3)), (["[1,96) - [1,96)"]));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcldpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3JXaWRnZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBRS9CLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM3QixTQUFTLFNBQVMsQ0FBQyxPQUEwQjtZQUM1QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxzQkFBc0IsTUFBTSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1lBQy9CLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQ3pELENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQzlFLEVBQUUsRUFDRixFQUFFLEVBQ0YsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDVCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7WUFDNUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FDekQsRUFBRSxFQUNGLEVBQUUsRUFDRixFQUFFLEVBQ0YsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFDLEVBQUU7Z0JBQ0gsaUJBQWlCO2FBQ2pCLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtZQUNqQyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUN6RCxDQUFDLElBQUksd0JBQXdCLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUNoRixHQUFHLEVBQ0gsR0FBRyxFQUNILENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQyxFQUFFLENBQUM7Z0JBQ0osaUJBQWlCO2dCQUNqQixxQkFBcUI7YUFDckIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7WUFDOUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FDekQsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDbkYsR0FBRyxFQUNILEdBQUcsRUFDSCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=