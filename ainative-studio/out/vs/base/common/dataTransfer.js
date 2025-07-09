/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from './arrays.js';
import { Iterable } from './iterator.js';
import { generateUuid } from './uuid.js';
export function createStringDataTransferItem(stringOrPromise, id) {
    return {
        id,
        asString: async () => stringOrPromise,
        asFile: () => undefined,
        value: typeof stringOrPromise === 'string' ? stringOrPromise : undefined,
    };
}
export function createFileDataTransferItem(fileName, uri, data, id) {
    const file = { id: generateUuid(), name: fileName, uri, data };
    return {
        id,
        asString: async () => '',
        asFile: () => file,
        value: undefined,
    };
}
export class VSDataTransfer {
    constructor() {
        this._entries = new Map();
    }
    get size() {
        let size = 0;
        for (const _ of this._entries) {
            size++;
        }
        return size;
    }
    has(mimeType) {
        return this._entries.has(this.toKey(mimeType));
    }
    matches(pattern) {
        const mimes = [...this._entries.keys()];
        if (Iterable.some(this, ([_, item]) => item.asFile())) {
            mimes.push('files');
        }
        return matchesMimeType_normalized(normalizeMimeType(pattern), mimes);
    }
    get(mimeType) {
        return this._entries.get(this.toKey(mimeType))?.[0];
    }
    /**
     * Add a new entry to this data transfer.
     *
     * This does not replace existing entries for `mimeType`.
     */
    append(mimeType, value) {
        const existing = this._entries.get(mimeType);
        if (existing) {
            existing.push(value);
        }
        else {
            this._entries.set(this.toKey(mimeType), [value]);
        }
    }
    /**
     * Set the entry for a given mime type.
     *
     * This replaces all existing entries for `mimeType`.
     */
    replace(mimeType, value) {
        this._entries.set(this.toKey(mimeType), [value]);
    }
    /**
     * Remove all entries for `mimeType`.
     */
    delete(mimeType) {
        this._entries.delete(this.toKey(mimeType));
    }
    /**
     * Iterate over all `[mime, item]` pairs in this data transfer.
     *
     * There may be multiple entries for each mime type.
     */
    *[Symbol.iterator]() {
        for (const [mine, items] of this._entries) {
            for (const item of items) {
                yield [mine, item];
            }
        }
    }
    toKey(mimeType) {
        return normalizeMimeType(mimeType);
    }
}
function normalizeMimeType(mimeType) {
    return mimeType.toLowerCase();
}
export function matchesMimeType(pattern, mimeTypes) {
    return matchesMimeType_normalized(normalizeMimeType(pattern), mimeTypes.map(normalizeMimeType));
}
function matchesMimeType_normalized(normalizedPattern, normalizedMimeTypes) {
    // Anything wildcard
    if (normalizedPattern === '*/*') {
        return normalizedMimeTypes.length > 0;
    }
    // Exact match
    if (normalizedMimeTypes.includes(normalizedPattern)) {
        return true;
    }
    // Wildcard, such as `image/*`
    const wildcard = normalizedPattern.match(/^([a-z]+)\/([a-z]+|\*)$/i);
    if (!wildcard) {
        return false;
    }
    const [_, type, subtype] = wildcard;
    if (subtype === '*') {
        return normalizedMimeTypes.some(mime => mime.startsWith(type + '/'));
    }
    return false;
}
export const UriList = Object.freeze({
    // http://amundsen.com/hypermedia/urilist/
    create: (entries) => {
        return distinct(entries.map(x => x.toString())).join('\r\n');
    },
    split: (str) => {
        return str.split('\r\n');
    },
    parse: (str) => {
        return UriList.split(str).filter(value => !value.startsWith('#'));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YVRyYW5zZmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2RhdGFUcmFuc2Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFekMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFdBQVcsQ0FBQztBQWdCekMsTUFBTSxVQUFVLDRCQUE0QixDQUFDLGVBQXlDLEVBQUUsRUFBVztJQUNsRyxPQUFPO1FBQ04sRUFBRTtRQUNGLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLGVBQWU7UUFDckMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7UUFDdkIsS0FBSyxFQUFFLE9BQU8sZUFBZSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxTQUFTO0tBQ3hFLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLDBCQUEwQixDQUFDLFFBQWdCLEVBQUUsR0FBb0IsRUFBRSxJQUErQixFQUFFLEVBQVc7SUFDOUgsTUFBTSxJQUFJLEdBQUcsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDL0QsT0FBTztRQUNOLEVBQUU7UUFDRixRQUFRLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1FBQ3hCLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1FBQ2xCLEtBQUssRUFBRSxTQUFTO0tBQ2hCLENBQUM7QUFDSCxDQUFDO0FBZ0NELE1BQU0sT0FBTyxjQUFjO0lBQTNCO1FBRWtCLGFBQVEs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