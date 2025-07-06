/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { fixRegexNewline, RipgrepParser, unicodeEscapesToPCRE2, fixNewline, getRgArgs, performBraceExpansionForRipgrep } from '../../node/ripgrepTextSearchEngine.js';
import { Range, TextSearchMatch2 } from '../../common/searchExtTypes.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS } from '../../common/search.js';
suite('RipgrepTextSearchEngine', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('unicodeEscapesToPCRE2', async () => {
        assert.strictEqual(unicodeEscapesToPCRE2('\\u1234'), '\\x{1234}');
        assert.strictEqual(unicodeEscapesToPCRE2('\\u1234\\u0001'), '\\x{1234}\\x{0001}');
        assert.strictEqual(unicodeEscapesToPCRE2('foo\\u1234bar'), 'foo\\x{1234}bar');
        assert.strictEqual(unicodeEscapesToPCRE2('\\\\\\u1234'), '\\\\\\x{1234}');
        assert.strictEqual(unicodeEscapesToPCRE2('foo\\\\\\u1234'), 'foo\\\\\\x{1234}');
        assert.strictEqual(unicodeEscapesToPCRE2('\\u{1234}'), '\\x{1234}');
        assert.strictEqual(unicodeEscapesToPCRE2('\\u{1234}\\u{0001}'), '\\x{1234}\\x{0001}');
        assert.strictEqual(unicodeEscapesToPCRE2('foo\\u{1234}bar'), 'foo\\x{1234}bar');
        assert.strictEqual(unicodeEscapesToPCRE2('[\\u00A0-\\u00FF]'), '[\\x{00A0}-\\x{00FF}]');
        assert.strictEqual(unicodeEscapesToPCRE2('foo\\u{123456}7bar'), 'foo\\u{123456}7bar');
        assert.strictEqual(unicodeEscapesToPCRE2('\\u123'), '\\u123');
        assert.strictEqual(unicodeEscapesToPCRE2('foo'), 'foo');
        assert.strictEqual(unicodeEscapesToPCRE2(''), '');
    });
    test('fixRegexNewline - src', () => {
        const ttable = [
            ['foo', 'foo'],
            ['invalid(', 'invalid('],
            ['fo\\no', 'fo\\r?\\no'],
            ['f\\no\\no', 'f\\r?\\no\\r?\\no'],
            ['f[a-z\\n1]', 'f(?:[a-z1]|\\r?\\n)'],
            ['f[\\n-a]', 'f[\\n-a]'],
            ['(?<=\\n)\\w', '(?<=\\n)\\w'],
            ['fo\\n+o', 'fo(?:\\r?\\n)+o'],
            ['fo[^\\n]o', 'fo(?!\\r?\\n)o'],
            ['fo[^\\na-z]o', 'fo(?!\\r?\\n|[a-z])o'],
            ['foo[^\\n]+o', 'foo.+o'],
            ['foo[^\\nzq]+o', 'foo[^zq]+o'],
            ['foo[^\\nzq]+o', 'foo[^zq]+o'],
            // preserves quantifies, #137899
            ['fo[^\\S\\n]*o', 'fo[^\\S]*o'],
            ['fo[^\\S\\n]{3,}o', 'fo[^\\S]{3,}o'],
        ];
        for (const [input, expected] of ttable) {
            assert.strictEqual(fixRegexNewline(input), expected, `${input} -> ${expected}`);
        }
    });
    test('fixRegexNewline - re', () => {
        function testFixRegexNewline([inputReg, testStr, shouldMatch]) {
            const fixed = fixRegexNewline(inputReg);
            const reg = new RegExp(fixed);
            assert.strictEqual(reg.test(testStr), shouldMatch, `${inputReg} => ${reg}, ${testStr}, ${shouldMatch}`);
        }
        [
            ['foo', 'foo', true],
            ['foo\\n', 'foo\r\n', true],
            ['foo\\n\\n', 'foo\n\n', true],
            ['foo\\n\\n', 'foo\r\n\r\n', true],
            ['foo\\n', 'foo\n', true],
            ['foo\\nabc', 'foo\r\nabc', true],
            ['foo\\nabc', 'foo\nabc', true],
            ['foo\\r\\n', 'foo\r\n', true],
            ['foo\\n+abc', 'foo\r\nabc', true],
            ['foo\\n+abc', 'foo\n\n\nabc', true],
            ['foo\\n+abc', 'foo\r\n\r\n\r\nabc', true],
            ['foo[\\n-9]+abc', 'foo1abc', true],
        ].forEach(testFixRegexNewline);
    });
    test('fixNewline - matching', () => {
        function testFixNewline([inputReg, testStr, shouldMatch = true]) {
            const fixed = fixNewline(inputReg);
            const reg = new RegExp(fixed);
            assert.strictEqual(reg.test(testStr), shouldMatch, `${inputReg} => ${reg}, ${testStr}, ${shouldMatch}`);
        }
        [
            ['foo', 'foo'],
            ['foo\n', 'foo\r\n'],
            ['foo\n', 'foo\n'],
            ['foo\nabc', 'foo\r\nabc'],
            ['foo\nabc', 'foo\nabc'],
            ['foo\r\n', 'foo\r\n'],
            ['foo\nbarc', 'foobar', false],
            ['foobar', 'foo\nbar', false],
        ].forEach(testFixNewline);
    });
    suite('RipgrepParser', () => {
        const TEST_FOLDER = URI.file('/foo/bar');
        function testParser(inputData, expectedResults) {
            const testParser = new RipgrepParser(1000, TEST_FOLDER, DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS);
            const actualResults = [];
            testParser.on('result', r => {
                actualResults.push(r);
            });
            inputData.forEach(d => testParser.handleData(d));
            testParser.flush();
            assert.deepStrictEqual(actualResults, expectedResults);
        }
        function makeRgMatch(relativePath, text, lineNumber, matchRanges) {
            return JSON.stringify({
                type: 'match',
                data: {
                    path: {
                        text: relativePath
                    },
                    lines: {
                        text
                    },
                    line_number: lineNumber,
                    absolute_offset: 0, // unused
                    submatches: matchRanges.map(mr => {
                        return {
                            ...mr,
                            match: { text: text.substring(mr.start, mr.end) }
                        };
                    })
                }
            }) + '\n';
        }
        test('single result', () => {
            testParser([
                makeRgMatch('file1.js', 'foobar', 4, [{ start: 3, end: 6 }])
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [{
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    }], 'foobar')
            ]);
        });
        test('multiple results', () => {
            testParser([
                makeRgMatch('file1.js', 'foobar', 4, [{ start: 3, end: 6 }]),
                makeRgMatch('app/file2.js', 'foobar', 4, [{ start: 3, end: 6 }]),
                makeRgMatch('app2/file3.js', 'foobar', 4, [{ start: 3, end: 6 }]),
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [{
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    }], 'foobar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'app/file2.js'), [{
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    }], 'foobar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'app2/file3.js'), [{
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    }], 'foobar')
            ]);
        });
        test('chopped-up input chunks', () => {
            const dataStrs = [
                makeRgMatch('file1.js', 'foo bar', 4, [{ start: 3, end: 7 }]),
                makeRgMatch('app/file2.js', 'foobar', 4, [{ start: 3, end: 6 }]),
                makeRgMatch('app2/file3.js', 'foobar', 4, [{ start: 3, end: 6 }]),
            ];
            const dataStr0Space = dataStrs[0].indexOf(' ');
            testParser([
                dataStrs[0].substring(0, dataStr0Space + 1),
                dataStrs[0].substring(dataStr0Space + 1),
                '\n',
                dataStrs[1].trim(),
                '\n' + dataStrs[2].substring(0, 25),
                dataStrs[2].substring(25)
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [{
                        previewRange: new Range(0, 3, 0, 7),
                        sourceRange: new Range(3, 3, 3, 7),
                    }], 'foo bar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'app/file2.js'), [{
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    }], 'foobar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'app2/file3.js'), [{
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    }], 'foobar')
            ]);
        });
        test('empty result (#100569)', () => {
            testParser([
                makeRgMatch('file1.js', 'foobar', 4, []),
                makeRgMatch('file1.js', '', 5, []),
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 0, 0, 1),
                        sourceRange: new Range(3, 0, 3, 1),
                    }
                ], 'foobar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 0, 0, 0),
                        sourceRange: new Range(4, 0, 4, 0),
                    }
                ], '')
            ]);
        });
        test('multiple submatches without newline in between (#131507)', () => {
            testParser([
                makeRgMatch('file1.js', 'foobarbazquux', 4, [{ start: 0, end: 4 }, { start: 6, end: 10 }]),
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 0, 0, 4),
                        sourceRange: new Range(3, 0, 3, 4),
                    },
                    {
                        previewRange: new Range(0, 6, 0, 10),
                        sourceRange: new Range(3, 6, 3, 10),
                    }
                ], 'foobarbazquux')
            ]);
        });
        test('multiple submatches with newline in between (#131507)', () => {
            testParser([
                makeRgMatch('file1.js', 'foo\nbar\nbaz\nquux', 4, [{ start: 0, end: 5 }, { start: 8, end: 13 }]),
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 0, 1, 1),
                        sourceRange: new Range(3, 0, 4, 1),
                    },
                    {
                        previewRange: new Range(2, 0, 3, 1),
                        sourceRange: new Range(5, 0, 6, 1),
                    }
                ], 'foo\nbar\nbaz\nquux')
            ]);
        });
    });
    suite('getRgArgs', () => {
        test('simple includes', () => {
            // Only testing the args that come from includes.
            function testGetRgArgs(includes, expectedFromIncludes) {
                const query = {
                    pattern: 'test'
                };
                const options = {
                    folderOptions: {
                        includes: includes,
                        excludes: [],
                        useIgnoreFiles: {
                            local: false,
                            global: false,
                            parent: false
                        },
                        followSymlinks: false,
                        folder: URI.file('/some/folder'),
                        encoding: 'utf8',
                    },
                    maxResults: 1000,
                };
                const expected = [
                    '--hidden',
                    '--no-require-git',
                    '--ignore-case',
                    ...expectedFromIncludes,
                    '--no-ignore',
                    '--crlf',
                    '--fixed-strings',
                    '--no-config',
                    '--no-ignore-global',
                    '--json',
                    '--',
                    'test',
                    '.'
                ];
                const result = getRgArgs(query, options);
                assert.deepStrictEqual(result, expected);
            }
            ([
                [['a/*', 'b/*'], ['-g', '!*', '-g', '/a', '-g', '/a/*', '-g', '/b', '-g', '/b/*']],
                [['**/a/*', 'b/*'], ['-g', '!*', '-g', '/b', '-g', '/b/*', '-g', '**/a/*']],
                [['**/a/*', '**/b/*'], ['-g', '**/a/*', '-g', '**/b/*']],
                [['foo/*bar/something/**'], ['-g', '!*', '-g', '/foo', '-g', '/foo/*bar', '-g', '/foo/*bar/something', '-g', '/foo/*bar/something/**']],
            ].forEach(([includes, expectedFromIncludes]) => testGetRgArgs(includes, expectedFromIncludes)));
        });
    });
    test('brace expansion for ripgrep', () => {
        function testBraceExpansion(argGlob, expectedGlob) {
            const result = performBraceExpansionForRipgrep(argGlob);
            assert.deepStrictEqual(result, expectedGlob);
        }
        [
            ['eep/{a,b}/test', ['eep/a/test', 'eep/b/test']],
            ['eep/{a,b}/{c,d,e}', ['eep/a/c', 'eep/a/d', 'eep/a/e', 'eep/b/c', 'eep/b/d', 'eep/b/e']],
            ['eep/{a,b}/\\{c,d,e}', ['eep/a/{c,d,e}', 'eep/b/{c,d,e}']],
            ['eep/{a,b\\}/test', ['eep/{a,b}/test']],
            ['eep/{a,b\\\\}/test', ['eep/a/test', 'eep/b\\\\/test']],
            ['eep/{a,b\\\\\\}/test', ['eep/{a,b\\\\}/test']],
            ['e\\{ep/{a,b}/test', ['e{ep/a/test', 'e{ep/b/test']],
            ['eep/{a,\\b}/test', ['eep/a/test', 'eep/\\b/test']],
            ['{a/*.*,b/*.*}', ['a/*.*', 'b/*.*']],
            ['{{}', ['{{}']],
            ['aa{{}', ['aa{{}']],
            ['{b{}', ['{b{}']],
            ['{{}c', ['{{}c']],
            ['{{}}', ['{{}}']],
            ['\\{{}}', ['{}']],
            ['{}foo', ['foo']],
            ['bar{ }foo', ['bar foo']],
            ['{}', ['']],
        ].forEach(([includePattern, expectedPatterns]) => testBraceExpansion(includePattern, expectedPatterns));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFRleHRTZWFyY2hFbmdpbmVVdGlscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3Qvbm9kZS9yaXBncmVwVGV4dFNlYXJjaEVuZ2luZVV0aWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBd0IsYUFBYSxFQUFFLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1TCxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUF1QyxNQUFNLGdDQUFnQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTdFLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsdUNBQXVDLEVBQUUsQ0FBQztJQUMxQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFD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