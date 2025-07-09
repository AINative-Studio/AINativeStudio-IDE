/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { workbenchColorsSchemaId } from '../../../../platform/theme/common/colorRegistry.js';
import { tokenStylingSchemaId } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
const textMateScopes = [
    'comment',
    'comment.block',
    'comment.block.documentation',
    'comment.line',
    'constant',
    'constant.character',
    'constant.character.escape',
    'constant.numeric',
    'constant.numeric.integer',
    'constant.numeric.float',
    'constant.numeric.hex',
    'constant.numeric.octal',
    'constant.other',
    'constant.regexp',
    'constant.rgb-value',
    'emphasis',
    'entity',
    'entity.name',
    'entity.name.class',
    'entity.name.function',
    'entity.name.method',
    'entity.name.section',
    'entity.name.selector',
    'entity.name.tag',
    'entity.name.type',
    'entity.other',
    'entity.other.attribute-name',
    'entity.other.inherited-class',
    'invalid',
    'invalid.deprecated',
    'invalid.illegal',
    'keyword',
    'keyword.control',
    'keyword.operator',
    'keyword.operator.new',
    'keyword.operator.assignment',
    'keyword.operator.arithmetic',
    'keyword.operator.logical',
    'keyword.other',
    'markup',
    'markup.bold',
    'markup.changed',
    'markup.deleted',
    'markup.heading',
    'markup.inline.raw',
    'markup.inserted',
    'markup.italic',
    'markup.list',
    'markup.list.numbered',
    'markup.list.unnumbered',
    'markup.other',
    'markup.quote',
    'markup.raw',
    'markup.underline',
    'markup.underline.link',
    'meta',
    'meta.block',
    'meta.cast',
    'meta.class',
    'meta.function',
    'meta.function-call',
    'meta.preprocessor',
    'meta.return-type',
    'meta.selector',
    'meta.tag',
    'meta.type.annotation',
    'meta.type',
    'punctuation.definition.string.begin',
    'punctuation.definition.string.end',
    'punctuation.separator',
    'punctuation.separator.continuation',
    'punctuation.terminator',
    'storage',
    'storage.modifier',
    'storage.type',
    'string',
    'string.interpolated',
    'string.other',
    'string.quoted',
    'string.quoted.double',
    'string.quoted.other',
    'string.quoted.single',
    'string.quoted.triple',
    'string.regexp',
    'string.unquoted',
    'strong',
    'support',
    'support.class',
    'support.constant',
    'support.function',
    'support.other',
    'support.type',
    'support.type.property-name',
    'support.variable',
    'variable',
    'variable.language',
    'variable.name',
    'variable.other',
    'variable.other.readwrite',
    'variable.parameter'
];
export const textmateColorsSchemaId = 'vscode://schemas/textmate-colors';
export const textmateColorGroupSchemaId = `${textmateColorsSchemaId}#/definitions/colorGroup`;
const textmateColorSchema = {
    type: 'array',
    definitions: {
        colorGroup: {
            default: '#FF0000',
            anyOf: [
                {
                    type: 'string',
                    format: 'color-hex'
                },
                {
                    $ref: '#/definitions/settings'
                }
            ]
        },
        settings: {
            type: 'object',
            description: nls.localize('schema.token.settings', 'Colors and styles for the token.'),
            properties: {
                foreground: {
                    type: 'string',
                    description: nls.localize('schema.token.foreground', 'Foreground color for the token.'),
                    format: 'color-hex',
                    default: '#ff0000'
                },
                background: {
                    type: 'string',
                    deprecationMessage: nls.localize('schema.token.background.warning', 'Token background colors are currently not supported.')
                },
                fontStyle: {
                    type: 'string',
                    description: nls.localize('schema.token.fontStyle', 'Font style of the rule: \'italic\', \'bold\', \'underline\', \'strikethrough\' or a combination. The empty string unsets inherited settings.'),
                    pattern: '^(\\s*\\b(italic|bold|underline|strikethrough))*\\s*$',
                    patternErrorMessage: nls.localize('schema.fontStyle.error', 'Font style must be \'italic\', \'bold\', \'underline\', \'strikethrough\' or a combination or the empty string.'),
                    defaultSnippets: [
                        { label: nls.localize('schema.token.fontStyle.none', 'None (clear inherited style)'), bodyText: '""' },
                        { body: 'italic' },
                        { body: 'bold' },
                        { body: 'underline' },
                        { body: 'strikethrough' },
                        { body: 'italic bold' },
                        { body: 'italic underline' },
                        { body: 'italic strikethrough' },
                        { body: 'bold underline' },
                        { body: 'bold strikethrough' },
                        { body: 'underline strikethrough' },
                        { body: 'italic bold underline' },
                        { body: 'italic bold strikethrough' },
                        { body: 'italic underline strikethrough' },
                        { body: 'bold underline strikethrough' },
                        { body: 'italic bold underline strikethrough' }
                    ]
                }
            },
            additionalProperties: false,
            defaultSnippets: [{ body: { foreground: '${1:#FF0000}', fontStyle: '${2:bold}' } }]
        }
    },
    items: {
        type: 'object',
        defaultSnippets: [{ body: { scope: '${1:keyword.operator}', settings: { foreground: '${2:#FF0000}' } } }],
        properties: {
            name: {
                type: 'string',
                description: nls.localize('schema.properties.name', 'Description of the rule.')
            },
            scope: {
                description: nls.localize('schema.properties.scope', 'Scope selector against which this rule matches.'),
                anyOf: [
                    {
                        enum: textMateScopes
                    },
                    {
                        type: 'string'
                    },
                    {
                        type: 'array',
                        items: {
                            enum: textMateScopes
                        }
                    },
                    {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                ]
            },
            settings: {
                $ref: '#/definitions/settings'
            }
        },
        required: [
            'settings'
        ],
        additionalProperties: false
    }
};
export const colorThemeSchemaId = 'vscode://schemas/color-theme';
const colorThemeSchema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    properties: {
        colors: {
            description: nls.localize('schema.workbenchColors', 'Colors in the workbench'),
            $ref: workbenchColorsSchemaId,
            additionalProperties: false
        },
        tokenColors: {
            anyOf: [{
                    type: 'string',
                    description: nls.localize('schema.tokenColors.path', 'Path to a tmTheme file (relative to the current file).')
                },
                {
                    description: nls.localize('schema.colors', 'Colors for syntax highlighting'),
                    $ref: textmateColorsSchemaId
                }
            ]
        },
        semanticHighlighting: {
            type: 'boolean',
            description: nls.localize('schema.supportsSemanticHighlighting', 'Whether semantic highlighting should be enabled for this theme.')
        },
        semanticTokenColors: {
            type: 'object',
            description: nls.localize('schema.semanticTokenColors', 'Colors for semantic tokens'),
            $ref: tokenStylingSchemaId
        }
    }
};
export function registerColorThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(colorThemeSchemaId, colorThemeSchema);
    schemaRegistry.registerSchema(textmateColorsSchemaId, textmateColorSchema);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JUaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi9jb2xvclRoZW1lU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksY0FBYyxFQUE2QixNQUFNLHFFQUFxRSxDQUFDO0FBRzlJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXhHLE1BQU0sY0FBYyxHQUFHO0lBQ3RCLFNBQVM7SUFDVCxlQUFlO0lBQ2YsNkJBQTZCO0lBQzdCLGNBQWM7SUFDZCxVQUFVO0lBQ1Ysb0JBQW9CO0lBQ3BCLDJCQUEyQjtJQUMzQixrQkFBa0I7SUFDbEIsMEJBQTBCO0lBQzFCLHdCQUF3QjtJQUN4QixzQkFBc0I7SUFDdEIsd0JBQXdCO0lBQ3hCLGdCQUFnQjtJQUNoQixpQkFBaUI7SUFDakIsb0JBQW9CO0lBQ3BCLFVBQVU7SUFDVixRQUFRO0lBQ1IsYUFBYTtJQUNiLG1CQUFtQjtJQUNuQixzQkFBc0I7SUFDdEIsb0JBQW9CO0lBQ3BCLHFCQUFxQjtJQUNyQixzQkFBc0I7SUFDdEIsaUJBQWlCO0lBQ2pCLGtCQUFrQjtJQUNsQixjQUFjO0lBQ2QsNkJBQTZCO0lBQzdCLDhCQUE4QjtJQUM5QixTQUFTO0lBQ1Qsb0JBQW9CO0lBQ3BCLGlCQUFpQjtJQUNqQixTQUFTO0lBQ1QsaUJBQWlCO0lBQ2pCLGtCQUFrQjtJQUNsQixzQkFBc0I7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