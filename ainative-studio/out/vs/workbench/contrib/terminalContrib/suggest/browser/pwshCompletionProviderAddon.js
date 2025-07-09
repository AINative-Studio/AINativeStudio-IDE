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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHdzaENvbXBsZXRpb25Qcm92aWRlckFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvcHdzaENvbXBsZXRpb25Qcm92aWRlckFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVyRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBaUMsNEJBQTRCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUd0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFdEUsT0FBTyxFQUF1QiwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTlGLE1BQU0sQ0FBTixJQUFrQixrQkFFakI7QUFGRCxXQUFrQixrQkFBa0I7SUFDbkMsaURBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQUZpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBRW5DO0FBZ0JELElBQVcsMEJBRVY7QUFGRCxXQUFXLDBCQUEwQjtJQUNwQyx3REFBd0IsQ0FBQTtBQUN6QixDQUFDLEVBRlUsMEJB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