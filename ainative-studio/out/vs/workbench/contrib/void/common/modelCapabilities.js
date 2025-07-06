/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxDYXBhYmlsaXRpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9tb2RlbENhcGFiaWxpdGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQVExRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRztJQUN0QyxTQUFTLEVBQUU7UUFDVixNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsTUFBTSxFQUFFO1FBQ1AsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELFFBQVEsRUFBRTtRQUNULE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxNQUFNLEVBQUU7UUFDUCxRQUFRLEVBQUUsd0JBQXdCO0tBQ2xDO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsUUFBUSxFQUFFLHVCQUF1QjtLQUNqQztJQUNELFVBQVUsRUFBRTtRQUNYLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxnQkFBZ0IsRUFBRTtRQUNqQixRQUFRLEVBQUUsRUFBRTtRQUNaLE1BQU0sRUFBRSxFQUFFO1FBQ1YsV0FBVyxFQUFFLElBQUksRUFBRSxnQkFBZ0I7S0FDbkM7SUFDRCxNQUFNLEVBQUU7UUFDUCxNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELEdBQUcsRUFBRTtRQUNKLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxPQUFPLEVBQUU7UUFDUixNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsUUFBUSxFQUFFO1FBQ1QsUUFBUSxFQUFFLHVCQUF1QjtLQUNqQztJQUNELE9BQU8sRUFBRTtRQUNSLFFBQVEsRUFBRSxFQUFFO0tBQ1o7SUFDRCxZQUFZLEVBQUU7UUFDYixNQUFNLEVBQUUsVUFBVTtRQUNsQixPQUFPLEVBQUUsRUFBRTtLQUNYO0lBQ0QsY0FBYyxFQUFFO1FBQ2YsT0FBTyxFQUFFLEVBQUUsRUFBRSxvQkFBb0I7UUFDakMsTUFBTSxFQUFFLEVBQUU7UUFDVixlQUFlLEVBQUUsb0JBQW9CO0tBQ3JDO0lBQ0QsVUFBVSxFQUFFO1FBQ1gsTUFBTSxFQUFFLEVBQUU7UUFDVixNQUFNLEVBQUUsV0FBVyxFQUFFLHFCQUFxQjtRQUMxQyxRQUFRLEVBQUUsRUFBRSxFQUFFLHNDQUFzQztLQUNwRDtDQUVRLENBQUE7QUFLVixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRztJQUN0QyxNQUFNLEVBQUU7UUFDUCxTQUFTO1FBQ1QsY0FBYztRQUNkLGNBQWM7UUFDZCxJQUFJO1FBQ0osU0FBUztRQUNULFFBQVE7UUFDUixhQUFhO1FBQ2IsWUFBWTtRQUNaLGlCQUFpQjtLQUNqQjtJQUNELFNBQVMsRUFBRTtRQUNWLGlCQUFpQjtRQUNqQixtQkFBbUI7UUFDbkIsMEJBQTBCO1FBQzFCLDBCQUEwQjtRQUMxQix5QkFBeUI7UUFDekIsc0JBQXNCO0tBQ3RCO0lBQ0QsR0FBRyxFQUFFO1FBQ0osUUFBUTtRQUNSLFFBQVE7UUFDUixhQUFhO1FBQ2IsYUFBYTtRQUNiLGtCQUFrQjtLQUNsQjtJQUNELE1BQU0sRUFBRTtRQUNQLDBCQUEwQjtRQUMxQixnQ0FBZ0M7UUFDaEMsa0JBQWtCO1FBQ2xCLHVCQUF1QjtRQUN2Qiw4QkFBOEI7S0FDOUI7SUFDRCxRQUFRLEVBQUU7UUFDVCxlQUFlO1FBQ2YsbUJBQW1CO0tBQ25CO0lBQ0QsTUFBTSxFQUFFLEVBQUUsZUFBZTtLQUN4QjtJQUNELElBQUksRUFBRSxFQUFFLGVBQWU7S0FDdEI7SUFDRCxRQUFRLEVBQUUsRUFBRSxFQUFFLGVBQWU7SUFFN0IsVUFBVSxFQUFFO1FBQ1gsMENBQTBDO1FBQzFDLHlCQUF5QjtRQUN6QiwyQkFBMkI7UUFDM0Isc0JBQXNCO1FBQ3RCLDZCQUE2QjtRQUM3Qiw2QkFBNkI7UUFDN0Isc0JBQXNCO1FBQ3RCLGdDQUFnQztRQUNoQywrQkFBK0I7UUFDL0IsNkJBQTZCO1FBQzdCLHlDQUF5QztRQUN6Qyw4QkFBOEI7UUFDOUIsc0NBQXNDO1FBQ3RDLG1EQUFtRDtRQUNuRCxxREFBcUQ7UUFDckQsMENBQTBDO1FBQzFDLHNDQUFzQztLQUN0QztJQUNELElBQUksRUFBRTtRQUNMLGNBQWM7UUFDZCx5QkFBeUI7UUFDekIsc0JBQXNCO1FBQ3RCLHVEQUF1RDtLQUN2RDtJQUNELE9BQU8sRUFBRTtRQUNSLGtCQUFrQjtRQUNsQix1QkFBdUI7UUFDdkIsc0JBQXNCO1FBQ3RCLHVCQUF1QjtRQUN2QixxQkFBcUI7UUFDckIscUJBQXFCO0tBQ3JCO0lBQ0QsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLFdBQVc7SUFDakMsWUFBWSxFQUFFLEVBQUU7SUFDaEIsY0FBYyxFQUFFLEVBQUU7SUFDbEIsVUFBVSxFQUFFLEVBQUU7SUFDZCxPQUFPLEVBQUUsRUFBRTtDQUd1QyxDQUFBO0FBOENuRCxxRUFBcUU7QUFJckUsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUc7SUFDaEMsZUFBZTtJQUNmLDBCQUEwQjtJQUMxQix1QkFBdUI7SUFDdkIsbUJBQW1CO0lBQ25CLGFBQWE7SUFDYix1QkFBdUI7SUFDdkIseUJBQXlCO0NBQ2hCLENBQUE7QUE0QlYsTUFBTSxtQkFBbUIsR0FBRztJQUMzQixhQUFhLEVBQUUsS0FBSztJQUNwQix3QkFBd0IsRUFBRSxLQUFLO0lBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtJQUM3QixZQUFZLEVBQUUsS0FBSztJQUNuQixxQkFBcUIsRUFBRSxLQUFLO0lBQzVCLFdBQVcsRUFBRSxLQUFLO0lBQ2xCLHFCQUFxQixFQUFFLEtBQUs7Q0FDVyxDQUFBO0FBRXhDLCtDQUErQztBQUMvQyx1Q0FBdUM7QUFDdkMsZ0dBQWdHO0FBQ2hHLE1BQU0sd0NBQXdDLEdBQUc7SUFDaEQsWUFBWSxFQUFFO1FBQ2IsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsS0FBSztRQUM1QixxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRTtRQUNsSixhQUFhLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdEQ7SUFDRCxpQkFBaUIsRUFBRTtRQUNsQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxLQUFLLEVBQUUsV0FBVztRQUN6QyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN0RDtJQUNELGlCQUFpQixFQUFFO1FBQ2xCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLEtBQUssRUFBRSxXQUFXO1FBQ3pDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBQ0QsV0FBVyxFQUFFO1FBQ1osV0FBVyxFQUFFLElBQUk7UUFDakIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN0RDtJQUNELFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdkQ7SUFDRCxrQkFBa0IsRUFBRTtRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUssRUFBRSxpQ0FBaUM7UUFDL0QsYUFBYSxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3ZEO0lBRUQsa0ZBQWtGO0lBQ2xGLE1BQU0sRUFBRTtRQUNQLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUU7UUFDakosYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBRUQsT0FBTyxFQUFFO1FBQ1IsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN0RDtJQUNELG9FQUFvRTtJQUNwRSxjQUFjLEVBQUU7UUFDZixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLFVBQVUsRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQzFEO0lBQ0QsaUJBQWlCLEVBQUU7UUFDbEIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxVQUFVLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUMxRDtJQUVELFVBQVU7SUFDVixRQUFRLEVBQUU7UUFDVCxXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBQ0QsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN0RDtJQUNELFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdEQ7SUFDRCxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBQ0QsT0FBTztJQUNQLGNBQWMsRUFBRTtRQUNmLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdEQ7SUFDRCxLQUFLLEVBQUU7UUFDTixXQUFXLEVBQUUsS0FBSyxFQUFFLHdCQUF3QjtRQUM1QyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO1FBQ2xKLGFBQWEsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN2RDtJQUNELE9BQU8sRUFBRTtRQUNSLFdBQVcsRUFBRSxLQUFLLEVBQUUsZUFBZTtRQUNuQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO1FBQ2pKLGFBQWEsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN0RDtJQUNELFdBQVc7SUFDWCxZQUFZLEVBQUU7UUFDYixXQUFXLEVBQUUsSUFBSTtRQUNqQixxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBRXZEO0lBQ0QsY0FBYyxFQUFFO1FBQ2YsV0FBVyxFQUFFLElBQUk7UUFDakIscUJBQXFCLEVBQUUsS0FBSztRQUM1QixxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUV2RDtJQUNELFFBQVEsRUFBRTtRQUNULFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsU0FBUyxFQUFFLHdCQUF3QixFQUFFLE1BQU07S0FDMUQ7Q0FDZ0UsQ0FBQTtBQUtsRSxrREFBa0Q7QUFDbEQsTUFBTSw2QkFBNkIsR0FBbUQsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsRUFBRTtJQUV4SCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUE7SUFFckMsTUFBTSxVQUFVLEdBQUcsQ0FBaUYsR0FBTSxFQUFFLG1CQUFxQyxFQUNyRSxFQUFFO1FBRTdFLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixLQUFLLFdBQVc7WUFDdkUsQ0FBQyxDQUFDLGFBQWE7WUFDZixDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFBO1FBRTdCLE9BQU87WUFDTixtQkFBbUI7WUFDbkIsU0FBUztZQUNULEdBQUcsSUFBSTtZQUNQLHFCQUFxQixFQUFFLHFCQUFxQjtZQUM1QyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFDN0IsWUFBWSxFQUFFLEtBQUs7WUFDbkIsR0FBRyxtQkFBbUI7U0FDdEIsQ0FBQztJQUNILENBQUMsQ0FBQTtJQUVELElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLDBCQUEwQixDQUFDLENBQUE7SUFFbkosSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMscUJBQXFCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtJQUN4SSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMscUJBQXFCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtJQUVwRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDcEcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUV4RSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQ25KLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFDdEksSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFFOUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ25HLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyx3Q0FBd0MsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN2RyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDdkcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ25JLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ3RJLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyx3Q0FBd0MsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUV4RyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzNKLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZILElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyx3Q0FBd0MsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNoRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUFDLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQUMsQ0FBQztJQUNqRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDL0YsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3pHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyx3Q0FBd0MsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUV2RyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFFakcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBRTNHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyx3Q0FBd0MsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBLENBQUMsb0JBQW9CO0lBRXJJLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBRS9ILElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDOUosSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUM5SixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUUvSCxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUN4RyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFFekUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDcEcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3JFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3BHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNyRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUdwRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0NBQXdDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQ2xHLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLEtBQThELENBQUMsQ0FBQTtJQUU1SCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMsQ0FBQTtBQU9ELDhDQUE4QztBQUM5QyxNQUFNLHFCQUFxQixHQUFHO0lBQzdCLDRCQUE0QixFQUFFO1FBQzdCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUN6RSxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxpQkFBaUI7UUFDcEMscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxxQkFBcUIsRUFBRTtZQUN0QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsY0FBYyxFQUFFLElBQUk7WUFDcEIsaUNBQWlDLEVBQUUsSUFBSSxFQUFFLCtEQUErRDtZQUN4RyxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsc0hBQXNIO1NBQ3ZNO0tBRUQ7SUFDRCx3QkFBd0IsRUFBRTtRQUN6QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDM0UsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsaUJBQWlCO1FBQ3BDLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMscUJBQXFCLEVBQUU7WUFDdEIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGlDQUFpQyxFQUFFLElBQUksRUFBRSwrREFBK0Q7WUFDeEcsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLHNIQUFzSDtTQUN2TTtLQUVEO0lBQ0QsMEJBQTBCLEVBQUU7UUFDM0IsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ3hFLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGlCQUFpQjtRQUNwQyxxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLHFCQUFxQixFQUFFO1lBQ3RCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixjQUFjLEVBQUUsSUFBSTtZQUNwQixpQ0FBaUMsRUFBRSxJQUFJLEVBQUUsK0RBQStEO1lBQ3hHLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxzSEFBc0g7U0FDdk07S0FFRDtJQUNELDRCQUE0QixFQUFFO1FBQzdCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUN6RSxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxpQkFBaUI7UUFDcEMscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsMkJBQTJCLEVBQUU7UUFDNUIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ3hFLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGlCQUFpQjtRQUNwQyxxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCx3QkFBd0IsRUFBRTtRQUN6QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDM0UsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsaUJBQWlCO1FBQ3BDLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELDBCQUEwQixFQUFFO1FBQzNCLGFBQWEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1FBQzVELFlBQVksRUFBRSxLQUFLO1FBQ25CLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsaUJBQWlCO1FBQ3BDLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtDQUN1RCxDQUFBO0FBRXpELE1BQU0saUJBQWlCLEdBQTJCO0lBQ2pELDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRTtZQUNOLGdCQUFnQixFQUFFLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxhQUFhLEVBQUUsa0JBQWtCO29CQUFFLE9BQU8sSUFBSSxDQUFBO2dCQUVuRCxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLEVBQUUsQ0FBQztvQkFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLGFBQWEsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFBO2dCQUN2RixDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztTQUNEO0tBQ0Q7SUFDRCxZQUFZLEVBQUUscUJBQXFCO0lBQ25DLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDbkMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3JDLElBQUksWUFBWSxHQUE4QyxJQUFJLENBQUE7UUFDbEUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO1lBQUUsWUFBWSxHQUFHLHdCQUF3QixDQUFBO1FBQy9HLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUM7WUFBRSxZQUFZLEdBQUcsMEJBQTBCLENBQUE7UUFHckgsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDO1lBQUUsWUFBWSxHQUFHLDRCQUE0QixDQUFBO1FBQ3BGLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQztZQUFFLFlBQVksR0FBRyw0QkFBNEIsQ0FBQTtRQUNwRixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUM7WUFBRSxZQUFZLEdBQUcsMkJBQTJCLENBQUE7UUFDbEYsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztZQUFFLFlBQVksR0FBRyx3QkFBd0IsQ0FBQTtRQUM1RSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUM7WUFBRSxZQUFZLEdBQUcsMEJBQTBCLENBQUE7UUFDaEYsSUFBSSxZQUFZO1lBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQTtRQUMvSCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRCxDQUFBO0FBR0QsMkNBQTJDO0FBQzNDLE1BQU0sa0JBQWtCLEdBQUc7SUFDMUIsSUFBSSxFQUFFO1FBQ0wsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRTtRQUN2RCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLGdCQUFnQjtRQUN2QyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO0tBQ3BNO0lBQ0QsU0FBUyxFQUFFO1FBQ1YsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtRQUN0RCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLGdCQUFnQjtRQUN2QyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO0tBQ3BNO0lBQ0QsU0FBUyxFQUFFO1FBQ1YsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRTtRQUNyRCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLGdCQUFnQjtRQUN2QyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsY0FBYyxFQUFFO1FBQ2YsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRTtRQUNyRCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLGdCQUFnQjtRQUN2QyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsY0FBYyxFQUFFO1FBQ2YsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRTtRQUNyRCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLGdCQUFnQjtRQUN2QyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsT0FBTztRQUNqQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssR0FBRztRQUN4RCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxnQkFBZ0I7UUFDdkMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRTtLQUNwTTtJQUNELFNBQVMsRUFBRTtRQUNWLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE9BQU87UUFDakMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEdBQUc7UUFDdEQsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsZ0JBQWdCO1FBQ3ZDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7S0FDcE07SUFDRCxRQUFRLEVBQUU7UUFDVCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxHQUFHO1FBQ3ZELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsU0FBUyxFQUFFO1FBQ1YsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksR0FBRztRQUN0RCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxLQUFLLEVBQUUsOEJBQThCO1FBQzVELHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7S0FDcE07SUFDRCxhQUFhLEVBQUU7UUFDZCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxHQUFHO1FBQ3ZELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsYUFBYSxFQUFFLEtBQUs7UUFDM0MscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtDQUN1RCxDQUFBO0FBR3pELGtFQUFrRTtBQUNsRSxNQUFNLHFDQUFxQyxHQUFHLENBQUMsYUFBb0MsRUFBRSxFQUFFO0lBQ3RGLElBQUksQ0FBQyxhQUFhLEVBQUUsa0JBQWtCO1FBQUUsT0FBTyxJQUFJLENBQUE7SUFDbkQsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLHFCQUFxQixFQUFFLENBQUM7UUFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUMzRCxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFFWixDQUFDLENBQUE7QUFFRCxNQUFNLGNBQWMsR0FBMkI7SUFDOUMsWUFBWSxFQUFFLGtCQUFrQjtJQUNoQyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQ25DLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLFlBQVksR0FBMkMsSUFBSSxDQUFBO1FBQy9ELElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTtRQUFDLENBQUM7UUFDakQsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFBQyxZQUFZLEdBQUcsU0FBUyxDQUFBO1FBQUMsQ0FBQztRQUMzRCxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUFDLFlBQVksR0FBRyxRQUFRLENBQUE7UUFBQyxDQUFDO1FBQ3pELElBQUksWUFBWTtZQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxHQUFHLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUE7UUFDNUgsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7S0FDbEU7Q0FDRCxDQUFBO0FBRUQsd0NBQXdDO0FBQ3hDLE1BQU0sZUFBZSxHQUFHO0lBQ3ZCLG9EQUFvRDtJQUNwRCxtREFBbUQ7SUFDbkQsUUFBUSxFQUFFO1FBQ1QsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDcEMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxRQUFRLEVBQUU7UUFDVCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUNwQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELGFBQWEsRUFBRTtRQUNkLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1FBQ3BDLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsOEJBQThCO0lBQzlCLGFBQWEsRUFBRTtRQUNkLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7S0FDMUw7SUFDRCxrQkFBa0IsRUFBRTtRQUNuQixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO0tBQzFMO0NBQ3VELENBQUE7QUFFekQsTUFBTSxXQUFXLEdBQTJCO0lBQzNDLFlBQVksRUFBRSxlQUFlO0lBQzdCLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDbkMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3JDLElBQUksWUFBWSxHQUF3QyxJQUFJLENBQUE7UUFDNUQsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztZQUFFLFlBQVksR0FBRyxRQUFRLENBQUE7UUFDckQsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztZQUFFLFlBQVksR0FBRyxRQUFRLENBQUE7UUFDckQsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUFFLFlBQVksR0FBRyxRQUFRLENBQUE7UUFDbkQsSUFBSSxZQUFZO1lBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLEdBQUcsZUFBZSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUE7UUFDekgsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsZ0NBQWdDO0lBQ2hDLDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO0tBQ2xFO0NBQ0QsQ0FBQTtBQUdELDJDQUEyQztBQUMzQyxNQUFNLGtCQUFrQixHQUFHO0lBQzFCLDREQUE0RDtJQUM1RCw4QkFBOEIsRUFBRTtRQUMvQixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUU7WUFDdEIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxzQkFBc0I7WUFDdkcsaUNBQWlDLEVBQUUsSUFBSTtTQUN2QztLQUNEO0lBQ0QsdUJBQXVCLEVBQUU7UUFDeEIsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLEtBQUssRUFBRSxlQUFlO0tBQzdDO0lBQ0QsZ0NBQWdDLEVBQUU7UUFDakMsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBRSwrQ0FBK0M7UUFDbkYsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFO1lBQ3RCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixjQUFjLEVBQUUsS0FBSztZQUNyQixlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsc0JBQXNCO1lBQ3ZHLGlDQUFpQyxFQUFFLElBQUk7U0FDdkM7S0FDRDtJQUNELDBCQUEwQixFQUFFO1FBQzNCLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRTtZQUN0QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsY0FBYyxFQUFFLEtBQUs7WUFDckIsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLHNCQUFzQjtZQUN2RyxpQ0FBaUMsRUFBRSxJQUFJO1NBQ3ZDO0tBQ0Q7SUFDRCxrQkFBa0IsRUFBRTtRQUNuQixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxLQUFLLEVBQUUsU0FBUztRQUMxQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxxQ0FBcUMsRUFBRTtRQUN0QyxhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxLQUFLLEVBQUUsU0FBUztRQUMxQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDcEMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxrQkFBa0IsRUFBRTtRQUNuQixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxLQUFLLEVBQUUsU0FBUztRQUMxQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRyxtRkFBbUY7UUFDMUgsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxnQkFBZ0IsRUFBRTtRQUNqQixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFHLG1GQUFtRjtRQUN6SCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELHFCQUFxQixFQUFFO1FBQ3RCLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUcsbUZBQW1GO1FBQzNILFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0NBQ3VELENBQUE7QUFFekQsTUFBTSxjQUFjLEdBQTJCO0lBQzlDLFlBQVksRUFBRSxrQkFBa0I7SUFDaEMsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxHQUFHLE9BQU8sSUFBSSxDQUFBLENBQUMsQ0FBQztDQUNwRCxDQUFBO0FBSUQsaURBQWlEO0FBQ2pELE1BQU0sb0JBQW9CLEdBQUc7SUFDNUIsZUFBZSxFQUFFO1FBQ2hCLEdBQUcsd0NBQXdDLENBQUMsVUFBVTtRQUN0RCxhQUFhLEVBQUUsTUFBTSxFQUFFLG9EQUFvRDtRQUMzRSx3QkFBd0IsRUFBRSxLQUFLLEVBQUUsU0FBUztRQUMxQyxJQUFJLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksR0FBRztRQUNwRCxZQUFZLEVBQUUsS0FBSztLQUNuQjtJQUNELG1CQUFtQixFQUFFO1FBQ3BCLEdBQUcsd0NBQXdDLENBQUMsZUFBZTtRQUMzRCxhQUFhLEVBQUUsTUFBTTtRQUNyQix3QkFBd0IsRUFBRSxLQUFLLEVBQUUsU0FBUztRQUMxQyxJQUFJLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksR0FBRztRQUNwRCxZQUFZLEVBQUUsS0FBSztLQUNuQjtDQUN1RCxDQUFBO0FBR3pELE1BQU0sZ0JBQWdCLEdBQTJCO0lBQ2hELFlBQVksRUFBRSxvQkFBb0I7SUFDbEMsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxHQUFHLE9BQU8sSUFBSSxDQUFBLENBQUMsQ0FBQztJQUNwRCwyQkFBMkIsRUFBRTtRQUM1Qiw4SEFBOEg7UUFDOUgsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUU7S0FDbkQ7Q0FDRCxDQUFBO0FBSUQsNENBQTRDO0FBRTVDLE1BQU0sbUJBQW1CLEdBQUc7SUFDM0Isc0JBQXNCLEVBQUU7UUFDdkIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsV0FBVyxFQUFFLEtBQUs7UUFDbEIsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtRQUM1QixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCx1QkFBdUIsRUFBRTtRQUN4QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxXQUFXLEVBQUUsS0FBSztRQUNsQixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFO1FBQ3JDLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELGtCQUFrQixFQUFFO1FBQ25CLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7UUFDNUIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QseUJBQXlCLEVBQUU7UUFDMUIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxtQkFBbUI7UUFDeEQsV0FBVyxFQUFFLElBQUk7UUFDakIsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtRQUM1QixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ2xKO0lBQ0Qsd0JBQXdCLEVBQUU7UUFDekIsYUFBYSxFQUFFLE1BQU07UUFDckIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxtQkFBbUI7UUFDeEQsV0FBVyxFQUFFLElBQUk7UUFDakIsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtRQUM1QixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ2xKO0lBQ0QsdUJBQXVCLEVBQUU7UUFDeEIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsV0FBVyxFQUFFLEtBQUs7UUFDbEIsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLHFDQUFxQztRQUNuRSxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxxQkFBcUIsRUFBRTtRQUN0QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxXQUFXLEVBQUUsS0FBSztRQUNsQixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQzdCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELHFCQUFxQixFQUFFO1FBQ3RCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUU7UUFDckMscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0NBQ3VELENBQUE7QUFFekQsTUFBTSxlQUFlLEdBQTJCO0lBQy9DLFlBQVksRUFBRSxtQkFBbUI7SUFDakMsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxHQUFHLE9BQU8sSUFBSSxDQUFBLENBQUMsQ0FBQztJQUNwRCwyQkFBMkIsRUFBRTtRQUM1QixLQUFLLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxxQ0FBcUMsRUFBRTtLQUNsRTtDQUNELENBQUE7QUFHRCx5Q0FBeUM7QUFDekMsTUFBTSxnQkFBZ0IsR0FBRztJQUN4Qix5QkFBeUIsRUFBRTtRQUMxQixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxNQUFNLEVBQUUsVUFBVTtRQUM1QyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsc0JBQXNCLEVBQUU7UUFDdkIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsb0JBQW9CLEVBQUU7UUFDckIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSSxFQUFFLGlCQUFpQjtRQUNqRCxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUssRUFBRSxrREFBa0Q7UUFDdEUscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsY0FBYyxFQUFFO1FBQ2YsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSSxFQUFFLGlCQUFpQjtRQUNqRCxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRSxFQUFFLHVGQUF1RjtLQUMzTztDQUN1RCxDQUFBO0FBQ3pELE1BQU0sWUFBWSxHQUEyQjtJQUM1QyxZQUFZLEVBQUUsZ0JBQWdCO0lBQzlCLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxPQUFPLElBQUksQ0FBQSxDQUFDLENBQUM7SUFDcEQsMkJBQTJCLEVBQUU7UUFDNUIseUdBQXlHO1FBQ3pHLEtBQUssRUFBRTtZQUNOLGdCQUFnQixFQUFFLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxhQUFhLEVBQUUsa0JBQWtCO29CQUFFLE9BQU8sSUFBSSxDQUFBO2dCQUNuRCxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLEVBQUUsQ0FBQztvQkFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxDQUFBO2dCQUN0QyxDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztTQUNEO1FBQ0QsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFO0tBQzNDO0NBQ0QsQ0FBQTtBQUdELGtEQUFrRDtBQUNsRCxNQUFNLHdCQUF3QixHQUFHLEVBQ3VCLENBQUE7QUFDeEQsTUFBTSxvQkFBb0IsR0FBMkI7SUFDcEQsWUFBWSxFQUFFLHdCQUF3QjtJQUN0QyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsT0FBTyxJQUFJLENBQUEsQ0FBQyxDQUFDO0lBQ3BELDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO0tBQ2xFO0NBQ0QsQ0FBQTtBQUVELG9EQUFvRDtBQUNwRCxNQUFNLDBCQUEwQixHQUFHLEVBQ3FCLENBQUE7QUFDeEQsTUFBTSxzQkFBc0IsR0FBMkI7SUFDdEQsWUFBWSxFQUFFLDBCQUEwQjtJQUN4QyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsT0FBTyxJQUFJLENBQUEsQ0FBQyxDQUFDO0lBQ3BELDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO0tBQ2xFO0NBQ0QsQ0FBQTtBQUVELGdEQUFnRDtBQUNoRCxNQUFNLHNCQUFzQixHQUFHLEVBQ3lCLENBQUE7QUFFeEQsTUFBTSxrQkFBa0IsR0FBMkI7SUFDbEQsWUFBWSxFQUFFLHNCQUFzQjtJQUNwQyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsT0FBTyxJQUFJLENBQUEsQ0FBQyxDQUFDO0lBQ3BELDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO0tBQ2xFO0NBQ0QsQ0FBQTtBQUdELHFGQUFxRjtBQUNyRixNQUFNLGtCQUFrQixHQUFHO0lBQzFCLGtCQUFrQixFQUFFO1FBQ25CLGFBQWEsRUFBRSxNQUFNO1FBQ3JCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDN0IsV0FBVyxFQUFFLElBQUk7UUFDakIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsa0JBQWtCLEVBQUU7UUFDbkIsYUFBYSxFQUFFLE1BQU07UUFDckIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUM3QixXQUFXLEVBQUUsSUFBSTtRQUNqQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxvQkFBb0IsRUFBRTtRQUNyQixhQUFhLEVBQUUsTUFBTTtRQUNyQix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQzlCLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELFVBQVUsRUFBRTtRQUNYLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDN0IsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsZUFBZSxFQUFFO1FBQ2hCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDN0IsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsS0FBSyxFQUFFO1FBQ04sYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtRQUM1QixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ25KO0lBQ0QsYUFBYSxFQUFFO1FBQ2QsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUM3QixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ25KO0lBQ0QsaUJBQWlCLEVBQUU7UUFDbEIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtRQUM1QixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7Q0FFc0QsQ0FBQTtBQUV4RCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixDQUF3RCxDQUFBO0FBR3pLLE1BQU0sWUFBWSxHQUEyQjtJQUM1QyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUM7SUFDeEgsWUFBWSxFQUFFLEVBQUU7SUFDaEIsMkJBQTJCLEVBQUU7UUFDNUIsa0tBQWtLO1FBQ2xLLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO1FBQ2xFLE1BQU0sRUFBRSxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFO0tBQ25EO0NBQ0QsQ0FBQTtBQUVELE1BQU0sZ0JBQWdCLEdBQTJCO0lBQ2hELG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQzlJLFlBQVksRUFBRSxFQUFFO0lBQ2hCLDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO1FBQ2xFLE1BQU0sRUFBRSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTtLQUNsQztDQUNELENBQUE7QUFFRCxNQUFNLGNBQWMsR0FBMkI7SUFDOUMsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxFQUFFLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDO0lBQ3hILFlBQVksRUFBRSxrQkFBa0I7SUFDaEMsMkJBQTJCLEVBQUU7UUFDNUIsbUVBQW1FO1FBQ25FLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO1FBQ2xFLE1BQU0sRUFBRSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTtLQUNsQztDQUNELENBQUE7QUFFRCxNQUFNLGdCQUFnQixHQUEyQjtJQUNoRCxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsNkJBQTZCLENBQUMsU0FBUyxDQUFDO0lBQzdFLFlBQVksRUFBRSxFQUFFO0lBQ2hCLDJCQUEyQixFQUFFO1FBQzVCLG1HQUFtRztRQUNuRyxLQUFLLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxxQ0FBcUMsRUFBRTtRQUNsRSxNQUFNLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRTtLQUNuRDtDQUNELENBQUE7QUFFRCxNQUFNLGVBQWUsR0FBMkI7SUFDL0Msb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxFQUFFLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDO0lBQ3hILFlBQVksRUFBRSxFQUFFO0lBQ2hCLDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO1FBQ2xFLE1BQU0sRUFBRSxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFO0tBQ25EO0NBQ0QsQ0FBQTtBQUdELCtDQUErQztBQUMvQyxNQUFNLDJDQUEyQyxHQUFHO0lBQ25ELHNCQUFzQixFQUFFO1FBQ3ZCLGFBQWEsRUFBRSxNQUFNO1FBQ3JCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUU7S0FDcEc7SUFDRCxxQ0FBcUMsRUFBRTtRQUN0QyxhQUFhLEVBQUUsTUFBTTtRQUNyQix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFO0tBQ3BHO0lBQ0QsK0NBQStDLEVBQUU7UUFDaEQsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsaURBQWlELEVBQUU7UUFDbEQsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsc0NBQXNDLEVBQUU7UUFDdkMsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsa0NBQWtDLEVBQUU7UUFDbkMsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsc0JBQXNCLEVBQUU7UUFDdkIsR0FBRyx3Q0FBd0MsQ0FBQyxVQUFVO1FBQ3RELGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLFlBQVksRUFBRSxLQUFLO0tBQ25CO0lBQ0QseUJBQXlCLEVBQUU7UUFDMUIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDckMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsMkJBQTJCLEVBQUU7UUFDNUIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDckMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsc0NBQXNDLEVBQUU7UUFDdkMsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDcEMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRTtZQUN0QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLG1CQUFtQixFQUFFLEtBQUs7WUFDMUIsY0FBYyxFQUFFLElBQUk7WUFDcEIsaUNBQWlDLEVBQUUsSUFBSTtZQUN2QyxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsMkNBQTJDO1NBQzVIO0tBQ0Q7SUFDRCw2QkFBNkIsRUFBRTtRQUM5QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUNwQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUssRUFBRSw0REFBNEQ7S0FDMUY7SUFDRCw2QkFBNkIsRUFBRTtRQUM5QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUNwQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCwwQkFBMEIsRUFBRTtRQUMzQixHQUFHLHdDQUF3QyxDQUFDLFNBQVM7UUFDckQsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDakMsWUFBWSxFQUFFLEtBQUs7UUFDbkIscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELCtCQUErQixFQUFFO1FBQ2hDLEdBQUcsd0NBQXdDLENBQUMsUUFBUTtRQUNwRCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsa0NBQWtDLEVBQUU7UUFDbkMsR0FBRyx3Q0FBd0MsQ0FBQyxjQUFjLENBQUM7UUFDM0QsYUFBYSxFQUFFLE1BQU07UUFDckIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7S0FDbkI7SUFDRCxjQUFjLEVBQUU7UUFDZixHQUFHLHdDQUF3QyxDQUFDLEtBQUssQ0FBQztRQUNsRCxhQUFhLEVBQUUsTUFBTTtRQUNyQix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxZQUFZLEVBQUUsS0FBSztLQUNuQjtDQUN1RCxDQUFBO0FBRXpELE1BQU0sa0JBQWtCLEdBQTJCO0lBQ2xELFlBQVksRUFBRSwyQ0FBMkM7SUFDekQsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxNQUFNLEdBQUcsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwRCxxRUFBcUU7UUFDckUsSUFBSSxHQUFHLEVBQUUsaUJBQWlCLEtBQUssY0FBYyxFQUFFLENBQUM7WUFDL0MsR0FBRyxDQUFDLGlCQUFpQixHQUFHLGNBQWMsQ0FBQTtRQUN2QyxDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBQ0QsMkJBQTJCLEVBQUU7UUFDNUIsc0xBQXNMO1FBQ3RMLEtBQUssRUFBRTtZQUNOLHdEQUF3RDtZQUN4RCxnQkFBZ0IsRUFBRSxDQUFDLGFBQWEsRUFBRSxFQUFFO2dCQUNuQyxJQUFJLENBQUMsYUFBYSxFQUFFLGtCQUFrQjtvQkFBRSxPQUFPLElBQUksQ0FBQTtnQkFFbkQsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLHFCQUFxQixFQUFFLENBQUM7b0JBQ2xELE9BQU87d0JBQ04sU0FBUyxFQUFFOzRCQUNWLFVBQVUsRUFBRSxhQUFhLENBQUMsZUFBZTt5QkFDekM7cUJBQ0QsQ0FBQTtnQkFDRixDQUFDO2dCQUNELElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxxQkFBcUI7b0JBQy9DLE9BQU87d0JBQ04sU0FBUyxFQUFFOzRCQUNWLE1BQU0sRUFBRSxhQUFhLENBQUMsZUFBZTt5QkFDckM7cUJBQ0QsQ0FBQTtnQkFDRixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7U0FDRDtRQUNELE1BQU0sRUFBRSxFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRTtLQUMzQztDQUNELENBQUE7QUFLRCx1RUFBdUU7QUFFdkUsTUFBTSx1QkFBdUIsR0FBK0Q7SUFDM0YsTUFBTSxFQUFFLGNBQWM7SUFDdEIsU0FBUyxFQUFFLGlCQUFpQjtJQUM1QixHQUFHLEVBQUUsV0FBVztJQUNoQixNQUFNLEVBQUUsY0FBYztJQUV0QixxQkFBcUI7SUFDckIsUUFBUSxFQUFFLGdCQUFnQjtJQUMxQixJQUFJLEVBQUUsWUFBWTtJQUVsQix5REFBeUQ7SUFDekQsVUFBVSxFQUFFLGtCQUFrQjtJQUM5QixJQUFJLEVBQUUsWUFBWTtJQUNsQixNQUFNLEVBQUUsY0FBYztJQUN0QixnQkFBZ0IsRUFBRSxnQkFBZ0I7SUFDbEMsT0FBTyxFQUFFLGVBQWU7SUFFeEIsT0FBTyxFQUFFLGVBQWU7SUFDeEIsUUFBUSxFQUFFLGdCQUFnQjtJQUUxQixZQUFZLEVBQUUsb0JBQW9CO0lBQ2xDLGNBQWMsRUFBRSxzQkFBc0I7SUFDdEMsVUFBVSxFQUFFLGtCQUFrQjtDQUNyQixDQUFBO0FBR1YsNENBQTRDO0FBRTVDLDJFQUEyRTtBQUMzRSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxDQUNuQyxZQUEwQixFQUMxQixTQUFpQixFQUNqQixnQkFBOEMsRUFJN0MsRUFBRTtJQUVILE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBRWxELE1BQU0sRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUVwRiwyQ0FBMkM7SUFDM0MsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRWhFLDZDQUE2QztJQUM3QyxLQUFLLE1BQU0sVUFBVSxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sbUJBQW1CLEdBQUcsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3BELElBQUksa0JBQWtCLEtBQUssbUJBQW1CLEVBQUUsQ0FBQztZQUNoRCxPQUFPLEVBQUUsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxTQUFTLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUM1SCxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzlDLElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixPQUFPLEVBQUUsR0FBRyxNQUFNLEVBQUUsR0FBRyxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDN0YsQ0FBQztJQUVELE9BQU8sRUFBRSxTQUFTLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxHQUFHLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUN2RixDQUFDLENBQUE7QUFFRCxxQkFBcUI7QUFDckIsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxZQUEwQixFQUFFLEVBQUU7SUFDckUsTUFBTSxFQUFFLDJCQUEyQixFQUFFLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDN0UsT0FBTyxFQUFFLDJCQUEyQixFQUFFLENBQUE7QUFDdkMsQ0FBQyxDQUFBO0FBZUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FDekMsV0FBd0IsRUFDeEIsWUFBMEIsRUFDMUIsU0FBaUIsRUFDakIscUJBQXdELEVBQ3hELGdCQUE4QyxFQUM3QyxFQUFFO0lBQ0gsTUFBTSxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLEdBQUcsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQTtJQUM5SSxJQUFJLENBQUMsaUJBQWlCO1FBQUUsT0FBTyxLQUFLLENBQUE7SUFFcEMsdUVBQXVFO0lBQ3ZFLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxLQUFLLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFBO0lBRXhFLE1BQU0sa0JBQWtCLEdBQUcscUJBQXFCLEVBQUUsZ0JBQWdCLElBQUksaUJBQWlCLENBQUE7SUFDdkYsT0FBTyxrQkFBa0IsQ0FBQTtBQUMxQixDQUFDLENBQUE7QUFHRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxDQUFDLFlBQTBCLEVBQUUsU0FBaUIsRUFBRSxJQUFxRixFQUFFLEVBQUU7SUFDbkwsTUFBTSxFQUNMLHFCQUFxQixFQUNyQix3QkFBd0IsR0FDeEIsR0FBRyxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3hFLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUE7QUFDN0ksQ0FBQyxDQUFBO0FBRUQsNkdBQTZHO0FBQzdHLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLENBQ3ZDLFdBQXdCLEVBQ3hCLFlBQTBCLEVBQzFCLFNBQWlCLEVBQ2pCLHFCQUF3RCxFQUN4RCxnQkFBOEMsRUFDdEIsRUFBRTtJQUUxQixNQUFNLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLEdBQUcsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQTtJQUM5SSxNQUFNLGtCQUFrQixHQUFHLDBCQUEwQixDQUFDLFdBQVcsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDcEksSUFBSSxDQUFDLGtCQUFrQjtRQUFFLE9BQU8sSUFBSSxDQUFBO0lBRXBDLDZCQUE2QjtJQUM3QixNQUFNLGVBQWUsR0FBRyxxQkFBcUIsRUFBRSxJQUFJLEtBQUssZUFBZSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxlQUFlLElBQUkscUJBQXFCLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDOUosSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNyQixPQUFPLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsQ0FBQTtJQUNqSCxDQUFDO0lBRUQsNkJBQTZCO0lBQzdCLE1BQU0sZUFBZSxHQUFHLHFCQUFxQixFQUFFLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLGVBQWUsSUFBSSxxQkFBcUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUM5SixJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLE9BQU8sRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxDQUFBO0lBQ2pILENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMsQ0FBQSJ9