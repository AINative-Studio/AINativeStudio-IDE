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
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ILogService, LogLevel } from '../../../../log/common/log.js';
import { throttle } from '../../../../../base/common/decorators.js';
var PromptInputState;
(function (PromptInputState) {
    PromptInputState[PromptInputState["Unknown"] = 0] = "Unknown";
    PromptInputState[PromptInputState["Input"] = 1] = "Input";
    PromptInputState[PromptInputState["Execute"] = 2] = "Execute";
})(PromptInputState || (PromptInputState = {}));
let PromptInputModel = class PromptInputModel extends Disposable {
    get value() { return this._value; }
    get prefix() { return this._value.substring(0, this._cursorIndex); }
    get suffix() { return this._value.substring(this._cursorIndex, this._ghostTextIndex === -1 ? undefined : this._ghostTextIndex); }
    get cursorIndex() { return this._cursorIndex; }
    get ghostTextIndex() { return this._ghostTextIndex; }
    constructor(_xterm, onCommandStart, onCommandStartChanged, onCommandExecuted, _logService) {
        super();
        this._xterm = _xterm;
        this._logService = _logService;
        this._state = 0 /* PromptInputState.Unknown */;
        this._commandStartX = 0;
        this._lastUserInput = '';
        this._value = '';
        this._cursorIndex = 0;
        this._ghostTextIndex = -1;
        this._onDidStartInput = this._register(new Emitter());
        this.onDidStartInput = this._onDidStartInput.event;
        this._onDidChangeInput = this._register(new Emitter());
        this.onDidChangeInput = this._onDidChangeInput.event;
        this._onDidFinishInput = this._register(new Emitter());
        this.onDidFinishInput = this._onDidFinishInput.event;
        this._onDidInterrupt = this._register(new Emitter());
        this.onDidInterrupt = this._onDidInterrupt.event;
        this._register(Event.any(this._xterm.onCursorMove, this._xterm.onData, this._xterm.onWriteParsed)(() => this._sync()));
        this._register(this._xterm.onData(e => this._handleUserInput(e)));
        this._register(onCommandStart(e => this._handleCommandStart(e)));
        this._register(onCommandStartChanged(() => this._handleCommandStartChanged()));
        this._register(onCommandExecuted(() => this._handleCommandExecuted()));
        this._register(this.onDidStartInput(() => this._logCombinedStringIfTrace('PromptInputModel#onDidStartInput')));
        this._register(this.onDidChangeInput(() => this._logCombinedStringIfTrace('PromptInputModel#onDidChangeInput')));
        this._register(this.onDidFinishInput(() => this._logCombinedStringIfTrace('PromptInputModel#onDidFinishInput')));
        this._register(this.onDidInterrupt(() => this._logCombinedStringIfTrace('PromptInputModel#onDidInterrupt')));
    }
    _logCombinedStringIfTrace(message) {
        // Only generate the combined string if trace
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace(message, this.getCombinedString());
        }
    }
    setShellType(shellType) {
        this._shellType = shellType;
    }
    setContinuationPrompt(value) {
        this._continuationPrompt = value;
        this._sync();
    }
    setLastPromptLine(value) {
        this._lastPromptLine = value;
        this._sync();
    }
    setConfidentCommandLine(value) {
        if (this._value !== value) {
            this._value = value;
            this._cursorIndex = -1;
            this._ghostTextIndex = -1;
            this._onDidChangeInput.fire(this._createStateObject());
        }
    }
    getCombinedString(emptyStringWhenEmpty) {
        const value = this._value.replaceAll('\n', '\u23CE');
        if (this._cursorIndex === -1) {
            return value;
        }
        let result = `${value.substring(0, this.cursorIndex)}|`;
        if (this.ghostTextIndex !== -1) {
            result += `${value.substring(this.cursorIndex, this.ghostTextIndex)}[`;
            result += `${value.substring(this.ghostTextIndex)}]`;
        }
        else {
            result += value.substring(this.cursorIndex);
        }
        if (result === '|' && emptyStringWhenEmpty) {
            return '';
        }
        return result;
    }
    serialize() {
        return {
            modelState: this._createStateObject(),
            commandStartX: this._commandStartX,
            lastPromptLine: this._lastPromptLine,
            continuationPrompt: this._continuationPrompt,
            lastUserInput: this._lastUserInput
        };
    }
    deserialize(serialized) {
        this._value = serialized.modelState.value;
        this._cursorIndex = serialized.modelState.cursorIndex;
        this._ghostTextIndex = serialized.modelState.ghostTextIndex;
        this._commandStartX = serialized.commandStartX;
        this._lastPromptLine = serialized.lastPromptLine;
        this._continuationPrompt = serialized.continuationPrompt;
        this._lastUserInput = serialized.lastUserInput;
    }
    _handleCommandStart(command) {
        if (this._state === 1 /* PromptInputState.Input */) {
            return;
        }
        this._state = 1 /* PromptInputState.Input */;
        this._commandStartMarker = command.marker;
        this._commandStartX = this._xterm.buffer.active.cursorX;
        this._value = '';
        this._cursorIndex = 0;
        this._onDidStartInput.fire(this._createStateObject());
        this._onDidChangeInput.fire(this._createStateObject());
        // Trigger a sync if prompt terminator is set as that could adjust the command start X
        if (this._lastPromptLine) {
            if (this._commandStartX !== this._lastPromptLine.length) {
                const line = this._xterm.buffer.active.getLine(this._commandStartMarker.line);
                if (line?.translateToString(true).startsWith(this._lastPromptLine)) {
                    this._commandStartX = this._lastPromptLine.length;
                    this._sync();
                }
            }
        }
    }
    _handleCommandStartChanged() {
        if (this._state !== 1 /* PromptInputState.Input */) {
            return;
        }
        this._commandStartX = this._xterm.buffer.active.cursorX;
        this._onDidChangeInput.fire(this._createStateObject());
        this._sync();
    }
    _handleCommandExecuted() {
        if (this._state === 2 /* PromptInputState.Execute */) {
            return;
        }
        this._cursorIndex = -1;
        // Remove any ghost text from the input if it exists on execute
        if (this._ghostTextIndex !== -1) {
            this._value = this._value.substring(0, this._ghostTextIndex);
            this._ghostTextIndex = -1;
        }
        const event = this._createStateObject();
        if (this._lastUserInput === '\u0003') {
            this._lastUserInput = '';
            this._onDidInterrupt.fire(event);
        }
        this._state = 2 /* PromptInputState.Execute */;
        this._onDidFinishInput.fire(event);
        this._onDidChangeInput.fire(event);
    }
    _sync() {
        try {
            this._doSync();
        }
        catch (e) {
            this._logService.error('Error while syncing prompt input model', e);
        }
    }
    _doSync() {
        if (this._state !== 1 /* PromptInputState.Input */) {
            return;
        }
        let commandStartY = this._commandStartMarker?.line;
        if (commandStartY === undefined) {
            return;
        }
        const buffer = this._xterm.buffer.active;
        let line = buffer.getLine(commandStartY);
        const absoluteCursorY = buffer.baseY + buffer.cursorY;
        let cursorIndex;
        let commandLine = line?.translateToString(true, this._commandStartX);
        if (this._shellType === "fish" /* PosixShellType.Fish */ && (!line || !commandLine)) {
            commandStartY += 1;
            line = buffer.getLine(commandStartY);
            if (line) {
                commandLine = line.translateToString(true);
                cursorIndex = absoluteCursorY === commandStartY ? buffer.cursorX : commandLine?.trimEnd().length;
            }
        }
        if (line === undefined || commandLine === undefined) {
            this._logService.trace(`PromptInputModel#_sync: no line`);
            return;
        }
        let value = commandLine;
        let ghostTextIndex = -1;
        if (cursorIndex === undefined) {
            if (absoluteCursorY === commandStartY) {
                cursorIndex = this._getRelativeCursorIndex(this._commandStartX, buffer, line);
            }
            else {
                cursorIndex = commandLine.trimEnd().length;
            }
        }
        // From command start line to cursor line
        for (let y = commandStartY + 1; y <= absoluteCursorY; y++) {
            const nextLine = buffer.getLine(y);
            const lineText = nextLine?.translateToString(true);
            if (lineText && nextLine) {
                // Check if the line wrapped without a new line (continuation) or
                // we're on the last line and the continuation prompt is not present, so we need to add the value
                if (nextLine.isWrapped || (absoluteCursorY === y && this._continuationPrompt && !this._lineContainsContinuationPrompt(lineText))) {
                    value += `${lineText}`;
                    const relativeCursorIndex = this._getRelativeCursorIndex(0, buffer, nextLine);
                    if (absoluteCursorY === y) {
                        cursorIndex += relativeCursorIndex;
                    }
                    else {
                        cursorIndex += lineText.length;
                    }
                }
                else if (this._shellType === "fish" /* PosixShellType.Fish */) {
                    if (value.endsWith('\\')) {
                        // Trim off the trailing backslash
                        value = value.substring(0, value.length - 1);
                        value += `${lineText.trim()}`;
                        cursorIndex += lineText.trim().length - 1;
                    }
                    else {
                        if (/^ {6,}/.test(lineText)) {
                            // Was likely a new line
                            value += `\n${lineText.trim()}`;
                            cursorIndex += lineText.trim().length + 1;
                        }
                        else {
                            value += lineText;
                            cursorIndex += lineText.length;
                        }
                    }
                }
                // Verify continuation prompt if we have it, if this line doesn't have it then the
                // user likely just pressed enter.
                else if (this._continuationPrompt === undefined || this._lineContainsContinuationPrompt(lineText)) {
                    const trimmedLineText = this._trimContinuationPrompt(lineText);
                    value += `\n${trimmedLineText}`;
                    if (absoluteCursorY === y) {
                        const continuationCellWidth = this._getContinuationPromptCellWidth(nextLine, lineText);
                        const relativeCursorIndex = this._getRelativeCursorIndex(continuationCellWidth, buffer, nextLine);
                        cursorIndex += relativeCursorIndex + 1;
                    }
                    else {
                        cursorIndex += trimmedLineText.length + 1;
                    }
                }
            }
        }
        // Below cursor line
        for (let y = absoluteCursorY + 1; y < buffer.baseY + this._xterm.rows; y++) {
            const belowCursorLine = buffer.getLine(y);
            const lineText = belowCursorLine?.translateToString(true);
            if (lineText && belowCursorLine) {
                if (this._shellType === "fish" /* PosixShellType.Fish */) {
                    value += `${lineText}`;
                }
                else if (this._continuationPrompt === undefined || this._lineContainsContinuationPrompt(lineText)) {
                    value += `\n${this._trimContinuationPrompt(lineText)}`;
                }
                else {
                    value += lineText;
                }
            }
            else {
                break;
            }
        }
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace(`PromptInputModel#_sync: ${this.getCombinedString()}`);
        }
        // Adjust trailing whitespace
        {
            let trailingWhitespace = this._value.length - this._value.trimEnd().length;
            // Handle backspace key
            if (this._lastUserInput === '\x7F') {
                this._lastUserInput = '';
                if (cursorIndex === this._cursorIndex - 1) {
                    // If trailing whitespace is being increased by removing a non-whitespace character
                    if (this._value.trimEnd().length > value.trimEnd().length && value.trimEnd().length <= cursorIndex) {
                        trailingWhitespace = Math.max((this._value.length - 1) - value.trimEnd().length, 0);
                    }
                    // Standard case; subtract from trailing whitespace
                    else {
                        trailingWhitespace = Math.max(trailingWhitespace - 1, 0);
                    }
                }
            }
            // Handle delete key
            if (this._lastUserInput === '\x1b[3~') {
                this._lastUserInput = '';
                if (cursorIndex === this._cursorIndex) {
                    trailingWhitespace = Math.max(trailingWhitespace - 1, 0);
                }
            }
            const valueLines = value.split('\n');
            const isMultiLine = valueLines.length > 1;
            const valueEndTrimmed = value.trimEnd();
            if (!isMultiLine) {
                // Adjust trimmed whitespace value based on cursor position
                if (valueEndTrimmed.length < value.length) {
                    // Handle space key
                    if (this._lastUserInput === ' ') {
                        this._lastUserInput = '';
                        if (cursorIndex > valueEndTrimmed.length && cursorIndex > this._cursorIndex) {
                            trailingWhitespace++;
                        }
                    }
                    trailingWhitespace = Math.max(cursorIndex - valueEndTrimmed.length, trailingWhitespace, 0);
                }
                // Handle case where a non-space character is inserted in the middle of trailing whitespace
                const charBeforeCursor = cursorIndex === 0 ? '' : value[cursorIndex - 1];
                if (trailingWhitespace > 0 && cursorIndex === this._cursorIndex + 1 && this._lastUserInput !== '' && charBeforeCursor !== ' ') {
                    trailingWhitespace = this._value.length - this._cursorIndex;
                }
            }
            if (isMultiLine) {
                valueLines[valueLines.length - 1] = valueLines.at(-1)?.trimEnd() ?? '';
                const continuationOffset = (valueLines.length - 1) * (this._continuationPrompt?.length ?? 0);
                trailingWhitespace = Math.max(0, cursorIndex - value.length - continuationOffset);
            }
            value = valueLines.map(e => e.trimEnd()).join('\n') + ' '.repeat(trailingWhitespace);
        }
        ghostTextIndex = this._scanForGhostText(buffer, line, cursorIndex);
        if (this._value !== value || this._cursorIndex !== cursorIndex || this._ghostTextIndex !== ghostTextIndex) {
            this._value = value;
            this._cursorIndex = cursorIndex;
            this._ghostTextIndex = ghostTextIndex;
            this._onDidChangeInput.fire(this._createStateObject());
        }
    }
    _handleUserInput(e) {
        this._lastUserInput = e;
    }
    /**
     * Detect ghost text by looking for italic or dim text in or after the cursor and
     * non-italic/dim text in the first non-whitespace cell following command start and before the cursor.
     */
    _scanForGhostText(buffer, line, cursorIndex) {
        if (!this.value.trim().length) {
            return -1;
        }
        // Check last non-whitespace character has non-ghost text styles
        let ghostTextIndex = -1;
        let proceedWithGhostTextCheck = false;
        let x = buffer.cursorX;
        while (x > 0) {
            const cell = line.getCell(--x);
            if (!cell) {
                break;
            }
            if (cell.getChars().trim().length > 0) {
                proceedWithGhostTextCheck = !this._isCellStyledLikeGhostText(cell);
                break;
            }
        }
        // Check to the end of the line for possible ghost text. For example pwsh's ghost text
        // can look like this `Get-|Ch[ildItem]`
        if (proceedWithGhostTextCheck) {
            let potentialGhostIndexOffset = 0;
            let x = buffer.cursorX;
            while (x < line.length) {
                const cell = line.getCell(x++);
                if (!cell || cell.getCode() === 0) {
                    break;
                }
                if (this._isCellStyledLikeGhostText(cell)) {
                    ghostTextIndex = cursorIndex + potentialGhostIndexOffset;
                    break;
                }
                potentialGhostIndexOffset += cell.getChars().length;
            }
        }
        // Ghost text may not be italic or dimmed, but will have a different style than the
        // rest of the line that precedes it.
        if (ghostTextIndex === -1) {
            ghostTextIndex = this._scanForGhostTextAdvanced(buffer, line, cursorIndex);
        }
        if (ghostTextIndex > -1 && this.value.substring(ghostTextIndex).endsWith(' ')) {
            this._value = this.value.trim();
            if (!this.value.substring(ghostTextIndex)) {
                ghostTextIndex = -1;
            }
        }
        return ghostTextIndex;
    }
    _scanForGhostTextAdvanced(buffer, line, cursorIndex) {
        let ghostTextIndex = -1;
        let currentPos = buffer.cursorX; // Start scanning from the cursor position
        // Map to store styles and their corresponding positions
        const styleMap = new Map();
        // Identify the last non-whitespace character in the line
        let lastNonWhitespaceCell = line.getCell(currentPos);
        let nextCell = lastNonWhitespaceCell;
        // Scan from the cursor position to the end of the line
        while (nextCell && currentPos < line.length) {
            const styleKey = this._getCellStyleAsString(nextCell);
            // Track all occurrences of each unique style in the line
            styleMap.set(styleKey, [...(styleMap.get(styleKey) ?? []), currentPos]);
            // Move to the next cell
            nextCell = line.getCell(++currentPos);
            // Update `lastNonWhitespaceCell` only if the new cell contains visible characters
            if (nextCell?.getChars().trim().length) {
                lastNonWhitespaceCell = nextCell;
            }
        }
        // If there's no valid last non-whitespace cell OR the first and last styles match (indicating no ghost text)
        if (!lastNonWhitespaceCell?.getChars().trim().length ||
            this._cellStylesMatch(line.getCell(this._commandStartX), lastNonWhitespaceCell)) {
            return -1;
        }
        // Retrieve the positions of all cells with the same style as `lastNonWhitespaceCell`
        const positionsWithGhostStyle = styleMap.get(this._getCellStyleAsString(lastNonWhitespaceCell));
        if (positionsWithGhostStyle) {
            // Ensure these positions are contiguous
            for (let i = 1; i < positionsWithGhostStyle.length; i++) {
                if (positionsWithGhostStyle[i] !== positionsWithGhostStyle[i - 1] + 1) {
                    // Discontinuous styles, so may be syntax highlighting vs ghost text
                    return -1;
                }
            }
            // Calculate the ghost text start index
            if (buffer.baseY + buffer.cursorY === this._commandStartMarker?.line) {
                ghostTextIndex = positionsWithGhostStyle[0] - this._commandStartX;
            }
            else {
                ghostTextIndex = positionsWithGhostStyle[0];
            }
        }
        // Ensure no earlier cells in the line match `lastNonWhitespaceCell`'s style,
        // which would indicate the text is not ghost text.
        if (ghostTextIndex !== -1) {
            for (let checkPos = buffer.cursorX; checkPos >= this._commandStartX; checkPos--) {
                const checkCell = line.getCell(checkPos);
                if (!checkCell?.getChars.length) {
                    continue;
                }
                if (checkCell && checkCell.getCode() !== 0 && this._cellStylesMatch(lastNonWhitespaceCell, checkCell)) {
                    return -1;
                }
            }
        }
        return ghostTextIndex >= cursorIndex ? ghostTextIndex : -1;
    }
    _getCellStyleAsString(cell) {
        return `${cell.getFgColor()}${cell.getBgColor()}${cell.isBold()}${cell.isItalic()}${cell.isDim()}${cell.isUnderline()}${cell.isBlink()}${cell.isInverse()}${cell.isInvisible()}${cell.isStrikethrough()}${cell.isOverline()}${cell.getFgColorMode()}${cell.getBgColorMode()}`;
    }
    _cellStylesMatch(a, b) {
        if (!a || !b) {
            return false;
        }
        return a.getFgColor() === b.getFgColor()
            && a.getBgColor() === b.getBgColor()
            && a.isBold() === b.isBold()
            && a.isItalic() === b.isItalic()
            && a.isDim() === b.isDim()
            && a.isUnderline() === b.isUnderline()
            && a.isBlink() === b.isBlink()
            && a.isInverse() === b.isInverse()
            && a.isInvisible() === b.isInvisible()
            && a.isStrikethrough() === b.isStrikethrough()
            && a.isOverline() === b.isOverline()
            && a?.getBgColorMode() === b?.getBgColorMode()
            && a?.getFgColorMode() === b?.getFgColorMode();
    }
    _trimContinuationPrompt(lineText) {
        if (this._lineContainsContinuationPrompt(lineText)) {
            lineText = lineText.substring(this._continuationPrompt.length);
        }
        return lineText;
    }
    _lineContainsContinuationPrompt(lineText) {
        return !!(this._continuationPrompt && lineText.startsWith(this._continuationPrompt.trimEnd()));
    }
    _getContinuationPromptCellWidth(line, lineText) {
        if (!this._continuationPrompt || !lineText.startsWith(this._continuationPrompt.trimEnd())) {
            return 0;
        }
        let buffer = '';
        let x = 0;
        let cell;
        while (buffer !== this._continuationPrompt) {
            cell = line.getCell(x++);
            if (!cell) {
                break;
            }
            buffer += cell.getChars();
        }
        return x;
    }
    _getRelativeCursorIndex(startCellX, buffer, line) {
        return line?.translateToString(true, startCellX, buffer.cursorX).length ?? 0;
    }
    _isCellStyledLikeGhostText(cell) {
        return !!(cell.isItalic() || cell.isDim());
    }
    _createStateObject() {
        return Object.freeze({
            value: this._value,
            prefix: this.prefix,
            suffix: this.suffix,
            cursorIndex: this._cursorIndex,
            ghostTextIndex: this._ghostTextIndex
        });
    }
};
__decorate([
    throttle(0)
], PromptInputModel.prototype, "_sync", null);
PromptInputModel = __decorate([
    __param(4, ILogService)
], PromptInputModel);
export { PromptInputModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SW5wdXRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2NvbW1hbmREZXRlY3Rpb24vcHJvbXB0SW5wdXRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUtwRSxJQUFXLGdCQUlWO0FBSkQsV0FBVyxnQkFBZ0I7SUFDMUIsNkRBQVcsQ0FBQTtJQUNYLHlEQUFTLENBQUE7SUFDVCw2REFBVyxDQUFBO0FBQ1osQ0FBQyxFQUpVLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFJMUI7QUEyRE0sSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBWS9DLElBQUksS0FBSyxLQUFLLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbkMsSUFBSSxNQUFNLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRSxJQUFJLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGVBQWUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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