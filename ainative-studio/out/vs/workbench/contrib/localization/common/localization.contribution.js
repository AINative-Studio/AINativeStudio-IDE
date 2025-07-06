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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxpemF0aW9uL2NvbW1vbi9sb2NhbGl6YXRpb24uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdkcsT0FBTyxFQUFtRyxVQUFVLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNoTSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUUvRixNQUFNLE9BQU8scUNBQXNDLFNBQVEsVUFBVTtJQUNwRTtRQUNDLEtBQUssRUFBRSxDQUFDO1FBRVIsMkRBQTJEO1FBQzNELGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ2hELGVBQWUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRTVDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDO1lBQ3pDLGNBQWMsRUFBRSxlQUFlO1lBQy9CLG9CQUFvQixFQUFFLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQztZQUN6QyxVQUFVLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FBQyw0Q0FBNEMsRUFB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