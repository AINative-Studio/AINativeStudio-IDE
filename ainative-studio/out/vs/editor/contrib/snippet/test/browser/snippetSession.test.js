/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { SnippetParser } from '../../browser/snippetParser.js';
import { SnippetSession } from '../../browser/snippetSession.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
suite('SnippetSession', function () {
    let languageConfigurationService;
    let editor;
    let model;
    function assertSelections(editor, ...s) {
        for (const selection of editor.getSelections()) {
            const actual = s.shift();
            assert.ok(selection.equalsSelection(actual), `actual=${selection.toString()} <> expected=${actual.toString()}`);
        }
        assert.strictEqual(s.length, 0);
    }
    setup(function () {
        model = createTextModel('function foo() {\n    console.log(a);\n}');
        languageConfigurationService = new TestLanguageConfigurationService();
        const serviceCollection = new ServiceCollection([ILabelService, new class extends mock() {
            }], [ILanguageConfigurationService, languageConfigurationService], [IWorkspaceContextService, new class extends mock() {
                getWorkspace() {
                    return {
                        id: 'workspace-id',
                        folders: [],
                    };
                }
            }]);
        editor = createTestCodeEditor(model, { serviceCollection });
        editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5)]);
        assert.strictEqual(model.getEOL(), '\n');
    });
    teardown(function () {
        model.dispose();
        editor.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('normalize whitespace', function () {
        function assertNormalized(position, input, expected) {
            const snippet = new SnippetParser().parse(input);
            SnippetSession.adjustWhitespace(model, position, true, snippet);
            assert.strictEqual(snippet.toTextmateString(), expected);
        }
        assertNormalized(new Position(1, 1), 'foo', 'foo');
        assertNormalized(new Position(1, 1), 'foo\rbar', 'foo\nbar');
        assertNormalized(new Position(1, 1), 'foo\rbar', 'foo\nbar');
        assertNormalized(new Position(2, 5), 'foo\r\tbar', 'foo\n        bar');
        assertNormalized(new Position(2, 3), 'foo\r\tbar', 'foo\n    bar');
        assertNormalized(new Position(2, 5), 'foo\r\tbar\nfoo', 'foo\n        bar\n    foo');
        //Indentation issue with choice elements that span multiple lines #46266
        assertNormalized(new Position(2, 5), 'a\nb${1|foo,\nbar|}', 'a\n    b${1|foo,\nbar|}');
    });
    test('adjust selection (overwrite[Before|After])', function () {
        let range = SnippetSession.adjustSelection(model, new Selection(1, 2, 1, 2), 1, 0);
        assert.ok(range.equalsRange(new Range(1, 1, 1, 2)));
        range = SnippetSession.adjustSelection(model, new Selection(1, 2, 1, 2), 1111, 0);
        assert.ok(range.equalsRange(new Range(1, 1, 1, 2)));
        range = SnippetSession.adjustSelection(model, new Selection(1, 2, 1, 2), 0, 10);
        assert.ok(range.equalsRange(new Range(1, 2, 1, 12)));
        range = SnippetSession.adjustSelection(model, new Selection(1, 2, 1, 2), 0, 10111);
        assert.ok(range.equalsRange(new Range(1, 2, 1, 17)));
    });
    test('text edits & selection', function () {
        const session = new SnippetSession(editor, 'foo${1:bar}foo$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(editor.getModel().getValue(), 'foobarfoofunction foo() {\n    foobarfooconsole.log(a);\n}');
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        session.next();
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
    });
    test('text edit with reversed selection', function () {
        const session = new SnippetSession(editor, '${1:bar}$0', undefined, languageConfigurationService);
        editor.setSelections([new Selection(2, 5, 2, 5), new Selection(1, 1, 1, 1)]);
        session.insert();
        assert.strictEqual(model.getValue(), 'barfunction foo() {\n    barconsole.log(a);\n}');
        assertSelections(editor, new Selection(2, 5, 2, 8), new Selection(1, 1, 1, 4));
    });
    test('snippets, repeated tabstops', function () {
        const session = new SnippetSession(editor, '${1:abc}foo${1:abc}$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 4), new Selection(1, 7, 1, 10), new Selection(2, 5, 2, 8), new Selection(2, 11, 2, 14));
        session.next();
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
    });
    test('snippets, just text', function () {
        const session = new SnippetSession(editor, 'foobar', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(model.getValue(), 'foobarfunction foo() {\n    foobarconsole.log(a);\n}');
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
    });
    test('snippets, selections and new text with newlines', () => {
        const session = new SnippetSession(editor, 'foo\n\t${1:bar}\n$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(editor.getModel().getValue(), 'foo\n    bar\nfunction foo() {\n    foo\n        bar\n    console.log(a);\n}');
        assertSelections(editor, new Selection(2, 5, 2, 8), new Selection(5, 9, 5, 12));
        session.next();
        assertSelections(editor, new Selection(3, 1, 3, 1), new Selection(6, 5, 6, 5));
    });
    test('snippets, newline NO whitespace adjust', () => {
        editor.setSelection(new Selection(2, 5, 2, 5));
        const session = new SnippetSession(editor, 'abc\n    foo\n        bar\n$0', { overwriteBefore: 0, overwriteAfter: 0, adjustWhitespace: false, clipboardText: undefined, overtypingCapturer: undefined }, languageConfigurationService);
        session.insert();
        assert.strictEqual(editor.getModel().getValue(), 'function foo() {\n    abc\n    foo\n        bar\nconsole.log(a);\n}');
    });
    test('snippets, selections -> next/prev', () => {
        const session = new SnippetSession(editor, 'f$1oo${2:bar}foo$0', undefined, languageConfigurationService);
        session.insert();
        // @ $2
        assertSelections(editor, new Selection(1, 2, 1, 2), new Selection(2, 6, 2, 6));
        // @ $1
        session.next();
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // @ $2
        session.prev();
        assertSelections(editor, new Selection(1, 2, 1, 2), new Selection(2, 6, 2, 6));
        // @ $1
        session.next();
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // @ $0
        session.next();
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
    });
    test('snippets, selections & typing', function () {
        const session = new SnippetSession(editor, 'f${1:oo}_$2_$0', undefined, languageConfigurationService);
        session.insert();
        editor.trigger('test', 'type', { text: 'X' });
        session.next();
        editor.trigger('test', 'type', { text: 'bar' });
        // go back to ${2:oo} which is now just 'X'
        session.prev();
        assertSelections(editor, new Selection(1, 2, 1, 3), new Selection(2, 6, 2, 7));
        // go forward to $1 which is now 'bar'
        session.next();
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // go to final tabstop
        session.next();
        assert.strictEqual(model.getValue(), 'fX_bar_function foo() {\n    fX_bar_console.log(a);\n}');
        assertSelections(editor, new Selection(1, 8, 1, 8), new Selection(2, 12, 2, 12));
    });
    test('snippets, insert shorter snippet into non-empty selection', function () {
        model.setValue('foo_bar_foo');
        editor.setSelections([new Selection(1, 1, 1, 4), new Selection(1, 9, 1, 12)]);
        new SnippetSession(editor, 'x$0', undefined, languageConfigurationService).insert();
        assert.strictEqual(model.getValue(), 'x_bar_x');
        assertSelections(editor, new Selection(1, 2, 1, 2), new Selection(1, 8, 1, 8));
    });
    test('snippets, insert longer snippet into non-empty selection', function () {
        model.setValue('foo_bar_foo');
        editor.setSelections([new Selection(1, 1, 1, 4), new Selection(1, 9, 1, 12)]);
        new SnippetSession(editor, 'LONGER$0', undefined, languageConfigurationService).insert();
        assert.strictEqual(model.getValue(), 'LONGER_bar_LONGER');
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(1, 18, 1, 18));
    });
    test('snippets, don\'t grow final tabstop', function () {
        model.setValue('foo_zzz_foo');
        editor.setSelection(new Selection(1, 5, 1, 8));
        const session = new SnippetSession(editor, '$1bar$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 5, 1, 5));
        editor.trigger('test', 'type', { text: 'foo-' });
        session.next();
        assert.strictEqual(model.getValue(), 'foo_foo-bar_foo');
        assertSelections(editor, new Selection(1, 12, 1, 12));
        editor.trigger('test', 'type', { text: 'XXX' });
        assert.strictEqual(model.getValue(), 'foo_foo-barXXX_foo');
        session.prev();
        assertSelections(editor, new Selection(1, 5, 1, 9));
        session.next();
        assertSelections(editor, new Selection(1, 15, 1, 15));
    });
    test('snippets, don\'t merge touching tabstops 1/2', function () {
        const session = new SnippetSession(editor, '$1$2$3$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.next();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.next();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.next();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.prev();
        session.prev();
        session.prev();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        editor.trigger('test', 'type', { text: '111' });
        session.next();
        editor.trigger('test', 'type', { text: '222' });
        session.next();
        editor.trigger('test', 'type', { text: '333' });
        session.next();
        assert.strictEqual(model.getValue(), '111222333function foo() {\n    111222333console.log(a);\n}');
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
        session.prev();
        assertSelections(editor, new Selection(1, 7, 1, 10), new Selection(2, 11, 2, 14));
        session.prev();
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        session.prev();
        assertSelections(editor, new Selection(1, 1, 1, 4), new Selection(2, 5, 2, 8));
    });
    test('snippets, don\'t merge touching tabstops 2/2', function () {
        const session = new SnippetSession(editor, '$1$2$3$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        editor.trigger('test', 'type', { text: '111' });
        session.next();
        assertSelections(editor, new Selection(1, 4, 1, 4), new Selection(2, 8, 2, 8));
        editor.trigger('test', 'type', { text: '222' });
        session.next();
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        editor.trigger('test', 'type', { text: '333' });
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
    });
    test('snippets, gracefully move over final tabstop', function () {
        const session = new SnippetSession(editor, '${1}bar$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(session.isAtLastPlaceholder, false);
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 4, 1, 4), new Selection(2, 8, 2, 8));
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 4, 1, 4), new Selection(2, 8, 2, 8));
    });
    test('snippets, overwriting nested placeholder', function () {
        const session = new SnippetSession(editor, 'log(${1:"$2"});$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 5, 1, 7), new Selection(2, 9, 2, 11));
        editor.trigger('test', 'type', { text: 'XXX' });
        assert.strictEqual(model.getValue(), 'log(XXX);function foo() {\n    log(XXX);console.log(a);\n}');
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, false);
        // assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
    });
    test('snippets, selections and snippet ranges', function () {
        const session = new SnippetSession(editor, '${1:foo}farboo${2:bar}$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(model.getValue(), 'foofarboobarfunction foo() {\n    foofarboobarconsole.log(a);\n}');
        assertSelections(editor, new Selection(1, 1, 1, 4), new Selection(2, 5, 2, 8));
        assert.strictEqual(session.isSelectionWithinPlaceholders(), true);
        editor.setSelections([new Selection(1, 1, 1, 1)]);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        editor.setSelections([new Selection(1, 6, 1, 6), new Selection(2, 10, 2, 10)]);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false); // in snippet, outside placeholder
        editor.setSelections([new Selection(1, 6, 1, 6), new Selection(2, 10, 2, 10), new Selection(1, 1, 1, 1)]);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false); // in snippet, outside placeholder
        editor.setSelections([new Selection(1, 6, 1, 6), new Selection(2, 10, 2, 10), new Selection(2, 20, 2, 21)]);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        // reset selection to placeholder
        session.next();
        assert.strictEqual(session.isSelectionWithinPlaceholders(), true);
        assertSelections(editor, new Selection(1, 10, 1, 13), new Selection(2, 14, 2, 17));
        // reset selection to placeholder
        session.next();
        assert.strictEqual(session.isSelectionWithinPlaceholders(), true);
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 13, 1, 13), new Selection(2, 17, 2, 17));
    });
    test('snippets, nested sessions', function () {
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const first = new SnippetSession(editor, 'foo${2:bar}foo$0', undefined, languageConfigurationService);
        first.insert();
        assert.strictEqual(model.getValue(), 'foobarfoo');
        assertSelections(editor, new Selection(1, 4, 1, 7));
        const second = new SnippetSession(editor, 'ba${1:zzzz}$0', undefined, languageConfigurationService);
        second.insert();
        assert.strictEqual(model.getValue(), 'foobazzzzfoo');
        assertSelections(editor, new Selection(1, 6, 1, 10));
        second.next();
        assert.strictEqual(second.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 10, 1, 10));
        first.next();
        assert.strictEqual(first.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 13, 1, 13));
    });
    test('snippets, typing at final tabstop', function () {
        const session = new SnippetSession(editor, 'farboo$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        editor.trigger('test', 'type', { text: 'XXX' });
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
    });
    test('snippets, typing at beginning', function () {
        editor.setSelection(new Selection(1, 2, 1, 2));
        const session = new SnippetSession(editor, 'farboo$0', undefined, languageConfigurationService);
        session.insert();
        editor.setSelection(new Selection(1, 2, 1, 2));
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        assert.strictEqual(session.isAtLastPlaceholder, true);
        editor.trigger('test', 'type', { text: 'XXX' });
        assert.strictEqual(model.getLineContent(1), 'fXXXfarboounction foo() {');
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        session.next();
        assertSelections(editor, new Selection(1, 11, 1, 11));
    });
    test('snippets, typing with nested placeholder', function () {
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, 'This ${1:is ${2:nested}}.$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 6, 1, 15));
        session.next();
        assertSelections(editor, new Selection(1, 9, 1, 15));
        editor.trigger('test', 'cut', {});
        assertSelections(editor, new Selection(1, 9, 1, 9));
        editor.trigger('test', 'type', { text: 'XXX' });
        session.prev();
        assertSelections(editor, new Selection(1, 6, 1, 12));
    });
    test('snippets, snippet with variables', function () {
        const session = new SnippetSession(editor, '@line=$TM_LINE_NUMBER$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(model.getValue(), '@line=1function foo() {\n    @line=2console.log(a);\n}');
        assertSelections(editor, new Selection(1, 8, 1, 8), new Selection(2, 12, 2, 12));
    });
    test('snippets, merge', function () {
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, 'This ${1:is ${2:nested}}.$0', undefined, languageConfigurationService);
        session.insert();
        session.next();
        assertSelections(editor, new Selection(1, 9, 1, 15));
        session.merge('really ${1:nested}$0');
        assertSelections(editor, new Selection(1, 16, 1, 22));
        session.next();
        assertSelections(editor, new Selection(1, 22, 1, 22));
        assert.strictEqual(session.isAtLastPlaceholder, false);
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 23, 1, 23));
        session.prev();
        editor.trigger('test', 'type', { text: 'AAA' });
        // back to `really ${1:nested}`
        session.prev();
        assertSelections(editor, new Selection(1, 16, 1, 22));
        // back to `${1:is ...}` which now grew
        session.prev();
        assertSelections(editor, new Selection(1, 6, 1, 25));
    });
    test('snippets, transform', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '${1/foo/bar/}$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 1));
        editor.trigger('test', 'type', { text: 'foo' });
        session.next();
        assert.strictEqual(model.getValue(), 'bar');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 4, 1, 4));
    });
    test('snippets, multi placeholder same index one transform', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '$1 baz ${1/foo/bar/}$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(1, 6, 1, 6));
        editor.trigger('test', 'type', { text: 'foo' });
        session.next();
        assert.strictEqual(model.getValue(), 'foo baz bar');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 12, 1, 12));
    });
    test('snippets, transform example', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '${1:name} : ${2:type}${3/\\s:=(.*)/${1:+ :=}${1}/};\n$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 5));
        editor.trigger('test', 'type', { text: 'clk' });
        session.next();
        assertSelections(editor, new Selection(1, 7, 1, 11));
        editor.trigger('test', 'type', { text: 'std_logic' });
        session.next();
        assertSelections(editor, new Selection(1, 16, 1, 16));
        session.next();
        assert.strictEqual(model.getValue(), 'clk : std_logic;\n');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(2, 1, 2, 1));
    });
    test('snippets, transform with indent', function () {
        const snippet = [
            'private readonly ${1} = new Emitter<$2>();',
            'readonly ${1/^_(.*)/$1/}: Event<$2> = this.$1.event;',
            '$0'
        ].join('\n');
        const expected = [
            '{',
            '\tprivate readonly _prop = new Emitter<string>();',
            '\treadonly prop: Event<string> = this._prop.event;',
            '\t',
            '}'
        ].join('\n');
        const base = [
            '{',
            '\t',
            '}'
        ].join('\n');
        editor.getModel().setValue(base);
        editor.getModel().updateOptions({ insertSpaces: false });
        editor.setSelection(new Selection(2, 2, 2, 2));
        const session = new SnippetSession(editor, snippet, undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(2, 19, 2, 19), new Selection(3, 11, 3, 11), new Selection(3, 28, 3, 28));
        editor.trigger('test', 'type', { text: '_prop' });
        session.next();
        assertSelections(editor, new Selection(2, 39, 2, 39), new Selection(3, 23, 3, 23));
        editor.trigger('test', 'type', { text: 'string' });
        session.next();
        assert.strictEqual(model.getValue(), expected);
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(4, 2, 4, 2));
    });
    test('snippets, transform example hit if', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '${1:name} : ${2:type}${3/\\s:=(.*)/${1:+ :=}${1}/};\n$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 5));
        editor.trigger('test', 'type', { text: 'clk' });
        session.next();
        assertSelections(editor, new Selection(1, 7, 1, 11));
        editor.trigger('test', 'type', { text: 'std_logic' });
        session.next();
        assertSelections(editor, new Selection(1, 16, 1, 16));
        editor.trigger('test', 'type', { text: ' := \'1\'' });
        session.next();
        assert.strictEqual(model.getValue(), 'clk : std_logic := \'1\';\n');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(2, 1, 2, 1));
    });
    test('Snippet tab stop selection issue #96545, snippets, transform adjacent to previous placeholder', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '${1:{}${2:fff}${1/{/}/}', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 2), new Selection(1, 5, 1, 6));
        session.next();
        assert.strictEqual(model.getValue(), '{fff}');
        assertSelections(editor, new Selection(1, 2, 1, 5));
        editor.trigger('test', 'type', { text: 'ggg' });
        session.next();
        assert.strictEqual(model.getValue(), '{ggg}');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 6, 1, 6));
    });
    test('Snippet tab stop selection issue #96545', function () {
        editor.getModel().setValue('');
        const session = new SnippetSession(editor, '${1:{}${2:fff}${1/[\\{]/}/}$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(editor.getModel().getValue(), '{fff{');
        assertSelections(editor, new Selection(1, 1, 1, 2), new Selection(1, 5, 1, 6));
        session.next();
        assertSelections(editor, new Selection(1, 2, 1, 5));
    });
    test('Snippet placeholder index incorrect after using 2+ snippets in a row that each end with a placeholder, #30769', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, 'test ${1:replaceme}', undefined, languageConfigurationService);
        session.insert();
        editor.trigger('test', 'type', { text: '1' });
        editor.trigger('test', 'type', { text: '\n' });
        assert.strictEqual(editor.getModel().getValue(), 'test 1\n');
        session.merge('test ${1:replaceme}');
        editor.trigger('test', 'type', { text: '2' });
        editor.trigger('test', 'type', { text: '\n' });
        assert.strictEqual(editor.getModel().getValue(), 'test 1\ntest 2\n');
        session.merge('test ${1:replaceme}');
        editor.trigger('test', 'type', { text: '3' });
        editor.trigger('test', 'type', { text: '\n' });
        assert.strictEqual(editor.getModel().getValue(), 'test 1\ntest 2\ntest 3\n');
        session.merge('test ${1:replaceme}');
        editor.trigger('test', 'type', { text: '4' });
        editor.trigger('test', 'type', { text: '\n' });
        assert.strictEqual(editor.getModel().getValue(), 'test 1\ntest 2\ntest 3\ntest 4\n');
    });
    test('Snippet variable text isn\'t whitespace normalised, #31124', function () {
        editor.getModel().setValue([
            'start',
            '\t\t-one',
            '\t\t-two',
            'end'
        ].join('\n'));
        editor.getModel().updateOptions({ insertSpaces: false });
        editor.setSelection(new Selection(2, 2, 3, 7));
        new SnippetSession(editor, '<div>\n\t$TM_SELECTED_TEXT\n</div>$0', undefined, languageConfigurationService).insert();
        let expected = [
            'start',
            '\t<div>',
            '\t\t\t-one',
            '\t\t\t-two',
            '\t</div>',
            'end'
        ].join('\n');
        assert.strictEqual(editor.getModel().getValue(), expected);
        editor.getModel().setValue([
            'start',
            '\t\t-one',
            '\t-two',
            'end'
        ].join('\n'));
        editor.getModel().updateOptions({ insertSpaces: false });
        editor.setSelection(new Selection(2, 2, 3, 7));
        new SnippetSession(editor, '<div>\n\t$TM_SELECTED_TEXT\n</div>$0', undefined, languageConfigurationService).insert();
        expected = [
            'start',
            '\t<div>',
            '\t\t\t-one',
            '\t\t-two',
            '\t</div>',
            'end'
        ].join('\n');
        assert.strictEqual(editor.getModel().getValue(), expected);
    });
    test('Selecting text from left to right, and choosing item messes up code, #31199', function () {
        const model = editor.getModel();
        model.setValue('console.log');
        let actual = SnippetSession.adjustSelection(model, new Selection(1, 12, 1, 9), 3, 0);
        assert.ok(actual.equalsSelection(new Selection(1, 9, 1, 6)));
        actual = SnippetSession.adjustSelection(model, new Selection(1, 9, 1, 12), 3, 0);
        assert.ok(actual.equalsSelection(new Selection(1, 9, 1, 12)));
        editor.setSelections([new Selection(1, 9, 1, 12)]);
        new SnippetSession(editor, 'far', { overwriteBefore: 3, overwriteAfter: 0, adjustWhitespace: true, clipboardText: undefined, overtypingCapturer: undefined }, languageConfigurationService).insert();
        assert.strictEqual(model.getValue(), 'console.far');
    });
    test('Tabs don\'t get replaced with spaces in snippet transformations #103818', function () {
        const model = editor.getModel();
        model.setValue('\n{\n  \n}');
        model.updateOptions({ insertSpaces: true, indentSize: 2 });
        editor.setSelections([new Selection(1, 1, 1, 1), new Selection(3, 6, 3, 6)]);
        const session = new SnippetSession(editor, [
            'function animate () {',
            '\tvar ${1:a} = 12;',
            '\tconsole.log(${1/(.*)/\n\t\t$1\n\t/})',
            '}'
        ].join('\n'), undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(model.getValue(), [
            'function animate () {',
            '  var a = 12;',
            '  console.log(a)',
            '}',
            '{',
            '  function animate () {',
            '    var a = 12;',
            '    console.log(a)',
            '  }',
            '}',
        ].join('\n'));
        editor.trigger('test', 'type', { text: 'bbb' });
        session.next();
        assert.strictEqual(model.getValue(), [
            'function animate () {',
            '  var bbb = 12;',
            '  console.log(',
            '    bbb',
            '  )',
            '}',
            '{',
            '  function animate () {',
            '    var bbb = 12;',
            '    console.log(',
            '      bbb',
            '    )',
            '  }',
            '}',
        ].join('\n'));
    });
    suite('createEditsAndSnippetsFromEdits', function () {
        test('empty', function () {
            const result = SnippetSession.createEditsAndSnippetsFromEdits(editor, [], true, true, undefined, undefined, languageConfigurationService);
            assert.deepStrictEqual(result.edits, []);
            assert.deepStrictEqual(result.snippets, []);
        });
        test('basic', function () {
            editor.getModel().setValue('foo("bar")');
            const result = SnippetSession.createEditsAndSnippetsFromEdits(editor, [{ range: new Range(1, 5, 1, 9), template: '$1' }, { range: new Range(1, 1, 1, 1), template: 'const ${1:new_const} = "bar"' }], true, true, undefined, undefined, languageConfigurationService);
            assert.strictEqual(result.edits.length, 2);
            assert.deepStrictEqual(result.edits[0].range, new Range(1, 1, 1, 1));
            assert.deepStrictEqual(result.edits[0].text, 'const new_const = "bar"');
            assert.deepStrictEqual(result.edits[1].range, new Range(1, 5, 1, 9));
            assert.deepStrictEqual(result.edits[1].text, 'new_const');
            assert.strictEqual(result.snippets.length, 1);
            assert.strictEqual(result.snippets[0].isTrivialSnippet, false);
        });
        test('with $SELECTION variable', function () {
            editor.getModel().setValue('Some text and a selection');
            editor.setSelections([new Selection(1, 17, 1, 26)]);
            const result = SnippetSession.createEditsAndSnippetsFromEdits(editor, [{ range: new Range(1, 17, 1, 26), template: 'wrapped <$SELECTION>' }], true, true, undefined, undefined, languageConfigurationService);
            assert.strictEqual(result.edits.length, 1);
            assert.deepStrictEqual(result.edits[0].range, new Range(1, 17, 1, 26));
            assert.deepStrictEqual(result.edits[0].text, 'wrapped <selection>');
            assert.strictEqual(result.snippets.length, 1);
            assert.strictEqual(result.snippets[0].isTrivialSnippet, true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFNlc3Npb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbmlwcGV0L3Rlc3QvYnJvd3Nlci9zbmlwcGV0U2Vzc2lvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFOUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNySCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRWpHLEtBQUssQ0FBQyxn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RUFBRSxDQUFDO1FBQ2pCLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9FLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9FLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9FLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9FLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRWhELE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRWhELE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRWhELE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLDREQUE0RCxDQUFDLENBQUM7UUFDbkcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbkYsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2YsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEYsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2YsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMs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RSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTlELE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXRFLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBRTlFLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUUvQyxNQUFNLENBQUMs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