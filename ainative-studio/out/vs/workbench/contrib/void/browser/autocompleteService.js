/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2F1dG9jb21wbGV0ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUk3RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEYsT0FBTyxFQUFFLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RSwyRUFBMkU7QUFJM0UsTUFBTSxtQkFBbUIsR0FBRyxD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