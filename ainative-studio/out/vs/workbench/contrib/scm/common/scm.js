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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2NvbW1vbi9zY20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBYTdGLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQztBQUMvQyxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDO0FBQzVDLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLDRCQUE0QixDQUFDO0FBQ3RFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLHVCQUF1QixDQUFDO0FBTTVELE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQWMsS0FBSyxDQUFDLENBQUM7QUFnRS9ELE1BQU0sQ0FBTixJQUFrQixtQkFJakI7QUFKRCxXQUFrQixtQkFBbUI7SUFDcEMsK0RBQVMsQ0FBQTtJQUNULG1FQUFXLENBQUE7SUFDWCwyRUFBZSxDQUFBO0FBQ2hCLENBQUMsRUFKaUIsbUJBQW1CLEtBQW5CLG1CQUFtQixRQUlwQztBQVdELE1BQU0sQ0FBTixJQUFZLG9CQUdYO0FBSEQsV0FBWSxvQkFBb0I7SUFDL0IscUZBQWUsQ0FBQTtJQUNmLDZFQUFXLENBQUE7QUFDWixDQUFDLEVBSFcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUcvQjtBQXdGRCxNQUFNLENBQU4sSUFBa0IscUJBSWpCO0FBSkQsV0FBa0IscUJBQXFCO0lBQ3RDLHdEQUErQixDQUFBO0lBQy9CLHNDQUFhLENBQUE7SUFDYixzQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBRUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsU0FBUyxDQUFDLENBQUM7QUFrQzNFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLG1DQUFtQyxDQUFDIn0=