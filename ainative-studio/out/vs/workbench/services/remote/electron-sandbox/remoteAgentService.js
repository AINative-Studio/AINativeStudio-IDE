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
import * as nls from '../../../../nls.js';
import { IRemoteAgentService } from '../common/remoteAgentService.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { AbstractRemoteAgentService } from '../common/abstractRemoteAgentService.js';
import { ISignService } from '../../../../platform/sign/common/sign.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { URI } from '../../../../base/common/uri.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IRemoteSocketFactoryService } from '../../../../platform/remote/common/remoteSocketFactoryService.js';
let RemoteAgentService = class RemoteAgentService extends AbstractRemoteAgentService {
    constructor(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, signService, logService) {
        super(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, signService, logService);
    }
};
RemoteAgentService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, IUserDataProfileService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IProductService),
    __param(4, IRemoteAuthorityResolverService),
    __param(5, ISignService),
    __param(6, ILogService)
], RemoteAgentService);
export { RemoteAgentService };
let RemoteConnectionFailureNotificationContribution = class RemoteConnectionFailureNotificationContribution {
    static { this.ID = 'workbench.contrib.nativeRemoteConnectionFailureNotification'; }
    constructor(_remoteAgentService, notificationService, environmentService, telemetryService, nativeHostService, _remoteAuthorityResolverService, openerService) {
        this._remoteAgentService = _remoteAgentService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        // Let's cover the case where connecting to fetch the remote extension info fails
        this._remoteAgentService.getRawEnvironment()
            .then(undefined, err => {
            if (!RemoteAuthorityResolverError.isHandled(err)) {
                const choices = [
                    {
                        label: nls.localize('devTools', "Open Developer Tools"),
                        run: () => nativeHostService.openDevTools()
                    }
                ];
                const troubleshootingURL = this._getTroubleshootingURL();
                if (troubleshootingURL) {
                    choices.push({
                        label: nls.localize('directUrl', "Open in browser"),
                        run: () => openerService.open(troubleshootingURL, { openExternal: true })
                    });
                }
                notificationService.prompt(Severity.Error, nls.localize('connectionError', "Failed to connect to the remote extension host server (Error: {0})", err ? err.message : ''), choices);
            }
        });
    }
    _getTroubleshootingURL() {
        const remoteAgentConnection = this._remoteAgentService.getConnection();
        if (!remoteAgentConnection) {
            return null;
        }
        const connectionData = this._remoteAuthorityResolverService.getConnectionData(remoteAgentConnection.remoteAuthority);
        if (!connectionData || connectionData.connectTo.type !== 0 /* RemoteConnectionType.WebSocket */) {
            return null;
        }
        return URI.from({
            scheme: 'http',
            authority: `${connectionData.connectTo.host}:${connectionData.connectTo.port}`,
            path: `/version`
        });
    }
};
RemoteConnectionFailureNotificationContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, INotificationService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, INativeHostService),
    __param(5, IRemoteAuthorityResolverService),
    __param(6, IOpenerService)
], RemoteConnectionFailureNotificationContribution);
registerWorkbenchContribution2(RemoteConnectionFailureNotificationContribution.ID, RemoteConnectionFailureNotificationContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9yZW1vdGUvZWxlY3Ryb24tc2FuZGJveC9yZW1vdGVBZ2VudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsK0JBQStCLEVBQXdCLDRCQUE0QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEssT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLG9CQUFvQixFQUFpQixRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN6SCxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFP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