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
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { INotebookService } from '../../../../notebook/common/notebookService.js';
/**
 * When asking LLM to generate a new notebook, LLM might end up generating the notebook
 * using the raw file format.
 * E.g. assume we ask LLM to generate a new Github Issues notebook, LLM might end up
 * genrating the notebook using the JSON format of github issues file.
 * Such a format is not known to copilot extension and those are sent over as regular
 * text edits for the Notebook URI.
 *
 * In such cases we should accumulate all of the edits, generate the content and deserialize the content
 * into a notebook, then generate notebooke edits to insert these cells.
 */
let ChatEditingNewNotebookContentEdits = class ChatEditingNewNotebookContentEdits {
    constructor(notebook, _notebookService) {
        this.notebook = notebook;
        this._notebookService = _notebookService;
        this.textEdits = [];
    }
    acceptTextEdits(edits) {
        if (edits.length) {
            this.textEdits.push(...edits);
        }
    }
    async generateEdits() {
        if (this.notebook.cells.length) {
            console.error(`Notebook edits not generated as notebook already has cells`);
            return [];
        }
        const content = this.generateContent();
        if (!content) {
            return [];
        }
        const notebookEdits = [];
        try {
            const { serializer } = await this._notebookService.withNotebookDataProvider(this.notebook.viewType);
            const data = await serializer.dataToNotebook(VSBuffer.fromString(content));
            for (let i = 0; i < data.cells.length; i++) {
                notebookEdits.push({
                    editType: 1 /* CellEditType.Replace */,
                    index: i,
                    count: 0,
                    cells: [data.cells[i]]
                });
            }
        }
        catch (ex) {
            console.error(`Failed to generate notebook edits from text edits ${content}`, ex);
            return [];
        }
        return notebookEdits;
    }
    generateContent() {
        try {
            return applyTextEdits(this.textEdits);
        }
        catch (ex) {
            console.error('Failed to generate content from text edits', ex);
            return '';
        }
    }
};
ChatEditingNewNotebookContentEdits = __decorate([
    __param(1, INotebookService)
], ChatEditingNewNotebookContentEdits);
export { ChatEditingNewNotebookContentEdits };
function applyTextEdits(edits) {
    let output = '';
    for (const edit of edits) {
        output = output.slice(0, edit.range.startColumn)
            + edit.text
            + output.slice(edit.range.endColumn);
    }
    return output;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOZXdOb3RlYm9va0NvbnRlbnRFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvbm90ZWJvb2svY2hhdEVkaXRpbmdOZXdOb3RlYm9va0NvbnRlbnRFZGl0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHbEY7Ozs7Ozs7Ozs7R0FVRztBQUNJLElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQWtDO0lBRTlDLFlBQ2tCLFFBQTJCLEVBQzFCLGdCQUFtRDtRQURwRCxhQUFRLEdBQVIsUUFBUSxDQUFtQjtRQUNULHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFIckQsY0FBUyxHQUFlLEVBQUUsQ0FBQztJQUs1QyxDQUFDO0lBRUQsZUFBZSxDQUFDLEtBQWlCO1FBQ2hDLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYTtRQUNsQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQztZQUM1RSxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQXlCLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUM7WUFDSixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNwRyxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzNFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM1QyxhQUFhLENBQUMsSUFBSSxDQUFDO29CQUNsQixRQUFRLDhCQUFzQjtvQkFDOUIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDdEIsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxxREFBcUQsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbEYsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztJQUVPLGVBQWU7UUFDdEIsSUFBSSxDQUFDO1lBQ0osT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRSxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXBEWSxrQ0FBa0M7SUFJNUMsV0FBQSxnQkFBZ0IsQ0FBQTtHQUpOLGtDQUFrQyxDQW9EOUM7O0FBRUQsU0FBUyxjQUFjLENBQUMsS0FBaUI7SUFDeEMsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO2NBQzdDLElBQUksQ0FBQyxJQUFJO2NBQ1QsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==