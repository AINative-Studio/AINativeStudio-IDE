/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class TerminalCapabilityStore extends Disposable {
    constructor() {
        super(...arguments);
        this._map = new Map();
        this._onDidRemoveCapabilityType = this._register(new Emitter());
        this.onDidRemoveCapabilityType = this._onDidRemoveCapabilityType.event;
        this._onDidAddCapabilityType = this._register(new Emitter());
        this.onDidAddCapabilityType = this._onDidAddCapabilityType.event;
        this._onDidRemoveCapability = this._register(new Emitter());
        this.onDidRemoveCapability = this._onDidRemoveCapability.event;
        this._onDidAddCapability = this._register(new Emitter());
        this.onDidAddCapability = this._onDidAddCapability.event;
    }
    get items() {
        return this._map.keys();
    }
    add(capability, impl) {
        this._map.set(capability, impl);
        this._onDidAddCapabilityType.fire(capability);
        this._onDidAddCapability.fire({ id: capability, capability: impl });
    }
    get(capability) {
        // HACK: This isn't totally safe since the Map key and value are not connected
        return this._map.get(capability);
    }
    remove(capability) {
        const impl = this._map.get(capability);
        if (!impl) {
            return;
        }
        this._map.delete(capability);
        this._onDidRemoveCapabilityType.fire(capability);
        this._onDidAddCapability.fire({ id: capability, capability: impl });
    }
    has(capability) {
        return this._map.has(capability);
    }
}
export class TerminalCapabilityStoreMultiplexer extends Disposable {
    constructor() {
        super(...arguments);
        this._stores = [];
        this._onDidRemoveCapabilityType = this._register(new Emitter());
        this.onDidRemoveCapabilityType = this._onDidRemoveCapabilityType.event;
        this._onDidAddCapabilityType = this._register(new Emitter());
        this.onDidAddCapabilityType = this._onDidAddCapabilityType.event;
        this._onDidRemoveCapability = this._register(new Emitter());
        this.onDidRemoveCapability = this._onDidRemoveCapability.event;
        this._onDidAddCapability = this._register(new Emitter());
        this.onDidAddCapability = this._onDidAddCapability.event;
    }
    get items() {
        return this._items();
    }
    *_items() {
        for (const store of this._stores) {
            for (const c of store.items) {
                yield c;
            }
        }
    }
    has(capability) {
        for (const store of this._stores) {
            for (const c of store.items) {
                if (c === capability) {
                    return true;
                }
            }
        }
        return false;
    }
    get(capability) {
        for (const store of this._stores) {
            const c = store.get(capability);
            if (c) {
                return c;
            }
        }
        return undefined;
    }
    add(store) {
        this._stores.push(store);
        for (const capability of store.items) {
            this._onDidAddCapabilityType.fire(capability);
            this._onDidAddCapability.fire({ id: capability, capability: store.get(capability) });
        }
        this._register(store.onDidAddCapabilityType(e => this._onDidAddCapabilityType.fire(e)));
        this._register(store.onDidAddCapability(e => this._onDidAddCapability.fire(e)));
        this._register(store.onDidRemoveCapabilityType(e => this._onDidRemoveCapabilityType.fire(e)));
        this._register(store.onDidRemoveCapability(e => this._onDidRemoveCapability.fire(e)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDYXBhYmlsaXR5U3RvcmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL2NhcGFiaWxpdGllcy90ZXJtaW5hbENhcGFiaWxpdHlTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2xFLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUFVO0lBQXZEOztRQUNTLFNBQUksR0FBMEQsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUUvRCwrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUM7UUFDdkYsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztRQUMxRCw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUM7UUFDcEYsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQztRQUVwRCwyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQyxDQUFDLENBQUM7UUFDbkcsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztRQUNsRCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQyxDQUFDLENBQUM7UUFDaEcsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQztJQThCOUQsQ0FBQztJQTVCQSxJQUFJLEtBQUs7UUFDUixP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