/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResizableHTMLElement } from '../../../../base/browser/ui/resizable/resizable.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../common/core/position.js';
import * as dom from '../../../../base/browser/dom.js';
const TOP_HEIGHT = 30;
const BOTTOM_HEIGHT = 24;
export class ResizableContentWidget extends Disposable {
    constructor(_editor, minimumSize = new dom.Dimension(10, 10)) {
        super();
        this._editor = _editor;
        this.allowEditorOverflow = true;
        this.suppressMouseDown = false;
        this._resizableNode = this._register(new ResizableHTMLElement());
        this._contentPosition = null;
        this._isResizing = false;
        this._resizableNode.domNode.style.position = 'absolute';
        this._resizableNode.minSize = dom.Dimension.lift(minimumSize);
        this._resizableNode.layout(minimumSize.height, minimumSize.width);
        this._resizableNode.enableSashes(true, true, true, true);
        this._register(this._resizableNode.onDidResize(e => {
            this._resize(new dom.Dimension(e.dimension.width, e.dimension.height));
            if (e.done) {
                this._isResizing = false;
            }
        }));
        this._register(this._resizableNode.onDidWillResize(() => {
            this._isResizing = true;
        }));
    }
    get isResizing() {
        return this._isResizing;
    }
    getDomNode() {
        return this._resizableNode.domNode;
    }
    getPosition() {
        return this._contentPosition;
    }
    get position() {
        return this._contentPosition?.position ? Position.lift(this._contentPosition.position) : undefined;
    }
    _availableVerticalSpaceAbove(position) {
        const editorDomNode = this._editor.getDomNode();
        const mouseBox = this._editor.getScrolledVisiblePosition(position);
        if (!editorDomNode || !mouseBox) {
            return;
        }
        const editorBox = dom.getDomNodePagePosition(editorDomNode);
        return editorBox.top + mouseBox.top - TOP_HEIGHT;
    }
    _availableVerticalSpaceBelow(position) {
        const editorDomNode = this._editor.getDomNode();
        const mouseBox = this._editor.getScrolledVisiblePosition(position);
        if (!editorDomNode || !mouseBox) {
            return;
        }
        const editorBox = dom.getDomNodePagePosition(editorDomNode);
        const bodyBox = dom.getClientArea(editorDomNode.ownerDocument.body);
        const mouseBottom = editorBox.top + mouseBox.top + mouseBox.height;
        return bodyBox.height - mouseBottom - BOTTOM_HEIGHT;
    }
    _findPositionPreference(widgetHeight, showAtPosition) {
        const maxHeightBelow = Math.min(this._availableVerticalSpaceBelow(showAtPosition) ?? Infinity, widgetHeight);
        const maxHeightAbove = Math.min(this._availableVerticalSpaceAbove(showAtPosition) ?? Infinity, widgetHeight);
        const maxHeight = Math.min(Math.max(maxHeightAbove, maxHeightBelow), widgetHeight);
        const height = Math.min(widgetHeight, maxHeight);
        let renderingAbove;
        if (this._editor.getOption(62 /* EditorOption.hover */).above) {
            renderingAbove = height <= maxHeightAbove ? 1 /* ContentWidgetPositionPreference.ABOVE */ : 2 /* ContentWidgetPositionPreference.BELOW */;
        }
        else {
            renderingAbove = height <= maxHeightBelow ? 2 /* ContentWidgetPositionPreference.BELOW */ : 1 /* ContentWidgetPositionPreference.ABOVE */;
        }
        if (renderingAbove === 1 /* ContentWidgetPositionPreference.ABOVE */) {
            this._resizableNode.enableSashes(true, true, false, false);
        }
        else {
            this._resizableNode.enableSashes(false, true, true, false);
        }
        return renderingAbove;
    }
    _resize(dimension) {
        this._resizableNode.layout(dimension.height, dimension.width);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzaXphYmxlQ29udGVudFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL3Jlc2l6YWJsZUNvbnRlbnRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2xFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUM7QUFFekIsTUFBTSxPQUFnQixzQkFBdUIsU0FBUSxVQUFVO0lBVTlELFlBQ29CLE9BQW9CLEVBQ3ZDLGNBQThCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBRXZELEtBQUssRUFBRSxDQUFDO1FBSFcsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQVQvQix3QkFBbUIsR0FBWSxJQUFJLENBQUM7UUFDcEMsc0JBQWlCLEdBQVksS0FBSyxDQUFDO1FBRXpCLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUNyRSxxQkFBZ0IsR0FBa0MsSUFBSSxDQUFDO1FBRXpELGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBT3BDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDO1FBQ3hELElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxHQUFH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