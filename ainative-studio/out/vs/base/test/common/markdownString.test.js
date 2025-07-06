/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MarkdownString } from '../../common/htmlContent.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { URI } from '../../common/uri.js';
suite('MarkdownString', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Escape leading whitespace', function () {
        const mds = new MarkdownString();
        mds.appendText('Hello\n    Not a code block');
        assert.strictEqual(mds.value, 'Hello\n\n&nbsp;&nbsp;&nbsp;&nbsp;Not&nbsp;a&nbsp;code&nbsp;block');
    });
    test('MarkdownString.appendText doesn\'t escape quote #109040', function () {
        const mds = new MarkdownString();
        mds.appendText('> Text\n>More');
        assert.strictEqual(mds.value, '\\>&nbsp;Text\n\n\\>More');
    });
    test('appendText', () => {
        const mds = new MarkdownString();
        mds.appendText('# foo\n*bar*');
        assert.strictEqual(mds.value, '\\#&nbsp;foo\n\n\\*bar\\*');
    });
    test('appendLink', function () {
        function assertLink(target, label, title, expected) {
            const mds = new MarkdownString();
            mds.appendLink(target, label, title);
            assert.strictEqual(mds.value, expected);
        }
        assertLink('https://example.com\\()![](file:///Users/jrieken/Code/_samples/devfest/foo/img.png)', 'hello', undefined, '[hello](https://example.com\\(\\)![](file:///Users/jrieken/Code/_samples/devfest/foo/img.png\\))');
        assertLink('https://example.com', 'hello', 'title', '[hello](https://example.com "title")');
        assertLink('foo)', 'hello]', undefined, '[hello\\]](foo\\))');
        assertLink('foo\\)', 'hello]', undefined, '[hello\\]](foo\\))');
        assertLink('fo)o', 'hell]o', undefined, '[hell\\]o](fo\\)o)');
        assertLink('foo)', 'hello]', 'title"', '[hello\\]](foo\\) "title\\"")');
    });
    test('lift', () => {
        const dto = {
            value: 'hello',
            baseUri: URI.file('/foo/bar'),
            supportThemeIcons: true,
            isTrusted: true,
            supportHtml: true,
            uris: {
                [URI.file('/foo/bar2').toString()]: URI.file('/foo/bar2'),
                [URI.file('/foo/bar3').toString()]: URI.file('/foo/bar3')
            }
        };
        const mds = MarkdownString.lift(dto);
        assert.strictEqual(mds.value, dto.value);
        assert.strictEqual(mds.baseUri?.toString(), dto.baseUri?.toString());
        assert.strictEqual(mds.supportThemeIcons, dto.supportThemeIcons);
        assert.strictEqual(mds.isTrusted, dto.isTrusted);
        assert.strictEqual(mds.supportHtml, dto.supportHtml);
        assert.deepStrictEqual(mds.uris, dto.uris);
    });
    test('lift returns new instance', () => {
        const instance = new MarkdownString('hello');
        const mds2 = MarkdownString.lift(instance).appendText('world');
        assert.strictEqual(mds2.value, 'helloworld');
        assert.strictEqual(instance.value, 'hello');
    });
    suite('appendCodeBlock', () => {
        function assertCodeBlock(lang, code, result) {
            const mds = new MarkdownString();
            mds.appendCodeblock(lang, code);
            assert.strictEqual(mds.value, result);
        }
        test('common cases', () => {
            // no backticks
            assertCodeBlock('ts', 'const a = 1;', `\n${[
                '```ts',
                'const a = 1;',
                '```'
            ].join('\n')}\n`);
            // backticks
            assertCodeBlock('ts', 'const a = `1`;', `\n${[
                '```ts',
                'const a = `1`;',
                '```'
            ].join('\n')}\n`);
        });
        // @see https://github.com/microsoft/vscode/issues/193746
        test('escape fence', () => {
            // fence in the first line
            assertCodeBlock('md', '```\n```', `\n${[
                '````md',
                '```\n```',
                '````'
            ].join('\n')}\n`);
            // fence in the middle of code
            assertCodeBlock('md', '\n\n```\n```', `\n${[
                '````md',
                '\n\n```\n```',
                '````'
            ].join('\n')}\n`);
            // longer fence at the end of code
            assertCodeBlock('md', '```\n```\n````\n````', `\n${[
                '`````md',
                '```\n```\n````\n````',
                '`````'
            ].join('\n')}\n`);
        });
    });
    suite('ThemeIcons', () => {
        suite('Support On', () => {
            test('appendText', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: true });
                mds.appendText('$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '\\\\$\\(zap\\)&nbsp;$\\(not&nbsp;a&nbsp;theme&nbsp;icon\\)&nbsp;\\\\$\\(add\\)');
            });
            test('appendMarkdown', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: true });
                mds.appendMarkdown('$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '$(zap) $(not a theme icon) $(add)');
            });
            test('appendMarkdown with escaped icon', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: true });
                mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '\\$(zap) $(not a theme icon) $(add)');
            });
        });
        suite('Support Off', () => {
            test('appendText', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: false });
                mds.appendText('$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '$\\(zap\\)&nbsp;$\\(not&nbsp;a&nbsp;theme&nbsp;icon\\)&nbsp;$\\(add\\)');
            });
            test('appendMarkdown', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: false });
                mds.appendMarkdown('$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '$(zap) $(not a theme icon) $(add)');
            });
            test('appendMarkdown with escaped icon', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: true });
                mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '\\$(zap) $(not a theme icon) $(add)');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TdHJpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9tYXJrZG93blN0cmluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFMUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUU1Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywyQkFBMkIsRUFBRTtRQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsa0VBQWtFLENBQUMsQ0FBQztJQUNuRyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5REFBeUQsRUFBRTtRQUMvRCxNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLDBCQUEwQixDQUFDLENBQUM7SUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUV2QixNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLDJCQUEyQixDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsWUFBWSxFQUFFO1FBRWxCLFNBQVMsVUFBVSxDQUFDLE1BQWMsRUFBRSxLQUFhLEVBQUUsS0FBeUIsRUFBRSxRQUFnQjtZQUM3RixNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ2pDLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELFVBQVUsQ0FDVCxxRkFBcUYsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUN6RyxrR0FBa0csQ0FDbEcsQ0FBQztRQUNGLFVBQVUsQ0FDVCxxQkFBcUIsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUN2QyxzQ0FBc0MsQ0FDdEMsQ0FBQztRQUNGLFVBQVUsQ0FDVCxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFDM0Isb0JBQW9CLENBQ3BCLENBQUM7UUFDRixVQUFVLENBQ1QsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQzdCLG9CQUFvQixDQUNwQixDQUFDO1FBQ0YsVUFBVSxDQUNULE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUMzQixvQkFBb0IsQ0FDcEIsQ0FBQztRQUNGLFVBQVUsQ0FDVCxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFDMUIsK0JBQStCLENBQy9CLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sR0FBRyxHQUFvQjtZQUM1QixLQUFLLEVBQUUsT0FBTztZQUNkLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM3QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsV0FBVyxFQUFFLElBQUk7WUFDakIsSUFBSSxFQUFFO2dCQUNMLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO2dCQUN6RCxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQzthQUN6RDtTQUNELENBQUM7UUFDRixNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0MsTUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDN0IsU0FBUyxlQUFlLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxNQUFjO1lBQ2xFLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7WUFDakMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtZQUN6QixlQUFlO1lBQ2YsZUFBZSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSztnQkFDMUMsT0FBTztnQkFDUCxjQUFjO2dCQUNkLEtBQUs7YUFDTCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsWUFBWTtZQUNaLGVBQWUsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSztnQkFDNUMsT0FBTztnQkFDUCxnQkFBZ0I7Z0JBQ2hCLEtBQUs7YUFDTCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFFSCx5REFBeUQ7UUFDekQsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7WUFDekIsMEJBQTBCO1lBQzFCLGVBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUs7Z0JBQ3RDLFFBQVE7Z0JBQ1IsVUFBVTtnQkFDVixNQUFNO2FBQ04sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLDhCQUE4QjtZQUM5QixlQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLO2dCQUMxQyxRQUFRO2dCQUNSLGNBQWM7Z0JBQ2QsTUFBTTthQUNOLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixrQ0FBa0M7WUFDbEMsZUFBZSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRSxLQUFLO2dCQUNsRCxTQUFTO2dCQUNULHNCQUFzQjtnQkFDdEIsT0FBTzthQUNQLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFFeEIsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7WUFFeEIsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQ3ZCLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ3ZFLEdBQUcsQ0FBQyxVQUFVLENBQUMsbUNBQW1DLENBQUMsQ0FBQztnQkFFcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLGdGQUFnRixDQUFDLENBQUM7WUFDakgsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO2dCQUMzQixNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RSxHQUFHLENBQUMsY0FBYyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7Z0JBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ3BFLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtnQkFDN0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDdkUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO2dCQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUscUNBQXFDLENBQUMsQ0FBQztZQUN0RSxDQUFDLENBQUMsQ0FBQztRQUVKLENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7WUFFekIsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQ3ZCLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQ3hFLEdBQUcsQ0FBQyxVQUFVLENBQUMsbUNBQW1DLENBQUMsQ0FBQztnQkFFcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLHdFQUF3RSxDQUFDLENBQUM7WUFDekcsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO2dCQUMzQixNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUN4RSxHQUFHLENBQUMsY0FBYyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7Z0JBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ3BFLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtnQkFDN0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDdkUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO2dCQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUscUNBQXFDLENBQUMsQ0FBQztZQUN0RSxDQUFDLENBQUMsQ0FBQztRQUVKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9