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
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { isWeb, OS } from '../../../../base/common/platform.js';
import { Schemas } from '../../../../base/common/network.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { localize, localize2 } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { PersistentConnection } from '../../../../platform/remote/common/remoteAgentConnection.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { DownloadServiceChannel } from '../../../../platform/download/common/downloadIpc.js';
import { RemoteLoggerChannelClient } from '../../../../platform/log/common/logIpc.js';
import { REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS } from '../../../../platform/remote/common/remote.js';
import product from '../../../../platform/product/common/product.js';
const EXTENSION_IDENTIFIER_PATTERN = '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$';
let LabelContribution = class LabelContribution {
    static { this.ID = 'workbench.contrib.remoteLabel'; }
    constructor(labelService, remoteAgentService) {
        this.labelService = labelService;
        this.remoteAgentService = remoteAgentService;
        this.registerFormatters();
    }
    registerFormatters() {
        this.remoteAgentService.getEnvironment().then(remoteEnvironment => {
            const os = remoteEnvironment?.os || OS;
            const formatting = {
                label: '${path}',
                separator: os === 1 /* OperatingSystem.Windows */ ? '\\' : '/',
                tildify: os !== 1 /* OperatingSystem.Windows */,
                normalizeDriveLetter: os === 1 /* OperatingSystem.Windows */,
                workspaceSuffix: isWeb ? undefined : Schemas.vscodeRemote
            };
            this.labelService.registerFormatter({
                scheme: Schemas.vscodeRemote,
                formatting
            });
            if (remoteEnvironment) {
                this.labelService.registerFormatter({
                    scheme: Schemas.vscodeUserData,
                    formatting
                });
            }
        });
    }
};
LabelContribution = __decorate([
    __param(0, ILabelService),
    __param(1, IRemoteAgentService)
], LabelContribution);
export { LabelContribution };
let RemoteChannelsContribution = class RemoteChannelsContribution extends Disposable {
    constructor(remoteAgentService, downloadService, loggerService) {
        super();
        const connection = remoteAgentService.getConnection();
        if (connection) {
            connection.registerChannel('download', new DownloadServiceChannel(downloadService));
            connection.withChannel('logger', async (channel) => this._register(new RemoteLoggerChannelClient(loggerService, channel)));
        }
    }
};
RemoteChannelsContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IDownloadService),
    __param(2, ILoggerService)
], RemoteChannelsContribution);
let RemoteInvalidWorkspaceDetector = class RemoteInvalidWorkspaceDetector extends Disposable {
    static { this.ID = 'workbench.contrib.remoteInvalidWorkspaceDetector'; }
    constructor(fileService, dialogService, environmentService, contextService, fileDialogService, remoteAgentService) {
        super();
        this.fileService = fileService;
        this.dialogService = dialogService;
        this.environmentService = environmentService;
        this.contextService = contextService;
        this.fileDialogService = fileDialogService;
        // When connected to a remote workspace, we currently cannot
        // validate that the workspace exists before actually opening
        // it. As such, we need to check on that after startup and guide
        // the user to a valid workspace.
        // (see https://github.com/microsoft/vscode/issues/133872)
        if (this.environmentService.remoteAuthority) {
            remoteAgentService.getEnvironment().then(remoteEnv => {
                if (remoteEnv) {
                    // we use the presence of `remoteEnv` to figure out
                    // if we got a healthy remote connection
                    // (see https://github.com/microsoft/vscode/issues/135331)
                    this.validateRemoteWorkspace();
                }
            });
        }
    }
    async validateRemoteWorkspace() {
        const workspace = this.contextService.getWorkspace();
        const workspaceUriToStat = workspace.configuration ?? workspace.folders.at(0)?.uri;
        if (!workspaceUriToStat) {
            return; // only when in workspace
        }
        const exists = await this.fileService.exists(workspaceUriToStat);
        if (exists) {
            return; // all good!
        }
        const res = await this.dialogService.confirm({
            type: 'warning',
            message: localize('invalidWorkspaceMessage', "Workspace does not exist"),
            detail: localize('invalidWorkspaceDetail', "Please select another workspace to open."),
            primaryButton: localize({ key: 'invalidWorkspacePrimary', comment: ['&& denotes a mnemonic'] }, "&&Open Workspace...")
        });
        if (res.confirmed) {
            // Pick Workspace
            if (workspace.configuration) {
                return this.fileDialogService.pickWorkspaceAndOpen({});
            }
            // Pick Folder
            return this.fileDialogService.pickFolderAndOpen({});
        }
    }
};
RemoteInvalidWorkspaceDetector = __decorate([
    __param(0, IFileService),
    __param(1, IDialogService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IWorkspaceContextService),
    __param(4, IFileDialogService),
    __param(5, IRemoteAgentService)
], RemoteInvalidWorkspaceDetector);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
registerWorkbenchContribution2(LabelContribution.ID, LabelContribution, 1 /* WorkbenchPhase.BlockStartup */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteChannelsContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(RemoteInvalidWorkspaceDetector.ID, RemoteInvalidWorkspaceDetector, 1 /* WorkbenchPhase.BlockStartup */);
const enableDiagnostics = true;
if (enableDiagnostics) {
    class TriggerReconnectAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.triggerReconnect',
                title: localize2('triggerReconnect', 'Connection: Trigger Reconnect'),
                category: Categories.Developer,
                f1: true,
            });
        }
        async run(accessor) {
            PersistentConnection.debugTriggerReconnection();
        }
    }
    class PauseSocketWriting extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.pauseSocketWriting',
                title: localize2('pauseSocketWriting', 'Connection: Pause socket writing'),
                category: Categories.Developer,
                f1: true,
            });
        }
        async run(accessor) {
            PersistentConnection.debugPauseSocketWriting();
        }
    }
    registerAction2(TriggerReconnectAction);
    registerAction2(PauseSocketWriting);
}
const extensionKindSchema = {
    type: 'string',
    enum: [
        'ui',
        'workspace'
    ],
    enumDescriptions: [
        localize('ui', "UI extension kind. In a remote window, such extensions are enabled only when available on the local machine."),
        localize('workspace', "Workspace extension kind. In a remote window, such extensions are enabled only when available on the remote.")
    ],
};
Registry.as(ConfigurationExtensions.Configuration)
    .registerConfiguration({
    id: 'remote',
    title: localize('remote', "Remote"),
    type: 'object',
    properties: {
        'remote.extensionKind': {
            type: 'object',
            markdownDescription: localize('remote.extensionKind', "Override the kind of an extension. `ui` extensions are installed and run on the local machine while `workspace` extensions are run on the remote. By overriding an extension's default kind using this setting, you specify if that extension should be installed and enabled locally or remotely."),
            patternProperties: {
                [EXTENSION_IDENTIFIER_PATTERN]: {
                    oneOf: [{ type: 'array', items: extensionKindSchema }, extensionKindSchema],
                    default: ['ui'],
                },
            },
            default: {
                'pub.name': ['ui']
            }
        },
        'remote.restoreForwardedPorts': {
            type: 'boolean',
            markdownDescription: localize('remote.restoreForwardedPorts', "Restores the ports you forwarded in a workspace."),
            default: true
        },
        'remote.autoForwardPorts': {
            type: 'boolean',
            markdownDescription: localize('remote.autoForwardPorts', "When enabled, new running processes are detected and ports that they listen on are automatically forwarded. Disabling this setting will not prevent all ports from being forwarded. Even when disabled, extensions will still be able to cause ports to be forwarded, and opening some URLs will still cause ports to forwarded. Also see {0}.", '`#remote.autoForwardPortsSource#`'),
            default: true
        },
        'remote.autoForwardPortsSource': {
            type: 'string',
            markdownDescription: localize('remote.autoForwardPortsSource', "Sets the source from which ports are automatically forwarded when {0} is true. When {0} is false, {1} will be used to find information about ports that have already been forwarded. On Windows and macOS remotes, the `process` and `hybrid` options have no effect and `output` will be used.", '`#remote.autoForwardPorts#`', '`#remote.autoForwardPortsSource#`'),
            enum: ['process', 'output', 'hybrid'],
            enumDescriptions: [
                localize('remote.autoForwardPortsSource.process', "Ports will be automatically forwarded when discovered by watching for processes that are started and include a port."),
                localize('remote.autoForwardPortsSource.output', "Ports will be automatically forwarded when discovered by reading terminal and debug output. Not all processes that use ports will print to the integrated terminal or debug console, so some ports will be missed. Ports forwarded based on output will not be \"un-forwarded\" until reload or until the port is closed by the user in the Ports view."),
                localize('remote.autoForwardPortsSource.hybrid', "Ports will be automatically forwarded when discovered by reading terminal and debug output. Not all processes that use ports will print to the integrated terminal or debug console, so some ports will be missed. Ports will be \"un-forwarded\" by watching for processes that listen on that port to be terminated.")
            ],
            default: 'process'
        },
        'remote.autoForwardPortsFallback': {
            type: 'number',
            default: 20,
            markdownDescription: localize('remote.autoForwardPortFallback', "The number of auto forwarded ports that will trigger the switch from `process` to `hybrid` when automatically forwarding ports and `remote.autoForwardPortsSource` is set to `process` by default. Set to `0` to disable the fallback. When `remote.autoForwardPortsFallback` hasn't been configured, but `remote.autoForwardPortsSource` has, `remote.autoForwardPortsFallback` will be treated as though it's set to `0`.")
        },
        'remote.forwardOnOpen': {
            type: 'boolean',
            description: localize('remote.forwardOnClick', "Controls whether local URLs with a port will be forwarded when opened from the terminal and the debug console."),
            default: true
        },
        // Consider making changes to extensions\configuration-editing\schemas\devContainer.schema.src.json
        // and extensions\configuration-editing\schemas\attachContainer.schema.json
        // to keep in sync with devcontainer.json schema.
        'remote.portsAttributes': {
            type: 'object',
            patternProperties: {
                '(^\\d+(-\\d+)?$)|(.+)': {
                    type: 'object',
                    description: localize('remote.portsAttributes.port', "A port, range of ports (ex. \"40000-55000\"), host and port (ex. \"db:1234\"), or regular expression (ex. \".+\\\\/server.js\").  For a port number or range, the attributes will apply to that port number or range of port numbers. Attributes which use a regular expression will apply to ports whose associated process command line matches the expression."),
                    properties: {
                        'onAutoForward': {
                            type: 'string',
                            enum: ['notify', 'openBrowser', 'openBrowserOnce', 'openPreview', 'silent', 'ignore'],
                            enumDescriptions: [
                                localize('remote.portsAttributes.notify', "Shows a notification when a port is automatically forwarded."),
                                localize('remote.portsAttributes.openBrowser', "Opens the browser when the port is automatically forwarded. Depending on your settings, this could open an embedded browser."),
                                localize('remote.portsAttributes.openBrowserOnce', "Opens the browser when the port is automatically forwarded, but only the first time the port is forward during a session. Depending on your settings, this could open an embedded browser."),
                                localize('remote.portsAttributes.openPreview', "Opens a preview in the same window when the port is automatically forwarded."),
                                localize('remote.portsAttributes.silent', "Shows no notification and takes no action when this port is automatically forwarded."),
                                localize('remote.portsAttributes.ignore', "This port will not be automatically forwarded.")
                            ],
                            description: localize('remote.portsAttributes.onForward', "Defines the action that occurs when the port is discovered for automatic forwarding"),
                            default: 'notify'
                        },
                        'elevateIfNeeded': {
                            type: 'boolean',
                            description: localize('remote.portsAttributes.elevateIfNeeded', "Automatically prompt for elevation (if needed) when this port is forwarded. Elevate is required if the local port is a privileged port."),
                            default: false
                        },
                        'label': {
                            type: 'string',
                            description: localize('remote.portsAttributes.label', "Label that will be shown in the UI for this port."),
                            default: localize('remote.portsAttributes.labelDefault', "Application")
                        },
                        'requireLocalPort': {
                            type: 'boolean',
                            markdownDescription: localize('remote.portsAttributes.requireLocalPort', "When true, a modal dialog will show if the chosen local port isn't used for forwarding."),
                            default: false
                        },
                        'protocol': {
                            type: 'string',
                            enum: ['http', 'https'],
                            description: localize('remote.portsAttributes.protocol', "The protocol to use when forwarding this port.")
                        }
                    },
                    default: {
                        'label': localize('remote.portsAttributes.labelDefault', "Application"),
                        'onAutoForward': 'notify'
                    }
                }
            },
            markdownDescription: localize('remote.portsAttributes', "Set properties that are applied when a specific port number is forwarded. For example:\n\n```\n\"3000\": {\n  \"label\": \"Application\"\n},\n\"40000-55000\": {\n  \"onAutoForward\": \"ignore\"\n},\n\".+\\\\/server.js\": {\n \"onAutoForward\": \"openPreview\"\n}\n```"),
            defaultSnippets: [{ body: { '${1:3000}': { label: '${2:Application}', onAutoForward: 'openPreview' } } }],
            errorMessage: localize('remote.portsAttributes.patternError', "Must be a port number, range of port numbers, or regular expression."),
            additionalProperties: false,
            default: {
                '443': {
                    'protocol': 'https'
                },
                '8443': {
                    'protocol': 'https'
                }
            }
        },
        'remote.otherPortsAttributes': {
            type: 'object',
            properties: {
                'onAutoForward': {
                    type: 'string',
                    enum: ['notify', 'openBrowser', 'openPreview', 'silent', 'ignore'],
                    enumDescriptions: [
                        localize('remote.portsAttributes.notify', "Shows a notification when a port is automatically forwarded."),
                        localize('remote.portsAttributes.openBrowser', "Opens the browser when the port is automatically forwarded. Depending on your settings, this could open an embedded browser."),
                        localize('remote.portsAttributes.openPreview', "Opens a preview in the same window when the port is automatically forwarded."),
                        localize('remote.portsAttributes.silent', "Shows no notification and takes no action when this port is automatically forwarded."),
                        localize('remote.portsAttributes.ignore', "This port will not be automatically forwarded.")
                    ],
                    description: localize('remote.portsAttributes.onForward', "Defines the action that occurs when the port is discovered for automatic forwarding"),
                    default: 'notify'
                },
                'elevateIfNeeded': {
                    type: 'boolean',
                    description: localize('remote.portsAttributes.elevateIfNeeded', "Automatically prompt for elevation (if needed) when this port is forwarded. Elevate is required if the local port is a privileged port."),
                    default: false
                },
                'label': {
                    type: 'string',
                    description: localize('remote.portsAttributes.label', "Label that will be shown in the UI for this port."),
                    default: localize('remote.portsAttributes.labelDefault', "Application")
                },
                'requireLocalPort': {
                    type: 'boolean',
                    markdownDescription: localize('remote.portsAttributes.requireLocalPort', "When true, a modal dialog will show if the chosen local port isn't used for forwarding."),
                    default: false
                },
                'protocol': {
                    type: 'string',
                    enum: ['http', 'https'],
                    description: localize('remote.portsAttributes.protocol', "The protocol to use when forwarding this port.")
                }
            },
            defaultSnippets: [{ body: { onAutoForward: 'ignore' } }],
            markdownDescription: localize('remote.portsAttributes.defaults', "Set default properties that are applied to all ports that don't get properties from the setting {0}. For example:\n\n```\n{\n  \"onAutoForward\": \"ignore\"\n}\n```", '`#remote.portsAttributes#`'),
            additionalProperties: false
        },
        'remote.localPortHost': {
            type: 'string',
            enum: ['localhost', 'allInterfaces'],
            default: 'localhost',
            description: localize('remote.localPortHost', "Specifies the local host name that will be used for port forwarding.")
        },
        [REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS]: {
            type: 'array',
            markdownDescription: localize('remote.defaultExtensionsIfInstalledLocally.markdownDescription', 'List of extensions to install upon connection to a remote when already installed locally.'),
            default: product?.remoteDefaultExtensionsIfInstalledLocally || [],
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                patternErrorMessage: localize('remote.defaultExtensionsIfInstalledLocally.invalidFormat', 'Extension identifier must be in format "publisher.name".')
            },
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvY29tbW9uL3JlbW90ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEyRSxVQUFVLElBQUksbUJBQW1CLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5TCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLGFBQWEsRUFBMkIsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRyxPQUFPLEVBQW1CLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFFbkosT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsd0JBQXdC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