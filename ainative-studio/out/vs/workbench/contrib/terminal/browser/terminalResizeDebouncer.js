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
import { getWindow, runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
var Constants;
(function (Constants) {
    /**
     * The _normal_ buffer length threshold at which point resizing starts being debounced.
     */
    Constants[Constants["StartDebouncingThreshold"] = 200] = "StartDebouncingThreshold";
})(Constants || (Constants = {}));
export class TerminalResizeDebouncer extends Disposable {
    constructor(_isVisible, _getXterm, _resizeBothCallback, _resizeXCallback, _resizeYCallback) {
        super();
        this._isVisible = _isVisible;
        this._getXterm = _getXterm;
        this._resizeBothCallback = _resizeBothCallback;
        this._resizeXCallback = _resizeXCallback;
        this._resizeYCallback = _resizeYCallback;
        this._latestX = 0;
        this._latestY = 0;
        this._resizeXJob = this._register(new MutableDisposable());
        this._resizeYJob = this._register(new MutableDisposable());
    }
    async resize(cols, rows, immediate) {
        this._latestX = cols;
        this._latestY = rows;
        // Resize immediately if requested explicitly or if the buffer is small
        if (immediate || this._getXterm().raw.buffer.normal.length < 200 /* Constants.StartDebouncingThreshold */) {
            this._resizeXJob.clear();
            this._resizeYJob.clear();
            this._resizeBothCallback(cols, rows);
            return;
        }
        // Resize in an idle callback if the terminal is not visible
        const win = getWindow(this._getXterm().raw.element);
        if (win && !this._isVisible()) {
            if (!this._resizeXJob.value) {
                this._resizeXJob.value = runWhenWindowIdle(win, async () => {
                    this._resizeXCallback(this._latestX);
                    this._resizeXJob.clear();
                });
            }
            if (!this._resizeYJob.value) {
                this._resizeYJob.value = runWhenWindowIdle(win, async () => {
                    this._resizeYCallback(this._latestY);
                    this._resizeYJob.clear();
                });
            }
            return;
        }
        // Update dimensions independently as vertical resize is cheap and horizontal resize is
        // expensive due to reflow.
        this._resizeYCallback(rows);
        this._latestX = cols;
        this._debounceResizeX(cols);
    }
    flush() {
        if (this._resizeXJob.value || this._resizeYJob.value) {
            this._resizeXJob.clear();
            this._resizeYJob.clear();
            this._resizeBothCallback(this._latestX, this._latestY);
        }
    }
    _debounceResizeX(cols) {
        this._resizeXCallback(cols);
    }
}
__decorate([
    debounce(100)
], TerminalResizeDebouncer.prototype, "_debounceResizeX", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSZXNpemVEZWJvdW5jZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFJlc2l6ZURlYm91bmNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdyRixJQUFXLFNBS1Y7QUFMRCxXQUFXLFNBQVM7SUFDbkI7O09BRUc7SUFDSCxtRkFBOEIsQ0FBQTtBQUMvQixDQUFDLEVBTFUsU0FBUyxLQUFULFNBQVMsUUFLbkI7QUFFRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJQU90RCxZQUNrQixVQUF5QixFQUN6QixTQUEwQyxFQUMxQyxtQkFBeUQsRUFDekQsZ0JBQXdDLEVBQ3hDLGdCQUF3QztRQUV6RCxLQUFLLEVBQUUsQ0FBQztRQU5TLGVBQVUsR0FBVixVQUFVLENBQWU7UUFDekIsY0FBUyxHQUFULFNBQVMsQ0FBaUM7UUFDMUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQztRQUN6RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXdCO1FBQ3hDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBd0I7UUFYbEQsYUFBUSxHQUFXLENBQUMsQ0FBQztRQUNyQixhQUFRLEdBQVcsQ0FBQyxDQUFDO1FBRVosZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELGdCQUFXLEdB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