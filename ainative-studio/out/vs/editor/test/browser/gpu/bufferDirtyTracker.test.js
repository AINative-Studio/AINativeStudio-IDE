/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { BufferDirtyTracker } from '../../../browser/gpu/bufferDirtyTracker.js';
suite('BufferDirtyTracker', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let bdt;
    function assertState(dataOffset, dirtySize) {
        strictEqual(bdt.dataOffset, dataOffset);
        strictEqual(bdt.dirtySize, dirtySize);
        strictEqual(bdt.isDirty, dataOffset !== undefined);
    }
    setup(() => {
        bdt = new BufferDirtyTracker();
    });
    test('flag(index)', () => {
        strictEqual(bdt.flag(0), 0);
        assertState(0, 1);
        strictEqual(bdt.flag(31), 31);
        assertState(0, 32);
        bdt.clear();
        assertState(undefined, undefined);
        strictEqual(bdt.flag(10), 10);
        assertState(10, 1);
        strictEqual(bdt.flag(15), 15);
        assertState(10, 6);
    });
    test('flag(index, length)', () => {
        bdt.flag(0, 32);
        assertState(0, 32);
        bdt.clear();
        assertState(undefined, undefined);
        bdt.flag(10, 6);
        assertState(10, 6);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyRGlydHlUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9ncHUvYnVmZmVyRGlydHlUcmFja2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVoRixLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxHQUF1QixDQUFDO0lBRTVCLFNBQVMsV0FBVyxDQUFDLFVBQThCLEVBQUUsU0FBNkI7UUFDakYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsR0FBRyxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztJQUNoQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUIsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuQixHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUIsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEIsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuQixHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9