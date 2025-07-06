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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vbGxtTWVzc2FnZS9zZW5kTExNTWVzc2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUkxRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUdsRixNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsS0FBSyxFQUFFLEVBQ3BDLFlBQVksRUFDWixRQUFRLEVBQUUsU0FBUyxFQUNuQixNQUFNLEVBQUUsT0FBTyxFQUNmLGNBQWMsRUFBRSxlQUFlLEVBQy9CLE9BQU8sRUFBRSxRQUFRLEVBQ2pCLFFBQVEsRUFBRSxTQUFTLEVBQ25CLE9BQU8sRUFBRSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsRUFDdkMsa0JBQWtCLEVBQ2xCLGNBQWMsRUFDZCxxQkFBcUIsRUFDckIsZ0JBQWdCLEVBQ2hCLFFBQVEsRUFDUixxQkFBcUIsRUFDckIsUUFBUSxHQUNjLEVBRXRCLGNBQStCLEVBQzlCLEVBQUU7SUFHSCxNQUFNLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxHQUFHLGNBQWMsQ0FBQTtJQUVsRCxtR0FBbUc7SUFDbkcsTUFBTSxlQUFlLEdBQUcsQ0FBQyxPQUFlLEVBQUUsTUFBZSxFQUFFLEVBQUU7UUFHNUQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDL0IsWUFBWTtZQUNaLFNBQVM7WUFDVCxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRO1lBQzdELG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxFQUFF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