/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { displayInfoOfProviderName } from '../../common/voidSettingsTypes.js';
import { sendLLMMessageToProviderImplementation } from './sendLLMMessage.impl.js';
export const sendLLMMessage = async ({ messagesType, messages: messages_, onText: onText_, onFinalMessage: onFinalMessage_, onError: onError_, abortRef: abortRef_, logging: { loggingName, loggingExtras }, settingsOfProvider, modelSelection, modelSelectionOptions, overridesOfModel, chatMode, separateSystemMessage, mcpTools, }, metricsService) => {
    const { providerName, modelName } = modelSelection;
    // only captures number of messages and message "shape", no actual code, instructions, prompts, etc
    const captureLLMEvent = (eventId, extras) => {
        metricsService.capture(eventId, {
            providerName,
            modelName,
            customEndpointURL: settingsOfProvider[providerName]?.endpoint,
            numModelsAtEndpoint: settingsOfProvider[providerName]?.models?.length,
            ...messagesType === 'chatMessages' ? {
                numMessages: messages_?.length,
            } : messagesType === 'FIMMessage' ? {
                prefixLength: messages_.prefix.length,
                suffixLength: messages_.suffix.length,
            } : {},
            ...loggingExtras,
            ...extras,
        });
    };
    const submit_time = new Date();
    let _fullTextSoFar = '';
    let _aborter = null;
    let _setAborter = (fn) => { _aborter = fn; };
    let _didAbort = false;
    const onText = (params) => {
        const { fullText } = params;
        if (_didAbort)
            return;
        onText_(params);
        _fullTextSoFar = fullText;
    };
    const onFinalMessage = (params) => {
        const { fullText, fullReasoning, toolCall } = params;
        if (_didAbort)
            return;
        captureLLMEvent(`${loggingName} - Received Full Message`, { messageLength: fullText.length, reasoningLength: fullReasoning?.length, duration: new Date().getMilliseconds() - submit_time.getMilliseconds(), toolCallName: toolCall?.name });
        onFinalMessage_(params);
    };
    const onError = ({ message: errorMessage, fullError }) => {
        if (_didAbort)
            return;
        console.error('sendLLMMessage onError:', errorMessage);
        // handle failed to fetch errors, which give 0 information by design
        if (errorMessage === 'TypeError: fetch failed')
            errorMessage = `Failed to fetch from ${displayInfoOfProviderName(providerName).title}. This likely means you specified the wrong endpoint in Void's Settings, or your local model provider like Ollama is powered off.`;
        captureLLMEvent(`${loggingName} - Error`, { error: errorMessage });
        onError_({ message: errorMessage, fullError });
    };
    // we should NEVER call onAbort internally, only from the outside
    const onAbort = () => {
        captureLLMEvent(`${loggingName} - Abort`, { messageLengthSoFar: _fullTextSoFar.length });
        try {
            _aborter?.();
        } // aborter sometimes automatically throws an error
        catch (e) { }
        _didAbort = true;
    };
    abortRef_.current = onAbort;
    if (messagesType === 'chatMessages')
        captureLLMEvent(`${loggingName} - Sending Message`, {});
    else if (messagesType === 'FIMMessage')
        captureLLMEvent(`${loggingName} - Sending FIM`, { prefixLen: messages_?.prefix?.length, suffixLen: messages_?.suffix?.length });
    try {
        const implementation = sendLLMMessageToProviderImplementation[providerName];
        if (!implementation) {
            onError({ message: `Error: Provider "${providerName}" not recognized.`, fullError: null });
            return;
        }
        const { sendFIM, sendChat } = implementation;
        if (messagesType === 'chatMessages') {
            await sendChat({ messages: messages_, onText, onFinalMessage, onError, settingsOfProvider, modelSelectionOptions, overridesOfModel, modelName, _setAborter, providerName, separateSystemMessage, chatMode, mcpTools });
            return;
        }
        if (messagesType === 'FIMMessage') {
            if (sendFIM) {
                await sendFIM({ messages: messages_, onText, onFinalMessage, onError, settingsOfProvider, modelSelectionOptions, overridesOfModel, modelName, _setAborter, providerName, separateSystemMessage });
                return;
            }
            onError({ message: `Error running Autocomplete with ${providerName} - ${modelName}.`, fullError: null });
            return;
        }
        onError({ message: `Error: Message type "${messagesType}" not recognized.`, fullError: null });
        return;
    }
    catch (error) {
        if (error instanceof Error) {
            onError({ message: error + '', fullError: error });
        }
        else {
            onError({ message: `Unexpected Error in sendLLMMessage: ${error}`, fullError: error });
        }
        // ; (_aborter as any)?.()
        // _didAbort = true
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL2xsbU1lc3NhZ2Uvc2VuZExMTU1lc3NhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFJMUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHbEYsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLEtBQUssRUFBRSxFQUNwQyxZQUFZLEVBQ1osUUFBUSxFQUFFLFNBQVMsRUFDbkIsTUFBTSxFQUFFLE9BQU8sRUFDZixjQUFjLEVBQUUsZUFBZSxFQUMvQixPQUFPLEVBQUUsUUFBUSxFQUNqQixRQUFRLEVBQUUsU0FBUyxFQUNuQixPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLEVBQ3ZDLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QscUJBQXFCLEVBQ3JCLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IscUJBQXFCLEVBQ3JCLFFBQVEsR0FDYyxFQUV0QixjQUErQixFQUM5QixFQUFFO0lBR0gsTUFBTSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsR0FBRyxjQUFjLENBQUE7SUFFbEQsbUdBQW1HO0lBQ25HLE1BQU0sZUFBZSxHQUFHLENBQUMsT0FBZSxFQUFFLE1BQWUsRUFBRSxFQUFFO1FBRzVELGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQy9CLFlBQVk7WUFDWixTQUFTO1lBQ1QsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEVBQUUsUUFBUTtZQUM3RCxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsRUFB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