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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsR3VpZGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3RleHRNb2RlbEd1aWRlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQTZCaEcsTUFBTSxDQUFOLElBQVkscUJBSVg7QUFKRCxXQUFZLHFCQUFxQjtJQUNoQyx5RUFBUSxDQUFBO0lBQ1IseUZBQWdCLENBQUE7SUFDaEIsdUVBQU8sQ0FBQTtBQUNSLENBQUMsRUFKVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBSWhDO0FBUUQsTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDaUIsYUFBMEIsRUFDMUIsTUFBbUIsRUFDbkIsU0FBaUI7SUFDakM7OztNQUdFO0lBQ2MsY0FBZ0Q7SUFDaEU7O01BRUU7SUFDYywwQkFBdUMsRUFDdkMsK0JBQTRDO1FBWjVDLGtCQUFhLEdBQWIsYUFBYSxDQUFhO1FBQzFCLFdBQU0sR0FBTixNQUFNLENBQWE7UUFDbkIsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUtqQixtQkFBYyxHQUFkLGNBQWMsQ0FBa0M7UUFJaEQsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFhO1FBQ3ZDLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBYTtRQUU1RCxJQUFJLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNuQixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUF5QjtJQUNyQyxZQUNpQixHQUFZLEVBQ1osU0FBaUI7UUFEakIsUUFBRyxHQUFILEdBQUcsQ0FBUztRQUNaLGNBQVMsR0FBVCxTQUFTLENBQVE7SUFDOUIsQ0FBQztDQUNMIn0=