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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkVGV4dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbGlua2VkVGV4dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLGtEQUFrRCxDQUFDLENBQUMsS0FBSyxFQUFFO1lBQ2pHLG9CQUFvQjtZQUNwQixFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ2hELEdBQUc7U0FDSCxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDLEtBQUssRUFBRTtZQUMvRyxvQkFB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