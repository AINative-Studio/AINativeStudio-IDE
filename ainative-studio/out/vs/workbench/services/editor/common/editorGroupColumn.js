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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBDb2x1bW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2NvbW1vbi9lZGl0b3JHcm91cENvbHVtbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQW1ELGlDQUFpQyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDOUgsT0FBTyxFQUFFLFlBQVksRUFBcUIsVUFBVSxFQUFtQixNQUFNLG9CQUFvQixDQUFDO0FBU2xHLE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxrQkFBd0MsRUFBRSxvQkFBMkMsRUFBRSxNQUFNLEdBQUcsWUFBWTtJQUMvSSxJQUFJLE1BQU0sS0FBSyxZQUFZLElBQUksTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ3RELE9BQU8sTUFBTSxDQUFDLENBQUMsNkNBQTZDO0lBQzdELENBQUM7SUFFRCxJQUFJLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLHFDQUE2QixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXRGLHdGQUF3RjtJQUN4Rix3RUFBd0U7SUFFeEUsSUFBSSxDQUFDLGFBQWEsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLFNBQVMscUNBQTZCLENBQUM7WUFDL0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN0QixrQkFBa0IsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxpQ0FBaUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7WUFDM0csQ0FBQztRQUNGLENBQUM7UUFFRCxhQUFhLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxxQ0FBNkIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRUQsT0FBTyxhQUFhLEVBQUUsRUFBRSxJQUFJLFVBQVUsQ0FBQyxDQUFDLGdEQUFnRDtBQUN6RixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLGtCQUF3QyxFQUFFLFdBQTJDO0lBQ3hILE1BQU0sS0FBSyxHQUFHLENBQUMsT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0lBRXpHLE9BQU8sa0JBQWtCLENBQUMsU0FBUyxxQ0FBNkIsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ25ILENBQUMifQ==