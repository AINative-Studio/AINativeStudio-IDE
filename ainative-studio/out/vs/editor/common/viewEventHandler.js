/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../base/common/lifecycle.js';
export class ViewEventHandler extends Disposable {
    constructor() {
        super();
        this._shouldRender = true;
    }
    shouldRender() {
        return this._shouldRender;
    }
    forceShouldRender() {
        this._shouldRender = true;
    }
    setShouldRender() {
        this._shouldRender = true;
    }
    onDidRender() {
        this._shouldRender = false;
    }
    // --- begin event handlers
    onCompositionStart(e) {
        return false;
    }
    onCompositionEnd(e) {
        return false;
    }
    onConfigurationChanged(e) {
        return false;
    }
    onCursorStateChanged(e) {
        return false;
    }
    onDecorationsChanged(e) {
        return false;
    }
    onFlushed(e) {
        return false;
    }
    onFocusChanged(e) {
        return false;
    }
    onLanguageConfigurationChanged(e) {
        return false;
    }
    onLineMappingChanged(e) {
        return false;
    }
    onLinesChanged(e) {
        return false;
    }
    onLinesDeleted(e) {
        return false;
    }
    onLinesInserted(e) {
        return false;
    }
    onRevealRangeRequest(e) {
        return false;
    }
    onScrollChanged(e) {
        return false;
    }
    onThemeChanged(e) {
        return false;
    }
    onTokensChanged(e) {
        return false;
    }
    onTokensColorsChanged(e) {
        return false;
    }
    onZonesChanged(e) {
        return false;
    }
    // --- end event handlers
    handleEvents(events) {
        let shouldRender = false;
        for (let i = 0, len = events.length; i < len; i++) {
            const e = events[i];
            switch (e.type) {
                case 0 /* viewEvents.ViewEventType.ViewCompositionStart */:
                    if (this.onCompositionStart(e)) {
                        shouldRender = true;
                    }
                    break;
                case 1 /* viewEvents.ViewEventType.ViewCompositionEnd */:
                    if (this.onCompositionEnd(e)) {
                        shouldRender = true;
                    }
                    break;
                case 2 /* viewEvents.ViewEventType.ViewConfigurationChanged */:
                    if (this.onConfigurationChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 3 /* viewEvents.ViewEventType.ViewCursorStateChanged */:
                    if (this.onCursorStateChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 4 /* viewEvents.ViewEventType.ViewDecorationsChanged */:
                    if (this.onDecorationsChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 5 /* viewEvents.ViewEventType.ViewFlushed */:
                    if (this.onFlushed(e)) {
                        shouldRender = true;
                    }
                    break;
                case 6 /* viewEvents.ViewEventType.ViewFocusChanged */:
                    if (this.onFocusChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 7 /* viewEvents.ViewEventType.ViewLanguageConfigurationChanged */:
                    if (this.onLanguageConfigurationChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 8 /* viewEvents.ViewEventType.ViewLineMappingChanged */:
                    if (this.onLineMappingChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 9 /* viewEvents.ViewEventType.ViewLinesChanged */:
                    if (this.onLinesChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 10 /* viewEvents.ViewEventType.ViewLinesDeleted */:
                    if (this.onLinesDeleted(e)) {
                        shouldRender = true;
                    }
                    break;
                case 11 /* viewEvents.ViewEventType.ViewLinesInserted */:
                    if (this.onLinesInserted(e)) {
                        shouldRender = true;
                    }
                    break;
                case 12 /* viewEvents.ViewEventType.ViewRevealRangeRequest */:
                    if (this.onRevealRangeRequest(e)) {
                        shouldRender = true;
                    }
                    break;
                case 13 /* viewEvents.ViewEventType.ViewScrollChanged */:
                    if (this.onScrollChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 15 /* viewEvents.ViewEventType.ViewTokensChanged */:
                    if (this.onTokensChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 14 /* viewEvents.ViewEventType.ViewThemeChanged */:
                    if (this.onThemeChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 16 /* viewEvents.ViewEventType.ViewTokensColorsChanged */:
                    if (this.onTokensColorsChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 17 /* viewEvents.ViewEventType.ViewZonesChanged */:
                    if (this.onZonesChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                default:
                    console.info('View received unknown event: ');
                    console.info(e);
            }
        }
        if (shouldRender) {
            this._shouldRender = true;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0V2ZW50SGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdFdmVudEhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRzVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO0lBSS9DO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztJQUMzQixDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDM0IsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztJQUMzQixDQUFDO0lBRVMsZUFBZTtRQUN4QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztJQUMzQixDQUFDO0lBRU0sV0FBVztRQUNqQixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztJQUM1QixDQUFDO0lBRUQsMkJBQTJCO0lBRXBCLGtCQUFrQixDQUFDLENBQXVDO1FBQ2hFLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNNLGdCQUFnQixDQUFDLENBQXFDO1FBQzVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNNLHNCQUFzQixDQUFDLENBQTJDO1FBQ3hFLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNNLG9CQUFvQixDQUFDLENBQXlDO1FBQ3BFLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNNLG9CQUFvQixDQUFDLENBQXlDO1FBQ3BFLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNNLFNBQVMsQ0FBQyxDQUE4QjtRQUM5QyxPQUFPLEtB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