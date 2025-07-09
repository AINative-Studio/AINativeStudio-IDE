/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { IWorkingCopyHistoryService } from '../../../services/workingCopy/common/workingCopyHistory.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { LOCAL_HISTORY_MENU_CONTEXT_KEY } from '../browser/localHistory.js';
import { findLocalHistoryEntry } from '../browser/localHistoryCommands.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Schemas } from '../../../../base/common/network.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
//#region Delete
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.revealInOS',
            title: isWindows ? localize2('revealInWindows', "Reveal in File Explorer") : isMacintosh ? localize2('revealInMac', "Reveal in Finder") : localize2('openContainer', "Open Containing Folder"),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '4_reveal',
                order: 1,
                when: ContextKeyExpr.and(LOCAL_HISTORY_MENU_CONTEXT_KEY, ResourceContextKey.Scheme.isEqualTo(Schemas.file))
            }
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const nativeHostService = accessor.get(INativeHostService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            await nativeHostService.showItemInFolder(entry.location.with({ scheme: Schemas.file }).fsPath);
        }
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxIaXN0b3J5L2VsZWN0cm9uLXNhbmRib3gvbG9jYWxIaXN0b3J5Q29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRXhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBNEIsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsZ0JBQWdCO0FBRWhCLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQ0FBMEM7WUFDOUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLHdCQUF3QixDQUFDO1lBQzlMLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtnQkFDOUIsS0FBSyxFQUFFLFVBQVU7Z0JBQ2pCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNHO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUE4QjtRQUNuRSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUMzRSxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUUzRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsTUFBTSxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoRyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILFlBQVkifQ==