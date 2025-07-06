/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { MirrorTextModel } from '../../../common/model/mirrorTextModel.js';
import { assertSyncedModels, testApplyEditsWithSyncedModels } from './editableTextModelTestUtils.js';
import { createTextModel } from '../testTextModel.js';
suite('EditorModel - EditableTextModel.applyEdits updates mightContainRTL', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testApplyEdits(original, edits, before, after) {
        const model = createTextModel(original.join('\n'));
        model.setEOL(0 /* EndOfLineSequence.LF */);
        assert.strictEqual(model.mightContainRTL(), before);
        model.applyEdits(edits);
        assert.strictEqual(model.mightContainRTL(), after);
        model.dispose();
    }
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, text) {
        return {
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            text: text.join('\n')
        };
    }
    test('start with RTL, insert LTR', () => {
        testApplyEdits(['Hello,\nזוהי עובדה מבוססת שדעתו'], [editOp(1, 1, 1, 1, ['hello'])], true, true);
    });
    test('start with RTL, delete RTL', () => {
        testApplyEdits(['Hello,\nזוהי עובדה מבוססת שדעתו'], [editOp(1, 1, 10, 10, [''])], true, true);
    });
    test('start with RTL, insert RTL', () => {
        testApplyEdits(['Hello,\nזוהי עובדה מבוססת שדעתו'], [editOp(1, 1, 1, 1, ['هناك حقيقة مثبتة منذ زمن طويل'])], true, true);
    });
    test('start with LTR, insert LTR', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['hello'])], false, false);
    });
    test('start with LTR, insert RTL 1', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['هناك حقيقة مثبتة منذ زمن طويل'])], false, true);
    });
    test('start with LTR, insert RTL 2', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['זוהי עובדה מבוססת שדעתו'])], false, true);
    });
});
suite('EditorModel - EditableTextModel.applyEdits updates mightContainNonBasicASCII', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testApplyEdits(original, edits, before, after) {
        const model = createTextModel(original.join('\n'));
        model.setEOL(0 /* EndOfLineSequence.LF */);
        assert.strictEqual(model.mightContainNonBasicASCII(), before);
        model.applyEdits(edits);
        assert.strictEqual(model.mightContainNonBasicASCII(), after);
        model.dispose();
    }
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, text) {
        return {
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            text: text.join('\n')
        };
    }
    test('start with NON-ASCII, insert ASCII', () => {
        testApplyEdits(['Hello,\nZürich'], [editOp(1, 1, 1, 1, ['hello', 'second line'])], true, true);
    });
    test('start with NON-ASCII, delete NON-ASCII', () => {
        testApplyEdits(['Hello,\nZürich'], [editOp(1, 1, 10, 10, [''])], true, true);
    });
    test('start with NON-ASCII, insert NON-ASCII', () => {
        testApplyEdits(['Hello,\nZürich'], [editOp(1, 1, 1, 1, ['Zürich'])], true, true);
    });
    test('start with ASCII, insert ASCII', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['hello', 'second line'])], false, false);
    });
    test('start with ASCII, insert NON-ASCII', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['Zürich', 'Zürich'])], false, true);
    });
});
suite('EditorModel - EditableTextModel.applyEdits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, text) {
        return {
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            text: text.join('\n'),
            forceMoveMarkers: false
        };
    }
    test('high-low surrogates 1', () => {
        testApplyEditsWithSyncedModels([
            '📚some',
            'very nice',
            'text'
        ], [
            editOp(1, 2, 1, 2, ['a'])
        ], [
            'a📚some',
            'very nice',
            'text'
        ], 
        /*inputEditsAreInvalid*/ true);
    });
    test('high-low surrogates 2', () => {
        testApplyEditsWithSyncedModels([
            '📚some',
            'very nice',
            'text'
        ], [
            editOp(1, 2, 1, 3, ['a'])
        ], [
            'asome',
            'very nice',
            'text'
        ], 
        /*inputEditsAreInvalid*/ true);
    });
    test('high-low surrogates 3', () => {
        testApplyEditsWithSyncedModels([
            '📚some',
            'very nice',
            'text'
        ], [
            editOp(1, 1, 1, 2, ['a'])
        ], [
            'asome',
            'very nice',
            'text'
        ], 
        /*inputEditsAreInvalid*/ true);
    });
    test('high-low surrogates 4', () => {
        testApplyEditsWithSyncedModels([
            '📚some',
            'very nice',
            'text'
        ], [
            editOp(1, 1, 1, 3, ['a'])
        ], [
            'asome',
            'very nice',
            'text'
        ], 
        /*inputEditsAreInvalid*/ true);
    });
    test('Bug 19872: Undo is funky', () => {
        testApplyEditsWithSyncedModels([
            'something',
            ' A',
            '',
            ' B',
            'something else'
        ], [
            editOp(2, 1, 2, 2, ['']),
            editOp(3, 1, 4, 2, [''])
        ], [
            'something',
            'A',
            'B',
            'something else'
        ]);
    });
    test('Bug 19872: Undo is funky (2)', () => {
        testApplyEditsWithSyncedModels([
            'something',
            'A',
            'B',
            'something else'
        ], [
            editOp(2, 1, 2, 1, [' ']),
            editOp(3, 1, 3, 1, ['', ' '])
        ], [
            'something',
            ' A',
            '',
            ' B',
            'something else'
        ]);
    });
    test('insert empty text', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 1, [''])
        ], [
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('last op is no-op', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 2, ['']),
            editOp(4, 1, 4, 1, [''])
        ], [
            'y First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('insert text without newline 1', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 1, ['foo '])
        ], [
            'foo My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('insert text without newline 2', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 3, 1, 3, [' foo'])
        ], [
            'My foo First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('insert one newline', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 4, 1, 4, ['', ''])
        ], [
            'My ',
            'First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('insert text with one newline', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 3, 1, 3, [' new line', 'No longer'])
        ], [
            'My new line',
            'No longer First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('insert text with two newlines', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 3, 1, 3, [' new line', 'One more line in the middle', 'No longer'])
        ], [
            'My new line',
            'One more line in the middle',
            'No longer First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('insert text with many newlines', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 3, 1, 3, ['', '', '', '', ''])
        ], [
            'My',
            '',
            '',
            '',
            ' First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('insert multiple newlines', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 3, 1, 3, ['', '', '', '', '']),
            editOp(3, 15, 3, 15, ['a', 'b'])
        ], [
            'My',
            '',
            '',
            '',
            ' First Line',
            '\t\tMy Second Line',
            '    Third Linea',
            'b',
            '',
            '1'
        ]);
    });
    test('delete empty text', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 1, [''])
        ], [
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('delete text from one line', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 2, [''])
        ], [
            'y First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('delete text from one line 2', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 3, ['a'])
        ], [
            'a First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('delete all text from a line', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 14, [''])
        ], [
            '',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('delete text from two lines', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 4, 2, 6, [''])
        ], [
            'My Second Line',
            '    Third Line',
            '',
            '1'
        ]);
    });
    test('delete text from many lines', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 4, 3, 5, [''])
        ], [
            'My Third Line',
            '',
            '1'
        ]);
    });
    test('delete everything', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 5, 2, [''])
        ], [
            ''
        ]);
    });
    test('two unrelated edits', () => {
        testApplyEditsWithSyncedModels([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], [
            editOp(2, 1, 2, 3, ['\t']),
            editOp(3, 1, 3, 5, [''])
        ], [
            'My First Line',
            '\tMy Second Line',
            'Third Line',
            '',
            '123'
        ]);
    });
    test('two edits on one line', () => {
        testApplyEditsWithSyncedModels([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], [
            editOp(5, 3, 5, 7, ['']),
            editOp(5, 12, 5, 16, [''])
        ], [
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\tfifth\t\t'
        ]);
    });
    test('many edits', () => {
        testApplyEditsWithSyncedModels([
            '{"x" : 1}'
        ], [
            editOp(1, 2, 1, 2, ['\n  ']),
            editOp(1, 5, 1, 6, ['']),
            editOp(1, 9, 1, 9, ['\n'])
        ], [
            '{',
            '  "x": 1',
            '}'
        ]);
    });
    test('many edits reversed', () => {
        testApplyEditsWithSyncedModels([
            '{',
            '  "x": 1',
            '}'
        ], [
            editOp(1, 2, 2, 3, ['']),
            editOp(2, 6, 2, 6, [' ']),
            editOp(2, 9, 3, 1, [''])
        ], [
            '{"x" : 1}'
        ]);
    });
    test('replacing newlines 1', () => {
        testApplyEditsWithSyncedModels([
            '{',
            '"a": true,',
            '',
            '"b": true',
            '}'
        ], [
            editOp(1, 2, 2, 1, ['', '\t']),
            editOp(2, 11, 4, 1, ['', '\t'])
        ], [
            '{',
            '\t"a": true,',
            '\t"b": true',
            '}'
        ]);
    });
    test('replacing newlines 2', () => {
        testApplyEditsWithSyncedModels([
            'some text',
            'some more text',
            'now comes an empty line',
            '',
            'after empty line',
            'and the last line'
        ], [
            editOp(1, 5, 3, 1, [' text', 'some more text', 'some more text']),
            editOp(3, 2, 4, 1, ['o more lines', 'asd', 'asd', 'asd']),
            editOp(5, 1, 5, 6, ['zzzzzzzz']),
            editOp(5, 11, 6, 16, ['1', '2', '3', '4'])
        ], [
            'some text',
            'some more text',
            'some more textno more lines',
            'asd',
            'asd',
            'asd',
            'zzzzzzzz empt1',
            '2',
            '3',
            '4ne'
        ]);
    });
    test('advanced 1', () => {
        testApplyEditsWithSyncedModels([
            ' {       "d": [',
            '             null',
            '        ] /*comment*/',
            '        ,"e": /*comment*/ [null] }',
        ], [
            editOp(1, 1, 1, 2, ['']),
            editOp(1, 3, 1, 10, ['', '  ']),
            editOp(1, 16, 2, 14, ['', '    ']),
            editOp(2, 18, 3, 9, ['', '  ']),
            editOp(3, 22, 4, 9, ['']),
            editOp(4, 10, 4, 10, ['', '  ']),
            editOp(4, 28, 4, 28, ['', '    ']),
            editOp(4, 32, 4, 32, ['', '  ']),
            editOp(4, 33, 4, 34, ['', ''])
        ], [
            '{',
            '  "d": [',
            '    null',
            '  ] /*comment*/,',
            '  "e": /*comment*/ [',
            '    null',
            '  ]',
            '}',
        ]);
    });
    test('advanced simplified', () => {
        testApplyEditsWithSyncedModels([
            '   abc',
            ' ,def'
        ], [
            editOp(1, 1, 1, 4, ['']),
            editOp(1, 7, 2, 2, ['']),
            editOp(2, 3, 2, 3, ['', ''])
        ], [
            'abc,',
            'def'
        ]);
    });
    test('issue #144', () => {
        testApplyEditsWithSyncedModels([
            'package caddy',
            '',
            'func main() {',
            '\tfmt.Println("Hello World! :)")',
            '}',
            ''
        ], [
            editOp(1, 1, 6, 1, [
                'package caddy',
                '',
                'import "fmt"',
                '',
                'func main() {',
                '\tfmt.Println("Hello World! :)")',
                '}',
                ''
            ])
        ], [
            'package caddy',
            '',
            'import "fmt"',
            '',
            'func main() {',
            '\tfmt.Println("Hello World! :)")',
            '}',
            ''
        ]);
    });
    test('issue #2586 Replacing selected end-of-line with newline locks up the document', () => {
        testApplyEditsWithSyncedModels([
            'something',
            'interesting'
        ], [
            editOp(1, 10, 2, 1, ['', ''])
        ], [
            'something',
            'interesting'
        ]);
    });
    test('issue #3980', () => {
        testApplyEditsWithSyncedModels([
            'class A {',
            '    someProperty = false;',
            '    someMethod() {',
            '    this.someMethod();',
            '    }',
            '}',
        ], [
            editOp(1, 8, 1, 9, ['', '']),
            editOp(3, 17, 3, 18, ['', '']),
            editOp(3, 18, 3, 18, ['    ']),
            editOp(4, 5, 4, 5, ['    ']),
        ], [
            'class A',
            '{',
            '    someProperty = false;',
            '    someMethod()',
            '    {',
            '        this.someMethod();',
            '    }',
            '}',
        ]);
    });
    function testApplyEditsFails(original, edits) {
        const model = createTextModel(original.join('\n'));
        let hasThrown = false;
        try {
            model.applyEdits(edits);
        }
        catch (err) {
            hasThrown = true;
        }
        assert.ok(hasThrown, 'expected model.applyEdits to fail.');
        model.dispose();
    }
    test('touching edits: two inserts at the same position', () => {
        testApplyEditsWithSyncedModels([
            'hello world'
        ], [
            editOp(1, 1, 1, 1, ['a']),
            editOp(1, 1, 1, 1, ['b']),
        ], [
            'abhello world'
        ]);
    });
    test('touching edits: insert and replace touching', () => {
        testApplyEditsWithSyncedModels([
            'hello world'
        ], [
            editOp(1, 1, 1, 1, ['b']),
            editOp(1, 1, 1, 3, ['ab']),
        ], [
            'babllo world'
        ]);
    });
    test('overlapping edits: two overlapping replaces', () => {
        testApplyEditsFails([
            'hello world'
        ], [
            editOp(1, 1, 1, 2, ['b']),
            editOp(1, 1, 1, 3, ['ab']),
        ]);
    });
    test('overlapping edits: two overlapping deletes', () => {
        testApplyEditsFails([
            'hello world'
        ], [
            editOp(1, 1, 1, 2, ['']),
            editOp(1, 1, 1, 3, ['']),
        ]);
    });
    test('touching edits: two touching replaces', () => {
        testApplyEditsWithSyncedModels([
            'hello world'
        ], [
            editOp(1, 1, 1, 2, ['H']),
            editOp(1, 2, 1, 3, ['E']),
        ], [
            'HEllo world'
        ]);
    });
    test('touching edits: two touching deletes', () => {
        testApplyEditsWithSyncedModels([
            'hello world'
        ], [
            editOp(1, 1, 1, 2, ['']),
            editOp(1, 2, 1, 3, ['']),
        ], [
            'llo world'
        ]);
    });
    test('touching edits: insert and replace', () => {
        testApplyEditsWithSyncedModels([
            'hello world'
        ], [
            editOp(1, 1, 1, 1, ['H']),
            editOp(1, 1, 1, 3, ['e']),
        ], [
            'Hello world'
        ]);
    });
    test('touching edits: replace and insert', () => {
        testApplyEditsWithSyncedModels([
            'hello world'
        ], [
            editOp(1, 1, 1, 3, ['H']),
            editOp(1, 3, 1, 3, ['e']),
        ], [
            'Hello world'
        ]);
    });
    test('change while emitting events 1', () => {
        let disposable;
        assertSyncedModels('Hello', (model, assertMirrorModels) => {
            model.applyEdits([{
                    range: new Range(1, 6, 1, 6),
                    text: ' world!',
                    // forceMoveMarkers: false
                }]);
            assertMirrorModels();
        }, (model) => {
            let isFirstTime = true;
            disposable = model.onDidChangeContent(() => {
                if (!isFirstTime) {
                    return;
                }
                isFirstTime = false;
                model.applyEdits([{
                        range: new Range(1, 13, 1, 13),
                        text: ' How are you?',
                        // forceMoveMarkers: false
                    }]);
            });
        });
        disposable.dispose();
    });
    test('change while emitting events 2', () => {
        let disposable;
        assertSyncedModels('Hello', (model, assertMirrorModels) => {
            model.applyEdits([{
                    range: new Range(1, 6, 1, 6),
                    text: ' world!',
                    // forceMoveMarkers: false
                }]);
            assertMirrorModels();
        }, (model) => {
            let isFirstTime = true;
            disposable = model.onDidChangeContent((e) => {
                if (!isFirstTime) {
                    return;
                }
                isFirstTime = false;
                model.applyEdits([{
                        range: new Range(1, 13, 1, 13),
                        text: ' How are you?',
                        // forceMoveMarkers: false
                    }]);
            });
        });
        disposable.dispose();
    });
    test('issue #1580: Changes in line endings are not correctly reflected in the extension host, leading to invalid offsets sent to external refactoring tools', () => {
        const model = createTextModel('Hello\nWorld!');
        assert.strictEqual(model.getEOL(), '\n');
        const mirrorModel2 = new MirrorTextModel(null, model.getLinesContent(), model.getEOL(), model.getVersionId());
        let mirrorModel2PrevVersionId = model.getVersionId();
        const disposable = model.onDidChangeContent((e) => {
            const versionId = e.versionId;
            if (versionId < mirrorModel2PrevVersionId) {
                console.warn('Model version id did not advance between edits (2)');
            }
            mirrorModel2PrevVersionId = versionId;
            mirrorModel2.onEvents(e);
        });
        const assertMirrorModels = () => {
            assert.strictEqual(mirrorModel2.getText(), model.getValue(), 'mirror model 2 text OK');
            assert.strictEqual(mirrorModel2.version, model.getVersionId(), 'mirror model 2 version OK');
        };
        model.setEOL(1 /* EndOfLineSequence.CRLF */);
        assertMirrorModels();
        disposable.dispose();
        model.dispose();
        mirrorModel2.dispose();
    });
    test('issue #47733: Undo mangles unicode characters', () => {
        const model = createTextModel('\'👁\'');
        model.applyEdits([
            { range: new Range(1, 1, 1, 1), text: '"' },
            { range: new Range(1, 2, 1, 2), text: '"' },
        ]);
        assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '"\'"👁\'');
        assert.deepStrictEqual(model.validateRange(new Range(1, 3, 1, 4)), new Range(1, 3, 1, 4));
        model.applyEdits([
            { range: new Range(1, 1, 1, 2), text: null },
            { range: new Range(1, 3, 1, 4), text: null },
        ]);
        assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\'👁\'');
        model.dispose();
    });
    test('issue #48741: Broken undo stack with move lines up with multiple cursors', () => {
        const model = createTextModel([
            'line1',
            'line2',
            'line3',
            '',
        ].join('\n'));
        const undoEdits = model.applyEdits([
            { range: new Range(4, 1, 4, 1), text: 'line3', },
            { range: new Range(3, 1, 3, 6), text: null, },
            { range: new Range(2, 1, 3, 1), text: null, },
            { range: new Range(3, 6, 3, 6), text: '\nline2' }
        ], true);
        model.applyEdits(undoEdits);
        assert.deepStrictEqual(model.getValue(), 'line1\nline2\nline3\n');
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGFibGVUZXh0TW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2VkaXRhYmxlVGV4dE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLDhCQUE4QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXRELEtBQUssQ0FBQyxvRUFBb0UsRUFBRSxHQUFHLEVBQUU7SUFFaEYsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLGNBQWMsQ0FBQyxRQUFrQixFQUFFLEtBQTZCLEVBQUUsTUFBZSxFQUFFLEtBQWM7UUFDekcsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuRCxLQUFLLENBQUMsTUFBTSw4QkFBc0IsQ0FBQztRQUVuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVwRCxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25E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