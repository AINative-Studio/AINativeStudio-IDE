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
import { coalesce } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { visit } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, OVERRIDE_PROPERTY_REGEX } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { SettingMatchType } from './preferences.js';
import { FOLDER_SCOPES, WORKSPACE_SCOPES } from '../../configuration/common/configuration.js';
import { createValidator } from './preferencesValidation.js';
export const nullRange = { startLineNumber: -1, startColumn: -1, endLineNumber: -1, endColumn: -1 };
function isNullRange(range) { return range.startLineNumber === -1 && range.startColumn === -1 && range.endLineNumber === -1 && range.endColumn === -1; }
class AbstractSettingsModel extends EditorModel {
    constructor() {
        super(...arguments);
        this._currentResultGroups = new Map();
    }
    updateResultGroup(id, resultGroup) {
        if (resultGroup) {
            this._currentResultGroups.set(id, resultGroup);
        }
        else {
            this._currentResultGroups.delete(id);
        }
        this.removeDuplicateResults();
        return this.update();
    }
    /**
     * Remove duplicates between result groups, preferring results in earlier groups
     */
    removeDuplicateResults() {
        const settingKeys = new Set();
        [...this._currentResultGroups.keys()]
            .sort((a, b) => this._currentResultGroups.get(a).order - this._currentResultGroups.get(b).order)
            .forEach(groupId => {
            const group = this._currentResultGroups.get(groupId);
            group.result.filterMatches = group.result.filterMatches.filter(s => !settingKeys.has(s.setting.key));
            group.result.filterMatches.forEach(s => settingKeys.add(s.setting.key));
        });
    }
    filterSettings(filter, groupFilter, settingMatcher) {
        const allGroups = this.filterGroups;
        const filterMatches = [];
        for (const group of allGroups) {
            const groupMatched = groupFilter(group);
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    const settingMatchResult = settingMatcher(setting, group);
                    if (groupMatched || settingMatchResult) {
                        filterMatches.push({
                            setting,
                            matches: settingMatchResult && settingMatchResult.matches,
                            matchType: settingMatchResult?.matchType ?? SettingMatchType.None,
                            keyMatchScore: settingMatchResult?.keyMatchScore ?? 0,
                            score: settingMatchResult?.score ?? 0
                        });
                    }
                }
            }
        }
        return filterMatches;
    }
    getPreference(key) {
        for (const group of this.settingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    if (key === setting.key) {
                        return setting;
                    }
                }
            }
        }
        return undefined;
    }
    collectMetadata(groups) {
        const metadata = Object.create(null);
        let hasMetadata = false;
        groups.forEach(g => {
            if (g.result.metadata) {
                metadata[g.id] = g.result.metadata;
                hasMetadata = true;
            }
        });
        return hasMetadata ? metadata : null;
    }
    get filterGroups() {
        return this.settingsGroups;
    }
}
export class SettingsEditorModel extends AbstractSettingsModel {
    constructor(reference, _configurationTarget) {
        super();
        this._configurationTarget = _configurationTarget;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this.settingsModel = reference.object.textEditorModel;
        this._register(this.onWillDispose(() => reference.dispose()));
        this._register(this.settingsModel.onDidChangeContent(() => {
            this._settingsGroups = undefined;
            this._onDidChangeGroups.fire();
        }));
    }
    get uri() {
        return this.settingsModel.uri;
    }
    get configurationTarget() {
        return this._configurationTarget;
    }
    get settingsGroups() {
        if (!this._settingsGroups) {
            this.parse();
        }
        return this._settingsGroups;
    }
    get content() {
        return this.settingsModel.getValue();
    }
    isSettingsProperty(property, previousParents) {
        return previousParents.length === 0; // Settings is root
    }
    parse() {
        this._settingsGroups = parse(this.settingsModel, (property, previousParents) => this.isSettingsProperty(property, previousParents));
    }
    update() {
        const resultGroups = [...this._currentResultGroups.values()];
        if (!resultGroups.length) {
            return undefined;
        }
        // Transform resultGroups into IFilterResult - ISetting ranges are already correct here
        const filteredSettings = [];
        const matches = [];
        resultGroups.forEach(group => {
            group.result.filterMatches.forEach(filterMatch => {
                filteredSettings.push(filterMatch.setting);
                if (filterMatch.matches) {
                    matches.push(...filterMatch.matches);
                }
            });
        });
        let filteredGroup;
        const modelGroup = this.settingsGroups[0]; // Editable model has one or zero groups
        if (modelGroup) {
            filteredGroup = {
                id: modelGroup.id,
                range: modelGroup.range,
                sections: [{
                        settings: filteredSettings
                    }],
                title: modelGroup.title,
                titleRange: modelGroup.titleRange,
                order: modelGroup.order,
                extensionInfo: modelGroup.extensionInfo
            };
        }
        const metadata = this.collectMetadata(resultGroups);
        return {
            allGroups: this.settingsGroups,
            filteredGroups: filteredGroup ? [filteredGroup] : [],
            matches,
            metadata: metadata ?? undefined
        };
    }
}
let Settings2EditorModel = class Settings2EditorModel extends AbstractSettingsModel {
    constructor(_defaultSettings, configurationService) {
        super();
        this._defaultSettings = _defaultSettings;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this.additionalGroups = [];
        this.dirty = false;
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.source === 7 /* ConfigurationTarget.DEFAULT */) {
                this.dirty = true;
                this._onDidChangeGroups.fire();
            }
        }));
        this._register(Registry.as(Extensions.Configuration).onDidSchemaChange(e => {
            this.dirty = true;
            this._onDidChangeGroups.fire();
        }));
    }
    /** Doesn't include the "Commonly Used" group */
    get filterGroups() {
        return this.settingsGroups.slice(1);
    }
    get settingsGroups() {
        const groups = this._defaultSettings.getSettingsGroups(this.dirty);
        this.dirty = false;
        return [...groups, ...this.additionalGroups];
    }
    /** For programmatically added groups outside of registered configurations */
    setAdditionalGroups(groups) {
        this.additionalGroups = groups;
    }
    update() {
        throw new Error('Not supported');
    }
};
Settings2EditorModel = __decorate([
    __param(1, IConfigurationService)
], Settings2EditorModel);
export { Settings2EditorModel };
function parse(model, isSettingsProperty) {
    const settings = [];
    let overrideSetting = null;
    let currentProperty = null;
    let currentParent = [];
    const previousParents = [];
    let settingsPropertyIndex = -1;
    const range = {
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: 0,
        endColumn: 0
    };
    function onValue(value, offset, length) {
        if (Array.isArray(currentParent)) {
            currentParent.push(value);
        }
        else if (currentProperty) {
            currentParent[currentProperty] = value;
        }
        if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
            // settings value started
            const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting.overrides[overrideSetting.overrides.length - 1];
            if (setting) {
                const valueStartPosition = model.getPositionAt(offset);
                const valueEndPosition = model.getPositionAt(offset + length);
                setting.value = value;
                setting.valueRange = {
                    startLineNumber: valueStartPosition.lineNumber,
                    startColumn: valueStartPosition.column,
                    endLineNumber: valueEndPosition.lineNumber,
                    endColumn: valueEndPosition.column
                };
                setting.range = Object.assign(setting.range, {
                    endLineNumber: valueEndPosition.lineNumber,
                    endColumn: valueEndPosition.column
                });
            }
        }
    }
    const visitor = {
        onObjectBegin: (offset, length) => {
            if (isSettingsProperty(currentProperty, previousParents)) {
                // Settings started
                settingsPropertyIndex = previousParents.length;
                const position = model.getPositionAt(offset);
                range.startLineNumber = position.lineNumber;
                range.startColumn = position.column;
            }
            const object = {};
            onValue(object, offset, length);
            currentParent = object;
            currentProperty = null;
            previousParents.push(currentParent);
        },
        onObjectProperty: (name, offset, length) => {
            currentProperty = name;
            if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
                // setting started
                const settingStartPosition = model.getPositionAt(offset);
                const setting = {
                    description: [],
                    descriptionIsMarkdown: false,
                    key: name,
                    keyRange: {
                        startLineNumber: settingStartPosition.lineNumber,
                        startColumn: settingStartPosition.column + 1,
                        endLineNumber: settingStartPosition.lineNumber,
                        endColumn: settingStartPosition.column + length
                    },
                    range: {
                        startLineNumber: settingStartPosition.lineNumber,
                        startColumn: settingStartPosition.column,
                        endLineNumber: 0,
                        endColumn: 0
                    },
                    value: null,
                    valueRange: nullRange,
                    descriptionRanges: [],
                    overrides: [],
                    overrideOf: overrideSetting ?? undefined,
                };
                if (previousParents.length === settingsPropertyIndex + 1) {
                    settings.push(setting);
                    if (OVERRIDE_PROPERTY_REGEX.test(name)) {
                        overrideSetting = setting;
                    }
                }
                else {
                    overrideSetting.overrides.push(setting);
                }
            }
        },
        onObjectEnd: (offset, length) => {
            currentParent = previousParents.pop();
            if (settingsPropertyIndex !== -1 && (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null))) {
                // setting ended
                const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting.overrides[overrideSetting.overrides.length - 1];
                if (setting) {
                    const valueEndPosition = model.getPositionAt(offset + length);
                    setting.valueRange = Object.assign(setting.valueRange, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column
                    });
                    setting.range = Object.assign(setting.range, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column
                    });
                }
                if (previousParents.length === settingsPropertyIndex + 1) {
                    overrideSetting = null;
                }
            }
            if (previousParents.length === settingsPropertyIndex) {
                // settings ended
                const position = model.getPositionAt(offset);
                range.endLineNumber = position.lineNumber;
                range.endColumn = position.column;
                settingsPropertyIndex = -1;
            }
        },
        onArrayBegin: (offset, length) => {
            const array = [];
            onValue(array, offset, length);
            previousParents.push(currentParent);
            currentParent = array;
            currentProperty = null;
        },
        onArrayEnd: (offset, length) => {
            currentParent = previousParents.pop();
            if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
                // setting value ended
                const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting.overrides[overrideSetting.overrides.length - 1];
                if (setting) {
                    const valueEndPosition = model.getPositionAt(offset + length);
                    setting.valueRange = Object.assign(setting.valueRange, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column
                    });
                    setting.range = Object.assign(setting.range, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column
                    });
                }
            }
        },
        onLiteralValue: onValue,
        onError: (error) => {
            const setting = settings[settings.length - 1];
            if (setting && (isNullRange(setting.range) || isNullRange(setting.keyRange) || isNullRange(setting.valueRange))) {
                settings.pop();
            }
        }
    };
    if (!model.isDisposed()) {
        visit(model.getValue(), visitor);
    }
    return settings.length > 0 ? [{
            id: model.isDisposed() ? '' : model.id,
            sections: [
                {
                    settings
                }
            ],
            title: '',
            titleRange: nullRange,
            range
        }] : [];
}
export class WorkspaceConfigurationEditorModel extends SettingsEditorModel {
    constructor() {
        super(...arguments);
        this._configurationGroups = [];
    }
    get configurationGroups() {
        return this._configurationGroups;
    }
    parse() {
        super.parse();
        this._configurationGroups = parse(this.settingsModel, (property, previousParents) => previousParents.length === 0);
    }
    isSettingsProperty(property, previousParents) {
        return property === 'settings' && previousParents.length === 1;
    }
}
export class DefaultSettings extends Disposable {
    constructor(_mostCommonlyUsedSettingsKeys, target, configurationService) {
        super();
        this._mostCommonlyUsedSettingsKeys = _mostCommonlyUsedSettingsKeys;
        this.target = target;
        this.configurationService = configurationService;
        this._settingsByName = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.source === 7 /* ConfigurationTarget.DEFAULT */) {
                this.reset();
                this._onDidChange.fire();
            }
        }));
    }
    getContent(forceUpdate = false) {
        if (!this._content || forceUpdate) {
            this.initialize();
        }
        return this._content;
    }
    getContentWithoutMostCommonlyUsed(forceUpdate = false) {
        if (!this._contentWithoutMostCommonlyUsed || forceUpdate) {
            this.initialize();
        }
        return this._contentWithoutMostCommonlyUsed;
    }
    getSettingsGroups(forceUpdate = false) {
        if (!this._allSettingsGroups || forceUpdate) {
            this.initialize();
        }
        return this._allSettingsGroups;
    }
    initialize() {
        this._allSettingsGroups = this.parse();
        this._content = this.toContent(this._allSettingsGroups, 0);
        this._contentWithoutMostCommonlyUsed = this.toContent(this._allSettingsGroups, 1);
    }
    reset() {
        this._content = undefined;
        this._contentWithoutMostCommonlyUsed = undefined;
        this._allSettingsGroups = undefined;
    }
    parse() {
        const settingsGroups = this.getRegisteredGroups();
        this.initAllSettingsMap(settingsGroups);
        const mostCommonlyUsed = this.getMostCommonlyUsedSettings();
        return [mostCommonlyUsed, ...settingsGroups];
    }
    getRegisteredGroups() {
        const configurations = Registry.as(Extensions.Configuration).getConfigurations().slice();
        const groups = this.removeEmptySettingsGroups(configurations.sort(this.compareConfigurationNodes)
            .reduce((result, config, index, array) => this.parseConfig(config, result, array), []));
        return this.sortGroups(groups);
    }
    sortGroups(groups) {
        groups.forEach(group => {
            group.sections.forEach(section => {
                section.settings.sort((a, b) => a.key.localeCompare(b.key));
            });
        });
        return groups;
    }
    initAllSettingsMap(allSettingsGroups) {
        this._settingsByName = new Map();
        for (const group of allSettingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    this._settingsByName.set(setting.key, setting);
                }
            }
        }
    }
    getMostCommonlyUsedSettings() {
        const settings = coalesce(this._mostCommonlyUsedSettingsKeys.map(key => {
            const setting = this._settingsByName.get(key);
            if (setting) {
                return {
                    description: setting.description,
                    key: setting.key,
                    value: setting.value,
                    keyRange: nullRange,
                    range: nullRange,
                    valueRange: nullRange,
                    overrides: [],
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                    type: setting.type,
                    enum: setting.enum,
                    enumDescriptions: setting.enumDescriptions,
                    descriptionRanges: []
                };
            }
            return null;
        }));
        return {
            id: 'mostCommonlyUsed',
            range: nullRange,
            title: nls.localize('commonlyUsed', "Commonly Used"),
            titleRange: nullRange,
            sections: [
                {
                    settings
                }
            ]
        };
    }
    parseConfig(config, result, configurations, settingsGroup, seenSettings) {
        seenSettings = seenSettings ? seenSettings : {};
        let title = config.title;
        if (!title) {
            const configWithTitleAndSameId = configurations.find(c => (c.id === config.id) && c.title);
            if (configWithTitleAndSameId) {
                title = configWithTitleAndSameId.title;
            }
        }
        if (title) {
            if (!settingsGroup) {
                settingsGroup = result.find(g => g.title === title && g.extensionInfo?.id === config.extensionInfo?.id);
                if (!settingsGroup) {
                    settingsGroup = { sections: [{ settings: [] }], id: config.id || '', title: title || '', titleRange: nullRange, order: config.order, range: nullRange, extensionInfo: config.extensionInfo };
                    result.push(settingsGroup);
                }
            }
            else {
                settingsGroup.sections[settingsGroup.sections.length - 1].title = title;
            }
        }
        if (config.properties) {
            if (!settingsGroup) {
                settingsGroup = { sections: [{ settings: [] }], id: config.id || '', title: config.id || '', titleRange: nullRange, order: config.order, range: nullRange, extensionInfo: config.extensionInfo };
                result.push(settingsGroup);
            }
            const configurationSettings = [];
            for (const setting of [...settingsGroup.sections[settingsGroup.sections.length - 1].settings, ...this.parseSettings(config)]) {
                if (!seenSettings[setting.key]) {
                    configurationSettings.push(setting);
                    seenSettings[setting.key] = true;
                }
            }
            if (configurationSettings.length) {
                settingsGroup.sections[settingsGroup.sections.length - 1].settings = configurationSettings;
            }
        }
        config.allOf?.forEach(c => this.parseConfig(c, result, configurations, settingsGroup, seenSettings));
        return result;
    }
    removeEmptySettingsGroups(settingsGroups) {
        const result = [];
        for (const settingsGroup of settingsGroups) {
            settingsGroup.sections = settingsGroup.sections.filter(section => section.settings.length > 0);
            if (settingsGroup.sections.length) {
                result.push(settingsGroup);
            }
        }
        return result;
    }
    parseSettings(config) {
        const result = [];
        const settingsObject = config.properties;
        const extensionInfo = config.extensionInfo;
        // Try using the title if the category id wasn't given
        // (in which case the category id is the same as the extension id)
        const categoryLabel = config.extensionInfo?.id === config.id ? config.title : config.id;
        for (const key in settingsObject) {
            const prop = settingsObject[key];
            if (this.matchesScope(prop)) {
                const value = prop.default;
                let description = (prop.markdownDescription || prop.description || '');
                if (typeof description !== 'string') {
                    description = '';
                }
                const descriptionLines = description.split('\n');
                const overrides = OVERRIDE_PROPERTY_REGEX.test(key) ? this.parseOverrideSettings(prop.default) : [];
                let listItemType;
                if (prop.type === 'array' && prop.items && !Array.isArray(prop.items) && prop.items.type) {
                    if (prop.items.enum) {
                        listItemType = 'enum';
                    }
                    else if (!Array.isArray(prop.items.type)) {
                        listItemType = prop.items.type;
                    }
                }
                const objectProperties = prop.type === 'object' ? prop.properties : undefined;
                const objectPatternProperties = prop.type === 'object' ? prop.patternProperties : undefined;
                const objectAdditionalProperties = prop.type === 'object' ? prop.additionalProperties : undefined;
                let enumToUse = prop.enum;
                let enumDescriptions = prop.markdownEnumDescriptions ?? prop.enumDescriptions;
                let enumDescriptionsAreMarkdown = !!prop.markdownEnumDescriptions;
                if (listItemType === 'enum' && !Array.isArray(prop.items)) {
                    enumToUse = prop.items.enum;
                    enumDescriptions = prop.items.markdownEnumDescriptions ?? prop.items.enumDescriptions;
                    enumDescriptionsAreMarkdown = !!prop.items.markdownEnumDescriptions;
                }
                let allKeysAreBoolean = false;
                if (prop.type === 'object' && !prop.additionalProperties && prop.properties && Object.keys(prop.properties).length) {
                    allKeysAreBoolean = Object.keys(prop.properties).every(key => {
                        return prop.properties[key].type === 'boolean';
                    });
                }
                let isLanguageTagSetting = false;
                if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                    isLanguageTagSetting = true;
                }
                let defaultValueSource;
                if (!isLanguageTagSetting) {
                    const registeredConfigurationProp = prop;
                    if (registeredConfigurationProp && registeredConfigurationProp.defaultValueSource) {
                        defaultValueSource = registeredConfigurationProp.defaultValueSource;
                    }
                }
                if (!enumToUse && (prop.enumItemLabels || enumDescriptions || enumDescriptionsAreMarkdown)) {
                    console.error(`The setting ${key} has enum-related fields, but doesn't have an enum field. This setting may render improperly in the Settings editor.`);
                }
                result.push({
                    key,
                    value,
                    description: descriptionLines,
                    descriptionIsMarkdown: !!prop.markdownDescription,
                    range: nullRange,
                    keyRange: nullRange,
                    valueRange: nullRange,
                    descriptionRanges: [],
                    overrides,
                    scope: prop.scope,
                    type: prop.type,
                    arrayItemType: listItemType,
                    objectProperties,
                    objectPatternProperties,
                    objectAdditionalProperties,
                    enum: enumToUse,
                    enumDescriptions: enumDescriptions,
                    enumDescriptionsAreMarkdown: enumDescriptionsAreMarkdown,
                    enumItemLabels: prop.enumItemLabels,
                    uniqueItems: prop.uniqueItems,
                    tags: prop.tags,
                    disallowSyncIgnore: prop.disallowSyncIgnore,
                    restricted: prop.restricted,
                    extensionInfo: extensionInfo,
                    deprecationMessage: prop.markdownDeprecationMessage || prop.deprecationMessage,
                    deprecationMessageIsMarkdown: !!prop.markdownDeprecationMessage,
                    validator: createValidator(prop),
                    allKeysAreBoolean,
                    editPresentation: prop.editPresentation,
                    order: prop.order,
                    nonLanguageSpecificDefaultValueSource: defaultValueSource,
                    isLanguageTagSetting,
                    categoryLabel
                });
            }
        }
        return result;
    }
    parseOverrideSettings(overrideSettings) {
        return Object.keys(overrideSettings).map((key) => ({
            key,
            value: overrideSettings[key],
            description: [],
            descriptionIsMarkdown: false,
            range: nullRange,
            keyRange: nullRange,
            valueRange: nullRange,
            descriptionRanges: [],
            overrides: []
        }));
    }
    matchesScope(property) {
        if (!property.scope) {
            return true;
        }
        if (this.target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            return FOLDER_SCOPES.indexOf(property.scope) !== -1;
        }
        if (this.target === 5 /* ConfigurationTarget.WORKSPACE */) {
            return WORKSPACE_SCOPES.indexOf(property.scope) !== -1;
        }
        return true;
    }
    compareConfigurationNodes(c1, c2) {
        if (typeof c1.order !== 'number') {
            return 1;
        }
        if (typeof c2.order !== 'number') {
            return -1;
        }
        if (c1.order === c2.order) {
            const title1 = c1.title || '';
            const title2 = c2.title || '';
            return title1.localeCompare(title2);
        }
        return c1.order - c2.order;
    }
    toContent(settingsGroups, startIndex) {
        const builder = new SettingsContentBuilder();
        for (let i = startIndex; i < settingsGroups.length; i++) {
            builder.pushGroup(settingsGroups[i], i === startIndex, i === settingsGroups.length - 1);
        }
        return builder.getContent();
    }
}
export class DefaultSettingsEditorModel extends AbstractSettingsModel {
    constructor(_uri, reference, defaultSettings) {
        super();
        this._uri = _uri;
        this.defaultSettings = defaultSettings;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this._register(defaultSettings.onDidChange(() => this._onDidChangeGroups.fire()));
        this._model = reference.object.textEditorModel;
        this._register(this.onWillDispose(() => reference.dispose()));
    }
    get uri() {
        return this._uri;
    }
    get target() {
        return this.defaultSettings.target;
    }
    get settingsGroups() {
        return this.defaultSettings.getSettingsGroups();
    }
    get filterGroups() {
        // Don't look at "commonly used" for filter
        return this.settingsGroups.slice(1);
    }
    update() {
        if (this._model.isDisposed()) {
            return undefined;
        }
        // Grab current result groups, only render non-empty groups
        const resultGroups = [...this._currentResultGroups.values()]
            .sort((a, b) => a.order - b.order);
        const nonEmptyResultGroups = resultGroups.filter(group => group.result.filterMatches.length);
        const startLine = this.settingsGroups.at(-1).range.endLineNumber + 2;
        const { settingsGroups: filteredGroups, matches } = this.writeResultGroups(nonEmptyResultGroups, startLine);
        const metadata = this.collectMetadata(resultGroups);
        return resultGroups.length ?
            {
                allGroups: this.settingsGroups,
                filteredGroups,
                matches,
                metadata: metadata ?? undefined
            } :
            undefined;
    }
    /**
     * Translate the ISearchResultGroups to text, and write it to the editor model
     */
    writeResultGroups(groups, startLine) {
        const contentBuilderOffset = startLine - 1;
        const builder = new SettingsContentBuilder(contentBuilderOffset);
        const settingsGroups = [];
        const matches = [];
        if (groups.length) {
            builder.pushLine(',');
            groups.forEach(resultGroup => {
                const settingsGroup = this.getGroup(resultGroup);
                settingsGroups.push(settingsGroup);
                matches.push(...this.writeSettingsGroupToBuilder(builder, settingsGroup, resultGroup.result.filterMatches));
            });
        }
        // note: 1-indexed line numbers here
        const groupContent = builder.getContent() + '\n';
        const groupEndLine = this._model.getLineCount();
        const cursorPosition = new Selection(startLine, 1, startLine, 1);
        const edit = {
            text: groupContent,
            forceMoveMarkers: true,
            range: new Range(startLine, 1, groupEndLine, 1)
        };
        this._model.pushEditOperations([cursorPosition], [edit], () => [cursorPosition]);
        // Force tokenization now - otherwise it may be slightly delayed, causing a flash of white text
        const tokenizeTo = Math.min(startLine + 60, this._model.getLineCount());
        this._model.tokenization.forceTokenization(tokenizeTo);
        return { matches, settingsGroups };
    }
    writeSettingsGroupToBuilder(builder, settingsGroup, filterMatches) {
        filterMatches = filterMatches
            .map(filteredMatch => {
            // Fix match ranges to offset from setting start line
            return {
                setting: filteredMatch.setting,
                score: filteredMatch.score,
                matchType: filteredMatch.matchType,
                keyMatchScore: filteredMatch.keyMatchScore,
                matches: filteredMatch.matches && filteredMatch.matches.map(match => {
                    return new Range(match.startLineNumber - filteredMatch.setting.range.startLineNumber, match.startColumn, match.endLineNumber - filteredMatch.setting.range.startLineNumber, match.endColumn);
                })
            };
        });
        builder.pushGroup(settingsGroup);
        // builder has rewritten settings ranges, fix match ranges
        const fixedMatches = filterMatches
            .map(m => m.matches || [])
            .flatMap((settingMatches, i) => {
            const setting = settingsGroup.sections[0].settings[i];
            return settingMatches.map(range => {
                return new Range(range.startLineNumber + setting.range.startLineNumber, range.startColumn, range.endLineNumber + setting.range.startLineNumber, range.endColumn);
            });
        });
        return fixedMatches;
    }
    copySetting(setting) {
        return {
            description: setting.description,
            scope: setting.scope,
            type: setting.type,
            enum: setting.enum,
            enumDescriptions: setting.enumDescriptions,
            key: setting.key,
            value: setting.value,
            range: setting.range,
            overrides: [],
            overrideOf: setting.overrideOf,
            tags: setting.tags,
            deprecationMessage: setting.deprecationMessage,
            keyRange: nullRange,
            valueRange: nullRange,
            descriptionIsMarkdown: undefined,
            descriptionRanges: []
        };
    }
    getPreference(key) {
        for (const group of this.settingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    if (setting.key === key) {
                        return setting;
                    }
                }
            }
        }
        return undefined;
    }
    getGroup(resultGroup) {
        return {
            id: resultGroup.id,
            range: nullRange,
            title: resultGroup.label,
            titleRange: nullRange,
            sections: [
                {
                    settings: resultGroup.result.filterMatches.map(m => this.copySetting(m.setting))
                }
            ]
        };
    }
}
class SettingsContentBuilder {
    get lineCountWithOffset() {
        return this._contentByLines.length + this._rangeOffset;
    }
    get lastLine() {
        return this._contentByLines[this._contentByLines.length - 1] || '';
    }
    constructor(_rangeOffset = 0) {
        this._rangeOffset = _rangeOffset;
        this._contentByLines = [];
    }
    pushLine(...lineText) {
        this._contentByLines.push(...lineText);
    }
    pushGroup(settingsGroups, isFirst, isLast) {
        this._contentByLines.push(isFirst ? '[{' : '{');
        const lastSetting = this._pushGroup(settingsGroups, '  ');
        if (lastSetting) {
            // Strip the comma from the last setting
            const lineIdx = lastSetting.range.endLineNumber - this._rangeOffset;
            const content = this._contentByLines[lineIdx - 2];
            this._contentByLines[lineIdx - 2] = content.substring(0, content.length - 1);
        }
        this._contentByLines.push(isLast ? '}]' : '},');
    }
    _pushGroup(group, indent) {
        let lastSetting = null;
        const groupStart = this.lineCountWithOffset + 1;
        for (const section of group.sections) {
            if (section.title) {
                const sectionTitleStart = this.lineCountWithOffset + 1;
                this.addDescription([section.title], indent, this._contentByLines);
                section.titleRange = { startLineNumber: sectionTitleStart, startColumn: 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length };
            }
            if (section.settings.length) {
                for (const setting of section.settings) {
                    this.pushSetting(setting, indent);
                    lastSetting = setting;
                }
            }
        }
        group.range = { startLineNumber: groupStart, startColumn: 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length };
        return lastSetting;
    }
    getContent() {
        return this._contentByLines.join('\n');
    }
    pushSetting(setting, indent) {
        const settingStart = this.lineCountWithOffset + 1;
        this.pushSettingDescription(setting, indent);
        let preValueContent = indent;
        const keyString = JSON.stringify(setting.key);
        preValueContent += keyString;
        setting.keyRange = { startLineNumber: this.lineCountWithOffset + 1, startColumn: preValueContent.indexOf(setting.key) + 1, endLineNumber: this.lineCountWithOffset + 1, endColumn: setting.key.length };
        preValueContent += ': ';
        const valueStart = this.lineCountWithOffset + 1;
        this.pushValue(setting, preValueContent, indent);
        setting.valueRange = { startLineNumber: valueStart, startColumn: preValueContent.length + 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length + 1 };
        this._contentByLines[this._contentByLines.length - 1] += ',';
        this._contentByLines.push('');
        setting.range = { startLineNumber: settingStart, startColumn: 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length };
    }
    pushSettingDescription(setting, indent) {
        const fixSettingLink = (line) => line.replace(/`#(.*)#`/g, (match, settingName) => `\`${settingName}\``);
        setting.descriptionRanges = [];
        const descriptionPreValue = indent + '// ';
        const deprecationMessageLines = setting.deprecationMessage?.split(/\n/g) ?? [];
        for (let line of [...deprecationMessageLines, ...setting.description]) {
            line = fixSettingLink(line);
            this._contentByLines.push(descriptionPreValue + line);
            setting.descriptionRanges.push({ startLineNumber: this.lineCountWithOffset, startColumn: this.lastLine.indexOf(line) + 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length });
        }
        if (setting.enum && setting.enumDescriptions?.some(desc => !!desc)) {
            setting.enumDescriptions.forEach((desc, i) => {
                const displayEnum = escapeInvisibleChars(String(setting.enum[i]));
                const line = desc ?
                    `${displayEnum}: ${fixSettingLink(desc)}` :
                    displayEnum;
                const lines = line.split(/\n/g);
                lines[0] = ' - ' + lines[0];
                this._contentByLines.push(...lines.map(l => `${indent}// ${l}`));
                setting.descriptionRanges.push({ startLineNumber: this.lineCountWithOffset, startColumn: this.lastLine.indexOf(line) + 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length });
            });
        }
    }
    pushValue(setting, preValueConent, indent) {
        const valueString = JSON.stringify(setting.value, null, indent);
        if (valueString && (typeof setting.value === 'object')) {
            if (setting.overrides && setting.overrides.length) {
                this._contentByLines.push(preValueConent + ' {');
                for (const subSetting of setting.overrides) {
                    this.pushSetting(subSetting, indent + indent);
                    this._contentByLines.pop();
                }
                const lastSetting = setting.overrides[setting.overrides.length - 1];
                const content = this._contentByLines[lastSetting.range.endLineNumber - 2];
                this._contentByLines[lastSetting.range.endLineNumber - 2] = content.substring(0, content.length - 1);
                this._contentByLines.push(indent + '}');
            }
            else {
                const mulitLineValue = valueString.split('\n');
                this._contentByLines.push(preValueConent + mulitLineValue[0]);
                for (let i = 1; i < mulitLineValue.length; i++) {
                    this._contentByLines.push(indent + mulitLineValue[i]);
                }
            }
        }
        else {
            this._contentByLines.push(preValueConent + valueString);
        }
    }
    addDescription(description, indent, result) {
        for (const line of description) {
            result.push(indent + '// ' + line);
        }
    }
}
class RawSettingsContentBuilder extends SettingsContentBuilder {
    constructor(indent = '\t') {
        super(0);
        this.indent = indent;
    }
    pushGroup(settingsGroups) {
        this._pushGroup(settingsGroups, this.indent);
    }
}
export class DefaultRawSettingsEditorModel extends Disposable {
    constructor(defaultSettings) {
        super();
        this.defaultSettings = defaultSettings;
        this._content = null;
        this._onDidContentChanged = this._register(new Emitter());
        this.onDidContentChanged = this._onDidContentChanged.event;
        this._register(defaultSettings.onDidChange(() => {
            this._content = null;
            this._onDidContentChanged.fire();
        }));
    }
    get content() {
        if (this._content === null) {
            const builder = new RawSettingsContentBuilder();
            builder.pushLine('{');
            for (const settingsGroup of this.defaultSettings.getRegisteredGroups()) {
                builder.pushGroup(settingsGroup);
            }
            builder.pushLine('}');
            this._content = builder.getContent();
        }
        return this._content;
    }
}
function escapeInvisibleChars(enumValue) {
    return enumValue && enumValue
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
export function defaultKeybindingsContents(keybindingService) {
    const defaultsHeader = '// ' + nls.localize('defaultKeybindingsHeader', "Override key bindings by placing them into your key bindings file.");
    return defaultsHeader + '\n' + keybindingService.getDefaultKeybindingsContent();
}
let DefaultKeybindingsEditorModel = class DefaultKeybindingsEditorModel {
    constructor(_uri, keybindingService) {
        this._uri = _uri;
        this.keybindingService = keybindingService;
    }
    get uri() {
        return this._uri;
    }
    get content() {
        if (!this._content) {
            this._content = defaultKeybindingsContents(this.keybindingService);
        }
        return this._content;
    }
    getPreference() {
        return null;
    }
    dispose() {
        // Not disposable
    }
};
DefaultKeybindingsEditorModel = __decorate([
    __param(1, IKeybindingService)
], DefaultKeybindingsEditorModel);
export { DefaultKeybindingsEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlc01vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFjLE1BQU0sc0NBQXNDLENBQUM7QUFFOUUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUl4RSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN4SCxPQUFPLEVBQXVELFVBQVUsRUFBb0gsdUJBQXVCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNoUyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BFLE9BQU8sRUFBNkssZ0JBQWdCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvTixPQUFPLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFB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