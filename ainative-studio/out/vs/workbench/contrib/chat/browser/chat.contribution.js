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
import { timeout } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { registerEditorFeature } from '../../../../editor/common/editorFeatures.js';
import * as nls from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import product from '../../../../platform/product/common/product.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { PromptsConfig } from '../../../../platform/prompts/common/config.js';
import { DEFAULT_SOURCE_FOLDER as PROMPT_FILES_DEFAULT_SOURCE_FOLDER, PROMPT_FILE_EXTENSION } from '../../../../platform/prompts/common/constants.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions } from '../../../common/configuration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { allDiscoverySources, discoverySourceLabel, mcpConfigurationSection, mcpDiscoverySection, mcpEnabledSection, mcpSchemaExampleServers } from '../../mcp/common/mcpConfiguration.js';
import { ChatAgentNameService, ChatAgentService, IChatAgentNameService, IChatAgentService } from '../common/chatAgents.js';
import { CodeMapperService, ICodeMapperService } from '../common/chatCodeMapperService.js';
import '../common/chatColors.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { IChatEditingService } from '../common/chatEditingService.js';
import { ChatEntitlement, ChatEntitlementService, IChatEntitlementService } from '../common/chatEntitlementService.js';
import { chatVariableLeader } from '../common/chatParserTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatService } from '../common/chatServiceImpl.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../common/chatSlashCommands.js';
import { ChatTransferService, IChatTransferService } from '../common/chatTransferService.js';
import { IChatVariablesService } from '../common/chatVariables.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService } from '../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode } from '../common/constants.js';
import { ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService } from '../common/ignoredFiles.js';
import { ILanguageModelsService, LanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelStatsService, LanguageModelStatsService } from '../common/languageModelStats.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { DOCUMENTATION_URL } from '../common/promptSyntax/constants.js';
import '../common/promptSyntax/languageFeatures/promptLinkDiagnosticsProvider.js';
import '../common/promptSyntax/languageFeatures/promptLinkProvider.js';
import '../common/promptSyntax/languageFeatures/promptPathAutocompletion.js';
import { PromptsService } from '../common/promptSyntax/service/promptsService.js';
import { IPromptsService } from '../common/promptSyntax/service/types.js';
import { LanguageModelToolsExtensionPointHandler } from '../common/tools/languageModelToolsContribution.js';
import { BuiltinToolsContribution } from '../common/tools/tools.js';
import { IVoiceChatService, VoiceChatService } from '../common/voiceChatService.js';
import { AgentChatAccessibilityHelp, EditsChatAccessibilityHelp, PanelChatAccessibilityHelp, QuickChatAccessibilityHelp } from './actions/chatAccessibilityHelp.js';
import { CopilotTitleBarMenuRendering, registerChatActions } from './actions/chatActions.js';
import { ACTION_ID_NEW_CHAT, registerNewChatActions } from './actions/chatClearActions.js';
import { CodeBlockActionRendering, registerChatCodeBlockActions, registerChatCodeCompareBlockActions } from './actions/chatCodeblockActions.js';
import { registerChatContextActions } from './actions/chatContextActions.js';
import { registerChatCopyActions } from './actions/chatCopyActions.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { ChatSubmitAction, registerChatExecuteActions } from './actions/chatExecuteActions.js';
import { registerChatFileTreeActions } from './actions/chatFileTreeActions.js';
import { ChatGettingStartedContribution } from './actions/chatGettingStarted.js';
import { registerChatExportActions } from './actions/chatImportExport.js';
import { registerMoveActions } from './actions/chatMoveActions.js';
import { registerQuickChatActions } from './actions/chatQuickInputActions.js';
import { registerChatTitleActions } from './actions/chatTitleActions.js';
import { registerChatToolActions } from './actions/chatToolActions.js';
import { ChatTransferContribution } from './actions/chatTransfer.js';
import { IChatAccessibilityService, IChatCodeBlockContextProviderService, IChatWidgetService, IQuickChatService } from './chat.js';
import { ChatAccessibilityService } from './chatAccessibilityService.js';
import './chatAttachmentModel.js';
import { ChatMarkdownAnchorService, IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
import { ChatInputBoxContentProvider } from './chatEdinputInputContentProvider.js';
import { ChatEditingEditorAccessibility } from './chatEditing/chatEditingEditorAccessibility.js';
import { registerChatEditorActions } from './chatEditing/chatEditingEditorActions.js';
import { ChatEditingEditorContextKeys } from './chatEditing/chatEditingEditorContextKeys.js';
import { ChatEditingEditorOverlay } from './chatEditing/chatEditingEditorOverlay.js';
import { ChatEditingService } from './chatEditing/chatEditingServiceImpl.js';
import { ChatEditingNotebookFileSystemProviderContrib } from './chatEditing/notebook/chatEditingNotebookFileSystemProvider.js';
import { ChatEditor } from './chatEditor.js';
import { ChatEditorInput, ChatEditorInputSerializer } from './chatEditorInput.js';
import { agentSlashCommandToMarkdown, agentToMarkdown } from './chatMarkdownDecorationsRenderer.js';
import { ChatCompatibilityNotifier, ChatExtensionPointHandler } from './chatParticipant.contribution.js';
import { ChatPasteProvidersFeature } from './chatPasteProviders.js';
import { QuickChatService } from './chatQuick.js';
import { ChatResponseAccessibleView } from './chatResponseAccessibleView.js';
import { ChatSetupContribution } from './chatSetup.js';
import { ChatStatusBarEntry } from './chatStatus.js';
import { ChatVariablesService } from './chatVariables.js';
import { ChatWidgetService } from './chatWidget.js';
import { ChatCodeBlockContextProviderService } from './codeBlockContextProviderService.js';
import { ChatImplicitContextContribution } from './contrib/chatImplicitContext.js';
import './contrib/chatInputCompletions.js';
import './contrib/chatInputEditorContrib.js';
import './contrib/chatInputEditorHover.js';
import { ChatRelatedFilesContribution } from './contrib/chatInputRelatedFilesContrib.js';
import { LanguageModelToolsService } from './languageModelToolsService.js';
import './promptSyntax/contributions/createPromptCommand/createPromptCommand.js';
import './promptSyntax/contributions/usePromptCommand.js';
import { ChatViewsWelcomeHandler } from './viewsWelcome/chatViewsWelcomeHandler.js';
// Register configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'chatSidebar',
    title: nls.localize('interactiveSessionConfigurationTitle', "Chat"),
    type: 'object',
    properties: {
        'chat.editor.fontSize': {
            type: 'number',
            description: nls.localize('interactiveSession.editor.fontSize', "Controls the font size in pixels in chat codeblocks."),
            default: isMacintosh ? 12 : 14,
        },
        'chat.editor.fontFamily': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.fontFamily', "Controls the font family in chat codeblocks."),
            default: 'default'
        },
        'chat.editor.fontWeight': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.fontWeight', "Controls the font weight in chat codeblocks."),
            default: 'default'
        },
        'chat.editor.wordWrap': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.wordWrap', "Controls whether lines should wrap in chat codeblocks."),
            default: 'off',
            enum: ['on', 'off']
        },
        'chat.editor.lineHeight': {
            type: 'number',
            description: nls.localize('interactiveSession.editor.lineHeight', "Controls the line height in pixels in chat codeblocks. Use 0 to compute the line height from the font size."),
            default: 0
        },
        'chat.commandCenter.enabled': {
            type: 'boolean',
            markdownDescription: nls.localize('chat.commandCenter.enabled', "Controls whether the command center shows a menu for actions to control Copilot (requires {0}).", '`#window.commandCenter#`'),
            default: true
        },
        'chat.implicitContext.enabled': {
            type: 'object',
            tags: ['experimental'],
            description: nls.localize('chat.implicitContext.enabled.1', "Enables automatically using the active editor as chat context for specified chat locations."),
            additionalProperties: {
                type: 'string',
                enum: ['never', 'first', 'always'],
                description: nls.localize('chat.implicitContext.value', "The value for the implicit context."),
                enumDescriptions: [
                    nls.localize('chat.implicitContext.value.never', "Implicit context is never enabled."),
                    nls.localize('chat.implicitContext.value.first', "Implicit context is enabled for the first interaction."),
                    nls.localize('chat.implicitContext.value.always', "Implicit context is always enabled.")
                ]
            },
            default: {
                'panel': 'always',
                'editing-session': 'first'
            }
        },
        'chat.editing.autoAcceptDelay': {
            type: 'number',
            markdownDescription: nls.localize('chat.editing.autoAcceptDelay', "Delay after which changes made by chat are automatically accepted. Values are in seconds, `0` means disabled and `100` seconds is the maximum."),
            default: 0,
            minimum: 0,
            maximum: 100
        },
        'chat.editing.confirmEditRequestRemoval': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize('chat.editing.confirmEditRequestRemoval', "Whether to show a confirmation before removing a request and its associated edits."),
            default: true,
        },
        'chat.editing.confirmEditRequestRetry': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize('chat.editing.confirmEditRequestRetry', "Whether to show a confirmation before retrying a request and its associated edits."),
            default: true,
        },
        'chat.experimental.detectParticipant.enabled': {
            type: 'boolean',
            deprecationMessage: nls.localize('chat.experimental.detectParticipant.enabled.deprecated', "This setting is deprecated. Please use `chat.detectParticipant.enabled` instead."),
            description: nls.localize('chat.experimental.detectParticipant.enabled', "Enables chat participant autodetection for panel chat."),
            default: null
        },
        'chat.detectParticipant.enabled': {
            type: 'boolean',
            description: nls.localize('chat.detectParticipant.enabled', "Enables chat participant autodetection for panel chat."),
            default: true
        },
        'chat.renderRelatedFiles': {
            type: 'boolean',
            description: nls.localize('chat.renderRelatedFiles', "Controls whether related files should be rendered in the chat input."),
            default: false
        },
        'chat.setupFromDialog': {
            type: 'boolean',
            description: nls.localize('chat.setupFromChat', "Controls whether Copilot setup starts from a dialog or from the welcome view."),
            default: product.quality !== 'stable',
            tags: ['experimental', 'onExp']
        },
        'chat.focusWindowOnConfirmation': {
            type: 'boolean',
            description: nls.localize('chat.focusWindowOnConfirmation', "Controls whether the Copilot window should be focused when a confirmation is needed."),
            default: true,
        },
        'chat.tools.autoApprove': {
            default: false,
            description: nls.localize('chat.tools.autoApprove', "Controls whether tool use should be automatically approved ('YOLO mode')."),
            type: 'boolean',
            tags: ['experimental'],
            policy: {
                name: 'ChatToolsAutoApprove',
                minimumVersion: '1.99',
                previewFeature: true,
                defaultValue: false
            }
        },
        [mcpEnabledSection]: {
            type: 'boolean',
            description: nls.localize('chat.mcp.enabled', "Enables integration with Model Context Protocol servers to provide additional tools and functionality."),
            default: true,
            tags: ['preview'],
            policy: {
                name: 'ChatMCP',
                minimumVersion: '1.99',
                previewFeature: true,
                defaultValue: false
            }
        },
        [mcpConfigurationSection]: {
            type: 'object',
            default: {
                inputs: [],
                servers: mcpSchemaExampleServers,
            },
            description: nls.localize('workspaceConfig.mcp.description', "Model Context Protocol server configurations"),
            $ref: mcpSchemaId
        },
        [ChatConfiguration.UnifiedChatView]: {
            type: 'boolean',
            description: nls.localize('chat.unifiedChatView', "Enables the unified view with Ask, Edit, and Agent modes in one view."),
            default: true,
            tags: ['preview'],
        },
        [ChatConfiguration.UseFileStorage]: {
            type: 'boolean',
            description: nls.localize('chat.useFileStorage', "Enables storing chat sessions on disk instead of in the storage service. Enabling this does a one-time per-workspace migration of existing sessions to the new format."),
            default: true,
            tags: ['experimental'],
        },
        [ChatConfiguration.Edits2Enabled]: {
            type: 'boolean',
            description: nls.localize('chat.edits2Enabled', "Enable the new Edits mode that is based on tool-calling. When this is enabled, models that don't support tool-calling are unavailable for Edits mode."),
            default: true,
            tags: ['onExp'],
        },
        [ChatConfiguration.ExtensionToolsEnabled]: {
            type: 'boolean',
            description: nls.localize('chat.extensionToolsEnabled', "Enable using tools contributed by third-party extensions in Copilot Chat agent mode."),
            default: true,
            policy: {
                name: 'ChatAgentExtensionTools',
                minimumVersion: '1.99',
                description: nls.localize('chat.extensionToolsPolicy', "Enable using tools contributed by third-party extensions in Copilot Chat agent mode."),
                previewFeature: true,
                defaultValue: false
            }
        },
        [mcpDiscoverySection]: {
            oneOf: [
                { type: 'boolean' },
                {
                    type: 'object',
                    default: Object.fromEntries(allDiscoverySources.map(k => [k, true])),
                    properties: Object.fromEntries(allDiscoverySources.map(k => [
                        k,
                        { type: 'boolean', description: nls.localize('mcp.discovery.source', "Enables discovery of {0} servers", discoverySourceLabel[k]) }
                    ])),
                }
            ],
            default: true,
            markdownDescription: nls.localize('mpc.discovery.enabled', "Configures discovery of Model Context Protocol servers on the machine. It may be set to `true` or `false` to disable or enable all sources, and an mapping sources you wish to enable."),
        },
        [PromptsConfig.KEY]: {
            type: 'boolean',
            title: nls.localize('chat.reusablePrompts.config.enabled.title', "Prompt Files"),
            markdownDescription: nls.localize('chat.reusablePrompts.config.enabled.description', "Enable reusable prompt files (`*{0}`) in Chat, Edits, and Inline Chat sessions. [Learn More]({1}).", PROMPT_FILE_EXTENSION, DOCUMENTATION_URL),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            policy: {
                name: 'ChatPromptFiles',
                minimumVersion: '1.99',
                description: nls.localize('chat.promptFiles.policy', "Enables reusable prompt files in Chat, Edits, and Inline Chat sessions."),
                previewFeature: true,
                defaultValue: false
            }
        },
        [PromptsConfig.LOCATIONS_KEY]: {
            type: 'object',
            title: nls.localize('chat.reusablePrompts.config.locations.title', "Prompt File Locations"),
            markdownDescription: nls.localize('chat.reusablePrompts.config.locations.description', "Specify location(s) of reusable prompt files (`*{0}`) that can be attached in Chat, Edits, and Inline Chat sessions. [Learn More]({1}).\n\nRelative paths are resolved from the root folder(s) of your workspace.", PROMPT_FILE_EXTENSION, DOCUMENTATION_URL),
            default: {
                [PROMPT_FILES_DEFAULT_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            unevaluatedProperties: { type: 'boolean' },
            restricted: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [PROMPT_FILES_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [PROMPT_FILES_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/prompts': true,
                },
            ],
        },
    }
});
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ChatEditor, ChatEditorInput.EditorID, nls.localize('chat', "Chat")), [
    new SyncDescriptor(ChatEditorInput)
]);
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'chat.experimental.detectParticipant.enabled',
        migrateFn: (value, _accessor) => ([
            ['chat.experimental.detectParticipant.enabled', { value: undefined }],
            ['chat.detectParticipant.enabled', { value: value !== false }]
        ])
    }
]);
let ChatResolverContribution = class ChatResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatResolver'; }
    constructor(editorResolverService, instantiationService) {
        super();
        this._register(editorResolverService.registerEditor(`${Schemas.vscodeChatSesssion}:**/**`, {
            id: ChatEditorInput.EditorID,
            label: nls.localize('chat', "Chat"),
            priority: RegisteredEditorPriority.builtin
        }, {
            singlePerResource: true,
            canSupportResource: resource => resource.scheme === Schemas.vscodeChatSesssion
        }, {
            createEditorInput: ({ resource, options }) => {
                return { editor: instantiationService.createInstance(ChatEditorInput, resource, options), options };
            }
        }));
    }
};
ChatResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], ChatResolverContribution);
let ChatAgentSettingContribution = class ChatAgentSettingContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatAgentSetting'; }
    constructor(experimentService, productService, contextKeyService, entitlementService) {
        super();
        this.experimentService = experimentService;
        this.productService = productService;
        this.entitlementService = entitlementService;
        if (this.productService.quality !== 'stable') {
            this.registerEnablementSetting();
        }
        const expDisabledKey = ChatContextKeys.Editing.agentModeDisallowed.bindTo(contextKeyService);
        experimentService.getTreatment('chatAgentEnabled').then(enabled => {
            if (enabled || typeof enabled !== 'boolean') {
                // If enabled, or experiments not available, fall back to registering the setting
                this.registerEnablementSetting();
                expDisabledKey.set(false);
            }
            else {
                // If disabled, deregister the setting
                this.deregisterSetting();
                expDisabledKey.set(true);
            }
        });
        this.registerMaxRequestsSetting();
    }
    registerEnablementSetting() {
        if (this.registeredNode) {
            return;
        }
        this.registeredNode = configurationRegistry.registerConfiguration({
            id: 'chatAgent',
            title: nls.localize('interactiveSessionConfigurationTitle', "Chat"),
            type: 'object',
            properties: {
                [ChatConfiguration.AgentEnabled]: {
                    type: 'boolean',
                    description: nls.localize('chat.agent.enabled.description', "Enable agent mode for {0}. When this is enabled, a dropdown appears in the view to toggle agent mode.", 'Copilot Chat'),
                    default: this.productService.quality !== 'stable',
                    tags: ['onExp'],
                    policy: {
                        name: 'ChatAgentMode',
                        minimumVersion: '1.99',
                        previewFeature: false,
                        defaultValue: false
                    }
                },
            }
        });
    }
    deregisterSetting() {
        if (this.registeredNode) {
            configurationRegistry.deregisterConfigurations([this.registeredNode]);
            this.registeredNode = undefined;
        }
    }
    registerMaxRequestsSetting() {
        let lastNode;
        const registerMaxRequestsSetting = () => {
            const treatmentId = this.entitlementService.entitlement === ChatEntitlement.Limited ?
                'chatAgentMaxRequestsFree' :
                'chatAgentMaxRequestsPro';
            this.experimentService.getTreatment(treatmentId).then(value => {
                const defaultValue = value ?? (this.entitlementService.entitlement === ChatEntitlement.Limited ? 5 : 15);
                const node = {
                    id: 'chatSidebar',
                    title: nls.localize('interactiveSessionConfigurationTitle', "Chat"),
                    type: 'object',
                    properties: {
                        'chat.agent.maxRequests': {
                            type: 'number',
                            markdownDescription: nls.localize('chat.agent.maxRequests', "The maximum number of requests to allow Copilot Edits to use per-turn in agent mode. When the limit is reached, Copilot will ask the user to confirm that it should keep working. \n\n> **Note**: For users on the Copilot Free plan, note that each agent mode request currently uses one chat request."),
                            default: defaultValue,
                        },
                    }
                };
                configurationRegistry.updateConfigurations({ remove: lastNode ? [lastNode] : [], add: [node] });
                lastNode = node;
            });
        };
        this._register(Event.runAndSubscribe(Event.debounce(this.entitlementService.onDidChangeEntitlement, () => { }, 1000), () => registerMaxRequestsSetting()));
    }
};
ChatAgentSettingContribution = __decorate([
    __param(0, IWorkbenchAssignmentService),
    __param(1, IProductService),
    __param(2, IContextKeyService),
    __param(3, IChatEntitlementService)
], ChatAgentSettingContribution);
AccessibleViewRegistry.register(new ChatResponseAccessibleView());
AccessibleViewRegistry.register(new PanelChatAccessibilityHelp());
AccessibleViewRegistry.register(new QuickChatAccessibilityHelp());
AccessibleViewRegistry.register(new EditsChatAccessibilityHelp());
AccessibleViewRegistry.register(new AgentChatAccessibilityHelp());
registerEditorFeature(ChatInputBoxContentProvider);
let ChatSlashStaticSlashCommandsContribution = class ChatSlashStaticSlashCommandsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSlashStaticSlashCommands'; }
    constructor(slashCommandService, commandService, chatAgentService, chatVariablesService, instantiationService) {
        super();
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'clear',
            detail: nls.localize('clear', "Start a new chat"),
            sortText: 'z2_clear',
            executeImmediately: true,
            locations: [ChatAgentLocation.Panel]
        }, async () => {
            commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'help',
            detail: '',
            sortText: 'z1_help',
            executeImmediately: true,
            locations: [ChatAgentLocation.Panel],
            modes: [ChatMode.Ask]
        }, async (prompt, progress) => {
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
            const agents = chatAgentService.getAgents();
            // Report prefix
            if (defaultAgent?.metadata.helpTextPrefix) {
                if (isMarkdownString(defaultAgent.metadata.helpTextPrefix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextPrefix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPrefix), kind: 'markdownContent' });
                }
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
            }
            // Report agent list
            const agentText = (await Promise.all(agents
                .filter(a => a.id !== defaultAgent?.id && !a.isCore)
                .filter(a => a.locations.includes(ChatAgentLocation.Panel))
                .map(async (a) => {
                const description = a.description ? `- ${a.description}` : '';
                const agentMarkdown = instantiationService.invokeFunction(accessor => agentToMarkdown(a, true, accessor));
                const agentLine = `- ${agentMarkdown} ${description}`;
                const commandText = a.slashCommands.map(c => {
                    const description = c.description ? `- ${c.description}` : '';
                    return `\t* ${agentSlashCommandToMarkdown(a, c)} ${description}`;
                }).join('\n');
                return (agentLine + '\n' + commandText).trim();
            }))).join('\n');
            progress.report({ content: new MarkdownString(agentText, { isTrusted: { enabledCommands: [ChatSubmitAction.ID] } }), kind: 'markdownContent' });
            // Report variables
            if (defaultAgent?.metadata.helpTextVariablesPrefix) {
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
                if (isMarkdownString(defaultAgent.metadata.helpTextVariablesPrefix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextVariablesPrefix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextVariablesPrefix), kind: 'markdownContent' });
                }
                const variables = [
                    { name: 'file', description: nls.localize('file', "Choose a file in the workspace") }
                ];
                const variableText = variables
                    .map(v => `* \`${chatVariableLeader}${v.name}\` - ${v.description}`)
                    .join('\n');
                progress.report({ content: new MarkdownString('\n' + variableText), kind: 'markdownContent' });
            }
            // Report help text ending
            if (defaultAgent?.metadata.helpTextPostfix) {
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
                if (isMarkdownString(defaultAgent.metadata.helpTextPostfix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextPostfix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPostfix), kind: 'markdownContent' });
                }
            }
            // Without this, the response will be done before it renders and so it will not stream. This ensures that if the response starts
            // rendering during the next 200ms, then it will be streamed. Once it starts streaming, the whole response streams even after
            // it has received all response data has been received.
            await timeout(200);
        }));
    }
};
ChatSlashStaticSlashCommandsContribution = __decorate([
    __param(0, IChatSlashCommandService),
    __param(1, ICommandService),
    __param(2, IChatAgentService),
    __param(3, IChatVariablesService),
    __param(4, IInstantiationService)
], ChatSlashStaticSlashCommandsContribution);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ChatEditorInput.TypeID, ChatEditorInputSerializer);
registerWorkbenchContribution2(ChatResolverContribution.ID, ChatResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatSlashStaticSlashCommandsContribution.ID, ChatSlashStaticSlashCommandsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatExtensionPointHandler.ID, ChatExtensionPointHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(LanguageModelToolsExtensionPointHandler.ID, LanguageModelToolsExtensionPointHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatCompatibilityNotifier.ID, ChatCompatibilityNotifier, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(CopilotTitleBarMenuRendering.ID, CopilotTitleBarMenuRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(CodeBlockActionRendering.ID, CodeBlockActionRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatImplicitContextContribution.ID, ChatImplicitContextContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatRelatedFilesContribution.ID, ChatRelatedFilesContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatViewsWelcomeHandler.ID, ChatViewsWelcomeHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatGettingStartedContribution.ID, ChatGettingStartedContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatSetupContribution.ID, ChatSetupContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatStatusBarEntry.ID, ChatStatusBarEntry, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(BuiltinToolsContribution.ID, BuiltinToolsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatAgentSettingContribution.ID, ChatAgentSettingContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatEditingEditorAccessibility.ID, ChatEditingEditorAccessibility, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorOverlay.ID, ChatEditingEditorOverlay, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorContextKeys.ID, ChatEditingEditorContextKeys, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatTransferContribution.ID, ChatTransferContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerChatActions();
registerChatCopyActions();
registerChatCodeBlockActions();
registerChatCodeCompareBlockActions();
registerChatFileTreeActions();
registerChatTitleActions();
registerChatExecuteActions();
registerQuickChatActions();
registerChatExportActions();
registerMoveActions();
registerNewChatActions();
registerChatContextActions();
registerChatDeveloperActions();
registerChatEditorActions();
registerChatToolActions();
registerEditorFeature(ChatPasteProvidersFeature);
registerSingleton(IChatService, ChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetService, ChatWidgetService, 1 /* InstantiationType.Delayed */);
registerSingleton(IQuickChatService, QuickChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAccessibilityService, ChatAccessibilityService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetHistoryService, ChatWidgetHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelsService, LanguageModelsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelStatsService, LanguageModelStatsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatSlashCommandService, ChatSlashCommandService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentService, ChatAgentService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentNameService, ChatAgentNameService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatVariablesService, ChatVariablesService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelToolsService, LanguageModelToolsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IVoiceChatService, VoiceChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatCodeBlockContextProviderService, ChatCodeBlockContextProviderService, 1 /* InstantiationType.Delayed */);
registerSingleton(ICodeMapperService, CodeMapperService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatEditingService, ChatEditingService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatMarkdownAnchorService, ChatMarkdownAnchorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatEntitlementService, ChatEntitlementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IPromptsService, PromptsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatTransferService, ChatTransferService, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2(ChatEditingNotebookFileSystemProviderContrib.ID, ChatEditingNotebookFileSystemProviderContrib, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxVQUFVLElBQUksdUJBQXVCLEVBQWtFLE1BQU0sb0VBQW9FLENBQUM7QUFDM0wsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFB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