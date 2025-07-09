/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { tmpdir } from 'os';
import { join } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { isRecentFolder, restoreRecentlyOpened, toStoreData } from '../../common/workspaces.js';
suite('History Storage', () => {
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
    function assertEqualRecentlyOpened(actual, expected, message) {
        assert.strictEqual(actual.files.length, expected.files.length, message);
        for (let i = 0; i < actual.files.length; i++) {
            assertEqualURI(actual.files[i].fileUri, expected.files[i].fileUri, message);
            assert.strictEqual(actual.files[i].label, expected.files[i].label);
            assert.strictEqual(actual.files[i].remoteAuthority, expected.files[i].remoteAuthority);
        }
        assert.strictEqual(actual.workspaces.length, expected.workspaces.length, message);
        for (let i = 0; i < actual.workspaces.length; i++) {
            const expectedRecent = expected.workspaces[i];
            const actualRecent = actual.workspaces[i];
            if (isRecentFolder(actualRecent)) {
                assertEqualURI(actualRecent.folderUri, expectedRecent.folderUri, message);
            }
            else {
                assertEqualWorkspace(actualRecent.workspace, expectedRecent.workspace, message);
            }
            assert.strictEqual(actualRecent.label, expectedRecent.label);
            assert.strictEqual(actualRecent.remoteAuthority, actualRecent.remoteAuthority);
        }
    }
    function assertRestoring(state, message) {
        const stored = toStoreData(state);
        const restored = restoreRecentlyOpened(stored, new NullLogService());
        assertEqualRecentlyOpened(state, restored, message);
    }
    const testWSPath = URI.file(join(tmpdir(), 'windowStateTest', 'test.code-workspace'));
    const testFileURI = URI.file(join(tmpdir(), 'windowStateTest', 'testFile.txt'));
    const testFolderURI = URI.file(join(tmpdir(), 'windowStateTest', 'testFolder'));
    const testRemoteFolderURI = URI.parse('foo://bar/c/e');
    const testRemoteFileURI = URI.parse('foo://bar/c/d.txt');
    const testRemoteWSURI = URI.parse('foo://bar/c/test.code-workspace');
    test('storing and restoring', () => {
        let ro;
        ro = {
            files: [],
            workspaces: []
        };
        assertRestoring(ro, 'empty');
        ro = {
            files: [{ fileUri: testFileURI }],
            workspaces: []
        };
        assertRestoring(ro, 'file');
        ro = {
            files: [],
            workspaces: [{ folderUri: testFolderURI }]
        };
        assertRestoring(ro, 'folder');
        ro = {
            files: [],
            workspaces: [{ workspace: toWorkspace(testWSPath) }, { folderUri: testFolderURI }]
        };
        assertRestoring(ro, 'workspaces and folders');
        ro = {
            files: [{ fileUri: testRemoteFileURI }],
            workspaces: [{ workspace: toWorkspace(testRemoteWSURI) }, { folderUri: testRemoteFolderURI }]
        };
        assertRestoring(ro, 'remote workspaces and folders');
        ro = {
            files: [{ label: 'abc', fileUri: testFileURI }],
            workspaces: [{ label: 'def', workspace: toWorkspace(testWSPath) }, { folderUri: testRemoteFolderURI }]
        };
        assertRestoring(ro, 'labels');
        ro = {
            files: [{ label: 'abc', remoteAuthority: 'test', fileUri: testRemoteFileURI }],
            workspaces: [{ label: 'def', remoteAuthority: 'test', workspace: toWorkspace(testWSPath) }, { folderUri: testRemoteFolderURI, remoteAuthority: 'test' }]
        };
        assertRestoring(ro, 'authority');
    });
    test('open 1_55', () => {
        const v1_55 = `{
			"entries": [
				{
					"folderUri": "foo://bar/23/43",
					"remoteAuthority": "test+test"
				},
				{
					"workspace": {
						"id": "53b714b46ef1a2d4346568b4f591028c",
						"configPath": "file:///home/user/workspaces/testing/custom.code-workspace"
					}
				},
				{
					"folderUri": "file:///home/user/workspaces/testing/folding",
					"label": "abc"
				},
				{
					"fileUri": "file:///home/user/.config/code-oss-dev/storage.json",
					"label": "def"
				}
			]
		}`;
        const windowsState = restoreRecentlyOpened(JSON.parse(v1_55), new NullLogService());
        const expected = {
            files: [{ label: 'def', fileUri: URI.parse('file:///home/user/.config/code-oss-dev/storage.json') }],
            workspaces: [
                { folderUri: URI.parse('foo://bar/23/43'), remoteAuthority: 'test+test' },
                { workspace: { id: '53b714b46ef1a2d4346568b4f591028c', configPath: URI.parse('file:///home/user/workspaces/testing/custom.code-workspace') } },
                { label: 'abc', folderUri: URI.parse('file:///home/user/workspaces/testing/folding') }
            ]
        };
        assertEqualRecentlyOpened(windowsState, expected, 'v1_33');
    });
    test('toStoreData drops label if it matches path', () => {
        const actual = toStoreData({
            workspaces: [],
            files: [{
                    fileUri: URI.parse('file:///foo/bar/test.txt'),
                    label: '/foo/bar/test.txt',
                    remoteAuthority: undefined
                }]
        });
        assert.deepStrictEqual(actual, {
            entries: [{
                    fileUri: 'file:///foo/bar/test.txt',
                    label: undefined,
                    remoteAuthority: undefined
                }]
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc0hpc3RvcnlTdG9yYWdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlcy90ZXN0L2VsZWN0cm9uLW1haW4vd29ya3NwYWNlc0hpc3RvcnlTdG9yYWdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFNUQsT0FBTyxFQUFvRCxjQUFjLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFbEosS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUU3QixTQUFTLFdBQVcsQ0FBQyxHQUFRO1FBQzVCLE9BQU87WUFDTixFQUFFLEVBQUUsTUFBTTtZQUNWLFVBQVUsRUFBRSxHQUFHO1NBQ2YsQ0FBQztJQUNILENBQUM7SUFDRCxTQUFTLGNBQWMsQ0FBQyxFQUFtQixFQUFFLEVBQW1CLEVBQUUsT0FBZ0I7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUMs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