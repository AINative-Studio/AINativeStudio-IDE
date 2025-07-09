/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { ChatEditingService } from '../../browser/chatEditing/chatEditingServiceImpl.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IMultiDiffSourceResolverService } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IChatService } from '../../common/chatService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ChatService } from '../../common/chatServiceImpl.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { assertThrowsAsync, ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { MockChatVariablesService } from '../common/mockChatVariables.js';
import { ChatAgentService, IChatAgentService } from '../../common/chatAgents.js';
import { IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { URI } from '../../../../../base/common/uri.js';
import { assertType } from '../../../../../base/common/types.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { waitForState } from '../../../../../base/common/observable.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ChatAgentLocation } from '../../common/constants.js';
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
suite('ChatEditingService', function () {
    const store = new DisposableStore();
    let editingService;
    let chatService;
    let textModelService;
    setup(function () {
        const collection = new ServiceCollection();
        collection.set(IWorkbenchAssignmentService, new NullWorkbenchAssignmentService());
        collection.set(IChatAgentService, new SyncDescriptor(ChatAgentService));
        collection.set(IChatVariablesService, new MockChatVariablesService());
        collection.set(IChatSlashCommandService, new class extends mock() {
        });
        collection.set(IChatEditingService, new SyncDescriptor(ChatEditingService));
        collection.set(IChatService, new SyncDescriptor(ChatService));
        collection.set(IMultiDiffSourceResolverService, new class extends mock() {
            registerResolver(_resolver) {
                return Disposable.None;
            }
        });
        collection.set(INotebookService, new class extends mock() {
            getNotebookTextModel(_uri) {
                return undefined;
            }
            hasSupportedNotebooks(_resource) {
                return false;
            }
        });
        const insta = store.add(store.add(workbenchInstantiationService(undefined, store)).createChild(collection));
        const value = insta.get(IChatEditingService);
        assert.ok(value instanceof ChatEditingService);
        editingService = value;
        chatService = insta.get(IChatService);
        const chatAgentService = insta.get(IChatAgentService);
        const agent = {
            async invoke(request, progress, history, token) {
                return {};
            },
        };
        store.add(chatAgentService.registerAgent('testAgent', { ...getAgentData('testAgent'), isDefault: true }));
        store.add(chatAgentService.registerAgentImplementation('testAgent', agent));
        textModelService = insta.get(ITextModelService);
        const modelService = insta.get(IModelService);
        store.add(textModelService.registerTextModelContentProvider('test', {
            async provideTextContent(resource) {
                return modelService.createModel(resource.path.repeat(10), null, resource, false);
            },
        }));
    });
    teardown(() => {
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('create session', async function () {
        assert.ok(editingService);
        const model = chatService.startSession(ChatAgentLocation.EditingSession, CancellationToken.None);
        const session = await editingService.createEditingSession(model, true);
        assert.strictEqual(session.chatSessionId, model.sessionId);
        assert.strictEqual(session.isGlobalEditingSession, true);
        await assertThrowsAsync(async () => {
            // DUPE not allowed
            await editingService.createEditingSession(model);
        });
        session.dispose();
        model.dispose();
    });
    test('create session, file entry & isCurrentlyBeingModifiedBy', async function () {
        assert.ok(editingService);
        const uri = URI.from({ scheme: 'test', path: 'HelloWorld' });
        const model = chatService.startSession(ChatAgentLocation.EditingSession, CancellationToken.None);
        const session = await model.editingSessionObs?.promise;
        if (!session) {
            assert.fail('session not created');
        }
        const chatRequest = model?.addRequest({ text: '', parts: [] }, { variables: [] }, 0);
        assertType(chatRequest.response);
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: false });
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'FarBoo\n' }], done: false });
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: true });
        const entry = await waitForState(session.entries.map(value => value.find(a => isEqual(a.modifiedURI, uri))));
        assert.ok(isEqual(entry.modifiedURI, uri));
        await waitForState(entry.isCurrentlyBeingModifiedBy.map(value => value === chatRequest.response));
        assert.ok(entry.isCurrentlyBeingModifiedBy.get() === chatRequest.response);
        const unset = waitForState(entry.isCurrentlyBeingModifiedBy.map(res => res === undefined));
        chatRequest.response.complete();
        await unset;
        await entry.reject(undefined);
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2Jyb3dzZXIvY2hhdEVkaXRpbmdTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUE0QiwrQkFBK0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQy9JLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVB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