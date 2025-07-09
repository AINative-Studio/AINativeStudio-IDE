/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*
 * This module exports common types and functionality shared between
 * the Monarch compiler that compiles JSON to ILexer, and the Monarch
 * Tokenizer (that highlights at runtime)
 */
/*
 * Type definitions to be used internally to Monarch.
 * Inside monarch we use fully typed definitions and compiled versions of the more abstract JSON descriptions.
 */
export var MonarchBracket;
(function (MonarchBracket) {
    MonarchBracket[MonarchBracket["None"] = 0] = "None";
    MonarchBracket[MonarchBracket["Open"] = 1] = "Open";
    MonarchBracket[MonarchBracket["Close"] = -1] = "Close";
})(MonarchBracket || (MonarchBracket = {}));
export function isFuzzyActionArr(what) {
    return (Array.isArray(what));
}
export function isFuzzyAction(what) {
    return !isFuzzyActionArr(what);
}
export function isString(what) {
    return (typeof what === 'string');
}
export function isIAction(what) {
    return !isString(what);
}
// Small helper functions
/**
 * Is a string null, undefined, or empty?
 */
export function empty(s) {
    return (s ? false : true);
}
/**
 * Puts a string to lower case if 'ignoreCase' is set.
 */
export function fixCase(lexer, str) {
    return (lexer.ignoreCase && str ? str.toLowerCase() : str);
}
/**
 * Ensures there are no bad characters in a CSS token class.
 */
export function sanitize(s) {
    return s.replace(/[&<>'"_]/g, '-'); // used on all output token CSS classes
}
// Logging
/**
 * Logs a message.
 */
export function log(lexer, msg) {
    console.log(`${lexer.languageId}: ${msg}`);
}
// Throwing errors
export function createError(lexer, msg) {
    return new Error(`${lexer.languageId}: ${msg}`);
}
// Helper functions for rule finding and substitution
/**
 * substituteMatches is used on lexer strings and can substitutes predefined patterns:
 * 		$$  => $
 * 		$#  => id
 * 		$n  => matched entry n
 * 		@attr => contents of lexer[attr]
 *
 * See documentation for more info
 */
export function substituteMatches(lexer, str, id, matches, state) {
    const re = /\$((\$)|(#)|(\d\d?)|[sS](\d\d?)|@(\w+))/g;
    let stateMatches = null;
    return str.replace(re, function (full, sub, dollar, hash, n, s, attr, ofs, total) {
        if (!empty(dollar)) {
            return '$'; // $$
        }
        if (!empty(hash)) {
            return fixCase(lexer, id); // default $#
        }
        if (!empty(n) && n < matches.length) {
            return fixCase(lexer, matches[n]); // $n
        }
        if (!empty(attr) && lexer && typeof (lexer[attr]) === 'string') {
            return lexer[attr]; //@attribute
        }
        if (stateMatches === null) { // split state on demand
            stateMatches = state.split('.');
            stateMatches.unshift(state);
        }
        if (!empty(s) && s < stateMatches.length) {
            return fixCase(lexer, stateMatches[s]); //$Sn
        }
        return '';
    });
}
/**
 * substituteMatchesRe is used on lexer regex rules and can substitutes predefined patterns:
 * 		$Sn => n'th part of state
 *
 */
export function substituteMatchesRe(lexer, str, state) {
    const re = /\$[sS](\d\d?)/g;
    let stateMatches = null;
    return str.replace(re, function (full, s) {
        if (stateMatches === null) { // split state on demand
            stateMatches = state.split('.');
            stateMatches.unshift(state);
        }
        if (!empty(s) && s < stateMatches.length) {
            return fixCase(lexer, stateMatches[s]); //$Sn
        }
        return '';
    });
}
/**
 * Find the tokenizer rules for a specific state (i.e. next action)
 */
export function findRules(lexer, inState) {
    let state = inState;
    while (state && state.length > 0) {
        const rules = lexer.tokenizer[state];
        if (rules) {
            return rules;
        }
        const idx = state.lastIndexOf('.');
        if (idx < 0) {
            state = null; // no further parent
        }
        else {
            state = state.substr(0, idx);
        }
    }
    return null;
}
/**
 * Is a certain state defined? In contrast to 'findRules' this works on a ILexerMin.
 * This is used during compilation where we may know the defined states
 * but not yet whether the corresponding rules are correct.
 */
export function stateExists(lexer, inState) {
    let state = inState;
    while (state && state.length > 0) {
        const exist = lexer.stateNames[state];
        if (exist) {
            return true;
        }
        const idx = state.lastIndexOf('.');
        if (idx < 0) {
            state = null; // no further parent
        }
        else {
            state = state.substr(0, idx);
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaENvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9jb21tb24vbW9uYXJjaC9tb25hcmNoQ29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7O0dBSUc7QUFFSDs7O0dBR0c7QUFFSCxNQUFNLENBQU4sSUFBa0IsY0FJakI7QUFKRCxXQUFrQixjQUFjO0lBQy9CLG1EQUFRLENBQUE7SUFDUixtREFBUSxDQUFBO0lBQ1Isc0RBQVUsQ0FBQTtBQUNYLENBQUMsRUFKaUIsY0FBYyxLQUFkLGNBQWMsUUFJL0I7QUFpQ0QsTUFBTSxVQUFVLGdCQUFnQixDQUFDLElBQWlDO0lBQ2pFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsSUFBaUM7SUFDOUQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hDLENBQUM7QUFFRCxNQUFNLFVBQVUsUUFBUSxDQUFDLElBQWlCO0lBQ3pDLE9BQU8sQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBRUQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxJQUFpQjtJQUMxQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFrQ0QseUJBQXlCO0FBRXpCOztHQUVHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBQyxDQUFTO0lBQzlCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLE9B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