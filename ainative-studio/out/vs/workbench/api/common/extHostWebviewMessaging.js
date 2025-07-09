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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdNZXNzYWdpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFdlYnZpZXdNZXNzYWdpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRzFELE1BQU0sY0FBYztJQUFwQjtRQUNpQixZQUFPLEdBQWtCLEVBQUUsQ0FBQztJQVU3QyxDQUFDO0lBUk8sR0FBRyxDQUFDLE1BQW1CO1FBQzdCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2YsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsT0FBWSxFQUNaLE9BQXFEO0lBRXJELElBQUksT0FBTyxDQUFDLDhCQUE4QixFQUFFLENBQUM7UUFDNUMsOEVBQThFO1FBQzlFLE1BQU0sWUFBWSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFFMUMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsS0FBVSxFQUFFLEVBQUU7WUFDN0MsSUFBSSxLQUFLLFlBQVksV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3RDLE9BQU87b0JBQ04saUNB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