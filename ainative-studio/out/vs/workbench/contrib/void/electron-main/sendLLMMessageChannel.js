/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL3NlbmRMTE1NZXNzYWdlQ2hhbm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQU0xRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTdGLGtGQUFrRjtBQUVsRixNQUFNLE9BQU8saUJBQWlCO0lBOEI3Qiw2Q0FBNkM7SUFDN0MsWUFDa0IsY0FBK0I7UUFBL0IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBOUJqRCxpQkFBaUI7UUFDQSx1QkFBa0IsR0FBRztZQUNyQyxNQUFNLEVBQUUsSUFBSSxPQUFPLEVBQStCO1lBQ2xELGNBQWMsRUFBRSxJQUFJLE9BQU8sRUFBdUM7WUFDbEUsT0FBTyxFQUFFLElBQUksT0FBTyxFQUFnQztTQUNwRCxDQUFBO1FBRUQscUJBQXFCO1FBQ0osMEJBQXFCLEdBQW1GLEVBQUUsQ0FBQTtRQUczSCxPQUFPO1FBQ1UsaUJBQVksR0FBRztZQUMvQixNQUFNLEVBQUU7Z0JBQ1AsT0FBTyxFQUFFLElBQUksT0FBTyxFQUFzRDtnQkFDMUUsS0FBSyxFQUFFLElBQUksT0FBTyxFQUFvRDthQUN0RTtZQUNELFlBQVksRUFBRTtnQkFDYixPQUFPLEVBQUUsSUFBSSxPQUFPLEVBQWdFO2dCQUNwRixLQUFLLEVBQUUsSUFBSSxPQUFPLEVBQThEO2FBQ2hGO1NBTUQsQ0FBQTtRQW9GRCxvQkFBZSxHQUFHLENBQUMsTUFBZ0QsRUFBRSxFQUFFO1lBQ3RF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