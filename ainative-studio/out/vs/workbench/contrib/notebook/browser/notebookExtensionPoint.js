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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxzQkFBc0IsRUFBZ0UsTUFBTSw2QkFBNkIsQ0FBQztBQUNuSSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBbUcsVUFBVSxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDaE0sT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE1BQU0sMEJBQTBCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNoRCxJQUFJLEVBQUUsTUFBTTtJQUNaLFdBQVcsRUFBRSxhQUFhO0lBQzFCLFFBQVEsRUFBRSxVQUFVO0lBQ3BCLFFBQVEsRUFBRSxVQUFVO0NBQ3BCLENBQUMsQ0FBQztBQVNILE1BQU0sNEJBQTRCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNsRCxFQUFFLEVBQUUsSUFBSTtJQUNSLFdBQVcsRUFBRSxhQUFhO0lBQzFCLFNBQVMsRUFBRSxXQUFXO0lBQ3RCLFVBQVUsRUFBRSxZQUFZO0lBQ3hCLGdCQUFnQixFQUFFLGNBQWM7SUFDaEMsb0JBQW9CLEVBQUUsc0JBQXNCO0lBQzVDLGlCQUFpQixFQUFFLG1CQUFtQjtDQUN0QyxDQUFDLENBQUM7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