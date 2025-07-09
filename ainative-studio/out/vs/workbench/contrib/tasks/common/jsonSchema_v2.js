/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import commonSchema from './jsonSchemaCommon.js';
import { ProblemMatcherRegistry } from './problemMatcher.js';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry.js';
import * as ConfigurationResolverUtils from '../../../services/configurationResolver/common/configurationResolverUtils.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { getAllCodicons } from '../../../../base/common/codicons.js';
function fixReferences(literal) {
    if (Array.isArray(literal)) {
        literal.forEach(fixReferences);
    }
    else if (typeof literal === 'object') {
        if (literal['$ref']) {
            literal['$ref'] = literal['$ref'] + '2';
        }
        Object.getOwnPropertyNames(literal).forEach(property => {
            const value = literal[property];
            if (Array.isArray(value) || typeof value === 'object') {
                fixReferences(value);
            }
        });
    }
}
const shellCommand = {
    anyOf: [
        {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.shell', 'Specifies whether the command is a shell command or an external program. Defaults to false if omitted.')
        },
        {
            $ref: '#/definitions/shellConfiguration'
        }
    ],
    deprecationMessage: nls.localize('JsonSchema.tasks.isShellCommand.deprecated', 'The property isShellCommand is deprecated. Use the type property of the task and the shell property in the options instead. See also the 1.14 release notes.')
};
const hide = {
    type: 'boolean',
    description: nls.localize('JsonSchema.hide', 'Hide this task from the run task quick pick'),
    default: true
};
const taskIdentifier = {
    type: 'object',
    additionalProperties: true,
    properties: {
        type: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.dependsOn.identifier', 'The task identifier.')
        }
    }
};
const dependsOn = {
    anyOf: [
        {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.dependsOn.string', 'Another task this task depends on.')
        },
        taskIdentifier,
        {
            type: 'array',
            description: nls.localize('JsonSchema.tasks.dependsOn.array', 'The other tasks this task depends on.'),
            items: {
                anyOf: [
                    {
                        type: 'string',
                    },
                    taskIdentifier
                ]
            }
        }
    ],
    description: nls.localize('JsonSchema.tasks.dependsOn', 'Either a string representing another task or an array of other tasks that this task depends on.')
};
const dependsOrder = {
    type: 'string',
    enum: ['parallel', 'sequence'],
    enumDescriptions: [
        nls.localize('JsonSchema.tasks.dependsOrder.parallel', 'Run all dependsOn tasks in parallel.'),
        nls.localize('JsonSchema.tasks.dependsOrder.sequence', 'Run all dependsOn tasks in sequence.'),
    ],
    default: 'parallel',
    description: nls.localize('JsonSchema.tasks.dependsOrder', 'Determines the order of the dependsOn tasks for this task. Note that this property is not recursive.')
};
const detail = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.detail', 'An optional description of a task that shows in the Run Task quick pick as a detail.')
};
const icon = {
    type: 'object',
    description: nls.localize('JsonSchema.tasks.icon', 'An optional icon for the task'),
    properties: {
        id: {
            description: nls.localize('JsonSchema.tasks.icon.id', 'An optional codicon ID to use'),
            type: ['string', 'null'],
            enum: Array.from(getAllCodicons(), icon => icon.id),
            markdownEnumDescriptions: Array.from(getAllCodicons(), icon => `$(${icon.id})`),
        },
        color: {
            description: nls.localize('JsonSchema.tasks.icon.color', 'An optional color of the icon'),
            type: ['string', 'null'],
            enum: [
                'terminal.ansiBlack',
                'terminal.ansiRed',
                'terminal.ansiGreen',
                'terminal.ansiYellow',
                'terminal.ansiBlue',
                'terminal.ansiMagenta',
                'terminal.ansiCyan',
                'terminal.ansiWhite'
            ],
        },
    }
};
const presentation = {
    type: 'object',
    default: {
        echo: true,
        reveal: 'always',
        focus: false,
        panel: 'shared',
        showReuseMessage: true,
        clear: false,
    },
    description: nls.localize('JsonSchema.tasks.presentation', 'Configures the panel that is used to present the task\'s output and reads its input.'),
    additionalProperties: false,
    properties: {
        echo: {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.tasks.presentation.echo', 'Controls whether the executed command is echoed to the panel. Default is true.')
        },
        focus: {
            type: 'boolean',
            default: false,
            description: nls.localize('JsonSchema.tasks.presentation.focus', 'Controls whether the panel takes focus. Default is false. If set to true the panel is revealed as well.')
        },
        revealProblems: {
            type: 'string',
            enum: ['always', 'onProblem', 'never'],
            enumDescriptions: [
                nls.localize('JsonSchema.tasks.presentation.revealProblems.always', 'Always reveals the problems panel when this task is executed.'),
                nls.localize('JsonSchema.tasks.presentation.revealProblems.onProblem', 'Only reveals the problems panel if a problem is found.'),
                nls.localize('JsonSchema.tasks.presentation.revealProblems.never', 'Never reveals the problems panel when this task is executed.'),
            ],
            default: 'never',
            description: nls.localize('JsonSchema.tasks.presentation.revealProblems', 'Controls whether the problems panel is revealed when running this task or not. Takes precedence over option \"reveal\". Default is \"never\".')
        },
        reveal: {
            type: 'string',
            enum: ['always', 'silent', 'never'],
            enumDescriptions: [
                nls.localize('JsonSchema.tasks.presentation.reveal.always', 'Always reveals the terminal when this task is executed.'),
                nls.localize('JsonSchema.tasks.presentation.reveal.silent', 'Only reveals the terminal if the task exits with an error or the problem matcher finds an error.'),
                nls.localize('JsonSchema.tasks.presentation.reveal.never', 'Never reveals the terminal when this task is executed.'),
            ],
            default: 'always',
            description: nls.localize('JsonSchema.tasks.presentation.reveal', 'Controls whether the terminal running the task is revealed or not. May be overridden by option \"revealProblems\". Default is \"always\".')
        },
        panel: {
            type: 'string',
            enum: ['shared', 'dedicated', 'new'],
            default: 'shared',
            description: nls.localize('JsonSchema.tasks.presentation.instance', 'Controls if the panel is shared between tasks, dedicated to this task or a new one is created on every run.')
        },
        showReuseMessage: {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.tasks.presentation.showReuseMessage', 'Controls whether to show the `Terminal will be reused by tasks, press any key to close it` message.')
        },
        clear: {
            type: 'boolean',
            default: false,
            description: nls.localize('JsonSchema.tasks.presentation.clear', 'Controls whether the terminal is cleared before executing the task.')
        },
        group: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.presentation.group', 'Controls whether the task is executed in a specific terminal group using split panes.')
        },
        close: {
            type: 'boolean',
            description: nls.localize('JsonSchema.tasks.presentation.close', 'Controls whether the terminal the task runs in is closed when the task exits.')
        }
    }
};
const terminal = Objects.deepClone(presentation);
terminal.deprecationMessage = nls.localize('JsonSchema.tasks.terminal', 'The terminal property is deprecated. Use presentation instead');
const groupStrings = {
    type: 'string',
    enum: [
        'build',
        'test',
        'none'
    ],
    enumDescriptions: [
        nls.localize('JsonSchema.tasks.group.build', 'Marks the task as a build task accessible through the \'Run Build Task\' command.'),
        nls.localize('JsonSchema.tasks.group.test', 'Marks the task as a test task accessible through the \'Run Test Task\' command.'),
        nls.localize('JsonSchema.tasks.group.none', 'Assigns the task to no group')
    ],
    description: nls.localize('JsonSchema.tasks.group.kind', 'The task\'s execution group.')
};
const group = {
    oneOf: [
        groupStrings,
        {
            type: 'object',
            properties: {
                kind: groupStrings,
                isDefault: {
                    type: ['boolean', 'string'],
                    default: false,
                    description: nls.localize('JsonSchema.tasks.group.isDefault', 'Defines if this task is the default task in the group, or a glob to match the file which should trigger this task.')
                }
            }
        },
    ],
    defaultSnippets: [
        {
            body: { kind: 'build', isDefault: true },
            description: nls.localize('JsonSchema.tasks.group.defaultBuild', 'Marks the task as the default build task.')
        },
        {
            body: { kind: 'test', isDefault: true },
            description: nls.localize('JsonSchema.tasks.group.defaultTest', 'Marks the task as the default test task.')
        }
    ],
    description: nls.localize('JsonSchema.tasks.group', 'Defines to which execution group this task belongs to. It supports "build" to add it to the build group and "test" to add it to the test group.')
};
const taskType = {
    type: 'string',
    enum: ['shell'],
    default: 'process',
    description: nls.localize('JsonSchema.tasks.type', 'Defines whether the task is run as a process or as a command inside a shell.')
};
const command = {
    oneOf: [
        {
            oneOf: [
                {
                    type: 'string'
                },
                {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: nls.localize('JsonSchema.commandArray', 'The shell command to be executed. Array items will be joined using a space character')
                }
            ]
        },
        {
            type: 'object',
            required: ['value', 'quoting'],
            properties: {
                value: {
                    oneOf: [
                        {
                            type: 'string'
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: nls.localize('JsonSchema.commandArray', 'The shell command to be executed. Array items will be joined using a space character')
                        }
                    ],
                    description: nls.localize('JsonSchema.command.quotedString.value', 'The actual command value')
                },
                quoting: {
                    type: 'string',
                    enum: ['escape', 'strong', 'weak'],
                    enumDescriptions: [
                        nls.localize('JsonSchema.tasks.quoting.escape', 'Escapes characters using the shell\'s escape character (e.g. ` under PowerShell and \\ under bash).'),
                        nls.localize('JsonSchema.tasks.quoting.strong', 'Quotes the argument using the shell\'s strong quote character (e.g. \' under PowerShell and bash).'),
                        nls.localize('JsonSchema.tasks.quoting.weak', 'Quotes the argument using the shell\'s weak quote character (e.g. " under PowerShell and bash).'),
                    ],
                    default: 'strong',
                    description: nls.localize('JsonSchema.command.quotesString.quote', 'How the command value should be quoted.')
                }
            }
        }
    ],
    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.')
};
const args = {
    type: 'array',
    items: {
        oneOf: [
            {
                type: 'string',
            },
            {
                type: 'object',
                required: ['value', 'quoting'],
                properties: {
                    value: {
                        type: 'string',
                        description: nls.localize('JsonSchema.args.quotedString.value', 'The actual argument value')
                    },
                    quoting: {
                        type: 'string',
                        enum: ['escape', 'strong', 'weak'],
                        enumDescriptions: [
                            nls.localize('JsonSchema.tasks.quoting.escape', 'Escapes characters using the shell\'s escape character (e.g. ` under PowerShell and \\ under bash).'),
                            nls.localize('JsonSchema.tasks.quoting.strong', 'Quotes the argument using the shell\'s strong quote character (e.g. \' under PowerShell and bash).'),
                            nls.localize('JsonSchema.tasks.quoting.weak', 'Quotes the argument using the shell\'s weak quote character (e.g. " under PowerShell and bash).'),
                        ],
                        default: 'strong',
                        description: nls.localize('JsonSchema.args.quotesString.quote', 'How the argument value should be quoted.')
                    }
                }
            }
        ]
    },
    description: nls.localize('JsonSchema.tasks.args', 'Arguments passed to the command when this task is invoked.')
};
const label = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.label', "The task's user interface label")
};
const version = {
    type: 'string',
    enum: ['2.0.0'],
    description: nls.localize('JsonSchema.version', 'The config\'s version number.')
};
const identifier = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.identifier', 'A user defined identifier to reference the task in launch.json or a dependsOn clause.'),
    deprecationMessage: nls.localize('JsonSchema.tasks.identifier.deprecated', 'User defined identifiers are deprecated. For custom task use the name as a reference and for tasks provided by extensions use their defined task identifier.')
};
const runOptions = {
    type: 'object',
    additionalProperties: false,
    properties: {
        reevaluateOnRerun: {
            type: 'boolean',
            description: nls.localize('JsonSchema.tasks.reevaluateOnRerun', 'Whether to reevaluate task variables on rerun.'),
            default: true
        },
        runOn: {
            type: 'string',
            enum: ['default', 'folderOpen'],
            description: nls.localize('JsonSchema.tasks.runOn', 'Configures when the task should be run. If set to folderOpen, then the task will be run automatically when the folder is opened.'),
            default: 'default'
        },
        instanceLimit: {
            type: 'number',
            description: nls.localize('JsonSchema.tasks.instanceLimit', 'The number of instances of the task that are allowed to run simultaneously.'),
            default: 1
        },
    },
    description: nls.localize('JsonSchema.tasks.runOptions', 'The task\'s run related options')
};
const commonSchemaDefinitions = commonSchema.definitions;
const options = Objects.deepClone(commonSchemaDefinitions.options);
const optionsProperties = options.properties;
optionsProperties.shell = Objects.deepClone(commonSchemaDefinitions.shellConfiguration);
const taskConfiguration = {
    type: 'object',
    additionalProperties: false,
    properties: {
        label: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.taskLabel', "The task's label")
        },
        taskName: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.taskName', 'The task\'s name'),
            deprecationMessage: nls.localize('JsonSchema.tasks.taskName.deprecated', 'The task\'s name property is deprecated. Use the label property instead.')
        },
        identifier: Objects.deepClone(identifier),
        group: Objects.deepClone(group),
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
        presentation: Objects.deepClone(presentation),
        icon: Objects.deepClone(icon),
        hide: Objects.deepClone(hide),
        options: options,
        problemMatcher: {
            $ref: '#/definitions/problemMatcherType',
            description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.')
        },
        runOptions: Objects.deepClone(runOptions),
        dependsOn: Objects.deepClone(dependsOn),
        dependsOrder: Objects.deepClone(dependsOrder),
        detail: Objects.deepClone(detail),
    }
};
const taskDefinitions = [];
TaskDefinitionRegistry.onReady().then(() => {
    updateTaskDefinitions();
});
export function updateTaskDefinitions() {
    for (const taskType of TaskDefinitionRegistry.all()) {
        // Check that we haven't already added this task type
        if (taskDefinitions.find(schema => {
            return schema.properties?.type?.enum?.find ? schema.properties?.type.enum.find(element => element === taskType.taskType) : undefined;
        })) {
            continue;
        }
        const schema = Objects.deepClone(taskConfiguration);
        const schemaProperties = schema.properties;
        // Since we do this after the schema is assigned we need to patch the refs.
        schemaProperties.type = {
            type: 'string',
            description: nls.localize('JsonSchema.customizations.customizes.type', 'The task type to customize'),
            enum: [taskType.taskType]
        };
        if (taskType.required) {
            schema.required = taskType.required.slice();
        }
        else {
            schema.required = [];
        }
        // Customized tasks require that the task type be set.
        schema.required.push('type');
        if (taskType.properties) {
            for (const key of Object.keys(taskType.properties)) {
                const property = taskType.properties[key];
                schemaProperties[key] = Objects.deepClone(property);
            }
        }
        fixReferences(schema);
        taskDefinitions.push(schema);
    }
}
const customize = Objects.deepClone(taskConfiguration);
customize.properties.customize = {
    type: 'string',
    deprecationMessage: nls.localize('JsonSchema.tasks.customize.deprecated', 'The customize property is deprecated. See the 1.14 release notes on how to migrate to the new task customization approach')
};
if (!customize.required) {
    customize.required = [];
}
customize.required.push('customize');
taskDefinitions.push(customize);
const definitions = Objects.deepClone(commonSchemaDefinitions);
const taskDescription = definitions.taskDescription;
taskDescription.required = ['label'];
const taskDescriptionProperties = taskDescription.properties;
taskDescriptionProperties.label = Objects.deepClone(label);
taskDescriptionProperties.command = Objects.deepClone(command);
taskDescriptionProperties.args = Objects.deepClone(args);
taskDescriptionProperties.isShellCommand = Objects.deepClone(shellCommand);
taskDescriptionProperties.dependsOn = dependsOn;
taskDescriptionProperties.hide = Objects.deepClone(hide);
taskDescriptionProperties.dependsOrder = dependsOrder;
taskDescriptionProperties.identifier = Objects.deepClone(identifier);
taskDescriptionProperties.type = Objects.deepClone(taskType);
taskDescriptionProperties.presentation = Objects.deepClone(presentation);
taskDescriptionProperties.terminal = terminal;
taskDescriptionProperties.icon = Objects.deepClone(icon);
taskDescriptionProperties.group = Objects.deepClone(group);
taskDescriptionProperties.runOptions = Objects.deepClone(runOptions);
taskDescriptionProperties.detail = detail;
taskDescriptionProperties.taskName.deprecationMessage = nls.localize('JsonSchema.tasks.taskName.deprecated', 'The task\'s name property is deprecated. Use the label property instead.');
// Clone the taskDescription for process task before setting a default to prevent two defaults #115281
const processTask = Objects.deepClone(taskDescription);
taskDescription.default = {
    label: 'My Task',
    type: 'shell',
    command: 'echo Hello',
    problemMatcher: []
};
definitions.showOutputType.deprecationMessage = nls.localize('JsonSchema.tasks.showOutput.deprecated', 'The property showOutput is deprecated. Use the reveal property inside the presentation property instead. See also the 1.14 release notes.');
taskDescriptionProperties.echoCommand.deprecationMessage = nls.localize('JsonSchema.tasks.echoCommand.deprecated', 'The property echoCommand is deprecated. Use the echo property inside the presentation property instead. See also the 1.14 release notes.');
taskDescriptionProperties.suppressTaskName.deprecationMessage = nls.localize('JsonSchema.tasks.suppressTaskName.deprecated', 'The property suppressTaskName is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
taskDescriptionProperties.isBuildCommand.deprecationMessage = nls.localize('JsonSchema.tasks.isBuildCommand.deprecated', 'The property isBuildCommand is deprecated. Use the group property instead. See also the 1.14 release notes.');
taskDescriptionProperties.isTestCommand.deprecationMessage = nls.localize('JsonSchema.tasks.isTestCommand.deprecated', 'The property isTestCommand is deprecated. Use the group property instead. See also the 1.14 release notes.');
// Process tasks are almost identical schema-wise to shell tasks, but they are required to have a command
processTask.properties.type = {
    type: 'string',
    enum: ['process'],
    default: 'process',
    description: nls.localize('JsonSchema.tasks.type', 'Defines whether the task is run as a process or as a command inside a shell.')
};
processTask.required.push('command');
processTask.required.push('type');
taskDefinitions.push(processTask);
taskDefinitions.push({
    $ref: '#/definitions/taskDescription'
});
const definitionsTaskRunnerConfigurationProperties = definitions.taskRunnerConfiguration.properties;
const tasks = definitionsTaskRunnerConfigurationProperties.tasks;
tasks.items = {
    oneOf: taskDefinitions
};
definitionsTaskRunnerConfigurationProperties.inputs = inputsSchema.definitions.inputs;
definitions.commandConfiguration.properties.isShellCommand = Objects.deepClone(shellCommand);
definitions.commandConfiguration.properties.args = Objects.deepClone(args);
definitions.options.properties.shell = {
    $ref: '#/definitions/shellConfiguration'
};
definitionsTaskRunnerConfigurationProperties.isShellCommand = Objects.deepClone(shellCommand);
definitionsTaskRunnerConfigurationProperties.type = Objects.deepClone(taskType);
definitionsTaskRunnerConfigurationProperties.group = Objects.deepClone(group);
definitionsTaskRunnerConfigurationProperties.presentation = Objects.deepClone(presentation);
definitionsTaskRunnerConfigurationProperties.suppressTaskName.deprecationMessage = nls.localize('JsonSchema.tasks.suppressTaskName.deprecated', 'The property suppressTaskName is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
definitionsTaskRunnerConfigurationProperties.taskSelector.deprecationMessage = nls.localize('JsonSchema.tasks.taskSelector.deprecated', 'The property taskSelector is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
const osSpecificTaskRunnerConfiguration = Objects.deepClone(definitions.taskRunnerConfiguration);
delete osSpecificTaskRunnerConfiguration.properties.tasks;
osSpecificTaskRunnerConfiguration.additionalProperties = false;
definitions.osSpecificTaskRunnerConfiguration = osSpecificTaskRunnerConfiguration;
definitionsTaskRunnerConfigurationProperties.version = Objects.deepClone(version);
const schema = {
    oneOf: [
        {
            'allOf': [
                {
                    type: 'object',
                    required: ['version'],
                    properties: {
                        version: Objects.deepClone(version),
                        windows: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize('JsonSchema.windows', 'Windows specific command configuration')
                        },
                        osx: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize('JsonSchema.mac', 'Mac specific command configuration')
                        },
                        linux: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize('JsonSchema.linux', 'Linux specific command configuration')
                        }
                    }
                },
                {
                    $ref: '#/definitions/taskRunnerConfiguration'
                }
            ]
        }
    ]
};
schema.definitions = definitions;
function deprecatedVariableMessage(schemaMap, property) {
    const mapAtProperty = schemaMap[property].properties;
    if (mapAtProperty) {
        Object.keys(mapAtProperty).forEach(name => {
            deprecatedVariableMessage(mapAtProperty, name);
        });
    }
    else {
        ConfigurationResolverUtils.applyDeprecatedVariableMessage(schemaMap[property]);
    }
}
Object.getOwnPropertyNames(definitions).forEach(key => {
    const newKey = key + '2';
    definitions[newKey] = definitions[key];
    delete definitions[key];
    deprecatedVariableMessage(definitions, newKey);
});
fixReferences(schema);
export function updateProblemMatchers() {
    try {
        const matcherIds = ProblemMatcherRegistry.keys().map(key => '$' + key);
        definitions.problemMatcherType2.oneOf[0].enum = matcherIds;
        definitions.problemMatcherType2.oneOf[2].items.anyOf[0].enum = matcherIds;
    }
    catch (err) {
        console.log('Installing problem matcher ids failed');
    }
}
ProblemMatcherRegistry.onReady().then(() => {
    updateProblemMatchers();
});
export default schema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYV92Mi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vanNvblNjaGVtYV92Mi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFHOUQsT0FBTyxZQUFZLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxLQUFLLDBCQUEwQixNQUFNLDhFQUE4RSxDQUFDO0FBQzNILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFckUsU0FBUyxhQUFhLENBQUMsT0FBWTtJQUNsQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7U0FBTSxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3hDLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDekMsQ0FBQztRQUNELE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7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