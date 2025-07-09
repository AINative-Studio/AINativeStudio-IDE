/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import { isUNC, toSlashes } from '../../../../base/common/extpath.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import * as path from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import * as pfs from '../../../../base/node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { EnvironmentMainService } from '../../../environment/electron-main/environmentMainService.js';
import { OPTIONS, parseArgs } from '../../../environment/node/argv.js';
import { FileService } from '../../../files/common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { StateService } from '../../../state/node/stateService.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { UserDataProfilesMainService } from '../../../userDataProfile/electron-main/userDataProfile.js';
import { WORKSPACE_EXTENSION } from '../../../workspace/common/workspace.js';
import { rewriteWorkspaceFileForNewLocation } from '../../common/workspaces.js';
import { WorkspacesManagementMainService } from '../../electron-main/workspacesManagementMainService.js';
flakySuite('WorkspacesManagementMainService', () => {
    class TestDialogMainService {
        pickFileFolder(options, window) { throw new Error('Method not implemented.'); }
        pickFolder(options, window) { throw new Error('Method not implemented.'); }
        pickFile(options, window) { throw new Error('Method not implemented.'); }
        pickWorkspace(options, window) { throw new Error('Method not implemented.'); }
        showMessageBox(options, window) { throw new Error('Method not implemented.'); }
        showSaveDialog(options, window) { throw new Error('Method not implemented.'); }
        showOpenDialog(options, window) { throw new Error('Method not implemented.'); }
    }
    class TestBackupMainService {
        isHotExitEnabled() { throw new Error('Method not implemented.'); }
        getEmptyWindowBackups() { throw new Error('Method not implemented.'); }
        registerWorkspaceBackup(workspaceInfo, migrateFrom) { throw new Error('Method not implemented.'); }
        registerFolderBackup(folder) { throw new Error('Method not implemented.'); }
        registerEmptyWindowBackup(empty) { throw new Error('Method not implemented.'); }
        async getDirtyWorkspaces() { return []; }
    }
    function createUntitledWorkspace(folders, names) {
        return service.createUntitledWorkspace(folders.map((folder, index) => ({ uri: URI.file(folder), name: names ? names[index] : undefined })));
    }
    function createWorkspace(workspaceConfigPath, folders, names) {
        const ws = {
            folders: []
        };
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];
            const s = f instanceof URI ? { uri: f.toString() } : { path: f };
            if (names) {
                s.name = names[i];
            }
            ws.folders.push(s);
        }
        fs.writeFileSync(workspaceConfigPath, JSON.stringify(ws));
    }
    let testDir;
    let untitledWorkspacesHomePath;
    let environmentMainService;
    let service;
    const cwd = process.cwd();
    const tmpDir = os.tmpdir();
    setup(async () => {
        testDir = getRandomTestPath(tmpDir, 'vsctests', 'workspacesmanagementmainservice');
        untitledWorkspacesHomePath = path.join(testDir, 'Workspaces');
        const productService = { _serviceBrand: undefined, ...product };
        environmentMainService = new class TestEnvironmentService extends EnvironmentMainService {
            constructor() {
                super(parseArgs(process.argv, OPTIONS), productService);
            }
            get untitledWorkspacesHome() {
                return URI.file(untitledWorkspacesHomePath);
            }
        };
        const logService = new NullLogService();
        const fileService = new FileService(logService);
        service = new WorkspacesManagementMainService(environmentMainService, logService, new UserDataProfilesMainService(new StateService(1 /* SaveStrategy.DELAYED */, environmentMainService, logService, fileService), new UriIdentityService(fileService), environmentMainService, fileService, logService), new TestBackupMainService(), new TestDialogMainService());
        return fs.promises.mkdir(untitledWorkspacesHomePath, { recursive: true });
    });
    teardown(() => {
        service.dispose();
        return pfs.Promises.rm(testDir);
    });
    function assertPathEquals(pathInWorkspaceFile, pathOnDisk) {
        if (isWindows) {
            pathInWorkspaceFile = normalizeDriveLetter(pathInWorkspaceFile);
            pathOnDisk = normalizeDriveLetter(pathOnDisk);
            if (!isUNC(pathOnDisk)) {
                pathOnDisk = toSlashes(pathOnDisk); // workspace file is using slashes for all paths except where mandatory
            }
        }
        assert.strictEqual(pathInWorkspaceFile, pathOnDisk);
    }
    function assertEqualURI(u1, u2) {
        assert.strictEqual(u1.toString(), u2.toString());
    }
    test('createWorkspace (folders)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        assert.ok(workspace);
        assert.ok(fs.existsSync(workspace.configPath.fsPath));
        assert.ok(service.isUntitledWorkspace(workspace));
        const ws = JSON.parse(fs.readFileSync(workspace.configPath.fsPath).toString());
        assert.strictEqual(ws.folders.length, 2);
        assertPathEquals(ws.folders[0].path, cwd);
        assertPathEquals(ws.folders[1].path, tmpDir);
        assert.ok(!ws.folders[0].name);
        assert.ok(!ws.folders[1].name);
    });
    test('createWorkspace (folders with name)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir], ['currentworkingdirectory', 'tempdir']);
        assert.ok(workspace);
        assert.ok(fs.existsSync(workspace.configPath.fsPath));
        assert.ok(service.isUntitledWorkspace(workspace));
        const ws = JSON.parse(fs.readFileSync(workspace.configPath.fsPath).toString());
        assert.strictEqual(ws.folders.length, 2);
        assertPathEquals(ws.folders[0].path, cwd);
        assertPathEquals(ws.folders[1].path, tmpDir);
        assert.strictEqual(ws.folders[0].name, 'currentworkingdirectory');
        assert.strictEqual(ws.folders[1].name, 'tempdir');
    });
    test('createUntitledWorkspace (folders as other resource URIs)', async () => {
        const folder1URI = URI.parse('myscheme://server/work/p/f1');
        const folder2URI = URI.parse('myscheme://server/work/o/f3');
        const workspace = await service.createUntitledWorkspace([{ uri: folder1URI }, { uri: folder2URI }], 'server');
        assert.ok(workspace);
        assert.ok(fs.existsSync(workspace.configPath.fsPath));
        assert.ok(service.isUntitledWorkspace(workspace));
        const ws = JSON.parse(fs.readFileSync(workspace.configPath.fsPath).toString());
        assert.strictEqual(ws.folders.length, 2);
        assert.strictEqual(ws.folders[0].uri, folder1URI.toString(true));
        assert.strictEqual(ws.folders[1].uri, folder2URI.toString(true));
        assert.ok(!ws.folders[0].name);
        assert.ok(!ws.folders[1].name);
        assert.strictEqual(ws.remoteAuthority, 'server');
    });
    test('resolveWorkspace', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        assert.ok(await service.resolveLocalWorkspace(workspace.configPath));
        // make it a valid workspace path
        const newPath = path.join(path.dirname(workspace.configPath.fsPath), `workspace.${WORKSPACE_EXTENSION}`);
        fs.renameSync(workspace.configPath.fsPath, newPath);
        workspace.configPath = URI.file(newPath);
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assert.strictEqual(2, resolved.folders.length);
        assertEqualURI(resolved.configPath, workspace.configPath);
        assert.ok(resolved.id);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ something: 'something' })); // invalid workspace
        const resolvedInvalid = await service.resolveLocalWorkspace(workspace.configPath);
        assert.ok(!resolvedInvalid);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ transient: true, folders: [] })); // transient worksapce
        const resolvedTransient = await service.resolveLocalWorkspace(workspace.configPath);
        assert.ok(resolvedTransient?.transient);
    });
    test('resolveWorkspace (support relative paths)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ folders: [{ path: './ticino-playground/lib' }] }));
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assertEqualURI(resolved.folders[0].uri, URI.file(path.join(path.dirname(workspace.configPath.fsPath), 'ticino-playground', 'lib')));
    });
    test('resolveWorkspace (support relative paths #2)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ folders: [{ path: './ticino-playground/lib/../other' }] }));
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assertEqualURI(resolved.folders[0].uri, URI.file(path.join(path.dirname(workspace.configPath.fsPath), 'ticino-playground', 'other')));
    });
    test('resolveWorkspace (support relative paths #3)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ folders: [{ path: 'ticino-playground/lib' }] }));
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assertEqualURI(resolved.folders[0].uri, URI.file(path.join(path.dirname(workspace.configPath.fsPath), 'ticino-playground', 'lib')));
    });
    test('resolveWorkspace (support invalid JSON via fault tolerant parsing)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        fs.writeFileSync(workspace.configPath.fsPath, '{ "folders": [ { "path": "./ticino-playground/lib" } , ] }'); // trailing comma
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assertEqualURI(resolved.folders[0].uri, URI.file(path.join(path.dirname(workspace.configPath.fsPath), 'ticino-playground', 'lib')));
    });
    test('rewriteWorkspaceFileForNewLocation', async () => {
        const folder1 = cwd; // absolute path because outside of tmpDir
        const tmpInsideDir = path.join(tmpDir, 'inside');
        const firstConfigPath = path.join(tmpDir, 'myworkspace0.code-workspace');
        createWorkspace(firstConfigPath, [folder1, 'inside', path.join('inside', 'somefolder')]);
        const origContent = fs.readFileSync(firstConfigPath).toString();
        let origConfigPath = URI.file(firstConfigPath);
        let workspaceConfigPath = URI.file(path.join(tmpDir, 'inside', 'myworkspace1.code-workspace'));
        let newContent = rewriteWorkspaceFileForNewLocation(origContent, origConfigPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        let ws = JSON.parse(newContent);
        assert.strictEqual(ws.folders.length, 3);
        assertPathEquals(ws.folders[0].path, folder1); // absolute path because outside of tmpdir
        assertPathEquals(ws.folders[1].path, '.');
        assertPathEquals(ws.folders[2].path, 'somefolder');
        origConfigPath = workspaceConfigPath;
        workspaceConfigPath = URI.file(path.join(tmpDir, 'myworkspace2.code-workspace'));
        newContent = rewriteWorkspaceFileForNewLocation(newContent, origConfigPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        ws = JSON.parse(newContent);
        assert.strictEqual(ws.folders.length, 3);
        assertPathEquals(ws.folders[0].path, folder1);
        assertPathEquals(ws.folders[1].path, 'inside');
        assertPathEquals(ws.folders[2].path, 'inside/somefolder');
        origConfigPath = workspaceConfigPath;
        workspaceConfigPath = URI.file(path.join(tmpDir, 'other', 'myworkspace2.code-workspace'));
        newContent = rewriteWorkspaceFileForNewLocation(newContent, origConfigPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        ws = JSON.parse(newContent);
        assert.strictEqual(ws.folders.length, 3);
        assertPathEquals(ws.folders[0].path, folder1);
        assertPathEquals(ws.folders[1].path, '../inside');
        assertPathEquals(ws.folders[2].path, '../inside/somefolder');
        origConfigPath = workspaceConfigPath;
        workspaceConfigPath = URI.parse('foo://foo/bar/myworkspace2.code-workspace');
        newContent = rewriteWorkspaceFileForNewLocation(newContent, origConfigPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        ws = JSON.parse(newContent);
        assert.strictEqual(ws.folders.length, 3);
        assert.strictEqual(ws.folders[0].uri, URI.file(folder1).toString(true));
        assert.strictEqual(ws.folders[1].uri, URI.file(tmpInsideDir).toString(true));
        assert.strictEqual(ws.folders[2].uri, URI.file(path.join(tmpInsideDir, 'somefolder')).toString(true));
        fs.unlinkSync(firstConfigPath);
    });
    test('rewriteWorkspaceFileForNewLocation (preserves comments)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir, path.join(tmpDir, 'somefolder')]);
        const workspaceConfigPath = URI.file(path.join(tmpDir, `myworkspace.${Date.now()}.${WORKSPACE_EXTENSION}`));
        let origContent = fs.readFileSync(workspace.configPath.fsPath).toString();
        origContent = `// this is a comment\n${origContent}`;
        const newContent = rewriteWorkspaceFileForNewLocation(origContent, workspace.configPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        assert.strictEqual(0, newContent.indexOf('// this is a comment'));
        await service.deleteUntitledWorkspace(workspace);
    });
    test('rewriteWorkspaceFileForNewLocation (preserves forward slashes)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir, path.join(tmpDir, 'somefolder')]);
        const workspaceConfigPath = URI.file(path.join(tmpDir, `myworkspace.${Date.now()}.${WORKSPACE_EXTENSION}`));
        let origContent = fs.readFileSync(workspace.configPath.fsPath).toString();
        origContent = origContent.replace(/[\\]/g, '/'); // convert backslash to slash
        const newContent = rewriteWorkspaceFileForNewLocation(origContent, workspace.configPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        const ws = JSON.parse(newContent);
        assert.ok(ws.folders.every(f => f.path.indexOf('\\') < 0));
        await service.deleteUntitledWorkspace(workspace);
    });
    (!isWindows ? test.skip : test)('rewriteWorkspaceFileForNewLocation (unc paths)', async () => {
        const workspaceLocation = path.join(tmpDir, 'wsloc');
        const folder1Location = 'x:\\foo';
        const folder2Location = '\\\\server\\share2\\some\\path';
        const folder3Location = path.join(workspaceLocation, 'inner', 'more');
        const workspace = await createUntitledWorkspace([folder1Location, folder2Location, folder3Location]);
        const workspaceConfigPath = URI.file(path.join(workspaceLocation, `myworkspace.${Date.now()}.${WORKSPACE_EXTENSION}`));
        const origContent = fs.readFileSync(workspace.configPath.fsPath).toString();
        const newContent = rewriteWorkspaceFileForNewLocation(origContent, workspace.configPath, true, workspaceConfigPath, extUriBiasedIgnorePathCase);
        const ws = JSON.parse(newContent);
        assertPathEquals(ws.folders[0].path, folder1Location);
        assertPathEquals(ws.folders[1].path, folder2Location);
        assertPathEquals(ws.folders[2].path, 'inner/more');
        await service.deleteUntitledWorkspace(workspace);
    });
    test('deleteUntitledWorkspace (untitled)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        assert.ok(fs.existsSync(workspace.configPath.fsPath));
        await service.deleteUntitledWorkspace(workspace);
        assert.ok(!fs.existsSync(workspace.configPath.fsPath));
    });
    test('deleteUntitledWorkspace (saved)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        await service.deleteUntitledWorkspace(workspace);
    });
    test('getUntitledWorkspace', async function () {
        await service.initialize();
        let untitled = service.getUntitledWorkspaces();
        assert.strictEqual(untitled.length, 0);
        const untitledOne = await createUntitledWorkspace([cwd, tmpDir]);
        assert.ok(fs.existsSync(untitledOne.configPath.fsPath));
        await service.initialize();
        untitled = service.getUntitledWorkspaces();
        assert.strictEqual(1, untitled.length);
        assert.strictEqual(untitledOne.id, untitled[0].workspace.id);
        await service.deleteUntitledWorkspace(untitledOne);
        await service.initialize();
        untitled = service.getUntitledWorkspaces();
        assert.strictEqual(0, untitled.length);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01hbmFnZW1lbnRNYWluU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvdGVzdC9lbGVjdHJvbi1tYWluL3dvcmtzcGFjZXNNYW5hZ2VtZW50TWFpblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFNeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsV0FB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