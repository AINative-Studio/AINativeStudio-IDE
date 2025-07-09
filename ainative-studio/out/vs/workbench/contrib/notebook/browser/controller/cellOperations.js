/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { ResourceNotebookCellEdit } from '../../../bulkEdit/browser/bulkCellEdits.js';
import { CellEditState, CellFocusMode, expandCellRangesWithHiddenCells } from '../notebookBrowser.js';
import { cloneNotebookCellTextModel } from '../../common/model/notebookCellTextModel.js';
import { CellKind, SelectionStateType } from '../../common/notebookCommon.js';
import { cellRangeContains, cellRangesToIndexes } from '../../common/notebookRange.js';
import { localize } from '../../../../../nls.js';
export async function changeCellToKind(kind, context, language, mime) {
    const { notebookEditor } = context;
    if (!notebookEditor.hasModel()) {
        return;
    }
    if (notebookEditor.isReadOnly) {
        return;
    }
    if (context.ui && context.cell) {
        // action from UI
        const { cell } = context;
        if (cell.cellKind === kind) {
            return;
        }
        const text = cell.getText();
        const idx = notebookEditor.getCellIndex(cell);
        if (language === undefined) {
            const availableLanguages = notebookEditor.activeKernel?.supportedLanguages ?? [];
            language = availableLanguages[0] ?? PLAINTEXT_LANGUAGE_ID;
        }
        notebookEditor.textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: idx,
                count: 1,
                cells: [{
                        cellKind: kind,
                        source: text,
                        language: language,
                        mime: mime ?? cell.mime,
                        outputs: cell.model.outputs,
                        metadata: cell.metadata,
                    }]
            }
        ], true, {
            kind: SelectionStateType.Index,
            focus: notebookEditor.getFocus(),
            selections: notebookEditor.getSelections()
        }, () => {
            return {
                kind: SelectionStateType.Index,
                focus: notebookEditor.getFocus(),
                selections: notebookEditor.getSelections()
            };
        }, undefined, true);
        const newCell = notebookEditor.cellAt(idx);
        await notebookEditor.focusNotebookCell(newCell, cell.getEditState() === CellEditState.Editing ? 'editor' : 'container');
    }
    else if (context.selectedCells) {
        const selectedCells = context.selectedCells;
        const rawEdits = [];
        selectedCells.forEach(cell => {
            if (cell.cellKind === kind) {
                return;
            }
            const text = cell.getText();
            const idx = notebookEditor.getCellIndex(cell);
            if (language === undefined) {
                const availableLanguages = notebookEditor.activeKernel?.supportedLanguages ?? [];
                language = availableLanguages[0] ?? PLAINTEXT_LANGUAGE_ID;
            }
            rawEdits.push({
                editType: 1 /* CellEditType.Replace */,
                index: idx,
                count: 1,
                cells: [{
                        cellKind: kind,
                        source: text,
                        language: language,
                        mime: mime ?? cell.mime,
                        outputs: cell.model.outputs,
                        metadata: cell.metadata,
                    }]
            });
        });
        notebookEditor.textModel.applyEdits(rawEdits, true, {
            kind: SelectionStateType.Index,
            focus: notebookEditor.getFocus(),
            selections: notebookEditor.getSelections()
        }, () => {
            return {
                kind: SelectionStateType.Index,
                focus: notebookEditor.getFocus(),
                selections: notebookEditor.getSelections()
            };
        }, undefined, true);
    }
}
export function runDeleteAction(editor, cell) {
    const textModel = editor.textModel;
    const selections = editor.getSelections();
    const targetCellIndex = editor.getCellIndex(cell);
    const containingSelection = selections.find(selection => selection.start <= targetCellIndex && targetCellIndex < selection.end);
    const computeUndoRedo = !editor.isReadOnly || textModel.viewType === 'interactive';
    if (containingSelection) {
        const edits = selections.reverse().map(selection => ({
            editType: 1 /* CellEditType.Replace */, index: selection.start, count: selection.end - selection.start, cells: []
        }));
        const nextCellAfterContainingSelection = containingSelection.end >= editor.getLength() ? undefined : editor.cellAt(containingSelection.end);
        textModel.applyEdits(edits, true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: editor.getSelections() }, () => {
            if (nextCellAfterContainingSelection) {
                const cellIndex = textModel.cells.findIndex(cell => cell.handle === nextCellAfterContainingSelection.handle);
                return { kind: SelectionStateType.Index, focus: { start: cellIndex, end: cellIndex + 1 }, selections: [{ start: cellIndex, end: cellIndex + 1 }] };
            }
            else {
                if (textModel.length) {
                    const lastCellIndex = textModel.length - 1;
                    return { kind: SelectionStateType.Index, focus: { start: lastCellIndex, end: lastCellIndex + 1 }, selections: [{ start: lastCellIndex, end: lastCellIndex + 1 }] };
                }
                else {
                    return { kind: SelectionStateType.Index, focus: { start: 0, end: 0 }, selections: [{ start: 0, end: 0 }] };
                }
            }
        }, undefined, computeUndoRedo);
    }
    else {
        const focus = editor.getFocus();
        const edits = [{
                editType: 1 /* CellEditType.Replace */, index: targetCellIndex, count: 1, cells: []
            }];
        const finalSelections = [];
        for (let i = 0; i < selections.length; i++) {
            const selection = selections[i];
            if (selection.end <= targetCellIndex) {
                finalSelections.push(selection);
            }
            else if (selection.start > targetCellIndex) {
                finalSelections.push({ start: selection.start - 1, end: selection.end - 1 });
            }
            else {
                finalSelections.push({ start: targetCellIndex, end: targetCellIndex + 1 });
            }
        }
        if (editor.cellAt(focus.start) === cell) {
            // focus is the target, focus is also not part of any selection
            const newFocus = focus.end === textModel.length ? { start: focus.start - 1, end: focus.end - 1 } : focus;
            textModel.applyEdits(edits, true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: editor.getSelections() }, () => ({
                kind: SelectionStateType.Index, focus: newFocus, selections: finalSelections
            }), undefined, computeUndoRedo);
        }
        else {
            // users decide to delete a cell out of current focus/selection
            const newFocus = focus.start > targetCellIndex ? { start: focus.start - 1, end: focus.end - 1 } : focus;
            textModel.applyEdits(edits, true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: editor.getSelections() }, () => ({
                kind: SelectionStateType.Index, focus: newFocus, selections: finalSelections
            }), undefined, computeUndoRedo);
        }
    }
}
export async function moveCellRange(context, direction) {
    if (!context.notebookEditor.hasModel()) {
        return;
    }
    const editor = context.notebookEditor;
    const textModel = editor.textModel;
    if (editor.isReadOnly) {
        return;
    }
    let range = undefined;
    if (context.cell) {
        const idx = editor.getCellIndex(context.cell);
        range = { start: idx, end: idx + 1 };
    }
    else {
        const selections = editor.getSelections();
        const modelRanges = expandCellRangesWithHiddenCells(editor, selections);
        range = modelRanges[0];
    }
    if (!range || range.start === range.end) {
        return;
    }
    if (direction === 'up') {
        if (range.start === 0) {
            return;
        }
        const indexAbove = range.start - 1;
        const finalSelection = { start: range.start - 1, end: range.end - 1 };
        const focus = context.notebookEditor.getFocus();
        const newFocus = cellRangeContains(range, focus) ? { start: focus.start - 1, end: focus.end - 1 } : { start: range.start - 1, end: range.start };
        textModel.applyEdits([
            {
                editType: 6 /* CellEditType.Move */,
                index: indexAbove,
                length: 1,
                newIdx: range.end - 1
            }
        ], true, {
            kind: SelectionStateType.Index,
            focus: editor.getFocus(),
            selections: editor.getSelections()
        }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: [finalSelection] }), undefined, true);
        const focusRange = editor.getSelections()[0] ?? editor.getFocus();
        editor.revealCellRangeInView(focusRange);
    }
    else {
        if (range.end >= textModel.length) {
            return;
        }
        const indexBelow = range.end;
        const finalSelection = { start: range.start + 1, end: range.end + 1 };
        const focus = editor.getFocus();
        const newFocus = cellRangeContains(range, focus) ? { start: focus.start + 1, end: focus.end + 1 } : { start: range.start + 1, end: range.start + 2 };
        textModel.applyEdits([
            {
                editType: 6 /* CellEditType.Move */,
                index: indexBelow,
                length: 1,
                newIdx: range.start
            }
        ], true, {
            kind: SelectionStateType.Index,
            focus: editor.getFocus(),
            selections: editor.getSelections()
        }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: [finalSelection] }), undefined, true);
        const focusRange = editor.getSelections()[0] ?? editor.getFocus();
        editor.revealCellRangeInView(focusRange);
    }
}
export async function copyCellRange(context, direction) {
    const editor = context.notebookEditor;
    if (!editor.hasModel()) {
        return;
    }
    const textModel = editor.textModel;
    if (editor.isReadOnly) {
        return;
    }
    let range = undefined;
    if (context.ui) {
        const targetCell = context.cell;
        const targetCellIndex = editor.getCellIndex(targetCell);
        range = { start: targetCellIndex, end: targetCellIndex + 1 };
    }
    else {
        const selections = editor.getSelections();
        const modelRanges = expandCellRangesWithHiddenCells(editor, selections);
        range = modelRanges[0];
    }
    if (!range || range.start === range.end) {
        return;
    }
    if (direction === 'up') {
        // insert up, without changing focus and selections
        const focus = editor.getFocus();
        const selections = editor.getSelections();
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: range.end,
                count: 0,
                cells: cellRangesToIndexes([range]).map(index => cloneNotebookCellTextModel(editor.cellAt(index).model))
            }
        ], true, {
            kind: SelectionStateType.Index,
            focus: focus,
            selections: selections
        }, () => ({ kind: SelectionStateType.Index, focus: focus, selections: selections }), undefined, true);
    }
    else {
        // insert down, move selections
        const focus = editor.getFocus();
        const selections = editor.getSelections();
        const newCells = cellRangesToIndexes([range]).map(index => cloneNotebookCellTextModel(editor.cellAt(index).model));
        const countDelta = newCells.length;
        const newFocus = context.ui ? focus : { start: focus.start + countDelta, end: focus.end + countDelta };
        const newSelections = context.ui ? selections : [{ start: range.start + countDelta, end: range.end + countDelta }];
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: range.end,
                count: 0,
                cells: cellRangesToIndexes([range]).map(index => cloneNotebookCellTextModel(editor.cellAt(index).model))
            }
        ], true, {
            kind: SelectionStateType.Index,
            focus: focus,
            selections: selections
        }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: newSelections }), undefined, true);
        const focusRange = editor.getSelections()[0] ?? editor.getFocus();
        editor.revealCellRangeInView(focusRange);
    }
}
export async function joinSelectedCells(bulkEditService, notificationService, context) {
    const editor = context.notebookEditor;
    if (editor.isReadOnly) {
        return;
    }
    const edits = [];
    const cells = [];
    for (const selection of editor.getSelections()) {
        cells.push(...editor.getCellsInRange(selection));
    }
    if (cells.length <= 1) {
        return;
    }
    // check if all cells are of the same kind
    const cellKind = cells[0].cellKind;
    const isSameKind = cells.every(cell => cell.cellKind === cellKind);
    if (!isSameKind) {
        // cannot join cells of different kinds
        // show warning and quit
        const message = localize('notebookActions.joinSelectedCells', "Cannot join cells of different kinds");
        return notificationService.warn(message);
    }
    // merge all cells content into first cell
    const firstCell = cells[0];
    const insertContent = cells.map(cell => cell.getText()).join(firstCell.textBuffer.getEOL());
    const firstSelection = editor.getSelections()[0];
    edits.push(new ResourceNotebookCellEdit(editor.textModel.uri, {
        editType: 1 /* CellEditType.Replace */,
        index: firstSelection.start,
        count: firstSelection.end - firstSelection.start,
        cells: [{
                cellKind: firstCell.cellKind,
                source: insertContent,
                language: firstCell.language,
                mime: firstCell.mime,
                outputs: firstCell.model.outputs,
                metadata: firstCell.metadata,
            }]
    }));
    for (const selection of editor.getSelections().slice(1)) {
        edits.push(new ResourceNotebookCellEdit(editor.textModel.uri, {
            editType: 1 /* CellEditType.Replace */,
            index: selection.start,
            count: selection.end - selection.start,
            cells: []
        }));
    }
    if (edits.length) {
        await bulkEditService.apply(edits, { quotableLabel: localize('notebookActions.joinSelectedCells.label', "Join Notebook Cells") });
    }
}
export async function joinNotebookCells(editor, range, direction, constraint) {
    if (editor.isReadOnly) {
        return null;
    }
    const textModel = editor.textModel;
    const cells = editor.getCellsInRange(range);
    if (!cells.length) {
        return null;
    }
    if (range.start === 0 && direction === 'above') {
        return null;
    }
    if (range.end === textModel.length && direction === 'below') {
        return null;
    }
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (constraint && cell.cellKind !== constraint) {
            return null;
        }
    }
    if (direction === 'above') {
        const above = editor.cellAt(range.start - 1);
        if (constraint && above.cellKind !== constraint) {
            return null;
        }
        const insertContent = cells.map(cell => (cell.textBuffer.getEOL() ?? '') + cell.getText()).join('');
        const aboveCellLineCount = above.textBuffer.getLineCount();
        const aboveCellLastLineEndColumn = above.textBuffer.getLineLength(aboveCellLineCount);
        return {
            edits: [
                new ResourceTextEdit(above.uri, { range: new Range(aboveCellLineCount, aboveCellLastLineEndColumn + 1, aboveCellLineCount, aboveCellLastLineEndColumn + 1), text: insertContent }),
                new ResourceNotebookCellEdit(textModel.uri, {
                    editType: 1 /* CellEditType.Replace */,
                    index: range.start,
                    count: range.end - range.start,
                    cells: []
                })
            ],
            cell: above,
            endFocus: { start: range.start - 1, end: range.start },
            endSelections: [{ start: range.start - 1, end: range.start }]
        };
    }
    else {
        const below = editor.cellAt(range.end);
        if (constraint && below.cellKind !== constraint) {
            return null;
        }
        const cell = cells[0];
        const restCells = [...cells.slice(1), below];
        const insertContent = restCells.map(cl => (cl.textBuffer.getEOL() ?? '') + cl.getText()).join('');
        const cellLineCount = cell.textBuffer.getLineCount();
        const cellLastLineEndColumn = cell.textBuffer.getLineLength(cellLineCount);
        return {
            edits: [
                new ResourceTextEdit(cell.uri, { range: new Range(cellLineCount, cellLastLineEndColumn + 1, cellLineCount, cellLastLineEndColumn + 1), text: insertContent }),
                new ResourceNotebookCellEdit(textModel.uri, {
                    editType: 1 /* CellEditType.Replace */,
                    index: range.start + 1,
                    count: range.end - range.start,
                    cells: []
                })
            ],
            cell,
            endFocus: { start: range.start, end: range.start + 1 },
            endSelections: [{ start: range.start, end: range.start + 1 }]
        };
    }
}
export async function joinCellsWithSurrounds(bulkEditService, context, direction) {
    const editor = context.notebookEditor;
    const textModel = editor.textModel;
    const viewModel = editor.getViewModel();
    let ret = null;
    if (context.ui) {
        const focusMode = context.cell.focusMode;
        const cellIndex = editor.getCellIndex(context.cell);
        ret = await joinNotebookCells(editor, { start: cellIndex, end: cellIndex + 1 }, direction);
        if (!ret) {
            return;
        }
        await bulkEditService.apply(ret?.edits, { quotableLabel: 'Join Notebook Cells' });
        viewModel.updateSelectionsState({ kind: SelectionStateType.Index, focus: ret.endFocus, selections: ret.endSelections });
        ret.cell.updateEditState(CellEditState.Editing, 'joinCellsWithSurrounds');
        editor.revealCellRangeInView(editor.getFocus());
        if (focusMode === CellFocusMode.Editor) {
            ret.cell.focusMode = CellFocusMode.Editor;
        }
    }
    else {
        const selections = editor.getSelections();
        if (!selections.length) {
            return;
        }
        const focus = editor.getFocus();
        const focusMode = editor.cellAt(focus.start)?.focusMode;
        const edits = [];
        let cell = null;
        const cells = [];
        for (let i = selections.length - 1; i >= 0; i--) {
            const selection = selections[i];
            const containFocus = cellRangeContains(selection, focus);
            if (selection.end >= textModel.length && direction === 'below'
                || selection.start === 0 && direction === 'above') {
                if (containFocus) {
                    cell = editor.cellAt(focus.start);
                }
                cells.push(...editor.getCellsInRange(selection));
                continue;
            }
            const singleRet = await joinNotebookCells(editor, selection, direction);
            if (!singleRet) {
                return;
            }
            edits.push(...singleRet.edits);
            cells.push(singleRet.cell);
            if (containFocus) {
                cell = singleRet.cell;
            }
        }
        if (!edits.length) {
            return;
        }
        if (!cell || !cells.length) {
            return;
        }
        await bulkEditService.apply(edits, { quotableLabel: 'Join Notebook Cells' });
        cells.forEach(cell => {
            cell.updateEditState(CellEditState.Editing, 'joinCellsWithSurrounds');
        });
        viewModel.updateSelectionsState({ kind: SelectionStateType.Handle, primary: cell.handle, selections: cells.map(cell => cell.handle) });
        editor.revealCellRangeInView(editor.getFocus());
        const newFocusedCell = editor.cellAt(editor.getFocus().start);
        if (focusMode === CellFocusMode.Editor && newFocusedCell) {
            newFocusedCell.focusMode = CellFocusMode.Editor;
        }
    }
}
function _splitPointsToBoundaries(splitPoints, textBuffer) {
    const boundaries = [];
    const lineCnt = textBuffer.getLineCount();
    const getLineLen = (lineNumber) => {
        return textBuffer.getLineLength(lineNumber);
    };
    // split points need to be sorted
    splitPoints = splitPoints.sort((l, r) => {
        const lineDiff = l.lineNumber - r.lineNumber;
        const columnDiff = l.column - r.column;
        return lineDiff !== 0 ? lineDiff : columnDiff;
    });
    for (let sp of splitPoints) {
        if (getLineLen(sp.lineNumber) + 1 === sp.column && sp.column !== 1 /** empty line */ && sp.lineNumber < lineCnt) {
            sp = new Position(sp.lineNumber + 1, 1);
        }
        _pushIfAbsent(boundaries, sp);
    }
    if (boundaries.length === 0) {
        return null;
    }
    // boundaries already sorted and not empty
    const modelStart = new Position(1, 1);
    const modelEnd = new Position(lineCnt, getLineLen(lineCnt) + 1);
    return [modelStart, ...boundaries, modelEnd];
}
function _pushIfAbsent(positions, p) {
    const last = positions.length > 0 ? positions[positions.length - 1] : undefined;
    if (!last || last.lineNumber !== p.lineNumber || last.column !== p.column) {
        positions.push(p);
    }
}
export function computeCellLinesContents(cell, splitPoints) {
    const rangeBoundaries = _splitPointsToBoundaries(splitPoints, cell.textBuffer);
    if (!rangeBoundaries) {
        return null;
    }
    const newLineModels = [];
    for (let i = 1; i < rangeBoundaries.length; i++) {
        const start = rangeBoundaries[i - 1];
        const end = rangeBoundaries[i];
        newLineModels.push(cell.textBuffer.getValueInRange(new Range(start.lineNumber, start.column, end.lineNumber, end.column), 0 /* EndOfLinePreference.TextDefined */));
    }
    return newLineModels;
}
export function insertCell(languageService, editor, index, type, direction = 'above', initialText = '', ui = false, kernelHistoryService) {
    const viewModel = editor.getViewModel();
    const activeKernel = editor.activeKernel;
    if (viewModel.options.isReadOnly) {
        return null;
    }
    const cell = editor.cellAt(index);
    const nextIndex = ui ? viewModel.getNextVisibleCellIndex(index) : index + 1;
    let language;
    if (type === CellKind.Code) {
        const supportedLanguages = activeKernel?.supportedLanguages ?? languageService.getRegisteredLanguageIds();
        const defaultLanguage = supportedLanguages[0] || PLAINTEXT_LANGUAGE_ID;
        if (cell?.cellKind === CellKind.Code) {
            language = cell.language;
        }
        else if (cell?.cellKind === CellKind.Markup) {
            const nearestCodeCellIndex = viewModel.nearestCodeCellIndex(index);
            if (nearestCodeCellIndex > -1) {
                language = viewModel.cellAt(nearestCodeCellIndex).language;
            }
            else {
                language = defaultLanguage;
            }
        }
        else if (!cell && viewModel.length === 0) {
            // No cells in notebook - check kernel history
            const lastKernels = kernelHistoryService?.getKernels(viewModel.notebookDocument);
            if (lastKernels?.all.length) {
                const lastKernel = lastKernels.all[0];
                language = lastKernel.supportedLanguages[0] || defaultLanguage;
            }
            else {
                language = defaultLanguage;
            }
        }
        else {
            if (cell === undefined && direction === 'above') {
                // insert cell at the very top
                language = viewModel.viewCells.find(cell => cell.cellKind === CellKind.Code)?.language || defaultLanguage;
            }
            else {
                language = defaultLanguage;
            }
        }
        if (!supportedLanguages.includes(language)) {
            // the language no longer exists
            language = defaultLanguage;
        }
    }
    else {
        language = 'markdown';
    }
    const insertIndex = cell ?
        (direction === 'above' ? index : nextIndex) :
        index;
    return insertCellAtIndex(viewModel, insertIndex, initialText, language, type, undefined, [], true, true);
}
export function insertCellAtIndex(viewModel, index, source, language, type, metadata, outputs, synchronous, pushUndoStop) {
    const endSelections = { kind: SelectionStateType.Index, focus: { start: index, end: index + 1 }, selections: [{ start: index, end: index + 1 }] };
    viewModel.notebookDocument.applyEdits([
        {
            editType: 1 /* CellEditType.Replace */,
            index,
            count: 0,
            cells: [
                {
                    cellKind: type,
                    language: language,
                    mime: undefined,
                    outputs: outputs,
                    metadata: metadata,
                    source: source
                }
            ]
        }
    ], synchronous, { kind: SelectionStateType.Index, focus: viewModel.getFocus(), selections: viewModel.getSelections() }, () => endSelections, undefined, pushUndoStop && !viewModel.options.isReadOnly);
    return viewModel.cellAt(index);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2NlbGxPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBa0MsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM3SCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDcEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXRGLE9BQU8sRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLCtCQUErQixFQUF5QyxNQUFNLHVCQUF1QixDQUFDO0FBRTdJLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pGLE9BQU8sRUFBZ0IsUUFBUSxFQUEyRixrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JMLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBYyxNQUFNLCtCQUErQixDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUlqRCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUFDLElBQWMsRUFBRSxPQUErQixFQUFFLFFBQWlCLEVBQUUsSUFBYTtJQUN2SCxNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQ25DLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUNoQyxPQUFP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