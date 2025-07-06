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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc1RyZWVNb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHckQsT0FBTyxFQUFhLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMzRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsc0JBQXNCLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUscUNBQXFDLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNoTixPQUFPLEVBQTZELGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDcEssT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSw4QkFBOEIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTNNLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FB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SSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUM7UUFDM0MsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUM7UUFDM0MsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7UUFDMUMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUM7UUFDM0MsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYTtZQUNyRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDL0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7UUFDekMsQ0FBQzthQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDcEksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFR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