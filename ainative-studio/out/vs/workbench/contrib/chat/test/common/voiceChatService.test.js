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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vdm9pY2VDaGF0U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ2hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2hHLE9BQU8sRUFBNkgsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUl4TSxPQUFPLEVBQWlELGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFOUQsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFFdkIsTUFBTSxvQkFBb0I7UUFDekIsWUFBcUIsSUFBWSxFQUFXLFdBQW1CO1lBQTFDLFNBQUksR0FBSixJQUFJLENBQVE7WUFBVyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFJLENBQUM7S0FDcEU7SUFFRCxNQUFNLGFBQWE7UUFRbEIsWUFBcUIsRUFBVSxFQUFXLGFBQWtDO1lBQXZELE9BQUUs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