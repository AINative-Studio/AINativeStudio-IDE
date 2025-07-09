/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CursorState, SingleCursorState } from '../cursorCommon.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
/**
 * Represents a single cursor.
*/
export class Cursor {
    constructor(context) {
        this._selTrackedRange = null;
        this._trackSelection = true;
        this._setState(context, new SingleCursorState(new Range(1, 1, 1, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(1, 1), 0), new SingleCursorState(new Range(1, 1, 1, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(1, 1), 0));
    }
    dispose(context) {
        this._removeTrackedRange(context);
    }
    startTrackingSelection(context) {
        this._trackSelection = true;
        this._updateTrackedRange(context);
    }
    stopTrackingSelection(context) {
        this._trackSelection = false;
        this._removeTrackedRange(context);
    }
    _updateTrackedRange(context) {
        if (!this._trackSelection) {
            // don't track the selection
            return;
        }
        this._selTrackedRange = context.model._setTrackedRange(this._selTrackedRange, this.modelState.selection, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */);
    }
    _removeTrackedRange(context) {
        this._selTrackedRange = context.model._setTrackedRange(this._selTrackedRange, null, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */);
    }
    asCursorState() {
        return new CursorState(this.modelState, this.viewState);
    }
    readSelectionFromMarkers(context) {
        const range = context.model._getTrackedRange(this._selTrackedRange);
        if (this.modelState.selection.isEmpty() && !range.isEmpty()) {
            // Avoid selecting text when recovering from markers
            return Selection.fromRange(range.collapseToEnd(), this.modelState.selection.getDirection());
        }
        return Selection.fromRange(range, this.modelState.selection.getDirection());
    }
    ensureValidState(context) {
        this._setState(context, this.modelState, this.viewState);
    }
    setState(context, modelState, viewState) {
        this._setState(context, modelState, viewState);
    }
    static _validatePositionWithCache(viewModel, position, cacheInput, cacheOutput) {
        if (position.equals(cacheInput)) {
            return cacheOutput;
        }
        return viewModel.normalizePosition(position, 2 /* PositionAffinity.None */);
    }
    static _validateViewState(viewModel, viewState) {
        const position = viewState.position;
        const sStartPosition = viewState.selectionStart.getStartPosition();
        const sEndPosition = viewState.selectionStart.getEndPosition();
        const validPosition = viewModel.normalizePosition(position, 2 /* PositionAffinity.None */);
        const validSStartPosition = this._validatePositionWithCache(viewModel, sStartPosition, position, validPosition);
        const validSEndPosition = this._validatePositionWithCache(viewModel, sEndPosition, sStartPosition, validSStartPosition);
        if (position.equals(validPosition) && sStartPosition.equals(validSStartPosition) && sEndPosition.equals(validSEndPosition)) {
            // fast path: the state is valid
            return viewState;
        }
        return new SingleCursorState(Range.fromPositions(validSStartPosition, validSEndPosition), viewState.selectionStartKind, viewState.selectionStartLeftoverVisibleColumns + sStartPosition.column - validSStartPosition.column, validPosition, viewState.leftoverVisibleColumns + position.column - validPosition.column);
    }
    _setState(context, modelState, viewState) {
        if (viewState) {
            viewState = Cursor._validateViewState(context.viewModel, viewState);
        }
        if (!modelState) {
            if (!viewState) {
                return;
            }
            // We only have the view state => compute the model state
            const selectionStart = context.model.validateRange(context.coordinatesConverter.convertViewRangeToModelRange(viewState.selectionStart));
            const position = context.model.validatePosition(context.coordinatesConverter.convertViewPositionToModelPosition(viewState.position));
            modelState = new SingleCursorState(selectionStart, viewState.selectionStartKind, viewState.selectionStartLeftoverVisibleColumns, position, viewState.leftoverVisibleColumns);
        }
        else {
            // Validate new model state
            const selectionStart = context.model.validateRange(modelState.selectionStart);
            const selectionStartLeftoverVisibleColumns = modelState.selectionStart.equalsRange(selectionStart) ? modelState.selectionStartLeftoverVisibleColumns : 0;
            const position = context.model.validatePosition(modelState.position);
            const leftoverVisibleColumns = modelState.position.equals(position) ? modelState.leftoverVisibleColumns : 0;
            modelState = new SingleCursorState(selectionStart, modelState.selectionStartKind, selectionStartLeftoverVisibleColumns, position, leftoverVisibleColumns);
        }
        if (!viewState) {
            // We only have the model state => compute the view state
            const viewSelectionStart1 = context.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelState.selectionStart.startLineNumber, modelState.selectionStart.startColumn));
            const viewSelectionStart2 = context.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelState.selectionStart.endLineNumber, modelState.selectionStart.endColumn));
            const viewSelectionStart = new Range(viewSelectionStart1.lineNumber, viewSelectionStart1.column, viewSelectionStart2.lineNumber, viewSelectionStart2.column);
            const viewPosition = context.coordinatesConverter.convertModelPositionToViewPosition(modelState.position);
            viewState = new SingleCursorState(viewSelectionStart, modelState.selectionStartKind, modelState.selectionStartLeftoverVisibleColumns, viewPosition, modelState.leftoverVisibleColumns);
        }
        else {
            // Validate new view state
            const viewSelectionStart = context.coordinatesConverter.validateViewRange(viewState.selectionStart, modelState.selectionStart);
            const viewPosition = context.coordinatesConverter.validateViewPosition(viewState.position, modelState.position);
            viewState = new SingleCursorState(viewSelectionStart, modelState.selectionStartKind, modelState.selectionStartLeftoverVisibleColumns, viewPosition, modelState.leftoverVisibleColumns);
        }
        this.modelState = modelState;
        this.viewState = viewState;
        this._updateTrackedRange(context);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25lQ3Vyc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL29uZUN1cnNvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUEwQyxpQkFBaUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTVHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBR2pEOztFQUVFO0FBQ0YsTUFBTSxPQUFPLE1BQU07SUFRbEIsWUFBWSxPQUFzQjtRQUNqQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzdCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBRTVCLElBQUksQ0FBQyxTQUFTLENBQ2IsT0FBTyxFQUNQLElBQUksaUJBQWlCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHFDQUE2QixDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNqRyxJQUFJLGlCQUFpQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxxQ0FBNkIsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDakcsQ0FBQztJQUNILENBQUM7SUFFTSxPQUFPLENBQUMsT0FBc0I7UUFDcEMsSUFBSSxDQUFDLG1CQUFtQixDQUFD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