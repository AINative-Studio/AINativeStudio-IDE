"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceMap = void 0;
const defaultResourceToKey = (resource) => resource.toString();
class ResourceMap {
    constructor(toKey = defaultResourceToKey) {
        this._map = new Map();
        this._toKey = toKey;
    }
    set(uri, value) {
        this._map.set(this._toKey(uri), { uri, value });
        return this;
    }
    get(resource) {
        return this._map.get(this._toKey(resource))?.value;
    }
    has(resource) {
        return this._map.has(this._toKey(resource));
    }
    get size() {
        return this._map.size;
    }
    clear() {
        this._map.clear();
    }
    delete(resource) {
        return this._map.delete(this._toKey(resource));
    }
    *values() {
        for (const entry of this._map.values()) {
            yield entry.value;
        }
    }
    *keys() {
        for (const entry of this._map.values()) {
            yield entry.uri;
        }
    }
    *entries() {
        for (const entry of this._map.values()) {
            yield [entry.uri, entry.value];
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
}
exports.ResourceMap = ResourceMap;
//# sourceMappingURL=resourceMap.js.map