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
import { mountVoidOnboarding } from './react/out/void-onboarding/index.js';
import { h, getActiveWindow } from '../../../../base/browser/dom.js';
// Onboarding contribution that mounts the component at startup
let OnboardingContribution = class OnboardingContribution extends Disposable {
    static { this.ID = 'workbench.contrib.voidOnboarding'; }
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.initialize();
    }
    initialize() {
        // Get the active window reference for multi-window support
        const targetWindow = getActiveWindow();
        // Find the monaco-workbench element using the proper window reference
        const workbench = targetWindow.document.querySelector('.monaco-workbench');
        if (workbench) {
            const onboardingContainer = h('div.void-onboarding-container').root;
            workbench.appendChild(onboardingContainer);
            this.instantiationService.invokeFunction((accessor) => {
                const result = mountVoidOnboarding(onboardingContainer, accessor);
                if (result && typeof result.dispose === 'function') {
                    this._register(toDisposable(result.dispose));
                }
            });
            // Register cleanup for the DOM element
            this._register(toDisposable(() => {
                if (onboardingContainer.parentElement) {
                    onboardingContainer.parentElement.removeChild(onboardingContainer);
                }
            }));
        }
    }
};
OnboardingContribution = __decorate([
    __param(0, IInstantiationService)
], OnboardingContribution);
export { OnboardingContribution };
// Register the contribution to be initialized during the AfterRestored phase
registerWorkbenchContribution2(OnboardingContribution.ID, OnboardingContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZE9uYm9hcmRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkT25ib2FyZGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQTBCLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBRTFILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFckUsK0RBQStEO0FBQ3hELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTthQUNyQyxPQUFFLEdBQUcsa0NBQWtDLEFBQXJDLENBQXNDO0lBRXhELFlBQ3lDLG9CQUEyQztRQUVuRixLQUFLLEVBQUUsQ0FBQztRQUZnQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBR25GLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRU8sVUFBVTtRQUNqQiwyREFBMkQ7UUFDM0QsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLENBQUM7UUFFdkMsc0VBQXNFO1FBQ3RFLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFM0UsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUVmLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3BFLFNBQVMsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBMEIsRUFBRSxFQUFFO2dCQUN2RSxNQUFNLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDbEUsSUFBSSxNQUFNLElBQUksT0FBTyxNQUFNLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0gsdUNBQXVDO1lBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDaEMsSUFBSSxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDdkMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNwRSxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDOztBQWxDVyxzQkFBc0I7SUFJaEMsV0FBQSxxQkFBcUIsQ0FBQTtHQUpYLHNCQUFzQixDQW1DbEM7O0FBRUQsNkVBQTZFO0FBQzdFLDhCQUE4QixDQUFDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxzQkFBc0IsdUNBQStCLENBQUMifQ==