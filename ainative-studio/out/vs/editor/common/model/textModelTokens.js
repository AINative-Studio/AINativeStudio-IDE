/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { runWhenGlobalIdle } from '../../../base/common/async.js';
import { BugIndicatingError, onUnexpectedError } from '../../../base/common/errors.js';
import { setTimeout0 } from '../../../base/common/platform.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { countEOL } from '../core/eolCounter.js';
import { LineRange } from '../core/lineRange.js';
import { OffsetRange } from '../core/offsetRange.js';
import { nullTokenizeEncoded } from '../languages/nullTokenize.js';
import { FixedArray } from './fixedArray.js';
import { ContiguousMultilineTokensBuilder } from '../tokens/contiguousMultilineTokensBuilder.js';
import { LineTokens } from '../tokens/lineTokens.js';
var Constants;
(function (Constants) {
    Constants[Constants["CHEAP_TOKENIZATION_LENGTH_LIMIT"] = 2048] = "CHEAP_TOKENIZATION_LENGTH_LIMIT";
})(Constants || (Constants = {}));
export class TokenizerWithStateStore {
    constructor(lineCount, tokenizationSupport) {
        this.tokenizationSupport = tokenizationSupport;
        this.initialState = this.tokenizationSupport.getInitialState();
        this.store = new TrackingTokenizationStateStore(lineCount);
    }
    getStartState(lineNumber) {
        return this.store.getStartState(lineNumber, this.initialState);
    }
    getFirstInvalidLine() {
        return this.store.getFirstInvalidLine(this.initialState);
    }
}
export class TokenizerWithStateStoreAndTextModel extends TokenizerWithStateStore {
    constructor(lineCount, tokenizationSupport, _textModel, _languageIdCodec) {
        super(lineCount, tokenizationSupport);
        this._textModel = _textModel;
        this._languageIdCodec = _languageIdCodec;
    }
    updateTokensUntilLine(builder, lineNumber) {
        const languageId = this._textModel.getLanguageId();
        while (true) {
            const lineToTokenize = this.getFirstInvalidLine();
            if (!lineToTokenize || lineToTokenize.lineNumber > lineNumber) {
                break;
            }
            const text = this._textModel.getLineContent(lineToTokenize.lineNumber);
            const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, text, true, lineToTokenize.startState);
            builder.add(lineToTokenize.lineNumber, r.tokens);
            this.store.setEndState(lineToTokenize.lineNumber, r.endState);
        }
    }
    /** assumes state is up to date */
    getTokenTypeIfInsertingCharacter(position, character) {
        // TODO@hediet: use tokenizeLineWithEdit
        const lineStartState = this.getStartState(position.lineNumber);
        if (!lineStartState) {
            return 0 /* StandardTokenType.Other */;
        }
        const languageId = this._textModel.getLanguageId();
        const lineContent = this._textModel.getLineContent(position.lineNumber);
        // Create the text as if `character` was inserted
        const text = (lineContent.substring(0, position.column - 1)
            + character
            + lineContent.substring(position.column - 1));
        const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, text, true, lineStartState);
        const lineTokens = new LineTokens(r.tokens, text, this._languageIdCodec);
        if (lineTokens.getCount() === 0) {
            return 0 /* StandardTokenType.Other */;
        }
        const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
        return lineTokens.getStandardTokenType(tokenIndex);
    }
    /** assumes state is up to date */
    tokenizeLinesAt(lineNumber, lines) {
        const lineStartState = this.getStartState(lineNumber);
        if (!lineStartState) {
            return null;
        }
        const languageId = this._textModel.getLanguageId();
        const result = [];
        let state = lineStartState;
        for (const line of lines) {
            const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, line, true, state);
            result.push(new LineTokens(r.tokens, line, this._languageIdCodec));
            state = r.endState;
        }
        return result;
    }
    hasAccurateTokensForLine(lineNumber) {
        const firstInvalidLineNumber = this.store.getFirstInvalidEndStateLineNumberOrMax();
        return (lineNumber < firstInvalidLineNumber);
    }
    isCheapToTokenize(lineNumber) {
        const firstInvalidLineNumber = this.store.getFirstInvalidEndStateLineNumberOrMax();
        if (lineNumber < firstInvalidLineNumber) {
            return true;
        }
        if (lineNumber === firstInvalidLineNumber
            && this._textModel.getLineLength(lineNumber) < 2048 /* Constants.CHEAP_TOKENIZATION_LENGTH_LIMIT */) {
            return true;
        }
        return false;
    }
    /**
     * The result is not cached.
     */
    tokenizeHeuristically(builder, startLineNumber, endLineNumber) {
        if (endLineNumber <= this.store.getFirstInvalidEndStateLineNumberOrMax()) {
            // nothing to do
            return { heuristicTokens: false };
        }
        if (startLineNumber <= this.store.getFirstInvalidEndStateLineNumberOrMax()) {
            // tokenization has reached the viewport start...
            this.updateTokensUntilLine(builder, endLineNumber);
            return { heuristicTokens: false };
        }
        let state = this.guessStartState(startLineNumber);
        const languageId = this._textModel.getLanguageId();
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const text = this._textModel.getLineContent(lineNumber);
            const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, text, true, state);
            builder.add(lineNumber, r.tokens);
            state = r.endState;
        }
        return { heuristicTokens: true };
    }
    guessStartState(lineNumber) {
        let { likelyRelevantLines, initialState } = findLikelyRelevantLines(this._textModel, lineNumber, this);
        if (!initialState) {
            initialState = this.tokenizationSupport.getInitialState();
        }
        const languageId = this._textModel.getLanguageId();
        let state = initialState;
        for (const line of likelyRelevantLines) {
            const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, line, false, state);
            state = r.endState;
        }
        return state;
    }
}
export function findLikelyRelevantLines(model, lineNumber, store) {
    let nonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
    const likelyRelevantLines = [];
    let initialState = null;
    for (let i = lineNumber - 1; nonWhitespaceColumn > 1 && i >= 1; i--) {
        const newNonWhitespaceIndex = model.getLineFirstNonWhitespaceColumn(i);
        // Ignore lines full of whitespace
        if (newNonWhitespaceIndex === 0) {
            continue;
        }
        if (newNonWhitespaceIndex < nonWhitespaceColumn) {
            likelyRelevantLines.push(model.getLineContent(i));
            nonWhitespaceColumn = newNonWhitespaceIndex;
            initialState = store?.getStartState(i);
            if (initialState) {
                break;
            }
        }
    }
    likelyRelevantLines.reverse();
    return { likelyRelevantLines, initialState: initialState ?? undefined };
}
/**
 * **Invariant:**
 * If the text model is retokenized from line 1 to {@link getFirstInvalidEndStateLineNumber}() - 1,
 * then the recomputed end state for line l will be equal to {@link getEndState}(l).
 */
export class TrackingTokenizationStateStore {
    constructor(lineCount) {
        this.lineCount = lineCount;
        this._tokenizationStateStore = new TokenizationStateStore();
        this._invalidEndStatesLineNumbers = new RangePriorityQueueImpl();
        this._invalidEndStatesLineNumbers.addRange(new OffsetRange(1, lineCount + 1));
    }
    getEndState(lineNumber) {
        return this._tokenizationStateStore.getEndState(lineNumber);
    }
    /**
     * @returns if the end state has changed.
     */
    setEndState(lineNumber, state) {
        if (!state) {
            throw new BugIndicatingError('Cannot set null/undefined state');
        }
        this._invalidEndStatesLineNumbers.delete(lineNumber);
        const r = this._tokenizationStateStore.setEndState(lineNumber, state);
        if (r && lineNumber < this.lineCount) {
            // because the state changed, we cannot trust the next state anymore and have to invalidate it.
            this._invalidEndStatesLineNumbers.addRange(new OffsetRange(lineNumber + 1, lineNumber + 2));
        }
        return r;
    }
    acceptChange(range, newLineCount) {
        this.lineCount += newLineCount - range.length;
        this._tokenizationStateStore.acceptChange(range, newLineCount);
        this._invalidEndStatesLineNumbers.addRangeAndResize(new OffsetRange(range.startLineNumber, range.endLineNumberExclusive), newLineCount);
    }
    acceptChanges(changes) {
        for (const c of changes) {
            const [eolCount] = countEOL(c.text);
            this.acceptChange(new LineRange(c.range.startLineNumber, c.range.endLineNumber + 1), eolCount + 1);
        }
    }
    invalidateEndStateRange(range) {
        this._invalidEndStatesLineNumbers.addRange(new OffsetRange(range.startLineNumber, range.endLineNumberExclusive));
    }
    getFirstInvalidEndStateLineNumber() { return this._invalidEndStatesLineNumbers.min; }
    getFirstInvalidEndStateLineNumberOrMax() {
        return this.getFirstInvalidEndStateLineNumber() || Number.MAX_SAFE_INTEGER;
    }
    allStatesValid() { return this._invalidEndStatesLineNumbers.min === null; }
    getStartState(lineNumber, initialState) {
        if (lineNumber === 1) {
            return initialState;
        }
        return this.getEndState(lineNumber - 1);
    }
    getFirstInvalidLine(initialState) {
        const lineNumber = this.getFirstInvalidEndStateLineNumber();
        if (lineNumber === null) {
            return null;
        }
        const startState = this.getStartState(lineNumber, initialState);
        if (!startState) {
            throw new BugIndicatingError('Start state must be defined');
        }
        return { lineNumber, startState };
    }
}
export class TokenizationStateStore {
    constructor() {
        this._lineEndStates = new FixedArray(null);
    }
    getEndState(lineNumber) {
        return this._lineEndStates.get(lineNumber);
    }
    setEndState(lineNumber, state) {
        const oldState = this._lineEndStates.get(lineNumber);
        if (oldState && oldState.equals(state)) {
            return false;
        }
        this._lineEndStates.set(lineNumber, state);
        return true;
    }
    acceptChange(range, newLineCount) {
        let length = range.length;
        if (newLineCount > 0 && length > 0) {
            // Keep the last state, even though it is unrelated.
            // But if the new state happens to agree with this last state, then we know we can stop tokenizing.
            length--;
            newLineCount--;
        }
        this._lineEndStates.replace(range.startLineNumber, length, newLineCount);
    }
    acceptChanges(changes) {
        for (const c of changes) {
            const [eolCount] = countEOL(c.text);
            this.acceptChange(new LineRange(c.range.startLineNumber, c.range.endLineNumber + 1), eolCount + 1);
        }
    }
}
export class RangePriorityQueueImpl {
    constructor() {
        this._ranges = [];
    }
    getRanges() {
        return this._ranges;
    }
    get min() {
        if (this._ranges.length === 0) {
            return null;
        }
        return this._ranges[0].start;
    }
    removeMin() {
        if (this._ranges.length === 0) {
            return null;
        }
        const range = this._ranges[0];
        if (range.start + 1 === range.endExclusive) {
            this._ranges.shift();
        }
        else {
            this._ranges[0] = new OffsetRange(range.start + 1, range.endExclusive);
        }
        return range.start;
    }
    delete(value) {
        const idx = this._ranges.findIndex(r => r.contains(value));
        if (idx !== -1) {
            const range = this._ranges[idx];
            if (range.start === value) {
                if (range.endExclusive === value + 1) {
                    this._ranges.splice(idx, 1);
                }
                else {
                    this._ranges[idx] = new OffsetRange(value + 1, range.endExclusive);
                }
            }
            else {
                if (range.endExclusive === value + 1) {
                    this._ranges[idx] = new OffsetRange(range.start, value);
                }
                else {
                    this._ranges.splice(idx, 1, new OffsetRange(range.start, value), new OffsetRange(value + 1, range.endExclusive));
                }
            }
        }
    }
    addRange(range) {
        OffsetRange.addRange(range, this._ranges);
    }
    addRangeAndResize(range, newLength) {
        let idxFirstMightBeIntersecting = 0;
        while (!(idxFirstMightBeIntersecting >= this._ranges.length || range.start <= this._ranges[idxFirstMightBeIntersecting].endExclusive)) {
            idxFirstMightBeIntersecting++;
        }
        let idxFirstIsAfter = idxFirstMightBeIntersecting;
        while (!(idxFirstIsAfter >= this._ranges.length || range.endExclusive < this._ranges[idxFirstIsAfter].start)) {
            idxFirstIsAfter++;
        }
        const delta = newLength - range.length;
        for (let i = idxFirstIsAfter; i < this._ranges.length; i++) {
            this._ranges[i] = this._ranges[i].delta(delta);
        }
        if (idxFirstMightBeIntersecting === idxFirstIsAfter) {
            const newRange = new OffsetRange(range.start, range.start + newLength);
            if (!newRange.isEmpty) {
                this._ranges.splice(idxFirstMightBeIntersecting, 0, newRange);
            }
        }
        else {
            const start = Math.min(range.start, this._ranges[idxFirstMightBeIntersecting].start);
            const endEx = Math.max(range.endExclusive, this._ranges[idxFirstIsAfter - 1].endExclusive);
            const newRange = new OffsetRange(start, endEx + delta);
            if (!newRange.isEmpty) {
                this._ranges.splice(idxFirstMightBeIntersecting, idxFirstIsAfter - idxFirstMightBeIntersecting, newRange);
            }
            else {
                this._ranges.splice(idxFirstMightBeIntersecting, idxFirstIsAfter - idxFirstMightBeIntersecting);
            }
        }
    }
    toString() {
        return this._ranges.map(r => r.toString()).join(' + ');
    }
}
function safeTokenize(languageIdCodec, languageId, tokenizationSupport, text, hasEOL, state) {
    let r = null;
    if (tokenizationSupport) {
        try {
            r = tokenizationSupport.tokenizeEncoded(text, hasEOL, state.clone());
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    if (!r) {
        r = nullTokenizeEncoded(languageIdCodec.encodeLanguageId(languageId), state);
    }
    LineTokens.convertToEndOffset(r.tokens, text.length);
    return r;
}
export class DefaultBackgroundTokenizer {
    constructor(_tokenizerWithStateStore, _backgroundTokenStore) {
        this._tokenizerWithStateStore = _tokenizerWithStateStore;
        this._backgroundTokenStore = _backgroundTokenStore;
        this._isDisposed = false;
        this._isScheduled = false;
    }
    dispose() {
        this._isDisposed = true;
    }
    handleChanges() {
        this._beginBackgroundTokenization();
    }
    _beginBackgroundTokenization() {
        if (this._isScheduled || !this._tokenizerWithStateStore._textModel.isAttachedToEditor() || !this._hasLinesToTokenize()) {
            return;
        }
        this._isScheduled = true;
        runWhenGlobalIdle((deadline) => {
            this._isScheduled = false;
            this._backgroundTokenizeWithDeadline(deadline);
        });
    }
    /**
     * Tokenize until the deadline occurs, but try to yield every 1-2ms.
     */
    _backgroundTokenizeWithDeadline(deadline) {
        // Read the time remaining from the `deadline` immediately because it is unclear
        // if the `deadline` object will be valid after execution leaves this function.
        const endTime = Date.now() + deadline.timeRemaining();
        const execute = () => {
            if (this._isDisposed || !this._tokenizerWithStateStore._textModel.isAttachedToEditor() || !this._hasLinesToTokenize()) {
                // disposed in the meantime or detached or finished
                return;
            }
            this._backgroundTokenizeForAtLeast1ms();
            if (Date.now() < endTime) {
                // There is still time before reaching the deadline, so yield to the browser and then
                // continue execution
                setTimeout0(execute);
            }
            else {
                // The deadline has been reached, so schedule a new idle callback if necessary
                this._beginBackgroundTokenization();
            }
        };
        execute();
    }
    /**
     * Tokenize for at least 1ms.
     */
    _backgroundTokenizeForAtLeast1ms() {
        const lineCount = this._tokenizerWithStateStore._textModel.getLineCount();
        const builder = new ContiguousMultilineTokensBuilder();
        const sw = StopWatch.create(false);
        do {
            if (sw.elapsed() > 1) {
                // the comparison is intentionally > 1 and not >= 1 to ensure that
                // a full millisecond has elapsed, given how microseconds are rounded
                // to milliseconds
                break;
            }
            const tokenizedLineNumber = this._tokenizeOneInvalidLine(builder);
            if (tokenizedLineNumber >= lineCount) {
                break;
            }
        } while (this._hasLinesToTokenize());
        this._backgroundTokenStore.setTokens(builder.finalize());
        this.checkFinished();
    }
    _hasLinesToTokenize() {
        if (!this._tokenizerWithStateStore) {
            return false;
        }
        return !this._tokenizerWithStateStore.store.allStatesValid();
    }
    _tokenizeOneInvalidLine(builder) {
        const firstInvalidLine = this._tokenizerWithStateStore?.getFirstInvalidLine();
        if (!firstInvalidLine) {
            return this._tokenizerWithStateStore._textModel.getLineCount() + 1;
        }
        this._tokenizerWithStateStore.updateTokensUntilLine(builder, firstInvalidLine.lineNumber);
        return firstInvalidLine.lineNumber;
    }
    checkFinished() {
        if (this._isDisposed) {
            return;
        }
        if (this._tokenizerWithStateStore.store.allStatesValid()) {
            this._backgroundTokenStore.backgroundTokenizationFinished();
        }
    }
    requestTokens(startLineNumber, endLineNumberExclusive) {
        this._tokenizerWithStateStore.store.invalidateEndStateRange(new LineRange(startLineNumber, endLineNumberExclusive));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsVG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdGV4dE1vZGVsVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZ0IsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBSXJELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRW5FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU3QyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckQsSUFBVyxTQUVWO0FBRkQsV0FBVyxTQUFTO0lBQ25CLGtHQUFzQyxDQUFBO0FBQ3ZDLENBQUMsRUFGVSxTQUFTLEtBQVQsU0FBUyxRQUVuQjtBQUVELE1BQU0sT0FBTyx1QkFBdUI7SUFLbkMsWUFDQyxTQUFpQixFQUNELG1CQUF5QztRQUF6Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBTnpDLGlCQUFZLEdBQUcsSUFBSSxD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