/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../../core/position.js';
import { Range } from '../../core/range.js';
import { FindMatch } from '../../model.js';
import { SENTINEL, TreeNode, fixInsert, leftest, rbDelete, righttest, updateTreeMetadata } from './rbTreeBase.js';
import { Searcher, createFindMatch, isValidMatch } from '../textModelSearch.js';
// const lfRegex = new RegExp(/\r\n|\r|\n/g);
const AverageBufferSize = 65535;
function createUintArray(arr) {
    let r;
    if (arr[arr.length - 1] < 65536) {
        r = new Uint16Array(arr.length);
    }
    else {
        r = new Uint32Array(arr.length);
    }
    r.set(arr, 0);
    return r;
}
class LineStarts {
    constructor(lineStarts, cr, lf, crlf, isBasicASCII) {
        this.lineStarts = lineStarts;
        this.cr = cr;
        this.lf = lf;
        this.crlf = crlf;
        this.isBasicASCII = isBasicASCII;
    }
}
export function createLineStartsFast(str, readonly = true) {
    const r = [0];
    let rLength = 1;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        if (chr === 13 /* CharCode.CarriageReturn */) {
            if (i + 1 < len && str.charCodeAt(i + 1) === 10 /* CharCode.LineFeed */) {
                // \r\n... case
                r[rLength++] = i + 2;
                i++; // skip \n
            }
            else {
                // \r... case
                r[rLength++] = i + 1;
            }
        }
        else if (chr === 10 /* CharCode.LineFeed */) {
            r[rLength++] = i + 1;
        }
    }
    if (readonly) {
        return createUintArray(r);
    }
    else {
        return r;
    }
}
export function createLineStarts(r, str) {
    r.length = 0;
    r[0] = 0;
    let rLength = 1;
    let cr = 0, lf = 0, crlf = 0;
    let isBasicASCII = true;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        if (chr === 13 /* CharCode.CarriageReturn */) {
            if (i + 1 < len && str.charCodeAt(i + 1) === 10 /* CharCode.LineFeed */) {
                // \r\n... case
                crlf++;
                r[rLength++] = i + 2;
                i++; // skip \n
            }
            else {
                cr++;
                // \r... case
                r[rLength++] = i + 1;
            }
        }
        else if (chr === 10 /* CharCode.LineFeed */) {
            lf++;
            r[rLength++] = i + 1;
        }
        else {
            if (isBasicASCII) {
                if (chr !== 9 /* CharCode.Tab */ && (chr < 32 || chr > 126)) {
                    isBasicASCII = false;
                }
            }
        }
    }
    const result = new LineStarts(createUintArray(r), cr, lf, crlf, isBasicASCII);
    r.length = 0;
    return result;
}
export class Piece {
    constructor(bufferIndex, start, end, lineFeedCnt, length) {
        this.bufferIndex = bufferIndex;
        this.start = start;
        this.end = end;
        this.lineFeedCnt = lineFeedCnt;
        this.length = length;
    }
}
export class StringBuffer {
    constructor(buffer, lineStarts) {
        this.buffer = buffer;
        this.lineStarts = lineStarts;
    }
}
/**
 * Readonly snapshot for piece tree.
 * In a real multiple thread environment, to make snapshot reading always work correctly, we need to
 * 1. Make TreeNode.piece immutable, then reading and writing can run in parallel.
 * 2. TreeNode/Buffers normalization should not happen during snapshot reading.
 */
class PieceTreeSnapshot {
    constructor(tree, BOM) {
        this._pieces = [];
        this._tree = tree;
        this._BOM = BOM;
        this._index = 0;
        if (tree.root !== SENTINEL) {
            tree.iterate(tree.root, node => {
                if (node !== SENTINEL) {
                    this._pieces.push(node.piece);
                }
                return true;
            });
        }
    }
    read() {
        if (this._pieces.length === 0) {
            if (this._index === 0) {
                this._index++;
                return this._BOM;
            }
            else {
                return null;
            }
        }
        if (this._index > this._pieces.length - 1) {
            return null;
        }
        if (this._index === 0) {
            return this._BOM + this._tree.getPieceContent(this._pieces[this._index++]);
        }
        return this._tree.getPieceContent(this._pieces[this._index++]);
    }
}
class PieceTreeSearchCache {
    constructor(limit) {
        this._limit = limit;
        this._cache = [];
    }
    get(offset) {
        for (let i = this._cache.length - 1; i >= 0; i--) {
            const nodePos = this._cache[i];
            if (nodePos.nodeStartOffset <= offset && nodePos.nodeStartOffset + nodePos.node.piece.length >= offset) {
                return nodePos;
            }
        }
        return null;
    }
    get2(lineNumber) {
        for (let i = this._cache.length - 1; i >= 0; i--) {
            const nodePos = this._cache[i];
            if (nodePos.nodeStartLineNumber && nodePos.nodeStartLineNumber < lineNumber && nodePos.nodeStartLineNumber + nodePos.node.piece.lineFeedCnt >= lineNumber) {
                return nodePos;
            }
        }
        return null;
    }
    set(nodePosition) {
        if (this._cache.length >= this._limit) {
            this._cache.shift();
        }
        this._cache.push(nodePosition);
    }
    validate(offset) {
        let hasInvalidVal = false;
        const tmp = this._cache;
        for (let i = 0; i < tmp.length; i++) {
            const nodePos = tmp[i];
            if (nodePos.node.parent === null || nodePos.nodeStartOffset >= offset) {
                tmp[i] = null;
                hasInvalidVal = true;
                continue;
            }
        }
        if (hasInvalidVal) {
            const newArr = [];
            for (const entry of tmp) {
                if (entry !== null) {
                    newArr.push(entry);
                }
            }
            this._cache = newArr;
        }
    }
}
export class PieceTreeBase {
    constructor(chunks, eol, eolNormalized) {
        this.create(chunks, eol, eolNormalized);
    }
    create(chunks, eol, eolNormalized) {
        this._buffers = [
            new StringBuffer('', [0])
        ];
        this._lastChangeBufferPos = { line: 0, column: 0 };
        this.root = SENTINEL;
        this._lineCnt = 1;
        this._length = 0;
        this._EOL = eol;
        this._EOLLength = eol.length;
        this._EOLNormalized = eolNormalized;
        let lastNode = null;
        for (let i = 0, len = chunks.length; i < len; i++) {
            if (chunks[i].buffer.length > 0) {
                if (!chunks[i].lineStarts) {
                    chunks[i].lineStarts = createLineStartsFast(chunks[i].buffer);
                }
                const piece = new Piece(i + 1, { line: 0, column: 0 }, { line: chunks[i].lineStarts.length - 1, column: chunks[i].buffer.length - chunks[i].lineStarts[chunks[i].lineStarts.length - 1] }, chunks[i].lineStarts.length - 1, chunks[i].buffer.length);
                this._buffers.push(chunks[i]);
                lastNode = this.rbInsertRight(lastNode, piece);
            }
        }
        this._searchCache = new PieceTreeSearchCache(1);
        this._lastVisitedLine = { lineNumber: 0, value: '' };
        this.computeBufferMetadata();
    }
    normalizeEOL(eol) {
        const averageBufferSize = AverageBufferSize;
        const min = averageBufferSize - Math.floor(averageBufferSize / 3);
        const max = min * 2;
        let tempChunk = '';
        let tempChunkLen = 0;
        const chunks = [];
        this.iterate(this.root, node => {
            const str = this.getNodeContent(node);
            const len = str.length;
            if (tempChunkLen <= min || tempChunkLen + len < max) {
                tempChunk += str;
                tempChunkLen += len;
                return true;
            }
            // flush anyways
            const text = tempChunk.replace(/\r\n|\r|\n/g, eol);
            chunks.push(new StringBuffer(text, createLineStartsFast(text)));
            tempChunk = str;
            tempChunkLen = len;
            return true;
        });
        if (tempChunkLen > 0) {
            const text = tempChunk.replace(/\r\n|\r|\n/g, eol);
            chunks.push(new StringBuffer(text, createLineStartsFast(text)));
        }
        this.create(chunks, eol, true);
    }
    // #region Buffer API
    getEOL() {
        return this._EOL;
    }
    setEOL(newEOL) {
        this._EOL = newEOL;
        this._EOLLength = this._EOL.length;
        this.normalizeEOL(newEOL);
    }
    createSnapshot(BOM) {
        return new PieceTreeSnapshot(this, BOM);
    }
    equal(other) {
        if (this.getLength() !== other.getLength()) {
            return false;
        }
        if (this.getLineCount() !== other.getLineCount()) {
            return false;
        }
        let offset = 0;
        const ret = this.iterate(this.root, node => {
            if (node === SENTINEL) {
                return true;
            }
            const str = this.getNodeContent(node);
            const len = str.length;
            const startPosition = other.nodeAt(offset);
            const endPosition = other.nodeAt(offset + len);
            const val = other.getValueInRange2(startPosition, endPosition);
            offset += len;
            return str === val;
        });
        return ret;
    }
    getOffsetAt(lineNumber, column) {
        let leftLen = 0; // inorder
        let x = this.root;
        while (x !== SENTINEL) {
            if (x.left !== SENTINEL && x.lf_left + 1 >= lineNumber) {
                x = x.left;
            }
            else if (x.lf_left + x.piece.lineFeedCnt + 1 >= lineNumber) {
                leftLen += x.size_left;
                // lineNumber >= 2
                const accumualtedValInCurrentIndex = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                return leftLen += accumualtedValInCurrentIndex + column - 1;
            }
            else {
                lineNumber -= x.lf_left + x.piece.lineFeedCnt;
                leftLen += x.size_left + x.piece.length;
                x = x.right;
            }
        }
        return leftLen;
    }
    getPositionAt(offset) {
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        let x = this.root;
        let lfCnt = 0;
        const originalOffset = offset;
        while (x !== SENTINEL) {
            if (x.size_left !== 0 && x.size_left >= offset) {
                x = x.left;
            }
            else if (x.size_left + x.piece.length >= offset) {
                const out = this.getIndexOf(x, offset - x.size_left);
                lfCnt += x.lf_left + out.index;
                if (out.index === 0) {
                    const lineStartOffset = this.getOffsetAt(lfCnt + 1, 1);
                    const column = originalOffset - lineStartOffset;
                    return new Position(lfCnt + 1, column + 1);
                }
                return new Position(lfCnt + 1, out.remainder + 1);
            }
            else {
                offset -= x.size_left + x.piece.length;
                lfCnt += x.lf_left + x.piece.lineFeedCnt;
                if (x.right === SENTINEL) {
                    // last node
                    const lineStartOffset = this.getOffsetAt(lfCnt + 1, 1);
                    const column = originalOffset - offset - lineStartOffset;
                    return new Position(lfCnt + 1, column + 1);
                }
                else {
                    x = x.right;
                }
            }
        }
        return new Position(1, 1);
    }
    getValueInRange(range, eol) {
        if (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn) {
            return '';
        }
        const startPosition = this.nodeAt2(range.startLineNumber, range.startColumn);
        const endPosition = this.nodeAt2(range.endLineNumber, range.endColumn);
        const value = this.getValueInRange2(startPosition, endPosition);
        if (eol) {
            if (eol !== this._EOL || !this._EOLNormalized) {
                return value.replace(/\r\n|\r|\n/g, eol);
            }
            if (eol === this.getEOL() && this._EOLNormalized) {
                if (eol === '\r\n') {
                }
                return value;
            }
            return value.replace(/\r\n|\r|\n/g, eol);
        }
        return value;
    }
    getValueInRange2(startPosition, endPosition) {
        if (startPosition.node === endPosition.node) {
            const node = startPosition.node;
            const buffer = this._buffers[node.piece.bufferIndex].buffer;
            const startOffset = this.offsetInBuffer(node.piece.bufferIndex, node.piece.start);
            return buffer.substring(startOffset + startPosition.remainder, startOffset + endPosition.remainder);
        }
        let x = startPosition.node;
        const buffer = this._buffers[x.piece.bufferIndex].buffer;
        const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
        let ret = buffer.substring(startOffset + startPosition.remainder, startOffset + x.piece.length);
        x = x.next();
        while (x !== SENTINEL) {
            const buffer = this._buffers[x.piece.bufferIndex].buffer;
            const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
            if (x === endPosition.node) {
                ret += buffer.substring(startOffset, startOffset + endPosition.remainder);
                break;
            }
            else {
                ret += buffer.substr(startOffset, x.piece.length);
            }
            x = x.next();
        }
        return ret;
    }
    getLinesContent() {
        const lines = [];
        let linesLength = 0;
        let currentLine = '';
        let danglingCR = false;
        this.iterate(this.root, node => {
            if (node === SENTINEL) {
                return true;
            }
            const piece = node.piece;
            let pieceLength = piece.length;
            if (pieceLength === 0) {
                return true;
            }
            const buffer = this._buffers[piece.bufferIndex].buffer;
            const lineStarts = this._buffers[piece.bufferIndex].lineStarts;
            const pieceStartLine = piece.start.line;
            const pieceEndLine = piece.end.line;
            let pieceStartOffset = lineStarts[pieceStartLine] + piece.start.column;
            if (danglingCR) {
                if (buffer.charCodeAt(pieceStartOffset) === 10 /* CharCode.LineFeed */) {
                    // pretend the \n was in the previous piece..
                    pieceStartOffset++;
                    pieceLength--;
                }
                lines[linesLength++] = currentLine;
                currentLine = '';
                danglingCR = false;
                if (pieceLength === 0) {
                    return true;
                }
            }
            if (pieceStartLine === pieceEndLine) {
                // this piece has no new lines
                if (!this._EOLNormalized && buffer.charCodeAt(pieceStartOffset + pieceLength - 1) === 13 /* CharCode.CarriageReturn */) {
                    danglingCR = true;
                    currentLine += buffer.substr(pieceStartOffset, pieceLength - 1);
                }
                else {
                    currentLine += buffer.substr(pieceStartOffset, pieceLength);
                }
                return true;
            }
            // add the text before the first line start in this piece
            currentLine += (this._EOLNormalized
                ? buffer.substring(pieceStartOffset, Math.max(pieceStartOffset, lineStarts[pieceStartLine + 1] - this._EOLLength))
                : buffer.substring(pieceStartOffset, lineStarts[pieceStartLine + 1]).replace(/(\r\n|\r|\n)$/, ''));
            lines[linesLength++] = currentLine;
            for (let line = pieceStartLine + 1; line < pieceEndLine; line++) {
                currentLine = (this._EOLNormalized
                    ? buffer.substring(lineStarts[line], lineStarts[line + 1] - this._EOLLength)
                    : buffer.substring(lineStarts[line], lineStarts[line + 1]).replace(/(\r\n|\r|\n)$/, ''));
                lines[linesLength++] = currentLine;
            }
            if (!this._EOLNormalized && buffer.charCodeAt(lineStarts[pieceEndLine] + piece.end.column - 1) === 13 /* CharCode.CarriageReturn */) {
                danglingCR = true;
                if (piece.end.column === 0) {
                    // The last line ended with a \r, let's undo the push, it will be pushed by next iteration
                    linesLength--;
                }
                else {
                    currentLine = buffer.substr(lineStarts[pieceEndLine], piece.end.column - 1);
                }
            }
            else {
                currentLine = buffer.substr(lineStarts[pieceEndLine], piece.end.column);
            }
            return true;
        });
        if (danglingCR) {
            lines[linesLength++] = currentLine;
            currentLine = '';
        }
        lines[linesLength++] = currentLine;
        return lines;
    }
    getLength() {
        return this._length;
    }
    getLineCount() {
        return this._lineCnt;
    }
    getLineContent(lineNumber) {
        if (this._lastVisitedLine.lineNumber === lineNumber) {
            return this._lastVisitedLine.value;
        }
        this._lastVisitedLine.lineNumber = lineNumber;
        if (lineNumber === this._lineCnt) {
            this._lastVisitedLine.value = this.getLineRawContent(lineNumber);
        }
        else if (this._EOLNormalized) {
            this._lastVisitedLine.value = this.getLineRawContent(lineNumber, this._EOLLength);
        }
        else {
            this._lastVisitedLine.value = this.getLineRawContent(lineNumber).replace(/(\r\n|\r|\n)$/, '');
        }
        return this._lastVisitedLine.value;
    }
    _getCharCode(nodePos) {
        if (nodePos.remainder === nodePos.node.piece.length) {
            // the char we want to fetch is at the head of next node.
            const matchingNode = nodePos.node.next();
            if (!matchingNode) {
                return 0;
            }
            const buffer = this._buffers[matchingNode.piece.bufferIndex];
            const startOffset = this.offsetInBuffer(matchingNode.piece.bufferIndex, matchingNode.piece.start);
            return buffer.buffer.charCodeAt(startOffset);
        }
        else {
            const buffer = this._buffers[nodePos.node.piece.bufferIndex];
            const startOffset = this.offsetInBuffer(nodePos.node.piece.bufferIndex, nodePos.node.piece.start);
            const targetOffset = startOffset + nodePos.remainder;
            return buffer.buffer.charCodeAt(targetOffset);
        }
    }
    getLineCharCode(lineNumber, index) {
        const nodePos = this.nodeAt2(lineNumber, index + 1);
        return this._getCharCode(nodePos);
    }
    getLineLength(lineNumber) {
        if (lineNumber === this.getLineCount()) {
            const startOffset = this.getOffsetAt(lineNumber, 1);
            return this.getLength() - startOffset;
        }
        return this.getOffsetAt(lineNumber + 1, 1) - this.getOffsetAt(lineNumber, 1) - this._EOLLength;
    }
    getCharCode(offset) {
        const nodePos = this.nodeAt(offset);
        return this._getCharCode(nodePos);
    }
    getNearestChunk(offset) {
        const nodePos = this.nodeAt(offset);
        if (nodePos.remainder === nodePos.node.piece.length) {
            // the offset is at the head of next node.
            const matchingNode = nodePos.node.next();
            if (!matchingNode || matchingNode === SENTINEL) {
                return '';
            }
            const buffer = this._buffers[matchingNode.piece.bufferIndex];
            const startOffset = this.offsetInBuffer(matchingNode.piece.bufferIndex, matchingNode.piece.start);
            return buffer.buffer.substring(startOffset, startOffset + matchingNode.piece.length);
        }
        else {
            const buffer = this._buffers[nodePos.node.piece.bufferIndex];
            const startOffset = this.offsetInBuffer(nodePos.node.piece.bufferIndex, nodePos.node.piece.start);
            const targetOffset = startOffset + nodePos.remainder;
            const targetEnd = startOffset + nodePos.node.piece.length;
            return buffer.buffer.substring(targetOffset, targetEnd);
        }
    }
    findMatchesInNode(node, searcher, startLineNumber, startColumn, startCursor, endCursor, searchData, captureMatches, limitResultCount, resultLen, result) {
        const buffer = this._buffers[node.piece.bufferIndex];
        const startOffsetInBuffer = this.offsetInBuffer(node.piece.bufferIndex, node.piece.start);
        const start = this.offsetInBuffer(node.piece.bufferIndex, startCursor);
        const end = this.offsetInBuffer(node.piece.bufferIndex, endCursor);
        let m;
        // Reset regex to search from the beginning
        const ret = { line: 0, column: 0 };
        let searchText;
        let offsetInBuffer;
        if (searcher._wordSeparators) {
            searchText = buffer.buffer.substring(start, end);
            offsetInBuffer = (offset) => offset + start;
            searcher.reset(0);
        }
        else {
            searchText = buffer.buffer;
            offsetInBuffer = (offset) => offset;
            searcher.reset(start);
        }
        do {
            m = searcher.next(searchText);
            if (m) {
                if (offsetInBuffer(m.index) >= end) {
                    return resultLen;
                }
                this.positionInBuffer(node, offsetInBuffer(m.index) - startOffsetInBuffer, ret);
                const lineFeedCnt = this.getLineFeedCnt(node.piece.bufferIndex, startCursor, ret);
                const retStartColumn = ret.line === startCursor.line ? ret.column - startCursor.column + startColumn : ret.column + 1;
                const retEndColumn = retStartColumn + m[0].length;
                result[resultLen++] = createFindMatch(new Range(startLineNumber + lineFeedCnt, retStartColumn, startLineNumber + lineFeedCnt, retEndColumn), m, captureMatches);
                if (offsetInBuffer(m.index) + m[0].length >= end) {
                    return resultLen;
                }
                if (resultLen >= limitResultCount) {
                    return resultLen;
                }
            }
        } while (m);
        return resultLen;
    }
    findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount) {
        const result = [];
        let resultLen = 0;
        const searcher = new Searcher(searchData.wordSeparators, searchData.regex);
        let startPosition = this.nodeAt2(searchRange.startLineNumber, searchRange.startColumn);
        if (startPosition === null) {
            return [];
        }
        const endPosition = this.nodeAt2(searchRange.endLineNumber, searchRange.endColumn);
        if (endPosition === null) {
            return [];
        }
        let start = this.positionInBuffer(startPosition.node, startPosition.remainder);
        const end = this.positionInBuffer(endPosition.node, endPosition.remainder);
        if (startPosition.node === endPosition.node) {
            this.findMatchesInNode(startPosition.node, searcher, searchRange.startLineNumber, searchRange.startColumn, start, end, searchData, captureMatches, limitResultCount, resultLen, result);
            return result;
        }
        let startLineNumber = searchRange.startLineNumber;
        let currentNode = startPosition.node;
        while (currentNode !== endPosition.node) {
            const lineBreakCnt = this.getLineFeedCnt(currentNode.piece.bufferIndex, start, currentNode.piece.end);
            if (lineBreakCnt >= 1) {
                // last line break position
                const lineStarts = this._buffers[currentNode.piece.bufferIndex].lineStarts;
                const startOffsetInBuffer = this.offsetInBuffer(currentNode.piece.bufferIndex, currentNode.piece.start);
                const nextLineStartOffset = lineStarts[start.line + lineBreakCnt];
                const startColumn = startLineNumber === searchRange.startLineNumber ? searchRange.startColumn : 1;
                resultLen = this.findMatchesInNode(currentNode, searcher, startLineNumber, startColumn, start, this.positionInBuffer(currentNode, nextLineStartOffset - startOffsetInBuffer), searchData, captureMatches, limitResultCount, resultLen, result);
                if (resultLen >= limitResultCount) {
                    return result;
                }
                startLineNumber += lineBreakCnt;
            }
            const startColumn = startLineNumber === searchRange.startLineNumber ? searchRange.startColumn - 1 : 0;
            // search for the remaining content
            if (startLineNumber === searchRange.endLineNumber) {
                const text = this.getLineContent(startLineNumber).substring(startColumn, searchRange.endColumn - 1);
                resultLen = this._findMatchesInLine(searchData, searcher, text, searchRange.endLineNumber, startColumn, resultLen, result, captureMatches, limitResultCount);
                return result;
            }
            resultLen = this._findMatchesInLine(searchData, searcher, this.getLineContent(startLineNumber).substr(startColumn), startLineNumber, startColumn, resultLen, result, captureMatches, limitResultCount);
            if (resultLen >= limitResultCount) {
                return result;
            }
            startLineNumber++;
            startPosition = this.nodeAt2(startLineNumber, 1);
            currentNode = startPosition.node;
            start = this.positionInBuffer(startPosition.node, startPosition.remainder);
        }
        if (startLineNumber === searchRange.endLineNumber) {
            const startColumn = startLineNumber === searchRange.startLineNumber ? searchRange.startColumn - 1 : 0;
            const text = this.getLineContent(startLineNumber).substring(startColumn, searchRange.endColumn - 1);
            resultLen = this._findMatchesInLine(searchData, searcher, text, searchRange.endLineNumber, startColumn, resultLen, result, captureMatches, limitResultCount);
            return result;
        }
        const startColumn = startLineNumber === searchRange.startLineNumber ? searchRange.startColumn : 1;
        resultLen = this.findMatchesInNode(endPosition.node, searcher, startLineNumber, startColumn, start, end, searchData, captureMatches, limitResultCount, resultLen, result);
        return result;
    }
    _findMatchesInLine(searchData, searcher, text, lineNumber, deltaOffset, resultLen, result, captureMatches, limitResultCount) {
        const wordSeparators = searchData.wordSeparators;
        if (!captureMatches && searchData.simpleSearch) {
            const searchString = searchData.simpleSearch;
            const searchStringLen = searchString.length;
            const textLength = text.length;
            let lastMatchIndex = -searchStringLen;
            while ((lastMatchIndex = text.indexOf(searchString, lastMatchIndex + searchStringLen)) !== -1) {
                if (!wordSeparators || isValidMatch(wordSeparators, text, textLength, lastMatchIndex, searchStringLen)) {
                    result[resultLen++] = new FindMatch(new Range(lineNumber, lastMatchIndex + 1 + deltaOffset, lineNumber, lastMatchIndex + 1 + searchStringLen + deltaOffset), null);
                    if (resultLen >= limitResultCount) {
                        return resultLen;
                    }
                }
            }
            return resultLen;
        }
        let m;
        // Reset regex to search from the beginning
        searcher.reset(0);
        do {
            m = searcher.next(text);
            if (m) {
                result[resultLen++] = createFindMatch(new Range(lineNumber, m.index + 1 + deltaOffset, lineNumber, m.index + 1 + m[0].length + deltaOffset), m, captureMatches);
                if (resultLen >= limitResultCount) {
                    return resultLen;
                }
            }
        } while (m);
        return resultLen;
    }
    // #endregion
    // #region Piece Table
    insert(offset, value, eolNormalized = false) {
        this._EOLNormalized = this._EOLNormalized && eolNormalized;
        this._lastVisitedLine.lineNumber = 0;
        this._lastVisitedLine.value = '';
        if (this.root !== SENTINEL) {
            const { node, remainder, nodeStartOffset } = this.nodeAt(offset);
            const piece = node.piece;
            const bufferIndex = piece.bufferIndex;
            const insertPosInBuffer = this.positionInBuffer(node, remainder);
            if (node.piece.bufferIndex === 0 &&
                piece.end.line === this._lastChangeBufferPos.line &&
                piece.end.column === this._lastChangeBufferPos.column &&
                (nodeStartOffset + piece.length === offset) &&
                value.length < AverageBufferSize) {
                // changed buffer
                this.appendToNode(node, value);
                this.computeBufferMetadata();
                return;
            }
            if (nodeStartOffset === offset) {
                this.insertContentToNodeLeft(value, node);
                this._searchCache.validate(offset);
            }
            else if (nodeStartOffset + node.piece.length > offset) {
                // we are inserting into the middle of a node.
                const nodesToDel = [];
                let newRightPiece = new Piece(piece.bufferIndex, insertPosInBuffer, piece.end, this.getLineFeedCnt(piece.bufferIndex, insertPosInBuffer, piece.end), this.offsetInBuffer(bufferIndex, piece.end) - this.offsetInBuffer(bufferIndex, insertPosInBuffer));
                if (this.shouldCheckCRLF() && this.endWithCR(value)) {
                    const headOfRight = this.nodeCharCodeAt(node, remainder);
                    if (headOfRight === 10 /** \n */) {
                        const newStart = { line: newRightPiece.start.line + 1, column: 0 };
                        newRightPiece = new Piece(newRightPiece.bufferIndex, newStart, newRightPiece.end, this.getLineFeedCnt(newRightPiece.bufferIndex, newStart, newRightPiece.end), newRightPiece.length - 1);
                        value += '\n';
                    }
                }
                // reuse node for content before insertion point.
                if (this.shouldCheckCRLF() && this.startWithLF(value)) {
                    const tailOfLeft = this.nodeCharCodeAt(node, remainder - 1);
                    if (tailOfLeft === 13 /** \r */) {
                        const previousPos = this.positionInBuffer(node, remainder - 1);
                        this.deleteNodeTail(node, previousPos);
                        value = '\r' + value;
                        if (node.piece.length === 0) {
                            nodesToDel.push(node);
                        }
                    }
                    else {
                        this.deleteNodeTail(node, insertPosInBuffer);
                    }
                }
                else {
                    this.deleteNodeTail(node, insertPosInBuffer);
                }
                const newPieces = this.createNewPieces(value);
                if (newRightPiece.length > 0) {
                    this.rbInsertRight(node, newRightPiece);
                }
                let tmpNode = node;
                for (let k = 0; k < newPieces.length; k++) {
                    tmpNode = this.rbInsertRight(tmpNode, newPieces[k]);
                }
                this.deleteNodes(nodesToDel);
            }
            else {
                this.insertContentToNodeRight(value, node);
            }
        }
        else {
            // insert new node
            const pieces = this.createNewPieces(value);
            let node = this.rbInsertLeft(null, pieces[0]);
            for (let k = 1; k < pieces.length; k++) {
                node = this.rbInsertRight(node, pieces[k]);
            }
        }
        // todo, this is too brutal. Total line feed count should be updated the same way as lf_left.
        this.computeBufferMetadata();
    }
    delete(offset, cnt) {
        this._lastVisitedLine.lineNumber = 0;
        this._lastVisitedLine.value = '';
        if (cnt <= 0 || this.root === SENTINEL) {
            return;
        }
        const startPosition = this.nodeAt(offset);
        const endPosition = this.nodeAt(offset + cnt);
        const startNode = startPosition.node;
        const endNode = endPosition.node;
        if (startNode === endNode) {
            const startSplitPosInBuffer = this.positionInBuffer(startNode, startPosition.remainder);
            const endSplitPosInBuffer = this.positionInBuffer(startNode, endPosition.remainder);
            if (startPosition.nodeStartOffset === offset) {
                if (cnt === startNode.piece.length) { // delete node
                    const next = startNode.next();
                    rbDelete(this, startNode);
                    this.validateCRLFWithPrevNode(next);
                    this.computeBufferMetadata();
                    return;
                }
                this.deleteNodeHead(startNode, endSplitPosInBuffer);
                this._searchCache.validate(offset);
                this.validateCRLFWithPrevNode(startNode);
                this.computeBufferMetadata();
                return;
            }
            if (startPosition.nodeStartOffset + startNode.piece.length === offset + cnt) {
                this.deleteNodeTail(startNode, startSplitPosInBuffer);
                this.validateCRLFWithNextNode(startNode);
                this.computeBufferMetadata();
                return;
            }
            // delete content in the middle, this node will be splitted to nodes
            this.shrinkNode(startNode, startSplitPosInBuffer, endSplitPosInBuffer);
            this.computeBufferMetadata();
            return;
        }
        const nodesToDel = [];
        const startSplitPosInBuffer = this.positionInBuffer(startNode, startPosition.remainder);
        this.deleteNodeTail(startNode, startSplitPosInBuffer);
        this._searchCache.validate(offset);
        if (startNode.piece.length === 0) {
            nodesToDel.push(startNode);
        }
        // update last touched node
        const endSplitPosInBuffer = this.positionInBuffer(endNode, endPosition.remainder);
        this.deleteNodeHead(endNode, endSplitPosInBuffer);
        if (endNode.piece.length === 0) {
            nodesToDel.push(endNode);
        }
        // delete nodes in between
        const secondNode = startNode.next();
        for (let node = secondNode; node !== SENTINEL && node !== endNode; node = node.next()) {
            nodesToDel.push(node);
        }
        const prev = startNode.piece.length === 0 ? startNode.prev() : startNode;
        this.deleteNodes(nodesToDel);
        this.validateCRLFWithNextNode(prev);
        this.computeBufferMetadata();
    }
    insertContentToNodeLeft(value, node) {
        // we are inserting content to the beginning of node
        const nodesToDel = [];
        if (this.shouldCheckCRLF() && this.endWithCR(value) && this.startWithLF(node)) {
            // move `\n` to new node.
            const piece = node.piece;
            const newStart = { line: piece.start.line + 1, column: 0 };
            const nPiece = new Piece(piece.bufferIndex, newStart, piece.end, this.getLineFeedCnt(piece.bufferIndex, newStart, piece.end), piece.length - 1);
            node.piece = nPiece;
            value += '\n';
            updateTreeMetadata(this, node, -1, -1);
            if (node.piece.length === 0) {
                nodesToDel.push(node);
            }
        }
        const newPieces = this.createNewPieces(value);
        let newNode = this.rbInsertLeft(node, newPieces[newPieces.length - 1]);
        for (let k = newPieces.length - 2; k >= 0; k--) {
            newNode = this.rbInsertLeft(newNode, newPieces[k]);
        }
        this.validateCRLFWithPrevNode(newNode);
        this.deleteNodes(nodesToDel);
    }
    insertContentToNodeRight(value, node) {
        // we are inserting to the right of this node.
        if (this.adjustCarriageReturnFromNext(value, node)) {
            // move \n to the new node.
            value += '\n';
        }
        const newPieces = this.createNewPieces(value);
        const newNode = this.rbInsertRight(node, newPieces[0]);
        let tmpNode = newNode;
        for (let k = 1; k < newPieces.length; k++) {
            tmpNode = this.rbInsertRight(tmpNode, newPieces[k]);
        }
        this.validateCRLFWithPrevNode(newNode);
    }
    positionInBuffer(node, remainder, ret) {
        const piece = node.piece;
        const bufferIndex = node.piece.bufferIndex;
        const lineStarts = this._buffers[bufferIndex].lineStarts;
        const startOffset = lineStarts[piece.start.line] + piece.start.column;
        const offset = startOffset + remainder;
        // binary search offset between startOffset and endOffset
        let low = piece.start.line;
        let high = piece.end.line;
        let mid = 0;
        let midStop = 0;
        let midStart = 0;
        while (low <= high) {
            mid = low + ((high - low) / 2) | 0;
            midStart = lineStarts[mid];
            if (mid === high) {
                break;
            }
            midStop = lineStarts[mid + 1];
            if (offset < midStart) {
                high = mid - 1;
            }
            else if (offset >= midStop) {
                low = mid + 1;
            }
            else {
                break;
            }
        }
        if (ret) {
            ret.line = mid;
            ret.column = offset - midStart;
            return null;
        }
        return {
            line: mid,
            column: offset - midStart
        };
    }
    getLineFeedCnt(bufferIndex, start, end) {
        // we don't need to worry about start: abc\r|\n, or abc|\r, or abc|\n, or abc|\r\n doesn't change the fact that, there is one line break after start.
        // now let's take care of end: abc\r|\n, if end is in between \r and \n, we need to add line feed count by 1
        if (end.column === 0) {
            return end.line - start.line;
        }
        const lineStarts = this._buffers[bufferIndex].lineStarts;
        if (end.line === lineStarts.length - 1) { // it means, there is no \n after end, otherwise, there will be one more lineStart.
            return end.line - start.line;
        }
        const nextLineStartOffset = lineStarts[end.line + 1];
        const endOffset = lineStarts[end.line] + end.column;
        if (nextLineStartOffset > endOffset + 1) { // there are more than 1 character after end, which means it can't be \n
            return end.line - start.line;
        }
        // endOffset + 1 === nextLineStartOffset
        // character at endOffset is \n, so we check the character before first
        // if character at endOffset is \r, end.column is 0 and we can't get here.
        const previousCharOffset = endOffset - 1; // end.column > 0 so it's okay.
        const buffer = this._buffers[bufferIndex].buffer;
        if (buffer.charCodeAt(previousCharOffset) === 13) {
            return end.line - start.line + 1;
        }
        else {
            return end.line - start.line;
        }
    }
    offsetInBuffer(bufferIndex, cursor) {
        const lineStarts = this._buffers[bufferIndex].lineStarts;
        return lineStarts[cursor.line] + cursor.column;
    }
    deleteNodes(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            rbDelete(this, nodes[i]);
        }
    }
    createNewPieces(text) {
        if (text.length > AverageBufferSize) {
            // the content is large, operations like substring, charCode becomes slow
            // so here we split it into smaller chunks, just like what we did for CR/LF normalization
            const newPieces = [];
            while (text.length > AverageBufferSize) {
                const lastChar = text.charCodeAt(AverageBufferSize - 1);
                let splitText;
                if (lastChar === 13 /* CharCode.CarriageReturn */ || (lastChar >= 0xD800 && lastChar <= 0xDBFF)) {
                    // last character is \r or a high surrogate => keep it back
                    splitText = text.substring(0, AverageBufferSize - 1);
                    text = text.substring(AverageBufferSize - 1);
                }
                else {
                    splitText = text.substring(0, AverageBufferSize);
                    text = text.substring(AverageBufferSize);
                }
                const lineStarts = createLineStartsFast(splitText);
                newPieces.push(new Piece(this._buffers.length, /* buffer index */ { line: 0, column: 0 }, { line: lineStarts.length - 1, column: splitText.length - lineStarts[lineStarts.length - 1] }, lineStarts.length - 1, splitText.length));
                this._buffers.push(new StringBuffer(splitText, lineStarts));
            }
            const lineStarts = createLineStartsFast(text);
            newPieces.push(new Piece(this._buffers.length, /* buffer index */ { line: 0, column: 0 }, { line: lineStarts.length - 1, column: text.length - lineStarts[lineStarts.length - 1] }, lineStarts.length - 1, text.length));
            this._buffers.push(new StringBuffer(text, lineStarts));
            return newPieces;
        }
        let startOffset = this._buffers[0].buffer.length;
        const lineStarts = createLineStartsFast(text, false);
        let start = this._lastChangeBufferPos;
        if (this._buffers[0].lineStarts[this._buffers[0].lineStarts.length - 1] === startOffset
            && startOffset !== 0
            && this.startWithLF(text)
            && this.endWithCR(this._buffers[0].buffer) // todo, we can check this._lastChangeBufferPos's column as it's the last one
        ) {
            this._lastChangeBufferPos = { line: this._lastChangeBufferPos.line, column: this._lastChangeBufferPos.column + 1 };
            start = this._lastChangeBufferPos;
            for (let i = 0; i < lineStarts.length; i++) {
                lineStarts[i] += startOffset + 1;
            }
            this._buffers[0].lineStarts = this._buffers[0].lineStarts.concat(lineStarts.slice(1));
            this._buffers[0].buffer += '_' + text;
            startOffset += 1;
        }
        else {
            if (startOffset !== 0) {
                for (let i = 0; i < lineStarts.length; i++) {
                    lineStarts[i] += startOffset;
                }
            }
            this._buffers[0].lineStarts = this._buffers[0].lineStarts.concat(lineStarts.slice(1));
            this._buffers[0].buffer += text;
        }
        const endOffset = this._buffers[0].buffer.length;
        const endIndex = this._buffers[0].lineStarts.length - 1;
        const endColumn = endOffset - this._buffers[0].lineStarts[endIndex];
        const endPos = { line: endIndex, column: endColumn };
        const newPiece = new Piece(0, /** todo@peng */ start, endPos, this.getLineFeedCnt(0, start, endPos), endOffset - startOffset);
        this._lastChangeBufferPos = endPos;
        return [newPiece];
    }
    getLinesRawContent() {
        return this.getContentOfSubTree(this.root);
    }
    getLineRawContent(lineNumber, endOffset = 0) {
        let x = this.root;
        let ret = '';
        const cache = this._searchCache.get2(lineNumber);
        if (cache) {
            x = cache.node;
            const prevAccumulatedValue = this.getAccumulatedValue(x, lineNumber - cache.nodeStartLineNumber - 1);
            const buffer = this._buffers[x.piece.bufferIndex].buffer;
            const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
            if (cache.nodeStartLineNumber + x.piece.lineFeedCnt === lineNumber) {
                ret = buffer.substring(startOffset + prevAccumulatedValue, startOffset + x.piece.length);
            }
            else {
                const accumulatedValue = this.getAccumulatedValue(x, lineNumber - cache.nodeStartLineNumber);
                return buffer.substring(startOffset + prevAccumulatedValue, startOffset + accumulatedValue - endOffset);
            }
        }
        else {
            let nodeStartOffset = 0;
            const originalLineNumber = lineNumber;
            while (x !== SENTINEL) {
                if (x.left !== SENTINEL && x.lf_left >= lineNumber - 1) {
                    x = x.left;
                }
                else if (x.lf_left + x.piece.lineFeedCnt > lineNumber - 1) {
                    const prevAccumulatedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                    const accumulatedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 1);
                    const buffer = this._buffers[x.piece.bufferIndex].buffer;
                    const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
                    nodeStartOffset += x.size_left;
                    this._searchCache.set({
                        node: x,
                        nodeStartOffset,
                        nodeStartLineNumber: originalLineNumber - (lineNumber - 1 - x.lf_left)
                    });
                    return buffer.substring(startOffset + prevAccumulatedValue, startOffset + accumulatedValue - endOffset);
                }
                else if (x.lf_left + x.piece.lineFeedCnt === lineNumber - 1) {
                    const prevAccumulatedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                    const buffer = this._buffers[x.piece.bufferIndex].buffer;
                    const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
                    ret = buffer.substring(startOffset + prevAccumulatedValue, startOffset + x.piece.length);
                    break;
                }
                else {
                    lineNumber -= x.lf_left + x.piece.lineFeedCnt;
                    nodeStartOffset += x.size_left + x.piece.length;
                    x = x.right;
                }
            }
        }
        // search in order, to find the node contains end column
        x = x.next();
        while (x !== SENTINEL) {
            const buffer = this._buffers[x.piece.bufferIndex].buffer;
            if (x.piece.lineFeedCnt > 0) {
                const accumulatedValue = this.getAccumulatedValue(x, 0);
                const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
                ret += buffer.substring(startOffset, startOffset + accumulatedValue - endOffset);
                return ret;
            }
            else {
                const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
                ret += buffer.substr(startOffset, x.piece.length);
            }
            x = x.next();
        }
        return ret;
    }
    computeBufferMetadata() {
        let x = this.root;
        let lfCnt = 1;
        let len = 0;
        while (x !== SENTINEL) {
            lfCnt += x.lf_left + x.piece.lineFeedCnt;
            len += x.size_left + x.piece.length;
            x = x.right;
        }
        this._lineCnt = lfCnt;
        this._length = len;
        this._searchCache.validate(this._length);
    }
    // #region node operations
    getIndexOf(node, accumulatedValue) {
        const piece = node.piece;
        const pos = this.positionInBuffer(node, accumulatedValue);
        const lineCnt = pos.line - piece.start.line;
        if (this.offsetInBuffer(piece.bufferIndex, piece.end) - this.offsetInBuffer(piece.bufferIndex, piece.start) === accumulatedValue) {
            // we are checking the end of this node, so a CRLF check is necessary.
            const realLineCnt = this.getLineFeedCnt(node.piece.bufferIndex, piece.start, pos);
            if (realLineCnt !== lineCnt) {
                // aha yes, CRLF
                return { index: realLineCnt, remainder: 0 };
            }
        }
        return { index: lineCnt, remainder: pos.column };
    }
    getAccumulatedValue(node, index) {
        if (index < 0) {
            return 0;
        }
        const piece = node.piece;
        const lineStarts = this._buffers[piece.bufferIndex].lineStarts;
        const expectedLineStartIndex = piece.start.line + index + 1;
        if (expectedLineStartIndex > piece.end.line) {
            return lineStarts[piece.end.line] + piece.end.column - lineStarts[piece.start.line] - piece.start.column;
        }
        else {
            return lineStarts[expectedLineStartIndex] - lineStarts[piece.start.line] - piece.start.column;
        }
    }
    deleteNodeTail(node, pos) {
        const piece = node.piece;
        const originalLFCnt = piece.lineFeedCnt;
        const originalEndOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);
        const newEnd = pos;
        const newEndOffset = this.offsetInBuffer(piece.bufferIndex, newEnd);
        const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, piece.start, newEnd);
        const lf_delta = newLineFeedCnt - originalLFCnt;
        const size_delta = newEndOffset - originalEndOffset;
        const newLength = piece.length + size_delta;
        node.piece = new Piece(piece.bufferIndex, piece.start, newEnd, newLineFeedCnt, newLength);
        updateTreeMetadata(this, node, size_delta, lf_delta);
    }
    deleteNodeHead(node, pos) {
        const piece = node.piece;
        const originalLFCnt = piece.lineFeedCnt;
        const originalStartOffset = this.offsetInBuffer(piece.bufferIndex, piece.start);
        const newStart = pos;
        const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, newStart, piece.end);
        const newStartOffset = this.offsetInBuffer(piece.bufferIndex, newStart);
        const lf_delta = newLineFeedCnt - originalLFCnt;
        const size_delta = originalStartOffset - newStartOffset;
        const newLength = piece.length + size_delta;
        node.piece = new Piece(piece.bufferIndex, newStart, piece.end, newLineFeedCnt, newLength);
        updateTreeMetadata(this, node, size_delta, lf_delta);
    }
    shrinkNode(node, start, end) {
        const piece = node.piece;
        const originalStartPos = piece.start;
        const originalEndPos = piece.end;
        // old piece, originalStartPos, start
        const oldLength = piece.length;
        const oldLFCnt = piece.lineFeedCnt;
        const newEnd = start;
        const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, piece.start, newEnd);
        const newLength = this.offsetInBuffer(piece.bufferIndex, start) - this.offsetInBuffer(piece.bufferIndex, originalStartPos);
        node.piece = new Piece(piece.bufferIndex, piece.start, newEnd, newLineFeedCnt, newLength);
        updateTreeMetadata(this, node, newLength - oldLength, newLineFeedCnt - oldLFCnt);
        // new right piece, end, originalEndPos
        const newPiece = new Piece(piece.bufferIndex, end, originalEndPos, this.getLineFeedCnt(piece.bufferIndex, end, originalEndPos), this.offsetInBuffer(piece.bufferIndex, originalEndPos) - this.offsetInBuffer(piece.bufferIndex, end));
        const newNode = this.rbInsertRight(node, newPiece);
        this.validateCRLFWithPrevNode(newNode);
    }
    appendToNode(node, value) {
        if (this.adjustCarriageReturnFromNext(value, node)) {
            value += '\n';
        }
        const hitCRLF = this.shouldCheckCRLF() && this.startWithLF(value) && this.endWithCR(node);
        const startOffset = this._buffers[0].buffer.length;
        this._buffers[0].buffer += value;
        const lineStarts = createLineStartsFast(value, false);
        for (let i = 0; i < lineStarts.length; i++) {
            lineStarts[i] += startOffset;
        }
        if (hitCRLF) {
            const prevStartOffset = this._buffers[0].lineStarts[this._buffers[0].lineStarts.length - 2];
            this._buffers[0].lineStarts.pop();
            // _lastChangeBufferPos is already wrong
            this._lastChangeBufferPos = { line: this._lastChangeBufferPos.line - 1, column: startOffset - prevStartOffset };
        }
        this._buffers[0].lineStarts = this._buffers[0].lineStarts.concat(lineStarts.slice(1));
        const endIndex = this._buffers[0].lineStarts.length - 1;
        const endColumn = this._buffers[0].buffer.length - this._buffers[0].lineStarts[endIndex];
        const newEnd = { line: endIndex, column: endColumn };
        const newLength = node.piece.length + value.length;
        const oldLineFeedCnt = node.piece.lineFeedCnt;
        const newLineFeedCnt = this.getLineFeedCnt(0, node.piece.start, newEnd);
        const lf_delta = newLineFeedCnt - oldLineFeedCnt;
        node.piece = new Piece(node.piece.bufferIndex, node.piece.start, newEnd, newLineFeedCnt, newLength);
        this._lastChangeBufferPos = newEnd;
        updateTreeMetadata(this, node, value.length, lf_delta);
    }
    nodeAt(offset) {
        let x = this.root;
        const cache = this._searchCache.get(offset);
        if (cache) {
            return {
                node: cache.node,
                nodeStartOffset: cache.nodeStartOffset,
                remainder: offset - cache.nodeStartOffset
            };
        }
        let nodeStartOffset = 0;
        while (x !== SENTINEL) {
            if (x.size_left > offset) {
                x = x.left;
            }
            else if (x.size_left + x.piece.length >= offset) {
                nodeStartOffset += x.size_left;
                const ret = {
                    node: x,
                    remainder: offset - x.size_left,
                    nodeStartOffset
                };
                this._searchCache.set(ret);
                return ret;
            }
            else {
                offset -= x.size_left + x.piece.length;
                nodeStartOffset += x.size_left + x.piece.length;
                x = x.right;
            }
        }
        return null;
    }
    nodeAt2(lineNumber, column) {
        let x = this.root;
        let nodeStartOffset = 0;
        while (x !== SENTINEL) {
            if (x.left !== SENTINEL && x.lf_left >= lineNumber - 1) {
                x = x.left;
            }
            else if (x.lf_left + x.piece.lineFeedCnt > lineNumber - 1) {
                const prevAccumualtedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                const accumulatedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 1);
                nodeStartOffset += x.size_left;
                return {
                    node: x,
                    remainder: Math.min(prevAccumualtedValue + column - 1, accumulatedValue),
                    nodeStartOffset
                };
            }
            else if (x.lf_left + x.piece.lineFeedCnt === lineNumber - 1) {
                const prevAccumualtedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                if (prevAccumualtedValue + column - 1 <= x.piece.length) {
                    return {
                        node: x,
                        remainder: prevAccumualtedValue + column - 1,
                        nodeStartOffset
                    };
                }
                else {
                    column -= x.piece.length - prevAccumualtedValue;
                    break;
                }
            }
            else {
                lineNumber -= x.lf_left + x.piece.lineFeedCnt;
                nodeStartOffset += x.size_left + x.piece.length;
                x = x.right;
            }
        }
        // search in order, to find the node contains position.column
        x = x.next();
        while (x !== SENTINEL) {
            if (x.piece.lineFeedCnt > 0) {
                const accumulatedValue = this.getAccumulatedValue(x, 0);
                const nodeStartOffset = this.offsetOfNode(x);
                return {
                    node: x,
                    remainder: Math.min(column - 1, accumulatedValue),
                    nodeStartOffset
                };
            }
            else {
                if (x.piece.length >= column - 1) {
                    const nodeStartOffset = this.offsetOfNode(x);
                    return {
                        node: x,
                        remainder: column - 1,
                        nodeStartOffset
                    };
                }
                else {
                    column -= x.piece.length;
                }
            }
            x = x.next();
        }
        return null;
    }
    nodeCharCodeAt(node, offset) {
        if (node.piece.lineFeedCnt < 1) {
            return -1;
        }
        const buffer = this._buffers[node.piece.bufferIndex];
        const newOffset = this.offsetInBuffer(node.piece.bufferIndex, node.piece.start) + offset;
        return buffer.buffer.charCodeAt(newOffset);
    }
    offsetOfNode(node) {
        if (!node) {
            return 0;
        }
        let pos = node.size_left;
        while (node !== this.root) {
            if (node.parent.right === node) {
                pos += node.parent.size_left + node.parent.piece.length;
            }
            node = node.parent;
        }
        return pos;
    }
    // #endregion
    // #region CRLF
    shouldCheckCRLF() {
        return !(this._EOLNormalized && this._EOL === '\n');
    }
    startWithLF(val) {
        if (typeof val === 'string') {
            return val.charCodeAt(0) === 10;
        }
        if (val === SENTINEL || val.piece.lineFeedCnt === 0) {
            return false;
        }
        const piece = val.piece;
        const lineStarts = this._buffers[piece.bufferIndex].lineStarts;
        const line = piece.start.line;
        const startOffset = lineStarts[line] + piece.start.column;
        if (line === lineStarts.length - 1) {
            // last line, so there is no line feed at the end of this line
            return false;
        }
        const nextLineOffset = lineStarts[line + 1];
        if (nextLineOffset > startOffset + 1) {
            return false;
        }
        return this._buffers[piece.bufferIndex].buffer.charCodeAt(startOffset) === 10;
    }
    endWithCR(val) {
        if (typeof val === 'string') {
            return val.charCodeAt(val.length - 1) === 13;
        }
        if (val === SENTINEL || val.piece.lineFeedCnt === 0) {
            return false;
        }
        return this.nodeCharCodeAt(val, val.piece.length - 1) === 13;
    }
    validateCRLFWithPrevNode(nextNode) {
        if (this.shouldCheckCRLF() && this.startWithLF(nextNode)) {
            const node = nextNode.prev();
            if (this.endWithCR(node)) {
                this.fixCRLF(node, nextNode);
            }
        }
    }
    validateCRLFWithNextNode(node) {
        if (this.shouldCheckCRLF() && this.endWithCR(node)) {
            const nextNode = node.next();
            if (this.startWithLF(nextNode)) {
                this.fixCRLF(node, nextNode);
            }
        }
    }
    fixCRLF(prev, next) {
        const nodesToDel = [];
        // update node
        const lineStarts = this._buffers[prev.piece.bufferIndex].lineStarts;
        let newEnd;
        if (prev.piece.end.column === 0) {
            // it means, last line ends with \r, not \r\n
            newEnd = { line: prev.piece.end.line - 1, column: lineStarts[prev.piece.end.line] - lineStarts[prev.piece.end.line - 1] - 1 };
        }
        else {
            // \r\n
            newEnd = { line: prev.piece.end.line, column: prev.piece.end.column - 1 };
        }
        const prevNewLength = prev.piece.length - 1;
        const prevNewLFCnt = prev.piece.lineFeedCnt - 1;
        prev.piece = new Piece(prev.piece.bufferIndex, prev.piece.start, newEnd, prevNewLFCnt, prevNewLength);
        updateTreeMetadata(this, prev, -1, -1);
        if (prev.piece.length === 0) {
            nodesToDel.push(prev);
        }
        // update nextNode
        const newStart = { line: next.piece.start.line + 1, column: 0 };
        const newLength = next.piece.length - 1;
        const newLineFeedCnt = this.getLineFeedCnt(next.piece.bufferIndex, newStart, next.piece.end);
        next.piece = new Piece(next.piece.bufferIndex, newStart, next.piece.end, newLineFeedCnt, newLength);
        updateTreeMetadata(this, next, -1, -1);
        if (next.piece.length === 0) {
            nodesToDel.push(next);
        }
        // create new piece which contains \r\n
        const pieces = this.createNewPieces('\r\n');
        this.rbInsertRight(prev, pieces[0]);
        // delete empty nodes
        for (let i = 0; i < nodesToDel.length; i++) {
            rbDelete(this, nodesToDel[i]);
        }
    }
    adjustCarriageReturnFromNext(value, node) {
        if (this.shouldCheckCRLF() && this.endWithCR(value)) {
            const nextNode = node.next();
            if (this.startWithLF(nextNode)) {
                // move `\n` forward
                value += '\n';
                if (nextNode.piece.length === 1) {
                    rbDelete(this, nextNode);
                }
                else {
                    const piece = nextNode.piece;
                    const newStart = { line: piece.start.line + 1, column: 0 };
                    const newLength = piece.length - 1;
                    const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, newStart, piece.end);
                    nextNode.piece = new Piece(piece.bufferIndex, newStart, piece.end, newLineFeedCnt, newLength);
                    updateTreeMetadata(this, nextNode, -1, -1);
                }
                return true;
            }
        }
        return false;
    }
    // #endregion
    // #endregion
    // #region Tree operations
    iterate(node, callback) {
        if (node === SENTINEL) {
            return callback(SENTINEL);
        }
        const leftRet = this.iterate(node.left, callback);
        if (!leftRet) {
            return leftRet;
        }
        return callback(node) && this.iterate(node.right, callback);
    }
    getNodeContent(node) {
        if (node === SENTINEL) {
            return '';
        }
        const buffer = this._buffers[node.piece.bufferIndex];
        const piece = node.piece;
        const startOffset = this.offsetInBuffer(piece.bufferIndex, piece.start);
        const endOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);
        const currentContent = buffer.buffer.substring(startOffset, endOffset);
        return currentContent;
    }
    getPieceContent(piece) {
        const buffer = this._buffers[piece.bufferIndex];
        const startOffset = this.offsetInBuffer(piece.bufferIndex, piece.start);
        const endOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);
        const currentContent = buffer.buffer.substring(startOffset, endOffset);
        return currentContent;
    }
    /**
     *      node              node
     *     /  \              /  \
     *    a   b    <----   a    b
     *                         /
     *                        z
     */
    rbInsertRight(node, p) {
        const z = new TreeNode(p, 1 /* NodeColor.Red */);
        z.left = SENTINEL;
        z.right = SENTINEL;
        z.parent = SENTINEL;
        z.size_left = 0;
        z.lf_left = 0;
        const x = this.root;
        if (x === SENTINEL) {
            this.root = z;
            z.color = 0 /* NodeColor.Black */;
        }
        else if (node.right === SENTINEL) {
            node.right = z;
            z.parent = node;
        }
        else {
            const nextNode = leftest(node.right);
            nextNode.left = z;
            z.parent = nextNode;
        }
        fixInsert(this, z);
        return z;
    }
    /**
     *      node              node
     *     /  \              /  \
     *    a   b     ---->   a    b
     *                       \
     *                        z
     */
    rbInsertLeft(node, p) {
        const z = new TreeNode(p, 1 /* NodeColor.Red */);
        z.left = SENTINEL;
        z.right = SENTINEL;
        z.parent = SENTINEL;
        z.size_left = 0;
        z.lf_left = 0;
        if (this.root === SENTINEL) {
            this.root = z;
            z.color = 0 /* NodeColor.Black */;
        }
        else if (node.left === SENTINEL) {
            node.left = z;
            z.parent = node;
        }
        else {
            const prevNode = righttest(node.left); // a
            prevNode.right = z;
            z.parent = prevNode;
        }
        fixInsert(this, z);
        return z;
    }
    getContentOfSubTree(node) {
        let str = '';
        this.iterate(node, node => {
            str += this.getNodeContent(node);
            return true;
        });
        return str;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGllY2VUcmVlQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3BpZWNlVHJlZVRleHRCdWZmZXIvcGllY2VUcmVlQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxTQUFTLEVBQTZCLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEUsT0FBTyxFQUFhLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0gsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFaEYsNkNBQTZDO0FBQzdDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDO0FBRWhDLFNBQVMsZUFBZSxDQUFDLEdBQWE7SUFDckMsSUFBSSxDQUFDLENBQUM7SUFDTixJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQ2pDLENBQUMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakMsQ0FBQztTQUFNLENBQUM7UUFDUCxDQUFDLEdBQUcsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFDRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNkLE9BQU8sQ0FBQyxD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