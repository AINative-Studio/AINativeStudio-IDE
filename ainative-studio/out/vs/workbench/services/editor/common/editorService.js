/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { isEditorGroup } from './editorGroupsService.js';
export const IEditorService = createDecorator('editorService');
/**
 * Open an editor in the currently active group.
 */
export const ACTIVE_GROUP = -1;
/**
 * Open an editor to the side of the active group.
 */
export const SIDE_GROUP = -2;
/**
 * Open an editor in a new auxiliary window.
 */
export const AUX_WINDOW_GROUP = -3;
export function isPreferredGroup(obj) {
    const candidate = obj;
    return typeof obj === 'number' || isEditorGroup(candidate);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2NvbW1vbi9lZGl0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU03RixPQUFPLEVBQTZELGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBS3BILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQWlCLGVBQWUsQ0FBQyxDQUFDO0FBRS9FOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRy9COztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRzdCOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFLbkMsTUFBTSxVQUFVLGdCQUFnQixDQUFDLEdBQVk7SUFDNUMsTUFBTSxTQUFTLEdBQUcsR0FBaUMsQ0FBQztJQUVwRCxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDNUQsQ0FBQyJ9