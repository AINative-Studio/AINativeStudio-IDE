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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbGluZXNDb2RlYy9saW5lc0RlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3hDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM1QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDOUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQU81RTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sWUFBYSxTQUFRLFdBQWlDO0lBQW5FOztRQUNDOztXQUVHO1FBQ0ssV0FBTSxHQUFhLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUF5TDlDLENBQUM7SUEvS0E7O09BRUc7SUFDZ0IsWUFBWSxDQUFDLEtBQWU7UUFDOUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXBELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNLLFdBQVcsQ0FDbEIsV0FBb0I7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