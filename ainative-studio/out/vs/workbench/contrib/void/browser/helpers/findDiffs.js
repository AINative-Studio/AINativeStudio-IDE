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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZERpZmZzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvaGVscGVycy9maW5kRGlmZnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFHMUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRXRELE1BQU0sVUFBVSxTQUFTLENBQUMsTUFBYyxFQUFFLE1BQWM7SUFFdkQsNk1BQTZNO0lBQzdNLE1BQU0sSUFBSSxJQUFJLENBQUM7SUFDZixNQUFNLElBQUksSUFBSSxDQUFDO0lBRWYsZ0pBQWdKO0lBQ2hKLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwRCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUEsQ0FBQyxvR0FBb0c7SUFFeEssSUFBSSxjQUFjLEdBQVcsQ0FBQyxDQUFDO0lBQy9CLElBQUksY0FBYyxHQUFXLENBQUMsQ0FBQztJQUUvQixJQUFJLG9CQUFvQixHQUF1QixTQUFTLENBQUE7SUFDeEQsSUFBSSxvQkFBb0IsR0FBdUIsU0FBUyxDQUFBO0lBRXhELE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLHNDQUFzQztJQUN0RixNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFL0MsTUFBTSxZQUFZLEdBQW1CLEVBQUUsQ0FBQTtJQUN2QyxLQUFLLE1BQU0s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