/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import Severity from '../../../../base/common/severity.js';
import { EXTENSION_IDENTIFIER_PATTERN } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Extensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EXTENSION_CATEGORIES, ExtensionIdentifierSet } from '../../../../platform/extensions/common/extensions.js';
import { productSchemaId } from '../../../../platform/product/common/productService.js';
import { ImplicitActivationEvents } from '../../../../platform/extensionManagement/common/implicitActivationEvents.js';
import { allApiProposals } from '../../../../platform/extensions/common/extensionsApiProposals.js';
const schemaRegistry = Registry.as(Extensions.JSONContribution);
export class ExtensionMessageCollector {
    constructor(messageHandler, extension, extensionPointId) {
        this._messageHandler = messageHandler;
        this._extension = extension;
        this._extensionPointId = extensionPointId;
    }
    _msg(type, message) {
        this._messageHandler({
            type: type,
            message: message,
            extensionId: this._extension.identifier,
            extensionPointId: this._extensionPointId
        });
    }
    error(message) {
        this._msg(Severity.Error, message);
    }
    warn(message) {
        this._msg(Severity.Warning, message);
    }
    info(message) {
        this._msg(Severity.Info, message);
    }
}
export class ExtensionPointUserDelta {
    static _toSet(arr) {
        const result = new ExtensionIdentifierSet();
        for (let i = 0, len = arr.length; i < len; i++) {
            result.add(arr[i].description.identifier);
        }
        return result;
    }
    static compute(previous, current) {
        if (!previous || !previous.length) {
            return new ExtensionPointUserDelta(current, []);
        }
        if (!current || !current.length) {
            return new ExtensionPointUserDelta([], previous);
        }
        const previousSet = this._toSet(previous);
        const currentSet = this._toSet(current);
        const added = current.filter(user => !previousSet.has(user.description.identifier));
        const removed = previous.filter(user => !currentSet.has(user.description.identifier));
        return new ExtensionPointUserDelta(added, removed);
    }
    constructor(added, removed) {
        this.added = added;
        this.removed = removed;
    }
}
export class ExtensionPoint {
    constructor(name, defaultExtensionKind, canHandleResolver) {
        this.name = name;
        this.defaultExtensionKind = defaultExtensionKind;
        this.canHandleResolver = canHandleResolver;
        this._handler = null;
        this._users = null;
        this._delta = null;
    }
    setHandler(handler) {
        if (this._handler !== null) {
            throw new Error('Handler already set!');
        }
        this._handler = handler;
        this._handle();
        return {
            dispose: () => {
                this._handler = null;
            }
        };
    }
    acceptUsers(users) {
        this._delta = ExtensionPointUserDelta.compute(this._users, users);
        this._users = users;
        this._handle();
    }
    _handle() {
        if (this._handler === null || this._users === null || this._delta === null) {
            return;
        }
        try {
            this._handler(this._users, this._delta);
        }
        catch (err) {
            onUnexpectedError(err);
        }
    }
}
const extensionKindSchema = {
    type: 'string',
    enum: [
        'ui',
        'workspace'
    ],
    enumDescriptions: [
        nls.localize('ui', "UI extension kind. In a remote window, such extensions are enabled only when available on the local machine."),
        nls.localize('workspace', "Workspace extension kind. In a remote window, such extensions are enabled only when available on the remote."),
    ],
};
const schemaId = 'vscode://schemas/vscode-extensions';
export const schema = {
    properties: {
        engines: {
            type: 'object',
            description: nls.localize('vscode.extension.engines', "Engine compatibility."),
            properties: {
                'vscode': {
                    type: 'string',
                    description: nls.localize('vscode.extension.engines.vscode', 'For VS Code extensions, specifies the VS Code version that the extension is compatible with. Cannot be *. For example: ^0.10.5 indicates compatibility with a minimum VS Code version of 0.10.5.'),
                    default: '^1.22.0',
                }
            }
        },
        publisher: {
            description: nls.localize('vscode.extension.publisher', 'The publisher of the VS Code extension.'),
            type: 'string'
        },
        displayName: {
            description: nls.localize('vscode.extension.displayName', 'The display name for the extension used in the VS Code gallery.'),
            type: 'string'
        },
        categories: {
            description: nls.localize('vscode.extension.categories', 'The categories used by the VS Code gallery to categorize the extension.'),
            type: 'array',
            uniqueItems: true,
            items: {
                oneOf: [{
                        type: 'string',
                        enum: EXTENSION_CATEGORIES,
                    },
                    {
                        type: 'string',
                        const: 'Languages',
                        deprecationMessage: nls.localize('vscode.extension.category.languages.deprecated', 'Use \'Programming  Languages\' instead'),
                    }]
            }
        },
        galleryBanner: {
            type: 'object',
            description: nls.localize('vscode.extension.galleryBanner', 'Banner used in the VS Code marketplace.'),
            properties: {
                color: {
                    description: nls.localize('vscode.extension.galleryBanner.color', 'The banner color on the VS Code marketplace page header.'),
                    type: 'string'
                },
                theme: {
                    description: nls.localize('vscode.extension.galleryBanner.theme', 'The color theme for the font used in the banner.'),
                    type: 'string',
                    enum: ['dark', 'light']
                }
            }
        },
        contributes: {
            description: nls.localize('vscode.extension.contributes', 'All contributions of the VS Code extension represented by this package.'),
            type: 'object',
            properties: {
            // extensions will fill in
            },
            default: {}
        },
        preview: {
            type: 'boolean',
            description: nls.localize('vscode.extension.preview', 'Sets the extension to be flagged as a Preview in the Marketplace.'),
        },
        enableProposedApi: {
            type: 'boolean',
            deprecationMessage: nls.localize('vscode.extension.enableProposedApi.deprecated', 'Use `enabledApiProposals` instead.'),
        },
        enabledApiProposals: {
            markdownDescription: nls.localize('vscode.extension.enabledApiProposals', 'Enable API proposals to try them out. Only valid **during development**. Extensions **cannot be published** with this property. For more details visit: https://code.visualstudio.com/api/advanced-topics/using-proposed-api'),
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'string',
                enum: Object.keys(allApiProposals).map(proposalName => proposalName),
                markdownEnumDescriptions: Object.values(allApiProposals).map(value => value.proposal)
            }
        },
        api: {
            markdownDescription: nls.localize('vscode.extension.api', 'Describe the API provided by this extension. For more details visit: https://code.visualstudio.com/api/advanced-topics/remote-extensions#handling-dependencies-with-remote-extensions'),
            type: 'string',
            enum: ['none'],
            enumDescriptions: [
                nls.localize('vscode.extension.api.none', "Give up entirely the ability to export any APIs. This allows other extensions that depend on this extension to run in a separate extension host process or in a remote machine.")
            ]
        },
        activationEvents: {
            description: nls.localize('vscode.extension.activationEvents', 'Activation events for the VS Code extension.'),
            type: 'array',
            items: {
                type: 'string',
                defaultSnippets: [
                    {
                        label: 'onWebviewPanel',
                        description: nls.localize('vscode.extension.activationEvents.onWebviewPanel', 'An activation event emmited when a webview is loaded of a certain viewType'),
                        body: 'onWebviewPanel:viewType'
                    },
                    {
                        label: 'onLanguage',
                        description: nls.localize('vscode.extension.activationEvents.onLanguage', 'An activation event emitted whenever a file that resolves to the specified language gets opened.'),
                        body: 'onLanguage:${1:languageId}'
                    },
                    {
                        label: 'onCommand',
                        description: nls.localize('vscode.extension.activationEvents.onCommand', 'An activation event emitted whenever the specified command gets invoked.'),
                        body: 'onCommand:${2:commandId}'
                    },
                    {
                        label: 'onDebug',
                        description: nls.localize('vscode.extension.activationEvents.onDebug', 'An activation event emitted whenever a user is about to start debugging or about to setup debug configurations.'),
                        body: 'onDebug'
                    },
                    {
                        label: 'onDebugInitialConfigurations',
                        description: nls.localize('vscode.extension.activationEvents.onDebugInitialConfigurations', 'An activation event emitted whenever a "launch.json" needs to be created (and all provideDebugConfigurations methods need to be called).'),
                        body: 'onDebugInitialConfigurations'
                    },
                    {
                        label: 'onDebugDynamicConfigurations',
                        description: nls.localize('vscode.extension.activationEvents.onDebugDynamicConfigurations', 'An activation event emitted whenever a list of all debug configurations needs to be created (and all provideDebugConfigurations methods for the "dynamic" scope need to be called).'),
                        body: 'onDebugDynamicConfigurations'
                    },
                    {
                        label: 'onDebugResolve',
                        description: nls.localize('vscode.extension.activationEvents.onDebugResolve', 'An activation event emitted whenever a debug session with the specific type is about to be launched (and a corresponding resolveDebugConfiguration method needs to be called).'),
                        body: 'onDebugResolve:${6:type}'
                    },
                    {
                        label: 'onDebugAdapterProtocolTracker',
                        description: nls.localize('vscode.extension.activationEvents.onDebugAdapterProtocolTracker', 'An activation event emitted whenever a debug session with the specific type is about to be launched and a debug protocol tracker might be needed.'),
                        body: 'onDebugAdapterProtocolTracker:${6:type}'
                    },
                    {
                        label: 'workspaceContains',
                        description: nls.localize('vscode.extension.activationEvents.workspaceContains', 'An activation event emitted whenever a folder is opened that contains at least a file matching the specified glob pattern.'),
                        body: 'workspaceContains:${4:filePattern}'
                    },
                    {
                        label: 'onStartupFinished',
                        description: nls.localize('vscode.extension.activationEvents.onStartupFinished', 'An activation event emitted after the start-up finished (after all `*` activated extensions have finished activating).'),
                        body: 'onStartupFinished'
                    },
                    {
                        label: 'onTaskType',
                        description: nls.localize('vscode.extension.activationEvents.onTaskType', 'An activation event emitted whenever tasks of a certain type need to be listed or resolved.'),
                        body: 'onTaskType:${1:taskType}'
                    },
                    {
                        label: 'onFileSystem',
                        description: nls.localize('vscode.extension.activationEvents.onFileSystem', 'An activation event emitted whenever a file or folder is accessed with the given scheme.'),
                        body: 'onFileSystem:${1:scheme}'
                    },
                    {
                        label: 'onEditSession',
                        description: nls.localize('vscode.extension.activationEvents.onEditSession', 'An activation event emitted whenever an edit session is accessed with the given scheme.'),
                        body: 'onEditSession:${1:scheme}'
                    },
                    {
                        label: 'onSearch',
                        description: nls.localize('vscode.extension.activationEvents.onSearch', 'An activation event emitted whenever a search is started in the folder with the given scheme.'),
                        body: 'onSearch:${7:scheme}'
                    },
                    {
                        label: 'onView',
                        body: 'onView:${5:viewId}',
                        description: nls.localize('vscode.extension.activationEvents.onView', 'An activation event emitted whenever the specified view is expanded.'),
                    },
                    {
                        label: 'onUri',
                        body: 'onUri',
                        description: nls.localize('vscode.extension.activationEvents.onUri', 'An activation event emitted whenever a system-wide Uri directed towards this extension is open.'),
                    },
                    {
                        label: 'onOpenExternalUri',
                        body: 'onOpenExternalUri',
                        description: nls.localize('vscode.extension.activationEvents.onOpenExternalUri', 'An activation event emitted whenever a external uri (such as an http or https link) is being opened.'),
                    },
                    {
                        label: 'onCustomEditor',
                        body: 'onCustomEditor:${9:viewType}',
                        description: nls.localize('vscode.extension.activationEvents.onCustomEditor', 'An activation event emitted whenever the specified custom editor becomes visible.'),
                    },
                    {
                        label: 'onNotebook',
                        body: 'onNotebook:${1:type}',
                        description: nls.localize('vscode.extension.activationEvents.onNotebook', 'An activation event emitted whenever the specified notebook document is opened.'),
                    },
                    {
                        label: 'onAuthenticationRequest',
                        body: 'onAuthenticationRequest:${11:authenticationProviderId}',
                        description: nls.localize('vscode.extension.activationEvents.onAuthenticationRequest', 'An activation event emitted whenever sessions are requested from the specified authentication provider.')
                    },
                    {
                        label: 'onRenderer',
                        description: nls.localize('vscode.extension.activationEvents.onRenderer', 'An activation event emitted whenever a notebook output renderer is used.'),
                        body: 'onRenderer:${11:rendererId}'
                    },
                    {
                        label: 'onTerminalProfile',
                        body: 'onTerminalProfile:${1:terminalId}',
                        description: nls.localize('vscode.extension.activationEvents.onTerminalProfile', 'An activation event emitted when a specific terminal profile is launched.'),
                    },
                    {
                        label: 'onTerminalQuickFixRequest',
                        body: 'onTerminalQuickFixRequest:${1:quickFixId}',
                        description: nls.localize('vscode.extension.activationEvents.onTerminalQuickFixRequest', 'An activation event emitted when a command matches the selector associated with this ID'),
                    },
                    {
                        label: 'onWalkthrough',
                        body: 'onWalkthrough:${1:walkthroughID}',
                        description: nls.localize('vscode.extension.activationEvents.onWalkthrough', 'An activation event emitted when a specified walkthrough is opened.'),
                    },
                    {
                        label: 'onIssueReporterOpened',
                        body: 'onIssueReporterOpened',
                        description: nls.localize('vscode.extension.activationEvents.onIssueReporterOpened', 'An activation event emitted when the issue reporter is opened.'),
                    },
                    {
                        label: 'onChatParticipant',
                        body: 'onChatParticipant:${1:participantId}',
                        description: nls.localize('vscode.extension.activationEvents.onChatParticipant', 'An activation event emitted when the specified chat participant is invoked.'),
                    },
                    {
                        label: 'onLanguageModelTool',
                        body: 'onLanguageModelTool:${1:toolId}',
                        description: nls.localize('vscode.extension.activationEvents.onLanguageModelTool', 'An activation event emitted when the specified language model tool is invoked.'),
                    },
                    {
                        label: 'onTerminalCompletionsRequested',
                        body: 'onTerminalCompletionsRequested',
                        description: nls.localize('vscode.extension.activationEvents.onTerminalCompletionsRequested', 'An activation event emitted when terminal completions are requested.'),
                    },
                    {
                        label: 'onMcpCollection',
                        description: nls.localize('vscode.extension.activationEvents.onMcpCollection', 'An activation event emitted whenver a tool from the MCP server is requested.'),
                        body: 'onMcpCollection:${2:collectionId}',
                    },
                    {
                        label: '*',
                        description: nls.localize('vscode.extension.activationEvents.star', 'An activation event emitted on VS Code startup. To ensure a great end user experience, please use this activation event in your extension only when no other activation events combination works in your use-case.'),
                        body: '*'
                    }
                ],
            }
        },
        badges: {
            type: 'array',
            description: nls.localize('vscode.extension.badges', 'Array of badges to display in the sidebar of the Marketplace\'s extension page.'),
            items: {
                type: 'object',
                required: ['url', 'href', 'description'],
                properties: {
                    url: {
                        type: 'string',
                        description: nls.localize('vscode.extension.badges.url', 'Badge image URL.')
                    },
                    href: {
                        type: 'string',
                        description: nls.localize('vscode.extension.badges.href', 'Badge link.')
                    },
                    description: {
                        type: 'string',
                        description: nls.localize('vscode.extension.badges.description', 'Badge description.')
                    }
                }
            }
        },
        markdown: {
            type: 'string',
            description: nls.localize('vscode.extension.markdown', "Controls the Markdown rendering engine used in the Marketplace. Either github (default) or standard."),
            enum: ['github', 'standard'],
            default: 'github'
        },
        qna: {
            default: 'marketplace',
            description: nls.localize('vscode.extension.qna', "Controls the Q&A link in the Marketplace. Set to marketplace to enable the default Marketplace Q & A site. Set to a string to provide the URL of a custom Q & A site. Set to false to disable Q & A altogether."),
            anyOf: [
                {
                    type: ['string', 'boolean'],
                    enum: ['marketplace', false]
                },
                {
                    type: 'string'
                }
            ]
        },
        extensionDependencies: {
            description: nls.localize('vscode.extension.extensionDependencies', 'Dependencies to other extensions. The identifier of an extension is always ${publisher}.${name}. For example: vscode.csharp.'),
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN
            }
        },
        extensionPack: {
            description: nls.localize('vscode.extension.contributes.extensionPack', "A set of extensions that can be installed together. The identifier of an extension is always ${publisher}.${name}. For example: vscode.csharp."),
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN
            }
        },
        extensionKind: {
            description: nls.localize('extensionKind', "Define the kind of an extension. `ui` extensions are installed and run on the local machine while `workspace` extensions run on the remote."),
            type: 'array',
            items: extensionKindSchema,
            default: ['workspace'],
            defaultSnippets: [
                {
                    body: ['ui'],
                    description: nls.localize('extensionKind.ui', "Define an extension which can run only on the local machine when connected to remote window.")
                },
                {
                    body: ['workspace'],
                    description: nls.localize('extensionKind.workspace', "Define an extension which can run only on the remote machine when connected remote window.")
                },
                {
                    body: ['ui', 'workspace'],
                    description: nls.localize('extensionKind.ui-workspace', "Define an extension which can run on either side, with a preference towards running on the local machine.")
                },
                {
                    body: ['workspace', 'ui'],
                    description: nls.localize('extensionKind.workspace-ui', "Define an extension which can run on either side, with a preference towards running on the remote machine.")
                },
                {
                    body: [],
                    description: nls.localize('extensionKind.empty', "Define an extension which cannot run in a remote context, neither on the local, nor on the remote machine.")
                }
            ]
        },
        capabilities: {
            description: nls.localize('vscode.extension.capabilities', "Declare the set of supported capabilities by the extension."),
            type: 'object',
            properties: {
                virtualWorkspaces: {
                    description: nls.localize('vscode.extension.capabilities.virtualWorkspaces', "Declares whether the extension should be enabled in virtual workspaces. A virtual workspace is a workspace which is not backed by any on-disk resources. When false, this extension will be automatically disabled in virtual workspaces. Default is true."),
                    type: ['boolean', 'object'],
                    defaultSnippets: [
                        { label: 'limited', body: { supported: '${1:limited}', description: '${2}' } },
                        { label: 'false', body: { supported: false, description: '${2}' } },
                    ],
                    default: true.valueOf,
                    properties: {
                        supported: {
                            markdownDescription: nls.localize('vscode.extension.capabilities.virtualWorkspaces.supported', "Declares the level of support for virtual workspaces by the extension."),
                            type: ['string', 'boolean'],
                            enum: ['limited', true, false],
                            enumDescriptions: [
                                nls.localize('vscode.extension.capabilities.virtualWorkspaces.supported.limited', "The extension will be enabled in virtual workspaces with some functionality disabled."),
                                nls.localize('vscode.extension.capabilities.virtualWorkspaces.supported.true', "The extension will be enabled in virtual workspaces with all functionality enabled."),
                                nls.localize('vscode.extension.capabilities.virtualWorkspaces.supported.false', "The extension will not be enabled in virtual workspaces."),
                            ]
                        },
                        description: {
                            type: 'string',
                            markdownDescription: nls.localize('vscode.extension.capabilities.virtualWorkspaces.description', "A description of how virtual workspaces affects the extensions behavior and why it is needed. This only applies when `supported` is not `true`."),
                        }
                    }
                },
                untrustedWorkspaces: {
                    description: nls.localize('vscode.extension.capabilities.untrustedWorkspaces', 'Declares how the extension should be handled in untrusted workspaces.'),
                    type: 'object',
                    required: ['supported'],
                    defaultSnippets: [
                        { body: { supported: '${1:limited}', description: '${2}' } },
                    ],
                    properties: {
                        supported: {
                            markdownDescription: nls.localize('vscode.extension.capabilities.untrustedWorkspaces.supported', "Declares the level of support for untrusted workspaces by the extension."),
                            type: ['string', 'boolean'],
                            enum: ['limited', true, false],
                            enumDescriptions: [
                                nls.localize('vscode.extension.capabilities.untrustedWorkspaces.supported.limited', "The extension will be enabled in untrusted workspaces with some functionality disabled."),
                                nls.localize('vscode.extension.capabilities.untrustedWorkspaces.supported.true', "The extension will be enabled in untrusted workspaces with all functionality enabled."),
                                nls.localize('vscode.extension.capabilities.untrustedWorkspaces.supported.false', "The extension will not be enabled in untrusted workspaces."),
                            ]
                        },
                        restrictedConfigurations: {
                            description: nls.localize('vscode.extension.capabilities.untrustedWorkspaces.restrictedConfigurations', "A list of configuration keys contributed by the extension that should not use workspace values in untrusted workspaces."),
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        },
                        description: {
                            type: 'string',
                            markdownDescription: nls.localize('vscode.extension.capabilities.untrustedWorkspaces.description', "A description of how workspace trust affects the extensions behavior and why it is needed. This only applies when `supported` is not `true`."),
                        }
                    }
                }
            }
        },
        sponsor: {
            description: nls.localize('vscode.extension.contributes.sponsor', "Specify the location from where users can sponsor your extension."),
            type: 'object',
            defaultSnippets: [
                { body: { url: '${1:https:}' } },
            ],
            properties: {
                'url': {
                    description: nls.localize('vscode.extension.contributes.sponsor.url', "URL from where users can sponsor your extension. It must be a valid URL with a HTTP or HTTPS protocol. Example value: https://github.com/sponsors/nvaccess"),
                    type: 'string',
                }
            }
        },
        scripts: {
            type: 'object',
            properties: {
                'vscode:prepublish': {
                    description: nls.localize('vscode.extension.scripts.prepublish', 'Script executed before the package is published as a VS Code extension.'),
                    type: 'string'
                },
                'vscode:uninstall': {
                    description: nls.localize('vscode.extension.scripts.uninstall', 'Uninstall hook for VS Code extension. Script that gets executed when the extension is completely uninstalled from VS Code which is when VS Code is restarted (shutdown and start) after the extension is uninstalled. Only Node scripts are supported.'),
                    type: 'string'
                }
            }
        },
        icon: {
            type: 'string',
            description: nls.localize('vscode.extension.icon', 'The path to a 128x128 pixel icon.')
        },
        l10n: {
            type: 'string',
            description: nls.localize({
                key: 'vscode.extension.l10n',
                comment: [
                    '{Locked="bundle.l10n._locale_.json"}',
                    '{Locked="vscode.l10n API"}'
                ]
            }, 'The relative path to a folder containing localization (bundle.l10n.*.json) files. Must be specified if you are using the vscode.l10n API.')
        },
        pricing: {
            type: 'string',
            markdownDescription: nls.localize('vscode.extension.pricing', 'The pricing information for the extension. Can be Free (default) or Trial. For more details visit: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#extension-pricing-label'),
            enum: ['Free', 'Trial'],
            default: 'Free'
        }
    }
};
export class ExtensionsRegistryImpl {
    constructor() {
        this._extensionPoints = new Map();
    }
    registerExtensionPoint(desc) {
        if (this._extensionPoints.has(desc.extensionPoint)) {
            throw new Error('Duplicate extension point: ' + desc.extensionPoint);
        }
        const result = new ExtensionPoint(desc.extensionPoint, desc.defaultExtensionKind, desc.canHandleResolver);
        this._extensionPoints.set(desc.extensionPoint, result);
        if (desc.activationEventsGenerator) {
            ImplicitActivationEvents.register(desc.extensionPoint, desc.activationEventsGenerator);
        }
        schema.properties['contributes'].properties[desc.extensionPoint] = desc.jsonSchema;
        schemaRegistry.registerSchema(schemaId, schema);
        return result;
    }
    getExtensionPoints() {
        return Array.from(this._extensionPoints.values());
    }
}
const PRExtensions = {
    ExtensionsRegistry: 'ExtensionsRegistry'
};
Registry.add(PRExtensions.ExtensionsRegistry, new ExtensionsRegistryImpl());
export const ExtensionsRegistry = Registry.as(PRExtensions.ExtensionsRegistry);
schemaRegistry.registerSchema(schemaId, schema);
schemaRegistry.registerSchema(productSchemaId, {
    properties: {
        extensionEnabledApiProposals: {
            description: nls.localize('product.extensionEnabledApiProposals', "API proposals that the respective extensions can freely use."),
            type: 'object',
            properties: {},
            additionalProperties: {
                anyOf: [{
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            type: 'string',
                            enum: Object.keys(allApiProposals),
                            markdownEnumDescriptions: Object.values(allApiProposals).map(value => value.proposal)
                        }
                    }]
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1JlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUN0SCxPQUFPLEVBQUUsVUFBVSxFQUE2QixNQUFNLHFFQUFxRSxDQUFDO0FBQzVILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxPQUFPLEVBQXlCLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFM0ksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBOEIsTUFBTSw2RUFBNkUsQ0FBQztBQUVuSixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFbkcsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBNEIsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFM0YsTUFBTSxPQUFPLHlCQUF5QjtJQU1yQyxZQUNDLGNBQXVDLEVBQ3ZDLFNBQWdDLEVBQ2hDLGdCQUF3QjtRQUV4QixJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUN0QyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUM1QixJQUFJLENBQUMsaUJB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