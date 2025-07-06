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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvY29tbW9uL2VkaXRvckdyb3Vwc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUF5QixlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNwSCxPQUFPLEVBQXFNLGFBQWEsRUFBNEcsTUFBTSwyQkFBMkIsQ0FBQztBQWF2VyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUM7QUFFakcsTUFBTSxDQUFOLElBQWtCLGNBS2pCO0FBTEQsV0FBa0IsY0FBYztJQUMvQiwrQ0FBRSxDQUFBO0lBQ0YsbURBQUksQ0FBQTtJQUNKLG1EQUFJLENBQUE7SUFDSixxREFBSyxDQUFBO0FBQ04sQ0FBQyxFQUxpQixjQUFjLEtBQWQsY0FBYyxRQUsvQjtBQUVELE1BQU0sQ0FBTixJQUFrQixnQkFHakI7QUFIRCxXQUFrQixnQkFBZ0I7SUFDakMsbUVBQVUsQ0FBQTtJQUNWLCtEQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFHakM7QUFFRCxNQUFNLENBQU4sSUFBa0IsYUFLakI7QUFMRCxXQUFrQixhQUFhO0lBQzlCLG1EQUFLLENBQUE7SUFDTCxpREFBSSxDQUFBO0lBQ0osaURBQUksQ0FBQTtJQUNKLHlEQUFRLENBQUE7QUFDVCxDQUFDLEVBTGlCLGFBQWEsS0FBYixhQUFhLFFBSzlCO0FBT0QsTUFBTSxDQUFOLElBQWtCLGlCQWlCakI7QUFqQkQsV0FBa0IsaUJBQWlCO0lBQ2xDOzs7T0FHRztJQUNILGlFQUFRLENBQUE7SUFFUjs7O09BR0c7SUFDSCw2REFBTSxDQUFBO0lBRU47O09BRUc7SUFDSCx5REFBSSxDQUFBO0FBQ0wsQ0FBQyxFQWpCaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQWlCbEM7QUFnQ0QsTUFBTSxDQUFOLElBQWtCLGNBR2pCO0FBSEQsV0FBa0IsY0FBYztJQUMvQixtRUFBWSxDQUFBO0lBQ1osbUVBQVksQ0FBQTtBQUNiLENBQUMsRUFIaUIsY0FBYyxLQUFkLGNBQWMsUUFHL0I7QUEwQ0QsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFdBQW9CO0lBQ3ZELE1BQU0sU0FBUyxHQUFHLFdBQTZDLENBQUM7SUFFaEUsT0FBTyxhQUFhLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDbEYsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixXQWdCakI7QUFoQkQsV0FBa0IsV0FBVztJQUU1Qjs7T0FFRztJQUNILCtEQUFhLENBQUE7SUFFYjs7T0FFRztJQUNILDZFQUFvQixDQUFBO0lBRXBCOztPQUVHO0lBQ0gsbUVBQWUsQ0FBQTtBQUNoQixDQUFDLEVBaEJpQixXQUFXLEtBQVgsV0FBVyxRQWdCNUI7QUErYkQsTUFBTSxDQUFOLElBQWtCLGlCQUlqQjtBQUpELFdBQWtCLGlCQUFpQjtJQUNsQyxxRUFBYyxDQUFBO0lBQ2QsdUVBQWUsQ0FBQTtJQUNmLHVFQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUppQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBSWxDO0FBc1ZELE1BQU0sVUFBVSxhQUFhLENBQUMsR0FBWTtJQUN6QyxNQUFNLEtBQUssR0FBRyxHQUErQixDQUFDO0lBRTlDLE9BQU8sQ0FBQyxDQUFDLEtBQUssSUFBSSxPQUFPLEtBQUssQ0FBQyxFQUFFLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2hGLENBQUM7QUFFRCw4QkFBOEI7QUFFOUIsTUFBTSxVQUFVLGlDQUFpQyxDQUFDLG9CQUEyQztJQUM1RixNQUFNLHVCQUF1QixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0lBRTFHLElBQUksdUJBQXVCLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDeEMsbUNBQTJCO0lBQzVCLENBQUM7SUFFRCxvQ0FBNEI7QUFDN0IsQ0FBQztBQUVELFlBQVkifQ==