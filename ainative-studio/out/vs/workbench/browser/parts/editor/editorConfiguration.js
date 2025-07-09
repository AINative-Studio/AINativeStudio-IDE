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
var DynamicEditorConfigurations_1;
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { Event } from '../../../../base/common/event.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ByteSize, getLargeFileConfirmationLimit } from '../../../../platform/files/common/files.js';
let DynamicEditorConfigurations = class DynamicEditorConfigurations extends Disposable {
    static { DynamicEditorConfigurations_1 = this; }
    static { this.ID = 'workbench.contrib.dynamicEditorConfigurations'; }
    static { this.AUTO_LOCK_DEFAULT_ENABLED = new Set([
        'terminalEditor',
        'mainThreadWebview-simpleBrowser.view',
        'mainThreadWebview-browserPreview',
        'workbench.editor.chatSession'
    ]); }
    static { this.AUTO_LOCK_EXTRA_EDITORS = [
        // List some editor input identifiers that are not
        // registered yet via the editor resolver infrastructure
        {
            id: 'workbench.input.interactive',
            label: localize('interactiveWindow', 'Interactive Window'),
            priority: RegisteredEditorPriority.builtin
        },
        {
            id: 'mainThreadWebview-markdown.preview',
            label: localize('markdownPreview', "Markdown Preview"),
            priority: RegisteredEditorPriority.builtin
        },
        {
            id: 'mainThreadWebview-simpleBrowser.view',
            label: localize('simpleBrowser', "Simple Browser"),
            priority: RegisteredEditorPriority.builtin
        },
        {
            id: 'mainThreadWebview-browserPreview',
            label: localize('livePreview', "Live Preview"),
            priority: RegisteredEditorPriority.builtin
        }
    ]; }
    static { this.AUTO_LOCK_REMOVE_EDITORS = new Set([
        // List some editor types that the above `AUTO_LOCK_EXTRA_EDITORS`
        // already covers to avoid duplicates.
        'vscode-interactive-input',
        'interactive',
        'vscode.markdown.preview.editor'
    ]); }
    constructor(editorResolverService, extensionService, environmentService) {
        super();
        this.editorResolverService = editorResolverService;
        this.environmentService = environmentService;
        this.configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        // Editor configurations are getting updated very aggressively
        // (atleast 20 times) while the extensions are getting registered.
        // As such push out the dynamic configuration until after extensions
        // are registered.
        (async () => {
            await extensionService.whenInstalledExtensionsRegistered();
            this.updateDynamicEditorConfigurations();
            this.registerListeners();
        })();
    }
    registerListeners() {
        // Registered editors (debounced to reduce perf overhead)
        this._register(Event.debounce(this.editorResolverService.onDidChangeEditorRegistrations, (_, e) => e)(() => this.updateDynamicEditorConfigurations()));
    }
    updateDynamicEditorConfigurations() {
        const lockableEditors = [...this.editorResolverService.getEditors(), ...DynamicEditorConfigurations_1.AUTO_LOCK_EXTRA_EDITORS].filter(e => !DynamicEditorConfigurations_1.AUTO_LOCK_REMOVE_EDITORS.has(e.id));
        const binaryEditorCandidates = this.editorResolverService.getEditors().filter(e => e.priority !== RegisteredEditorPriority.exclusive).map(e => e.id);
        // Build config from registered editors
        const autoLockGroupConfiguration = Object.create(null);
        for (const editor of lockableEditors) {
            autoLockGroupConfiguration[editor.id] = {
                type: 'boolean',
                default: DynamicEditorConfigurations_1.AUTO_LOCK_DEFAULT_ENABLED.has(editor.id),
                description: editor.label
            };
        }
        // Build default config too
        const defaultAutoLockGroupConfiguration = Object.create(null);
        for (const editor of lockableEditors) {
            defaultAutoLockGroupConfiguration[editor.id] = DynamicEditorConfigurations_1.AUTO_LOCK_DEFAULT_ENABLED.has(editor.id);
        }
        // Register setting for auto locking groups
        const oldAutoLockConfigurationNode = this.autoLockConfigurationNode;
        this.autoLockConfigurationNode = {
            ...workbenchConfigurationNodeBase,
            properties: {
                'workbench.editor.autoLockGroups': {
                    type: 'object',
                    description: localize('workbench.editor.autoLockGroups', "If an editor matching one of the listed types is opened as the first in an editor group and more than one group is open, the group is automatically locked. Locked groups will only be used for opening editors when explicitly chosen by a user gesture (for example drag and drop), but not by default. Consequently, the active editor in a locked group is less likely to be replaced accidentally with a different editor."),
                    properties: autoLockGroupConfiguration,
                    default: defaultAutoLockGroupConfiguration,
                    additionalProperties: false
                }
            }
        };
        // Registers setting for default binary editors
        const oldDefaultBinaryEditorConfigurationNode = this.defaultBinaryEditorConfigurationNode;
        this.defaultBinaryEditorConfigurationNode = {
            ...workbenchConfigurationNodeBase,
            properties: {
                'workbench.editor.defaultBinaryEditor': {
                    type: 'string',
                    default: '',
                    // This allows for intellisense autocompletion
                    enum: [...binaryEditorCandidates, ''],
                    description: localize('workbench.editor.defaultBinaryEditor', "The default editor for files detected as binary. If undefined, the user will be presented with a picker."),
                }
            }
        };
        // Registers setting for editorAssociations
        const oldEditorAssociationsConfigurationNode = this.editorAssociationsConfigurationNode;
        this.editorAssociationsConfigurationNode = {
            ...workbenchConfigurationNodeBase,
            properties: {
                'workbench.editorAssociations': {
                    type: 'object',
                    markdownDescription: localize('editor.editorAssociations', "Configure [glob patterns](https://aka.ms/vscode-glob-patterns) to editors (for example `\"*.hex\": \"hexEditor.hexedit\"`). These have precedence over the default behavior."),
                    patternProperties: {
                        '.*': {
                            type: 'string',
                            enum: binaryEditorCandidates,
                        }
                    }
                }
            }
        };
        // Registers setting for large file confirmation based on environment
        const oldEditorLargeFileConfirmationConfigurationNode = this.editorLargeFileConfirmationConfigurationNode;
        this.editorLargeFileConfirmationConfigurationNode = {
            ...workbenchConfigurationNodeBase,
            properties: {
                'workbench.editorLargeFileConfirmation': {
                    type: 'number',
                    default: getLargeFileConfirmationLimit(this.environmentService.remoteAuthority) / ByteSize.MB,
                    minimum: 1,
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                    markdownDescription: localize('editorLargeFileSizeConfirmation', "Controls the minimum size of a file in MB before asking for confirmation when opening in the editor. Note that this setting may not apply to all editor types and environments."),
                }
            }
        };
        this.configurationRegistry.updateConfigurations({
            add: [
                this.autoLockConfigurationNode,
                this.defaultBinaryEditorConfigurationNode,
                this.editorAssociationsConfigurationNode,
                this.editorLargeFileConfirmationConfigurationNode
            ],
            remove: coalesce([
                oldAutoLockConfigurationNode,
                oldDefaultBinaryEditorConfigurationNode,
                oldEditorAssociationsConfigurationNode,
                oldEditorLargeFileConfirmationConfigurationNode
            ])
        });
    }
};
DynamicEditorConfigurations = DynamicEditorConfigurations_1 = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IExtensionService),
    __param(2, IWorkbenchEnvironmentService)
], DynamicEditorConfigurations);
export { DynamicEditorConfigurations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQTBDLE1BQU0sb0VBQW9FLENBQUM7QUFDM0wsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUF3Qix3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRWxKLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLFFBQVEsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTlGLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTs7YUFFMUMsT0FBRSxHQUFHLCtDQUErQyxBQUFsRCxDQUFtRDthQUU3Qyw4QkFBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBUztRQUNuRSxnQkFBZ0I7UUFDaEIsc0NB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