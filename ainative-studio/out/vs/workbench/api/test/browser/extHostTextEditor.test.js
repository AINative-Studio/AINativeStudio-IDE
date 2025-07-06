/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Lazy } from '../../../../base/common/lazy.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TextEditorCursorStyle } from '../../../../editor/common/config/editorOptions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ExtHostDocumentData } from '../../common/extHostDocumentData.js';
import { ExtHostTextEditor, ExtHostTextEditorOptions } from '../../common/extHostTextEditor.js';
import { Range, TextEditorLineNumbersStyle } from '../../common/extHostTypes.js';
suite('ExtHostTextEditor', () => {
    let editor;
    const doc = new ExtHostDocumentData(undefined, URI.file(''), [
        'aaaa bbbb+cccc abc'
    ], '\n', 1, 'text', false, 'utf8');
    setup(() => {
        editor = new ExtHostTextEditor('fake', null, new NullLogService(), new Lazy(() => doc.document), [], { cursorStyle: TextEditorCursorStyle.Line, insertSpaces: true, lineNumbers: 1, tabSize: 4, indentSize: 4, originalIndentSize: 'tabSize' }, [], 1);
    });
    test('disposed editor', () => {
        assert.ok(editor.value.document);
        editor._acceptViewColumn(3);
        assert.strictEqual(3, editor.value.viewColumn);
        editor.dispose();
        assert.throws(() => editor._acceptViewColumn(2));
        assert.strictEqual(3, editor.value.viewColumn);
        assert.ok(editor.value.document);
        assert.throws(() => editor._acceptOptions(null));
        assert.throws(() => editor._acceptSelections([]));
    });
    test('API [bug]: registerTextEditorCommand clears redo stack even if no edits are made #55163', async function () {
        let applyCount = 0;
        const editor = new ExtHostTextEditor('edt1', new class extends mock() {
            $tryApplyEdits() {
                applyCount += 1;
                return Promise.resolve(true);
            }
        }, new NullLogService(), new Lazy(() => doc.document), [], { cursorStyle: TextEditorCursorStyle.Line, insertSpaces: true, lineNumbers: 1, tabSize: 4, indentSize: 4, originalIndentSize: 'tabSize' }, [], 1);
        await editor.value.edit(edit => { });
        assert.strictEqual(applyCount, 0);
        await editor.value.edit(edit => { edit.setEndOfLine(1); });
        assert.strictEqual(applyCount, 1);
        await editor.value.edit(edit => { edit.delete(new Range(0, 0, 1, 1)); });
        assert.strictEqual(applyCount, 2);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('ExtHostTextEditorOptions', () => {
    let opts;
    let calls = [];
    setup(() => {
        calls = [];
        const mockProxy = {
            dispose: undefined,
            $trySetOptions: (id, options) => {
                assert.strictEqual(id, '1');
                calls.push(options);
                return Promise.resolve(undefined);
            },
            $tryShowTextDocument: undefined,
            $registerTextEditorDecorationType: undefined,
            $removeTextEditorDecorationType: undefined,
            $tryShowEditor: undefined,
            $tryHideEditor: undefined,
            $trySetDecorations: undefined,
            $trySetDecorationsFast: undefined,
            $tryRevealRange: undefined,
            $trySetSelections: undefined,
            $tryApplyEdits: undefined,
            $tryInsertSnippet: undefined,
            $getDiffInformation: undefined
        };
        opts = new ExtHostTextEditorOptions(mockProxy, '1', {
            tabSize: 4,
            indentSize: 4,
            originalIndentSize: 'tabSize',
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        }, new NullLogService());
    });
    teardown(() => {
        opts = null;
        calls = null;
    });
    function assertState(opts, expected) {
        const actual = {
            tabSize: opts.value.tabSize,
            indentSize: opts.value.indentSize,
            insertSpaces: opts.value.insertSpaces,
            cursorStyle: opts.value.cursorStyle,
            lineNumbers: opts.value.lineNumbers
        };
        assert.deepStrictEqual(actual, expected);
    }
    test('can set tabSize to the same value', () => {
        opts.value.tabSize = 4;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can change tabSize to positive integer', () => {
        opts.value.tabSize = 1;
        assertState(opts, {
            tabSize: 1,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ tabSize: 1 }]);
    });
    test('can change tabSize to positive float', () => {
        opts.value.tabSize = 2.3;
        assertState(opts, {
            tabSize: 2,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ tabSize: 2 }]);
    });
    test('can change tabSize to a string number', () => {
        opts.value.tabSize = '2';
        assertState(opts, {
            tabSize: 2,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ tabSize: 2 }]);
    });
    test('tabSize can request indentation detection', () => {
        opts.value.tabSize = 'auto';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ tabSize: 'auto' }]);
    });
    test('ignores invalid tabSize 1', () => {
        opts.value.tabSize = null;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid tabSize 2', () => {
        opts.value.tabSize = -5;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid tabSize 3', () => {
        opts.value.tabSize = 'hello';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid tabSize 4', () => {
        opts.value.tabSize = '-17';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can set indentSize to the same value', () => {
        opts.value.indentSize = 4;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ indentSize: 4 }]);
    });
    test('can change indentSize to positive integer', () => {
        opts.value.indentSize = 1;
        assertState(opts, {
            tabSize: 4,
            indentSize: 1,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ indentSize: 1 }]);
    });
    test('can change indentSize to positive float', () => {
        opts.value.indentSize = 2.3;
        assertState(opts, {
            tabSize: 4,
            indentSize: 2,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ indentSize: 2 }]);
    });
    test('can change indentSize to a string number', () => {
        opts.value.indentSize = '2';
        assertState(opts, {
            tabSize: 4,
            indentSize: 2,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ indentSize: 2 }]);
    });
    test('indentSize can request to use tabSize', () => {
        opts.value.indentSize = 'tabSize';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ indentSize: 'tabSize' }]);
    });
    test('indentSize cannot request indentation detection', () => {
        opts.value.indentSize = 'auto';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid indentSize 1', () => {
        opts.value.indentSize = null;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid indentSize 2', () => {
        opts.value.indentSize = -5;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid indentSize 3', () => {
        opts.value.indentSize = 'hello';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid indentSize 4', () => {
        opts.value.indentSize = '-17';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can set insertSpaces to the same value', () => {
        opts.value.insertSpaces = false;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can set insertSpaces to boolean', () => {
        opts.value.insertSpaces = true;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ insertSpaces: true }]);
    });
    test('can set insertSpaces to false string', () => {
        opts.value.insertSpaces = 'false';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can set insertSpaces to truey', () => {
        opts.value.insertSpaces = 'hello';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ insertSpaces: true }]);
    });
    test('insertSpaces can request indentation detection', () => {
        opts.value.insertSpaces = 'auto';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ insertSpaces: 'auto' }]);
    });
    test('can set cursorStyle to same value', () => {
        opts.value.cursorStyle = TextEditorCursorStyle.Line;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can change cursorStyle', () => {
        opts.value.cursorStyle = TextEditorCursorStyle.Block;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Block,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ cursorStyle: TextEditorCursorStyle.Block }]);
    });
    test('can set lineNumbers to same value', () => {
        opts.value.lineNumbers = TextEditorLineNumbersStyle.On;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can change lineNumbers', () => {
        opts.value.lineNumbers = TextEditorLineNumbersStyle.Off;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 0 /* RenderLineNumbersType.Off */
        });
        assert.deepStrictEqual(calls, [{ lineNumbers: 0 /* RenderLineNumbersType.Off */ }]);
    });
    test('can do bulk updates 0', () => {
        opts.assign({
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: TextEditorLineNumbersStyle.On
        });
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ indentSize: 4 }]);
    });
    test('can do bulk updates 1', () => {
        opts.assign({
            tabSize: 'auto',
            insertSpaces: true
        });
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ tabSize: 'auto', insertSpaces: true }]);
    });
    test('can do bulk updates 2', () => {
        opts.assign({
            tabSize: 3,
            insertSpaces: 'auto'
        });
        assertState(opts, {
            tabSize: 3,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */
        });
        assert.deepStrictEqual(calls, [{ tabSize: 3, insertSpaces: 'auto' }]);
    });
    test('can do bulk updates 3', () => {
        opts.assign({
            cursorStyle: TextEditorCursorStyle.Block,
            lineNumbers: TextEditorLineNumbersStyle.Relative
        });
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Block,
            lineNumbers: 2 /* RenderLineNumbersType.Relative */
        });
        assert.deepStrictEqual(calls, [{ cursorStyle: TextEditorCursorStyle.Block, lineNumbers: 2 /* RenderLineNumbersType.Relative */ }]);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RUZXh0RWRpdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBeUIscUJBQXFCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWpGLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFFL0IsSUFBSSxNQUF5QixDQUFDO0lBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUksbUJBQW1CLENBQUMsU0FBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDN0Qsb0JBQW9CO0tBQ3BCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FB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