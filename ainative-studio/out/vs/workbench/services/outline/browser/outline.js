/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IOutlineService = createDecorator('IOutlineService');
export var OutlineTarget;
(function (OutlineTarget) {
    OutlineTarget[OutlineTarget["OutlinePane"] = 1] = "OutlinePane";
    OutlineTarget[OutlineTarget["Breadcrumbs"] = 2] = "Breadcrumbs";
    OutlineTarget[OutlineTarget["QuickPick"] = 4] = "QuickPick";
})(OutlineTarget || (OutlineTarget = {}));
export var OutlineConfigKeys;
(function (OutlineConfigKeys) {
    OutlineConfigKeys["icons"] = "outline.icons";
    OutlineConfigKeys["collapseItems"] = "outline.collapseItems";
    OutlineConfigKeys["problemsEnabled"] = "outline.problems.enabled";
    OutlineConfigKeys["problemsColors"] = "outline.problems.colors";
    OutlineConfigKeys["problemsBadges"] = "outline.problems.badges";
})(OutlineConfigKeys || (OutlineConfigKeys = {}));
export var OutlineConfigCollapseItemsValues;
(function (OutlineConfigCollapseItemsValues) {
    OutlineConfigCollapseItemsValues["Collapsed"] = "alwaysCollapse";
    OutlineConfigCollapseItemsValues["Expanded"] = "alwaysExpand";
})(OutlineConfigCollapseItemsValues || (OutlineConfigCollapseItemsValues = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvb3V0bGluZS9icm93c2VyL291dGxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBSTdGLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGlCQUFpQixDQUFDLENBQUM7QUFFbkYsTUFBTSxDQUFOLElBQWtCLGFBSWpCO0FBSkQsV0FBa0IsYUFBYTtJQUM5QiwrREFBZSxDQUFBO0lBQ2YsK0RBQWUsQ0FBQTtJQUNmLDJEQUFhLENBQUE7QUFDZCxDQUFDLEVBSmlCLGFBQWEsS0FBYixhQUFhLFFBSTlCO0FBcUVELE1BQU0sQ0FBTixJQUFrQixpQkFNakI7QUFORCxXQUFrQixpQkFBaUI7SUFDbEMsNENBQXlCLENBQUE7SUFDekIsNERBQXlDLENBQUE7SUFDekMsaUVBQThDLENBQUE7SUFDOUMsK0RBQTRDLENBQUE7SUFDNUMsK0RBQTRDLENBQUE7QUFDN0MsQ0FBQyxFQU5pQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBTWxDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGdDQUdqQjtBQUhELFdBQWtCLGdDQUFnQztJQUNqRCxnRUFBNEIsQ0FBQTtJQUM1Qiw2REFBeUIsQ0FBQTtBQUMxQixDQUFDLEVBSGlCLGdDQUFnQyxLQUFoQyxnQ0FBZ0MsUUFHakQifQ==