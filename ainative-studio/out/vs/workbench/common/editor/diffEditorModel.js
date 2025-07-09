/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorModel } from './editorModel.js';
/**
 * The base editor model for the diff editor. It is made up of two editor models, the original version
 * and the modified version.
 */
export class DiffEditorModel extends EditorModel {
    get originalModel() { return this._originalModel; }
    get modifiedModel() { return this._modifiedModel; }
    constructor(originalModel, modifiedModel) {
        super();
        this._originalModel = originalModel;
        this._modifiedModel = modifiedModel;
    }
    async resolve() {
        await Promise.all([
            this._originalModel?.resolve(),
            this._modifiedModel?.resolve()
        ]);
    }
    isResolved() {
        return !!(this._originalModel?.isResolved() && this._modifiedModel?.isResolved());
    }
    dispose() {
        // Do not propagate the dispose() call to the two models inside. We never created the two models
        // (original and modified) so we can not dispose them without sideeffects. Rather rely on the
        // models getting disposed when their related inputs get disposed from the diffEditorInput.
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL2RpZmZFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHL0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGVBQWdCLFNBQVEsV0FBVztJQUcvQyxJQUFJLGFBQWEsS0FBeUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUd2RixJQUFJLGFBQWEsS0FBeUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUV2RixZQUFZLGFBQWlELEVBQUUsYUFBaUQ7UUFDL0csS0FBSyxFQUFFLENBQUM7UUFFUixJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQztRQUNwQyxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQztJQUNyQyxDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU87UUFDckIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFO1lBQzlCLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFO1NBQzlCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxVQUFVO1FBQ2xCLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUVRLE9BQU87UUFFZixnR0FBZ0c7UUFDaEcsNkZBQTZGO1FBQzdGLDJGQUEyRjtRQUUzRixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNEIn0=