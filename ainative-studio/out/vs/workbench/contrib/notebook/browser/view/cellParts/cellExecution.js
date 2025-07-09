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
import * as DOM from '../../../../../../base/browser/dom.js';
import { disposableTimeout } from '../../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import { CellContentPart } from '../cellPart.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
const UPDATE_EXECUTION_ORDER_GRACE_PERIOD = 200;
let CellExecutionPart = class CellExecutionPart extends CellContentPart {
    constructor(_notebookEditor, _executionOrderLabel, _notebookExecutionStateService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._executionOrderLabel = _executionOrderLabel;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.kernelDisposables = this._register(new DisposableStore());
        this._register(this._notebookEditor.onDidChangeActiveKernel(() => {
            if (this.currentCell) {
                this.kernelDisposables.clear();
                if (this._notebookEditor.activeKernel) {
                    this.kernelDisposables.add(this._notebookEditor.activeKernel.onDidChange(() => {
                        if (this.currentCell) {
                            this.updateExecutionOrder(this.currentCell.internalMetadata);
                        }
                    }));
                }
                this.updateExecutionOrder(this.currentCell.internalMetadata);
            }
        }));
        this._register(this._notebookEditor.onDidScroll(() => {
            this._updatePosition();
        }));
    }
    didRenderCell(element) {
        this.updateExecutionOrder(element.internalMetadata, true);
    }
    updateExecutionOrder(internalMetadata, forceClear = false) {
        if (this._notebookEditor.activeKernel?.implementsExecutionOrder || (!this._notebookEditor.activeKernel && typeof internalMetadata.executionOrder === 'number')) {
            // If the executionOrder was just cleared, and the cell is executing, wait just a bit before clearing the view to avoid flashing
            if (typeof internalMetadata.executionOrder !== 'number' && !forceClear && !!this._notebookExecutionStateService.getCellExecution(this.currentCell.uri)) {
                const renderingCell = this.currentCell;
                disposableTimeout(() => {
                    if (this.currentCell === renderingCell) {
                        this.updateExecutionOrder(this.currentCell.internalMetadata, true);
                    }
                }, UPDATE_EXECUTION_ORDER_GRACE_PERIOD, this.cellDisposables);
                return;
            }
            const executionOrderLabel = typeof internalMetadata.executionOrder === 'number' ?
                `[${internalMetadata.executionOrder}]` :
                '[ ]';
            this._executionOrderLabel.innerText = executionOrderLabel;
        }
        else {
            this._executionOrderLabel.innerText = '';
        }
    }
    updateState(element, e) {
        if (e.internalMetadataChanged) {
            this.updateExecutionOrder(element.internalMetadata);
        }
    }
    updateInternalLayoutNow(element) {
        this._updatePosition();
    }
    _updatePosition() {
        if (this.currentCell) {
            if (this.currentCell.isInputCollapsed) {
                DOM.hide(this._executionOrderLabel);
            }
            else {
                DOM.show(this._executionOrderLabel);
                let top = this.currentCell.layoutInfo.editorHeight - 22 + this.currentCell.layoutInfo.statusBarHeight;
                if (this.currentCell instanceof CodeCellViewModel) {
                    const elementTop = this._notebookEditor.getAbsoluteTopOfElement(this.currentCell);
                    const editorBottom = elementTop + this.currentCell.layoutInfo.outputContainerOffset;
                    // another approach to avoid the flicker caused by sticky scroll is manually calculate the scrollBottom:
                    // const scrollBottom = this._notebookEditor.scrollTop + this._notebookEditor.getLayoutInfo().height - 26 - this._notebookEditor.getLayoutInfo().stickyHeight;
                    const scrollBottom = this._notebookEditor.scrollBottom;
                    const lineHeight = 22;
                    if (scrollBottom <= editorBottom) {
                        const offset = editorBottom - scrollBottom;
                        top -= offset;
                        top = clamp(top, lineHeight + 12, // line height + padding for single line
                        this.currentCell.layoutInfo.editorHeight - lineHeight + this.currentCell.layoutInfo.statusBarHeight);
                    }
                }
                this._executionOrderLabel.style.top = `${top}px`;
            }
        }
    }
};
CellExecutionPart = __decorate([
    __param(2, INotebookExecutionStateService)
], CellExecutionPart);
export { CellExecutionPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEV4ZWN1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxFeGVjdXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVsRyxNQUFNLG1DQUFtQyxHQUFHLEdBQUcsQ0FBQztBQUV6QyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLGVBQWU7SUFHckQsWUFDa0IsZUFBd0MsRUFDeEMsb0JBQWlDLEVBQ2xCLDhCQUErRTtRQUUvRyxLQUFLLEVBQUUsQ0FBQztRQUpTLG9CQUFlLEdBQWYsZUFBZSxDQUF5QjtRQUN4Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQWE7UUFDRCxtQ0FBOEIsR0FBOUIsOEJBQThCLENBQWdDO1FBTC9GLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBUzFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIs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