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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9maW5kL2ZpbmRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRTdHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXpHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQWlGLE1BQU0sMEJBQTBCLENBQUM7QUFHeEksT0FBTyxFQUFFLFFBQVEsRUFBd0IsdUJBQXVCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU1RyxNQUFNLE9BQU8sa0JBQWtCO0lBSzlCLElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUM7SUFDbEUsQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDN0Is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