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
import { coalesce, isNonEmptyArray } from '../../../../base/common/arrays.js';
// import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
// import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
// import { URI } from '../../../../base/common/uri.js';
// import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize } from '../../../../nls.js';
// import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
// import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ILogService } from '../../../../platform/log/common/log.js';
// import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
// import { IViewsService } from '../../../services/views/common/viewsService.js';
import { showExtensionsWithIdsCommandId } from '../../extensions/browser/extensionsActions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
// import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation } from '../common/constants.js';
import { ChatViewId } from './chat.js';
// import { CHAT_EDITING_SIDEBAR_PANEL_ID, CHAT_SIDEBAR_PANEL_ID, ChatViewPane } from './chatViewPane.js';
// --- Chat Container &  View Registration
// Void commented this out
// const chatViewContainer: ViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
// 	id: CHAT_SIDEBAR_PANEL_ID,
// 	title: localize2('chat.viewContainer.label', "Chat"),
// 	icon: Codicon.commentDiscussion,
// 	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CHAT_SIDEBAR_PANEL_ID, { mergeViewWithContainerWhenSingleView: true }]),
// 	storageId: CHAT_SIDEBAR_PANEL_ID,
// 	hideIfEmpty: true,
// 	order: 100,
// }, ViewContainerLocation.AuxiliaryBar, { isDefault: true, doNotRegisterOpenCommand: true });
// const chatViewDescriptor: IViewDescriptor[] = [{
// 	id: ChatViewId,
// 	containerIcon: chatViewContainer.icon,
// 	containerTitle: chatViewContainer.title.value,
// 	singleViewPaneContainerTitle: chatViewContainer.title.value,
// 	name: localize2('chat.viewContainer.label', "Chat"),
// 	canToggleVisibility: false,
// 	canMoveView: true,
// 	openCommandActionDescriptor: {
// 		id: CHAT_SIDEBAR_PANEL_ID,
// 		title: chatViewContainer.title,
// 		mnemonicTitle: localize({ key: 'miToggleChat', comment: ['&& denotes a mnemonic'] }, "&&Chat"),
// 		keybindings: {
// 			primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KeyI,
// 			mac: {
// 				primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KeyI
// 			}
// 		},
// 		order: 1
// 	},
// 	ctorDescriptor: new SyncDescriptor(ChatViewPane, [{ location: ChatAgentLocation.Panel }]),
// 	when: ContextKeyExpr.or(
// 		ChatContextKeys.Setup.hidden.negate(),
// 		ChatContextKeys.Setup.installed,
// 		ChatContextKeys.panelParticipantRegistered,
// 		ChatContextKeys.extensionInvalid
// 	)
// }];
// Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews(chatViewDescriptor, chatViewContainer);
// --- Edits Container &  View Registration
// Void commented this out
// const editsViewContainer: ViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
// 	id: CHAT_EDITING_SIDEBAR_PANEL_ID,
// 	title: localize2('chatEditing.viewContainer.label', "Copilot Edits"),
// 	icon: Codicon.editSession,
// 	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CHAT_EDITING_SIDEBAR_PANEL_ID, { mergeViewWithContainerWhenSingleView: true }]),
// 	storageId: CHAT_EDITING_SIDEBAR_PANEL_ID,
// 	hideIfEmpty: true,
// 	order: 101,
// }, ViewContainerLocation.AuxiliaryBar, { doNotRegisterOpenCommand: true });
const chatParticipantExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatParticipants',
    jsonSchema: {
        description: localize('vscode.extension.contributes.chatParticipant', 'Contributes a chat participant'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { name: '', description: '' } }],
            required: ['name', 'id'],
            properties: {
                id: {
                    description: localize('chatParticipantId', "A unique id for this chat participant."),
                    type: 'string'
                },
                name: {
                    description: localize('chatParticipantName', "User-facing name for this chat participant. The user will use '@' with this name to invoke the participant. Name must not contain whitespace."),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                fullName: {
                    markdownDescription: localize('chatParticipantFullName', "The full name of this chat participant, which is shown as the label for responses coming from this participant. If not provided, {0} is used.", '`name`'),
                    type: 'string'
                },
                description: {
                    description: localize('chatParticipantDescription', "A description of this chat participant, shown in the UI."),
                    type: 'string'
                },
                isSticky: {
                    description: localize('chatCommandSticky', "Whether invoking the command puts the chat into a persistent mode, where the command is automatically added to the chat input for the next message."),
                    type: 'boolean'
                },
                sampleRequest: {
                    description: localize('chatSampleRequest', "When the user clicks this participant in `/help`, this text will be submitted to the participant."),
                    type: 'string'
                },
                when: {
                    description: localize('chatParticipantWhen', "A condition which must be true to enable this participant."),
                    type: 'string'
                },
                disambiguation: {
                    description: localize('chatParticipantDisambiguation', "Metadata to help with automatically routing user questions to this chat participant."),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { category: '', description: '', examples: [] } }],
                        required: ['category', 'description', 'examples'],
                        properties: {
                            category: {
                                markdownDescription: localize('chatParticipantDisambiguationCategory', "A detailed name for this category, e.g. `workspace_questions` or `web_questions`."),
                                type: 'string'
                            },
                            description: {
                                description: localize('chatParticipantDisambiguationDescription', "A detailed description of the kinds of questions that are suitable for this chat participant."),
                                type: 'string'
                            },
                            examples: {
                                description: localize('chatParticipantDisambiguationExamples', "A list of representative example questions that are suitable for this chat participant."),
                                type: 'array'
                            },
                        }
                    }
                },
                commands: {
                    markdownDescription: localize('chatCommandsDescription', "Commands available for this chat participant, which the user can invoke with a `/`."),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { name: '', description: '' } }],
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize('chatCommand', "A short name by which this command is referred to in the UI, e.g. `fix` or * `explain` for commands that fix an issue or explain code. The name should be unique among the commands provided by this participant."),
                                type: 'string'
                            },
                            description: {
                                description: localize('chatCommandDescription', "A description of this command."),
                                type: 'string'
                            },
                            when: {
                                description: localize('chatCommandWhen', "A condition which must be true to enable this command."),
                                type: 'string'
                            },
                            sampleRequest: {
                                description: localize('chatCommandSampleRequest', "When the user clicks this command in `/help`, this text will be submitted to the participant."),
                                type: 'string'
                            },
                            isSticky: {
                                description: localize('chatCommandSticky', "Whether invoking the command puts the chat into a persistent mode, where the command is automatically added to the chat input for the next message."),
                                type: 'boolean'
                            },
                            disambiguation: {
                                description: localize('chatCommandDisambiguation', "Metadata to help with automatically routing user questions to this chat command."),
                                type: 'array',
                                items: {
                                    additionalProperties: false,
                                    type: 'object',
                                    defaultSnippets: [{ body: { category: '', description: '', examples: [] } }],
                                    required: ['category', 'description', 'examples'],
                                    properties: {
                                        category: {
                                            markdownDescription: localize('chatCommandDisambiguationCategory', "A detailed name for this category, e.g. `workspace_questions` or `web_questions`."),
                                            type: 'string'
                                        },
                                        description: {
                                            description: localize('chatCommandDisambiguationDescription', "A detailed description of the kinds of questions that are suitable for this chat command."),
                                            type: 'string'
                                        },
                                        examples: {
                                            description: localize('chatCommandDisambiguationExamples', "A list of representative example questions that are suitable for this chat command."),
                                            type: 'array'
                                        },
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }
    },
    activationEventsGenerator: (contributions, result) => {
        for (const contrib of contributions) {
            result.push(`onChatParticipant:${contrib.id}`);
        }
    },
});
let ChatExtensionPointHandler = class ChatExtensionPointHandler {
    static { this.ID = 'workbench.contrib.chatExtensionPointHandler'; }
    constructor(_chatAgentService, logService) {
        this._chatAgentService = _chatAgentService;
        this.logService = logService;
        this._participantRegistrationDisposables = new DisposableMap();
        this.handleAndRegisterChatExtensions();
    }
    handleAndRegisterChatExtensions() {
        chatParticipantExtensionPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                for (const providerDescriptor of extension.value) {
                    if (!providerDescriptor.name?.match(/^[\w-]+$/)) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with invalid name: ${providerDescriptor.name}. Name must match /^[\\w-]+$/.`);
                        continue;
                    }
                    if (providerDescriptor.fullName && strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter(providerDescriptor.fullName)) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with fullName that contains ambiguous characters: ${providerDescriptor.fullName}.`);
                        continue;
                    }
                    // Spaces are allowed but considered "invisible"
                    if (providerDescriptor.fullName && strings.InvisibleCharacters.containsInvisibleCharacter(providerDescriptor.fullName.replace(/ /g, ''))) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with fullName that contains invisible characters: ${providerDescriptor.fullName}.`);
                        continue;
                    }
                    if ((providerDescriptor.isDefault || providerDescriptor.isAgent) && !isProposedApiEnabled(extension.description, 'defaultChatParticipant')) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT use API proposal: defaultChatParticipant.`);
                        continue;
                    }
                    if (providerDescriptor.locations && !isProposedApiEnabled(extension.description, 'chatParticipantAdditions')) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT use API proposal: chatParticipantAdditions.`);
                        continue;
                    }
                    if (!providerDescriptor.id || !providerDescriptor.name) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT register participant without both id and name.`);
                        continue;
                    }
                    const participantsDisambiguation = [];
                    if (providerDescriptor.disambiguation?.length) {
                        participantsDisambiguation.push(...providerDescriptor.disambiguation.map((d) => ({
                            ...d, category: d.category ?? d.categoryName
                        })));
                    }
                    try {
                        const store = new DisposableStore();
                        store.add(this._chatAgentService.registerAgent(providerDescriptor.id, {
                            extensionId: extension.description.identifier,
                            publisherDisplayName: extension.description.publisherDisplayName ?? extension.description.publisher, // May not be present in OSS
                            extensionPublisherId: extension.description.publisher,
                            extensionDisplayName: extension.description.displayName ?? extension.description.name,
                            id: providerDescriptor.id,
                            description: providerDescriptor.description,
                            when: providerDescriptor.when,
                            metadata: {
                                isSticky: providerDescriptor.isSticky,
                                sampleRequest: providerDescriptor.sampleRequest,
                            },
                            name: providerDescriptor.name,
                            fullName: providerDescriptor.fullName,
                            isDefault: providerDescriptor.isDefault,
                            isToolsAgent: providerDescriptor.isAgent,
                            locations: isNonEmptyArray(providerDescriptor.locations) ?
                                providerDescriptor.locations.map(ChatAgentLocation.fromRaw) :
                                [ChatAgentLocation.Panel],
                            slashCommands: providerDescriptor.commands ?? [],
                            disambiguation: coalesce(participantsDisambiguation.flat()),
                        }));
                        this._participantRegistrationDisposables.set(getParticipantKey(extension.description.identifier, providerDescriptor.id), store);
                    }
                    catch (e) {
                        this.logService.error(`Failed to register participant ${providerDescriptor.id}: ${toErrorMessage(e, true)}`);
                    }
                }
            }
            for (const extension of delta.removed) {
                for (const providerDescriptor of extension.value) {
                    this._participantRegistrationDisposables.deleteAndDispose(getParticipantKey(extension.description.identifier, providerDescriptor.id));
                }
            }
        });
    }
};
ChatExtensionPointHandler = __decorate([
    __param(0, IChatAgentService),
    __param(1, ILogService)
], ChatExtensionPointHandler);
export { ChatExtensionPointHandler };
function getParticipantKey(extensionId, participantName) {
    return `${extensionId.value}_${participantName}`;
}
let ChatCompatibilityNotifier = class ChatCompatibilityNotifier extends Disposable {
    static { this.ID = 'workbench.contrib.chatCompatNotifier'; }
    constructor(extensionsWorkbenchService, contextKeyService, productService) {
        super();
        this.productService = productService;
        this.registeredWelcomeView = false;
        // It may be better to have some generic UI for this, for any extension that is incompatible,
        // but this is only enabled for Copilot Chat now and it needs to be obvious.
        const isInvalid = ChatContextKeys.extensionInvalid.bindTo(contextKeyService);
        this._register(Event.runAndSubscribe(extensionsWorkbenchService.onDidChangeExtensionsNotification, () => {
            const notification = extensionsWorkbenchService.getExtensionsNotification();
            const chatExtension = notification?.extensions.find(ext => ExtensionIdentifier.equals(ext.identifier.id, this.productService.defaultChatAgent?.chatExtensionId));
            if (chatExtension) {
                isInvalid.set(true);
                this.registerWelcomeView(chatExtension);
            }
            else {
                isInvalid.set(false);
            }
        }));
    }
    registerWelcomeView(chatExtension) {
        if (this.registeredWelcomeView) {
            return;
        }
        this.registeredWelcomeView = true;
        const showExtensionLabel = localize('showExtension', "Show Extension");
        const mainMessage = localize('chatFailErrorMessage', "Chat failed to load because the installed version of the Copilot Chat extension is not compatible with this version of {0}. Please ensure that the Copilot Chat extension is up to date.", this.productService.nameLong);
        const commandButton = `[${showExtensionLabel}](command:${showExtensionsWithIdsCommandId}?${encodeURIComponent(JSON.stringify([[this.productService.defaultChatAgent?.chatExtensionId]]))})`;
        const versionMessage = `Copilot Chat version: ${chatExtension.version}`;
        const viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
        this._register(viewsRegistry.registerViewWelcomeContent(ChatViewId, {
            content: [mainMessage, commandButton, versionMessage].join('\n\n'),
            when: ChatContextKeys.extensionInvalid,
        }));
    }
};
ChatCompatibilityNotifier = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IContextKeyService),
    __param(2, IProductService)
], ChatCompatibilityNotifier);
export { ChatCompatibilityNotifier };
class ChatParticipantDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.chatParticipants;
    }
    render(manifest) {
        const nonDefaultContributions = manifest.contributes?.chatParticipants?.filter(c => !c.isDefault) ?? [];
        if (!nonDefaultContributions.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('participantName', "Name"),
            localize('participantFullName', "Full Name"),
            localize('participantDescription', "Description"),
            localize('participantCommands', "Commands"),
        ];
        const rows = nonDefaultContributions.map(d => {
            return [
                '@' + d.name,
                d.fullName,
                d.description ?? '-',
                d.commands?.length ? new MarkdownString(d.commands.map(c => `- /` + c.name).join('\n')) : '-'
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'chatParticipants',
    label: localize('chatParticipants', "Chat Participants"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ChatParticipantDataRenderer),
});
// Void commented this out
// // TODO@roblourens remove after a few months
// export class MovedChatEditsViewPane extends ViewPane {
// 	override shouldShowWelcome(): boolean {
// 		return true;
// 	}
// }
// const editsViewId = 'workbench.panel.chat.view.edits';
// const baseEditsViewDescriptor: IViewDescriptor = {
// 	id: editsViewId,
// 	containerIcon: editsViewContainer.icon,
// 	containerTitle: editsViewContainer.title.value,
// 	singleViewPaneContainerTitle: editsViewContainer.title.value,
// 	name: editsViewContainer.title,
// 	canToggleVisibility: false,
// 	canMoveView: true,
// 	openCommandActionDescriptor: {
// 		id: CHAT_EDITING_SIDEBAR_PANEL_ID,
// 		title: editsViewContainer.title,
// 		mnemonicTitle: localize({ key: 'miToggleEdits', comment: ['&& denotes a mnemonic'] }, "Copilot Ed&&its"),
// 		keybindings: {
// 			primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyI,
// 			linux: {
// 				primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.KeyI
// 			}
// 		},
// 		order: 2
// 	},
// 	ctorDescriptor: new SyncDescriptor(ChatViewPane, [{ location: ChatAgentLocation.EditingSession }]),
// 	when: ContextKeyExpr.and(
// 		ContextKeyExpr.has(`config.${ChatConfiguration.UnifiedChatView}`).negate(),
// 		ContextKeyExpr.or(
// 			ChatContextKeys.Setup.hidden.negate(),
// 			ChatContextKeys.Setup.installed,
// 			ChatContextKeys.editingParticipantRegistered
// 		)
// 	)
// };
// const ShowMovedChatEditsView = new RawContextKey<boolean>('showMovedChatEditsView', true, { type: 'boolean', description: localize('hideMovedChatEditsView', "True when the moved chat edits view should be hidden.") });
// class EditsViewContribution extends Disposable implements IWorkbenchContribution {
// 	static readonly ID = 'workbench.contrib.chatEditsView';
// 	private static readonly HideMovedEditsViewKey = 'chatEditsView.hideMovedEditsView';
// 	private readonly showWelcomeViewCtx: IContextKey<boolean>;
// 	constructor(
// 		@IConfigurationService private readonly configurationService: IConfigurationService,
// 		@IStorageService private readonly storageService: IStorageService,
// 		@IContextKeyService private readonly contextKeyService: IContextKeyService,
// 		@IChatService private readonly chatService: IChatService,
// 	) {
// 		super();
// 		this.showWelcomeViewCtx = ShowMovedChatEditsView.bindTo(this.contextKeyService);
// 		const unifiedViewEnabled = this.configurationService.getValue(ChatConfiguration.UnifiedChatView);
// 		const movedEditsViewDescriptor = {
// 			...baseEditsViewDescriptor,
// 			ctorDescriptor: new SyncDescriptor(MovedChatEditsViewPane),
// 			when: ContextKeyExpr.and(
// 				ContextKeyExpr.has(`config.${ChatConfiguration.UnifiedChatView}`),
// 				ShowMovedChatEditsView,
// 				ContextKeyExpr.or(
// 					ChatContextKeys.Setup.hidden.negate(),
// 					ChatContextKeys.Setup.installed,
// 					ChatContextKeys.editingParticipantRegistered
// 				)
// 			)
// 		};
// 		const editsViewToRegister = unifiedViewEnabled ?
// 			movedEditsViewDescriptor : baseEditsViewDescriptor;
// 		if (unifiedViewEnabled) {
// 			this.init();
// 			this.updateContextKey();
// 			this.registerWelcomeView();
// 			this.registerCommands();
// 		}
// 		Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([editsViewToRegister], editsViewContainer);
// 	}
// 	private registerWelcomeView(): void {
// 		const welcomeViewMainMessage = localize('editsMovedMainMessage', "Copilot Edits has been moved to the [main Chat view](command:workbench.action.chat.open). You can switch between modes by using the dropdown in the Chat input box.");
// 		const okButton = `[${localize('ok', "Got it")}](command:_movedEditsView.ok)`;
// 		const welcomeViewFooterMessage = localize('editsMovedFooterMessage', "[Learn more](command:_movedEditsView.learnMore) about the Chat view.");
// 		const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
// 		this._register(viewsRegistry.registerViewWelcomeContent(editsViewId, {
// 			content: [welcomeViewMainMessage, okButton, welcomeViewFooterMessage].join('\n\n'),
// 			renderSecondaryButtons: true,
// 			when: ShowMovedChatEditsView
// 		}));
// 	}
// 	private markViewToHide(): void {
// 		this.storageService.store(EditsViewContribution.HideMovedEditsViewKey, true, StorageScope.APPLICATION, StorageTarget.USER);
// 		this.updateContextKey();
// 	}
// 	private init() {
// 		const hasChats = this.chatService.hasSessions();
// 		if (!hasChats) {
// 			// No chats from previous sessions, might be a new user, so hide the view.
// 			// Could also be a previous user who happened to first open a workspace with no chats.
// 			this.markViewToHide();
// 		}
// 	}
// 	private updateContextKey(): void {
// 		const hidden = this.storageService.getBoolean(EditsViewContribution.HideMovedEditsViewKey, StorageScope.APPLICATION, false);
// 		const hasChats = this.chatService.hasSessions();
// 		this.showWelcomeViewCtx.set(!hidden && hasChats);
// 	}
// 	private registerCommands(): void {
// 		this._register(CommandsRegistry.registerCommand({
// 			id: '_movedEditsView.ok',
// 			handler: async (accessor: ServicesAccessor) => {
// 				showChatView(accessor.get(IViewsService));
// 				this.markViewToHide();
// 			}
// 		}));
// 		this._register(CommandsRegistry.registerCommand({
// 			id: '_movedEditsView.learnMore',
// 			handler: async (accessor: ServicesAccessor) => {
// 				const openerService = accessor.get(IOpenerService);
// 				openerService.open(URI.parse('https://aka.ms/vscode-chat-modes'));
// 			}
// 		}));
// 	}
// }
// registerWorkbenchContribution2(EditsViewContribution.ID, EditsViewContribution, WorkbenchPhase.BlockRestore);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnRpY2lwYW50LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0UGFydGljaXBhbnQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsaUVBQWlFO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLHlFQUF5RTtBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELHdEQUF3RDtBQUN4RCxxRkFBcUY7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLHVGQUF1RjtBQUN2RixzR0FBc0c7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFzQixNQUFNLHNEQUFzRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsaUZBQWlGO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4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