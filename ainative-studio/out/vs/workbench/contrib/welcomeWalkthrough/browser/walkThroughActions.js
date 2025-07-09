/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { WalkThroughPart, WALK_THROUGH_FOCUS } from './walkThroughPart.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export const WalkThroughArrowUp = {
    id: 'workbench.action.interactivePlayground.arrowUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
    primary: 16 /* KeyCode.UpArrow */,
    handler: accessor => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane instanceof WalkThroughPart) {
            activeEditorPane.arrowUp();
        }
    }
};
export const WalkThroughArrowDown = {
    id: 'workbench.action.interactivePlayground.arrowDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
    primary: 18 /* KeyCode.DownArrow */,
    handler: accessor => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane instanceof WalkThroughPart) {
            activeEditorPane.arrowDown();
        }
    }
};
export const WalkThroughPageUp = {
    id: 'workbench.action.interactivePlayground.pageUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
    primary: 11 /* KeyCode.PageUp */,
    handler: accessor => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane instanceof WalkThroughPart) {
            activeEditorPane.pageUp();
        }
    }
};
export const WalkThroughPageDown = {
    id: 'workbench.action.interactivePlayground.pageDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
    primary: 12 /* KeyCode.PageDown */,
    handler: accessor => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane instanceof WalkThroughPart) {
            activeEditorPane.pageDown();
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVXYWxrdGhyb3VnaC9icm93c2VyL3dhbGtUaHJvdWdoQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUd0RixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBOEI7SUFDNUQsRUFBRSxFQUFFLGdEQUFnRDtJQUNwRCxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDM0YsT0FBTywwQkFBaUI7SUFDeEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQ25CLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7UUFDeEQsSUFBSSxnQkFBZ0IsWUFBWSxlQUFlLEVBQUUsQ0FBQztZQUNqRCxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM1QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBOEI7SUFDOUQsRUFBRSxFQUFFLGtEQUFrRDtJQUN0RCxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDM0YsT0FBTyw0QkFBbUI7SUFDMUIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQ25CLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7UUFDeEQsSUFBSSxnQkFBZ0IsWUFBWSxlQUFlLEVBQUUsQ0FBQztZQUNqRCxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM5QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBOEI7SUFDM0QsRUFBRSxFQUFFLCtDQUErQztJQUNuRCxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDM0YsT0FBTyx5QkFBZ0I7SUFDdkIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQ25CLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7UUFDeEQsSUFBSSxnQkFBZ0IsWUFBWSxlQUFlLEVBQUUsQ0FBQztZQUNqRCxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMzQixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBOEI7SUFDN0QsRUFBRSxFQUFFLGlEQUFpRDtJQUNyRCxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDM0YsT0FBTywyQkFBa0I7SUFDekIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQ25CLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7UUFDeEQsSUFBSSxnQkFBZ0IsWUFBWSxlQUFlLEVBQUUsQ0FBQztZQUNqRCxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM3QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMifQ==