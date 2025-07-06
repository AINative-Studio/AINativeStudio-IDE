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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9jaGF0UHJvbXB0RGVjb2Rlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDM0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQy9GLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQW9CLE1BQU0sNkRBQTZELENBQUM7QUFFbEg7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0gsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFdBQWdEO0lBQzFGO1FBRUMsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQVcsSUFBSSxDQUFDLENBQUM7UUFDbEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU5QyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsTUFBTSxlQUFlLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUVsRSxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FDL0IsSUFBSSxxQkFBcUIsRUFBRSxDQUMzQixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUc7WUFDaEIsRUFBRTtZQUNGLFFBQVE7WUFDUiw4Q0FBOEM7WUFDOUMsRUFBRTtZQUNGLGtCQUFrQjtZQUNsQixzREFBc0Q7WUFDdEQsdUZBQXVGO1lBQ3ZGLCtCQUErQjtTQUMvQixDQUFDO1FBRUYsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUNiLFFBQVEsRUFDUjtZQUNDLElBQUksYUFBYSxDQUNoQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQzVCLG9CQUFvQixDQUNwQjtZQUNELElBQUksYUFBYSxDQUNoQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQzFCLG9CQUFvQixDQUNwQjtZQUNELElBQUksYUFBYSxDQUNoQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQzVCLGVBQWUsQ0FDZjtZQUNELElBQUksWUFBWSxDQUNmLENBQUMsRUFDRCxDQUFDLEVBQ0Qsc0JBQXNCLEVBQ3RCLGtCQUFrQixDQUNsQjtZQUNELElBQUksYUFBYSxDQUNoQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQzVCLGtDQUFrQyxDQUNsQztZQUNELElBQUksYUFBYSxDQUNoQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQzNCLEVBQUUsQ0FDRjtTQUNELENBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==