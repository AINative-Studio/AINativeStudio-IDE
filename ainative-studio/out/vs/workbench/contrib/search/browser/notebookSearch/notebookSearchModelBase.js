/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isSearchTreeFileMatch } from '../searchTreeModel/searchTreeCommon.js';
export function isNotebookFileMatch(obj) {
    return obj &&
        typeof obj.bindNotebookEditorWidget === 'function' &&
        typeof obj.updateMatchesForEditorWidget === 'function' &&
        typeof obj.unbindNotebookEditorWidget === 'function' &&
        typeof obj.updateNotebookHighlights === 'function'
        && isSearchTreeFileMatch(obj);
}
export function isIMatchInNotebook(obj) {
    return typeof obj === 'object' &&
        obj !== null &&
        typeof obj.parent === 'function' &&
        typeof obj.cellParent === 'object' &&
        typeof obj.isWebviewMatch === 'function' &&
        typeof obj.cellIndex === 'number' &&
        (typeof obj.webviewIndex === 'number' || obj.webviewIndex === undefined) &&
        (typeof obj.cell === 'object' || obj.cell === undefined);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hNb2RlbEJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL25vdGVib29rU2VhcmNoL25vdGVib29rU2VhcmNoTW9kZWxCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBMEMscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQWN2SCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsR0FBUTtJQUMzQyxPQUFPLEdBQUc7UUFDVCxPQUFPLEdBQUcsQ0FBQyx3QkFBd0IsS0FBSyxVQUFVO1FBQ2xELE9BQU8sR0FBRyxDQUFDLDRCQUE0QixLQUFLLFVBQVU7UUFDdEQsT0FBTyxHQUFHLENBQUMsMEJBQTBCLEtBQUssVUFBVTtRQUNwRCxPQUFPLEdBQUcsQ0FBQyx3QkFBd0IsS0FBSyxVQUFVO1dBQy9DLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLENBQUM7QUFVRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsR0FBUTtJQUMxQyxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDN0IsR0FBRyxLQUFLLElBQUk7UUFDWixPQUFPLEdBQUcsQ0FBQyxNQUFNLEtBQUssVUFBVTtRQUNoQyxPQUFPLEdBQUcsQ0FBQyxVQUFVLEtBQUssUUFBUTtRQUNsQyxPQUFPLEdBQUcsQ0FBQyxjQUFjLEtBQUssVUFBVTtRQUN4QyxPQUFPLEdBQUcsQ0FBQyxTQUFTLEtBQUssUUFBUTtRQUNqQyxDQUFDLE9BQU8sR0FBRyxDQUFDLFlBQVksS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLFlBQVksS0FBSyxTQUFTLENBQUM7UUFDeEUsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUM7QUFDM0QsQ0FBQyJ9