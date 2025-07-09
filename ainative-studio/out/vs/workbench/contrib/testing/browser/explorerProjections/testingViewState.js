/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TestId } from '../../common/testId.js';
/**
 * Gets whether the given test ID is collapsed.
 */
export function isCollapsedInSerializedTestTree(serialized, id) {
    if (!(id instanceof TestId)) {
        id = TestId.fromString(id);
    }
    let node = serialized;
    for (const part of id.path) {
        if (!node.children?.hasOwnProperty(part)) {
            return undefined;
        }
        node = node.children[part];
    }
    return node.collapsed;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1ZpZXdTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvZXhwbG9yZXJQcm9qZWN0aW9ucy90ZXN0aW5nVmlld1N0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQU9oRDs7R0FFRztBQUNILE1BQU0sVUFBVSwrQkFBK0IsQ0FBQyxVQUE0QyxFQUFFLEVBQW1CO0lBQ2hILElBQUksQ0FBQyxDQUFDLEVBQUUsWUFBWSxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQzdCLEVBQUUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxJQUFJLElBQUksR0FBRyxVQUFVLENBQUM7SUFDdEIsS0FBSyxNQUFNLElBQUksSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7QUFDdkIsQ0FBQyJ9