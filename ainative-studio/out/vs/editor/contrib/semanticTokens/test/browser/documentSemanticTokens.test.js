/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Barrier, timeout } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { LanguageFeatureDebounceService } from '../../../../common/services/languageFeatureDebounce.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { LanguageService } from '../../../../common/services/languageService.js';
import { ModelService } from '../../../../common/services/modelService.js';
import { SemanticTokensStylingService } from '../../../../common/services/semanticTokensStylingService.js';
import { DocumentSemanticTokensFeature } from '../../browser/documentSemanticTokens.js';
import { getDocumentSemanticTokens, isSemanticTokens } from '../../common/getSemanticTokens.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { TestTextResourcePropertiesService } from '../../../../test/common/services/testTextResourcePropertiesService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { ColorScheme } from '../../../../../platform/theme/common/theme.js';
import { TestColorTheme, TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { UndoRedoService } from '../../../../../platform/undoRedo/common/undoRedoService.js';
suite('ModelSemanticColoring', () => {
    const disposables = new DisposableStore();
    let modelService;
    let languageService;
    let languageFeaturesService;
    setup(() => {
        const configService = new TestConfigurationService({ editor: { semanticHighlighting: true } });
        const themeService = new TestThemeService();
        themeService.setTheme(new TestColorTheme({}, ColorScheme.DARK, true));
        const logService = new NullLogService();
        languageFeaturesService = new LanguageFeaturesService();
        languageService = disposables.add(new LanguageService(false));
        const semanticTokensStylingService = disposables.add(new SemanticTokensStylingService(themeService, logService, languageService));
        const instantiationService = new TestInstantiationService();
        instantiationService.set(ILanguageService, languageService);
        instantiationService.set(ILanguageConfigurationService, new TestLanguageConfigurationService());
        modelService = disposables.add(new ModelService(configService, new TestTextResourcePropertiesService(configService), new UndoRedoService(new TestDialogService(), new TestNotificationService()), instantiationService));
        const envService = new class extends mock() {
            constructor() {
                super(...arguments);
                this.isBuilt = true;
                this.isExtensionDevelopment = false;
            }
        };
        disposables.add(new DocumentSemanticTokensFeature(semanticTokensStylingService, modelService, themeService, configService, new LanguageFeatureDebounceService(logService, envService), languageFeaturesService));
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('DocumentSemanticTokens should be fetched when the result is empty if there are pending changes', async () => {
        await runWithFakedTimers({}, async () => {
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            const inFirstCall = new Barrier();
            const delayFirstResult = new Barrier();
            const secondResultProvided = new Barrier();
            let callCount = 0;
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode', new class {
                getLegend() {
                    return { tokenTypes: ['class'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    callCount++;
                    if (callCount === 1) {
                        assert.ok('called once');
                        inFirstCall.open();
                        await delayFirstResult.wait();
                        await timeout(0); // wait for the simple scheduler to fire to check that we do actually get rescheduled
                        return null;
                    }
                    if (callCount === 2) {
                        assert.ok('called twice');
                        secondResultProvided.open();
                        return null;
                    }
                    assert.fail('Unexpected call');
                }
                releaseDocumentSemanticTokens(resultId) {
                }
            }));
            const textModel = disposables.add(modelService.createModel('Hello world', languageService.createById('testMode')));
            // pretend the text model is attached to an editor (so that semantic tokens are computed)
            textModel.onBeforeAttached();
            // wait for the provider to be called
            await inFirstCall.wait();
            // the provider is now in the provide call
            // change the text buffer while the provider is running
            textModel.applyEdits([{ range: new Range(1, 1, 1, 1), text: 'x' }]);
            // let the provider finish its first result
            delayFirstResult.open();
            // we need to check that the provider is called again, even if it returns null
            await secondResultProvided.wait();
            // assert that it got called twice
            assert.strictEqual(callCount, 2);
        });
    });
    test('issue #149412: VS Code hangs when bad semantic token data is received', async () => {
        await runWithFakedTimers({}, async () => {
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            let lastResult = null;
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode', new class {
                getLegend() {
                    return { tokenTypes: ['class'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    if (!lastResultId) {
                        // this is the first call
                        lastResult = {
                            resultId: '1',
                            data: new Uint32Array([4294967293, 0, 7, 16, 0, 1, 4, 3, 11, 1])
                        };
                    }
                    else {
                        // this is the second call
                        lastResult = {
                            resultId: '2',
                            edits: [{
                                    start: 4294967276,
                                    deleteCount: 0,
                                    data: new Uint32Array([2, 0, 3, 11, 0])
                                }]
                        };
                    }
                    return lastResult;
                }
                releaseDocumentSemanticTokens(resultId) {
                }
            }));
            const textModel = disposables.add(modelService.createModel('', languageService.createById('testMode')));
            // pretend the text model is attached to an editor (so that semantic tokens are computed)
            textModel.onBeforeAttached();
            // wait for the semantic tokens to be fetched
            await Event.toPromise(textModel.onDidChangeTokens);
            assert.strictEqual(lastResult.resultId, '1');
            // edit the text
            textModel.applyEdits([{ range: new Range(1, 1, 1, 1), text: 'foo' }]);
            // wait for the semantic tokens to be fetched again
            await Event.toPromise(textModel.onDidChangeTokens);
            assert.strictEqual(lastResult.resultId, '2');
        });
    });
    test('issue #161573: onDidChangeSemanticTokens doesn\'t consistently trigger provideDocumentSemanticTokens', async () => {
        await runWithFakedTimers({}, async () => {
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            const emitter = new Emitter();
            let requestCount = 0;
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode', new class {
                constructor() {
                    this.onDidChange = emitter.event;
                }
                getLegend() {
                    return { tokenTypes: ['class'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    requestCount++;
                    if (requestCount === 1) {
                        await timeout(1000);
                        // send a change event
                        emitter.fire();
                        await timeout(1000);
                        return null;
                    }
                    return null;
                }
                releaseDocumentSemanticTokens(resultId) {
                }
            }));
            const textModel = disposables.add(modelService.createModel('', languageService.createById('testMode')));
            // pretend the text model is attached to an editor (so that semantic tokens are computed)
            textModel.onBeforeAttached();
            await timeout(5000);
            assert.deepStrictEqual(requestCount, 2);
        });
    });
    test('DocumentSemanticTokens should be pick the token provider with actual items', async () => {
        await runWithFakedTimers({}, async () => {
            let callCount = 0;
            disposables.add(languageService.registerLanguage({ id: 'testMode2' }));
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode2', new class {
                getLegend() {
                    return { tokenTypes: ['class1'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    callCount++;
                    // For a secondary request return a different value
                    if (lastResultId) {
                        return {
                            data: new Uint32Array([2, 1, 1, 1, 1, 0, 2, 1, 1, 1])
                        };
                    }
                    return {
                        resultId: '1',
                        data: new Uint32Array([0, 1, 1, 1, 1, 0, 2, 1, 1, 1])
                    };
                }
                releaseDocumentSemanticTokens(resultId) {
                }
            }));
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode2', new class {
                getLegend() {
                    return { tokenTypes: ['class2'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    callCount++;
                    return null;
                }
                releaseDocumentSemanticTokens(resultId) {
                }
            }));
            function toArr(arr) {
                const result = [];
                for (let i = 0; i < arr.length; i++) {
                    result[i] = arr[i];
                }
                return result;
            }
            const textModel = modelService.createModel('Hello world 2', languageService.createById('testMode2'));
            try {
                let result = await getDocumentSemanticTokens(languageFeaturesService.documentSemanticTokensProvider, textModel, null, null, CancellationToken.None);
                assert.ok(result, `We should have tokens (1)`);
                assert.ok(result.tokens, `Tokens are found from multiple providers (1)`);
                assert.ok(isSemanticTokens(result.tokens), `Tokens are full (1)`);
                assert.ok(result.tokens.resultId, `Token result id found from multiple providers (1)`);
                assert.deepStrictEqual(toArr(result.tokens.data), [0, 1, 1, 1, 1, 0, 2, 1, 1, 1], `Token data returned for multiple providers (1)`);
                assert.deepStrictEqual(callCount, 2, `Called both token providers (1)`);
                assert.deepStrictEqual(result.provider.getLegend(), { tokenTypes: ['class1'], tokenModifiers: [] }, `Legend matches the tokens (1)`);
                // Make a second request. Make sure we get the secondary value
                result = await getDocumentSemanticTokens(languageFeaturesService.documentSemanticTokensProvider, textModel, result.provider, result.tokens.resultId, CancellationToken.None);
                assert.ok(result, `We should have tokens (2)`);
                assert.ok(result.tokens, `Tokens are found from multiple providers (2)`);
                assert.ok(isSemanticTokens(result.tokens), `Tokens are full (2)`);
                assert.ok(!result.tokens.resultId, `Token result id found from multiple providers (2)`);
                assert.deepStrictEqual(toArr(result.tokens.data), [2, 1, 1, 1, 1, 0, 2, 1, 1, 1], `Token data returned for multiple providers (2)`);
                assert.deepStrictEqual(callCount, 4, `Called both token providers (2)`);
                assert.deepStrictEqual(result.provider.getLegend(), { tokenTypes: ['class1'], tokenModifiers: [] }, `Legend matches the tokens (2)`);
            }
            finally {
                disposables.clear();
                // Wait for scheduler to finish
                await timeout(0);
                // Now dispose the text model
                textModel.dispose();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NlbWFudGljVG9rZW5zL3Rlc3QvYnJvd3Nlci9kb2N1bWVudFNlbWFudGljVG9rZW5zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUV4RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFakYsT0FBTyxFQUFF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