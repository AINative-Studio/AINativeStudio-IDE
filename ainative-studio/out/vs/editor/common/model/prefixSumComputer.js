/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { arrayInsert } from '../../../base/common/arrays.js';
import { toUint32 } from '../../../base/common/uint.js';
export class PrefixSumComputer {
    constructor(values) {
        this.values = values;
        this.prefixSum = new Uint32Array(values.length);
        this.prefixSumValidIndex = new Int32Array(1);
        this.prefixSumValidIndex[0] = -1;
    }
    getCount() {
        return this.values.length;
    }
    insertValues(insertIndex, insertValues) {
        insertIndex = toUint32(insertIndex);
        const oldValues = this.values;
        const oldPrefixSum = this.prefixSum;
        const insertValuesLen = insertValues.length;
        if (insertValuesLen === 0) {
            return false;
        }
        this.values = new Uint32Array(oldValues.length + insertValuesLen);
        this.values.set(oldValues.subarray(0, insertIndex), 0);
        this.values.set(oldValues.subarray(insertIndex), insertIndex + insertValuesLen);
        this.values.set(insertValues, insertIndex);
        if (insertIndex - 1 < this.prefixSumValidIndex[0]) {
            this.prefixSumValidIndex[0] = insertIndex - 1;
        }
        this.prefixSum = new Uint32Array(this.values.length);
        if (this.prefixSumValidIndex[0] >= 0) {
            this.prefixSum.set(oldPrefixSum.subarray(0, this.prefixSumValidIndex[0] + 1));
        }
        return true;
    }
    setValue(index, value) {
        index = toUint32(index);
        value = toUint32(value);
        if (this.values[index] === value) {
            return false;
        }
        this.values[index] = value;
        if (index - 1 < this.prefixSumValidIndex[0]) {
            this.prefixSumValidIndex[0] = index - 1;
        }
        return true;
    }
    removeValues(startIndex, count) {
        startIndex = toUint32(startIndex);
        count = toUint32(count);
        const oldValues = this.values;
        const oldPrefixSum = this.prefixSum;
        if (startIndex >= oldValues.length) {
            return false;
        }
        const maxCount = oldValues.length - startIndex;
        if (count >= maxCount) {
            count = maxCount;
        }
        if (count === 0) {
            return false;
        }
        this.values = new Uint32Array(oldValues.length - count);
        this.values.set(oldValues.subarray(0, startIndex), 0);
        this.values.set(oldValues.subarray(startIndex + count), startIndex);
        this.prefixSum = new Uint32Array(this.values.length);
        if (startIndex - 1 < this.prefixSumValidIndex[0]) {
            this.prefixSumValidIndex[0] = startIndex - 1;
        }
        if (this.prefixSumValidIndex[0] >= 0) {
            this.prefixSum.set(oldPrefixSum.subarray(0, this.prefixSumValidIndex[0] + 1));
        }
        return true;
    }
    getTotalSum() {
        if (this.values.length === 0) {
            return 0;
        }
        return this._getPrefixSum(this.values.length - 1);
    }
    /**
     * Returns the sum of the first `index + 1` many items.
     * @returns `SUM(0 <= j <= index, values[j])`.
     */
    getPrefixSum(index) {
        if (index < 0) {
            return 0;
        }
        index = toUint32(index);
        return this._getPrefixSum(index);
    }
    _getPrefixSum(index) {
        if (index <= this.prefixSumValidIndex[0]) {
            return this.prefixSum[index];
        }
        let startIndex = this.prefixSumValidIndex[0] + 1;
        if (startIndex === 0) {
            this.prefixSum[0] = this.values[0];
            startIndex++;
        }
        if (index >= this.values.length) {
            index = this.values.length - 1;
        }
        for (let i = startIndex; i <= index; i++) {
            this.prefixSum[i] = this.prefixSum[i - 1] + this.values[i];
        }
        this.prefixSumValidIndex[0] = Math.max(this.prefixSumValidIndex[0], index);
        return this.prefixSum[index];
    }
    getIndexOf(sum) {
        sum = Math.floor(sum);
        // Compute all sums (to get a fully valid prefixSum)
        this.getTotalSum();
        let low = 0;
        let high = this.values.length - 1;
        let mid = 0;
        let midStop = 0;
        let midStart = 0;
        while (low <= high) {
            mid = low + ((high - low) / 2) | 0;
            midStop = this.prefixSum[mid];
            midStart = midStop - this.values[mid];
            if (sum < midStart) {
                high = mid - 1;
            }
            else if (sum >= midStop) {
                low = mid + 1;
            }
            else {
                break;
            }
        }
        return new PrefixSumIndexOfResult(mid, sum - midStart);
    }
}
/**
 * {@link getIndexOf} has an amortized runtime complexity of O(1).
 *
 * ({@link PrefixSumComputer.getIndexOf} is just  O(log n))
*/
export class ConstantTimePrefixSumComputer {
    constructor(values) {
        this._values = values;
        this._isValid = false;
        this._validEndIndex = -1;
        this._prefixSum = [];
        this._indexBySum = [];
    }
    /**
     * @returns SUM(0 <= j < values.length, values[j])
     */
    getTotalSum() {
        this._ensureValid();
        return this._indexBySum.length;
    }
    /**
     * Returns the sum of the first `count` many items.
     * @returns `SUM(0 <= j < count, values[j])`.
     */
    getPrefixSum(count) {
        this._ensureValid();
        if (count === 0) {
            return 0;
        }
        return this._prefixSum[count - 1];
    }
    /**
     * @returns `result`, such that `getPrefixSum(result.index) + result.remainder = sum`
     */
    getIndexOf(sum) {
        this._ensureValid();
        const idx = this._indexBySum[sum];
        const viewLinesAbove = idx > 0 ? this._prefixSum[idx - 1] : 0;
        return new PrefixSumIndexOfResult(idx, sum - viewLinesAbove);
    }
    removeValues(start, deleteCount) {
        this._values.splice(start, deleteCount);
        this._invalidate(start);
    }
    insertValues(insertIndex, insertArr) {
        this._values = arrayInsert(this._values, insertIndex, insertArr);
        this._invalidate(insertIndex);
    }
    _invalidate(index) {
        this._isValid = false;
        this._validEndIndex = Math.min(this._validEndIndex, index - 1);
    }
    _ensureValid() {
        if (this._isValid) {
            return;
        }
        for (let i = this._validEndIndex + 1, len = this._values.length; i < len; i++) {
            const value = this._values[i];
            const sumAbove = i > 0 ? this._prefixSum[i - 1] : 0;
            this._prefixSum[i] = sumAbove + value;
            for (let j = 0; j < value; j++) {
                this._indexBySum[sumAbove + j] = i;
            }
        }
        // trim things
        this._prefixSum.length = this._values.length;
        this._indexBySum.length = this._prefixSum[this._prefixSum.length - 1];
        // mark as valid
        this._isValid = true;
        this._validEndIndex = this._values.length - 1;
    }
    setValue(index, value) {
        if (this._values[index] === value) {
            // no change
            return;
        }
        this._values[index] = value;
        this._invalidate(index);
    }
}
export class PrefixSumIndexOfResult {
    constructor(index, remainder) {
        this.index = index;
        this.remainder = remainder;
        this._prefixSumIndexOfResultBrand = undefined;
        this.index = index;
        this.remainder = remainder;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZml4U3VtQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9wcmVmaXhTdW1Db21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXhELE1BQU0sT0FBTyxpQkFBaUI7SUFpQjdCLFlBQVksTUFBbUI7UUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU0sUUFBUTtRQUNkLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDM0IsQ0FBQztJQUVNLFlBQVksQ0FBQyxXQUFtQixFQUFFLFlBQXlCO1FBQ2pFLFdBQVcsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDcEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUM5QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3BDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7UUFFNUMsSUFBSSxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FB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