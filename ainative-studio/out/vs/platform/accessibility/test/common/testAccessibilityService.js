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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEFjY2Vzc2liaWxpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWNjZXNzaWJpbGl0eS90ZXN0L2NvbW1vbi90ZXN0QWNjZXNzaWJpbGl0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR3pELE1BQU0sT0FBTyx3QkFBd0I7SUFBckM7UUFJQyxxQ0FBZ0MsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQzlDLDZCQUF3QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFTdkMsQ0FBQztJQVBBLHVCQUF1QixLQUFjLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNwRCxlQUFlLEtBQWMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzVDLHlCQUF5QixLQUF1QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLHVCQUF1QixDQUFDLG9CQUEwQyxJQUFVLENBQUM7SUFDN0UsdUJBQXVCLEtBQTJCLDRDQUFvQyxDQUFDLENBQUM7SUFDeEYsS0FBSyxDQUFDLE9BQWUsSUFBVSxDQUFDO0lBQ2hDLE1BQU0sQ0FBQyxPQUFlLElBQVUsQ0FBQztDQUNqQyJ9