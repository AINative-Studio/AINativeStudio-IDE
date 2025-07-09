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
import { ProxyChannel } from '../../../../../base/parts/ipc/common/ipc.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { NativeMcpDiscoveryHelperChannelName } from '../../../../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { NativeFilesystemMcpDiscovery } from './nativeMcpDiscoveryAbstract.js';
/**
 * Discovers MCP servers on the remote filesystem, if any.
 */
let RemoteNativeMpcDiscovery = class RemoteNativeMpcDiscovery extends NativeFilesystemMcpDiscovery {
    constructor(remoteAgent, logService, labelService, fileService, instantiationService, mcpRegistry, configurationService) {
        super(remoteAgent.getConnection()?.remoteAuthority || null, labelService, fileService, instantiationService, mcpRegistry, configurationService);
        this.remoteAgent = remoteAgent;
        this.logService = logService;
    }
    async start() {
        const connection = this.remoteAgent.getConnection();
        if (!connection) {
            return this.setDetails(undefined);
        }
        await connection.withChannel(NativeMcpDiscoveryHelperChannelName, async (channel) => {
            const service = ProxyChannel.toService(channel);
            service.load().then(data => this.setDetails(data), err => {
                this.logService.warn('Error getting remote process MCP environment', err);
                this.setDetails(undefined);
            });
        });
    }
};
RemoteNativeMpcDiscovery = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ILogService),
    __param(2, ILabelService),
    __param(3, IFileService),
    __param(4, IInstantiationService),
    __param(5, IMcpRegistry),
    __param(6, IConfigurationService)
], RemoteNativeMpcDiscovery);
export { RemoteNativeMpcDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwUmVtb3RlRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vZGlzY292ZXJ5L25hdGl2ZU1jcFJlbW90ZURpc2NvdmVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFvQyxtQ0FBbUMsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUvRTs7R0FFRztBQUNJLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsNEJBQTRCO0lBQ3pFLFlBQ3VDLFdBQWdDLEVBQ3hDLFVBQXVCLEVBQ3RDLFlBQTJCLEVBQzVCLFdBQXlCLEVBQ2hCLG9CQUEyQyxFQUNwRCxXQUF5QixFQUNoQixvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsRUFBRSxlQUFlLElBQUksSUFBSSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFSMUcsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBQ3hDLGVBQVUsR0FBVixVQUFVLENBQWE7SUFRdEQsQ0FBQztJQUVlLEtBQUssQ0FBQyxLQUFLO1FBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBRUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLG1DQUFtQyxFQUFFLEtBQUssRUFBQyxPQUFPLEVBQUMsRUFBRTtZQUNqRixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFtQyxPQUFPLENBQUMsQ0FBQztZQUVsRixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUNsQixJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQzdCLEdBQUcsQ0FBQyxFQUFFO2dCQUNMLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLENBQUMsQ0FDRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQS9CWSx3QkFBd0I7SUFFbEMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxxQkFBcUIsQ0FBQTtHQVJYLHdCQUF3QixDQStCcEMifQ==