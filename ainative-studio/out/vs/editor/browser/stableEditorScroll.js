/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class StableEditorScrollState {
    static capture(editor) {
        if (editor.getScrollTop() === 0 || editor.hasPendingScrollAnimation()) {
            // Never mess with the scroll top if the editor is at the top of the file or if there is a pending scroll animation
            return new StableEditorScrollState(editor.getScrollTop(), editor.getContentHeight(), null, 0, null);
        }
        let visiblePosition = null;
        let visiblePositionScrollDelta = 0;
        const visibleRanges = editor.getVisibleRanges();
        if (visibleRanges.length > 0) {
            visiblePosition = visibleRanges[0].getStartPosition();
            const visiblePositionScrollTop = editor.getTopForPosition(visiblePosition.lineNumber, visiblePosition.column);
            visiblePositionScrollDelta = editor.getScrollTop() - visiblePositionScrollTop;
        }
        return new StableEditorScrollState(editor.getScrollTop(), editor.getContentHeight(), visiblePosition, visiblePositionScrollDelta, editor.getPosition());
    }
    constructor(_initialScrollTop, _initialContentHeight, _visiblePosition, _visiblePositionScrollDelta, _cursorPosition) {
        this._initialScrollTop = _initialScrollTop;
        this._initialContentHeight = _initialContentHeight;
        this._visiblePosition = _visiblePosition;
        this._visiblePositionScrollDelta = _visiblePositionScrollDelta;
        this._cursorPosition = _cursorPosition;
    }
    restore(editor) {
        if (this._initialContentHeight === editor.getContentHeight() && this._initialScrollTop === editor.getScrollTop()) {
            // The editor's content height and scroll top haven't changed, so we don't need to do anything
            return;
        }
        if (this._visiblePosition) {
            const visiblePositionScrollTop = editor.getTopForPosition(this._visiblePosition.lineNumber, this._visiblePosition.column);
            editor.setScrollTop(visiblePositionScrollTop + this._visiblePositionScrollDelta);
        }
    }
    restoreRelativeVerticalPositionOfCursor(editor) {
        if (this._initialContentHeight === editor.getContentHeight() && this._initialScrollTop === editor.getScrollTop()) {
            // The editor's content height and scroll top haven't changed, so we don't need to do anything
            return;
        }
        const currentCursorPosition = editor.getPosition();
        if (!this._cursorPosition || !currentCursorPosition) {
            return;
        }
        const offset = editor.getTopForLineNumber(currentCursorPosition.lineNumber) - editor.getTopForLineNumber(this._cursorPosition.lineNumber);
        editor.setScrollTop(editor.getScrollTop() + offset, 1 /* ScrollType.Immediate */);
    }
}
export class StableEditorBottomScrollState {
    static capture(editor) {
        if (editor.hasPendingScrollAnimation()) {
            // Never mess with the scroll if there is a pending scroll animation
            return new StableEditorBottomScrollState(editor.getScrollTop(), editor.getContentHeight(), null, 0);
        }
        let visiblePosition = null;
        let visiblePositionScrollDelta = 0;
        const visibleRanges = editor.getVisibleRanges();
        if (visibleRanges.length > 0) {
            visiblePosition = visibleRanges.at(-1).getEndPosition();
            const visiblePositionScrollBottom = editor.getBottomForLineNumber(visiblePosition.lineNumber);
            visiblePositionScrollDelta = visiblePositionScrollBottom - editor.getScrollTop();
        }
        return new StableEditorBottomScrollState(editor.getScrollTop(), editor.getContentHeight(), visiblePosition, visiblePositionScrollDelta);
    }
    constructor(_initialScrollTop, _initialContentHeight, _visiblePosition, _visiblePositionScrollDelta) {
        this._initialScrollTop = _initialScrollTop;
        this._initialContentHeight = _initialContentHeight;
        this._visiblePosition = _visiblePosition;
        this._visiblePositionScrollDelta = _visiblePositionScrollDelta;
    }
    restore(editor) {
        if (this._initialContentHeight === editor.getContentHeight() && this._initialScrollTop === editor.getScrollTop()) {
            // The editor's content height and scroll top haven't changed, so we don't need to do anything
            return;
        }
        if (this._visiblePosition) {
            const visiblePositionScrollBottom = editor.getBottomForLineNumber(this._visiblePosition.lineNumber);
            editor.setScrollTop(visiblePositionScrollBottom - this._visiblePositionScrollDelta, 1 /* ScrollType.Immediate */);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhYmxlRWRpdG9yU2Nyb2xsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3N0YWJsZUVkaXRvclNjcm9sbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLE9BQU8sdUJBQXVCO0lBRTVCLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBbUI7UUFDeEMsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLENBQUM7WUFDdkUsbUhBQW1IO1lBQ25ILE9BQU8sSUFBSSx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRyxDQUFDO1FBRUQsSUFBSSxlQUFlLEdBQW9CLElBQUksQ0FBQztRQUM1QyxJQUFJLDBCQUEwQixHQUFHLENBQUMsQ0FBQztRQUNuQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNoRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDOUIsZUFBZSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RELE1BQU0sd0JBQXdCLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlHLDBCQUEwQixHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQztRQUMvRSxDQUFDO1FBQ0QsT0FBTyxJQUFJLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxZQUFZ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