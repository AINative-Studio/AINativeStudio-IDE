/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, CONTEXT_CAN_VIEW_MEMORY, CONTEXT_VARIABLE_IS_READONLY, CONTEXT_DEBUG_TYPE } from './debug.js';
/**
 * Gets a context key overlay that has context for the given variable.
 */
export function getContextForVariable(parentContext, variable, additionalContext = []) {
    const session = variable.getSession();
    const contextKeys = [
        [CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT.key, variable.variableMenuContext || ''],
        [CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT.key, !!variable.evaluateName],
        [CONTEXT_CAN_VIEW_MEMORY.key, !!session?.capabilities.supportsReadMemoryRequest && variable.memoryReference !== undefined],
        [CONTEXT_VARIABLE_IS_READONLY.key, !!variable.presentationHint?.attributes?.includes('readOnly') || variable.presentationHint?.lazy],
        [CONTEXT_DEBUG_TYPE.key, session?.configuration.type],
        ...additionalContext,
    ];
    return parentContext.createOverlay(contextKeys);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z0NvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLDRDQUE0QyxFQUFFLHNDQUFzQyxFQUFFLHVCQUF1QixFQUFFLDRCQUE0QixFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBSTdMOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQixDQUFDLGFBQWlDLEVBQUUsUUFBa0IsRUFBRSxvQkFBeUMsRUFBRTtJQUN2SSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDdEMsTUFBTSxXQUFXLEdBQXdCO1FBQ3hDLENBQUMsNENBQTRDLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsSUFBSSxFQUFFLENBQUM7UUFDdEYsQ0FBQyxzQ0FBc0MsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7UUFDckUsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMseUJBQXlCLElBQUksUUFBUSxDQUFDLGVBQWUsS0FBSyxTQUFTLENBQUM7UUFDMUgsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUM7UUFDcEksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUM7UUFDckQsR0FBRyxpQkFBaUI7S0FDcEIsQ0FBQztJQUVGLE9BQU8sYUFBYSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNqRCxDQUFDIn0=