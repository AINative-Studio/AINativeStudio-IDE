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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG93ZXJzaGVsbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9wb3dlcnNoZWxsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxRQUFRLE1BQU0sMEJBQTBCLENBQUM7QUFDckQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLHVDQUF1QyxFQUF5QixNQUFNLDBCQUEwQixDQUFDO0FBQzVJLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTdFLFNBQVMsU0FBUyxDQUFDLE9BQWU7SUFDakMsa0NBQWtDO0lBQ2xDLElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQztJQUM1QixJQUFJLENBQUM7UUFDSixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLGVBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNSLHVEQUF1RDtRQUN2RCxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDO1lBQ0osZUFBZSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xFLENBQUM7UUFBQyxNQUFNLENBQUM7UUFFVCxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFFRCxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUN4QixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLHVDQUF1QyxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RELE1BQU0sT0FBTyxHQUFHLE1BQU0sdUNBQXVDLEVBQUUsQ0FBQztZQUNoRSxNQUFNLE9BQU8sR0FBRyxPQUFPLEVBQUUsT0FBTyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUVsRCxTQUFTLENBQUMsT0FBUSxDQUFDLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQXlCLENBQUM7WUFDakQsSUFBSSxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksZ0NBQWdDLEVBQUUsRUFBRSxDQUFDO2dCQUMxRCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQztZQUVELE1BQU0sYUFBYSxHQUFHLDRCQUE0QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pILE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRTNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQzFCLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekIsQ0FBQztZQUVELG9EQUFvRDtZQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxvQkFBb0IsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUM5RixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9