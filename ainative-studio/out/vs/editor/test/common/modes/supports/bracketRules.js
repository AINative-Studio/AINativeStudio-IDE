/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const standardBracketRules = [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
];
export const rubyBracketRules = standardBracketRules;
export const cppBracketRules = standardBracketRules;
export const goBracketRules = standardBracketRules;
export const phpBracketRules = standardBracketRules;
export const vbBracketRules = standardBracketRules;
export const luaBracketRules = standardBracketRules;
export const htmlBracketRules = [
    ['<!--', '-->'],
    ['{', '}'],
    ['(', ')']
];
export const typescriptBracketRules = [
    ['${', '}'],
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
];
export const latexBracketRules = [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['[', ')'],
    ['(', ']'],
    ['\\left(', '\\right)'],
    ['\\left(', '\\right.'],
    ['\\left.', '\\right)'],
    ['\\left[', '\\right]'],
    ['\\left[', '\\right.'],
    ['\\left.', '\\right]'],
    ['\\left\\{', '\\right\\}'],
    ['\\left\\{', '\\right.'],
    ['\\left.', '\\right\\}'],
    ['\\left<', '\\right>'],
    ['\\bigl(', '\\bigr)'],
    ['\\bigl[', '\\bigr]'],
    ['\\bigl\\{', '\\bigr\\}'],
    ['\\Bigl(', '\\Bigr)'],
    ['\\Bigl[', '\\Bigr]'],
    ['\\Bigl\\{', '\\Bigr\\}'],
    ['\\biggl(', '\\biggr)'],
    ['\\biggl[', '\\biggr]'],
    ['\\biggl\\{', '\\biggr\\}'],
    ['\\Biggl(', '\\Biggr)'],
    ['\\Biggl[', '\\Biggr]'],
    ['\\Biggl\\{', '\\Biggr\\}'],
    ['\\langle', '\\rangle'],
    ['\\lvert', '\\rvert'],
    ['\\lVert', '\\rVert'],
    ['\\left|', '\\right|'],
    ['\\left\\vert', '\\right\\vert'],
    ['\\left\\|', '\\right\\|'],
    ['\\left\\Vert', '\\right\\Vert'],
    ['\\left\\langle', '\\right\\rangle'],
    ['\\left\\lvert', '\\right\\rvert'],
    ['\\left\\lVert', '\\right\\rVert'],
    ['\\bigl\\langle', '\\bigr\\rangle'],
    ['\\bigl|', '\\bigr|'],
    ['\\bigl\\vert', '\\bigr\\vert'],
    ['\\bigl\\lvert', '\\bigr\\rvert'],
    ['\\bigl\\|', '\\bigr\\|'],
    ['\\bigl\\lVert', '\\bigr\\rVert'],
    ['\\bigl\\Vert', '\\bigr\\Vert'],
    ['\\Bigl\\langle', '\\Bigr\\rangle'],
    ['\\Bigl|', '\\Bigr|'],
    ['\\Bigl\\lvert', '\\Bigr\\rvert'],
    ['\\Bigl\\vert', '\\Bigr\\vert'],
    ['\\Bigl\\|', '\\Bigr\\|'],
    ['\\Bigl\\lVert', '\\Bigr\\rVert'],
    ['\\Bigl\\Vert', '\\Bigr\\Vert'],
    ['\\biggl\\langle', '\\biggr\\rangle'],
    ['\\biggl|', '\\biggr|'],
    ['\\biggl\\lvert', '\\biggr\\rvert'],
    ['\\biggl\\vert', '\\biggr\\vert'],
    ['\\biggl\\|', '\\biggr\\|'],
    ['\\biggl\\lVert', '\\biggr\\rVert'],
    ['\\biggl\\Vert', '\\biggr\\Vert'],
    ['\\Biggl\\langle', '\\Biggr\\rangle'],
    ['\\Biggl|', '\\Biggr|'],
    ['\\Biggl\\lvert', '\\Biggr\\rvert'],
    ['\\Biggl\\vert', '\\Biggr\\vert'],
    ['\\Biggl\\|', '\\Biggr\\|'],
    ['\\Biggl\\lVert', '\\Biggr\\rVert'],
    ['\\Biggl\\Vert', '\\Biggr\\Vert']
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFJ1bGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvc3VwcG9ydHMvYnJhY2tldFJ1bGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sb0JBQW9CLEdBQW9CO0lBQzdDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztJQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztJQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztDQUNWLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQztBQUVyRCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLENBQUM7QUFFcEQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLG9CQUFvQixDQUFDO0FBRW5ELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQztBQUVwRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsb0JBQW9CLENBQUM7QUFFbkQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLG9CQUFvQixDQUFDO0FBRXBELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFvQjtJQUNoRCxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUM7SUFDZixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7SUFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Q0FDVixDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQW9CO0lBQ3RELENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztJQUNYLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztJQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztJQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztD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