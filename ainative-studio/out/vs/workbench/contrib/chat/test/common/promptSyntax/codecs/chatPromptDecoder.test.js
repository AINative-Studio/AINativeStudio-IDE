/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../../editor/common/core/range.js';
import { newWriteableStream } from '../../../../../../../base/common/stream.js';
import { TestDecoder } from '../../../../../../../editor/test/common/utils/testDecoder.js';
import { FileReference } from '../../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { MarkdownLink } from '../../../../../../../editor/common/codecs/markdownCodec/tokens/markdownLink.js';
import { ChatPromptDecoder } from '../../../../common/promptSyntax/codecs/chatPromptDecoder.js';
/**
 * A reusable test utility that asserts that a `ChatPromptDecoder` instance
 * correctly decodes `inputData` into a stream of `TChatPromptToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = testDisposables.add(new TestChatPromptDecoder());
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
export class TestChatPromptDecoder extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        const decoder = new ChatPromptDecoder(stream);
        super(stream, decoder);
    }
}
suite('ChatPromptDecoder', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('• produces expected tokens', async () => {
        const test = testDisposables.add(new TestChatPromptDecoder());
        const contents = [
            '',
            'haalo!',
            ' message 👾 message #file:./path/to/file1.md',
            '',
            '## Heading Title',
            ' \t#file:a/b/c/filename2.md\t🖖\t#file:other-file.md',
            ' [#file:reference.md](./reference.md)some text #file:/some/file/with/absolute/path.md',
            'text text #file: another text',
        ];
        await test.run(contents, [
            new FileReference(new Range(3, 21, 3, 21 + 24), './path/to/file1.md'),
            new FileReference(new Range(6, 3, 6, 3 + 24), 'a/b/c/filename2.md'),
            new FileReference(new Range(6, 31, 6, 31 + 19), 'other-file.md'),
            new MarkdownLink(7, 2, '[#file:reference.md]', '(./reference.md)'),
            new FileReference(new Range(7, 48, 7, 48 + 38), '/some/file/with/absolute/path.md'),
            new FileReference(new Range(8, 11, 8, 11 + 6), ''),
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvY2hhdFByb21wdERlY29kZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMvRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLDZEQUE2RCxDQUFDO0FBRWxIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRztBQUNILE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxXQUFnRDtJQUMxRjtRQUVDLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFXLElBQUksQ0FBQyxDQUFDO1FBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFOUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLE1BQU0sZUFBZSxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFbEUsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdDLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQy9CLElBQUkscUJBQXFCLEVBQUUsQ0FDM0IsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLEVBQUU7WUFDRixRQUFRO1lBQ1IsOENBQThDO1lBQzlDLEVBQUU7WUFDRixrQkFBa0I7WUFDbEIsc0RBQXNEO1lBQ3RELHVGQUF1RjtZQUN2RiwrQkFBK0I7U0FDL0IsQ0FBQztRQUVGLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FDYixRQUFRLEVBQ1I7WUFDQyxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUM1QixvQkFBb0IsQ0FDcEI7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUMxQixvQkFBb0IsQ0FDcEI7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUM1QixlQUFlLENBQ2Y7WUFDRCxJQUFJLFlBQVksQ0FDZixDQUFDLEVBQ0QsQ0FBQyxFQUNELHNCQUFzQixFQUN0QixrQkFBa0IsQ0FDbEI7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUM1QixrQ0FBa0MsQ0FDbEM7WUFDRCxJQUFJLGFBQWEsQ0FDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUMzQixFQUFFLENBQ0Y7U0FDRCxDQUNELENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=