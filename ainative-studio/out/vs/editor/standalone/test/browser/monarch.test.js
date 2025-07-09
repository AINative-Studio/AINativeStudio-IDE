/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Token, TokenizationRegistry } from '../../../common/languages.js';
import { LanguageService } from '../../../common/services/languageService.js';
import { StandaloneConfigurationService } from '../../browser/standaloneServices.js';
import { compile } from '../../common/monarch/monarchCompile.js';
import { MonarchTokenizer } from '../../common/monarch/monarchLexer.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
suite('Monarch', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function createMonarchTokenizer(languageService, languageId, language, configurationService) {
        return new MonarchTokenizer(languageService, null, languageId, compile(languageId, language), configurationService);
    }
    function getTokens(tokenizer, lines) {
        const actualTokens = [];
        let state = tokenizer.getInitialState();
        for (const line of lines) {
            const result = tokenizer.tokenize(line, true, state);
            actualTokens.push(result.tokens);
            state = result.endState;
        }
        return actualTokens;
    }
    test('Ensure @rematch and nextEmbedded can be used together in Monarch grammar', () => {
        const disposables = new DisposableStore();
        const languageService = disposables.add(new LanguageService());
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        disposables.add(languageService.registerLanguage({ id: 'sql' }));
        disposables.add(TokenizationRegistry.register('sql', disposables.add(createMonarchTokenizer(languageService, 'sql', {
            tokenizer: {
                root: [
                    [/./, 'token']
                ]
            }
        }, configurationService))));
        const SQL_QUERY_START = '(SELECT|INSERT|UPDATE|DELETE|CREATE|REPLACE|ALTER|WITH)';
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test1', {
            tokenizer: {
                root: [
                    [`(\"\"\")${SQL_QUERY_START}`, [{ 'token': 'string.quote', }, { token: '@rematch', next: '@endStringWithSQL', nextEmbedded: 'sql', },]],
                    [/(""")$/, [{ token: 'string.quote', next: '@maybeStringIsSQL', },]],
                ],
                maybeStringIsSQL: [
                    [/(.*)/, {
                            cases: {
                                [`${SQL_QUERY_START}\\b.*`]: { token: '@rematch', next: '@endStringWithSQL', nextEmbedded: 'sql', },
                                '@default': { token: '@rematch', switchTo: '@endDblDocString', },
                            }
                        }],
                ],
                endDblDocString: [
                    ['[^\']+', 'string'],
                    ['\\\\\'', 'string'],
                    ['\'\'\'', 'string', '@popall'],
                    ['\'', 'string']
                ],
                endStringWithSQL: [[/"""/, { token: 'string.quote', next: '@popall', nextEmbedded: '@pop', },]],
            }
        }, configurationService));
        const lines = [
            `mysql_query("""SELECT * FROM table_name WHERE ds = '<DATEID>'""")`,
            `mysql_query("""`,
            `SELECT *`,
            `FROM table_name`,
            `WHERE ds = '<DATEID>'`,
            `""")`,
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [
                new Token(0, 'source.test1', 'test1'),
                new Token(12, 'string.quote.test1', 'test1'),
                new Token(15, 'token.sql', 'sql'),
                new Token(61, 'string.quote.test1', 'test1'),
                new Token(64, 'source.test1', 'test1')
            ],
            [
                new Token(0, 'source.test1', 'test1'),
                new Token(12, 'string.quote.test1', 'test1')
            ],
            [
                new Token(0, 'token.sql', 'sql')
            ],
            [
                new Token(0, 'token.sql', 'sql')
            ],
            [
                new Token(0, 'token.sql', 'sql')
            ],
            [
                new Token(0, 'string.quote.test1', 'test1'),
                new Token(3, 'source.test1', 'test1')
            ]
        ]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#1235: Empty Line Handling', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            tokenizer: {
                root: [
                    { include: '@comments' },
                ],
                comments: [
                    [/\/\/$/, 'comment'], // empty single-line comment
                    [/\/\//, 'comment', '@comment_cpp'],
                ],
                comment_cpp: [
                    [/(?:[^\\]|(?:\\.))+$/, 'comment', '@pop'],
                    [/.+$/, 'comment'],
                    [/$/, 'comment', '@pop']
                    // No possible rule to detect an empty line and @pop?
                ],
            },
        }, configurationService));
        const lines = [
            `// This comment \\`,
            `   continues on the following line`,
            ``,
            `// This comment does NOT continue \\\\`,
            `   because the escape char was itself escaped`,
            ``,
            `// This comment DOES continue because \\\\\\`,
            `   the 1st '\\' escapes the 2nd; the 3rd escapes EOL`,
            ``,
            `// This comment continues to the following line \\`,
            ``,
            `But the line was empty. This line should not be commented.`,
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [new Token(0, 'comment.test', 'test')],
            [new Token(0, 'comment.test', 'test')],
            [],
            [new Token(0, 'comment.test', 'test')],
            [new Token(0, 'source.test', 'test')],
            [],
            [new Token(0, 'comment.test', 'test')],
            [new Token(0, 'comment.test', 'test')],
            [],
            [new Token(0, 'comment.test', 'test')],
            [],
            [new Token(0, 'source.test', 'test')]
        ]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#2265: Exit a state at end of line', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            includeLF: true,
            tokenizer: {
                root: [
                    [/^\*/, '', '@inner'],
                    [/\:\*/, '', '@inner'],
                    [/[^*:]+/, 'string'],
                    [/[*:]/, 'string']
                ],
                inner: [
                    [/\n/, '', '@pop'],
                    [/\d+/, 'number'],
                    [/[^\d]+/, '']
                ]
            }
        }, configurationService));
        const lines = [
            `PRINT 10 * 20`,
            `*FX200, 3`,
            `PRINT 2*3:*FX200, 3`
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [
                new Token(0, 'string.test', 'test'),
            ],
            [
                new Token(0, '', 'test'),
                new Token(3, 'number.test', 'test'),
                new Token(6, '', 'test'),
                new Token(8, 'number.test', 'test'),
            ],
            [
                new Token(0, 'string.test', 'test'),
                new Token(9, '', 'test'),
                new Token(13, 'number.test', 'test'),
                new Token(16, '', 'test'),
                new Token(18, 'number.test', 'test'),
            ]
        ]);
        disposables.dispose();
    });
    test('issue #115662: monarchCompile function need an extra option which can control replacement', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer1 = disposables.add(createMonarchTokenizer(languageService, 'test', {
            ignoreCase: false,
            uselessReplaceKey1: '@uselessReplaceKey2',
            uselessReplaceKey2: '@uselessReplaceKey3',
            uselessReplaceKey3: '@uselessReplaceKey4',
            uselessReplaceKey4: '@uselessReplaceKey5',
            uselessReplaceKey5: '@ham',
            tokenizer: {
                root: [
                    {
                        regex: /@\w+/.test('@ham')
                            ? new RegExp(`^${'@uselessReplaceKey1'}$`)
                            : new RegExp(`^${'@ham'}$`),
                        action: { token: 'ham' }
                    },
                ],
            },
        }, configurationService));
        const tokenizer2 = disposables.add(createMonarchTokenizer(languageService, 'test', {
            ignoreCase: false,
            tokenizer: {
                root: [
                    {
                        regex: /@@ham/,
                        action: { token: 'ham' }
                    },
                ],
            },
        }, configurationService));
        const lines = [
            `@ham`
        ];
        const actualTokens1 = getTokens(tokenizer1, lines);
        assert.deepStrictEqual(actualTokens1, [
            [
                new Token(0, 'ham.test', 'test'),
            ]
        ]);
        const actualTokens2 = getTokens(tokenizer2, lines);
        assert.deepStrictEqual(actualTokens2, [
            [
                new Token(0, 'ham.test', 'test'),
            ]
        ]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#2424: Allow to target @@', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            ignoreCase: false,
            tokenizer: {
                root: [
                    {
                        regex: /@@@@/,
                        action: { token: 'ham' }
                    },
                ],
            },
        }, configurationService));
        const lines = [
            `@@`
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [
                new Token(0, 'ham.test', 'test'),
            ]
        ]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#3025: Check maxTokenizationLineLength before tokenizing', async () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        // Set maxTokenizationLineLength to 4 so that "ham" works but "hamham" would fail
        await configurationService.updateValue('editor.maxTokenizationLineLength', 4);
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            tokenizer: {
                root: [
                    {
                        regex: /ham/,
                        action: { token: 'ham' }
                    },
                ],
            },
        }, configurationService));
        const lines = [
            'ham', // length 3, should be tokenized
            'hamham' // length 6, should NOT be tokenized
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [
                new Token(0, 'ham.test', 'test'),
            ], [
                new Token(0, '', 'test')
            ]
        ]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#3128: allow state access within rules', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            ignoreCase: false,
            encoding: /u|u8|U|L/,
            tokenizer: {
                root: [
                    // C++ 11 Raw String
                    [/@encoding?R\"(?:([^ ()\\\t]*))\(/, { token: 'string.raw.begin', next: '@raw.$1' }],
                ],
                raw: [
                    [/.*\)$S2\"/, 'string.raw', '@pop'],
                    [/.*/, 'string.raw']
                ],
            },
        }, configurationService));
        const lines = [
            `int main(){`,
            ``,
            `	auto s = R""""(`,
            `	Hello World`,
            `	)"""";`,
            ``,
            `	std::cout << "hello";`,
            ``,
            `}`,
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [new Token(0, 'source.test', 'test')],
            [],
            [new Token(0, 'source.test', 'test'), new Token(10, 'string.raw.begin.test', 'test')],
            [new Token(0, 'string.raw.test', 'test')],
            [new Token(0, 'string.raw.test', 'test'), new Token(6, 'source.test', 'test')],
            [],
            [new Token(0, 'source.test', 'test')],
            [],
            [new Token(0, 'source.test', 'test')],
        ]);
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL3Rlc3QvYnJvd3Nlci9tb25hcmNoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUd4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFeEUsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFFckIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLHNCQUFzQixDQUFDLGVBQWlDLEVBQUUsVUFBa0IsRUFBRSxRQUEwQixFQUFFLG9CQUEyQztRQUM3SixPQUFPLElBQUksZ0JBQWdCLENBQUMsZUFBZSxFQUFFLElBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3RILENBQUM7SUFFRCxTQUFTLFNBQVMsQ0FBQyxTQUEyQixFQUFFLEtBQWU7UUFDOUQsTUFB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