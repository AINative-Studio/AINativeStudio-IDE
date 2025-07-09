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
var AiRelatedInformationSearchProvider_1;
import { SettingMatchType, SettingKeyMatchTypes } from '../../../services/preferences/common/preferences.js';
import { distinct } from '../../../../base/common/arrays.js';
import * as strings from '../../../../base/common/strings.js';
import { matchesContiguousSubString, matchesSubString, matchesWords } from '../../../../base/common/filters.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IPreferencesSearchService } from '../common/preferences.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAiRelatedInformationService, RelatedInformationType } from '../../../services/aiRelatedInformation/common/aiRelatedInformation.js';
import { TfIdfCalculator } from '../../../../base/common/tfIdf.js';
import { nullRange } from '../../../services/preferences/common/preferencesModels.js';
let PreferencesSearchService = class PreferencesSearchService extends Disposable {
    constructor(instantiationService, configurationService, extensionManagementService, extensionEnablementService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        // This request goes to the shared process but results won't change during a window's lifetime, so cache the results.
        this._installedExtensions = this.extensionManagementService.getInstalled(1 /* ExtensionType.User */).then(exts => {
            // Filter to enabled extensions that have settings
            return exts
                .filter(ext => this.extensionEnablementService.isEnabled(ext))
                .filter(ext => ext.manifest && ext.manifest.contributes && ext.manifest.contributes.configuration)
                .filter(ext => !!ext.identifier.uuid);
        });
    }
    get remoteSearchAllowed() {
        const workbenchSettings = this.configurationService.getValue().workbench.settings;
        return workbenchSettings.enableNaturalLanguageSearch;
    }
    getRemoteSearchProvider(filter) {
        if (!this.remoteSearchAllowed) {
            return undefined;
        }
        this._remoteSearchProvider ??= this.instantiationService.createInstance(RemoteSearchProvider);
        this._remoteSearchProvider.setFilter(filter);
        return this._remoteSearchProvider;
    }
    getLocalSearchProvider(filter) {
        return this.instantiationService.createInstance(LocalSearchProvider, filter);
    }
};
PreferencesSearchService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IExtensionManagementService),
    __param(3, IWorkbenchExtensionEnablementService)
], PreferencesSearchService);
export { PreferencesSearchService };
function cleanFilter(filter) {
    // Remove " and : which are likely to be copypasted as part of a setting name.
    // Leave other special characters which the user might want to search for.
    return filter
        .replace(/[":]/g, ' ')
        .replace(/  /g, ' ')
        .trim();
}
let LocalSearchProvider = class LocalSearchProvider {
    constructor(_filter, configurationService) {
        this._filter = _filter;
        this.configurationService = configurationService;
        this._filter = cleanFilter(this._filter);
    }
    searchModel(preferencesModel, token) {
        if (!this._filter) {
            return Promise.resolve(null);
        }
        const settingMatcher = (setting) => {
            let { matches, matchType, keyMatchScore } = new SettingMatches(this._filter, setting, true, this.configurationService);
            if (matchType === SettingMatchType.None || matches.length === 0) {
                return null;
            }
            if (strings.equalsIgnoreCase(this._filter, setting.key)) {
                matchType = SettingMatchType.ExactMatch;
            }
            return {
                matches,
                matchType,
                keyMatchScore,
                score: 0 // only used for RemoteSearchProvider matches.
            };
        };
        const filterMatches = preferencesModel.filterSettings(this._filter, this.getGroupFilter(this._filter), settingMatcher);
        // Check the top key match type.
        const topKeyMatchType = Math.max(...filterMatches.map(m => (m.matchType & SettingKeyMatchTypes)));
        // Always allow description matches as part of https://github.com/microsoft/vscode/issues/239936.
        const alwaysAllowedMatchTypes = SettingMatchType.DescriptionOrValueMatch | SettingMatchType.LanguageTagSettingMatch;
        const filteredMatches = filterMatches.filter(m => (m.matchType & topKeyMatchType) || (m.matchType & alwaysAllowedMatchTypes) || m.matchType === SettingMatchType.ExactMatch);
        return Promise.resolve({
            filterMatches: filteredMatches,
            exactMatch: filteredMatches.some(m => m.matchType === SettingMatchType.ExactMatch)
        });
    }
    getGroupFilter(filter) {
        const regex = strings.createRegExp(filter, false, { global: true });
        return (group) => {
            return group.id !== 'defaultOverrides' && regex.test(group.title);
        };
    }
};
LocalSearchProvider = __decorate([
    __param(1, IConfigurationService)
], LocalSearchProvider);
export { LocalSearchProvider };
export class SettingMatches {
    constructor(searchString, setting, searchDescription, configurationService) {
        this.searchDescription = searchDescription;
        this.configurationService = configurationService;
        this.matchType = SettingMatchType.None;
        /**
         * A match score for key matches to allow comparing key matches against each other.
         * Otherwise, all key matches are treated the same, and sorting is done by ToC order.
         */
        this.keyMatchScore = 0;
        this.matches = distinct(this._findMatchesInSetting(searchString, setting), (match) => `${match.startLineNumber}_${match.startColumn}_${match.endLineNumber}_${match.endColumn}_`);
    }
    _findMatchesInSetting(searchString, setting) {
        const result = this._doFindMatchesInSetting(searchString, setting);
        return result;
    }
    _keyToLabel(settingId) {
        const label = settingId
            .replace(/[-._]/g, ' ')
            .replace(/([a-z]+)([A-Z])/g, '$1 $2')
            .replace(/([A-Za-z]+)(\d+)/g, '$1 $2')
            .replace(/(\d+)([A-Za-z]+)/g, '$1 $2')
            .toLowerCase();
        return label;
    }
    _toAlphaNumeric(s) {
        return s.replace(/[^A-Za-z0-9]+/g, '');
    }
    _doFindMatchesInSetting(searchString, setting) {
        const descriptionMatchingWords = new Map();
        const keyMatchingWords = new Map();
        const valueMatchingWords = new Map();
        // Key (ID) search
        // First, search by the setting's ID and label.
        const settingKeyAsWords = this._keyToLabel(setting.key);
        const queryWords = new Set(searchString.split(' '));
        for (const word of queryWords) {
            // Check if the key contains the word. Use contiguous search.
            const keyMatches = matchesWords(word, settingKeyAsWords, true);
            if (keyMatches?.length) {
                keyMatchingWords.set(word, keyMatches.map(match => this.toKeyRange(setting, match)));
            }
        }
        if (keyMatchingWords.size === queryWords.size) {
            // All words in the query matched with something in the setting key.
            // Matches "edit format on paste" to "editor.formatOnPaste".
            this.matchType |= SettingMatchType.AllWordsInSettingsLabel;
        }
        else if (keyMatchingWords.size >= 2) {
            // Matches "edit paste" to "editor.formatOnPaste".
            // The if statement reduces noise by preventing "editor formatonpast" from matching all editor settings.
            this.matchType |= SettingMatchType.ContiguousWordsInSettingsLabel;
            this.keyMatchScore = keyMatchingWords.size;
        }
        const searchStringAlphaNumeric = this._toAlphaNumeric(searchString);
        const keyAlphaNumeric = this._toAlphaNumeric(setting.key);
        const keyIdMatches = matchesContiguousSubString(searchStringAlphaNumeric, keyAlphaNumeric);
        if (keyIdMatches?.length) {
            // Matches "editorformatonp" to "editor.formatonpaste".
            keyMatchingWords.set(setting.key, keyIdMatches.map(match => this.toKeyRange(setting, match)));
            this.matchType |= SettingMatchType.ContiguousQueryInSettingId;
        }
        // Fall back to non-contiguous key (ID) searches if nothing matched yet.
        if (this.matchType === SettingMatchType.None) {
            keyMatchingWords.clear();
            for (const word of queryWords) {
                const keyMatches = matchesWords(word, settingKeyAsWords, false);
                if (keyMatches?.length) {
                    keyMatchingWords.set(word, keyMatches.map(match => this.toKeyRange(setting, match)));
                }
            }
            if (keyMatchingWords.size >= 2 || (keyMatchingWords.size === 1 && queryWords.size === 1)) {
                // Matches "edforonpas" to "editor.formatOnPaste".
                // The if statement reduces noise by preventing "editor fomonpast" from matching all editor settings.
                this.matchType |= SettingMatchType.NonContiguousWordsInSettingsLabel;
                this.keyMatchScore = keyMatchingWords.size;
            }
            else {
                const keyIdMatches = matchesSubString(searchStringAlphaNumeric, keyAlphaNumeric);
                if (keyIdMatches?.length) {
                    // Matches "edfmonpas" to "editor.formatOnPaste".
                    keyMatchingWords.set(setting.key, keyIdMatches.map(match => this.toKeyRange(setting, match)));
                    this.matchType |= SettingMatchType.NonContiguousQueryInSettingId;
                }
            }
        }
        // Check if the match was for a language tag group setting such as [markdown].
        // In such a case, move that setting to be last.
        if (setting.overrides?.length && (this.matchType !== SettingMatchType.None)) {
            this.matchType = SettingMatchType.LanguageTagSettingMatch;
            const keyRanges = keyMatchingWords.size ?
                Array.from(keyMatchingWords.values()).flat() : [];
            return [...keyRanges];
        }
        // Description search
        // Search the description if we found non-contiguous key matches at best.
        const hasContiguousKeyMatchTypes = this.matchType >= SettingMatchType.ContiguousWordsInSettingsLabel;
        if (this.searchDescription && !hasContiguousKeyMatchTypes) {
            for (const word of queryWords) {
                // Search the description lines.
                for (let lineIndex = 0; lineIndex < setting.description.length; lineIndex++) {
                    const descriptionMatches = matchesContiguousSubString(word, setting.description[lineIndex]);
                    if (descriptionMatches?.length) {
                        descriptionMatchingWords.set(word, descriptionMatches.map(match => this.toDescriptionRange(setting, match, lineIndex)));
                    }
                }
            }
            if (descriptionMatchingWords.size === queryWords.size) {
                this.matchType |= SettingMatchType.DescriptionOrValueMatch;
            }
            else {
                // Clear out the match for now. We want to require all words to match in the description.
                descriptionMatchingWords.clear();
            }
        }
        // Value search
        // Check if the value contains all the words.
        // Search the values if we found non-contiguous key matches at best.
        if (!hasContiguousKeyMatchTypes) {
            if (setting.enum?.length) {
                // Search all string values of enums.
                for (const option of setting.enum) {
                    if (typeof option !== 'string') {
                        continue;
                    }
                    valueMatchingWords.clear();
                    for (const word of queryWords) {
                        const valueMatches = matchesContiguousSubString(word, option);
                        if (valueMatches?.length) {
                            valueMatchingWords.set(word, valueMatches.map(match => this.toValueRange(setting, match)));
                        }
                    }
                    if (valueMatchingWords.size === queryWords.size) {
                        this.matchType |= SettingMatchType.DescriptionOrValueMatch;
                        break;
                    }
                    else {
                        // Clear out the match for now. We want to require all words to match in the value.
                        valueMatchingWords.clear();
                    }
                }
            }
            else {
                // Search single string value.
                const settingValue = this.configurationService.getValue(setting.key);
                if (typeof settingValue === 'string') {
                    for (const word of queryWords) {
                        const valueMatches = matchesContiguousSubString(word, settingValue);
                        if (valueMatches?.length) {
                            valueMatchingWords.set(word, valueMatches.map(match => this.toValueRange(setting, match)));
                        }
                    }
                    if (valueMatchingWords.size === queryWords.size) {
                        this.matchType |= SettingMatchType.DescriptionOrValueMatch;
                    }
                    else {
                        // Clear out the match for now. We want to require all words to match in the value.
                        valueMatchingWords.clear();
                    }
                }
            }
        }
        const descriptionRanges = descriptionMatchingWords.size ?
            Array.from(descriptionMatchingWords.values()).flat() : [];
        const keyRanges = keyMatchingWords.size ?
            Array.from(keyMatchingWords.values()).flat() : [];
        const valueRanges = valueMatchingWords.size ?
            Array.from(valueMatchingWords.values()).flat() : [];
        return [...descriptionRanges, ...keyRanges, ...valueRanges];
    }
    toKeyRange(setting, match) {
        return {
            startLineNumber: setting.keyRange.startLineNumber,
            startColumn: setting.keyRange.startColumn + match.start,
            endLineNumber: setting.keyRange.startLineNumber,
            endColumn: setting.keyRange.startColumn + match.end
        };
    }
    toDescriptionRange(setting, match, lineIndex) {
        const descriptionRange = setting.descriptionRanges[lineIndex];
        if (!descriptionRange) {
            // This case occurs with added settings such as the
            // manage extension setting.
            return nullRange;
        }
        return {
            startLineNumber: descriptionRange.startLineNumber,
            startColumn: descriptionRange.startColumn + match.start,
            endLineNumber: descriptionRange.endLineNumber,
            endColumn: descriptionRange.startColumn + match.end
        };
    }
    toValueRange(setting, match) {
        return {
            startLineNumber: setting.valueRange.startLineNumber,
            startColumn: setting.valueRange.startColumn + match.start + 1,
            endLineNumber: setting.valueRange.startLineNumber,
            endColumn: setting.valueRange.startColumn + match.end + 1
        };
    }
}
class AiRelatedInformationSearchKeysProvider {
    constructor(aiRelatedInformationService) {
        this.aiRelatedInformationService = aiRelatedInformationService;
        this.settingKeys = [];
        this.settingsRecord = {};
    }
    updateModel(preferencesModel) {
        if (preferencesModel === this.currentPreferencesModel) {
            return;
        }
        this.currentPreferencesModel = preferencesModel;
        this.refresh();
    }
    refresh() {
        this.settingKeys = [];
        this.settingsRecord = {};
        if (!this.currentPreferencesModel ||
            !this.aiRelatedInformationService.isEnabled()) {
            return;
        }
        for (const group of this.currentPreferencesModel.settingsGroups) {
            if (group.id === 'mostCommonlyUsed') {
                continue;
            }
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    this.settingKeys.push(setting.key);
                    this.settingsRecord[setting.key] = setting;
                }
            }
        }
    }
    getSettingKeys() {
        return this.settingKeys;
    }
    getSettingsRecord() {
        return this.settingsRecord;
    }
}
let AiRelatedInformationSearchProvider = class AiRelatedInformationSearchProvider {
    static { AiRelatedInformationSearchProvider_1 = this; }
    static { this.AI_RELATED_INFORMATION_MAX_PICKS = 5; }
    constructor(aiRelatedInformationService) {
        this.aiRelatedInformationService = aiRelatedInformationService;
        this._filter = '';
        this._keysProvider = new AiRelatedInformationSearchKeysProvider(aiRelatedInformationService);
    }
    setFilter(filter) {
        this._filter = cleanFilter(filter);
    }
    async searchModel(preferencesModel, token) {
        if (!this._filter ||
            !this.aiRelatedInformationService.isEnabled()) {
            return null;
        }
        this._keysProvider.updateModel(preferencesModel);
        return {
            filterMatches: await this.getAiRelatedInformationItems(token),
            exactMatch: false
        };
    }
    async getAiRelatedInformationItems(token) {
        const settingsRecord = this._keysProvider.getSettingsRecord();
        const filterMatches = [];
        const relatedInformation = await this.aiRelatedInformationService.getRelatedInformation(this._filter, [RelatedInformationType.SettingInformation], token);
        relatedInformation.sort((a, b) => b.weight - a.weight);
        for (const info of relatedInformation) {
            if (filterMatches.length === AiRelatedInformationSearchProvider_1.AI_RELATED_INFORMATION_MAX_PICKS) {
                break;
            }
            const pick = info.setting;
            filterMatches.push({
                setting: settingsRecord[pick],
                matches: [settingsRecord[pick].range],
                matchType: SettingMatchType.RemoteMatch,
                keyMatchScore: 0,
                score: info.weight
            });
        }
        return filterMatches;
    }
};
AiRelatedInformationSearchProvider = AiRelatedInformationSearchProvider_1 = __decorate([
    __param(0, IAiRelatedInformationService)
], AiRelatedInformationSearchProvider);
class TfIdfSearchProvider {
    static { this.TF_IDF_PRE_NORMALIZE_THRESHOLD = 50; }
    static { this.TF_IDF_POST_NORMALIZE_THRESHOLD = 0.7; }
    static { this.TF_IDF_MAX_PICKS = 5; }
    constructor() {
        this._filter = '';
        this._documents = [];
        this._settingsRecord = {};
    }
    setFilter(filter) {
        this._filter = cleanFilter(filter);
    }
    keyToLabel(settingId) {
        const label = settingId
            .replace(/[-._]/g, ' ')
            .replace(/([a-z]+)([A-Z])/g, '$1 $2')
            .replace(/([A-Za-z]+)(\d+)/g, '$1 $2')
            .replace(/(\d+)([A-Za-z]+)/g, '$1 $2')
            .toLowerCase();
        return label;
    }
    settingItemToEmbeddingString(item) {
        let result = `Setting Id: ${item.key}\n`;
        result += `Label: ${this.keyToLabel(item.key)}\n`;
        result += `Description: ${item.description}\n`;
        return result;
    }
    async searchModel(preferencesModel, token) {
        if (!this._filter) {
            return null;
        }
        if (this._currentPreferencesModel !== preferencesModel) {
            // Refresh the documents and settings record
            this._currentPreferencesModel = preferencesModel;
            this._documents = [];
            this._settingsRecord = {};
            for (const group of preferencesModel.settingsGroups) {
                if (group.id === 'mostCommonlyUsed') {
                    continue;
                }
                for (const section of group.sections) {
                    for (const setting of section.settings) {
                        this._documents.push({
                            key: setting.key,
                            textChunks: [this.settingItemToEmbeddingString(setting)]
                        });
                        this._settingsRecord[setting.key] = setting;
                    }
                }
            }
        }
        return {
            filterMatches: await this.getTfIdfItems(token),
            exactMatch: false
        };
    }
    async getTfIdfItems(token) {
        const filterMatches = [];
        const tfIdfCalculator = new TfIdfCalculator();
        tfIdfCalculator.updateDocuments(this._documents);
        const tfIdfRankings = tfIdfCalculator.calculateScores(this._filter, token);
        tfIdfRankings.sort((a, b) => b.score - a.score);
        const maxScore = tfIdfRankings[0].score;
        if (maxScore < TfIdfSearchProvider.TF_IDF_PRE_NORMALIZE_THRESHOLD) {
            // Reject all the matches.
            return [];
        }
        for (const info of tfIdfRankings) {
            if (info.score / maxScore < TfIdfSearchProvider.TF_IDF_POST_NORMALIZE_THRESHOLD || filterMatches.length === TfIdfSearchProvider.TF_IDF_MAX_PICKS) {
                break;
            }
            const pick = info.key;
            filterMatches.push({
                setting: this._settingsRecord[pick],
                matches: [this._settingsRecord[pick].range],
                matchType: SettingMatchType.RemoteMatch,
                keyMatchScore: 0,
                score: info.score
            });
        }
        return filterMatches;
    }
}
let RemoteSearchProvider = class RemoteSearchProvider {
    constructor(aiRelatedInformationService) {
        this.aiRelatedInformationService = aiRelatedInformationService;
        this.filter = '';
    }
    initializeSearchProviders() {
        if (this.aiRelatedInformationService.isEnabled()) {
            this.adaSearchProvider ??= new AiRelatedInformationSearchProvider(this.aiRelatedInformationService);
        }
        this.tfIdfSearchProvider ??= new TfIdfSearchProvider();
    }
    setFilter(filter) {
        this.initializeSearchProviders();
        this.filter = filter;
        if (this.adaSearchProvider) {
            this.adaSearchProvider.setFilter(filter);
        }
        this.tfIdfSearchProvider.setFilter(filter);
    }
    async searchModel(preferencesModel, token) {
        if (!this.filter) {
            return null;
        }
        if (!this.adaSearchProvider) {
            return this.tfIdfSearchProvider.searchModel(preferencesModel, token);
        }
        // Use TF-IDF search as a fallback, ref https://github.com/microsoft/vscode/issues/224946
        let results = await this.adaSearchProvider.searchModel(preferencesModel, token);
        if (results?.filterMatches.length) {
            return results;
        }
        if (!token.isCancellationRequested) {
            results = await this.tfIdfSearchProvider.searchModel(preferencesModel, token);
            if (results?.filterMatches.length) {
                return results;
            }
        }
        return null;
    }
};
RemoteSearchProvider = __decorate([
    __param(0, IAiRelatedInformationService)
], RemoteSearchProvider);
registerSingleton(IPreferencesSearchService, PreferencesSearchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9wcmVmZXJlbmNlc1NlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUErRSxnQkFBZ0IsRUFBaUIsb0JBQW9CLEVBQW1CLE1BQU0scURBQXFELENBQUM7QUFFMU4sT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFVLDBCQUEwQixFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUseUJBQXlCLEVBQTJFLE1BQU0sMEJBQTBCLENBQUM7QUFDOUksT0FBTyxFQUFFLDJCQUEyQixFQUFtQixNQUFNLHdFQUF3RSxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBRzNILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsc0JBQXNCLEVBQTRCLE1BQU0sdUVBQXVFLENBQUM7QUFDdkssT0FBTyxFQUFFLGVBQWUsRUFBaUIsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1B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