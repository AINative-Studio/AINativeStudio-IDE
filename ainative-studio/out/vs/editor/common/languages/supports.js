/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function createScopedLineTokens(context, offset) {
    const tokenCount = context.getCount();
    const tokenIndex = context.findTokenIndexAtOffset(offset);
    const desiredLanguageId = context.getLanguageId(tokenIndex);
    let lastTokenIndex = tokenIndex;
    while (lastTokenIndex + 1 < tokenCount && context.getLanguageId(lastTokenIndex + 1) === desiredLanguageId) {
        lastTokenIndex++;
    }
    let firstTokenIndex = tokenIndex;
    while (firstTokenIndex > 0 && context.getLanguageId(firstTokenIndex - 1) === desiredLanguageId) {
        firstTokenIndex--;
    }
    return new ScopedLineTokens(context, desiredLanguageId, firstTokenIndex, lastTokenIndex + 1, context.getStartOffset(firstTokenIndex), context.getEndOffset(lastTokenIndex));
}
export class ScopedLineTokens {
    constructor(actual, languageId, firstTokenIndex, lastTokenIndex, firstCharOffset, lastCharOffset) {
        this._scopedLineTokensBrand = undefined;
        this._actual = actual;
        this.languageId = languageId;
        this._firstTokenIndex = firstTokenIndex;
        this._lastTokenIndex = lastTokenIndex;
        this.firstCharOffset = firstCharOffset;
        this._lastCharOffset = lastCharOffset;
        this.languageIdCodec = actual.languageIdCodec;
    }
    getLineContent() {
        const actualLineContent = this._actual.getLineContent();
        return actualLineContent.substring(this.firstCharOffset, this._lastCharOffset);
    }
    getLineLength() {
        return this._lastCharOffset - this.firstCharOffset;
    }
    getActualLineContentBefore(offset) {
        const actualLineContent = this._actual.getLineContent();
        return actualLineContent.substring(0, this.firstCharOffset + offset);
    }
    getTokenCount() {
        return this._lastTokenIndex - this._firstTokenIndex;
    }
    findTokenIndexAtOffset(offset) {
        return this._actual.findTokenIndexAtOffset(offset + this.firstCharOffset) - this._firstTokenIndex;
    }
    getStandardTokenType(tokenIndex) {
        return this._actual.getStandardTokenType(tokenIndex + this._firstTokenIndex);
    }
    toIViewLineTokens() {
        return this._actual.sliceAndInflate(this.firstCharOffset, this._lastCharOffset, 0);
    }
}
var IgnoreBracketsInTokens;
(function (IgnoreBracketsInTokens) {
    IgnoreBracketsInTokens[IgnoreBracketsInTokens["value"] = 3] = "value";
})(IgnoreBracketsInTokens || (IgnoreBracketsInTokens = {}));
export function ignoreBracketsInToken(standardTokenType) {
    return (standardTokenType & 3 /* IgnoreBracketsInTokens.value */) !== 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwcG9ydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvc3VwcG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxVQUFVLHNCQUFzQixDQUFDLE9BQW1CLEVBQUUsTUFBYztJQUN6RSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDdEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzFELE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUU1RCxJQUFJLGNBQWMsR0FBRyxVQUFVLENBQUM7SUFDaEMsT0FBTyxjQUFjLEdBQUcsQ0FBQyxHQUFHLFVBQVUsSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1FBQzNHLGNBQWMsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLGVBQWUsR0FBRyxVQUFVLENBQUM7SUFDakMsT0FBTyxlQUFlLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxhQUFhLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxLQUFLLGlCQUFpQixFQUFFLENBQUM7UUFDaEcsZUFBZSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVELE9BQU8sSUFBSSxnQkFBZ0IsQ0FDMUIsT0FBTyxFQUNQLGlCQUFpQixFQUNqQixlQUFlLEVBQ2YsY0FBYyxHQUFHLENBQUMsRUFDbEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsRUFDdkMsT0FBTyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FDcEMsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLE9BQU8sZ0JBQWdCO0lBVzVCLFlBQ0MsTUFBa0IsRUFDbEIsVUFBa0IsRUFDbEIsZUFBdUIsRUFDdkIsY0FBc0IsRUFDdEIsZUFBdUIsRUFDdkIsY0FBc0I7UUFoQnZCLDJCQUFzQixHQUFTLFNBQVMsQ0FBQztRQWtCeEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQztRQUN4QyxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUN0QyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUN0QyxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUM7SUFDL0MsQ0FBQztJQUVNLGNBQWM7UUFDcEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3hELE9BQU8saUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQ3BELENBQUM7SUFFTSwwQkFBMEIsQ0FBQyxNQUFjO1FBQy9DLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN4RCxPQUFPLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRU0sYUFBYTtRQUNuQixPQUFPLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDO0lBQ3JELENBQUM7SUFFTSxzQkFBc0IsQ0FBQyxNQUFjO1FBQzNDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztJQUNuRyxDQUFDO0lBRU0sb0JBQW9CLENBQUMsVUFBa0I7UUFDN0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7Q0FDRDtBQUVELElBQVcsc0JBRVY7QUFGRCxXQUFXLHNCQUFzQjtJQUNoQyxxRUFBc0YsQ0FBQTtBQUN2RixDQUFDLEVBRlUsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUVoQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxpQkFBb0M7SUFDekUsT0FBTyxDQUFDLGlCQUFpQix1Q0FBK0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNqRSxDQUFDIn0=