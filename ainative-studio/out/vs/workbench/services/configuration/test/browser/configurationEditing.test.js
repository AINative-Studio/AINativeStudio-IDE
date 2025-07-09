/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as sinon from 'sinon';
import assert from 'assert';
import * as json from '../../../../../base/common/json.js';
import { Event } from '../../../../../base/common/event.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestEnvironmentService, TestTextFileService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import * as uuid from '../../../../../base/common/uuid.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { WorkspaceService } from '../../browser/configurationService.js';
import { ConfigurationEditing } from '../../common/configurationEditing.js';
import { WORKSPACE_STANDALONE_CONFIGURATIONS, FOLDER_SETTINGS_PATH, USER_STANDALONE_CONFIGURATIONS } from '../../common/configuration.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITextFileService } from '../../../textfile/common/textfiles.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TextModelResolverService } from '../../../textmodelResolver/common/textModelResolverService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { CommandService } from '../../../commands/common/commandService.js';
import { URI } from '../../../../../base/common/uri.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { KeybindingsEditingService, IKeybindingEditingService } from '../../../keybinding/common/keybindingEditing.js';
import { FileUserDataProvider } from '../../../../../platform/userData/common/fileUserDataProvider.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { RemoteAgentService } from '../../../remote/browser/remoteAgentService.js';
import { getSingleFolderWorkspaceIdentifier } from '../../../workspaces/browser/workspaces.js';
import { IUserDataProfilesService, UserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { hash } from '../../../../../base/common/hash.js';
import { FilePolicyService } from '../../../../../platform/policy/common/filePolicyService.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class ConfigurationCache {
    needsCaching(resource) { return false; }
    async read() { return ''; }
    async write() { }
    async remove() { }
}
suite('ConfigurationEditing', () => {
    let instantiationService;
    let userDataProfileService;
    let environmentService;
    let fileService;
    let workspaceService;
    let testObject;
    suiteSetup(() => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            'id': '_test',
            'type': 'object',
            'properties': {
                'configurationEditing.service.testSetting': {
                    'type': 'string',
                    'default': 'isSet'
                },
                'configurationEditing.service.testSettingTwo': {
                    'type': 'string',
                    'default': 'isSet'
                },
                'configurationEditing.service.testSettingThree': {
                    'type': 'string',
                    'default': 'isSet'
                },
                'configurationEditing.service.policySetting': {
                    'type': 'string',
                    'default': 'isSet',
                    policy: {
                        name: 'configurationEditing.service.policySetting',
                        minimumVersion: '1.0.0',
                    }
                }
            }
        });
    });
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        disposables.add(toDisposable(() => sinon.restore()));
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const workspaceFolder = joinPath(ROOT, uuid.generateUuid());
        await fileService.createFolder(workspaceFolder);
        instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        environmentService.policyFile = joinPath(workspaceFolder, 'policies.json');
        instantiationService.stub(IEnvironmentService, environmentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService))));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        workspaceService = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), disposables.add(new FilePolicyService(environmentService.policyFile, fileService, logService))));
        await workspaceService.initialize({
            id: hash(workspaceFolder.toString()).toString(16),
            uri: workspaceFolder
        });
        instantiationService.stub(IWorkspaceContextService, workspaceService);
        await workspaceService.initialize(getSingleFolderWorkspaceIdentifier(workspaceFolder));
        instantiationService.stub(IConfigurationService, workspaceService);
        instantiationService.stub(IKeybindingEditingService, disposables.add(instantiationService.createInstance(KeybindingsEditingService)));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        instantiationService.stub(ICommandService, CommandService);
        testObject = instantiationService.createInstance(ConfigurationEditing, null);
    });
    test('errors cases - invalid key', async () => {
        try {
            await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'unknown.key', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 0 /* ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY */);
            return;
        }
        assert.fail('Should fail with ERROR_UNKNOWN_KEY');
    });
    test('errors cases - no workspace', async () => {
        await workspaceService.initialize({ id: uuid.generateUuid() });
        try {
            await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 8 /* ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED */);
            return;
        }
        assert.fail('Should fail with ERROR_NO_WORKSPACE_OPENED');
    });
    test('errors cases - invalid configuration', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString(',,,,,,,,,,,,,,'));
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */);
            return;
        }
        assert.fail('Should fail with ERROR_INVALID_CONFIGURATION');
    });
    test('errors cases - invalid global tasks configuration', async () => {
        const resource = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(resource, VSBuffer.fromString(',,,,,,,,,,,,,,'));
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'tasks.configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */);
            return;
        }
        assert.fail('Should fail with ERROR_INVALID_CONFIGURATION');
    });
    test('errors cases - dirty', async () => {
        instantiationService.stub(ITextFileService, 'isDirty', true);
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */);
            return;
        }
        assert.fail('Should fail with ERROR_CONFIGURATION_FILE_DIRTY error.');
    });
    test('do not notify error', async () => {
        instantiationService.stub(ITextFileService, 'isDirty', true);
        const target = sinon.stub();
        instantiationService.stub(INotificationService, { prompt: target, _serviceBrand: undefined, filter: false, onDidAddNotification: undefined, onDidRemoveNotification: undefined, onDidChangeFilter: undefined, notify: null, error: null, info: null, warn: null, status: null, setFilter: null, getFilter: null, getFilters: null, removeFilter: null });
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(false, target.calledOnce);
            assert.strictEqual(error.code, 9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */);
            return;
        }
        assert.fail('Should fail with ERROR_CONFIGURATION_FILE_DIRTY error.');
    });
    test('errors cases - ERROR_POLICY_CONFIGURATION', async () => {
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(instantiationService.get(IConfigurationService).onDidChangeConfiguration);
            await fileService.writeFile(environmentService.policyFile, VSBuffer.fromString('{ "configurationEditing.service.policySetting": "policyValue" }'));
            await promise;
        });
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.policySetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 12 /* ConfigurationEditingErrorCode.ERROR_POLICY_CONFIGURATION */);
            return;
        }
        assert.fail('Should fail with ERROR_POLICY_CONFIGURATION');
    });
    test('write policy setting - when not set', async () => {
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.policySetting', value: 'value' }, { donotNotifyError: true });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['configurationEditing.service.policySetting'], 'value');
    });
    test('write one setting - empty file', async () => {
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: 'value' });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['configurationEditing.service.testSetting'], 'value');
    });
    test('write one setting - existing file', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: 'value' });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['configurationEditing.service.testSetting'], 'value');
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('remove an existing setting - existing file', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "my.super.setting": "my.super.value", "configurationEditing.service.testSetting": "value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: undefined });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(Object.keys(parsed), ['my.super.setting']);
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('remove non existing setting - existing file', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: undefined });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(Object.keys(parsed), ['my.super.setting']);
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('write overridable settings to user settings', async () => {
        const key = '[language]';
        const value = { 'configurationEditing.service.testSetting': 'overridden value' };
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key, value });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(parsed[key], value);
    });
    test('write overridable settings to workspace settings', async () => {
        const key = '[language]';
        const value = { 'configurationEditing.service.testSetting': 'overridden value' };
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key, value });
        const contents = await fileService.readFile(joinPath(workspaceService.getWorkspace().folders[0].uri, FOLDER_SETTINGS_PATH));
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(parsed[key], value);
    });
    test('write overridable settings to workspace folder settings', async () => {
        const key = '[language]';
        const value = { 'configurationEditing.service.testSetting': 'overridden value' };
        const folderSettingsFile = joinPath(workspaceService.getWorkspace().folders[0].uri, FOLDER_SETTINGS_PATH);
        await testObject.writeConfiguration(4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */, { key, value }, { scopes: { resource: folderSettingsFile } });
        const contents = await fileService.readFile(folderSettingsFile);
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(parsed[key], value);
    });
    test('write workspace standalone setting - empty file', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'tasks.service.testSetting', value: 'value' });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['service.testSetting'], 'value');
    });
    test('write user standalone setting - empty file', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'tasks.service.testSetting', value: 'value' });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['service.testSetting'], 'value');
    });
    test('write workspace standalone setting - existing file', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'tasks.service.testSetting', value: 'value' });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['service.testSetting'], 'value');
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('write user standalone setting - existing file', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'tasks.service.testSetting', value: 'value' });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['service.testSetting'], 'value');
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('write workspace standalone setting - empty file - full JSON', async () => {
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } });
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write user standalone setting - empty file - full JSON', async () => {
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } });
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write workspace standalone setting - existing file - full JSON', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write user standalone setting - existing file - full JSON', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write workspace standalone setting - existing file with JSON errors - full JSON', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": ')); // invalid JSON
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write user standalone setting - existing file with JSON errors - full JSON', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": ')); // invalid JSON
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write workspace standalone setting should replace complete file', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString(`{
			"version": "1.0.0",
			"tasks": [
				{
					"taskName": "myTask1"
				},
				{
					"taskName": "myTask2"
				}
			]
		}`));
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask1' }] } });
        const actual = await fileService.readFile(target);
        const expected = JSON.stringify({ 'version': '1.0.0', tasks: [{ 'taskName': 'myTask1' }] }, null, '\t');
        assert.strictEqual(actual.value.toString(), expected);
    });
    test('write user standalone setting should replace complete file', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString(`{
			"version": "1.0.0",
			"tasks": [
				{
					"taskName": "myTask1"
				},
				{
					"taskName": "myTask2"
				}
			]
		}`));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask1' }] } });
        const actual = await fileService.readFile(target);
        const expected = JSON.stringify({ 'version': '1.0.0', tasks: [{ 'taskName': 'myTask1' }] }, null, '\t');
        assert.strictEqual(actual.value.toString(), expected);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkVkaXRpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi90ZXN0L2Jyb3dzZXIvY29uZmlndXJhdGlvbkVkaXRpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9JLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUN0SixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQThELE1BQU0sc0NBQXNDLENBQUM7QUFDeEksT0FBTyxFQUFFLG1DQUFtQyxFQUFFLG9CQUFvQixFQUFFLDhCQUE4QixFQUF1QixNQUFNLCtCQUErQixDQUFDO0FBQy9KLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtE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