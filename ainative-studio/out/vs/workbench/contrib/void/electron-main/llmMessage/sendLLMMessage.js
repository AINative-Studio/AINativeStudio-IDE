/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi9sbG1NZXNzYWdlL3NlbmRMTE1NZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBSTFGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBR2xGLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxLQUFLLEVBQUUsRUFDcEMsWUFBWSxFQUNaLFFBQVEsRUFBRSxTQUFTLEVBQ25CLE1BQU0sRUFBRSxPQUFPLEVBQ2YsY0FBYyxFQUFFLGVBQWUsRUFDL0IsT0FBTyxFQUFFLFFBQVEsRUFDakIsUUFBUSxFQUFFLFNBQVMsRUFDbkIsT0FBTyxFQUFFLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxFQUN2QyxrQkFBa0IsRUFDbEIsY0FBYyxFQUNkLHFCQUFxQixFQUNyQixnQkFBZ0IsRUFDaEIsUUFBUSxFQUNSLHFCQUFxQixFQUNyQixRQUFRLEdBQ2MsRUFFdEIsY0FBK0IsRUFDOUIsRUFBRTtJQUdILE1BQU0sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLEdBQUcsY0FBYyxDQUFBO0lBRWxELG1HQUFtRztJQUNuRyxNQUFNLGVBQWUsR0FBRyxDQUFDLE9BQWUsRUFBRSxNQUFlLEVBQUUsRUFBRTtRQUc1RCxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUMvQixZQUFZO1lBQ1osU0FBUztZQUNULGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxFQUFFLFFBQVE7WUFDN0QsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUMsWUFBWSxDQUFD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