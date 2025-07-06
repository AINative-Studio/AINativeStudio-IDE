/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { getReindentEditOperations } from '../../../../../editor/contrib/indentation/common/indentation.js';
import { createModelServices, instantiateTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { LanguageConfigurationFileHandler } from '../../common/languageConfigurationExtensionPoint.js';
import { parse } from '../../../../../base/common/json.js';
import { trimTrailingWhitespace } from '../../../../../editor/common/commands/trimTrailingWhitespaceCommand.js';
import { execSync } from 'child_process';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../../../editor/common/languages.js';
import { NullState } from '../../../../../editor/common/languages/nullTokenize.js';
import { FileAccess } from '../../../../../base/common/network.js';
function getIRange(range) {
    return {
        startLineNumber: range.startLineNumber,
        startColumn: range.startColumn,
        endLineNumber: range.endLineNumber,
        endColumn: range.endColumn
    };
}
var LanguageId;
(function (LanguageId) {
    LanguageId["TypeScript"] = "ts-test";
})(LanguageId || (LanguageId = {}));
function forceTokenizationFromLineToLine(model, startLine, endLine) {
    for (let line = startLine; line <= endLine; line++) {
        model.tokenization.forceTokenization(line);
    }
}
function registerLanguage(instantiationService, languageId) {
    const disposables = new DisposableStore();
    const languageService = instantiationService.get(ILanguageService);
    disposables.add(registerLanguageConfiguration(instantiationService, languageId));
    disposables.add(languageService.registerLanguage({ id: languageId }));
    return disposables;
}
function registerLanguageConfiguration(instantiationService, languageId) {
    const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
    let configPath;
    switch (languageId) {
        case "ts-test" /* LanguageId.TypeScript */:
            configPath = FileAccess.asFileUri('vs/workbench/contrib/codeEditor/test/node/language-configuration.json').fsPath;
            break;
        default:
            throw new Error('Unknown languageId');
    }
    const configContent = fs.readFileSync(configPath, { encoding: 'utf-8' });
    const parsedConfig = parse(configContent, []);
    const languageConfig = LanguageConfigurationFileHandler.extractValidConfig(languageId, parsedConfig);
    return languageConfigurationService.register(languageId, languageConfig);
}
function registerTokenizationSupport(instantiationService, tokens, languageId) {
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
suite('Auto-Reindentation - TypeScript/JavaScript', () => {
    const languageId = "ts-test" /* LanguageId.TypeScript */;
    const options = {};
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        disposables.add(instantiationService);
        disposables.add(registerLanguage(instantiationService, languageId));
        disposables.add(registerLanguageConfiguration(instantiationService, languageId));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // Test which can be ran to find cases of incorrect indentation...
    test.skip('Find Cases of Incorrect Indentation with the Reindent Lines Command', () => {
        // ./scripts/test.sh --inspect --grep='Find Cases of Incorrect Indentation with the Reindent Lines Command' --timeout=15000
        function walkDirectoryAndReindent(directory, languageId) {
            const files = fs.readdirSync(directory, { withFileTypes: true });
            const directoriesToRecurseOn = [];
            for (const file of files) {
                if (file.isDirectory()) {
                    directoriesToRecurseOn.push(path.join(directory, file.name));
                }
                else {
                    const filePathName = path.join(directory, file.name);
                    const fileExtension = path.extname(filePathName);
                    if (fileExtension !== '.ts') {
                        continue;
                    }
                    const fileContents = fs.readFileSync(filePathName, { encoding: 'utf-8' });
                    const modelOptions = {
                        tabSize: 4,
                        insertSpaces: false
                    };
                    const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, modelOptions));
                    const lineCount = model.getLineCount();
                    const editOperations = [];
                    for (let line = 1; line <= lineCount - 1; line++) {
                        /*
                        NOTE: Uncomment in order to ignore incorrect JS DOC indentation
                        const lineContent = model.getLineContent(line);
                        const trimmedLineContent = lineContent.trim();
                        if (trimmedLineContent.length === 0 || trimmedLineContent.startsWith('*') || trimmedLineContent.startsWith('/*')) {
                            continue;
                        }
                        */
                        const lineContent = model.getLineContent(line);
                        const trimmedLineContent = lineContent.trim();
                        if (trimmedLineContent.length === 0) {
                            continue;
                        }
                        const editOperation = getReindentEditOperations(model, languageConfigurationService, line, line + 1);
                        /*
                        NOTE: Uncomment in order to see actual incorrect indentation diff
                        model.applyEdits(editOperation);
                        */
                        editOperations.push(...editOperation);
                    }
                    model.applyEdits(editOperations);
                    model.applyEdits(trimTrailingWhitespace(model, [], true));
                    fs.writeFileSync(filePathName, model.getValue());
                }
            }
            for (const directory of directoriesToRecurseOn) {
                walkDirectoryAndReindent(directory, languageId);
            }
        }
        walkDirectoryAndReindent('/Users/aiday/Desktop/Test/vscode-test', 'ts-test');
        const output = execSync('cd /Users/aiday/Desktop/Test/vscode-test && git diff --shortstat', { encoding: 'utf-8' });
        console.log('\ngit diff --shortstat:\n', output);
    });
    // Unit tests for increase and decrease indent patterns...
    /**
     * First increase indent and decrease indent patterns:
     *
     * - decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/
     *  - In (https://macromates.com/manual/en/appendix)
     * 	  Either we have white space before the closing bracket, or we have a multi line comment ending on that line followed by whitespaces
     *    This is followed by any character.
     *    Textmate decrease indent pattern is as follows: /^(.*\*\/)?\s*\}[;\s]*$/
     *    Presumably allowing multi line comments ending on that line implies that } is itself not part of a multi line comment
     *
     * - increaseIndentPattern: /^.*\{[^}"']*$/
     *  - In (https://macromates.com/manual/en/appendix)
     *    This regex means that we increase the indent when we have any characters followed by the opening brace, followed by characters
     *    except for closing brace }, double quotes " or single quote '.
     *    The } is checked in order to avoid the indentation in the following case `int arr[] = { 1, 2, 3 };`
     *    The double quote and single quote are checked in order to avoid the indentation in the following case: str = "foo {";
     */
    test('Issue #25437', () => {
        // issue: https://github.com/microsoft/vscode/issues/25437
        // fix: https://github.com/microsoft/vscode/commit/8c82a6c6158574e098561c28d470711f1b484fc8
        // explanation: var foo = `{`; should not increase indentation
        // increaseIndentPattern: /^.*\{[^}"']*$/ -> /^.*\{[^}"'`]*$/
        const fileContents = [
            'const foo = `{`;',
            '    ',
        ].join('\n');
        const tokens = [
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 5, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 6, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 10, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 11, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 12, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 13, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 14, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 15, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 16, standardTokenType: 0 /* StandardTokenType.Other */ }
            ],
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 4, standardTokenType: 0 /* StandardTokenType.Other */ }
            ]
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 2);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            "startLineNumber": 2,
            "startColumn": 1,
            "endLineNumber": 2,
            "endColumn": 5,
        });
        assert.deepStrictEqual(operation.text, '');
    });
    test('Enriching the hover', () => {
        // issue: -
        // fix: https://github.com/microsoft/vscode/commit/19ae0932c45b1096443a8c1335cf1e02eb99e16d
        // explanation:
        //  - decrease indent on ) and ] also
        //  - increase indent on ( and [ also
        // decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/ -> /^(.*\*\/)?\s*[\}\]\)].*$/
        // increaseIndentPattern: /^.*\{[^}"'`]*$/ -> /^.*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/
        let fileContents = [
            'function foo(',
            '    bar: string',
            '    ){}',
        ].join('\n');
        let model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        let editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        let operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            "startLineNumber": 3,
            "startColumn": 1,
            "endLineNumber": 3,
            "endColumn": 5,
        });
        assert.deepStrictEqual(operation.text, '');
        fileContents = [
            'function foo(',
            'bar: string',
            '){}',
        ].join('\n');
        model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            "startLineNumber": 2,
            "startColumn": 1,
            "endLineNumber": 2,
            "endColumn": 1,
        });
        assert.deepStrictEqual(operation.text, '    ');
    });
    test('Issue #86176', () => {
        // issue: https://github.com/microsoft/vscode/issues/86176
        // fix: https://github.com/microsoft/vscode/commit/d89e2e17a5d1ba37c99b1d3929eb6180a5bfc7a8
        // explanation: When quotation marks are present on the first line of an if statement or for loop, following line should not be indented
        // increaseIndentPattern: /^((?!\/\/).)*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/ -> /^((?!\/\/).)*(\{([^}"'`]*|(\t|[ ])*\/\/.*)|\([^)"'`]*|\[[^\]"'`]*)$/
        // explanation: after open brace, do not decrease indent if it is followed on the same line by "<whitespace characters> // <any characters>"
        // todo@aiday-mar: should also apply for when it follows ( and [
        const fileContents = [
            `if () { // '`,
            `x = 4`,
            `}`
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            "startLineNumber": 2,
            "startColumn": 1,
            "endLineNumber": 2,
            "endColumn": 1,
        });
        assert.deepStrictEqual(operation.text, '    ');
    });
    test('Issue #141816', () => {
        // issue: https://github.com/microsoft/vscode/issues/141816
        // fix: https://github.com/microsoft/vscode/pull/141997/files
        // explanation: if (, [, {, is followed by a forward slash then assume we are in a regex pattern, and do not indent
        // increaseIndentPattern: /^((?!\/\/).)*(\{([^}"'`]*|(\t|[ ])*\/\/.*)|\([^)"'`]*|\[[^\]"'`]*)$/ -> /^((?!\/\/).)*(\{([^}"'`/]*|(\t|[ ])*\/\/.*)|\([^)"'`/]*|\[[^\]"'`/]*)$/
        // -> Final current increase indent pattern at of writing
        const fileContents = [
            'const r = /{/;',
            '   ',
        ].join('\n');
        const tokens = [
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 5, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 6, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 7, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 8, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 9, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 10, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 11, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 12, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ }
            ],
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 4, standardTokenType: 0 /* StandardTokenType.Other */ }
            ]
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 2);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            "startLineNumber": 2,
            "startColumn": 1,
            "endLineNumber": 2,
            "endColumn": 4,
        });
        assert.deepStrictEqual(operation.text, '');
    });
    test('Issue #29886', () => {
        // issue: https://github.com/microsoft/vscode/issues/29886
        // fix: https://github.com/microsoft/vscode/commit/7910b3d7bab8a721aae98dc05af0b5e1ea9d9782
        // decreaseIndentPattern: /^(.*\*\/)?\s*[\}\]\)].*$/ -> /^((?!.*?\/\*).*\*\/)?\s*[\}\]\)].*$/
        // -> Final current decrease indent pattern at the time of writing
        // explanation: Positive lookahead: (?= «pattern») matches if pattern matches what comes after the current location in the input string.
        // Negative lookahead: (?! «pattern») matches if pattern does not match what comes after the current location in the input string
        // The change proposed is to not decrease the indent if there is a multi-line comment ending on the same line before the closing parentheses
        const fileContents = [
            'function foo() {',
            '    bar(/*  */)',
            '};',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test('Issue #209859: do not do reindentation for tokens inside of a string', () => {
        // issue: https://github.com/microsoft/vscode/issues/209859
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
            ],
            [
                { startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ },
            ]
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const fileContents = [
            'const foo = `some text',
            '         which is strangely',
            '    indented. It should',
            '   not be reindented.`'
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 4);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    // Failing tests inferred from the current regexes...
    test.skip('Incorrect deindentation after `*/}` string', () => {
        // explanation: If */ was not before the }, the regex does not allow characters before the }, so there would not be an indent
        // Here since there is */ before the }, the regex allows all the characters before, hence there is a deindent
        const fileContents = [
            `const obj = {`,
            `    obj1: {`,
            `        brace : '*/}'`,
            `    }`,
            `}`,
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    // Failing tests from issues...
    test.skip('Issue #56275', () => {
        // issue: https://github.com/microsoft/vscode/issues/56275
        // explanation: If */ was not before the }, the regex does not allow characters before the }, so there would not be an indent
        // Here since there is */ before the }, the regex allows all the characters before, hence there is a deindent
        let fileContents = [
            'function foo() {',
            '    var bar = (/b*/);',
            '}',
        ].join('\n');
        let model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        let editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
        fileContents = [
            'function foo() {',
            '    var bar = "/b*/)";',
            '}',
        ].join('\n');
        model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue #116843', () => {
        // issue: https://github.com/microsoft/vscode/issues/116843
        // related: https://github.com/microsoft/vscode/issues/43244
        // explanation: When you have an arrow function, you don't have { or }, but you would expect indentation to still be done in that way
        // TODO: requires exploring indent/outdent pairs instead
        const fileContents = [
            'const add1 = (n) =>',
            '	n + 1;',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue #185252', () => {
        // issue: https://github.com/microsoft/vscode/issues/185252
        // explanation: Reindenting the comment correctly
        const fileContents = [
            '/*',
            ' * This is a comment.',
            ' */',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue 43244: incorrect indentation when signature of function call spans several lines', () => {
        // issue: https://github.com/microsoft/vscode/issues/43244
        const fileContents = [
            'function callSomeOtherFunction(one: number, two: number) { }',
            'function someFunction() {',
            '    callSomeOtherFunction(4,',
            '        5)',
            '}',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2luZGVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL3Rlc3Qvbm9kZS9hdXRvaW5kZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUN4SCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM1RyxPQUFPLEVBQW9DLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFakosT0FBTyxFQUEwQixnQ0FBZ0MsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9ILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUczRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUNoSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx5QkFBeUIsRUFBZ0Msb0JBQW9CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMxSSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFH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