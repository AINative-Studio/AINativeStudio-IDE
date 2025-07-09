/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { OPTIONS, parseArgs } from '../../node/argv.js';
import { getUserDataPath } from '../../node/userDataPath.js';
import product from '../../../product/common/product.js';
suite('User data path', () => {
    test('getUserDataPath - default', () => {
        const path = getUserDataPath(parseArgs(process.argv, OPTIONS), product.nameShort);
        assert.ok(path.length > 0);
    });
    test('getUserDataPath - portable mode', () => {
        const origPortable = process.env['VSCODE_PORTABLE'];
        try {
            const portableDir = 'portable-dir';
            process.env['VSCODE_PORTABLE'] = portableDir;
            const path = getUserDataPath(parseArgs(process.argv, OPTIONS), product.nameShort);
            assert.ok(path.includes(portableDir));
        }
        finally {
            if (typeof origPortable === 'string') {
                process.env['VSCODE_PORTABLE'] = origPortable;
            }
            else {
                delete process.env['VSCODE_PORTABLE'];
            }
        }
    });
    test('getUserDataPath - --user-data-dir', () => {
        const cliUserDataDir = 'cli-data-dir';
        const args = parseArgs(process.argv, OPTIONS);
        args['user-data-dir'] = cliUserDataDir;
        const path = getUserDataPath(args, product.nameShort);
        assert.ok(path.includes(cliUserDataDir));
    });
    test('getUserDataPath - VSCODE_APPDATA', () => {
        const origAppData = process.env['VSCODE_APPDATA'];
        try {
            const appDataDir = 'appdata-dir';
            process.env['VSCODE_APPDATA'] = appDataDir;
            const path = getUserDataPath(parseArgs(process.argv, OPTIONS), product.nameShort);
            assert.ok(path.includes(appDataDir));
        }
        finally {
            if (typeof origAppData === 'string') {
                process.env['VSCODE_APPDATA'] = origAppData;
            }
            else {
                delete process.env['VSCODE_APPDATA'];
            }
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQYXRoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvdGVzdC9ub2RlL3VzZXJEYXRhUGF0aC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUV6RCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBRTVCLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDNUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUM7WUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLFdBQVcsQ0FBQztZQUU3QyxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxZQUFZLENBQUM7WUFDL0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUN0QyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsY0FBYyxDQUFDO1FBRXZDLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDO1lBQ0osTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxVQUFVLENBQUM7WUFFM0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNsRixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN0QyxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsV0FBVyxDQUFDO1lBQzdDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUN0QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyJ9