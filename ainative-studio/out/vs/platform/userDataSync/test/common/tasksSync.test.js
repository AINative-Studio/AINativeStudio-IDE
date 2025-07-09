/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IFileService } from '../../../files/common/files.js';
import { ILogService } from '../../../log/common/log.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { getTasksContentFromSyncContent } from '../../common/tasksSync.js';
import { IUserDataSyncStoreService } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('TasksSync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    let testObject;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp(true);
        testObject = client.getSynchronizer("tasks" /* SyncResource.Tasks */);
    });
    test('when tasks file does not exist', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
            let manifest = await client.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, [
                { type: 'GET', url: `${server.url}/v1/resource/${testObject.resource}/latest`, headers: {} },
            ]);
            assert.ok(!await fileService.exists(tasksResource));
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
            assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
            assert.strictEqual(lastSyncUserData.syncData, null);
            manifest = await client.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, []);
            manifest = await client.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('when tasks file does not exist and remote has changes', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.instantiationService.get(IFileService).writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file exists locally and remote has no tasks', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
        });
    });
    test('first time sync: when tasks file exists locally with same content as remote', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.instantiationService.get(IFileService).writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file locally has moved forward', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            fileService.writeFile(tasksResource, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': []
            })));
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
        });
    });
    test('when tasks file remotely has moved forward', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': []
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file has moved forward locally and remotely with same changes', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': []
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file has moved forward locally and remotely - accept preview', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': []
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                    }]
            })));
            await client2.sync();
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            const previewContent = (await fileService.readFile(testObject.conflicts.conflicts[0].previewResource)).value.toString();
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            assert.deepStrictEqual(testObject.conflicts.conflicts.length, 1);
            assert.deepStrictEqual(testObject.conflicts.conflicts[0].mergeState, "conflict" /* MergeState.Conflict */);
            assert.deepStrictEqual(testObject.conflicts.conflicts[0].localChange, 2 /* Change.Modified */);
            assert.deepStrictEqual(testObject.conflicts.conflicts[0].remoteChange, 2 /* Change.Modified */);
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), previewContent);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), previewContent);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), previewContent);
        });
    });
    test('when tasks file has moved forward locally and remotely - accept modified preview', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': []
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                    }]
            })));
            await client2.sync();
            fileService.writeFile(tasksResource, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            })));
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch 2'
                    }]
            });
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource, content);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file has moved forward locally and remotely - accept remote', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': []
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                    }]
            });
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            fileService.writeFile(tasksResource, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            })));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].remoteResource);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file has moved forward locally and remotely - accept local', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': []
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                    }]
            })));
            await client2.sync();
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].localResource);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file was removed in one client', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await fileService.writeFile(tasksResource, VSBuffer.fromString(JSON.stringify({
                'version': '2.0.0',
                'tasks': []
            })));
            await testObject.sync(await client.getResourceManifest());
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            await client2.sync();
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            fileService2.del(tasksResource2);
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), null);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), null);
            assert.strictEqual(await fileService.exists(tasksResource), false);
        });
    });
    test('when tasks file is created after first sync', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            await fileService.createFile(tasksResource, VSBuffer.fromString(content));
            let lastSyncUserData = await testObject.getLastSyncUserData();
            const manifest = await client.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, [
                { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': lastSyncUserData?.ref } },
            ]);
            lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
            assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
        });
    });
    test('apply remote when tasks file does not exist', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            if (await fileService.exists(tasksResource)) {
                await fileService.del(tasksResource);
            }
            const preview = (await testObject.sync(await client.getResourceManifest(), true));
            server.reset();
            const content = await testObject.resolveContent(preview.resourcePreviews[0].remoteResource);
            await testObject.accept(preview.resourcePreviews[0].remoteResource, content);
            await testObject.apply(false);
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('sync profile tasks', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const profile = await client2.instantiationService.get(IUserDataProfilesService).createNamedProfile('profile1');
            const expected = JSON.stringify({
                'version': '2.0.0',
                'tasks': [{
                        'type': 'npm',
                        'script': 'watch',
                        'label': 'Watch'
                    }]
            });
            await client2.instantiationService.get(IFileService).createFile(profile.tasksResource, VSBuffer.fromString(expected));
            await client2.sync();
            await client.sync();
            const syncedProfile = client.instantiationService.get(IUserDataProfilesService).profiles.find(p => p.id === profile.id);
            const actual = (await client.instantiationService.get(IFileService).readFile(syncedProfile.tasksResource)).value.toString();
            assert.strictEqual(actual, expected);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NTeW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL3Rhc2tzU3luYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsOEJBQThCLEVBQXFCLE1BQU0sMkJBQTJCLENBQUM7QUFDOUYsT0FBTyxFQUFVLHlCQUF5QixFQUF3QyxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXJGLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBRXZCLE1BQU0sTUFBTSxHQUFHLElBQUksc0JBQXNCLEVBQUUsQ0FBQztJQUM1QyxJQUFJLE1BQTBCLENBQUM7SUFFL0IsSUFBSSxVQUE2QixDQUFDO0lBRWxDLFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNuQixNQUFNLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJ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