/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { preferredSideBySideGroupDirection } from './editorGroupsService.js';
import { ACTIVE_GROUP, SIDE_GROUP } from './editorService.js';
export function columnToEditorGroup(editorGroupService, configurationService, column = ACTIVE_GROUP) {
    if (column === ACTIVE_GROUP || column === SIDE_GROUP) {
        return column; // return early for when column is well known
    }
    let groupInColumn = editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[column];
    // If a column is asked for that does not exist, we create up to 9 columns in accordance
    // to what `ViewColumn` provides and otherwise fallback to `SIDE_GROUP`.
    if (!groupInColumn && column < 9) {
        for (let i = 0; i <= column; i++) {
            const editorGroups = editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
            if (!editorGroups[i]) {
                editorGroupService.addGroup(editorGroups[i - 1], preferredSideBySideGroupDirection(configurationService));
            }
        }
        groupInColumn = editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[column];
    }
    return groupInColumn?.id ?? SIDE_GROUP; // finally open to the side when group not found
}
export function editorGroupToColumn(editorGroupService, editorGroup) {
    const group = (typeof editorGroup === 'number') ? editorGroupService.getGroup(editorGroup) : editorGroup;
    return editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */).indexOf(group ?? editorGroupService.activeGroup);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBDb2x1bW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9jb21tb24vZWRpdG9yR3JvdXBDb2x1bW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFtRCxpQ0FBaUMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzlILE9BQU8sRUFBRSxZQUFZLEVBQXFCLFVBQVUsRUFBbUIsTUFBTSxvQkFBb0IsQ0FBQztBQVNsRyxNQUFNLFVBQVUsbUJBQW1CLENBQUMsa0JBQXdDLEVBQUUsb0JBQTJDLEVBQUUsTUFBTSxHQUFHLFlBQVk7SUFDL0ksSUFBSSxNQUFNLEtBQUssWUFBWSxJQUFJLE1BQU0sS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN0RCxPQUFPLE1BQU0sQ0FBQyxDQUFDLDZDQUE2QztJQUM3RCxDQUFDO0lBRUQsSUFBSSxhQUFhLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxxQ0FBNkIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUV0Rix3RkFBd0Y7SUFDeEYsd0VBQXdFO0lBRXhFLElBQUksQ0FBQyxhQUFhLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNsQyxNQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLHFDQUE2QixDQUFDO1lBQy9FLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsaUNBQWlDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1lBQzNHLENBQUM7UUFDRixDQUFDO1FBRUQsYUFBYSxHQUFHLGtCQUFrQixDQUFDLFNBQVMscUNBQTZCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUVELE9BQU8sYUFBYSxFQUFFLEVBQUUsSUFBSSxVQUFVLENBQUMsQ0FBQyxnREFBZ0Q7QUFDekYsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxrQkFBd0MsRUFBRSxXQUEyQztJQUN4SCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sV0FBVyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztJQUV6RyxPQUFPLGtCQUFrQixDQUFDLFNBQVMscUNBQTZCLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNuSCxDQUFDIn0=