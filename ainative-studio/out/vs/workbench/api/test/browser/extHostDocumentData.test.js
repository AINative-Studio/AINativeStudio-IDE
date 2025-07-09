/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocumentData } from '../../common/extHostDocumentData.js';
import { Position } from '../../common/extHostTypes.js';
import { Range } from '../../../../editor/common/core/range.js';
import { mock } from '../../../../base/test/common/mock.js';
import * as perfData from './extHostDocumentData.test.perf-data.js';
import { setDefaultGetWordAtTextConfig } from '../../../../editor/common/core/wordHelper.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostDocumentData', () => {
    let data;
    function assertPositionAt(offset, line, character) {
        const position = data.document.positionAt(offset);
        assert.strictEqual(position.line, line);
        assert.strictEqual(position.character, character);
    }
    function assertOffsetAt(line, character, offset) {
        const pos = new Position(line, character);
        const actual = data.document.offsetAt(pos);
        assert.strictEqual(actual, offset);
    }
    setup(function () {
        data = new ExtHostDocumentData(undefined, URI.file(''), [
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ], '\n', 1, 'text', false, 'utf8');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('readonly-ness', () => {
        assert.throws(() => data.document.uri = null);
        assert.throws(() => data.document.fileName = 'foofile');
        assert.throws(() => data.document.isDirty = false);
        assert.throws(() => data.document.isUntitled = false);
        assert.throws(() => data.document.languageId = 'dddd');
        assert.throws(() => data.document.lineCount = 9);
    });
    test('save, when disposed', function () {
        let saved;
        const data = new ExtHostDocumentData(new class extends mock() {
            $trySaveDocument(uri) {
                assert.ok(!saved);
                saved = uri;
                return Promise.resolve(true);
            }
        }, URI.parse('foo:bar'), [], '\n', 1, 'text', true, 'utf8');
        return data.document.save().then(() => {
            assert.strictEqual(saved.toString(), 'foo:bar');
            data.dispose();
            return data.document.save().then(() => {
                assert.ok(false, 'expected failure');
            }, err => {
                assert.ok(err);
            });
        });
    });
    test('read, when disposed', function () {
        data.dispose();
        const { document } = data;
        assert.strictEqual(document.lineCount, 4);
        assert.strictEqual(document.lineAt(0).text, 'This is line one');
    });
    test('lines', () => {
        assert.strictEqual(data.document.lineCount, 4);
        assert.throws(() => data.document.lineAt(-1));
        assert.throws(() => data.document.lineAt(data.document.lineCount));
        assert.throws(() => data.document.lineAt(Number.MAX_VALUE));
        assert.throws(() => data.document.lineAt(Number.MIN_VALUE));
        assert.throws(() => data.document.lineAt(0.8));
        let line = data.document.lineAt(0);
        assert.strictEqual(line.lineNumber, 0);
        assert.strictEqual(line.text.length, 16);
        assert.strictEqual(line.text, 'This is line one');
        assert.strictEqual(line.isEmptyOrWhitespace, false);
        assert.strictEqual(line.firstNonWhitespaceCharacterIndex, 0);
        data.onEvents({
            changes: [{
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: '\t '
                }],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        // line didn't change
        assert.strictEqual(line.text, 'This is line one');
        assert.strictEqual(line.firstNonWhitespaceCharacterIndex, 0);
        // fetch line again
        line = data.document.lineAt(0);
        assert.strictEqual(line.text, '\t This is line one');
        assert.strictEqual(line.firstNonWhitespaceCharacterIndex, 2);
    });
    test('line, issue #5704', function () {
        let line = data.document.lineAt(0);
        let { range, rangeIncludingLineBreak } = line;
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 16);
        assert.strictEqual(rangeIncludingLineBreak.end.line, 1);
        assert.strictEqual(rangeIncludingLineBreak.end.character, 0);
        line = data.document.lineAt(data.document.lineCount - 1);
        range = line.range;
        rangeIncludingLineBreak = line.rangeIncludingLineBreak;
        assert.strictEqual(range.end.line, 3);
        assert.strictEqual(range.end.character, 29);
        assert.strictEqual(rangeIncludingLineBreak.end.line, 3);
        assert.strictEqual(rangeIncludingLineBreak.end.character, 29);
    });
    test('offsetAt', () => {
        assertOffsetAt(0, 0, 0);
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 16, 16);
        assertOffsetAt(1, 0, 17);
        assertOffsetAt(1, 3, 20);
        assertOffsetAt(2, 0, 45);
        assertOffsetAt(4, 29, 95);
        assertOffsetAt(4, 30, 95);
        assertOffsetAt(4, Number.MAX_VALUE, 95);
        assertOffsetAt(5, 29, 95);
        assertOffsetAt(Number.MAX_VALUE, 29, 95);
        assertOffsetAt(Number.MAX_VALUE, Number.MAX_VALUE, 95);
    });
    test('offsetAt, after remove', function () {
        data.onEvents({
            changes: [{
                    range: { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 6 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: ''
                }],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 13, 13);
        assertOffsetAt(1, 0, 14);
    });
    test('offsetAt, after replace', function () {
        data.onEvents({
            changes: [{
                    range: { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 6 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: 'is could be'
                }],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 24, 24);
        assertOffsetAt(1, 0, 25);
    });
    test('offsetAt, after insert line', function () {
        data.onEvents({
            changes: [{
                    range: { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 6 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: 'is could be\na line with number'
                }],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 13, 13);
        assertOffsetAt(1, 0, 14);
        assertOffsetAt(1, 18, 13 + 1 + 18);
        assertOffsetAt(1, 29, 13 + 1 + 29);
        assertOffsetAt(2, 0, 13 + 1 + 29 + 1);
    });
    test('offsetAt, after remove line', function () {
        data.onEvents({
            changes: [{
                    range: { startLineNumber: 1, startColumn: 3, endLineNumber: 2, endColumn: 6 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: ''
                }],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 2, 2);
        assertOffsetAt(1, 0, 25);
    });
    test('positionAt', () => {
        assertPositionAt(0, 0, 0);
        assertPositionAt(Number.MIN_VALUE, 0, 0);
        assertPositionAt(1, 0, 1);
        assertPositionAt(16, 0, 16);
        assertPositionAt(17, 1, 0);
        assertPositionAt(20, 1, 3);
        assertPositionAt(45, 2, 0);
        assertPositionAt(95, 3, 29);
        assertPositionAt(96, 3, 29);
        assertPositionAt(99, 3, 29);
        assertPositionAt(Number.MAX_VALUE, 3, 29);
    });
    test('getWordRangeAtPosition', () => {
        data = new ExtHostDocumentData(undefined, URI.file(''), [
            'aaaa bbbb+cccc abc'
        ], '\n', 1, 'text', false, 'utf8');
        let range = data.document.getWordRangeAtPosition(new Position(0, 2));
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.start.character, 0);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 4);
        // ignore bad regular expresson /.*/
        assert.throws(() => data.document.getWordRangeAtPosition(new Position(0, 2), /.*/));
        range = data.document.getWordRangeAtPosition(new Position(0, 5), /[a-z+]+/);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.start.character, 5);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 14);
        range = data.document.getWordRangeAtPosition(new Position(0, 17), /[a-z+]+/);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.start.character, 15);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 18);
        range = data.document.getWordRangeAtPosition(new Position(0, 11), /yy/);
        assert.strictEqual(range, undefined);
    });
    test('getWordRangeAtPosition doesn\'t quite use the regex as expected, #29102', function () {
        data = new ExtHostDocumentData(undefined, URI.file(''), [
            'some text here',
            '/** foo bar */',
            'function() {',
            '	"far boo"',
            '}'
        ], '\n', 1, 'text', false, 'utf8');
        let range = data.document.getWordRangeAtPosition(new Position(0, 0), /\/\*.+\*\//);
        assert.strictEqual(range, undefined);
        range = data.document.getWordRangeAtPosition(new Position(1, 0), /\/\*.+\*\//);
        assert.strictEqual(range.start.line, 1);
        assert.strictEqual(range.start.character, 0);
        assert.strictEqual(range.end.line, 1);
        assert.strictEqual(range.end.character, 14);
        range = data.document.getWordRangeAtPosition(new Position(3, 0), /("|').*\1/);
        assert.strictEqual(range, undefined);
        range = data.document.getWordRangeAtPosition(new Position(3, 1), /("|').*\1/);
        assert.strictEqual(range.start.line, 3);
        assert.strictEqual(range.start.character, 1);
        assert.strictEqual(range.end.line, 3);
        assert.strictEqual(range.end.character, 10);
    });
    test('getWordRangeAtPosition can freeze the extension host #95319', function () {
        const regex = /(https?:\/\/github\.com\/(([^\s]+)\/([^\s]+))\/([^\s]+\/)?(issues|pull)\/([0-9]+))|(([^\s]+)\/([^\s]+))?#([1-9][0-9]*)($|[\s\:\;\-\(\=])/;
        data = new ExtHostDocumentData(undefined, URI.file(''), [
            perfData._$_$_expensive
        ], '\n', 1, 'text', false, 'utf8');
        // this test only ensures that we eventually give and timeout (when searching "funny" words and long lines)
        // for the sake of speedy tests we lower the timeBudget here
        const config = setDefaultGetWordAtTextConfig({ maxLen: 1000, windowSize: 15, timeBudget: 30 });
        try {
            let range = data.document.getWordRangeAtPosition(new Position(0, 1_177_170), regex);
            assert.strictEqual(range, undefined);
            const pos = new Position(0, 1177170);
            range = data.document.getWordRangeAtPosition(pos);
            assert.ok(range);
            assert.ok(range.contains(pos));
            assert.strictEqual(data.document.getText(range), 'TaskDefinition');
        }
        finally {
            config.dispose();
        }
    });
    test('Rename popup sometimes populates with text on the left side omitted #96013', function () {
        const regex = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;
        const line = 'int abcdefhijklmnopqwvrstxyz;';
        data = new ExtHostDocumentData(undefined, URI.file(''), [
            line
        ], '\n', 1, 'text', false, 'utf8');
        const range = data.document.getWordRangeAtPosition(new Position(0, 27), regex);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.start.character, 4);
        assert.strictEqual(range.end.character, 28);
    });
    test('Custom snippet $TM_SELECTED_TEXT not show suggestion #108892', function () {
        data = new ExtHostDocumentData(undefined, URI.file(''), [
            `        <p><span xml:lang="en">Sheldon</span>, soprannominato "<span xml:lang="en">Shelly</span> dalla madre e dalla sorella, è nato a <span xml:lang="en">Galveston</span>, in <span xml:lang="en">Texas</span>, il 26 febbraio 1980 in un supermercato. È stato un bambino prodigio, come testimoniato dal suo quoziente d'intelligenza (187, di molto superiore alla norma) e dalla sua rapida carriera scolastica: si è diplomato all'eta di 11 anni approdando alla stessa età alla formazione universitaria e all'età di 16 anni ha ottenuto il suo primo dottorato di ricerca. All'inizio della serie e per gran parte di essa vive con il coinquilino Leonard nell'appartamento 4A al 2311 <span xml:lang="en">North Los Robles Avenue</span> di <span xml:lang="en">Pasadena</span>, per poi trasferirsi nell'appartamento di <span xml:lang="en">Penny</span> con <span xml:lang="en">Amy</span> nella decima stagione. Come più volte afferma lui stesso possiede una memoria eidetica e un orecchio assoluto. È stato educato da una madre estremamente religiosa e, in più occasioni, questo aspetto contrasta con il rigore scientifico di <span xml:lang="en">Sheldon</span>; tuttavia la donna sembra essere l'unica persona in grado di comandarlo a bacchetta.</p>`
        ], '\n', 1, 'text', false, 'utf8');
        const pos = new Position(0, 55);
        const range = data.document.getWordRangeAtPosition(pos);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.start.character, 47);
        assert.strictEqual(range.end.character, 61);
        assert.strictEqual(data.document.getText(range), 'soprannominato');
    });
});
var AssertDocumentLineMappingDirection;
(function (AssertDocumentLineMappingDirection) {
    AssertDocumentLineMappingDirection[AssertDocumentLineMappingDirection["OffsetToPosition"] = 0] = "OffsetToPosition";
    AssertDocumentLineMappingDirection[AssertDocumentLineMappingDirection["PositionToOffset"] = 1] = "PositionToOffset";
})(AssertDocumentLineMappingDirection || (AssertDocumentLineMappingDirection = {}));
suite('ExtHostDocumentData updates line mapping', () => {
    function positionToStr(position) {
        return '(' + position.line + ',' + position.character + ')';
    }
    function assertDocumentLineMapping(doc, direction) {
        const allText = doc.getText();
        let line = 0, character = 0, previousIsCarriageReturn = false;
        for (let offset = 0; offset <= allText.length; offset++) {
            // The position coordinate system cannot express the position between \r and \n
            const position = new Position(line, character + (previousIsCarriageReturn ? -1 : 0));
            if (direction === AssertDocumentLineMappingDirection.OffsetToPosition) {
                const actualPosition = doc.document.positionAt(offset);
                assert.strictEqual(positionToStr(actualPosition), positionToStr(position), 'positionAt mismatch for offset ' + offset);
            }
            else {
                // The position coordinate system cannot express the position between \r and \n
                const expectedOffset = offset + (previousIsCarriageReturn ? -1 : 0);
                const actualOffset = doc.document.offsetAt(position);
                assert.strictEqual(actualOffset, expectedOffset, 'offsetAt mismatch for position ' + positionToStr(position));
            }
            if (allText.charAt(offset) === '\n') {
                line++;
                character = 0;
            }
            else {
                character++;
            }
            previousIsCarriageReturn = (allText.charAt(offset) === '\r');
        }
    }
    function createChangeEvent(range, text, eol) {
        return {
            changes: [{
                    range: range,
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: text
                }],
            eol: eol,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        };
    }
    function testLineMappingDirectionAfterEvents(lines, eol, direction, e) {
        const myDocument = new ExtHostDocumentData(undefined, URI.file(''), lines.slice(0), eol, 1, 'text', false, 'utf8');
        assertDocumentLineMapping(myDocument, direction);
        myDocument.onEvents(e);
        assertDocumentLineMapping(myDocument, direction);
    }
    function testLineMappingAfterEvents(lines, e) {
        testLineMappingDirectionAfterEvents(lines, '\n', AssertDocumentLineMappingDirection.PositionToOffset, e);
        testLineMappingDirectionAfterEvents(lines, '\n', AssertDocumentLineMappingDirection.OffsetToPosition, e);
        testLineMappingDirectionAfterEvents(lines, '\r\n', AssertDocumentLineMappingDirection.PositionToOffset, e);
        testLineMappingDirectionAfterEvents(lines, '\r\n', AssertDocumentLineMappingDirection.OffsetToPosition, e);
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    test('line mapping', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], { changes: [], eol: undefined, versionId: 7, isRedoing: false, isUndoing: false });
    });
    test('after remove', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 1, 6), ''));
    });
    test('after replace', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 1, 6), 'is could be'));
    });
    test('after insert line', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 1, 6), 'is could be\na line with number'));
    });
    test('after insert two lines', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 1, 6), 'is could be\na line with number\nyet another line'));
    });
    test('after remove line', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 2, 6), ''));
    });
    test('after remove two lines', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 3, 6), ''));
    });
    test('after deleting entire content', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 4, 30), ''));
    });
    test('after replacing entire content', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 4, 30), 'some new text\nthat\nspans multiple lines'));
    });
    test('after changing EOL to CRLF', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 1, 1, 1), '', '\r\n'));
    });
    test('after changing EOL to LF', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 1, 1, 1), '', '\n'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50RGF0YS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3REb2N1bWVudERhdGEudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHaEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVELE9BQU8sS0FBSyxRQUFRLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDN0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUVqQyxJQUFJLElBQXlCLENBQUM7SUFFOUIsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFjLEVBQUUsSUFBWSxFQUFFLFNBQWlCO1FBQ3hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFDLElBQVksRUFBRSxTQUFpQixFQUFFLE1BQWM7UUFDdEUsTUFBTSxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxLQUFLLENBQUM7UUFDTCxJQUFJLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxTQUFVLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUN4RCxrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLDZCQUE2QixFQUFFLElBQUk7WUFDbkMsc0JBQXNCLEVBQUUsSUFBSTtZQUM1QiwrQkFBK0IsRUFBRSxJQUFJO1NBQ3JDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFFLElBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUUsSUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBRSxJQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFFLElBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUUsSUFBWSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBRSxJQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRTtRQUMzQixJQUFJLEtBQVUsQ0FBQztRQUNmLE1BQU0sSUFBSSxHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUE0QjtZQUM3RSxnQkFBZ0IsQ0FBQyxHQUFRO2dCQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2xCLEtBQUssR0FBRyxHQUFHLENBQUM7Z0JBQ1osT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLENBQUM7U0FDRCxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU1RCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUVoRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFZixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUN0QyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUU7Z0JBQ1IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFDM0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWYsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2pFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFFbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUvQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNuRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRS9DLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdELElBQUksQ0FBQyxRQUFRLENBQUM7WUFDYixPQUFPLEVBQUUsQ0FBQztvQkFDVCxLQUFLLEVBQUUsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFO29CQUM3RSxXQUFXLEVBQUUsU0FBVTtvQkFDdkIsV0FBVyxFQUFFLFNBQVU7b0JBQ3ZCLElBQUksRUFBRSxLQUFLO2lCQUNYLENBQUM7WUFDRixHQUFHLEVBQUUsU0FBVTtZQUNmLFNBQVMsRUFBRSxTQUFVO1lBQ3JCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RCxtQkFBbUI7UUFDbkIsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1CQUFtQixFQUFFO1FBRXpCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0QsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3pELEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ25CLHVCQUF1QixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUUvRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4QyxjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxQixjQUFjLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3QkFBd0IsRUFBRTtRQUU5QixJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2IsT0FBTyxFQUFFLENBQUM7b0JBQ1QsS0FBSyxFQUFFLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRTtvQkFDN0UsV0FBVyxFQUFFLFNBQVU7b0JBQ3ZCLFdBQVcsRUFBRSxTQUFVO29CQUN2QixJQUFJLEVBQUUsRUFBRTtpQkFDUixDQUFDO1lBQ0YsR0FBRyxFQUFFLFNBQVU7WUFDZixTQUFTLEVBQUUsU0FBVTtZQUNyQixTQUFTLEVBQUUsS0FBSztZQUNoQixTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUM7UUFFSCxjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QixjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxQixjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5QkFBeUIsRUFBRTtRQUUvQixJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2IsT0FBTyxFQUFFLENBQUM7b0JBQ1QsS0FBSyxFQUFFLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRTtvQkFDN0UsV0FBVyxFQUFFLFNBQVU7b0JBQ3ZCLFdBQVcsRUFBRSxTQUFVO29CQUN2QixJQUFJLEVBQUUsYUFBYTtpQkFDbkIsQ0FBQztZQUNGLEdBQUcsRUFBRSxTQUFVO1lBQ2YsU0FBUyxFQUFFLFNBQVU7WUFDckIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFDO1FBRUgsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEIsY0FBYyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUIsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFFbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNiLE9BQU8sRUFBRSxDQUFDO29CQUNULEtBQUssRUFBRSxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUU7b0JBQzdFLFdBQVcsRUFBRSxTQUFVO29CQUN2QixXQUFXLEVBQUUsU0FBVTtvQkFDdkIsSUFBSSxFQUFFLGlDQUFpQztpQkFDdkMsQ0FBQztZQUNGLEdBQUcsRUFBRSxTQUFVO1lBQ2YsU0FBUyxFQUFFLFNBQVU7WUFDckIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFDO1FBRUgsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEIsY0FBYyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUIsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekIsY0FBYyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNuQyxjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1FBRW5DLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDYixPQUFPLEVBQUUsQ0FBQztvQkFDVCxLQUFLLEVBQUUsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFO29CQUM3RSxXQUFXLEVBQUUsU0FBVTtvQkFDdkIsV0FBVyxFQUFFLFNBQVU7b0JBQ3ZCLElBQUksRUFBRSxFQUFFO2lCQUNSLENBQUM7WUFDRixHQUFHLEVBQUUsU0FBVTtZQUNmLFNBQVMsRUFBRSxTQUFVO1lBQ3JCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQztRQUVILGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFCLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUIsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNCLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0IsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QixnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVCLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUIsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLElBQUksR0FBRyxJQUFJLG1CQUFtQixDQUFDLFNBQVUsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3hELG9CQUFvQjtTQUNwQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVuQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0Msb0NBQW9DO1FBQ3BDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFFLENBQUMsQ0FBQztRQUVyRixLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU1QyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU1QyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFFLENBQUM7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUVBQXlFLEVBQUU7UUFDL0UsSUFBSSxHQUFHLElBQUksbUJBQW1CLENBQUMsU0FBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDeEQsZ0JBQWdCO1lBQ2hCLGdCQUFnQjtZQUNoQixjQUFjO1lBQ2QsWUFBWTtZQUNaLEdBQUc7U0FDSCxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVuQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVyQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFFLENBQUM7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU1QyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFckMsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBRSxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFHSCxJQUFJLENBQUMsNkRBQTZELEVBQUU7UUFFbkUsTUFBTSxLQUFLLEdBQUcsMElBQTBJLENBQUM7UUFFekosSUFBSSxHQUFHLElBQUksbUJBQW1CLENBQUMsU0FBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDeEQsUUFBUSxDQUFDLGNBQWM7U0FDdkIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbkMsMkdBQTJHO1FBQzNHLDRE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