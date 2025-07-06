/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { SpeechToTextStatus } from '../../../speech/common/speechService.js';
import { VoiceChatService } from '../../common/voiceChatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
suite('VoiceChat', () => {
    class TestChatAgentCommand {
        constructor(name, description) {
            this.name = name;
            this.description = description;
        }
    }
    class TestChatAgent {
        constructor(id, slashCommands) {
            this.id = id;
            this.slashCommands = slashCommands;
            this.extensionId = nullExtensionDescription.identifier;
            this.extensionPublisher = '';
            this.extensionDisplayName = '';
            this.extensionPublisherId = '';
            this.locations = [ChatAgentLocation.Panel];
            this.disambiguation = [];
            this.metadata = {};
            this.name = id;
        }
        provideFollowups(request, result, history, token) {
            throw new Error('Method not implemented.');
        }
        provideSampleQuestions(location, token) {
            throw new Error('Method not implemented.');
        }
        invoke(request, progress, history, token) { throw new Error('Method not implemented.'); }
        provideWelcomeMessage(token) { throw new Error('Method not implemented.'); }
    }
    const agents = [
        new TestChatAgent('workspace', [
            new TestChatAgentCommand('fix', 'fix'),
            new TestChatAgentCommand('explain', 'explain')
        ]),
        new TestChatAgent('vscode', [
            new TestChatAgentCommand('search', 'search')
        ]),
    ];
    class TestChatAgentService {
        constructor() {
            this.onDidChangeAgents = Event.None;
            this.hasToolsAgent = false;
        }
        registerAgentImplementation(id, agent) { throw new Error(); }
        registerDynamicAgent(data, agentImpl) { throw new Error('Method not implemented.'); }
        invokeAgent(id, request, progress, history, token) { throw new Error(); }
        setRequestPaused(agent, requestId, isPaused) { throw new Error('not implemented'); }
        getFollowups(id, request, result, history, token) { throw new Error(); }
        getActivatedAgents() { return agents; }
        getAgents() { return agents; }
        getDefaultAgent() { throw new Error(); }
        getContributedDefaultAgent() { throw new Error(); }
        registerAgent(id, data) { throw new Error('Method not implemented.'); }
        getAgent(id) { throw new Error('Method not implemented.'); }
        getAgentsByName(name) { throw new Error('Method not implemented.'); }
        updateAgent(id, updateMetadata) { throw new Error('Method not implemented.'); }
        getAgentByFullyQualifiedId(id) { throw new Error('Method not implemented.'); }
        registerAgentCompletionProvider(id, provider) { throw new Error('Method not implemented.'); }
        getAgentCompletionItems(id, query, token) { throw new Error('Method not implemented.'); }
        agentHasDupeName(id) { throw new Error('Method not implemented.'); }
        getChatTitle(id, history, token) { throw new Error('Method not implemented.'); }
        hasChatParticipantDetectionProviders() {
            throw new Error('Method not implemented.');
        }
        registerChatParticipantDetectionProvider(handle, provider) {
            throw new Error('Method not implemented.');
        }
        detectAgentOrCommand(request, history, options, token) {
            throw new Error('Method not implemented.');
        }
    }
    class TestSpeechService {
        constructor() {
            this.onDidChangeHasSpeechProvider = Event.None;
            this.hasSpeechProvider = true;
            this.hasActiveSpeechToTextSession = false;
            this.hasActiveTextToSpeechSession = false;
            this.hasActiveKeywordRecognition = false;
            this.onDidStartSpeechToTextSession = Event.None;
            this.onDidEndSpeechToTextSession = Event.None;
            this.onDidStartTextToSpeechSession = Event.None;
            this.onDidEndTextToSpeechSession = Event.None;
            this.onDidStartKeywordRecognition = Event.None;
            this.onDidEndKeywordRecognition = Event.None;
        }
        registerSpeechProvider(identifier, provider) { throw new Error('Method not implemented.'); }
        async createSpeechToTextSession(token) {
            return {
                onDidChange: emitter.event
            };
        }
        async createTextToSpeechSession(token) {
            return {
                onDidChange: Event.None,
                synthesize: async () => { }
            };
        }
        recognizeKeyword(token) { throw new Error('Method not implemented.'); }
    }
    const disposables = new DisposableStore();
    let emitter;
    let service;
    let event;
    async function createSession(options) {
        const cts = new CancellationTokenSource();
        disposables.add(toDisposable(() => cts.dispose(true)));
        const session = await service.createVoiceChatSession(cts.token, options);
        disposables.add(session.onDidChange(e => {
            event = e;
        }));
    }
    setup(() => {
        emitter = disposables.add(new Emitter());
        service = disposables.add(new VoiceChatService(new TestSpeechService(), new TestChatAgentService(), new MockContextKeyService()));
    });
    teardown(() => {
        disposables.clear();
    });
    test('Agent and slash command detection (useAgents: false)', async () => {
        await testAgentsAndSlashCommandsDetection({ usesAgents: false, model: {} });
    });
    test('Agent and slash command detection (useAgents: true)', async () => {
        await testAgentsAndSlashCommandsDetection({ usesAgents: true, model: {} });
    });
    async function testAgentsAndSlashCommandsDetection(options) {
        // Nothing to detect
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Started });
        assert.strictEqual(event?.status, SpeechToTextStatus.Started);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'Hello' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, 'Hello');
        assert.strictEqual(event?.waitingForInput, undefined);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'Hello World' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, 'Hello World');
        assert.strictEqual(event?.waitingForInput, undefined);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'Hello World' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, 'Hello World');
        assert.strictEqual(event?.waitingForInput, undefined);
        // Agent
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, 'At');
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace' : 'At workspace');
        assert.strictEqual(event?.waitingForInput, options.usesAgents);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'at workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace' : 'at workspace');
        assert.strictEqual(event?.waitingForInput, options.usesAgents);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At workspace help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At workspace help');
        assert.strictEqual(event?.waitingForInput, false);
        // Agent with punctuation
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At workspace, help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At workspace, help');
        assert.strictEqual(event?.waitingForInput, false);
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At Workspace. help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At Workspace. help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At Workspace. help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At Workspace. help');
        assert.strictEqual(event?.waitingForInput, false);
        // Slash Command
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'Slash fix' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace /fix' : '/fix');
        assert.strictEqual(event?.waitingForInput, true);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'Slash fix' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace /fix' : '/fix');
        assert.strictEqual(event?.waitingForInput, true);
        // Agent + Slash Command
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At code slash search help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code slash search help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At code slash search help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code slash search help');
        assert.strictEqual(event?.waitingForInput, false);
        // Agent + Slash Command with punctuation
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At code, slash search, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code, slash search, help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At code, slash search, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code, slash search, help');
        assert.strictEqual(event?.waitingForInput, false);
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At code. slash, search help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code. slash, search help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At code. slash search, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code. slash search, help');
        assert.strictEqual(event?.waitingForInput, false);
        // Agent not detected twice
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace, for at workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace for at workspace' : 'At workspace, for at workspace');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace, for at workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace for at workspace' : 'At workspace, for at workspace');
        assert.strictEqual(event?.waitingForInput, false);
        // Slash command detected after agent recognized
        if (options.usesAgents) {
            await createSession(options);
            emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
            assert.strictEqual(event?.text, '@workspace');
            assert.strictEqual(event?.waitingForInput, true);
            emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'slash' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
            assert.strictEqual(event?.text, 'slash');
            assert.strictEqual(event?.waitingForInput, false);
            emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'slash fix' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
            assert.strictEqual(event?.text, '/fix');
            assert.strictEqual(event?.waitingForInput, true);
            emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'slash fix' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
            assert.strictEqual(event?.text, '/fix');
            assert.strictEqual(event?.waitingForInput, true);
            await createSession(options);
            emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
            assert.strictEqual(event?.text, '@workspace');
            assert.strictEqual(event?.waitingForInput, true);
            emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'slash fix' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
            assert.strictEqual(event?.text, '/fix');
            assert.strictEqual(event?.waitingForInput, true);
        }
    }
    test('waiting for input', async () => {
        // Agent
        await createSession({ usesAgents: true, model: {} });
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, '@workspace');
        assert.strictEqual(event.waitingForInput, true);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, '@workspace');
        assert.strictEqual(event.waitingForInput, true);
        // Slash Command
        await createSession({ usesAgents: true, model: {} });
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace slash explain' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, '@workspace /explain');
        assert.strictEqual(event.waitingForInput, true);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace slash explain' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, '@workspace /explain');
        assert.strictEqual(event.waitingForInput, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi92b2ljZUNoYXRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEcsT0FBTyxFQUE2SCxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSXhNLE9BQU8sRUFBaUQsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUU5RCxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUV2QixNQUFNLG9CQUFvQjtRQUN6QixZQUFxQixJQUFZLEVBQVcsV0FBbUI7WUFBMUMsU0FBSSxHQUFKLElBQUksQ0FBUTtZQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQUksQ0FBQztLQUNwRTtJQUVELE1BQU0sYUFBYTtRQVFsQixZQUFxQixFQUFVLEVBQVcsYUFBa0M7WUFBdkQsT0FBRSxHQUFGLEVBQUUsQ0FBUTtZQUFXLGtCQUFhLEdBQWIsYUFBYSxDQUFxQjtZQU41RSxnQkFBVyxHQUF3Qix3QkFBd0IsQ0FBQyxVQUFVLENBQUM7WUFDdkUsdUJBQWtCLEdBQUcsRUFBRSxDQUFDO1lBQ3hCLHlCQUFvQixHQUFHLEVBQUUsQ0FBQztZQUMxQix5QkFBb0IsR0FBRyxFQUFFLENBQUM7WUFDMUIsY0FBUyxHQUF3QixDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBVzNELG1CQUFjLEdBQW9FLEVBQUUsQ0FBQztZQVNyRixhQUFRLEdBQUcsRUFBRSxDQUFDO1lBakJiLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLENBQUM7UUFRRCxnQkFBZ0IsQ0FBRSxPQUEwQixFQUFFLE1BQXdCLEVBQUUsT0FBaUMsRUFBRSxLQUF3QjtZQUNsSSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUNELHNCQUFzQixDQUFFLFFBQTJCLEVBQUUsS0FBd0I7WUFDNUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFDRCxNQUFNLENBQUMsT0FBMEIsRUFBRSxRQUF1QyxFQUFFLE9BQWlDLEVBQUUsS0FBd0IsSUFBK0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuTixxQkFBcUIsQ0FBRSxLQUF3QixJQUE0RCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDO0tBRXhKO0lBRUQsTUFBTSxNQUFNLEdBQWlCO1FBQzVCLElBQUksYUFBYSxDQUFDLFdBQVcsRUFBRTtZQUM5QixJQUFJLG9CQUFvQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7WUFDdEMsSUFBSSxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO1NBQzlDLENBQUM7UUFDRixJQUFJLGFBQWEsQ0FBQyxRQUFRLEVBQUU7WUFDM0IsSUFBSSxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO1NBQzVDLENBQUM7S0FDRixDQUFDO0lBRUYsTUFBTSxvQkFBb0I7UUFBMUI7WUFFVSxzQkFBaUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBbUJ4QyxrQkFBYSxHQUFZLEtBQUssQ0FBQztRQVVoQyxDQUFDO1FBNUJBLDJCQUEyQixDQUFDLEVBQVUsRUFBRSxLQUErQixJQUFpQixNQUFNLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVHLG9CQUFvQixDQUFDLElBQW9CLEVBQUUsU0FBbUMsSUFBaUIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1SSxXQUFXLENBQUMsRUFBVSxFQUFFLE9BQTBCLEVBQUUsUUFBdUMsRUFBRSxPQUFpQyxFQUFFLEtBQXdCLElBQStCLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM00sZ0JBQWdCLENBQUMsS0FBYSxFQUFFLFNBQWlCLEVBQUUsUUFBaUIsSUFBVSxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25ILFlBQVksQ0FBQyxFQUFVLEVBQUUsT0FBMEIsRUFBRSxNQUF3QixFQUFFLE9BQWlDLEVBQUUsS0FBd0IsSUFBOEIsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1TCxrQkFBa0IsS0FBbUIsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3JELFNBQVMsS0FBbUIsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzVDLGVBQWUsS0FBNkIsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRSwwQkFBMEIsS0FBaUMsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRSxhQUFhLENBQUMsRUFBVSxFQUFFLElBQW9CLElBQWlCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUcsUUFBUSxDQUFDLEVBQVUsSUFBZ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRyxlQUFlLENBQUMsSUFBWSxJQUFzQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9GLFdBQVcsQ0FBQyxFQUFVLEVBQUUsY0FBa0MsSUFBVSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pILDBCQUEwQixDQUFDLEVBQVUsSUFBZ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsSCwrQkFBK0IsQ0FBQyxFQUFVLEVBQUUsUUFBMEYsSUFBaUIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwTSx1QkFBdUIsQ0FBQyxFQUFVLEVBQUUsS0FBYSxFQUFFLEtBQXdCLElBQXlDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakssZ0JBQWdCLENBQUMsRUFBVSxJQUFhLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckYsWUFBWSxDQUFDLEVBQVUsRUFBRSxPQUFpQyxFQUFFLEtBQXdCLElBQWlDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEssb0NBQW9DO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0Qsd0NBQXdDLENBQUMsTUFBYyxFQUFFLFFBQTJDO1lBQ25HLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0Qsb0JBQW9CLENBQUMsT0FBMEIsRUFBRSxPQUFpQyxFQUFFLE9BQXdDLEVBQUUsS0FBd0I7WUFDckosTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzVDLENBQUM7S0FDRDtJQUVELE1BQU0saUJBQWlCO1FBQXZCO1lBR0MsaUNBQTRCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztZQUVqQyxzQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDekIsaUNBQTRCLEdBQUcsS0FBSyxDQUFDO1lBQ3JDLGlDQUE0QixHQUFHLEtBQUssQ0FBQztZQUNyQyxnQ0FBMkIsR0FBRyxLQUFLLENBQUM7WUFHN0Msa0NBQTZCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztZQUMzQyxnQ0FBMkIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBUXpDLGtDQUE2QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDM0MsZ0NBQTJCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztZQVN6QyxpQ0FBNEIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQzFDLCtCQUEwQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFFekMsQ0FBQztRQXZCQSxzQkFBc0IsQ0FBQyxVQUFrQixFQUFFLFFBQXlCLElBQWlCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFJbEksS0FBSyxDQUFDLHlCQUF5QixDQUFDLEtBQXdCO1lBQ3ZELE9BQU87Z0JBQ04sV0FBVyxFQUFFLE9BQU8sQ0FBQyxLQUFLO2FBQzFCLENBQUM7UUFDSCxDQUFDO1FBS0QsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEtBQXdCO1lBQ3ZELE9BQU87Z0JBQ04sV0FBVyxFQUFFLEtBQUssQ0FBQyxJQUFJO2dCQUN2QixVQUFVLEVBQUUsS0FBSyxJQUFJLEVBQUUsR0FBRyxDQUFDO2FBQzNCLENBQUM7UUFDSCxDQUFDO1FBSUQsZ0JBQWdCLENBQUMsS0FBd0IsSUFBdUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM3SDtJQUVELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsSUFBSSxPQUFvQyxDQUFDO0lBRXpDLElBQUksT0FBeUIsQ0FBQztJQUM5QixJQUFJLEtBQXNDLENBQUM7SUFFM0MsS0FBSyxVQUFVLGFBQWEsQ0FBQyxPQUFpQztRQUM3RCxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6RSxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUM7UUFDN0QsT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxvQkFBb0IsRUFBRSxFQUFFLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbkksQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZFLE1BQU0sbUNBQW1DLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFnQixFQUFFLENBQUMsQ0FBQztJQUMzRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RSxNQUFNLG1DQUFtQyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBZ0IsRUFBRSxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLFVBQVUsbUNBQW1DLENBQUMsT0FBaUM7UUFFbkYsb0JBQW9CO1FBQ3BCLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdEQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdEQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdEQsUUFBUTtRQUNSLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFL0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFL0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsRCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDOUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELHlCQUF5QjtRQUN6QixNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU3QixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDL0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMvRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEQsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFN0IsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsRCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDL0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELGdCQUFnQjtRQUNoQixNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU3QixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFakQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpELHdCQUF3QjtRQUN4QixNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU3QixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDM0csTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSwyQkFBMkIsRUFBRSxDQUFDLENBQUM7UUFDM0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUMzRyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEQseUNBQXlDO1FBQ3pDLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSw2QkFBNkIsRUFBRSxDQUFDLENBQUM7UUFDOUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUM3RyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztRQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzdHLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsRCxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU3QixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDN0csTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSw2QkFBNkIsRUFBRSxDQUFDLENBQUM7UUFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUM3RyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEQsMkJBQTJCO1FBQzNCLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxnQ0FBZ0MsRUFBRSxDQUFDLENBQUM7UUFDakcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUN2SCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLGdDQUFnQyxFQUFFLENBQUMsQ0FBQztRQUNoRyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ3ZILE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsRCxnREFBZ0Q7UUFDaEQsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEIsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFN0IsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFakQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFakQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFakQsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFN0IsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFakQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFFcEMsUUFBUTtRQUNSLE1BQU0sYUFBYSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBZ0IsRUFBRSxDQUFDLENBQUM7UUFFbkUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFaEQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFaEQsZ0JBQWdCO1FBQ2hCLE1BQU0sYUFBYSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBZ0IsRUFBRSxDQUFDLENBQUM7UUFFbkUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLDRCQUE0QixFQUFFLENBQUMsQ0FBQztRQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSw0QkFBNEIsRUFBRSxDQUFDLENBQUM7UUFDNUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==