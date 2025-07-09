/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { NotebookEditorPriority } from '../common/notebookCommon.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
const NotebookEditorContribution = Object.freeze({
    type: 'type',
    displayName: 'displayName',
    selector: 'selector',
    priority: 'priority',
});
const NotebookRendererContribution = Object.freeze({
    id: 'id',
    displayName: 'displayName',
    mimeTypes: 'mimeTypes',
    entrypoint: 'entrypoint',
    hardDependencies: 'dependencies',
    optionalDependencies: 'optionalDependencies',
    requiresMessaging: 'requiresMessaging',
});
const NotebookPreloadContribution = Object.freeze({
    type: 'type',
    entrypoint: 'entrypoint',
    localResourceRoots: 'localResourceRoots',
});
const notebookProviderContribution = {
    description: nls.localize('contributes.notebook.provider', 'Contributes notebook document provider.'),
    type: 'array',
    defaultSnippets: [{ body: [{ type: '', displayName: '', 'selector': [{ 'filenamePattern': '' }] }] }],
    items: {
        type: 'object',
        required: [
            NotebookEditorContribution.type,
            NotebookEditorContribution.displayName,
            NotebookEditorContribution.selector,
        ],
        properties: {
            [NotebookEditorContribution.type]: {
                type: 'string',
                description: nls.localize('contributes.notebook.provider.viewType', 'Type of the notebook.'),
            },
            [NotebookEditorContribution.displayName]: {
                type: 'string',
                description: nls.localize('contributes.notebook.provider.displayName', 'Human readable name of the notebook.'),
            },
            [NotebookEditorContribution.selector]: {
                type: 'array',
                description: nls.localize('contributes.notebook.provider.selector', 'Set of globs that the notebook is for.'),
                items: {
                    type: 'object',
                    properties: {
                        filenamePattern: {
                            type: 'string',
                            description: nls.localize('contributes.notebook.provider.selector.filenamePattern', 'Glob that the notebook is enabled for.'),
                        },
                        excludeFileNamePattern: {
                            type: 'string',
                            description: nls.localize('contributes.notebook.selector.provider.excludeFileNamePattern', 'Glob that the notebook is disabled for.')
                        }
                    }
                }
            },
            [NotebookEditorContribution.priority]: {
                type: 'string',
                markdownDeprecationMessage: nls.localize('contributes.priority', 'Controls if the custom editor is enabled automatically when the user opens a file. This may be overridden by users using the `workbench.editorAssociations` setting.'),
                enum: [
                    NotebookEditorPriority.default,
                    NotebookEditorPriority.option,
                ],
                markdownEnumDescriptions: [
                    nls.localize('contributes.priority.default', 'The editor is automatically used when the user opens a resource, provided that no other default custom editors are registered for that resource.'),
                    nls.localize('contributes.priority.option', 'The editor is not automatically used when the user opens a resource, but a user can switch to the editor using the `Reopen With` command.'),
                ],
                default: 'default'
            }
        }
    }
};
const defaultRendererSnippet = Object.freeze({ id: '', displayName: '', mimeTypes: [''], entrypoint: '' });
const notebookRendererContribution = {
    description: nls.localize('contributes.notebook.renderer', 'Contributes notebook output renderer provider.'),
    type: 'array',
    defaultSnippets: [{ body: [defaultRendererSnippet] }],
    items: {
        defaultSnippets: [{ body: defaultRendererSnippet }],
        allOf: [
            {
                type: 'object',
                required: [
                    NotebookRendererContribution.id,
                    NotebookRendererContribution.displayName,
                ],
                properties: {
                    [NotebookRendererContribution.id]: {
                        type: 'string',
                        description: nls.localize('contributes.notebook.renderer.viewType', 'Unique identifier of the notebook output renderer.'),
                    },
                    [NotebookRendererContribution.displayName]: {
                        type: 'string',
                        description: nls.localize('contributes.notebook.renderer.displayName', 'Human readable name of the notebook output renderer.'),
                    },
                    [NotebookRendererContribution.hardDependencies]: {
                        type: 'array',
                        uniqueItems: true,
                        items: { type: 'string' },
                        markdownDescription: nls.localize('contributes.notebook.renderer.hardDependencies', 'List of kernel dependencies the renderer requires. If any of the dependencies are present in the `NotebookKernel.preloads`, the renderer can be used.'),
                    },
                    [NotebookRendererContribution.optionalDependencies]: {
                        type: 'array',
                        uniqueItems: true,
                        items: { type: 'string' },
                        markdownDescription: nls.localize('contributes.notebook.renderer.optionalDependencies', 'List of soft kernel dependencies the renderer can make use of. If any of the dependencies are present in the `NotebookKernel.preloads`, the renderer will be preferred over renderers that don\'t interact with the kernel.'),
                    },
                    [NotebookRendererContribution.requiresMessaging]: {
                        default: 'never',
                        enum: [
                            'always',
                            'optional',
                            'never',
                        ],
                        enumDescriptions: [
                            nls.localize('contributes.notebook.renderer.requiresMessaging.always', 'Messaging is required. The renderer will only be used when it\'s part of an extension that can be run in an extension host.'),
                            nls.localize('contributes.notebook.renderer.requiresMessaging.optional', 'The renderer is better with messaging available, but it\'s not requried.'),
                            nls.localize('contributes.notebook.renderer.requiresMessaging.never', 'The renderer does not require messaging.'),
                        ],
                        description: nls.localize('contributes.notebook.renderer.requiresMessaging', 'Defines how and if the renderer needs to communicate with an extension host, via `createRendererMessaging`. Renderers with stronger messaging requirements may not work in all environments.'),
                    },
                }
            },
            {
                oneOf: [
                    {
                        required: [
                            NotebookRendererContribution.entrypoint,
                            NotebookRendererContribution.mimeTypes,
                        ],
                        properties: {
                            [NotebookRendererContribution.mimeTypes]: {
                                type: 'array',
                                description: nls.localize('contributes.notebook.selector', 'Set of globs that the notebook is for.'),
                                items: {
                                    type: 'string'
                                }
                            },
                            [NotebookRendererContribution.entrypoint]: {
                                description: nls.localize('contributes.notebook.renderer.entrypoint', 'File to load in the webview to render the extension.'),
                                type: 'string',
                            },
                        }
                    },
                    {
                        required: [
                            NotebookRendererContribution.entrypoint,
                        ],
                        properties: {
                            [NotebookRendererContribution.entrypoint]: {
                                description: nls.localize('contributes.notebook.renderer.entrypoint', 'File to load in the webview to render the extension.'),
                                type: 'object',
                                required: ['extends', 'path'],
                                properties: {
                                    extends: {
                                        type: 'string',
                                        description: nls.localize('contributes.notebook.renderer.entrypoint.extends', 'Existing renderer that this one extends.'),
                                    },
                                    path: {
                                        type: 'string',
                                        description: nls.localize('contributes.notebook.renderer.entrypoint', 'File to load in the webview to render the extension.'),
                                    },
                                }
                            },
                        }
                    }
                ]
            }
        ]
    }
};
const notebookPreloadContribution = {
    description: nls.localize('contributes.preload.provider', 'Contributes notebook preloads.'),
    type: 'array',
    defaultSnippets: [{ body: [{ type: '', entrypoint: '' }] }],
    items: {
        type: 'object',
        required: [
            NotebookPreloadContribution.type,
            NotebookPreloadContribution.entrypoint
        ],
        properties: {
            [NotebookPreloadContribution.type]: {
                type: 'string',
                description: nls.localize('contributes.preload.provider.viewType', 'Type of the notebook.'),
            },
            [NotebookPreloadContribution.entrypoint]: {
                type: 'string',
                description: nls.localize('contributes.preload.entrypoint', 'Path to file loaded in the webview.'),
            },
            [NotebookPreloadContribution.localResourceRoots]: {
                type: 'array',
                items: { type: 'string' },
                description: nls.localize('contributes.preload.localResourceRoots', 'Paths to additional resources that should be allowed in the webview.'),
            },
        }
    }
};
export const notebooksExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebooks',
    jsonSchema: notebookProviderContribution,
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            if (contrib.type) {
                result.push(`onNotebookSerializer:${contrib.type}`);
            }
        }
    }
});
export const notebookRendererExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebookRenderer',
    jsonSchema: notebookRendererContribution,
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            if (contrib.id) {
                result.push(`onRenderer:${contrib.id}`);
            }
        }
    }
});
export const notebookPreloadExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebookPreload',
    jsonSchema: notebookPreloadContribution,
});
class NotebooksDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.notebooks;
    }
    render(manifest) {
        const contrib = manifest.contributes?.notebooks || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('Notebook id', "ID"),
            nls.localize('Notebook name', "Name"),
        ];
        const rows = contrib
            .sort((a, b) => a.type.localeCompare(b.type))
            .map(notebook => {
            return [
                notebook.type,
                notebook.displayName
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
class NotebookRenderersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.notebookRenderer;
    }
    render(manifest) {
        const contrib = manifest.contributes?.notebookRenderer || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('Notebook renderer name', "Name"),
            nls.localize('Notebook mimetypes', "Mimetypes"),
        ];
        const rows = contrib
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .map(notebookRenderer => {
            return [
                notebookRenderer.displayName,
                notebookRenderer.mimeTypes.join(',')
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'notebooks',
    label: nls.localize('notebooks', "Notebooks"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(NotebooksDataRenderer),
});
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'notebookRenderer',
    label: nls.localize('notebookRenderer', "Notebook Renderers"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(NotebookRenderersDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMvRixPQUFPLEVBQUUsc0JBQXNCLEVBQWdFLE1BQU0sNkJBQTZCLENBQUM7QUFDbkksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQW1HLFVBQVUsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ2hNLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxNQUFNLDBCQUEwQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDaEQsSUFBSSxFQUFFLE1BQU07SUFDWixXQUFXLEVBQUUsYUFBYTtJQUMxQixRQUFRLEVBQUUsVUFBVTtJQUNwQixRQUFRLEVBQUUsVUFBVTtDQUNwQixDQUFDLENBQUM7QUFTSCxNQUFNLDRCQUE0QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDbEQsRUFBRSxFQUFFLElBQUk7SUFDUixXQUFXLEVBQUUsYUFBYTtJQUMxQixTQUFTLEVBQUUsV0FBVztJQUN0QixVQUFVLEVBQUUsWUFBWTtJQUN4QixnQkFBZ0IsRUFBRSxjQUFjO0lBQ2hDLG9CQUFvQixFQUFFLHNCQUFzQjtJQUM1QyxpQkFBaUIsRUFBRSxtQkFBbUI7Q0FDdEMsQ0FBQyxDQUFDO0FBWUgsTUFBTSwyQkFBMkIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2pELElBQUksRUFBRSxNQUFNO0lBQ1osVUFBVSxFQUFFLFlBQVk7SUFDeEIsa0JBQWtCLEVBQUUsb0JBQW9CO0NBQ3hDLENBQUMsQ0FBQztBQVFILE1BQU0sNEJBQTRCLEdBQWdCO0lBQ2pELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLHlDQUF5QyxDQUFDO0lBQ3JHLElBQUksRUFBRSxPQUFPO0lBQ2IsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7SUFDckcsS0FBSyxFQUFFO1FBQ04sSUFBSSxFQUFFLFFBQVE7UUFDZCxRQUFRLEVBQUU7WUFDVCwwQkFBMEIsQ0FBQyxJQUFJO1lBQy9CLDBCQUEwQixDQUFDLFdBQVc7WUFDdEMsMEJBQTBCLENBQUMsUUFBUTtTQUNuQztRQUNELFVBQVUsRUFBRTtZQUNYLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLHVCQUF1QixDQUFDO2FBQzVGO1lBQ0QsQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDekMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkNBQTJDLEVBQUUsc0NBQXNDLENBQUM7YUFDOUc7WUFDRCxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN0QyxJQUFJLEVBQUUsT0FBTztnQkFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSx3Q0FBd0MsQ0FBQztnQkFDN0csS0FBSyxFQUFFO29CQUNOLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDWCxlQUFlLEVBQUU7NEJBQ2hCLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdEQUF3RCxFQUFFLHdDQUF3QyxDQUFDO3lCQUM3SDt3QkFDRCxzQkFBc0IsRUFBRTs0QkFDdkIsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0RBQStELEVBQUUseUNBQXlDLENBQUM7eUJBQ3JJO3FCQUNEO2lCQUNEO2FBQ0Q7WUFDRCxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN0QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCwwQkFBMEIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHNLQUFzSyxDQUFDO2dCQUN4TyxJQUFJLEVBQUU7b0JBQ0wsc0JBQXNCLENBQUMsT0FBTztvQkFDOUIsc0JBQXNCLENBQUMsTUFBTTtpQkFDN0I7Z0JBQ0Qsd0JBQXdCLEVBQUU7b0JBQ3pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUsa0pBQWtKLENBQUM7b0JBQ2hNLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsMklBQTJJLENBQUM7aUJBQ3hMO2dCQUNELE9BQU8sRUFBRSxTQUFTO2FBQ2xCO1NBQ0Q7S0FDRDtDQUNELENBQUM7QUFFRixNQUFNLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFM0csTUFBTSw0QkFBNEIsR0FBZ0I7SUFDakQsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsZ0RBQWdELENBQUM7SUFDNUcsSUFBSSxFQUFFLE9BQU87SUFDYixlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUNyRCxLQUFLLEVBQUU7UUFDTixlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxzQkFBc0IsRUFBRSxDQUFDO1FBQ25ELEtBQUssRUFBRTtZQUNOO2dCQUNDLElBQUksRUFBRSxRQUFRO2dCQUNkLFFBQVEsRUFBRTtvQkFDVCw0QkFBNEIsQ0FBQyxFQUFFO29CQUMvQiw0QkFBNEIsQ0FBQyxXQUFXO2lCQUN4QztnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLENBQUMsRUFBRTt3QkFDbEMsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0NBQXdDLEVBQUUsb0RBQW9ELENBQUM7cUJBQ3pIO29CQUNELENBQUMsNEJBQTRCLENBQUMsV0FBVyxDQUFDLEVBQUU7d0JBQzNDLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLHNEQUFzRCxDQUFDO3FCQUM5SDtvQkFDRCxDQUFDLDRCQUE0QixDQUFDLGdCQUFnQixDQUFDLEVBQUU7d0JBQ2hELElBQUksRUFBRSxPQUFPO3dCQUNiLFdBQVcsRUFBRSxJQUFJO3dCQUNqQixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3dCQUN6QixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdEQUFnRCxFQUFFLHVKQUF1SixDQUFDO3FCQUM1TztvQkFDRCxDQUFDLDRCQUE0QixDQUFDLG9CQUFvQixDQUFDLEVBQUU7d0JBQ3BELElBQUksRUFBRSxPQUFPO3dCQUNiLFdBQVcsRUFBRSxJQUFJO3dCQUNqQixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3dCQUN6QixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9EQUFvRCxFQUFFLDZOQUE2TixDQUFDO3FCQUN0VDtvQkFDRCxDQUFDLDRCQUE0QixDQUFDLGlCQUFpQixDQUFDLEVBQUU7d0JBQ2pELE9BQU8sRUFBRSxPQUFPO3dCQUNoQixJQUFJLEVBQUU7NEJBQ0wsUUFBUTs0QkFDUixVQUFVOzRCQUNWLE9BQU87eUJBQ1A7d0JBQ0QsZ0JBQWdCLEVBQUU7NEJBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0RBQXdELEVBQUUsNkhBQTZILENBQUM7NEJBQ3JNLEdBQUcsQ0FBQyxRQUFRLENBQUMsMERBQTBELEVBQUUsMEVBQTBFLENBQUM7NEJBQ3BKLEdBQUcsQ0FBQyxRQUFRLENBQUMsdURBQXVELEVBQUUsMENBQTBDLENBQUM7eUJBQ2pIO3dCQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlEQUFpRCxFQUFFLDhMQUE4TCxDQUFDO3FCQUM1UTtpQkFDRDthQUNEO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFO29CQUNOO3dCQUNDLFFBQVEsRUFBRTs0QkFDVCw0QkFBNEIsQ0FBQyxVQUFVOzRCQUN2Qyw0QkFBNEIsQ0FBQyxTQUFTO3lCQUN0Qzt3QkFDRCxVQUFVLEVBQUU7NEJBQ1gsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQ0FDekMsSUFBSSxFQUFFLE9BQU87Z0NBQ2IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsd0NBQXdDLENBQUM7Z0NBQ3BHLEtBQUssRUFBRTtvQ0FDTixJQUFJLEVBQUUsUUFBUTtpQ0FDZDs2QkFDRDs0QkFDRCxDQUFDLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxFQUFFO2dDQUMxQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxzREFBc0QsQ0FBQztnQ0FDN0gsSUFBSSxFQUFFLFFBQVE7NkJBQ2Q7eUJBQ0Q7cUJBQ0Q7b0JBQ0Q7d0JBQ0MsUUFBUSxFQUFFOzRCQUNULDRCQUE0QixDQUFDLFVBQVU7eUJBQ3ZDO3dCQUNELFVBQVUsRUFBRTs0QkFDWCxDQUFDLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxFQUFFO2dDQUMxQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxzREFBc0QsQ0FBQztnQ0FDN0gsSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsUUFBUSxFQUFFLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQztnQ0FDN0IsVUFBVSxFQUFFO29DQUNYLE9BQU8sRUFBRTt3Q0FDUixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsRUFBRSwwQ0FBMEMsQ0FBQztxQ0FDekg7b0NBQ0QsSUFBSSxFQUFFO3dDQUNMLElBQUksRUFBRSxRQUFRO3dDQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLHNEQUFzRCxDQUFDO3FDQUM3SDtpQ0FDRDs2QkFDRDt5QkFDRDtxQkFDRDtpQkFDRDthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUM7QUFFRixNQUFNLDJCQUEyQixHQUFnQjtJQUNoRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxnQ0FBZ0MsQ0FBQztJQUMzRixJQUFJLEVBQUUsT0FBTztJQUNiLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7SUFDM0QsS0FBSyxFQUFFO1FBQ04sSUFBSSxFQUFFLFFBQVE7UUFDZCxRQUFRLEVBQUU7WUFDVCwyQkFBMkIsQ0FBQyxJQUFJO1lBQ2hDLDJCQUEyQixDQUFDLFVBQVU7U0FDdEM7UUFDRCxVQUFVLEVBQUU7WUFDWCxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNuQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSx1QkFBdUIsQ0FBQzthQUMzRjtZQUNELENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ3pDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLHFDQUFxQyxDQUFDO2FBQ2xHO1lBQ0QsQ0FBQywyQkFBMkIsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO2dCQUNqRCxJQUFJLEVBQUUsT0FBTztnQkFDYixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO2dCQUN6QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxzRUFBc0UsQ0FBQzthQUMzSTtTQUNEO0tBQ0Q7Q0FDRCxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBQWdDO0lBQy9HLGNBQWMsRUFBRSxXQUFXO0lBQzNCLFVBQVUsRUFBRSw0QkFBNEI7SUFDeEMseUJBQXlCLEVBQUUsQ0FBQyxRQUF1QyxFQUFFLE1BQW9DLEVBQUUsRUFBRTtRQUM1RyxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNyRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBa0M7SUFDeEgsY0FBYyxFQUFFLGtCQUFrQjtJQUNsQyxVQUFVLEVBQUUsNEJBQTRCO0lBQ3hDLHlCQUF5QixFQUFFLENBQUMsUUFBeUMsRUFBRSxNQUFvQyxFQUFFLEVBQUU7UUFDOUcsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNoQyxJQUFJLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUFpQztJQUN0SCxjQUFjLEVBQUUsaUJBQWlCO0lBQ2pDLFVBQVUsRUFBRSwyQkFBMkI7Q0FDdkMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBQTlDOztRQUVVLFNBQUksR0FBRyxPQUFPLENBQUM7SUFrQ3pCLENBQUM7SUFoQ0EsWUFBWSxDQUFDLFFBQTRCO1FBQ3hDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDO0lBQzFDLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBNEI7UUFDbEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxTQUFTLElBQUksRUFBRSxDQUFDO1FBQ3RELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckIsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNoRSxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUc7WUFDZixHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUM7WUFDakMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDO1NBQ3JDLENBQUM7UUFFRixNQUFNLElBQUksR0FBaUIsT0FBTzthQUNoQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDNUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ2YsT0FBTztnQkFDTixRQUFRLENBQUMsSUFBSTtnQkFDYixRQUFRLENBQUMsV0FBVzthQUNwQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPO1lBQ04sSUFBSSxFQUFFO2dCQUNMLE9BQU87Z0JBQ1AsSUFBSTthQUNKO1lBQ0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDbEIsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sNkJBQThCLFNBQVEsVUFBVTtJQUF0RDs7UUFFVSxTQUFJLEdBQUcsT0FBTyxDQUFDO0lBa0N6QixDQUFDO0lBaENBLFlBQVksQ0FBQyxRQUE0QjtRQUN4QyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDO0lBQ2pELENBQUM7SUFFRCxNQUFNLENBQUMsUUFBNEI7UUFDbEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsSUFBSSxFQUFFLENBQUM7UUFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2hFLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRztZQUNmLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsTUFBTSxDQUFDO1lBQzlDLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxDQUFDO1NBQy9DLENBQUM7UUFFRixNQUFNLElBQUksR0FBaUIsT0FBTzthQUNoQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDMUQsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDdkIsT0FBTztnQkFDTixnQkFBZ0IsQ0FBQyxXQUFXO2dCQUM1QixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQzthQUNwQyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPO1lBQ04sSUFBSSxFQUFFO2dCQUNMLE9BQU87Z0JBQ1AsSUFBSTthQUNKO1lBQ0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDbEIsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQTZCLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO0lBQ3RHLEVBQUUsRUFBRSxXQUFXO0lBQ2YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQztJQUM3QyxNQUFNLEVBQUU7UUFDUCxTQUFTLEVBQUUsS0FBSztLQUNoQjtJQUNELFFBQVEsRUFBRSxJQUFJLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQztDQUNuRCxDQUFDLENBQUM7QUFFSCxRQUFRLENBQUMsRUFBRSxDQUE2QixVQUFVLENBQUMseUJBQXlCLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQztJQUN0RyxFQUFFLEVBQUUsa0JBQWtCO0lBQ3RCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDO0lBQzdELE1BQU0sRUFBRTtRQUNQLFNBQVMsRUFBRSxLQUFLO0tBQ2hCO0lBQ0QsUUFBUSxFQUFFLElBQUksY0FBYyxDQUFDLDZCQUE2QixDQUFDO0NBQzNELENBQUMsQ0FBQyJ9