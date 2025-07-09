/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { deserializePipePositions, serializePipePositions, testRepeatedActionAndExtractPositions } from '../../../wordOperations/test/browser/wordTestUtils.js';
import { CursorWordPartLeft, CursorWordPartLeftSelect, CursorWordPartRight, CursorWordPartRightSelect, DeleteWordPartLeft, DeleteWordPartRight } from '../../browser/wordPartOperations.js';
import { StaticServiceAccessor } from './utils.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
suite('WordPartOperations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const _deleteWordPartLeft = new DeleteWordPartLeft();
    const _deleteWordPartRight = new DeleteWordPartRight();
    const _cursorWordPartLeft = new CursorWordPartLeft();
    const _cursorWordPartLeftSelect = new CursorWordPartLeftSelect();
    const _cursorWordPartRight = new CursorWordPartRight();
    const _cursorWordPartRightSelect = new CursorWordPartRightSelect();
    const serviceAccessor = new StaticServiceAccessor().withService(ILanguageConfigurationService, new TestLanguageConfigurationService());
    function runEditorCommand(editor, command) {
        command.runEditorCommand(serviceAccessor, editor, null);
    }
    function cursorWordPartLeft(editor, inSelectionmode = false) {
        runEditorCommand(editor, inSelectionmode ? _cursorWordPartLeftSelect : _cursorWordPartLeft);
    }
    function cursorWordPartRight(editor, inSelectionmode = false) {
        runEditorCommand(editor, inSelectionmode ? _cursorWordPartRightSelect : _cursorWordPartRight);
    }
    function deleteWordPartLeft(editor) {
        runEditorCommand(editor, _deleteWordPartLeft);
    }
    function deleteWordPartRight(editor) {
        runEditorCommand(editor, _deleteWordPartRight);
    }
    test('cursorWordPartLeft - basic', () => {
        const EXPECTED = [
            '|start| |line|',
            '|this|Is|A|Camel|Case|Var|  |this_|is_|a_|snake_|case_|var| |THIS_|IS_|CAPS_|SNAKE| |this_|IS|Mixed|Use|',
            '|end| |line'
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordPartLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordPartLeft - issue #53899: whitespace', () => {
        const EXPECTED = '|myvar| |=| |\'|demonstration|     |of| |selection| |with| |space|\'';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordPartLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordPartLeft - issue #53899: underscores', () => {
        const EXPECTED = '|myvar| |=| |\'|demonstration_____|of| |selection| |with| |space|\'';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordPartLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordPartRight - basic', () => {
        const EXPECTED = [
            'start| |line|',
            '|this|Is|A|Camel|Case|Var|  |this|_is|_a|_snake|_case|_var| |THIS|_IS|_CAPS|_SNAKE| |this|_IS|Mixed|Use|',
            '|end| |line|'
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordPartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(3, 9)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordPartRight - issue #53899: whitespace', () => {
        const EXPECTED = 'myvar| |=| |\'|demonstration|     |of| |selection| |with| |space|\'|';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordPartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 52)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordPartRight - issue #53899: underscores', () => {
        const EXPECTED = 'myvar| |=| |\'|demonstration|_____of| |selection| |with| |space|\'|';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordPartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 52)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordPartRight - issue #53899: second case', () => {
        const EXPECTED = [
            ';| |--| |1|',
            '|;|        |--| |2|',
            '|;|    |#|3|',
            '|;|   |#|4|'
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordPartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(4, 7)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #93239 - cursorWordPartRight', () => {
        const EXPECTED = [
            'foo|_bar|',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordPartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 8)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #93239 - cursorWordPartLeft', () => {
        const EXPECTED = [
            '|foo_|bar',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 8), ed => cursorWordPartLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordPartLeft - basic', () => {
        const EXPECTED = '|   |/*| |Just| |some| |text| |a|+=| |3| |+|5|-|3| |*/|  |this|Is|A|Camel|Case|Var|  |this_|is_|a_|snake_|case_|var| |THIS_|IS_|CAPS_|SNAKE| |this_|IS|Mixed|Use';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1000), ed => deleteWordPartLeft(ed), ed => ed.getPosition(), ed => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordPartRight - basic', () => {
        const EXPECTED = '   |/*| |Just| |some| |text| |a|+=| |3| |+|5|-|3| |*/|  |this|Is|A|Camel|Case|Var|  |this|_is|_a|_snake|_case|_var| |THIS|_IS|_CAPS|_SNAKE| |this|_IS|Mixed|Use|';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => deleteWordPartRight(ed), ed => new Position(1, text.length - ed.getValue().length + 1), ed => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #158667: cursorWordPartLeft stops at "-" even when "-" is not in word separators', () => {
        const EXPECTED = [
            '|this-|is-|a-|kebab-|case-|var| |THIS-|IS-|CAPS-|KEBAB| |this-|IS|Mixed|Use',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordPartLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)), { wordSeparators: "!\"#&'()*+,./:;<=>?@[\\]^`{|}·" } // default characters sans '$-%~' plus '·'
        );
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #158667: cursorWordPartRight stops at "-" even when "-" is not in word separators', () => {
        const EXPECTED = [
            'this|-is|-a|-kebab|-case|-var| |THIS|-IS|-CAPS|-KEBAB| |this|-IS|Mixed|Use|',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordPartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 60)), { wordSeparators: "!\"#&'()*+,./:;<=>?@[\\]^`{|}·" } // default characters sans '$-%~' plus '·'
        );
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #158667: deleteWordPartLeft stops at "-" even when "-" is not in word separators', () => {
        const EXPECTED = [
            '|this-|is-|a-|kebab-|case-|var| |THIS-|IS-|CAPS-|KEBAB| |this-|IS|Mixed|Use',
        ].join(' ');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => deleteWordPartLeft(ed), ed => ed.getPosition(), ed => ed.getValue().length === 0, { wordSeparators: "!\"#&'()*+,./:;<=>?@[\\]^`{|}·" } // default characters sans '$-%~' plus '·'
        );
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #158667: deleteWordPartRight stops at "-" even when "-" is not in word separators', () => {
        const EXPECTED = [
            'this|-is|-a|-kebab|-case|-var| |THIS|-IS|-CAPS|-KEBAB| |this|-IS|Mixed|Use|',
        ].join(' ');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => deleteWordPartRight(ed), ed => new Position(1, text.length - ed.getValue().length + 1), ed => ed.getValue().length === 0, { wordSeparators: "!\"#&'()*+,./:;<=>?@[\\]^`{|}·" } // default characters sans '$-%~' plus '·'
        );
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZFBhcnRPcGVyYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvd29yZFBhcnRPcGVyYXRpb25zL3Rlc3QvYnJvd3Nlci93b3JkUGFydE9wZXJhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxzQkFBc0IsRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2hLLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSx5QkFBeUIsRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVMLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNuRCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUVySCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBRWhDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7SUFDckQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDdkQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7SUFDckQsTUFBTSx5QkFBeUIsR0FB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