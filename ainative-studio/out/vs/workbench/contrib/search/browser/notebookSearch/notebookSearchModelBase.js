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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hNb2RlbEJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvbm90ZWJvb2tTZWFyY2gvbm90ZWJvb2tTZWFyY2hNb2RlbEJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUEwQyxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBY3ZILE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxHQUFRO0lBQzNDLE9BQU8sR0FBRztRQUNULE9BQU8sR0FBRyxDQUFDLHdCQUF3QixLQUFLLFVBQVU7UUFDbEQsT0FBTyxHQUFHLENBQUMsNEJBQTRCLEtBQUssVUFBVTtRQUN0RCxPQUFPLEdBQUcsQ0FBQywwQkFBMEIsS0FBSyxVQUFVO1FBQ3BELE9BQU8sR0FBRyxDQUFDLHdCQUF3QixLQUFLLFVBQVU7V0FDL0MscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQVVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFRO0lBQzFDLE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUTtRQUM3QixHQUFHLEtBQUssSUFBSTtRQUNaLE9BQU8sR0FBRyxDQUFDLE1BQU0sS0FBSyxVQUFVO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLFVBQVUsS0FBSyxRQUFRO1FBQ2xDLE9BQU8sR0FBRyxDQUFDLGNBQWMsS0FBSyxVQUFVO1FBQ3hDLE9BQU8sR0FBRyxDQUFDLFNBQVMsS0FBSyxRQUFRO1FBQ2pDLENBQUMsT0FBTyxHQUFHLENBQUMsWUFBWSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQztRQUN4RSxDQUFDLE9BQU8sR0FBRyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQztBQUMzRCxDQUFDIn0=