/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as extHostTypes from '../../common/extHostTypes.js';
import { MarkdownString, NotebookCellOutputItem, NotebookData, LanguageSelector, WorkspaceEdit } from '../../common/extHostTypeConverters.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostTypeConverter', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    function size(from) {
        let count = 0;
        for (const key in from) {
            if (Object.prototype.hasOwnProperty.call(from, key)) {
                count += 1;
            }
        }
        return count;
    }
    test('MarkdownConvert - uris', function () {
        let data = MarkdownString.from('Hello');
        assert.strictEqual(isEmptyObject(data.uris), true);
        assert.strictEqual(data.value, 'Hello');
        data = MarkdownString.from('Hello [link](foo)');
        assert.strictEqual(data.value, 'Hello [link](foo)');
        assert.strictEqual(isEmptyObject(data.uris), true); // no scheme, no uri
        data = MarkdownString.from('Hello [link](www.noscheme.bad)');
        assert.strictEqual(data.value, 'Hello [link](www.noscheme.bad)');
        assert.strictEqual(isEmptyObject(data.uris), true); // no scheme, no uri
        data = MarkdownString.from('Hello [link](foo:path)');
        assert.strictEqual(data.value, 'Hello [link](foo:path)');
        assert.strictEqual(size(data.uris), 1);
        assert.ok(!!data.uris['foo:path']);
        data = MarkdownString.from('hello@foo.bar');
        assert.strictEqual(data.value, 'hello@foo.bar');
        assert.strictEqual(size(data.uris), 1);
        // assert.ok(!!data.uris!['mailto:hello@foo.bar']);
        data = MarkdownString.from('*hello* [click](command:me)');
        assert.strictEqual(data.value, '*hello* [click](command:me)');
        assert.strictEqual(size(data.uris), 1);
        assert.ok(!!data.uris['command:me']);
        data = MarkdownString.from('*hello* [click](file:///somepath/here). [click](file:///somepath/here)');
        assert.strictEqual(data.value, '*hello* [click](file:///somepath/here). [click](file:///somepath/here)');
        assert.strictEqual(size(data.uris), 1);
        assert.ok(!!data.uris['file:///somepath/here']);
        data = MarkdownString.from('*hello* [click](file:///somepath/here). [click](file:///somepath/here)');
        assert.strictEqual(data.value, '*hello* [click](file:///somepath/here). [click](file:///somepath/here)');
        assert.strictEqual(size(data.uris), 1);
        assert.ok(!!data.uris['file:///somepath/here']);
        data = MarkdownString.from('*hello* [click](file:///somepath/here). [click](file:///somepath/here2)');
        assert.strictEqual(data.value, '*hello* [click](file:///somepath/here). [click](file:///somepath/here2)');
        assert.strictEqual(size(data.uris), 2);
        assert.ok(!!data.uris['file:///somepath/here']);
        assert.ok(!!data.uris['file:///somepath/here2']);
    });
    test('NPM script explorer running a script from the hover does not work #65561', function () {
        const data = MarkdownString.from('*hello* [click](command:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22external%22%3A%22file%3A%2F%2F%2Fc%253A%2Ffoo%2Fbaz.ex%22%2C%22path%22%3A%22%2Fc%3A%2Ffoo%2Fbaz.ex%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22dev%22%7D)');
        // assert that both uri get extracted but that the latter is only decoded once...
        assert.strictEqual(size(data.uris), 2);
        for (const value of Object.values(data.uris)) {
            if (value.scheme === 'file') {
                assert.ok(URI.revive(value).toString().indexOf('file:///c%3A') === 0);
            }
            else {
                assert.strictEqual(value.scheme, 'command');
            }
        }
    });
    test('Notebook metadata is ignored when using Notebook Serializer #125716', function () {
        const d = new extHostTypes.NotebookData([]);
        d.cells.push(new extHostTypes.NotebookCellData(extHostTypes.NotebookCellKind.Code, 'hello', 'fooLang'));
        d.metadata = { foo: 'bar', bar: 123 };
        const dto = NotebookData.from(d);
        assert.strictEqual(dto.cells.length, 1);
        assert.strictEqual(dto.cells[0].language, 'fooLang');
        assert.strictEqual(dto.cells[0].source, 'hello');
        assert.deepStrictEqual(dto.metadata, d.metadata);
    });
    test('NotebookCellOutputItem', function () {
        const item = extHostTypes.NotebookCellOutputItem.text('Hello', 'foo/bar');
        const dto = NotebookCellOutputItem.from(item);
        assert.strictEqual(dto.mime, 'foo/bar');
        assert.deepStrictEqual(Array.from(dto.valueBytes.buffer), Array.from(new TextEncoder().encode('Hello')));
        const item2 = NotebookCellOutputItem.to(dto);
        assert.strictEqual(item2.mime, item.mime);
        assert.deepStrictEqual(Array.from(item2.data), Array.from(item.data));
    });
    test('LanguageSelector', function () {
        const out = LanguageSelector.from({ language: 'bat', notebookType: 'xxx' });
        assert.ok(typeof out === 'object');
        assert.deepStrictEqual(out, {
            language: 'bat',
            notebookType: 'xxx',
            scheme: undefined,
            pattern: undefined,
            exclusive: undefined,
        });
    });
    test('JS/TS Surround With Code Actions provide bad Workspace Edits when obtained by VSCode Command API #178654', function () {
        const uri = URI.parse('file:///foo/bar');
        const ws = new extHostTypes.WorkspaceEdit();
        ws.set(uri, [extHostTypes.SnippetTextEdit.insert(new extHostTypes.Position(1, 1), new extHostTypes.SnippetString('foo$0bar'))]);
        const dto = WorkspaceEdit.from(ws);
        const first = dto.edits[0];
        assert.strictEqual(first.textEdit.insertAsSnippet, true);
        const ws2 = WorkspaceEdit.to(dto);
        const dto2 = WorkspaceEdit.from(ws2);
        const first2 = dto2.edits[0];
        assert.strictEqual(first2.textEdit.insertAsSnippet, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVDb252ZXJ0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RUeXBlQ29udmVydGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxZQUFZLE1BQU0sOEJBQThCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxLQUFLLENBQUMsc0JBQXNCLEVBQUU7SUFFN0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLElBQUksQ0FBSSxJQUFzQjtRQUN0QyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3hCLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxLQUFLLElBQUksQ0FBQyxDQUFDO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLENBQUMsd0JBQXdCLEVBQUU7UUFFOUIsSUFBSSxJQUFJLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FB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