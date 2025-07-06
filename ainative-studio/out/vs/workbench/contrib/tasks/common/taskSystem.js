/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TaskErrors;
(function (TaskErrors) {
    TaskErrors[TaskErrors["NotConfigured"] = 0] = "NotConfigured";
    TaskErrors[TaskErrors["RunningTask"] = 1] = "RunningTask";
    TaskErrors[TaskErrors["NoBuildTask"] = 2] = "NoBuildTask";
    TaskErrors[TaskErrors["NoTestTask"] = 3] = "NoTestTask";
    TaskErrors[TaskErrors["ConfigValidationError"] = 4] = "ConfigValidationError";
    TaskErrors[TaskErrors["TaskNotFound"] = 5] = "TaskNotFound";
    TaskErrors[TaskErrors["NoValidTaskRunner"] = 6] = "NoValidTaskRunner";
    TaskErrors[TaskErrors["UnknownError"] = 7] = "UnknownError";
})(TaskErrors || (TaskErrors = {}));
export class TaskError {
    constructor(severity, message, code) {
        this.severity = severity;
        this.message = message;
        this.code = code;
    }
}
export var Triggers;
(function (Triggers) {
    Triggers.shortcut = 'shortcut';
    Triggers.command = 'command';
    Triggers.reconnect = 'reconnect';
})(Triggers || (Triggers = {}));
export var TaskExecuteKind;
(function (TaskExecuteKind) {
    TaskExecuteKind[TaskExecuteKind["Started"] = 1] = "Started";
    TaskExecuteKind[TaskExecuteKind["Active"] = 2] = "Active";
})(TaskExecuteKind || (TaskExecuteKind = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2NvbW1vbi90YXNrU3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLE1BQU0sQ0FBTixJQUFrQixVQVNqQjtBQVRELFdBQWtCLFVBQVU7SUFDM0IsNkRBQWEsQ0FBQTtJQUNiLHlEQUFXLENBQUE7SUFDWCx5REFBVyxDQUFBO0lBQ1gsdURBQVUsQ0FBQTtJQUNWLDZFQUFxQixDQUFBO0lBQ3JCLDJEQUFZLENBQUE7SUFDWixxRUFBaUIsQ0FBQTtJQUNqQiwyREFBWSxDQUFBO0FBQ2IsQ0FBQyxFQVRpQixVQUFVLEtBQVYsVUFBVSxRQVMzQjtBQUVELE1BQU0sT0FBTyxTQUFTO0lBS3JCLFlBQVksUUFBa0IsRUFBRSxPQUFlLEVBQUUsSUFBZ0I7UUFDaEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxLQUFXLFFBQVEsQ0FJeEI7QUFKRCxXQUFpQixRQUFRO0lBQ1gsaUJBQVEsR0FBVyxVQUFVLENBQUM7SUFDOUIsZ0JBQU8sR0FBVyxTQUFTLENBQUM7SUFDNUIsa0JBQVMsR0FBVyxXQUFXLENBQUM7QUFDOUMsQ0FBQyxFQUpnQixRQUFRLEtBQVIsUUFBUSxRQUl4QjtBQVNELE1BQU0sQ0FBTixJQUFrQixlQUdqQjtBQUhELFdBQWtCLGVBQWU7SUFDaEMsMkRBQVcsQ0FBQTtJQUNYLHlEQUFVLENBQUE7QUFDWCxDQUFDLEVBSGlCLGVBQWUsS0FBZixlQUFlLFFBR2hDIn0=