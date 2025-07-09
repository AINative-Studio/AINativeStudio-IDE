/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { readUInt32BE, writeUInt32BE } from '../../../base/common/buffer.js';
import { ContiguousMultilineTokens } from './contiguousMultilineTokens.js';
export class ContiguousMultilineTokensBuilder {
    static deserialize(buff) {
        let offset = 0;
        const count = readUInt32BE(buff, offset);
        offset += 4;
        const result = [];
        for (let i = 0; i < count; i++) {
            offset = ContiguousMultilineTokens.deserialize(buff, offset, result);
        }
        return result;
    }
    constructor() {
        this._tokens = [];
    }
    add(lineNumber, lineTokens) {
        if (this._tokens.length > 0) {
            const last = this._tokens[this._tokens.length - 1];
            if (last.endLineNumber + 1 === lineNumber) {
                // append
                last.appendLineTokens(lineTokens);
                return;
            }
        }
        this._tokens.push(new ContiguousMultilineTokens(lineNumber, [lineTokens]));
    }
    finalize() {
        return this._tokens;
    }
    serialize() {
        const size = this._serializeSize();
        const result = new Uint8Array(size);
        this._serialize(result);
        return result;
    }
    _serializeSize() {
        let result = 0;
        result += 4; // 4 bytes for the count
        for (let i = 0; i < this._tokens.length; i++) {
            result += this._tokens[i].serializeSize();
        }
        return result;
    }
    _serialize(destination) {
        let offset = 0;
        writeUInt32BE(destination, this._tokens.length, offset);
        offset += 4;
        for (let i = 0; i < this._tokens.length; i++) {
            offset = this._tokens[i].serialize(destination, offset);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGlndW91c011bHRpbGluZVRva2Vuc0J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90b2tlbnMvY29udGlndW91c011bHRpbGluZVRva2Vuc0J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRSxNQUFNLE9BQU8sZ0NBQWdDO0lBRXJDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBZ0I7UUFDekMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxNQUFNLEdBQWdDLEVBQUUsQ0FBQztRQUMvQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEMsTUFBTSxHQUFHLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFJRDtRQUNDLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFTSxHQUFHLENBQUMsVUFBa0IsRUFBRSxVQUF1QjtRQUNyRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkQsSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDM0MsU0FBUztnQkFDVCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2xDLE9BQU87WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUkseUJBQXlCLENBQUMsVUFBVSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFTSxTQUFTO1FBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEIsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU8sY0FBYztRQUNyQixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsd0JBQXdCO1FBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzNDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxVQUFVLENBQUMsV0FBdUI7UUFDekMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsYUFBYSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDckUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RCxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=