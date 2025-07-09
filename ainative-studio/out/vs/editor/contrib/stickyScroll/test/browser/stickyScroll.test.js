/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { withAsyncTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { StickyScrollController } from '../../browser/stickyScrollController.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { StickyLineCandidate, StickyLineCandidateProvider } from '../../browser/stickyScrollProvider.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from '../../../../common/services/languageFeatureDebounce.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Sticky Scroll Tests', () => {
    const disposables = new DisposableStore();
    const serviceCollection = new ServiceCollection([ILanguageFeaturesService, new LanguageFeaturesService()], [ILogService, new NullLogService()], [IContextMenuService, new class extends mock() {
        }], [ILanguageConfigurationService, new TestLanguageConfigurationService()], [IEnvironmentService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.isBuilt = true;
                this.isExtensionDevelopment = false;
            }
        }], [ILanguageFeatureDebounceService, new SyncDescriptor(LanguageFeatureDebounceService)]);
    const text = [
        'function foo() {',
        '',
        '}',
        '/* comment related to TestClass',
        ' end of the comment */',
        '@classDecorator',
        'class TestClass {',
        '// comment related to the function functionOfClass',
        'functionOfClass(){',
        'function function1(){',
        '}',
        '}}',
        'function bar() { function insideBar() {}',
        '}'
    ].join('\n');
    setup(() => {
        disposables.clear();
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function documentSymbolProviderForTestModel() {
        return {
            provideDocumentSymbols() {
                return [
                    {
                        name: 'foo',
                        detail: 'foo',
                        kind: 11 /* SymbolKind.Function */,
                        tags: [],
                        range: { startLineNumber: 1, endLineNumber: 3, startColumn: 1, endColumn: 1 },
                        selectionRange: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 }
                    },
                    {
                        name: 'TestClass',
                        detail: 'TestClass',
                        kind: 4 /* SymbolKind.Class */,
                        tags: [],
                        range: { startLineNumber: 4, endLineNumber: 12, startColumn: 1, endColumn: 1 },
                        selectionRange: { startLineNumber: 7, endLineNumber: 7, startColumn: 1, endColumn: 1 },
                        children: [
                            {
                                name: 'functionOfClass',
                                detail: 'functionOfClass',
                                kind: 11 /* SymbolKind.Function */,
                                tags: [],
                                range: { startLineNumber: 8, endLineNumber: 12, startColumn: 1, endColumn: 1 },
                                selectionRange: { startLineNumber: 9, endLineNumber: 9, startColumn: 1, endColumn: 1 },
                                children: [
                                    {
                                        name: 'function1',
                                        detail: 'function1',
                                        kind: 11 /* SymbolKind.Function */,
                                        tags: [],
                                        range: { startLineNumber: 10, endLineNumber: 11, startColumn: 1, endColumn: 1 },
                                        selectionRange: { startLineNumber: 10, endLineNumber: 10, startColumn: 1, endColumn: 1 },
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'bar',
                        detail: 'bar',
                        kind: 11 /* SymbolKind.Function */,
                        tags: [],
                        range: { startLineNumber: 13, endLineNumber: 14, startColumn: 1, endColumn: 1 },
                        selectionRange: { startLineNumber: 13, endLineNumber: 13, startColumn: 1, endColumn: 1 },
                        children: [
                            {
                                name: 'insideBar',
                                detail: 'insideBar',
                                kind: 11 /* SymbolKind.Function */,
                                tags: [],
                                range: { startLineNumber: 13, endLineNumber: 13, startColumn: 1, endColumn: 1 },
                                selectionRange: { startLineNumber: 13, endLineNumber: 13, startColumn: 1, endColumn: 1 },
                            }
                        ]
                    }
                ];
            }
        };
    }
    test('Testing the function getCandidateStickyLinesIntersecting', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model = createTextModel(text);
            await withAsyncTestCodeEditor(model, {
                stickyScroll: {
                    enabled: true,
                    maxLineCount: 5,
                    defaultModel: 'outlineModel'
                },
                envConfig: {
                    outerHeight: 500
                },
                serviceCollection: serviceCollection
            }, async (editor, _viewModel, instantiationService) => {
                const languageService = instantiationService.get(ILanguageFeaturesService);
                const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
                disposables.add(languageService.documentSymbolProvider.register('*', documentSymbolProviderForTestModel()));
                const provider = new StickyLineCandidateProvider(editor, languageService, languageConfigurationService);
                await provider.update();
                assert.deepStrictEqual(provider.getCandidateStickyLinesIntersecting({ startLineNumber: 1, endLineNumber: 4 }), [new StickyLineCandidate(1, 2, 0, 19)]);
                assert.deepStrictEqual(provider.getCandidateStickyLinesIntersecting({ startLineNumber: 8, endLineNumber: 10 }), [new StickyLineCandidate(7, 11, 0, 19), new StickyLineCandidate(9, 11, 19, 19), new StickyLineCandidate(10, 10, 38, 19)]);
                assert.deepStrictEqual(provider.getCandidateStickyLinesIntersecting({ startLineNumber: 10, endLineNumber: 13 }), [new StickyLineCandidate(7, 11, 0, 19), new StickyLineCandidate(9, 11, 19, 19), new StickyLineCandidate(10, 10, 38, 19)]);
                provider.dispose();
                model.dispose();
            });
        });
    });
    test('issue #157180: Render the correct line corresponding to the scope definition', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model = createTextModel(text);
            await withAsyncTestCodeEditor(model, {
                stickyScroll: {
                    enabled: true,
                    maxLineCount: 5,
                    defaultModel: 'outlineModel'
                },
                envConfig: {
                    outerHeight: 500
                },
                serviceCollection
            }, async (editor, _viewModel, instantiationService) => {
                const stickyScrollController = editor.registerAndInstantiateContribution(StickyScrollController.ID, StickyScrollController);
                const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                const languageService = instantiationService.get(ILanguageFeaturesService);
                disposables.add(languageService.documentSymbolProvider.register('*', documentSymbolProviderForTestModel()));
                await stickyScrollController.stickyScrollCandidateProvider.update();
                let state;
                editor.setScrollTop(1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(4 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, []);
                editor.setScrollTop(8 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7, 9]);
                editor.setScrollTop(9 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7, 9]);
                editor.setScrollTop(10 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7]);
                stickyScrollController.dispose();
                stickyScrollController.stickyScrollCandidateProvider.dispose();
                model.dispose();
            });
        });
    });
    test('issue #156268 : Do not reveal sticky lines when they are in a folded region ', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model = createTextModel(text);
            await withAsyncTestCodeEditor(model, {
                stickyScroll: {
                    enabled: true,
                    maxLineCount: 5,
                    defaultModel: 'outlineModel'
                },
                envConfig: {
                    outerHeight: 500
                },
                serviceCollection
            }, async (editor, viewModel, instantiationService) => {
                const stickyScrollController = editor.registerAndInstantiateContribution(StickyScrollController.ID, StickyScrollController);
                const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                const languageService = instantiationService.get(ILanguageFeaturesService);
                disposables.add(languageService.documentSymbolProvider.register('*', documentSymbolProviderForTestModel()));
                await stickyScrollController.stickyScrollCandidateProvider.update();
                editor.setHiddenAreas([{ startLineNumber: 2, endLineNumber: 2, startColumn: 1, endColumn: 1 }, { startLineNumber: 10, endLineNumber: 11, startColumn: 1, endColumn: 1 }]);
                let state;
                editor.setScrollTop(1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, []);
                editor.setScrollTop(6 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7, 9]);
                editor.setScrollTop(7 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7]);
                editor.setScrollTop(10 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, []);
                stickyScrollController.dispose();
                stickyScrollController.stickyScrollCandidateProvider.dispose();
                model.dispose();
            });
        });
    });
    const textWithScopesWithSameStartingLines = [
        'class TestClass { foo() {',
        'function bar(){',
        '',
        '}}',
        '}',
        ''
    ].join('\n');
    function documentSymbolProviderForSecondTestModel() {
        return {
            provideDocumentSymbols() {
                return [
                    {
                        name: 'TestClass',
                        detail: 'TestClass',
                        kind: 4 /* SymbolKind.Class */,
                        tags: [],
                        range: { startLineNumber: 1, endLineNumber: 5, startColumn: 1, endColumn: 1 },
                        selectionRange: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 },
                        children: [
                            {
                                name: 'foo',
                                detail: 'foo',
                                kind: 11 /* SymbolKind.Function */,
                                tags: [],
                                range: { startLineNumber: 1, endLineNumber: 4, startColumn: 1, endColumn: 1 },
                                selectionRange: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 },
                                children: [
                                    {
                                        name: 'bar',
                                        detail: 'bar',
                                        kind: 11 /* SymbolKind.Function */,
                                        tags: [],
                                        range: { startLineNumber: 2, endLineNumber: 4, startColumn: 1, endColumn: 1 },
                                        selectionRange: { startLineNumber: 2, endLineNumber: 2, startColumn: 1, endColumn: 1 },
                                        children: []
                                    }
                                ]
                            },
                        ]
                    }
                ];
            }
        };
    }
    test('issue #159271 : render the correct widget state when the child scope starts on the same line as the parent scope', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model = createTextModel(textWithScopesWithSameStartingLines);
            await withAsyncTestCodeEditor(model, {
                stickyScroll: {
                    enabled: true,
                    maxLineCount: 5,
                    defaultModel: 'outlineModel'
                },
                envConfig: {
                    outerHeight: 500
                },
                serviceCollection
            }, async (editor, _viewModel, instantiationService) => {
                const stickyScrollController = editor.registerAndInstantiateContribution(StickyScrollController.ID, StickyScrollController);
                await stickyScrollController.stickyScrollCandidateProvider.update();
                const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                const languageService = instantiationService.get(ILanguageFeaturesService);
                disposables.add(languageService.documentSymbolProvider.register('*', documentSymbolProviderForSecondTestModel()));
                await stickyScrollController.stickyScrollCandidateProvider.update();
                let state;
                editor.setScrollTop(1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1, 2]);
                editor.setScrollTop(lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1, 2]);
                editor.setScrollTop(2 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(3 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(4 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, []);
                stickyScrollController.dispose();
                stickyScrollController.stickyScrollCandidateProvider.dispose();
                model.dispose();
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3RpY2t5U2Nyb2xsL3Rlc3QvYnJvd3Nlci9zdGlja3lTY3JvbGwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRWpHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXpHLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3JILE9BQU8sRUFBRSxj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