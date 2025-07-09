/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../common/core/range.js';
import { Line } from '../../../common/codecs/linesCodec/tokens/line.js';
import { TestDecoder } from '../utils/testDecoder.js';
import { NewLine } from '../../../common/codecs/linesCodec/tokens/newLine.js';
import { newWriteableStream } from '../../../../base/common/stream.js';
import { CarriageReturn } from '../../../common/codecs/linesCodec/tokens/carriageReturn.js';
import { LinesDecoder } from '../../../common/codecs/linesCodec/linesDecoder.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
/**
 * Note! This decoder is also often used to test common logic of abstract {@linkcode BaseDecoder}
 * class, because the {@linkcode LinesDecoder} is one of the simplest non-abstract decoders we have.
 */
suite('LinesDecoder', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Test the core logic with specific method of consuming
     * tokens that are produced by a lines decoder instance.
     */
    suite('core logic', () => {
        testLinesDecoder('async-generator', disposables);
        testLinesDecoder('consume-all-method', disposables);
        testLinesDecoder('on-data-event', disposables);
    });
    suite('settled promise', () => {
        test('throws if accessed on not-yet-started decoder instance', () => {
            const test = disposables.add(new TestLinesDecoder());
            assert.throws(() => {
                // testing the field access that throws here, so
                // its OK to not use the returned value afterwards
                // eslint-disable-next-line local/code-no-unused-expressions
                test.decoder.settled;
            }, [
                'Cannot get `settled` promise of a stream that has not been started.',
                'Please call `start()` first.',
            ].join(' '));
        });
    });
    suite('start', () => {
        test('throws if the decoder object is already `disposed`', () => {
            const test = disposables.add(new TestLinesDecoder());
            const { decoder } = test;
            decoder.dispose();
            assert.throws(decoder.start.bind(decoder), 'Cannot start stream that has already disposed.');
        });
        test('throws if the decoder object is already `ended`', async () => {
            const inputStream = newWriteableStream(null);
            const test = disposables.add(new TestLinesDecoder(inputStream));
            const { decoder } = test;
            setTimeout(() => {
                test.sendData([
                    'hello',
                    'world :wave:',
                ]);
            }, 5);
            const receivedTokens = await decoder.start()
                .consumeAll();
            // a basic sanity check for received tokens
            assert.strictEqual(receivedTokens.length, 3, 'Must produce the correct number of tokens.');
            // validate that calling `start()` after stream has ended throws
            assert.throws(decoder.start.bind(decoder), 'Cannot start stream that has already ended.');
        });
    });
});
/**
 * A reusable test utility that asserts that a `LinesDecoder` instance
 * correctly decodes `inputData` into a stream of `TLineToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = disposables.add(new TestLinesDecoder());
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 *     new Line(1, ' hello world'),
 *     new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export class TestLinesDecoder extends TestDecoder {
    constructor(inputStream) {
        const stream = (inputStream)
            ? inputStream
            : newWriteableStream(null);
        const decoder = new LinesDecoder(stream);
        super(stream, decoder);
    }
}
/**
 * Common reusable test utility to validate {@linkcode LinesDecoder} logic with
 * the provided {@linkcode tokensConsumeMethod} way of consuming decoder-produced tokens.
 *
 * @throws if a test fails, please see thrown error for failure details.
 * @param tokensConsumeMethod The way to consume tokens produced by the decoder.
 * @param disposables Test disposables store.
 */
function testLinesDecoder(tokensConsumeMethod, disposables) {
    suite(tokensConsumeMethod, () => {
        suite('produces expected tokens', () => {
            test('input starts with line data', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run(' hello world\nhow are you doing?\n\n 😊 \r ', [
                    new Line(1, ' hello world'),
                    new NewLine(new Range(1, 13, 1, 14)),
                    new Line(2, 'how are you doing?'),
                    new NewLine(new Range(2, 19, 2, 20)),
                    new Line(3, ''),
                    new NewLine(new Range(3, 1, 3, 2)),
                    new Line(4, ' 😊 '),
                    new CarriageReturn(new Range(4, 5, 4, 6)),
                    new Line(5, ' '),
                ]);
            });
            test('input starts with a new line', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run('\nsome text on this line\n\n\nanother 💬 on this line\r\n🤫\n', [
                    new Line(1, ''),
                    new NewLine(new Range(1, 1, 1, 2)),
                    new Line(2, 'some text on this line'),
                    new NewLine(new Range(2, 23, 2, 24)),
                    new Line(3, ''),
                    new NewLine(new Range(3, 1, 3, 2)),
                    new Line(4, ''),
                    new NewLine(new Range(4, 1, 4, 2)),
                    new Line(5, 'another 💬 on this line'),
                    new CarriageReturn(new Range(5, 24, 5, 25)),
                    new NewLine(new Range(5, 25, 5, 26)),
                    new Line(6, '🤫'),
                    new NewLine(new Range(6, 3, 6, 4)),
                ]);
            });
            test('input starts and ends with multiple new lines', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run('\n\n\r\nciao! 🗯️\t💭 💥 come\tva?\n\n\n\n\n', [
                    new Line(1, ''),
                    new NewLine(new Range(1, 1, 1, 2)),
                    new Line(2, ''),
                    new NewLine(new Range(2, 1, 2, 2)),
                    new Line(3, ''),
                    new CarriageReturn(new Range(3, 1, 3, 2)),
                    new NewLine(new Range(3, 2, 3, 3)),
                    new Line(4, 'ciao! 🗯️\t💭 💥 come\tva?'),
                    new NewLine(new Range(4, 25, 4, 26)),
                    new Line(5, ''),
                    new NewLine(new Range(5, 1, 5, 2)),
                    new Line(6, ''),
                    new NewLine(new Range(6, 1, 6, 2)),
                    new Line(7, ''),
                    new NewLine(new Range(7, 1, 7, 2)),
                    new Line(8, ''),
                    new NewLine(new Range(8, 1, 8, 2)),
                ]);
            });
            test('single carriage return is treated as new line', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run('\r\rhaalo! 💥💥 how\'re you?\r ?!\r\n\r\n ', [
                    new Line(1, ''),
                    new CarriageReturn(new Range(1, 1, 1, 2)),
                    new Line(2, ''),
                    new CarriageReturn(new Range(2, 1, 2, 2)),
                    new Line(3, 'haalo! 💥💥 how\'re you?'),
                    new CarriageReturn(new Range(3, 24, 3, 25)),
                    new Line(4, ' ?!'),
                    new CarriageReturn(new Range(4, 4, 4, 5)),
                    new NewLine(new Range(4, 5, 4, 6)),
                    new Line(5, ''),
                    new CarriageReturn(new Range(5, 1, 5, 2)),
                    new NewLine(new Range(5, 2, 5, 3)),
                    new Line(6, ' '),
                ]);
            });
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL2NvZGVjcy9saW5lc0RlY29kZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3RELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUF3QixNQUFNLHlCQUF5QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQW1CLE1BQU0sbUNBQW1DLENBQUM7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQWMsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRzs7O0dBR0c7QUFDSCxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQixNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2pELGdCQUFnQixDQUFDLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3BELGdCQUFnQixDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQztJQUVILEtB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