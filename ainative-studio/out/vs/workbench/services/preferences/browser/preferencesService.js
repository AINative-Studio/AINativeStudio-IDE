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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9icm93c2VyL3ByZWZlcmVuY2VzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDeEgsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQTBCLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFFbEssT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9H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