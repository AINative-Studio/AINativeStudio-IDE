/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const variablePageSize = 100;
export var ProxyKernelState;
(function (ProxyKernelState) {
    ProxyKernelState[ProxyKernelState["Disconnected"] = 1] = "Disconnected";
    ProxyKernelState[ProxyKernelState["Connected"] = 2] = "Connected";
    ProxyKernelState[ProxyKernelState["Initializing"] = 3] = "Initializing";
})(ProxyKernelState || (ProxyKernelState = {}));
export const INotebookKernelService = createDecorator('INotebookKernelService');
export const INotebookKernelHistoryService = createDecorator('INotebookKernelHistoryService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0tlcm5lbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBb0M3RixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUM7QUEwQnBDLE1BQU0sQ0FBTixJQUFrQixnQkFJakI7QUFKRCxXQUFrQixnQkFBZ0I7SUFDakMsdUVBQWdCLENBQUE7SUFDaEIsaUVBQWEsQ0FBQTtJQUNiLHVFQUFnQixDQUFBO0FBQ2pCLENBQUMsRUFKaUIsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUlqQztBQStCRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUM7QUFvRHhHLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FBZ0MsK0JBQStCLENBQUMsQ0FBQyJ9