/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { MainContext } from './extHost.protocol.js';
export class ExtHostEmbeddings {
    constructor(mainContext) {
        this._provider = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._allKnownModels = new Set();
        this._handlePool = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadEmbeddings);
    }
    registerEmbeddingsProvider(_extension, embeddingsModel, provider) {
        if (this._allKnownModels.has(embeddingsModel)) {
            throw new Error('An embeddings provider for this model is already registered');
        }
        const handle = this._handlePool++;
        this._proxy.$registerEmbeddingProvider(handle, embeddingsModel);
        this._provider.set(handle, { id: embeddingsModel, provider });
        return toDisposable(() => {
            this._allKnownModels.delete(embeddingsModel);
            this._proxy.$unregisterEmbeddingProvider(handle);
            this._provider.delete(handle);
        });
    }
    async computeEmbeddings(embeddingsModel, input, token) {
        token ??= CancellationToken.None;
        let returnSingle = false;
        if (typeof input === 'string') {
            input = [input];
            returnSingle = true;
        }
        const result = await this._proxy.$computeEmbeddings(embeddingsModel, input, token);
        if (result.length !== input.length) {
            throw new Error();
        }
        if (returnSingle) {
            if (result.length !== 1) {
                throw new Error();
            }
            return result[0];
        }
        return result;
    }
    async $provideEmbeddings(handle, input, token) {
        const data = this._provider.get(handle);
        if (!data) {
            return [];
        }
        const result = await data.provider.provideEmbeddings(input, token);
        if (!result) {
            return [];
        }
        return result;
    }
    get embeddingsModels() {
        return Array.from(this._allKnownModels);
    }
    $acceptEmbeddingModels(models) {
        this._allKnownModels = new Set(models);
        this._onDidChange.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVtYmVkZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RW1iZWRkaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUUsT0FBTyxFQUF3QyxXQUFXLEVBQTZCLE1BQU0sdUJBQXVCLENBQUM7QUFJckgsTUFBTSxPQUFPLGlCQUFpQjtJQVc3QixZQUNDLFdBQXlCO1FBVFQsY0FBUyxHQUFHLElBQUksR0FBRyxFQUErRCxDQUFDO1FBRW5GLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUMzQyxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztRQUVwRCxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDcEMsZ0JBQVcsR0FBVyxDQUFDLENBQUM7UUFLL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxVQUFpQyxFQUFFLGVBQXVCLEVBQUUsUUFBbUM7UUFDekgsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsNkRBQTZELENBQUMsQ0FBQztRQUNoRixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFB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