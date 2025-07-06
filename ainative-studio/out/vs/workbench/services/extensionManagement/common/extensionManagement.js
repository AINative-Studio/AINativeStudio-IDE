/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator, refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { FileAccess } from '../../../../base/common/network.js';
export const IProfileAwareExtensionManagementService = refineServiceDecorator(IExtensionManagementService);
export var ExtensionInstallLocation;
(function (ExtensionInstallLocation) {
    ExtensionInstallLocation[ExtensionInstallLocation["Local"] = 1] = "Local";
    ExtensionInstallLocation[ExtensionInstallLocation["Remote"] = 2] = "Remote";
    ExtensionInstallLocation[ExtensionInstallLocation["Web"] = 3] = "Web";
})(ExtensionInstallLocation || (ExtensionInstallLocation = {}));
export const IExtensionManagementServerService = createDecorator('extensionManagementServerService');
export const DefaultIconPath = FileAccess.asBrowserUri('vs/workbench/services/extensionManagement/common/media/defaultIcon.png').toString(true);
export const IWorkbenchExtensionManagementService = refineServiceDecorator(IProfileAwareExtensionManagementService);
export var EnablementState;
(function (EnablementState) {
    EnablementState[EnablementState["DisabledByTrustRequirement"] = 0] = "DisabledByTrustRequirement";
    EnablementState[EnablementState["DisabledByExtensionKind"] = 1] = "DisabledByExtensionKind";
    EnablementState[EnablementState["DisabledByEnvironment"] = 2] = "DisabledByEnvironment";
    EnablementState[EnablementState["EnabledByEnvironment"] = 3] = "EnabledByEnvironment";
    EnablementState[EnablementState["DisabledByMalicious"] = 4] = "DisabledByMalicious";
    EnablementState[EnablementState["DisabledByVirtualWorkspace"] = 5] = "DisabledByVirtualWorkspace";
    EnablementState[EnablementState["DisabledByInvalidExtension"] = 6] = "DisabledByInvalidExtension";
    EnablementState[EnablementState["DisabledByAllowlist"] = 7] = "DisabledByAllowlist";
    EnablementState[EnablementState["DisabledByExtensionDependency"] = 8] = "DisabledByExtensionDependency";
    EnablementState[EnablementState["DisabledGlobally"] = 9] = "DisabledGlobally";
    EnablementState[EnablementState["DisabledWorkspace"] = 10] = "DisabledWorkspace";
    EnablementState[EnablementState["EnabledGlobally"] = 11] = "EnabledGlobally";
    EnablementState[EnablementState["EnabledWorkspace"] = 12] = "EnabledWorkspace";
})(EnablementState || (EnablementState = {}));
export const IWorkbenchExtensionEnablementService = createDecorator('extensionEnablementService');
export const IWebExtensionsScannerService = createDecorator('IWebExtensionsScannerService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVySCxPQUFPLEVBQUUsMkJBQTJCLEVBQXNOLE1BQU0sd0VBQXdFLENBQUM7QUFFelUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBS2hFLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLHNCQUFzQixDQUF1RSwyQkFBMkIsQ0FBQyxDQUFDO0FBY2pMLE1BQU0sQ0FBTixJQUFrQix3QkFJakI7QUFKRCxXQUFrQix3QkFBd0I7SUFDekMseUVBQVMsQ0FBQTtJQUNULDJFQUFNLENBQUE7SUFDTixxRUFBRyxDQUFBO0FBQ0osQ0FBQyxFQUppQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBSXpDO0FBRUQsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsZUFBZSxDQUFvQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBVXhJLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLHdFQUF3RSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBcUJoSixNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxzQkFBc0IsQ0FBZ0YsdUNBQXVDLENBQUMsQ0FBQztBQXFDbk0sTUFBTSxDQUFOLElBQWtCLGVBY2pCO0FBZEQsV0FBa0IsZUFBZTtJQUNoQyxpR0FBMEIsQ0FBQTtJQUMxQiwyRkFBdUIsQ0FBQTtJQUN2Qix1RkFBcUIsQ0FBQTtJQUNyQixxRkFBb0IsQ0FBQTtJQUNwQixtRkFBbUIsQ0FBQTtJQUNuQixpR0FBMEIsQ0FBQTtJQUMxQixpR0FBMEIsQ0FBQTtJQUMxQixtRkFBbUIsQ0FBQTtJQUNuQix1R0FBNkIsQ0FBQTtJQUM3Qiw2RUFBZ0IsQ0FBQTtJQUNoQixnRkFBaUIsQ0FBQTtJQUNqQiw0RUFBZSxDQUFBO0lBQ2YsOEVBQWdCLENBQUE7QUFDakIsQ0FBQyxFQWRpQixlQUFlLEtBQWYsZUFBZSxRQWNoQztBQUVELE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLGVBQWUsQ0FBdUMsNEJBQTRCLENBQUMsQ0FBQztBQThFeEksTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsZUFBZSxDQUErQiw4QkFBOEIsQ0FBQyxDQUFDIn0=