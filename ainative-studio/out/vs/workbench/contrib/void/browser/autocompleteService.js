/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { extractCodeFromRegular } from '../common/helpers/extractCodeFromResult.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { isWindows } from '../../../../base/common/platform.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
// import { IContextGatheringService } from './contextGatheringService.js';
const allLinebreakSymbols = ['\r\n', '\n'];
const _ln = isWindows ? allLinebreakSymbols[0] : allLinebreakSymbols[1];
// The extension this was called from is here - https://github.com/voideditor/void/blob/autocomplete/extensions/void/src/extension/extension.ts
/*
A summary of autotab:

Postprocessing
-one common problem for all models is outputting unbalanced parentheses
we solve this by trimming all extra closing parentheses from the generated string
in future, should make sure parentheses are always balanced

-another problem is completing the middle of a string, eg. "const [x, CURSOR] = useState()"
we complete up to first matchup character
but should instead complete the whole line / block (difficult because of parenthesis accuracy)

-too much info is bad. usually we want to show the user 1 line, and have a preloaded response afterwards
this should happen automatically with caching system
should break preloaded responses into \n\n chunks

Preprocessing
- we don't generate if cursor is at end / beginning of a line (no spaces)
- we generate 1 line if there is text to the right of cursor
- we generate 1 line if variable declaration
- (in many cases want to show 1 line but generate multiple)

State
- cache based on prefix (and do some trimming first)
- when press tab on one line, should have an immediate followup response
to do this, show autocompletes before they're fully finished
- [todo] remove each autotab when accepted
!- [todo] provide type information

Details
-generated results are trimmed up to 1 leading/trailing space
-prefixes are cached up to 1 trailing newline
-
*/
class LRUCache {
    constructor(maxSize, disposeCallback) {
        if (maxSize <= 0)
            throw new Error('Cache size must be greater than 0');
        this.items = new Map();
        this.keyOrder = [];
        this.maxSize = maxSize;
        this.disposeCallback = disposeCallback;
    }
    set(key, value) {
        // If key exists, remove it from the order list
        if (this.items.has(key)) {
            this.keyOrder = this.keyOrder.filter(k => k !== key);
        }
        // If cache is full, remove least recently used item
        else if (this.items.size >= this.maxSize) {
            const key = this.keyOrder[0];
            const value = this.items.get(key);
            // Call dispose callback if it exists
            if (this.disposeCallback && value !== undefined) {
                this.disposeCallback(value, key);
            }
            this.items.delete(key);
            this.keyOrder.shift();
        }
        // Add new item
        this.items.set(key, value);
        this.keyOrder.push(key);
    }
    delete(key) {
        const value = this.items.get(key);
        if (value !== undefined) {
            // Call dispose callback if it exists
            if (this.disposeCallback) {
                this.disposeCallback(value, key);
            }
            this.items.delete(key);
            this.keyOrder = this.keyOrder.filter(k => k !== key);
            return true;
        }
        return false;
    }
    clear() {
        // Call dispose callback for all items if it exists
        if (this.disposeCallback) {
            for (const [key, value] of this.items.entries()) {
                this.disposeCallback(value, key);
            }
        }
        this.items.clear();
        this.keyOrder = [];
    }
    get size() {
        return this.items.size;
    }
    has(key) {
        return this.items.has(key);
    }
}
const DEBOUNCE_TIME = 500;
const TIMEOUT_TIME = 60000;
const MAX_CACHE_SIZE = 20;
const MAX_PENDING_REQUESTS = 2;
// postprocesses the result
const processStartAndEndSpaces = (result) => {
    // trim all whitespace except for a single leading/trailing space
    // return result.trim()
    [result,] = extractCodeFromRegular({ text: result, recentlyAddedTextLen: result.length });
    const hasLeadingSpace = result.startsWith(' ');
    const hasTrailingSpace = result.endsWith(' ');
    return (hasLeadingSpace ? ' ' : '')
        + result.trim()
        + (hasTrailingSpace ? ' ' : '');
};
// trims the end of the prefix to improve cache hit rate
const removeLeftTabsAndTrimEnds = (s) => {
    const trimmedString = s.trimEnd();
    const trailingEnd = s.slice(trimmedString.length);
    // keep only a single trailing newline
    if (trailingEnd.includes(_ln)) {
        s = trimmedString + _ln;
    }
    s = s.replace(/^\s+/gm, ''); // remove left tabs
    return s;
};
const removeAllWhitespace = (str) => str.replace(/\s+/g, '');
function getIsSubsequence({ of, subsequence }) {
    if (subsequence.length === 0)
        return [true, ''];
    if (of.length === 0)
        return [false, ''];
    let subsequenceIndex = 0;
    let lastMatchChar = '';
    for (let i = 0; i < of.length; i++) {
        if (of[i] === subsequence[subsequenceIndex]) {
            lastMatchChar = of[i];
            subsequenceIndex++;
        }
        if (subsequenceIndex === subsequence.length) {
            return [true, lastMatchChar];
        }
    }
    return [false, lastMatchChar];
}
function getStringUpToUnbalancedClosingParenthesis(s, prefix) {
    const pairs = { ')': '(', '}': '{', ']': '[' };
    // process all bracets in prefix
    let stack = [];
    const firstOpenIdx = prefix.search(/[[({]/);
    if (firstOpenIdx !== -1) {
        const brackets = prefix.slice(firstOpenIdx).split('').filter(c => '()[]{}'.includes(c));
        for (const bracket of brackets) {
            if (bracket === '(' || bracket === '{' || bracket === '[') {
                stack.push(bracket);
            }
            else {
                if (stack.length > 0 && stack[stack.length - 1] === pairs[bracket]) {
                    stack.pop();
                }
                else {
                    stack.push(bracket);
                }
            }
        }
    }
    // iterate through each character
    for (let i = 0; i < s.length; i++) {
        const char = s[i];
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        }
        else if (char === ')' || char === '}' || char === ']') {
            if (stack.length === 0 || stack.pop() !== pairs[char]) {
                return s.substring(0, i);
            }
        }
    }
    return s;
}
// further trim the autocompletion
const postprocessAutocompletion = ({ autocompletionMatchup, autocompletion, prefixAndSuffix }) => {
    const { prefix, prefixToTheLeftOfCursor, suffixToTheRightOfCursor } = prefixAndSuffix;
    const generatedMiddle = autocompletion.insertText;
    let startIdx = autocompletionMatchup.startIdx;
    let endIdx = generatedMiddle.length; // exclusive bounds
    // const naiveReturnValue = generatedMiddle.slice(startIdx)
    // console.log('naiveReturnValue: ', JSON.stringify(naiveReturnValue))
    // return [{ insertText: naiveReturnValue, }]
    // do postprocessing for better ux
    // this is a bit hacky but may change a lot
    // if there is space at the start of the completion and user has added it, remove it
    const charToLeftOfCursor = prefixToTheLeftOfCursor.slice(-1)[0] || '';
    const userHasAddedASpace = charToLeftOfCursor === ' ' || charToLeftOfCursor === '\t';
    const rawFirstNonspaceIdx = generatedMiddle.slice(startIdx).search(/[^\t ]/);
    if (rawFirstNonspaceIdx > -1 && userHasAddedASpace) {
        const firstNonspaceIdx = rawFirstNonspaceIdx + startIdx;
        // console.log('p0', startIdx, rawFirstNonspaceIdx)
        startIdx = Math.max(startIdx, firstNonspaceIdx);
    }
    // if user is on a blank line and the generation starts with newline(s), remove them
    const numStartingNewlines = generatedMiddle.slice(startIdx).match(new RegExp(`^${_ln}+`))?.[0].length || 0;
    if (!prefixToTheLeftOfCursor.trim()
        && !suffixToTheRightOfCursor.trim()
        && numStartingNewlines > 0) {
        // console.log('p1', numStartingNewlines)
        startIdx += numStartingNewlines;
    }
    // if the generated FIM text matches with the suffix on the current line, stop
    if (autocompletion.type === 'single-line-fill-middle' && suffixToTheRightOfCursor.trim()) { // completing in the middle of a line
        // complete until there is a match
        const rawMatchIndex = generatedMiddle.slice(startIdx).lastIndexOf(suffixToTheRightOfCursor.trim()[0]);
        if (rawMatchIndex > -1) {
            // console.log('p2', rawMatchIndex, startIdx, suffixToTheRightOfCursor.trim()[0], 'AAA', generatedMiddle.slice(startIdx))
            const matchIdx = rawMatchIndex + startIdx;
            const matchChar = generatedMiddle[matchIdx];
            if (`{}()[]<>\`'"`.includes(matchChar)) {
                endIdx = Math.min(endIdx, matchIdx);
            }
        }
    }
    const restOfLineToGenerate = generatedMiddle.slice(startIdx).split(_ln)[0] ?? '';
    // condition to complete as a single line completion
    if (prefixToTheLeftOfCursor.trim()
        && !suffixToTheRightOfCursor.trim()
        && restOfLineToGenerate.trim()) {
        const rawNewlineIdx = generatedMiddle.slice(startIdx).indexOf(_ln);
        if (rawNewlineIdx > -1) {
            // console.log('p3', startIdx, rawNewlineIdx)
            const newlineIdx = rawNewlineIdx + startIdx;
            endIdx = Math.min(endIdx, newlineIdx);
        }
    }
    // // if a generated line matches with a suffix line, stop
    // if (suffixLines.length > 1) {
    // 	console.log('4')
    // 	const lines = []
    // 	for (const generatedLine of generatedLines) {
    // 		if (suffixLines.slice(0, 10).some(suffixLine =>
    // 			generatedLine.trim() !== '' && suffixLine.trim() !== ''
    // 			&& generatedLine.trim().startsWith(suffixLine.trim())
    // 		)) break;
    // 		lines.push(generatedLine)
    // 	}
    // 	endIdx = lines.join('\n').length // this is hacky, remove or refactor in future
    // }
    // console.log('pFinal', startIdx, endIdx)
    let completionStr = generatedMiddle.slice(startIdx, endIdx);
    // filter out unbalanced parentheses
    completionStr = getStringUpToUnbalancedClosingParenthesis(completionStr, prefix);
    // console.log('originalCompletionStr: ', JSON.stringify(generatedMiddle.slice(startIdx)))
    // console.log('finalCompletionStr: ', JSON.stringify(completionStr))
    return completionStr;
};
// returns the text in the autocompletion to display, assuming the prefix is already matched
const toInlineCompletions = ({ autocompletionMatchup, autocompletion, prefixAndSuffix, position, debug }) => {
    let trimmedInsertText = postprocessAutocompletion({ autocompletionMatchup, autocompletion, prefixAndSuffix, });
    let rangeToReplace = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
    // handle special cases
    // if we redid the suffix, replace the suffix
    if (autocompletion.type === 'single-line-redo-suffix') {
        const oldSuffix = prefixAndSuffix.suffixToTheRightOfCursor;
        const newSuffix = autocompletion.insertText;
        const [isSubsequence, lastMatchingChar] = getIsSubsequence({
            subsequence: removeAllWhitespace(oldSuffix), // old suffix
            of: removeAllWhitespace(newSuffix), // new suffix
        });
        if (isSubsequence) {
            rangeToReplace = new Range(position.lineNumber, position.column, position.lineNumber, Number.MAX_SAFE_INTEGER);
        }
        else {
            const lastMatchupIdx = trimmedInsertText.lastIndexOf(lastMatchingChar);
            trimmedInsertText = trimmedInsertText.slice(0, lastMatchupIdx + 1);
            const numCharsToReplace = oldSuffix.lastIndexOf(lastMatchingChar) + 1;
            rangeToReplace = new Range(position.lineNumber, position.column, position.lineNumber, position.column + numCharsToReplace);
            // console.log('show____', trimmedInsertText, rangeToReplace)
        }
    }
    return [{
            insertText: trimmedInsertText,
            range: rangeToReplace,
        }];
};
const getPrefixAndSuffixInfo = (model, position) => {
    const fullText = model.getValue(1 /* EndOfLinePreference.LF */);
    const cursorOffset = model.getOffsetAt(position);
    const prefix = fullText.substring(0, cursorOffset);
    const suffix = fullText.substring(cursorOffset);
    const prefixLines = prefix.split(_ln);
    const suffixLines = suffix.split(_ln);
    const prefixToTheLeftOfCursor = prefixLines.slice(-1)[0] ?? '';
    const suffixToTheRightOfCursor = suffixLines[0] ?? '';
    return { prefix, suffix, prefixLines, suffixLines, prefixToTheLeftOfCursor, suffixToTheRightOfCursor };
};
const getIndex = (str, line, char) => {
    return str.split(_ln).slice(0, line).join(_ln).length + (line > 0 ? 1 : 0) + char;
};
const getLastLine = (s) => {
    const matches = s.match(new RegExp(`[^${_ln}]*$`));
    return matches ? matches[0] : '';
};
// returns the startIdx of the match if there is a match, or undefined if there is no match
// all results are wrt `autocompletion.result`
const getAutocompletionMatchup = ({ prefix, autocompletion }) => {
    const trimmedCurrentPrefix = removeLeftTabsAndTrimEnds(prefix);
    const trimmedCompletionPrefix = removeLeftTabsAndTrimEnds(autocompletion.prefix);
    const trimmedCompletionMiddle = removeLeftTabsAndTrimEnds(autocompletion.insertText);
    // console.log('@result: ', JSON.stringify(autocompletion.insertText))
    // console.log('@trimmedCurrentPrefix: ', JSON.stringify(trimmedCurrentPrefix))
    // console.log('@trimmedCompletionPrefix: ', JSON.stringify(trimmedCompletionPrefix))
    // console.log('@trimmedCompletionMiddle: ', JSON.stringify(trimmedCompletionMiddle))
    if (trimmedCurrentPrefix.length < trimmedCompletionPrefix.length) { // user must write text beyond the original prefix at generation time
        // console.log('@undefined1')
        return undefined;
    }
    if ( // check that completion starts with the prefix
    !(trimmedCompletionPrefix + trimmedCompletionMiddle)
        .startsWith(trimmedCurrentPrefix)) {
        // console.log('@undefined2')
        return undefined;
    }
    // reverse map to find position wrt `autocompletion.result`
    const lineStart = trimmedCurrentPrefix.split(_ln).length -
        trimmedCompletionPrefix.split(_ln).length;
    if (lineStart < 0) {
        // console.log('@undefined3')
        console.error('Error: No line found.');
        return undefined;
    }
    const currentPrefixLine = getLastLine(trimmedCurrentPrefix);
    const completionPrefixLine = lineStart === 0 ? getLastLine(trimmedCompletionPrefix) : '';
    const completionMiddleLine = autocompletion.insertText.split(_ln)[lineStart];
    const fullCompletionLine = completionPrefixLine + completionMiddleLine;
    // console.log('currentPrefixLine', currentPrefixLine)
    // console.log('completionPrefixLine', completionPrefixLine)
    // console.log('completionMiddleLine', completionMiddleLine)
    const charMatchIdx = fullCompletionLine.indexOf(currentPrefixLine);
    if (charMatchIdx < 0) {
        // console.log('@undefined4', charMatchIdx)
        console.error('Warning: Found character with negative index. This should never happen.');
        return undefined;
    }
    const character = (charMatchIdx +
        currentPrefixLine.length
        - completionPrefixLine.length);
    const startIdx = getIndex(autocompletion.insertText, lineStart, character);
    return {
        startLine: lineStart,
        startCharacter: character,
        startIdx,
    };
};
const getCompletionOptions = (prefixAndSuffix, relevantContext, justAcceptedAutocompletion) => {
    let { prefix, suffix, prefixToTheLeftOfCursor, suffixToTheRightOfCursor, suffixLines, prefixLines } = prefixAndSuffix;
    // trim prefix and suffix to not be very large
    suffixLines = suffix.split(_ln).slice(0, 25);
    prefixLines = prefix.split(_ln).slice(-25);
    prefix = prefixLines.join(_ln);
    suffix = suffixLines.join(_ln);
    let completionOptions;
    // if line is empty, do multiline completion
    const isLineEmpty = !prefixToTheLeftOfCursor.trim() && !suffixToTheRightOfCursor.trim();
    const isLinePrefixEmpty = removeAllWhitespace(prefixToTheLeftOfCursor).length === 0;
    const isLineSuffixEmpty = removeAllWhitespace(suffixToTheRightOfCursor).length === 0;
    // TODO add context to prefix
    // llmPrefix = '\n\n/* Relevant context:\n' + relevantContext + '\n*/\n' + llmPrefix
    // if we just accepted an autocompletion, predict a multiline completion starting on the next line
    if (justAcceptedAutocompletion && isLineSuffixEmpty) {
        const prefixWithNewline = prefix + _ln;
        completionOptions = {
            predictionType: 'multi-line-start-on-next-line',
            shouldGenerate: true,
            llmPrefix: prefixWithNewline,
            llmSuffix: suffix,
            stopTokens: [`${_ln}${_ln}`] // double newlines
        };
    }
    // if the current line is empty, predict a single-line completion
    else if (isLineEmpty) {
        completionOptions = {
            predictionType: 'single-line-fill-middle',
            shouldGenerate: true,
            llmPrefix: prefix,
            llmSuffix: suffix,
            stopTokens: allLinebreakSymbols
        };
    }
    // if suffix is 3 or fewer characters, attempt to complete the line ignorning it
    else if (removeAllWhitespace(suffixToTheRightOfCursor).length <= 3) {
        const suffixLinesIgnoringThisLine = suffixLines.slice(1);
        const suffixStringIgnoringThisLine = suffixLinesIgnoringThisLine.length === 0 ? '' : _ln + suffixLinesIgnoringThisLine.join(_ln);
        completionOptions = {
            predictionType: 'single-line-redo-suffix',
            shouldGenerate: true,
            llmPrefix: prefix,
            llmSuffix: suffixStringIgnoringThisLine,
            stopTokens: allLinebreakSymbols
        };
    }
    // else attempt to complete the middle of the line if there is a prefix (the completion looks bad if there is no prefix)
    else if (!isLinePrefixEmpty) {
        completionOptions = {
            predictionType: 'single-line-fill-middle',
            shouldGenerate: true,
            llmPrefix: prefix,
            llmSuffix: suffix,
            stopTokens: allLinebreakSymbols
        };
    }
    else {
        completionOptions = {
            predictionType: 'do-not-predict',
            shouldGenerate: false,
            llmPrefix: prefix,
            llmSuffix: suffix,
            stopTokens: []
        };
    }
    return completionOptions;
};
export const IAutocompleteService = createDecorator('AutocompleteService');
let AutocompleteService = class AutocompleteService extends Disposable {
    static { this.ID = 'void.autocompleteService'; }
    // private _lastPrefix: string = ''
    // used internally by vscode
    // fires after every keystroke and returns the completion to show
    async _provideInlineCompletionItems(model, position) {
        const isEnabled = this._settingsService.state.globalSettings.enableAutocomplete;
        if (!isEnabled)
            return [];
        const testMode = false;
        const docUriStr = model.uri.fsPath;
        const prefixAndSuffix = getPrefixAndSuffixInfo(model, position);
        const { prefix, suffix } = prefixAndSuffix;
        // initialize cache if it doesnt exist
        // note that whenever an autocompletion is accepted, it is removed from cache
        if (!this._autocompletionsOfDocument[docUriStr]) {
            this._autocompletionsOfDocument[docUriStr] = new LRUCache(MAX_CACHE_SIZE, (autocompletion) => {
                if (autocompletion.requestId)
                    this._llmMessageService.abort(autocompletion.requestId);
            });
        }
        // this._lastPrefix = prefix
        // print all pending autocompletions
        // let _numPending = 0
        // this._autocompletionsOfDocument[docUriStr].items.forEach((a: Autocompletion) => { if (a.status === 'pending') _numPending += 1 })
        // console.log('@numPending: ' + _numPending)
        // get autocompletion from cache
        let cachedAutocompletion = undefined;
        let autocompletionMatchup = undefined;
        for (const autocompletion of this._autocompletionsOfDocument[docUriStr].items.values()) {
            // if the user's change matches with the autocompletion
            autocompletionMatchup = getAutocompletionMatchup({ prefix, autocompletion });
            if (autocompletionMatchup !== undefined) {
                cachedAutocompletion = autocompletion;
                break;
            }
        }
        // if there is a cached autocompletion, return it
        if (cachedAutocompletion && autocompletionMatchup) {
            console.log('AA');
            // console.log('id: ' + cachedAutocompletion.id)
            if (cachedAutocompletion.status === 'finished') {
                console.log('A1');
                const inlineCompletions = toInlineCompletions({ autocompletionMatchup, autocompletion: cachedAutocompletion, prefixAndSuffix, position, debug: true });
                return inlineCompletions;
            }
            else if (cachedAutocompletion.status === 'pending') {
                console.log('A2');
                try {
                    await cachedAutocompletion.llmPromise;
                    const inlineCompletions = toInlineCompletions({ autocompletionMatchup, autocompletion: cachedAutocompletion, prefixAndSuffix, position });
                    return inlineCompletions;
                }
                catch (e) {
                    this._autocompletionsOfDocument[docUriStr].delete(cachedAutocompletion.id);
                    console.error('Error creating autocompletion (1): ' + e);
                }
            }
            else if (cachedAutocompletion.status === 'error') {
                console.log('A3');
            }
            else {
                console.log('A4');
            }
            return [];
        }
        // else if no more typing happens, then go forwards with the request
        // wait DEBOUNCE_TIME for the user to stop typing
        const thisTime = Date.now();
        const justAcceptedAutocompletion = thisTime - this._lastCompletionAccept < 500;
        this._lastCompletionStart = thisTime;
        const didTypingHappenDuringDebounce = await new Promise((resolve, reject) => setTimeout(() => {
            if (this._lastCompletionStart === thisTime) {
                resolve(false);
            }
            else {
                resolve(true);
            }
        }, DEBOUNCE_TIME));
        // if more typing happened, then do not go forwards with the request
        if (didTypingHappenDuringDebounce) {
            return [];
        }
        // if there are too many pending requests, cancel the oldest one
        let numPending = 0;
        let oldestPending = undefined;
        for (const autocompletion of this._autocompletionsOfDocument[docUriStr].items.values()) {
            if (autocompletion.status === 'pending') {
                numPending += 1;
                if (oldestPending === undefined) {
                    oldestPending = autocompletion;
                }
                if (numPending >= MAX_PENDING_REQUESTS) {
                    // cancel the oldest pending request and remove it from cache
                    this._autocompletionsOfDocument[docUriStr].delete(oldestPending.id);
                    break;
                }
            }
        }
        // gather relevant context from the code around the user's selection and definitions
        // const relevantSnippetsList = await this._contextGatheringService.readCachedSnippets(model, position, 3);
        // const relevantSnippetsList = this._contextGatheringService.getCachedSnippets();
        // const relevantSnippets = relevantSnippetsList.map((text) => `${text}`).join('\n-------------------------------\n')
        // console.log('@@---------------------\n' + relevantSnippets)
        const relevantContext = '';
        const { shouldGenerate, predictionType, llmPrefix, llmSuffix, stopTokens } = getCompletionOptions(prefixAndSuffix, relevantContext, justAcceptedAutocompletion);
        if (!shouldGenerate)
            return [];
        if (testMode && this._autocompletionId !== 0) { // TODO remove this
            return [];
        }
        // create a new autocompletion and add it to cache
        const newAutocompletion = {
            id: this._autocompletionId++,
            prefix: prefix, // the actual prefix and suffix
            suffix: suffix,
            llmPrefix: llmPrefix, // the prefix and suffix the llm sees
            llmSuffix: llmSuffix,
            startTime: Date.now(),
            endTime: undefined,
            type: predictionType,
            status: 'pending',
            llmPromise: undefined,
            insertText: '',
            requestId: null,
            _newlineCount: 0,
        };
        console.log('starting autocomplete...', predictionType);
        const featureName = 'Autocomplete';
        const overridesOfModel = this._settingsService.state.overridesOfModel;
        const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
        const modelSelectionOptions = modelSelection ? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName] : undefined;
        // set parameters of `newAutocompletion` appropriately
        newAutocompletion.llmPromise = new Promise((resolve, reject) => {
            const requestId = this._llmMessageService.sendLLMMessage({
                messagesType: 'FIMMessage',
                messages: this._convertToLLMMessageService.prepareFIMMessage({
                    messages: {
                        prefix: llmPrefix,
                        suffix: llmSuffix,
                        stopTokens: stopTokens,
                    }
                }),
                modelSelection,
                modelSelectionOptions,
                overridesOfModel,
                logging: { loggingName: 'Autocomplete' },
                onText: () => { }, // unused in FIMMessage
                // onText: async ({ fullText, newText }) => {
                // 	newAutocompletion.insertText = fullText
                // 	// count newlines in newText
                // 	const numNewlines = newText.match(/\n|\r\n/g)?.length || 0
                // 	newAutocompletion._newlineCount += numNewlines
                // 	// if too many newlines, resolve up to last newline
                // 	if (newAutocompletion._newlineCount > 10) {
                // 		const lastNewlinePos = fullText.lastIndexOf('\n')
                // 		newAutocompletion.insertText = fullText.substring(0, lastNewlinePos)
                // 		resolve(newAutocompletion.insertText)
                // 		return
                // 	}
                // 	// if (!getAutocompletionMatchup({ prefix: this._lastPrefix, autocompletion: newAutocompletion })) {
                // 	// 	reject('LLM response did not match user\'s text.')
                // 	// }
                // },
                onFinalMessage: ({ fullText }) => {
                    // console.log('____res: ', JSON.stringify(newAutocompletion.insertText))
                    newAutocompletion.endTime = Date.now();
                    newAutocompletion.status = 'finished';
                    const [text, _] = extractCodeFromRegular({ text: fullText, recentlyAddedTextLen: 0 });
                    newAutocompletion.insertText = processStartAndEndSpaces(text);
                    // handle special case for predicting starting on the next line, add a newline character
                    if (newAutocompletion.type === 'multi-line-start-on-next-line') {
                        newAutocompletion.insertText = _ln + newAutocompletion.insertText;
                    }
                    resolve(newAutocompletion.insertText);
                },
                onError: ({ message }) => {
                    newAutocompletion.endTime = Date.now();
                    newAutocompletion.status = 'error';
                    reject(message);
                },
                onAbort: () => { reject('Aborted autocomplete'); },
            });
            newAutocompletion.requestId = requestId;
            // if the request hasnt resolved in TIMEOUT_TIME seconds, reject it
            setTimeout(() => {
                if (newAutocompletion.status === 'pending') {
                    reject('Timeout receiving message to LLM.');
                }
            }, TIMEOUT_TIME);
        });
        // add autocompletion to cache
        this._autocompletionsOfDocument[docUriStr].set(newAutocompletion.id, newAutocompletion);
        // show autocompletion
        try {
            await newAutocompletion.llmPromise;
            // console.log('id: ' + newAutocompletion.id)
            const autocompletionMatchup = { startIdx: 0, startLine: 0, startCharacter: 0 };
            const inlineCompletions = toInlineCompletions({ autocompletionMatchup, autocompletion: newAutocompletion, prefixAndSuffix, position });
            return inlineCompletions;
        }
        catch (e) {
            this._autocompletionsOfDocument[docUriStr].delete(newAutocompletion.id);
            console.error('Error creating autocompletion (2): ' + e);
            return [];
        }
    }
    constructor(_langFeatureService, _llmMessageService, _editorService, _modelService, _settingsService, _convertToLLMMessageService
    // @IContextGatheringService private readonly _contextGatheringService: IContextGatheringService,
    ) {
        super();
        this._langFeatureService = _langFeatureService;
        this._llmMessageService = _llmMessageService;
        this._editorService = _editorService;
        this._modelService = _modelService;
        this._settingsService = _settingsService;
        this._convertToLLMMessageService = _convertToLLMMessageService;
        this._autocompletionId = 0;
        this._autocompletionsOfDocument = {};
        this._lastCompletionStart = 0;
        this._lastCompletionAccept = 0;
        this._register(this._langFeatureService.inlineCompletionsProvider.register('*', {
            provideInlineCompletions: async (model, position, context, token) => {
                const items = await this._provideInlineCompletionItems(model, position);
                // console.log('item: ', items?.[0]?.insertText)
                return { items: items, };
            },
            freeInlineCompletions: (completions) => {
                // get the `docUriStr` and the `position` of the cursor
                const activePane = this._editorService.activeEditorPane;
                if (!activePane)
                    return;
                const control = activePane.getControl();
                if (!control || !isCodeEditor(control))
                    return;
                const position = control.getPosition();
                if (!position)
                    return;
                const resource = EditorResourceAccessor.getCanonicalUri(this._editorService.activeEditor);
                if (!resource)
                    return;
                const model = this._modelService.getModel(resource);
                if (!model)
                    return;
                const docUriStr = resource.fsPath;
                if (!this._autocompletionsOfDocument[docUriStr])
                    return;
                const { prefix, } = getPrefixAndSuffixInfo(model, position);
                // go through cached items and remove matching ones
                // autocompletion.prefix + autocompletion.insertedText ~== insertedText
                this._autocompletionsOfDocument[docUriStr].items.forEach((autocompletion) => {
                    // we can do this more efficiently, I just didn't want to deal with all of the edge cases
                    const matchup = removeAllWhitespace(prefix) === removeAllWhitespace(autocompletion.prefix + autocompletion.insertText);
                    if (matchup) {
                        console.log('ACCEPT', autocompletion.id);
                        this._lastCompletionAccept = Date.now();
                        this._autocompletionsOfDocument[docUriStr].delete(autocompletion.id);
                    }
                });
            },
        }));
    }
};
AutocompleteService = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, ILLMMessageService),
    __param(2, IEditorService),
    __param(3, IModelService),
    __param(4, IVoidSettingsService),
    __param(5, IConvertToLLMMessageService)
], AutocompleteService);
export { AutocompleteService };
registerWorkbenchContribution2(AutocompleteService.ID, AutocompleteService, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvYXV0b2NvbXBsZXRlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBSTdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzlFLDJFQUEyRTtBQUkzRSxNQUFNLG1CQUFtQixHQUFHLENBQUMs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