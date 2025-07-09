/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from './cancellation.js';
export class Cache {
    constructor(task) {
        this.task = task;
        this.result = null;
    }
    get() {
        if (this.result) {
            return this.result;
        }
        const cts = new CancellationTokenSource();
        const promise = this.task(cts.token);
        this.result = {
            promise,
            dispose: () => {
                this.result = null;
                cts.cancel();
                cts.dispose();
            }
        };
        return this.result;
    }
}
export function identity(t) {
    return t;
}
/**
 * Uses a LRU cache to make a given parametrized function cached.
 * Caches just the last key/value.
*/
export class LRUCachedFunction {
    constructor(arg1, arg2) {
        this.lastCache = undefined;
        this.lastArgKey = undefined;
        if (typeof arg1 === 'function') {
            this._fn = arg1;
            this._computeKey = identity;
        }
        else {
            this._fn = arg2;
            this._computeKey = arg1.getCacheKey;
        }
    }
    get(arg) {
        const key = this._computeKey(arg);
        if (this.lastArgKey !== key) {
            this.lastArgKey = key;
            this.lastCache = this._fn(arg);
        }
        return this.lastCache;
    }
}
/**
 * Uses an unbounded cache to memoize the results of the given function.
*/
export class CachedFunction {
    get cachedValues() {
        return this._map;
    }
    constructor(arg1, arg2) {
        this._map = new Map();
        this._map2 = new Map();
        if (typeof arg1 === 'function') {
            this._fn = arg1;
            this._computeKey = identity;
        }
        else {
            this._fn = arg2;
            this._computeKey = arg1.getCacheKey;
        }
    }
    get(arg) {
        const key = this._computeKey(arg);
        if (this._map2.has(key)) {
            return this._map2.get(key);
        }
        const value = this._fn(arg);
        this._map.set(arg, value);
        this._map2.set(key, value);
        return value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBTy9FLE1BQU0sT0FBTyxLQUFLO0lBR2pCLFlBQW9CLElBQTJDO1FBQTNDLFNBQUksR0FBSixJQUFJLENBQXVDO1FBRHZELFdBQU0sR0FBMEIsSUFBSSxDQUFDO0lBQ3NCLENBQUM7SUFFcEUsR0FBRztRQUNGLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNwQixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXJDLElBQUksQ0FBQyxNQUFNLEdBQUc7WUFDYixPQUFPO1lBQ1AsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDbkIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNmLENBQUM7U0FDRCxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxRQUFRLENBQUksQ0FBSTtJQUMvQixPQUFPLENBQUMsQ0FBQztBQUNWLENBQUM7QUFVRDs7O0VBR0U7QUFDRixNQUFNLE9BQU8saUJBQWlCO0lBUzdCLFlBQVksSUFBc0QsRUFBRSxJQUErQjtRQVIzRixjQUFTLEdBQTBCLFNBQVMsQ0FBQztRQUM3QyxlQUFVLEdBQXdCLFNBQVMsQ0FBQztRQVFuRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDO1FBQzdCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFLLENBQUM7WUFDakIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBRU0sR0FBRyxDQUFDLEdBQVM7UUFDbkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7WUFDdEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFVLENBQUM7SUFDeEIsQ0FBQztDQUNEO0FBRUQ7O0VBRUU7QUFDRixNQUFNLE9BQU8sY0FBYztJQUcxQixJQUFXLFlBQVk7UUFDdEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFPRCxZQUFZLElBQXNELEVBQUUsSUFBK0I7UUFYbEYsU0FBSSxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFDO1FBQ2xDLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztRQVd0RCxJQUFJLE9BQU8sSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDO1FBQzdCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFLLENBQUM7WUFDakIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBRU0sR0FBRyxDQUFDLEdBQVM7UUFDbkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQztRQUM3QixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=