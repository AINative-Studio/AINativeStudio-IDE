/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Primarily driven by the shell integration feature, a terminal capability is the mechanism for
 * progressively enhancing various features that may not be supported in all terminals/shells.
 */
export var TerminalCapability;
(function (TerminalCapability) {
    /**
     * The terminal can reliably detect the current working directory as soon as the change happens
     * within the buffer.
     */
    TerminalCapability[TerminalCapability["CwdDetection"] = 0] = "CwdDetection";
    /**
     * The terminal can reliably detect the current working directory when requested.
     */
    TerminalCapability[TerminalCapability["NaiveCwdDetection"] = 1] = "NaiveCwdDetection";
    /**
     * The terminal can reliably identify prompts, commands and command outputs within the buffer.
     */
    TerminalCapability[TerminalCapability["CommandDetection"] = 2] = "CommandDetection";
    /**
     * The terminal can often identify prompts, commands and command outputs within the buffer. It
     * may not be so good at remembering the position of commands that ran in the past. This state
     * may be enabled when something goes wrong or when using conpty for example.
     */
    TerminalCapability[TerminalCapability["PartialCommandDetection"] = 3] = "PartialCommandDetection";
    /**
     * Manages buffer marks that can be used for terminal navigation. The source of
     * the request (task, debug, etc) provides an ID, optional marker, hoverMessage, and hidden property. When
     * hidden is not provided, a generic decoration is added to the buffer and overview ruler.
     */
    TerminalCapability[TerminalCapability["BufferMarkDetection"] = 4] = "BufferMarkDetection";
    /**
     * The terminal can detect the latest environment of user's current shell.
     */
    TerminalCapability[TerminalCapability["ShellEnvDetection"] = 5] = "ShellEnvDetection";
})(TerminalCapability || (TerminalCapability = {}));
export var CommandInvalidationReason;
(function (CommandInvalidationReason) {
    CommandInvalidationReason["Windows"] = "windows";
    CommandInvalidationReason["NoProblemsReported"] = "noProblemsReported";
})(CommandInvalidationReason || (CommandInvalidationReason = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FwYWJpbGl0aWVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2NhcGFiaWxpdGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXVDaEc7OztHQUdHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGtCQWlDakI7QUFqQ0QsV0FBa0Isa0JBQWtCO0lBQ25DOzs7T0FHRztJQUNILDJFQUFZLENBQUE7SUFDWjs7T0FFRztJQUNILHFGQUFpQixDQUFBO0lBQ2pCOztPQUVHO0lBQ0gsbUZBQWdCLENBQUE7SUFDaEI7Ozs7T0FJRztJQUNILGlHQUF1QixDQUFBO0lBRXZCOzs7O09BSUc7SUFDSCx5RkFBbUIsQ0FBQTtJQUVuQjs7T0FFRztJQUNILHFGQUFpQixDQUFBO0FBRWxCLENBQUMsRUFqQ2lCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFpQ25DO0FBOEdELE1BQU0sQ0FBTixJQUFrQix5QkFHakI7QUFIRCxXQUFrQix5QkFBeUI7SUFDMUMsZ0RBQW1CLENBQUE7SUFDbkIsc0VBQXlDLENBQUE7QUFDMUMsQ0FBQyxFQUhpQix5QkFBeUIsS0FBekIseUJBQXlCLFFBRzFDIn0=