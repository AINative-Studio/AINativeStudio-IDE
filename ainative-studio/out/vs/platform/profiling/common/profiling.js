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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2ZpbGluZy9jb21tb24vcHJvZmlsaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQTJCOUUsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUE2Qiw0QkFBNEIsQ0FBQyxDQUFDO0FBWXBILE1BQU0sS0FBVyxLQUFLLENBZ0JyQjtBQWhCRCxXQUFpQixLQUFLO0lBRXJCLFNBQWdCLGNBQWMsQ0FBQyxPQUFtQjtRQUNqRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRmUsb0JBQWMsaUJBRTdCLENBQUE7SUFFRCxTQUFnQixvQkFBb0IsQ0FBQyxPQUFtQixFQUFFLFVBQWtCLGlCQUFpQjtRQUM1RixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUN4RixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFUZSwwQkFBb0IsdUJBU25DLENBQUE7QUFDRixDQUFDLEVBaEJnQixLQUFLLEtBQUwsS0FBSyxRQWdCckIifQ==