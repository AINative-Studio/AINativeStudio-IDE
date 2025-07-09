/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import * as platform from '../../../../base/common/platform.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { Promises } from '../../../../base/node/pfs.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { BackupMainService } from '../../electron-main/backupMainService.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { EnvironmentMainService } from '../../../environment/electron-main/environmentMainService.js';
import { OPTIONS, parseArgs } from '../../../environment/node/argv.js';
import { HotExitConfiguration } from '../../../files/common/files.js';
import { ConsoleMainLogger } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { isFolderBackupInfo } from '../../common/backup.js';
import { InMemoryTestStateMainService } from '../../../test/electron-main/workbenchTestServices.js';
import { LogService } from '../../../log/common/logService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
flakySuite('BackupMainService', () => {
    function assertEqualFolderInfos(actual, expected) {
        const withUriAsString = (f) => ({ folderUri: f.folderUri.toString(), remoteAuthority: f.remoteAuthority });
        assert.deepStrictEqual(actual.map(withUriAsString), expected.map(withUriAsString));
    }
    function toWorkspace(path) {
        return {
            id: createHash('md5').update(sanitizePath(path)).digest('hex'), // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
            configPath: URI.file(path)
        };
    }
    function toWorkspaceBackupInfo(path, remoteAuthority) {
        return {
            workspace: {
                id: createHash('md5').update(sanitizePath(path)).digest('hex'), // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
                configPath: URI.file(path)
            },
            remoteAuthority
        };
    }
    function toFolderBackupInfo(uri, remoteAuthority) {
        return { folderUri: uri, remoteAuthority };
    }
    function toSerializedWorkspace(ws) {
        return {
            id: ws.id,
            configURIPath: ws.configPath.toString()
        };
    }
    function ensureFolderExists(uri) {
        if (!fs.existsSync(uri.fsPath)) {
            fs.mkdirSync(uri.fsPath);
        }
        const backupFolder = service.toBackupPath(uri);
        return createBackupFolder(backupFolder);
    }
    async function ensureWorkspaceExists(workspace) {
        if (!fs.existsSync(workspace.configPath.fsPath)) {
            await Promises.writeFile(workspace.configPath.fsPath, 'Hello');
        }
        const backupFolder = service.toBackupPath(workspace.id);
        await createBackupFolder(backupFolder);
        return workspace;
    }
    async function createBackupFolder(backupFolder) {
        if (!fs.existsSync(backupFolder)) {
            fs.mkdirSync(backupFolder);
            fs.mkdirSync(path.join(backupFolder, Schemas.file));
            await Promises.writeFile(path.join(backupFolder, Schemas.file, 'foo.txt'), 'Hello');
        }
    }
    function readWorkspacesMetadata() {
        return stateMainService.getItem('backupWorkspaces');
    }
    function writeWorkspacesMetadata(data) {
        if (!data) {
            stateMainService.removeItem('backupWorkspaces');
        }
        else {
            stateMainService.setItem('backupWorkspaces', JSON.parse(data));
        }
    }
    function sanitizePath(p) {
        return platform.isLinux ? p : p.toLowerCase();
    }
    const fooFile = URI.file(platform.isWindows ? 'C:\\foo' : '/foo');
    const barFile = URI.file(platform.isWindows ? 'C:\\bar' : '/bar');
    let service;
    let configService;
    let stateMainService;
    let environmentService;
    let testDir;
    let backupHome;
    let existingTestFolder1;
    setup(async () => {
        testDir = getRandomTestPath(os.tmpdir(), 'vsctests', 'backupmainservice');
        backupHome = path.join(testDir, 'Backups');
        existingTestFolder1 = URI.file(path.join(testDir, 'folder1'));
        environmentService = new EnvironmentMainService(parseArgs(process.argv, OPTIONS), { _serviceBrand: undefined, ...product });
        await fs.promises.mkdir(backupHome, { recursive: true });
        configService = new TestConfigurationService();
        stateMainService = new InMemoryTestStateMainService();
        service = new class TestBackupMainService extends BackupMainService {
            constructor() {
                super(environmentService, configService, new LogService(new ConsoleMainLogger()), stateMainService);
                this.backupHome = backupHome;
            }
            toBackupPath(arg) {
                const id = arg instanceof URI ? super.getFolderHash({ folderUri: arg }) : arg;
                return path.join(this.backupHome, id);
            }
            testGetFolderHash(folder) {
                return super.getFolderHash(folder);
            }
            testGetWorkspaceBackups() {
                return super.getWorkspaceBackups();
            }
            testGetFolderBackups() {
                return super.getFolderBackups();
            }
        };
        return service.initialize();
    });
    teardown(() => {
        return Promises.rm(testDir);
    });
    test('service validates backup workspaces on startup and cleans up (folder workspaces)', async function () {
        // 1) backup workspace path does not exist
        service.registerFolderBackup(toFolderBackupInfo(fooFile));
        service.registerFolderBackup(toFolderBackupInfo(barFile));
        await service.initialize();
        assertEqualFolderInfos(service.testGetFolderBackups(), []);
        // 2) backup workspace path exists with empty contents within
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        service.registerFolderBackup(toFolderBackupInfo(fooFile));
        service.registerFolderBackup(toFolderBackupInfo(barFile));
        await service.initialize();
        assertEqualFolderInfos(service.testGetFolderBackups(), []);
        assert.ok(!fs.existsSync(service.toBackupPath(fooFile)));
        assert.ok(!fs.existsSync(service.toBackupPath(barFile)));
        // 3) backup workspace path exists with empty folders within
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        fs.mkdirSync(path.join(service.toBackupPath(fooFile), Schemas.file));
        fs.mkdirSync(path.join(service.toBackupPath(barFile), Schemas.untitled));
        service.registerFolderBackup(toFolderBackupInfo(fooFile));
        service.registerFolderBackup(toFolderBackupInfo(barFile));
        await service.initialize();
        assertEqualFolderInfos(service.testGetFolderBackups(), []);
        assert.ok(!fs.existsSync(service.toBackupPath(fooFile)));
        assert.ok(!fs.existsSync(service.toBackupPath(barFile)));
        // 4) backup workspace path points to a workspace that no longer exists
        // so it should convert the backup worspace to an empty workspace backup
        const fileBackups = path.join(service.toBackupPath(fooFile), Schemas.file);
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        fs.mkdirSync(fileBackups);
        service.registerFolderBackup(toFolderBackupInfo(fooFile));
        assert.strictEqual(service.testGetFolderBackups().length, 1);
        assert.strictEqual(service.getEmptyWindowBackups().length, 0);
        fs.writeFileSync(path.join(fileBackups, 'backup.txt'), '');
        await service.initialize();
        assert.strictEqual(service.testGetFolderBackups().length, 0);
        assert.strictEqual(service.getEmptyWindowBackups().length, 1);
    });
    test('service validates backup workspaces on startup and cleans up (root workspaces)', async function () {
        // 1) backup workspace path does not exist
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath));
        await service.initialize();
        assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        // 2) backup workspace path exists with empty contents within
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath));
        await service.initialize();
        assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        assert.ok(!fs.existsSync(service.toBackupPath(fooFile)));
        assert.ok(!fs.existsSync(service.toBackupPath(barFile)));
        // 3) backup workspace path exists with empty folders within
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        fs.mkdirSync(path.join(service.toBackupPath(fooFile), Schemas.file));
        fs.mkdirSync(path.join(service.toBackupPath(barFile), Schemas.untitled));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath));
        await service.initialize();
        assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        assert.ok(!fs.existsSync(service.toBackupPath(fooFile)));
        assert.ok(!fs.existsSync(service.toBackupPath(barFile)));
        // 4) backup workspace path points to a workspace that no longer exists
        // so it should convert the backup worspace to an empty workspace backup
        const fileBackups = path.join(service.toBackupPath(fooFile), Schemas.file);
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        fs.mkdirSync(fileBackups);
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
        assert.strictEqual(service.testGetWorkspaceBackups().length, 1);
        assert.strictEqual(service.getEmptyWindowBackups().length, 0);
        fs.writeFileSync(path.join(fileBackups, 'backup.txt'), '');
        await service.initialize();
        assert.strictEqual(service.testGetWorkspaceBackups().length, 0);
        assert.strictEqual(service.getEmptyWindowBackups().length, 1);
    });
    test('service supports to migrate backup data from another location', async () => {
        const backupPathToMigrate = service.toBackupPath(fooFile);
        fs.mkdirSync(backupPathToMigrate);
        fs.writeFileSync(path.join(backupPathToMigrate, 'backup.txt'), 'Some Data');
        service.registerFolderBackup(toFolderBackupInfo(URI.file(backupPathToMigrate)));
        const workspaceBackupPath = await service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath), backupPathToMigrate);
        assert.ok(fs.existsSync(workspaceBackupPath));
        assert.ok(fs.existsSync(path.join(workspaceBackupPath, 'backup.txt')));
        assert.ok(!fs.existsSync(backupPathToMigrate));
        const emptyBackups = service.getEmptyWindowBackups();
        assert.strictEqual(0, emptyBackups.length);
    });
    test('service backup migration makes sure to preserve existing backups', async () => {
        const backupPathToMigrate = service.toBackupPath(fooFile);
        fs.mkdirSync(backupPathToMigrate);
        fs.writeFileSync(path.join(backupPathToMigrate, 'backup.txt'), 'Some Data');
        service.registerFolderBackup(toFolderBackupInfo(URI.file(backupPathToMigrate)));
        const backupPathToPreserve = service.toBackupPath(barFile);
        fs.mkdirSync(backupPathToPreserve);
        fs.writeFileSync(path.join(backupPathToPreserve, 'backup.txt'), 'Some Data');
        service.registerFolderBackup(toFolderBackupInfo(URI.file(backupPathToPreserve)));
        const workspaceBackupPath = await service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath), backupPathToMigrate);
        assert.ok(fs.existsSync(workspaceBackupPath));
        assert.ok(fs.existsSync(path.join(workspaceBackupPath, 'backup.txt')));
        assert.ok(!fs.existsSync(backupPathToMigrate));
        const emptyBackups = service.getEmptyWindowBackups();
        assert.strictEqual(1, emptyBackups.length);
        assert.strictEqual(1, fs.readdirSync(path.join(backupHome, emptyBackups[0].backupFolder)).length);
    });
    suite('loadSync', () => {
        test('getFolderBackupPaths() should return [] when workspaces.json doesn\'t exist', () => {
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
        });
        test('getFolderBackupPaths() should return [] when folders in workspaces.json is absent', async () => {
            writeWorkspacesMetadata('{}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
        });
        test('getFolderBackupPaths() should return [] when folders in workspaces.json is not a string array', async () => {
            writeWorkspacesMetadata('{"folders":{}}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":{"foo": ["bar"]}}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":{"foo": []}}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":{"foo": "bar"}}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":"foo"}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":1}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
        });
        test('getFolderBackupPaths() should return [] when files.hotExit = "onExitAndWindowClose"', async () => {
            const fi = toFolderBackupInfo(URI.file(fooFile.fsPath.toUpperCase()));
            service.registerFolderBackup(fi);
            assertEqualFolderInfos(service.testGetFolderBackups(), [fi]);
            configService.setUserConfiguration('files.hotExit', HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE);
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when workspaces.json doesn\'t exist', () => {
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when folderWorkspaces in workspaces.json is absent', async () => {
            writeWorkspacesMetadata('{}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when rootWorkspaces in workspaces.json is not a object array', async () => {
            writeWorkspacesMetadata('{"rootWorkspaces":{}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":{"foo": ["bar"]}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":{"foo": []}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":{"foo": "bar"}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":"foo"}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":1}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when workspaces in workspaces.json is not a object array', async () => {
            writeWorkspacesMetadata('{"workspaces":{}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":{"foo": ["bar"]}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":{"foo": []}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":{"foo": "bar"}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":"foo"}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":1}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when files.hotExit = "onExitAndWindowClose"', async () => {
            const upperFooPath = fooFile.fsPath.toUpperCase();
            service.registerWorkspaceBackup(toWorkspaceBackupInfo(upperFooPath));
            assert.strictEqual(service.testGetWorkspaceBackups().length, 1);
            assert.deepStrictEqual(service.testGetWorkspaceBackups().map(r => r.workspace.configPath.toString()), [URI.file(upperFooPath).toString()]);
            configService.setUserConfiguration('files.hotExit', HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE);
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getEmptyWorkspaceBackupPaths() should return [] when workspaces.json doesn\'t exist', () => {
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
        });
        test('getEmptyWorkspaceBackupPaths() should return [] when folderWorkspaces in workspaces.json is absent', async () => {
            writeWorkspacesMetadata('{}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
        });
        test('getEmptyWorkspaceBackupPaths() should return [] when folderWorkspaces in workspaces.json is not a string array', async function () {
            writeWorkspacesMetadata('{"emptyWorkspaces":{}}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":{"foo": ["bar"]}}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":{"foo": []}}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":{"foo": "bar"}}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":"foo"}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":1}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
        });
    });
    suite('dedupeFolderWorkspaces', () => {
        test('should ignore duplicates (folder workspace)', async () => {
            await ensureFolderExists(existingTestFolder1);
            const workspacesJson = {
                workspaces: [],
                folders: [{ folderUri: existingTestFolder1.toString() }, { folderUri: existingTestFolder1.toString() }],
                emptyWindows: []
            };
            writeWorkspacesMetadata(JSON.stringify(workspacesJson));
            await service.initialize();
            const json = readWorkspacesMetadata();
            assert.deepStrictEqual(json.folders, [{ folderUri: existingTestFolder1.toString() }]);
        });
        test('should ignore duplicates on Windows and Mac (folder workspace)', async () => {
            await ensureFolderExists(existingTestFolder1);
            const workspacesJson = {
                workspaces: [],
                folders: [{ folderUri: existingTestFolder1.toString() }, { folderUri: existingTestFolder1.toString().toLowerCase() }],
                emptyWindows: []
            };
            writeWorkspacesMetadata(JSON.stringify(workspacesJson));
            await service.initialize();
            const json = readWorkspacesMetadata();
            assert.deepStrictEqual(json.folders, [{ folderUri: existingTestFolder1.toString() }]);
        });
        test('should ignore duplicates on Windows and Mac (root workspace)', async () => {
            const workspacePath = path.join(testDir, 'Foo.code-workspace');
            const workspacePath1 = path.join(testDir, 'FOO.code-workspace');
            const workspacePath2 = path.join(testDir, 'foo.code-workspace');
            const workspace1 = await ensureWorkspaceExists(toWorkspace(workspacePath));
            const workspace2 = await ensureWorkspaceExists(toWorkspace(workspacePath1));
            const workspace3 = await ensureWorkspaceExists(toWorkspace(workspacePath2));
            const workspacesJson = {
                workspaces: [workspace1, workspace2, workspace3].map(toSerializedWorkspace),
                folders: [],
                emptyWindows: []
            };
            writeWorkspacesMetadata(JSON.stringify(workspacesJson));
            await service.initialize();
            const json = readWorkspacesMetadata();
            assert.strictEqual(json.workspaces.length, platform.isLinux ? 3 : 1);
            if (platform.isLinux) {
                assert.deepStrictEqual(json.workspaces.map(r => r.configURIPath), [URI.file(workspacePath).toString(), URI.file(workspacePath1).toString(), URI.file(workspacePath2).toString()]);
            }
            else {
                assert.deepStrictEqual(json.workspaces.map(r => r.configURIPath), [URI.file(workspacePath).toString()], 'should return the first duplicated entry');
            }
        });
    });
    suite('registerWindowForBackups', () => {
        test('should persist paths to workspaces.json (folder workspace)', async () => {
            service.registerFolderBackup(toFolderBackupInfo(fooFile));
            service.registerFolderBackup(toFolderBackupInfo(barFile));
            assertEqualFolderInfos(service.testGetFolderBackups(), [toFolderBackupInfo(fooFile), toFolderBackupInfo(barFile)]);
            const json = readWorkspacesMetadata();
            assert.deepStrictEqual(json.folders, [{ folderUri: fooFile.toString() }, { folderUri: barFile.toString() }]);
        });
        test('should persist paths to workspaces.json (root workspace)', async () => {
            const ws1 = toWorkspaceBackupInfo(fooFile.fsPath);
            service.registerWorkspaceBackup(ws1);
            const ws2 = toWorkspaceBackupInfo(barFile.fsPath);
            service.registerWorkspaceBackup(ws2);
            assert.deepStrictEqual(service.testGetWorkspaceBackups().map(b => b.workspace.configPath.toString()), [fooFile.toString(), barFile.toString()]);
            assert.strictEqual(ws1.workspace.id, service.testGetWorkspaceBackups()[0].workspace.id);
            assert.strictEqual(ws2.workspace.id, service.testGetWorkspaceBackups()[1].workspace.id);
            const json = readWorkspacesMetadata();
            assert.deepStrictEqual(json.workspaces.map(b => b.configURIPath), [fooFile.toString(), barFile.toString()]);
            assert.strictEqual(ws1.workspace.id, json.workspaces[0].id);
            assert.strictEqual(ws2.workspace.id, json.workspaces[1].id);
        });
    });
    test('should always store the workspace path in workspaces.json using the case given, regardless of whether the file system is case-sensitive (folder workspace)', async () => {
        service.registerFolderBackup(toFolderBackupInfo(URI.file(fooFile.fsPath.toUpperCase())));
        assertEqualFolderInfos(service.testGetFolderBackups(), [toFolderBackupInfo(URI.file(fooFile.fsPath.toUpperCase()))]);
        const json = readWorkspacesMetadata();
        assert.deepStrictEqual(json.folders, [{ folderUri: URI.file(fooFile.fsPath.toUpperCase()).toString() }]);
    });
    test('should always store the workspace path in workspaces.json using the case given, regardless of whether the file system is case-sensitive (root workspace)', async () => {
        const upperFooPath = fooFile.fsPath.toUpperCase();
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(upperFooPath));
        assert.deepStrictEqual(service.testGetWorkspaceBackups().map(b => b.workspace.configPath.toString()), [URI.file(upperFooPath).toString()]);
        const json = readWorkspacesMetadata();
        assert.deepStrictEqual(json.workspaces.map(b => b.configURIPath), [URI.file(upperFooPath).toString()]);
    });
    suite('getWorkspaceHash', () => {
        (platform.isLinux ? test.skip : test)('should ignore case on Windows and Mac', () => {
            const assertFolderHash = (uri1, uri2) => {
                assert.strictEqual(service.testGetFolderHash(toFolderBackupInfo(uri1)), service.testGetFolderHash(toFolderBackupInfo(uri2)));
            };
            if (platform.isMacintosh) {
                assertFolderHash(URI.file('/foo'), URI.file('/FOO'));
            }
            if (platform.isWindows) {
                assertFolderHash(URI.file('c:\\foo'), URI.file('C:\\FOO'));
            }
        });
    });
    suite('mixed path casing', () => {
        test('should handle case insensitive paths properly (registerWindowForBackupsSync) (folder workspace)', () => {
            service.registerFolderBackup(toFolderBackupInfo(fooFile));
            service.registerFolderBackup(toFolderBackupInfo(URI.file(fooFile.fsPath.toUpperCase())));
            if (platform.isLinux) {
                assert.strictEqual(service.testGetFolderBackups().length, 2);
            }
            else {
                assert.strictEqual(service.testGetFolderBackups().length, 1);
            }
        });
        test('should handle case insensitive paths properly (registerWindowForBackupsSync) (root workspace)', () => {
            service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
            service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath.toUpperCase()));
            if (platform.isLinux) {
                assert.strictEqual(service.testGetWorkspaceBackups().length, 2);
            }
            else {
                assert.strictEqual(service.testGetWorkspaceBackups().length, 1);
            }
        });
    });
    suite('getDirtyWorkspaces', () => {
        test('should report if a workspace or folder has backups', async () => {
            const folderBackupPath = service.registerFolderBackup(toFolderBackupInfo(fooFile));
            const backupWorkspaceInfo = toWorkspaceBackupInfo(fooFile.fsPath);
            const workspaceBackupPath = service.registerWorkspaceBackup(backupWorkspaceInfo);
            assert.strictEqual(((await service.getDirtyWorkspaces()).length), 0);
            try {
                await fs.promises.mkdir(path.join(folderBackupPath, Schemas.file), { recursive: true });
                await fs.promises.mkdir(path.join(workspaceBackupPath, Schemas.untitled), { recursive: true });
            }
            catch (error) {
                // ignore - folder might exist already
            }
            assert.strictEqual(((await service.getDirtyWorkspaces()).length), 0);
            fs.writeFileSync(path.join(folderBackupPath, Schemas.file, '594a4a9d82a277a899d4713a5b08f504'), '');
            fs.writeFileSync(path.join(workspaceBackupPath, Schemas.untitled, '594a4a9d82a277a899d4713a5b08f504'), '');
            const dirtyWorkspaces = await service.getDirtyWorkspaces();
            assert.strictEqual(dirtyWorkspaces.length, 2);
            let found = 0;
            for (const dirtyWorkpspace of dirtyWorkspaces) {
                if (isFolderBackupInfo(dirtyWorkpspace)) {
                    if (isEqual(fooFile, dirtyWorkpspace.folderUri)) {
                        found++;
                    }
                }
                else {
                    if (isEqual(backupWorkspaceInfo.workspace.configPath, dirtyWorkpspace.workspace.configPath)) {
                        found++;
                    }
                }
            }
            assert.strictEqual(found, 2);
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwTWFpblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9iYWNrdXAvdGVzdC9lbGVjdHJvbi1tYWluL2JhY2t1cE1haW5TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDcEMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDMUcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsb0JBQW9C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