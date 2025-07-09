/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { tmpdir } from 'os';
import { join } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { getWindowsStateStoreData, restoreWindowsState } from '../../electron-main/windowsStateHandler.js';
suite('Windows State Storing', () => {
    function getUIState() {
        return {
            x: 0,
            y: 10,
            width: 100,
            height: 200,
            mode: 0
        };
    }
    function toWorkspace(uri) {
        return {
            id: '1234',
            configPath: uri
        };
    }
    function assertEqualURI(u1, u2, message) {
        assert.strictEqual(u1 && u1.toString(), u2 && u2.toString(), message);
    }
    function assertEqualWorkspace(w1, w2, message) {
        if (!w1 || !w2) {
            assert.strictEqual(w1, w2, message);
            return;
        }
        assert.strictEqual(w1.id, w2.id, message);
        assertEqualURI(w1.configPath, w2.configPath, message);
    }
    function assertEqualWindowState(expected, actual, message) {
        if (!expected || !actual) {
            assert.deepStrictEqual(expected, actual, message);
            return;
        }
        assert.strictEqual(expected.backupPath, actual.backupPath, message);
        assertEqualURI(expected.folderUri, actual.folderUri, message);
        assert.strictEqual(expected.remoteAuthority, actual.remoteAuthority, message);
        assertEqualWorkspace(expected.workspace, actual.workspace, message);
        assert.deepStrictEqual(expected.uiState, actual.uiState, message);
    }
    function assertEqualWindowsState(expected, actual, message) {
        assertEqualWindowState(expected.lastPluginDevelopmentHostWindow, actual.lastPluginDevelopmentHostWindow, message);
        assertEqualWindowState(expected.lastActiveWindow, actual.lastActiveWindow, message);
        assert.strictEqual(expected.openedWindows.length, actual.openedWindows.length, message);
        for (let i = 0; i < expected.openedWindows.length; i++) {
            assertEqualWindowState(expected.openedWindows[i], actual.openedWindows[i], message);
        }
    }
    function assertRestoring(state, message) {
        const stored = getWindowsStateStoreData(state);
        const restored = restoreWindowsState(stored);
        assertEqualWindowsState(state, restored, message);
    }
    const testBackupPath1 = join(tmpdir(), 'windowStateTest', 'backupFolder1');
    const testBackupPath2 = join(tmpdir(), 'windowStateTest', 'backupFolder2');
    const testWSPath = URI.file(join(tmpdir(), 'windowStateTest', 'test.code-workspace'));
    const testFolderURI = URI.file(join(tmpdir(), 'windowStateTest', 'testFolder'));
    const testRemoteFolderURI = URI.parse('foo://bar/c/d');
    test('storing and restoring', () => {
        let windowState;
        windowState = {
            openedWindows: []
        };
        assertRestoring(windowState, 'no windows');
        windowState = {
            openedWindows: [{ backupPath: testBackupPath1, uiState: getUIState() }]
        };
        assertRestoring(windowState, 'empty workspace');
        windowState = {
            openedWindows: [{ backupPath: testBackupPath1, uiState: getUIState(), workspace: toWorkspace(testWSPath) }]
        };
        assertRestoring(windowState, 'workspace');
        windowState = {
            openedWindows: [{ backupPath: testBackupPath2, uiState: getUIState(), folderUri: testFolderURI }]
        };
        assertRestoring(windowState, 'folder');
        windowState = {
            openedWindows: [{ backupPath: testBackupPath1, uiState: getUIState(), folderUri: testFolderURI }, { backupPath: testBackupPath1, uiState: getUIState(), folderUri: testRemoteFolderURI, remoteAuthority: 'bar' }]
        };
        assertRestoring(windowState, 'multiple windows');
        windowState = {
            lastActiveWindow: { backupPath: testBackupPath2, uiState: getUIState(), folderUri: testFolderURI },
            openedWindows: []
        };
        assertRestoring(windowState, 'lastActiveWindow');
        windowState = {
            lastPluginDevelopmentHostWindow: { backupPath: testBackupPath2, uiState: getUIState(), folderUri: testFolderURI },
            openedWindows: []
        };
        assertRestoring(windowState, 'lastPluginDevelopmentHostWindow');
    });
    test('open 1_32', () => {
        const v1_32_workspace = `{
			"openedWindows": [],
			"lastActiveWindow": {
				"workspaceIdentifier": {
					"id": "53b714b46ef1a2d4346568b4f591028c",
					"configURIPath": "file:///home/user/workspaces/testing/custom.code-workspace"
				},
				"backupPath": "/home/user/.config/code-oss-dev/Backups/53b714b46ef1a2d4346568b4f591028c",
				"uiState": {
					"mode": 0,
					"x": 0,
					"y": 27,
					"width": 2560,
					"height": 1364
				}
			}
		}`;
        let windowsState = restoreWindowsState(JSON.parse(v1_32_workspace));
        let expected = {
            openedWindows: [],
            lastActiveWindow: {
                backupPath: '/home/user/.config/code-oss-dev/Backups/53b714b46ef1a2d4346568b4f591028c',
                uiState: { mode: 0 /* WindowMode.Maximized */, x: 0, y: 27, width: 2560, height: 1364 },
                workspace: { id: '53b714b46ef1a2d4346568b4f591028c', configPath: URI.parse('file:///home/user/workspaces/testing/custom.code-workspace') }
            }
        };
        assertEqualWindowsState(expected, windowsState, 'v1_32_workspace');
        const v1_32_folder = `{
			"openedWindows": [],
			"lastActiveWindow": {
				"folder": "file:///home/user/workspaces/testing/folding",
				"backupPath": "/home/user/.config/code-oss-dev/Backups/1daac1621c6c06f9e916ac8062e5a1b5",
				"uiState": {
					"mode": 1,
					"x": 625,
					"y": 263,
					"width": 1718,
					"height": 953
				}
			}
		}`;
        windowsState = restoreWindowsState(JSON.parse(v1_32_folder));
        expected = {
            openedWindows: [],
            lastActiveWindow: {
                backupPath: '/home/user/.config/code-oss-dev/Backups/1daac1621c6c06f9e916ac8062e5a1b5',
                uiState: { mode: 1 /* WindowMode.Normal */, x: 625, y: 263, width: 1718, height: 953 },
                folderUri: URI.parse('file:///home/user/workspaces/testing/folding')
            }
        };
        assertEqualWindowsState(expected, windowsState, 'v1_32_folder');
        const v1_32_empty_window = ` {
			"openedWindows": [
			],
			"lastActiveWindow": {
				"backupPath": "/home/user/.config/code-oss-dev/Backups/1549539668998",
				"uiState": {
					"mode": 1,
					"x": 768,
					"y": 336,
					"width": 1200,
					"height": 800
				}
			}
		}`;
        windowsState = restoreWindowsState(JSON.parse(v1_32_empty_window));
        expected = {
            openedWindows: [],
            lastActiveWindow: {
                backupPath: '/home/user/.config/code-oss-dev/Backups/1549539668998',
                uiState: { mode: 1 /* WindowMode.Normal */, x: 768, y: 336, width: 1200, height: 800 }
            }
        };
        assertEqualWindowsState(expected, windowsState, 'v1_32_empty_window');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c1N0YXRlSGFuZGxlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3MvdGVzdC9lbGVjdHJvbi1tYWluL3dpbmRvd3NTdGF0ZUhhbmRsZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBK0IsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUd4SSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBRW5DLFNBQVMsVUFBVTtRQUNsQixPQUFPO1lBQ04sQ0FBQyxFQUFFLENBQUM7WUFDSixDQUFDLEVBQUUsRUFBRTtZQUNMLEtBQUssRUFBRSxHQUFHO1lBQ1YsTUFBTSxFQUFFLEdBQUc7WUFDWCxJQUFJLEVBQUUsQ0FBQztTQUNQLENBQUM7SUFDSCxDQUFDO0lBRUQsU0FBUyxXQUFXLENBQUMsR0FBUTtRQUM1QixPQUFPO1lBQ04sRUFBRSxFQUFFLE1BQU07WUFDVixVQUFVLEVBQUUsR0FBRztTQUNmLENBQUM7SUFDSCxDQUFDO0lBQ0QsU0FBUyxjQUFjLENBQUMsRUFBbUIsRUFBRSxFQUFtQixFQUFFLE9BQWdCO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxF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