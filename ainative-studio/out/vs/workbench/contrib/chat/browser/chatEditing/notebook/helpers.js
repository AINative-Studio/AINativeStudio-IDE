/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NotebookCellsChangeType } from '../../../../notebook/common/notebookCommon.js';
import { sortCellChanges } from './notebookCellChanges.js';
export function adjustCellDiffForKeepingADeletedCell(originalCellIndex, cellDiffInfo, applyEdits) {
    // Delete this cell from original as well.
    const edit = { cells: [], count: 1, editType: 1 /* CellEditType.Replace */, index: originalCellIndex, };
    applyEdits([edit], true, undefined, () => undefined, undefined, true);
    const diffs = sortCellChanges(cellDiffInfo)
        .filter(d => !(d.type === 'delete' && d.originalCellIndex === originalCellIndex))
        .map(diff => {
        if (diff.type !== 'insert' && diff.originalCellIndex > originalCellIndex) {
            return {
                ...diff,
                originalCellIndex: diff.originalCellIndex - 1,
            };
        }
        return diff;
    });
    return diffs;
}
export function adjustCellDiffForRevertingADeletedCell(originalCellIndex, cellDiffInfo, cellToInsert, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    const indexOfEntry = cellDiffInfo.findIndex(d => d.originalCellIndex === originalCellIndex);
    if (indexOfEntry === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    let modifiedCellIndex = -1;
    for (let i = 0; i < cellDiffInfo.length; i++) {
        const diff = cellDiffInfo[i];
        if (i < indexOfEntry) {
            modifiedCellIndex = Math.max(modifiedCellIndex, diff.modifiedCellIndex ?? modifiedCellIndex);
            continue;
        }
        if (i === indexOfEntry) {
            const edit = { cells: [cellToInsert], count: 0, editType: 1 /* CellEditType.Replace */, index: modifiedCellIndex + 1, };
            applyEdits([edit], true, undefined, () => undefined, undefined, true);
            cellDiffInfo[i] = createModifiedCellDiffInfo(modifiedCellIndex + 1, originalCellIndex);
            continue;
        }
        else {
            // Increase the original index for all entries after this.
            if (typeof diff.modifiedCellIndex === 'number') {
                diff.modifiedCellIndex++;
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    return cellDiffInfo;
}
export function adjustCellDiffForRevertingAnInsertedCell(modifiedCellIndex, cellDiffInfo, applyEdits) {
    if (modifiedCellIndex === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    cellDiffInfo = sortCellChanges(cellDiffInfo)
        .filter(d => !(d.type === 'insert' && d.modifiedCellIndex === modifiedCellIndex))
        .map(d => {
        if (d.type === 'insert' && d.modifiedCellIndex === modifiedCellIndex) {
            return d;
        }
        if (d.type !== 'delete' && d.modifiedCellIndex > modifiedCellIndex) {
            return {
                ...d,
                modifiedCellIndex: d.modifiedCellIndex - 1,
            };
        }
        return d;
    });
    const edit = { cells: [], count: 1, editType: 1 /* CellEditType.Replace */, index: modifiedCellIndex, };
    applyEdits([edit], true, undefined, () => undefined, undefined, true);
    return cellDiffInfo;
}
export function adjustCellDiffForKeepingAnInsertedCell(modifiedCellIndex, cellDiffInfo, cellToInsert, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    if (modifiedCellIndex === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    const indexOfEntry = cellDiffInfo.findIndex(d => d.modifiedCellIndex === modifiedCellIndex);
    if (indexOfEntry === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    let originalCellIndex = -1;
    for (let i = 0; i < cellDiffInfo.length; i++) {
        const diff = cellDiffInfo[i];
        if (i < indexOfEntry) {
            originalCellIndex = Math.max(originalCellIndex, diff.originalCellIndex ?? originalCellIndex);
            continue;
        }
        if (i === indexOfEntry) {
            const edit = { cells: [cellToInsert], count: 0, editType: 1 /* CellEditType.Replace */, index: originalCellIndex + 1 };
            applyEdits([edit], true, undefined, () => undefined, undefined, true);
            cellDiffInfo[i] = createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex + 1);
            continue;
        }
        else {
            // Increase the original index for all entries after this.
            if (typeof diff.originalCellIndex === 'number') {
                diff.originalCellIndex++;
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    return cellDiffInfo;
}
export function adjustCellDiffAndOriginalModelBasedOnCellAddDelete(change, cellDiffInfo, modifiedModelCellCount, originalModelCellCount, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    const numberOfCellsInserted = change[2].length;
    const numberOfCellsDeleted = change[1];
    const cells = change[2].map(cell => {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            metadata: cell.metadata,
            outputs: cell.outputs,
            source: cell.getValue(),
            mime: undefined,
            internalMetadata: cell.internalMetadata
        };
    });
    let diffEntryIndex = -1;
    let indexToInsertInOriginalModel = undefined;
    if (cells.length) {
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (typeof diff.modifiedCellIndex === 'number' && diff.modifiedCellIndex === change[0]) {
                diffEntryIndex = i;
                if (typeof diff.originalCellIndex === 'number') {
                    indexToInsertInOriginalModel = diff.originalCellIndex;
                }
                break;
            }
            if (typeof diff.originalCellIndex === 'number') {
                indexToInsertInOriginalModel = diff.originalCellIndex + 1;
            }
        }
        const edit = {
            editType: 1 /* CellEditType.Replace */,
            cells,
            index: indexToInsertInOriginalModel ?? 0,
            count: change[1]
        };
        applyEdits([edit], true, undefined, () => undefined, undefined, true);
    }
    // If cells were deleted we handled that with this.disposeDeletedCellEntries();
    if (numberOfCellsDeleted) {
        // Adjust the indexes.
        let numberOfOriginalCellsRemovedSoFar = 0;
        let numberOfModifiedCellsRemovedSoFar = 0;
        const modifiedIndexesToRemove = new Set();
        for (let i = 0; i < numberOfCellsDeleted; i++) {
            modifiedIndexesToRemove.add(change[0] + i);
        }
        const itemsToRemove = new Set();
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (i < diffEntryIndex) {
                continue;
            }
            let changed = false;
            if (typeof diff.modifiedCellIndex === 'number' && modifiedIndexesToRemove.has(diff.modifiedCellIndex)) {
                // This will be removed.
                numberOfModifiedCellsRemovedSoFar++;
                if (typeof diff.originalCellIndex === 'number') {
                    numberOfOriginalCellsRemovedSoFar++;
                }
                itemsToRemove.add(diff);
                continue;
            }
            if (typeof diff.modifiedCellIndex === 'number' && numberOfModifiedCellsRemovedSoFar) {
                diff.modifiedCellIndex -= numberOfModifiedCellsRemovedSoFar;
                changed = true;
            }
            if (typeof diff.originalCellIndex === 'number' && numberOfOriginalCellsRemovedSoFar) {
                diff.originalCellIndex -= numberOfOriginalCellsRemovedSoFar;
                changed = true;
            }
            if (changed) {
                cellDiffInfo[i] = { ...diff };
            }
        }
        if (itemsToRemove.size) {
            Array.from(itemsToRemove)
                .filter(diff => typeof diff.originalCellIndex === 'number')
                .forEach(diff => {
                const edit = {
                    editType: 1 /* CellEditType.Replace */,
                    cells: [],
                    index: diff.originalCellIndex,
                    count: 1
                };
                applyEdits([edit], true, undefined, () => undefined, undefined, true);
            });
        }
        cellDiffInfo = cellDiffInfo.filter(d => !itemsToRemove.has(d));
    }
    if (numberOfCellsInserted && diffEntryIndex >= 0) {
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (i < diffEntryIndex) {
                continue;
            }
            let changed = false;
            if (typeof diff.modifiedCellIndex === 'number') {
                diff.modifiedCellIndex += numberOfCellsInserted;
                changed = true;
            }
            if (typeof diff.originalCellIndex === 'number') {
                diff.originalCellIndex += numberOfCellsInserted;
                changed = true;
            }
            if (changed) {
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    // For inserted cells, we need to ensure that we create a corresponding CellEntry.
    // So that any edits to the inserted cell is handled and mirrored over to the corresponding cell in original model.
    cells.forEach((_, i) => {
        const originalCellIndex = i + (indexToInsertInOriginalModel ?? 0);
        const modifiedCellIndex = change[0] + i;
        const unchangedCell = createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex);
        cellDiffInfo.splice((diffEntryIndex === -1 ? cellDiffInfo.length : diffEntryIndex) + i, 0, unchangedCell);
    });
    return cellDiffInfo;
}
/**
 * Given the movements of cells in modified notebook, adjust the ICellDiffInfo[] array
 * and generate edits for the old notebook (if required).
 * TODO@DonJayamanne Handle bulk moves (movements of more than 1 cell).
 */
export function adjustCellDiffAndOriginalModelBasedOnCellMovements(event, cellDiffInfo) {
    const minimumIndex = Math.min(event.index, event.newIdx);
    const maximumIndex = Math.max(event.index, event.newIdx);
    const cellDiffs = cellDiffInfo.slice();
    const indexOfEntry = cellDiffs.findIndex(d => d.modifiedCellIndex === event.index);
    const indexOfEntryToPlaceBelow = cellDiffs.findIndex(d => d.modifiedCellIndex === event.newIdx);
    if (indexOfEntry === -1 || indexOfEntryToPlaceBelow === -1) {
        return undefined;
    }
    // Create a new object so that the observable value is triggered.
    // Besides we'll be updating the values of this object in place.
    const entryToBeMoved = { ...cellDiffs[indexOfEntry] };
    const moveDirection = event.newIdx > event.index ? 'down' : 'up';
    const startIndex = cellDiffs.findIndex(d => d.modifiedCellIndex === minimumIndex);
    const endIndex = cellDiffs.findIndex(d => d.modifiedCellIndex === maximumIndex);
    const movingExistingCell = typeof entryToBeMoved.originalCellIndex === 'number';
    let originalCellsWereEffected = false;
    for (let i = 0; i < cellDiffs.length; i++) {
        const diff = cellDiffs[i];
        let changed = false;
        if (moveDirection === 'down') {
            if (i > startIndex && i <= endIndex) {
                if (typeof diff.modifiedCellIndex === 'number') {
                    changed = true;
                    diff.modifiedCellIndex = diff.modifiedCellIndex - 1;
                }
                if (typeof diff.originalCellIndex === 'number' && movingExistingCell) {
                    diff.originalCellIndex = diff.originalCellIndex - 1;
                    originalCellsWereEffected = true;
                    changed = true;
                }
            }
        }
        else {
            if (i >= startIndex && i < endIndex) {
                if (typeof diff.modifiedCellIndex === 'number') {
                    changed = true;
                    diff.modifiedCellIndex = diff.modifiedCellIndex + 1;
                }
                if (typeof diff.originalCellIndex === 'number' && movingExistingCell) {
                    diff.originalCellIndex = diff.originalCellIndex + 1;
                    originalCellsWereEffected = true;
                    changed = true;
                }
            }
        }
        // Create a new object so that the observable value is triggered.
        // Do only if there's a change.
        if (changed) {
            cellDiffs[i] = { ...diff };
        }
    }
    entryToBeMoved.modifiedCellIndex = event.newIdx;
    const originalCellIndex = entryToBeMoved.originalCellIndex;
    if (moveDirection === 'down') {
        cellDiffs.splice(endIndex + 1, 0, entryToBeMoved);
        cellDiffs.splice(startIndex, 1);
        // If we're moving a new cell up/down, then we need just adjust just the modified indexes of the cells in between.
        // If we're moving an existing up/down, then we need to adjust the original indexes as well.
        if (typeof entryToBeMoved.originalCellIndex === 'number') {
            entryToBeMoved.originalCellIndex = cellDiffs.slice(0, endIndex).reduce((lastOriginalIndex, diff) => typeof diff.originalCellIndex === 'number' ? Math.max(lastOriginalIndex, diff.originalCellIndex) : lastOriginalIndex, -1) + 1;
        }
    }
    else {
        cellDiffs.splice(endIndex, 1);
        cellDiffs.splice(startIndex, 0, entryToBeMoved);
        // If we're moving a new cell up/down, then we need just adjust just the modified indexes of the cells in between.
        // If we're moving an existing up/down, then we need to adjust the original indexes as well.
        if (typeof entryToBeMoved.originalCellIndex === 'number') {
            entryToBeMoved.originalCellIndex = cellDiffs.slice(0, startIndex).reduce((lastOriginalIndex, diff) => typeof diff.originalCellIndex === 'number' ? Math.max(lastOriginalIndex, diff.originalCellIndex) : lastOriginalIndex, -1) + 1;
        }
    }
    // If this is a new cell that we're moving, and there are no existing cells in between, then we can just move the new cell.
    // I.e. no need to update the original notebook model.
    if (typeof entryToBeMoved.originalCellIndex === 'number' && originalCellsWereEffected && typeof originalCellIndex === 'number' && entryToBeMoved.originalCellIndex !== originalCellIndex) {
        const edit = {
            editType: 6 /* CellEditType.Move */,
            index: originalCellIndex,
            length: event.length,
            newIdx: entryToBeMoved.originalCellIndex
        };
        return [cellDiffs, [edit]];
    }
    return [cellDiffs, []];
}
export function getCorrespondingOriginalCellIndex(modifiedCellIndex, cellDiffInfo) {
    const entry = cellDiffInfo.find(d => d.modifiedCellIndex === modifiedCellIndex);
    return entry?.originalCellIndex;
}
/**
 *
 * This isn't great, but necessary.
 * ipynb extension updates metadata when new cells are inserted (to ensure the metadata is correct)
 * Details of why thats required is in ipynb extension, but its necessary.
 * However as a result of this, those edits appear here and are assumed to be user edits.
 * As a result `_allEditsAreFromUs` is set to false.
 */
export function isTransientIPyNbExtensionEvent(notebookKind, e) {
    if (notebookKind !== 'jupyter-notebook') {
        return false;
    }
    if (e.rawEvents.every(event => {
        if (event.kind !== NotebookCellsChangeType.ChangeCellMetadata) {
            return false;
        }
        if (JSON.stringify(event.metadata || {}) === JSON.stringify({ execution_count: null, metadata: {} })) {
            return true;
        }
        return true;
    })) {
        return true;
    }
    return false;
}
export function calculateNotebookRewriteRatio(cellsDiff, originalModel, modifiedModel) {
    const totalNumberOfUpdatedLines = cellsDiff.reduce((totalUpdatedLines, value) => {
        const getUpadtedLineCount = () => {
            if (value.type === 'unchanged') {
                return 0;
            }
            if (value.type === 'delete') {
                return originalModel.cells[value.originalCellIndex].textModel?.getLineCount() ?? 0;
            }
            if (value.type === 'insert') {
                return modifiedModel.cells[value.modifiedCellIndex].textModel?.getLineCount() ?? 0;
            }
            return value.diff.get().changes.reduce((maxLineNumber, change) => {
                return Math.max(maxLineNumber, change.modified.endLineNumberExclusive);
            }, 0);
        };
        return totalUpdatedLines + getUpadtedLineCount();
    }, 0);
    const totalNumberOfLines = modifiedModel.cells.reduce((totalLines, cell) => totalLines + (cell.textModel?.getLineCount() ?? 0), 0);
    return totalNumberOfLines === 0 ? 0 : Math.min(1, totalNumberOfUpdatedLines / totalNumberOfLines);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUF3RSx1QkFBdUIsRUFBMkYsTUFBTSwrQ0FBK0MsQ0FBQztBQUN2UCxPQUFPLEVBQWlCLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRzFFLE1BQU0sVUFBVSxvQ0FBb0MsQ0FBQyxpQkFBeUIsRUFDN0UsWUFBNkIsRUFDN0IsVUFBeUQ7SUFFekQsMENBQTBDO0lBQzFDLE1BQU0sSUFBSSxHQUFxQixFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLDhCQUFzQixFQUFFLEtBQUssRUFBRSxpQkFBaUIsR0FBRyxDQUFDO0lBQ2xILFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0RSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsWUFBWSxDQUFDO1NBQ3pDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEtBQUssaUJBQWlCLENBQUMsQ0FBQztTQUNoRixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDWCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO1lBQzFFLE9BQU87Z0JBQ04sR0FB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