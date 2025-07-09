/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TaskEventKind;
(function (TaskEventKind) {
    /** Indicates that a task's properties or configuration have changed */
    TaskEventKind["Changed"] = "changed";
    /** Indicates that a task has begun executing */
    TaskEventKind["ProcessStarted"] = "processStarted";
    /** Indicates that a task process has completed */
    TaskEventKind["ProcessEnded"] = "processEnded";
    /** Indicates that a task was terminated, either by user action or by the system */
    TaskEventKind["Terminated"] = "terminated";
    /** Indicates that a task has started running */
    TaskEventKind["Start"] = "start";
    /** Indicates that a task has acquired all needed input/variables to execute */
    TaskEventKind["AcquiredInput"] = "acquiredInput";
    /** Indicates that a dependent task has started */
    TaskEventKind["DependsOnStarted"] = "dependsOnStarted";
    /** Indicates that a task is actively running/processing */
    TaskEventKind["Active"] = "active";
    /** Indicates that a task is paused/waiting but not complete */
    TaskEventKind["Inactive"] = "inactive";
    /** Indicates that a task has completed fully */
    TaskEventKind["End"] = "end";
    /** Indicates that a task's problem matcher has started */
    TaskEventKind["ProblemMatcherStarted"] = "problemMatcherStarted";
    /** Indicates that a task's problem matcher has ended */
    TaskEventKind["ProblemMatcherEnded"] = "problemMatcherEnded";
    /** Indicates that a task's problem matcher has found errors */
    TaskEventKind["ProblemMatcherFoundErrors"] = "problemMatcherFoundErrors";
})(TaskEventKind || (TaskEventKind = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vc2hhcmVkL3Rhc2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBa0RoRyxNQUFNLENBQU4sSUFBWSxhQXVDWDtBQXZDRCxXQUFZLGFBQWE7SUFDeEIsdUVBQXVFO0lBQ3ZFLG9DQUFtQixDQUFBO0lBRW5CLGdEQUFnRDtJQUNoRCxrREFBaUMsQ0FBQTtJQUVqQyxrREFBa0Q7SUFDbEQsOENBQTZCLENBQUE7SUFFN0IsbUZBQW1GO0lBQ25GLDBDQUF5QixDQUFBO0lBRXpCLGdEQUFnRDtJQUNoRCxnQ0FBZSxDQUFBO0lBRWYsK0VBQStFO0lBQy9FLGdEQUErQixDQUFBO0lBRS9CLGtEQUFrRDtJQUNsRCxzREFBcUMsQ0FBQTtJQUVyQywyREFBMkQ7SUFDM0Qsa0NBQWlCLENBQUE7SUFFakIsK0RBQStEO0lBQy9ELHNDQUFxQixDQUFBO0lBRXJCLGdEQUFnRDtJQUNoRCw0QkFBVyxDQUFBO0lBRVgsMERBQTBEO0lBQzFELGdFQUErQyxDQUFBO0lBRS9DLHdEQUF3RDtJQUN4RCw0REFBMkMsQ0FBQTtJQUUzQywrREFBK0Q7SUFDL0Qsd0VBQXVELENBQUE7QUFDeEQsQ0FBQyxFQXZDVyxhQUFhLEtBQWIsYUFBYSxRQXVDeEIifQ==