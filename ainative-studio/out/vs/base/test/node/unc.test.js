/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { getUNCHost } from '../../node/unc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('UNC', () => {
    test('getUNCHost', () => {
        strictEqual(getUNCHost(undefined), undefined);
        strictEqual(getUNCHost(null), undefined);
        strictEqual(getUNCHost('/'), undefined);
        strictEqual(getUNCHost('/foo'), undefined);
        strictEqual(getUNCHost('c:'), undefined);
        strictEqual(getUNCHost('c:\\'), undefined);
        strictEqual(getUNCHost('c:\\foo'), undefined);
        strictEqual(getUNCHost('c:\\foo\\\\server\\path'), undefined);
        strictEqual(getUNCHost('\\'), undefined);
        strictEqual(getUNCHost('\\\\'), undefined);
        strictEqual(getUNCHost('\\\\localhost'), undefined);
        strictEqual(getUNCHost('\\\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\localhost\\a'), 'localhost');
        strictEqual(getUNCHost('\\\\.'), undefined);
        strictEqual(getUNCHost('\\\\?'), undefined);
        strictEqual(getUNCHost('\\\\.\\localhost'), '.');
        strictEqual(getUNCHost('\\\\?\\localhost'), '?');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost'), '.');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost'), '?');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost\\a'), 'localhost');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost\\a'), 'localhost');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3VuYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQy9DLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTdFLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO0lBRWpCLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBRXZCLFdBQVcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV6QyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFM0MsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6QyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzNDLFdBQVcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTlELFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMzQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXBELFdBQVcsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN4RCxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFekQsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM1QyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTVDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNqRCxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFakQsV0FBVyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELFdBQVcsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUV0RCxXQUFXLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDaEUsV0FBVyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWhFLFdBQVcsQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNqRSxXQUFXLENBQUMsVUFBVSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=