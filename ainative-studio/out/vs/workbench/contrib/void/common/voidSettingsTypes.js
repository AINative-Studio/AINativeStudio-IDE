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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi92b2lkU2V0dGluZ3NUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTs7OzBGQUcwRjtBQUUxRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsdUJBQXVCLEVBQWtCLE1BQU0sd0JBQXdCLENBQUM7QUFVMUcsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQW1CLENBQUE7QUFFbkYsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBMEIsQ0FBQSxDQUFDLGtCQUFrQjtBQUM1RyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFFLGtCQUErQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUMsc0JBQXNCO0FBTTVJLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLENBQUMsWUFBMEIsRUFBRSxFQUFFO0lBQzFFLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBd0IsQ0FBQTtBQUNqRixDQUFDLENBQUE7QUFnQ0QsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxZQUEwQixFQUE4QixFQUFFO0lBQ25HLElBQUksWUFBWSxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxHQUFHLENBQUE7SUFDL0IsQ0FBQztTQUNJLElBQUksWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3BDLE9BQU8s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