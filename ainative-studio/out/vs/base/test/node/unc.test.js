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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvdW5jLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDL0MsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFN0UsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7SUFFakIsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFFdkIsV0FBVyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5QyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXpDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDeEMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUUzQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0MsV0FBVyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5QyxXQUFXLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFOUQsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6QyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzNDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFcEQsV0FBVyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3hELFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUV6RCxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVDLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFNUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pELFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUVqRCxXQUFXLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEQsV0FBVyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRXRELFdBQVcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNoRSxXQUFXLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFaEUsV0FBVyxDQUFDLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2pFLFdBQVcsQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNsRSxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==