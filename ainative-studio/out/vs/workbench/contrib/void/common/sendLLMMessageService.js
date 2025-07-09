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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3NlbmRMTE1NZXNzYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUkxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBRS9HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTlDLHNDQUFzQztBQUN0QyxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUM7QUFXM0YscURBQXFEO0FBQzlDLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQThCaEQsWUFDc0Isa0JBQXdELEVBQ3ZELG1CQUEwRCxFQUVuRSxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQTtRQUwrQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3RDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFFbEQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQTdCdEQsaUJBQWlCO1FBQ0Esb0JBQWUsR0FBRztZQUNsQyxNQUFNLEVBQUUsRUFBNEU7WUFDcEYs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