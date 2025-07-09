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
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Extensions } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { mark } from '../../../../base/common/performance.js';
export const IUserDataInitializationService = createDecorator('IUserDataInitializationService');
export class UserDataInitializationService {
    constructor(initializers = []) {
        this.initializers = initializers;
    }
    async whenInitializationFinished() {
        if (await this.requiresInitialization()) {
            await Promise.all(this.initializers.map(initializer => initializer.whenInitializationFinished()));
        }
    }
    async requiresInitialization() {
        return (await Promise.all(this.initializers.map(initializer => initializer.requiresInitialization()))).some(result => result);
    }
    async initializeRequiredResources() {
        if (await this.requiresInitialization()) {
            await Promise.all(this.initializers.map(initializer => initializer.initializeRequiredResources()));
        }
    }
    async initializeOtherResources(instantiationService) {
        if (await this.requiresInitialization()) {
            await Promise.all(this.initializers.map(initializer => initializer.initializeOtherResources(instantiationService)));
        }
    }
    async initializeInstalledExtensions(instantiationService) {
        if (await this.requiresInitialization()) {
            await Promise.all(this.initializers.map(initializer => initializer.initializeInstalledExtensions(instantiationService)));
        }
    }
}
let InitializeOtherResourcesContribution = class InitializeOtherResourcesContribution {
    constructor(userDataInitializeService, instantiationService, extensionService) {
        extensionService.whenInstalledExtensionsRegistered().then(() => this.initializeOtherResource(userDataInitializeService, instantiationService));
    }
    async initializeOtherResource(userDataInitializeService, instantiationService) {
        if (await userDataInitializeService.requiresInitialization()) {
            mark('code/willInitOtherUserData');
            await userDataInitializeService.initializeOtherResources(instantiationService);
            mark('code/didInitOtherUserData');
        }
    }
};
InitializeOtherResourcesContribution = __decorate([
    __param(0, IUserDataInitializationService),
    __param(1, IInstantiationService),
    __param(2, IExtensionService)
], InitializeOtherResourcesContribution);
if (isWeb) {
    const workbenchRegistry = Registry.as(Extensions.Workbench);
    workbenchRegistry.registerWorkbenchContribution(InitializeOtherResourcesContribution, 3 /* LifecyclePhase.Restored */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFJbml0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YS9icm93c2VyL3VzZXJEYXRhSW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEgsT0FBTyxFQUEyRCxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQVU5RCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxlQUFlLENBQWlDLGdDQUFnQyxDQUFDLENBQUM7QUFLaEksTUFBTSxPQUFPLDZCQUE2QjtJQUl6QyxZQUE2QixlQUF1QyxFQUFFO1FBQXpDLGlCQUFZLEdBQVosWUFBWSxDQUE2QjtJQUN0RSxDQUFDO0lBRUQsS0FBSyxDQUFDLDBCQUEwQjtRQUMvQixJQUFJLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixFQUFFLEVBQUUsQ0FBQztZQUN6QyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkcsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCO1FBQzNCLE9BQU8sQ0FBQyxN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