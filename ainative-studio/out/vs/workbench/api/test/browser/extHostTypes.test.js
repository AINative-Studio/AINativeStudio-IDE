/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import * as types from '../../common/extHostTypes.js';
import { isWindows } from '../../../../base/common/platform.js';
import { assertType } from '../../../../base/common/types.js';
import { Mimes } from '../../../../base/common/mime.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
function assertToJSON(a, expected) {
    const raw = JSON.stringify(a);
    const actual = JSON.parse(raw);
    assert.deepStrictEqual(actual, expected);
}
suite('ExtHostTypes', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('URI, toJSON', function () {
        const uri = URI.parse('file:///path/test.file');
        assert.deepStrictEqual(uri.toJSON(), {
            $mid: 1 /* MarshalledId.Uri */,
            scheme: 'file',
            path: '/path/test.file'
        });
        assert.ok(uri.fsPath);
        assert.deepStrictEqual(uri.toJSON(), {
            $mid: 1 /* MarshalledId.Uri */,
            scheme: 'file',
            path: '/path/test.file',
            fsPath: '/path/test.file'.replace(/\//g, isWindows ? '\\' : '/'),
            _sep: isWindows ? 1 : undefined,
        });
        assert.ok(uri.toString());
        assert.deepStrictEqual(uri.toJSON(), {
            $mid: 1 /* MarshalledId.Uri */,
            scheme: 'file',
            path: '/path/test.file',
            fsPath: '/path/test.file'.replace(/\//g, isWindows ? '\\' : '/'),
            _sep: isWindows ? 1 : undefined,
            external: 'file:///path/test.file'
        });
    });
    test('Disposable', () => {
        let count = 0;
        const d = new types.Disposable(() => {
            count += 1;
            return 12;
        });
        d.dispose();
        assert.strictEqual(count, 1);
        d.dispose();
        assert.strictEqual(count, 1);
        types.Disposable.from(undefined, { dispose() { count += 1; } }).dispose();
        assert.strictEqual(count, 2);
        assert.throws(() => {
            new types.Disposable(() => {
                throw new Error();
            }).dispose();
        });
        new types.Disposable(undefined).dispose();
    });
    test('Position', () => {
        assert.throws(() => new types.Position(-1, 0));
        assert.throws(() => new types.Position(0, -1));
        const pos = new types.Position(0, 0);
        assert.throws(() => pos.line = -1);
        assert.throws(() => pos.character = -1);
        assert.throws(() => pos.line = 12);
        const { line, character } = pos.toJSON();
        assert.strictEqual(line, 0);
        assert.strictEqual(character, 0);
    });
    test('Position, toJSON', function () {
        const pos = new types.Position(4, 2);
        assertToJSON(pos, { line: 4, character: 2 });
    });
    test('Position, isBefore(OrEqual)?', function () {
        const p1 = new types.Position(1, 3);
        const p2 = new types.Position(1, 2);
        const p3 = new types.Position(0, 4);
        assert.ok(p1.isBeforeOrEqual(p1));
        assert.ok(!p1.isBefore(p1));
        assert.ok(p2.isBefore(p1));
        assert.ok(p3.isBefore(p2));
    });
    test('Position, isAfter(OrEqual)?', function () {
        const p1 = new types.Position(1, 3);
        const p2 = new types.Position(1, 2);
        const p3 = new types.Position(0, 4);
        assert.ok(p1.isAfterOrEqual(p1));
        assert.ok(!p1.isAfter(p1));
        assert.ok(p1.isAfter(p2));
        assert.ok(p2.isAfter(p3));
        assert.ok(p1.isAfter(p3));
    });
    test('Position, compareTo', function () {
        const p1 = new types.Position(1, 3);
        const p2 = new types.Position(1, 2);
        const p3 = new types.Position(0, 4);
        assert.strictEqual(p1.compareTo(p1), 0);
        assert.strictEqual(p2.compareTo(p1), -1);
        assert.strictEqual(p1.compareTo(p2), 1);
        assert.strictEqual(p2.compareTo(p3), 1);
        assert.strictEqual(p1.compareTo(p3), 1);
    });
    test('Position, translate', function () {
        const p1 = new types.Position(1, 3);
        assert.ok(p1.translate() === p1);
        assert.ok(p1.translate({}) === p1);
        assert.ok(p1.translate(0, 0) === p1);
        assert.ok(p1.translate(0) === p1);
        assert.ok(p1.translate(undefined, 0) === p1);
        assert.ok(p1.translate(undefined) === p1);
        let res = p1.translate(-1);
        assert.strictEqual(res.line, 0);
        assert.strictEqual(res.character, 3);
        res = p1.translate({ lineDelta: -1 });
        assert.strictEqual(res.line, 0);
        assert.strictEqual(res.character, 3);
        res = p1.translate(undefined, -1);
        assert.strictEqual(res.line, 1);
        assert.strictEqual(res.character, 2);
        res = p1.translate({ characterDelta: -1 });
        assert.strictEqual(res.line, 1);
        assert.strictEqual(res.character, 2);
        res = p1.translate(11);
        assert.strictEqual(res.line, 12);
        assert.strictEqual(res.character, 3);
        assert.throws(() => p1.translate(null));
        assert.throws(() => p1.translate(null, null));
        assert.throws(() => p1.translate(-2));
        assert.throws(() => p1.translate({ lineDelta: -2 }));
        assert.throws(() => p1.translate(-2, null));
        assert.throws(() => p1.translate(0, -4));
    });
    test('Position, with', function () {
        const p1 = new types.Position(1, 3);
        assert.ok(p1.with() === p1);
        assert.ok(p1.with(1) === p1);
        assert.ok(p1.with(undefined, 3) === p1);
        assert.ok(p1.with(1, 3) === p1);
        assert.ok(p1.with(undefined) === p1);
        assert.ok(p1.with({ line: 1 }) === p1);
        assert.ok(p1.with({ character: 3 }) === p1);
        assert.ok(p1.with({ line: 1, character: 3 }) === p1);
        const p2 = p1.with({ line: 0, character: 11 });
        assert.strictEqual(p2.line, 0);
        assert.strictEqual(p2.character, 11);
        assert.throws(() => p1.with(null));
        assert.throws(() => p1.with(-9));
        assert.throws(() => p1.with(0, -9));
        assert.throws(() => p1.with({ line: -1 }));
        assert.throws(() => p1.with({ character: -1 }));
    });
    test('Range', () => {
        assert.throws(() => new types.Range(-1, 0, 0, 0));
        assert.throws(() => new types.Range(0, -1, 0, 0));
        assert.throws(() => new types.Range(new types.Position(0, 0), undefined));
        assert.throws(() => new types.Range(new types.Position(0, 0), null));
        assert.throws(() => new types.Range(undefined, new types.Position(0, 0)));
        assert.throws(() => new types.Range(null, new types.Position(0, 0)));
        const range = new types.Range(1, 0, 0, 0);
        assert.throws(() => { range.start = null; });
        assert.throws(() => { range.start = new types.Position(0, 3); });
    });
    test('Range, toJSON', function () {
        const range = new types.Range(1, 2, 3, 4);
        assertToJSON(range, [{ line: 1, character: 2 }, { line: 3, character: 4 }]);
    });
    test('Range, sorting', function () {
        // sorts start/end
        let range = new types.Range(1, 0, 0, 0);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.end.line, 1);
        range = new types.Range(0, 0, 1, 0);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.end.line, 1);
    });
    test('Range, isEmpty|isSingleLine', function () {
        let range = new types.Range(1, 0, 0, 0);
        assert.ok(!range.isEmpty);
        assert.ok(!range.isSingleLine);
        range = new types.Range(1, 1, 1, 1);
        assert.ok(range.isEmpty);
        assert.ok(range.isSingleLine);
        range = new types.Range(0, 1, 0, 11);
        assert.ok(!range.isEmpty);
        assert.ok(range.isSingleLine);
        range = new types.Range(0, 0, 1, 1);
        assert.ok(!range.isEmpty);
        assert.ok(!range.isSingleLine);
    });
    test('Range, contains', function () {
        const range = new types.Range(1, 1, 2, 11);
        assert.ok(range.contains(range.start));
        assert.ok(range.contains(range.end));
        assert.ok(range.contains(range));
        assert.ok(!range.contains(new types.Range(1, 0, 2, 11)));
        assert.ok(!range.contains(new types.Range(0, 1, 2, 11)));
        assert.ok(!range.contains(new types.Range(1, 1, 2, 12)));
        assert.ok(!range.contains(new types.Range(1, 1, 3, 11)));
    });
    test('Range, contains (no instanceof)', function () {
        const range = new types.Range(1, 1, 2, 11);
        const startLike = { line: range.start.line, character: range.start.character };
        const endLike = { line: range.end.line, character: range.end.character };
        const rangeLike = { start: startLike, end: endLike };
        assert.ok(range.contains(startLike));
        assert.ok(range.contains(endLike));
        assert.ok(range.contains(rangeLike));
    });
    test('Range, intersection', function () {
        const range = new types.Range(1, 1, 2, 11);
        let res;
        res = range.intersection(range);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 1);
        assert.strictEqual(res.end.line, 2);
        assert.strictEqual(res.end.character, 11);
        res = range.intersection(new types.Range(2, 12, 4, 0));
        assert.strictEqual(res, undefined);
        res = range.intersection(new types.Range(0, 0, 1, 0));
        assert.strictEqual(res, undefined);
        res = range.intersection(new types.Range(0, 0, 1, 1));
        assert.ok(res.isEmpty);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 1);
        res = range.intersection(new types.Range(2, 11, 61, 1));
        assert.ok(res.isEmpty);
        assert.strictEqual(res.start.line, 2);
        assert.strictEqual(res.start.character, 11);
        assert.throws(() => range.intersection(null));
        assert.throws(() => range.intersection(undefined));
    });
    test('Range, union', function () {
        let ran1 = new types.Range(0, 0, 5, 5);
        assert.ok(ran1.union(new types.Range(0, 0, 1, 1)) === ran1);
        let res;
        res = ran1.union(new types.Range(2, 2, 9, 9));
        assert.ok(res.start === ran1.start);
        assert.strictEqual(res.end.line, 9);
        assert.strictEqual(res.end.character, 9);
        ran1 = new types.Range(2, 1, 5, 3);
        res = ran1.union(new types.Range(1, 0, 4, 2));
        assert.ok(res.end === ran1.end);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 0);
    });
    test('Range, with', function () {
        const range = new types.Range(1, 1, 2, 11);
        assert.ok(range.with(range.start) === range);
        assert.ok(range.with(undefined, range.end) === range);
        assert.ok(range.with(range.start, range.end) === range);
        assert.ok(range.with(new types.Position(1, 1)) === range);
        assert.ok(range.with(undefined, new types.Position(2, 11)) === range);
        assert.ok(range.with() === range);
        assert.ok(range.with({ start: range.start }) === range);
        assert.ok(range.with({ start: new types.Position(1, 1) }) === range);
        assert.ok(range.with({ end: range.end }) === range);
        assert.ok(range.with({ end: new types.Position(2, 11) }) === range);
        let res = range.with(undefined, new types.Position(9, 8));
        assert.strictEqual(res.end.line, 9);
        assert.strictEqual(res.end.character, 8);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 1);
        res = range.with({ end: new types.Position(9, 8) });
        assert.strictEqual(res.end.line, 9);
        assert.strictEqual(res.end.character, 8);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 1);
        res = range.with({ end: new types.Position(9, 8), start: new types.Position(2, 3) });
        assert.strictEqual(res.end.line, 9);
        assert.strictEqual(res.end.character, 8);
        assert.strictEqual(res.start.line, 2);
        assert.strictEqual(res.start.character, 3);
        assert.throws(() => range.with(null));
        assert.throws(() => range.with(undefined, null));
    });
    test('TextEdit', () => {
        const range = new types.Range(1, 1, 2, 11);
        let edit = new types.TextEdit(range, undefined);
        assert.strictEqual(edit.newText, '');
        assertToJSON(edit, { range: [{ line: 1, character: 1 }, { line: 2, character: 11 }], newText: '' });
        edit = new types.TextEdit(range, null);
        assert.strictEqual(edit.newText, '');
        edit = new types.TextEdit(range, '');
        assert.strictEqual(edit.newText, '');
    });
    test('WorkspaceEdit', () => {
        const a = URI.file('a.ts');
        const b = URI.file('b.ts');
        const edit = new types.WorkspaceEdit();
        assert.ok(!edit.has(a));
        edit.set(a, [types.TextEdit.insert(new types.Position(0, 0), 'fff')]);
        assert.ok(edit.has(a));
        assert.strictEqual(edit.size, 1);
        assertToJSON(edit, [[a.toJSON(), [{ range: [{ line: 0, character: 0 }, { line: 0, character: 0 }], newText: 'fff' }]]]);
        edit.insert(b, new types.Position(1, 1), 'fff');
        edit.delete(b, new types.Range(0, 0, 0, 0));
        assert.ok(edit.has(b));
        assert.strictEqual(edit.size, 2);
        assertToJSON(edit, [
            [a.toJSON(), [{ range: [{ line: 0, character: 0 }, { line: 0, character: 0 }], newText: 'fff' }]],
            [b.toJSON(), [{ range: [{ line: 1, character: 1 }, { line: 1, character: 1 }], newText: 'fff' }, { range: [{ line: 0, character: 0 }, { line: 0, character: 0 }], newText: '' }]]
        ]);
        edit.set(b, undefined);
        assert.ok(!edit.has(b));
        assert.strictEqual(edit.size, 1);
        edit.set(b, [types.TextEdit.insert(new types.Position(0, 0), 'ffff')]);
        assert.strictEqual(edit.get(b).length, 1);
    });
    test('WorkspaceEdit - keep order of text and file changes', function () {
        const edit = new types.WorkspaceEdit();
        edit.replace(URI.parse('foo:a'), new types.Range(1, 1, 1, 1), 'foo');
        edit.renameFile(URI.parse('foo:a'), URI.parse('foo:b'));
        edit.replace(URI.parse('foo:a'), new types.Range(2, 1, 2, 1), 'bar');
        edit.replace(URI.parse('foo:b'), new types.Range(3, 1, 3, 1), 'bazz');
        const all = edit._allEntries();
        assert.strictEqual(all.length, 4);
        const [first, second, third, fourth] = all;
        assertType(first._type === 2 /* types.FileEditType.Text */);
        assert.strictEqual(first.uri.toString(), 'foo:a');
        assertType(second._type === 1 /* types.FileEditType.File */);
        assert.strictEqual(second.from.toString(), 'foo:a');
        assert.strictEqual(second.to.toString(), 'foo:b');
        assertType(third._type === 2 /* types.FileEditType.Text */);
        assert.strictEqual(third.uri.toString(), 'foo:a');
        assertType(fourth._type === 2 /* types.FileEditType.Text */);
        assert.strictEqual(fourth.uri.toString(), 'foo:b');
    });
    test('WorkspaceEdit - two edits for one resource', function () {
        const edit = new types.WorkspaceEdit();
        const uri = URI.parse('foo:bar');
        edit.insert(uri, new types.Position(0, 0), 'Hello');
        edit.insert(uri, new types.Position(0, 0), 'Foo');
        assert.strictEqual(edit._allEntries().length, 2);
        const [first, second] = edit._allEntries();
        assertType(first._type === 2 /* types.FileEditType.Text */);
        assertType(second._type === 2 /* types.FileEditType.Text */);
        assert.strictEqual(first.edit.newText, 'Hello');
        assert.strictEqual(second.edit.newText, 'Foo');
    });
    test('WorkspaceEdit - set with metadata accepts undefined', function () {
        const edit = new types.WorkspaceEdit();
        const uri = URI.parse('foo:bar');
        edit.set(uri, [
            [types.TextEdit.insert(new types.Position(0, 0), 'Hello'), { needsConfirmation: true, label: 'foo' }],
            [types.TextEdit.insert(new types.Position(0, 0), 'Hello'), undefined],
        ]);
        const all = edit._allEntries();
        assert.strictEqual(all.length, 2);
        const [first, second] = all;
        assert.ok(first.metadata);
        assert.ok(!second.metadata);
    });
    test('DocumentLink', () => {
        assert.throws(() => new types.DocumentLink(null, null));
        assert.throws(() => new types.DocumentLink(new types.Range(1, 1, 1, 1), null));
    });
    test('toJSON & stringify', function () {
        assertToJSON(new types.Selection(3, 4, 2, 1), { start: { line: 2, character: 1 }, end: { line: 3, character: 4 }, anchor: { line: 3, character: 4 }, active: { line: 2, character: 1 } });
        assertToJSON(new types.Location(URI.file('u.ts'), new types.Position(3, 4)), { uri: URI.parse('file:///u.ts').toJSON(), range: [{ line: 3, character: 4 }, { line: 3, character: 4 }] });
        assertToJSON(new types.Location(URI.file('u.ts'), new types.Range(1, 2, 3, 4)), { uri: URI.parse('file:///u.ts').toJSON(), range: [{ line: 1, character: 2 }, { line: 3, character: 4 }] });
        const diag = new types.Diagnostic(new types.Range(0, 1, 2, 3), 'hello');
        assertToJSON(diag, { severity: 'Error', message: 'hello', range: [{ line: 0, character: 1 }, { line: 2, character: 3 }] });
        diag.source = 'me';
        assertToJSON(diag, { severity: 'Error', message: 'hello', range: [{ line: 0, character: 1 }, { line: 2, character: 3 }], source: 'me' });
        assertToJSON(new types.DocumentHighlight(new types.Range(2, 3, 4, 5)), { range: [{ line: 2, character: 3 }, { line: 4, character: 5 }], kind: 'Text' });
        assertToJSON(new types.DocumentHighlight(new types.Range(2, 3, 4, 5), types.DocumentHighlightKind.Read), { range: [{ line: 2, character: 3 }, { line: 4, character: 5 }], kind: 'Read' });
        assertToJSON(new types.SymbolInformation('test', types.SymbolKind.Boolean, new types.Range(0, 1, 2, 3)), {
            name: 'test',
            kind: 'Boolean',
            location: {
                range: [{ line: 0, character: 1 }, { line: 2, character: 3 }]
            }
        });
        assertToJSON(new types.CodeLens(new types.Range(7, 8, 9, 10)), { range: [{ line: 7, character: 8 }, { line: 9, character: 10 }] });
        assertToJSON(new types.CodeLens(new types.Range(7, 8, 9, 10), { command: 'id', title: 'title' }), {
            range: [{ line: 7, character: 8 }, { line: 9, character: 10 }],
            command: { command: 'id', title: 'title' }
        });
        assertToJSON(new types.CompletionItem('complete'), { label: 'complete' });
        const item = new types.CompletionItem('complete');
        item.kind = types.CompletionItemKind.Interface;
        assertToJSON(item, { label: 'complete', kind: 'Interface' });
    });
    test('SymbolInformation, old ctor', function () {
        const info = new types.SymbolInformation('foo', types.SymbolKind.Array, new types.Range(1, 1, 2, 3));
        assert.ok(info.location instanceof types.Location);
        assert.strictEqual(info.location.uri, undefined);
    });
    test('SnippetString, builder-methods', function () {
        let string;
        string = new types.SnippetString();
        assert.strictEqual(string.appendText('I need $ and $').value, 'I need \\$ and \\$');
        string = new types.SnippetString();
        assert.strictEqual(string.appendText('I need \\$').value, 'I need \\\\\\$');
        string = new types.SnippetString();
        string.appendPlaceholder('fo$o}');
        assert.strictEqual(string.value, '${1:fo\\$o\\}}');
        string = new types.SnippetString();
        string.appendText('foo').appendTabstop(0).appendText('bar');
        assert.strictEqual(string.value, 'foo$0bar');
        string = new types.SnippetString();
        string.appendText('foo').appendTabstop().appendText('bar');
        assert.strictEqual(string.value, 'foo$1bar');
        string = new types.SnippetString();
        string.appendText('foo').appendTabstop(42).appendText('bar');
        assert.strictEqual(string.value, 'foo$42bar');
        string = new types.SnippetString();
        string.appendText('foo').appendPlaceholder('farboo').appendText('bar');
        assert.strictEqual(string.value, 'foo${1:farboo}bar');
        string = new types.SnippetString();
        string.appendText('foo').appendPlaceholder('far$boo').appendText('bar');
        assert.strictEqual(string.value, 'foo${1:far\\$boo}bar');
        string = new types.SnippetString();
        string.appendText('foo').appendPlaceholder(b => b.appendText('abc').appendPlaceholder('nested')).appendText('bar');
        assert.strictEqual(string.value, 'foo${1:abc${2:nested}}bar');
        string = new types.SnippetString();
        string.appendVariable('foo');
        assert.strictEqual(string.value, '${foo}');
        string = new types.SnippetString();
        string.appendText('foo').appendVariable('TM_SELECTED_TEXT').appendText('bar');
        assert.strictEqual(string.value, 'foo${TM_SELECTED_TEXT}bar');
        string = new types.SnippetString();
        string.appendVariable('BAR', b => b.appendPlaceholder('ops'));
        assert.strictEqual(string.value, '${BAR:${1:ops}}');
        string = new types.SnippetString();
        string.appendVariable('BAR', b => { });
        assert.strictEqual(string.value, '${BAR}');
        string = new types.SnippetString();
        string.appendChoice(['b', 'a', 'r']);
        assert.strictEqual(string.value, '${1|b,a,r|}');
        string = new types.SnippetString();
        string.appendChoice(['b,1', 'a,2', 'r,3']);
        assert.strictEqual(string.value, '${1|b\\,1,a\\,2,r\\,3|}');
        string = new types.SnippetString();
        string.appendChoice(['b', 'a', 'r'], 0);
        assert.strictEqual(string.value, '${0|b,a,r|}');
        string = new types.SnippetString();
        string.appendText('foo').appendChoice(['far', 'boo']).appendText('bar');
        assert.strictEqual(string.value, 'foo${1|far,boo|}bar');
        string = new types.SnippetString();
        string.appendText('foo').appendChoice(['far', '$boo']).appendText('bar');
        assert.strictEqual(string.value, 'foo${1|far,$boo|}bar');
        string = new types.SnippetString();
        string.appendText('foo').appendPlaceholder('farboo').appendChoice(['far', 'boo']).appendText('bar');
        assert.strictEqual(string.value, 'foo${1:farboo}${2|far,boo|}bar');
    });
    test('Snippet choices are incorrectly escaped/applied #180132', function () {
        {
            const s = new types.SnippetString();
            s.appendChoice(["aaa$aaa"]);
            s.appendText("bbb$bbb");
            assert.strictEqual(s.value, '${1|aaa$aaa|}bbb\\$bbb');
        }
        {
            const s = new types.SnippetString();
            s.appendChoice(["aaa,aaa"]);
            s.appendText("bbb$bbb");
            assert.strictEqual(s.value, '${1|aaa\\,aaa|}bbb\\$bbb');
        }
        {
            const s = new types.SnippetString();
            s.appendChoice(["aaa|aaa"]);
            s.appendText("bbb$bbb");
            assert.strictEqual(s.value, '${1|aaa\\|aaa|}bbb\\$bbb');
        }
        {
            const s = new types.SnippetString();
            s.appendChoice(["aaa\\aaa"]);
            s.appendText("bbb$bbb");
            assert.strictEqual(s.value, '${1|aaa\\\\aaa|}bbb\\$bbb');
        }
    });
    test('instanceof doesn\'t work for FileSystemError #49386', function () {
        const error = types.FileSystemError.Unavailable('foo');
        assert.ok(error instanceof Error);
        assert.ok(error instanceof types.FileSystemError);
    });
    test('CancellationError', function () {
        // The CancellationError-type is used internally and exported as API. Make sure that at
        // its name and message are `Canceled`
        const err = new CancellationError();
        assert.strictEqual(err.name, 'Canceled');
        assert.strictEqual(err.message, 'Canceled');
    });
    test('CodeActionKind contains', () => {
        assert.ok(types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.RefactorExtract));
        assert.ok(types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.RefactorExtract.append('other')));
        assert.ok(!types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.Refactor));
        assert.ok(!types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.Refactor.append('other')));
        assert.ok(!types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.Empty.append('other').append('refactor')));
        assert.ok(!types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.Empty.append('refactory')));
    });
    test('CodeActionKind intersects', () => {
        assert.ok(types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.RefactorExtract));
        assert.ok(types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.Refactor));
        assert.ok(types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.RefactorExtract.append('other')));
        assert.ok(!types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.Refactor.append('other')));
        assert.ok(!types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.Empty.append('other').append('refactor')));
        assert.ok(!types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.Empty.append('refactory')));
    });
    function toArr(uint32Arr) {
        const r = [];
        for (let i = 0, len = uint32Arr.length; i < len; i++) {
            r[i] = uint32Arr[i];
        }
        return r;
    }
    test('SemanticTokensBuilder simple', () => {
        const builder = new types.SemanticTokensBuilder();
        builder.push(1, 0, 5, 1, 1);
        builder.push(1, 10, 4, 2, 2);
        builder.push(2, 2, 3, 2, 2);
        assert.deepStrictEqual(toArr(builder.build().data), [
            1, 0, 5, 1, 1,
            0, 10, 4, 2, 2,
            1, 2, 3, 2, 2
        ]);
    });
    test('SemanticTokensBuilder no modifier', () => {
        const builder = new types.SemanticTokensBuilder();
        builder.push(1, 0, 5, 1);
        builder.push(1, 10, 4, 2);
        builder.push(2, 2, 3, 2);
        assert.deepStrictEqual(toArr(builder.build().data), [
            1, 0, 5, 1, 0,
            0, 10, 4, 2, 0,
            1, 2, 3, 2, 0
        ]);
    });
    test('SemanticTokensBuilder out of order 1', () => {
        const builder = new types.SemanticTokensBuilder();
        builder.push(2, 0, 5, 1, 1);
        builder.push(2, 10, 1, 2, 2);
        builder.push(2, 15, 2, 3, 3);
        builder.push(1, 0, 4, 4, 4);
        assert.deepStrictEqual(toArr(builder.build().data), [
            1, 0, 4, 4, 4,
            1, 0, 5, 1, 1,
            0, 10, 1, 2, 2,
            0, 5, 2, 3, 3
        ]);
    });
    test('SemanticTokensBuilder out of order 2', () => {
        const builder = new types.SemanticTokensBuilder();
        builder.push(2, 10, 5, 1, 1);
        builder.push(2, 2, 4, 2, 2);
        assert.deepStrictEqual(toArr(builder.build().data), [
            2, 2, 4, 2, 2,
            0, 8, 5, 1, 1
        ]);
    });
    test('SemanticTokensBuilder with legend', () => {
        const legend = new types.SemanticTokensLegend(['aType', 'bType', 'cType', 'dType'], ['mod0', 'mod1', 'mod2', 'mod3', 'mod4', 'mod5']);
        const builder = new types.SemanticTokensBuilder(legend);
        builder.push(new types.Range(1, 0, 1, 5), 'bType');
        builder.push(new types.Range(2, 0, 2, 4), 'cType', ['mod0', 'mod5']);
        builder.push(new types.Range(3, 0, 3, 3), 'dType', ['mod2', 'mod4']);
        assert.deepStrictEqual(toArr(builder.build().data), [
            1, 0, 5, 1, 0,
            1, 0, 4, 2, 1 | (1 << 5),
            1, 0, 3, 3, (1 << 2) | (1 << 4)
        ]);
    });
    test('Markdown codeblock rendering is swapped #111604', function () {
        const md = new types.MarkdownString().appendCodeblock('<img src=0 onerror="alert(1)">', 'html');
        assert.deepStrictEqual(md.value, '\n```html\n<img src=0 onerror="alert(1)">\n```\n');
    });
    test('NotebookCellOutputItem - factories', function () {
        assert.throws(() => {
            // invalid mime type
            new types.NotebookCellOutputItem(new Uint8Array(), 'invalid');
        });
        // --- err
        let item = types.NotebookCellOutputItem.error(new Error());
        assert.strictEqual(item.mime, 'application/vnd.code.notebook.error');
        item = types.NotebookCellOutputItem.error({ name: 'Hello' });
        assert.strictEqual(item.mime, 'application/vnd.code.notebook.error');
        // --- JSON
        item = types.NotebookCellOutputItem.json(1);
        assert.strictEqual(item.mime, 'text/x-json');
        assert.deepStrictEqual(item.data, new TextEncoder().encode(JSON.stringify(1)));
        item = types.NotebookCellOutputItem.json(1, 'foo/bar');
        assert.strictEqual(item.mime, 'foo/bar');
        assert.deepStrictEqual(item.data, new TextEncoder().encode(JSON.stringify(1)));
        item = types.NotebookCellOutputItem.json(true);
        assert.strictEqual(item.mime, 'text/x-json');
        assert.deepStrictEqual(item.data, new TextEncoder().encode(JSON.stringify(true)));
        item = types.NotebookCellOutputItem.json([true, 1, 'ddd']);
        assert.strictEqual(item.mime, 'text/x-json');
        assert.deepStrictEqual(item.data, new TextEncoder().encode(JSON.stringify([true, 1, 'ddd'], undefined, '\t')));
        // --- text
        item = types.NotebookCellOutputItem.text('Hęłlö');
        assert.strictEqual(item.mime, Mimes.text);
        assert.deepStrictEqual(item.data, new TextEncoder().encode('Hęłlö'));
        item = types.NotebookCellOutputItem.text('Hęłlö', 'foo/bar');
        assert.strictEqual(item.mime, 'foo/bar');
        assert.deepStrictEqual(item.data, new TextEncoder().encode('Hęłlö'));
    });
    test('FileDecoration#validate', function () {
        assert.ok(types.FileDecoration.validate({ badge: 'u' }));
        assert.ok(types.FileDecoration.validate({ badge: 'ü' }));
        assert.ok(types.FileDecoration.validate({ badge: '1' }));
        assert.ok(types.FileDecoration.validate({ badge: 'ãã' }));
        assert.ok(types.FileDecoration.validate({ badge: '👋' }));
        assert.ok(types.FileDecoration.validate({ badge: '👋👋' }));
        assert.ok(types.FileDecoration.validate({ badge: '👩‍👩‍👧‍👧' }));
        assert.ok(types.FileDecoration.validate({ badge: 'போ' }));
        assert.throws(() => types.FileDecoration.validate({ badge: 'hel' }));
        assert.throws(() => types.FileDecoration.validate({ badge: '👋👋👋' }));
        assert.throws(() => types.FileDecoration.validate({ badge: 'புன்சிரிப்போடு' }));
        assert.throws(() => types.FileDecoration.validate({ badge: 'ããã' }));
    });
    test('No longer possible to set content on LanguageModelChatMessage', function () {
        const m = types.LanguageModelChatMessage.Assistant('');
        m.content = [new types.LanguageModelToolCallPart('toolCall.call.callId', 'toolCall.tool.name', 'toolCall.call.parameters')];
        assert.equal(m.content.length, 1);
        assert.equal(m.content2?.length, 1);
        m.content2 = ['foo'];
        assert.equal(m.content.length, 1);
        assert.ok(m.content[0] instanceof types.LanguageModelTextPart);
        assert.equal(m.content2?.length, 1);
        assert.ok(typeof m.content2[0] === 'string');
    });
    test('runtime stable, type-def changed', function () {
        // see https://github.com/microsoft/vscode/issues/231938
        const m = new types.LanguageModelChatMessage(types.LanguageModelChatMessageRole.User, []);
        assert.deepStrictEqual(m.content, []);
        m.content = 'Hello';
        assert.deepStrictEqual(m.content, [new types.LanguageModelTextPart('Hello')]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFR5cGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEtBQUssS0FBSyxNQUFNLDhCQUE4QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLFNBQVMsWUFBWSxDQUFDLENBQU0sRUFBRSxRQUFhO0lBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRUQsS0FBSyxDQUFDLGNBQWMsRUFBRTtJQUVyQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxhQUFhLEVBQUU7UUFFbkIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FB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LEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRTFDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXJDLEdBQUcsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXJDLEdBQUcsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFckMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFckMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVyQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSyxFQUFFLElBQUssQ0FBQyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7UUFDdEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRXJELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVUsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUksS0FBYSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFJLEtBQWEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFD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RUFBRSxDQUFDLENBQUM7UUFFM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVqQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlDQUFpQyxFQUFFO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUz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LEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVUsQ0FBQyxDQUFDLENBQUM7SUFDckQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsY0FBYyxFQUFFO1FBQ3BCLElBQUksSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7UUFFNUQsSUFBSSxHQUFnQixDQUFDO1FBQ3JCLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpDLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUzQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUVwRSxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNDLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFFckIsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLElBQUksSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsU0FBVSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVwRyxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFckMsSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFFMUIsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzQixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTNCLE1BQU0sSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4SCxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqQyxZQUFZLENBQUMsSUFBSSxFQUFFO1lBQ2xCLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNqRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDakwsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBVSxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFEQUFxRCxFQUFFO1FBRTNELE1BQU0sSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFdEUsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzNDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxvQ0FBNEIsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVsRCxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssb0NBQTRCLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRW5ELFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxvQ0FBNEIsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVsRCxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssb0NBQTRCLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUU7UUFDbEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdkMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRTNDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxvQ0FBNEIsQ0FBQyxDQUFDO1FBQ3BELFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxvQ0FBNEIsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRTtRQUMzRCxNQUFNLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN2QyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRWpDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO1lBQ2IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUNyRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsU0FBUyxDQUFDO1NBQ3JFLENBQUMsQ0FBQztRQUVILE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDNUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM3QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUssRUFBRSxJQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1FBRTFCLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFMUwsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6TCxZQUFZLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFNUwsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RSxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzSCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNuQixZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRXpJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3hKLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFFMUwsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN4RyxJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxTQUFTO1lBQ2YsUUFBUSxFQUFFO2dCQUNULEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQzthQUM3RDtTQUNELENBQUMsQ0FBQztRQUVILFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO1lBQ2pHLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUM5RCxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRTFFLE1BQU0sSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUM7UUFDL0MsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFFOUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFFbkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JHLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsWUFBWSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtRQUV0QyxJQUFJLE1BQTJCLENBQUM7UUFFaEMsTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRXBGLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFNUUsTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVuRCxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUU3QyxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRTlDLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUV0RCxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFFekQsTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ILE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBRTlELE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUUzQyxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFFOUQsTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFcEQsTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztRQUVoRCxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUU1RCxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRWhELE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUV4RCxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFFekQsTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHlEQUF5RCxFQUFFO1FBQy9ELENBQUM7WUFDQSxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUM1QixDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFDRCxDQUFDO1lBQ0EsTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQ0QsQ0FBQztZQUNBLE1BQU0sQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzVCLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDekQsQ0FBQztRQUNELENBQUM7WUFDQSxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBQzFELENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRTtRQUMzRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUU7UUFDekIsdUZBQXVGO1FBQ3ZGLHNDQUFzQztRQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFL0csTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDekYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pHLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNHLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDakcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzFGLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNHLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdHLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxLQUFLLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbkQsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDYixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNkLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1NBQ2IsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ25ELENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDZCxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNiLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuRCxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNiLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDZCxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNiLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuRCxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNiLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1NBQ2IsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUM1QyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUNwQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQ2hELENBQUM7UUFDRixNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4RCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNyRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbkQsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDYixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4QixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQy9CLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFO1FBQ3ZELE1BQU0sRUFBRSxHQUFHLElBQUksS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxnQ0FBZ0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoRyxNQUFNLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsa0RBQWtELENBQUMsQ0FBQztJQUN0RixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRTtRQUUxQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNsQixvQkFBb0I7WUFDcEIsSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsSUFBSSxVQUFVLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvRCxDQUFDLENBQUMsQ0FBQztRQUVILFVBQVU7UUFFVixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUscUNBQXFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDO1FBRXJFLFdBQVc7UUFFWCxJQUFJLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9FLElBQUksR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9FLElBQUksR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEYsSUFBSSxHQUFHLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9HLFdBQVc7UUFFWCxJQUFJLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRXJFLElBQUksR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUJBQXlCLEVBQUU7UUFFL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFD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