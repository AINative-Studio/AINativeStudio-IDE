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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdENvZGVGcm9tUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vaGVscGVycy9leHRyYWN0Q29kZUZyb21SZXN1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFFMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDL0QsTUFBTSxPQUFPLG1CQUFtQjtJQUsvQixxQkFBcUI7SUFFckIsWUFBWSxDQUFTO1FBU3JCLDhDQUE4QztRQUM5QyxpQkFBWSxHQUFHLENBQUMsTUFBYyxFQUFXLEVBQUU7WUFDMUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ2QscUVBQXFFO1lBQ3JFLE9BQU8sSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN4RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztvQkFDMUQsTUFBSztnQkFDTixNQUFNLElBQUksQ0FBQyxDQUFBO2dCQUNYLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ1osQ0FBQztZQUNELE9BQU8sTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUE7UUFDaEMsQ0FBQyxDQUFBO1FBRUQsdUNBQXVDO1FBQ3ZDLGlCQUFZLEdBQUcsQ0FBQyxNQUFjLEVBQVcsRUFBRTtZQUMxQyxnREFBZ0Q7WUFDaEQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3RCLHNFQUFzRTtZQUN0RSxLQUFLLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3RFLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyx3Q0FBd0M7b0JBQ25GLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFBO29CQUNiLE9BQU8sR0FBRyxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUE7Z0JBQzdCLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDLENBQUE7UUFDRCxnREFBZ0Q7UUFDaEQsa0JBQWtCO1FBRWxCLDJDQUEyQztRQUMzQyxxRkFBcUY7UUFDckYsV0FBVztRQUNYLGdCQUFnQjtRQUNoQixnQkFBZ0I7UUFDaEIsS0FBSztRQUNMLG1DQUFtQztRQUNuQyxJQUFJO1FBRUosZ0NBQWdDO1FBQ2hDLGtDQUE2QixHQUFHLENBQUMsS0FBYSxFQUFFLGtCQUEyQixFQUFFLEVBQUU7WUFDOUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVuRCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQixzQkFBc0I7Z0JBQ3RCLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELDRDQUE0QztZQUU1QyxJQUFJLGtCQUFrQjtnQkFDckIsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQTs7Z0JBRTdCLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFBO1lBRWYsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUE7UUFHRCxvQkFBZSxHQUFHLEdBQUcsRUFBRTtZQUN0QixnQkFBZ0I7WUFDaEIsaUNBQWlDO1lBQ2pDLHVCQUF1QjtZQUV2QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUE7WUFDZixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzdDLElBQUksQ0FBQyxjQUFjO2dCQUFFLE9BQU8sS0FBSyxDQUFBO1lBRWpDLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUEsQ0FBQyxXQUFXO1lBRXhELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDZCxJQUFJLGlCQUFpQixHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFOUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBQUUsaUJBQWlCLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQSxDQUFDLDRDQUE0QztZQUV6RyxJQUFJLENBQUMsaUJBQWlCO2dCQUFFLE9BQU8sS0FBSyxDQUFBO1lBRXBDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQyxnQ0FBZ0M7WUFDdEQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUE7UUFHRCxjQUFTLEdBQUcsQ0FBQyxvQkFBNEIsRUFBRSxFQUFFO1lBQzVDLGtDQUFrQztZQUNsQyxxQ0FBcUM7WUFDckMscUJBQXFCO1lBQ3JCLDZCQUE2QjtZQUM3QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLG9CQUFvQixDQUFBO1lBQ3JFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDNUYsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ2hHLE9BQU8sQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFVLENBQUE7UUFDN0MsQ0FBQyxDQUFBO1FBakdBLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBQ0QsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3BELENBQUM7Q0ErRkQ7QUFJRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFrRCxFQUE0QixFQUFFO0lBRWxKLE1BQU0sRUFBRSxHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFeEMsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBRXBCLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixNQUFNLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUVqRSxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQTtBQUNqQyxDQUFDLENBQUE7QUFNRCxnRUFBZ0U7QUFDaEUsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLEdBQW1FLEVBQTRCLEVBQUU7SUFFdks7Ozs7Ozs7O01BUUU7SUFFRixNQUFNLEVBQUUsR0FBRyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXhDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUVwQixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUUvQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2QsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLHVCQUF1QjtRQUM3QyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBRWpFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0FBQ2pDLENBQUMsQ0FBQTtBQVdELGtGQUFrRjtBQUNsRixNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFhLEVBQUUsR0FBVyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBRTVHLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsR0FBVyxFQUFFLFNBQWlCLEVBQUUsRUFBRTtJQUNyRSxrQkFBa0I7SUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLDBDQUEwQztRQUN2RixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQUUsT0FBTyxNQUFNLENBQUE7SUFDeEMsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyxDQUFBO0FBRUQsaUhBQWlIO0FBQ2pILE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLENBQUMsR0FBVyxFQUFFLEVBQUU7SUFFekQsTUFBTSxTQUFTLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQTtJQUNqQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQTtJQUN0Qyx3SEFBd0g7SUFFeEgsTUFBTSxNQUFNLEdBQWtDLEVBQUUsQ0FBQTtJQUVoRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQywrRkFBK0Y7SUFDekcsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUNiLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLElBQUksU0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFBQyxPQUFPLE1BQU0sQ0FBQTtRQUFDLENBQUM7UUFDdkMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUE7UUFDN0IsQ0FBQyxHQUFHLFNBQVMsQ0FBQTtRQUNiLHdCQUF3QjtRQUV4QixJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQyxJQUFJLFlBQVksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsMkVBQTJFO1lBQ3JHLE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUE7WUFDekUsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDWCxJQUFJLEVBQUUsVUFBVSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQztnQkFDaEUsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLGlCQUFpQjthQUN4QixDQUFDLENBQUE7WUFDRixPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUM1RCxZQUFZLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUMvQixDQUFDLEdBQUcsWUFBWSxDQUFBO1FBQ2hCLGtCQUFrQjtRQUVsQixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxrRUFBa0U7UUFDdkgsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLEtBQUssQ0FBQyxDQUFDLElBQUksY0FBYyxLQUFLLGVBQWUsR0FBRyxDQUFDLENBQUEsQ0FBRSx3R0FBd0c7UUFFcE0sSUFBSSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFBO1FBQ3JFLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyw2RUFBNkU7WUFDckcsTUFBTSxlQUFlLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUE7WUFDcEUsTUFBTSxnQkFBZ0IsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUEsQ0FBQyxxQkFBcUI7WUFDbEcsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3hFLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ1gsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLEtBQUssRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLG9CQUFvQixDQUFDO2dCQUN2RSxLQUFLLEVBQUUsY0FBYzthQUNyQixDQUFDLENBQUE7WUFDRixPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBQzNELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzlELFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFBO1FBQy9CLENBQUMsR0FBRyxVQUFVLENBQUE7UUFDZCxvQkFBb0I7UUFFcEIsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNYLElBQUksRUFBRSxXQUFXO1lBQ2pCLEtBQUssRUFBRSxZQUFZO1lBQ25CLEtBQUssRUFBRSxNQUFNO1NBQ2IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztBQUNGLENBQUMsQ0FBQTtBQWdCRCxrRkFBa0Y7QUFDbEYsTUFBTTtBQUNOLFNBQVM7QUFDVCxrQ0FBa0M7QUFDbEMsT0FBTztBQUNQLE1BQU07QUFDTixTQUFTO0FBQ1Qsb0NBQW9DO0FBQ3BDLE9BQU87QUFDUCxNQUFNO0FBQ04sU0FBUztBQUNULG1CQUFtQjtBQUNuQiw0REFBNEQ7QUFDNUQsT0FBTztBQUNQLE1BQU07QUFDTixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLElBQUk7QUFDSiwrREFBK0Q7QUFDL0QsT0FBTztBQUNQLE1BQU07QUFDTixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLElBQUk7QUFDSixJQUFJO0FBQ0osOERBQThEO0FBQzlELE9BQU87QUFDUCxNQUFNO0FBQ04sU0FBUztBQUNULG1CQUFtQjtBQUNuQixJQUFJO0FBQ0osSUFBSTtBQUNKLGlFQUFpRTtBQUNqRSxPQUFPO0FBQ1AsTUFBTTtBQUNOLFNBQVM7QUFDVCxtQkFBbUI7QUFDbkIsSUFBSTtBQUNKLElBQUk7QUFDSixvRUFBb0U7QUFDcEUsT0FBTztBQUNQLE1BQU07QUFDTixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLElBQUk7QUFDSixJQUFJO0FBQ0oscUVBQXFFO0FBQ3JFLE9BQU87QUFDUCxNQUFNO0FBQ04sU0FBUztBQUNULG1CQUFtQjtBQUNuQixJQUFJO0FBQ0osSUFBSTtBQUNKLFVBQVU7QUFDVixzRUFBc0U7QUFDdEUsT0FBTztBQUNQLE1BQU07QUFDTixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLElBQUk7QUFDSixJQUFJO0FBQ0osVUFBVTtBQUNWLG1GQUFtRjtBQUNuRixPQUFPO0FBQ1AsTUFBTTtBQUNOLFNBQVM7QUFDVCxtQkFBbUI7QUFDbkIsSUFBSTtBQUNKLElBQUk7QUFDSixVQUFVO0FBQ1YsNkVBQTZFO0FBQzdFLE9BQU87QUFDUCxNQUFNO0FBQ04sU0FBUztBQUNULG1CQUFtQjtBQUNuQixJQUFJO0FBQ0osSUFBSTtBQUNKLFVBQVU7QUFDVixrQkFBa0I7QUFDbEIsb0VBQW9FO0FBQ3BFLEtBQUs7QUFHTCxtQkFBbUI7QUFDbkIsSUFBSTtBQUNKLE1BQU07QUFDTixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLElBQUk7QUFDSixJQUFJO0FBQ0osVUFBVTtBQUNWLHdFQUF3RTtBQUN4RSxLQUFLO0FBQ0wsSUFBSTtBQUNKLE1BQU07QUFDTixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLElBQUk7QUFDSixJQUFJO0FBQ0osVUFBVTtBQUNWLElBQUk7QUFDSiwyRUFBMkU7QUFDM0UsS0FBSztBQUNMLElBQUk7QUFDSixNQUFNO0FBQ04sU0FBUztBQUNULG1CQUFtQjtBQUNuQixJQUFJO0FBQ0osSUFBSTtBQUNKLFVBQVU7QUFDVixJQUFJO0FBQ0osSUFBSTtBQUNKLDBFQUEwRTtBQUMxRSxLQUFLO0FBQ0wsSUFBSTtBQUNKLE1BQU07QUFDTixTQUFTO0FBQ1QsbUJBQW1CO0FBQ25CLElBQUk7QUFDSixJQUFJO0FBQ0osVUFBVTtBQUNWLElBQUk7QUFDSixJQUFJO0FBQ0osdUZBQXVGO0FBQ3ZGLE9BQU87QUFDUCxNQUFNO0FBQ04sU0FBUztBQUNULG1CQUFtQjtBQUNuQixJQUFJO0FBQ0osSUFBSTtBQUNKLFVBQVU7QUFDVixJQUFJO0FBQ0osSUFBSTtBQUNKLGlGQUFpRjtBQUNqRixPQUFPO0FBQ1AsTUFBTTtBQUNOLFNBQVM7QUFDVCxtQkFBbUI7QUFDbkIsSUFBSTtBQUNKLElBQUk7QUFDSixVQUFVO0FBQ1YsSUFBSTtBQUNKLElBQUk7QUFDSixrQkFBa0I7QUFDbEIsd0VBQXdFO0FBQ3hFLEtBQUs7QUFLTCx3QkFBd0I7QUFHeEIsd0JBQXdCO0FBQ3hCLHdCQUF3QjtBQUV4Qiw0Q0FBNEM7QUFDNUMsd0NBQXdDO0FBQ3hDLHNEQUFzRDtBQUV0RCwwQ0FBMEM7QUFDMUMsdUJBQXVCO0FBQ3ZCLG1EQUFtRDtBQUNuRCxxQkFBcUI7QUFDckIsYUFBYTtBQUNiLHdEQUF3RDtBQUN4RCw4Q0FBOEM7QUFDOUMsb0NBQW9DO0FBRXBDLDZGQUE2RjtBQUM3Rix1RkFBdUY7QUFDdkYsMEZBQTBGO0FBQzFGLHVCQUF1QjtBQUN2QixjQUFjO0FBQ2QsUUFBUTtBQUNSLE9BQU87QUFDUCxNQUFNO0FBRU4sa0JBQWtCO0FBQ2xCLG9CQUFvQjtBQUNwQiwwQ0FBMEM7QUFDMUMsYUFBYTtBQUNiLG9CQUFvQjtBQUNwQiwwQ0FBMEM7QUFDMUMsa0NBQWtDO0FBQ2xDLCtDQUErQztBQUMvQyxrQ0FBa0M7QUFDbEMsTUFBTTtBQUNOLEtBQUs7QUFFTCwwRkFBMEY7QUFDMUYsNkJBQTZCO0FBQzdCLElBQUk7QUFJSixhQUFhIn0=