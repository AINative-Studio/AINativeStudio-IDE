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
import { strictEquals } from '../../../base/common/equals.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ObservableValue } from '../../../base/common/observableInternal/base.js';
import { DebugNameData } from '../../../base/common/observableInternal/debugName.js';
import { IStorageService } from '../../storage/common/storage.js';
/**
 * Defines an observable memento. Returns a function that can be called with
 * the specific storage scope, target, and service to use in a class.
 *
 * Note that the returned Observable is a disposable, because it interacts
 * with storage service events, and must be tracked appropriately.
 */
export function observableMemento(opts) {
    return (scope, target, storageService) => {
        return new ObservableMemento(opts, scope, target, storageService);
    };
}
/**
 * A value that is stored, and is also observable. Note: T should be readonly.
 */
let ObservableMemento = class ObservableMemento extends ObservableValue {
    constructor(opts, storageScope, storageTarget, storageService) {
        if (opts.defaultValue && typeof opts.defaultValue === 'object') {
            opts.toStorage ??= (value) => JSON.stringify(value);
            opts.fromStorage ??= (value) => JSON.parse(value);
        }
        let initialValue = opts.defaultValue;
        const fromStorage = storageService.get(opts.key, storageScope);
        if (fromStorage !== undefined) {
            if (opts.fromStorage) {
                try {
                    initialValue = opts.fromStorage(fromStorage);
                }
                catch {
                    initialValue = opts.defaultValue;
                }
            }
        }
        super(new DebugNameData(undefined, `storage/${opts.key}`, undefined), initialValue, strictEquals);
        this._store = new DisposableStore();
        this._didChange = false;
        const didChange = storageService.onDidChangeValue(storageScope, opts.key, this._store);
        // only take external changes if there aren't local changes we've made
        this._store.add(didChange((e) => {
            if (e.external && e.key === opts.key && !this._didChange) {
                this.set(opts.defaultValue, undefined);
            }
        }));
        this._store.add(storageService.onWillSaveState(() => {
            if (this._didChange) {
                this._didChange = false;
                const value = this.get();
                if (opts.toStorage) {
                    storageService.store(opts.key, opts.toStorage(value), storageScope, storageTarget);
                }
                else {
                    storageService.store(opts.key, String(value), storageScope, storageTarget);
                }
            }
        }));
    }
    _setValue(newValue) {
        super._setValue(newValue);
        this._didChange = true;
    }
    dispose() {
        this._store.dispose();
    }
};
ObservableMemento = __decorate([
    __param(3, IStorageService)
], ObservableMemento);
export { ObservableMemento };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZU1lbWVudG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vb2JzZXJ2YWJsZS9jb21tb24vb2JzZXJ2YWJsZU1lbWVudG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUM7QUFVL0Y7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFJLElBQStCO0lBQ25FLE9BQU8sQ0FBQyxLQUFtQixFQUFFLE1BQXFCLEVBQUUsY0FBK0IsRUFBd0IsRUFBRTtRQUM1RyxPQUFPLElBQUksaUJBQWlCLENBQUksSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0ksSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBcUIsU0FBUSxlQUFrQjtJQUkzRCxZQUNDLElBQStCLEVBQy9CLFlBQTBCLEVBQzFCLGFBQTRCLEVBQ1gsY0FBK0I7UUFFaEQsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLE9BQU8sSUFBSSxDQUFDLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRSxJQUFJLENBQUMsU0FBUyxLQUFLLENBQUMsS0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxD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