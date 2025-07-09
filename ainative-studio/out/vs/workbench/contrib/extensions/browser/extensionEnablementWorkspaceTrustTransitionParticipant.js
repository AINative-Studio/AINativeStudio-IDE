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
import { localize } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
let ExtensionEnablementWorkspaceTrustTransitionParticipant = class ExtensionEnablementWorkspaceTrustTransitionParticipant extends Disposable {
    constructor(extensionService, hostService, environmentService, extensionEnablementService, workspaceTrustEnablementService, workspaceTrustManagementService) {
        super();
        if (workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            // The extension enablement participant will be registered only after the
            // workspace trust state has been initialized. There is no need to execute
            // the participant as part of the initialization process, as the workspace
            // trust state is initialized before starting the extension host.
            workspaceTrustManagementService.workspaceTrustInitialized.then(() => {
                const workspaceTrustTransitionParticipant = new class {
                    async participate(trusted) {
                        if (trusted) {
                            // Untrusted -> Trusted
                            await extensionEnablementService.updateExtensionsEnablementsWhenWorkspaceTrustChanges();
                        }
                        else {
                            // Trusted -> Untrusted
                            if (environmentService.remoteAuthority) {
                                hostService.reload();
                            }
                            else {
                                const stopped = await extensionService.stopExtensionHosts(localize('restartExtensionHost.reason', "Changing workspace trust"));
                                await extensionEnablementService.updateExtensionsEnablementsWhenWorkspaceTrustChanges();
                                if (stopped) {
                                    extensionService.startExtensionHosts();
                                }
                            }
                        }
                    }
                };
                // Execute BEFORE the workspace trust transition completes
                this._register(workspaceTrustManagementService.addWorkspaceTrustTransitionParticipant(workspaceTrustTransitionParticipant));
            });
        }
    }
};
ExtensionEnablementWorkspaceTrustTransitionParticipant = __decorate([
    __param(0, IExtensionService),
    __param(1, IHostService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IWorkbenchExtensionEnablementService),
    __param(4, IWorkspaceTrustEnablementService),
    __param(5, IWorkspaceTrustManagementService)
], ExtensionEnablementWorkspaceTrustTransitionParticipant);
export { ExtensionEnablementWorkspaceTrustTransitionParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFdvcmtzcGFjZVRydXN0VHJhbnNpdGlvblBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25FbmFibGVtZW50V29ya3NwYWNlVHJ1c3RUcmFuc2l0aW9uUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsZ0NBQWdDLEVBQXdDLE1BQU0seURBQXlELENBQUM7QUFFbkwsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDM0gsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRS9ELElBQU0sc0RBQXNELEdBQTVELE1BQU0sc0RBQXVELFNBQVEsVUFBVTtJQUNyRixZQUNvQixnQkFBbUMsRUFDeEMsV0FBeUIsRUFDVCxrQkFBZ0QsRUFDeEMsMEJBQWdFLEVBQ3BFLCtCQUFpRSxFQUNqRSwrQkFBaUU7UUFFbkcsS0FBSyxFQUFFLENBQUM7UUFFUixJQUFJLCtCQUErQixDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztZQUMvRCx5RUFBeUU7WUFDekUsMEVBQTBFO1lBQzFFLDBFQUEwRTtZQUMxRSxpRUFBaUU7WUFDakUsK0JBQStCLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDbkUsTUFBTSxtQ0FBbUMsR0FBRyxJQUFJO29CQUMvQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQWdCO3dCQUNqQyxJQUFJLE9BQU8sRUFBRSxDQUFDOzRCQUNiLHVCQUF1Qjs0QkFDdkIsTUFBTSwwQkFBMEIsQ0FBQyxvREFBb0QsRUFBRSxDQUFDO3dCQUN6RixDQUFDOzZCQUFNLENBQUM7NEJBQ1AsdUJBQXVCOzRCQUN2QixJQUFJLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxDQUFDO2dDQUN4QyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7NEJBQ3RCLENBQUM7aUNBQU0sQ0FBQztnQ0FDUCxNQUFNLE9BQU8sR0FBRyxNQUFNLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDLENBQUM7Z0NBQy9ILE1BQU0sMEJBQTBCLENBQUMsb0RBQW9ELEVBQUUsQ0FBQztnQ0FDeEYsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQ0FDYixnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dDQUN4QyxDQUFDOzRCQUNGLENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO2lCQUNELENBQUM7Z0JBRUYsMERBQTBEO2dCQUMxRCxJQUFJLENBQUMsU0FBUyxDQUFDLCtCQUErQixDQUFDLHNDQUFzQyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztZQUM3SCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFDWSxzREFBc0Q7SUFFaEUsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxvQ0FBb0MsQ0FBQTtJQUNwQyxXQUFBLGdDQUFnQyxDQUFBO0lBQ2hDLFdBQUEsZ0NBQWdDLENBQUE7R0FQdEIsc0RBQXNELENBMENsRSJ9