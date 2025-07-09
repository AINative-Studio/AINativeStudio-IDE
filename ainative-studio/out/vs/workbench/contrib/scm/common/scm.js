/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const VIEWLET_ID = 'workbench.view.scm';
export const VIEW_PANE_ID = 'workbench.scm';
export const REPOSITORIES_VIEW_PANE_ID = 'workbench.scm.repositories';
export const HISTORY_VIEW_PANE_ID = 'workbench.scm.history';
export const ISCMService = createDecorator('scm');
export var InputValidationType;
(function (InputValidationType) {
    InputValidationType[InputValidationType["Error"] = 0] = "Error";
    InputValidationType[InputValidationType["Warning"] = 1] = "Warning";
    InputValidationType[InputValidationType["Information"] = 2] = "Information";
})(InputValidationType || (InputValidationType = {}));
export var SCMInputChangeReason;
(function (SCMInputChangeReason) {
    SCMInputChangeReason[SCMInputChangeReason["HistoryPrevious"] = 0] = "HistoryPrevious";
    SCMInputChangeReason[SCMInputChangeReason["HistoryNext"] = 1] = "HistoryNext";
})(SCMInputChangeReason || (SCMInputChangeReason = {}));
export var ISCMRepositorySortKey;
(function (ISCMRepositorySortKey) {
    ISCMRepositorySortKey["DiscoveryTime"] = "discoveryTime";
    ISCMRepositorySortKey["Name"] = "name";
    ISCMRepositorySortKey["Path"] = "path";
})(ISCMRepositorySortKey || (ISCMRepositorySortKey = {}));
export const ISCMViewService = createDecorator('scmView');
export const SCM_CHANGES_EDITOR_ID = 'workbench.editor.scmChangesEditor';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9jb21tb24vc2NtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQWE3RixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUM7QUFDL0MsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQztBQUM1QyxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyw0QkFBNEIsQ0FBQztBQUN0RSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyx1QkFBdUIsQ0FBQztBQU01RCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFjLEtBQUssQ0FBQyxDQUFDO0FBZ0UvRCxNQUFNLENBQU4sSUFBa0IsbUJBSWpCO0FBSkQsV0FBa0IsbUJBQW1CO0lBQ3BDLCtEQUFTLENBQUE7SUFDVCxtRUFBVyxDQUFBO0lBQ1gsMkVBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSmlCLG1CQUFtQixLQUFuQixtQkFBbUIsUUFJcEM7QUFXRCxNQUFNLENBQU4sSUFBWSxvQkFHWDtBQUhELFdBQVksb0JBQW9CO0lBQy9CLHFGQUFlLENBQUE7SUFDZiw2RUFBVyxDQUFBO0FBQ1osQ0FBQyxFQUhXLG9CQUFvQixLQUFwQixvQkFBb0IsUUFHL0I7QUF3RkQsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0Qyx3REFBK0IsQ0FBQTtJQUMvQixzQ0FBYSxDQUFBO0lBQ2Isc0NBQWEsQ0FBQTtBQUNkLENBQUMsRUFKaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUl0QztBQUVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLFNBQVMsQ0FBQyxDQUFDO0FBa0MzRSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxtQ0FBbUMsQ0FBQyJ9