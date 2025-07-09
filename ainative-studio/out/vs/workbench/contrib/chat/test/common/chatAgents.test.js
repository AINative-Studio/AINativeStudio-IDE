/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ChatAgentService } from '../../common/chatAgents.js';
const testAgentId = 'testAgent';
const testAgentData = {
    id: testAgentId,
    name: 'Test Agent',
    extensionDisplayName: '',
    extensionId: new ExtensionIdentifier(''),
    extensionPublisherId: '',
    locations: [],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
};
class TestingContextKeyService extends MockContextKeyService {
    constructor() {
        super(...arguments);
        this._contextMatchesRulesReturnsTrue = false;
    }
    contextMatchesRulesReturnsTrue() {
        this._contextMatchesRulesReturnsTrue = true;
    }
    contextMatchesRules(rules) {
        return this._contextMatchesRulesReturnsTrue;
    }
}
suite('ChatAgents', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let chatAgentService;
    let contextKeyService;
    setup(() => {
        contextKeyService = new TestingContextKeyService();
        chatAgentService = store.add(new ChatAgentService(contextKeyService));
    });
    test('registerAgent', async () => {
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        const agentRegistration = chatAgentService.registerAgent(testAgentId, testAgentData);
        assert.strictEqual(chatAgentService.getAgents().length, 1);
        assert.strictEqual(chatAgentService.getAgents()[0].id, testAgentId);
        assert.throws(() => chatAgentService.registerAgent(testAgentId, testAgentData));
        agentRegistration.dispose();
        assert.strictEqual(chatAgentService.getAgents().length, 0);
    });
    test('agent when clause', async () => {
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        store.add(chatAgentService.registerAgent(testAgentId, {
            ...testAgentData,
            when: 'myKey'
        }));
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        contextKeyService.contextMatchesRulesReturnsTrue();
        assert.strictEqual(chatAgentService.getAgents().length, 1);
    });
    suite('registerAgentImplementation', function () {
        const agentImpl = {
            invoke: async () => { return {}; },
            provideFollowups: async () => { return []; },
        };
        test('should register an agent implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            store.add(chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
            const agents = chatAgentService.getActivatedAgents();
            assert.strictEqual(agents.length, 1);
            assert.strictEqual(agents[0].id, testAgentId);
        });
        test('can dispose an agent implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            const implRegistration = chatAgentService.registerAgentImplementation(testAgentId, agentImpl);
            implRegistration.dispose();
            const agents = chatAgentService.getActivatedAgents();
            assert.strictEqual(agents.length, 0);
        });
        test('should throw error if agent does not exist', () => {
            assert.throws(() => chatAgentService.registerAgentImplementation('nonexistentAgent', agentImpl));
        });
        test('should throw error if agent already has an implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            store.add(chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
            assert.throws(() => chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vY2hhdEFnZW50cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQTRDLE1BQU0sNEJBQTRCLENBQUM7QUFFeEcsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDO0FBQ2hDLE1BQU0sYUFBYSxHQUFtQjtJQUNyQyxFQUFFLEVBQUUsV0FBVztJQUNmLElBQUksRUFBRSxZQUFZO0lBQ2xCLG9CQUFvQixFQUFFLEVBQUU7SUFDeEIsV0FBVyxFQUFFLElBQUksbUJBQW1CLENBQUMsRUFBRSxDQUFDO0lBQ3hDLG9CQUFvQixFQUFFLEVBQUU7SUFDeEIsU0FBUyxFQUFFLEVBQUU7SUFDYixRQUFRLEVBQUUsRUFBRTtJQUNaLGFBQWEsRUFBRSxFQUFFO0lBQ2pCLGNBQWMsRUFBRSxFQUFFO0NBQ2xCLENBQUM7QUFFRixNQUFNLHdCQUF5QixTQUFRLHFCQUFxQjtJQUE1RDs7UUFDUyxvQ0FBK0IsR0FBRyxLQUFLLENBQUM7SUFRakQsQ0FBQztJQVBPLDhCQUE4QjtRQUNwQyxJQUFJLENBQUMsK0JBQStCLEdBQUcsSUFBSSxDQUFDO0lBQzdDLENBQUM7SUFFZSxtQkFBbUIsQ0FBQyxLQUEyQjtRQUM5RCxPQUFPLElBQUksQ0FBQywrQkFB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