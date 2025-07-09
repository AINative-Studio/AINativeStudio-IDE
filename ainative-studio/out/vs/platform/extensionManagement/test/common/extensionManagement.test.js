/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EXTENSION_IDENTIFIER_PATTERN } from '../../common/extensionManagement.js';
import { ExtensionKey } from '../../common/extensionManagementUtil.js';
suite('Extension Identifier Pattern', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('extension identifier pattern', () => {
        const regEx = new RegExp(EXTENSION_IDENTIFIER_PATTERN);
        assert.strictEqual(true, regEx.test('publisher.name'));
        assert.strictEqual(true, regEx.test('publiSher.name'));
        assert.strictEqual(true, regEx.test('publisher.Name'));
        assert.strictEqual(true, regEx.test('PUBLISHER.NAME'));
        assert.strictEqual(true, regEx.test('PUBLISHEr.NAMe'));
        assert.strictEqual(true, regEx.test('PUBLISHEr.N-AMe'));
        assert.strictEqual(true, regEx.test('PUB-LISHEr.NAMe'));
        assert.strictEqual(true, regEx.test('PUB-LISHEr.N-AMe'));
        assert.strictEqual(true, regEx.test('PUBLISH12Er90.N-A54Me123'));
        assert.strictEqual(true, regEx.test('111PUBLISH12Er90.N-1111A54Me123'));
        assert.strictEqual(false, regEx.test('publishername'));
        assert.strictEqual(false, regEx.test('-publisher.name'));
        assert.strictEqual(false, regEx.test('publisher.-name'));
        assert.strictEqual(false, regEx.test('-publisher.-name'));
        assert.strictEqual(false, regEx.test('publ_isher.name'));
        assert.strictEqual(false, regEx.test('publisher._name'));
    });
    test('extension key', () => {
        assert.strictEqual(new ExtensionKey({ id: 'pub.extension-name' }, '1.0.1').toString(), 'pub.extension-name-1.0.1');
        assert.strictEqual(new ExtensionKey({ id: 'pub.extension-name' }, '1.0.1', "undefined" /* TargetPlatform.UNDEFINED */).toString(), 'pub.extension-name-1.0.1');
        assert.strictEqual(new ExtensionKey({ id: 'pub.extension-name' }, '1.0.1', "win32-x64" /* TargetPlatform.WIN32_X64 */).toString(), `pub.extension-name-1.0.1-${"win32-x64" /* TargetPlatform.WIN32_X64 */}`);
    });
    test('extension key parsing', () => {
        assert.strictEqual(ExtensionKey.parse('pub.extension-name'), null);
        assert.strictEqual(ExtensionKey.parse('pub.extension-name@1.2.3'), null);
        assert.strictEqual(ExtensionKey.parse('pub.extension-name-1.0.1')?.toString(), 'pub.extension-name-1.0.1');
        assert.strictEqual(ExtensionKey.parse('pub.extension-name-1.0.1-win32-x64')?.toString(), 'pub.extension-name-1.0.1-win32-x64');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9jb21tb24vZXh0ZW5zaW9uTWFuYWdlbWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHdkUsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtJQUUxQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxLQUFLLEdBQUcsSUFBSSxNQUFNLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUNuSCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsT0FBTyw2Q0FBMkIsQ0FBQyxRQUFRLEVBQUUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQzdJLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxPQUFPLDZDQUEyQixDQUFDLFFBQVEsRUFBRSxFQUFFLDRCQUE0QiwwQ0FBd0IsRUFBRSxDQUFDLENBQUM7SUFDMUssQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDM0csTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztJQUNoSSxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=