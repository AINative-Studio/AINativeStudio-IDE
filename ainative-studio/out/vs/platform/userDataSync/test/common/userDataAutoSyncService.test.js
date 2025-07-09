/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Event } from '../../../../base/common/event.js';
import { joinPath } from '../../../../base/common/resources.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IFileService } from '../../../files/common/files.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { UserDataAutoSyncService } from '../../common/userDataAutoSyncService.js';
import { IUserDataSyncService, UserDataAutoSyncError, UserDataSyncStoreError } from '../../common/userDataSync.js';
import { IUserDataSyncMachinesService } from '../../common/userDataSyncMachines.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
class TestUserDataAutoSyncService extends UserDataAutoSyncService {
    startAutoSync() { return false; }
    getSyncTriggerDelayTime() { return 50; }
    sync() {
        return this.triggerSync(['sync']);
    }
}
suite('UserDataAutoSyncService', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    test('test auto sync with sync resource change triggers sync', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            // Sync once and reset requests
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            target.reset();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Trigger auto sync with settings change
            await testObject.triggerSync(["settings" /* SyncResource.Settings */]);
            // Filter out machine requests
            const actual = target.requests.filter(request => !request.url.startsWith(`${target.url}/v1/resource/machines`));
            // Make sure only one manifest request is made
            assert.deepStrictEqual(actual, [{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} }]);
        });
    });
    test('test auto sync with sync resource change triggers sync for every change', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            // Sync once and reset requests
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            target.reset();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Trigger auto sync with settings change multiple times
            for (let counter = 0; counter < 2; counter++) {
                await testObject.triggerSync(["settings" /* SyncResource.Settings */]);
            }
            // Filter out machine requests
            const actual = target.requests.filter(request => !request.url.startsWith(`${target.url}/v1/resource/machines`));
            assert.deepStrictEqual(actual, [
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } }
            ]);
        });
    });
    test('test auto sync with non sync resource change triggers sync', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            // Sync once and reset requests
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            target.reset();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Trigger auto sync with window focus once
            await testObject.triggerSync(['windowFocus']);
            // Filter out machine requests
            const actual = target.requests.filter(request => !request.url.startsWith(`${target.url}/v1/resource/machines`));
            // Make sure only one manifest request is made
            assert.deepStrictEqual(actual, [{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} }]);
        });
    });
    test('test auto sync with non sync resource change does not trigger continuous syncs', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            // Sync once and reset requests
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            target.reset();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Trigger auto sync with window focus multiple times
            for (let counter = 0; counter < 2; counter++) {
                await testObject.triggerSync(['windowFocus'], { skipIfSyncedRecently: true });
            }
            // Filter out machine requests
            const actual = target.requests.filter(request => !request.url.startsWith(`${target.url}/v1/resource/machines`));
            // Make sure only one manifest request is made
            assert.deepStrictEqual(actual, [{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} }]);
        });
    });
    test('test first auto sync requests', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
                // Machines
                { type: 'GET', url: `${target.url}/v1/resource/machines/latest`, headers: {} },
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
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
                // Machines
                { type: 'POST', url: `${target.url}/v1/resource/machines`, headers: { 'If-Match': '0' } }
            ]);
        });
    });
    test('test further auto sync requests without changes', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Sync once and reset requests
            await testObject.sync();
            target.reset();
            await testObject.sync();
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } }
            ]);
        });
    });
    test('test further auto sync requests with changes', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Sync once and reset requests
            await testObject.sync();
            target.reset();
            // Do changes in the client
            const fileService = client.instantiationService.get(IFileService);
            const environmentService = client.instantiationService.get(IEnvironmentService);
            const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
            await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
            await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
            await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
            await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'h1.prompt.md'), VSBuffer.fromString(' '));
            await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
            await testObject.sync();
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
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
    });
    test('test auto sync send execution id header', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Sync once and reset requests
            await testObject.sync();
            target.reset();
            await testObject.sync();
            for (const request of target.requestsWithAllHeaders) {
                const hasExecutionIdHeader = request.headers && request.headers['X-Execution-Id'] && request.headers['X-Execution-Id'].length > 0;
                if (request.url.startsWith(`${target.url}/v1/resource/machines`)) {
                    assert.ok(!hasExecutionIdHeader, `Should not have execution header: ${request.url}`);
                }
                else {
                    assert.ok(hasExecutionIdHeader, `Should have execution header: ${request.url}`);
                }
            }
        });
    });
    test('test delete on one client throws turned off error on other client while syncing', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer();
            // Set up and sync from the client
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            // Reset from the first client
            await client.instantiationService.get(IUserDataSyncService).reset();
            // Sync from the test client
            target.reset();
            const errorPromise = Event.toPromise(testObject.onError);
            await testObject.sync();
            const e = await errorPromise;
            assert.ok(e instanceof UserDataAutoSyncError);
            assert.deepStrictEqual(e.code, "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */);
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Machine
                { type: 'GET', url: `${target.url}/v1/resource/machines/latest`, headers: { 'If-None-Match': '1' } },
            ]);
        });
    });
    test('test disabling the machine turns off sync', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer();
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            // Disable current machine
            const userDataSyncMachinesService = testClient.instantiationService.get(IUserDataSyncMachinesService);
            const machines = await userDataSyncMachinesService.getMachines();
            const currentMachine = machines.find(m => m.isCurrent);
            await userDataSyncMachinesService.setEnablements([[currentMachine.id, false]]);
            target.reset();
            const errorPromise = Event.toPromise(testObject.onError);
            await testObject.sync();
            const e = await errorPromise;
            assert.ok(e instanceof UserDataAutoSyncError);
            assert.deepStrictEqual(e.code, "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */);
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Machine
                { type: 'GET', url: `${target.url}/v1/resource/machines/latest`, headers: { 'If-None-Match': '2' } },
                { type: 'POST', url: `${target.url}/v1/resource/machines`, headers: { 'If-Match': '2' } },
            ]);
        });
    });
    test('test removing the machine adds machine back', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer();
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            // Remove current machine
            await testClient.instantiationService.get(IUserDataSyncMachinesService).removeCurrentMachine();
            target.reset();
            await testObject.sync();
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Machine
                { type: 'POST', url: `${target.url}/v1/resource/machines`, headers: { 'If-Match': '2' } },
            ]);
        });
    });
    test('test creating new session from one client throws session expired error on another client while syncing', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer();
            // Set up and sync from the client
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            // Reset from the first client
            await client.instantiationService.get(IUserDataSyncService).reset();
            // Sync again from the first client to create new session
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            // Sync from the test client
            target.reset();
            const errorPromise = Event.toPromise(testObject.onError);
            await testObject.sync();
            const e = await errorPromise;
            assert.ok(e instanceof UserDataAutoSyncError);
            assert.deepStrictEqual(e.code, "SessionExpired" /* UserDataSyncErrorCode.SessionExpired */);
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Machine
                { type: 'GET', url: `${target.url}/v1/resource/machines/latest`, headers: { 'If-None-Match': '1' } },
            ]);
        });
    });
    test('test rate limit on server', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer(5);
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            const errorPromise = Event.toPromise(testObject.onError);
            while (target.requests.length < 5) {
                await testObject.sync();
            }
            const e = await errorPromise;
            assert.ok(e instanceof UserDataSyncStoreError);
            assert.deepStrictEqual(e.code, "RemoteTooManyRequests" /* UserDataSyncErrorCode.TooManyRequests */);
        });
    });
    test('test auto sync is suspended when server donot accepts requests', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer(5, 1);
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            while (target.requests.length < 5) {
                await testObject.sync();
            }
            target.reset();
            await testObject.sync();
            assert.deepStrictEqual(target.requests, []);
        });
    });
    test('test cache control header with no cache is sent when triggered with disable cache option', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer(5, 1);
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.triggerSync(['some reason'], { disableCache: true });
            assert.strictEqual(target.requestsWithAllHeaders[0].headers['Cache-Control'], 'no-cache');
        });
    });
    test('test cache control header is not sent when triggered without disable cache option', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer(5, 1);
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.triggerSync(['some reason']);
            assert.strictEqual(target.requestsWithAllHeaders[0].headers['Cache-Control'], undefined);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vdXNlckRhdGFBdXRvU3luY1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBZ0IscUJBQXFCLEVBQXlCLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEosT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckYsTUFBTSwyQkFBNEIsU0FBUSx1QkFBdUI7SUFDN0MsYUFBYSxLQUFj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