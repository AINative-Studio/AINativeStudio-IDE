/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
import { Disposable } from './extHostTypes.js';
export class ExtHostAiEmbeddingVector {
    constructor(mainContext) {
        this._AiEmbeddingVectorProviders = new Map();
        this._nextHandle = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadAiEmbeddingVector);
    }
    async $provideAiEmbeddingVector(handle, strings, token) {
        if (this._AiEmbeddingVectorProviders.size === 0) {
            throw new Error('No embedding vector providers registered');
        }
        const provider = this._AiEmbeddingVectorProviders.get(handle);
        if (!provider) {
            throw new Error('Embedding vector provider not found');
        }
        const result = await provider.provideEmbeddingVector(strings, token);
        if (!result) {
            throw new Error('Embedding vector provider returned undefined');
        }
        return result;
    }
    registerEmbeddingVectorProvider(extension, model, provider) {
        const handle = this._nextHandle;
        this._nextHandle++;
        this._AiEmbeddingVectorProviders.set(handle, provider);
        this._proxy.$registerAiEmbeddingVectorProvider(model, handle);
        return new Disposable(() => {
            this._proxy.$unregisterAiEmbeddingVectorProvider(handle);
            this._AiEmbeddingVectorProviders.delete(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVtYmVkZGluZ1ZlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RW1iZWRkaW5nVmVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBK0MsV0FBVyxFQUFvQyxNQUFNLHVCQUF1QixDQUFDO0FBRW5JLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUUvQyxNQUFNLE9BQU8sd0JBQXdCO0lBTXBDLFlBQ0MsV0FBeUI7UUFObEIsZ0NBQTJCLEdBQXlDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDOUUsZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFPdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxLQUFLLENBQUMseUJBQXlCLENBQUMsTUFBYyxFQUFFLE9BQWlCLEVBQUUsS0FBd0I7UUFDMUYsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELCtCQUErQixDQUFDLFNBQWdDLEVBQUUsS0FBYSxFQUFFLFFBQWlDO1FBQ2pILE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDaEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzlELE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsb0NBQW9DLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9