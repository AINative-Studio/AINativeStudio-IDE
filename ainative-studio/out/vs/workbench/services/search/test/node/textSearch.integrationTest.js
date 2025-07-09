/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as path from '../../../../../base/common/path.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { deserializeSearchError, SearchErrorCode } from '../../common/search.js';
import { TextSearchEngineAdapter } from '../../node/textSearchAdapter.js';
import { flakySuite } from '../../../../../base/test/node/testUtils.js';
import { FileAccess } from '../../../../../base/common/network.js';
const TEST_FIXTURES = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath);
const EXAMPLES_FIXTURES = path.join(TEST_FIXTURES, 'examples');
const MORE_FIXTURES = path.join(TEST_FIXTURES, 'more');
const TEST_ROOT_FOLDER = { folder: URI.file(TEST_FIXTURES) };
const ROOT_FOLDER_QUERY = [
    TEST_ROOT_FOLDER
];
const MULTIROOT_QUERIES = [
    { folder: URI.file(EXAMPLES_FIXTURES) },
    { folder: URI.file(MORE_FIXTURES) }
];
function doSearchTest(query, expectedResultCount) {
    const engine = new TextSearchEngineAdapter(query);
    let c = 0;
    const results = [];
    return engine.search(new CancellationTokenSource().token, _results => {
        if (_results) {
            c += _results.reduce((acc, cur) => acc + cur.numMatches, 0);
            results.push(..._results);
        }
    }, () => { }).then(() => {
        if (typeof expectedResultCount === 'function') {
            assert(expectedResultCount(c));
        }
        else {
            assert.strictEqual(c, expectedResultCount, `rg ${c} !== ${expectedResultCount}`);
        }
        return results;
    });
}
flakySuite('TextSearch-integration', function () {
    test('Text: GameOfLife', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'GameOfLife' },
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (RegExp)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'Game.?fL\\w?fe', isRegExp: true }
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (unicode escape sequences)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'G\\u{0061}m\\u0065OfLife', isRegExp: true }
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (unicode escape sequences, force PCRE2)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: '(?<!a)G\\u{0061}m\\u0065OfLife', isRegExp: true }
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (PCRE2 RegExp)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            usePCRE2: true,
            contentPattern: { pattern: 'Life(?!P)', isRegExp: true }
        };
        return doSearchTest(config, 8);
    });
    test('Text: GameOfLife (RegExp to EOL)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'GameOfLife.*', isRegExp: true }
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (Word Match, Case Sensitive)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'GameOfLife', isWordMatch: true, isCaseSensitive: true }
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (Word Match, Spaces)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: ' GameOfLife ', isWordMatch: true }
        };
        return doSearchTest(config, 1);
    });
    test('Text: GameOfLife (Word Match, Punctuation and Spaces)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: ', as =', isWordMatch: true }
        };
        return doSearchTest(config, 1);
    });
    test('Text: Helvetica (UTF 16)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'Helvetica' }
        };
        return doSearchTest(config, 3);
    });
    test('Text: e', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'e' }
        };
        return doSearchTest(config, 785);
    });
    test('Text: e (with excludes)', () => {
        const config = {
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'e' },
            excludePattern: { '**/examples': true }
        };
        return doSearchTest(config, 391);
    });
    test('Text: e (with includes)', () => {
        const config = {
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'e' },
            includePattern: { '**/examples/**': true }
        };
        return doSearchTest(config, 394);
    });
    // TODO
    // test('Text: e (with absolute path excludes)', () => {
    // 	const config: any = {
    // 		folderQueries: ROOT_FOLDER_QUERY,
    // 		contentPattern: { pattern: 'e' },
    // 		excludePattern: makeExpression(path.join(TEST_FIXTURES, '**/examples'))
    // 	};
    // 	return doSearchTest(config, 394);
    // });
    // test('Text: e (with mixed absolute/relative path excludes)', () => {
    // 	const config: any = {
    // 		folderQueries: ROOT_FOLDER_QUERY,
    // 		contentPattern: { pattern: 'e' },
    // 		excludePattern: makeExpression(path.join(TEST_FIXTURES, '**/examples'), '*.css')
    // 	};
    // 	return doSearchTest(config, 310);
    // });
    test('Text: sibling exclude', () => {
        const config = {
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'm' },
            includePattern: makeExpression('**/site*'),
            excludePattern: { '*.css': { when: '$(basename).less' } }
        };
        return doSearchTest(config, 1);
    });
    test('Text: e (with includes and exclude)', () => {
        const config = {
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'e' },
            includePattern: { '**/examples/**': true },
            excludePattern: { '**/examples/small.js': true }
        };
        return doSearchTest(config, 371);
    });
    test('Text: a (capped)', () => {
        const maxResults = 520;
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'a' },
            maxResults
        };
        return doSearchTest(config, maxResults);
    });
    test('Text: a (no results)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'ahsogehtdas' }
        };
        return doSearchTest(config, 0);
    });
    test('Text: -size', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: '-size' }
        };
        return doSearchTest(config, 9);
    });
    test('Multiroot: Conway', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: MULTIROOT_QUERIES,
            contentPattern: { pattern: 'conway' }
        };
        return doSearchTest(config, 8);
    });
    test('Multiroot: e with partial global exclude', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: MULTIROOT_QUERIES,
            contentPattern: { pattern: 'e' },
            excludePattern: makeExpression('**/*.txt')
        };
        return doSearchTest(config, 394);
    });
    test('Multiroot: e with global excludes', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: MULTIROOT_QUERIES,
            contentPattern: { pattern: 'e' },
            excludePattern: makeExpression('**/*.txt', '**/*.js')
        };
        return doSearchTest(config, 0);
    });
    test('Multiroot: e with folder exclude', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: [
                {
                    folder: URI.file(EXAMPLES_FIXTURES), excludePattern: [{
                            pattern: makeExpression('**/e*.js')
                        }]
                },
                { folder: URI.file(MORE_FIXTURES) }
            ],
            contentPattern: { pattern: 'e' }
        };
        return doSearchTest(config, 298);
    });
    test('Text: 语', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: '语' }
        };
        return doSearchTest(config, 1).then(results => {
            const matchRange = results[0].results[0].rangeLocations.map(e => e.source);
            assert.deepStrictEqual(matchRange, [{
                    startLineNumber: 0,
                    startColumn: 1,
                    endLineNumber: 0,
                    endColumn: 2
                }]);
        });
    });
    test('Multiple matches on line: h\\d,', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'h\\d,', isRegExp: true }
        };
        return doSearchTest(config, 15).then(results => {
            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].results.length, 1);
            const match = results[0].results[0];
            assert.strictEqual(match.rangeLocations.map(e => e.source).length, 5);
        });
    });
    test('Search with context matches', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'compiler.typeCheck();' },
            surroundingContext: 1,
        };
        return doSearchTest(config, 3).then(results => {
            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].results[0].lineNumber, 24);
            assert.strictEqual(results[0].results[0].text, '        compiler.addUnit(prog,"input.ts");');
            // assert.strictEqual((<ITextSearchMatch>results[1].results[0]).preview.text, '        compiler.typeCheck();\n'); // See https://github.com/BurntSushi/ripgrep/issues/1095
            assert.strictEqual(results[2].results[0].lineNumber, 26);
            assert.strictEqual(results[2].results[0].text, '        compiler.emit();');
        });
    });
    suite('error messages', () => {
        test('invalid encoding', () => {
            const config = {
                type: 2 /* QueryType.Text */,
                folderQueries: [
                    {
                        ...TEST_ROOT_FOLDER,
                        fileEncoding: 'invalidEncoding'
                    }
                ],
                contentPattern: { pattern: 'test' },
            };
            return doSearchTest(config, 0).then(() => {
                throw new Error('expected fail');
            }, err => {
                const searchError = deserializeSearchError(err);
                assert.strictEqual(searchError.message, 'Unknown encoding: invalidEncoding');
                assert.strictEqual(searchError.code, SearchErrorCode.unknownEncoding);
            });
        });
        test('invalid regex case 1', () => {
            const config = {
                type: 2 /* QueryType.Text */,
                folderQueries: ROOT_FOLDER_QUERY,
                contentPattern: { pattern: ')', isRegExp: true },
            };
            return doSearchTest(config, 0).then(() => {
                throw new Error('expected fail');
            }, err => {
                const searchError = deserializeSearchError(err);
                const regexParseErrorForUnclosedParenthesis = 'Regex parse error: unmatched closing parenthesis';
                assert.strictEqual(searchError.message, regexParseErrorForUnclosedParenthesis);
                assert.strictEqual(searchError.code, SearchErrorCode.regexParseError);
            });
        });
        test('invalid regex case 2', () => {
            const config = {
                type: 2 /* QueryType.Text */,
                folderQueries: ROOT_FOLDER_QUERY,
                contentPattern: { pattern: '(?<!a.*)', isRegExp: true },
            };
            return doSearchTest(config, 0).then(() => {
                throw new Error('expected fail');
            }, err => {
                const searchError = deserializeSearchError(err);
                const regexParseErrorForLookAround = 'Regex parse error: lookbehind assertion is not fixed length';
                assert.strictEqual(searchError.message, regexParseErrorForLookAround);
                assert.strictEqual(searchError.code, SearchErrorCode.regexParseError);
            });
        });
        test('invalid glob', () => {
            const config = {
                type: 2 /* QueryType.Text */,
                folderQueries: ROOT_FOLDER_QUERY,
                contentPattern: { pattern: 'foo' },
                includePattern: {
                    '{{}': true
                }
            };
            return doSearchTest(config, 0).then(() => {
                throw new Error('expected fail');
            }, err => {
                const searchError = deserializeSearchError(err);
                assert.strictEqual(searchError.message, 'Error parsing glob \'/{{}\': nested alternate groups are not allowed');
                assert.strictEqual(searchError.code, SearchErrorCode.globParseError);
            });
        });
    });
});
function makeExpression(...patterns) {
    return patterns.reduce((glob, pattern) => {
        // glob.ts needs forward slashes
        pattern = pattern.replace(/\\/g, '/');
        glob[pattern] = true;
        return glob;
    }, Object.create(null));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaC5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L25vZGUvdGV4dFNlYXJjaC5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFckYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxzQkFBc0IsRUFBMkYsZUFBZSxFQUF3QixNQUFNLHdCQUF3QixDQUFDO0FBQ2hNLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFbkUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLGlEQUFpRCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDckgsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUMvRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN2RCxNQUFNLGdCQUFnQixHQUFpQixFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENB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