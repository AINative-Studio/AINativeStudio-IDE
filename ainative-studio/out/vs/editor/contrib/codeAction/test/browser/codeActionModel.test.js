/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { promiseWithResolvers } from '../../../../../base/common/async.js';
import { assertType } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { MarkerService } from '../../../../../platform/markers/common/markerService.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { CodeActionModel } from '../../browser/codeActionModel.js';
const testProvider = {
    provideCodeActions() {
        return {
            actions: [
                { title: 'test', command: { id: 'test-command', title: 'test', arguments: [] } }
            ],
            dispose() { }
        };
    }
};
suite('CodeActionModel', () => {
    const languageId = 'foo-lang';
    const uri = URI.parse('untitled:path');
    let model;
    let markerService;
    let editor;
    let registry;
    setup(() => {
        markerService = new MarkerService();
        model = createTextModel('foobar  foo bar\nfarboo far boo', languageId, undefined, uri);
        editor = createTestCodeEditor(model);
        editor.setPosition({ lineNumber: 1, column: 1 });
        registry = new LanguageFeatureRegistry();
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    teardown(() => {
        editor.dispose();
        model.dispose();
        markerService.dispose();
    });
    test('Oracle -> marker added', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            const reg = registry.register(languageId, testProvider);
            store.add(reg);
            const contextKeys = new MockContextKeyService();
            const model = store.add(new CodeActionModel(editor, registry, markerService, contextKeys, undefined));
            store.add(model.onDidChangeState((e) => {
                assertType(e.type === 1 /* CodeActionsState.Type.Triggered */);
                assert.strictEqual(e.trigger.type, 2 /* languages.CodeActionTriggerType.Auto */);
                assert.ok(e.actions);
                e.actions.then(fixes => {
                    model.dispose();
                    assert.strictEqual(fixes.validActions.length, 1);
                    done();
                }, done);
            }));
            // start here
            markerService.changeOne('fake', uri, [{
                    startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 6,
                    message: 'error',
                    severity: 1,
                    code: '',
                    source: ''
                }]);
            return donePromise;
        });
    });
    test('Oracle -> position changed', async () => {
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            const reg = registry.register(languageId, testProvider);
            store.add(reg);
            markerService.changeOne('fake', uri, [{
                    startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 6,
                    message: 'error',
                    severity: 1,
                    code: '',
                    source: ''
                }]);
            editor.setPosition({ lineNumber: 2, column: 1 });
            return new Promise((resolve, reject) => {
                const contextKeys = new MockContextKeyService();
                const model = store.add(new CodeActionModel(editor, registry, markerService, contextKeys, undefined));
                store.add(model.onDidChangeState((e) => {
                    assertType(e.type === 1 /* CodeActionsState.Type.Triggered */);
                    assert.strictEqual(e.trigger.type, 2 /* languages.CodeActionTriggerType.Auto */);
                    assert.ok(e.actions);
                    e.actions.then(fixes => {
                        model.dispose();
                        assert.strictEqual(fixes.validActions.length, 1);
                        resolve(undefined);
                    }, reject);
                }));
                // start here
                editor.setPosition({ lineNumber: 1, column: 1 });
            });
        });
    });
    test('Oracle -> should only auto trigger once for cursor and marker update right after each other', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            const reg = registry.register(languageId, testProvider);
            store.add(reg);
            let triggerCount = 0;
            const contextKeys = new MockContextKeyService();
            const model = store.add(new CodeActionModel(editor, registry, markerService, contextKeys, undefined));
            store.add(model.onDidChangeState((e) => {
                assertType(e.type === 1 /* CodeActionsState.Type.Triggered */);
                assert.strictEqual(e.trigger.type, 2 /* languages.CodeActionTriggerType.Auto */);
                ++triggerCount;
                // give time for second trigger before completing test
                setTimeout(() => {
                    model.dispose();
                    assert.strictEqual(triggerCount, 1);
                    done();
                }, 0);
            }, 5 /*delay*/));
            markerService.changeOne('fake', uri, [{
                    startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 6,
                    message: 'error',
                    severity: 1,
                    code: '',
                    source: ''
                }]);
            editor.setSelection({ startLineNumber: 1, startColumn: 1, endLineNumber: 4, endColumn: 1 });
            return donePromise;
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi90ZXN0L2Jyb3dzZXIvY29kZUFjdGlvbk1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXhGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBR3hGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFvQixNQUFNLGtDQUFrQyxDQUFDO0FBRXJGLE1BQU0sWUFBWSxHQUFHO0lBQ3BCLGtCQUFrQjtRQUNqQixPQUFPO1lBQ04sT0FBTyxFQUFFO2dCQUNSLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxNQUFN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