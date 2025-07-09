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
import * as arrays from '../../../../base/common/arrays.js';
import { escapeRegExpCharacters, isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { isUndefinedOrNull } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { knownAcronyms, knownTermMappings, tocData } from './settingsLayout.js';
import { ENABLE_EXTENSION_TOGGLE_SETTINGS, ENABLE_LANGUAGE_FILTER, MODIFIED_SETTING_TAG, POLICY_SETTING_TAG, REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG, compareTwoNullableNumbers } from '../common/preferences.js';
import { SettingMatchType, SettingValueType } from '../../../services/preferences/common/preferences.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { FOLDER_SCOPES, WORKSPACE_SCOPES, REMOTE_MACHINE_SCOPES, LOCAL_MACHINE_SCOPES, IWorkbenchConfigurationService, APPLICATION_SCOPES } from '../../../services/configuration/common/configuration.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { EditPresentationTypes, Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { USER_LOCAL_AND_REMOTE_SETTINGS } from '../../../../platform/request/common/request.js';
export const ONLINE_SERVICES_SETTING_TAG = 'usesOnlineServices';
export class SettingsTreeElement extends Disposable {
    constructor(_id) {
        super();
        this._tabbable = false;
        this._onDidChangeTabbable = this._register(new Emitter());
        this.onDidChangeTabbable = this._onDidChangeTabbable.event;
        this.id = _id;
    }
    get tabbable() {
        return this._tabbable;
    }
    set tabbable(value) {
        this._tabbable = value;
        this._onDidChangeTabbable.fire();
    }
}
export class SettingsTreeGroupElement extends SettingsTreeElement {
    get children() {
        return this._children;
    }
    set children(newChildren) {
        this._children = newChildren;
        this._childSettingKeys = new Set();
        this._children.forEach(child => {
            if (child instanceof SettingsTreeSettingElement) {
                this._childSettingKeys.add(child.setting.key);
            }
        });
    }
    constructor(_id, count, label, level, isFirstGroup) {
        super(_id);
        this._childSettingKeys = new Set();
        this._children = [];
        this.count = count;
        this.label = label;
        this.level = level;
        this.isFirstGroup = isFirstGroup;
    }
    /**
     * Returns whether this group contains the given child key (to a depth of 1 only)
     */
    containsSetting(key) {
        return this._childSettingKeys.has(key);
    }
}
export class SettingsTreeNewExtensionsElement extends SettingsTreeElement {
    constructor(_id, extensionIds) {
        super(_id);
        this.extensionIds = extensionIds;
    }
}
export class SettingsTreeSettingElement extends SettingsTreeElement {
    static { this.MAX_DESC_LINES = 20; }
    constructor(setting, parent, settingsTarget, isWorkspaceTrusted, languageFilter, languageService, productService, userDataProfileService, configurationService) {
        super(sanitizeId(parent.id + '_' + setting.key));
        this.settingsTarget = settingsTarget;
        this.isWorkspaceTrusted = isWorkspaceTrusted;
        this.languageFilter = languageFilter;
        this.languageService = languageService;
        this.productService = productService;
        this.userDataProfileService = userDataProfileService;
        this.configurationService = configurationService;
        this._displayCategory = null;
        this._displayLabel = null;
        /**
         * Whether the setting is configured in the selected scope.
         */
        this.isConfigured = false;
        /**
         * Whether the setting requires trusted target
         */
        this.isUntrusted = false;
        /**
         * Whether the setting is under a policy that blocks all changes.
         */
        this.hasPolicyValue = false;
        this.overriddenScopeList = [];
        this.overriddenDefaultsLanguageList = [];
        /**
         * For each language that contributes setting values or default overrides, we can see those values here.
         */
        this.languageOverrideValues = new Map();
        this.setting = setting;
        this.parent = parent;
        // Make sure description and valueType are initialized
        this.initSettingDescription();
        this.initSettingValueType();
    }
    get displayCategory() {
        if (!this._displayCategory) {
            this.initLabels();
        }
        return this._displayCategory;
    }
    get displayLabel() {
        if (!this._displayLabel) {
            this.initLabels();
        }
        return this._displayLabel;
    }
    initLabels() {
        if (this.setting.title) {
            this._displayLabel = this.setting.title;
            this._displayCategory = this.setting.categoryLabel ?? null;
            return;
        }
        const displayKeyFormat = settingKeyToDisplayFormat(this.setting.key, this.parent.id, this.setting.isLanguageTagSetting);
        this._displayLabel = displayKeyFormat.label;
        this._displayCategory = displayKeyFormat.category;
    }
    initSettingDescription() {
        if (this.setting.description.length > SettingsTreeSettingElement.MAX_DESC_LINES) {
            const truncatedDescLines = this.setting.description.slice(0, SettingsTreeSettingElement.MAX_DESC_LINES);
            truncatedDescLines.push('[...]');
            this.description = truncatedDescLines.join('\n');
        }
        else {
            this.description = this.setting.description.join('\n');
        }
    }
    initSettingValueType() {
        if (isExtensionToggleSetting(this.setting, this.productService)) {
            this.valueType = SettingValueType.ExtensionToggle;
        }
        else if (this.setting.enum && (!this.setting.type || settingTypeEnumRenderable(this.setting.type))) {
            this.valueType = SettingValueType.Enum;
        }
        else if (this.setting.type === 'string') {
            if (this.setting.editPresentation === EditPresentationTypes.Multiline) {
                this.valueType = SettingValueType.MultilineString;
            }
            else {
                this.valueType = SettingValueType.String;
            }
        }
        else if (isExcludeSetting(this.setting)) {
            this.valueType = SettingValueType.Exclude;
        }
        else if (isIncludeSetting(this.setting)) {
            this.valueType = SettingValueType.Include;
        }
        else if (this.setting.type === 'integer') {
            this.valueType = SettingValueType.Integer;
        }
        else if (this.setting.type === 'number') {
            this.valueType = SettingValueType.Number;
        }
        else if (this.setting.type === 'boolean') {
            this.valueType = SettingValueType.Boolean;
        }
        else if (this.setting.type === 'array' && this.setting.arrayItemType &&
            ['string', 'enum', 'number', 'integer'].includes(this.setting.arrayItemType)) {
            this.valueType = SettingValueType.Array;
        }
        else if (Array.isArray(this.setting.type) && this.setting.type.includes(SettingValueType.Null) && this.setting.type.length === 2) {
            if (this.setting.type.includes(SettingValueType.Integer)) {
                this.valueType = SettingValueType.NullableInteger;
            }
            else if (this.setting.type.includes(SettingValueType.Number)) {
                this.valueType = SettingValueType.NullableNumber;
            }
            else {
                this.valueType = SettingValueType.Complex;
            }
        }
        else {
            const schemaType = getObjectSettingSchemaType(this.setting);
            if (schemaType) {
                if (this.setting.allKeysAreBoolean) {
                    this.valueType = SettingValueType.BooleanObject;
                }
                else if (schemaType === 'simple') {
                    this.valueType = SettingValueType.Object;
                }
                else {
                    this.valueType = SettingValueType.ComplexObject;
                }
            }
            else if (this.setting.isLanguageTagSetting) {
                this.valueType = SettingValueType.LanguageTag;
            }
            else {
                this.valueType = SettingValueType.Complex;
            }
        }
    }
    inspectSelf() {
        const targetToInspect = this.getTargetToInspect(this.setting);
        const inspectResult = inspectSetting(this.setting.key, targetToInspect, this.languageFilter, this.configurationService);
        this.update(inspectResult, this.isWorkspaceTrusted);
    }
    getTargetToInspect(setting) {
        if (!this.userDataProfileService.currentProfile.isDefault && !this.userDataProfileService.currentProfile.useDefaultFlags?.settings) {
            if (setting.scope === 1 /* ConfigurationScope.APPLICATION */) {
                return 1 /* ConfigurationTarget.APPLICATION */;
            }
            if (this.configurationService.isSettingAppliedForAllProfiles(setting.key) && this.settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
                return 1 /* ConfigurationTarget.APPLICATION */;
            }
        }
        return this.settingsTarget;
    }
    update(inspectResult, isWorkspaceTrusted) {
        let { isConfigured, inspected, targetSelector, inspectedLanguageOverrides, languageSelector } = inspectResult;
        switch (targetSelector) {
            case 'workspaceFolderValue':
            case 'workspaceValue':
                this.isUntrusted = !!this.setting.restricted && !isWorkspaceTrusted;
                break;
        }
        let displayValue = isConfigured ? inspected[targetSelector] : inspected.defaultValue;
        const overriddenScopeList = [];
        const overriddenDefaultsLanguageList = [];
        if ((languageSelector || targetSelector !== 'workspaceValue') && typeof inspected.workspaceValue !== 'undefined') {
            overriddenScopeList.push('workspace:');
        }
        if ((languageSelector || targetSelector !== 'userRemoteValue') && typeof inspected.userRemoteValue !== 'undefined') {
            overriddenScopeList.push('remote:');
        }
        if ((languageSelector || targetSelector !== 'userLocalValue') && typeof inspected.userLocalValue !== 'undefined') {
            overriddenScopeList.push('user:');
        }
        if (inspected.overrideIdentifiers) {
            for (const overrideIdentifier of inspected.overrideIdentifiers) {
                const inspectedOverride = inspectedLanguageOverrides.get(overrideIdentifier);
                if (inspectedOverride) {
                    if (this.languageService.isRegisteredLanguageId(overrideIdentifier)) {
                        if (languageSelector !== overrideIdentifier && typeof inspectedOverride.default?.override !== 'undefined') {
                            overriddenDefaultsLanguageList.push(overrideIdentifier);
                        }
                        if ((languageSelector !== overrideIdentifier || targetSelector !== 'workspaceValue') && typeof inspectedOverride.workspace?.override !== 'undefined') {
                            overriddenScopeList.push(`workspace:${overrideIdentifier}`);
                        }
                        if ((languageSelector !== overrideIdentifier || targetSelector !== 'userRemoteValue') && typeof inspectedOverride.userRemote?.override !== 'undefined') {
                            overriddenScopeList.push(`remote:${overrideIdentifier}`);
                        }
                        if ((languageSelector !== overrideIdentifier || targetSelector !== 'userLocalValue') && typeof inspectedOverride.userLocal?.override !== 'undefined') {
                            overriddenScopeList.push(`user:${overrideIdentifier}`);
                        }
                    }
                    this.languageOverrideValues.set(overrideIdentifier, inspectedOverride);
                }
            }
        }
        this.overriddenScopeList = overriddenScopeList;
        this.overriddenDefaultsLanguageList = overriddenDefaultsLanguageList;
        // The user might have added, removed, or modified a language filter,
        // so we reset the default value source to the non-language-specific default value source for now.
        this.defaultValueSource = this.setting.nonLanguageSpecificDefaultValueSource;
        if (inspected.policyValue !== undefined) {
            this.hasPolicyValue = true;
            isConfigured = false; // The user did not manually configure the setting themselves.
            displayValue = inspected.policyValue;
            this.scopeValue = inspected.policyValue;
            this.defaultValue = inspected.defaultValue;
        }
        else if (languageSelector && this.languageOverrideValues.has(languageSelector)) {
            const overrideValues = this.languageOverrideValues.get(languageSelector);
            // In the worst case, go back to using the previous display value.
            // Also, sometimes the override is in the form of a default value override, so consider that second.
            displayValue = (isConfigured ? overrideValues[targetSelector] : overrideValues.defaultValue) ?? displayValue;
            this.scopeValue = isConfigured && overrideValues[targetSelector];
            this.defaultValue = overrideValues.defaultValue ?? inspected.defaultValue;
            const registryValues = Registry.as(Extensions.Configuration).getConfigurationDefaultsOverrides();
            const source = registryValues.get(`[${languageSelector}]`)?.source;
            const overrideValueSource = source instanceof Map ? source.get(this.setting.key) : undefined;
            if (overrideValueSource) {
                this.defaultValueSource = overrideValueSource;
            }
        }
        else {
            this.scopeValue = isConfigured && inspected[targetSelector];
            this.defaultValue = inspected.defaultValue;
        }
        this.value = displayValue;
        this.isConfigured = isConfigured;
        if (isConfigured || this.setting.tags || this.tags || this.setting.restricted || this.hasPolicyValue) {
            // Don't create an empty Set for all 1000 settings, only if needed
            this.tags = new Set();
            if (isConfigured) {
                this.tags.add(MODIFIED_SETTING_TAG);
            }
            this.setting.tags?.forEach(tag => this.tags.add(tag));
            if (this.setting.restricted) {
                this.tags.add(REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG);
            }
            if (this.hasPolicyValue) {
                this.tags.add(POLICY_SETTING_TAG);
            }
        }
    }
    matchesAllTags(tagFilters) {
        if (!tagFilters?.size) {
            // This setting, which may have tags,
            // matches against a query with no tags.
            return true;
        }
        if (!this.tags) {
            // The setting must inspect itself to get tag information
            // including for the hasPolicy tag.
            this.inspectSelf();
        }
        // Check that the filter tags are a subset of this setting's tags
        return !!this.tags?.size &&
            Array.from(tagFilters).every(tag => this.tags.has(tag));
    }
    matchesScope(scope, isRemote) {
        const configTarget = URI.isUri(scope) ? 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ : scope;
        if (!this.setting.scope) {
            return true;
        }
        if (configTarget === 1 /* ConfigurationTarget.APPLICATION */) {
            return APPLICATION_SCOPES.includes(this.setting.scope);
        }
        if (configTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            return FOLDER_SCOPES.includes(this.setting.scope);
        }
        if (configTarget === 5 /* ConfigurationTarget.WORKSPACE */) {
            return WORKSPACE_SCOPES.includes(this.setting.scope);
        }
        if (configTarget === 4 /* ConfigurationTarget.USER_REMOTE */) {
            return REMOTE_MACHINE_SCOPES.includes(this.setting.scope) || USER_LOCAL_AND_REMOTE_SETTINGS.includes(this.setting.key);
        }
        if (configTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            if (isRemote) {
                return LOCAL_MACHINE_SCOPES.includes(this.setting.scope) || USER_LOCAL_AND_REMOTE_SETTINGS.includes(this.setting.key);
            }
        }
        return true;
    }
    matchesAnyExtension(extensionFilters) {
        if (!extensionFilters || !extensionFilters.size) {
            return true;
        }
        if (!this.setting.extensionInfo) {
            return false;
        }
        return Array.from(extensionFilters).some(extensionId => extensionId.toLowerCase() === this.setting.extensionInfo.id.toLowerCase());
    }
    matchesAnyFeature(featureFilters) {
        if (!featureFilters || !featureFilters.size) {
            return true;
        }
        const features = tocData.children.find(child => child.id === 'features');
        return Array.from(featureFilters).some(filter => {
            if (features && features.children) {
                const feature = features.children.find(feature => 'features/' + filter === feature.id);
                if (feature) {
                    const patterns = feature.settings?.map(setting => createSettingMatchRegExp(setting));
                    return patterns && !this.setting.extensionInfo && patterns.some(pattern => pattern.test(this.setting.key.toLowerCase()));
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        });
    }
    matchesAnyId(idFilters) {
        if (!idFilters || !idFilters.size) {
            return true;
        }
        return idFilters.has(this.setting.key);
    }
    matchesAllLanguages(languageFilter) {
        if (!languageFilter) {
            // We're not filtering by language.
            return true;
        }
        if (!this.languageService.isRegisteredLanguageId(languageFilter)) {
            // We're trying to filter by an invalid language.
            return false;
        }
        // We have a language filter in the search widget at this point.
        // We decide to show all language overridable settings to make the
        // lang filter act more like a scope filter,
        // rather than adding on an implicit @modified as well.
        if (this.setting.scope === 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */) {
            return true;
        }
        return false;
    }
}
function createSettingMatchRegExp(pattern) {
    pattern = escapeRegExpCharacters(pattern)
        .replace(/\\\*/g, '.*');
    return new RegExp(`^${pattern}$`, 'i');
}
let SettingsTreeModel = class SettingsTreeModel {
    constructor(_viewState, _isWorkspaceTrusted, _configurationService, _languageService, _userDataProfileService, _productService) {
        this._viewState = _viewState;
        this._isWorkspaceTrusted = _isWorkspaceTrusted;
        this._configurationService = _configurationService;
        this._languageService = _languageService;
        this._userDataProfileService = _userDataProfileService;
        this._productService = _productService;
        this._treeElementsBySettingName = new Map();
    }
    get root() {
        return this._root;
    }
    update(newTocRoot = this._tocRoot) {
        this._treeElementsBySettingName.clear();
        const newRoot = this.createSettingsTreeGroupElement(newTocRoot);
        if (newRoot.children[0] instanceof SettingsTreeGroupElement) {
            newRoot.children[0].isFirstGroup = true;
        }
        if (this._root) {
            this.disposeChildren(this._root.children);
            this._root.children = newRoot.children;
            newRoot.dispose();
        }
        else {
            this._root = newRoot;
        }
    }
    updateWorkspaceTrust(workspaceTrusted) {
        this._isWorkspaceTrusted = workspaceTrusted;
        this.updateRequireTrustedTargetElements();
    }
    disposeChildren(children) {
        for (const child of children) {
            this.disposeChildAndRecurse(child);
        }
    }
    disposeChildAndRecurse(element) {
        if (element instanceof SettingsTreeGroupElement) {
            this.disposeChildren(element.children);
        }
        element.dispose();
    }
    getElementsByName(name) {
        return this._treeElementsBySettingName.get(name) ?? null;
    }
    updateElementsByName(name) {
        if (!this._treeElementsBySettingName.has(name)) {
            return;
        }
        this.reinspectSettings(this._treeElementsBySettingName.get(name));
    }
    updateRequireTrustedTargetElements() {
        this.reinspectSettings([...this._treeElementsBySettingName.values()].flat().filter(s => s.isUntrusted));
    }
    reinspectSettings(settings) {
        for (const element of settings) {
            element.inspectSelf();
        }
    }
    createSettingsTreeGroupElement(tocEntry, parent) {
        const depth = parent ? this.getDepth(parent) + 1 : 0;
        const element = new SettingsTreeGroupElement(tocEntry.id, undefined, tocEntry.label, depth, false);
        element.parent = parent;
        const children = [];
        if (tocEntry.settings) {
            const settingChildren = tocEntry.settings.map(s => this.createSettingsTreeSettingElement(s, element));
            for (const child of settingChildren) {
                if (!child.setting.deprecationMessage) {
                    children.push(child);
                }
                else {
                    child.inspectSelf();
                    if (child.isConfigured) {
                        children.push(child);
                    }
                    else {
                        child.dispose();
                    }
                }
            }
        }
        if (tocEntry.children) {
            const groupChildren = tocEntry.children.map(child => this.createSettingsTreeGroupElement(child, element));
            children.push(...groupChildren);
        }
        element.children = children;
        return element;
    }
    getDepth(element) {
        if (element.parent) {
            return 1 + this.getDepth(element.parent);
        }
        else {
            return 0;
        }
    }
    createSettingsTreeSettingElement(setting, parent) {
        const element = new SettingsTreeSettingElement(setting, parent, this._viewState.settingsTarget, this._isWorkspaceTrusted, this._viewState.languageFilter, this._languageService, this._productService, this._userDataProfileService, this._configurationService);
        const nameElements = this._treeElementsBySettingName.get(setting.key) ?? [];
        nameElements.push(element);
        this._treeElementsBySettingName.set(setting.key, nameElements);
        return element;
    }
    dispose() {
        this._treeElementsBySettingName.clear();
        this.disposeChildAndRecurse(this._root);
    }
};
SettingsTreeModel = __decorate([
    __param(2, IWorkbenchConfigurationService),
    __param(3, ILanguageService),
    __param(4, IUserDataProfileService),
    __param(5, IProductService)
], SettingsTreeModel);
export { SettingsTreeModel };
export function inspectSetting(key, target, languageFilter, configurationService) {
    const inspectOverrides = URI.isUri(target) ? { resource: target } : undefined;
    const inspected = configurationService.inspect(key, inspectOverrides);
    const targetSelector = target === 1 /* ConfigurationTarget.APPLICATION */ ? 'applicationValue' :
        target === 3 /* ConfigurationTarget.USER_LOCAL */ ? 'userLocalValue' :
            target === 4 /* ConfigurationTarget.USER_REMOTE */ ? 'userRemoteValue' :
                target === 5 /* ConfigurationTarget.WORKSPACE */ ? 'workspaceValue' :
                    'workspaceFolderValue';
    const targetOverrideSelector = target === 1 /* ConfigurationTarget.APPLICATION */ ? 'application' :
        target === 3 /* ConfigurationTarget.USER_LOCAL */ ? 'userLocal' :
            target === 4 /* ConfigurationTarget.USER_REMOTE */ ? 'userRemote' :
                target === 5 /* ConfigurationTarget.WORKSPACE */ ? 'workspace' :
                    'workspaceFolder';
    let isConfigured = typeof inspected[targetSelector] !== 'undefined';
    const overrideIdentifiers = inspected.overrideIdentifiers;
    const inspectedLanguageOverrides = new Map();
    // We must reset isConfigured to be false if languageFilter is set, and manually
    // determine whether it can be set to true later.
    if (languageFilter) {
        isConfigured = false;
    }
    if (overrideIdentifiers) {
        // The setting we're looking at has language overrides.
        for (const overrideIdentifier of overrideIdentifiers) {
            inspectedLanguageOverrides.set(overrideIdentifier, configurationService.inspect(key, { overrideIdentifier }));
        }
        // For all language filters, see if there's an override for that filter.
        if (languageFilter) {
            if (inspectedLanguageOverrides.has(languageFilter)) {
                const overrideValue = inspectedLanguageOverrides.get(languageFilter)[targetOverrideSelector]?.override;
                if (typeof overrideValue !== 'undefined') {
                    isConfigured = true;
                }
            }
        }
    }
    return { isConfigured, inspected, targetSelector, inspectedLanguageOverrides, languageSelector: languageFilter };
}
function sanitizeId(id) {
    return id.replace(/[\.\/]/, '_');
}
export function settingKeyToDisplayFormat(key, groupId = '', isLanguageTagSetting = false) {
    const lastDotIdx = key.lastIndexOf('.');
    let category = '';
    if (lastDotIdx >= 0) {
        category = key.substring(0, lastDotIdx);
        key = key.substring(lastDotIdx + 1);
    }
    groupId = groupId.replace(/\//g, '.');
    category = trimCategoryForGroup(category, groupId);
    category = wordifyKey(category);
    if (isLanguageTagSetting) {
        key = key.replace(/[\[\]]/g, '');
        key = '$(bracket) ' + key;
    }
    const label = wordifyKey(key);
    return { category, label };
}
function wordifyKey(key) {
    key = key
        .replace(/\.([a-z0-9])/g, (_, p1) => ` \u203A ${p1.toUpperCase()}`) // Replace dot with spaced '>'
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // Camel case to spacing, fooBar => foo Bar
        .replace(/^[a-z]/g, match => match.toUpperCase()) // Upper casing all first letters, foo => Foo
        .replace(/\b\w+\b/g, match => {
        return knownAcronyms.has(match.toLowerCase()) ?
            match.toUpperCase() :
            match;
    });
    for (const [k, v] of knownTermMappings) {
        key = key.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
    }
    return key;
}
/**
 * Removes redundant sections of the category label.
 * A redundant section is a section already reflected in the groupId.
 *
 * @param category The category of the specific setting.
 * @param groupId The author + extension ID.
 * @returns The new category label to use.
 */
function trimCategoryForGroup(category, groupId) {
    const doTrim = (forward) => {
        // Remove the Insiders portion if the category doesn't use it.
        if (!/insiders$/i.test(category)) {
            groupId = groupId.replace(/-?insiders$/i, '');
        }
        const parts = groupId.split('.')
            .map(part => {
            // Remove hyphens, but only if that results in a match with the category.
            if (part.replace(/-/g, '').toLowerCase() === category.toLowerCase()) {
                return part.replace(/-/g, '');
            }
            else {
                return part;
            }
        });
        while (parts.length) {
            const reg = new RegExp(`^${parts.join('\\.')}(\\.|$)`, 'i');
            if (reg.test(category)) {
                return category.replace(reg, '');
            }
            if (forward) {
                parts.pop();
            }
            else {
                parts.shift();
            }
        }
        return null;
    };
    let trimmed = doTrim(true);
    if (trimmed === null) {
        trimmed = doTrim(false);
    }
    if (trimmed === null) {
        trimmed = category;
    }
    return trimmed;
}
function isExtensionToggleSetting(setting, productService) {
    return ENABLE_EXTENSION_TOGGLE_SETTINGS &&
        !!productService.extensionRecommendations &&
        !!setting.displayExtensionId;
}
function isExcludeSetting(setting) {
    return setting.key === 'files.exclude' ||
        setting.key === 'search.exclude' ||
        setting.key === 'workbench.localHistory.exclude' ||
        setting.key === 'explorer.autoRevealExclude' ||
        setting.key === 'files.readonlyExclude' ||
        setting.key === 'files.watcherExclude';
}
function isIncludeSetting(setting) {
    return setting.key === 'files.readonlyInclude';
}
// The values of the following settings when a default values has been removed
export function objectSettingSupportsRemoveDefaultValue(key) {
    return key === 'workbench.editor.customLabels.patterns';
}
function isSimpleType(type) {
    return type === 'string' || type === 'boolean' || type === 'integer' || type === 'number';
}
function getObjectRenderableSchemaType(schema, key) {
    const { type } = schema;
    if (Array.isArray(type)) {
        if (objectSettingSupportsRemoveDefaultValue(key) && type.length === 2) {
            if (type.includes('null') && (type.includes('string') || type.includes('boolean') || type.includes('integer') || type.includes('number'))) {
                return 'simple';
            }
        }
        for (const t of type) {
            if (!isSimpleType(t)) {
                return false;
            }
        }
        return 'complex';
    }
    if (isSimpleType(type)) {
        return 'simple';
    }
    if (type === 'array') {
        if (schema.items) {
            const itemSchemas = Array.isArray(schema.items) ? schema.items : [schema.items];
            for (const { type } of itemSchemas) {
                if (Array.isArray(type)) {
                    for (const t of type) {
                        if (!isSimpleType(t)) {
                            return false;
                        }
                    }
                    return 'complex';
                }
                if (!isSimpleType(type)) {
                    return false;
                }
                return 'complex';
            }
        }
        return false;
    }
    return false;
}
function getObjectSettingSchemaType({ key, type, objectProperties, objectPatternProperties, objectAdditionalProperties }) {
    if (type !== 'object') {
        return false;
    }
    // object can have any shape
    if (isUndefinedOrNull(objectProperties) &&
        isUndefinedOrNull(objectPatternProperties) &&
        isUndefinedOrNull(objectAdditionalProperties)) {
        return false;
    }
    // objectAdditionalProperties allow the setting to have any shape,
    // but if there's a pattern property that handles everything, then every
    // property will match that patternProperty, so we don't need to look at
    // the value of objectAdditionalProperties in that case.
    if ((objectAdditionalProperties === true || objectAdditionalProperties === undefined)
        && !Object.keys(objectPatternProperties ?? {}).includes('.*')) {
        return false;
    }
    const schemas = [...Object.values(objectProperties ?? {}), ...Object.values(objectPatternProperties ?? {})];
    if (objectAdditionalProperties && typeof objectAdditionalProperties === 'object') {
        schemas.push(objectAdditionalProperties);
    }
    let schemaType = 'simple';
    for (const schema of schemas) {
        for (const subSchema of Array.isArray(schema.anyOf) ? schema.anyOf : [schema]) {
            const subSchemaType = getObjectRenderableSchemaType(subSchema, key);
            if (subSchemaType === false) {
                return false;
            }
            if (subSchemaType === 'complex') {
                schemaType = 'complex';
            }
        }
    }
    return schemaType;
}
function settingTypeEnumRenderable(_type) {
    const enumRenderableSettingTypes = ['string', 'boolean', 'null', 'integer', 'number'];
    const type = Array.isArray(_type) ? _type : [_type];
    return type.every(type => enumRenderableSettingTypes.includes(type));
}
export var SearchResultIdx;
(function (SearchResultIdx) {
    SearchResultIdx[SearchResultIdx["Local"] = 0] = "Local";
    SearchResultIdx[SearchResultIdx["Remote"] = 1] = "Remote";
    SearchResultIdx[SearchResultIdx["NewExtensions"] = 2] = "NewExtensions";
})(SearchResultIdx || (SearchResultIdx = {}));
let SearchResultModel = class SearchResultModel extends SettingsTreeModel {
    constructor(viewState, settingsOrderByTocIndex, isWorkspaceTrusted, configurationService, environmentService, languageService, userDataProfileService, productService) {
        super(viewState, isWorkspaceTrusted, configurationService, languageService, userDataProfileService, productService);
        this.environmentService = environmentService;
        this.rawSearchResults = null;
        this.cachedUniqueSearchResults = null;
        this.newExtensionSearchResults = null;
        this.searchResultCount = null;
        this.id = 'searchResultModel';
        this.settingsOrderByTocIndex = settingsOrderByTocIndex;
        this.update({ id: 'searchResultModel', label: '' });
    }
    sortResults(filterMatches) {
        if (this.settingsOrderByTocIndex) {
            for (const match of filterMatches) {
                match.setting.internalOrder = this.settingsOrderByTocIndex.get(match.setting.key);
            }
        }
        // The search only has filters, so we can sort by the order in the TOC.
        if (!this._viewState.query) {
            return filterMatches.sort((a, b) => compareTwoNullableNumbers(a.setting.internalOrder, b.setting.internalOrder));
        }
        // Sort the settings according to their relevancy.
        // https://github.com/microsoft/vscode/issues/197773
        filterMatches.sort((a, b) => {
            if (a.matchType !== b.matchType) {
                // Sort by match type if the match types are not the same.
                // The priority of the match type is given by the SettingMatchType enum.
                return b.matchType - a.matchType;
            }
            else if ((a.matchType & SettingMatchType.NonContiguousWordsInSettingsLabel) || (a.matchType & SettingMatchType.ContiguousWordsInSettingsLabel)) {
                // The match types of a and b are the same and can be sorted by their number of matched words.
                // If those numbers are the same, sort by the order in the table of contents.
                return (b.keyMatchScore - a.keyMatchScore) || compareTwoNullableNumbers(a.setting.internalOrder, b.setting.internalOrder);
            }
            else if (a.matchType === SettingMatchType.RemoteMatch) {
                // The match types are the same and are RemoteMatch.
                // Sort by score.
                return b.score - a.score;
            }
            else {
                // The match types are the same but are not RemoteMatch.
                // Sort by their order in the table of contents.
                return compareTwoNullableNumbers(a.setting.internalOrder, b.setting.internalOrder);
            }
        });
        // Remove duplicates, which sometimes occur with settings
        // such as the experimental toggle setting.
        return arrays.distinct(filterMatches, (match) => match.setting.key);
    }
    getUniqueResults() {
        if (this.cachedUniqueSearchResults) {
            return this.cachedUniqueSearchResults;
        }
        if (!this.rawSearchResults) {
            return null;
        }
        let combinedFilterMatches = [];
        const localMatchKeys = new Set();
        const localResult = this.rawSearchResults[0 /* SearchResultIdx.Local */];
        if (localResult) {
            localResult.filterMatches.forEach(m => localMatchKeys.add(m.setting.key));
            combinedFilterMatches = localResult.filterMatches;
        }
        const remoteResult = this.rawSearchResults[1 /* SearchResultIdx.Remote */];
        if (remoteResult) {
            remoteResult.filterMatches = remoteResult.filterMatches.filter(m => !localMatchKeys.has(m.setting.key));
            combinedFilterMatches = combinedFilterMatches.concat(remoteResult.filterMatches);
            this.newExtensionSearchResults = this.rawSearchResults[2 /* SearchResultIdx.NewExtensions */];
        }
        combinedFilterMatches = this.sortResults(combinedFilterMatches);
        this.cachedUniqueSearchResults = {
            filterMatches: combinedFilterMatches,
            exactMatch: localResult.exactMatch // remote results should never have an exact match
        };
        return this.cachedUniqueSearchResults;
    }
    getRawResults() {
        return this.rawSearchResults ?? [];
    }
    setResult(order, result) {
        this.cachedUniqueSearchResults = null;
        this.newExtensionSearchResults = null;
        this.rawSearchResults ??= [];
        if (!result) {
            delete this.rawSearchResults[order];
            return;
        }
        this.rawSearchResults[order] = result;
        this.updateChildren();
    }
    updateChildren() {
        this.update({
            id: 'searchResultModel',
            label: 'searchResultModel',
            settings: this.getFlatSettings()
        });
        // Save time by filtering children in the search model instead of relying on the tree filter, which still requires heights to be calculated.
        const isRemote = !!this.environmentService.remoteAuthority;
        const newChildren = [];
        for (const child of this.root.children) {
            if (child instanceof SettingsTreeSettingElement
                && child.matchesAllTags(this._viewState.tagFilters)
                && child.matchesScope(this._viewState.settingsTarget, isRemote)
                && child.matchesAnyExtension(this._viewState.extensionFilters)
                && child.matchesAnyId(this._viewState.idFilters)
                && child.matchesAnyFeature(this._viewState.featureFilters)
                && child.matchesAllLanguages(this._viewState.languageFilter)) {
                newChildren.push(child);
            }
            else {
                child.dispose();
            }
        }
        this.root.children = newChildren;
        this.searchResultCount = this.root.children.length;
        if (this.newExtensionSearchResults?.filterMatches.length) {
            let resultExtensionIds = this.newExtensionSearchResults.filterMatches
                .map(result => result.setting)
                .filter(setting => setting.extensionName && setting.extensionPublisher)
                .map(setting => `${setting.extensionPublisher}.${setting.extensionName}`);
            resultExtensionIds = arrays.distinct(resultExtensionIds);
            if (resultExtensionIds.length) {
                const newExtElement = new SettingsTreeNewExtensionsElement('newExtensions', resultExtensionIds);
                newExtElement.parent = this._root;
                this._root.children.push(newExtElement);
            }
        }
    }
    getUniqueResultsCount() {
        return this.searchResultCount ?? 0;
    }
    getFlatSettings() {
        return this.getUniqueResults()?.filterMatches.map(m => m.setting) ?? [];
    }
};
SearchResultModel = __decorate([
    __param(3, IWorkbenchConfigurationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ILanguageService),
    __param(6, IUserDataProfileService),
    __param(7, IProductService)
], SearchResultModel);
export { SearchResultModel };
const tagRegex = /(^|\s)@tag:("([^"]*)"|[^"]\S*)/g;
const extensionRegex = /(^|\s)@ext:("([^"]*)"|[^"]\S*)?/g;
const featureRegex = /(^|\s)@feature:("([^"]*)"|[^"]\S*)?/g;
const idRegex = /(^|\s)@id:("([^"]*)"|[^"]\S*)?/g;
const languageRegex = /(^|\s)@lang:("([^"]*)"|[^"]\S*)?/g;
export function parseQuery(query) {
    /**
     * A helper function to parse the query on one type of regex.
     *
     * @param query The search query
     * @param filterRegex The regex to use on the query
     * @param parsedParts The parts that the regex parses out will be appended to the array passed in here.
     * @returns The query with the parsed parts removed
     */
    function getTagsForType(query, filterRegex, parsedParts) {
        return query.replace(filterRegex, (_, __, quotedParsedElement, unquotedParsedElement) => {
            const parsedElement = unquotedParsedElement || quotedParsedElement;
            if (parsedElement) {
                parsedParts.push(...parsedElement.split(',').map(s => s.trim()).filter(s => !isFalsyOrWhitespace(s)));
            }
            return '';
        });
    }
    const tags = [];
    query = query.replace(tagRegex, (_, __, quotedTag, tag) => {
        tags.push(tag || quotedTag);
        return '';
    });
    query = query.replace(`@${MODIFIED_SETTING_TAG}`, () => {
        tags.push(MODIFIED_SETTING_TAG);
        return '';
    });
    query = query.replace(`@${POLICY_SETTING_TAG}`, () => {
        tags.push(POLICY_SETTING_TAG);
        return '';
    });
    const extensions = [];
    const features = [];
    const ids = [];
    const langs = [];
    query = getTagsForType(query, extensionRegex, extensions);
    query = getTagsForType(query, featureRegex, features);
    query = getTagsForType(query, idRegex, ids);
    if (ENABLE_LANGUAGE_FILTER) {
        query = getTagsForType(query, languageRegex, langs);
    }
    query = query.trim();
    // For now, only return the first found language filter
    return {
        tags,
        extensionFilters: extensions,
        featureFilters: features,
        idFilters: ids,
        languageFilter: langs.length ? langs[0] : undefined,
        query,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvc2V0dGluZ3NUcmVlTW9kZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JELE9BQU8sRUFBYSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDM0YsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLHNCQUFzQixFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLHFDQUFxQyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDaE4sT0FBTyxFQUE2RCxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BLLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsOEJBQThCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUzTSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9B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QUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO1FBQzNDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO1FBQzNDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1FBQzFDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO1FBQzNDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWE7WUFDckUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQy9FLElBQUksQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBQ3pDLENBQUM7YUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFB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