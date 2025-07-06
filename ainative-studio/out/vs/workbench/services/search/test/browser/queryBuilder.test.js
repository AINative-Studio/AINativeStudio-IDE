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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9icm93c2VyL3F1ZXJ5QnVpbGRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBb0IsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFP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