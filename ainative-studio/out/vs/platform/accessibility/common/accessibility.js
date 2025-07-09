/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../contextkey/common/contextkey.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IAccessibilityService = createDecorator('accessibilityService');
export var AccessibilitySupport;
(function (AccessibilitySupport) {
    /**
     * This should be the browser case where it is not known if a screen reader is attached or no.
     */
    AccessibilitySupport[AccessibilitySupport["Unknown"] = 0] = "Unknown";
    AccessibilitySupport[AccessibilitySupport["Disabled"] = 1] = "Disabled";
    AccessibilitySupport[AccessibilitySupport["Enabled"] = 2] = "Enabled";
})(AccessibilitySupport || (AccessibilitySupport = {}));
export const CONTEXT_ACCESSIBILITY_MODE_ENABLED = new RawContextKey('accessibilityModeEnabled', false);
export function isAccessibilityInformation(obj) {
    return obj && typeof obj === 'object'
        && typeof obj.label === 'string'
        && (typeof obj.role === 'undefined' || typeof obj.role === 'string');
}
export const ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX = 'ACCESSIBLE_VIEW_SHOWN_';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5L2NvbW1vbi9hY2Nlc3NpYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBaUJwRyxNQUFNLENBQU4sSUFBa0Isb0JBU2pCO0FBVEQsV0FBa0Isb0JBQW9CO0lBQ3JDOztPQUVHO0lBQ0gscUVBQVcsQ0FBQTtJQUVYLHVFQUFZLENBQUE7SUFFWixxRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQVRpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBU3JDO0FBRUQsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQUcsSUFBSSxhQUFhLENBQVUsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFPaEgsTUFBTSxVQUFVLDBCQUEwQixDQUFDLEdBQVE7SUFDbEQsT0FBTyxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUTtXQUNqQyxPQUFPLEdBQUcsQ0FBQyxLQUFLLEtBQUssUUFBUTtXQUM3QixDQUFDLE9BQU8sR0FBRyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZFLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyx3QkFBd0IsQ0FBQyJ9