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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvdG9rZW5zL21hcmtkb3duTGluay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUZBQW1GLENBQUM7QUFDakgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUVuSCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztRQUN2RSxNQUFNLElBQUksR0FBRyxvQkFBb0Is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