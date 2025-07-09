/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { mountVoidTooltip } from './react/out/void-tooltip/index.js';
import { h, getActiveWindow } from '../../../../base/browser/dom.js';
// Tooltip contribution that mounts the component at startup
let TooltipContribution = class TooltipContribution extends Disposable {
    static { this.ID = 'workbench.contrib.voidTooltip'; }
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.initializeTooltip();
    }
    initializeTooltip() {
        // Get the active window reference for multi-window support
        const targetWindow = getActiveWindow();
        // Find the monaco-workbench element using the proper window reference
        const workbench = targetWindow.document.querySelector('.monaco-workbench');
        if (workbench) {
            // Create a container element for the tooltip using h function
            const tooltipContainer = h('div.void-tooltip-container').root;
            workbench.appendChild(tooltipContainer);
            // Mount the React component
            this.instantiationService.invokeFunction((accessor) => {
                const result = mountVoidTooltip(tooltipContainer, accessor);
                if (result && typeof result.dispose === 'function') {
                    this._register(toDisposable(result.dispose));
                }
            });
            // Register cleanup for the DOM element
            this._register(toDisposable(() => {
                if (tooltipContainer.parentElement) {
                    tooltipContainer.parentElement.removeChild(tooltipContainer);
                }
            }));
        }
    }
};
TooltipContribution = __decorate([
    __param(0, IInstantiationService)
], TooltipContribution);
export { TooltipContribution };
// Register the contribution to be initialized during the AfterRestored phase
registerWorkbenchContribution2(TooltipContribution.ID, TooltipContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHRpcFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3Rvb2x0aXBTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUEwQiw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUUxSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXJFLDREQUE0RDtBQUNyRCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7YUFDbEMsT0FBRSxHQUFHLCtCQUErQixBQUFsQyxDQUFtQztJQUVyRCxZQUN5QyxvQkFBMkM7UUFFbkYsS0FBSyxFQUFFLENBQUM7UUFGZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUduRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLDJEQUEyRDtRQUMzRCxNQUFNLFlBQVksR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUV2QyxzRUFBc0U7UUFDdEUsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUUzRSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsOERBQThEO1lBQzlELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzlELFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUV4Qyw0QkFBNEI7WUFDNUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQTBCLEVBQUUsRUFBRTtnQkFDdkUsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzVELElBQUksTUFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDcEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQzlDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztZQUVILHVDQUF1QztZQUN2QyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ2hDLElBQUksZ0JBQWdCLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3BDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDOUQsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0YsQ0FBQzs7QUFyQ1csbUJBQW1CO0lBSTdCLFdBQUEscUJBQXFCLENBQUE7R0FKWCxtQkFBbUIsQ0FzQy9COztBQUVELDZFQUE2RTtBQUM3RSw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLHVDQUErQixDQUFDIn0=