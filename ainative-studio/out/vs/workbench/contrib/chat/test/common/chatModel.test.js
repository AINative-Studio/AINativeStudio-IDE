/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { URI } from '../../../../../base/common/uri.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { OffsetRange } from '../../../../../editor/common/core/offsetRange.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ChatAgentService, IChatAgentService } from '../../common/chatAgents.js';
import { ChatModel, normalizeSerializableChatData, Response } from '../../common/chatModel.js';
import { ChatRequestTextPart } from '../../common/chatParserTypes.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { TestExtensionService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
suite('ChatModel', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IStorageService, testDisposables.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IChatAgentService, testDisposables.add(instantiationService.createInstance(ChatAgentService)));
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
    });
    test('Waits for initialization', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        let hasInitialized = false;
        model.waitForInitialization().then(() => {
            hasInitialized = true;
        });
        await timeout(0);
        assert.strictEqual(hasInitialized, false);
        model.startInitialize();
        model.initialize(undefined);
        await timeout(0);
        assert.strictEqual(hasInitialized, true);
    });
    test('must call startInitialize before initialize', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        let hasInitialized = false;
        model.waitForInitialization().then(() => {
            hasInitialized = true;
        });
        await timeout(0);
        assert.strictEqual(hasInitialized, false);
        assert.throws(() => model.initialize(undefined));
        assert.strictEqual(hasInitialized, false);
    });
    test('deinitialize/reinitialize', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        let hasInitialized = false;
        model.waitForInitialization().then(() => {
            hasInitialized = true;
        });
        model.startInitialize();
        model.initialize(undefined);
        await timeout(0);
        assert.strictEqual(hasInitialized, true);
        model.deinitialize();
        let hasInitialized2 = false;
        model.waitForInitialization().then(() => {
            hasInitialized2 = true;
        });
        model.startInitialize();
        model.initialize(undefined);
        await timeout(0);
        assert.strictEqual(hasInitialized2, true);
    });
    test('cannot initialize twice', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model.startInitialize();
        model.initialize(undefined);
        assert.throws(() => model.initialize(undefined));
    });
    test('Initialization fails when model is disposed', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model.dispose();
        assert.throws(() => model.initialize(undefined));
    });
    test('removeRequest', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model.startInitialize();
        model.initialize(undefined);
        const text = 'hello';
        model.addRequest({ text, parts: [new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text)] }, { variables: [] }, 0);
        const requests = model.getRequests();
        assert.strictEqual(requests.length, 1);
        model.removeRequest(requests[0].id);
        assert.strictEqual(model.getRequests().length, 0);
    });
    test('adoptRequest', async function () {
        const model1 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Editor));
        const model2 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model1.startInitialize();
        model1.initialize(undefined);
        model2.startInitialize();
        model2.initialize(undefined);
        const text = 'hello';
        const request1 = model1.addRequest({ text, parts: [new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text)] }, { variables: [] }, 0);
        assert.strictEqual(model1.getRequests().length, 1);
        assert.strictEqual(model2.getRequests().length, 0);
        assert.ok(request1.session === model1);
        assert.ok(request1.response?.session === model1);
        model2.adoptRequest(request1);
        assert.strictEqual(model1.getRequests().length, 0);
        assert.strictEqual(model2.getRequests().length, 1);
        assert.ok(request1.session === model2);
        assert.ok(request1.response?.session === model2);
        model2.acceptResponseProgress(request1, { content: new MarkdownString('Hello'), kind: 'markdownContent' });
        assert.strictEqual(request1.response.response.toString(), 'Hello');
    });
    test('addCompleteRequest', async function () {
        const model1 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model1.startInitialize();
        model1.initialize(undefined);
        const text = 'hello';
        const request1 = model1.addRequest({ text, parts: [new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text)] }, { variables: [] }, 0, undefined, undefined, undefined, undefined, undefined, true);
        assert.strictEqual(request1.isCompleteAddedRequest, true);
        assert.strictEqual(request1.response.isCompleteAddedRequest, true);
        assert.strictEqual(request1.shouldBeRemovedOnSend, undefined);
        assert.strictEqual(request1.response.shouldBeRemovedOnSend, undefined);
    });
});
suite('Response', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('mergeable markdown', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('markdown1'), kind: 'markdownContent' });
        response.updateContent({ content: new MarkdownString('markdown2'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
        assert.strictEqual(response.toString(), 'markdown1markdown2');
    });
    test('not mergeable markdown', async () => {
        const response = store.add(new Response([]));
        const md1 = new MarkdownString('markdown1');
        md1.supportHtml = true;
        response.updateContent({ content: md1, kind: 'markdownContent' });
        response.updateContent({ content: new MarkdownString('markdown2'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
    });
    test('inline reference', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('text before '), kind: 'markdownContent' });
        response.updateContent({ inlineReference: URI.parse('https://microsoft.com/'), kind: 'inlineReference' });
        response.updateContent({ content: new MarkdownString(' text after'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
        assert.strictEqual(response.toString(), 'text before https://microsoft.com/ text after');
    });
});
suite('normalizeSerializableChatData', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('v1', () => {
        const v1Data = {
            creationDate: Date.now(),
            initialLocation: undefined,
            isImported: false,
            requesterAvatarIconUri: undefined,
            requesterUsername: 'me',
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
        };
        const newData = normalizeSerializableChatData(v1Data);
        assert.strictEqual(newData.creationDate, v1Data.creationDate);
        assert.strictEqual(newData.lastMessageDate, v1Data.creationDate);
        assert.strictEqual(newData.version, 3);
        assert.ok('customTitle' in newData);
    });
    test('v2', () => {
        const v2Data = {
            version: 2,
            creationDate: 100,
            lastMessageDate: Date.now(),
            initialLocation: undefined,
            isImported: false,
            requesterAvatarIconUri: undefined,
            requesterUsername: 'me',
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
            computedTitle: 'computed title'
        };
        const newData = normalizeSerializableChatData(v2Data);
        assert.strictEqual(newData.version, 3);
        assert.strictEqual(newData.creationDate, v2Data.creationDate);
        assert.strictEqual(newData.lastMessageDate, v2Data.lastMessageDate);
        assert.strictEqual(newData.customTitle, v2Data.computedTitle);
    });
    test('old bad data', () => {
        const v1Data = {
            // Testing the scenario where these are missing
            sessionId: undefined,
            creationDate: undefined,
            initialLocation: undefined,
            isImported: false,
            requesterAvatarIconUri: undefined,
            requesterUsername: 'me',
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
        };
        const newData = normalizeSerializableChatData(v1Data);
        assert.strictEqual(newData.version, 3);
        assert.ok(newData.creationDate > 0);
        assert.ok(newData.lastMessageDate > 0);
        assert.ok(newData.sessionId);
    });
    test('v3 with bug', () => {
        const v3Data = {
            // Test case where old data was wrongly normalized and these fields were missing
            creationDate: undefined,
            lastMessageDate: undefined,
            version: 3,
            initialLocation: undefined,
            isImported: false,
            requesterAvatarIconUri: undefined,
            requesterUsername: 'me',
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
            customTitle: 'computed title'
        };
        const newData = normalizeSerializableChatData(v3Data);
        assert.strictEqual(newData.version, 3);
        assert.ok(newData.creationDate > 0);
        assert.ok(newData.lastMessageDate > 0);
        assert.ok(newData.sessionId);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9jaGF0TW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBMEUsNkJBQTZCLEVBQUUsUUFBUSxFQUFFLE1B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