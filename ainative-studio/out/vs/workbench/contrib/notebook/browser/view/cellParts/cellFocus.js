/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { CellContentPart } from '../cellPart.js';
export class CellFocusPart extends CellContentPart {
    constructor(containerElement, focusSinkElement, notebookEditor) {
        super();
        this._register(DOM.addDisposableListener(containerElement, DOM.EventType.FOCUS, () => {
            if (this.currentCell) {
                notebookEditor.focusElement(this.currentCell);
            }
        }, true));
        if (focusSinkElement) {
            this._register(DOM.addDisposableListener(focusSinkElement, DOM.EventType.FOCUS, () => {
                if (this.currentCell && this.currentCell.outputsViewModels.length) {
                    notebookEditor.focusNotebookCell(this.currentCell, 'output');
                }
            }));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEZvY3VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbEZvY3VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFFN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBR2pELE1BQU0sT0FBTyxhQUFjLFNBQVEsZUFBZTtJQUNqRCxZQUNDLGdCQUE2QixFQUM3QixnQkFBeUMsRUFDekMsY0FBK0I7UUFFL0IsS0FBSyxFQUFFLENBQUM7UUFFUixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7WUFDcEYsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDRixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVWLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ3BGLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSyxJQUFJLENBQUMsV0FBaUMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDMUYsY0FBYyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzlELENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9