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
var AbstractSettingRenderer_1, CopySettingIdAction_1, CopySettingAsJSONAction_1, CopySettingAsURLAction_1, SyncSettingAction_1, ApplySettingToAllProfilesAction_1;
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { renderMarkdownAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { SimpleIconLabel } from '../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { CachedListVirtualDelegate } from '../../../../base/browser/ui/list/list.js';
import { DefaultStyleController } from '../../../../base/browser/ui/list/listWidget.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { Toggle, unthemedToggleStyles } from '../../../../base/browser/ui/toggle/toggle.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { ObjectTreeModel } from '../../../../base/browser/ui/tree/objectTreeModel.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, isDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { isDefined, isUndefinedOrNull } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, getLanguageTagSettingPlainKey } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IListService, WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles, getInputBoxStyle, getListStyles, getSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorBackground, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { getIgnoredSettings } from '../../../../platform/userDataSync/common/settingsMerge.js';
import { IUserDataSyncEnablementService, getDefaultIgnoredSettings } from '../../../../platform/userDataSync/common/userDataSync.js';
import { APPLICATION_SCOPES, APPLY_ALL_PROFILES_SETTING, IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { SETTINGS_AUTHORITY, SettingValueType } from '../../../services/preferences/common/preferences.js';
import { getInvalidTypeError } from '../../../services/preferences/common/preferencesValidation.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { LANGUAGE_SETTING_TAG, SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU, compareTwoNullableNumbers } from '../common/preferences.js';
import { settingsNumberInputBackground, settingsNumberInputBorder, settingsNumberInputForeground, settingsSelectBackground, settingsSelectBorder, settingsSelectForeground, settingsSelectListBorder, settingsTextInputBackground, settingsTextInputBorder, settingsTextInputForeground } from '../common/settingsEditorColorRegistry.js';
import { settingsMoreActionIcon } from './preferencesIcons.js';
import { SettingsTreeIndicatorsLabel, getIndicatorsLabelAriaLabel } from './settingsEditorSettingIndicators.js';
import { SettingsTreeGroupElement, SettingsTreeNewExtensionsElement, SettingsTreeSettingElement, inspectSetting, objectSettingSupportsRemoveDefaultValue, settingKeyToDisplayFormat } from './settingsTreeModels.js';
import { ExcludeSettingWidget, IncludeSettingWidget, ListSettingWidget, ObjectSettingCheckboxWidget, ObjectSettingDropdownWidget } from './settingsWidgets.js';
const $ = DOM.$;
function getIncludeExcludeDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object'
        ? element.defaultValue ?? {}
        : {};
    const data = element.isConfigured ?
        { ...elementDefaultValue, ...element.scopeValue } :
        elementDefaultValue;
    return Object.keys(data)
        .filter(key => !!data[key])
        .map(key => {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] && element.setting.type === 'object' && element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(`${element.setting.key}.${key}`);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        const value = data[key];
        const sibling = typeof value === 'boolean' ? undefined : value.when;
        return {
            value: {
                type: 'string',
                data: key
            },
            sibling,
            elementType: element.valueType,
            source
        };
    });
}
function areAllPropertiesDefined(properties, itemsToDisplay) {
    const staticProperties = new Set(properties);
    itemsToDisplay.forEach(({ key }) => staticProperties.delete(key.data));
    return staticProperties.size === 0;
}
function getEnumOptionsFromSchema(schema) {
    if (schema.anyOf) {
        return schema.anyOf.map(getEnumOptionsFromSchema).flat();
    }
    const enumDescriptions = schema.enumDescriptions ?? [];
    return (schema.enum ?? []).map((value, idx) => {
        const description = idx < enumDescriptions.length
            ? enumDescriptions[idx]
            : undefined;
        return { value, description };
    });
}
function getObjectValueType(schema) {
    if (schema.anyOf) {
        const subTypes = schema.anyOf.map(getObjectValueType);
        if (subTypes.some(type => type === 'enum')) {
            return 'enum';
        }
        return 'string';
    }
    if (schema.type === 'boolean') {
        return 'boolean';
    }
    else if (schema.type === 'string' && isDefined(schema.enum) && schema.enum.length > 0) {
        return 'enum';
    }
    else {
        return 'string';
    }
}
function getObjectEntryValueDisplayValue(type, data, options) {
    if (type === 'boolean') {
        return { type, data: !!data };
    }
    else if (type === 'enum') {
        return { type, data: '' + data, options };
    }
    else {
        return { type, data: '' + data };
    }
}
function getObjectDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object'
        ? element.defaultValue ?? {}
        : {};
    const elementScopeValue = typeof element.scopeValue === 'object'
        ? element.scopeValue ?? {}
        : {};
    const data = element.isConfigured ?
        { ...elementDefaultValue, ...elementScopeValue } :
        element.hasPolicyValue ? element.scopeValue :
            elementDefaultValue;
    const { objectProperties, objectPatternProperties, objectAdditionalProperties } = element.setting;
    const patternsAndSchemas = Object
        .entries(objectPatternProperties ?? {})
        .map(([pattern, schema]) => ({
        pattern: new RegExp(pattern),
        schema
    }));
    const wellDefinedKeyEnumOptions = Object.entries(objectProperties ?? {}).map(([key, schema]) => ({ value: key, description: schema.description }));
    return Object.keys(data).map(key => {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] && element.setting.type === 'object' && element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(`${element.setting.key}.${key}`);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        if (isDefined(objectProperties) && key in objectProperties) {
            const valueEnumOptions = getEnumOptionsFromSchema(objectProperties[key]);
            return {
                key: {
                    type: 'enum',
                    data: key,
                    options: wellDefinedKeyEnumOptions,
                },
                value: getObjectEntryValueDisplayValue(getObjectValueType(objectProperties[key]), data[key], valueEnumOptions),
                keyDescription: objectProperties[key].description,
                removable: isUndefinedOrNull(defaultValue),
                resetable: !isUndefinedOrNull(defaultValue),
                source
            };
        }
        // The row is removable if it doesn't have a default value assigned or the setting supports removing the default value.
        // If a default value is assigned and the user modified the default, it can be reset back to the default.
        const removable = defaultValue === undefined || objectSettingSupportsRemoveDefaultValue(element.setting.key);
        const resetable = !!defaultValue && defaultValue !== data[key];
        const schema = patternsAndSchemas.find(({ pattern }) => pattern.test(key))?.schema;
        if (schema) {
            const valueEnumOptions = getEnumOptionsFromSchema(schema);
            return {
                key: { type: 'string', data: key },
                value: getObjectEntryValueDisplayValue(getObjectValueType(schema), data[key], valueEnumOptions),
                keyDescription: schema.description,
                removable,
                resetable,
                source
            };
        }
        const additionalValueEnums = getEnumOptionsFromSchema(typeof objectAdditionalProperties === 'boolean'
            ? {}
            : objectAdditionalProperties ?? {});
        return {
            key: { type: 'string', data: key },
            value: getObjectEntryValueDisplayValue(typeof objectAdditionalProperties === 'object' ? getObjectValueType(objectAdditionalProperties) : 'string', data[key], additionalValueEnums),
            keyDescription: typeof objectAdditionalProperties === 'object' ? objectAdditionalProperties.description : undefined,
            removable,
            resetable,
            source
        };
    }).filter(item => !isUndefinedOrNull(item.value.data));
}
function getBoolObjectDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object'
        ? element.defaultValue ?? {}
        : {};
    const elementScopeValue = typeof element.scopeValue === 'object'
        ? element.scopeValue ?? {}
        : {};
    const data = element.isConfigured ?
        { ...elementDefaultValue, ...elementScopeValue } :
        elementDefaultValue;
    const { objectProperties } = element.setting;
    const displayValues = [];
    for (const key in objectProperties) {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] && element.setting.type === 'object' && element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(key);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        displayValues.push({
            key: {
                type: 'string',
                data: key
            },
            value: {
                type: 'boolean',
                data: !!data[key]
            },
            keyDescription: objectProperties[key].description,
            removable: false,
            resetable: true,
            source
        });
    }
    return displayValues;
}
function createArraySuggester(element) {
    return (keys, idx) => {
        const enumOptions = [];
        if (element.setting.enum) {
            element.setting.enum.forEach((key, i) => {
                // include the currently selected value, even if uniqueItems is true
                if (!element.setting.uniqueItems || (idx !== undefined && key === keys[idx]) || !keys.includes(key)) {
                    const description = element.setting.enumDescriptions?.[i];
                    enumOptions.push({ value: key, description });
                }
            });
        }
        return enumOptions.length > 0
            ? { type: 'enum', data: enumOptions[0].value, options: enumOptions }
            : undefined;
    };
}
function createObjectKeySuggester(element) {
    const { objectProperties } = element.setting;
    const allStaticKeys = Object.keys(objectProperties ?? {});
    return keys => {
        const existingKeys = new Set(keys);
        const enumOptions = [];
        allStaticKeys.forEach(staticKey => {
            if (!existingKeys.has(staticKey)) {
                enumOptions.push({ value: staticKey, description: objectProperties[staticKey].description });
            }
        });
        return enumOptions.length > 0
            ? { type: 'enum', data: enumOptions[0].value, options: enumOptions }
            : undefined;
    };
}
function createObjectValueSuggester(element) {
    const { objectProperties, objectPatternProperties, objectAdditionalProperties } = element.setting;
    const patternsAndSchemas = Object
        .entries(objectPatternProperties ?? {})
        .map(([pattern, schema]) => ({
        pattern: new RegExp(pattern),
        schema
    }));
    return (key) => {
        let suggestedSchema;
        if (isDefined(objectProperties) && key in objectProperties) {
            suggestedSchema = objectProperties[key];
        }
        const patternSchema = suggestedSchema ?? patternsAndSchemas.find(({ pattern }) => pattern.test(key))?.schema;
        if (isDefined(patternSchema)) {
            suggestedSchema = patternSchema;
        }
        else if (isDefined(objectAdditionalProperties) && typeof objectAdditionalProperties === 'object') {
            suggestedSchema = objectAdditionalProperties;
        }
        if (isDefined(suggestedSchema)) {
            const type = getObjectValueType(suggestedSchema);
            if (type === 'boolean') {
                return { type, data: suggestedSchema.default ?? true };
            }
            else if (type === 'enum') {
                const options = getEnumOptionsFromSchema(suggestedSchema);
                return { type, data: suggestedSchema.default ?? options[0].value, options };
            }
            else {
                return { type, data: suggestedSchema.default ?? '' };
            }
        }
        return;
    };
}
function isNonNullableNumericType(type) {
    return type === 'number' || type === 'integer';
}
function parseNumericObjectValues(dataElement, v) {
    const newRecord = {};
    for (const key in v) {
        // Set to true/false once we're sure of the answer
        let keyMatchesNumericProperty;
        const patternProperties = dataElement.setting.objectPatternProperties;
        const properties = dataElement.setting.objectProperties;
        const additionalProperties = dataElement.setting.objectAdditionalProperties;
        // Match the current record key against the properties of the object
        if (properties) {
            for (const propKey in properties) {
                if (propKey === key) {
                    keyMatchesNumericProperty = isNonNullableNumericType(properties[propKey].type);
                    break;
                }
            }
        }
        if (keyMatchesNumericProperty === undefined && patternProperties) {
            for (const patternKey in patternProperties) {
                if (key.match(patternKey)) {
                    keyMatchesNumericProperty = isNonNullableNumericType(patternProperties[patternKey].type);
                    break;
                }
            }
        }
        if (keyMatchesNumericProperty === undefined && additionalProperties && typeof additionalProperties !== 'boolean') {
            if (isNonNullableNumericType(additionalProperties.type)) {
                keyMatchesNumericProperty = true;
            }
        }
        newRecord[key] = keyMatchesNumericProperty ? Number(v[key]) : v[key];
    }
    return newRecord;
}
function getListDisplayValue(element) {
    if (!element.value || !Array.isArray(element.value)) {
        return [];
    }
    if (element.setting.arrayItemType === 'enum') {
        let enumOptions = [];
        if (element.setting.enum) {
            enumOptions = element.setting.enum.map((setting, i) => {
                return {
                    value: setting,
                    description: element.setting.enumDescriptions?.[i]
                };
            });
        }
        return element.value.map((key) => {
            return {
                value: {
                    type: 'enum',
                    data: key,
                    options: enumOptions
                }
            };
        });
    }
    else {
        return element.value.map((key) => {
            return {
                value: {
                    type: 'string',
                    data: key
                }
            };
        });
    }
}
function getShowAddButtonList(dataElement, listDisplayValue) {
    if (dataElement.setting.enum && dataElement.setting.uniqueItems) {
        return dataElement.setting.enum.length - listDisplayValue.length > 0;
    }
    else {
        return true;
    }
}
export function resolveSettingsTree(tocData, coreSettingsGroups, logService) {
    const allSettings = getFlatSettings(coreSettingsGroups);
    return {
        tree: _resolveSettingsTree(tocData, allSettings, logService),
        leftoverSettings: allSettings
    };
}
export function resolveConfiguredUntrustedSettings(groups, target, languageFilter, configurationService) {
    const allSettings = getFlatSettings(groups);
    return [...allSettings].filter(setting => setting.restricted && inspectSetting(setting.key, target, languageFilter, configurationService).isConfigured);
}
export async function createTocTreeForExtensionSettings(extensionService, groups) {
    const extGroupTree = new Map();
    const addEntryToTree = (extensionId, extensionName, childEntry) => {
        if (!extGroupTree.has(extensionId)) {
            const rootEntry = {
                id: extensionId,
                label: extensionName,
                children: []
            };
            extGroupTree.set(extensionId, rootEntry);
        }
        extGroupTree.get(extensionId).children.push(childEntry);
    };
    const processGroupEntry = async (group) => {
        const flatSettings = group.sections.map(section => section.settings).flat();
        const extensionId = group.extensionInfo.id;
        const extension = await extensionService.getExtension(extensionId);
        const extensionName = extension?.displayName ?? extension?.name ?? extensionId;
        // There could be multiple groups with the same extension id that all belong to the same extension.
        // To avoid highlighting all groups upon expanding the extension's ToC entry,
        // use the group ID only if it is non-empty and isn't the extension ID.
        // Ref https://github.com/microsoft/vscode/issues/241521.
        const settingGroupId = (group.id && group.id !== extensionId) ? group.id : group.title;
        const childEntry = {
            id: settingGroupId,
            label: group.title,
            order: group.order,
            settings: flatSettings
        };
        addEntryToTree(extensionId, extensionName, childEntry);
    };
    const processPromises = groups.map(g => processGroupEntry(g));
    return Promise.all(processPromises).then(() => {
        const extGroups = [];
        for (const extensionRootEntry of extGroupTree.values()) {
            for (const child of extensionRootEntry.children) {
                // Sort the individual settings of the child by order.
                // Leave the undefined order settings untouched.
                child.settings?.sort((a, b) => {
                    return compareTwoNullableNumbers(a.order, b.order);
                });
            }
            if (extensionRootEntry.children.length === 1) {
                // There is a single category for this extension.
                // Push a flattened setting.
                extGroups.push({
                    id: extensionRootEntry.id,
                    label: extensionRootEntry.children[0].label,
                    settings: extensionRootEntry.children[0].settings
                });
            }
            else {
                // Sort the categories.
                // Leave the undefined order categories untouched.
                extensionRootEntry.children.sort((a, b) => {
                    return compareTwoNullableNumbers(a.order, b.order);
                });
                // If there is a category that matches the setting name,
                // add the settings in manually as "ungrouped" settings.
                // https://github.com/microsoft/vscode/issues/137259
                const ungroupedChild = extensionRootEntry.children.find(child => child.label === extensionRootEntry.label);
                if (ungroupedChild && !ungroupedChild.children) {
                    const groupedChildren = extensionRootEntry.children.filter(child => child !== ungroupedChild);
                    extGroups.push({
                        id: extensionRootEntry.id,
                        label: extensionRootEntry.label,
                        settings: ungroupedChild.settings,
                        children: groupedChildren
                    });
                }
                else {
                    // Push all the groups as-is.
                    extGroups.push(extensionRootEntry);
                }
            }
        }
        // Sort the outermost settings.
        extGroups.sort((a, b) => a.label.localeCompare(b.label));
        return {
            id: 'extensions',
            label: localize('extensions', "Extensions"),
            children: extGroups
        };
    });
}
function _resolveSettingsTree(tocData, allSettings, logService) {
    let children;
    if (tocData.children) {
        children = tocData.children
            .filter(child => child.hide !== true)
            .map(child => _resolveSettingsTree(child, allSettings, logService))
            .filter(child => child.children?.length || child.settings?.length);
    }
    let settings;
    if (tocData.settings) {
        settings = tocData.settings.map(pattern => getMatchingSettings(allSettings, pattern, logService)).flat();
    }
    if (!children && !settings) {
        throw new Error(`TOC node has no child groups or settings: ${tocData.id}`);
    }
    return {
        id: tocData.id,
        label: tocData.label,
        children,
        settings
    };
}
const knownDynamicSettingGroups = [
    /^settingsSync\..*/,
    /^sync\..*/,
    /^workbench.fontAliasing$/,
];
function getMatchingSettings(allSettings, pattern, logService) {
    const result = [];
    allSettings.forEach(s => {
        if (settingMatches(s, pattern)) {
            result.push(s);
            allSettings.delete(s);
        }
    });
    if (!result.length && !knownDynamicSettingGroups.some(r => r.test(pattern))) {
        logService.warn(`Settings pattern "${pattern}" doesn't match any settings`);
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
}
const settingPatternCache = new Map();
export function createSettingMatchRegExp(pattern) {
    pattern = escapeRegExpCharacters(pattern)
        .replace(/\\\*/g, '.*');
    return new RegExp(`^${pattern}$`, 'i');
}
function settingMatches(s, pattern) {
    let regExp = settingPatternCache.get(pattern);
    if (!regExp) {
        regExp = createSettingMatchRegExp(pattern);
        settingPatternCache.set(pattern, regExp);
    }
    return regExp.test(s.key);
}
function getFlatSettings(settingsGroups) {
    const result = new Set();
    for (const group of settingsGroups) {
        for (const section of group.sections) {
            for (const s of section.settings) {
                if (!s.overrides || !s.overrides.length) {
                    result.add(s);
                }
            }
        }
    }
    return result;
}
const SETTINGS_TEXT_TEMPLATE_ID = 'settings.text.template';
const SETTINGS_MULTILINE_TEXT_TEMPLATE_ID = 'settings.multilineText.template';
const SETTINGS_NUMBER_TEMPLATE_ID = 'settings.number.template';
const SETTINGS_ENUM_TEMPLATE_ID = 'settings.enum.template';
const SETTINGS_BOOL_TEMPLATE_ID = 'settings.bool.template';
const SETTINGS_ARRAY_TEMPLATE_ID = 'settings.array.template';
const SETTINGS_EXCLUDE_TEMPLATE_ID = 'settings.exclude.template';
const SETTINGS_INCLUDE_TEMPLATE_ID = 'settings.include.template';
const SETTINGS_OBJECT_TEMPLATE_ID = 'settings.object.template';
const SETTINGS_BOOL_OBJECT_TEMPLATE_ID = 'settings.boolObject.template';
const SETTINGS_COMPLEX_TEMPLATE_ID = 'settings.complex.template';
const SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID = 'settings.complexObject.template';
const SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID = 'settings.newExtensions.template';
const SETTINGS_ELEMENT_TEMPLATE_ID = 'settings.group.template';
const SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID = 'settings.extensionToggle.template';
function removeChildrenFromTabOrder(node) {
    const focusableElements = node.querySelectorAll(`
		[tabindex="0"],
		input:not([tabindex="-1"]),
		select:not([tabindex="-1"]),
		textarea:not([tabindex="-1"]),
		a:not([tabindex="-1"]),
		button:not([tabindex="-1"]),
		area:not([tabindex="-1"])
	`);
    focusableElements.forEach(element => {
        element.setAttribute(AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR, 'true');
        element.setAttribute('tabindex', '-1');
    });
}
function addChildrenToTabOrder(node) {
    const focusableElements = node.querySelectorAll(`[${AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR}="true"]`);
    focusableElements.forEach(element => {
        element.removeAttribute(AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR);
        element.setAttribute('tabindex', '0');
    });
}
let AbstractSettingRenderer = class AbstractSettingRenderer extends Disposable {
    static { AbstractSettingRenderer_1 = this; }
    static { this.CONTROL_CLASS = 'setting-control-focus-target'; }
    static { this.CONTROL_SELECTOR = '.' + this.CONTROL_CLASS; }
    static { this.CONTENTS_CLASS = 'setting-item-contents'; }
    static { this.CONTENTS_SELECTOR = '.' + this.CONTENTS_CLASS; }
    static { this.ALL_ROWS_SELECTOR = '.monaco-list-row'; }
    static { this.SETTING_KEY_ATTR = 'data-key'; }
    static { this.SETTING_ID_ATTR = 'data-id'; }
    static { this.ELEMENT_FOCUSABLE_ATTR = 'data-focusable'; }
    constructor(settingActions, disposableActionFactory, _themeService, _contextViewService, _openerService, _instantiationService, _commandService, _contextMenuService, _keybindingService, _configService, _extensionsService, _extensionsWorkbenchService, _productService, _telemetryService, _hoverService) {
        super();
        this.settingActions = settingActions;
        this.disposableActionFactory = disposableActionFactory;
        this._themeService = _themeService;
        this._contextViewService = _contextViewService;
        this._openerService = _openerService;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._configService = _configService;
        this._extensionsService = _extensionsService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._productService = _productService;
        this._telemetryService = _telemetryService;
        this._hoverService = _hoverService;
        this._onDidClickOverrideElement = this._register(new Emitter());
        this.onDidClickOverrideElement = this._onDidClickOverrideElement.event;
        this._onDidChangeSetting = this._register(new Emitter());
        this.onDidChangeSetting = this._onDidChangeSetting.event;
        this._onDidOpenSettings = this._register(new Emitter());
        this.onDidOpenSettings = this._onDidOpenSettings.event;
        this._onDidClickSettingLink = this._register(new Emitter());
        this.onDidClickSettingLink = this._onDidClickSettingLink.event;
        this._onDidFocusSetting = this._register(new Emitter());
        this.onDidFocusSetting = this._onDidFocusSetting.event;
        this._onDidChangeIgnoredSettings = this._register(new Emitter());
        this.onDidChangeIgnoredSettings = this._onDidChangeIgnoredSettings.event;
        this._onDidChangeSettingHeight = this._register(new Emitter());
        this.onDidChangeSettingHeight = this._onDidChangeSettingHeight.event;
        this._onApplyFilter = this._register(new Emitter());
        this.onApplyFilter = this._onApplyFilter.event;
        this.markdownRenderer = _instantiationService.createInstance(MarkdownRenderer, {});
        this.ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this._configService);
        this._register(this._configService.onDidChangeConfiguration(e => {
            this.ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this._configService);
            this._onDidChangeIgnoredSettings.fire();
        }));
    }
    renderCommonTemplate(tree, _container, typeClass) {
        _container.classList.add('setting-item');
        _container.classList.add('setting-item-' + typeClass);
        const toDispose = new DisposableStore();
        const container = DOM.append(_container, $(AbstractSettingRenderer_1.CONTENTS_SELECTOR));
        container.classList.add('settings-row-inner-container');
        const titleElement = DOM.append(container, $('.setting-item-title'));
        const labelCategoryContainer = DOM.append(titleElement, $('.setting-item-cat-label-container'));
        const categoryElement = DOM.append(labelCategoryContainer, $('span.setting-item-category'));
        const labelElementContainer = DOM.append(labelCategoryContainer, $('span.setting-item-label'));
        const labelElement = toDispose.add(new SimpleIconLabel(labelElementContainer));
        const indicatorsLabel = toDispose.add(this._instantiationService.createInstance(SettingsTreeIndicatorsLabel, titleElement));
        const descriptionElement = DOM.append(container, $('.setting-item-description'));
        const modifiedIndicatorElement = DOM.append(container, $('.setting-item-modified-indicator'));
        toDispose.add(this._hoverService.setupDelayedHover(modifiedIndicatorElement, {
            content: localize('modified', "The setting has been configured in the current scope.")
        }));
        const valueElement = DOM.append(container, $('.setting-item-value'));
        const controlElement = DOM.append(valueElement, $('div.setting-item-control'));
        const deprecationWarningElement = DOM.append(container, $('.setting-item-deprecation-message'));
        const toolbarContainer = DOM.append(container, $('.setting-toolbar-container'));
        const toolbar = this.renderSettingToolbar(toolbarContainer);
        const template = {
            toDispose,
            elementDisposables: toDispose.add(new DisposableStore()),
            containerElement: container,
            categoryElement,
            labelElement,
            descriptionElement,
            controlElement,
            deprecationWarningElement,
            indicatorsLabel,
            toolbar
        };
        // Prevent clicks from being handled by list
        toDispose.add(DOM.addDisposableListener(controlElement, DOM.EventType.MOUSE_DOWN, e => e.stopPropagation()));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_ENTER, e => container.classList.add('mouseover')));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_LEAVE, e => container.classList.remove('mouseover')));
        return template;
    }
    addSettingElementFocusHandler(template) {
        const focusTracker = DOM.trackFocus(template.containerElement);
        template.toDispose.add(focusTracker);
        template.toDispose.add(focusTracker.onDidBlur(() => {
            if (template.containerElement.classList.contains('focused')) {
                template.containerElement.classList.remove('focused');
            }
        }));
        template.toDispose.add(focusTracker.onDidFocus(() => {
            template.containerElement.classList.add('focused');
            if (template.context) {
                this._onDidFocusSetting.fire(template.context);
            }
        }));
    }
    renderSettingToolbar(container) {
        const toggleMenuKeybinding = this._keybindingService.lookupKeybinding(SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU);
        let toggleMenuTitle = localize('settingsContextMenuTitle', "More Actions... ");
        if (toggleMenuKeybinding) {
            toggleMenuTitle += ` (${toggleMenuKeybinding && toggleMenuKeybinding.getLabel()})`;
        }
        const toolbar = new ToolBar(container, this._contextMenuService, {
            toggleMenuTitle,
            renderDropdownAsChildElement: !isIOS,
            moreIcon: settingsMoreActionIcon
        });
        return toolbar;
    }
    renderSettingElement(node, index, template) {
        const element = node.element;
        // The element must inspect itself to get information for
        // the modified indicator and the overridden Settings indicators.
        element.inspectSelf();
        template.context = element;
        template.toolbar.context = element;
        const actions = this.disposableActionFactory(element.setting, element.settingsTarget);
        actions.forEach(a => isDisposable(a) && template.elementDisposables.add(a));
        template.toolbar.setActions([], [...this.settingActions, ...actions]);
        const setting = element.setting;
        template.containerElement.classList.toggle('is-configured', element.isConfigured);
        template.containerElement.setAttribute(AbstractSettingRenderer_1.SETTING_KEY_ATTR, element.setting.key);
        template.containerElement.setAttribute(AbstractSettingRenderer_1.SETTING_ID_ATTR, element.id);
        const titleTooltip = setting.key + (element.isConfigured ? ' - Modified' : '');
        template.categoryElement.textContent = element.displayCategory ? (element.displayCategory + ': ') : '';
        template.elementDisposables.add(this._hoverService.setupDelayedHover(template.categoryElement, { content: titleTooltip }));
        template.labelElement.text = element.displayLabel;
        template.labelElement.title = titleTooltip;
        template.descriptionElement.innerText = '';
        if (element.setting.descriptionIsMarkdown) {
            const renderedDescription = this.renderSettingMarkdown(element, template.containerElement, element.description, template.elementDisposables);
            template.descriptionElement.appendChild(renderedDescription);
        }
        else {
            template.descriptionElement.innerText = element.description;
        }
        template.indicatorsLabel.updateScopeOverrides(element, this._onDidClickOverrideElement, this._onApplyFilter);
        template.elementDisposables.add(this._configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(APPLY_ALL_PROFILES_SETTING)) {
                template.indicatorsLabel.updateScopeOverrides(element, this._onDidClickOverrideElement, this._onApplyFilter);
            }
        }));
        const onChange = (value) => this._onDidChangeSetting.fire({
            key: element.setting.key,
            value,
            type: template.context.valueType,
            manualReset: false,
            scope: element.setting.scope
        });
        const deprecationText = element.setting.deprecationMessage || '';
        if (deprecationText && element.setting.deprecationMessageIsMarkdown) {
            template.deprecationWarningElement.innerText = '';
            template.deprecationWarningElement.appendChild(this.renderSettingMarkdown(element, template.containerElement, element.setting.deprecationMessage, template.elementDisposables));
        }
        else {
            template.deprecationWarningElement.innerText = deprecationText;
        }
        template.deprecationWarningElement.prepend($('.codicon.codicon-error'));
        template.containerElement.classList.toggle('is-deprecated', !!deprecationText);
        this.renderValue(element, template, onChange);
        template.indicatorsLabel.updateWorkspaceTrust(element);
        template.indicatorsLabel.updateSyncIgnored(element, this.ignoredSettings);
        template.indicatorsLabel.updateDefaultOverrideIndicator(element);
        template.indicatorsLabel.updatePreviewIndicator(element);
        template.elementDisposables.add(this.onDidChangeIgnoredSettings(() => {
            template.indicatorsLabel.updateSyncIgnored(element, this.ignoredSettings);
        }));
        this.updateSettingTabbable(element, template);
        template.elementDisposables.add(element.onDidChangeTabbable(() => {
            this.updateSettingTabbable(element, template);
        }));
    }
    updateSettingTabbable(element, template) {
        if (element.tabbable) {
            addChildrenToTabOrder(template.containerElement);
        }
        else {
            removeChildrenFromTabOrder(template.containerElement);
        }
    }
    renderSettingMarkdown(element, container, text, disposables) {
        // Rewrite `#editor.fontSize#` to link format
        text = fixSettingLinks(text);
        const renderedMarkdown = this.markdownRenderer.render({ value: text, isTrusted: true }, {
            actionHandler: {
                callback: (content) => {
                    if (content.startsWith('#')) {
                        const e = {
                            source: element,
                            targetKey: content.substring(1)
                        };
                        this._onDidClickSettingLink.fire(e);
                    }
                    else {
                        this._openerService.open(content, { allowCommands: true }).catch(onUnexpectedError);
                    }
                },
                disposables
            },
            asyncRenderCallback: () => {
                const height = container.clientHeight;
                if (height) {
                    this._onDidChangeSettingHeight.fire({ element, height });
                }
            },
        });
        disposables.add(renderedMarkdown);
        renderedMarkdown.element.classList.add('setting-item-markdown');
        cleanRenderedMarkdown(renderedMarkdown.element);
        return renderedMarkdown.element;
    }
    disposeTemplate(template) {
        template.toDispose.dispose();
    }
    disposeElement(_element, _index, template, _height) {
        template.elementDisposables?.clear();
    }
};
AbstractSettingRenderer = AbstractSettingRenderer_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IContextViewService),
    __param(4, IOpenerService),
    __param(5, IInstantiationService),
    __param(6, ICommandService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, IConfigurationService),
    __param(10, IExtensionService),
    __param(11, IExtensionsWorkbenchService),
    __param(12, IProductService),
    __param(13, ITelemetryService),
    __param(14, IHoverService)
], AbstractSettingRenderer);
export { AbstractSettingRenderer };
class SettingGroupRenderer {
    constructor() {
        this.templateId = SETTINGS_ELEMENT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        container.classList.add('group-title');
        const template = {
            parent: container,
            toDispose: new DisposableStore()
        };
        return template;
    }
    renderElement(element, index, templateData) {
        templateData.parent.innerText = '';
        const labelElement = DOM.append(templateData.parent, $('div.settings-group-title-label.settings-row-inner-container'));
        labelElement.classList.add(`settings-group-level-${element.element.level}`);
        labelElement.textContent = element.element.label;
        if (element.element.isFirstGroup) {
            labelElement.classList.add('settings-group-first');
        }
    }
    disposeTemplate(templateData) {
        templateData.toDispose.dispose();
    }
}
let SettingNewExtensionsRenderer = class SettingNewExtensionsRenderer {
    constructor(_commandService) {
        this._commandService = _commandService;
        this.templateId = SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const toDispose = new DisposableStore();
        container.classList.add('setting-item-new-extensions');
        const button = new Button(container, { title: true, ...defaultButtonStyles });
        toDispose.add(button);
        toDispose.add(button.onDidClick(() => {
            if (template.context) {
                this._commandService.executeCommand('workbench.extensions.action.showExtensionsWithIds', template.context.extensionIds);
            }
        }));
        button.label = localize('newExtensionsButtonLabel', "Show matching extensions");
        button.element.classList.add('settings-new-extensions-button');
        const template = {
            button,
            toDispose
        };
        return template;
    }
    renderElement(element, index, templateData) {
        templateData.context = element.element;
    }
    disposeTemplate(template) {
        template.toDispose.dispose();
    }
};
SettingNewExtensionsRenderer = __decorate([
    __param(0, ICommandService)
], SettingNewExtensionsRenderer);
export { SettingNewExtensionsRenderer };
export class SettingComplexRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_COMPLEX_TEMPLATE_ID;
    }
    static { this.EDIT_IN_JSON_LABEL = localize('editInSettingsJson', "Edit in settings.json"); }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'complex');
        const openSettingsButton = DOM.append(common.controlElement, $('a.edit-in-settings-button'));
        openSettingsButton.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        openSettingsButton.role = 'button';
        const validationErrorMessageElement = $('.setting-item-validation-message');
        common.containerElement.appendChild(validationErrorMessageElement);
        const template = {
            ...common,
            button: openSettingsButton,
            validationErrorMessageElement
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const plainKey = getLanguageTagSettingPlainKey(dataElement.setting.key);
        const editLanguageSettingLabel = localize('editLanguageSettingLabel', "Edit settings for {0}", plainKey);
        const isLanguageTagSetting = dataElement.setting.isLanguageTagSetting;
        template.button.textContent = isLanguageTagSetting
            ? editLanguageSettingLabel
            : SettingComplexRenderer.EDIT_IN_JSON_LABEL;
        const onClickOrKeydown = (e) => {
            if (isLanguageTagSetting) {
                this._onApplyFilter.fire(`@${LANGUAGE_SETTING_TAG}${plainKey}`);
            }
            else {
                this._onDidOpenSettings.fire(dataElement.setting.key);
            }
            e.preventDefault();
            e.stopPropagation();
        };
        template.elementDisposables.add(DOM.addDisposableListener(template.button, DOM.EventType.CLICK, (e) => {
            onClickOrKeydown(e);
        }));
        template.elementDisposables.add(DOM.addDisposableListener(template.button, DOM.EventType.KEY_DOWN, (e) => {
            const ev = new StandardKeyboardEvent(e);
            if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                onClickOrKeydown(e);
            }
        }));
        this.renderValidations(dataElement, template);
        if (isLanguageTagSetting) {
            template.button.setAttribute('aria-label', editLanguageSettingLabel);
        }
        else {
            template.button.setAttribute('aria-label', `${SettingComplexRenderer.EDIT_IN_JSON_LABEL}: ${dataElement.setting.key}`);
        }
    }
    renderValidations(dataElement, template) {
        const errMsg = dataElement.isConfigured && getInvalidTypeError(dataElement.value, dataElement.setting.type);
        if (errMsg) {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            return;
        }
        template.containerElement.classList.remove('invalid-input');
    }
}
class SettingComplexObjectRenderer extends SettingComplexRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const objectSettingWidget = common.toDispose.add(this._instantiationService.createInstance(ObjectSettingDropdownWidget, common.controlElement));
        objectSettingWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        const openSettingsButton = DOM.append(DOM.append(common.controlElement, $('.complex-object-edit-in-settings-button-container')), $('a.complex-object.edit-in-settings-button'));
        openSettingsButton.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        openSettingsButton.role = 'button';
        const validationErrorMessageElement = $('.setting-item-validation-message');
        common.containerElement.appendChild(validationErrorMessageElement);
        const template = {
            ...common,
            button: openSettingsButton,
            validationErrorMessageElement,
            objectSettingWidget
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderValue(dataElement, template, onChange) {
        const items = getObjectDisplayValue(dataElement);
        template.objectSettingWidget.setValue(items, {
            settingKey: dataElement.setting.key,
            showAddButton: false,
            isReadOnly: true,
        });
        template.button.parentElement?.classList.toggle('hide', dataElement.hasPolicyValue);
        super.renderValue(dataElement, template, onChange);
    }
}
class SettingArrayRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_ARRAY_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const descriptionElement = common.containerElement.querySelector('.setting-item-description');
        const validationErrorMessageElement = $('.setting-item-validation-message');
        descriptionElement.after(validationErrorMessageElement);
        const listWidget = this._instantiationService.createInstance(ListSettingWidget, common.controlElement);
        listWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(listWidget);
        const template = {
            ...common,
            listWidget,
            validationErrorMessageElement
        };
        this.addSettingElementFocusHandler(template);
        common.toDispose.add(listWidget.onDidChangeList(e => {
            const newList = this.computeNewList(template, e);
            template.onChange?.(newList);
        }));
        return template;
    }
    computeNewList(template, e) {
        if (template.context) {
            let newValue = [];
            if (Array.isArray(template.context.scopeValue)) {
                newValue = [...template.context.scopeValue];
            }
            else if (Array.isArray(template.context.value)) {
                newValue = [...template.context.value];
            }
            if (e.type === 'move') {
                // A drag and drop occurred
                const sourceIndex = e.sourceIndex;
                const targetIndex = e.targetIndex;
                const splicedElem = newValue.splice(sourceIndex, 1)[0];
                newValue.splice(targetIndex, 0, splicedElem);
            }
            else if (e.type === 'remove' || e.type === 'reset') {
                newValue.splice(e.targetIndex, 1);
            }
            else if (e.type === 'change') {
                const itemValueData = e.newItem.value.data.toString();
                // Update value
                if (e.targetIndex > -1) {
                    newValue[e.targetIndex] = itemValueData;
                }
                // For some reason, we are updating and cannot find original value
                // Just append the value in this case
                else {
                    newValue.push(itemValueData);
                }
            }
            else if (e.type === 'add') {
                newValue.push(e.newItem.value.data.toString());
            }
            if (template.context.defaultValue &&
                Array.isArray(template.context.defaultValue) &&
                template.context.defaultValue.length === newValue.length &&
                template.context.defaultValue.join() === newValue.join()) {
                return undefined;
            }
            return newValue;
        }
        return undefined;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const value = getListDisplayValue(dataElement);
        const keySuggester = dataElement.setting.enum ? createArraySuggester(dataElement) : undefined;
        template.listWidget.setValue(value, {
            showAddButton: getShowAddButtonList(dataElement, value),
            keySuggester
        });
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.listWidget.cancelEdit();
        }));
        template.onChange = (v) => {
            if (v && !renderArrayValidations(dataElement, template, v, false)) {
                const itemType = dataElement.setting.arrayItemType;
                const arrToSave = isNonNullableNumericType(itemType) ? v.map(a => +a) : v;
                onChange(arrToSave);
            }
            else {
                // Save the setting unparsed and containing the errors.
                // renderArrayValidations will render relevant error messages.
                onChange(v);
            }
        };
        renderArrayValidations(dataElement, template, value.map(v => v.value.data.toString()), true);
    }
}
class AbstractSettingObjectRenderer extends AbstractSettingRenderer {
    renderTemplateWithWidget(common, widget) {
        widget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(widget);
        const descriptionElement = common.containerElement.querySelector('.setting-item-description');
        const validationErrorMessageElement = $('.setting-item-validation-message');
        descriptionElement.after(validationErrorMessageElement);
        const template = {
            ...common,
            validationErrorMessageElement
        };
        if (widget instanceof ObjectSettingCheckboxWidget) {
            template.objectCheckboxWidget = widget;
        }
        else {
            template.objectDropdownWidget = widget;
        }
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
}
class SettingObjectRenderer extends AbstractSettingObjectRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const widget = this._instantiationService.createInstance(ObjectSettingDropdownWidget, common.controlElement);
        const template = this.renderTemplateWithWidget(common, widget);
        common.toDispose.add(widget.onDidChangeList(e => {
            this.onDidChangeObject(template, e);
        }));
        return template;
    }
    onDidChangeObject(template, e) {
        const widget = template.objectDropdownWidget;
        if (template.context) {
            const settingSupportsRemoveDefault = objectSettingSupportsRemoveDefaultValue(template.context.setting.key);
            const defaultValue = typeof template.context.defaultValue === 'object'
                ? template.context.defaultValue ?? {}
                : {};
            const scopeValue = typeof template.context.scopeValue === 'object'
                ? template.context.scopeValue ?? {}
                : {};
            const newValue = { ...template.context.scopeValue }; // Initialize with scoped values as removed default values are not rendered
            const newItems = [];
            widget.items.forEach((item, idx) => {
                // Item was updated
                if ((e.type === 'change' || e.type === 'move') && e.targetIndex === idx) {
                    // If the key of the default value is changed, remove the default value
                    if (e.originalItem.key.data !== e.newItem.key.data && settingSupportsRemoveDefault && e.originalItem.key.data in defaultValue) {
                        newValue[e.originalItem.key.data] = null;
                    }
                    else {
                        delete newValue[e.originalItem.key.data];
                    }
                    newValue[e.newItem.key.data] = e.newItem.value.data;
                    newItems.push(e.newItem);
                }
                // All remaining items, but skip the one that we just updated
                else if ((e.type !== 'change' && e.type !== 'move') || e.newItem.key.data !== item.key.data) {
                    newValue[item.key.data] = item.value.data;
                    newItems.push(item);
                }
            });
            // Item was deleted
            if (e.type === 'remove' || e.type === 'reset') {
                const objectKey = e.originalItem.key.data;
                const removingDefaultValue = e.type === 'remove' && settingSupportsRemoveDefault && defaultValue[objectKey] === e.originalItem.value.data;
                if (removingDefaultValue) {
                    newValue[objectKey] = null;
                }
                else {
                    delete newValue[objectKey];
                }
                const itemToDelete = newItems.findIndex(item => item.key.data === objectKey);
                const defaultItemValue = defaultValue[objectKey];
                // Item does not have a default or default is bing removed
                if (removingDefaultValue || isUndefinedOrNull(defaultValue[objectKey]) && itemToDelete > -1) {
                    newItems.splice(itemToDelete, 1);
                }
                else if (!removingDefaultValue && itemToDelete > -1) {
                    newItems[itemToDelete].value.data = defaultItemValue;
                }
            }
            // New item was added
            else if (e.type === 'add') {
                newValue[e.newItem.key.data] = e.newItem.value.data;
                newItems.push(e.newItem);
            }
            Object.entries(newValue).forEach(([key, value]) => {
                // value from the scope has changed back to the default
                if (scopeValue[key] !== value && defaultValue[key] === value && !(settingSupportsRemoveDefault && value === null)) {
                    delete newValue[key];
                }
            });
            const newObject = Object.keys(newValue).length === 0 ? undefined : newValue;
            template.objectDropdownWidget.setValue(newItems);
            template.onChange?.(newObject);
        }
    }
    renderValue(dataElement, template, onChange) {
        const items = getObjectDisplayValue(dataElement);
        const { key, objectProperties, objectPatternProperties, objectAdditionalProperties } = dataElement.setting;
        template.objectDropdownWidget.setValue(items, {
            settingKey: key,
            showAddButton: objectAdditionalProperties === false
                ? (!areAllPropertiesDefined(Object.keys(objectProperties ?? {}), items) ||
                    isDefined(objectPatternProperties))
                : true,
            keySuggester: createObjectKeySuggester(dataElement),
            valueSuggester: createObjectValueSuggester(dataElement)
        });
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.objectDropdownWidget.cancelEdit();
        }));
        template.onChange = (v) => {
            if (v && !renderArrayValidations(dataElement, template, v, false)) {
                const parsedRecord = parseNumericObjectValues(dataElement, v);
                onChange(parsedRecord);
            }
            else {
                // Save the setting unparsed and containing the errors.
                // renderArrayValidations will render relevant error messages.
                onChange(v);
            }
        };
        renderArrayValidations(dataElement, template, dataElement.value, true);
    }
}
class SettingBoolObjectRenderer extends AbstractSettingObjectRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_BOOL_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const widget = this._instantiationService.createInstance(ObjectSettingCheckboxWidget, common.controlElement);
        const template = this.renderTemplateWithWidget(common, widget);
        common.toDispose.add(widget.onDidChangeList(e => {
            this.onDidChangeObject(template, e);
        }));
        return template;
    }
    onDidChangeObject(template, e) {
        if (template.context) {
            const widget = template.objectCheckboxWidget;
            const defaultValue = typeof template.context.defaultValue === 'object'
                ? template.context.defaultValue ?? {}
                : {};
            const scopeValue = typeof template.context.scopeValue === 'object'
                ? template.context.scopeValue ?? {}
                : {};
            const newValue = { ...template.context.scopeValue }; // Initialize with scoped values as removed default values are not rendered
            const newItems = [];
            if (e.type !== 'change') {
                console.warn('Unexpected event type', e.type, 'for bool object setting', template.context.setting.key);
                return;
            }
            widget.items.forEach((item, idx) => {
                // Item was updated
                if (e.targetIndex === idx) {
                    newValue[e.newItem.key.data] = e.newItem.value.data;
                    newItems.push(e.newItem);
                }
                // All remaining items, but skip the one that we just updated
                else if (e.newItem.key.data !== item.key.data) {
                    newValue[item.key.data] = item.value.data;
                    newItems.push(item);
                }
            });
            Object.entries(newValue).forEach(([key, value]) => {
                // value from the scope has changed back to the default
                if (scopeValue[key] !== value && defaultValue[key] === value) {
                    delete newValue[key];
                }
            });
            const newObject = Object.keys(newValue).length === 0 ? undefined : newValue;
            template.objectCheckboxWidget.setValue(newItems);
            template.onChange?.(newObject);
            // Focus this setting explicitly, in case we were previously
            // focused on another setting and clicked a checkbox/value container
            // for this setting.
            this._onDidFocusSetting.fire(template.context);
        }
    }
    renderValue(dataElement, template, onChange) {
        const items = getBoolObjectDisplayValue(dataElement);
        const { key } = dataElement.setting;
        template.objectCheckboxWidget.setValue(items, {
            settingKey: key
        });
        template.context = dataElement;
        template.onChange = (v) => {
            onChange(v);
        };
    }
}
class SettingIncludeExcludeRenderer extends AbstractSettingRenderer {
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const includeExcludeWidget = this._instantiationService.createInstance(this.isExclude() ? ExcludeSettingWidget : IncludeSettingWidget, common.controlElement);
        includeExcludeWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(includeExcludeWidget);
        const template = {
            ...common,
            includeExcludeWidget
        };
        this.addSettingElementFocusHandler(template);
        common.toDispose.add(includeExcludeWidget.onDidChangeList(e => this.onDidChangeIncludeExclude(template, e)));
        return template;
    }
    onDidChangeIncludeExclude(template, e) {
        if (template.context) {
            const newValue = { ...template.context.scopeValue };
            // first delete the existing entry, if present
            if (e.type !== 'add') {
                if (e.originalItem.value.data.toString() in template.context.defaultValue) {
                    // delete a default by overriding it
                    newValue[e.originalItem.value.data.toString()] = false;
                }
                else {
                    delete newValue[e.originalItem.value.data.toString()];
                }
            }
            // then add the new or updated entry, if present
            if (e.type === 'change' || e.type === 'add' || e.type === 'move') {
                if (e.newItem.value.data.toString() in template.context.defaultValue && !e.newItem.sibling) {
                    // add a default by deleting its override
                    delete newValue[e.newItem.value.data.toString()];
                }
                else {
                    newValue[e.newItem.value.data.toString()] = e.newItem.sibling ? { when: e.newItem.sibling } : true;
                }
            }
            function sortKeys(obj) {
                const sortedKeys = Object.keys(obj)
                    .sort((a, b) => a.localeCompare(b));
                const retVal = {};
                for (const key of sortedKeys) {
                    retVal[key] = obj[key];
                }
                return retVal;
            }
            this._onDidChangeSetting.fire({
                key: template.context.setting.key,
                value: Object.keys(newValue).length === 0 ? undefined : sortKeys(newValue),
                type: template.context.valueType,
                manualReset: false,
                scope: template.context.setting.scope
            });
        }
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const value = getIncludeExcludeDisplayValue(dataElement);
        template.includeExcludeWidget.setValue(value);
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.includeExcludeWidget.cancelEdit();
        }));
    }
}
class SettingExcludeRenderer extends SettingIncludeExcludeRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_EXCLUDE_TEMPLATE_ID;
    }
    isExclude() {
        return true;
    }
}
class SettingIncludeRenderer extends SettingIncludeExcludeRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_INCLUDE_TEMPLATE_ID;
    }
    isExclude() {
        return false;
    }
}
const settingsInputBoxStyles = getInputBoxStyle({
    inputBackground: settingsTextInputBackground,
    inputForeground: settingsTextInputForeground,
    inputBorder: settingsTextInputBorder
});
class AbstractSettingTextRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.MULTILINE_MAX_HEIGHT = 150;
    }
    renderTemplate(_container, useMultiline) {
        const common = this.renderCommonTemplate(null, _container, 'text');
        const validationErrorMessageElement = DOM.append(common.containerElement, $('.setting-item-validation-message'));
        const inputBoxOptions = {
            flexibleHeight: useMultiline,
            flexibleWidth: false,
            flexibleMaxHeight: this.MULTILINE_MAX_HEIGHT,
            inputBoxStyles: settingsInputBoxStyles
        };
        const inputBox = new InputBox(common.controlElement, this._contextViewService, inputBoxOptions);
        common.toDispose.add(inputBox);
        common.toDispose.add(inputBox.onDidChange(e => {
            template.onChange?.(e);
        }));
        common.toDispose.add(inputBox);
        inputBox.inputElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        inputBox.inputElement.tabIndex = 0;
        const template = {
            ...common,
            inputBox,
            validationErrorMessageElement
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.onChange = undefined;
        template.inputBox.value = dataElement.value;
        template.inputBox.setAriaLabel(dataElement.setting.key);
        template.onChange = value => {
            if (!renderValidations(dataElement, template, false)) {
                onChange(value);
            }
        };
        renderValidations(dataElement, template, true);
    }
}
class SettingTextRenderer extends AbstractSettingTextRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_TEXT_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        const template = super.renderTemplate(_container, false);
        // TODO@9at8: listWidget filters out all key events from input boxes, so we need to come up with a better way
        // Disable ArrowUp and ArrowDown behaviour in favor of list navigation
        template.toDispose.add(DOM.addStandardDisposableListener(template.inputBox.inputElement, DOM.EventType.KEY_DOWN, e => {
            if (e.equals(16 /* KeyCode.UpArrow */) || e.equals(18 /* KeyCode.DownArrow */)) {
                e.preventDefault();
            }
        }));
        return template;
    }
}
class SettingMultilineTextRenderer extends AbstractSettingTextRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_MULTILINE_TEXT_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        return super.renderTemplate(_container, true);
    }
    renderValue(dataElement, template, onChange) {
        const onChangeOverride = (value) => {
            // Ensure the model is up to date since a different value will be rendered as different height when probing the height.
            dataElement.value = value;
            onChange(value);
        };
        super.renderValue(dataElement, template, onChangeOverride);
        template.elementDisposables.add(template.inputBox.onDidHeightChange(e => {
            const height = template.containerElement.clientHeight;
            // Don't fire event if height is reported as 0,
            // which sometimes happens when clicking onto a new setting.
            if (height) {
                this._onDidChangeSettingHeight.fire({
                    element: dataElement,
                    height: template.containerElement.clientHeight
                });
            }
        }));
        template.inputBox.layout();
    }
}
class SettingEnumRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_ENUM_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'enum');
        const styles = getSelectBoxStyles({
            selectBackground: settingsSelectBackground,
            selectForeground: settingsSelectForeground,
            selectBorder: settingsSelectBorder,
            selectListBorder: settingsSelectListBorder
        });
        const selectBox = new SelectBox([], 0, this._contextViewService, styles, {
            useCustomDrawn: !(isIOS && BrowserFeatures.pointerEvents)
        });
        common.toDispose.add(selectBox);
        selectBox.render(common.controlElement);
        const selectElement = common.controlElement.querySelector('select');
        if (selectElement) {
            selectElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
            selectElement.tabIndex = 0;
        }
        common.toDispose.add(selectBox.onDidSelect(e => {
            template.onChange?.(e.index);
        }));
        const enumDescriptionElement = common.containerElement.insertBefore($('.setting-item-enumDescription'), common.descriptionElement.nextSibling);
        const template = {
            ...common,
            selectBox,
            selectElement,
            enumDescriptionElement
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        // Make shallow copies here so that we don't modify the actual dataElement later
        const enumItemLabels = dataElement.setting.enumItemLabels ? [...dataElement.setting.enumItemLabels] : [];
        const enumDescriptions = dataElement.setting.enumDescriptions ? [...dataElement.setting.enumDescriptions] : [];
        const settingEnum = [...dataElement.setting.enum];
        const enumDescriptionsAreMarkdown = dataElement.setting.enumDescriptionsAreMarkdown;
        const disposables = new DisposableStore();
        template.elementDisposables.add(disposables);
        let createdDefault = false;
        if (!settingEnum.includes(dataElement.defaultValue)) {
            // Add a new potentially blank default setting
            settingEnum.unshift(dataElement.defaultValue);
            enumDescriptions.unshift('');
            enumItemLabels.unshift('');
            createdDefault = true;
        }
        // Use String constructor in case of null or undefined values
        const stringifiedDefaultValue = escapeInvisibleChars(String(dataElement.defaultValue));
        const displayOptions = settingEnum
            .map(String)
            .map(escapeInvisibleChars)
            .map((data, index) => {
            const description = (enumDescriptions[index] && (enumDescriptionsAreMarkdown ? fixSettingLinks(enumDescriptions[index], false) : enumDescriptions[index]));
            return {
                text: enumItemLabels[index] ? enumItemLabels[index] : data,
                detail: enumItemLabels[index] ? data : '',
                description,
                descriptionIsMarkdown: enumDescriptionsAreMarkdown,
                descriptionMarkdownActionHandler: {
                    callback: (content) => {
                        this._openerService.open(content).catch(onUnexpectedError);
                    },
                    disposables: disposables
                },
                decoratorRight: (((data === stringifiedDefaultValue) || (createdDefault && index === 0)) ? localize('settings.Default', "default") : '')
            };
        });
        template.selectBox.setOptions(displayOptions);
        template.selectBox.setAriaLabel(dataElement.setting.key);
        let idx = settingEnum.indexOf(dataElement.value);
        if (idx === -1) {
            idx = 0;
        }
        template.onChange = undefined;
        template.selectBox.select(idx);
        template.onChange = (idx) => {
            if (createdDefault && idx === 0) {
                onChange(dataElement.defaultValue);
            }
            else {
                onChange(settingEnum[idx]);
            }
        };
        template.enumDescriptionElement.innerText = '';
    }
}
const settingsNumberInputBoxStyles = getInputBoxStyle({
    inputBackground: settingsNumberInputBackground,
    inputForeground: settingsNumberInputForeground,
    inputBorder: settingsNumberInputBorder
});
class SettingNumberRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_NUMBER_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        const common = super.renderCommonTemplate(null, _container, 'number');
        const validationErrorMessageElement = DOM.append(common.containerElement, $('.setting-item-validation-message'));
        const inputBox = new InputBox(common.controlElement, this._contextViewService, { type: 'number', inputBoxStyles: settingsNumberInputBoxStyles });
        common.toDispose.add(inputBox);
        common.toDispose.add(inputBox.onDidChange(e => {
            template.onChange?.(e);
        }));
        common.toDispose.add(inputBox);
        inputBox.inputElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        inputBox.inputElement.tabIndex = 0;
        const template = {
            ...common,
            inputBox,
            validationErrorMessageElement
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const numParseFn = (dataElement.valueType === 'integer' || dataElement.valueType === 'nullable-integer')
            ? parseInt : parseFloat;
        const nullNumParseFn = (dataElement.valueType === 'nullable-integer' || dataElement.valueType === 'nullable-number')
            ? ((v) => v === '' ? null : numParseFn(v)) : numParseFn;
        template.onChange = undefined;
        template.inputBox.value = typeof dataElement.value === 'number' ?
            dataElement.value.toString() : '';
        template.inputBox.step = dataElement.valueType.includes('integer') ? '1' : 'any';
        template.inputBox.setAriaLabel(dataElement.setting.key);
        template.onChange = value => {
            if (!renderValidations(dataElement, template, false)) {
                onChange(nullNumParseFn(value));
            }
        };
        renderValidations(dataElement, template, true);
    }
}
class SettingBoolRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_BOOL_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        _container.classList.add('setting-item');
        _container.classList.add('setting-item-bool');
        const toDispose = new DisposableStore();
        const container = DOM.append(_container, $(AbstractSettingRenderer.CONTENTS_SELECTOR));
        container.classList.add('settings-row-inner-container');
        const titleElement = DOM.append(container, $('.setting-item-title'));
        const categoryElement = DOM.append(titleElement, $('span.setting-item-category'));
        const labelElementContainer = DOM.append(titleElement, $('span.setting-item-label'));
        const labelElement = toDispose.add(new SimpleIconLabel(labelElementContainer));
        const indicatorsLabel = this._instantiationService.createInstance(SettingsTreeIndicatorsLabel, titleElement);
        const descriptionAndValueElement = DOM.append(container, $('.setting-item-value-description'));
        const controlElement = DOM.append(descriptionAndValueElement, $('.setting-item-bool-control'));
        const descriptionElement = DOM.append(descriptionAndValueElement, $('.setting-item-description'));
        const modifiedIndicatorElement = DOM.append(container, $('.setting-item-modified-indicator'));
        toDispose.add(this._hoverService.setupDelayedHover(modifiedIndicatorElement, {
            content: localize('modified', "The setting has been configured in the current scope.")
        }));
        const deprecationWarningElement = DOM.append(container, $('.setting-item-deprecation-message'));
        const checkbox = new Toggle({ icon: Codicon.check, actionClassName: 'setting-value-checkbox', isChecked: true, title: '', ...unthemedToggleStyles });
        controlElement.appendChild(checkbox.domNode);
        toDispose.add(checkbox);
        toDispose.add(checkbox.onChange(() => {
            template.onChange(checkbox.checked);
        }));
        // Need to listen for mouse clicks on description and toggle checkbox - use target ID for safety
        // Also have to ignore embedded links - too buried to stop propagation
        toDispose.add(DOM.addDisposableListener(descriptionElement, DOM.EventType.MOUSE_DOWN, (e) => {
            const targetElement = e.target;
            // Toggle target checkbox
            if (targetElement.tagName.toLowerCase() !== 'a') {
                template.checkbox.checked = !template.checkbox.checked;
                template.onChange(checkbox.checked);
            }
            DOM.EventHelper.stop(e);
        }));
        checkbox.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        const toolbarContainer = DOM.append(container, $('.setting-toolbar-container'));
        const toolbar = this.renderSettingToolbar(toolbarContainer);
        toDispose.add(toolbar);
        const template = {
            toDispose,
            elementDisposables: toDispose.add(new DisposableStore()),
            containerElement: container,
            categoryElement,
            labelElement,
            controlElement,
            checkbox,
            descriptionElement,
            deprecationWarningElement,
            indicatorsLabel,
            toolbar
        };
        this.addSettingElementFocusHandler(template);
        // Prevent clicks from being handled by list
        toDispose.add(DOM.addDisposableListener(controlElement, 'mousedown', (e) => e.stopPropagation()));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_ENTER, e => container.classList.add('mouseover')));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_LEAVE, e => container.classList.remove('mouseover')));
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.onChange = undefined;
        template.checkbox.checked = dataElement.value;
        template.checkbox.setTitle(dataElement.setting.key);
        template.onChange = onChange;
    }
}
class SettingsExtensionToggleRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID;
        this._onDidDismissExtensionSetting = this._register(new Emitter());
        this.onDidDismissExtensionSetting = this._onDidDismissExtensionSetting.event;
    }
    renderTemplate(_container) {
        const common = super.renderCommonTemplate(null, _container, 'extension-toggle');
        const actionButton = new Button(common.containerElement, {
            title: false,
            ...defaultButtonStyles
        });
        actionButton.element.classList.add('setting-item-extension-toggle-button');
        actionButton.label = localize('showExtension', "Show Extension");
        const dismissButton = new Button(common.containerElement, {
            title: false,
            secondary: true,
            ...defaultButtonStyles
        });
        dismissButton.element.classList.add('setting-item-extension-dismiss-button');
        dismissButton.label = localize('dismiss', "Dismiss");
        const template = {
            ...common,
            actionButton,
            dismissButton
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.elementDisposables.clear();
        const extensionId = dataElement.setting.displayExtensionId;
        template.elementDisposables.add(template.actionButton.onDidClick(async () => {
            this._telemetryService.publicLog2('ManageExtensionClick', { extensionId });
            this._commandService.executeCommand('extension.open', extensionId);
        }));
        template.elementDisposables.add(template.dismissButton.onDidClick(async () => {
            this._telemetryService.publicLog2('DismissExtensionClick', { extensionId });
            this._onDidDismissExtensionSetting.fire(extensionId);
        }));
    }
}
let SettingTreeRenderers = class SettingTreeRenderers extends Disposable {
    constructor(_instantiationService, _contextMenuService, _contextViewService, _userDataSyncEnablementService) {
        super();
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._contextViewService = _contextViewService;
        this._userDataSyncEnablementService = _userDataSyncEnablementService;
        this._onDidChangeSetting = this._register(new Emitter());
        this.settingActions = [
            new Action('settings.resetSetting', localize('resetSettingLabel', "Reset Setting"), undefined, undefined, async (context) => {
                if (context instanceof SettingsTreeSettingElement) {
                    if (!context.isUntrusted) {
                        this._onDidChangeSetting.fire({
                            key: context.setting.key,
                            value: undefined,
                            type: context.setting.type,
                            manualReset: true,
                            scope: context.setting.scope
                        });
                    }
                }
            }),
            new Separator(),
            this._instantiationService.createInstance(CopySettingIdAction),
            this._instantiationService.createInstance(CopySettingAsJSONAction),
            this._instantiationService.createInstance(CopySettingAsURLAction),
        ];
        const actionFactory = (setting, settingTarget) => this.getActionsForSetting(setting, settingTarget);
        const emptyActionFactory = (_) => [];
        const extensionRenderer = this._instantiationService.createInstance(SettingsExtensionToggleRenderer, [], emptyActionFactory);
        const settingRenderers = [
            this._instantiationService.createInstance(SettingBoolRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingNumberRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingArrayRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingComplexRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingComplexObjectRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingTextRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingMultilineTextRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingExcludeRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingIncludeRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingEnumRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingObjectRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingBoolObjectRenderer, this.settingActions, actionFactory),
            extensionRenderer
        ];
        this.onDidClickOverrideElement = Event.any(...settingRenderers.map(r => r.onDidClickOverrideElement));
        this.onDidChangeSetting = Event.any(...settingRenderers.map(r => r.onDidChangeSetting), this._onDidChangeSetting.event);
        this.onDidDismissExtensionSetting = extensionRenderer.onDidDismissExtensionSetting;
        this.onDidOpenSettings = Event.any(...settingRenderers.map(r => r.onDidOpenSettings));
        this.onDidClickSettingLink = Event.any(...settingRenderers.map(r => r.onDidClickSettingLink));
        this.onDidFocusSetting = Event.any(...settingRenderers.map(r => r.onDidFocusSetting));
        this.onDidChangeSettingHeight = Event.any(...settingRenderers.map(r => r.onDidChangeSettingHeight));
        this.onApplyFilter = Event.any(...settingRenderers.map(r => r.onApplyFilter));
        this.allRenderers = [
            ...settingRenderers,
            this._instantiationService.createInstance(SettingGroupRenderer),
            this._instantiationService.createInstance(SettingNewExtensionsRenderer),
        ];
    }
    getActionsForSetting(setting, settingTarget) {
        const actions = [];
        if (!(setting.scope && APPLICATION_SCOPES.includes(setting.scope)) && settingTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            actions.push(this._instantiationService.createInstance(ApplySettingToAllProfilesAction, setting));
        }
        if (this._userDataSyncEnablementService.isEnabled() && !setting.disallowSyncIgnore) {
            actions.push(this._instantiationService.createInstance(SyncSettingAction, setting));
        }
        if (actions.length) {
            actions.splice(0, 0, new Separator());
        }
        return actions;
    }
    cancelSuggesters() {
        this._contextViewService.hideContextView();
    }
    showContextMenu(element, settingDOMElement) {
        const toolbarElement = settingDOMElement.querySelector('.monaco-toolbar');
        if (toolbarElement) {
            this._contextMenuService.showContextMenu({
                getActions: () => this.settingActions,
                getAnchor: () => toolbarElement,
                getActionsContext: () => element
            });
        }
    }
    getSettingDOMElementForDOMElement(domElement) {
        const parent = DOM.findParentWithClass(domElement, AbstractSettingRenderer.CONTENTS_CLASS);
        if (parent) {
            return parent;
        }
        return null;
    }
    getDOMElementsForSettingKey(treeContainer, key) {
        return treeContainer.querySelectorAll(`[${AbstractSettingRenderer.SETTING_KEY_ATTR}="${key}"]`);
    }
    getKeyForDOMElementInSetting(element) {
        const settingElement = this.getSettingDOMElementForDOMElement(element);
        return settingElement && settingElement.getAttribute(AbstractSettingRenderer.SETTING_KEY_ATTR);
    }
    getIdForDOMElementInSetting(element) {
        const settingElement = this.getSettingDOMElementForDOMElement(element);
        return settingElement && settingElement.getAttribute(AbstractSettingRenderer.SETTING_ID_ATTR);
    }
    dispose() {
        super.dispose();
        this.settingActions.forEach(action => {
            if (isDisposable(action)) {
                action.dispose();
            }
        });
        this.allRenderers.forEach(renderer => {
            if (isDisposable(renderer)) {
                renderer.dispose();
            }
        });
    }
};
SettingTreeRenderers = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextMenuService),
    __param(2, IContextViewService),
    __param(3, IUserDataSyncEnablementService)
], SettingTreeRenderers);
export { SettingTreeRenderers };
/**
 * Validate and render any error message. Returns true if the value is invalid.
 */
function renderValidations(dataElement, template, calledOnStartup) {
    if (dataElement.setting.validator) {
        const errMsg = dataElement.setting.validator(template.inputBox.value);
        if (errMsg) {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            const validationError = localize('validationError', "Validation Error.");
            template.inputBox.inputElement.parentElement.setAttribute('aria-label', [validationError, errMsg].join(' '));
            if (!calledOnStartup) {
                aria.status(validationError + ' ' + errMsg);
            }
            return true;
        }
        else {
            template.inputBox.inputElement.parentElement.removeAttribute('aria-label');
        }
    }
    template.containerElement.classList.remove('invalid-input');
    return false;
}
/**
 * Validate and render any error message for arrays. Returns true if the value is invalid.
 */
function renderArrayValidations(dataElement, template, value, calledOnStartup) {
    template.containerElement.classList.add('invalid-input');
    if (dataElement.setting.validator) {
        const errMsg = dataElement.setting.validator(value);
        if (errMsg && errMsg !== '') {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            const validationError = localize('validationError', "Validation Error.");
            template.containerElement.setAttribute('aria-label', [dataElement.setting.key, validationError, errMsg].join(' '));
            if (!calledOnStartup) {
                aria.status(validationError + ' ' + errMsg);
            }
            return true;
        }
        else {
            template.containerElement.setAttribute('aria-label', dataElement.setting.key);
            template.containerElement.classList.remove('invalid-input');
        }
    }
    return false;
}
function cleanRenderedMarkdown(element) {
    for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes.item(i);
        const tagName = child.tagName && child.tagName.toLowerCase();
        if (tagName === 'img') {
            child.remove();
        }
        else {
            cleanRenderedMarkdown(child);
        }
    }
}
function fixSettingLinks(text, linkify = true) {
    return text.replace(/`#([^#\s`]+)#`|'#([^#\s']+)#'/g, (match, backticksGroup, quotesGroup) => {
        const settingKey = backticksGroup ?? quotesGroup;
        const targetDisplayFormat = settingKeyToDisplayFormat(settingKey);
        const targetName = `${targetDisplayFormat.category}: ${targetDisplayFormat.label}`;
        return linkify ?
            `[${targetName}](#${settingKey} "${settingKey}")` :
            `"${targetName}"`;
    });
}
function escapeInvisibleChars(enumValue) {
    return enumValue && enumValue
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
let SettingsTreeFilter = class SettingsTreeFilter {
    constructor(viewState, environmentService) {
        this.viewState = viewState;
        this.environmentService = environmentService;
    }
    filter(element, parentVisibility) {
        // Filter during search
        if (this.viewState.filterToCategory && element instanceof SettingsTreeSettingElement) {
            if (!this.settingContainedInGroup(element.setting, this.viewState.filterToCategory)) {
                return false;
            }
        }
        // Non-user scope selected
        if (element instanceof SettingsTreeSettingElement && this.viewState.settingsTarget !== 3 /* ConfigurationTarget.USER_LOCAL */) {
            const isRemote = !!this.environmentService.remoteAuthority;
            if (!element.matchesScope(this.viewState.settingsTarget, isRemote)) {
                return false;
            }
        }
        // Group with no visible children
        if (element instanceof SettingsTreeGroupElement) {
            if (typeof element.count === 'number') {
                return element.count > 0;
            }
            return 2 /* TreeVisibility.Recurse */;
        }
        // Filtered "new extensions" button
        if (element instanceof SettingsTreeNewExtensionsElement) {
            if (this.viewState.tagFilters?.size || this.viewState.filterToCategory) {
                return false;
            }
        }
        return true;
    }
    settingContainedInGroup(setting, group) {
        return group.children.some(child => {
            if (child instanceof SettingsTreeGroupElement) {
                return this.settingContainedInGroup(setting, child);
            }
            else if (child instanceof SettingsTreeSettingElement) {
                return child.setting.key === setting.key;
            }
            else {
                return false;
            }
        });
    }
};
SettingsTreeFilter = __decorate([
    __param(1, IWorkbenchEnvironmentService)
], SettingsTreeFilter);
export { SettingsTreeFilter };
class SettingsTreeDelegate extends CachedListVirtualDelegate {
    getTemplateId(element) {
        if (element instanceof SettingsTreeGroupElement) {
            return SETTINGS_ELEMENT_TEMPLATE_ID;
        }
        if (element instanceof SettingsTreeSettingElement) {
            if (element.valueType === SettingValueType.ExtensionToggle) {
                return SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID;
            }
            const invalidTypeError = element.isConfigured && getInvalidTypeError(element.value, element.setting.type);
            if (invalidTypeError) {
                return SETTINGS_COMPLEX_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Boolean) {
                return SETTINGS_BOOL_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Integer ||
                element.valueType === SettingValueType.Number ||
                element.valueType === SettingValueType.NullableInteger ||
                element.valueType === SettingValueType.NullableNumber) {
                return SETTINGS_NUMBER_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.MultilineString) {
                return SETTINGS_MULTILINE_TEXT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.String) {
                return SETTINGS_TEXT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Enum) {
                return SETTINGS_ENUM_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Array) {
                return SETTINGS_ARRAY_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Exclude) {
                return SETTINGS_EXCLUDE_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Include) {
                return SETTINGS_INCLUDE_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Object) {
                return SETTINGS_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.BooleanObject) {
                return SETTINGS_BOOL_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.ComplexObject) {
                return SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.LanguageTag) {
                return SETTINGS_COMPLEX_TEMPLATE_ID;
            }
            return SETTINGS_COMPLEX_TEMPLATE_ID;
        }
        if (element instanceof SettingsTreeNewExtensionsElement) {
            return SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID;
        }
        throw new Error('unknown element type: ' + element);
    }
    hasDynamicHeight(element) {
        return !(element instanceof SettingsTreeGroupElement);
    }
    estimateHeight(element) {
        if (element instanceof SettingsTreeGroupElement) {
            return 42;
        }
        return element instanceof SettingsTreeSettingElement && element.valueType === SettingValueType.Boolean ? 78 : 104;
    }
}
export class NonCollapsibleObjectTreeModel extends ObjectTreeModel {
    isCollapsible(element) {
        return false;
    }
    setCollapsed(element, collapsed, recursive) {
        return false;
    }
}
class SettingsTreeAccessibilityProvider {
    constructor(configurationService, languageService, userDataProfilesService) {
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.userDataProfilesService = userDataProfilesService;
    }
    getAriaLabel(element) {
        if (element instanceof SettingsTreeSettingElement) {
            const ariaLabelSections = [];
            ariaLabelSections.push(`${element.displayCategory} ${element.displayLabel}.`);
            if (element.isConfigured) {
                const modifiedText = localize('settings.Modified', 'Modified.');
                ariaLabelSections.push(modifiedText);
            }
            const indicatorsLabelAriaLabel = getIndicatorsLabelAriaLabel(element, this.configurationService, this.userDataProfilesService, this.languageService);
            if (indicatorsLabelAriaLabel.length) {
                ariaLabelSections.push(`${indicatorsLabelAriaLabel}.`);
            }
            const descriptionWithoutSettingLinks = renderMarkdownAsPlaintext({ value: fixSettingLinks(element.description, false) });
            if (descriptionWithoutSettingLinks.length) {
                ariaLabelSections.push(descriptionWithoutSettingLinks);
            }
            return ariaLabelSections.join(' ');
        }
        else if (element instanceof SettingsTreeGroupElement) {
            return element.label;
        }
        else {
            return element.id;
        }
    }
    getWidgetAriaLabel() {
        return localize('settings', "Settings");
    }
}
let SettingsTree = class SettingsTree extends WorkbenchObjectTree {
    constructor(container, viewState, renderers, contextKeyService, listService, configurationService, instantiationService, languageService, userDataProfilesService) {
        super('SettingsTree', container, new SettingsTreeDelegate(), renderers, {
            horizontalScrolling: false,
            supportDynamicHeights: true,
            scrollToActiveElement: true,
            identityProvider: {
                getId(e) {
                    return e.id;
                }
            },
            accessibilityProvider: new SettingsTreeAccessibilityProvider(configurationService, languageService, userDataProfilesService),
            styleController: id => new DefaultStyleController(domStylesheetsJs.createStyleSheet(container), id),
            filter: instantiationService.createInstance(SettingsTreeFilter, viewState),
            smoothScrolling: configurationService.getValue('workbench.list.smoothScrolling'),
            multipleSelectionSupport: false,
            findWidgetEnabled: false,
            renderIndentGuides: RenderIndentGuides.None,
            transformOptimization: false // Disable transform optimization #177470
        }, instantiationService, contextKeyService, listService, configurationService);
        this.getHTMLElement().classList.add('settings-editor-tree');
        this.style(getListStyles({
            listBackground: editorBackground,
            listActiveSelectionBackground: editorBackground,
            listActiveSelectionForeground: foreground,
            listFocusAndSelectionBackground: editorBackground,
            listFocusAndSelectionForeground: foreground,
            listFocusBackground: editorBackground,
            listFocusForeground: foreground,
            listHoverForeground: foreground,
            listHoverBackground: editorBackground,
            listHoverOutline: editorBackground,
            listFocusOutline: editorBackground,
            listInactiveSelectionBackground: editorBackground,
            listInactiveSelectionForeground: foreground,
            listInactiveFocusBackground: editorBackground,
            listInactiveFocusOutline: editorBackground,
            treeIndentGuidesStroke: undefined,
            treeInactiveIndentGuidesStroke: undefined,
        }));
        this.disposables.add(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.list.smoothScrolling')) {
                this.updateOptions({
                    smoothScrolling: configurationService.getValue('workbench.list.smoothScrolling')
                });
            }
        }));
    }
    createModel(user, options) {
        return new NonCollapsibleObjectTreeModel(user, options);
    }
};
SettingsTree = __decorate([
    __param(3, IContextKeyService),
    __param(4, IListService),
    __param(5, IWorkbenchConfigurationService),
    __param(6, IInstantiationService),
    __param(7, ILanguageService),
    __param(8, IUserDataProfilesService)
], SettingsTree);
export { SettingsTree };
let CopySettingIdAction = class CopySettingIdAction extends Action {
    static { CopySettingIdAction_1 = this; }
    static { this.ID = 'settings.copySettingId'; }
    static { this.LABEL = localize('copySettingIdLabel', "Copy Setting ID"); }
    constructor(clipboardService) {
        super(CopySettingIdAction_1.ID, CopySettingIdAction_1.LABEL);
        this.clipboardService = clipboardService;
    }
    async run(context) {
        if (context) {
            await this.clipboardService.writeText(context.setting.key);
        }
        return Promise.resolve(undefined);
    }
};
CopySettingIdAction = CopySettingIdAction_1 = __decorate([
    __param(0, IClipboardService)
], CopySettingIdAction);
let CopySettingAsJSONAction = class CopySettingAsJSONAction extends Action {
    static { CopySettingAsJSONAction_1 = this; }
    static { this.ID = 'settings.copySettingAsJSON'; }
    static { this.LABEL = localize('copySettingAsJSONLabel', "Copy Setting as JSON"); }
    constructor(clipboardService) {
        super(CopySettingAsJSONAction_1.ID, CopySettingAsJSONAction_1.LABEL);
        this.clipboardService = clipboardService;
    }
    async run(context) {
        if (context) {
            const jsonResult = `"${context.setting.key}": ${JSON.stringify(context.value, undefined, '  ')}`;
            await this.clipboardService.writeText(jsonResult);
        }
        return Promise.resolve(undefined);
    }
};
CopySettingAsJSONAction = CopySettingAsJSONAction_1 = __decorate([
    __param(0, IClipboardService)
], CopySettingAsJSONAction);
let CopySettingAsURLAction = class CopySettingAsURLAction extends Action {
    static { CopySettingAsURLAction_1 = this; }
    static { this.ID = 'settings.copySettingAsURL'; }
    static { this.LABEL = localize('copySettingAsURLLabel', "Copy Setting as URL"); }
    constructor(clipboardService, productService) {
        super(CopySettingAsURLAction_1.ID, CopySettingAsURLAction_1.LABEL);
        this.clipboardService = clipboardService;
        this.productService = productService;
    }
    async run(context) {
        if (context) {
            const settingKey = context.setting.key;
            const product = this.productService.urlProtocol;
            const uri = URI.from({ scheme: product, authority: SETTINGS_AUTHORITY, path: `/${settingKey}` }, true);
            await this.clipboardService.writeText(uri.toString());
        }
        return Promise.resolve(undefined);
    }
};
CopySettingAsURLAction = CopySettingAsURLAction_1 = __decorate([
    __param(0, IClipboardService),
    __param(1, IProductService)
], CopySettingAsURLAction);
let SyncSettingAction = class SyncSettingAction extends Action {
    static { SyncSettingAction_1 = this; }
    static { this.ID = 'settings.stopSyncingSetting'; }
    static { this.LABEL = localize('stopSyncingSetting', "Sync This Setting"); }
    constructor(setting, configService) {
        super(SyncSettingAction_1.ID, SyncSettingAction_1.LABEL);
        this.setting = setting;
        this.configService = configService;
        this._register(Event.filter(configService.onDidChangeConfiguration, e => e.affectsConfiguration('settingsSync.ignoredSettings'))(() => this.update()));
        this.update();
    }
    async update() {
        const ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this.configService);
        this.checked = !ignoredSettings.includes(this.setting.key);
    }
    async run() {
        // first remove the current setting completely from ignored settings
        let currentValue = [...this.configService.getValue('settingsSync.ignoredSettings')];
        currentValue = currentValue.filter(v => v !== this.setting.key && v !== `-${this.setting.key}`);
        const defaultIgnoredSettings = getDefaultIgnoredSettings();
        const isDefaultIgnored = defaultIgnoredSettings.includes(this.setting.key);
        const askedToSync = !this.checked;
        // If asked to sync, then add only if it is ignored by default
        if (askedToSync && isDefaultIgnored) {
            currentValue.push(`-${this.setting.key}`);
        }
        // If asked not to sync, then add only if it is not ignored by default
        if (!askedToSync && !isDefaultIgnored) {
            currentValue.push(this.setting.key);
        }
        this.configService.updateValue('settingsSync.ignoredSettings', currentValue.length ? currentValue : undefined, 2 /* ConfigurationTarget.USER */);
        return Promise.resolve(undefined);
    }
};
SyncSettingAction = SyncSettingAction_1 = __decorate([
    __param(1, IConfigurationService)
], SyncSettingAction);
let ApplySettingToAllProfilesAction = class ApplySettingToAllProfilesAction extends Action {
    static { ApplySettingToAllProfilesAction_1 = this; }
    static { this.ID = 'settings.applyToAllProfiles'; }
    static { this.LABEL = localize('applyToAllProfiles', "Apply Setting to all Profiles"); }
    constructor(setting, configService) {
        super(ApplySettingToAllProfilesAction_1.ID, ApplySettingToAllProfilesAction_1.LABEL);
        this.setting = setting;
        this.configService = configService;
        this._register(Event.filter(configService.onDidChangeConfiguration, e => e.affectsConfiguration(APPLY_ALL_PROFILES_SETTING))(() => this.update()));
        this.update();
    }
    update() {
        const allProfilesSettings = this.configService.getValue(APPLY_ALL_PROFILES_SETTING);
        this.checked = allProfilesSettings.includes(this.setting.key);
    }
    async run() {
        // first remove the current setting completely from ignored settings
        const value = this.configService.getValue(APPLY_ALL_PROFILES_SETTING) ?? [];
        if (this.checked) {
            value.splice(value.indexOf(this.setting.key), 1);
        }
        else {
            value.push(this.setting.key);
        }
        const newValue = distinct(value);
        if (this.checked) {
            await this.configService.updateValue(this.setting.key, this.configService.inspect(this.setting.key).application?.value, 3 /* ConfigurationTarget.USER_LOCAL */);
            await this.configService.updateValue(APPLY_ALL_PROFILES_SETTING, newValue.length ? newValue : undefined, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
        else {
            await this.configService.updateValue(APPLY_ALL_PROFILES_SETTING, newValue.length ? newValue : undefined, 3 /* ConfigurationTarget.USER_LOCAL */);
            await this.configService.updateValue(this.setting.key, this.configService.inspect(this.setting.key).userLocal?.value, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
    }
};
ApplySettingToAllProfilesAction = ApplySettingToAllProfilesAction_1 = __decorate([
    __param(1, IWorkbenchConfigurationService)
], ApplySettingToAllProfilesAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvc2V0dGluZ3NUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFekYsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBaUIsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDM0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDckYsT0FBTyxFQUFFLHNCQUFzQixFQUE4QixNQUFNLGdEQUFnRCxDQUFDO0FBQ3BILE9BQU8sRUFBcUIsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFdEYsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ2xILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRXZKLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDL0ksT0FBTyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMvRixPQUFPLEVBQUUsOEJBQThCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNySSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6SixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQTRCLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHlDQUF5QyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdEksT0FBTyxFQUFFLDZCQUE2QixFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLDJCQUEyQixFQUFFLHVCQUF1QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDMVUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFL0QsT0FBTyxFQUE4QiwyQkFBMkIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTVJLE9BQU8sRUFBeUUsd0JBQXdCLEVBQUUsZ0NBQWdDLEVBQUUsMEJBQTBCLEVBQUUsY0FBYyxFQUFFLHVDQUF1QyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDNVIsT0FBTyxFQUFFLG9CQUFvQixFQUErSSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSwyQkFBMkIsRUFBRSwyQkFBMkIsRUFBaUMsTUFBTSxzQkFBc0IsQ0FBQztBQUUzVSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRWhCLFNBQVMsNkJBQTZCLENBQUMsT0FBbUM7SUFDekUsTUFBTSxtQkFBbUIsR0FBNEIsT0FBTyxPQUFPLENBQUMsWUFBWSxLQUFLLFFBQVE7UUFDNUYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLElBQUksRUFBRTtRQUM1QixDQUFDLENBQUMsRUFBRSxDQUFDO0lBRU4sTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2xDLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxHQUFHLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELG1CQUFtQixDQUFDO0lBRXJCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDdEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUMxQixHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDVixNQUFNLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU5QyxxQ0FBcUM7UUFDckMsSUFBSSxNQUEwQixDQUFDO1FBQy9CLElBQUksWUFBWSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLGtCQUFrQixZQUFZLEdBQUcsRUFBRSxDQUFDO1lBQ2xILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3RGLE1BQU0sR0FBRyxPQUFPLGFBQWEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQztRQUN6RixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3BFLE9BQU87WUFDTixLQUFLLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLEdBQUc7YUFDVDtZQUNELE9BQU87WUFDUCxXQUFXLEVBQUUsT0FBTyxDQUFDLFNBQVM7WUFDOUIsTUFBTTtTQUNOLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLHVCQUF1QixDQUFDLFVBQW9CLEVBQUUsY0FBaUM7SUFDdkYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3QyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztBQUNwQyxDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxNQUFtQjtJQUNwRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQixPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDMUQsQ0FBQztJQUVELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQztJQUV2RCxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDN0MsTUFBTSxXQUFXLEdBQUcsR0FBRyxHQUFHLGdCQUFnQixDQUFDLE1BQU07WUFDaEQsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztZQUN2QixDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWIsT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLE1BQW1CO0lBQzlDLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDdEQsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUMvQixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO1NBQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3pGLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsK0JBQStCLENBQUMsSUFBeUIsRUFBRSxJQUFhLEVBQUUsT0FBNEI7SUFDOUcsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDeEIsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9CLENBQUM7U0FBTSxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztRQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEdBQUcsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDO0lBQzNDLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDO0lBQ2xDLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxPQUFtQztJQUNqRSxNQUFNLG1CQUFtQixHQUE0QixPQUFPLE9BQU8sQ0FBQyxZQUFZLEtBQUssUUFBUTtRQUM1RixDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksSUFBSSxFQUFFO1FBQzVCLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFTixNQUFNLGlCQUFpQixHQUE0QixPQUFPLE9BQU8sQ0FBQyxVQUFVLEtBQUssUUFBUTtRQUN4RixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxFQUFFO1FBQzFCLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFTixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbEMsRUFBRSxHQUFHLG1CQUFtQixFQUFFLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM1QyxtQkFBbUIsQ0FBQztJQUV0QixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsdUJBQXVCLEVBQUUsMEJBQTBCLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ2xHLE1BQU0sa0JBQWtCLEdBQUcsTUFBTTtTQUMvQixPQUFPLENBQUMsdUJBQXVCLElBQUksRUFBRSxDQUFDO1NBQ3RDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVCLE9BQU8sRUFBRSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDNUIsTUFBTTtLQUNOLENBQUMsQ0FBQyxDQUFDO0lBRUwsTUFBTSx5QkFBeUIsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FDM0UsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUNwRSxDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNsQyxNQUFNLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU5QyxxQ0FBcUM7UUFDckMsSUFBSSxNQUEwQixDQUFDO1FBQy9CLElBQUksWUFBWSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLGtCQUFrQixZQUFZLEdBQUcsRUFBRSxDQUFDO1lBQ2xILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3RGLE1BQU0sR0FBRyxPQUFPLGFBQWEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQztRQUN6RixDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUM1RCxNQUFNLGdCQUFnQixHQUFHLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekUsT0FBTztnQkFDTixHQUFHLEVBQUU7b0JBQ0osSUFBSSxFQUFFLE1BQU07b0JBQ1osSUFBSSxFQUFFLEdBQUc7b0JBQ1QsT0FBTyxFQUFFLHlCQUF5QjtpQkFDbEM7Z0JBQ0QsS0FBSyxFQUFFLCtCQUErQixDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLGdCQUFnQixDQUFDO2dCQUM5RyxjQUFjLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVztnQkFDakQsU0FBUyxFQUFFLGlCQUFpQixDQUFDLFlBQVksQ0FBQztnQkFDMUMsU0FBUyxFQUFFLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDO2dCQUMzQyxNQUFNO2FBQ29CLENBQUM7UUFDN0IsQ0FBQztRQUVELHVIQUF1SDtRQUN2SCx5R0FBeUc7UUFDekcsTUFBTSxTQUFTLEdBQUcsWUFBWSxLQUFLLFNBQVMsSUFBSSx1Q0FBdUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdHLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxZQUFZLElBQUksWUFBWSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvRCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO1FBQ25GLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLGdCQUFnQixHQUFHLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFELE9BQU87Z0JBQ04sR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO2dCQUNsQyxLQUFLLEVBQUUsK0JBQStCLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLGdCQUFnQixDQUFDO2dCQUMvRixjQUFjLEVBQUUsTUFBTSxDQUFDLFdBQVc7Z0JBQ2xDLFNBQVM7Z0JBQ1QsU0FBUztnQkFDVCxNQUFNO2FBQ29CLENBQUM7UUFDN0IsQ0FBQztRQUVELE1BQU0sb0JBQW9CLEdBQUcsd0JBQXdCLENBQ3BELE9BQU8sMEJBQTBCLEtBQUssU0FBUztZQUM5QyxDQUFDLENBQUMsRUFBRTtZQUNKLENBQUMsQ0FBQywwQkFBMEIsSUFBSSxFQUFFLENBQ25DLENBQUM7UUFFRixPQUFPO1lBQ04sR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO1lBQ2xDLEtBQUssRUFBRSwrQkFBK0IsQ0FDckMsT0FBTywwQkFBMEIsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFDMUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUNULG9CQUFvQixDQUNwQjtZQUNELGNBQWMsRUFBRSxPQUFPLDBCQUEwQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ25ILFNBQVM7WUFDVCxTQUFTO1lBQ1QsTUFBTTtTQUNvQixDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUFDLE9BQW1DO0lBQ3JFLE1BQU0sbUJBQW1CLEdBQTRCLE9BQU8sT0FBTyxDQUFDLFlBQVksS0FBSyxRQUFRO1FBQzVGLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLEVBQUU7UUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUVOLE1BQU0saUJBQWlCLEdBQTRCLE9BQU8sT0FBTyxDQUFDLFVBQVUsS0FBSyxRQUFRO1FBQ3hGLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJLEVBQUU7UUFDMUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUVOLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNsQyxFQUFFLEdBQUcsbUJBQW1CLEVBQUUsR0FBRyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDbEQsbUJBQW1CLENBQUM7SUFFckIsTUFBTSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztJQUM3QyxNQUFNLGFBQWEsR0FBMEIsRUFBRSxDQUFDO0lBQ2hELEtBQUssTUFBTSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUNwQyxNQUFNLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU5QyxxQ0FBcUM7UUFDckMsSUFBSSxNQUEwQixDQUFDO1FBQy9CLElBQUksWUFBWSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLGtCQUFrQixZQUFZLEdBQUcsRUFBRSxDQUFDO1lBQ2xILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUQsTUFBTSxHQUFHLE9BQU8sYUFBYSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDO1FBQ3pGLENBQUM7UUFFRCxhQUFhLENBQUMsSUFBSSxDQUFDO1lBQ2xCLEdBQUcsRUFBRTtnQkFDSixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsR0FBRzthQUNUO1lBQ0QsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQzthQUNqQjtZQUNELGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXO1lBQ2pELFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsTUFBTTtTQUNOLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxPQUFPLGFBQWEsQ0FBQztBQUN0QixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxPQUFtQztJQUNoRSxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sV0FBVyxHQUF3QixFQUFFLENBQUM7UUFFNUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDdkMsb0VBQW9FO2dCQUNwRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLElBQUksQ0FBQyxHQUFHLEtBQUssU0FBUyxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDckcsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxRCxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO2dCQUMvQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDNUIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFO1lBQ3BFLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxPQUFtQztJQUNwRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQzdDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLENBQUM7SUFFMUQsT0FBTyxJQUFJLENBQUMsRUFBRTtRQUNiLE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUF3QixFQUFFLENBQUM7UUFFNUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsZ0JBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUMvRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUM1QixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUU7WUFDcEUsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUNkLENBQUMsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUFDLE9BQW1DO0lBQ3RFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsRUFBRSwwQkFBMEIsRUFBRSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7SUFFbEcsTUFBTSxrQkFBa0IsR0FBRyxNQUFNO1NBQy9CLE9BQU8sQ0FBQyx1QkFBdUIsSUFBSSxFQUFFLENBQUM7U0FDdEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUIsT0FBTyxFQUFFLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUM1QixNQUFNO0tBQ04sQ0FBQyxDQUFDLENBQUM7SUFFTCxPQUFPLENBQUMsR0FBVyxFQUFFLEVBQUU7UUFDdEIsSUFBSSxlQUF3QyxDQUFDO1FBRTdDLElBQUksU0FBUyxDQUFDLGdCQUFnQixDQUFDLElBQUksR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDNUQsZUFBZSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxlQUFlLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztRQUU3RyxJQUFJLFNBQVMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQzlCLGVBQWUsR0FBRyxhQUFhLENBQUM7UUFDakMsQ0FBQzthQUFNLElBQUksU0FBUyxDQUFDLDBCQUEwQixDQUFDLElBQUksT0FBTywwQkFBMEIsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwRyxlQUFlLEdBQUcsMEJBQTBCLENBQUM7UUFDOUMsQ0FBQztRQUVELElBQUksU0FBUyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEdBQUcsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7WUFFakQsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxPQUFPLElBQUksSUFBSSxFQUFFLENBQUM7WUFDeEQsQ0FBQztpQkFBTSxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxPQUFPLEdBQUcsd0JBQXdCLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUM3RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsZUFBZSxDQUFDLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU87SUFDUixDQUFDLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxJQUFhO0lBQzlDLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLEtBQUssU0FBUyxDQUFDO0FBQ2hELENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLFdBQXVDLEVBQUUsQ0FBMEI7SUFDcEcsTUFBTSxTQUFTLEdBQTRCLEVBQUUsQ0FBQztJQUM5QyxLQUFLLE1BQU0sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3JCLGtEQUFrRDtRQUNsRCxJQUFJLHlCQUE4QyxDQUFDO1FBQ25ELE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztRQUN0RSxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1FBQ3hELE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQztRQUU1RSxvRUFBb0U7UUFDcEUsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixLQUFLLE1BQU0sT0FBTyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLE9BQU8sS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDckIseUJBQXlCLEdBQUcsd0JBQXdCLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMvRSxNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUkseUJBQXlCLEtBQUssU0FBUyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDbEUsS0FBSyxNQUFNLFVBQVUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUM1QyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDM0IseUJBQXlCLEdBQUcsd0JBQXdCLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3pGLE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSx5QkFBeUIsS0FBSyxTQUFTLElBQUksb0JBQW9CLElBQUksT0FBTyxvQkFBb0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNsSCxJQUFJLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3pELHlCQUF5QixHQUFHLElBQUksQ0FBQztZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUNELFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLE9BQW1DO0lBQy9ELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNyRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQzlDLElBQUksV0FBVyxHQUF3QixFQUFFLENBQUM7UUFDMUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFCLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3JELE9BQU87b0JBQ04sS0FBSyxFQUFFLE9BQU87b0JBQ2QsV0FBVyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ2xELENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBVyxFQUFFLEVBQUU7WUFDeEMsT0FBTztnQkFDTixLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLE1BQU07b0JBQ1osSUFBSSxFQUFFLEdBQUc7b0JBQ1QsT0FBTyxFQUFFLFdBQVc7aUJBQ3BCO2FBQ0QsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBVyxFQUFFLEVBQUU7WUFDeEMsT0FBTztnQkFDTixLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFFBQVE7b0JBQ2QsSUFBSSxFQUFFLEdBQUc7aUJBQ1Q7YUFDRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsV0FBdUMsRUFBRSxnQkFBaUM7SUFDdkcsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2pFLE9BQU8sV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDdEUsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLE9BQTBCLEVBQUUsa0JBQW9DLEVBQUUsVUFBdUI7SUFDNUgsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDeEQsT0FBTztRQUNOLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQztRQUM1RCxnQkFBZ0IsRUFBRSxXQUFXO0tBQzdCLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLGtDQUFrQyxDQUFDLE1BQXdCLEVBQUUsTUFBc0IsRUFBRSxjQUFrQyxFQUFFLG9CQUFvRDtJQUM1TCxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUMsT0FBTyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLG9CQUFvQixDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDekosQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsaUNBQWlDLENBQUMsZ0JBQW1DLEVBQUUsTUFBd0I7SUFDcEgsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUM7SUFDNUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxXQUFtQixFQUFFLGFBQXFCLEVBQUUsVUFBK0IsRUFBRSxFQUFFO1FBQ3RHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDcEMsTUFBTSxTQUFTLEdBQUc7Z0JBQ2pCLEVBQUUsRUFBRSxXQUFXO2dCQUNmLEtBQUssRUFBRSxhQUFhO2dCQUNwQixRQUFRLEVBQUUsRUFBRTthQUNaLENBQUM7WUFDRixZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsWUFBWSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUUsQ0FBQyxRQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQztJQUNGLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUFFLEtBQXFCLEVBQUUsRUFBRTtRQUN6RCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUU1RSxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsYUFBYyxDQUFDLEVBQUUsQ0FBQztRQUM1QyxNQUFNLFNBQVMsR0FBRyxNQUFNLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuRSxNQUFNLGFBQWEsR0FBRyxTQUFTLEVBQUUsV0FBVyxJQUFJLFNBQVMsRUFBRSxJQUFJLElBQUksV0FBVyxDQUFDO1FBRS9FLG1HQUFtRztRQUNuRyw2RUFBNkU7UUFDN0UsdUVBQXVFO1FBQ3ZFLHlEQUF5RDtRQUN6RCxNQUFNLGNBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLEVBQUUsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUV2RixNQUFNLFVBQVUsR0FBd0I7WUFDdkMsRUFBRSxFQUFFLGNBQWM7WUFDbEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQ2xCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixRQUFRLEVBQUUsWUFBWTtTQUN0QixDQUFDO1FBQ0YsY0FBYyxDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDeEQsQ0FBQyxDQUFDO0lBRUYsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUQsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDN0MsTUFBTSxTQUFTLEdBQTBCLEVBQUUsQ0FBQztRQUM1QyxLQUFLLE1BQU0sa0JBQWtCLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDeEQsS0FBSyxNQUFNLEtBQUssSUFBSSxrQkFBa0IsQ0FBQyxRQUFTLEVBQUUsQ0FBQztnQkFDbEQsc0RBQXNEO2dCQUN0RCxnREFBZ0Q7Z0JBQ2hELEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUM3QixPQUFPLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNwRCxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCxJQUFJLGtCQUFrQixDQUFDLFFBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQy9DLGlEQUFpRDtnQkFDakQsNEJBQTRCO2dCQUM1QixTQUFTLENBQUMsSUFBSSxDQUFDO29CQUNkLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFO29CQUN6QixLQUFLLEVBQUUsa0JBQWtCLENBQUMsUUFBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7b0JBQzVDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxRQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtpQkFDbEQsQ0FBQyxDQUFDO1lBQ0osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLHVCQUF1QjtnQkFDdkIsa0RBQWtEO2dCQUNsRCxrQkFBa0IsQ0FBQyxRQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUMxQyxPQUFPLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNwRCxDQUFDLENBQUMsQ0FBQztnQkFFSCx3REFBd0Q7Z0JBQ3hELHdEQUF3RDtnQkFDeEQsb0RBQW9EO2dCQUNwRCxNQUFNLGNBQWMsR0FBRyxrQkFBa0IsQ0FBQyxRQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDNUcsSUFBSSxjQUFjLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2hELE1BQU0sZUFBZSxHQUFHLGtCQUFrQixDQUFDLFFBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssY0FBYyxDQUFDLENBQUM7b0JBQy9GLFNBQVMsQ0FBQyxJQUFJLENBQUM7d0JBQ2QsRUFBRSxFQUFFLGtCQUFrQixDQUFDLEVBQUU7d0JBQ3pCLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxLQUFLO3dCQUMvQixRQUFRLEVBQUUsY0FBYyxDQUFDLFFBQVE7d0JBQ2pDLFFBQVEsRUFBRSxlQUFlO3FCQUN6QixDQUFDLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNQLDZCQUE2QjtvQkFDN0IsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCwrQkFBK0I7UUFDL0IsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXpELE9BQU87WUFDTixFQUFFLEVBQUUsWUFBWTtZQUNoQixLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUM7WUFDM0MsUUFBUSxFQUFFLFNBQVM7U0FDbkIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsT0FBMEIsRUFBRSxXQUEwQixFQUFFLFVBQXVCO0lBQzVHLElBQUksUUFBMkMsQ0FBQztJQUNoRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QixRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVE7YUFDekIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUM7YUFDcEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUNsRSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxJQUFJLFFBQWdDLENBQUM7SUFDckMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEIsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzFHLENBQUM7SUFFRCxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUUsQ0FBQztJQUVELE9BQU87UUFDTixFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7UUFDZCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7UUFDcEIsUUFBUTtRQUNSLFFBQVE7S0FDUixDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0seUJBQXlCLEdBQUc7SUFDakMsbUJBQW1CO0lBQ25CLFdBQVc7SUFDWCwwQkFBMEI7Q0FDMUIsQ0FBQztBQUVGLFNBQVMsbUJBQW1CLENBQUMsV0FBMEIsRUFBRSxPQUFlLEVBQUUsVUFBdUI7SUFDaEcsTUFBTSxNQUFNLEdBQWUsRUFBRSxDQUFDO0lBRTlCLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDdkIsSUFBSSxjQUFjLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNmLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM3RSxVQUFVLENBQUMsSUFBSSxDQUFDLHFCQUFxQixPQUFPLDhCQUE4QixDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUM7QUFFRCxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0FBRXRELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxPQUFlO0lBQ3ZELE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUM7U0FDdkMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUV6QixPQUFPLElBQUksTUFBTSxDQUFDLElBQUksT0FBTyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLENBQVcsRUFBRSxPQUFlO0lBQ25ELElBQUksTUFBTSxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixNQUFNLEdBQUcsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsY0FBZ0M7SUFDeEQsTUFBTSxNQUFNLEdBQWtCLElBQUksR0FBRyxFQUFFLENBQUM7SUFFeEMsS0FBSyxNQUFNLEtBQUssSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNwQyxLQUFLLE1BQU0sT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN6QyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNmLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUE2RUQsTUFBTSx5QkFBeUIsR0FBRyx3QkFBd0IsQ0FBQztBQUMzRCxNQUFNLG1DQUFtQyxHQUFHLGlDQUFpQyxDQUFDO0FBQzlFLE1BQU0sMkJBQTJCLEdBQUcsMEJBQTBCLENBQUM7QUFDL0QsTUFBTSx5QkFBeUIsR0FBRyx3QkFBd0IsQ0FBQztBQUMzRCxNQUFNLHlCQUF5QixHQUFHLHdCQUF3QixDQUFDO0FBQzNELE1BQU0sMEJBQTBCLEdBQUcseUJBQXlCLENBQUM7QUFDN0QsTUFBTSw0QkFBNEIsR0FBRywyQkFBMkIsQ0FBQztBQUNqRSxNQUFNLDRCQUE0QixHQUFHLDJCQUEyQixDQUFDO0FBQ2pFLE1BQU0sMkJBQTJCLEdBQUcsMEJBQTBCLENBQUM7QUFDL0QsTUFBTSxnQ0FBZ0MsR0FBRyw4QkFBOEIsQ0FBQztBQUN4RSxNQUFNLDRCQUE0QixHQUFHLDJCQUEyQixDQUFDO0FBQ2pFLE1BQU0sbUNBQW1DLEdBQUcsaUNBQWlDLENBQUM7QUFDOUUsTUFBTSxtQ0FBbUMsR0FBRyxpQ0FBaUMsQ0FBQztBQUM5RSxNQUFNLDRCQUE0QixHQUFHLHlCQUF5QixDQUFDO0FBQy9ELE1BQU0scUNBQXFDLEdBQUcsbUNBQW1DLENBQUM7QUFlbEYsU0FBUywwQkFBMEIsQ0FBQyxJQUFhO0lBQ2hELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDOzs7Ozs7OztFQVEvQyxDQUFDLENBQUM7SUFFSCxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDbkMsT0FBTyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3RSxPQUFPLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLElBQWE7SUFDM0MsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQzlDLElBQUksdUJBQXVCLENBQUMsc0JBQXNCLFVBQVUsQ0FDNUQsQ0FBQztJQUVGLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNuQyxPQUFPLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDeEUsT0FBTyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBT00sSUFBZSx1QkFBdUIsR0FBdEMsTUFBZSx1QkFBd0IsU0FBUSxVQUFVOzthQUkvQyxrQkFBYSxHQUFHLDhCQUE4QixBQUFqQyxDQUFrQzthQUMvQyxxQkFBZ0IsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLGFBQWEsQUFBM0IsQ0FBNEI7YUFDNUMsbUJBQWMsR0FBRyx1QkFBdUIsQUFBMUIsQ0FBMkI7YUFDekMsc0JBQWlCLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLEFBQTVCLENBQTZCO2FBQzlDLHNCQUFpQixHQUFHLGtCQUFrQixBQUFyQixDQUFzQjthQUV2QyxxQkFBZ0IsR0FBRyxVQUFVLEFBQWIsQ0FBYzthQUM5QixvQkFBZSxHQUFHLFNBQVMsQUFBWixDQUFhO2FBQzVCLDJCQUFzQixHQUFHLGdCQUFnQixBQUFuQixDQUFvQjtJQTZCMUQsWUFDa0IsY0FBeUIsRUFDekIsdUJBQXdGLEVBQzFGLGFBQStDLEVBQ3pDLG1CQUEyRCxFQUNoRSxjQUFpRCxFQUMxQyxxQkFBK0QsRUFDckUsZUFBbUQsRUFDL0MsbUJBQTJELEVBQzVELGtCQUF5RCxFQUN0RCxjQUF3RCxFQUM1RCxrQkFBd0QsRUFDOUMsMkJBQTJFLEVBQ3ZGLGVBQW1ELEVBQ2pELGlCQUF1RCxFQUMzRCxhQUErQztRQUU5RCxLQUFLLEVBQUUsQ0FBQztRQWhCUyxtQkFBYyxHQUFkLGNBQWMsQ0FBVztRQUN6Qiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQWlFO1FBQ3ZFLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3RCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDN0MsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3ZCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDbEQsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQzVCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDekMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNuQyxtQkFBYyxHQUFkLGNBQWMsQ0FBdUI7UUFDekMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFtQjtRQUMzQixnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO1FBQ3BFLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUM5QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3hDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBMUM5QywrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUE4QixDQUFDLENBQUM7UUFDL0YsOEJBQXlCLEdBQXNDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFFM0Ysd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBdUIsQ0FBQyxDQUFDO1FBQ25GLHVCQUFrQixHQUErQixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBRXRFLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFDO1FBQ3JFLHNCQUFpQixHQUFrQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBRXpELDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQztRQUN2RiwwQkFBcUIsR0FBa0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztRQUUvRSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUE4QixDQUFDLENBQUM7UUFDekYsc0JBQWlCLEdBQXNDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFHN0UsZ0NBQTJCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDMUUsK0JBQTBCLEdBQWdCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUM7UUFFdkUsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBc0IsQ0FBQyxDQUFDO1FBQ3hGLDZCQUF3QixHQUE4QixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1FBRWpGLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUM7UUFDakUsa0JBQWEsR0FBa0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7UUF1QmpFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFbkYsSUFBSSxDQUFDLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM1RixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM1RixJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFNUyxvQkFBb0IsQ0FBQyxJQUFTLEVBQUUsVUFBdUIsRUFBRSxTQUFpQjtRQUNuRixVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6QyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFFdEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUV4QyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMseUJBQXVCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDeEQsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUM7UUFDaEcsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1FBQzVGLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRTVILE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQztRQUNqRixNQUFNLHdCQUF3QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUM7UUFDOUYsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLHdCQUF3QixFQUFFO1lBQzVFLE9BQU8sRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLHVEQUF1RCxDQUFDO1NBQ3RGLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDO1FBRS9FLE1BQU0seUJBQXlCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztRQUVoRyxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7UUFDaEYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFNUQsTUFBTSxRQUFRLEdBQXlCO1lBQ3RDLFNBQVM7WUFDVCxrQkFBa0IsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUM7WUFFeEQsZ0JBQWdCLEVBQUUsU0FBUztZQUMzQixlQUFlO1lBQ2YsWUFBWTtZQUNaLGtCQUFrQjtZQUNsQixjQUFjO1lBQ2QseUJBQXlCO1lBQ3pCLGVBQWU7WUFDZixPQUFPO1NBQ1AsQ0FBQztRQUVGLDRDQUE0QztRQUM1QyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdHLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3SCxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEksT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVTLDZCQUE2QixDQUFDLFFBQThCO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDL0QsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDckMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDbEQsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ25ELFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRW5ELElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN0QixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNoRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUyxvQkFBb0IsQ0FBQyxTQUFzQjtRQUNwRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ2pILElBQUksZUFBZSxHQUFHLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQy9FLElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixlQUFlLElBQUksS0FBSyxvQkFBb0IsSUFBSSxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO1FBQ3BGLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQ2hFLGVBQWU7WUFDZiw0QkFBNEIsRUFBRSxDQUFDLEtBQUs7WUFDcEMsUUFBUSxFQUFFLHNCQUFzQjtTQUNoQyxDQUFDLENBQUM7UUFDSCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRVMsb0JBQW9CLENBQUMsSUFBa0QsRUFBRSxLQUFhLEVBQUUsUUFBeUQ7UUFDMUosTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUU3Qix5REFBeUQ7UUFDekQsaUVBQWlFO1FBQ2pFLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUV0QixRQUFRLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUMzQixRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3RGLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVFLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFdEUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUVoQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2xGLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMseUJBQXVCLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0RyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLHlCQUF1QixDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFNUYsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0UsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdkcsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNILFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDbEQsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDO1FBRTNDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQzNDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQzNDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUM3SSxRQUFRLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDOUQsQ0FBQzthQUFNLENBQUM7WUFDUCxRQUFRLENBQUMsa0JBQWtCLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDN0QsQ0FBQztRQUVELFFBQVEsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDN0csUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2hGLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQztnQkFDeEQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM5RyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sUUFBUSxHQUFHLENBQUMsS0FBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO1lBQzlELEdBQUcsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUc7WUFDeEIsS0FBSztZQUNMLElBQUksRUFBRSxRQUFRLENBQUMsT0FBUSxDQUFDLFNBQVM7WUFDakMsV0FBVyxFQUFFLEtBQUs7WUFDbEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSztTQUM1QixDQUFDLENBQUM7UUFDSCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixJQUFJLEVBQUUsQ0FBQztRQUNqRSxJQUFJLGVBQWUsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDckUsUUFBUSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7WUFDbEQsUUFBUSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFtQixFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDbEwsQ0FBQzthQUFNLENBQUM7WUFDUCxRQUFRLENBQUMseUJBQXlCLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQztRQUNoRSxDQUFDO1FBQ0QsUUFBUSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFL0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQXdCLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVwRSxRQUFRLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZELFFBQVEsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMxRSxRQUFRLENBQUMsZUFBZSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pFLFFBQVEsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekQsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxFQUFFO1lBQ3BFLFFBQVEsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM5QyxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUU7WUFDaEUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQW1DLEVBQUUsUUFBeUQ7UUFDM0gsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdEIscUJBQXFCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbEQsQ0FBQzthQUFNLENBQUM7WUFDUCwwQkFBMEIsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQW1DLEVBQUUsU0FBc0IsRUFBRSxJQUFZLEVBQUUsV0FBNEI7UUFDcEksNkNBQTZDO1FBQzdDLElBQUksR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFN0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDdkYsYUFBYSxFQUFFO2dCQUNkLFFBQVEsRUFBRSxDQUFDLE9BQWUsRUFBRSxFQUFFO29CQUM3QixJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDN0IsTUFBTSxDQUFDLEdBQTJCOzRCQUNqQyxNQUFNLEVBQUUsT0FBTzs0QkFDZixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7eUJBQy9CLENBQUM7d0JBQ0YsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDckMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO29CQUNyRixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsV0FBVzthQUNYO1lBQ0QsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO2dCQUN6QixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDO2dCQUN0QyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDMUQsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFDSCxXQUFXLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFbEMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNoRSxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoRCxPQUFPLGdCQUFnQixDQUFDLE9BQU8sQ0FBQztJQUNqQyxDQUFDO0lBSUQsZUFBZSxDQUFDLFFBQTZCO1FBQzVDLFFBQVEsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVELGNBQWMsQ0FBQyxRQUF3QyxFQUFFLE1BQWMsRUFBRSxRQUE2QixFQUFFLE9BQTJCO1FBQ2pJLFFBQWlDLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDaEUsQ0FBQzs7QUF6Um9CLHVCQUF1QjtJQTRDMUMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSwyQkFBMkIsQ0FBQTtJQUMzQixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxhQUFhLENBQUE7R0F4RE0sdUJBQXVCLENBMFI1Qzs7QUFFRCxNQUFNLG9CQUFvQjtJQUExQjtRQUNDLGVBQVUsR0FBRyw0QkFBNEIsQ0FBQztJQTJCM0MsQ0FBQztJQXpCQSxjQUFjLENBQUMsU0FBc0I7UUFDcEMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFdkMsTUFBTSxRQUFRLEdBQXdCO1lBQ3JDLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFNBQVMsRUFBRSxJQUFJLGVBQWUsRUFBRTtTQUNoQyxDQUFDO1FBRUYsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUFtRCxFQUFFLEtBQWEsRUFBRSxZQUFpQztRQUNsSCxZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDbkMsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyw2REFBNkQsQ0FBQyxDQUFDLENBQUM7UUFDdkgsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1RSxZQUFZLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBRWpELElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNsQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BELENBQUM7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQWlDO1FBQ2hELFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEMsQ0FBQztDQUNEO0FBRU0sSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7SUFHeEMsWUFDa0IsZUFBaUQ7UUFBaEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBSG5FLGVBQVUsR0FBRyxtQ0FBbUMsQ0FBQztJQUtqRCxDQUFDO0lBRUQsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFeEMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUV2RCxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNwQyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsbURBQW1ELEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN6SCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDaEYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFFL0QsTUFBTSxRQUFRLEdBQWtDO1lBQy9DLE1BQU07WUFDTixTQUFTO1NBQ1QsQ0FBQztRQUVGLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBMkQsRUFBRSxLQUFhLEVBQUUsWUFBMkM7UUFDcEksWUFBWSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxlQUFlLENBQUMsUUFBNkI7UUFDNUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDO0NBQ0QsQ0FBQTtBQXRDWSw0QkFBNEI7SUFJdEMsV0FBQSxlQUFlLENBQUE7R0FKTCw0QkFBNEIsQ0FzQ3hDOztBQUVELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSx1QkFBdUI7SUFBbkU7O1FBR0MsZUFBVSxHQUFHLDRCQUE0QixDQUFDO0lBeUUzQyxDQUFDO2FBM0V3Qix1QkFBa0IsR0FBRyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUMsQUFBMUQsQ0FBMkQ7SUFJckcsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXJFLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUM7UUFDN0Ysa0JBQWtCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4RSxrQkFBa0IsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1FBRW5DLE1BQU0sNkJBQTZCLEdBQUcsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBRW5FLE1BQU0sUUFBUSxHQUFnQztZQUM3QyxHQUFHLE1BQU07WUFDVCxNQUFNLEVBQUUsa0JBQWtCO1lBQzFCLDZCQUE2QjtTQUM3QixDQUFDO1FBRUYsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdDLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBcUQsRUFBRSxLQUFhLEVBQUUsWUFBeUM7UUFDNUgsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVTLFdBQVcsQ0FBQyxXQUF1QyxFQUFFLFFBQXFDLEVBQUUsUUFBaUM7UUFDdEksTUFBTSxRQUFRLEdBQUcsNkJBQTZCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4RSxNQUFNLHdCQUF3QixHQUFHLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx1QkFBdUIsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN6RyxNQUFNLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7UUFDdEUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsb0JBQW9CO1lBQ2pELENBQUMsQ0FBQyx3QkFBd0I7WUFDMUIsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDO1FBRTdDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFVLEVBQUUsRUFBRTtZQUN2QyxJQUFJLG9CQUFvQixFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksb0JBQW9CLEdBQUcsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNqRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZELENBQUM7WUFDRCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQztRQUNGLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hHLE1BQU0sRUFBRSxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsSUFBSSxFQUFFLENBQUMsTUFBTSx3QkFBZSxJQUFJLEVBQUUsQ0FBQyxNQUFNLHVCQUFlLEVBQUUsQ0FBQztnQkFDMUQsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTlDLElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUN0RSxDQUFDO2FBQU0sQ0FBQztZQUNQLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxHQUFHLHNCQUFzQixDQUFDLGtCQUFrQixLQUFLLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN4SCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFdBQXVDLEVBQUUsUUFBcUM7UUFDdkcsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFlBQVksSUFBSSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3pELFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO1lBQzFELE9BQU87UUFDUixDQUFDO1FBRUQsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDN0QsQ0FBQzs7QUFHRixNQUFNLDRCQUE2QixTQUFRLHNCQUFzQjtJQUFqRTs7UUFFVSxlQUFVLEdBQUcsbUNBQW1DLENBQUM7SUFxQzNELENBQUM7SUFuQ1MsY0FBYyxDQUFDLFNBQXNCO1FBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWxFLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsRUFBRSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUNoSixtQkFBbUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVqRixNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxtREFBbUQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLDBDQUEwQyxDQUFDLENBQUMsQ0FBQztRQUNoTCxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3hFLGtCQUFrQixDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7UUFFbkMsTUFBTSw2QkFBNkIsR0FBRyxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUM1RSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFFbkUsTUFBTSxRQUFRLEdBQXNDO1lBQ25ELEdBQUcsTUFBTTtZQUNULE1BQU0sRUFBRSxrQkFBa0I7WUFDMUIsNkJBQTZCO1lBQzdCLG1CQUFtQjtTQUNuQixDQUFDO1FBRUYsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdDLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFa0IsV0FBVyxDQUFDLFdBQXVDLEVBQUUsUUFBMkMsRUFBRSxRQUFpQztRQUNySixNQUFNLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNqRCxRQUFRLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtZQUM1QyxVQUFVLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHO1lBQ25DLGFBQWEsRUFBRSxLQUFLO1lBQ3BCLFVBQVUsRUFBRSxJQUFJO1NBQ2hCLENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRixLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBcUIsU0FBUSx1QkFBdUI7SUFBMUQ7O1FBQ0MsZUFBVSxHQUFHLDBCQUEwQixDQUFDO0lBNEd6QyxDQUFDO0lBMUdBLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRSxNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsMkJBQTJCLENBQUUsQ0FBQztRQUMvRixNQUFNLDZCQUE2QixHQUFHLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1FBQzVFLGtCQUFrQixDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBRXhELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZHLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVqQyxNQUFNLFFBQVEsR0FBNkI7WUFDMUMsR0FBRyxNQUFNO1lBQ1QsVUFBVTtZQUNWLDZCQUE2QjtTQUM3QixDQUFDO1FBRUYsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUNuQixVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzlCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2pELFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FDRixDQUFDO1FBRUYsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVPLGNBQWMsQ0FBQyxRQUFrQyxFQUFFLENBQWtDO1FBQzVGLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLElBQUksUUFBUSxHQUFhLEVBQUUsQ0FBQztZQUM1QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUNoRCxRQUFRLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDN0MsQ0FBQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsRCxRQUFRLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEMsQ0FBQztZQUVELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDdkIsMkJBQTJCO2dCQUMzQixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDO2dCQUNsQyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDO2dCQUNsQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzlDLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUN0RCxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkMsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFFdEQsZUFBZTtnQkFDZixJQUFJLENBQUMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxhQUFhLENBQUM7Z0JBQ3pDLENBQUM7Z0JBQ0Qsa0VBQWtFO2dCQUNsRSxxQ0FBcUM7cUJBQ2hDLENBQUM7b0JBQ0wsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDOUIsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUM3QixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFFRCxJQUNDLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWTtnQkFDN0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztnQkFDNUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxNQUFNO2dCQUN4RCxRQUFRLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsS0FBSyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQ3ZELENBQUM7Z0JBQ0YsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUNELE9BQU8sUUFBUSxDQUFDO1FBQ2pCLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQXFELEVBQUUsS0FBYSxFQUFFLFlBQXNDO1FBQ3pILEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFUyxXQUFXLENBQUMsV0FBdUMsRUFBRSxRQUFrQyxFQUFFLFFBQTBEO1FBQzVKLE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzlGLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtZQUNuQyxhQUFhLEVBQUUsb0JBQW9CLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQztZQUN2RCxZQUFZO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsUUFBUSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7UUFFL0IsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pELFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUF1QixFQUFFLEVBQUU7WUFDL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNuRSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztnQkFDbkQsTUFBTSxTQUFTLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNyQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsdURBQXVEO2dCQUN2RCw4REFBOEQ7Z0JBQzlELFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlGLENBQUM7Q0FDRDtBQUVELE1BQWUsNkJBQThCLFNBQVEsdUJBQXVCO0lBRWpFLHdCQUF3QixDQUFDLE1BQTRCLEVBQUUsTUFBaUU7UUFDakksTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdCLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQywyQkFBMkIsQ0FBRSxDQUFDO1FBQy9GLE1BQU0sNkJBQTZCLEdBQUcsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFDNUUsa0JBQWtCLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFFeEQsTUFBTSxRQUFRLEdBQStCO1lBQzVDLEdBQUcsTUFBTTtZQUNULDZCQUE2QjtTQUM3QixDQUFDO1FBQ0YsSUFBSSxNQUFNLFlBQVksMkJBQTJCLEVBQUUsQ0FBQztZQUNuRCxRQUFRLENBQUMsb0JBQW9CLEdBQUcsTUFBTSxDQUFDO1FBQ3hDLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxDQUFDLG9CQUFvQixHQUFHLE1BQU0sQ0FBQztRQUN4QyxDQUFDO1FBRUQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBcUQsRUFBRSxLQUFhLEVBQUUsWUFBd0M7UUFDM0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDMUQsQ0FBQztDQUNEO0FBRUQsTUFBTSxxQkFBc0IsU0FBUSw2QkFBNkI7SUFBakU7O1FBQ1UsZUFBVSxHQUFHLDJCQUEyQixDQUFDO0lBdUhuRCxDQUFDO0lBckhBLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLDJCQUEyQixFQUFFLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM3RyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFFBQW9DLEVBQUUsQ0FBb0M7UUFDbkcsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLG9CQUFxQixDQUFDO1FBQzlDLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLE1BQU0sNEJBQTRCLEdBQUcsdUNBQXVDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDM0csTUFBTSxZQUFZLEdBQTRCLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEtBQUssUUFBUTtnQkFDOUYsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLEVBQUU7Z0JBQ3JDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFTixNQUFNLFVBQVUsR0FBNEIsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsS0FBSyxRQUFRO2dCQUMxRixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUksRUFBRTtnQkFDbkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUVOLE1BQU0sUUFBUSxHQUE0QixFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLDJFQUEyRTtZQUN6SixNQUFNLFFBQVEsR0FBc0IsRUFBRSxDQUFDO1lBRXZDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUNsQyxtQkFBbUI7Z0JBQ25CLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQ3pFLHVFQUF1RTtvQkFDdkUsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLDRCQUE0QixJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxZQUFZLEVBQUUsQ0FBQzt3QkFDL0gsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztvQkFDMUMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMxQyxDQUFDO29CQUNELFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ3BELFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQixDQUFDO2dCQUNELDZEQUE2RDtxQkFDeEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzdGLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO29CQUMxQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFFSCxtQkFBbUI7WUFDbkIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUMvQyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBQzFDLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksNEJBQTRCLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDMUksSUFBSSxvQkFBb0IsRUFBRSxDQUFDO29CQUMxQixRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUM1QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzVCLENBQUM7Z0JBRUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUM3RSxNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxTQUFTLENBQXFCLENBQUM7Z0JBRXJFLDBEQUEwRDtnQkFDMUQsSUFBSSxvQkFBb0IsSUFBSSxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDN0YsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLENBQUM7cUJBQU0sSUFBSSxDQUFDLG9CQUFvQixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN2RCxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxnQkFBZ0IsQ0FBQztnQkFDdEQsQ0FBQztZQUNGLENBQUM7WUFDRCxxQkFBcUI7aUJBQ2hCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDM0IsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDcEQsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUIsQ0FBQztZQUVELE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtnQkFDakQsdURBQXVEO2dCQUN2RCxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxLQUFLLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsNEJBQTRCLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ25ILE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQzVFLFFBQVEsQ0FBQyxvQkFBcUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRVMsV0FBVyxDQUFDLFdBQXVDLEVBQUUsUUFBb0MsRUFBRSxRQUE4RDtRQUNsSyxNQUFNLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNqRCxNQUFNLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLHVCQUF1QixFQUFFLDBCQUEwQixFQUFFLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUUzRyxRQUFRLENBQUMsb0JBQXFCLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtZQUM5QyxVQUFVLEVBQUUsR0FBRztZQUNmLGFBQWEsRUFBRSwwQkFBMEIsS0FBSyxLQUFLO2dCQUNsRCxDQUFDLENBQUMsQ0FDRCxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDO29CQUNwRSxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FDbEM7Z0JBQ0QsQ0FBQyxDQUFDLElBQUk7WUFDUCxZQUFZLEVBQUUsd0JBQXdCLENBQUMsV0FBVyxDQUFDO1lBQ25ELGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxXQUFXLENBQUM7U0FDdkQsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7UUFFL0IsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pELFFBQVEsQ0FBQyxvQkFBcUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosUUFBUSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQXNDLEVBQUUsRUFBRTtZQUM5RCxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25FLE1BQU0sWUFBWSxHQUFHLHdCQUF3QixDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDOUQsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCx1REFBdUQ7Z0JBQ3ZELDhEQUE4RDtnQkFDOUQsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUNGLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLHlCQUEwQixTQUFRLDZCQUE2QjtJQUFyRTs7UUFDVSxlQUFVLEdBQUcsZ0NBQWdDLENBQUM7SUEyRXhELENBQUM7SUF6RUEsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsMkJBQTJCLEVBQUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzdHLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMvQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRVMsaUJBQWlCLENBQUMsUUFBb0MsRUFBRSxDQUF3QztRQUN6RyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN0QixNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsb0JBQXFCLENBQUM7WUFDOUMsTUFBTSxZQUFZLEdBQTRCLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEtBQUssUUFBUTtnQkFDOUYsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLEVBQUU7Z0JBQ3JDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFTixNQUFNLFVBQVUsR0FBNEIsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsS0FBSyxRQUFRO2dCQUMxRixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUksRUFBRTtnQkFDbkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUVOLE1BQU0sUUFBUSxHQUE0QixFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLDJFQUEyRTtZQUN6SixNQUFNLFFBQVEsR0FBMEIsRUFBRSxDQUFDO1lBRTNDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN2RyxPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUNsQyxtQkFBbUI7Z0JBQ25CLElBQUksQ0FBQyxDQUFDLFdBQVcsS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDM0IsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDcEQsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7Z0JBQ0QsNkRBQTZEO3FCQUN4RCxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUMvQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDMUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFO2dCQUNqRCx1REFBdUQ7Z0JBQ3ZELElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQzlELE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQzVFLFFBQVEsQ0FBQyxvQkFBcUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRS9CLDREQUE0RDtZQUM1RCxvRUFBb0U7WUFDcEUsb0JBQW9CO1lBQ3BCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELENBQUM7SUFDRixDQUFDO0lBRVMsV0FBVyxDQUFDLFdBQXVDLEVBQUUsUUFBb0MsRUFBRSxRQUE4RDtRQUNsSyxNQUFNLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUVwQyxRQUFRLENBQUMsb0JBQXFCLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtZQUM5QyxVQUFVLEVBQUUsR0FBRztTQUNmLENBQUMsQ0FBQztRQUVILFFBQVEsQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDO1FBQy9CLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFzQyxFQUFFLEVBQUU7WUFDOUQsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2IsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBRUQsTUFBZSw2QkFBOEIsU0FBUSx1QkFBdUI7SUFJM0UsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWxFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDOUosb0JBQW9CLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbEYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUUzQyxNQUFNLFFBQVEsR0FBdUM7WUFDcEQsR0FBRyxNQUFNO1lBQ1Qsb0JBQW9CO1NBQ3BCLENBQUM7UUFFRixJQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFN0MsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0csT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVPLHlCQUF5QixDQUFDLFFBQTRDLEVBQUUsQ0FBa0M7UUFDakgsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdEIsTUFBTSxRQUFRLEdBQUcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFFcEQsOENBQThDO1lBQzlDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDM0Usb0NBQW9DO29CQUNwQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUN4RCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZELENBQUM7WUFDRixDQUFDO1lBRUQsZ0RBQWdEO1lBQ2hELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDbEUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUM1Rix5Q0FBeUM7b0JBQ3pDLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ3BHLENBQUM7WUFDRixDQUFDO1lBRUQsU0FBUyxRQUFRLENBQW1CLEdBQU07Z0JBQ3pDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO3FCQUNqQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFtQixDQUFDO2dCQUV2RCxNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUM7Z0JBQzlCLEtBQUssTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQzlCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3hCLENBQUM7Z0JBQ0QsT0FBTyxNQUFNLENBQUM7WUFDZixDQUFDO1lBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztnQkFDN0IsR0FBRyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUc7Z0JBQ2pDLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztnQkFDMUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUztnQkFDaEMsV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLO2FBQ3JDLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQXFELEVBQUUsS0FBYSxFQUFFLFlBQWdEO1FBQ25JLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFUyxXQUFXLENBQUMsV0FBdUMsRUFBRSxRQUE0QyxFQUFFLFFBQWlDO1FBQzdJLE1BQU0sS0FBSyxHQUFHLDZCQUE2QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7UUFDL0IsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pELFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNEO0FBRUQsTUFBTSxzQkFBdUIsU0FBUSw2QkFBNkI7SUFBbEU7O1FBQ0MsZUFBVSxHQUFHLDRCQUE0QixDQUFDO0lBSzNDLENBQUM7SUFIbUIsU0FBUztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRDtBQUVELE1BQU0sc0JBQXVCLFNBQVEsNkJBQTZCO0lBQWxFOztRQUNDLGVBQVUsR0FBRyw0QkFBNEIsQ0FBQztJQUszQyxDQUFDO0lBSG1CLFNBQVM7UUFDM0IsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLHNCQUFzQixHQUFHLGdCQUFnQixDQUFDO0lBQy9DLGVBQWUsRUFBRSwyQkFBMkI7SUFDNUMsZUFBZSxFQUFFLDJCQUEyQjtJQUM1QyxXQUFXLEVBQUUsdUJBQXVCO0NBQ3BDLENBQUMsQ0FBQztBQUVILE1BQWUsMkJBQTRCLFNBQVEsdUJBQXVCO0lBQTFFOztRQUNrQix5QkFBb0IsR0FBRyxHQUFHLENBQUM7SUFpRDdDLENBQUM7SUEvQ0EsY0FBYyxDQUFDLFVBQXVCLEVBQUUsWUFBc0I7UUFDN0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkUsTUFBTSw2QkFBNkIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDO1FBRWpILE1BQU0sZUFBZSxHQUFrQjtZQUN0QyxjQUFjLEVBQUUsWUFBWTtZQUM1QixhQUFhLEVBQUUsS0FBSztZQUNwQixpQkFBaUIsRUFBRSxJQUFJLENBQUMsb0JBQW9CO1lBQzVDLGNBQWMsRUFBRSxzQkFBc0I7U0FDdEMsQ0FBQztRQUNGLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUNuQixRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3hCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsUUFBUSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzNFLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUVuQyxNQUFNLFFBQVEsR0FBNkI7WUFDMUMsR0FBRyxNQUFNO1lBQ1QsUUFBUTtZQUNSLDZCQUE2QjtTQUM3QixDQUFDO1FBRUYsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdDLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBcUQsRUFBRSxLQUFhLEVBQUUsWUFBc0M7UUFDekgsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVTLFdBQVcsQ0FBQyxXQUF1QyxFQUFFLFFBQWtDLEVBQUUsUUFBaUM7UUFDbkksUUFBUSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUM7UUFDOUIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUM1QyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELFFBQVEsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLEVBQUU7WUFDM0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdEQsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pCLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hELENBQUM7Q0FDRDtBQUVELE1BQU0sbUJBQW9CLFNBQVEsMkJBQTJCO0lBQTdEOztRQUNDLGVBQVUsR0FBRyx5QkFBeUIsQ0FBQztJQWV4QyxDQUFDO0lBYlMsY0FBYyxDQUFDLFVBQXVCO1FBQzlDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpELDZHQUE2RztRQUM3RyxzRUFBc0U7UUFDdEUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ3BILElBQUksQ0FBQyxDQUFDLE1BQU0sMEJBQWlCLElBQUksQ0FBQyxDQUFDLE1BQU0sNEJBQW1CLEVBQUUsQ0FBQztnQkFDOUQsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztDQUNEO0FBRUQsTUFBTSw0QkFBNkIsU0FBUSwyQkFBMkI7SUFBdEU7O1FBQ0MsZUFBVSxHQUFHLG1DQUFtQyxDQUFDO0lBNEJsRCxDQUFDO0lBMUJTLGNBQWMsQ0FBQyxVQUF1QjtRQUM5QyxPQUFPLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFa0IsV0FBVyxDQUFDLFdBQXVDLEVBQUUsUUFBa0MsRUFBRSxRQUFpQztRQUM1SSxNQUFNLGdCQUFnQixHQUFHLENBQUMsS0FBYSxFQUFFLEVBQUU7WUFDMUMsdUhBQXVIO1lBQ3ZILFdBQVcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQzFCLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQixDQUFDLENBQUM7UUFDRixLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUMzRCxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUM5QixRQUFRLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7WUFDdEQsK0NBQStDO1lBQy9DLDREQUE0RDtZQUM1RCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7b0JBQ25DLE9BQU8sRUFBRSxXQUFXO29CQUNwQixNQUFNLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVk7aUJBQzlDLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFDO1FBQ0YsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM1QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLG1CQUFvQixTQUFRLHVCQUF1QjtJQUF6RDs7UUFDQyxlQUFVLEdBQUcseUJBQXlCLENBQUM7SUE0R3hDLENBQUM7SUExR0EsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWxFLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFDO1lBQ2pDLGdCQUFnQixFQUFFLHdCQUF3QjtZQUMxQyxnQkFBZ0IsRUFBRSx3QkFBd0I7WUFDMUMsWUFBWSxFQUFFLG9CQUFvQjtZQUNsQyxnQkFBZ0IsRUFBRSx3QkFBd0I7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxFQUFFO1lBQ3hFLGNBQWMsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLGVBQWUsQ0FBQyxhQUFhLENBQUM7U0FDekQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDeEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEUsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNuRSxhQUFhLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQ25CLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekIsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUwsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUvSSxNQUFNLFFBQVEsR0FBNkI7WUFDMUMsR0FBRyxNQUFNO1lBQ1QsU0FBUztZQUNULGFBQWE7WUFDYixzQkFBc0I7U0FDdEIsQ0FBQztRQUVGLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU3QyxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQXFELEVBQUUsS0FBYSxFQUFFLFlBQXNDO1FBQ3pILEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFUyxXQUFXLENBQUMsV0FBdUMsRUFBRSxRQUFrQyxFQUFFLFFBQWlDO1FBQ25JLGdGQUFnRjtRQUNoRixNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN6RyxNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMvRyxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLDJCQUEyQixHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUM7UUFFcEYsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTdDLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQztRQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUNyRCw4Q0FBOEM7WUFDOUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDOUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdCLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0IsY0FBYyxHQUFHLElBQUksQ0FBQztRQUN2QixDQUFDO1FBRUQsNkRBQTZEO1FBQzdELE1BQU0sdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLE1BQU0sY0FBYyxHQUF3QixXQUFXO2FBQ3JELEdBQUcsQ0FBQyxNQUFNLENBQUM7YUFDWCxHQUFHLENBQUMsb0JBQW9CLENBQUM7YUFDekIsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3BCLE1BQU0sV0FBVyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0osT0FBTztnQkFDTixJQUFJLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7Z0JBQzFELE1BQU0sRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDekMsV0FBVztnQkFDWCxxQkFBcUIsRUFBRSwyQkFBMkI7Z0JBQ2xELGdDQUFnQyxFQUFFO29CQUNqQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRTt3QkFDckIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQzVELENBQUM7b0JBQ0QsV0FBVyxFQUFFLFdBQVc7aUJBQ3hCO2dCQUNELGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssdUJBQXVCLENBQUMsSUFBSSxDQUFDLGNBQWMsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDNUcsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztRQUVKLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzlDLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFekQsSUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakQsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNoQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1QsQ0FBQztRQUVELFFBQVEsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1FBQzlCLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMzQixJQUFJLGNBQWMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDcEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsUUFBUSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFDaEQsQ0FBQztDQUNEO0FBRUQsTUFBTSw0QkFBNEIsR0FBRyxnQkFBZ0IsQ0FBQztJQUNyRCxlQUFlLEVBQUUsNkJBQTZCO0lBQzlDLGVBQWUsRUFBRSw2QkFBNkI7SUFDOUMsV0FBVyxFQUFFLHlCQUF5QjtDQUN0QyxDQUFDLENBQUM7QUFFSCxNQUFNLHFCQUFzQixTQUFRLHVCQUF1QjtJQUEzRDs7UUFDQyxlQUFVLEdBQUcsMkJBQTJCLENBQUM7SUFtRDFDLENBQUM7SUFqREEsY0FBYyxDQUFDLFVBQXVCO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQztRQUVqSCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLDRCQUE0QixFQUFFLENBQUMsQ0FBQztRQUNqSixNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDbkIsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN4QixRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9CLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMzRSxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFFbkMsTUFBTSxRQUFRLEdBQStCO1lBQzVDLEdBQUcsTUFBTTtZQUNULFFBQVE7WUFDUiw2QkFBNkI7U0FDN0IsQ0FBQztRQUVGLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU3QyxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQXFELEVBQUUsS0FBYSxFQUFFLFlBQXdDO1FBQzNILEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFUyxXQUFXLENBQUMsV0FBdUMsRUFBRSxRQUFvQyxFQUFFLFFBQXdDO1FBQzVJLE1BQU0sVUFBVSxHQUFHLENBQUMsV0FBVyxDQUFDLFNBQVMsS0FBSyxTQUFTLElBQUksV0FBVyxDQUFDLFNBQVMsS0FBSyxrQkFBa0IsQ0FBQztZQUN2RyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFFekIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxXQUFXLENBQUMsU0FBUyxLQUFLLGtCQUFrQixJQUFJLFdBQVcsQ0FBQyxTQUFTLEtBQUssaUJBQWlCLENBQUM7WUFDbkgsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUVqRSxRQUFRLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztRQUM5QixRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxPQUFPLFdBQVcsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUM7WUFDaEUsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ25DLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqRixRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELFFBQVEsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLEVBQUU7WUFDM0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdEQsUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hELENBQUM7Q0FDRDtBQUVELE1BQU0sbUJBQW9CLFNBQVEsdUJBQXVCO0lBQXpEOztRQUNDLGVBQVUsR0FBRyx5QkFBeUIsQ0FBQztJQXdGeEMsQ0FBQztJQXRGQSxjQUFjLENBQUMsVUFBdUI7UUFDckMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDekMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUU5QyxNQUFNLFNBQVMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRXhDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDdkYsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUV4RCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7UUFDbEYsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsMkJBQTJCLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFN0csTUFBTSwwQkFBMEIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQztRQUMvRixNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQztRQUNsRyxNQUFNLHdCQUF3QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUM7UUFDOUYsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLHdCQUF3QixFQUFFO1lBQzVFLE9BQU8sRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLHVEQUF1RCxDQUFDO1NBQ3RGLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDO1FBRWhHLE1BQU0sUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUNySixjQUFjLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hCLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDcEMsUUFBUSxDQUFDLFFBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLGdHQUFnRztRQUNoRyxzRUFBc0U7UUFDdEUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMzRixNQUFNLGFBQWEsR0FBZ0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUU1Qyx5QkFBeUI7WUFDekIsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUNqRCxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO2dCQUN2RCxRQUFRLENBQUMsUUFBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QyxDQUFDO1lBQ0QsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUdKLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0RSxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7UUFDaEYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDNUQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV2QixNQUFNLFFBQVEsR0FBNkI7WUFDMUMsU0FBUztZQUNULGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUV4RCxnQkFBZ0IsRUFBRSxTQUFTO1lBQzNCLGVBQWU7WUFDZixZQUFZO1lBQ1osY0FBYztZQUNkLFFBQVE7WUFDUixrQkFBa0I7WUFDbEIseUJBQXlCO1lBQ3pCLGVBQWU7WUFDZixPQUFPO1NBQ1AsQ0FBQztRQUVGLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU3Qyw0Q0FBNEM7UUFDNUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsY0FBYyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0gsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhJLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBcUQsRUFBRSxLQUFhLEVBQUUsWUFBc0M7UUFDekgsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVTLFdBQVcsQ0FBQyxXQUF1QyxFQUFFLFFBQWtDLEVBQUUsUUFBa0M7UUFDcEksUUFBUSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUM7UUFDOUIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUM5QyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELFFBQVEsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzlCLENBQUM7Q0FDRDtBQVFELE1BQU0sK0JBQWdDLFNBQVEsdUJBQXVCO0lBQXJFOztRQUNDLGVBQVUsR0FBRyxxQ0FBcUMsQ0FBQztRQUVsQyxrQ0FBNkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQztRQUM5RSxpQ0FBNEIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDO0lBaURsRixDQUFDO0lBL0NBLGNBQWMsQ0FBQyxVQUF1QjtRQUNyQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRWhGLE1BQU0sWUFBWSxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtZQUN4RCxLQUFLLEVBQUUsS0FBSztZQUNaLEdBQUcsbUJBQW1CO1NBQ3RCLENBQUMsQ0FBQztRQUNILFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1FBQzNFLFlBQVksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBRWpFLE1BQU0sYUFBYSxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtZQUN6RCxLQUFLLEVBQUUsS0FBSztZQUNaLFNBQVMsRUFBRSxJQUFJO1lBQ2YsR0FBRyxtQkFBbUI7U0FDdEIsQ0FBQyxDQUFDO1FBQ0gsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7UUFDN0UsYUFBYSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXJELE1BQU0sUUFBUSxHQUF3QztZQUNyRCxHQUFHLE1BQU07WUFDVCxZQUFZO1lBQ1osYUFBYTtTQUNiLENBQUM7UUFFRixJQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFN0MsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUFxRCxFQUFFLEtBQWEsRUFBRSxZQUFpRDtRQUNwSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRVMsV0FBVyxDQUFDLFdBQXVDLEVBQUUsUUFBNkMsRUFBRSxRQUFnQztRQUM3SSxRQUFRLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFcEMsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxrQkFBbUIsQ0FBQztRQUM1RCxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzNFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQXVFLHNCQUFzQixFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUNqSixJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM1RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUF1RSx1QkFBdUIsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDbEosSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNEO0FBRU0sSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBc0JuRCxZQUN3QixxQkFBNkQsRUFDL0QsbUJBQXlELEVBQ3pELG1CQUF5RCxFQUM5Qyw4QkFBK0U7UUFFL0csS0FBSyxFQUFFLENBQUM7UUFMZ0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM5Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDN0IsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFnQztRQXZCL0Ysd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBdUIsQ0FBQyxDQUFDO1FBMEJ6RixJQUFJLENBQUMsY0FBYyxHQUFHO1lBQ3JCLElBQUksTUFBTSxDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxlQUFlLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBQyxPQUFPLEVBQUMsRUFBRTtnQkFDekgsSUFBSSxPQUFPLFlBQVksMEJBQTBCLEVBQUUsQ0FBQztvQkFDbkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQzt3QkFDMUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQzs0QkFDN0IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRzs0QkFDeEIsS0FBSyxFQUFFLFNBQVM7NEJBQ2hCLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQXdCOzRCQUM5QyxXQUFXLEVBQUUsSUFBSTs0QkFDakIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSzt5QkFDNUIsQ0FBQyxDQUFDO29CQUNKLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQztZQUNGLElBQUksU0FBUyxFQUFFO1lBQ2YsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQztZQUM5RCxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDO1lBQ2xFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUM7U0FDakUsQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHLENBQUMsT0FBaUIsRUFBRSxhQUE2QixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzlILE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxDQUFXLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUMvQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsK0JBQStCLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDN0gsTUFBTSxnQkFBZ0IsR0FBRztZQUN4QixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDO1lBQ2xHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUM7WUFDcEcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQztZQUNuRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDO1lBQ3JHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUM7WUFDM0csSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQztZQUNsRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDO1lBQzNHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUM7WUFDckcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQztZQUNyRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDO1lBQ2xHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUM7WUFDcEcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQztZQUN4RyxpQkFBaUI7U0FDakIsQ0FBQztRQUVGLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQztRQUN0RyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDbEMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsRUFDbEQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FDOUIsQ0FBQztRQUNGLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxpQkFBaUIsQ0FBQyw0QkFBNEIsQ0FBQztRQUNuRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDdEYsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQzlGLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUN0RixJQUFJLENBQUMsd0JBQXdCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDcEcsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFFOUUsSUFBSSxDQUFDLFlBQVksR0FBRztZQUNuQixHQUFHLGdCQUFnQjtZQUNuQixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDO1lBQy9ELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUM7U0FDdkUsQ0FBQztJQUNILENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxPQUFpQixFQUFFLGFBQTZCO1FBQzVFLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxhQUFhLDJDQUFtQyxFQUFFLENBQUM7WUFDeEgsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLCtCQUErQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLDhCQUE4QixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDcEYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDckYsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDNUMsQ0FBQztJQUVELGVBQWUsQ0FBQyxPQUFtQyxFQUFFLGlCQUE4QjtRQUNsRixNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMxRSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7Z0JBQ3hDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYztnQkFDckMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFjLGNBQWM7Z0JBQzVDLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87YUFDaEMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFFRCxpQ0FBaUMsQ0FBQyxVQUF1QjtRQUN4RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNGLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxhQUEwQixFQUFFLEdBQVc7UUFDbEUsT0FBTyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxnQkFBZ0IsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxPQUFvQjtRQUNoRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkUsT0FBTyxjQUFjLElBQUksY0FBYyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2hHLENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxPQUFvQjtRQUMvQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkUsT0FBTyxjQUFjLElBQUksY0FBYyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMvRixDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNwQyxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUMxQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDcEMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBeEpZLG9CQUFvQjtJQXVCOUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSw4QkFBOEIsQ0FBQTtHQTFCcEIsb0JBQW9CLENBd0poQzs7QUFFRDs7R0FFRztBQUNILFNBQVMsaUJBQWlCLENBQUMsV0FBdUMsRUFBRSxRQUFrQyxFQUFFLGVBQXdCO0lBQy9ILElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNuQyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RFLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN6RCxRQUFRLENBQUMsNkJBQTZCLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztZQUMxRCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUN6RSxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxhQUFjLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM5RyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDO1lBQUMsQ0FBQztZQUN0RSxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsYUFBYyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3RSxDQUFDO0lBQ0YsQ0FBQztJQUNELFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzVELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxzQkFBc0IsQ0FDOUIsV0FBdUMsRUFDdkMsUUFBK0QsRUFDL0QsS0FBcUQsRUFDckQsZUFBd0I7SUFFeEIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDekQsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BELElBQUksTUFBTSxJQUFJLE1BQU0sS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUM3QixRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN6RCxRQUFRLENBQUMsNkJBQTZCLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztZQUMxRCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUN6RSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNuSCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDO1lBQUMsQ0FBQztZQUN0RSxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsT0FBYTtJQUMzQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNwRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6QyxNQUFNLE9BQU8sR0FBYSxLQUFNLENBQUMsT0FBTyxJQUFjLEtBQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbkYsSUFBSSxPQUFPLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDdkIsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hCLENBQUM7YUFBTSxDQUFDO1lBQ1AscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsSUFBWSxFQUFFLE9BQU8sR0FBRyxJQUFJO0lBQ3BELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLEVBQUU7UUFDNUYsTUFBTSxVQUFVLEdBQVcsY0FBYyxJQUFJLFdBQVcsQ0FBQztRQUN6RCxNQUFNLG1CQUFtQixHQUFHLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sVUFBVSxHQUFHLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxLQUFLLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25GLE9BQU8sT0FBTyxDQUFDLENBQUM7WUFDZixJQUFJLFVBQVUsTUFBTSxVQUFVLEtBQUssVUFBVSxJQUFJLENBQUMsQ0FBQztZQUNuRCxJQUFJLFVBQVUsR0FBRyxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsU0FBaUI7SUFDOUMsT0FBTyxTQUFTLElBQUksU0FBUztTQUMzQixPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQztTQUNyQixPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3pCLENBQUM7QUFHTSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjtJQUM5QixZQUNTLFNBQW1DLEVBQ0wsa0JBQWdEO1FBRDlFLGNBQVMsR0FBVCxTQUFTLENBQTBCO1FBQ0wsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUE4QjtJQUNuRixDQUFDO0lBRUwsTUFBTSxDQUFDLE9BQTRCLEVBQUUsZ0JBQWdDO1FBQ3BFLHVCQUF1QjtRQUN2QixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLElBQUksT0FBTyxZQUFZLDBCQUEwQixFQUFFLENBQUM7WUFDdEYsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUNyRixPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7UUFDRixDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLElBQUksT0FBTyxZQUFZLDBCQUEwQixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYywyQ0FBbUMsRUFBRSxDQUFDO1lBQ3ZILE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDO1lBQzNELElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BFLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFFRCxpQ0FBaUM7UUFDakMsSUFBSSxPQUFPLFlBQVksd0JBQXdCLEVBQUUsQ0FBQztZQUNqRCxJQUFJLE9BQU8sT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztZQUMxQixDQUFDO1lBRUQsc0NBQThCO1FBQy9CLENBQUM7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBSSxPQUFPLFlBQVksZ0NBQWdDLEVBQUUsQ0FBQztZQUN6RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hFLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxPQUFpQixFQUFFLEtBQStCO1FBQ2pGLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbEMsSUFBSSxLQUFLLFlBQVksd0JBQXdCLEVBQUUsQ0FBQztnQkFDL0MsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3JELENBQUM7aUJBQU0sSUFBSSxLQUFLLFlBQVksMEJBQTBCLEVBQUUsQ0FBQztnQkFDeEQsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQzFDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBcERZLGtCQUFrQjtJQUc1QixXQUFBLDRCQUE0QixDQUFBO0dBSGxCLGtCQUFrQixDQW9EOUI7O0FBRUQsTUFBTSxvQkFBcUIsU0FBUSx5QkFBaUQ7SUFFbkYsYUFBYSxDQUFDLE9BQWlHO1FBQzlHLElBQUksT0FBTyxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDakQsT0FBTyw0QkFBNEIsQ0FBQztRQUNyQyxDQUFDO1FBRUQsSUFBSSxPQUFPLFlBQVksMEJBQTBCLEVBQUUsQ0FBQztZQUNuRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEtBQUssZ0JBQWdCLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQzVELE9BQU8scUNBQXFDLENBQUM7WUFDOUMsQ0FBQztZQUVELE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFlBQVksSUFBSSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixPQUFPLDRCQUE0QixDQUFDO1lBQ3JDLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEtBQUssZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3BELE9BQU8seUJBQXlCLENBQUM7WUFDbEMsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLFNBQVMsS0FBSyxnQkFBZ0IsQ0FBQyxPQUFPO2dCQUNqRCxPQUFPLENBQUMsU0FBUyxLQUFLLGdCQUFnQixDQUFDLE1BQU07Z0JBQzdDLE9BQU8sQ0FBQyxTQUFTLEtBQUssZ0JBQWdCLENBQUMsZUFBZTtnQkFDdEQsT0FBTyxDQUFDLFNBQVMsS0FBSyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDeEQsT0FBTywyQkFBMkIsQ0FBQztZQUNwQyxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLGdCQUFnQixDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUM1RCxPQUFPLG1DQUFtQyxDQUFDO1lBQzVDLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ25ELE9BQU8seUJBQXlCLENBQUM7WUFDbEMsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLFNBQVMsS0FBSyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDakQsT0FBTyx5QkFBeUIsQ0FBQztZQUNsQyxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNsRCxPQUFPLDBCQUEwQixDQUFDO1lBQ25DLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEtBQUssZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3BELE9BQU8sNEJBQTRCLENBQUM7WUFDckMsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLFNBQVMsS0FBSyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDcEQsT0FBTyw0QkFBNEIsQ0FBQztZQUNyQyxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNuRCxPQUFPLDJCQUEyQixDQUFDO1lBQ3BDLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEtBQUssZ0JBQWdCLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQzFELE9BQU8sZ0NBQWdDLENBQUM7WUFDekMsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLFNBQVMsS0FBSyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDMUQsT0FBTyxtQ0FBbUMsQ0FBQztZQUM1QyxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN4RCxPQUFPLDRCQUE0QixDQUFDO1lBQ3JDLENBQUM7WUFFRCxPQUFPLDRCQUE0QixDQUFDO1FBQ3JDLENBQUM7UUFFRCxJQUFJLE9BQU8sWUFBWSxnQ0FBZ0MsRUFBRSxDQUFDO1lBQ3pELE9BQU8sbUNBQW1DLENBQUM7UUFDNUMsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELGdCQUFnQixDQUFDLE9BQWlHO1FBQ2pILE9BQU8sQ0FBQyxDQUFDLE9BQU8sWUFBWSx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFUyxjQUFjLENBQUMsT0FBK0I7UUFDdkQsSUFBSSxPQUFPLFlBQVksd0JBQXdCLEVBQUUsQ0FBQztZQUNqRCxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxPQUFPLE9BQU8sWUFBWSwwQkFBMEIsSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDbkgsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDZCQUFpQyxTQUFRLGVBQWtCO0lBQzlELGFBQWEsQ0FBQyxPQUFVO1FBQ2hDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVRLFlBQVksQ0FBQyxPQUFVLEVBQUUsU0FBbUIsRUFBRSxTQUFtQjtRQUN6RSxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRDtBQUVELE1BQU0saUNBQWlDO0lBQ3RDLFlBQTZCLG9CQUFvRCxFQUFtQixlQUFpQyxFQUFtQix1QkFBaUQ7UUFBNUsseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFnQztRQUFtQixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFBbUIsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtJQUN6TSxDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQTRCO1FBQ3hDLElBQUksT0FBTyxZQUFZLDBCQUEwQixFQUFFLENBQUM7WUFDbkQsTUFBTSxpQkFBaUIsR0FBYSxFQUFFLENBQUM7WUFDdkMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLGVBQWUsSUFBSSxPQUFPLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztZQUU5RSxJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUNoRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDdEMsQ0FBQztZQUVELE1BQU0sd0JBQXdCLEdBQUcsMkJBQTJCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3JKLElBQUksd0JBQXdCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixHQUFHLENBQUMsQ0FBQztZQUN4RCxDQUFDO1lBRUQsTUFBTSw4QkFBOEIsR0FBRyx5QkFBeUIsQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekgsSUFBSSw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDM0MsaUJBQWlCLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7WUFDeEQsQ0FBQztZQUNELE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7YUFBTSxJQUFJLE9BQU8sWUFBWSx3QkFBd0IsRUFBRSxDQUFDO1lBQ3hELE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQztRQUN0QixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNuQixDQUFDO0lBQ0YsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixPQUFPLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDekMsQ0FBQztDQUNEO0FBRU0sSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBYSxTQUFRLG1CQUF3QztJQUN6RSxZQUNDLFNBQXNCLEVBQ3RCLFNBQW1DLEVBQ25DLFNBQTBDLEVBQ3RCLGlCQUFxQyxFQUMzQyxXQUF5QixFQUNQLG9CQUFvRCxFQUM3RCxvQkFBMkMsRUFDaEQsZUFBaUMsRUFDekIsdUJBQWlEO1FBRTNFLEtBQUssQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUM5QixJQUFJLG9CQUFvQixFQUFFLEVBQzFCLFNBQVMsRUFDVDtZQUNDLG1CQUFtQixFQUFFLEtBQUs7WUFDMUIscUJBQXFCLEVBQUUsSUFBSTtZQUMzQixxQkFBcUIsRUFBRSxJQUFJO1lBQzNCLGdCQUFnQixFQUFFO2dCQUNqQixLQUFLLENBQUMsQ0FBQztvQkFDTixPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsQ0FBQzthQUNEO1lBQ0QscUJBQXFCLEVBQUUsSUFBSSxpQ0FBaUMsQ0FBQyxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsdUJBQXVCLENBQUM7WUFDNUgsZUFBZSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkcsTUFBTSxFQUFFLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUM7WUFDMUUsZUFBZSxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FBVSxnQ0FBZ0MsQ0FBQztZQUN6Rix3QkFBd0IsRUFBRSxLQUFLO1lBQy9CLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUMsSUFBSTtZQUMzQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMseUNBQXlDO1NBQ3RFLEVBQ0Qsb0JBQW9CLEVBQ3BCLGlCQUFpQixFQUNqQixXQUFXLEVBQ1gsb0JBQW9CLENBQ3BCLENBQUM7UUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRTVELElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1lBQ3hCLGNBQWMsRUFBRSxnQkFBZ0I7WUFDaEMsNkJBQTZCLEVBQUUsZ0JBQWdCO1lBQy9DLDZCQUE2QixFQUFFLFVBQVU7WUFDekMsK0JBQStCLEVBQUUsZ0JBQWdCO1lBQ2pELCtCQUErQixFQUFFLFVBQVU7WUFDM0MsbUJBQW1CLEVBQUUsZ0JBQWdCO1lBQ3JDLG1CQUFtQixFQUFFLFVBQVU7WUFDL0IsbUJBQW1CLEVBQUUsVUFBVTtZQUMvQixtQkFBbUIsRUFBRSxnQkFBZ0I7WUFDckMsZ0JBQWdCLEVBQUUsZ0JBQWdCO1lBQ2xDLGdCQUFnQixFQUFFLGdCQUFnQjtZQUNsQywrQkFBK0IsRUFBRSxnQkFBZ0I7WUFDakQsK0JBQStCLEVBQUUsVUFBVTtZQUMzQywyQkFBMkIsRUFBRSxnQkFBZ0I7WUFDN0Msd0JBQXdCLEVBQUUsZ0JBQWdCO1lBQzFDLHNCQUFzQixFQUFFLFNBQVM7WUFDakMsOEJBQThCLEVBQUUsU0FBUztTQUN6QyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGdDQUFnQyxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLGFBQWEsQ0FBQztvQkFDbEIsZUFBZSxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FBVSxnQ0FBZ0MsQ0FBQztpQkFDekYsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRWtCLFdBQVcsQ0FBQyxJQUFZLEVBQUUsT0FBbUQ7UUFDL0YsT0FBTyxJQUFJLDZCQUE2QixDQUF5QixJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakYsQ0FBQztDQUNELENBQUE7QUF6RVksWUFBWTtJQUt0QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSw4QkFBOEIsQ0FBQTtJQUM5QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSx3QkFBd0IsQ0FBQTtHQVZkLFlBQVksQ0F5RXhCOztBQUVELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsTUFBTTs7YUFDdkIsT0FBRSxHQUFHLHdCQUF3QixBQUEzQixDQUE0QjthQUM5QixVQUFLLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLEFBQXBELENBQXFEO0lBRTFFLFlBQ3FDLGdCQUFtQztRQUV2RSxLQUFLLENBQUMscUJBQW1CLENBQUMsRUFBRSxFQUFFLHFCQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRnJCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7SUFHeEUsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBbUM7UUFDckQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkMsQ0FBQzs7QUFoQkksbUJBQW1CO0lBS3RCLFdBQUEsaUJBQWlCLENBQUE7R0FMZCxtQkFBbUIsQ0FpQnhCO0FBRUQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxNQUFNOzthQUMzQixPQUFFLEdBQUcsNEJBQTRCLEFBQS9CLENBQWdDO2FBQ2xDLFVBQUssR0FBRyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsc0JBQXNCLENBQUMsQUFBN0QsQ0FBOEQ7SUFFbkYsWUFDcUMsZ0JBQW1DO1FBRXZFLEtBQUssQ0FBQyx5QkFBdUIsQ0FBQyxFQUFFLEVBQUUseUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFGN0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtJQUd4RSxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFtQztRQUNyRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxVQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDakcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkMsQ0FBQzs7QUFqQkksdUJBQXVCO0lBSzFCLFdBQUEsaUJBQWlCLENBQUE7R0FMZCx1QkFBdUIsQ0FrQjVCO0FBRUQsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxNQUFNOzthQUMxQixPQUFFLEdBQUcsMkJBQTJCLEFBQTlCLENBQStCO2FBQ2pDLFVBQUssR0FBRyxRQUFRLENBQUMsdUJBQXVCLEVBQUUscUJBQXFCLENBQUMsQUFBM0QsQ0FBNEQ7SUFFakYsWUFDcUMsZ0JBQW1DLEVBQ3JDLGNBQStCO1FBRWpFLEtBQUssQ0FBQyx3QkFBc0IsQ0FBQyxFQUFFLEVBQUUsd0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFIM0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNyQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7SUFHbEUsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBbUM7UUFDckQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ3ZDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDO1lBQ2hELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxVQUFVLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3ZHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7O0FBcEJJLHNCQUFzQjtJQUt6QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZUFBZSxDQUFBO0dBTlosc0JBQXNCLENBcUIzQjtBQUVELElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsTUFBTTs7YUFDckIsT0FBRSxHQUFHLDZCQUE2QixBQUFoQyxDQUFpQzthQUNuQyxVQUFLLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG1CQUFtQixDQUFDLEFBQXRELENBQXVEO0lBRTVFLFlBQ2tCLE9BQWlCLEVBQ00sYUFBb0M7UUFFNUUsS0FBSyxDQUFDLG1CQUFpQixDQUFDLEVBQUUsRUFBRSxtQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUhwQyxZQUFPLEdBQVAsT0FBTyxDQUFVO1FBQ00sa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBRzVFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkosSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNO1FBQ1gsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMseUJBQXlCLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUc7UUFDakIsb0VBQW9FO1FBQ3BFLElBQUksWUFBWSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBVyw4QkFBOEIsQ0FBQyxDQUFDLENBQUM7UUFDOUYsWUFBWSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRWhHLE1BQU0sc0JBQXNCLEdBQUcseUJBQXlCLEVBQUUsQ0FBQztRQUMzRCxNQUFNLGdCQUFnQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUVsQyw4REFBOEQ7UUFDOUQsSUFBSSxXQUFXLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUNyQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFFRCxzRUFBc0U7UUFDdEUsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsbUNBQTJCLENBQUM7UUFFekksT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7O0FBeENJLGlCQUFpQjtJQU1wQixXQUFBLHFCQUFxQixDQUFBO0dBTmxCLGlCQUFpQixDQTBDdEI7QUFFRCxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLE1BQU07O2FBQ25DLE9BQUUsR0FBRyw2QkFBNkIsQUFBaEMsQ0FBaUM7YUFDbkMsVUFBSyxHQUFHLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSwrQkFBK0IsQ0FBQyxBQUFsRSxDQUFtRTtJQUV4RixZQUNrQixPQUFpQixFQUNlLGFBQTZDO1FBRTlGLEtBQUssQ0FBQyxpQ0FBK0IsQ0FBQyxFQUFFLEVBQUUsaUNBQStCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFIaEUsWUFBTyxHQUFQLE9BQU8sQ0FBVTtRQUNlLGtCQUFhLEdBQWIsYUFBYSxDQUFnQztRQUc5RixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25KLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNO1FBQ0wsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBVywwQkFBMEIsQ0FBQyxDQUFDO1FBQzlGLElBQUksQ0FBQyxPQUFPLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHO1FBQ2pCLG9FQUFvRTtRQUNwRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBVywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUV0RixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRCxDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyx5Q0FBaUMsQ0FBQztZQUN4SixNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyx5Q0FBaUMsQ0FBQztRQUMxSSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLHlDQUFpQyxDQUFDO1lBQ3pJLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyx5Q0FBaUMsQ0FBQztRQUN2SixDQUFDO0lBQ0YsQ0FBQzs7QUFwQ0ksK0JBQStCO0lBTWxDLFdBQUEsOEJBQThCLENBQUE7R0FOM0IsK0JBQStCLENBc0NwQyJ9