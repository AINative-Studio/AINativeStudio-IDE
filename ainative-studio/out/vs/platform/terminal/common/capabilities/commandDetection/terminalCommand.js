/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TerminalCommand {
    get command() { return this._properties.command; }
    get commandLineConfidence() { return this._properties.commandLineConfidence; }
    get isTrusted() { return this._properties.isTrusted; }
    get timestamp() { return this._properties.timestamp; }
    get duration() { return this._properties.duration; }
    get promptStartMarker() { return this._properties.promptStartMarker; }
    get marker() { return this._properties.marker; }
    get endMarker() { return this._properties.endMarker; }
    set endMarker(value) { this._properties.endMarker = value; }
    get executedMarker() { return this._properties.executedMarker; }
    get aliases() { return this._properties.aliases; }
    get wasReplayed() { return this._properties.wasReplayed; }
    get cwd() { return this._properties.cwd; }
    get exitCode() { return this._properties.exitCode; }
    get commandStartLineContent() { return this._properties.commandStartLineContent; }
    get markProperties() { return this._properties.markProperties; }
    get executedX() { return this._properties.executedX; }
    get startX() { return this._properties.startX; }
    constructor(_xterm, _properties) {
        this._xterm = _xterm;
        this._properties = _properties;
    }
    static deserialize(xterm, serialized, isCommandStorageDisabled) {
        const buffer = xterm.buffer.normal;
        const marker = serialized.startLine !== undefined ? xterm.registerMarker(serialized.startLine - (buffer.baseY + buffer.cursorY)) : undefined;
        // Check for invalid command
        if (!marker) {
            return undefined;
        }
        const promptStartMarker = serialized.promptStartLine !== undefined ? xterm.registerMarker(serialized.promptStartLine - (buffer.baseY + buffer.cursorY)) : undefined;
        // Valid full command
        const endMarker = serialized.endLine !== undefined ? xterm.registerMarker(serialized.endLine - (buffer.baseY + buffer.cursorY)) : undefined;
        const executedMarker = serialized.executedLine !== undefined ? xterm.registerMarker(serialized.executedLine - (buffer.baseY + buffer.cursorY)) : undefined;
        const newCommand = new TerminalCommand(xterm, {
            command: isCommandStorageDisabled ? '' : serialized.command,
            commandLineConfidence: serialized.commandLineConfidence ?? 'low',
            isTrusted: serialized.isTrusted,
            promptStartMarker,
            marker,
            startX: serialized.startX,
            endMarker,
            executedMarker,
            executedX: serialized.executedX,
            timestamp: serialized.timestamp,
            duration: serialized.duration,
            cwd: serialized.cwd,
            commandStartLineContent: serialized.commandStartLineContent,
            exitCode: serialized.exitCode,
            markProperties: serialized.markProperties,
            aliases: undefined,
            wasReplayed: true
        });
        return newCommand;
    }
    serialize(isCommandStorageDisabled) {
        return {
            promptStartLine: this.promptStartMarker?.line,
            startLine: this.marker?.line,
            startX: undefined,
            endLine: this.endMarker?.line,
            executedLine: this.executedMarker?.line,
            executedX: this.executedX,
            command: isCommandStorageDisabled ? '' : this.command,
            commandLineConfidence: isCommandStorageDisabled ? 'low' : this.commandLineConfidence,
            isTrusted: this.isTrusted,
            cwd: this.cwd,
            exitCode: this.exitCode,
            commandStartLineContent: this.commandStartLineContent,
            timestamp: this.timestamp,
            duration: this.duration,
            markProperties: this.markProperties,
        };
    }
    extractCommandLine() {
        return extractCommandLine(this._xterm.buffer.active, this._xterm.cols, this.marker, this.startX, this.executedMarker, this.executedX);
    }
    getOutput() {
        if (!this.executedMarker || !this.endMarker) {
            return undefined;
        }
        const startLine = this.executedMarker.line;
        const endLine = this.endMarker.line;
        if (startLine === endLine) {
            return undefined;
        }
        let output = '';
        let line;
        for (let i = startLine; i < endLine; i++) {
            line = this._xterm.buffer.active.getLine(i);
            if (!line) {
                continue;
            }
            output += line.translateToString(!line.isWrapped) + (line.isWrapped ? '' : '\n');
        }
        return output === '' ? undefined : output;
    }
    getOutputMatch(outputMatcher) {
        // TODO: Add back this check? this._ptyHeuristics.value instanceof WindowsPtyHeuristics && (executedMarker?.line === endMarker?.line) ? this._currentCommand.commandStartMarker : executedMarker
        if (!this.executedMarker || !this.endMarker) {
            return undefined;
        }
        const endLine = this.endMarker.line;
        if (endLine === -1) {
            return undefined;
        }
        const buffer = this._xterm.buffer.active;
        const startLine = Math.max(this.executedMarker.line, 0);
        const matcher = outputMatcher.lineMatcher;
        const linesToCheck = typeof matcher === 'string' ? 1 : outputMatcher.length || countNewLines(matcher);
        const lines = [];
        let match;
        if (outputMatcher.anchor === 'bottom') {
            for (let i = endLine - (outputMatcher.offset || 0); i >= startLine; i--) {
                let wrappedLineStart = i;
                const wrappedLineEnd = i;
                while (wrappedLineStart >= startLine && buffer.getLine(wrappedLineStart)?.isWrapped) {
                    wrappedLineStart--;
                }
                i = wrappedLineStart;
                lines.unshift(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, this._xterm.cols));
                if (!match) {
                    match = lines[0].match(matcher);
                }
                if (lines.length >= linesToCheck) {
                    break;
                }
            }
        }
        else {
            for (let i = startLine + (outputMatcher.offset || 0); i < endLine; i++) {
                const wrappedLineStart = i;
                let wrappedLineEnd = i;
                while (wrappedLineEnd + 1 < endLine && buffer.getLine(wrappedLineEnd + 1)?.isWrapped) {
                    wrappedLineEnd++;
                }
                i = wrappedLineEnd;
                lines.push(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, this._xterm.cols));
                if (!match) {
                    match = lines[lines.length - 1].match(matcher);
                }
                if (lines.length >= linesToCheck) {
                    break;
                }
            }
        }
        return match ? { regexMatch: match, outputLines: lines } : undefined;
    }
    hasOutput() {
        return (!this.executedMarker?.isDisposed &&
            !this.endMarker?.isDisposed &&
            !!(this.executedMarker &&
                this.endMarker &&
                this.executedMarker.line < this.endMarker.line));
    }
    getPromptRowCount() {
        return getPromptRowCount(this, this._xterm.buffer.active);
    }
    getCommandRowCount() {
        return getCommandRowCount(this);
    }
}
export class PartialTerminalCommand {
    constructor(_xterm) {
        this._xterm = _xterm;
    }
    serialize(cwd) {
        if (!this.commandStartMarker) {
            return undefined;
        }
        return {
            promptStartLine: this.promptStartMarker?.line,
            startLine: this.commandStartMarker.line,
            startX: this.commandStartX,
            endLine: undefined,
            executedLine: undefined,
            executedX: undefined,
            command: '',
            commandLineConfidence: 'low',
            isTrusted: true,
            cwd,
            exitCode: undefined,
            commandStartLineContent: undefined,
            timestamp: 0,
            duration: 0,
            markProperties: undefined
        };
    }
    promoteToFullCommand(cwd, exitCode, ignoreCommandLine, markProperties) {
        // When the command finishes and executed never fires the placeholder selector should be used.
        if (exitCode === undefined && this.command === undefined) {
            this.command = '';
        }
        if ((this.command !== undefined && !this.command.startsWith('\\')) || ignoreCommandLine) {
            return new TerminalCommand(this._xterm, {
                command: ignoreCommandLine ? '' : (this.command || ''),
                commandLineConfidence: ignoreCommandLine ? 'low' : (this.commandLineConfidence || 'low'),
                isTrusted: !!this.isTrusted,
                promptStartMarker: this.promptStartMarker,
                marker: this.commandStartMarker,
                startX: this.commandStartX,
                endMarker: this.commandFinishedMarker,
                executedMarker: this.commandExecutedMarker,
                executedX: this.commandExecutedX,
                timestamp: Date.now(),
                duration: this.commandDuration || 0,
                cwd,
                exitCode,
                commandStartLineContent: this.commandStartLineContent,
                markProperties
            });
        }
        return undefined;
    }
    markExecutedTime() {
        if (this.commandExecutedTimestamp === undefined) {
            this.commandExecutedTimestamp = Date.now();
        }
    }
    markFinishedTime() {
        if (this.commandDuration === undefined && this.commandExecutedTimestamp !== undefined) {
            this.commandDuration = Date.now() - this.commandExecutedTimestamp;
        }
    }
    extractCommandLine() {
        return extractCommandLine(this._xterm.buffer.active, this._xterm.cols, this.commandStartMarker, this.commandStartX, this.commandExecutedMarker, this.commandExecutedX);
    }
    getPromptRowCount() {
        return getPromptRowCount(this, this._xterm.buffer.active);
    }
    getCommandRowCount() {
        return getCommandRowCount(this);
    }
}
function extractCommandLine(buffer, cols, commandStartMarker, commandStartX, commandExecutedMarker, commandExecutedX) {
    if (!commandStartMarker || !commandExecutedMarker || commandStartX === undefined || commandExecutedX === undefined) {
        return '';
    }
    let content = '';
    for (let i = commandStartMarker.line; i <= commandExecutedMarker.line; i++) {
        const line = buffer.getLine(i);
        if (line) {
            content += line.translateToString(true, i === commandStartMarker.line ? commandStartX : 0, i === commandExecutedMarker.line ? commandExecutedX : cols);
        }
    }
    return content;
}
function getXtermLineContent(buffer, lineStart, lineEnd, cols) {
    // Cap the maximum number of lines generated to prevent potential performance problems. This is
    // more of a sanity check as the wrapped line should already be trimmed down at this point.
    const maxLineLength = Math.max(2048 / cols * 2);
    lineEnd = Math.min(lineEnd, lineStart + maxLineLength);
    let content = '';
    for (let i = lineStart; i <= lineEnd; i++) {
        // Make sure only 0 to cols are considered as resizing when windows mode is enabled will
        // retain buffer data outside of the terminal width as reflow is disabled.
        const line = buffer.getLine(i);
        if (line) {
            content += line.translateToString(true, 0, cols);
        }
    }
    return content;
}
function countNewLines(regex) {
    if (!regex.multiline) {
        return 1;
    }
    const source = regex.source;
    let count = 1;
    let i = source.indexOf('\\n');
    while (i !== -1) {
        count++;
        i = source.indexOf('\\n', i + 1);
    }
    return count;
}
function getPromptRowCount(command, buffer) {
    const marker = 'hasOutput' in command ? command.marker : command.commandStartMarker;
    if (!marker || !command.promptStartMarker) {
        return 1;
    }
    let promptRowCount = 1;
    let promptStartLine = command.promptStartMarker.line;
    // Trim any leading whitespace-only lines to retain vertical space
    while (promptStartLine < marker.line && (buffer.getLine(promptStartLine)?.translateToString(true) ?? '').length === 0) {
        promptStartLine++;
    }
    promptRowCount = marker.line - promptStartLine + 1;
    return promptRowCount;
}
function getCommandRowCount(command) {
    const marker = 'hasOutput' in command ? command.marker : command.commandStartMarker;
    const executedMarker = 'hasOutput' in command ? command.executedMarker : command.commandExecutedMarker;
    if (!marker || !executedMarker) {
        return 1;
    }
    const commandExecutedLine = Math.max(executedMarker.line, marker.line);
    let commandRowCount = commandExecutedLine - marker.line + 1;
    // Trim the last line if the cursor X is in the left-most cell
    const executedX = 'hasOutput' in command ? command.executedX : command.commandExecutedX;
    if (executedX === 0) {
        commandRowCount--;
    }
    return commandRowCount;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9jYXBhYmlsaXRpZXMvY29tbWFuZERldGVjdGlvbi90ZXJtaW5hbENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUEyQmhHLE1BQU0sT0FBTyxlQUFlO0lBRTNCLElBQUksT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2xELElBQUkscUJBQXFCLEtBQUssT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztJQUM5RSxJQUFJLFNBQVMsS0FBSyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUN0RCxJQUFJLFNBQVMsS0FBSyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUN0RCxJQUFJLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNwRCxJQUFJLGlCQUFpQixLQUFLLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7SUFDdEUsSUFBSSxNQUFNLEtBQUssT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDaEQsSUFBSSxTQUFTLEtBQUssT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsSUFBSSxTQUFTLENBQUMsS0FBK0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3RGLElBQUks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