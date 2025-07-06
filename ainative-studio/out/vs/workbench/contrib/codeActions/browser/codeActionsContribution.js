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
import { Emitter, Event } from '../../../../base/common/event.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { codeActionCommandId, refactorCommandId, sourceActionCommandId } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind } from '../../../../editor/contrib/codeAction/common/types.js';
import * as nls from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
const createCodeActionsAutoSave = (description) => {
    return {
        type: 'string',
        enum: ['always', 'explicit', 'never', true, false],
        enumDescriptions: [
            nls.localize('alwaysSave', 'Triggers Code Actions on explicit saves and auto saves triggered by window or focus changes.'),
            nls.localize('explicitSave', 'Triggers Code Actions only when explicitly saved'),
            nls.localize('neverSave', 'Never triggers Code Actions on save'),
            nls.localize('explicitSaveBoolean', 'Triggers Code Actions only when explicitly saved. This value will be deprecated in favor of "explicit".'),
            nls.localize('neverSaveBoolean', 'Never triggers Code Actions on save. This value will be deprecated in favor of "never".')
        ],
        default: 'explicit',
        description: description
    };
};
const createNotebookCodeActionsAutoSave = (description) => {
    return {
        type: ['string', 'boolean'],
        enum: ['explicit', 'never', true, false],
        enumDescriptions: [
            nls.localize('explicit', 'Triggers Code Actions only when explicitly saved.'),
            nls.localize('never', 'Never triggers Code Actions on save.'),
            nls.localize('explicitBoolean', 'Triggers Code Actions only when explicitly saved. This value will be deprecated in favor of "explicit".'),
            nls.localize('neverBoolean', 'Triggers Code Actions only when explicitly saved. This value will be deprecated in favor of "never".')
        ],
        default: 'explicit',
        description: description
    };
};
const codeActionsOnSaveSchema = {
    oneOf: [
        {
            type: 'object',
            additionalProperties: {
                type: 'string'
            },
        },
        {
            type: 'array',
            items: { type: 'string' }
        }
    ],
    markdownDescription: nls.localize('editor.codeActionsOnSave', 'Run Code Actions for the editor on save. Code Actions must be specified and the editor must not be shutting down. When {0} is set to `afterDelay`, Code Actions will only be run when the file is saved explicitly. Example: `"source.organizeImports": "explicit" `', '`#files.autoSave#`'),
    type: ['object', 'array'],
    additionalProperties: {
        type: 'string',
        enum: ['always', 'explicit', 'never', true, false],
    },
    default: {},
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
};
export const editorConfiguration = Object.freeze({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActionsOnSave': codeActionsOnSaveSchema
    }
});
const notebookCodeActionsOnSaveSchema = {
    oneOf: [
        {
            type: 'object',
            additionalProperties: {
                type: 'string'
            },
        },
        {
            type: 'array',
            items: { type: 'string' }
        }
    ],
    markdownDescription: nls.localize('notebook.codeActionsOnSave', 'Run a series of Code Actions for a notebook on save. Code Actions must be specified and the editor must not be shutting down. When {0} is set to `afterDelay`, Code Actions will only be run when the file is saved explicitly. Example: `"notebook.source.organizeImports": "explicit"`', '`#files.autoSave#`'),
    type: 'object',
    additionalProperties: {
        type: ['string', 'boolean'],
        enum: ['explicit', 'never', true, false],
        // enum: ['explicit', 'always', 'never'], -- autosave support needs to be built first
        // nls.localize('always', 'Always triggers Code Actions on save, including autosave, focus, and window change events.'),
    },
    default: {}
};
export const notebookEditorConfiguration = Object.freeze({
    ...editorConfigurationBaseNode,
    properties: {
        'notebook.codeActionsOnSave': notebookCodeActionsOnSaveSchema
    }
});
let CodeActionsContribution = class CodeActionsContribution extends Disposable {
    constructor(keybindingService, languageFeatures) {
        super();
        this.languageFeatures = languageFeatures;
        this._onDidChangeSchemaContributions = this._register(new Emitter());
        this._allProvidedCodeActionKinds = [];
        // TODO: @justschen caching of code actions based on extensions loaded: https://github.com/microsoft/vscode/issues/216019
        this._register(Event.runAndSubscribe(Event.debounce(languageFeatures.codeActionProvider.onDidChange, () => { }, 1000), () => {
            this._allProvidedCodeActionKinds = this.getAllProvidedCodeActionKinds();
            this.updateConfigurationSchema(this._allProvidedCodeActionKinds);
            this._onDidChangeSchemaContributions.fire();
        }));
        keybindingService.registerSchemaContribution({
            getSchemaAdditions: () => this.getKeybindingSchemaAdditions(),
            onDidChange: this._onDidChangeSchemaContributions.event,
        });
    }
    getAllProvidedCodeActionKinds() {
        const out = new Map();
        for (const provider of this.languageFeatures.codeActionProvider.allNoModel()) {
            for (const kind of provider.providedCodeActionKinds ?? []) {
                out.set(kind, new HierarchicalKind(kind));
            }
        }
        return Array.from(out.values());
    }
    updateConfigurationSchema(allProvidedKinds) {
        const properties = { ...codeActionsOnSaveSchema.properties };
        const notebookProperties = { ...notebookCodeActionsOnSaveSchema.properties };
        for (const codeActionKind of allProvidedKinds) {
            if (CodeActionKind.Source.contains(codeActionKind) && !properties[codeActionKind.value]) {
                properties[codeActionKind.value] = createCodeActionsAutoSave(nls.localize('codeActionsOnSave.generic', "Controls whether '{0}' actions should be run on file save.", codeActionKind.value));
                notebookProperties[codeActionKind.value] = createNotebookCodeActionsAutoSave(nls.localize('codeActionsOnSave.generic', "Controls whether '{0}' actions should be run on file save.", codeActionKind.value));
            }
        }
        codeActionsOnSaveSchema.properties = properties;
        notebookCodeActionsOnSaveSchema.properties = notebookProperties;
        Registry.as(Extensions.Configuration)
            .notifyConfigurationSchemaUpdated(editorConfiguration);
    }
    getKeybindingSchemaAdditions() {
        const conditionalSchema = (command, kinds) => {
            return {
                if: {
                    required: ['command'],
                    properties: {
                        'command': { const: command }
                    }
                },
                then: {
                    properties: {
                        'args': {
                            required: ['kind'],
                            properties: {
                                'kind': {
                                    anyOf: [
                                        { enum: Array.from(kinds) },
                                        { type: 'string' },
                                    ]
                                }
                            }
                        }
                    }
                }
            };
        };
        const filterProvidedKinds = (ofKind) => {
            const out = new Set();
            for (const providedKind of this._allProvidedCodeActionKinds) {
                if (ofKind.contains(providedKind)) {
                    out.add(providedKind.value);
                }
            }
            return Array.from(out);
        };
        return [
            conditionalSchema(codeActionCommandId, filterProvidedKinds(HierarchicalKind.Empty)),
            conditionalSchema(refactorCommandId, filterProvidedKinds(CodeActionKind.Refactor)),
            conditionalSchema(sourceActionCommandId, filterProvidedKinds(CodeActionKind.Source)),
        ];
    }
};
CodeActionsContribution = __decorate([
    __param(0, IKeybindingService),
    __param(1, ILanguageFeaturesService)
], CodeActionsContribution);
export { CodeActionsContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbnNDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlQWN0aW9ucy9icm93c2VyL2NvZGVBY3Rpb25zQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzVJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN2RixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBc0IsVUFBVSxFQUE0RSxNQUFNLG9FQUFvRSxDQUFDO0FBQzlMLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUc1RSxNQUFNLHlCQUF5QixHQUFHLENBQUMsV0FBbUIsRUFBZSxFQUFFO0lBQ3RFLE9BQU87UUFDTixJQUFJLEVBQUUsUUFBUTtRQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUks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