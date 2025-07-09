/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
export const defaultProviderSettings = {
    anthropic: {
        apiKey: '',
    },
    openAI: {
        apiKey: '',
    },
    deepseek: {
        apiKey: '',
    },
    ollama: {
        endpoint: 'http://127.0.0.1:11434',
    },
    vLLM: {
        endpoint: 'http://localhost:8000',
    },
    openRouter: {
        apiKey: '',
    },
    openAICompatible: {
        endpoint: '',
        apiKey: '',
        headersJSON: '{}', // default to {}
    },
    gemini: {
        apiKey: '',
    },
    groq: {
        apiKey: '',
    },
    xAI: {
        apiKey: '',
    },
    mistral: {
        apiKey: '',
    },
    lmStudio: {
        endpoint: 'http://localhost:1234',
    },
    liteLLM: {
        endpoint: '',
    },
    googleVertex: {
        region: 'us-west2',
        project: '',
    },
    microsoftAzure: {
        project: '', // really 'resource'
        apiKey: '',
        azureApiVersion: '2024-05-01-preview',
    },
    awsBedrock: {
        apiKey: '',
        region: 'us-east-1', // add region setting
        endpoint: '', // optionally allow overriding default
    },
};
export const defaultModelsOfProvider = {
    openAI: [
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano',
        'o3',
        'o4-mini',
        // 'o1',
        // 'o1-mini',
        // 'gpt-4o',
        // 'gpt-4o-mini',
    ],
    anthropic: [
        'claude-opus-4-0',
        'claude-sonnet-4-0',
        'claude-3-7-sonnet-latest',
        'claude-3-5-sonnet-latest',
        'claude-3-5-haiku-latest',
        'claude-3-opus-latest',
    ],
    xAI: [
        'grok-2',
        'grok-3',
        'grok-3-mini',
        'grok-3-fast',
        'grok-3-mini-fast'
    ],
    gemini: [
        'gemini-2.5-pro-exp-03-25',
        'gemini-2.5-flash-preview-04-17',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.5-pro-preview-05-06',
    ],
    deepseek: [
        'deepseek-chat',
        'deepseek-reasoner',
    ],
    ollama: [ // autodetected
    ],
    vLLM: [ // autodetected
    ],
    lmStudio: [], // autodetected
    openRouter: [
        // 'anthropic/claude-3.7-sonnet:thinking',
        'anthropic/claude-opus-4',
        'anthropic/claude-sonnet-4',
        'qwen/qwen3-235b-a22b',
        'anthropic/claude-3.7-sonnet',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-r1-zero:free',
        'mistralai/devstral-small:free'
        // 'openrouter/quasar-alpha',
        // 'google/gemini-2.5-pro-preview-03-25',
        // 'mistralai/codestral-2501',
        // 'qwen/qwen-2.5-coder-32b-instruct',
        // 'mistralai/mistral-small-3.1-24b-instruct:free',
        // 'google/gemini-2.0-flash-lite-preview-02-05:free',
        // 'google/gemini-2.0-pro-exp-02-05:free',
        // 'google/gemini-2.0-flash-exp:free',
    ],
    groq: [
        'qwen-qwq-32b',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        // 'qwen-2.5-coder-32b', // preview mode (experimental)
    ],
    mistral: [
        'codestral-latest',
        'devstral-small-latest',
        'mistral-large-latest',
        'mistral-medium-latest',
        'ministral-3b-latest',
        'ministral-8b-latest',
    ],
    openAICompatible: [], // fallback
    googleVertex: [],
    microsoftAzure: [],
    awsBedrock: [],
    liteLLM: [],
};
// if you change the above type, remember to update the Settings link
export const modelOverrideKeys = [
    'contextWindow',
    'reservedOutputTokenSpace',
    'supportsSystemMessage',
    'specialToolFormat',
    'supportsFIM',
    'reasoningCapabilities',
    'additionalOpenAIPayload'
];
const defaultModelOptions = {
    contextWindow: 4_096,
    reservedOutputTokenSpace: 4_096,
    cost: { input: 0, output: 0 },
    downloadable: false,
    supportsSystemMessage: false,
    supportsFIM: false,
    reasoningCapabilities: false,
};
// TODO!!! double check all context sizes below
// TODO!!! add openrouter common models
// TODO!!! allow user to modify capabilities and tell them if autodetected model or falling back
const openSourceModelOptions_assumingOAICompat = {
    'deepseekR1': {
        supportsFIM: false,
        supportsSystemMessage: false,
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    'deepseekCoderV3': {
        supportsFIM: false,
        supportsSystemMessage: false, // unstable
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    'deepseekCoderV2': {
        supportsFIM: false,
        supportsSystemMessage: false, // unstable
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    'codestral': {
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    'devstral': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 131_000, reservedOutputTokenSpace: 8_192,
    },
    'openhands-lm-32b': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false, // built on qwen 2.5 32B instruct
        contextWindow: 128_000, reservedOutputTokenSpace: 4_096
    },
    // really only phi4-reasoning supports reasoning... simpler to combine them though
    'phi4': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: true, canIOReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
        contextWindow: 16_000, reservedOutputTokenSpace: 4_096,
    },
    'gemma': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    // llama 4 https://ai.meta.com/blog/llama-4-multimodal-intelligence/
    'llama4-scout': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 10_000_000, reservedOutputTokenSpace: 4_096,
    },
    'llama4-maverick': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 10_000_000, reservedOutputTokenSpace: 4_096,
    },
    // llama 3
    'llama3': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    'llama3.1': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    'llama3.2': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    'llama3.3': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    // qwen
    'qwen2.5coder': {
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000, reservedOutputTokenSpace: 4_096,
    },
    'qwq': {
        supportsFIM: false, // no FIM, yes reasoning
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
        contextWindow: 128_000, reservedOutputTokenSpace: 8_192,
    },
    'qwen3': {
        supportsFIM: false, // replaces QwQ
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: true, canIOReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
        contextWindow: 32_768, reservedOutputTokenSpace: 8_192,
    },
    // FIM only
    'starcoder2': {
        supportsFIM: true,
        supportsSystemMessage: false,
        reasoningCapabilities: false,
        contextWindow: 128_000, reservedOutputTokenSpace: 8_192,
    },
    'codegemma:2b': {
        supportsFIM: true,
        supportsSystemMessage: false,
        reasoningCapabilities: false,
        contextWindow: 128_000, reservedOutputTokenSpace: 8_192,
    },
    'quasar': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 1_000_000, reservedOutputTokenSpace: 32_000,
    }
};
// keep modelName, but use the fallback's defaults
const extensiveModelOptionsFallback = (modelName, fallbackKnownValues) => {
    const lower = modelName.toLowerCase();
    const toFallback = (obj, recognizedModelName) => {
        const opts = obj[recognizedModelName];
        const supportsSystemMessage = opts.supportsSystemMessage === 'separated'
            ? 'system-role'
            : opts.supportsSystemMessage;
        return {
            recognizedModelName,
            modelName,
            ...opts,
            supportsSystemMessage: supportsSystemMessage,
            cost: { input: 0, output: 0 },
            downloadable: false,
            ...fallbackKnownValues
        };
    };
    if (lower.includes('gemini') && (lower.includes('2.5') || lower.includes('2-5')))
        return toFallback(geminiModelOptions, 'gemini-2.5-pro-exp-03-25');
    if (lower.includes('claude-3-5') || lower.includes('claude-3.5'))
        return toFallback(anthropicModelOptions, 'claude-3-5-sonnet-20241022');
    if (lower.includes('claude'))
        return toFallback(anthropicModelOptions, 'claude-3-7-sonnet-20250219');
    if (lower.includes('grok2') || lower.includes('grok2'))
        return toFallback(xAIModelOptions, 'grok-2');
    if (lower.includes('grok'))
        return toFallback(xAIModelOptions, 'grok-3');
    if (lower.includes('deepseek-r1') || lower.includes('deepseek-reasoner'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'deepseekR1');
    if (lower.includes('deepseek') && lower.includes('v2'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'deepseekCoderV2');
    if (lower.includes('deepseek'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'deepseekCoderV3');
    if (lower.includes('llama3'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama3');
    if (lower.includes('llama3.1'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama3.1');
    if (lower.includes('llama3.2'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama3.2');
    if (lower.includes('llama3.3'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama3.3');
    if (lower.includes('llama') || lower.includes('scout'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama4-scout');
    if (lower.includes('llama') || lower.includes('maverick'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama4-scout');
    if (lower.includes('llama'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama4-scout');
    if (lower.includes('qwen') && lower.includes('2.5') && lower.includes('coder'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'qwen2.5coder');
    if (lower.includes('qwen') && lower.includes('3'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'qwen3');
    if (lower.includes('qwen'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'qwen3');
    if (lower.includes('qwq')) {
        return toFallback(openSourceModelOptions_assumingOAICompat, 'qwq');
    }
    if (lower.includes('phi4'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'phi4');
    if (lower.includes('codestral'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'codestral');
    if (lower.includes('devstral'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'devstral');
    if (lower.includes('gemma'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'gemma');
    if (lower.includes('starcoder2'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'starcoder2');
    if (lower.includes('openhands'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'openhands-lm-32b'); // max output uncler
    if (lower.includes('quasar') || lower.includes('quaser'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'quasar');
    if (lower.includes('gpt') && lower.includes('mini') && (lower.includes('4.1') || lower.includes('4-1')))
        return toFallback(openAIModelOptions, 'gpt-4.1-mini');
    if (lower.includes('gpt') && lower.includes('nano') && (lower.includes('4.1') || lower.includes('4-1')))
        return toFallback(openAIModelOptions, 'gpt-4.1-nano');
    if (lower.includes('gpt') && (lower.includes('4.1') || lower.includes('4-1')))
        return toFallback(openAIModelOptions, 'gpt-4.1');
    if (lower.includes('4o') && lower.includes('mini'))
        return toFallback(openAIModelOptions, 'gpt-4o-mini');
    if (lower.includes('4o'))
        return toFallback(openAIModelOptions, 'gpt-4o');
    if (lower.includes('o1') && lower.includes('mini'))
        return toFallback(openAIModelOptions, 'o1-mini');
    if (lower.includes('o1'))
        return toFallback(openAIModelOptions, 'o1');
    if (lower.includes('o3') && lower.includes('mini'))
        return toFallback(openAIModelOptions, 'o3-mini');
    if (lower.includes('o3'))
        return toFallback(openAIModelOptions, 'o3');
    if (lower.includes('o4') && lower.includes('mini'))
        return toFallback(openAIModelOptions, 'o4-mini');
    if (Object.keys(openSourceModelOptions_assumingOAICompat).map(k => k.toLowerCase()).includes(lower))
        return toFallback(openSourceModelOptions_assumingOAICompat, lower);
    return null;
};
// ---------------- ANTHROPIC ----------------
const anthropicModelOptions = {
    'claude-3-7-sonnet-20250219': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 3.00, cache_read: 0.30, cache_write: 3.75, output: 15.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: true,
            reasoningReservedOutputTokenSpace: 8192, // can bump it to 128_000 with beta mode output-128k-2025-02-19
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // they recommend batching if max > 32_000. we cap at 8192 because above is typically not necessary (often even buggy)
        },
    },
    'claude-opus-4-20250514': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 15.00, cache_read: 1.50, cache_write: 18.75, output: 30.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: true,
            reasoningReservedOutputTokenSpace: 8192, // can bump it to 128_000 with beta mode output-128k-2025-02-19
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // they recommend batching if max > 32_000. we cap at 8192 because above is typically not necessary (often even buggy)
        },
    },
    'claude-sonnet-4-20250514': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 3.00, cache_read: 0.30, cache_write: 3.75, output: 6.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: true,
            reasoningReservedOutputTokenSpace: 8192, // can bump it to 128_000 with beta mode output-128k-2025-02-19
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // they recommend batching if max > 32_000. we cap at 8192 because above is typically not necessary (often even buggy)
        },
    },
    'claude-3-5-sonnet-20241022': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 3.00, cache_read: 0.30, cache_write: 3.75, output: 15.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: false,
    },
    'claude-3-5-haiku-20241022': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.80, cache_read: 0.08, cache_write: 1.00, output: 4.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: false,
    },
    'claude-3-opus-20240229': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 4_096,
        cost: { input: 15.00, cache_read: 1.50, cache_write: 18.75, output: 75.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: false,
    },
    'claude-3-sonnet-20240229': {
        contextWindow: 200_000, cost: { input: 3.00, output: 15.00 },
        downloadable: false,
        reservedOutputTokenSpace: 4_096,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: false,
    }
};
const anthropicSettings = {
    providerReasoningIOSettings: {
        input: {
            includeInPayload: (reasoningInfo) => {
                if (!reasoningInfo?.isReasoningEnabled)
                    return null;
                if (reasoningInfo.type === 'budget_slider_value') {
                    return { thinking: { type: 'enabled', budget_tokens: reasoningInfo.reasoningBudget } };
                }
                return null;
            }
        },
    },
    modelOptions: anthropicModelOptions,
    modelOptionsFallback: (modelName) => {
        const lower = modelName.toLowerCase();
        let fallbackName = null;
        if (lower.includes('claude-4-opus') || lower.includes('claude-opus-4'))
            fallbackName = 'claude-opus-4-20250514';
        if (lower.includes('claude-4-sonnet') || lower.includes('claude-sonnet-4'))
            fallbackName = 'claude-sonnet-4-20250514';
        if (lower.includes('claude-3-7-sonnet'))
            fallbackName = 'claude-3-7-sonnet-20250219';
        if (lower.includes('claude-3-5-sonnet'))
            fallbackName = 'claude-3-5-sonnet-20241022';
        if (lower.includes('claude-3-5-haiku'))
            fallbackName = 'claude-3-5-haiku-20241022';
        if (lower.includes('claude-3-opus'))
            fallbackName = 'claude-3-opus-20240229';
        if (lower.includes('claude-3-sonnet'))
            fallbackName = 'claude-3-sonnet-20240229';
        if (fallbackName)
            return { modelName: fallbackName, recognizedModelName: fallbackName, ...anthropicModelOptions[fallbackName] };
        return null;
    },
};
// ---------------- OPENAI ----------------
const openAIModelOptions = {
    'o3': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 10.00, output: 40.00, cache_read: 2.50 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: false, reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' } },
    },
    'o4-mini': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 1.10, output: 4.40, cache_read: 0.275 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: false, reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' } },
    },
    'gpt-4.1': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 2.00, output: 8.00, cache_read: 0.50 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: false,
    },
    'gpt-4.1-mini': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 0.40, output: 1.60, cache_read: 0.10 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: false,
    },
    'gpt-4.1-nano': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 0.10, output: 0.40, cache_read: 0.03 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: false,
    },
    'o1': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 100_000,
        cost: { input: 15.00, cache_read: 7.50, output: 60.00, },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: false, reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' } },
    },
    'o3-mini': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 100_000,
        cost: { input: 1.10, cache_read: 0.55, output: 4.40, },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: false, reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' } },
    },
    'gpt-4o': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 2.50, cache_read: 1.25, output: 10.00, },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'o1-mini': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 65_536,
        cost: { input: 1.10, cache_read: 0.55, output: 4.40, },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: false, // does not support any system
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: false, reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' } },
    },
    'gpt-4o-mini': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0.15, cache_read: 0.075, output: 0.60, },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role', // ??
        reasoningCapabilities: false,
    },
};
// https://platform.openai.com/docs/guides/reasoning?api-mode=chat
const openAICompatIncludeInPayloadReasoning = (reasoningInfo) => {
    if (!reasoningInfo?.isReasoningEnabled)
        return null;
    if (reasoningInfo.type === 'effort_slider_value') {
        return { reasoning_effort: reasoningInfo.reasoningEffort };
    }
    return null;
};
const openAISettings = {
    modelOptions: openAIModelOptions,
    modelOptionsFallback: (modelName) => {
        const lower = modelName.toLowerCase();
        let fallbackName = null;
        if (lower.includes('o1')) {
            fallbackName = 'o1';
        }
        if (lower.includes('o3-mini')) {
            fallbackName = 'o3-mini';
        }
        if (lower.includes('gpt-4o')) {
            fallbackName = 'gpt-4o';
        }
        if (fallbackName)
            return { modelName: fallbackName, recognizedModelName: fallbackName, ...openAIModelOptions[fallbackName] };
        return null;
    },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- XAI ----------------
const xAIModelOptions = {
    // https://docs.x.ai/docs/guides/reasoning#reasoning
    // https://docs.x.ai/docs/models#models-and-pricing
    'grok-2': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 2.00, output: 10.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: false,
    },
    'grok-3': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 3.00, output: 15.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: false,
    },
    'grok-3-fast': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 5.00, output: 25.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: false,
    },
    // only mini supports thinking
    'grok-3-mini': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 0.30, output: 0.50 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: false, reasoningSlider: { type: 'effort_slider', values: ['low', 'high'], default: 'low' } },
    },
    'grok-3-mini-fast': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 0.60, output: 4.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: { supportsReasoning: true, canTurnOffReasoning: false, canIOReasoning: false, reasoningSlider: { type: 'effort_slider', values: ['low', 'high'], default: 'low' } },
    },
};
const xAISettings = {
    modelOptions: xAIModelOptions,
    modelOptionsFallback: (modelName) => {
        const lower = modelName.toLowerCase();
        let fallbackName = null;
        if (lower.includes('grok-2'))
            fallbackName = 'grok-2';
        if (lower.includes('grok-3'))
            fallbackName = 'grok-3';
        if (lower.includes('grok'))
            fallbackName = 'grok-3';
        if (fallbackName)
            return { modelName: fallbackName, recognizedModelName: fallbackName, ...xAIModelOptions[fallbackName] };
        return null;
    },
    // same implementation as openai
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- GEMINI ----------------
const geminiModelOptions = {
    // https://ai.google.dev/gemini-api/docs/thinking#set-budget
    'gemini-2.5-pro-preview-05-06': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: false,
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // max is really 24576
            reasoningReservedOutputTokenSpace: 8192,
        },
    },
    'gemini-2.0-flash-lite': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false, // no reasoning
    },
    'gemini-2.5-flash-preview-04-17': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.15, output: .60 }, // TODO $3.50 output with thinking not included
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: false,
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // max is really 24576
            reasoningReservedOutputTokenSpace: 8192,
        },
    },
    'gemini-2.5-pro-exp-03-25': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: false,
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // max is really 24576
            reasoningReservedOutputTokenSpace: 8192,
        },
    },
    'gemini-2.0-flash': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192, // 8_192,
        cost: { input: 0.10, output: 0.40 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
    'gemini-2.0-flash-lite-preview-02-05': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192, // 8_192,
        cost: { input: 0.075, output: 0.30 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
    'gemini-1.5-flash': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192, // 8_192,
        cost: { input: 0.075, output: 0.30 }, // TODO!!! price doubles after 128K tokens, we are NOT encoding that info right now
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
    'gemini-1.5-pro': {
        contextWindow: 2_097_152,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 1.25, output: 5.00 }, // TODO!!! price doubles after 128K tokens, we are NOT encoding that info right now
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
    'gemini-1.5-flash-8b': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.0375, output: 0.15 }, // TODO!!! price doubles after 128K tokens, we are NOT encoding that info right now
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
};
const geminiSettings = {
    modelOptions: geminiModelOptions,
    modelOptionsFallback: (modelName) => { return null; },
};
// ---------------- DEEPSEEK API ----------------
const deepseekModelOptions = {
    'deepseek-chat': {
        ...openSourceModelOptions_assumingOAICompat.deepseekR1,
        contextWindow: 64_000, // https://api-docs.deepseek.com/quick_start/pricing
        reservedOutputTokenSpace: 8_000, // 8_000,
        cost: { cache_read: .07, input: .27, output: 1.10, },
        downloadable: false,
    },
    'deepseek-reasoner': {
        ...openSourceModelOptions_assumingOAICompat.deepseekCoderV2,
        contextWindow: 64_000,
        reservedOutputTokenSpace: 8_000, // 8_000,
        cost: { cache_read: .14, input: .55, output: 2.19, },
        downloadable: false,
    },
};
const deepseekSettings = {
    modelOptions: deepseekModelOptions,
    modelOptionsFallback: (modelName) => { return null; },
    providerReasoningIOSettings: {
        // reasoning: OAICompat +  response.choices[0].delta.reasoning_content // https://api-docs.deepseek.com/guides/reasoning_model
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
// ---------------- MISTRAL ----------------
const mistralModelOptions = {
    'mistral-large-latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 2.00, output: 6.00 },
        supportsFIM: false,
        downloadable: { sizeGb: 73 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'mistral-medium-latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.40, output: 2.00 },
        supportsFIM: false,
        downloadable: { sizeGb: 'not-known' },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'codestral-latest': {
        contextWindow: 256_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.30, output: 0.90 },
        supportsFIM: true,
        downloadable: { sizeGb: 13 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'magistral-medium-latest': {
        contextWindow: 256_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.30, output: 0.90 }, // TODO: check this
        supportsFIM: true,
        downloadable: { sizeGb: 13 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: false, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'magistral-small-latest': {
        contextWindow: 40_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.30, output: 0.90 }, // TODO: check this
        supportsFIM: true,
        downloadable: { sizeGb: 13 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: false, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'devstral-small-latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        supportsFIM: false,
        downloadable: { sizeGb: 14 }, //https://ollama.com/library/devstral
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'ministral-8b-latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 4_096,
        cost: { input: 0.10, output: 0.10 },
        supportsFIM: false,
        downloadable: { sizeGb: 4.1 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'ministral-3b-latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 4_096,
        cost: { input: 0.04, output: 0.04 },
        supportsFIM: false,
        downloadable: { sizeGb: 'not-known' },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
};
const mistralSettings = {
    modelOptions: mistralModelOptions,
    modelOptionsFallback: (modelName) => { return null; },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- GROQ ----------------
const groqModelOptions = {
    'llama-3.3-70b-versatile': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 32_768, // 32_768,
        cost: { input: 0.59, output: 0.79 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'llama-3.1-8b-instant': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.05, output: 0.08 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen-2.5-coder-32b': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null, // not specified?
        cost: { input: 0.79, output: 0.79 },
        downloadable: false,
        supportsFIM: false, // unfortunately looks like no FIM support on groq
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen-qwq-32b': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null, // not specified?
        cost: { input: 0.29, output: 0.39 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: false, openSourceThinkTags: ['<think>', '</think>'] }, // we're using reasoning_format:parsed so really don't need to know openSourceThinkTags
    },
};
const groqSettings = {
    modelOptions: groqModelOptions,
    modelOptionsFallback: (modelName) => { return null; },
    providerReasoningIOSettings: {
        // Must be set to either parsed or hidden when using tool calling https://console.groq.com/docs/reasoning
        input: {
            includeInPayload: (reasoningInfo) => {
                if (!reasoningInfo?.isReasoningEnabled)
                    return null;
                if (reasoningInfo.type === 'budget_slider_value') {
                    return { reasoning_format: 'parsed' };
                }
                return null;
            }
        },
        output: { nameOfFieldInDelta: 'reasoning' },
    },
};
// ---------------- GOOGLE VERTEX ----------------
const googleVertexModelOptions = {};
const googleVertexSettings = {
    modelOptions: googleVertexModelOptions,
    modelOptionsFallback: (modelName) => { return null; },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- MICROSOFT AZURE ----------------
const microsoftAzureModelOptions = {};
const microsoftAzureSettings = {
    modelOptions: microsoftAzureModelOptions,
    modelOptionsFallback: (modelName) => { return null; },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- AWS BEDROCK ----------------
const awsBedrockModelOptions = {};
const awsBedrockSettings = {
    modelOptions: awsBedrockModelOptions,
    modelOptionsFallback: (modelName) => { return null; },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- VLLM, OLLAMA, OPENAICOMPAT (self-hosted / local) ----------------
const ollamaModelOptions = {
    'qwen2.5-coder:7b': {
        contextWindow: 32_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 1.9 },
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen2.5-coder:3b': {
        contextWindow: 32_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 1.9 },
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen2.5-coder:1.5b': {
        contextWindow: 32_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: .986 },
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'llama3.1': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 4.9 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen2.5-coder': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 4.7 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwq': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 32_000,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 20 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: false, canTurnOffReasoning: false, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'deepseek-r1': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 4.7 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: false, canTurnOffReasoning: false, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'devstral:latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 14 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
};
export const ollamaRecommendedModels = ['qwen2.5-coder:1.5b', 'llama3.1', 'qwq', 'deepseek-r1', 'devstral:latest'];
const vLLMSettings = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName, { downloadable: { sizeGb: 'not-known' } }),
    modelOptions: {},
    providerReasoningIOSettings: {
        // reasoning: OAICompat + response.choices[0].delta.reasoning_content // https://docs.vllm.ai/en/stable/features/reasoning_outputs.html#streaming-chat-completions
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
const lmStudioSettings = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName, { downloadable: { sizeGb: 'not-known' }, contextWindow: 4_096 }),
    modelOptions: {},
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { needsManualParse: true },
    },
};
const ollamaSettings = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName, { downloadable: { sizeGb: 'not-known' } }),
    modelOptions: ollamaModelOptions,
    providerReasoningIOSettings: {
        // reasoning: we need to filter out reasoning <think> tags manually
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { needsManualParse: true },
    },
};
const openaiCompatible = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName),
    modelOptions: {},
    providerReasoningIOSettings: {
        // reasoning: we have no idea what endpoint they used, so we can't consistently parse out reasoning
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
const liteLLMSettings = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName, { downloadable: { sizeGb: 'not-known' } }),
    modelOptions: {},
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
// ---------------- OPENROUTER ----------------
const openRouterModelOptions_assumingOpenAICompat = {
    'qwen/qwen3-235b-a22b': {
        contextWindow: 40_960,
        reservedOutputTokenSpace: null,
        cost: { input: .10, output: .10 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: false },
    },
    'microsoft/phi-4-reasoning-plus:free': {
        contextWindow: 32_768,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: false },
    },
    'mistralai/mistral-small-3.1-24b-instruct:free': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'google/gemini-2.0-flash-lite-preview-02-05:free': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'google/gemini-2.0-pro-exp-02-05:free': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'google/gemini-2.0-flash-exp:free': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'deepseek/deepseek-r1': {
        ...openSourceModelOptions_assumingOAICompat.deepseekR1,
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0.8, output: 2.4 },
        downloadable: false,
    },
    'anthropic/claude-opus-4': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 15.00, output: 75.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'anthropic/claude-sonnet-4': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 15.00, output: 75.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'anthropic/claude-3.7-sonnet:thinking': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 3.00, output: 15.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: true,
            reasoningReservedOutputTokenSpace: 8192,
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // they recommend batching if max > 32_000.
        },
    },
    'anthropic/claude-3.7-sonnet': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 3.00, output: 15.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false, // stupidly, openrouter separates thinking from non-thinking
    },
    'anthropic/claude-3.5-sonnet': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 3.00, output: 15.00 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'mistralai/codestral-2501': {
        ...openSourceModelOptions_assumingOAICompat.codestral,
        contextWindow: 256_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0.3, output: 0.9 },
        downloadable: false,
        reasoningCapabilities: false,
    },
    'mistralai/devstral-small:free': {
        ...openSourceModelOptions_assumingOAICompat.devstral,
        contextWindow: 130_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        reasoningCapabilities: false,
    },
    'qwen/qwen-2.5-coder-32b-instruct': {
        ...openSourceModelOptions_assumingOAICompat['qwen2.5coder'],
        contextWindow: 33_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0.07, output: 0.16 },
        downloadable: false,
    },
    'qwen/qwq-32b': {
        ...openSourceModelOptions_assumingOAICompat['qwq'],
        contextWindow: 33_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0.07, output: 0.16 },
        downloadable: false,
    }
};
const openRouterSettings = {
    modelOptions: openRouterModelOptions_assumingOpenAICompat,
    modelOptionsFallback: (modelName) => {
        const res = extensiveModelOptionsFallback(modelName);
        // openRouter does not support gemini-style, use openai-style instead
        if (res?.specialToolFormat === 'gemini-style') {
            res.specialToolFormat = 'openai-style';
        }
        return res;
    },
    providerReasoningIOSettings: {
        // reasoning: OAICompat + response.choices[0].delta.reasoning : payload should have {include_reasoning: true} https://openrouter.ai/announcements/reasoning-tokens-for-thinking-models
        input: {
            // https://openrouter.ai/docs/use-cases/reasoning-tokens
            includeInPayload: (reasoningInfo) => {
                if (!reasoningInfo?.isReasoningEnabled)
                    return null;
                if (reasoningInfo.type === 'budget_slider_value') {
                    return {
                        reasoning: {
                            max_tokens: reasoningInfo.reasoningBudget
                        }
                    };
                }
                if (reasoningInfo.type === 'effort_slider_value')
                    return {
                        reasoning: {
                            effort: reasoningInfo.reasoningEffort
                        }
                    };
                return null;
            }
        },
        output: { nameOfFieldInDelta: 'reasoning' },
    },
};
// ---------------- model settings of everything above ----------------
const modelSettingsOfProvider = {
    openAI: openAISettings,
    anthropic: anthropicSettings,
    xAI: xAISettings,
    gemini: geminiSettings,
    // open source models
    deepseek: deepseekSettings,
    groq: groqSettings,
    // open source models + providers (mixture of everything)
    openRouter: openRouterSettings,
    vLLM: vLLMSettings,
    ollama: ollamaSettings,
    openAICompatible: openaiCompatible,
    mistral: mistralSettings,
    liteLLM: liteLLMSettings,
    lmStudio: lmStudioSettings,
    googleVertex: googleVertexSettings,
    microsoftAzure: microsoftAzureSettings,
    awsBedrock: awsBedrockSettings,
};
// ---------------- exports ----------------
// returns the capabilities and the adjusted modelName if it was a fallback
export const getModelCapabilities = (providerName, modelName, overridesOfModel) => {
    const lowercaseModelName = modelName.toLowerCase();
    const { modelOptions, modelOptionsFallback } = modelSettingsOfProvider[providerName];
    // Get any override settings for this model
    const overrides = overridesOfModel?.[providerName]?.[modelName];
    // search model options object directly first
    for (const modelName_ in modelOptions) {
        const lowercaseModelName_ = modelName_.toLowerCase();
        if (lowercaseModelName === lowercaseModelName_) {
            return { ...modelOptions[modelName], ...overrides, modelName, recognizedModelName: modelName, isUnrecognizedModel: false };
        }
    }
    const result = modelOptionsFallback(modelName);
    if (result) {
        return { ...result, ...overrides, modelName: result.modelName, isUnrecognizedModel: false };
    }
    return { modelName, ...defaultModelOptions, ...overrides, isUnrecognizedModel: true };
};
// non-model settings
export const getProviderCapabilities = (providerName) => {
    const { providerReasoningIOSettings } = modelSettingsOfProvider[providerName];
    return { providerReasoningIOSettings };
};
export const getIsReasoningEnabledState = (featureName, providerName, modelName, modelSelectionOptions, overridesOfModel) => {
    const { supportsReasoning, canTurnOffReasoning } = getModelCapabilities(providerName, modelName, overridesOfModel).reasoningCapabilities || {};
    if (!supportsReasoning)
        return false;
    // default to enabled if can't turn off, or if the featureName is Chat.
    const defaultEnabledVal = featureName === 'Chat' || !canTurnOffReasoning;
    const isReasoningEnabled = modelSelectionOptions?.reasoningEnabled ?? defaultEnabledVal;
    return isReasoningEnabled;
};
export const getReservedOutputTokenSpace = (providerName, modelName, opts) => {
    const { reasoningCapabilities, reservedOutputTokenSpace, } = getModelCapabilities(providerName, modelName, opts.overridesOfModel);
    return opts.isReasoningEnabled && reasoningCapabilities ? reasoningCapabilities.reasoningReservedOutputTokenSpace : reservedOutputTokenSpace;
};
// used to force reasoning state (complex) into something simple we can just read from when sending a message
export const getSendableReasoningInfo = (featureName, providerName, modelName, modelSelectionOptions, overridesOfModel) => {
    const { reasoningSlider: reasoningBudgetSlider } = getModelCapabilities(providerName, modelName, overridesOfModel).reasoningCapabilities || {};
    const isReasoningEnabled = getIsReasoningEnabledState(featureName, providerName, modelName, modelSelectionOptions, overridesOfModel);
    if (!isReasoningEnabled)
        return null;
    // check for reasoning budget
    const reasoningBudget = reasoningBudgetSlider?.type === 'budget_slider' ? modelSelectionOptions?.reasoningBudget ?? reasoningBudgetSlider?.default : undefined;
    if (reasoningBudget) {
        return { type: 'budget_slider_value', isReasoningEnabled: isReasoningEnabled, reasoningBudget: reasoningBudget };
    }
    // check for reasoning effort
    const reasoningEffort = reasoningBudgetSlider?.type === 'effort_slider' ? modelSelectionOptions?.reasoningEffort ?? reasoningBudgetSlider?.default : undefined;
    if (reasoningEffort) {
        return { type: 'effort_slider_value', isReasoningEnabled: isReasoningEnabled, reasoningEffort: reasoningEffort };
    }
    return null;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxDYXBhYmlsaXRpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vbW9kZWxDYXBhYmlsaXRpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFRMUYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUc7SUFDdEMsU0FBUyxFQUFFO1FBQ1YsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELE1BQU0sRUFBRTtRQUNQLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxRQUFRLEVBQUU7UUFDVCxNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsTUFBTSxFQUFFO1FBQ1AsUUFBUSxFQUFFLHdCQUF3QjtLQUNsQztJQUNELElBQUksRUFBRTtRQUNMLFFBQVEsRUFBRSx1QkFBdUI7S0FDakM7SUFDRCxVQUFVLEVBQUU7UUFDWCxNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsZ0JBQWdCLEVBQUU7UUFDakIsUUFBUSxFQUFFLEVBQUU7UUFDWixNQUFNLEVBQUUsRUFBRTtRQUNWLFdBQVcsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCO0tBQ25DO0lBQ0QsTUFBTSxFQUFFO1FBQ1AsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELElBQUksRUFBRTtRQUNMLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxHQUFHLEVBQUU7UUFDSixNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsT0FBTyxFQUFFO1FBQ1IsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELFFBQVEsRUFBRTtRQUNULFFBQVEsRUFBRSx1QkFBdUI7S0FDakM7SUFDRCxPQUFPLEVBQUU7UUFDUixRQUFRLEVBQUUsRUFBRTtLQUNaO0lBQ0QsWUFBWSxFQUFFO1FBQ2IsTUFBTSxFQUFFLFVBQVU7UUFDbEIsT0FBTyxFQUFFLEVB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