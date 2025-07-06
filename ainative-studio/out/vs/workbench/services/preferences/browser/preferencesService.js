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
import { getErrorMessage } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { parse } from '../../../../base/common/json.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import * as network from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { CoreEditingCommands } from '../../../../editor/browser/coreCommands.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, getDefaultValue, OVERRIDE_PROPERTY_REGEX } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
import { IEditorService, SIDE_GROUP } from '../../editor/common/editorService.js';
import { KeybindingsEditorInput } from './keybindingsEditorInput.js';
import { DEFAULT_SETTINGS_EDITOR_SETTING, FOLDER_SETTINGS_PATH, IPreferencesService, SETTINGS_AUTHORITY, USE_SPLIT_JSON_SETTING, validateSettingsEditorOptions } from '../common/preferences.js';
import { SettingsEditor2Input } from '../common/preferencesEditorInput.js';
import { defaultKeybindingsContents, DefaultKeybindingsEditorModel, DefaultRawSettingsEditorModel, DefaultSettings, DefaultSettingsEditorModel, Settings2EditorModel, SettingsEditorModel, WorkspaceConfigurationEditorModel } from '../common/preferencesModels.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { ITextEditorService } from '../../textfile/common/textEditorService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { isObject } from '../../../../base/common/types.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { compareIgnoreCase } from '../../../../base/common/strings.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { findGroup } from '../../editor/common/editorGroupFinder.js';
const emptyEditableSettingsContent = '{\n}';
let PreferencesService = class PreferencesService extends Disposable {
    constructor(editorService, editorGroupService, textFileService, configurationService, notificationService, contextService, instantiationService, userDataProfileService, userDataProfilesService, textModelResolverService, keybindingService, modelService, jsonEditingService, labelService, remoteAgentService, textEditorService, urlService, extensionService, progressService) {
        super();
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.textFileService = textFileService;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.contextService = contextService;
        this.instantiationService = instantiationService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.textModelResolverService = textModelResolverService;
        this.jsonEditingService = jsonEditingService;
        this.labelService = labelService;
        this.remoteAgentService = remoteAgentService;
        this.textEditorService = textEditorService;
        this.extensionService = extensionService;
        this.progressService = progressService;
        this._onDispose = this._register(new Emitter());
        this._onDidDefaultSettingsContentChanged = this._register(new Emitter());
        this.onDidDefaultSettingsContentChanged = this._onDidDefaultSettingsContentChanged.event;
        this._requestedDefaultSettings = new ResourceSet();
        this._settingsGroups = undefined;
        this._cachedSettingsEditor2Input = undefined;
        this.defaultKeybindingsResource = URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: '/keybindings.json' });
        this.defaultSettingsRawResource = URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: '/defaultSettings.json' });
        // The default keybindings.json updates based on keyboard layouts, so here we make sure
        // if a model has been given out we update it accordingly.
        this._register(keybindingService.onDidUpdateKeybindings(() => {
            const model = modelService.getModel(this.defaultKeybindingsResource);
            if (!model) {
                // model has not been given out => nothing to do
                return;
            }
            modelService.updateModel(model, defaultKeybindingsContents(keybindingService));
        }));
        this._register(urlService.registerHandler(this));
    }
    get userSettingsResource() {
        return this.userDataProfileService.currentProfile.settingsResource;
    }
    get workspaceSettingsResource() {
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return null;
        }
        const workspace = this.contextService.getWorkspace();
        return workspace.configuration || workspace.folders[0].toResource(FOLDER_SETTINGS_PATH);
    }
    createOrGetCachedSettingsEditor2Input() {
        if (!this._cachedSettingsEditor2Input || this._cachedSettingsEditor2Input.isDisposed()) {
            // Recreate the input if the user never opened the Settings editor,
            // or if they closed it and want to reopen it.
            this._cachedSettingsEditor2Input = new SettingsEditor2Input(this);
        }
        return this._cachedSettingsEditor2Input;
    }
    getFolderSettingsResource(resource) {
        const folder = this.contextService.getWorkspaceFolder(resource);
        return folder ? folder.toResource(FOLDER_SETTINGS_PATH) : null;
    }
    hasDefaultSettingsContent(uri) {
        return this.isDefaultSettingsResource(uri) || isEqual(uri, this.defaultSettingsRawResource) || isEqual(uri, this.defaultKeybindingsResource);
    }
    getDefaultSettingsContent(uri) {
        if (this.isDefaultSettingsResource(uri)) {
            // We opened a split json editor in this case,
            // and this half shows the default settings.
            const target = this.getConfigurationTargetFromDefaultSettingsResource(uri);
            const defaultSettings = this.getDefaultSettings(target);
            if (!this._requestedDefaultSettings.has(uri)) {
                this._register(defaultSettings.onDidChange(() => this._onDidDefaultSettingsContentChanged.fire(uri)));
                this._requestedDefaultSettings.add(uri);
            }
            return defaultSettings.getContentWithoutMostCommonlyUsed(true);
        }
        if (isEqual(uri, this.defaultSettingsRawResource)) {
            if (!this._defaultRawSettingsEditorModel) {
                this._defaultRawSettingsEditorModel = this._register(this.instantiationService.createInstance(DefaultRawSettingsEditorModel, this.getDefaultSettings(3 /* ConfigurationTarget.USER_LOCAL */)));
                this._register(this._defaultRawSettingsEditorModel.onDidContentChanged(() => this._onDidDefaultSettingsContentChanged.fire(uri)));
            }
            return this._defaultRawSettingsEditorModel.content;
        }
        if (isEqual(uri, this.defaultKeybindingsResource)) {
            const defaultKeybindingsEditorModel = this.instantiationService.createInstance(DefaultKeybindingsEditorModel, uri);
            return defaultKeybindingsEditorModel.content;
        }
        return undefined;
    }
    async createPreferencesEditorModel(uri) {
        if (this.isDefaultSettingsResource(uri)) {
            return this.createDefaultSettingsEditorModel(uri);
        }
        if (this.userSettingsResource.toString() === uri.toString() || this.userDataProfilesService.defaultProfile.settingsResource.toString() === uri.toString()) {
            return this.createEditableSettingsEditorModel(3 /* ConfigurationTarget.USER_LOCAL */, uri);
        }
        const workspaceSettingsUri = await this.getEditableSettingsURI(5 /* ConfigurationTarget.WORKSPACE */);
        if (workspaceSettingsUri && workspaceSettingsUri.toString() === uri.toString()) {
            return this.createEditableSettingsEditorModel(5 /* ConfigurationTarget.WORKSPACE */, workspaceSettingsUri);
        }
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            const settingsUri = await this.getEditableSettingsURI(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, uri);
            if (settingsUri && settingsUri.toString() === uri.toString()) {
                return this.createEditableSettingsEditorModel(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, uri);
            }
        }
        const remoteEnvironment = await this.remoteAgentService.getEnvironment();
        const remoteSettingsUri = remoteEnvironment ? remoteEnvironment.settingsPath : null;
        if (remoteSettingsUri && remoteSettingsUri.toString() === uri.toString()) {
            return this.createEditableSettingsEditorModel(4 /* ConfigurationTarget.USER_REMOTE */, uri);
        }
        return null;
    }
    openRawDefaultSettings() {
        return this.editorService.openEditor({ resource: this.defaultSettingsRawResource });
    }
    openRawUserSettings() {
        return this.editorService.openEditor({ resource: this.userSettingsResource });
    }
    shouldOpenJsonByDefault() {
        return this.configurationService.getValue('workbench.settings.editor') === 'json';
    }
    openSettings(options = {}) {
        options = {
            ...options,
            target: 3 /* ConfigurationTarget.USER_LOCAL */,
        };
        if (options.query) {
            options.jsonEditor = false;
        }
        return this.open(this.userSettingsResource, options);
    }
    openLanguageSpecificSettings(languageId, options = {}) {
        if (this.shouldOpenJsonByDefault()) {
            options.query = undefined;
            options.revealSetting = { key: `[${languageId}]`, edit: true };
        }
        else {
            options.query = `@lang:${languageId}${options.query ? ` ${options.query}` : ''}`;
        }
        options.target = options.target ?? 3 /* ConfigurationTarget.USER_LOCAL */;
        return this.open(this.userSettingsResource, options);
    }
    open(settingsResource, options) {
        options = {
            ...options,
            jsonEditor: options.jsonEditor ?? this.shouldOpenJsonByDefault()
        };
        return options.jsonEditor ?
            this.openSettingsJson(settingsResource, options) :
            this.openSettings2(options);
    }
    async openSettings2(options) {
        const input = this.createOrGetCachedSettingsEditor2Input();
        options = {
            ...options,
            focusSearch: true
        };
        const group = await this.getEditorGroupFromOptions(options);
        return group.openEditor(input, validateSettingsEditorOptions(options));
    }
    openApplicationSettings(options = {}) {
        options = {
            ...options,
            target: 3 /* ConfigurationTarget.USER_LOCAL */,
        };
        return this.open(this.userDataProfilesService.defaultProfile.settingsResource, options);
    }
    openUserSettings(options = {}) {
        options = {
            ...options,
            target: 3 /* ConfigurationTarget.USER_LOCAL */,
        };
        return this.open(this.userSettingsResource, options);
    }
    async openRemoteSettings(options = {}) {
        const environment = await this.remoteAgentService.getEnvironment();
        if (environment) {
            options = {
                ...options,
                target: 4 /* ConfigurationTarget.USER_REMOTE */,
            };
            this.open(environment.settingsPath, options);
        }
        return undefined;
    }
    openWorkspaceSettings(options = {}) {
        if (!this.workspaceSettingsResource) {
            this.notificationService.info(nls.localize('openFolderFirst', "Open a folder or workspace first to create workspace or folder settings."));
            return Promise.reject(null);
        }
        options = {
            ...options,
            target: 5 /* ConfigurationTarget.WORKSPACE */
        };
        return this.open(this.workspaceSettingsResource, options);
    }
    async openFolderSettings(options = {}) {
        options = {
            ...options,
            target: 6 /* ConfigurationTarget.WORKSPACE_FOLDER */
        };
        if (!options.folderUri) {
            throw new Error(`Missing folder URI`);
        }
        const folderSettingsUri = await this.getEditableSettingsURI(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, options.folderUri);
        if (!folderSettingsUri) {
            throw new Error(`Invalid folder URI - ${options.folderUri.toString()}`);
        }
        return this.open(folderSettingsUri, options);
    }
    async openGlobalKeybindingSettings(textual, options) {
        options = { pinned: true, revealIfOpened: true, ...options };
        if (textual) {
            const emptyContents = '// ' + nls.localize('emptyKeybindingsHeader', "Place your key bindings in this file to override the defaults") + '\n[\n]';
            const editableKeybindings = this.userDataProfileService.currentProfile.keybindingsResource;
            const openDefaultKeybindings = !!this.configurationService.getValue('workbench.settings.openDefaultKeybindings');
            // Create as needed and open in editor
            await this.createIfNotExists(editableKeybindings, emptyContents);
            if (openDefaultKeybindings) {
                const sourceGroupId = options.groupId ?? this.editorGroupService.activeGroup.id;
                const sideEditorGroup = this.editorGroupService.addGroup(sourceGroupId, 3 /* GroupDirection.RIGHT */);
                await Promise.all([
                    this.editorService.openEditor({ resource: this.defaultKeybindingsResource, options: { pinned: true, preserveFocus: true, revealIfOpened: true, override: DEFAULT_EDITOR_ASSOCIATION.id }, label: nls.localize('defaultKeybindings', "Default Keybindings"), description: '' }, sourceGroupId),
                    this.editorService.openEditor({ resource: editableKeybindings, options }, sideEditorGroup.id)
                ]);
            }
            else {
                await this.editorService.openEditor({ resource: editableKeybindings, options }, options.groupId);
            }
        }
        else {
            const editor = (await this.editorService.openEditor(this.instantiationService.createInstance(KeybindingsEditorInput), { ...options }, options.groupId));
            if (options.query) {
                editor.search(options.query);
            }
        }
    }
    openDefaultKeybindingsFile() {
        return this.editorService.openEditor({ resource: this.defaultKeybindingsResource, label: nls.localize('defaultKeybindings', "Default Keybindings") });
    }
    async getEditorGroupFromOptions(options) {
        let group = options?.groupId !== undefined ? this.editorGroupService.getGroup(options.groupId) ?? this.editorGroupService.activeGroup : this.editorGroupService.activeGroup;
        if (options.openToSide) {
            group = (await this.instantiationService.invokeFunction(findGroup, {}, SIDE_GROUP))[0];
        }
        return group;
    }
    async openSettingsJson(resource, options) {
        const group = await this.getEditorGroupFromOptions(options);
        const editor = await this.doOpenSettingsJson(resource, options, group);
        if (editor && options?.revealSetting) {
            await this.revealSetting(options.revealSetting.key, !!options.revealSetting.edit, editor, resource);
        }
        return editor;
    }
    async doOpenSettingsJson(resource, options, group) {
        const openSplitJSON = !!this.configurationService.getValue(USE_SPLIT_JSON_SETTING);
        const openDefaultSettings = !!this.configurationService.getValue(DEFAULT_SETTINGS_EDITOR_SETTING);
        if (openSplitJSON || openDefaultSettings) {
            return this.doOpenSplitJSON(resource, options, group);
        }
        const configurationTarget = options?.target ?? 2 /* ConfigurationTarget.USER */;
        const editableSettingsEditorInput = await this.getOrCreateEditableSettingsEditorInput(configurationTarget, resource);
        options = { ...options, pinned: true };
        return await group.openEditor(editableSettingsEditorInput, { ...validateSettingsEditorOptions(options) });
    }
    async doOpenSplitJSON(resource, options = {}, group) {
        const configurationTarget = options.target ?? 2 /* ConfigurationTarget.USER */;
        await this.createSettingsIfNotExists(configurationTarget, resource);
        const preferencesEditorInput = this.createSplitJsonEditorInput(configurationTarget, resource);
        options = { ...options, pinned: true };
        return group.openEditor(preferencesEditorInput, validateSettingsEditorOptions(options));
    }
    createSplitJsonEditorInput(configurationTarget, resource) {
        const editableSettingsEditorInput = this.textEditorService.createTextEditor({ resource });
        const defaultPreferencesEditorInput = this.textEditorService.createTextEditor({ resource: this.getDefaultSettingsResource(configurationTarget) });
        return this.instantiationService.createInstance(SideBySideEditorInput, editableSettingsEditorInput.getName(), undefined, defaultPreferencesEditorInput, editableSettingsEditorInput);
    }
    createSettings2EditorModel() {
        return this.instantiationService.createInstance(Settings2EditorModel, this.getDefaultSettings(3 /* ConfigurationTarget.USER_LOCAL */));
    }
    getConfigurationTargetFromDefaultSettingsResource(uri) {
        return this.isDefaultWorkspaceSettingsResource(uri) ?
            5 /* ConfigurationTarget.WORKSPACE */ :
            this.isDefaultFolderSettingsResource(uri) ?
                6 /* ConfigurationTarget.WORKSPACE_FOLDER */ :
                3 /* ConfigurationTarget.USER_LOCAL */;
    }
    isDefaultSettingsResource(uri) {
        return this.isDefaultUserSettingsResource(uri) || this.isDefaultWorkspaceSettingsResource(uri) || this.isDefaultFolderSettingsResource(uri);
    }
    isDefaultUserSettingsResource(uri) {
        return uri.authority === 'defaultsettings' && uri.scheme === network.Schemas.vscode && !!uri.path.match(/\/(\d+\/)?settings\.json$/);
    }
    isDefaultWorkspaceSettingsResource(uri) {
        return uri.authority === 'defaultsettings' && uri.scheme === network.Schemas.vscode && !!uri.path.match(/\/(\d+\/)?workspaceSettings\.json$/);
    }
    isDefaultFolderSettingsResource(uri) {
        return uri.authority === 'defaultsettings' && uri.scheme === network.Schemas.vscode && !!uri.path.match(/\/(\d+\/)?resourceSettings\.json$/);
    }
    getDefaultSettingsResource(configurationTarget) {
        switch (configurationTarget) {
            case 5 /* ConfigurationTarget.WORKSPACE */:
                return URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: `/workspaceSettings.json` });
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                return URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: `/resourceSettings.json` });
        }
        return URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: `/settings.json` });
    }
    async getOrCreateEditableSettingsEditorInput(target, resource) {
        await this.createSettingsIfNotExists(target, resource);
        return this.textEditorService.createTextEditor({ resource });
    }
    async createEditableSettingsEditorModel(configurationTarget, settingsUri) {
        const workspace = this.contextService.getWorkspace();
        if (workspace.configuration && workspace.configuration.toString() === settingsUri.toString()) {
            const reference = await this.textModelResolverService.createModelReference(settingsUri);
            return this.instantiationService.createInstance(WorkspaceConfigurationEditorModel, reference, configurationTarget);
        }
        const reference = await this.textModelResolverService.createModelReference(settingsUri);
        return this.instantiationService.createInstance(SettingsEditorModel, reference, configurationTarget);
    }
    async createDefaultSettingsEditorModel(defaultSettingsUri) {
        const reference = await this.textModelResolverService.createModelReference(defaultSettingsUri);
        const target = this.getConfigurationTargetFromDefaultSettingsResource(defaultSettingsUri);
        return this.instantiationService.createInstance(DefaultSettingsEditorModel, defaultSettingsUri, reference, this.getDefaultSettings(target));
    }
    getDefaultSettings(target) {
        if (target === 5 /* ConfigurationTarget.WORKSPACE */) {
            this._defaultWorkspaceSettingsContentModel ??= this._register(new DefaultSettings(this.getMostCommonlyUsedSettings(), target, this.configurationService));
            return this._defaultWorkspaceSettingsContentModel;
        }
        if (target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            this._defaultFolderSettingsContentModel ??= this._register(new DefaultSettings(this.getMostCommonlyUsedSettings(), target, this.configurationService));
            return this._defaultFolderSettingsContentModel;
        }
        this._defaultUserSettingsContentModel ??= this._register(new DefaultSettings(this.getMostCommonlyUsedSettings(), target, this.configurationService));
        return this._defaultUserSettingsContentModel;
    }
    async getEditableSettingsURI(configurationTarget, resource) {
        switch (configurationTarget) {
            case 1 /* ConfigurationTarget.APPLICATION */:
                return this.userDataProfilesService.defaultProfile.settingsResource;
            case 2 /* ConfigurationTarget.USER */:
            case 3 /* ConfigurationTarget.USER_LOCAL */:
                return this.userSettingsResource;
            case 4 /* ConfigurationTarget.USER_REMOTE */: {
                const remoteEnvironment = await this.remoteAgentService.getEnvironment();
                return remoteEnvironment ? remoteEnvironment.settingsPath : null;
            }
            case 5 /* ConfigurationTarget.WORKSPACE */:
                return this.workspaceSettingsResource;
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                if (resource) {
                    return this.getFolderSettingsResource(resource);
                }
        }
        return null;
    }
    async createSettingsIfNotExists(target, resource) {
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ && target === 5 /* ConfigurationTarget.WORKSPACE */) {
            const workspaceConfig = this.contextService.getWorkspace().configuration;
            if (!workspaceConfig) {
                return;
            }
            const content = await this.textFileService.read(workspaceConfig);
            if (Object.keys(parse(content.value)).indexOf('settings') === -1) {
                await this.jsonEditingService.write(resource, [{ path: ['settings'], value: {} }], true);
            }
            return undefined;
        }
        await this.createIfNotExists(resource, emptyEditableSettingsContent);
    }
    async createIfNotExists(resource, contents) {
        try {
            await this.textFileService.read(resource, { acceptTextOnly: true });
        }
        catch (error) {
            if (error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                try {
                    await this.textFileService.write(resource, contents);
                    return;
                }
                catch (error2) {
                    throw new Error(nls.localize('fail.createSettings', "Unable to create '{0}' ({1}).", this.labelService.getUriLabel(resource, { relative: true }), getErrorMessage(error2)));
                }
            }
            else {
                throw error;
            }
        }
    }
    getMostCommonlyUsedSettings() {
        return [
            'files.autoSave',
            'editor.fontSize',
            'editor.fontFamily',
            'editor.tabSize',
            'editor.renderWhitespace',
            'editor.cursorStyle',
            'editor.multiCursorModifier',
            'editor.insertSpaces',
            'editor.wordWrap',
            'files.exclude',
            'files.associations',
            'workbench.editor.enablePreview'
        ];
    }
    async revealSetting(settingKey, edit, editor, settingsResource) {
        const codeEditor = editor ? getCodeEditor(editor.getControl()) : null;
        if (!codeEditor) {
            return;
        }
        const settingsModel = await this.createPreferencesEditorModel(settingsResource);
        if (!settingsModel) {
            return;
        }
        const position = await this.getPositionToReveal(settingKey, edit, settingsModel, codeEditor);
        if (position) {
            codeEditor.setPosition(position);
            codeEditor.revealPositionNearTop(position);
            codeEditor.focus();
            if (edit) {
                SuggestController.get(codeEditor)?.triggerSuggest();
            }
        }
    }
    async getPositionToReveal(settingKey, edit, settingsModel, codeEditor) {
        const model = codeEditor.getModel();
        if (!model) {
            return null;
        }
        const schema = Registry.as(Extensions.Configuration).getConfigurationProperties()[settingKey];
        const isOverrideProperty = OVERRIDE_PROPERTY_REGEX.test(settingKey);
        if (!schema && !isOverrideProperty) {
            return null;
        }
        let position = null;
        const type = schema?.type ?? 'object' /* Type not defined or is an Override Identifier */;
        let setting = settingsModel.getPreference(settingKey);
        if (!setting && edit) {
            let defaultValue = (type === 'object' || type === 'array') ? this.configurationService.inspect(settingKey).defaultValue : getDefaultValue(type);
            defaultValue = defaultValue === undefined && isOverrideProperty ? {} : defaultValue;
            if (defaultValue !== undefined) {
                const key = settingsModel instanceof WorkspaceConfigurationEditorModel ? ['settings', settingKey] : [settingKey];
                await this.jsonEditingService.write(settingsModel.uri, [{ path: key, value: defaultValue }], false);
                setting = settingsModel.getPreference(settingKey);
            }
        }
        if (setting) {
            if (edit) {
                if (isObject(setting.value) || Array.isArray(setting.value)) {
                    position = { lineNumber: setting.valueRange.startLineNumber, column: setting.valueRange.startColumn + 1 };
                    codeEditor.setPosition(position);
                    await CoreEditingCommands.LineBreakInsert.runEditorCommand(null, codeEditor, null);
                    position = { lineNumber: position.lineNumber + 1, column: model.getLineMaxColumn(position.lineNumber + 1) };
                    const firstNonWhiteSpaceColumn = model.getLineFirstNonWhitespaceColumn(position.lineNumber);
                    if (firstNonWhiteSpaceColumn) {
                        // Line has some text. Insert another new line.
                        codeEditor.setPosition({ lineNumber: position.lineNumber, column: firstNonWhiteSpaceColumn });
                        await CoreEditingCommands.LineBreakInsert.runEditorCommand(null, codeEditor, null);
                        position = { lineNumber: position.lineNumber, column: model.getLineMaxColumn(position.lineNumber) };
                    }
                }
                else {
                    position = { lineNumber: setting.valueRange.startLineNumber, column: setting.valueRange.endColumn };
                }
            }
            else {
                position = { lineNumber: setting.keyRange.startLineNumber, column: setting.keyRange.startColumn };
            }
        }
        return position;
    }
    getSetting(settingId) {
        if (!this._settingsGroups) {
            const defaultSettings = this.getDefaultSettings(2 /* ConfigurationTarget.USER */);
            const defaultsChangedDisposable = this._register(new MutableDisposable());
            defaultsChangedDisposable.value = defaultSettings.onDidChange(() => {
                this._settingsGroups = undefined;
                defaultsChangedDisposable.clear();
            });
            this._settingsGroups = defaultSettings.getSettingsGroups();
        }
        for (const group of this._settingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    if (compareIgnoreCase(setting.key, settingId) === 0) {
                        return setting;
                    }
                }
            }
        }
        return undefined;
    }
    /**
     * Should be of the format:
     * 	code://settings/settingName
     * Examples:
     * 	code://settings/files.autoSave
     *
     */
    async handleURL(uri) {
        if (compareIgnoreCase(uri.authority, SETTINGS_AUTHORITY) !== 0) {
            return false;
        }
        const settingInfo = uri.path.split('/').filter(part => !!part);
        const settingId = ((settingInfo.length > 0) ? settingInfo[0] : undefined);
        if (!settingId) {
            this.openSettings();
            return true;
        }
        let setting = this.getSetting(settingId);
        if (!setting && this.extensionService.extensions.length === 0) {
            // wait for extension points to be processed
            await this.progressService.withProgress({ location: 10 /* ProgressLocation.Window */ }, () => Event.toPromise(this.extensionService.onDidRegisterExtensions));
            setting = this.getSetting(settingId);
        }
        const openSettingsOptions = {};
        if (setting) {
            openSettingsOptions.query = settingId;
        }
        this.openSettings(openSettingsOptions);
        return true;
    }
    dispose() {
        if (this._cachedSettingsEditor2Input && !this._cachedSettingsEditor2Input.isDisposed()) {
            this._cachedSettingsEditor2Input.dispose();
        }
        this._onDispose.fire();
        super.dispose();
    }
};
PreferencesService = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, ITextFileService),
    __param(3, IConfigurationService),
    __param(4, INotificationService),
    __param(5, IWorkspaceContextService),
    __param(6, IInstantiationService),
    __param(7, IUserDataProfileService),
    __param(8, IUserDataProfilesService),
    __param(9, ITextModelService),
    __param(10, IKeybindingService),
    __param(11, IModelService),
    __param(12, IJSONEditingService),
    __param(13, ILabelService),
    __param(14, IRemoteAgentService),
    __param(15, ITextEditorService),
    __param(16, IURLService),
    __param(17, IExtensionService),
    __param(18, IProgressService)
], PreferencesService);
export { PreferencesService };
registerSingleton(IPreferencesService, PreferencesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBMEIsdUJBQXVCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUVsSyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0cs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