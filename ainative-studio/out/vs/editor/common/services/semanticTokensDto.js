/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import * as platform from '../../../base/common/platform.js';
var EncodedSemanticTokensType;
(function (EncodedSemanticTokensType) {
    EncodedSemanticTokensType[EncodedSemanticTokensType["Full"] = 1] = "Full";
    EncodedSemanticTokensType[EncodedSemanticTokensType["Delta"] = 2] = "Delta";
})(EncodedSemanticTokensType || (EncodedSemanticTokensType = {}));
function reverseEndianness(arr) {
    for (let i = 0, len = arr.length; i < len; i += 4) {
        // flip bytes 0<->3 and 1<->2
        const b0 = arr[i + 0];
        const b1 = arr[i + 1];
        const b2 = arr[i + 2];
        const b3 = arr[i + 3];
        arr[i + 0] = b3;
        arr[i + 1] = b2;
        arr[i + 2] = b1;
        arr[i + 3] = b0;
    }
}
function toLittleEndianBuffer(arr) {
    const uint8Arr = new Uint8Array(arr.buffer, arr.byteOffset, arr.length * 4);
    if (!platform.isLittleEndian()) {
        // the byte order must be changed
        reverseEndianness(uint8Arr);
    }
    return VSBuffer.wrap(uint8Arr);
}
function fromLittleEndianBuffer(buff) {
    const uint8Arr = buff.buffer;
    if (!platform.isLittleEndian()) {
        // the byte order must be changed
        reverseEndianness(uint8Arr);
    }
    if (uint8Arr.byteOffset % 4 === 0) {
        return new Uint32Array(uint8Arr.buffer, uint8Arr.byteOffset, uint8Arr.length / 4);
    }
    else {
        // unaligned memory access doesn't work on all platforms
        const data = new Uint8Array(uint8Arr.byteLength);
        data.set(uint8Arr);
        return new Uint32Array(data.buffer, data.byteOffset, data.length / 4);
    }
}
export function encodeSemanticTokensDto(semanticTokens) {
    const dest = new Uint32Array(encodeSemanticTokensDtoSize(semanticTokens));
    let offset = 0;
    dest[offset++] = semanticTokens.id;
    if (semanticTokens.type === 'full') {
        dest[offset++] = 1 /* EncodedSemanticTokensType.Full */;
        dest[offset++] = semanticTokens.data.length;
        dest.set(semanticTokens.data, offset);
        offset += semanticTokens.data.length;
    }
    else {
        dest[offset++] = 2 /* EncodedSemanticTokensType.Delta */;
        dest[offset++] = semanticTokens.deltas.length;
        for (const delta of semanticTokens.deltas) {
            dest[offset++] = delta.start;
            dest[offset++] = delta.deleteCount;
            if (delta.data) {
                dest[offset++] = delta.data.length;
                dest.set(delta.data, offset);
                offset += delta.data.length;
            }
            else {
                dest[offset++] = 0;
            }
        }
    }
    return toLittleEndianBuffer(dest);
}
function encodeSemanticTokensDtoSize(semanticTokens) {
    let result = 0;
    result += (+1 // id
        + 1 // type
    );
    if (semanticTokens.type === 'full') {
        result += (+1 // data length
            + semanticTokens.data.length);
    }
    else {
        result += (+1 // delta count
        );
        result += (+1 // start
            + 1 // deleteCount
            + 1 // data length
        ) * semanticTokens.deltas.length;
        for (const delta of semanticTokens.deltas) {
            if (delta.data) {
                result += delta.data.length;
            }
        }
    }
    return result;
}
export function decodeSemanticTokensDto(_buff) {
    const src = fromLittleEndianBuffer(_buff);
    let offset = 0;
    const id = src[offset++];
    const type = src[offset++];
    if (type === 1 /* EncodedSemanticTokensType.Full */) {
        const length = src[offset++];
        const data = src.subarray(offset, offset + length);
        offset += length;
        return {
            id: id,
            type: 'full',
            data: data
        };
    }
    const deltaCount = src[offset++];
    const deltas = [];
    for (let i = 0; i < deltaCount; i++) {
        const start = src[offset++];
        const deleteCount = src[offset++];
        const length = src[offset++];
        let data;
        if (length > 0) {
            data = src.subarray(offset, offset + length);
            offset += length;
        }
        deltas[i] = { start, deleteCount, data };
    }
    return {
        id: id,
        type: 'delta',
        deltas: deltas
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNEdG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9zZW1hbnRpY1Rva2Vuc0R0by50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQztBQWdCN0QsSUFBVyx5QkFHVjtBQUhELFdBQVcseUJBQXlCO0lBQ25DLHlFQUFRLENBQUE7SUFDUiwyRUFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUhVLHlCQUF5QixLQUF6Qix5QkFBeUIsUUFHbkM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLEdBQWU7SUFDekMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDbkQsNkJBQTZCO1FBQzdCLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdEIsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdEIsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDaEIsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDaEIsR0FBRyxD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