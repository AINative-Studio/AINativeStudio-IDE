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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9lbGVjdHJvbi1zYW5kYm94L3Byb2Nlc3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxtQkFBbUIsRUFBdUIsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLDZCQUE2QixFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSwrQkFBK0IsRUFBRSx5QkFBeUIsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9ZLE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUMxSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFekQsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYztJQUcxQixZQUN1QyxrQkFBdUMsRUFDN0MsWUFBMkIs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