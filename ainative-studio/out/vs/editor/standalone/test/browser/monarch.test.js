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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS90ZXN0L2Jyb3dzZXIvbW9uYXJjaC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXhFLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBRXJCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxzQkFBc0IsQ0FBQyxlQUFpQyxFQUFFLFVBQWtCLEVBQUUsUUFBMEIsRUFBRSxvQkFBMkM7UUFDN0osT0FBTyxJQUFJLGdCQUFnQixDQUFDLGVBQWUsRUFBRSxJQUFLLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUN0SCxDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsU0FBMkIsRUFBRSxLQUFlO1FBQzlELE1BQU0sWUFBWSxHQUFjLEVBQUUsQ0FBQztRQUNuQyxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDeEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckQsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDekIsQ0FBQztRQUNELE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxJQUFJLENBQUMsMEVBQTBFLEVBQUUsR0FBRyxFQUFFO1FBQ3JGLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDL0QsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDhCQUE4QixDQUFDLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQztRQUN0RixXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRTtZQUNuSCxTQUFTLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFO29CQUNMLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQztpQkFDZDthQUNEO1NBQ0QsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sZUFBZSxHQUFHLHlEQUF5RCxDQUFDO1FBQ2xGLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsZUFBZSxFQUFFLE9BQU8sRUFBRTtZQUNsRixTQUFTLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFO29CQUNMLENBQUMsV0FBVyxlQUFlLEVBQUUsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLGNBQWMsR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQ3ZJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxtQkFBbUIsR0FBRyxFQUFFLENBQUM7aUJBQ3BFO2dCQUNELGdCQUFnQixFQUFFO29CQUNqQixDQUFDLE1BQU0sRUFBRTs0QkFDUixLQUFLLEVBQUU7Z0NBQ04sQ0FBQyxHQUFHLGVBQWUsT0FBTyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsS0FBSyxHQUFHO2dDQUNuRyxVQUFVLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsR0FBRzs2QkFDaEU7eUJBQ0QsQ0FBQztpQkFDRjtnQkFDRCxlQUFlLEVBQUU7b0JBQ2hCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztvQkFDcEIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO29CQUNwQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO29CQUMvQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUM7aUJBQ2hCO2dCQUNELGdCQUFnQixFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUM7YUFDL0Y7U0FDRCxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUUxQixNQUFNLEtBQUssR0FBRztZQUNiLG1FQUFtRTtZQUNuRSxpQkFBaUI7WUFDakIsVUFBVTtZQUNWLGlCQUFpQjtZQUNqQix1QkFBdUI7WUFDdkIsTUFBTTtTQUNOLENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWpELE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFO1lBQ3BDO2dCQUNDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDO2dCQUNyQyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxDQUFDO2dCQUM1QyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQztnQkFDakMsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFLG9CQUFvQixFQUFFLE9BQU8sQ0FBQztnQkFDNUMsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxPQUFPLENBQUM7YUFDdEM7WUFDRDtnQkFDQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQztnQkFDckMsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFLG9CQUFvQixFQUFFLE9BQU8sQ0FBQzthQUM1QztZQUNEO2dCQUNDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDO2FBQ2hDO1lBQ0Q7Z0JBQ0MsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUM7YUFDaEM7WUFDRDtnQkFDQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQzthQUNoQztZQUNEO2dCQUNDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxvQkFBb0IsRUFBRSxPQUFPLENBQUM7Z0JBQzNDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDO2FBQ3JDO1NBQ0QsQ0FBQyxDQUFDO1FBQ0gsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtRQUM5RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDdEYsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDL0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFO1lBQ2pGLFNBQVMsRUFBRTtnQkFDVixJQUFJLEVBQUU7b0JBQ0wsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFO2lCQUN4QjtnQkFFRCxRQUFRLEVBQUU7b0JBQ1QsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQUUsNEJBQTRCO29CQUNsRCxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDO2lCQUNuQztnQkFFRCxXQUFXLEVBQUU7b0JBQ1osQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDO29CQUMxQyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUM7b0JBQ2xCLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUM7b0JBQ3hCLHFEQUFxRDtpQkFDckQ7YUFDRDtTQUNELEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBRTFCLE1BQU0sS0FBSyxHQUFHO1lBQ2Isb0JBQW9CO1lBQ3BCLG9DQUFvQztZQUNwQyxFQUFFO1lBQ0Ysd0NBQXdDO1lBQ3hDLCtDQUErQztZQUMvQyxFQUFFO1lBQ0YsOENBQThDO1lBQzlDLHNEQUFzRDtZQUN0RCxFQUFFO1lBQ0Ysb0RBQW9EO1lBQ3BELEVBQUU7WUFDRiw0REFBNEQ7U0FDNUQsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUU7WUFDcEMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN0QyxFQUFFO1lBQ0YsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNyQyxFQUFFO1lBQ0YsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN0QyxFQUFFO1lBQ0YsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLEVBQUU7WUFDRixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDckMsQ0FBQyxDQUFDO1FBRUgsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEdBQUcsRUFBRTtRQUN0RSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDdEYsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDL0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFO1lBQ2pGLFNBQVMsRUFBRSxJQUFJO1lBQ2YsU0FBUyxFQUFFO2dCQUNWLElBQUksRUFBRTtvQkFDTCxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDO29CQUNyQixDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDO29CQUN0QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7b0JBQ3BCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztpQkFDbEI7Z0JBQ0QsS0FBSyxFQUFFO29CQUNOLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUM7b0JBQ2xCLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztvQkFDakIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2lCQUNkO2FBQ0Q7U0FDRCxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUUxQixNQUFNLEtBQUssR0FBRztZQUNiLGVBQWU7WUFDZixXQUFXO1lBQ1gscUJBQXFCO1NBQ3JCLENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWpELE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFO1lBQ3BDO2dCQUNDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDO2FBQ25DO1lBQ0Q7Z0JBQ0MsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUM7Z0JBQ3hCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDO2dCQUNuQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQztnQkFDeEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUM7YUFDbkM7WUFDRDtnQkFDQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQztnQkFDbkMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUM7Z0JBQ3hCLElBQUksS0FBSyxDQUFDLEVBQUUsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDO2dCQUNwQyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQztnQkFDekIsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUM7YUFDcEM7U0FDRCxDQUFDLENBQUM7UUFFSCxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkZBQTJGLEVBQUUsR0FBRyxFQUFFO1FBQ3RHLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDhCQUE4QixDQUFDLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQztRQUN0RixNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUUvRCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUU7WUFDbEYsVUFBVSxFQUFFLEtBQUs7WUFDakIsa0JBQWtCLEVBQUUscUJBQXFCO1lBQ3pDLGtCQUFrQixFQUFFLHFCQUFxQjtZQUN6QyxrQkFBa0IsRUFBRSxxQkFBcUI7WUFDekMsa0JBQWtCLEVBQUUscUJBQXFCO1lBQ3pDLGtCQUFrQixFQUFFLE1BQU07WUFDMUIsU0FBUyxFQUFFO2dCQUNWLElBQUksRUFBRTtvQkFDTDt3QkFDQyxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7NEJBQ3pCLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLHFCQUFxQixHQUFHLENBQUM7NEJBQzFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLE1BQU0sR0FBRyxDQUFDO3dCQUM1QixNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO3FCQUN4QjtpQkFDRDthQUNEO1NBQ0QsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFFMUIsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFO1lBQ2xGLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLFNBQVMsRUFBRTtnQkFDVixJQUFJLEVBQUU7b0JBQ0w7d0JBQ0MsS0FBSyxFQUFFLE9BQU87d0JBQ2QsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtxQkFDeEI7aUJBQ0Q7YUFDRDtTQUNELEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBRTFCLE1BQU0sS0FBSyxHQUFHO1lBQ2IsTUFBTTtTQUNOLENBQUM7UUFFRixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFO1lBQ3JDO2dCQUNDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDO2FBQ2hDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRTtZQUNyQztnQkFDQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQzthQUNoQztTQUNELENBQUMsQ0FBQztRQUVILFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7UUFDN0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxNQUFNLG9CQUFvQixHQUFHLElBQUksOEJBQThCLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBRS9ELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRTtZQUNqRixVQUFVLEVBQUUsS0FBSztZQUNqQixTQUFTLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFO29CQUNMO3dCQUNDLEtBQUssRUFBRSxNQUFNO3dCQUNiLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7cUJBQ3hCO2lCQUNEO2FBQ0Q7U0FDRCxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUUxQixNQUFNLEtBQUssR0FBRztZQUNiLElBQUk7U0FDSixDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRTtZQUNwQztnQkFDQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQzthQUNoQztTQUNELENBQUMsQ0FBQztRQUVILFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpRkFBaUYsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRTFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDdEYsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFFL0QsaUZBQWlGO1FBQ2pGLE1BQU0sb0JBQW9CLENBQUMsV0FBVyxDQUFDLGtDQUFrQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTlFLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRTtZQUNqRixTQUFTLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFO29CQUNMO3dCQUNDLEtBQUssRUFBRSxLQUFLO3dCQUNaLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7cUJBQ3hCO2lCQUNEO2FBQ0Q7U0FDRCxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUUxQixNQUFNLEtBQUssR0FBRztZQUNiLEtBQUssRUFBRSxnQ0FBZ0M7WUFDdkMsUUFBUSxDQUFDLG9DQUFvQztTQUM3QyxDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRTtZQUNwQztnQkFDQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQzthQUNoQyxFQUFFO2dCQUNGLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDO2FBQ3hCO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtEQUErRCxFQUFFLEdBQUcsRUFBRTtRQUMxRSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDdEYsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFFL0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFO1lBQ2pGLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLFNBQVMsRUFBRTtnQkFDVixJQUFJLEVBQUU7b0JBQ0wsb0JBQW9CO29CQUNwQixDQUFDLGtDQUFrQyxFQUFFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztpQkFDcEY7Z0JBRUQsR0FBRyxFQUFFO29CQUNKLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUM7b0JBQ25DLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQztpQkFDcEI7YUFDRDtTQUNELEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBRTFCLE1BQU0sS0FBSyxHQUFHO1lBQ2IsYUFBYTtZQUNiLEVBQUU7WUFDRixrQkFBa0I7WUFDbEIsY0FBYztZQUNkLFNBQVM7WUFDVCxFQUFFO1lBQ0Ysd0JBQXdCO1lBQ3hCLEVBQUU7WUFDRixHQUFHO1NBQ0gsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUU7WUFDcEMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLEVBQUU7WUFDRixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JGLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3pDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDOUUsRUFBRTtZQUNGLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNyQyxFQUFFO1lBQ0YsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3JDLENBQUMsQ0FBQztRQUVILFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztBQUVKLENBQUMsQ0FBQyxDQUFDIn0=