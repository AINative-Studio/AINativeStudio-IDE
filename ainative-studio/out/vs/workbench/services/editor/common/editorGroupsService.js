/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { isEditorInput } from '../../../common/editor.js';
export const IEditorGroupsService = createDecorator('editorGroupsService');
export var GroupDirection;
(function (GroupDirection) {
    GroupDirection[GroupDirection["UP"] = 0] = "UP";
    GroupDirection[GroupDirection["DOWN"] = 1] = "DOWN";
    GroupDirection[GroupDirection["LEFT"] = 2] = "LEFT";
    GroupDirection[GroupDirection["RIGHT"] = 3] = "RIGHT";
})(GroupDirection || (GroupDirection = {}));
export var GroupOrientation;
(function (GroupOrientation) {
    GroupOrientation[GroupOrientation["HORIZONTAL"] = 0] = "HORIZONTAL";
    GroupOrientation[GroupOrientation["VERTICAL"] = 1] = "VERTICAL";
})(GroupOrientation || (GroupOrientation = {}));
export var GroupLocation;
(function (GroupLocation) {
    GroupLocation[GroupLocation["FIRST"] = 0] = "FIRST";
    GroupLocation[GroupLocation["LAST"] = 1] = "LAST";
    GroupLocation[GroupLocation["NEXT"] = 2] = "NEXT";
    GroupLocation[GroupLocation["PREVIOUS"] = 3] = "PREVIOUS";
})(GroupLocation || (GroupLocation = {}));
export var GroupsArrangement;
(function (GroupsArrangement) {
    /**
     * Make the current active group consume the entire
     * editor area.
     */
    GroupsArrangement[GroupsArrangement["MAXIMIZE"] = 0] = "MAXIMIZE";
    /**
     * Make the current active group consume the maximum
     * amount of space possible.
     */
    GroupsArrangement[GroupsArrangement["EXPAND"] = 1] = "EXPAND";
    /**
     * Size all groups evenly.
     */
    GroupsArrangement[GroupsArrangement["EVEN"] = 2] = "EVEN";
})(GroupsArrangement || (GroupsArrangement = {}));
export var MergeGroupMode;
(function (MergeGroupMode) {
    MergeGroupMode[MergeGroupMode["COPY_EDITORS"] = 0] = "COPY_EDITORS";
    MergeGroupMode[MergeGroupMode["MOVE_EDITORS"] = 1] = "MOVE_EDITORS";
})(MergeGroupMode || (MergeGroupMode = {}));
export function isEditorReplacement(replacement) {
    const candidate = replacement;
    return isEditorInput(candidate?.editor) && isEditorInput(candidate?.replacement);
}
export var GroupsOrder;
(function (GroupsOrder) {
    /**
     * Groups sorted by creation order (oldest one first)
     */
    GroupsOrder[GroupsOrder["CREATION_TIME"] = 0] = "CREATION_TIME";
    /**
     * Groups sorted by most recent activity (most recent active first)
     */
    GroupsOrder[GroupsOrder["MOST_RECENTLY_ACTIVE"] = 1] = "MOST_RECENTLY_ACTIVE";
    /**
     * Groups sorted by grid widget order
     */
    GroupsOrder[GroupsOrder["GRID_APPEARANCE"] = 2] = "GRID_APPEARANCE";
})(GroupsOrder || (GroupsOrder = {}));
export var OpenEditorContext;
(function (OpenEditorContext) {
    OpenEditorContext[OpenEditorContext["NEW_EDITOR"] = 1] = "NEW_EDITOR";
    OpenEditorContext[OpenEditorContext["MOVE_EDITOR"] = 2] = "MOVE_EDITOR";
    OpenEditorContext[OpenEditorContext["COPY_EDITOR"] = 3] = "COPY_EDITOR";
})(OpenEditorContext || (OpenEditorContext = {}));
export function isEditorGroup(obj) {
    const group = obj;
    return !!group && typeof group.id === 'number' && Array.isArray(group.editors);
}
//#region Editor Group Helpers
export function preferredSideBySideGroupDirection(configurationService) {
    const openSideBySideDirection = configurationService.getValue('workbench.editor.openSideBySideDirection');
    if (openSideBySideDirection === 'down') {
        return 1 /* GroupDirection.DOWN */;
    }
    return 3 /* GroupDirection.RIGHT */;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2NvbW1vbi9lZGl0b3JHcm91cHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBeUIsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEgsT0FBTyxFQUFxTSxhQUFhLEVBQTRHLE1BQU0sMkJBQTJCLENBQUM7QUFhdlcsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDO0FBRWpHLE1BQU0sQ0FBTixJQUFrQixjQUtqQjtBQUxELFdBQWtCLGNBQWM7SUFDL0IsK0NBQUUsQ0FBQTtJQUNGLG1EQUFJLENBQUE7SUFDSixtREFBSSxDQUFBO0lBQ0oscURBQUssQ0FBQTtBQUNOLENBQUMsRUFMaUIsY0FBYyxLQUFkLGNBQWMsUUFLL0I7QUFFRCxNQUFNLENBQU4sSUFBa0IsZ0JBR2pCO0FBSEQsV0FBa0IsZ0JBQWdCO0lBQ2pDLG1FQUFVLENBQUE7SUFDViwrREFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhpQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBR2pDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGFBS2pCO0FBTEQsV0FBa0IsYUFBYTtJQUM5QixtREFBSyxDQUFBO0lBQ0wsaURBQUksQ0FBQTtJQUNKLGlEQUFJLENBQUE7SUFDSix5REFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUxpQixhQUFhLEtBQWIsYUFBYSxRQUs5QjtBQU9ELE1BQU0sQ0FBTixJQUFrQixpQkFpQmpCO0FBakJELFdBQWtCLGlCQUFpQjtJQUNsQzs7O09BR0c7SUFDSCxpRUFBUSxDQUFBO0lBRVI7OztPQUdHO0lBQ0gsNkRBQU0sQ0FBQTtJQUVOOztPQUVHO0lBQ0gseURBQUksQ0FBQTtBQUNMLENBQUMsRUFqQmlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFpQmxDO0FBZ0NELE1BQU0sQ0FBTixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDL0IsbUVBQVksQ0FBQTtJQUNaLG1FQUFZLENBQUE7QUFDYixDQUFDLEVBSGlCLGNBQWMsS0FBZCxjQUFjLFFBRy9CO0FBMENELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxXQUFvQjtJQUN2RCxNQUFNLFNBQVMsR0FBRyxXQUE2QyxDQUFDO0lBRWhFLE9BQU8sYUFBYSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ2xGLENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0IsV0FnQmpCO0FBaEJELFdBQWtCLFdBQVc7SUFFNUI7O09BRUc7SUFDSCwrREFBYSxDQUFBO0lBRWI7O09BRUc7SUFDSCw2RUFBb0IsQ0FBQTtJQUVwQjs7T0FFRztJQUNILG1FQUFlLENBQUE7QUFDaEIsQ0FBQyxFQWhCaUIsV0FBVyxLQUFYLFdBQVcsUUFnQjVCO0FBK2JELE1BQU0sQ0FBTixJQUFrQixpQkFJakI7QUFKRCxXQUFrQixpQkFBaUI7SUFDbEMscUVBQWMsQ0FBQTtJQUNkLHVFQUFlLENBQUE7SUFDZix1RUFBZSxDQUFBO0FBQ2hCLENBQUMsRUFKaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUlsQztBQXNWRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVk7SUFDekMsTUFBTSxLQUFLLEdBQUcsR0FBK0IsQ0FBQztJQUU5QyxPQUFPLENBQUMsQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLENBQUMsRUFBRSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNoRixDQUFDO0FBRUQsOEJBQThCO0FBRTlCLE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyxvQkFBMkM7SUFDNUYsTUFBTSx1QkFBdUIsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsMENBQTBDLENBQUMsQ0FBQztJQUUxRyxJQUFJLHVCQUF1QixLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQ3hDLG1DQUEyQjtJQUM1QixDQUFDO0lBRUQsb0NBQTRCO0FBQzdCLENBQUM7QUFFRCxZQUFZIn0=