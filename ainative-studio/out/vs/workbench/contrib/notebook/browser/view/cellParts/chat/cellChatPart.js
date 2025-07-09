/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CellContentPart } from '../../cellPart.js';
export class CellChatPart extends CellContentPart {
    // private _controller: NotebookCellChatController | undefined;
    get activeCell() {
        return this.currentCell;
    }
    constructor(_notebookEditor, _partContainer) {
        super();
    }
    didRenderCell(element) {
        super.didRenderCell(element);
    }
    unrenderCell(element) {
        super.unrenderCell(element);
    }
    updateInternalLayoutNow(element) {
    }
    dispose() {
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENoYXRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2hhdC9jZWxsQ2hhdFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXBELE1BQU0sT0FBTyxZQUFhLFNBQVEsZUFBZTtJQUNoRCwrREFBK0Q7SUFFL0QsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxZQUNDLGVBQXdDLEVBQ3hDLGNBQTJCO1FBRTNCLEtBQUssRUFBRSxDQUFDO0lBQ1QsQ0FBQztJQUVRLGFBQWEsQ0FBQyxPQUF1QjtRQUM3QyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFUSxZQUFZLENBQUMsT0FBdUI7UUFDNUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRVEsdUJBQXVCLENBQUMsT0FBdUI7SUFDeEQsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNEIn0=