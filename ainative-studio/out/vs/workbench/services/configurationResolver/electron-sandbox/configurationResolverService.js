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
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IConfigurationResolverService } from '../common/configurationResolver.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { BaseConfigurationResolverService } from '../browser/baseConfigurationResolverService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IShellEnvironmentService } from '../../environment/electron-sandbox/shellEnvironmentService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let ConfigurationResolverService = class ConfigurationResolverService extends BaseConfigurationResolverService {
    constructor(editorService, environmentService, configurationService, commandService, workspaceContextService, quickInputService, labelService, shellEnvironmentService, pathService, extensionService, storageService) {
        super({
            getAppRoot: () => {
                return environmentService.appRoot;
            },
            getExecPath: () => {
                return environmentService.execPath;
            },
        }, shellEnvironmentService.getShellEnv(), editorService, configurationService, commandService, workspaceContextService, quickInputService, labelService, pathService, extensionService, storageService);
    }
};
ConfigurationResolverService = __decorate([
    __param(0, IEditorService),
    __param(1, INativeWorkbenchEnvironmentService),
    __param(2, IConfigurationService),
    __param(3, ICommandService),
    __param(4, IWorkspaceContextService),
    __param(5, IQuickInputService),
    __param(6, ILabelService),
    __param(7, IShellEnvironmentService),
    __param(8, IPathService),
    __param(9, IExtensionService),
    __param(10, IStorageService)
], ConfigurationResolverService);
export { ConfigurationResolverService };
registerSingleton(IConfigurationResolverService, ConfigurationResolverService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL2VsZWN0cm9uLXNhbmRib3gvY29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25GLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDekcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLGdDQUFnQztJQUVqRixZQUNpQixhQUE2QixFQUNULGtCQUFzRCxFQUNuRSxvQkFBMkMsRUFDakQsY0FBK0IsRUFDdEIsdUJBQWlELEVBQ3ZELGlCQUFxQyxFQUMxQyxZQUEyQixFQUNoQix1QkFBaUQsRUFDN0QsV0FBeUIsRUFDcEIsZ0JBQW1DLEVBQ3JDLGNBQStCO1FBRWhELEtBQUssQ0FBQztZQUNMLFVBQVUsRUFBRSxHQUF1QixFQUFFO2dCQUNwQyxPQUFPLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztZQUNuQyxDQUFDO1lBQ0QsV0FBVyxFQUFFLEdBQXVCLEVBQUU7Z0JBQ3JDLE9BQU8sa0JBQWtCLENBQUMsUUFBUSxDQUFDO1lBQ3BDLENBQUM7U0FDRCxFQUFFLHVCQUF1QixDQUFDLFdBQVcsRUFBRSxFQUFFLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQzVGLHVCQUF1QixFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDM0csQ0FBQztDQUNELENBQUE7QUF6QlksNEJBQTRCO0lBR3RDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxrQ0FBa0MsQ0FBQTtJQUNsQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxlQUFlLENBQUE7R0FiTCw0QkFBNEIsQ0F5QnhDOztBQUVELGlCQUFpQixDQUFDLDZCQUE2QixFQUFFLDRCQUE0QixvQ0FBNEIsQ0FBQyJ9