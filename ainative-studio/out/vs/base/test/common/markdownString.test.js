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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TdHJpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL21hcmtkb3duU3RyaW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDOUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUxQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBRTVCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFO1FBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDakMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxrRUFBa0UsQ0FBQyxDQUFDO0lBQ25HLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHlEQUF5RCxFQUFFO1FBQy9ELE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDakMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBRXZCLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxFQUFF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