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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnRpY2lwYW50LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFBhcnRpY2lwYW50LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLGlFQUFpRTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSx5RUFBeUU7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCx3REFBd0Q7QUFDeEQscUZBQXFGO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5Qyx1RkFBdUY7QUFDdkYsc0dBQXNHO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBc0IsTUFBTSxzREFBc0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLGlGQUFpRjtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFD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