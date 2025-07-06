/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Delayer } from '../../../../../base/common/async.js';
import * as platform from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditOperation } from '../../../../common/core/editOperation.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { CommonFindController, NextMatchFindAction, NextSelectionMatchFindAction, StartFindAction, StartFindReplaceAction, StartFindWithSelectionAction } from '../../browser/findController.js';
import { CONTEXT_FIND_INPUT_FOCUSED } from '../../browser/findModel.js';
import { withAsyncTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IStorageService, InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
let TestFindController = class TestFindController extends CommonFindController {
    constructor(editor, contextKeyService, storageService, clipboardService, notificationService, hoverService) {
        super(editor, contextKeyService, storageService, clipboardService, notificationService, hoverService);
        this.delayUpdateHistory = false;
        this._findInputFocused = CONTEXT_FIND_INPUT_FOCUSED.bindTo(contextKeyService);
        this._updateHistoryDelayer = new Delayer(50);
        this.hasFocus = false;
    }
    async _start(opts) {
        await super._start(opts);
        if (opts.shouldFocus !== 0 /* FindStartFocusAction.NoFocusChange */) {
            this.hasFocus = true;
        }
        const inputFocused = opts.shouldFocus === 1 /* FindStartFocusAction.FocusFindInput */;
        this._findInputFocused.set(inputFocused);
    }
};
TestFindController = __decorate([
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, IClipboardService),
    __param(4, INotificationService),
    __param(5, IHoverService)
], TestFindController);
function fromSelection(slc) {
    return [slc.startLineNumber, slc.startColumn, slc.endLineNumber, slc.endColumn];
}
function executeAction(instantiationService, editor, action, args) {
    return instantiationService.invokeFunction((accessor) => {
        return Promise.resolve(action.runEditorCommand(accessor, editor, args));
    });
}
suite('FindController', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let clipboardState = '';
    const serviceCollection = new ServiceCollection();
    serviceCollection.set(IStorageService, new InMemoryStorageService());
    if (platform.isMacintosh) {
        serviceCollection.set(IClipboardService, {
            readFindText: () => clipboardState,
            writeFindText: (value) => { clipboardState = value; }
        });
    }
    /* test('stores to the global clipboard buffer on start find action', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            if (!platform.isMacintosh) {
                assert.ok(true);
                return;
            }
            let findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            let startFindAction = new StartFindAction();
            // I select ABC on the first line
            editor.setSelection(new Selection(1, 1, 1, 4));
            // I hit Ctrl+F to show the Find dialog
            startFindAction.run(null, editor);

            assert.deepStrictEqual(findController.getGlobalBufferTerm(), findController.getState().searchString);
            findController.dispose();
        });
    });

    test('reads from the global clipboard buffer on next find action if buffer exists', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = 'ABC';

            if (!platform.isMacintosh) {
                assert.ok(true);
                return;
            }

            let findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            let findState = findController.getState();
            let nextMatchFindAction = new NextMatchFindAction();

            nextMatchFindAction.run(null, editor);
            assert.strictEqual(findState.searchString, 'ABC');

            assert.deepStrictEqual(fromSelection(editor.getSelection()!), [1, 1, 1, 4]);

            findController.dispose();
        });
    });

    test('writes to the global clipboard buffer when text changes', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            if (!platform.isMacintosh) {
                assert.ok(true);
                return;
            }

            let findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            let findState = findController.getState();

            findState.change({ searchString: 'ABC' }, true);

            assert.deepStrictEqual(findController.getGlobalBufferTerm(), 'ABC');

            findController.dispose();
        });
    }); */
    test('issue #1857: F3, Find Next, acts like "Find Under Cursor"', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            // The cursor is at the very top, of the file, at the first ABC
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const findState = findController.getState();
            const nextMatchFindAction = new NextMatchFindAction();
            // I hit Ctrl+F to show the Find dialog
            await executeAction(instantiationService, editor, StartFindAction);
            // I type ABC.
            findState.change({ searchString: 'A' }, true);
            findState.change({ searchString: 'AB' }, true);
            findState.change({ searchString: 'ABC' }, true);
            // The first ABC is highlighted.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 1, 1, 4]);
            // I hit Esc to exit the Find dialog.
            findController.closeFindWidget();
            findController.hasFocus = false;
            // The cursor is now at end of the first line, with ABC on that line highlighted.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 1, 1, 4]);
            // I hit delete to remove it and change the text to XYZ.
            editor.pushUndoStop();
            editor.executeEdits('test', [EditOperation.delete(new Range(1, 1, 1, 4))]);
            editor.executeEdits('test', [EditOperation.insert(new Position(1, 1), 'XYZ')]);
            editor.pushUndoStop();
            // At this point the text editor looks like this:
            //   XYZ
            //   ABC
            //   XYZ
            //   ABC
            assert.strictEqual(editor.getModel().getLineContent(1), 'XYZ');
            // The cursor is at end of the first line.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 4, 1, 4]);
            // I hit F3 to "Find Next" to find the next occurrence of ABC, but instead it searches for XYZ.
            await nextMatchFindAction.run(null, editor);
            assert.strictEqual(findState.searchString, 'ABC');
            assert.strictEqual(findController.hasFocus, false);
            findController.dispose();
        });
    });
    test('issue #3090: F3 does not loop with two matches on a single line', async () => {
        await withAsyncTestCodeEditor([
            'import nls = require(\'vs/nls\');'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextMatchFindAction = new NextMatchFindAction();
            editor.setPosition({
                lineNumber: 1,
                column: 9
            });
            await nextMatchFindAction.run(null, editor);
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 26, 1, 29]);
            await nextMatchFindAction.run(null, editor);
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 8, 1, 11]);
            findController.dispose();
        });
    });
    test('issue #6149: Auto-escape highlighted text for search and replace regex mode', async () => {
        await withAsyncTestCodeEditor([
            'var x = (3 * 5)',
            'var y = (3 * 5)',
            'var z = (3  * 5)',
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextMatchFindAction = new NextMatchFindAction();
            editor.setSelection(new Selection(1, 9, 1, 13));
            findController.toggleRegex();
            await executeAction(instantiationService, editor, StartFindAction);
            await nextMatchFindAction.run(null, editor);
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [2, 9, 2, 13]);
            await nextMatchFindAction.run(null, editor);
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 9, 1, 13]);
            findController.dispose();
        });
    });
    test('issue #41027: Don\'t replace find input value on replace action if find input is active', async () => {
        await withAsyncTestCodeEditor([
            'test',
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            const testRegexString = 'tes.';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextMatchFindAction = new NextMatchFindAction();
            findController.toggleRegex();
            findController.setSearchString(testRegexString);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
                shouldAnimate: false,
                updateSearchScope: false,
                loop: true
            });
            await nextMatchFindAction.run(null, editor);
            await executeAction(instantiationService, editor, StartFindReplaceAction);
            assert.strictEqual(findController.getState().searchString, testRegexString);
            findController.dispose();
        });
    });
    test('issue #9043: Clear search scope when find widget is hidden', async () => {
        await withAsyncTestCodeEditor([
            'var x = (3 * 5)',
            'var y = (3 * 5)',
            'var z = (3 * 5)',
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: false,
                loop: true
            });
            assert.strictEqual(findController.getState().searchScope, null);
            findController.getState().change({
                searchScope: [new Range(1, 1, 1, 5)]
            }, false);
            assert.deepStrictEqual(findController.getState().searchScope, [new Range(1, 1, 1, 5)]);
            findController.closeFindWidget();
            assert.strictEqual(findController.getState().searchScope, null);
        });
    });
    test('issue #18111: Regex replace with single space replaces with no space', async () => {
        await withAsyncTestCodeEditor([
            'HRESULT OnAmbientPropertyChange(DISPID   dispid);'
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await executeAction(instantiationService, editor, StartFindAction);
            findController.getState().change({ searchString: '\\b\\s{3}\\b', replaceString: ' ', isRegex: true }, false);
            findController.moveToNextMatch();
            assert.deepStrictEqual(editor.getSelections().map(fromSelection), [
                [1, 39, 1, 42]
            ]);
            findController.replace();
            assert.deepStrictEqual(editor.getValue(), 'HRESULT OnAmbientPropertyChange(DISPID dispid);');
            findController.dispose();
        });
    });
    test('issue #24714: Regular expression with ^ in search & replace', async () => {
        await withAsyncTestCodeEditor([
            '',
            'line2',
            'line3'
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await executeAction(instantiationService, editor, StartFindAction);
            findController.getState().change({ searchString: '^', replaceString: 'x', isRegex: true }, false);
            findController.moveToNextMatch();
            assert.deepStrictEqual(editor.getSelections().map(fromSelection), [
                [2, 1, 2, 1]
            ]);
            findController.replace();
            assert.deepStrictEqual(editor.getValue(), '\nxline2\nline3');
            findController.dispose();
        });
    });
    test('issue #38232: Find Next Selection, regex enabled', async () => {
        await withAsyncTestCodeEditor([
            '([funny]',
            '',
            '([funny]'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextSelectionMatchFindAction = new NextSelectionMatchFindAction();
            // toggle regex
            findController.getState().change({ isRegex: true }, false);
            // change selection
            editor.setSelection(new Selection(1, 1, 1, 9));
            // cmd+f3
            await nextSelectionMatchFindAction.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromSelection), [
                [3, 1, 3, 9]
            ]);
            findController.dispose();
        });
    });
    test('issue #38232: Find Next Selection, regex enabled, find widget open', async () => {
        await withAsyncTestCodeEditor([
            '([funny]',
            '',
            '([funny]'
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextSelectionMatchFindAction = new NextSelectionMatchFindAction();
            // cmd+f - open find widget
            await executeAction(instantiationService, editor, StartFindAction);
            // toggle regex
            findController.getState().change({ isRegex: true }, false);
            // change selection
            editor.setSelection(new Selection(1, 1, 1, 9));
            // cmd+f3
            await nextSelectionMatchFindAction.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromSelection), [
                [3, 1, 3, 9]
            ]);
            findController.dispose();
        });
    });
    test('issue #47400, CMD+E supports feeding multiple line of text into the find widget', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            // change selection
            editor.setSelection(new Selection(1, 1, 1, 1));
            // cmd+f - open find widget
            await executeAction(instantiationService, editor, StartFindAction);
            editor.setSelection(new Selection(1, 1, 2, 4));
            const startFindWithSelectionAction = new StartFindWithSelectionAction();
            await startFindWithSelectionAction.run(null, editor);
            const findState = findController.getState();
            assert.deepStrictEqual(findState.searchString.split(/\r\n|\r|\n/g), ['ABC', 'ABC']);
            editor.setSelection(new Selection(3, 1, 3, 1));
            await startFindWithSelectionAction.run(null, editor);
            findController.dispose();
        });
    });
    test('issue #109756, CMD+E with empty cursor should always work', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            editor.setSelection(new Selection(1, 2, 1, 2));
            const startFindWithSelectionAction = new StartFindWithSelectionAction();
            startFindWithSelectionAction.run(null, editor);
            const findState = findController.getState();
            assert.deepStrictEqual(findState.searchString, 'ABC');
            findController.dispose();
        });
    });
});
suite('FindController query options persistence', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const serviceCollection = new ServiceCollection();
    const storageService = new InMemoryStorageService();
    storageService.store('editor.isRegex', false, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    storageService.store('editor.matchCase', false, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    storageService.store('editor.wholeWord', false, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    serviceCollection.set(IStorageService, storageService);
    test('matchCase', async () => {
        await withAsyncTestCodeEditor([
            'abc',
            'ABC',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            storageService.store('editor.matchCase', true, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
            // The cursor is at the very top, of the file, at the first ABC
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const findState = findController.getState();
            // I hit Ctrl+F to show the Find dialog
            await executeAction(instantiationService, editor, StartFindAction);
            // I type ABC.
            findState.change({ searchString: 'ABC' }, true);
            // The second ABC is highlighted as matchCase is true.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [2, 1, 2, 4]);
            findController.dispose();
        });
    });
    storageService.store('editor.matchCase', false, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    storageService.store('editor.wholeWord', true, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    test('wholeWord', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'AB',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            // The cursor is at the very top, of the file, at the first ABC
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const findState = findController.getState();
            // I hit Ctrl+F to show the Find dialog
            await executeAction(instantiationService, editor, StartFindAction);
            // I type AB.
            findState.change({ searchString: 'AB' }, true);
            // The second AB is highlighted as wholeWord is true.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [2, 1, 2, 3]);
            findController.dispose();
        });
    });
    test('toggling options is saved', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'AB',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            // The cursor is at the very top, of the file, at the first ABC
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            findController.toggleRegex();
            assert.strictEqual(storageService.getBoolean('editor.isRegex', 1 /* StorageScope.WORKSPACE */), true);
            findController.dispose();
        });
    });
    test('issue #27083: Update search scope once find widget becomes visible', async () => {
        await withAsyncTestCodeEditor([
            'var x = (3 * 5)',
            'var y = (3 * 5)',
            'var z = (3 * 5)',
        ], { serviceCollection: serviceCollection, find: { autoFindInSelection: 'always', globalFindClipboard: false } }, async (editor) => {
            // clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const findConfig = {
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: true,
                loop: true
            };
            editor.setSelection(new Range(1, 1, 2, 1));
            findController.start(findConfig);
            assert.deepStrictEqual(findController.getState().searchScope, [new Selection(1, 1, 2, 1)]);
            findController.closeFindWidget();
            editor.setSelections([new Selection(1, 1, 2, 1), new Selection(2, 1, 2, 5)]);
            findController.start(findConfig);
            assert.deepStrictEqual(findController.getState().searchScope, [new Selection(1, 1, 2, 1), new Selection(2, 1, 2, 5)]);
        });
    });
    test('issue #58604: Do not update searchScope if it is empty', async () => {
        await withAsyncTestCodeEditor([
            'var x = (3 * 5)',
            'var y = (3 * 5)',
            'var z = (3 * 5)',
        ], { serviceCollection: serviceCollection, find: { autoFindInSelection: 'always', globalFindClipboard: false } }, async (editor) => {
            // clipboardState = '';
            editor.setSelection(new Range(1, 2, 1, 2));
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: true,
                loop: true
            });
            assert.deepStrictEqual(findController.getState().searchScope, null);
        });
    });
    test('issue #58604: Update searchScope if it is not empty', async () => {
        await withAsyncTestCodeEditor([
            'var x = (3 * 5)',
            'var y = (3 * 5)',
            'var z = (3 * 5)',
        ], { serviceCollection: serviceCollection, find: { autoFindInSelection: 'always', globalFindClipboard: false } }, async (editor) => {
            // clipboardState = '';
            editor.setSelection(new Range(1, 2, 1, 3));
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: true,
                loop: true
            });
            assert.deepStrictEqual(findController.getState().searchScope, [new Selection(1, 2, 1, 3)]);
        });
    });
    test('issue #27083: Find in selection when multiple lines are selected', async () => {
        await withAsyncTestCodeEditor([
            'var x = (3 * 5)',
            'var y = (3 * 5)',
            'var z = (3 * 5)',
        ], { serviceCollection: serviceCollection, find: { autoFindInSelection: 'multiline', globalFindClipboard: false } }, async (editor) => {
            // clipboardState = '';
            editor.setSelection(new Range(1, 6, 2, 1));
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: true,
                loop: true
            });
            assert.deepStrictEqual(findController.getState().searchScope, [new Selection(1, 6, 2, 1)]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvdGVzdC9icm93c2VyL2ZpbmRDb250cm9sbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQTJDLG1CQUFtQixFQUFFLDRCQUE0QixFQUFFLGVBQWUsRUFBRSxzQkFBc0IsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFPLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2pHLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztB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