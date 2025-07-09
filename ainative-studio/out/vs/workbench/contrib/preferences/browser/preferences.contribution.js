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
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isBoolean, isObject, isString } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import './media/preferences.css';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { Context as SuggestContext } from '../../../../editor/contrib/suggest/browser/suggest.js';
import * as nls from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext, IsMacNativeContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from '../../../browser/actions/workspaceCommands.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { ResourceContextKey, RemoteNameContext, WorkbenchStateContext } from '../../../common/contextkeys.js';
import { ExplorerFolderContext, ExplorerRootContext } from '../../files/common/files.js';
import { KeybindingsEditor } from './keybindingsEditor.js';
import { ConfigureLanguageBasedSettingsAction } from './preferencesActions.js';
import { SettingsEditorContribution } from './preferencesEditor.js';
import { preferencesOpenSettingsIcon } from './preferencesIcons.js';
import { SettingsEditor2 } from './settingsEditor2.js';
import { CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS, CONTEXT_KEYBINDING_FOCUS, CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_JSON_EDITOR, CONTEXT_SETTINGS_ROW_FOCUS, CONTEXT_SETTINGS_SEARCH_FOCUS, CONTEXT_TOC_ROW_FOCUS, CONTEXT_WHEN_FOCUS, KEYBINDINGS_EDITOR_COMMAND_ACCEPT_WHEN, KEYBINDINGS_EDITOR_COMMAND_ADD, KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_HISTORY, KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, KEYBINDINGS_EDITOR_COMMAND_COPY, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE, KEYBINDINGS_EDITOR_COMMAND_DEFINE, KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN, KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS, KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, KEYBINDINGS_EDITOR_COMMAND_REJECT_WHEN, KEYBINDINGS_EDITOR_COMMAND_REMOVE, KEYBINDINGS_EDITOR_COMMAND_RESET, KEYBINDINGS_EDITOR_COMMAND_SEARCH, KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR, KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS, KEYBINDINGS_EDITOR_SHOW_EXTENSION_KEYBINDINGS, KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS, REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG, SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU } from '../common/preferences.js';
import { PreferencesContribution } from '../common/preferencesContribution.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { KeybindingsEditorInput } from '../../../services/preferences/browser/keybindingsEditorInput.js';
import { DEFINE_KEYBINDING_EDITOR_CONTRIB_ID, IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { SettingsEditor2Input } from '../../../services/preferences/common/preferencesEditorInput.js';
import { IUserDataProfileService, CURRENT_PROFILE_CONTEXT } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { resolveCommandsContext } from '../../../browser/parts/editor/editorCommandsContext.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
const SETTINGS_EDITOR_COMMAND_SEARCH = 'settings.action.search';
const SETTINGS_EDITOR_COMMAND_FOCUS_FILE = 'settings.action.focusSettingsFile';
const SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_FROM_SEARCH = 'settings.action.focusSettingsFromSearch';
const SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_LIST = 'settings.action.focusSettingsList';
const SETTINGS_EDITOR_COMMAND_FOCUS_TOC = 'settings.action.focusTOC';
const SETTINGS_EDITOR_COMMAND_FOCUS_CONTROL = 'settings.action.focusSettingControl';
const SETTINGS_EDITOR_COMMAND_FOCUS_UP = 'settings.action.focusLevelUp';
const SETTINGS_EDITOR_COMMAND_SWITCH_TO_JSON = 'settings.switchToJSON';
const SETTINGS_EDITOR_COMMAND_FILTER_ONLINE = 'settings.filterByOnline';
const SETTINGS_EDITOR_COMMAND_FILTER_UNTRUSTED = 'settings.filterUntrusted';
const SETTINGS_COMMAND_OPEN_SETTINGS = 'workbench.action.openSettings';
const SETTINGS_COMMAND_FILTER_TELEMETRY = 'settings.filterByTelemetry';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(SettingsEditor2, SettingsEditor2.ID, nls.localize('settingsEditor2', "Settings Editor 2")), [
    new SyncDescriptor(SettingsEditor2Input)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(KeybindingsEditor, KeybindingsEditor.ID, nls.localize('keybindingsEditor', "Keybindings Editor")), [
    new SyncDescriptor(KeybindingsEditorInput)
]);
class KeybindingsEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(KeybindingsEditorInput);
    }
}
class SettingsEditor2InputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(input) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(SettingsEditor2Input);
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(KeybindingsEditorInput.ID, KeybindingsEditorInputSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(SettingsEditor2Input.ID, SettingsEditor2InputSerializer);
const OPEN_USER_SETTINGS_UI_TITLE = nls.localize2('openSettings2', "Open Settings (UI)");
const OPEN_USER_SETTINGS_JSON_TITLE = nls.localize2('openUserSettingsJson', "Open User Settings (JSON)");
const OPEN_APPLICATION_SETTINGS_JSON_TITLE = nls.localize2('openApplicationSettingsJson', "Open Application Settings (JSON)");
const category = Categories.Preferences;
function sanitizeBoolean(arg) {
    return isBoolean(arg) ? arg : undefined;
}
function sanitizeString(arg) {
    return isString(arg) ? arg : undefined;
}
function sanitizeOpenSettingsArgs(args) {
    if (!isObject(args)) {
        args = {};
    }
    let sanitizedObject = {
        focusSearch: sanitizeBoolean(args?.focusSearch),
        openToSide: sanitizeBoolean(args?.openToSide),
        query: sanitizeString(args?.query)
    };
    if (isString(args?.revealSetting?.key)) {
        sanitizedObject = {
            ...sanitizedObject,
            revealSetting: {
                key: args.revealSetting.key,
                edit: sanitizeBoolean(args.revealSetting?.edit)
            }
        };
    }
    return sanitizedObject;
}
let PreferencesActionsContribution = class PreferencesActionsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.preferencesActions'; }
    constructor(environmentService, userDataProfileService, preferencesService, workspaceContextService, labelService, extensionService, userDataProfilesService) {
        super();
        this.environmentService = environmentService;
        this.userDataProfileService = userDataProfileService;
        this.preferencesService = preferencesService;
        this.workspaceContextService = workspaceContextService;
        this.labelService = labelService;
        this.extensionService = extensionService;
        this.userDataProfilesService = userDataProfilesService;
        this.registerSettingsActions();
        this.registerKeybindingsActions();
        this.updatePreferencesEditorMenuItem();
        this._register(workspaceContextService.onDidChangeWorkbenchState(() => this.updatePreferencesEditorMenuItem()));
        this._register(workspaceContextService.onDidChangeWorkspaceFolders(() => this.updatePreferencesEditorMenuItemForWorkspaceFolders()));
    }
    registerSettingsActions() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_COMMAND_OPEN_SETTINGS,
                    title: {
                        ...nls.localize2('settings', "Settings"),
                        mnemonicTitle: nls.localize({ key: 'miOpenSettings', comment: ['&& denotes a mnemonic'] }, "&&Settings"),
                    },
                    keybinding: {
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: null,
                        primary: 2048 /* KeyMod.CtrlCmd */ | 87 /* KeyCode.Comma */,
                    },
                    menu: [{
                            id: MenuId.GlobalActivity,
                            group: '2_configuration',
                            order: 2
                        }, {
                            id: MenuId.MenubarPreferencesMenu,
                            group: '2_configuration',
                            order: 2
                        }],
                });
            }
            run(accessor, args) {
                // args takes a string for backcompat
                const opts = typeof args === 'string' ? { query: args } : sanitizeOpenSettingsArgs(args);
                return accessor.get(IPreferencesService).openSettings(opts);
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openSettings2',
                    title: nls.localize2('openSettings2', "Open Settings (UI)"),
                    category,
                    f1: true,
                });
            }
            run(accessor, args) {
                args = sanitizeOpenSettingsArgs(args);
                return accessor.get(IPreferencesService).openSettings({ jsonEditor: false, ...args });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openSettingsJson',
                    title: OPEN_USER_SETTINGS_JSON_TITLE,
                    metadata: {
                        description: nls.localize2('workbench.action.openSettingsJson.description', "Opens the JSON file containing the current user profile settings")
                    },
                    category,
                    f1: true,
                });
            }
            run(accessor, args) {
                args = sanitizeOpenSettingsArgs(args);
                return accessor.get(IPreferencesService).openSettings({ jsonEditor: true, ...args });
            }
        }));
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openApplicationSettingsJson',
                    title: OPEN_APPLICATION_SETTINGS_JSON_TITLE,
                    category,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: ContextKeyExpr.notEquals(CURRENT_PROFILE_CONTEXT.key, that.userDataProfilesService.defaultProfile.id)
                    }
                });
            }
            run(accessor, args) {
                args = sanitizeOpenSettingsArgs(args);
                return accessor.get(IPreferencesService).openApplicationSettings({ jsonEditor: true, ...args });
            }
        }));
        // Opens the User tab of the Settings editor
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openGlobalSettings',
                    title: nls.localize2('openGlobalSettings', "Open User Settings"),
                    category,
                    f1: true,
                });
            }
            run(accessor, args) {
                args = sanitizeOpenSettingsArgs(args);
                return accessor.get(IPreferencesService).openUserSettings(args);
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openRawDefaultSettings',
                    title: nls.localize2('openRawDefaultSettings', "Open Default Settings (JSON)"),
                    category,
                    f1: true,
                });
            }
            run(accessor) {
                return accessor.get(IPreferencesService).openRawDefaultSettings();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: ConfigureLanguageBasedSettingsAction.ID,
                    title: ConfigureLanguageBasedSettingsAction.LABEL,
                    category,
                    f1: true,
                });
            }
            run(accessor) {
                return accessor.get(IInstantiationService).createInstance(ConfigureLanguageBasedSettingsAction, ConfigureLanguageBasedSettingsAction.ID, ConfigureLanguageBasedSettingsAction.LABEL.value).run();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openWorkspaceSettings',
                    title: nls.localize2('openWorkspaceSettings', "Open Workspace Settings"),
                    category,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: WorkbenchStateContext.notEqualsTo('empty')
                    }
                });
            }
            run(accessor, args) {
                // Match the behaviour of workbench.action.openSettings
                args = typeof args === 'string' ? { query: args } : sanitizeOpenSettingsArgs(args);
                return accessor.get(IPreferencesService).openWorkspaceSettings(args);
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openAccessibilitySettings',
                    title: nls.localize2('openAccessibilitySettings', "Open Accessibility Settings"),
                    category,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: WorkbenchStateContext.notEqualsTo('empty')
                    }
                });
            }
            async run(accessor) {
                await accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: '@tag:accessibility' });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openWorkspaceSettingsFile',
                    title: nls.localize2('openWorkspaceSettingsFile', "Open Workspace Settings (JSON)"),
                    category,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: WorkbenchStateContext.notEqualsTo('empty')
                    }
                });
            }
            run(accessor, args) {
                args = sanitizeOpenSettingsArgs(args);
                return accessor.get(IPreferencesService).openWorkspaceSettings({ jsonEditor: true, ...args });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openFolderSettings',
                    title: nls.localize2('openFolderSettings', "Open Folder Settings"),
                    category,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: WorkbenchStateContext.isEqualTo('workspace')
                    }
                });
            }
            async run(accessor, args) {
                const commandService = accessor.get(ICommandService);
                const preferencesService = accessor.get(IPreferencesService);
                const workspaceFolder = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
                if (workspaceFolder) {
                    args = sanitizeOpenSettingsArgs(args);
                    await preferencesService.openFolderSettings({ folderUri: workspaceFolder.uri, ...args });
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openFolderSettingsFile',
                    title: nls.localize2('openFolderSettingsFile', "Open Folder Settings (JSON)"),
                    category,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: WorkbenchStateContext.isEqualTo('workspace')
                    }
                });
            }
            async run(accessor, args) {
                const commandService = accessor.get(ICommandService);
                const preferencesService = accessor.get(IPreferencesService);
                const workspaceFolder = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
                if (workspaceFolder) {
                    args = sanitizeOpenSettingsArgs(args);
                    await preferencesService.openFolderSettings({ folderUri: workspaceFolder.uri, jsonEditor: true, ...args });
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: '_workbench.action.openFolderSettings',
                    title: nls.localize('openFolderSettings', "Open Folder Settings"),
                    category,
                    menu: {
                        id: MenuId.ExplorerContext,
                        group: '2_workspace',
                        order: 20,
                        when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext)
                    }
                });
            }
            async run(accessor, resource) {
                if (URI.isUri(resource)) {
                    await accessor.get(IPreferencesService).openFolderSettings({ folderUri: resource });
                }
                else {
                    const commandService = accessor.get(ICommandService);
                    const preferencesService = accessor.get(IPreferencesService);
                    const workspaceFolder = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
                    if (workspaceFolder) {
                        await preferencesService.openFolderSettings({ folderUri: workspaceFolder.uri });
                    }
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_FILTER_ONLINE,
                    title: nls.localize({ key: 'miOpenOnlineSettings', comment: ['&& denotes a mnemonic'] }, "&&Online Services Settings"),
                    menu: {
                        id: MenuId.MenubarPreferencesMenu,
                        group: '3_settings',
                        order: 1,
                    }
                });
            }
            run(accessor) {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof SettingsEditor2) {
                    editorPane.focusSearch(`@tag:usesOnlineServices`);
                }
                else {
                    accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: '@tag:usesOnlineServices' });
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_FILTER_UNTRUSTED,
                    title: nls.localize2('filterUntrusted', "Show untrusted workspace settings"),
                });
            }
            run(accessor) {
                accessor.get(IPreferencesService).openWorkspaceSettings({ jsonEditor: false, query: `@tag:${REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG}` });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_COMMAND_FILTER_TELEMETRY,
                    title: nls.localize({ key: 'miOpenTelemetrySettings', comment: ['&& denotes a mnemonic'] }, "&&Telemetry Settings")
                });
            }
            run(accessor) {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof SettingsEditor2) {
                    editorPane.focusSearch(`@tag:telemetry`);
                }
                else {
                    accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: '@tag:telemetry' });
                }
            }
        }));
        this.registerSettingsEditorActions();
        this.extensionService.whenInstalledExtensionsRegistered()
            .then(() => {
            const remoteAuthority = this.environmentService.remoteAuthority;
            const hostLabel = this.labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority) || remoteAuthority;
            this._register(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: 'workbench.action.openRemoteSettings',
                        title: nls.localize2('openRemoteSettings', "Open Remote Settings ({0})", hostLabel),
                        category,
                        menu: {
                            id: MenuId.CommandPalette,
                            when: RemoteNameContext.notEqualsTo('')
                        }
                    });
                }
                run(accessor, args) {
                    args = sanitizeOpenSettingsArgs(args);
                    return accessor.get(IPreferencesService).openRemoteSettings(args);
                }
            }));
            this._register(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: 'workbench.action.openRemoteSettingsFile',
                        title: nls.localize2('openRemoteSettingsJSON', "Open Remote Settings (JSON) ({0})", hostLabel),
                        category,
                        menu: {
                            id: MenuId.CommandPalette,
                            when: RemoteNameContext.notEqualsTo('')
                        }
                    });
                }
                run(accessor, args) {
                    args = sanitizeOpenSettingsArgs(args);
                    return accessor.get(IPreferencesService).openRemoteSettings({ jsonEditor: true, ...args });
                }
            }));
        });
    }
    registerSettingsEditorActions() {
        function getPreferencesEditor(accessor) {
            const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
            if (activeEditorPane instanceof SettingsEditor2) {
                return activeEditorPane;
            }
            return null;
        }
        function settingsEditorFocusSearch(accessor) {
            const preferencesEditor = getPreferencesEditor(accessor);
            preferencesEditor?.focusSearch();
        }
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_SEARCH,
                    precondition: CONTEXT_SETTINGS_EDITOR,
                    keybinding: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                        when: null
                    },
                    category,
                    f1: true,
                    title: nls.localize2('settings.focusSearch', "Focus Settings Search")
                });
            }
            run(accessor) { settingsEditorFocusSearch(accessor); }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS,
                    precondition: CONTEXT_SETTINGS_EDITOR,
                    keybinding: {
                        primary: 9 /* KeyCode.Escape */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                        when: CONTEXT_SETTINGS_SEARCH_FOCUS
                    },
                    category,
                    f1: true,
                    title: nls.localize2('settings.clearResults', "Clear Settings Search Results")
                });
            }
            run(accessor) {
                const preferencesEditor = getPreferencesEditor(accessor);
                preferencesEditor?.clearSearchResults();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_FOCUS_FILE,
                    precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_SEARCH_FOCUS, SuggestContext.Visible.toNegated()),
                    keybinding: {
                        primary: 18 /* KeyCode.DownArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                        when: null
                    },
                    title: nls.localize('settings.focusFile', "Focus settings file")
                });
            }
            run(accessor, args) {
                const preferencesEditor = getPreferencesEditor(accessor);
                preferencesEditor?.focusSettings();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_FROM_SEARCH,
                    precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_SEARCH_FOCUS, SuggestContext.Visible.toNegated()),
                    keybinding: {
                        primary: 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: null
                    },
                    title: nls.localize('settings.focusFile', "Focus settings file")
                });
            }
            run(accessor, args) {
                const preferencesEditor = getPreferencesEditor(accessor);
                preferencesEditor?.focusSettings();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_LIST,
                    precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_TOC_ROW_FOCUS),
                    keybinding: {
                        primary: 3 /* KeyCode.Enter */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: null
                    },
                    title: nls.localize('settings.focusSettingsList', "Focus settings list")
                });
            }
            run(accessor) {
                const preferencesEditor = getPreferencesEditor(accessor);
                if (preferencesEditor instanceof SettingsEditor2) {
                    preferencesEditor.focusSettings();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_FOCUS_TOC,
                    precondition: CONTEXT_SETTINGS_EDITOR,
                    f1: true,
                    keybinding: [
                        {
                            primary: 15 /* KeyCode.LeftArrow */,
                            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                            when: CONTEXT_SETTINGS_ROW_FOCUS
                        }
                    ],
                    category,
                    title: nls.localize2('settings.focusSettingsTOC', "Focus Settings Table of Contents")
                });
            }
            run(accessor) {
                const preferencesEditor = getPreferencesEditor(accessor);
                if (!(preferencesEditor instanceof SettingsEditor2)) {
                    return;
                }
                preferencesEditor.focusTOC();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_FOCUS_CONTROL,
                    precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_ROW_FOCUS),
                    keybinding: {
                        primary: 3 /* KeyCode.Enter */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    },
                    title: nls.localize('settings.focusSettingControl', "Focus Setting Control")
                });
            }
            run(accessor) {
                const preferencesEditor = getPreferencesEditor(accessor);
                if (!(preferencesEditor instanceof SettingsEditor2)) {
                    return;
                }
                const activeElement = preferencesEditor.getContainer()?.ownerDocument.activeElement;
                if (activeElement?.classList.contains('monaco-list')) {
                    preferencesEditor.focusSettings(true);
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU,
                    precondition: CONTEXT_SETTINGS_EDITOR,
                    keybinding: {
                        primary: 1024 /* KeyMod.Shift */ | 67 /* KeyCode.F9 */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: null
                    },
                    f1: true,
                    category,
                    title: nls.localize2('settings.showContextMenu', "Show Setting Context Menu")
                });
            }
            run(accessor) {
                const preferencesEditor = getPreferencesEditor(accessor);
                if (preferencesEditor instanceof SettingsEditor2) {
                    preferencesEditor.showContextMenu();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_FOCUS_UP,
                    precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_SEARCH_FOCUS.toNegated(), CONTEXT_SETTINGS_JSON_EDITOR.toNegated()),
                    keybinding: {
                        primary: 9 /* KeyCode.Escape */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: null
                    },
                    f1: true,
                    category,
                    title: nls.localize2('settings.focusLevelUp', "Move Focus Up One Level")
                });
            }
            run(accessor) {
                const preferencesEditor = getPreferencesEditor(accessor);
                if (!(preferencesEditor instanceof SettingsEditor2)) {
                    return;
                }
                if (preferencesEditor.currentFocusContext === 3 /* SettingsFocusContext.SettingControl */) {
                    preferencesEditor.focusSettings();
                }
                else if (preferencesEditor.currentFocusContext === 2 /* SettingsFocusContext.SettingTree */) {
                    preferencesEditor.focusTOC();
                }
                else if (preferencesEditor.currentFocusContext === 1 /* SettingsFocusContext.TableOfContents */) {
                    preferencesEditor.focusSearch();
                }
            }
        }));
    }
    registerKeybindingsActions() {
        const that = this;
        const category = nls.localize2('preferences', "Preferences");
        const id = 'workbench.action.openGlobalKeybindings';
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id,
                    title: nls.localize2('openGlobalKeybindings', "Open Keyboard Shortcuts"),
                    shortTitle: nls.localize('keyboardShortcuts', "Keyboard Shortcuts"),
                    category,
                    icon: preferencesOpenSettingsIcon,
                    keybinding: {
                        when: null,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 49 /* KeyCode.KeyS */)
                    },
                    menu: [
                        { id: MenuId.CommandPalette },
                        {
                            id: MenuId.EditorTitle,
                            when: ResourceContextKey.Resource.isEqualTo(that.userDataProfileService.currentProfile.keybindingsResource.toString()),
                            group: 'navigation',
                            order: 1,
                        },
                        {
                            id: MenuId.GlobalActivity,
                            group: '2_configuration',
                            order: 4
                        }
                    ]
                });
            }
            run(accessor, ...args) {
                const query = typeof args[0] === 'string' ? args[0] : undefined;
                const groupId = getEditorGroupFromArguments(accessor, args)?.id;
                return accessor.get(IPreferencesService).openGlobalKeybindingSettings(false, { query, groupId });
            }
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
            command: {
                id,
                title: nls.localize('keyboardShortcuts', "Keyboard Shortcuts"),
            },
            group: '2_configuration',
            order: 4
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openDefaultKeybindingsFile',
                    title: nls.localize2('openDefaultKeybindingsFile', "Open Default Keyboard Shortcuts (JSON)"),
                    category,
                    menu: { id: MenuId.CommandPalette }
                });
            }
            run(accessor) {
                return accessor.get(IPreferencesService).openDefaultKeybindingsFile();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openGlobalKeybindingsFile',
                    title: nls.localize2('openGlobalKeybindingsFile', "Open Keyboard Shortcuts (JSON)"),
                    category,
                    icon: preferencesOpenSettingsIcon,
                    menu: [
                        { id: MenuId.CommandPalette },
                        {
                            id: MenuId.EditorTitle,
                            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
                            group: 'navigation',
                        }
                    ]
                });
            }
            run(accessor, ...args) {
                const groupId = getEditorGroupFromArguments(accessor, args)?.id;
                return accessor.get(IPreferencesService).openGlobalKeybindingSettings(true, { groupId });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS,
                    title: nls.localize2('showDefaultKeybindings', "Show System Keybindings"),
                    menu: [
                        {
                            id: MenuId.EditorTitle,
                            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
                            group: '1_keyboard_preferences_actions'
                        }
                    ]
                });
            }
            run(accessor, ...args) {
                const group = getEditorGroupFromArguments(accessor, args);
                const editorPane = group?.activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.search('@source:system');
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: KEYBINDINGS_EDITOR_SHOW_EXTENSION_KEYBINDINGS,
                    title: nls.localize2('showExtensionKeybindings', "Show Extension Keybindings"),
                    menu: [
                        {
                            id: MenuId.EditorTitle,
                            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
                            group: '1_keyboard_preferences_actions'
                        }
                    ]
                });
            }
            run(accessor, ...args) {
                const group = getEditorGroupFromArguments(accessor, args);
                const editorPane = group?.activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.search('@source:extension');
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS,
                    title: nls.localize2('showUserKeybindings', "Show User Keybindings"),
                    menu: [
                        {
                            id: MenuId.EditorTitle,
                            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
                            group: '1_keyboard_preferences_actions'
                        }
                    ]
                });
            }
            run(accessor, ...args) {
                const group = getEditorGroupFromArguments(accessor, args);
                const editorPane = group?.activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.search('@source:user');
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS,
                    title: nls.localize('clear', "Clear Search Results"),
                    keybinding: {
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
                        primary: 9 /* KeyCode.Escape */,
                    }
                });
            }
            run(accessor) {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.clearSearchResults();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_HISTORY,
                    title: nls.localize('clearHistory', "Clear Keyboard Shortcuts Search History"),
                    category,
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
                        }
                    ]
                });
            }
            run(accessor) {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.clearKeyboardShortcutSearchHistory();
                }
            }
        }));
        this.registerKeybindingEditorActions();
    }
    registerKeybindingEditorActions() {
        const that = this;
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_DEFINE,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS, CONTEXT_WHEN_FOCUS.toNegated()),
            primary: 3 /* KeyCode.Enter */,
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.defineKeybinding(editorPane.activeKeybindingEntry, false);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_ADD,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */),
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.defineKeybinding(editorPane.activeKeybindingEntry, true);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */),
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor && editorPane.activeKeybindingEntry.keybindingItem.keybinding) {
                    editorPane.defineWhenExpression(editorPane.activeKeybindingEntry);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_REMOVE,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS, InputFocusedContext.toNegated()),
            primary: 20 /* KeyCode.Delete */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */
            },
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.removeKeybinding(editorPane.activeKeybindingEntry);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_RESET,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
            primary: 0,
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.resetKeybinding(editorPane.activeKeybindingEntry);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_SEARCH,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
            primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.focusSearch();
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
            primary: 512 /* KeyMod.Alt */ | 41 /* KeyCode.KeyK */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 41 /* KeyCode.KeyK */ },
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.recordSearchKeys();
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
            primary: 512 /* KeyMod.Alt */ | 46 /* KeyCode.KeyP */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 46 /* KeyCode.KeyP */ },
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.toggleSortByPrecedence();
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
            primary: 0,
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.showSimilarKeybindings(editorPane.activeKeybindingEntry);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_COPY,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS, CONTEXT_WHEN_FOCUS.negate()),
            primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
            handler: async (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    await editorPane.copyKeybinding(editorPane.activeKeybindingEntry);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
            primary: 0,
            handler: async (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    await editorPane.copyKeybindingCommand(editorPane.activeKeybindingEntry);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
            primary: 0,
            handler: async (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    await editorPane.copyKeybindingCommandTitle(editorPane.activeKeybindingEntry);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
            primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            handler: (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.focusKeybindings();
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_REJECT_WHEN,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_WHEN_FOCUS, SuggestContext.Visible.toNegated()),
            primary: 9 /* KeyCode.Escape */,
            handler: async (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.rejectWhenExpression(editorPane.activeKeybindingEntry);
                }
            }
        });
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: KEYBINDINGS_EDITOR_COMMAND_ACCEPT_WHEN,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_WHEN_FOCUS, SuggestContext.Visible.toNegated()),
            primary: 3 /* KeyCode.Enter */,
            handler: async (accessor, args) => {
                const editorPane = accessor.get(IEditorService).activeEditorPane;
                if (editorPane instanceof KeybindingsEditor) {
                    editorPane.acceptWhenExpression(editorPane.activeKeybindingEntry);
                }
            }
        });
        const profileScopedActionDisposables = this._register(new DisposableStore());
        const registerProfileScopedActions = () => {
            profileScopedActionDisposables.clear();
            profileScopedActionDisposables.add(registerAction2(class DefineKeybindingAction extends Action2 {
                constructor() {
                    const when = ResourceContextKey.Resource.isEqualTo(that.userDataProfileService.currentProfile.keybindingsResource.toString());
                    super({
                        id: 'editor.action.defineKeybinding',
                        title: nls.localize2('defineKeybinding.start', "Define Keybinding"),
                        f1: true,
                        precondition: when,
                        keybinding: {
                            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                            when,
                            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)
                        },
                        menu: {
                            id: MenuId.EditorContent,
                            when,
                        }
                    });
                }
                async run(accessor) {
                    const codeEditor = accessor.get(IEditorService).activeTextEditorControl;
                    if (isCodeEditor(codeEditor)) {
                        codeEditor.getContribution(DEFINE_KEYBINDING_EDITOR_CONTRIB_ID)?.showDefineKeybindingWidget();
                    }
                }
            }));
        };
        registerProfileScopedActions();
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(() => registerProfileScopedActions()));
    }
    updatePreferencesEditorMenuItem() {
        const commandId = '_workbench.openWorkspaceSettingsEditor';
        if (this.workspaceContextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ && !CommandsRegistry.getCommand(commandId)) {
            CommandsRegistry.registerCommand(commandId, () => this.preferencesService.openWorkspaceSettings({ jsonEditor: false }));
            MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
                command: {
                    id: commandId,
                    title: OPEN_USER_SETTINGS_UI_TITLE,
                    icon: preferencesOpenSettingsIcon
                },
                when: ContextKeyExpr.and(ResourceContextKey.Resource.isEqualTo(this.preferencesService.workspaceSettingsResource.toString()), WorkbenchStateContext.isEqualTo('workspace'), ContextKeyExpr.not('isInDiffEditor')),
                group: 'navigation',
                order: 1
            });
        }
        this.updatePreferencesEditorMenuItemForWorkspaceFolders();
    }
    updatePreferencesEditorMenuItemForWorkspaceFolders() {
        for (const folder of this.workspaceContextService.getWorkspace().folders) {
            const commandId = `_workbench.openFolderSettings.${folder.uri.toString()}`;
            if (!CommandsRegistry.getCommand(commandId)) {
                CommandsRegistry.registerCommand(commandId, (accessor, ...args) => {
                    const groupId = getEditorGroupFromArguments(accessor, args)?.id;
                    if (this.workspaceContextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                        return this.preferencesService.openWorkspaceSettings({ jsonEditor: false, groupId });
                    }
                    else {
                        return this.preferencesService.openFolderSettings({ folderUri: folder.uri, jsonEditor: false, groupId });
                    }
                });
                MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
                    command: {
                        id: commandId,
                        title: OPEN_USER_SETTINGS_UI_TITLE,
                        icon: preferencesOpenSettingsIcon
                    },
                    when: ContextKeyExpr.and(ResourceContextKey.Resource.isEqualTo(this.preferencesService.getFolderSettingsResource(folder.uri).toString()), ContextKeyExpr.not('isInDiffEditor')),
                    group: 'navigation',
                    order: 1
                });
            }
        }
    }
};
PreferencesActionsContribution = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IUserDataProfileService),
    __param(2, IPreferencesService),
    __param(3, IWorkspaceContextService),
    __param(4, ILabelService),
    __param(5, IExtensionService),
    __param(6, IUserDataProfilesService)
], PreferencesActionsContribution);
let SettingsEditorTitleContribution = class SettingsEditorTitleContribution extends Disposable {
    static { this.ID = 'workbench.contrib.settingsEditorTitleBarActions'; }
    constructor(userDataProfileService, userDataProfilesService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.registerSettingsEditorTitleActions();
    }
    registerSettingsEditorTitleActions() {
        const registerOpenUserSettingsEditorFromJsonActionDisposables = this._register(new MutableDisposable());
        const registerOpenUserSettingsEditorFromJsonAction = () => {
            const openUserSettingsEditorWhen = ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR.toNegated(), ContextKeyExpr.or(ResourceContextKey.Resource.isEqualTo(this.userDataProfileService.currentProfile.settingsResource.toString()), ResourceContextKey.Resource.isEqualTo(this.userDataProfilesService.defaultProfile.settingsResource.toString())), ContextKeyExpr.not('isInDiffEditor'));
            registerOpenUserSettingsEditorFromJsonActionDisposables.value = registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: '_workbench.openUserSettingsEditor',
                        title: OPEN_USER_SETTINGS_UI_TITLE,
                        icon: preferencesOpenSettingsIcon,
                        menu: [{
                                id: MenuId.EditorTitle,
                                when: openUserSettingsEditorWhen,
                                group: 'navigation',
                                order: 1
                            }]
                    });
                }
                run(accessor, ...args) {
                    const sanitizedArgs = sanitizeOpenSettingsArgs(args[0]);
                    const groupId = getEditorGroupFromArguments(accessor, args)?.id;
                    return accessor.get(IPreferencesService).openUserSettings({ jsonEditor: false, ...sanitizedArgs, groupId });
                }
            });
        };
        registerOpenUserSettingsEditorFromJsonAction();
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(() => {
            // Force the action to check the context again.
            registerOpenUserSettingsEditorFromJsonAction();
        }));
        const openSettingsJsonWhen = ContextKeyExpr.and(CONTEXT_SETTINGS_JSON_EDITOR.toNegated(), CONTEXT_SETTINGS_EDITOR);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: SETTINGS_EDITOR_COMMAND_SWITCH_TO_JSON,
                    title: nls.localize2('openSettingsJson', "Open Settings (JSON)"),
                    icon: preferencesOpenSettingsIcon,
                    menu: [{
                            id: MenuId.EditorTitle,
                            when: openSettingsJsonWhen,
                            group: 'navigation',
                            order: 1
                        }]
                });
            }
            run(accessor, ...args) {
                const group = getEditorGroupFromArguments(accessor, args);
                const editorPane = group?.activeEditorPane;
                if (editorPane instanceof SettingsEditor2) {
                    return editorPane.switchToSettingsFile();
                }
                return null;
            }
        }));
    }
};
SettingsEditorTitleContribution = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService)
], SettingsEditorTitleContribution);
function getEditorGroupFromArguments(accessor, args) {
    const context = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
    return context.groupedEditors[0]?.group;
}
registerWorkbenchContribution2(PreferencesActionsContribution.ID, PreferencesActionsContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(PreferencesContribution.ID, PreferencesContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(SettingsEditorTitleContribution.ID, SettingsEditorTitleContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerEditorContribution(SettingsEditorContribution.ID, SettingsEditorContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
// Preferences menu
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    title: nls.localize({ key: 'miPreferences', comment: ['&& denotes a mnemonic'] }, "&&Preferences"),
    submenu: MenuId.MenubarPreferencesMenu,
    group: '5_autosave',
    order: 2,
    when: IsMacNativeContext.toNegated() // on macOS native the preferences menu is separate under the application menu
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdILE9BQU8sRUFBRSxPQUFPLElBQUksY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1REFBdUQs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