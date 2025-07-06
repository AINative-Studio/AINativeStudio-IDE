/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
const idDescription = nls.localize('JsonSchema.input.id', "The input's id is used to associate an input with a variable of the form ${input:id}.");
const typeDescription = nls.localize('JsonSchema.input.type', "The type of user input prompt to use.");
const descriptionDescription = nls.localize('JsonSchema.input.description', "The description is shown when the user is prompted for input.");
const defaultDescription = nls.localize('JsonSchema.input.default', "The default value for the input.");
export const inputsSchema = {
    definitions: {
        inputs: {
            type: 'array',
            description: nls.localize('JsonSchema.inputs', 'User inputs. Used for defining user input prompts, such as free string input or a choice from several options.'),
            items: {
                oneOf: [
                    {
                        type: 'object',
                        required: ['id', 'type', 'description'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['promptString'],
                                enumDescriptions: [
                                    nls.localize('JsonSchema.input.type.promptString', "The 'promptString' type opens an input box to ask the user for input."),
                                ]
                            },
                            description: {
                                type: 'string',
                                description: descriptionDescription
                            },
                            default: {
                                type: 'string',
                                description: defaultDescription
                            },
                            password: {
                                type: 'boolean',
                                description: nls.localize('JsonSchema.input.password', "Controls if a password input is shown. Password input hides the typed text."),
                            },
                        }
                    },
                    {
                        type: 'object',
                        required: ['id', 'type', 'description', 'options'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['pickString'],
                                enumDescriptions: [
                                    nls.localize('JsonSchema.input.type.pickString', "The 'pickString' type shows a selection list."),
                                ]
                            },
                            description: {
                                type: 'string',
                                description: descriptionDescription
                            },
                            default: {
                                type: 'string',
                                description: defaultDescription
                            },
                            options: {
                                type: 'array',
                                description: nls.localize('JsonSchema.input.options', "An array of strings that defines the options for a quick pick."),
                                items: {
                                    oneOf: [
                                        {
                                            type: 'string'
                                        },
                                        {
                                            type: 'object',
                                            required: ['value'],
                                            additionalProperties: false,
                                            properties: {
                                                label: {
                                                    type: 'string',
                                                    description: nls.localize('JsonSchema.input.pickString.optionLabel', "Label for the option.")
                                                },
                                                value: {
                                                    type: 'string',
                                                    description: nls.localize('JsonSchema.input.pickString.optionValue', "Value for the option.")
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    {
                        type: 'object',
                        required: ['id', 'type', 'command'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['command'],
                                enumDescriptions: [
                                    nls.localize('JsonSchema.input.type.command', "The 'command' type executes a command."),
                                ]
                            },
                            command: {
                                type: 'string',
                                description: nls.localize('JsonSchema.input.command.command', "The command to execute for this input variable.")
                            },
                            args: {
                                oneOf: [
                                    {
                                        type: 'object',
                                        description: nls.localize('JsonSchema.input.command.args', "Optional arguments passed to the command.")
                                    },
                                    {
                                        type: 'array',
                                        description: nls.localize('JsonSchema.input.command.args', "Optional arguments passed to the command.")
                                    },
                                    {
                                        type: 'string',
                                        description: nls.localize('JsonSchema.input.command.args', "Optional arguments passed to the command.")
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2NoZW1hLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL2NvbW1vbi9jb25maWd1cmF0aW9uUmVzb2x2ZXJTY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUcxQyxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHVGQUF1RixDQUFDLENBQUM7QUFDbkosTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO0FBQ3ZHLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSwrREFBK0QsQ0FBQyxDQUFDO0FBQzdJLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO0FBR3hHLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBZ0I7SUFDeEMsV0FBVyxFQUFFO1FBQ1osTUFBTSxFQUFFO1lBQ1AsSUFBSSxFQUFFLE9BQU87WUFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxnSEFBZ0gsQ0FBQztZQUNoSyxLQUFLLEVBQUU7Z0JBQ04sS0FBSyxFQUFFO29CQUNOO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsYUFBYSxDQUFDO3dCQUN2QyxvQkFBb0IsRUFBRSxLQUFLO3dCQUMzQixVQUFVLEVBQUU7NEJBQ1gsRUFBRSxFQUFF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