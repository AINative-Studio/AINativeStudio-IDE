/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Lazy } from './lazy.js';
import * as streams from './stream.js';
const hasBuffer = (typeof Buffer !== 'undefined');
const indexOfTable = new Lazy(() => new Uint8Array(256));
let textEncoder;
let textDecoder;
export class VSBuffer {
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    static alloc(byteLength) {
        if (hasBuffer) {
            return new VSBuffer(Buffer.allocUnsafe(byteLength));
        }
        else {
            return new VSBuffer(new Uint8Array(byteLength));
        }
    }
    /**
     * When running in a nodejs context, if `actual` is not a nodejs Buffer, the backing store for
     * the returned `VSBuffer` instance might use a nodejs Buffer allocated from node's Buffer pool,
     * which is not transferrable.
     */
    static wrap(actual) {
        if (hasBuffer && !(Buffer.isBuffer(actual))) {
            // https://nodejs.org/dist/latest-v10.x/docs/api/buffer.html#buffer_class_method_buffer_from_arraybuffer_byteoffset_length
            // Create a zero-copy Buffer wrapper around the ArrayBuffer pointed to by the Uint8Array
            actual = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
        }
        return new VSBuffer(actual);
    }
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    static fromString(source, options) {
        const dontUseNodeBuffer = options?.dontUseNodeBuffer || false;
        if (!dontUseNodeBuffer && hasBuffer) {
            return new VSBuffer(Buffer.from(source));
        }
        else {
            if (!textEncoder) {
                textEncoder = new TextEncoder();
            }
            return new VSBuffer(textEncoder.encode(source));
        }
    }
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    static fromByteArray(source) {
        const result = VSBuffer.alloc(source.length);
        for (let i = 0, len = source.length; i < len; i++) {
            result.buffer[i] = source[i];
        }
        return result;
    }
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    static concat(buffers, totalLength) {
        if (typeof totalLength === 'undefined') {
            totalLength = 0;
            for (let i = 0, len = buffers.length; i < len; i++) {
                totalLength += buffers[i].byteLength;
            }
        }
        const ret = VSBuffer.alloc(totalLength);
        let offset = 0;
        for (let i = 0, len = buffers.length; i < len; i++) {
            const element = buffers[i];
            ret.set(element, offset);
            offset += element.byteLength;
        }
        return ret;
    }
    constructor(buffer) {
        this.buffer = buffer;
        this.byteLength = this.buffer.byteLength;
    }
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    clone() {
        const result = VSBuffer.alloc(this.byteLength);
        result.set(this);
        return result;
    }
    toString() {
        if (hasBuffer) {
            return this.buffer.toString();
        }
        else {
            if (!textDecoder) {
                textDecoder = new TextDecoder();
            }
            return textDecoder.decode(this.buffer);
        }
    }
    slice(start, end) {
        // IMPORTANT: use subarray instead of slice because TypedArray#slice
        // creates shallow copy and NodeBuffer#slice doesn't. The use of subarray
        // ensures the same, performance, behaviour.
        return new VSBuffer(this.buffer.subarray(start, end));
    }
    set(array, offset) {
        if (array instanceof VSBuffer) {
            this.buffer.set(array.buffer, offset);
        }
        else if (array instanceof Uint8Array) {
            this.buffer.set(array, offset);
        }
        else if (array instanceof ArrayBuffer) {
            this.buffer.set(new Uint8Array(array), offset);
        }
        else if (ArrayBuffer.isView(array)) {
            this.buffer.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offset);
        }
        else {
            throw new Error(`Unknown argument 'array'`);
        }
    }
    readUInt32BE(offset) {
        return readUInt32BE(this.buffer, offset);
    }
    writeUInt32BE(value, offset) {
        writeUInt32BE(this.buffer, value, offset);
    }
    readUInt32LE(offset) {
        return readUInt32LE(this.buffer, offset);
    }
    writeUInt32LE(value, offset) {
        writeUInt32LE(this.buffer, value, offset);
    }
    readUInt8(offset) {
        return readUInt8(this.buffer, offset);
    }
    writeUInt8(value, offset) {
        writeUInt8(this.buffer, value, offset);
    }
    indexOf(subarray, offset = 0) {
        return binaryIndexOf(this.buffer, subarray instanceof VSBuffer ? subarray.buffer : subarray, offset);
    }
    equals(other) {
        if (this === other) {
            return true;
        }
        if (this.byteLength !== other.byteLength) {
            return false;
        }
        return this.buffer.every((value, index) => value === other.buffer[index]);
    }
}
/**
 * Like String.indexOf, but works on Uint8Arrays.
 * Uses the boyer-moore-horspool algorithm to be reasonably speedy.
 */
export function binaryIndexOf(haystack, needle, offset = 0) {
    const needleLen = needle.byteLength;
    const haystackLen = haystack.byteLength;
    if (needleLen === 0) {
        return 0;
    }
    if (needleLen === 1) {
        return haystack.indexOf(needle[0]);
    }
    if (needleLen > haystackLen - offset) {
        return -1;
    }
    // find index of the subarray using boyer-moore-horspool algorithm
    const table = indexOfTable.value;
    table.fill(needle.length);
    for (let i = 0; i < needle.length; i++) {
        table[needle[i]] = needle.length - i - 1;
    }
    let i = offset + needle.length - 1;
    let j = i;
    let result = -1;
    while (i < haystackLen) {
        if (haystack[i] === needle[j]) {
            if (j === 0) {
                result = i;
                break;
            }
            i--;
            j--;
        }
        else {
            i += Math.max(needle.length - j, table[haystack[i]]);
            j = needle.length - 1;
        }
    }
    return result;
}
export function readUInt16LE(source, offset) {
    return (((source[offset + 0] << 0) >>> 0) |
        ((source[offset + 1] << 8) >>> 0));
}
export function writeUInt16LE(destination, value, offset) {
    destination[offset + 0] = (value & 0b11111111);
    value = value >>> 8;
    destination[offset + 1] = (value & 0b11111111);
}
export function readUInt32BE(source, offset) {
    return (source[offset] * 2 ** 24
        + source[offset + 1] * 2 ** 16
        + source[offset + 2] * 2 ** 8
        + source[offset + 3]);
}
export function writeUInt32BE(destination, value, offset) {
    destination[offset + 3] = value;
    value = value >>> 8;
    destination[offset + 2] = value;
    value = value >>> 8;
    destination[offset + 1] = value;
    value = value >>> 8;
    destination[offset] = value;
}
export function readUInt32LE(source, offset) {
    return (((source[offset + 0] << 0) >>> 0) |
        ((source[offset + 1] << 8) >>> 0) |
        ((source[offset + 2] << 16) >>> 0) |
        ((source[offset + 3] << 24) >>> 0));
}
export function writeUInt32LE(destination, value, offset) {
    destination[offset + 0] = (value & 0b11111111);
    value = value >>> 8;
    destination[offset + 1] = (value & 0b11111111);
    value = value >>> 8;
    destination[offset + 2] = (value & 0b11111111);
    value = value >>> 8;
    destination[offset + 3] = (value & 0b11111111);
}
export function readUInt8(source, offset) {
    return source[offset];
}
export function writeUInt8(destination, value, offset) {
    destination[offset] = value;
}
export function readableToBuffer(readable) {
    return streams.consumeReadable(readable, chunks => VSBuffer.concat(chunks));
}
export function bufferToReadable(buffer) {
    return streams.toReadable(buffer);
}
export function streamToBuffer(stream) {
    return streams.consumeStream(stream, chunks => VSBuffer.concat(chunks));
}
export async function bufferedStreamToBuffer(bufferedStream) {
    if (bufferedStream.ended) {
        return VSBuffer.concat(bufferedStream.buffer);
    }
    return VSBuffer.concat([
        // Include already read chunks...
        ...bufferedStream.buffer,
        // ...and all additional chunks
        await streamToBuffer(bufferedStream.stream)
    ]);
}
export function bufferToStream(buffer) {
    return streams.toStream(buffer, chunks => VSBuffer.concat(chunks));
}
export function streamToBufferReadableStream(stream) {
    return streams.transform(stream, { data: data => typeof data === 'string' ? VSBuffer.fromString(data) : VSBuffer.wrap(data) }, chunks => VSBuffer.concat(chunks));
}
export function newWriteableBufferStream(options) {
    return streams.newWriteableStream(chunks => VSBuffer.concat(chunks), options);
}
export function prefixedBufferReadable(prefix, readable) {
    return streams.prefixedReadable(prefix, readable, chunks => VSBuffer.concat(chunks));
}
export function prefixedBufferStream(prefix, stream) {
    return streams.prefixedStream(prefix, stream, chunks => VSBuffer.concat(chunks));
}
/** Decodes base64 to a uint8 array. URL-encoded and unpadded base64 is allowed. */
export function decodeBase64(encoded) {
    let building = 0;
    let remainder = 0;
    let bufi = 0;
    // The simpler way to do this is `Uint8Array.from(atob(str), c => c.charCodeAt(0))`,
    // but that's about 10-20x slower than this function in current Chromium versions.
    const buffer = new Uint8Array(Math.floor(encoded.length / 4 * 3));
    const append = (value) => {
        switch (remainder) {
            case 3:
                buffer[bufi++] = building | value;
                remainder = 0;
                break;
            case 2:
                buffer[bufi++] = building | (value >>> 2);
                building = value << 6;
                remainder = 3;
                break;
            case 1:
                buffer[bufi++] = building | (value >>> 4);
                building = value << 4;
                remainder = 2;
                break;
            default:
                building = value << 2;
                remainder = 1;
        }
    };
    for (let i = 0; i < encoded.length; i++) {
        const code = encoded.charCodeAt(i);
        // See https://datatracker.ietf.org/doc/html/rfc4648#section-4
        // This branchy code is about 3x faster than an indexOf on a base64 char string.
        if (code >= 65 && code <= 90) {
            append(code - 65); // A-Z starts ranges from char code 65 to 90
        }
        else if (code >= 97 && code <= 122) {
            append(code - 97 + 26); // a-z starts ranges from char code 97 to 122, starting at byte 26
        }
        else if (code >= 48 && code <= 57) {
            append(code - 48 + 52); // 0-9 starts ranges from char code 48 to 58, starting at byte 52
        }
        else if (code === 43 || code === 45) {
            append(62); // "+" or "-" for URLS
        }
        else if (code === 47 || code === 95) {
            append(63); // "/" or "_" for URLS
        }
        else if (code === 61) {
            break; // "="
        }
        else {
            throw new SyntaxError(`Unexpected base64 character ${encoded[i]}`);
        }
    }
    const unpadded = bufi;
    while (remainder > 0) {
        append(0);
    }
    // slice is needed to account for overestimation due to padding
    return VSBuffer.wrap(buffer).slice(0, unpadded);
}
const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64UrlSafeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** Encodes a buffer to a base64 string. */
export function encodeBase64({ buffer }, padded = true, urlSafe = false) {
    const dictionary = urlSafe ? base64UrlSafeAlphabet : base64Alphabet;
    let output = '';
    const remainder = buffer.byteLength % 3;
    let i = 0;
    for (; i < buffer.byteLength - remainder; i += 3) {
        const a = buffer[i + 0];
        const b = buffer[i + 1];
        const c = buffer[i + 2];
        output += dictionary[a >>> 2];
        output += dictionary[(a << 4 | b >>> 4) & 0b111111];
        output += dictionary[(b << 2 | c >>> 6) & 0b111111];
        output += dictionary[c & 0b111111];
    }
    if (remainder === 1) {
        const a = buffer[i + 0];
        output += dictionary[a >>> 2];
        output += dictionary[(a << 4) & 0b111111];
        if (padded) {
            output += '==';
        }
    }
    else if (remainder === 2) {
        const a = buffer[i + 0];
        const b = buffer[i + 1];
        output += dictionary[a >>> 2];
        output += dictionary[(a << 4 | b >>> 4) & 0b111111];
        output += dictionary[(b << 2) & 0b111111];
        if (padded) {
            output += '=';
        }
    }
    return output;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2J1ZmZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxPQUFPLE1BQU0sYUFBYSxDQUFDO0FBSXZDLE1BQU0sU0FBUyxHQUFHLENBQUMsT0FBTyxNQUFNLEtBQUssV0FBVyxDQUFDLENBQUM7QUFDbEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUV6RCxJQUFJLFdBQStCLENBQUM7QUFDcEMsSUFBSSxXQUErQixDQUFDO0FBRXBDLE1BQU0sT0FBTyxRQUFRO0lBRXBCOzs7T0FHRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBa0I7UUFDOUIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBa0I7UUFDN0IsSUFBSSxTQUFTLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzdDLDBIQUEwSDtZQUMxSCx3RkFBd0Y7WUFDeEYsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFD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