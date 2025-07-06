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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblN0eWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIveHRlcm0vZGVjb3JhdGlvblN0eWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBS2pELElBQVcsZ0JBR1Y7QUFIRCxXQUFXLGdCQUFnQjtJQUMxQixnRkFBcUIsQ0FBQTtJQUNyQixxRUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBSFUsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUcxQjtBQUVELE1BQU0sQ0FBTixJQUFrQixrQkFTakI7QUFURCxXQUFrQixrQkFBa0I7SUFDbkMsdUVBQWlELENBQUE7SUFDakQsbUNBQWEsQ0FBQTtJQUNiLDBDQUFvQixDQUFBO0lBQ3BCLG9EQUE4QixDQUFBO0lBQzlCLHlDQUFtQixDQUFBO0lBQ25CLHlDQUFtQixDQUFBO0lBQ25CLDBEQUFvQyxDQUFBO0lBQ3BDLHdFQUFrRCxDQUFBO0FBQ25ELENBQUMsRUFUaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQVNuQztBQUVELE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyxPQUFxQyxFQUFFLFlBQXFCO0lBQzdHLElBQUksWUFBWSxHQUFHLEdBQUcsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUN0RixZQUFZLElBQUksYUFBYSxDQUFDO0lBQzlCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNkLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsWUFBWSxHQUFHLFlBQVksQ0FBQztR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