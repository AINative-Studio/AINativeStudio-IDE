/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ISplashStorageService } from './splash.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { PartsSplash } from './partsSplash.js';
registerSingleton(ISplashStorageService, class SplashStorageService {
    async saveWindowSplash(splash) {
        const raw = JSON.stringify(splash);
        localStorage.setItem('monaco-parts-splash', raw);
    }
}, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2(PartsSplash.ID, PartsSplash, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsYXNoLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zcGxhc2gvYnJvd3Nlci9zcGxhc2guY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDcEQsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUcvQyxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLG9CQUFvQjtJQUlsRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBb0I7UUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxZQUFZLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2xELENBQUM7Q0FFRCxvQ0FBNEIsQ0FBQztBQUU5Qiw4QkFBOEIsQ0FDN0IsV0FBVyxDQUFDLEVBQUUsRUFDZCxXQUFXLHNDQUVYLENBQUMifQ==