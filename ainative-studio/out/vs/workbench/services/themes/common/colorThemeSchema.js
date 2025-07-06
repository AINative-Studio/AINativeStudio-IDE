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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JUaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vY29sb3JUaGVtZVNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxJQUFJLGNBQWMsRUFBNkIsTUFBTSxxRUFBcUUsQ0FBQztBQUc5SSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV4RyxNQUFNLGNBQWMsR0FBRztJQUN0QixTQUFTO0lBQ1QsZUFBZTtJQUNmLDZCQUE2QjtJQUM3QixjQUFjO0lBQ2QsVUFBVTtJQUNWLG9CQUFvQjtJQUNwQiwyQkFBMkI7SUFDM0Isa0JBQWtCO0lBQ2xCLDBCQUEwQjtJQUMxQix3QkFBd0I7SUFDeEIsc0JBQXNCO0lBQ3RCLHdCQUF3QjtJQUN4QixnQkFBZ0I7SUFDaEIsaUJBQWlCO0lBQ2pCLG9CQUFvQjtJQUNwQixVQUFVO0lBQ1YsUUFBUTtJQUNSLGFBQWE7SUFDYixtQkFBbUI7SUFDbkIsc0JBQXNCO0lBQ3RCLG9CQUFvQjtJQUNwQixxQkFBcUI7SUFDckIsc0JBQXNCO0lBQ3RCLGlCQUFpQjtJQUNqQixrQkFBa0I7SUFDbEIsY0FBYztJQUNkLDZCQUE2QjtJQUM3Qiw4QkFBOEI7SUFDOUIsU0FBUztJQUNULG9CQUFvQjtJQUNwQixpQkFBaUI7SUFDakIsU0FBUztJQUNULGlCQUFpQjtJQUNqQixrQkFBa0I7SUFDbEIsc0JB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