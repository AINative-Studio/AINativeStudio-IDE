/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class DelegatingEditor extends Disposable {
    constructor() {
        super(...arguments);
        this._id = ++DelegatingEditor.idCounter;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        // #endregion
    }
    static { this.idCounter = 0; }
    getId() { return this.getEditorType() + ':v2:' + this._id; }
    // #region editorBrowser.IDiffEditor: Delegating to modified Editor
    getVisibleColumnFromPosition(position) {
        return this._targetEditor.getVisibleColumnFromPosition(position);
    }
    getStatusbarColumn(position) {
        return this._targetEditor.getStatusbarColumn(position);
    }
    getPosition() {
        return this._targetEditor.getPosition();
    }
    setPosition(position, source = 'api') {
        this._targetEditor.setPosition(position, source);
    }
    revealLine(lineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLine(lineNumber, scrollType);
    }
    revealLineInCenter(lineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLineInCenter(lineNumber, scrollType);
    }
    revealLineInCenterIfOutsideViewport(lineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLineInCenterIfOutsideViewport(lineNumber, scrollType);
    }
    revealLineNearTop(lineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLineNearTop(lineNumber, scrollType);
    }
    revealPosition(position, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealPosition(position, scrollType);
    }
    revealPositionInCenter(position, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealPositionInCenter(position, scrollType);
    }
    revealPositionInCenterIfOutsideViewport(position, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealPositionInCenterIfOutsideViewport(position, scrollType);
    }
    revealPositionNearTop(position, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealPositionNearTop(position, scrollType);
    }
    getSelection() {
        return this._targetEditor.getSelection();
    }
    getSelections() {
        return this._targetEditor.getSelections();
    }
    setSelection(something, source = 'api') {
        this._targetEditor.setSelection(something, source);
    }
    setSelections(ranges, source = 'api') {
        this._targetEditor.setSelections(ranges, source);
    }
    revealLines(startLineNumber, endLineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLines(startLineNumber, endLineNumber, scrollType);
    }
    revealLinesInCenter(startLineNumber, endLineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLinesInCenter(startLineNumber, endLineNumber, scrollType);
    }
    revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType);
    }
    revealLinesNearTop(startLineNumber, endLineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLinesNearTop(startLineNumber, endLineNumber, scrollType);
    }
    revealRange(range, scrollType = 0 /* ScrollType.Smooth */, revealVerticalInCenter = false, revealHorizontal = true) {
        this._targetEditor.revealRange(range, scrollType, revealVerticalInCenter, revealHorizontal);
    }
    revealRangeInCenter(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeInCenter(range, scrollType);
    }
    revealRangeInCenterIfOutsideViewport(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeInCenterIfOutsideViewport(range, scrollType);
    }
    revealRangeNearTop(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeNearTop(range, scrollType);
    }
    revealRangeNearTopIfOutsideViewport(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeNearTopIfOutsideViewport(range, scrollType);
    }
    revealRangeAtTop(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeAtTop(range, scrollType);
    }
    getSupportedActions() {
        return this._targetEditor.getSupportedActions();
    }
    focus() {
        this._targetEditor.focus();
    }
    trigger(source, handlerId, payload) {
        this._targetEditor.trigger(source, handlerId, payload);
    }
    createDecorationsCollection(decorations) {
        return this._targetEditor.createDecorationsCollection(decorations);
    }
    changeDecorations(callback) {
        return this._targetEditor.changeDecorations(callback);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZWdhdGluZ0VkaXRvckltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZGVsZWdhdGluZ0VkaXRvckltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQVVsRSxNQUFNLE9BQWdCLGdCQUFpQixTQUFRLFVBQVU7SUFBekQ7O1FBRWtCLFFBQUcsR0FBRyxFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQztRQUVuQyxrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ3JELGlCQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7UUFtSnhELGFBQWE7SUFDZCxDQUFDO2FBeEplLGNBQVMsR0FBRyxDQUFDLEFBQUosQ0FBSztJQVE3QixLQUFLLEtBQWEsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBYXBFLG1FQUFtRTtJQUU1RCw0QkFBNEIsQ0FBQyxRQUFtQjtRQUN0RCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVNLGtCQUFrQixDQUFDLFFBQW1CO1FBQzVDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU0sV0FBVztRQUNqQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxF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