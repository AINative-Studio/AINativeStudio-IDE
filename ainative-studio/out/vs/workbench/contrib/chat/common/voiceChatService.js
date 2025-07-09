/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VoiceChatService_1;
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { rtrim } from '../../../../base/common/strings.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatAgentService } from './chatAgents.js';
import { chatAgentLeader, chatSubcommandLeader } from './chatParserTypes.js';
import { ISpeechService, SpeechToTextStatus } from '../../speech/common/speechService.js';
export const IVoiceChatService = createDecorator('voiceChatService');
var PhraseTextType;
(function (PhraseTextType) {
    PhraseTextType[PhraseTextType["AGENT"] = 1] = "AGENT";
    PhraseTextType[PhraseTextType["COMMAND"] = 2] = "COMMAND";
    PhraseTextType[PhraseTextType["AGENT_AND_COMMAND"] = 3] = "AGENT_AND_COMMAND";
})(PhraseTextType || (PhraseTextType = {}));
export const VoiceChatInProgress = new RawContextKey('voiceChatInProgress', false, { type: 'boolean', description: localize('voiceChatInProgress', "A speech-to-text session is in progress for chat.") });
let VoiceChatService = class VoiceChatService extends Disposable {
    static { VoiceChatService_1 = this; }
    static { this.AGENT_PREFIX = chatAgentLeader; }
    static { this.COMMAND_PREFIX = chatSubcommandLeader; }
    static { this.PHRASES_LOWER = {
        [this.AGENT_PREFIX]: 'at',
        [this.COMMAND_PREFIX]: 'slash'
    }; }
    static { this.PHRASES_UPPER = {
        [this.AGENT_PREFIX]: 'At',
        [this.COMMAND_PREFIX]: 'Slash'
    }; }
    static { this.CHAT_AGENT_ALIAS = new Map([['vscode', 'code']]); }
    constructor(speechService, chatAgentService, contextKeyService) {
        super();
        this.speechService = speechService;
        this.chatAgentService = chatAgentService;
        this.activeVoiceChatSessions = 0;
        this.voiceChatInProgress = VoiceChatInProgress.bindTo(contextKeyService);
    }
    createPhrases(model) {
        const phrases = new Map();
        for (const agent of this.chatAgentService.getActivatedAgents()) {
            const agentPhrase = `${VoiceChatService_1.PHRASES_LOWER[VoiceChatService_1.AGENT_PREFIX]} ${VoiceChatService_1.CHAT_AGENT_ALIAS.get(agent.name) ?? agent.name}`.toLowerCase();
            phrases.set(agentPhrase, { agent: agent.name });
            for (const slashCommand of agent.slashCommands) {
                const slashCommandPhrase = `${VoiceChatService_1.PHRASES_LOWER[VoiceChatService_1.COMMAND_PREFIX]} ${slashCommand.name}`.toLowerCase();
                phrases.set(slashCommandPhrase, { agent: agent.name, command: slashCommand.name });
                const agentSlashCommandPhrase = `${agentPhrase} ${slashCommandPhrase}`.toLowerCase();
                phrases.set(agentSlashCommandPhrase, { agent: agent.name, command: slashCommand.name });
            }
        }
        return phrases;
    }
    toText(value, type) {
        switch (type) {
            case PhraseTextType.AGENT:
                return `${VoiceChatService_1.AGENT_PREFIX}${value.agent}`;
            case PhraseTextType.COMMAND:
                return `${VoiceChatService_1.COMMAND_PREFIX}${value.command}`;
            case PhraseTextType.AGENT_AND_COMMAND:
                return `${VoiceChatService_1.AGENT_PREFIX}${value.agent} ${VoiceChatService_1.COMMAND_PREFIX}${value.command}`;
        }
    }
    async createVoiceChatSession(token, options) {
        const disposables = new DisposableStore();
        const onSessionStoppedOrCanceled = (dispose) => {
            this.activeVoiceChatSessions = Math.max(0, this.activeVoiceChatSessions - 1);
            if (this.activeVoiceChatSessions === 0) {
                this.voiceChatInProgress.reset();
            }
            if (dispose) {
                disposables.dispose();
            }
        };
        disposables.add(token.onCancellationRequested(() => onSessionStoppedOrCanceled(true)));
        let detectedAgent = false;
        let detectedSlashCommand = false;
        const emitter = disposables.add(new Emitter());
        const session = await this.speechService.createSpeechToTextSession(token, 'chat');
        if (token.isCancellationRequested) {
            onSessionStoppedOrCanceled(true);
        }
        const phrases = this.createPhrases(options.model);
        disposables.add(session.onDidChange(e => {
            switch (e.status) {
                case SpeechToTextStatus.Recognizing:
                case SpeechToTextStatus.Recognized: {
                    let massagedEvent = e;
                    if (e.text) {
                        const startsWithAgent = e.text.startsWith(VoiceChatService_1.PHRASES_UPPER[VoiceChatService_1.AGENT_PREFIX]) || e.text.startsWith(VoiceChatService_1.PHRASES_LOWER[VoiceChatService_1.AGENT_PREFIX]);
                        const startsWithSlashCommand = e.text.startsWith(VoiceChatService_1.PHRASES_UPPER[VoiceChatService_1.COMMAND_PREFIX]) || e.text.startsWith(VoiceChatService_1.PHRASES_LOWER[VoiceChatService_1.COMMAND_PREFIX]);
                        if (startsWithAgent || startsWithSlashCommand) {
                            const originalWords = e.text.split(' ');
                            let transformedWords;
                            let waitingForInput = false;
                            // Check for agent + slash command
                            if (options.usesAgents && startsWithAgent && !detectedAgent && !detectedSlashCommand && originalWords.length >= 4) {
                                const phrase = phrases.get(originalWords.slice(0, 4).map(word => this.normalizeWord(word)).join(' '));
                                if (phrase) {
                                    transformedWords = [this.toText(phrase, PhraseTextType.AGENT_AND_COMMAND), ...originalWords.slice(4)];
                                    waitingForInput = originalWords.length === 4;
                                    if (e.status === SpeechToTextStatus.Recognized) {
                                        detectedAgent = true;
                                        detectedSlashCommand = true;
                                    }
                                }
                            }
                            // Check for agent (if not done already)
                            if (options.usesAgents && startsWithAgent && !detectedAgent && !transformedWords && originalWords.length >= 2) {
                                const phrase = phrases.get(originalWords.slice(0, 2).map(word => this.normalizeWord(word)).join(' '));
                                if (phrase) {
                                    transformedWords = [this.toText(phrase, PhraseTextType.AGENT), ...originalWords.slice(2)];
                                    waitingForInput = originalWords.length === 2;
                                    if (e.status === SpeechToTextStatus.Recognized) {
                                        detectedAgent = true;
                                    }
                                }
                            }
                            // Check for slash command (if not done already)
                            if (startsWithSlashCommand && !detectedSlashCommand && !transformedWords && originalWords.length >= 2) {
                                const phrase = phrases.get(originalWords.slice(0, 2).map(word => this.normalizeWord(word)).join(' '));
                                if (phrase) {
                                    transformedWords = [this.toText(phrase, options.usesAgents && !detectedAgent ?
                                            PhraseTextType.AGENT_AND_COMMAND : // rewrite `/fix` to `@workspace /foo` in this case
                                            PhraseTextType.COMMAND // when we have not yet detected an agent before
                                        ), ...originalWords.slice(2)];
                                    waitingForInput = originalWords.length === 2;
                                    if (e.status === SpeechToTextStatus.Recognized) {
                                        detectedSlashCommand = true;
                                    }
                                }
                            }
                            massagedEvent = {
                                status: e.status,
                                text: (transformedWords ?? originalWords).join(' '),
                                waitingForInput
                            };
                        }
                    }
                    emitter.fire(massagedEvent);
                    break;
                }
                case SpeechToTextStatus.Started:
                    this.activeVoiceChatSessions++;
                    this.voiceChatInProgress.set(true);
                    emitter.fire(e);
                    break;
                case SpeechToTextStatus.Stopped:
                    onSessionStoppedOrCanceled(false);
                    emitter.fire(e);
                    break;
                case SpeechToTextStatus.Error:
                    emitter.fire(e);
                    break;
            }
        }));
        return {
            onDidChange: emitter.event
        };
    }
    normalizeWord(word) {
        word = rtrim(word, '.');
        word = rtrim(word, ',');
        word = rtrim(word, '?');
        return word.toLowerCase();
    }
};
VoiceChatService = VoiceChatService_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IChatAgentService),
    __param(2, IContextKeyService)
], VoiceChatService);
export { VoiceChatService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi92b2ljZUNoYXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQXNCLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFOUcsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFDO0FBdUN4RixJQUFLLGNBSUo7QUFKRCxXQUFLLGNBQWM7SUFDbEIscURBQVMsQ0FBQTtJQUNULHlEQUFXLENBQUE7SUFDWCw2RUFBcUIsQ0FBQTtBQUN0QixDQUFDLEVBSkksY0FBYyxLQUFkLGNBQWMsUUFJbEI7QUFFRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxx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