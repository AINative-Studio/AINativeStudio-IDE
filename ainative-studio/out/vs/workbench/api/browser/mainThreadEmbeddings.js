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
import { Emitter } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
const IEmbeddingsService = createDecorator('embeddingsService');
class EmbeddingsService {
    constructor() {
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.providers = new Map();
    }
    get allProviders() {
        return this.providers.keys();
    }
    registerProvider(id, provider) {
        this.providers.set(id, provider);
        this._onDidChange.fire();
        return {
            dispose: () => {
                this.providers.delete(id);
                this._onDidChange.fire();
            }
        };
    }
    computeEmbeddings(id, input, token) {
        const provider = this.providers.get(id);
        if (provider) {
            return provider.provideEmbeddings(input, token);
        }
        else {
            return Promise.reject(new Error(`No embeddings provider registered with id: ${id}`));
        }
    }
}
registerSingleton(IEmbeddingsService, EmbeddingsService, 1 /* InstantiationType.Delayed */);
let MainThreadEmbeddings = class MainThreadEmbeddings {
    constructor(context, embeddingsService) {
        this.embeddingsService = embeddingsService;
        this._store = new DisposableStore();
        this._providers = this._store.add(new DisposableMap);
        this._proxy = context.getProxy(ExtHostContext.ExtHostEmbeddings);
        this._store.add(embeddingsService.onDidChange((() => {
            this._proxy.$acceptEmbeddingModels(Array.from(embeddingsService.allProviders));
        })));
    }
    dispose() {
        this._store.dispose();
    }
    $registerEmbeddingProvider(handle, identifier) {
        const registration = this.embeddingsService.registerProvider(identifier, {
            provideEmbeddings: (input, token) => {
                return this._proxy.$provideEmbeddings(handle, input, token);
            }
        });
        this._providers.set(handle, registration);
    }
    $unregisterEmbeddingProvider(handle) {
        this._providers.deleteAndDispose(handle);
    }
    $computeEmbeddings(embeddingsModel, input, token) {
        return this.embeddingsService.computeEmbeddings(embeddingsModel, input, token);
    }
};
MainThreadEmbeddings = __decorate([
    extHostNamedCustomer(MainContext.MainThreadEmbeddings),
    __param(1, IEmbeddingsService)
], MainThreadEmbeddings);
export { MainThreadEmbeddings };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVtYmVkZGluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRFbWJlZGRpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBMEIsV0FBVyxFQUE2QixNQUFNLCtCQUErQixDQUFDO0FBQy9ILE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQU83RyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQztBQWVwRixNQUFNLGlCQUFpQjtJQVF0QjtRQUhpQixpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDM0MsZ0JBQVcsR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFHM0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztJQUN6RCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxFQUFVLEVBQUUsUUFBNkI7UUFDekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxD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