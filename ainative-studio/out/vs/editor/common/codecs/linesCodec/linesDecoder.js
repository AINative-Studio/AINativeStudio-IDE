/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Line } from './tokens/line.js';
import { Range } from '../../core/range.js';
import { NewLine } from './tokens/newLine.js';
import { assert } from '../../../../base/common/assert.js';
import { CarriageReturn } from './tokens/carriageReturn.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { assertDefined } from '../../../../base/common/types.js';
import { BaseDecoder } from '../../../../base/common/codecs/baseDecoder.js';
/**
 * The `decoder` part of the `LinesCodec` and is able to transform
 * data from a binary stream into a stream of text lines(`Line`).
 */
export class LinesDecoder extends BaseDecoder {
    constructor() {
        super(...arguments);
        /**
         * Buffered received data yet to be processed.
         */
        this.buffer = VSBuffer.alloc(0);
    }
    /**
     * Process data received from the input stream.
     */
    onStreamData(chunk) {
        this.buffer = VSBuffer.concat([this.buffer, chunk]);
        this.processData(false);
    }
    /**
     * Process buffered data.
     *
     * @param streamEnded Flag that indicates if the input stream has ended,
     * 					  which means that is the last call of this method.
     * @throws If internal logic implementation error is detected.
     */
    processData(streamEnded) {
        // iterate over each line of the data buffer, emitting each line
        // as a `Line` token followed by a `NewLine` token, if applies
        while (this.buffer.byteLength > 0) {
            // get line number based on a previously emitted line, if any
            const lineNumber = this.lastEmittedLine
                ? this.lastEmittedLine.range.startLineNumber + 1
                : 1;
            // find the `\r`, `\n`, or `\r\n` tokens in the data
            const endOfLineTokens = this.findEndOfLineTokens(lineNumber);
            const firstToken = endOfLineTokens[0];
            // if no end-of-the-line tokens found, stop processing because we
            // either (1)need more data to arraive or (2)the stream has ended
            // in the case (2) remaining data must be emitted as the last line
            if (!firstToken) {
                // (2) if `streamEnded`, we need to emit the whole remaining
                // data as the last line immediately
                if (streamEnded) {
                    this.emitLine(lineNumber, this.buffer.slice(0));
                }
                break;
            }
            // emit the line found in the data as the `Line` token
            this.emitLine(lineNumber, this.buffer.slice(0, firstToken.range.startColumn - 1));
            // must always hold true as the `emitLine` above sets this
            assertDefined(this.lastEmittedLine, 'No last emitted line found.');
            // emit the end-of-the-line tokens
            let startColumn = this.lastEmittedLine.range.endColumn;
            for (const token of endOfLineTokens) {
                const endColumn = startColumn + token.byte.byteLength;
                // emit the token updating its column start/end numbers based on
                // the emitted line text length and previous end-of-the-line token
                this._onData.fire(token.withRange({ startColumn, endColumn }));
                // shorten the data buffer by the length of the token
                this.buffer = this.buffer.slice(token.byte.byteLength);
                // update the start column for the next token
                startColumn = endColumn;
            }
        }
        // if the stream has ended, assert that the input data buffer is now empty
        // otherwise we have a logic error and leaving some buffered data behind
        if (streamEnded) {
            assert(this.buffer.byteLength === 0, 'Expected the input data buffer to be empty when the stream ends.');
        }
    }
    /**
     * Find the end of line tokens in the data buffer.
     * Can return:
     *  - [`\r`, `\n`] tokens if the sequence is found
     *  - [`\r`] token if only the carriage return is found
     *  - [`\n`] token if only the newline is found
     *  - an `empty array` if no end of line tokens found
     */
    findEndOfLineTokens(lineNumber) {
        const result = [];
        // find the first occurrence of the carriage return and newline tokens
        const carriageReturnIndex = this.buffer.indexOf(CarriageReturn.byte);
        const newLineIndex = this.buffer.indexOf(NewLine.byte);
        // if the `\r` comes before the `\n`(if `\n` present at all)
        if (carriageReturnIndex >= 0 && (carriageReturnIndex < newLineIndex || newLineIndex === -1)) {
            // add the carriage return token first
            result.push(new CarriageReturn(new Range(lineNumber, (carriageReturnIndex + 1), lineNumber, (carriageReturnIndex + 1) + CarriageReturn.byte.byteLength)));
            // if the `\r\n` sequence
            if (newLineIndex === carriageReturnIndex + 1) {
                // add the newline token to the result
                result.push(new NewLine(new Range(lineNumber, (newLineIndex + 1), lineNumber, (newLineIndex + 1) + NewLine.byte.byteLength)));
            }
            if (this.buffer.byteLength > carriageReturnIndex + 1) {
                // either `\r` or `\r\n` cases found
                return result;
            }
            return [];
        }
        // no `\r`, but there is `\n`
        if (newLineIndex >= 0) {
            result.push(new NewLine(new Range(lineNumber, (newLineIndex + 1), lineNumber, (newLineIndex + 1) + NewLine.byte.byteLength)));
        }
        // neither `\r` nor `\n` found, no end of line found at all
        return result;
    }
    /**
     * Emit a provided line as the `Line` token to the output stream.
     */
    emitLine(lineNumber, // Note! 1-based indexing
    lineBytes) {
        const line = new Line(lineNumber, lineBytes.toString());
        this._onData.fire(line);
        // store the last emitted line so we can use it when we need
        // to send the remaining line in the `onStreamEnd` method
        this.lastEmittedLine = line;
        // shorten the data buffer by the length of the line emitted
        this.buffer = this.buffer.slice(lineBytes.byteLength);
    }
    /**
     * Handle the end of the input stream - if the buffer still has some data,
     * emit it as the last available line token before firing the `onEnd` event.
     */
    onStreamEnd() {
        // if the input data buffer is not empty when the input stream ends, emit
        // the remaining data as the last line before firing the `onEnd` event
        if (this.buffer.byteLength > 0) {
            this.processData(true);
        }
        super.onStreamEnd();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL2xpbmVzQ29kZWMvbGluZXNEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN4QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFPNUU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFlBQWEsU0FBUSxXQUFpQztJQUFuRTs7UUFDQzs7V0FFRztRQUNLLFdBQU0sR0FBYSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBeUw5QyxDQUFDO0lBL0tBOztPQUVHO0lBQ2dCLFlBQVksQ0FBQyxLQUFlO1FBQzlDLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVwRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSyxXQUFXLENBQ2xCLFdBQW9C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