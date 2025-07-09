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
import { IConfigurationService } from '../../configuration/common/configuration.js';
let McpManagementCli = class McpManagementCli {
    constructor(_logger, _userConfigurationService) {
        this._logger = _logger;
        this._userConfigurationService = _userConfigurationService;
    }
    async addMcpDefinitions(definitions) {
        const configs = definitions.map((config) => this.validateConfiguration(config));
        await this.updateMcpInConfig(this._userConfigurationService, configs);
        this._logger.info(`Added MCP servers: ${configs.map(c => c.name).join(', ')}`);
    }
    async updateMcpInConfig(service, configs) {
        const mcp = service.getValue('mcp') || { servers: {} };
        mcp.servers ??= {};
        for (const config of configs) {
            mcp.servers[config.name] = config.config;
        }
        await service.updateValue('mcp', mcp);
    }
    validateConfiguration(config) {
        let parsed;
        try {
            parsed = JSON.parse(config);
        }
        catch (e) {
            throw new InvalidMcpOperationError(`Invalid JSON '${config}': ${e}`);
        }
        if (!parsed.name) {
            throw new InvalidMcpOperationError(`Missing name property in ${config}`);
        }
        if (!('command' in parsed) && !('url' in parsed)) {
            throw new InvalidMcpOperationError(`Missing command or URL property in ${config}`);
        }
        const { name, ...rest } = parsed;
        return { name, config: rest };
    }
};
McpManagementCli = __decorate([
    __param(1, IConfigurationService)
], McpManagementCli);
export { McpManagementCli };
class InvalidMcpOperationError extends Error {
    constructor(message) {
        super(message);
        this.stack = message;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudENsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tY3AvY29tbW9uL21jcE1hbmFnZW1lbnRDbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFNN0UsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7SUFDNUIsWUFDa0IsT0FBZ0IsRUFDTyx5QkFBZ0Q7UUFEdkUsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNPLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBdUI7SUFDckYsQ0FBQztJQUVMLEtBQUssQ0FBQyxpQkFBaUIsQ0FDdEIsV0FBcUI7UUFFckIsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEYsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUE4QixFQUFFLE9BQTBCO1FBQ3pGLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQW9CLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQzFFLEdBQUcsQ0FBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBRW5CLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7WUFDOUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUMxQyxDQUFDO1FBRUQsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRU8scUJBQXFCLENBQUMsTUFBYztRQUMzQyxJQUFJLE1BQWlELENBQUM7UUFDdEQsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksd0JBQXdCLENBQUMsaUJBQWlCLE1BQU0sTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xCLE1BQU0sSUFBSSx3QkFBd0IsQ0FBQyw0QkFBNEIsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNsRCxNQUFNLElBQUksd0JBQXdCLENBQUMsc0NBQXNDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUM7UUFDakMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBcUQsRUFBRSxDQUFDO0lBQ2hGLENBQUM7Q0FDRCxDQUFBO0FBNUNZLGdCQUFnQjtJQUcxQixXQUFBLHFCQUFxQixDQUFBO0dBSFgsZ0JBQWdCLENBNEM1Qjs7QUFFRCxNQUFNLHdCQUF5QixTQUFRLEtBQUs7SUFDM0MsWUFBWSxPQUFlO1FBQzFCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0lBQ3RCLENBQUM7Q0FDRCJ9