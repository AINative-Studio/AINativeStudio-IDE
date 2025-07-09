/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const emptyArr = [];
/**
 * Represents an immutable set that works best for a small number of elements (less than 32).
 * It uses bits to encode element membership efficiently.
*/
export class SmallImmutableSet {
    static { this.cache = new Array(129); }
    static create(items, additionalItems) {
        if (items <= 128 && additionalItems.length === 0) {
            // We create a cache of 128=2^7 elements to cover all sets with up to 7 (dense) elements.
            let cached = SmallImmutableSet.cache[items];
            if (!cached) {
                cached = new SmallImmutableSet(items, additionalItems);
                SmallImmutableSet.cache[items] = cached;
            }
            return cached;
        }
        return new SmallImmutableSet(items, additionalItems);
    }
    static { this.empty = SmallImmutableSet.create(0, emptyArr); }
    static getEmpty() {
        return this.empty;
    }
    constructor(items, additionalItems) {
        this.items = items;
        this.additionalItems = additionalItems;
    }
    add(value, keyProvider) {
        const key = keyProvider.getKey(value);
        let idx = key >> 5; // divided by 32
        if (idx === 0) {
            // fast path
            const newItem = (1 << key) | this.items;
            if (newItem === this.items) {
                return this;
            }
            return SmallImmutableSet.create(newItem, this.additionalItems);
        }
        idx--;
        const newItems = this.additionalItems.slice(0);
        while (newItems.length < idx) {
            newItems.push(0);
        }
        newItems[idx] |= 1 << (key & 31);
        return SmallImmutableSet.create(this.items, newItems);
    }
    has(value, keyProvider) {
        const key = keyProvider.getKey(value);
        let idx = key >> 5; // divided by 32
        if (idx === 0) {
            // fast path
            return (this.items & (1 << key)) !== 0;
        }
        idx--;
        return ((this.additionalItems[idx] || 0) & (1 << (key & 31))) !== 0;
    }
    merge(other) {
        const merged = this.items | other.items;
        if (this.additionalItems === emptyArr && other.additionalItems === emptyArr) {
            // fast path
            if (merged === this.items) {
                return this;
            }
            if (merged === other.items) {
                return other;
            }
            return SmallImmutableSet.create(merged, emptyArr);
        }
        // This can be optimized, but it's not a common case
        const newItems = [];
        for (let i = 0; i < Math.max(this.additionalItems.length, other.additionalItems.length); i++) {
            const item1 = this.additionalItems[i] || 0;
            const item2 = other.additionalItems[i] || 0;
            newItems.push(item1 | item2);
        }
        return SmallImmutableSet.create(merged, newItems);
    }
    intersects(other) {
        if ((this.items & other.items) !== 0) {
            return true;
        }
        for (let i = 0; i < Math.min(this.additionalItems.length, other.additionalItems.length); i++) {
            if ((this.additionalItems[i] & other.additionalItems[i]) !== 0) {
                return true;
            }
        }
        return false;
    }
    equals(other) {
        if (this.items !== other.items) {
            return false;
        }
        if (this.additionalItems.length !== other.additionalItems.length) {
            return false;
        }
        for (let i = 0; i < this.additionalItems.length; i++) {
            if (this.additionalItems[i] !== other.additionalItems[i]) {
                return false;
            }
        }
        return true;
    }
}
export const identityKeyProvider = {
    getKey(value) {
        return value;
    }
};
/**
 * Assigns values a unique incrementing key.
*/
export class DenseKeyProvider {
    constructor() {
        this.items = new Map();
    }
    getKey(value) {
        let existing = this.items.get(value);
        if (existing === undefined) {
            existing = this.items.size;
            this.items.set(value, existing);
        }
        return existing;
    }
    reverseLookup(value) {
        return [...this.items].find(([_key, v]) => v === value)?.[0];
    }
    reverseLookupSet(set) {
        const result = [];
        for (const [key] of this.items) {
            if (set.has(key, this)) {
                result.push(key);
            }
        }
        return result;
    }
    keys() {
        return this.items.keys();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hbGxJbW11dGFibGVTZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvc21hbGxJbW11dGFibGVTZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFDO0FBRTlCOzs7RUFHRTtBQUNGLE1BQU0sT0FBTyxpQkFBaUI7YUFDZCxVQUFLLEdBQUcsSUFBSSxLQUFLLENBQXlCLEdBQUcsQ0FBQyxDQUFDO0lBRXRELE1BQU0sQ0FBQyxNQUFNLENBQUksS0FBYSxFQUFFLGVBQWtDO1FBQ3pFLElBQUksS0FBSyxJQUFJLEdBQUcsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xELHlGQUF5RjtZQUN6RixJQUFJLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE1BQU0sR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFDdkQsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQztZQUN6QyxDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBRUQsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztJQUN0RCxDQUFDO2FBRWMsVUFBSyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDM0QsTUFBTSxDQUFDLFFBQVE7UUFDckIsT0FBTyxJQUFJLENB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