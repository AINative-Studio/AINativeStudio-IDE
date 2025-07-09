/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { ContextKeyEqualsExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { LanguageModelToolsService } from '../../browser/languageModelToolsService.js';
import { IChatService } from '../../common/chatService.js';
import { MockChatService } from '../common/mockChatService.js';
import { CancellationError, isCancellationError } from '../../../../../base/common/errors.js';
import { Barrier } from '../../../../../base/common/async.js';
suite('LanguageModelToolsService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let contextKeyService;
    let service;
    let chatService;
    setup(() => {
        const instaService = workbenchInstantiationService({
            contextKeyService: () => store.add(new ContextKeyService(new TestConfigurationService)),
        }, store);
        contextKeyService = instaService.get(IContextKeyService);
        chatService = new MockChatService();
        instaService.stub(IChatService, chatService);
        service = store.add(instaService.createInstance(LanguageModelToolsService));
    });
    test('registerToolData', () => {
        const toolData = {
            id: 'testTool',
            modelDescription: 'Test Tool',
            displayName: 'Test Tool',
            source: { type: 'internal' },
        };
        const disposable = service.registerToolData(toolData);
        assert.strictEqual(service.getTool('testTool')?.id, 'testTool');
        disposable.dispose();
        assert.strictEqual(service.getTool('testTool'), undefined);
    });
    test('registerToolImplementation', () => {
        const toolData = {
            id: 'testTool',
            modelDescription: 'Test Tool',
            displayName: 'Test Tool',
            source: { type: 'internal' },
        };
        store.add(service.registerToolData(toolData));
        const toolImpl = {
            invoke: async () => ({ content: [{ kind: 'text', value: 'result' }] }),
        };
        store.add(service.registerToolImplementation('testTool', toolImpl));
        assert.strictEqual(service.getTool('testTool')?.id, 'testTool');
    });
    test('getTools', () => {
        contextKeyService.createKey('testKey', true);
        const toolData1 = {
            id: 'testTool1',
            modelDescription: 'Test Tool 1',
            when: ContextKeyEqualsExpr.create('testKey', false),
            displayName: 'Test Tool',
            source: { type: 'internal' },
        };
        const toolData2 = {
            id: 'testTool2',
            modelDescription: 'Test Tool 2',
            when: ContextKeyEqualsExpr.create('testKey', true),
            displayName: 'Test Tool',
            source: { type: 'internal' },
        };
        const toolData3 = {
            id: 'testTool3',
            modelDescription: 'Test Tool 3',
            displayName: 'Test Tool',
            source: { type: 'internal' },
        };
        store.add(service.registerToolData(toolData1));
        store.add(service.registerToolData(toolData2));
        store.add(service.registerToolData(toolData3));
        const tools = Array.from(service.getTools());
        assert.strictEqual(tools.length, 2);
        assert.strictEqual(tools[0].id, 'testTool2');
        assert.strictEqual(tools[1].id, 'testTool3');
    });
    test('invokeTool', async () => {
        const toolData = {
            id: 'testTool',
            modelDescription: 'Test Tool',
            displayName: 'Test Tool',
            source: { type: 'internal' },
        };
        store.add(service.registerToolData(toolData));
        const toolImpl = {
            invoke: async (invocation) => {
                assert.strictEqual(invocation.callId, '1');
                assert.strictEqual(invocation.toolId, 'testTool');
                assert.deepStrictEqual(invocation.parameters, { a: 1 });
                return { content: [{ kind: 'text', value: 'result' }] };
            }
        };
        store.add(service.registerToolImplementation('testTool', toolImpl));
        const dto = {
            callId: '1',
            toolId: 'testTool',
            tokenBudget: 100,
            parameters: {
                a: 1
            },
            context: undefined,
        };
        const result = await service.invokeTool(dto, async () => 0, CancellationToken.None);
        assert.strictEqual(result.content[0].value, 'result');
    });
    test('cancel tool call', async () => {
        const toolData = {
            id: 'testTool',
            modelDescription: 'Test Tool',
            displayName: 'Test Tool',
            source: { type: 'internal' },
        };
        store.add(service.registerToolData(toolData));
        const toolBarrier = new Barrier();
        const toolImpl = {
            invoke: async (invocation, countTokens, cancelToken) => {
                assert.strictEqual(invocation.callId, '1');
                assert.strictEqual(invocation.toolId, 'testTool');
                assert.deepStrictEqual(invocation.parameters, { a: 1 });
                await toolBarrier.wait();
                if (cancelToken.isCancellationRequested) {
                    throw new CancellationError();
                }
                else {
                    throw new Error('Tool call should be cancelled');
                }
            }
        };
        store.add(service.registerToolImplementation('testTool', toolImpl));
        const sessionId = 'sessionId';
        const requestId = 'requestId';
        const dto = {
            callId: '1',
            toolId: 'testTool',
            tokenBudget: 100,
            parameters: {
                a: 1
            },
            context: {
                sessionId
            },
        };
        chatService.addSession({
            sessionId: sessionId,
            getRequests: () => {
                return [{
                        id: requestId
                    }];
            },
            acceptResponseProgress: () => { }
        });
        const toolPromise = service.invokeTool(dto, async () => 0, CancellationToken.None);
        service.cancelToolCallsForRequest(requestId);
        toolBarrier.open();
        await assert.rejects(toolPromise, err => {
            return isCancellationError(err);
        }, 'Expected tool call to be cancelled');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9icm93c2VyL2xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV2RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxpQkFB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