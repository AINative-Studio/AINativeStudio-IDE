/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncStoreService } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('UserDataProfilesManifestSync', () => {
    const server = new UserDataSyncTestServer();
    let testClient;
    let client2;
    let testObject;
    teardown(async () => {
        await testClient.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        testClient = disposableStore.add(new UserDataSyncClient(server));
        await testClient.setUp(true);
        testObject = testClient.getSynchronizer("profiles" /* SyncResource.Profiles */);
        client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
    });
    test('when profiles does not exist', async () => {
        await runWithFakedTimers({}, async () => {
            assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
            let manifest = await testClient.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, [
                { type: 'GET', url: `${server.url}/v1/resource/${testObject.resource}/latest`, headers: {} },
            ]);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
            assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
            assert.strictEqual(lastSyncUserData.syncData, null);
            manifest = await testClient.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, []);
            manifest = await testClient.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('when profile is created after first sync', async () => {
        await runWithFakedTimers({}, async () => {
            await testObject.sync(await testClient.getResourceManifest());
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('1', '1');
            let lastSyncUserData = await testObject.getLastSyncUserData();
            const manifest = await testClient.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, [
                { type: 'POST', url: `${server.url}/v1/collection`, headers: {} },
                { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': lastSyncUserData?.ref } },
            ]);
            lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
            assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
            assert.deepStrictEqual(JSON.parse(lastSyncUserData.syncData.content), [{ 'name': '1', 'id': '1', 'collection': '1' }]);
        });
    });
    test('first time sync - outgoing to server (no state)', async () => {
        await runWithFakedTimers({}, async () => {
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('1', '1');
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            assert.deepStrictEqual(JSON.parse(JSON.parse(content).content), [{ 'name': '1', 'id': '1', 'collection': '1' }]);
        });
    });
    test('first time sync - incoming from server (no state)', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const profiles = getLocalProfiles(testClient);
            assert.deepStrictEqual(profiles, [{ id: '1', name: 'name 1', useDefaultFlags: undefined }]);
        });
    });
    test('first time sync when profiles exists', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('2', 'name 2');
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const profiles = getLocalProfiles(testClient);
            assert.deepStrictEqual(profiles, [{ id: '1', name: 'name 1', useDefaultFlags: undefined }, { id: '2', name: 'name 2', useDefaultFlags: undefined }]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 1', collection: '1' }, { id: '2', name: 'name 2', collection: '2' }]);
        });
    });
    test('first time sync when storage exists - has conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 2');
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const profiles = getLocalProfiles(testClient);
            assert.deepStrictEqual(profiles, [{ id: '1', name: 'name 1', useDefaultFlags: undefined }]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 1', collection: '1' }]);
        });
    });
    test('sync adding a profile', async () => {
        await runWithFakedTimers({}, async () => {
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await testObject.sync(await testClient.getResourceManifest());
            await client2.sync();
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('2', 'name 2');
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            assert.deepStrictEqual(getLocalProfiles(testClient), [{ id: '1', name: 'name 1', useDefaultFlags: undefined }, { id: '2', name: 'name 2', useDefaultFlags: undefined }]);
            await client2.sync();
            assert.deepStrictEqual(getLocalProfiles(client2), [{ id: '1', name: 'name 1', useDefaultFlags: undefined }, { id: '2', name: 'name 2', useDefaultFlags: undefined }]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 1', collection: '1' }, { id: '2', name: 'name 2', collection: '2' }]);
        });
    });
    test('sync updating a profile', async () => {
        await runWithFakedTimers({}, async () => {
            const profile = await testClient.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await testObject.sync(await testClient.getResourceManifest());
            await client2.sync();
            await testClient.instantiationService.get(IUserDataProfilesService).updateProfile(profile, { name: 'name 2' });
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            assert.deepStrictEqual(getLocalProfiles(testClient), [{ id: '1', name: 'name 2', useDefaultFlags: undefined }]);
            await client2.sync();
            assert.deepStrictEqual(getLocalProfiles(client2), [{ id: '1', name: 'name 2', useDefaultFlags: undefined }]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 2', collection: '1' }]);
        });
    });
    test('sync removing a profile', async () => {
        await runWithFakedTimers({}, async () => {
            const profile = await testClient.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('2', 'name 2');
            await testObject.sync(await testClient.getResourceManifest());
            await client2.sync();
            testClient.instantiationService.get(IUserDataProfilesService).removeProfile(profile);
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            assert.deepStrictEqual(getLocalProfiles(testClient), [{ id: '2', name: 'name 2', useDefaultFlags: undefined }]);
            await client2.sync();
            assert.deepStrictEqual(getLocalProfiles(client2), [{ id: '2', name: 'name 2', useDefaultFlags: undefined }]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '2', name: 'name 2', collection: '2' }]);
        });
    });
    test('sync profile that uses default profile', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1', { useDefaultFlags: { keybindings: true } });
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 1', collection: '1', useDefaultFlags: { keybindings: true } }]);
            assert.deepStrictEqual(getLocalProfiles(testClient), [{ id: '1', name: 'name 1', useDefaultFlags: { keybindings: true } }]);
        });
    });
    test('sync profile when the profile is updated to use default profile locally', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            const profile = testClient.instantiationService.get(IUserDataProfilesService).profiles.find(p => p.id === '1');
            testClient.instantiationService.get(IUserDataProfilesService).updateProfile(profile, { useDefaultFlags: { keybindings: true } });
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 1', collection: '1', useDefaultFlags: { keybindings: true } }]);
            assert.deepStrictEqual(getLocalProfiles(testClient), [{ id: '1', name: 'name 1', useDefaultFlags: { keybindings: true } }]);
        });
    });
    test('sync profile when the profile is updated to use default profile remotely', async () => {
        await runWithFakedTimers({}, async () => {
            const profile = await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            client2.instantiationService.get(IUserDataProfilesService).updateProfile(profile, { useDefaultFlags: { keybindings: true } });
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 1', collection: '1', useDefaultFlags: { keybindings: true } }]);
            assert.deepStrictEqual(getLocalProfiles(testClient), [{ id: '1', name: 'name 1', useDefaultFlags: { keybindings: true } }]);
        });
    });
    function parseRemoteProfiles(content) {
        const syncData = JSON.parse(content);
        return JSON.parse(syncData.content);
    }
    function getLocalProfiles(client) {
        return client.instantiationService.get(IUserDataProfilesService).profiles
            .slice(1).sort((a, b) => a.name.localeCompare(b.name))
            .map(profile => ({ id: profile.id, name: profile.name, useDefaultFlags: profile.useDefaultFlags }));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc01hbmlmZXN0U3luYy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi91c2VyRGF0YVByb2ZpbGVzTWFuaWZlc3RTeW5jLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTlGLE9BQU8sRUFBbUMseUJBQXlCLEVBQTRCLE1BQU0sOEJBQThCLENBQUM7QUFDcEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckYsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtJQUUxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUM7SUFDNUMsSUFBSSxVQUE4QixDQUFDO0lBQ25DLElBQUksT0FBMkIsQ0FBQztJQUVoQyxJQUFJLFVBQWdELENBQUM7SUFFckQsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ25CLE1BQU0sVUFBVSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzlFLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxlQUFlLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUVsRSxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsVUFBVSxHQUFHLGVBQWUsQ0FB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