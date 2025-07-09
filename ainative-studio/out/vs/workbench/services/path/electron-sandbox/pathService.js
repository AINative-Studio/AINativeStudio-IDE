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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IPathService, AbstractPathService } from '../common/pathService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
let NativePathService = class NativePathService extends AbstractPathService {
    constructor(remoteAgentService, environmentService, contextService) {
        super(environmentService.userHome, remoteAgentService, environmentService, contextService);
    }
};
NativePathService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, INativeWorkbenchEnvironmentService),
    __param(2, IWorkspaceContextService)
], NativePathService);
export { NativePathService };
registerSingleton(IPathService, NativePathService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3BhdGgvZWxlY3Ryb24tc2FuZGJveC9wYXRoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzdFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXZGLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsbUJBQW1CO0lBRXpELFlBQ3NCLGtCQUF1QyxFQUN4QixrQkFBc0QsRUFDaEUsY0FBd0M7UUFFbEUsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUM1RixDQUFDO0NBQ0QsQ0FBQTtBQVRZLGlCQUFpQjtJQUczQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsa0NBQWtDLENBQUE7SUFDbEMsV0FBQSx3QkFBd0IsQ0FBQTtHQUxkLGlCQUFpQixDQVM3Qjs7QUFFRCxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLG9DQUE0QixDQUFDIn0=