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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnRpY2lwYW50LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRQYXJ0aWNpcGFudC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxpRUFBaUU7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUseUVBQXlFO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsd0RBQXdEO0FBQ3hELHFGQUFxRjtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsdUZBQXVGO0FBQ3ZGLHNHQUFzRztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQXNCLE1BQU0sc0RBQXNELENBQUM7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxpRkFBaUY7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFD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