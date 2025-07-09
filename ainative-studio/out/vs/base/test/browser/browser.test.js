/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isMacintosh, isWindows } from '../../common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('Browsers', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('all', () => {
        assert(!(isWindows && isMacintosh));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL2Jyb3dzZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU3RSxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUV0Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQ2hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9