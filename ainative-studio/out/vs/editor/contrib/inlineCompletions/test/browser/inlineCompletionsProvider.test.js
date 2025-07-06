/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { InlineCompletionsController } from '../../browser/controller/inlineCompletionsController.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { GhostTextContext, MockInlineCompletionsProvider } from './utils.js';
import { withAsyncTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { Selection } from '../../../../common/core/selection.js';
import { computeGhostText } from '../../browser/model/computeGhostText.js';
suite('Inline Completions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('inlineCompletionToGhostText', () => {
        function getOutput(text, suggestion) {
            const rangeStartOffset = text.indexOf('[');
            const rangeEndOffset = text.indexOf(']') - 1;
            const cleanedText = text.replace('[', '').replace(']', '');
            const tempModel = createTextModel(cleanedText);
            const range = Range.fromPositions(tempModel.getPositionAt(rangeStartOffset), tempModel.getPositionAt(rangeEndOffset));
            const options = ['prefix', 'subword'];
            const result = {};
            for (const option of options) {
                result[option] = computeGhostText(new SingleTextEdit(range, suggestion), tempModel, option)?.render(cleanedText, true);
            }
            tempModel.dispose();
            if (new Set(Object.values(result)).size === 1) {
                return Object.values(result)[0];
            }
            return result;
        }
        test('Basic', () => {
            assert.deepStrictEqual(getOutput('[foo]baz', 'foobar'), 'foo[bar]baz');
            assert.deepStrictEqual(getOutput('[aaa]aaa', 'aaaaaa'), 'aaa[aaa]aaa');
            assert.deepStrictEqual(getOutput('[foo]baz', 'boobar'), undefined);
            assert.deepStrictEqual(getOutput('[foo]foo', 'foofoo'), 'foo[foo]foo');
            assert.deepStrictEqual(getOutput('foo[]', 'bar\nhello'), 'foo[bar\nhello]');
        });
        test('Empty ghost text', () => {
            assert.deepStrictEqual(getOutput('[foo]', 'foo'), 'foo');
        });
        test('Whitespace (indentation)', () => {
            assert.deepStrictEqual(getOutput('[ foo]', 'foobar'), ' foo[bar]');
            assert.deepStrictEqual(getOutput('[\tfoo]', 'foobar'), '\tfoo[bar]');
            assert.deepStrictEqual(getOutput('[\t foo]', '\tfoobar'), '	 foo[bar]');
            assert.deepStrictEqual(getOutput('[\tfoo]', '\t\tfoobar'), { prefix: undefined, subword: '\t[\t]foo[bar]' });
            assert.deepStrictEqual(getOutput('[\t]', '\t\tfoobar'), '\t[\tfoobar]');
            assert.deepStrictEqual(getOutput('\t[]', '\t'), '\t[\t]');
            assert.deepStrictEqual(getOutput('\t[\t]', ''), '\t\t');
            assert.deepStrictEqual(getOutput('[ ]', 'return 1'), ' [return 1]');
        });
        test('Whitespace (outside of indentation)', () => {
            assert.deepStrictEqual(getOutput('bar[ foo]', 'foobar'), undefined);
            assert.deepStrictEqual(getOutput('bar[\tfoo]', 'foobar'), undefined);
        });
        test('Unsupported Case', () => {
            assert.deepStrictEqual(getOutput('fo[o\n]', 'x\nbar'), undefined);
        });
        test('New Line', () => {
            assert.deepStrictEqual(getOutput('fo[o\n]', 'o\nbar'), 'foo\n[bar]');
        });
        test('Multi Part Diffing', () => {
            assert.deepStrictEqual(getOutput('foo[()]', '(x);'), { prefix: undefined, subword: 'foo([x])[;]' });
            assert.deepStrictEqual(getOutput('[\tfoo]', '\t\tfoobar'), { prefix: undefined, subword: '\t[\t]foo[bar]' });
            assert.deepStrictEqual(getOutput('[(y ===)]', '(y === 1) { f(); }'), { prefix: undefined, subword: '(y ===[ 1])[ { f(); }]' });
            assert.deepStrictEqual(getOutput('[(y ==)]', '(y === 1) { f(); }'), { prefix: undefined, subword: '(y ==[= 1])[ { f(); }]' });
            assert.deepStrictEqual(getOutput('[(y ==)]', '(y === 1) { f(); }'), { prefix: undefined, subword: '(y ==[= 1])[ { f(); }]' });
        });
        test('Multi Part Diffing 1', () => {
            assert.deepStrictEqual(getOutput('[if () ()]', 'if (1 == f()) ()'), { prefix: undefined, subword: 'if ([1 == f()]) ()' });
        });
        test('Multi Part Diffing 2', () => {
            assert.deepStrictEqual(getOutput('[)]', '())'), ({ prefix: undefined, subword: "[(])[)]" }));
            assert.deepStrictEqual(getOutput('[))]', '(())'), ({ prefix: undefined, subword: "[((]))" }));
        });
        test('Parenthesis Matching', () => {
            assert.deepStrictEqual(getOutput('[console.log()]', 'console.log({ label: "(" })'), {
                prefix: undefined,
                subword: 'console.log([{ label: "(" }])'
            });
        });
    });
    test('Does not trigger automatically if disabled', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, inlineSuggest: { enabled: false } }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            await timeout(1000);
            // Provider is not called, no ghost text is shown.
            assert.deepStrictEqual(provider.getAndClearCallHistory(), []);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['']);
        });
    });
    test('Ghost text is shown after trigger', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 1, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]']);
        });
    });
    test('Ghost text is shown automatically when configured', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 0, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]']);
        });
    });
    test('Ghost text is updated automatically', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            context.keyboardType('foo');
            model.triggerExplicitly();
            await timeout(1000);
            provider.setReturnValue({ insertText: 'foobizz', range: new Range(1, 1, 1, 6) });
            context.keyboardType('b');
            context.keyboardType('i');
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 1, },
                { position: '(1,6)', text: 'foobi', triggerKind: 0, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]', 'foob[ar]', 'foobi', 'foobi[zz]']);
        });
    });
    test('Unindent whitespace', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('  ');
            provider.setReturnValue({ insertText: 'foo', range: new Range(1, 2, 1, 3) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', '  [foo]']);
            model.accept(editor);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,3)', text: '  ', triggerKind: 1, },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), [' foo']);
        });
    });
    test('Unindent tab', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('\t\t');
            provider.setReturnValue({ insertText: 'foo', range: new Range(1, 2, 1, 3) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', '\t\t[foo]']);
            model.accept(editor);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,3)', text: '\t\t', triggerKind: 1, },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['\tfoo']);
        });
    });
    test('No unindent after indentation', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('buzz  ');
            provider.setReturnValue({ insertText: 'foo', range: new Range(1, 6, 1, 7) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['']);
            model.accept(editor);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,7)', text: 'buzz  ', triggerKind: 1, },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), []);
        });
    });
    test('Next/previous', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            provider.setReturnValue({ insertText: 'foobar1', range: new Range(1, 1, 1, 4) });
            model.trigger();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar1]']);
            provider.setReturnValues([
                { insertText: 'foobar1', range: new Range(1, 1, 1, 4) },
                { insertText: 'foobizz2', range: new Range(1, 1, 1, 4) },
                { insertText: 'foobuzz3', range: new Range(1, 1, 1, 4) }
            ]);
            model.next();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[bizz2]']);
            model.next();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[buzz3]']);
            model.next();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[bar1]']);
            model.previous();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[buzz3]']);
            model.previous();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[bizz2]']);
            model.previous();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[bar1]']);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 0, },
                { position: '(1,4)', text: 'foo', triggerKind: 1, },
            ]);
        });
    });
    test('Calling the provider is debounced', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            model.trigger();
            context.keyboardType('f');
            await timeout(40);
            context.keyboardType('o');
            await timeout(40);
            context.keyboardType('o');
            await timeout(40);
            // The provider is not called
            assert.deepStrictEqual(provider.getAndClearCallHistory(), []);
            await timeout(400);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 0, }
            ]);
            provider.assertNotCalledTwiceWithin50ms();
        });
    });
    test('Backspace is debounced', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            await timeout(1000);
            for (let j = 0; j < 2; j++) {
                for (let i = 0; i < 3; i++) {
                    context.leftDelete();
                    await timeout(5);
                }
                context.keyboardType('bar');
            }
            await timeout(400);
            provider.assertNotCalledTwiceWithin50ms();
        });
    });
    test('Forward stability', async function () {
        // The user types the text as suggested and the provider is forward-stable
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            context.keyboardType('foo');
            model.trigger();
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 0, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]']);
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 5) });
            context.keyboardType('b');
            assert.deepStrictEqual(context.currentPrettyViewState, 'foob[ar]');
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,5)', text: 'foob', triggerKind: 0, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foob[ar]']);
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 6) });
            context.keyboardType('a');
            assert.deepStrictEqual(context.currentPrettyViewState, 'fooba[r]');
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,6)', text: 'fooba', triggerKind: 0, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['fooba[r]']);
        });
    });
    test('Support forward instability', async function () {
        // The user types the text as suggested and the provider reports a different suggestion.
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            context.keyboardType('foo');
            model.triggerExplicitly();
            await timeout(100);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 1, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]']);
            provider.setReturnValue({ insertText: 'foobaz', range: new Range(1, 1, 1, 5) });
            context.keyboardType('b');
            assert.deepStrictEqual(context.currentPrettyViewState, 'foob[ar]');
            await timeout(100);
            // This behavior might change!
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,5)', text: 'foob', triggerKind: 0, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foob[ar]', 'foob[az]']);
        });
    });
    test('Support backward instability', async function () {
        // The user deletes text and the suggestion changes
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('fooba');
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 6) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,6)', text: 'fooba', triggerKind: 1, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'fooba[r]']);
            provider.setReturnValue({ insertText: 'foobaz', range: new Range(1, 1, 1, 5) });
            context.leftDelete();
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,5)', text: 'foob', triggerKind: 0, }
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), [
                'foob[ar]',
                'foob[az]'
            ]);
        });
    });
    test('No race conditions', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('h');
            provider.setReturnValue({ insertText: 'helloworld', range: new Range(1, 1, 1, 2) }, 1000);
            model.triggerExplicitly();
            await timeout(1030);
            context.keyboardType('ello');
            provider.setReturnValue({ insertText: 'helloworld', range: new Range(1, 1, 1, 6) }, 1000);
            // after 20ms: Inline completion provider answers back
            // after 50ms: Debounce is triggered
            await timeout(2000);
            assert.deepStrictEqual(context.getAndClearViewStates(), [
                '',
                'hello[world]',
            ]);
        });
    });
    test('Do not reuse cache from previous session (#132516)', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('hello\n');
            context.cursorLeft();
            context.keyboardType('x');
            context.leftDelete();
            provider.setReturnValue({ insertText: 'helloworld', range: new Range(1, 1, 1, 6) }, 1000);
            await timeout(2000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                {
                    position: '(1,6)',
                    text: 'hello\n',
                    triggerKind: 0,
                }
            ]);
            provider.setReturnValue({ insertText: 'helloworld', range: new Range(2, 1, 2, 6) }, 1000);
            context.cursorDown();
            context.keyboardType('hello');
            await timeout(40);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), []);
            // Update ghost text
            context.keyboardType('w');
            context.leftDelete();
            await timeout(2000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(2,6)', triggerKind: 0, text: 'hello\nhello' },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), [
                '',
                'hello[world]\n',
                'hello\n',
                'hello\nhello[world]',
            ]);
        });
    });
    test('Additional Text Edits', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('buzz\nbaz');
            provider.setReturnValue({
                insertText: 'bazz',
                range: new Range(2, 1, 2, 4),
                additionalTextEdits: [{
                        range: new Range(1, 1, 1, 5),
                        text: 'bla'
                    }],
            });
            model.triggerExplicitly();
            await timeout(1000);
            model.accept(editor);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), ([{ position: "(2,4)", triggerKind: 1, text: "buzz\nbaz" }]));
            assert.deepStrictEqual(context.getAndClearViewStates(), [
                '',
                'buzz\nbaz[z]',
                'bla\nbazz',
            ]);
        });
    });
    suite('inlineCompletionMultiCursor', () => {
        test('Basic', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('console\nconsole\n');
                editor.setSelections([
                    new Selection(1, 1000, 1, 1000),
                    new Selection(2, 1000, 2, 1000),
                ]);
                provider.setReturnValue({
                    insertText: 'console.log("hello");',
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                model.accept(editor);
                assert.deepStrictEqual(editor.getValue(), [
                    `console.log("hello");`,
                    `console.log("hello");`,
                    ``
                ].join('\n'));
            });
        });
        test('Multi Part', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('console.log()\nconsole.log\n');
                editor.setSelections([
                    new Selection(1, 12, 1, 12),
                    new Selection(2, 1000, 2, 1000),
                ]);
                provider.setReturnValue({
                    insertText: 'console.log("hello");',
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                model.accept(editor);
                assert.deepStrictEqual(editor.getValue(), [
                    `console.log("hello");`,
                    `console.log("hello");`,
                    ``
                ].join('\n'));
            });
        });
        test('Multi Part and Different Cursor Columns', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('console.log()\nconsole.warn\n');
                editor.setSelections([
                    new Selection(1, 12, 1, 12),
                    new Selection(2, 14, 2, 14),
                ]);
                provider.setReturnValue({
                    insertText: 'console.log("hello");',
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                model.accept(editor);
                assert.deepStrictEqual(editor.getValue(), [
                    `console.log("hello");`,
                    `console.warn("hello");`,
                    ``
                ].join('\n'));
            });
        });
        async function acceptNextWord(model, editor, timesToAccept = 1) {
            for (let i = 0; i < timesToAccept; i++) {
                model.triggerExplicitly();
                await timeout(1000);
                await model.acceptNextWord(editor);
            }
        }
        test('Basic Partial Completion', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('let\nlet\n');
                editor.setSelections([
                    new Selection(1, 1000, 1, 1000),
                    new Selection(2, 1000, 2, 1000),
                ]);
                provider.setReturnValue({
                    insertText: `let a = 'some word'; `,
                    range: new Range(1, 1, 1, 1000),
                });
                await acceptNextWord(model, editor, 2);
                assert.deepStrictEqual(editor.getValue(), [
                    `let a`,
                    `let a`,
                    ``
                ].join('\n'));
            });
        });
        test('Partial Multi-Part Completion', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('for ()\nfor \n');
                editor.setSelections([
                    new Selection(1, 5, 1, 5),
                    new Selection(2, 1000, 2, 1000),
                ]);
                provider.setReturnValue({
                    insertText: `for (let i = 0; i < 10; i++) {`,
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                await acceptNextWord(model, editor, 3);
                assert.deepStrictEqual(editor.getValue(), [
                    `for (let i)`,
                    `for (let i`,
                    ``
                ].join('\n'));
            });
        });
        test('Partial Mutli-Part and Different Cursor Columns Completion', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType(`console.log()\nconsole.warnnnn\n`);
                editor.setSelections([
                    new Selection(1, 12, 1, 12),
                    new Selection(2, 16, 2, 16),
                ]);
                provider.setReturnValue({
                    insertText: `console.log("hello" + " " + "world");`,
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                await acceptNextWord(model, editor, 4);
                assert.deepStrictEqual(editor.getValue(), [
                    `console.log("hello" + )`,
                    `console.warnnnn("hello" + `,
                    ``
                ].join('\n'));
            });
        });
    });
});
async function withAsyncTestCodeEditorAndInlineCompletionsModel(text, options, callback) {
    return await runWithFakedTimers({
        useFakeTimers: options.fakeClock,
    }, async () => {
        const disposableStore = new DisposableStore();
        try {
            if (options.provider) {
                const languageFeaturesService = new LanguageFeaturesService();
                if (!options.serviceCollection) {
                    options.serviceCollection = new ServiceCollection();
                }
                options.serviceCollection.set(ILanguageFeaturesService, languageFeaturesService);
                options.serviceCollection.set(IAccessibilitySignalService, {
                    playSignal: async () => { },
                    isSoundEnabled(signal) { return false; },
                });
                const d = languageFeaturesService.inlineCompletionsProvider.register({ pattern: '**' }, options.provider);
                disposableStore.add(d);
            }
            let result;
            await withAsyncTestCodeEditor(text, options, async (editor, editorViewModel, instantiationService) => {
                const controller = instantiationService.createInstance(InlineCompletionsController, editor);
                const model = controller.model.get();
                const context = new GhostTextContext(model, editor);
                try {
                    result = await callback({ editor, editorViewModel, model, context });
                }
                finally {
                    context.dispose();
                    model.dispose();
                    controller.dispose();
                }
            });
            if (options.provider instanceof MockInlineCompletionsProvider) {
                options.provider.assertNotCalledTwiceWithin50ms();
            }
            return result;
        }
        finally {
            disposableStore.dispose();
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNQcm92aWRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL2lubGluZUNvbXBsZXRpb25zUHJvdmlkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFakcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM3RSxPQUFPLEVBQXVELHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1GQUFtRixDQUFDO0FBQ2hJLE9BQU8sRUFB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