/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { randomInt } from '../../../../base/common/numbers.js';
import { assertDefined } from '../../../../base/common/types.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * A reusable test utility that asserts that the given decoder
 * produces the expected `expectedTokens` sequence of tokens.
 *
 * ## Examples
 *
 * ```typescript
 * const stream = newWriteableStream<VSBuffer>(null);
 * const decoder = testDisposables.add(new LinesDecoder(stream));
 *
 * // create a new test utility instance
 * const test = testDisposables.add(new TestDecoder(stream, decoder));
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 * 	   new Line(1, ' hello world'),
 * 	   new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export class TestDecoder extends Disposable {
    constructor(stream, decoder) {
        super();
        this.stream = stream;
        this.decoder = decoder;
        this._register(this.decoder);
    }
    /**
     * Write provided {@linkcode inputData} data to the input byte stream
     * asynchronously in the background in small random-length chunks.
     *
     * @param inputData Input data to send.
     */
    sendData(inputData) {
        // if input data was passed as an array of lines,
        // join them into a single string with newlines
        if (Array.isArray(inputData)) {
            inputData = inputData.join('\n');
        }
        // write the input data to the stream in multiple random-length
        // chunks to simulate real input stream data flows
        let inputDataBytes = VSBuffer.fromString(inputData);
        const interval = setInterval(() => {
            if (inputDataBytes.byteLength <= 0) {
                clearInterval(interval);
                this.stream.end();
                return;
            }
            const dataToSend = inputDataBytes.slice(0, randomInt(inputDataBytes.byteLength));
            this.stream.write(dataToSend);
            inputDataBytes = inputDataBytes.slice(dataToSend.byteLength);
        }, randomInt(5));
        return this;
    }
    /**
     * Run the test sending the `inputData` data to the stream and asserting
     * that the decoder produces the `expectedTokens` sequence of tokens.
     *
     * @param inputData Input data of the input byte stream.
     * @param expectedTokens List of expected tokens the test token must produce.
     * @param tokensConsumeMethod *Optional* method of consuming the decoder stream.
     *       					  Defaults to a random method (see {@linkcode randomTokensConsumeMethod}).
     */
    async run(inputData, expectedTokens, tokensConsumeMethod = this.randomTokensConsumeMethod()) {
        try {
            // initiate the data sending flow
            this.sendData(inputData);
            // consume the decoder tokens based on specified
            // (or randomly generated) tokens consume method
            const receivedTokens = [];
            switch (tokensConsumeMethod) {
                // test the `async iterator` code path
                case 'async-generator': {
                    for await (const token of this.decoder) {
                        if (token === null) {
                            break;
                        }
                        receivedTokens.push(token);
                    }
                    break;
                }
                // test the `.consumeAll()` method code path
                case 'consume-all-method': {
                    receivedTokens.push(...(await this.decoder.consumeAll()));
                    break;
                }
                // test the `.onData()` event consume flow
                case 'on-data-event': {
                    this.decoder.onData((token) => {
                        receivedTokens.push(token);
                    });
                    this.decoder.start();
                    // in this case we also test the `settled` promise of the decoder
                    await this.decoder.settled;
                    break;
                }
                // ensure that the switch block is exhaustive
                default: {
                    throw new Error(`Unknown consume method '${tokensConsumeMethod}'.`);
                }
            }
            // validate the received tokens
            this.validateReceivedTokens(receivedTokens, expectedTokens);
        }
        catch (error) {
            assertDefined(error, `An non-nullable error must be thrown.`);
            assert(error instanceof Error, `An error error instance must be thrown.`);
            // add the tokens consume method to the error message so we
            // would know which method of consuming the tokens failed exactly
            error.message = `[${tokensConsumeMethod}] ${error.message}`;
            throw error;
        }
    }
    /**
     * Randomly generate a tokens consume method type for the test.
     */
    randomTokensConsumeMethod() {
        const testConsumeMethodIndex = randomInt(2);
        switch (testConsumeMethodIndex) {
            // test the `async iterator` code path
            case 0: {
                return 'async-generator';
            }
            // test the `.consumeAll()` method code path
            case 1: {
                return 'consume-all-method';
            }
            // test the `.onData()` event consume flow
            case 2: {
                return 'on-data-event';
            }
            // ensure that the switch block is exhaustive
            default: {
                throw new Error(`Unknown consume method index '${testConsumeMethodIndex}'.`);
            }
        }
    }
    /**
     * Validate that received tokens list is equal to the expected one.
     */
    validateReceivedTokens(receivedTokens, expectedTokens) {
        for (let i = 0; i < expectedTokens.length; i++) {
            const expectedToken = expectedTokens[i];
            const receivedToken = receivedTokens[i];
            assertDefined(receivedToken, `Expected token '${i}' to be '${expectedToken}', got 'undefined'.`);
            assert(receivedToken.equals(expectedToken), `Expected token '${i}' to be '${expectedToken}', got '${receivedToken}'.`);
        }
        if (receivedTokens.length === expectedTokens.length) {
            return;
        }
        // sanity check - if received/expected list lengths are not equal, the received
        // list must be longer than the expected one, because the other way around case
        // must have been caught by the comparison loop above
        assert(receivedTokens.length > expectedTokens.length, 'Must have received more tokens than expected.');
        const index = expectedTokens.length;
        throw new Error([
            `Expected no '${index}' token present, got '${receivedTokens[index]}'.`,
            `(received ${receivedTokens.length} tokens in total)`,
        ].join(' '));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3V0aWxzL3Rlc3REZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFVbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFCRztBQUNILE1BQU0sT0FBTyxXQUEyRCxTQUFRLFVBQVU7SUFDekYsWUFDa0IsTUFBaUMsRUFDbEMsT0FBVTtRQUUxQixLQUFLLEVBQUUsQ0FBQztRQUhTLFdBQU0sR0FBTixNQUFNLENBQTJCO1FBQ2xDLFlBQU8sR0FBUCxPQUFPLENBQUc7UUFJMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksUUFBUSxDQUNkLFNBQTRCO1FBRTVCLGlEQUFpRDtRQUNqRCwrQ0FBK0M7UUFDL0MsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDOUIsU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUVELCtEQUErRDtRQUMvRCxrREFBa0Q7UUFDbEQsSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNw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