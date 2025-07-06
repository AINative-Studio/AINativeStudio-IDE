/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { URI } from '../../../../../base/common/uri.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { Extensions as ConfigurationExtensions, keyFromOverrideIdentifiers } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { WorkspaceService } from '../../browser/configurationService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { workbenchInstantiationService, RemoteFileSystemProvider, TestEnvironmentService, TestTextFileService } from '../../../../test/browser/workbenchTestServices.js';
import { ITextFileService } from '../../../textfile/common/textfiles.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TextModelResolverService } from '../../../textmodelResolver/common/textModelResolverService.js';
import { IJSONEditingService } from '../../common/jsonEditing.js';
import { JSONEditingService } from '../../common/jsonEditingService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { joinPath, dirname, basename } from '../../../../../base/common/resources.js';
import { isLinux, isMacintosh } from '../../../../../base/common/platform.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { APPLY_ALL_PROFILES_SETTING } from '../../common/configuration.js';
import { SignService } from '../../../../../platform/sign/browser/signService.js';
import { FileUserDataProvider } from '../../../../../platform/userData/common/fileUserDataProvider.js';
import { IKeybindingEditingService, KeybindingsEditingService } from '../../../keybinding/common/keybindingEditing.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { timeout } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Event } from '../../../../../base/common/event.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { RemoteAgentService } from '../../../remote/browser/remoteAgentService.js';
import { RemoteAuthorityResolverService } from '../../../../../platform/remote/browser/remoteAuthorityResolverService.js';
import { hash } from '../../../../../base/common/hash.js';
import { TestProductService } from '../../../../test/common/workbenchTestServices.js';
import { IUserDataProfilesService, toUserDataProfile, UserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../../../../platform/policy/common/policy.js';
import { FilePolicyService } from '../../../../../platform/policy/common/filePolicyService.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../../../userDataProfile/common/userDataProfile.js';
import { RemoteSocketFactoryService } from '../../../../../platform/remote/common/remoteSocketFactoryService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
function convertToWorkspacePayload(folder) {
    return {
        id: hash(folder.toString()).toString(16),
        uri: folder
    };
}
class ConfigurationCache {
    needsCaching(resource) { return false; }
    async read() { return ''; }
    async write() { }
    async remove() { }
}
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
suite('WorkspaceContextService - Folder', () => {
    const folderName = 'Folder A';
    let folder;
    let testObject;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        folder = joinPath(ROOT, folderName);
        await fileService.createFolder(folder);
        const environmentService = TestEnvironmentService;
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        const userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, disposables.add(new RemoteAgentService(new RemoteSocketFactoryService(), userDataProfileService, environmentService, TestProductService, disposables.add(new RemoteAuthorityResolverService(false, undefined, undefined, undefined, TestProductService, logService)), new SignService(TestProductService), new NullLogService())), uriIdentityService, new NullLogService(), new NullPolicyService()));
        await testObject.initialize(convertToWorkspacePayload(folder));
    });
    test('getWorkspace()', () => {
        const actual = testObject.getWorkspace();
        assert.strictEqual(actual.folders.length, 1);
        assert.strictEqual(actual.folders[0].uri.path, folder.path);
        assert.strictEqual(actual.folders[0].name, folderName);
        assert.strictEqual(actual.folders[0].index, 0);
        assert.ok(!actual.configuration);
    });
    test('getWorkbenchState()', () => {
        const actual = testObject.getWorkbenchState();
        assert.strictEqual(actual, 2 /* WorkbenchState.FOLDER */);
    });
    test('getWorkspaceFolder()', () => {
        const actual = testObject.getWorkspaceFolder(joinPath(folder, 'a'));
        assert.strictEqual(actual, testObject.getWorkspace().folders[0]);
    });
    test('getWorkspaceFolder() - queries in workspace folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const folder = joinPath(ROOT, folderName).with({ query: 'myquery=1' });
        await fileService.createFolder(folder);
        const environmentService = TestEnvironmentService;
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        const userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        const testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, disposables.add(new RemoteAgentService(new RemoteSocketFactoryService(), userDataProfileService, environmentService, TestProductService, disposables.add(new RemoteAuthorityResolverService(false, undefined, undefined, undefined, TestProductService, logService)), new SignService(TestProductService), new NullLogService())), uriIdentityService, new NullLogService(), new NullPolicyService()));
        await testObject.initialize(convertToWorkspacePayload(folder));
        const actual = testObject.getWorkspaceFolder(joinPath(folder, 'a'));
        assert.strictEqual(actual, testObject.getWorkspace().folders[0]);
    }));
    test('getWorkspaceFolder() - queries in resource', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const folder = joinPath(ROOT, folderName);
        await fileService.createFolder(folder);
        const environmentService = TestEnvironmentService;
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        const userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        const testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, disposables.add(new RemoteAgentService(new RemoteSocketFactoryService(), userDataProfileService, environmentService, TestProductService, disposables.add(new RemoteAuthorityResolverService(false, undefined, undefined, undefined, TestProductService, logService)), new SignService(TestProductService), new NullLogService())), uriIdentityService, new NullLogService(), new NullPolicyService()));
        await testObject.initialize(convertToWorkspacePayload(folder));
        const actual = testObject.getWorkspaceFolder(joinPath(folder, 'a').with({ query: 'myquery=1' }));
        assert.strictEqual(actual, testObject.getWorkspace().folders[0]);
    }));
    test('isCurrentWorkspace() => true', () => {
        assert.ok(testObject.isCurrentWorkspace(folder));
    });
    test('isCurrentWorkspace() => false', () => {
        assert.ok(!testObject.isCurrentWorkspace(joinPath(dirname(folder), 'abc')));
    });
    test('workspace is complete', () => testObject.getCompleteWorkspace());
});
suite('WorkspaceContextService - Workspace', () => {
    let testObject;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        const folderA = joinPath(ROOT, 'a');
        const folderB = joinPath(ROOT, 'b');
        const configResource = joinPath(ROOT, 'vsctests.code-workspace');
        const workspace = { folders: [{ path: folderA.path }, { path: folderB.path }] };
        await fileService.createFolder(appSettingsHome);
        await fileService.createFolder(folderA);
        await fileService.createFolder(folderB);
        await fileService.writeFile(configResource, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const environmentService = TestEnvironmentService;
        const remoteAgentService = disposables.add(disposables.add(instantiationService.createInstance(RemoteAgentService)));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)), userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        testObject.acquireInstantiationService(instantiationService);
    });
    test('workspace folders', () => {
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 2);
        assert.strictEqual(basename(actual[0].uri), 'a');
        assert.strictEqual(basename(actual[1].uri), 'b');
    });
    test('getWorkbenchState()', () => {
        const actual = testObject.getWorkbenchState();
        assert.strictEqual(actual, 3 /* WorkbenchState.WORKSPACE */);
    });
    test('workspace is complete', () => testObject.getCompleteWorkspace());
});
suite('WorkspaceContextService - Workspace Editing', () => {
    let testObject, fileService;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        const folderA = joinPath(ROOT, 'a');
        const folderB = joinPath(ROOT, 'b');
        const configResource = joinPath(ROOT, 'vsctests.code-workspace');
        const workspace = { folders: [{ path: folderA.path }, { path: folderB.path }] };
        await fileService.createFolder(appSettingsHome);
        await fileService.createFolder(folderA);
        await fileService.createFolder(folderB);
        await fileService.writeFile(configResource, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const environmentService = TestEnvironmentService;
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)), userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        instantiationService.stub(IJSONEditingService, instantiationService.createInstance(JSONEditingService));
        testObject.acquireInstantiationService(instantiationService);
    });
    test('add folders', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.addFolders([{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }]);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 4);
        assert.strictEqual(basename(actual[0].uri), 'a');
        assert.strictEqual(basename(actual[1].uri), 'b');
        assert.strictEqual(basename(actual[2].uri), 'd');
        assert.strictEqual(basename(actual[3].uri), 'c');
    }));
    test('add folders (at specific index)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.addFolders([{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }], 0);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 4);
        assert.strictEqual(basename(actual[0].uri), 'd');
        assert.strictEqual(basename(actual[1].uri), 'c');
        assert.strictEqual(basename(actual[2].uri), 'a');
        assert.strictEqual(basename(actual[3].uri), 'b');
    }));
    test('add folders (at specific wrong index)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.addFolders([{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }], 10);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 4);
        assert.strictEqual(basename(actual[0].uri), 'a');
        assert.strictEqual(basename(actual[1].uri), 'b');
        assert.strictEqual(basename(actual[2].uri), 'd');
        assert.strictEqual(basename(actual[3].uri), 'c');
    }));
    test('add folders (with name)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.addFolders([{ uri: joinPath(ROOT, 'd'), name: 'DDD' }, { uri: joinPath(ROOT, 'c'), name: 'CCC' }]);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 4);
        assert.strictEqual(basename(actual[0].uri), 'a');
        assert.strictEqual(basename(actual[1].uri), 'b');
        assert.strictEqual(basename(actual[2].uri), 'd');
        assert.strictEqual(basename(actual[3].uri), 'c');
        assert.strictEqual(actual[2].name, 'DDD');
        assert.strictEqual(actual[3].name, 'CCC');
    }));
    test('add folders triggers change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const addedFolders = [{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }];
        await testObject.addFolders(addedFolders);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added.map(r => r.uri.toString()), addedFolders.map(a => a.uri.toString()));
        assert.deepStrictEqual(actual_1.removed, []);
        assert.deepStrictEqual(actual_1.changed, []);
    }));
    test('remove folders', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.removeFolders([testObject.getWorkspace().folders[0].uri]);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(basename(actual[0].uri), 'b');
    }));
    test('remove folders triggers change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const removedFolder = testObject.getWorkspace().folders[0];
        await testObject.removeFolders([removedFolder.uri]);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added, []);
        assert.deepStrictEqual(actual_1.removed.map(r => r.uri.toString()), [removedFolder.uri.toString()]);
        assert.deepStrictEqual(actual_1.changed.map(c => c.uri.toString()), [testObject.getWorkspace().folders[0].uri.toString()]);
    }));
    test('remove folders and add them back by writing into the file', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const folders = testObject.getWorkspace().folders;
        await testObject.removeFolders([folders[0].uri]);
        const promise = new Promise((resolve, reject) => {
            disposables.add(testObject.onDidChangeWorkspaceFolders(actual => {
                try {
                    assert.deepStrictEqual(actual.added.map(r => r.uri.toString()), [folders[0].uri.toString()]);
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
        const workspace = { folders: [{ path: folders[0].uri.path }, { path: folders[1].uri.path }] };
        await fileService.writeFile(testObject.getWorkspace().configuration, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        await promise;
    }));
    test('update folders (remove last and add to end)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const addedFolders = [{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }];
        const removedFolders = [testObject.getWorkspace().folders[1]].map(f => f.uri);
        await testObject.updateFolders(addedFolders, removedFolders);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added.map(r => r.uri.toString()), addedFolders.map(a => a.uri.toString()));
        assert.deepStrictEqual(actual_1.removed.map(r_1 => r_1.uri.toString()), removedFolders.map(a_1 => a_1.toString()));
        assert.deepStrictEqual(actual_1.changed, []);
    }));
    test('update folders (rename first via add and remove)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const addedFolders = [{ uri: joinPath(ROOT, 'a'), name: 'The Folder' }];
        const removedFolders = [testObject.getWorkspace().folders[0]].map(f => f.uri);
        await testObject.updateFolders(addedFolders, removedFolders, 0);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added, []);
        assert.deepStrictEqual(actual_1.removed, []);
        assert.deepStrictEqual(actual_1.changed.map(r => r.uri.toString()), removedFolders.map(a => a.toString()));
    }));
    test('update folders (remove first and add to end)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const addedFolders = [{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }];
        const removedFolders = [testObject.getWorkspace().folders[0]].map(f => f.uri);
        const changedFolders = [testObject.getWorkspace().folders[1]].map(f => f.uri);
        await testObject.updateFolders(addedFolders, removedFolders);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added.map(r => r.uri.toString()), addedFolders.map(a => a.uri.toString()));
        assert.deepStrictEqual(actual_1.removed.map(r_1 => r_1.uri.toString()), removedFolders.map(a_1 => a_1.toString()));
        assert.deepStrictEqual(actual_1.changed.map(r_2 => r_2.uri.toString()), changedFolders.map(a_2 => a_2.toString()));
    }));
    test('reorder folders trigger change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const workspace = { folders: [{ path: testObject.getWorkspace().folders[1].uri.path }, { path: testObject.getWorkspace().folders[0].uri.path }] };
        await fileService.writeFile(testObject.getWorkspace().configuration, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        await testObject.reloadConfiguration();
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added, []);
        assert.deepStrictEqual(actual_1.removed, []);
        assert.deepStrictEqual(actual_1.changed.map(c => c.uri.toString()), testObject.getWorkspace().folders.map(f => f.uri.toString()).reverse());
    }));
    test('rename folders trigger change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const workspace = { folders: [{ path: testObject.getWorkspace().folders[0].uri.path, name: '1' }, { path: testObject.getWorkspace().folders[1].uri.path }] };
        fileService.writeFile(testObject.getWorkspace().configuration, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        await testObject.reloadConfiguration();
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added, []);
        assert.deepStrictEqual(actual_1.removed, []);
        assert.deepStrictEqual(actual_1.changed.map(c => c.uri.toString()), [testObject.getWorkspace().folders[0].uri.toString()]);
    }));
});
suite('WorkspaceService - Initialization', () => {
    let configResource, testObject, fileService, environmentService, userDataProfileService;
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'initialization.testSetting1': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */
                },
                'initialization.testSetting2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */
                }
            }
        });
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        const folderA = joinPath(ROOT, 'a');
        const folderB = joinPath(ROOT, 'b');
        configResource = joinPath(ROOT, 'vsctests.code-workspace');
        const workspace = { folders: [{ path: folderA.path }, { path: folderB.path }] };
        await fileService.createFolder(appSettingsHome);
        await fileService.createFolder(folderA);
        await fileService.createFolder(folderB);
        await fileService.writeFile(configResource, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await testObject.initialize({ id: '' });
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        testObject.acquireInstantiationService(instantiationService);
    });
    (isMacintosh ? test.skip : test)('initialize a folder workspace from an empty workspace with no configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        const folder = joinPath(ROOT, 'a');
        await testObject.initialize(convertToWorkspacePayload(folder));
        assert.strictEqual(testObject.getValue('initialization.testSetting1'), 'userValue');
        assert.strictEqual(target.callCount, 4);
        assert.deepStrictEqual(target.args[0], [2 /* WorkbenchState.FOLDER */]);
        assert.deepStrictEqual(target.args[1], [undefined]);
        assert.deepStrictEqual(target.args[3][0].added.map(f => f.uri.toString()), [folder.toString()]);
        assert.deepStrictEqual(target.args[3][0].removed, []);
        assert.deepStrictEqual(target.args[3][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a folder workspace from an empty workspace with configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        const folder = joinPath(ROOT, 'a');
        await fileService.writeFile(joinPath(folder, '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting1": "workspaceValue" }'));
        await testObject.initialize(convertToWorkspacePayload(folder));
        assert.strictEqual(testObject.getValue('initialization.testSetting1'), 'workspaceValue');
        assert.strictEqual(target.callCount, 5);
        assert.deepStrictEqual([...target.args[0][0].affectedKeys], ['initialization.testSetting1']);
        assert.deepStrictEqual(target.args[1], [2 /* WorkbenchState.FOLDER */]);
        assert.deepStrictEqual(target.args[2], [undefined]);
        assert.deepStrictEqual(target.args[4][0].added.map(f => f.uri.toString()), [folder.toString()]);
        assert.deepStrictEqual(target.args[4][0].removed, []);
        assert.deepStrictEqual(target.args[4][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a multi root workspace from an empty workspace with no configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        assert.strictEqual(target.callCount, 4);
        assert.deepStrictEqual(target.args[0], [3 /* WorkbenchState.WORKSPACE */]);
        assert.deepStrictEqual(target.args[1], [undefined]);
        assert.deepStrictEqual(target.args[3][0].added.map(folder => folder.uri.toString()), [joinPath(ROOT, 'a').toString(), joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[3][0].removed, []);
        assert.deepStrictEqual(target.args[3][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a multi root workspace from an empty workspace with configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await fileService.writeFile(joinPath(ROOT, 'a', '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting1": "workspaceValue1" }'));
        await fileService.writeFile(joinPath(ROOT, 'b', '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting2": "workspaceValue2" }'));
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        assert.strictEqual(target.callCount, 5);
        assert.deepStrictEqual([...target.args[0][0].affectedKeys], ['initialization.testSetting1', 'initialization.testSetting2']);
        assert.deepStrictEqual(target.args[1], [3 /* WorkbenchState.WORKSPACE */]);
        assert.deepStrictEqual(target.args[2], [undefined]);
        assert.deepStrictEqual(target.args[4][0].added.map(folder => folder.uri.toString()), [joinPath(ROOT, 'a').toString(), joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[4][0].removed, []);
        assert.deepStrictEqual(target.args[4][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a folder workspace from a folder workspace with no configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'a')));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'b')));
        assert.strictEqual(testObject.getValue('initialization.testSetting1'), 'userValue');
        assert.strictEqual(target.callCount, 2);
        assert.deepStrictEqual(target.args[1][0].added.map(folder_1 => folder_1.uri.toString()), [joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[1][0].removed.map(folder_2 => folder_2.uri.toString()), [joinPath(ROOT, 'a').toString()]);
        assert.deepStrictEqual(target.args[1][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a folder workspace from a folder workspace with configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'a')));
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await fileService.writeFile(joinPath(ROOT, 'b', '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting1": "workspaceValue2" }'));
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'b')));
        assert.strictEqual(testObject.getValue('initialization.testSetting1'), 'workspaceValue2');
        assert.strictEqual(target.callCount, 3);
        assert.deepStrictEqual([...target.args[0][0].affectedKeys], ['initialization.testSetting1']);
        assert.deepStrictEqual(target.args[2][0].added.map(folder_1 => folder_1.uri.toString()), [joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[2][0].removed.map(folder_2 => folder_2.uri.toString()), [joinPath(ROOT, 'a').toString()]);
        assert.deepStrictEqual(target.args[2][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a multi folder workspace from a folder workspacce triggers change events in the right order', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'a')));
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await fileService.writeFile(joinPath(ROOT, 'a', '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting1": "workspaceValue2" }'));
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        assert.strictEqual(target.callCount, 5);
        assert.deepStrictEqual([...target.args[0][0].affectedKeys], ['initialization.testSetting1']);
        assert.deepStrictEqual(target.args[1], [3 /* WorkbenchState.WORKSPACE */]);
        assert.deepStrictEqual(target.args[2], [undefined]);
        assert.deepStrictEqual(target.args[4][0].added.map(folder_1 => folder_1.uri.toString()), [joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[4][0].removed, []);
        assert.deepStrictEqual(target.args[4][0].changed, []);
    }));
});
suite('WorkspaceConfigurationService - Folder', () => {
    let testObject, workspaceService, fileService, environmentService, userDataProfileService, instantiationService;
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.applicationSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'configurationService.folder.machineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                },
                'configurationService.folder.applicationMachineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */
                },
                'configurationService.folder.machineOverridableSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */
                },
                'configurationService.folder.testSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */
                },
                'configurationService.folder.languageSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
                },
                'configurationService.folder.restrictedSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    restricted: true
                },
                'configurationService.folder.policySetting': {
                    'type': 'string',
                    'default': 'isSet',
                    policy: {
                        name: 'configurationService.folder.policySetting',
                        minimumVersion: '1.0.0',
                    }
                },
                'configurationService.folder.policyObjectSetting': {
                    'type': 'object',
                    'default': {},
                    policy: {
                        name: 'configurationService.folder.policyObjectSetting',
                        minimumVersion: '1.0.0',
                    }
                },
            }
        });
        configurationRegistry.registerDefaultConfigurations([{
                overrides: {
                    '[jsonc]': {
                        'configurationService.folder.languageSetting': 'languageValue'
                    }
                }
            }]);
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const folder = joinPath(ROOT, 'a');
        await fileService.createFolder(folder);
        instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        environmentService.policyFile = joinPath(folder, 'policies.json');
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        workspaceService = testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), disposables.add(new FilePolicyService(environmentService.policyFile, fileService, logService))));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await workspaceService.initialize(convertToWorkspacePayload(folder));
        instantiationService.stub(IKeybindingEditingService, disposables.add(instantiationService.createInstance(KeybindingsEditingService)));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        workspaceService.acquireInstantiationService(instantiationService);
    });
    test('defaults', () => {
        assert.deepStrictEqual(testObject.getValue('configurationService'), {
            'folder': {
                'applicationSetting': 'isSet',
                'machineSetting': 'isSet',
                'applicationMachineSetting': 'isSet',
                'machineOverridableSetting': 'isSet',
                'testSetting': 'isSet',
                'languageSetting': 'isSet',
                'restrictedSetting': 'isSet',
                'policySetting': 'isSet',
                'policyObjectSetting': {}
            }
        });
    });
    test('globals override defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'userValue');
    }));
    test('globals', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "testworkbench.editor.tabs": true }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('testworkbench.editor.tabs'), true);
    }));
    test('workspace settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "testworkbench.editor.icons": true }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('testworkbench.editor.icons'), true);
    }));
    test('workspace settings override user settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'workspaceValue');
    }));
    test('machine overridable settings override user Settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineOverridableSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineOverridableSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineOverridableSetting'), 'workspaceValue');
    }));
    test('workspace settings override user settings after defaults are registered ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.newSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.newSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.newSetting': {
                    'type': 'string',
                    'default': 'isSet'
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.newSetting'), 'workspaceValue');
    }));
    test('machine overridable settings override user settings after defaults are registered ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.newMachineOverridableSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.newMachineOverridableSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.newMachineOverridableSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.newMachineOverridableSetting'), 'workspaceValue');
    }));
    test('application settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting'), 'userValue');
    }));
    test('application settings are not read from workspace when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('machine settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('machine settings are not read from workspace when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('application machine overridable settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting'), 'userValue');
    }));
    test('application machine overridable settings are not read from workspace when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('get application scope settings are loaded after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationSetting-2": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationSetting-2": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-2'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.applicationSetting-2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-2'), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-2'), 'userValue');
    }));
    test('get application scope settings are not loaded after defaults are registered when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationSetting-3": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationSetting-3": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.applicationSetting-3': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('get application machine overridable scope settings are loaded after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting-2": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting-2": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-2'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.applicationMachineSetting-2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-2'), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-2'), 'userValue');
    }));
    test('get application machine overridable scope settings are loaded after defaults are registered when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting-3": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting-3": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.applicationMachineSetting-3': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('get machine scope settings are not loaded after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting-2": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineSetting-2": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-2'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.machineSetting-2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-2'), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-2'), 'userValue');
    }));
    test('get machine scope settings are not loaded after defaults are registered when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting-3": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineSetting-3": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.folder.machineSetting-3': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-3', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('policy value override all', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const result = await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(environmentService.policyFile, VSBuffer.fromString('{ "configurationService.folder.policySetting": "policyValue" }'));
            return promise;
        });
        assert.deepStrictEqual([...result.affectedKeys], ['configurationService.folder.policySetting']);
        assert.strictEqual(testObject.getValue('configurationService.folder.policySetting'), 'policyValue');
        assert.strictEqual(testObject.inspect('configurationService.folder.policySetting').policyValue, 'policyValue');
    }));
    test('policy settings when policy value is not set', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.policySetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.policySetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.policySetting'), 'workspaceValue');
        assert.strictEqual(testObject.inspect('configurationService.folder.policySetting').policyValue, undefined);
    }));
    test('policy value override all for object type setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(environmentService.policyFile, VSBuffer.fromString('{ "configurationService.folder.policyObjectSetting": {"a": true} }'));
            return promise;
        });
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.policyObjectSetting": {"b": true} }'));
        await testObject.reloadConfiguration();
        assert.deepStrictEqual(testObject.getValue('configurationService.folder.policyObjectSetting'), { a: true });
    }));
    test('reload configuration emits events after global configuraiton changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "testworkbench.editor.tabs": true }'));
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.reloadConfiguration();
        assert.ok(target.called);
    }));
    test('reload configuration emits events after workspace configuraiton changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.reloadConfiguration();
        assert.ok(target.called);
    }));
    test('reload configuration should not emit event if no changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "testworkbench.editor.tabs": true }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(() => { target(); }));
        await testObject.reloadConfiguration();
        assert.ok(!target.called);
    }));
    test('inspect', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        let actual = testObject.inspect('something.missing');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, undefined);
        actual = testObject.inspect('configurationService.folder.testSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'isSet');
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.testSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userValue');
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.testSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'workspaceValue');
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'tasks.json'), VSBuffer.fromString('{ "configurationService.tasks.testSetting": "tasksValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('tasks');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.deepStrictEqual(actual.userValue, {});
        assert.deepStrictEqual(actual.workspaceValue, {
            "configurationService": {
                "tasks": {
                    "testSetting": "tasksValue"
                }
            }
        });
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.deepStrictEqual(actual.value, {
            "configurationService": {
                "tasks": {
                    "testSetting": "tasksValue"
                }
            }
        });
    }));
    test('inspect restricted settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userRestrictedValue" }'));
        await testObject.reloadConfiguration();
        let actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        testObject.updateWorkspaceTrust(true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceRestrictedValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'tasks.json'), VSBuffer.fromString('{ "configurationService.tasks.testSetting": "tasksValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('tasks');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.deepStrictEqual(actual.userValue, {});
        assert.deepStrictEqual(actual.workspaceValue, {
            "configurationService": {
                "tasks": {
                    "testSetting": "tasksValue"
                }
            }
        });
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.deepStrictEqual(actual.value, {
            "configurationService": {
                "tasks": {
                    "testSetting": "tasksValue"
                }
            }
        });
        testObject.updateWorkspaceTrust(true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'workspaceRestrictedValue');
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'tasks.json'), VSBuffer.fromString('{ "configurationService.tasks.testSetting": "tasksValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('tasks');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.deepStrictEqual(actual.userValue, {});
        assert.deepStrictEqual(actual.workspaceValue, {
            "configurationService": {
                "tasks": {
                    "testSetting": "tasksValue"
                }
            }
        });
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.deepStrictEqual(actual.value, {
            "configurationService": {
                "tasks": {
                    "testSetting": "tasksValue"
                }
            }
        });
    }));
    test('inspect restricted settings after change', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userRestrictedValue" }'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceRestrictedValue" }'));
        const event = await promise;
        const actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        assert.strictEqual(event.affectsConfiguration('configurationService.folder.restrictedSetting'), true);
    }));
    test('keys', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        let actual = testObject.keys();
        assert.ok(actual.default.indexOf('configurationService.folder.testSetting') !== -1);
        assert.deepStrictEqual(actual.user, []);
        assert.deepStrictEqual(actual.workspace, []);
        assert.deepStrictEqual(actual.workspaceFolder, []);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.keys();
        assert.ok(actual.default.indexOf('configurationService.folder.testSetting') !== -1);
        assert.deepStrictEqual(actual.user, ['configurationService.folder.testSetting']);
        assert.deepStrictEqual(actual.workspace, []);
        assert.deepStrictEqual(actual.workspaceFolder, []);
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.keys();
        assert.ok(actual.default.indexOf('configurationService.folder.testSetting') !== -1);
        assert.deepStrictEqual(actual.user, ['configurationService.folder.testSetting']);
        assert.deepStrictEqual(actual.workspace, ['configurationService.folder.testSetting']);
        assert.deepStrictEqual(actual.workspaceFolder, []);
    }));
    test('update user configuration', () => {
        return testObject.updateValue('configurationService.folder.testSetting', 'value', 2 /* ConfigurationTarget.USER */)
            .then(() => assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'value'));
    });
    test('update workspace configuration', () => {
        return testObject.updateValue('tasks.service.testSetting', 'value', 5 /* ConfigurationTarget.WORKSPACE */)
            .then(() => assert.strictEqual(testObject.getValue("tasks.service.testSetting" /* TasksSchemaProperties.ServiceTestSetting */), 'value'));
    });
    test('update resource configuration', () => {
        return testObject.updateValue('configurationService.folder.testSetting', 'value', { resource: workspaceService.getWorkspace().folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */)
            .then(() => assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'value'));
    });
    test('update language configuration using configuration overrides', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.languageSetting', 'abcLangValue', { overrideIdentifier: 'abclang' });
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { overrideIdentifier: 'abclang' }), 'abcLangValue');
    }));
    test('update language configuration using configuration update overrides', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.languageSetting', 'abcLangValue', { overrideIdentifiers: ['abclang'] });
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { overrideIdentifier: 'abclang' }), 'abcLangValue');
    }));
    test('update language configuration for multiple languages', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.languageSetting', 'multiLangValue', { overrideIdentifiers: ['xyzlang', 'deflang'] }, 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { overrideIdentifier: 'deflang' }), 'multiLangValue');
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { overrideIdentifier: 'xyzlang' }), 'multiLangValue');
        assert.deepStrictEqual(testObject.getValue(keyFromOverrideIdentifiers(['deflang', 'xyzlang'])), { 'configurationService.folder.languageSetting': 'multiLangValue' });
    }));
    test('update language configuration for multiple languages when already set', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "[deflang][xyzlang]": { "configurationService.folder.languageSetting": "userValue" }}'));
        await testObject.updateValue('configurationService.folder.languageSetting', 'multiLangValue', { overrideIdentifiers: ['xyzlang', 'deflang'] }, 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { overrideIdentifier: 'deflang' }), 'multiLangValue');
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { overrideIdentifier: 'xyzlang' }), 'multiLangValue');
        assert.deepStrictEqual(testObject.getValue(keyFromOverrideIdentifiers(['deflang', 'xyzlang'])), { 'configurationService.folder.languageSetting': 'multiLangValue' });
        const actualContent = (await fileService.readFile(userDataProfileService.currentProfile.settingsResource)).value.toString();
        assert.deepStrictEqual(JSON.parse(actualContent), { '[deflang][xyzlang]': { 'configurationService.folder.languageSetting': 'multiLangValue' } });
    }));
    test('update resource language configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.languageSetting', 'value', { resource: workspaceService.getWorkspace().folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting'), 'value');
    }));
    test('update resource language configuration for a language using configuration overrides', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { resource: workspaceService.getWorkspace().folders[0].uri, overrideIdentifier: 'jsonc' }), 'languageValue');
        await testObject.updateValue('configurationService.folder.languageSetting', 'languageValueUpdated', { resource: workspaceService.getWorkspace().folders[0].uri, overrideIdentifier: 'jsonc' }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { resource: workspaceService.getWorkspace().folders[0].uri, overrideIdentifier: 'jsonc' }), 'languageValueUpdated');
    }));
    test('update resource language configuration for a language using configuration update overrides', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { resource: workspaceService.getWorkspace().folders[0].uri, overrideIdentifier: 'jsonc' }), 'languageValue');
        await testObject.updateValue('configurationService.folder.languageSetting', 'languageValueUpdated', { resource: workspaceService.getWorkspace().folders[0].uri, overrideIdentifiers: ['jsonc'] }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', { resource: workspaceService.getWorkspace().folders[0].uri, overrideIdentifier: 'jsonc' }), 'languageValueUpdated');
    }));
    test('update application setting into workspace configuration in a workspace is not supported', () => {
        return testObject.updateValue('configurationService.folder.applicationSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */));
    });
    test('update application machine overridable setting into workspace configuration in a workspace is not supported', () => {
        return testObject.updateValue('configurationService.folder.applicationMachineSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */));
    });
    test('update machine setting into workspace configuration in a workspace is not supported', () => {
        return testObject.updateValue('configurationService.folder.machineSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 2 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE */));
    });
    test('update tasks configuration', () => {
        return testObject.updateValue('tasks', { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] }, 5 /* ConfigurationTarget.WORKSPACE */)
            .then(() => assert.deepStrictEqual(testObject.getValue("tasks" /* TasksSchemaProperties.Tasks */), { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] }));
    });
    test('update user configuration should trigger change event before promise is resolve', () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        return testObject.updateValue('configurationService.folder.testSetting', 'value', 2 /* ConfigurationTarget.USER */)
            .then(() => assert.ok(target.called));
    });
    test('update workspace configuration should trigger change event before promise is resolve', () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        return testObject.updateValue('configurationService.folder.testSetting', 'value', 5 /* ConfigurationTarget.WORKSPACE */)
            .then(() => assert.ok(target.called));
    });
    test('update memory configuration', () => {
        return testObject.updateValue('configurationService.folder.testSetting', 'memoryValue', 8 /* ConfigurationTarget.MEMORY */)
            .then(() => assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'memoryValue'));
    });
    test('update memory configuration should trigger change event before promise is resolve', () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        return testObject.updateValue('configurationService.folder.testSetting', 'memoryValue', 8 /* ConfigurationTarget.MEMORY */)
            .then(() => assert.ok(target.called));
    });
    test('remove setting from all targets', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const key = 'configurationService.folder.testSetting';
        await testObject.updateValue(key, 'workspaceValue', 5 /* ConfigurationTarget.WORKSPACE */);
        await testObject.updateValue(key, 'userValue', 2 /* ConfigurationTarget.USER */);
        await testObject.updateValue(key, undefined);
        await testObject.reloadConfiguration();
        const actual = testObject.inspect(key, { resource: workspaceService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    }));
    test('update user configuration to default value when target is not passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.testSetting', 'value', 2 /* ConfigurationTarget.USER */);
        await testObject.updateValue('configurationService.folder.testSetting', 'isSet');
        assert.strictEqual(testObject.inspect('configurationService.folder.testSetting').userValue, undefined);
    }));
    test('update user configuration to default value when target is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.testSetting', 'value', 2 /* ConfigurationTarget.USER */);
        await testObject.updateValue('configurationService.folder.testSetting', 'isSet', 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(testObject.inspect('configurationService.folder.testSetting').userValue, 'isSet');
    }));
    test('update task configuration should trigger change event before promise is resolve', () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        return testObject.updateValue('tasks', { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] }, 5 /* ConfigurationTarget.WORKSPACE */)
            .then(() => assert.ok(target.called));
    });
    test('no change event when there are no global tasks', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await timeout(5);
        assert.ok(target.notCalled);
    }));
    test('change event when there are global tasks', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(joinPath(environmentService.userRoamingDataHome, 'tasks.json'), VSBuffer.fromString('{ "version": "1.0.0", "tasks": [{ "taskName": "myTask" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await testObject.reloadLocalUserConfiguration();
        await promise;
    }));
    test('creating workspace settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        await new Promise((c, e) => {
            const disposable = testObject.onDidChangeConfiguration(e => {
                assert.ok(e.affectsConfiguration('configurationService.folder.testSetting'));
                assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'workspaceValue');
                disposable.dispose();
                c();
            });
            fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }')).catch(e);
        });
    }));
    test('deleting workspace settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        const workspaceSettingsResource = joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json');
        await fileService.writeFile(workspaceSettingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        const e = await new Promise((c, e) => {
            Event.once(testObject.onDidChangeConfiguration)(c);
            fileService.del(workspaceSettingsResource).catch(e);
        });
        assert.ok(e.affectsConfiguration('configurationService.folder.testSetting'));
        assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'userValue');
    }));
    test('restricted setting is read from workspace when workspace is trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(true);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.restrictedSetting', { resource: workspaceService.getWorkspace().folders[0].uri }), 'workspaceValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.folder.restrictedSetting'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, ['configurationService.folder.restrictedSetting']);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(workspaceService.getWorkspace().folders[0].uri), ['configurationService.folder.restrictedSetting']);
    }));
    test('restricted setting is not read from workspace when workspace is changed to trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(true);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        testObject.updateWorkspaceTrust(false);
        assert.strictEqual(testObject.getValue('configurationService.folder.restrictedSetting', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.folder.restrictedSetting'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, ['configurationService.folder.restrictedSetting']);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(workspaceService.getWorkspace().folders[0].uri), ['configurationService.folder.restrictedSetting']);
    }));
    test('change event is triggered when workspace is changed to untrusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(true);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        testObject.updateWorkspaceTrust(false);
        const event = await promise;
        assert.ok(event.affectedKeys.has('configurationService.folder.restrictedSetting'));
        assert.ok(event.affectsConfiguration('configurationService.folder.restrictedSetting'));
    }));
    test('restricted setting is not read from workspace when workspace is not trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.restrictedSetting', { resource: workspaceService.getWorkspace().folders[0].uri }), 'userValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.folder.restrictedSetting'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, ['configurationService.folder.restrictedSetting']);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(workspaceService.getWorkspace().folders[0].uri), ['configurationService.folder.restrictedSetting']);
    }));
    test('restricted setting is read when workspace is changed to trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        testObject.updateWorkspaceTrust(true);
        assert.strictEqual(testObject.getValue('configurationService.folder.restrictedSetting', { resource: workspaceService.getWorkspace().folders[0].uri }), 'workspaceValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.folder.restrictedSetting'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, ['configurationService.folder.restrictedSetting']);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(workspaceService.getWorkspace().folders[0].uri), ['configurationService.folder.restrictedSetting']);
    }));
    test('change event is triggered when workspace is changed to trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        testObject.updateWorkspaceTrust(true);
        const event = await promise;
        assert.ok(event.affectedKeys.has('configurationService.folder.restrictedSetting'));
        assert.ok(event.affectsConfiguration('configurationService.folder.restrictedSetting'));
    }));
    test('adding an restricted setting triggers change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        testObject.updateWorkspaceTrust(false);
        const promise = Event.toPromise(testObject.onDidChangeRestrictedSettings);
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        return promise;
    }));
    test('remove an unregistered setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const key = 'configurationService.folder.unknownSetting';
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.unknownSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.unknownSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        await testObject.updateValue(key, undefined);
        const actual = testObject.inspect(key, { resource: workspaceService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    }));
});
suite('WorkspaceConfigurationService - Profiles', () => {
    let testObject, workspaceService, fileService, environmentService, userDataProfileService, instantiationService;
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                [APPLY_ALL_PROFILES_SETTING]: {
                    'type': 'array',
                    'default': [],
                    'scope': 1 /* ConfigurationScope.APPLICATION */,
                },
                'configurationService.profiles.applicationSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'configurationService.profiles.applicationMachineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */
                },
                'configurationService.profiles.testSetting': {
                    'type': 'string',
                    'default': 'isSet',
                },
                'configurationService.profiles.applicationSetting2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'configurationService.profiles.testSetting2': {
                    'type': 'string',
                    'default': 'isSet',
                },
            }
        });
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const folder = joinPath(ROOT, 'a');
        await fileService.createFolder(folder);
        instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        environmentService.policyFile = joinPath(folder, 'policies.json');
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(toUserDataProfile('custom', 'custom', joinPath(environmentService.userRoamingDataHome, 'profiles', 'temp'), joinPath(environmentService.cacheHome, 'profilesCache')))));
        workspaceService = testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), disposables.add(new FilePolicyService(environmentService.policyFile, fileService, logService))));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting2": "applicationValue", "configurationService.profiles.testSetting2": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting2": "profileValue", "configurationService.profiles.testSetting2": "profileValue" }'));
        await workspaceService.initialize(convertToWorkspacePayload(folder));
        instantiationService.stub(IKeybindingEditingService, disposables.add(instantiationService.createInstance(KeybindingsEditingService)));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        workspaceService.acquireInstantiationService(instantiationService);
    });
    test('initialize', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'profileValue');
    }));
    test('inspect', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        let actual = testObject.inspect('something.missing');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, undefined);
        actual = testObject.inspect('configurationService.profiles.applicationSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'isSet');
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.profiles.applicationSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.applicationValue, 'applicationValue');
        assert.strictEqual(actual.userValue, 'profileValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'applicationValue');
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting": "applicationValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.profiles.testSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.applicationValue, undefined);
        assert.strictEqual(actual.userValue, 'profileValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'profileValue');
    }));
    test('update application scope setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.profiles.applicationSetting', 'applicationValue');
        assert.deepStrictEqual(JSON.parse((await fileService.readFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource)).value.toString()), { 'configurationService.profiles.applicationSetting': 'applicationValue', 'configurationService.profiles.applicationSetting2': 'applicationValue', 'configurationService.profiles.testSetting2': 'userValue' });
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue');
    }));
    test('update application machine setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.profiles.applicationMachineSetting', 'applicationValue');
        assert.deepStrictEqual(JSON.parse((await fileService.readFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource)).value.toString()), { 'configurationService.profiles.applicationMachineSetting': 'applicationValue', 'configurationService.profiles.applicationSetting2': 'applicationValue', 'configurationService.profiles.testSetting2': 'userValue' });
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationMachineSetting'), 'applicationValue');
    }));
    test('update normal setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.profiles.testSetting', 'profileValue');
        assert.deepStrictEqual(JSON.parse((await fileService.readFile(userDataProfileService.currentProfile.settingsResource)).value.toString()), { 'configurationService.profiles.testSetting': 'profileValue', 'configurationService.profiles.testSetting2': 'profileValue', 'configurationService.profiles.applicationSetting2': 'profileValue' });
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue');
    }));
    test('registering normal setting after init', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting3": "defaultProfile" }'));
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.profiles.testSetting3': {
                    'type': 'string',
                    'default': 'isSet',
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting3'), 'isSet');
    }));
    test('registering application scope setting after init', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting3": "defaultProfile" }'));
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.profiles.applicationSetting3': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting3'), 'defaultProfile');
    }));
    test('non registering setting should not be read from default profile', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.nonregistered": "defaultProfile" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.profiles.nonregistered'), undefined);
    }));
    test('initialize with custom all profiles settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'a')));
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
    }));
    test('update all profiles settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], [APPLY_ALL_PROFILES_SETTING, 'configurationService.profiles.testSetting2']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
    }));
    test('setting applied to all profiles is registered later', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting4": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting4": "profileValue" }'));
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting4'], 3 /* ConfigurationTarget.USER_LOCAL */);
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting4'), 'userValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.profiles.testSetting4': {
                    'type': 'string',
                    'default': 'isSet',
                }
            }
        });
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting4'), 'userValue');
    }));
    test('update setting that is applied to all profiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await testObject.updateValue('configurationService.profiles.testSetting2', 'updatedValue', 3 /* ConfigurationTarget.USER_LOCAL */);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting2']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'updatedValue');
    }));
    test('test isSettingAppliedToAllProfiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.strictEqual(testObject.isSettingAppliedForAllProfiles('configurationService.profiles.applicationSetting2'), true);
        assert.strictEqual(testObject.isSettingAppliedForAllProfiles('configurationService.profiles.testSetting2'), false);
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        assert.strictEqual(testObject.isSettingAppliedForAllProfiles('configurationService.profiles.testSetting2'), true);
    }));
    test('switch to default profile', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue", "configurationService.profiles.testSetting": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue", "configurationService.profiles.testSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(instantiationService.get(IUserDataProfilesService).defaultProfile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'userValue');
    }));
    test('switch to non default profile', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue", "configurationService.profiles.testSetting": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue", "configurationService.profiles.testSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        const profile = toUserDataProfile('custom2', 'custom2', joinPath(environmentService.userRoamingDataHome, 'profiles', 'custom2'), joinPath(environmentService.cacheHome, 'profilesCache'));
        await fileService.writeFile(profile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue2", "configurationService.profiles.testSetting": "profileValue2" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(profile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue2');
    }));
    test('switch to non default profile using settings from default profile', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue", "configurationService.profiles.testSetting": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue", "configurationService.profiles.testSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        const profile = toUserDataProfile('custom3', 'custom3', joinPath(environmentService.userRoamingDataHome, 'profiles', 'custom2'), joinPath(environmentService.cacheHome, 'profilesCache'), { useDefaultFlags: { settings: true } }, instantiationService.get(IUserDataProfilesService).defaultProfile);
        await fileService.writeFile(profile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue2", "configurationService.profiles.testSetting": "profileValue2" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(profile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.applicationSetting', 'configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue2');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue2');
    }));
    test('In non-default profile, changing application settings shall include only application scope settings in the change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{}'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue", "configurationService.profiles.testSetting": "applicationValue" }'));
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.applicationSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'isSet');
    }));
    test('switch to default profile with settings applied to all profiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        await userDataProfileService.updateCurrentProfile(instantiationService.get(IUserDataProfilesService).defaultProfile);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
    }));
    test('switch to non default profile with settings applied to all profiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        const profile = toUserDataProfile('custom2', 'custom2', joinPath(environmentService.userRoamingDataHome, 'profiles', 'custom2'), joinPath(environmentService.cacheHome, 'profilesCache'));
        await fileService.writeFile(profile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting": "profileValue", "configurationService.profiles.testSetting2": "profileValue2" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(profile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue');
    }));
    test('switch to non default from default profile with settings applied to all profiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        await userDataProfileService.updateCurrentProfile(instantiationService.get(IUserDataProfilesService).defaultProfile);
        const profile = toUserDataProfile('custom2', 'custom2', joinPath(environmentService.userRoamingDataHome, 'profiles', 'custom2'), joinPath(environmentService.cacheHome, 'profilesCache'));
        await fileService.writeFile(profile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting": "profileValue", "configurationService.profiles.testSetting2": "profileValue2" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(profile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue');
    }));
});
suite('WorkspaceConfigurationService-Multiroot', () => {
    let workspaceContextService, jsonEditingServce, testObject, fileService, environmentService, userDataProfileService;
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.testSetting': {
                    'type': 'string',
                    'default': 'isSet'
                },
                'configurationService.workspace.applicationSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'configurationService.workspace.machineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                },
                'configurationService.workspace.machineOverridableSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */
                },
                'configurationService.workspace.testResourceSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */
                },
                'configurationService.workspace.testLanguageSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
                },
                'configurationService.workspace.testRestrictedSetting1': {
                    'type': 'string',
                    'default': 'isSet',
                    restricted: true,
                    scope: 5 /* ConfigurationScope.RESOURCE */
                },
                'configurationService.workspace.testRestrictedSetting2': {
                    'type': 'string',
                    'default': 'isSet',
                    restricted: true,
                    scope: 5 /* ConfigurationScope.RESOURCE */
                }
            }
        });
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        const folderA = joinPath(ROOT, 'a');
        const folderB = joinPath(ROOT, 'b');
        const configResource = joinPath(ROOT, 'vsctests.code-workspace');
        const workspace = { folders: [{ path: folderA.path }, { path: folderB.path }] };
        await fileService.createFolder(appSettingsHome);
        await fileService.createFolder(folderA);
        await fileService.createFolder(folderB);
        await fileService.writeFile(configResource, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        const workspaceService = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, workspaceService);
        instantiationService.stub(IConfigurationService, workspaceService);
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(IEnvironmentService, environmentService);
        await workspaceService.initialize(getWorkspaceIdentifier(configResource));
        instantiationService.stub(IKeybindingEditingService, disposables.add(instantiationService.createInstance(KeybindingsEditingService)));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        jsonEditingServce = instantiationService.createInstance(JSONEditingService);
        instantiationService.stub(IJSONEditingService, jsonEditingServce);
        workspaceService.acquireInstantiationService(instantiationService);
        workspaceContextService = workspaceService;
        testObject = workspaceService;
    });
    test('application settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['settings'], value: { 'configurationService.workspace.applicationSetting': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.applicationSetting'), 'userValue');
    }));
    test('application settings are not read from workspace when folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['settings'], value: { 'configurationService.workspace.applicationSetting': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.applicationSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('machine settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['settings'], value: { 'configurationService.workspace.machineSetting': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting'), 'userValue');
    }));
    test('machine settings are not read from workspace when folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['settings'], value: { 'configurationService.workspace.machineSetting': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('get application scope settings are not loaded after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.newSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['settings'], value: { 'configurationService.workspace.newSetting': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.newSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting'), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting'), 'userValue');
    }));
    test('get application scope settings are not loaded after defaults are registered when workspace folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.newSetting-2": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['settings'], value: { 'configurationService.workspace.newSetting-2': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting-2', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.newSetting-2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting-2', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting-2', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('workspace settings override user settings after defaults are registered for machine overridable settings ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.newMachineOverridableSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['settings'], value: { 'configurationService.workspace.newMachineOverridableSetting': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newMachineOverridableSetting'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.newMachineOverridableSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.newMachineOverridableSetting'), 'workspaceValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newMachineOverridableSetting'), 'workspaceValue');
    }));
    test('application settings are not read from workspace folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.applicationSetting'), 'userValue');
    }));
    test('application settings are not read from workspace folder when workspace folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.applicationSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('machine settings are not read from workspace folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.machineSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.machineSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.machineSetting'), 'userValue');
    }));
    test('machine settings are not read from workspace folder when workspace folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.machineSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.machineSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.machineSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('application settings are not read from workspace folder after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testNewApplicationSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewApplicationSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewApplicationSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'workspaceFolderValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.testNewApplicationSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewApplicationSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewApplicationSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('machine settings are not read from workspace folder after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testNewMachineSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewMachineSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewMachineSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'workspaceFolderValue');
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.testNewMachineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewMachineSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewMachineSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'userValue');
    }));
    test('resource setting in folder is read after it is registered later', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewResourceSetting2": "workspaceFolderValue" }'));
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.testNewResourceSetting2': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.testNewResourceSetting2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewResourceSetting2', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'workspaceFolderValue');
    }));
    test('resource language setting in folder is read after it is registered later', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewResourceLanguageSetting2": "workspaceFolderValue" }'));
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.testNewResourceLanguageSetting2': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.testNewResourceLanguageSetting2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewResourceLanguageSetting2', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'workspaceFolderValue');
    }));
    test('machine overridable setting in folder is read after it is registered later', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewMachineOverridableSetting2": "workspaceFolderValue" }'));
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.testNewMachineOverridableSetting2': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.workspace.testNewMachineOverridableSetting2': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewMachineOverridableSetting2', { resource: workspaceContextService.getWorkspace().folders[0].uri }), 'workspaceFolderValue');
    }));
    test('inspect', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        let actual = testObject.inspect('something.missing');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, undefined);
        actual = testObject.inspect('configurationService.workspace.testResourceSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'isSet');
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testResourceSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testResourceSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userValue');
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.testResourceSetting': 'workspaceValue' } }], true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testResourceSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'workspaceValue');
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testResourceSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testResourceSetting', { resource: workspaceContextService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceValue');
        assert.strictEqual(actual.workspaceFolderValue, 'workspaceFolderValue');
        assert.strictEqual(actual.value, 'workspaceFolderValue');
    }));
    test('inspect restricted settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.testRestrictedSetting1': 'workspaceRestrictedValue' } }], true);
        await testObject.reloadConfiguration();
        let actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', { resource: workspaceContextService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'isSet');
        testObject.updateWorkspaceTrust(true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', { resource: workspaceContextService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'workspaceRestrictedValue');
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "workspaceFolderRestrictedValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', { resource: workspaceContextService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, 'workspaceFolderRestrictedValue');
        assert.strictEqual(actual.value, 'isSet');
        testObject.updateWorkspaceTrust(true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', { resource: workspaceContextService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, 'workspaceFolderRestrictedValue');
        assert.strictEqual(actual.value, 'workspaceFolderRestrictedValue');
    }));
    test('inspect restricted settings after change', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "userRestrictedValue" }'));
        await testObject.reloadConfiguration();
        let promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.testRestrictedSetting1': 'workspaceRestrictedValue' } }], true);
        let event = await promise;
        let actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', { resource: workspaceContextService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        assert.strictEqual(event.affectsConfiguration('configurationService.workspace.testRestrictedSetting1'), true);
        promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "workspaceFolderRestrictedValue" }'));
        event = await promise;
        actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', { resource: workspaceContextService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, 'workspaceFolderRestrictedValue');
        assert.strictEqual(actual.value, 'userRestrictedValue');
        assert.strictEqual(event.affectsConfiguration('configurationService.workspace.testRestrictedSetting1'), true);
    }));
    test('get launch configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expectedLaunchConfiguration = {
            'version': '0.1.0',
            'configurations': [
                {
                    'type': 'node',
                    'request': 'launch',
                    'name': 'Gulp Build',
                    'program': '${workspaceFolder}/node_modules/gulp/bin/gulp.js',
                    'stopOnEntry': true,
                    'args': [
                        'watch-extension:json-client'
                    ],
                    'cwd': '${workspaceFolder}'
                }
            ]
        };
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['launch'], value: expectedLaunchConfiguration }], true);
        await testObject.reloadConfiguration();
        const actual = testObject.getValue('launch');
        assert.deepStrictEqual(actual, expectedLaunchConfiguration);
    }));
    test('inspect launch configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expectedLaunchConfiguration = {
            'version': '0.1.0',
            'configurations': [
                {
                    'type': 'node',
                    'request': 'launch',
                    'name': 'Gulp Build',
                    'program': '${workspaceFolder}/node_modules/gulp/bin/gulp.js',
                    'stopOnEntry': true,
                    'args': [
                        'watch-extension:json-client'
                    ],
                    'cwd': '${workspaceFolder}'
                }
            ]
        };
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['launch'], value: expectedLaunchConfiguration }], true);
        await testObject.reloadConfiguration();
        const actual = testObject.inspect('launch').workspaceValue;
        assert.deepStrictEqual(actual, expectedLaunchConfiguration);
    }));
    test('get tasks configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expectedTasksConfiguration = {
            'version': '2.0.0',
            'tasks': [
                {
                    'label': 'Run Dev',
                    'type': 'shell',
                    'command': './scripts/code.sh',
                    'windows': {
                        'command': '.\\scripts\\code.bat'
                    },
                    'problemMatcher': []
                }
            ]
        };
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['tasks'], value: expectedTasksConfiguration }], true);
        await testObject.reloadConfiguration();
        const actual = testObject.getValue("tasks" /* TasksSchemaProperties.Tasks */);
        assert.deepStrictEqual(actual, expectedTasksConfiguration);
    }));
    test('inspect tasks configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expectedTasksConfiguration = {
            'version': '2.0.0',
            'tasks': [
                {
                    'label': 'Run Dev',
                    'type': 'shell',
                    'command': './scripts/code.sh',
                    'windows': {
                        'command': '.\\scripts\\code.bat'
                    },
                    'problemMatcher': []
                }
            ]
        };
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['tasks'], value: expectedTasksConfiguration }], true);
        await testObject.reloadConfiguration();
        const actual = testObject.inspect('tasks').workspaceValue;
        assert.deepStrictEqual(actual, expectedTasksConfiguration);
    }));
    test('update user configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.workspace.testSetting', 'userValue', 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.testSetting'), 'userValue');
    }));
    test('update user configuration should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testSetting', 'userValue', 2 /* ConfigurationTarget.USER */);
        assert.ok(target.called);
    }));
    test('update workspace configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.workspace.testSetting', 'workspaceValue', 5 /* ConfigurationTarget.WORKSPACE */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.testSetting'), 'workspaceValue');
    }));
    test('update workspace configuration should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testSetting', 'workspaceValue', 5 /* ConfigurationTarget.WORKSPACE */);
        assert.ok(target.called);
    }));
    test('update application setting into workspace configuration in a workspace is not supported', () => {
        return testObject.updateValue('configurationService.workspace.applicationSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */));
    });
    test('update machine setting into workspace configuration in a workspace is not supported', () => {
        return testObject.updateValue('configurationService.workspace.machineSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 2 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE */));
    });
    test('update workspace folder configuration', () => {
        const workspace = workspaceContextService.getWorkspace();
        return testObject.updateValue('configurationService.workspace.testResourceSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */)
            .then(() => assert.strictEqual(testObject.getValue('configurationService.workspace.testResourceSetting', { resource: workspace.folders[0].uri }), 'workspaceFolderValue'));
    });
    test('update resource language configuration in workspace folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('configurationService.workspace.testLanguageSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.testLanguageSetting', { resource: workspace.folders[0].uri }), 'workspaceFolderValue');
    }));
    test('update workspace folder configuration should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testResourceSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.ok(target.called);
    }));
    test('update workspace folder configuration second time should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('configurationService.workspace.testResourceSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testResourceSetting', 'workspaceFolderValue2', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.ok(target.called);
    }));
    test('update machine overridable setting in folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('configurationService.workspace.machineOverridableSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.machineOverridableSetting', { resource: workspace.folders[0].uri }), 'workspaceFolderValue');
    }));
    test('update memory configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.workspace.testSetting', 'memoryValue', 8 /* ConfigurationTarget.MEMORY */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.testSetting'), 'memoryValue');
    }));
    test('update memory configuration should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testSetting', 'memoryValue', 8 /* ConfigurationTarget.MEMORY */);
        assert.ok(target.called);
    }));
    test('remove setting from all targets', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        const key = 'configurationService.workspace.testResourceSetting';
        await testObject.updateValue(key, 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        await testObject.updateValue(key, 'workspaceValue', 5 /* ConfigurationTarget.WORKSPACE */);
        await testObject.updateValue(key, 'userValue', 2 /* ConfigurationTarget.USER */);
        await testObject.updateValue(key, undefined, { resource: workspace.folders[0].uri });
        await testObject.reloadConfiguration();
        const actual = testObject.inspect(key, { resource: workspace.folders[0].uri });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    }));
    test('update tasks configuration in a folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('tasks', { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] }, { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.deepStrictEqual(testObject.getValue("tasks" /* TasksSchemaProperties.Tasks */, { resource: workspace.folders[0].uri }), { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] });
    }));
    test('update launch configuration in a workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('launch', { 'version': '1.0.0', configurations: [{ 'name': 'myLaunch' }] }, { resource: workspace.folders[0].uri }, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true });
        assert.deepStrictEqual(testObject.getValue('launch'), { 'version': '1.0.0', configurations: [{ 'name': 'myLaunch' }] });
    }));
    test('update tasks configuration in a workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        const tasks = { 'version': '2.0.0', tasks: [{ 'label': 'myTask' }] };
        await testObject.updateValue('tasks', tasks, { resource: workspace.folders[0].uri }, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true });
        assert.deepStrictEqual(testObject.getValue("tasks" /* TasksSchemaProperties.Tasks */), tasks);
    }));
    test('configuration of newly added folder is available on configuration change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspaceService = testObject;
        const uri = workspaceService.getWorkspace().folders[1].uri;
        await workspaceService.removeFolders([uri]);
        await fileService.writeFile(joinPath(uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testResourceSetting": "workspaceFolderValue" }'));
        return new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration(() => {
                try {
                    assert.strictEqual(testObject.getValue('configurationService.workspace.testResourceSetting', { resource: uri }), 'workspaceFolderValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
            workspaceService.addFolders([{ uri }]);
        });
    }));
    test('restricted setting is read from workspace folders when workspace is trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(true);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "userValue", "configurationService.workspace.testRestrictedSetting2": "userValue" }'));
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.testRestrictedSetting1': 'workspaceValue' } }], true);
        await fileService.writeFile(joinPath(testObject.getWorkspace().folders[1].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting2": "workspaceFolder2Value" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testRestrictedSetting1', { resource: testObject.getWorkspace().folders[0].uri }), 'workspaceValue');
        assert.strictEqual(testObject.getValue('configurationService.workspace.testRestrictedSetting2', { resource: testObject.getWorkspace().folders[1].uri }), 'workspaceFolder2Value');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.workspace.testRestrictedSetting1'));
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.workspace.testRestrictedSetting2'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, ['configurationService.workspace.testRestrictedSetting1']);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.get(testObject.getWorkspace().folders[0].uri), undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(testObject.getWorkspace().folders[1].uri), ['configurationService.workspace.testRestrictedSetting2']);
    }));
    test('restricted setting is not read from workspace when workspace is not trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "userValue", "configurationService.workspace.testRestrictedSetting2": "userValue" }'));
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.testRestrictedSetting1': 'workspaceValue' } }], true);
        await fileService.writeFile(joinPath(testObject.getWorkspace().folders[1].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting2": "workspaceFolder2Value" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testRestrictedSetting1', { resource: testObject.getWorkspace().folders[0].uri }), 'userValue');
        assert.strictEqual(testObject.getValue('configurationService.workspace.testRestrictedSetting2', { resource: testObject.getWorkspace().folders[1].uri }), 'userValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.workspace.testRestrictedSetting1'));
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.workspace.testRestrictedSetting2'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, ['configurationService.workspace.testRestrictedSetting1']);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.get(testObject.getWorkspace().folders[0].uri), undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(testObject.getWorkspace().folders[1].uri), ['configurationService.workspace.testRestrictedSetting2']);
    }));
    test('remove an unregistered setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const key = 'configurationService.workspace.unknownSetting';
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.unknownSetting": "userValue" }'));
        await jsonEditingServce.write((workspaceContextService.getWorkspace().configuration), [{ path: ['settings'], value: { 'configurationService.workspace.unknownSetting': 'workspaceValue' } }], true);
        await fileService.writeFile(joinPath(workspaceContextService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.unknownSetting": "workspaceFolderValue1" }'));
        await fileService.writeFile(joinPath(workspaceContextService.getWorkspace().folders[1].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.unknownSetting": "workspaceFolderValue2" }'));
        await testObject.reloadConfiguration();
        await testObject.updateValue(key, undefined, { resource: workspaceContextService.getWorkspace().folders[0].uri });
        let actual = testObject.inspect(key, { resource: workspaceContextService.getWorkspace().folders[0].uri });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        await testObject.updateValue(key, undefined, { resource: workspaceContextService.getWorkspace().folders[1].uri });
        actual = testObject.inspect(key, { resource: workspaceContextService.getWorkspace().folders[1].uri });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    }));
});
suite('WorkspaceConfigurationService - Remote Folder', () => {
    let testObject, folder, machineSettingsResource, remoteSettingsResource, fileSystemProvider, resolveRemoteEnvironment, instantiationService, fileService, environmentService, userDataProfileService;
    const remoteAuthority = 'configuraiton-tests';
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.remote.applicationSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'configurationService.remote.machineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                },
                'configurationService.remote.applicationMachineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */
                },
                'configurationService.remote.machineOverridableSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */
                },
                'configurationService.remote.testSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */
                }
            }
        });
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        folder = joinPath(ROOT, 'a');
        await fileService.createFolder(folder);
        await fileService.createFolder(appSettingsHome);
        machineSettingsResource = joinPath(ROOT, 'machine-settings.json');
        remoteSettingsResource = machineSettingsResource.with({ scheme: Schemas.vscodeRemote, authority: remoteAuthority });
        instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        const remoteEnvironmentPromise = new Promise(c => resolveRemoteEnvironment = () => c({ settingsPath: remoteSettingsResource }));
        const remoteAgentService = instantiationService.stub(IRemoteAgentService, { getEnvironment: () => remoteEnvironmentPromise });
        const configurationCache = { read: () => Promise.resolve(''), write: () => Promise.resolve(), remove: () => Promise.resolve(), needsCaching: () => false };
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        testObject = disposables.add(new WorkspaceService({ configurationCache, remoteAuthority }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        instantiationService.stub(IFileService, fileService);
    });
    async function initialize() {
        await testObject.initialize(convertToWorkspacePayload(folder));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        instantiationService.stub(IJSONEditingService, instantiationService.createInstance(JSONEditingService));
        testObject.acquireInstantiationService(instantiationService);
    }
    function registerRemoteFileSystemProvider() {
        disposables.add(instantiationService.get(IFileService).registerProvider(Schemas.vscodeRemote, new RemoteFileSystemProvider(fileSystemProvider, remoteAuthority)));
    }
    function registerRemoteFileSystemProviderOnActivation() {
        const disposable = disposables.add(instantiationService.get(IFileService).onWillActivateFileSystemProvider(e => {
            if (e.scheme === Schemas.vscodeRemote) {
                disposable.dispose();
                e.join(Promise.resolve().then(() => registerRemoteFileSystemProvider()));
            }
        }));
    }
    test('remote machine settings override globals', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "remoteValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'remoteValue');
    }));
    test('remote machine settings override globals after remote provider is registered on activation', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "remoteValue" }'));
        resolveRemoteEnvironment();
        registerRemoteFileSystemProviderOnActivation();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'remoteValue');
    }));
    test('remote machine settings override globals after remote environment is resolved', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "remoteValue" }'));
        registerRemoteFileSystemProvider();
        await initialize();
        const promise = new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration(event => {
                try {
                    assert.strictEqual(event.source, 2 /* ConfigurationTarget.USER */);
                    assert.deepStrictEqual([...event.affectedKeys], ['configurationService.remote.machineSetting']);
                    assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'remoteValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
        });
        resolveRemoteEnvironment();
        return promise;
    }));
    test('remote settings override globals after remote provider is registered on activation and remote environment is resolved', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "remoteValue" }'));
        registerRemoteFileSystemProviderOnActivation();
        await initialize();
        const promise = new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration(event => {
                try {
                    assert.strictEqual(event.source, 2 /* ConfigurationTarget.USER */);
                    assert.deepStrictEqual([...event.affectedKeys], ['configurationService.remote.machineSetting']);
                    assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'remoteValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
        });
        resolveRemoteEnvironment();
        return promise;
    }));
    test('machine settings in local user settings does not override defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "globalValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'isSet');
    }));
    test('remote application machine settings override globals', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "remoteValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'remoteValue');
    }));
    test('remote application machine settings override globals after remote provider is registered on activation', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "remoteValue" }'));
        resolveRemoteEnvironment();
        registerRemoteFileSystemProviderOnActivation();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'remoteValue');
    }));
    test('remote application machine settings override globals after remote environment is resolved', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "remoteValue" }'));
        registerRemoteFileSystemProvider();
        await initialize();
        const promise = new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration(event => {
                try {
                    assert.strictEqual(event.source, 2 /* ConfigurationTarget.USER */);
                    assert.deepStrictEqual([...event.affectedKeys], ['configurationService.remote.applicationMachineSetting']);
                    assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'remoteValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
        });
        resolveRemoteEnvironment();
        return promise;
    }));
    test('remote application machine settings override globals after remote provider is registered on activation and remote environment is resolved', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "remoteValue" }'));
        registerRemoteFileSystemProviderOnActivation();
        await initialize();
        const promise = new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration(event => {
                try {
                    assert.strictEqual(event.source, 2 /* ConfigurationTarget.USER */);
                    assert.deepStrictEqual([...event.affectedKeys], ['configurationService.remote.applicationMachineSetting']);
                    assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'remoteValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
        });
        resolveRemoteEnvironment();
        return promise;
    }));
    test('application machine settings in local user settings does not override defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "globalValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'isSet');
    }));
    test('machine overridable settings in local user settings does not override defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.machineOverridableSetting": "globalValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.machineOverridableSetting'), 'isSet');
    }));
    test('non machine setting is written in local settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        await testObject.updateValue('configurationService.remote.applicationSetting', 'applicationValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.inspect('configurationService.remote.applicationSetting').userLocalValue, 'applicationValue');
    }));
    test('machine setting is written in remote settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        await testObject.updateValue('configurationService.remote.machineSetting', 'machineValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.inspect('configurationService.remote.machineSetting').userRemoteValue, 'machineValue');
    }));
    test('application machine setting is written in remote settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        await testObject.updateValue('configurationService.remote.applicationMachineSetting', 'machineValue');
        await testObject.reloadConfiguration();
        const actual = testObject.inspect('configurationService.remote.applicationMachineSetting');
        assert.strictEqual(actual.userRemoteValue, 'machineValue');
    }));
    test('machine overridable setting is written in remote settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        await testObject.updateValue('configurationService.remote.machineOverridableSetting', 'machineValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.inspect('configurationService.remote.machineOverridableSetting').userRemoteValue, 'machineValue');
    }));
    test('machine settings in local user settings does not override defaults after defalts are registered ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.newMachineSetting": "userValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.remote.newMachineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.remote.newMachineSetting'), 'isSet');
    }));
    test('machine overridable settings in local user settings does not override defaults after defaults are registered ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.newMachineOverridableSetting": "userValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationService.remote.newMachineOverridableSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */
                }
            }
        });
        assert.strictEqual(testObject.getValue('configurationService.remote.newMachineOverridableSetting'), 'isSet');
    }));
});
function getWorkspaceId(configPath) {
    let workspaceConfigPath = configPath.toString();
    if (!isLinux) {
        workspaceConfigPath = workspaceConfigPath.toLowerCase(); // sanitize for platform file system
    }
    return hash(workspaceConfigPath).toString(16);
}
function getWorkspaceIdentifier(configPath) {
    return {
        configPath,
        id: getWorkspaceId(configPath)
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL3Rlc3QvYnJvd3Nlci9jb25maWd1cmF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFzQiwwQkFBMEIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ3RNLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQXdHLE1BQU0sdURBQXVELENBQUM7QUFDdk0sT0FBTyxFQUF1QixxQkFBcUIsRUFBNkIsTUFBTSwrREFBK0QsQ0FBQztBQUN0SixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsd0JBQXdCLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUV6SyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdC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