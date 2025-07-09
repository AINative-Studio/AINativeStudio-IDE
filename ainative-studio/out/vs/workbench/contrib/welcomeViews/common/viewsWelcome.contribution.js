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
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { ViewsWelcomeContribution } from './viewsWelcomeContribution.js';
import { viewsWelcomeExtensionPointDescriptor } from './viewsWelcomeExtensionPoint.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint(viewsWelcomeExtensionPointDescriptor);
let WorkbenchConfigurationContribution = class WorkbenchConfigurationContribution {
    constructor(instantiationService) {
        instantiationService.createInstance(ViewsWelcomeContribution, extensionPoint);
    }
};
WorkbenchConfigurationContribution = __decorate([
    __param(0, IInstantiationService)
], WorkbenchConfigurationContribution);
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(WorkbenchConfigurationContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lVmlld3MvY29tbW9uL3ZpZXdzV2VsY29tZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQW1DLE1BQU0sa0NBQWtDLENBQUM7QUFDdEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUE4QixvQ0FBb0MsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRS9GLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUE2QixvQ0FBb0MsQ0FBQyxDQUFDO0FBRW5JLElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQWtDO0lBQ3ZDLFlBQ3dCLG9CQUEyQztRQUVsRSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDL0UsQ0FBQztDQUNELENBQUE7QUFOSyxrQ0FBa0M7SUFFckMsV0FBQSxxQkFBcUIsQ0FBQTtHQUZsQixrQ0FBa0MsQ0FNdkM7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7S0FDekUsNkJBQTZCLENBQUMsa0NBQWtDLGtDQUEwQixDQUFDIn0=