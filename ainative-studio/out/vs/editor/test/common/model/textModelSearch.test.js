/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { getMapForWordSeparators } from '../../../common/core/wordCharacterClassifier.js';
import { USUAL_WORD_SEPARATORS } from '../../../common/core/wordHelper.js';
import { FindMatch, SearchData } from '../../../common/model.js';
import { SearchParams, TextModelSearch, isMultilineRegexSource } from '../../../common/model/textModelSearch.js';
import { createTextModel } from '../testTextModel.js';
// --------- Find
suite('TextModelSearch', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const usualWordSeparators = getMapForWordSeparators(USUAL_WORD_SEPARATORS, []);
    function assertFindMatch(actual, expectedRange, expectedMatches = null) {
        assert.deepStrictEqual(actual, new FindMatch(expectedRange, expectedMatches));
    }
    function _assertFindMatches(model, searchParams, expectedMatches) {
        const actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), false, 1000);
        assert.deepStrictEqual(actual, expectedMatches, 'findMatches OK');
        // test `findNextMatch`
        let startPos = new Position(1, 1);
        let match = TextModelSearch.findNextMatch(model, searchParams, startPos, false);
        assert.deepStrictEqual(match, expectedMatches[0], `findNextMatch ${startPos}`);
        for (const expectedMatch of expectedMatches) {
            startPos = expectedMatch.range.getStartPosition();
            match = TextModelSearch.findNextMatch(model, searchParams, startPos, false);
            assert.deepStrictEqual(match, expectedMatch, `findNextMatch ${startPos}`);
        }
        // test `findPrevMatch`
        startPos = new Position(model.getLineCount(), model.getLineMaxColumn(model.getLineCount()));
        match = TextModelSearch.findPreviousMatch(model, searchParams, startPos, false);
        assert.deepStrictEqual(match, expectedMatches[expectedMatches.length - 1], `findPrevMatch ${startPos}`);
        for (const expectedMatch of expectedMatches) {
            startPos = expectedMatch.range.getEndPosition();
            match = TextModelSearch.findPreviousMatch(model, searchParams, startPos, false);
            assert.deepStrictEqual(match, expectedMatch, `findPrevMatch ${startPos}`);
        }
    }
    function assertFindMatches(text, searchString, isRegex, matchCase, wordSeparators, _expected) {
        const expectedRanges = _expected.map(entry => new Range(entry[0], entry[1], entry[2], entry[3]));
        const expectedMatches = expectedRanges.map(entry => new FindMatch(entry, null));
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const model = createTextModel(text);
        _assertFindMatches(model, searchParams, expectedMatches);
        model.dispose();
        const model2 = createTextModel(text);
        model2.setEOL(1 /* EndOfLineSequence.CRLF */);
        _assertFindMatches(model2, searchParams, expectedMatches);
        model2.dispose();
    }
    const regularText = [
        'This is some foo - bar text which contains foo and bar - as in Barcelona.',
        'Now it begins a word fooBar and now it is caps Foo-isn\'t this great?',
        'And here\'s a dull line with nothing interesting in it',
        'It is also interesting if it\'s part of a word like amazingFooBar',
        'Again nothing interesting here'
    ];
    test('Simple find', () => {
        assertFindMatches(regularText.join('\n'), 'foo', false, false, null, [
            [1, 14, 1, 17],
            [1, 44, 1, 47],
            [2, 22, 2, 25],
            [2, 48, 2, 51],
            [4, 59, 4, 62]
        ]);
    });
    test('Case sensitive find', () => {
        assertFindMatches(regularText.join('\n'), 'foo', false, true, null, [
            [1, 14, 1, 17],
            [1, 44, 1, 47],
            [2, 22, 2, 25]
        ]);
    });
    test('Whole words find', () => {
        assertFindMatches(regularText.join('\n'), 'foo', false, false, USUAL_WORD_SEPARATORS, [
            [1, 14, 1, 17],
            [1, 44, 1, 47],
            [2, 48, 2, 51]
        ]);
    });
    test('/^/ find', () => {
        assertFindMatches(regularText.join('\n'), '^', true, false, null, [
            [1, 1, 1, 1],
            [2, 1, 2, 1],
            [3, 1, 3, 1],
            [4, 1, 4, 1],
            [5, 1, 5, 1]
        ]);
    });
    test('/$/ find', () => {
        assertFindMatches(regularText.join('\n'), '$', true, false, null, [
            [1, 74, 1, 74],
            [2, 69, 2, 69],
            [3, 54, 3, 54],
            [4, 65, 4, 65],
            [5, 31, 5, 31]
        ]);
    });
    test('/.*/ find', () => {
        assertFindMatches(regularText.join('\n'), '.*', true, false, null, [
            [1, 1, 1, 74],
            [2, 1, 2, 69],
            [3, 1, 3, 54],
            [4, 1, 4, 65],
            [5, 1, 5, 31]
        ]);
    });
    test('/^$/ find', () => {
        assertFindMatches([
            'This is some foo - bar text which contains foo and bar - as in Barcelona.',
            '',
            'And here\'s a dull line with nothing interesting in it',
            '',
            'Again nothing interesting here'
        ].join('\n'), '^$', true, false, null, [
            [2, 1, 2, 1],
            [4, 1, 4, 1]
        ]);
    });
    test('multiline find 1', () => {
        assertFindMatches([
            'Just some text text',
            'Just some text text',
            'some text again',
            'again some text'
        ].join('\n'), 'text\\n', true, false, null, [
            [1, 16, 2, 1],
            [2, 16, 3, 1],
        ]);
    });
    test('multiline find 2', () => {
        assertFindMatches([
            'Just some text text',
            'Just some text text',
            'some text again',
            'again some text'
        ].join('\n'), 'text\\nJust', true, false, null, [
            [1, 16, 2, 5]
        ]);
    });
    test('multiline find 3', () => {
        assertFindMatches([
            'Just some text text',
            'Just some text text',
            'some text again',
            'again some text'
        ].join('\n'), '\\nagain', true, false, null, [
            [3, 16, 4, 6]
        ]);
    });
    test('multiline find 4', () => {
        assertFindMatches([
            'Just some text text',
            'Just some text text',
            'some text again',
            'again some text'
        ].join('\n'), '.*\\nJust.*\\n', true, false, null, [
            [1, 1, 3, 1]
        ]);
    });
    test('multiline find with line beginning regex', () => {
        assertFindMatches([
            'if',
            'else',
            '',
            'if',
            'else'
        ].join('\n'), '^if\\nelse', true, false, null, [
            [1, 1, 2, 5],
            [4, 1, 5, 5]
        ]);
    });
    test('matching empty lines using boundary expression', () => {
        assertFindMatches([
            'if',
            '',
            'else',
            '  ',
            'if',
            ' ',
            'else'
        ].join('\n'), '^\\s*$\\n', true, false, null, [
            [2, 1, 3, 1],
            [4, 1, 5, 1],
            [6, 1, 7, 1]
        ]);
    });
    test('matching lines starting with A and ending with B', () => {
        assertFindMatches([
            'a if b',
            'a',
            'ab',
            'eb'
        ].join('\n'), '^a.*b$', true, false, null, [
            [1, 1, 1, 7],
            [3, 1, 3, 3]
        ]);
    });
    test('multiline find with line ending regex', () => {
        assertFindMatches([
            'if',
            'else',
            '',
            'if',
            'elseif',
            'else'
        ].join('\n'), 'if\\nelse$', true, false, null, [
            [1, 1, 2, 5],
            [5, 5, 6, 5]
        ]);
    });
    test('issue #4836 - ^.*$', () => {
        assertFindMatches([
            'Just some text text',
            '',
            'some text again',
            '',
            'again some text'
        ].join('\n'), '^.*$', true, false, null, [
            [1, 1, 1, 20],
            [2, 1, 2, 1],
            [3, 1, 3, 16],
            [4, 1, 4, 1],
            [5, 1, 5, 16],
        ]);
    });
    test('multiline find for non-regex string', () => {
        assertFindMatches([
            'Just some text text',
            'some text text',
            'some text again',
            'again some text',
            'but not some'
        ].join('\n'), 'text\nsome', false, false, null, [
            [1, 16, 2, 5],
            [2, 11, 3, 5],
        ]);
    });
    test('issue #3623: Match whole word does not work for not latin characters', () => {
        assertFindMatches([
            'я',
            'компилятор',
            'обфускация',
            ':я-я'
        ].join('\n'), 'я', false, false, USUAL_WORD_SEPARATORS, [
            [1, 1, 1, 2],
            [4, 2, 4, 3],
            [4, 4, 4, 5],
        ]);
    });
    test('issue #27459: Match whole words regression', () => {
        assertFindMatches([
            'this._register(this._textAreaInput.onKeyDown((e: IKeyboardEvent) => {',
            '	this._viewController.emitKeyDown(e);',
            '}));',
        ].join('\n'), '((e: ', false, false, USUAL_WORD_SEPARATORS, [
            [1, 45, 1, 50]
        ]);
    });
    test('issue #27594: Search results disappear', () => {
        assertFindMatches([
            'this.server.listen(0);',
        ].join('\n'), 'listen(', false, false, USUAL_WORD_SEPARATORS, [
            [1, 13, 1, 20]
        ]);
    });
    test('findNextMatch without regex', () => {
        const model = createTextModel('line line one\nline two\nthree');
        const searchParams = new SearchParams('line', false, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 6, 1, 10));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 3), false);
        assertFindMatch(actual, new Range(1, 6, 1, 10));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        model.dispose();
    });
    test('findNextMatch with beginning boundary regex', () => {
        const model = createTextModel('line one\nline two\nthree');
        const searchParams = new SearchParams('^line', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 3), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        model.dispose();
    });
    test('findNextMatch with beginning boundary regex and line has repetitive beginnings', () => {
        const model = createTextModel('line line one\nline two\nthree');
        const searchParams = new SearchParams('^line', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 3), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        model.dispose();
    });
    test('findNextMatch with beginning boundary multiline regex and line has repetitive beginnings', () => {
        const model = createTextModel('line line one\nline two\nline three\nline four');
        const searchParams = new SearchParams('^line.*\\nline', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(3, 1, 4, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(2, 1), false);
        assertFindMatch(actual, new Range(2, 1, 3, 5));
        model.dispose();
    });
    test('findNextMatch with ending boundary regex', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('line$', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 10, 1, 14));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 4), false);
        assertFindMatch(actual, new Range(1, 10, 1, 14));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(2, 5, 2, 9));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 10, 1, 14));
        model.dispose();
    });
    test('findMatches with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)', true, false, null);
        const actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 100);
        assert.deepStrictEqual(actual, [
            new FindMatch(new Range(1, 5, 1, 9), ['line', 'line', 'in']),
            new FindMatch(new Range(1, 10, 1, 14), ['line', 'line', 'in']),
            new FindMatch(new Range(2, 5, 2, 9), ['line', 'line', 'in']),
        ]);
        model.dispose();
    });
    test('findMatches multiline with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)\\n', true, false, null);
        const actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 100);
        assert.deepStrictEqual(actual, [
            new FindMatch(new Range(1, 10, 2, 1), ['line\n', 'line', 'in']),
            new FindMatch(new Range(2, 5, 3, 1), ['line\n', 'line', 'in']),
        ]);
        model.dispose();
    });
    test('findNextMatch with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)', true, false, null);
        const actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        assertFindMatch(actual, new Range(1, 5, 1, 9), ['line', 'line', 'in']);
        model.dispose();
    });
    test('findNextMatch multiline with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)\\n', true, false, null);
        const actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        assertFindMatch(actual, new Range(1, 10, 2, 1), ['line\n', 'line', 'in']);
        model.dispose();
    });
    test('findPreviousMatch with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)', true, false, null);
        const actual = TextModelSearch.findPreviousMatch(model, searchParams, new Position(1, 1), true);
        assertFindMatch(actual, new Range(2, 5, 2, 9), ['line', 'line', 'in']);
        model.dispose();
    });
    test('findPreviousMatch multiline with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)\\n', true, false, null);
        const actual = TextModelSearch.findPreviousMatch(model, searchParams, new Position(1, 1), true);
        assertFindMatch(actual, new Range(2, 5, 3, 1), ['line\n', 'line', 'in']);
        model.dispose();
    });
    test('\\n matches \\r\\n', () => {
        const model = createTextModel('a\r\nb\r\nc\r\nd\r\ne\r\nf\r\ng\r\nh\r\ni');
        assert.strictEqual(model.getEOL(), '\r\n');
        let searchParams = new SearchParams('h\\n', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 1000)[0];
        assertFindMatch(actual, new Range(8, 1, 9, 1), ['h\n']);
        searchParams = new SearchParams('g\\nh\\n', true, false, null);
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 1000)[0];
        assertFindMatch(actual, new Range(7, 1, 9, 1), ['g\nh\n']);
        searchParams = new SearchParams('\\ni', true, false, null);
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 1000)[0];
        assertFindMatch(actual, new Range(8, 2, 9, 2), ['\ni']);
        model.dispose();
    });
    test('\\r can never be found', () => {
        const model = createTextModel('a\r\nb\r\nc\r\nd\r\ne\r\nf\r\ng\r\nh\r\ni');
        assert.strictEqual(model.getEOL(), '\r\n');
        const searchParams = new SearchParams('\\r\\n', true, false, null);
        const actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        assert.strictEqual(actual, null);
        assert.deepStrictEqual(TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 1000), []);
        model.dispose();
    });
    function assertParseSearchResult(searchString, isRegex, matchCase, wordSeparators, expected) {
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const actual = searchParams.parseSearchRequest();
        if (expected === null) {
            assert.ok(actual === null);
        }
        else {
            assert.deepStrictEqual(actual.regex, expected.regex);
            assert.deepStrictEqual(actual.simpleSearch, expected.simpleSearch);
            if (wordSeparators) {
                assert.ok(actual.wordSeparators !== null);
            }
            else {
                assert.ok(actual.wordSeparators === null);
            }
        }
    }
    test('parseSearchRequest invalid', () => {
        assertParseSearchResult('', true, true, USUAL_WORD_SEPARATORS, null);
        assertParseSearchResult('(', true, false, null, null);
    });
    test('parseSearchRequest non regex', () => {
        assertParseSearchResult('foo', false, false, null, new SearchData(/foo/giu, null, null));
        assertParseSearchResult('foo', false, false, USUAL_WORD_SEPARATORS, new SearchData(/foo/giu, usualWordSeparators, null));
        assertParseSearchResult('foo', false, true, null, new SearchData(/foo/gu, null, 'foo'));
        assertParseSearchResult('foo', false, true, USUAL_WORD_SEPARATORS, new SearchData(/foo/gu, usualWordSeparators, 'foo'));
        assertParseSearchResult('foo\\n', false, false, null, new SearchData(/foo\\n/giu, null, null));
        assertParseSearchResult('foo\\\\n', false, false, null, new SearchData(/foo\\\\n/giu, null, null));
        assertParseSearchResult('foo\\r', false, false, null, new SearchData(/foo\\r/giu, null, null));
        assertParseSearchResult('foo\\\\r', false, false, null, new SearchData(/foo\\\\r/giu, null, null));
    });
    test('parseSearchRequest regex', () => {
        assertParseSearchResult('foo', true, false, null, new SearchData(/foo/giu, null, null));
        assertParseSearchResult('foo', true, false, USUAL_WORD_SEPARATORS, new SearchData(/foo/giu, usualWordSeparators, null));
        assertParseSearchResult('foo', true, true, null, new SearchData(/foo/gu, null, null));
        assertParseSearchResult('foo', true, true, USUAL_WORD_SEPARATORS, new SearchData(/foo/gu, usualWordSeparators, null));
        assertParseSearchResult('foo\\n', true, false, null, new SearchData(/foo\n/gimu, null, null));
        assertParseSearchResult('foo\\\\n', true, false, null, new SearchData(/foo\\n/giu, null, null));
        assertParseSearchResult('foo\\r', true, false, null, new SearchData(/foo\r/gimu, null, null));
        assertParseSearchResult('foo\\\\r', true, false, null, new SearchData(/foo\\r/giu, null, null));
    });
    test('issue #53415. \W should match line break.', () => {
        assertFindMatches([
            'text',
            '180702-',
            '180703-180704'
        ].join('\n'), '\\d{6}-\\W', true, false, null, [
            [2, 1, 3, 1]
        ]);
        assertFindMatches([
            'Just some text',
            '',
            'Just'
        ].join('\n'), '\\W', true, false, null, [
            [1, 5, 1, 6],
            [1, 10, 1, 11],
            [1, 15, 2, 1],
            [2, 1, 3, 1]
        ]);
        // Line break doesn't affect the result as we always use \n as line break when doing search
        assertFindMatches([
            'Just some text',
            '',
            'Just'
        ].join('\r\n'), '\\W', true, false, null, [
            [1, 5, 1, 6],
            [1, 10, 1, 11],
            [1, 15, 2, 1],
            [2, 1, 3, 1]
        ]);
        assertFindMatches([
            'Just some text',
            '\tJust',
            'Just'
        ].join('\n'), '\\W', true, false, null, [
            [1, 5, 1, 6],
            [1, 10, 1, 11],
            [1, 15, 2, 1],
            [2, 1, 2, 2],
            [2, 6, 3, 1],
        ]);
        // line break is seen as one non-word character
        assertFindMatches([
            'Just  some text',
            '',
            'Just'
        ].join('\n'), '\\W{2}', true, false, null, [
            [1, 5, 1, 7],
            [1, 16, 3, 1]
        ]);
        // even if it's \r\n
        assertFindMatches([
            'Just  some text',
            '',
            'Just'
        ].join('\r\n'), '\\W{2}', true, false, null, [
            [1, 5, 1, 7],
            [1, 16, 3, 1]
        ]);
    });
    test('Simple find using unicode escape sequences', () => {
        assertFindMatches(regularText.join('\n'), '\\u{0066}\\u006f\\u006F', true, false, null, [
            [1, 14, 1, 17],
            [1, 44, 1, 47],
            [2, 22, 2, 25],
            [2, 48, 2, 51],
            [4, 59, 4, 62]
        ]);
    });
    test('isMultilineRegexSource', () => {
        assert(!isMultilineRegexSource('foo'));
        assert(!isMultilineRegexSource(''));
        assert(!isMultilineRegexSource('foo\\sbar'));
        assert(!isMultilineRegexSource('\\\\notnewline'));
        assert(isMultilineRegexSource('foo\\nbar'));
        assert(isMultilineRegexSource('foo\\nbar\\s'));
        assert(isMultilineRegexSource('foo\\r\\n'));
        assert(isMultilineRegexSource('\\n'));
        assert(isMultilineRegexSource('foo\\W'));
        assert(isMultilineRegexSource('foo\n'));
        assert(isMultilineRegexSource('foo\r\n'));
    });
    test('isMultilineRegexSource correctly identifies multiline patterns', () => {
        const singleLinePatterns = [
            'MARK:\\s*(?<label>.*)$',
            '^// Header$',
            '\\s*[-=]+\\s*',
        ];
        const multiLinePatterns = [
            '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
            'header\\r\\nfooter',
            'start\\r|\\nend',
            'top\nmiddle\r\nbottom'
        ];
        for (const pattern of singleLinePatterns) {
            assert.strictEqual(isMultilineRegexSource(pattern), false, `Pattern should not be multiline: ${pattern}`);
        }
        for (const pattern of multiLinePatterns) {
            assert.strictEqual(isMultilineRegexSource(pattern), true, `Pattern should be multiline: ${pattern}`);
        }
    });
    test('issue #74715. \\d* finds empty string and stops searching.', () => {
        const model = createTextModel('10.243.30.10');
        const searchParams = new SearchParams('\\d*', true, false, null);
        const actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 100);
        assert.deepStrictEqual(actual, [
            new FindMatch(new Range(1, 1, 1, 3), ['10']),
            new FindMatch(new Range(1, 3, 1, 3), ['']),
            new FindMatch(new Range(1, 4, 1, 7), ['243']),
            new FindMatch(new Range(1, 7, 1, 7), ['']),
            new FindMatch(new Range(1, 8, 1, 10), ['30']),
            new FindMatch(new Range(1, 10, 1, 10), ['']),
            new FindMatch(new Range(1, 11, 1, 13), ['10'])
        ]);
        model.dispose();
    });
    test('issue #100134. Zero-length matches should properly step over surrogate pairs', () => {
        // 1[Laptop]1 - there shoud be no matches inside of [Laptop] emoji
        assertFindMatches('1\uD83D\uDCBB1', '()', true, false, null, [
            [1, 1, 1, 1],
            [1, 2, 1, 2],
            [1, 4, 1, 4],
            [1, 5, 1, 5],
        ]);
        // 1[Hacker Cat]1 = 1[Cat Face][ZWJ][Laptop]1 - there shoud be matches between emoji and ZWJ
        // there shoud be no matches inside of [Cat Face] and [Laptop] emoji
        assertFindMatches('1\uD83D\uDC31\u200D\uD83D\uDCBB1', '()', true, false, null, [
            [1, 1, 1, 1],
            [1, 2, 1, 2],
            [1, 4, 1, 4],
            [1, 5, 1, 5],
            [1, 7, 1, 7],
            [1, 8, 1, 8]
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU2VhcmNoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL3RleHRNb2RlbFNlYXJjaC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNFLE9BQU8sRUFBcUIsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXBGLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXRELGlCQUFpQjtBQUNqQixLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBRTdCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxtQkFBbUIsR0FBRyx1QkFBdUIsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUUvRSxTQUFTLGVBQWUsQ0FBQyxNQUF3QixFQUFFLGFBQW9CLEVBQUUsa0JBQW1DLElBQUk7UUFDL0csTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsYUFBYSxFQUFFLGVBQWUs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QUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNaLENBQ0QsQ0FBQztRQUVGLDJGQUEyRjtRQUMzRixpQkFBaUIsQ0FDaEI7WUFDQyxnQkFBZ0I7WUFDaEIsRUFBRTtZQUNGLE1BQU07U0FDTixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFDZCxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQ3hCO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDWixDQUNELENBQUM7UUFFRixpQkFBaUIsQ0FDaEI7WUFDQyxnQkFBZ0I7WUFDaEIsUUFBUTtZQUNSLE1BQU07U0FDTixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDWixLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQ3hCO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFD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