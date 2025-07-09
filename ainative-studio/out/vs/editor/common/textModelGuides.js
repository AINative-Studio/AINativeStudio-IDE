/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var HorizontalGuidesState;
(function (HorizontalGuidesState) {
    HorizontalGuidesState[HorizontalGuidesState["Disabled"] = 0] = "Disabled";
    HorizontalGuidesState[HorizontalGuidesState["EnabledForActive"] = 1] = "EnabledForActive";
    HorizontalGuidesState[HorizontalGuidesState["Enabled"] = 2] = "Enabled";
})(HorizontalGuidesState || (HorizontalGuidesState = {}));
export class IndentGuide {
    constructor(visibleColumn, column, className, 
    /**
     * If set, this indent guide is a horizontal guide (no vertical part).
     * It starts at visibleColumn and continues until endColumn.
    */
    horizontalLine, 
    /**
     * If set (!= -1), only show this guide for wrapped lines that don't contain this model column, but are after it.
    */
    forWrappedLinesAfterColumn, forWrappedLinesBeforeOrAtColumn) {
        this.visibleColumn = visibleColumn;
        this.column = column;
        this.className = className;
        this.horizontalLine = horizontalLine;
        this.forWrappedLinesAfterColumn = forWrappedLinesAfterColumn;
        this.forWrappedLinesBeforeOrAtColumn = forWrappedLinesBeforeOrAtColumn;
        if ((visibleColumn !== -1) === (column !== -1)) {
            throw new Error();
        }
    }
}
export class IndentGuideHorizontalLine {
    constructor(top, endColumn) {
        this.top = top;
        this.endColumn = endColumn;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsR3VpZGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdGV4dE1vZGVsR3VpZGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBNkJoRyxNQUFNLENBQU4sSUFBWSxxQkFJWDtBQUpELFdBQVkscUJBQXFCO0lBQ2hDLHlFQUFRLENBQUE7SUFDUix5RkFBZ0IsQ0FBQTtJQUNoQix1RUFBTyxDQUFBO0FBQ1IsQ0FBQyxFQUpXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJaEM7QUFRRCxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNpQixhQUEwQixFQUMxQixNQUFtQixFQUNuQixTQUFpQjtJQUNqQzs7O01BR0U7SUFDYyxjQUFnRDtJQUNoRTs7TUFFRTtJQUNjLDBCQUF1QyxFQUN2QywrQkFBNEM7UUFaNUMsa0JBQWEsR0FBYixhQUFhLENBQWE7UUFDMUIsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNuQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBS2pCLG1CQUFjLEdBQWQsY0FBYyxDQUFrQztRQUloRCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQWE7UUFDdkMsb0NBQStCLEdBQS9CLCtCQUErQixDQUFhO1FBRTVELElBQUksQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEQsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ25CLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQXlCO0lBQ3JDLFlBQ2lCLEdBQVksRUFDWixTQUFpQjtRQURqQixRQUFHLEdBQUgsR0FBRyxDQUFTO1FBQ1osY0FBUyxHQUFULFNBQVMsQ0FBUTtJQUM5QixDQUFDO0NBQ0wifQ==