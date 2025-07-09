/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
class TaskQueue extends Disposable {
    constructor() {
        super();
        this._tasks = [];
        this._i = 0;
        this._register(toDisposable(() => this.clear()));
    }
    enqueue(task) {
        this._tasks.push(task);
        this._start();
    }
    flush() {
        while (this._i < this._tasks.length) {
            if (!this._tasks[this._i]()) {
                this._i++;
            }
        }
        this.clear();
    }
    clear() {
        if (this._idleCallback) {
            this._cancelCallback(this._idleCallback);
            this._idleCallback = undefined;
        }
        this._i = 0;
        this._tasks.length = 0;
    }
    _start() {
        if (!this._idleCallback) {
            this._idleCallback = this._requestCallback(this._process.bind(this));
        }
    }
    _process(deadline) {
        this._idleCallback = undefined;
        let taskDuration = 0;
        let longestTask = 0;
        let lastDeadlineRemaining = deadline.timeRemaining();
        let deadlineRemaining = 0;
        while (this._i < this._tasks.length) {
            taskDuration = Date.now();
            if (!this._tasks[this._i]()) {
                this._i++;
            }
            // other than performance.now, Date.now might not be stable (changes on wall clock changes),
            // this is not an issue here as a clock change during a short running task is very unlikely
            // in case it still happened and leads to negative duration, simply assume 1 msec
            taskDuration = Math.max(1, Date.now() - taskDuration);
            longestTask = Math.max(taskDuration, longestTask);
            // Guess the following task will take a similar time to the longest task in this batch, allow
            // additional room to try avoid exceeding the deadline
            deadlineRemaining = deadline.timeRemaining();
            if (longestTask * 1.5 > deadlineRemaining) {
                // Warn when the time exceeding the deadline is over 20ms, if this happens in practice the
                // task should be split into sub-tasks to ensure the UI remains responsive.
                if (lastDeadlineRemaining - taskDuration < -20) {
                    console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(lastDeadlineRemaining - taskDuration))}ms`);
                }
                this._start();
                return;
            }
            lastDeadlineRemaining = deadlineRemaining;
        }
        this.clear();
    }
}
/**
 * A queue of that runs tasks over several tasks via setTimeout, trying to maintain above 60 frames
 * per second. The tasks will run in the order they are enqueued, but they will run some time later,
 * and care should be taken to ensure they're non-urgent and will not introduce race conditions.
 */
export class PriorityTaskQueue extends TaskQueue {
    _requestCallback(callback) {
        return getActiveWindow().setTimeout(() => callback(this._createDeadline(16)));
    }
    _cancelCallback(identifier) {
        getActiveWindow().clearTimeout(identifier);
    }
    _createDeadline(duration) {
        const end = Date.now() + duration;
        return {
            timeRemaining: () => Math.max(0, end - Date.now())
        };
    }
}
class IdleTaskQueueInternal extends TaskQueue {
    _requestCallback(callback) {
        return getActiveWindow().requestIdleCallback(callback);
    }
    _cancelCallback(identifier) {
        getActiveWindow().cancelIdleCallback(identifier);
    }
}
/**
 * A queue of that runs tasks over several idle callbacks, trying to respect the idle callback's
 * deadline given by the environment. The tasks will run in the order they are enqueued, but they
 * will run some time later, and care should be taken to ensure they're non-urgent and will not
 * introduce race conditions.
 *
 * This reverts to a {@link PriorityTaskQueue} if the environment does not support idle callbacks.
 */
export const IdleTaskQueue = ('requestIdleCallback' in getActiveWindow()) ? IdleTaskQueueInternal : PriorityTaskQueue;
/**
 * An object that tracks a single debounced task that will run on the next idle frame. When called
 * multiple times, only the last set task will run.
 */
export class DebouncedIdleTask {
    constructor() {
        this._queue = new IdleTaskQueue();
    }
    set(task) {
        this._queue.clear();
        this._queue.enqueue(task);
    }
    flush() {
        this._queue.flush();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1F1ZXVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS90YXNrUXVldWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFvQixNQUFNLG1DQUFtQyxDQUFDO0FBZ0MvRixNQUFlLFNBQVUsU0FBUSxVQUFVO0lBSzFDO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFMRCxXQUFNLEdBQTZCLEVBQUUsQ0FBQztRQUV0QyxPQUFFLEdBQUcsQ0FBQyxDQUFDO1FBSWQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBS00sT0FBTyxDQUFDLElBQTBCO1FBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFTSxLQUFLO1FBQ1gsT0FBTyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ1gsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDZCxDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hC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