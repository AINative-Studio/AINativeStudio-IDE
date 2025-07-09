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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFJ1bGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9zdXBwb3J0cy9icmFja2V0UnVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxvQkFBb0IsR0FBb0I7SUFDN0MsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0lBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0lBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0NBQ1YsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDO0FBRXJELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQztBQUVwRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsb0JBQW9CLENBQUM7QUFFbkQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLG9CQUFvQixDQUFDO0FBRXBELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQztBQUVuRCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLENBQUM7QUFFcEQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQW9CO0lBQ2hELENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQztJQUNmLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztJQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztDQUNWLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBb0I7SUFDdEQsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO0lBQ1gsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0lBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0lBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0NBQ1Ys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