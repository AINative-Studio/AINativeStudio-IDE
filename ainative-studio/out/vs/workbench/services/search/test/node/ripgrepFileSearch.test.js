/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as platform from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { fixDriveC, getAbsoluteGlob } from '../../node/ripgrepFileSearch.js';
suite('RipgrepFileSearch - etc', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testGetAbsGlob(params) {
        const [folder, glob, expectedResult] = params;
        assert.strictEqual(fixDriveC(getAbsoluteGlob(folder, glob)), expectedResult, JSON.stringify(params));
    }
    (!platform.isWindows ? test.skip : test)('getAbsoluteGlob_win', () => {
        [
            ['C:/foo/bar', 'glob/**', '/foo\\bar\\glob\\**'],
            ['c:/', 'glob/**', '/glob\\**'],
            ['C:\\foo\\bar', 'glob\\**', '/foo\\bar\\glob\\**'],
            ['c:\\foo\\bar', 'glob\\**', '/foo\\bar\\glob\\**'],
            ['c:\\', 'glob\\**', '/glob\\**'],
            ['\\\\localhost\\c$\\foo\\bar', 'glob/**', '\\\\localhost\\c$\\foo\\bar\\glob\\**'],
            // absolute paths are not resolved further
            ['c:/foo/bar', '/path/something', '/path/something'],
            ['c:/foo/bar', 'c:\\project\\folder', '/project\\folder']
        ].forEach(testGetAbsGlob);
    });
    (platform.isWindows ? test.skip : test)('getAbsoluteGlob_posix', () => {
        [
            ['/foo/bar', 'glob/**', '/foo/bar/glob/**'],
            ['/', 'glob/**', '/glob/**'],
            // absolute paths are not resolved further
            ['/', '/project/folder', '/project/folder'],
        ].forEach(testGetAbsGlob);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcEZpbGVTZWFyY2gudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3Qvbm9kZS9yaXBncmVwRmlsZVNlYXJjaC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0UsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyx1Q0FBdUMsRUFBRSxDQUFDO0lBQzFDLFNBQVMsY0FBYyxDQUFDLE1BQWdCO1FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUN0RyxDQUFDO0lBRUQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNwRTtZQUNDLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQztZQUNoRCxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDO1lBQy9CLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQztZQUNuRCxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUscUJBQXFCLENBQUM7WUFDbkQsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQztZQUNqQyxDQUFDLDZCQUE2QixFQUFFLFNBQVMsRUFBRSx1Q0FBdUMsQ0FBQztZQUVuRiwwQ0FBMEM7WUFDMUMsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7WUFDcEQsQ0FBQyxZQUFZLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLENBQUM7U0FDekQsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNyRTtZQUNDLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQztZQUMzQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO1lBRTVCLDBDQUEwQztZQUMxQyxDQUFDLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQztTQUMzQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=