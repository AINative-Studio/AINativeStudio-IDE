/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { insert } from '../../../../../base/common/arrays.js';
import { hash } from '../../../../../base/common/hash.js';
import { isEqual, joinPath, dirname } from '../../../../../base/common/resources.js';
import { join } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { WorkingCopyBackupsModel, hashIdentifier } from '../../common/workingCopyBackupService.js';
import { createTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { Schemas } from '../../../../../base/common/network.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { LogLevel, NullLogService } from '../../../../../platform/log/common/log.js';
import { NativeWorkbenchEnvironmentService } from '../../../environment/electron-sandbox/environmentService.js';
import { toBufferOrReadable } from '../../../textfile/common/textfiles.js';
import { NativeWorkingCopyBackupService } from '../../electron-sandbox/workingCopyBackupService.js';
import { FileUserDataProvider } from '../../../../../platform/userData/common/fileUserDataProvider.js';
import { bufferToReadable, bufferToStream, streamToBuffer, VSBuffer } from '../../../../../base/common/buffer.js';
import { TestLifecycleService, toTypedWorkingCopyId, toUntypedWorkingCopyId } from '../../../../test/browser/workbenchTestServices.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { consumeStream } from '../../../../../base/common/stream.js';
import { TestProductService } from '../../../../test/common/workbenchTestServices.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import product from '../../../../../platform/product/common/product.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { UserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
const homeDir = URI.file('home').with({ scheme: Schemas.inMemory });
const tmpDir = URI.file('tmp').with({ scheme: Schemas.inMemory });
const NULL_PROFILE = {
    name: '',
    id: '',
    shortName: '',
    isDefault: false,
    location: homeDir,
    settingsResource: joinPath(homeDir, 'settings.json'),
    globalStorageHome: joinPath(homeDir, 'globalStorage'),
    keybindingsResource: joinPath(homeDir, 'keybindings.json'),
    tasksResource: joinPath(homeDir, 'tasks.json'),
    snippetsHome: joinPath(homeDir, 'snippets'),
    promptsHome: joinPath(homeDir, 'prompts'),
    extensionsResource: joinPath(homeDir, 'extensions.json'),
    cacheHome: joinPath(homeDir, 'cache')
};
const TestNativeWindowConfiguration = {
    windowId: 0,
    machineId: 'testMachineId',
    sqmId: 'testSqmId',
    devDeviceId: 'testdevDeviceId',
    logLevel: LogLevel.Error,
    loggers: [],
    mainPid: 0,
    appRoot: '',
    userEnv: {},
    execPath: process.execPath,
    perfMarks: [],
    colorScheme: { dark: true, highContrast: false },
    os: { release: 'unknown', hostname: 'unknown', arch: 'unknown' },
    product,
    homeDir: homeDir.fsPath,
    tmpDir: tmpDir.fsPath,
    userDataDir: joinPath(homeDir, product.nameShort).fsPath,
    profiles: { profile: NULL_PROFILE, all: [NULL_PROFILE], home: homeDir },
    nls: {
        messages: [],
        language: 'en'
    },
    _: []
};
export class TestNativeWorkbenchEnvironmentService extends NativeWorkbenchEnvironmentService {
    constructor(testDir, backupPath) {
        super({ ...TestNativeWindowConfiguration, backupPath: backupPath.fsPath, 'user-data-dir': testDir.fsPath }, TestProductService);
    }
}
export class NodeTestWorkingCopyBackupService extends NativeWorkingCopyBackupService {
    constructor(testDir, workspaceBackupPath) {
        const environmentService = new TestNativeWorkbenchEnvironmentService(testDir, workspaceBackupPath);
        const logService = new NullLogService();
        const fileService = new FileService(logService);
        const lifecycleService = new TestLifecycleService();
        super(environmentService, fileService, logService, lifecycleService);
        const fsp = new InMemoryFileSystemProvider();
        fileService.registerProvider(Schemas.inMemory, fsp);
        const uriIdentityService = new UriIdentityService(fileService);
        const userDataProfilesService = new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService);
        fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, fsp, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        this._fileService = fileService;
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this.pendingBackupsArr = [];
        this.discardedAllBackups = false;
    }
    testGetFileService() {
        return this.fileService;
    }
    async waitForAllBackups() {
        await Promise.all(this.pendingBackupsArr);
    }
    joinBackupResource() {
        return new Promise(resolve => this.backupResourceJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        const p = super.backup(identifier, content, versionId, meta, token);
        const removeFromPendingBackups = insert(this.pendingBackupsArr, p.then(undefined, undefined));
        try {
            await p;
        }
        finally {
            removeFromPendingBackups();
        }
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    joinDiscardBackup() {
        return new Promise(resolve => this.discardBackupJoiners.push(resolve));
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async discardBackups(filter) {
        this.discardedAllBackups = true;
        return super.discardBackups(filter);
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
suite('WorkingCopyBackupService', () => {
    let testDir;
    let backupHome;
    let workspacesJsonPath;
    let workspaceBackupPath;
    let service;
    let fileService;
    const disposables = new DisposableStore();
    const workspaceResource = URI.file(isWindows ? 'c:\\workspace' : '/workspace');
    const fooFile = URI.file(isWindows ? 'c:\\Foo' : '/Foo');
    const customFile = URI.parse('customScheme://some/path');
    const customFileWithFragment = URI.parse('customScheme2://some/path#fragment');
    const barFile = URI.file(isWindows ? 'c:\\Bar' : '/Bar');
    const fooBarFile = URI.file(isWindows ? 'c:\\Foo Bar' : '/Foo Bar');
    const untitledFile = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
    setup(async () => {
        testDir = URI.file(join(generateUuid(), 'vsctests', 'workingcopybackupservice')).with({ scheme: Schemas.inMemory });
        backupHome = joinPath(testDir, 'Backups');
        workspacesJsonPath = joinPath(backupHome, 'workspaces.json');
        workspaceBackupPath = joinPath(backupHome, hash(workspaceResource.fsPath).toString(16));
        service = disposables.add(new NodeTestWorkingCopyBackupService(testDir, workspaceBackupPath));
        fileService = service._fileService;
        await fileService.createFolder(backupHome);
        return fileService.writeFile(workspacesJsonPath, VSBuffer.fromString(''));
    });
    teardown(() => {
        disposables.clear();
    });
    suite('hashIdentifier', () => {
        test('should correctly hash the identifier for untitled scheme URIs', () => {
            const uri = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes change people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const untypedBackupHash = hashIdentifier(toUntypedWorkingCopyId(uri));
            assert.strictEqual(untypedBackupHash, '-7f9c1a2e');
            assert.strictEqual(untypedBackupHash, hash(uri.fsPath).toString(16));
            const typedBackupHash = hashIdentifier({ typeId: 'hashTest', resource: uri });
            if (isWindows) {
                assert.strictEqual(typedBackupHash, '-17c47cdc');
            }
            else {
                assert.strictEqual(typedBackupHash, '-8ad5f4f');
            }
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes collide people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert.notStrictEqual(untypedBackupHash, typedBackupHash);
        });
        test('should correctly hash the identifier for file scheme URIs', () => {
            const uri = URI.file('/foo');
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes change people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const untypedBackupHash = hashIdentifier(toUntypedWorkingCopyId(uri));
            if (isWindows) {
                assert.strictEqual(untypedBackupHash, '20ffaa13');
            }
            else {
                assert.strictEqual(untypedBackupHash, '20eb3560');
            }
            assert.strictEqual(untypedBackupHash, hash(uri.fsPath).toString(16));
            const typedBackupHash = hashIdentifier({ typeId: 'hashTest', resource: uri });
            if (isWindows) {
                assert.strictEqual(typedBackupHash, '-55fc55db');
            }
            else {
                assert.strictEqual(typedBackupHash, '51e56bf');
            }
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes collide people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert.notStrictEqual(untypedBackupHash, typedBackupHash);
        });
        test('should correctly hash the identifier for custom scheme URIs', () => {
            const uri = URI.from({
                scheme: 'vscode-custom',
                path: 'somePath'
            });
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes change people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const untypedBackupHash = hashIdentifier(toUntypedWorkingCopyId(uri));
            assert.strictEqual(untypedBackupHash, '-44972d98');
            assert.strictEqual(untypedBackupHash, hash(uri.toString()).toString(16));
            const typedBackupHash = hashIdentifier({ typeId: 'hashTest', resource: uri });
            assert.strictEqual(typedBackupHash, '502149c7');
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes collide people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert.notStrictEqual(untypedBackupHash, typedBackupHash);
        });
        test('should not fail for URIs without path', () => {
            const uri = URI.from({
                scheme: 'vscode-fragment',
                fragment: 'frag'
            });
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes change people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const untypedBackupHash = hashIdentifier(toUntypedWorkingCopyId(uri));
            assert.strictEqual(untypedBackupHash, '-2f6b2f1b');
            assert.strictEqual(untypedBackupHash, hash(uri.toString()).toString(16));
            const typedBackupHash = hashIdentifier({ typeId: 'hashTest', resource: uri });
            assert.strictEqual(typedBackupHash, '6e82ca57');
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes collide people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert.notStrictEqual(untypedBackupHash, typedBackupHash);
        });
    });
    suite('getBackupResource', () => {
        test('should get the correct backup path for text files', () => {
            // Format should be: <backupHome>/<workspaceHash>/<scheme>/<filePathHash>
            const backupResource = fooFile;
            const workspaceHash = hash(workspaceResource.fsPath).toString(16);
            // No Type ID
            let backupId = toUntypedWorkingCopyId(backupResource);
            let filePathHash = hashIdentifier(backupId);
            let expectedPath = joinPath(backupHome, workspaceHash, Schemas.file, filePathHash).with({ scheme: Schemas.vscodeUserData }).toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
            // With Type ID
            backupId = toTypedWorkingCopyId(backupResource);
            filePathHash = hashIdentifier(backupId);
            expectedPath = joinPath(backupHome, workspaceHash, Schemas.file, filePathHash).with({ scheme: Schemas.vscodeUserData }).toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
        });
        test('should get the correct backup path for untitled files', () => {
            // Format should be: <backupHome>/<workspaceHash>/<scheme>/<filePathHash>
            const backupResource = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
            const workspaceHash = hash(workspaceResource.fsPath).toString(16);
            // No Type ID
            let backupId = toUntypedWorkingCopyId(backupResource);
            let filePathHash = hashIdentifier(backupId);
            let expectedPath = joinPath(backupHome, workspaceHash, Schemas.untitled, filePathHash).with({ scheme: Schemas.vscodeUserData }).toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
            // With Type ID
            backupId = toTypedWorkingCopyId(backupResource);
            filePathHash = hashIdentifier(backupId);
            expectedPath = joinPath(backupHome, workspaceHash, Schemas.untitled, filePathHash).with({ scheme: Schemas.vscodeUserData }).toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
        });
        test('should get the correct backup path for custom files', () => {
            // Format should be: <backupHome>/<workspaceHash>/<scheme>/<filePathHash>
            const backupResource = URI.from({ scheme: 'custom', path: 'custom/file.txt' });
            const workspaceHash = hash(workspaceResource.fsPath).toString(16);
            // No Type ID
            let backupId = toUntypedWorkingCopyId(backupResource);
            let filePathHash = hashIdentifier(backupId);
            let expectedPath = joinPath(backupHome, workspaceHash, 'custom', filePathHash).with({ scheme: Schemas.vscodeUserData }).toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
            // With Type ID
            backupId = toTypedWorkingCopyId(backupResource);
            filePathHash = hashIdentifier(backupId);
            expectedPath = joinPath(backupHome, workspaceHash, 'custom', filePathHash).with({ scheme: Schemas.vscodeUserData }).toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
        });
    });
    suite('backup', () => {
        function toExpectedPreamble(identifier, content = '', meta) {
            return `${identifier.resource.toString()} ${JSON.stringify({ ...meta, typeId: identifier.typeId })}\n${content}`;
        }
        test('joining', async () => {
            let backupJoined = false;
            const joinBackupsPromise = service.joinBackups();
            joinBackupsPromise.then(() => backupJoined = true);
            await joinBackupsPromise;
            assert.strictEqual(backupJoined, true);
            backupJoined = false;
            service.joinBackups().then(() => backupJoined = true);
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const backupPromise = service.backup(identifier);
            assert.strictEqual(backupJoined, false);
            await backupPromise;
            assert.strictEqual(backupJoined, true);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('no text', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file (with version)', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')), 666);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            assert.ok(!service.hasBackupSync(identifier, 555));
            assert.ok(service.hasBackupSync(identifier, 666));
        });
        test('text file (with meta)', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const meta = { etag: '678', orphaned: true };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')), undefined, meta);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test', meta));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file with whitespace in name and type (with meta)', async () => {
            const fileWithSpace = URI.file(isWindows ? 'c:\\Foo \n Bar' : '/Foo \n Bar');
            const identifier = toTypedWorkingCopyId(fileWithSpace, ' test id \n');
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const meta = { etag: '678 \n k', orphaned: true };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')), undefined, meta);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test', meta));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file with unicode character in name and type (with meta)', async () => {
            const fileWithUnicode = URI.file(isWindows ? 'c:\\so𒀅meࠄ' : '/so𒀅meࠄ');
            const identifier = toTypedWorkingCopyId(fileWithUnicode, ' test so𒀅meࠄ id \n');
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const meta = { etag: '678so𒀅meࠄ', orphaned: true };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')), undefined, meta);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test', meta));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('untitled file', async () => {
            const identifier = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file (readable)', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const model = createTextModel('test');
            await service.backup(identifier, toBufferOrReadable(model.createSnapshot()));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            assert.ok(service.hasBackupSync(identifier));
            model.dispose();
        });
        test('untitled file (readable)', async () => {
            const identifier = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const model = createTextModel('test');
            await service.backup(identifier, toBufferOrReadable(model.createSnapshot()));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            model.dispose();
        });
        test('text file (large file, stream)', () => {
            const largeString = (new Array(30 * 1024)).join('Large String\n');
            return testLargeTextFile(largeString, bufferToStream(VSBuffer.fromString(largeString)));
        });
        test('text file (large file, readable)', async () => {
            const largeString = (new Array(30 * 1024)).join('Large String\n');
            const model = createTextModel(largeString);
            await testLargeTextFile(largeString, toBufferOrReadable(model.createSnapshot()));
            model.dispose();
        });
        async function testLargeTextFile(largeString, buffer) {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, buffer, undefined, { largeTest: true });
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, largeString, { largeTest: true }));
            assert.ok(service.hasBackupSync(identifier));
        }
        test('untitled file (large file, readable)', async () => {
            const identifier = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const largeString = (new Array(30 * 1024)).join('Large String\n');
            const model = createTextModel(largeString);
            await service.backup(identifier, toBufferOrReadable(model.createSnapshot()));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, largeString));
            assert.ok(service.hasBackupSync(identifier));
            model.dispose();
        });
        test('cancellation', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const cts = new CancellationTokenSource();
            const promise = service.backup(identifier, undefined, undefined, undefined, cts.token);
            cts.cancel();
            await promise;
            assert.strictEqual((await fileService.exists(backupPath)), false);
            assert.ok(!service.hasBackupSync(identifier));
        });
        test('multiple', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await Promise.all([
                service.backup(identifier),
                service.backup(identifier),
                service.backup(identifier),
                service.backup(identifier)
            ]);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('multiple same resource, different type id', async () => {
            const backupId1 = toUntypedWorkingCopyId(fooFile);
            const backupId2 = toTypedWorkingCopyId(fooFile, 'type1');
            const backupId3 = toTypedWorkingCopyId(fooFile, 'type2');
            await Promise.all([
                service.backup(backupId1),
                service.backup(backupId2),
                service.backup(backupId3)
            ]);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 3);
            for (const backupId of [backupId1, backupId2, backupId3]) {
                const fooBackupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
                assert.strictEqual((await fileService.exists(fooBackupPath)), true);
                assert.strictEqual((await fileService.readFile(fooBackupPath)).value.toString(), toExpectedPreamble(backupId));
                assert.ok(service.hasBackupSync(backupId));
            }
        });
    });
    suite('discardBackup', () => {
        test('joining', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.ok(service.hasBackupSync(identifier));
            let backupJoined = false;
            service.joinBackups().then(() => backupJoined = true);
            const discardBackupPromise = service.discardBackup(identifier);
            assert.strictEqual(backupJoined, false);
            await discardBackupPromise;
            assert.strictEqual(backupJoined, true);
            assert.strictEqual((await fileService.exists(backupPath)), false);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 0);
            assert.ok(!service.hasBackupSync(identifier));
        });
        test('text file', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.ok(service.hasBackupSync(identifier));
            await service.discardBackup(identifier);
            assert.strictEqual((await fileService.exists(backupPath)), false);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 0);
            assert.ok(!service.hasBackupSync(identifier));
        });
        test('untitled file', async () => {
            const identifier = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            await service.discardBackup(identifier);
            assert.strictEqual((await fileService.exists(backupPath)), false);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 0);
        });
        test('multiple same resource, different type id', async () => {
            const backupId1 = toUntypedWorkingCopyId(fooFile);
            const backupId2 = toTypedWorkingCopyId(fooFile, 'type1');
            const backupId3 = toTypedWorkingCopyId(fooFile, 'type2');
            await Promise.all([
                service.backup(backupId1),
                service.backup(backupId2),
                service.backup(backupId3)
            ]);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 3);
            for (const backupId of [backupId1, backupId2, backupId3]) {
                const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
                await service.discardBackup(backupId);
                assert.strictEqual((await fileService.exists(backupPath)), false);
            }
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 0);
        });
    });
    suite('discardBackups (all)', () => {
        test('text file', async () => {
            const backupId1 = toUntypedWorkingCopyId(fooFile);
            const backupId2 = toUntypedWorkingCopyId(barFile);
            const backupId3 = toTypedWorkingCopyId(barFile);
            await service.backup(backupId1, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            await service.backup(backupId2, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 2);
            await service.backup(backupId3, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 3);
            await service.discardBackups();
            for (const backupId of [backupId1, backupId2, backupId3]) {
                const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
                assert.strictEqual((await fileService.exists(backupPath)), false);
            }
            assert.strictEqual((await fileService.exists(joinPath(workspaceBackupPath, 'file'))), false);
        });
        test('untitled file', async () => {
            const backupId = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
            await service.backup(backupId, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            await service.discardBackups();
            assert.strictEqual((await fileService.exists(backupPath)), false);
            assert.strictEqual((await fileService.exists(joinPath(workspaceBackupPath, 'untitled'))), false);
        });
        test('can backup after discarding all', async () => {
            await service.discardBackups();
            await service.backup(toUntypedWorkingCopyId(untitledFile), bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.exists(workspaceBackupPath)), true);
        });
    });
    suite('discardBackups (except some)', () => {
        test('text file', async () => {
            const backupId1 = toUntypedWorkingCopyId(fooFile);
            const backupId2 = toUntypedWorkingCopyId(barFile);
            const backupId3 = toTypedWorkingCopyId(barFile);
            await service.backup(backupId1, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            await service.backup(backupId2, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 2);
            await service.backup(backupId3, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 3);
            await service.discardBackups({ except: [backupId2, backupId3] });
            let backupPath = joinPath(workspaceBackupPath, backupId1.resource.scheme, hashIdentifier(backupId1));
            assert.strictEqual((await fileService.exists(backupPath)), false);
            backupPath = joinPath(workspaceBackupPath, backupId2.resource.scheme, hashIdentifier(backupId2));
            assert.strictEqual((await fileService.exists(backupPath)), true);
            backupPath = joinPath(workspaceBackupPath, backupId3.resource.scheme, hashIdentifier(backupId3));
            assert.strictEqual((await fileService.exists(backupPath)), true);
            await service.discardBackups({ except: [backupId1] });
            for (const backupId of [backupId1, backupId2, backupId3]) {
                const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
                assert.strictEqual((await fileService.exists(backupPath)), false);
            }
        });
        test('untitled file', async () => {
            const backupId = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
            await service.backup(backupId, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.exists(backupPath)), true);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            await service.discardBackups({ except: [backupId] });
            assert.strictEqual((await fileService.exists(backupPath)), true);
        });
    });
    suite('getBackups', () => {
        test('text file', async () => {
            await Promise.all([
                service.backup(toUntypedWorkingCopyId(fooFile), bufferToReadable(VSBuffer.fromString('test'))),
                service.backup(toTypedWorkingCopyId(fooFile, 'type1'), bufferToReadable(VSBuffer.fromString('test'))),
                service.backup(toTypedWorkingCopyId(fooFile, 'type2'), bufferToReadable(VSBuffer.fromString('test')))
            ]);
            let backups = await service.getBackups();
            assert.strictEqual(backups.length, 3);
            for (const backup of backups) {
                if (backup.typeId === '') {
                    assert.strictEqual(backup.resource.toString(), fooFile.toString());
                }
                else if (backup.typeId === 'type1') {
                    assert.strictEqual(backup.resource.toString(), fooFile.toString());
                }
                else if (backup.typeId === 'type2') {
                    assert.strictEqual(backup.resource.toString(), fooFile.toString());
                }
                else {
                    assert.fail('Unexpected backup');
                }
            }
            await service.backup(toUntypedWorkingCopyId(barFile), bufferToReadable(VSBuffer.fromString('test')));
            backups = await service.getBackups();
            assert.strictEqual(backups.length, 4);
        });
        test('untitled file', async () => {
            await Promise.all([
                service.backup(toUntypedWorkingCopyId(untitledFile), bufferToReadable(VSBuffer.fromString('test'))),
                service.backup(toTypedWorkingCopyId(untitledFile, 'type1'), bufferToReadable(VSBuffer.fromString('test'))),
                service.backup(toTypedWorkingCopyId(untitledFile, 'type2'), bufferToReadable(VSBuffer.fromString('test')))
            ]);
            const backups = await service.getBackups();
            assert.strictEqual(backups.length, 3);
            for (const backup of backups) {
                if (backup.typeId === '') {
                    assert.strictEqual(backup.resource.toString(), untitledFile.toString());
                }
                else if (backup.typeId === 'type1') {
                    assert.strictEqual(backup.resource.toString(), untitledFile.toString());
                }
                else if (backup.typeId === 'type2') {
                    assert.strictEqual(backup.resource.toString(), untitledFile.toString());
                }
                else {
                    assert.fail('Unexpected backup');
                }
            }
        });
    });
    suite('resolve', () => {
        test('should restore the original contents (untitled file)', async () => {
            const contents = 'test\nand more stuff';
            await testResolveBackup(untitledFile, contents);
        });
        test('should restore the original contents (untitled file with metadata)', async () => {
            const contents = 'test\nand more stuff';
            const meta = {
                etag: 'the Etag',
                size: 666,
                mtime: Date.now(),
                orphaned: true
            };
            await testResolveBackup(untitledFile, contents, meta);
        });
        test('should restore the original contents (untitled file empty with metadata)', async () => {
            const contents = '';
            const meta = {
                etag: 'the Etag',
                size: 666,
                mtime: Date.now(),
                orphaned: true
            };
            await testResolveBackup(untitledFile, contents, meta);
        });
        test('should restore the original contents (untitled large file with metadata)', async () => {
            const contents = (new Array(30 * 1024)).join('Large String\n');
            const meta = {
                etag: 'the Etag',
                size: 666,
                mtime: Date.now(),
                orphaned: true
            };
            await testResolveBackup(untitledFile, contents, meta);
        });
        test('should restore the original contents (text file)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'consectetur ',
                'adipiscing ßß elit'
            ].join('');
            await testResolveBackup(fooFile, contents);
        });
        test('should restore the original contents (text file - custom scheme)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'consectetur ',
                'adipiscing ßß elit'
            ].join('');
            await testResolveBackup(customFile, contents);
        });
        test('should restore the original contents (text file with metadata)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur '
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            await testResolveBackup(fooFile, contents, meta);
        });
        test('should restore the original contents (empty text file with metadata)', async () => {
            const contents = '';
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            await testResolveBackup(fooFile, contents, meta);
        });
        test('should restore the original contents (large text file with metadata)', async () => {
            const contents = (new Array(30 * 1024)).join('Large String\n');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            await testResolveBackup(fooFile, contents, meta);
        });
        test('should restore the original contents (text file with metadata changed once)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur '
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            await testResolveBackup(fooFile, contents, meta);
            // Change meta and test again
            meta.size = 999;
            await testResolveBackup(fooFile, contents, meta);
        });
        test('should restore the original contents (text file with metadata and fragment URI)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur '
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            await testResolveBackup(customFileWithFragment, contents, meta);
        });
        test('should restore the original contents (text file with space in name with metadata)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur '
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            await testResolveBackup(fooBarFile, contents, meta);
        });
        test('should restore the original contents (text file with too large metadata to persist)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur '
            ].join('');
            const meta = {
                etag: (new Array(100 * 1024)).join('Large String'),
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            await testResolveBackup(fooFile, contents, meta, true);
        });
        async function testResolveBackup(resource, contents, meta, expectNoMeta) {
            await doTestResolveBackup(toUntypedWorkingCopyId(resource), contents, meta, expectNoMeta);
            await doTestResolveBackup(toTypedWorkingCopyId(resource), contents, meta, expectNoMeta);
        }
        async function doTestResolveBackup(identifier, contents, meta, expectNoMeta) {
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString(contents)), 1, meta);
            const backup = await service.resolve(identifier);
            assert.ok(backup);
            assert.strictEqual(contents, (await streamToBuffer(backup.value)).toString());
            if (expectNoMeta || !meta) {
                assert.strictEqual(backup.meta, undefined);
            }
            else {
                assert.ok(backup.meta);
                assert.strictEqual(backup.meta.etag, meta.etag);
                assert.strictEqual(backup.meta.size, meta.size);
                assert.strictEqual(backup.meta.mtime, meta.mtime);
                assert.strictEqual(backup.meta.orphaned, meta.orphaned);
                assert.strictEqual(Object.keys(meta).length, Object.keys(backup.meta).length);
            }
        }
        test('should restore the original contents (text file with broken metadata)', async () => {
            await testShouldRestoreOriginalContentsWithBrokenBackup(toUntypedWorkingCopyId(fooFile));
            await testShouldRestoreOriginalContentsWithBrokenBackup(toTypedWorkingCopyId(fooFile));
        });
        async function testShouldRestoreOriginalContentsWithBrokenBackup(identifier) {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur '
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString(contents)), 1, meta);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const fileContents = (await fileService.readFile(backupPath)).value.toString();
            assert.strictEqual(fileContents.indexOf(identifier.resource.toString()), 0);
            const metaIndex = fileContents.indexOf('{');
            const newFileContents = fileContents.substring(0, metaIndex) + '{{' + fileContents.substr(metaIndex);
            await fileService.writeFile(backupPath, VSBuffer.fromString(newFileContents));
            const backup = await service.resolve(identifier);
            assert.ok(backup);
            assert.strictEqual(contents, (await streamToBuffer(backup.value)).toString());
            assert.strictEqual(backup.meta, undefined);
        }
        test('should update metadata from file into model when resolving', async () => {
            await testShouldUpdateMetaFromFileWhenResolving(toUntypedWorkingCopyId(fooFile));
            await testShouldUpdateMetaFromFileWhenResolving(toTypedWorkingCopyId(fooFile));
        });
        async function testShouldUpdateMetaFromFileWhenResolving(identifier) {
            const contents = 'Foo Bar';
            const meta = {
                etag: 'theEtagForThisMetadataTest',
                size: 888,
                mtime: Date.now(),
                orphaned: false
            };
            const updatedMeta = {
                ...meta,
                etag: meta.etag + meta.etag
            };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString(contents)), 1, meta);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            // Simulate the condition of the backups model loading initially without
            // meta data information and then getting the meta data updated on the
            // first call to resolve the backup. We simulate this by explicitly changing
            // the meta data in the file and then verifying that the updated meta data
            // is persisted back into the model (verified via `hasBackupSync`).
            // This is not really something that would happen in real life because any
            // backup that is made via backup service will update the model accordingly.
            const originalFileContents = (await fileService.readFile(backupPath)).value.toString();
            await fileService.writeFile(backupPath, VSBuffer.fromString(originalFileContents.replace(meta.etag, updatedMeta.etag)));
            await service.resolve(identifier);
            assert.strictEqual(service.hasBackupSync(identifier, undefined, meta), false);
            assert.strictEqual(service.hasBackupSync(identifier, undefined, updatedMeta), true);
            await fileService.writeFile(backupPath, VSBuffer.fromString(originalFileContents));
            await service.getBackups();
            assert.strictEqual(service.hasBackupSync(identifier, undefined, meta), true);
            assert.strictEqual(service.hasBackupSync(identifier, undefined, updatedMeta), false);
        }
        test('should ignore invalid backups (empty file)', async () => {
            const contents = 'test\nand more stuff';
            await service.backup(toUntypedWorkingCopyId(fooFile), bufferToReadable(VSBuffer.fromString(contents)), 1);
            let backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(backup);
            await service.testGetFileService().writeFile(service.toBackupResource(toUntypedWorkingCopyId(fooFile)), VSBuffer.fromString(''));
            backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(!backup);
        });
        test('should ignore invalid backups (no preamble)', async () => {
            const contents = 'testand more stuff';
            await service.backup(toUntypedWorkingCopyId(fooFile), bufferToReadable(VSBuffer.fromString(contents)), 1);
            let backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(backup);
            await service.testGetFileService().writeFile(service.toBackupResource(toUntypedWorkingCopyId(fooFile)), VSBuffer.fromString(contents));
            backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(!backup);
        });
        test('file with binary data', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const buffer = Uint8Array.from([
                137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 73, 0, 0, 0, 67, 8, 2, 0, 0, 0, 95, 138, 191, 237, 0, 0, 0, 1, 115, 82, 71, 66, 0, 174, 206, 28, 233, 0, 0, 0, 4, 103, 65, 77, 65, 0, 0, 177, 143, 11, 252, 97, 5, 0, 0, 0, 9, 112, 72, 89, 115, 0, 0, 14, 195, 0, 0, 14, 195, 1, 199, 111, 168, 100, 0, 0, 0, 71, 116, 69, 88, 116, 83, 111, 117, 114, 99, 101, 0, 83, 104, 111, 116, 116, 121, 32, 118, 50, 46, 48, 46, 50, 46, 50, 49, 54, 32, 40, 67, 41, 32, 84, 104, 111, 109, 97, 115, 32, 66, 97, 117, 109, 97, 110, 110, 32, 45, 32, 104, 116, 116, 112, 58, 47, 47, 115, 104, 111, 116, 116, 121, 46, 100, 101, 118, 115, 45, 111, 110, 46, 110, 101, 116, 44, 132, 21, 213, 0, 0, 0, 84, 73, 68, 65, 84, 120, 218, 237, 207, 65, 17, 0, 0, 12, 2, 32, 211, 217, 63, 146, 37, 246, 218, 65, 3, 210, 191, 226, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 118, 100, 169, 4, 173, 8, 44, 248, 184, 40, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
            ]);
            await service.backup(identifier, bufferToReadable(VSBuffer.wrap(buffer)), undefined, { binaryTest: 'true' });
            const backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(backup);
            const backupBuffer = await consumeStream(backup.value, chunks => VSBuffer.concat(chunks));
            assert.strictEqual(backupBuffer.buffer.byteLength, buffer.byteLength);
        });
    });
    suite('WorkingCopyBackupsModel', () => {
        test('simple', async () => {
            const model = await WorkingCopyBackupsModel.create(workspaceBackupPath, service.testGetFileService());
            const resource1 = URI.file('test.html');
            assert.strictEqual(model.has(resource1), false);
            model.add(resource1);
            assert.strictEqual(model.has(resource1), true);
            assert.strictEqual(model.has(resource1, 0), true);
            assert.strictEqual(model.has(resource1, 1), false);
            assert.strictEqual(model.has(resource1, 1, { foo: 'bar' }), false);
            model.remove(resource1);
            assert.strictEqual(model.has(resource1), false);
            model.add(resource1);
            assert.strictEqual(model.has(resource1), true);
            assert.strictEqual(model.has(resource1, 0), true);
            assert.strictEqual(model.has(resource1, 1), false);
            model.clear();
            assert.strictEqual(model.has(resource1), false);
            model.add(resource1, 1);
            assert.strictEqual(model.has(resource1), true);
            assert.strictEqual(model.has(resource1, 0), false);
            assert.strictEqual(model.has(resource1, 1), true);
            const resource2 = URI.file('test1.html');
            const resource3 = URI.file('test2.html');
            const resource4 = URI.file('test3.html');
            model.add(resource2);
            model.add(resource3);
            model.add(resource4, undefined, { foo: 'bar' });
            assert.strictEqual(model.has(resource1), true);
            assert.strictEqual(model.has(resource2), true);
            assert.strictEqual(model.has(resource3), true);
            assert.strictEqual(model.has(resource4), true);
            assert.strictEqual(model.has(resource4, undefined, { foo: 'bar' }), true);
            assert.strictEqual(model.has(resource4, undefined, { bar: 'foo' }), false);
            model.update(resource4, { foo: 'nothing' });
            assert.strictEqual(model.has(resource4, undefined, { foo: 'nothing' }), true);
            assert.strictEqual(model.has(resource4, undefined, { foo: 'bar' }), false);
            model.update(resource4);
            assert.strictEqual(model.has(resource4), true);
            assert.strictEqual(model.has(resource4, undefined, { foo: 'nothing' }), false);
        });
        test('create', async () => {
            const fooBackupPath = joinPath(workspaceBackupPath, fooFile.scheme, hashIdentifier(toUntypedWorkingCopyId(fooFile)));
            await fileService.createFolder(dirname(fooBackupPath));
            await fileService.writeFile(fooBackupPath, VSBuffer.fromString('foo'));
            const model = await WorkingCopyBackupsModel.create(workspaceBackupPath, service.testGetFileService());
            assert.strictEqual(model.has(fooBackupPath), true);
        });
        test('get', async () => {
            const model = await WorkingCopyBackupsModel.create(workspaceBackupPath, service.testGetFileService());
            assert.deepStrictEqual(model.get(), []);
            const file1 = URI.file('/root/file/foo.html');
            const file2 = URI.file('/root/file/bar.html');
            const untitled = URI.file('/root/untitled/bar.html');
            model.add(file1);
            model.add(file2);
            model.add(untitled);
            assert.deepStrictEqual(model.get().map(f => f.fsPath), [file1.fsPath, file2.fsPath, untitled.fsPath]);
        });
    });
    suite('typeId migration', () => {
        test('works (when meta is missing)', async () => {
            const fooBackupId = toUntypedWorkingCopyId(fooFile);
            const untitledBackupId = toUntypedWorkingCopyId(untitledFile);
            const customBackupId = toUntypedWorkingCopyId(customFile);
            const fooBackupPath = joinPath(workspaceBackupPath, fooFile.scheme, hashIdentifier(fooBackupId));
            const untitledBackupPath = joinPath(workspaceBackupPath, untitledFile.scheme, hashIdentifier(untitledBackupId));
            const customFileBackupPath = joinPath(workspaceBackupPath, customFile.scheme, hashIdentifier(customBackupId));
            // Prepare backups of the old format without meta
            await fileService.createFolder(joinPath(workspaceBackupPath, fooFile.scheme));
            await fileService.createFolder(joinPath(workspaceBackupPath, untitledFile.scheme));
            await fileService.createFolder(joinPath(workspaceBackupPath, customFile.scheme));
            await fileService.writeFile(fooBackupPath, VSBuffer.fromString(`${fooFile.toString()}\ntest file`));
            await fileService.writeFile(untitledBackupPath, VSBuffer.fromString(`${untitledFile.toString()}\ntest untitled`));
            await fileService.writeFile(customFileBackupPath, VSBuffer.fromString(`${customFile.toString()}\ntest custom`));
            service.reinitialize(workspaceBackupPath);
            const backups = await service.getBackups();
            assert.strictEqual(backups.length, 3);
            assert.ok(backups.some(backup => isEqual(backup.resource, fooFile)));
            assert.ok(backups.some(backup => isEqual(backup.resource, untitledFile)));
            assert.ok(backups.some(backup => isEqual(backup.resource, customFile)));
            assert.ok(backups.every(backup => backup.typeId === ''));
        });
        test('works (when typeId in meta is missing)', async () => {
            const fooBackupId = toUntypedWorkingCopyId(fooFile);
            const untitledBackupId = toUntypedWorkingCopyId(untitledFile);
            const customBackupId = toUntypedWorkingCopyId(customFile);
            const fooBackupPath = joinPath(workspaceBackupPath, fooFile.scheme, hashIdentifier(fooBackupId));
            const untitledBackupPath = joinPath(workspaceBackupPath, untitledFile.scheme, hashIdentifier(untitledBackupId));
            const customFileBackupPath = joinPath(workspaceBackupPath, customFile.scheme, hashIdentifier(customBackupId));
            // Prepare backups of the old format without meta
            await fileService.createFolder(joinPath(workspaceBackupPath, fooFile.scheme));
            await fileService.createFolder(joinPath(workspaceBackupPath, untitledFile.scheme));
            await fileService.createFolder(joinPath(workspaceBackupPath, customFile.scheme));
            await fileService.writeFile(fooBackupPath, VSBuffer.fromString(`${fooFile.toString()} ${JSON.stringify({ foo: 'bar' })}\ntest file`));
            await fileService.writeFile(untitledBackupPath, VSBuffer.fromString(`${untitledFile.toString()} ${JSON.stringify({ foo: 'bar' })}\ntest untitled`));
            await fileService.writeFile(customFileBackupPath, VSBuffer.fromString(`${customFile.toString()} ${JSON.stringify({ foo: 'bar' })}\ntest custom`));
            service.reinitialize(workspaceBackupPath);
            const backups = await service.getBackups();
            assert.strictEqual(backups.length, 3);
            assert.ok(backups.some(backup => isEqual(backup.resource, fooFile)));
            assert.ok(backups.some(backup => isEqual(backup.resource, untitledFile)));
            assert.ok(backups.some(backup => isEqual(backup.resource, customFile)));
            assert.ok(backups.every(backup => backup.typeId === ''));
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5QmFja3VwU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVD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QUFTLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFM0csTUFBTSxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVqRSxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDckcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRWxFLFVBQVUsR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDakcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRWpFLFVBQVUsR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDakcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRWpFLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLE1B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QUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUc7YUFDMXBDLENBQUMsQ0FBQztZQUVILE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRTdHLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbEIsTUFBTSxZQUFZLEdBQUcsTUFBTSxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMxRixNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUVyQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7WUFFdEcsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUV4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVyQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFbkUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVyQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRW5ELEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUVkLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVoRCxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FB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