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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9jaGF0QWdlbnRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxnQkFBZ0IsRUFBNEMsTUFBTSw0QkFBNEIsQ0FBQztBQUV4RyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUM7QUFDaEMsTUFBTSxhQUFhLEdBQW1CO0lBQ3JDLEVBQUUsRUFBRSxXQUFXO0lBQ2YsSUFBSSxFQUFFLFlBQVk7SUFDbEIsb0JBQW9CLEVBQUUsRUFBRTtJQUN4QixXQUFXLEVBQUUsSUFBSSxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7SUFDeEMsb0JBQW9CLEVBQUUsRUFBRTtJQUN4QixTQUFTLEVBQUUsRUFBRTtJQUNiLFFBQVEsRUFBRSxFQUFFO0lBQ1osYUFBYSxFQUFFLEVBQUU7SUFDakIsY0FBYyxFQUFFLEVBQUU7Q0FDbEIsQ0FBQztBQUVGLE1BQU0sd0JBQXlCLFNBQVEscUJBQXFCO0lBQTVEOztRQUNTLG9DQUErQixHQUFHLEtBQUssQ0FBQztJQVFqRCxDQUFDO0lBUE8sOEJBQThCO1FBQ3BDLElBQUksQ0FBQywrQkFBK0IsR0FBRyxJQUFJLENBQUM7SUFDN0MsQ0FBQztJQUVlLG1CQUFtQixDQUFDLEtBQTJCO1FBQzlELE9BQU8sSUFBSSxDQUFDLCtCQUEr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