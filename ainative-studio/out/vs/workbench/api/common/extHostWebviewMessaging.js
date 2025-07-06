/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
class ArrayBufferSet {
    constructor() {
        this.buffers = [];
    }
    add(buffer) {
        let index = this.buffers.indexOf(buffer);
        if (index < 0) {
            index = this.buffers.length;
            this.buffers.push(buffer);
        }
        return index;
    }
}
export function serializeWebviewMessage(message, options) {
    if (options.serializeBuffersForPostMessage) {
        // Extract all ArrayBuffers from the message and replace them with references.
        const arrayBuffers = new ArrayBufferSet();
        const replacer = (_key, value) => {
            if (value instanceof ArrayBuffer) {
                const index = arrayBuffers.add(value);
                return {
                    $$vscode_array_buffer_reference$$: true,
                    index,
                };
            }
            else if (ArrayBuffer.isView(value)) {
                const type = getTypedArrayType(value);
                if (type) {
                    const index = arrayBuffers.add(value.buffer);
                    return {
                        $$vscode_array_buffer_reference$$: true,
                        index,
                        view: {
                            type: type,
                            byteLength: value.byteLength,
                            byteOffset: value.byteOffset,
                        }
                    };
                }
            }
            return value;
        };
        const serializedMessage = JSON.stringify(message, replacer);
        const buffers = arrayBuffers.buffers.map(arrayBuffer => {
            const bytes = new Uint8Array(arrayBuffer);
            return VSBuffer.wrap(bytes);
        });
        return { message: serializedMessage, buffers };
    }
    else {
        return { message: JSON.stringify(message), buffers: [] };
    }
}
function getTypedArrayType(value) {
    switch (value.constructor.name) {
        case 'Int8Array': return 1 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int8Array */;
        case 'Uint8Array': return 2 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint8Array */;
        case 'Uint8ClampedArray': return 3 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint8ClampedArray */;
        case 'Int16Array': return 4 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int16Array */;
        case 'Uint16Array': return 5 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint16Array */;
        case 'Int32Array': return 6 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int32Array */;
        case 'Uint32Array': return 7 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint32Array */;
        case 'Float32Array': return 8 /* extHostProtocol.WebviewMessageArrayBufferViewType.Float32Array */;
        case 'Float64Array': return 9 /* extHostProtocol.WebviewMessageArrayBufferViewType.Float64Array */;
        case 'BigInt64Array': return 10 /* extHostProtocol.WebviewMessageArrayBufferViewType.BigInt64Array */;
        case 'BigUint64Array': return 11 /* extHostProtocol.WebviewMessageArrayBufferViewType.BigUint64Array */;
    }
    return undefined;
}
export function deserializeWebviewMessage(jsonMessage, buffers) {
    const arrayBuffers = buffers.map(buffer => {
        const arrayBuffer = new ArrayBuffer(buffer.byteLength);
        const uint8Array = new Uint8Array(arrayBuffer);
        uint8Array.set(buffer.buffer);
        return arrayBuffer;
    });
    const reviver = !buffers.length ? undefined : (_key, value) => {
        if (value && typeof value === 'object' && value.$$vscode_array_buffer_reference$$) {
            const ref = value;
            const { index } = ref;
            const arrayBuffer = arrayBuffers[index];
            if (ref.view) {
                switch (ref.view.type) {
                    case 1 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int8Array */: return new Int8Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Int8Array.BYTES_PER_ELEMENT);
                    case 2 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint8Array */: return new Uint8Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Uint8Array.BYTES_PER_ELEMENT);
                    case 3 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint8ClampedArray */: return new Uint8ClampedArray(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Uint8ClampedArray.BYTES_PER_ELEMENT);
                    case 4 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int16Array */: return new Int16Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Int16Array.BYTES_PER_ELEMENT);
                    case 5 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint16Array */: return new Uint16Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Uint16Array.BYTES_PER_ELEMENT);
                    case 6 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int32Array */: return new Int32Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Int32Array.BYTES_PER_ELEMENT);
                    case 7 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint32Array */: return new Uint32Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Uint32Array.BYTES_PER_ELEMENT);
                    case 8 /* extHostProtocol.WebviewMessageArrayBufferViewType.Float32Array */: return new Float32Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Float32Array.BYTES_PER_ELEMENT);
                    case 9 /* extHostProtocol.WebviewMessageArrayBufferViewType.Float64Array */: return new Float64Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Float64Array.BYTES_PER_ELEMENT);
                    case 10 /* extHostProtocol.WebviewMessageArrayBufferViewType.BigInt64Array */: return new BigInt64Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / BigInt64Array.BYTES_PER_ELEMENT);
                    case 11 /* extHostProtocol.WebviewMessageArrayBufferViewType.BigUint64Array */: return new BigUint64Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / BigUint64Array.BYTES_PER_ELEMENT);
                    default: throw new Error('Unknown array buffer view type');
                }
            }
            return arrayBuffer;
        }
        return value;
    };
    const message = JSON.parse(jsonMessage, reviver);
    return { message, arrayBuffers };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdNZXNzYWdpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0V2Vidmlld01lc3NhZ2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHMUQsTUFBTSxjQUFjO0lBQXBCO1FBQ2lCLFlBQU8sR0FBa0IsRUFBRSxDQUFDO0lBVTdDLENBQUM7SUFSTyxHQUFHLENBQUMsTUFBbUI7UUFDN0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZixLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7WUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLHVCQUF1QixDQUN0QyxPQUFZLEVBQ1osT0FBcUQ7SUFFckQsSUFBSSxPQUFPLENBQUMsOEJBQThCLEVBQUUsQ0FBQztRQUM1Qyw4RUFBOEU7UUFDOUUsTUFBTSxZQUFZLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUUxQyxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxLQUFVLEVBQUUsRUFBRTtZQUM3QyxJQUFJLEtBQUssWUFBWSxXQUFXLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdEMsT0FBTztvQkFDTixpQ0FB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