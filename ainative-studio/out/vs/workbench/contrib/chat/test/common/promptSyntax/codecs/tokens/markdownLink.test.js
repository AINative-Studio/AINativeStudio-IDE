/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { randomInt } from '../../../../../../../../base/common/numbers.js';
import { Range } from '../../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../base/test/common/utils.js';
import { MarkdownLink } from '../../../../../../../../editor/common/codecs/markdownCodec/tokens/markdownLink.js';
import { BaseToken } from '../../../../../../../../editor/common/codecs/baseToken.js';
import { MarkdownToken } from '../../../../../../../../editor/common/codecs/markdownCodec/tokens/markdownToken.js';
suite('FileReference', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('`linkRange`', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const caption = `[link-caption-${randomInt(Number.MAX_SAFE_INTEGER)}]`;
        const link = `(/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.md)`;
        const markdownLink = new MarkdownLink(lineNumber, columnStartNumber, caption, link);
        const { linkRange } = markdownLink;
        assertDefined(linkRange, 'The link range must be defined.');
        const expectedLinkRange = new Range(lineNumber, 
        // `+1` for the openning `(` character of the link
        columnStartNumber + caption.length + 1, lineNumber, 
        // `+1` for the openning `(` character of the link, and
        // `-2` for the enclosing `()` part of the link
        columnStartNumber + caption.length + 1 + link.length - 2);
        assert(expectedLinkRange.equalsRange(linkRange), `Expected link range to be ${expectedLinkRange}, got ${linkRange}.`);
    });
    test('`path`', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const caption = `[link-caption-${randomInt(Number.MAX_SAFE_INTEGER)}]`;
        const rawLink = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.md`;
        const link = `(${rawLink})`;
        const markdownLink = new MarkdownLink(lineNumber, columnStartNumber, caption, link);
        const { path } = markdownLink;
        assert.strictEqual(path, rawLink, 'Must return the correct link value.');
    });
    test('extends `MarkdownToken`', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const caption = `[link-caption-${randomInt(Number.MAX_SAFE_INTEGER)}]`;
        const rawLink = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.md`;
        const link = `(${rawLink})`;
        const markdownLink = new MarkdownLink(lineNumber, columnStartNumber, caption, link);
        assert(markdownLink instanceof MarkdownToken, 'Must extend `MarkdownToken`.');
        assert(markdownLink instanceof BaseToken, 'Must extend `BaseToken`.');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3Rva2Vucy9tYXJrZG93bkxpbmsudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1GQUFtRixDQUFDO0FBQ2pILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFFbkgsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUM7UUFDdkUsTUFBTSxJQUFJLEdBQUcsb0JBQW9C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