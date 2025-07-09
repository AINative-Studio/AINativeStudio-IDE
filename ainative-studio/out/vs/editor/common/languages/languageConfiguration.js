/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Describes what to do with the indentation when pressing Enter.
 */
export var IndentAction;
(function (IndentAction) {
    /**
     * Insert new line and copy the previous line's indentation.
     */
    IndentAction[IndentAction["None"] = 0] = "None";
    /**
     * Insert new line and indent once (relative to the previous line's indentation).
     */
    IndentAction[IndentAction["Indent"] = 1] = "Indent";
    /**
     * Insert two new lines:
     *  - the first one indented which will hold the cursor
     *  - the second one at the same indentation level
     */
    IndentAction[IndentAction["IndentOutdent"] = 2] = "IndentOutdent";
    /**
     * Insert new line and outdent once (relative to the previous line's indentation).
     */
    IndentAction[IndentAction["Outdent"] = 3] = "Outdent";
})(IndentAction || (IndentAction = {}));
/**
 * @internal
 */
export class StandardAutoClosingPairConditional {
    constructor(source) {
        this._neutralCharacter = null;
        this._neutralCharacterSearched = false;
        this.open = source.open;
        this.close = source.close;
        // initially allowed in all tokens
        this._inString = true;
        this._inComment = true;
        this._inRegEx = true;
        if (Array.isArray(source.notIn)) {
            for (let i = 0, len = source.notIn.length; i < len; i++) {
                const notIn = source.notIn[i];
                switch (notIn) {
                    case 'string':
                        this._inString = false;
                        break;
                    case 'comment':
                        this._inComment = false;
                        break;
                    case 'regex':
                        this._inRegEx = false;
                        break;
                }
            }
        }
    }
    isOK(standardToken) {
        switch (standardToken) {
            case 0 /* StandardTokenType.Other */:
                return true;
            case 1 /* StandardTokenType.Comment */:
                return this._inComment;
            case 2 /* StandardTokenType.String */:
                return this._inString;
            case 3 /* StandardTokenType.RegEx */:
                return this._inRegEx;
        }
    }
    shouldAutoClose(context, column) {
        // Always complete on empty line
        if (context.getTokenCount() === 0) {
            return true;
        }
        const tokenIndex = context.findTokenIndexAtOffset(column - 2);
        const standardTokenType = context.getStandardTokenType(tokenIndex);
        return this.isOK(standardTokenType);
    }
    _findNeutralCharacterInRange(fromCharCode, toCharCode) {
        for (let charCode = fromCharCode; charCode <= toCharCode; charCode++) {
            const character = String.fromCharCode(charCode);
            if (!this.open.includes(character) && !this.close.includes(character)) {
                return character;
            }
        }
        return null;
    }
    /**
     * Find a character in the range [0-9a-zA-Z] that does not appear in the open or close
     */
    findNeutralCharacter() {
        if (!this._neutralCharacterSearched) {
            this._neutralCharacterSearched = true;
            if (!this._neutralCharacter) {
                this._neutralCharacter = this._findNeutralCharacterInRange(48 /* CharCode.Digit0 */, 57 /* CharCode.Digit9 */);
            }
            if (!this._neutralCharacter) {
                this._neutralCharacter = this._findNeutralCharacterInRange(97 /* CharCode.a */, 122 /* CharCode.z */);
            }
            if (!this._neutralCharacter) {
                this._neutralCharacter = this._findNeutralCharacterInRange(65 /* CharCode.A */, 90 /* CharCode.Z */);
            }
        }
        return this._neutralCharacter;
    }
}
/**
 * @internal
 */
export class AutoClosingPairs {
    constructor(autoClosingPairs) {
        this.autoClosingPairsOpenByStart = new Map();
        this.autoClosingPairsOpenByEnd = new Map();
        this.autoClosingPairsCloseByStart = new Map();
        this.autoClosingPairsCloseByEnd = new Map();
        this.autoClosingPairsCloseSingleChar = new Map();
        for (const pair of autoClosingPairs) {
            appendEntry(this.autoClosingPairsOpenByStart, pair.open.charAt(0), pair);
            appendEntry(this.autoClosingPairsOpenByEnd, pair.open.charAt(pair.open.length - 1), pair);
            appendEntry(this.autoClosingPairsCloseByStart, pair.close.charAt(0), pair);
            appendEntry(this.autoClosingPairsCloseByEnd, pair.close.charAt(pair.close.length - 1), pair);
            if (pair.close.length === 1 && pair.open.length === 1) {
                appendEntry(this.autoClosingPairsCloseSingleChar, pair.close, pair);
            }
        }
    }
}
function appendEntry(target, key, value) {
    if (target.has(key)) {
        target.get(key).push(value);
    }
    else {
        target.set(key, [value]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL2xhbmd1YWdlQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXlNaEc7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxZQW1CWDtBQW5CRCxXQUFZLFlBQVk7SUFDdkI7O09BRUc7SUFDSCwrQ0FBUSxDQUFBO0lBQ1I7O09BRUc7SUFDSCxtREFBVSxDQUFBO0lBQ1Y7Ozs7T0FJRztJQUNILGlFQUFpQixDQUFBO0lBQ2pCOztPQUVHO0lBQ0gscURBQVcsQ0FBQTtBQUNaLENBQUMsRUFuQlcsWUFBWSxLQUFaLFlBQVksUUFtQnZCO0FBMENEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtDQUFrQztJQVU5QyxZQUFZLE1BQW1DO1FBSHZDLHNCQUFpQixHQUFrQixJQUFJLENBQUM7UUFDeEMsOEJBQXlCLEdBQVksS0FBSyxDQUFDO1FBR2xELElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFFMUIsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBRXJCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxH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