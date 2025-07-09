/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var RecommendationSource;
(function (RecommendationSource) {
    RecommendationSource[RecommendationSource["FILE"] = 1] = "FILE";
    RecommendationSource[RecommendationSource["WORKSPACE"] = 2] = "WORKSPACE";
    RecommendationSource[RecommendationSource["EXE"] = 3] = "EXE";
})(RecommendationSource || (RecommendationSource = {}));
export function RecommendationSourceToString(source) {
    switch (source) {
        case 1 /* RecommendationSource.FILE */: return 'file';
        case 2 /* RecommendationSource.WORKSPACE */: return 'workspace';
        case 3 /* RecommendationSource.EXE */: return 'exe';
    }
}
export var RecommendationsNotificationResult;
(function (RecommendationsNotificationResult) {
    RecommendationsNotificationResult["Ignored"] = "ignored";
    RecommendationsNotificationResult["Cancelled"] = "cancelled";
    RecommendationsNotificationResult["TooMany"] = "toomany";
    RecommendationsNotificationResult["IncompatibleWindow"] = "incompatibleWindow";
    RecommendationsNotificationResult["Accepted"] = "reacted";
})(RecommendationsNotificationResult || (RecommendationsNotificationResult = {}));
export const IExtensionRecommendationNotificationService = createDecorator('IExtensionRecommendationNotificationService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvblJlY29tbWVuZGF0aW9ucy9jb21tb24vZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxNQUFNLENBQU4sSUFBa0Isb0JBSWpCO0FBSkQsV0FBa0Isb0JBQW9CO0lBQ3JDLCtEQUFRLENBQUE7SUFDUix5RUFBYSxDQUFBO0lBQ2IsNkRBQU8sQ0FBQTtBQUNSLENBQUMsRUFKaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUlyQztBQVNELE1BQU0sVUFBVSw0QkFBNEIsQ0FBQyxNQUE0QjtJQUN4RSxRQUFRLE1BQU0sRUFBRSxDQUFDO1FBQ2hCLHNDQUE4QixDQUFDLENBQUMsT0FBTyxNQUFNLENBQUM7UUFDOUMsMkNBQW1DLENBQUMsQ0FBQyxPQUFPLFdBQVcsQ0FBQztRQUN4RCxxQ0FBNkIsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDO0lBQzdDLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGlDQU1qQjtBQU5ELFdBQWtCLGlDQUFpQztJQUNsRCx3REFBbUIsQ0FBQTtJQUNuQiw0REFBdUIsQ0FBQTtJQUN2Qix3REFBbUIsQ0FBQTtJQUNuQiw4RUFBeUMsQ0FBQTtJQUN6Qyx5REFBb0IsQ0FBQTtBQUNyQixDQUFDLEVBTmlCLGlDQUFpQyxLQUFqQyxpQ0FBaUMsUUFNbEQ7QUFFRCxNQUFNLENBQUMsTUFBTSwyQ0FBMkMsR0FBRyxlQUFlLENBQThDLDZDQUE2QyxDQUFDLENBQUMifQ==