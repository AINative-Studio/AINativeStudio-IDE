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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGFibGVUZXh0TW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvZWRpdGFibGVUZXh0TW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFdEQsS0FBSyxDQUFDLG9FQUFvRSxFQUFFLEdBQUcsRUFBRTtJQUVoRix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsY0FBYyxDQUFDLFFBQWtCLEVBQUUsS0FBNkIsRUFBRSxNQUFlLEVBQUUsS0FBYztRQUN6RyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ25ELEtBQUssQ0FBQyxNQUFNLDhCQUFzQixDQUFDO1FBRW5DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXBELEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsS0FB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LENBQzdCO1lBQ0MsUUFBUTtZQUNSLFdBQVc7WUFDWCxNQUFNO1NBQ04sRUFDRDtZQUNDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QixFQUNEO1lBQ0MsU0FBUztZQUNULFdBQVc7WUFDWCxNQUFNO1NBQ047UUFDSix3QkFBd0IsQ0FBQSxJQUFJLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsOEJBQThCLENBQzdCO1lBQ0MsUUFBUTtZQUNSLFdBQVc7WUFDWCxNQUFNO1NBQ04sRUFDRDtZQUNDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QixFQUNEO1lBQ0MsT0FBTztZQUNQLFdBQVc7WUFDWCxNQUFNO1NBQ047UUFDSix3QkFBd0IsQ0FBQSxJQUFJLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsOEJBQThCLENBQzdCO1lBQ0MsUUFBUTtZQUNSLFdBQVc7WUFDWCxNQUFNO1NBQ04sRUFDRDtZQUNDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QixFQUNEO1lBQ0MsT0FBTztZQUNQLFdBQVc7WUFDWCxNQUFNO1NBQ047UUFDSix3QkFBd0IsQ0FBQSxJQUFJLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsOEJBQThCLENBQzdCO1lBQ0MsUUFBUTtZQUNSLFdBQVc7WUFDWCxNQUFNO1NBQ04sRUFDRDtZQUNDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFB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