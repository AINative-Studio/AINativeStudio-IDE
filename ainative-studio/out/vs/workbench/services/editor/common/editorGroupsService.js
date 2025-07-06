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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9jb21tb24vZWRpdG9yR3JvdXBzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQXlCLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3BILE9BQU8sRUFBcU0sYUFBYSxFQUE0RyxNQUFNLDJCQUEyQixDQUFDO0FBYXZXLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQztBQUVqRyxNQUFNLENBQU4sSUFBa0IsY0FLakI7QUFMRCxXQUFrQixjQUFjO0lBQy9CLCtDQUFFLENBQUE7SUFDRixtREFBSSxDQUFBO0lBQ0osbURBQUksQ0FBQTtJQUNKLHFEQUFLLENBQUE7QUFDTixDQUFDLEVBTGlCLGNBQWMsS0FBZCxjQUFjLFFBSy9CO0FBRUQsTUFBTSxDQUFOLElBQWtCLGdCQUdqQjtBQUhELFdBQWtCLGdCQUFnQjtJQUNqQyxtRUFBVSxDQUFBO0lBQ1YsK0RBQVEsQ0FBQTtBQUNULENBQUMsRUFIaUIsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUdqQztBQUVELE1BQU0sQ0FBTixJQUFrQixhQUtqQjtBQUxELFdBQWtCLGFBQWE7SUFDOUIsbURBQUssQ0FBQTtJQUNMLGlEQUFJLENBQUE7SUFDSixpREFBSSxDQUFBO0lBQ0oseURBQVEsQ0FBQTtBQUNULENBQUMsRUFMaUIsYUFBYSxLQUFiLGFBQWEsUUFLOUI7QUFPRCxNQUFNLENBQU4sSUFBa0IsaUJBaUJqQjtBQWpCRCxXQUFrQixpQkFBaUI7SUFDbEM7OztPQUdHO0lBQ0gsaUVBQVEsQ0FBQTtJQUVSOzs7T0FHRztJQUNILDZEQUFNLENBQUE7SUFFTjs7T0FFRztJQUNILHlEQUFJLENBQUE7QUFDTCxDQUFDLEVBakJpQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBaUJsQztBQWdDRCxNQUFNLENBQU4sSUFBa0IsY0FHakI7QUFIRCxXQUFrQixjQUFjO0lBQy9CLG1FQUFZLENBQUE7SUFDWixtRUFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUhpQixjQUFjLEtBQWQsY0FBYyxRQUcvQjtBQTBDRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsV0FBb0I7SUFDdkQsTUFBTSxTQUFTLEdBQUcsV0FBNkMsQ0FBQztJQUVoRSxPQUFPLGFBQWEsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNsRixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLFdBZ0JqQjtBQWhCRCxXQUFrQixXQUFXO0lBRTVCOztPQUVHO0lBQ0gsK0RBQWEsQ0FBQTtJQUViOztPQUVHO0lBQ0gsNkVBQW9CLENBQUE7SUFFcEI7O09BRUc7SUFDSCxtRUFBZSxDQUFBO0FBQ2hCLENBQUMsRUFoQmlCLFdBQVcsS0FBWCxXQUFXLFFBZ0I1QjtBQStiRCxNQUFNLENBQU4sSUFBa0IsaUJBSWpCO0FBSkQsV0FBa0IsaUJBQWlCO0lBQ2xDLHFFQUFjLENBQUE7SUFDZCx1RUFBZSxDQUFBO0lBQ2YsdUVBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSmlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFJbEM7QUFzVkQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxHQUFZO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLEdBQStCLENBQUM7SUFFOUMsT0FBTyxDQUFDLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLEVBQUUsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDaEYsQ0FBQztBQUVELDhCQUE4QjtBQUU5QixNQUFNLFVBQVUsaUNBQWlDLENBQUMsb0JBQTJDO0lBQzVGLE1BQU0sdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxDQUFDLENBQUM7SUFFMUcsSUFBSSx1QkFBdUIsS0FBSyxNQUFNLEVBQUUsQ0FBQztRQUN4QyxtQ0FBMkI7SUFDNUIsQ0FBQztJQUVELG9DQUE0QjtBQUM3QixDQUFDO0FBRUQsWUFBWSJ9