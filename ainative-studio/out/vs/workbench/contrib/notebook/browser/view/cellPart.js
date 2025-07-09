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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUt6Rzs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLGVBQWdCLFNBQVEsVUFBVTtJQUl2RDtRQUNDLEtBQUssRUFBRSxDQUFDO1FBSFUsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztJQUkzRSxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsaUJBQWlCLENBQUMsT0FBdUIsSUFBVSxDQUFDO0lBRXBEOztPQUVHO0lBQ0gsVUFBVSxDQUFDLE9BQXVCO1FBQ2pDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO1FBQzNCLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUF1QixJQUFVLENBQUM7SUFFaEQ7O09BRUc7SUFDSCxZQUFZLENBQUMsT0FBdUI7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhLEtBQVcsQ0FBQztJQUV6Qjs7OztP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