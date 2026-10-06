/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { defaultModelsOfProvider, defaultProviderSettings } from './modelCapabilities.js';
export const providerNames = Object.keys(defaultProviderSettings);
export const localProviderNames = ['ollama', 'vLLM', 'lmStudio']; // all local names
export const nonlocalProviderNames = providerNames.filter((name) => !localProviderNames.includes(name)); // all non-local names
export const customSettingNamesOfProvider = (providerName) => {
    return Object.keys(defaultProviderSettings[providerName]);
};
export const displayInfoOfProviderName = (providerName) => {
    if (providerName === 'anthropic') {
        return { title: 'Anthropic', };
    }
    else if (providerName === 'openAI') {
        return { title: 'OpenAI', };
    }
    else if (providerName === 'deepseek') {
        return { title: 'DeepSeek', };
    }
    else if (providerName === 'openRouter') {
        return { title: 'OpenRouter', };
    }
    else if (providerName === 'ollama') {
        return { title: 'Ollama', };
    }
    else if (providerName === 'vLLM') {
        return { title: 'vLLM', };
    }
    else if (providerName === 'liteLLM') {
        return { title: 'LiteLLM', };
    }
    else if (providerName === 'lmStudio') {
        return { title: 'LM Studio', };
    }
    else if (providerName === 'openAICompatible') {
        return { title: 'OpenAI-Compatible', };
    }
    else if (providerName === 'gemini') {
        return { title: 'Gemini', };
    }
    else if (providerName === 'groq') {
        return { title: 'Groq', };
    }
    else if (providerName === 'xAI') {
        return { title: 'Grok (xAI)', };
    }
    else if (providerName === 'mistral') {
        return { title: 'Mistral', };
    }
    else if (providerName === 'googleVertex') {
        return { title: 'Google Vertex AI', };
    }
    else if (providerName === 'microsoftAzure') {
        return { title: 'Microsoft Azure OpenAI', };
    }
    else if (providerName === 'awsBedrock') {
        return { title: 'AWS Bedrock', };
    }
    else if (providerName === 'ainativeCloud') {
        return { title: 'AINative Cloud', };
    }
    else if (providerName === 'cerebras') {
        return { title: 'Cerebras', };
    }
    else if (providerName === 'fireworks') {
        return { title: 'Fireworks AI', };
    }
    else if (providerName === 'digitalOcean') {
        return { title: 'DigitalOcean Gradient AI', };
    }
    throw new Error(`descOfProviderName: Unknown provider name: "${providerName}"`);
};
export const subTextMdOfProviderName = (providerName) => {
    if (providerName === 'anthropic')
        return 'Get your [API Key here](https://console.anthropic.com/settings/keys).';
    if (providerName === 'openAI')
        return 'Get your [API Key here](https://platform.openai.com/api-keys).';
    if (providerName === 'deepseek')
        return 'Get your [API Key here](https://platform.deepseek.com/api_keys).';
    if (providerName === 'openRouter')
        return 'Get your [API Key here](https://openrouter.ai/settings/keys). Read about [rate limits here](https://openrouter.ai/docs/api-reference/limits).';
    if (providerName === 'gemini')
        return 'Get your [API Key here](https://aistudio.google.com/apikey). Read about [rate limits here](https://ai.google.dev/gemini-api/docs/rate-limits#current-rate-limits).';
    if (providerName === 'groq')
        return 'Get your [API Key here](https://console.groq.com/keys).';
    if (providerName === 'xAI')
        return 'Get your [API Key here](https://console.x.ai).';
    if (providerName === 'mistral')
        return 'Get your [API Key here](https://console.mistral.ai/api-keys).';
    if (providerName === 'openAICompatible')
        return `Use any provider that's OpenAI-compatible (use this for llama.cpp and more).`;
    if (providerName === 'googleVertex')
        return 'You must authenticate before using Vertex with Void. Read more about endpoints [here](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library), and regions [here](https://cloud.google.com/vertex-ai/docs/general/locations#available-regions).';
    if (providerName === 'microsoftAzure')
        return 'Read more about endpoints [here](https://learn.microsoft.com/en-us/rest/api/aifoundry/model-inference/get-chat-completions/get-chat-completions?view=rest-aifoundry-model-inference-2024-05-01-preview&tabs=HTTP), and get your API key [here](https://learn.microsoft.com/en-us/azure/search/search-security-api-keys?tabs=rest-use%2Cportal-find%2Cportal-query#find-existing-keys).';
    if (providerName === 'awsBedrock')
        return 'Connect via a LiteLLM proxy or the AWS [Bedrock-Access-Gateway](https://github.com/aws-samples/bedrock-access-gateway). LiteLLM Bedrock setup docs are [here](https://docs.litellm.ai/docs/providers/bedrock).';
    if (providerName === 'ollama')
        return 'Read more about custom [Endpoints here](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-expose-ollama-on-my-network).';
    if (providerName === 'vLLM')
        return 'Read more about custom [Endpoints here](https://docs.vllm.ai/en/latest/getting_started/quickstart.html#openai-compatible-server).';
    if (providerName === 'lmStudio')
        return 'Read more about custom [Endpoints here](https://lmstudio.ai/docs/app/api/endpoints/openai).';
    if (providerName === 'liteLLM')
        return 'Read more about endpoints [here](https://docs.litellm.ai/docs/providers/openai_compatible).';
    if (providerName === 'ainativeCloud')
        return 'Get your [API Key here](https://app.ainative.studio). Accepted key prefixes are `sk_` (account key), `tmp_` (72-hour instant key), and `zdb_live_` (claimed project key) — keys from other providers will not work.';
    // NOTE: AINative Cloud's own managed catalog already proxies some Cerebras- and
    // DigitalOcean-hosted models. These entries are for bringing your own key and
    // billing directly with the provider instead. The exact managed-vs-BYOK wording
    // is still an open product question — see issue #168.
    if (providerName === 'cerebras')
        return 'Get your [API Key here](https://cloud.cerebras.ai). Billed directly by Cerebras — some Cerebras-hosted models are also available through AINative Cloud on AINative billing.';
    if (providerName === 'fireworks')
        return 'Get your [API Key here](https://app.fireworks.ai/settings/users/api-keys). Browse the [model library here](https://fireworks.ai/models).';
    if (providerName === 'digitalOcean')
        return 'Create a model access key in the [DigitalOcean Control Panel](https://cloud.digitalocean.com/model-studio/manage-keys). Billed directly by DigitalOcean — some DigitalOcean-hosted models are also available through AINative Cloud on AINative billing. See the [supported models list](https://docs.digitalocean.com/products/inference/details/models/).';
    throw new Error(`subTextMdOfProviderName: Unknown provider name: "${providerName}"`);
};
export const displayInfoOfSettingName = (providerName, settingName) => {
    if (settingName === 'apiKey') {
        return {
            title: 'API Key',
            // **Please follow this convention**:
            // The word "key..." here is a placeholder for the hash. For example, sk-ant-key... means the key will look like sk-ant-abcdefg123...
            placeholder: providerName === 'anthropic' ? 'sk-ant-key...' : // sk-ant-api03-key
                providerName === 'openAI' ? 'sk-proj-key...' :
                    providerName === 'deepseek' ? 'sk-key...' :
                        providerName === 'openRouter' ? 'sk-or-key...' : // sk-or-v1-key
                            providerName === 'gemini' ? 'AIzaSy...' :
                                providerName === 'groq' ? 'gsk_key...' :
                                    providerName === 'openAICompatible' ? 'sk-key...' :
                                        providerName === 'xAI' ? 'xai-key...' :
                                            providerName === 'mistral' ? 'api-key...' :
                                                providerName === 'googleVertex' ? 'AIzaSy...' :
                                                    providerName === 'microsoftAzure' ? 'key-...' :
                                                        providerName === 'awsBedrock' ? 'key-...' :
                                                            // AINative permanent account keys are `sk_`-prefixed. Temporary
                                                            // instant-db keys (`tmp_`, 72h) and claimed-project keys
                                                            // (`zdb_live_`) are also accepted by the backend.
                                                            providerName === 'ainativeCloud' ? 'sk_key...' :
                                                                providerName === 'cerebras' ? 'csk-key...' :
                                                                    providerName === 'fireworks' ? 'fw_key...' :
                                                                        // DigitalOcean model access keys are created in the Control
                                                                        // Panel and sent as a plain bearer token.
                                                                        providerName === 'digitalOcean' ? 'dop_v1_key...' :
                                                                            '',
            isPasswordField: true,
        };
    }
    else if (settingName === 'endpoint') {
        return {
            title: providerName === 'ollama' ? 'Endpoint' :
                providerName === 'vLLM' ? 'Endpoint' :
                    providerName === 'lmStudio' ? 'Endpoint' :
                        providerName === 'openAICompatible' ? 'baseURL' : // (do not include /chat/completions)
                            providerName === 'googleVertex' ? 'baseURL' :
                                providerName === 'microsoftAzure' ? 'baseURL' :
                                    providerName === 'liteLLM' ? 'baseURL' :
                                        providerName === 'awsBedrock' ? 'Endpoint' :
                                            '(never)',
            placeholder: providerName === 'ollama' ? defaultProviderSettings.ollama.endpoint
                : providerName === 'vLLM' ? defaultProviderSettings.vLLM.endpoint
                    : providerName === 'openAICompatible' ? 'https://my-website.com/v1'
                        : providerName === 'lmStudio' ? defaultProviderSettings.lmStudio.endpoint
                            : providerName === 'liteLLM' ? 'http://localhost:4000'
                                : providerName === 'awsBedrock' ? 'http://localhost:4000/v1'
                                    : '(never)',
        };
    }
    else if (settingName === 'headersJSON') {
        return { title: 'Custom Headers', placeholder: '{ "X-Request-Id": "..." }' };
    }
    else if (settingName === 'region') {
        // vertex only
        return {
            title: 'Region',
            placeholder: providerName === 'googleVertex' ? defaultProviderSettings.googleVertex.region
                : providerName === 'awsBedrock'
                    ? defaultProviderSettings.awsBedrock.region
                    : ''
        };
    }
    else if (settingName === 'azureApiVersion') {
        // azure only
        return {
            title: 'API Version',
            placeholder: providerName === 'microsoftAzure' ? defaultProviderSettings.microsoftAzure.azureApiVersion
                : ''
        };
    }
    else if (settingName === 'project') {
        return {
            title: providerName === 'microsoftAzure' ? 'Resource'
                : providerName === 'googleVertex' ? 'Project'
                    : '',
            placeholder: providerName === 'microsoftAzure' ? 'my-resource'
                : providerName === 'googleVertex' ? 'my-project'
                    : ''
        };
    }
    else if (settingName === '_didFillInProviderSettings') {
        return {
            title: '(never)',
            placeholder: '(never)',
        };
    }
    else if (settingName === 'models') {
        return {
            title: '(never)',
            placeholder: '(never)',
        };
    }
    throw new Error(`displayInfo: Unknown setting name: "${settingName}"`);
};
const defaultCustomSettings = {
    apiKey: undefined,
    endpoint: undefined,
    region: undefined, // googleVertex
    project: undefined,
    azureApiVersion: undefined,
    headersJSON: undefined,
};
const modelInfoOfDefaultModelNames = (defaultModelNames) => {
    return {
        models: defaultModelNames.map((modelName, i) => ({
            modelName,
            type: 'default',
            isHidden: defaultModelNames.length >= 10, // hide all models if there are a ton of them, and make user enable them individually
        }))
    };
};
// used when waiting and for a type reference
export const defaultSettingsOfProvider = {
    anthropic: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.anthropic,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.anthropic),
        _didFillInProviderSettings: undefined,
    },
    // Follows the same spread pattern as every other provider so that the
    // `apiKey` declared in `defaultProviderSettings.ainativeCloud` (sent as the
    // `X-API-Key` header on /api/v1/chat/completions) is typed as a string and
    // surfaces in the Settings UI. See docs/api/BACKEND_CONTRACT_NOTES.md.
    ainativeCloud: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.ainativeCloud,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.ainativeCloud),
        _didFillInProviderSettings: undefined,
    },
    openAI: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.openAI,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openAI),
        _didFillInProviderSettings: undefined,
    },
    deepseek: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.deepseek,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.deepseek),
        _didFillInProviderSettings: undefined,
    },
    gemini: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.gemini,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.gemini),
        _didFillInProviderSettings: undefined,
    },
    xAI: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.xAI,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.xAI),
        _didFillInProviderSettings: undefined,
    },
    mistral: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.mistral,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.mistral),
        _didFillInProviderSettings: undefined,
    },
    liteLLM: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.liteLLM,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.liteLLM),
        _didFillInProviderSettings: undefined,
    },
    lmStudio: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.lmStudio,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.lmStudio),
        _didFillInProviderSettings: undefined,
    },
    groq: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.groq,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.groq),
        _didFillInProviderSettings: undefined,
    },
    openRouter: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.openRouter,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openRouter),
        _didFillInProviderSettings: undefined,
    },
    openAICompatible: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.openAICompatible,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openAICompatible),
        _didFillInProviderSettings: undefined,
    },
    ollama: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.ollama,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.ollama),
        _didFillInProviderSettings: undefined,
    },
    vLLM: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.vLLM,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.vLLM),
        _didFillInProviderSettings: undefined,
    },
    googleVertex: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.googleVertex,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.googleVertex),
        _didFillInProviderSettings: undefined,
    },
    microsoftAzure: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.microsoftAzure,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.microsoftAzure),
        _didFillInProviderSettings: undefined,
    },
    awsBedrock: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.awsBedrock,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.awsBedrock),
        _didFillInProviderSettings: undefined,
    },
    cerebras: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.cerebras,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.cerebras),
        _didFillInProviderSettings: undefined,
    },
    fireworks: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.fireworks,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.fireworks),
        _didFillInProviderSettings: undefined,
    },
    digitalOcean: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.digitalOcean,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.digitalOcean),
        _didFillInProviderSettings: undefined,
    },
};
export const modelSelectionsEqual = (m1, m2) => {
    return m1.modelName === m2.modelName && m1.providerName === m2.providerName;
};
// this is a state
export const featureNames = ['Chat', 'Ctrl+K', 'Autocomplete', 'Apply', 'SCM'];
export const displayInfoOfFeatureName = (featureName) => {
    // editor:
    if (featureName === 'Autocomplete')
        return 'Autocomplete';
    else if (featureName === 'Ctrl+K')
        return 'Quick Edit';
    // sidebar:
    else if (featureName === 'Chat')
        return 'Chat';
    else if (featureName === 'Apply')
        return 'Apply';
    // source control:
    else if (featureName === 'SCM')
        return 'Commit Message Generator';
    else
        throw new Error(`Feature Name ${featureName} not allowed`);
};
// the models of these can be refreshed (in theory all can, but not all should)
export const refreshableProviderNames = localProviderNames;
// models that come with download buttons
export const hasDownloadButtonsOnModelsProviderNames = ['ollama'];
// use this in isFeatuerNameDissbled
export const isProviderNameDisabled = (providerName, settingsState) => {
    const settingsAtProvider = settingsState.settingsOfProvider[providerName];
    const isAutodetected = refreshableProviderNames.includes(providerName);
    const isDisabled = settingsAtProvider.models.length === 0;
    if (isDisabled) {
        return isAutodetected ? 'providerNotAutoDetected' : (!settingsAtProvider._didFillInProviderSettings ? 'notFilledIn' : 'addModel');
    }
    return false;
};
export const isFeatureNameDisabled = (featureName, settingsState) => {
    // if has a selected provider, check if it's enabled
    const selectedProvider = settingsState.modelSelectionOfFeature[featureName];
    if (selectedProvider) {
        const { providerName } = selectedProvider;
        return isProviderNameDisabled(providerName, settingsState);
    }
    // if there are any models they can turn on, tell them that
    const canTurnOnAModel = !!providerNames.find(providerName => settingsState.settingsOfProvider[providerName].models.filter(m => m.isHidden).length !== 0);
    if (canTurnOnAModel)
        return 'needToEnableModel';
    // if there are any providers filled in, then they just need to add a model
    const anyFilledIn = !!providerNames.find(providerName => settingsState.settingsOfProvider[providerName]._didFillInProviderSettings);
    if (anyFilledIn)
        return 'addModel';
    return 'addProvider';
};
export const defaultManagedAPISettings = {
    enabled: false,
    autoToolCalling: true,
    preferredModel: 'llama-3.3-70b-instruct',
    maxIterations: 5,
    showCreditsInChat: true,
    showToolExecutions: true,
    quotaWarningThreshold: 0.2, // 20%
};
export const defaultGlobalSettings = {
    autoRefreshModels: true,
    aiInstructions: '',
    enableAutocomplete: false,
    syncApplyToChat: true,
    syncSCMToChat: true,
    enableFastApply: true,
    chatMode: 'agent',
    autoApprove: {},
    showInlineSuggestions: true,
    includeToolLintErrors: true,
    isOnboardingComplete: false,
    disableSystemMessage: false,
    autoAcceptLLMChanges: false,
    managedAPI: defaultManagedAPISettings,
    enableCommitMessageHook: false,
};
export const globalSettingNames = Object.keys(defaultGlobalSettings);
const overridesOfModel = {};
for (const providerName of providerNames) {
    overridesOfModel[providerName] = {};
}
export const defaultOverridesOfModel = overridesOfModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVTZXR0aW5nc1R5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vYWluYXRpdmVTZXR0aW5nc1R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBOzs7MEZBRzBGO0FBRTFGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSx1QkFBdUIsRUFBa0IsTUFBTSx3QkFBd0IsQ0FBQztBQVUxRyxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBbUIsQ0FBQTtBQUVuRixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUEwQixDQUFBLENBQUMsa0JBQWtCO0FBQzVHLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUUsa0JBQStCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQyxzQkFBc0I7QUFNNUksTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsQ0FBQyxZQUEwQixFQUFFLEVBQUU7SUFDMUUsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUF3QixDQUFBO0FBQ2pGLENBQUMsQ0FBQTtBQW1DRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxDQUFDLFlBQTBCLEVBQThCLEVBQUU7SUFDbkcsSUFBSSxZQUFZLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDbEMsT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEdBQUcsQ0FBQTtJQUMvQixDQUFDO1NBQ0ksSUFBSSxZQUFZLEtBQUssUUFBUSxFQUFFLENB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