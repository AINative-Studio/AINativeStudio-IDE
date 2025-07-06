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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SW5wdXRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9jYXBhYmlsaXRpZXMvY29tbWFuZERldGVjdGlvbi9wcm9tcHRJbnB1dE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBS3BFLElBQVcsZ0JBSVY7QUFKRCxXQUFXLGdCQUFnQjtJQUMxQiw2REFBVyxDQUFBO0lBQ1gseURBQVMsQ0FBQTtJQUNULDZEQUFXLENBQUE7QUFDWixDQUFDLEVBSlUsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUkxQjtBQTJETSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFZL0MsSUFBSSxLQUFLLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNuQyxJQUFJLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLElBQUksTUFBTSxLQUFLLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxT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