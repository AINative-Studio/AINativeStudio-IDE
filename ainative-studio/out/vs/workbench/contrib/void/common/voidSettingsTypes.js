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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vdm9pZFNldHRpbmdzVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7OzswRkFHMEY7QUFFMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHVCQUF1QixFQUFrQixNQUFNLHdCQUF3QixDQUFDO0FBVTFHLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFtQixDQUFBO0FBRW5GLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQTBCLENBQUEsQ0FBQyxrQkFBa0I7QUFDNUcsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBRSxrQkFBK0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQSxDQUFDLHNCQUFzQjtBQU01SSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxDQUFDLFlBQTBCLEVBQUUsRUFBRTtJQUMxRSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQXdCLENBQUE7QUFDakYsQ0FBQyxDQUFBO0FBZ0NELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLENBQUMsWUFBMEIsRUFBOEIsRUFBRTtJQUNuRyxJQUFJLFlBQVksS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNsQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsR0FBRyxDQUFBO0lBQy9CLENBQUM7U0FDSSxJQUFJLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNwQyxPQUFP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