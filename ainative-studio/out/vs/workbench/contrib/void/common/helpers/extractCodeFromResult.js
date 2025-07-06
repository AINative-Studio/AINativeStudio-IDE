/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { DIVIDER, FINAL, ORIGINAL } from '../prompt/prompts.js';
export class SurroundingsRemover {
    // string is s[i...j]
    constructor(s) {
        // returns whether it removed the whole prefix
        this.removePrefix = (prefix) => {
            let offset = 0;
            // console.log('prefix', prefix, Math.min(this.j, prefix.length - 1))
            while (this.i <= this.j && offset <= prefix.length - 1) {
                if (this.originalS.charAt(this.i) !== prefix.charAt(offset))
                    break;
                offset += 1;
                this.i += 1;
            }
            return offset === prefix.length;
        };
        // // removes suffix from right to left
        this.removeSuffix = (suffix) => {
            // e.g. suffix = <PRE/>, the string is <PRE>hi<P
            const s = this.value();
            // for every possible prefix of `suffix`, check if string ends with it
            for (let len = Math.min(s.length, suffix.length); len >= 1; len -= 1) {
                if (s.endsWith(suffix.substring(0, len))) { // the end of the string equals a prefix
                    this.j -= len;
                    return len === suffix.length;
                }
            }
            return false;
        };
        // removeSuffix = (suffix: string): boolean => {
        // 	let offset = 0
        // 	while (this.j >= Math.max(this.i, 0)) {
        // 		if (this.originalS.charAt(this.j) !== suffix.charAt(suffix.length - 1 - offset))
        // 			break
        // 		offset += 1
        // 		this.j -= 1
        // 	}
        // 	return offset === suffix.length
        // }
        // either removes all or nothing
        this.removeFromStartUntilFullMatch = (until, alsoRemoveUntilStr) => {
            const index = this.originalS.indexOf(until, this.i);
            if (index === -1) {
                // this.i = this.j + 1
                return false;
            }
            // console.log('index', index, until.length)
            if (alsoRemoveUntilStr)
                this.i = index + until.length;
            else
                this.i = index;
            return true;
        };
        this.removeCodeBlock = () => {
            // Match either:
            // 1. ```language\n<code>\n```\n?
            // 2. ```<code>\n```\n?
            const pm = this;
            const foundCodeBlock = pm.removePrefix('```');
            if (!foundCodeBlock)
                return false;
            pm.removeFromStartUntilFullMatch('\n', true); // language
            const j = pm.j;
            let foundCodeBlockEnd = pm.removeSuffix('```');
            if (pm.j === j)
                foundCodeBlockEnd = pm.removeSuffix('```\n'); // if no change, try again with \n after ```
            if (!foundCodeBlockEnd)
                return false;
            pm.removeSuffix('\n'); // remove the newline before ```
            return true;
        };
        this.deltaInfo = (recentlyAddedTextLen) => {
            // aaaaaatextaaaaaa{recentlyAdded}
            //                  ^   i    j    len
            //                  |
            //            recentyAddedIdx
            const recentlyAddedIdx = this.originalS.length - recentlyAddedTextLen;
            const actualDelta = this.originalS.substring(Math.max(this.i, recentlyAddedIdx), this.j + 1);
            const ignoredSuffix = this.originalS.substring(Math.max(this.j + 1, recentlyAddedIdx), Infinity);
            return [actualDelta, ignoredSuffix];
        };
        this.originalS = s;
        this.i = 0;
        this.j = s.length - 1;
    }
    value() {
        return this.originalS.substring(this.i, this.j + 1);
    }
}
export const extractCodeFromRegular = ({ text, recentlyAddedTextLen }) => {
    const pm = new SurroundingsRemover(text);
    pm.removeCodeBlock();
    const s = pm.value();
    const [delta, ignoredSuffix] = pm.deltaInfo(recentlyAddedTextLen);
    return [s, delta, ignoredSuffix];
};
// Ollama has its own FIM, we should not use this if we use that
export const extractCodeFromFIM = ({ text, recentlyAddedTextLen, midTag, }) => {
    /* ------------- summary of the regex -------------
        [optional ` | `` | ```]
        (match optional_language_name)
        [optional strings here]
        [required <MID> tag]
        (match the stuff between mid tags)
        [optional <MID/> tag]
        [optional ` | `` | ```]
    */
    const pm = new SurroundingsRemover(text);
    pm.removeCodeBlock();
    const foundMid = pm.removePrefix(`<${midTag}>`);
    if (foundMid) {
        pm.removeSuffix(`\n`); // sometimes outputs \n
        pm.removeSuffix(`</${midTag}>`);
    }
    const s = pm.value();
    const [delta, ignoredSuffix] = pm.deltaInfo(recentlyAddedTextLen);
    return [s, delta, ignoredSuffix];
};
// JS substring swaps indices, so "ab".substr(1,0) will NOT be '', it will be 'a'!
const voidSubstr = (str, start, end) => end < start ? '' : str.substring(start, end);
export const endsWithAnyPrefixOf = (str, anyPrefix) => {
    // for each prefix
    for (let i = anyPrefix.length; i >= 1; i--) { // i >= 1 because must not be empty string
        const prefix = anyPrefix.slice(0, i);
        if (str.endsWith(prefix))
            return prefix;
    }
    return null;
};
// guarantees if you keep adding text, array length will strictly grow and state will progress without going back
export const extractSearchReplaceBlocks = (str) => {
    const ORIGINAL_ = ORIGINAL + `\n`;
    const DIVIDER_ = '\n' + DIVIDER + `\n`;
    // logic for FINAL_ is slightly more complicated - should be '\n' + FINAL, but that ignores if the final output is empty
    const blocks = [];
    let i = 0; // search i and beyond (this is done by plain index, not by line number. much simpler this way)
    while (true) {
        let origStart = str.indexOf(ORIGINAL_, i);
        if (origStart === -1) {
            return blocks;
        }
        origStart += ORIGINAL_.length;
        i = origStart;
        // wrote <<<< ORIGINAL\n
        let dividerStart = str.indexOf(DIVIDER_, i);
        if (dividerStart === -1) { // if didnt find DIVIDER_, either writing originalStr or DIVIDER_ right now
            const writingDIVIDERlen = endsWithAnyPrefixOf(str, DIVIDER_)?.length ?? 0;
            blocks.push({
                orig: voidSubstr(str, origStart, str.length - writingDIVIDERlen),
                final: '',
                state: 'writingOriginal'
            });
            return blocks;
        }
        const origStrDone = voidSubstr(str, origStart, dividerStart);
        dividerStart += DIVIDER_.length;
        i = dividerStart;
        // wrote \n=====\n
        const fullFINALStart = str.indexOf(FINAL, i);
        const fullFINALStart_ = str.indexOf('\n' + FINAL, i); // go with B if possible, else fallback to A, it's more permissive
        const matchedFullFINAL_ = fullFINALStart_ !== -1 && fullFINALStart === fullFINALStart_ + 1; // this logic is really important, otherwise we might look for FINAL_ at a much later part of the string
        let finalStart = matchedFullFINAL_ ? fullFINALStart_ : fullFINALStart;
        if (finalStart === -1) { // if didnt find FINAL_, either writing finalStr or FINAL or FINAL_ right now
            const writingFINALlen = endsWithAnyPrefixOf(str, FINAL)?.length ?? 0;
            const writingFINALlen_ = endsWithAnyPrefixOf(str, '\n' + FINAL)?.length ?? 0; // this gets priority
            const usingWritingFINALlen = Math.max(writingFINALlen, writingFINALlen_);
            blocks.push({
                orig: origStrDone,
                final: voidSubstr(str, dividerStart, str.length - usingWritingFINALlen),
                state: 'writingFinal'
            });
            return blocks;
        }
        const usingFINAL = matchedFullFINAL_ ? '\n' + FINAL : FINAL;
        const finalStrDone = voidSubstr(str, dividerStart, finalStart);
        finalStart += usingFINAL.length;
        i = finalStart;
        // wrote >>>>> FINAL
        blocks.push({
            orig: origStrDone,
            final: finalStrDone,
            state: 'done'
        });
    }
};
// const tests: [string, { shape: Partial<ExtractedSearchReplaceBlock>[] }][] = [[
// 	`\
// \`\`\`
// <<<<<<< ORIGINA`, { shape: [] }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL`, { shape: [], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A`, { shape: [{ state: 'writingOriginal', orig: 'A' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B`, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// `, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// ===`, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// ======`, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======`, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// `, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: '' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// >>>>>>> UPDAT`, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: '' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// >>>>>>> UPDATED`, { shape: [{ state: 'done', orig: 'A\nB', final: '' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// >>>>>>> UPDATED
// \`\`\``, { shape: [{ state: 'done', orig: 'A\nB', final: '' }], }
// ],
// // alternatively
// [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X`, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: 'X' }], }
// ],
// [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y`, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: 'X\nY' }], }
// ],
// [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y
// `, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: 'X\nY' }], }
// ],
// [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y
// >>>>>>> UPDAT`, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: 'X\nY' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y
// >>>>>>> UPDATED`, { shape: [{ state: 'done', orig: 'A\nB', final: 'X\nY' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y
// >>>>>>> UPDATED
// \`\`\``, { shape: [{ state: 'done', orig: 'A\nB', final: 'X\nY' }], }
// ]]
// function runTests() {
// 	let passedTests = 0;
// 	let failedTests = 0;
// 	for (let i = 0; i < tests.length; i++) {
// 		const [input, expected] = tests[i];
// 		const result = extractSearchReplaceBlocks(input);
// 		// Compare result with expected shape
// 		let passed = true;
// 		if (result.length !== expected.shape.length) {
// 			passed = false;
// 		} else {
// 			for (let j = 0; j < result.length; j++) { // block
// 				const expectedItem = expected.shape[j];
// 				const resultItem = result[j];
// 				if ((expectedItem.state !== undefined) && (expectedItem.state !== resultItem.state) ||
// 					(expectedItem.orig !== undefined) && (expectedItem.orig !== resultItem.orig) ||
// 					(expectedItem.final !== undefined) && (expectedItem.final !== resultItem.final)) {
// 					passed = false;
// 					break;
// 				}
// 			}
// 		}
// 		if (passed) {
// 			passedTests++;
// 			console.log(`Test ${i + 1} passed`);
// 		} else {
// 			failedTests++;
// 			console.log(`Test ${i + 1} failed`);
// 			console.log('Input:', input)
// 			console.log(`Expected:`, expected.shape);
// 			console.log(`Got:`, result);
// 		}
// 	}
// 	console.log(`Total: ${tests.length}, Passed: ${passedTests}, Failed: ${failedTests}`);
// 	return failedTests === 0;
// }
// runTests()
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdENvZGVGcm9tUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9oZWxwZXJzL2V4dHJhY3RDb2RlRnJvbVJlc3VsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMvRCxNQUFNLE9BQU8sbUJBQW1CO0lBSy9CLHFCQUFxQjtJQUVyQixZQUFZLENBQVM7UUFTckIsOENBQThDO1FBQzlDLGlCQUFZLEdBQUcsQ0FBQyxNQUFjLEVBQVcsRUFBRTtZQUMxQyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDZCxxRUFBcUU7WUFDckUsT0FBTyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO29CQUMxRCxNQUFLO2dCQUNOLE1BQU0sSUFBSSxDQUFDLENBQUE7Z0JBQ1gsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDWixDQUFDO1lBQ0QsT0FBTyxNQUFNLEtBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQTtRQUNoQyxDQUFDLENBQUE7UUFFRCx1Q0FBdUM7UUFDdkMsaUJBQVksR0FBRyxDQUFDLE1BQWMsRUFBVyxFQUFFO1lBQzFDLGdEQUFnRDtZQUNoRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7WUFD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