/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZERpZmZzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2hlbHBlcnMvZmluZERpZmZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRzFGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUV0RCxNQUFNLFVBQVUsU0FBUyxDQUFDLE1BQWMsRUFBRSxNQUFjO0lBRXZELDZNQUE2TTtJQUM3TSxNQUFNLElBQUksSUFBSSxDQUFDO0lBQ2YsTUFBTSxJQUFJLElBQUksQ0FBQztJQUVmLGdKQUFnSjtJQUNoSixNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEQsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBLENBQUMsb0dBQW9HO0lBRXhLLElBQUksY0FBYyxHQUFXLENBQUMsQ0FBQztJQUMvQixJQUFJLGNBQWMsR0FBVyxDQUFDLENBQUM7SUFFL0IsSUFBSSxvQkFBb0IsR0FBdUIsU0FBUyxDQUFBO0lBQ3hELElBQUksb0JBQW9CLEdBQXVCLFNBQVMsQ0FBQTtJQUV4RCxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQyxzQ0FBc0M7SUFDdEYsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRS9DLE1BQU0sWUFBWSxHQUFtQixFQUFFLENBQUE7SUFDdkMsS0FBSyxNQUFNLElBQUks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