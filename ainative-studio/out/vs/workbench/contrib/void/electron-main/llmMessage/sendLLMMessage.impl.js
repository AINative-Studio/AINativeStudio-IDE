/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
// disable foreign import complaints
/* eslint-disable */
import Anthropic from '@anthropic-ai/sdk';
import { Ollama } from 'ollama';
import OpenAI, { AzureOpenAI } from 'openai';
import { MistralCore } from '@mistralai/mistralai/core.js';
import { fimComplete } from '@mistralai/mistralai/funcs/fimComplete.js';
import { GoogleGenAI, Type } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import { displayInfoOfProviderName } from '../../common/voidSettingsTypes.js';
import { getSendableReasoningInfo, getModelCapabilities, getProviderCapabilities, defaultProviderSettings, getReservedOutputTokenSpace } from '../../common/modelCapabilities.js';
import { extractReasoningWrapper, extractXMLToolsWrapper } from './extractGrammar.js';
import { availableTools } from '../../common/prompt/prompts.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
const getGoogleApiKey = async () => {
    // module‑level singleton
    const auth = new GoogleAuth({ scopes: `https://www.googleapis.com/auth/cloud-platform` });
    const key = await auth.getAccessToken();
    if (!key)
        throw new Error(`Google API failed to generate a key.`);
    return key;
};
const invalidApiKeyMessage = (providerName) => `Invalid ${displayInfoOfProviderName(providerName).title} API key.`;
// ------------ OPENAI-COMPATIBLE (HELPERS) ------------
const parseHeadersJSON = (s) => {
    if (!s)
        return undefined;
    try {
        return JSON.parse(s);
    }
    catch (e) {
        throw new Error(`Error parsing OpenAI-Compatible headers: ${s} is not a valid JSON.`);
    }
};
const newOpenAICompatibleSDK = async ({ settingsOfProvider, providerName, includeInPayload }) => {
    const commonPayloadOpts = {
        dangerouslyAllowBrowser: true,
        ...includeInPayload,
    };
    if (providerName === 'openAI') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ apiKey: thisConfig.apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'ollama') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ baseURL: `${thisConfig.endpoint}/v1`, apiKey: 'noop', ...commonPayloadOpts });
    }
    else if (providerName === 'vLLM') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ baseURL: `${thisConfig.endpoint}/v1`, apiKey: 'noop', ...commonPayloadOpts });
    }
    else if (providerName === 'liteLLM') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ baseURL: `${thisConfig.endpoint}/v1`, apiKey: 'noop', ...commonPayloadOpts });
    }
    else if (providerName === 'lmStudio') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ baseURL: `${thisConfig.endpoint}/v1`, apiKey: 'noop', ...commonPayloadOpts });
    }
    else if (providerName === 'openRouter') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: thisConfig.apiKey,
            defaultHeaders: {
                'HTTP-Referer': 'https://voideditor.com', // Optional, for including your app on openrouter.ai rankings.
                'X-Title': 'Void', // Optional. Shows in rankings on openrouter.ai.
            },
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'googleVertex') {
        // https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library
        const thisConfig = settingsOfProvider[providerName];
        const baseURL = `https://${thisConfig.region}-aiplatform.googleapis.com/v1/projects/${thisConfig.project}/locations/${thisConfig.region}/endpoints/${'openapi'}`;
        const apiKey = await getGoogleApiKey();
        return new OpenAI({ baseURL: baseURL, apiKey: apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'microsoftAzure') {
        // https://learn.microsoft.com/en-us/rest/api/aifoundry/model-inference/get-chat-completions/get-chat-completions?view=rest-aifoundry-model-inference-2024-05-01-preview&tabs=HTTP
        //  https://github.com/openai/openai-node?tab=readme-ov-file#microsoft-azure-openai
        const thisConfig = settingsOfProvider[providerName];
        const endpoint = `https://${thisConfig.project}.openai.azure.com/`;
        const apiVersion = thisConfig.azureApiVersion ?? '2024-04-01-preview';
        const options = { endpoint, apiKey: thisConfig.apiKey, apiVersion };
        return new AzureOpenAI({ ...options, ...commonPayloadOpts });
    }
    else if (providerName === 'awsBedrock') {
        /**
          * We treat Bedrock as *OpenAI-compatible only through a proxy*:
          *   • LiteLLM default → http://localhost:4000/v1
          *   • Bedrock-Access-Gateway → https://<api-id>.execute-api.<region>.amazonaws.com/openai/
          *
          * The native Bedrock runtime endpoint
          *   https://bedrock-runtime.<region>.amazonaws.com
          * is **NOT** OpenAI-compatible, so we do *not* fall back to it here.
          */
        const { endpoint, apiKey } = settingsOfProvider.awsBedrock;
        // ① use the user-supplied proxy if present
        // ② otherwise default to local LiteLLM
        let baseURL = endpoint || 'http://localhost:4000/v1';
        // Normalize: make sure we end with “/v1”
        if (!baseURL.endsWith('/v1'))
            baseURL = baseURL.replace(/\/+$/, '') + '/v1';
        return new OpenAI({ baseURL, apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'deepseek') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ baseURL: 'https://api.deepseek.com/v1', apiKey: thisConfig.apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'openAICompatible') {
        const thisConfig = settingsOfProvider[providerName];
        const headers = parseHeadersJSON(thisConfig.headersJSON);
        return new OpenAI({ baseURL: thisConfig.endpoint, apiKey: thisConfig.apiKey, defaultHeaders: headers, ...commonPayloadOpts });
    }
    else if (providerName === 'groq') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: thisConfig.apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'xAI') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: thisConfig.apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'mistral') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ baseURL: 'https://api.mistral.ai/v1', apiKey: thisConfig.apiKey, ...commonPayloadOpts });
    }
    else
        throw new Error(`Void providerName was invalid: ${providerName}.`);
};
const _sendOpenAICompatibleFIM = async ({ messages: { prefix, suffix, stopTokens }, onFinalMessage, onError, settingsOfProvider, modelName: modelName_, _setAborter, providerName, overridesOfModel }) => {
    const { modelName, supportsFIM, additionalOpenAIPayload, } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    if (!supportsFIM) {
        if (modelName === modelName_)
            onError({ message: `Model ${modelName} does not support FIM.`, fullError: null });
        else
            onError({ message: `Model ${modelName_} (${modelName}) does not support FIM.`, fullError: null });
        return;
    }
    const openai = await newOpenAICompatibleSDK({ providerName, settingsOfProvider, includeInPayload: additionalOpenAIPayload });
    openai.completions
        .create({
        model: modelName,
        prompt: prefix,
        suffix: suffix,
        stop: stopTokens,
        max_tokens: 300,
    })
        .then(async (response) => {
        const fullText = response.choices[0]?.text;
        onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: null });
    })
        .catch(error => {
        if (error instanceof OpenAI.APIError && error.status === 401) {
            onError({ message: invalidApiKeyMessage(providerName), fullError: error });
        }
        else {
            onError({ message: error + '', fullError: error });
        }
    });
};
const toOpenAICompatibleTool = (toolInfo) => {
    const { name, description, params } = toolInfo;
    const paramsWithType = {};
    for (const key in params) {
        paramsWithType[key] = { ...params[key], type: 'string' };
    }
    return {
        type: 'function',
        function: {
            name: name,
            // strict: true, // strict mode - https://platform.openai.com/docs/guides/function-calling?api-mode=chat
            description: description,
            parameters: {
                type: 'object',
                properties: params,
                // required: Object.keys(params), // in strict mode, all params are required and additionalProperties is false
                // additionalProperties: false,
            },
        }
    };
};
const openAITools = (chatMode, mcpTools) => {
    const allowedTools = availableTools(chatMode, mcpTools);
    if (!allowedTools || Object.keys(allowedTools).length === 0)
        return null;
    const openAITools = [];
    for (const t in allowedTools ?? {}) {
        openAITools.push(toOpenAICompatibleTool(allowedTools[t]));
    }
    return openAITools;
};
// convert LLM tool call to our tool format
const rawToolCallObjOfParamsStr = (name, toolParamsStr, id) => {
    let input;
    try {
        input = JSON.parse(toolParamsStr);
    }
    catch (e) {
        return null;
    }
    if (input === null)
        return null;
    if (typeof input !== 'object')
        return null;
    const rawParams = input;
    return { id, name, rawParams, doneParams: Object.keys(rawParams), isDone: true };
};
const rawToolCallObjOfAnthropicParams = (toolBlock) => {
    const { id, name, input } = toolBlock;
    if (input === null)
        return null;
    if (typeof input !== 'object')
        return null;
    const rawParams = input;
    return { id, name, rawParams, doneParams: Object.keys(rawParams), isDone: true };
};
// ------------ OPENAI-COMPATIBLE ------------
const _sendOpenAICompatibleChat = async ({ messages, onText, onFinalMessage, onError, settingsOfProvider, modelSelectionOptions, modelName: modelName_, _setAborter, providerName, chatMode, separateSystemMessage, overridesOfModel, mcpTools }) => {
    const { modelName, specialToolFormat, reasoningCapabilities, additionalOpenAIPayload, } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    const { providerReasoningIOSettings } = getProviderCapabilities(providerName);
    // reasoning
    const { canIOReasoning, openSourceThinkTags } = reasoningCapabilities || {};
    const reasoningInfo = getSendableReasoningInfo('Chat', providerName, modelName_, modelSelectionOptions, overridesOfModel); // user's modelName_ here
    const includeInPayload = {
        ...providerReasoningIOSettings?.input?.includeInPayload?.(reasoningInfo),
        ...additionalOpenAIPayload
    };
    // tools
    const potentialTools = openAITools(chatMode, mcpTools);
    const nativeToolsObj = potentialTools && specialToolFormat === 'openai-style' ?
        { tools: potentialTools }
        : {};
    // instance
    const openai = await newOpenAICompatibleSDK({ providerName, settingsOfProvider, includeInPayload });
    if (providerName === 'microsoftAzure') {
        // Required to select the model
        openai.deploymentName = modelName;
    }
    const options = {
        model: modelName,
        messages: messages,
        stream: true,
        ...nativeToolsObj,
        ...additionalOpenAIPayload
        // max_completion_tokens: maxTokens,
    };
    // open source models - manually parse think tokens
    const { needsManualParse: needsManualReasoningParse, nameOfFieldInDelta: nameOfReasoningFieldInDelta } = providerReasoningIOSettings?.output ?? {};
    const manuallyParseReasoning = needsManualReasoningParse && canIOReasoning && openSourceThinkTags;
    if (manuallyParseReasoning) {
        const { newOnText, newOnFinalMessage } = extractReasoningWrapper(onText, onFinalMessage, openSourceThinkTags);
        onText = newOnText;
        onFinalMessage = newOnFinalMessage;
    }
    // manually parse out tool results if XML
    if (!specialToolFormat) {
        const { newOnText, newOnFinalMessage } = extractXMLToolsWrapper(onText, onFinalMessage, chatMode, mcpTools);
        onText = newOnText;
        onFinalMessage = newOnFinalMessage;
    }
    let fullReasoningSoFar = '';
    let fullTextSoFar = '';
    let toolName = '';
    let toolId = '';
    let toolParamsStr = '';
    openai.chat.completions
        .create(options)
        .then(async (response) => {
        _setAborter(() => response.controller.abort());
        // when receive text
        for await (const chunk of response) {
            // message
            const newText = chunk.choices[0]?.delta?.content ?? '';
            fullTextSoFar += newText;
            // tool call
            for (const tool of chunk.choices[0]?.delta?.tool_calls ?? []) {
                const index = tool.index;
                if (index !== 0)
                    continue;
                toolName += tool.function?.name ?? '';
                toolParamsStr += tool.function?.arguments ?? '';
                toolId += tool.id ?? '';
            }
            // reasoning
            let newReasoning = '';
            if (nameOfReasoningFieldInDelta) {
                // @ts-ignore
                newReasoning = (chunk.choices[0]?.delta?.[nameOfReasoningFieldInDelta] || '') + '';
                fullReasoningSoFar += newReasoning;
            }
            // call onText
            onText({
                fullText: fullTextSoFar,
                fullReasoning: fullReasoningSoFar,
                toolCall: !toolName ? undefined : { name: toolName, rawParams: {}, isDone: false, doneParams: [], id: toolId },
            });
        }
        // on final
        if (!fullTextSoFar && !fullReasoningSoFar && !toolName) {
            onError({ message: 'Void: Response from model was empty.', fullError: null });
        }
        else {
            const toolCall = rawToolCallObjOfParamsStr(toolName, toolParamsStr, toolId);
            const toolCallObj = toolCall ? { toolCall } : {};
            onFinalMessage({ fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar, anthropicReasoning: null, ...toolCallObj });
        }
    })
        // when error/fail - this catches errors of both .create() and .then(for await)
        .catch(error => {
        if (error instanceof OpenAI.APIError && error.status === 401) {
            onError({ message: invalidApiKeyMessage(providerName), fullError: error });
        }
        else {
            onError({ message: error + '', fullError: error });
        }
    });
};
const _openaiCompatibleList = async ({ onSuccess: onSuccess_, onError: onError_, settingsOfProvider, providerName }) => {
    const onSuccess = ({ models }) => {
        onSuccess_({ models });
    };
    const onError = ({ error }) => {
        onError_({ error });
    };
    try {
        const openai = await newOpenAICompatibleSDK({ providerName, settingsOfProvider });
        openai.models.list()
            .then(async (response) => {
            const models = [];
            models.push(...response.data);
            while (response.hasNextPage()) {
                models.push(...(await response.getNextPage()).data);
            }
            onSuccess({ models });
        })
            .catch((error) => {
            onError({ error: error + '' });
        });
    }
    catch (error) {
        onError({ error: error + '' });
    }
};
// ------------ ANTHROPIC (HELPERS) ------------
const toAnthropicTool = (toolInfo) => {
    const { name, description, params } = toolInfo;
    const paramsWithType = {};
    for (const key in params) {
        paramsWithType[key] = { ...params[key], type: 'string' };
    }
    return {
        name: name,
        description: description,
        input_schema: {
            type: 'object',
            properties: paramsWithType,
            // required: Object.keys(params),
        },
    };
};
const anthropicTools = (chatMode, mcpTools) => {
    const allowedTools = availableTools(chatMode, mcpTools);
    if (!allowedTools || Object.keys(allowedTools).length === 0)
        return null;
    const anthropicTools = [];
    for (const t in allowedTools ?? {}) {
        anthropicTools.push(toAnthropicTool(allowedTools[t]));
    }
    return anthropicTools;
};
// ------------ ANTHROPIC ------------
const sendAnthropicChat = async ({ messages, providerName, onText, onFinalMessage, onError, settingsOfProvider, modelSelectionOptions, overridesOfModel, modelName: modelName_, _setAborter, separateSystemMessage, chatMode, mcpTools }) => {
    const { modelName, specialToolFormat, } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    const thisConfig = settingsOfProvider.anthropic;
    const { providerReasoningIOSettings } = getProviderCapabilities(providerName);
    // reasoning
    const reasoningInfo = getSendableReasoningInfo('Chat', providerName, modelName_, modelSelectionOptions, overridesOfModel); // user's modelName_ here
    const includeInPayload = providerReasoningIOSettings?.input?.includeInPayload?.(reasoningInfo) || {};
    // anthropic-specific - max tokens
    const maxTokens = getReservedOutputTokenSpace(providerName, modelName_, { isReasoningEnabled: !!reasoningInfo?.isReasoningEnabled, overridesOfModel });
    // tools
    const potentialTools = anthropicTools(chatMode, mcpTools);
    const nativeToolsObj = potentialTools && specialToolFormat === 'anthropic-style' ?
        { tools: potentialTools, tool_choice: { type: 'auto' } }
        : {};
    // instance
    const anthropic = new Anthropic({
        apiKey: thisConfig.apiKey,
        dangerouslyAllowBrowser: true
    });
    const stream = anthropic.messages.stream({
        system: separateSystemMessage ?? undefined,
        messages: messages,
        model: modelName,
        max_tokens: maxTokens ?? 4_096, // anthropic requires this
        ...includeInPayload,
        ...nativeToolsObj,
    });
    // manually parse out tool results if XML
    if (!specialToolFormat) {
        const { newOnText, newOnFinalMessage } = extractXMLToolsWrapper(onText, onFinalMessage, chatMode, mcpTools);
        onText = newOnText;
        onFinalMessage = newOnFinalMessage;
    }
    // when receive text
    let fullText = '';
    let fullReasoning = '';
    let fullToolName = '';
    let fullToolParams = '';
    const runOnText = () => {
        onText({
            fullText,
            fullReasoning,
            toolCall: !fullToolName ? undefined : { name: fullToolName, rawParams: {}, isDone: false, doneParams: [], id: 'dummy' },
        });
    };
    // there are no events for tool_use, it comes in at the end
    stream.on('streamEvent', e => {
        // start block
        if (e.type === 'content_block_start') {
            if (e.content_block.type === 'text') {
                if (fullText)
                    fullText += '\n\n'; // starting a 2nd text block
                fullText += e.content_block.text;
                runOnText();
            }
            else if (e.content_block.type === 'thinking') {
                if (fullReasoning)
                    fullReasoning += '\n\n'; // starting a 2nd reasoning block
                fullReasoning += e.content_block.thinking;
                runOnText();
            }
            else if (e.content_block.type === 'redacted_thinking') {
                console.log('delta', e.content_block.type);
                if (fullReasoning)
                    fullReasoning += '\n\n'; // starting a 2nd reasoning block
                fullReasoning += '[redacted_thinking]';
                runOnText();
            }
            else if (e.content_block.type === 'tool_use') {
                fullToolName += e.content_block.name ?? ''; // anthropic gives us the tool name in the start block
                runOnText();
            }
        }
        // delta
        else if (e.type === 'content_block_delta') {
            if (e.delta.type === 'text_delta') {
                fullText += e.delta.text;
                runOnText();
            }
            else if (e.delta.type === 'thinking_delta') {
                fullReasoning += e.delta.thinking;
                runOnText();
            }
            else if (e.delta.type === 'input_json_delta') { // tool use
                fullToolParams += e.delta.partial_json ?? ''; // anthropic gives us the partial delta (string) here - https://docs.anthropic.com/en/api/messages-streaming
                runOnText();
            }
        }
    });
    // on done - (or when error/fail) - this is called AFTER last streamEvent
    stream.on('finalMessage', (response) => {
        const anthropicReasoning = response.content.filter(c => c.type === 'thinking' || c.type === 'redacted_thinking');
        const tools = response.content.filter(c => c.type === 'tool_use');
        // console.log('TOOLS!!!!!!', JSON.stringify(tools, null, 2))
        // console.log('TOOLS!!!!!!', JSON.stringify(response, null, 2))
        const toolCall = tools[0] && rawToolCallObjOfAnthropicParams(tools[0]);
        const toolCallObj = toolCall ? { toolCall } : {};
        onFinalMessage({ fullText, fullReasoning, anthropicReasoning, ...toolCallObj });
    });
    // on error
    stream.on('error', (error) => {
        if (error instanceof Anthropic.APIError && error.status === 401) {
            onError({ message: invalidApiKeyMessage(providerName), fullError: error });
        }
        else {
            onError({ message: error + '', fullError: error });
        }
    });
    _setAborter(() => stream.controller.abort());
};
// ------------ MISTRAL ------------
// https://docs.mistral.ai/api/#tag/fim
const sendMistralFIM = ({ messages, onFinalMessage, onError, settingsOfProvider, overridesOfModel, modelName: modelName_, _setAborter, providerName }) => {
    const { modelName, supportsFIM } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    if (!supportsFIM) {
        if (modelName === modelName_)
            onError({ message: `Model ${modelName} does not support FIM.`, fullError: null });
        else
            onError({ message: `Model ${modelName_} (${modelName}) does not support FIM.`, fullError: null });
        return;
    }
    const mistral = new MistralCore({ apiKey: settingsOfProvider.mistral.apiKey });
    fimComplete(mistral, {
        model: modelName,
        prompt: messages.prefix,
        suffix: messages.suffix,
        stream: false,
        maxTokens: 300,
        stop: messages.stopTokens,
    })
        .then(async (response) => {
        // unfortunately, _setAborter() does not exist
        let content = response?.ok ? response.value.choices?.[0]?.message?.content ?? '' : '';
        const fullText = typeof content === 'string' ? content
            : content.map(chunk => (chunk.type === 'text' ? chunk.text : '')).join('');
        onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: null });
    })
        .catch(error => {
        onError({ message: error + '', fullError: error });
    });
};
// ------------ OLLAMA ------------
const newOllamaSDK = ({ endpoint }) => {
    // if endpoint is empty, normally ollama will send to 11434, but we want it to fail - the user should type it in
    if (!endpoint)
        throw new Error(`Ollama Endpoint was empty (please enter ${defaultProviderSettings.ollama.endpoint} in Void if you want the default url).`);
    const ollama = new Ollama({ host: endpoint });
    return ollama;
};
const ollamaList = async ({ onSuccess: onSuccess_, onError: onError_, settingsOfProvider }) => {
    const onSuccess = ({ models }) => {
        onSuccess_({ models });
    };
    const onError = ({ error }) => {
        onError_({ error });
    };
    try {
        const thisConfig = settingsOfProvider.ollama;
        const ollama = newOllamaSDK({ endpoint: thisConfig.endpoint });
        ollama.list()
            .then((response) => {
            const { models } = response;
            onSuccess({ models });
        })
            .catch((error) => {
            onError({ error: error + '' });
        });
    }
    catch (error) {
        onError({ error: error + '' });
    }
};
const sendOllamaFIM = ({ messages, onFinalMessage, onError, settingsOfProvider, modelName, _setAborter }) => {
    const thisConfig = settingsOfProvider.ollama;
    const ollama = newOllamaSDK({ endpoint: thisConfig.endpoint });
    let fullText = '';
    ollama.generate({
        model: modelName,
        prompt: messages.prefix,
        suffix: messages.suffix,
        options: {
            stop: messages.stopTokens,
            num_predict: 300, // max tokens
            // repeat_penalty: 1,
        },
        raw: true,
        stream: true, // stream is not necessary but lets us expose the
    })
        .then(async (stream) => {
        _setAborter(() => stream.abort());
        for await (const chunk of stream) {
            const newText = chunk.response;
            fullText += newText;
        }
        onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: null });
    })
        // when error/fail
        .catch((error) => {
        onError({ message: error + '', fullError: error });
    });
};
// ---------------- GEMINI NATIVE IMPLEMENTATION ----------------
const toGeminiFunctionDecl = (toolInfo) => {
    const { name, description, params } = toolInfo;
    return {
        name,
        description,
        parameters: {
            type: Type.OBJECT,
            properties: Object.entries(params).reduce((acc, [key, value]) => {
                acc[key] = {
                    type: Type.STRING,
                    description: value.description
                };
                return acc;
            }, {})
        }
    };
};
const geminiTools = (chatMode, mcpTools) => {
    const allowedTools = availableTools(chatMode, mcpTools);
    if (!allowedTools || Object.keys(allowedTools).length === 0)
        return null;
    const functionDecls = [];
    for (const t in allowedTools ?? {}) {
        functionDecls.push(toGeminiFunctionDecl(allowedTools[t]));
    }
    const tools = { functionDeclarations: functionDecls, };
    return [tools];
};
// Implementation for Gemini using Google's native API
const sendGeminiChat = async ({ messages, separateSystemMessage, onText, onFinalMessage, onError, settingsOfProvider, overridesOfModel, modelName: modelName_, _setAborter, providerName, modelSelectionOptions, chatMode, mcpTools, }) => {
    if (providerName !== 'gemini')
        throw new Error(`Sending Gemini chat, but provider was ${providerName}`);
    const thisConfig = settingsOfProvider[providerName];
    const { modelName, specialToolFormat,
    // reasoningCapabilities,
     } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    // const { providerReasoningIOSettings } = getProviderCapabilities(providerName)
    // reasoning
    // const { canIOReasoning, openSourceThinkTags, } = reasoningCapabilities || {}
    const reasoningInfo = getSendableReasoningInfo('Chat', providerName, modelName_, modelSelectionOptions, overridesOfModel); // user's modelName_ here
    // const includeInPayload = providerReasoningIOSettings?.input?.includeInPayload?.(reasoningInfo) || {}
    const thinkingConfig = !reasoningInfo?.isReasoningEnabled ? undefined
        : reasoningInfo.type === 'budget_slider_value' ?
            { thinkingBudget: reasoningInfo.reasoningBudget }
            : undefined;
    // tools
    const potentialTools = geminiTools(chatMode, mcpTools);
    const toolConfig = potentialTools && specialToolFormat === 'gemini-style' ?
        potentialTools
        : undefined;
    // instance
    const genAI = new GoogleGenAI({ apiKey: thisConfig.apiKey });
    // manually parse out tool results if XML
    if (!specialToolFormat) {
        const { newOnText, newOnFinalMessage } = extractXMLToolsWrapper(onText, onFinalMessage, chatMode, mcpTools);
        onText = newOnText;
        onFinalMessage = newOnFinalMessage;
    }
    // when receive text
    let fullReasoningSoFar = '';
    let fullTextSoFar = '';
    let toolName = '';
    let toolParamsStr = '';
    let toolId = '';
    genAI.models.generateContentStream({
        model: modelName,
        config: {
            systemInstruction: separateSystemMessage,
            thinkingConfig: thinkingConfig,
            tools: toolConfig,
        },
        contents: messages,
    })
        .then(async (stream) => {
        _setAborter(() => { stream.return(fullTextSoFar); });
        // Process the stream
        for await (const chunk of stream) {
            // message
            const newText = chunk.text ?? '';
            fullTextSoFar += newText;
            // tool call
            const functionCalls = chunk.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const functionCall = functionCalls[0]; // Get the first function call
                toolName = functionCall.name ?? '';
                toolParamsStr = JSON.stringify(functionCall.args ?? {});
                toolId = functionCall.id ?? '';
            }
            // (do not handle reasoning yet)
            // call onText
            onText({
                fullText: fullTextSoFar,
                fullReasoning: fullReasoningSoFar,
                toolCall: !toolName ? undefined : { name: toolName, rawParams: {}, isDone: false, doneParams: [], id: toolId },
            });
        }
        // on final
        if (!fullTextSoFar && !fullReasoningSoFar && !toolName) {
            onError({ message: 'Void: Response from model was empty.', fullError: null });
        }
        else {
            if (!toolId)
                toolId = generateUuid(); // ids are empty, but other providers might expect an id
            const toolCall = rawToolCallObjOfParamsStr(toolName, toolParamsStr, toolId);
            const toolCallObj = toolCall ? { toolCall } : {};
            onFinalMessage({ fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar, anthropicReasoning: null, ...toolCallObj });
        }
    })
        .catch(error => {
        const message = error?.message;
        if (typeof message === 'string') {
            if (error.message?.includes('API key')) {
                onError({ message: invalidApiKeyMessage(providerName), fullError: error });
            }
            else if (error?.message?.includes('429')) {
                onError({ message: 'Rate limit reached. ' + error, fullError: error });
            }
            else
                onError({ message: error + '', fullError: error });
        }
        else {
            onError({ message: error + '', fullError: error });
        }
    });
};
export const sendLLMMessageToProviderImplementation = {
    anthropic: {
        sendChat: sendAnthropicChat,
        sendFIM: null,
        list: null,
    },
    openAI: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    xAI: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    gemini: {
        sendChat: (params) => sendGeminiChat(params),
        sendFIM: null,
        list: null,
    },
    mistral: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => sendMistralFIM(params),
        list: null,
    },
    ollama: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: sendOllamaFIM,
        list: ollamaList,
    },
    openAICompatible: {
        sendChat: (params) => _sendOpenAICompatibleChat(params), // using openai's SDK is not ideal (your implementation might not do tools, reasoning, FIM etc correctly), talk to us for a custom integration
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: null,
    },
    openRouter: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: null,
    },
    vLLM: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: (params) => _openaiCompatibleList(params),
    },
    deepseek: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    groq: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    lmStudio: {
        // lmStudio has no suffix parameter in /completions, so sendFIM might not work
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: (params) => _openaiCompatibleList(params),
    },
    liteLLM: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: null,
    },
    googleVertex: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    microsoftAzure: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    awsBedrock: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
};
/*
FIM info (this may be useful in the future with vLLM, but in most cases the only way to use FIM is if the provider explicitly supports it):

qwen2.5-coder https://ollama.com/library/qwen2.5-coder/blobs/e94a8ecb9327
<|fim_prefix|>{{ .Prompt }}<|fim_suffix|>{{ .Suffix }}<|fim_middle|>

codestral https://ollama.com/library/codestral/blobs/51707752a87c
[SUFFIX]{{ .Suffix }}[PREFIX] {{ .Prompt }}

deepseek-coder-v2 https://ollama.com/library/deepseek-coder-v2/blobs/22091531faf0
<｜fim▁begin｜>{{ .Prompt }}<｜fim▁hole｜>{{ .Suffix }}<｜fim▁end｜>

starcoder2 https://ollama.com/library/starcoder2/blobs/3b190e68fefe
<file_sep>
<fim_prefix>
{{ .Prompt }}<fim_suffix>{{ .Suffix }}<fim_middle>
<|end_of_text|>

codegemma https://ollama.com/library/codegemma:2b/blobs/48d9a8140749
<|fim_prefix|>{{ .Prompt }}<|fim_suffix|>{{ .Suffix }}<|fim_middle|>

*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuaW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi9sbG1NZXNzYWdlL3NlbmRMTE1NZXNzYWdlLmltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFFMUYsb0NBQW9DO0FBQ3BDLG9CQUFvQjtBQUNwQixPQUFPLFNBQVMsTUFBTSxtQkFBbUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ2hDLE9BQU8sTUFBTSxFQUFFLEVBQWlCLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBMkMsV0FBVyxFQUEwQixJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDbkgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBSWhELE9BQU8sRUFBWSx5QkFBeUIsRUFBNkUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuSyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsb0JBQW9CLEVBQUUsdUJBQXVCLEVBQUUsdUJBQXVCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNsTCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFvQixNQUFNLGdDQUFnQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVsRSxNQUFNLGVBQWUsR0FBRyxLQUFLLElBQUksRUFB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