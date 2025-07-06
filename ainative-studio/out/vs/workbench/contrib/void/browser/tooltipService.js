/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHRpcFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdG9vbHRpcFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQTBCLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBRTFILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxDQUFDLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFckUsNERBQTREO0FBQ3JELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTthQUNsQyxPQUFFLEdBQUcsK0JBQStCLEFBQWxDLENBQW1DO0lBRXJELFlBQ3lDLG9CQUEyQztRQUVuRixLQUFLLEVBQUUsQ0FBQztRQUZnQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBR25GLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsMkRBQTJEO1FBQzNELE1BQU0sWUFBWSxHQUFHLGVBQWUsRUFBRSxDQUFDO1FBRXZDLHNFQUFzRTtRQUN0RSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRTNFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZiw4REFBOEQ7WUFDOUQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDOUQsU0FBUyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRXhDLDRCQUE0QjtZQUM1QixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBMEIsRUFBRSxFQUFFO2dCQUN2RSxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxNQUFNLElBQUksT0FBTyxNQUFNLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsdUNBQXVDO1lBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDaEMsSUFBSSxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDcEMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUM5RCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDOztBQXJDVyxtQkFBbUI7SUFJN0IsV0FBQSxxQkFBcUIsQ0FBQTtHQUpYLG1CQUFtQixDQXNDL0I7O0FBRUQsNkVBQTZFO0FBQzdFLDhCQUE4QixDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxtQkFBbUIsdUNBQStCLENBQUMifQ==