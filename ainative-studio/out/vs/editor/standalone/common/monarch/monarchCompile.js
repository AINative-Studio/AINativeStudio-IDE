/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*
 * This module only exports 'compile' which compiles a JSON language definition
 * into a typed and checked ILexer definition.
 */
import * as monarchCommon from './monarchCommon.js';
/*
 * Type helpers
 *
 * Note: this is just for sanity checks on the JSON description which is
 * helpful for the programmer. No checks are done anymore once the lexer is
 * already 'compiled and checked'.
 *
 */
function isArrayOf(elemType, obj) {
    if (!obj) {
        return false;
    }
    if (!(Array.isArray(obj))) {
        return false;
    }
    for (const el of obj) {
        if (!(elemType(el))) {
            return false;
        }
    }
    return true;
}
function bool(prop, defValue) {
    if (typeof prop === 'boolean') {
        return prop;
    }
    return defValue;
}
function string(prop, defValue) {
    if (typeof (prop) === 'string') {
        return prop;
    }
    return defValue;
}
function arrayToHash(array) {
    const result = {};
    for (const e of array) {
        result[e] = true;
    }
    return result;
}
function createKeywordMatcher(arr, caseInsensitive = false) {
    if (caseInsensitive) {
        arr = arr.map(function (x) { return x.toLowerCase(); });
    }
    const hash = arrayToHash(arr);
    if (caseInsensitive) {
        return function (word) {
            return hash[word.toLowerCase()] !== undefined && hash.hasOwnProperty(word.toLowerCase());
        };
    }
    else {
        return function (word) {
            return hash[word] !== undefined && hash.hasOwnProperty(word);
        };
    }
}
function compileRegExp(lexer, str, handleSn) {
    // @@ must be interpreted as a literal @, so we replace all occurences of @@ with a placeholder character
    str = str.replace(/@@/g, `\x01`);
    let n = 0;
    let hadExpansion;
    do {
        hadExpansion = false;
        str = str.replace(/@(\w+)/g, function (s, attr) {
            hadExpansion = true;
            let sub = '';
            if (typeof (lexer[attr]) === 'string') {
                sub = lexer[attr];
            }
            else if (lexer[attr] && lexer[attr] instanceof RegExp) {
                sub = lexer[attr].source;
            }
            else {
                if (lexer[attr] === undefined) {
                    throw monarchCommon.createError(lexer, 'language definition does not contain attribute \'' + attr + '\', used at: ' + str);
                }
                else {
                    throw monarchCommon.createError(lexer, 'attribute reference \'' + attr + '\' must be a string, used at: ' + str);
                }
            }
            return (monarchCommon.empty(sub) ? '' : '(?:' + sub + ')');
        });
        n++;
    } while (hadExpansion && n < 5);
    // handle escaped @@
    str = str.replace(/\x01/g, '@');
    const flags = (lexer.ignoreCase ? 'i' : '') + (lexer.unicode ? 'u' : '');
    // handle $Sn
    if (handleSn) {
        const match = str.match(/\$[sS](\d\d?)/g);
        if (match) {
            let lastState = null;
            let lastRegEx = null;
            return (state) => {
                if (lastRegEx && lastState === state) {
                    return lastRegEx;
                }
                lastState = state;
                lastRegEx = new RegExp(monarchCommon.substituteMatchesRe(lexer, str, state), flags);
                return lastRegEx;
            };
        }
    }
    return new RegExp(str, flags);
}
/**
 * Compiles guard functions for case matches.
 * This compiles 'cases' attributes into efficient match functions.
 *
 */
function selectScrutinee(id, matches, state, num) {
    if (num < 0) {
        return id;
    }
    if (num < matches.length) {
        return matches[num];
    }
    if (num >= 100) {
        num = num - 100;
        const parts = state.split('.');
        parts.unshift(state);
        if (num < parts.length) {
            return parts[num];
        }
    }
    return null;
}
function createGuard(lexer, ruleName, tkey, val) {
    // get the scrutinee and pattern
    let scrut = -1; // -1: $!, 0-99: $n, 100+n: $Sn
    let oppat = tkey;
    let matches = tkey.match(/^\$(([sS]?)(\d\d?)|#)(.*)$/);
    if (matches) {
        if (matches[3]) { // if digits
            scrut = parseInt(matches[3]);
            if (matches[2]) {
                scrut = scrut + 100; // if [sS] present
            }
        }
        oppat = matches[4];
    }
    // get operator
    let op = '~';
    let pat = oppat;
    if (!oppat || oppat.length === 0) {
        op = '!=';
        pat = '';
    }
    else if (/^\w*$/.test(pat)) { // just a word
        op = '==';
    }
    else {
        matches = oppat.match(/^(@|!@|~|!~|==|!=)(.*)$/);
        if (matches) {
            op = matches[1];
            pat = matches[2];
        }
    }
    // set the tester function
    let tester;
    // special case a regexp that matches just words
    if ((op === '~' || op === '!~') && /^(\w|\|)*$/.test(pat)) {
        const inWords = createKeywordMatcher(pat.split('|'), lexer.ignoreCase);
        tester = function (s) { return (op === '~' ? inWords(s) : !inWords(s)); };
    }
    else if (op === '@' || op === '!@') {
        const words = lexer[pat];
        if (!words) {
            throw monarchCommon.createError(lexer, 'the @ match target \'' + pat + '\' is not defined, in rule: ' + ruleName);
        }
        if (!(isArrayOf(function (elem) { return (typeof (elem) === 'string'); }, words))) {
            throw monarchCommon.createError(lexer, 'the @ match target \'' + pat + '\' must be an array of strings, in rule: ' + ruleName);
        }
        const inWords = createKeywordMatcher(words, lexer.ignoreCase);
        tester = function (s) { return (op === '@' ? inWords(s) : !inWords(s)); };
    }
    else if (op === '~' || op === '!~') {
        if (pat.indexOf('$') < 0) {
            // precompile regular expression
            const re = compileRegExp(lexer, '^' + pat + '$', false);
            tester = function (s) { return (op === '~' ? re.test(s) : !re.test(s)); };
        }
        else {
            tester = function (s, id, matches, state) {
                const re = compileRegExp(lexer, '^' + monarchCommon.substituteMatches(lexer, pat, id, matches, state) + '$', false);
                return re.test(s);
            };
        }
    }
    else { // if (op==='==' || op==='!=') {
        if (pat.indexOf('$') < 0) {
            const patx = monarchCommon.fixCase(lexer, pat);
            tester = function (s) { return (op === '==' ? s === patx : s !== patx); };
        }
        else {
            const patx = monarchCommon.fixCase(lexer, pat);
            tester = function (s, id, matches, state, eos) {
                const patexp = monarchCommon.substituteMatches(lexer, patx, id, matches, state);
                return (op === '==' ? s === patexp : s !== patexp);
            };
        }
    }
    // return the branch object
    if (scrut === -1) {
        return {
            name: tkey, value: val, test: function (id, matches, state, eos) {
                return tester(id, id, matches, state, eos);
            }
        };
    }
    else {
        return {
            name: tkey, value: val, test: function (id, matches, state, eos) {
                const scrutinee = selectScrutinee(id, matches, state, scrut);
                return tester(!scrutinee ? '' : scrutinee, id, matches, state, eos);
            }
        };
    }
}
/**
 * Compiles an action: i.e. optimize regular expressions and case matches
 * and do many sanity checks.
 *
 * This is called only during compilation but if the lexer definition
 * contains user functions as actions (which is usually not allowed), then this
 * may be called during lexing. It is important therefore to compile common cases efficiently
 */
function compileAction(lexer, ruleName, action) {
    if (!action) {
        return { token: '' };
    }
    else if (typeof (action) === 'string') {
        return action; // { token: action };
    }
    else if (action.token || action.token === '') {
        if (typeof (action.token) !== 'string') {
            throw monarchCommon.createError(lexer, 'a \'token\' attribute must be of type string, in rule: ' + ruleName);
        }
        else {
            // only copy specific typed fields (only happens once during compile Lexer)
            const newAction = { token: action.token };
            if (action.token.indexOf('$') >= 0) {
                newAction.tokenSubst = true;
            }
            if (typeof (action.bracket) === 'string') {
                if (action.bracket === '@open') {
                    newAction.bracket = 1 /* monarchCommon.MonarchBracket.Open */;
                }
                else if (action.bracket === '@close') {
                    newAction.bracket = -1 /* monarchCommon.MonarchBracket.Close */;
                }
                else {
                    throw monarchCommon.createError(lexer, 'a \'bracket\' attribute must be either \'@open\' or \'@close\', in rule: ' + ruleName);
                }
            }
            if (action.next) {
                if (typeof (action.next) !== 'string') {
                    throw monarchCommon.createError(lexer, 'the next state must be a string value in rule: ' + ruleName);
                }
                else {
                    let next = action.next;
                    if (!/^(@pop|@push|@popall)$/.test(next)) {
                        if (next[0] === '@') {
                            next = next.substr(1); // peel off starting @ sign
                        }
                        if (next.indexOf('$') < 0) { // no dollar substitution, we can check if the state exists
                            if (!monarchCommon.stateExists(lexer, monarchCommon.substituteMatches(lexer, next, '', [], ''))) {
                                throw monarchCommon.createError(lexer, 'the next state \'' + action.next + '\' is not defined in rule: ' + ruleName);
                            }
                        }
                    }
                    newAction.next = next;
                }
            }
            if (typeof (action.goBack) === 'number') {
                newAction.goBack = action.goBack;
            }
            if (typeof (action.switchTo) === 'string') {
                newAction.switchTo = action.switchTo;
            }
            if (typeof (action.log) === 'string') {
                newAction.log = action.log;
            }
            if (typeof (action.nextEmbedded) === 'string') {
                newAction.nextEmbedded = action.nextEmbedded;
                lexer.usesEmbedded = true;
            }
            return newAction;
        }
    }
    else if (Array.isArray(action)) {
        const results = [];
        for (let i = 0, len = action.length; i < len; i++) {
            results[i] = compileAction(lexer, ruleName, action[i]);
        }
        return { group: results };
    }
    else if (action.cases) {
        // build an array of test cases
        const cases = [];
        // for each case, push a test function and result value
        for (const tkey in action.cases) {
            if (action.cases.hasOwnProperty(tkey)) {
                const val = compileAction(lexer, ruleName, action.cases[tkey]);
                // what kind of case
                if (tkey === '@default' || tkey === '@' || tkey === '') {
                    cases.push({ test: undefined, value: val, name: tkey });
                }
                else if (tkey === '@eos') {
                    cases.push({ test: function (id, matches, state, eos) { return eos; }, value: val, name: tkey });
                }
                else {
                    cases.push(createGuard(lexer, ruleName, tkey, val)); // call separate function to avoid local variable capture
                }
            }
        }
        // create a matching function
        const def = lexer.defaultToken;
        return {
            test: function (id, matches, state, eos) {
                for (const _case of cases) {
                    const didmatch = (!_case.test || _case.test(id, matches, state, eos));
                    if (didmatch) {
                        return _case.value;
                    }
                }
                return def;
            }
        };
    }
    else {
        throw monarchCommon.createError(lexer, 'an action must be a string, an object with a \'token\' or \'cases\' attribute, or an array of actions; in rule: ' + ruleName);
    }
}
/**
 * Helper class for creating matching rules
 */
class Rule {
    constructor(name) {
        this.regex = new RegExp('');
        this.action = { token: '' };
        this.matchOnlyAtLineStart = false;
        this.name = '';
        this.name = name;
    }
    setRegex(lexer, re) {
        let sregex;
        if (typeof (re) === 'string') {
            sregex = re;
        }
        else if (re instanceof RegExp) {
            sregex = re.source;
        }
        else {
            throw monarchCommon.createError(lexer, 'rules must start with a match string or regular expression: ' + this.name);
        }
        this.matchOnlyAtLineStart = (sregex.length > 0 && sregex[0] === '^');
        this.name = this.name + ': ' + sregex;
        this.regex = compileRegExp(lexer, '^(?:' + (this.matchOnlyAtLineStart ? sregex.substr(1) : sregex) + ')', true);
    }
    setAction(lexer, act) {
        this.action = compileAction(lexer, this.name, act);
    }
    resolveRegex(state) {
        if (this.regex instanceof RegExp) {
            return this.regex;
        }
        else {
            return this.regex(state);
        }
    }
}
/**
 * Compiles a json description function into json where all regular expressions,
 * case matches etc, are compiled and all include rules are expanded.
 * We also compile the bracket definitions, supply defaults, and do many sanity checks.
 * If the 'jsonStrict' parameter is 'false', we allow at certain locations
 * regular expression objects and functions that get called during lexing.
 * (Currently we have no samples that need this so perhaps we should always have
 * jsonStrict to true).
 */
export function compile(languageId, json) {
    if (!json || typeof (json) !== 'object') {
        throw new Error('Monarch: expecting a language definition object');
    }
    // Create our lexer
    const lexer = {
        languageId: languageId,
        includeLF: bool(json.includeLF, false),
        noThrow: false, // raise exceptions during compilation
        maxStack: 100,
        start: (typeof json.start === 'string' ? json.start : null),
        ignoreCase: bool(json.ignoreCase, false),
        unicode: bool(json.unicode, false),
        tokenPostfix: string(json.tokenPostfix, '.' + languageId),
        defaultToken: string(json.defaultToken, 'source'),
        usesEmbedded: false, // becomes true if we find a nextEmbedded action
        stateNames: {},
        tokenizer: {},
        brackets: []
    };
    // For calling compileAction later on
    const lexerMin = json;
    lexerMin.languageId = languageId;
    lexerMin.includeLF = lexer.includeLF;
    lexerMin.ignoreCase = lexer.ignoreCase;
    lexerMin.unicode = lexer.unicode;
    lexerMin.noThrow = lexer.noThrow;
    lexerMin.usesEmbedded = lexer.usesEmbedded;
    lexerMin.stateNames = json.tokenizer;
    lexerMin.defaultToken = lexer.defaultToken;
    // Compile an array of rules into newrules where RegExp objects are created.
    function addRules(state, newrules, rules) {
        for (const rule of rules) {
            let include = rule.include;
            if (include) {
                if (typeof (include) !== 'string') {
                    throw monarchCommon.createError(lexer, 'an \'include\' attribute must be a string at: ' + state);
                }
                if (include[0] === '@') {
                    include = include.substr(1); // peel off starting @
                }
                if (!json.tokenizer[include]) {
                    throw monarchCommon.createError(lexer, 'include target \'' + include + '\' is not defined at: ' + state);
                }
                addRules(state + '.' + include, newrules, json.tokenizer[include]);
            }
            else {
                const newrule = new Rule(state);
                // Set up new rule attributes
                if (Array.isArray(rule) && rule.length >= 1 && rule.length <= 3) {
                    newrule.setRegex(lexerMin, rule[0]);
                    if (rule.length >= 3) {
                        if (typeof (rule[1]) === 'string') {
                            newrule.setAction(lexerMin, { token: rule[1], next: rule[2] });
                        }
                        else if (typeof (rule[1]) === 'object') {
                            const rule1 = rule[1];
                            rule1.next = rule[2];
                            newrule.setAction(lexerMin, rule1);
                        }
                        else {
                            throw monarchCommon.createError(lexer, 'a next state as the last element of a rule can only be given if the action is either an object or a string, at: ' + state);
                        }
                    }
                    else {
                        newrule.setAction(lexerMin, rule[1]);
                    }
                }
                else {
                    if (!rule.regex) {
                        throw monarchCommon.createError(lexer, 'a rule must either be an array, or an object with a \'regex\' or \'include\' field at: ' + state);
                    }
                    if (rule.name) {
                        if (typeof rule.name === 'string') {
                            newrule.name = rule.name;
                        }
                    }
                    if (rule.matchOnlyAtStart) {
                        newrule.matchOnlyAtLineStart = bool(rule.matchOnlyAtLineStart, false);
                    }
                    newrule.setRegex(lexerMin, rule.regex);
                    newrule.setAction(lexerMin, rule.action);
                }
                newrules.push(newrule);
            }
        }
    }
    // compile the tokenizer rules
    if (!json.tokenizer || typeof (json.tokenizer) !== 'object') {
        throw monarchCommon.createError(lexer, 'a language definition must define the \'tokenizer\' attribute as an object');
    }
    lexer.tokenizer = [];
    for (const key in json.tokenizer) {
        if (json.tokenizer.hasOwnProperty(key)) {
            if (!lexer.start) {
                lexer.start = key;
            }
            const rules = json.tokenizer[key];
            lexer.tokenizer[key] = new Array();
            addRules('tokenizer.' + key, lexer.tokenizer[key], rules);
        }
    }
    lexer.usesEmbedded = lexerMin.usesEmbedded; // can be set during compileAction
    // Set simple brackets
    if (json.brackets) {
        if (!(Array.isArray(json.brackets))) {
            throw monarchCommon.createError(lexer, 'the \'brackets\' attribute must be defined as an array');
        }
    }
    else {
        json.brackets = [
            { open: '{', close: '}', token: 'delimiter.curly' },
            { open: '[', close: ']', token: 'delimiter.square' },
            { open: '(', close: ')', token: 'delimiter.parenthesis' },
            { open: '<', close: '>', token: 'delimiter.angle' }
        ];
    }
    const brackets = [];
    for (const el of json.brackets) {
        let desc = el;
        if (desc && Array.isArray(desc) && desc.length === 3) {
            desc = { token: desc[2], open: desc[0], close: desc[1] };
        }
        if (desc.open === desc.close) {
            throw monarchCommon.createError(lexer, 'open and close brackets in a \'brackets\' attribute must be different: ' + desc.open +
                '\n hint: use the \'bracket\' attribute if matching on equal brackets is required.');
        }
        if (typeof desc.open === 'string' && typeof desc.token === 'string' && typeof desc.close === 'string') {
            brackets.push({
                token: desc.token + lexer.tokenPostfix,
                open: monarchCommon.fixCase(lexer, desc.open),
                close: monarchCommon.fixCase(lexer, desc.close)
            });
        }
        else {
            throw monarchCommon.createError(lexer, 'every element in the \'brackets\' array must be a \'{open,close,token}\' object or array');
        }
    }
    lexer.brackets = brackets;
    // Disable throw so the syntax highlighter goes, no matter what
    lexer.noThrow = true;
    return lexer;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaENvbXBpbGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvY29tbW9uL21vbmFyY2gvbW9uYXJjaENvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7OztHQUdHO0FBRUgsT0FBTyxLQUFLLGFBQWEsTUFBTSxvQkFBb0IsQ0FBQztBQUdwRDs7Ozs7OztHQU9HO0FBRUgsU0FBUyxTQUFTLENBQUMsUUFBNkIsRUFBRSxHQUFRO0lBQ3pELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNWLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzNCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELEtBQUssTUFBTSxFQUFFLElBQUksR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNyQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBUyxJQUFJLENBQUMsSUFBUyxFQUFFLFFBQWlCO0lBQ3pDLElBQUksT0FBTyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDL0IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDakIsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLElBQVMsRUFBRSxRQUFnQjtJQUMxQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNoQyxPQUFPLElBQUksQ0FBQztJ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