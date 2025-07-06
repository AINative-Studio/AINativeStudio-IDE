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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2NoYXRQcm9tcHREZWNvZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDL0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQzlHLE9BQU8sRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSw2REFBNkQsQ0FBQztBQUVsSDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsV0FBZ0Q7SUFDMUY7UUFFQyxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBVyxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlDLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEIsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQixNQUFNLGVBQWUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRWxFLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsR0FBRyxDQUMvQixJQUFJLHFCQUFxQixFQUFFLENBQzNCLENBQUM7UUFFRixNQUFNLFFBQVEsR0FBRztZQUNoQixFQUFFO1lBQ0YsUUFBUTtZQUNSLDhDQUE4QztZQUM5QyxFQUFFO1lBQ0Ysa0JBQWtCO1lBQ2xCLHNEQUFzRDtZQUN0RCx1RkFBdUY7WUFDdkYsK0JBQStCO1NBQy9CLENBQUM7UUFFRixNQUFNLElBQUksQ0FBQyxHQUFHLENBQ2IsUUFBUSxFQUNSO1lBQ0MsSUFBSSxhQUFhLENBQ2hCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFDNUIsb0JBQW9CLENBQ3BCO1lBQ0QsSUFBSSxhQUFhLENBQ2hCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDMUIsb0JBQW9CLENBQ3BCO1lBQ0QsSUFBSSxhQUFhLENBQ2hCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFDNUIsZUFBZSxDQUNmO1lBQ0QsSUFBSSxZQUFZLENBQ2YsQ0FBQyxFQUNELENBQUMsRUFDRCxzQkFBc0IsRUFDdEIsa0JBQWtCLENBQ2xCO1lBQ0QsSUFBSSxhQUFhLENBQ2hCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFDNUIsa0NBQWtDLENBQ2xDO1lBQ0QsSUFBSSxhQUFhLENBQ2hCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFDM0IsRUFBRSxDQUNGO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9