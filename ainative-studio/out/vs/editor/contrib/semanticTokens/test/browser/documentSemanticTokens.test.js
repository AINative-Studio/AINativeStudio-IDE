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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc2VtYW50aWNUb2tlbnMvdGVzdC9icm93c2VyL2RvY3VtZW50U2VtYW50aWNUb2tlbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRXhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVqRixPQUFPLEVBQUUs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