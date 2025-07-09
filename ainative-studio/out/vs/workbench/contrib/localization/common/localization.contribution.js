/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ClearDisplayLanguageAction, ConfigureDisplayLanguageAction } from './localizationsActions.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
export class BaseLocalizationWorkbenchContribution extends Disposable {
    constructor() {
        super();
        // Register action to configure locale and related settings
        registerAction2(ConfigureDisplayLanguageAction);
        registerAction2(ClearDisplayLanguageAction);
        ExtensionsRegistry.registerExtensionPoint({
            extensionPoint: 'localizations',
            defaultExtensionKind: ['ui', 'workspace'],
            jsonSchema: {
                description: localize('vscode.extension.contributes.localizations', "Contributes localizations to the editor"),
                type: 'array',
                default: [],
                items: {
                    type: 'object',
                    required: ['languageId', 'translations'],
                    defaultSnippets: [{ body: { languageId: '', languageName: '', localizedLanguageName: '', translations: [{ id: 'vscode', path: '' }] } }],
                    properties: {
                        languageId: {
                            description: localize('vscode.extension.contributes.localizations.languageId', 'Id of the language into which the display strings are translated.'),
                            type: 'string'
                        },
                        languageName: {
                            description: localize('vscode.extension.contributes.localizations.languageName', 'Name of the language in English.'),
                            type: 'string'
                        },
                        localizedLanguageName: {
                            description: localize('vscode.extension.contributes.localizations.languageNameLocalized', 'Name of the language in contributed language.'),
                            type: 'string'
                        },
                        translations: {
                            description: localize('vscode.extension.contributes.localizations.translations', 'List of translations associated to the language.'),
                            type: 'array',
                            default: [{ id: 'vscode', path: '' }],
                            items: {
                                type: 'object',
                                required: ['id', 'path'],
                                properties: {
                                    id: {
                                        type: 'string',
                                        description: localize('vscode.extension.contributes.localizations.translations.id', "Id of VS Code or Extension for which this translation is contributed to. Id of VS Code is always `vscode` and of extension should be in format `publisherId.extensionName`."),
                                        pattern: '^((vscode)|([a-z0-9A-Z][a-z0-9A-Z-]*)\\.([a-z0-9A-Z][a-z0-9A-Z-]*))$',
                                        patternErrorMessage: localize('vscode.extension.contributes.localizations.translations.id.pattern', "Id should be `vscode` or in format `publisherId.extensionName` for translating VS code or an extension respectively.")
                                    },
                                    path: {
                                        type: 'string',
                                        description: localize('vscode.extension.contributes.localizations.translations.path', "A relative path to a file containing translations for the language.")
                                    }
                                },
                                defaultSnippets: [{ body: { id: '', path: '' } }],
                            },
                        }
                    }
                }
            }
        });
    }
}
class LocalizationsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.localizations;
    }
    render(manifest) {
        const localizations = manifest.contributes?.localizations || [];
        if (!localizations.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('language id', "Language ID"),
            localize('localizations language name', "Language Name"),
            localize('localizations localized language name', "Language Name (Localized)"),
        ];
        const rows = localizations
            .sort((a, b) => a.languageId.localeCompare(b.languageId))
            .map(localization => {
            return [
                localization.languageId,
                localization.languageName ?? '',
                localization.localizedLanguageName ?? ''
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
    id: 'localizations',
    label: localize('localizations', "Langauage Packs"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LocalizationsDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2NhbGl6YXRpb24vY29tbW9uL2xvY2FsaXphdGlvbi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN2RyxPQUFPLEVBQW1HLFVBQVUsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ2hNLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRS9GLE1BQU0sT0FBTyxxQ0FBc0MsU0FBUSxVQUFVO0lBQ3BFO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFFUiwyREFBMkQ7UUFDM0QsZUFBZSxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDaEQsZUFBZSxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFFNUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUM7WUFDekMsY0FBYyxFQUFFLGVBQWU7WUFDL0Isb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDO1lBQ3pDLFVBQVUsRUFBRTtnQkFDWCxXQUFXLEVBQUUsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLHlD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