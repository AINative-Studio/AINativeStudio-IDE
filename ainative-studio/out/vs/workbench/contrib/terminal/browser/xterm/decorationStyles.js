/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fromNow, getDurationString } from '../../../../../base/common/date.js';
import { localize } from '../../../../../nls.js';
var DecorationStyles;
(function (DecorationStyles) {
    DecorationStyles[DecorationStyles["DefaultDimension"] = 16] = "DefaultDimension";
    DecorationStyles[DecorationStyles["MarginLeft"] = -17] = "MarginLeft";
})(DecorationStyles || (DecorationStyles = {}));
export var DecorationSelector;
(function (DecorationSelector) {
    DecorationSelector["CommandDecoration"] = "terminal-command-decoration";
    DecorationSelector["Hide"] = "hide";
    DecorationSelector["ErrorColor"] = "error";
    DecorationSelector["DefaultColor"] = "default-color";
    DecorationSelector["Default"] = "default";
    DecorationSelector["Codicon"] = "codicon";
    DecorationSelector["XtermDecoration"] = "xterm-decoration";
    DecorationSelector["OverviewRuler"] = ".xterm-decoration-overview-ruler";
})(DecorationSelector || (DecorationSelector = {}));
export function getTerminalDecorationHoverContent(command, hoverMessage) {
    let hoverContent = `${localize('terminalPromptContextMenu', "Show Command Actions")}`;
    hoverContent += '\n\n---\n\n';
    if (!command) {
        if (hoverMessage) {
            hoverContent = hoverMessage;
        }
        else {
            return '';
        }
    }
    else if (command.markProperties || hoverMessage) {
        if (command.markProperties?.hoverMessage || hoverMessage) {
            hoverContent = command.markProperties?.hoverMessage || hoverMessage || '';
        }
        else {
            return '';
        }
    }
    else {
        if (command.duration) {
            const durationText = getDurationString(command.duration);
            if (command.exitCode) {
                if (command.exitCode === -1) {
                    hoverContent += localize('terminalPromptCommandFailed.duration', 'Command executed {0}, took {1} and failed', fromNow(command.timestamp, true), durationText);
                }
                else {
                    hoverContent += localize('terminalPromptCommandFailedWithExitCode.duration', 'Command executed {0}, took {1} and failed (Exit Code {2})', fromNow(command.timestamp, true), durationText, command.exitCode);
                }
            }
            else {
                hoverContent += localize('terminalPromptCommandSuccess.duration', 'Command executed {0} and took {1}', fromNow(command.timestamp, true), durationText);
            }
        }
        else {
            if (command.exitCode) {
                if (command.exitCode === -1) {
                    hoverContent += localize('terminalPromptCommandFailed', 'Command executed {0} and failed', fromNow(command.timestamp, true));
                }
                else {
                    hoverContent += localize('terminalPromptCommandFailedWithExitCode', 'Command executed {0} and failed (Exit Code {1})', fromNow(command.timestamp, true), command.exitCode);
                }
            }
            else {
                hoverContent += localize('terminalPromptCommandSuccess', 'Command executed {0}', fromNow(command.timestamp, true));
            }
        }
    }
    return hoverContent;
}
export function updateLayout(configurationService, element) {
    if (!element) {
        return;
    }
    const fontSize = configurationService.inspect("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */).value;
    const defaultFontSize = configurationService.inspect("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */).defaultValue;
    const lineHeight = configurationService.inspect("terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */).value;
    if (typeof fontSize === 'number' && typeof defaultFontSize === 'number' && typeof lineHeight === 'number') {
        const scalar = (fontSize / defaultFontSize) <= 1 ? (fontSize / defaultFontSize) : 1;
        // must be inlined to override the inlined styles from xterm
        element.style.width = `${scalar * 16 /* DecorationStyles.DefaultDimension */}px`;
        element.style.height = `${scalar * 16 /* DecorationStyles.DefaultDimension */ * lineHeight}px`;
        element.style.fontSize = `${scalar * 16 /* DecorationStyles.DefaultDimension */}px`;
        element.style.marginLeft = `${scalar * -17 /* DecorationStyles.MarginLeft */}px`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblN0eWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3h0ZXJtL2RlY29yYXRpb25TdHlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUtqRCxJQUFXLGdCQUdWO0FBSEQsV0FBVyxnQkFBZ0I7SUFDMUIsZ0ZBQXFCLENBQUE7SUFDckIscUVBQWdCLENBQUE7QUFDakIsQ0FBQyxFQUhVLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFHMUI7QUFFRCxNQUFNLENBQU4sSUFBa0Isa0JBU2pCO0FBVEQsV0FBa0Isa0JBQWtCO0lBQ25DLHVFQUFpRCxDQUFBO0lBQ2pELG1DQUFhLENBQUE7SUFDYiwwQ0FBb0IsQ0FBQTtJQUNwQixvREFBOEIsQ0FBQTtJQUM5Qix5Q0FBbUIsQ0FBQTtJQUNuQix5Q0FBbUIsQ0FBQTtJQUNuQiwwREFBb0MsQ0FBQTtJQUNwQyx3RUFBa0QsQ0FBQTtBQUNuRCxDQUFDLEVBVGlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFTbkM7QUFFRCxNQUFNLFVBQVUsaUNBQWlDLENBQUMsT0FBcUMsRUFBRSxZQUFxQjtJQUM3RyxJQUFJLFlBQVksR0FBRyxHQUFHLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDdEYsWUFBWSxJQUFJLGFBQWEsQ0FBQztJQUM5QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLFlBQVksR0FBRyxZQUFZLENBQUM7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