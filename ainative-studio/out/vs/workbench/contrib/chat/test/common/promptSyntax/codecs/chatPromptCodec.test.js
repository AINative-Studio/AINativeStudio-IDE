/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../../editor/common/core/range.js';
import { newWriteableStream } from '../../../../../../../base/common/stream.js';
import { TestDecoder } from '../../../../../../../editor/test/common/utils/testDecoder.js';
import { ChatPromptCodec } from '../../../../common/promptSyntax/codecs/chatPromptCodec.js';
import { FileReference } from '../../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
/**
 * A reusable test utility that asserts that a `ChatPromptDecoder` instance
 * correctly decodes `inputData` into a stream of `TChatPromptToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = testDisposables.add(new TestChatPromptCodec());
 *
 * // run the test
 * await test.run(
 *   ' hello #file:./some-file.md world\n',
 *   [
 *     new FileReference(
 *       new Range(1, 8, 1, 28),
 *       './some-file.md',
 *     ),
 *   ]
 * );
 */
export class TestChatPromptCodec extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        const decoder = ChatPromptCodec.decode(stream);
        super(stream, decoder);
    }
}
suite('ChatPromptCodec', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('• produces expected tokens', async () => {
        const test = testDisposables.add(new TestChatPromptCodec());
        await test.run('#file:/etc/hosts some text\t\n  for #file:./README.md\t testing\n ✔ purposes\n#file:LICENSE.md ✌ \t#file:.gitignore\n\n\n\t   #file:/Users/legomushroom/repos/vscode   \n\nsomething #file:\tsomewhere\n', [
            new FileReference(new Range(1, 1, 1, 1 + 16), '/etc/hosts'),
            new FileReference(new Range(2, 7, 2, 7 + 17), './README.md'),
            new FileReference(new Range(4, 1, 4, 1 + 16), 'LICENSE.md'),
            new FileReference(new Range(4, 21, 4, 21 + 16), '.gitignore'),
            new FileReference(new Range(7, 5, 7, 5 + 38), '/Users/legomushroom/repos/vscode'),
            new FileReference(new Range(9, 11, 9, 11 + 6), ''),
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdENvZGVjLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2NoYXRQcm9tcHRDb2RlYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMvRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUd6Rzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7QUFDSCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsV0FBZ0Q7SUFDeEY7UUFDQyxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBVyxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRS9DLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEIsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3QixNQUFNLGVBQWUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRWxFLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1FBRTVELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FDYiwwTUFBME0sRUFDMU07WUFDQyxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUMxQixZQUFZLENBQ1o7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUMxQixhQUFhLENBQ2I7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUMxQixZQUFZLENBQ1o7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUM1QixZQUFZLENBQ1o7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUMxQixrQ0FBa0MsQ0FDbEM7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUMzQixFQUFFLENBQ0Y7U0FDRCxDQUNELENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=