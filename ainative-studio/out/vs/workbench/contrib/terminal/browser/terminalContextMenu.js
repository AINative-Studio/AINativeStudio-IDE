/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { asArray } from '../../../../base/common/arrays.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
/**
 * A context that is passed to actions as arguments to represent the terminal instance(s) being
 * acted upon.
 */
export class InstanceContext {
    constructor(instance) {
        // Only store the instance to avoid contexts holding on to disposed instances.
        this.instanceId = instance.instanceId;
    }
    toJSON() {
        return {
            $mid: 15 /* MarshalledId.TerminalContext */,
            instanceId: this.instanceId
        };
    }
}
export class TerminalContextActionRunner extends ActionRunner {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    async runAction(action, context) {
        if (Array.isArray(context) && context.every(e => e instanceof InstanceContext)) {
            // arg1: The (first) focused instance
            // arg2: All selected instances
            await action.run(context?.[0], context);
            return;
        }
        return super.runAction(action, context);
    }
}
export function openContextMenu(targetWindow, event, contextInstances, menu, contextMenuService, extraActions) {
    const standardEvent = new StandardMouseEvent(targetWindow, event);
    const actions = getFlatContextMenuActions(menu.getActions({ shouldForwardArgs: true }));
    if (extraActions) {
        actions.push(...extraActions);
    }
    const context = contextInstances ? asArray(contextInstances).map(e => new InstanceContext(e)) : [];
    const actionRunner = new TerminalContextActionRunner();
    contextMenuService.showContextMenu({
        actionRunner,
        getAnchor: () => standardEvent,
        getActions: () => actions,
        getActionsContext: () => context,
        onHide: () => actionRunner.dispose()
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250ZXh0TWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsQ29udGV4dE1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBVyxNQUFNLG9DQUFvQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUc1RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQU01Rzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZUFBZTtJQUczQixZQUFZLFFBQTJCO1FBQ3RDLDhFQUE4RTtRQUM5RSxJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUM7SUFDdkMsQ0FBQztJQUVELE1BQU07UUFDTCxPQUFPO1lBQ04sSUFBSSx1Q0FBOEI7WUFDbEMsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1NBQzNCLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsWUFBWTtJQUU1RCxnRUFBZ0U7SUFDN0MsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFlLEVBQUUsT0FBNkM7UUFDaEcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUNoRixxQ0FBcUM7WUFDckMsK0JBQStCO1lBQy9CLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN4QyxPQUFPO1FBQ1IsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDekMsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxZQUFvQixFQUFFLEtBQWlCLEVBQUUsZ0JBQTZELEVBQUUsSUFBVyxFQUFFLGtCQUF1QyxFQUFFLFlBQXdCO0lBQ3JOLE1BQU0sYUFBYSxHQUFHLElBQUksa0JBQWtCLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRWxFLE1BQU0sT0FBTyxHQUFHLHlCQUF5QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFeEYsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFzQixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBRXRILE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLEVBQUUsQ0FBQztJQUN2RCxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7UUFDbEMsWUFBWTtRQUNaLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxhQUFhO1FBQzlCLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPO1FBQ3pCLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87UUFDaEMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUU7S0FDcEMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9