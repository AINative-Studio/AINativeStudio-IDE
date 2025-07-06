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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJvdWJsZXNob290aW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3Ryb3VibGVzaG9vdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW1DLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFbEcsTUFBTSxpQkFBaUI7SUFBdkI7UUFDQyxtQkFBYyxHQUE0QixFQUFFLENBQUM7SUF1QjlDLENBQUM7SUF0QkEsZUFBZSxDQUFDLENBQWM7UUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFDRCxTQUFTLENBQUMsS0FBa0IsRUFBRSxNQUFtQjtRQUNoRCxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUMzRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkMsT0FBTztZQUNSLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELGNBQWMsQ0FBQyxDQUFjO1FBQzVCLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxPQUFPO1lBQ1IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsZUFBZSxDQUFDLFVBQXVCO1FBQ3RDLE9BQU87SUFDUixDQUFDO0NBQ0Q7QUFFRCxJQUFJLGNBQWMsR0FBNkIsSUFBSSxDQUFDO0FBRXBELE1BQU0sVUFBVSx3QkFBd0I7SUFDdkMsY0FBYyxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztJQUN6QyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQjtJQUNyQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLGNBQWMsR0FBRyxJQUFJLENBQUM7SUFDdkIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLGFBQXNCLEtBQUs7SUFDbkQsSUFBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWTtJQUNyQixJQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztBQUM5QixDQUFDIn0=