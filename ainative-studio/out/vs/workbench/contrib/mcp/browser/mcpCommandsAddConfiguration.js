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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHNBZGRDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcENvbW1hbmRzQWRkQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLElBQUksVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBdUIsc0JBQXNCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoSixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxF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