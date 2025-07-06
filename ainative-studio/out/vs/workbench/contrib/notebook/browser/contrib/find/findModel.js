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
import { findFirstIdxMonotonousOrArrLen } from '../../../../../../base/common/arraysFind.js';
import { createCancelablePromise, Delayer } from '../../../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { PrefixSumComputer } from '../../../../../../editor/common/model/prefixSumComputer.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { FindMatchDecorationModel } from './findMatchDecorationModel.js';
import { CellEditState } from '../../notebookBrowser.js';
import { CellKind, NotebookCellsChangeType } from '../../../common/notebookCommon.js';
export class CellFindMatchModel {
    get length() {
        return this._contentMatches.length + this._webviewMatches.length;
    }
    get contentMatches() {
        return this._contentMatches;
    }
    get webviewMatches() {
        return this._webviewMatches;
    }
    constructor(cell, index, contentMatches, webviewMatches) {
        this.cell = cell;
        this.index = index;
        this._contentMatches = contentMatches;
        this._webviewMatches = webviewMatches;
    }
    getMatch(index) {
        if (index >= this.length) {
            throw new Error('NotebookCellFindMatch: index out of range');
        }
        if (index < this._contentMatches.length) {
            return this._contentMatches[index];
        }
        return this._webviewMatches[index - this._contentMatches.length];
    }
}
let FindModel = class FindModel extends Disposable {
    get findMatches() {
        return this._findMatches;
    }
    get currentMatch() {
        return this._currentMatch;
    }
    constructor(_notebookEditor, _state, _configurationService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._state = _state;
        this._configurationService = _configurationService;
        this._findMatches = [];
        this._findMatchesStarts = null;
        this._currentMatch = -1;
        this._computePromise = null;
        this._modelDisposable = this._register(new DisposableStore());
        this._throttledDelayer = new Delayer(20);
        this._computePromise = null;
        this._register(_state.onFindReplaceStateChange(e => {
            this._updateCellStates(e);
            if (e.searchString || e.isRegex || e.matchCase || e.searchScope || e.wholeWord || (e.isRevealed && this._state.isRevealed) || e.filters || e.isReplaceRevealed) {
                this.research();
            }
            if (e.isRevealed && !this._state.isRevealed) {
                this.clear();
            }
        }));
        this._register(this._notebookEditor.onDidChangeModel(e => {
            this._registerModelListener(e);
        }));
        this._register(this._notebookEditor.onDidChangeCellState(e => {
            if (e.cell.cellKind === CellKind.Markup && e.source.editStateChanged) {
                // research when markdown cell is switching between markdown preview and editing mode.
                this.research();
            }
        }));
        if (this._notebookEditor.hasModel()) {
            this._registerModelListener(this._notebookEditor.textModel);
        }
        this._findMatchDecorationModel = new FindMatchDecorationModel(this._notebookEditor, this._notebookEditor.getId());
    }
    _updateCellStates(e) {
        if (!this._state.filters?.markupInput || !this._state.filters?.markupPreview || !this._state.filters?.findScope) {
            return;
        }
        // we only update cell state if users are using the hybrid mode (both input and preview are enabled)
        const updateEditingState = () => {
            const viewModel = this._notebookEditor.getViewModel();
            if (!viewModel) {
                return;
            }
            // search markup sources first to decide if a markup cell should be in editing mode
            const wordSeparators = this._configurationService.inspect('editor.wordSeparators').value;
            const options = {
                regex: this._state.isRegex,
                wholeWord: this._state.wholeWord,
                caseSensitive: this._state.matchCase,
                wordSeparators: wordSeparators,
                includeMarkupInput: true,
                includeCodeInput: false,
                includeMarkupPreview: false,
                includeOutput: false,
                findScope: this._state.filters?.findScope,
            };
            const contentMatches = viewModel.find(this._state.searchString, options);
            for (let i = 0; i < viewModel.length; i++) {
                const cell = viewModel.cellAt(i);
                if (cell && cell.cellKind === CellKind.Markup) {
                    const foundContentMatch = contentMatches.find(m => m.cell.handle === cell.handle && m.contentMatches.length > 0);
                    const targetState = foundContentMatch ? CellEditState.Editing : CellEditState.Preview;
                    const currentEditingState = cell.getEditState();
                    if (currentEditingState === CellEditState.Editing && cell.editStateSource !== 'find') {
                        // it's already in editing mode, we should not update
                        continue;
                    }
                    if (currentEditingState !== targetState) {
                        cell.updateEditState(targetState, 'find');
                    }
                }
            }
        };
        if (e.isReplaceRevealed && !this._state.isReplaceRevealed) {
            // replace is hidden, we need to switch all markdown cells to preview mode
            const viewModel = this._notebookEditor.getViewModel();
            if (!viewModel) {
                return;
            }
            for (let i = 0; i < viewModel.length; i++) {
                const cell = viewModel.cellAt(i);
                if (cell && cell.cellKind === CellKind.Markup) {
                    if (cell.getEditState() === CellEditState.Editing && cell.editStateSource === 'find') {
                        cell.updateEditState(CellEditState.Preview, 'find');
                    }
                }
            }
            return;
        }
        if (e.isReplaceRevealed) {
            updateEditingState();
        }
        else if ((e.filters || e.isRevealed || e.searchString || e.replaceString) && this._state.isRevealed && this._state.isReplaceRevealed) {
            updateEditingState();
        }
    }
    ensureFindMatches() {
        if (!this._findMatchesStarts) {
            this.set(this._findMatches, true);
        }
    }
    getCurrentMatch() {
        const nextIndex = this._findMatchesStarts.getIndexOf(this._currentMatch);
        const cell = this._findMatches[nextIndex.index].cell;
        const match = this._findMatches[nextIndex.index].getMatch(nextIndex.remainder);
        return {
            cell,
            match,
            isModelMatch: nextIndex.remainder < this._findMatches[nextIndex.index].contentMatches.length
        };
    }
    refreshCurrentMatch(focus) {
        const findMatchIndex = this.findMatches.findIndex(match => match.cell === focus.cell);
        if (findMatchIndex === -1) {
            return;
        }
        const findMatch = this.findMatches[findMatchIndex];
        const index = findMatch.contentMatches.findIndex(match => match.range.intersectRanges(focus.range) !== null);
        if (index === undefined) {
            return;
        }
        const matchesBefore = findMatchIndex === 0 ? 0 : (this._findMatchesStarts?.getPrefixSum(findMatchIndex - 1) ?? 0);
        this._currentMatch = matchesBefore + index;
        this.highlightCurrentFindMatchDecoration(findMatchIndex, index).then(offset => {
            this.revealCellRange(findMatchIndex, index, offset);
            this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
        });
    }
    find(option) {
        if (!this.findMatches.length) {
            return;
        }
        // let currCell;
        if (!this._findMatchesStarts) {
            this.set(this._findMatches, true);
            if ('index' in option) {
                this._currentMatch = option.index;
            }
        }
        else {
            // const currIndex = this._findMatchesStarts!.getIndexOf(this._currentMatch);
            // currCell = this._findMatches[currIndex.index].cell;
            const totalVal = this._findMatchesStarts.getTotalSum();
            if ('index' in option) {
                this._currentMatch = option.index;
            }
            else if (this._currentMatch === -1) {
                this._currentMatch = option.previous ? totalVal - 1 : 0;
            }
            else {
                const nextVal = (this._currentMatch + (option.previous ? -1 : 1) + totalVal) % totalVal;
                this._currentMatch = nextVal;
            }
        }
        const nextIndex = this._findMatchesStarts.getIndexOf(this._currentMatch);
        // const newFocusedCell = this._findMatches[nextIndex.index].cell;
        this.highlightCurrentFindMatchDecoration(nextIndex.index, nextIndex.remainder).then(offset => {
            this.revealCellRange(nextIndex.index, nextIndex.remainder, offset);
            this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
        });
    }
    revealCellRange(cellIndex, matchIndex, outputOffset) {
        const findMatch = this._findMatches[cellIndex];
        if (matchIndex >= findMatch.contentMatches.length) {
            // reveal output range
            this._notebookEditor.focusElement(findMatch.cell);
            const index = this._notebookEditor.getCellIndex(findMatch.cell);
            if (index !== undefined) {
                // const range: ICellRange = { start: index, end: index + 1 };
                this._notebookEditor.revealCellOffsetInCenter(findMatch.cell, outputOffset ?? 0);
            }
        }
        else {
            const match = findMatch.getMatch(matchIndex);
            if (findMatch.cell.getEditState() !== CellEditState.Editing) {
                findMatch.cell.updateEditState(CellEditState.Editing, 'find');
            }
            findMatch.cell.isInputCollapsed = false;
            this._notebookEditor.focusElement(findMatch.cell);
            this._notebookEditor.setCellEditorSelection(findMatch.cell, match.range);
            this._notebookEditor.revealRangeInCenterIfOutsideViewportAsync(findMatch.cell, match.range);
        }
    }
    _registerModelListener(notebookTextModel) {
        this._modelDisposable.clear();
        if (notebookTextModel) {
            this._modelDisposable.add(notebookTextModel.onDidChangeContent((e) => {
                if (!e.rawEvents.some(event => event.kind === NotebookCellsChangeType.ChangeCellContent || event.kind === NotebookCellsChangeType.ModelChange)) {
                    return;
                }
                this.research();
            }));
        }
        this.research();
    }
    async research() {
        return this._throttledDelayer.trigger(async () => {
            this._state.change({ isSearching: true }, false);
            await this._research();
            this._state.change({ isSearching: false }, false);
        });
    }
    async _research() {
        this._computePromise?.cancel();
        if (!this._state.isRevealed || !this._notebookEditor.hasModel()) {
            this.set([], false);
            return;
        }
        this._computePromise = createCancelablePromise(token => this._compute(token));
        const findMatches = await this._computePromise;
        if (!findMatches) {
            this.set([], false);
            return;
        }
        if (findMatches.length === 0) {
            this.set([], false);
            return;
        }
        const findFirstMatchAfterCellIndex = (cellIndex) => {
            const matchAfterSelection = findFirstIdxMonotonousOrArrLen(findMatches.map(match => match.index), index => index >= cellIndex);
            this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection));
        };
        if (this._currentMatch === -1) {
            // no active current match
            if (this._notebookEditor.getLength() === 0) {
                this.set(findMatches, false);
                return;
            }
            else {
                const focus = this._notebookEditor.getFocus().start;
                findFirstMatchAfterCellIndex(focus);
                this.set(findMatches, false);
                return;
            }
        }
        const oldCurrIndex = this._findMatchesStarts.getIndexOf(this._currentMatch);
        const oldCurrCell = this._findMatches[oldCurrIndex.index].cell;
        const oldCurrMatchCellIndex = this._notebookEditor.getCellIndex(oldCurrCell);
        if (oldCurrMatchCellIndex < 0) {
            // the cell containing the active match is deleted
            if (this._notebookEditor.getLength() === 0) {
                this.set(findMatches, false);
                return;
            }
            findFirstMatchAfterCellIndex(oldCurrMatchCellIndex);
            return;
        }
        // the cell still exist
        const cell = this._notebookEditor.cellAt(oldCurrMatchCellIndex);
        // we will try restore the active find match in this cell, if it contains any find match
        if (cell.cellKind === CellKind.Markup && cell.getEditState() === CellEditState.Preview) {
            // find first match in this cell or below
            findFirstMatchAfterCellIndex(oldCurrMatchCellIndex);
            return;
        }
        // the cell is a markup cell in editing mode or a code cell, both should have monaco editor rendered
        if (!this._findMatchDecorationModel.currentMatchDecorations) {
            // no current highlight decoration
            findFirstMatchAfterCellIndex(oldCurrMatchCellIndex);
            return;
        }
        // check if there is monaco editor selection and find the first match, otherwise find the first match above current cell
        // this._findMatches[cellIndex].matches[matchIndex].range
        if (this._findMatchDecorationModel.currentMatchDecorations.kind === 'input') {
            const currentMatchDecorationId = this._findMatchDecorationModel.currentMatchDecorations.decorations.find(decoration => decoration.ownerId === cell.handle);
            if (!currentMatchDecorationId) {
                // current match decoration is no longer valid
                findFirstMatchAfterCellIndex(oldCurrMatchCellIndex);
                return;
            }
            const matchAfterSelection = findFirstIdxMonotonousOrArrLen(findMatches, match => match.index >= oldCurrMatchCellIndex) % findMatches.length;
            if (findMatches[matchAfterSelection].index > oldCurrMatchCellIndex) {
                // there is no search result in curr cell anymore, find the nearest one (from top to bottom)
                this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection));
                return;
            }
            else {
                // there are still some search results in current cell
                let currMatchRangeInEditor = cell.editorAttached && currentMatchDecorationId.decorations[0] ? cell.getCellDecorationRange(currentMatchDecorationId.decorations[0]) : null;
                if (currMatchRangeInEditor === null && oldCurrIndex.remainder < this._findMatches[oldCurrIndex.index].contentMatches.length) {
                    currMatchRangeInEditor = this._findMatches[oldCurrIndex.index].getMatch(oldCurrIndex.remainder).range;
                }
                if (currMatchRangeInEditor !== null) {
                    // we find a range for the previous current match, let's find the nearest one after it (can overlap)
                    const cellMatch = findMatches[matchAfterSelection];
                    const matchAfterOldSelection = findFirstIdxMonotonousOrArrLen(cellMatch.contentMatches, match => Range.compareRangesUsingStarts(match.range, currMatchRangeInEditor) >= 0);
                    this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection) + matchAfterOldSelection);
                }
                else {
                    // no range found, let's fall back to finding the nearest match
                    this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection));
                    return;
                }
            }
        }
        else {
            // output now has the highlight
            const matchAfterSelection = findFirstIdxMonotonousOrArrLen(findMatches.map(match => match.index), index => index >= oldCurrMatchCellIndex) % findMatches.length;
            this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection));
        }
    }
    set(cellFindMatches, autoStart) {
        if (!cellFindMatches || !cellFindMatches.length) {
            this._findMatches = [];
            this._findMatchDecorationModel.setAllFindMatchesDecorations([]);
            this.constructFindMatchesStarts();
            this._currentMatch = -1;
            this._findMatchDecorationModel.clearCurrentFindMatchDecoration();
            this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
            return;
        }
        // all matches
        this._findMatches = cellFindMatches;
        this._findMatchDecorationModel.setAllFindMatchesDecorations(cellFindMatches || []);
        // current match
        this.constructFindMatchesStarts();
        if (autoStart) {
            this._currentMatch = 0;
            this.highlightCurrentFindMatchDecoration(0, 0);
        }
        this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
    }
    async _compute(token) {
        if (!this._notebookEditor.hasModel()) {
            return null;
        }
        let ret = null;
        const val = this._state.searchString;
        const wordSeparators = this._configurationService.inspect('editor.wordSeparators').value;
        const options = {
            regex: this._state.isRegex,
            wholeWord: this._state.wholeWord,
            caseSensitive: this._state.matchCase,
            wordSeparators: wordSeparators,
            includeMarkupInput: this._state.filters?.markupInput ?? true,
            includeCodeInput: this._state.filters?.codeInput ?? true,
            includeMarkupPreview: !!this._state.filters?.markupPreview,
            includeOutput: !!this._state.filters?.codeOutput,
            findScope: this._state.filters?.findScope,
        };
        ret = await this._notebookEditor.find(val, options, token);
        if (token.isCancellationRequested) {
            return null;
        }
        return ret;
    }
    _updateCurrentMatch(findMatches, currentMatchesPosition) {
        this._currentMatch = currentMatchesPosition % findMatches.length;
        this.set(findMatches, false);
        const nextIndex = this._findMatchesStarts.getIndexOf(this._currentMatch);
        this.highlightCurrentFindMatchDecoration(nextIndex.index, nextIndex.remainder);
        this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
    }
    _matchesCountBeforeIndex(findMatches, index) {
        let prevMatchesCount = 0;
        for (let i = 0; i < index; i++) {
            prevMatchesCount += findMatches[i].length;
        }
        return prevMatchesCount;
    }
    constructFindMatchesStarts() {
        if (this._findMatches && this._findMatches.length) {
            const values = new Uint32Array(this._findMatches.length);
            for (let i = 0; i < this._findMatches.length; i++) {
                values[i] = this._findMatches[i].length;
            }
            this._findMatchesStarts = new PrefixSumComputer(values);
        }
        else {
            this._findMatchesStarts = null;
        }
    }
    async highlightCurrentFindMatchDecoration(cellIndex, matchIndex) {
        const cell = this._findMatches[cellIndex].cell;
        const match = this._findMatches[cellIndex].getMatch(matchIndex);
        if (matchIndex < this._findMatches[cellIndex].contentMatches.length) {
            return this._findMatchDecorationModel.highlightCurrentFindMatchDecorationInCell(cell, match.range);
        }
        else {
            return this._findMatchDecorationModel.highlightCurrentFindMatchDecorationInWebview(cell, match.index);
        }
    }
    clear() {
        this._computePromise?.cancel();
        this._throttledDelayer.cancel();
        this.set([], false);
    }
    dispose() {
        this._findMatchDecorationModel.dispose();
        super.dispose();
    }
};
FindModel = __decorate([
    __param(2, IConfigurationService)
], FindModel);
export { FindModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2ZpbmQvZmluZE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdGLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFN0csT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN6RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFL0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBaUYsTUFBTSwwQkFBMEIsQ0FBQztBQUd4SSxPQUFPLEVBQUUsUUFBUSxFQUF3Qix1QkFBdUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTVHLE1BQU0sT0FBTyxrQkFBa0I7SUFLOUIsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQztJQUNsRSxDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM3QixD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