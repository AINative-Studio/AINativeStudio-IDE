/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { IFileService } from '../../../../files/common/files.js';
import { assertDefined } from '../../../../../base/common/types.js';
import { dirname, joinPath } from '../../../../../base/common/resources.js';
import { IEnvironmentService } from '../../../../environment/common/environment.js';
import { UserDataSyncClient, UserDataSyncTestServer } from '../userDataSyncClient.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IUserDataProfilesService } from '../../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncStoreService, PREVIEW_DIR_NAME } from '../../../common/userDataSync.js';
const PROMPT1_TEXT = 'Write a poem about a programmer who falls in love with their code.';
const PROMPT2_TEXT = 'Explain quantum physics using only emojis and cat memes.';
const PROMPT3_TEXT = 'Create a dialogue between a toaster and a refrigerator about their daily routines.';
const PROMPT4_TEXT = 'Describe a day in the life of a rubber duck debugging session.';
const PROMPT5_TEXT = 'Write a short story where a bug in the code becomes a superhero.';
const PROMPT6_TEXT = 'Imagine a world where all software bugs are sentient.\nWhat do they talk about?';
suite('PromptsSync', () => {
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
        const maybeSynchronizer = testClient.getSynchronizer("prompts" /* SyncResource.Prompts */);
        assertDefined(maybeSynchronizer, 'Prompts synchronizer object must be defined.');
        testObject = maybeSynchronizer;
        client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
    });
    test('• when prompts does not exist', async () => {
        const fileService = testClient.instantiationService.get(IFileService);
        const promptsResource = testClient.instantiationService.get(IUserDataProfilesService).defaultProfile.promptsHome;
        assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
        let manifest = await testClient.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            { type: 'GET', url: `${server.url}/v1/resource/${testObject.resource}/latest`, headers: {} },
        ]);
        assert.ok(!(await fileService.exists(promptsResource)));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        assertDefined(lastSyncUserData, 'Last sync user data must be defined.');
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
    test('• when prompt is created after first sync', async () => {
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, testClient);
        let lastSyncUserData = await testObject.getLastSyncUserData();
        const manifest = await testClient.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': lastSyncUserData?.ref } },
        ]);
        lastSyncUserData = await testObject.getLastSyncUserData();
        assertDefined(lastSyncUserData, 'Last sync user data must be defined.');
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assertDefined(lastSyncUserData.syncData, 'Last sync user sync data must be defined.');
        assert.deepStrictEqual(lastSyncUserData.syncData.content, JSON.stringify({ 'prompt3.prompt.md': PROMPT3_TEXT }));
    });
    test('• first time sync - outgoing to server (no prompts)', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, testClient);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'prompt3.prompt.md': PROMPT3_TEXT,
            'prompt1.prompt.md': PROMPT1_TEXT,
        });
    });
    test('• first time sync - incoming from server (no prompts)', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
    });
    test('• first time sync when prompts exists', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'prompt3.prompt.md': PROMPT3_TEXT,
            'prompt1.prompt.md': PROMPT1_TEXT,
        });
    });
    test('• first time sync when prompts exists - has conflicts', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'prompt3.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('• first time sync when prompts exists - has conflicts and accept conflicts', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, PROMPT3_TEXT);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'prompt3.prompt.md': PROMPT3_TEXT });
    });
    test('• first time sync when prompts exists - has multiple conflicts', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('prompt1.prompt.md', PROMPT2_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local1 = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'prompt3.prompt.md');
        const local2 = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'prompt1.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local1, local2]);
    });
    test('• first time sync when prompts exists - has multiple conflicts and accept one conflict', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('prompt1.prompt.md', PROMPT2_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        let conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, PROMPT4_TEXT);
        conflicts = testObject.conflicts.conflicts;
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'prompt1.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('• first time sync when prompts exists - has multiple conflicts and accept all conflicts', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('prompt1.prompt.md', PROMPT2_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, PROMPT4_TEXT);
        await testObject.accept(conflicts[1].previewResource, PROMPT1_TEXT);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT4_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'prompt3.prompt.md': PROMPT4_TEXT, 'prompt1.prompt.md': PROMPT1_TEXT });
    });
    test('• sync adding a prompt', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'prompt3.prompt.md': PROMPT3_TEXT, 'prompt1.prompt.md': PROMPT1_TEXT });
    });
    test('• sync adding a prompt - accept', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
    });
    test('• sync updating a prompt', async () => {
        await updatePrompt('default.prompt.md', PROMPT3_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('default.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('default.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT4_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'default.prompt.md': PROMPT4_TEXT });
    });
    test('• sync updating a prompt - accept', async () => {
        await updatePrompt('my.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('my.prompt.md', PROMPT4_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('my.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT4_TEXT);
    });
    test('• sync updating a prompt - conflict', async () => {
        await updatePrompt('some.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('some.prompt.md', PROMPT4_TEXT, client2);
        await client2.sync();
        await updatePrompt('some.prompt.md', PROMPT5_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'some.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('• sync updating a prompt - resolve conflict', async () => {
        await updatePrompt('advanced.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('advanced.prompt.md', PROMPT4_TEXT, client2);
        await client2.sync();
        await updatePrompt('advanced.prompt.md', PROMPT5_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, PROMPT4_TEXT);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('advanced.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT4_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'advanced.prompt.md': PROMPT4_TEXT });
    });
    test('• sync removing a prompt', async () => {
        await updatePrompt('another.prompt.md', PROMPT3_TEXT, testClient);
        await updatePrompt('chat.prompt.md', PROMPT1_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('another.prompt.md', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('chat.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('another.prompt.md', testClient);
        assert.strictEqual(actual2, null);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'chat.prompt.md': PROMPT1_TEXT });
    });
    test('• sync removing a prompt - accept', async () => {
        await updatePrompt('my-query.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('summarize.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('my-query.prompt.md', client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('summarize.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('my-query.prompt.md', testClient);
        assert.strictEqual(actual2, null);
    });
    test('• sync removing a prompt locally and updating it remotely', async () => {
        await updatePrompt('some.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('important.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('some.prompt.md', PROMPT4_TEXT, client2);
        await client2.sync();
        await removePrompt('some.prompt.md', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('important.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('some.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT4_TEXT);
    });
    test('• sync removing a prompt - conflict', async () => {
        await updatePrompt('common.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('rare.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('common.prompt.md', client2);
        await client2.sync();
        await updatePrompt('common.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'common.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('• sync removing a prompt - resolve conflict', async () => {
        await updatePrompt('uncommon.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('hot.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('uncommon.prompt.md', client2);
        await client2.sync();
        await updatePrompt('uncommon.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, PROMPT5_TEXT);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('hot.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('uncommon.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT5_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'hot.prompt.md': PROMPT1_TEXT, 'uncommon.prompt.md': PROMPT5_TEXT });
    });
    test('• sync removing a prompt - resolve conflict by removing', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('refactor.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('prompt3.prompt.md', client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, null);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('refactor.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual2, null);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'refactor.prompt.md': PROMPT1_TEXT });
    });
    test('• sync prompts', async () => {
        await updatePrompt('first.prompt.md', PROMPT6_TEXT, client2);
        await updatePrompt('roaming.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('roaming.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('first.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT6_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'roaming.prompt.md': PROMPT3_TEXT, 'first.prompt.md': PROMPT6_TEXT });
    });
    test('• sync should ignore non prompts', async () => {
        await updatePrompt('my.prompt.md', PROMPT6_TEXT, client2);
        await updatePrompt('html.html', PROMPT3_TEXT, client2);
        await updatePrompt('shared.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('shared.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('my.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT6_TEXT);
        const actual3 = await readPrompt('html.html', testClient);
        assert.strictEqual(actual3, null);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'shared.prompt.md': PROMPT1_TEXT, 'my.prompt.md': PROMPT6_TEXT });
    });
    test('• previews are reset after all conflicts resolved', async () => {
        await updatePrompt('html.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('css.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('html.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, PROMPT4_TEXT);
        await testObject.apply(false);
        const fileService = testClient.instantiationService.get(IFileService);
        assert.ok(!await fileService.exists(dirname(conflicts[0].previewResource)));
    });
    test('• merge when there are multiple prompts and all prompts are merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('sublime.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('tests.prompt.md', PROMPT2_TEXT, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'sublime.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'tests.prompt.md'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• merge when there are multiple prompts and all prompts are merged and applied', async () => {
        await updatePrompt('short.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('long.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• merge when there are multiple prompts and one prompt has no changes and one prompt is merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('coding.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('coding.prompt.md', PROMPT3_TEXT, testClient);
        await updatePrompt('exploring.prompt.md', PROMPT2_TEXT, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'exploring.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'coding.prompt.md'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• merge when there are multiple prompts and one prompt has no changes and prompts is merged and applied', async () => {
        await updatePrompt('quick.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('quick.prompt.md', PROMPT3_TEXT, testClient);
        await updatePrompt('databases.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• merge when there are multiple prompts with conflicts and all prompts are merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('reverse.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('recycle.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('reverse.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('recycle.prompt.md', PROMPT2_TEXT, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'reverse.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'recycle.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'reverse.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'recycle.prompt.md'),
        ]);
    });
    test('• accept when there are multiple prompts with conflicts and only one prompt is accepted', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('current.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('future.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('current.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('future.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'current.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'future.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'current.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'future.prompt.md'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, PROMPT4_TEXT);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'current.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'future.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'future.prompt.md'),
        ]);
    });
    test('• accept when there are multiple prompts with conflicts and all prompts are accepted', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('dynamic.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('static.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('dynamic.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('static.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'dynamic.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'static.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'dynamic.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'static.prompt.md'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, PROMPT4_TEXT);
        preview = await testObject.accept(preview.resourcePreviews[1].previewResource, PROMPT2_TEXT);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'dynamic.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'static.prompt.md'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• accept when there are multiple prompts with conflicts and all prompts are accepted and applied', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('edicational.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('unknown.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('edicational.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('unknown.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assertDefined(preview, 'Preview must be defined.');
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'edicational.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'unknown.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'edicational.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'unknown.prompt.md'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, PROMPT4_TEXT);
        assertDefined(preview, 'Preview must be defined after accept.');
        preview = await testObject.accept(preview.resourcePreviews[1].previewResource, PROMPT2_TEXT);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null, 'Preview after the last apply must be `null`.');
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• sync profile prompts', async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const profile = await client2.instantiationService.get(IUserDataProfilesService).createNamedProfile('profile1');
        await updatePrompt('my.prompt.md', PROMPT3_TEXT, client2, profile);
        await client2.sync();
        await testClient.sync();
        const syncedProfile = testClient.instantiationService.get(IUserDataProfilesService).profiles.find(p => p.id === profile.id);
        const content = await readPrompt('my.prompt.md', testClient, syncedProfile);
        assert.strictEqual(content, PROMPT3_TEXT);
    });
    function parsePrompts(content) {
        const syncData = JSON.parse(content);
        return JSON.parse(syncData.content);
    }
    async function updatePrompt(name, content, client, profile) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const promptsResource = joinPath((profile ?? userDataProfilesService.defaultProfile).promptsHome, name);
        await fileService.writeFile(promptsResource, VSBuffer.fromString(content));
    }
    async function removePrompt(name, client) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const promptsResource = joinPath(userDataProfilesService.defaultProfile.promptsHome, name);
        await fileService.del(promptsResource);
    }
    async function readPrompt(name, client, profile) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const promptsResource = joinPath((profile ?? userDataProfilesService.defaultProfile).promptsHome, name);
        if (await fileService.exists(promptsResource)) {
            const content = await fileService.readFile(promptsResource);
            return content.value.toString();
        }
        return null;
    }
    function assertPreviews(actual, expected) {
        assert.deepStrictEqual(actual.map(({ previewResource }) => previewResource.toString()), expected.map(uri => uri.toString()));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1N5bmMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vcHJvbXB0c1N5bmMvcHJvbXB0c1N5bmMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUc1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN0RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQW9CLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbkgsT0FBTyxFQUErQix5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBNEIsTUFBTSxpQ0FBaUMsQ0FBQztBQUVySixNQUFNLFlBQVksR0FBRyxvRUFBb0UsQ0FBQztBQUMxRixNQUFNLFlBQVksR0FBRywwREFBMEQsQ0FBQztBQUNoRixNQUFNLFlBQVksR0FBRyxvRkFBb0YsQ0FBQztBQUMxRyxNQUFNLFlBQVksR0FBRyxnRUFBZ0UsQ0FBQztBQUN0RixNQUFNLFlBQVksR0FBRyxrRUFBa0UsQ0FBQztBQUN4RixNQUFNLFlBQVksR0FBRyxpRkFBaUYs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