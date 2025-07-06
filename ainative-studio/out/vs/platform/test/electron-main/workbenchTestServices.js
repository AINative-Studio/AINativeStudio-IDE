/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Promises } from '../../../base/common/async.js';
import { Event, Emitter } from '../../../base/common/event.js';
export class TestLifecycleMainService {
    constructor() {
        this.onBeforeShutdown = Event.None;
        this._onWillShutdown = new Emitter();
        this.onWillShutdown = this._onWillShutdown.event;
        this.onWillLoadWindow = Event.None;
        this.onBeforeCloseWindow = Event.None;
        this.wasRestarted = false;
        this.quitRequested = false;
        this.phase = 2 /* LifecycleMainPhase.Ready */;
    }
    async fireOnWillShutdown() {
        const joiners = [];
        this._onWillShutdown.fire({
            reason: 1 /* ShutdownReason.QUIT */,
            join(id, promise) {
                joiners.push(promise);
            }
        });
        await Promises.settled(joiners);
    }
    registerWindow(window) { }
    registerAuxWindow(auxWindow) { }
    async reload(window, cli) { }
    async unload(window, reason) { return true; }
    setRelaunchHandler(handler) { }
    async relaunch(options) { }
    async quit(willRestart) { return true; }
    async kill(code) { }
    async when(phase) { }
}
export class InMemoryTestStateMainService {
    constructor() {
        this.data = new Map();
    }
    setItem(key, data) {
        this.data.set(key, data);
    }
    setItems(items) {
        for (const { key, data } of items) {
            this.data.set(key, data);
        }
    }
    getItem(key) {
        return this.data.get(key);
    }
    removeItem(key) {
        this.data.delete(key);
    }
    async close() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXN0L2VsZWN0cm9uLW1haW4vd29ya2JlbmNoVGVzdFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBTy9ELE1BQU0sT0FBTyx3QkFBd0I7SUFBckM7UUFJQyxxQkFBZ0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBRWIsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBaUIsQ0FBQztRQUN2RCxtQkFBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1FBZXJELHFCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDOUIsd0JBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUVqQyxpQkFBWSxHQUFHLEtBQUssQ0FBQztRQUNyQixrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUV0QixVQUFLLG9DQUE0QjtJQVdsQyxDQUFDO0lBOUJBLEtBQUssQ0FBQyxrQkFBa0I7UUFDdkIsTUFBTSxPQUFPLEdBQW9CLEVBQUUsQ0FBQztRQUVwQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztZQUN6QixNQUFNLDZCQUFxQjtZQUMzQixJQUFJLENBQUMsRUFBRSxFQUFFLE9BQU87Z0JBQ2YsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2QixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFVRCxjQUFjLENBQUMsTUFBbUIsSUFBVSxDQUFDO0lBQzdDLGlCQUFpQixDQUFDLFNBQTJCLElBQVUsQ0FBQztJQUN4RCxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQW1CLEVBQUUsR0FBc0IsSUFBbUIsQ0FBQztJQUM1RSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQW1CLEVBQUUsTUFBb0IsSUFBc0IsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzFGLGtCQUFrQixDQUFDLE9BQXlCLElBQVUsQ0FBQztJQUN2RCxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQStFLElBQW1CLENBQUM7SUFDbEgsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFxQixJQUFzQixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEUsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFhLElBQW1CLENBQUM7SUFDNUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUF5QixJQUFtQixDQUFDO0NBQ3hEO0FBRUQsTUFBTSxPQUFPLDRCQUE0QjtJQUF6QztRQUlrQixTQUFJLEdBQUcsSUFBSSxHQUFHLEVBQWlFLENBQUM7SUFxQmxHLENBQUM7SUFuQkEsT0FBTyxDQUFDLEdBQVcsRUFBRSxJQUE0RDtRQUNoRixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUErRjtRQUN2RyxLQUFLLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksS0FBSyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFJLEdBQVc7UUFDckIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQWtCLENBQUM7SUFDNUMsQ0FBQztJQUVELFVBQVUsQ0FBQyxHQUFXO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSyxLQUFvQixDQUFDO0NBQ2hDIn0=