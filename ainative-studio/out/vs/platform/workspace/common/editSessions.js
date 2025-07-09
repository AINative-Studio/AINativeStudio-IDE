/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IEditSessionIdentityService = createDecorator('editSessionIdentityService');
export var EditSessionIdentityMatch;
(function (EditSessionIdentityMatch) {
    EditSessionIdentityMatch[EditSessionIdentityMatch["Complete"] = 100] = "Complete";
    EditSessionIdentityMatch[EditSessionIdentityMatch["Partial"] = 50] = "Partial";
    EditSessionIdentityMatch[EditSessionIdentityMatch["None"] = 0] = "None";
})(EditSessionIdentityMatch || (EditSessionIdentityMatch = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZS9jb21tb24vZWRpdFNlc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQVM5RSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQThCLDRCQUE0QixDQUFDLENBQUM7QUFnQnRILE1BQU0sQ0FBTixJQUFZLHdCQUlYO0FBSkQsV0FBWSx3QkFBd0I7SUFDbkMsaUZBQWMsQ0FBQTtJQUNkLDhFQUFZLENBQUE7SUFDWix1RUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUpXLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFJbkMifQ==