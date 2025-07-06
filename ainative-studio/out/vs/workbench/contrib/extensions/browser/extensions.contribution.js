/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MenuRegistry, MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ExtensionsLocalizedLabel, IExtensionManagementService, IExtensionGalleryService, PreferencesLocalizedLabel, EXTENSION_INSTALL_SOURCE_CONTEXT, UseUnpkgResourceApiConfigKey, AllowedExtensionsConfigKey } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService, IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { VIEWLET_ID, IExtensionsWorkbenchService, TOGGLE_IGNORE_EXTENSION_ACTION_ID, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, WORKSPACE_RECOMMENDATIONS_VIEW_ID, AutoUpdateConfigurationKey, HasOutdatedExtensionsContext, SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID, LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID, THEME_ACTIONS_GROUP, INSTALL_ACTIONS_GROUP, OUTDATED_EXTENSIONS_VIEW_ID, CONTEXT_HAS_GALLERY, extensionsSearchActionsMenu, UPDATE_ACTIONS_GROUP, EXTENSIONS_CATEGORY, AutoRestartConfigurationKey } from '../common/extensions.js';
import { InstallSpecificVersionOfExtensionAction, ConfigureWorkspaceRecommendedExtensionsAction, ConfigureWorkspaceFolderRecommendedExtensionsAction, SetColorThemeAction, SetFileIconThemeAction, SetProductIconThemeAction, ClearLanguageAction, ToggleAutoUpdateForExtensionAction, ToggleAutoUpdatesForPublisherAction, TogglePreReleaseExtensionAction, InstallAnotherVersionAction, InstallAction } from './extensionsActions.js';
import { ExtensionsInput } from '../common/extensionsInput.js';
import { ExtensionEditor } from './extensionEditor.js';
import { StatusUpdater, MaliciousExtensionChecker, ExtensionsViewletViewsContribution, ExtensionsViewPaneContainer, BuiltInExtensionsContext, SearchMarketplaceExtensionsContext, RecommendedExtensionsContext, DefaultViewsContext, ExtensionsSortByContext, SearchHasTextContext, ExtensionsSearchValueContext } from './extensionsViewlet.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import * as jsonContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ExtensionsConfigurationSchema, ExtensionsConfigurationSchemaId } from '../common/extensionsFileTemplate.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { KeymapExtensions } from '../common/extensionsUtils.js';
import { areSameExtensions, getIdAndVersion } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { URI } from '../../../../base/common/uri.js';
import { ExtensionActivationProgress } from './extensionsActivationProgress.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { ExtensionDependencyChecker } from './extensionsDependencyChecker.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Extensions as ViewContainerExtensions } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { InstallExtensionQuickAccessProvider, ManageExtensionsQuickAccessProvider } from './extensionsQuickAccess.js';
import { ExtensionRecommendationsService } from './extensionRecommendationsService.js';
import { CONTEXT_SYNC_ENABLEMENT } from '../../../services/userDataSync/common/userDataSync.js';
import { CopyAction, CutAction, PasteAction } from '../../../../editor/contrib/clipboard/browser/clipboard.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ExtensionsWorkbenchService } from './extensionsWorkbenchService.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IExtensionRecommendationNotificationService } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { ExtensionRecommendationNotificationService } from './extensionRecommendationNotificationService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ResourceContextKey, WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IWorkspaceExtensionsConfigService } from '../../../services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import { Schemas } from '../../../../base/common/network.js';
import { ShowRuntimeExtensionsAction } from './abstractRuntimeExtensionsEditor.js';
import { ExtensionEnablementWorkspaceTrustTransitionParticipant } from './extensionEnablementWorkspaceTrustTransitionParticipant.js';
import { clearSearchResultsIcon, configureRecommendedIcon, extensionsViewIcon, filterIcon, installWorkspaceRecommendedIcon, refreshIcon } from './extensionsIcons.js';
import { EXTENSION_CATEGORIES } from '../../../../platform/extensions/common/extensions.js';
import { Disposable, DisposableStore, isDisposable } from '../../../../base/common/lifecycle.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { Query } from '../common/extensionQuery.js';
import { EditorExtensions } from '../../../common/editor.js';
import { WORKSPACE_TRUST_EXTENSION_SUPPORT } from '../../../services/workspaces/common/workspaceTrust.js';
import { ExtensionsCompletionItemsProvider } from './extensionsCompletionItemsProvider.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Event } from '../../../../base/common/event.js';
import { UnsupportedExtensionsMigrationContrib } from './unsupportedExtensionsMigrationContribution.js';
import { isNative, isWeb } from '../../../../base/common/platform.js';
import { ExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { CONTEXT_KEYBINDINGS_EDITOR } from '../../preferences/common/preferences.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Extensions as ConfigurationMigrationExtensions } from '../../../common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import product from '../../../../platform/product/common/product.js';
import { ExtensionGalleryServiceUrlConfigKey, getExtensionGalleryManifestResourceUri, IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
// Singletons
registerSingleton(IExtensionsWorkbenchService, ExtensionsWorkbenchService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtensionRecommendationNotificationService, ExtensionRecommendationNotificationService, 1 /* InstantiationType.Delayed */);
registerSingleton(IExtensionRecommendationsService, ExtensionRecommendationsService, 0 /* InstantiationType.Eager */);
// Quick Access
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: ManageExtensionsQuickAccessProvider,
    prefix: ManageExtensionsQuickAccessProvider.PREFIX,
    placeholder: localize('manageExtensionsQuickAccessPlaceholder', "Press Enter to manage extensions."),
    helpEntries: [{ description: localize('manageExtensionsHelp', "Manage Extensions") }]
});
// Editor
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ExtensionEditor, ExtensionEditor.ID, localize('extension', "Extension")), [
    new SyncDescriptor(ExtensionsInput)
]);
Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: localize2('extensions', "Extensions"),
    openCommandActionDescriptor: {
        id: VIEWLET_ID,
        mnemonicTitle: localize({ key: 'miViewExtensions', comment: ['&& denotes a mnemonic'] }, "E&&xtensions"),
        keybindings: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 54 /* KeyCode.KeyX */ },
        order: 4,
    },
    ctorDescriptor: new SyncDescriptor(ExtensionsViewPaneContainer),
    icon: extensionsViewIcon,
    order: 4,
    rejectAddedViews: true,
    alwaysUseContainerInfo: true,
}, 0 /* ViewContainerLocation.Sidebar */);
Registry.as(ConfigurationExtensions.Configuration)
    .registerConfiguration({
    id: 'extensions',
    order: 30,
    title: localize('extensionsConfigurationTitle', "Extensions"),
    type: 'object',
    properties: {
        'extensions.autoUpdate': {
            enum: [true, 'onlyEnabledExtensions', false,],
            enumItemLabels: [
                localize('all', "All Extensions"),
                localize('enabled', "Only Enabled Extensions"),
                localize('none', "None"),
            ],
            enumDescriptions: [
                localize('extensions.autoUpdate.true', 'Download and install updates automatically for all extensions.'),
                localize('extensions.autoUpdate.enabled', 'Download and install updates automatically only for enabled extensions.'),
                localize('extensions.autoUpdate.false', 'Extensions are not automatically updated.'),
            ],
            description: localize('extensions.autoUpdate', "Controls the automatic update behavior of extensions. The updates are fetched from a Microsoft online service."),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices']
        },
        'extensions.autoCheckUpdates': {
            type: 'boolean',
            description: localize('extensionsCheckUpdates', "When enabled, automatically checks extensions for updates. If an extension has an update, it is marked as outdated in the Extensions view. The updates are fetched from a Microsoft online service."),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices']
        },
        'extensions.ignoreRecommendations': {
            type: 'boolean',
            description: localize('extensionsIgnoreRecommendations', "When enabled, the notifications for extension recommendations will not be shown."),
            default: false
        },
        'extensions.showRecommendationsOnlyOnDemand': {
            type: 'boolean',
            deprecationMessage: localize('extensionsShowRecommendationsOnlyOnDemand_Deprecated', "This setting is deprecated. Use extensions.ignoreRecommendations setting to control recommendation notifications. Use Extensions view's visibility actions to hide Recommended view by default."),
            default: false,
            tags: ['usesOnlineServices']
        },
        'extensions.closeExtensionDetailsOnViewChange': {
            type: 'boolean',
            description: localize('extensionsCloseExtensionDetailsOnViewChange', "When enabled, editors with extension details will be automatically closed upon navigating away from the Extensions View."),
            default: false
        },
        'extensions.confirmedUriHandlerExtensionIds': {
            type: 'array',
            items: {
                type: 'string'
            },
            description: localize('handleUriConfirmedExtensions', "When an extension is listed here, a confirmation prompt will not be shown when that extension handles a URI."),
            default: [],
            scope: 1 /* ConfigurationScope.APPLICATION */
        },
        'extensions.webWorker': {
            type: ['boolean', 'string'],
            enum: [true, false, 'auto'],
            enumDescriptions: [
                localize('extensionsWebWorker.true', "The Web Worker Extension Host will always be launched."),
                localize('extensionsWebWorker.false', "The Web Worker Extension Host will never be launched."),
                localize('extensionsWebWorker.auto', "The Web Worker Extension Host will be launched when a web extension needs it."),
            ],
            description: localize('extensionsWebWorker', "Enable web worker extension host."),
            default: 'auto'
        },
        'extensions.supportVirtualWorkspaces': {
            type: 'object',
            markdownDescription: localize('extensions.supportVirtualWorkspaces', "Override the virtual workspaces support of an extension."),
            patternProperties: {
                '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    type: 'boolean',
                    default: false
                }
            },
            additionalProperties: false,
            default: {},
            defaultSnippets: [{
                    'body': {
                        'pub.name': false
                    }
                }]
        },
        'extensions.experimental.affinity': {
            type: 'object',
            markdownDescription: localize('extensions.affinity', "Configure an extension to execute in a different extension host process."),
            patternProperties: {
                '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    type: 'integer',
                    default: 1
                }
            },
            additionalProperties: false,
            default: {},
            defaultSnippets: [{
                    'body': {
                        'pub.name': 1
                    }
                }]
        },
        [WORKSPACE_TRUST_EXTENSION_SUPPORT]: {
            type: 'object',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: localize('extensions.supportUntrustedWorkspaces', "Override the untrusted workspace support of an extension. Extensions using `true` will always be enabled. Extensions using `limited` will always be enabled, and the extension will hide functionality that requires trust. Extensions using `false` will only be enabled only when the workspace is trusted."),
            patternProperties: {
                '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    type: 'object',
                    properties: {
                        'supported': {
                            type: ['boolean', 'string'],
                            enum: [true, false, 'limited'],
                            enumDescriptions: [
                                localize('extensions.supportUntrustedWorkspaces.true', "Extension will always be enabled."),
                                localize('extensions.supportUntrustedWorkspaces.false', "Extension will only be enabled only when the workspace is trusted."),
                                localize('extensions.supportUntrustedWorkspaces.limited', "Extension will always be enabled, and the extension will hide functionality requiring trust."),
                            ],
                            description: localize('extensions.supportUntrustedWorkspaces.supported', "Defines the untrusted workspace support setting for the extension."),
                        },
                        'version': {
                            type: 'string',
                            description: localize('extensions.supportUntrustedWorkspaces.version', "Defines the version of the extension for which the override should be applied. If not specified, the override will be applied independent of the extension version."),
                        }
                    }
                }
            }
        },
        'extensions.experimental.deferredStartupFinishedActivation': {
            type: 'boolean',
            description: localize('extensionsDeferredStartupFinishedActivation', "When enabled, extensions which declare the `onStartupFinished` activation event will be activated after a timeout."),
            default: false
        },
        'extensions.experimental.issueQuickAccess': {
            type: 'boolean',
            description: localize('extensionsInQuickAccess', "When enabled, extensions can be searched for via Quick Access and report issues from there."),
            default: true
        },
        'extensions.verifySignature': {
            type: 'boolean',
            description: localize('extensions.verifySignature', "When enabled, extensions are verified to be signed before getting installed."),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            included: isNative
        },
        [AutoRestartConfigurationKey]: {
            type: 'boolean',
            description: localize('autoRestart', "If activated, extensions will automatically restart following an update if the window is not in focus. There can be a data loss if you have open Notebooks or Custom Editors."),
            default: false,
            included: product.quality !== 'stable'
        },
        [UseUnpkgResourceApiConfigKey]: {
            type: 'boolean',
            description: localize('extensions.gallery.useUnpkgResourceApi', "When enabled, extensions to update are fetched from Unpkg service."),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['onExp', 'usesOnlineServices']
        },
        [ExtensionGalleryServiceUrlConfigKey]: {
            type: 'string',
            description: localize('extensions.gallery.serviceUrl', "Configure the Marketplace service URL to connect to"),
            default: '',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices'],
            included: false,
            policy: {
                name: 'ExtensionGalleryServiceUrl',
                minimumVersion: '1.99',
            },
        },
        [AllowedExtensionsConfigKey]: {
            // Note: Type is set only to object because to support policies generation during build time, where single type is expected.
            type: 'object',
            markdownDescription: localize('extensions.allowed', "Specify a list of extensions that are allowed to use. This helps maintain a secure and consistent development environment by restricting the use of unauthorized extensions. For more information on how to configure this setting, please visit the [Configure Allowed Extensions](https://code.visualstudio.com/docs/setup/enterprise#_configure-allowed-extensions) section."),
            default: '*',
            defaultSnippets: [{
                    body: {},
                    description: localize('extensions.allowed.none', "No extensions are allowed."),
                }, {
                    body: {
                        '*': true
                    },
                    description: localize('extensions.allowed.all', "All extensions are allowed."),
                }],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            policy: {
                name: 'AllowedExtensions',
                minimumVersion: '1.96',
                description: localize('extensions.allowed.policy', "Specify a list of extensions that are allowed to use. This helps maintain a secure and consistent development environment by restricting the use of unauthorized extensions. More information: https://code.visualstudio.com/docs/setup/enterprise#_configure-allowed-extensions"),
            },
            additionalProperties: false,
            patternProperties: {
                '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    anyOf: [
                        {
                            type: ['boolean', 'string'],
                            enum: [true, false, 'stable'],
                            description: localize('extensions.allow.description', "Allow or disallow the extension."),
                            enumDescriptions: [
                                localize('extensions.allowed.enable.desc', "Extension is allowed."),
                                localize('extensions.allowed.disable.desc', "Extension is not allowed."),
                                localize('extensions.allowed.disable.stable.desc', "Allow only stable versions of the extension."),
                            ],
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: localize('extensions.allow.version.description', "Allow or disallow specific versions of the extension. To specifcy a platform specific version, use the format `platform@1.2.3`, e.g. `win32-x64@1.2.3`. Supported platforms are `win32-x64`, `win32-arm64`, `linux-x64`, `linux-arm64`, `linux-armhf`, `alpine-x64`, `alpine-arm64`, `darwin-x64`, `darwin-arm64`"),
                        },
                    ]
                },
                '([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    type: ['boolean', 'string'],
                    enum: [true, false, 'stable'],
                    description: localize('extension.publisher.allow.description', "Allow or disallow all extensions from the publisher."),
                    enumDescriptions: [
                        localize('extensions.publisher.allowed.enable.desc', "All extensions from the publisher are allowed."),
                        localize('extensions.publisher.allowed.disable.desc', "All extensions from the publisher are not allowed."),
                        localize('extensions.publisher.allowed.disable.stable.desc', "Allow only stable versions of the extensions from the publisher."),
                    ],
                },
                '\\*': {
                    type: 'boolean',
                    enum: [true, false],
                    description: localize('extensions.allow.all.description', "Allow or disallow all extensions."),
                    enumDescriptions: [
                        localize('extensions.allow.all.enable', "Allow all extensions."),
                        localize('extensions.allow.all.disable', "Disallow all extensions.")
                    ],
                }
            }
        }
    }
});
const jsonRegistry = Registry.as(jsonContributionRegistry.Extensions.JSONContribution);
jsonRegistry.registerSchema(ExtensionsConfigurationSchemaId, ExtensionsConfigurationSchema);
// Register Commands
CommandsRegistry.registerCommand('_extensions.manage', (accessor, extensionId, tab, preserveFocus, feature) => {
    const extensionService = accessor.get(IExtensionsWorkbenchService);
    const extension = extensionService.local.find(e => areSameExtensions(e.identifier, { id: extensionId }));
    if (extension) {
        extensionService.open(extension, { tab, preserveFocus, feature });
    }
    else {
        throw new Error(localize('notFound', "Extension '{0}' not found.", extensionId));
    }
});
CommandsRegistry.registerCommand('extension.open', async (accessor, extensionId, tab, preserveFocus, feature, sideByside) => {
    const extensionService = accessor.get(IExtensionsWorkbenchService);
    const commandService = accessor.get(ICommandService);
    const [extension] = await extensionService.getExtensions([{ id: extensionId }], CancellationToken.None);
    if (extension) {
        return extensionService.open(extension, { tab, preserveFocus, feature, sideByside });
    }
    return commandService.executeCommand('_extensions.manage', extensionId, tab, preserveFocus, feature);
});
CommandsRegistry.registerCommand({
    id: 'workbench.extensions.installExtension',
    metadata: {
        description: localize('workbench.extensions.installExtension.description', "Install the given extension"),
        args: [
            {
                name: 'extensionIdOrVSIXUri',
                description: localize('workbench.extensions.installExtension.arg.decription', "Extension id or VSIX resource uri"),
                constraint: (value) => typeof value === 'string' || value instanceof URI,
            },
            {
                name: 'options',
                description: '(optional) Options for installing the extension. Object with the following properties: ' +
                    '`installOnlyNewlyAddedFromExtensionPackVSIX`: When enabled, VS Code installs only newly added extensions from the extension pack VSIX. This option is considered only when installing VSIX. ',
                isOptional: true,
                schema: {
                    'type': 'object',
                    'properties': {
                        'installOnlyNewlyAddedFromExtensionPackVSIX': {
                            'type': 'boolean',
                            'description': localize('workbench.extensions.installExtension.option.installOnlyNewlyAddedFromExtensionPackVSIX', "When enabled, VS Code installs only newly added extensions from the extension pack VSIX. This option is considered only while installing a VSIX."),
                            default: false
                        },
                        'installPreReleaseVersion': {
                            'type': 'boolean',
                            'description': localize('workbench.extensions.installExtension.option.installPreReleaseVersion', "When enabled, VS Code installs the pre-release version of the extension if available."),
                            default: false
                        },
                        'donotSync': {
                            'type': 'boolean',
                            'description': localize('workbench.extensions.installExtension.option.donotSync', "When enabled, VS Code do not sync this extension when Settings Sync is on."),
                            default: false
                        },
                        'justification': {
                            'type': ['string', 'object'],
                            'description': localize('workbench.extensions.installExtension.option.justification', "Justification for installing the extension. This is a string or an object that can be used to pass any information to the installation handlers. i.e. `{reason: 'This extension wants to open a URI', action: 'Open URI'}` will show a message box with the reason and action upon install."),
                        },
                        'enable': {
                            'type': 'boolean',
                            'description': localize('workbench.extensions.installExtension.option.enable', "When enabled, the extension will be enabled if it is installed but disabled. If the extension is already enabled, this has no effect."),
                            default: false
                        },
                        'context': {
                            'type': 'object',
                            'description': localize('workbench.extensions.installExtension.option.context', "Context for the installation. This is a JSON object that can be used to pass any information to the installation handlers. i.e. `{skipWalkthrough: true}` will skip opening the walkthrough upon install."),
                        }
                    }
                }
            }
        ]
    },
    handler: async (accessor, arg, options) => {
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
        const extensionGalleryService = accessor.get(IExtensionGalleryService);
        try {
            if (typeof arg === 'string') {
                const [id, version] = getIdAndVersion(arg);
                const extension = extensionsWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id, uuid: version }));
                if (extension?.enablementState === 1 /* EnablementState.DisabledByExtensionKind */) {
                    const [gallery] = await extensionGalleryService.getExtensions([{ id, preRelease: options?.installPreReleaseVersion }], CancellationToken.None);
                    if (!gallery) {
                        throw new Error(localize('notFound', "Extension '{0}' not found.", arg));
                    }
                    await extensionManagementService.installFromGallery(gallery, {
                        isMachineScoped: options?.donotSync ? true : undefined, /* do not allow syncing extensions automatically while installing through the command */
                        installPreReleaseVersion: options?.installPreReleaseVersion,
                        installGivenVersion: !!version,
                        context: { ...options?.context, [EXTENSION_INSTALL_SOURCE_CONTEXT]: "command" /* ExtensionInstallSource.COMMAND */ },
                    });
                }
                else {
                    await extensionsWorkbenchService.install(arg, {
                        version,
                        installPreReleaseVersion: options?.installPreReleaseVersion,
                        context: { ...options?.context, [EXTENSION_INSTALL_SOURCE_CONTEXT]: "command" /* ExtensionInstallSource.COMMAND */ },
                        justification: options?.justification,
                        enable: options?.enable,
                        isMachineScoped: options?.donotSync ? true : undefined, /* do not allow syncing extensions automatically while installing through the command */
                    }, 15 /* ProgressLocation.Notification */);
                }
            }
            else {
                const vsix = URI.revive(arg);
                await extensionsWorkbenchService.install(vsix, { installGivenVersion: true });
            }
        }
        catch (e) {
            onUnexpectedError(e);
            throw e;
        }
    }
});
CommandsRegistry.registerCommand({
    id: 'workbench.extensions.uninstallExtension',
    metadata: {
        description: localize('workbench.extensions.uninstallExtension.description', "Uninstall the given extension"),
        args: [
            {
                name: localize('workbench.extensions.uninstallExtension.arg.name', "Id of the extension to uninstall"),
                schema: {
                    'type': 'string'
                }
            }
        ]
    },
    handler: async (accessor, id) => {
        if (!id) {
            throw new Error(localize('id required', "Extension id required."));
        }
        const extensionManagementService = accessor.get(IExtensionManagementService);
        const installed = await extensionManagementService.getInstalled();
        const [extensionToUninstall] = installed.filter(e => areSameExtensions(e.identifier, { id }));
        if (!extensionToUninstall) {
            throw new Error(localize('notInstalled', "Extension '{0}' is not installed. Make sure you use the full extension ID, including the publisher, e.g.: ms-dotnettools.csharp.", id));
        }
        if (extensionToUninstall.isBuiltin) {
            throw new Error(localize('builtin', "Extension '{0}' is a Built-in extension and cannot be installed", id));
        }
        try {
            await extensionManagementService.uninstall(extensionToUninstall);
        }
        catch (e) {
            onUnexpectedError(e);
            throw e;
        }
    }
});
CommandsRegistry.registerCommand({
    id: 'workbench.extensions.search',
    metadata: {
        description: localize('workbench.extensions.search.description', "Search for a specific extension"),
        args: [
            {
                name: localize('workbench.extensions.search.arg.name', "Query to use in search"),
                schema: { 'type': 'string' }
            }
        ]
    },
    handler: async (accessor, query = '') => {
        return accessor.get(IExtensionsWorkbenchService).openSearch(query);
    }
});
function overrideActionForActiveExtensionEditorWebview(command, f) {
    command?.addImplementation(105, 'extensions-editor', (accessor) => {
        const editorService = accessor.get(IEditorService);
        const editor = editorService.activeEditorPane;
        if (editor instanceof ExtensionEditor) {
            if (editor.activeWebview?.isFocused) {
                f(editor.activeWebview);
                return true;
            }
        }
        return false;
    });
}
overrideActionForActiveExtensionEditorWebview(CopyAction, webview => webview.copy());
overrideActionForActiveExtensionEditorWebview(CutAction, webview => webview.cut());
overrideActionForActiveExtensionEditorWebview(PasteAction, webview => webview.paste());
// Contexts
export const CONTEXT_HAS_LOCAL_SERVER = new RawContextKey('hasLocalServer', false);
export const CONTEXT_HAS_REMOTE_SERVER = new RawContextKey('hasRemoteServer', false);
export const CONTEXT_HAS_WEB_SERVER = new RawContextKey('hasWebServer', false);
const CONTEXT_GALLERY_SORT_CAPABILITIES = new RawContextKey('gallerySortCapabilities', '');
const CONTEXT_GALLERY_FILTER_CAPABILITIES = new RawContextKey('galleryFilterCapabilities', '');
const CONTEXT_GALLERY_ALL_REPOSITORY_SIGNED = new RawContextKey('galleryAllRepositorySigned', false);
const CONTEXT_GALLERY_HAS_EXTENSION_LINK = new RawContextKey('galleryHasExtensionLink', false);
async function runAction(action) {
    try {
        await action.run();
    }
    finally {
        if (isDisposable(action)) {
            action.dispose();
        }
    }
}
let ExtensionsContributions = class ExtensionsContributions extends Disposable {
    constructor(extensionManagementServerService, extensionGalleryService, extensionGalleryManifestService, contextKeyService, viewsService, extensionsWorkbenchService, extensionEnablementService, instantiationService, dialogService, commandService, productService) {
        super();
        this.extensionManagementServerService = extensionManagementServerService;
        this.contextKeyService = contextKeyService;
        this.viewsService = viewsService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.productService = productService;
        const hasGalleryContext = CONTEXT_HAS_GALLERY.bindTo(contextKeyService);
        if (extensionGalleryService.isEnabled()) {
            hasGalleryContext.set(true);
        }
        const hasLocalServerContext = CONTEXT_HAS_LOCAL_SERVER.bindTo(contextKeyService);
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            hasLocalServerContext.set(true);
        }
        const hasRemoteServerContext = CONTEXT_HAS_REMOTE_SERVER.bindTo(contextKeyService);
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            hasRemoteServerContext.set(true);
        }
        const hasWebServerContext = CONTEXT_HAS_WEB_SERVER.bindTo(contextKeyService);
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            hasWebServerContext.set(true);
        }
        extensionGalleryManifestService.getExtensionGalleryManifest()
            .then(extensionGalleryManifest => {
            this.registerGalleryCapabilitiesContexts(extensionGalleryManifest);
            this._register(extensionGalleryManifestService.onDidChangeExtensionGalleryManifest(extensionGalleryManifest => this.registerGalleryCapabilitiesContexts(extensionGalleryManifest)));
        });
        this.registerGlobalActions();
        this.registerContextMenuActions();
        this.registerQuickAccessProvider();
    }
    async registerGalleryCapabilitiesContexts(extensionGalleryManifest) {
        CONTEXT_GALLERY_SORT_CAPABILITIES.bindTo(this.contextKeyService).set(`_${extensionGalleryManifest?.capabilities.extensionQuery.sorting?.map(s => s.name)?.join('_')}_UpdateDate_`);
        CONTEXT_GALLERY_FILTER_CAPABILITIES.bindTo(this.contextKeyService).set(`_${extensionGalleryManifest?.capabilities.extensionQuery.filtering?.map(s => s.name)?.join('_')}_`);
        CONTEXT_GALLERY_ALL_REPOSITORY_SIGNED.bindTo(this.contextKeyService).set(!!extensionGalleryManifest?.capabilities?.signing?.allRepositorySigned);
        CONTEXT_GALLERY_HAS_EXTENSION_LINK.bindTo(this.contextKeyService).set(!!(extensionGalleryManifest && getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionDetailsViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionDetailsViewUri */)));
    }
    registerQuickAccessProvider() {
        if (this.extensionManagementServerService.localExtensionManagementServer
            || this.extensionManagementServerService.remoteExtensionManagementServer
            || this.extensionManagementServerService.webExtensionManagementServer) {
            Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
                ctor: InstallExtensionQuickAccessProvider,
                prefix: InstallExtensionQuickAccessProvider.PREFIX,
                placeholder: localize('installExtensionQuickAccessPlaceholder', "Type the name of an extension to install or search."),
                helpEntries: [{ description: localize('installExtensionQuickAccessHelp', "Install or Search Extensions") }]
            });
        }
    }
    // Global actions
    registerGlobalActions() {
        this._register(MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
            command: {
                id: VIEWLET_ID,
                title: localize({ key: 'miPreferencesExtensions', comment: ['&& denotes a mnemonic'] }, "&&Extensions")
            },
            group: '2_configuration',
            order: 3
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            command: {
                id: VIEWLET_ID,
                title: localize('showExtensions', "Extensions")
            },
            group: '2_configuration',
            order: 3
        }));
        this.registerExtensionAction({
            id: 'workbench.extensions.action.focusExtensionsView',
            title: localize2('focusExtensions', 'Focus on Extensions View'),
            category: ExtensionsLocalizedLabel,
            f1: true,
            run: async (accessor) => {
                await accessor.get(IExtensionsWorkbenchService).openSearch('');
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installExtensions',
            title: localize2('installExtensions', 'Install Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
            },
            run: async (accessor) => {
                accessor.get(IViewsService).openViewContainer(VIEWLET_ID, true);
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showRecommendedKeymapExtensions',
            title: localize2('showRecommendedKeymapExtensionsShort', 'Keymaps'),
            category: PreferencesLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CONTEXT_HAS_GALLERY
                }, {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_HAS_GALLERY),
                    group: '2_keyboard_discover_actions'
                }],
            menuTitles: {
                [MenuId.EditorTitle.id]: localize('importKeyboardShortcutsFroms', "Migrate Keyboard Shortcuts from...")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@recommended:keymaps ')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showLanguageExtensions',
            title: localize2('showLanguageExtensionsShort', 'Language Extensions'),
            category: PreferencesLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: CONTEXT_HAS_GALLERY
            },
            run: () => this.extensionsWorkbenchService.openSearch('@recommended:languages ')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.checkForUpdates',
            title: localize2('checkForUpdates', 'Check for Extension Updates'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
                }, {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_HAS_GALLERY),
                    group: '1_updates',
                    order: 1
                }],
            run: async () => {
                await this.extensionsWorkbenchService.checkForUpdates();
                const outdated = this.extensionsWorkbenchService.outdated;
                if (outdated.length) {
                    return this.extensionsWorkbenchService.openSearch('@outdated ');
                }
                else {
                    return this.dialogService.info(localize('noUpdatesAvailable', "All extensions are up to date."));
                }
            }
        });
        const enableAutoUpdateWhenCondition = ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, false);
        this.registerExtensionAction({
            id: 'workbench.extensions.action.enableAutoUpdate',
            title: localize2('enableAutoUpdate', 'Enable Auto Update for All Extensions'),
            category: ExtensionsLocalizedLabel,
            precondition: enableAutoUpdateWhenCondition,
            menu: [{
                    id: MenuId.ViewContainerTitle,
                    order: 5,
                    group: '1_updates',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), enableAutoUpdateWhenCondition)
                }, {
                    id: MenuId.CommandPalette,
                }],
            run: (accessor) => accessor.get(IExtensionsWorkbenchService).updateAutoUpdateForAllExtensions(true)
        });
        const disableAutoUpdateWhenCondition = ContextKeyExpr.notEquals(`config.${AutoUpdateConfigurationKey}`, false);
        this.registerExtensionAction({
            id: 'workbench.extensions.action.disableAutoUpdate',
            title: localize2('disableAutoUpdate', 'Disable Auto Update for All Extensions'),
            precondition: disableAutoUpdateWhenCondition,
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.ViewContainerTitle,
                    order: 5,
                    group: '1_updates',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), disableAutoUpdateWhenCondition)
                }, {
                    id: MenuId.CommandPalette,
                }],
            run: (accessor) => accessor.get(IExtensionsWorkbenchService).updateAutoUpdateForAllExtensions(false)
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.updateAllExtensions',
            title: localize2('updateAll', 'Update All Extensions'),
            category: ExtensionsLocalizedLabel,
            precondition: HasOutdatedExtensionsContext,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
                }, {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), ContextKeyExpr.or(ContextKeyExpr.has(`config.${AutoUpdateConfigurationKey}`).negate(), ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, 'onlyEnabledExtensions'))),
                    group: '1_updates',
                    order: 2
                }, {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', OUTDATED_EXTENSIONS_VIEW_ID),
                    group: 'navigation',
                    order: 1
                }
            ],
            icon: installWorkspaceRecommendedIcon,
            run: async () => {
                await this.extensionsWorkbenchService.updateAll();
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.enableAll',
            title: localize2('enableAll', 'Enable All Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
                }, {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
                    group: '2_enablement',
                    order: 1
                }],
            run: async () => {
                const extensionsToEnable = this.extensionsWorkbenchService.local.filter(e => !!e.local && this.extensionEnablementService.canChangeEnablement(e.local) && !this.extensionEnablementService.isEnabled(e.local));
                if (extensionsToEnable.length) {
                    await this.extensionsWorkbenchService.setEnablement(extensionsToEnable, 11 /* EnablementState.EnabledGlobally */);
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.enableAllWorkspace',
            title: localize2('enableAllWorkspace', 'Enable All Extensions for this Workspace'),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
            },
            run: async () => {
                const extensionsToEnable = this.extensionsWorkbenchService.local.filter(e => !!e.local && this.extensionEnablementService.canChangeEnablement(e.local) && !this.extensionEnablementService.isEnabled(e.local));
                if (extensionsToEnable.length) {
                    await this.extensionsWorkbenchService.setEnablement(extensionsToEnable, 12 /* EnablementState.EnabledWorkspace */);
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.disableAll',
            title: localize2('disableAll', 'Disable All Installed Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
                }, {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
                    group: '2_enablement',
                    order: 2
                }],
            run: async () => {
                const extensionsToDisable = this.extensionsWorkbenchService.local.filter(e => !e.isBuiltin && !!e.local && this.extensionEnablementService.isEnabled(e.local) && this.extensionEnablementService.canChangeEnablement(e.local));
                if (extensionsToDisable.length) {
                    await this.extensionsWorkbenchService.setEnablement(extensionsToDisable, 9 /* EnablementState.DisabledGlobally */);
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.disableAllWorkspace',
            title: localize2('disableAllWorkspace', 'Disable All Installed Extensions for this Workspace'),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
            },
            run: async () => {
                const extensionsToDisable = this.extensionsWorkbenchService.local.filter(e => !e.isBuiltin && !!e.local && this.extensionEnablementService.isEnabled(e.local) && this.extensionEnablementService.canChangeEnablement(e.local));
                if (extensionsToDisable.length) {
                    await this.extensionsWorkbenchService.setEnablement(extensionsToDisable, 10 /* EnablementState.DisabledWorkspace */);
                }
            }
        });
        this.registerExtensionAction({
            id: SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID,
            title: localize2('InstallFromVSIX', 'Install from VSIX...'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER)
                }, {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER)),
                    group: '3_install',
                    order: 1
                }],
            run: async (accessor) => {
                const fileDialogService = accessor.get(IFileDialogService);
                const commandService = accessor.get(ICommandService);
                const vsixPaths = await fileDialogService.showOpenDialog({
                    title: localize('installFromVSIX', "Install from VSIX"),
                    filters: [{ name: 'VSIX Extensions', extensions: ['vsix'] }],
                    canSelectFiles: true,
                    canSelectMany: true,
                    openLabel: mnemonicButtonLabel(localize({ key: 'installButton', comment: ['&& denotes a mnemonic'] }, "&&Install"))
                });
                if (vsixPaths) {
                    await commandService.executeCommand(INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, vsixPaths);
                }
            }
        });
        this.registerExtensionAction({
            id: INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID,
            title: localize('installVSIX', "Install Extension VSIX"),
            menu: [{
                    id: MenuId.ExplorerContext,
                    group: 'extensions',
                    when: ContextKeyExpr.and(ResourceContextKey.Extension.isEqualTo('.vsix'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER)),
                }],
            run: async (accessor, resources) => {
                const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const hostService = accessor.get(IHostService);
                const notificationService = accessor.get(INotificationService);
                const vsixs = Array.isArray(resources) ? resources : [resources];
                const result = await Promise.allSettled(vsixs.map(async (vsix) => await extensionsWorkbenchService.install(vsix, { installGivenVersion: true })));
                let error, requireReload = false, requireRestart = false;
                for (const r of result) {
                    if (r.status === 'rejected') {
                        error = new Error(r.reason);
                        break;
                    }
                    requireReload = requireReload || r.value.runtimeState?.action === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */;
                    requireRestart = requireRestart || r.value.runtimeState?.action === "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */;
                }
                if (error) {
                    throw error;
                }
                if (requireReload) {
                    notificationService.prompt(Severity.Info, vsixs.length > 1 ? localize('InstallVSIXs.successReload', "Completed installing extensions. Please reload Visual Studio Code to enable them.")
                        : localize('InstallVSIXAction.successReload', "Completed installing extension. Please reload Visual Studio Code to enable it."), [{
                            label: localize('InstallVSIXAction.reloadNow', "Reload Now"),
                            run: () => hostService.reload()
                        }]);
                }
                else if (requireRestart) {
                    notificationService.prompt(Severity.Info, vsixs.length > 1 ? localize('InstallVSIXs.successRestart', "Completed installing extensions. Please restart extensions to enable them.")
                        : localize('InstallVSIXAction.successRestart', "Completed installing extension. Please restart extensions to enable it."), [{
                            label: localize('InstallVSIXAction.restartExtensions', "Restart Extensions"),
                            run: () => extensionsWorkbenchService.updateRunningExtensions()
                        }]);
                }
                else {
                    notificationService.prompt(Severity.Info, vsixs.length > 1 ? localize('InstallVSIXs.successNoReload', "Completed installing extensions.") : localize('InstallVSIXAction.successNoReload', "Completed installing extension."), []);
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installExtensionFromLocation',
            title: localize2('installExtensionFromLocation', 'Install Extension from Location...'),
            category: Categories.Developer,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_WEB_SERVER, CONTEXT_HAS_LOCAL_SERVER)
                }],
            run: async (accessor) => {
                const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
                if (isWeb) {
                    return new Promise((c, e) => {
                        const quickInputService = accessor.get(IQuickInputService);
                        const disposables = new DisposableStore();
                        const quickPick = disposables.add(quickInputService.createQuickPick());
                        quickPick.title = localize('installFromLocation', "Install Extension from Location");
                        quickPick.customButton = true;
                        quickPick.customLabel = localize('install button', "Install");
                        quickPick.placeholder = localize('installFromLocationPlaceHolder', "Location of the web extension");
                        quickPick.ignoreFocusOut = true;
                        disposables.add(Event.any(quickPick.onDidAccept, quickPick.onDidCustom)(async () => {
                            quickPick.hide();
                            if (quickPick.value) {
                                try {
                                    await extensionManagementService.installFromLocation(URI.parse(quickPick.value));
                                }
                                catch (error) {
                                    e(error);
                                    return;
                                }
                            }
                            c();
                        }));
                        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
                        quickPick.show();
                    });
                }
                else {
                    const fileDialogService = accessor.get(IFileDialogService);
                    const extensionLocation = await fileDialogService.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false,
                        title: localize('installFromLocation', "Install Extension from Location"),
                    });
                    if (extensionLocation?.[0]) {
                        await extensionManagementService.installFromLocation(extensionLocation[0]);
                    }
                }
            }
        });
        const extensionsFilterSubMenu = new MenuId('extensionsFilterSubMenu');
        MenuRegistry.appendMenuItem(extensionsSearchActionsMenu, {
            submenu: extensionsFilterSubMenu,
            title: localize('filterExtensions', "Filter Extensions..."),
            group: 'navigation',
            order: 2,
            icon: filterIcon,
        });
        const showFeaturedExtensionsId = 'extensions.filter.featured';
        const featuresExtensionsWhenContext = ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.regex(CONTEXT_GALLERY_FILTER_CAPABILITIES.key, new RegExp(`_${"Featured" /* FilterType.Featured */}_`)));
        this.registerExtensionAction({
            id: showFeaturedExtensionsId,
            title: localize2('showFeaturedExtensions', 'Show Featured Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: featuresExtensionsWhenContext
                }, {
                    id: extensionsFilterSubMenu,
                    when: featuresExtensionsWhenContext,
                    group: '1_predefined',
                    order: 1,
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('featured filter', "Featured")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@featured ')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showPopularExtensions',
            title: localize2('showPopularExtensions', 'Show Popular Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CONTEXT_HAS_GALLERY
                }, {
                    id: extensionsFilterSubMenu,
                    when: CONTEXT_HAS_GALLERY,
                    group: '1_predefined',
                    order: 2,
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('most popular filter', "Most Popular")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@popular ')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showRecommendedExtensions',
            title: localize2('showRecommendedExtensions', 'Show Recommended Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CONTEXT_HAS_GALLERY
                }, {
                    id: extensionsFilterSubMenu,
                    when: CONTEXT_HAS_GALLERY,
                    group: '1_predefined',
                    order: 2,
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('most popular recommended', "Recommended")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@recommended ')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.recentlyPublishedExtensions',
            title: localize2('recentlyPublishedExtensions', 'Show Recently Published Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CONTEXT_HAS_GALLERY
                }, {
                    id: extensionsFilterSubMenu,
                    when: CONTEXT_HAS_GALLERY,
                    group: '1_predefined',
                    order: 2,
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('recently published filter', "Recently Published")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@recentlyPublished ')
        });
        const extensionsCategoryFilterSubMenu = new MenuId('extensionsCategoryFilterSubMenu');
        MenuRegistry.appendMenuItem(extensionsFilterSubMenu, {
            submenu: extensionsCategoryFilterSubMenu,
            title: localize('filter by category', "Category"),
            when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.regex(CONTEXT_GALLERY_FILTER_CAPABILITIES.key, new RegExp(`_${"Category" /* FilterType.Category */}_`))),
            group: '2_categories',
            order: 1,
        });
        EXTENSION_CATEGORIES.forEach((category, index) => {
            this.registerExtensionAction({
                id: `extensions.actions.searchByCategory.${category}`,
                title: category,
                menu: [{
                        id: extensionsCategoryFilterSubMenu,
                        when: CONTEXT_HAS_GALLERY,
                        order: index,
                    }],
                run: () => this.extensionsWorkbenchService.openSearch(`@category:"${category.toLowerCase()}"`)
            });
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.listBuiltInExtensions',
            title: localize2('showBuiltInExtensions', 'Show Built-in Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
                }, {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    order: 2,
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('builtin filter', "Built-in")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@builtin ')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.extensionUpdates',
            title: localize2('extensionUpdates', 'Show Extension Updates'),
            category: ExtensionsLocalizedLabel,
            precondition: CONTEXT_HAS_GALLERY,
            f1: true,
            menu: [{
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    when: CONTEXT_HAS_GALLERY,
                    order: 1,
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('extension updates filter', "Updates")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@updates')
        });
        this.registerExtensionAction({
            id: LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID,
            title: localize2('showWorkspaceUnsupportedExtensions', 'Show Extensions Unsupported By Workspace'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER),
                }, {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    order: 5,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER),
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('workspace unsupported filter', "Workspace Unsupported")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@workspaceUnsupported')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showEnabledExtensions',
            title: localize2('showEnabledExtensions', 'Show Enabled Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
                }, {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    order: 3,
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('enabled filter', "Enabled")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@enabled ')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showDisabledExtensions',
            title: localize2('showDisabledExtensions', 'Show Disabled Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
                }, {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    order: 4,
                }],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('disabled filter', "Disabled")
            },
            run: () => this.extensionsWorkbenchService.openSearch('@disabled ')
        });
        const extensionsSortSubMenu = new MenuId('extensionsSortSubMenu');
        MenuRegistry.appendMenuItem(extensionsFilterSubMenu, {
            submenu: extensionsSortSubMenu,
            title: localize('sorty by', "Sort By"),
            when: ContextKeyExpr.and(ContextKeyExpr.or(CONTEXT_HAS_GALLERY, DefaultViewsContext)),
            group: '4_sort',
            order: 1,
        });
        [
            { id: 'installs', title: localize('sort by installs', "Install Count"), precondition: BuiltInExtensionsContext.negate(), sortCapability: "InstallCount" /* SortBy.InstallCount */ },
            { id: 'rating', title: localize('sort by rating', "Rating"), precondition: BuiltInExtensionsContext.negate(), sortCapability: "WeightedRating" /* SortBy.WeightedRating */ },
            { id: 'name', title: localize('sort by name', "Name"), precondition: BuiltInExtensionsContext.negate(), sortCapability: "Title" /* SortBy.Title */ },
            { id: 'publishedDate', title: localize('sort by published date', "Published Date"), precondition: BuiltInExtensionsContext.negate(), sortCapability: "PublishedDate" /* SortBy.PublishedDate */ },
            { id: 'updateDate', title: localize('sort by update date', "Updated Date"), precondition: ContextKeyExpr.and(SearchMarketplaceExtensionsContext.negate(), RecommendedExtensionsContext.negate(), BuiltInExtensionsContext.negate()), sortCapability: 'UpdateDate' },
        ].map(({ id, title, precondition, sortCapability }, index) => {
            const sortCapabilityContext = ContextKeyExpr.regex(CONTEXT_GALLERY_SORT_CAPABILITIES.key, new RegExp(`_${sortCapability}_`));
            this.registerExtensionAction({
                id: `extensions.sort.${id}`,
                title,
                precondition: ContextKeyExpr.and(precondition, ContextKeyExpr.regex(ExtensionsSearchValueContext.key, /^@feature:/).negate(), sortCapabilityContext),
                menu: [{
                        id: extensionsSortSubMenu,
                        when: ContextKeyExpr.and(ContextKeyExpr.or(CONTEXT_HAS_GALLERY, DefaultViewsContext), sortCapabilityContext),
                        order: index,
                    }],
                toggled: ExtensionsSortByContext.isEqualTo(id),
                run: async () => {
                    const extensionsViewPaneContainer = ((await this.viewsService.openViewContainer(VIEWLET_ID, true))?.getViewPaneContainer());
                    const currentQuery = Query.parse(extensionsViewPaneContainer?.searchValue ?? '');
                    extensionsViewPaneContainer?.search(new Query(currentQuery.value, id).toString());
                    extensionsViewPaneContainer?.focus();
                }
            });
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.clearExtensionsSearchResults',
            title: localize2('clearExtensionsSearchResults', 'Clear Extensions Search Results'),
            category: ExtensionsLocalizedLabel,
            icon: clearSearchResultsIcon,
            f1: true,
            precondition: SearchHasTextContext,
            menu: {
                id: extensionsSearchActionsMenu,
                group: 'navigation',
                order: 1,
            },
            run: async (accessor) => {
                const viewPaneContainer = accessor.get(IViewsService).getActiveViewPaneContainerWithId(VIEWLET_ID);
                if (viewPaneContainer) {
                    const extensionsViewPaneContainer = viewPaneContainer;
                    extensionsViewPaneContainer.search('');
                    extensionsViewPaneContainer.focus();
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.refreshExtension',
            title: localize2('refreshExtension', 'Refresh'),
            category: ExtensionsLocalizedLabel,
            icon: refreshIcon,
            f1: true,
            menu: {
                id: MenuId.ViewContainerTitle,
                when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
                group: 'navigation',
                order: 2
            },
            run: async (accessor) => {
                const viewPaneContainer = accessor.get(IViewsService).getActiveViewPaneContainerWithId(VIEWLET_ID);
                if (viewPaneContainer) {
                    await viewPaneContainer.refresh();
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installWorkspaceRecommendedExtensions',
            title: localize('installWorkspaceRecommendedExtensions', "Install Workspace Recommended Extensions"),
            icon: installWorkspaceRecommendedIcon,
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.equals('view', WORKSPACE_RECOMMENDATIONS_VIEW_ID),
                group: 'navigation',
                order: 1
            },
            run: async (accessor) => {
                const view = accessor.get(IViewsService).getActiveViewWithId(WORKSPACE_RECOMMENDATIONS_VIEW_ID);
                return view.installWorkspaceRecommendations();
            }
        });
        this.registerExtensionAction({
            id: ConfigureWorkspaceFolderRecommendedExtensionsAction.ID,
            title: ConfigureWorkspaceFolderRecommendedExtensionsAction.LABEL,
            icon: configureRecommendedIcon,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: WorkbenchStateContext.notEqualsTo('empty'),
                }, {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', WORKSPACE_RECOMMENDATIONS_VIEW_ID),
                    group: 'navigation',
                    order: 2
                }],
            run: () => runAction(this.instantiationService.createInstance(ConfigureWorkspaceFolderRecommendedExtensionsAction, ConfigureWorkspaceFolderRecommendedExtensionsAction.ID, ConfigureWorkspaceFolderRecommendedExtensionsAction.LABEL))
        });
        this.registerExtensionAction({
            id: InstallSpecificVersionOfExtensionAction.ID,
            title: { value: InstallSpecificVersionOfExtensionAction.LABEL, original: 'Install Specific Version of Extension...' },
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
            },
            run: () => runAction(this.instantiationService.createInstance(InstallSpecificVersionOfExtensionAction, InstallSpecificVersionOfExtensionAction.ID, InstallSpecificVersionOfExtensionAction.LABEL))
        });
    }
    // Extension Context Menu
    registerContextMenuActions() {
        this.registerExtensionAction({
            id: SetColorThemeAction.ID,
            title: SetColorThemeAction.TITLE,
            menu: {
                id: MenuId.ExtensionContext,
                group: THEME_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasColorThemes'))
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const instantiationService = accessor.get(IInstantiationService);
                const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id: extensionId }));
                if (extension) {
                    const action = instantiationService.createInstance(SetColorThemeAction);
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: SetFileIconThemeAction.ID,
            title: SetFileIconThemeAction.TITLE,
            menu: {
                id: MenuId.ExtensionContext,
                group: THEME_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasFileIconThemes'))
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const instantiationService = accessor.get(IInstantiationService);
                const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id: extensionId }));
                if (extension) {
                    const action = instantiationService.createInstance(SetFileIconThemeAction);
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: SetProductIconThemeAction.ID,
            title: SetProductIconThemeAction.TITLE,
            menu: {
                id: MenuId.ExtensionContext,
                group: THEME_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasProductIconThemes'))
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const instantiationService = accessor.get(IInstantiationService);
                const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id: extensionId }));
                if (extension) {
                    const action = instantiationService.createInstance(SetProductIconThemeAction);
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showPreReleaseVersion',
            title: localize2('show pre-release version', 'Show Pre-Release Version'),
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.has('inExtensionEditor'), ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('showPreReleaseVersion'), ContextKeyExpr.not('isBuiltinExtension'))
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = (await extensionWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                extensionWorkbenchService.open(extension, { showPreReleaseVersion: true });
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showReleasedVersion',
            title: localize2('show released version', 'Show Release Version'),
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 1,
                when: ContextKeyExpr.and(ContextKeyExpr.has('inExtensionEditor'), ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('extensionHasReleaseVersion'), ContextKeyExpr.has('showPreReleaseVersion'), ContextKeyExpr.not('isBuiltinExtension'))
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = (await extensionWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                extensionWorkbenchService.open(extension, { showPreReleaseVersion: false });
            }
        });
        this.registerExtensionAction({
            id: ToggleAutoUpdateForExtensionAction.ID,
            title: ToggleAutoUpdateForExtensionAction.LABEL,
            category: ExtensionsLocalizedLabel,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.notEquals(`config.${AutoUpdateConfigurationKey}`, 'onlyEnabledExtensions'), ContextKeyExpr.equals('isExtensionEnabled', true)), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isExtensionAllowed')),
            menu: {
                id: MenuId.ExtensionContext,
                group: UPDATE_ACTIONS_GROUP,
                order: 1,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension'))
            },
            run: async (accessor, id) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id }));
                if (extension) {
                    const action = instantiationService.createInstance(ToggleAutoUpdateForExtensionAction);
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: ToggleAutoUpdatesForPublisherAction.ID,
            title: { value: ToggleAutoUpdatesForPublisherAction.LABEL, original: 'Auto Update (Publisher)' },
            category: ExtensionsLocalizedLabel,
            precondition: ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, false),
            menu: {
                id: MenuId.ExtensionContext,
                group: UPDATE_ACTIONS_GROUP,
                order: 2,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension'))
            },
            run: async (accessor, id) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id }));
                if (extension) {
                    const action = instantiationService.createInstance(ToggleAutoUpdatesForPublisherAction);
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.switchToPreRlease',
            title: localize('enablePreRleaseLabel', "Switch to Pre-Release Version"),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 2,
                when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('installedExtensionIsOptedToPreRelease'), ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension'))
            },
            run: async (accessor, id) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id }));
                if (extension) {
                    const action = instantiationService.createInstance(TogglePreReleaseExtensionAction);
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.switchToRelease',
            title: localize('disablePreRleaseLabel', "Switch to Release Version"),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 2,
                when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.has('installedExtensionIsOptedToPreRelease'), ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension'))
            },
            run: async (accessor, id) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id }));
                if (extension) {
                    const action = instantiationService.createInstance(TogglePreReleaseExtensionAction);
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: ClearLanguageAction.ID,
            title: ClearLanguageAction.TITLE,
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.has('canSetLanguage'), ContextKeyExpr.has('isActiveLanguagePackExtension'))
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = (await extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                const action = instantiationService.createInstance(ClearLanguageAction);
                action.extension = extension;
                return action.run();
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installUnsigned',
            title: localize('install', "Install"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '0_install',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('extensionIsUnsigned'), CONTEXT_GALLERY_ALL_REPOSITORY_SIGNED),
                order: 1
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
                    || (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    const action = instantiationService.createInstance(InstallAction, { installPreReleaseVersion: this.extensionsWorkbenchService.preferPreReleases });
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installAndDonotSync',
            title: localize('install installAndDonotSync', "Install (Do not Sync)"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '0_install',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall'), CONTEXT_SYNC_ENABLEMENT),
                order: 1
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
                    || (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    const action = instantiationService.createInstance(InstallAction, {
                        installPreReleaseVersion: this.extensionsWorkbenchService.preferPreReleases,
                        isMachineScoped: true,
                    });
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installPrereleaseAndDonotSync',
            title: localize('installPrereleaseAndDonotSync', "Install Pre-Release (Do not Sync)"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '0_install',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('extensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall'), CONTEXT_SYNC_ENABLEMENT),
                order: 2
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
                    || (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    const action = instantiationService.createInstance(InstallAction, {
                        isMachineScoped: true,
                        preRelease: true
                    });
                    action.extension = extension;
                    return action.run();
                }
            }
        });
        this.registerExtensionAction({
            id: InstallAnotherVersionAction.ID,
            title: InstallAnotherVersionAction.LABEL,
            menu: {
                id: MenuId.ExtensionContext,
                group: '0_install',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall')),
                order: 3
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
                    || (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    return instantiationService.createInstance(InstallAnotherVersionAction, extension, false).run();
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.copyExtension',
            title: localize2('workbench.extensions.action.copyExtension', 'Copy'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '1_copy'
            },
            run: async (accessor, extensionId) => {
                const clipboardService = accessor.get(IClipboardService);
                const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
                    || (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    const name = localize('extensionInfoName', 'Name: {0}', extension.displayName);
                    const id = localize('extensionInfoId', 'Id: {0}', extensionId);
                    const description = localize('extensionInfoDescription', 'Description: {0}', extension.description);
                    const verision = localize('extensionInfoVersion', 'Version: {0}', extension.version);
                    const publisher = localize('extensionInfoPublisher', 'Publisher: {0}', extension.publisherDisplayName);
                    const link = extension.url ? localize('extensionInfoVSMarketplaceLink', 'VS Marketplace Link: {0}', `${extension.url}`) : null;
                    const clipboardStr = `${name}\n${id}\n${description}\n${verision}\n${publisher}${link ? '\n' + link : ''}`;
                    await clipboardService.writeText(clipboardStr);
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.copyExtensionId',
            title: localize2('workbench.extensions.action.copyExtensionId', 'Copy Extension ID'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '1_copy'
            },
            run: async (accessor, id) => accessor.get(IClipboardService).writeText(id)
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.copyLink',
            title: localize2('workbench.extensions.action.copyLink', 'Copy Link'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '1_copy',
                when: ContextKeyExpr.and(ContextKeyExpr.has('isGalleryExtension'), CONTEXT_GALLERY_HAS_EXTENSION_LINK),
            },
            run: async (accessor, _, extension) => {
                const clipboardService = accessor.get(IClipboardService);
                if (extension.galleryLink) {
                    await clipboardService.writeText(extension.galleryLink);
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.configure',
            title: localize2('workbench.extensions.action.configure', 'Settings'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasConfiguration')),
                order: 1
            },
            run: async (accessor, id) => accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: `@ext:${id}` })
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.download',
            title: localize('download VSIX', "Download VSIX"),
            menu: {
                id: MenuId.ExtensionContext,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isGalleryExtension')),
                order: this.productService.quality === 'stable' ? 0 : 1
            },
            run: async (accessor, extensionId) => {
                accessor.get(IExtensionsWorkbenchService).downloadVSIX(extensionId, false);
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.downloadPreRelease',
            title: localize('download pre-release', "Download Pre-Release VSIX"),
            menu: {
                id: MenuId.ExtensionContext,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('extensionHasPreReleaseVersion')),
                order: this.productService.quality === 'stable' ? 1 : 0
            },
            run: async (accessor, extensionId) => {
                accessor.get(IExtensionsWorkbenchService).downloadVSIX(extensionId, true);
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.manageAccountPreferences',
            title: localize2('workbench.extensions.action.changeAccountPreference', "Account Preferences"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasAccountPreferences')),
                order: 2,
            },
            run: (accessor, id) => accessor.get(ICommandService).executeCommand('_manageAccountPreferencesForExtension', id)
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.configureKeybindings',
            title: localize2('workbench.extensions.action.configureKeybindings', 'Keyboard Shortcuts'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasKeybindings')),
                order: 2
            },
            run: async (accessor, id) => accessor.get(IPreferencesService).openGlobalKeybindingSettings(false, { query: `@ext:${id}` })
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.toggleApplyToAllProfiles',
            title: localize2('workbench.extensions.action.toggleApplyToAllProfiles', "Apply Extension to all Profiles"),
            toggled: ContextKeyExpr.has('isApplicationScopedExtension'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('isDefaultApplicationScopedExtension').negate(), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.equals('isWorkspaceScopedExtension', false)),
                order: 3
            },
            run: async (accessor, _, extensionArg) => {
                const uriIdentityService = accessor.get(IUriIdentityService);
                const extension = extensionArg.location ? this.extensionsWorkbenchService.installed.find(e => uriIdentityService.extUri.isEqual(e.local?.location, extensionArg.location)) : undefined;
                if (extension) {
                    return this.extensionsWorkbenchService.toggleApplyExtensionToAllProfiles(extension);
                }
            }
        });
        this.registerExtensionAction({
            id: TOGGLE_IGNORE_EXTENSION_ACTION_ID,
            title: localize2('workbench.extensions.action.toggleIgnoreExtension', "Sync This Extension"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), CONTEXT_SYNC_ENABLEMENT, ContextKeyExpr.equals('isWorkspaceScopedExtension', false)),
                order: 4
            },
            run: async (accessor, id) => {
                const extension = this.extensionsWorkbenchService.local.find(e => areSameExtensions({ id }, e.identifier));
                if (extension) {
                    return this.extensionsWorkbenchService.toggleExtensionIgnoredToSync(extension);
                }
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.ignoreRecommendation',
            title: localize2('workbench.extensions.action.ignoreRecommendation', "Ignore Recommendation"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '3_recommendations',
                when: ContextKeyExpr.has('isExtensionRecommended'),
                order: 1
            },
            run: async (accessor, id) => accessor.get(IExtensionIgnoredRecommendationsService).toggleGlobalIgnoredRecommendation(id, true)
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.undoIgnoredRecommendation',
            title: localize2('workbench.extensions.action.undoIgnoredRecommendation', "Undo Ignored Recommendation"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '3_recommendations',
                when: ContextKeyExpr.has('isUserIgnoredRecommendation'),
                order: 1
            },
            run: async (accessor, id) => accessor.get(IExtensionIgnoredRecommendationsService).toggleGlobalIgnoredRecommendation(id, false)
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addExtensionToWorkspaceRecommendations',
            title: localize2('workbench.extensions.action.addExtensionToWorkspaceRecommendations', "Add to Workspace Recommendations"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '3_recommendations',
                when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.has('isExtensionWorkspaceRecommended').negate(), ContextKeyExpr.has('isUserIgnoredRecommendation').negate(), ContextKeyExpr.notEquals('extensionSource', 'resource')),
                order: 2
            },
            run: (accessor, id) => accessor.get(IWorkspaceExtensionsConfigService).toggleRecommendation(id)
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.removeExtensionFromWorkspaceRecommendations',
            title: localize2('workbench.extensions.action.removeExtensionFromWorkspaceRecommendations', "Remove from Workspace Recommendations"),
            menu: {
                id: MenuId.ExtensionContext,
                group: '3_recommendations',
                when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.has('isExtensionWorkspaceRecommended')),
                order: 2
            },
            run: (accessor, id) => accessor.get(IWorkspaceExtensionsConfigService).toggleRecommendation(id)
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addToWorkspaceRecommendations',
            title: localize2('workbench.extensions.action.addToWorkspaceRecommendations', "Add Extension to Workspace Recommendations"),
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
            },
            async run(accessor) {
                const editorService = accessor.get(IEditorService);
                const workspaceExtensionsConfigService = accessor.get(IWorkspaceExtensionsConfigService);
                if (!(editorService.activeEditor instanceof ExtensionsInput)) {
                    return;
                }
                const extensionId = editorService.activeEditor.extension.identifier.id.toLowerCase();
                const recommendations = await workspaceExtensionsConfigService.getRecommendations();
                if (recommendations.includes(extensionId)) {
                    return;
                }
                await workspaceExtensionsConfigService.toggleRecommendation(extensionId);
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addToWorkspaceFolderRecommendations',
            title: localize2('workbench.extensions.action.addToWorkspaceFolderRecommendations', "Add Extension to Workspace Folder Recommendations"),
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
            },
            run: () => this.commandService.executeCommand('workbench.extensions.action.addToWorkspaceRecommendations')
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addToWorkspaceIgnoredRecommendations',
            title: localize2('workbench.extensions.action.addToWorkspaceIgnoredRecommendations', "Add Extension to Workspace Ignored Recommendations"),
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
            },
            async run(accessor) {
                const editorService = accessor.get(IEditorService);
                const workspaceExtensionsConfigService = accessor.get(IWorkspaceExtensionsConfigService);
                if (!(editorService.activeEditor instanceof ExtensionsInput)) {
                    return;
                }
                const extensionId = editorService.activeEditor.extension.identifier.id.toLowerCase();
                const unwantedRecommendations = await workspaceExtensionsConfigService.getUnwantedRecommendations();
                if (unwantedRecommendations.includes(extensionId)) {
                    return;
                }
                await workspaceExtensionsConfigService.toggleUnwantedRecommendation(extensionId);
            }
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addToWorkspaceFolderIgnoredRecommendations',
            title: localize2('workbench.extensions.action.addToWorkspaceFolderIgnoredRecommendations', "Add Extension to Workspace Folder Ignored Recommendations"),
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
            },
            run: () => this.commandService.executeCommand('workbench.extensions.action.addToWorkspaceIgnoredRecommendations')
        });
        this.registerExtensionAction({
            id: ConfigureWorkspaceRecommendedExtensionsAction.ID,
            title: { value: ConfigureWorkspaceRecommendedExtensionsAction.LABEL, original: 'Configure Recommended Extensions (Workspace)' },
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: WorkbenchStateContext.isEqualTo('workspace'),
            },
            run: () => runAction(this.instantiationService.createInstance(ConfigureWorkspaceRecommendedExtensionsAction, ConfigureWorkspaceRecommendedExtensionsAction.ID, ConfigureWorkspaceRecommendedExtensionsAction.LABEL))
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.manageTrustedPublishers',
            title: localize2('workbench.extensions.action.manageTrustedPublishers', "Manage Trusted Extension Publishers"),
            category: EXTENSIONS_CATEGORY,
            f1: true,
            run: async (accessor) => {
                const quickInputService = accessor.get(IQuickInputService);
                const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
                const trustedPublishers = extensionManagementService.getTrustedPublishers();
                const trustedPublisherItems = trustedPublishers.map(publisher => ({
                    id: publisher.publisher,
                    label: publisher.publisherDisplayName,
                    description: publisher.publisher,
                    picked: true,
                })).sort((a, b) => a.label.localeCompare(b.label));
                const result = await quickInputService.pick(trustedPublisherItems, {
                    canPickMany: true,
                    title: localize('trustedPublishers', "Manage Trusted Extension Publishers"),
                    placeHolder: localize('trustedPublishersPlaceholder', "Choose which publishers to trust"),
                });
                if (result) {
                    const untrustedPublishers = [];
                    for (const { publisher } of trustedPublishers) {
                        if (!result.some(r => r.id === publisher)) {
                            untrustedPublishers.push(publisher);
                        }
                    }
                    trustedPublishers.filter(publisher => !result.some(r => r.id === publisher.publisher));
                    extensionManagementService.untrustPublishers(...untrustedPublishers);
                }
            }
        });
    }
    registerExtensionAction(extensionActionOptions) {
        const menus = extensionActionOptions.menu ? Array.isArray(extensionActionOptions.menu) ? extensionActionOptions.menu : [extensionActionOptions.menu] : [];
        let menusWithOutTitles = [];
        const menusWithTitles = [];
        if (extensionActionOptions.menuTitles) {
            for (let index = 0; index < menus.length; index++) {
                const menu = menus[index];
                const menuTitle = extensionActionOptions.menuTitles[menu.id.id];
                if (menuTitle) {
                    menusWithTitles.push({ id: menu.id, item: { ...menu, command: { id: extensionActionOptions.id, title: menuTitle } } });
                }
                else {
                    menusWithOutTitles.push(menu);
                }
            }
        }
        else {
            menusWithOutTitles = menus;
        }
        const disposables = new DisposableStore();
        disposables.add(registerAction2(class extends Action2 {
            constructor() {
                super({
                    ...extensionActionOptions,
                    menu: menusWithOutTitles
                });
            }
            run(accessor, ...args) {
                return extensionActionOptions.run(accessor, ...args);
            }
        }));
        if (menusWithTitles.length) {
            disposables.add(MenuRegistry.appendMenuItems(menusWithTitles));
        }
        return disposables;
    }
};
ExtensionsContributions = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IExtensionGalleryService),
    __param(2, IExtensionGalleryManifestService),
    __param(3, IContextKeyService),
    __param(4, IViewsService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, IInstantiationService),
    __param(8, IDialogService),
    __param(9, ICommandService),
    __param(10, IProductService)
], ExtensionsContributions);
let ExtensionStorageCleaner = class ExtensionStorageCleaner {
    constructor(extensionManagementService, storageService) {
        ExtensionStorageService.removeOutdatedExtensionVersions(extensionManagementService, storageService);
    }
};
ExtensionStorageCleaner = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IStorageService)
], ExtensionStorageCleaner);
let TrustedPublishersInitializer = class TrustedPublishersInitializer {
    constructor(extensionManagementService, userDataProfilesService, productService, storageService) {
        const trustedPublishersInitStatusKey = 'trusted-publishers-init-migration';
        if (!storageService.get(trustedPublishersInitStatusKey, -1 /* StorageScope.APPLICATION */)) {
            for (const profile of userDataProfilesService.profiles) {
                extensionManagementService.getInstalled(1 /* ExtensionType.User */, profile.extensionsResource)
                    .then(async (extensions) => {
                    const trustedPublishers = new Map();
                    for (const extension of extensions) {
                        if (!extension.publisherDisplayName) {
                            continue;
                        }
                        const publisher = extension.manifest.publisher.toLowerCase();
                        if (productService.trustedExtensionPublishers?.includes(publisher)
                            || (extension.publisherDisplayName && productService.trustedExtensionPublishers?.includes(extension.publisherDisplayName.toLowerCase()))) {
                            continue;
                        }
                        trustedPublishers.set(publisher, { publisher, publisherDisplayName: extension.publisherDisplayName });
                    }
                    if (trustedPublishers.size) {
                        extensionManagementService.trustPublishers(...trustedPublishers.values());
                    }
                    storageService.store(trustedPublishersInitStatusKey, 'true', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                });
            }
        }
    }
};
TrustedPublishersInitializer = __decorate([
    __param(0, IWorkbenchExtensionManagementService),
    __param(1, IUserDataProfilesService),
    __param(2, IProductService),
    __param(3, IStorageService)
], TrustedPublishersInitializer);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExtensionsContributions, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(StatusUpdater, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(MaliciousExtensionChecker, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(KeymapExtensions, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(ExtensionsViewletViewsContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(ExtensionActivationProgress, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(ExtensionDependencyChecker, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(ExtensionEnablementWorkspaceTrustTransitionParticipant, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(ExtensionsCompletionItemsProvider, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(UnsupportedExtensionsMigrationContrib, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(TrustedPublishersInitializer, 4 /* LifecyclePhase.Eventually */);
if (isWeb) {
    workbenchRegistry.registerWorkbenchContribution(ExtensionStorageCleaner, 4 /* LifecyclePhase.Eventually */);
}
// Running Extensions
registerAction2(ShowRuntimeExtensionsAction);
Registry.as(ConfigurationMigrationExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: AutoUpdateConfigurationKey,
        migrateFn: (value, accessor) => {
            if (value === 'onlySelectedExtensions') {
                return { value: false };
            }
            return [];
        }
    }]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBOEIsTUFBTSxnREFBZ0QsQ0FBQztBQUM1SSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLDJCQUEyQixFQUFFLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLGdDQUFnQyxFQUEwQiw0QkFBNEIsRUFBRSwwQkFBMEIsRUFBc0IsTUFBTSx3RUFBd0UsQ0FBQztBQUM1VSxPQUFPLEVBQW1CLGlDQUFpQyxFQUFrQixvQ0FBb0MsRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3JPLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQzFLLE9BQU8sRUFBbUMsVUFBVSxJQUFJLG1CQUFtQixFQUEwQixNQUFNLGtDQUFrQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLDJCQUEyQixFQUFnQyxpQ0FBaUMsRUFBRSxzQ0FBc0MsRUFBRSxpQ0FBaUMsRUFBdUMsMEJBQTBCLEVBQUUsNEJBQTRCLEVBQUUsd0NBQXdDLEVBQUUsZ0RBQWdELEVBQXNCLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLDJCQUEyQixFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLG9CQUFvQixFQUE2QyxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzNwQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsNkNBQTZDLEVBQUUsbURBQW1ELEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUseUJBQXlCLEVBQUUsbUJBQW1CLEVBQUUsa0NBQWtDLEVBQUUsbUNBQW1DLEVBQUUsK0JBQStCLEVBQUUsMkJBQTJCLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDeGEsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLHlCQUF5QixFQUFFLGtDQUFrQyxFQUFFLDJCQUEyQixFQUFFLHdCQUF3QixFQUFFLGtDQUFrQyxFQUFFLDRCQUE0QixFQUFFLG1CQUFtQixFQUFFLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDalYsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQXNCLE1BQU0sb0VBQW9FLENBQUM7QUFDdkssT0FBTyxLQUFLLHdCQUF3QixNQUFNLHFFQUFxRSxDQUFDO0FBQ2hILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUV2RixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBa0QsVUFBVSxJQUFJLHVCQUF1QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekgsT0FBTyxFQUF3QixVQUFVLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0SCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHbEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQy9JLE9BQU8sRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFM0YsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDbkksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxzREFBc0QsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsK0JBQStCLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdEssT0FBTyxFQUFFLG9CQUFvQixFQUFpQixNQUFNLHNEQUFzRCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQW1DLFVBQVUsSUFBSSxnQ0FBZ0MsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25JLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLE9BQU8sTUFBTSxnREFBZ0QsQ0FBQztBQUNyRSxPQUFPLEVBQWdDLG1DQUFtQyxFQUFFLHNDQUFzQyxFQUE2QixnQ0FBZ0MsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBRXJRLGFBQWE7QUFDYixpQkFBaUIsQ0FBQywyQkFBMkIsRUFBRSwwQkFBMEIsa0NBQXdELENBQUM7QUFDbEksaUJBQWlCLENBQUMsMkNBQTJDLEVBQUUsMENBQTBDLG9DQUE0QixDQUFDO0FBQ3RJLGlCQUFpQixDQUFDLGdDQUFnQyxFQUFFLCtCQUErQixrQ0FBMEUsQ0FBQztBQUU5SixlQUFlO0FBQ2YsUUFBUSxDQUFDLEVBQUUsQ0FBdUIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO0lBQ3JGLElBQUksRUFBRSxtQ0FBbUM7SUFDekMsTUFBTSxFQUFFLG1DQUFtQyxDQUFDLE1BQU07SUFDbEQsV0FBVyxFQUFFLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxtQ0FBbUMsQ0FBQztJQUNwRyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxDQUFDO0NBQ3JGLENBQUMsQ0FBQztBQUVILFNBQVM7QUFDVCxRQUFRLENBQUMsRUFBRSxDQUFzQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsQ0FDL0Usb0JBQW9CLENBQUMsTUFBTSxDQUMxQixlQUFlLEVBQ2YsZUFBZSxDQUFDLEVBQUUsRUFDbEIsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FDbEMsRUFDRDtJQUNDLElBQUksY0FBYyxDQUFDLGVBQWUsQ0FBQztDQUNuQyxDQUFDLENBQUM7QUFFSixRQUFRLENBQUMsRUFBRSxDQUEwQix1QkFBdUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLHFCQUFxQixDQUN6RztJQUNDLEVBQUUsRUFBRSxVQUFVO0lBQ2QsS0FBSyxFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDO0lBQzVDLDJCQUEyQixFQUFFO1FBQzVCLEVBQUUsRUFBRSxVQUFVO1FBQ2QsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDO1FBQ3hHLFdBQVcsRUFBRSxFQUFFLE9BQU8sRUFBRSxtREFBNkIsd0JBQWUsRUFBRTtRQUN0RSxLQUFLLEVBQUUsQ0FBQztLQUNSO0lBQ0QsY0FBYyxFQUFFLElBQUksY0FBYyxDQUFDLDJCQUEyQixDQUFDO0lBQy9ELElBQUksRUFBRSxrQkFBa0I7SUFDeEIsS0FBSyxFQUFFLENBQUM7SUFDUixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLHNCQUFzQixFQUFFLElBQUk7Q0FDNUIsd0NBQWdDLENBQUM7QUFFbkMsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDO0tBQ3hFLHFCQUFxQixDQUFDO0lBQ3RCLEVBQUUsRUFBRSxZQUFZO0lBQ2hCLEtBQUssRUFBRSxFQUFFO0lBQ1QsS0FBSyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxZQUFZLENBQUM7SUFDN0QsSUFBSSxFQUFFLFFBQVE7SUFDZCxVQUFVLEVBQUU7UUFDWCx1QkFBdUIsRUFBRTtZQUN4QixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUUsS0FBSyxFQUFFO1lBQzdDLGNBQWMsRUFBRTtnQkFDZixRQUFRLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDO2dCQUNqQyxRQUFRLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDO2dCQUM5QyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQzthQUN4QjtZQUNELGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMsNEJBQTRCLEVBQUUsZ0VBQWdFLENBQUM7Z0JBQ3hHLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSx5RUFBeUUsQ0FBQztnQkFDcEgsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDJDQUEyQyxDQUFDO2FBQ3BGO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxnSEFBZ0gsQ0FBQztZQUNoSyxPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDO1NBQzVCO1FBQ0QsNkJBQTZCLEVBQUU7WUFDOUIsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHFNQUFxTSxDQUFDO1lBQ3RQLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyx3Q0FBZ0M7WUFDckMsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7U0FDNUI7UUFDRCxrQ0FBa0MsRUFBRTtZQUNuQyxJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsa0ZBQWtGLENBQUM7WUFDNUksT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELDRDQUE0QyxFQUFFO1lBQzdDLElBQUksRUFBRSxTQUFTO1lBQ2Ysa0JBQWtCLEVBQUUsUUFBUSxDQUFDLHNEQUFzRCxFQUFFLGlNQUFpTSxDQUFDO1lBQ3ZSLE9BQU8sRUFBRSxLQUFLO1lBQ2QsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7U0FDNUI7UUFDRCw4Q0FBOEMsRUFBRTtZQUMvQyxJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxRQUFRLENBQUMsNkNBQTZDLEVBQUUsMEhBQTBILENBQUM7WUFDaE0sT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELDRDQUE0QyxFQUFFO1lBQzdDLElBQUksRUFBRSxPQUFPO1lBQ2IsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2FBQ2Q7WUFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLDhHQUE4RyxDQUFDO1lBQ3JLLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyx3Q0FBZ0M7U0FDckM7UUFDRCxzQkFBc0IsRUFBRTtZQUN2QixJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDO1lBQzNCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDO1lBQzNCLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMsMEJBQTBCLEVBQUUsd0RBQXdELENBQUM7Z0JBQzlGLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSx1REFBdUQsQ0FBQztnQkFDOUYsUUFBUSxDQUFDLDBCQUEwQixFQUFFLCtFQUErRSxDQUFDO2FBQ3JIO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxtQ0FBbUMsQ0FBQztZQUNqRixPQUFPLEVBQUUsTUFBTTtTQUNmO1FBQ0QscUNBQXFDLEVBQUU7WUFDdEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxtQkFBbUIsRUFBRSxRQUFRLENBQUMscUNBQXFDLEVBQUUsMERBQTBELENBQUM7WUFDaEksaUJBQWlCLEVBQUU7Z0JBQ2xCLDBEQUEwRCxFQUFFO29CQUMzRCxJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsS0FBSztpQkFDZDthQUNEO1lBQ0Qsb0JBQW9CLEVBQUUsS0FBSztZQUMzQixPQUFPLEVBQUUsRUFBRTtZQUNYLGVBQWUsRUFBRSxDQUFDO29CQUNqQixNQUFNLEVBQUU7d0JBQ1AsVUFBVSxFQUFFLEtBQUs7cUJBQ2pCO2lCQUNELENBQUM7U0FDRjtRQUNELGtDQUFrQyxFQUFFO1lBQ25DLElBQUksRUFBRSxRQUFRO1lBQ2QsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDBFQUEwRSxDQUFDO1lBQ2hJLGlCQUFpQixFQUFFO2dCQUNsQiwwREFBMEQsRUFBRTtvQkFDM0QsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLENBQUM7aUJBQ1Y7YUFDRDtZQUNELG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsT0FBTyxFQUFFLEVBQUU7WUFDWCxlQUFlLEVBQUUsQ0FBQztvQkFDakIsTUFBTSxFQUFFO3dCQUNQLFVBQVUsRUFBRSxDQUFDO3FCQUNiO2lCQUNELENBQUM7U0FDRjtRQUNELENBQUMsaUNBQWlDLENBQUMsRUFBRTtZQUNwQyxJQUFJLEVBQUUsUUFBUTtZQUNkLEtBQUssd0NBQWdDO1lBQ3JDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSwrU0FBK1MsQ0FBQztZQUN2WCxpQkFBaUIsRUFBRTtnQkFDbEIsMERBQTBELEVBQUU7b0JBQzNELElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDWCxXQUFXLEVBQUU7NEJBQ1osSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQzs0QkFDM0IsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUM7NEJBQzlCLGdCQUFnQixFQUFFO2dDQUNqQixRQUFRLENBQUMsNENBQTRDLEVBQUUsbUNBQW1DLENBQUM7Z0NBQzNGLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRSxvRUFBb0UsQ0FBQztnQ0FDN0gsUUFBUSxDQUFDLCtDQUErQyxFQUFFLDhGQUE4RixDQUFDOzZCQUN6Sjs0QkFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLGlEQUFpRCxFQUFFLG9FQUFvRSxDQUFDO3lCQUM5STt3QkFDRCxTQUFTLEVBQUU7NEJBQ1YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSxxS0FBcUssQ0FBQzt5QkFDN087cUJBQ0Q7aUJBQ0Q7YUFDRDtTQUNEO1FBQ0QsMkRBQTJELEVBQUU7WUFDNUQsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLDZDQUE2QyxFQUFFLG9IQUFvSCxDQUFDO1lBQzFMLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCwwQ0FBMEMsRUFBRTtZQUMzQyxJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsNkZBQTZGLENBQUM7WUFDL0ksT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELDRCQUE0QixFQUFFO1lBQzdCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSw4RUFBOEUsQ0FBQztZQUNuSSxPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLFFBQVEsRUFBRSxRQUFRO1NBQ2xCO1FBQ0QsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFO1lBQzlCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsK0tBQStLLENBQUM7WUFDck4sT0FBTyxFQUFFLEtBQUs7WUFDZCxRQUFRLEVBQUUsT0FBTyxDQUFDLE9BQU8sS0FBSyxRQUFRO1NBQ3RDO1FBQ0QsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFO1lBQy9CLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxvRUFBb0UsQ0FBQztZQUNySSxPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQztTQUNyQztRQUNELENBQUMsbUNBQW1DLENBQUMsRUFBRTtZQUN0QyxJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUscURBQXFELENBQUM7WUFDN0csT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLHdDQUFnQztZQUNyQyxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztZQUM1QixRQUFRLEVBQUUsS0FBSztZQUNmLE1BQU0sRUFBRTtnQkFDUCxJQUFJLEVBQUUsNEJBQTRCO2dCQUNsQyxjQUFjLEVBQUUsTUFBTTthQUN0QjtTQUNEO1FBQ0QsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFO1lBQzdCLDRIQUE0SDtZQUM1SCxJQUFJLEVBQUUsUUFBUTtZQUNkLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxpWEFBaVgsQ0FBQztZQUN0YSxPQUFPLEVBQUUsR0FBRztZQUNaLGVBQWUsRUFBRSxDQUFDO29CQUNqQixJQUFJLEVBQUUsRUFBRTtvQkFDUixXQUFXLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLDRCQUE0QixDQUFDO2lCQUM5RSxFQUFFO29CQUNGLElBQUksRUFBRTt3QkFDTCxHQUFHLEVBQUUsSUFBSTtxQkFDVDtvQkFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDZCQUE2QixDQUFDO2lCQUM5RSxDQUFDO1lBQ0YsS0FBSyx3Q0FBZ0M7WUFDckMsTUFBTSxFQUFFO2dCQUNQLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLGNBQWMsRUFBRSxNQUFNO2dCQUN0QixXQUFXLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGtSQUFrUixDQUFDO2FBQ3RVO1lBQ0Qsb0JBQW9CLEVBQUUsS0FBSztZQUMzQixpQkFBaUIsRUFBRTtnQkFDbEIsMERBQTBELEVBQUU7b0JBQzNELEtBQUssRUFBRTt3QkFDTjs0QkFDQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDOzRCQUMzQixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQzs0QkFDN0IsV0FBVyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxrQ0FBa0MsQ0FBQzs0QkFDekYsZ0JBQWdCLEVBQUU7Z0NBQ2pCLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSx1QkFBdUIsQ0FBQztnQ0FDbkUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLDJCQUEyQixDQUFDO2dDQUN4RSxRQUFRLENBQUMsd0NBQXdDLEVBQUUsOENBQThDLENBQUM7NkJBQ2xHO3lCQUNEO3dCQUNEOzRCQUNDLElBQUksRUFBRSxPQUFPOzRCQUNiLEtBQUssRUFBRTtnQ0FDTixJQUFJLEVBQUUsUUFBUTs2QkFDZDs0QkFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLG1UQUFtVCxDQUFDO3lCQUNsWDtxQkFDRDtpQkFDRDtnQkFDRCw2QkFBNkIsRUFBRTtvQkFDOUIsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQztvQkFDM0IsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUM7b0JBQzdCLFdBQVcsRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsc0RBQXNELENBQUM7b0JBQ3RILGdCQUFnQixFQUFFO3dCQUNqQixRQUFRLENBQUMsMENBQTBDLEVBQUUsZ0RBQWdELENBQUM7d0JBQ3RHLFFBQVEsQ0FBQywyQ0FBMkMsRUFBRSxvREFBb0QsQ0FBQzt3QkFDM0csUUFBUSxDQUFDLGtEQUFrRCxFQUFFLGtFQUFrRSxDQUFDO3FCQUNoSTtpQkFDRDtnQkFDRCxLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFNBQVM7b0JBQ2YsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztvQkFDbkIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxtQ0FBbUMsQ0FBQztvQkFDOUYsZ0JBQWdCLEVBQUU7d0JBQ2pCLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSx1QkFBdUIsQ0FBQzt3QkFDaEUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLDBCQUEwQixDQUFDO3FCQUNwRTtpQkFDRDthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQztBQUVKLE1BQU0sWUFBWSxHQUF1RCxRQUFRLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzNJLFlBQVksQ0FBQyxjQUFjLENBQUMsK0JBQStCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztBQUU1RixvQkFBb0I7QUFDcEIsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLG9CQUFvQixFQUFFLENBQUMsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEdBQXdCLEVBQUUsYUFBdUIsRUFBRSxPQUFnQixFQUFFLEVBQUU7SUFDL0ssTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDbkUsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3pHLElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ25FLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLDRCQUE0QixFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDbEYsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsR0FBd0IsRUFBRSxhQUF1QixFQUFFLE9BQWdCLEVBQUUsVUFBb0IsRUFBRSxFQUFFO0lBQ3ZNLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7SUFFckQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4RyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3RHLENBQUMsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSx1Q0FBdUM7SUFDM0MsUUFBUSxFQUFFO1FBQ1QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxtREFBbUQsRUFBRSw2QkFBNkIsQ0FBQztRQUN6RyxJQUFJLEVBQUU7WUFDTDtnQkFDQyxJQUFJLEVBQUUsc0JBQXNCO2dCQUM1QixXQUFXLEVBQUUsUUFBUSxDQUFDLHNEQUFzRCxFQUFFLG1DQUFtQyxDQUFDO2dCQUNsSCxVQUFVLEVBQUUsQ0FBQyxLQUFVLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLFlBQVksR0FBRzthQUM3RTtZQUNEO2dCQUNDLElBQUksRUFBRSxTQUFTO2dCQUNmLFdBQVcsRUFBRSx5RkFBeUY7b0JBQ3JHLDhMQUE4TDtnQkFDL0wsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLE1BQU0sRUFBRTtvQkFDUCxNQUFNLEVBQUUsUUFBUTtvQkFDaEIsWUFBWSxFQUFFO3dCQUNiLDRDQUE0QyxFQUFFOzRCQUM3QyxNQUFNLEVBQUUsU0FBUzs0QkFDakIsYUFBYSxFQUFFLFFBQVEsQ0FBQyx5RkFBeUYsRUFBRSxrSkFBa0osQ0FBQzs0QkFDdFEsT0FBTyxFQUFFLEtBQUs7eUJBQ2Q7d0JBQ0QsMEJBQTBCLEVBQUU7NEJBQzNCLE1BQU0sRUFBRSxTQUFTOzRCQUNqQixhQUFhLEVBQUUsUUFBUSxDQUFDLHVFQUF1RSxFQUFFLHVGQUF1RixDQUFDOzRCQUN6TCxPQUFPLEVBQUUsS0FBSzt5QkFDZDt3QkFDRCxXQUFXLEVBQUU7NEJBQ1osTUFBTSxFQUFFLFNBQVM7NEJBQ2pCLGFBQWEsRUFBRSxRQUFRLENBQUMsd0RBQXdELEVBQUUsNEVBQTRFLENBQUM7NEJBQy9KLE9BQU8sRUFBRSxLQUFLO3lCQUNkO3dCQUNELGVBQWUsRUFBRTs0QkFDaEIsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQzs0QkFDNUIsYUFBYSxFQUFFLFFBQVEsQ0FBQyw0REFBNEQsRUFBRSw2UkFBNlIsQ0FBQzt5QkFDcFg7d0JBQ0QsUUFBUSxFQUFFOzRCQUNULE1BQU0sRUFBRSxTQUFTOzRCQUNqQixhQUFhLEVBQUUsUUFBUSxDQUFDLHFEQUFxRCxFQUFFLHVJQUF1SSxDQUFDOzRCQUN2TixPQUFPLEVBQUUsS0FBSzt5QkFDZDt3QkFDRCxTQUFTLEVBQUU7NEJBQ1YsTUFBTSxFQUFFLFFBQVE7NEJBQ2hCLGFBQWEsRUFBRSxRQUFRLENBQUMsc0RBQXNELEVBQUUsMk1BQTJNLENBQUM7eUJBQzVSO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRDtLQUNEO0lBQ0QsT0FBTyxFQUFFLEtBQUssRUFDYixRQUFRLEVBQ1IsR0FBMkIsRUFDM0IsT0FPQyxFQUFFLEVBQUU7UUFDTCxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM3RSxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUN0RixNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUM7WUFDSixJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM3QixNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxTQUFTLEdBQUcsMEJBQTBCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDckgsSUFBSSxTQUFTLEVBQUUsZUFBZSxvREFBNEMsRUFBRSxDQUFDO29CQUM1RSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDL0ksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSw0QkFBNEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUMxRSxDQUFDO29CQUNELE1BQU0sMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFO3dCQUM1RCxlQUFlLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsd0ZBQXdGO3dCQUNoSix3QkFBd0IsRUFBRSxPQUFPLEVBQUUsd0JBQXdCO3dCQUMzRCxtQkFBbUIsRUFBRSxDQUFDLENBQUMsT0FBTzt3QkFDOUIsT0FBTyxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsZ0NBQWdDLENBQUMsZ0RBQWdDLEVBQUU7cUJBQ3BHLENBQUMsQ0FBQztnQkFDSixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO3dCQUM3QyxPQUFPO3dCQUNQLHdCQUF3QixFQUFFLE9BQU8sRUFBRSx3QkFBd0I7d0JBQzNELE9BQU8sRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLGdDQUFnQyxDQUFDLGdEQUFnQyxFQUFFO3dCQUNwRyxhQUFhLEVBQUUsT0FBTyxFQUFFLGFBQWE7d0JBQ3JDLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTTt3QkFDdkIsZUFBZSxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLHdGQUF3RjtxQkFDaEoseUNBQWdDLENBQUM7Z0JBQ25DLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDN0IsTUFBTSwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMvRSxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQixNQUFNLENBQUMsQ0FBQztRQUNULENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSx5Q0FBeUM7SUFDN0MsUUFBUSxFQUFFO1FBQ1QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxxREFBcUQsRUFBRSwrQkFBK0IsQ0FBQztRQUM3RyxJQUFJLEVBQUU7WUFDTDtnQkFDQyxJQUFJLEVBQUUsUUFBUSxDQUFDLGtEQUFrRCxFQUFFLGtDQUFrQyxDQUFDO2dCQUN0RyxNQUFNLEVBQUU7b0JBQ1AsTUFBTSxFQUFFLFFBQVE7aUJBQ2hCO2FBQ0Q7U0FDRDtLQUNEO0lBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBVSxFQUFFLEVBQUU7UUFDdkMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBQ0QsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDN0UsTUFBTSxTQUFTLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNsRSxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsa0lBQWtJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuTCxDQUFDO1FBQ0QsSUFBSSxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsaUVBQWlFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RyxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osTUFBTSwwQkFBMEIsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLE1BQU0sQ0FBQyxDQUFDO1FBQ1QsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLDZCQUE2QjtJQUNqQyxRQUFRLEVBQUU7UUFDVCxXQUFXLEVBQUUsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLGlDQUFpQyxDQUFDO1FBQ25HLElBQUksRUFBRTtZQUNMO2dCQUNDLElBQUksRUFBRSxRQUFRLENBQUMsc0NBQXNDLEVBQUUsd0JBQXdCLENBQUM7Z0JBQ2hGLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7YUFDNUI7U0FDRDtLQUNEO0lBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBZ0IsRUFBRSxFQUFFLEVBQUU7UUFDL0MsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BFLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxTQUFTLDZDQUE2QyxDQUFDLE9BQWlDLEVBQUUsQ0FBOEI7SUFDdkgsT0FBTyxFQUFFLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ2pFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFDO1FBQzlDLElBQUksTUFBTSxZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQ3ZDLElBQUksTUFBTSxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsQ0FBQztnQkFDckMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDeEIsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsNkNBQTZDLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFDckYsNkNBQTZDLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7QUFDbkYsNkNBQTZDLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7QUFFdkYsV0FBVztBQUNYLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLElBQUksYUFBYSxDQUFVLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzVGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLElBQUksYUFBYSxDQUFVLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzlGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLElBQUksYUFBYSxDQUFVLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4RixNQUFNLGlDQUFpQyxHQUFHLElBQUksYUFBYSxDQUFTLHlCQUF5QixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ25HLE1BQU0sbUNBQW1DLEdBQUcsSUFBSSxhQUFhLENBQVMsMkJBQTJCLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDdkcsTUFBTSxxQ0FBcUMsR0FBRyxJQUFJLGFBQWEsQ0FBVSw0QkFBNEIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM5RyxNQUFNLGtDQUFrQyxHQUFHLElBQUksYUFBYSxDQUFVLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRXhHLEtBQUssVUFBVSxTQUFTLENBQUMsTUFBZTtJQUN2QyxJQUFJLENBQUM7UUFDSixNQUFNLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNwQixDQUFDO1lBQVMsQ0FBQztRQUNWLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQU9ELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQUUvQyxZQUNxRCxnQ0FBbUUsRUFDN0YsdUJBQWlELEVBQ3pDLCtCQUFpRSxFQUM5RCxpQkFBcUMsRUFDMUMsWUFBMkIsRUFDYiwwQkFBdUQsRUFDOUMsMEJBQWdFLEVBQy9FLG9CQUEyQyxFQUNsRCxhQUE2QixFQUM1QixjQUErQixFQUMvQixjQUErQjtRQUVqRSxLQUFLLEVBQUUsQ0FBQztRQVo0QyxxQ0FBZ0MsR0FBaEMsZ0NBQWdDLENBQW1DO1FBR2xGLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDMUMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDYiwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQzlDLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBc0M7UUFDL0UseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNsRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDNUIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQy9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUdqRSxNQUFNLGlCQUFpQixHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3hFLElBQUksdUJBQXVCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN6QyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUVELE1BQU0scUJBQXFCLEdBQUcsd0JBQXdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDakYsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCLEVBQUUsQ0FBQztZQUMxRSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUVELE1BQU0sc0JBQXNCLEdBQUcseUJBQXlCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbkYsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCLEVBQUUsQ0FBQztZQUMzRSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDN0UsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUN4RSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUVELCtCQUErQixDQUFDLDJCQUEyQixFQUFFO2FBQzNELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsbUNBQW1DLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyTCxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO0lBQ3BDLENBQUM7SUFFTyxLQUFLLENBQUMsbUNBQW1DLENBQUMsd0JBQTBEO1FBQzNHLGlDQUFpQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuTCxtQ0FBbUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUsscUNBQXFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pKLGtDQUFrQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLElBQUksc0NBQXNDLENBQUMsd0JBQXdCLCtGQUF1RCxDQUFDLENBQUMsQ0FBQztJQUMvTixDQUFDO0lBRU8sMkJBQTJCO1FBQ2xDLElBQUksSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDhCQUE4QjtlQUNwRSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCO2VBQ3JFLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsRUFDcEUsQ0FBQztZQUNGLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztnQkFDckYsSUFBSSxFQUFFLG1DQUFtQztnQkFDekMsTUFBTSxFQUFFLG1DQUFtQyxDQUFDLE1BQU07Z0JBQ2xELFdBQVcsRUFBRSxRQUFRLENBQUMsd0NBQXdDLEVBQUUscURBQXFELENBQUM7Z0JBQ3RILFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSw4QkFBOEIsQ0FBQyxFQUFFLENBQUM7YUFDM0csQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFFRCxpQkFBaUI7SUFDVCxxQkFBcUI7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRTtZQUN6RSxPQUFPLEVBQUU7Z0JBQ1IsRUFBRSxFQUFFLFVBQVU7Z0JBQ2QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDO2FBQ3ZHO1lBQ0QsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixLQUFLLEVBQUUsQ0FBQztTQUNSLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7WUFDakUsT0FBTyxFQUFFO2dCQUNSLEVBQUUsRUFBRSxVQUFVO2dCQUNkLEtBQUssRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDO2FBQy9DO1lBQ0QsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixLQUFLLEVBQUUsQ0FBQztTQUNSLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxpREFBaUQ7WUFDckQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSwwQkFBMEIsQ0FBQztZQUMvRCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQUU7Z0JBQ3pDLE1BQU0sUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNoRSxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSwrQ0FBK0M7WUFDbkQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQztZQUMzRCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQzthQUM3STtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFFO2dCQUN6QyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqRSxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw2REFBNkQ7WUFDakUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQ0FBc0MsRUFBRSxTQUFTLENBQUM7WUFDbkUsUUFBUSxFQUFFLHlCQUF5QjtZQUNuQyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxtQkFBbUI7aUJBQ3pCLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxtQkFBbUIsQ0FBQztvQkFDekUsS0FBSyxFQUFFLDZCQUE2QjtpQkFDcEMsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLG9DQUFvQyxDQUFDO2FBQ3ZHO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7U0FDOUUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxvREFBb0Q7WUFDeEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyw2QkFBNkIsRUFBRSxxQkFBcUIsQ0FBQztZQUN0RSxRQUFRLEVBQUUseUJBQXlCO1lBQ25DLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxtQkFBbUI7YUFDekI7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQztTQUNoRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDZDQUE2QztZQUNqRCxLQUFLLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLDZCQUE2QixDQUFDO1lBQ2xFLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDLENBQUM7aUJBQzdJLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7b0JBQzdCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxFQUFFLG1CQUFtQixDQUFDO29CQUNqRyxLQUFLLEVBQUUsV0FBVztvQkFDbEIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDZixNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDeEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQztnQkFDMUQsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3JCLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDakUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztnQkFDbEcsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLDZCQUE2QixHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSwwQkFBMEIsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsOENBQThDO1lBQ2xELEtBQUssRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsdUNBQXVDLENBQUM7WUFDN0UsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxZQUFZLEVBQUUsNkJBQTZCO1lBQzNDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixLQUFLLEVBQUUsQ0FBQztvQkFDUixLQUFLLEVBQUUsV0FBVztvQkFDbEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLEVBQUUsNkJBQTZCLENBQUM7aUJBQzNHLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2lCQUN6QixDQUFDO1lBQ0YsR0FBRyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQztTQUNySCxDQUFDLENBQUM7UUFFSCxNQUFNLDhCQUE4QixHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsVUFBVSwwQkFBMEIsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9HLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsK0NBQStDO1lBQ25ELEtBQUssRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUsd0NBQXdDLENBQUM7WUFDL0UsWUFBWSxFQUFFLDhCQUE4QjtZQUM1QyxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixLQUFLLEVBQUUsQ0FBQztvQkFDUixLQUFLLEVBQUUsV0FBVztvQkFDbEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLEVBQUUsOEJBQThCLENBQUM7aUJBQzVHLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2lCQUN6QixDQUFDO1lBQ0YsR0FBRyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQztTQUN0SCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGlEQUFpRDtZQUNyRCxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRSx1QkFBdUIsQ0FBQztZQUN0RCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLFlBQVksRUFBRSw0QkFBNEI7WUFDMUMsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSx5QkFBeUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO2lCQUM3SSxFQUFFO29CQUNGLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSwwQkFBMEIsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLDBCQUEwQixFQUFFLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO29CQUM1UCxLQUFLLEVBQUUsV0FBVztvQkFDbEIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsRUFBRTtvQkFDRixFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSwyQkFBMkIsQ0FBQztvQkFDaEUsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxJQUFJLEVBQUUsK0JBQStCO1lBQ3JDLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDZixNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNuRCxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx1Q0FBdUM7WUFDM0MsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsdUJBQXVCLENBQUM7WUFDdEQsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDO2lCQUNwRyxFQUFFO29CQUNGLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDO29CQUN4RCxLQUFLLEVBQUUsY0FBYztvQkFDckIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDZixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQy9NLElBQUksa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQy9CLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsMkNBQWtDLENBQUM7Z0JBQzFHLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxnREFBZ0Q7WUFDcEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSwwQ0FBMEMsQ0FBQztZQUNsRixRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDLENBQUM7YUFDcEs7WUFDRCxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUMvTSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUMvQixNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLDRDQUFtQyxDQUFDO2dCQUMzRyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsd0NBQXdDO1lBQzVDLEtBQUssRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFLGtDQUFrQyxDQUFDO1lBQ2xFLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSx5QkFBeUIsRUFBRSxzQkFBc0IsQ0FBQztpQkFDcEcsRUFBRTtvQkFDRixFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQztvQkFDeEQsS0FBSyxFQUFFLGNBQWM7b0JBQ3JCLEtBQUssRUFBRSxDQUFDO2lCQUNSLENBQUM7WUFDRixHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQy9OLElBQUksbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2hDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsMkNBQW1DLENBQUM7Z0JBQzVHLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxpREFBaUQ7WUFDckQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxxREFBcUQsQ0FBQztZQUM5RixRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDLENBQUM7YUFDcEs7WUFDRCxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQy9OLElBQUksbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2hDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsNkNBQW9DLENBQUM7Z0JBQzdHLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx3Q0FBd0M7WUFDNUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxzQkFBc0IsQ0FBQztZQUMzRCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUM7aUJBQzVFLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7b0JBQzdCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztvQkFDcEosS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLEtBQUssRUFBRSxDQUFDO2lCQUNSLENBQUM7WUFDRixHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQzNELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sU0FBUyxHQUFHLE1BQU0saUJBQWlCLENBQUMsY0FBYyxDQUFDO29CQUN4RCxLQUFLLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLG1CQUFtQixDQUFDO29CQUN2RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUM1RCxjQUFjLEVBQUUsSUFBSTtvQkFDcEIsYUFBYSxFQUFFLElBQUk7b0JBQ25CLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztpQkFDbkgsQ0FBQyxDQUFDO2dCQUNILElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLHNDQUFzQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUN4RixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsc0NBQXNDO1lBQzFDLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLHdCQUF3QixDQUFDO1lBQ3hELElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtvQkFDMUIsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO2lCQUNqSixDQUFDO1lBQ0YsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFNBQXNCLEVBQUUsRUFBRTtnQkFDakUsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQzdFLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUUvRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sMEJBQTBCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsSixJQUFJLEtBQXdCLEVBQUUsYUFBYSxHQUFHLEtBQUssRUFBRSxjQUFjLEdBQUcsS0FBSyxDQUFDO2dCQUM1RSxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssVUFBVSxFQUFFLENBQUM7d0JBQzdCLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQzVCLE1BQU07b0JBQ1AsQ0FBQztvQkFDRCxhQUFhLEdBQUcsYUFBYSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0saUVBQTRDLENBQUM7b0JBQzFHLGNBQWMsR0FBRyxjQUFjLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSwyRUFBaUQsQ0FBQztnQkFDbEgsQ0FBQztnQkFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLE1BQU0sS0FBSyxDQUFDO2dCQUNiLENBQUM7Z0JBQ0QsSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDbkIsbUJBQW1CLENBQUMsTUFBTSxDQUN6QixRQUFRLENBQUMsSUFBSSxFQUNiLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsbUZBQW1GLENBQUM7d0JBQzdJLENBQUMsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsZ0ZBQWdGLENBQUMsRUFDaEksQ0FBQzs0QkFDQSxLQUFLLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLFlBQVksQ0FBQzs0QkFDNUQsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUU7eUJBQy9CLENBQUMsQ0FDRixDQUFDO2dCQUNILENBQUM7cUJBQ0ksSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDekIsbUJBQW1CLENBQUMsTUFBTSxDQUN6QixRQUFRLENBQUMsSUFBSSxFQUNiLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsNEVBQTRFLENBQUM7d0JBQ3ZJLENBQUMsQ0FBQyxRQUFRLENBQUMsa0NBQWtDLEVBQUUseUVBQXlFLENBQUMsRUFDMUgsQ0FBQzs0QkFDQSxLQUFLLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLG9CQUFvQixDQUFDOzRCQUM1RSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsMEJBQTBCLENBQUMsdUJBQXVCLEVBQUU7eUJBQy9ELENBQUMsQ0FDRixDQUFDO2dCQUNILENBQUM7cUJBQ0ksQ0FBQztvQkFDTCxtQkFBbUIsQ0FBQyxNQUFNLENBQ3pCLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsaUNBQWlDLENBQUMsRUFDbEwsRUFBRSxDQUNGLENBQUM7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDBEQUEwRDtZQUM5RCxLQUFLLEVBQUUsU0FBUyxDQUFDLDhCQUE4QixFQUFFLG9DQUFvQyxDQUFDO1lBQ3RGLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHNCQUFzQixFQUFFLHdCQUF3QixDQUFDO2lCQUN6RSxDQUFDO1lBQ0YsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQUU7Z0JBQ3pDLE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO2dCQUN0RixJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0JBQ2pDLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO3dCQUMzRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO3dCQUMxQyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7d0JBQ3ZFLFNBQVMsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGlDQUFpQyxDQUFDLENBQUM7d0JBQ3JGLFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO3dCQUM5QixTQUFTLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQzt3QkFDOUQsU0FBUyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsK0JBQStCLENBQUMsQ0FBQzt3QkFDcEcsU0FBUyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7d0JBQ2hDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTs0QkFDbEYsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUNqQixJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQ0FDckIsSUFBSSxDQUFDO29DQUNKLE1BQU0sMEJBQTBCLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQ0FDbEYsQ0FBQztnQ0FBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29DQUNoQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7b0NBQ1QsT0FBTztnQ0FDUixDQUFDOzRCQUNGLENBQUM7NEJBQ0QsQ0FBQyxFQUFFLENBQUM7d0JBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDSixXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDbEUsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNsQixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7b0JBQzNELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxjQUFjLENBQUM7d0JBQ2hFLGdCQUFnQixFQUFFLElBQUk7d0JBQ3RCLGNBQWMsRUFBRSxLQUFLO3dCQUNyQixhQUFhLEVBQUUsS0FBSzt3QkFDcEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxpQ0FBaUMsQ0FBQztxQkFDekUsQ0FBQyxDQUFDO29CQUNILElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUM1QixNQUFNLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLHVCQUF1QixHQUFHLElBQUksTUFBTSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdEUsWUFBWSxDQUFDLGNBQWMsQ0FBQywyQkFBMkIsRUFBRTtZQUN4RCxPQUFPLEVBQUUsdUJBQXVCO1lBQ2hDLEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsc0JBQXNCLENBQUM7WUFDM0QsS0FBSyxFQUFFLFlBQVk7WUFDbkIsS0FBSyxFQUFFLENBQUM7WUFDUixJQUFJLEVBQUUsVUFBVTtTQUNoQixDQUFDLENBQUM7UUFFSCxNQUFNLHdCQUF3QixHQUFHLDRCQUE0QixDQUFDO1FBQzlELE1BQU0sNkJBQTZCLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLEdBQUcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLG9DQUFtQixHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckwsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx3QkFBd0I7WUFDNUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSwwQkFBMEIsQ0FBQztZQUN0RSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLDZCQUE2QjtpQkFDbkMsRUFBRTtvQkFDRixFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixJQUFJLEVBQUUsNkJBQTZCO29CQUNuQyxLQUFLLEVBQUUsY0FBYztvQkFDckIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUM7YUFDckU7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7U0FDbkUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxtREFBbUQ7WUFDdkQsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSx5QkFBeUIsQ0FBQztZQUNwRSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLG1CQUFtQjtpQkFDekIsRUFBRTtvQkFDRixFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixJQUFJLEVBQUUsbUJBQW1CO29CQUN6QixLQUFLLEVBQUUsY0FBYztvQkFDckIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxjQUFjLENBQUM7YUFDN0U7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7U0FDbEUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx1REFBdUQ7WUFDM0QsS0FBSyxFQUFFLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSw2QkFBNkIsQ0FBQztZQUM1RSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLG1CQUFtQjtpQkFDekIsRUFBRTtvQkFDRixFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixJQUFJLEVBQUUsbUJBQW1CO29CQUN6QixLQUFLLEVBQUUsY0FBYztvQkFDckIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxhQUFhLENBQUM7YUFDakY7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUM7U0FDdEUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx5REFBeUQ7WUFDN0QsS0FBSyxFQUFFLFNBQVMsQ0FBQyw2QkFBNkIsRUFBRSxvQ0FBb0MsQ0FBQztZQUNyRixRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLG1CQUFtQjtpQkFDekIsRUFBRTtvQkFDRixFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixJQUFJLEVBQUUsbUJBQW1CO29CQUN6QixLQUFLLEVBQUUsY0FBYztvQkFDckIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxvQkFBb0IsQ0FBQzthQUN6RjtZQUNELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDO1NBQzVFLENBQUMsQ0FBQztRQUVILE1BQU0sK0JBQStCLEdBQUcsSUFBSSxNQUFNLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUN0RixZQUFZLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFO1lBQ3BELE9BQU8sRUFBRSwrQkFBK0I7WUFDeEMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLENBQUM7WUFDakQsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxvQ0FBbUIsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNwSixLQUFLLEVBQUUsY0FBYztZQUNyQixLQUFLLEVBQUUsQ0FBQztTQUNSLENBQUMsQ0FBQztRQUVILG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNoRCxJQUFJLENBQUMsdUJBQXVCLENBQUM7Z0JBQzVCLEVBQUUsRUFBRSx1Q0FBdUMsUUFBUSxFQUFFO2dCQUNyRCxLQUFLLEVBQUUsUUFBUTtnQkFDZixJQUFJLEVBQUUsQ0FBQzt3QkFDTixFQUFFLEVBQUUsK0JBQStCO3dCQUNuQyxJQUFJLEVBQUUsbUJBQW1CO3dCQUN6QixLQUFLLEVBQUUsS0FBSztxQkFDWixDQUFDO2dCQUNGLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLGNBQWMsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUM7YUFDOUYsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG1EQUFtRDtZQUN2RCxLQUFLLEVBQUUsU0FBUyxDQUFDLHVCQUF1QixFQUFFLDBCQUEwQixDQUFDO1lBQ3JFLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSx5QkFBeUIsRUFBRSxzQkFBc0IsQ0FBQztpQkFDcEcsRUFBRTtvQkFDRixFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixLQUFLLEVBQUUsYUFBYTtvQkFDcEIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUM7YUFDcEU7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7U0FDbEUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw4Q0FBOEM7WUFDbEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSx3QkFBd0IsQ0FBQztZQUM5RCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLFlBQVksRUFBRSxtQkFBbUI7WUFDakMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixLQUFLLEVBQUUsYUFBYTtvQkFDcEIsSUFBSSxFQUFFLG1CQUFtQjtvQkFDekIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxTQUFTLENBQUM7YUFDN0U7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7U0FDakUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxnREFBZ0Q7WUFDcEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQ0FBb0MsRUFBRSwwQ0FBMEMsQ0FBQztZQUNsRyxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUM7aUJBQzVFLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLHVCQUF1QjtvQkFDM0IsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHdCQUF3QixFQUFFLHlCQUF5QixDQUFDO2lCQUM1RSxDQUFDO1lBQ0YsVUFBVSxFQUFFO2dCQUNYLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHVCQUF1QixDQUFDO2FBQy9GO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7U0FDOUUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxtREFBbUQ7WUFDdkQsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSx5QkFBeUIsQ0FBQztZQUNwRSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLEVBQUUsc0JBQXNCLENBQUM7aUJBQ3BHLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLHVCQUF1QjtvQkFDM0IsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLEtBQUssRUFBRSxDQUFDO2lCQUNSLENBQUM7WUFDRixVQUFVLEVBQUU7Z0JBQ1gsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDO2FBQ25FO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO1NBQ2xFLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsb0RBQW9EO1lBQ3hELEtBQUssRUFBRSxTQUFTLENBQUMsd0JBQXdCLEVBQUUsMEJBQTBCLENBQUM7WUFDdEUsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDO2lCQUNwRyxFQUFFO29CQUNGLEVBQUUsRUFBRSx1QkFBdUI7b0JBQzNCLEtBQUssRUFBRSxhQUFhO29CQUNwQixLQUFLLEVBQUUsQ0FBQztpQkFDUixDQUFDO1lBQ0YsVUFBVSxFQUFFO2dCQUNYLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQzthQUNyRTtZQUNELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztTQUNuRSxDQUFDLENBQUM7UUFFSCxNQUFNLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDbEUsWUFBWSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRTtZQUNwRCxPQUFPLEVBQUUscUJBQXFCO1lBQzlCLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQztZQUN0QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFDckYsS0FBSyxFQUFFLFFBQVE7WUFDZixLQUFLLEVBQUUsQ0FBQztTQUNSLENBQUMsQ0FBQztRQUVIO1lBQ0MsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLEVBQUUsWUFBWSxFQUFFLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxFQUFFLGNBQWMsMENBQXFCLEVBQUU7WUFDOUosRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLEVBQUUsWUFBWSxFQUFFLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxFQUFFLGNBQWMsOENBQXVCLEVBQUU7WUFDckosRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxjQUFjLDRCQUFjLEVBQUU7WUFDdEksRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxZQUFZLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxFQUFFLEVBQUUsY0FBYyw0Q0FBc0IsRUFBRTtZQUMzSyxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxjQUFjLENBQUMsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxNQUFNLEVBQUUsRUFBRSw0QkFBNEIsQ0FBQyxNQUFNLEVBQUUsRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUU7U0FDblEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzVELE1BQU0scUJBQXFCLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDN0gsSUFBSSxDQUFDLHVCQUF1QixDQUFDO2dCQUM1QixFQUFFLEVBQUUsbUJBQW1CLEVBQUUsRUFBRTtnQkFDM0IsS0FBSztnQkFDTCxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUscUJBQXFCLENBQUM7Z0JBQ3BKLElBQUksRUFBRSxDQUFDO3dCQUNOLEVBQUUsRUFBRSxxQkFBcUI7d0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxxQkFBcUIsQ0FBQzt3QkFDNUcsS0FBSyxFQUFFLEtBQUs7cUJBQ1osQ0FBQztnQkFDRixPQUFPLEVBQUUsdUJBQXVCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO29CQUNmLE1BQU0sMkJBQTJCLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxvQkFBb0IsRUFBRSxDQUE2QyxDQUFDO29CQUN4SyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDakYsMkJBQTJCLEVBQUUsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDbEYsMkJBQTJCLEVBQUUsS0FBSyxFQUFFLENBQUM7Z0JBQ3RDLENBQUM7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsMERBQTBEO1lBQzlELEtBQUssRUFBRSxTQUFTLENBQUMsOEJBQThCLEVBQUUsaUNBQWlDLENBQUM7WUFDbkYsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUUsc0JBQXNCO1lBQzVCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLG9CQUFvQjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLDJCQUEyQjtnQkFDL0IsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNuRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQ3ZCLE1BQU0sMkJBQTJCLEdBQUcsaUJBQWlELENBQUM7b0JBQ3RGLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDdkMsMkJBQTJCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3JDLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw4Q0FBOEM7WUFDbEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUM7WUFDL0MsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUUsV0FBVztZQUNqQixFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtnQkFDN0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQztnQkFDeEQsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNuRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQ3ZCLE1BQU8saUJBQWtELENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3JFLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxtRUFBbUU7WUFDdkUsS0FBSyxFQUFFLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSwwQ0FBMEMsQ0FBQztZQUNwRyxJQUFJLEVBQUUsK0JBQStCO1lBQ3JDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxpQ0FBaUMsQ0FBQztnQkFDdEUsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxpQ0FBaUMsQ0FBd0MsQ0FBQztnQkFDdkksT0FBTyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQztZQUMvQyxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxtREFBbUQsQ0FBQyxFQUFFO1lBQzFELEtBQUssRUFBRSxtREFBbUQsQ0FBQyxLQUFLO1lBQ2hFLElBQUksRUFBRSx3QkFBd0I7WUFDOUIsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUscUJBQXFCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQztpQkFDaEQsRUFBRTtvQkFDRixFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxpQ0FBaUMsQ0FBQztvQkFDdEUsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxDQUFDO2lCQUNSLENBQUM7WUFDRixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbURBQW1ELEVBQUUsbURBQW1ELENBQUMsRUFBRSxFQUFFLG1EQUFtRCxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3RPLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsdUNBQXVDLENBQUMsRUFBRTtZQUM5QyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsdUNBQXVDLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSwwQ0FBMEMsRUFBRTtZQUNySCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQzthQUM3STtZQUNELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1Q0FBdUMsRUFBRSx1Q0FBdUMsQ0FBQyxFQUFFLEVBQUUsdUNBQXVDLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDbE0sQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELHlCQUF5QjtJQUNqQiwwQkFBMEI7UUFFakMsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO1lBQzFCLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxLQUFLO1lBQ2hDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO2FBQ3ZLO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQzVFLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLFNBQVMsR0FBRyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xILElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUM7b0JBQ3hFLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO29CQUM3QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHNCQUFzQixDQUFDLEVBQUU7WUFDN0IsS0FBSyxFQUFFLHNCQUFzQixDQUFDLEtBQUs7WUFDbkMsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsbUJBQW1CO2dCQUMxQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUM7YUFDMUs7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUM5RCxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDNUUsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sU0FBUyxHQUFHLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbEgsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztvQkFDM0UsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7b0JBQzdCLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNyQixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUseUJBQXlCLENBQUMsRUFBRTtZQUNoQyxLQUFLLEVBQUUseUJBQXlCLENBQUMsS0FBSztZQUN0QyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxtQkFBbUI7Z0JBQzFCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQzthQUM3SztZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUM1RSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDakUsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNsSCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO29CQUM5RSxNQUFNLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztvQkFDN0IsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxtREFBbUQ7WUFDdkQsS0FBSyxFQUFFLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSwwQkFBMEIsQ0FBQztZQUN4RSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxxQkFBcUI7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7YUFDeFE7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUM5RCxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDNUUsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFNLHlCQUF5QixDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEgseUJBQXlCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDNUUsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsaURBQWlEO1lBQ3JELEtBQUssRUFBRSxTQUFTLENBQUMsdUJBQXVCLEVBQUUsc0JBQXNCLENBQUM7WUFDakUsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUscUJBQXFCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2FBQ3RRO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQzVFLE1BQU0sU0FBUyxHQUFHLENBQUMsTUFBTSx5QkFBeUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BILHlCQUF5QixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGtDQUFrQyxDQUFDLEVBQUU7WUFDekMsS0FBSyxFQUFFLGtDQUFrQyxDQUFDLEtBQUs7WUFDL0MsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsVUFBVSwwQkFBMEIsRUFBRSxFQUFFLHVCQUF1QixDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDM1IsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsb0JBQW9CO2dCQUMzQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUN2QyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUNyRCxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQ3hDO2FBQ0Q7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDNUUsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JHLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7b0JBQ3ZGLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO29CQUM3QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG1DQUFtQyxDQUFDLEVBQUU7WUFDMUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLG1DQUFtQyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUseUJBQXlCLEVBQUU7WUFDaEcsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxZQUFZLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLDBCQUEwQixFQUFFLEVBQUUsS0FBSyxDQUFDO1lBQ2xGLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLG9CQUFvQjtnQkFDM0IsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7YUFDekg7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDNUUsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JHLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7b0JBQ3hGLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO29CQUM3QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLCtDQUErQztZQUNuRCxLQUFLLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLCtCQUErQixDQUFDO1lBQ3hFLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUscUJBQXFCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7YUFDcFc7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDNUUsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JHLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQUM7b0JBQ3BGLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO29CQUM3QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDZDQUE2QztZQUNqRCxLQUFLLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLDJCQUEyQixDQUFDO1lBQ3JFLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUscUJBQXFCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7YUFDMVY7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDNUUsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JHLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQUM7b0JBQ3BGLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO29CQUM3QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7WUFDMUIsS0FBSyxFQUFFLG1CQUFtQixDQUFDLEtBQUs7WUFDaEMsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUscUJBQXFCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQzthQUM1SjtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDN0UsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFNLDBCQUEwQixDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckgsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3hFLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO2dCQUM3QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNyQixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw2Q0FBNkM7WUFDakQsS0FBSyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO1lBQ3JDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLFdBQVc7Z0JBQ2xCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEVBQUUscUNBQXFDLENBQUM7Z0JBQzdQLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDakUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7dUJBQ3hILENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1RyxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsRUFBRSx3QkFBd0IsRUFBRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO29CQUNuSixNQUFNLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztvQkFDN0IsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxpREFBaUQ7WUFDckQsS0FBSyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSx1QkFBdUIsQ0FBQztZQUN2RSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxXQUFXO2dCQUNsQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLHVCQUF1QixDQUFDO2dCQUM5TyxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3VCQUN4SCxDQUFDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFO3dCQUNqRSx3QkFBd0IsRUFBRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsaUJBQWlCO3dCQUMzRSxlQUFlLEVBQUUsSUFBSTtxQkFDckIsQ0FBQyxDQUFDO29CQUNILE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO29CQUM3QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDJEQUEyRDtZQUMvRCxLQUFLLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLG1DQUFtQyxDQUFDO1lBQ3JGLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLFdBQVc7Z0JBQ2xCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLHVCQUF1QixDQUFDO2dCQUM3UyxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3VCQUN4SCxDQUFDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFO3dCQUNqRSxlQUFlLEVBQUUsSUFBSTt3QkFDckIsVUFBVSxFQUFFLElBQUk7cUJBQ2hCLENBQUMsQ0FBQztvQkFDSCxNQUFNLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztvQkFDN0IsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSwyQkFBMkIsQ0FBQyxFQUFFO1lBQ2xDLEtBQUssRUFBRSwyQkFBMkIsQ0FBQyxLQUFLO1lBQ3hDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLFdBQVc7Z0JBQ2xCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7Z0JBQ3JOLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDakUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7dUJBQ3hILENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1RyxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUFDLDJCQUEyQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDakcsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDJDQUEyQztZQUMvQyxLQUFLLEVBQUUsU0FBUyxDQUFDLDJDQUEyQyxFQUFFLE1BQU0sQ0FBQztZQUNyRSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxRQUFRO2FBQ2Y7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUM5RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7dUJBQ3hILENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1RyxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUMvRSxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUMvRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNwRyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDckYsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO29CQUN2RyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsMEJBQTBCLEVBQUUsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUMvSCxNQUFNLFlBQVksR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLEtBQUssV0FBVyxLQUFLLFFBQVEsS0FBSyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDM0csTUFBTSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ2hELENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw2Q0FBNkM7WUFDakQsS0FBSyxFQUFFLFNBQVMsQ0FBQyw2Q0FBNkMsRUFBRSxtQkFBbUIsQ0FBQztZQUNwRixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxRQUFRO2FBQ2Y7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztTQUNwRyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLHNDQUFzQyxFQUFFLFdBQVcsQ0FBQztZQUNyRSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxRQUFRO2dCQUNmLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFBRSxrQ0FBa0MsQ0FBQzthQUN0RztZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFDLEVBQUUsU0FBd0IsRUFBRSxFQUFFO2dCQUN0RSxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDekQsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQzNCLE1BQU0sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDekQsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHVDQUF1QztZQUMzQyxLQUFLLEVBQUUsU0FBUyxDQUFDLHVDQUF1QyxFQUFFLFVBQVUsQ0FBQztZQUNyRSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxhQUFhO2dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDaEksS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFVLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDakosQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxzQ0FBc0M7WUFDMUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDO1lBQ2pELElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUMzSyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkQ7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUM5RCxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM1RSxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxnREFBZ0Q7WUFDcEQsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSwyQkFBMkIsQ0FBQztZQUNwRSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQ2hPLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN2RDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNFLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHNEQUFzRDtZQUMxRCxLQUFLLEVBQUUsU0FBUyxDQUFDLHFEQUFxRCxFQUFFLHFCQUFxQixDQUFDO1lBQzlGLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLGFBQWE7Z0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO2dCQUNySSxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsR0FBRyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFVLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsY0FBYyxDQUFDLHVDQUF1QyxFQUFFLEVBQUUsQ0FBQztTQUMxSSxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGtEQUFrRDtZQUN0RCxLQUFLLEVBQUUsU0FBUyxDQUFDLGtEQUFrRCxFQUFFLG9CQUFvQixDQUFDO1lBQzFGLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLGFBQWE7Z0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO2dCQUM5SCxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDckosQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxzREFBc0Q7WUFDMUQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzREFBc0QsRUFBRSxpQ0FBaUMsQ0FBQztZQUMzRyxPQUFPLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQztZQUMzRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxhQUFhO2dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUNBQXFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDbFEsS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsWUFBMkIsRUFBRSxFQUFFO2dCQUNqRixNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDN0QsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBQ3ZMLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsaUNBQWlDLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3JGLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxpQ0FBaUM7WUFDckMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxtREFBbUQsRUFBRSxxQkFBcUIsQ0FBQztZQUM1RixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxhQUFhO2dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUFFLHVCQUF1QixFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3BLLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDM0csSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDaEYsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGtEQUFrRDtZQUN0RCxLQUFLLEVBQUUsU0FBUyxDQUFDLGtEQUFrRCxFQUFFLHVCQUF1QixDQUFDO1lBQzdGLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUM7Z0JBQ2xELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsaUNBQWlDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQztTQUN4SixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHVEQUF1RDtZQUMzRCxLQUFLLEVBQUUsU0FBUyxDQUFDLHVEQUF1RCxFQUFFLDZCQUE2QixDQUFDO1lBQ3hHLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUM7Z0JBQ3ZELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsaUNBQWlDLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQztTQUN6SixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG9FQUFvRTtZQUN4RSxLQUFLLEVBQUUsU0FBUyxDQUFDLG9FQUFvRSxFQUFFLGtDQUFrQyxDQUFDO1lBQzFILElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzVTLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsQ0FBQyxRQUEwQixFQUFFLEVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztTQUN6SCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHlFQUF5RTtZQUM3RSxLQUFLLEVBQUUsU0FBUyxDQUFDLHlFQUF5RSxFQUFFLHVDQUF1QyxDQUFDO1lBQ3BJLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7Z0JBQzlLLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsQ0FBQyxRQUEwQixFQUFFLEVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztTQUN6SCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDJEQUEyRDtZQUMvRCxLQUFLLEVBQUUsU0FBUyxDQUFDLDJEQUEyRCxFQUFFLDRDQUE0QyxDQUFDO1lBQzNILFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztnQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ2xJO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtnQkFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxnQ0FBZ0MsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7Z0JBQ3pGLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxZQUFZLFlBQVksZUFBZSxDQUFDLEVBQUUsQ0FBQztvQkFDOUQsT0FBTztnQkFDUixDQUFDO2dCQUNELE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3JGLE1BQU0sZUFBZSxHQUFHLE1BQU0sZ0NBQWdDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDcEYsSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQzNDLE9BQU87Z0JBQ1IsQ0FBQztnQkFDRCxNQUFNLGdDQUFnQyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFFLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGlFQUFpRTtZQUNyRSxLQUFLLEVBQUUsU0FBUyxDQUFDLGlFQUFpRSxFQUFFLG1EQUFtRCxDQUFDO1lBQ3hJLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztnQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQy9IO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLDJEQUEyRCxDQUFDO1NBQzFHLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsa0VBQWtFO1lBQ3RFLEtBQUssRUFBRSxTQUFTLENBQUMsa0VBQWtFLEVBQUUsb0RBQW9ELENBQUM7WUFDMUksUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2dCQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDbEk7WUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO2dCQUNuQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLGdDQUFnQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsQ0FBQztnQkFDekYsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksWUFBWSxlQUFlLENBQUMsRUFBRSxDQUFDO29CQUM5RCxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDckYsTUFBTSx1QkFBdUIsR0FBRyxNQUFNLGdDQUFnQyxDQUFDLDBCQUEwQixFQUFFLENBQUM7Z0JBQ3BHLElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQ25ELE9BQU87Z0JBQ1IsQ0FBQztnQkFDRCxNQUFNLGdDQUFnQyxDQUFDLDRCQUE0QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHdFQUF3RTtZQUM1RSxLQUFLLEVBQUUsU0FBUyxDQUFDLHdFQUF3RSxFQUFFLDJEQUEyRCxDQUFDO1lBQ3ZKLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztnQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQy9IO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLGtFQUFrRSxDQUFDO1NBQ2pILENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsNkNBQTZDLENBQUMsRUFBRTtZQUNwRCxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsNkNBQTZDLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSw4Q0FBOEMsRUFBRTtZQUMvSCxRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO2FBQ2xEO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDZDQUE2QyxFQUFFLDZDQUE2QyxDQUFDLEVBQUUsRUFBRSw2Q0FBNkMsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNwTixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHFEQUFxRDtZQUN6RCxLQUFLLEVBQUUsU0FBUyxDQUFDLHFEQUFxRCxFQUFFLHFDQUFxQyxDQUFDO1lBQzlHLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsRUFBRSxFQUFFLElBQUk7WUFDUixHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQzNELE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO2dCQUN0RixNQUFNLGlCQUFpQixHQUFHLDBCQUEwQixDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQzVFLE1BQU0scUJBQXFCLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDakUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxTQUFTO29CQUN2QixLQUFLLEVBQUUsU0FBUyxDQUFDLG9CQUFvQjtvQkFDckMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxTQUFTO29CQUNoQyxNQUFNLEVBQUUsSUFBSTtpQkFDWixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7b0JBQ2xFLFdBQVcsRUFBRSxJQUFJO29CQUNqQixLQUFLLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHFDQUFxQyxDQUFDO29CQUMzRSxXQUFXLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLGtDQUFrQyxDQUFDO2lCQUN6RixDQUFDLENBQUM7Z0JBQ0gsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztvQkFDL0IsS0FBSyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksaUJBQWlCLEVBQUUsQ0FBQzt3QkFDL0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFNBQVMsQ0FBQyxFQUFFLENBQUM7NEJBQzNDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDckMsQ0FBQztvQkFDRixDQUFDO29CQUNELGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZGLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztnQkFDdEUsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7SUFFSixDQUFDO0lBRU8sdUJBQXVCLENBQUMsc0JBQStDO1FBQzlFLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDMUosSUFBSSxrQkFBa0IsR0FBb0QsRUFBRSxDQUFDO1FBQzdFLE1BQU0sZUFBZSxHQUFzQyxFQUFFLENBQUM7UUFDOUQsSUFBSSxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN2QyxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUNuRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzFCLE1BQU0sU0FBUyxHQUFHLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRSxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDeEgsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLGtCQUFrQixHQUFHLEtBQUssQ0FBQztRQUM1QixDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztZQUNwRDtnQkFDQyxLQUFLLENBQUM7b0JBQ0wsR0FBRyxzQkFBc0I7b0JBQ3pCLElBQUksRUFBRSxrQkFBa0I7aUJBQ3hCLENBQUMsQ0FBQztZQUNKLENBQUM7WUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7Z0JBQzdDLE9BQU8sc0JBQXNCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ3RELENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVCLFdBQVcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFDRCxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0NBRUQsQ0FBQTtBQXozQ0ssdUJBQXVCO0lBRzFCLFdBQUEsaUNBQWlDLENBQUE7SUFDakMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGdDQUFnQyxDQUFBO0lBQ2hDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsb0NBQW9DLENBQUE7SUFDcEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxlQUFlLENBQUE7R0FiWix1QkFBdUIsQ0F5M0M1QjtBQUVELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBRTVCLFlBQzhCLDBCQUF1RCxFQUNuRSxjQUErQjtRQUVoRCx1QkFBdUIsQ0FBQywrQkFBK0IsQ0FBQywwQkFBMEIsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUNyRyxDQUFDO0NBQ0QsQ0FBQTtBQVJLLHVCQUF1QjtJQUcxQixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsZUFBZSxDQUFBO0dBSlosdUJBQXVCLENBUTVCO0FBRUQsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7SUFDakMsWUFDdUMsMEJBQWdFLEVBQzVFLHVCQUFpRCxFQUMxRCxjQUErQixFQUMvQixjQUErQjtRQUVoRCxNQUFNLDhCQUE4QixHQUFHLG1DQUFtQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLDhCQUE4QixvQ0FBMkIsRUFBRSxDQUFDO1lBQ25GLEtBQUssTUFBTSxPQUFPLElBQUksdUJBQXVCLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3hELDBCQUEwQixDQUFDLFlBQVksNkJBQXFCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztxQkFDckYsSUFBSSxDQUFDLEtBQUssRUFBQyxVQUFVLEVBQUMsRUFBRTtvQkFDeEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztvQkFDNUQsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQzt3QkFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDOzRCQUNyQyxTQUFTO3dCQUNWLENBQUM7d0JBQ0QsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQzdELElBQUksY0FBYyxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUM7K0JBQzlELENBQUMsU0FBUyxDQUFDLG9CQUFvQixJQUFJLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDOzRCQUMzSSxTQUFTO3dCQUNWLENBQUM7d0JBQ0QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxvQkFBb0IsRUFBRSxTQUFTLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO29CQUN2RyxDQUFDO29CQUNELElBQUksaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQzVCLDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7b0JBQzNFLENBQUM7b0JBQ0QsY0FBYyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxNQUFNLG1FQUFrRCxDQUFDO2dCQUMvRyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFoQ0ssNEJBQTRCO0lBRS9CLFdBQUEsb0NBQW9DLENBQUE7SUFDcEMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsZUFBZSxDQUFBO0dBTFosNEJBQTRCLENBZ0NqQztBQUVELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEcsaUJBQWlCLENBQUMsNkJBQTZCLENBQUMsdUJBQXVCLGtDQUEwQixDQUFDO0FBQ2xHLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLGFBQWEsb0NBQTRCLENBQUM7QUFDMUYsaUJBQWlCLENBQUMsNkJBQTZCLENBQUMseUJBQXlCLG9DQUE0QixDQUFDO0FBQ3RHLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLGdCQUFnQixrQ0FBMEIsQ0FBQztBQUMzRixpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQyxrQ0FBa0Msa0NBQTBCLENBQUM7QUFDN0csaUJBQWlCLENBQUMsNkJBQTZCLENBQUMsMkJBQTJCLG9DQUE0QixDQUFDO0FBQ3hHLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLDBCQUEwQixvQ0FBNEIsQ0FBQztBQUN2RyxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQyxzREFBc0Qsa0NBQTBCLENBQUM7QUFDakksaUJBQWlCLENBQUMsNkJBQTZCLENBQUMsaUNBQWlDLGtDQUEwQixDQUFDO0FBQzVHLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLHFDQUFxQyxvQ0FBNEIsQ0FBQztBQUNsSCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQyw0QkFBNEIsb0NBQTRCLENBQUM7QUFDekcsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUNYLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLHVCQUF1QixvQ0FBNEIsQ0FBQztBQUNyRyxDQUFDO0FBR0QscUJBQXFCO0FBQ3JCLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBRTdDLFFBQVEsQ0FBQyxFQUFFLENBQWtDLGdDQUFnQyxDQUFDLHNCQUFzQixDQUFDO0tBQ25HLCtCQUErQixDQUFDLENBQUM7UUFDakMsR0FBRyxFQUFFLDBCQUEwQjtRQUMvQixTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDOUIsSUFBSSxLQUFLLEtBQUssd0JBQXdCLEVBQUUsQ0FBQztnQkFDeEMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN6QixDQUFDO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO0tBQ0QsQ0FBQyxDQUFDLENBQUMifQ==