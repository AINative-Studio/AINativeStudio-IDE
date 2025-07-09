/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { basename } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { MainContext } from '../../common/extHost.protocol.js';
import { RelativePattern } from '../../common/extHostTypes.js';
import { ExtHostWorkspace } from '../../common/extHostWorkspace.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { ExtHostRpcService } from '../../common/extHostRpcService.js';
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { nullExtensionDescription as extensionDescriptor } from '../../../services/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExcludeSettingOptions } from '../../../services/search/common/searchExtTypes.js';
function createExtHostWorkspace(mainContext, data, logService) {
    const result = new ExtHostWorkspace(new ExtHostRpcService(mainContext), new class extends mock() {
        constructor() {
            super(...arguments);
            this.workspace = data;
        }
    }, new class extends mock() {
        getCapabilities() { return isLinux ? 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ : undefined; }
    }, logService, new class extends mock() {
    });
    result.$initializeWorkspace(data, true);
    return result;
}
suite('ExtHostWorkspace', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertAsRelativePath(workspace, input, expected, includeWorkspace) {
        const actual = workspace.getRelativePath(input, includeWorkspace);
        assert.strictEqual(actual, expected);
    }
    test('asRelativePath', () => {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/Applications/NewsWoWBot'), 0)], name: 'Test' }, new NullLogService());
        assertAsRelativePath(ws, '/Coding/Applications/NewsWoWBot/bernd/das/brot', 'bernd/das/brot');
        assertAsRelativePath(ws, '/Apps/DartPubCache/hosted/pub.dartlang.org/convert-2.0.1/lib/src/hex.dart', '/Apps/DartPubCache/hosted/pub.dartlang.org/convert-2.0.1/lib/src/hex.dart');
        assertAsRelativePath(ws, '', '');
        assertAsRelativePath(ws, '/foo/bar', '/foo/bar');
        assertAsRelativePath(ws, 'in/out', 'in/out');
    });
    test('asRelativePath, same paths, #11402', function () {
        const root = '/home/aeschli/workspaces/samples/docker';
        const input = '/home/aeschli/workspaces/samples/docker';
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
        assertAsRelativePath(ws, input, input);
        const input2 = '/home/aeschli/workspaces/samples/docker/a.file';
        assertAsRelativePath(ws, input2, 'a.file');
    });
    test('asRelativePath, no workspace', function () {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), null, new NullLogService());
        assertAsRelativePath(ws, '', '');
        assertAsRelativePath(ws, '/foo/bar', '/foo/bar');
    });
    test('asRelativePath, multiple folders', function () {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0), aWorkspaceFolderData(URI.file('/Coding/Two'), 1)], name: 'Test' }, new NullLogService());
        assertAsRelativePath(ws, '/Coding/One/file.txt', 'One/file.txt');
        assertAsRelativePath(ws, '/Coding/Two/files/out.txt', 'Two/files/out.txt');
        assertAsRelativePath(ws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
    });
    test('slightly inconsistent behaviour of asRelativePath and getWorkspaceFolder, #31553', function () {
        const mrws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0), aWorkspaceFolderData(URI.file('/Coding/Two'), 1)], name: 'Test' }, new NullLogService());
        assertAsRelativePath(mrws, '/Coding/One/file.txt', 'One/file.txt');
        assertAsRelativePath(mrws, '/Coding/One/file.txt', 'One/file.txt', true);
        assertAsRelativePath(mrws, '/Coding/One/file.txt', 'file.txt', false);
        assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'Two/files/out.txt');
        assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'Two/files/out.txt', true);
        assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'files/out.txt', false);
        assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
        assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', true);
        assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', false);
        const srws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0)], name: 'Test' }, new NullLogService());
        assertAsRelativePath(srws, '/Coding/One/file.txt', 'file.txt');
        assertAsRelativePath(srws, '/Coding/One/file.txt', 'file.txt', false);
        assertAsRelativePath(srws, '/Coding/One/file.txt', 'One/file.txt', true);
        assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
        assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', true);
        assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', false);
    });
    test('getPath, legacy', function () {
        let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        assert.strictEqual(ws.getPath(), undefined);
        ws = createExtHostWorkspace(new TestRPCProtocol(), null, new NullLogService());
        assert.strictEqual(ws.getPath(), undefined);
        ws = createExtHostWorkspace(new TestRPCProtocol(), undefined, new NullLogService());
        assert.strictEqual(ws.getPath(), undefined);
        ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.file('Folder'), 0), aWorkspaceFolderData(URI.file('Another/Folder'), 1)] }, new NullLogService());
        assert.strictEqual(ws.getPath().replace(/\\/g, '/'), '/Folder');
        ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.file('/Folder'), 0)] }, new NullLogService());
        assert.strictEqual(ws.getPath().replace(/\\/g, '/'), '/Folder');
    });
    test('WorkspaceFolder has name and index', function () {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0), aWorkspaceFolderData(URI.file('/Coding/Two'), 1)], name: 'Test' }, new NullLogService());
        const [one, two] = ws.getWorkspaceFolders();
        assert.strictEqual(one.name, 'One');
        assert.strictEqual(one.index, 0);
        assert.strictEqual(two.name, 'Two');
        assert.strictEqual(two.index, 1);
    });
    test('getContainingWorkspaceFolder', () => {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), {
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.file('/Coding/One'), 0),
                aWorkspaceFolderData(URI.file('/Coding/Two'), 1),
                aWorkspaceFolderData(URI.file('/Coding/Two/Nested'), 2)
            ]
        }, new NullLogService());
        let folder = ws.getWorkspaceFolder(URI.file('/foo/bar'));
        assert.strictEqual(folder, undefined);
        folder = ws.getWorkspaceFolder(URI.file('/Coding/One/file/path.txt'));
        assert.strictEqual(folder.name, 'One');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/file/path.txt'));
        assert.strictEqual(folder.name, 'Two');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nest'));
        assert.strictEqual(folder.name, 'Two');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/file'));
        assert.strictEqual(folder.name, 'Nested');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/f'));
        assert.strictEqual(folder.name, 'Nested');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested'), true);
        assert.strictEqual(folder.name, 'Two');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/'), true);
        assert.strictEqual(folder.name, 'Two');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested'));
        assert.strictEqual(folder.name, 'Nested');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/'));
        assert.strictEqual(folder.name, 'Nested');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two'), true);
        assert.strictEqual(folder, undefined);
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two'), false);
        assert.strictEqual(folder.name, 'Two');
    });
    test('Multiroot change event should have a delta, #29641', function (done) {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        let finished = false;
        const finish = (error) => {
            if (!finished) {
                finished = true;
                done(error);
            }
        };
        let sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.deepStrictEqual(e.added, []);
                assert.deepStrictEqual(e.removed, []);
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [] });
        sub.dispose();
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.deepStrictEqual(e.removed, []);
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar');
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0)] });
        sub.dispose();
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.deepStrictEqual(e.removed, []);
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar2');
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0), aWorkspaceFolderData(URI.parse('foo:bar2'), 1)] });
        sub.dispose();
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.strictEqual(e.removed.length, 2);
                assert.strictEqual(e.removed[0].uri.toString(), 'foo:bar');
                assert.strictEqual(e.removed[1].uri.toString(), 'foo:bar2');
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar3');
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar3'), 0)] });
        sub.dispose();
        finish();
    });
    test('Multiroot change keeps existing workspaces live', function () {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0)] }, new NullLogService());
        const firstFolder = ws.getWorkspaceFolders()[0];
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar2'), 0), aWorkspaceFolderData(URI.parse('foo:bar'), 1, 'renamed')] });
        assert.strictEqual(ws.getWorkspaceFolders()[1], firstFolder);
        assert.strictEqual(firstFolder.index, 1);
        assert.strictEqual(firstFolder.name, 'renamed');
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar3'), 0), aWorkspaceFolderData(URI.parse('foo:bar2'), 1), aWorkspaceFolderData(URI.parse('foo:bar'), 2)] });
        assert.strictEqual(ws.getWorkspaceFolders()[2], firstFolder);
        assert.strictEqual(firstFolder.index, 2);
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar3'), 0)] });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar3'), 0), aWorkspaceFolderData(URI.parse('foo:bar'), 1)] });
        assert.notStrictEqual(firstFolder, ws.workspace.folders[0]);
    });
    test('updateWorkspaceFolders - invalid arguments', function () {
        let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, null, null));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 0));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 1));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 1, 0));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, -1, 0));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, -1, -1));
        ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0)] }, new NullLogService());
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 1, 1));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 1, asUpdateWorkspaceFolderData(URI.parse('foo:bar'))));
    });
    test('updateWorkspaceFolders - valid arguments', function (done) {
        let finished = false;
        const finish = (error) => {
            if (!finished) {
                finished = true;
                done(error);
            }
        };
        const protocol = {
            getProxy: () => { return undefined; },
            set: () => { return undefined; },
            dispose: () => { },
            assertRegistered: () => { },
            drain: () => { return undefined; },
        };
        const ws = createExtHostWorkspace(protocol, { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        //
        // Add one folder
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 0, asUpdateWorkspaceFolderData(URI.parse('foo:bar'))));
        assert.strictEqual(1, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar').toString());
        const firstAddedFolder = ws.getWorkspaceFolders()[0];
        let gotEvent = false;
        let sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.deepStrictEqual(e.removed, []);
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar');
                assert.strictEqual(e.added[0], firstAddedFolder); // verify object is still live
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0)] }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], firstAddedFolder); // verify object is still live
        //
        // Add two more folders
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 1, 0, asUpdateWorkspaceFolderData(URI.parse('foo:bar1')), asUpdateWorkspaceFolderData(URI.parse('foo:bar2'))));
        assert.strictEqual(3, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar1').toString());
        assert.strictEqual(ws.workspace.folders[2].uri.toString(), URI.parse('foo:bar2').toString());
        const secondAddedFolder = ws.getWorkspaceFolders()[1];
        const thirdAddedFolder = ws.getWorkspaceFolders()[2];
        gotEvent = false;
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.deepStrictEqual(e.removed, []);
                assert.strictEqual(e.added.length, 2);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar1');
                assert.strictEqual(e.added[1].uri.toString(), 'foo:bar2');
                assert.strictEqual(e.added[0], secondAddedFolder);
                assert.strictEqual(e.added[1], thirdAddedFolder);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0), aWorkspaceFolderData(URI.parse('foo:bar1'), 1), aWorkspaceFolderData(URI.parse('foo:bar2'), 2)] }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], firstAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], secondAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[2], thirdAddedFolder); // verify object is still live
        //
        // Remove one folder
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 2, 1));
        assert.strictEqual(2, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar1').toString());
        gotEvent = false;
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.deepStrictEqual(e.added, []);
                assert.strictEqual(e.removed.length, 1);
                assert.strictEqual(e.removed[0], thirdAddedFolder);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0), aWorkspaceFolderData(URI.parse('foo:bar1'), 1)] }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], firstAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], secondAddedFolder); // verify object is still live
        //
        // Rename folder
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:bar'), 'renamed 1'), asUpdateWorkspaceFolderData(URI.parse('foo:bar1'), 'renamed 2')));
        assert.strictEqual(2, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar1').toString());
        assert.strictEqual(ws.workspace.folders[0].name, 'renamed 1');
        assert.strictEqual(ws.workspace.folders[1].name, 'renamed 2');
        assert.strictEqual(ws.getWorkspaceFolders()[0].name, 'renamed 1');
        assert.strictEqual(ws.getWorkspaceFolders()[1].name, 'renamed 2');
        gotEvent = false;
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.deepStrictEqual(e.added, []);
                assert.strictEqual(e.removed.length, 0);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0, 'renamed 1'), aWorkspaceFolderData(URI.parse('foo:bar1'), 1, 'renamed 2')] }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], firstAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], secondAddedFolder); // verify object is still live
        assert.strictEqual(ws.workspace.folders[0].name, 'renamed 1');
        assert.strictEqual(ws.workspace.folders[1].name, 'renamed 2');
        assert.strictEqual(ws.getWorkspaceFolders()[0].name, 'renamed 1');
        assert.strictEqual(ws.getWorkspaceFolders()[1].name, 'renamed 2');
        //
        // Add and remove folders
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:bar3')), asUpdateWorkspaceFolderData(URI.parse('foo:bar4'))));
        assert.strictEqual(2, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar3').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar4').toString());
        const fourthAddedFolder = ws.getWorkspaceFolders()[0];
        const fifthAddedFolder = ws.getWorkspaceFolders()[1];
        gotEvent = false;
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.strictEqual(e.added.length, 2);
                assert.strictEqual(e.added[0], fourthAddedFolder);
                assert.strictEqual(e.added[1], fifthAddedFolder);
                assert.strictEqual(e.removed.length, 2);
                assert.strictEqual(e.removed[0], firstAddedFolder);
                assert.strictEqual(e.removed[1], secondAddedFolder);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar3'), 0), aWorkspaceFolderData(URI.parse('foo:bar4'), 1)] }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], fourthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], fifthAddedFolder); // verify object is still live
        //
        // Swap folders
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:bar4')), asUpdateWorkspaceFolderData(URI.parse('foo:bar3'))));
        assert.strictEqual(2, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar4').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar3').toString());
        assert.strictEqual(ws.getWorkspaceFolders()[0], fifthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], fourthAddedFolder); // verify object is still live
        gotEvent = false;
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.strictEqual(e.added.length, 0);
                assert.strictEqual(e.removed.length, 0);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar4'), 0), aWorkspaceFolderData(URI.parse('foo:bar3'), 1)] }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], fifthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], fourthAddedFolder); // verify object is still live
        assert.strictEqual(fifthAddedFolder.index, 0);
        assert.strictEqual(fourthAddedFolder.index, 1);
        //
        // Add one folder after the other without waiting for confirmation (not supported currently)
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 2, 0, asUpdateWorkspaceFolderData(URI.parse('foo:bar5'))));
        assert.strictEqual(3, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar4').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar3').toString());
        assert.strictEqual(ws.workspace.folders[2].uri.toString(), URI.parse('foo:bar5').toString());
        const sixthAddedFolder = ws.getWorkspaceFolders()[2];
        gotEvent = false;
        sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0], sixthAddedFolder);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo', name: 'Test', folders: [
                aWorkspaceFolderData(URI.parse('foo:bar4'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar3'), 1),
                aWorkspaceFolderData(URI.parse('foo:bar5'), 2)
            ]
        }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], fifthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], fourthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[2], sixthAddedFolder); // verify object is still live
        finish();
    });
    test('Multiroot change event is immutable', function (done) {
        let finished = false;
        const finish = (error) => {
            if (!finished) {
                finished = true;
                done(error);
            }
        };
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        const sub = ws.onDidChangeWorkspace(e => {
            try {
                assert.throws(() => {
                    e.added = [];
                });
                // assert.throws(() => {
                // 	(<any>e.added)[0] = null;
                // });
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [] });
        sub.dispose();
        finish();
    });
    test('`vscode.workspace.getWorkspaceFolder(file)` don\'t return workspace folder when file open from command line. #36221', function () {
        if (isWindows) {
            const ws = createExtHostWorkspace(new TestRPCProtocol(), {
                id: 'foo', name: 'Test', folders: [
                    aWorkspaceFolderData(URI.file('c:/Users/marek/Desktop/vsc_test/'), 0)
                ]
            }, new NullLogService());
            assert.ok(ws.getWorkspaceFolder(URI.file('c:/Users/marek/Desktop/vsc_test/a.txt')));
            assert.ok(ws.getWorkspaceFolder(URI.file('C:/Users/marek/Desktop/vsc_test/b.txt')));
        }
    });
    function aWorkspaceFolderData(uri, index, name = '') {
        return {
            uri,
            index,
            name: name || basename(uri.path)
        };
    }
    function asUpdateWorkspaceFolderData(uri, name) {
        return { uri, name };
    }
    suite('findFiles -', function () {
        test('string include', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.includePattern, 'foo');
                    assert.strictEqual(_includeFolder, null);
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.maxResults, 10);
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles('foo', undefined, 10, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        function testFindFilesInclude(pattern) {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.includePattern, 'glob/**');
                    assert.deepStrictEqual(_includeFolder ? URI.from(_includeFolder).toJSON() : null, URI.file('/other/folder').toJSON());
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles(pattern, undefined, 10, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        }
        test('RelativePattern include (string)', () => {
            return testFindFilesInclude(new RelativePattern('/other/folder', 'glob/**'));
        });
        test('RelativePattern include (URI)', () => {
            return testFindFilesInclude(new RelativePattern(URI.file('/other/folder'), 'glob/**'));
        });
        test('no excludes', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.includePattern, 'glob/**');
                    assert.deepStrictEqual(URI.revive(_includeFolder).toString(), URI.file('/other/folder').toString());
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, true);
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles(new RelativePattern('/other/folder', 'glob/**'), null, 10, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        test('with cancelled token', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            const token = CancellationToken.Cancelled;
            return ws.findFiles(new RelativePattern('/other/folder', 'glob/**'), null, 10, new ExtensionIdentifier('test'), token).then(() => {
                assert(!mainThreadCalled, '!mainThreadCalled');
            });
        });
        test('RelativePattern exclude', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.excludePattern?.length, 1);
                    assert.strictEqual(options.excludePattern[0].pattern, 'glob/**'); // Note that the base portion is ignored, see #52651
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles('', new RelativePattern(root, 'glob/**'), 10, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
    });
    suite('findFiles2 -', function () {
        test('string include', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.filePattern, 'foo');
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(_includeFolder, null);
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.maxResults, 10);
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles2(['foo'], { maxResults: 10, useExcludeSettings: ExcludeSettingOptions.FilesExclude }, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        function testFindFiles2Include(pattern) {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.filePattern, 'glob/**');
                    assert.strictEqual(options.includePattern, undefined);
                    assert.deepStrictEqual(_includeFolder ? URI.from(_includeFolder).toJSON() : null, URI.file('/other/folder').toJSON());
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles2(pattern, { maxResults: 10 }, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        }
        test('RelativePattern include (string)', () => {
            return testFindFiles2Include([new RelativePattern('/other/folder', 'glob/**')]);
        });
        test('RelativePattern include (URI)', () => {
            return testFindFiles2Include([new RelativePattern(URI.file('/other/folder'), 'glob/**')]);
        });
        test('no excludes', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.filePattern, 'glob/**');
                    assert.strictEqual(options.includePattern, undefined);
                    assert.deepStrictEqual(URI.revive(_includeFolder).toString(), URI.file('/other/folder').toString());
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles2([new RelativePattern('/other/folder', 'glob/**')], {}, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        test('with cancelled token', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            const token = CancellationToken.Cancelled;
            return ws.findFiles2([new RelativePattern('/other/folder', 'glob/**')], {}, new ExtensionIdentifier('test'), token).then(() => {
                assert(!mainThreadCalled, '!mainThreadCalled');
            });
        });
        test('RelativePattern exclude', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.excludePattern?.length, 1);
                    assert.strictEqual(options.excludePattern[0].pattern, 'glob/**'); // Note that the base portion is ignored, see #52651
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles2([''], { exclude: [new RelativePattern(root, 'glob/**')] }, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        test('useIgnoreFiles', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.disregardIgnoreFiles, false);
                    assert.strictEqual(options.disregardGlobalIgnoreFiles, false);
                    assert.strictEqual(options.disregardParentIgnoreFiles, false);
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles2([''], { useIgnoreFiles: { local: true, parent: true, global: true } }, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        test('use symlinks', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.ignoreSymlinks, false);
                    return Promise.resolve(null);
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles2([''], { followSymlinks: true }, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        // todo: add tests with multiple filePatterns and excludes
    });
    suite('findTextInFiles -', function () {
        test('no include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.strictEqual(folder, null);
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles({ pattern: 'foo' }, {}, () => { }, new ExtensionIdentifier('test'));
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('string include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.strictEqual(folder, null);
                    assert.strictEqual(options.includePattern, '**/files');
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles({ pattern: 'foo' }, { include: '**/files' }, () => { }, new ExtensionIdentifier('test'));
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('RelativePattern include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.deepStrictEqual(URI.revive(folder).toString(), URI.file('/other/folder').toString());
                    assert.strictEqual(options.includePattern, 'glob/**');
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles({ pattern: 'foo' }, { include: new RelativePattern('/other/folder', 'glob/**') }, () => { }, new ExtensionIdentifier('test'));
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('with cancelled token', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            const token = CancellationToken.Cancelled;
            await ws.findTextInFiles({ pattern: 'foo' }, {}, () => { }, new ExtensionIdentifier('test'), token);
            assert(!mainThreadCalled, '!mainThreadCalled');
        });
        test('RelativePattern exclude', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.deepStrictEqual(folder, null);
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(options.excludePattern?.length, 1);
                    assert.strictEqual(options.excludePattern[0].pattern, 'glob/**'); // exclude folder is ignored...
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles({ pattern: 'foo' }, { exclude: new RelativePattern('/other/folder', 'glob/**') }, () => { }, new ExtensionIdentifier('test'));
            assert(mainThreadCalled, 'mainThreadCalled');
        });
    });
    suite('findTextInFiles2 -', function () {
        test('no include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.strictEqual(folder, null);
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await (ws.findTextInFiles2({ pattern: 'foo' }, {}, new ExtensionIdentifier('test'))).complete;
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('string include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.strictEqual(folder, null);
                    assert.strictEqual(options.includePattern, '**/files');
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await (ws.findTextInFiles2({ pattern: 'foo' }, { include: ['**/files'] }, new ExtensionIdentifier('test'))).complete;
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('RelativePattern include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.deepStrictEqual(URI.revive(folder).toString(), URI.file('/other/folder').toString());
                    assert.strictEqual(options.includePattern, 'glob/**');
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await (ws.findTextInFiles2({ pattern: 'foo' }, { include: [new RelativePattern('/other/folder', 'glob/**')] }, new ExtensionIdentifier('test'))).complete;
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('with cancelled token', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            const token = CancellationToken.Cancelled;
            await (ws.findTextInFiles2({ pattern: 'foo' }, undefined, new ExtensionIdentifier('test'), token)).complete;
            assert(!mainThreadCalled, '!mainThreadCalled');
        });
        test('RelativePattern exclude', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.deepStrictEqual(folder, null);
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(options.excludePattern?.length, 1);
                    assert.strictEqual(options.excludePattern[0].pattern, 'glob/**'); // exclude folder is ignored...
                    return null;
                }
            });
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await (ws.findTextInFiles2({ pattern: 'foo' }, { exclude: [new RelativePattern('/other/folder', 'glob/**')] }, new ExtensionIdentifier('test'))).complete;
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        // TODO: test multiple includes/excludess
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdvcmtzcGFjZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RXb3Jrc3BhY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR3JGLE9BQU8sRUFBZ0MsV0FBVyxFQUF1QixNQUFNLGtDQUFrQyxDQUFDO0FBQ2xILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSXRFLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHekUsT0FBTyxFQUFFLHdCQUF3QixJQUFJLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFcEgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENB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