/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { normalizeMimeType } from '../../common/mime.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Mime', () => {
    test('normalize', () => {
        assert.strictEqual(normalizeMimeType('invalid'), 'invalid');
        assert.strictEqual(normalizeMimeType('invalid', true), undefined);
        assert.strictEqual(normalizeMimeType('Text/plain'), 'text/plain');
        assert.strictEqual(normalizeMimeType('Text/pläin'), 'text/pläin');
        assert.strictEqual(normalizeMimeType('Text/plain;UPPER'), 'text/plain;UPPER');
        assert.strictEqual(normalizeMimeType('Text/plain;lower'), 'text/plain;lower');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWltZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbWltZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7SUFFbEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDL0UsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=