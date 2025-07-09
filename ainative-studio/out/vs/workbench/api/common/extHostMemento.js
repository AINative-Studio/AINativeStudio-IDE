/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise, RunOnceScheduler } from '../../../base/common/async.js';
export class ExtensionMemento {
    constructor(id, global, storage) {
        this._deferredPromises = new Map();
        this._id = id;
        this._shared = global;
        this._storage = storage;
        this._init = this._storage.initializeExtensionStorage(this._shared, this._id, Object.create(null)).then(value => {
            this._value = value;
            return this;
        });
        this._storageListener = this._storage.onDidChangeStorage(e => {
            if (e.shared === this._shared && e.key === this._id) {
                this._value = e.value;
            }
        });
        this._scheduler = new RunOnceScheduler(() => {
            const records = this._deferredPromises;
            this._deferredPromises = new Map();
            (async () => {
                try {
                    await this._storage.setValue(this._shared, this._id, this._value);
                    for (const value of records.values()) {
                        value.complete();
                    }
                }
                catch (e) {
                    for (const value of records.values()) {
                        value.error(e);
                    }
                }
            })();
        }, 0);
    }
    keys() {
        // Filter out `undefined` values, as they can stick around in the `_value` until the `onDidChangeStorage` event runs
        return Object.entries(this._value ?? {}).filter(([, value]) => value !== undefined).map(([key]) => key);
    }
    get whenReady() {
        return this._init;
    }
    get(key, defaultValue) {
        let value = this._value[key];
        if (typeof value === 'undefined') {
            value = defaultValue;
        }
        return value;
    }
    update(key, value) {
        if (value !== null && typeof value === 'object') {
            // Prevent the value from being as-is for until we have
            // received the change event from the main side by emulating
            // the treatment of values via JSON parsing and stringifying.
            // (https://github.com/microsoft/vscode/issues/209479)
            this._value[key] = JSON.parse(JSON.stringify(value));
        }
        else {
            this._value[key] = value;
        }
        const record = this._deferredPromises.get(key);
        if (record !== undefined) {
            return record.p;
        }
        const promise = new DeferredPromise();
        this._deferredPromises.set(key, promise);
        if (!this._scheduler.isScheduled()) {
            this._scheduler.schedule();
        }
        return promise.p;
    }
    dispose() {
        this._storageListener.dispose();
    }
}
export class ExtensionGlobalMemento extends ExtensionMemento {
    setKeysForSync(keys) {
        this._storage.registerExtensionStorageKeysToSync({ id: this._id, version: this._extension.version }, keys);
    }
    constructor(extensionDescription, storage) {
        super(extensionDescription.identifier.value, true, storage);
        this._extension = extensionDescription;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lbWVudG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE1lbWVudG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWxGLE1BQU0sT0FBTyxnQkFBZ0I7SUFhNUIsWUFBWSxFQUFVLEVBQUUsTUFBZSxFQUFFLE9BQXVCO1FBSHhELHNCQUFpQixHQUF1QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBSXpFLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFFeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQy9HLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM1RCxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckQsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3ZCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDM0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3ZDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ25DLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ1gsSUFBSSxDQUFDO29CQUNKLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFPLENBQUMsQ0FBQztvQkFDbkUsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQzt3QkFDdEMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNsQixDQUFDO2dCQUNGLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO3dCQUN0QyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNoQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ04sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVELElBQUk7UUFDSCxvSEFBb0g7UUFDcEgsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekcsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNuQixDQUFDO0lBSUQsR0FBRyxDQUFJLEdBQVcsRUFBRSxZQUFnQjtRQUNuQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLElBQUksT0FBTyxLQUFLLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDbEMsS0FBSyxHQUFHLFlBQVksQ0FBQztRQUN0QixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQVcsRUFBRSxLQUFVO1FBQzdCLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqRCx1REFBdUQ7WUFDdkQsNERBQTREO1lBQzVELDZEQUE2RDtZQUM3RCxzREFBc0Q7WUFDdEQsSUFBSSxDQUFDLE1BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN2RCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBQzNCLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNqQixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQztRQUM1QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDNUIsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsZ0JBQWdCO0lBSTNELGNBQWMsQ0FBQyxJQUFjO1FBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsa0NBQWtDLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1RyxDQUFDO0lBRUQsWUFBWSxvQkFBMkMsRUFBRSxPQUF1QjtRQUMvRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQztJQUN4QyxDQUFDO0NBRUQifQ==