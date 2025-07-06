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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MandatoryMutableDisposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../log/common/log.js';
import { PartialTerminalCommand, TerminalCommand } from './commandDetection/terminalCommand.js';
import { PromptInputModel } from './commandDetection/promptInputModel.js';
let CommandDetectionCapability = class CommandDetectionCapability extends Disposable {
    get promptInputModel() { return this._promptInputModel; }
    get hasRichCommandDetection() { return this._hasRichCommandDetection; }
    get commands() { return this._commands; }
    get executingCommand() { return this._currentCommand.command; }
    get executingCommandObject() {
        if (this._currentCommand.commandStartMarker) {
            // HACK: This does a lot more than the consumer of the API needs. It's also a little
            //       misleading since it's not promoting the current command yet.
            return this._currentCommand.promoteToFullCommand(this._cwd, undefined, this._handleCommandStartOptions?.ignoreCommandLine ?? false, undefined);
        }
        return undefined;
    }
    get executingCommandConfidence() {
        const casted = this._currentCommand;
        return 'commandLineConfidence' in casted ? casted.commandLineConfidence : undefined;
    }
    get currentCommand() {
        return this._currentCommand;
    }
    get cwd() { return this._cwd; }
    get promptTerminator() { return this._promptTerminator; }
    constructor(_terminal, _logService) {
        super();
        this._terminal = _terminal;
        this._logService = _logService;
        this.type = 2 /* TerminalCapability.CommandDetection */;
        this._commands = [];
        this._currentCommand = new PartialTerminalCommand(this._terminal);
        this._commandMarkers = [];
        this.__isCommandStorageDisabled = false;
        this._hasRichCommandDetection = false;
        this._onCommandStarted = this._register(new Emitter());
        this.onCommandStarted = this._onCommandStarted.event;
        this._onCommandStartChanged = this._register(new Emitter());
        this.onCommandStartChanged = this._onCommandStartChanged.event;
        this._onBeforeCommandFinished = this._register(new Emitter());
        this.onBeforeCommandFinished = this._onBeforeCommandFinished.event;
        this._onCommandFinished = this._register(new Emitter());
        this.onCommandFinished = this._onCommandFinished.event;
        this._onCommandExecuted = this._register(new Emitter());
        this.onCommandExecuted = this._onCommandExecuted.event;
        this._onCommandInvalidated = this._register(new Emitter());
        this.onCommandInvalidated = this._onCommandInvalidated.event;
        this._onCurrentCommandInvalidated = this._register(new Emitter());
        this.onCurrentCommandInvalidated = this._onCurrentCommandInvalidated.event;
        this._onSetRichCommandDetection = this._register(new Emitter());
        this.onSetRichCommandDetection = this._onSetRichCommandDetection.event;
        this._promptInputModel = this._register(new PromptInputModel(this._terminal, this.onCommandStarted, this.onCommandStartChanged, this.onCommandExecuted, this._logService));
        // Pull command line from the buffer if it was not set explicitly
        this._register(this.onCommandExecuted(command => {
            if (command.commandLineConfidence !== 'high') {
                // HACK: onCommandExecuted actually fired with PartialTerminalCommand
                const typedCommand = command;
                command.command = typedCommand.extractCommandLine();
                command.commandLineConfidence = 'low';
                // ITerminalCommand
                if ('getOutput' in typedCommand) {
                    if (
                    // Markers exist
                    typedCommand.promptStartMarker && typedCommand.marker && typedCommand.executedMarker &&
                        // Single line command
                        command.command.indexOf('\n') === -1 &&
                        // Start marker is not on the left-most column
                        typedCommand.startX !== undefined && typedCommand.startX > 0) {
                        command.commandLineConfidence = 'medium';
                    }
                }
                // PartialTerminalCommand
                else {
                    if (
                    // Markers exist
                    typedCommand.promptStartMarker && typedCommand.commandStartMarker && typedCommand.commandExecutedMarker &&
                        // Single line command
                        command.command.indexOf('\n') === -1 &&
                        // Start marker is not on the left-most column
                        typedCommand.commandStartX !== undefined && typedCommand.commandStartX > 0) {
                        command.commandLineConfidence = 'medium';
                    }
                }
            }
        }));
        // Set up platform-specific behaviors
        const that = this;
        this._ptyHeuristicsHooks = new class {
            get onCurrentCommandInvalidatedEmitter() { return that._onCurrentCommandInvalidated; }
            get onCommandStartedEmitter() { return that._onCommandStarted; }
            get onCommandExecutedEmitter() { return that._onCommandExecuted; }
            get dimensions() { return that._dimensions; }
            get isCommandStorageDisabled() { return that.__isCommandStorageDisabled; }
            get commandMarkers() { return that._commandMarkers; }
            set commandMarkers(value) { that._commandMarkers = value; }
            get clearCommandsInViewport() { return that._clearCommandsInViewport.bind(that); }
        };
        this._ptyHeuristics = this._register(new MandatoryMutableDisposable(new UnixPtyHeuristics(this._terminal, this, this._ptyHeuristicsHooks, this._logService)));
        this._dimensions = {
            cols: this._terminal.cols,
            rows: this._terminal.rows
        };
        this._register(this._terminal.onResize(e => this._handleResize(e)));
        this._register(this._terminal.onCursorMove(() => this._handleCursorMove()));
    }
    _handleResize(e) {
        this._ptyHeuristics.value.preHandleResize?.(e);
        this._dimensions.cols = e.cols;
        this._dimensions.rows = e.rows;
    }
    _handleCursorMove() {
        if (this._store.isDisposed) {
            return;
        }
        // Early versions of conpty do not have real support for an alt buffer, in addition certain
        // commands such as tsc watch will write to the top of the normal buffer. The following
        // checks when the cursor has moved while the normal buffer is empty and if it is above the
        // current command, all decorations within the viewport will be invalidated.
        //
        // This function is debounced so that the cursor is only checked when it is stable so
        // conpty's screen reprinting will not trigger decoration clearing.
        //
        // This is mostly a workaround for Windows but applies to all OS' because of the tsc watch
        // case.
        if (this._terminal.buffer.active === this._terminal.buffer.normal && this._currentCommand.commandStartMarker) {
            if (this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY < this._currentCommand.commandStartMarker.line) {
                this._clearCommandsInViewport();
                this._currentCommand.isInvalid = true;
                this._onCurrentCommandInvalidated.fire({ reason: "windows" /* CommandInvalidationReason.Windows */ });
            }
        }
    }
    _clearCommandsInViewport() {
        // Find the number of commands on the tail end of the array that are within the viewport
        let count = 0;
        for (let i = this._commands.length - 1; i >= 0; i--) {
            const line = this._commands[i].marker?.line;
            if (line && line < this._terminal.buffer.active.baseY) {
                break;
            }
            count++;
        }
        // Remove them
        if (count > 0) {
            this._onCommandInvalidated.fire(this._commands.splice(this._commands.length - count, count));
        }
    }
    setContinuationPrompt(value) {
        this._promptInputModel.setContinuationPrompt(value);
    }
    // TODO: Simplify this, can everything work off the last line?
    setPromptTerminator(promptTerminator, lastPromptLine) {
        this._logService.debug('CommandDetectionCapability#setPromptTerminator', promptTerminator);
        this._promptTerminator = promptTerminator;
        this._promptInputModel.setLastPromptLine(lastPromptLine);
    }
    setCwd(value) {
        this._cwd = value;
    }
    setIsWindowsPty(value) {
        if (value && !(this._ptyHeuristics.value instanceof WindowsPtyHeuristics)) {
            const that = this;
            this._ptyHeuristics.value = new WindowsPtyHeuristics(this._terminal, this, new class {
                get onCurrentCommandInvalidatedEmitter() { return that._onCurrentCommandInvalidated; }
                get onCommandStartedEmitter() { return that._onCommandStarted; }
                get onCommandExecutedEmitter() { return that._onCommandExecuted; }
                get dimensions() { return that._dimensions; }
                get isCommandStorageDisabled() { return that.__isCommandStorageDisabled; }
                get commandMarkers() { return that._commandMarkers; }
                set commandMarkers(value) { that._commandMarkers = value; }
                get clearCommandsInViewport() { return that._clearCommandsInViewport.bind(that); }
            }, this._logService);
        }
        else if (!value && !(this._ptyHeuristics.value instanceof UnixPtyHeuristics)) {
            this._ptyHeuristics.value = new UnixPtyHeuristics(this._terminal, this, this._ptyHeuristicsHooks, this._logService);
        }
    }
    setHasRichCommandDetection(value) {
        this._hasRichCommandDetection = value;
        this._onSetRichCommandDetection.fire(value);
    }
    setIsCommandStorageDisabled() {
        this.__isCommandStorageDisabled = true;
    }
    getCommandForLine(line) {
        // Handle the current partial command first, anything below it's prompt is considered part
        // of the current command
        if (this._currentCommand.promptStartMarker && line >= this._currentCommand.promptStartMarker?.line) {
            return this._currentCommand;
        }
        // No commands
        if (this._commands.length === 0) {
            return undefined;
        }
        // Line is before any registered commands
        if ((this._commands[0].promptStartMarker ?? this._commands[0].marker).line > line) {
            return undefined;
        }
        // Iterate backwards through commands to find the right one
        for (let i = this.commands.length - 1; i >= 0; i--) {
            if ((this.commands[i].promptStartMarker ?? this.commands[i].marker).line <= line) {
                return this.commands[i];
            }
        }
        return undefined;
    }
    getCwdForLine(line) {
        // Handle the current partial command first, anything below it's prompt is considered part
        // of the current command
        if (this._currentCommand.promptStartMarker && line >= this._currentCommand.promptStartMarker?.line) {
            return this._cwd;
        }
        const command = this.getCommandForLine(line);
        if (command && 'cwd' in command) {
            return command.cwd;
        }
        return undefined;
    }
    handlePromptStart(options) {
        // Adjust the last command's finished marker when needed. The standard position for the
        // finished marker `D` to appear is at the same position as the following prompt started
        // `A`.
        const lastCommand = this.commands.at(-1);
        if (lastCommand?.endMarker && lastCommand?.executedMarker && lastCommand.endMarker.line === lastCommand.executedMarker.line) {
            this._logService.debug('CommandDetectionCapability#handlePromptStart adjusted commandFinished', `${lastCommand.endMarker.line} -> ${lastCommand.executedMarker.line + 1}`);
            lastCommand.endMarker = cloneMarker(this._terminal, lastCommand.executedMarker, 1);
        }
        this._currentCommand.promptStartMarker = options?.marker || (lastCommand?.endMarker ? cloneMarker(this._terminal, lastCommand.endMarker) : this._terminal.registerMarker(0));
        this._logService.debug('CommandDetectionCapability#handlePromptStart', this._terminal.buffer.active.cursorX, this._currentCommand.promptStartMarker?.line);
    }
    handleContinuationStart() {
        this._currentCommand.currentContinuationMarker = this._terminal.registerMarker(0);
        this._logService.debug('CommandDetectionCapability#handleContinuationStart', this._currentCommand.currentContinuationMarker);
    }
    handleContinuationEnd() {
        if (!this._currentCommand.currentContinuationMarker) {
            this._logService.warn('CommandDetectionCapability#handleContinuationEnd Received continuation end without start');
            return;
        }
        if (!this._currentCommand.continuations) {
            this._currentCommand.continuations = [];
        }
        this._currentCommand.continuations.push({
            marker: this._currentCommand.currentContinuationMarker,
            end: this._terminal.buffer.active.cursorX
        });
        this._currentCommand.currentContinuationMarker = undefined;
        this._logService.debug('CommandDetectionCapability#handleContinuationEnd', this._currentCommand.continuations[this._currentCommand.continuations.length - 1]);
    }
    handleRightPromptStart() {
        this._currentCommand.commandRightPromptStartX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleRightPromptStart', this._currentCommand.commandRightPromptStartX);
    }
    handleRightPromptEnd() {
        this._currentCommand.commandRightPromptEndX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleRightPromptEnd', this._currentCommand.commandRightPromptEndX);
    }
    handleCommandStart(options) {
        this._handleCommandStartOptions = options;
        this._currentCommand.cwd = this._cwd;
        // Only update the column if the line has already been set
        this._currentCommand.commandStartMarker = options?.marker || this._currentCommand.commandStartMarker;
        if (this._currentCommand.commandStartMarker?.line === this._terminal.buffer.active.cursorY) {
            this._currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
            this._onCommandStartChanged.fire();
            this._logService.debug('CommandDetectionCapability#handleCommandStart', this._currentCommand.commandStartX, this._currentCommand.commandStartMarker?.line);
            return;
        }
        this._ptyHeuristics.value.handleCommandStart(options);
    }
    handleCommandExecuted(options) {
        this._ptyHeuristics.value.handleCommandExecuted(options);
        this._currentCommand.markExecutedTime();
    }
    handleCommandFinished(exitCode, options) {
        // Command executed may not have happened yet, if not handle it now so the expected events
        // properly propogate. This may cause the output to show up in the computed command line,
        // but the command line confidence will be low in the extension host for example and
        // therefore cannot be trusted anyway.
        if (!this._currentCommand.commandExecutedMarker) {
            this.handleCommandExecuted();
        }
        this._currentCommand.markFinishedTime();
        this._ptyHeuristics.value.preHandleCommandFinished?.();
        this._logService.debug('CommandDetectionCapability#handleCommandFinished', this._terminal.buffer.active.cursorX, options?.marker?.line, this._currentCommand.command, this._currentCommand);
        // HACK: Handle a special case on some versions of bash where identical commands get merged
        // in the output of `history`, this detects that case and sets the exit code to the last
        // command's exit code. This covered the majority of cases but will fail if the same command
        // runs with a different exit code, that will need a more robust fix where we send the
        // command ID and exit code over to the capability to adjust there.
        if (exitCode === undefined) {
            const lastCommand = this.commands.length > 0 ? this.commands[this.commands.length - 1] : undefined;
            if (this._currentCommand.command && this._currentCommand.command.length > 0 && lastCommand?.command === this._currentCommand.command) {
                exitCode = lastCommand.exitCode;
            }
        }
        if (this._currentCommand.commandStartMarker === undefined || !this._terminal.buffer.active) {
            return;
        }
        this._currentCommand.commandFinishedMarker = options?.marker || this._terminal.registerMarker(0);
        this._ptyHeuristics.value.postHandleCommandFinished?.();
        const newCommand = this._currentCommand.promoteToFullCommand(this._cwd, exitCode, this._handleCommandStartOptions?.ignoreCommandLine ?? false, options?.markProperties);
        if (newCommand) {
            this._commands.push(newCommand);
            this._onBeforeCommandFinished.fire(newCommand);
            if (!this._currentCommand.isInvalid) {
                this._logService.debug('CommandDetectionCapability#onCommandFinished', newCommand);
                this._onCommandFinished.fire(newCommand);
            }
        }
        this._currentCommand = new PartialTerminalCommand(this._terminal);
        this._handleCommandStartOptions = undefined;
    }
    setCommandLine(commandLine, isTrusted) {
        this._logService.debug('CommandDetectionCapability#setCommandLine', commandLine, isTrusted);
        this._currentCommand.command = commandLine;
        this._currentCommand.commandLineConfidence = 'high';
        this._currentCommand.isTrusted = isTrusted;
        if (isTrusted) {
            this._promptInputModel.setConfidentCommandLine(commandLine);
        }
    }
    serialize() {
        const commands = this.commands.map(e => e.serialize(this.__isCommandStorageDisabled));
        const partialCommand = this._currentCommand.serialize(this._cwd);
        if (partialCommand) {
            commands.push(partialCommand);
        }
        return {
            isWindowsPty: this._ptyHeuristics.value instanceof WindowsPtyHeuristics,
            hasRichCommandDetection: this._hasRichCommandDetection,
            commands,
            promptInputModel: this._promptInputModel.serialize(),
        };
    }
    deserialize(serialized) {
        if (serialized.isWindowsPty) {
            this.setIsWindowsPty(serialized.isWindowsPty);
        }
        if (serialized.hasRichCommandDetection) {
            this.setHasRichCommandDetection(serialized.hasRichCommandDetection);
        }
        const buffer = this._terminal.buffer.normal;
        for (const e of serialized.commands) {
            // Partial command
            if (!e.endLine) {
                // Check for invalid command
                const marker = e.startLine !== undefined ? this._terminal.registerMarker(e.startLine - (buffer.baseY + buffer.cursorY)) : undefined;
                if (!marker) {
                    continue;
                }
                this._currentCommand.commandStartMarker = e.startLine !== undefined ? this._terminal.registerMarker(e.startLine - (buffer.baseY + buffer.cursorY)) : undefined;
                this._currentCommand.commandStartX = e.startX;
                this._currentCommand.promptStartMarker = e.promptStartLine !== undefined ? this._terminal.registerMarker(e.promptStartLine - (buffer.baseY + buffer.cursorY)) : undefined;
                this._cwd = e.cwd;
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                this._onCommandStarted.fire({ marker });
                continue;
            }
            // Full command
            const newCommand = TerminalCommand.deserialize(this._terminal, e, this.__isCommandStorageDisabled);
            if (!newCommand) {
                continue;
            }
            this._commands.push(newCommand);
            this._logService.debug('CommandDetectionCapability#onCommandFinished', newCommand);
            this._onCommandFinished.fire(newCommand);
        }
        if (serialized.promptInputModel) {
            this._promptInputModel.deserialize(serialized.promptInputModel);
        }
    }
};
__decorate([
    debounce(500)
], CommandDetectionCapability.prototype, "_handleCursorMove", null);
CommandDetectionCapability = __decorate([
    __param(1, ILogService)
], CommandDetectionCapability);
export { CommandDetectionCapability };
/**
 * Non-Windows-specific behavior.
 */
class UnixPtyHeuristics extends Disposable {
    constructor(_terminal, _capability, _hooks, _logService) {
        super();
        this._terminal = _terminal;
        this._capability = _capability;
        this._hooks = _hooks;
        this._logService = _logService;
        this._register(_terminal.parser.registerCsiHandler({ final: 'J' }, params => {
            if (params.length >= 1 && (params[0] === 2 || params[0] === 3)) {
                _hooks.clearCommandsInViewport();
            }
            // We don't want to override xterm.js' default behavior, just augment it
            return false;
        }));
    }
    handleCommandStart(options) {
        const currentCommand = this._capability.currentCommand;
        currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
        currentCommand.commandStartMarker = options?.marker || this._terminal.registerMarker(0);
        // Clear executed as it must happen after command start
        currentCommand.commandExecutedMarker?.dispose();
        currentCommand.commandExecutedMarker = undefined;
        currentCommand.commandExecutedX = undefined;
        for (const m of this._hooks.commandMarkers) {
            m.dispose();
        }
        this._hooks.commandMarkers.length = 0;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._hooks.onCommandStartedEmitter.fire({ marker: options?.marker || currentCommand.commandStartMarker, markProperties: options?.markProperties });
        this._logService.debug('CommandDetectionCapability#handleCommandStart', currentCommand.commandStartX, currentCommand.commandStartMarker?.line);
    }
    handleCommandExecuted(options) {
        const currentCommand = this._capability.currentCommand;
        currentCommand.commandExecutedMarker = options?.marker || this._terminal.registerMarker(0);
        currentCommand.commandExecutedX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleCommandExecuted', currentCommand.commandExecutedX, currentCommand.commandExecutedMarker?.line);
        // Sanity check optional props
        if (!currentCommand.commandStartMarker || !currentCommand.commandExecutedMarker || currentCommand.commandStartX === undefined) {
            return;
        }
        // Calculate the command
        currentCommand.command = this._hooks.isCommandStorageDisabled ? '' : this._terminal.buffer.active.getLine(currentCommand.commandStartMarker.line)?.translateToString(true, currentCommand.commandStartX, currentCommand.commandRightPromptStartX).trim();
        let y = currentCommand.commandStartMarker.line + 1;
        const commandExecutedLine = currentCommand.commandExecutedMarker.line;
        for (; y < commandExecutedLine; y++) {
            const line = this._terminal.buffer.active.getLine(y);
            if (line) {
                const continuation = currentCommand.continuations?.find(e => e.marker.line === y);
                if (continuation) {
                    currentCommand.command += '\n';
                }
                const startColumn = continuation?.end ?? 0;
                currentCommand.command += line.translateToString(true, startColumn);
            }
        }
        if (y === commandExecutedLine) {
            currentCommand.command += this._terminal.buffer.active.getLine(commandExecutedLine)?.translateToString(true, undefined, currentCommand.commandExecutedX) || '';
        }
        this._hooks.onCommandExecutedEmitter.fire(currentCommand);
    }
}
var AdjustCommandStartMarkerConstants;
(function (AdjustCommandStartMarkerConstants) {
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["MaxCheckLineCount"] = 10] = "MaxCheckLineCount";
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["Interval"] = 20] = "Interval";
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["MaximumPollCount"] = 10] = "MaximumPollCount";
})(AdjustCommandStartMarkerConstants || (AdjustCommandStartMarkerConstants = {}));
/**
 * An object that integrated with and decorates the command detection capability to add heuristics
 * that adjust various markers to work better with Windows and ConPTY. This isn't depended upon the
 * frontend OS, or even the backend OS, but the `IsWindows` property which technically a non-Windows
 * client can emit (for example in tests).
 */
let WindowsPtyHeuristics = class WindowsPtyHeuristics extends Disposable {
    constructor(_terminal, _capability, _hooks, _logService) {
        super();
        this._terminal = _terminal;
        this._capability = _capability;
        this._hooks = _hooks;
        this._logService = _logService;
        this._onCursorMoveListener = this._register(new MutableDisposable());
        this._tryAdjustCommandStartMarkerScannedLineCount = 0;
        this._tryAdjustCommandStartMarkerPollCount = 0;
        this._register(_terminal.parser.registerCsiHandler({ final: 'J' }, params => {
            // Clear commands when the viewport is cleared
            if (params.length >= 1 && (params[0] === 2 || params[0] === 3)) {
                this._hooks.clearCommandsInViewport();
            }
            // We don't want to override xterm.js' default behavior, just augment it
            return false;
        }));
        this._register(this._capability.onBeforeCommandFinished(command => {
            // For older Windows backends we cannot listen to CSI J, instead we assume running clear
            // or cls will clear all commands in the viewport. This is not perfect but it's right
            // most of the time.
            if (command.command.trim().toLowerCase() === 'clear' || command.command.trim().toLowerCase() === 'cls') {
                this._tryAdjustCommandStartMarkerScheduler?.cancel();
                this._tryAdjustCommandStartMarkerScheduler = undefined;
                this._hooks.clearCommandsInViewport();
                this._capability.currentCommand.isInvalid = true;
                this._hooks.onCurrentCommandInvalidatedEmitter.fire({ reason: "windows" /* CommandInvalidationReason.Windows */ });
            }
        }));
    }
    preHandleResize(e) {
        // Resize behavior is different under conpty; instead of bringing parts of the scrollback
        // back into the viewport, new lines are inserted at the bottom (ie. the same behavior as if
        // there was no scrollback).
        //
        // On resize this workaround will wait for a conpty reprint to occur by waiting for the
        // cursor to move, it will then calculate the number of lines that the commands within the
        // viewport _may have_ shifted. After verifying the content of the current line is
        // incorrect, the line after shifting is checked and if that matches delete events are fired
        // on the xterm.js buffer to move the markers.
        //
        // While a bit hacky, this approach is quite safe and seems to work great at least for pwsh.
        const baseY = this._terminal.buffer.active.baseY;
        const rowsDifference = e.rows - this._hooks.dimensions.rows;
        // Only do when rows increase, do in the next frame as this needs to happen after
        // conpty reprints the screen
        if (rowsDifference > 0) {
            this._waitForCursorMove().then(() => {
                // Calculate the number of lines the content may have shifted, this will max out at
                // scrollback count since the standard behavior will be used then
                const potentialShiftedLineCount = Math.min(rowsDifference, baseY);
                // For each command within the viewport, assume commands are in the correct order
                for (let i = this._capability.commands.length - 1; i >= 0; i--) {
                    const command = this._capability.commands[i];
                    if (!command.marker || command.marker.line < baseY || command.commandStartLineContent === undefined) {
                        break;
                    }
                    const line = this._terminal.buffer.active.getLine(command.marker.line);
                    if (!line || line.translateToString(true) === command.commandStartLineContent) {
                        continue;
                    }
                    const shiftedY = command.marker.line - potentialShiftedLineCount;
                    const shiftedLine = this._terminal.buffer.active.getLine(shiftedY);
                    if (shiftedLine?.translateToString(true) !== command.commandStartLineContent) {
                        continue;
                    }
                    // HACK: xterm.js doesn't expose this by design as it's an internal core
                    // function an embedder could easily do damage with. Additionally, this
                    // can't really be upstreamed since the event relies on shell integration to
                    // verify the shifting is necessary.
                    this._terminal._core._bufferService.buffer.lines.onDeleteEmitter.fire({
                        index: this._terminal.buffer.active.baseY,
                        amount: potentialShiftedLineCount
                    });
                }
            });
        }
    }
    handleCommandStart() {
        this._capability.currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
        // On Windows track all cursor movements after the command start sequence
        this._hooks.commandMarkers.length = 0;
        const initialCommandStartMarker = this._capability.currentCommand.commandStartMarker = (this._capability.currentCommand.promptStartMarker
            ? cloneMarker(this._terminal, this._capability.currentCommand.promptStartMarker)
            : this._terminal.registerMarker(0));
        this._capability.currentCommand.commandStartX = 0;
        // DEBUG: Add a decoration for the original unadjusted command start position
        // if ('registerDecoration' in this._terminal) {
        // 	const d = (this._terminal as any).registerDecoration({
        // 		marker: this._capability.currentCommand.commandStartMarker,
        // 		x: this._capability.currentCommand.commandStartX
        // 	});
        // 	d?.onRender((e: HTMLElement) => {
        // 		e.textContent = 'b';
        // 		e.classList.add('xterm-sequence-decoration', 'top', 'right');
        // 		e.title = 'Initial command start position';
        // 	});
        // }
        // The command started sequence may be printed before the actual prompt is, for example a
        // multi-line prompt will typically look like this where D, A and B signify the command
        // finished, prompt started and command started sequences respectively:
        //
        //     D/my/cwdB
        //     > C
        //
        // Due to this, it's likely that this will be called before the line has been parsed.
        // Unfortunately, it is also the case that the actual command start data may not be parsed
        // by the end of the task either, so a microtask cannot be used.
        //
        // The strategy used is to begin polling and scanning downwards for up to the next 5 lines.
        // If it looks like a prompt is found, the command started location is adjusted. If the
        // command executed sequences comes in before polling is done, polling is canceled and the
        // final polling task is executed synchronously.
        this._tryAdjustCommandStartMarkerScannedLineCount = 0;
        this._tryAdjustCommandStartMarkerPollCount = 0;
        this._tryAdjustCommandStartMarkerScheduler = new RunOnceScheduler(() => this._tryAdjustCommandStartMarker(initialCommandStartMarker), 20 /* AdjustCommandStartMarkerConstants.Interval */);
        this._tryAdjustCommandStartMarkerScheduler.schedule();
        // TODO: Cache details about polling for the future - eg. if it always fails, stop bothering
    }
    _tryAdjustCommandStartMarker(start) {
        if (this._store.isDisposed) {
            return;
        }
        const buffer = this._terminal.buffer.active;
        let scannedLineCount = this._tryAdjustCommandStartMarkerScannedLineCount;
        while (scannedLineCount < 10 /* AdjustCommandStartMarkerConstants.MaxCheckLineCount */ && start.line + scannedLineCount < buffer.baseY + this._terminal.rows) {
            if (this._cursorOnNextLine()) {
                const prompt = this._getWindowsPrompt(start.line + scannedLineCount);
                if (prompt) {
                    const adjustedPrompt = typeof prompt === 'string' ? prompt : prompt.prompt;
                    this._capability.currentCommand.commandStartMarker = this._terminal.registerMarker(0);
                    if (typeof prompt === 'object' && prompt.likelySingleLine) {
                        this._logService.debug('CommandDetectionCapability#_tryAdjustCommandStartMarker adjusted promptStart', `${this._capability.currentCommand.promptStartMarker?.line} -> ${this._capability.currentCommand.commandStartMarker.line}`);
                        this._capability.currentCommand.promptStartMarker?.dispose();
                        this._capability.currentCommand.promptStartMarker = cloneMarker(this._terminal, this._capability.currentCommand.commandStartMarker);
                        // Adjust the last command if it's not in the same position as the following
                        // prompt start marker
                        const lastCommand = this._capability.commands.at(-1);
                        if (lastCommand && this._capability.currentCommand.commandStartMarker.line !== lastCommand.endMarker?.line) {
                            lastCommand.endMarker?.dispose();
                            lastCommand.endMarker = cloneMarker(this._terminal, this._capability.currentCommand.commandStartMarker);
                        }
                    }
                    // use the regex to set the position as it's possible input has occurred
                    this._capability.currentCommand.commandStartX = adjustedPrompt.length;
                    this._logService.debug('CommandDetectionCapability#_tryAdjustCommandStartMarker adjusted commandStart', `${start.line} -> ${this._capability.currentCommand.commandStartMarker.line}:${this._capability.currentCommand.commandStartX}`);
                    this._flushPendingHandleCommandStartTask();
                    return;
                }
            }
            scannedLineCount++;
        }
        if (scannedLineCount < 10 /* AdjustCommandStartMarkerConstants.MaxCheckLineCount */) {
            this._tryAdjustCommandStartMarkerScannedLineCount = scannedLineCount;
            if (++this._tryAdjustCommandStartMarkerPollCount < 10 /* AdjustCommandStartMarkerConstants.MaximumPollCount */) {
                this._tryAdjustCommandStartMarkerScheduler?.schedule();
            }
            else {
                this._flushPendingHandleCommandStartTask();
            }
        }
        else {
            this._flushPendingHandleCommandStartTask();
        }
    }
    _flushPendingHandleCommandStartTask() {
        // Perform final try adjust if necessary
        if (this._tryAdjustCommandStartMarkerScheduler) {
            // Max out poll count to ensure it's the last run
            this._tryAdjustCommandStartMarkerPollCount = 10 /* AdjustCommandStartMarkerConstants.MaximumPollCount */;
            this._tryAdjustCommandStartMarkerScheduler.flush();
            this._tryAdjustCommandStartMarkerScheduler = undefined;
        }
        if (!this._capability.currentCommand.commandExecutedMarker) {
            this._onCursorMoveListener.value = this._terminal.onCursorMove(() => {
                if (this._hooks.commandMarkers.length === 0 || this._hooks.commandMarkers[this._hooks.commandMarkers.length - 1].line !== this._terminal.buffer.active.cursorY) {
                    const marker = this._terminal.registerMarker(0);
                    if (marker) {
                        this._hooks.commandMarkers.push(marker);
                    }
                }
            });
        }
        if (this._capability.currentCommand.commandStartMarker) {
            const line = this._terminal.buffer.active.getLine(this._capability.currentCommand.commandStartMarker.line);
            if (line) {
                this._capability.currentCommand.commandStartLineContent = line.translateToString(true);
            }
        }
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._hooks.onCommandStartedEmitter.fire({ marker: this._capability.currentCommand.commandStartMarker });
        this._logService.debug('CommandDetectionCapability#_handleCommandStartWindows', this._capability.currentCommand.commandStartX, this._capability.currentCommand.commandStartMarker?.line);
    }
    handleCommandExecuted(options) {
        if (this._tryAdjustCommandStartMarkerScheduler) {
            this._flushPendingHandleCommandStartTask();
        }
        // Use the gathered cursor move markers to correct the command start and executed markers
        this._onCursorMoveListener.clear();
        this._evaluateCommandMarkers();
        this._capability.currentCommand.commandExecutedX = this._terminal.buffer.active.cursorX;
        this._hooks.onCommandExecutedEmitter.fire(this._capability.currentCommand);
        this._logService.debug('CommandDetectionCapability#handleCommandExecuted', this._capability.currentCommand.commandExecutedX, this._capability.currentCommand.commandExecutedMarker?.line);
    }
    preHandleCommandFinished() {
        if (this._capability.currentCommand.commandExecutedMarker) {
            return;
        }
        // This is done on command finished just in case command executed never happens (for example
        // PSReadLine tab completion)
        if (this._hooks.commandMarkers.length === 0) {
            // If the command start timeout doesn't happen before command finished, just use the
            // current marker.
            if (!this._capability.currentCommand.commandStartMarker) {
                this._capability.currentCommand.commandStartMarker = this._terminal.registerMarker(0);
            }
            if (this._capability.currentCommand.commandStartMarker) {
                this._hooks.commandMarkers.push(this._capability.currentCommand.commandStartMarker);
            }
        }
        this._evaluateCommandMarkers();
    }
    postHandleCommandFinished() {
        const currentCommand = this._capability.currentCommand;
        const commandText = currentCommand.command;
        const commandLine = currentCommand.commandStartMarker?.line;
        const executedLine = currentCommand.commandExecutedMarker?.line;
        if (!commandText || commandText.length === 0 ||
            commandLine === undefined || commandLine === -1 ||
            executedLine === undefined || executedLine === -1) {
            return;
        }
        // Scan downwards from the command start line and search for every character in the actual
        // command line. This may end up matching the wrong characters, but it shouldn't matter at
        // least in the typical case as the entire command will still get matched.
        let current = 0;
        let found = false;
        for (let i = commandLine; i <= executedLine; i++) {
            const line = this._terminal.buffer.active.getLine(i);
            if (!line) {
                break;
            }
            const text = line.translateToString(true);
            for (let j = 0; j < text.length; j++) {
                // Skip whitespace in case it was not actually rendered or could be trimmed from the
                // end of the line
                while (commandText.length < current && commandText[current] === ' ') {
                    current++;
                }
                // Character match
                if (text[j] === commandText[current]) {
                    current++;
                }
                // Full command match
                if (current === commandText.length) {
                    // It's ambiguous whether the command executed marker should ideally appear at
                    // the end of the line or at the beginning of the next line. Since it's more
                    // useful for extracting the command at the end of the current line we go with
                    // that.
                    const wrapsToNextLine = j >= this._terminal.cols - 1;
                    currentCommand.commandExecutedMarker = this._terminal.registerMarker(i - (this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY) + (wrapsToNextLine ? 1 : 0));
                    currentCommand.commandExecutedX = wrapsToNextLine ? 0 : j + 1;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
    }
    _evaluateCommandMarkers() {
        // On Windows, use the gathered cursor move markers to correct the command start and
        // executed markers.
        if (this._hooks.commandMarkers.length === 0) {
            return;
        }
        this._hooks.commandMarkers = this._hooks.commandMarkers.sort((a, b) => a.line - b.line);
        this._capability.currentCommand.commandStartMarker = this._hooks.commandMarkers[0];
        if (this._capability.currentCommand.commandStartMarker) {
            const line = this._terminal.buffer.active.getLine(this._capability.currentCommand.commandStartMarker.line);
            if (line) {
                this._capability.currentCommand.commandStartLineContent = line.translateToString(true);
            }
        }
        this._capability.currentCommand.commandExecutedMarker = this._hooks.commandMarkers[this._hooks.commandMarkers.length - 1];
        // Fire this now to prevent issues like #197409
        this._hooks.onCommandExecutedEmitter.fire(this._capability.currentCommand);
    }
    _cursorOnNextLine() {
        const lastCommand = this._capability.commands.at(-1);
        // There is only a single command, so this check is unnecessary
        if (!lastCommand) {
            return true;
        }
        const cursorYAbsolute = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY;
        // If the cursor position is within the last command, we should poll.
        const lastCommandYAbsolute = (lastCommand.endMarker ? lastCommand.endMarker.line : lastCommand.marker?.line) ?? -1;
        return cursorYAbsolute > lastCommandYAbsolute;
    }
    _waitForCursorMove() {
        const cursorX = this._terminal.buffer.active.cursorX;
        const cursorY = this._terminal.buffer.active.cursorY;
        let totalDelay = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (cursorX !== this._terminal.buffer.active.cursorX || cursorY !== this._terminal.buffer.active.cursorY) {
                    resolve();
                    clearInterval(interval);
                    return;
                }
                totalDelay += 10;
                if (totalDelay > 1000) {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });
    }
    _getWindowsPrompt(y = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY) {
        const line = this._terminal.buffer.active.getLine(y);
        if (!line) {
            return;
        }
        const lineText = line.translateToString(true);
        if (!lineText) {
            return;
        }
        // PowerShell
        const pwshPrompt = lineText.match(/(?<prompt>(\(.+\)\s)?(?:PS.+>\s?))/)?.groups?.prompt;
        if (pwshPrompt) {
            const adjustedPrompt = this._adjustPrompt(pwshPrompt, lineText, '>');
            if (adjustedPrompt) {
                return {
                    prompt: adjustedPrompt,
                    likelySingleLine: true
                };
            }
        }
        // Custom prompts like starship end in the common \u276f character
        const customPrompt = lineText.match(/.*\u276f(?=[^\u276f]*$)/g)?.[0];
        if (customPrompt) {
            const adjustedPrompt = this._adjustPrompt(customPrompt, lineText, '\u276f');
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Bash Prompt
        const bashPrompt = lineText.match(/^(?<prompt>\$)/)?.groups?.prompt;
        if (bashPrompt) {
            const adjustedPrompt = this._adjustPrompt(bashPrompt, lineText, '$');
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Python Prompt
        const pythonPrompt = lineText.match(/^(?<prompt>>>> )/g)?.groups?.prompt;
        if (pythonPrompt) {
            return {
                prompt: pythonPrompt,
                likelySingleLine: true
            };
        }
        // Dynamic prompt detection
        if (this._capability.promptTerminator && lineText.trim().endsWith(this._capability.promptTerminator)) {
            const adjustedPrompt = this._adjustPrompt(lineText, lineText, this._capability.promptTerminator);
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Command Prompt
        const cmdMatch = lineText.match(/^(?<prompt>(\(.+\)\s)?(?:[A-Z]:\\.*>))/);
        return cmdMatch?.groups?.prompt ? {
            prompt: cmdMatch.groups.prompt,
            likelySingleLine: true
        } : undefined;
    }
    _adjustPrompt(prompt, lineText, char) {
        if (!prompt) {
            return;
        }
        // Conpty may not 'render' the space at the end of the prompt
        if (lineText === prompt && prompt.endsWith(char)) {
            prompt += ' ';
        }
        return prompt;
    }
};
WindowsPtyHeuristics = __decorate([
    __param(3, ILogService)
], WindowsPtyHeuristics);
export function getLinesForCommand(buffer, command, cols, outputMatcher) {
    if (!outputMatcher) {
        return undefined;
    }
    const executedMarker = command.executedMarker;
    const endMarker = command.endMarker;
    if (!executedMarker || !endMarker) {
        return undefined;
    }
    const startLine = executedMarker.line;
    const endLine = endMarker.line;
    const linesToCheck = outputMatcher.length;
    const lines = [];
    if (outputMatcher.anchor === 'bottom') {
        for (let i = endLine - (outputMatcher.offset || 0); i >= startLine; i--) {
            let wrappedLineStart = i;
            const wrappedLineEnd = i;
            while (wrappedLineStart >= startLine && buffer.getLine(wrappedLineStart)?.isWrapped) {
                wrappedLineStart--;
            }
            i = wrappedLineStart;
            lines.unshift(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, cols));
            if (lines.length > linesToCheck) {
                lines.pop();
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
            lines.push(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, cols));
            if (lines.length === linesToCheck) {
                lines.shift();
            }
        }
    }
    return lines;
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
function cloneMarker(xterm, marker, offset = 0) {
    return xterm.registerMarker(marker.line - (xterm.buffer.active.baseY + xterm.buffer.active.cursorY) + offset);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2NvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUd6RCxPQUFPLEVBQTBCLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3hILE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSx3Q0FBd0MsQ0FBQztBQVEzRixJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFJekQsSUFBSSxnQkFBZ0IsS0FBd0IsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBVzVFLElBQUksdUJBQXVCLEtBQUssT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO0lBS3ZFLElBQUksUUFBUSxLQUFpQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLElBQUksZ0JBQWdCLEtBQXlCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lB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