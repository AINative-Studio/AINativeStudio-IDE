/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReportExtensionIssueAction_1;
import * as nls from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { IWorkbenchIssueService } from '../../issue/common/issue.js';
let ReportExtensionIssueAction = class ReportExtensionIssueAction extends Action {
    static { ReportExtensionIssueAction_1 = this; }
    static { this._id = 'workbench.extensions.action.reportExtensionIssue'; }
    static { this._label = nls.localize('reportExtensionIssue', "Report Issue"); }
    // TODO: Consider passing in IExtensionStatus or IExtensionHostProfile for additional data
    constructor(extension, issueService) {
        super(ReportExtensionIssueAction_1._id, ReportExtensionIssueAction_1._label, 'extension-action report-issue');
        this.extension = extension;
        this.issueService = issueService;
        this.enabled = extension.isBuiltin || (!!extension.repository && !!extension.repository.url);
    }
    async run() {
        await this.issueService.openReporter({
            extensionId: this.extension.identifier.value,
        });
    }
};
ReportExtensionIssueAction = ReportExtensionIssueAction_1 = __decorate([
    __param(1, IWorkbenchIssueService)
], ReportExtensionIssueAction);
export { ReportExtensionIssueAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwb3J0RXh0ZW5zaW9uSXNzdWVBY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9jb21tb24vcmVwb3J0RXh0ZW5zaW9uSXNzdWVBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTlELElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsTUFBTTs7YUFFN0IsUUFBRyxHQUFHLGtEQUFrRCxBQUFyRCxDQUFzRDthQUN6RCxXQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxjQUFjLENBQUMsQUFBdkQsQ0FBd0Q7SUFFdEYsMEZBQTBGO0lBQzFGLFlBQ1MsU0FBZ0MsRUFDQyxZQUFvQztRQUU3RSxLQUFLLENBQUMsNEJBQTBCLENBQUMsR0FBRyxFQUFFLDRCQUEwQixDQUFDLE1BQU0sRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO1FBSGxHLGNBQVMsR0FBVCxTQUFTLENBQXVCO1FBQ0MsaUJBQVksR0FBWixZQUFZLENBQXdCO1FBSTdFLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRztRQUNqQixNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLO1NBQzVDLENBQUMsQ0FBQztJQUNKLENBQUM7O0FBbkJXLDBCQUEwQjtJQVFwQyxXQUFBLHNCQUFzQixDQUFBO0dBUlosMEJBQTBCLENBb0J0QyJ9