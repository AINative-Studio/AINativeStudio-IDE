/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
/**
 * A content part is a non-floating element that is rendered inside a cell.
 * The rendering of the content part is synchronous to avoid flickering.
 */
export class CellContentPart extends Disposable {
    constructor() {
        super();
        this.cellDisposables = this._register(new DisposableStore());
    }
    /**
     * Prepare model for cell part rendering
     * No DOM operations recommended within this operation
     */
    prepareRenderCell(element) { }
    /**
     * Update the DOM for the cell `element`
     */
    renderCell(element) {
        this.currentCell = element;
        safeInvokeNoArg(() => this.didRenderCell(element));
    }
    didRenderCell(element) { }
    /**
     * Dispose any disposables generated from `didRenderCell`
     */
    unrenderCell(element) {
        this.currentCell = undefined;
        this.cellDisposables.clear();
    }
    /**
     * Perform DOM read operations to prepare for the list/cell layout update.
     */
    prepareLayout() { }
    /**
     * Update internal DOM (top positions) per cell layout info change
     * Note that a cell part doesn't need to call `DOM.scheduleNextFrame`,
     * the list view will ensure that layout call is invoked in the right frame
     */
    updateInternalLayoutNow(element) { }
    /**
     * Update per cell state change
     */
    updateState(element, e) { }
    /**
     * Update per execution state change.
     */
    updateForExecutionState(element, e) { }
}
/**
 * An overlay part renders on top of other components.
 * The rendering of the overlay part might be postponed to the next animation frame to avoid forced reflow.
 */
export class CellOverlayPart extends Disposable {
    constructor() {
        super();
        this.cellDisposables = this._register(new DisposableStore());
    }
    /**
     * Prepare model for cell part rendering
     * No DOM operations recommended within this operation
     */
    prepareRenderCell(element) { }
    /**
     * Update the DOM for the cell `element`
     */
    renderCell(element) {
        this.currentCell = element;
        this.didRenderCell(element);
    }
    didRenderCell(element) { }
    /**
     * Dispose any disposables generated from `didRenderCell`
     */
    unrenderCell(element) {
        this.currentCell = undefined;
        this.cellDisposables.clear();
    }
    /**
     * Update internal DOM (top positions) per cell layout info change
     * Note that a cell part doesn't need to call `DOM.scheduleNextFrame`,
     * the list view will ensure that layout call is invoked in the right frame
     */
    updateInternalLayoutNow(element) { }
    /**
     * Update per cell state change
     */
    updateState(element, e) { }
    /**
     * Update per execution state change.
     */
    updateForExecutionState(element, e) { }
}
function safeInvokeNoArg(func) {
    try {
        return func();
    }
    catch (e) {
        onUnexpectedError(e);
        return null;
    }
}
export class CellPartsCollection extends Disposable {
    constructor(targetWindow, contentParts, overlayParts) {
        super();
        this.targetWindow = targetWindow;
        this.contentParts = contentParts;
        this.overlayParts = overlayParts;
        this._scheduledOverlayRendering = this._register(new MutableDisposable());
        this._scheduledOverlayUpdateState = this._register(new MutableDisposable());
        this._scheduledOverlayUpdateExecutionState = this._register(new MutableDisposable());
    }
    concatContentPart(other, targetWindow) {
        return new CellPartsCollection(targetWindow, this.contentParts.concat(other), this.overlayParts);
    }
    concatOverlayPart(other, targetWindow) {
        return new CellPartsCollection(targetWindow, this.contentParts, this.overlayParts.concat(other));
    }
    scheduleRenderCell(element) {
        // prepare model
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.prepareRenderCell(element));
        }
        for (const part of this.overlayParts) {
            safeInvokeNoArg(() => part.prepareRenderCell(element));
        }
        // render content parts
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.renderCell(element));
        }
        this._scheduledOverlayRendering.value = DOM.modify(this.targetWindow, () => {
            for (const part of this.overlayParts) {
                safeInvokeNoArg(() => part.renderCell(element));
            }
        });
    }
    unrenderCell(element) {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.unrenderCell(element));
        }
        this._scheduledOverlayRendering.value = undefined;
        this._scheduledOverlayUpdateState.value = undefined;
        this._scheduledOverlayUpdateExecutionState.value = undefined;
        for (const part of this.overlayParts) {
            safeInvokeNoArg(() => part.unrenderCell(element));
        }
    }
    updateInternalLayoutNow(viewCell) {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.updateInternalLayoutNow(viewCell));
        }
        for (const part of this.overlayParts) {
            safeInvokeNoArg(() => part.updateInternalLayoutNow(viewCell));
        }
    }
    prepareLayout() {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.prepareLayout());
        }
    }
    updateState(viewCell, e) {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.updateState(viewCell, e));
        }
        this._scheduledOverlayUpdateState.value = DOM.modify(this.targetWindow, () => {
            for (const part of this.overlayParts) {
                safeInvokeNoArg(() => part.updateState(viewCell, e));
            }
        });
    }
    updateForExecutionState(viewCell, e) {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.updateForExecutionState(viewCell, e));
        }
        this._scheduledOverlayUpdateExecutionState.value = DOM.modify(this.targetWindow, () => {
            for (const part of this.overlayParts) {
                safeInvokeNoArg(() => part.updateForExecutionState(viewCell, e));
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFLekc7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixlQUFnQixTQUFRLFVBQVU7SUFJdkQ7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQUhVLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7SUFJM0UsQ0FBQztJQUVEOzs7T0FHRztJQUNILGlCQUFpQixDQUFDLE9BQXVCLElBQVUsQ0FBQztJQUVwRDs7T0FFRztJQUNILFVBQVUsQ0FBQyxPQUF1QjtRQUNqQyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztRQUMzQixlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxhQUFhLENBQUMsT0FBdUIsSUFBVSxDQUFDO0lBRWhEOztPQUVHO0lBQ0gsWUFBWSxDQUFDLE9BQXVCO1FBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDO1FBQzdCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsYUFBYSxLQUFXLENBQUM7SUFFekI7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