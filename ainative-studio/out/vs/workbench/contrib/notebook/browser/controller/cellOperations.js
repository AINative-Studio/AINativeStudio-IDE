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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9jZWxsT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWtDLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDN0gsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV0RixPQUFPLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSwrQkFBK0IsRUFBeUMsTUFBTSx1QkFBdUIsQ0FBQztBQUU3SSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RixPQUFPLEVBQWdCLFFBQVEsRUFBMkYsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyTCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQWMsTUFBTSwrQkFBK0IsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFJakQsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxJQUFjLEVBQUUsT0FBK0IsRUFBRSxRQUFpQixFQUFFLElBQWE7SUFDdkgsTUFBTSxFQUFFLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUNuQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7UUFDaEMs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