/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ColorMap, ExternalThemeTrieElement, ParsedTokenThemeRule, ThemeTrieElementRule, TokenTheme, parseTokenTheme, strcmp } from '../../../../common/languages/supports/tokenization.js';
suite('Token theme matching', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('gives higher priority to deeper matches', () => {
        const theme = TokenTheme.createFromRawTokenTheme([
            { token: '', foreground: '100000', background: '200000' },
            { token: 'punctuation.definition.string.begin.html', foreground: '300000' },
            { token: 'punctuation.definition.string', foreground: '400000' },
        ], []);
        const colorMap = new ColorMap();
        colorMap.getId('100000');
        const _B = colorMap.getId('200000');
        colorMap.getId('400000');
        const _D = colorMap.getId('300000');
        const actual = theme._match('punctuation.definition.string.begin.html');
        assert.deepStrictEqual(actual, new ThemeTrieElementRule(0 /* FontStyle.None */, _D, _B));
    });
    test('can match', () => {
        const theme = TokenTheme.createFromRawTokenTheme([
            { token: '', foreground: 'F8F8F2', background: '272822' },
            { token: 'source', background: '100000' },
            { token: 'something', background: '100000' },
            { token: 'bar', background: '200000' },
            { token: 'baz', background: '200000' },
            { token: 'bar', fontStyle: 'bold' },
            { token: 'constant', fontStyle: 'italic', foreground: '300000' },
            { token: 'constant.numeric', foreground: '400000' },
            { token: 'constant.numeric.hex', fontStyle: 'bold' },
            { token: 'constant.numeric.oct', fontStyle: 'bold italic underline' },
            { token: 'constant.numeric.bin', fontStyle: 'bold strikethrough' },
            { token: 'constant.numeric.dec', fontStyle: '', foreground: '500000' },
            { token: 'storage.object.bar', fontStyle: '', foreground: '600000' },
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('200000');
        const _D = colorMap.getId('300000');
        const _E = colorMap.getId('400000');
        const _F = colorMap.getId('500000');
        const _G = colorMap.getId('100000');
        const _H = colorMap.getId('600000');
        function assertMatch(scopeName, expected) {
            const actual = theme._match(scopeName);
            assert.deepStrictEqual(actual, expected, 'when matching <<' + scopeName + '>>');
        }
        function assertSimpleMatch(scopeName, fontStyle, foreground, background) {
            assertMatch(scopeName, new ThemeTrieElementRule(fontStyle, foreground, background));
        }
        function assertNoMatch(scopeName) {
            assertMatch(scopeName, new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B));
        }
        // matches defaults
        assertNoMatch('');
        assertNoMatch('bazz');
        assertNoMatch('asdfg');
        // matches source
        assertSimpleMatch('source', 0 /* FontStyle.None */, _A, _G);
        assertSimpleMatch('source.ts', 0 /* FontStyle.None */, _A, _G);
        assertSimpleMatch('source.tss', 0 /* FontStyle.None */, _A, _G);
        // matches something
        assertSimpleMatch('something', 0 /* FontStyle.None */, _A, _G);
        assertSimpleMatch('something.ts', 0 /* FontStyle.None */, _A, _G);
        assertSimpleMatch('something.tss', 0 /* FontStyle.None */, _A, _G);
        // matches baz
        assertSimpleMatch('baz', 0 /* FontStyle.None */, _A, _C);
        assertSimpleMatch('baz.ts', 0 /* FontStyle.None */, _A, _C);
        assertSimpleMatch('baz.tss', 0 /* FontStyle.None */, _A, _C);
        // matches constant
        assertSimpleMatch('constant', 1 /* FontStyle.Italic */, _D, _B);
        assertSimpleMatch('constant.string', 1 /* FontStyle.Italic */, _D, _B);
        assertSimpleMatch('constant.hex', 1 /* FontStyle.Italic */, _D, _B);
        // matches constant.numeric
        assertSimpleMatch('constant.numeric', 1 /* FontStyle.Italic */, _E, _B);
        assertSimpleMatch('constant.numeric.baz', 1 /* FontStyle.Italic */, _E, _B);
        // matches constant.numeric.hex
        assertSimpleMatch('constant.numeric.hex', 2 /* FontStyle.Bold */, _E, _B);
        assertSimpleMatch('constant.numeric.hex.baz', 2 /* FontStyle.Bold */, _E, _B);
        // matches constant.numeric.oct
        assertSimpleMatch('constant.numeric.oct', 2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, _E, _B);
        assertSimpleMatch('constant.numeric.oct.baz', 2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, _E, _B);
        // matches constant.numeric.bin
        assertSimpleMatch('constant.numeric.bin', 2 /* FontStyle.Bold */ | 8 /* FontStyle.Strikethrough */, _E, _B);
        assertSimpleMatch('constant.numeric.bin.baz', 2 /* FontStyle.Bold */ | 8 /* FontStyle.Strikethrough */, _E, _B);
        // matches constant.numeric.dec
        assertSimpleMatch('constant.numeric.dec', 0 /* FontStyle.None */, _F, _B);
        assertSimpleMatch('constant.numeric.dec.baz', 0 /* FontStyle.None */, _F, _B);
        // matches storage.object.bar
        assertSimpleMatch('storage.object.bar', 0 /* FontStyle.None */, _H, _B);
        assertSimpleMatch('storage.object.bar.baz', 0 /* FontStyle.None */, _H, _B);
        // does not match storage.object.bar
        assertSimpleMatch('storage.object.bart', 0 /* FontStyle.None */, _A, _B);
        assertSimpleMatch('storage.object', 0 /* FontStyle.None */, _A, _B);
        assertSimpleMatch('storage', 0 /* FontStyle.None */, _A, _B);
        assertSimpleMatch('bar', 2 /* FontStyle.Bold */, _A, _C);
    });
});
suite('Token theme parsing', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('can parse', () => {
        const actual = parseTokenTheme([
            { token: '', foreground: 'F8F8F2', background: '272822' },
            { token: 'source', background: '100000' },
            { token: 'something', background: '100000' },
            { token: 'bar', background: '010000' },
            { token: 'baz', background: '010000' },
            { token: 'bar', fontStyle: 'bold' },
            { token: 'constant', fontStyle: 'italic', foreground: 'ff0000' },
            { token: 'constant.numeric', foreground: '00ff00' },
            { token: 'constant.numeric.hex', fontStyle: 'bold' },
            { token: 'constant.numeric.oct', fontStyle: 'bold italic underline' },
            { token: 'constant.numeric.dec', fontStyle: '', foreground: '0000ff' },
        ]);
        const expected = [
            new ParsedTokenThemeRule('', 0, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('source', 1, -1 /* FontStyle.NotSet */, null, '100000'),
            new ParsedTokenThemeRule('something', 2, -1 /* FontStyle.NotSet */, null, '100000'),
            new ParsedTokenThemeRule('bar', 3, -1 /* FontStyle.NotSet */, null, '010000'),
            new ParsedTokenThemeRule('baz', 4, -1 /* FontStyle.NotSet */, null, '010000'),
            new ParsedTokenThemeRule('bar', 5, 2 /* FontStyle.Bold */, null, null),
            new ParsedTokenThemeRule('constant', 6, 1 /* FontStyle.Italic */, 'ff0000', null),
            new ParsedTokenThemeRule('constant.numeric', 7, -1 /* FontStyle.NotSet */, '00ff00', null),
            new ParsedTokenThemeRule('constant.numeric.hex', 8, 2 /* FontStyle.Bold */, null, null),
            new ParsedTokenThemeRule('constant.numeric.oct', 9, 2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, null, null),
            new ParsedTokenThemeRule('constant.numeric.dec', 10, 0 /* FontStyle.None */, '0000ff', null),
        ];
        assert.deepStrictEqual(actual, expected);
    });
});
suite('Token theme resolving', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('strcmp works', () => {
        const actual = ['bar', 'z', 'zu', 'a', 'ab', ''].sort(strcmp);
        const expected = ['', 'a', 'ab', 'bar', 'z', 'zu'];
        assert.deepStrictEqual(actual, expected);
    });
    test('always has defaults', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('respects incoming defaults 1', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, null, null)
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('respects incoming defaults 2', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, 0 /* FontStyle.None */, null, null)
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('respects incoming defaults 3', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, 2 /* FontStyle.Bold */, null, null)
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _A, _B)));
    });
    test('respects incoming defaults 4', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'ff0000', null)
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('ff0000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('respects incoming defaults 5', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, null, 'ff0000')
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ff0000');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('can merge incoming defaults', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, null, 'ff0000'),
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, '00ff00', null),
            new ParsedTokenThemeRule('', -1, 2 /* FontStyle.Bold */, null, null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('00ff00');
        const _B = colorMap.getId('ff0000');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _A, _B)));
    });
    test('defaults are inherited', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('var', -1, -1 /* FontStyle.NotSet */, 'ff0000', null)
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('ff0000');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        const root = new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B), {
            'var': new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _C, _B))
        });
        assert.deepStrictEqual(actual.getThemeTrieElement(), root);
    });
    test('same rules get merged', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('var', 1, 2 /* FontStyle.Bold */, null, null),
            new ParsedTokenThemeRule('var', 0, -1 /* FontStyle.NotSet */, 'ff0000', null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('ff0000');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        const root = new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B), {
            'var': new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _C, _B))
        });
        assert.deepStrictEqual(actual.getThemeTrieElement(), root);
    });
    test('rules are inherited 1', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('var', -1, 2 /* FontStyle.Bold */, 'ff0000', null),
            new ParsedTokenThemeRule('var.identifier', -1, -1 /* FontStyle.NotSet */, '00ff00', null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('ff0000');
        const _D = colorMap.getId('00ff00');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        const root = new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B), {
            'var': new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _C, _B), {
                'identifier': new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _D, _B))
            })
        });
        assert.deepStrictEqual(actual.getThemeTrieElement(), root);
    });
    test('rules are inherited 2', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('var', -1, 2 /* FontStyle.Bold */, 'ff0000', null),
            new ParsedTokenThemeRule('var.identifier', -1, -1 /* FontStyle.NotSet */, '00ff00', null),
            new ParsedTokenThemeRule('constant', 4, 1 /* FontStyle.Italic */, '100000', null),
            new ParsedTokenThemeRule('constant.numeric', 5, -1 /* FontStyle.NotSet */, '200000', null),
            new ParsedTokenThemeRule('constant.numeric.hex', 6, 2 /* FontStyle.Bold */, null, null),
            new ParsedTokenThemeRule('constant.numeric.oct', 7, 2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, null, null),
            new ParsedTokenThemeRule('constant.numeric.dec', 8, 0 /* FontStyle.None */, '300000', null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('100000');
        const _D = colorMap.getId('200000');
        const _E = colorMap.getId('300000');
        const _F = colorMap.getId('ff0000');
        const _G = colorMap.getId('00ff00');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        const root = new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B), {
            'var': new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _F, _B), {
                'identifier': new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _G, _B))
            }),
            'constant': new ExternalThemeTrieElement(new ThemeTrieElementRule(1 /* FontStyle.Italic */, _C, _B), {
                'numeric': new ExternalThemeTrieElement(new ThemeTrieElementRule(1 /* FontStyle.Italic */, _D, _B), {
                    'hex': new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _D, _B)),
                    'oct': new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, _D, _B)),
                    'dec': new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _E, _B)),
                })
            })
        });
        assert.deepStrictEqual(actual.getThemeTrieElement(), root);
    });
    test('custom colors are first in color map', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('var', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', null)
        ], [
            '000000', 'FFFFFF', '0F0F0F'
        ]);
        const colorMap = new ColorMap();
        colorMap.getId('000000');
        colorMap.getId('FFFFFF');
        colorMap.getId('0F0F0F');
        colorMap.getId('F8F8F2');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL3N1cHBvcnRzL3Rva2VuaXphdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFNUwsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUVsQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDcEQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1lBQ2hELEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUU7WUFDekQsRUFBRSxLQUFLLEVBQUUsMENBQTBDLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUMzRSxFQUFFLEtBQUssRUFBRSwrQkFBK0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO1NBQ2hFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFUCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekIsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztR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