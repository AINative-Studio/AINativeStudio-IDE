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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnMvY29tbW9uL2V4dGVuc2lvblJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsTUFBTSxDQUFOLElBQWtCLG9CQUlqQjtBQUpELFdBQWtCLG9CQUFvQjtJQUNyQywrREFBUSxDQUFBO0lBQ1IseUVBQWEsQ0FBQTtJQUNiLDZEQUFPLENBQUE7QUFDUixDQUFDLEVBSmlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFJckM7QUFTRCxNQUFNLFVBQVUsNEJBQTRCLENBQUMsTUFBNEI7SUFDeEUsUUFBUSxNQUFNLEVBQUUsQ0FBQztRQUNoQixzQ0FBOEIsQ0FBQyxDQUFDLE9BQU8sTUFBTSxDQUFDO1FBQzlDLDJDQUFtQyxDQUFDLENBQUMsT0FBTyxXQUFXLENBQUM7UUFDeEQscUNBQTZCLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQztJQUM3QyxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixpQ0FNakI7QUFORCxXQUFrQixpQ0FBaUM7SUFDbEQsd0RBQW1CLENBQUE7SUFDbkIsNERBQXVCLENBQUE7SUFDdkIsd0RBQW1CLENBQUE7SUFDbkIsOEVBQXlDLENBQUE7SUFDekMseURBQW9CLENBQUE7QUFDckIsQ0FBQyxFQU5pQixpQ0FBaUMsS0FBakMsaUNBQWlDLFFBTWxEO0FBRUQsTUFBTSxDQUFDLE1BQU0sMkNBQTJDLEdBQUcsZUFBZSxDQUE4Qyw2Q0FBNkMsQ0FBQyxDQUFDIn0=