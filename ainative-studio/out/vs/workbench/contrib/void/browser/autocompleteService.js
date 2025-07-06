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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9hdXRvY29tcGxldGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFJN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFeEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUUsMkVBQTJFO0FBSTNFLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxN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