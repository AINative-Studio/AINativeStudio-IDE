/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * A simple tracker for dirty regions in a buffer.
 */
export class BufferDirtyTracker {
    get dataOffset() {
        return this._startIndex;
    }
    get dirtySize() {
        if (this._startIndex === undefined || this._endIndex === undefined) {
            return undefined;
        }
        return this._endIndex - this._startIndex + 1;
    }
    get isDirty() { return this._startIndex !== undefined; }
    /**
     * Flag the index(es) as modified. Returns the index flagged.
     * @param index An index to flag.
     * @param length An optional length to flag. Defaults to 1.
     */
    flag(index, length = 1) {
        this._flag(index);
        if (length > 1) {
            this._flag(index + length - 1);
        }
        return index;
    }
    _flag(index) {
        if (this._startIndex === undefined || index < this._startIndex) {
            this._startIndex = index;
        }
        if (this._endIndex === undefined || index > this._endIndex) {
            this._endIndex = index;
        }
    }
    clear() {
        this._startIndex = undefined;
        this._endIndex = undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyRGlydHlUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9idWZmZXJEaXJ0eVRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFxQmhHOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUs5QixJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNwRSxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxJQUFJLE9BQU8sS0FBYyxPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztJQUVqRTs7OztPQUlHO0lBQ0gsSUFBSSxDQUFDLEtBQWEsRUFBRSxTQUFpQixDQUFDO1FBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEIsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTyxLQUFLLENBQUMsS0FBYTtRQUMxQixJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDaEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDMUIsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM1RCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUM1QixDQUFDO0NBQ0QifQ==