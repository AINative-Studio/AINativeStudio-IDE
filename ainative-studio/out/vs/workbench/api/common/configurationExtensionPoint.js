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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vY29uZmlndXJhdGlvbkV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFekUsT0FBTyxFQUFFLGtCQUFrQixFQUF1QixNQUFNLHdEQUF3RCxDQUFDO0FBQ2pILE9BQU8sRUFBOEMsVUFBVSxFQUFFLGdCQUFnQixFQUFzQix1QkFBdUIsRUFBMEIsNkJBQTZCLEVBQXVCLGVBQWUsRUFBRSw2QkFBNkIsRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNoVixPQUFPLEVBQTZCLFVBQVUsSUFBSSxjQUFjLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUMzSSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM3SSxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxzQkFBc0IsRUFBc0IsTUFBTSxtREFBbUQsQ0FBQztBQUUvRyxPQUFPLEVBQUUsVUFBVSxJQUFJLDJCQUEyQixFQUFtRyxNQUFNLGdFQUFnRSxDQUFDO0FBQzVOLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDdkYsT0FBTyxF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