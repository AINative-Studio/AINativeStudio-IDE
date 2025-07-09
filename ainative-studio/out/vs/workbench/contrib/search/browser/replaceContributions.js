/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IReplaceService } from './replace.js';
import { ReplaceService, ReplacePreviewContentProvider } from './replaceService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
export function registerContributions() {
    registerSingleton(IReplaceService, ReplaceService, 1 /* InstantiationType.Delayed */);
    registerWorkbenchContribution2(ReplacePreviewContentProvider.ID, ReplacePreviewContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZUNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvcmVwbGFjZUNvbnRyaWJ1dGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDL0MsT0FBTyxFQUFFLGNBQWMsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3BGLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRyxNQUFNLFVBQVUscUJBQXFCO0lBQ3BDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxjQUFjLG9DQUE0QixDQUFDO0lBQzlFLDhCQUE4QixDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBRSw2QkFBNkIsc0NBQXNELENBQUM7QUFDdEosQ0FBQyJ9