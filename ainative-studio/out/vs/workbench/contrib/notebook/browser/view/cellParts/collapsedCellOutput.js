/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as DOM from '../../../../../../base/browser/dom.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { EXPAND_CELL_OUTPUT_COMMAND_ID } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
const $ = DOM.$;
let CollapsedCellOutput = class CollapsedCellOutput extends CellContentPart {
    constructor(notebookEditor, cellOutputCollapseContainer, keybindingService) {
        super();
        this.notebookEditor = notebookEditor;
        const placeholder = DOM.append(cellOutputCollapseContainer, $('span.expandOutputPlaceholder'));
        placeholder.textContent = localize('cellOutputsCollapsedMsg', "Outputs are collapsed");
        const expandIcon = DOM.append(cellOutputCollapseContainer, $('span.expandOutputIcon'));
        expandIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.more));
        const keybinding = keybindingService.lookupKeybinding(EXPAND_CELL_OUTPUT_COMMAND_ID);
        if (keybinding) {
            placeholder.title = localize('cellExpandOutputButtonLabelWithDoubleClick', "Double-click to expand cell output ({0})", keybinding.getLabel());
            cellOutputCollapseContainer.title = localize('cellExpandOutputButtonLabel', "Expand Cell Output (${0})", keybinding.getLabel());
        }
        DOM.hide(cellOutputCollapseContainer);
        this._register(DOM.addDisposableListener(expandIcon, DOM.EventType.CLICK, () => this.expand()));
        this._register(DOM.addDisposableListener(cellOutputCollapseContainer, DOM.EventType.DBLCLICK, () => this.expand()));
    }
    expand() {
        if (!this.currentCell) {
            return;
        }
        if (!this.currentCell) {
            return;
        }
        const textModel = this.notebookEditor.textModel;
        const index = textModel.cells.indexOf(this.currentCell.model);
        if (index < 0) {
            return;
        }
        this.currentCell.isOutputCollapsed = !this.currentCell.isOutputCollapsed;
    }
};
CollapsedCellOutput = __decorate([
    __param(2, IKeybindingService)
], CollapsedCellOutput);
export { CollapsedCellOutput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGFwc2VkQ2VsbE91dHB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NvbGxhcHNlZENlbGxPdXRwdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsNkJBQTZCLEVBQW1CLE1BQU0sMEJBQTBCLENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRWpELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFVCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLGVBQWU7SUFDdkQsWUFDa0IsY0FBK0IsRUFDaEQsMkJBQXdDLEVBQ3BCLGlCQUFxQztRQUV6RCxLQUFLLEVBQUUsQ0FBQztRQUpTLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQU1oRCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFnQixDQUFDO1FBQzlHLFdBQVcsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDdkYsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXRFLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDckYsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixXQUFXLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSwwQ0FBMEMsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUM5SSwyQkFBMkIsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDJCQUEyQixFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2pJLENBQUM7UUFFRCxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFFdEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNySCxDQUFDO0lBRU8sTUFBTTtRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFVLENBQUM7UUFDakQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU5RCxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNmLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUM7SUFDMUUsQ0FBQztDQUNELENBQUE7QUEzQ1ksbUJBQW1CO0lBSTdCLFdBQUEsa0JBQWtCLENBQUE7R0FKUixtQkFBbUIsQ0EyQy9CIn0=