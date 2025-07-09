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
var CommandsQuickAccessProvider_1;
import { isFirefox } from '../../../../base/browser/browser.js';
import { raceTimeout, timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Language } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { AbstractEditorCommandsQuickAccessProvider } from '../../../../editor/contrib/quickAccess/browser/commandsQuickAccess.js';
import { localize, localize2 } from '../../../../nls.js';
import { isLocalizedString } from '../../../../platform/action/common/action.js';
import { Action2, IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { CommandsHistory } from '../../../../platform/quickinput/browser/commandsQuickAccess.js';
import { TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { DefaultQuickAccessFilterValue } from '../../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CHAT_OPEN_ACTION_ID } from '../../chat/browser/actions/chatActions.js';
import { ASK_QUICK_QUESTION_ACTION_ID } from '../../chat/browser/actions/chatQuickInputActions.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import { IAiRelatedInformationService, RelatedInformationType } from '../../../services/aiRelatedInformation/common/aiRelatedInformation.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { createKeybindingCommandQuery } from '../../../services/preferences/browser/keybindingsEditorModel.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
let CommandsQuickAccessProvider = class CommandsQuickAccessProvider extends AbstractEditorCommandsQuickAccessProvider {
    static { CommandsQuickAccessProvider_1 = this; }
    static { this.AI_RELATED_INFORMATION_MAX_PICKS = 5; }
    static { this.AI_RELATED_INFORMATION_DEBOUNCE = 200; }
    get activeTextEditorControl() { return this.editorService.activeTextEditorControl; }
    get defaultFilterValue() {
        if (this.configuration.preserveInput) {
            return DefaultQuickAccessFilterValue.LAST;
        }
        return undefined;
    }
    constructor(editorService, menuService, extensionService, instantiationService, keybindingService, commandService, telemetryService, dialogService, configurationService, editorGroupService, preferencesService, productService, aiRelatedInformationService, chatAgentService) {
        super({
            showAlias: !Language.isDefaultVariant(),
            noResultsPick: () => ({
                label: localize('noCommandResults', "No matching commands"),
                commandId: ''
            }),
        }, instantiationService, keybindingService, commandService, telemetryService, dialogService);
        this.editorService = editorService;
        this.menuService = menuService;
        this.extensionService = extensionService;
        this.configurationService = configurationService;
        this.editorGroupService = editorGroupService;
        this.preferencesService = preferencesService;
        this.productService = productService;
        this.aiRelatedInformationService = aiRelatedInformationService;
        this.chatAgentService = chatAgentService;
        // If extensions are not yet registered, we wait for a little moment to give them
        // a chance to register so that the complete set of commands shows up as result
        // We do not want to delay functionality beyond that time though to keep the commands
        // functional.
        this.extensionRegistrationRace = raceTimeout(this.extensionService.whenInstalledExtensionsRegistered(), 800);
        this.useAiRelatedInfo = false;
        this._register(configurationService.onDidChangeConfiguration((e) => this.updateOptions(e)));
        this.updateOptions();
    }
    get configuration() {
        const commandPaletteConfig = this.configurationService.getValue().workbench.commandPalette;
        return {
            preserveInput: commandPaletteConfig.preserveInput,
            experimental: commandPaletteConfig.experimental
        };
    }
    updateOptions(e) {
        if (e && !e.affectsConfiguration('workbench.commandPalette.experimental')) {
            return;
        }
        const config = this.configuration;
        const suggestedCommandIds = config.experimental.suggestCommands && this.productService.commandPaletteSuggestedCommandIds?.length
            ? new Set(this.productService.commandPaletteSuggestedCommandIds)
            : undefined;
        this.options.suggestedCommandIds = suggestedCommandIds;
        this.useAiRelatedInfo = config.experimental.enableNaturalLanguageSearch;
    }
    async getCommandPicks(token) {
        // wait for extensions registration or 800ms once
        await this.extensionRegistrationRace;
        if (token.isCancellationRequested) {
            return [];
        }
        return [
            ...this.getCodeEditorCommandPicks(),
            ...this.getGlobalCommandPicks()
        ].map(picks => ({
            ...picks,
            buttons: [{
                    iconClass: ThemeIcon.asClassName(Codicon.gear),
                    tooltip: localize('configure keybinding', "Configure Keybinding"),
                }],
            trigger: () => {
                this.preferencesService.openGlobalKeybindingSettings(false, { query: createKeybindingCommandQuery(picks.commandId, picks.commandWhen) });
                return TriggerAction.CLOSE_PICKER;
            },
        }));
    }
    hasAdditionalCommandPicks(filter, token) {
        if (!this.useAiRelatedInfo
            || token.isCancellationRequested
            || filter === ''
            || !this.aiRelatedInformationService.isEnabled()) {
            return false;
        }
        return true;
    }
    async getAdditionalCommandPicks(allPicks, picksSoFar, filter, token) {
        if (!this.hasAdditionalCommandPicks(filter, token)) {
            return [];
        }
        let additionalPicks;
        try {
            // Wait a bit to see if the user is still typing
            await timeout(CommandsQuickAccessProvider_1.AI_RELATED_INFORMATION_DEBOUNCE, token);
            additionalPicks = await this.getRelatedInformationPicks(allPicks, picksSoFar, filter, token);
        }
        catch (e) {
            return [];
        }
        if (picksSoFar.length || additionalPicks.length) {
            additionalPicks.push({
                type: 'separator'
            });
        }
        const defaultAgent = this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
        if (defaultAgent) {
            additionalPicks.push({
                label: localize('askXInChat', "Ask {0}: {1}", defaultAgent.fullName, filter),
                commandId: this.configuration.experimental.askChatLocation === 'quickChat' ? ASK_QUICK_QUESTION_ACTION_ID : CHAT_OPEN_ACTION_ID,
                args: [filter]
            });
        }
        return additionalPicks;
    }
    async getRelatedInformationPicks(allPicks, picksSoFar, filter, token) {
        const relatedInformation = await this.aiRelatedInformationService.getRelatedInformation(filter, [RelatedInformationType.CommandInformation], token);
        // Sort by weight descending to get the most relevant results first
        relatedInformation.sort((a, b) => b.weight - a.weight);
        const setOfPicksSoFar = new Set(picksSoFar.map(p => p.commandId));
        const additionalPicks = new Array();
        for (const info of relatedInformation) {
            if (additionalPicks.length === CommandsQuickAccessProvider_1.AI_RELATED_INFORMATION_MAX_PICKS) {
                break;
            }
            const pick = allPicks.find(p => p.commandId === info.command && !setOfPicksSoFar.has(p.commandId));
            if (pick) {
                additionalPicks.push(pick);
            }
        }
        return additionalPicks;
    }
    getGlobalCommandPicks() {
        const globalCommandPicks = [];
        const scopedContextKeyService = this.editorService.activeEditorPane?.scopedContextKeyService || this.editorGroupService.activeGroup.scopedContextKeyService;
        const globalCommandsMenu = this.menuService.getMenuActions(MenuId.CommandPalette, scopedContextKeyService);
        const globalCommandsMenuActions = globalCommandsMenu
            .reduce((r, [, actions]) => [...r, ...actions], [])
            .filter(action => action instanceof MenuItemAction && action.enabled);
        for (const action of globalCommandsMenuActions) {
            // Label
            let label = (typeof action.item.title === 'string' ? action.item.title : action.item.title.value) || action.item.id;
            // Category
            const category = typeof action.item.category === 'string' ? action.item.category : action.item.category?.value;
            if (category) {
                label = localize('commandWithCategory', "{0}: {1}", category, label);
            }
            // Alias
            const aliasLabel = typeof action.item.title !== 'string' ? action.item.title.original : undefined;
            const aliasCategory = (category && action.item.category && typeof action.item.category !== 'string') ? action.item.category.original : undefined;
            const commandAlias = (aliasLabel && category) ?
                aliasCategory ? `${aliasCategory}: ${aliasLabel}` : `${category}: ${aliasLabel}` :
                aliasLabel;
            const metadataDescription = action.item.metadata?.description;
            const commandDescription = metadataDescription === undefined || isLocalizedString(metadataDescription)
                ? metadataDescription
                // TODO: this type will eventually not be a string and when that happens, this should simplified.
                : { value: metadataDescription, original: metadataDescription };
            globalCommandPicks.push({
                commandId: action.item.id,
                commandWhen: action.item.precondition?.serialize(),
                commandAlias,
                label: stripIcons(label),
                commandDescription,
            });
        }
        return globalCommandPicks;
    }
};
CommandsQuickAccessProvider = CommandsQuickAccessProvider_1 = __decorate([
    __param(0, IEditorService),
    __param(1, IMenuService),
    __param(2, IExtensionService),
    __param(3, IInstantiationService),
    __param(4, IKeybindingService),
    __param(5, ICommandService),
    __param(6, ITelemetryService),
    __param(7, IDialogService),
    __param(8, IConfigurationService),
    __param(9, IEditorGroupsService),
    __param(10, IPreferencesService),
    __param(11, IProductService),
    __param(12, IAiRelatedInformationService),
    __param(13, IChatAgentService)
], CommandsQuickAccessProvider);
export { CommandsQuickAccessProvider };
//#region Actions
export class ShowAllCommandsAction extends Action2 {
    static { this.ID = 'workbench.action.showCommands'; }
    constructor() {
        super({
            id: ShowAllCommandsAction.ID,
            title: localize2('showTriggerActions', 'Show All Commands'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: undefined,
                primary: !isFirefox ? (2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 46 /* KeyCode.KeyP */) : undefined,
                secondary: [59 /* KeyCode.F1 */]
            },
            f1: true
        });
    }
    async run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(CommandsQuickAccessProvider.PREFIX);
    }
}
export class ClearCommandHistoryAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.clearCommandHistory',
            title: localize2('clearCommandHistory', 'Clear Command History'),
            f1: true
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const storageService = accessor.get(IStorageService);
        const dialogService = accessor.get(IDialogService);
        const commandHistoryLength = CommandsHistory.getConfiguredCommandHistoryLength(configurationService);
        if (commandHistoryLength > 0) {
            // Ask for confirmation
            const { confirmed } = await dialogService.confirm({
                type: 'warning',
                message: localize('confirmClearMessage', "Do you want to clear the history of recently used commands?"),
                detail: localize('confirmClearDetail', "This action is irreversible!"),
                primaryButton: localize({ key: 'clearButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Clear")
            });
            if (!confirmed) {
                return;
            }
            CommandsHistory.clearHistory(configurationService, storageService);
        }
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9xdWlja2FjY2Vzcy9icm93c2VyL2NvbW1hbmRzUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUseUNBQXlDLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUNsSSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQXFCLE1BQU0sZ0RBQWdELENBQUM7QUFDbEksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBNkIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM5SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFN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