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
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITerminalLogService } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITerminalInstanceService } from '../browser/terminal.js';
import { BaseTerminalProfileResolverService } from '../browser/terminalProfileResolverService.js';
import { ITerminalProfileService } from '../common/terminal.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
let ElectronTerminalProfileResolverService = class ElectronTerminalProfileResolverService extends BaseTerminalProfileResolverService {
    constructor(configurationResolverService, configurationService, historyService, logService, workspaceContextService, terminalProfileService, remoteAgentService, terminalInstanceService) {
        super({
            getDefaultSystemShell: async (remoteAuthority, platform) => {
                const backend = await terminalInstanceService.getBackend(remoteAuthority);
                if (!backend) {
                    throw new ErrorNoTelemetry(`Cannot get default system shell when there is no backend for remote authority '${remoteAuthority}'`);
                }
                return backend.getDefaultSystemShell(platform);
            },
            getEnvironment: async (remoteAuthority) => {
                const backend = await terminalInstanceService.getBackend(remoteAuthority);
                if (!backend) {
                    throw new ErrorNoTelemetry(`Cannot get environment when there is no backend for remote authority '${remoteAuthority}'`);
                }
                return backend.getEnvironment();
            }
        }, configurationService, configurationResolverService, historyService, logService, terminalProfileService, workspaceContextService, remoteAgentService);
    }
};
ElectronTerminalProfileResolverService = __decorate([
    __param(0, IConfigurationResolverService),
    __param(1, IConfigurationService),
    __param(2, IHistoryService),
    __param(3, ITerminalLogService),
    __param(4, IWorkspaceContextService),
    __param(5, ITerminalProfileService),
    __param(6, IRemoteAgentService),
    __param(7, ITerminalInstanceService)
], ElectronTerminalProfileResolverService);
export { ElectronTerminalProfileResolverService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2VsZWN0cm9uLXNhbmRib3gvdGVybWluYWxQcm9maWxlUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVyRixJQUFNLHNDQUFzQyxHQUE1QyxNQUFNLHNDQUF1QyxTQUFRLGtDQUFrQztJQUU3RixZQUNnQyw0QkFBMkQsRUFDbkUsb0JBQTJDLEVBQ2pELGNBQStCLEVBQzNCLFVBQStCLEVBQzFCLHVCQUFpRCxFQUNsRCxzQkFBK0MsRUFDbkQsa0JBQXVDLEVBQ2xDLHVCQUFpRDtRQUUzRSxLQUFLLENBQ0o7WUFDQyxxQkFBcUIsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUMxRCxNQUFNLE9BQU8sR0FBRyxNQUFNLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDMUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNkLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxrRkFBa0YsZUFBZSxHQUFHLENBQUMsQ0FBQztnQkFDbEksQ0FBQztnQkFDRCxPQUFPLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNoRCxDQUFDO1lBQ0QsY0FBYyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZCxNQUFNLElBQUksZ0JBQWdCLENBQUMseUVBQXlFLGVBQWUsR0FBRyxDQUFDLENBQUM7Z0JBQ3pILENBQUM7Z0JBQ0QsT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDakMsQ0FBQztTQUNELEVBQ0Qsb0JBQW9CLEVBQ3BCLDRCQUE0QixFQUM1QixjQUFjLEVBQ2QsVUFBVSxFQUNWLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsa0JBQWtCLENBQ2xCLENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQXRDWSxzQ0FBc0M7SUFHaEQsV0FBQSw2QkFBNkIsQ0FBQTtJQUM3QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0dBVmQsc0NBQXNDLENBc0NsRCJ9