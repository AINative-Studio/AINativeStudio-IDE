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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzUGFyYW1ldGVyc1NjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvbGFuZ3VhZ2VNb2RlbFRvb2xzUGFyYW1ldGVyc1NjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxJQUFJLGNBQWMsRUFBNkIsTUFBTSx3RUFBd0UsQ0FBQztBQUNqSixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFL0U7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGtDQUFrQyxDQUFDO0FBQ2hGLE1BQU0sMkJBQTJCLEdBQWdCO0lBQ2hELFdBQVcsRUFBRTtRQUNaLFdBQVcsRUFBRTtZQUNaLElBQUksRUFBRSxPQUFPO1lBQ2IsUUFBUSxFQUFFLENBQUM7WUFDWCxLQUFLLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLEdBQUc7YUFDVDtTQUNEO1FBQ0Qsa0JBQWtCLEVBQUU7WUFDbkIsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsQ0FBQztTQUNWO1FBQ0QsMEJBQTBCLEVBQUU7WUFDM0IsS0FBSyxFQUFFO2dCQUNOO29CQUNDLElBQUksRUFBRSxrQ0FBa0M7aUJBQ3hDO2dCQUNEO29CQUNDLE9BQU8sRUFBRSxDQUFDO2lCQUNWO2FBQ0Q7U0FDRDtRQUNELFdBQVcsRUFBRTtZQUNaLElBQUksRUFBRTtnQkFDTCxPQUFPO2dCQUNQLFNBQVM7Z0JBQ1QsU0FBUztnQkFDVCxNQUFNO2dCQUNOLFFBQVE7Z0JBQ1IsUUFBUTtnQkFDUixRQUFRO2FBQ1I7U0FDRDtRQUNELFdBQVcsRUFBRTtZQUNaLElBQUksRUFBRSxPQUFPO1lBQ2Is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