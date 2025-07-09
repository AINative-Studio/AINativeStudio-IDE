/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { EXTENSION_IDENTIFIER_PATTERN } from '../../../../platform/extensionManagement/common/extensionManagement.js';
export const ExtensionsConfigurationSchemaId = 'vscode://schemas/extensions';
export const ExtensionsConfigurationSchema = {
    id: ExtensionsConfigurationSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    type: 'object',
    title: localize('app.extensions.json.title', "Extensions"),
    additionalProperties: false,
    properties: {
        recommendations: {
            type: 'array',
            description: localize('app.extensions.json.recommendations', "List of extensions which should be recommended for users of this workspace. The identifier of an extension is always '${publisher}.${name}'. For example: 'vscode.csharp'."),
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                errorMessage: localize('app.extension.identifier.errorMessage', "Expected format '${publisher}.${name}'. Example: 'vscode.csharp'.")
            },
        },
        unwantedRecommendations: {
            type: 'array',
            description: localize('app.extensions.json.unwantedRecommendations', "List of extensions recommended by VS Code that should not be recommended for users of this workspace. The identifier of an extension is always '${publisher}.${name}'. For example: 'vscode.csharp'."),
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                errorMessage: localize('app.extension.identifier.errorMessage', "Expected format '${publisher}.${name}'. Example: 'vscode.csharp'.")
            },
        },
    }
};
export const ExtensionsConfigurationInitialContent = [
    '{',
    '\t// See https://go.microsoft.com/fwlink/?LinkId=827846 to learn about workspace recommendations.',
    '\t// Extension identifier format: ${publisher}.${name}. Example: vscode.csharp',
    '',
    '\t// List of extensions which should be recommended for users of this workspace.',
    '\t"recommendations": [',
    '\t\t',
    '\t],',
    '\t// List of extensions recommended by VS Code that should not be recommended for users of this workspace.',
    '\t"unwantedRecommendations": [',
    '\t\t',
    '\t]',
    '}'
].join('\n');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0ZpbGVUZW1wbGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zRmlsZVRlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUV0SCxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyw2QkFBNkIsQ0FBQztBQUM3RSxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBZ0I7SUFDekQsRUFBRSxFQUFFLCtCQUErQjtJQUNuQyxhQUFhLEVBQUUsSUFBSTtJQUNuQixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLElBQUksRUFBRSxRQUFRO0lBQ2QsS0FBSyxFQUFFLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxZQUFZLENBQUM7SUFDMUQsb0JBQW9CLEVBQUUsS0FBSztJQUMzQixVQUFVLEVBQUU7UUFDWCxlQUFlLEVBQUU7WUFDaEIsSUFBSSxFQUFFLE9BQU87WUFDYixXQUFXLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLDRLQUE0SyxDQUFDO1lBQzFPLEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsNEJBQTRCO2dCQUNyQyxZQUFZLEVBQUUsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLG1FQUFtRSxDQUFDO2FBQ3BJO1NBQ0Q7UUFDRCx1QkFBdUIsRUFBRTtZQUN4QixJQUFJLEVBQUUsT0FBTztZQUNiLFdBQVcsRUFBRSxRQUFRLENBQUMsNkNBQTZDLEVBQUUsc01BQXNNLENBQUM7WUFDNVEsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSw0QkFBNEI7Z0JBQ3JDLFlBQVksRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsbUVBQW1FLENBQUM7YUFDcEk7U0FDRDtLQUNEO0NBQ0QsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHFDQUFxQyxHQUFXO0lBQzVELEdBQUc7SUFDSCxtR0FBbUc7SUFDbkcsZ0ZBQWdGO0lBQ2hGLEVBQUU7SUFDRixrRkFBa0Y7SUFDbEYsd0JBQXdCO0lBQ3hCLE1BQU07SUFDTixNQUFNO0lBQ04sNEdBQTRHO0lBQzVHLGdDQUFnQztJQUNoQyxNQUFNO0lBQ04sS0FBSztJQUNMLEdBQUc7Q0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyJ9