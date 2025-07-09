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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2NoZW1hLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uUmVzb2x2ZXIvY29tbW9uL2NvbmZpZ3VyYXRpb25SZXNvbHZlclNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRzFDLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsdUZBQXVGLENBQUMsQ0FBQztBQUNuSixNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHVDQUF1QyxDQUFDLENBQUM7QUFDdkcsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLCtEQUErRCxDQUFDLENBQUM7QUFDN0ksTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGtDQUFrQyxDQUFDLENBQUM7QUFHeEcsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFnQjtJQUN4QyxXQUFXLEVBQUU7UUFDWixNQUFNLEVBQUU7WUFDUCxJQUFJLEVBQUUsT0FBTztZQUNiLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGdIQUFnSCxDQUFDO1lBQ2hLLEtBQUssRUFBRTtnQkFDTixLQUFLLEVBQUU7b0JBQ047d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUM7d0JBQ3ZDLG9CQUFvQixFQUFFLEtBQUs7d0JBQzNCLFVBQVUsRUFBRTs0QkFDWCxFQUFFLEVBQUU7Z0NB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