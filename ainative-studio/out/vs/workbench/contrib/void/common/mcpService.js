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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL21jcFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFNUYsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBc0JoRSxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFjLGtCQUFrQixDQUFDLENBQUM7QUFJNUUsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUM7QUFDeEMsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQTtBQUM1QyxNQUFN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