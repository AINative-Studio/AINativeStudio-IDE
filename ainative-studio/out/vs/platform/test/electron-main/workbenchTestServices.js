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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlc3QvZWxlY3Ryb24tbWFpbi93b3JrYmVuY2hUZXN0U2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFPL0QsTUFBTSxPQUFPLHdCQUF3QjtJQUFyQztRQUlDLHFCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFFYixvQkFBZSxHQUFHLElBQUksT0FBTyxFQUFpQixDQUFDO1FBQ3ZELG1CQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7UUFlckQscUJBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUM5Qix3QkFBbUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBRWpDLGlCQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBRXRCLFVBQUssb0NBQTRCO0lBV2xDLENBQUM7SUE5QkEsS0FBSyxDQUFDLGtCQUFrQjtRQUN2QixNQUFNLE9BQU8sR0FBb0IsRUFBRSxDQUFDO1FBRXBDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO1lBQ3pCLE1BQU0sNkJBQXFCO1lBQzNCLElBQUksQ0FBQyxFQUFFLEVBQUUsT0FBTztnQkFDZixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZCLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQVVELGNBQWMsQ0FBQyxNQUFtQixJQUFVLENBQUM7SUFDN0MsaUJBQWlCLENBQUMsU0FBMkIsSUFBVSxDQUFDO0lBQ3hELEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBbUIsRUFBRSxHQUFzQixJQUFtQixDQUFDO0lBQzVFLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBbUIsRUFBRSxNQUFvQixJQUFzQixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUYsa0JBQWtCLENBQUMsT0FBeUIsSUFBVSxDQUFDO0lBQ3ZELEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBK0UsSUFBbUIsQ0FBQztJQUNsSCxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQXFCLElBQXNCLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQWEsSUFBbUIsQ0FBQztJQUM1QyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQXlCLElBQW1CLENBQUM7Q0FDeEQ7QUFFRCxNQUFNLE9BQU8sNEJBQTRCO0lBQXpDO1FBSWtCLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBaUUsQ0FBQztJQXFCbEcsQ0FBQztJQW5CQSxPQUFPLENBQUMsR0FBVyxFQUFFLElBQTREO1FBQ2hGLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQStGO1FBQ3ZHLEtBQUssTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLENBQUksR0FBVztRQUNyQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBa0IsQ0FBQztJQUM1QyxDQUFDO0lBRUQsVUFBVSxDQUFDLEdBQVc7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLEtBQW9CLENBQUM7Q0FDaEMifQ==