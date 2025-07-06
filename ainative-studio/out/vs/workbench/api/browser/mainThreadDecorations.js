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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWREZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQTBGLE1BQU0sK0JBQStCLENBQUM7QUFDcEssT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxtQkFBbUIsRUFBbUIsTUFBTSxrREFBa0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxNQUFNLHVCQUF1QjtJQVE1QixZQUNrQixNQUErQixFQUMvQixPQUFlO1FBRGYsV0FBTSxHQUFOLE1BQU0sQ0FBeUI7UUFDL0IsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQVJ6QixZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ1osY0FBUyxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO1FBQ2pELGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztRQVFwRSxFQUFFO0lBQ0gsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFRLEVBQUUsS0FBd0I7UUFDekMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUksT0FBTyxDQUFpQixPQUFPLENBQUMs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