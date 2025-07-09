/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdENvZGVGcm9tUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL2hlbHBlcnMvZXh0cmFjdENvZGVGcm9tUmVzdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRTFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQy9ELE1BQU0sT0FBTyxtQkFBbUI7SUFLL0IscUJBQXFCO0lBRXJCLFlBQVksQ0FBUztRQVNyQiw4Q0FBOEM7UUFDOUMsaUJBQVksR0FBRyxDQUFDLE1BQWMsRUFBVyxFQUFFO1lBQzFDLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUNkLHFFQUFxRTtZQUNyRSxPQUFPLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEQsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7b0JBQzFELE1BQUs7Z0JBQ04sTUFBTSxJQUFJLENBQUMsQ0FBQTtnQkFDWCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNaLENBQUM7WUFDRCxPQUFPLE1BQU0sS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBQ2hDLENBQUMsQ0FBQTtRQUVELHVDQUF1QztRQUN2QyxpQkFBWSxHQUFHLENBQUMsTUFBYyxFQUFXLEVBQUU7WUFDMUMsZ0RBQWdEO1lBQ2hELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUN0Qixz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