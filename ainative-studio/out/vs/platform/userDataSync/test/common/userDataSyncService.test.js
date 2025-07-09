/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { dirname, joinPath } from '../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IFileService } from '../../../files/common/files.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncEnablementService, IUserDataSyncService } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('UserDataSyncService', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    test('test first time sync ever', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Tasks
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Extensions
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync ever when a sync resource is disabled', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        client.instantiationService.get(IUserDataSyncEnablementService).setResourceEnablement("settings" /* SyncResource.Settings */, false);
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Extensions
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync ever with no data', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp(true);
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            // Tasks
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            // Extensions
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync from the client with no changes - merge', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync from the client with changes - merge', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client with changes
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const fileService = testClient.instantiationService.get(IFileService);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'mine.prompt.md'), VSBuffer.fromString('text'));
        await fileService.writeFile(joinPath(dirname(userDataProfilesService.defaultProfile.settingsResource), 'tasks.json'), VSBuffer.fromString(JSON.stringify({})));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync from the client with changes - merge with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client with changes
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const fileService = testClient.instantiationService.get(IFileService);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'my.prompt.md'), VSBuffer.fromString('some prompt text'));
        await fileService.writeFile(joinPath(dirname(userDataProfilesService.defaultProfile.settingsResource), 'tasks.json'), VSBuffer.fromString(JSON.stringify({})));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/settings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/keybindings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test sync when there are no changes', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // sync from the client again
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
        ]);
    });
    test('test sync when there are local changes', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'shared.prompt.md'), VSBuffer.fromString('prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
        ]);
    });
    test('test sync when there are local changes with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'default.prompt.md'), VSBuffer.fromString('some prompt file contents'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            // Profiles
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/settings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/keybindings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test sync when there are local changes and sync resource is disabled', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, '1.prompt.md'), VSBuffer.fromString('random prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        client.instantiationService.get(IUserDataSyncEnablementService).setResourceEnablement("snippets" /* SyncResource.Snippets */, false);
        client.instantiationService.get(IUserDataSyncEnablementService).setResourceEnablement("prompts" /* SyncResource.Prompts */, false);
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
        ]);
    });
    test('test sync when there are remote changes', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'unknown.prompt.md'), VSBuffer.fromString('prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: { 'If-None-Match': '1' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: { 'If-None-Match': '1' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: { 'If-None-Match': '1' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: { 'If-None-Match': '1' } },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: { 'If-None-Match': '1' } },
        ]);
    });
    test('test sync when there are remote changes with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'global.prompt.md'), VSBuffer.fromString('some text goes here'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: { 'If-None-Match': '1' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: { 'If-None-Match': '1' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: { 'If-None-Match': '1' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: { 'If-None-Match': '1' } },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: { 'If-None-Match': '1' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: { 'If-None-Match': '0' } },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/settings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/keybindings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test delete', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from the client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Reset from the client
        target.reset();
        await testObject.reset();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'DELETE', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'DELETE', url: `${target.url}/v1/resource`, headers: {} },
        ]);
    });
    test('test delete and sync', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from the client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Reset from the client
        await testObject.reset();
        // Sync again
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Tasks
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Extensions
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test sync status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // sync from the client
        const actualStatuses = [];
        const disposable = testObject.onDidChangeStatus(status => actualStatuses.push(status));
        await (await testObject.createSyncTask(null)).run();
        disposable.dispose();
        assert.deepStrictEqual(actualStatuses, ["syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */]);
    });
    test('test sync conflicts status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        let fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        fileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assert.deepStrictEqual(testObject.conflicts.map(({ syncResource }) => syncResource), ["settings" /* SyncResource.Settings */]);
    });
    test('test sync will sync other non conflicted areas', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client and get conflicts in settings
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testFileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await testFileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // sync from the first client with changes in keybindings
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // sync from the test client
        target.reset();
        const actualStatuses = [];
        const disposable = testObject.onDidChangeStatus(status => actualStatuses.push(status));
        await (await testObject.createSyncTask(null)).run();
        disposable.dispose();
        assert.deepStrictEqual(actualStatuses, []);
        assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: { 'If-None-Match': '1' } },
        ]);
    });
    test('test stop sync reset status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        let fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        fileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        const syncTask = (await testObject.createSyncTask(null));
        syncTask.run().then(null, () => null /* ignore error */);
        await syncTask.stop();
        assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts, []);
    });
    test('test sync send execution id header', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        for (const request of target.requestsWithAllHeaders) {
            const hasExecutionIdHeader = request.headers && request.headers['X-Execution-Id'] && request.headers['X-Execution-Id'].length > 0;
            assert.ok(hasExecutionIdHeader, `Should have execution header: ${request.url}`);
        }
    });
    test('test can run sync taks only once', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        const syncTask = await testObject.createSyncTask(null);
        await syncTask.run();
        try {
            await syncTask.run();
            assert.fail('Should fail running the task again');
        }
        catch (error) {
            /* expected */
        }
    });
    test('test sync when there are local profile that uses default profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1', { useDefaultFlags: { settings: true } });
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, '2.prompt.md'), VSBuffer.fromString('file contents'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            // Profiles
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/keybindings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test sync when there is a remote profile that uses default profile', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1', { useDefaultFlags: { keybindings: true } });
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'best.prompt.md'), VSBuffer.fromString('prompt prompt'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: { 'If-None-Match': '1' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: { 'If-None-Match': '1' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: { 'If-None-Match': '1' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: { 'If-None-Match': '1' } },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: { 'If-None-Match': '1' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: { 'If-None-Match': '0' } },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/settings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi91c2VyRGF0YVN5bmNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsb0JBQW9CLEVBQTRCLE1BQU0sOEJBQThCLENBQUM7QUFDOUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckYsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUVqQyxNQUFNLGVBQWUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRWxFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1QyxtQkFBbUI7UUFDbkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1FBQzVDLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxN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