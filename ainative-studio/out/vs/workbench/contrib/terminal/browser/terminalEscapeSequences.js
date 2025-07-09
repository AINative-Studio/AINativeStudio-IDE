/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * The identifier for the first numeric parameter (`Ps`) for OSC commands used by shell integration.
 */
var ShellIntegrationOscPs;
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
})(ShellIntegrationOscPs || (ShellIntegrationOscPs = {}));
/**
 * VS Code-specific shell integration sequences. Some of these are based on common alternatives like
 * those pioneered in FinalTerm. The decision to move to entirely custom sequences was to try to
 * improve reliability and prevent the possibility of applications confusing the terminal.
 */
export var VSCodeOscPt;
(function (VSCodeOscPt) {
    /**
     * The start of the prompt, this is expected to always appear at the start of a line.
     * Based on FinalTerm's `OSC 133 ; A ST`.
     */
    VSCodeOscPt["PromptStart"] = "A";
    /**
     * The start of a command, ie. where the user inputs their command.
     * Based on FinalTerm's `OSC 133 ; B ST`.
     */
    VSCodeOscPt["CommandStart"] = "B";
    /**
     * Sent just before the command output begins.
     * Based on FinalTerm's `OSC 133 ; C ST`.
     */
    VSCodeOscPt["CommandExecuted"] = "C";
    /**
     * Sent just after a command has finished. The exit code is optional, when not specified it
     * means no command was run (ie. enter on empty prompt or ctrl+c).
     * Based on FinalTerm's `OSC 133 ; D [; <ExitCode>] ST`.
     */
    VSCodeOscPt["CommandFinished"] = "D";
    /**
     * Explicitly set the command line. This helps workaround problems with conpty not having a
     * passthrough mode by providing an option on Windows to send the command that was run. With
     * this sequence there's no need for the guessing based on the unreliable cursor positions that
     * would otherwise be required.
     */
    VSCodeOscPt["CommandLine"] = "E";
    /**
     * Similar to prompt start but for line continuations.
     */
    VSCodeOscPt["ContinuationStart"] = "F";
    /**
     * Similar to command start but for line continuations.
     */
    VSCodeOscPt["ContinuationEnd"] = "G";
    /**
     * The start of the right prompt.
     */
    VSCodeOscPt["RightPromptStart"] = "H";
    /**
     * The end of the right prompt.
     */
    VSCodeOscPt["RightPromptEnd"] = "I";
    /**
     * Set an arbitrary property: `OSC 633 ; P ; <Property>=<Value> ST`, only known properties will
     * be handled.
     */
    VSCodeOscPt["Property"] = "P";
})(VSCodeOscPt || (VSCodeOscPt = {}));
export var VSCodeOscProperty;
(function (VSCodeOscProperty) {
    VSCodeOscProperty["Task"] = "Task";
    VSCodeOscProperty["Cwd"] = "Cwd";
})(VSCodeOscProperty || (VSCodeOscProperty = {}));
/**
 * ITerm sequences
 */
export var ITermOscPt;
(function (ITermOscPt) {
    /**
     * Based on ITerm's `OSC 1337 ; SetMark` sets a mark on the scrollbar
     */
    ITermOscPt["SetMark"] = "SetMark";
})(ITermOscPt || (ITermOscPt = {}));
export function VSCodeSequence(osc, data) {
    return oscSequence(633 /* ShellIntegrationOscPs.VSCode */, osc, data);
}
export function ITermSequence(osc, data) {
    return oscSequence(1337 /* ShellIntegrationOscPs.ITerm */, osc, data);
}
function oscSequence(ps, pt, data) {
    let result = `\x1b]${ps};${pt}`;
    if (data) {
        result += `;${data}`;
    }
    result += `\x07`;
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFc2NhcGVTZXF1ZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEVzY2FwZVNlcXVlbmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7R0FFRztBQUNILElBQVcscUJBY1Y7QUFkRCxXQUFXLHFCQUFxQjtJQUMvQjs7T0FFRztJQUNILDZFQUFlLENBQUE7SUFDZjs7O09BR0c7SUFDSCx1RUFBWSxDQUFBO0lBQ1o7O09BRUc7SUFDSCxzRUFBWSxDQUFBO0FBQ2IsQ0FBQyxFQWRVLHFCQUFxQixLQUFyQixxQkFBcUIsUUFjL0I7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLFdBMkRqQjtBQTNERCxXQUFrQixXQUFXO0lBQzVCOzs7T0FHRztJQUNILGdDQUFpQixDQUFBO0lBRWpCOzs7T0FHRztJQUNILGlDQUFrQixDQUFBO0lBRWxCOzs7T0FHRztJQUNILG9DQUFxQixDQUFBO0lBRXJCOzs7O09BSUc7SUFDSCxvQ0FBcUIsQ0FBQTtJQUVyQjs7Ozs7T0FLRztJQUNILGdDQUFpQixDQUFBO0lBRWpCOztPQUVHO0lBQ0gsc0NBQXVCLENBQUE7SUFFdkI7O09BRUc7SUFDSCxvQ0FBcUIsQ0FBQTtJQUVyQjs7T0FFRztJQUNILHFDQUFzQixDQUFBO0lBRXRCOztPQUVHO0lBQ0gsbUNBQW9CLENBQUE7SUFFcEI7OztPQUdHO0lBQ0gsNkJBQWMsQ0FBQTtBQUNmLENBQUMsRUEzRGlCLFdBQVcsS0FBWCxXQUFXLFFBMkQ1QjtBQUVELE1BQU0sQ0FBTixJQUFrQixpQkFHakI7QUFIRCxXQUFrQixpQkFBaUI7SUFDbEMsa0NBQWEsQ0FBQTtJQUNiLGdDQUFXLENBQUE7QUFDWixDQUFDLEVBSGlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFHbEM7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixVQUtqQjtBQUxELFdBQWtCLFVBQVU7SUFDM0I7O09BRUc7SUFDSCxpQ0FBbUIsQ0FBQTtBQUNwQixDQUFDLEVBTGlCLFVBQVUsS0FBVixVQUFVLFFBSzNCO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxHQUFnQixFQUFFLElBQWlDO0lBQ2pGLE9BQU8sV0FBVyx5Q0FBK0IsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzdELENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQWUsRUFBRSxJQUFhO0lBQzNELE9BQU8sV0FBVyx5Q0FBOEIsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzVELENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxFQUFVLEVBQUUsRUFBVSxFQUFFLElBQWE7SUFDekQsSUFBSSxNQUFNLEdBQUcsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7SUFDaEMsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNWLE1BQU0sSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxNQUFNLElBQUksTUFBTSxDQUFDO0lBQ2pCLE9BQU8sTUFBTSxDQUFDO0FBRWYsQ0FBQyJ9