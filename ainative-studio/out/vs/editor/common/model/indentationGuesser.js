/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class SpacesDiffResult {
    constructor() {
        this.spacesDiff = 0;
        this.looksLikeAlignment = false;
    }
}
/**
 * Compute the diff in spaces between two line's indentation.
 */
function spacesDiff(a, aLength, b, bLength, result) {
    result.spacesDiff = 0;
    result.looksLikeAlignment = false;
    // This can go both ways (e.g.):
    //  - a: "\t"
    //  - b: "\t    "
    //  => This should count 1 tab and 4 spaces
    let i;
    for (i = 0; i < aLength && i < bLength; i++) {
        const aCharCode = a.charCodeAt(i);
        const bCharCode = b.charCodeAt(i);
        if (aCharCode !== bCharCode) {
            break;
        }
    }
    let aSpacesCnt = 0, aTabsCount = 0;
    for (let j = i; j < aLength; j++) {
        const aCharCode = a.charCodeAt(j);
        if (aCharCode === 32 /* CharCode.Space */) {
            aSpacesCnt++;
        }
        else {
            aTabsCount++;
        }
    }
    let bSpacesCnt = 0, bTabsCount = 0;
    for (let j = i; j < bLength; j++) {
        const bCharCode = b.charCodeAt(j);
        if (bCharCode === 32 /* CharCode.Space */) {
            bSpacesCnt++;
        }
        else {
            bTabsCount++;
        }
    }
    if (aSpacesCnt > 0 && aTabsCount > 0) {
        return;
    }
    if (bSpacesCnt > 0 && bTabsCount > 0) {
        return;
    }
    const tabsDiff = Math.abs(aTabsCount - bTabsCount);
    const spacesDiff = Math.abs(aSpacesCnt - bSpacesCnt);
    if (tabsDiff === 0) {
        // check if the indentation difference might be caused by alignment reasons
        // sometime folks like to align their code, but this should not be used as a hint
        result.spacesDiff = spacesDiff;
        if (spacesDiff > 0 && 0 <= bSpacesCnt - 1 && bSpacesCnt - 1 < a.length && bSpacesCnt < b.length) {
            if (b.charCodeAt(bSpacesCnt) !== 32 /* CharCode.Space */ && a.charCodeAt(bSpacesCnt - 1) === 32 /* CharCode.Space */) {
                if (a.charCodeAt(a.length - 1) === 44 /* CharCode.Comma */) {
                    // This looks like an alignment desire: e.g.
                    // const a = b + c,
                    //       d = b - c;
                    result.looksLikeAlignment = true;
                }
            }
        }
        return;
    }
    if (spacesDiff % tabsDiff === 0) {
        result.spacesDiff = spacesDiff / tabsDiff;
        return;
    }
}
export function guessIndentation(source, defaultTabSize, defaultInsertSpaces) {
    // Look at most at the first 10k lines
    const linesCount = Math.min(source.getLineCount(), 10000);
    let linesIndentedWithTabsCount = 0; // number of lines that contain at least one tab in indentation
    let linesIndentedWithSpacesCount = 0; // number of lines that contain only spaces in indentation
    let previousLineText = ''; // content of latest line that contained non-whitespace chars
    let previousLineIndentation = 0; // index at which latest line contained the first non-whitespace char
    const ALLOWED_TAB_SIZE_GUESSES = [2, 4, 6, 8, 3, 5, 7]; // prefer even guesses for `tabSize`, limit to [2, 8].
    const MAX_ALLOWED_TAB_SIZE_GUESS = 8; // max(ALLOWED_TAB_SIZE_GUESSES) = 8
    const spacesDiffCount = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // `tabSize` scores
    const tmp = new SpacesDiffResult();
    for (let lineNumber = 1; lineNumber <= linesCount; lineNumber++) {
        const currentLineLength = source.getLineLength(lineNumber);
        const currentLineText = source.getLineContent(lineNumber);
        // if the text buffer is chunk based, so long lines are cons-string, v8 will flattern the string when we check charCode.
        // checking charCode on chunks directly is cheaper.
        const useCurrentLineText = (currentLineLength <= 65536);
        let currentLineHasContent = false; // does `currentLineText` contain non-whitespace chars
        let currentLineIndentation = 0; // index at which `currentLineText` contains the first non-whitespace char
        let currentLineSpacesCount = 0; // count of spaces found in `currentLineText` indentation
        let currentLineTabsCount = 0; // count of tabs found in `currentLineText` indentation
        for (let j = 0, lenJ = currentLineLength; j < lenJ; j++) {
            const charCode = (useCurrentLineText ? currentLineText.charCodeAt(j) : source.getLineCharCode(lineNumber, j));
            if (charCode === 9 /* CharCode.Tab */) {
                currentLineTabsCount++;
            }
            else if (charCode === 32 /* CharCode.Space */) {
                currentLineSpacesCount++;
            }
            else {
                // Hit non whitespace character on this line
                currentLineHasContent = true;
                currentLineIndentation = j;
                break;
            }
        }
        // Ignore empty or only whitespace lines
        if (!currentLineHasContent) {
            continue;
        }
        if (currentLineTabsCount > 0) {
            linesIndentedWithTabsCount++;
        }
        else if (currentLineSpacesCount > 1) {
            linesIndentedWithSpacesCount++;
        }
        spacesDiff(previousLineText, previousLineIndentation, currentLineText, currentLineIndentation, tmp);
        if (tmp.looksLikeAlignment) {
            // if defaultInsertSpaces === true && the spaces count == tabSize, we may want to count it as valid indentation
            //
            // - item1
            //   - item2
            //
            // otherwise skip this line entirely
            //
            // const a = 1,
            //       b = 2;
            if (!(defaultInsertSpaces && defaultTabSize === tmp.spacesDiff)) {
                continue;
            }
        }
        const currentSpacesDiff = tmp.spacesDiff;
        if (currentSpacesDiff <= MAX_ALLOWED_TAB_SIZE_GUESS) {
            spacesDiffCount[currentSpacesDiff]++;
        }
        previousLineText = currentLineText;
        previousLineIndentation = currentLineIndentation;
    }
    let insertSpaces = defaultInsertSpaces;
    if (linesIndentedWithTabsCount !== linesIndentedWithSpacesCount) {
        insertSpaces = (linesIndentedWithTabsCount < linesIndentedWithSpacesCount);
    }
    let tabSize = defaultTabSize;
    // Guess tabSize only if inserting spaces...
    if (insertSpaces) {
        let tabSizeScore = (insertSpaces ? 0 : 0.1 * linesCount);
        // console.log("score threshold: " + tabSizeScore);
        ALLOWED_TAB_SIZE_GUESSES.forEach((possibleTabSize) => {
            const possibleTabSizeScore = spacesDiffCount[possibleTabSize];
            if (possibleTabSizeScore > tabSizeScore) {
                tabSizeScore = possibleTabSizeScore;
                tabSize = possibleTabSize;
            }
        });
        // Let a tabSize of 2 win even if it is not the maximum
        // (only in case 4 was guessed)
        if (tabSize === 4 && spacesDiffCount[4] > 0 && spacesDiffCount[2] > 0 && spacesDiffCount[2] >= spacesDiffCount[4] / 2) {
            tabSize = 2;
        }
    }
    // console.log('--------------------------');
    // console.log('linesIndentedWithTabsCount: ' + linesIndentedWithTabsCount + ', linesIndentedWithSpacesCount: ' + linesIndentedWithSpacesCount);
    // console.log('spacesDiffCount: ' + spacesDiffCount);
    // console.log('tabSize: ' + tabSize + ', tabSizeScore: ' + tabSizeScore);
    return {
        insertSpaces: insertSpaces,
        tabSize: tabSize
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25HdWVzc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvaW5kZW50YXRpb25HdWVzc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sZ0JBQWdCO0lBQXRCO1FBQ1EsZUFBVSxHQUFXLENBQUMsQ0FBQztRQUN2Qix1QkFBa0IsR0FBWSxLQUFLLENBQUM7SUFDNUMsQ0FBQztDQUFBO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLFVBQVUsQ0FBQyxDQUFTLEVBQUUsT0FBZSxFQUFFLENBQVMsRUFBRSxPQUFlLEVBQUUsTUFBd0I7SUFFbkcsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7SUFDdEIsTUFBTSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztJQUVsQyxnQ0FBZ0M7SUFDaEMsYUFBYTtJQUNiLGlCQUFpQjtJQUNqQiwyQ0FBMkM7SUFFM0MsSUFBSSxDQUFTLENBQUM7SUFFZCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sSUFBSSxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDN0MsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWxDLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzdCLE1BQU07UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ25DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxP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