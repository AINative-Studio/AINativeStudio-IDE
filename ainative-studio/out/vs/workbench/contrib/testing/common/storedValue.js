/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
const defaultSerialization = {
    deserialize: d => JSON.parse(d),
    serialize: d => JSON.stringify(d),
};
/**
 * todo@connor4312: is this worthy to be in common?
 */
let StoredValue = class StoredValue extends Disposable {
    constructor(options, storage) {
        super();
        this.storage = storage;
        this.key = options.key;
        this.scope = options.scope;
        this.target = options.target;
        this.serialization = options.serialization ?? defaultSerialization;
        this.onDidChange = this.storage.onDidChangeValue(this.scope, this.key, this._store);
    }
    get(defaultValue) {
        if (this.value === undefined) {
            const value = this.storage.get(this.key, this.scope);
            this.value = value === undefined ? defaultValue : this.serialization.deserialize(value);
        }
        return this.value;
    }
    /**
     * Persists changes to the value.
     * @param value
     */
    store(value) {
        this.value = value;
        this.storage.store(this.key, this.serialization.serialize(value), this.scope, this.target);
    }
    /**
     * Delete an element stored under the provided key from storage.
     */
    delete() {
        this.storage.remove(this.key, this.scope);
    }
};
StoredValue = __decorate([
    __param(1, IStorageService)
], StoredValue);
export { StoredValue };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkVmFsdWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vc3RvcmVkVmFsdWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQXlELE1BQU0sZ0RBQWdELENBQUM7QUFPeEksTUFBTSxvQkFBb0IsR0FBbUM7SUFDNUQsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0IsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Q0FDakMsQ0FBQztBQVNGOztHQUVHO0FBQ0ksSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBZSxTQUFRLFVBQVU7SUFZN0MsWUFDQyxPQUErQixFQUNHLE9BQXdCO1FBRTFELEtBQUssRUFBRSxDQUFDO1FBRjBCLFlBQU8sR0FBUCxPQUFPLENBQWlCO1FBSTFELElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzdCLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsSUFBSSxvQkFBb0IsQ0FBQztRQUNuRSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBWU0sR0FBRyxDQUFDLFlBQWdCO1FBQzFCLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM5QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNuQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksS0FBSyxDQUFDLEtBQVE7UUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNO1FBQ1osSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0MsQ0FBQztDQUNELENBQUE7QUEzRFksV0FBVztJQWNyQixXQUFBLGVBQWUsQ0FBQTtHQWRMLFdBQVcsQ0EyRHZCIn0=