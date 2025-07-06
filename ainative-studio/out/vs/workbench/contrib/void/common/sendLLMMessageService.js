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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IVoidSettingsService } from './voidSettingsService.js';
import { IMCPService } from './mcpService.js';
// calls channel to implement features
export const ILLMMessageService = createDecorator('llmMessageService');
// open this file side by side with llmMessageChannel
let LLMMessageService = class LLMMessageService extends Disposable {
    constructor(mainProcessService, voidSettingsService, mcpService) {
        super();
        this.mainProcessService = mainProcessService;
        this.voidSettingsService = voidSettingsService;
        this.mcpService = mcpService;
        // sendLLMMessage
        this.llmMessageHooks = {
            onText: {},
            onFinalMessage: {},
            onError: {},
            onAbort: {}, // NOT sent over the channel, result is instant when we call .abort()
        };
        // list hooks
        this.listHooks = {
            ollama: {
                success: {},
                error: {},
            },
            openAICompat: {
                success: {},
                error: {},
            }
        };
        this.ollamaList = (params) => {
            const { onSuccess, onError, ...proxyParams } = params;
            const { settingsOfProvider } = this.voidSettingsService.state;
            // add state for request id
            const requestId_ = generateUuid();
            this.listHooks.ollama.success[requestId_] = onSuccess;
            this.listHooks.ollama.error[requestId_] = onError;
            this.channel.call('ollamaList', {
                ...proxyParams,
                settingsOfProvider,
                providerName: 'ollama',
                requestId: requestId_,
            });
        };
        this.openAICompatibleList = (params) => {
            const { onSuccess, onError, ...proxyParams } = params;
            const { settingsOfProvider } = this.voidSettingsService.state;
            // add state for request id
            const requestId_ = generateUuid();
            this.listHooks.openAICompat.success[requestId_] = onSuccess;
            this.listHooks.openAICompat.error[requestId_] = onError;
            this.channel.call('openAICompatibleList', {
                ...proxyParams,
                settingsOfProvider,
                requestId: requestId_,
            });
        };
        // const service = ProxyChannel.toService<LLMMessageChannel>(mainProcessService.getChannel('void-channel-sendLLMMessage')); // lets you call it like a service
        // see llmMessageChannel.ts
        this.channel = this.mainProcessService.getChannel('void-channel-llmMessage');
        // .listen sets up an IPC channel and takes a few ms, so we set up listeners immediately and add hooks to them instead
        // llm
        this._register(this.channel.listen('onText_sendLLMMessage')(e => {
            this.llmMessageHooks.onText[e.requestId]?.(e);
        }));
        this._register(this.channel.listen('onFinalMessage_sendLLMMessage')(e => {
            this.llmMessageHooks.onFinalMessage[e.requestId]?.(e);
            this._clearChannelHooks(e.requestId);
        }));
        this._register(this.channel.listen('onError_sendLLMMessage')(e => {
            this.llmMessageHooks.onError[e.requestId]?.(e);
            this._clearChannelHooks(e.requestId);
            console.error('Error in LLMMessageService:', JSON.stringify(e));
        }));
        // .list()
        this._register(this.channel.listen('onSuccess_list_ollama')(e => {
            this.listHooks.ollama.success[e.requestId]?.(e);
        }));
        this._register(this.channel.listen('onError_list_ollama')(e => {
            this.listHooks.ollama.error[e.requestId]?.(e);
        }));
        this._register(this.channel.listen('onSuccess_list_openAICompatible')(e => {
            this.listHooks.openAICompat.success[e.requestId]?.(e);
        }));
        this._register(this.channel.listen('onError_list_openAICompatible')(e => {
            this.listHooks.openAICompat.error[e.requestId]?.(e);
        }));
    }
    sendLLMMessage(params) {
        const { onText, onFinalMessage, onError, onAbort, modelSelection, ...proxyParams } = params;
        // throw an error if no model/provider selected (this should usually never be reached, the UI should check this first, but might happen in cases like Apply where we haven't built much UI/checks yet, good practice to have check logic on backend)
        if (modelSelection === null) {
            const message = `Please add a provider in Void's Settings.`;
            onError({ message, fullError: null });
            return null;
        }
        if (params.messagesType === 'chatMessages' && (params.messages?.length ?? 0) === 0) {
            const message = `No messages detected.`;
            onError({ message, fullError: null });
            return null;
        }
        const { settingsOfProvider, } = this.voidSettingsService.state;
        const mcpTools = this.mcpService.getMCPTools();
        // add state for request id
        const requestId = generateUuid();
        this.llmMessageHooks.onText[requestId] = onText;
        this.llmMessageHooks.onFinalMessage[requestId] = onFinalMessage;
        this.llmMessageHooks.onError[requestId] = onError;
        this.llmMessageHooks.onAbort[requestId] = onAbort; // used internally only
        // params will be stripped of all its functions over the IPC channel
        this.channel.call('sendLLMMessage', {
            ...proxyParams,
            requestId,
            settingsOfProvider,
            modelSelection,
            mcpTools,
        });
        return requestId;
    }
    abort(requestId) {
        this.llmMessageHooks.onAbort[requestId]?.(); // calling the abort hook here is instant (doesn't go over a channel)
        this.channel.call('abort', { requestId });
        this._clearChannelHooks(requestId);
    }
    _clearChannelHooks(requestId) {
        delete this.llmMessageHooks.onText[requestId];
        delete this.llmMessageHooks.onFinalMessage[requestId];
        delete this.llmMessageHooks.onError[requestId];
        delete this.listHooks.ollama.success[requestId];
        delete this.listHooks.ollama.error[requestId];
        delete this.listHooks.openAICompat.success[requestId];
        delete this.listHooks.openAICompat.error[requestId];
    }
};
LLMMessageService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IVoidSettingsService),
    __param(2, IMCPService)
], LLMMessageService);
export { LLMMessageService };
registerSingleton(ILLMMessageService, LLMMessageService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vc2VuZExMTU1lc3NhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBSTFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFFL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFOUMsc0NBQXNDO0FBQ3RDLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQztBQVczRixxREFBcUQ7QUFDOUMsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBOEJoRCxZQUNzQixrQkFBd0QsRUFDdkQsbUJBQTBELEVBRW5FLFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFBO1FBTCtCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUVsRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBN0J0RCxpQkFBaUI7UUFDQSxvQkFBZSxHQUFHO1lBQ2xDLE1BQU0sRUFBRSxFQUE0RTtZQUNwRixj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