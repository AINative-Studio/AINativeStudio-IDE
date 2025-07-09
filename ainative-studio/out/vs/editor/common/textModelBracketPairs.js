/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class BracketInfo {
    constructor(range, 
    /** 0-based level */
    nestingLevel, nestingLevelOfEqualBracketType, isInvalid) {
        this.range = range;
        this.nestingLevel = nestingLevel;
        this.nestingLevelOfEqualBracketType = nestingLevelOfEqualBracketType;
        this.isInvalid = isInvalid;
    }
}
export class BracketPairInfo {
    constructor(range, openingBracketRange, closingBracketRange, 
    /** 0-based */
    nestingLevel, nestingLevelOfEqualBracketType, bracketPairNode) {
        this.range = range;
        this.openingBracketRange = openingBracketRange;
        this.closingBracketRange = closingBracketRange;
        this.nestingLevel = nestingLevel;
        this.nestingLevelOfEqualBracketType = nestingLevelOfEqualBracketType;
        this.bracketPairNode = bracketPairNode;
    }
    get openingBracketInfo() {
        return this.bracketPairNode.openingBracket.bracketInfo;
    }
    get closingBracketInfo() {
        return this.bracketPairNode.closingBracket?.bracketInfo;
    }
}
export class BracketPairWithMinIndentationInfo extends BracketPairInfo {
    constructor(range, openingBracketRange, closingBracketRange, 
    /**
     * 0-based
    */
    nestingLevel, nestingLevelOfEqualBracketType, bracketPairNode, 
    /**
     * -1 if not requested, otherwise the size of the minimum indentation in the bracket pair in terms of visible columns.
    */
    minVisibleColumnIndentation) {
        super(range, openingBracketRange, closingBracketRange, nestingLevel, nestingLevelOfEqualBracketType, bracketPairNode);
        this.minVisibleColumnIndentation = minVisibleColumnIndentation;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsQnJhY2tldFBhaXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdGV4dE1vZGVsQnJhY2tldFBhaXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBc0VoRyxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNpQixLQUFZO0lBQzVCLG9CQUFvQjtJQUNKLFlBQW9CLEVBQ3BCLDhCQUFzQyxFQUN0QyxTQUFrQjtRQUpsQixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBRVosaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFRO1FBQ3RDLGNBQVMsR0FBVCxTQUFTLENBQVM7SUFDL0IsQ0FBQztDQUNMO0FBRUQsTUFBTSxPQUFPLGVBQWU7SUFDM0IsWUFDaUIsS0FBWSxFQUNaLG1CQUEwQixFQUMxQixtQkFBc0M7SUFDdEQsY0FBYztJQUNFLFlBQW9CLEVBQ3BCLDhCQUFzQyxFQUNyQyxlQUE0QjtRQU43QixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFPO1FBQzFCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBbUI7UUFFdEMsaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFRO1FBQ3JDLG9CQUFlLEdBQWYsZUFBZSxDQUFhO0lBRzlDLENBQUM7SUFFRCxJQUFXLGtCQUFrQjtRQUM1QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLFdBQWlDLENBQUM7SUFDOUUsQ0FBQztJQUVELElBQVcsa0JBQWtCO1FBQzVCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsV0FBNkMsQ0FBQztJQUMzRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8saUNBQWtDLFNBQVEsZUFBZTtJQUNyRSxZQUNDLEtBQVksRUFDWixtQkFBMEIsRUFDMUIsbUJBQXNDO0lBQ3RDOztNQUVFO0lBQ0YsWUFBb0IsRUFDcEIsOEJBQXNDLEVBQ3RDLGVBQTRCO0lBQzVCOztNQUVFO0lBQ2MsMkJBQW1DO1FBRW5ELEtBQUssQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLDhCQUE4QixFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRnRHLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBUTtJQUdwRCxDQUFDO0NBQ0QifQ==