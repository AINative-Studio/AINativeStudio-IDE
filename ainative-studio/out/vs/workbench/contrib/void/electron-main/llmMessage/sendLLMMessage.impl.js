/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuaW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vbGxtTWVzc2FnZS9zZW5kTExNTWVzc2FnZS5pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRTFGLG9DQUFvQztBQUNwQyxvQkFBb0I7QUFDcEIsT0FBTyxTQUFTLE1BQU0sbUJBQW1CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNoQyxPQUFPLE1BQU0sRUFBRSxFQUFpQixXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQTJDLFdBQVcsRUFBMEIsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUloRCxPQUFPLEVBQVkseUJBQXlCLEVBQTZFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkssT0FBTyxFQUFFLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLHVCQUF1QixFQUFFLHVCQUF1QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEwsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBb0IsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbEUsTUFBTSxlQUFlLEdBQUcsS0FBSyxJQUFJLEVB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