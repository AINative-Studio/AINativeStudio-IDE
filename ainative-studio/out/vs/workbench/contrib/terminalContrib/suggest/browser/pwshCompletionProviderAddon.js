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
var PwshCompletionProviderAddon_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import * as dom from '../../../../../base/browser/dom.js';
import { sep } from '../../../../../base/common/path.js';
import { SuggestAddon } from './terminalSuggestAddon.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { terminalSuggestConfigSection } from '../common/terminalSuggestConfiguration.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
export var VSCodeSuggestOscPt;
(function (VSCodeSuggestOscPt) {
    VSCodeSuggestOscPt["Completions"] = "Completions";
})(VSCodeSuggestOscPt || (VSCodeSuggestOscPt = {}));
var RequestCompletionsSequence;
(function (RequestCompletionsSequence) {
    RequestCompletionsSequence["Contextual"] = "\u001B[24~e";
})(RequestCompletionsSequence || (RequestCompletionsSequence = {}));
let PwshCompletionProviderAddon = class PwshCompletionProviderAddon extends Disposable {
    static { PwshCompletionProviderAddon_1 = this; }
    static { this.ID = 'pwsh-shell-integration'; }
    constructor(capabilities, _configurationService) {
        super();
        this._configurationService = _configurationService;
        this.id = PwshCompletionProviderAddon_1.ID;
        this.isBuiltin = true;
        this.shellTypes = ["pwsh" /* GeneralShellType.PowerShell */];
        this._lastUserDataTimestamp = 0;
        this._enableWidget = true;
        this.isPasting = false;
        this._completionsDeferred = null;
        this._onDidReceiveCompletions = this._register(new Emitter());
        this.onDidReceiveCompletions = this._onDidReceiveCompletions.event;
        this._onDidRequestSendText = this._register(new Emitter());
        this.onDidRequestSendText = this._onDidRequestSendText.event;
        this._register(Event.runAndSubscribe(Event.any(capabilities.onDidAddCapabilityType, capabilities.onDidRemoveCapabilityType), () => {
            const commandDetection = capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                if (this._promptInputModel !== commandDetection.promptInputModel) {
                    this._promptInputModel = commandDetection.promptInputModel;
                }
            }
            else {
                this._promptInputModel = undefined;
            }
        }));
    }
    activate(xterm) {
        this._terminal = xterm;
        this._register(xterm.onData(() => {
            this._lastUserDataTimestamp = Date.now();
        }));
        const config = this._configurationService.getValue(terminalSuggestConfigSection);
        const enabled = config.enabled;
        if (!enabled) {
            return;
        }
        this._register(xterm.parser.registerOscHandler(633 /* ShellIntegrationOscPs.VSCode */, data => {
            return this._handleVSCodeSequence(data);
        }));
    }
    _handleVSCodeSequence(data) {
        if (!this._terminal) {
            return false;
        }
        // Pass the sequence along to the capability
        const [command, ...args] = data.split(';');
        switch (command) {
            case "Completions" /* VSCodeSuggestOscPt.Completions */:
                this._handleCompletionsSequence(this._terminal, data, command, args);
                return true;
        }
        // Unrecognized sequence
        return false;
    }
    _handleCompletionsSequence(terminal, data, command, args) {
        this._onDidReceiveCompletions.fire();
        // Nothing to handle if the terminal is not attached
        if (!terminal.element || !this._enableWidget || !this._promptInputModel) {
            this._resolveCompletions(undefined);
            return;
        }
        // Only show the suggest widget if the terminal is focused
        if (!dom.isAncestorOfActiveElement(terminal.element)) {
            this._resolveCompletions(undefined);
            return;
        }
        // No completions
        if (args.length === 0) {
            this._resolveCompletions(undefined);
            return;
        }
        let replacementIndex = 0;
        let replacementLength = this._promptInputModel.cursorIndex;
        // This is a TabExpansion2 result
        replacementIndex = parseInt(args[0]);
        replacementLength = parseInt(args[1]);
        const payload = data.slice(command.length + args[0].length + args[1].length + args[2].length + 4 /*semi-colons*/);
        const rawCompletions = args.length === 0 || payload.length === 0 ? undefined : JSON.parse(payload);
        const completions = parseCompletionsFromShell(rawCompletions, replacementIndex, replacementLength);
        if (this._mostRecentCompletion?.kind === TerminalCompletionItemKind.Folder && completions.every(c => c.kind === TerminalCompletionItemKind.Folder)) {
            completions.push(this._mostRecentCompletion);
        }
        this._mostRecentCompletion = undefined;
        this._resolveCompletions(completions);
    }
    _resolveCompletions(result) {
        if (!this._completionsDeferred) {
            return;
        }
        this._completionsDeferred.complete(result);
        // Resolved, clear the deferred promise
        this._completionsDeferred = null;
    }
    _getCompletionsPromise() {
        this._completionsDeferred = new DeferredPromise();
        return this._completionsDeferred.p;
    }
    provideCompletions(value, cursorPosition, allowFallbackCompletions, token) {
        // Return immediately if completions are being requested for a command since this provider
        // only returns completions for arguments
        if (value.substring(0, cursorPosition).trim().indexOf(' ') === -1) {
            return Promise.resolve(undefined);
        }
        // Ensure that a key has been pressed since the last accepted completion in order to prevent
        // completions being requested again right after accepting a completion
        if (this._lastUserDataTimestamp > SuggestAddon.lastAcceptedCompletionTimestamp) {
            this._onDidRequestSendText.fire("\u001B[24~e" /* RequestCompletionsSequence.Contextual */);
        }
        if (token.isCancellationRequested) {
            return Promise.resolve(undefined);
        }
        return new Promise((resolve) => {
            const completionPromise = this._getCompletionsPromise();
            this._register(token.onCancellationRequested(() => {
                this._resolveCompletions(undefined);
            }));
            completionPromise.then(result => {
                if (token.isCancellationRequested) {
                    resolve(undefined);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
};
PwshCompletionProviderAddon = PwshCompletionProviderAddon_1 = __decorate([
    __param(1, IConfigurationService)
], PwshCompletionProviderAddon);
export { PwshCompletionProviderAddon };
export function parseCompletionsFromShell(rawCompletions, replacementIndex, replacementLength) {
    if (!rawCompletions) {
        return [];
    }
    let typedRawCompletions;
    if (!Array.isArray(rawCompletions)) {
        typedRawCompletions = [rawCompletions];
    }
    else {
        if (rawCompletions.length === 0) {
            return [];
        }
        if (typeof rawCompletions[0] === 'string') {
            typedRawCompletions = [rawCompletions].map(e => ({
                CompletionText: e[0],
                ResultType: e[1],
                ToolTip: e[2],
                CustomIcon: e[3],
            }));
        }
        else if (Array.isArray(rawCompletions[0])) {
            typedRawCompletions = rawCompletions.map(e => ({
                CompletionText: e[0],
                ResultType: e[1],
                ToolTip: e[2],
                CustomIcon: e[3],
            }));
        }
        else {
            typedRawCompletions = rawCompletions;
        }
    }
    return typedRawCompletions.map(e => rawCompletionToITerminalCompletion(e, replacementIndex, replacementLength));
}
function rawCompletionToITerminalCompletion(rawCompletion, replacementIndex, replacementLength) {
    // HACK: Somewhere along the way from the powershell script to here, the path separator at the
    // end of directories may go missing, likely because `\"` -> `"`. As a result, make sure there
    // is a trailing separator at the end of all directory completions. This should not be done for
    // `.` and `..` entries because they are optimized not for navigating to different directories
    // but for passing as args.
    let label = rawCompletion.CompletionText;
    if (rawCompletion.ResultType === 4 &&
        !label.match(/^[\-+]$/) && // Don't add a `/` to `-` or `+` (navigate location history)
        !label.match(/^\.\.?$/) &&
        !label.match(/[\\\/]$/)) {
        const separator = label.match(/(?<sep>[\\\/])/)?.groups?.sep ?? sep;
        label = label + separator;
    }
    // If tooltip is not present it means it's the same as label
    const detail = rawCompletion.ToolTip ?? label;
    // Pwsh gives executables a result type of 2, but we want to treat them as files wrt the sorting
    // and file extension score boost. An example of where this improves the experience is typing
    // `git`, `git.exe` should appear at the top and beat `git-lfs.exe`. Keep the same icon though.
    const icon = getIcon(rawCompletion.ResultType, rawCompletion.CustomIcon);
    const isExecutable = rawCompletion.ResultType === 2 && rawCompletion.CompletionText.match(/\.[a-z0-9]{2,4}$/i);
    if (isExecutable) {
        rawCompletion.ResultType = 3;
    }
    return {
        label,
        provider: PwshCompletionProviderAddon.ID,
        icon,
        detail,
        kind: pwshTypeToKindMap[rawCompletion.ResultType],
        isKeyword: rawCompletion.ResultType === 12,
        replacementIndex,
        replacementLength
    };
}
function getIcon(resultType, customIconId) {
    if (customIconId) {
        const icon = customIconId in Codicon ? Codicon[customIconId] : Codicon.symbolText;
        if (icon) {
            return icon;
        }
    }
    return pwshTypeToIconMap[resultType] ?? Codicon.symbolText;
}
/**
 * A map of the pwsh result type enum's value to the corresponding icon to use in completions.
 *
 * | Value | Name              | Description
 * |-------|-------------------|------------
 * | 0     | Text              | An unknown result type, kept as text only
 * | 1     | History           | A history result type like the items out of get-history
 * | 2     | Command           | A command result type like the items out of get-command
 * | 3     | ProviderItem      | A provider item
 * | 4     | ProviderContainer | A provider container
 * | 5     | Property          | A property result type like the property items out of get-member
 * | 6     | Method            | A method result type like the method items out of get-member
 * | 7     | ParameterName     | A parameter name result type like the Parameters property out of get-command items
 * | 8     | ParameterValue    | A parameter value result type
 * | 9     | Variable          | A variable result type like the items out of get-childitem variable:
 * | 10    | Namespace         | A namespace
 * | 11    | Type              | A type name
 * | 12    | Keyword           | A keyword
 * | 13    | DynamicKeyword    | A dynamic keyword
 *
 * @see https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.completionresulttype?view=powershellsdk-7.0.0
 */
const pwshTypeToIconMap = {
    0: Codicon.symbolText,
    1: Codicon.history,
    2: Codicon.symbolMethod,
    3: Codicon.symbolFile,
    4: Codicon.folder,
    5: Codicon.symbolProperty,
    6: Codicon.symbolMethod,
    7: Codicon.symbolVariable,
    8: Codicon.symbolValue,
    9: Codicon.symbolVariable,
    10: Codicon.symbolNamespace,
    11: Codicon.symbolInterface,
    12: Codicon.symbolKeyword,
    13: Codicon.symbolKeyword
};
const pwshTypeToKindMap = {
    0: undefined,
    1: undefined,
    2: TerminalCompletionItemKind.Method,
    3: TerminalCompletionItemKind.File,
    4: TerminalCompletionItemKind.Folder,
    5: TerminalCompletionItemKind.Argument,
    6: TerminalCompletionItemKind.Method,
    7: TerminalCompletionItemKind.Argument,
    8: undefined,
    9: undefined,
    10: undefined,
    11: undefined,
    12: undefined,
    13: undefined,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHdzaENvbXBsZXRpb25Qcm92aWRlckFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci9wd3NoQ29tcGxldGlvblByb3ZpZGVyQWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXJFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFFMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsT0FBTyxFQUFpQyw0QkFBNEIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBR3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV0RSxPQUFPLEVBQXVCLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFOUYsTUFBTSxDQUFOLElBQWtCLGtCQUVqQjtBQUZELFdBQWtCLGtCQUFrQjtJQUNuQyxpREFBMkIsQ0FBQTtBQUM1QixDQUFDLEVBRmlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFFbkM7QUFnQkQsSUFBVywwQkFFVjtBQUZELFdBQVcsMEJBQTBCO0lBQ3BDLHdEQUF3QixDQUFBO0FBQ3pCLENBQUMsRUFGVSwwQkFB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