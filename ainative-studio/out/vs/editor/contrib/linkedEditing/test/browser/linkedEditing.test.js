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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkRWRpdGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xpbmtlZEVkaXRpbmcvdGVzdC9icm93c2VyL2xpbmtlZEVkaXRpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQW1CLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRD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