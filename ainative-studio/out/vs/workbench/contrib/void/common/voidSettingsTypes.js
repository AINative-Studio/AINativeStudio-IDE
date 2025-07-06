/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
};
export const globalSettingNames = Object.keys(defaultGlobalSettings);
const overridesOfModel = {};
for (const providerName of providerNames) {
    overridesOfModel[providerName] = {};
}
export const defaultOverridesOfModel = overridesOfModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3ZvaWRTZXR0aW5nc1R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBOzs7MEZBRzBGO0FBRTFGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSx1QkFBdUIsRUFBa0IsTUFBTSx3QkFBd0IsQ0FBQztBQVUxRyxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBbUIsQ0FBQTtBQUVuRixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUEwQixDQUFBLENBQUMsa0JBQWtCO0FBQzVHLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUUsa0JBQStCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQyxzQkFBc0I7QUFNNUksTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsQ0FBQyxZQUEwQixFQUFFLEVBQUU7SUFDMUUsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUF3QixDQUFBO0FBQ2pGLENBQUMsQ0FBQTtBQWdDRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxDQUFDLFlBQTBCLEVBQThCLEVBQUU7SUFDbkcsSUFBSSxZQUFZLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDbEMsT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEdBQUcsQ0FBQTtJQUMvQixDQUFDO1NBQ0ksSUFBSSxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDcEMs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