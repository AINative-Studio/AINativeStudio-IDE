/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { IndentationContextProcessor, ProcessedIndentRulesSupport } from '../../../../common/languages/supports/indentationLineProcessor.js';
import { Language, registerLanguage, registerLanguageConfiguration, registerTokenizationSupport } from './indentation.test.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { Range } from '../../../../common/core/range.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { LanguageService } from '../../../../common/services/languageService.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { ILanguageService } from '../../../../common/languages/language.js';
suite('Indentation Context Processor - TypeScript/JavaScript', () => {
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
    test('brackets inside of string', () => {
        const model = createTextModel([
            'const someVar = "{some text}"',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [[
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 16, standardTokenType: 2 /* StandardTokenType.String */ },
                    { startIndex: 28, standardTokenType: 2 /* StandardTokenType.String */ }
                ]];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
            const processedContext = indentationContextProcessor.getProcessedTokenContextAroundRange(new Range(1, 23, 1, 23));
            assert.strictEqual(processedContext.beforeRangeProcessedTokens.getLineContent(), 'const someVar = "some');
            assert.strictEqual(processedContext.afterRangeProcessedTokens.getLineContent(), ' text"');
            assert.strictEqual(processedContext.previousLineProcessedTokens.getLineContent(), '');
        });
    });
    test('brackets inside of comment', () => {
        const model = createTextModel([
            'const someVar2 = /*(a])*/',
            'const someVar = /* [()] some other t{e}xt() */ "some text"',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 17, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 16, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 46, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 47, standardTokenType: 2 /* StandardTokenType.String */ }
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
            const processedContext = indentationContextProcessor.getProcessedTokenContextAroundRange(new Range(2, 29, 2, 35));
            assert.strictEqual(processedContext.beforeRangeProcessedTokens.getLineContent(), 'const someVar = /*  some');
            assert.strictEqual(processedContext.afterRangeProcessedTokens.getLineContent(), ' text */ "some text"');
            assert.strictEqual(processedContext.previousLineProcessedTokens.getLineContent(), 'const someVar2 = /*a*/');
        });
    });
    test('brackets inside of regex', () => {
        const model = createTextModel([
            'const someRegex2 = /(()))]/;',
            'const someRegex = /()a{h}{s}[(a}87(9a9()))]/;',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 19, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                    { startIndex: 27, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 18, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                    { startIndex: 44, standardTokenType: 0 /* StandardTokenType.Other */ },
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
            const processedContext = indentationContextProcessor.getProcessedTokenContextAroundRange(new Range(1, 25, 2, 33));
            assert.strictEqual(processedContext.beforeRangeProcessedTokens.getLineContent(), 'const someRegex2 = /');
            assert.strictEqual(processedContext.afterRangeProcessedTokens.getLineContent(), '879a9/;');
            assert.strictEqual(processedContext.previousLineProcessedTokens.getLineContent(), '');
        });
    });
});
suite('Processed Indent Rules Support - TypeScript/JavaScript', () => {
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
    test('should increase', () => {
        const model = createTextModel([
            'const someVar = {',
            'const someVar2 = "{"',
            'const someVar3 = /*{*/'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ }
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 17, standardTokenType: 2 /* StandardTokenType.String */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 17, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
            if (!indentationRulesSupport) {
                assert.fail('indentationRulesSupport should be defined');
            }
            const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentationRulesSupport, languageConfigurationService);
            assert.strictEqual(processedIndentRulesSupport.shouldIncrease(1), true);
            assert.strictEqual(processedIndentRulesSupport.shouldIncrease(2), false);
            assert.strictEqual(processedIndentRulesSupport.shouldIncrease(3), false);
        });
    });
    test('should decrease', () => {
        const model = createTextModel([
            '}',
            '"])some text}"',
            '])*/'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [{ startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ }],
                [{ startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ }],
                [{ startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ }]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
            if (!indentationRulesSupport) {
                assert.fail('indentationRulesSupport should be defined');
            }
            const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentationRulesSupport, languageConfigurationService);
            assert.strictEqual(processedIndentRulesSupport.shouldDecrease(1), true);
            assert.strictEqual(processedIndentRulesSupport.shouldDecrease(2), false);
            assert.strictEqual(processedIndentRulesSupport.shouldDecrease(3), false);
        });
    });
    test('should increase next line', () => {
        const model = createTextModel([
            'if()',
            'const someString = "if()"',
            'const someRegex = /if()/'
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: "full", serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ }
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 19, standardTokenType: 2 /* StandardTokenType.String */ }
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 18, standardTokenType: 3 /* StandardTokenType.RegEx */ }
                ]
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
            if (!indentationRulesSupport) {
                assert.fail('indentationRulesSupport should be defined');
            }
            const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentationRulesSupport, languageConfigurationService);
            assert.strictEqual(processedIndentRulesSupport.shouldIndentNextLine(1), true);
            assert.strictEqual(processedIndentRulesSupport.shouldIndentNextLine(2), false);
            assert.strictEqual(processedIndentRulesSupport.shouldIndentNextLine(3), false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25MaW5lUHJvY2Vzc29yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5kZW50YXRpb24vdGVzdC9icm93c2VyL2luZGVudGF0aW9uTGluZVByb2Nlc3Nvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDOUcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDN0ksT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSwyQkFBMkIsRUFBeUIsTUFBTSx1QkFBdUIsQ0FBQztBQUN0SixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNySCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUU1RSxLQUFLLENBQUMsdURBQXVELEVBQUUs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