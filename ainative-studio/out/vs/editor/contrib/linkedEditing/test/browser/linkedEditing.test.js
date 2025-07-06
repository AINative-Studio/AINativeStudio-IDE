/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { USUAL_WORD_SEPARATORS } from '../../../../common/core/wordHelper.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { DeleteAllLeftAction } from '../../../linesOperations/browser/linesOperations.js';
import { LinkedEditingContribution } from '../../browser/linkedEditing.js';
import { DeleteWordLeft } from '../../../wordOperations/browser/wordOperations.js';
import { createCodeEditorServices, instantiateTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { instantiateTextModel } from '../../../../test/common/testTextModel.js';
const mockFile = URI.parse('test:somefile.ttt');
const mockFileSelector = { scheme: 'test' };
const timeout = 30;
const languageId = 'linkedEditingTestLangage';
suite('linked editing', () => {
    let disposables;
    let instantiationService;
    let languageFeaturesService;
    let languageConfigurationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createCodeEditorServices(disposables);
        languageFeaturesService = instantiationService.get(ILanguageFeaturesService);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        disposables.add(languageConfigurationService.register(languageId, {
            wordPattern: /[a-zA-Z]+/
        }));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createMockEditor(text) {
        const model = disposables.add(instantiateTextModel(instantiationService, typeof text === 'string' ? text : text.join('\n'), languageId, undefined, mockFile));
        const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model));
        return editor;
    }
    function testCase(name, initialState, operations, expectedEndText) {
        test(name, async () => {
            await runWithFakedTimers({}, async () => {
                disposables.add(languageFeaturesService.linkedEditingRangeProvider.register(mockFileSelector, {
                    provideLinkedEditingRanges(model, pos) {
                        const wordAtPos = model.getWordAtPosition(pos);
                        if (wordAtPos) {
                            const matches = model.findMatches(wordAtPos.word, false, false, true, USUAL_WORD_SEPARATORS, false);
                            return { ranges: matches.map(m => m.range), wordPattern: initialState.responseWordPattern };
                        }
                        return { ranges: [], wordPattern: initialState.responseWordPattern };
                    }
                }));
                const editor = createMockEditor(initialState.text);
                editor.updateOptions({ linkedEditing: true });
                const linkedEditingContribution = disposables.add(editor.registerAndInstantiateContribution(LinkedEditingContribution.ID, LinkedEditingContribution));
                linkedEditingContribution.setDebounceDuration(0);
                const testEditor = {
                    setPosition(pos) {
                        editor.setPosition(pos);
                        return linkedEditingContribution.currentUpdateTriggerPromise;
                    },
                    setSelection(sel) {
                        editor.setSelection(sel);
                        return linkedEditingContribution.currentUpdateTriggerPromise;
                    },
                    trigger(source, handlerId, payload) {
                        if (handlerId === "type" /* Handler.Type */ || handlerId === "paste" /* Handler.Paste */) {
                            editor.trigger(source, handlerId, payload);
                        }
                        else if (handlerId === 'deleteLeft') {
                            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, payload);
                        }
                        else if (handlerId === 'deleteWordLeft') {
                            instantiationService.invokeFunction((accessor) => (new DeleteWordLeft()).runEditorCommand(accessor, editor, payload));
                        }
                        else if (handlerId === 'deleteAllLeft') {
                            instantiationService.invokeFunction((accessor) => (new DeleteAllLeftAction()).runEditorCommand(accessor, editor, payload));
                        }
                        else {
                            throw new Error(`Unknown handler ${handlerId}!`);
                        }
                        return linkedEditingContribution.currentSyncTriggerPromise;
                    },
                    undo() {
                        CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
                    },
                    redo() {
                        CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
                    }
                };
                await operations(testEditor);
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (typeof expectedEndText === 'string') {
                            assert.strictEqual(editor.getModel().getValue(), expectedEndText);
                        }
                        else {
                            assert.strictEqual(editor.getModel().getValue(), expectedEndText.join('\n'));
                        }
                        resolve();
                    }, timeout);
                });
            });
        });
    }
    const state = {
        text: '<ooo></ooo>'
    };
    /**
     * Simple insertion
     */
    testCase('Simple insert - initial', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo></iooo>');
    testCase('Simple insert - middle', state, async (editor) => {
        const pos = new Position(1, 3);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<oioo></oioo>');
    testCase('Simple insert - end', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<oooi></oooi>');
    /**
     * Simple insertion - end
     */
    testCase('Simple insert end - initial', state, async (editor) => {
        const pos = new Position(1, 8);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo></iooo>');
    testCase('Simple insert end - middle', state, async (editor) => {
        const pos = new Position(1, 9);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<oioo></oioo>');
    testCase('Simple insert end - end', state, async (editor) => {
        const pos = new Position(1, 11);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<oooi></oooi>');
    /**
     * Boundary insertion
     */
    testCase('Simple insert - out of boundary', state, async (editor) => {
        const pos = new Position(1, 1);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, 'i<ooo></ooo>');
    testCase('Simple insert - out of boundary 2', state, async (editor) => {
        const pos = new Position(1, 6);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ooo>i</ooo>');
    testCase('Simple insert - out of boundary 3', state, async (editor) => {
        const pos = new Position(1, 7);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ooo><i/ooo>');
    testCase('Simple insert - out of boundary 4', state, async (editor) => {
        const pos = new Position(1, 12);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ooo></ooo>i');
    /**
     * Insert + Move
     */
    testCase('Continuous insert', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iiooo></iiooo>');
    testCase('Insert - move - insert', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        await editor.setPosition(new Position(1, 4));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ioioo></ioioo>');
    testCase('Insert - move - insert outside region', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        await editor.setPosition(new Position(1, 7));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo>i</iooo>');
    /**
     * Selection insert
     */
    testCase('Selection insert - simple', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 2, 1, 3));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ioo></ioo>');
    testCase('Selection insert - whole', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 2, 1, 5));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<i></i>');
    testCase('Selection insert - across boundary', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 1, 1, 3));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, 'ioo></oo>');
    /**
     * @todo
     * Undefined behavior
     */
    // testCase('Selection insert - across two boundary', state, async (editor) => {
    // 	const pos = new Position(1, 2);
    // 	await editor.setPosition(pos);
    // 	await linkedEditingContribution.updateLinkedUI(pos);
    // 	await editor.setSelection(new Range(1, 4, 1, 9));
    // 	await editor.trigger('keyboard', Handler.Type, { text: 'i' });
    // }, '<ooioo>');
    /**
     * Break out behavior
     */
    testCase('Breakout - type space', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
    }, '<ooo ></ooo>');
    testCase('Breakout - type space then undo', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Breakout - type space in middle', state, async (editor) => {
        const pos = new Position(1, 4);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
    }, '<oo o></ooo>');
    testCase('Breakout - paste content starting with space', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: ' i="i"' });
    }, '<ooo i="i"></ooo>');
    testCase('Breakout - paste content starting with space then undo', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: ' i="i"' });
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Breakout - paste content starting with space in middle', state, async (editor) => {
        const pos = new Position(1, 4);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: ' i' });
    }, '<oo io></ooo>');
    /**
     * Break out with custom provider wordPattern
     */
    const state3 = {
        ...state,
        responseWordPattern: /[a-yA-Y]+/
    };
    testCase('Breakout with stop pattern - insert', state3, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo></iooo>');
    testCase('Breakout with stop pattern - insert stop char', state3, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'z' });
    }, '<zooo></ooo>');
    testCase('Breakout with stop pattern - paste char', state3, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: 'z' });
    }, '<zooo></ooo>');
    testCase('Breakout with stop pattern - paste string', state3, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: 'zo' });
    }, '<zoooo></ooo>');
    testCase('Breakout with stop pattern - insert at end', state3, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'z' });
    }, '<oooz></ooo>');
    const state4 = {
        ...state,
        responseWordPattern: /[a-eA-E]+/
    };
    testCase('Breakout with stop pattern - insert stop char, respos', state4, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo></ooo>');
    /**
     * Delete
     */
    testCase('Delete - left char', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteLeft', {});
    }, '<oo></oo>');
    testCase('Delete - left char then undo', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteLeft', {});
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Delete - left word', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteWordLeft', {});
    }, '<></>');
    testCase('Delete - left word then undo', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteWordLeft', {});
        editor.undo();
        editor.undo();
    }, '<ooo></ooo>');
    /**
     * Todo: Fix test
     */
    // testCase('Delete - left all', state, async (editor) => {
    // 	const pos = new Position(1, 3);
    // 	await editor.setPosition(pos);
    // 	await linkedEditingContribution.updateLinkedUI(pos);
    // 	await editor.trigger('keyboard', 'deleteAllLeft', {});
    // }, '></>');
    /**
     * Todo: Fix test
     */
    // testCase('Delete - left all then undo', state, async (editor) => {
    // 	const pos = new Position(1, 5);
    // 	await editor.setPosition(pos);
    // 	await linkedEditingContribution.updateLinkedUI(pos);
    // 	await editor.trigger('keyboard', 'deleteAllLeft', {});
    // 	editor.undo();
    // }, '></ooo>');
    testCase('Delete - left all then undo twice', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteAllLeft', {});
        editor.undo();
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Delete - selection', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 2, 1, 3));
        await editor.trigger('keyboard', 'deleteLeft', {});
    }, '<oo></oo>');
    testCase('Delete - selection across boundary', state, async (editor) => {
        const pos = new Position(1, 3);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 1, 1, 3));
        await editor.trigger('keyboard', 'deleteLeft', {});
    }, 'oo></oo>');
    /**
     * Undo / redo
     */
    testCase('Undo/redo - simple undo', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        editor.undo();
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Undo/redo - simple undo/redo', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        editor.undo();
        editor.redo();
    }, '<iooo></iooo>');
    /**
     * Multi line
     */
    const state2 = {
        text: [
            '<ooo>',
            '</ooo>'
        ]
    };
    testCase('Multiline insert', state2, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, [
        '<iooo>',
        '</iooo>'
    ]);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkRWRpdGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9saW5rZWRFZGl0aW5nL3Rlc3QvYnJvd3Nlci9saW5rZWRFZGl0aW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFtQix3QkFBd0IsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRD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