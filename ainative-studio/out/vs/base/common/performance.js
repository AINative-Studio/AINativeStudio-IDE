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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vcGVyZm9ybWFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsU0FBUyxvQkFBb0IsQ0FBQyxVQUFtQjtJQUNoRCxNQUFNLEtBQUssR0FBdUIsRUFBRSxDQUFDO0lBQ3JDLElBQUksT0FBTyxVQUFVLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDcEMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsU0FBUyxJQUFJLENBQUMsSUFBWSxFQUFFLFdBQW9DO1FBQy9ELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUNELFNBQVMsUUFBUTtRQUNoQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ1gsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ2QsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3ZCLENBQUMsQ0FBQztRQUNKLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO0FBQzNCLENBQUM7QUFJRCxTQUFTLE9BQU87SUFFZixzRUFBc0U7SUFDdEUsc0ZBQXNGO0lBQ3RGLGFBQWE7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