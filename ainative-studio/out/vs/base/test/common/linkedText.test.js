/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { parseLinkedText } from '../../common/linkedText.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('LinkedText', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parses correctly', () => {
        assert.deepStrictEqual(parseLinkedText('').nodes, []);
        assert.deepStrictEqual(parseLinkedText('hello').nodes, ['hello']);
        assert.deepStrictEqual(parseLinkedText('hello there').nodes, ['hello there']);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href).').nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href' },
            '.'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href "and a title").').nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href', title: 'and a title' },
            '.'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href \'and a title\').').nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href', title: 'and a title' },
            '.'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href "and a \'title\'").').nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href', title: 'and a \'title\'' },
            '.'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href \'and a "title"\').').nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href', title: 'and a "title"' },
            '.'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](random stuff).').nodes, [
            'Some message with [link text](random stuff).'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [https link](https://link.href).').nodes, [
            'Some message with ',
            { label: 'https link', href: 'https://link.href' },
            '.'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [https link](https:).').nodes, [
            'Some message with [https link](https:).'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [a command](command:foobar).').nodes, [
            'Some message with ',
            { label: 'a command', href: 'command:foobar' },
            '.'
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [a command](command:).').nodes, [
            'Some message with [a command](command:).'
        ]);
        assert.deepStrictEqual(parseLinkedText('link [one](command:foo "nice") and link [two](http://foo)...').nodes, [
            'link ',
            { label: 'one', href: 'command:foo', title: 'nice' },
            ' and link ',
            { label: 'two', href: 'http://foo' },
            '...'
        ]);
        assert.deepStrictEqual(parseLinkedText('link\n[one](command:foo "nice")\nand link [two](http://foo)...').nodes, [
            'link\n',
            { label: 'one', href: 'command:foo', title: 'nice' },
            '\nand link ',
            { label: 'two', href: 'http://foo' },
            '...'
        ]);
    });
    test('Should match non-greedily', () => {
        assert.deepStrictEqual(parseLinkedText('a [link text 1](http://link.href "title1") b [link text 2](http://link.href "title2") c').nodes, [
            'a ',
            { label: 'link text 1', href: 'http://link.href', title: 'title1' },
            ' b ',
            { label: 'link text 2', href: 'http://link.href', title: 'title2' },
            ' c',
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkVGV4dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2xpbmtlZFRleHQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUM5RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxrREFBa0QsQ0FBQyxDQUFDLEtBQUssRUFBRTtZQUNqRyxvQkFBb0I7WUFDcEIsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUNoRCxHQUFHO1NBQ0gsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsZ0VBQWdFLENBQUMsQ0FBQyxLQUFLLEVBQUU7WUFDL0cs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