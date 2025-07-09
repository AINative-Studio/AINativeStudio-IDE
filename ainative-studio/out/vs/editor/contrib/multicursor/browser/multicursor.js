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
var SelectionHighlighter_1;
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { CursorMoveCommands } from '../../../common/cursor/cursorMoveCommands.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { CommonFindController } from '../../find/browser/findController.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { getSelectionHighlightDecorationOptions } from '../../wordHighlighter/browser/highlightDecorations.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
function announceCursorChange(previousCursorState, cursorState) {
    const cursorDiff = cursorState.filter(cs => !previousCursorState.find(pcs => pcs.equals(cs)));
    if (cursorDiff.length >= 1) {
        const cursorPositions = cursorDiff.map(cs => `line ${cs.viewState.position.lineNumber} column ${cs.viewState.position.column}`).join(', ');
        const msg = cursorDiff.length === 1 ? nls.localize('cursorAdded', "Cursor added: {0}", cursorPositions) : nls.localize('cursorsAdded', "Cursors added: {0}", cursorPositions);
        status(msg);
    }
}
export class InsertCursorAbove extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertCursorAbove',
            label: nls.localize2('mutlicursor.insertAbove', "Add Cursor Above"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
                linux: {
                    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */]
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miInsertCursorAbove', comment: ['&& denotes a mnemonic'] }, "&&Add Cursor Above"),
                order: 2
            }
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        let useLogicalLine = true;
        if (args && args.logicalLine === false) {
            useLogicalLine = false;
        }
        const viewModel = editor._getViewModel();
        if (viewModel.cursorConfig.readOnly) {
            return;
        }
        viewModel.model.pushStackElement();
        const previousCursorState = viewModel.getCursorStates();
        viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.addCursorUp(viewModel, previousCursorState, useLogicalLine));
        viewModel.revealTopMostCursor(args.source);
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
export class InsertCursorBelow extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertCursorBelow',
            label: nls.localize2('mutlicursor.insertBelow', "Add Cursor Below"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
                linux: {
                    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */]
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miInsertCursorBelow', comment: ['&& denotes a mnemonic'] }, "A&&dd Cursor Below"),
                order: 3
            }
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        let useLogicalLine = true;
        if (args && args.logicalLine === false) {
            useLogicalLine = false;
        }
        const viewModel = editor._getViewModel();
        if (viewModel.cursorConfig.readOnly) {
            return;
        }
        viewModel.model.pushStackElement();
        const previousCursorState = viewModel.getCursorStates();
        viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.addCursorDown(viewModel, previousCursorState, useLogicalLine));
        viewModel.revealBottomMostCursor(args.source);
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
class InsertCursorAtEndOfEachLineSelected extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertCursorAtEndOfEachLineSelected',
            label: nls.localize2('mutlicursor.insertAtEndOfEachLineSelected', "Add Cursors to Line Ends"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miInsertCursorAtEndOfEachLineSelected', comment: ['&& denotes a mnemonic'] }, "Add C&&ursors to Line Ends"),
                order: 4
            }
        });
    }
    getCursorsForSelection(selection, model, result) {
        if (selection.isEmpty()) {
            return;
        }
        for (let i = selection.startLineNumber; i < selection.endLineNumber; i++) {
            const currentLineMaxColumn = model.getLineMaxColumn(i);
            result.push(new Selection(i, currentLineMaxColumn, i, currentLineMaxColumn));
        }
        if (selection.endColumn > 1) {
            result.push(new Selection(selection.endLineNumber, selection.endColumn, selection.endLineNumber, selection.endColumn));
        }
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const selections = editor.getSelections();
        const viewModel = editor._getViewModel();
        const previousCursorState = viewModel.getCursorStates();
        const newSelections = [];
        selections.forEach((sel) => this.getCursorsForSelection(sel, model, newSelections));
        if (newSelections.length > 0) {
            editor.setSelections(newSelections);
        }
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
class InsertCursorAtEndOfLineSelected extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.addCursorsToBottom',
            label: nls.localize2('mutlicursor.addCursorsToBottom', "Add Cursors to Bottom"),
            precondition: undefined
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const selections = editor.getSelections();
        const lineCount = editor.getModel().getLineCount();
        const newSelections = [];
        for (let i = selections[0].startLineNumber; i <= lineCount; i++) {
            newSelections.push(new Selection(i, selections[0].startColumn, i, selections[0].endColumn));
        }
        const viewModel = editor._getViewModel();
        const previousCursorState = viewModel.getCursorStates();
        if (newSelections.length > 0) {
            editor.setSelections(newSelections);
        }
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
class InsertCursorAtTopOfLineSelected extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.addCursorsToTop',
            label: nls.localize2('mutlicursor.addCursorsToTop', "Add Cursors to Top"),
            precondition: undefined
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const selections = editor.getSelections();
        const newSelections = [];
        for (let i = selections[0].startLineNumber; i >= 1; i--) {
            newSelections.push(new Selection(i, selections[0].startColumn, i, selections[0].endColumn));
        }
        const viewModel = editor._getViewModel();
        const previousCursorState = viewModel.getCursorStates();
        if (newSelections.length > 0) {
            editor.setSelections(newSelections);
        }
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
export class MultiCursorSessionResult {
    constructor(selections, revealRange, revealScrollType) {
        this.selections = selections;
        this.revealRange = revealRange;
        this.revealScrollType = revealScrollType;
    }
}
export class MultiCursorSession {
    static create(editor, findController) {
        if (!editor.hasModel()) {
            return null;
        }
        const findState = findController.getState();
        // Find widget owns entirely what we search for if:
        //  - focus is not in the editor (i.e. it is in the find widget)
        //  - and the search widget is visible
        //  - and the search string is non-empty
        if (!editor.hasTextFocus() && findState.isRevealed && findState.searchString.length > 0) {
            // Find widget owns what is searched for
            return new MultiCursorSession(editor, findController, false, findState.searchString, findState.wholeWord, findState.matchCase, null);
        }
        // Otherwise, the selection gives the search text, and the find widget gives the search settings
        // The exception is the find state disassociation case: when beginning with a single, collapsed selection
        let isDisconnectedFromFindController = false;
        let wholeWord;
        let matchCase;
        const selections = editor.getSelections();
        if (selections.length === 1 && selections[0].isEmpty()) {
            isDisconnectedFromFindController = true;
            wholeWord = true;
            matchCase = true;
        }
        else {
            wholeWord = findState.wholeWord;
            matchCase = findState.matchCase;
        }
        // Selection owns what is searched for
        const s = editor.getSelection();
        let searchText;
        let currentMatch = null;
        if (s.isEmpty()) {
            // selection is empty => expand to current word
            const word = editor.getConfiguredWordAtPosition(s.getStartPosition());
            if (!word) {
                return null;
            }
            searchText = word.word;
            currentMatch = new Selection(s.startLineNumber, word.startColumn, s.startLineNumber, word.endColumn);
        }
        else {
            searchText = editor.getModel().getValueInRange(s).replace(/\r\n/g, '\n');
        }
        return new MultiCursorSession(editor, findController, isDisconnectedFromFindController, searchText, wholeWord, matchCase, currentMatch);
    }
    constructor(_editor, findController, isDisconnectedFromFindController, searchText, wholeWord, matchCase, currentMatch) {
        this._editor = _editor;
        this.findController = findController;
        this.isDisconnectedFromFindController = isDisconnectedFromFindController;
        this.searchText = searchText;
        this.wholeWord = wholeWord;
        this.matchCase = matchCase;
        this.currentMatch = currentMatch;
    }
    addSelectionToNextFindMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        const nextMatch = this._getNextMatch();
        if (!nextMatch) {
            return null;
        }
        const allSelections = this._editor.getSelections();
        return new MultiCursorSessionResult(allSelections.concat(nextMatch), nextMatch, 0 /* ScrollType.Smooth */);
    }
    moveSelectionToNextFindMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        const nextMatch = this._getNextMatch();
        if (!nextMatch) {
            return null;
        }
        const allSelections = this._editor.getSelections();
        return new MultiCursorSessionResult(allSelections.slice(0, allSelections.length - 1).concat(nextMatch), nextMatch, 0 /* ScrollType.Smooth */);
    }
    _getNextMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (this.currentMatch) {
            const result = this.currentMatch;
            this.currentMatch = null;
            return result;
        }
        this.findController.highlightFindOptions();
        const allSelections = this._editor.getSelections();
        const lastAddedSelection = allSelections[allSelections.length - 1];
        const nextMatch = this._editor.getModel().findNextMatch(this.searchText, lastAddedSelection.getEndPosition(), false, this.matchCase, this.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false);
        if (!nextMatch) {
            return null;
        }
        return new Selection(nextMatch.range.startLineNumber, nextMatch.range.startColumn, nextMatch.range.endLineNumber, nextMatch.range.endColumn);
    }
    addSelectionToPreviousFindMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        const previousMatch = this._getPreviousMatch();
        if (!previousMatch) {
            return null;
        }
        const allSelections = this._editor.getSelections();
        return new MultiCursorSessionResult(allSelections.concat(previousMatch), previousMatch, 0 /* ScrollType.Smooth */);
    }
    moveSelectionToPreviousFindMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        const previousMatch = this._getPreviousMatch();
        if (!previousMatch) {
            return null;
        }
        const allSelections = this._editor.getSelections();
        return new MultiCursorSessionResult(allSelections.slice(0, allSelections.length - 1).concat(previousMatch), previousMatch, 0 /* ScrollType.Smooth */);
    }
    _getPreviousMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (this.currentMatch) {
            const result = this.currentMatch;
            this.currentMatch = null;
            return result;
        }
        this.findController.highlightFindOptions();
        const allSelections = this._editor.getSelections();
        const lastAddedSelection = allSelections[allSelections.length - 1];
        const previousMatch = this._editor.getModel().findPreviousMatch(this.searchText, lastAddedSelection.getStartPosition(), false, this.matchCase, this.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false);
        if (!previousMatch) {
            return null;
        }
        return new Selection(previousMatch.range.startLineNumber, previousMatch.range.startColumn, previousMatch.range.endLineNumber, previousMatch.range.endColumn);
    }
    selectAll(searchScope) {
        if (!this._editor.hasModel()) {
            return [];
        }
        this.findController.highlightFindOptions();
        const editorModel = this._editor.getModel();
        if (searchScope) {
            return editorModel.findMatches(this.searchText, searchScope, false, this.matchCase, this.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
        }
        return editorModel.findMatches(this.searchText, true, false, this.matchCase, this.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    }
}
export class MultiCursorSelectionController extends Disposable {
    static { this.ID = 'editor.contrib.multiCursorController'; }
    static get(editor) {
        return editor.getContribution(MultiCursorSelectionController.ID);
    }
    constructor(editor) {
        super();
        this._sessionDispose = this._register(new DisposableStore());
        this._editor = editor;
        this._ignoreSelectionChange = false;
        this._session = null;
    }
    dispose() {
        this._endSession();
        super.dispose();
    }
    _beginSessionIfNeeded(findController) {
        if (!this._session) {
            // Create a new session
            const session = MultiCursorSession.create(this._editor, findController);
            if (!session) {
                return;
            }
            this._session = session;
            const newState = { searchString: this._session.searchText };
            if (this._session.isDisconnectedFromFindController) {
                newState.wholeWordOverride = 1 /* FindOptionOverride.True */;
                newState.matchCaseOverride = 1 /* FindOptionOverride.True */;
                newState.isRegexOverride = 2 /* FindOptionOverride.False */;
            }
            findController.getState().change(newState, false);
            this._sessionDispose.add(this._editor.onDidChangeCursorSelection((e) => {
                if (this._ignoreSelectionChange) {
                    return;
                }
                this._endSession();
            }));
            this._sessionDispose.add(this._editor.onDidBlurEditorText(() => {
                this._endSession();
            }));
            this._sessionDispose.add(findController.getState().onFindReplaceStateChange((e) => {
                if (e.matchCase || e.wholeWord) {
                    this._endSession();
                }
            }));
        }
    }
    _endSession() {
        this._sessionDispose.clear();
        if (this._session && this._session.isDisconnectedFromFindController) {
            const newState = {
                wholeWordOverride: 0 /* FindOptionOverride.NotSet */,
                matchCaseOverride: 0 /* FindOptionOverride.NotSet */,
                isRegexOverride: 0 /* FindOptionOverride.NotSet */,
            };
            this._session.findController.getState().change(newState, false);
        }
        this._session = null;
    }
    _setSelections(selections) {
        this._ignoreSelectionChange = true;
        this._editor.setSelections(selections);
        this._ignoreSelectionChange = false;
    }
    _expandEmptyToWord(model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const word = this._editor.getConfiguredWordAtPosition(selection.getStartPosition());
        if (!word) {
            return selection;
        }
        return new Selection(selection.startLineNumber, word.startColumn, selection.startLineNumber, word.endColumn);
    }
    _applySessionResult(result) {
        if (!result) {
            return;
        }
        this._setSelections(result.selections);
        if (result.revealRange) {
            this._editor.revealRangeInCenterIfOutsideViewport(result.revealRange, result.revealScrollType);
        }
    }
    getSession(findController) {
        return this._session;
    }
    addSelectionToNextFindMatch(findController) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (!this._session) {
            // If there are multiple cursors, handle the case where they do not all select the same text.
            const allSelections = this._editor.getSelections();
            if (allSelections.length > 1) {
                const findState = findController.getState();
                const matchCase = findState.matchCase;
                const selectionsContainSameText = modelRangesContainSameText(this._editor.getModel(), allSelections, matchCase);
                if (!selectionsContainSameText) {
                    const model = this._editor.getModel();
                    const resultingSelections = [];
                    for (let i = 0, len = allSelections.length; i < len; i++) {
                        resultingSelections[i] = this._expandEmptyToWord(model, allSelections[i]);
                    }
                    this._editor.setSelections(resultingSelections);
                    return;
                }
            }
        }
        this._beginSessionIfNeeded(findController);
        if (this._session) {
            this._applySessionResult(this._session.addSelectionToNextFindMatch());
        }
    }
    addSelectionToPreviousFindMatch(findController) {
        this._beginSessionIfNeeded(findController);
        if (this._session) {
            this._applySessionResult(this._session.addSelectionToPreviousFindMatch());
        }
    }
    moveSelectionToNextFindMatch(findController) {
        this._beginSessionIfNeeded(findController);
        if (this._session) {
            this._applySessionResult(this._session.moveSelectionToNextFindMatch());
        }
    }
    moveSelectionToPreviousFindMatch(findController) {
        this._beginSessionIfNeeded(findController);
        if (this._session) {
            this._applySessionResult(this._session.moveSelectionToPreviousFindMatch());
        }
    }
    selectAll(findController) {
        if (!this._editor.hasModel()) {
            return;
        }
        let matches = null;
        const findState = findController.getState();
        // Special case: find widget owns entirely what we search for if:
        // - focus is not in the editor (i.e. it is in the find widget)
        // - and the search widget is visible
        // - and the search string is non-empty
        // - and we're searching for a regex
        if (findState.isRevealed && findState.searchString.length > 0 && findState.isRegex) {
            const editorModel = this._editor.getModel();
            if (findState.searchScope) {
                matches = editorModel.findMatches(findState.searchString, findState.searchScope, findState.isRegex, findState.matchCase, findState.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
            }
            else {
                matches = editorModel.findMatches(findState.searchString, true, findState.isRegex, findState.matchCase, findState.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
            }
        }
        else {
            this._beginSessionIfNeeded(findController);
            if (!this._session) {
                return;
            }
            matches = this._session.selectAll(findState.searchScope);
        }
        if (matches.length > 0) {
            const editorSelection = this._editor.getSelection();
            // Have the primary cursor remain the one where the action was invoked
            for (let i = 0, len = matches.length; i < len; i++) {
                const match = matches[i];
                const intersection = match.range.intersectRanges(editorSelection);
                if (intersection) {
                    // bingo!
                    matches[i] = matches[0];
                    matches[0] = match;
                    break;
                }
            }
            this._setSelections(matches.map(m => new Selection(m.range.startLineNumber, m.range.startColumn, m.range.endLineNumber, m.range.endColumn)));
        }
    }
    selectAllUsingSelections(selections) {
        if (selections.length > 0) {
            this._setSelections(selections);
        }
    }
}
export class MultiCursorSelectionControllerAction extends EditorAction {
    run(accessor, editor) {
        const multiCursorController = MultiCursorSelectionController.get(editor);
        if (!multiCursorController) {
            return;
        }
        const viewModel = editor._getViewModel();
        if (viewModel) {
            const previousCursorState = viewModel.getCursorStates();
            const findController = CommonFindController.get(editor);
            if (findController) {
                this._run(multiCursorController, findController);
            }
            else {
                const newFindController = accessor.get(IInstantiationService).createInstance(CommonFindController, editor);
                this._run(multiCursorController, newFindController);
                newFindController.dispose();
            }
            announceCursorChange(previousCursorState, viewModel.getCursorStates());
        }
    }
}
export class AddSelectionToNextFindMatchAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.addSelectionToNextFindMatch',
            label: nls.localize2('addSelectionToNextFindMatch', "Add Selection to Next Find Match"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 34 /* KeyCode.KeyD */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miAddSelectionToNextFindMatch', comment: ['&& denotes a mnemonic'] }, "Add &&Next Occurrence"),
                order: 5
            }
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.addSelectionToNextFindMatch(findController);
    }
}
export class AddSelectionToPreviousFindMatchAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.addSelectionToPreviousFindMatch',
            label: nls.localize2('addSelectionToPreviousFindMatch', "Add Selection to Previous Find Match"),
            precondition: undefined,
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miAddSelectionToPreviousFindMatch', comment: ['&& denotes a mnemonic'] }, "Add P&&revious Occurrence"),
                order: 6
            }
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.addSelectionToPreviousFindMatch(findController);
    }
}
export class MoveSelectionToNextFindMatchAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.moveSelectionToNextFindMatch',
            label: nls.localize2('moveSelectionToNextFindMatch', "Move Last Selection to Next Find Match"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 34 /* KeyCode.KeyD */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.moveSelectionToNextFindMatch(findController);
    }
}
export class MoveSelectionToPreviousFindMatchAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.moveSelectionToPreviousFindMatch',
            label: nls.localize2('moveSelectionToPreviousFindMatch', "Move Last Selection to Previous Find Match"),
            precondition: undefined
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.moveSelectionToPreviousFindMatch(findController);
    }
}
export class SelectHighlightsAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.selectHighlights',
            label: nls.localize2('selectAllOccurrencesOfFindMatch', "Select All Occurrences of Find Match"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miSelectHighlights', comment: ['&& denotes a mnemonic'] }, "Select All &&Occurrences"),
                order: 7
            }
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.selectAll(findController);
    }
}
export class CompatChangeAll extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.changeAll',
            label: nls.localize2('changeAll.label', "Change All Occurrences"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.editorTextFocus),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 60 /* KeyCode.F2 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 1.2
            }
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.selectAll(findController);
    }
}
class SelectionHighlighterState {
    constructor(_model, _searchText, _matchCase, _wordSeparators, prevState) {
        this._model = _model;
        this._searchText = _searchText;
        this._matchCase = _matchCase;
        this._wordSeparators = _wordSeparators;
        this._cachedFindMatches = null;
        this._modelVersionId = this._model.getVersionId();
        if (prevState
            && this._model === prevState._model
            && this._searchText === prevState._searchText
            && this._matchCase === prevState._matchCase
            && this._wordSeparators === prevState._wordSeparators
            && this._modelVersionId === prevState._modelVersionId) {
            this._cachedFindMatches = prevState._cachedFindMatches;
        }
    }
    findMatches() {
        if (this._cachedFindMatches === null) {
            this._cachedFindMatches = this._model.findMatches(this._searchText, true, false, this._matchCase, this._wordSeparators, false).map(m => m.range);
            this._cachedFindMatches.sort(Range.compareRangesUsingStarts);
        }
        return this._cachedFindMatches;
    }
}
let SelectionHighlighter = class SelectionHighlighter extends Disposable {
    static { SelectionHighlighter_1 = this; }
    static { this.ID = 'editor.contrib.selectionHighlighter'; }
    constructor(editor, _languageFeaturesService) {
        super();
        this._languageFeaturesService = _languageFeaturesService;
        this.editor = editor;
        this._isEnabled = editor.getOption(113 /* EditorOption.selectionHighlight */);
        this._decorations = editor.createDecorationsCollection();
        this.updateSoon = this._register(new RunOnceScheduler(() => this._update(), 300));
        this.state = null;
        this._register(editor.onDidChangeConfiguration((e) => {
            this._isEnabled = editor.getOption(113 /* EditorOption.selectionHighlight */);
        }));
        this._register(editor.onDidChangeCursorSelection((e) => {
            if (!this._isEnabled) {
                // Early exit if nothing needs to be done!
                // Leave some form of early exit check here if you wish to continue being a cursor position change listener ;)
                return;
            }
            if (e.selection.isEmpty()) {
                if (e.reason === 3 /* CursorChangeReason.Explicit */) {
                    if (this.state) {
                        // no longer valid
                        this._setState(null);
                    }
                    this.updateSoon.schedule();
                }
                else {
                    this._setState(null);
                }
            }
            else {
                this._update();
            }
        }));
        this._register(editor.onDidChangeModel((e) => {
            this._setState(null);
        }));
        this._register(editor.onDidChangeModelContent((e) => {
            if (this._isEnabled) {
                this.updateSoon.schedule();
            }
        }));
        const findController = CommonFindController.get(editor);
        if (findController) {
            this._register(findController.getState().onFindReplaceStateChange((e) => {
                this._update();
            }));
        }
        this.updateSoon.schedule();
    }
    _update() {
        this._setState(SelectionHighlighter_1._createState(this.state, this._isEnabled, this.editor));
    }
    static _createState(oldState, isEnabled, editor) {
        if (!isEnabled) {
            return null;
        }
        if (!editor.hasModel()) {
            return null;
        }
        const s = editor.getSelection();
        if (s.startLineNumber !== s.endLineNumber) {
            // multiline forbidden for perf reasons
            return null;
        }
        const multiCursorController = MultiCursorSelectionController.get(editor);
        if (!multiCursorController) {
            return null;
        }
        const findController = CommonFindController.get(editor);
        if (!findController) {
            return null;
        }
        let r = multiCursorController.getSession(findController);
        if (!r) {
            const allSelections = editor.getSelections();
            if (allSelections.length > 1) {
                const findState = findController.getState();
                const matchCase = findState.matchCase;
                const selectionsContainSameText = modelRangesContainSameText(editor.getModel(), allSelections, matchCase);
                if (!selectionsContainSameText) {
                    return null;
                }
            }
            r = MultiCursorSession.create(editor, findController);
        }
        if (!r) {
            return null;
        }
        if (r.currentMatch) {
            // This is an empty selection
            // Do not interfere with semantic word highlighting in the no selection case
            return null;
        }
        if (/^[ \t]+$/.test(r.searchText)) {
            // whitespace only selection
            return null;
        }
        if (r.searchText.length > 200) {
            // very long selection
            return null;
        }
        // TODO: better handling of this case
        const findState = findController.getState();
        const caseSensitive = findState.matchCase;
        // Return early if the find widget shows the exact same matches
        if (findState.isRevealed) {
            let findStateSearchString = findState.searchString;
            if (!caseSensitive) {
                findStateSearchString = findStateSearchString.toLowerCase();
            }
            let mySearchString = r.searchText;
            if (!caseSensitive) {
                mySearchString = mySearchString.toLowerCase();
            }
            if (findStateSearchString === mySearchString && r.matchCase === findState.matchCase && r.wholeWord === findState.wholeWord && !findState.isRegex) {
                return null;
            }
        }
        return new SelectionHighlighterState(editor.getModel(), r.searchText, r.matchCase, r.wholeWord ? editor.getOption(136 /* EditorOption.wordSeparators */) : null, oldState);
    }
    _setState(newState) {
        this.state = newState;
        if (!this.state) {
            this._decorations.clear();
            return;
        }
        if (!this.editor.hasModel()) {
            return;
        }
        const model = this.editor.getModel();
        if (model.isTooLargeForTokenization()) {
            // the file is too large, so searching word under cursor in the whole document would be blocking the UI.
            return;
        }
        const allMatches = this.state.findMatches();
        const selections = this.editor.getSelections();
        selections.sort(Range.compareRangesUsingStarts);
        // do not overlap with selection (issue #64 and #512)
        const matches = [];
        for (let i = 0, j = 0, len = allMatches.length, lenJ = selections.length; i < len;) {
            const match = allMatches[i];
            if (j >= lenJ) {
                // finished all editor selections
                matches.push(match);
                i++;
            }
            else {
                const cmp = Range.compareRangesUsingStarts(match, selections[j]);
                if (cmp < 0) {
                    // match is before sel
                    if (selections[j].isEmpty() || !Range.areIntersecting(match, selections[j])) {
                        matches.push(match);
                    }
                    i++;
                }
                else if (cmp > 0) {
                    // sel is before match
                    j++;
                }
                else {
                    // sel is equal to match
                    i++;
                    j++;
                }
            }
        }
        const occurrenceHighlighting = this.editor.getOption(82 /* EditorOption.occurrencesHighlight */) !== 'off';
        const hasSemanticHighlights = this._languageFeaturesService.documentHighlightProvider.has(model) && occurrenceHighlighting;
        const decorations = matches.map(r => {
            return {
                range: r,
                options: getSelectionHighlightDecorationOptions(hasSemanticHighlights)
            };
        });
        this._decorations.set(decorations);
    }
    dispose() {
        this._setState(null);
        super.dispose();
    }
};
SelectionHighlighter = SelectionHighlighter_1 = __decorate([
    __param(1, ILanguageFeaturesService)
], SelectionHighlighter);
export { SelectionHighlighter };
function modelRangesContainSameText(model, ranges, matchCase) {
    const selectedText = getValueInRange(model, ranges[0], !matchCase);
    for (let i = 1, len = ranges.length; i < len; i++) {
        const range = ranges[i];
        if (range.isEmpty()) {
            return false;
        }
        const thisSelectedText = getValueInRange(model, range, !matchCase);
        if (selectedText !== thisSelectedText) {
            return false;
        }
    }
    return true;
}
function getValueInRange(model, range, toLowerCase) {
    const text = model.getValueInRange(range);
    return (toLowerCase ? text.toLowerCase() : text);
}
export class FocusNextCursor extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.focusNextCursor',
            label: nls.localize2('mutlicursor.focusNextCursor', "Focus Next Cursor"),
            metadata: {
                description: nls.localize('mutlicursor.focusNextCursor.description', "Focuses the next cursor"),
                args: [],
            },
            precondition: undefined
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const viewModel = editor._getViewModel();
        if (viewModel.cursorConfig.readOnly) {
            return;
        }
        viewModel.model.pushStackElement();
        const previousCursorState = Array.from(viewModel.getCursorStates());
        const firstCursor = previousCursorState.shift();
        if (!firstCursor) {
            return;
        }
        previousCursorState.push(firstCursor);
        viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, previousCursorState);
        viewModel.revealPrimaryCursor(args.source, true);
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
export class FocusPreviousCursor extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.focusPreviousCursor',
            label: nls.localize2('mutlicursor.focusPreviousCursor', "Focus Previous Cursor"),
            metadata: {
                description: nls.localize('mutlicursor.focusPreviousCursor.description', "Focuses the previous cursor"),
                args: [],
            },
            precondition: undefined
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const viewModel = editor._getViewModel();
        if (viewModel.cursorConfig.readOnly) {
            return;
        }
        viewModel.model.pushStackElement();
        const previousCursorState = Array.from(viewModel.getCursorStates());
        const firstCursor = previousCursorState.pop();
        if (!firstCursor) {
            return;
        }
        previousCursorState.unshift(firstCursor);
        viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, previousCursorState);
        viewModel.revealPrimaryCursor(args.source, true);
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
registerEditorContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorContribution(SelectionHighlighter.ID, SelectionHighlighter, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorAction(InsertCursorAbove);
registerEditorAction(InsertCursorBelow);
registerEditorAction(InsertCursorAtEndOfEachLineSelected);
registerEditorAction(AddSelectionToNextFindMatchAction);
registerEditorAction(AddSelectionToPreviousFindMatchAction);
registerEditorAction(MoveSelectionToNextFindMatchAction);
registerEditorAction(MoveSelectionToPreviousFindMatchAction);
registerEditorAction(SelectHighlightsAction);
registerEditorAction(CompatChangeAll);
registerEditorAction(InsertCursorAtEndOfLineSelected);
registerEditorAction(InsertCursorAtTopOfLineSelected);
registerEditorAction(FocusNextCursor);
registerEditorAction(FocusPreviousCursor);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGljdXJzb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbXVsdGljdXJzb3IvYnJvd3Nlci9tdWx0aWN1cnNvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUduRixPQUFPLEVBQUUsWUFBWSxFQUFtQyxvQkFBb0IsRUFBRSwwQkFBMEIsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUl6SyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTVFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsc0NBQXNDLEVB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