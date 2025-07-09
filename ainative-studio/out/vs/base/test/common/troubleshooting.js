/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { setDisposableTracker } from '../../common/lifecycle.js';
class DisposableTracker {
    constructor() {
        this.allDisposables = [];
    }
    trackDisposable(x) {
        this.allDisposables.push([x, new Error().stack]);
    }
    setParent(child, parent) {
        for (let idx = 0; idx < this.allDisposables.length; idx++) {
            if (this.allDisposables[idx][0] === child) {
                this.allDisposables.splice(idx, 1);
                return;
            }
        }
    }
    markAsDisposed(x) {
        for (let idx = 0; idx < this.allDisposables.length; idx++) {
            if (this.allDisposables[idx][0] === x) {
                this.allDisposables.splice(idx, 1);
                return;
            }
        }
    }
    markAsSingleton(disposable) {
        // noop
    }
}
let currentTracker = null;
export function beginTrackingDisposables() {
    currentTracker = new DisposableTracker();
    setDisposableTracker(currentTracker);
}
export function endTrackingDisposables() {
    if (currentTracker) {
        setDisposableTracker(null);
        console.log(currentTracker.allDisposables.map(e => `${e[0]}\n${e[1]}`).join('\n\n'));
        currentTracker = null;
    }
}
export function beginLoggingFS(withStacks = false) {
    self.beginLoggingFS?.(withStacks);
}
export function endLoggingFS() {
    self.endLoggingFS?.();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJvdWJsZXNob290aW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdHJvdWJsZXNob290aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBbUMsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVsRyxNQUFNLGlCQUFpQjtJQUF2QjtRQUNDLG1CQUFjLEdBQTRCLEVBQUUsQ0FBQztJQXVCOUMsQ0FBQztJQXRCQSxlQUFlLENBQUMsQ0FBYztRQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUNELFNBQVMsQ0FBQyxLQUFrQixFQUFFLE1BQW1CO1FBQ2hELEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxPQUFPO1lBQ1IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsY0FBYyxDQUFDLENBQWM7UUFDNUIsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDM0QsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLE9BQU87WUFDUixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxlQUFlLENBQUMsVUFBdUI7UUFDdEMsT0FBTztJQUNSLENBQUM7Q0FDRDtBQUVELElBQUksY0FBYyxHQUE2QixJQUFJLENBQUM7QUFFcEQsTUFBTSxVQUFVLHdCQUF3QjtJQUN2QyxjQUFjLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO0lBQ3pDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3RDLENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCO0lBQ3JDLElBQUksY0FBYyxFQUFFLENBQUM7UUFDcEIsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDckYsY0FBYyxHQUFHLElBQUksQ0FBQztJQUN2QixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsYUFBc0IsS0FBSztJQUNuRCxJQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZO0lBQ3JCLElBQUssQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO0FBQzlCLENBQUMifQ==