/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { PieceTreeTextBufferBuilder } from '../../../../editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder.js';
import { SearchParams } from '../../../../editor/common/model/textModelSearch.js';
export class CellSearchModel extends Disposable {
    constructor(_source, _inputTextBuffer, _outputs) {
        super();
        this._source = _source;
        this._inputTextBuffer = _inputTextBuffer;
        this._outputs = _outputs;
        this._outputTextBuffers = undefined;
    }
    _getFullModelRange(buffer) {
        const lineCount = buffer.getLineCount();
        return new Range(1, 1, lineCount, this._getLineMaxColumn(buffer, lineCount));
    }
    _getLineMaxColumn(buffer, lineNumber) {
        if (lineNumber < 1 || lineNumber > buffer.getLineCount()) {
            throw new Error('Illegal value for lineNumber');
        }
        return buffer.getLineLength(lineNumber) + 1;
    }
    get inputTextBuffer() {
        if (!this._inputTextBuffer) {
            const builder = new PieceTreeTextBufferBuilder();
            builder.acceptChunk(this._source);
            const bufferFactory = builder.finish(true);
            const { textBuffer, disposable } = bufferFactory.create(1 /* DefaultEndOfLine.LF */);
            this._inputTextBuffer = textBuffer;
            this._register(disposable);
        }
        return this._inputTextBuffer;
    }
    get outputTextBuffers() {
        if (!this._outputTextBuffers) {
            this._outputTextBuffers = this._outputs.map((output) => {
                const builder = new PieceTreeTextBufferBuilder();
                builder.acceptChunk(output);
                const bufferFactory = builder.finish(true);
                const { textBuffer, disposable } = bufferFactory.create(1 /* DefaultEndOfLine.LF */);
                this._register(disposable);
                return textBuffer;
            });
        }
        return this._outputTextBuffers;
    }
    findInInputs(target) {
        const searchParams = new SearchParams(target, false, false, null);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        const fullInputRange = this._getFullModelRange(this.inputTextBuffer);
        return this.inputTextBuffer.findMatchesLineByLine(fullInputRange, searchData, true, 5000);
    }
    findInOutputs(target) {
        const searchParams = new SearchParams(target, false, false, null);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        return this.outputTextBuffers.map(buffer => {
            const matches = buffer.findMatchesLineByLine(this._getFullModelRange(buffer), searchData, true, 5000);
            if (matches.length === 0) {
                return undefined;
            }
            return {
                textBuffer: buffer,
                matches
            };
        }).filter((item) => !!item);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFNlYXJjaE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9jb21tb24vY2VsbFNlYXJjaE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUZBQW1GLENBQUM7QUFDL0gsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBT2xGLE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUFFOUMsWUFBcUIsT0FBZSxFQUFVLGdCQUFpRCxFQUFVLFFBQWtCO1FBQzFILEtBQUssRUFBRSxDQUFDO1FBRFksWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUFVLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBaUM7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBRG5ILHVCQUFrQixHQUFzQyxTQUFTLENBQUM7SUFHMUUsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE1BQTJCO1FBQ3JELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN4QyxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRU8saUJBQWlCLENBQUMsTUFBMkIsRUFBRSxVQUFrQjtRQUN4RSxJQUFJLFVBQVUsR0FBRyxDQUFDLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFB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