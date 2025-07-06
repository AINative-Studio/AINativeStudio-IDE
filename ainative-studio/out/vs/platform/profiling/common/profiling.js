/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename, isAbsolute, join } from '../../../base/common/path.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IV8InspectProfilingService = createDecorator('IV8InspectProfilingService');
export var Utils;
(function (Utils) {
    function isValidProfile(profile) {
        return Boolean(profile.samples && profile.timeDeltas);
    }
    Utils.isValidProfile = isValidProfile;
    function rewriteAbsolutePaths(profile, replace = 'noAbsolutePaths') {
        for (const node of profile.nodes) {
            if (node.callFrame && node.callFrame.url) {
                if (isAbsolute(node.callFrame.url) || /^\w[\w\d+.-]*:\/\/\/?/.test(node.callFrame.url)) {
                    node.callFrame.url = join(replace, basename(node.callFrame.url));
                }
            }
        }
        return profile;
    }
    Utils.rewriteAbsolutePaths = rewriteAbsolutePaths;
})(Utils || (Utils = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9maWxpbmcvY29tbW9uL3Byb2ZpbGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUEyQjlFLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FBNkIsNEJBQTRCLENBQUMsQ0FBQztBQVlwSCxNQUFNLEtBQVcsS0FBSyxDQWdCckI7QUFoQkQsV0FBaUIsS0FBSztJQUVyQixTQUFnQixjQUFjLENBQUMsT0FBbUI7UUFDakQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUZlLG9CQUFjLGlCQUU3QixDQUFBO0lBRUQsU0FBZ0Isb0JBQW9CLENBQUMsT0FBbUIsRUFBRSxVQUFrQixpQkFBaUI7UUFDNUYsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEMsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQzFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDeEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNsRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBVGUsMEJBQW9CLHVCQVNuQyxDQUFBO0FBQ0YsQ0FBQyxFQWhCZ0IsS0FBSyxLQUFMLEtBQUssUUFnQnJCIn0=