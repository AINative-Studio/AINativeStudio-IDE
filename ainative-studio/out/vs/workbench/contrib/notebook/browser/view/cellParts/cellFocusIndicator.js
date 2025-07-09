/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../../../base/browser/fastDomNode.js';
import { CellContentPart } from '../cellPart.js';
import { CellKind } from '../../../common/notebookCommon.js';
export class CellFocusIndicator extends CellContentPart {
    constructor(notebookEditor, titleToolbar, top, left, right, bottom) {
        super();
        this.notebookEditor = notebookEditor;
        this.titleToolbar = titleToolbar;
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.codeFocusIndicator = new FastDomNode(DOM.append(this.left.domNode, DOM.$('.codeOutput-focus-indicator-container', undefined, DOM.$('.codeOutput-focus-indicator.code-focus-indicator'))));
        this.outputFocusIndicator = new FastDomNode(DOM.append(this.left.domNode, DOM.$('.codeOutput-focus-indicator-container', undefined, DOM.$('.codeOutput-focus-indicator.output-focus-indicator'))));
        this._register(DOM.addDisposableListener(this.codeFocusIndicator.domNode, DOM.EventType.CLICK, () => {
            if (this.currentCell) {
                this.currentCell.isInputCollapsed = !this.currentCell.isInputCollapsed;
            }
        }));
        this._register(DOM.addDisposableListener(this.outputFocusIndicator.domNode, DOM.EventType.CLICK, () => {
            if (this.currentCell) {
                this.currentCell.isOutputCollapsed = !this.currentCell.isOutputCollapsed;
            }
        }));
        this._register(DOM.addDisposableListener(this.left.domNode, DOM.EventType.DBLCLICK, e => {
            if (!this.currentCell || !this.notebookEditor.hasModel()) {
                return;
            }
            if (e.target !== this.left.domNode) {
                // Don't allow dblclick on the codeFocusIndicator/outputFocusIndicator
                return;
            }
            const clickedOnInput = e.offsetY < this.currentCell.layoutInfo.outputContainerOffset;
            if (clickedOnInput) {
                this.currentCell.isInputCollapsed = !this.currentCell.isInputCollapsed;
            }
            else {
                this.currentCell.isOutputCollapsed = !this.currentCell.isOutputCollapsed;
            }
        }));
        this._register(this.titleToolbar.onDidUpdateActions(() => {
            this.updateFocusIndicatorsForTitleMenu();
        }));
    }
    updateInternalLayoutNow(element) {
        if (element.cellKind === CellKind.Markup) {
            const indicatorPostion = this.notebookEditor.notebookOptions.computeIndicatorPosition(element.layoutInfo.totalHeight, element.layoutInfo.foldHintHeight, this.notebookEditor.textModel?.viewType);
            this.bottom.domNode.style.transform = `translateY(${indicatorPostion.bottomIndicatorTop + 6}px)`;
            this.left.setHeight(indicatorPostion.verticalIndicatorHeight);
            this.right.setHeight(indicatorPostion.verticalIndicatorHeight);
            this.codeFocusIndicator.setHeight(indicatorPostion.verticalIndicatorHeight - this.getIndicatorTopMargin() * 2 - element.layoutInfo.chatHeight);
        }
        else {
            const cell = element;
            const layoutInfo = this.notebookEditor.notebookOptions.getLayoutConfiguration();
            const bottomToolbarDimensions = this.notebookEditor.notebookOptions.computeBottomToolbarDimensions(this.notebookEditor.textModel?.viewType);
            const indicatorHeight = cell.layoutInfo.codeIndicatorHeight + cell.layoutInfo.outputIndicatorHeight + cell.layoutInfo.commentHeight;
            this.left.setHeight(indicatorHeight);
            this.right.setHeight(indicatorHeight);
            this.codeFocusIndicator.setHeight(cell.layoutInfo.codeIndicatorHeight);
            this.outputFocusIndicator.setHeight(Math.max(cell.layoutInfo.outputIndicatorHeight - cell.viewContext.notebookOptions.getLayoutConfiguration().focusIndicatorGap, 0));
            this.bottom.domNode.style.transform = `translateY(${cell.layoutInfo.totalHeight - bottomToolbarDimensions.bottomToolbarGap - layoutInfo.cellBottomMargin}px)`;
        }
        this.updateFocusIndicatorsForTitleMenu();
    }
    updateFocusIndicatorsForTitleMenu() {
        const y = (this.currentCell?.layoutInfo.chatHeight ?? 0) + this.getIndicatorTopMargin();
        this.left.domNode.style.transform = `translateY(${y}px)`;
        this.right.domNode.style.transform = `translateY(${y}px)`;
    }
    getIndicatorTopMargin() {
        const layoutInfo = this.notebookEditor.notebookOptions.getLayoutConfiguration();
        if (this.titleToolbar.hasActions) {
            return layoutInfo.editorToolbarHeight + layoutInfo.cellTopMargin;
        }
        else {
            return layoutInfo.cellTopMargin;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEZvY3VzSW5kaWNhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbEZvY3VzSW5kaWNhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUlqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGVBQWU7SUFJdEQsWUFDVSxjQUF1QyxFQUN2QyxZQUFrQyxFQUNsQyxHQUE2QixFQUM3QixJQUE4QixFQUM5QixLQUErQixFQUMvQixNQUFnQztRQUV6QyxLQUFLLEVBQUUsQ0FBQztRQVBDLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUN2QyxpQkFBWSxHQUFaLFlBQVksQ0FBc0I7UUFDbEMsUUFBRyxHQUFILEdBQUcsQ0FBMEI7UUFDN0IsU0FBSSxHQUFKLElBQUksQ0FBMEI7UUFDOUIsVUFBSyxHQUFMLEtBQUssQ0FBMEI7UUFDL0IsV0FBTSxHQUFOLE1BQU0sQ0FBMEI7UUFJekMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUNqQixHQUFHLENBQUMsQ0FBQyxDQUNKLHVDQUF1QyxFQUN2QyxTQUFTLEVBQ1QsR0FBRyxDQUFDLENBQUMsQ0FBQyxrREFBa0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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