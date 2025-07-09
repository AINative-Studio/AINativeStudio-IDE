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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnMvY29tbW9uL2V4dGVuc2lvblJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFLN0YsTUFBTSxDQUFOLElBQWtCLDZCQVFqQjtBQVJELFdBQWtCLDZCQUE2QjtJQUM5QywyRkFBUyxDQUFBO0lBQ1QsaUZBQUksQ0FBQTtJQUNKLDZGQUFVLENBQUE7SUFDVix1R0FBZSxDQUFBO0lBQ2YseUdBQWdCLENBQUE7SUFDaEIsaUdBQVksQ0FBQTtJQUNaLCtGQUFXLENBQUE7QUFDWixDQUFDLEVBUmlCLDZCQUE2QixLQUE3Qiw2QkFBNkIsUUFROUM7QUFPRCxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyxlQUFlLENBQW1DLGlDQUFpQyxDQUFDLENBQUM7QUF3QnJJLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLGVBQWUsQ0FBMEMseUNBQXlDLENBQUMsQ0FBQyJ9