/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { URI } from '../../../../base/common/uri.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { Emitter } from '../../../../base/common/event.js';
import { IVoidSettingsService } from './voidSettingsService.js';
export const IMCPService = createDecorator('mcpConfigService');
const MCP_CONFIG_FILE_NAME = 'mcp.json';
const MCP_CONFIG_SAMPLE = { mcpServers: {} };
const MCP_CONFIG_SAMPLE_STRING = JSON.stringify(MCP_CONFIG_SAMPLE, null, 2);
// export interface MCPCallToolOfToolName {
// 	[toolName: string]: (params: any) => Promise<{
// 		result: any | Promise<any>,
// 		interruptTool?: () => void
// 	}>;
// }
let MCPService = class MCPService extends Disposable {
    // private readonly _onLoadingServersChange = new Emitter<MCPServerEventLoadingParam>();
    // public readonly onLoadingServersChange = this._onLoadingServersChange.event;
    constructor(fileService, pathService, productService, editorService, mainProcessService, voidSettingsService) {
        super();
        this.fileService = fileService;
        this.pathService = pathService;
        this.productService = productService;
        this.editorService = editorService;
        this.mainProcessService = mainProcessService;
        this.voidSettingsService = voidSettingsService;
        // list of MCP servers pulled from mcpChannel
        this.state = {
            mcpServerOfName: {},
            error: undefined,
        };
        // Emitters for server events
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._setMCPServerState = async (serverName, newServer) => {
            if (newServer === undefined) {
                // Remove the server from the state
                const { [serverName]: removed, ...remainingServers } = this.state.mcpServerOfName;
                this.state = {
                    ...this.state,
                    mcpServerOfName: remainingServers
                };
            }
            else {
                // Add or update the server
                this.state = {
                    ...this.state,
                    mcpServerOfName: {
                        ...this.state.mcpServerOfName,
                        [serverName]: newServer
                    }
                };
            }
            this._onDidChangeState.fire();
        };
        this._setHasError = async (errMsg) => {
            this.state = {
                ...this.state,
                error: errMsg,
            };
            this._onDidChangeState.fire();
        };
        this.channel = this.mainProcessService.getChannel('void-channel-mcp');
        const onEvent = (e) => {
            // console.log('GOT EVENT', e)
            this._setMCPServerState(e.response.name, e.response.newServer);
        };
        this._register(this.channel.listen('onAdd_server')(onEvent));
        this._register(this.channel.listen('onUpdate_server')(onEvent));
        this._register(this.channel.listen('onDelete_server')(onEvent));
        this._initialize();
    }
    async _initialize() {
        try {
            await this.voidSettingsService.waitForInitState;
            // Create .mcpConfig if it doesn't exist
            const mcpConfigUri = await this._getMCPConfigFilePath();
            const fileExists = await this._configFileExists(mcpConfigUri);
            if (!fileExists) {
                await this._createMCPConfigFile(mcpConfigUri);
                console.log('MCP Config file created:', mcpConfigUri.toString());
            }
            await this._addMCPConfigFileWatcher();
            await this._refreshMCPServers();
        }
        catch (error) {
            console.error('Error initializing MCPService:', error);
        }
    }
    // Create the file/directory if it doesn't exist
    async _createMCPConfigFile(mcpConfigUri) {
        await this.fileService.createFile(mcpConfigUri.with({ path: mcpConfigUri.path }));
        const buffer = VSBuffer.fromString(MCP_CONFIG_SAMPLE_STRING);
        await this.fileService.writeFile(mcpConfigUri, buffer);
    }
    async _addMCPConfigFileWatcher() {
        const mcpConfigUri = await this._getMCPConfigFilePath();
        this._register(this.fileService.watch(mcpConfigUri));
        this._register(this.fileService.onDidFilesChange(async (e) => {
            if (!e.contains(mcpConfigUri))
                return;
            await this._refreshMCPServers();
        }));
    }
    // Client-side functions
    async revealMCPConfigFile() {
        try {
            const mcpConfigUri = await this._getMCPConfigFilePath();
            await this.editorService.openEditor({
                resource: mcpConfigUri,
                options: {
                    pinned: true,
                    revealIfOpened: true,
                }
            });
        }
        catch (error) {
            console.error('Error opening MCP config file:', error);
        }
    }
    getMCPTools() {
        const allTools = [];
        for (const serverName in this.state.mcpServerOfName) {
            const server = this.state.mcpServerOfName[serverName];
            server.tools?.forEach(tool => {
                allTools.push({
                    description: tool.description || '',
                    params: this._transformInputSchemaToParams(tool.inputSchema),
                    name: tool.name,
                    mcpServerName: serverName,
                });
            });
        }
        if (allTools.length === 0)
            return undefined;
        return allTools;
    }
    _transformInputSchemaToParams(inputSchema) {
        // Check if inputSchema is valid
        if (!inputSchema || !inputSchema.properties)
            return {};
        const params = {};
        Object.keys(inputSchema.properties).forEach(paramName => {
            const propertyValues = inputSchema.properties[paramName];
            // Check if propertyValues is not an object
            if (typeof propertyValues !== 'object') {
                console.warn(`Invalid property value for ${paramName}: expected object, got ${typeof propertyValues}`);
                return; // in forEach the return is equivalent to continue
            }
            // Add the parameter to the params object
            params[paramName] = {
                description: JSON.stringify(propertyValues.description || '', null, 2) || '',
            };
        });
        return params;
    }
    async _getMCPConfigFilePath() {
        const appName = this.productService.dataFolderName;
        const userHome = await this.pathService.userHome();
        const uri = URI.joinPath(userHome, appName, MCP_CONFIG_FILE_NAME);
        return uri;
    }
    async _configFileExists(mcpConfigUri) {
        try {
            await this.fileService.stat(mcpConfigUri);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async _parseMCPConfigFile() {
        const mcpConfigUri = await this._getMCPConfigFilePath();
        try {
            const fileContent = await this.fileService.readFile(mcpConfigUri);
            const contentString = fileContent.value.toString();
            const configFileJson = JSON.parse(contentString);
            if (!configFileJson.mcpServers) {
                throw new Error('Missing mcpServers property');
            }
            return configFileJson;
        }
        catch (error) {
            const fullError = `Error parsing MCP config file: ${error}`;
            this._setHasError(fullError);
            return null;
        }
    }
    // Handle server state changes
    async _refreshMCPServers() {
        this._setHasError(undefined);
        const newConfigFileJSON = await this._parseMCPConfigFile();
        if (!newConfigFileJSON) {
            console.log(`Not setting state: MCP config file not found`);
            return;
        }
        if (!newConfigFileJSON?.mcpServers) {
            console.log(`Not setting state: MCP config file did not have an 'mcpServers' field`);
            return;
        }
        const oldConfigFileNames = Object.keys(this.state.mcpServerOfName);
        const newConfigFileNames = Object.keys(newConfigFileJSON.mcpServers);
        const addedServerNames = newConfigFileNames.filter(serverName => !oldConfigFileNames.includes(serverName)); // in new and not in old
        const removedServerNames = oldConfigFileNames.filter(serverName => !newConfigFileNames.includes(serverName)); // in old and not in new
        // set isOn to any new servers in the config
        const addedUserStateOfName = {};
        for (const name of addedServerNames) {
            addedUserStateOfName[name] = { isOn: true };
        }
        await this.voidSettingsService.addMCPUserStateOfNames(addedUserStateOfName);
        // delete isOn for any servers that no longer show up in the config
        await this.voidSettingsService.removeMCPUserStateOfNames(removedServerNames);
        // set all servers to loading
        for (const serverName in newConfigFileJSON.mcpServers) {
            this._setMCPServerState(serverName, { status: 'loading', tools: [] });
        }
        const updatedServerNames = Object.keys(newConfigFileJSON.mcpServers).filter(serverName => !addedServerNames.includes(serverName) && !removedServerNames.includes(serverName));
        this.channel.call('refreshMCPServers', {
            mcpConfigFileJSON: newConfigFileJSON,
            addedServerNames,
            removedServerNames,
            updatedServerNames,
            userStateOfName: this.voidSettingsService.state.mcpUserStateOfName,
        });
    }
    stringifyResult(result) {
        let toolResultStr;
        if (result.event === 'text') {
            toolResultStr = result.text;
        }
        else if (result.event === 'image') {
            toolResultStr = `[Image: ${result.image.mimeType}]`;
        }
        else if (result.event === 'audio') {
            toolResultStr = `[Audio content]`;
        }
        else if (result.event === 'resource') {
            toolResultStr = `[Resource content]`;
        }
        else {
            toolResultStr = JSON.stringify(result);
        }
        return toolResultStr;
    }
    // toggle MCP server and update isOn in void settings
    async toggleServerIsOn(serverName, isOn) {
        this._setMCPServerState(serverName, { status: 'loading', tools: [] });
        await this.voidSettingsService.setMCPServerState(serverName, { isOn });
        this.channel.call('toggleMCPServer', { serverName, isOn });
    }
    async callMCPTool(toolData) {
        const result = await this.channel.call('callTool', toolData);
        if (result.event === 'error') {
            throw new Error(`Error: ${result.text}`);
        }
        return { result };
    }
};
MCPService = __decorate([
    __param(0, IFileService),
    __param(1, IPathService),
    __param(2, IProductService),
    __param(3, IEditorService),
    __param(4, IMainProcessService),
    __param(5, IVoidSettingsService)
], MCPService);
registerSingleton(IMCPService, MCPService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vbWNwU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUU1RixPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFzQmhFLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQWMsa0JBQWtCLENBQUMsQ0FBQztBQUk1RSxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQztBQUN4QyxNQUFNLGlCQUFpQixHQUFHLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFBO0FBQzVD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