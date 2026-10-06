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
    ainativeCloud: {
        // Chat completions (`POST /api/v1/chat/completions`) authenticate with an
        // AINative API key sent as the `X-API-Key` header — NOT with the JWT issued
        // by `/api/v1/auth/login`. JWT bearer auth covers the user-session endpoints
        // (`/api/v1/auth/*`, `/api/v1/users/me`) and remains only a legacy fallback
        // for inference. See docs/api/BACKEND_CONTRACT_NOTES.md.
        //
        // This key MUST be declared here: `customSettingNamesOfProvider()` derives
        // the Settings UI fields from `Object.keys(defaultProviderSettings[provider])`,
        // so an empty object renders no API key input and the stored key stays
        // undefined forever. Read it as `settingsOfProvider.ainativeCloud.apiKey`,
        // exactly like every other BYOK provider.
        apiKey: '',
    },
    cerebras: {
        // Cerebras Inference is OpenAI-API-compatible and authenticates with a plain
        // bearer token: `Authorization: Bearer <key>`, base URL https://api.cerebras.ai/v1.
        // Keys are created in the Cerebras Cloud console (https://cloud.cerebras.ai).
        apiKey: '',
    },
    fireworks: {
        // Fireworks AI is OpenAI-API-compatible and authenticates with a plain bearer
        // token: `Authorization: Bearer <key>`, base URL https://api.fireworks.ai/inference/v1.
        apiKey: '',
    },
    digitalOcean: {
        // DigitalOcean Gradient AI serverless inference is OpenAI-API-compatible and
        // authenticates with a model access key as a plain bearer token:
        // `Authorization: Bearer <key>`, base URL https://inference.do-ai.run/v1.
        apiKey: '',
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
    // AINative Cloud unified API. IDs confirmed against the live catalog
    // (`GET /api/v1/public/ai-registry/models`, unauthenticated) on 2026-10-05.
    // Note the spelling: the backend uses DASH-separated versions (`gpt-5-3-codex`),
    // not dots. A dotted ID is rejected with `{"detail":"Model not found"}`, so
    // do not "correct" these to `gpt-5.3-codex` / `claude-sonnet-4.5`.
    // Longer term this static list should be replaced by a live call to
    // `GET /v1/public/models/available` — see docs/api/BACKEND_CONTRACT_NOTES.md.
    ainativeCloud: [
        'gpt-5-3-codex',
        'qwen3-coder-30b-a3b',
        'qwen-coder-32b',
        'claude-sonnet-4-5',
        'claude-opus-4-6',
    ],
    liteLLM: [],
    cerebras: [
        // Cerebras Shared Inference currently serves a short, fast-rotating lineup.
        // Verified against the public model overview — re-check when models change.
        'gpt-oss-120b',
        'qwen-3.8-27b',
    ],
    fireworks: [
        // NOTE: Fireworks exposes two ID namespaces — full paths under
        // `accounts/fireworks/models/...` and short canonical router IDs (e.g.
        // `firerouter/opus`, `kimi-latest`). Fireworks' own docs call the alias list
        // "a snapshot" that moves to newer models or retires, so this list WILL go
        // stale; the authoritative lineup is https://fireworks.ai/models.
        'accounts/fireworks/models/kimi-k3',
        'accounts/fireworks/models/deepseek-v4p1-flash',
        'accounts/fireworks/models/glm-5p3',
        'accounts/fireworks/models/gpt-oss-120b',
    ],
    digitalOcean: [
        // DigitalOcean Gradient AI proxies 70+ models; these are the coding-relevant
        // flagships. The full catalog (which changes often) is at the URL above —
        // users can add any other model ID manually in Settings.
        'anthropic-claude-sonnet-5.5',
        'openai-gpt-5.3-codex',
        'deepseek-v4.1-flash',
        'kimi-k3',
        'glm-5.3',
        'openai-gpt-oss-120b',
    ],
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
// ---------------- AINATIVE CLOUD ----------------
// Context windows below are the live values reported by the AINative model
// catalog (`GET /api/v1/public/ai-registry/models`, unauthenticated) as of
// 2026-10-05. Where the catalog reports 0 (an unpopulated record rather than a
// real limit) the model family's documented window is used instead and marked.
//
// `cost` is 0 for every entry because AINative Cloud inference is billed in
// account credits, not per-token at the provider's list price — the IDE's
// per-token cost estimate does not apply. Credits balance comes from the
// separate `GET /api/v1/public/credits/balance` call.
const ainativeCloudModelOptions = {
    'gpt-5-3-codex': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 0, output: 0 }, // billed in credits, see above
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen3-coder-30b-a3b': {
        contextWindow: 262_144,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen-coder-32b': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen-coder-7b': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'claude-sonnet-4-5': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'claude-sonnet-4-6': {
        contextWindow: 200_000, // catalog reports 0 (unpopulated); Claude family default
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'claude-opus-4-5': {
        contextWindow: 200_000, // catalog reports 0 (unpopulated); Claude family default
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'claude-opus-4-6': {
        contextWindow: 200_000, // catalog reports 0 (unpopulated); Claude family default
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
};
const ainativeCloudSettings = {
    modelOptions: ainativeCloudModelOptions,
    // Map a few near-miss spellings onto the real catalog IDs so a user who typed
    // a dotted version (or carried over a stale default) still gets correct
    // capabilities rather than the unrecognized-model fallback. This does not
    // change the ID sent to the backend — only the capabilities looked up for it.
    modelOptionsFallback: (modelName) => {
        const lower = modelName.toLowerCase().replace(/\./g, '-');
        let fallbackName = null;
        if (lower.includes('gpt-5-3-codex'))
            fallbackName = 'gpt-5-3-codex';
        else if (lower.includes('qwen3-coder-30b'))
            fallbackName = 'qwen3-coder-30b-a3b';
        else if (lower.includes('qwen-coder-32b'))
            fallbackName = 'qwen-coder-32b';
        else if (lower.includes('qwen-coder-7b'))
            fallbackName = 'qwen-coder-7b';
        else if (lower.includes('claude-opus-4-6'))
            fallbackName = 'claude-opus-4-6';
        else if (lower.includes('claude-opus-4-5'))
            fallbackName = 'claude-opus-4-5';
        else if (lower.includes('claude-sonnet-4-6'))
            fallbackName = 'claude-sonnet-4-6';
        else if (lower.includes('claude-sonnet-4-5'))
            fallbackName = 'claude-sonnet-4-5';
        if (fallbackName)
            return { modelName, recognizedModelName: fallbackName, ...ainativeCloudModelOptions[fallbackName] };
        return null;
    },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- CEREBRAS ----------------
// OpenAI-compatible (bearer token, https://api.cerebras.ai/v1).
// https://inference-docs.cerebras.ai/models/overview
const cerebrasModelOptions = {
    'gpt-oss-120b': {
        contextWindow: 131_000, // 65k on the free tier, 131k on paid
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0.25, output: 0.69 }, // pricing not published per-model in docs; approximate
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: false, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'qwen-3.8-27b': {
        contextWindow: 128_000, // 64k free tier / 128k paid
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0.25, output: 0.69 }, // approximate, see above
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
    },
};
const cerebrasSettings = {
    modelOptions: cerebrasModelOptions,
    // Cerebras rotates its lineup often, so fall back to generic open-source
    // heuristics rather than refusing unrecognized model names.
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName),
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning' },
    },
};
// ---------------- FIREWORKS AI ----------------
// OpenAI-compatible (bearer token, https://api.fireworks.ai/inference/v1).
// https://docs.fireworks.ai/guides/querying-text-models
const fireworksModelOptions = {
    'accounts/fireworks/models/kimi-k3': {
        contextWindow: 256_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 3.00, output: 15.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'accounts/fireworks/models/deepseek-v4p1-flash': {
        contextWindow: 163_840,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0.30, output: 1.20 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'accounts/fireworks/models/glm-5p3': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 1.40, output: 4.40 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'accounts/fireworks/models/gpt-oss-120b': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0.15, output: 0.60 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: false, openSourceThinkTags: ['<think>', '</think>'] },
    },
};
const fireworksSettings = {
    modelOptions: fireworksModelOptions,
    // Fireworks serves 100+ models plus moving aliases, so unrecognized names must
    // still work rather than erroring out.
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName),
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
// ---------------- DIGITALOCEAN (Gradient AI serverless inference) ----------------
// OpenAI-compatible (model access key as bearer token, https://inference.do-ai.run/v1).
// https://docs.digitalocean.com/products/inference/details/models/
const digitalOceanModelOptions = {
    'anthropic-claude-sonnet-5.5': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 2.00, output: 10.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: true },
    },
    'openai-gpt-5.3-codex': {
        contextWindow: 400_000,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 1.25, output: 10.00 }, // pricing not individually confirmed
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: false, canTurnOffReasoning: false },
    },
    'deepseek-v4.1-flash': {
        contextWindow: 163_840,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0.30, output: 1.20 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'kimi-k3': {
        contextWindow: 256_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 3.00, output: 15.00 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'glm-5.3': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 1.40, output: 4.40 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: true, openSourceThinkTags: ['<think>', '</think>'] },
    },
    'openai-gpt-oss-120b': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0.10, output: 0.70 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: { supportsReasoning: true, canIOReasoning: true, canTurnOffReasoning: false, openSourceThinkTags: ['<think>', '</think>'] },
    },
};
const digitalOceanSettings = {
    modelOptions: digitalOceanModelOptions,
    // DigitalOcean proxies 70+ models and adds new ones continuously; `GET /v1/models`
    // is the source of truth, so unrecognized names fall back instead of erroring.
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName),
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
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
    ainativeCloud: ainativeCloudSettings,
    // BYOK OpenAI-compatible inference providers
    cerebras: cerebrasSettings,
    fireworks: fireworksSettings,
    digitalOcean: digitalOceanSettings,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxDYXBhYmlsaXRpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9tb2RlbENhcGFiaWxpdGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQVExRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRztJQUN0QyxTQUFTLEVBQUU7UUFDVixNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsTUFBTSxFQUFFO1FBQ1AsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELFFBQVEsRUFBRTtRQUNULE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxNQUFNLEVBQUU7UUFDUCxRQUFRLEVBQUUsd0JBQXdCO0tBQ2xDO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsUUFBUSxFQUFFLHVCQUF1QjtLQUNqQztJQUNELFVBQVUsRUFBRTtRQUNYLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxnQkFBZ0IsRUFBRTtRQUNqQixRQUFRLEVBQUUsRUFBRTtRQUNaLE1BQU0sRUFBRSxFQUFFO1FBQ1YsV0FBVyxFQUFFLElBQUksRUFBRSxnQkFBZ0I7S0FDbkM7SUFDRCxNQUFNLEVBQUU7UUFDUCxNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELEdBQUcsRUFBRTtRQUNKLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxPQUFPLEVBQUU7UUFDUixNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsUUFBUSxFQUFFO1FBQ1QsUUFBUSxFQUFFLHVCQUF1QjtLQUNqQztJQUNELE9BQU8sRUFBRTtRQUNSLFFBQVEsRUFBRSxFQUFFO0tBQ1o7SUFDRCxZQUFZLEVBQUU7UUFDYixNQUFNLEVBQUUsVUFBVTtRQUNsQixPQUFPLEVBQUUsRUFBRTtLQUNYO0lBQ0QsY0FBYyxFQUFFO1FBQ2YsT0FBTyxFQUFFLEVBQUUsRUFBRSxvQkFBb0I7UUFDakMsTUFBTSxFQUFFLEVBQUU7UUFDVixlQUFlLEVBQUUsb0JBQW9CO0tBQ3JDO0lBQ0QsVUFBVSxFQUFFO1FBQ1gsTUFBTSxFQUFFLEVBQUU7UUFDVixNQUFNLEVBQUUsV0FBVyxFQUFFLHFCQUFxQjtRQUMxQyxRQUFRLEVBQUUsRUFBRSxFQUFFLHNDQUFzQztLQUNwRDtJQUNELGFBQWEsRUFBRTtRQUNkLDBFQUEwRTtRQUMxRSw0RUFBNEU7UUFDNUUsNkVBQTZFO1FBQzdFLDRFQUE0RTtRQUM1RSx5REFBeUQ7UUFDekQsRUFBRTtRQUNGLDJFQUEyRTtRQUMzRSxnRkFBZ0Y7UUFDaEYsdUVBQXVFO1FBQ3ZFLDJFQUEyRTtRQUMzRSwwQ0FBMEM7UUFDMUMsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELFFBQVEsRUFBRTtRQUNULDZFQUE2RTtRQUM3RSxvRkFBb0Y7UUFDcEYsOEVBQThFO1FBQzlFLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxTQUFTLEVBQUU7UUFDViw4RUFBOEU7UUFDOUUsd0ZBQXdGO1FBQ3hGLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxZQUFZLEVBQUU7UUFDYiw2RUFBNkU7UUFDN0UsaUVBQWlFO1FBQ2pFLDBFQUEwRTtRQUMxRSxNQUFNLEVBQUUsRUFBRTtLQUNWO0NBRVEsQ0FBQTtBQUtWLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHO0lBQ3RDLE1BQU0sRUFBRTtRQUNQLFNBQVM7UUFDVCxjQUFjO1FBQ2QsY0FBYztRQUNkLElBQUk7UUFDSixTQUFTO1FBQ1QsUUFBUTtRQUNSLGFBQWE7UUFDYixZQUFZO1FBQ1osaUJBQWlCO0tBQ2pCO0lBQ0QsU0FBUyxFQUFFO1FBQ1YsaUJBQWlCO1FBQ2pCLG1CQUFtQjtRQUNuQiwwQkFBMEI7UUFDMUIsMEJBQTBCO1FBQzFCLHlCQUF5QjtRQUN6QixzQkFBc0I7S0FDdEI7SUFDRCxHQUFHLEVBQUU7UUFDSixRQUFRO1FBQ1IsUUFBUTtRQUNSLGFBQWE7UUFDYixhQUFhO1FBQ2Isa0JBQWtCO0tBQ2xCO0lBQ0QsTUFBTSxFQUFFO1FBQ1AsMEJBQTBCO1FBQzFCLGdDQUFnQztRQUNoQyxrQkFBa0I7UUFDbEIsdUJBQXVCO1FBQ3ZCLDhCQUE4QjtLQUM5QjtJQUNELFFBQVEsRUFBRTtRQUNULGVBQWU7UUFDZixtQkFBbUI7S0FDbkI7SUFDRCxNQUFNLEVBQUUsRUFBRSxlQUFlO0tBQ3hCO0lBQ0QsSUFBSSxFQUFFLEVBQUUsZUFBZTtLQUN0QjtJQUNELFFBQVEsRUFBRSxFQUFFLEVBQUUsZUFBZTtJQUU3QixVQUFVLEVBQUU7UUFDWCwwQ0FBMEM7UUFDMUMseUJBQXlCO1FBQ3pCLDJCQUEyQjtRQUMzQixzQkFBc0I7UUFDdEIsNkJBQTZCO1FBQzdCLDZCQUE2QjtRQUM3QixzQkFBc0I7UUFDdEIsZ0NBQWdDO1FBQ2hDLCtCQUErQjtRQUMvQiw2QkFBNkI7UUFDN0IseUNBQXlDO1FBQ3pDLDhCQUE4QjtRQUM5QixzQ0FBc0M7UUFDdEMsbURBQW1EO1FBQ25ELHFEQUFxRDtRQUNyRCwwQ0FBMEM7UUFDMUMsc0NBQXNDO0tBQ3RDO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsY0FBYztRQUNkLHlCQUF5QjtRQUN6QixzQkFBc0I7UUFDdEIsdURBQXVEO0tBQ3ZEO0lBQ0QsT0FBTyxFQUFFO1FBQ1Isa0JBQWtCO1FBQ2xCLHVCQUF1QjtRQUN2QixzQkFBc0I7UUFDdEIsdUJBQXVCO1FBQ3ZCLHFCQUFxQjtRQUNyQixxQkFBcUI7S0FDckI7SUFDRCxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsV0FBVztJQUNqQyxZQUFZLEVBQUUsRUFBRTtJQUNoQixjQUFjLEVBQUUsRUFBRTtJQUNsQixVQUFVLEVBQUUsRUFBRTtJQUNkLHFFQUFxRTtJQUNyRSw0RUFBNEU7SUFDNUUsaUZBQWlGO0lBQ2pGLDRFQUE0RTtJQUM1RSxtRUFBbUU7SUFDbkUsb0VBQW9FO0lBQ3BFLDhFQUE4RTtJQUM5RSxhQUFhLEVBQUU7UUFDZCxlQUFlO1FBQ2YscUJBQXFCO1FBQ3JCLGdCQUFnQjtRQUNoQixtQkFBbUI7UUFDbkIsaUJBQWlCO0tBQ2pCO0lBQ0QsT0FBTyxFQUFFLEVBQUU7SUFDWCxRQUFRLEVBQUU7UUFDVCw0RUFBNEU7UUFDNUUsNEVBQTRFO1FBQzVFLGNBQWM7UUFDZCxjQUFjO0tBQ2Q7SUFDRCxTQUFTLEVBQUU7UUFDViwrREFBK0Q7UUFDL0QsdUVBQXVFO1FBQ3ZFLDZFQUE2RTtRQUM3RSwyRUFBMkU7UUFDM0Usa0VBQWtFO1FBQ2xFLG1DQUFtQztRQUNuQywrQ0FBK0M7UUFDL0MsbUNBQW1DO1FBQ25DLHdDQUF3QztLQUN4QztJQUNELFlBQVksRUFBRTtRQUNiLDZFQUE2RTtRQUM3RSwwRUFBMEU7UUFDMUUseURBQXlEO1FBQ3pELDZCQUE2QjtRQUM3QixzQkFBc0I7UUFDdEIscUJBQXFCO1FBQ3JCLFNBQVM7UUFDVCxTQUFTO1FBQ1QscUJBQXFCO0tBQ3JCO0NBR2lELENBQUE7QUE4Q25ELHFFQUFxRTtBQUlyRSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRztJQUNoQyxlQUFlO0lBQ2YsMEJBQTBCO0lBQzFCLHVCQUF1QjtJQUN2QixtQkFBbUI7SUFDbkIsYUFBYTtJQUNiLHVCQUF1QjtJQUN2Qix5QkFBeUI7Q0FDaEIsQ0FBQTtBQTRCVixNQUFNLG1CQUFtQixHQUFHO0lBQzNCLGFBQWEsRUFBRSxLQUFLO0lBQ3BCLHdCQUF3QixFQUFFLEtBQUs7SUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO0lBQzdCLFlBQVksRUFBRSxLQUFLO0lBQ25CLHFCQUFxQixFQUFFLEtBQUs7SUFDNUIsV0FBVyxFQUFFLEtBQUs7SUFDbEIscUJBQXFCLEVBQUUsS0FBSztDQUNXLENBQUE7QUFFeEMsK0NBQStDO0FBQy9DLHVDQUF1QztBQUN2QyxnR0FBZ0c7QUFDaEcsTUFBTSx3Q0FBd0MsR0FBRztJQUNoRCxZQUFZLEVBQUU7UUFDYixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO1FBQ2xKLGFBQWEsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN0RDtJQUNELGlCQUFpQixFQUFFO1FBQ2xCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLEtBQUssRUFBRSxXQUFXO1FBQ3pDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBQ0QsaUJBQWlCLEVBQUU7UUFDbEIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsS0FBSyxFQUFFLFdBQVc7UUFDekMscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdEQ7SUFDRCxXQUFXLEVBQUU7UUFDWixXQUFXLEVBQUUsSUFBSTtRQUNqQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBQ0QsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN2RDtJQUNELGtCQUFrQixFQUFFO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSyxFQUFFLGlDQUFpQztRQUMvRCxhQUFhLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdkQ7SUFFRCxrRkFBa0Y7SUFDbEYsTUFBTSxFQUFFO1FBQ1AsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRTtRQUNqSixhQUFhLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdEQ7SUFFRCxPQUFPLEVBQUU7UUFDUixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBQ0Qsb0VBQW9FO0lBQ3BFLGNBQWMsRUFBRTtRQUNmLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsVUFBVSxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDMUQ7SUFDRCxpQkFBaUIsRUFBRTtRQUNsQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLFVBQVUsRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQzFEO0lBRUQsVUFBVTtJQUNWLFFBQVEsRUFBRTtRQUNULFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdEQ7SUFDRCxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBQ0QsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN0RDtJQUNELFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FDdEQ7SUFDRCxPQUFPO0lBQ1AsY0FBYyxFQUFFO1FBQ2YsV0FBVyxFQUFFLElBQUk7UUFDakIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsS0FBSztLQUN0RDtJQUNELEtBQUssRUFBRTtRQUNOLFdBQVcsRUFBRSxLQUFLLEVBQUUsd0JBQXdCO1FBQzVDLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUU7UUFDbEosYUFBYSxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3ZEO0lBQ0QsT0FBTyxFQUFFO1FBQ1IsV0FBVyxFQUFFLEtBQUssRUFBRSxlQUFlO1FBQ25DLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUU7UUFDakosYUFBYSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBQ3REO0lBQ0QsV0FBVztJQUNYLFlBQVksRUFBRTtRQUNiLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIscUJBQXFCLEVBQUUsS0FBSztRQUM1QixhQUFhLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLEtBQUs7S0FFdkQ7SUFDRCxjQUFjLEVBQUU7UUFDZixXQUFXLEVBQUUsSUFBSTtRQUNqQixxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLHFCQUFxQixFQUFFLEtBQUs7UUFDNUIsYUFBYSxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxLQUFLO0tBRXZEO0lBQ0QsUUFBUSxFQUFFO1FBQ1QsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO1FBQzVCLGFBQWEsRUFBRSxTQUFTLEVBQUUsd0JBQXdCLEVBQUUsTUFBTTtLQUMxRDtDQUNnRSxDQUFBO0FBS2xFLGtEQUFrRDtBQUNsRCxNQUFNLDZCQUE2QixHQUFtRCxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxFQUFFO0lBRXhILE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUVyQyxNQUFNLFVBQVUsR0FBRyxDQUFpRixHQUFNLEVBQUUsbUJBQXFDLEVBQ3JFLEVBQUU7UUFFN0UsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDckMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLEtBQUssV0FBVztZQUN2RSxDQUFDLENBQUMsYUFBYTtZQUNmLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUE7UUFFN0IsT0FBTztZQUNOLG1CQUFtQjtZQUNuQixTQUFTO1lBQ1QsR0FBRyxJQUFJO1lBQ1AscUJBQXFCLEVBQUUscUJBQXFCO1lBQzVDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtZQUM3QixZQUFZLEVBQUUsS0FBSztZQUNuQixHQUFHLG1CQUFtQjtTQUN0QixDQUFDO0lBQ0gsQ0FBQyxDQUFBO0lBRUQsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtJQUVuSixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO0lBQ3hJLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO0lBRXBHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNwRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBRXhFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDbkosSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtJQUN0SSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtJQUU5RyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbkcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyx3Q0FBd0MsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN2RyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDdkcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDbkksSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDdEksSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBRXhHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDM0osSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDdkgsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ2hHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQUMsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFBQyxDQUFDO0lBQ2pHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyx3Q0FBd0MsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMvRixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDekcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBRXZHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyx3Q0FBd0MsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUVqRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFFM0csSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLHdDQUF3QyxFQUFFLGtCQUFrQixDQUFDLENBQUEsQ0FBQyxvQkFBb0I7SUFFckksSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFFL0gsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUM5SixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzlKLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBRS9ILElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQ3hHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUV6RSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFBRSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNwRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQUUsT0FBTyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDcEcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3JFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUFFLE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBR3BHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUFDbEcsT0FBTyxVQUFVLENBQUMsd0NBQXdDLEVBQUUsS0FBOEQsQ0FBQyxDQUFBO0lBRTVILE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyxDQUFBO0FBT0QsOENBQThDO0FBQzlDLE1BQU0scUJBQXFCLEdBQUc7SUFDN0IsNEJBQTRCLEVBQUU7UUFDN0IsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1FBQ3pFLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGlCQUFpQjtRQUNwQyxxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLHFCQUFxQixFQUFFO1lBQ3RCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixjQUFjLEVBQUUsSUFBSTtZQUNwQixpQ0FBaUMsRUFBRSxJQUFJLEVBQUUsK0RBQStEO1lBQ3hHLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxzSEFBc0g7U0FDdk07S0FFRDtJQUNELHdCQUF3QixFQUFFO1FBQ3pCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUMzRSxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxpQkFBaUI7UUFDcEMscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxxQkFBcUIsRUFBRTtZQUN0QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsY0FBYyxFQUFFLElBQUk7WUFDcEIsaUNBQWlDLEVBQUUsSUFBSSxFQUFFLCtEQUErRDtZQUN4RyxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsc0hBQXNIO1NBQ3ZNO0tBRUQ7SUFDRCwwQkFBMEIsRUFBRTtRQUMzQixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDeEUsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsaUJBQWlCO1FBQ3BDLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMscUJBQXFCLEVBQUU7WUFDdEIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGlDQUFpQyxFQUFFLElBQUksRUFBRSwrREFBK0Q7WUFDeEcsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLHNIQUFzSDtTQUN2TTtLQUVEO0lBQ0QsNEJBQTRCLEVBQUU7UUFDN0IsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1FBQ3pFLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGlCQUFpQjtRQUNwQyxxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCwyQkFBMkIsRUFBRTtRQUM1QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDeEUsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsaUJBQWlCO1FBQ3BDLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELHdCQUF3QixFQUFFO1FBQ3pCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUMzRSxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxpQkFBaUI7UUFDcEMscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsMEJBQTBCLEVBQUU7UUFDM0IsYUFBYSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDNUQsWUFBWSxFQUFFLEtBQUs7UUFDbkIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxpQkFBaUI7UUFDcEMscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0NBQ3VELENBQUE7QUFFekQsTUFBTSxpQkFBaUIsR0FBMkI7SUFDakQsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFO1lBQ04sZ0JBQWdCLEVBQUUsQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLGFBQWEsRUFBRSxrQkFBa0I7b0JBQUUsT0FBTyxJQUFJLENBQUE7Z0JBRW5ELElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxxQkFBcUIsRUFBRSxDQUFDO29CQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsYUFBYSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUE7Z0JBQ3ZGLENBQUM7Z0JBQ0QsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0Q7S0FDRDtJQUNELFlBQVksRUFBRSxxQkFBcUI7SUFDbkMsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDckMsSUFBSSxZQUFZLEdBQThDLElBQUksQ0FBQTtRQUNsRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUM7WUFBRSxZQUFZLEdBQUcsd0JBQXdCLENBQUE7UUFDL0csSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztZQUFFLFlBQVksR0FBRywwQkFBMEIsQ0FBQTtRQUdySCxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUM7WUFBRSxZQUFZLEdBQUcsNEJBQTRCLENBQUE7UUFDcEYsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDO1lBQUUsWUFBWSxHQUFHLDRCQUE0QixDQUFBO1FBQ3BGLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQztZQUFFLFlBQVksR0FBRywyQkFBMkIsQ0FBQTtRQUNsRixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO1lBQUUsWUFBWSxHQUFHLHdCQUF3QixDQUFBO1FBQzVFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztZQUFFLFlBQVksR0FBRywwQkFBMEIsQ0FBQTtRQUNoRixJQUFJLFlBQVk7WUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFBO1FBQy9ILE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNELENBQUE7QUFHRCwyQ0FBMkM7QUFDM0MsTUFBTSxrQkFBa0IsR0FBRztJQUMxQixJQUFJLEVBQUU7UUFDTCxhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO1FBQ3ZELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsZ0JBQWdCO1FBQ3ZDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7S0FDcE07SUFDRCxTQUFTLEVBQUU7UUFDVixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFO1FBQ3RELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsZ0JBQWdCO1FBQ3ZDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7S0FDcE07SUFDRCxTQUFTLEVBQUU7UUFDVixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO1FBQ3JELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsZ0JBQWdCO1FBQ3ZDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxjQUFjLEVBQUU7UUFDZixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO1FBQ3JELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsZ0JBQWdCO1FBQ3ZDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxjQUFjLEVBQUU7UUFDZixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO1FBQ3JELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsZ0JBQWdCO1FBQ3ZDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxJQUFJLEVBQUU7UUFDTCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxPQUFPO1FBQ2pDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxHQUFHO1FBQ3hELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGdCQUFnQjtRQUN2QyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO0tBQ3BNO0lBQ0QsU0FBUyxFQUFFO1FBQ1YsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsT0FBTztRQUNqQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksR0FBRztRQUN0RCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxnQkFBZ0I7UUFDdkMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRTtLQUNwTTtJQUNELFFBQVEsRUFBRTtRQUNULGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE1BQU07UUFDaEMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEdBQUc7UUFDdkQsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxTQUFTLEVBQUU7UUFDVixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxHQUFHO1FBQ3RELFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLEtBQUssRUFBRSw4QkFBOEI7UUFDNUQscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRTtLQUNwTTtJQUNELGFBQWEsRUFBRTtRQUNkLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE1BQU07UUFDaEMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEdBQUc7UUFDdkQsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxhQUFhLEVBQUUsS0FBSztRQUMzQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0NBQ3VELENBQUE7QUFHekQsa0VBQWtFO0FBQ2xFLE1BQU0scUNBQXFDLEdBQUcsQ0FBQyxhQUFvQyxFQUFFLEVBQUU7SUFDdEYsSUFBSSxDQUFDLGFBQWEsRUFBRSxrQkFBa0I7UUFBRSxPQUFPLElBQUksQ0FBQTtJQUNuRCxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLEVBQUUsQ0FBQztRQUNsRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQzNELENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUVaLENBQUMsQ0FBQTtBQUVELE1BQU0sY0FBYyxHQUEyQjtJQUM5QyxZQUFZLEVBQUUsa0JBQWtCO0lBQ2hDLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDbkMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3JDLElBQUksWUFBWSxHQUEyQyxJQUFJLENBQUE7UUFDL0QsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1FBQUMsQ0FBQztRQUNqRCxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUFDLFlBQVksR0FBRyxTQUFTLENBQUE7UUFBQyxDQUFDO1FBQzNELElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQTtRQUFDLENBQUM7UUFDekQsSUFBSSxZQUFZO1lBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQTtRQUM1SCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCwyQkFBMkIsRUFBRTtRQUM1QixLQUFLLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxxQ0FBcUMsRUFBRTtLQUNsRTtDQUNELENBQUE7QUFFRCx3Q0FBd0M7QUFDeEMsTUFBTSxlQUFlLEdBQUc7SUFDdkIsb0RBQW9EO0lBQ3BELG1EQUFtRDtJQUNuRCxRQUFRLEVBQUU7UUFDVCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUNwQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELFFBQVEsRUFBRTtRQUNULGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1FBQ3BDLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsYUFBYSxFQUFFO1FBQ2QsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDcEMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCw4QkFBOEI7SUFDOUIsYUFBYSxFQUFFO1FBQ2QsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRTtLQUMxTDtJQUNELGtCQUFrQixFQUFFO1FBQ25CLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7S0FDMUw7Q0FDdUQsQ0FBQTtBQUV6RCxNQUFNLFdBQVcsR0FBMkI7SUFDM0MsWUFBWSxFQUFFLGVBQWU7SUFDN0Isb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDckMsSUFBSSxZQUFZLEdBQXdDLElBQUksQ0FBQTtRQUM1RCxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1lBQUUsWUFBWSxHQUFHLFFBQVEsQ0FBQTtRQUNyRCxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1lBQUUsWUFBWSxHQUFHLFFBQVEsQ0FBQTtRQUNyRCxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQUUsWUFBWSxHQUFHLFFBQVEsQ0FBQTtRQUNuRCxJQUFJLFlBQVk7WUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsR0FBRyxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQTtRQUN6SCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxnQ0FBZ0M7SUFDaEMsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7S0FDbEU7Q0FDRCxDQUFBO0FBR0QsMkNBQTJDO0FBQzNDLE1BQU0sa0JBQWtCLEdBQUc7SUFDMUIsNERBQTREO0lBQzVELDhCQUE4QixFQUFFO1FBQy9CLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRTtZQUN0QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsY0FBYyxFQUFFLEtBQUs7WUFDckIsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLHNCQUFzQjtZQUN2RyxpQ0FBaUMsRUFBRSxJQUFJO1NBQ3ZDO0tBQ0Q7SUFDRCx1QkFBdUIsRUFBRTtRQUN4QixhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsS0FBSyxFQUFFLGVBQWU7S0FDN0M7SUFDRCxnQ0FBZ0MsRUFBRTtRQUNqQyxhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLCtDQUErQztRQUNuRixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUU7WUFDdEIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxzQkFBc0I7WUFDdkcsaUNBQWlDLEVBQUUsSUFBSTtTQUN2QztLQUNEO0lBQ0QsMEJBQTBCLEVBQUU7UUFDM0IsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFO1lBQ3RCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixjQUFjLEVBQUUsS0FBSztZQUNyQixlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsc0JBQXNCO1lBQ3ZHLGlDQUFpQyxFQUFFLElBQUk7U0FDdkM7S0FDRDtJQUNELGtCQUFrQixFQUFFO1FBQ25CLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLHdCQUF3QixFQUFFLEtBQUssRUFBRSxTQUFTO1FBQzFDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELHFDQUFxQyxFQUFFO1FBQ3RDLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLHdCQUF3QixFQUFFLEtBQUssRUFBRSxTQUFTO1FBQzFDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNwQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELGtCQUFrQixFQUFFO1FBQ25CLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLHdCQUF3QixFQUFFLEtBQUssRUFBRSxTQUFTO1FBQzFDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFHLG1GQUFtRjtRQUMxSCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxXQUFXO1FBQ2xDLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELGdCQUFnQixFQUFFO1FBQ2pCLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUcsbUZBQW1GO1FBQ3pILFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QscUJBQXFCLEVBQUU7UUFDdEIsYUFBYSxFQUFFLFNBQVM7UUFDeEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRyxtRkFBbUY7UUFDM0gsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsV0FBVztRQUNsQyxpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7Q0FDdUQsQ0FBQTtBQUV6RCxNQUFNLGNBQWMsR0FBMkI7SUFDOUMsWUFBWSxFQUFFLGtCQUFrQjtJQUNoQyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsT0FBTyxJQUFJLENBQUEsQ0FBQyxDQUFDO0NBQ3BELENBQUE7QUFJRCxpREFBaUQ7QUFDakQsTUFBTSxvQkFBb0IsR0FBRztJQUM1QixlQUFlLEVBQUU7UUFDaEIsR0FBRyx3Q0FBd0MsQ0FBQyxVQUFVO1FBQ3RELGFBQWEsRUFBRSxNQUFNLEVBQUUsb0RBQW9EO1FBQzNFLHdCQUF3QixFQUFFLEtBQUssRUFBRSxTQUFTO1FBQzFDLElBQUksRUFBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxHQUFHO1FBQ3BELFlBQVksRUFBRSxLQUFLO0tBQ25CO0lBQ0QsbUJBQW1CLEVBQUU7UUFDcEIsR0FBRyx3Q0FBd0MsQ0FBQyxlQUFlO1FBQzNELGFBQWEsRUFBRSxNQUFNO1FBQ3JCLHdCQUF3QixFQUFFLEtBQUssRUFBRSxTQUFTO1FBQzFDLElBQUksRUFBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxHQUFHO1FBQ3BELFlBQVksRUFBRSxLQUFLO0tBQ25CO0NBQ3VELENBQUE7QUFHekQsTUFBTSxnQkFBZ0IsR0FBMkI7SUFDaEQsWUFBWSxFQUFFLG9CQUFvQjtJQUNsQyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsT0FBTyxJQUFJLENBQUEsQ0FBQyxDQUFDO0lBQ3BELDJCQUEyQixFQUFFO1FBQzVCLDhIQUE4SDtRQUM5SCxLQUFLLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxxQ0FBcUMsRUFBRTtRQUNsRSxNQUFNLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRTtLQUNuRDtDQUNELENBQUE7QUFJRCw0Q0FBNEM7QUFFNUMsTUFBTSxtQkFBbUIsR0FBRztJQUMzQixzQkFBc0IsRUFBRTtRQUN2QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxXQUFXLEVBQUUsS0FBSztRQUNsQixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO1FBQzVCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELHVCQUF1QixFQUFFO1FBQ3hCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUU7UUFDckMscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0Qsa0JBQWtCLEVBQUU7UUFDbkIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsV0FBVyxFQUFFLElBQUk7UUFDakIsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtRQUM1QixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCx5QkFBeUIsRUFBRTtRQUMxQixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLG1CQUFtQjtRQUN4RCxXQUFXLEVBQUUsSUFBSTtRQUNqQixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO1FBQzVCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUU7S0FDbEo7SUFDRCx3QkFBd0IsRUFBRTtRQUN6QixhQUFhLEVBQUUsTUFBTTtRQUNyQix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLG1CQUFtQjtRQUN4RCxXQUFXLEVBQUUsSUFBSTtRQUNqQixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO1FBQzVCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUU7S0FDbEo7SUFDRCx1QkFBdUIsRUFBRTtRQUN4QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixXQUFXLEVBQUUsS0FBSztRQUNsQixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUscUNBQXFDO1FBQ25FLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELHFCQUFxQixFQUFFO1FBQ3RCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDN0IscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QscUJBQXFCLEVBQUU7UUFDdEIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsV0FBVyxFQUFFLEtBQUs7UUFDbEIsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRTtRQUNyQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7Q0FDdUQsQ0FBQTtBQUV6RCxNQUFNLGVBQWUsR0FBMkI7SUFDL0MsWUFBWSxFQUFFLG1CQUFtQjtJQUNqQyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsT0FBTyxJQUFJLENBQUEsQ0FBQyxDQUFDO0lBQ3BELDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO0tBQ2xFO0NBQ0QsQ0FBQTtBQUdELHlDQUF5QztBQUN6QyxNQUFNLGdCQUFnQixHQUFHO0lBQ3hCLHlCQUF5QixFQUFFO1FBQzFCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE1BQU0sRUFBRSxVQUFVO1FBQzVDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxzQkFBc0IsRUFBRTtRQUN2QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxvQkFBb0IsRUFBRTtRQUNyQixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJLEVBQUUsaUJBQWlCO1FBQ2pELElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSyxFQUFFLGtEQUFrRDtRQUN0RSxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxjQUFjLEVBQUU7UUFDZixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJLEVBQUUsaUJBQWlCO1FBQ2pELElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsdUZBQXVGO0tBQzNPO0NBQ3VELENBQUE7QUFDekQsTUFBTSxZQUFZLEdBQTJCO0lBQzVDLFlBQVksRUFBRSxnQkFBZ0I7SUFDOUIsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxHQUFHLE9BQU8sSUFBSSxDQUFBLENBQUMsQ0FBQztJQUNwRCwyQkFBMkIsRUFBRTtRQUM1Qix5R0FBeUc7UUFDekcsS0FBSyxFQUFFO1lBQ04sZ0JBQWdCLEVBQUUsQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLGFBQWEsRUFBRSxrQkFBa0I7b0JBQUUsT0FBTyxJQUFJLENBQUE7Z0JBQ25ELElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxxQkFBcUIsRUFBRSxDQUFDO29CQUNsRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLENBQUE7Z0JBQ3RDLENBQUM7Z0JBQ0QsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0Q7UUFDRCxNQUFNLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUU7S0FDM0M7Q0FDRCxDQUFBO0FBR0Qsa0RBQWtEO0FBQ2xELE1BQU0sd0JBQXdCLEdBQUcsRUFDdUIsQ0FBQTtBQUN4RCxNQUFNLG9CQUFvQixHQUEyQjtJQUNwRCxZQUFZLEVBQUUsd0JBQXdCO0lBQ3RDLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxPQUFPLElBQUksQ0FBQSxDQUFDLENBQUM7SUFDcEQsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7S0FDbEU7Q0FDRCxDQUFBO0FBRUQsb0RBQW9EO0FBQ3BELE1BQU0sMEJBQTBCLEdBQUcsRUFDcUIsQ0FBQTtBQUN4RCxNQUFNLHNCQUFzQixHQUEyQjtJQUN0RCxZQUFZLEVBQUUsMEJBQTBCO0lBQ3hDLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxPQUFPLElBQUksQ0FBQSxDQUFDLENBQUM7SUFDcEQsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7S0FDbEU7Q0FDRCxDQUFBO0FBRUQsZ0RBQWdEO0FBQ2hELE1BQU0sc0JBQXNCLEdBQUcsRUFDeUIsQ0FBQTtBQUV4RCxNQUFNLGtCQUFrQixHQUEyQjtJQUNsRCxZQUFZLEVBQUUsc0JBQXNCO0lBQ3BDLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxPQUFPLElBQUksQ0FBQSxDQUFDLENBQUM7SUFDcEQsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7S0FDbEU7Q0FDRCxDQUFBO0FBR0QscUZBQXFGO0FBQ3JGLE1BQU0sa0JBQWtCLEdBQUc7SUFDMUIsa0JBQWtCLEVBQUU7UUFDbkIsYUFBYSxFQUFFLE1BQU07UUFDckIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUM3QixXQUFXLEVBQUUsSUFBSTtRQUNqQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxrQkFBa0IsRUFBRTtRQUNuQixhQUFhLEVBQUUsTUFBTTtRQUNyQix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQzdCLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELG9CQUFvQixFQUFFO1FBQ3JCLGFBQWEsRUFBRSxNQUFNO1FBQ3JCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDOUIsV0FBVyxFQUFFLElBQUk7UUFDakIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsVUFBVSxFQUFFO1FBQ1gsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUM3QixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxlQUFlLEVBQUU7UUFDaEIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUM3QixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxLQUFLLEVBQUU7UUFDTixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO1FBQzVCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUU7S0FDbko7SUFDRCxhQUFhLEVBQUU7UUFDZCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQzdCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUU7S0FDbko7SUFDRCxpQkFBaUIsRUFBRTtRQUNsQixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO1FBQzVCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtDQUVzRCxDQUFBO0FBRXhELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsaUJBQWlCLENBQXdELENBQUE7QUFHekssTUFBTSxZQUFZLEdBQTJCO0lBQzVDLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQztJQUN4SCxZQUFZLEVBQUUsRUFBRTtJQUNoQiwyQkFBMkIsRUFBRTtRQUM1QixrS0FBa0s7UUFDbEssS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUU7S0FDbkQ7Q0FDRCxDQUFBO0FBRUQsTUFBTSxnQkFBZ0IsR0FBMkI7SUFDaEQsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxFQUFFLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDOUksWUFBWSxFQUFFLEVBQUU7SUFDaEIsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFO0tBQ2xDO0NBQ0QsQ0FBQTtBQUVELE1BQU0sY0FBYyxHQUEyQjtJQUM5QyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUM7SUFDeEgsWUFBWSxFQUFFLGtCQUFrQjtJQUNoQywyQkFBMkIsRUFBRTtRQUM1QixtRUFBbUU7UUFDbkUsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFO0tBQ2xDO0NBQ0QsQ0FBQTtBQUVELE1BQU0sZ0JBQWdCLEdBQTJCO0lBQ2hELG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUM7SUFDN0UsWUFBWSxFQUFFLEVBQUU7SUFDaEIsMkJBQTJCLEVBQUU7UUFDNUIsbUdBQW1HO1FBQ25HLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO1FBQ2xFLE1BQU0sRUFBRSxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFO0tBQ25EO0NBQ0QsQ0FBQTtBQUVELE1BQU0sZUFBZSxHQUEyQjtJQUMvQyxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUM7SUFDeEgsWUFBWSxFQUFFLEVBQUU7SUFDaEIsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUU7S0FDbkQ7Q0FDRCxDQUFBO0FBR0QsK0NBQStDO0FBQy9DLE1BQU0sMkNBQTJDLEdBQUc7SUFDbkQsc0JBQXNCLEVBQUU7UUFDdkIsYUFBYSxFQUFFLE1BQU07UUFDckIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDakMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRTtLQUNwRztJQUNELHFDQUFxQyxFQUFFO1FBQ3RDLGFBQWEsRUFBRSxNQUFNO1FBQ3JCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUU7S0FDcEc7SUFDRCwrQ0FBK0MsRUFBRTtRQUNoRCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxpREFBaUQsRUFBRTtRQUNsRCxhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxzQ0FBc0MsRUFBRTtRQUN2QyxhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxrQ0FBa0MsRUFBRTtRQUNuQyxhQUFhLEVBQUUsU0FBUztRQUN4Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxzQkFBc0IsRUFBRTtRQUN2QixHQUFHLHdDQUF3QyxDQUFDLFVBQVU7UUFDdEQsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDakMsWUFBWSxFQUFFLEtBQUs7S0FDbkI7SUFDRCx5QkFBeUIsRUFBRTtRQUMxQixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUNyQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCwyQkFBMkIsRUFBRTtRQUM1QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUNyQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxzQ0FBc0MsRUFBRTtRQUN2QyxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUNwQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFO1lBQ3RCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsbUJBQW1CLEVBQUUsS0FBSztZQUMxQixjQUFjLEVBQUUsSUFBSTtZQUNwQixpQ0FBaUMsRUFBRSxJQUFJO1lBQ3ZDLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSwyQ0FBMkM7U0FDNUg7S0FDRDtJQUNELDZCQUE2QixFQUFFO1FBQzlCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1FBQ3BDLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSyxFQUFFLDREQUE0RDtLQUMxRjtJQUNELDZCQUE2QixFQUFFO1FBQzlCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1FBQ3BDLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsS0FBSztLQUM1QjtJQUNELDBCQUEwQixFQUFFO1FBQzNCLEdBQUcsd0NBQXdDLENBQUMsU0FBUztRQUNyRCxhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUNqQyxZQUFZLEVBQUUsS0FBSztRQUNuQixxQkFBcUIsRUFBRSxLQUFLO0tBQzVCO0lBQ0QsK0JBQStCLEVBQUU7UUFDaEMsR0FBRyx3Q0FBd0MsQ0FBQyxRQUFRO1FBQ3BELGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxLQUFLO1FBQ25CLHFCQUFxQixFQUFFLEtBQUs7S0FDNUI7SUFDRCxrQ0FBa0MsRUFBRTtRQUNuQyxHQUFHLHdDQUF3QyxDQUFDLGNBQWMsQ0FBQztRQUMzRCxhQUFhLEVBQUUsTUFBTTtRQUNyQix3QkFBd0IsRUFBRSxJQUFJO1FBQzlCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtRQUNuQyxZQUFZLEVBQUUsS0FBSztLQUNuQjtJQUNELGNBQWMsRUFBRTtRQUNmLEdBQUcsd0NBQXdDLENBQUMsS0FBSyxDQUFDO1FBQ2xELGFBQWEsRUFBRSxNQUFNO1FBQ3JCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFlBQVksRUFBRSxLQUFLO0tBQ25CO0NBQ3VELENBQUE7QUFFekQsTUFBTSxrQkFBa0IsR0FBMkI7SUFDbEQsWUFBWSxFQUFFLDJDQUEyQztJQUN6RCxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQ25DLE1BQU0sR0FBRyxHQUFHLDZCQUE2QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELHFFQUFxRTtRQUNyRSxJQUFJLEdBQUcsRUFBRSxpQkFBaUIsS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUMvQyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsY0FBYyxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFDRCwyQkFBMkIsRUFBRTtRQUM1QixzTEFBc0w7UUFDdEwsS0FBSyxFQUFFO1lBQ04sd0RBQXdEO1lBQ3hELGdCQUFnQixFQUFFLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxhQUFhLEVBQUUsa0JBQWtCO29CQUFFLE9BQU8sSUFBSSxDQUFBO2dCQUVuRCxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLEVBQUUsQ0FBQztvQkFDbEQsT0FBTzt3QkFDTixTQUFTLEVBQUU7NEJBQ1YsVUFBVSxFQUFFLGFBQWEsQ0FBQyxlQUFlO3lCQUN6QztxQkFDRCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLHFCQUFxQjtvQkFDL0MsT0FBTzt3QkFDTixTQUFTLEVBQUU7NEJBQ1YsTUFBTSxFQUFFLGFBQWEsQ0FBQyxlQUFlO3lCQUNyQztxQkFDRCxDQUFBO2dCQUNGLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztTQUNEO1FBQ0QsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFO0tBQzNDO0NBQ0QsQ0FBQTtBQUVELG1EQUFtRDtBQUNuRCwyRUFBMkU7QUFDM0UsMkVBQTJFO0FBQzNFLCtFQUErRTtBQUMvRSwrRUFBK0U7QUFDL0UsRUFBRTtBQUNGLDRFQUE0RTtBQUM1RSwwRUFBMEU7QUFDMUUseUVBQXlFO0FBQ3pFLHNEQUFzRDtBQUN0RCxNQUFNLHlCQUF5QixHQUFHO0lBQ2pDLGVBQWUsRUFBRTtRQUNoQixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLCtCQUErQjtRQUM5RCxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUF1QjtRQUMxQyxxQkFBcUIsRUFBRSxhQUFzQjtRQUM3QyxxQkFBcUIsRUFBRSxLQUFjO0tBQ3JDO0lBQ0QscUJBQXFCLEVBQUU7UUFDdEIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBdUI7UUFDMUMscUJBQXFCLEVBQUUsYUFBc0I7UUFDN0MscUJBQXFCLEVBQUUsS0FBYztLQUNyQztJQUNELGdCQUFnQixFQUFFO1FBQ2pCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE1BQU07UUFDaEMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQXVCO1FBQzFDLHFCQUFxQixFQUFFLGFBQXNCO1FBQzdDLHFCQUFxQixFQUFFLEtBQWM7S0FDckM7SUFDRCxlQUFlLEVBQUU7UUFDaEIsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBdUI7UUFDMUMscUJBQXFCLEVBQUUsYUFBc0I7UUFDN0MscUJBQXFCLEVBQUUsS0FBYztLQUNyQztJQUNELG1CQUFtQixFQUFFO1FBQ3BCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQXVCO1FBQzFDLHFCQUFxQixFQUFFLGFBQXNCO1FBQzdDLHFCQUFxQixFQUFFLEtBQWM7S0FDckM7SUFDRCxtQkFBbUIsRUFBRTtRQUNwQixhQUFhLEVBQUUsT0FBTyxFQUFFLHlEQUF5RDtRQUNqRix3QkFBd0IsRUFBRSxLQUFLO1FBQy9CLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM3QixZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUF1QjtRQUMxQyxxQkFBcUIsRUFBRSxhQUFzQjtRQUM3QyxxQkFBcUIsRUFBRSxLQUFjO0tBQ3JDO0lBQ0QsaUJBQWlCLEVBQUU7UUFDbEIsYUFBYSxFQUFFLE9BQU8sRUFBRSx5REFBeUQ7UUFDakYsd0JBQXdCLEVBQUUsS0FBSztRQUMvQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBdUI7UUFDMUMscUJBQXFCLEVBQUUsYUFBc0I7UUFDN0MscUJBQXFCLEVBQUUsS0FBYztLQUNyQztJQUNELGlCQUFpQixFQUFFO1FBQ2xCLGFBQWEsRUFBRSxPQUFPLEVBQUUseURBQXlEO1FBQ2pGLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQXVCO1FBQzFDLHFCQUFxQixFQUFFLGFBQXNCO1FBQzdDLHFCQUFxQixFQUFFLEtBQWM7S0FDckM7Q0FDdUQsQ0FBQTtBQUV6RCxNQUFNLHFCQUFxQixHQUEyQjtJQUNyRCxZQUFZLEVBQUUseUJBQXlCO0lBQ3ZDLDhFQUE4RTtJQUM5RSx3RUFBd0U7SUFDeEUsMEVBQTBFO0lBQzFFLDhFQUE4RTtJQUM5RSxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQ25DLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3pELElBQUksWUFBWSxHQUFrRCxJQUFJLENBQUE7UUFDdEUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztZQUFFLFlBQVksR0FBRyxlQUFlLENBQUE7YUFDOUQsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO1lBQUUsWUFBWSxHQUFHLHFCQUFxQixDQUFBO2FBQzNFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztZQUFFLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQTthQUNyRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO1lBQUUsWUFBWSxHQUFHLGVBQWUsQ0FBQTthQUNuRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUM7WUFBRSxZQUFZLEdBQUcsaUJBQWlCLENBQUE7YUFDdkUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO1lBQUUsWUFBWSxHQUFHLGlCQUFpQixDQUFBO2FBQ3ZFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQztZQUFFLFlBQVksR0FBRyxtQkFBbUIsQ0FBQTthQUMzRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUM7WUFBRSxZQUFZLEdBQUcsbUJBQW1CLENBQUE7UUFDaEYsSUFBSSxZQUFZO1lBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsR0FBRyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFBO1FBQ3JILE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO0tBQ2xFO0NBQ0QsQ0FBQTtBQUdELDZDQUE2QztBQUM3QyxnRUFBZ0U7QUFDaEUscURBQXFEO0FBQ3JELE1BQU0sb0JBQW9CLEdBQUc7SUFDNUIsY0FBYyxFQUFFO1FBQ2YsYUFBYSxFQUFFLE9BQU8sRUFBRSxxQ0FBcUM7UUFDN0Qsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSx1REFBdUQ7UUFDNUYsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ2xKO0lBQ0QsY0FBYyxFQUFFO1FBQ2YsYUFBYSxFQUFFLE9BQU8sRUFBRSw0QkFBNEI7UUFDcEQsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSx5QkFBeUI7UUFDOUQsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ2pKO0NBQ3VELENBQUE7QUFDekQsTUFBTSxnQkFBZ0IsR0FBMkI7SUFDaEQsWUFBWSxFQUFFLG9CQUFvQjtJQUNsQyx5RUFBeUU7SUFDekUsNERBQTREO0lBQzVELG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUM7SUFDN0UsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFO0tBQzNDO0NBQ0QsQ0FBQTtBQUdELGlEQUFpRDtBQUNqRCwyRUFBMkU7QUFDM0Usd0RBQXdEO0FBQ3hELE1BQU0scUJBQXFCLEdBQUc7SUFDN0IsbUNBQW1DLEVBQUU7UUFDcEMsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7UUFDcEMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ2pKO0lBQ0QsK0NBQStDLEVBQUU7UUFDaEQsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ2pKO0lBQ0QsbUNBQW1DLEVBQUU7UUFDcEMsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ2pKO0lBQ0Qsd0NBQXdDLEVBQUU7UUFDekMsYUFBYSxFQUFFLE9BQU87UUFDdEIsd0JBQXdCLEVBQUUsTUFBTTtRQUNoQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7UUFDbkMsWUFBWSxFQUFFLEtBQUs7UUFDbkIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsaUJBQWlCLEVBQUUsY0FBYztRQUNqQyxxQkFBcUIsRUFBRSxhQUFhO1FBQ3BDLHFCQUFxQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0tBQ2xKO0NBQ3VELENBQUE7QUFDekQsTUFBTSxpQkFBaUIsR0FBMkI7SUFDakQsWUFBWSxFQUFFLHFCQUFxQjtJQUNuQywrRUFBK0U7SUFDL0UsdUNBQXVDO0lBQ3ZDLG9CQUFvQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUM7SUFDN0UsMkJBQTJCLEVBQUU7UUFDNUIsS0FBSyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUNBQXFDLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUU7S0FDbkQ7Q0FDRCxDQUFBO0FBR0Qsb0ZBQW9GO0FBQ3BGLHdGQUF3RjtBQUN4RixtRUFBbUU7QUFDbkUsTUFBTSx3QkFBd0IsR0FBRztJQUNoQyw2QkFBNkIsRUFBRTtRQUM5QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtRQUNwQyxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLGFBQWE7UUFDcEMscUJBQXFCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUU7S0FDbkc7SUFDRCxzQkFBc0IsRUFBRTtRQUN2QixhQUFhLEVBQUUsT0FBTztRQUN0Qix3QkFBd0IsRUFBRSxNQUFNO1FBQ2hDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLHFDQUFxQztRQUMzRSxZQUFZLEVBQUUsS0FBSztRQUNuQixXQUFXLEVBQUUsS0FBSztRQUNsQixpQkFBaUIsRUFBRSxjQUFjO1FBQ2pDLHFCQUFxQixFQUFFLGdCQUFnQjtRQUN2QyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRTtLQUNyRztJQUNELHFCQUFxQixFQUFFO1FBQ3RCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE1BQU07UUFDaEMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRTtLQUNqSjtJQUNELFNBQVMsRUFBRTtRQUNWLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE1BQU07UUFDaEMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1FBQ3BDLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRTtLQUNqSjtJQUNELFNBQVMsRUFBRTtRQUNWLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE1BQU07UUFDaEMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRTtLQUNqSjtJQUNELHFCQUFxQixFQUFFO1FBQ3RCLGFBQWEsRUFBRSxPQUFPO1FBQ3RCLHdCQUF3QixFQUFFLE1BQU07UUFDaEMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ25DLFlBQVksRUFBRSxLQUFLO1FBQ25CLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLGlCQUFpQixFQUFFLGNBQWM7UUFDakMscUJBQXFCLEVBQUUsYUFBYTtRQUNwQyxxQkFBcUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRTtLQUNsSjtDQUN1RCxDQUFBO0FBQ3pELE1BQU0sb0JBQW9CLEdBQTJCO0lBQ3BELFlBQVksRUFBRSx3QkFBd0I7SUFDdEMsbUZBQW1GO0lBQ25GLCtFQUErRTtJQUMvRSxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsNkJBQTZCLENBQUMsU0FBUyxDQUFDO0lBQzdFLDJCQUEyQixFQUFFO1FBQzVCLEtBQUssRUFBRSxFQUFFLGdCQUFnQixFQUFFLHFDQUFxQyxFQUFFO1FBQ2xFLE1BQU0sRUFBRSxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFO0tBQ25EO0NBQ0QsQ0FBQTtBQUdELHVFQUF1RTtBQUV2RSxNQUFNLHVCQUF1QixHQUErRDtJQUMzRixNQUFNLEVBQUUsY0FBYztJQUN0QixTQUFTLEVBQUUsaUJBQWlCO0lBQzVCLEdBQUcsRUFBRSxXQUFXO0lBQ2hCLE1BQU0sRUFBRSxjQUFjO0lBRXRCLHFCQUFxQjtJQUNyQixRQUFRLEVBQUUsZ0JBQWdCO0lBQzFCLElBQUksRUFBRSxZQUFZO0lBRWxCLHlEQUF5RDtJQUN6RCxVQUFVLEVBQUUsa0JBQWtCO0lBQzlCLElBQUksRUFBRSxZQUFZO0lBQ2xCLE1BQU0sRUFBRSxjQUFjO0lBQ3RCLGdCQUFnQixFQUFFLGdCQUFnQjtJQUNsQyxPQUFPLEVBQUUsZUFBZTtJQUV4QixPQUFPLEVBQUUsZUFBZTtJQUN4QixRQUFRLEVBQUUsZ0JBQWdCO0lBRTFCLFlBQVksRUFBRSxvQkFBb0I7SUFDbEMsY0FBYyxFQUFFLHNCQUFzQjtJQUN0QyxVQUFVLEVBQUUsa0JBQWtCO0lBQzlCLGFBQWEsRUFBRSxxQkFBcUI7SUFFcEMsNkNBQTZDO0lBQzdDLFFBQVEsRUFBRSxnQkFBZ0I7SUFDMUIsU0FBUyxFQUFFLGlCQUFpQjtJQUM1QixZQUFZLEVBQUUsb0JBQW9CO0NBQ3pCLENBQUE7QUFHViw0Q0FBNEM7QUFFNUMsMkVBQTJFO0FBQzNFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLENBQ25DLFlBQTBCLEVBQzFCLFNBQWlCLEVBQ2pCLGdCQUE4QyxFQUk3QyxFQUFFO0lBRUgsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUE7SUFFbEQsTUFBTSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxHQUFHLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRXBGLDJDQUEyQztJQUMzQyxNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFaEUsNkNBQTZDO0lBQzdDLEtBQUssTUFBTSxVQUFVLElBQUksWUFBWSxFQUFFLENBQUM7UUFDdkMsTUFBTSxtQkFBbUIsR0FBRyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDcEQsSUFBSSxrQkFBa0IsS0FBSyxtQkFBbUIsRUFBRSxDQUFDO1lBQ2hELE9BQU8sRUFBRSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLFNBQVMsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxDQUFDO1FBQzVILENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDOUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNaLE9BQU8sRUFBRSxHQUFHLE1BQU0sRUFBRSxHQUFHLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUM3RixDQUFDO0lBRUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLG1CQUFtQixFQUFFLEdBQUcsU0FBUyxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxDQUFDO0FBQ3ZGLENBQUMsQ0FBQTtBQUVELHFCQUFxQjtBQUNyQixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLFlBQTBCLEVBQUUsRUFBRTtJQUNyRSxNQUFNLEVBQUUsMkJBQTJCLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM3RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQTtBQUN2QyxDQUFDLENBQUE7QUFlRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUN6QyxXQUF3QixFQUN4QixZQUEwQixFQUMxQixTQUFpQixFQUNqQixxQkFBd0QsRUFDeEQsZ0JBQThDLEVBQzdDLEVBQUU7SUFDSCxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFBO0lBQzlJLElBQUksQ0FBQyxpQkFBaUI7UUFBRSxPQUFPLEtBQUssQ0FBQTtJQUVwQyx1RUFBdUU7SUFDdkUsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLEtBQUssTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUE7SUFFeEUsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsRUFBRSxnQkFBZ0IsSUFBSSxpQkFBaUIsQ0FBQTtJQUN2RixPQUFPLGtCQUFrQixDQUFBO0FBQzFCLENBQUMsQ0FBQTtBQUdELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLENBQUMsWUFBMEIsRUFBRSxTQUFpQixFQUFFLElBQXFGLEVBQUUsRUFBRTtJQUNuTCxNQUFNLEVBQ0wscUJBQXFCLEVBQ3JCLHdCQUF3QixHQUN4QixHQUFHLG9CQUFvQixDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDeEUsT0FBTyxJQUFJLENBQUMsa0JBQWtCLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQTtBQUM3SSxDQUFDLENBQUE7QUFFRCw2R0FBNkc7QUFDN0csTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsQ0FDdkMsV0FBd0IsRUFDeEIsWUFBMEIsRUFDMUIsU0FBaUIsRUFDakIscUJBQXdELEVBQ3hELGdCQUE4QyxFQUN0QixFQUFFO0lBRTFCLE1BQU0sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFBO0lBQzlJLE1BQU0sa0JBQWtCLEdBQUcsMEJBQTBCLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUNwSSxJQUFJLENBQUMsa0JBQWtCO1FBQUUsT0FBTyxJQUFJLENBQUE7SUFFcEMsNkJBQTZCO0lBQzdCLE1BQU0sZUFBZSxHQUFHLHFCQUFxQixFQUFFLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLGVBQWUsSUFBSSxxQkFBcUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUM5SixJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLE9BQU8sRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxDQUFBO0lBQ2pILENBQUM7SUFFRCw2QkFBNkI7SUFDN0IsTUFBTSxlQUFlLEdBQUcscUJBQXFCLEVBQUUsSUFBSSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUMscUJBQXFCLEVBQUUsZUFBZSxJQUFJLHFCQUFxQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzlKLElBQUksZUFBZSxFQUFFLENBQUM7UUFDckIsT0FBTyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLENBQUE7SUFDakgsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyxDQUFBIn0=