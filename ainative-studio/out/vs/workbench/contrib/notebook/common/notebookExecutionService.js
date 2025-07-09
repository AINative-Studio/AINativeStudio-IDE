/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var CellExecutionUpdateType;
(function (CellExecutionUpdateType) {
    CellExecutionUpdateType[CellExecutionUpdateType["Output"] = 1] = "Output";
    CellExecutionUpdateType[CellExecutionUpdateType["OutputItems"] = 2] = "OutputItems";
    CellExecutionUpdateType[CellExecutionUpdateType["ExecutionState"] = 3] = "ExecutionState";
})(CellExecutionUpdateType || (CellExecutionUpdateType = {}));
export const INotebookExecutionService = createDecorator('INotebookExecutionService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0V4ZWN1dGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBSzdGLE1BQU0sQ0FBTixJQUFZLHVCQUlYO0FBSkQsV0FBWSx1QkFBdUI7SUFDbEMseUVBQVUsQ0FBQTtJQUNWLG1GQUFlLENBQUE7SUFDZix5RkFBa0IsQ0FBQTtBQUNuQixDQUFDLEVBSlcsdUJBQXVCLEtBQXZCLHVCQUF1QixRQUlsQztBQWdCRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDJCQUEyQixDQUFDLENBQUMifQ==