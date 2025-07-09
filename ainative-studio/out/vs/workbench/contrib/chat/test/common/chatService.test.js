/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { URI } from '../../../../../base/common/uri.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { IExtensionService, nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { TestContextService, TestExtensionService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { ChatAgentService, IChatAgentService } from '../../common/chatAgents.js';
import { IChatService } from '../../common/chatService.js';
import { ChatService } from '../../common/chatServiceImpl.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { MockChatService } from './mockChatService.js';
import { MockChatVariablesService } from './mockChatVariables.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
const chatAgentWithUsedContextId = 'ChatProviderWithUsedContext';
const chatAgentWithUsedContext = {
    id: chatAgentWithUsedContextId,
    name: chatAgentWithUsedContextId,
    extensionId: nullExtensionDescription.identifier,
    publisherDisplayName: '',
    extensionPublisherId: '',
    extensionDisplayName: '',
    locations: [ChatAgentLocation.Panel],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
    async invoke(request, progress, history, token) {
        progress({
            documents: [
                {
                    uri: URI.file('/test/path/to/file'),
                    version: 3,
                    ranges: [
                        new Range(1, 1, 2, 2)
                    ]
                }
            ],
            kind: 'usedContext'
        });
        return { metadata: { metadataKey: 'value' } };
    },
    async provideFollowups(sessionId, token) {
        return [{ kind: 'reply', message: 'Something else', agentId: '', tooltip: 'a tooltip' }];
    },
};
const chatAgentWithMarkdownId = 'ChatProviderWithMarkdown';
const chatAgentWithMarkdown = {
    id: chatAgentWithMarkdownId,
    name: chatAgentWithMarkdownId,
    extensionId: nullExtensionDescription.identifier,
    publisherDisplayName: '',
    extensionPublisherId: '',
    extensionDisplayName: '',
    locations: [ChatAgentLocation.Panel],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
    async invoke(request, progress, history, token) {
        progress({ kind: 'markdownContent', content: new MarkdownString('test') });
        return { metadata: { metadataKey: 'value' } };
    },
    async provideFollowups(sessionId, token) {
        return [];
    },
};
function getAgentData(id) {
    return {
        name: id,
        id: id,
        extensionId: nullExtensionDescription.identifier,
        extensionPublisherId: '',
        publisherDisplayName: '',
        extensionDisplayName: '',
        locations: [ChatAgentLocation.Panel],
        metadata: {},
        slashCommands: [],
        disambiguation: [],
    };
}
suite('ChatService', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let storageService;
    let instantiationService;
    let chatAgentService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService(new ServiceCollection([IChatVariablesService, new MockChatVariablesService()], [IWorkbenchAssignmentService, new NullWorkbenchAssignmentService()])));
        instantiationService.stub(IStorageService, storageService = testDisposables.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IViewsService, new TestExtensionService());
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        instantiationService.stub(IChatSlashCommandService, testDisposables.add(instantiationService.createInstance(ChatSlashCommandService)));
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IChatService, new MockChatService());
        instantiationService.stub(IEnvironmentService, { workspaceStorageHome: URI.file('/test/path/to/workspaceStorage') });
        instantiationService.stub(ILifecycleService, { onWillShutdown: Event.None });
        chatAgentService = testDisposables.add(instantiationService.createInstance(ChatAgentService));
        instantiationService.stub(IChatAgentService, chatAgentService);
        const agent = {
            async invoke(request, progress, history, token) {
                return {};
            },
        };
        testDisposables.add(chatAgentService.registerAgent('testAgent', { ...getAgentData('testAgent'), isDefault: true }));
        testDisposables.add(chatAgentService.registerAgent(chatAgentWithUsedContextId, getAgentData(chatAgentWithUsedContextId)));
        testDisposables.add(chatAgentService.registerAgent(chatAgentWithMarkdownId, getAgentData(chatAgentWithMarkdownId)));
        testDisposables.add(chatAgentService.registerAgentImplementation('testAgent', agent));
        chatAgentService.updateAgent('testAgent', { requester: { name: 'test' } });
    });
    test('retrieveSession', async () => {
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const session1 = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        await session1.waitForInitialization();
        session1.addRequest({ parts: [], text: 'request 1' }, { variables: [] }, 0);
        const session2 = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        await session2.waitForInitialization();
        session2.addRequest({ parts: [], text: 'request 2' }, { variables: [] }, 0);
        storageService.flush();
        const testService2 = testDisposables.add(instantiationService.createInstance(ChatService));
        const retrieved1 = testDisposables.add((await testService2.getOrRestoreSession(session1.sessionId)));
        await retrieved1.waitForInitialization();
        const retrieved2 = testDisposables.add((await testService2.getOrRestoreSession(session2.sessionId)));
        await retrieved2.waitForInitialization();
        assert.deepStrictEqual(retrieved1.getRequests()[0]?.message.text, 'request 1');
        assert.deepStrictEqual(retrieved2.getRequests()[0]?.message.text, 'request 2');
    });
    test('addCompleteRequest', async () => {
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const model = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        assert.strictEqual(model.getRequests().length, 0);
        await testService.addCompleteRequest(model.sessionId, 'test request', undefined, 0, { message: 'test response' });
        assert.strictEqual(model.getRequests().length, 1);
        assert.ok(model.getRequests()[0].response);
        assert.strictEqual(model.getRequests()[0].response?.response.toString(), 'test response');
    });
    test('sendRequest fails', async () => {
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const model = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        const response = await testService.sendRequest(model.sessionId, `@${chatAgentWithUsedContextId} test request`);
        assert(response);
        await response.responseCompletePromise;
        await assertSnapshot(toSnapshotExportData(model));
    });
    test('history', async () => {
        const historyLengthAgent = {
            async invoke(request, progress, history, token) {
                return {
                    metadata: { historyLength: history.length }
                };
            },
        };
        testDisposables.add(chatAgentService.registerAgent('defaultAgent', { ...getAgentData('defaultAgent'), isDefault: true }));
        testDisposables.add(chatAgentService.registerAgent('agent2', getAgentData('agent2')));
        testDisposables.add(chatAgentService.registerAgentImplementation('defaultAgent', historyLengthAgent));
        testDisposables.add(chatAgentService.registerAgentImplementation('agent2', historyLengthAgent));
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const model = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        // Send a request to default agent
        const response = await testService.sendRequest(model.sessionId, `test request`, { agentId: 'defaultAgent' });
        assert(response);
        await response.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 1);
        assert.strictEqual(model.getRequests()[0].response?.result?.metadata?.historyLength, 0);
        // Send a request to agent2- it can't see the default agent's message
        const response2 = await testService.sendRequest(model.sessionId, `test request`, { agentId: 'agent2' });
        assert(response2);
        await response2.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 2);
        assert.strictEqual(model.getRequests()[1].response?.result?.metadata?.historyLength, 0);
        // Send a request to defaultAgent - the default agent can see agent2's message
        const response3 = await testService.sendRequest(model.sessionId, `test request`, { agentId: 'defaultAgent' });
        assert(response3);
        await response3.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 3);
        assert.strictEqual(model.getRequests()[2].response?.result?.metadata?.historyLength, 2);
    });
    test('can serialize', async () => {
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithUsedContextId, chatAgentWithUsedContext));
        chatAgentService.updateAgent(chatAgentWithUsedContextId, { requester: { name: 'test' } });
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const model = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        assert.strictEqual(model.getRequests().length, 0);
        await assertSnapshot(toSnapshotExportData(model));
        const response = await testService.sendRequest(model.sessionId, `@${chatAgentWithUsedContextId} test request`);
        assert(response);
        await response.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 1);
        const response2 = await testService.sendRequest(model.sessionId, `test request 2`);
        assert(response2);
        await response2.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 2);
        await assertSnapshot(toSnapshotExportData(model));
    });
    test('can deserialize', async () => {
        let serializedChatData;
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithUsedContextId, chatAgentWithUsedContext));
        // create the first service, send request, get response, and serialize the state
        { // serapate block to not leak variables in outer scope
            const testService = testDisposables.add(instantiationService.createInstance(ChatService));
            const chatModel1 = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
            assert.strictEqual(chatModel1.getRequests().length, 0);
            const response = await testService.sendRequest(chatModel1.sessionId, `@${chatAgentWithUsedContextId} test request`);
            assert(response);
            await response.responseCompletePromise;
            serializedChatData = JSON.parse(JSON.stringify(chatModel1));
        }
        // try deserializing the state into a new service
        const testService2 = testDisposables.add(instantiationService.createInstance(ChatService));
        const chatModel2 = testService2.loadSessionFromContent(serializedChatData);
        assert(chatModel2);
        await assertSnapshot(toSnapshotExportData(chatModel2));
    });
    test('can deserialize with response', async () => {
        let serializedChatData;
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithMarkdownId, chatAgentWithMarkdown));
        {
            const testService = testDisposables.add(instantiationService.createInstance(ChatService));
            const chatModel1 = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
            assert.strictEqual(chatModel1.getRequests().length, 0);
            const response = await testService.sendRequest(chatModel1.sessionId, `@${chatAgentWithUsedContextId} test request`);
            assert(response);
            await response.responseCompletePromise;
            serializedChatData = JSON.parse(JSON.stringify(chatModel1));
        }
        // try deserializing the state into a new service
        const testService2 = testDisposables.add(instantiationService.createInstance(ChatService));
        const chatModel2 = testService2.loadSessionFromContent(serializedChatData);
        assert(chatModel2);
        await assertSnapshot(toSnapshotExportData(chatModel2));
    });
});
function toSnapshotExportData(model) {
    const exp = model.toExport();
    return {
        ...exp,
        requests: exp.requests.map(r => {
            return {
                ...r,
                timestamp: undefined,
                requestId: undefined, // id contains a random part
                responseId: undefined, // id contains a random part
            };
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL2NoYXRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLFdB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