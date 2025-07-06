/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { disposableTimeout } from '../../../../../base/common/async.js';
import { Color, RGBA } from '../../../../../base/common/color.js';
import { debounce } from '../../../../../base/common/decorators.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters } from '../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
import { DEFAULT_LOCAL_ECHO_EXCLUDE } from '../common/terminalTypeAheadConfiguration.js';
var VT;
(function (VT) {
    VT["Esc"] = "\u001B";
    VT["Csi"] = "\u001B[";
    VT["ShowCursor"] = "\u001B[?25h";
    VT["HideCursor"] = "\u001B[?25l";
    VT["DeleteChar"] = "\u001B[X";
    VT["DeleteRestOfLine"] = "\u001B[K";
})(VT || (VT = {}));
const CSI_STYLE_RE = /^\x1b\[[0-9;]*m/;
const CSI_MOVE_RE = /^\x1b\[?([0-9]*)(;[35])?O?([DC])/;
const NOT_WORD_RE = /[^a-z0-9]/i;
var StatsConstants;
(function (StatsConstants) {
    StatsConstants[StatsConstants["StatsBufferSize"] = 24] = "StatsBufferSize";
    StatsConstants[StatsConstants["StatsSendTelemetryEvery"] = 300000] = "StatsSendTelemetryEvery";
    StatsConstants[StatsConstants["StatsMinSamplesToTurnOn"] = 5] = "StatsMinSamplesToTurnOn";
    StatsConstants[StatsConstants["StatsMinAccuracyToTurnOn"] = 0.3] = "StatsMinAccuracyToTurnOn";
    StatsConstants[StatsConstants["StatsToggleOffThreshold"] = 0.5] = "StatsToggleOffThreshold";
})(StatsConstants || (StatsConstants = {}));
/**
 * Codes that should be omitted from sending to the prediction engine and instead omitted directly:
 * - Hide cursor (DECTCEM): We wrap the local echo sequence in hide and show
 *   CSI ? 2 5 l
 * - Show cursor (DECTCEM): We wrap the local echo sequence in hide and show
 *   CSI ? 2 5 h
 * - Device Status Report (DSR): These sequence fire report events from xterm which could cause
 *   double reporting and potentially a stack overflow (#119472)
 *   CSI Ps n
 *   CSI ? Ps n
 */
const PREDICTION_OMIT_RE = /^(\x1b\[(\??25[hl]|\??[0-9;]+n))+/;
const core = (terminal) => terminal._core;
const flushOutput = (terminal) => {
    // TODO: Flushing output is not possible anymore without async
};
var CursorMoveDirection;
(function (CursorMoveDirection) {
    CursorMoveDirection["Back"] = "D";
    CursorMoveDirection["Forwards"] = "C";
})(CursorMoveDirection || (CursorMoveDirection = {}));
class Cursor {
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    get baseY() {
        return this._baseY;
    }
    get coordinate() {
        return { x: this._x, y: this._y, baseY: this._baseY };
    }
    constructor(rows, cols, _buffer) {
        this.rows = rows;
        this.cols = cols;
        this._buffer = _buffer;
        this._x = 0;
        this._y = 1;
        this._baseY = 1;
        this._x = _buffer.cursorX;
        this._y = _buffer.cursorY;
        this._baseY = _buffer.baseY;
    }
    getLine() {
        return this._buffer.getLine(this._y + this._baseY);
    }
    getCell(loadInto) {
        return this.getLine()?.getCell(this._x, loadInto);
    }
    moveTo(coordinate) {
        this._x = coordinate.x;
        this._y = (coordinate.y + coordinate.baseY) - this._baseY;
        return this.moveInstruction();
    }
    clone() {
        const c = new Cursor(this.rows, this.cols, this._buffer);
        c.moveTo(this);
        return c;
    }
    move(x, y) {
        this._x = x;
        this._y = y;
        return this.moveInstruction();
    }
    shift(x = 0, y = 0) {
        this._x += x;
        this._y += y;
        return this.moveInstruction();
    }
    moveInstruction() {
        if (this._y >= this.rows) {
            this._baseY += this._y - (this.rows - 1);
            this._y = this.rows - 1;
        }
        else if (this._y < 0) {
            this._baseY -= this._y;
            this._y = 0;
        }
        return `${"\u001B[" /* VT.Csi */}${this._y + 1};${this._x + 1}H`;
    }
}
const moveToWordBoundary = (b, cursor, direction) => {
    let ateLeadingWhitespace = false;
    if (direction < 0) {
        cursor.shift(-1);
    }
    let cell;
    while (cursor.x >= 0) {
        cell = cursor.getCell(cell);
        if (!cell?.getCode()) {
            return;
        }
        const chars = cell.getChars();
        if (NOT_WORD_RE.test(chars)) {
            if (ateLeadingWhitespace) {
                break;
            }
        }
        else {
            ateLeadingWhitespace = true;
        }
        cursor.shift(direction);
    }
    if (direction < 0) {
        cursor.shift(1); // we want to place the cursor after the whitespace starting the word
    }
};
var MatchResult;
(function (MatchResult) {
    /** matched successfully */
    MatchResult[MatchResult["Success"] = 0] = "Success";
    /** failed to match */
    MatchResult[MatchResult["Failure"] = 1] = "Failure";
    /** buffer data, it might match in the future one more data comes in */
    MatchResult[MatchResult["Buffer"] = 2] = "Buffer";
})(MatchResult || (MatchResult = {}));
class StringReader {
    get remaining() {
        return this._input.length - this.index;
    }
    get eof() {
        return this.index === this._input.length;
    }
    get rest() {
        return this._input.slice(this.index);
    }
    constructor(_input) {
        this._input = _input;
        this.index = 0;
    }
    /**
     * Advances the reader and returns the character if it matches.
     */
    eatChar(char) {
        if (this._input[this.index] !== char) {
            return;
        }
        this.index++;
        return char;
    }
    /**
     * Advances the reader and returns the string if it matches.
     */
    eatStr(substr) {
        if (this._input.slice(this.index, substr.length) !== substr) {
            return;
        }
        this.index += substr.length;
        return substr;
    }
    /**
     * Matches and eats the substring character-by-character. If EOF is reached
     * before the substring is consumed, it will buffer. Index is not moved
     * if it's not a match.
     */
    eatGradually(substr) {
        const prevIndex = this.index;
        for (let i = 0; i < substr.length; i++) {
            if (i > 0 && this.eof) {
                return 2 /* MatchResult.Buffer */;
            }
            if (!this.eatChar(substr[i])) {
                this.index = prevIndex;
                return 1 /* MatchResult.Failure */;
            }
        }
        return 0 /* MatchResult.Success */;
    }
    /**
     * Advances the reader and returns the regex if it matches.
     */
    eatRe(re) {
        const match = re.exec(this._input.slice(this.index));
        if (!match) {
            return;
        }
        this.index += match[0].length;
        return match;
    }
    /**
     * Advances the reader and returns the character if the code matches.
     */
    eatCharCode(min = 0, max = min + 1) {
        const code = this._input.charCodeAt(this.index);
        if (code < min || code >= max) {
            return undefined;
        }
        this.index++;
        return code;
    }
}
/**
 * Preidction which never tests true. Will always discard predictions made
 * after it.
 */
class HardBoundary {
    constructor() {
        this.clearAfterTimeout = false;
    }
    apply() {
        return '';
    }
    rollback() {
        return '';
    }
    rollForwards() {
        return '';
    }
    matches() {
        return 1 /* MatchResult.Failure */;
    }
}
/**
 * Wraps another prediction. Does not apply the prediction, but will pass
 * through its `matches` request.
 */
class TentativeBoundary {
    constructor(inner) {
        this.inner = inner;
    }
    apply(buffer, cursor) {
        this._appliedCursor = cursor.clone();
        this.inner.apply(buffer, this._appliedCursor);
        return '';
    }
    rollback(cursor) {
        this.inner.rollback(cursor.clone());
        return '';
    }
    rollForwards(cursor, withInput) {
        if (this._appliedCursor) {
            cursor.moveTo(this._appliedCursor);
        }
        return withInput;
    }
    matches(input) {
        return this.inner.matches(input);
    }
}
const isTenativeCharacterPrediction = (p) => p instanceof TentativeBoundary && p.inner instanceof CharacterPrediction;
/**
 * Prediction for a single alphanumeric character.
 */
class CharacterPrediction {
    constructor(_style, _char) {
        this._style = _style;
        this._char = _char;
        this.affectsStyle = true;
    }
    apply(_, cursor) {
        const cell = cursor.getCell();
        this.appliedAt = cell
            ? { pos: cursor.coordinate, oldAttributes: attributesToSeq(cell), oldChar: cell.getChars() }
            : { pos: cursor.coordinate, oldAttributes: '', oldChar: '' };
        cursor.shift(1);
        return this._style.apply + this._char + this._style.undo;
    }
    rollback(cursor) {
        if (!this.appliedAt) {
            return ''; // not applied
        }
        const { oldAttributes, oldChar, pos } = this.appliedAt;
        const r = cursor.moveTo(pos) + (oldChar ? `${oldAttributes}${oldChar}${cursor.moveTo(pos)}` : "\u001B[X" /* VT.DeleteChar */);
        return r;
    }
    rollForwards(cursor, input) {
        if (!this.appliedAt) {
            return ''; // not applied
        }
        return cursor.clone().moveTo(this.appliedAt.pos) + input;
    }
    matches(input, lookBehind) {
        const startIndex = input.index;
        // remove any styling CSI before checking the char
        while (input.eatRe(CSI_STYLE_RE)) { }
        if (input.eof) {
            return 2 /* MatchResult.Buffer */;
        }
        if (input.eatChar(this._char)) {
            return 0 /* MatchResult.Success */;
        }
        if (lookBehind instanceof CharacterPrediction) {
            // see #112842
            const sillyZshOutcome = input.eatGradually(`\b${lookBehind._char}${this._char}`);
            if (sillyZshOutcome !== 1 /* MatchResult.Failure */) {
                return sillyZshOutcome;
            }
        }
        input.index = startIndex;
        return 1 /* MatchResult.Failure */;
    }
}
class BackspacePrediction {
    constructor(_terminal) {
        this._terminal = _terminal;
    }
    apply(_, cursor) {
        // at eol if everything to the right is whitespace (zsh will emit a "clear line" code in this case)
        // todo: can be optimized if `getTrimmedLength` is exposed from xterm
        const isLastChar = !cursor.getLine()?.translateToString(undefined, cursor.x).trim();
        const pos = cursor.coordinate;
        const move = cursor.shift(-1);
        const cell = cursor.getCell();
        this._appliedAt = cell
            ? { isLastChar, pos, oldAttributes: attributesToSeq(cell), oldChar: cell.getChars() }
            : { isLastChar, pos, oldAttributes: '', oldChar: '' };
        return move + "\u001B[X" /* VT.DeleteChar */;
    }
    rollback(cursor) {
        if (!this._appliedAt) {
            return ''; // not applied
        }
        const { oldAttributes, oldChar, pos } = this._appliedAt;
        if (!oldChar) {
            return cursor.moveTo(pos) + "\u001B[X" /* VT.DeleteChar */;
        }
        return oldAttributes + oldChar + cursor.moveTo(pos) + attributesToSeq(core(this._terminal)._inputHandler._curAttrData);
    }
    rollForwards() {
        return '';
    }
    matches(input) {
        if (this._appliedAt?.isLastChar) {
            const r1 = input.eatGradually(`\b${"\u001B[" /* VT.Csi */}K`);
            if (r1 !== 1 /* MatchResult.Failure */) {
                return r1;
            }
            const r2 = input.eatGradually(`\b \b`);
            if (r2 !== 1 /* MatchResult.Failure */) {
                return r2;
            }
        }
        return 1 /* MatchResult.Failure */;
    }
}
class NewlinePrediction {
    apply(_, cursor) {
        this._prevPosition = cursor.coordinate;
        cursor.move(0, cursor.y + 1);
        return '\r\n';
    }
    rollback(cursor) {
        return this._prevPosition ? cursor.moveTo(this._prevPosition) : '';
    }
    rollForwards() {
        return ''; // does not need to rewrite
    }
    matches(input) {
        return input.eatGradually('\r\n');
    }
}
/**
 * Prediction when the cursor reaches the end of the line. Similar to newline
 * prediction, but shells handle it slightly differently.
 */
class LinewrapPrediction extends NewlinePrediction {
    apply(_, cursor) {
        this._prevPosition = cursor.coordinate;
        cursor.move(0, cursor.y + 1);
        return ' \r';
    }
    matches(input) {
        // bash and zshell add a space which wraps in the terminal, then a CR
        const r = input.eatGradually(' \r');
        if (r !== 1 /* MatchResult.Failure */) {
            // zshell additionally adds a clear line after wrapping to be safe -- eat it
            const r2 = input.eatGradually("\u001B[K" /* VT.DeleteRestOfLine */);
            return r2 === 2 /* MatchResult.Buffer */ ? 2 /* MatchResult.Buffer */ : r;
        }
        return input.eatGradually('\r\n');
    }
}
class CursorMovePrediction {
    constructor(_direction, _moveByWords, _amount) {
        this._direction = _direction;
        this._moveByWords = _moveByWords;
        this._amount = _amount;
    }
    apply(buffer, cursor) {
        const prevPosition = cursor.x;
        const currentCell = cursor.getCell();
        const prevAttrs = currentCell ? attributesToSeq(currentCell) : '';
        const { _amount: amount, _direction: direction, _moveByWords: moveByWords } = this;
        const delta = direction === "D" /* CursorMoveDirection.Back */ ? -1 : 1;
        const target = cursor.clone();
        if (moveByWords) {
            for (let i = 0; i < amount; i++) {
                moveToWordBoundary(buffer, target, delta);
            }
        }
        else {
            target.shift(delta * amount);
        }
        this._applied = {
            amount: Math.abs(cursor.x - target.x),
            prevPosition,
            prevAttrs,
            rollForward: cursor.moveTo(target),
        };
        return this._applied.rollForward;
    }
    rollback(cursor) {
        if (!this._applied) {
            return '';
        }
        return cursor.move(this._applied.prevPosition, cursor.y) + this._applied.prevAttrs;
    }
    rollForwards() {
        return ''; // does not need to rewrite
    }
    matches(input) {
        if (!this._applied) {
            return 1 /* MatchResult.Failure */;
        }
        const direction = this._direction;
        const { amount, rollForward } = this._applied;
        // arg can be omitted to move one character. We don't eatGradually() here
        // or below moves that don't go as far as the cursor would be buffered
        // indefinitely
        if (input.eatStr(`${"\u001B[" /* VT.Csi */}${direction}`.repeat(amount))) {
            return 0 /* MatchResult.Success */;
        }
        // \b is the equivalent to moving one character back
        if (direction === "D" /* CursorMoveDirection.Back */) {
            if (input.eatStr(`\b`.repeat(amount))) {
                return 0 /* MatchResult.Success */;
            }
        }
        // check if the cursor position is set absolutely
        if (rollForward) {
            const r = input.eatGradually(rollForward);
            if (r !== 1 /* MatchResult.Failure */) {
                return r;
            }
        }
        // check for a relative move in the direction
        return input.eatGradually(`${"\u001B[" /* VT.Csi */}${amount}${direction}`);
    }
}
export class PredictionStats extends Disposable {
    /**
     * Gets the percent (0-1) of predictions that were accurate.
     */
    get accuracy() {
        let correctCount = 0;
        for (const [, correct] of this._stats) {
            if (correct) {
                correctCount++;
            }
        }
        return correctCount / (this._stats.length || 1);
    }
    /**
     * Gets the number of recorded stats.
     */
    get sampleSize() {
        return this._stats.length;
    }
    /**
     * Gets latency stats of successful predictions.
     */
    get latency() {
        const latencies = this._stats.filter(([, correct]) => correct).map(([s]) => s).sort();
        return {
            count: latencies.length,
            min: latencies[0],
            median: latencies[Math.floor(latencies.length / 2)],
            max: latencies[latencies.length - 1],
        };
    }
    /**
     * Gets the maximum observed latency.
     */
    get maxLatency() {
        let max = -Infinity;
        for (const [latency, correct] of this._stats) {
            if (correct) {
                max = Math.max(latency, max);
            }
        }
        return max;
    }
    constructor(timeline) {
        super();
        this._stats = [];
        this._index = 0;
        this._addedAtTime = new WeakMap();
        this._changeEmitter = new Emitter();
        this.onChange = this._changeEmitter.event;
        this._register(timeline.onPredictionAdded(p => this._addedAtTime.set(p, Date.now())));
        this._register(timeline.onPredictionSucceeded(this._pushStat.bind(this, true)));
        this._register(timeline.onPredictionFailed(this._pushStat.bind(this, false)));
    }
    _pushStat(correct, prediction) {
        const started = this._addedAtTime.get(prediction);
        this._stats[this._index] = [Date.now() - started, correct];
        this._index = (this._index + 1) % 24 /* StatsConstants.StatsBufferSize */;
        this._changeEmitter.fire();
    }
}
export class PredictionTimeline {
    get _currentGenerationPredictions() {
        return this._expected.filter(({ gen }) => gen === this._expected[0].gen).map(({ p }) => p);
    }
    get isShowingPredictions() {
        return this._showPredictions;
    }
    get length() {
        return this._expected.length;
    }
    constructor(terminal, _style) {
        this.terminal = terminal;
        this._style = _style;
        /**
         * Expected queue of events. Only predictions for the lowest are
         * written into the terminal.
         */
        this._expected = [];
        /**
         * Current prediction generation.
         */
        this._currentGen = 0;
        /**
         * Whether predictions are echoed to the terminal. If false, predictions
         * will still be computed internally for latency metrics, but input will
         * never be adjusted.
         */
        this._showPredictions = false;
        this._addedEmitter = new Emitter();
        this.onPredictionAdded = this._addedEmitter.event;
        this._failedEmitter = new Emitter();
        this.onPredictionFailed = this._failedEmitter.event;
        this._succeededEmitter = new Emitter();
        this.onPredictionSucceeded = this._succeededEmitter.event;
    }
    setShowPredictions(show) {
        if (show === this._showPredictions) {
            return;
        }
        // console.log('set predictions:', show);
        this._showPredictions = show;
        const buffer = this._getActiveBuffer();
        if (!buffer) {
            return;
        }
        const toApply = this._currentGenerationPredictions;
        if (show) {
            this.clearCursor();
            this._style.expectIncomingStyle(toApply.reduce((count, p) => p.affectsStyle ? count + 1 : count, 0));
            this.terminal.write(toApply.map(p => p.apply(buffer, this.physicalCursor(buffer))).join(''));
        }
        else {
            this.terminal.write(toApply.reverse().map(p => p.rollback(this.physicalCursor(buffer))).join(''));
        }
    }
    /**
     * Undoes any predictions written and resets expectations.
     */
    undoAllPredictions() {
        const buffer = this._getActiveBuffer();
        if (this._showPredictions && buffer) {
            this.terminal.write(this._currentGenerationPredictions.reverse()
                .map(p => p.rollback(this.physicalCursor(buffer))).join(''));
        }
        this._expected = [];
    }
    /**
     * Should be called when input is incoming to the temrinal.
     */
    beforeServerInput(input) {
        const originalInput = input;
        if (this._inputBuffer) {
            input = this._inputBuffer + input;
            this._inputBuffer = undefined;
        }
        if (!this._expected.length) {
            this._clearPredictionState();
            return input;
        }
        const buffer = this._getActiveBuffer();
        if (!buffer) {
            this._clearPredictionState();
            return input;
        }
        let output = '';
        const reader = new StringReader(input);
        const startingGen = this._expected[0].gen;
        const emitPredictionOmitted = () => {
            const omit = reader.eatRe(PREDICTION_OMIT_RE);
            if (omit) {
                output += omit[0];
            }
        };
        ReadLoop: while (this._expected.length && reader.remaining > 0) {
            emitPredictionOmitted();
            const { p: prediction, gen } = this._expected[0];
            const cursor = this.physicalCursor(buffer);
            const beforeTestReaderIndex = reader.index;
            switch (prediction.matches(reader, this._lookBehind)) {
                case 0 /* MatchResult.Success */: {
                    // if the input character matches what the next prediction expected, undo
                    // the prediction and write the real character out.
                    const eaten = input.slice(beforeTestReaderIndex, reader.index);
                    if (gen === startingGen) {
                        output += prediction.rollForwards?.(cursor, eaten);
                    }
                    else {
                        prediction.apply(buffer, this.physicalCursor(buffer)); // move cursor for additional apply
                        output += eaten;
                    }
                    this._succeededEmitter.fire(prediction);
                    this._lookBehind = prediction;
                    this._expected.shift();
                    break;
                }
                case 2 /* MatchResult.Buffer */:
                    // on a buffer, store the remaining data and completely read data
                    // to be output as normal.
                    this._inputBuffer = input.slice(beforeTestReaderIndex);
                    reader.index = input.length;
                    break ReadLoop;
                case 1 /* MatchResult.Failure */: {
                    // on a failure, roll back all remaining items in this generation
                    // and clear predictions, since they are no longer valid
                    const rollback = this._expected.filter(p => p.gen === startingGen).reverse();
                    output += rollback.map(({ p }) => p.rollback(this.physicalCursor(buffer))).join('');
                    if (rollback.some(r => r.p.affectsStyle)) {
                        // reading the current style should generally be safe, since predictions
                        // always restore the style if they modify it.
                        output += attributesToSeq(core(this.terminal)._inputHandler._curAttrData);
                    }
                    this._clearPredictionState();
                    this._failedEmitter.fire(prediction);
                    break ReadLoop;
                }
            }
        }
        emitPredictionOmitted();
        // Extra data (like the result of running a command) should cause us to
        // reset the cursor
        if (!reader.eof) {
            output += reader.rest;
            this._clearPredictionState();
        }
        // If we passed a generation boundary, apply the current generation's predictions
        if (this._expected.length && startingGen !== this._expected[0].gen) {
            for (const { p, gen } of this._expected) {
                if (gen !== this._expected[0].gen) {
                    break;
                }
                if (p.affectsStyle) {
                    this._style.expectIncomingStyle();
                }
                output += p.apply(buffer, this.physicalCursor(buffer));
            }
        }
        if (!this._showPredictions) {
            return originalInput;
        }
        if (output.length === 0 || output === input) {
            return output;
        }
        if (this._physicalCursor) {
            output += this._physicalCursor.moveInstruction();
        }
        // prevent cursor flickering while typing
        output = "\u001B[?25l" /* VT.HideCursor */ + output + "\u001B[?25h" /* VT.ShowCursor */;
        return output;
    }
    /**
     * Clears any expected predictions and stored state. Should be called when
     * the pty gives us something we don't recognize.
     */
    _clearPredictionState() {
        this._expected = [];
        this.clearCursor();
        this._lookBehind = undefined;
    }
    /**
     * Appends a typeahead prediction.
     */
    addPrediction(buffer, prediction) {
        this._expected.push({ gen: this._currentGen, p: prediction });
        this._addedEmitter.fire(prediction);
        if (this._currentGen !== this._expected[0].gen) {
            prediction.apply(buffer, this.tentativeCursor(buffer));
            return false;
        }
        const text = prediction.apply(buffer, this.physicalCursor(buffer));
        this._tenativeCursor = undefined; // next read will get or clone the physical cursor
        if (this._showPredictions && text) {
            if (prediction.affectsStyle) {
                this._style.expectIncomingStyle();
            }
            // console.log('predict:', JSON.stringify(text));
            this.terminal.write(text);
        }
        return true;
    }
    addBoundary(buffer, prediction) {
        let applied = false;
        if (buffer && prediction) {
            // We apply the prediction so that it's matched against, but wrapped
            // in a tentativeboundary so that it doesn't affect the physical cursor.
            // Then we apply it specifically to the tentative cursor.
            applied = this.addPrediction(buffer, new TentativeBoundary(prediction));
            prediction.apply(buffer, this.tentativeCursor(buffer));
        }
        this._currentGen++;
        return applied;
    }
    /**
     * Peeks the last prediction written.
     */
    peekEnd() {
        return this._expected[this._expected.length - 1]?.p;
    }
    /**
     * Peeks the first pending prediction.
     */
    peekStart() {
        return this._expected[0]?.p;
    }
    /**
     * Current position of the cursor in the terminal.
     */
    physicalCursor(buffer) {
        if (!this._physicalCursor) {
            if (this._showPredictions) {
                flushOutput(this.terminal);
            }
            this._physicalCursor = new Cursor(this.terminal.rows, this.terminal.cols, buffer);
        }
        return this._physicalCursor;
    }
    /**
     * Cursor position if all predictions and boundaries that have been inserted
     * so far turn out to be successfully predicted.
     */
    tentativeCursor(buffer) {
        if (!this._tenativeCursor) {
            this._tenativeCursor = this.physicalCursor(buffer).clone();
        }
        return this._tenativeCursor;
    }
    clearCursor() {
        this._physicalCursor = undefined;
        this._tenativeCursor = undefined;
    }
    _getActiveBuffer() {
        const buffer = this.terminal.buffer.active;
        return buffer.type === 'normal' ? buffer : undefined;
    }
}
/**
 * Gets the escape sequence args to restore state/appearance in the cell.
 */
const attributesToArgs = (cell) => {
    if (cell.isAttributeDefault()) {
        return [0];
    }
    const args = [];
    if (cell.isBold()) {
        args.push(1);
    }
    if (cell.isDim()) {
        args.push(2);
    }
    if (cell.isItalic()) {
        args.push(3);
    }
    if (cell.isUnderline()) {
        args.push(4);
    }
    if (cell.isBlink()) {
        args.push(5);
    }
    if (cell.isInverse()) {
        args.push(7);
    }
    if (cell.isInvisible()) {
        args.push(8);
    }
    if (cell.isFgRGB()) {
        args.push(38, 2, cell.getFgColor() >>> 24, (cell.getFgColor() >>> 16) & 0xFF, cell.getFgColor() & 0xFF);
    }
    if (cell.isFgPalette()) {
        args.push(38, 5, cell.getFgColor());
    }
    if (cell.isFgDefault()) {
        args.push(39);
    }
    if (cell.isBgRGB()) {
        args.push(48, 2, cell.getBgColor() >>> 24, (cell.getBgColor() >>> 16) & 0xFF, cell.getBgColor() & 0xFF);
    }
    if (cell.isBgPalette()) {
        args.push(48, 5, cell.getBgColor());
    }
    if (cell.isBgDefault()) {
        args.push(49);
    }
    return args;
};
/**
 * Gets the escape sequence to restore state/appearance in the cell.
 */
const attributesToSeq = (cell) => `${"\u001B[" /* VT.Csi */}${attributesToArgs(cell).join(';')}m`;
const arrayHasPrefixAt = (a, ai, b) => {
    if (a.length - ai > b.length) {
        return false;
    }
    for (let bi = 0; bi < b.length; bi++, ai++) {
        if (b[ai] !== a[ai]) {
            return false;
        }
    }
    return true;
};
/**
 * @see https://github.com/xtermjs/xterm.js/blob/065eb13a9d3145bea687239680ec9696d9112b8e/src/common/InputHandler.ts#L2127
 */
const getColorWidth = (params, pos) => {
    const accu = [0, 0, -1, 0, 0, 0];
    let cSpace = 0;
    let advance = 0;
    do {
        const v = params[pos + advance];
        accu[advance + cSpace] = typeof v === 'number' ? v : v[0];
        if (typeof v !== 'number') {
            let i = 0;
            do {
                if (accu[1] === 5) {
                    cSpace = 1;
                }
                accu[advance + i + 1 + cSpace] = v[i];
            } while (++i < v.length && i + advance + 1 + cSpace < accu.length);
            break;
        }
        // exit early if can decide color mode with semicolons
        if ((accu[1] === 5 && advance + cSpace >= 2)
            || (accu[1] === 2 && advance + cSpace >= 5)) {
            break;
        }
        // offset colorSpace slot for semicolon mode
        if (accu[1]) {
            cSpace = 1;
        }
    } while (++advance + pos < params.length && advance + cSpace < accu.length);
    return advance;
};
class TypeAheadStyle {
    static _compileArgs(args) {
        return `${"\u001B[" /* VT.Csi */}${args.join(';')}m`;
    }
    constructor(value, _terminal) {
        this._terminal = _terminal;
        /**
         * Number of typeahead style arguments we expect to read. If this is 0 and
         * we see a style coming in, we know that the PTY actually wanted to update.
         */
        this._expectedIncomingStyles = 0;
        this.onUpdate(value);
    }
    /**
     * Signals that a style was written to the terminal and we should watch
     * for it coming in.
     */
    expectIncomingStyle(n = 1) {
        this._expectedIncomingStyles += n * 2;
    }
    /**
     * Starts tracking for CSI changes in the terminal.
     */
    startTracking() {
        this._expectedIncomingStyles = 0;
        this._onDidWriteSGR(attributesToArgs(core(this._terminal)._inputHandler._curAttrData));
        this._csiHandler = this._terminal.parser.registerCsiHandler({ final: 'm' }, args => {
            this._onDidWriteSGR(args);
            return false;
        });
    }
    /**
     * Stops tracking terminal CSI changes.
     */
    debounceStopTracking() {
        this._stopTracking();
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this._stopTracking();
    }
    _stopTracking() {
        this._csiHandler?.dispose();
        this._csiHandler = undefined;
    }
    _onDidWriteSGR(args) {
        const originalUndo = this._undoArgs;
        for (let i = 0; i < args.length;) {
            const px = args[i];
            const p = typeof px === 'number' ? px : px[0];
            if (this._expectedIncomingStyles) {
                if (arrayHasPrefixAt(args, i, this._undoArgs)) {
                    this._expectedIncomingStyles--;
                    i += this._undoArgs.length;
                    continue;
                }
                if (arrayHasPrefixAt(args, i, this._applyArgs)) {
                    this._expectedIncomingStyles--;
                    i += this._applyArgs.length;
                    continue;
                }
            }
            const width = p === 38 || p === 48 || p === 58 ? getColorWidth(args, i) : 1;
            switch (this._applyArgs[0]) {
                case 1:
                    if (p === 2) {
                        this._undoArgs = [22, 2];
                    }
                    else if (p === 22 || p === 0) {
                        this._undoArgs = [22];
                    }
                    break;
                case 2:
                    if (p === 1) {
                        this._undoArgs = [22, 1];
                    }
                    else if (p === 22 || p === 0) {
                        this._undoArgs = [22];
                    }
                    break;
                case 38:
                    if (p === 0 || p === 39 || p === 100) {
                        this._undoArgs = [39];
                    }
                    else if ((p >= 30 && p <= 38) || (p >= 90 && p <= 97)) {
                        this._undoArgs = args.slice(i, i + width);
                    }
                    break;
                default:
                    if (p === this._applyArgs[0]) {
                        this._undoArgs = this._applyArgs;
                    }
                    else if (p === 0) {
                        this._undoArgs = this._originalUndoArgs;
                    }
                // no-op
            }
            i += width;
        }
        if (originalUndo !== this._undoArgs) {
            this.undo = TypeAheadStyle._compileArgs(this._undoArgs);
        }
    }
    /**
     * Updates the current typeahead style.
     */
    onUpdate(style) {
        const { applyArgs, undoArgs } = this._getArgs(style);
        this._applyArgs = applyArgs;
        this._undoArgs = this._originalUndoArgs = undoArgs;
        this.apply = TypeAheadStyle._compileArgs(this._applyArgs);
        this.undo = TypeAheadStyle._compileArgs(this._undoArgs);
    }
    _getArgs(style) {
        switch (style) {
            case 'bold':
                return { applyArgs: [1], undoArgs: [22] };
            case 'dim':
                return { applyArgs: [2], undoArgs: [22] };
            case 'italic':
                return { applyArgs: [3], undoArgs: [23] };
            case 'underlined':
                return { applyArgs: [4], undoArgs: [24] };
            case 'inverted':
                return { applyArgs: [7], undoArgs: [27] };
            default: {
                let color;
                try {
                    color = Color.fromHex(style);
                }
                catch {
                    color = new Color(new RGBA(255, 0, 0, 1));
                }
                const { r, g, b } = color.rgba;
                return { applyArgs: [38, 2, r, g, b], undoArgs: [39] };
            }
        }
    }
}
__decorate([
    debounce(2000)
], TypeAheadStyle.prototype, "debounceStopTracking", null);
const compileExcludeRegexp = (programs = DEFAULT_LOCAL_ECHO_EXCLUDE) => new RegExp(`\\b(${programs.map(escapeRegExpCharacters).join('|')})\\b`, 'i');
export var CharPredictState;
(function (CharPredictState) {
    /** No characters typed on this line yet */
    CharPredictState[CharPredictState["Unknown"] = 0] = "Unknown";
    /** Has a pending character prediction */
    CharPredictState[CharPredictState["HasPendingChar"] = 1] = "HasPendingChar";
    /** Character validated on this line */
    CharPredictState[CharPredictState["Validated"] = 2] = "Validated";
})(CharPredictState || (CharPredictState = {}));
let TypeAheadAddon = class TypeAheadAddon extends Disposable {
    constructor(_processManager, _configurationService, _telemetryService) {
        super();
        this._processManager = _processManager;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._typeaheadThreshold = this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoLatencyThreshold;
        this._excludeProgramRe = compileExcludeRegexp(this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoExcludePrograms);
        this._terminalTitle = '';
        this._register(toDisposable(() => this._clearPredictionDebounce?.dispose()));
    }
    activate(terminal) {
        const style = this._typeaheadStyle = this._register(new TypeAheadStyle(this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoStyle, terminal));
        const timeline = this._timeline = new PredictionTimeline(terminal, this._typeaheadStyle);
        const stats = this.stats = this._register(new PredictionStats(this._timeline));
        timeline.setShowPredictions(this._typeaheadThreshold === 0);
        this._register(terminal.onData(e => this._onUserData(e)));
        this._register(terminal.onTitleChange(title => {
            this._terminalTitle = title;
            this._reevaluatePredictorState(stats, timeline);
        }));
        this._register(terminal.onResize(() => {
            timeline.setShowPredictions(false);
            timeline.clearCursor();
            this._reevaluatePredictorState(stats, timeline);
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(TERMINAL_CONFIG_SECTION)) {
                style.onUpdate(this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoStyle);
                this._typeaheadThreshold = this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoLatencyThreshold;
                this._excludeProgramRe = compileExcludeRegexp(this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoExcludePrograms);
                this._reevaluatePredictorState(stats, timeline);
            }
        }));
        this._register(this._timeline.onPredictionSucceeded(p => {
            if (this._lastRow?.charState === 1 /* CharPredictState.HasPendingChar */ && isTenativeCharacterPrediction(p) && p.inner.appliedAt) {
                if (p.inner.appliedAt.pos.y + p.inner.appliedAt.pos.baseY === this._lastRow.y) {
                    this._lastRow.charState = 2 /* CharPredictState.Validated */;
                }
            }
        }));
        this._register(this._processManager.onBeforeProcessData(e => this._onBeforeProcessData(e)));
        let nextStatsSend;
        this._register(stats.onChange(() => {
            if (!nextStatsSend) {
                nextStatsSend = setTimeout(() => {
                    this._sendLatencyStats(stats);
                    nextStatsSend = undefined;
                }, 300000 /* StatsConstants.StatsSendTelemetryEvery */);
            }
            if (timeline.length === 0) {
                style.debounceStopTracking();
            }
            this._reevaluatePredictorState(stats, timeline);
        }));
    }
    reset() {
        this._lastRow = undefined;
    }
    _deferClearingPredictions() {
        if (!this.stats || !this._timeline) {
            return;
        }
        this._clearPredictionDebounce?.dispose();
        if (this._timeline.length === 0 || this._timeline.peekStart()?.clearAfterTimeout === false) {
            this._clearPredictionDebounce = undefined;
            return;
        }
        this._clearPredictionDebounce = disposableTimeout(() => {
            this._timeline?.undoAllPredictions();
            if (this._lastRow?.charState === 1 /* CharPredictState.HasPendingChar */) {
                this._lastRow.charState = 0 /* CharPredictState.Unknown */;
            }
        }, Math.max(500, this.stats.maxLatency * 3 / 2), this._store);
    }
    /**
     * Note on debounce:
     *
     * We want to toggle the state only when the user has a pause in their
     * typing. Otherwise, we could turn this on when the PTY sent data but the
     * terminal cursor is not updated, causes issues.
     */
    _reevaluatePredictorState(stats, timeline) {
        this._reevaluatePredictorStateNow(stats, timeline);
    }
    _reevaluatePredictorStateNow(stats, timeline) {
        if (this._excludeProgramRe.test(this._terminalTitle)) {
            timeline.setShowPredictions(false);
        }
        else if (this._typeaheadThreshold < 0) {
            timeline.setShowPredictions(false);
        }
        else if (this._typeaheadThreshold === 0) {
            timeline.setShowPredictions(true);
        }
        else if (stats.sampleSize > 5 /* StatsConstants.StatsMinSamplesToTurnOn */ && stats.accuracy > 0.3 /* StatsConstants.StatsMinAccuracyToTurnOn */) {
            const latency = stats.latency.median;
            if (latency >= this._typeaheadThreshold) {
                timeline.setShowPredictions(true);
            }
            else if (latency < this._typeaheadThreshold / 0.5 /* StatsConstants.StatsToggleOffThreshold */) {
                timeline.setShowPredictions(false);
            }
        }
    }
    _sendLatencyStats(stats) {
        /* __GDPR__
            "terminalLatencyStats" : {
                "owner": "Tyriar",
                "min" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "max" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "median" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "count" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "predictionAccuracy" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
            }
         */
        this._telemetryService.publicLog('terminalLatencyStats', {
            ...stats.latency,
            predictionAccuracy: stats.accuracy,
        });
    }
    _onUserData(data) {
        if (this._timeline?.terminal.buffer.active.type !== 'normal') {
            return;
        }
        // console.log('user data:', JSON.stringify(data));
        const terminal = this._timeline.terminal;
        const buffer = terminal.buffer.active;
        // Detect programs like git log/less that use the normal buffer but don't
        // take input by deafult (fixes #109541)
        if (buffer.cursorX === 1 && buffer.cursorY === terminal.rows - 1) {
            if (buffer.getLine(buffer.cursorY + buffer.baseY)?.getCell(0)?.getChars() === ':') {
                return;
            }
        }
        // the following code guards the terminal prompt to avoid being able to
        // arrow or backspace-into the prompt. Record the lowest X value at which
        // the user gave input, and mark all additions before that as tentative.
        const actualY = buffer.baseY + buffer.cursorY;
        if (actualY !== this._lastRow?.y) {
            this._lastRow = { y: actualY, startingX: buffer.cursorX, endingX: buffer.cursorX, charState: 0 /* CharPredictState.Unknown */ };
        }
        else {
            this._lastRow.startingX = Math.min(this._lastRow.startingX, buffer.cursorX);
            this._lastRow.endingX = Math.max(this._lastRow.endingX, this._timeline.physicalCursor(buffer).x);
        }
        const addLeftNavigating = (p) => this._timeline.tentativeCursor(buffer).x <= this._lastRow.startingX
            ? this._timeline.addBoundary(buffer, p)
            : this._timeline.addPrediction(buffer, p);
        const addRightNavigating = (p) => this._timeline.tentativeCursor(buffer).x >= this._lastRow.endingX - 1
            ? this._timeline.addBoundary(buffer, p)
            : this._timeline.addPrediction(buffer, p);
        /** @see https://github.com/xtermjs/xterm.js/blob/1913e9512c048e3cf56bb5f5df51bfff6899c184/src/common/input/Keyboard.ts */
        const reader = new StringReader(data);
        while (reader.remaining > 0) {
            if (reader.eatCharCode(127)) { // backspace
                const previous = this._timeline.peekEnd();
                if (previous && previous instanceof CharacterPrediction) {
                    this._timeline.addBoundary();
                }
                // backspace must be able to read the previously-written character in
                // the event that it needs to undo it
                if (this._timeline.isShowingPredictions) {
                    flushOutput(this._timeline.terminal);
                }
                if (this._timeline.tentativeCursor(buffer).x <= this._lastRow.startingX) {
                    this._timeline.addBoundary(buffer, new BackspacePrediction(this._timeline.terminal));
                }
                else {
                    // Backspace decrements our ability to go right.
                    this._lastRow.endingX--;
                    this._timeline.addPrediction(buffer, new BackspacePrediction(this._timeline.terminal));
                }
                continue;
            }
            if (reader.eatCharCode(32, 126)) { // alphanum
                const char = data[reader.index - 1];
                const prediction = new CharacterPrediction(this._typeaheadStyle, char);
                if (this._lastRow.charState === 0 /* CharPredictState.Unknown */) {
                    this._timeline.addBoundary(buffer, prediction);
                    this._lastRow.charState = 1 /* CharPredictState.HasPendingChar */;
                }
                else {
                    this._timeline.addPrediction(buffer, prediction);
                }
                if (this._timeline.tentativeCursor(buffer).x >= terminal.cols) {
                    this._timeline.addBoundary(buffer, new LinewrapPrediction());
                }
                continue;
            }
            const cursorMv = reader.eatRe(CSI_MOVE_RE);
            if (cursorMv) {
                const direction = cursorMv[3];
                const p = new CursorMovePrediction(direction, !!cursorMv[2], Number(cursorMv[1]) || 1);
                if (direction === "D" /* CursorMoveDirection.Back */) {
                    addLeftNavigating(p);
                }
                else {
                    addRightNavigating(p);
                }
                continue;
            }
            if (reader.eatStr(`${"\u001B" /* VT.Esc */}f`)) {
                addRightNavigating(new CursorMovePrediction("C" /* CursorMoveDirection.Forwards */, true, 1));
                continue;
            }
            if (reader.eatStr(`${"\u001B" /* VT.Esc */}b`)) {
                addLeftNavigating(new CursorMovePrediction("D" /* CursorMoveDirection.Back */, true, 1));
                continue;
            }
            if (reader.eatChar('\r') && buffer.cursorY < terminal.rows - 1) {
                this._timeline.addPrediction(buffer, new NewlinePrediction());
                continue;
            }
            // something else
            this._timeline.addBoundary(buffer, new HardBoundary());
            break;
        }
        if (this._timeline.length === 1) {
            this._deferClearingPredictions();
            this._typeaheadStyle.startTracking();
        }
    }
    _onBeforeProcessData(event) {
        if (!this._timeline) {
            return;
        }
        // console.log('incoming data:', JSON.stringify(event.data));
        event.data = this._timeline.beforeServerInput(event.data);
        // console.log('emitted data:', JSON.stringify(event.data));
        this._deferClearingPredictions();
    }
};
__decorate([
    debounce(100)
], TypeAheadAddon.prototype, "_reevaluatePredictorState", null);
TypeAheadAddon = __decorate([
    __param(1, IConfigurationService),
    __param(2, ITelemetryService)
], TypeAheadAddon);
export { TypeAheadAddon };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWRBZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi90eXBlQWhlYWQvYnJvd3Nlci90ZXJtaW5hbFR5cGVBaGVhZEFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRTFGLE9BQU8sRUFBb0QsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqSSxPQUFPLEVBQUUsMEJBQTBCLEVBQXdDLE1BQU0sNkNBQTZDLENBQUM7QUFFL0gsSUFBVyxFQU9WO0FBUEQsV0FBVyxFQUFFO0lBQ1osb0JBQVksQ0FBQTtJQUNaLHFCQUFhLENBQUE7SUFDYixnQ0FBd0IsQ0FBQTtJQUN4QixnQ0FBd0IsQ0FBQTtJQUN4Qiw2QkFBcUIsQ0FBQTtJQUNyQixtQ0FBMkIsQ0FBQTtBQUM1QixDQUFDLEVBUFUsRUFBRSxLQUFGLEVBQUUsUUFP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Q0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUFDLENBQUM7SUFDaEksSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUFDLENBQUM7SUFDaEUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFBQyxDQUFDO0lBRTFDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQUMsQ0FBQztJQUNoSSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1FBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQUMsQ0FBQztJQUNoRSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1FBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUFDLENBQUM7SUFFMUMsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQU0sZUFBZSxHQUFHLENBQUMsSUFBcUIsRUFBRSxFQUFFLENBQUMsR0FBRyxzQkFBTSxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBRW5HLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBSSxDQUFtQixFQUFFLEVBQVUsRUFBRSxDQUFtQixFQUFFLEVBQUU7SUFDcEYsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDOUIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsS0FBSyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNyQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQU0sYUFBYSxHQUFHLENBQUMsTUFBNkIsRUFBRSxHQUFXLEVBQUUsRUFBRTtJQUNwRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqQyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDZixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFFaEIsR0FBRyxDQUFDO1FBQ0gsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUQsSUFBSSxPQUFPLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDVixHQUFHLENBQUM7Z0JBQ0gsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25CLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBQ1osQ0FBQztnQkFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ25FLE1BQU07UUFDUCxDQUFDO1FBQ0Qsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxDQUFDO2VBQ3hDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDOUMsTUFBTTtRQUNQLENBQUM7UUFDRCw0Q0FBNEM7UUFDNUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNiLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDWixDQUFDO0lBQ0YsQ0FBQyxRQUFRLEVBQUUsT0FBTyxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxJQUFJLE9BQU8sR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtJQUU1RSxPQUFPLE9BQU8sQ0FBQztBQUNoQixDQUFDLENBQUM7QUFFRixNQUFNLGNBQWM7SUFDWCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQTJCO1FBQ3RELE9BQU8sR0FBRyxzQkFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUN0QyxDQUFDO0lBZUQsWUFBWSxLQUF3RCxFQUFtQixTQUFtQjtRQUFuQixjQUFTLEdBQVQsU0FBUyxDQUFVO1FBYjFHOzs7V0FHRztRQUNLLDRCQUF1QixHQUFHLENBQUMsQ0FBQztRQVVuQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxtQkFBbUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUN4QixJQUFJLENBQUMsdUJBQXVCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhO1FBQ1osSUFBSSxDQUFDLHVCQUF1QixHQUFHLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNsRixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFFSCxvQkFBb0I7UUFDbkIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVPLGFBQWE7UUFDcEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztJQUM5QixDQUFDO0lBRU8sY0FBYyxDQUFDLElBQTJCO1FBQ2pELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNsQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsTUFBTSxDQUFDLEdBQUcsT0FBTyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU5QyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQy9DLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO29CQUMvQixDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7b0JBQzNCLFNBQVM7Z0JBQ1YsQ0FBQztnQkFDRCxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7b0JBQ2hELElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO29CQUMvQixDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQzVCLFNBQVM7Z0JBQ1YsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVFLFFBQVEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM1QixLQUFLLENBQUM7b0JBQ0wsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ2IsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDMUIsQ0FBQzt5QkFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNoQyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3ZCLENBQUM7b0JBQ0QsTUFBTTtnQkFDUCxLQUFLLENBQUM7b0JBQ0wsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ2IsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDMUIsQ0FBQzt5QkFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNoQyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3ZCLENBQUM7b0JBQ0QsTUFBTTtnQkFDUCxLQUFLLEVBQUU7b0JBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUN0QyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3ZCLENBQUM7eUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQzt3QkFDekQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFhLENBQUM7b0JBQ3ZELENBQUM7b0JBQ0QsTUFBTTtnQkFDUDtvQkFDQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQzlCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztvQkFDbEMsQ0FBQzt5QkFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7b0JBQ3pDLENBQUM7Z0JBQ0YsUUFBUTtZQUNULENBQUM7WUFFRCxDQUFDLElBQUksS0FBSyxDQUFDO1FBQ1osQ0FBQztRQUVELElBQUksWUFBWSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxRQUFRLENBQUMsS0FBd0Q7UUFDaEUsTUFBTSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQztRQUNuRCxJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxJQUFJLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVPLFFBQVEsQ0FBQyxLQUF3RDtRQUN4RSxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxNQUFNO2dCQUNWLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzNDLEtBQUssS0FBSztnQkFDVCxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxLQUFLLFFBQVE7Z0JBQ1osT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsS0FBSyxZQUFZO2dCQUNoQixPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxLQUFLLFVBQVU7Z0JBQ2QsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDVCxJQUFJLEtBQVksQ0FBQztnQkFDakIsSUFBSSxDQUFDO29CQUNKLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM5QixDQUFDO2dCQUFDLE1BQU0sQ0FBQztvQkFDUixLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0MsQ0FBQztnQkFFRCxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUMvQixPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDeEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUEvR0E7SUFEQyxRQUFRLENBQUMsSUFBSSxDQUFDOzBEQUdkO0FBK0dGLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxRQUFRLEdBQUcsMEJBQTBCLEVBQUUsRUFBRSxDQUN0RSxJQUFJLE1BQU0sQ0FBQyxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztBQUU5RSxNQUFNLENBQU4sSUFBa0IsZ0JBT2pCO0FBUEQsV0FBa0IsZ0JBQWdCO0lBQ2pDLDJDQUEyQztJQUMzQyw2REFBTyxDQUFBO0lBQ1AseUNBQXlDO0lBQ3pDLDJFQUFjLENBQUE7SUFDZCx1Q0FBdUM7SUFDdkMsaUVBQVMsQ0FBQTtBQUNWLENBQUMsRUFQaUIsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQU9qQztBQUVNLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVO0lBYzdDLFlBQ1MsZUFBd0MsRUFDekIscUJBQTZELEVBQ2pFLGlCQUFxRDtRQUV4RSxLQUFLLEVBQUUsQ0FBQztRQUpBLG9CQUFlLEdBQWYsZUFBZSxDQUF5QjtRQUNSLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDaEQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQWZqRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFrQyx1QkFBdUIsQ0FBQyxDQUFDLHlCQUF5QixDQUFDO1FBQzlJLHNCQUFpQixHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQWtDLHVCQUF1QixDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUdqSyxtQkFBYyxHQUFHLEVBQUUsQ0FBQztRQWMzQixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQWtDLHVCQUF1QixDQUFDLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDaE0sTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDekYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRS9FLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzdDLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO1lBQzVCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDckMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0RSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBa0MsdUJBQXVCLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDN0gsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQWtDLHVCQUF1QixDQUFDLENBQUMseUJBQXlCLENBQUM7Z0JBQ25KLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFrQyx1QkFBdUIsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBQ3RLLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDakQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkQsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsNENBQW9DLElBQUksNkJBQTZCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDM0gsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDL0UsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLHFDQUE2QixDQUFDO2dCQUN0RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVGLElBQUksYUFBa0IsQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDcEIsYUFBYSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQy9CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDOUIsYUFBYSxHQUFHLFNBQVMsQ0FBQztnQkFDM0IsQ0FBQyxzREFBeUMsQ0FBQztZQUM1QyxDQUFDO1lBRUQsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzQixLQUFLLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUM5QixDQUFDO1lBRUQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztJQUMzQixDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLHdCQUF3QixFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3pDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEVBQUUsaUJBQWlCLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDNUYsSUFBSSxDQUFDLHdCQUF3QixHQUFHLFNBQVMsQ0FBQztZQUMxQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyx3QkFBd0IsR0FBRyxpQkFBaUIsQ0FDaEQsR0FBRyxFQUFFO1lBQ0osSUFBSSxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3JDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLDRDQUFvQyxFQUFFLENBQUM7Z0JBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxtQ0FBMkIsQ0FBQztZQUNwRCxDQUFDO1FBQ0YsQ0FBQyxFQUNELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUVPLHlCQUF5QixDQUFDLEtBQXNCLEVBQUUsUUFBNEI7UUFDdkYsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRVMsNEJBQTRCLENBQUMsS0FBc0IsRUFBRSxRQUE0QjtRQUMxRixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDdEQsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxRQUFRLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLG1CQUFtQixLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxDQUFDO2FBQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxpREFBeUMsSUFBSSxLQUFLLENBQUMsUUFBUSxvREFBMEMsRUFBRSxDQUFDO1lBQ2xJLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQ3JDLElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkMsQ0FBQztpQkFBTSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLG1EQUF5QyxFQUFFLENBQUM7Z0JBQ3hGLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxLQUFzQjtRQUMvQzs7Ozs7Ozs7O1dBU0c7UUFDSCxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLHNCQUFzQixFQUFFO1lBQ3hELEdBQUcsS0FBSyxDQUFDLE9BQU87WUFDaEIsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDbEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLFdBQVcsQ0FBQyxJQUFZO1FBQy9CLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUQsT0FBTztRQUNSLENBQUM7UUFFRCxtREFBbUQ7UUFFbkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7UUFDekMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFFdEMseUVBQXlFO1FBQ3pFLHdDQUF3QztRQUN4QyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUNuRixPQUFPO1lBQ1IsQ0FBQztRQUNGLENBQUM7UUFFRCx1RUFBdUU7UUFDdkUseUVBQXlFO1FBQ3pFLHdFQUF3RTtRQUN4RSxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDOUMsSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxTQUFTLGtDQUEwQixFQUFFLENBQUM7UUFDekgsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7UUFFRCxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBYyxFQUFFLEVBQUUsQ0FDNUMsSUFBSSxDQUFDLFNBQVUsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFTLENBQUMsU0FBUztZQUNwRSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVUsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxDQUFjLEVBQUUsRUFBRSxDQUM3QyxJQUFJLENBQUMsU0FBVSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVMsQ0FBQyxPQUFPLEdBQUcsQ0FBQztZQUN0RSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVUsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdDLDBIQUEwSDtRQUMxSCxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxPQUFPLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMxQyxJQUFJLFFBQVEsSUFBSSxRQUFRLFlBQVksbUJBQW1CLEVBQUUsQ0FBQztvQkFDekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDOUIsQ0FBQztnQkFFRCxxRUFBcUU7Z0JBQ3JFLHFDQUFxQztnQkFDckMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLENBQUM7b0JBQ3pDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0QyxDQUFDO2dCQUVELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ3pFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDdEYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGdEQUFnRDtvQkFDaEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN4RixDQUFDO2dCQUVELFNBQVM7WUFDVixDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVztnQkFDN0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLGVBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3hFLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLHFDQUE2QixFQUFFLENBQUM7b0JBQzFELElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztvQkFDL0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLDBDQUFrQyxDQUFDO2dCQUMzRCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO2dCQUVELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDL0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RCxDQUFDO2dCQUNELFNBQVM7WUFDVixDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMzQyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQXdCLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxHQUFHLElBQUksb0JBQW9CLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN2RixJQUFJLFNBQVMsdUNBQTZCLEVBQUUsQ0FBQztvQkFDNUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkIsQ0FBQztnQkFDRCxTQUFTO1lBQ1YsQ0FBQztZQUVELElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLHFCQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLGtCQUFrQixDQUFDLElBQUksb0JBQW9CLHlDQUErQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEYsU0FBUztZQUNWLENBQUM7WUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxxQkFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxpQkFBaUIsQ0FBQyxJQUFJLG9CQUFvQixxQ0FBMkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9FLFNBQVM7WUFDVixDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RCxTQUFTO1lBQ1YsQ0FBQztZQUVELGlCQUFpQjtZQUNqQixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELE1BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsZUFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN2QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQixDQUFDLEtBQThCO1FBQzFELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFFRCw2REFBNkQ7UUFDN0QsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRCw0REFBNEQ7UUFFNUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7SUFDbEMsQ0FBQztDQUNELENBQUE7QUF4S1U7SUFEVCxRQUFRLENBQUMsR0FBRyxDQUFDOytEQUdiO0FBOUdXLGNBQWM7SUFnQnhCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtHQWpCUCxjQUFjLENBb1IxQiJ9