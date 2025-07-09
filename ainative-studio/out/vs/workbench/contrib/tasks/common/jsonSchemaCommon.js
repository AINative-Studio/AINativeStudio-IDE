/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Schemas } from './problemMatcher.js';
const schema = {
    definitions: {
        showOutputType: {
            type: 'string',
            enum: ['always', 'silent', 'never']
        },
        options: {
            type: 'object',
            description: nls.localize('JsonSchema.options', 'Additional command options'),
            properties: {
                cwd: {
                    type: 'string',
                    description: nls.localize('JsonSchema.options.cwd', 'The current working directory of the executed program or script. If omitted Code\'s current workspace root is used.')
                },
                env: {
                    type: 'object',
                    additionalProperties: {
                        type: 'string'
                    },
                    description: nls.localize('JsonSchema.options.env', 'The environment of the executed program or shell. If omitted the parent process\' environment is used.')
                }
            },
            additionalProperties: {
                type: ['string', 'array', 'object']
            }
        },
        problemMatcherType: {
            oneOf: [
                {
                    type: 'string',
                    errorMessage: nls.localize('JsonSchema.tasks.matcherError', 'Unrecognized problem matcher. Is the extension that contributes this problem matcher installed?')
                },
                Schemas.LegacyProblemMatcher,
                {
                    type: 'array',
                    items: {
                        anyOf: [
                            {
                                type: 'string',
                                errorMessage: nls.localize('JsonSchema.tasks.matcherError', 'Unrecognized problem matcher. Is the extension that contributes this problem matcher installed?')
                            },
                            Schemas.LegacyProblemMatcher
                        ]
                    }
                }
            ]
        },
        shellConfiguration: {
            type: 'object',
            additionalProperties: false,
            description: nls.localize('JsonSchema.shellConfiguration', 'Configures the shell to be used.'),
            properties: {
                executable: {
                    type: 'string',
                    description: nls.localize('JsonSchema.shell.executable', 'The shell to be used.')
                },
                args: {
                    type: 'array',
                    description: nls.localize('JsonSchema.shell.args', 'The shell arguments.'),
                    items: {
                        type: 'string'
                    }
                }
            }
        },
        commandConfiguration: {
            type: 'object',
            additionalProperties: false,
            properties: {
                command: {
                    type: 'string',
                    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.')
                },
                args: {
                    type: 'array',
                    description: nls.localize('JsonSchema.tasks.args', 'Arguments passed to the command when this task is invoked.'),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                }
            }
        },
        taskDescription: {
            type: 'object',
            required: ['taskName'],
            additionalProperties: false,
            properties: {
                taskName: {
                    type: 'string',
                    description: nls.localize('JsonSchema.tasks.taskName', "The task's name")
                },
                command: {
                    type: 'string',
                    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.')
                },
                args: {
                    type: 'array',
                    description: nls.localize('JsonSchema.tasks.args', 'Arguments passed to the command when this task is invoked.'),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                },
                windows: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize('JsonSchema.tasks.windows', 'Windows specific command configuration'),
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.')
                                }
                            }
                        }
                    ]
                },
                osx: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize('JsonSchema.tasks.mac', 'Mac specific command configuration')
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.')
                                }
                            }
                        }
                    ]
                },
                linux: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize('JsonSchema.tasks.linux', 'Linux specific command configuration')
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.')
                                }
                            }
                        }
                    ]
                },
                suppressTaskName: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.suppressTaskName', 'Controls whether the task name is added as an argument to the command. If omitted the globally defined value is used.'),
                    default: true
                },
                showOutput: {
                    $ref: '#/definitions/showOutputType',
                    description: nls.localize('JsonSchema.tasks.showOutput', 'Controls whether the output of the running task is shown or not. If omitted the globally defined value is used.')
                },
                echoCommand: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.echoCommand', 'Controls whether the executed command is echoed to the output. Default is false.'),
                    default: true
                },
                isWatching: {
                    type: 'boolean',
                    deprecationMessage: nls.localize('JsonSchema.tasks.watching.deprecation', 'Deprecated. Use isBackground instead.'),
                    description: nls.localize('JsonSchema.tasks.watching', 'Whether the executed task is kept alive and is watching the file system.'),
                    default: true
                },
                isBackground: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.background', 'Whether the executed task is kept alive and is running in the background.'),
                    default: true
                },
                promptOnClose: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.promptOnClose', 'Whether the user is prompted when VS Code closes with a running task.'),
                    default: false
                },
                isBuildCommand: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.build', 'Maps this task to Code\'s default build command.'),
                    default: true
                },
                isTestCommand: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.test', 'Maps this task to Code\'s default test command.'),
                    default: true
                },
                problemMatcher: {
                    $ref: '#/definitions/problemMatcherType',
                    description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.')
                }
            }
        },
        taskRunnerConfiguration: {
            type: 'object',
            required: [],
            properties: {
                command: {
                    type: 'string',
                    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.')
                },
                args: {
                    type: 'array',
                    description: nls.localize('JsonSchema.args', 'Additional arguments passed to the command.'),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                },
                showOutput: {
                    $ref: '#/definitions/showOutputType',
                    description: nls.localize('JsonSchema.showOutput', 'Controls whether the output of the running task is shown or not. If omitted \'always\' is used.')
                },
                isWatching: {
                    type: 'boolean',
                    deprecationMessage: nls.localize('JsonSchema.watching.deprecation', 'Deprecated. Use isBackground instead.'),
                    description: nls.localize('JsonSchema.watching', 'Whether the executed task is kept alive and is watching the file system.'),
                    default: true
                },
                isBackground: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.background', 'Whether the executed task is kept alive and is running in the background.'),
                    default: true
                },
                promptOnClose: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.promptOnClose', 'Whether the user is prompted when VS Code closes with a running background task.'),
                    default: false
                },
                echoCommand: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.echoCommand', 'Controls whether the executed command is echoed to the output. Default is false.'),
                    default: true
                },
                suppressTaskName: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.suppressTaskName', 'Controls whether the task name is added as an argument to the command. Default is false.'),
                    default: true
                },
                taskSelector: {
                    type: 'string',
                    description: nls.localize('JsonSchema.taskSelector', 'Prefix to indicate that an argument is task.')
                },
                problemMatcher: {
                    $ref: '#/definitions/problemMatcherType',
                    description: nls.localize('JsonSchema.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.')
                },
                tasks: {
                    type: 'array',
                    description: nls.localize('JsonSchema.tasks', 'The task configurations. Usually these are enrichments of task already defined in the external task runner.'),
                    items: {
                        type: 'object',
                        $ref: '#/definitions/taskDescription'
                    }
                }
            }
        }
    }
};
export default schema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYUNvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vanNvblNjaGVtYUNvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUU5QyxNQUFNLE1BQU0sR0FBZ0I7SUFDM0IsV0FBVyxFQUFFO1FBQ1osY0FBYyxFQUFFO1lBQ2YsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQztTQUNuQztRQUNELE9BQU8sRUFBRTtZQUNSLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsNEJBQTRCLENBQUM7WUFDN0UsVUFBVSxFQUFFO2dCQUNYLEdBQUcsRUFBRTtvQkFDSixJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxxSEFBcUgsQ0FBQztpQkFDMUs7Z0JBQ0QsR0FBRyxFQUFFO29CQUNKLElBQUksRUFBRSxRQUFRO29CQUNkLG9CQUFvQixFQUFFO3dCQUNyQixJQUFJLEVBQUUsUUFBUTtxQkFDZDtvQkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSx3R0FBd0csQ0FBQztpQkFDN0o7YUFDRDtZQUNELG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQzthQUNuQztTQUNEO1FBQ0Qsa0JBQWtCLEVB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