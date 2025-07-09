/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const hasPerformanceNow = (globalThis.performance && typeof globalThis.performance.now === 'function');
export class StopWatch {
    static create(highResolution) {
        return new StopWatch(highResolution);
    }
    constructor(highResolution) {
        this._now = hasPerformanceNow && highResolution === false ? Date.now : globalThis.performance.now.bind(globalThis.performance);
        this._startTime = this._now();
        this._stopTime = -1;
    }
    stop() {
        this._stopTime = this._now();
    }
    reset() {
        this._startTime = this._now();
        this._stopTime = -1;
    }
    elapsed() {
        if (this._stopTime !== -1) {
            return this._stopTime - this._startTime;
        }
        return this._now() - this._startTime;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcHdhdGNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3N0b3B3YXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLGlCQUFpQixHQUFHLENBQUMsVUFBVSxDQUFDLFdBQVcsSUFBSSxPQUFPLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxLQUFLLFVBQVUsQ0FBQyxDQUFDO0FBRXZHLE1BQU0sT0FBTyxTQUFTO0lBT2QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUF3QjtRQUM1QyxPQUFPLElBQUksU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxZQUFZLGNBQXdCO1FBQ25DLElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLElBQUksY0FBYyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNoSSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFTSxJQUFJO1FBQ1YsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDekMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDdEMsQ0FBQztDQUNEIn0=