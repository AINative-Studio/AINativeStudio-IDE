/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { parse } from '../../../../base/common/marshalling.js';
import { MergeEditorInput, MergeEditorInputData } from './mergeEditorInput.js';
export class MergeEditorSerializer {
    canSerialize() {
        return true;
    }
    serialize(editor) {
        return JSON.stringify(this.toJSON(editor));
    }
    toJSON(editor) {
        return {
            base: editor.base,
            input1: editor.input1,
            input2: editor.input2,
            result: editor.result,
        };
    }
    deserialize(instantiationService, raw) {
        try {
            const data = parse(raw);
            return instantiationService.createInstance(MergeEditorInput, data.base, new MergeEditorInputData(data.input1.uri, data.input1.title, data.input1.detail, data.input1.description), new MergeEditorInputData(data.input2.uri, data.input2.title, data.input2.detail, data.input2.description), data.result);
        }
        catch (err) {
            onUnexpectedError(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JTZXJpYWxpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbWVyZ2VFZGl0b3JTZXJpYWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUkvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUvRSxNQUFNLE9BQU8scUJBQXFCO0lBQ2pDLFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBd0I7UUFDakMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQXdCO1FBQzlCLE9BQU87WUFDTixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7WUFDakIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1lBQ3JCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNyQixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07U0FDckIsQ0FBQztJQUNILENBQUM7SUFFRCxXQUFXLENBQUMsb0JBQTJDLEVBQUUsR0FBVztRQUNuRSxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksR0FBeUIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlDLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUN6QyxnQkFBZ0IsRUFDaEIsSUFBSSxDQUFDLElBQUksRUFDVCxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQ3pHLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFDekcsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDO1FBQ0gsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=