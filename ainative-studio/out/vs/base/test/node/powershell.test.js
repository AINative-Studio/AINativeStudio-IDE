/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as platform from '../../common/platform.js';
import { enumeratePowerShellInstallations, getFirstAvailablePowerShellInstallation } from '../../node/powershell.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
function checkPath(exePath) {
    // Check to see if the path exists
    let pathCheckResult = false;
    try {
        const stat = fs.statSync(exePath);
        pathCheckResult = stat.isFile();
    }
    catch {
        // fs.exists throws on Windows with SymbolicLinks so we
        // also use lstat to try and see if the file exists.
        try {
            pathCheckResult = fs.statSync(fs.readlinkSync(exePath)).isFile();
        }
        catch {
        }
    }
    assert.strictEqual(pathCheckResult, true);
}
if (platform.isWindows) {
    suite('PowerShell finder', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        test('Can find first available PowerShell', async () => {
            const pwshExe = await getFirstAvailablePowerShellInstallation();
            const exePath = pwshExe?.exePath;
            assert.notStrictEqual(exePath, null);
            assert.notStrictEqual(pwshExe?.displayName, null);
            checkPath(exePath);
        });
        test('Can enumerate PowerShells', async () => {
            const pwshs = new Array();
            for await (const p of enumeratePowerShellInstallations()) {
                pwshs.push(p);
            }
            const powershellLog = 'Found these PowerShells:\n' + pwshs.map(p => `${p.displayName}: ${p.exePath}`).join('\n');
            assert.strictEqual(pwshs.length >= 1, true, powershellLog);
            for (const pwsh of pwshs) {
                checkPath(pwsh.exePath);
            }
            // The last one should always be Windows PowerShell.
            assert.strictEqual(pwshs[pwshs.length - 1].displayName, 'Windows PowerShell', powershellLog);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG93ZXJzaGVsbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3Bvd2Vyc2hlbGwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLFFBQVEsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsdUNBQXVDLEVBQXlCLE1BQU0sMEJBQTBCLENBQUM7QUFDNUksT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFN0UsU0FBUyxTQUFTLENBQUMsT0FBZTtJQUNqQyxrQ0FBa0M7SUFDbEMsSUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFDO0lBQzVCLElBQUksQ0FBQztRQUNKLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEMsZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1IsdURBQXVEO1FBQ3ZELG9EQUFvRDtRQUNwRCxJQUFJLENBQUM7WUFDSixlQUFlLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbEUsQ0FBQztRQUFDLE1BQU0sQ0FBQztRQUVULENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3hCLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsdUNBQXVDLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdEQsTUFBTSxPQUFPLEdBQUcsTUFBTSx1Q0FBdUMsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sT0FBTyxHQUFHLE9BQU8sRUFBRSxPQUFPLENBQUM7WUFDakMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRWxELFNBQVMsQ0FBQyxPQUFRLENBQUMsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1QyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBeUIsQ0FBQztZQUNqRCxJQUFJLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxFQUFFLENBQUM7Z0JBQzFELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDZixDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsNEJBQTRCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFM0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDMUIsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QixDQUFDO1lBRUQsb0RBQW9EO1lBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLG9CQUFvQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzlGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIn0=