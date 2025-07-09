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
import { getZoomLevel } from '../../../../base/browser/browser.js';
import { platform } from '../../../../base/common/process.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IProcessMainService } from '../../../../platform/process/common/process.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { activeContrastBorder, editorBackground, editorForeground, listActiveSelectionBackground, listActiveSelectionForeground, listFocusBackground, listFocusForeground, listFocusOutline, listHoverBackground, listHoverForeground, scrollbarShadow, scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IWorkbenchProcessService } from '../common/issue.js';
import { mainWindow } from '../../../../base/browser/window.js';
let ProcessService = class ProcessService {
    constructor(processMainService, themeService, environmentService, productService) {
        this.processMainService = processMainService;
        this.themeService = themeService;
        this.environmentService = environmentService;
        this.productService = productService;
    }
    openProcessExplorer() {
        const theme = this.themeService.getColorTheme();
        const data = {
            pid: this.environmentService.mainPid,
            zoomLevel: getZoomLevel(mainWindow),
            styles: {
                backgroundColor: getColor(theme, editorBackground),
                color: getColor(theme, editorForeground),
                listHoverBackground: getColor(theme, listHoverBackground),
                listHoverForeground: getColor(theme, listHoverForeground),
                listFocusBackground: getColor(theme, listFocusBackground),
                listFocusForeground: getColor(theme, listFocusForeground),
                listFocusOutline: getColor(theme, listFocusOutline),
                listActiveSelectionBackground: getColor(theme, listActiveSelectionBackground),
                listActiveSelectionForeground: getColor(theme, listActiveSelectionForeground),
                listHoverOutline: getColor(theme, activeContrastBorder),
                scrollbarShadowColor: getColor(theme, scrollbarShadow),
                scrollbarSliderActiveBackgroundColor: getColor(theme, scrollbarSliderActiveBackground),
                scrollbarSliderBackgroundColor: getColor(theme, scrollbarSliderBackground),
                scrollbarSliderHoverBackgroundColor: getColor(theme, scrollbarSliderHoverBackground),
            },
            platform: platform,
            applicationName: this.productService.applicationName
        };
        return this.processMainService.openProcessExplorer(data);
    }
};
ProcessService = __decorate([
    __param(0, IProcessMainService),
    __param(1, IThemeService),
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, IProductService)
], ProcessService);
export { ProcessService };
function getColor(theme, key) {
    const color = theme.getColor(key);
    return color ? color.toString() : undefined;
}
registerSingleton(IWorkbenchProcessService, ProcessService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvZWxlY3Ryb24tc2FuZGJveC9wcm9jZXNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXVCLE1BQU0sZ0RBQWdELENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsK0JBQStCLEVBQUUseUJBQXlCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvWSxPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0YsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDMUgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXpELElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFHMUIsWUFDdUMsa0JBQXVDLEVBQzdDLFlBQTJCLEVBQ04sa0JBQXNELEVBQ3pFLGNBQStCO1FBSDNCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDN0MsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDTix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9DO1FBQ3pFLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUM5RCxDQUFDO0lBRUwsbUJBQW1CO1FBQ2xCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDaEQsTUFBTSxJQUFJLEdBQXdCO1lBQ2pDLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTztZQUNwQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQztZQUNuQyxNQUFNLEVBQUU7Z0JBQ1AsZUFBZSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQ2xELEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDO2dCQUN4QyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDO2dCQUN6RCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDO2dCQUN6RCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDO2dCQUN6RCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDO2dCQUN6RCxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDO2dCQUNuRCw2QkFBNkIsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLDZCQUE2QixDQUFDO2dCQUM3RSw2QkFBNkIsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLDZCQUE2QixDQUFDO2dCQUM3RSxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLG9CQUFvQixDQUFDO2dCQUN2RCxvQkFBb0IsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQztnQkFDdEQsb0NBQW9DLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSwrQkFBK0IsQ0FBQztnQkFDdEYsOEJBQThCLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQztnQkFDMUUsbUNBQW1DLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSw4QkFBOEIsQ0FBQzthQUNwRjtZQUNELFFBQVEsRUFBRSxRQUFRO1lBQ2xCLGVBQWUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWU7U0FDcEQsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FHRCxDQUFBO0FBdENZLGNBQWM7SUFJeEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsa0NBQWtDLENBQUE7SUFDbEMsV0FBQSxlQUFlLENBQUE7R0FQTCxjQUFjLENBc0MxQjs7QUFFRCxTQUFTLFFBQVEsQ0FBQyxLQUFrQixFQUFFLEdBQVc7SUFDaEQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsQyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDN0MsQ0FBQztBQUVELGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLGNBQWMsb0NBQTRCLENBQUMifQ==