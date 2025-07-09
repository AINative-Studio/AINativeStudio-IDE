/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var IssueType;
(function (IssueType) {
    IssueType[IssueType["Bug"] = 0] = "Bug";
    IssueType[IssueType["PerformanceIssue"] = 1] = "PerformanceIssue";
    IssueType[IssueType["FeatureRequest"] = 2] = "FeatureRequest";
})(IssueType || (IssueType = {}));
export var IssueSource;
(function (IssueSource) {
    IssueSource["VSCode"] = "vscode";
    IssueSource["Extension"] = "extension";
    IssueSource["Marketplace"] = "marketplace";
})(IssueSource || (IssueSource = {}));
export const IIssueFormService = createDecorator('issueFormService');
export const IWorkbenchIssueService = createDecorator('workbenchIssueService');
export const IWorkbenchProcessService = createDecorator('workbenchProcessService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvY29tbW9uL2lzc3VlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQWE3RixNQUFNLENBQU4sSUFBa0IsU0FJakI7QUFKRCxXQUFrQixTQUFTO0lBQzFCLHVDQUFHLENBQUE7SUFDSCxpRUFBZ0IsQ0FBQTtJQUNoQiw2REFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUppQixTQUFTLEtBQVQsU0FBUyxRQUkxQjtBQUVELE1BQU0sQ0FBTixJQUFZLFdBSVg7QUFKRCxXQUFZLFdBQVc7SUFDdEIsZ0NBQWlCLENBQUE7SUFDakIsc0NBQXVCLENBQUE7SUFDdkIsMENBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQUpXLFdBQVcsS0FBWCxXQUFXLFFBSXRCO0FBb0ZELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBb0Isa0JBQWtCLENBQUMsQ0FBQztBQWN4RixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUM7QUFPdkcsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsZUFBZSxDQUEyQix5QkFBeUIsQ0FBQyxDQUFDIn0=