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
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ISplashStorageService } from '../browser/splash.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { PartsSplash } from '../browser/partsSplash.js';
let SplashStorageService = class SplashStorageService {
    constructor(nativeHostService) {
        this.saveWindowSplash = nativeHostService.saveWindowSplash.bind(nativeHostService);
    }
};
SplashStorageService = __decorate([
    __param(0, INativeHostService)
], SplashStorageService);
registerSingleton(ISplashStorageService, SplashStorageService, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2(PartsSplash.ID, PartsSplash, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsYXNoLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zcGxhc2gvZWxlY3Ryb24tc2FuZGJveC9zcGxhc2guY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBR3hELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9CO0lBTXpCLFlBQWdDLGlCQUFxQztRQUNwRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEYsQ0FBQztDQUNELENBQUE7QUFUSyxvQkFBb0I7SUFNWixXQUFBLGtCQUFrQixDQUFBO0dBTjFCLG9CQUFvQixDQVN6QjtBQUVELGlCQUFpQixDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixvQ0FBNEIsQ0FBQztBQUUxRiw4QkFBOEIsQ0FDN0IsV0FBVyxDQUFDLEVBQUUsRUFDZCxXQUFXLHNDQUVYLENBQUMifQ==