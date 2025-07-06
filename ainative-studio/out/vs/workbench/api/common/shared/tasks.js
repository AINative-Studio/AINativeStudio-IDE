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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL3NoYXJlZC90YXNrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWtEaEcsTUFBTSxDQUFOLElBQVksYUF1Q1g7QUF2Q0QsV0FBWSxhQUFhO0lBQ3hCLHVFQUF1RTtJQUN2RSxvQ0FBbUIsQ0FBQTtJQUVuQixnREFBZ0Q7SUFDaEQsa0RBQWlDLENBQUE7SUFFakMsa0RBQWtEO0lBQ2xELDhDQUE2QixDQUFBO0lBRTdCLG1GQUFtRjtJQUNuRiwwQ0FBeUIsQ0FBQTtJQUV6QixnREFBZ0Q7SUFDaEQsZ0NBQWUsQ0FBQTtJQUVmLCtFQUErRTtJQUMvRSxnREFBK0IsQ0FBQTtJQUUvQixrREFBa0Q7SUFDbEQsc0RBQXFDLENBQUE7SUFFckMsMkRBQTJEO0lBQzNELGtDQUFpQixDQUFBO0lBRWpCLCtEQUErRDtJQUMvRCxzQ0FBcUIsQ0FBQTtJQUVyQixnREFBZ0Q7SUFDaEQsNEJBQVcsQ0FBQTtJQUVYLDBEQUEwRDtJQUMxRCxnRUFBK0MsQ0FBQTtJQUUvQyx3REFBd0Q7SUFDeEQsNERBQTJDLENBQUE7SUFFM0MsK0RBQStEO0lBQy9ELHdFQUF1RCxDQUFBO0FBQ3hELENBQUMsRUF2Q1csYUFBYSxLQUFiLGFBQWEsUUF1Q3hCIn0=