/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { language } from '../../../../base/common/platform.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { safeIntl } from '../../../../base/common/date.js';
let localHistoryDateFormatter = undefined;
export function getLocalHistoryDateFormatter() {
    if (!localHistoryDateFormatter) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        const formatter = safeIntl.DateTimeFormat(language, options);
        localHistoryDateFormatter = {
            format: date => formatter.format(date)
        };
    }
    return localHistoryDateFormatter;
}
export const LOCAL_HISTORY_MENU_CONTEXT_VALUE = 'localHistory:item';
export const LOCAL_HISTORY_MENU_CONTEXT_KEY = ContextKeyExpr.equals('timelineItem', LOCAL_HISTORY_MENU_CONTEXT_VALUE);
export const LOCAL_HISTORY_ICON_ENTRY = registerIcon('localHistory-icon', Codicon.circleOutline, localize('localHistoryIcon', "Icon for a local history entry in the timeline view."));
export const LOCAL_HISTORY_ICON_RESTORE = registerIcon('localHistory-restore', Codicon.check, localize('localHistoryRestore', "Icon for restoring contents of a local history entry."));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvY2FsSGlzdG9yeS9icm93c2VyL2xvY2FsSGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQU0zRCxJQUFJLHlCQUF5QixHQUEyQyxTQUFTLENBQUM7QUFFbEYsTUFBTSxVQUFVLDRCQUE0QjtJQUMzQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztRQUNoQyxNQUFNLE9BQU8sR0FBK0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUNuSSxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM3RCx5QkFBeUIsR0FBRztZQUMzQixNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztTQUN0QyxDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU8seUJBQXlCLENBQUM7QUFDbEMsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLG1CQUFtQixDQUFDO0FBQ3BFLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFFdEgsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHNEQUFzRCxDQUFDLENBQUMsQ0FBQztBQUN2TCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxZQUFZLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsdURBQXVELENBQUMsQ0FBQyxDQUFDIn0=