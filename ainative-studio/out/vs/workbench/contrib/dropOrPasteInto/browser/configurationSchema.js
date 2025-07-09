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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9jb25maWd1cmF0aW9uU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQy9HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ3hILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFzQixVQUFVLEVBQTRFLE1BQU0sb0VBQW9FLENBQUM7QUFDOUwsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRzVFLE1BQU0sY0FBYyxHQUFhLEVBQUUsQ0FBQztBQUVwQyxNQUFNLHNCQUFzQixHQUFpQztJQUM1RCxJQUFJLEVBQUUsT0FBTztJQUNiLEtBQUssaURBQXlDO0lBQzlDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDBLQUEwSyxDQUFDO0lBQ2pPLE9BQU8sRUFBRSxFQUFFO0lBQ1gsS0FBSyxFQUFFO1FBQ04sV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLHVDQUF1QyxDQUFDO1FBQzlFLEtBQUssRUFBRTtZQUNOLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNsQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUU7U0FDeEI7S0FDRDtDQUNELENBQUM7QUFFRixNQUFNLGVBQWUsR0FBYSxFQUFFLENBQUM7QUFFckMsTUFBTSx1QkFBdUIsR0FBaUM7SUFDN0QsSUFBSSxFQUFFLE9BQU87SUFDYixLQUFLLGlEQUF5QztJQUM5QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSx5S0FBeUssQ0FBQztJQUNqTyxPQUFPLEVBQUUsRUFBRTtJQUNYLEtBQUssRUFBRTtRQUNOLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSx3Q0FBd0MsQ0FBQztRQUNoRixLQUFLLEVBQUU7WUFDTixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDbEIsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFO1NBQ3pCO0tBQ0Q7Q0FDRCxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBcUI7SUFDcEUsR0FBRywyQkFBMkI7SUFDOUIsVUFBVSxFQUFFO1FBQ1gsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLHVCQUF1QjtRQUNsRCxDQUFDLHNCQUFzQixDQUFDLEVBQUUsc0JBQXNCO0tBQ2hEO0NBQ0QsQ0FBQyxDQUFDO0FBRUksSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxVQUFVO2FBRTlDLE9BQUUsR0FBRyx5Q0FBeUMsQUFBNUMsQ0FBNkM7SUFPN0QsWUFDcUIsaUJBQXFDLEVBQy9CLGdCQUEyRDtRQUVyRixLQUFLLEVBQUUsQ0FBQztRQUZtQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTBCO1FBUHJFLG9DQUErQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBRS9FLDBCQUFxQixHQUF1QixFQUFFLENBQUM7UUFDL0MsMkJBQXNCLEdBQXVCLEVBQUUsQ0FBQztRQVF2RCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxlQUFlLENBQ3BCLEtBQUssQ0FBQyxRQUFRLENBQ2IsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDLEVBQ3pILEdBQUcsRUFBRSxHQUFHLENBQUMsRUFDVCxJQUFJLENBQ0osRUFBRSxHQUFHLEVBQUU7WUFDUCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUVqQyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVOLGlCQUFpQixDQUFDLDBCQUEwQixDQUFDO1lBQzVDLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRTtZQUM3RCxXQUFXLEVBQUUsSUFBSSxDQUFDLCtCQUErQixDQUFDLEtBQUs7U0FDdkQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixPQUFPO1FBQ1AsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7UUFDdEQsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNwRixLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDekQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFFNUQsUUFBUTtRQUNSLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO1FBQ3ZELEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDckYsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLENBQUMsc0JBQXNCLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQzFELFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDM0IsS0FBSyxNQUFNLGNBQWMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUMxRCxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDMUIsS0FBSyxNQUFNLGNBQWMsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUN6RCxjQUFjLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQzthQUMzRCxnQ0FBZ0MsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFTyw0QkFBNEI7UUFDbkMsT0FBTztZQUNOO2dCQUNDLEVBQUUsRUFBRTtvQkFDSCxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUM7b0JBQ3JCLFVBQVUsRUFBRTt3QkFDWCxTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUU7cUJBQ3RDO2lCQUNEO2dCQUNELElBQUksRUFBRTtvQkFDTCxVQUFVLEVBQUU7d0JBQ1gsTUFBTSxFQUFFOzRCQUNQLEtBQUssRUFBRTtnQ0FDTjtvQ0FDQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUM7b0NBQ2xCLFVBQVUsRUFBRTt3Q0FDWCxNQUFNLEVBQUU7NENBQ1AsS0FBSyxFQUFFO2dEQUNOLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dEQUNuRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NkNBQ2xCO3lDQUNEO3FDQUNEO2lDQUNEO2dDQUNEO29DQUNDLFFBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQztvQ0FDekIsVUFBVSxFQUFFO3dDQUNYLGFBQWEsRUFBRTs0Q0FDZCxJQUFJLEVBQUUsT0FBTzs0Q0FDYixLQUFLLEVBQUU7Z0RBQ04sS0FBSyxFQUFFO29EQUNOLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO29EQUNuRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7aURBQ2xCOzZDQUNEO3lDQUNEO3FDQUNEO2lDQUNEOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDO0lBQ0gsQ0FBQzs7QUFqSFcsNkJBQTZCO0lBVXZDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx3QkFBd0IsQ0FBQTtHQVhkLDZCQUE2QixDQWtIekMifQ==