/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DiffEditorModel } from './diffEditorModel.js';
/**
 * The base text editor model for the diff editor. It is made up of two text editor models, the original version
 * and the modified version.
 */
export class TextDiffEditorModel extends DiffEditorModel {
    get originalModel() { return this._originalModel; }
    get modifiedModel() { return this._modifiedModel; }
    get textDiffEditorModel() { return this._textDiffEditorModel; }
    constructor(originalModel, modifiedModel) {
        super(originalModel, modifiedModel);
        this._textDiffEditorModel = undefined;
        this._originalModel = originalModel;
        this._modifiedModel = modifiedModel;
        this.updateTextDiffEditorModel();
    }
    async resolve() {
        await super.resolve();
        this.updateTextDiffEditorModel();
    }
    updateTextDiffEditorModel() {
        if (this.originalModel?.isResolved() && this.modifiedModel?.isResolved()) {
            // Create new
            if (!this._textDiffEditorModel) {
                this._textDiffEditorModel = {
                    original: this.originalModel.textEditorModel,
                    modified: this.modifiedModel.textEditorModel
                };
            }
            // Update existing
            else {
                this._textDiffEditorModel.original = this.originalModel.textEditorModel;
                this._textDiffEditorModel.modified = this.modifiedModel.textEditorModel;
            }
        }
    }
    isResolved() {
        return !!this._textDiffEditorModel;
    }
    isReadonly() {
        return !!this.modifiedModel && this.modifiedModel.isReadonly();
    }
    dispose() {
        // Free the diff editor model but do not propagate the dispose() call to the two models
        // inside. We never created the two models (original and modified) so we can not dispose
        // them without sideeffects. Rather rely on the models getting disposed when their related
        // inputs get disposed from the diffEditorInput.
        this._textDiffEditorModel = undefined;
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dERpZmZFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci90ZXh0RGlmZkVkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUd2RDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsZUFBZTtJQUd2RCxJQUFhLGFBQWEsS0FBc0MsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUc3RixJQUFhLGFBQWEsS0FBc0MsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUc3RixJQUFJLG1CQUFtQixLQUFtQyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7SUFFN0YsWUFBWSxhQUFrQyxFQUFFLGFBQWtDO1FBQ2pGLEtBQUssQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFKN0IseUJBQW9CLEdBQWlDLFNBQVMsQ0FBQztRQU10RSxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQztRQUNwQyxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQztRQUVwQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU87UUFDckIsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdEIsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBRTFFLGFBQWE7WUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxvQkFBb0IsR0FBRztvQkFDM0IsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZTtvQkFDNUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZTtpQkFDNUMsQ0FBQztZQUNILENBQUM7WUFFRCxrQkFBa0I7aUJBQ2IsQ0FBQztnQkFDTCxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDO2dCQUN4RSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDO1lBQ3pFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVRLFVBQVU7UUFDbEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ3BDLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ2hFLENBQUM7SUFFUSxPQUFPO1FBRWYsdUZBQXVGO1FBQ3ZGLHdGQUF3RjtRQUN4RiwwRkFBMEY7UUFDMUYsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLENBQUM7UUFFdEMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FDRCJ9