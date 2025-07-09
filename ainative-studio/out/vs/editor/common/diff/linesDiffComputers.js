/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LegacyLinesDiffComputer } from './legacyLinesDiffComputer.js';
import { DefaultLinesDiffComputer } from './defaultLinesDiffComputer/defaultLinesDiffComputer.js';
export const linesDiffComputers = {
    getLegacy: () => new LegacyLinesDiffComputer(),
    getDefault: () => new DefaultLinesDiffComputer(),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEaWZmQ29tcHV0ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9saW5lc0RpZmZDb21wdXRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFHbEcsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUc7SUFDakMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksdUJBQXVCLEVBQUU7SUFDOUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksd0JBQXdCLEVBQUU7Q0FDRyxDQUFDIn0=