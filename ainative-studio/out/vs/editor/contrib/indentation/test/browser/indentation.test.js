/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { NullState } from '../../../../common/languages/nullTokenize.js';
import { AutoIndentOnPaste, IndentationToSpacesCommand, IndentationToTabsCommand } from '../../browser/indentation.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
import { goIndentationRules, htmlIndentationRules, javascriptIndentationRules, latexIndentationRules, luaIndentationRules, phpIndentationRules, rubyIndentationRules } from '../../../../test/common/modes/supports/indentationRules.js';
import { cppOnEnterRules, htmlOnEnterRules, javascriptOnEnterRules, phpOnEnterRules } from '../../../../test/common/modes/supports/onEnterRules.js';
import { TypeOperations } from '../../../../common/cursor/cursorTypeOperations.js';
import { cppBracketRules, goBracketRules, htmlBracketRules, latexBracketRules, luaBracketRules, phpBracketRules, rubyBracketRules, typescriptBracketRules, vbBracketRules } from '../../../../test/common/modes/supports/bracketRules.js';
import { javascriptAutoClosingPairsRules, latexAutoClosingPairsRules } from '../../../../test/common/modes/supports/autoClosingPairsRules.js';
import { LanguageService } from '../../../../common/services/languageService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
export var Language;
(function (Language) {
    Language["TypeScript"] = "ts-test";
    Language["Ruby"] = "ruby-test";
    Language["PHP"] = "php-test";
    Language["Go"] = "go-test";
    Language["CPP"] = "cpp-test";
    Language["HTML"] = "html-test";
    Language["VB"] = "vb-test";
    Language["Latex"] = "latex-test";
    Language["Lua"] = "lua-test";
})(Language || (Language = {}));
function testIndentationToSpacesCommand(lines, selection, tabSize, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new IndentationToSpacesCommand(sel, tabSize), expectedLines, expectedSelection);
}
function testIndentationToTabsCommand(lines, selection, tabSize, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new IndentationToTabsCommand(sel, tabSize), expectedLines, expectedSelection);
}
export function registerLanguage(languageService, language) {
    return languageService.registerLanguage({ id: language });
}
export function registerLanguageConfiguration(languageConfigurationService, language) {
    switch (language) {
        case Language.TypeScript:
            return languageConfigurationService.register(language, {
                brackets: typescriptBracketRules,
                comments: {
                    lineComment: '//',
                    blockComment: ['/*', '*/']
                },
                autoClosingPairs: javascriptAutoClosingPairsRules,
                indentationRules: javascriptIndentationRules,
                onEnterRules: javascriptOnEnterRules
            });
        case Language.Ruby:
            return languageConfigurationService.register(language, {
                brackets: rubyBracketRules,
                indentationRules: rubyIndentationRules,
            });
        case Language.PHP:
            return languageConfigurationService.register(language, {
                brackets: phpBracketRules,
                indentationRules: phpIndentationRules,
                onEnterRules: phpOnEnterRules
            });
        case Language.Go:
            return languageConfigurationService.register(language, {
                brackets: goBracketRules,
                indentationRules: goIndentationRules
            });
        case Language.CPP:
            return languageConfigurationService.register(language, {
                brackets: cppBracketRules,
                onEnterRules: cppOnEnterRules
            });
        case Language.HTML:
            return languageConfigurationService.register(language, {
                brackets: htmlBracketRules,
                indentationRules: htmlIndentationRules,
                onEnterRules: htmlOnEnterRules
            });
        case Language.VB:
            return languageConfigurationService.register(language, {
                brackets: vbBracketRules,
            });
        case Language.Latex:
            return languageConfigurationService.register(language, {
                brackets: latexBracketRules,
                autoClosingPairs: latexAutoClosingPairsRules,
                indentationRules: latexIndentationRules
            });
        case Language.Lua:
            return languageConfigurationService.register(language, {
                brackets: luaBracketRules,
                indentationRules: luaIndentationRules
            });
    }
}
export function registerTokenizationSupport(instantiationService, tokens, languageId) {
    let lineIndex = 0;
    const languageService = instantiationService.get(ILanguageService);
    const tokenizationSupport = {
        getInitialState: () => NullState,
        tokenize: undefined,
        tokenizeEncoded: (line, hasEOL, state) => {
            const tokensOnLine = tokens[lineIndex++];
            const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
            const result = new Uint32Array(2 * tokensOnLine.length);
            for (let i = 0; i < tokensOnLine.length; i++) {
                result[2 * i] = tokensOnLine[i].startIndex;
                result[2 * i + 1] =
                    ((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
                        | (tokensOnLine[i].standardTokenType << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */));
            }
            return new EncodedTokenizationResult(result, state);
        }
    };
    return TokenizationRegistry.register(languageId, tokenizationSupport);
}
suite('Change Indentation to Spaces - TypeScript/Javascript', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('single tabs only at start of line', function () {
        testIndentationToSpacesCommand([
            'first',
            'second line',
            'third line',
            '\tfourth line',
            '\tfifth'
        ], new Selection(2, 3, 2, 3), 4, [
            'first',
            'second line',
            'third line',
            '    fourth line',
            '    fifth'
        ], new Selection(2, 3, 2, 3));
    });
    test('multiple tabs at start of line', function () {
        testIndentationToSpacesCommand([
            '\t\tfirst',
            '\tsecond line',
            '\t\t\t third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5), 3, [
            '      first',
            '   second line',
            '          third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 9, 1, 9));
    });
    test('multiple tabs', function () {
        testIndentationToSpacesCommand([
            '\t\tfirst\t',
            '\tsecond  \t line \t',
            '\t\t\t third line',
            ' \tfourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5), 2, [
            '    first\t',
            '  second  \t line \t',
            '       third line',
            '   fourth line',
            'fifth'
        ], new Selection(1, 7, 1, 7));
    });
    test('empty lines', function () {
        testIndentationToSpacesCommand([
            '\t\t\t',
            '\t',
            '\t\t'
        ], new Selection(1, 4, 1, 4), 2, [
            '      ',
            '  ',
            '    '
        ], new Selection(1, 4, 1, 4));
    });
});
suite('Change Indentation to Tabs -  TypeScript/Javascript', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('spaces only at start of line', function () {
        testIndentationToTabsCommand([
            '    first',
            'second line',
            '    third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 3, 2, 3), 4, [
            '\tfirst',
            'second line',
            '\tthird line',
            'fourth line',
            'fifth'
        ], new Selection(2, 3, 2, 3));
    });
    test('multiple spaces at start of line', function () {
        testIndentationToTabsCommand([
            'first',
            '   second line',
            '          third line',
            'fourth line',
            '     fifth'
        ], new Selection(1, 5, 1, 5), 3, [
            'first',
            '\tsecond line',
            '\t\t\t third line',
            'fourth line',
            '\t  fifth'
        ], new Selection(1, 5, 1, 5));
    });
    test('multiple spaces', function () {
        testIndentationToTabsCommand([
            '      first   ',
            '  second     line \t',
            '       third line',
            '   fourth line',
            'fifth'
        ], new Selection(1, 8, 1, 8), 2, [
            '\t\t\tfirst   ',
            '\tsecond     line \t',
            '\t\t\t third line',
            '\t fourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5));
    });
    test('issue #45996', function () {
        testIndentationToSpacesCommand([
            '\tabc',
        ], new Selection(1, 3, 1, 3), 4, [
            '    abc',
        ], new Selection(1, 6, 1, 6));
    });
});
suite('Indent With Tab - TypeScript/JavaScript', () => {
    const languageId = Language.TypeScript;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #63388: perserve correct indentation on tab 1', () => {
        // https://github.com/microsoft/vscode/issues/63388
        const model = createTextModel([
            '/*',
            ' * Comment',
            ' * /',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(1, 1, 3, 5));
            editor.executeCommands('editor.action.indentLines', TypeOperations.indent(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
            assert.strictEqual(model.getValue(), [
                '    /*',
                '     * Comment',
                '     * /',
            ].join('\n'));
        });
    });
    test.skip('issue #63388: perserve correct indentation on tab 2', () => {
        // https://github.com/microsoft/vscode/issues/63388
        const model = createTextModel([
            'switch (something) {',
            '  case 1:',
            '    whatever();',
            '    break;',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(1, 1, 5, 2));
            editor.executeCommands('editor.action.indentLines', TypeOperations.indent(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
            assert.strictEqual(model.getValue(), [
                '    switch (something) {',
                '        case 1:',
                '            whatever();',
                '            break;',
                '    }',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Paste - TypeScript/JavaScript', () => {
    const languageId = Language.TypeScript;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #119225: Do not add extra leading space when pasting JSDoc', () => {
        const model = createTextModel("", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const pasteText = [
                '/**',
                ' * JSDoc',
                ' */',
                'function a() {}'
            ].join('\n');
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 2, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 8, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 1, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 8, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 10, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 11, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 12, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 15, standardTokenType: 0 /* StandardTokenType.Other */ },
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(pasteText, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(1, 1, 4, 16));
            assert.strictEqual(model.getValue(), pasteText);
        });
    });
    test('issue #167299: Blank line removes indent', () => {
        const model = createTextModel("", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            // no need for tokenization because there are no comments
            const pasteText = [
                '',
                'export type IncludeReference =',
                '	| BaseReference',
                '	| SelfReference',
                '	| RelativeReference;',
                '',
                'export const enum IncludeReferenceKind {',
                '	Base,',
                '	Self,',
                '	RelativeReference,',
                '}'
            ].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(pasteText, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(1, 1, 11, 2));
            assert.strictEqual(model.getValue(), pasteText);
        });
    });
    test('issue #29803: do not indent when pasting text with only one line', () => {
        // https://github.com/microsoft/vscode/issues/29803
        const model = createTextModel([
            'const linkHandler = new Class(a, b, c,',
            '    d)'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(2, 6, 2, 6));
            const text = ', null';
            viewModel.paste(text, true, undefined, 'keyboard');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            autoIndentOnPasteController.trigger(new Range(2, 6, 2, 11));
            assert.strictEqual(model.getValue(), [
                'const linkHandler = new Class(a, b, c,',
                '    d, null)'
            ].join('\n'));
        });
    });
    test('issue #29753: incorrect indentation after comment', () => {
        // https://github.com/microsoft/vscode/issues/29753
        const model = createTextModel([
            'class A {',
            '    /**',
            '     * used only for debug purposes.',
            '     */',
            '    private _codeInfo: KeyMapping[];',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(5, 24, 5, 34));
            const text = 'IMacLinuxKeyMapping';
            viewModel.paste(text, true, undefined, 'keyboard');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            autoIndentOnPasteController.trigger(new Range(5, 24, 5, 43));
            assert.strictEqual(model.getValue(), [
                'class A {',
                '    /**',
                '     * used only for debug purposes.',
                '     */',
                '    private _codeInfo: IMacLinuxKeyMapping[];',
                '}',
            ].join('\n'));
        });
    });
    test('issue #29753: incorrect indentation of header comment', () => {
        // https://github.com/microsoft/vscode/issues/29753
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const text = [
                '/*----------------',
                ' *  Copyright (c) ',
                ' *  Licensed under ...',
                ' *-----------------*/',
            ].join('\n');
            viewModel.paste(text, true, undefined, 'keyboard');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            autoIndentOnPasteController.trigger(new Range(1, 1, 4, 22));
            assert.strictEqual(model.getValue(), text);
        });
    });
    test('issue #209859: do not do change indentation when pasted inside of a string', () => {
        // issue: https://github.com/microsoft/vscode/issues/209859
        // issue: https://github.com/microsoft/vscode/issues/209418
        const initialText = [
            'const foo = "some text',
            '         which is strangely',
            '    indented"'
        ].join('\n');
        const model = createTextModel(initialText, languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 12, standardTokenType: 2 /* StandardTokenType.String */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ },
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            editor.setSelection(new Selection(2, 10, 2, 15));
            viewModel.paste('which', true, undefined, 'keyboard');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            autoIndentOnPasteController.trigger(new Range(2, 1, 2, 28));
            assert.strictEqual(model.getValue(), initialText);
        });
    });
    // Failing tests found in issues...
    test.skip('issue #181065: Incorrect paste of object within comment', () => {
        // https://github.com/microsoft/vscode/issues/181065
        const model = createTextModel("", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const text = [
                '/**',
                ' * @typedef {',
                ' * }',
                ' */'
            ].join('\n');
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 2, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 11, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 12, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 2, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 3, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 4, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 1, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 0 /* StandardTokenType.Other */ },
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(1, 1, 4, 4));
            assert.strictEqual(model.getValue(), text);
        });
    });
    test.skip('issue #86301: preserve cursor at inserted indentation level', () => {
        // https://github.com/microsoft/vscode/issues/86301
        const model = createTextModel([
            '() => {',
            '',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(2, 1, 2, 1));
            const text = [
                '() => {',
                '',
                '}',
                ''
            ].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(2, 1, 5, 1));
            // notes:
            // why is line 3 not indented to the same level as line 2?
            // looks like the indentation is inserted correctly at line 5, but the cursor does not appear at the maximum indentation level?
            assert.strictEqual(model.getValue(), [
                '() => {',
                '    () => {',
                '    ', // <- should also be indented
                '    }',
                '    ', // <- cursor should be at the end of the indentation
                '}',
            ].join('\n'));
            const selection = viewModel.getSelection();
            assert.deepStrictEqual(selection, new Selection(5, 5, 5, 5));
        });
    });
    test.skip('issue #85781: indent line with extra white space', () => {
        // https://github.com/microsoft/vscode/issues/85781
        // note: still to determine whether this is a bug or not
        const model = createTextModel([
            '() => {',
            '    console.log("a");',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(2, 5, 2, 5));
            const text = [
                '() => {',
                '    console.log("b")',
                '}',
                ' '
            ].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            // todo@aiday-mar, make sure range is correct, and make test work as in real life
            autoIndentOnPasteController.trigger(new Range(2, 5, 5, 6));
            assert.strictEqual(model.getValue(), [
                '() => {',
                '    () => {',
                '        console.log("b")',
                '    }',
                '    console.log("a");',
                '}',
            ].join('\n'));
        });
    });
    test.skip('issue #29589: incorrect indentation of closing brace on paste', () => {
        // https://github.com/microsoft/vscode/issues/29589
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(2, 5, 2, 5));
            const text = [
                'function makeSub(a,b) {',
                'subsent = sent.substring(a,b);',
                'return subsent;',
                '}',
            ].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            // todo@aiday-mar, make sure range is correct, and make test work as in real life
            autoIndentOnPasteController.trigger(new Range(1, 1, 4, 2));
            assert.strictEqual(model.getValue(), [
                'function makeSub(a,b) {',
                'subsent = sent.substring(a,b);',
                'return subsent;',
                '}',
            ].join('\n'));
        });
    });
    test.skip('issue #201420: incorrect indentation when first line is comment', () => {
        // https://github.com/microsoft/vscode/issues/201420
        const model = createTextModel([
            'function bar() {',
            '',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 8, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 12, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 15, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 16, standardTokenType: 0 /* StandardTokenType.Other */ }
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 2, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 10, standardTokenType: 1 /* StandardTokenType.Comment */ }
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 5, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 6, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 10, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 11, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 12, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ }
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 1, standardTokenType: 0 /* StandardTokenType.Other */ }
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            editor.setSelection(new Selection(2, 1, 2, 1));
            const text = [
                '// comment',
                'const foo = 42',
            ].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(2, 1, 3, 15));
            assert.strictEqual(model.getValue(), [
                'function bar() {',
                '    // comment',
                '    const foo = 42',
                '}',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Type - TypeScript/JavaScript', () => {
    const languageId = Language.TypeScript;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // Failing tests from issues...
    test('issue #208215: indent after arrow function', () => {
        // https://github.com/microsoft/vscode/issues/208215
        const model = createTextModel("", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            viewModel.type('const add1 = (n) =>');
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'const add1 = (n) =>',
                '    ',
            ].join('\n'));
        });
    });
    test('issue #208215: indent after arrow function 2', () => {
        // https://github.com/microsoft/vscode/issues/208215
        const model = createTextModel([
            'const array = [1, 2, 3, 4, 5];',
            'array.map(',
            '    v =>',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 9, 3, 9));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'const array = [1, 2, 3, 4, 5];',
                'array.map(',
                '    v =>',
                '        '
            ].join('\n'));
        });
    });
    test('issue #116843: indent after arrow function', () => {
        // https://github.com/microsoft/vscode/issues/116843
        const model = createTextModel("", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            viewModel.type([
                'const add1 = (n) =>',
                '    n + 1;',
            ].join('\n'));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'const add1 = (n) =>',
                '    n + 1;',
                '',
            ].join('\n'));
        });
    });
    test('issue #29755: do not add indentation on enter if indentation is already valid', () => {
        //https://github.com/microsoft/vscode/issues/29755
        const model = createTextModel([
            'function f() {',
            '    const one = 1;',
            '    const two = 2;',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 1, 3, 1));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), [
                'function f() {',
                '    const one = 1;',
                '',
                '    const two = 2;',
                '}',
            ].join('\n'));
        });
    });
    test('issue #36090', () => {
        // https://github.com/microsoft/vscode/issues/36090
        const model = createTextModel([
            'class ItemCtrl {',
            '    getPropertiesByItemId(id) {',
            '        return this.fetchItem(id)',
            '            .then(item => {',
            '                return this.getPropertiesOfItem(item);',
            '            });',
            '    }',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'advanced', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(7, 6, 7, 6));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), [
                'class ItemCtrl {',
                '    getPropertiesByItemId(id) {',
                '        return this.fetchItem(id)',
                '            .then(item => {',
                '                return this.getPropertiesOfItem(item);',
                '            });',
                '    }',
                '    ',
                '}',
            ].join('\n'));
            assert.deepStrictEqual(editor.getSelection(), new Selection(8, 5, 8, 5));
        });
    });
    test('issue #115304: indent block comment onEnter', () => {
        // https://github.com/microsoft/vscode/issues/115304
        const model = createTextModel([
            '/** */',
            'function f() {}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'advanced', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 4, 1, 4));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), [
                '/**',
                ' * ',
                ' */',
                'function f() {}',
            ].join('\n'));
            assert.deepStrictEqual(editor.getSelection(), new Selection(2, 4, 2, 4));
        });
    });
    test('issue #43244: indent when lambda arrow function is detected, outdent when end is reached', () => {
        // https://github.com/microsoft/vscode/issues/43244
        const model = createTextModel([
            'const array = [1, 2, 3, 4, 5];',
            'array.map(_)'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 12, 2, 12));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'const array = [1, 2, 3, 4, 5];',
                'array.map(_',
                '    ',
                ')'
            ].join('\n'));
        });
    });
    test('issue #43244: incorrect indentation after if/for/while without braces', () => {
        // https://github.com/microsoft/vscode/issues/43244
        const model = createTextModel([
            'function f() {',
            '    if (condition)',
            '}'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 19, 2, 19));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'function f() {',
                '    if (condition)',
                '        ',
                '}',
            ].join('\n'));
            viewModel.type("return;");
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'function f() {',
                '    if (condition)',
                '        return;',
                '    ',
                '}',
            ].join('\n'));
        });
    });
    test('issue #208232: incorrect indentation inside of comments', () => {
        // https://github.com/microsoft/vscode/issues/208232
        const model = createTextModel([
            '/**',
            'indentation done for {',
            '*/'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [{ startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ }],
                [{ startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ }],
                [{ startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ }]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            editor.setSelection(new Selection(2, 23, 2, 23));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                '/**',
                'indentation done for {',
                '',
                '*/'
            ].join('\n'));
        });
    });
    test('issue #209802: allman style braces in JavaScript', () => {
        // https://github.com/microsoft/vscode/issues/209802
        const model = createTextModel([
            'if (/*condition*/)',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 19, 1, 19));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'if (/*condition*/)',
                '    '
            ].join('\n'));
            viewModel.type("{", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'if (/*condition*/)',
                '{}'
            ].join('\n'));
            editor.setSelection(new Selection(2, 2, 2, 2));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'if (/*condition*/)',
                '{',
                '    ',
                '}'
            ].join('\n'));
        });
    });
    // Failing tests...
    test.skip('issue #43244: indent after equal sign is detected', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // issue: Should indent after an equal sign is detected followed by whitespace characters.
        // This should be outdented when a semi-colon is detected indicating the end of the assignment.
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel([
            'const array ='
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 14, 1, 14));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'const array =',
                '    '
            ].join('\n'));
        });
    });
    test.skip('issue #43244: indent after dot detected after object/array signifying a method call', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // issue: When a dot is written, we should detect that this is a method call and indent accordingly
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel([
            'const array = [1, 2, 3];',
            'array.'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 7, 2, 7));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'const array = [1, 2, 3];',
                'array.',
                '    '
            ].join('\n'));
        });
    });
    test.skip('issue #43244: indent after dot detected on a subsequent line after object/array signifying a method call', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // issue: When a dot is written, we should detect that this is a method call and indent accordingly
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel([
            'const array = [1, 2, 3]',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 7, 2, 7));
            viewModel.type("\n", 'keyboard');
            viewModel.type(".");
            assert.strictEqual(model.getValue(), [
                'const array = [1, 2, 3]',
                '    .'
            ].join('\n'));
        });
    });
    test.skip('issue #43244: keep indentation when methods called on object/array', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // Currently passes, but should pass with all the tests above too
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel([
            'const array = [1, 2, 3]',
            '    .filter(() => true)'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 24, 2, 24));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'const array = [1, 2, 3]',
                '    .filter(() => true)',
                '    '
            ].join('\n'));
        });
    });
    test.skip('issue #43244: keep indentation when chained methods called on object/array', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // When the call chain is not finished yet, and we type a dot, we do not want to change the indentation
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel([
            'const array = [1, 2, 3]',
            '    .filter(() => true)',
            '    '
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 5, 3, 5));
            viewModel.type(".");
            assert.strictEqual(model.getValue(), [
                'const array = [1, 2, 3]',
                '    .filter(() => true)',
                '    .' // here we don't want to increase the indentation because we have chained methods
            ].join('\n'));
        });
    });
    test.skip('issue #43244: outdent when a semi-color is detected indicating the end of the assignment', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel([
            'const array = [1, 2, 3]',
            '    .filter(() => true);'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 25, 2, 25));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'const array = [1, 2, 3]',
                '    .filter(() => true);',
                ''
            ].join('\n'));
        });
    });
    test.skip('issue #40115: keep indentation when added', () => {
        // https://github.com/microsoft/vscode/issues/40115
        const model = createTextModel('function foo() {}', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 17, 1, 17));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'function foo() {',
                '    ',
                '}',
            ].join('\n'));
            editor.setSelection(new Selection(2, 5, 2, 5));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'function foo() {',
                '    ',
                '    ',
                '}',
            ].join('\n'));
        });
    });
    test.skip('issue #193875: incorrect indentation on enter', () => {
        // https://github.com/microsoft/vscode/issues/193875
        const model = createTextModel([
            '{',
            '    for(;;)',
            '    for(;;) {}',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 14, 3, 14));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                '{',
                '    for(;;)',
                '    for(;;) {',
                '        ',
                '    }',
                '}',
            ].join('\n'));
        });
    });
    test.skip('issue #67678: indent on typing curly brace', () => {
        // https://github.com/microsoft/vscode/issues/67678
        const model = createTextModel([
            'if (true) {',
            'console.log("a")',
            'console.log("b")',
            '',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(4, 1, 4, 1));
            viewModel.type("}", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'if (true) {',
                '    console.log("a")',
                '    console.log("b")',
                '}',
            ].join('\n'));
        });
    });
    test.skip('issue #46401: outdent when encountering bracket on line - allman style indentation', () => {
        // https://github.com/microsoft/vscode/issues/46401
        const model = createTextModel([
            'if (true)',
            '    ',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 5, 2, 5));
            viewModel.type("{}", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'if (true)',
                '{}',
            ].join('\n'));
            editor.setSelection(new Selection(2, 2, 2, 2));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'if (true)',
                '{',
                '    ',
                '}'
            ].join('\n'));
        });
    });
    test.skip('issue #125261: typing closing brace does not keep the current indentation', () => {
        // https://github.com/microsoft/vscode/issues/125261
        const model = createTextModel([
            'foo {',
            '    ',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "keep", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 5, 2, 5));
            viewModel.type("}", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'foo {',
                '}',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Type - Ruby', () => {
    const languageId = Language.Ruby;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #198350: in or when incorrectly match non keywords for Ruby', () => {
        // https://github.com/microsoft/vscode/issues/198350
        const model = createTextModel("", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            viewModel.type("def foo\n        i");
            viewModel.type("n", 'keyboard');
            assert.strictEqual(model.getValue(), "def foo\n        in");
            viewModel.type(" ", 'keyboard');
            assert.strictEqual(model.getValue(), "def foo\nin ");
            viewModel.model.setValue("");
            viewModel.type("  # in");
            assert.strictEqual(model.getValue(), "  # in");
            viewModel.type(" ", 'keyboard');
            assert.strictEqual(model.getValue(), "  # in ");
        });
    });
    // Failing tests...
    test.skip('issue #199846: in or when incorrectly match non keywords for Ruby', () => {
        // https://github.com/microsoft/vscode/issues/199846
        // explanation: happening because the # is detected probably as a comment
        const model = createTextModel("", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            viewModel.type("method('#foo') do");
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                "method('#foo') do",
                "    "
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Type - PHP', () => {
    const languageId = Language.PHP;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #199050: should not indent after { detected in a string', () => {
        // https://github.com/microsoft/vscode/issues/199050
        const model = createTextModel("preg_replace('{');", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 13, standardTokenType: 2 /* StandardTokenType.String */ },
                    { startIndex: 16, standardTokenType: 0 /* StandardTokenType.Other */ },
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            editor.setSelection(new Selection(1, 54, 1, 54));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                "preg_replace('{');",
                ""
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Paste - Go', () => {
    const languageId = Language.Go;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #199050: should not indent after { detected in a string', () => {
        // https://github.com/microsoft/vscode/issues/199050
        const model = createTextModel([
            'var s = `',
            'quick  brown',
            'fox',
            '`',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 1, 3, 1));
            const text = '  ';
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(3, 1, 3, 3));
            assert.strictEqual(model.getValue(), [
                'var s = `',
                'quick  brown',
                '  fox',
                '`',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Type - CPP', () => {
    const languageId = Language.CPP;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #178334: incorrect outdent of } when signature spans multiple lines', () => {
        // https://github.com/microsoft/vscode/issues/178334
        const model = createTextModel([
            'int WINAPI WinMain(bool instance,',
            '    int nshowcmd) {}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 20, 2, 20));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'int WINAPI WinMain(bool instance,',
                '    int nshowcmd) {',
                '    ',
                '}'
            ].join('\n'));
        });
    });
    test.skip('issue #118929: incorrect indent when // follows curly brace', () => {
        // https://github.com/microsoft/vscode/issues/118929
        const model = createTextModel([
            'if (true) { // jaja',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 20, 1, 20));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'if (true) { // jaja',
                '    ',
                '}',
            ].join('\n'));
        });
    });
    test.skip('issue #111265: auto indentation set to "none" still changes the indentation', () => {
        // https://github.com/microsoft/vscode/issues/111265
        const model = createTextModel([
            'int func() {',
            '		',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "none", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 3, 2, 3));
            viewModel.type("}", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'int func() {',
                '		}',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Type - HTML', () => {
    const languageId = Language.HTML;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #61510: incorrect indentation after // in html file', () => {
        // https://github.com/microsoft/vscode/issues/178334
        const model = createTextModel([
            '<pre>',
            '  foo //I press <Enter> at the end of this line',
            '</pre>',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 48, 2, 48));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                '<pre>',
                '  foo //I press <Enter> at the end of this line',
                '  ',
                '</pre>',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Type - Visual Basic', () => {
    const languageId = Language.VB;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #118932: no indentation in visual basic files', () => {
        // https://github.com/microsoft/vscode/issues/118932
        const model = createTextModel([
            'if True then',
            '    Some code',
            '    end i',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(3, 10, 3, 10));
            viewModel.type("f", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'if True then',
                '    Some code',
                'end if',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Type - Latex', () => {
    const languageId = Language.Latex;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #178075: no auto closing pair when indentation done', () => {
        // https://github.com/microsoft/vscode/issues/178075
        const model = createTextModel([
            '\\begin{theorem}',
            '    \\end',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 9, 2, 9));
            viewModel.type("{", 'keyboard');
            assert.strictEqual(model.getValue(), [
                '\\begin{theorem}',
                '\\end{}',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Type - Lua', () => {
    const languageId = Language.Lua;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #178075: no auto closing pair when indentation done', () => {
        // https://github.com/microsoft/vscode/issues/178075
        const model = createTextModel([
            'print("asdf function asdf")',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 28, 1, 28));
            viewModel.type("\n", 'keyboard');
            assert.strictEqual(model.getValue(), [
                'print("asdf function asdf")',
                ''
            ].join('\n'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2luZGVudGF0aW9uL3Rlc3QvYnJvd3Nlci9pbmRlbnRhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUFFLHlCQUF5QixFQUFnQyxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsMEJBQTBCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLDBCQUEwQixFQUFFLHFCQUFxQixFQUFFLG1CQUFt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QUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtpQkFDL0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtpQkFDL0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtpQkFDN0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDN0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDN0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDN0QsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtpQkFDOUQ7YUFDRCxDQUFDO1lBQ0YsV0FB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