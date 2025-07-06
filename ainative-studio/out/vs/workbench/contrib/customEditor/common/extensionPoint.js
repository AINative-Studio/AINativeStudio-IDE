/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as nls from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { languagesExtPoint } from '../../../services/language/common/languageService.js';
const Fields = Object.freeze({
    viewType: 'viewType',
    displayName: 'displayName',
    selector: 'selector',
    priority: 'priority',
});
const CustomEditorsContribution = {
    description: nls.localize('contributes.customEditors', 'Contributed custom editors.'),
    type: 'array',
    defaultSnippets: [{
            body: [{
                    [Fields.viewType]: '$1',
                    [Fields.displayName]: '$2',
                    [Fields.selector]: [{
                            filenamePattern: '$3'
                        }],
                }]
        }],
    items: {
        type: 'object',
        required: [
            Fields.viewType,
            Fields.displayName,
            Fields.selector,
        ],
        properties: {
            [Fields.viewType]: {
                type: 'string',
                markdownDescription: nls.localize('contributes.viewType', 'Identifier for the custom editor. This must be unique across all custom editors, so we recommend including your extension id as part of `viewType`. The `viewType` is used when registering custom editors with `vscode.registerCustomEditorProvider` and in the `onCustomEditor:${id}` [activation event](https://code.visualstudio.com/api/references/activation-events).'),
            },
            [Fields.displayName]: {
                type: 'string',
                description: nls.localize('contributes.displayName', 'Human readable name of the custom editor. This is displayed to users when selecting which editor to use.'),
            },
            [Fields.selector]: {
                type: 'array',
                description: nls.localize('contributes.selector', 'Set of globs that the custom editor is enabled for.'),
                items: {
                    type: 'object',
                    defaultSnippets: [{
                            body: {
                                filenamePattern: '$1',
                            }
                        }],
                    properties: {
                        filenamePattern: {
                            type: 'string',
                            description: nls.localize('contributes.selector.filenamePattern', 'Glob that the custom editor is enabled for.'),
                        },
                    }
                }
            },
            [Fields.priority]: {
                type: 'string',
                markdownDeprecationMessage: nls.localize('contributes.priority', 'Controls if the custom editor is enabled automatically when the user opens a file. This may be overridden by users using the `workbench.editorAssociations` setting.'),
                enum: [
                    "default" /* CustomEditorPriority.default */,
                    "option" /* CustomEditorPriority.option */,
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
export const customEditorsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'customEditors',
    deps: [languagesExtPoint],
    jsonSchema: CustomEditorsContribution,
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            const viewType = contrib[Fields.viewType];
            if (viewType) {
                result.push(`onCustomEditor:${viewType}`);
            }
        }
    },
});
class CustomEditorsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.customEditors;
    }
    render(manifest) {
        const customEditors = manifest.contributes?.customEditors || [];
        if (!customEditors.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('customEditors view type', "View Type"),
            nls.localize('customEditors priority', "Priority"),
            nls.localize('customEditors filenamePattern', "Filename Pattern"),
        ];
        const rows = customEditors
            .map(customEditor => {
            return [
                customEditor.viewType,
                customEditor.priority ?? '',
                coalesce(customEditor.selector.map(x => x.filenamePattern)).join(', ')
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
    id: 'customEditors',
    label: nls.localize('customEditors', "Custom Editors"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(CustomEditorsDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jdXN0b21FZGl0b3IvY29tbW9uL2V4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE9BQU8sRUFBRSxVQUFVLEVBQW1HLE1BQU0sbUVBQW1FLENBQUM7QUFDaE0sT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFekYsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM1QixRQUFRLEVBQUUsVUFBVTtJQUNwQixXQUFXLEVBQUUsYUFBYTtJQUMxQixRQUFRLEVBQUUsVUFBVTtJQUNwQixRQUFRLEVBQUUsVUFBVTtDQUNwQixDQUFDLENBQUM7QUFTSCxNQUFNLHlCQUF5QixHQUFnQjtJQUM5QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSw2QkFBNkIsQ0FBQztJQUNyRixJQUFJLEVBQUUsT0FBTztJQUNiLGVBQWUsRUFBRSxDQUFDO1lBQ2pCLElBQUksRUFBRSxDQUFDO29CQUNOLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUk7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