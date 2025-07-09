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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vdGFza1N5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRyxNQUFNLENBQU4sSUFBa0IsVUFTakI7QUFURCxXQUFrQixVQUFVO0lBQzNCLDZEQUFhLENBQUE7SUFDYix5REFBVyxDQUFBO0lBQ1gseURBQVcsQ0FBQTtJQUNYLHVEQUFVLENBQUE7SUFDViw2RUFBcUIsQ0FBQTtJQUNyQiwyREFBWSxDQUFBO0lBQ1oscUVBQWlCLENBQUE7SUFDakIsMkRBQVksQ0FBQTtBQUNiLENBQUMsRUFUaUIsVUFBVSxLQUFWLFVBQVUsUUFTM0I7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUtyQixZQUFZLFFBQWtCLEVBQUUsT0FBZSxFQUFFLElBQWdCO1FBQ2hFLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLENBQUM7Q0FDRDtBQUVELE1BQU0sS0FBVyxRQUFRLENBSXhCO0FBSkQsV0FBaUIsUUFBUTtJQUNYLGlCQUFRLEdBQVcsVUFBVSxDQUFDO0lBQzlCLGdCQUFPLEdBQVcsU0FBUyxDQUFDO0lBQzVCLGtCQUFTLEdBQVcsV0FBVyxDQUFDO0FBQzlDLENBQUMsRUFKZ0IsUUFBUSxLQUFSLFFBQVEsUUFJeEI7QUFTRCxNQUFNLENBQU4sSUFBa0IsZUFHakI7QUFIRCxXQUFrQixlQUFlO0lBQ2hDLDJEQUFXLENBQUE7SUFDWCx5REFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUhpQixlQUFlLEtBQWYsZUFBZSxRQUdoQyJ9