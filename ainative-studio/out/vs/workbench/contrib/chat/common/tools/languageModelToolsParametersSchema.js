/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions as JSONExtensions } from '../../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
/**
 * A schema for parametersSchema
 * This is a subset of https://json-schema.org/draft-07/schema to capture what is actually supported by language models for tools, mainly, that they must be an object at the top level.
 * Possibly it can be whittled down some more based on which attributes are supported by language models.
 */
export const toolsParametersSchemaSchemaId = 'vscode://schemas/toolsParameters';
const toolsParametersSchemaSchema = {
    definitions: {
        schemaArray: {
            type: 'array',
            minItems: 1,
            items: {
                $ref: '#'
            }
        },
        nonNegativeInteger: {
            type: 'integer',
            minimum: 0
        },
        nonNegativeIntegerDefault0: {
            allOf: [
                {
                    $ref: '#/definitions/nonNegativeInteger'
                },
                {
                    default: 0
                }
            ]
        },
        simpleTypes: {
            enum: [
                'array',
                'boolean',
                'integer',
                'null',
                'number',
                'object',
                'string'
            ]
        },
        stringArray: {
            type: 'array',
            items: {
                type: 'string'
            },
            uniqueItems: true,
            default: []
        }
    },
    type: ['object'],
    properties: {
        $id: {
            type: 'string',
            format: 'uri-reference'
        },
        $schema: {
            type: 'string',
            format: 'uri'
        },
        $ref: {
            type: 'string',
            format: 'uri-reference'
        },
        $comment: {
            type: 'string'
        },
        title: {
            type: 'string'
        },
        description: {
            type: 'string'
        },
        readOnly: {
            type: 'boolean',
            default: false
        },
        writeOnly: {
            type: 'boolean',
            default: false
        },
        multipleOf: {
            type: 'number',
            exclusiveMinimum: 0
        },
        maximum: {
            type: 'number'
        },
        exclusiveMaximum: {
            type: 'number'
        },
        minimum: {
            type: 'number'
        },
        exclusiveMinimum: {
            type: 'number'
        },
        maxLength: {
            $ref: '#/definitions/nonNegativeInteger'
        },
        minLength: {
            $ref: '#/definitions/nonNegativeIntegerDefault0'
        },
        pattern: {
            type: 'string',
            format: 'regex'
        },
        additionalItems: {
            $ref: '#'
        },
        items: {
            anyOf: [
                {
                    $ref: '#'
                },
                {
                    $ref: '#/definitions/schemaArray'
                }
            ],
            default: true
        },
        maxItems: {
            $ref: '#/definitions/nonNegativeInteger'
        },
        minItems: {
            $ref: '#/definitions/nonNegativeIntegerDefault0'
        },
        uniqueItems: {
            type: 'boolean',
            default: false
        },
        contains: {
            $ref: '#'
        },
        maxProperties: {
            $ref: '#/definitions/nonNegativeInteger'
        },
        minProperties: {
            $ref: '#/definitions/nonNegativeIntegerDefault0'
        },
        required: {
            $ref: '#/definitions/stringArray'
        },
        additionalProperties: {
            $ref: '#'
        },
        definitions: {
            type: 'object',
            additionalProperties: {
                $ref: '#'
            },
            default: {}
        },
        properties: {
            type: 'object',
            additionalProperties: {
                $ref: '#'
            },
            default: {}
        },
        patternProperties: {
            type: 'object',
            additionalProperties: {
                $ref: '#'
            },
            propertyNames: {
                format: 'regex'
            },
            default: {}
        },
        dependencies: {
            type: 'object',
            additionalProperties: {
                anyOf: [
                    {
                        $ref: '#'
                    },
                    {
                        $ref: '#/definitions/stringArray'
                    }
                ]
            }
        },
        propertyNames: {
            $ref: '#'
        },
        enum: {
            type: 'array',
            minItems: 1,
            uniqueItems: true
        },
        type: {
            anyOf: [
                {
                    $ref: '#/definitions/simpleTypes'
                },
                {
                    type: 'array',
                    items: {
                        $ref: '#/definitions/simpleTypes'
                    },
                    minItems: 1,
                    uniqueItems: true
                }
            ]
        },
        format: {
            type: 'string'
        },
        contentMediaType: {
            type: 'string'
        },
        contentEncoding: {
            type: 'string'
        },
        if: {
            $ref: '#'
        },
        then: {
            $ref: '#'
        },
        else: {
            $ref: '#'
        },
        allOf: {
            $ref: '#/definitions/schemaArray'
        },
        anyOf: {
            $ref: '#/definitions/schemaArray'
        },
        oneOf: {
            $ref: '#/definitions/schemaArray'
        },
        not: {
            $ref: '#'
        }
    },
    defaultSnippets: [{
            body: {
                type: 'object',
                properties: {
                    '${1:paramName}': {
                        type: 'string',
                        description: '${2:description}'
                    }
                }
            },
        }],
};
const contributionRegistry = Registry.as(JSONExtensions.JSONContribution);
contributionRegistry.registerSchema(toolsParametersSchemaSchemaId, toolsParametersSchemaSchema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzUGFyYW1ldGVyc1NjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi90b29scy9sYW5ndWFnZU1vZGVsVG9vbHNQYXJhbWV0ZXJzU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLElBQUksY0FBYyxFQUE2QixNQUFNLHdFQUF3RSxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUvRTs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsa0NBQWtDLENBQUM7QUFDaEYsTUFBTSwyQkFBMkIsR0FBZ0I7SUFDaEQsV0FBVyxFQUFFO1FBQ1osV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFLE9BQU87WUFDYixRQUFRLEVBQUUsQ0FBQztZQUNYLEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsR0FBRzthQUNUO1NBQ0Q7UUFDRCxrQkFBa0IsRUFBRTtZQUNuQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxDQUFDO1NBQ1Y7UUFDRCwwQkFBMEIsRUFBRTtZQUMzQixLQUFLLEVBQUU7Z0JBQ047b0JBQ0MsSUFBSSxFQUFFLGtDQUFrQztpQkFDeEM7Z0JBQ0Q7b0JBQ0MsT0FBTyxFQUFFLENBQUM7aUJBQ1Y7YUFDRDtTQUNEO1FBQ0QsV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFO2dCQUNMLE9BQU87Z0JBQ1AsU0FBUztnQkFDVCxTQUFTO2dCQUNULE1BQU07Z0JBQ04sUUFBUTtnQkFDUixRQUFRO2dCQUNSLFFBQVE7YUFDUjtTQUNEO1FBQ0QsV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFLE9BQU87WUFDYixLQUFL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