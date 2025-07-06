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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsQnJhY2tldFBhaXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3RleHRNb2RlbEJyYWNrZXRQYWlycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXNFaEcsTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDaUIsS0FBWTtJQUM1QixvQkFBb0I7SUFDSixZQUFvQixFQUNwQiw4QkFBc0MsRUFDdEMsU0FBa0I7UUFKbEIsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUVaLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQ3BCLG1DQUE4QixHQUE5Qiw4QkFBOEIsQ0FBUTtRQUN0QyxjQUFTLEdBQVQsU0FBUyxDQUFTO0lBQy9CLENBQUM7Q0FDTDtBQUVELE1BQU0sT0FBTyxlQUFlO0lBQzNCLFlBQ2lCLEtBQVksRUFDWixtQkFBMEIsRUFDMUIsbUJBQXNDO0lBQ3RELGNBQWM7SUFDRSxZQUFvQixFQUNwQiw4QkFBc0MsRUFDckMsZUFBNEI7UUFON0IsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBTztRQUMxQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQW1CO1FBRXRDLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQ3BCLG1DQUE4QixHQUE5Qiw4QkFBOEIsQ0FBUTtRQUNyQyxvQkFBZSxHQUFmLGVBQWUsQ0FBYTtJQUc5QyxDQUFDO0lBRUQsSUFBVyxrQkFBa0I7UUFDNUIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxXQUFpQyxDQUFDO0lBQzlFLENBQUM7SUFFRCxJQUFXLGtCQUFrQjtRQUM1QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLFdBQTZDLENBQUM7SUFDM0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLGVBQWU7SUFDckUsWUFDQyxLQUFZLEVBQ1osbUJBQTBCLEVBQzFCLG1CQUFzQztJQUN0Qzs7TUFFRTtJQUNGLFlBQW9CLEVBQ3BCLDhCQUFzQyxFQUN0QyxlQUE0QjtJQUM1Qjs7TUFFRTtJQUNjLDJCQUFtQztRQUVuRCxLQUFLLENBQUMsS0FBSyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSw4QkFBOEIsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUZ0RyxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQVE7SUFHcEQsQ0FBQztDQUNEIn0=