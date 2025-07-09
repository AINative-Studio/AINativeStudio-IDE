/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { dirname, isEqual, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { AbstractNativeEnvironmentService } from '../../../environment/common/environmentService.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { FileUserDataProvider } from '../../common/fileUserDataProvider.js';
import { UserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class TestEnvironmentService extends AbstractNativeEnvironmentService {
    constructor(_appSettingsHome) {
        super(Object.create(null), Object.create(null), { _serviceBrand: undefined, ...product });
        this._appSettingsHome = _appSettingsHome;
    }
    get userRoamingDataHome() { return this._appSettingsHome.with({ scheme: Schemas.vscodeUserData }); }
    get cacheHome() { return this.userRoamingDataHome; }
}
suite('FileUserDataProvider', () => {
    let testObject;
    let userDataHomeOnDisk;
    let backupWorkspaceHomeOnDisk;
    let environmentService;
    let userDataProfilesService;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let fileUserDataProvider;
    setup(async () => {
        const logService = new NullLogService();
        testObject = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(testObject.registerProvider(ROOT.scheme, fileSystemProvider));
        userDataHomeOnDisk = joinPath(ROOT, 'User');
        const backupHome = joinPath(ROOT, 'Backups');
        backupWorkspaceHomeOnDisk = joinPath(backupHome, 'workspaceId');
        await testObject.createFolder(userDataHomeOnDisk);
        await testObject.createFolder(backupWorkspaceHomeOnDisk);
        environmentService = new TestEnvironmentService(userDataHomeOnDisk);
        const uriIdentityService = disposables.add(new UriIdentityService(testObject));
        userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, testObject, uriIdentityService, logService));
        fileUserDataProvider = disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        disposables.add(fileUserDataProvider);
        disposables.add(testObject.registerProvider(Schemas.vscodeUserData, fileUserDataProvider));
    });
    test('exists return false when file does not exist', async () => {
        const exists = await testObject.exists(userDataProfilesService.defaultProfile.settingsResource);
        assert.strictEqual(exists, false);
    });
    test('read file throws error if not exist', async () => {
        try {
            await testObject.readFile(userDataProfilesService.defaultProfile.settingsResource);
            assert.fail('Should fail since file does not exist');
        }
        catch (e) { }
    });
    test('read existing file', async () => {
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString('{}'));
        const result = await testObject.readFile(userDataProfilesService.defaultProfile.settingsResource);
        assert.strictEqual(result.value.toString(), '{}');
    });
    test('create file', async () => {
        const resource = userDataProfilesService.defaultProfile.settingsResource;
        const actual1 = await testObject.createFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{}');
    });
    test('write file creates the file if not exist', async () => {
        const resource = userDataProfilesService.defaultProfile.settingsResource;
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{}');
    });
    test('write to existing file', async () => {
        const resource = userDataProfilesService.defaultProfile.settingsResource;
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString('{}'));
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{a:1}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{a:1}');
    });
    test('delete file', async () => {
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString(''));
        await testObject.del(userDataProfilesService.defaultProfile.settingsResource);
        const result = await testObject.exists(joinPath(userDataHomeOnDisk, 'settings.json'));
        assert.strictEqual(false, result);
    });
    test('resolve file', async () => {
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString(''));
        const result = await testObject.resolve(userDataProfilesService.defaultProfile.settingsResource);
        assert.ok(!result.isDirectory);
        assert.ok(result.children === undefined);
    });
    test('exists return false for folder that does not exist', async () => {
        const exists = await testObject.exists(userDataProfilesService.defaultProfile.snippetsHome);
        assert.strictEqual(exists, false);
    });
    test('exists return true for folder that exists', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        const exists = await testObject.exists(userDataProfilesService.defaultProfile.snippetsHome);
        assert.strictEqual(exists, true);
    });
    test('read file throws error for folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        try {
            await testObject.readFile(userDataProfilesService.defaultProfile.snippetsHome);
            assert.fail('Should fail since read file is not supported for folders');
        }
        catch (e) { }
    });
    test('read file under folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual = await testObject.readFile(resource);
        assert.strictEqual(actual.resource.toString(), resource.toString());
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('read file under sub folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets', 'java'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'java', 'settings.json'), VSBuffer.fromString('{}'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'java/settings.json');
        const actual = await testObject.readFile(resource);
        assert.strictEqual(actual.resource.toString(), resource.toString());
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('create file under folder that exists', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.createFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{}');
    });
    test('create file under folder that does not exist', async () => {
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.createFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{}');
    });
    test('write to not existing file under container that exists', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('write to not existing file under container that does not exists', async () => {
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('write to existing file under container', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{a:1}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual.value.toString(), '{a:1}');
    });
    test('write file under sub container', async () => {
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'java/settings.json');
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'java', 'settings.json'));
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('delete throws error for folder that does not exist', async () => {
        try {
            await testObject.del(userDataProfilesService.defaultProfile.snippetsHome);
            assert.fail('Should fail the folder does not exist');
        }
        catch (e) { }
    });
    test('delete not existing file under container that exists', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        try {
            await testObject.del(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json'));
            assert.fail('Should fail since file does not exist');
        }
        catch (e) { }
    });
    test('delete not existing file under container that does not exists', async () => {
        try {
            await testObject.del(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json'));
            assert.fail('Should fail since file does not exist');
        }
        catch (e) { }
    });
    test('delete existing file under folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
        await testObject.del(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json'));
        const exists = await testObject.exists(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(exists, false);
    });
    test('resolve folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
        const result = await testObject.resolve(userDataProfilesService.defaultProfile.snippetsHome);
        assert.ok(result.isDirectory);
        assert.ok(result.children !== undefined);
        assert.strictEqual(result.children.length, 1);
        assert.strictEqual(result.children[0].resource.toString(), joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json').toString());
    });
    test('read backup file', async () => {
        await testObject.writeFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'), VSBuffer.fromString('{}'));
        const result = await testObject.readFile(joinPath(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }), `backup.json`));
        assert.strictEqual(result.value.toString(), '{}');
    });
    test('create backup file', async () => {
        await testObject.createFile(joinPath(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }), `backup.json`), VSBuffer.fromString('{}'));
        const result = await testObject.readFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'));
        assert.strictEqual(result.value.toString(), '{}');
    });
    test('write backup file', async () => {
        await testObject.writeFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'), VSBuffer.fromString('{}'));
        await testObject.writeFile(joinPath(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }), `backup.json`), VSBuffer.fromString('{a:1}'));
        const result = await testObject.readFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'));
        assert.strictEqual(result.value.toString(), '{a:1}');
    });
    test('resolve backups folder', async () => {
        await testObject.writeFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'), VSBuffer.fromString('{}'));
        const result = await testObject.resolve(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }));
        assert.ok(result.isDirectory);
        assert.ok(result.children !== undefined);
        assert.strictEqual(result.children.length, 1);
        assert.strictEqual(result.children[0].resource.toString(), joinPath(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }), `backup.json`).toString());
    });
});
class TestFileSystemProvider {
    constructor(onDidChangeFile) {
        this.onDidChangeFile = onDidChangeFile;
        this.capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
    }
    watch() { return Disposable.None; }
    stat() { throw new Error('Not Supported'); }
    mkdir(resource) { throw new Error('Not Supported'); }
    rename() { throw new Error('Not Supported'); }
    readFile(resource) { throw new Error('Not Supported'); }
    readdir(resource) { throw new Error('Not Supported'); }
    writeFile() { throw new Error('Not Supported'); }
    delete() { throw new Error('Not Supported'); }
    open(resource, opts) { throw new Error('Not Supported'); }
    close(fd) { throw new Error('Not Supported'); }
    read(fd, pos, data, offset, length) { throw new Error('Not Supported'); }
    write(fd, pos, data, offset, length) { throw new Error('Not Supported'); }
    readFileStream(resource, opts, token) { throw new Error('Method not implemented.'); }
}
suite('FileUserDataProvider - Watching', () => {
    let testObject;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const rootFileResource = joinPath(ROOT, 'User');
    const rootUserDataResource = rootFileResource.with({ scheme: Schemas.vscodeUserData });
    let fileEventEmitter;
    setup(() => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const environmentService = new TestEnvironmentService(rootFileResource);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        fileEventEmitter = disposables.add(new Emitter());
        testObject = disposables.add(new FileUserDataProvider(rootFileResource.scheme, new TestFileSystemProvider(fileEventEmitter.event), Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()));
    });
    test('file added change event', done => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'settings.json');
        const target = joinPath(rootFileResource, 'settings.json');
        disposables.add(testObject.onDidChangeFile(e => {
            if (isEqual(e[0].resource, expected) && e[0].type === 1 /* FileChangeType.ADDED */) {
                done();
            }
        }));
        fileEventEmitter.fire([{
                resource: target,
                type: 1 /* FileChangeType.ADDED */
            }]);
    });
    test('file updated change event', done => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'settings.json');
        const target = joinPath(rootFileResource, 'settings.json');
        disposables.add(testObject.onDidChangeFile(e => {
            if (isEqual(e[0].resource, expected) && e[0].type === 0 /* FileChangeType.UPDATED */) {
                done();
            }
        }));
        fileEventEmitter.fire([{
                resource: target,
                type: 0 /* FileChangeType.UPDATED */
            }]);
    });
    test('file deleted change event', done => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'settings.json');
        const target = joinPath(rootFileResource, 'settings.json');
        disposables.add(testObject.onDidChangeFile(e => {
            if (isEqual(e[0].resource, expected) && e[0].type === 2 /* FileChangeType.DELETED */) {
                done();
            }
        }));
        fileEventEmitter.fire([{
                resource: target,
                type: 2 /* FileChangeType.DELETED */
            }]);
    });
    test('file under folder created change event', done => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'snippets', 'settings.json');
        const target = joinPath(rootFileResource, 'snippets', 'settings.json');
        disposables.add(testObject.onDidChangeFile(e => {
            if (isEqual(e[0].resource, expected) && e[0].type === 1 /* FileChangeType.ADDED */) {
                done();
            }
        }));
        fileEventEmitter.fire([{
                resource: target,
                type: 1 /* FileChangeType.ADDED */
            }]);
    });
    test('file under folder updated change event', done => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'snippets', 'settings.json');
        const target = joinPath(rootFileResource, 'snippets', 'settings.json');
        disposables.add(testObject.onDidChangeFile(e => {
            if (isEqual(e[0].resource, expected) && e[0].type === 0 /* FileChangeType.UPDATED */) {
                done();
            }
        }));
        fileEventEmitter.fire([{
                resource: target,
                type: 0 /* FileChangeType.UPDATED */
            }]);
    });
    test('file under folder deleted change event', done => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'snippets', 'settings.json');
        const target = joinPath(rootFileResource, 'snippets', 'settings.json');
        disposables.add(testObject.onDidChangeFile(e => {
            if (isEqual(e[0].resource, expected) && e[0].type === 2 /* FileChangeType.DELETED */) {
                done();
            }
        }));
        fileEventEmitter.fire([{
                resource: target,
                type: 2 /* FileChangeType.DELETED */
            }]);
    });
    test('event is not triggered if not watched', async () => {
        const target = joinPath(rootFileResource, 'settings.json');
        let triggered = false;
        disposables.add(testObject.onDidChangeFile(() => triggered = true));
        fileEventEmitter.fire([{
                resource: target,
                type: 2 /* FileChangeType.DELETED */
            }]);
        if (triggered) {
            assert.fail('event should not be triggered');
        }
    });
    test('event is not triggered if not watched 2', async () => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const target = joinPath(dirname(rootFileResource), 'settings.json');
        let triggered = false;
        disposables.add(testObject.onDidChangeFile(() => triggered = true));
        fileEventEmitter.fire([{
                resource: target,
                type: 2 /* FileChangeType.DELETED */
            }]);
        if (triggered) {
            assert.fail('event should not be triggered');
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVVzZXJEYXRhUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YS90ZXN0L2Jyb3dzZXIvZmlsZVVzZXJEYXRhUHJvdmlkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FB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