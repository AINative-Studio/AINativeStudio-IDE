/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var IndentConsts;
(function (IndentConsts) {
    IndentConsts[IndentConsts["INCREASE_MASK"] = 1] = "INCREASE_MASK";
    IndentConsts[IndentConsts["DECREASE_MASK"] = 2] = "DECREASE_MASK";
    IndentConsts[IndentConsts["INDENT_NEXTLINE_MASK"] = 4] = "INDENT_NEXTLINE_MASK";
    IndentConsts[IndentConsts["UNINDENT_MASK"] = 8] = "UNINDENT_MASK";
})(IndentConsts || (IndentConsts = {}));
function resetGlobalRegex(reg) {
    if (reg.global) {
        reg.lastIndex = 0;
    }
    return true;
}
export class IndentRulesSupport {
    constructor(indentationRules) {
        this._indentationRules = indentationRules;
    }
    shouldIncrease(text) {
        if (this._indentationRules) {
            if (this._indentationRules.increaseIndentPattern && resetGlobalRegex(this._indentationRules.increaseIndentPattern) && this._indentationRules.increaseIndentPattern.test(text)) {
                return true;
            }
            // if (this._indentationRules.indentNextLinePattern && this._indentationRules.indentNextLinePattern.test(text)) {
            // 	return true;
            // }
        }
        return false;
    }
    shouldDecrease(text) {
        if (this._indentationRules && this._indentationRules.decreaseIndentPattern && resetGlobalRegex(this._indentationRules.decreaseIndentPattern) && this._indentationRules.decreaseIndentPattern.test(text)) {
            return true;
        }
        return false;
    }
    shouldIndentNextLine(text) {
        if (this._indentationRules && this._indentationRules.indentNextLinePattern && resetGlobalRegex(this._indentationRules.indentNextLinePattern) && this._indentationRules.indentNextLinePattern.test(text)) {
            return true;
        }
        return false;
    }
    shouldIgnore(text) {
        // the text matches `unIndentedLinePattern`
        if (this._indentationRules && this._indentationRules.unIndentedLinePattern && resetGlobalRegex(this._indentationRules.unIndentedLinePattern) && this._indentationRules.unIndentedLinePattern.test(text)) {
            return true;
        }
        return false;
    }
    getIndentMetadata(text) {
        let ret = 0;
        if (this.shouldIncrease(text)) {
            ret += 1 /* IndentConsts.INCREASE_MASK */;
        }
        if (this.shouldDecrease(text)) {
            ret += 2 /* IndentConsts.DECREASE_MASK */;
        }
        if (this.shouldIndentNextLine(text)) {
            ret += 4 /* IndentConsts.INDENT_NEXTLINE_MASK */;
        }
        if (this.shouldIgnore(text)) {
            ret += 8 /* IndentConsts.UNINDENT_MASK */;
        }
        return ret;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50UnVsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvc3VwcG9ydHMvaW5kZW50UnVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxDQUFOLElBQWtCLFlBS2pCO0FBTEQsV0FBa0IsWUFBWTtJQUM3QixpRUFBMEIsQ0FBQTtJQUMxQixpRUFBMEIsQ0FBQTtJQUMxQiwrRUFBaUMsQ0FBQTtJQUNqQyxpRUFBMEIsQ0FBQTtBQUMzQixDQUFDLEVBTGlCLFlBQVksS0FBWixZQUFZLFFBSzdCO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFXO0lBQ3BDLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBSTlCLFlBQVksZ0JBQWlDO1FBQzVDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQztJQUMzQyxDQUFDO0lBRU0sY0FBYyxDQUFDLElBQVk7UUFDakMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQy9LLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUNELGlIQUFpSDtZQUNqSCxnQkFBZ0I7WUFDaEIsSUFBSTtRQUNMLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTSxjQUFjLENBQUMsSUFBWTtRQUNqQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3pNLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVNLG9CQUFvQixDQUFDLElBQVk7UUFDdkMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6TSxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTSxZQUFZLENBQUMsSUFBWTtRQUMvQiwyQ0FBMkM7UUFDM0MsSUFBSSxJQUFJLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6TSxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxJQUFZO1FBQ3BDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNaLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQy9CLEdBQUcsc0NBQThCLENBQUM7UUFDbkMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQy9CLEdBQUcsc0NBQThCLENBQUM7UUFDbkMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckMsR0FBRyw2Q0FBcUMsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDN0IsR0FBRyxzQ0FBOEIsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0NBQ0QifQ==