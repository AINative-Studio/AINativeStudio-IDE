/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import * as pfs from '../../../../base/node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { getSingleFolderWorkspaceIdentifier, getWorkspaceIdentifier } from '../../node/workspaces.js';
flakySuite('Workspaces', () => {
    let testDir;
    const tmpDir = os.tmpdir();
    setup(async () => {
        testDir = getRandomTestPath(tmpDir, 'vsctests', 'workspacesmanagementmainservice');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(() => {
        return pfs.Promises.rm(testDir);
    });
    test('getSingleWorkspaceIdentifier', async function () {
        const nonLocalUri = URI.parse('myscheme://server/work/p/f1');
        const nonLocalUriId = getSingleFolderWorkspaceIdentifier(nonLocalUri);
        assert.ok(nonLocalUriId?.id);
        const localNonExistingUri = URI.file(path.join(testDir, 'f1'));
        const localNonExistingUriId = getSingleFolderWorkspaceIdentifier(localNonExistingUri);
        assert.ok(!localNonExistingUriId);
        fs.mkdirSync(path.join(testDir, 'f1'));
        const localExistingUri = URI.file(path.join(testDir, 'f1'));
        const localExistingUriId = getSingleFolderWorkspaceIdentifier(localExistingUri, fs.statSync(localExistingUri.fsPath));
        assert.ok(localExistingUriId?.id);
    });
    test('workspace identifiers are stable', function () {
        // workspace identifier (local)
        assert.strictEqual(getWorkspaceIdentifier(URI.file('/hello/test')).id, isWindows /* slash vs backslash */ ? '9f3efb614e2cd7924e4b8076e6c72233' : 'e36736311be12ff6d695feefe415b3e8');
        // single folder identifier (local)
        const fakeStat = {
            ino: 1611312115129,
            birthtimeMs: 1611312115129,
            birthtime: new Date(1611312115129)
        };
        assert.strictEqual(getSingleFolderWorkspaceIdentifier(URI.file('/hello/test'), fakeStat)?.id, isWindows /* slash vs backslash */ ? '9a8441e897e5174fa388bc7ef8f7a710' : '1d726b3d516dc2a6d343abf4797eaaef');
        // workspace identifier (remote)
        assert.strictEqual(getWorkspaceIdentifier(URI.parse('vscode-remote:/hello/test')).id, '786de4f224d57691f218dc7f31ee2ee3');
        // single folder identifier (remote)
        assert.strictEqual(getSingleFolderWorkspaceIdentifier(URI.parse('vscode-remote:/hello/test'))?.id, '786de4f224d57691f218dc7f31ee2ee3');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvdGVzdC9lbGVjdHJvbi1tYWluL3dvcmtzcGFjZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXRHLFVBQVUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBRTdCLElBQUksT0FBZSxDQUFDO0lBRXBCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUUzQixLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsT0FBTyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUVuRixPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8s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