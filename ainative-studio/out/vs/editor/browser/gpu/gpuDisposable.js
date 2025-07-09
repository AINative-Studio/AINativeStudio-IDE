/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFunction } from '../../../base/common/types.js';
export var GPULifecycle;
(function (GPULifecycle) {
    async function requestDevice(fallback) {
        try {
            if (!navigator.gpu) {
                throw new Error('This browser does not support WebGPU');
            }
            const adapter = (await navigator.gpu.requestAdapter());
            if (!adapter) {
                throw new Error('This browser supports WebGPU but it appears to be disabled');
            }
            return wrapDestroyableInDisposable(await adapter.requestDevice());
        }
        catch (e) {
            if (fallback) {
                fallback(e.message);
            }
            throw e;
        }
    }
    GPULifecycle.requestDevice = requestDevice;
    function createBuffer(device, descriptor, initialValues) {
        const buffer = device.createBuffer(descriptor);
        if (initialValues) {
            device.queue.writeBuffer(buffer, 0, isFunction(initialValues) ? initialValues() : initialValues);
        }
        return wrapDestroyableInDisposable(buffer);
    }
    GPULifecycle.createBuffer = createBuffer;
    function createTexture(device, descriptor) {
        return wrapDestroyableInDisposable(device.createTexture(descriptor));
    }
    GPULifecycle.createTexture = createTexture;
})(GPULifecycle || (GPULifecycle = {}));
function wrapDestroyableInDisposable(value) {
    return {
        object: value,
        dispose: () => value.destroy()
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B1RGlzcG9zYWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvZ3B1RGlzcG9zYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFM0QsTUFBTSxLQUFXLFlBQVksQ0E4QjVCO0FBOUJELFdBQWlCLFlBQVk7SUFDckIsS0FBSyxVQUFVLGFBQWEsQ0FBQyxRQUFvQztRQUN2RSxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7WUFDekQsQ0FBQztZQUNELE1BQU0sT0FBTyxHQUFHLENBQUMsTUFBTSxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFFLENBQUM7WUFDeEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQztZQUMvRSxDQUFDO1lBQ0QsT0FBTywyQkFBMkIsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JCLENBQUM7WUFDRCxNQUFNLENBQUMsQ0FBQztRQUNULENBQUM7SUFDRixDQUFDO0lBaEJxQiwwQkFBYSxnQkFnQmxDLENBQUE7SUFFRCxTQUFnQixZQUFZLENBQUMsTUFBaUIsRUFBRSxVQUErQixFQUFFLGFBQW1EO1FBQ25JLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0MsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7UUFDRCxPQUFPLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFOZSx5QkFBWSxlQU0zQixDQUFBO0lBRUQsU0FBZ0IsYUFBYSxDQUFDLE1BQWlCLEVBQUUsVUFBZ0M7UUFDaEYsT0FBTywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUZlLDBCQUFhLGdCQUU1QixDQUFBO0FBQ0YsQ0FBQyxFQTlCZ0IsWUFBWSxLQUFaLFlBQVksUUE4QjVCO0FBRUQsU0FBUywyQkFBMkIsQ0FBZ0MsS0FBUTtJQUMzRSxPQUFPO1FBQ04sTUFBTSxFQUFFLEtBQUs7UUFDYixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtLQUM5QixDQUFDO0FBQ0gsQ0FBQyJ9