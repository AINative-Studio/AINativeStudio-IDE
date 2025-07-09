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
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { NativeMcpDiscoveryHelperChannelName } from '../../../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { NativeFilesystemMcpDiscovery } from '../common/discovery/nativeMcpDiscoveryAbstract.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
let NativeMcpDiscovery = class NativeMcpDiscovery extends NativeFilesystemMcpDiscovery {
    constructor(mainProcess, logService, labelService, fileService, instantiationService, mcpRegistry, configurationService) {
        super(null, labelService, fileService, instantiationService, mcpRegistry, configurationService);
        this.mainProcess = mainProcess;
        this.logService = logService;
    }
    start() {
        const service = ProxyChannel.toService(this.mainProcess.getChannel(NativeMcpDiscoveryHelperChannelName));
        service.load().then(data => this.setDetails(data), err => {
            this.logService.warn('Error getting main process MCP environment', err);
            this.setDetails(undefined);
        });
    }
};
NativeMcpDiscovery = __decorate([
    __param(0, IMainProcessService),
    __param(1, ILogService),
    __param(2, ILabelService),
    __param(3, IFileService),
    __param(4, IInstantiationService),
    __param(5, IMcpRegistry),
    __param(6, IConfigurationService)
], NativeMcpDiscovery);
export { NativeMcpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTXBjRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZU1wY0Rpc2NvdmVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFvQyxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3BKLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLDRCQUE0QjtJQUNuRSxZQUN1QyxXQUFnQyxFQUN4QyxVQUF1QixFQUN0QyxZQUEyQixFQUM1QixXQUF5QixFQUNoQixvQkFBMkMsRUFDcEQsV0FBeUIsRUFDaEIsb0JBQTJDO1FBRWxFLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQVIxRCxnQkFBVyxHQUFYLFdBQVcsQ0FBcUI7UUFDeEMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQVF0RCxDQUFDO0lBRWUsS0FBSztRQUNwQixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsU0FBUyxDQUNyQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUM7UUFFbkUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FDbEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUM3QixHQUFHLENBQUMsRUFBRTtZQUNMLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3hFLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUNELENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQXpCWSxrQkFBa0I7SUFFNUIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxxQkFBcUIsQ0FBQTtHQVJYLGtCQUFrQixDQXlCOUIifQ==