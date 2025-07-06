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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFc2NhcGVTZXF1ZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxFc2NhcGVTZXF1ZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxJQUFXLHFCQWNWO0FBZEQsV0FBVyxxQkFBcUI7SUFDL0I7O09BRUc7SUFDSCw2RUFBZSxDQUFBO0lBQ2Y7OztPQUdHO0lBQ0gsdUVBQVksQ0FBQTtJQUNaOztPQUVHO0lBQ0gsc0VBQVksQ0FBQTtBQUNiLENBQUMsRUFkVSxxQkFBcUIsS0FBckIscUJBQXFCLFFBYy9CO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBTixJQUFrQixXQTJEakI7QUEzREQsV0FBa0IsV0FBVztJQUM1Qjs7O09BR0c7SUFDSCxnQ0FBaUIsQ0FBQTtJQUVqQjs7O09BR0c7SUFDSCxpQ0FBa0IsQ0FBQTtJQUVsQjs7O09BR0c7SUFDSCxvQ0FBcUIsQ0FBQTtJQUVyQjs7OztPQUlHO0lBQ0gsb0NBQXFCLENBQUE7SUFFckI7Ozs7O09BS0c7SUFDSCxnQ0FBaUIsQ0FBQTtJQUVqQjs7T0FFRztJQUNILHNDQUF1QixDQUFBO0lBRXZCOztPQUVHO0lBQ0gsb0NBQXFCLENBQUE7SUFFckI7O09BRUc7SUFDSCxxQ0FBc0IsQ0FBQTtJQUV0Qjs7T0FFRztJQUNILG1DQUFvQixDQUFBO0lBRXBCOzs7T0FHRztJQUNILDZCQUFjLENBQUE7QUFDZixDQUFDLEVBM0RpQixXQUFXLEtBQVgsV0FBVyxRQTJENUI7QUFFRCxNQUFNLENBQU4sSUFBa0IsaUJBR2pCO0FBSEQsV0FBa0IsaUJBQWlCO0lBQ2xDLGtDQUFhLENBQUE7SUFDYixnQ0FBVyxDQUFBO0FBQ1osQ0FBQyxFQUhpQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBR2xDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsVUFLakI7QUFMRCxXQUFrQixVQUFVO0lBQzNCOztPQUVHO0lBQ0gsaUNBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQUxpQixVQUFVLEtBQVYsVUFBVSxRQUszQjtBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsR0FBZ0IsRUFBRSxJQUFpQztJQUNqRixPQUFPLFdBQVcseUNBQStCLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3RCxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxHQUFlLEVBQUUsSUFBYTtJQUMzRCxPQUFPLFdBQVcseUNBQThCLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1RCxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsRUFBVSxFQUFFLEVBQVUsRUFBRSxJQUFhO0lBQ3pELElBQUksTUFBTSxHQUFHLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO0lBQ2hDLElBQUksSUFBSSxFQUFFLENBQUM7UUFDVixNQUFNLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBQ0QsTUFBTSxJQUFJLE1BQU0sQ0FBQztJQUNqQixPQUFPLE1BQU0sQ0FBQztBQUVmLENBQUMifQ==