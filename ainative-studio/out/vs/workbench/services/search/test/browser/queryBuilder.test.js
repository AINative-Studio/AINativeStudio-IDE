/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { join } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI, URI as uri } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IWorkspaceContextService, toWorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { toWorkspaceFolders } from '../../../../../platform/workspaces/common/workspaces.js';
import { QueryBuilder } from '../../common/queryBuilder.js';
import { IPathService } from '../../../path/common/pathService.js';
import { TestPathService, TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { extUriBiasedIgnorePathCase } from '../../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const DEFAULT_EDITOR_CONFIG = {};
const DEFAULT_USER_CONFIG = { useRipgrep: true, useIgnoreFiles: true, useGlobalIgnoreFiles: true, useParentIgnoreFiles: true };
const DEFAULT_QUERY_PROPS = {};
const DEFAULT_TEXT_QUERY_PROPS = { usePCRE2: false };
suite('QueryBuilder', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const PATTERN_INFO = { pattern: 'a' };
    const ROOT_1 = fixPath('/foo/root1');
    const ROOT_1_URI = getUri(ROOT_1);
    const ROOT_1_NAMED_FOLDER = toWorkspaceFolder(ROOT_1_URI);
    const WS_CONFIG_PATH = getUri('/bar/test.code-workspace'); // location of the workspace file (not important except that it is a file URI)
    let instantiationService;
    let queryBuilder;
    let mockConfigService;
    let mockContextService;
    let mockWorkspace;
    setup(() => {
        instantiationService = new TestInstantiationService();
        mockConfigService = new TestConfigurationService();
        mockConfigService.setUserConfiguration('search', DEFAULT_USER_CONFIG);
        mockConfigService.setUserConfiguration('editor', DEFAULT_EDITOR_CONFIG);
        instantiationService.stub(IConfigurationService, mockConfigService);
        mockContextService = new TestContextService();
        mockWorkspace = new Workspace('workspace', [toWorkspaceFolder(ROOT_1_URI)]);
        mockContextService.setWorkspace(mockWorkspace);
        instantiationService.stub(IWorkspaceContextService, mockContextService);
        instantiationService.stub(IEnvironmentService, TestEnvironmentService);
        instantiationService.stub(IPathService, new TestPathService());
        queryBuilder = instantiationService.createInstance(QueryBuilder);
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('simple text pattern', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO), {
            folderQueries: [],
            contentPattern: PATTERN_INFO,
            type: 2 /* QueryType.Text */
        });
    });
    test('normalize literal newlines', () => {
        assertEqualTextQueries(queryBuilder.text({ pattern: 'foo\nbar', isRegExp: true }), {
            folderQueries: [],
            contentPattern: {
                pattern: 'foo\\nbar',
                isRegExp: true,
                isMultiline: true
            },
            type: 2 /* QueryType.Text */
        });
        assertEqualTextQueries(queryBuilder.text({ pattern: 'foo\nbar', isRegExp: false }), {
            folderQueries: [],
            contentPattern: {
                pattern: 'foo\nbar',
                isRegExp: false,
                isMultiline: true
            },
            type: 2 /* QueryType.Text */
        });
    });
    test('splits include pattern when expandPatterns enabled', () => {
        assertEqualQueries(queryBuilder.file([ROOT_1_NAMED_FOLDER], { includePattern: '**/foo, **/bar', expandPatterns: true }), {
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            type: 1 /* QueryType.File */,
            includePattern: {
                '**/foo': true,
                '**/foo/**': true,
                '**/bar': true,
                '**/bar/**': true,
            }
        });
    });
    test('does not split include pattern when expandPatterns disabled', () => {
        assertEqualQueries(queryBuilder.file([ROOT_1_NAMED_FOLDER], { includePattern: '**/foo, **/bar' }), {
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            type: 1 /* QueryType.File */,
            includePattern: {
                '**/foo, **/bar': true
            }
        });
    });
    test('includePattern array', () => {
        assertEqualQueries(queryBuilder.file([ROOT_1_NAMED_FOLDER], { includePattern: ['**/foo', '**/bar'] }), {
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            type: 1 /* QueryType.File */,
            includePattern: {
                '**/foo': true,
                '**/bar': true
            }
        });
    });
    test('includePattern array with expandPatterns', () => {
        assertEqualQueries(queryBuilder.file([ROOT_1_NAMED_FOLDER], { includePattern: ['**/foo', '**/bar'], expandPatterns: true }), {
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            type: 1 /* QueryType.File */,
            includePattern: {
                '**/foo': true,
                '**/foo/**': true,
                '**/bar': true,
                '**/bar/**': true,
            }
        });
    });
    test('folderResources', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI]), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{ folder: ROOT_1_URI }],
            type: 2 /* QueryType.Text */
        });
    });
    test('simple exclude setting', () => {
        mockConfigService.setUserConfiguration('search', {
            ...DEFAULT_USER_CONFIG,
            exclude: {
                'bar/**': true,
                'foo/**': {
                    'when': '$(basename).ts'
                }
            }
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            expandPatterns: true // verify that this doesn't affect patterns from configuration
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI,
                    excludePattern: [{
                            pattern: {
                                'bar/**': true,
                                'foo/**': {
                                    'when': '$(basename).ts'
                                }
                            }
                        }]
                }],
            type: 2 /* QueryType.Text */
        });
    });
    test('simple include', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: 'bar',
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            includePattern: {
                '**/bar': true,
                '**/bar/**': true
            },
            type: 2 /* QueryType.Text */
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: 'bar'
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            includePattern: {
                'bar': true
            },
            type: 2 /* QueryType.Text */
        });
    });
    test('simple include with ./ syntax', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: './bar',
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI,
                    includePattern: {
                        'bar': true,
                        'bar/**': true
                    }
                }],
            type: 2 /* QueryType.Text */
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: '.\\bar',
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI,
                    includePattern: {
                        'bar': true,
                        'bar/**': true
                    }
                }],
            type: 2 /* QueryType.Text */
        });
    });
    test('exclude setting and searchPath', () => {
        mockConfigService.setUserConfiguration('search', {
            ...DEFAULT_USER_CONFIG,
            exclude: {
                'foo/**/*.js': true,
                'bar/**': {
                    'when': '$(basename).ts'
                }
            }
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: './foo',
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI,
                    includePattern: {
                        'foo': true,
                        'foo/**': true
                    },
                    excludePattern: [{
                            pattern: {
                                'foo/**/*.js': true,
                                'bar/**': {
                                    'when': '$(basename).ts'
                                }
                            }
                        }]
                }],
            type: 2 /* QueryType.Text */
        });
    });
    test('multiroot exclude settings', () => {
        const ROOT_2 = fixPath('/project/root2');
        const ROOT_2_URI = getUri(ROOT_2);
        const ROOT_3 = fixPath('/project/root3');
        const ROOT_3_URI = getUri(ROOT_3);
        mockWorkspace.folders = toWorkspaceFolders([{ path: ROOT_1_URI.fsPath }, { path: ROOT_2_URI.fsPath }, { path: ROOT_3_URI.fsPath }], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
        mockWorkspace.configuration = uri.file(fixPath('/config'));
        mockConfigService.setUserConfiguration('search', {
            ...DEFAULT_USER_CONFIG,
            exclude: { 'foo/**/*.js': true }
        }, ROOT_1_URI);
        mockConfigService.setUserConfiguration('search', {
            ...DEFAULT_USER_CONFIG,
            exclude: { 'bar': true }
        }, ROOT_2_URI);
        // There are 3 roots, the first two have search.exclude settings, test that the correct basic query is returned
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI, ROOT_2_URI, ROOT_3_URI]), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                { folder: ROOT_1_URI, excludePattern: makeExcludePatternFromPatterns('foo/**/*.js') },
                { folder: ROOT_2_URI, excludePattern: makeExcludePatternFromPatterns('bar') },
                { folder: ROOT_3_URI }
            ],
            type: 2 /* QueryType.Text */
        });
        // Now test that it merges the root excludes when an 'include' is used
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI, ROOT_2_URI, ROOT_3_URI], {
            includePattern: './root2/src',
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_2_URI,
                    includePattern: {
                        'src': true,
                        'src/**': true
                    },
                    excludePattern: [{
                            pattern: { 'bar': true }
                        }],
                }
            ],
            type: 2 /* QueryType.Text */
        });
    });
    test('simple exclude input pattern', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            excludePattern: [{ pattern: 'foo' }],
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            type: 2 /* QueryType.Text */,
            excludePattern: patternsToIExpression(...globalGlob('foo'))
        });
    });
    test('file pattern trimming', () => {
        const content = 'content';
        assertEqualQueries(queryBuilder.file([], { filePattern: ` ${content} ` }), {
            folderQueries: [],
            filePattern: content,
            type: 1 /* QueryType.File */
        });
    });
    test('exclude ./ syntax', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            excludePattern: [{ pattern: './bar' }],
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI,
                    excludePattern: makeExcludePatternFromPatterns('bar', 'bar/**'),
                }],
            type: 2 /* QueryType.Text */
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            excludePattern: [{ pattern: './bar/**/*.ts' }],
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI,
                    excludePattern: makeExcludePatternFromPatterns('bar/**/*.ts', 'bar/**/*.ts/**'),
                }],
            type: 2 /* QueryType.Text */
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            excludePattern: [{ pattern: '.\\bar\\**\\*.ts' }],
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI,
                    excludePattern: makeExcludePatternFromPatterns('bar/**/*.ts', 'bar/**/*.ts/**'),
                }],
            type: 2 /* QueryType.Text */
        });
    });
    test('extraFileResources', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], { extraFileResources: [getUri('/foo/bar.js')] }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            extraFileResources: [getUri('/foo/bar.js')],
            type: 2 /* QueryType.Text */
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            extraFileResources: [getUri('/foo/bar.js')],
            excludePattern: [{ pattern: '*.js' }],
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            excludePattern: patternsToIExpression(...globalGlob('*.js')),
            type: 2 /* QueryType.Text */
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            extraFileResources: [getUri('/foo/bar.js')],
            includePattern: '*.txt',
            expandPatterns: true
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{
                    folder: ROOT_1_URI
                }],
            includePattern: patternsToIExpression(...globalGlob('*.txt')),
            type: 2 /* QueryType.Text */
        });
    });
    suite('parseSearchPaths 1', () => {
        test('simple includes', () => {
            function testSimpleIncludes(includePattern, expectedPatterns) {
                const result = queryBuilder.parseSearchPaths(includePattern);
                assert.deepStrictEqual({ ...result.pattern }, patternsToIExpression(...expectedPatterns), includePattern);
                assert.strictEqual(result.searchPaths, undefined);
            }
            [
                ['a', ['**/a/**', '**/a']],
                ['a/b', ['**/a/b', '**/a/b/**']],
                ['a/b,  c', ['**/a/b', '**/c', '**/a/b/**', '**/c/**']],
                ['a,.txt', ['**/a', '**/a/**', '**/*.txt', '**/*.txt/**']],
                ['a,,,b', ['**/a', '**/a/**', '**/b', '**/b/**']],
                ['**/a,b/**', ['**/a', '**/a/**', '**/b/**']]
            ].forEach(([includePattern, expectedPatterns]) => testSimpleIncludes(includePattern, expectedPatterns));
        });
        function testIncludes(includePattern, expectedResult) {
            let actual;
            try {
                actual = queryBuilder.parseSearchPaths(includePattern);
            }
            catch (_) {
                actual = { searchPaths: [] };
            }
            assertEqualSearchPathResults(actual, expectedResult, includePattern);
        }
        function testIncludesDataItem([includePattern, expectedResult]) {
            testIncludes(includePattern, expectedResult);
        }
        test('absolute includes', () => {
            const cases = [
                [
                    fixPath('/foo/bar'),
                    {
                        searchPaths: [{ searchPath: getUri('/foo/bar') }]
                    }
                ],
                [
                    fixPath('/foo/bar') + ',' + 'a',
                    {
                        searchPaths: [{ searchPath: getUri('/foo/bar') }],
                        pattern: patternsToIExpression(...globalGlob('a'))
                    }
                ],
                [
                    fixPath('/foo/bar') + ',' + fixPath('/1/2'),
                    {
                        searchPaths: [{ searchPath: getUri('/foo/bar') }, { searchPath: getUri('/1/2') }]
                    }
                ],
                [
                    fixPath('/foo/bar') + ',' + fixPath('/foo/../foo/bar/fooar/..'),
                    {
                        searchPaths: [{
                                searchPath: getUri('/foo/bar')
                            }]
                    }
                ],
                [
                    fixPath('/foo/bar/**/*.ts'),
                    {
                        searchPaths: [{
                                searchPath: getUri('/foo/bar'),
                                pattern: patternsToIExpression('**/*.ts', '**/*.ts/**')
                            }]
                    }
                ],
                [
                    fixPath('/foo/bar/*a/b/c'),
                    {
                        searchPaths: [{
                                searchPath: getUri('/foo/bar'),
                                pattern: patternsToIExpression('*a/b/c', '*a/b/c/**')
                            }]
                    }
                ],
                [
                    fixPath('/*a/b/c'),
                    {
                        searchPaths: [{
                                searchPath: getUri('/'),
                                pattern: patternsToIExpression('*a/b/c', '*a/b/c/**')
                            }]
                    }
                ],
                [
                    fixPath('/foo/{b,c}ar'),
                    {
                        searchPaths: [{
                                searchPath: getUri('/foo'),
                                pattern: patternsToIExpression('{b,c}ar', '{b,c}ar/**')
                            }]
                    }
                ]
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('relative includes w/single root folder', () => {
            const cases = [
                [
                    './a',
                    {
                        searchPaths: [{
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a', 'a/**')
                            }]
                    }
                ],
                [
                    './a/',
                    {
                        searchPaths: [{
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a', 'a/**')
                            }]
                    }
                ],
                [
                    './a/*b/c',
                    {
                        searchPaths: [{
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a/*b/c', 'a/*b/c/**')
                            }]
                    }
                ],
                [
                    './a/*b/c, ' + fixPath('/project/foo'),
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a/*b/c', 'a/*b/c/**')
                            },
                            {
                                searchPath: getUri('/project/foo')
                            }
                        ]
                    }
                ],
                [
                    './a/b/,./c/d',
                    {
                        searchPaths: [{
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a/b', 'a/b/**', 'c/d', 'c/d/**')
                            }]
                    }
                ],
                [
                    '../',
                    {
                        searchPaths: [{
                                searchPath: getUri('/foo')
                            }]
                    }
                ],
                [
                    '..',
                    {
                        searchPaths: [{
                                searchPath: getUri('/foo')
                            }]
                    }
                ],
                [
                    '..\\bar',
                    {
                        searchPaths: [{
                                searchPath: getUri('/foo/bar')
                            }]
                    }
                ]
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('relative includes w/two root folders', () => {
            const ROOT_2 = '/project/root2';
            mockWorkspace.folders = toWorkspaceFolders([{ path: ROOT_1_URI.fsPath }, { path: getUri(ROOT_2).fsPath }], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
            mockWorkspace.configuration = uri.file(fixPath('config'));
            const cases = [
                [
                    './root1',
                    {
                        searchPaths: [{
                                searchPath: getUri(ROOT_1)
                            }]
                    }
                ],
                [
                    './root2',
                    {
                        searchPaths: [{
                                searchPath: getUri(ROOT_2),
                            }]
                    }
                ],
                [
                    './root1/a/**/b, ./root2/**/*.txt',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a/**/b', 'a/**/b/**')
                            },
                            {
                                searchPath: getUri(ROOT_2),
                                pattern: patternsToIExpression('**/*.txt', '**/*.txt/**')
                            }
                        ]
                    }
                ]
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('include ./foldername', () => {
            const ROOT_2 = '/project/root2';
            const ROOT_1_FOLDERNAME = 'foldername';
            mockWorkspace.folders = toWorkspaceFolders([{ path: ROOT_1_URI.fsPath, name: ROOT_1_FOLDERNAME }, { path: getUri(ROOT_2).fsPath }], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
            mockWorkspace.configuration = uri.file(fixPath('config'));
            const cases = [
                [
                    './foldername',
                    {
                        searchPaths: [{
                                searchPath: ROOT_1_URI
                            }]
                    }
                ],
                [
                    './foldername/foo',
                    {
                        searchPaths: [{
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('foo', 'foo/**')
                            }]
                    }
                ]
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('folder with slash in the name', () => {
            const ROOT_2 = '/project/root2';
            const ROOT_2_URI = getUri(ROOT_2);
            const ROOT_1_FOLDERNAME = 'folder/one';
            const ROOT_2_FOLDERNAME = 'folder/two+'; // And another regex character, #126003
            mockWorkspace.folders = toWorkspaceFolders([{ path: ROOT_1_URI.fsPath, name: ROOT_1_FOLDERNAME }, { path: ROOT_2_URI.fsPath, name: ROOT_2_FOLDERNAME }], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
            mockWorkspace.configuration = uri.file(fixPath('config'));
            const cases = [
                [
                    './folder/one',
                    {
                        searchPaths: [{
                                searchPath: ROOT_1_URI
                            }]
                    }
                ],
                [
                    './folder/two+/foo/',
                    {
                        searchPaths: [{
                                searchPath: ROOT_2_URI,
                                pattern: patternsToIExpression('foo', 'foo/**')
                            }]
                    }
                ],
                [
                    './folder/onesomethingelse',
                    { searchPaths: [] }
                ],
                [
                    './folder/onesomethingelse/foo',
                    { searchPaths: [] }
                ],
                [
                    './folder',
                    { searchPaths: [] }
                ]
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('relative includes w/multiple ambiguous root folders', () => {
            const ROOT_2 = '/project/rootB';
            const ROOT_3 = '/otherproject/rootB';
            mockWorkspace.folders = toWorkspaceFolders([{ path: ROOT_1_URI.fsPath }, { path: getUri(ROOT_2).fsPath }, { path: getUri(ROOT_3).fsPath }], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
            mockWorkspace.configuration = uri.file(fixPath('/config'));
            const cases = [
                [
                    '',
                    {
                        searchPaths: undefined
                    }
                ],
                [
                    './',
                    {
                        searchPaths: undefined
                    }
                ],
                [
                    './root1',
                    {
                        searchPaths: [{
                                searchPath: getUri(ROOT_1)
                            }]
                    }
                ],
                [
                    './root1,./',
                    {
                        searchPaths: [{
                                searchPath: getUri(ROOT_1)
                            }]
                    }
                ],
                [
                    './rootB',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri(ROOT_2),
                            },
                            {
                                searchPath: getUri(ROOT_3),
                            }
                        ]
                    }
                ],
                [
                    './rootB/a/**/b, ./rootB/b/**/*.txt',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri(ROOT_2),
                                pattern: patternsToIExpression('a/**/b', 'a/**/b/**', 'b/**/*.txt', 'b/**/*.txt/**')
                            },
                            {
                                searchPath: getUri(ROOT_3),
                                pattern: patternsToIExpression('a/**/b', 'a/**/b/**', 'b/**/*.txt', 'b/**/*.txt/**')
                            }
                        ]
                    }
                ],
                [
                    './root1/**/foo/, bar/',
                    {
                        pattern: patternsToIExpression('**/bar', '**/bar/**'),
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('**/foo', '**/foo/**')
                            }
                        ]
                    }
                ]
            ];
            cases.forEach(testIncludesDataItem);
        });
    });
    suite('parseSearchPaths 2', () => {
        function testIncludes(includePattern, expectedResult) {
            assertEqualSearchPathResults(queryBuilder.parseSearchPaths(includePattern), expectedResult, includePattern);
        }
        function testIncludesDataItem([includePattern, expectedResult]) {
            testIncludes(includePattern, expectedResult);
        }
        (isWindows ? test.skip : test)('includes with tilde', () => {
            const userHome = URI.file('/');
            const cases = [
                [
                    '~/foo/bar',
                    {
                        searchPaths: [{ searchPath: getUri(userHome.fsPath, '/foo/bar') }]
                    }
                ],
                [
                    '~/foo/bar, a',
                    {
                        searchPaths: [{ searchPath: getUri(userHome.fsPath, '/foo/bar') }],
                        pattern: patternsToIExpression(...globalGlob('a'))
                    }
                ],
                [
                    fixPath('/foo/~/bar'),
                    {
                        searchPaths: [{ searchPath: getUri('/foo/~/bar') }]
                    }
                ],
            ];
            cases.forEach(testIncludesDataItem);
        });
    });
    suite('smartCase', () => {
        test('no flags -> no change', () => {
            const query = queryBuilder.text({
                pattern: 'a'
            }, []);
            assert(!query.contentPattern.isCaseSensitive);
        });
        test('maintains isCaseSensitive when smartCase not set', () => {
            const query = queryBuilder.text({
                pattern: 'a',
                isCaseSensitive: true
            }, []);
            assert(query.contentPattern.isCaseSensitive);
        });
        test('maintains isCaseSensitive when smartCase set', () => {
            const query = queryBuilder.text({
                pattern: 'a',
                isCaseSensitive: true
            }, [], {
                isSmartCase: true
            });
            assert(query.contentPattern.isCaseSensitive);
        });
        test('smartCase determines not case sensitive', () => {
            const query = queryBuilder.text({
                pattern: 'abcd'
            }, [], {
                isSmartCase: true
            });
            assert(!query.contentPattern.isCaseSensitive);
        });
        test('smartCase determines case sensitive', () => {
            const query = queryBuilder.text({
                pattern: 'abCd'
            }, [], {
                isSmartCase: true
            });
            assert(query.contentPattern.isCaseSensitive);
        });
        test('smartCase determines not case sensitive (regex)', () => {
            const query = queryBuilder.text({
                pattern: 'ab\\Sd',
                isRegExp: true
            }, [], {
                isSmartCase: true
            });
            assert(!query.contentPattern.isCaseSensitive);
        });
        test('smartCase determines case sensitive (regex)', () => {
            const query = queryBuilder.text({
                pattern: 'ab[A-Z]d',
                isRegExp: true
            }, [], {
                isSmartCase: true
            });
            assert(query.contentPattern.isCaseSensitive);
        });
    });
    suite('file', () => {
        test('simple file query', () => {
            const cacheKey = 'asdf';
            const query = queryBuilder.file([ROOT_1_NAMED_FOLDER], {
                cacheKey,
                sortByScore: true
            });
            assert.strictEqual(query.folderQueries.length, 1);
            assert.strictEqual(query.cacheKey, cacheKey);
            assert(query.sortByScore);
        });
    });
    suite('pattern processing', () => {
        test('text query with comma-separated includes with no workspace', () => {
            const query = queryBuilder.text({ pattern: `` }, [], {
                includePattern: '*.js,*.ts',
                expandPatterns: true
            });
            assert.deepEqual(query.includePattern, {
                "**/*.js/**": true,
                "**/*.js": true,
                "**/*.ts/**": true,
                "**/*.ts": true,
            });
            assert.strictEqual(query.folderQueries.length, 0);
        });
        test('text query with comma-separated includes with workspace', () => {
            const query = queryBuilder.text({ pattern: `` }, [ROOT_1_URI], {
                includePattern: '*.js,*.ts',
                expandPatterns: true
            });
            assert.deepEqual(query.includePattern, {
                "**/*.js/**": true,
                "**/*.js": true,
                "**/*.ts/**": true,
                "**/*.ts": true,
            });
            assert.strictEqual(query.folderQueries.length, 1);
        });
        test('text query with comma-separated excludes globally', () => {
            const query = queryBuilder.text({ pattern: `` }, [], {
                excludePattern: [{ pattern: '*.js,*.ts' }],
                expandPatterns: true
            });
            assert.deepEqual(query.excludePattern, {
                "**/*.js/**": true,
                "**/*.js": true,
                "**/*.ts/**": true,
                "**/*.ts": true,
            });
            assert.strictEqual(query.folderQueries.length, 0);
        });
        test('text query with comma-separated excludes globally in a workspace', () => {
            const query = queryBuilder.text({ pattern: `` }, [ROOT_1_NAMED_FOLDER.uri], {
                excludePattern: [{ pattern: '*.js,*.ts' }],
                expandPatterns: true
            });
            assert.deepEqual(query.excludePattern, {
                "**/*.js/**": true,
                "**/*.js": true,
                "**/*.ts/**": true,
                "**/*.ts": true,
            });
            assert.strictEqual(query.folderQueries.length, 1);
        });
        test.skip('text query with multiple comma-separated excludes', () => {
            // TODO: Fix. Will require `ICommonQueryProps.excludePattern` to support an array.
            const query = queryBuilder.text({ pattern: `` }, [ROOT_1_NAMED_FOLDER.uri], {
                excludePattern: [{ pattern: '*.js,*.ts' }, { pattern: 'foo/*,bar/*' }],
                expandPatterns: true
            });
            assert.deepEqual(query.excludePattern, [
                {
                    "**/*.js/**": true,
                    "**/*.js": true,
                    "**/*.ts/**": true,
                    "**/*.ts": true,
                },
                {
                    "**/foo/*/**": true,
                    "**/foo/*": true,
                    "**/bar/*/**": true,
                    "**/bar/*": true,
                }
            ]);
            assert.strictEqual(query.folderQueries.length, 1);
        });
        test.skip('text query with base URI on exclud', () => {
            // TODO: Fix. Will require `ICommonQueryProps.excludePattern` to support an baseURI.
            const query = queryBuilder.text({ pattern: `` }, [ROOT_1_NAMED_FOLDER.uri], {
                excludePattern: [{ uri: ROOT_1_URI, pattern: '*.js,*.ts' }],
                expandPatterns: true
            });
            // todo: incorporate the base URI into the pattern
            assert.deepEqual(query.excludePattern, {
                uri: ROOT_1_URI,
                pattern: {
                    "**/*.js/**": true,
                    "**/*.js": true,
                    "**/*.ts/**": true,
                    "**/*.ts": true,
                }
            });
            assert.strictEqual(query.folderQueries.length, 1);
        });
    });
});
function makeExcludePatternFromPatterns(...patterns) {
    const pattern = patternsToIExpression(...patterns);
    return pattern ? [{ pattern }] : undefined;
}
function assertEqualTextQueries(actual, expected) {
    expected = {
        ...DEFAULT_TEXT_QUERY_PROPS,
        ...expected
    };
    return assertEqualQueries(actual, expected);
}
export function assertEqualQueries(actual, expected) {
    expected = {
        ...DEFAULT_QUERY_PROPS,
        ...expected
    };
    const folderQueryToCompareObject = (fq) => {
        const excludePattern = fq.excludePattern?.map(e => normalizeExpression(e.pattern));
        return {
            path: fq.folder.fsPath,
            excludePattern: excludePattern?.length ? excludePattern : undefined,
            includePattern: normalizeExpression(fq.includePattern),
            fileEncoding: fq.fileEncoding
        };
    };
    // Avoid comparing URI objects, not a good idea
    if (expected.folderQueries) {
        assert.deepStrictEqual(actual.folderQueries.map(folderQueryToCompareObject), expected.folderQueries.map(folderQueryToCompareObject));
        actual.folderQueries = [];
        expected.folderQueries = [];
    }
    if (expected.extraFileResources) {
        assert.deepStrictEqual(actual.extraFileResources.map(extraFile => extraFile.fsPath), expected.extraFileResources.map(extraFile => extraFile.fsPath));
        delete expected.extraFileResources;
        delete actual.extraFileResources;
    }
    delete actual.usingSearchPaths;
    actual.includePattern = normalizeExpression(actual.includePattern);
    actual.excludePattern = normalizeExpression(actual.excludePattern);
    cleanUndefinedQueryValues(actual);
    assert.deepStrictEqual(actual, expected);
}
export function assertEqualSearchPathResults(actual, expected, message) {
    cleanUndefinedQueryValues(actual);
    assert.deepStrictEqual({ ...actual.pattern }, { ...expected.pattern }, message);
    assert.strictEqual(actual.searchPaths && actual.searchPaths.length, expected.searchPaths && expected.searchPaths.length);
    if (actual.searchPaths) {
        actual.searchPaths.forEach((searchPath, i) => {
            const expectedSearchPath = expected.searchPaths[i];
            assert.deepStrictEqual(searchPath.pattern && { ...searchPath.pattern }, expectedSearchPath.pattern);
            assert.strictEqual(searchPath.searchPath.toString(), expectedSearchPath.searchPath.toString());
        });
    }
}
/**
 * Recursively delete all undefined property values from the search query, to make it easier to
 * assert.deepStrictEqual with some expected object.
 */
export function cleanUndefinedQueryValues(q) {
    for (const key in q) {
        if (q[key] === undefined) {
            delete q[key];
        }
        else if (typeof q[key] === 'object') {
            cleanUndefinedQueryValues(q[key]);
        }
    }
    return q;
}
export function globalGlob(pattern) {
    return [
        `**/${pattern}/**`,
        `**/${pattern}`
    ];
}
export function patternsToIExpression(...patterns) {
    return patterns.length ?
        patterns.reduce((glob, cur) => { glob[cur] = true; return glob; }, {}) :
        undefined;
}
export function getUri(...slashPathParts) {
    return uri.file(fixPath(...slashPathParts));
}
export function fixPath(...slashPathParts) {
    if (isWindows && slashPathParts.length && !slashPathParts[0].match(/^c:/i)) {
        slashPathParts.unshift('c:');
    }
    return join(...slashPathParts);
}
export function normalizeExpression(expression) {
    if (!expression) {
        return expression;
    }
    const normalized = {};
    Object.keys(expression).forEach(key => {
        normalized[key.replace(/\\/g, '/')] = expression[key];
    });
    return normalized;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L2Jyb3dzZXIvcXVlcnlCdWlsZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDcEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFvQixZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sRUFB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