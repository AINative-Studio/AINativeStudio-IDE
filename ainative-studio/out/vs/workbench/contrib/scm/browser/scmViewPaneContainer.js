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
import './media/scm.css';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { VIEWLET_ID } from '../common/scm.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let SCMViewPaneContainer = class SCMViewPaneContainer extends ViewPaneContainer {
    constructor(layoutService, telemetryService, instantiationService, contextMenuService, themeService, storageService, configurationService, extensionService, contextService, viewDescriptorService, logService) {
        super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
    }
    create(parent) {
        super.create(parent);
        parent.classList.add('scm-viewlet');
    }
    getOptimalWidth() {
        return 400;
    }
};
SCMViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IThemeService),
    __param(5, IStorageService),
    __param(6, IConfigurationService),
    __param(7, IExtensionService),
    __param(8, IWorkspaceContextService),
    __param(9, IViewDescriptorService),
    __param(10, ILogService)
], SCMViewPaneContainer);
export { SCMViewPaneContainer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtVmlld1BhbmVDb250YWluZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtVmlld1BhbmVDb250YWluZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQkFBaUIsQ0FBQztBQUN6QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFOUQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxpQkFBaUI7SUFFMUQsWUFDMEIsYUFBc0MsRUFDNUMsZ0JBQW1DLEVBQy9CLG9CQUEyQyxFQUM3QyxrQkFBdUMsRUFDN0MsWUFBMkIsRUFDekIsY0FBK0IsRUFDekIsb0JBQTJDLEVBQy9DLGdCQUFtQyxFQUM1QixjQUF3QyxFQUMxQyxxQkFBNkMsRUFDeEQsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLG9DQUFvQyxFQUFFLElBQUksRUFBRSxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxxQkFBcUIsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN2USxDQUFDO0lBRVEsTUFBTSxDQUFDLE1BQW1CO1FBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVRLGVBQWU7UUFDdkIsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0NBQ0QsQ0FBQTtBQTFCWSxvQkFBb0I7SUFHOUIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixZQUFBLFdBQVcsQ0FBQTtHQWJELG9CQUFvQixDQTBCaEMifQ==