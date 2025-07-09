/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { TerminalCapabilityStore } from '../capabilities/terminalCapabilityStore.js';
import { CommandDetectionCapability } from '../capabilities/commandDetectionCapability.js';
import { CwdDetectionCapability } from '../capabilities/cwdDetectionCapability.js';
import { PartialCommandDetectionCapability } from '../capabilities/partialCommandDetectionCapability.js';
import { Emitter } from '../../../../base/common/event.js';
import { BufferMarkCapability } from '../capabilities/bufferMarkCapability.js';
import { URI } from '../../../../base/common/uri.js';
import { sanitizeCwd } from '../terminalEnvironment.js';
import { removeAnsiEscapeCodesFromPrompt } from '../../../../base/common/strings.js';
import { ShellEnvDetectionCapability } from '../capabilities/shellEnvDetectionCapability.js';
/**
 * Shell integration is a feature that enhances the terminal's understanding of what's happening
 * in the shell by injecting special sequences into the shell's prompt using the "Set Text
 * Parameters" sequence (`OSC Ps ; Pt ST`).
 *
 * Definitions:
 * - OSC: `\x1b]`
 * - Ps:  A single (usually optional) numeric parameter, composed of one or more digits.
 * - Pt:  A text parameter composed of printable characters.
 * - ST: `\x7`
 *
 * This is inspired by a feature of the same name in the FinalTerm, iTerm2 and kitty terminals.
 */
/**
 * The identifier for the first numeric parameter (`Ps`) for OSC commands used by shell integration.
 */
export var ShellIntegrationOscPs;
(function (ShellIntegrationOscPs) {
    /**
     * Sequences pioneered by FinalTerm.
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["FinalTerm"] = 133] = "FinalTerm";
    /**
     * Sequences pioneered by VS Code. The number is derived from the least significant digit of
     * "VSC" when encoded in hex ("VSC" = 0x56, 0x53, 0x43).
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["VSCode"] = 633] = "VSCode";
    /**
     * Sequences pioneered by iTerm.
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["ITerm"] = 1337] = "ITerm";
    ShellIntegrationOscPs[ShellIntegrationOscPs["SetCwd"] = 7] = "SetCwd";
    ShellIntegrationOscPs[ShellIntegrationOscPs["SetWindowsFriendlyCwd"] = 9] = "SetWindowsFriendlyCwd";
})(ShellIntegrationOscPs || (ShellIntegrationOscPs = {}));
/**
 * Sequences pioneered by FinalTerm.
 */
var FinalTermOscPt;
(function (FinalTermOscPt) {
    /**
     * The start of the prompt, this is expected to always appear at the start of a line.
     *
     * Format: `OSC 133 ; A ST`
     */
    FinalTermOscPt["PromptStart"] = "A";
    /**
     * The start of a command, ie. where the user inputs their command.
     *
     * Format: `OSC 133 ; B ST`
     */
    FinalTermOscPt["CommandStart"] = "B";
    /**
     * Sent just before the command output begins.
     *
     * Format: `OSC 133 ; C ST`
     */
    FinalTermOscPt["CommandExecuted"] = "C";
    /**
     * Sent just after a command has finished. The exit code is optional, when not specified it
     * means no command was run (ie. enter on empty prompt or ctrl+c).
     *
     * Format: `OSC 133 ; D [; <ExitCode>] ST`
     */
    FinalTermOscPt["CommandFinished"] = "D";
})(FinalTermOscPt || (FinalTermOscPt = {}));
/**
 * VS Code-specific shell integration sequences. Some of these are based on more common alternatives
 * like those pioneered in {@link FinalTermOscPt FinalTerm}. The decision to move to entirely custom
 * sequences was to try to improve reliability and prevent the possibility of applications confusing
 * the terminal. If multiple shell integration scripts run, VS Code will prioritize the VS
 * Code-specific ones.
 *
 * It's recommended that authors of shell integration scripts use the common sequences (`133`)
 * when building general purpose scripts and the VS Code-specific (`633`) when targeting only VS
 * Code or when there are no other alternatives (eg. {@link CommandLine `633 ; E`}). These sequences
 * support mix-and-matching.
 */
var VSCodeOscPt;
(function (VSCodeOscPt) {
    /**
     * The start of the prompt, this is expected to always appear at the start of a line.
     *
     * Format: `OSC 633 ; A ST`
     *
     * Based on {@link FinalTermOscPt.PromptStart}.
     */
    VSCodeOscPt["PromptStart"] = "A";
    /**
     * The start of a command, ie. where the user inputs their command.
     *
     * Format: `OSC 633 ; B ST`
     *
     * Based on  {@link FinalTermOscPt.CommandStart}.
     */
    VSCodeOscPt["CommandStart"] = "B";
    /**
     * Sent just before the command output begins.
     *
     * Format: `OSC 633 ; C ST`
     *
     * Based on {@link FinalTermOscPt.CommandExecuted}.
     */
    VSCodeOscPt["CommandExecuted"] = "C";
    /**
     * Sent just after a command has finished. This should generally be used on the new line
     * following the end of a command's output, just before {@link PromptStart}. The exit code is
     * optional, when not specified it means no command was run (ie. enter on empty prompt or
     * ctrl+c).
     *
     * Format: `OSC 633 ; D [; <ExitCode>] ST`
     *
     * Based on {@link FinalTermOscPt.CommandFinished}.
     */
    VSCodeOscPt["CommandFinished"] = "D";
    /**
     * Explicitly set the command line. This helps workaround performance and reliability problems
     * with parsing out the command, such as conpty not guaranteeing the position of the sequence or
     * the shell not guaranteeing that the entire command is even visible. Ideally this is called
     * immediately before {@link CommandExecuted}, immediately before {@link CommandFinished} will
     * also work but that means terminal will only know the accurate command line when the command is
     * finished.
     *
     * The command line can escape ascii characters using the `\xAB` format, where AB are the
     * hexadecimal representation of the character code (case insensitive), and escape the `\`
     * character using `\\`. It's required to escape semi-colon (`0x3b`) and characters 0x20 and
     * below, this is particularly important for new line and semi-colon.
     *
     * Some examples:
     *
     * ```
     * "\"  -> "\\"
     * "\n" -> "\x0a"
     * ";"  -> "\x3b"
     * ```
     *
     * An optional nonce can be provided which is may be required by the terminal in order enable
     * some features. This helps ensure no malicious command injection has occurred.
     *
     * Format: `OSC 633 ; E [; <CommandLine> [; <Nonce>]] ST`
     */
    VSCodeOscPt["CommandLine"] = "E";
    /**
     * Similar to prompt start but for line continuations.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["ContinuationStart"] = "F";
    /**
     * Similar to command start but for line continuations.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["ContinuationEnd"] = "G";
    /**
     * The start of the right prompt.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["RightPromptStart"] = "H";
    /**
     * The end of the right prompt.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["RightPromptEnd"] = "I";
    /**
     * Set the value of an arbitrary property, only known properties will be handled by VS Code.
     *
     * Format: `OSC 633 ; P ; <Property>=<Value> ST`
     *
     * Known properties:
     *
     * - `Cwd` - Reports the current working directory to the terminal.
     * - `IsWindows` - Reports whether the shell is using a Windows backend like winpty or conpty.
     *   This may be used to enable additional heuristics as the positioning of the shell
     *   integration sequences are not guaranteed to be correct. Valid values: `True`, `False`.
     * - `ContinuationPrompt` - Reports the continuation prompt that is printed at the start of
     *   multi-line inputs.
     * - `HasRichCommandDetection` - Reports whether the shell has rich command line detection,
     *   meaning that sequences A, B, C, D and E are exactly where they're meant to be. In
     *   particular, {@link CommandLine} must happen immediately before {@link CommandExecuted} so
     *   VS Code knows the command line when the execution begins.
     *
     * WARNING: Any other properties may be changed and are not guaranteed to work in the future.
     */
    VSCodeOscPt["Property"] = "P";
    /**
     * Sets a mark/point-of-interest in the buffer.
     *
     * Format: `OSC 633 ; SetMark [; Id=<string>] [; Hidden]`
     *
     * `Id` - The identifier of the mark that can be used to reference it
     * `Hidden` - When set, the mark will be available to reference internally but will not visible
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["SetMark"] = "SetMark";
    /**
     * Sends the shell's complete environment in JSON format.
     *
     * Format: `OSC 633 ; EnvJson ; <Environment> ; <Nonce>`
     *
     * - `Environment` - A stringified JSON object containing the shell's complete environment. The
     *    variables and values use the same encoding rules as the {@link CommandLine} sequence.
     * - `Nonce` - An _mandatory_ nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvJson"] = "EnvJson";
    /**
     * Delete a single environment variable from cached environment.
     *
     * Format: `OSC 633 ; EnvSingleDelete ; <EnvironmentKey> ; <EnvironmentValue> [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleDelete"] = "EnvSingleDelete";
    /**
     * The start of the collecting user's environment variables individually.
     *
     * Format: `OSC 633 ; EnvSingleStart ; <Clear> [; <Nonce>]`
     *
     * - `Clear` - An _mandatory_ flag indicating any cached environment variables will be cleared.
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleStart"] = "EnvSingleStart";
    /**
     * Sets an entry of single environment variable to transactional pending map of environment variables.
     *
     * Format: `OSC 633 ; EnvSingleEntry ; <EnvironmentKey> ; <EnvironmentValue> [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleEntry"] = "EnvSingleEntry";
    /**
     * The end of the collecting user's environment variables individually.
     * Clears any pending environment variables and fires an event that contains user's environment.
     *
     * Format: `OSC 633 ; EnvSingleEnd [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleEnd"] = "EnvSingleEnd";
})(VSCodeOscPt || (VSCodeOscPt = {}));
/**
 * ITerm sequences
 */
var ITermOscPt;
(function (ITermOscPt) {
    /**
     * Sets a mark/point-of-interest in the buffer.
     *
     * Format: `OSC 1337 ; SetMark`
     */
    ITermOscPt["SetMark"] = "SetMark";
    /**
     * Reports current working directory (CWD).
     *
     * Format: `OSC 1337 ; CurrentDir=<Cwd> ST`
     */
    ITermOscPt["CurrentDir"] = "CurrentDir";
})(ITermOscPt || (ITermOscPt = {}));
/**
 * The shell integration addon extends xterm by reading shell integration sequences and creating
 * capabilities and passing along relevant sequences to the capabilities. This is meant to
 * encapsulate all handling/parsing of sequences so the capabilities don't need to.
 */
export class ShellIntegrationAddon extends Disposable {
    get seenSequences() { return this._seenSequences; }
    get status() { return this._status; }
    constructor(_nonce, _disableTelemetry, _telemetryService, _logService) {
        super();
        this._nonce = _nonce;
        this._disableTelemetry = _disableTelemetry;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this.capabilities = this._register(new TerminalCapabilityStore());
        this._hasUpdatedTelemetry = false;
        this._commonProtocolDisposables = [];
        this._seenSequences = new Set();
        this._status = 0 /* ShellIntegrationStatus.Off */;
        this._onDidChangeStatus = new Emitter();
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._onDidChangeSeenSequences = new Emitter();
        this.onDidChangeSeenSequences = this._onDidChangeSeenSequences.event;
        this._register(toDisposable(() => {
            this._clearActivationTimeout();
            this._disposeCommonProtocol();
        }));
    }
    _disposeCommonProtocol() {
        dispose(this._commonProtocolDisposables);
        this._commonProtocolDisposables.length = 0;
    }
    activate(xterm) {
        this._terminal = xterm;
        this.capabilities.add(3 /* TerminalCapability.PartialCommandDetection */, this._register(new PartialCommandDetectionCapability(this._terminal)));
        this._register(xterm.parser.registerOscHandler(633 /* ShellIntegrationOscPs.VSCode */, data => this._handleVSCodeSequence(data)));
        this._register(xterm.parser.registerOscHandler(1337 /* ShellIntegrationOscPs.ITerm */, data => this._doHandleITermSequence(data)));
        this._commonProtocolDisposables.push(xterm.parser.registerOscHandler(133 /* ShellIntegrationOscPs.FinalTerm */, data => this._handleFinalTermSequence(data)));
        this._register(xterm.parser.registerOscHandler(7 /* ShellIntegrationOscPs.SetCwd */, data => this._doHandleSetCwd(data)));
        this._register(xterm.parser.registerOscHandler(9 /* ShellIntegrationOscPs.SetWindowsFriendlyCwd */, data => this._doHandleSetWindowsFriendlyCwd(data)));
        this._ensureCapabilitiesOrAddFailureTelemetry();
    }
    getMarkerId(terminal, vscodeMarkerId) {
        this._createOrGetBufferMarkDetection(terminal).getMark(vscodeMarkerId);
    }
    _markSequenceSeen(sequence) {
        if (!this._seenSequences.has(sequence)) {
            this._seenSequences.add(sequence);
            this._onDidChangeSeenSequences.fire(this._seenSequences);
        }
    }
    _handleFinalTermSequence(data) {
        const didHandle = this._doHandleFinalTermSequence(data);
        if (this._status === 0 /* ShellIntegrationStatus.Off */) {
            this._status = 1 /* ShellIntegrationStatus.FinalTerm */;
            this._onDidChangeStatus.fire(this._status);
        }
        return didHandle;
    }
    _doHandleFinalTermSequence(data) {
        if (!this._terminal) {
            return false;
        }
        // Pass the sequence along to the capability
        // It was considered to disable the common protocol in order to not confuse the VS Code
        // shell integration if both happen for some reason. This doesn't work for powerlevel10k
        // when instant prompt is enabled though. If this does end up being a problem we could pass
        // a type flag through the capability calls
        const [command, ...args] = data.split(';');
        this._markSequenceSeen(command);
        switch (command) {
            case "A" /* FinalTermOscPt.PromptStart */:
                this._createOrGetCommandDetection(this._terminal).handlePromptStart();
                return true;
            case "B" /* FinalTermOscPt.CommandStart */:
                // Ignore the command line for these sequences as it's unreliable for example in powerlevel10k
                this._createOrGetCommandDetection(this._terminal).handleCommandStart({ ignoreCommandLine: true });
                return true;
            case "C" /* FinalTermOscPt.CommandExecuted */:
                this._createOrGetCommandDetection(this._terminal).handleCommandExecuted();
                return true;
            case "D" /* FinalTermOscPt.CommandFinished */: {
                const exitCode = args.length === 1 ? parseInt(args[0]) : undefined;
                this._createOrGetCommandDetection(this._terminal).handleCommandFinished(exitCode);
                return true;
            }
        }
        return false;
    }
    _handleVSCodeSequence(data) {
        const didHandle = this._doHandleVSCodeSequence(data);
        if (!this._hasUpdatedTelemetry && didHandle) {
            this._telemetryService?.publicLog2('terminal/shellIntegrationActivationSucceeded');
            this._hasUpdatedTelemetry = true;
            this._clearActivationTimeout();
        }
        if (this._status !== 2 /* ShellIntegrationStatus.VSCode */) {
            this._status = 2 /* ShellIntegrationStatus.VSCode */;
            this._onDidChangeStatus.fire(this._status);
        }
        return didHandle;
    }
    async _ensureCapabilitiesOrAddFailureTelemetry() {
        if (!this._telemetryService || this._disableTelemetry) {
            return;
        }
        this._activationTimeout = setTimeout(() => {
            if (!this.capabilities.get(2 /* TerminalCapability.CommandDetection */) && !this.capabilities.get(0 /* TerminalCapability.CwdDetection */)) {
                this._telemetryService?.publicLog2('terminal/shellIntegrationActivationTimeout');
                this._logService.warn('Shell integration failed to add capabilities within 10 seconds');
            }
            this._hasUpdatedTelemetry = true;
        }, 10000);
    }
    _clearActivationTimeout() {
        if (this._activationTimeout !== undefined) {
            clearTimeout(this._activationTimeout);
            this._activationTimeout = undefined;
        }
    }
    _doHandleVSCodeSequence(data) {
        if (!this._terminal) {
            return false;
        }
        // Pass the sequence along to the capability
        const argsIndex = data.indexOf(';');
        const command = argsIndex === -1 ? data : data.substring(0, argsIndex);
        this._markSequenceSeen(command);
        // Cast to strict checked index access
        const args = argsIndex === -1 ? [] : data.substring(argsIndex + 1).split(';');
        switch (command) {
            case "A" /* VSCodeOscPt.PromptStart */:
                this._createOrGetCommandDetection(this._terminal).handlePromptStart();
                return true;
            case "B" /* VSCodeOscPt.CommandStart */:
                this._createOrGetCommandDetection(this._terminal).handleCommandStart();
                return true;
            case "C" /* VSCodeOscPt.CommandExecuted */:
                this._createOrGetCommandDetection(this._terminal).handleCommandExecuted();
                return true;
            case "D" /* VSCodeOscPt.CommandFinished */: {
                const arg0 = args[0];
                const exitCode = arg0 !== undefined ? parseInt(arg0) : undefined;
                this._createOrGetCommandDetection(this._terminal).handleCommandFinished(exitCode);
                return true;
            }
            case "E" /* VSCodeOscPt.CommandLine */: {
                const arg0 = args[0];
                const arg1 = args[1];
                let commandLine;
                if (arg0 !== undefined) {
                    commandLine = deserializeMessage(arg0);
                }
                else {
                    commandLine = '';
                }
                this._createOrGetCommandDetection(this._terminal).setCommandLine(commandLine, arg1 === this._nonce);
                return true;
            }
            case "F" /* VSCodeOscPt.ContinuationStart */: {
                this._createOrGetCommandDetection(this._terminal).handleContinuationStart();
                return true;
            }
            case "G" /* VSCodeOscPt.ContinuationEnd */: {
                this._createOrGetCommandDetection(this._terminal).handleContinuationEnd();
                return true;
            }
            case "EnvJson" /* VSCodeOscPt.EnvJson */: {
                const arg0 = args[0];
                const arg1 = args[1];
                if (arg0 !== undefined) {
                    try {
                        const env = JSON.parse(deserializeMessage(arg0));
                        this._createOrGetShellEnvDetection().setEnvironment(env, arg1 === this._nonce);
                    }
                    catch (e) {
                        this._logService.warn('Failed to parse environment from shell integration sequence', arg0);
                    }
                }
                return true;
            }
            case "EnvSingleStart" /* VSCodeOscPt.EnvSingleStart */: {
                this._createOrGetShellEnvDetection().startEnvironmentSingleVar(args[0] === '1', args[1] === this._nonce);
                return true;
            }
            case "EnvSingleDelete" /* VSCodeOscPt.EnvSingleDelete */: {
                const arg0 = args[0];
                const arg1 = args[1];
                const arg2 = args[2];
                if (arg0 !== undefined && arg1 !== undefined) {
                    const env = deserializeMessage(arg1);
                    this._createOrGetShellEnvDetection().deleteEnvironmentSingleVar(arg0, env, arg2 === this._nonce);
                }
                return true;
            }
            case "EnvSingleEntry" /* VSCodeOscPt.EnvSingleEntry */: {
                const arg0 = args[0];
                const arg1 = args[1];
                const arg2 = args[2];
                if (arg0 !== undefined && arg1 !== undefined) {
                    const env = deserializeMessage(arg1);
                    this._createOrGetShellEnvDetection().setEnvironmentSingleVar(arg0, env, arg2 === this._nonce);
                }
                return true;
            }
            case "EnvSingleEnd" /* VSCodeOscPt.EnvSingleEnd */: {
                this._createOrGetShellEnvDetection().endEnvironmentSingleVar(args[0] === this._nonce);
                return true;
            }
            case "H" /* VSCodeOscPt.RightPromptStart */: {
                this._createOrGetCommandDetection(this._terminal).handleRightPromptStart();
                return true;
            }
            case "I" /* VSCodeOscPt.RightPromptEnd */: {
                this._createOrGetCommandDetection(this._terminal).handleRightPromptEnd();
                return true;
            }
            case "P" /* VSCodeOscPt.Property */: {
                const arg0 = args[0];
                const deserialized = arg0 !== undefined ? deserializeMessage(arg0) : '';
                const { key, value } = parseKeyValueAssignment(deserialized);
                if (value === undefined) {
                    return true;
                }
                switch (key) {
                    case 'ContinuationPrompt': {
                        this._updateContinuationPrompt(removeAnsiEscapeCodesFromPrompt(value));
                        return true;
                    }
                    case 'Cwd': {
                        this._updateCwd(value);
                        return true;
                    }
                    case 'IsWindows': {
                        this._createOrGetCommandDetection(this._terminal).setIsWindowsPty(value === 'True' ? true : false);
                        return true;
                    }
                    case 'HasRichCommandDetection': {
                        this._createOrGetCommandDetection(this._terminal).setHasRichCommandDetection(value === 'True' ? true : false);
                        return true;
                    }
                    case 'Prompt': {
                        // Remove escape sequences from the user's prompt
                        const sanitizedValue = value.replace(/\x1b\[[0-9;]*m/g, '');
                        this._updatePromptTerminator(sanitizedValue);
                        return true;
                    }
                    case 'Task': {
                        this._createOrGetBufferMarkDetection(this._terminal);
                        this.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.setIsCommandStorageDisabled();
                        return true;
                    }
                }
            }
            case "SetMark" /* VSCodeOscPt.SetMark */: {
                this._createOrGetBufferMarkDetection(this._terminal).addMark(parseMarkSequence(args));
                return true;
            }
        }
        // Unrecognized sequence
        return false;
    }
    _updateContinuationPrompt(value) {
        if (!this._terminal) {
            return;
        }
        this._createOrGetCommandDetection(this._terminal).setContinuationPrompt(value);
    }
    _updatePromptTerminator(prompt) {
        if (!this._terminal) {
            return;
        }
        const lastPromptLine = prompt.substring(prompt.lastIndexOf('\n') + 1);
        const promptTerminator = lastPromptLine.substring(lastPromptLine.lastIndexOf(' '));
        if (promptTerminator) {
            this._createOrGetCommandDetection(this._terminal).setPromptTerminator(promptTerminator, lastPromptLine);
        }
    }
    _updateCwd(value) {
        value = sanitizeCwd(value);
        this._createOrGetCwdDetection().updateCwd(value);
        const commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        commandDetection?.setCwd(value);
    }
    _doHandleITermSequence(data) {
        if (!this._terminal) {
            return false;
        }
        const [command] = data.split(';');
        this._markSequenceSeen(`${1337 /* ShellIntegrationOscPs.ITerm */};${command}`);
        switch (command) {
            case "SetMark" /* ITermOscPt.SetMark */: {
                this._createOrGetBufferMarkDetection(this._terminal).addMark();
            }
            default: {
                // Checking for known `<key>=<value>` pairs.
                // Note that unlike `VSCodeOscPt.Property`, iTerm2 does not interpret backslash or hex-escape sequences.
                // See: https://github.com/gnachman/iTerm2/blob/bb0882332cec5196e4de4a4225978d746e935279/sources/VT100Terminal.m#L2089-L2105
                const { key, value } = parseKeyValueAssignment(command);
                if (value === undefined) {
                    // No '=' was found, so it's not a property assignment.
                    return true;
                }
                switch (key) {
                    case "CurrentDir" /* ITermOscPt.CurrentDir */:
                        // Encountered: `OSC 1337 ; CurrentDir=<Cwd> ST`
                        this._updateCwd(value);
                        return true;
                }
            }
        }
        // Unrecognized sequence
        return false;
    }
    _doHandleSetWindowsFriendlyCwd(data) {
        if (!this._terminal) {
            return false;
        }
        const [command, ...args] = data.split(';');
        this._markSequenceSeen(`${9 /* ShellIntegrationOscPs.SetWindowsFriendlyCwd */};${command}`);
        switch (command) {
            case '9':
                // Encountered `OSC 9 ; 9 ; <cwd> ST`
                if (args.length) {
                    this._updateCwd(args[0]);
                }
                return true;
        }
        // Unrecognized sequence
        return false;
    }
    /**
     * Handles the sequence: `OSC 7 ; scheme://cwd ST`
     */
    _doHandleSetCwd(data) {
        if (!this._terminal) {
            return false;
        }
        const [command] = data.split(';');
        this._markSequenceSeen(`${7 /* ShellIntegrationOscPs.SetCwd */};${command}`);
        if (command.match(/^file:\/\/.*\//)) {
            const uri = URI.parse(command);
            if (uri.path && uri.path.length > 0) {
                this._updateCwd(uri.path);
                return true;
            }
        }
        // Unrecognized sequence
        return false;
    }
    serialize() {
        if (!this._terminal || !this.capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            return {
                isWindowsPty: false,
                hasRichCommandDetection: false,
                commands: [],
                promptInputModel: undefined,
            };
        }
        const result = this._createOrGetCommandDetection(this._terminal).serialize();
        return result;
    }
    deserialize(serialized) {
        if (!this._terminal) {
            throw new Error('Cannot restore commands before addon is activated');
        }
        const commandDetection = this._createOrGetCommandDetection(this._terminal);
        commandDetection.deserialize(serialized);
        if (commandDetection.cwd) {
            // Cwd gets set when the command is deserialized, so we need to update it here
            this._updateCwd(commandDetection.cwd);
        }
    }
    _createOrGetCwdDetection() {
        let cwdDetection = this.capabilities.get(0 /* TerminalCapability.CwdDetection */);
        if (!cwdDetection) {
            cwdDetection = this._register(new CwdDetectionCapability());
            this.capabilities.add(0 /* TerminalCapability.CwdDetection */, cwdDetection);
        }
        return cwdDetection;
    }
    _createOrGetCommandDetection(terminal) {
        let commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!commandDetection) {
            commandDetection = this._register(new CommandDetectionCapability(terminal, this._logService));
            this.capabilities.add(2 /* TerminalCapability.CommandDetection */, commandDetection);
        }
        return commandDetection;
    }
    _createOrGetBufferMarkDetection(terminal) {
        let bufferMarkDetection = this.capabilities.get(4 /* TerminalCapability.BufferMarkDetection */);
        if (!bufferMarkDetection) {
            bufferMarkDetection = this._register(new BufferMarkCapability(terminal));
            this.capabilities.add(4 /* TerminalCapability.BufferMarkDetection */, bufferMarkDetection);
        }
        return bufferMarkDetection;
    }
    _createOrGetShellEnvDetection() {
        let shellEnvDetection = this.capabilities.get(5 /* TerminalCapability.ShellEnvDetection */);
        if (!shellEnvDetection) {
            shellEnvDetection = this._register(new ShellEnvDetectionCapability());
            this.capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
        }
        return shellEnvDetection;
    }
}
export function deserializeMessage(message) {
    return message.replaceAll(
    // Backslash ('\') followed by an escape operator: either another '\', or 'x' and two hex chars.
    /\\(\\|x([0-9a-f]{2}))/gi, 
    // If it's a hex value, parse it to a character.
    // Otherwise the operator is '\', which we return literally, now unescaped.
    (_match, op, hex) => hex ? String.fromCharCode(parseInt(hex, 16)) : op);
}
export function parseKeyValueAssignment(message) {
    const separatorIndex = message.indexOf('=');
    if (separatorIndex === -1) {
        return { key: message, value: undefined }; // No '=' was found.
    }
    return {
        key: message.substring(0, separatorIndex),
        value: message.substring(1 + separatorIndex)
    };
}
export function parseMarkSequence(sequence) {
    let id = undefined;
    let hidden = false;
    for (const property of sequence) {
        // Sanity check, this shouldn't happen in practice
        if (property === undefined) {
            continue;
        }
        if (property === 'Hidden') {
            hidden = true;
        }
        if (property.startsWith('Id=')) {
            id = property.substring(3);
        }
    }
    return { id, hidden };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxJbnRlZ3JhdGlvbkFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi94dGVybS9zaGVsbEludGVncmF0aW9uQWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFbkYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHekcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRS9FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDeEQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHN0Y7Ozs7Ozs7Ozs7OztHQVlHO0FBRUg7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IscUJBZ0JqQjtBQWhCRCxXQUFrQixxQkFBcUI7SUFDdEM7O09BRUc7SUFDSCw2RUFBZSxDQUFBO0lBQ2Y7OztPQUdHO0lBQ0gsdUVBQVksQ0FBQTtJQUNaOztPQUVHO0lBQ0gsc0VB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