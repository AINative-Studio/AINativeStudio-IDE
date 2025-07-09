/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class DebugNameData {
    constructor(owner, debugNameSource, referenceFn) {
        this.owner = owner;
        this.debugNameSource = debugNameSource;
        this.referenceFn = referenceFn;
    }
    getDebugName(target) {
        return getDebugName(target, this);
    }
}
const countPerName = new Map();
const cachedDebugName = new WeakMap();
export function getDebugName(target, data) {
    const cached = cachedDebugName.get(target);
    if (cached) {
        return cached;
    }
    const dbgName = computeDebugName(target, data);
    if (dbgName) {
        let count = countPerName.get(dbgName) ?? 0;
        count++;
        countPerName.set(dbgName, count);
        const result = count === 1 ? dbgName : `${dbgName}#${count}`;
        cachedDebugName.set(target, result);
        return result;
    }
    return undefined;
}
function computeDebugName(self, data) {
    const cached = cachedDebugName.get(self);
    if (cached) {
        return cached;
    }
    const ownerStr = data.owner ? formatOwner(data.owner) + `.` : '';
    let result;
    const debugNameSource = data.debugNameSource;
    if (debugNameSource !== undefined) {
        if (typeof debugNameSource === 'function') {
            result = debugNameSource();
            if (result !== undefined) {
                return ownerStr + result;
            }
        }
        else {
            return ownerStr + debugNameSource;
        }
    }
    const referenceFn = data.referenceFn;
    if (referenceFn !== undefined) {
        result = getFunctionName(referenceFn);
        if (result !== undefined) {
            return ownerStr + result;
        }
    }
    if (data.owner !== undefined) {
        const key = findKey(data.owner, self);
        if (key !== undefined) {
            return ownerStr + key;
        }
    }
    return undefined;
}
function findKey(obj, value) {
    for (const key in obj) {
        if (obj[key] === value) {
            return key;
        }
    }
    return undefined;
}
const countPerClassName = new Map();
const ownerId = new WeakMap();
function formatOwner(owner) {
    const id = ownerId.get(owner);
    if (id) {
        return id;
    }
    const className = getClassName(owner) ?? 'Object';
    let count = countPerClassName.get(className) ?? 0;
    count++;
    countPerClassName.set(className, count);
    const result = count === 1 ? className : `${className}#${count}`;
    ownerId.set(owner, result);
    return result;
}
export function getClassName(obj) {
    const ctor = obj.constructor;
    if (ctor) {
        if (ctor.name === 'Object') {
            return undefined;
        }
        return ctor.name;
    }
    return undefined;
}
export function getFunctionName(fn) {
    const fnSrc = fn.toString();
    // Pattern: /** @description ... */
    const regexp = /\/\*\*\s*@description\s*([^*]*)\*\//;
    const match = regexp.exec(fnSrc);
    const result = match ? match[1] : undefined;
    return result?.trim();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdOYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9kZWJ1Z05hbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFzQmhHLE1BQU0sT0FBTyxhQUFhO0lBQ3pCLFlBQ2lCLEtBQTZCLEVBQzdCLGVBQTRDLEVBQzVDLFdBQWlDO1FBRmpDLFVBQUssR0FBTCxLQUFLLENBQXdCO1FBQzdCLG9CQUFlLEdBQWYsZUFBZSxDQUE2QjtRQUM1QyxnQkFBVyxHQUFYLFdBQVcsQ0FBc0I7SUFDOUMsQ0FBQztJQUVFLFlBQVksQ0FBQyxNQUFjO1FBQ2pDLE9BQU8sWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuQyxDQUFDO0NBQ0Q7QUFTRCxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztBQUMvQyxNQUFNLGVBQWUsR0FBRyxJQUFJLE9BQU8sRUFBa0IsQ0FBQztBQUV0RCxNQUFNLFVBQVUsWUFBWSxDQUFDLE1BQWMsRUFBRSxJQUFtQjtJQUMvRCxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLEtBQUssRUFBRSxDQUFDO1FBQ1IsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxD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