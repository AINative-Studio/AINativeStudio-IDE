/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IDebugService, REPL_VIEW_ID } from '../common/debug.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
export async function showDebugSessionMenu(accessor, selectAndStartID) {
    const quickInputService = accessor.get(IQuickInputService);
    const debugService = accessor.get(IDebugService);
    const viewsService = accessor.get(IViewsService);
    const commandService = accessor.get(ICommandService);
    const localDisposableStore = new DisposableStore();
    const quickPick = quickInputService.createQuickPick({ useSeparators: true });
    localDisposableStore.add(quickPick);
    quickPick.matchOnLabel = quickPick.matchOnDescription = quickPick.matchOnDetail = quickPick.sortByLabel = false;
    quickPick.placeholder = nls.localize('moveFocusedView.selectView', 'Search debug sessions by name');
    const pickItems = _getPicksAndActiveItem(quickPick.value, selectAndStartID, debugService, viewsService, commandService);
    quickPick.items = pickItems.picks;
    quickPick.activeItems = pickItems.activeItems;
    localDisposableStore.add(quickPick.onDidChangeValue(async () => {
        quickPick.items = _getPicksAndActiveItem(quickPick.value, selectAndStartID, debugService, viewsService, commandService).picks;
    }));
    localDisposableStore.add(quickPick.onDidAccept(() => {
        const selectedItem = quickPick.selectedItems[0];
        selectedItem.accept();
        quickPick.hide();
        localDisposableStore.dispose();
    }));
    quickPick.show();
}
function _getPicksAndActiveItem(filter, selectAndStartID, debugService, viewsService, commandService) {
    const debugConsolePicks = [];
    const headerSessions = [];
    const currSession = debugService.getViewModel().focusedSession;
    const sessions = debugService.getModel().getSessions(false);
    const activeItems = [];
    sessions.forEach((session) => {
        if (session.compact && session.parentSession) {
            headerSessions.push(session.parentSession);
        }
    });
    sessions.forEach((session) => {
        const isHeader = headerSessions.includes(session);
        if (!session.parentSession) {
            debugConsolePicks.push({ type: 'separator', label: isHeader ? session.name : undefined });
        }
        if (!isHeader) {
            const pick = _createPick(session, filter, debugService, viewsService, commandService);
            if (pick) {
                debugConsolePicks.push(pick);
                if (session.getId() === currSession?.getId()) {
                    activeItems.push(pick);
                }
            }
        }
    });
    if (debugConsolePicks.length) {
        debugConsolePicks.push({ type: 'separator' });
    }
    const createDebugSessionLabel = nls.localize('workbench.action.debug.startDebug', 'Start a New Debug Session');
    debugConsolePicks.push({
        label: `$(plus) ${createDebugSessionLabel}`,
        ariaLabel: createDebugSessionLabel,
        accept: () => commandService.executeCommand(selectAndStartID)
    });
    return { picks: debugConsolePicks, activeItems };
}
function _getSessionInfo(session) {
    const label = (!session.configuration.name.length) ? session.name : session.configuration.name;
    const parentName = session.compact ? undefined : session.parentSession?.configuration.name;
    let description = '';
    let ariaLabel = '';
    if (parentName) {
        ariaLabel = nls.localize('workbench.action.debug.spawnFrom', 'Session {0} spawned from {1}', label, parentName);
        description = parentName;
    }
    return { label, description, ariaLabel };
}
function _createPick(session, filter, debugService, viewsService, commandService) {
    const pickInfo = _getSessionInfo(session);
    const highlights = matchesFuzzy(filter, pickInfo.label, true);
    if (highlights) {
        return {
            label: pickInfo.label,
            description: pickInfo.description,
            ariaLabel: pickInfo.ariaLabel,
            highlights: { label: highlights },
            accept: () => {
                debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
                if (!viewsService.isViewVisible(REPL_VIEW_ID)) {
                    viewsService.openView(REPL_VIEW_ID, true);
                }
            }
        };
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uUGlja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdTZXNzaW9uUGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUFpQixZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQXVCLE1BQU0sc0RBQXNELENBQUM7QUFJL0csT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUduRixNQUFNLENBQUMsS0FBSyxVQUFVLG9CQUFvQixDQUFDLFFBQTBCLEVBQUUsZ0JBQXdCO0lBQzlGLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzNELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNqRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRXJELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUNuRCxNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FB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