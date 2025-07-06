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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9zdXBwb3J0cy90b2tlbml6YXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRTVMLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFFbEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1FBQ3BELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQztZQUNoRCxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO1lBQ3pELEVBQUUsS0FBSyxFQUFFLDBDQUEwQyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUU7WUFDM0UsRUFBRSxLQUFLLEVBQUUsK0JBQStCLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtTQUNoRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRVAsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNoQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6QixNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXBDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsMENBQTBDLENBQUMsQ0FBQztRQUV4RSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLG9CQUFvQix5QkFBaUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsdUJBQXVCLENBQUM7WUFDaEQsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN6RCxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN6QyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUM1QyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN0QyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN0QyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRTtZQUNuQyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO1lBQ2hFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUU7WUFDbkQsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRTtZQUNwRCxFQUFFLEtBQUssRUFBRSxzQkFBc0IsRUFBRSxTQUFTLEVBQUUsdUJBQXVCLEVBQUU7WUFDckUsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixFQUFFO1lBQ2xFLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN0RSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUU7U0FDcEUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVQLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7UUFDaEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXBDLFNBQVMsV0FBVyxDQUFDLFNBQWlCLEVBQUUsUUFBOEI7WUFDckUsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2pGLENBQUM7UUFFRCxTQUFTLGlCQUFpQixDQUFDLFNBQWlCLEVBQUUsU0FBb0IsRUFBRSxVQUFrQixFQUFFLFVBQWtCO1lBQ3pHLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDckYsQ0FBQztRQUVELFNBQVMsYUFBYSxDQUFDLFNBQWlCO1lBQ3ZDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xCLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QixhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFdkIsaUJBQWlCO1FBQ2pCLGlCQUFpQixDQUFDLFFBQVEsMEJBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRCxpQkFBaUIsQ0FBQyxXQUFXLDBCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdkQsaUJBQWlCLENBQUMsWUFBWSwwQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXhELG9CQUFvQjtRQUNwQixpQkFBaUIsQ0FBQyxXQUFXLDBCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdkQsaUJBQWlCLENBQUMsY0FBYywwQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFELGlCQUFpQixDQUFDLGVBQWUsMEJBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUzRCxjQUFjO1FBQ2QsaUJBQWlCLENBQUMsS0FBSywwQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELGlCQUFpQixDQUFDLFFBQVEsMEJBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRCxpQkFBaUIsQ0FBQyxTQUFTLDBCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFckQsbUJBQW1CO1FBQ25CLGlCQUFpQixDQUFDLFVBQVUsNEJBQW9CLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RCxpQkFBaUIsQ0FBQyxpQkFBaUIsNEJBQW9CLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvRCxpQkFBaUIsQ0FBQyxjQUFjLDRCQUFvQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFNUQsMkJBQTJCO1FBQzNCLGlCQUFpQixDQUFDLGtCQUFrQiw0QkFBb0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLGlCQUFpQixDQUFDLHNCQUFzQiw0QkFBb0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXBFLCtCQUErQjtRQUMvQixpQkFBaUIsQ0FBQyxzQkFBc0IsMEJBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsRSxpQkFBaUIsQ0FBQywwQkFBMEIsMEJBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV0RSwrQkFBK0I7UUFDL0IsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUsaURBQWlDLDhCQUFzQixFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzRyxpQkFBaUIsQ0FBQywwQkFBMEIsRUFBRSxpREFBaUMsOEJBQXNCLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRS9HLCtCQUErQjtRQUMvQixpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSx3REFBd0MsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUYsaUJBQWlCLENBQUMsMEJBQTBCLEVBQUUsd0RBQXdDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWhHLCtCQUErQjtRQUMvQixpQkFBaUIsQ0FBQyxzQkFBc0IsMEJBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsRSxpQkFBaUIsQ0FBQywwQkFBMEIsMEJBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV0RSw2QkFBNkI7UUFDN0IsaUJBQWlCLENBQUMsb0JBQW9CLDBCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEUsaUJBQWlCLENBQUMsd0JBQXdCLDBCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFcEUsb0NBQW9DO1FBQ3BDLGlCQUFpQixDQUFDLHFCQUFxQiwwQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLGlCQUFpQixDQUFDLGdCQUFnQiwwQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVELGlCQUFpQixDQUFDLFNBQVMsMEJBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVyRCxpQkFBaUIsQ0FBQyxLQUFLLDBCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFFakMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUV0QixNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUM7WUFDOUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN6RCxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN6QyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUM1QyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN0QyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN0QyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRTtZQUNuQyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO1lBQ2hFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUU7WUFDbkQsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRTtZQUNwRCxFQUFFLEtBQUssRUFBRSxzQkFBc0IsRUFBRSxTQUFTLEVBQUUsdUJBQXVCLEVBQUU7WUFDckUsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO1NBQ3RFLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHO1lBQ2hCLElBQUksb0JBQW9CLENBQUMsRUFBRSxFQUFFLENBQUMsNkJBQW9CLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDckUsSUFBSSxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyw2QkFBb0IsSUFBSSxFQUFFLFFBQVEsQ0FBQztZQUN2RSxJQUFJLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDLDZCQUFvQixJQUFJLEVBQUUsUUFBUSxDQUFDO1lBQzFFLElBQUksb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUMsNkJBQW9CLElBQUksRUFBRSxRQUFRLENBQUM7WUFDcEUsSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyw2QkFBb0IsSUFBSSxFQUFFLFFBQVEsQ0FBQztZQUNwRSxJQUFJLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDLDBCQUFrQixJQUFJLEVBQUUsSUFBSSxDQUFDO1lBQzlELElBQUksb0JBQW9CLENBQUMsVUFBVSxFQUFFLENBQUMsNEJBQW9CLFFBQVEsRUFBRSxJQUFJLENBQUM7WUFDekUsSUFBSSxvQkFBb0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLDZCQUFvQixRQUFRLEVBQUUsSUFBSSxDQUFDO1lBQ2pGLElBQUksb0JBQW9CLENBQUMsc0JBQXNCLEVBQUUsQ0FBQywwQkFBa0IsSUFBSSxFQUFFLElBQUksQ0FBQztZQUMvRSxJQUFJLG9CQUFvQixDQUFDLHNCQUFzQixFQUFFLENBQUMsRUFBRSxpREFBaUMsOEJBQXNCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztZQUN4SCxJQUFJLG9CQUFvQixDQUFDLHNCQUFzQixFQUFFLEVBQUUsMEJBQWtCLFFBQVEsRUFBRSxJQUFJLENBQUM7U0FDcEYsQ0FBQztRQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBRW5DLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU5RCxNQUFNLFFBQVEsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDN0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNoQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxJQUFJLHdCQUF3QixDQUFDLElBQUksb0JBQW9CLHlCQUFpQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RJLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsMEJBQTBCLENBQUM7WUFDcEQsSUFBSSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLDZCQUFvQixJQUFJLEVBQUUsSUFBSSxDQUFDO1NBQzlELEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDUCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEksQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQztZQUNwRCxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsMEJBQWtCLElBQUksRUFBRSxJQUFJLENBQUM7U0FDNUQsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNQLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7UUFDaEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLG9CQUFvQix5QkFBaUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0SSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLDBCQUEwQixDQUFDO1lBQ3BELElBQUksb0JBQW9CLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQywwQkFBa0IsSUFBSSxFQUFFLElBQUksQ0FBQztTQUM1RCxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ1AsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNoQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxJQUFJLHdCQUF3QixDQUFDLElBQUksb0JBQW9CLHlCQUFpQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RJLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsMEJBQTBCLENBQUM7WUFDcEQsSUFBSSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLDZCQUFvQixRQUFRLEVBQUUsSUFBSSxDQUFDO1NBQ2xFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDUCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEksQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQztZQUNwRCxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsNkJBQW9CLElBQUksRUFBRSxRQUFRLENBQUM7U0FDbEUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNQLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7UUFDaEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLG9CQUFvQix5QkFBaUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0SSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLDBCQUEwQixDQUFDO1lBQ3BELElBQUksb0JBQW9CLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyw2QkFBb0IsSUFBSSxFQUFFLFFBQVEsQ0FBQztZQUNsRSxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsNkJBQW9CLFFBQVEsRUFBRSxJQUFJLENBQUM7WUFDbEUsSUFBSSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLDBCQUFrQixJQUFJLEVBQUUsSUFBSSxDQUFDO1NBQzVELEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDUCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEksQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQztZQUNwRCxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsNkJBQW9CLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDdEUsSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLDZCQUFvQixRQUFRLEVBQUUsSUFBSSxDQUFDO1NBQ3JFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDUCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtZQUMzRixLQUFLLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLG9CQUFvQix5QkFBaUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3JGLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQztZQUNwRCxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsNkJBQW9CLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDdEUsSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQywwQkFBa0IsSUFBSSxFQUFFLElBQUksQ0FBQztZQUM5RCxJQUFJLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDLDZCQUFvQixRQUFRLEVBQUUsSUFBSSxDQUFDO1NBQ3BFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDUCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtZQUMzRixLQUFLLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLG9CQUFvQix5QkFBaUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3JGLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQztZQUNwRCxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsNkJBQW9CLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDdEUsSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLDBCQUFrQixRQUFRLEVBQUUsSUFBSSxDQUFDO1lBQ25FLElBQUksb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLDZCQUFvQixRQUFRLEVBQUUsSUFBSSxDQUFDO1NBQ2hGLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDUCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxJQUFJLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLG9CQUFvQix5QkFBaUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzNGLEtBQUssRUFBRSxJQUFJLHdCQUF3QixDQUFDLElBQUksb0JBQW9CLHlCQUFpQixFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ3JGLFlBQVksRUFBRSxJQUFJLHdCQUF3QixDQUFDLElBQUksb0JBQW9CLHlCQUFpQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDNUYsQ0FBQztTQUNGLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQztZQUNwRCxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsNkJBQW9CLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDdEUsSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLDBCQUFrQixRQUFRLEVBQUUsSUFBSSxDQUFDO1lBQ25FLElBQUksb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLDZCQUFvQixRQUFRLEVBQUUsSUFBSSxDQUFDO1lBQ2hGLElBQUksb0JBQW9CLENBQUMsVUFBVSxFQUFFLENBQUMsNEJBQW9CLFFBQVEsRUFBRSxJQUFJLENBQUM7WUFDekUsSUFBSSxvQkFBb0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLDZCQUFvQixRQUFRLEVBQUUsSUFBSSxDQUFDO1lBQ2pGLElBQUksb0JBQW9CLENBQUMsc0JBQXNCLEVBQUUsQ0FBQywwQkFBa0IsSUFBSSxFQUFFLElBQUksQ0FBQztZQUMvRSxJQUFJLG9CQUFvQixDQUFDLHNCQUFzQixFQUFFLENBQUMsRUFBRSxpREFBaUMsOEJBQXNCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztZQUN4SCxJQUFJLG9CQUFvQixDQUFDLHNCQUFzQixFQUFFLENBQUMsMEJBQWtCLFFBQVEsRUFBRSxJQUFJLENBQUM7U0FDbkYsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNQLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7UUFDaEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLElBQUksR0FBRyxJQUFJLHdCQUF3QixDQUFDLElBQUksb0JBQW9CLHlCQUFpQixFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDM0YsS0FBSyxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtnQkFDckYsWUFBWSxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUM1RixDQUFDO1lBQ0YsVUFBVSxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IsMkJBQW1CLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtnQkFDNUYsU0FBUyxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IsMkJBQW1CLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtvQkFDM0YsS0FBSyxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IseUJBQWlCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDckYsS0FBSyxFQUFFLElBQUksd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxpREFBaUMsOEJBQXNCLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUM5SCxLQUFLLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLG9CQUFvQix5QkFBaUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNyRixDQUFDO2FBQ0YsQ0FBQztTQUNGLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1FBQ2pELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQztZQUNwRCxJQUFJLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsNkJBQW9CLFFBQVEsRUFBRSxJQUFJLENBQUM7U0FDckUsRUFBRTtZQUNGLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUTtTQUM1QixDQUFDLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekIsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6QixRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9