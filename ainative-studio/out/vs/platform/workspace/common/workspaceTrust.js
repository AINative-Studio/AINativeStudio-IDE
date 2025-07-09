/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var WorkspaceTrustScope;
(function (WorkspaceTrustScope) {
    WorkspaceTrustScope[WorkspaceTrustScope["Local"] = 0] = "Local";
    WorkspaceTrustScope[WorkspaceTrustScope["Remote"] = 1] = "Remote";
})(WorkspaceTrustScope || (WorkspaceTrustScope = {}));
export const IWorkspaceTrustEnablementService = createDecorator('workspaceTrustEnablementService');
export const IWorkspaceTrustManagementService = createDecorator('workspaceTrustManagementService');
export var WorkspaceTrustUriResponse;
(function (WorkspaceTrustUriResponse) {
    WorkspaceTrustUriResponse[WorkspaceTrustUriResponse["Open"] = 1] = "Open";
    WorkspaceTrustUriResponse[WorkspaceTrustUriResponse["OpenInNewWindow"] = 2] = "OpenInNewWindow";
    WorkspaceTrustUriResponse[WorkspaceTrustUriResponse["Cancel"] = 3] = "Cancel";
})(WorkspaceTrustUriResponse || (WorkspaceTrustUriResponse = {}));
export const IWorkspaceTrustRequestService = createDecorator('workspaceTrustRequestService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlL2NvbW1vbi93b3Jrc3BhY2VUcnVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsTUFBTSxDQUFOLElBQVksbUJBR1g7QUFIRCxXQUFZLG1CQUFtQjtJQUM5QiwrREFBUyxDQUFBO0lBQ1QsaUVBQVUsQ0FBQTtBQUNYLENBQUMsRUFIVyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBRzlCO0FBWUQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsZUFBZSxDQUFtQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBUXJJLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLGVBQWUsQ0FBbUMsaUNBQWlDLENBQUMsQ0FBQztBQThCckksTUFBTSxDQUFOLElBQWtCLHlCQUlqQjtBQUpELFdBQWtCLHlCQUF5QjtJQUMxQyx5RUFBUSxDQUFBO0lBQ1IsK0ZBQW1CLENBQUE7SUFDbkIsNkVBQVUsQ0FBQTtBQUNYLENBQUMsRUFKaUIseUJBQXlCLEtBQXpCLHlCQUF5QixRQUkxQztBQUVELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FBZ0MsOEJBQThCLENBQUMsQ0FBQyJ9