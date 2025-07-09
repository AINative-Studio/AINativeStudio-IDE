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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWRBZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvdHlwZUFoZWFkL2Jyb3dzZXIvdGVybWluYWxUeXBlQWhlYWRBZGRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUUxRixPQUFPLEVBQW9ELHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakksT0FBTyxFQUFFLDBCQUEwQixFQUF3QyxNQUFNLDZDQUE2QyxDQUFDO0FBRS9ILElBQVcsRUFPVjtBQVBELFdBQVcsRUFBRTtJQUNaLG9CQUFZLENBQUE7SUFDWixxQkFBYSxDQUFBO0lBQ2IsZ0NBQXdCLENBQUE7SUFDeEIsZ0NBQXdCLENBQUE7SUFDeEIsNkJBQXFCLENBQUE7SUFDckIsbUNBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQVBVLEVBQUUsS0FBRixFQUFFLFFB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LENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFBQyxDQUFDO0lBQ2hJLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7UUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFBQyxDQUFDO0lBQ2hFLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7UUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQUMsQ0FBQztJQUUxQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUFDLENBQUM7SUFDaEksSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUFDLENBQUM7SUFDaEUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFBQyxDQUFDO0lBRTFDLE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyxDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFNLGVBQWUsR0FBRyxDQUFDLElB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