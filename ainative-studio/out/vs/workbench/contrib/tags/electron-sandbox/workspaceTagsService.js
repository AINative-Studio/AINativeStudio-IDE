/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { URI } from '../../../../base/common/uri.js';
import { Schemas } from '../../../../base/common/network.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkspaceTagsService } from '../common/workspaceTags.js';
import { getHashedRemotesFromConfig } from './workspaceTags.js';
import { splitLines } from '../../../../base/common/strings.js';
import { MavenArtifactIdRegex, MavenDependenciesRegex, MavenDependencyRegex, GradleDependencyCompactRegex, GradleDependencyLooseRegex, MavenGroupIdRegex, JavaLibrariesToLookFor } from '../common/javaWorkspaceTags.js';
import { hashAsync } from '../../../../base/common/hash.js';
const MetaModulesToLookFor = [
    // Azure packages
    '@azure',
    '@azure/ai',
    '@azure/core',
    '@azure/cosmos',
    '@azure/event',
    '@azure/identity',
    '@azure/keyvault',
    '@azure/search',
    '@azure/storage'
];
const ModulesToLookFor = [
    // Packages that suggest a node server
    'express',
    'sails',
    'koa',
    'hapi',
    'socket.io',
    'restify',
    'next',
    'nuxt',
    '@nestjs/core',
    'strapi',
    'gatsby',
    // JS frameworks
    'react',
    'react-native',
    'react-native-macos',
    'react-native-windows',
    'rnpm-plugin-windows',
    '@angular/core',
    '@ionic',
    'vue',
    'tns-core-modules',
    '@nativescript/core',
    'electron',
    // Other interesting packages
    'aws-sdk',
    'aws-amplify',
    'azure',
    'azure-storage',
    'chroma',
    'faiss',
    'firebase',
    '@google-cloud/common',
    'heroku-cli',
    'langchain',
    'milvus',
    'openai',
    'pinecone',
    'qdrant',
    // Office and Sharepoint packages
    '@microsoft/teams-js',
    '@microsoft/office-js',
    '@microsoft/office-js-helpers',
    '@types/office-js',
    '@types/office-runtime',
    'office-ui-fabric-react',
    '@uifabric/icons',
    '@uifabric/merge-styles',
    '@uifabric/styling',
    '@uifabric/experiments',
    '@uifabric/utilities',
    '@microsoft/rush',
    'lerna',
    'just-task',
    'beachball',
    // Playwright packages
    'playwright',
    'playwright-cli',
    '@playwright/test',
    'playwright-core',
    'playwright-chromium',
    'playwright-firefox',
    'playwright-webkit',
    // Other interesting browser testing packages
    'cypress',
    'nightwatch',
    'protractor',
    'puppeteer',
    'selenium-webdriver',
    'webdriverio',
    'gherkin',
    // AzureSDK packages
    '@azure/app-configuration',
    '@azure/cosmos-sign',
    '@azure/cosmos-language-service',
    '@azure/synapse-spark',
    '@azure/synapse-monitoring',
    '@azure/synapse-managed-private-endpoints',
    '@azure/synapse-artifacts',
    '@azure/synapse-access-control',
    '@azure/ai-metrics-advisor',
    '@azure/service-bus',
    '@azure/keyvault-secrets',
    '@azure/keyvault-keys',
    '@azure/keyvault-certificates',
    '@azure/keyvault-admin',
    '@azure/digital-twins-core',
    '@azure/cognitiveservices-anomalydetector',
    '@azure/ai-anomaly-detector',
    '@azure/core-xml',
    '@azure/core-tracing',
    '@azure/core-paging',
    '@azure/core-https',
    '@azure/core-client',
    '@azure/core-asynciterator-polyfill',
    '@azure/core-arm',
    '@azure/amqp-common',
    '@azure/core-lro',
    '@azure/logger',
    '@azure/core-http',
    '@azure/core-auth',
    '@azure/core-amqp',
    '@azure/abort-controller',
    '@azure/eventgrid',
    '@azure/storage-file-datalake',
    '@azure/search-documents',
    '@azure/storage-file',
    '@azure/storage-datalake',
    '@azure/storage-queue',
    '@azure/storage-file-share',
    '@azure/storage-blob-changefeed',
    '@azure/storage-blob',
    '@azure/cognitiveservices-formrecognizer',
    '@azure/ai-form-recognizer',
    '@azure/cognitiveservices-textanalytics',
    '@azure/ai-text-analytics',
    '@azure/event-processor-host',
    '@azure/schema-registry-avro',
    '@azure/schema-registry',
    '@azure/eventhubs-checkpointstore-blob',
    '@azure/event-hubs',
    '@azure/communication-signaling',
    '@azure/communication-calling',
    '@azure/communication-sms',
    '@azure/communication-common',
    '@azure/communication-chat',
    '@azure/communication-administration',
    '@azure/attestation',
    '@azure/data-tables',
    '@azure/arm-appservice',
    '@azure-rest/ai-inference',
    '@azure-rest/arm-appservice',
    '@azure/arm-appcontainers',
    '@azure/arm-rediscache',
    '@azure/arm-redisenterprisecache',
    '@azure/arm-apimanagement',
    '@azure/arm-logic',
    '@azure/app-configuration',
    '@azure/arm-appconfiguration',
    '@azure/arm-dashboard',
    '@azure/arm-signalr',
    '@azure/arm-securitydevops',
    '@azure/arm-labservices',
    '@azure/web-pubsub',
    '@azure/web-pubsub-client',
    '@azure/web-pubsub-client-protobuf',
    '@azure/web-pubsub-express',
    '@azure/openai',
    '@azure/arm-hybridkubernetes',
    '@azure/arm-kubernetesconfiguration',
    //AI and vector db dev packages
    '@anthropic-ai/sdk',
    '@anthropic-ai/tokenizer',
    '@arizeai/openinference-instrumentation-langchain',
    '@arizeai/openinference-instrumentation-openai',
    '@aws-sdk-client-bedrock-runtime',
    '@aws-sdk/client-bedrock',
    '@datastax/astra-db-ts',
    'fireworks-js',
    '@google-cloud/aiplatform',
    '@huggingface/inference',
    'humanloop',
    '@langchain/anthropic',
    'langsmith',
    'llamaindex',
    '@google-cloud/aiplatform',
    '@mistralai/mistralai',
    'mongodb',
    'neo4j-driver',
    'ollama',
    'onnxruntime-node',
    'onnxruntime-web',
    'pg',
    'postgresql',
    'redis',
    '@supabase/supabase-js',
    '@tensorflow/tfjs',
    '@xenova/transformers',
    'tika',
    'weaviate-client',
    '@zilliz/milvus2-sdk-node',
    //Azure AI
    '@azure-rest/ai-anomaly-detector',
    '@azure-rest/ai-content-safety',
    '@azure-rest/ai-document-intelligence',
    '@azure-rest/ai-document-translator',
    '@azure-rest/ai-personalizer',
    '@azure-rest/ai-translation-text',
    '@azure-rest/ai-vision-image-analysis',
    '@azure/ai-anomaly-detector',
    '@azure/ai-form-recognizer',
    '@azure/ai-language-conversations',
    '@azure/ai-language-text',
    '@azure/ai-text-analytics',
    '@azure/arm-botservice',
    '@azure/arm-cognitiveservices',
    '@azure/arm-machinelearning',
    '@azure/cognitiveservices-contentmoderator',
    '@azure/cognitiveservices-customvision-prediction',
    '@azure/cognitiveservices-customvision-training',
    '@azure/cognitiveservices-face',
    '@azure/cognitiveservices-translatortext',
    'microsoft-cognitiveservices-speech-sdk',
    '@google/generative-ai'
];
const PyMetaModulesToLookFor = [
    'azure-ai',
    'azure-cognitiveservices',
    'azure-core',
    'azure-cosmos',
    'azure-event',
    'azure-identity',
    'azure-keyvault',
    'azure-mgmt',
    'azure-ml',
    'azure-search',
    'azure-storage'
];
const PyModulesToLookFor = [
    'azure',
    'azure-ai-inference',
    'azure-ai-language-conversations',
    'azure-ai-language-questionanswering',
    'azure-ai-ml',
    'azure-ai-translation-document',
    'azure-appconfiguration',
    'azure-appconfiguration-provider',
    'azure-loganalytics',
    'azure-synapse-nspkg',
    'azure-synapse-spark',
    'azure-synapse-artifacts',
    'azure-synapse-accesscontrol',
    'azure-synapse',
    'azure-cognitiveservices-vision-nspkg',
    'azure-cognitiveservices-search-nspkg',
    'azure-cognitiveservices-nspkg',
    'azure-cognitiveservices-language-nspkg',
    'azure-cognitiveservices-knowledge-nspkg',
    'azure-containerregistry',
    'azure-communication-identity',
    'azure-communication-phonenumbers',
    'azure-communication-email',
    'azure-communication-rooms',
    'azure-communication-callautomation',
    'azure-confidentialledger',
    'azure-containerregistry',
    'azure-developer-loadtesting',
    'azure-iot-deviceupdate',
    'azure-messaging-webpubsubservice',
    'azure-monitor',
    'azure-monitor-query',
    'azure-monitor-ingestion',
    'azure-mgmt-appcontainers',
    'azure-mgmt-apimanagement',
    'azure-mgmt-web',
    'azure-mgmt-redis',
    'azure-mgmt-redisenterprise',
    'azure-mgmt-logic',
    'azure-appconfiguration',
    'azure-appconfiguration-provider',
    'azure-mgmt-appconfiguration',
    'azure-mgmt-dashboard',
    'azure-mgmt-signalr',
    'azure-messaging-webpubsubservice',
    'azure-mgmt-webpubsub',
    'azure-mgmt-securitydevops',
    'azure-mgmt-labservices',
    'azure-ai-metricsadvisor',
    'azure-servicebus',
    'azureml-sdk',
    'azure-keyvault-nspkg',
    'azure-keyvault-secrets',
    'azure-keyvault-keys',
    'azure-keyvault-certificates',
    'azure-keyvault-administration',
    'azure-digitaltwins-nspkg',
    'azure-digitaltwins-core',
    'azure-cognitiveservices-anomalydetector',
    'azure-ai-anomalydetector',
    'azure-applicationinsights',
    'azure-core-tracing-opentelemetry',
    'azure-core-tracing-opencensus',
    'azure-nspkg',
    'azure-common',
    'azure-eventgrid',
    'azure-storage-file-datalake',
    'azure-search-nspkg',
    'azure-search-documents',
    'azure-storage-nspkg',
    'azure-storage-file',
    'azure-storage-common',
    'azure-storage-queue',
    'azure-storage-file-share',
    'azure-storage-blob-changefeed',
    'azure-storage-blob',
    'azure-cognitiveservices-formrecognizer',
    'azure-ai-formrecognizer',
    'azure-ai-nspkg',
    'azure-cognitiveservices-language-textanalytics',
    'azure-ai-textanalytics',
    'azure-schemaregistry-avroencoder',
    'azure-schemaregistry-avroserializer',
    'azure-schemaregistry',
    'azure-eventhub-checkpointstoreblob-aio',
    'azure-eventhub-checkpointstoreblob',
    'azure-eventhub',
    'azure-servicefabric',
    'azure-communication-nspkg',
    'azure-communication-sms',
    'azure-communication-chat',
    'azure-communication-administration',
    'azure-security-attestation',
    'azure-data-nspkg',
    'azure-data-tables',
    'azure-devtools',
    'azure-elasticluster',
    'azure-functions',
    'azure-graphrbac',
    'azure-iothub-device-client',
    'azure-shell',
    'azure-translator',
    'azure-mgmt-hybridkubernetes',
    'azure-mgmt-kubernetesconfiguration',
    'adal',
    'pydocumentdb',
    'botbuilder-core',
    'botbuilder-schema',
    'botframework-connector',
    'playwright',
    'transformers',
    'langchain',
    'llama-index',
    'google-cloud-aiplatform',
    'guidance',
    'openai',
    'semantic-kernel',
    'sentence-transformers',
    // AI and vector db dev packages
    'anthropic',
    'aporia',
    'arize',
    'deepchecks',
    'fireworks-ai',
    'langchain-fireworks',
    'humanloop',
    'pymongo',
    'langchain-anthropic',
    'langchain-huggingface',
    'langchain-fireworks',
    'ollama',
    'onnxruntime',
    'pgvector',
    'sentence-transformers',
    'tika',
    'trulens',
    'trulens-eval',
    'wandb',
    // Azure AI Services
    'azure-ai-contentsafety',
    'azure-ai-documentintelligence',
    'azure-ai-translation-text',
    'azure-ai-vision',
    'azure-cognitiveservices-language-luis',
    'azure-cognitiveservices-speech',
    'azure-cognitiveservices-vision-contentmoderator',
    'azure-cognitiveservices-vision-face',
    'azure-mgmt-cognitiveservices',
    'azure-mgmt-search',
    'google-generativeai'
];
const GoModulesToLookFor = [
    'github.com/Azure/azure-sdk-for-go/sdk/storage/azblob',
    'github.com/Azure/azure-sdk-for-go/sdk/storage/azfile',
    'github.com/Azure/azure-sdk-for-go/sdk/storage/azqueue',
    'github.com/Azure/azure-sdk-for-go/sdk/storage/azdatalake',
    'github.com/Azure/azure-sdk-for-go/sdk/tracing/azotel',
    'github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azadmin',
    'github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azcertificates',
    'github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azkeys',
    'github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets',
    'github.com/Azure/azure-sdk-for-go/sdk/monitor/azquery',
    'github.com/Azure/azure-sdk-for-go/sdk/monitor/azingest',
    'github.com/Azure/azure-sdk-for-go/sdk/messaging/azeventhubs',
    'github.com/Azure/azure-sdk-for-go/sdk/messaging/azservicebus',
    'github.com/Azure/azure-sdk-for-go/sdk/data/azappconfig',
    'github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos',
    'github.com/Azure/azure-sdk-for-go/sdk/data/aztables',
    'github.com/Azure/azure-sdk-for-go/sdk/containers/azcontainerregistry',
    'github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai',
    'github.com/Azure/azure-sdk-for-go/sdk/azidentity',
    'github.com/Azure/azure-sdk-for-go/sdk/azcore',
    'github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/'
];
let WorkspaceTagsService = class WorkspaceTagsService {
    constructor(fileService, contextService, environmentService, textFileService) {
        this.fileService = fileService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this.textFileService = textFileService;
    }
    async getTags() {
        if (!this._tags) {
            this._tags = await this.resolveWorkspaceTags();
        }
        return this._tags;
    }
    async getTelemetryWorkspaceId(workspace, state) {
        function createHash(uri) {
            return hashAsync(uri.scheme === Schemas.file ? uri.fsPath : uri.toString());
        }
        let workspaceId;
        switch (state) {
            case 1 /* WorkbenchState.EMPTY */:
                workspaceId = undefined;
                break;
            case 2 /* WorkbenchState.FOLDER */:
                workspaceId = await createHash(workspace.folders[0].uri);
                break;
            case 3 /* WorkbenchState.WORKSPACE */:
                if (workspace.configuration) {
                    workspaceId = await createHash(workspace.configuration);
                }
        }
        return workspaceId;
    }
    getHashedRemotesFromUri(workspaceUri, stripEndingDotGit = false) {
        const path = workspaceUri.path;
        const uri = workspaceUri.with({ path: `${path !== '/' ? path : ''}/.git/config` });
        return this.fileService.exists(uri).then(exists => {
            if (!exists) {
                return [];
            }
            return this.textFileService.read(uri, { acceptTextOnly: true }).then(content => getHashedRemotesFromConfig(content.value, stripEndingDotGit), err => [] // ignore missing or binary file
            );
        });
    }
    /* __GDPR__FRAGMENT__
        "WorkspaceTags" : {
            "workbench.filesToOpenOrCreate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workbench.filesToDiff" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workbench.filesToMerge" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "workspace.roots" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.empty" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.grunt" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gulp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.jake" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.tsconfig" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.jsconfig" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.config.xml" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.vsc.extension" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.asp<NUMBER>" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.sln" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.unity" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.express" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.sails" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.koa" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.hapi" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.socket.io" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.restify" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.next" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.nuxt" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@nestjs/core" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.strapi" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.gatsby" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.rnpm-plugin-windows" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.react" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@angular/core" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.vue" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@anthropic-ai/sdk" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@anthropic-ai/tokenizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@arizeai/openinference-instrumentation-langchain" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@arizeai/openinference-instrumentation-openai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@aws-sdk-client-bedrock-runtime" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@aws-sdk/client-bedrock" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.aws-sdk" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.aws-amplify-sdk" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cosmos" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/event" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/identity" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/keyvault" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/search" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/storage" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@google-cloud/aiplatform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.azure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.azure-storage" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@google-cloud/common" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.firebase" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.heroku-cli" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@huggingface/inference" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@microsoft/teams-js" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@microsoft/office-js" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@microsoft/office-js-helpers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@types/office-js" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@types/office-runtime" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.office-ui-fabric-react" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@uifabric/icons" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@uifabric/merge-styles" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@uifabric/styling" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@uifabric/experiments" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@uifabric/utilities" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@microsoft/rush" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.lerna" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.just-task" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.beachball" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.electron" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.playwright" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.playwright-cli" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@playwright/test" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.playwright-core" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.playwright-chromium" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.playwright-firefox" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.playwright-webkit" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.cypress" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.chroma" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.faiss" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.fireworks-js" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@datastax/astra-db-ts" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.humanloop" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.langchain" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@langchain/anthropic" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.langsmith" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.llamaindex" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@google-cloud/aiplatform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@mistralai/mistralai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.milvus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.mongodb" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.neo4j-driver" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.ollama" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.onnxruntime-node" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.onnxruntime-web" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.openai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.pinecone" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.postgresql" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.pg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.qdrant" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.redis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@supabase/supabase-js" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@tensorflow/tfjs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@xenova/transformers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.weaviate-client" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@zilliz/milvus2-sdk-node" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.nightwatch" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.protractor" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.puppeteer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.selenium-webdriver" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.tika" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.webdriverio" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.gherkin" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/app-configuration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cosmos-sign" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cosmos-language-service" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/synapse-spark" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/synapse-monitoring" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/synapse-managed-private-endpoints" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/synapse-artifacts" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/synapse-access-control" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-metrics-advisor" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/ai-anomaly-detector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/ai-content-safety" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/ai-document-intelligence" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/ai-document-translator" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/ai-personalizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/ai-translation-text" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/ai-vision-image-analysis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-anomaly-detector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-form-recognizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-language-conversations" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-language-text" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-text-analytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-botservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-cognitiveservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-machinelearning" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cognitiveservices-contentmoderator" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cognitiveservices-customvision-prediction" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cognitiveservices-customvision-training" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cognitiveservices-face" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cognitiveservices-translatortext" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.microsoft-cognitiveservices-speech-sdk" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/service-bus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/keyvault-secrets" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/keyvault-keys" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/keyvault-certificates" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/keyvault-admin" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/digital-twins-core" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cognitiveservices-anomalydetector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-anomaly-detector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-xml" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-tracing" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-paging" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-https" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-client" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-asynciterator-polyfill" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-arm" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/amqp-common" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-lro" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/logger" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-http" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-auth" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/core-amqp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/abort-controller" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/eventgrid" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/storage-file-datalake" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/search-documents" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/storage-file" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/storage-datalake" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/storage-queue" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/storage-file-share" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/storage-blob-changefeed" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/storage-blob" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cognitiveservices-formrecognizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-form-recognizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/cognitiveservices-textanalytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/ai-text-analytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/event-processor-host" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/schema-registry-avro" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/schema-registry" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/eventhubs-checkpointstore-blob" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/event-hubs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/communication-signaling" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/communication-calling" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/communication-sms" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/communication-common" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/communication-chat" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/communication-administration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/attestation" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/data-tables" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/ai-inference" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure-rest/arm-appservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-appservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-appcontainers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-rediscache" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-redisenterprisecache" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-apimanagement" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-logic" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/app-configuration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-dashboard" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-signalr" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-securitydevops" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-labservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/web-pubsub" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/web-pubsub-client" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/web-pubsub-client-protobuf" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/web-pubsub-express" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/openai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-hybridkubernetes" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@azure/arm-kubernetesconfiguration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.react-native-macos" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.react-native-windows" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.npm.@google/generative-ai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.bower" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.yeoman.code.ext" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.cordova.high" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.cordova.low" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.xamarin.android" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.xamarin.ios" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.android.cpp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.reactNative" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.ionic" : { "classification" : "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": "true" },
            "workspace.nativeScript" : { "classification" : "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": "true" },
            "workspace.java.pom" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.java.gradle" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.java.android" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.javaee" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.jdbc" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.jpa" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.lombok" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.mockito" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.redis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.springboot" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.sql" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.unittest" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-cosmos" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-storage" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-servicebus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-eventhubs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.langchain4j" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.springboot-ai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.semantic-kernel" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-anomalydetector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-formrecognizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-documentintelligence" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-translation-document" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-personalizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-translation-text" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-contentsafety" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-vision-imageanalysis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-textanalytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-search-documents" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-documenttranslator" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-vision-face" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-ai-openai-assistants" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-cognitiveservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-cognitiveservices-speech" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.openai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-openai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.azure-functions" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.quarkus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.microprofile" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.micronaut" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.gradle.graalvm" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.javaee" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.jdbc" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.jpa" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.lombok" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.mockito" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.redis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.springboot" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.sql" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.unittest" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-cosmos" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-storage" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-servicebus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-eventhubs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.langchain4j" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.springboot-ai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.semantic-kernel" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-anomalydetector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-formrecognizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-documentintelligence" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-translation-document" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-personalizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-translation-text" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-contentsafety" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-vision-imageanalysis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-textanalytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-search-documents" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-documenttranslator" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-vision-face" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-ai-openai-assistants" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-cognitiveservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-cognitiveservices-speech" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.openai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-openai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.azure-functions" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.quarkus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.microprofile" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.micronaut" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.pom.graalvm" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.requirements" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.requirements.star" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.Pipfile" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.conda" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.setup": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.pyproject": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.manage": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.setupcfg": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.app": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.any-azure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.pulumi-azure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-inference" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-language-conversations" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-language-questionanswering" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-ml" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-contentsafety" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-documentintelligence" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-translation-text" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-vision" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-language-luis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-speech" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-vision-contentmoderator" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-vision-face" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-cognitiveservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-search" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-translation-document" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-core" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cosmos" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-devtools" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-elasticluster" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-event" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-eventgrid" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-functions" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-graphrbac" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-identity" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-iothub-device-client" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-keyvault" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-loganalytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ml" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-monitor" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-appcontainers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-redis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-redisenterprise" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-apimanagement" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-logic" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-appconfiguration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-appconfiguration-provider" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-appconfiguration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-dashboard" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-appconfiguration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-signalr" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-messaging-webpubsubservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-webpubsub" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-securitydevops" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-labservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-web" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-search" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-servicebus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-servicefabric" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-shell" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-translator" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-hybridkubernetes" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-mgmt-kubernetesconfiguration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.adal" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.pydocumentdb" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.botbuilder-core" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.botbuilder-schema" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.botframework-connector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.playwright" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-synapse-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-synapse-spark" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-synapse-artifacts" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-synapse-accesscontrol" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-synapse" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-vision-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-search-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-language-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-knowledge-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-containerregistry" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-metricsadvisor" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azureml-sdk" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-keyvault-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-keyvault-secrets" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-keyvault-keys" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-keyvault-certificates" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-keyvault-administration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-digitaltwins-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-digitaltwins-core" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-anomalydetector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-anomalydetector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-applicationinsights" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-core-tracing-opentelemetry" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-core-tracing-opencensus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-common" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-eventgrid" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage-file-datalake" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-search-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-search-documents" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage-file" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage-common" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage-queue" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage-file-share" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage-blob-changefeed" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-storage-blob" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-formrecognizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-formrecognizer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-cognitiveservices-language-textanalytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-ai-textanalytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-schemaregistry-avroserializer" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-schemaregistry" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-eventhub-checkpointstoreblob-aio" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-eventhub-checkpointstoreblob" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-eventhub" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-sms" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-chat" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-administration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-security-attestation" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-appconfiguration-provider" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-identity" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-phonenumbers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-email" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-rooms" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-communication-callautomation" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-confidentialledger" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-iot-deviceupdate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-developer-loadtesting" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-monitor-query" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-monitor-ingestion" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-schemaregistry-avroencoder" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-messaging-webpubsubservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-data-nspkg" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.azure-data-tables" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.arize" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.aporia" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.anthropic" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.deepchecks" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.fireworks-ai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.transformers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.humanloop" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.langchain" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.langchain-anthropic" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.langchain-fireworks" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.langchain-huggingface" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.llama-index" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.google-cloud-aiplatform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.guidance" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.ollama" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.onnxruntime" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.openai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.pymongo" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.pgvector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.semantic-kernel" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.sentence-transformers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.tika" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.trulens" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.trulens-eval" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.wandb" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.py.google-generativeai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/storage/azblob" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/storage/azfile" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/storage/azqueue" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/storage/azdatalake" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/tracing/azotel" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azadmin" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azcertificates" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azkeys" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/monitor/azquery" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/monitor/azingest" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/messaging/azeventhubs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/messaging/azservicebus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/data/azappconfig" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/data/aztables" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/containers/azcontainerregistry" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/azidentity" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/azcore" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/iotfirmwaredefense/armiotfirmwaredefense" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/aad/armaad" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/addons/armaddons" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/advisor/armadvisor" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/agrifood/armagrifood" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/alertsmanagement/armalertsmanagement" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/analysisservices/armanalysisservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/apimanagement/armapimanagement" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/appcomplianceautomation/armappcomplianceautomation" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/appconfiguration/armappconfiguration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/appplatform/armappplatform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/appservice/armappservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/applicationinsights/armapplicationinsights" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/azurearcdata/armazurearcdata" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/attestation/armattestation" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/authorization/armauthorization" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/automanage/armautomanage" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/automation/armautomation" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/azuredata/armazuredata" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/azurestackhci/armazurestackhci" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/avs/armavs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/recoveryservices/armrecoveryservicesbackup" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/baremetalinfrastructure/armbaremetalinfrastructure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/batch/armbatch" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/billing/armbilling" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/billingbenefits/armbillingbenefits" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/blockchain/armblockchain" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/blueprint/armblueprint" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/botservice/armbotservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/changeanalysis/armchangeanalysis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armchanges" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/chaos/armchaos" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/search/armsearch" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/cognitiveservices/armcognitiveservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/commerce/armcommerce" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/communication/armcommunication" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/compute/armcompute" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/confidentialledger/armconfidentialledger" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/confluent/armconfluent" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/connectedvmware/armconnectedvmware" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/consumption/armconsumption" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/appcontainers/armappcontainers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/containerinstance/armcontainerinstance" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/containerregistry/armcontainerregistry" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/containerservice/armcontainerservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/containerservicefleet/armcontainerservicefleet" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/cdn/armcdn" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/cosmos/armcosmos" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/cosmosforpostgresql/armcosmosforpostgresql" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/costmanagement/armcostmanagement" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/customproviders/armcustomproviders" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/customerinsights/armcustomerinsights" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/customerlockbox/armcustomerlockbox" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/databox/armdatabox" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/databoxedge/armdataboxedge" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/datacatalog/armdatacatalog" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/datafactory/armdatafactory" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/datalake-analytics/armdatalakeanalytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/datalake-store/armdatalakestore" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/datamigration/armdatamigration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/dataprotection/armdataprotection" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/datashare/armdatashare" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/databricks/armdatabricks" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/datadog/armdatadog" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/delegatednetwork/armdelegatednetwork" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/deploymentmanager/armdeploymentmanager" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armdeploymentscripts" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/desktopvirtualization/armdesktopvirtualization" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/devcenter/armdevcenter" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/devhub/armdevhub" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/deviceprovisioningservices/armdeviceprovisioningservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/deviceupdate/armdeviceupdate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/devops/armdevops" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/devtestlabs/armdevtestlabs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/digitaltwins/armdigitaltwins" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/dns/armdns" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/dnsresolver/armdnsresolver" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/domainservices/armdomainservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/dynatrace/armdynatrace" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/edgeorder/armedgeorder" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/edgeorderpartner/armedgeorderpartner" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/education/armeducation" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/elastic/armelastic" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/elasticsan/armelasticsan" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/elasticsans/armelasticsans" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/engagementfabric/armengagementfabric" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/eventgrid/armeventgrid" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/eventhub/armeventhub" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/extendedlocation/armextendedlocation" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armfeatures" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/fluidrelay/armfluidrelay" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/frontdoor/armfrontdoor" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/graphservices/armgraphservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/guestconfiguration/armguestconfiguration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hanaonazure/armhanaonazure" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hardwaresecuritymodules/armhardwaresecuritymodules" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hdinsight/armhdinsight" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/healthbot/armhealthbot" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/healthcareapis/armhealthcareapis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hybridcompute/armhybridcompute" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hybridconnectivity/armhybridconnectivity" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hybridcontainerservice/armhybridcontainerservice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hybriddatamanager/armhybriddatamanager" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hybridkubernetes/armhybridkubernetes" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/hybridnetwork/armhybridnetwork" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/iotcentral/armiotcentral" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/iothub/armiothub" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/iotsecurity/armiotsecurity" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/keyvault/armkeyvault" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/kubernetesconfiguration/armkubernetesconfiguration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/kusto/armkusto" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/labservices/armlabservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armlinks" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/loadtesting/armloadtesting" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armlocks" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/operationalinsights/armoperationalinsights" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/logic/armlogic" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/logz/armlogz" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/m365securityandcompliance/armm365securityandcompliance" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/machinelearning/armmachinelearning" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/machinelearningservices/armmachinelearningservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/maintenance/armmaintenance" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armmanagedapplications" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/solutions/armmanagedapplications" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/dashboard/armdashboard" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/managednetwork/armmanagednetwork" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/managednetworkfabric/armmanagednetworkfabric" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/msi/armmsi" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/managedservices/armmanagedservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/managementgroups/armmanagementgroups" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/managementpartner/armmanagementpartner" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/maps/armmaps" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/mariadb/armmariadb" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/marketplace/armmarketplace" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/marketplaceordering/armmarketplaceordering" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/mediaservices/armmediaservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/migrate/armmigrate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/mixedreality/armmixedreality" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/mobilenetwork/armmobilenetwork" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/mysql/armmysql" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/mysql/armmysqlflexibleservers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/netapp/armnetapp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/network/armnetwork" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/networkcloud/armnetworkcloud" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/networkfunction/armnetworkfunction" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/newrelic/armnewrelicobservability" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/nginx/armnginx" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/notificationhubs/armnotificationhubs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/oep/armoep" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/operationsmanagement/armoperationsmanagement" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/orbital/armorbital" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/paloaltonetworksngfw/armpanngfw" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/peering/armpeering" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armpolicy" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/policyinsights/armpolicyinsights" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/portal/armportal" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/postgresql/armpostgresql" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/postgresql/armpostgresqlflexibleservers" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/postgresqlhsc/armpostgresqlhsc" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/powerbiprivatelinks/armpowerbiprivatelinks" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/powerbidedicated/armpowerbidedicated" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/powerbiembedded/armpowerbiembedded" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/powerplatform/armpowerplatform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/privatedns/armprivatedns" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/providerhub/armproviderhub" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/purview/armpurview" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/quantum/armquantum" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/liftrqumulo/armqumulo" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/quota/armquota" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/recoveryservices/armrecoveryservices" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/redhatopenshift/armredhatopenshift" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/redis/armredis" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/redisenterprise/armredisenterprise" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/relay/armrelay" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/reservations/armreservations" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resourceconnector/armresourceconnector" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resourcegraph/armresourcegraph" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resourcehealth/armresourcehealth" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resourcemover/armresourcemover" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armresources" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/saas/armsaas" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/scheduler/armscheduler" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/scvmm/armscvmm" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/security/armsecurity" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/securitydevops/armsecuritydevops" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/securityinsight/armsecurityinsight" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/securityinsights/armsecurityinsights" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/selfhelp/armselfhelp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/serialconsole/armserialconsole" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/servicebus/armservicebus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/servicefabric/armservicefabric" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/servicefabricmesh/armservicefabricmesh" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/servicelinker/armservicelinker" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/servicenetworking/armservicenetworking" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/signalr/armsignalr" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/recoveryservices/armrecoveryservicessiterecovery" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/sphere/armsphere" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/sql/armsql" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/sqlvirtualmachine/armsqlvirtualmachine" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storage/armstorage" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storagecache/armstoragecache" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storageimportexport/armstorageimportexport" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storagemover/armstoragemover" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storagepool/armstoragepool" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storagesync/armstoragesync" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storsimple1200series/armstorsimple1200series" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storsimple8000series/armstorsimple8000series" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/streamanalytics/armstreamanalytics" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armsubscriptions" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/subscription/armsubscription" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/support/armsupport" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/synapse/armsynapse" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armtemplatespecs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/testbase/armtestbase" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/timeseriesinsights/armtimeseriesinsights" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/trafficmanager/armtrafficmanager" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/web/armweb" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/webpubsub/armwebpubsub" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/windowsesu/armwindowsesu" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/windowsiot/armwindowsiot" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/workloadmonitor/armworkloadmonitor" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "workspace.go.mod.github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/workloads/armworkloads" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        }
    */
    async resolveWorkspaceTags() {
        const tags = Object.create(null);
        const state = this.contextService.getWorkbenchState();
        const workspace = this.contextService.getWorkspace();
        tags['workspace.id'] = await this.getTelemetryWorkspaceId(workspace, state);
        const { filesToOpenOrCreate, filesToDiff, filesToMerge } = this.environmentService;
        tags['workbench.filesToOpenOrCreate'] = filesToOpenOrCreate && filesToOpenOrCreate.length || 0;
        tags['workbench.filesToDiff'] = filesToDiff && filesToDiff.length || 0;
        tags['workbench.filesToMerge'] = filesToMerge && filesToMerge.length || 0;
        const isEmpty = state === 1 /* WorkbenchState.EMPTY */;
        tags['workspace.roots'] = isEmpty ? 0 : workspace.folders.length;
        tags['workspace.empty'] = isEmpty;
        const folders = !isEmpty ? workspace.folders.map(folder => folder.uri) : undefined;
        if (!folders || !folders.length) {
            return Promise.resolve(tags);
        }
        const aiGeneratedWorkspaces = URI.joinPath(this.environmentService.workspaceStorageHome, 'aiGeneratedWorkspaces.json');
        await this.fileService.exists(aiGeneratedWorkspaces).then(async (result) => {
            if (result) {
                try {
                    const content = await this.fileService.readFile(aiGeneratedWorkspaces);
                    const workspaces = JSON.parse(content.value.toString());
                    if (workspaces.indexOf(workspace.folders[0].uri.toString()) > -1) {
                        tags['aiGenerated'] = true;
                    }
                }
                catch (e) {
                    // Ignore errors when resolving file contents
                }
            }
        });
        return this.fileService.resolveAll(folders.map(resource => ({ resource }))).then((files) => {
            const names = [].concat(...files.map(result => result.success ? (result.stat.children || []) : [])).map(c => c.name);
            const nameSet = names.reduce((s, n) => s.add(n.toLowerCase()), new Set());
            tags['workspace.grunt'] = nameSet.has('gruntfile.js');
            tags['workspace.gulp'] = nameSet.has('gulpfile.js');
            tags['workspace.jake'] = nameSet.has('jakefile.js');
            tags['workspace.tsconfig'] = nameSet.has('tsconfig.json');
            tags['workspace.jsconfig'] = nameSet.has('jsconfig.json');
            tags['workspace.config.xml'] = nameSet.has('config.xml');
            tags['workspace.vsc.extension'] = nameSet.has('vsc-extension-quickstart.md');
            tags['workspace.ASP5'] = nameSet.has('project.json') && this.searchArray(names, /^.+\.cs$/i);
            tags['workspace.sln'] = this.searchArray(names, /^.+\.sln$|^.+\.csproj$/i);
            tags['workspace.unity'] = nameSet.has('assets') && nameSet.has('library') && nameSet.has('projectsettings');
            tags['workspace.npm'] = nameSet.has('package.json') || nameSet.has('node_modules');
            tags['workspace.bower'] = nameSet.has('bower.json') || nameSet.has('bower_components');
            tags['workspace.java.pom'] = nameSet.has('pom.xml');
            tags['workspace.java.gradle'] = nameSet.has('build.gradle') || nameSet.has('settings.gradle') || nameSet.has('build.gradle.kts') || nameSet.has('settings.gradle.kts') || nameSet.has('gradlew') || nameSet.has('gradlew.bat');
            tags['workspace.yeoman.code.ext'] = nameSet.has('vsc-extension-quickstart.md');
            tags['workspace.py.requirements'] = nameSet.has('requirements.txt');
            tags['workspace.py.requirements.star'] = this.searchArray(names, /^(.*)requirements(.*)\.txt$/i);
            tags['workspace.py.Pipfile'] = nameSet.has('pipfile');
            tags['workspace.py.conda'] = this.searchArray(names, /^environment(\.yml$|\.yaml$)/i);
            tags['workspace.py.setup'] = nameSet.has('setup.py');
            tags['workspace.py.manage'] = nameSet.has('manage.py');
            tags['workspace.py.setupcfg'] = nameSet.has('setup.cfg');
            tags['workspace.py.app'] = nameSet.has('app.py');
            tags['workspace.py.pyproject'] = nameSet.has('pyproject.toml');
            tags['workspace.go.mod'] = nameSet.has('go.mod');
            const mainActivity = nameSet.has('mainactivity.cs') || nameSet.has('mainactivity.fs');
            const appDelegate = nameSet.has('appdelegate.cs') || nameSet.has('appdelegate.fs');
            const androidManifest = nameSet.has('androidmanifest.xml');
            const platforms = nameSet.has('platforms');
            const plugins = nameSet.has('plugins');
            const www = nameSet.has('www');
            const properties = nameSet.has('properties');
            const resources = nameSet.has('resources');
            const jni = nameSet.has('jni');
            if (tags['workspace.config.xml'] &&
                !tags['workspace.language.cs'] && !tags['workspace.language.vb'] && !tags['workspace.language.aspx']) {
                if (platforms && plugins && www) {
                    tags['workspace.cordova.high'] = true;
                }
                else {
                    tags['workspace.cordova.low'] = true;
                }
            }
            if (tags['workspace.config.xml'] &&
                !tags['workspace.language.cs'] && !tags['workspace.language.vb'] && !tags['workspace.language.aspx']) {
                if (nameSet.has('ionic.config.json')) {
                    tags['workspace.ionic'] = true;
                }
            }
            if (mainActivity && properties && resources) {
                tags['workspace.xamarin.android'] = true;
            }
            if (appDelegate && resources) {
                tags['workspace.xamarin.ios'] = true;
            }
            if (androidManifest && jni) {
                tags['workspace.android.cpp'] = true;
            }
            function getFilePromises(filename, fileService, textFileService, contentHandler) {
                return !nameSet.has(filename) ? [] : folders.map(workspaceUri => {
                    const uri = workspaceUri.with({ path: `${workspaceUri.path !== '/' ? workspaceUri.path : ''}/${filename}` });
                    return fileService.exists(uri).then(exists => {
                        if (!exists) {
                            return undefined;
                        }
                        return textFileService.read(uri, { acceptTextOnly: true }).then(contentHandler);
                    }, err => {
                        // Ignore missing file
                    });
                });
            }
            function addPythonTags(packageName) {
                if (PyModulesToLookFor.indexOf(packageName) > -1) {
                    tags['workspace.py.' + packageName] = true;
                }
                for (const metaModule of PyMetaModulesToLookFor) {
                    if (packageName.startsWith(metaModule)) {
                        tags['workspace.py.' + metaModule] = true;
                    }
                }
                if (!tags['workspace.py.any-azure']) {
                    tags['workspace.py.any-azure'] = /azure/i.test(packageName);
                }
            }
            const requirementsTxtPromises = getFilePromises('requirements.txt', this.fileService, this.textFileService, content => {
                const dependencies = splitLines(content.value);
                for (const dependency of dependencies) {
                    // Dependencies in requirements.txt can have 3 formats: `foo==3.1, foo>=3.1, foo`
                    const format1 = dependency.split('==');
                    const format2 = dependency.split('>=');
                    const packageName = (format1.length === 2 ? format1[0] : format2[0]).trim();
                    addPythonTags(packageName);
                }
            });
            const pipfilePromises = getFilePromises('pipfile', this.fileService, this.textFileService, content => {
                let dependencies = splitLines(content.value);
                // We're only interested in the '[packages]' section of the Pipfile
                dependencies = dependencies.slice(dependencies.indexOf('[packages]') + 1);
                for (const dependency of dependencies) {
                    if (dependency.trim().indexOf('[') > -1) {
                        break;
                    }
                    // All dependencies in Pipfiles follow the format: `<package> = <version, or git repo, or something else>`
                    if (dependency.indexOf('=') === -1) {
                        continue;
                    }
                    const packageName = dependency.split('=')[0].trim();
                    addPythonTags(packageName);
                }
            });
            const packageJsonPromises = getFilePromises('package.json', this.fileService, this.textFileService, content => {
                try {
                    const packageJsonContents = JSON.parse(content.value);
                    const dependencies = Object.keys(packageJsonContents['dependencies'] || {}).concat(Object.keys(packageJsonContents['devDependencies'] || {}));
                    for (const dependency of dependencies) {
                        if (dependency.startsWith('react-native')) {
                            tags['workspace.reactNative'] = true;
                        }
                        else if ('tns-core-modules' === dependency || '@nativescript/core' === dependency) {
                            tags['workspace.nativescript'] = true;
                        }
                        else if (ModulesToLookFor.indexOf(dependency) > -1) {
                            tags['workspace.npm.' + dependency] = true;
                        }
                        else {
                            for (const metaModule of MetaModulesToLookFor) {
                                if (dependency.startsWith(metaModule)) {
                                    tags['workspace.npm.' + metaModule] = true;
                                }
                            }
                        }
                    }
                }
                catch (e) {
                    // Ignore errors when resolving file or parsing file contents
                }
            });
            const goModPromises = getFilePromises('go.mod', this.fileService, this.textFileService, content => {
                try {
                    const lines = splitLines(content.value);
                    let firstRequireBlockFound = false;
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line.startsWith('require (')) {
                            if (!firstRequireBlockFound) {
                                firstRequireBlockFound = true;
                                continue;
                            }
                            else {
                                break;
                            }
                        }
                        if (line.startsWith(')')) {
                            break;
                        }
                        if (firstRequireBlockFound && line !== '') {
                            const packageName = line.split(' ')[0].trim();
                            for (const module of GoModulesToLookFor) {
                                if (packageName.startsWith(module)) {
                                    tags['workspace.go.mod.' + packageName] = true;
                                }
                            }
                        }
                    }
                }
                catch (e) {
                    // Ignore errors when resolving file or parsing file contents
                }
            });
            const pomPromises = getFilePromises('pom.xml', this.fileService, this.textFileService, content => {
                try {
                    let dependenciesContent;
                    while (dependenciesContent = MavenDependenciesRegex.exec(content.value)) {
                        let dependencyContent;
                        while (dependencyContent = MavenDependencyRegex.exec(dependenciesContent[1])) {
                            const groupIdContent = MavenGroupIdRegex.exec(dependencyContent[1]);
                            const artifactIdContent = MavenArtifactIdRegex.exec(dependencyContent[1]);
                            if (groupIdContent && artifactIdContent) {
                                this.tagJavaDependency(groupIdContent[1], artifactIdContent[1], 'workspace.pom.', tags);
                            }
                        }
                    }
                }
                catch (e) {
                    // Ignore errors when resolving maven dependencies
                }
            });
            const gradlePromises = getFilePromises('build.gradle', this.fileService, this.textFileService, content => {
                try {
                    this.processGradleDependencies(content.value, GradleDependencyLooseRegex, tags);
                    this.processGradleDependencies(content.value, GradleDependencyCompactRegex, tags);
                }
                catch (e) {
                    // Ignore errors when resolving gradle dependencies
                }
            });
            const androidPromises = folders.map(workspaceUri => {
                const manifest = URI.joinPath(workspaceUri, '/app/src/main/AndroidManifest.xml');
                return this.fileService.exists(manifest).then(result => {
                    if (result) {
                        tags['workspace.java.android'] = true;
                    }
                }, err => {
                    // Ignore errors when resolving android
                });
            });
            return Promise.all([...packageJsonPromises, ...requirementsTxtPromises, ...pipfilePromises, ...pomPromises, ...gradlePromises, ...androidPromises, ...goModPromises]).then(() => tags);
        });
    }
    processGradleDependencies(content, regex, tags) {
        let dependencyContent;
        while (dependencyContent = regex.exec(content)) {
            const groupId = dependencyContent[1];
            const artifactId = dependencyContent[2];
            if (groupId && artifactId) {
                this.tagJavaDependency(groupId, artifactId, 'workspace.gradle.', tags);
            }
        }
    }
    tagJavaDependency(groupId, artifactId, prefix, tags) {
        for (const javaLibrary of JavaLibrariesToLookFor) {
            if (javaLibrary.predicate(groupId, artifactId)) {
                tags[prefix + javaLibrary.tag] = true;
                return;
            }
        }
    }
    searchArray(arr, regEx) {
        return arr.some(v => v.search(regEx) > -1) || undefined;
    }
};
WorkspaceTagsService = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ITextFileService)
], WorkspaceTagsService);
export { WorkspaceTagsService };
registerSingleton(IWorkspaceTagsService, WorkspaceTagsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFnc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YWdzL2VsZWN0cm9uLXNhbmRib3gvd29ya3NwYWNlVGFnc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBOEIsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQThCLE1BQU0sb0RBQW9ELENBQUM7QUFDMUgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLGdCQUFnQixFQUFvQixNQUFNLGdEQUFnRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBUSxNQUFNLDRCQUE0QixDQUFDO0FBQ3pFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsc0JBQXNCLEVBQUUsb0JBQW9CLEVBQUUsNEJBQTRCLEVBQUUsMEJBQTBCLEVBQUUsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6TixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFNUQsTUFBTSxvQkFBb0IsR0FBRztJQUM1QixpQkFBaUI7SUFDakIs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