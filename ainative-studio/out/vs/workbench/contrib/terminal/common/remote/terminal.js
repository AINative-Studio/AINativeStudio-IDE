/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const REMOTE_TERMINAL_CHANNEL_NAME = 'remoteterminal';
export var RemoteTerminalChannelEvent;
(function (RemoteTerminalChannelEvent) {
    RemoteTerminalChannelEvent["OnPtyHostExitEvent"] = "$onPtyHostExitEvent";
    RemoteTerminalChannelEvent["OnPtyHostStartEvent"] = "$onPtyHostStartEvent";
    RemoteTerminalChannelEvent["OnPtyHostUnresponsiveEvent"] = "$onPtyHostUnresponsiveEvent";
    RemoteTerminalChannelEvent["OnPtyHostResponsiveEvent"] = "$onPtyHostResponsiveEvent";
    RemoteTerminalChannelEvent["OnPtyHostRequestResolveVariablesEvent"] = "$onPtyHostRequestResolveVariablesEvent";
    RemoteTerminalChannelEvent["OnProcessDataEvent"] = "$onProcessDataEvent";
    RemoteTerminalChannelEvent["OnProcessReadyEvent"] = "$onProcessReadyEvent";
    RemoteTerminalChannelEvent["OnProcessExitEvent"] = "$onProcessExitEvent";
    RemoteTerminalChannelEvent["OnProcessReplayEvent"] = "$onProcessReplayEvent";
    RemoteTerminalChannelEvent["OnProcessOrphanQuestion"] = "$onProcessOrphanQuestion";
    RemoteTerminalChannelEvent["OnExecuteCommand"] = "$onExecuteCommand";
    RemoteTerminalChannelEvent["OnDidRequestDetach"] = "$onDidRequestDetach";
    RemoteTerminalChannelEvent["OnDidChangeProperty"] = "$onDidChangeProperty";
})(RemoteTerminalChannelEvent || (RemoteTerminalChannelEvent = {}));
export var RemoteTerminalChannelRequest;
(function (RemoteTerminalChannelRequest) {
    RemoteTerminalChannelRequest["RestartPtyHost"] = "$restartPtyHost";
    RemoteTerminalChannelRequest["CreateProcess"] = "$createProcess";
    RemoteTerminalChannelRequest["AttachToProcess"] = "$attachToProcess";
    RemoteTerminalChannelRequest["DetachFromProcess"] = "$detachFromProcess";
    RemoteTerminalChannelRequest["ListProcesses"] = "$listProcesses";
    RemoteTerminalChannelRequest["GetLatency"] = "$getLatency";
    RemoteTerminalChannelRequest["GetPerformanceMarks"] = "$getPerformanceMarks";
    RemoteTerminalChannelRequest["OrphanQuestionReply"] = "$orphanQuestionReply";
    RemoteTerminalChannelRequest["AcceptPtyHostResolvedVariables"] = "$acceptPtyHostResolvedVariables";
    RemoteTerminalChannelRequest["Start"] = "$start";
    RemoteTerminalChannelRequest["Input"] = "$input";
    RemoteTerminalChannelRequest["AcknowledgeDataEvent"] = "$acknowledgeDataEvent";
    RemoteTerminalChannelRequest["Shutdown"] = "$shutdown";
    RemoteTerminalChannelRequest["Resize"] = "$resize";
    RemoteTerminalChannelRequest["ClearBuffer"] = "$clearBuffer";
    RemoteTerminalChannelRequest["GetInitialCwd"] = "$getInitialCwd";
    RemoteTerminalChannelRequest["GetCwd"] = "$getCwd";
    RemoteTerminalChannelRequest["ProcessBinary"] = "$processBinary";
    RemoteTerminalChannelRequest["SendCommandResult"] = "$sendCommandResult";
    RemoteTerminalChannelRequest["InstallAutoReply"] = "$installAutoReply";
    RemoteTerminalChannelRequest["UninstallAllAutoReplies"] = "$uninstallAllAutoReplies";
    RemoteTerminalChannelRequest["GetDefaultSystemShell"] = "$getDefaultSystemShell";
    RemoteTerminalChannelRequest["GetProfiles"] = "$getProfiles";
    RemoteTerminalChannelRequest["GetEnvironment"] = "$getEnvironment";
    RemoteTerminalChannelRequest["GetWslPath"] = "$getWslPath";
    RemoteTerminalChannelRequest["GetTerminalLayoutInfo"] = "$getTerminalLayoutInfo";
    RemoteTerminalChannelRequest["SetTerminalLayoutInfo"] = "$setTerminalLayoutInfo";
    RemoteTerminalChannelRequest["SerializeTerminalState"] = "$serializeTerminalState";
    RemoteTerminalChannelRequest["ReviveTerminalProcesses"] = "$reviveTerminalProcesses";
    RemoteTerminalChannelRequest["GetRevivedPtyNewId"] = "$getRevivedPtyNewId";
    RemoteTerminalChannelRequest["SetUnicodeVersion"] = "$setUnicodeVersion";
    RemoteTerminalChannelRequest["ReduceConnectionGraceTime"] = "$reduceConnectionGraceTime";
    RemoteTerminalChannelRequest["UpdateIcon"] = "$updateIcon";
    RemoteTerminalChannelRequest["UpdateTitle"] = "$updateTitle";
    RemoteTerminalChannelRequest["UpdateProperty"] = "$updateProperty";
    RemoteTerminalChannelRequest["RefreshProperty"] = "$refreshProperty";
    RemoteTerminalChannelRequest["RequestDetachInstance"] = "$requestDetachInstance";
    RemoteTerminalChannelRequest["AcceptDetachInstanceReply"] = "$acceptDetachInstanceReply";
    RemoteTerminalChannelRequest["AcceptDetachedInstance"] = "$acceptDetachedInstance";
    RemoteTerminalChannelRequest["FreePortKillProcess"] = "$freePortKillProcess";
})(RemoteTerminalChannelRequest || (RemoteTerminalChannelRequest = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi9yZW1vdGUvdGVybWluYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsZ0JBQWdCLENBQUM7QUFpQzdELE1BQU0sQ0FBTixJQUFrQiwwQkFjakI7QUFkRCxXQUFrQiwwQkFBMEI7SUFDM0Msd0VBQTBDLENBQUE7SUFDMUMsMEVBQTRDLENBQUE7SUFDNUMsd0ZBQTBELENBQUE7SUFDMUQsb0ZBQXNELENBQUE7SUFDdEQsOEdBQWdGLENBQUE7SUFDaEYsd0VBQTBDLENBQUE7SUFDMUMsMEVBQTRDLENBQUE7SUFDNUMsd0VBQTBDLENBQUE7SUFDMUMsNEVBQThDLENBQUE7SUFDOUMsa0ZBQW9ELENBQUE7SUFDcEQsb0VBQXNDLENBQUE7SUFDdEMsd0VBQTBDLENBQUE7SUFDMUMsMEVBQTRDLENBQUE7QUFDN0MsQ0FBQyxFQWRpQiwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBYzNDO0FBRUQsTUFBTSxDQUFOLElBQWtCLDRCQXlDakI7QUF6Q0QsV0FBa0IsNEJBQTRCO0lBQzdDLGtFQUFrQyxDQUFBO0lBQ2xDLGdFQUFnQyxDQUFBO0lBQ2hDLG9FQUFvQyxDQUFBO0lBQ3BDLHdFQUF3QyxDQUFBO0lBQ3hDLGdFQUFnQyxDQUFBO0lBQ2hDLDBEQUEwQixDQUFBO0lBQzFCLDRFQUE0QyxDQUFBO0lBQzVDLDRFQUE0QyxDQUFBO0lBQzVDLGtHQUFrRSxDQUFBO0lBQ2xFLGdEQUFnQixDQUFBO0lBQ2hCLGdEQUFnQixDQUFBO0lBQ2hCLDhFQUE4QyxDQUFBO0lBQzlDLHNEQUFzQixDQUFBO0lBQ3RCLGtEQUFrQixDQUFBO0lBQ2xCLDREQUE0QixDQUFBO0lBQzVCLGdFQUFnQyxDQUFBO0lBQ2hDLGtEQUFrQixDQUFBO0lBQ2xCLGdFQUFnQyxDQUFBO0lBQ2hDLHdFQUF3QyxDQUFBO0lBQ3hDLHNFQUFzQyxDQUFBO0lBQ3RDLG9GQUFvRCxDQUFBO0lBQ3BELGdGQUFnRCxDQUFBO0lBQ2hELDREQUE0QixDQUFBO0lBQzVCLGtFQUFrQyxDQUFBO0lBQ2xDLDBEQUEwQixDQUFBO0lBQzFCLGdGQUFnRCxDQUFBO0lBQ2hELGdGQUFnRCxDQUFBO0lBQ2hELGtGQUFrRCxDQUFBO0lBQ2xELG9GQUFvRCxDQUFBO0lBQ3BELDBFQUEwQyxDQUFBO0lBQzFDLHdFQUF3QyxDQUFBO0lBQ3hDLHdGQUF3RCxDQUFBO0lBQ3hELDBEQUEwQixDQUFBO0lBQzFCLDREQUE0QixDQUFBO0lBQzVCLGtFQUFrQyxDQUFBO0lBQ2xDLG9FQUFvQyxDQUFBO0lBQ3BDLGdGQUFnRCxDQUFBO0lBQ2hELHdGQUF3RCxDQUFBO0lBQ3hELGtGQUFrRCxDQUFBO0lBQ2xELDRFQUE0QyxDQUFBO0FBQzdDLENBQUMsRUF6Q2lCLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUF5QzdDIn0=