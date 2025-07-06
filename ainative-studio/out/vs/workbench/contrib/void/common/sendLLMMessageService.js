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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9zZW5kTExNTWVzc2FnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFJMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUUvRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU5QyxzQ0FBc0M7QUFDdEMsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixtQkFBbUIsQ0FBQyxDQUFDO0FBVzNGLHFEQUFxRDtBQUM5QyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUE4QmhELFlBQ3NCLGtCQUF3RCxFQUN2RCxtQkFBMEQsRUFFbkUsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFMK0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN0Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBRWxELGVBQVUsR0FBVixVQUFVLENBQWE7UUE3QnRELGlCQUFpQjtRQUNBLG9CQUFlLEdBQUc7WUFDbEMsTUFBTSxFQUFFLEVBQTRFO1lB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