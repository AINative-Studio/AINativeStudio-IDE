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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy90b2tlbnMvbWFya2Rvd25MaW5rLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDNUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUNqSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBRW5ILEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDeEIsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDO1FBQ3ZFLE1BQU0sSUFBSSxHQUFHLG9C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