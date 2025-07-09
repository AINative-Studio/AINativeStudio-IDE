/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { diffLines } from '../react/out/diff/index.js';
export function findDiffs(oldStr, newStr) {
    // this makes it so the end of the file always ends with a \n (if you don't have this, then diffing E vs E\n gives an "edit". With it, you end up diffing E\n vs E\n\n which now properly gives an insertion)
    newStr += '\n';
    oldStr += '\n';
    // an ordered list of every original line, line added to the new file, and line removed from the old file (order is unambiguous, think about it)
    const lineByLineChanges = diffLines(oldStr, newStr);
    lineByLineChanges.push({ value: '', added: false, removed: false }); // add a dummy so we flush any streaks we haven't yet at the very end (!line.added && !line.removed)
    let oldFileLineNum = 1;
    let newFileLineNum = 1;
    let streakStartInNewFile = undefined;
    let streakStartInOldFile = undefined;
    const oldStrLines = ('\n' + oldStr).split('\n'); // add newline so indexing starts at 1
    const newStrLines = ('\n' + newStr).split('\n');
    const replacements = [];
    for (const line of lineByLineChanges) {
        // no change on this line
        if (!line.added && !line.removed) {
            // do nothing
            // if we were on a streak of +s and -s, end it
            if (streakStartInNewFile !== undefined) {
                let type = 'edit';
                const startLine = streakStartInNewFile;
                const endLine = newFileLineNum - 1; // don't include current line, the edit was up to this line but not including it
                const originalStartLine = streakStartInOldFile;
                const originalEndLine = oldFileLineNum - 1; // don't include current line, the edit was up to this line but not including it
                const newContent = newStrLines.slice(startLine, endLine + 1).join('\n');
                const originalContent = oldStrLines.slice(originalStartLine, originalEndLine + 1).join('\n');
                // if the range is empty, mark it as a deletion / insertion (both won't be true at once)
                // DELETION
                if (endLine === startLine - 1) {
                    type = 'deletion';
                    // endLine = startLine
                }
                // INSERTION
                else if (originalEndLine === originalStartLine - 1) {
                    type = 'insertion';
                    // originalEndLine = originalStartLine
                }
                const replacement = {
                    type,
                    startLine, endLine,
                    // startCol, endCol,
                    originalStartLine, originalEndLine,
                    // code: newContent,
                    // originalRange: new Range(originalStartLine, originalStartCol, originalEndLine, originalEndCol),
                    originalCode: originalContent,
                    code: newContent,
                };
                replacements.push(replacement);
                streakStartInNewFile = undefined;
                streakStartInOldFile = undefined;
            }
            oldFileLineNum += line.count ?? 0;
            newFileLineNum += line.count ?? 0;
        }
        // line was removed from old file
        else if (line.removed) {
            // if we weren't on a streak, start one on this current line num
            if (streakStartInNewFile === undefined) {
                streakStartInNewFile = newFileLineNum;
                streakStartInOldFile = oldFileLineNum;
            }
            oldFileLineNum += line.count ?? 0; // we processed the line so add 1 (or "count")
        }
        // line was added to new file
        else if (line.added) {
            // if we weren't on a streak, start one on this current line num
            if (streakStartInNewFile === undefined) {
                streakStartInNewFile = newFileLineNum;
                streakStartInOldFile = oldFileLineNum;
            }
            newFileLineNum += line.count ?? 0; // we processed the line so add 1 (or "count")
        }
    } // end for
    // console.log('DIFF', { oldStr, newStr, replacements })
    return replacements;
}
// // uncomment this to test
// let name_ = ''
// let testsFailed = 0
// const assertEqual = (a: { [s: string]: any }, b: { [s: string]: any }) => {
// 	let keys = new Set([...Object.keys(a), ...Object.keys(b)])
// 	for (let k of keys) {
// 		if (a[k] !== b[k]) {
// 			console.error('Void Test Error:', name_, '\n', `${k}=`, `${JSON.stringify(a[k])}, ${JSON.stringify(b[k])}`)
// 			// console.error(JSON.stringify(a, null, 4))
// 			// console.error(JSON.stringify(b, null, 4))
// 			testsFailed += 1
// 		}
// 	}
// }
// const test = (name: string, fn: () => void) => {
// 	name_ = name
// 	fn()
// }
// const originalCode = `\
// A
// B
// C
// D
// E`
// const insertedCode = `\
// A
// B
// C
// F
// D
// E`
// const modifiedCode = `\
// A
// B
// C
// F
// E`
// const modifiedCode2 = `\
// A
// B
// C
// D
// E
// `
// test('Diffs Insertion', () => {
// 	const diffs = findDiffs(originalCode, insertedCode)
// 	const expected: BaseDiff = {
// 		type: 'insertion',
// 		originalCode: '',
// 		originalStartLine: 4, // empty range where the insertion happened
// 		originalEndLine: 4,
// 		startLine: 4,
// 		startCol: 1,
// 		endLine: 4,
// 		endCol: Number.MAX_SAFE_INTEGER,
// 	}
// 	assertEqual(diffs[0], expected)
// })
// test('Diffs Deletion', () => {
// 	const diffs = findDiffs(insertedCode, originalCode)
// 	assertEqual({ length: diffs.length }, { length: 1 })
// 	const expected: BaseDiff = {
// 		type: 'deletion',
// 		originalCode: 'F',
// 		originalStartLine: 4,
// 		originalEndLine: 4,
// 		startLine: 4,
// 		startCol: 1, // empty range where the deletion happened
// 		endLine: 4,
// 		endCol: 1,
// 	}
// 	assertEqual(diffs[0], expected)
// })
// test('Diffs Modification', () => {
// 	const diffs = findDiffs(originalCode, modifiedCode)
// 	assertEqual({ length: diffs.length }, { length: 1 })
// 	const expected: BaseDiff = {
// 		type: 'edit',
// 		originalCode: 'D',
// 		originalStartLine: 4,
// 		originalEndLine: 4,
// 		startLine: 4,
// 		startCol: 1,
// 		endLine: 4,
// 		endCol: Number.MAX_SAFE_INTEGER,
// 	}
// 	assertEqual(diffs[0], expected)
// })
// test('Diffs Modification 2', () => {
// 	const diffs = findDiffs(originalCode, modifiedCode2)
// 	assertEqual({ length: diffs.length }, { length: 1 })
// 	const expected: BaseDiff = {
// 		type: 'insertion',
// 		originalCode: '',
// 		originalStartLine: 6,
// 		originalEndLine: 6,
// 		startLine: 6,
// 		startCol: 1,
// 		endLine: 6,
// 		endCol: Number.MAX_SAFE_INTEGER,
// 	}
// 	assertEqual(diffs[0], expected)
// })
// if (testsFailed === 0) {
// 	console.log('✅ Void - All tests passed')
// }
// else {
// 	console.log('❌ Void - At least one test failed')
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZERpZmZzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9oZWxwZXJzL2ZpbmREaWZmcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUcxRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFdEQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxNQUFjLEVBQUUsTUFBYztJQUV2RCw2TUFBNk07SUFDN00sTUFBTSxJQUFJLElBQUksQ0FBQztJQUNmLE1BQU0sSUFBSSxJQUFJLENBQUM7SUFFZixnSkFBZ0o7SUFDaEosTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3BELGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQSxDQUFDLG9HQUFvRztJQUV4SyxJQUFJLGNBQWMsR0FBVyxDQUFDLENBQUM7SUFDL0IsSUFBSSxjQUFjLEdBQVcsQ0FBQyxDQUFDO0lBRS9CLElBQUksb0JBQW9CLEdBQXVCLFNBQVMsQ0FBQTtJQUN4RCxJQUFJLG9CQUFvQixHQUF1QixTQUFTLENBQUE7SUFFeEQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUMsc0NBQXNDO0lBQ3RGLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUUvQyxNQUFNLFlBQVksR0FBbUIsRUFBRSxDQUFBO0lBQ3ZDLEtBQUssTUFBTSxJQUFJ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