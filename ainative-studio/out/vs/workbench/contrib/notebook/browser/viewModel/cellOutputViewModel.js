/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { RENDERER_NOT_AVAILABLE } from '../../common/notebookCommon.js';
let handle = 0;
export class CellOutputViewModel extends Disposable {
    setVisible(visible = true, force = false) {
        if (!visible && this.alwaysShow) {
            // we are forced to show, so no-op
            return;
        }
        if (force && visible) {
            this.alwaysShow = true;
        }
        this.visible.set(visible, undefined);
    }
    get model() {
        return this._outputRawData;
    }
    get pickedMimeType() {
        return this._pickedMimeType;
    }
    set pickedMimeType(value) {
        this._pickedMimeType = value;
    }
    constructor(cellViewModel, _outputRawData, _notebookService) {
        super();
        this.cellViewModel = cellViewModel;
        this._outputRawData = _outputRawData;
        this._notebookService = _notebookService;
        this._onDidResetRendererEmitter = this._register(new Emitter());
        this.onDidResetRenderer = this._onDidResetRendererEmitter.event;
        this.alwaysShow = false;
        this.visible = observableValue('outputVisible', false);
        this.outputHandle = handle++;
    }
    hasMultiMimeType() {
        if (this._outputRawData.outputs.length < 2) {
            return false;
        }
        const firstMimeType = this._outputRawData.outputs[0].mime;
        return this._outputRawData.outputs.some(output => output.mime !== firstMimeType);
    }
    resolveMimeTypes(textModel, kernelProvides) {
        const mimeTypes = this._notebookService.getOutputMimeTypeInfo(textModel, kernelProvides, this.model);
        const index = mimeTypes.findIndex(mimeType => mimeType.rendererId !== RENDERER_NOT_AVAILABLE && mimeType.isTrusted);
        return [mimeTypes, Math.max(index, 0)];
    }
    resetRenderer() {
        // reset the output renderer
        this._pickedMimeType = undefined;
        this.model.bumpVersion();
        this._onDidResetRendererEmitter.fire();
    }
    toRawJSON() {
        return {
            outputs: this._outputRawData.outputs,
            // TODO@rebronix, no id, right?
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9jZWxsT3V0cHV0Vmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRzNFLE9BQU8sRUFBaUMsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUd2RyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDZixNQUFNLE9BQU8sbUJBQW9CLFNBQVEsVUFBVTtJQU1sRCxVQUFVLENBQUMsT0FBTyxHQUFHLElBQUksRUFBRSxRQUFpQixLQUFLO1FBQ2hELElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pDLGtDQUFrQztZQUNsQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksS0FBSyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUdELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM1QixDQUFDO0lBR0QsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxjQUFjLENBQUMsS0FBbUM7UUFDckQsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUVELFlBQ1UsYUFBb0MsRUFDNUIsY0FBMkIsRUFDM0IsZ0JBQWtDO1FBRW5ELEtBQUssRUFBRSxDQUFDO1FBSkMsa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBQzVCLG1CQUFjLEdBQWQsY0FBYyxDQUFhO1FBQzNCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFuQzVDLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2hFLHVCQUFrQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFFNUQsZUFBVSxHQUFHLEtBQUssQ0FBQztRQUMzQixZQUFPLEdBQUcsZUFBZSxDQUFVLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQWMzRCxpQkFBWSxHQUFHLE1BQU0sRUFBRSxDQUFDO0lBb0J4QixDQUFDO0lBRUQsZ0JBQWdCO1FBQ2YsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzFELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsU0FBNEIsRUFBRSxjQUE2QztRQUMzRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckcsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEtBQUssc0JBQXNCLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXBILE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsYUFBYTtRQUNaLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQztRQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQsU0FBUztRQUNSLE9BQU87WUFDTixPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPO1lBQ3BDLCtCQUErQjtTQUMvQixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=