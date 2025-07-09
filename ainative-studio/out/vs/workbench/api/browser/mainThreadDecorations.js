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
import { URI } from '../../../base/common/uri.js';
import { Emitter } from '../../../base/common/event.js';
import { dispose } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IDecorationsService } from '../../services/decorations/common/decorations.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
class DecorationRequestsQueue {
    constructor(_proxy, _handle) {
        this._proxy = _proxy;
        this._handle = _handle;
        this._idPool = 0;
        this._requests = new Map();
        this._resolver = new Map();
        //
    }
    enqueue(uri, token) {
        const id = ++this._idPool;
        const result = new Promise(resolve => {
            this._requests.set(id, { id, uri });
            this._resolver.set(id, resolve);
            this._processQueue();
        });
        const sub = token.onCancellationRequested(() => {
            this._requests.delete(id);
            this._resolver.delete(id);
        });
        return result.finally(() => sub.dispose());
    }
    _processQueue() {
        if (typeof this._timer === 'number') {
            // already queued
            return;
        }
        this._timer = setTimeout(() => {
            // make request
            const requests = this._requests;
            const resolver = this._resolver;
            this._proxy.$provideDecorations(this._handle, [...requests.values()], CancellationToken.None).then(data => {
                for (const [id, resolve] of resolver) {
                    resolve(data[id]);
                }
            });
            // reset
            this._requests = new Map();
            this._resolver = new Map();
            this._timer = undefined;
        }, 0);
    }
}
let MainThreadDecorations = class MainThreadDecorations {
    constructor(context, _decorationsService) {
        this._decorationsService = _decorationsService;
        this._provider = new Map();
        this._proxy = context.getProxy(ExtHostContext.ExtHostDecorations);
    }
    dispose() {
        this._provider.forEach(value => dispose(value));
        this._provider.clear();
    }
    $registerDecorationProvider(handle, label) {
        const emitter = new Emitter();
        const queue = new DecorationRequestsQueue(this._proxy, handle);
        const registration = this._decorationsService.registerDecorationsProvider({
            label,
            onDidChange: emitter.event,
            provideDecorations: async (uri, token) => {
                const data = await queue.enqueue(uri, token);
                if (!data) {
                    return undefined;
                }
                const [bubble, tooltip, letter, themeColor] = data;
                return {
                    weight: 10,
                    bubble: bubble ?? false,
                    color: themeColor?.id,
                    tooltip,
                    letter
                };
            }
        });
        this._provider.set(handle, [emitter, registration]);
    }
    $onDidChange(handle, resources) {
        const provider = this._provider.get(handle);
        if (provider) {
            const [emitter] = provider;
            emitter.fire(resources && resources.map(r => URI.revive(r)));
        }
    }
    $unregisterDecorationProvider(handle) {
        const provider = this._provider.get(handle);
        if (provider) {
            dispose(provider);
            this._provider.delete(handle);
        }
    }
};
MainThreadDecorations = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDecorations),
    __param(1, IDecorationsService)
], MainThreadDecorations);
export { MainThreadDecorations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUEwRixNQUFNLCtCQUErQixDQUFDO0FBQ3BLLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsbUJBQW1CLEVBQW1CLE1BQU0sa0RBQWtELENBQUM7QUFDeEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFekUsTUFBTSx1QkFBdUI7SUFRNUIsWUFDa0IsTUFBK0IsRUFDL0IsT0FBZTtRQURmLFdBQU0sR0FBTixNQUFNLENBQXlCO1FBQy9CLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFSekIsWUFBTyxHQUFHLENBQUMsQ0FBQztRQUNaLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztRQUNqRCxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXlDLENBQUM7UUFRcEUsRUFBRTtJQUNILENBQUM7SUFFRCxPQUFPLENBQUMsR0FBUSxFQUFFLEtBQXdCO1FBQ3pDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUMxQixNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBaUIsT0FBTyxDQUFD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