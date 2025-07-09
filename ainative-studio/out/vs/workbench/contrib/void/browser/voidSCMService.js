/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ISCMService } from '../../scm/common/scm.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { gitCommitMessage_systemMessage, gitCommitMessage_userMessage } from '../common/prompt/prompts.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
export const IGenerateCommitMessageService = createDecorator('voidGenerateCommitMessageService');
const loadingContextKey = 'voidSCMGenerateCommitMessageLoading';
let GenerateCommitMessageService = class GenerateCommitMessageService extends Disposable {
    constructor(scmService, mainProcessService, voidSettingsService, convertToLLMMessageService, llmMessageService, contextKeyService, notificationService) {
        super();
        this.scmService = scmService;
        this.voidSettingsService = voidSettingsService;
        this.convertToLLMMessageService = convertToLLMMessageService;
        this.llmMessageService = llmMessageService;
        this.contextKeyService = contextKeyService;
        this.notificationService = notificationService;
        this.execute = new ThrottledDelayer(300);
        this.llmRequestId = null;
        this.currentRequestId = null;
        this.loadingContextKey = this.contextKeyService.createKey(loadingContextKey, false);
        this.voidSCM = ProxyChannel.toService(mainProcessService.getChannel('void-channel-scm'));
    }
    dispose() {
        this.execute.dispose();
        super.dispose();
    }
    async generateCommitMessage() {
        this.loadingContextKey.set(true);
        this.execute.trigger(async () => {
            const requestId = generateUuid();
            this.currentRequestId = requestId;
            try {
                const { path, repo } = this.gitRepoInfo();
                const [stat, sampledDiffs, branch, log] = await Promise.all([
                    this.voidSCM.gitStat(path),
                    this.voidSCM.gitSampledDiffs(path),
                    this.voidSCM.gitBranch(path),
                    this.voidSCM.gitLog(path)
                ]);
                if (!this.isCurrentRequest(requestId)) {
                    throw new CancellationError();
                }
                const modelSelection = this.voidSettingsService.state.modelSelectionOfFeature['SCM'] ?? null;
                const modelSelectionOptions = modelSelection ? this.voidSettingsService.state.optionsOfModelSelection['SCM'][modelSelection?.providerName]?.[modelSelection.modelName] : undefined;
                const overridesOfModel = this.voidSettingsService.state.overridesOfModel;
                const modelOptions = { modelSelection, modelSelectionOptions, overridesOfModel };
                const prompt = gitCommitMessage_userMessage(stat, sampledDiffs, branch, log);
                const simpleMessages = [{ role: 'user', content: prompt }];
                const { messages, separateSystemMessage } = this.convertToLLMMessageService.prepareLLMSimpleMessages({
                    simpleMessages,
                    systemMessage: gitCommitMessage_systemMessage,
                    modelSelection: modelOptions.modelSelection,
                    featureName: 'SCM',
                });
                const commitMessage = await this.sendLLMMessage(messages, separateSystemMessage, modelOptions);
                if (!this.isCurrentRequest(requestId)) {
                    throw new CancellationError();
                }
                repo.input.setValue(commitMessage, false);
            }
            catch (error) {
                this.onError(error);
            }
            finally {
                if (this.isCurrentRequest(requestId)) {
                    this.loadingContextKey.set(false);
                }
            }
        });
    }
    abort() {
        if (this.llmRequestId) {
            this.llmMessageService.abort(this.llmRequestId);
        }
        this.execute.cancel();
        this.loadingContextKey.set(false);
        this.currentRequestId = null;
    }
    gitRepoInfo() {
        const repo = Array.from(this.scmService.repositories || []).find((r) => r.provider.contextValue === 'git');
        if (!repo) {
            throw new Error('No git repository found');
        }
        if (!repo.provider.rootUri?.fsPath) {
            throw new Error('No git repository root path found');
        }
        return { path: repo.provider.rootUri.fsPath, repo };
    }
    /** LLM Functions */
    sendLLMMessage(messages, separateSystemMessage, modelOptions) {
        return new Promise((resolve, reject) => {
            this.llmRequestId = this.llmMessageService.sendLLMMessage({
                messagesType: 'chatMessages',
                messages,
                separateSystemMessage,
                chatMode: null,
                modelSelection: modelOptions.modelSelection,
                modelSelectionOptions: modelOptions.modelSelectionOptions,
                overridesOfModel: modelOptions.overridesOfModel,
                onText: () => { },
                onFinalMessage: (params) => {
                    const match = params.fullText.match(/<output>([\s\S]*?)<\/output>/i);
                    const commitMessage = match ? match[1].trim() : '';
                    resolve(commitMessage);
                },
                onError: (error) => {
                    console.error(error);
                    reject(error);
                },
                onAbort: () => {
                    reject(new CancellationError());
                },
                logging: { loggingName: 'VoidSCM - Commit Message' },
            });
        });
    }
    /** Request Helpers */
    isCurrentRequest(requestId) {
        return requestId === this.currentRequestId;
    }
    /** UI Functions */
    onError(error) {
        if (!isCancellationError(error)) {
            console.error(error);
            this.notificationService.error(localize2('voidFailedToGenerateCommitMessage', 'Failed to generate commit message.').value);
        }
    }
};
GenerateCommitMessageService = __decorate([
    __param(0, ISCMService),
    __param(1, IMainProcessService),
    __param(2, IVoidSettingsService),
    __param(3, IConvertToLLMMessageService),
    __param(4, ILLMMessageService),
    __param(5, IContextKeyService),
    __param(6, INotificationService)
], GenerateCommitMessageService);
class GenerateCommitMessageAction extends Action2 {
    constructor() {
        super({
            id: 'void.generateCommitMessageAction',
            title: localize2('voidCommitMessagePrompt', 'Void: Generate Commit Message'),
            icon: ThemeIcon.fromId('sparkle'),
            tooltip: localize2('voidCommitMessagePromptTooltip', 'Void: Generate Commit Message'),
            f1: true,
            menu: [{
                    id: MenuId.SCMInputBox,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('scmProvider', 'git'), ContextKeyExpr.equals(loadingContextKey, false)),
                    group: 'inline'
                }]
        });
    }
    async run(accessor) {
        const generateCommitMessageService = accessor.get(IGenerateCommitMessageService);
        generateCommitMessageService.generateCommitMessage();
    }
}
class LoadingGenerateCommitMessageAction extends Action2 {
    constructor() {
        super({
            id: 'void.loadingGenerateCommitMessageAction',
            title: localize2('voidCommitMessagePromptCancel', 'Void: Cancel Commit Message Generation'),
            icon: ThemeIcon.fromId('stop-circle'),
            tooltip: localize2('voidCommitMessagePromptCancelTooltip', 'Void: Cancel Commit Message Generation'),
            f1: false, //Having a cancel command in the command palette is more confusing than useful.
            menu: [{
                    id: MenuId.SCMInputBox,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('scmProvider', 'git'), ContextKeyExpr.equals(loadingContextKey, true)),
                    group: 'inline'
                }]
        });
    }
    async run(accessor) {
        const generateCommitMessageService = accessor.get(IGenerateCommitMessageService);
        generateCommitMessageService.abort();
    }
}
registerAction2(GenerateCommitMessageAction);
registerAction2(LoadingGenerateCommitMessageAction);
registerSingleton(IGenerateCommitMessageService, GenerateCommitMessageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNDTVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3ZvaWRTQ01TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3RILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFdkUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLDRCQUE0QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFMUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxD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