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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
let TerminalSuggestTelemetry = class TerminalSuggestTelemetry extends Disposable {
    constructor(commandDetection, _promptInputModel, _telemetryService) {
        super();
        this._promptInputModel = _promptInputModel;
        this._telemetryService = _telemetryService;
        this._kindMap = new Map([
            [TerminalCompletionItemKind.File, 'File'],
            [TerminalCompletionItemKind.Folder, 'Folder'],
            [TerminalCompletionItemKind.Method, 'Method'],
            [TerminalCompletionItemKind.Alias, 'Alias'],
            [TerminalCompletionItemKind.Argument, 'Argument'],
            [TerminalCompletionItemKind.Option, 'Option'],
            [TerminalCompletionItemKind.OptionValue, 'Option Value'],
            [TerminalCompletionItemKind.Flag, 'Flag'],
            [TerminalCompletionItemKind.InlineSuggestion, 'Inline Suggestion'],
            [TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop, 'Inline Suggestion'],
        ]);
        this._register(commandDetection.onCommandFinished((e) => {
            this._sendTelemetryInfo(false, e.exitCode);
            this._acceptedCompletions = undefined;
        }));
        this._register(this._promptInputModel.onDidInterrupt(() => {
            this._sendTelemetryInfo(true);
            this._acceptedCompletions = undefined;
        }));
    }
    acceptCompletion(completion, commandLine) {
        if (!completion || !commandLine) {
            this._acceptedCompletions = undefined;
            return;
        }
        this._acceptedCompletions = this._acceptedCompletions || [];
        this._acceptedCompletions.push({ label: typeof completion.label === 'string' ? completion.label : completion.label.label, kind: this._kindMap.get(completion.kind) });
    }
    _sendTelemetryInfo(fromInterrupt, exitCode) {
        const commandLine = this._promptInputModel?.value;
        for (const completion of this._acceptedCompletions || []) {
            const label = completion?.label;
            const kind = completion?.kind;
            if (label === undefined || commandLine === undefined || kind === undefined) {
                return;
            }
            let outcome;
            if (fromInterrupt) {
                outcome = "Interrupted" /* CompletionOutcome.Interrupted */;
            }
            else if (commandLine.trim() && commandLine.includes(label)) {
                outcome = "Accepted" /* CompletionOutcome.Accepted */;
            }
            else if (inputContainsFirstHalfOfLabel(commandLine, label)) {
                outcome = "AcceptedWithEdit" /* CompletionOutcome.AcceptedWithEdit */;
            }
            else {
                outcome = "Deleted" /* CompletionOutcome.Deleted */;
            }
            this._telemetryService.publicLog2('terminal.suggest.acceptedCompletion', {
                kind,
                outcome,
                exitCode
            });
        }
    }
};
TerminalSuggestTelemetry = __decorate([
    __param(2, ITelemetryService)
], TerminalSuggestTelemetry);
export { TerminalSuggestTelemetry };
var CompletionOutcome;
(function (CompletionOutcome) {
    CompletionOutcome["Accepted"] = "Accepted";
    CompletionOutcome["Deleted"] = "Deleted";
    CompletionOutcome["AcceptedWithEdit"] = "AcceptedWithEdit";
    CompletionOutcome["Interrupted"] = "Interrupted";
})(CompletionOutcome || (CompletionOutcome = {}));
function inputContainsFirstHalfOfLabel(commandLine, label) {
    return commandLine.includes(label.substring(0, Math.ceil(label.length / 2)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0VGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWxTdWdnZXN0VGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUcxRixPQUFPLEVBQXVCLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdkYsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBZ0J2RCxZQUNDLGdCQUE2QyxFQUM1QixpQkFBb0MsRUFDbEMsaUJBQXFEO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBSFMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNqQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBaEJqRSxhQUFRLEdBQUcsSUFBSSxHQUFHLENBQWlCO1lBQzFDLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztZQUN6QyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7WUFDN0MsQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO1lBQzdDLENBQUMsMEJBQTBCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQztZQUMzQyxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUM7WUFDakQsQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO1lBQzdDLENBQUMsMEJBQTBCLENBQUMsV0FBVyxF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