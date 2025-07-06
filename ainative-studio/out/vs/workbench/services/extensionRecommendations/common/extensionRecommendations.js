/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var ExtensionRecommendationReason;
(function (ExtensionRecommendationReason) {
    ExtensionRecommendationReason[ExtensionRecommendationReason["Workspace"] = 0] = "Workspace";
    ExtensionRecommendationReason[ExtensionRecommendationReason["File"] = 1] = "File";
    ExtensionRecommendationReason[ExtensionRecommendationReason["Executable"] = 2] = "Executable";
    ExtensionRecommendationReason[ExtensionRecommendationReason["WorkspaceConfig"] = 3] = "WorkspaceConfig";
    ExtensionRecommendationReason[ExtensionRecommendationReason["DynamicWorkspace"] = 4] = "DynamicWorkspace";
    ExtensionRecommendationReason[ExtensionRecommendationReason["Experimental"] = 5] = "Experimental";
    ExtensionRecommendationReason[ExtensionRecommendationReason["Application"] = 6] = "Application";
})(ExtensionRecommendationReason || (ExtensionRecommendationReason = {}));
export const IExtensionRecommendationsService = createDecorator('extensionRecommendationsService');
export const IExtensionIgnoredRecommendationsService = createDecorator('IExtensionIgnoredRecommendationsService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zL2NvbW1vbi9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBSzdGLE1BQU0sQ0FBTixJQUFrQiw2QkFRakI7QUFSRCxXQUFrQiw2QkFBNkI7SUFDOUMsMkZBQVMsQ0FBQTtJQUNULGlGQUFJLENBQUE7SUFDSiw2RkFBVSxDQUFBO0lBQ1YsdUdBQWUsQ0FBQTtJQUNmLHlHQUFnQixDQUFBO0lBQ2hCLGlHQUFZLENBQUE7SUFDWiwrRkFBVyxDQUFBO0FBQ1osQ0FBQyxFQVJpQiw2QkFBNkIsS0FBN0IsNkJBQTZCLFFBUTlDO0FBT0QsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsZUFBZSxDQUFtQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBd0JySSxNQUFNLENBQUMsTUFBTSx1Q0FBdUMsR0FBRyxlQUFlLENBQTBDLHlDQUF5QyxDQUFDLENBQUMifQ==