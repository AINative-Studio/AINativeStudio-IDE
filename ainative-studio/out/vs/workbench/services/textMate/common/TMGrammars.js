/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { languagesExtPoint } from '../../language/common/languageService.js';
export const grammarsExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'grammars',
    deps: [languagesExtPoint],
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.grammars', 'Contributes textmate tokenizers.'),
        type: 'array',
        defaultSnippets: [{ body: [{ language: '${1:id}', scopeName: 'source.${2:id}', path: './syntaxes/${3:id}.tmLanguage.' }] }],
        items: {
            type: 'object',
            defaultSnippets: [{ body: { language: '${1:id}', scopeName: 'source.${2:id}', path: './syntaxes/${3:id}.tmLanguage.' } }],
            properties: {
                language: {
                    description: nls.localize('vscode.extension.contributes.grammars.language', 'Language identifier for which this syntax is contributed to.'),
                    type: 'string'
                },
                scopeName: {
                    description: nls.localize('vscode.extension.contributes.grammars.scopeName', 'Textmate scope name used by the tmLanguage file.'),
                    type: 'string'
                },
                path: {
                    description: nls.localize('vscode.extension.contributes.grammars.path', 'Path of the tmLanguage file. The path is relative to the extension folder and typically starts with \'./syntaxes/\'.'),
                    type: 'string'
                },
                embeddedLanguages: {
                    description: nls.localize('vscode.extension.contributes.grammars.embeddedLanguages', 'A map of scope name to language id if this grammar contains embedded languages.'),
                    type: 'object'
                },
                tokenTypes: {
                    description: nls.localize('vscode.extension.contributes.grammars.tokenTypes', 'A map of scope name to token types.'),
                    type: 'object',
                    additionalProperties: {
                        enum: ['string', 'comment', 'other']
                    }
                },
                injectTo: {
                    description: nls.localize('vscode.extension.contributes.grammars.injectTo', 'List of language scope names to which this grammar is injected to.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                balancedBracketScopes: {
                    description: nls.localize('vscode.extension.contributes.grammars.balancedBracketScopes', 'Defines which scope names contain balanced brackets.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    default: ['*'],
                },
                unbalancedBracketScopes: {
                    description: nls.localize('vscode.extension.contributes.grammars.unbalancedBracketScopes', 'Defines which scope names do not contain balanced brackets.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    default: [],
                },
            },
            required: ['scopeName', 'path']
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1HcmFtbWFycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvY29tbW9uL1RNR3JhbW1hcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsa0JBQWtCLEVBQW1CLE1BQU0sK0NBQStDLENBQUM7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFxQjdFLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUErQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBNEI7SUFDaEosY0FBYyxFQUFFLFVBQVU7SUFDMUIsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUM7SUFDekIsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsa0NBQWtDLENBQUM7UUFDdEcsSUFBSSxFQUFFLE9BQU87UUFDYixlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLGdDQUFnQyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzNILEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1lBQ2QsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsZ0NBQWdDLEVBQUUsRUFBRSxDQUFDO1lBQ3pILFVBQVUsRUFBRTtnQkFDWCxRQUFRLEVBQUU7b0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0RBQWdELEVBQUUsOERBQThELENBQUM7b0JBQzNJLElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELFNBQVMsRUFBRTtvQkFDVixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpREFBaUQsRUFBRSxrREFBa0QsQ0FBQztvQkFDaEksSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsSUFBSSxFQUFFO29CQUNMLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLHNIQUFzSCxDQUFDO29CQUMvTCxJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxpQkFBaUIsRUFBRTtvQkFDbEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMseURBQXlELEVBQUUsaUZBQWlGLENBQUM7b0JBQ3ZLLElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELFVBQVUsRUFBRTtvQkFDWCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsRUFBRSxxQ0FBcUMsQ0FBQztvQkFDcEgsSUFBSSxFQUFFLFFBQVE7b0JBQ2Qsb0JBQW9CLEVBQUU7d0JBQ3JCLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDO3FCQUNwQztpQkFDRDtnQkFDRCxRQUFRLEVBQUU7b0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0RBQWdELEVBQUUsb0VBQW9FLENBQUM7b0JBQ2pKLElBQUksRUFBRSxPQUFPO29CQUNiLEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsUUFBUTtxQkFDZDtpQkFDRDtnQkFDRCxxQkFBcUIsRUFBRTtvQkFDdEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkRBQTZELEVBQUUsc0RBQXNELENBQUM7b0JBQ2hKLElBQUksRUFBRSxPQUFPO29CQUNiLEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsUUFBUTtxQkFDZDtvQkFDRCxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ2Q7Z0JBQ0QsdUJBQXVCLEVBQUU7b0JBQ3hCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLCtEQUErRCxFQUFFLDZEQUE2RCxDQUFDO29CQUN6SixJQUFJLEVBQUUsT0FBTztvQkFDYixLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7b0JBQ0QsT0FBTyxFQUFFLEVBQUU7aUJBQ1g7YUFDRDtZQUNELFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUM7U0FDL0I7S0FDRDtDQUNELENBQUMsQ0FBQyJ9