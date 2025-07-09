/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Cache {
    static { this.enableDebugLogging = false; }
    constructor(id) {
        this.id = id;
        this._data = new Map();
        this._idPool = 1;
    }
    add(item) {
        const id = this._idPool++;
        this._data.set(id, item);
        this.logDebugInfo();
        return id;
    }
    get(pid, id) {
        return this._data.has(pid) ? this._data.get(pid)[id] : undefined;
    }
    delete(id) {
        this._data.delete(id);
        this.logDebugInfo();
    }
    logDebugInfo() {
        if (!Cache.enableDebugLogging) {
            return;
        }
        console.log(`${this.id} cache size - ${this._data.size}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxPQUFPLEtBQUs7YUFFTyx1QkFBa0IsR0FBRyxLQUFLLEFBQVIsQ0FBUztJQUtuRCxZQUNrQixFQUFVO1FBQVYsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUpYLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztRQUNqRCxZQUFPLEdBQUcsQ0FBQyxDQUFDO0lBSWhCLENBQUM7SUFFTCxHQUFHLENBQUMsSUFBa0I7UUFDckIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFVO1FBQzFCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDbkUsQ0FBQztJQUVELE1BQU0sQ0FBQyxFQUFVO1FBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDL0IsT0FBTztRQUNSLENBQUM7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsaUJBQWlCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUMzRCxDQUFDIn0=