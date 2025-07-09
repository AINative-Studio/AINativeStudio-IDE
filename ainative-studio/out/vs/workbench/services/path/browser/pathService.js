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
import { IPathService, AbstractPathService } from '../common/pathService.js';
import { URI } from '../../../../base/common/uri.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { dirname } from '../../../../base/common/resources.js';
let BrowserPathService = class BrowserPathService extends AbstractPathService {
    constructor(remoteAgentService, environmentService, contextService) {
        super(guessLocalUserHome(environmentService, contextService), remoteAgentService, environmentService, contextService);
    }
};
BrowserPathService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IWorkspaceContextService)
], BrowserPathService);
export { BrowserPathService };
function guessLocalUserHome(environmentService, contextService) {
    // In web we do not really have the concept of a "local" user home
    // but we still require it in many places as a fallback. As such,
    // we have to come up with a synthetic location derived from the
    // environment.
    const workspace = contextService.getWorkspace();
    const firstFolder = workspace.folders.at(0);
    if (firstFolder) {
        return firstFolder.uri;
    }
    if (workspace.configuration) {
        return dirname(workspace.configuration);
    }
    // This is not ideal because with a user home location of `/`, all paths
    // will potentially appear with `~/...`, but at this point we really do
    // not have any other good alternative.
    return URI.from({
        scheme: AbstractPathService.findDefaultUriScheme(environmentService, contextService),
        authority: environmentService.remoteAuthority,
        path: '/'
    });
}
registerSingleton(IPathService, BrowserPathService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3BhdGgvYnJvd3Nlci9wYXRoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFeEQsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxtQkFBbUI7SUFFMUQsWUFDc0Isa0JBQXVDLEVBQzlCLGtCQUFnRCxFQUNwRCxjQUF3QztRQUVsRSxLQUFLLENBQ0osa0JBQWtCLENBQUMsa0JBQWtCLEVBQUUsY0FBYyxDQUFDLEVBQ3RELGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsY0FBYyxDQUNkLENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQWRZLGtCQUFrQjtJQUc1QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSx3QkFBd0IsQ0FBQTtHQUxkLGtCQUFrQixDQWM5Qjs7QUFFRCxTQUFTLGtCQUFrQixDQUFDLGtCQUFnRCxFQUFFLGNBQXdDO0lBRXJILGtFQUFrRTtJQUNsRSxpRUFBaUU7SUFDakUsZ0VBQWdFO0lBQ2hFLGVBQWU7SUFFZixNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7SUFFaEQsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQixPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUM7SUFDeEIsQ0FBQztJQUVELElBQUksU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzdCLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsd0VBQXdFO0lBQ3hFLHVFQUF1RTtJQUN2RSx1Q0FBdUM7SUFFdkMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixFQUFFLGNBQWMsQ0FBQztRQUNwRixTQUFTLEVBQUUsa0JBQWtCLENBQUMsZUFBZTtRQUM3QyxJQUFJLEVBQUUsR0FBRztLQUNULENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLG9DQUE0QixDQUFDIn0=