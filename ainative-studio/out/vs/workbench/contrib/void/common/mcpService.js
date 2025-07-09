/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9tY3BTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRTVGLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQXNCaEUsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBYyxrQkFBa0IsQ0FBQyxDQUFDO0FBSTVFLE1BQU0sb0JBQW9CLEdBQUcsVUFBVSxDQUFDO0FBQ3hDLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUE7QUFDNUMsTUFB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