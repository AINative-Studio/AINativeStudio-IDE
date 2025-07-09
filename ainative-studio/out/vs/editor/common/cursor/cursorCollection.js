/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy } from '../../../base/common/arrays.js';
import { findLastMax, findFirstMin } from '../../../base/common/arraysFind.js';
import { CursorState } from '../cursorCommon.js';
import { Cursor } from './oneCursor.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
export class CursorCollection {
    constructor(context) {
        this.context = context;
        this.cursors = [new Cursor(context)];
        this.lastAddedCursorIndex = 0;
    }
    dispose() {
        for (const cursor of this.cursors) {
            cursor.dispose(this.context);
        }
    }
    startTrackingSelections() {
        for (const cursor of this.cursors) {
            cursor.startTrackingSelection(this.context);
        }
    }
    stopTrackingSelections() {
        for (const cursor of this.cursors) {
            cursor.stopTrackingSelection(this.context);
        }
    }
    updateContext(context) {
        this.context = context;
    }
    ensureValidState() {
        for (const cursor of this.cursors) {
            cursor.ensureValidState(this.context);
        }
    }
    readSelectionFromMarkers() {
        return this.cursors.map(c => c.readSelectionFromMarkers(this.context));
    }
    getAll() {
        return this.cursors.map(c => c.asCursorState());
    }
    getViewPositions() {
        return this.cursors.map(c => c.viewState.position);
    }
    getTopMostViewPosition() {
        return findFirstMin(this.cursors, compareBy(c => c.viewState.position, Position.compare)).viewState.position;
    }
    getBottomMostViewPosition() {
        return findLastMax(this.cursors, compareBy(c => c.viewState.position, Position.compare)).viewState.position;
    }
    getSelections() {
        return this.cursors.map(c => c.modelState.selection);
    }
    getViewSelections() {
        return this.cursors.map(c => c.viewState.selection);
    }
    setSelections(selections) {
        this.setStates(CursorState.fromModelSelections(selections));
    }
    getPrimaryCursor() {
        return this.cursors[0].asCursorState();
    }
    setStates(states) {
        if (states === null) {
            return;
        }
        this.cursors[0].setState(this.context, states[0].modelState, states[0].viewState);
        this._setSecondaryStates(states.slice(1));
    }
    /**
     * Creates or disposes secondary cursors as necessary to match the number of `secondarySelections`.
     */
    _setSecondaryStates(secondaryStates) {
        const secondaryCursorsLength = this.cursors.length - 1;
        const secondaryStatesLength = secondaryStates.length;
        if (secondaryCursorsLength < secondaryStatesLength) {
            const createCnt = secondaryStatesLength - secondaryCursorsLength;
            for (let i = 0; i < createCnt; i++) {
                this._addSecondaryCursor();
            }
        }
        else if (secondaryCursorsLength > secondaryStatesLength) {
            const removeCnt = secondaryCursorsLength - secondaryStatesLength;
            for (let i = 0; i < removeCnt; i++) {
                this._removeSecondaryCursor(this.cursors.length - 2);
            }
        }
        for (let i = 0; i < secondaryStatesLength; i++) {
            this.cursors[i + 1].setState(this.context, secondaryStates[i].modelState, secondaryStates[i].viewState);
        }
    }
    killSecondaryCursors() {
        this._setSecondaryStates([]);
    }
    _addSecondaryCursor() {
        this.cursors.push(new Cursor(this.context));
        this.lastAddedCursorIndex = this.cursors.length - 1;
    }
    getLastAddedCursorIndex() {
        if (this.cursors.length === 1 || this.lastAddedCursorIndex === 0) {
            return 0;
        }
        return this.lastAddedCursorIndex;
    }
    _removeSecondaryCursor(removeIndex) {
        if (this.lastAddedCursorIndex >= removeIndex + 1) {
            this.lastAddedCursorIndex--;
        }
        this.cursors[removeIndex + 1].dispose(this.context);
        this.cursors.splice(removeIndex + 1, 1);
    }
    normalize() {
        if (this.cursors.length === 1) {
            return;
        }
        const cursors = this.cursors.slice(0);
        const sortedCursors = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            sortedCursors.push({
                index: i,
                selection: cursors[i].modelState.selection,
            });
        }
        sortedCursors.sort(compareBy(s => s.selection, Range.compareRangesUsingStarts));
        for (let sortedCursorIndex = 0; sortedCursorIndex < sortedCursors.length - 1; sortedCursorIndex++) {
            const current = sortedCursors[sortedCursorIndex];
            const next = sortedCursors[sortedCursorIndex + 1];
            const currentSelection = current.selection;
            const nextSelection = next.selection;
            if (!this.context.cursorConfig.multiCursorMergeOverlapping) {
                continue;
            }
            let shouldMergeCursors;
            if (nextSelection.isEmpty() || currentSelection.isEmpty()) {
                // Merge touching cursors if one of them is collapsed
                shouldMergeCursors = nextSelection.getStartPosition().isBeforeOrEqual(currentSelection.getEndPosition());
            }
            else {
                // Merge only overlapping cursors (i.e. allow touching ranges)
                shouldMergeCursors = nextSelection.getStartPosition().isBefore(currentSelection.getEndPosition());
            }
            if (shouldMergeCursors) {
                const winnerSortedCursorIndex = current.index < next.index ? sortedCursorIndex : sortedCursorIndex + 1;
                const looserSortedCursorIndex = current.index < next.index ? sortedCursorIndex + 1 : sortedCursorIndex;
                const looserIndex = sortedCursors[looserSortedCursorIndex].index;
                const winnerIndex = sortedCursors[winnerSortedCursorIndex].index;
                const looserSelection = sortedCursors[looserSortedCursorIndex].selection;
                const winnerSelection = sortedCursors[winnerSortedCursorIndex].selection;
                if (!looserSelection.equalsSelection(winnerSelection)) {
                    const resultingRange = looserSelection.plusRange(winnerSelection);
                    const looserSelectionIsLTR = (looserSelection.selectionStartLineNumber === looserSelection.startLineNumber && looserSelection.selectionStartColumn === looserSelection.startColumn);
                    const winnerSelectionIsLTR = (winnerSelection.selectionStartLineNumber === winnerSelection.startLineNumber && winnerSelection.selectionStartColumn === winnerSelection.startColumn);
                    // Give more importance to the last added cursor (think Ctrl-dragging + hitting another cursor)
                    let resultingSelectionIsLTR;
                    if (looserIndex === this.lastAddedCursorIndex) {
                        resultingSelectionIsLTR = looserSelectionIsLTR;
                        this.lastAddedCursorIndex = winnerIndex;
                    }
                    else {
                        // Winner takes it all
                        resultingSelectionIsLTR = winnerSelectionIsLTR;
                    }
                    let resultingSelection;
                    if (resultingSelectionIsLTR) {
                        resultingSelection = new Selection(resultingRange.startLineNumber, resultingRange.startColumn, resultingRange.endLineNumber, resultingRange.endColumn);
                    }
                    else {
                        resultingSelection = new Selection(resultingRange.endLineNumber, resultingRange.endColumn, resultingRange.startLineNumber, resultingRange.startColumn);
                    }
                    sortedCursors[winnerSortedCursorIndex].selection = resultingSelection;
                    const resultingState = CursorState.fromModelSelection(resultingSelection);
                    cursors[winnerIndex].setState(this.context, resultingState.modelState, resultingState.viewState);
                }
                for (const sortedCursor of sortedCursors) {
                    if (sortedCursor.index > looserIndex) {
                        sortedCursor.index--;
                    }
                }
                cursors.splice(looserIndex, 1);
                sortedCursors.splice(looserSortedCursorIndex, 1);
                this._removeSecondaryCursor(looserIndex - 1);
                sortedCursorIndex--;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JDb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQXNCLE1BQU0sb0JBQW9CLENBQUM7QUFFckUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFjLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTdELE1BQU0sT0FBTyxnQkFBZ0I7SUFjNUIsWUFBWSxPQUFzQjtRQUNqQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFTSxPQUFPO1FBQ2IsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTSx1QkFBdUI7UUFDN0IsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMs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