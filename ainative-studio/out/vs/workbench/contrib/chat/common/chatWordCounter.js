/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const r = String.raw;
/**
 * Matches `[text](link title?)` or `[text](<link> title?)`
 *
 * Taken from vscode-markdown-languageservice
 */
const linkPattern = r `(?<!\\)` + // Must not start with escape
    // text
    r `(!?\[` + // open prefix match -->
    /**/ r `(?:` +
    /*****/ r `[^\[\]\\]|` + // Non-bracket chars, or...
    /*****/ r `\\.|` + // Escaped char, or...
    /*****/ r `\[[^\[\]]*\]` + // Matched bracket pair
    /**/ r `)*` +
    r `\])` + // <-- close prefix match
    // Destination
    r `(\(\s*)` + // Pre href
    /**/ r `(` +
    /*****/ r `[^\s\(\)<](?:[^\s\(\)]|\([^\s\(\)]*?\))*|` + // Link without whitespace, or...
    /*****/ r `<(?:\\[<>]|[^<>])+>` + // In angle brackets
    /**/ r `)` +
    // Title
    /**/ r `\s*(?:"[^"]*"|'[^']*'|\([^\(\)]*\))?\s*` +
    r `\)`;
export function getNWords(str, numWordsToCount) {
    // This regex matches each word and skips over whitespace and separators. A word is:
    // A markdown link
    // One chinese character
    // One or more + - =, handled so that code like "a=1+2-3" is broken up better
    // One or more characters that aren't whitepace or any of the above
    const allWordMatches = Array.from(str.matchAll(new RegExp(linkPattern + r `|\p{sc=Han}|=+|\++|-+|[^\s\|\p{sc=Han}|=|\+|\-]+`, 'gu')));
    const targetWords = allWordMatches.slice(0, numWordsToCount);
    const endIndex = numWordsToCount >= allWordMatches.length
        ? str.length // Reached end of string
        : targetWords.length ? targetWords.at(-1).index + targetWords.at(-1)[0].length : 0;
    const value = str.substring(0, endIndex);
    return {
        value,
        returnedWordCount: targetWords.length === 0 ? (value.length ? 1 : 0) : targetWords.length,
        isFullString: endIndex >= str.length,
        totalWordCount: allWordMatches.length
    };
}
export function countWords(str) {
    const result = getNWords(str, Number.MAX_SAFE_INTEGER);
    return result.returnedWordCount;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRXb3JkQ291bnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO0FBRXJCOzs7O0dBSUc7QUFDSCxNQUFNLFdBQVcsR0FDaEIsQ0FBQyxDQUFBLFNBQVMsR0FBRyw2QkFBNkI7SUFFMUMsT0FBTztJQUNQLENBQUMsQ0FBQSxPQUFPLEdBQUcsd0JBQXdCO0lBQ25DLElBQUksQ0FBQSxDQUFDLENBQUEsS0FBSztJQUNWLE9BQU8sQ0FBQSxDQUFDLENBQUEsWUFBWSxHQUFHLDJCQUEyQjtJQUNsRCxPQUFPLENBQUEsQ0FBQyxDQUFBLE1BQU0sR0FBRyxzQkFBc0I7SUFDdkMsT0FBTyxDQUFBLENBQUMsQ0FBQSxjQUFjLEdBQUcsdUJBQXVCO0lBQ2hELElBQUksQ0FBQSxDQUFDLENBQUEsSUFBSTtJQUNULENBQUMsQ0FBQSxLQUFLLEdBQUcseUJBQXlCO0lBRWxDLGNBQWM7SUFDZCxDQUFDLENBQUEsU0FBUyxHQUFHLFdBQVc7SUFDeEIsSUFBSSxDQUFBLENBQUMsQ0FBQSxHQUFHO0lBQ1IsT0FBTyxDQUFBLENBQUMsQ0FBQSwyQ0FBMkMsR0FBRyxpQ0FBaUM7SUFDdkYsT0FBTyxDQUFBLENBQUMsQ0FBQSxxQkFBcUIsR0FBRyxvQkFBb0I7SUFDcEQsSUFBSSxDQUFBLENBQUMsQ0FBQSxHQUFHO0lBRVIsUUFBUTtJQUNSLElBQUksQ0FBQSxDQUFDLENBQUEseUNBQXlDO0lBQzlDLENBQUMsQ0FBQSxJQUFJLENBQUM7QUFFUCxNQUFNLFVBQVUsU0FBUyxDQUFDLEdBQVcsRUFBRSxlQUF1QjtJQUM3RCxvRkFBb0Y7SUFDcEYsa0JBQWtCO0lBQ2xCLHdCQUF3QjtJQUN4Qiw2RUFBNkU7SUFDN0UsbUVBQW1FO0lBQ25FLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFBLGtEQUFrRCxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVySSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUU3RCxNQUFNLFFBQVEsR0FBRyxlQUFlLElBQUksY0FBYyxDQUFDLE1BQU07UUFDeEQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsd0JBQXdCO1FBQ3JDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV0RixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN6QyxPQUFPO1FBQ04sS0FBSztRQUNMLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNO1FBQ3pGLFlBQVksRUFBRSxRQUFRLElBQUksR0FBRyxDQUFDLE1BQU07UUFDcEMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxNQUFNO0tBQ3JDLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxHQUFXO0lBQ3JDLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDdkQsT0FBTyxNQUFNLENBQUMsaUJBQWlCLENBQUM7QUFDakMsQ0FBQyJ9