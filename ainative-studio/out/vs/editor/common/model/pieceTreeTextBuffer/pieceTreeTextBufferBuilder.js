/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { StringBuffer, createLineStarts, createLineStartsFast } from './pieceTreeBase.js';
import { PieceTreeTextBuffer } from './pieceTreeTextBuffer.js';
class PieceTreeTextBufferFactory {
    constructor(_chunks, _bom, _cr, _lf, _crlf, _containsRTL, _containsUnusualLineTerminators, _isBasicASCII, _normalizeEOL) {
        this._chunks = _chunks;
        this._bom = _bom;
        this._cr = _cr;
        this._lf = _lf;
        this._crlf = _crlf;
        this._containsRTL = _containsRTL;
        this._containsUnusualLineTerminators = _containsUnusualLineTerminators;
        this._isBasicASCII = _isBasicASCII;
        this._normalizeEOL = _normalizeEOL;
    }
    _getEOL(defaultEOL) {
        const totalEOLCount = this._cr + this._lf + this._crlf;
        const totalCRCount = this._cr + this._crlf;
        if (totalEOLCount === 0) {
            // This is an empty file or a file with precisely one line
            return (defaultEOL === 1 /* DefaultEndOfLine.LF */ ? '\n' : '\r\n');
        }
        if (totalCRCount > totalEOLCount / 2) {
            // More than half of the file contains \r\n ending lines
            return '\r\n';
        }
        // At least one line more ends in \n
        return '\n';
    }
    create(defaultEOL) {
        const eol = this._getEOL(defaultEOL);
        const chunks = this._chunks;
        if (this._normalizeEOL &&
            ((eol === '\r\n' && (this._cr > 0 || this._lf > 0))
                || (eol === '\n' && (this._cr > 0 || this._crlf > 0)))) {
            // Normalize pieces
            for (let i = 0, len = chunks.length; i < len; i++) {
                const str = chunks[i].buffer.replace(/\r\n|\r|\n/g, eol);
                const newLineStart = createLineStartsFast(str);
                chunks[i] = new StringBuffer(str, newLineStart);
            }
        }
        const textBuffer = new PieceTreeTextBuffer(chunks, this._bom, eol, this._containsRTL, this._containsUnusualLineTerminators, this._isBasicASCII, this._normalizeEOL);
        return { textBuffer: textBuffer, disposable: textBuffer };
    }
    getFirstLineText(lengthLimit) {
        return this._chunks[0].buffer.substr(0, lengthLimit).split(/\r\n|\r|\n/)[0];
    }
}
export class PieceTreeTextBufferBuilder {
    constructor() {
        this.chunks = [];
        this.BOM = '';
        this._hasPreviousChar = false;
        this._previousChar = 0;
        this._tmpLineStarts = [];
        this.cr = 0;
        this.lf = 0;
        this.crlf = 0;
        this.containsRTL = false;
        this.containsUnusualLineTerminators = false;
        this.isBasicASCII = true;
    }
    acceptChunk(chunk) {
        if (chunk.length === 0) {
            return;
        }
        if (this.chunks.length === 0) {
            if (strings.startsWithUTF8BOM(chunk)) {
                this.BOM = strings.UTF8_BOM_CHARACTER;
                chunk = chunk.substr(1);
            }
        }
        const lastChar = chunk.charCodeAt(chunk.length - 1);
        if (lastChar === 13 /* CharCode.CarriageReturn */ || (lastChar >= 0xD800 && lastChar <= 0xDBFF)) {
            // last character is \r or a high surrogate => keep it back
            this._acceptChunk1(chunk.substr(0, chunk.length - 1), false);
            this._hasPreviousChar = true;
            this._previousChar = lastChar;
        }
        else {
            this._acceptChunk1(chunk, false);
            this._hasPreviousChar = false;
            this._previousChar = lastChar;
        }
    }
    _acceptChunk1(chunk, allowEmptyStrings) {
        if (!allowEmptyStrings && chunk.length === 0) {
            // Nothing to do
            return;
        }
        if (this._hasPreviousChar) {
            this._acceptChunk2(String.fromCharCode(this._previousChar) + chunk);
        }
        else {
            this._acceptChunk2(chunk);
        }
    }
    _acceptChunk2(chunk) {
        const lineStarts = createLineStarts(this._tmpLineStarts, chunk);
        this.chunks.push(new StringBuffer(chunk, lineStarts.lineStarts));
        this.cr += lineStarts.cr;
        this.lf += lineStarts.lf;
        this.crlf += lineStarts.crlf;
        if (!lineStarts.isBasicASCII) {
            // this chunk contains non basic ASCII characters
            this.isBasicASCII = false;
            if (!this.containsRTL) {
                this.containsRTL = strings.containsRTL(chunk);
            }
            if (!this.containsUnusualLineTerminators) {
                this.containsUnusualLineTerminators = strings.containsUnusualLineTerminators(chunk);
            }
        }
    }
    finish(normalizeEOL = true) {
        this._finish();
        return new PieceTreeTextBufferFactory(this.chunks, this.BOM, this.cr, this.lf, this.crlf, this.containsRTL, this.containsUnusualLineTerminators, this.isBasicASCII, normalizeEOL);
    }
    _finish() {
        if (this.chunks.length === 0) {
            this._acceptChunk1('', true);
        }
        if (this._hasPreviousChar) {
            this._hasPreviousChar = false;
            // recreate last chunk
            const lastChunk = this.chunks[this.chunks.length - 1];
            lastChunk.buffer += String.fromCharCode(this._previousChar);
            const newLineStarts = createLineStartsFast(lastChunk.buffer);
            lastChunk.lineStarts = newLineStarts;
            if (this._previousChar === 13 /* CharCode.CarriageReturn */) {
                this.cr++;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGllY2VUcmVlVGV4dEJ1ZmZlckJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9waWVjZVRyZWVUZXh0QnVmZmVyL3BpZWNlVHJlZVRleHRCdWZmZXJCdWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFFOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9ELE1BQU0sMEJBQTBCO0lBRS9CLFlBQ2tCLE9BQXVCLEVBQ3ZCLElBQVksRUFDWixHQUFXLEVBQ1gsR0FBVyxFQUNYLEtBQWEsRUFDYixZQUFxQixFQUNyQiwrQkFBd0MsRUFDeEMsYUFBc0IsRUFDdEIsYUFBc0I7UUFSdEIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFDdkIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGlCQUFZLEdBQVosWUFBWSxDQUFTO1FBQ3JCLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBUztRQUN4QyxrQkFBYSxHQUFiLGFBQWEsQ0FBUztRQUN0QixrQkFBYSxHQUFiLGFBQWEsQ0FBUztJQUNwQyxDQUFDO0lBRUcsT0FBTyxDQUFDLFVBQTRCO1FBQzNDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3ZELE1BQU0sWUFBWSxH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