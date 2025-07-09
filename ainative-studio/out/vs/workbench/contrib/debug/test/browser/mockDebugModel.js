/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { DebugModel } from '../../common/debugModel.js';
import { MockDebugStorage } from '../common/mockDebug.js';
import { TestFileService } from '../../../../test/browser/workbenchTestServices.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
const fileService = new TestFileService();
export const mockUriIdentityService = new UriIdentityService(fileService);
export function createMockDebugModel(disposable) {
    const storage = disposable.add(new TestStorageService());
    const debugStorage = disposable.add(new MockDebugStorage(storage));
    return disposable.add(new DebugModel(debugStorage, { isDirty: (e) => false }, mockUriIdentityService, new NullLogService()));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0RlYnVnTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL21vY2tEZWJ1Z01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN0RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXRGLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7QUFDMUMsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUUxRSxNQUFNLFVBQVUsb0JBQW9CLENBQUMsVUFBd0M7SUFDNUUsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQztJQUN6RCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNuRSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsWUFBWSxFQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN4SSxDQUFDIn0=