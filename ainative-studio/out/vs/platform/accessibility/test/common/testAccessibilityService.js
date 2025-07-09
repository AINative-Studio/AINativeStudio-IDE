/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
export class TestAccessibilityService {
    constructor() {
        this.onDidChangeScreenReaderOptimized = Event.None;
        this.onDidChangeReducedMotion = Event.None;
    }
    isScreenReaderOptimized() { return false; }
    isMotionReduced() { return false; }
    alwaysUnderlineAccessKeys() { return Promise.resolve(false); }
    setAccessibilitySupport(accessibilitySupport) { }
    getAccessibilitySupport() { return 0 /* AccessibilitySupport.Unknown */; }
    alert(message) { }
    status(message) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEFjY2Vzc2liaWxpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjY2Vzc2liaWxpdHkvdGVzdC9jb21tb24vdGVzdEFjY2Vzc2liaWxpdHlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUd6RCxNQUFNLE9BQU8sd0JBQXdCO0lBQXJDO1FBSUMscUNBQWdDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUM5Qyw2QkFBd0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBU3ZDLENBQUM7SUFQQSx1QkFBdUIsS0FBYyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDcEQsZUFBZSxLQUFjLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM1Qyx5QkFBeUIsS0FBdUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRix1QkFBdUIsQ0FBQyxvQkFBMEMsSUFBVSxDQUFDO0lBQzdFLHVCQUF1QixLQUEyQiw0Q0FBb0MsQ0FBQyxDQUFDO0lBQ3hGLEtBQUssQ0FBQyxPQUFlLElBQVUsQ0FBQztJQUNoQyxNQUFNLENBQUMsT0FBZSxJQUFVLENBQUM7Q0FDakMifQ==