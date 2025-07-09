/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isGridBranchNode } from '../../../../browser/ui/grid/gridview.js';
import { Emitter } from '../../../../common/event.js';
export class TestView {
    get minimumWidth() { return this._minimumWidth; }
    set minimumWidth(size) { this._minimumWidth = size; this._onDidChange.fire(undefined); }
    get maximumWidth() { return this._maximumWidth; }
    set maximumWidth(size) { this._maximumWidth = size; this._onDidChange.fire(undefined); }
    get minimumHeight() { return this._minimumHeight; }
    set minimumHeight(size) { this._minimumHeight = size; this._onDidChange.fire(undefined); }
    get maximumHeight() { return this._maximumHeight; }
    set maximumHeight(size) { this._maximumHeight = size; this._onDidChange.fire(undefined); }
    get element() { this._onDidGetElement.fire(); return this._element; }
    get width() { return this._width; }
    get height() { return this._height; }
    get top() { return this._top; }
    get left() { return this._left; }
    get size() { return [this.width, this.height]; }
    constructor(_minimumWidth, _maximumWidth, _minimumHeight, _maximumHeight) {
        this._minimumWidth = _minimumWidth;
        this._maximumWidth = _maximumWidth;
        this._minimumHeight = _minimumHeight;
        this._maximumHeight = _maximumHeight;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._element = document.createElement('div');
        this._onDidGetElement = new Emitter();
        this.onDidGetElement = this._onDidGetElement.event;
        this._width = 0;
        this._height = 0;
        this._top = 0;
        this._left = 0;
        this._onDidLayout = new Emitter();
        this.onDidLayout = this._onDidLayout.event;
        this._onDidFocus = new Emitter();
        this.onDidFocus = this._onDidFocus.event;
        assert(_minimumWidth <= _maximumWidth, 'gridview view minimum width must be <= maximum width');
        assert(_minimumHeight <= _maximumHeight, 'gridview view minimum height must be <= maximum height');
    }
    layout(width, height, top, left) {
        this._width = width;
        this._height = height;
        this._top = top;
        this._left = left;
        this._onDidLayout.fire({ width, height, top, left });
    }
    focus() {
        this._onDidFocus.fire();
    }
    dispose() {
        this._onDidChange.dispose();
        this._onDidGetElement.dispose();
        this._onDidLayout.dispose();
        this._onDidFocus.dispose();
    }
}
export function nodesToArrays(node) {
    if (isGridBranchNode(node)) {
        return node.children.map(nodesToArrays);
    }
    else {
        return node.view;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS9ncmlkL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBWSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSw2QkFBNkIsQ0FBQztBQUU3RCxNQUFNLE9BQU8sUUFBUTtJQUtwQixJQUFJLFlBQVksS0FBYSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ3pELElBQUksWUFBWSxDQUFDLElBQVksSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVoRyxJQUFJLFlBQVksS0FBYSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ3pELElBQUksWUFBWSxDQUFDLElBQVksSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVoRyxJQUFJLGFBQWEsS0FBYSxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQzNELElBQUksYUFBYSxDQUFDLElBQVksSUFBSSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVsRyxJQUFJLGFBQWEsS0FBYSxPQUFPLElBQUks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