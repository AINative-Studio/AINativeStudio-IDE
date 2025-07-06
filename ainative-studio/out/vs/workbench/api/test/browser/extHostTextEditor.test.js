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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFRleHRFZGl0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUF5QixxQkFBcUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFakYsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUUvQixJQUFJLE1BQXlCLENBQUM7SUFDOUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxTQUFVLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUM3RCxvQkFBb0I7S0FDcEIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFB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