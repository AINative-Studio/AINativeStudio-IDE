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
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../base/common/assert.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { parse as parseJsonc } from '../../../../base/common/jsonc.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { getConfigValueInTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { mcpConfigurationSection, mcpStdioServerSchema } from '../common/mcpConfiguration.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { McpServerOptionsCommand } from './mcpCommands.js';
var AddConfigurationType;
(function (AddConfigurationType) {
    AddConfigurationType[AddConfigurationType["Stdio"] = 0] = "Stdio";
    AddConfigurationType[AddConfigurationType["SSE"] = 1] = "SSE";
    AddConfigurationType[AddConfigurationType["NpmPackage"] = 2] = "NpmPackage";
    AddConfigurationType[AddConfigurationType["PipPackage"] = 3] = "PipPackage";
    AddConfigurationType[AddConfigurationType["DockerImage"] = 4] = "DockerImage";
})(AddConfigurationType || (AddConfigurationType = {}));
const assistedTypes = {
    [2 /* AddConfigurationType.NpmPackage */]: {
        title: localize('mcp.npm.title', "Enter NPM Package Name"),
        placeholder: localize('mcp.npm.placeholder', "Package name (e.g., @org/package)"), pickLabel: localize('mcp.serverType.npm', "NPM Package"),
        pickDescription: localize('mcp.serverType.npm.description', "Install from an NPM package name")
    },
    [3 /* AddConfigurationType.PipPackage */]: {
        title: localize('mcp.pip.title', "Enter Pip Package Name"),
        placeholder: localize('mcp.pip.placeholder', "Package name (e.g., package-name)"),
        pickLabel: localize('mcp.serverType.pip', "Pip Package"),
        pickDescription: localize('mcp.serverType.pip.description', "Install from a Pip package name")
    },
    [4 /* AddConfigurationType.DockerImage */]: {
        title: localize('mcp.docker.title', "Enter Docker Image Name"),
        placeholder: localize('mcp.docker.placeholder', "Image name (e.g., mcp/imagename)"),
        pickLabel: localize('mcp.serverType.docker', "Docker Image"),
        pickDescription: localize('mcp.serverType.docker.description', "Install from a Docker image")
    },
};
var AddConfigurationCopilotCommand;
(function (AddConfigurationCopilotCommand) {
    /** Returns whether MCP enhanced setup is enabled. */
    AddConfigurationCopilotCommand["IsSupported"] = "github.copilot.chat.mcp.setup.check";
    /** Takes an npm/pip package name, validates its owner. */
    AddConfigurationCopilotCommand["ValidatePackage"] = "github.copilot.chat.mcp.setup.validatePackage";
    /** Returns the resolved MCP configuration. */
    AddConfigurationCopilotCommand["StartFlow"] = "github.copilot.chat.mcp.setup.flow";
})(AddConfigurationCopilotCommand || (AddConfigurationCopilotCommand = {}));
let McpAddConfigurationCommand = class McpAddConfigurationCommand {
    constructor(_explicitConfigUri, _quickInputService, _configurationService, _jsonEditingService, _workspaceService, _environmentService, _commandService, _mcpRegistry, _openerService, _editorService, _fileService, _notificationService, _telemetryService) {
        this._explicitConfigUri = _explicitConfigUri;
        this._quickInputService = _quickInputService;
        this._configurationService = _configurationService;
        this._jsonEditingService = _jsonEditingService;
        this._workspaceService = _workspaceService;
        this._environmentService = _environmentService;
        this._commandService = _commandService;
        this._mcpRegistry = _mcpRegistry;
        this._openerService = _openerService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this._notificationService = _notificationService;
        this._telemetryService = _telemetryService;
    }
    async getServerType() {
        const items = [
            { kind: 0 /* AddConfigurationType.Stdio */, label: localize('mcp.serverType.command', "Command (stdio)"), description: localize('mcp.serverType.command.description', "Run a local command that implements the MCP protocol") },
            { kind: 1 /* AddConfigurationType.SSE */, label: localize('mcp.serverType.http', "HTTP (server-sent events)"), description: localize('mcp.serverType.http.description', "Connect to a remote HTTP server that implements the MCP protocol") }
        ];
        let aiSupported;
        try {
            aiSupported = await this._commandService.executeCommand("github.copilot.chat.mcp.setup.check" /* AddConfigurationCopilotCommand.IsSupported */);
        }
        catch {
            // ignored
        }
        if (aiSupported) {
            items.unshift({ type: 'separator', label: localize('mcp.serverType.manual', "Manual Install") });
            items.push({ type: 'separator', label: localize('mcp.serverType.copilot', "Model-Assisted") }, ...Object.entries(assistedTypes).map(([type, { pickLabel, pickDescription }]) => ({
                kind: Number(type),
                label: pickLabel,
                description: pickDescription,
            })));
        }
        const result = await this._quickInputService.pick(items, {
            placeHolder: localize('mcp.serverType.placeholder', "Choose the type of MCP server to add"),
        });
        return result?.kind;
    }
    async getStdioConfig() {
        const command = await this._quickInputService.input({
            title: localize('mcp.command.title', "Enter Command"),
            placeHolder: localize('mcp.command.placeholder', "Command to run (with optional arguments)"),
            ignoreFocusLost: true,
        });
        if (!command) {
            return undefined;
        }
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: 'stdio'
        });
        // Split command into command and args, handling quotes
        const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g);
        return {
            type: 'stdio',
            command: parts[0].replace(/"/g, ''),
            args: parts.slice(1).map(arg => arg.replace(/"/g, ''))
        };
    }
    async getSSEConfig() {
        const url = await this._quickInputService.input({
            title: localize('mcp.url.title', "Enter Server URL"),
            placeHolder: localize('mcp.url.placeholder', "URL of the MCP server (e.g., http://localhost:3000)"),
            ignoreFocusLost: true,
        });
        if (!url) {
            return undefined;
        }
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: 'sse'
        });
        return {
            type: 'sse',
            url
        };
    }
    async getServerId(suggestion = `my-mcp-server-${generateUuid().split('-')[0]}`) {
        const id = await this._quickInputService.input({
            title: localize('mcp.serverId.title', "Enter Server ID"),
            placeHolder: localize('mcp.serverId.placeholder', "Unique identifier for this server"),
            value: suggestion,
            ignoreFocusLost: true,
        });
        return id;
    }
    async getConfigurationTarget() {
        const options = [
            { target: 2 /* ConfigurationTarget.USER */, label: localize('mcp.target.user', "User Settings"), description: localize('mcp.target.user.description', "Available in all workspaces") }
        ];
        if (!!this._environmentService.remoteAuthority) {
            options.push({ target: 4 /* ConfigurationTarget.USER_REMOTE */, label: localize('mcp.target.remote', "Remote Settings"), description: localize('mcp.target..remote.description', "Available on this remote machine") });
        }
        if (this._workspaceService.getWorkspace().folders.length > 0) {
            options.push({ target: 5 /* ConfigurationTarget.WORKSPACE */, label: localize('mcp.target.workspace', "Workspace Settings"), description: localize('mcp.target.workspace.description', "Available in this workspace") });
        }
        if (options.length === 1) {
            return options[0].target;
        }
        const targetPick = await this._quickInputService.pick(options, {
            title: localize('mcp.target.title', "Choose where to save the configuration"),
        });
        return targetPick?.target;
    }
    async getAssistedConfig(type) {
        const packageName = await this._quickInputService.input({
            ignoreFocusLost: true,
            title: assistedTypes[type].title,
            placeHolder: assistedTypes[type].placeholder,
        });
        if (!packageName) {
            return undefined;
        }
        let LoadAction;
        (function (LoadAction) {
            LoadAction["Retry"] = "retry";
            LoadAction["Cancel"] = "cancel";
            LoadAction["Allow"] = "allow";
        })(LoadAction || (LoadAction = {}));
        const loadingQuickPickStore = new DisposableStore();
        const loadingQuickPick = loadingQuickPickStore.add(this._quickInputService.createQuickPick());
        loadingQuickPick.title = localize('mcp.loading.title', "Loading package details...");
        loadingQuickPick.busy = true;
        loadingQuickPick.ignoreFocusOut = true;
        const packageType = this.getPackageType(type);
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: packageType
        });
        this._commandService.executeCommand("github.copilot.chat.mcp.setup.validatePackage" /* AddConfigurationCopilotCommand.ValidatePackage */, {
            type: packageType,
            name: packageName,
            targetConfig: {
                ...mcpStdioServerSchema,
                properties: {
                    ...mcpStdioServerSchema.properties,
                    name: {
                        type: 'string',
                        description: 'Suggested name of the server, alphanumeric and hyphen only',
                    }
                },
                required: [...(mcpStdioServerSchema.required || []), 'name'],
            },
        }).then(result => {
            if (!result || result.state === 'error') {
                loadingQuickPick.title = result?.error || 'Unknown error loading package';
                loadingQuickPick.items = [{ id: "retry" /* LoadAction.Retry */, label: localize('mcp.error.retry', 'Try a different package') }, { id: "cancel" /* LoadAction.Cancel */, label: localize('cancel', 'Cancel') }];
            }
            else {
                loadingQuickPick.title = localize('mcp.confirmPublish', 'Install {0} from {1}?', packageName, result.publisher);
                loadingQuickPick.items = [
                    { id: "allow" /* LoadAction.Allow */, label: localize('allow', "Allow") },
                    { id: "cancel" /* LoadAction.Cancel */, label: localize('cancel', 'Cancel') }
                ];
            }
            loadingQuickPick.busy = false;
        });
        const loadingAction = await new Promise(resolve => {
            loadingQuickPick.onDidAccept(() => resolve(loadingQuickPick.selectedItems[0]?.id));
            loadingQuickPick.onDidHide(() => resolve(undefined));
            loadingQuickPick.show();
        }).finally(() => loadingQuickPick.dispose());
        switch (loadingAction) {
            case "retry" /* LoadAction.Retry */:
                return this.getAssistedConfig(type);
            case "allow" /* LoadAction.Allow */:
                break;
            case "cancel" /* LoadAction.Cancel */:
            default:
                return undefined;
        }
        const configWithName = await this._commandService.executeCommand("github.copilot.chat.mcp.setup.flow" /* AddConfigurationCopilotCommand.StartFlow */, {
            name: packageName,
            type: packageType
        });
        if (!configWithName) {
            return undefined;
        }
        const { name, ...config } = configWithName;
        return { name, config };
    }
    /** Shows the location of a server config once it's discovered. */
    showOnceDiscovered(name) {
        const store = new DisposableStore();
        store.add(autorun(reader => {
            const colls = this._mcpRegistry.collections.read(reader);
            const match = mapFindFirst(colls, collection => mapFindFirst(collection.serverDefinitions.read(reader), server => server.label === name ? { server, collection } : undefined));
            if (match) {
                if (match.collection.presentation?.origin) {
                    this._openerService.openEditor({
                        resource: match.collection.presentation.origin,
                        options: {
                            selection: match.server.presentation?.origin?.range,
                            preserveFocus: true,
                        }
                    });
                }
                else {
                    this._commandService.executeCommand(McpServerOptionsCommand.id, name);
                }
                store.dispose();
            }
        }));
        store.add(disposableTimeout(() => store.dispose(), 5000));
    }
    writeToUserSetting(name, config, target, inputs) {
        const settings = { ...getConfigValueInTarget(this._configurationService.inspect(mcpConfigurationSection), target) };
        settings.servers = { ...settings.servers, [name]: config };
        if (inputs) {
            settings.inputs = [...(settings.inputs || []), ...inputs];
        }
        return this._configurationService.updateValue(mcpConfigurationSection, settings, target);
    }
    async run() {
        // Step 1: Choose server type
        const serverType = await this.getServerType();
        if (serverType === undefined) {
            return;
        }
        // Step 2: Get server details based on type
        let serverConfig;
        let suggestedName;
        switch (serverType) {
            case 0 /* AddConfigurationType.Stdio */:
                serverConfig = await this.getStdioConfig();
                break;
            case 1 /* AddConfigurationType.SSE */:
                serverConfig = await this.getSSEConfig();
                break;
            case 2 /* AddConfigurationType.NpmPackage */:
            case 3 /* AddConfigurationType.PipPackage */:
            case 4 /* AddConfigurationType.DockerImage */: {
                const r = await this.getAssistedConfig(serverType);
                serverConfig = r?.config;
                suggestedName = r?.name;
                break;
            }
            default:
                assertNever(serverType);
        }
        if (!serverConfig) {
            return;
        }
        // Step 3: Get server ID
        const serverId = await this.getServerId(suggestedName);
        if (!serverId) {
            return;
        }
        // Step 4: Choose configuration target if no configUri provided
        let target;
        const workspace = this._workspaceService.getWorkspace();
        if (!this._explicitConfigUri) {
            target = await this.getConfigurationTarget();
            if (!target) {
                return;
            }
        }
        // Step 5: Update configuration
        const writeToUriDirect = this._explicitConfigUri
            ? URI.parse(this._explicitConfigUri)
            : target === 5 /* ConfigurationTarget.WORKSPACE */ && workspace.folders.length === 1
                ? URI.joinPath(workspace.folders[0].uri, '.vscode', 'mcp.json')
                : undefined;
        if (writeToUriDirect) {
            await this._jsonEditingService.write(writeToUriDirect, [{
                    path: ['servers', serverId],
                    value: serverConfig
                }], true);
        }
        else {
            await this.writeToUserSetting(serverId, serverConfig, target);
        }
        const packageType = this.getPackageType(serverType);
        if (packageType) {
            this._telemetryService.publicLog2('mcp.addserver.completed', {
                packageType,
                serverType: serverConfig.type,
                target: target === 5 /* ConfigurationTarget.WORKSPACE */ ? 'workspace' : 'user'
            });
        }
        this.showOnceDiscovered(serverId);
    }
    async pickForUrlHandler(resource, showIsPrimary = false) {
        const name = decodeURIComponent(basename(resource)).replace(/\.json$/, '');
        const placeHolder = localize('install.title', 'Install MCP server {0}', name);
        const items = [
            { id: 'install', label: localize('install.start', 'Install Server'), description: localize('install.description', 'Install in your user settings') },
            { id: 'show', label: localize('install.show', 'Show Configuration', name) },
            { id: 'rename', label: localize('install.rename', 'Rename "{0}"', name) },
            { id: 'cancel', label: localize('cancel', 'Cancel') },
        ];
        if (showIsPrimary) {
            [items[0], items[1]] = [items[1], items[0]];
        }
        const pick = await this._quickInputService.pick(items, { placeHolder, ignoreFocusLost: true });
        const getEditors = () => this._editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)
            .filter(e => e.editor.resource?.toString() === resource.toString());
        switch (pick?.id) {
            case 'show':
                await this._editorService.openEditor({ resource });
                break;
            case 'install':
                await this._editorService.save(getEditors());
                try {
                    const contents = await this._fileService.readFile(resource);
                    const { inputs, ...config } = parseJsonc(contents.value.toString());
                    await this.writeToUserSetting(name, config, 3 /* ConfigurationTarget.USER_LOCAL */, inputs);
                    this._editorService.closeEditors(getEditors());
                    this.showOnceDiscovered(name);
                }
                catch (e) {
                    this._notificationService.error(localize('install.error', 'Error installing MCP server {0}: {1}', name, e.message));
                    await this._editorService.openEditor({ resource });
                }
                break;
            case 'rename': {
                const newName = await this._quickInputService.input({ placeHolder: localize('install.newName', 'Enter new name'), value: name });
                if (newName) {
                    const newURI = resource.with({ path: `/${encodeURIComponent(newName)}.json` });
                    await this._editorService.save(getEditors());
                    await this._fileService.move(resource, newURI);
                    return this.pickForUrlHandler(newURI, showIsPrimary);
                }
                break;
            }
        }
    }
    getPackageType(serverType) {
        switch (serverType) {
            case 2 /* AddConfigurationType.NpmPackage */:
                return 'npm';
            case 3 /* AddConfigurationType.PipPackage */:
                return 'pip';
            case 4 /* AddConfigurationType.DockerImage */:
                return 'docker';
            case 0 /* AddConfigurationType.Stdio */:
                return 'stdio';
            case 1 /* AddConfigurationType.SSE */:
                return 'sse';
            default:
                return undefined;
        }
    }
};
McpAddConfigurationCommand = __decorate([
    __param(1, IQuickInputService),
    __param(2, IConfigurationService),
    __param(3, IJSONEditingService),
    __param(4, IWorkspaceContextService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, ICommandService),
    __param(7, IMcpRegistry),
    __param(8, IEditorService),
    __param(9, IEditorService),
    __param(10, IFileService),
    __param(11, INotificationService),
    __param(12, ITelemetryService)
], McpAddConfigurationCommand);
export { McpAddConfigurationCommand };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHNBZGRDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwQ29tbWFuZHNBZGRDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDckUsT0FBTyxFQUFFLEtBQUssSUFBSSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUF1QixzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hKLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQWtDLE1BQU0sc0RBQXNELENBQUM7QUFDMUgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBMEIsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFM0QsSUFBVyxvQkFPVjtBQVBELFdBQVcsb0JBQW9CO0lBQzlCLGlFQUFLLENBQUE7SUFDTCw2REFBRyxDQUFBO0lBRUgsMkVBQVUsQ0FBQTtJQUNWLDJFQUFVLENBQUE7SUFDViw2RUFBVyxDQUFBO0FBQ1osQ0FBQyxFQVBVLG9CQUFvQixLQUFwQixvQkFBb0IsUUFPOUI7QUFJRCxNQUFNLGFBQWEsR0FBRztJQUNyQix5Q0FBaUMsRUFBRTtRQUNsQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSx3QkFBd0IsQ0FBQztRQUMxRCxXQUFXLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLG1DQUFtQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxhQUFhLENBQUM7UUFDM0ksZUFBZSxFQUFFLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxrQ0FBa0MsQ0FBQztLQUMvRjtJQUNELHlDQUFpQyxFQUFFO1FBQ2xDLEtBQUssRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLHdCQUF3QixDQUFDO1FBQzFELFdBQVcsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsbUNBQW1DLENBQUM7UUFDakYsU0FBUyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxhQUFhLENBQUM7UUFDeEQsZUFBZSxFQUFFLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxpQ0FBaUMsQ0FBQztLQUM5RjtJQUNELDBDQUFrQyxFQUFFO1FBQ25DLEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUseUJBQXlCLENBQUM7UUFDOUQsV0FBVyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxrQ0FBa0MsQ0FBQztRQUNuRixTQUFTLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGNBQWMsQ0FBQztRQUM1RCxlQUFlLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLDZCQUE2QixDQUFDO0tBQzdGO0NBQ0QsQ0FBQztBQUVGLElBQVcsOEJBU1Y7QUFURCxXQUFXLDhCQUE4QjtJQUN4QyxxREFBcUQ7SUFDckQscUZBQW1ELENBQUE7SUFFbkQsMERBQTBEO0lBQzFELG1HQUFpRSxDQUFBO0lBRWpFLDhDQUE4QztJQUM5QyxrRkFBZ0QsQ0FBQTtBQUNqRCxDQUFDLEVBVFUsOEJBQThCLEtBQTlCLDhCQUE4QixRQVN4QztBQXlCTSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEwQjtJQUN0QyxZQUNrQixrQkFBc0MsRUFDbEIsa0JBQXNDLEVBQ25DLHFCQUE0QyxFQUM5QyxtQkFBd0MsRUFDbkMsaUJBQTJDLEVBQ3ZDLG1CQUFpRCxFQUM5RCxlQUFnQyxFQUNuQyxZQUEwQixFQUN4QixjQUE4QixFQUM5QixjQUE4QixFQUNoQyxZQUEwQixFQUNsQixvQkFBMEMsRUFDN0MsaUJBQW9DO1FBWnZELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNuQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDbkMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEwQjtRQUN2Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQThCO1FBQzlELG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNuQyxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDOUIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ2hDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQ2xCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDN0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtJQUNyRSxDQUFDO0lBRUcsS0FBSyxDQUFDLGFBQWE7UUFDMUIsTUFBTSxLQUFLLEdBQXNFO1lBQ2hGLEVBQUUsSUFBSSxvQ0FBNEIsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGlCQUFpQixDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxzREFBc0QsQ0FBQyxFQUFFO1lBQ3ZOLEVBQUUsSUFBSSxrQ0FBMEIsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDJCQUEyQixDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxrRUFBa0UsQ0FBQyxFQUFFO1NBQ3JPLENBQUM7UUFFRixJQUFJLFdBQWdDLENBQUM7UUFDckMsSUFBSSxDQUFDO1lBQ0osV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLHdGQUFxRCxDQUFDO1FBQzlHLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixVQUFVO1FBQ1gsQ0FBQztRQUVELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqRyxLQUFLLENBQUMsSUFBSSxDQUNULEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGdCQUFnQixDQUFDLEVBQUUsRUFDbEYsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2pGLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUF5QjtnQkFDMUMsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLFdBQVcsRUFBRSxlQUFlO2FBQzVCLENBQUMsQ0FBQyxDQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFrRCxLQUFLLEVBQUU7WUFDekcsV0FBVyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxzQ0FBc0MsQ0FBQztTQUMzRixDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjO1FBQzNCLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztZQUNuRCxLQUFLLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGVBQWUsQ0FBQztZQUNyRCxXQUFXLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLDBDQUEwQyxDQUFDO1lBQzVGLGVBQWUsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUF5QyxlQUFlLEVBQUU7WUFDMUYsV0FBVyxFQUFFLE9BQU87U0FDcEIsQ0FBQyxDQUFDO1FBRUgsdURBQXVEO1FBQ3ZELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUUsQ0FBQztRQUN0RCxPQUFPO1lBQ04sSUFBSSxFQUFFLE9BQU87WUFDYixPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBRW5DLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3RELENBQUM7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLFlBQVk7UUFDekIsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1lBQy9DLEtBQUssRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDO1lBQ3BELFdBQVcsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUscURBQXFELENBQUM7WUFDbkcsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQXlDLGVBQWUsRUFBRTtZQUMxRixXQUFXLEVBQUUsS0FBSztTQUNsQixDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ04sSUFBSSxFQUFFLEtBQUs7WUFDWCxHQUFHO1NBQ0gsQ0FBQztJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQVUsR0FBRyxpQkFBaUIsWUFBWSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ3JGLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztZQUM5QyxLQUFLLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDO1lBQ3hELFdBQVcsRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsbUNBQW1DLENBQUM7WUFDdEYsS0FBSyxFQUFFLFVBQVU7WUFDakIsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU8sS0FBSyxDQUFDLHNCQUFzQjtRQUNuQyxNQUFNLE9BQU8sR0FBeUQ7WUFDckUsRUFBRSxNQUFNLGtDQUEwQixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSw2QkFBNkIsQ0FBQyxFQUFFO1NBQzlLLENBQUM7UUFFRixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0seUNBQWlDLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsa0NBQWtDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDak4sQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDOUQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sdUNBQStCLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsa0NBQWtDLEVBQUUsNkJBQTZCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbE4sQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDMUIsQ0FBQztRQUdELE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDOUQsS0FBSyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSx3Q0FBd0MsQ0FBQztTQUM3RSxDQUFDLENBQUM7UUFFSCxPQUFPLFVBQVUsRUFBRSxNQUFNLENBQUM7SUFDM0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUErQjtRQUM5RCxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7WUFDdkQsZUFBZSxFQUFFLElBQUk7WUFDckIsS0FBSyxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLO1lBQ2hDLFdBQVcsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVztTQUM1QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQVcsVUFJVjtRQUpELFdBQVcsVUFBVTtZQUNwQiw2QkFBZSxDQUFBO1lBQ2YsK0JBQWlCLENBQUE7WUFDakIsNkJBQWUsQ0FBQTtRQUNoQixDQUFDLEVBSlUsVUFBVSxLQUFWLFVBQVUsUUFJcEI7UUFFRCxNQUFNLHFCQUFxQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEQsTUFBTSxnQkFBZ0IsR0FBRyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBdUMsQ0FBQyxDQUFDO1FBQ25JLGdCQUFnQixDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUNyRixnQkFBZ0IsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQzdCLGdCQUFnQixDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFdkMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU5QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUF5QyxlQUFlLEVBQUU7WUFDMUYsV0FBVyxFQUFFLFdBQVk7U0FDekIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLHVHQUVsQztZQUNDLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFlBQVksRUFBRTtnQkFDYixHQUFHLG9CQUFvQjtnQkFDdkIsVUFBVSxFQUFFO29CQUNYLEdBQUcsb0JBQW9CLENBQUMsVUFBVTtvQkFDbEMsSUFBSSxFQUFFO3dCQUNMLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSw0REFBNEQ7cUJBQ3pFO2lCQUNEO2dCQUNELFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO2FBQzVEO1NBQ0QsQ0FDRCxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNmLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLEtBQUssS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDekMsZ0JBQWdCLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxLQUFLLElBQUksK0JBQStCLENBQUM7Z0JBQzFFLGdCQUFnQixDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxnQ0FBa0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHlCQUF5QixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsa0NBQW1CLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3BMLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ2hILGdCQUFnQixDQUFDLEtBQUssR0FBRztvQkFDeEIsRUFBRSxFQUFFLGdDQUFrQixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFO29CQUMzRCxFQUFFLEVBQUUsa0NBQW1CLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUU7aUJBQzlELENBQUM7WUFDSCxDQUFDO1lBQ0QsZ0JBQWdCLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQXlCLE9BQU8sQ0FBQyxFQUFFO1lBQ3pFLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkYsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3JELGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRTdDLFFBQVEsYUFBYSxFQUFFLENBQUM7WUFDdkI7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckM7Z0JBQ0MsTUFBTTtZQUNQLHNDQUF1QjtZQUN2QjtnQkFDQyxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsc0ZBRS9EO1lBQ0MsSUFBSSxFQUFFLFdBQVc7WUFDakIsSUFBSSxFQUFFLFdBQVc7U0FDakIsQ0FDRCxDQUFDO1FBRUYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxFQUFFLEdBQUcsY0FBYyxDQUFDO1FBQzNDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVELGtFQUFrRTtJQUMxRCxrQkFBa0IsQ0FBQyxJQUFZO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFDckcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDeEUsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxDQUFDO29CQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQzt3QkFDOUIsUUFBUSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLE1BQU07d0JBQzlDLE9BQU8sRUFBRTs0QkFDUixTQUFTLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFLEtBQUs7NEJBQ25ELGFBQWEsRUFBRSxJQUFJO3lCQUNuQjtxQkFDRCxDQUFDLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdkUsQ0FBQztnQkFFRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixLQUFLLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxJQUFZLEVBQUUsTUFBOEIsRUFBRSxNQUEyQixFQUFFLE1BQTBCO1FBQy9ILE1BQU0sUUFBUSxHQUFzQixFQUFFLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBb0IsdUJBQXVCLENBQUMsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQzFKLFFBQVEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUMzRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVNLEtBQUssQ0FBQyxHQUFHO1FBQ2YsNkJBQTZCO1FBQzdCLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzlDLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzlCLE9BQU87UUFDUixDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLElBQUksWUFBZ0QsQ0FBQztRQUNyRCxJQUFJLGFBQWlDLENBQUM7UUFDdEMsUUFBUSxVQUFVLEVBQUUsQ0FBQztZQUNwQjtnQkFDQyxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzNDLE1BQU07WUFDUDtnQkFDQyxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3pDLE1BQU07WUFDUCw2Q0FBcUM7WUFDckMsNkNBQXFDO1lBQ3JDLDZDQUFxQyxDQUFDLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ25ELFlBQVksR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDO2dCQUN6QixhQUFhLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQztnQkFDeEIsTUFBTTtZQUNQLENBQUM7WUFDRDtnQkFDQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1IsQ0FBQztRQUVELHdCQUF3QjtRQUN4QixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTztRQUNSLENBQUM7UUFFRCwrREFBK0Q7UUFDL0QsSUFBSSxNQUF1QyxDQUFDO1FBQzVDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE9BQU87WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUVELCtCQUErQjtRQUMvQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxrQkFBa0I7WUFDL0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1lBQ3BDLENBQUMsQ0FBQyxNQUFNLDBDQUFrQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUM7Z0JBQzNFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUM7Z0JBQy9ELENBQUMsQ0FBQyxTQUFTLENBQUM7UUFFZCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQ3ZELElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7b0JBQzNCLEtBQUssRUFBRSxZQUFZO2lCQUNuQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDWCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUEyRCx5QkFBeUIsRUFBRTtnQkFDdEgsV0FBVztnQkFDWCxVQUFVLEVBQUUsWUFBWSxDQUFDLElBQUk7Z0JBQzdCLE1BQU0sRUFBRSxNQUFNLDBDQUFrQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU07YUFDdkUsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU0sS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQWEsRUFBRSxhQUFhLEdBQUcsS0FBSztRQUNsRSxNQUFNLElBQUksR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxlQUFlLEVBQUUsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFOUUsTUFBTSxLQUFLLEdBQXFCO1lBQy9CLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsK0JBQStCLENBQUMsRUFBRTtZQUNwSixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDM0UsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ3pFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRTtTQUNyRCxDQUFDO1FBQ0YsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMvRixNQUFNLFVBQVUsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsMkNBQW1DO2FBQ3hGLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRXJFLFFBQVEsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ2xCLEtBQUssTUFBTTtnQkFDVixNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDbkQsTUFBTTtZQUNQLEtBQUssU0FBUztnQkFDYixNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7Z0JBQzdDLElBQUksQ0FBQztvQkFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1RCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxFQUFFLEdBQTRELFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7b0JBQzdILE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxNQUFNLDBDQUFrQyxNQUFNLENBQUMsQ0FBQztvQkFDcEYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztvQkFDL0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQixDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHNDQUFzQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDcEgsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ3BELENBQUM7Z0JBQ0QsTUFBTTtZQUNQLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDZixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ2pJLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO29CQUMvRSxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7b0JBQzdDLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUMvQyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ3RELENBQUM7Z0JBQ0QsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxVQUFnQztRQUN0RCxRQUFRLFVBQVUsRUFBRSxDQUFDO1lBQ3BCO2dCQUNDLE9BQU8sS0FBSyxDQUFDO1lBQ2Q7Z0JBQ0MsT0FBTyxLQUFLLENBQUM7WUFDZDtnQkFDQyxPQUFPLFFBQVEsQ0FBQztZQUNqQjtnQkFDQyxPQUFPLE9BQU8sQ0FBQztZQUNoQjtnQkFDQyxPQUFPLEtBQUssQ0FBQztZQUNkO2dCQUNDLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWhaWSwwQkFBMEI7SUFHcEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFlBQUEsaUJBQWlCLENBQUE7R0FkUCwwQkFBMEIsQ0FnWnRDIn0=