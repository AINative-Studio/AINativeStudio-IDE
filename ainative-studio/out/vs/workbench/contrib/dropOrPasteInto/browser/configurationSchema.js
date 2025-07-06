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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { pasteAsCommandId } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteContribution.js';
import { pasteAsPreferenceConfig } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { dropAsPreferenceConfig } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import * as nls from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
const dropEnumValues = [];
const dropAsPreferenceSchema = {
    type: 'array',
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
    description: nls.localize('dropPreferredDescription', "Configures the preferred type of edit to use when dropping content.\n\nThis is an ordered list of edit kinds. The first available edit of a preferred kind will be used."),
    default: [],
    items: {
        description: nls.localize('dropKind', "The kind identifier of the drop edit."),
        anyOf: [
            { type: 'string' },
            { enum: dropEnumValues }
        ],
    }
};
const pasteEnumValues = [];
const pasteAsPreferenceSchema = {
    type: 'array',
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
    description: nls.localize('pastePreferredDescription', "Configures the preferred type of edit to use when pasting content.\n\nThis is an ordered list of edit kinds. The first available edit of a preferred kind will be used."),
    default: [],
    items: {
        description: nls.localize('pasteKind', "The kind identifier of the paste edit."),
        anyOf: [
            { type: 'string' },
            { enum: pasteEnumValues }
        ]
    }
};
export const editorConfiguration = Object.freeze({
    ...editorConfigurationBaseNode,
    properties: {
        [pasteAsPreferenceConfig]: pasteAsPreferenceSchema,
        [dropAsPreferenceConfig]: dropAsPreferenceSchema,
    }
});
let DropOrPasteSchemaContribution = class DropOrPasteSchemaContribution extends Disposable {
    static { this.ID = 'workbench.contrib.dropOrPasteIntoSchema'; }
    constructor(keybindingService, languageFeatures) {
        super();
        this.languageFeatures = languageFeatures;
        this._onDidChangeSchemaContributions = this._register(new Emitter());
        this._allProvidedDropKinds = [];
        this._allProvidedPasteKinds = [];
        this._register(Event.runAndSubscribe(Event.debounce(Event.any(languageFeatures.documentPasteEditProvider.onDidChange, languageFeatures.documentPasteEditProvider.onDidChange), () => { }, 1000), () => {
            this.updateProvidedKinds();
            this.updateConfigurationSchema();
            this._onDidChangeSchemaContributions.fire();
        }));
        keybindingService.registerSchemaContribution({
            getSchemaAdditions: () => this.getKeybindingSchemaAdditions(),
            onDidChange: this._onDidChangeSchemaContributions.event,
        });
    }
    updateProvidedKinds() {
        // Drop
        const dropKinds = new Map();
        for (const provider of this.languageFeatures.documentDropEditProvider.allNoModel()) {
            for (const kind of provider.providedDropEditKinds ?? []) {
                dropKinds.set(kind.value, kind);
            }
        }
        this._allProvidedDropKinds = Array.from(dropKinds.values());
        // Paste
        const pasteKinds = new Map();
        for (const provider of this.languageFeatures.documentPasteEditProvider.allNoModel()) {
            for (const kind of provider.providedPasteEditKinds ?? []) {
                pasteKinds.set(kind.value, kind);
            }
        }
        this._allProvidedPasteKinds = Array.from(pasteKinds.values());
    }
    updateConfigurationSchema() {
        pasteEnumValues.length = 0;
        for (const codeActionKind of this._allProvidedPasteKinds) {
            pasteEnumValues.push(codeActionKind.value);
        }
        dropEnumValues.length = 0;
        for (const codeActionKind of this._allProvidedDropKinds) {
            dropEnumValues.push(codeActionKind.value);
        }
        Registry.as(Extensions.Configuration)
            .notifyConfigurationSchemaUpdated(editorConfiguration);
    }
    getKeybindingSchemaAdditions() {
        return [
            {
                if: {
                    required: ['command'],
                    properties: {
                        'command': { const: pasteAsCommandId }
                    }
                },
                then: {
                    properties: {
                        'args': {
                            oneOf: [
                                {
                                    required: ['kind'],
                                    properties: {
                                        'kind': {
                                            anyOf: [
                                                { enum: Array.from(this._allProvidedPasteKinds.map(x => x.value)) },
                                                { type: 'string' },
                                            ]
                                        }
                                    }
                                },
                                {
                                    required: ['preferences'],
                                    properties: {
                                        'preferences': {
                                            type: 'array',
                                            items: {
                                                anyOf: [
                                                    { enum: Array.from(this._allProvidedPasteKinds.map(x => x.value)) },
                                                    { type: 'string' },
                                                ]
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            },
        ];
    }
};
DropOrPasteSchemaContribution = __decorate([
    __param(0, IKeybindingService),
    __param(1, ILanguageFeaturesService)
], DropOrPasteSchemaContribution);
export { DropOrPasteSchemaContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2NvbmZpZ3VyYXRpb25TY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUdsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDNUcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDL0csT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDcEgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDeEgsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQXNCLFVBQVUsRUFBNEUsTUFBTSxvRUFBb0UsQ0FBQztBQUM5TCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHNUUsTUFBTSxjQUFjLEdBQWEsRUFBRSxDQUFDO0FBRXBDLE1BQU0sc0JBQXNCLEdBQWlDO0lBQzVELElBQUksRUFBRSxPQUFPO0lBQ2IsS0FBSyxpREFBeUM7SUFDOUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsMEtBQTBLLENBQUM7SUFD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