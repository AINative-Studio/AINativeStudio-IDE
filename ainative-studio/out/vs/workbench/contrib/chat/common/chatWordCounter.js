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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0V29yZENvdW50ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUVyQjs7OztHQUlHO0FBQ0gsTUFBTSxXQUFXLEdBQ2hCLENBQUMsQ0FBQSxTQUFTLEdBQUcsNkJBQTZCO0lBRTFDLE9BQU87SUFDUCxDQUFDLENBQUEsT0FBTyxHQUFHLHdCQUF3QjtJQUNuQyxJQUFJLENBQUEsQ0FBQyxDQUFBLEtBQUs7SUFDVixPQUFPLENBQUEsQ0FBQyxDQUFBLFlBQVksR0FBRywyQkFBMkI7SUFDbEQsT0FBTyxDQUFBLENBQUMsQ0FBQSxNQUFNLEdBQUcsc0JBQXNCO0lBQ3ZDLE9BQU8sQ0FBQSxDQUFDLENBQUEsY0FBYyxHQUFHLHVCQUF1QjtJQUNoRCxJQUFJLENBQUEsQ0FBQyxDQUFBLElBQUk7SUFDVCxDQUFDLENBQUEsS0FBSyxHQUFHLHlCQUF5QjtJQUVsQyxjQUFjO0lBQ2QsQ0FBQyxDQUFBLFNBQVMsR0FBRyxXQUFXO0lBQ3hCLElBQUksQ0FBQSxDQUFDLENBQUEsR0FBRztJQUNSLE9BQU8sQ0FBQSxDQUFDLENBQUEsMkNBQTJDLEdBQUcsaUNBQWlDO0lBQ3ZGLE9BQU8sQ0FBQSxDQUFDLENBQUEscUJBQXFCLEdBQUcsb0JBQW9CO0lBQ3BELElBQUksQ0FBQSxDQUFDLENBQUEsR0FBRztJQUVSLFFBQVE7SUFDUixJQUFJLENBQUEsQ0FBQyxDQUFBLHlDQUF5QztJQUM5QyxDQUFDLENBQUEsSUFBSSxDQUFDO0FBRVAsTUFBTSxVQUFVLFNBQVMsQ0FBQyxHQUFXLEVBQUUsZUFBdUI7SUFDN0Qsb0ZBQW9GO0lBQ3BGLGtCQUFrQjtJQUNsQix3QkFBd0I7SUFDeEIsNkVBQTZFO0lBQzdFLG1FQUFtRTtJQUNuRSxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQSxrREFBa0QsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFckksTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFFN0QsTUFBTSxRQUFRLEdBQUcsZUFBZSxJQUFJLGNBQWMsQ0FBQyxNQUFNO1FBQ3hELENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLHdCQUF3QjtRQUNyQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEYsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDekMsT0FBTztRQUNOLEtBQUs7UUFDTCxpQkFBaUIsRUFBRSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUN6RixZQUFZLEVBQUUsUUFBUSxJQUFJLEdBQUcsQ0FBQyxNQUFNO1FBQ3BDLGNBQWMsRUFBRSxjQUFjLENBQUMsTUFBTTtLQUNyQyxDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsR0FBVztJQUNyQyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZELE9BQU8sTUFBTSxDQUFDLGlCQUFpQixDQUFDO0FBQ2pDLENBQUMifQ==