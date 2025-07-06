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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcEZpbGVTZWFyY2gudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L25vZGUvcmlwZ3JlcEZpbGVTZWFyY2gudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTdFLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsdUNBQXVDLEVBQUUsQ0FBQztJQUMxQyxTQUFTLGNBQWMsQ0FBQyxNQUFnQjtRQUN2QyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDdEcsQ0FBQztJQUVELENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDcEU7WUFDQyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUscUJBQXFCLENBQUM7WUFDaEQsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQztZQUMvQixDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUscUJBQXFCLENBQUM7WUFDbkQsQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLHFCQUFxQixDQUFDO1lBQ25ELENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUM7WUFDakMsQ0FBQyw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsdUNBQXVDLENBQUM7WUFFbkYsMENBQTBDO1lBQzFDLENBQUMsWUFBWSxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDO1lBQ3BELENBQUMsWUFBWSxFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixDQUFDO1NBQ3pELENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0lBRUgsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDckU7WUFDQyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLENBQUM7WUFDM0MsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQztZQUU1QiwwQ0FBMEM7WUFDMUMsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7U0FDM0MsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9