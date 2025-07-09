/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import * as platform from '../../../base/common/platform.js';
import * as buffer from '../../../base/common/buffer.js';
let _utf16LE_TextDecoder;
function getUTF16LE_TextDecoder() {
    if (!_utf16LE_TextDecoder) {
        _utf16LE_TextDecoder = new TextDecoder('UTF-16LE');
    }
    return _utf16LE_TextDecoder;
}
let _utf16BE_TextDecoder;
function getUTF16BE_TextDecoder() {
    if (!_utf16BE_TextDecoder) {
        _utf16BE_TextDecoder = new TextDecoder('UTF-16BE');
    }
    return _utf16BE_TextDecoder;
}
let _platformTextDecoder;
export function getPlatformTextDecoder() {
    if (!_platformTextDecoder) {
        _platformTextDecoder = platform.isLittleEndian() ? getUTF16LE_TextDecoder() : getUTF16BE_TextDecoder();
    }
    return _platformTextDecoder;
}
export function decodeUTF16LE(source, offset, len) {
    const view = new Uint16Array(source.buffer, offset, len);
    if (len > 0 && (view[0] === 0xFEFF || view[0] === 0xFFFE)) {
        // UTF16 sometimes starts with a BOM https://de.wikipedia.org/wiki/Byte_Order_Mark
        // It looks like TextDecoder.decode will eat up a leading BOM (0xFEFF or 0xFFFE)
        // We don't want that behavior because we know the string is UTF16LE and the BOM should be maintained
        // So we use the manual decoder
        return compatDecodeUTF16LE(source, offset, len);
    }
    return getUTF16LE_TextDecoder().decode(view);
}
function compatDecodeUTF16LE(source, offset, len) {
    const result = [];
    let resultLen = 0;
    for (let i = 0; i < len; i++) {
        const charCode = buffer.readUInt16LE(source, offset);
        offset += 2;
        result[resultLen++] = String.fromCharCode(charCode);
    }
    return result.join('');
}
export class StringBuilder {
    constructor(capacity) {
        this._capacity = capacity | 0;
        this._buffer = new Uint16Array(this._capacity);
        this._completedStrings = null;
        this._bufferLength = 0;
    }
    reset() {
        this._completedStrings = null;
        this._bufferLength = 0;
    }
    build() {
        if (this._completedStrings !== null) {
            this._flushBuffer();
            return this._completedStrings.join('');
        }
        return this._buildBuffer();
    }
    _buildBuffer() {
        if (this._bufferLength === 0) {
            return '';
        }
        const view = new Uint16Array(this._buffer.buffer, 0, this._bufferLength);
        return getPlatformTextDecoder().decode(view);
    }
    _flushBuffer() {
        const bufferString = this._buildBuffer();
        this._bufferLength = 0;
        if (this._completedStrings === null) {
            this._completedStrings = [bufferString];
        }
        else {
            this._completedStrings[this._completedStrings.length] = bufferString;
        }
    }
    /**
     * Append a char code (<2^16)
     */
    appendCharCode(charCode) {
        const remainingSpace = this._capacity - this._bufferLength;
        if (remainingSpace <= 1) {
            if (remainingSpace === 0 || strings.isHighSurrogate(charCode)) {
                this._flushBuffer();
            }
        }
        this._buffer[this._bufferLength++] = charCode;
    }
    /**
     * Append an ASCII char code (<2^8)
     */
    appendASCIICharCode(charCode) {
        if (this._bufferLength === this._capacity) {
            // buffer is full
            this._flushBuffer();
        }
        this._buffer[this._bufferLength++] = charCode;
    }
    appendString(str) {
        const strLen = str.length;
        if (this._bufferLength + strLen >= this._capacity) {
            // This string does not fit in the remaining buffer space
            this._flushBuffer();
            this._completedStrings[this._completedStrings.length] = str;
            return;
        }
        for (let i = 0; i < strLen; i++) {
            this._buffer[this._bufferLength++] = str.charCodeAt(i);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5nQnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvc3RyaW5nQnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RCxJQUFJLG9CQUF3QyxDQUFDO0FBQzdDLFNBQVMsc0JBQXNCO0lBQzlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzNCLG9CQUFvQixHQUFHLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFDRCxPQUFPLG9CQUFvQixDQUFDO0FBQzdCLENBQUM7QUFFRCxJQUFJLG9CQUF3QyxDQUFDO0FBQzdDLFNBQVMsc0JBQXNCO0lBQzlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzNCLG9CQUFvQixHQUFHLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFDRCxPQUFPLG9CQUFvQixDQUFDO0FBQzdCLENBQUM7QUFFRCxJQUFJLG9CQUF3QyxDQUFDO0FBQzdDLE1BQU0sVUFBVSxzQkFBc0I7SUFDckMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDM0Isb0JBQW9CLEdBQUcsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO0lBQ3hHLENBQUM7SUFDRCxPQUFPLG9CQUFvQixDQUFDO0FBQzdCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLE1B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