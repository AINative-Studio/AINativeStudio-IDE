/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
import * as nls from '../../../../nls.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
// debuggers extension point
export const debuggersExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'debuggers',
    defaultExtensionKind: ['workspace'],
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.debuggers', 'Contributes debug adapters.'),
        type: 'array',
        defaultSnippets: [{ body: [{ type: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { type: '', program: '', runtime: '' } }],
            properties: {
                type: {
                    description: nls.localize('vscode.extension.contributes.debuggers.type', "Unique identifier for this debug adapter."),
                    type: 'string'
                },
                label: {
                    description: nls.localize('vscode.extension.contributes.debuggers.label', "Display name for this debug adapter."),
                    type: 'string'
                },
                program: {
                    description: nls.localize('vscode.extension.contributes.debuggers.program', "Path to the debug adapter program. Path is either absolute or relative to the extension folder."),
                    type: 'string'
                },
                args: {
                    description: nls.localize('vscode.extension.contributes.debuggers.args', "Optional arguments to pass to the adapter."),
                    type: 'array'
                },
                runtime: {
                    description: nls.localize('vscode.extension.contributes.debuggers.runtime', "Optional runtime in case the program attribute is not an executable but requires a runtime."),
                    type: 'string'
                },
                runtimeArgs: {
                    description: nls.localize('vscode.extension.contributes.debuggers.runtimeArgs', "Optional runtime arguments."),
                    type: 'array'
                },
                variables: {
                    description: nls.localize('vscode.extension.contributes.debuggers.variables', "Mapping from interactive variables (e.g. ${action.pickProcess}) in `launch.json` to a command."),
                    type: 'object'
                },
                initialConfigurations: {
                    description: nls.localize('vscode.extension.contributes.debuggers.initialConfigurations', "Configurations for generating the initial \'launch.json\'."),
                    type: ['array', 'string'],
                },
                languages: {
                    description: nls.localize('vscode.extension.contributes.debuggers.languages', "List of languages for which the debug extension could be considered the \"default debugger\"."),
                    type: 'array'
                },
                configurationSnippets: {
                    description: nls.localize('vscode.extension.contributes.debuggers.configurationSnippets', "Snippets for adding new configurations in \'launch.json\'."),
                    type: 'array'
                },
                configurationAttributes: {
                    description: nls.localize('vscode.extension.contributes.debuggers.configurationAttributes', "JSON schema configurations for validating \'launch.json\'."),
                    type: 'object'
                },
                when: {
                    description: nls.localize('vscode.extension.contributes.debuggers.when', "Condition which must be true to enable this type of debugger. Consider using 'shellExecutionSupported', 'virtualWorkspace', 'resourceScheme' or an extension-defined context key as appropriate for this."),
                    type: 'string',
                    default: ''
                },
                hiddenWhen: {
                    description: nls.localize('vscode.extension.contributes.debuggers.hiddenWhen', "When this condition is true, this debugger type is hidden from the debugger list, but is still enabled."),
                    type: 'string',
                    default: ''
                },
                deprecated: {
                    description: nls.localize('vscode.extension.contributes.debuggers.deprecated', "Optional message to mark this debug type as being deprecated."),
                    type: 'string',
                    default: ''
                },
                windows: {
                    description: nls.localize('vscode.extension.contributes.debuggers.windows', "Windows specific settings."),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize('vscode.extension.contributes.debuggers.windows.runtime', "Runtime used for Windows."),
                            type: 'string'
                        }
                    }
                },
                osx: {
                    description: nls.localize('vscode.extension.contributes.debuggers.osx', "macOS specific settings."),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize('vscode.extension.contributes.debuggers.osx.runtime', "Runtime used for macOS."),
                            type: 'string'
                        }
                    }
                },
                linux: {
                    description: nls.localize('vscode.extension.contributes.debuggers.linux', "Linux specific settings."),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize('vscode.extension.contributes.debuggers.linux.runtime', "Runtime used for Linux."),
                            type: 'string'
                        }
                    }
                },
                strings: {
                    description: nls.localize('vscode.extension.contributes.debuggers.strings', "UI strings contributed by this debug adapter."),
                    type: 'object',
                    properties: {
                        unverifiedBreakpoints: {
                            description: nls.localize('vscode.extension.contributes.debuggers.strings.unverifiedBreakpoints', "When there are unverified breakpoints in a language supported by this debug adapter, this message will appear on the breakpoint hover and in the breakpoints view. Markdown and command links are supported."),
                            type: 'string'
                        }
                    }
                }
            }
        }
    }
});
// breakpoints extension point #9037
export const breakpointsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'breakpoints',
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.breakpoints', 'Contributes breakpoints.'),
        type: 'array',
        defaultSnippets: [{ body: [{ language: '' }] }],
        items: {
            type: 'object',
            additionalProperties: false,
            defaultSnippets: [{ body: { language: '' } }],
            properties: {
                language: {
                    description: nls.localize('vscode.extension.contributes.breakpoints.language', "Allow breakpoints for this language."),
                    type: 'string'
                },
                when: {
                    description: nls.localize('vscode.extension.contributes.breakpoints.when', "Condition which must be true to enable breakpoints in this language. Consider matching this to the debugger when clause as appropriate."),
                    type: 'string',
                    default: ''
                }
            }
        }
    }
});
// debug general schema
export const presentationSchema = {
    type: 'object',
    description: nls.localize('presentation', "Presentation options on how to show this configuration in the debug configuration dropdown and the command palette."),
    properties: {
        hidden: {
            type: 'boolean',
            default: false,
            description: nls.localize('presentation.hidden', "Controls if this configuration should be shown in the configuration dropdown and the command palette.")
        },
        group: {
            type: 'string',
            default: '',
            description: nls.localize('presentation.group', "Group that this configuration belongs to. Used for grouping and sorting in the configuration dropdown and the command palette.")
        },
        order: {
            type: 'number',
            default: 1,
            description: nls.localize('presentation.order', "Order of this configuration within a group. Used for grouping and sorting in the configuration dropdown and the command palette.")
        }
    },
    default: {
        hidden: false,
        group: '',
        order: 1
    }
};
const defaultCompound = { name: 'Compound', configurations: [] };
export const launchSchema = {
    id: launchSchemaId,
    type: 'object',
    title: nls.localize('app.launch.json.title', "Launch"),
    allowTrailingCommas: true,
    allowComments: true,
    required: [],
    default: { version: '0.2.0', configurations: [], compounds: [] },
    properties: {
        version: {
            type: 'string',
            description: nls.localize('app.launch.json.version', "Version of this file format."),
            default: '0.2.0'
        },
        configurations: {
            type: 'array',
            description: nls.localize('app.launch.json.configurations', "List of configurations. Add new configurations or edit existing ones by using IntelliSense."),
            items: {
                defaultSnippets: [],
                'type': 'object',
                oneOf: []
            }
        },
        compounds: {
            type: 'array',
            description: nls.localize('app.launch.json.compounds', "List of compounds. Each compound references multiple configurations which will get launched together."),
            items: {
                type: 'object',
                required: ['name', 'configurations'],
                properties: {
                    name: {
                        type: 'string',
                        description: nls.localize('app.launch.json.compound.name', "Name of compound. Appears in the launch configuration drop down menu.")
                    },
                    presentation: presentationSchema,
                    configurations: {
                        type: 'array',
                        default: [],
                        items: {
                            oneOf: [{
                                    enum: [],
                                    description: nls.localize('useUniqueNames', "Please use unique configuration names.")
                                }, {
                                    type: 'object',
                                    required: ['name'],
                                    properties: {
                                        name: {
                                            enum: [],
                                            description: nls.localize('app.launch.json.compound.name', "Name of compound. Appears in the launch configuration drop down menu.")
                                        },
                                        folder: {
                                            enum: [],
                                            description: nls.localize('app.launch.json.compound.folder', "Name of folder in which the compound is located.")
                                        }
                                    }
                                }]
                        },
                        description: nls.localize('app.launch.json.compounds.configurations', "Names of configurations that will be started as part of this compound.")
                    },
                    stopAll: {
                        type: 'boolean',
                        default: false,
                        description: nls.localize('app.launch.json.compound.stopAll', "Controls whether manually terminating one session will stop all of the compound sessions.")
                    },
                    preLaunchTask: {
                        type: 'string',
                        default: '',
                        description: nls.localize('compoundPrelaunchTask', "Task to run before any of the compound configurations start.")
                    }
                },
                default: defaultCompound
            },
            default: [
                defaultCompound
            ]
        },
        inputs: inputsSchema.definitions.inputs
    }
};
class DebuggersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.debuggers;
    }
    render(manifest) {
        const contrib = manifest.contributes?.debuggers || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('debugger name', "Name"),
            nls.localize('debugger type', "Type"),
        ];
        const rows = contrib.map(d => {
            return [
                d.label ?? '',
                d.type
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'debuggers',
    label: nls.localize('debuggers', "Debuggers"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(DebuggersDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTY2hlbWFzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z1NjaGVtYXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLGtCQUFrQixNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUM3RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBbUcsTUFBTSxtRUFBbUUsQ0FBQztBQUVoTSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLDRCQUE0QjtBQUM1QixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBMEI7SUFDdEgsY0FBYyxFQUFFLFdBQVc7SUFDM0Isb0JBQW9CLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDbkMsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0NBQXdDLEVBQUUsNkJBQTZCLENBQUM7UUFDbEcsSUFBSSxFQUFFLE9BQU87UUFDYixlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUMzQyxLQUFLLEVBQUU7WUFDTixvQkFBb0IsRUFB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