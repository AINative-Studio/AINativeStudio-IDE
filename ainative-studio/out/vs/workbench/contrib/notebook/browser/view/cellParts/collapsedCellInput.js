/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { CellContentPart } from '../cellPart.js';
export class CollapsedCellInput extends CellContentPart {
    constructor(notebookEditor, cellInputCollapsedContainer) {
        super();
        this.notebookEditor = notebookEditor;
        this._register(DOM.addDisposableListener(cellInputCollapsedContainer, DOM.EventType.DBLCLICK, e => {
            if (!this.currentCell || !this.notebookEditor.hasModel()) {
                return;
            }
            if (this.currentCell.isInputCollapsed) {
                this.currentCell.isInputCollapsed = false;
            }
            else {
                this.currentCell.isOutputCollapsed = false;
            }
        }));
        this._register(DOM.addDisposableListener(cellInputCollapsedContainer, DOM.EventType.CLICK, e => {
            if (!this.currentCell || !this.notebookEditor.hasModel()) {
                return;
            }
            const element = e.target;
            if (element && element.classList && element.classList.contains('expandInputIcon')) {
                // clicked on the expand icon
                this.currentCell.isInputCollapsed = false;
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGFwc2VkQ2VsbElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY29sbGFwc2VkQ2VsbElucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFFN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRWpELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxlQUFlO0lBQ3RELFlBQ2tCLGNBQStCLEVBQ2hELDJCQUF3QztRQUV4QyxLQUFLLEVBQUUsQ0FBQztRQUhTLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUtoRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUNqRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDMUQsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7WUFDM0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDOUYsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQzFELE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE1BQXFCLENBQUM7WUFFeEMsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ25GLDZCQUE2QjtnQkFDN0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7WUFDM0MsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QifQ==