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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFRleHRTZWFyY2hFbmdpbmVVdGlscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9ub2RlL3JpcGdyZXBUZXh0U2VhcmNoRW5naW5lVXRpbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUF3QixhQUFhLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVMLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQXVDLE1BQU0sZ0NBQWdDLENBQUM7QUFDOUcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFN0UsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyx1Q0FBdUMsRUFBRSxDQUFDO0lBQzFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJB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