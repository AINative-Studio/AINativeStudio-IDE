/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import * as objects from '../../../base/common/objects.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import { Extensions, validateProperty, OVERRIDE_PROPERTY_REGEX, configurationDefaultsSchemaId, getDefaultValue, getAllConfigurationProperties, parseScope } from '../../../platform/configuration/common/configurationRegistry.js';
import { Extensions as JSONExtensions } from '../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { workspaceSettingsSchemaId, launchSchemaId, tasksSchemaId, mcpSchemaId } from '../../services/configuration/common/configuration.js';
import { isObject, isUndefined } from '../../../base/common/types.js';
import { ExtensionIdentifierMap } from '../../../platform/extensions/common/extensions.js';
import { Extensions as ExtensionFeaturesExtensions } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import product from '../../../platform/product/common/product.js';
const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
const configurationRegistry = Registry.as(Extensions.Configuration);
const configurationEntrySchema = {
    type: 'object',
    defaultSnippets: [{ body: { title: '', properties: {} } }],
    properties: {
        title: {
            description: nls.localize('vscode.extension.contributes.configuration.title', 'A title for the current category of settings. This label will be rendered in the Settings editor as a subheading. If the title is the same as the extension display name, then the category will be grouped under the main extension heading.'),
            type: 'string'
        },
        order: {
            description: nls.localize('vscode.extension.contributes.configuration.order', 'When specified, gives the order of this category of settings relative to other categories.'),
            type: 'integer'
        },
        properties: {
            description: nls.localize('vscode.extension.contributes.configuration.properties', 'Description of the configuration properties.'),
            type: 'object',
            propertyNames: {
                pattern: '\\S+',
                patternErrorMessage: nls.localize('vscode.extension.contributes.configuration.property.empty', 'Property should not be empty.'),
            },
            additionalProperties: {
                anyOf: [
                    {
                        title: nls.localize('vscode.extension.contributes.configuration.properties.schema', 'Schema of the configuration property.'),
                        $ref: 'http://json-schema.org/draft-07/schema#'
                    },
                    {
                        type: 'object',
                        properties: {
                            scope: {
                                type: 'string',
                                enum: ['application', 'machine', 'window', 'resource', 'language-overridable', 'machine-overridable'],
                                default: 'window',
                                enumDescriptions: [
                                    nls.localize('scope.application.description', "Configuration that can be configured only in the user settings."),
                                    nls.localize('scope.machine.description', "Configuration that can be configured only in the user settings or only in the remote settings."),
                                    nls.localize('scope.window.description', "Configuration that can be configured in the user, remote or workspace settings."),
                                    nls.localize('scope.resource.description', "Configuration that can be configured in the user, remote, workspace or folder settings."),
                                    nls.localize('scope.language-overridable.description', "Resource configuration that can be configured in language specific settings."),
                                    nls.localize('scope.machine-overridable.description', "Machine configuration that can be configured also in workspace or folder settings.")
                                ],
                                markdownDescription: nls.localize('scope.description', "Scope in which the configuration is applicable. Available scopes are `application`, `machine`, `window`, `resource`, and `machine-overridable`.")
                            },
                            enumDescriptions: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                description: nls.localize('scope.enumDescriptions', 'Descriptions for enum values')
                            },
                            markdownEnumDescriptions: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                description: nls.localize('scope.markdownEnumDescriptions', 'Descriptions for enum values in the markdown format.')
                            },
                            enumItemLabels: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                markdownDescription: nls.localize('scope.enumItemLabels', 'Labels for enum values to be displayed in the Settings editor. When specified, the {0} values still show after the labels, but less prominently.', '`enum`')
                            },
                            markdownDescription: {
                                type: 'string',
                                description: nls.localize('scope.markdownDescription', 'The description in the markdown format.')
                            },
                            deprecationMessage: {
                                type: 'string',
                                description: nls.localize('scope.deprecationMessage', 'If set, the property is marked as deprecated and the given message is shown as an explanation.')
                            },
                            markdownDeprecationMessage: {
                                type: 'string',
                                description: nls.localize('scope.markdownDeprecationMessage', 'If set, the property is marked as deprecated and the given message is shown as an explanation in the markdown format.')
                            },
                            editPresentation: {
                                type: 'string',
                                enum: ['singlelineText', 'multilineText'],
                                enumDescriptions: [
                                    nls.localize('scope.singlelineText.description', 'The value will be shown in an inputbox.'),
                                    nls.localize('scope.multilineText.description', 'The value will be shown in a textarea.')
                                ],
                                default: 'singlelineText',
                                description: nls.localize('scope.editPresentation', 'When specified, controls the presentation format of the string setting.')
                            },
                            order: {
                                type: 'integer',
                                description: nls.localize('scope.order', 'When specified, gives the order of this setting relative to other settings within the same category. Settings with an order property will be placed before settings without this property set.')
                            },
                            ignoreSync: {
                                type: 'boolean',
                                description: nls.localize('scope.ignoreSync', 'When enabled, Settings Sync will not sync the user value of this configuration by default.')
                            },
                            tags: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                markdownDescription: nls.localize('scope.tags', 'A list of categories under which to place the setting. The category can then be searched up in the Settings editor. For example, specifying the `experimental` tag allows one to find the setting by searching `@tag:experimental`.'),
                            }
                        }
                    }
                ]
            }
        }
    }
};
// build up a delta across two ext points and only apply it once
let _configDelta;
// BEGIN VSCode extension point `configurationDefaults`
const defaultConfigurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'configurationDefaults',
    jsonSchema: {
        $ref: configurationDefaultsSchemaId,
    },
    canHandleResolver: true
});
defaultConfigurationExtPoint.setHandler((extensions, { added, removed }) => {
    if (_configDelta) {
        // HIGHLY unlikely, but just in case
        configurationRegistry.deltaConfiguration(_configDelta);
    }
    const configNow = _configDelta = {};
    // schedule a HIGHLY unlikely task in case only the default configurations EXT point changes
    queueMicrotask(() => {
        if (_configDelta === configNow) {
            configurationRegistry.deltaConfiguration(_configDelta);
            _configDelta = undefined;
        }
    });
    if (removed.length) {
        const removedDefaultConfigurations = removed.map(extension => ({ overrides: objects.deepClone(extension.value), source: { id: extension.description.identifier.value, displayName: extension.description.displayName } }));
        _configDelta.removedDefaults = removedDefaultConfigurations;
    }
    if (added.length) {
        const registeredProperties = configurationRegistry.getConfigurationProperties();
        const allowedScopes = [7 /* ConfigurationScope.MACHINE_OVERRIDABLE */, 4 /* ConfigurationScope.WINDOW */, 5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */];
        const addedDefaultConfigurations = added.map(extension => {
            const overrides = objects.deepClone(extension.value);
            for (const key of Object.keys(overrides)) {
                const registeredPropertyScheme = registeredProperties[key];
                if (registeredPropertyScheme?.disallowConfigurationDefault) {
                    extension.collector.warn(nls.localize('config.property.preventDefaultConfiguration.warning', "Cannot register configuration defaults for '{0}'. This setting does not allow contributing configuration defaults.", key));
                    delete overrides[key];
                    continue;
                }
                if (!OVERRIDE_PROPERTY_REGEX.test(key)) {
                    if (registeredPropertyScheme?.scope && !allowedScopes.includes(registeredPropertyScheme.scope)) {
                        extension.collector.warn(nls.localize('config.property.defaultConfiguration.warning', "Cannot register configuration defaults for '{0}'. Only defaults for machine-overridable, window, resource and language overridable scoped settings are supported.", key));
                        delete overrides[key];
                        continue;
                    }
                }
            }
            return { overrides, source: { id: extension.description.identifier.value, displayName: extension.description.displayName } };
        });
        _configDelta.addedDefaults = addedDefaultConfigurations;
    }
});
// END VSCode extension point `configurationDefaults`
// BEGIN VSCode extension point `configuration`
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'configuration',
    deps: [defaultConfigurationExtPoint],
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.configuration', 'Contributes configuration settings.'),
        oneOf: [
            configurationEntrySchema,
            {
                type: 'array',
                items: configurationEntrySchema
            }
        ]
    },
    canHandleResolver: true
});
const extensionConfigurations = new ExtensionIdentifierMap();
configurationExtPoint.setHandler((extensions, { added, removed }) => {
    // HIGHLY unlikely (only configuration but not defaultConfiguration EXT point changes)
    _configDelta ??= {};
    if (removed.length) {
        const removedConfigurations = [];
        for (const extension of removed) {
            removedConfigurations.push(...(extensionConfigurations.get(extension.description.identifier) || []));
            extensionConfigurations.delete(extension.description.identifier);
        }
        _configDelta.removedConfigurations = removedConfigurations;
    }
    const seenProperties = new Set();
    function handleConfiguration(node, extension) {
        const configuration = objects.deepClone(node);
        if (configuration.title && (typeof configuration.title !== 'string')) {
            extension.collector.error(nls.localize('invalid.title', "'configuration.title' must be a string"));
        }
        validateProperties(configuration, extension);
        configuration.id = node.id || extension.description.identifier.value;
        configuration.extensionInfo = { id: extension.description.identifier.value, displayName: extension.description.displayName };
        configuration.restrictedProperties = extension.description.capabilities?.untrustedWorkspaces?.supported === 'limited' ? extension.description.capabilities?.untrustedWorkspaces.restrictedConfigurations : undefined;
        configuration.title = configuration.title || extension.description.displayName || extension.description.identifier.value;
        return configuration;
    }
    function validateProperties(configuration, extension) {
        const properties = configuration.properties;
        const extensionConfigurationPolicy = product.extensionConfigurationPolicy;
        if (properties) {
            if (typeof properties !== 'object') {
                extension.collector.error(nls.localize('invalid.properties', "'configuration.properties' must be an object"));
                configuration.properties = {};
            }
            for (const key in properties) {
                const propertyConfiguration = properties[key];
                const message = validateProperty(key, propertyConfiguration);
                if (message) {
                    delete properties[key];
                    extension.collector.warn(message);
                    continue;
                }
                if (seenProperties.has(key)) {
                    delete properties[key];
                    extension.collector.warn(nls.localize('config.property.duplicate', "Cannot register '{0}'. This property is already registered.", key));
                    continue;
                }
                if (!isObject(propertyConfiguration)) {
                    delete properties[key];
                    extension.collector.error(nls.localize('invalid.property', "configuration.properties property '{0}' must be an object", key));
                    continue;
                }
                if (extensionConfigurationPolicy?.[key]) {
                    propertyConfiguration.policy = extensionConfigurationPolicy?.[key];
                }
                seenProperties.add(key);
                propertyConfiguration.scope = propertyConfiguration.scope ? parseScope(propertyConfiguration.scope.toString()) : 4 /* ConfigurationScope.WINDOW */;
            }
        }
        const subNodes = configuration.allOf;
        if (subNodes) {
            extension.collector.error(nls.localize('invalid.allOf', "'configuration.allOf' is deprecated and should no longer be used. Instead, pass multiple configuration sections as an array to the 'configuration' contribution point."));
            for (const node of subNodes) {
                validateProperties(node, extension);
            }
        }
    }
    if (added.length) {
        const addedConfigurations = [];
        for (const extension of added) {
            const configurations = [];
            const value = extension.value;
            if (Array.isArray(value)) {
                value.forEach(v => configurations.push(handleConfiguration(v, extension)));
            }
            else {
                configurations.push(handleConfiguration(value, extension));
            }
            extensionConfigurations.set(extension.description.identifier, configurations);
            addedConfigurations.push(...configurations);
        }
        _configDelta.addedConfigurations = addedConfigurations;
    }
    configurationRegistry.deltaConfiguration(_configDelta);
    _configDelta = undefined;
});
// END VSCode extension point `configuration`
jsonRegistry.registerSchema('vscode://schemas/workspaceConfig', {
    allowComments: true,
    allowTrailingCommas: true,
    default: {
        folders: [
            {
                path: ''
            }
        ],
        settings: {}
    },
    required: ['folders'],
    properties: {
        'folders': {
            minItems: 0,
            uniqueItems: true,
            description: nls.localize('workspaceConfig.folders.description', "List of folders to be loaded in the workspace."),
            items: {
                type: 'object',
                defaultSnippets: [{ body: { path: '$1' } }],
                oneOf: [{
                        properties: {
                            path: {
                                type: 'string',
                                description: nls.localize('workspaceConfig.path.description', "A file path. e.g. `/root/folderA` or `./folderA` for a relative path that will be resolved against the location of the workspace file.")
                            },
                            name: {
                                type: 'string',
                                description: nls.localize('workspaceConfig.name.description', "An optional name for the folder. ")
                            }
                        },
                        required: ['path']
                    }, {
                        properties: {
                            uri: {
                                type: 'string',
                                description: nls.localize('workspaceConfig.uri.description', "URI of the folder")
                            },
                            name: {
                                type: 'string',
                                description: nls.localize('workspaceConfig.name.description', "An optional name for the folder. ")
                            }
                        },
                        required: ['uri']
                    }]
            }
        },
        'settings': {
            type: 'object',
            default: {},
            description: nls.localize('workspaceConfig.settings.description', "Workspace settings"),
            $ref: workspaceSettingsSchemaId
        },
        'launch': {
            type: 'object',
            default: { configurations: [], compounds: [] },
            description: nls.localize('workspaceConfig.launch.description', "Workspace launch configurations"),
            $ref: launchSchemaId
        },
        'tasks': {
            type: 'object',
            default: { version: '2.0.0', tasks: [] },
            description: nls.localize('workspaceConfig.tasks.description', "Workspace task configurations"),
            $ref: tasksSchemaId
        },
        'mcp': {
            type: 'object',
            default: {
                inputs: [],
                servers: {
                    'mcp-server-time': {
                        command: 'python',
                        args: ['-m', 'mcp_server_time', '--local-timezone=America/Los_Angeles']
                    }
                }
            },
            description: nls.localize('workspaceConfig.mcp.description', "Model Context Protocol server configurations"),
            $ref: mcpSchemaId
        },
        'extensions': {
            type: 'object',
            default: {},
            description: nls.localize('workspaceConfig.extensions.description', "Workspace extensions"),
            $ref: 'vscode://schemas/extensions'
        },
        'remoteAuthority': {
            type: 'string',
            doNotSuggest: true,
            description: nls.localize('workspaceConfig.remoteAuthority', "The remote server where the workspace is located."),
        },
        'transient': {
            type: 'boolean',
            doNotSuggest: true,
            description: nls.localize('workspaceConfig.transient', "A transient workspace will disappear when restarting or reloading."),
        }
    },
    errorMessage: nls.localize('unknownWorkspaceProperty', "Unknown workspace configuration property")
});
class SettingsTableRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.configuration;
    }
    render(manifest) {
        const configuration = manifest.contributes?.configuration
            ? Array.isArray(manifest.contributes.configuration) ? manifest.contributes.configuration : [manifest.contributes.configuration]
            : [];
        const properties = getAllConfigurationProperties(configuration);
        const contrib = properties ? Object.keys(properties) : [];
        const headers = [nls.localize('setting name', "ID"), nls.localize('description', "Description"), nls.localize('default', "Default")];
        const rows = contrib.sort((a, b) => a.localeCompare(b))
            .map(key => {
            return [
                new MarkdownString().appendMarkdown(`\`${key}\``),
                properties[key].markdownDescription ? new MarkdownString(properties[key].markdownDescription, false) : properties[key].description ?? '',
                new MarkdownString().appendCodeblock('json', JSON.stringify(isUndefined(properties[key].default) ? getDefaultValue(properties[key].type) : properties[key].default, null, 2)),
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
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'configuration',
    label: nls.localize('settings', "Settings"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(SettingsTableRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2NvbmZpZ3VyYXRpb25FeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBdUIsTUFBTSx3REFBd0QsQ0FBQztBQUNqSCxPQUFPLEVBQThDLFVBQVUsRUFBRSxnQkFBZ0IsRUFBc0IsdUJBQXVCLEVBQTBCLDZCQUE2QixFQUF1QixlQUFlLEVBQUUsNkJBQTZCLEVBQUUsVUFBVSxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDaFYsT0FBTyxFQUE2QixVQUFVLElBQUksY0FBYyxFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDM0ksT0FBTyxFQUFFLHlCQUF5QixFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0ksT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsc0JBQXNCLEVBQXNCLE1BQU0sbURBQW1ELENBQUM7QUFFL0csT0FBTyxFQUFFLFVBQVUsSUFBSSwyQkFBMkIsRUFBbUcsTUFBTSxnRUFBZ0UsQ0FBQztBQUM1TixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8s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