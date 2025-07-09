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
var WorkspaceConfigurationRenderer_1;
import { EventHelper, getDomNodePagePosition } from '../../../../base/browser/dom.js';
import { SubmenuAction } from '../../../../base/common/actions.js';
import { Delayer } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { CodeActionKind } from '../../../../editor/contrib/codeAction/common/types.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, OVERRIDE_PROPERTY_REGEX, overrideIdentifiersFromKey } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { RangeHighlightDecorations } from '../../../browser/codeeditor.js';
import { settingsEditIcon } from './preferencesIcons.js';
import { EditPreferenceWidget } from './preferencesWidgets.js';
import { APPLICATION_SCOPES, APPLY_ALL_PROFILES_SETTING, IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { DefaultSettingsEditorModel, WorkspaceConfigurationEditorModel } from '../../../services/preferences/common/preferencesModels.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { EXPERIMENTAL_INDICATOR_DESCRIPTION, PREVIEW_INDICATOR_DESCRIPTION } from '../common/preferences.js';
let UserSettingsRenderer = class UserSettingsRenderer extends Disposable {
    constructor(editor, preferencesModel, preferencesService, configurationService, instantiationService) {
        super();
        this.editor = editor;
        this.preferencesModel = preferencesModel;
        this.preferencesService = preferencesService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.modelChangeDelayer = new Delayer(200);
        this.settingHighlighter = this._register(instantiationService.createInstance(SettingHighlighter, editor));
        this.editSettingActionRenderer = this._register(this.instantiationService.createInstance(EditSettingRenderer, this.editor, this.preferencesModel, this.settingHighlighter));
        this._register(this.editSettingActionRenderer.onUpdateSetting(({ key, value, source }) => this.updatePreference(key, value, source)));
        this._register(this.editor.getModel().onDidChangeContent(() => this.modelChangeDelayer.trigger(() => this.onModelChanged())));
        this.unsupportedSettingsRenderer = this._register(instantiationService.createInstance(UnsupportedSettingsRenderer, editor, preferencesModel));
    }
    render() {
        this.editSettingActionRenderer.render(this.preferencesModel.settingsGroups, this.associatedPreferencesModel);
        this.unsupportedSettingsRenderer.render();
    }
    updatePreference(key, value, source) {
        const overrideIdentifiers = source.overrideOf ? overrideIdentifiersFromKey(source.overrideOf.key) : null;
        const resource = this.preferencesModel.uri;
        this.configurationService.updateValue(key, value, { overrideIdentifiers, resource }, this.preferencesModel.configurationTarget)
            .then(() => this.onSettingUpdated(source));
    }
    onModelChanged() {
        if (!this.editor.hasModel()) {
            // model could have been disposed during the delay
            return;
        }
        this.render();
    }
    onSettingUpdated(setting) {
        this.editor.focus();
        setting = this.getSetting(setting);
        if (setting) {
            // TODO:@sandy Selection range should be template range
            this.editor.setSelection(setting.valueRange);
            this.settingHighlighter.highlight(setting, true);
        }
    }
    getSetting(setting) {
        const { key, overrideOf } = setting;
        if (overrideOf) {
            const setting = this.getSetting(overrideOf);
            for (const override of setting.overrides) {
                if (override.key === key) {
                    return override;
                }
            }
            return undefined;
        }
        return this.preferencesModel.getPreference(key);
    }
    focusPreference(setting) {
        const s = this.getSetting(setting);
        if (s) {
            this.settingHighlighter.highlight(s, true);
            this.editor.setPosition({ lineNumber: s.keyRange.startLineNumber, column: s.keyRange.startColumn });
        }
        else {
            this.settingHighlighter.clear(true);
        }
    }
    clearFocus(setting) {
        this.settingHighlighter.clear(true);
    }
    editPreference(setting) {
        const editableSetting = this.getSetting(setting);
        return !!(editableSetting && this.editSettingActionRenderer.activateOnSetting(editableSetting));
    }
};
UserSettingsRenderer = __decorate([
    __param(2, IPreferencesService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService)
], UserSettingsRenderer);
export { UserSettingsRenderer };
let WorkspaceSettingsRenderer = class WorkspaceSettingsRenderer extends UserSettingsRenderer {
    constructor(editor, preferencesModel, preferencesService, configurationService, instantiationService) {
        super(editor, preferencesModel, preferencesService, configurationService, instantiationService);
        this.workspaceConfigurationRenderer = this._register(instantiationService.createInstance(WorkspaceConfigurationRenderer, editor, preferencesModel));
    }
    render() {
        super.render();
        this.workspaceConfigurationRenderer.render();
    }
};
WorkspaceSettingsRenderer = __decorate([
    __param(2, IPreferencesService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService)
], WorkspaceSettingsRenderer);
export { WorkspaceSettingsRenderer };
let EditSettingRenderer = class EditSettingRenderer extends Disposable {
    constructor(editor, primarySettingsModel, settingHighlighter, configurationService, instantiationService, contextMenuService) {
        super();
        this.editor = editor;
        this.primarySettingsModel = primarySettingsModel;
        this.settingHighlighter = settingHighlighter;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.settingsGroups = [];
        this._onUpdateSetting = this._register(new Emitter());
        this.onUpdateSetting = this._onUpdateSetting.event;
        this.editPreferenceWidgetForCursorPosition = this._register(this.instantiationService.createInstance((EditPreferenceWidget), editor));
        this.editPreferenceWidgetForMouseMove = this._register(this.instantiationService.createInstance((EditPreferenceWidget), editor));
        this.toggleEditPreferencesForMouseMoveDelayer = new Delayer(75);
        this._register(this.editPreferenceWidgetForCursorPosition.onClick(e => this.onEditSettingClicked(this.editPreferenceWidgetForCursorPosition, e)));
        this._register(this.editPreferenceWidgetForMouseMove.onClick(e => this.onEditSettingClicked(this.editPreferenceWidgetForMouseMove, e)));
        this._register(this.editor.onDidChangeCursorPosition(positionChangeEvent => this.onPositionChanged(positionChangeEvent)));
        this._register(this.editor.onMouseMove(mouseMoveEvent => this.onMouseMoved(mouseMoveEvent)));
        this._register(this.editor.onDidChangeConfiguration(() => this.onConfigurationChanged()));
    }
    render(settingsGroups, associatedPreferencesModel) {
        this.editPreferenceWidgetForCursorPosition.hide();
        this.editPreferenceWidgetForMouseMove.hide();
        this.settingsGroups = settingsGroups;
        this.associatedPreferencesModel = associatedPreferencesModel;
        const settings = this.getSettings(this.editor.getPosition().lineNumber);
        if (settings.length) {
            this.showEditPreferencesWidget(this.editPreferenceWidgetForCursorPosition, settings);
        }
    }
    isDefaultSettings() {
        return this.primarySettingsModel instanceof DefaultSettingsEditorModel;
    }
    onConfigurationChanged() {
        if (!this.editor.getOption(59 /* EditorOption.glyphMargin */)) {
            this.editPreferenceWidgetForCursorPosition.hide();
            this.editPreferenceWidgetForMouseMove.hide();
        }
    }
    onPositionChanged(positionChangeEvent) {
        this.editPreferenceWidgetForMouseMove.hide();
        const settings = this.getSettings(positionChangeEvent.position.lineNumber);
        if (settings.length) {
            this.showEditPreferencesWidget(this.editPreferenceWidgetForCursorPosition, settings);
        }
        else {
            this.editPreferenceWidgetForCursorPosition.hide();
        }
    }
    onMouseMoved(mouseMoveEvent) {
        const editPreferenceWidget = this.getEditPreferenceWidgetUnderMouse(mouseMoveEvent);
        if (editPreferenceWidget) {
            this.onMouseOver(editPreferenceWidget);
            return;
        }
        this.settingHighlighter.clear();
        this.toggleEditPreferencesForMouseMoveDelayer.trigger(() => this.toggleEditPreferenceWidgetForMouseMove(mouseMoveEvent));
    }
    getEditPreferenceWidgetUnderMouse(mouseMoveEvent) {
        if (mouseMoveEvent.target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */) {
            const line = mouseMoveEvent.target.position.lineNumber;
            if (this.editPreferenceWidgetForMouseMove.getLine() === line && this.editPreferenceWidgetForMouseMove.isVisible()) {
                return this.editPreferenceWidgetForMouseMove;
            }
            if (this.editPreferenceWidgetForCursorPosition.getLine() === line && this.editPreferenceWidgetForCursorPosition.isVisible()) {
                return this.editPreferenceWidgetForCursorPosition;
            }
        }
        return undefined;
    }
    toggleEditPreferenceWidgetForMouseMove(mouseMoveEvent) {
        const settings = mouseMoveEvent.target.position ? this.getSettings(mouseMoveEvent.target.position.lineNumber) : null;
        if (settings && settings.length) {
            this.showEditPreferencesWidget(this.editPreferenceWidgetForMouseMove, settings);
        }
        else {
            this.editPreferenceWidgetForMouseMove.hide();
        }
    }
    showEditPreferencesWidget(editPreferencesWidget, settings) {
        const line = settings[0].valueRange.startLineNumber;
        if (this.editor.getOption(59 /* EditorOption.glyphMargin */) && this.marginFreeFromOtherDecorations(line)) {
            editPreferencesWidget.show(line, nls.localize('editTtile', "Edit"), settings);
            const editPreferenceWidgetToHide = editPreferencesWidget === this.editPreferenceWidgetForCursorPosition ? this.editPreferenceWidgetForMouseMove : this.editPreferenceWidgetForCursorPosition;
            editPreferenceWidgetToHide.hide();
        }
    }
    marginFreeFromOtherDecorations(line) {
        const decorations = this.editor.getLineDecorations(line);
        if (decorations) {
            for (const { options } of decorations) {
                if (options.glyphMarginClassName && options.glyphMarginClassName.indexOf(ThemeIcon.asClassName(settingsEditIcon)) === -1) {
                    return false;
                }
            }
        }
        return true;
    }
    getSettings(lineNumber) {
        const configurationMap = this.getConfigurationsMap();
        return this.getSettingsAtLineNumber(lineNumber).filter(setting => {
            const configurationNode = configurationMap[setting.key];
            if (configurationNode) {
                if (configurationNode.policy && this.configurationService.inspect(setting.key).policyValue !== undefined) {
                    return false;
                }
                if (this.isDefaultSettings()) {
                    if (setting.key === 'launch') {
                        // Do not show because of https://github.com/microsoft/vscode/issues/32593
                        return false;
                    }
                    return true;
                }
                if (configurationNode.type === 'boolean' || configurationNode.enum) {
                    if (this.primarySettingsModel.configurationTarget !== 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
                        return true;
                    }
                    if (configurationNode.scope === 5 /* ConfigurationScope.RESOURCE */ || configurationNode.scope === 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
    getSettingsAtLineNumber(lineNumber) {
        // index of setting, across all groups/sections
        let index = 0;
        const settings = [];
        for (const group of this.settingsGroups) {
            if (group.range.startLineNumber > lineNumber) {
                break;
            }
            if (lineNumber >= group.range.startLineNumber && lineNumber <= group.range.endLineNumber) {
                for (const section of group.sections) {
                    for (const setting of section.settings) {
                        if (setting.range.startLineNumber > lineNumber) {
                            break;
                        }
                        if (lineNumber >= setting.range.startLineNumber && lineNumber <= setting.range.endLineNumber) {
                            if (!this.isDefaultSettings() && setting.overrides.length) {
                                // Only one level because override settings cannot have override settings
                                for (const overrideSetting of setting.overrides) {
                                    if (lineNumber >= overrideSetting.range.startLineNumber && lineNumber <= overrideSetting.range.endLineNumber) {
                                        settings.push({ ...overrideSetting, index, groupId: group.id });
                                    }
                                }
                            }
                            else {
                                settings.push({ ...setting, index, groupId: group.id });
                            }
                        }
                        index++;
                    }
                }
            }
        }
        return settings;
    }
    onMouseOver(editPreferenceWidget) {
        this.settingHighlighter.highlight(editPreferenceWidget.preferences[0]);
    }
    onEditSettingClicked(editPreferenceWidget, e) {
        EventHelper.stop(e.event, true);
        const actions = this.getSettings(editPreferenceWidget.getLine()).length === 1 ? this.getActions(editPreferenceWidget.preferences[0], this.getConfigurationsMap()[editPreferenceWidget.preferences[0].key])
            : editPreferenceWidget.preferences.map(setting => new SubmenuAction(`preferences.submenu.${setting.key}`, setting.key, this.getActions(setting, this.getConfigurationsMap()[setting.key])));
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.event,
            getActions: () => actions
        });
    }
    activateOnSetting(setting) {
        const startLine = setting.keyRange.startLineNumber;
        const settings = this.getSettings(startLine);
        if (!settings.length) {
            return false;
        }
        this.editPreferenceWidgetForMouseMove.show(startLine, '', settings);
        const actions = this.getActions(this.editPreferenceWidgetForMouseMove.preferences[0], this.getConfigurationsMap()[this.editPreferenceWidgetForMouseMove.preferences[0].key]);
        this.contextMenuService.showContextMenu({
            getAnchor: () => this.toAbsoluteCoords(new Position(startLine, 1)),
            getActions: () => actions
        });
        return true;
    }
    toAbsoluteCoords(position) {
        const positionCoords = this.editor.getScrolledVisiblePosition(position);
        const editorCoords = getDomNodePagePosition(this.editor.getDomNode());
        const x = editorCoords.left + positionCoords.left;
        const y = editorCoords.top + positionCoords.top + positionCoords.height;
        return { x, y: y + 10 };
    }
    getConfigurationsMap() {
        return Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
    }
    getActions(setting, jsonSchema) {
        if (jsonSchema.type === 'boolean') {
            return [{
                    id: 'truthyValue',
                    label: 'true',
                    tooltip: 'true',
                    enabled: true,
                    run: () => this.updateSetting(setting.key, true, setting),
                    class: undefined
                }, {
                    id: 'falsyValue',
                    label: 'false',
                    tooltip: 'false',
                    enabled: true,
                    run: () => this.updateSetting(setting.key, false, setting),
                    class: undefined
                }];
        }
        if (jsonSchema.enum) {
            return jsonSchema.enum.map(value => {
                return {
                    id: value,
                    label: JSON.stringify(value),
                    tooltip: JSON.stringify(value),
                    enabled: true,
                    run: () => this.updateSetting(setting.key, value, setting),
                    class: undefined
                };
            });
        }
        return this.getDefaultActions(setting);
    }
    getDefaultActions(setting) {
        if (this.isDefaultSettings()) {
            const settingInOtherModel = this.associatedPreferencesModel.getPreference(setting.key);
            return [{
                    id: 'setDefaultValue',
                    label: settingInOtherModel ? nls.localize('replaceDefaultValue', "Replace in Settings") : nls.localize('copyDefaultValue', "Copy to Settings"),
                    tooltip: settingInOtherModel ? nls.localize('replaceDefaultValue', "Replace in Settings") : nls.localize('copyDefaultValue', "Copy to Settings"),
                    enabled: true,
                    run: () => this.updateSetting(setting.key, setting.value, setting),
                    class: undefined
                }];
        }
        return [];
    }
    updateSetting(key, value, source) {
        this._onUpdateSetting.fire({ key, value, source });
    }
};
EditSettingRenderer = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IContextMenuService)
], EditSettingRenderer);
let SettingHighlighter = class SettingHighlighter extends Disposable {
    constructor(editor, instantiationService) {
        super();
        this.editor = editor;
        this.fixedHighlighter = this._register(instantiationService.createInstance(RangeHighlightDecorations));
        this.volatileHighlighter = this._register(instantiationService.createInstance(RangeHighlightDecorations));
    }
    highlight(setting, fix = false) {
        this.volatileHighlighter.removeHighlightRange();
        this.fixedHighlighter.removeHighlightRange();
        const highlighter = fix ? this.fixedHighlighter : this.volatileHighlighter;
        highlighter.highlightRange({
            range: setting.valueRange,
            resource: this.editor.getModel().uri
        }, this.editor);
        this.editor.revealLineInCenterIfOutsideViewport(setting.valueRange.startLineNumber, 0 /* editorCommon.ScrollType.Smooth */);
    }
    clear(fix = false) {
        this.volatileHighlighter.removeHighlightRange();
        if (fix) {
            this.fixedHighlighter.removeHighlightRange();
        }
    }
};
SettingHighlighter = __decorate([
    __param(1, IInstantiationService)
], SettingHighlighter);
let UnsupportedSettingsRenderer = class UnsupportedSettingsRenderer extends Disposable {
    constructor(editor, settingsEditorModel, markerService, environmentService, configurationService, workspaceTrustManagementService, uriIdentityService, languageFeaturesService, userDataProfileService, userDataProfilesService) {
        super();
        this.editor = editor;
        this.settingsEditorModel = settingsEditorModel;
        this.markerService = markerService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.uriIdentityService = uriIdentityService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.renderingDelayer = new Delayer(200);
        this.codeActions = new ResourceMap(uri => this.uriIdentityService.extUri.getComparisonKey(uri));
        this._register(this.editor.getModel().onDidChangeContent(() => this.delayedRender()));
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.source === 7 /* ConfigurationTarget.DEFAULT */)(() => this.delayedRender()));
        this._register(languageFeaturesService.codeActionProvider.register({ pattern: settingsEditorModel.uri.path }, this));
        this._register(userDataProfileService.onDidChangeCurrentProfile(() => this.delayedRender()));
    }
    delayedRender() {
        this.renderingDelayer.trigger(() => this.render());
    }
    render() {
        this.codeActions.clear();
        const markerData = this.generateMarkerData();
        if (markerData.length) {
            this.markerService.changeOne('UnsupportedSettingsRenderer', this.settingsEditorModel.uri, markerData);
        }
        else {
            this.markerService.remove('UnsupportedSettingsRenderer', [this.settingsEditorModel.uri]);
        }
    }
    async provideCodeActions(model, range, context, token) {
        const actions = [];
        const codeActionsByRange = this.codeActions.get(model.uri);
        if (codeActionsByRange) {
            for (const [codeActionsRange, codeActions] of codeActionsByRange) {
                if (codeActionsRange.containsRange(range)) {
                    actions.push(...codeActions);
                }
            }
        }
        return {
            actions,
            dispose: () => { }
        };
    }
    generateMarkerData() {
        const markerData = [];
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
        for (const settingsGroup of this.settingsEditorModel.settingsGroups) {
            for (const section of settingsGroup.sections) {
                for (const setting of section.settings) {
                    if (OVERRIDE_PROPERTY_REGEX.test(setting.key)) {
                        if (setting.overrides) {
                            this.handleOverrides(setting.overrides, configurationRegistry, markerData);
                        }
                        continue;
                    }
                    const configuration = configurationRegistry[setting.key];
                    if (configuration) {
                        this.handleUnstableSettingConfiguration(setting, configuration, markerData);
                        if (this.handlePolicyConfiguration(setting, configuration, markerData)) {
                            continue;
                        }
                        switch (this.settingsEditorModel.configurationTarget) {
                            case 3 /* ConfigurationTarget.USER_LOCAL */:
                                this.handleLocalUserConfiguration(setting, configuration, markerData);
                                break;
                            case 4 /* ConfigurationTarget.USER_REMOTE */:
                                this.handleRemoteUserConfiguration(setting, configuration, markerData);
                                break;
                            case 5 /* ConfigurationTarget.WORKSPACE */:
                                this.handleWorkspaceConfiguration(setting, configuration, markerData);
                                break;
                            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                                this.handleWorkspaceFolderConfiguration(setting, configuration, markerData);
                                break;
                        }
                    }
                    else {
                        markerData.push(this.generateUnknownConfigurationMarker(setting));
                    }
                }
            }
        }
        return markerData;
    }
    handlePolicyConfiguration(setting, configuration, markerData) {
        if (!configuration.policy) {
            return false;
        }
        if (this.configurationService.inspect(setting.key).policyValue === undefined) {
            return false;
        }
        if (this.settingsEditorModel.configurationTarget === 7 /* ConfigurationTarget.DEFAULT */) {
            return false;
        }
        markerData.push({
            severity: MarkerSeverity.Hint,
            tags: [1 /* MarkerTag.Unnecessary */],
            ...setting.range,
            message: nls.localize('unsupportedPolicySetting', "This setting cannot be applied because it is configured in the system policy.")
        });
        return true;
    }
    handleOverrides(overrides, configurationRegistry, markerData) {
        for (const setting of overrides || []) {
            const configuration = configurationRegistry[setting.key];
            if (configuration) {
                if (configuration.scope !== 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */) {
                    markerData.push({
                        severity: MarkerSeverity.Hint,
                        tags: [1 /* MarkerTag.Unnecessary */],
                        ...setting.range,
                        message: nls.localize('unsupportLanguageOverrideSetting', "This setting cannot be applied because it is not registered as language override setting.")
                    });
                }
            }
            else {
                markerData.push(this.generateUnknownConfigurationMarker(setting));
            }
        }
    }
    handleLocalUserConfiguration(setting, configuration, markerData) {
        if (!this.userDataProfileService.currentProfile.isDefault && !this.userDataProfileService.currentProfile.useDefaultFlags?.settings) {
            if (isEqual(this.userDataProfilesService.defaultProfile.settingsResource, this.settingsEditorModel.uri) && !this.configurationService.isSettingAppliedForAllProfiles(setting.key)) {
                // If we're in the default profile setting file, and the setting cannot be applied in all profiles
                markerData.push({
                    severity: MarkerSeverity.Hint,
                    tags: [1 /* MarkerTag.Unnecessary */],
                    ...setting.range,
                    message: nls.localize('defaultProfileSettingWhileNonDefaultActive', "This setting cannot be applied while a non-default profile is active. It will be applied when the default profile is active.")
                });
            }
            else if (isEqual(this.userDataProfileService.currentProfile.settingsResource, this.settingsEditorModel.uri)) {
                if (configuration.scope && APPLICATION_SCOPES.includes(configuration.scope)) {
                    // If we're in a profile setting file, and the setting is application-scoped, fade it out.
                    markerData.push(this.generateUnsupportedApplicationSettingMarker(setting));
                }
                else if (this.configurationService.isSettingAppliedForAllProfiles(setting.key)) {
                    // If we're in the non-default profile setting file, and the setting can be applied in all profiles, fade it out.
                    markerData.push({
                        severity: MarkerSeverity.Hint,
                        tags: [1 /* MarkerTag.Unnecessary */],
                        ...setting.range,
                        message: nls.localize('allProfileSettingWhileInNonDefaultProfileSetting', "This setting cannot be applied because it is configured to be applied in all profiles using setting {0}. Value from the default profile will be used instead.", APPLY_ALL_PROFILES_SETTING)
                    });
                }
            }
        }
        if (this.environmentService.remoteAuthority && (configuration.scope === 2 /* ConfigurationScope.MACHINE */ || configuration.scope === 3 /* ConfigurationScope.APPLICATION_MACHINE */ || configuration.scope === 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */)) {
            markerData.push({
                severity: MarkerSeverity.Hint,
                tags: [1 /* MarkerTag.Unnecessary */],
                ...setting.range,
                message: nls.localize('unsupportedRemoteMachineSetting', "This setting cannot be applied in this window. It will be applied when you open a local window.")
            });
        }
    }
    handleRemoteUserConfiguration(setting, configuration, markerData) {
        if (configuration.scope === 1 /* ConfigurationScope.APPLICATION */) {
            markerData.push(this.generateUnsupportedApplicationSettingMarker(setting));
        }
    }
    handleWorkspaceConfiguration(setting, configuration, markerData) {
        if (configuration.scope && APPLICATION_SCOPES.includes(configuration.scope)) {
            markerData.push(this.generateUnsupportedApplicationSettingMarker(setting));
        }
        if (configuration.scope === 2 /* ConfigurationScope.MACHINE */) {
            markerData.push(this.generateUnsupportedMachineSettingMarker(setting));
        }
        if (!this.workspaceTrustManagementService.isWorkspaceTrusted() && configuration.restricted) {
            const marker = this.generateUntrustedSettingMarker(setting);
            markerData.push(marker);
            const codeActions = this.generateUntrustedSettingCodeActions([marker]);
            this.addCodeActions(marker, codeActions);
        }
    }
    handleWorkspaceFolderConfiguration(setting, configuration, markerData) {
        if (configuration.scope && APPLICATION_SCOPES.includes(configuration.scope)) {
            markerData.push(this.generateUnsupportedApplicationSettingMarker(setting));
        }
        if (configuration.scope === 2 /* ConfigurationScope.MACHINE */) {
            markerData.push(this.generateUnsupportedMachineSettingMarker(setting));
        }
        if (configuration.scope === 4 /* ConfigurationScope.WINDOW */) {
            markerData.push({
                severity: MarkerSeverity.Hint,
                tags: [1 /* MarkerTag.Unnecessary */],
                ...setting.range,
                message: nls.localize('unsupportedWindowSetting', "This setting cannot be applied in this workspace. It will be applied when you open the containing workspace folder directly.")
            });
        }
        if (!this.workspaceTrustManagementService.isWorkspaceTrusted() && configuration.restricted) {
            const marker = this.generateUntrustedSettingMarker(setting);
            markerData.push(marker);
            const codeActions = this.generateUntrustedSettingCodeActions([marker]);
            this.addCodeActions(marker, codeActions);
        }
    }
    handleUnstableSettingConfiguration(setting, configuration, markerData) {
        if (configuration.tags?.includes('preview')) {
            markerData.push(this.generatePreviewSettingMarker(setting));
        }
        else if (configuration.tags?.includes('experimental')) {
            markerData.push(this.generateExperimentalSettingMarker(setting));
        }
    }
    generateUnsupportedApplicationSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            tags: [1 /* MarkerTag.Unnecessary */],
            ...setting.range,
            message: nls.localize('unsupportedApplicationSetting', "This setting has an application scope and can be set only in the user settings file.")
        };
    }
    generateUnsupportedMachineSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            tags: [1 /* MarkerTag.Unnecessary */],
            ...setting.range,
            message: nls.localize('unsupportedMachineSetting', "This setting can only be applied in user settings in local window or in remote settings in remote window.")
        };
    }
    generateUntrustedSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Warning,
            ...setting.range,
            message: nls.localize('untrustedSetting', "This setting can only be applied in a trusted workspace.")
        };
    }
    generateUnknownConfigurationMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            tags: [1 /* MarkerTag.Unnecessary */],
            ...setting.range,
            message: nls.localize('unknown configuration setting', "Unknown Configuration Setting")
        };
    }
    generateUntrustedSettingCodeActions(diagnostics) {
        return [{
                title: nls.localize('manage workspace trust', "Manage Workspace Trust"),
                command: {
                    id: 'workbench.trust.manage',
                    title: nls.localize('manage workspace trust', "Manage Workspace Trust")
                },
                diagnostics,
                kind: CodeActionKind.QuickFix.value
            }];
    }
    generatePreviewSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            ...setting.range,
            message: PREVIEW_INDICATOR_DESCRIPTION
        };
    }
    generateExperimentalSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            ...setting.range,
            message: EXPERIMENTAL_INDICATOR_DESCRIPTION
        };
    }
    addCodeActions(range, codeActions) {
        let actions = this.codeActions.get(this.settingsEditorModel.uri);
        if (!actions) {
            actions = [];
            this.codeActions.set(this.settingsEditorModel.uri, actions);
        }
        actions.push([Range.lift(range), codeActions]);
    }
    dispose() {
        this.markerService.remove('UnsupportedSettingsRenderer', [this.settingsEditorModel.uri]);
        this.codeActions.clear();
        super.dispose();
    }
};
UnsupportedSettingsRenderer = __decorate([
    __param(2, IMarkerService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IWorkbenchConfigurationService),
    __param(5, IWorkspaceTrustManagementService),
    __param(6, IUriIdentityService),
    __param(7, ILanguageFeaturesService),
    __param(8, IUserDataProfileService),
    __param(9, IUserDataProfilesService)
], UnsupportedSettingsRenderer);
let WorkspaceConfigurationRenderer = class WorkspaceConfigurationRenderer extends Disposable {
    static { WorkspaceConfigurationRenderer_1 = this; }
    static { this.supportedKeys = ['folders', 'tasks', 'launch', 'extensions', 'settings', 'remoteAuthority', 'transient']; }
    constructor(editor, workspaceSettingsEditorModel, workspaceContextService, markerService) {
        super();
        this.editor = editor;
        this.workspaceSettingsEditorModel = workspaceSettingsEditorModel;
        this.workspaceContextService = workspaceContextService;
        this.markerService = markerService;
        this.renderingDelayer = new Delayer(200);
        this.decorations = this.editor.createDecorationsCollection();
        this._register(this.editor.getModel().onDidChangeContent(() => this.renderingDelayer.trigger(() => this.render())));
    }
    render() {
        const markerData = [];
        if (this.workspaceContextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ && this.workspaceSettingsEditorModel instanceof WorkspaceConfigurationEditorModel) {
            const ranges = [];
            for (const settingsGroup of this.workspaceSettingsEditorModel.configurationGroups) {
                for (const section of settingsGroup.sections) {
                    for (const setting of section.settings) {
                        if (!WorkspaceConfigurationRenderer_1.supportedKeys.includes(setting.key)) {
                            markerData.push({
                                severity: MarkerSeverity.Hint,
                                tags: [1 /* MarkerTag.Unnecessary */],
                                ...setting.range,
                                message: nls.localize('unsupportedProperty', "Unsupported Property")
                            });
                        }
                    }
                }
            }
            this.decorations.set(ranges.map(range => this.createDecoration(range)));
        }
        if (markerData.length) {
            this.markerService.changeOne('WorkspaceConfigurationRenderer', this.workspaceSettingsEditorModel.uri, markerData);
        }
        else {
            this.markerService.remove('WorkspaceConfigurationRenderer', [this.workspaceSettingsEditorModel.uri]);
        }
    }
    static { this._DIM_CONFIGURATION_ = ModelDecorationOptions.register({
        description: 'dim-configuration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        inlineClassName: 'dim-configuration'
    }); }
    createDecoration(range) {
        return {
            range,
            options: WorkspaceConfigurationRenderer_1._DIM_CONFIGURATION_
        };
    }
    dispose() {
        this.markerService.remove('WorkspaceConfigurationRenderer', [this.workspaceSettingsEditorModel.uri]);
        this.decorations.clear();
        super.dispose();
    }
};
WorkspaceConfigurationRenderer = WorkspaceConfigurationRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IMarkerService)
], WorkspaceConfigurationRenderer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNSZW5kZXJlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9wcmVmZXJlbmNlc1JlbmRlcmVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RGLE9BQU8sRUFBVyxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQU14RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDdkYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQXVCLHFCQUFxQixF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