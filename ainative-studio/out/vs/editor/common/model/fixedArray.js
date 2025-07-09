/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { arrayInsert } from '../../../base/common/arrays.js';
/**
 * An array that avoids being sparse by always
 * filling up unused indices with a default value.
 */
export class FixedArray {
    constructor(_default) {
        this._default = _default;
        this._store = [];
    }
    get(index) {
        if (index < this._store.length) {
            return this._store[index];
        }
        return this._default;
    }
    set(index, value) {
        while (index >= this._store.length) {
            this._store[this._store.length] = this._default;
        }
        this._store[index] = value;
    }
    replace(index, oldLength, newLength) {
        if (index >= this._store.length) {
            return;
        }
        if (oldLength === 0) {
            this.insert(index, newLength);
            return;
        }
        else if (newLength === 0) {
            this.delete(index, oldLength);
            return;
        }
        const before = this._store.slice(0, index);
        const after = this._store.slice(index + oldLength);
        const insertArr = arrayFill(newLength, this._default);
        this._store = before.concat(insertArr, after);
    }
    delete(deleteIndex, deleteCount) {
        if (deleteCount === 0 || deleteIndex >= this._store.length) {
            return;
        }
        this._store.splice(deleteIndex, deleteCount);
    }
    insert(insertIndex, insertCount) {
        if (insertCount === 0 || insertIndex >= this._store.length) {
            return;
        }
        const arr = [];
        for (let i = 0; i < insertCount; i++) {
            arr[i] = this._default;
        }
        this._store = arrayInsert(this._store, insertIndex, arr);
    }
}
function arrayFill(length, value) {
    const arr = [];
    for (let i = 0; i < length; i++) {
        arr[i] = value;
    }
    return arr;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4ZWRBcnJheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2ZpeGVkQXJyYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTdEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxVQUFVO0lBR3RCLFlBQ2tCLFFBQVc7UUFBWCxhQUFRLEdBQVIsUUFBUSxDQUFHO1FBSHJCLFdBQU0sR0FBUSxFQUFFLENBQUM7SUFJckIsQ0FBQztJQUVFLEdBQUcsQ0FBQyxLQUFhO1FBQ3ZCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVNLEdBQUcsQ0FBQyxLQUFhLEVBQUUsS0FBUTtRQUNqQyxPQUFPLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ2pELENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUM1QixDQUFDO0lBRU0sT0FBTyxDQUFDLEtBQWEsRUFBRSxTQUFpQixFQUFFLFNBQWlCO1FBQ2pFLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLFNBQVMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM5QixPQUFPO1FBQ1IsQ0FBQzthQUFNLElBQUksU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzlCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQztRQUNuRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTSxNQUFNLENBQUMsV0FBbUIsRUFBRSxXQUFtQjtRQUNyRCxJQUFJLFdBQVcsS0FBSyxDQUFDLElBQUksV0FBVyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUQsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxXQUFtQixFQUFFLFdBQW1CO1FBQ3JELElBQUksV0FBVyxLQUFLLENBQUMsSUFBSSxXQUFXLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1RCxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sR0FBRyxHQUFRLEVBQUUsQ0FBQztRQUNwQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDeEIsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRDtBQUVELFNBQVMsU0FBUyxDQUFJLE1BQWMsRUFBRSxLQUFRO0lBQzdDLE1BQU0sR0FBRyxHQUFRLEVBQUUsQ0FBQztJQUNwQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUNoQixDQUFDO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDIn0=