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
var AbstractCommandsQuickAccessProvider_1, CommandsHistory_1;
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { matchesContiguousSubString, matchesPrefix, matchesWords, or } from '../../../base/common/filters.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { LRUCache } from '../../../base/common/map.js';
import { TfIdfCalculator, normalizeTfIdfScores } from '../../../base/common/tfIdf.js';
import { localize } from '../../../nls.js';
import { ICommandService } from '../../commands/common/commands.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ILogService } from '../../log/common/log.js';
import { PickerQuickAccessProvider } from './pickerQuickAccess.js';
import { IStorageService, WillSaveStateReason } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
let AbstractCommandsQuickAccessProvider = class AbstractCommandsQuickAccessProvider extends PickerQuickAccessProvider {
    static { AbstractCommandsQuickAccessProvider_1 = this; }
    static { this.PREFIX = '>'; }
    static { this.TFIDF_THRESHOLD = 0.5; }
    static { this.TFIDF_MAX_RESULTS = 5; }
    static { this.WORD_FILTER = or(matchesPrefix, matchesWords, matchesContiguousSubString); }
    constructor(options, instantiationService, keybindingService, commandService, telemetryService, dialogService) {
        super(AbstractCommandsQuickAccessProvider_1.PREFIX, options);
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.dialogService = dialogService;
        this.commandsHistory = this._register(this.instantiationService.createInstance(CommandsHistory));
        this.options = options;
    }
    async _getPicks(filter, _disposables, token, runOptions) {
        // Ask subclass for all command picks
        const allCommandPicks = await this.getCommandPicks(token);
        if (token.isCancellationRequested) {
            return [];
        }
        const runTfidf = createSingleCallFunction(() => {
            const tfidf = new TfIdfCalculator();
            tfidf.updateDocuments(allCommandPicks.map(commandPick => ({
                key: commandPick.commandId,
                textChunks: [this.getTfIdfChunk(commandPick)]
            })));
            const result = tfidf.calculateScores(filter, token);
            return normalizeTfIdfScores(result)
                .filter(score => score.score > AbstractCommandsQuickAccessProvider_1.TFIDF_THRESHOLD)
                .slice(0, AbstractCommandsQuickAccessProvider_1.TFIDF_MAX_RESULTS);
        });
        // Filter
        const filteredCommandPicks = [];
        for (const commandPick of allCommandPicks) {
            const labelHighlights = AbstractCommandsQuickAccessProvider_1.WORD_FILTER(filter, commandPick.label) ?? undefined;
            const aliasHighlights = commandPick.commandAlias ? AbstractCommandsQuickAccessProvider_1.WORD_FILTER(filter, commandPick.commandAlias) ?? undefined : undefined;
            // Add if matching in label or alias
            if (labelHighlights || aliasHighlights) {
                commandPick.highlights = {
                    label: labelHighlights,
                    detail: this.options.showAlias ? aliasHighlights : undefined
                };
                filteredCommandPicks.push(commandPick);
            }
            // Also add if we have a 100% command ID match
            else if (filter === commandPick.commandId) {
                filteredCommandPicks.push(commandPick);
            }
            // Handle tf-idf scoring for the rest if there's a filter
            else if (filter.length >= 3) {
                const tfidf = runTfidf();
                if (token.isCancellationRequested) {
                    return [];
                }
                // Add if we have a tf-idf score
                const tfidfScore = tfidf.find(score => score.key === commandPick.commandId);
                if (tfidfScore) {
                    commandPick.tfIdfScore = tfidfScore.score;
                    filteredCommandPicks.push(commandPick);
                }
            }
        }
        // Add description to commands that have duplicate labels
        const mapLabelToCommand = new Map();
        for (const commandPick of filteredCommandPicks) {
            const existingCommandForLabel = mapLabelToCommand.get(commandPick.label);
            if (existingCommandForLabel) {
                commandPick.description = commandPick.commandId;
                existingCommandForLabel.description = existingCommandForLabel.commandId;
            }
            else {
                mapLabelToCommand.set(commandPick.label, commandPick);
            }
        }
        // Sort by MRU order and fallback to name otherwise
        filteredCommandPicks.sort((commandPickA, commandPickB) => {
            // If a result came from tf-idf, we want to put that towards the bottom
            if (commandPickA.tfIdfScore && commandPickB.tfIdfScore) {
                if (commandPickA.tfIdfScore === commandPickB.tfIdfScore) {
                    return commandPickA.label.localeCompare(commandPickB.label); // prefer lexicographically smaller command
                }
                return commandPickB.tfIdfScore - commandPickA.tfIdfScore; // prefer higher tf-idf score
            }
            else if (commandPickA.tfIdfScore) {
                return 1; // first command has a score but other doesn't so other wins
            }
            else if (commandPickB.tfIdfScore) {
                return -1; // other command has a score but first doesn't so first wins
            }
            const commandACounter = this.commandsHistory.peek(commandPickA.commandId);
            const commandBCounter = this.commandsHistory.peek(commandPickB.commandId);
            if (commandACounter && commandBCounter) {
                return commandACounter > commandBCounter ? -1 : 1; // use more recently used command before older
            }
            if (commandACounter) {
                return -1; // first command was used, so it wins over the non used one
            }
            if (commandBCounter) {
                return 1; // other command was used so it wins over the command
            }
            if (this.options.suggestedCommandIds) {
                const commandASuggestion = this.options.suggestedCommandIds.has(commandPickA.commandId);
                const commandBSuggestion = this.options.suggestedCommandIds.has(commandPickB.commandId);
                if (commandASuggestion && commandBSuggestion) {
                    return 0; // honor the order of the array
                }
                if (commandASuggestion) {
                    return -1; // first command was suggested, so it wins over the non suggested one
                }
                if (commandBSuggestion) {
                    return 1; // other command was suggested so it wins over the command
                }
            }
            // both commands were never used, so we sort by name
            return commandPickA.label.localeCompare(commandPickB.label);
        });
        const commandPicks = [];
        let addOtherSeparator = false;
        let addSuggestedSeparator = true;
        let addCommonlyUsedSeparator = !!this.options.suggestedCommandIds;
        for (let i = 0; i < filteredCommandPicks.length; i++) {
            const commandPick = filteredCommandPicks[i];
            // Separator: recently used
            if (i === 0 && this.commandsHistory.peek(commandPick.commandId)) {
                commandPicks.push({ type: 'separator', label: localize('recentlyUsed', "recently used") });
                addOtherSeparator = true;
            }
            if (addSuggestedSeparator && commandPick.tfIdfScore !== undefined) {
                commandPicks.push({ type: 'separator', label: localize('suggested', "similar commands") });
                addSuggestedSeparator = false;
            }
            // Separator: commonly used
            if (addCommonlyUsedSeparator && commandPick.tfIdfScore === undefined && !this.commandsHistory.peek(commandPick.commandId) && this.options.suggestedCommandIds?.has(commandPick.commandId)) {
                commandPicks.push({ type: 'separator', label: localize('commonlyUsed', "commonly used") });
                addOtherSeparator = true;
                addCommonlyUsedSeparator = false;
            }
            // Separator: other commands
            if (addOtherSeparator && commandPick.tfIdfScore === undefined && !this.commandsHistory.peek(commandPick.commandId) && !this.options.suggestedCommandIds?.has(commandPick.commandId)) {
                commandPicks.push({ type: 'separator', label: localize('morecCommands', "other commands") });
                addOtherSeparator = false;
            }
            // Command
            commandPicks.push(this.toCommandPick(commandPick, runOptions));
        }
        if (!this.hasAdditionalCommandPicks(filter, token)) {
            return commandPicks;
        }
        return {
            picks: commandPicks,
            additionalPicks: (async () => {
                const additionalCommandPicks = await this.getAdditionalCommandPicks(allCommandPicks, filteredCommandPicks, filter, token);
                if (token.isCancellationRequested) {
                    return [];
                }
                const commandPicks = additionalCommandPicks.map(commandPick => this.toCommandPick(commandPick, runOptions));
                // Basically, if we haven't already added a separator, we add one before the additional picks so long
                // as one hasn't been added to the start of the array.
                if (addSuggestedSeparator && commandPicks[0]?.type !== 'separator') {
                    commandPicks.unshift({ type: 'separator', label: localize('suggested', "similar commands") });
                }
                return commandPicks;
            })()
        };
    }
    toCommandPick(commandPick, runOptions) {
        if (commandPick.type === 'separator') {
            return commandPick;
        }
        const keybinding = this.keybindingService.lookupKeybinding(commandPick.commandId);
        const ariaLabel = keybinding ?
            localize('commandPickAriaLabelWithKeybinding', "{0}, {1}", commandPick.label, keybinding.getAriaLabel()) :
            commandPick.label;
        return {
            ...commandPick,
            ariaLabel,
            detail: this.options.showAlias && commandPick.commandAlias !== commandPick.label ? commandPick.commandAlias : undefined,
            keybinding,
            accept: async () => {
                // Add to history
                this.commandsHistory.push(commandPick.commandId);
                // Telementry
                this.telemetryService.publicLog2('workbenchActionExecuted', {
                    id: commandPick.commandId,
                    from: runOptions?.from ?? 'quick open'
                });
                // Run
                try {
                    commandPick.args?.length
                        ? await this.commandService.executeCommand(commandPick.commandId, ...commandPick.args)
                        : await this.commandService.executeCommand(commandPick.commandId);
                }
                catch (error) {
                    if (!isCancellationError(error)) {
                        this.dialogService.error(localize('canNotRun', "Command '{0}' resulted in an error", commandPick.label), toErrorMessage(error));
                    }
                }
            }
        };
    }
    // TF-IDF string to be indexed
    getTfIdfChunk({ label, commandAlias, commandDescription }) {
        let chunk = label;
        if (commandAlias && commandAlias !== label) {
            chunk += ` - ${commandAlias}`;
        }
        if (commandDescription && commandDescription.value !== label) {
            // If the original is the same as the value, don't add it
            chunk += ` - ${commandDescription.value === commandDescription.original ? commandDescription.value : `${commandDescription.value} (${commandDescription.original})`}`;
        }
        return chunk;
    }
};
AbstractCommandsQuickAccessProvider = AbstractCommandsQuickAccessProvider_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService),
    __param(3, ICommandService),
    __param(4, ITelemetryService),
    __param(5, IDialogService)
], AbstractCommandsQuickAccessProvider);
export { AbstractCommandsQuickAccessProvider };
let CommandsHistory = class CommandsHistory extends Disposable {
    static { CommandsHistory_1 = this; }
    static { this.DEFAULT_COMMANDS_HISTORY_LENGTH = 50; }
    static { this.PREF_KEY_CACHE = 'commandPalette.mru.cache'; }
    static { this.PREF_KEY_COUNTER = 'commandPalette.mru.counter'; }
    static { this.counter = 1; }
    static { this.hasChanges = false; }
    constructor(storageService, configurationService, logService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.logService = logService;
        this.configuredCommandsHistoryLength = 0;
        this.updateConfiguration();
        this.load();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => this.updateConfiguration(e)));
        this._register(this.storageService.onWillSaveState(e => {
            if (e.reason === WillSaveStateReason.SHUTDOWN) {
                // Commands history is very dynamic and so we limit impact
                // on storage to only save on shutdown. This helps reduce
                // the overhead of syncing this data across machines.
                this.saveState();
            }
        }));
    }
    updateConfiguration(e) {
        if (e && !e.affectsConfiguration('workbench.commandPalette.history')) {
            return;
        }
        this.configuredCommandsHistoryLength = CommandsHistory_1.getConfiguredCommandHistoryLength(this.configurationService);
        if (CommandsHistory_1.cache && CommandsHistory_1.cache.limit !== this.configuredCommandsHistoryLength) {
            CommandsHistory_1.cache.limit = this.configuredCommandsHistoryLength;
            CommandsHistory_1.hasChanges = true;
        }
    }
    load() {
        const raw = this.storageService.get(CommandsHistory_1.PREF_KEY_CACHE, 0 /* StorageScope.PROFILE */);
        let serializedCache;
        if (raw) {
            try {
                serializedCache = JSON.parse(raw);
            }
            catch (error) {
                this.logService.error(`[CommandsHistory] invalid data: ${error}`);
            }
        }
        const cache = CommandsHistory_1.cache = new LRUCache(this.configuredCommandsHistoryLength, 1);
        if (serializedCache) {
            let entries;
            if (serializedCache.usesLRU) {
                entries = serializedCache.entries;
            }
            else {
                entries = serializedCache.entries.sort((a, b) => a.value - b.value);
            }
            entries.forEach(entry => cache.set(entry.key, entry.value));
        }
        CommandsHistory_1.counter = this.storageService.getNumber(CommandsHistory_1.PREF_KEY_COUNTER, 0 /* StorageScope.PROFILE */, CommandsHistory_1.counter);
    }
    push(commandId) {
        if (!CommandsHistory_1.cache) {
            return;
        }
        CommandsHistory_1.cache.set(commandId, CommandsHistory_1.counter++); // set counter to command
        CommandsHistory_1.hasChanges = true;
    }
    peek(commandId) {
        return CommandsHistory_1.cache?.peek(commandId);
    }
    saveState() {
        if (!CommandsHistory_1.cache) {
            return;
        }
        if (!CommandsHistory_1.hasChanges) {
            return;
        }
        const serializedCache = { usesLRU: true, entries: [] };
        CommandsHistory_1.cache.forEach((value, key) => serializedCache.entries.push({ key, value }));
        this.storageService.store(CommandsHistory_1.PREF_KEY_CACHE, JSON.stringify(serializedCache), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.storageService.store(CommandsHistory_1.PREF_KEY_COUNTER, CommandsHistory_1.counter, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        CommandsHistory_1.hasChanges = false;
    }
    static getConfiguredCommandHistoryLength(configurationService) {
        const config = configurationService.getValue();
        const configuredCommandHistoryLength = config.workbench?.commandPalette?.history;
        if (typeof configuredCommandHistoryLength === 'number') {
            return configuredCommandHistoryLength;
        }
        return CommandsHistory_1.DEFAULT_COMMANDS_HISTORY_LENGTH;
    }
    static clearHistory(configurationService, storageService) {
        const commandHistoryLength = CommandsHistory_1.getConfiguredCommandHistoryLength(configurationService);
        CommandsHistory_1.cache = new LRUCache(commandHistoryLength);
        CommandsHistory_1.counter = 1;
        CommandsHistory_1.hasChanges = true;
    }
};
CommandsHistory = CommandsHistory_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IConfigurationService),
    __param(2, ILogService)
], CommandsHistory);
export { CommandsHistory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvY29tbWFuZHNRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQWdDLE1BQU0sbUNBQW1DLENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBNkIscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FB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