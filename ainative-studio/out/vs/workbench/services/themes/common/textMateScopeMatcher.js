/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
export function createMatchers(selector, matchesName, results) {
    const tokenizer = newTokenizer(selector);
    let token = tokenizer.next();
    while (token !== null) {
        let priority = 0;
        if (token.length === 2 && token.charAt(1) === ':') {
            switch (token.charAt(0)) {
                case 'R':
                    priority = 1;
                    break;
                case 'L':
                    priority = -1;
                    break;
                default:
                    console.log(`Unknown priority ${token} in scope selector`);
            }
            token = tokenizer.next();
        }
        const matcher = parseConjunction();
        if (matcher) {
            results.push({ matcher, priority });
        }
        if (token !== ',') {
            break;
        }
        token = tokenizer.next();
    }
    function parseOperand() {
        if (token === '-') {
            token = tokenizer.next();
            const expressionToNegate = parseOperand();
            if (!expressionToNegate) {
                return null;
            }
            return matcherInput => {
                const score = expressionToNegate(matcherInput);
                return score < 0 ? 0 : -1;
            };
        }
        if (token === '(') {
            token = tokenizer.next();
            const expressionInParents = parseInnerExpression();
            if (token === ')') {
                token = tokenizer.next();
            }
            return expressionInParents;
        }
        if (isIdentifier(token)) {
            const identifiers = [];
            do {
                identifiers.push(token);
                token = tokenizer.next();
            } while (isIdentifier(token));
            return matcherInput => matchesName(identifiers, matcherInput);
        }
        return null;
    }
    function parseConjunction() {
        let matcher = parseOperand();
        if (!matcher) {
            return null;
        }
        const matchers = [];
        while (matcher) {
            matchers.push(matcher);
            matcher = parseOperand();
        }
        return matcherInput => {
            let min = matchers[0](matcherInput);
            for (let i = 1; min >= 0 && i < matchers.length; i++) {
                min = Math.min(min, matchers[i](matcherInput));
            }
            return min;
        };
    }
    function parseInnerExpression() {
        let matcher = parseConjunction();
        if (!matcher) {
            return null;
        }
        const matchers = [];
        while (matcher) {
            matchers.push(matcher);
            if (token === '|' || token === ',') {
                do {
                    token = tokenizer.next();
                } while (token === '|' || token === ','); // ignore subsequent commas
            }
            else {
                break;
            }
            matcher = parseConjunction();
        }
        return matcherInput => {
            let max = matchers[0](matcherInput);
            for (let i = 1; i < matchers.length; i++) {
                max = Math.max(max, matchers[i](matcherInput));
            }
            return max;
        };
    }
}
function isIdentifier(token) {
    return !!token && !!token.match(/[\w\.:]+/);
}
function newTokenizer(input) {
    const regex = /([LR]:|[\w\.:][\w\.:\-]*|[\,\|\-\(\)])/g;
    let match = regex.exec(input);
    return {
        next: () => {
            if (!match) {
                return null;
            }
            const res = match[0];
            match = regex.exec(input);
            return res;
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVTY29wZU1hdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vdGV4dE1hdGVTY29wZU1hdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsWUFBWSxDQUFDO0FBV2IsTUFBTSxVQUFVLGNBQWMsQ0FBSSxRQUFnQixFQUFFLFdBQXlELEVBQUUsT0FBaUM7SUFDL0ksTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3pDLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM3QixPQUFPLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUN2QixJQUFJLFFBQVEsR0FBZSxDQUFDLENBQUM7UUFDN0IsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ25ELFFBQVEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN6QixLQUFLLEdBQUc7b0JBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQztvQkFBQyxNQUFNO2dCQUM5QixLQUFLLEdBQUc7b0JBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUFDLE1BQU07Z0JBQy9CO29CQUNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEtBQUssb0JBQW9CLENBQUMsQ0FBQztZQUM3RCxDQUFDO1lBQ0QsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuQyxJQUFJLE9BQU8sRUFB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