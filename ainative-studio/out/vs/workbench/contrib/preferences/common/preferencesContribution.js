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
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { RegisteredEditorPriority, IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { ITextEditorService } from '../../../services/textfile/common/textEditorService.js';
import { DEFAULT_SETTINGS_EDITOR_SETTING, FOLDER_SETTINGS_PATH, IPreferencesService, USE_SPLIT_JSON_SETTING } from '../../../services/preferences/common/preferences.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SettingsFileSystemProvider } from './settingsFilesystemProvider.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
let PreferencesContribution = class PreferencesContribution extends Disposable {
    static { this.ID = 'workbench.contrib.preferences'; }
    constructor(fileService, instantiationService, preferencesService, userDataProfileService, workspaceService, configurationService, editorResolverService, textEditorService) {
        super();
        this.instantiationService = instantiationService;
        this.preferencesService = preferencesService;
        this.userDataProfileService = userDataProfileService;
        this.workspaceService = workspaceService;
        this.configurationService = configurationService;
        this.editorResolverService = editorResolverService;
        this.textEditorService = textEditorService;
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(USE_SPLIT_JSON_SETTING) || e.affectsConfiguration(DEFAULT_SETTINGS_EDITOR_SETTING)) {
                this.handleSettingsEditorRegistration();
            }
        }));
        this.handleSettingsEditorRegistration();
        const fileSystemProvider = this._register(this.instantiationService.createInstance(SettingsFileSystemProvider));
        this._register(fileService.registerProvider(SettingsFileSystemProvider.SCHEMA, fileSystemProvider));
    }
    handleSettingsEditorRegistration() {
        // dispose any old listener we had
        dispose(this.editorOpeningListener);
        // install editor opening listener unless user has disabled this
        if (!!this.configurationService.getValue(USE_SPLIT_JSON_SETTING) || !!this.configurationService.getValue(DEFAULT_SETTINGS_EDITOR_SETTING)) {
            this.editorOpeningListener = this.editorResolverService.registerEditor('**/settings.json', {
                id: SideBySideEditorInput.ID,
                label: nls.localize('splitSettingsEditorLabel', "Split Settings Editor"),
                priority: RegisteredEditorPriority.builtin,
            }, {}, {
                createEditorInput: ({ resource, options }) => {
                    // Global User Settings File
                    if (isEqual(resource, this.userDataProfileService.currentProfile.settingsResource)) {
                        return { editor: this.preferencesService.createSplitJsonEditorInput(3 /* ConfigurationTarget.USER_LOCAL */, resource), options };
                    }
                    // Single Folder Workspace Settings File
                    const state = this.workspaceService.getWorkbenchState();
                    if (state === 2 /* WorkbenchState.FOLDER */) {
                        const folders = this.workspaceService.getWorkspace().folders;
                        if (isEqual(resource, folders[0].toResource(FOLDER_SETTINGS_PATH))) {
                            return { editor: this.preferencesService.createSplitJsonEditorInput(5 /* ConfigurationTarget.WORKSPACE */, resource), options };
                        }
                    }
                    // Multi Folder Workspace Settings File
                    else if (state === 3 /* WorkbenchState.WORKSPACE */) {
                        const folders = this.workspaceService.getWorkspace().folders;
                        for (const folder of folders) {
                            if (isEqual(resource, folder.toResource(FOLDER_SETTINGS_PATH))) {
                                return { editor: this.preferencesService.createSplitJsonEditorInput(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, resource), options };
                            }
                        }
                    }
                    return { editor: this.textEditorService.createTextEditor({ resource }), options };
                }
            });
        }
    }
    dispose() {
        dispose(this.editorOpeningListener);
        super.dispose();
    }
};
PreferencesContribution = __decorate([
    __param(0, IFileService),
    __param(1, IInstantiationService),
    __param(2, IPreferencesService),
    __param(3, IUserDataProfileService),
    __param(4, IWorkspaceContextService),
    __param(5, IConfigurationService),
    __param(6, IEditorResolverService),
    __param(7, ITextEditorService)
], PreferencesContribution);
export { PreferencesContribution };
const registry = Registry.as(Extensions.Configuration);
registry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    'properties': {
        'workbench.settings.enableNaturalLanguageSearch': {
            'type': 'boolean',
            'description': nls.localize('enableNaturalLanguageSettingsSearch', "Controls whether to enable the natural language search mode for settings. The natural language search is provided by a Microsoft online service."),
            'default': true,
            'scope': 4 /* ConfigurationScope.WINDOW */,
            'tags': ['usesOnlineServices']
        },
        'workbench.settings.settingsSearchTocBehavior': {
            'type': 'string',
            'enum': ['hide', 'filter'],
            'enumDescriptions': [
                nls.localize('settingsSearchTocBehavior.hide', "Hide the Table of Contents while searching."),
                nls.localize('settingsSearchTocBehavior.filter', "Filter the Table of Contents to just categories that have matching settings. Clicking on a category will filter the results to that category."),
            ],
            'description': nls.localize('settingsSearchTocBehavior', "Controls the behavior of the Settings editor Table of Contents while searching. If this setting is being changed in the Settings editor, the setting will take effect after the search query is modified."),
            'default': 'filter',
            'scope': 4 /* ConfigurationScope.WINDOW */
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvY29tbW9uL3ByZWZlcmVuY2VzQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBc0IsVUFBVSxFQUEwQixNQUFNLG9FQUFvRSxDQUFDO0FBQzVJLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsd0JBQXdCLEVBQWtCLE1BQU0sb0RBQW9ELENBQUM7QUFDOUcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDeEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHNCQUFzQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDNUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLCtCQUErQixFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekssT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDdEcsT0FBTyxF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