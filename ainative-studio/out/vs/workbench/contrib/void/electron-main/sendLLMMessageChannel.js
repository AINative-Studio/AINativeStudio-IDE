/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { sendLLMMessage } from './llmMessage/sendLLMMessage.js';
import { sendLLMMessageToProviderImplementation } from './llmMessage/sendLLMMessage.impl.js';
// NODE IMPLEMENTATION - calls actual sendLLMMessage() and returns listeners to it
export class LLMMessageChannel {
    // stupidly, channels can't take in @IService
    constructor(metricsService) {
        this.metricsService = metricsService;
        // sendLLMMessage
        this.llmMessageEmitters = {
            onText: new Emitter(),
            onFinalMessage: new Emitter(),
            onError: new Emitter(),
        };
        // aborters for above
        this._infoOfRunningRequest = {};
        // list
        this.listEmitters = {
            ollama: {
                success: new Emitter(),
                error: new Emitter(),
            },
            openaiCompat: {
                success: new Emitter(),
                error: new Emitter(),
            },
        };
        this._callOllamaList = (params) => {
            const { requestId } = params;
            const emitters = this.listEmitters.ollama;
            const mainThreadParams = {
                ...params,
                onSuccess: (p) => { emitters.success.fire({ requestId, ...p }); },
                onError: (p) => { emitters.error.fire({ requestId, ...p }); },
            };
            sendLLMMessageToProviderImplementation.ollama.list(mainThreadParams);
        };
        this._callOpenAICompatibleList = (params) => {
            const { requestId, providerName } = params;
            const emitters = this.listEmitters.openaiCompat;
            const mainThreadParams = {
                ...params,
                onSuccess: (p) => { emitters.success.fire({ requestId, ...p }); },
                onError: (p) => { emitters.error.fire({ requestId, ...p }); },
            };
            sendLLMMessageToProviderImplementation[providerName].list(mainThreadParams);
        };
    }
    // browser uses this to listen for changes
    listen(_, event) {
        // text
        if (event === 'onText_sendLLMMessage')
            return this.llmMessageEmitters.onText.event;
        else if (event === 'onFinalMessage_sendLLMMessage')
            return this.llmMessageEmitters.onFinalMessage.event;
        else if (event === 'onError_sendLLMMessage')
            return this.llmMessageEmitters.onError.event;
        // list
        else if (event === 'onSuccess_list_ollama')
            return this.listEmitters.ollama.success.event;
        else if (event === 'onError_list_ollama')
            return this.listEmitters.ollama.error.event;
        else if (event === 'onSuccess_list_openAICompatible')
            return this.listEmitters.openaiCompat.success.event;
        else if (event === 'onError_list_openAICompatible')
            return this.listEmitters.openaiCompat.error.event;
        else
            throw new Error(`Event not found: ${event}`);
    }
    // browser uses this to call (see this.channel.call() in llmMessageService.ts for all usages)
    async call(_, command, params) {
        try {
            if (command === 'sendLLMMessage') {
                this._callSendLLMMessage(params);
            }
            else if (command === 'abort') {
                await this._callAbort(params);
            }
            else if (command === 'ollamaList') {
                this._callOllamaList(params);
            }
            else if (command === 'openAICompatibleList') {
                this._callOpenAICompatibleList(params);
            }
            else {
                throw new Error(`Void sendLLM: command "${command}" not recognized.`);
            }
        }
        catch (e) {
            console.log('llmMessageChannel: Call Error:', e);
        }
    }
    // the only place sendLLMMessage is actually called
    _callSendLLMMessage(params) {
        const { requestId } = params;
        if (!(requestId in this._infoOfRunningRequest))
            this._infoOfRunningRequest[requestId] = { waitForSend: undefined, abortRef: { current: null } };
        const mainThreadParams = {
            ...params,
            onText: (p) => {
                this.llmMessageEmitters.onText.fire({ requestId, ...p });
            },
            onFinalMessage: (p) => {
                this.llmMessageEmitters.onFinalMessage.fire({ requestId, ...p });
            },
            onError: (p) => {
                console.log('sendLLM: firing err');
                this.llmMessageEmitters.onError.fire({ requestId, ...p });
            },
            abortRef: this._infoOfRunningRequest[requestId].abortRef,
        };
        const p = sendLLMMessage(mainThreadParams, this.metricsService);
        this._infoOfRunningRequest[requestId].waitForSend = p;
    }
    async _callAbort(params) {
        const { requestId } = params;
        if (!(requestId in this._infoOfRunningRequest))
            return;
        const { waitForSend, abortRef } = this._infoOfRunningRequest[requestId];
        await waitForSend; // wait for the send to finish so we know abortRef was set
        abortRef?.current?.();
        delete this._infoOfRunningRequest[requestId];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi9zZW5kTExNTWVzc2FnZUNoYW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFNMUYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU3RixrRkFBa0Y7QUFFbEYsTUFBTSxPQUFPLGlCQUFpQjtJQThCN0IsNkNBQTZDO0lBQzdDLFlBQ2tCLGNBQStCO1FBQS9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQTlCakQsaUJBQWlCO1FBQ0EsdUJBQWtCLEdBQUc7WUFDckMsTUFBTSxFQUFFLElBQUksT0FBTyxFQUErQjtZQUNsRCxjQUFjLEVBQUUsSUFBSSxPQUFPLEVBQXVDO1lBQ2xFLE9BQU8sRUFBRSxJQUFJLE9BQU8sRUFBZ0M7U0FDcEQsQ0FBQTtRQUVELHFCQUFxQjtRQUNKLDBCQUFxQixHQUFtRixFQUFFLENBQUE7UUFHM0gsT0FBTztRQUNVLGlCQUFZLEdBQUc7WUFDL0IsTUFBTSxFQUFFO2dCQUNQLE9BQU8sRUFBRSxJQUFJLE9BQU8sRUFBc0Q7Z0JBQzFFLEtBQUssRUFBRSxJQUFJLE9BQU8sRUFBb0Q7YUFDdEU7WUFDRCxZQUFZLEVBQUU7Z0JBQ2IsT0FBTyxFQUFFLElBQUksT0FBTyxFQUFnRTtnQkFDcEYsS0FBSyxFQUFFLElBQUksT0FBTyxFQUE4RDthQUNoRjtTQU1ELENBQUE7UUFvRkQsb0JBQWUsR0FBRyxDQUFDLE1BQWdELEVBQUUsRUFBRTtZQUN0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