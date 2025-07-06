/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function _definePolyfillMarks(timeOrigin) {
    const _data = [];
    if (typeof timeOrigin === 'number') {
        _data.push('code/timeOrigin', timeOrigin);
    }
    function mark(name, markOptions) {
        _data.push(name, markOptions?.startTime ?? Date.now());
    }
    function getMarks() {
        const result = [];
        for (let i = 0; i < _data.length; i += 2) {
            result.push({
                name: _data[i],
                startTime: _data[i + 1],
            });
        }
        return result;
    }
    return { mark, getMarks };
}
function _define() {
    // Identify browser environment when following property is not present
    // https://nodejs.org/dist/latest-v16.x/docs/api/perf_hooks.html#performancenodetiming
    // @ts-ignore
    if (typeof performance === 'object' && typeof performance.mark === 'function' && !performance.nodeTiming) {
        // in a browser context, reuse performance-util
        if (typeof performance.timeOrigin !== 'number' && !performance.timing) {
            // safari & webworker: because there is no timeOrigin and no workaround
            // we use the `Date.now`-based polyfill.
            return _definePolyfillMarks();
        }
        else {
            // use "native" performance for mark and getMarks
            return {
                mark(name, markOptions) {
                    performance.mark(name, markOptions);
                },
                getMarks() {
                    let timeOrigin = performance.timeOrigin;
                    if (typeof timeOrigin !== 'number') {
                        // safari: there is no timerOrigin but in renderers there is the timing-property
                        // see https://bugs.webkit.org/show_bug.cgi?id=174862
                        timeOrigin = performance.timing.navigationStart || performance.timing.redirectStart || performance.timing.fetchStart;
                    }
                    const result = [{ name: 'code/timeOrigin', startTime: Math.round(timeOrigin) }];
                    for (const entry of performance.getEntriesByType('mark')) {
                        result.push({
                            name: entry.name,
                            startTime: Math.round(timeOrigin + entry.startTime)
                        });
                    }
                    return result;
                }
            };
        }
    }
    else if (typeof process === 'object') {
        // node.js: use the normal polyfill but add the timeOrigin
        // from the node perf_hooks API as very first mark
        const timeOrigin = performance?.timeOrigin;
        return _definePolyfillMarks(timeOrigin);
    }
    else {
        // unknown environment
        console.trace('perf-util loaded in UNKNOWN environment');
        return _definePolyfillMarks();
    }
}
function _factory(sharedObj) {
    if (!sharedObj.MonacoPerformanceMarks) {
        sharedObj.MonacoPerformanceMarks = _define();
    }
    return sharedObj.MonacoPerformanceMarks;
}
const perf = _factory(globalThis);
export const mark = perf.mark;
/**
 * Returns all marks, sorted by `startTime`.
 */
export const getMarks = perf.getMarks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wZXJmb3JtYW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxTQUFTLG9CQUFvQixDQUFDLFVBQW1CO0lBQ2hELE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUM7SUFDckMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNwQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxTQUFTLElBQUksQ0FBQyxJQUFZLEVBQUUsV0FBb0M7UUFDL0QsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQ0QsU0FBUyxRQUFRO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDWCxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDZCxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdkIsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUNELE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7QUFDM0IsQ0FBQztBQUlELFNBQVMsT0FBTztJQUVmLHNFQUFzRTtJQUN0RSxzRkFBc0Y7SUFDdEYsYUFBYTtJQUNiLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxJQUFJLE9BQU8sV0FBVyxDQUFDLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDMUcsK0NBQStDO1FBRS9DLElBQUksT0FBTyxXQUFXLENBQUMsVUFBVSxLQUFLLFFBQVEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2RSx1RUFBdUU7WUFDdkUsd0NBQXdDO1lBQ3hDLE9BQU8sb0JBQW9CLEVBQUUsQ0FBQztRQUUvQixDQUFDO2FBQU0sQ0FBQztZQUNQLGlEQUFpRDtZQUNqRCxPQUFPO2dCQUNOLElBQUksQ0FBQyxJQUFZLEVBQUUsV0FBb0M7b0JBQ3RELFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUNyQyxDQUFDO2dCQUNELFFBQVE7b0JBQ1AsSUFBSSxVQUFVLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQztvQkFDeEMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDcEMsZ0ZBQWdGO3dCQUNoRixxREFBcUQ7d0JBQ3JELFVBQVUsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLGVBQWUsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLGFBQWEsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztvQkFDdEgsQ0FBQztvQkFDRCxNQUFNLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDaEYsS0FBSyxNQUFNLEtBQUssSUFBSSxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzt3QkFDMUQsTUFBTSxDQUFDLElBQUksQ0FBQzs0QkFDWCxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7NEJBQ2hCLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO3lCQUNuRCxDQUFDLENBQUM7b0JBQ0osQ0FBQztvQkFDRCxPQUFPLE1BQU0sQ0FBQztnQkFDZixDQUFDO2FBQ0QsQ0FBQztRQUNILENBQUM7SUFFRixDQUFDO1NBQU0sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN4QywwREFBMEQ7UUFDMUQsa0RBQWtEO1FBQ2xELE1BQU0sVUFBVSxHQUFHLFdBQVcsRUFBRSxVQUFVLENBQUM7UUFDM0MsT0FBTyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUV6QyxDQUFDO1NBQU0sQ0FBQztRQUNQLHNCQUFzQjtRQUN0QixPQUFPLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDekQsT0FBTyxvQkFBb0IsRUFBRSxDQUFDO0lBQy9CLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsU0FBYztJQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDdkMsU0FBUyxDQUFDLHNCQUFzQixHQUFHLE9BQU8sRUFBRSxDQUFDO0lBQzlDLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQztBQUN6QyxDQUFDO0FBRUQsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRWxDLE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBaUUsSUFBSSxDQUFDLElBQUksQ0FBQztBQU81Rjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBNEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyJ9