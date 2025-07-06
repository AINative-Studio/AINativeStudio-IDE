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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFdvcmRDb3VudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFFckI7Ozs7R0FJRztBQUNILE1BQU0sV0FBVyxHQUNoQixDQUFDLENBQUEsU0FBUyxHQUFHLDZCQUE2QjtJQUUxQyxPQUFPO0lBQ1AsQ0FBQyxDQUFBLE9BQU8sR0FBRyx3QkFBd0I7SUFDbkMsSUFBSSxDQUFBLENBQUMsQ0FBQSxLQUFLO0lBQ1YsT0FBTyxDQUFBLENBQUMsQ0FBQSxZQUFZLEdBQUcsMkJBQTJCO0lBQ2xELE9BQU8sQ0FBQSxDQUFDLENBQUEsTUFBTSxHQUFHLHNCQUFzQjtJQUN2QyxPQUFPLENBQUEsQ0FBQyxDQUFBLGNBQWMsR0FBRyx1QkFBdUI7SUFDaEQsSUFBSSxDQUFBLENBQUMsQ0FBQSxJQUFJO0lBQ1QsQ0FBQyxDQUFBLEtBQUssR0FBRyx5QkFBeUI7SUFFbEMsY0FBYztJQUNkLENBQUMsQ0FBQSxTQUFTLEdBQUcsV0FBVztJQUN4QixJQUFJLENBQUEsQ0FBQyxDQUFBLEdBQUc7SUFDUixPQUFPLENBQUEsQ0FBQyxDQUFBLDJDQUEyQyxHQUFHLGlDQUFpQztJQUN2RixPQUFPLENBQUEsQ0FBQyxDQUFBLHFCQUFxQixHQUFHLG9CQUFvQjtJQUNwRCxJQUFJLENBQUEsQ0FBQyxDQUFBLEdBQUc7SUFFUixRQUFRO0lBQ1IsSUFBSSxDQUFBLENBQUMsQ0FBQSx5Q0FBeUM7SUFDOUMsQ0FBQyxDQUFBLElBQUksQ0FBQztBQUVQLE1BQU0sVUFBVSxTQUFTLENBQUMsR0FBVyxFQUFFLGVBQXVCO0lBQzdELG9GQUFvRjtJQUNwRixrQkFBa0I7SUFDbEIsd0JBQXdCO0lBQ3hCLDZFQUE2RTtJQUM3RSxtRUFBbUU7SUFDbkUsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUEsa0RBQWtELEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXJJLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBRTdELE1BQU0sUUFBUSxHQUFHLGVBQWUsSUFBSSxjQUFjLENBQUMsTUFBTTtRQUN4RCxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0I7UUFDckMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXRGLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3pDLE9BQU87UUFDTixLQUFLO1FBQ0wsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU07UUFDekYsWUFBWSxFQUFFLFFBQVEsSUFBSSxHQUFHLENBQUMsTUFBTTtRQUNwQyxjQUFjLEVBQUUsY0FBYyxDQUFDLE1BQU07S0FDckMsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLEdBQVc7SUFDckMsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN2RCxPQUFPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztBQUNqQyxDQUFDIn0=