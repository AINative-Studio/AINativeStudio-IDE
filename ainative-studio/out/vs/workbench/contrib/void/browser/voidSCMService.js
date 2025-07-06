/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNDTVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZFNDTVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDdEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUUxRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENB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