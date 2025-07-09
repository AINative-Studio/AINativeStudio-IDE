/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Transform } from 'stream';
import { binaryIndexOf } from '../common/buffer.js';
/**
 * A Transform stream that splits the input on the "splitter" substring.
 * The resulting chunks will contain (and trail with) the splitter match.
 * The last chunk when the stream ends will be emitted even if a splitter
 * is not encountered.
 */
export class StreamSplitter extends Transform {
    constructor(splitter) {
        super();
        if (typeof splitter === 'number') {
            this.splitter = splitter;
            this.spitterLen = 1;
        }
        else {
            const buf = Buffer.isBuffer(splitter) ? splitter : Buffer.from(splitter);
            this.splitter = buf.length === 1 ? buf[0] : buf;
            this.spitterLen = buf.length;
        }
    }
    _transform(chunk, _encoding, callback) {
        if (!this.buffer) {
            this.buffer = chunk;
        }
        else {
            this.buffer = Buffer.concat([this.buffer, chunk]);
        }
        let offset = 0;
        while (offset < this.buffer.length) {
            const index = typeof this.splitter === 'number'
                ? this.buffer.indexOf(this.splitter, offset)
                : binaryIndexOf(this.buffer, this.splitter, offset);
            if (index === -1) {
                break;
            }
            this.push(this.buffer.slice(offset, index + this.spitterLen));
            offset = index + this.spitterLen;
        }
        this.buffer = offset === this.buffer.length ? undefined : this.buffer.slice(offset);
        callback();
    }
    _flush(callback) {
        if (this.buffer) {
            this.push(this.buffer);
        }
        callback();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVN0cmVhbXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL25vZGVTdHJlYW1zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDbkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXBEOzs7OztHQUtHO0FBQ0gsTUFBTSxPQUFPLGNBQWUsU0FBUSxTQUFTO0lBSzVDLFlBQVksUUFBa0M7UUFDN0MsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pFLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ2hELElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUM5QixDQUFDO0lBQ0YsQ0FBQztJQUVRLFVBQVUsQ0FBQyxLQUFhLEVBQUUsU0FBaUIsRUFBRSxRQUFvRDtRQUN6RyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFFRCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixPQUFPLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLE1BQU0sS0FBSyxHQUFHLE9BQU8sSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRO2dCQUM5QyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7Z0JBQzVDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JELElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE1BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzlELE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNsQyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEYsUUFBUSxFQUFFLENBQUM7SUFDWixDQUFDO0lBRVEsTUFBTSxDQUFDLFFBQW9EO1FBQ25FLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFFRCxRQUFRLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRCJ9