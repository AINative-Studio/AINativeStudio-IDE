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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3ZvaWNlQ2hhdFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUduRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNoRyxPQUFPLEVBQTZILGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJeE0sT0FBTyxFQUFpRCxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTlELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBRXZCLE1BQU0sb0JBQW9CO1FBQ3pCLFlBQXFCLElBQVksRUFBVyxXQUFtQjtZQUExQyxTQUFJLEdBQUosSUFBSSxDQUFRO1lBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBSSxDQUFDO0tBQ3BFO0lBRUQsTUFBTSxhQUFhO1FBUWxCLFlBQXFCLEVBQVUsRUFBVyxhQUFrQztZQUF2RCxP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